# renommer-projets-2026.py — des noms qui disent ce que c'est, sans doublon, avec la bonne image.
#
# Demande d'Alex (01/10/2026) : « renommer et déduire des projets — des noms confusants, ou au contraire
# très clairs qui devraient t'éclairer ; des doublons ; des mauvaises images de couverture ».
#
# Ce que le script fait, et qui ne perd rien :
#   — renomme chaque projet « Marque — objet (période) » à partir de son brief Radar, de sa preuve au
#     corpus et de ses livrables ; l'ancien nom va dans p.historiqueNoms ;
#   — corrige les marques mal rattachées (cinq marques sur trois dossiers « à qualifier », Cadyst Farming
#     qui portait Panzani et Delys, les Tontines rangées sous NSIA) ;
#   — fusionne les doublons : le dossier gardé reçoit tout (livrables, factures, relevés), le doublon garde
#     sa fiche, marquée p.fusionne = {dans, motif} et masquée des listes ;
#   — annule les livrables en double (XC-040 portait les cahiers BTS de FRC-058) ;
#   — retire les couvertures fausses (KV d'une autre année, montage partagé par plusieurs clients, pack
#     « à qualifier »), gardées dans couverturesRetirees ; n'affiche aucune photo de personne privée.
#
# Usage : python3 outils/renommer-projets-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, os, datetime, subprocess, re, unicodedata

SRC, DST = sys.argv[1], sys.argv[2]
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
MOTIF = "Nom déduit du brief Radar, de la preuve au corpus et des livrables (demande d'Alex, 01/10/2026)."
HOME = os.path.expanduser("~")

d = json.load(open(SRC))
P = {p["id"]: p for p in d["projets"]}
C = {c["id"]: c for c in d["campagnes"]}
J = d.setdefault("journal", [])
bilan = {"renommes": 0, "marques": 0, "fusions": 0, "livrables": 0, "couvertures": 0, "campagnes": 0}

