# regrouper-campagnes-2026.py — chaque projet dans une campagne, avant la galerie.
#
# Décision d'Alex (01/10/2026) : regrouper avant la galerie. 120 projets sur 169 n'appartenaient à aucune
# campagne ; une galerie des campagnes n'aurait montré qu'un tiers du travail.
#
# La règle, appliquée projet par projet :
#   — un projet qui porte une occasion (Noël, Ramadan, rentrée, Pâques, fête, promo, jeu, événement,
#     lancement, institutionnel) rejoint la campagne de sa marque, de cette occasion et de cette année —
#     créée si elle n'existe pas ;
#   — les autres forment, par marque et par année, « le fil de l'année » : régime en continu, les actions
#     hors temps fort ;
#   — une campagne ne mêle jamais deux structures (Matanga, UPgraders, Friends Studio) ;
#   — un projet sans marque se range par son client.
# Chaque rattachement est inféré : il porte son motif et se défait d'un geste (Changer de campagne).
#
# Aussi : PEN&GRACE — le dossier du 14 juin 2026 est le prénuptial (Alex) ; Doual'art 2025 existe ailleurs.
#
# Usage : python3 outils/regrouper-campagnes-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, re, datetime, unicodedata, collections

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
d = json.load(open(SRC))
P = {p["id"]: p for p in d["projets"]}
M = {m["id"]: m for m in d["marques"]}
CL = {c["id"]: c for c in d["clients"]}
J = d.setdefault("journal", [])
bilan = collections.Counter()

# ————————————————— PEN&GRACE et Doual'art —————————————————
p = P.get("PRJ-XC-138")
if p and "14 juin 2026" not in p["nom"]:
    p.setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": p["nom"], "motif": "Le dossier du 14 juin 2026 (fichiers « 14062026 ») est le prénuptial (Alex) ; le corpus le datait 2025."})
    p["nom"] = "PEN&GRACE — shooting prénuptial (14 juin 2026)"
    i = p["sections"].setdefault("identite", {}); i["fenetre"] = "14 juin 2026"; i["echeance"] = "2026-06-14"
p = P.get("PRJ-XC-139")
if p: p.setdefault("releve", {})["fichiers"] = "Ailleurs que sur ce disque (Alex, 01/10/2026)."

