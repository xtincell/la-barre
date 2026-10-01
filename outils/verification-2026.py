# verification-2026.py — la passe de vérification globale, avant la galerie des campagnes.
#
# 1. Défait deux fusions faites à tort (01/10/2026) : Doual'art et PEN&GRACE sont chacun deux activités
#    distinctes, à des dates différentes (Alex). Une activité photo se reconnaît à une salve de fichiers aux
#    dates proches : le dossier Doual'art du disque est une seule salve, 26-30 janvier 2026.
# 2. Corrige ce qu'Alex a précisé : « Star du quartier » est une proposition de direction artistique pour
#    Mamy Makala.
# 3. Contrôle tout le dépôt et répare ce qui est mécanique : références cassées (marque, client, campagne,
#    facture, livrable), campagnes vides, couvertures absentes du disque, doublons de nom ou de brief.
#    Ce qui demande un jugement sort dans le rapport, sans être tranché.
#
# Usage : python3 outils/verification-2026.py <depot-source.json> <depot-sortie.json> <rapport.json>

import json, sys, os, datetime, re, collections, unicodedata

SRC, DST, RAP = sys.argv[1], sys.argv[2], sys.argv[3]
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
d = json.load(open(SRC))
P = {p["id"]: p for p in d["projets"]}
J = d.setdefault("journal", [])
rap = {"repare": [], "a_trancher": [], "controle": {}}

def note(liste, quoi, detail): rap[liste].append({"quoi": quoi, "detail": detail})

# ————————————————— 1 · Les fusions défaites —————————————————

for dup, garde in (("PRJ-XC-139", "PRJ-XC-131"), ("PRJ-XC-133", "PRJ-XC-138")):
    a, b = P.get(dup), P.get(garde)
    if not a or not a.get("fusionne"): continue
    a.setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": "fusionné dans " + garde,
        "motif": "Fusion annulée : deux activités distinctes, à des dates différentes (Alex, 01/10/2026)."})
    del a["fusionne"]
    rb = b.get("releve") or {}
    rb["fusionnes"] = [x for x in rb.get("fusionnes", []) if x.get("projet") != dup]
    if not rb["fusionnes"]: rb.pop("fusionnes", None)
    J.append({"quand": QUAND, "qui": PAR, "action": "fusion annulée", "type": "projets", "id": dup, "detail": garde})
    note("repare", "Fusion annulée", dup + " redevient un dossier distinct de " + garde)

def renommer(pid, nom, motif, **champs):
    p = P.get(pid)
    if not p: return
    if p["nom"] != nom:
        p.setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": p["nom"], "motif": motif})
        p["nom"] = nom
    i = p["sections"].setdefault("identite", {})
    for k, v in champs.items(): i[k] = v

renommer("PRJ-XC-131", "Doual'art — shooting photo (26-30 janvier 2026)",
         "Le dossier du disque est une seule salve : 26-30 janvier 2026 (EXIF), ~500 exports et 64 RAW.", fenetre="26-30 janvier 2026", echeance="2026-01-30")
renommer("PRJ-XC-139", "Doual'art — shooting photo (2025)",
         "Activité distincte du shooting de janvier 2026 ; datée 2025 au document de campagnes. Fichiers non retrouvés au disque.")
renommer("PRJ-XC-138", "PEN&GRACE — shooting prénuptial (2025)",
         "Daté 2025 au document de campagnes (section Friends Studio).")
renommer("PRJ-XC-133", "PEN&GRACE — séance photo (activité distincte du prénuptial)",
         "Activité distincte (Alex) ; seul dossier au disque : 8 fichiers nommés 14062026 (14 juin 2026) — à rattacher à l'une des deux.")
