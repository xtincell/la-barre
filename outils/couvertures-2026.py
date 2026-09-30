# couvertures-2026.py — une couverture pour chaque campagne, et rien de ce que le disque porte ne se perd.
#
# Sources fouillées : le dossier « DOSSIER PROJETS — XTINCELL » (01 CAMPAGNES, 02 MASTERS DE
# CAMPAGNE, 03 KEY VISUALS PAR MARQUE, leurs index et les vignettes de son générateur), les
# logos du disque (Téléchargements/Work 2026/04 RESSOURCES/Logos, Bureau iCloud, ~/FUKU).
#
# Ce que le script écrit :
#   c.couverture   la couverture d'une campagne : son KV master quand l'index des masters en
#                  porte un pour la marque, l'occasion et l'année ; sinon le KV maître de ses
#                  livrables ; sinon l'illustration de campagne du corpus. Avec sa source et son motif.
#   c.pieces       ce que l'index relève pour la campagne sans que ce soit un KV (« équivalent —
#                  événement, pas de KV », variantes marché) : rangé, pas jeté.
#   m.visuels      le fonds visuel de chaque marque : chaque ligne des index 01, 02 et 03, avec sa
#                  source ; une vignette pour les masters et quelques KV, le chemin pour le reste.
#                  Les reportages (COWLAB, casting, captation) y entrent comme un dossier et son compte.
#   assets logo    les logos trouvés pour les marques qui n'en avaient pas.
#   inclassables   la collection de ce qui n'a pas encore de place : lignes d'index sans marque
#                  au dépôt (folio historique, archives d'ancienne agence), fichiers hors index.
#
# Les projets n'ont pas besoin d'écriture : leur couverture se déduit (app/couverture.js) —
# la leur, sinon celle de leur campagne, sinon le logo et les packs de la marque, sinon une
# mosaïque de ses visuels.
#
# Usage : python3 outils/couvertures-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, os, csv, re, hashlib, shutil, subprocess, unicodedata, datetime

SRC, DST = sys.argv[1], sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(ICI)
CORPUS = os.path.join(os.path.dirname(APP), "DOSSIER PROJETS — XTINCELL")
VIGN = os.path.join(CORPUS, ".generateur", "vignettes")
OUT_C = "assets/review/couvertures"
OUT_F = "assets/review/fonds"
OUT_L = "assets/review/logos"
for o in (OUT_C, OUT_F, OUT_L): os.makedirs(os.path.join(APP, o), exist_ok=True)
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"

d = json.load(open(SRC))
M = {m["id"]: m for m in d["marques"]}
P = d["projets"]
J = d.setdefault("journal", [])
INC = d.setdefault("inclassables", [])
vus_inc = {x.get("source") for x in INC}
bilan = {"couvertures": 0, "pieces": 0, "visuels": 0, "vignettes": 0, "logos": 0, "inclassables": 0}

def norme(t):
    t = unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

def slug(t): return norme(t).replace(" ", "-")[:60]

def sips(src, dst, taille, fmt="jpeg"):
    if os.path.exists(dst): return True
    args = ["sips", "-Z", str(taille), "-s", "format", fmt] + (["-s", "formatOptions", "78"] if fmt == "jpeg" else []) + [src, "--out", dst]
    return subprocess.run(args, capture_output=True).returncode == 0 and os.path.exists(dst)

def vignette_corpus(rel):
    """La vignette 520 px du générateur du corpus, copiée à côté de l'application."""
    cle = hashlib.md5(rel.encode("utf-8")).hexdigest()
    src = os.path.join(VIGN, cle + ".jpg")
    dst_rel = OUT_F + "/" + cle + ".jpg"
    dst = os.path.join(APP, dst_rel)
    if not os.path.exists(dst):
        if os.path.exists(src): shutil.copyfile(src, dst)
        else:
            full = os.path.join(CORPUS, rel)
            if not (os.path.exists(full) and sips(full, dst, 520)): return None
    bilan["vignettes"] += 1
    return dst_rel

# ————————————————— Les marques, par leur nom dans les index —————————————————