# ————————————————— La règle —————————————————
def norme(t): return re.sub(r"[-_]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower())
TABLE = [("noel", r"\bnoel\b|fin d annee|xmas|christmas|end of year"), ("ramadan", r"ramadan|\baid\b"),
         ("paques", r"paques|careme"), ("rentree", r"back to school|rentree|\bbts\b|cahiers|credit scolaire"),
         ("fete", r"fete des meres|fete des peres|journee mondiale|saint valentin"),
         ("promo", r"promo|destockage|black friday|liquidation|soldes"),
         ("jeu", r"jeu concours|activation|monopoly|tombola|la roue|jeux"),
         ("evenement", r"seminaire|festival|salon|evenement|cowlab|\bjpo\b|vernissage|team building|150 ans"),
         ("lancement", r"lancement|nouveau look|rebranding|mvp"),
         ("institutionnel", r"institutionnel|communique|prise de parole|plan marketing|40 ans|25 ans")]
def occasion(nom):
    t = norme(nom)
    for k, pat in TABLE:
        if re.search(pat, t): return k
    return None
NOMS_OCC = {o["cle"]: o["nom"] for o in d.get("maison", {}).get("occasions", [])} if isinstance(d.get("maison"), dict) else {}
NOMS_OCC = NOMS_OCC or {"lancement": "Lancement de produit ou de marque", "noel": "Noël & fin d'année", "ramadan": "Ramadan & Aïd",
    "paques": "Pâques & Carême", "rentree": "Back to School", "fete": "Fête des mères, des pères, journée mondiale",
    "promo": "Promotion & déstockage", "jeu": "Jeu-concours & activation", "evenement": "Séminaire, salon, événement",
    "institutionnel": "Institutionnel & prise de parole"}
CAL = {("ramadan", "2025"): ("2025-03-01", "2025-03-30"), ("ramadan", "2026"): ("2026-02-18", "2026-03-19"),
       ("noel", "2025"): ("2025-12-01", "2026-01-06"), ("noel", "2026"): ("2026-12-01", "2027-01-07"),
       ("paques", "2025"): ("2025-03-05", "2025-04-21"), ("paques", "2026"): ("2026-02-18", "2026-04-06"),
       ("rentree", "2025"): ("2025-08-15", "2025-10-15"), ("rentree", "2026"): ("2026-08-15", "2026-10-15")}

def annee(p):
    ans = re.findall(r"20[12]\d", p["nom"])
    if ans: return ans[-1]
    i = p["sections"].get("identite") or {}
    ans = re.findall(r"20[12]\d", str(i.get("fenetre") or "") + " " + str(i.get("echeance") or ""))
    if ans: return ans[-1]
    return (p.get("cree_le") or "2026")[:4]

def struct(p): return p.get("structure") or "matanga"
STRUCTURES_CLIENTS = {"C-divers", "C-propre", "C-friends", "C-upgraders", None}
def cle_porteur(p):
    i = p["sections"].get("identite") or {}
    mq = [x for x in (i.get("marqueIds") or []) if x in M]
    if mq: return "mq", mq[0], M[mq[0]]["nom"]
    if i.get("clientId") in CL and i["clientId"] not in STRUCTURES_CLIENTS: return "cl", i["clientId"], CL[i["clientId"]]["nom"]
    # Sans marque, et rangé sous une structure ou des « comptes ponctuels » : le client est celui que le
    # titre nomme — Prudential, BAMS & BTP, AUF… — et non la structure qui les a servis.
    nom = re.split(r" — | · ", p["nom"])[0].strip()
    return "nom", nom, nom

def an_de_campagne(c):
    a = re.findall(r"20[12]\d", c["nom"])
    return a[-1] if a else None

x40 = P.get("PRJ-XC-040")
if x40 and "MQ-fc" in M:
    i40 = x40["sections"].setdefault("identite", {})
    if (i40.get("marqueIds") or [None])[0] != "MQ-fc": i40["marqueIds"] = ["MQ-fc"] + [m for m in (i40.get("marqueIds") or []) if m != "MQ-fc"]

vivants = [p for p in d["projets"] if not p.get("fusionne")]
def structs_de(c): return {struct(p) for p in vivants if p.get("campagneId") == c["id"]}

def trouver(stru, typ, ident, occ, an):
    for c in d["campagnes"]:
        if (c.get("occasion") or "continu") != occ or an_de_campagne(c) != an: continue
        if typ == "mq" and ident not in (c.get("marqueIds") or []): continue
        if typ == "cl" and (c.get("clientId") != ident or c.get("marqueIds")): continue
        if typ == "nom" and c.get("cleRegroupement") != (stru + "|" + ident + "|" + an): continue
        ss = structs_de(c)
        if ss and ss != {stru}: continue
        return c
    return None

def slug(t): return re.sub(r"[^a-z0-9]+", "-", norme(t)).strip("-")[:50]

def creer(stru, typ, ident, nom_porteur, occ, an, p):
    STRU = {"upgraders": "UPgraders", "friends": "Friends Studio"}
    porteur = nom_porteur or ("Opérations " + STRU.get(stru, "Matanga"))
    suffixe = " · " + STRU[stru] if stru in STRU else ""
    if occ == "continu":
        nom = porteur + " — le fil de l'année " + an + suffixe
        fen = {"debut": an + "-01-01", "fin": an + "-12-31"}
    else:
        nom = porteur + " — " + NOMS_OCC.get(occ, occ) + " " + an + suffixe
        cal = CAL.get((occ, an))
        fen = {"debut": cal[0], "fin": cal[1], "infere": "Déduite du calendrier : " + occ + " " + an + "."} if cal else {"debut": None, "fin": None}
    i = p["sections"].get("identite") or {}
    cid = (M[ident].get("clientId") if typ == "mq" else ident if typ == "cl" else i.get("clientId")) or None
    if cid in STRUCTURES_CLIENTS and typ == "nom": cid = None
    c = {"id": "CMP-" + slug(stru + "-" + (ident or "sans") + "-" + occ + "-" + an), "nom": nom, "clientId": cid,
         "marqueIds": [ident] if typ == "mq" else [], "regime": "always-on" if occ == "continu" else "ponctuelle",
         "occasion": occ, "fenetre": fen, "marches": [], "bilan": "", "ecartes": {}, "cree_le": QUAND,
         "cleRegroupement": stru + "|" + ident + "|" + an if typ == "nom" else None,
         "infere": {"pourquoi": ("Regroupement avant la galerie : " + ("les actions hors temps fort de " + porteur + " en " + an
                    if occ == "continu" else "les projets « " + NOMS_OCC.get(occ, occ) + " » de " + porteur + " en " + an)
                    + ", sous " + STRU.get(stru, "Matanga") + "."), "quand": QUAND}}
    if not c["cleRegroupement"]: del c["cleRegroupement"]
    while any(x["id"] == c["id"] for x in d["campagnes"]): c["id"] += "-b"
    d["campagnes"].append(c); bilan["campagnes créées"] += 1
    return c

for p in vivants:
    if p.get("campagneId"): continue
    stru = struct(p); typ, ident, nom = cle_porteur(p); occ = occasion(p["nom"]) or "continu"; an = annee(p)
    c = trouver(stru, typ, ident, occ, an) or creer(stru, typ, ident, nom, occ, an, p)
    p["campagneId"] = c["id"]
    p.setdefault("historiqueCampagne", []).append({"quand": QUAND, "qui": PAR, "avant": None, "apres": c["id"],
        "motif": "Regroupement avant la galerie (décision d'Alex, 01/10/2026) — inféré, se change d'un geste."})
    i = p["sections"].get("identite") or {}
    for mq in i.get("marqueIds") or []:
        if mq in M and mq not in c["marqueIds"] and typ == "mq": c["marqueIds"].append(mq)
    bilan["projets rattachés"] += 1
    bilan["en continu" if occ == "continu" else "sur une occasion"] += 1

J.append({"quand": QUAND, "qui": PAR, "action": "regroupement en campagnes", "type": "campagnes", "id": None,
          "detail": ", ".join(k + " : " + str(v) for k, v in bilan.items())})
d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(dict(bilan))
print("sans campagne :", sum(1 for p in vivants if not p.get("campagneId")), "· campagnes :", len(d["campagnes"]))