note("a_trancher", "PEN&GRACE", "Le seul dossier au disque (8 fichiers « 14062026 », séance du 14 juin 2026) : est-ce le prénuptial (XC-138, daté 2025 au corpus) ou l'autre activité (XC-133) ?")
note("a_trancher", "Doual'art 2025", "XC-139 (2025) n'a aucun fichier au disque : le dossier présent est la salve de janvier 2026 (XC-131).")
for pid in ("PRJ-XC-133",):
    P[pid]["couverture"] = {"type": "aucune", "motif": "Commande privée : aucune photo de personne au dépôt.", "pose_le": QUAND, "par": PAR}

# ————————————————— 2 · Mamy Makala —————————————————

renommer("PRJ-XC-109", "Mamy Makala — « Star du quartier », proposition de direction artistique (2026)",
         "Proposition de direction artistique pour Mamy Makala (Alex, 01/10/2026).")
x109 = P.get("PRJ-XC-109")
if x109: x109["nature"] = "pitch"

# ————————————————— 2 bis · Les dates et les clients que la vérification a trouvés faux —————————————————

renommer("PRJ-XC-022", P["PRJ-XC-022"]["nom"], "", fenetre="février-mars 2026", echeance="2026-03-19")
P["PRJ-XC-022"].setdefault("inferences", {})["identite.fenetre"] = {"pourquoi": "Les livrables sont les KV Ramadan 2026 (« KV26 ») : Ramadan 2026 court du 18 février au 19 mars. Le document de campagnes disait 03/2025.", "quand": QUAND, "par": PAR}
renommer("PRJ-XC-048", P["PRJ-XC-048"]["nom"], "", fenetre="rentrée 2026", echeance="2026-09-30")
P["PRJ-XC-048"].setdefault("inferences", {})["identite.fenetre"] = {"pourquoi": "Brief CAD-094 reçu au Radar le 17/06/2026 pour la rentrée : le document de campagnes disait 2025.", "quand": QUAND, "par": PAR}
CA0 = {c["id"]: c for c in d["campagnes"]}
CLIENTS_CMP = {"CMP-c-upgraders-evenement-2026": ("C-alte", "Le festival est porté par l'association ALTE ; UPgraders est la structure qui l'a servi."),
               "CMP-c-divers-institutionnel-2025": ("C-lmt", "LMT Group a sa fiche client."),
               "CMP-mq-maci-institutionnel-2025": ("C-cadyst", "MACI est une opération de Cadyst Group (réponse d'Alex).")}
for cid, (cl, motif) in CLIENTS_CMP.items():
    c = CA0.get(cid)
    if c and c.get("clientId") != cl and any(x["id"] == cl for x in d["clients"]):
        c.setdefault("historique", []).append({"quand": QUAND, "qui": PAR, "avant": {"clientId": c.get("clientId")}, "motif": motif})
        c["clientId"] = cl; note("repare", "Client de campagne corrigé", c["nom"] + " → " + cl)
# La fenêtre d'une campagne datée par son occasion : le calendrier est un fait public, l'inférence le dit.
CAL = {("ramadan", "2025"): ("2025-03-01", "2025-03-30"), ("ramadan", "2026"): ("2026-02-18", "2026-03-19"),
       ("noel", "2025"): ("2025-12-01", "2026-01-06"), ("noel", "2026"): ("2026-12-01", "2027-01-07"),
       ("paques", "2025"): ("2025-03-05", "2025-04-21"), ("paques", "2026"): ("2026-02-18", "2026-04-06"),
       ("rentree", "2025"): ("2025-08-15", "2025-10-15"), ("rentree", "2026"): ("2026-08-15", "2026-10-15")}
for c in d["campagnes"]:
    f = c.get("fenetre") or {}
    an = (re.findall(r"20\d\d", c["nom"]) or [None])[-1]
    cle = (c.get("occasion"), an)
    if cle in CAL and (not f.get("debut") or (f.get("fin") or "").endswith("-12-31") or (f.get("fin") or "")[:4] != CAL[cle][1][:4]):
        if f.get("debut") and not (f.get("fin") or "").endswith("-12-31"): continue
        c.setdefault("historique", []).append({"quand": QUAND, "qui": PAR, "avant": {"fenetre": f}, "motif": "Fenêtre déduite du calendrier de l'occasion."})
        c["fenetre"] = {"debut": CAL[cle][0], "fin": CAL[cle][1], "infere": "Déduite du calendrier : " + c.get("occasion") + " " + an + "."}
        note("repare", "Fenêtre de campagne déduite de son occasion", c["nom"] + " → " + CAL[cle][0] + " / " + CAL[cle][1])