NOMS = {
    "PRJ-MM": "Mamy Makala — ouverture de dossier 2026",
    "PRJ-LVQR-CM": "La Vache qui rit — film vertical Cameroun « Le geste du frigo »",
    "PRJ-XC-001": "Bonnet Rouge — plateforme « Le combat d'une vie » 2026-2027 (Côte d'Ivoire)",
    "PRJ-XC-002": "Bonnet Rouge — « Ma rentrée, mon combat » : présentation et axes BTS 2026 (Cameroun)",
    "PRJ-XC-003": "Bonnet Rouge — Back to School 2025 multi-pays (exés Côte d'Ivoire, Congo/RDC)",
    "PRJ-XC-004": "Bonnet Rouge — Ramadan 2026",
    "PRJ-XC-005": "Bonnet Rouge — Monopoly et jeu de 52 cartes (2025)",
    "PRJ-XC-006": "Bonnet Rouge — « Bien dans son corps, bien dans sa tête » (2025-2026)",
    "PRJ-XC-007": "Bonnet Rouge IMP — campagne enfants BNBG, sachet 15 g (Côte d'Ivoire, 2025)",
    "PRJ-XC-008": "Bonnet Rouge Délice — campagne de lancement (2025-2026)",
    "PRJ-XC-009": "Bonnet Rouge — casting et shooting talents (août 2025)",
    "PRJ-XC-010": "Bonnet Rouge — Goodness of Dairy, Q2 2026",
    "PRJ-XC-011": "Bonnet Rouge — branding et recrutement distributeurs (2026)",
    "PRJ-XC-012": "Bonnet Rouge — Journée mondiale du lait (2025-2026)",
    "PRJ-XC-013": "Bonnet Rouge — Noël et fin d'année 2025",
    "PRJ-XC-014": "Bonnet Rouge — Pâques et Carême 2026",
    "PRJ-XC-015": "Bonnet Rouge EVAP — Saison des bouillies, acte 2",
    "PRJ-XC-016": "Bonnet Rouge Gabon — PLV et affichage (2025-2026)",
    "PRJ-XC-017": "Bonnet Rouge Côte d'Ivoire — stickers et autocollants (2026)",
    "PRJ-XC-018": "Bonnet Rouge — cahiers BTS 2026 (Cameroun)",
    "PRJ-XC-019": "Bonnet Rouge — atelier de cuisine, jeu-concours (2025)",
    "PRJ-XC-020": "Bonnet Rouge — CAN et football (2025)",
    "PRJ-XC-021": "Bonnet Rouge — COWLAB, événement marketing (2025)",
    "PRJ-XC-022": "Peak — Ramadan 2026, Somaliland",
    "PRJ-XC-023": "Peak — Back to School 2025, pilote FR/EN",
    "PRJ-XC-024": "Peak — branding de camions (2026)",
    "PRJ-XC-025": "Peak Bénin — affichage 40×60 (2025)",
    "PRJ-XC-026": "Peak — thematic campaign révisée (2025)",
    "PRJ-XC-027": "Peak — promotions et Noël 2025",
    "PRJ-XC-028": "Belle Hollandaise — têtes de gondole Congo et RDC (2025-2026)",
    "PRJ-XC-029": "Belle Hollandaise — Pâques 2026",
    "PRJ-XC-030": "Belle Hollandaise — UHT (2025)",
    "PRJ-XC-031": "Belle Hollandaise — boîtes de fin d'année (2025)",
    "PRJ-XC-032": "Belle Hollandaise — visuel Maldives (2026)",
    "PRJ-XC-033": "Rainbow — Ramadan 2025",
    "PRJ-XC-034": "Rainbow — brief ESA, Kenya et Afrique du Sud (2026)",
    "PRJ-XC-035": "Rainbow — packs 32/63 et 3D anglais (2025)",
    "PRJ-XC-036": "Nunu — marque citée au bilan annuel (matière à retrouver)",
    "PRJ-XC-037": "Belle Fromagerie — à qualifier (fichiers du Bureau iCloud, 2025)",
    "PRJ-XC-038": "Belles Tomates — à qualifier (fichier du Bureau iCloud, 2025)",
    "PRJ-XC-039": "Omela — déclinaisons (2025)",
    "PRJ-XC-040": "FrieslandCampina — chartes et brand propellers Peak, Bonnet Rouge, Belle Hollandaise, naming SKU",
    "PRJ-XC-041": "FrieslandCampina — branding interne : bâche entrepôt, posters bureau (2025-2026)",
    "PRJ-XC-042": "FrieslandCampina — packshots produits : sleeves, EVAP, UHT, pouches (Gabon, Côte d'Ivoire)",
    "PRJ-XC-043": "La Pasta — lancement Gold Premium et First 20 ans (2025-2026)",
    "PRJ-XC-044": "La Pasta — Journée mondiale des pâtes et carnet de recettes (2025)",
    "PRJ-XC-045": "La Pasta — Box Experience (2025-2026)",
    "PRJ-XC-046": "La Pasta — plan marketing (avril 2025)",
    "PRJ-XC-047": "La Pasta Gold — campagne de Pâques (2025)",
    "PRJ-XC-048": "La Pasta First — Back to School 2026 « Maman est la première à croire en moi »",
    "PRJ-XC-049": "La Pasta — bannière Facebook et planning (2025-2026)",
    "PRJ-XC-050": "Cadyst Grain — farine Centrafrique : SONA, puis FUKU (2026)",
    "PRJ-XC-051": "Cadyst Grain — « Les héros de la farine » (2025-2026)",
    "PRJ-XC-052": "Cadyst Grain — animatique nouvelle farine (2025)",
    "PRJ-XC-053": "Cadyst Grain — plans pub trimestriels (2025)",
    "PRJ-XC-054": "Cadyst Grain — Noël et jeux (2025)",
    "PRJ-XC-055": "Cadyst Farming — branding et packaging Robuste (2025-2026)",
    "PRJ-XC-056": "Panzani — plateforme First normalisée (2026)",
    "PRJ-XC-057": "Panzani — Fête des mères (2025)",
    "PRJ-XC-058": "Panzani — catalogue produits (2025)",
    "PRJ-XC-059": "Delys & Barka — Fête des mères et des pères (2025)",
    "PRJ-XC-060": "Delys & Barka — Noël (2025)",
    "PRJ-XC-061": "Amigo — refonte et mascottes (2025-2026)",
    "PRJ-XC-062": "Amigo — jeux et activations (2025)",
    "PRJ-XC-063": "Cadyst Group — plan pub d'octobre 2025 (Octobre Rose, enseignants, prévention)",
    "PRJ-XC-064": "Cadyst Group — kit séminaire 2025",
    "PRJ-XC-065": "Cadyst Group — PRD, shooting produit (2025)",
    "PRJ-XC-066": "Delifood — shooting Belles Tomates et Belles Graines « Nos recettes, notre fierté » (2026)",
    "PRJ-XC-067": "Cadyst Group — Back to School 2025 (kakémono, activation)",
    "PRJ-XC-068": "Tradex — 25 ans (2025)",
    "PRJ-XC-069": "Tradex — jeu-concours « la roue » (2025)",
    "PRJ-XC-070": "Tradex — OOH bilingue FR/EN (2025)",
    "PRJ-XC-071": "Tradex — campagne bouteilles de gaz, pilotage (mars-avril 2025)",
    "PRJ-XC-072": "Tradex — planning de publication (mai-juin 2025)",
    "PRJ-XC-073": "Tradex — Back to School 2025",
    "PRJ-XC-074": "Tradex — lubrifiants LSV et 2T JASO (2025)",
    "PRJ-XC-075": "NSIA Tontines — système éditorial (2026)",
    "PRJ-XC-076": "NSIA Tontines — campagne OOH 4×3 et spot 45 s (2026)",
    "PRJ-XC-077": "NSIA Voyages — campagne 2026, BAT FR et EN",
    "PRJ-XC-078": "NSIA — plan de communication juin-août 2026 (Auto, Tontines, Assur'info)",
    "PRJ-XC-079": "NSIA Tontines — reco stratégique V2 (2026)",
    "PRJ-XC-080": "NSIA Tontines — brief de production (2026)",
    "PRJ-XC-081": "NSIA Tontines — goodies (2026)",
    "PRJ-XC-082": "NSIA Tontines — certificat (2026)",
    "PRJ-XC-083": "Ecobank — 40 ans, adaptation Centrafrique (2025)",
    "PRJ-XC-084": "Ecobank — CRESCO, crédit scolaire Back to School 2026 (Bénin)",
    "PRJ-XC-085": "Ecobank Centrafrique — plan pub et nouvelle campagne (2025-2026)",
    "PRJ-XC-086": "Ecobank — carte prépayée, campagne digitale (2025)",
    "PRJ-XC-087": "Ecobank — institutionnel et communiqués (2025-2026)",
    "PRJ-XC-088": "Ecobank — temps forts : Back to School, Noël, Ramadan, promotions (2025-2026)",
    "PRJ-XC-089": "La Vache qui rit — FOR GOOD, pack régional WACA (2025-2026)",
    "PRJ-XC-090": "La Vache qui rit Sénégal — PLV retail (2025-2026)",
    "PRJ-XC-091": "La Vache qui rit — Back to School Cameroun (2025-2026)",
    "PRJ-XC-092": "La Vache qui rit — campagne de déstockage (2025)",
    "PRJ-XC-093": "La Vache qui rit — affichage 40×60 (2026)",
    "PRJ-XC-094": "La Vache qui rit — goodies : casquettes, tote bags, t-shirts (2025-2026)",
    "PRJ-XC-095": "Phosphatine — 12 boîtes, KV multi-marchés (2025)",
    "PRJ-XC-096": "Phosphatine — sponsoring Canal+ (2025)",
    "PRJ-XC-097": "Phosphatine — boîte à images IDA X Brands (2025)",
    "PRJ-XC-098": "Phosphatine — promotion (2025)",
    "PRJ-XC-099": "Phosphatine — key visual UpCountry (2025)",
    "PRJ-XC-100": "Phosphatine — Fête des mères (2025)",
    "PRJ-XC-101": "Phosphatine — PLV et chevalet HCP (2025)",
    "PRJ-XC-102": "Phosphatine — Maison Phosphatine (2025)",
    "PRJ-XC-103": "PRESYNAT — campagne social 360 et supports (2025)",
    "PRJ-XC-104": "MACI 2025 (Cadyst) — prise de parole, quotes hebdo, anti-fraude, quiz",
    "PRJ-XC-105": "LMT Group — plan marketing stratégique 360 (2025)",
    "PRJ-XC-106": "Prudential — cité au bilan annuel (matière à retrouver)",
    "PRJ-XC-107": "Frutas — campagne, plans cinématiques (2026)",
    "PRJ-XC-108": "Cap Esterias — recommandations digital, vidéo, packaging (2026)",
    "PRJ-XC-109": "Mamy Makala — « Star du quartier », campagne de marque (2026)",
    "PRJ-XC-110": "Grand Marché de Lomé et Togo Marché — branding (2026)",
    "PRJ-XC-111": "BAMS & BTP — identité (2025)",
    "PRJ-XC-112": "Florida — propositions créatives (2025)",
    "PRJ-XC-113": "SunHouse — création de logo (2025)",
    "PRJ-XC-114": "Pearl — poster SCM 1 kg (2025)",
    "PRJ-XC-115": "SOFAVINC — trois campagnes vins : Vinosol, Cuvée du Roi, Baron de Madrid (2025)",
    "PRJ-XC-116": "H&C Executive Education — slogans, protocole de brief, charte (2023-2025)",
    "PRJ-XC-117": "Wafacash, Maritimo, Petvisidame, GUCE — courriers et chartes (2025)",
    "PRJ-XC-118": "Cimencam, Port de Kribi, LTA — traces (2025-2026)",
    "PRJ-XC-119": "Spawt — MVP application et activation Abidjan (2026)",
    "PRJ-XC-120": "KOF — Kamer Otaku Festival, édition 2025 et media kit 2026",
    "PRJ-XC-121": "MOTION19 — Black Friday 2025",
    "PRJ-XC-122": "Universal Music Africa — captation live Cysoul (2025-2026)",
    "PRJ-XC-123": "Dot Bites — brand book et plateforme (2025)",
    "PRJ-XC-124": "Akwa Palace — campagne vidéo (2025)",
    "PRJ-XC-125": "Villa Corso — naming, médaille et papeterie (2026)",
    "PRJ-XC-126": "Goodlocs — soins capillaires (2025)",
    "PRJ-XC-127": "Musina — festival Musina 9 et Noël (2025-2026)",
    "PRJ-XC-128": "BanaHealth — visuels et facilitation médicale (2024-2026)",
    "PRJ-XC-129": "Arc en Ciel Distribution — plan de relance marketing pharmacie (Côte d'Ivoire)",
    "PRJ-XC-130": "NYAMA — proposition (prospect non gagné)",
    "PRJ-XC-131": "Doual'art — shooting photo (2025)",
    "PRJ-XC-132": "Anatomy by Roida — identité de marque",
    "PRJ-XC-134": "Orange Cameroun via McCann — couvertures photo et vidéo (2025-2026)",
    "PRJ-XC-135": "For The Call — lot photo et vidéo, FR et EN (2025-2026)",
    "PRJ-XC-136": "AG Partners, Fairmed, Ready Party — couvertures, stylisme et documentaires (2025-2026)",
    "PRJ-XC-137": "KossKoss Select — shooting et système de contenu (2025-2026)",
    "PRJ-XC-138": "PEN&GRACE — shooting prénuptial (2025)",
    "PRJ-XC-140": "Friends Studio — pilotage : briefs, production, bilans (2025-2026)",
}
for pid, nom in NOMS.items():
    p = P.get(pid)
    if not p or p["nom"] == nom: continue
    p.setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": p["nom"], "motif": MOTIF})
    p["nom"] = nom; bilan["renommes"] += 1