ALIAS = {
    "delys barka": "MQ-pz-delys", "cadyst delys barka": "MQ-pz-delys",
    "la vache qui rit bel": "MQ-lvqr", "la vache qui rit": "MQ-lvqr",
    "frieslandcampina": "MQ-fc", "universal music artistes": "MQ-universal",
    "universal music labels": "MQ-universal", "locko universal music africa": "MQ-universal",
    "charlotte dipanda universal music africa": "MQ-universal",
    "kamer otaku festival": "MQ-kof", "motion19": "MQ-motion19", "upgraders": "MQ-upgraders",
}
PAR_NOM = {norme(m["nom"]): m["id"] for m in d["marques"]}
def marque_de(libelle):
    n = norme(libelle)
    return ALIAS.get(n) or PAR_NOM.get(n)

# ————————————————— 1 · Les logos qui manquaient —————————————————

HOME = os.path.expanduser("~")
LOGOS = HOME + "/Downloads/Work 2026/04 RESSOURCES/Logos/"
DESK = HOME + "/Library/Mobile Documents/com~apple~CloudDocs/Desktop/"
TROUVES = {
    "MQ-peak": LOGOS + "Fichier 1peak logo.png",
    "MQ-coast": LOGOS + "Coast_logo.png",
    "MQ-pearl": LOGOS + "Pearl_Logo.png",
    "MQ-rainbow": LOGOS + "rainbow logo.png",
    "MQ-softbaker": LOGOS + "logo soft baker (2).png",
    "MQ-fuku": HOME + "/FUKU/Fuku logo.png",
    "MQ-phosphatine": DESK + "01 MARQUES CLIENTS/Phosphatine/Phosphatine/Logo_Phosphatine 3.png",
    "MQ-tradex": DESK + "01 MARQUES CLIENTS/Tradex/Tradex — Bureau iCloud/ASSETS/Logo TRADEX.png",
    "MQ-matanga": HOME + "/Downloads/Work 2026/00 Matanga Agency/matanga agency logo colored.png",
    "MQ-lvqr": DESK + "01 MARQUES CLIENTS/FrieslandCampina/Belle Fromagerie/TLC_LOGO_totem_FR.png",
}
avec_logo = {a.get("marque") for a in d["assets"] if a.get("role") == "logo"}
for mid, chemin in TROUVES.items():
    if mid in avec_logo or mid not in M or not os.path.exists(chemin): continue
    dst_rel = OUT_L + "/" + slug(M[mid]["nom"]) + ".png"
    if not sips(chemin, os.path.join(APP, dst_rel), 600, "png"): continue
    d["assets"].append({"id": "A-logo-" + mid[3:], "nom": "Logo " + M[mid]["nom"], "marque": mid, "role": "logo",
                        "source": chemin.replace(HOME, "~"), "vignette": dst_rel, "marches": [],
                        "releve": {"quand": QUAND, "par": PAR, "motif": "Logo trouvé sur le disque en cherchant les couvertures."}})
    bilan["logos"] += 1

# ————————————————— 2 · Les index du corpus —————————————————

def lire(dossier):
    f = os.path.join(CORPUS, dossier, "_INDEX.csv")
    return list(csv.DictReader(open(f, encoding="utf-8-sig"))) if os.path.exists(f) else []

I01 = lire("01 CAMPAGNES")
I02 = lire("02 MASTERS DE CAMPAGNE")
I03 = lire("03 KEY VISUALS PAR MARQUE")

def inclassable(typ, libelle, source, detail, rattache=None):
    if source in vus_inc: return
    vus_inc.add(source)
    INC.append({"id": "INC-" + hashlib.md5(source.encode()).hexdigest()[:10], "type": typ, "libelle": libelle,
                "source": source, "detail": detail, "rattache": rattache, "releve_le": QUAND,
                "origine": "fouille du disque pour les couvertures (30/09/2026)"})
    bilan["inclassables"] += 1

def visuel(mid, v):
    m = M[mid]
    lst = m.setdefault("visuels", [])
    if any(x.get("source") == v["source"] for x in lst): return
    lst.append(v); bilan["visuels"] += 1

# Les masters : un par (marque, campagne, année).
masters = []
for x in I02:
    rel = "02 MASTERS DE CAMPAGNE/" + x["copie"]
    mid = marque_de(x["marque"])
    if not mid:
        inclassable("visuel", x["marque"] + " — " + x["campagne"] + " (" + x["annee"] + ")", rel,
                    "Master ou folio sans marque au dépôt · statut : " + x["statut"] + (" · " + x["note"] if x.get("note") else ""))
        continue
    master = x["statut"] == "master"
    vg = vignette_corpus(rel) if os.path.isfile(os.path.join(CORPUS, rel)) else None
    visuel(mid, {"id": "VIS-" + hashlib.md5(rel.encode()).hexdigest()[:10], "index": "02", "campagne": x["campagne"],
                 "annee": x["annee"], "statut": x["statut"], "source": "corpus/" + rel, "origine": x.get("source") or None,
                 "note": x.get("note") or None, "vignette": vg})
    masters.append({"mid": mid, "campagne": x["campagne"], "annee": x["annee"], "statut": x["statut"], "rel": rel, "vignette": vg})