# Quand un brief donne la fenêtre, il prime sur le calendrier de l'occasion.
ce = CA0.get("CMP-mq-eco-rentree-2026")
if ce:
    ce["fenetre"] = {"debut": "2026-06-01", "fin": "2026-09-30", "source": "Radar ECO-018 : « Campagne CRESCO Back-to-School 01/06→30/09 »."}

# ————————————————— 3 · Le contrôle du dépôt —————————————————

M = {m["id"]: m for m in d["marques"]}
CL = {c["id"]: c for c in d["clients"]}
CA = {c["id"]: c for c in d["campagnes"]}
F = {f["id"]: f for f in d.get("factures", [])}
vivants = [p for p in d["projets"] if not p.get("fusionne")]

# Références cassées.
for p in d["projets"]:
    i = p["sections"].setdefault("identite", {})
    mq = i.get("marqueIds") or []
    bons = [x for x in mq if x in M]
    if bons != mq:
        i.setdefault("marquesPerdues", []).extend([x for x in mq if x not in M]); i["marqueIds"] = bons
        note("repare", "Marque inconnue retirée", p["id"] + " : " + ", ".join(x for x in mq if x not in M))
    if i.get("clientId") and i["clientId"] not in CL:
        note("a_trancher", "Client inconnu", p["id"] + " → " + i["clientId"])
    if not i.get("clientId") and bons:
        c = M[bons[0]].get("clientId")
        if c in CL:
            i["clientId"] = c; i["client"] = i.get("client") or CL[c]["nom"]
            note("repare", "Client déduit de la marque", p["id"] + " → " + CL[c]["nom"])
    if p.get("campagneId") and p["campagneId"] not in CA:
        note("repare", "Campagne inconnue retirée", p["id"] + " → " + p["campagneId"])
        p.setdefault("historiqueCampagne", []).append({"quand": QUAND, "avant": p["campagneId"], "apres": None, "motif": "Campagne introuvable au dépôt."})
        del p["campagneId"]
    for fid in p.get("factures", []):
        if fid not in F: note("a_trancher", "Facture inconnue", p["id"] + " → " + fid)
    for l in p.get("livrables", []):
        if l.get("marqueId") and l["marqueId"] not in M:
            note("repare", "Marque de livrable inconnue retirée", p["id"] + " / " + l.get("id", "") + " → " + l["marqueId"])
            l["marquePerdue"] = l.pop("marqueId")
        if l.get("vignette") and not os.path.exists(os.path.join(APP, l["vignette"])):
            note("a_trancher", "Vignette de livrable absente du disque", p["id"] + " / " + (l.get("nom") or "")[:50])
for f in d.get("factures", []):
    if f.get("projetId") and f["projetId"] not in P: note("a_trancher", "Facture rattachée à un projet inconnu", f["id"])
for m in d["marques"]:
    if m.get("clientId") and m["clientId"] not in CL: note("a_trancher", "Marque sans client valide", m["id"] + " → " + m["clientId"])
for c in d["campagnes"]:
    bons = [x for x in c.get("marqueIds", []) if x in M]
    if bons != c.get("marqueIds", []):
        note("repare", "Marque inconnue retirée d'une campagne", c["id"]); c["marqueIds"] = bons
    if c.get("clientId") and c["clientId"] not in CL: note("a_trancher", "Campagne au client inconnu", c["id"])
    n = sum(1 for p in vivants if p.get("campagneId") == c["id"])
    if not n: note("a_trancher", "Campagne vide", c["nom"])
    if re.search(r"\bC-[a-z]", c["nom"]): note("a_trancher", "Nom de campagne avec un identifiant", c["nom"])