# La référence de XC-040 était celle de FRC-058, rattaché par erreur : elle reprend la sienne.
if P.get("PRJ-XC-040") and P["PRJ-XC-040"].get("ref") == "FRC-058":
    P["PRJ-XC-040"].setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": "ref FRC-058", "motif": "FRC-058 a son propre dossier (PRJ-FRC-058)."})
    P["PRJ-XC-040"]["ref"] = "XC-040"

# ————————————————— Les marques mal rattachées —————————————————

MARQUES = {
    "PRJ-XC-036": ["MQ-nunu"], "PRJ-XC-037": ["MQ-bfromagerie"], "PRJ-XC-038": ["MQ-btomate"],
    "PRJ-XC-055": ["MQ-cfarming"], "PRJ-XC-050": ["MQ-cgrain", "MQ-fuku"],
    "PRJ-XC-040": ["MQ-peak", "MQ-br", "MQ-bh"], "PRJ-XC-041": ["MQ-fc"], "PRJ-XC-042": ["MQ-fc"],
    "PRJ-XC-064": ["MQ-cgroup"], "PRJ-XC-065": ["MQ-cgroup"], "PRJ-XC-066": ["MQ-btomate", "MQ-bgraines"],
    "PRJ-XC-075": ["MQ-nsia-tontines"], "PRJ-XC-076": ["MQ-nsia-tontines"], "PRJ-XC-079": ["MQ-nsia-tontines"],
    "PRJ-XC-080": ["MQ-nsia-tontines"], "PRJ-XC-081": ["MQ-nsia-tontines"], "PRJ-XC-082": ["MQ-nsia-tontines"],
    "PRJ-XC-077": ["MQ-nsia-voyages"], "PRJ-XC-078": ["MQ-nsia", "MQ-nsia-auto", "MQ-nsia-tontines"],
    "PRJ-XC-104": ["MQ-maci"], "PRJ-XC-120": ["MQ-kof"], "PRJ-XC-134": ["MQ-orange"],
    "PRJ-XC-135": ["MQ-forthecall"], "PRJ-XC-138": ["MQ-penetgrace"],
}
MID = {m["id"] for m in d["marques"]}
for pid, mqs in MARQUES.items():
    p = P.get(pid)
    if not p: continue
    mqs = [m for m in mqs if m in MID]
    i = p["sections"].setdefault("identite", {})
    if i.get("marqueIds") == mqs: continue
    p.setdefault("historiqueNoms", []).append({"quand": QUAND, "avant": "marques " + ", ".join(i.get("marqueIds") or []) , "motif": "Marques corrigées à la lecture du dossier."})
    i["marqueIds"] = mqs; bilan["marques"] += 1

