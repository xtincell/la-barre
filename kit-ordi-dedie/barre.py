# barre.py — faire entrer l'export UPgraders de l'ordi dédié dans LA BARRE en ligne, sans rien écraser.
#
# Écrit le 13/10/2026 sur l'iMac Matanga. Python 3.9+, sans dépendance. LA BARRE vit en ligne sur
# https://labarre.powerupgraders.com ; sa base est un seul fichier JSON, écrit par PUT avec la version lue (If-Match).
# Une écriture sans la bonne version est refusée : c'est ce qui protège la base des onglets et des sessions périmés.
#
#   python barre.py lire                                   → _travail-rangement/base.json + base.etag
#   python barre.py ecarts <export UPgraders>              → plan-barre.json + ecarts.md : ce que la base ne connaît pas
#   python barre.py appliquer <plan-barre.json>            → base-sortie.json (local, rien n'est envoyé)
#   python barre.py ecrire                                 → PUT de base-sortie.json avec If-Match, puis relecture
#
# Ce que l'outil pose, toujours « inféré » avec son motif : un client et sa marque pour chaque dossier client inconnu,
# et la campagne « <Marque> — le fil de l'année AAAA · UPgraders » (ou « · Friends Studio ») pour chaque année rangée.
# Ce qu'il ne pose jamais : un montant, une coordonnée, un document du coffre personnel, un chemin du coffre.
import json, os, re, sys, datetime, unicodedata, urllib.request

SITE = "https://labarre.powerupgraders.com"
BASE = SITE + "/depots/beignet-paradise.json"
T = os.path.join(os.path.expanduser("~"), "_travail-rangement")
P = lambda n: os.path.join(T, n)
nfc = lambda t: unicodedata.normalize("NFC", t).replace("’", "'")
cle = lambda t: re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", nfc(t)).encode("ascii", "ignore").decode().lower()).strip("-")
INTERDIT = re.compile(r"Privé et partagé|PERSONNEL — ALEXANDRE|_Privé|Identité/|Banque/", re.I)

def lire():
    os.makedirs(T, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(BASE, headers={"Cache-Control": "no-store"}), timeout=120) as r:
        corps = r.read(); etag = r.headers.get("ETag")
    open(P("base.json"), "wb").write(corps); open(P("base.etag"), "w").write(etag or "")
    d = json.loads(corps)
    print("base lue :", len(d["campagnes"]), "campagnes,", len(d["marques"]), "marques, version", (etag or "?")[:14], "…")