# Les KV par marque.
par_marque = {}
for i, x in enumerate(I03):
    rel = "03 KEY VISUALS PAR MARQUE/" + x["copie"]
    mid = marque_de(x["marque"])
    if not mid:
        inclassable("visuel", x["marque"] + " — " + x["campagne"], rel, "KV sans marque au dépôt · " + x.get("dimensions", ""))
        continue
    par_marque.setdefault(mid, []).append((x, rel))
for mid, rows in par_marque.items():
    # Une vignette pour les six premiers, en variant les campagnes ; le chemin pour le reste.
    vus, choisis = set(), set()
    for x, rel in rows:
        if len(choisis) < 6 and x["campagne"] not in vus: vus.add(x["campagne"]); choisis.add(rel)
    for x, rel in rows:
        if len(choisis) < 6: choisis.add(rel)
    for x, rel in rows:
        visuel(mid, {"id": "VIS-" + hashlib.md5(rel.encode()).hexdigest()[:10], "index": "03", "campagne": x["campagne"],
                     "dimensions": x.get("dimensions") or None, "source": "corpus/" + rel, "origine": x.get("source") or None,
                     "vignette": vignette_corpus(rel) if rel in choisis else None})

# Les reportages hors KV : un dossier, son compte.
rep = os.path.join(CORPUS, "03 KEY VISUALS PAR MARQUE", "_REPORTAGE (hors KV)")
if os.path.isdir(rep):
    for dos in sorted(os.listdir(rep)):
        full = os.path.join(rep, dos)
        if not os.path.isdir(full): continue
        fichiers = [f for r_, _, fs in os.walk(full) for f in fs if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        libelle = dos.split(" — ")[0]
        mid = marque_de(libelle)
        rel = "03 KEY VISUALS PAR MARQUE/_REPORTAGE (hors KV)/" + dos
        entree = {"id": "VIS-" + hashlib.md5(rel.encode()).hexdigest()[:10], "index": "reportage", "campagne": dos.split(" — ", 1)[-1],
                  "fichiers": len(fichiers), "source": "corpus/" + rel, "vignette": None,
                  "note": "Reportage photo hors KV : " + str(len(fichiers)) + " fichiers dans le dossier."}
        if mid: visuel(mid, entree)
        else: inclassable("reportage", dos, rel, str(len(fichiers)) + " fichiers")

# Les illustrations de campagne (01) qu'aucun projet ne porte.
portees = {os.path.basename(p.get("vignette") or "") for p in P}
for x in I01:
    rel = "01 CAMPAGNES/" + os.path.basename(x["fichier exporté"])
    base = os.path.basename(x["fichier exporté"])
    if base in portees: continue
    mid = marque_de(x["marque / groupe"].split(" · ")[-1]) or marque_de(x["marque / groupe"])
    if mid and x["catégorie"] != "hors périmètre":
        visuel(mid, {"id": "VIS-" + hashlib.md5(rel.encode()).hexdigest()[:10], "index": "01", "campagne": x["campagne ou outil"],
                     "dimensions": x.get("dimensions") or None, "source": "corpus/" + rel,
                     "origine": x.get("fichier source d’origine") or None, "vignette": vignette_corpus(rel)})
    else:
        inclassable("illustration", x["marque / groupe"] + " — " + x["campagne ou outil"], rel,
                    "Illustration de campagne sans projet ni marque au dépôt · catégorie : " + x["catégorie"])

# ————————————————— 3 · La couverture de chaque campagne —————————————————

OCC = {"rentree": ["back to school"], "noel": ["noel", "fin d annee"], "ramadan": ["ramadan"],
       "paques": ["paques"], "fete": ["fete des meres", "fete des peres", "journee mondiale"],
       "jeu": ["jeux", "activation"], "promo": ["promotion"], "institutionnel": ["institutionnel"],
       "lancement": ["rebranding", "nouveau look", "lancement"], "evenement": ["seminaire", "cowlab", "evenement"]}

def annee_de(c):
    m = re.search(r"(20\d\d)", c["nom"]) or re.search(r"(20\d\d)", str((c.get("fenetre") or {}).get("fin") or ""))
    return m.group(1) if m else None

def grand(rel, cid):
    dst_rel = OUT_C + "/" + slug(cid) + ".jpg"
    return dst_rel if sips(os.path.join(CORPUS, rel), os.path.join(APP, dst_rel), 1400) else None

for c in d["campagnes"]:
    an = annee_de(c)
    cles = OCC.get(c.get("occasion") or "", [])
    cands = []
    for x in masters:
        if x["mid"] not in (c.get("marqueIds") or []): continue
        n = norme(x["campagne"])
        if not any(k in n for k in cles): continue
        ecart = abs(int(x["annee"][:4]) - int(an)) if an and x["annee"][:4].isdigit() else 9
        cands.append((0 if x["statut"] == "master" else 1, ecart, x))
    cands.sort(key=lambda t: (t[0], t[1]))
    # Ce que l'index relève sans que ce soit un KV : rangé sur la campagne.
    for rang, ecart, x in cands:
        if x["statut"] != "master" and ecart <= 1:
            pcs = c.setdefault("pieces", [])
            if not any(p_.get("source") == "corpus/" + x["rel"] for p_ in pcs):
                pcs.append({"type": "variante marché" if "variante" in x["statut"] else "équivalent", "statut": x["statut"],
                            "source": "corpus/" + x["rel"], "vignette": x["vignette"], "releve_le": QUAND})
                bilan["pieces"] += 1
    if c.get("couverture"): continue
    cov = None
    best = next((t for t in cands if t[0] == 0 and t[1] <= 1), None)
    if best:
        x = best[2]
        v = grand(x["rel"], c["id"])
        if v:
            cov = {"type": "kv", "vignette": v, "source": "corpus/" + x["rel"],
                   "motif": "KV master de l'index des masters : " + M[x["mid"]]["nom"] + " — " + x["campagne"] + " " + x["annee"]
                   + (" (année voisine de la campagne)" if best[1] else "") + "."}
    if not cov:
        ps = [p for p in P if p.get("campagneId") == c["id"]]
        kv = next((l for p in ps for l in p.get("livrables", []) if l.get("vignette") and not l.get("annule")
                   and (l.get("niveau") == "maitre" or "kv" in norme(l.get("nom")))), None)
        kv = kv or next((l for p in ps for l in p.get("livrables", []) if l.get("vignette") and not l.get("annule")), None)
        if kv:
            cov = {"type": "kv", "vignette": kv["vignette"], "source": "livrable " + kv.get("id", ""),
                   "motif": "KV des livrables de la campagne : « " + (kv.get("nom") or "") + " »."}
        else:
            il = next((p for p in ps if p.get("vignette")), None)
            if il:
                cov = {"type": "illustration", "vignette": il["vignette"], "source": il["vignette"],
                       "motif": "Illustration de campagne du corpus, portée par « " + il["nom"] + " »."}
    if cov:
        cov.update({"pose_le": QUAND, "par": PAR})
        c["couverture"] = cov
        bilan["couvertures"] += 1
        J.append({"quand": QUAND, "qui": PAR, "action": "couverture posée", "type": "campagnes", "id": c["id"],
                  "detail": c["nom"] + " — " + cov["motif"]})

# ————————————————— 4 · Ce que la fouille du disque a trouvé pour les campagnes restantes —————————————————

CV = HOME + "/Downloads/Work 2026/_DOSSIER CV — ILLUSTRATIONS/01 Campagnes/"
A_LA_MAIN = {
    "CMP-mq-lapasta-fete-2025": (CV + "La Pasta — Journée Mondiale des Pâtes.jpg", "illustration",
        "Illustration de campagne « La Pasta — Journée Mondiale des Pâtes » (dossier CV, Work 2026) : le projet XC-044 porte la JMP."),
    "CMP-mq-cgroup-fete-2025": (CV + "groupe — Plan pub groupe — Octobre Rose & formats récurrents.jpg", "illustration",
        "Illustration « Plan pub groupe — Octobre Rose & formats récurrents » (dossier CV) : le projet CAD-064."),
    "CMP-mq-phosphatine-promo-2025": (HOME + "/Downloads/Work 2026/01 MARQUES CLIENTS/Phosphatine/04 VIDÉO & SPOTS/Promotion phosphatine KV CAMEROUN.png", "kv",
        "KV « Promotion phosphatine » Cameroun (Work 2026/01 MARQUES CLIENTS/Phosphatine)."),
    "CMP-mq-maci-institutionnel-2025": (CV + "Autres comptes Matanga — MACI — prise de parole & quotes hebdo.jpg", "illustration",
        "Illustration « MACI — prise de parole & quotes hebdo » (dossier CV) : le projet PAK-002."),
    "CMP-c-divers-institutionnel-2025": (CV + "Autres comptes Matanga — LMT Group — plan marketing 360.jpg", "illustration",
        "Illustration « LMT Group — plan marketing 360 » (dossier CV) : le projet XC-105."),
    "CMP-c-upgraders-evenement-2026": (CV + "UPgraders — clients — KOF — Kamer Otaku Festival, édition 25 & Media Kit 2026.jpg", "illustration",
        "Illustration « KOF — édition 25 & Media Kit 2026 » (dossier CV) : le projet XC-120."),
    "CMP-lvqr-stl-cm-2026": (HOME + "/Downloads/LVQR Campagne Not Laughing cow/DOC 4/The Laughing Cow_DINER_Retouched PR Image_APPROVED FOR ORGANIC ONLY GLOBAL USE 9.28.jpg", "kv-source",
        "Image presse de la campagne d'origine US « Not Laughing Cow » (dossier Bel transmis le 29/09/2026) — droits : organique seulement, usage interne ici."),
}
C = {c["id"]: c for c in d["campagnes"]}
for cid, (chemin, typ, motif) in A_LA_MAIN.items():
    c = C.get(cid)
    if not c or c.get("couverture") or not os.path.exists(chemin): continue
    dst_rel = OUT_C + "/" + slug(cid) + ".jpg"
    if not sips(chemin, os.path.join(APP, dst_rel), 1400): continue
    c["couverture"] = {"type": typ, "vignette": dst_rel, "source": chemin.replace(HOME, "~"), "motif": motif, "pose_le": QUAND, "par": PAR}
    bilan["couvertures"] += 1
    J.append({"quand": QUAND, "qui": PAR, "action": "couverture posée", "type": "campagnes", "id": cid, "detail": c["nom"] + " — " + motif})

# L'illustration de campagne du corpus que l'ingestion n'avait pas appariée à son projet.
ILL = {
    "PRJ-XC-139": "Marques propres & ventures — Xtincell — Doual'art, shooting photo.jpg",
    "PRJ-XC-131": "À ton nom propre — Doual'art — shooting photo.jpg",
    "PRJ-XC-130": "Autres comptes Matanga — Cimencam · Port de Kribi · LTA · Musina · NYAMA · Dr Ikito.jpg",
    "PRJ-XC-118": "Autres comptes Matanga — Cimencam · Port de Kribi · LTA · Musina · NYAMA · Dr Ikito.jpg",
    "PRJ-XC-129": "À ton nom propre — Arc en Ciel — stratégie pharmacie CIV.jpg",
    "PRJ-XC-127": "UPgraders — clients — Musina — Musina 9 & Noël.jpg",
    "PRJ-XC-125": "UPgraders — clients — Villa Corso — élevage.jpg",
    "PRJ-XC-124": "UPgraders — clients — Akwa Palace — campagne vidéo.jpg",
    "PRJ-XC-123": "UPgraders — clients — Dot Bites — brandbook & plateforme (projet UPgraders).jpg",
    "PRJ-XC-122": "UPgraders — clients — Universal Music — Cysoul, captation live.jpg",
    "PRJ-XC-121": "UPgraders — clients — MOTION19 — Black Friday.jpg",
    "PRJ-XC-120": "UPgraders — clients — KOF — Kamer Otaku Festival, édition 25 & Media Kit 2026.jpg",
    "PRJ-XC-119": "UPgraders — clients — Spawt — activation Abidjan.jpg",
    "PRJ-XC-117": "Autres comptes Matanga — Wafacash · Maritimo · Petvisidame · GUCE.jpg",
    "PRJ-XC-111": "Autres comptes Matanga — BAMS & BTP — identité.jpg",
    "PRJ-XC-109": "Autres comptes Matanga — Mama Makala — Star du quartier.jpg",
    "PRJ-XC-108": "Autres comptes Matanga — Cap Esterias — recommandations.jpg",
    "PRJ-XC-107": "Autres comptes Matanga — Frutas — campagne.jpg",
    "PRJ-XC-105": "Autres comptes Matanga — LMT Group — plan marketing 360.jpg",
    "PRJ-XC-104": "Autres comptes Matanga — MACI — prise de parole & quotes hebdo.jpg",
    "PRJ-XC-103": "Autres comptes Matanga — PRESYNAT — campagne social 360.jpg",
    "PRJ-XC-101": "Phosphatine (Danone - IDA X Brands) — PLV — mise à jour & chevalet HCP.jpg",
    "PRJ-XC-063": "groupe — Plan pub groupe — Octobre Rose & formats récurrents.jpg",
    "PRJ-XC-055": "autres marques — Cadyst Farming - Robuste — brief + débriefing.jpg",
    "PRJ-XC-044": "La Pasta — Journée Mondiale des Pâtes.jpg",
    "PRJ-XC-042": "groupe — Packshots produits.jpg",
    "PRJ-XC-041": "groupe — Branding interne FrieslandCampina.jpg",
    "PRJ-XC-040": "groupe — Chartes & Brand Propellers.jpg",
    "PRJ-XC-038": "autres marques filles — Belle Tomate — à qualifier.jpg",
    "PRJ-XC-037": "autres marques filles — Belle Fromagerie — à qualifier.jpg",
    "PRJ-XC-128": "UPgraders — clients — BanaHealth · Anatomy by Roida · PENGRACE · Luther · Galahad 360.jpg",
    "PRJ-XC-132": "UPgraders — clients — BanaHealth · Anatomy by Roida · PENGRACE · Luther · Galahad 360.jpg",
    "PRJ-XC-133": "UPgraders — clients — BanaHealth · Anatomy by Roida · PENGRACE · Luther · Galahad 360.jpg",
    "PRJ-XC-138": "UPgraders — clients — BanaHealth · Anatomy by Roida · PENGRACE · Luther · Galahad 360.jpg",
    "PRJ-XC-140": "Marques propres & ventures — Friends Studio — production & pilotage.jpg",
}
PI = {p["id"]: p for p in P}
for pid, nomf in ILL.items():
    p = PI.get(pid)
    if not p or p.get("vignette"): continue
    src = os.path.join(CORPUS, "01 CAMPAGNES", nomf)
    if not os.path.exists(src): src = HOME + "/Downloads/Work 2026/_DOSSIER CV — ILLUSTRATIONS/01 Campagnes/" + nomf
    dst_rel = "assets/review/corpus/" + nomf
    if not (os.path.exists(src) and sips(src, os.path.join(APP, dst_rel), 1300)): continue
    p["vignette"] = dst_rel
    p.setdefault("releve", {})["vignetteAppariee"] = {"quand": QUAND, "source": "corpus/01 CAMPAGNES/" + nomf,
        "motif": "Illustration de campagne du corpus appariée au projet par son nom (fouille des couvertures)."}
    bilan["illustrations"] = bilan.get("illustrations", 0) + 1
    # Elle n'est plus une pièce sans place.
    INC[:] = [x for x in INC if not x.get("source", "").endswith(nomf)]
    for m in d["marques"]:
        if m.get("visuels"): m["visuels"] = [v for v in m["visuels"] if not v.get("source", "").endswith(nomf)]

# Trois campagnes inférées portaient l'identifiant du client pour nom.
RENOMMER = {
    "CMP-c-divers-institutionnel-2025": ("LMT Group — Institutionnel & plan marketing 2025", None),
    "CMP-c-upgraders-evenement-2026": ("KOF — Kamer Otaku Festival 2026", ["MQ-kof"]),
    "CMP-c-cadyst-evenement-2025": ("Cadyst Group — Séminaire, salon, événement 2025", ["MQ-cgroup"]),
}
for cid, (nom, mqs) in RENOMMER.items():
    c = C.get(cid)
    if not c or c["nom"] == nom: continue
    c.setdefault("historique", []).append({"quand": QUAND, "qui": PAR, "avant": {"nom": c["nom"], "marqueIds": c.get("marqueIds")},
                                           "motif": "Le nom portait l'identifiant du client ; repris du projet qu'elle tient."})
    c["nom"] = nom
    if mqs and not c.get("marqueIds"): c["marqueIds"] = mqs

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(bilan)
print("campagnes sans couverture :", [c["nom"] for c in d["campagnes"] if not c.get("couverture")])