# ————————————————— Les doublons —————————————————

FUSIONS = [
    ("PRJ-XC-139", "PRJ-XC-131", "Même shooting Doual'art : deux lignes du document de campagnes pour une seule opération photo."),
    ("PRJ-XC-133", "PRJ-XC-138", "Même shooting prénuptial PEN&GRACE, compté une fois en « nom propre », une fois chez Friends Studio."),
]
for dup, garde, motif in FUSIONS:
    a, b = P.get(dup), P.get(garde)
    if not a or not b or a.get("fusionne"): continue
    for cle in ("livrables", "factures"):
        b[cle] = (b.get(cle) or []) + [x for x in (a.get(cle) or []) if x not in (b.get(cle) or [])]
    rb = b.setdefault("releve", {}); ra = a.get("releve") or {}
    rb.setdefault("fusionnes", []).append({"projet": dup, "ref": a.get("ref"), "nom": a["nom"], "releve": ra, "quand": QUAND})
    if not b.get("vignette") and a.get("vignette"): b["vignette"] = a["vignette"]
    a["fusionne"] = {"dans": garde, "quand": QUAND, "motif": motif}
    for f in d.get("factures", []):
        if f.get("projetId") == dup: f["projetId"] = garde
    J.append({"quand": QUAND, "qui": PAR, "action": "doublon fusionné", "type": "projets", "id": dup, "detail": "→ " + garde + " — " + motif})
    bilan["fusions"] += 1