def ecarts(export):
    d = json.load(open(P("base.json"), encoding="utf-8"))
    # Les noms sous lesquels la base connaît déjà un porteur : marques, clients, et porteurs de campagnes UPgraders.
    connus = []
    for m in d["marques"]: connus.append({"nom": m["nom"], "marqueId": m["id"], "clientId": m.get("clientId")})
    for c in d["clients"]: connus.append({"nom": c["nom"], "marqueId": None, "clientId": c["id"]})
    for c in d["campagnes"]:
        if " — " in c["nom"]: connus.append({"nom": c["nom"].split(" — ")[0], "marqueId": (c.get("marqueIds") or [None])[0], "clientId": c.get("clientId")})
    def trouve(nom):
        k = cle(nom); hits = {}
        for x in connus:
            kx = cle(x["nom"])
            if not kx: continue
            if kx == k or (min(len(k), len(kx)) >= 3 and (k.startswith(kx + "-") or kx.startswith(k + "-"))):
                hits.setdefault(x["nom"], x)
        return list(hits.values())
    deja = {}
    for c in d["campagnes"]:
        an = re.findall(r"20[0-3]\d", c["nom"])
        if " — " in c["nom"] and an: deja.setdefault((cle(c["nom"].split(" — ")[0]), an[-1]), []).append(c["nom"])
    plan = {"marques": [], "campagnes": [], "a_verifier": [], "couvertes": [], "source": os.path.abspath(export)}
    racines = [(export, "upgraders", "UPgraders")]
    friends = os.path.join(export, "Friends Photography Studio")
    if os.path.isdir(friends): racines.append((friends, "friends", "Friends Studio"))
    for base_dir, structure, suffixe in racines:
        for client in sorted(os.listdir(base_dir)):
            dos = os.path.join(base_dir, client)
            if not os.path.isdir(dos) or client.startswith(("_", ".")) or INTERDIT.search(dos): continue
            if structure == "upgraders" and client in ("Friends Photography Studio", "Xtincell"): continue
            hits = trouve(client)
            exacts = [h for h in hits if cle(h["nom"]) == cle(client)]
            if exacts:   # le nom exact l'emporte ; on préfère celui qui porte une marque
                hits = sorted(exacts, key=lambda h: h["marqueId"] is None)[:1]
            if len(hits) > 1 and len({cle(h["nom"]) for h in hits}) > 1:
                plan["a_verifier"].append({"dossier": dos, "candidats": [h["nom"] for h in hits]}); continue
            if hits: porteur, mid, cid = hits[0]["nom"], hits[0]["marqueId"], hits[0]["clientId"]
            else:
                porteur, mid, cid = nfc(client), "MQ-" + cle(client)[:40], "C-" + cle(client)[:40]
                plan["marques"].append({"id": mid, "nom": porteur, "clientId": cid, "nouveauClient": True, "structure": structure, "dossier": dos})
            for an in sorted(os.listdir(dos)):
                if not re.fullmatch(r"20[0-3]\d", an): continue
                n = sum(len(fs) for _, _, fs in os.walk(os.path.join(dos, an)))
                if (cle(porteur), an) in deja:
                    plan["couvertes"].append({"dossier": os.path.join(dos, an), "par": deja[(cle(porteur), an)]}); continue
                plan["campagnes"].append({"id": "CMP-%s-%s-%s" % (structure, cle(porteur)[:32], an),
                    "nom": "%s — le fil de l'année %s · %s" % (porteur, an, suffixe), "marqueId": mid, "clientId": cid,
                    "structure": structure, "annee": an, "dossier": os.path.join(dos, an), "fichiers": n})
    json.dump(plan, open(P("plan-barre.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    md = ["# Écarts entre « %s » et LA BARRE — %s" % (os.path.basename(export), datetime.date.today().isoformat()), "",
          "## Clients et marques à créer (%d)" % len(plan["marques"]), ""] + ["- %s — `%s`" % (m["nom"], m["dossier"]) for m in plan["marques"]]
    md += ["", "## Campagnes à créer (%d)" % len(plan["campagnes"]), ""] + ["- %s (%d fichiers)" % (c["nom"], c["fichiers"]) for c in plan["campagnes"]]
    md += ["", "## À vérifier avant de créer (%d) : plusieurs porteurs possibles" % len(plan["a_verifier"]), ""] + \
          ["- `%s` : %s" % (x["dossier"], ", ".join(x["candidats"])) for x in plan["a_verifier"]]
    md += ["", "## Années déjà couvertes par une campagne (%d)" % len(plan["couvertes"]), ""] + \
          ["- `%s` : %s" % (x["dossier"], " ; ".join(x["par"])) for x in plan["couvertes"]]
    open(P("ecarts.md"), "w", encoding="utf-8").write("\n".join(md))
    print(len(plan["marques"]), "clients à créer ·", len(plan["campagnes"]), "campagnes à créer ·", len(plan["a_verifier"]), "à vérifier ·",
          len(plan["couvertes"]), "années déjà couvertes → relire", P("ecarts.md"))

def appliquer(plan_path):
    d = json.load(open(P("base.json"), encoding="utf-8")); plan = json.load(open(plan_path, encoding="utf-8"))
    q = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    ids = {x["id"] for k in ("marques", "clients", "campagnes") for x in d[k]}
    n = {"clients": 0, "marques": 0, "campagnes": 0}
    for m in plan["marques"]:
        if INTERDIT.search(m.get("dossier", "")): raise SystemExit("refus : un dossier du coffre dans le plan")
        motif = "Relevé dans l'export UPgraders de l'ordi dédié (dossier « %s »), le %s." % (os.path.basename(m["dossier"]), q[:10])
        if m["nouveauClient"] and m["clientId"] not in ids:
            d["clients"].append({"id": m["clientId"], "nom": m["nom"], "vault": {}, "cree_le": q, "infere": {"pourquoi": motif, "quand": q, "par": "creation"}})
            ids.add(m["clientId"]); n["clients"] += 1
        if m["id"] not in ids:
            d["marques"].append({"id": m["id"], "clientId": m["clientId"], "nom": m["nom"], "secteur": "", "socle": None, "couleurs": [],
                                 "infere": {"pourquoi": motif, "quand": q, "par": "creation"}})
            ids.add(m["id"]); n["marques"] += 1
    for c in plan["campagnes"]:
        if c["id"] in ids: continue
        mq = next((m for m in d["marques"] if m["id"] == c["marqueId"]), {})
        d["campagnes"].append({"id": c["id"], "nom": c["nom"], "clientId": mq.get("clientId") or c.get("clientId"),
            "marqueIds": [c["marqueId"]] if c.get("marqueId") else [],
            "regime": "always-on", "occasion": "continu", "fenetre": {"debut": None, "fin": None}, "marches": [], "bilan": "", "ecartes": {},
            "cree_le": q, "infere": {"pourquoi": "Déduite du dossier « %s/%s » de l'export UPgraders (%d fichiers). Pas tracé ne veut pas dire pas fait."
                                     % (os.path.basename(os.path.dirname(c["dossier"])), c["annee"], c["fichiers"]), "quand": q, "par": "creation"}})
        ids.add(c["id"]); n["campagnes"] += 1
    if INTERDIT.search(json.dumps(plan, ensure_ascii=False)): raise SystemExit("refus : le plan cite le coffre personnel")
    d["enregistre_le"] = q
    d.setdefault("journal", []).append({"quand": q, "qui": "creation", "action": "export UPgraders de l'ordi dédié", "type": "campagnes", "id": None,
        "detail": "%d clients, %d marques, %d campagnes déduits de l'export UPgraders" % (n["clients"], n["marques"], n["campagnes"])})
    json.dump(d, open(P("base-sortie.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(n, "→", P("base-sortie.json"), "(rien n'est envoyé ; « python barre.py ecrire » pour l'envoyer)")

def ecrire():
    etag = open(P("base.etag")).read().strip()
    corps = open(P("base-sortie.json"), "rb").read(); json.loads(corps)
    req = urllib.request.Request(BASE, data=corps, method="PUT", headers={"Content-Type": "application/json", "If-Match": etag})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: print("écrit :", r.status)
    except urllib.error.HTTPError as e:
        print("refusé :", e.code, e.read()[:300].decode("utf-8", "replace"))
        print("la base a changé depuis la lecture : relancer lire, ecarts, appliquer, puis ecrire."); sys.exit(1)
    lire()

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(open(__file__, encoding="utf-8").read().split("import json")[0]); sys.exit()
    {"lire": lambda: lire(), "ecarts": lambda: ecarts(a[1]), "appliquer": lambda: appliquer(a[1] if len(a) > 1 else P("plan-barre.json")),
     "ecrire": lambda: ecrire()}[a[0]]()