# Couvertures et vignettes absentes du disque.
def absent(chemin): return chemin and chemin.startswith("assets/") and not os.path.exists(os.path.join(APP, chemin))
for p in d["projets"]:
    for k in ("vignette",):
        if absent(p.get(k)): note("a_trancher", "Vignette de projet absente du disque", p["id"] + " → " + p[k])
    cv = p.get("couverture") or {}
    for s in [cv.get("vignette")] + (cv.get("images") or []):
        if absent(s): note("a_trancher", "Couverture de projet absente du disque", p["id"] + " → " + s)
for c in d["campagnes"]:
    cv = c.get("couverture") or {}
    if absent(cv.get("vignette")): note("a_trancher", "Couverture de campagne absente du disque", c["id"])

# Doublons : même nom, même référence, même brief Radar maître sur deux dossiers vivants.
def n_(t): return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower()).strip()
par_nom = collections.defaultdict(list); par_ref = collections.defaultdict(list); par_radar = collections.defaultdict(list)
for p in vivants:
    par_nom[n_(p["nom"])].append(p["id"]); par_ref[p.get("ref")].append(p["id"])
    for k in ((p.get("releve") or {}).get("radar") or []):
        if "." not in k: par_radar[k].append(p["id"])
for k, v in par_nom.items():
    if len(v) > 1: note("a_trancher", "Même nom sur deux dossiers", k + " : " + ", ".join(v))
for k, v in par_ref.items():
    if k and len(v) > 1: note("a_trancher", "Même référence sur deux dossiers", k + " : " + ", ".join(v))
for k, v in par_radar.items():
    if len(v) > 1: note("a_trancher", "Même brief Radar sur deux dossiers", k + " : " + ", ".join(v))

# Cohérence du nom et des dates.
for p in vivants:
    ans = set(re.findall(r"20[12]\d", p["nom"]))
    i = p["sections"].get("identite") or {}
    fen = str(i.get("fenetre") or "") + " " + str(i.get("echeance") or "")
    af = set(re.findall(r"20[12]\d", fen))
    if ans and af and not (ans & af):
        note("a_trancher", "Année du nom ≠ année de la fenêtre", p["id"] + " « " + p["nom"] + " » / " + fen.strip())

# Structure : un projet hors Matanga ne doit pas être dans une campagne Matanga, et inversement.
for c in d["campagnes"]:
    ss = {(p.get("structure") or "matanga") for p in vivants if p.get("campagneId") == c["id"]}
    if len(ss) > 1: note("a_trancher", "Campagne mêlant deux structures", c["nom"] + " : " + ", ".join(sorted(ss)))

# Inférences sans motif.
sans = 0
for p in d["projets"]:
    for k, v in (p.get("inferences") or {}).items():
        if not (v or {}).get("pourquoi"): sans += 1
for m in d["marques"]:
    for k, v in ((m.get("vault") or {}).get("inferences") or {}).items():
        if not (v or {}).get("pourquoi"): sans += 1
if sans: note("a_trancher", "Inférences sans motif", str(sans))

rap["controle"] = {"projets": len(d["projets"]), "vivants": len(vivants), "campagnes": len(d["campagnes"]),
                   "marques": len(d["marques"]), "clients": len(d["clients"]), "factures": len(d.get("factures", [])),
                   "repare": len(rap["repare"]), "a_trancher": len(rap["a_trancher"])}
d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
json.dump(rap, open(RAP, "w"), ensure_ascii=False, indent=1)
print(json.dumps(rap["controle"], ensure_ascii=False))
for x in rap["repare"]: print("  RÉPARÉ   ", x["quoi"], "—", x["detail"])
for x in rap["a_trancher"]: print("  À VOIR   ", x["quoi"], "—", x["detail"])