# Les cahiers BTS multi-pays vivent dans FRC-058 ; XC-040 les portait aussi.
x40 = P.get("PRJ-XC-040")
if x40:
    for l in x40.get("livrables", []):
        if "cahiers" in (l.get("nom") or "").lower() and not l.get("annule"):
            l["annule"] = {"quand": QUAND, "motif": "Doublon : la même tâche Radar FRC-058 est un livrable de PRJ-FRC-058."}
            bilan["livrables"] += 1

# Delifood : le devis Friends « Nos recettes, notre fierté » est le shooting que Matanga a briefé.
x66 = P.get("PRJ-XC-066")
if x66:
    ds = [f["id"] for f in d.get("factures", []) if (f.get("client") or "").startswith("Delifoods")]
    if ds:
        x66["factures"] = sorted(set((x66.get("factures") or []) + ds))
        for f in d["factures"]:
            if f["id"] in ds: f["projetId"] = "PRJ-XC-066"
        x66["sousTraitance"] = {"structure": "friends", "motif": "Devis Friends Photography Studio (FP-2026-0731/0803) pour la production photo et vidéo des 12 recettes — le brief fournisseur de ce dossier."}

# ————————————————— Les couvertures —————————————————

def retirer_couverture(c, motif):
    cv = c.get("couverture")
    if not cv: return
    c.setdefault("couverturesRetirees", []).append(dict(cv, retiree_le=QUAND, motif_retrait=motif))
    del c["couverture"]; bilan["couvertures"] += 1

retirer_couverture(C["CMP-fc-evap-eoy-2026"], "C'était le KV Noël 2025 de Bonnet Rouge : l'End of Year 2026 n'a pas encore de KV.")
retirer_couverture(C["CMP-mq-br-jeu-2025"], "KV « Jeux & activations » 2026 : pas celui des jeux 2025.")
retirer_couverture(C["CMP-mq-lvqr-rentree-2026"], "KV « Offrez-leur le meilleur » du Back to School 2025 : pas celui de 2026.")

def renommer_cmp(cid, nom, motif, **champs):
    c = C.get(cid)
    if not c or c["nom"] == nom: return
    c.setdefault("historique", []).append({"quand": QUAND, "qui": PAR, "avant": {"nom": c["nom"], **{k: c.get(k) for k in champs}}, "motif": motif})
    c["nom"] = nom; c.update(champs); bilan["campagnes"] += 1
    if c.get("couverture"): c["couverture"]["motif"] = c["couverture"]["motif"].replace(" (année voisine de la campagne)", "")

renommer_cmp("CMP-mq-peak-ramadan-2025", "Peak — Ramadan & Aïd 2026", "Les livrables sont les KV Ramadan 2026 (« KV26 ») : la campagne était datée 2025 à tort.")
renommer_cmp("CMP-mq-eco-noel-2026", "Ecobank — Noël & fin d'année 2025", "Noël 2026 n'a pas encore eu lieu ; le master au corpus est celui de Noël 2025.")
renommer_cmp("CMP-mq-cgroup-fete-2025", "Cadyst Group — plan pub d'octobre 2025 (Octobre Rose)", "Le dossier qu'elle tient est le plan pub d'octobre : Octobre Rose, enseignants, prévention.")

# Des couvertures de projet posées explicitement, et celles qu'on retire.
def sips(src, dst, taille, fmt="jpeg"):
    if os.path.exists(dst): return True
    a = ["sips", "-Z", str(taille), "-s", "format", fmt] + (["-s", "formatOptions", "78"] if fmt == "jpeg" else []) + [src, "--out", dst]
    return subprocess.run(a, capture_output=True).returncode == 0 and os.path.exists(dst)

def couvrir(pid, vignette, typ, motif):
    p = P.get(pid)
    if not p: return
    if p.get("couverture"): p.setdefault("couverturesRetirees", []).append(dict(p["couverture"], retiree_le=QUAND))
    p["couverture"] = {"type": typ, "vignette": vignette, "motif": motif, "pose_le": QUAND, "par": PAR}
    bilan["couvertures"] += 1

def sans_image(pid, motif):
    """Retire une illustration fausse ou une photo privée : la carte n'affichera rien plutôt que faux."""
    p = P.get(pid)
    if not p: return
    if p.get("vignette"):
        p.setdefault("couverturesRetirees", []).append({"vignette": p["vignette"], "retiree_le": QUAND, "motif_retrait": motif})
        del p["vignette"]
    p["couverture"] = {"type": "aucune", "motif": motif, "pose_le": QUAND, "par": PAR}
    bilan["couvertures"] += 1

DOS = HOME + "/Downloads/Work 2026/02 VENTURES & MARQUES PROPRES/CLIENTS UPGRADERS/"
DESK = HOME + "/Library/Mobile Documents/com~apple~CloudDocs/Desktop/02 VENTURES & MARQUES PROPRES/"
OUT = "assets/review/couvertures/"
src = DOS + "Anatomy by Roida/07 MASTERS & DÉCLINAISONS/Fichier 8Anatobrand-black@4x.png"
if os.path.exists(src) and sips(src, os.path.join(APP, OUT + "anatomy-by-roida.png"), 900, "png"):
    couvrir("PRJ-XC-132", OUT + "anatomy-by-roida.png", "logo", "Logo Anatomy by Roida (dossier CLIENTS UPGRADERS).")
src = DESK + "Xtincell/Doual'art — shooting photo/doualart low/IMG_9959.jpg"
if os.path.exists(src) and sips(src, os.path.join(APP, OUT + "doualart-shooting.jpg"), 1300):
    couvrir("PRJ-XC-131", OUT + "doualart-shooting.jpg", "kv", "Une photo du shooting Doual'art (export basse définition).")
sans_image("PRJ-XC-130", "Le montage « Cimencam · Port de Kribi · LTA · Musina · NYAMA · Dr Ikito » est un relevé Matanga mêlant six comptes : il n'est pas l'image de NYAMA.")
sans_image("PRJ-XC-138", "Commande privée : aucune photo de personne au dépôt, lisible en ligne. Le montage partagé avec BanaHealth n'était pas la sienne.")
sans_image("PRJ-XC-133", "Fusionné dans XC-138 ; commande privée.")
sans_image("PRJ-OP-particuliers", "Commandes privées : aucune photo de personne au dépôt.")
sans_image("PRJ-OP-ikito", "Suite mémorielle d'une personne : rien d'intime au dépôt.")
mm = P.get("PRJ-XC-109")
if mm and mm.get("vignette"):
    couvrir("PRJ-MM", mm["vignette"], "illustration", "Illustration « Star du quartier » de Mamy Makala — le pack « à qualifier » affiché avant venait de Bonnet Rouge.")
c43 = C.get("CMP-mq-lapasta-lancement-2026")
if c43 and c43.get("couverture"):
    couvrir("PRJ-PZ-FILMS", c43["couverture"]["vignette"], "kv", "KV du lancement La Pasta 2026 : les films d'emballage en sont la déclinaison packaging.")

# Ce que la planche des couvertures a montré de faux, regardé image par image (01/10/2026).
import hashlib, shutil
CORPUS = os.path.join(os.path.dirname(APP), "DOSSIER PROJETS — XTINCELL")
def vignette_corpus(rel):
    cle = hashlib.md5(rel.encode("utf-8")).hexdigest()
    src = os.path.join(CORPUS, ".generateur", "vignettes", cle + ".jpg")
    dst_rel = "assets/review/fonds/" + cle + ".jpg"
    if not os.path.exists(os.path.join(APP, dst_rel)):
        if os.path.exists(src): shutil.copyfile(src, os.path.join(APP, dst_rel))
        elif not sips(os.path.join(CORPUS, rel), os.path.join(APP, dst_rel), 520): return None
    return dst_rel

x83 = P.get("PRJ-XC-083"); illus_carte = x83.get("vignette") if x83 else None
v40 = vignette_corpus("03 KEY VISUALS PAR MARQUE/Ecobank/Institutionnel & communiqués/40 ecobank soutenez enfants.png")
if v40: couvrir("PRJ-XC-083", v40, "kv", "Visuel « 40 ans — soutenez les enfants » d'Ecobank ; l'illustration du corpus montrait la carte prépayée.")
if illus_carte: couvrir("PRJ-XC-086", illus_carte, "illustration", "Le visuel « La carte prépayée Ecobank, simplement » — rangé au corpus sous les 40 ans.")
vrca = vignette_corpus("03 KEY VISUALS PAR MARQUE/Ecobank/Hors temps fort/ecobank centraferique dssier new campaign 26.png")
if vrca: couvrir("PRJ-XC-085", vrca, "kv", "Le dossier « nouvelle campagne 2026 » d'Ecobank Centrafrique.")
cc = C.get("CMP-c-cadyst-rentree-2026")
if cc: retirer_couverture(cc, "Le fichier rangé « Cadyst Group — Back to School — 2025 » à l'index des masters est une affiche de conférence RH (indemnité de fin de carrière) : l'index est mal étiqueté.")
sans_image("PRJ-XC-067", "L'illustration du corpus montrait un kakémono Bonnet Rouge, et le master de l'index est une affiche RH : aucun visuel Back to School Cadyst au disque.")
cl = C.get("CMP-mq-lvqr-rentree-2026")
ret = [x for x in (cl or {}).get("couverturesRetirees", []) if x.get("vignette")]
if ret: couvrir("PRJ-XC-091", ret[-1]["vignette"], "kv", "KV « Offrez-leur le meilleur » (Back to School 2025) : le dossier couvre 2025 et le brief 2026.")
logo_fc = next((a["vignette"] for a in d["assets"] if a["id"] == "A-logo-fc"), None)
if logo_fc: couvrir("PRJ-XC-042", logo_fc, "logo", "Logo FrieslandCampina ; l'illustration du corpus montrait un maillot de football.")
rb = [s_["vignette"] for s_ in d["sku"] if s_.get("marque") == "MQ-rainbow" and s_.get("vignette")][:4]
if rb:
    P["PRJ-XC-034"]["couverture"] = {"type": "mosaique", "images": rb, "motif": "Les packs Rainbow 170 g et 5 kg : l'illustration du corpus était celle du Ramadan 2025.", "pose_le": QUAND, "par": PAR}
lp = C.get("CMP-mq-lapasta-lancement-2026")
if lp and lp.get("couverture"):
    for pid in ("PRJ-XC-046", "PRJ-XC-047", "PRJ-XC-048"):
        couvrir(pid, lp["couverture"]["vignette"], "logo", "Logo La Pasta : aucun visuel de ce dossier au disque (le fonds montrait des tricycles de livraison).")
sans_image("PRJ-XC-115", "L'illustration du corpus montrait les étiquettes de la mayonnaise AVA (SOFAVIN Gabon), pas les vins de SOFAVINC.")
sans_image("PRJ-XC-118", "L'illustration montrait la billetterie de Musina, un dossier UPgraders.")
sans_image("PRJ-XC-037", "L'illustration montrait des t-shirts La Vache qui rit, pas Belle Fromagerie.")
sans_image("PRJ-OP-akwa-resto", "Le fonds d'Akwa Palace montre une chambre : ce n'est pas la commande « photos du restaurant ».")

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(bilan)
