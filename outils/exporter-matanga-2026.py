# exporter-matanga-2026.py — le travail fait pour Matanga, rangé par marque puis par campagne, prêt à exporter.
#
# Demande d'Alex (06/10/2026) : « fais du neuf, je veux faciliter l'exportation du travail de Matanga » —
# les fichiers DÉPLACÉS (pas copiés) dans une arborescence neuve :
#
#   MATANGA — EXPORT DU TRAVAIL/
#     LISEZ-MOI.md · INDEX.md · _MANIFESTE-DEPLACEMENTS.csv · _ANNULER-LES-DEPLACEMENTS.command
#     <Groupe>/                           FrieslandCampina, Cadyst Group, NSIA, Ecobank…
#       GROUPE.md
#       <Marque>/[<Sous-marque>/]         La Pasta/Gold — l'architecture de marque de LA BARRE
#         MARQUE.md                       la plateforme de marque, telle que LA BARRE la tient
#         Campagnes ponctuelles/<AAAA> — <campagne>/   CAMPAGNE.md, un PROJET-<réf>.md par projet, les fichiers
#         Le long de l'année/<AAAA>/                   le fil de l'année : même contenu
#         _Identité de marque/  _Packaging & étiquettes/   ce qui n'appartient à aucune année
#     _Autres comptes/<porteur>/…         les comptes sans marque au dépôt
#
# Sources déplacées : « Work 2026/01 MARQUES CLIENTS » (les comptes gérés par Matanga) et, dans Téléchargements,
# les dossiers reçus des projets Matanga que LA BARRE cite. Ne bougent pas : 00 Matanga Agency (l'agence elle-même),
# les ventures et clients UPgraders / Friends Studio, Beignet Paradise, les copies (_TOUS LES KV, _MASTERS DE CAMPAGNE,
# le corpus « DOSSIER PROJETS — XTINCELL »).
#
# Rangement d'un fichier : sa marque (le dossier marque du disque), son occasion (le dossier d'opération, ou un mot
# du chemin : ramadan, noël, back to school…) et sa date (mtime) donnent la campagne LA BARRE de cette marque, cette
# occasion, cette année. Sans campagne au dépôt, le fichier va au fil de l'année de sa date, et le .md le dit :
# « pas au dépôt » ne veut pas dire « pas fait ».
#
# Usage :
#   python3 outils/exporter-matanga-2026.py plan     <depot.json> <plan.csv> <rapport.md>   # rien ne bouge
#   python3 outils/exporter-matanga-2026.py executer <depot.json> <plan.csv>                # déplace, écrit les .md
#   python3 outils/exporter-matanga-2026.py chemins  <depot.json> <depot-sortie.json>       # réécrit les chemins du dépôt

import json, sys, os, re, csv, datetime, unicodedata, shutil, collections

HOME = os.path.expanduser("~")
DL = os.path.join(HOME, "Downloads")
WORK = os.path.join(DL, "Work 2026")
SRC_MARQUES = os.path.join(WORK, "01 MARQUES CLIENTS")
RACINE = os.path.join(DL, "MATANGA — EXPORT DU TRAVAIL")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIF = os.path.join(RACINE, "_MANIFESTE-DEPLACEMENTS.csv")

MODE = sys.argv[1]
d = json.load(open(sys.argv[2]))
M = {m["id"]: m for m in d["marques"]}
C = {c["id"]: c for c in d["clients"]}
CAMP = {c["id"]: c for c in d["campagnes"]}
P = [p for p in d["projets"] if not p.get("fusionne")]

def norme(t): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9&]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower())).strip()
def propre(t): return re.sub(r'[/:\\]+', "-", t).strip().rstrip(".")

# ————————————————— Le périmètre : les projets Matanga —————————————————
EXCLUS_MARQUES = {"MQ-bp"}   # Beignet Paradise : une marque propre d'Alex, pas un compte de l'agence
def de_matanga(p):
    i = (p.get("sections") or {}).get("identite") or {}
    return (p.get("structure") or "matanga") == "matanga" and not (set(i.get("marqueIds") or []) & EXCLUS_MARQUES)
PM = [p for p in P if de_matanga(p)]
PAR_CAMP = collections.defaultdict(list)
for p in PM:
    if p.get("campagneId") in CAMP: PAR_CAMP[p["campagneId"]].append(p)
CM = {cid: CAMP[cid] for cid in PAR_CAMP}

def an_de(c):
    a = re.findall(r"20[12]\d", c["nom"])
    if a: return a[-1]
    f = c.get("fenetre") or {}
    return (f.get("debut") or f.get("fin") or c.get("cree_le") or "2026")[:4]

# ————————————————— L'architecture : groupe / marque / sous-marque —————————————————
GROUPES = {"FrieslandCampina WAMEA": "FrieslandCampina", "Panzani Cameroun": "Cadyst Group", "NSIA Assurances": "NSIA",
           "TRADEX SA": "Tradex", "Danone / IDA X Brands": "Phosphatine", "Sofavin / Cap Esterias": "Cap Esterias",
           "AFISA Food Industry SA": "Mamy Makala", "Delifood Agro Industry": "Delifood", "Bel": "Bel"}
def groupe_de(mid):
    m = M[mid]
    cn = (C.get(m.get("clientId")) or {}).get("nom") or m["nom"]
    return GROUPES.get(cn, cn)
def chemin_marque(mid):
    m = M[mid]; g = groupe_de(mid)
    chaine = []; x = m
    while x and x["id"] not in [c["id"] for c in chaine]:
        chaine.insert(0, x); x = M.get(x.get("mere"))
    noms = [propre(y["nom"]) for y in chaine]
    if noms and noms[0] == propre(g): noms = noms[1:]
    return os.path.join(propre(g), *noms) if noms else propre(g)

def porteur(c):
    b = c["nom"].split(" — ")
    return b[0] if len(b) > 1 else c["nom"]
def chemin_campagne(c):
    mq = (c.get("marqueIds") or [None])[0]
    base = chemin_marque(mq) if mq in M else os.path.join("_Autres comptes", propre(porteur(c)))
    an = an_de(c)
    if c.get("regime") == "always-on":
        return os.path.join(base, "Le long de l'année", an)
    titre = c["nom"].split(" — ", 1)[1] if " — " in c["nom"] else c["nom"]
    titre = re.sub(r"\s*20[12]\d\s*$", "", re.sub(r" · (UPgraders|Friends Studio)$", "", titre)).strip() or c["nom"]
    return os.path.join(base, "Campagnes ponctuelles", propre(an + " — " + titre))

# ————————————————— Les dossiers marque du disque —————————————————
DISQUE = {  # dossier relatif à 01 MARQUES CLIENTS → (marque LA BARRE, ou chemin d'export si la marque n'est pas au dépôt)
  "BAMS & BTP": (None, "_Autres comptes/BAMS & BTP"), "Cap Esterias": ("MQ-capesterias", None),
  "Cimencam": (None, "_Autres comptes/Cimencam, Port de Kribi, LTA"), "LTA": (None, "_Autres comptes/Cimencam, Port de Kribi, LTA"),
  "Ecobank": ("MQ-eco", None), "Frutas": ("MQ-frutas", None), "La Vache qui rit (Bel)": ("MQ-lvqr", None),
  "PRESYNAT": ("MQ-presynat", None), "Phosphatine": ("MQ-phosphatine", None), "Port Autonome de Kribi": ("MQ-pak", None),
  "Tradex": ("MQ-tradex", None),
  "Cadyst Group/Amigo": ("MQ-amigo", None), "Cadyst Group/Cadyst Farming": ("MQ-cfarming", None),
  "Cadyst Group/Cadyst Grain": ("MQ-cgrain", None), "Cadyst Group/Delys & Barka": ("MQ-pz-delys", None),
  "Cadyst Group/La Pasta": ("MQ-lapasta", None), "Cadyst Group/Panzani": ("MQ-panzani", None),
  "Cadyst Group/Robuste": (None, "Cadyst Group/Robuste"), "Cadyst Group/_Groupe (multi-marques)": ("MQ-cgroup", None),
  "FrieslandCampina/Belle Hollandaise": ("MQ-bh", None), "FrieslandCampina/Bonnet Rouge": ("MQ-br", None),
  "FrieslandCampina/Milk Bar": (None, "FrieslandCampina/Milk Bar"), "FrieslandCampina/Omela": ("MQ-omela", None),
  "FrieslandCampina/Peak": ("MQ-peak", None), "FrieslandCampina/Rainbow": ("MQ-rainbow", None),
  "FrieslandCampina/_Groupe (multi-marques)": ("MQ-fc", None),
  "NSIA/NSIA Auto": ("MQ-nsia-auto", None), "NSIA/NSIA Tontines": ("MQ-nsia-tontines", None),
  "NSIA/NSIA Voyages": ("MQ-nsia-voyages", None), "NSIA/NSIA-BGFI": (None, "NSIA/NSIA-BGFI"),
  "NSIA/_Groupe (multi-marques)": ("MQ-nsia", None),
}
OCC_DOSSIER = {"hors temps fort": "continu", "ramadan": "ramadan", "lancement & nouveau look": "lancement",
  "back to school": "rentree", "noel & fin d annee": "noel", "seminaire cadyst 2025": "evenement",
  "cowlab evenement marketing": "evenement", "institutionnel & communiques": "institutionnel", "jeux & activations": "jeu",
  "atelier de cuisine jeu concours": "jeu", "promotions": "promo", "paques & careme": "paques",
  "fete des meres & des peres": "fete", "journee mondiale du lait": "fete", "can & football": "evenement",
  "saison des pluies": "continu", "casting & shooting talents aout 2025": "continu", "poster congo & rdc": "continu",
  "tontines ooh 4x3": "continu", "campagne bat fr & en": "continu", "bien dans son corps bien dans sa tete": None}
OCC_MOTS = [("noel", r"\bnoel\b|fin d annee|\beoy\b|end of year|christmas"), ("ramadan", r"ramadan|\baid\b|iftar"),
            ("paques", r"paques|careme|easter"), ("rentree", r"back to school|\bbts\b|rentree|cahier"),
            ("fete", r"fete des meres|fete des peres|journee mondiale|mother s day|father s day"),
            ("promo", r"\bpromo|destockage|black friday"), ("jeu", r"jeu concours|activation|tombola")]
TYPES = {"02 BRANDING & IDENTITÉ": "_Identité de marque", "05 PACKAGING & ÉTIQUETTES": "_Packaging & étiquettes"}
TYPES_ANNEE = {"03 DIGITAL & SOCIAL": "Digital & social", "04 VIDÉO & SPOTS": "Vidéo & spots",
               "06 BRIEFS & STRATÉGIE": "Briefs & stratégie", "07 MASTERS & DÉCLINAISONS": "Masters & déclinaisons"}

def campagnes_de_marque(mid, chemin_virtuel):
    if mid: return [c for c in CM.values() if mid in (c.get("marqueIds") or [])]
    cle = os.path.basename(chemin_virtuel)
    return [c for c in CM.values() if not c.get("marqueIds") and propre(porteur(c)) == cle]

FIN_OCC = {"ramadan": {2024: "04-09", 2025: "03-30", 2026: "03-19", 2027: "03-09"},
           "paques": {2024: "03-31", 2025: "04-21", 2026: "04-06", 2027: "03-29"}, "rentree": "10-15"}
def annee_fichier(ts, occ, chemin=""):
    """L'année de la campagne qu'un fichier sert : celle que son nom écrit, sinon sa date — et un fichier préparé
    après le temps fort d'une année sert celui de l'année suivante (Ramadan 2026 se prépare en décembre 2025)."""
    ans = re.findall(r"(?<!\d)(20[12]\d)(?!\d)", chemin)
    if ans: return ans[-1]
    t = datetime.datetime.fromtimestamp(ts)
    if occ == "noel": return str(t.year - 1) if t.month <= 2 else str(t.year)
    fin = FIN_OCC.get(occ)
    if fin:
        md = fin if isinstance(fin, str) else fin.get(t.year)
        # Un mois de grâce : les reprises et l'Aïd suivent la fin du temps fort.
        if md and t > datetime.datetime.strptime(f"{t.year}-{md}", "%Y-%m-%d") + datetime.timedelta(days=30): return str(t.year + 1)
    return str(t.year)

def choisir(cands, occ, an):
    xs = [c for c in cands if (c.get("occasion") or "continu") == occ and an_de(c) == an]
    return xs[0] if xs else None

def projet_par_nom(mid, nom):
    """Un dossier d'opération nommé (« Bien dans son corps… », « COWLAB ») qui nomme un projet de la marque."""
    generiques = set(norme(" ".join([M[mid]["nom"], groupe_de(mid)] if mid else [])).split()) | {"campagne", "evenement", "marketing", "group", "groupe"}
    mots = [w for w in norme(nom).split() if len(w) >= 5 and w not in generiques and not w.isdigit()]
    if not mots: return None
    for p in PM:
        i = (p.get("sections") or {}).get("identite") or {}
        if mid and mid not in (i.get("marqueIds") or []) and not (mid == "MQ-cgroup" and i.get("clientId") == "C-cadyst"): continue
        n = norme(p["nom"])
        if sum(w in n for w in mots) >= max(1, (len(mots) + 1) // 2): return p
    return None

def dest_base_marque(mid, virt): return chemin_marque(mid) if mid else virt

def planifier():
    lignes = []
    for rel_marque, (mid, virt) in sorted(DISQUE.items()):
        src_m = os.path.join(SRC_MARQUES, rel_marque)
        if not os.path.isdir(src_m): continue
        autres = [k for k in DISQUE if k.startswith(rel_marque + "/")]
        cands = campagnes_de_marque(mid, virt)
        base = dest_base_marque(mid, virt)
        for dp, dn, fn in os.walk(src_m):
            relp = os.path.relpath(dp, src_m)
            if any(dp == os.path.join(SRC_MARQUES, a) or dp.startswith(os.path.join(SRC_MARQUES, a) + os.sep) for a in autres):
                continue
            parts = [] if relp == "." else relp.split(os.sep)
            for f in fn:
                if f.startswith(".") or f == "Icon\r": continue
                src = os.path.join(dp, f); st = os.stat(src)
                typ = re.sub(r" \(\d+\)$", "", parts[0]) if parts else ""
                reste = parts[1:] if parts else []
                camp, motif, sous = None, "", []
                if typ in TYPES:
                    dest = os.path.join(base, TYPES[typ], *reste, f); motif = "hors année : " + TYPES[typ]
                    lignes.append({"source": src, "destination": os.path.join(RACINE, dest), "campagne": "", "motif": motif, "taille": st.st_size}); continue
                if typ == "01 CAMPAGNES" and reste:
                    op = reste[0]; nop = norme(op); occ = OCC_DOSSIER.get(nop, "inconnu")
                    pr = projet_par_nom(mid, op) if occ in (None, "inconnu", "evenement") else None
                    if pr and pr.get("campagneId") in CM:
                        camp = CM[pr["campagneId"]]; motif = "le dossier « " + op + " » nomme " + pr["ref"]; sous = reste
                    else:
                        occ = occ if occ not in (None, "inconnu") else "continu"
                        an = annee_fichier(st.st_mtime, occ, " ".join(reste + [f]))
                        camp = choisir(cands, occ, an)
                        sous = (reste if occ == "continu" and nop != "hors temps fort" else reste[1:])
                        motif = ("occasion « " + op + " », " + an) if camp else ("« " + op + " » " + an + " : pas de campagne au dépôt")
                        if not camp and occ != "continu":
                            dest = os.path.join(base, "Campagnes ponctuelles", propre(an + " — " + op), *reste[1:], f)
                            lignes.append({"source": src, "destination": os.path.join(RACINE, dest), "campagne": "", "motif": motif + " → campagne pas au dépôt", "taille": st.st_size}); continue
                else:
                    chem = norme(" ".join(parts + [f])); occ = "continu"
                    for k, pat in OCC_MOTS:
                        if re.search(pat, chem): occ = k; break
                    an = annee_fichier(st.st_mtime, occ, " ".join(parts + [f]))
                    camp = choisir(cands, occ, an) if occ != "continu" else None
                    lib = TYPES_ANNEE.get(typ, typ) if typ else ""
                    sous = ([lib] if lib else []) + reste
                    if occ != "continu" and camp: motif = "le chemin dit « " + occ + " », " + an
                    else:
                        camp = choisir(cands, "continu", an); motif = (lib or "racine de la marque") + ", " + an
                if camp:
                    dest = os.path.join(chemin_campagne(camp), *sous, f)
                    lignes.append({"source": src, "destination": os.path.join(RACINE, dest), "campagne": camp["id"], "motif": motif, "taille": st.st_size})
                else:
                    an = annee_fichier(st.st_mtime, "continu")
                    dest = os.path.join(base, "Le long de l'année", an, *sous, f)
                    lignes.append({"source": src, "destination": os.path.join(RACINE, dest), "campagne": "", "motif": motif + " → fil de l'année pas au dépôt", "taille": st.st_size})
    # Les dossiers reçus des projets Matanga, cités par LA BARRE, restés à la racine de Téléchargements.
    RECUS = [("PRJ-PAK-2026", ["DIGITAL PAK 2026 by MATANGA.pdf", "RETROPLANNING PAK.pdf", "RSE STRAT.pdf"]),
             ("PRJ-LPG-SPOT", ["CHRONOGRAMME LA PASTA GOLD( DEFNITIF.xlsx", "FACURE PROFORMA SPOT LA PASTA.pdf",
                               "La Pasta Gold Proposition Celebrites OK.pdf", "LA PASTA GOLD STORYBOARD OK.pdf",
                               "MOTION BRIEF LA PASTA GOLD.pdf", "TENUES SPOT LA PASTA.PDF"]),
             ("PRJ-STL-CM", ["LVQR Campagne Not Laughing cow"])]
    PI = {p["id"]: p for p in PM}
    for pid, noms in RECUS:
        p = PI.get(pid)
        if not p or p.get("campagneId") not in CM: continue
        for n in noms:
            src = os.path.join(DL, n)
            if not os.path.exists(src): continue
            base = os.path.join(RACINE, chemin_campagne(CM[p["campagneId"]]), "_Documents reçus")
            if os.path.isdir(src):
                for dp, dn, fn in os.walk(src):
                    for f in fn:
                        if f.startswith("."): continue
                        s = os.path.join(dp, f)
                        lignes.append({"source": s, "destination": os.path.join(base, n, os.path.relpath(s, src)), "campagne": p["campagneId"],
                                       "motif": "dossier reçu de " + p["ref"], "taille": os.path.getsize(s)})
            else:
                lignes.append({"source": src, "destination": os.path.join(base, n), "campagne": p["campagneId"],
                               "motif": "document reçu de " + p["ref"], "taille": os.path.getsize(src)})
    # Deux sources ne peuvent pas viser la même destination.
    vus = set()
    for l in lignes:
        dst = l["destination"]; b, e = os.path.splitext(dst); k = 2
        while dst in vus or (os.path.exists(dst) and dst != l["source"]):
            dst = f"{b} ({k}){e}"; k += 1
        vus.add(dst); l["destination"] = dst
    return lignes

# ————————————————— Les .md —————————————————
def libelles(fichier):
    t = open(os.path.join(APP, "app", fichier)).read()
    return dict(re.findall(r'cle: "([a-z_A-Z]+)", (?:pilier: "[ADVE]", code: "[^"]*", )?nom: "([^"]+)",\s*type:', t))
LAB = libelles("modele-champs.js"); LABV = libelles("vault.js")
LAB.update({"client": "Client", "marque": "Marque", "marches": "Marchés", "budgetNote": "Budget", "decideur": "Décideur final",
            "fenetre": "Fenêtre", "statut": "Statut"})
MARCHES = {m["id"]: m["nom"] for m in d.get("marches", [])}
SECTIONS = [("identite", "Identité"), ("brief", "Brief"), ("briefback", "Brief-back"), ("socle", "Socle de marque"),
            ("strategie", "Stratégie"), ("bigidea", "Big idea")]
CACHES = {"clientId", "marqueIds", "decideurId", "moodboard", "porteur", "source", "budget"}

def val(v):
    if isinstance(v, str) and v in MARCHES: return MARCHES[v]
    if v is None or v == "" or v == [] or v == {}: return None
    if isinstance(v, list):
        xs = [val(x) for x in v]; xs = [x for x in xs if x]
        if len(xs) == 1: return xs[0]
        return "\n".join("- " + x.replace("\n", " ") for x in xs) if xs else None
    if isinstance(v, dict): return "; ".join(f"{k} : {val(x)}" for k, x in v.items() if val(x))
    return str(v)

def bloc(titre, items, infs=None, prefixe=""):
    out = []
    for k, v in items:
        t = val(v)
        if not t: continue
        lab = LAB.get(k) or LABV.get(k) or k.replace("_", " ").capitalize()
        inf = " *(inféré)*" if infs and (prefixe + k) in infs else ""
        out.append(f"**{lab}**{inf}\n{t}\n" if "\n" in t else f"**{lab}**{inf} — {t}\n")
    return (f"## {titre}\n\n" + "\n".join(out)) if out else ""

def md_projet(p):
    i = p["sections"].get("identite") or {}
    infs = p.get("inferences") or {}
    L = [f"# {p['ref']} — {p['nom']}\n", f"Structure : **{(p.get('structure') or 'matanga').capitalize()}** · statut : {p.get('statut') or '—'} · "
         f"nature : {p.get('nature') or p.get('gabarit') or '—'} · ouvert le {str(p.get('cree_le') or '')[:10]}\n",
         "> Fiche tirée de LA BARRE le " + datetime.date.today().isoformat() + ". *(inféré)* : raisonné à partir des documents, "
         "pas encore contresigné — utilisable, pas opposable.\n"]
    for cle, titre in SECTIONS:
        s = p["sections"].get(cle) or {}
        if isinstance(s, dict):
            L.append(bloc(titre, [(k, v) for k, v in s.items() if k not in CACHES], infs, cle + "."))
    pis = p["sections"].get("pistes") or []
    if pis:
        L.append("## Pistes\n")
        for pi in pis:
            L.append(f"### {pi.get('titre') or 'Sans titre'} — {pi.get('statut') or ''}\n")
            L.append(bloc("", [(k, pi.get(k)) for k in ("concept", "mecanique", "accroches", "visuel", "executionCle", "argument", "sacrifice", "privilegie")]).replace("## \n\n", ""))
    if p.get("insights"):
        L.append("## Insights\n\n" + "\n".join(f"- *{x.get('couche') or '?'}* — {((x.get('passes') or {}).get('phrase')) or ''}" for x in p["insights"]) + "\n")
    if p.get("territoires"):
        L.append("## Territoires\n\n" + "\n".join(f"- **{t.get('nom')}** — {t.get('quoi') or ''}" for t in p["territoires"]) + "\n")
    ls = [l for l in p.get("livrables") or [] if not l.get("annule")]
    if ls:
        sup = {s["id"]: s["nom"] for s in d.get("supports", [])}
        L.append(f"## Livrables ({len(ls)})\n\n| Livrable | Support | Échéance | Niveau |\n|---|---|---|---|\n" +
                 "\n".join(f"| {l['nom'].replace('|', '/')} | {sup.get(l.get('support'), l.get('support') or '')} | {l.get('echeance') or ''} | {l.get('niveau') or ''} |" for l in ls) + "\n")
    if p.get("documentsRecus"):
        L.append("## Documents reçus\n\n" + "\n".join(f"- **{x.get('nom')}** ({x.get('type') or ''}{', ' + x['date'] if x.get('date') else ''}) — {x.get('tire') or ''}" for x in p["documentsRecus"]) + "\n")
    fs = [f for f in d.get("factures", []) if f["id"] in (p.get("factures") or [])]
    if fs:
        L.append("## Pièces de facturation\n\n" + "\n".join(f"- {f.get('type')} {f.get('numero') or ''} du {f.get('date') or '?'} — {f.get('objet') or f.get('client') or ''}" for f in fs) + "\n\n*Les montants restent dans les fichiers.*\n")
    prep = p.get("preparation") or {}
    if prep:
        L.append(bloc("Préparation de la séance", [(k, v) for k, v in prep.items() if k != "infere"]))
    return "\n".join(x for x in L if x)

ICL = []   # l'index iCloud, chargé par « executer »
def a_rapatrier(dos):
    pre = dos.rstrip(os.sep) + os.sep
    return [l for l in ICL if l["destination"].startswith(pre)]
def md_icloud(xs):
    if not xs: return ""
    return (f"## À rapatrier depuis iCloud ({len(xs)}, {sum(int(l['taille']) for l in xs) / 1e6:.0f} Mo)\n\n"
            "Indexés, pas encore copiés ici : `_RAPATRIER-DEPUIS-ICLOUD.command` les télécharge et les copie quand la bande passante le permet.\n\n"
            + "\n".join(f"- `{os.path.relpath(l['source'], os.path.join(HOME, 'Library/Mobile Documents/com~apple~CloudDocs'))}`" for l in xs[:40])
            + (f"\n- … et {len(xs) - 40} autres (voir `_A-RAPATRIER-DEPUIS-ICLOUD.csv`)" if len(xs) > 40 else "") + "\n")

def md_campagne(c, fichiers):
    ps = sorted(PAR_CAMP.get(c["id"], []), key=lambda p: p["ref"])
    f = c.get("fenetre") or {}
    L = [f"# {c['nom']}\n", f"{'Le fil de l’année' if c.get('regime') == 'always-on' else 'Campagne ponctuelle'} · occasion : {c.get('occasion') or '—'} · "
         f"fenêtre : {f.get('debut') or '?'} → {f.get('fin') or '?'}\n"]
    if c.get("infere"): L.append(f"> Pourquoi elle existe : {c['infere'].get('pourquoi')}\n")
    L.append(f"## Projets ({len(ps)})\n\n" + "\n".join(f"- [{p['ref']} — {p['nom']}](PROJET-{p['ref']}.md) · {len([l for l in p.get('livrables') or [] if not l.get('annule')])} livrables" for p in ps) + "\n")
    if c.get("couverture", {}).get("vignette"): L.append("![Couverture](_couverture" + os.path.splitext(c["couverture"]["vignette"])[1] + ")\n")
    L.append(md_fichiers(fichiers))
    L.append(md_icloud(a_rapatrier(os.path.join(RACINE, chemin_campagne(c)))))
    return "\n".join(L)

def md_fichiers(fichiers):
    if not fichiers: return "## Fichiers\n\nAucun fichier de travail retrouvé sur le disque pour ce dossier.\n"
    tot = sum(f["taille"] for f in fichiers)
    par = collections.Counter(os.path.dirname(f["rel"]) or "." for f in fichiers)
    return (f"## Fichiers ({len(fichiers)}, {tot / 1e6:.0f} Mo)\n\n" + "\n".join(f"- `{k}` — {v}" for k, v in sorted(par.items())) + "\n")

def md_marque(mid, campagnes):
    m = M[mid]; v = m.get("vault") or {}; infs = v.get("inferences") or {}
    L = [f"# {m['nom']}\n", f"Groupe : {groupe_de(mid)}" + (f" · marque mère : {M[m['mere']]['nom']}" if m.get("mere") in M else "") + "\n"]
    if m.get("couleurs"): L.append("Couleurs : " + ", ".join(f"`{c['hex']}` {c.get('nom', '')}" for c in m["couleurs"] if isinstance(c, dict)) + "\n")
    L.append("## Plateforme de marque\n\n> Telle que LA BARRE la tient. *(inféré)* : à contresigner avec le client.\n")
    for k, lab in LABV.items():
        t = val(v.get(k))
        if t: L.append(f"**{lab}**{' *(inféré)*' if k in infs else ''}\n{t}\n" if "\n" in t else f"**{lab}**{' *(inféré)*' if k in infs else ''} — {t}\n")
    L.append("## Campagnes\n\n" + "\n".join(f"- {c}" for c in campagnes) + "\n")
    return "\n".join(L)

def ecrire(chemin, texte):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    open(chemin, "w", encoding="utf-8").write(texte)

# ————————————————— Les modes —————————————————
if MODE == "plan":
    lignes = planifier()
    with open(sys.argv[3], "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source", "destination", "campagne", "motif", "taille"]); w.writeheader(); w.writerows(lignes)
    parc = collections.Counter(l["campagne"] or "(pas au dépôt) " + os.path.relpath(os.path.dirname(l["destination"]), RACINE).split("/Le long")[0].split("/Campagnes")[0] for l in lignes)
    motifs = collections.Counter(re.sub(r"\d{4}", "AAAA", l["motif"]) for l in lignes)
    tot = sum(l["taille"] for l in lignes)
    R = [f"# Plan de rangement — passe à blanc ({datetime.date.today()})\n", f"{len(lignes)} fichiers, {tot / 1e9:.1f} Go, vers `{RACINE}`.\n",
         f"Campagnes Matanga au dépôt : {len(CM)} ; projets : {len(PM)}.\n", "## Par campagne\n"]
    R += [f"- {CM[k]['nom'] if k in CM else k} — {v}" for k, v in parc.most_common()]
    R += ["\n## Par règle\n"] + [f"- {k} — {v}" for k, v in motifs.most_common(60)]
    pris = {l["source"] for l in lignes}
    oublies = [os.path.relpath(os.path.join(dp, f), SRC_MARQUES) for dp, dn, fn in os.walk(SRC_MARQUES) for f in fn
               if not f.startswith(".") and f != "Icon\r" and os.path.join(dp, f) not in pris]
    R += ["\n## Restés hors du plan (" + str(len(oublies)) + ")\n"] + ["- " + x for x in oublies[:200]]
    open(sys.argv[4], "w").write("\n".join(R))
    print(len(lignes), "fichiers", f"{tot / 1e9:.1f} Go", "· campagnes touchées :", len([k for k in parc if k in CM]),
          "· hors dépôt :", sum(v for k, v in parc.items() if k not in CM))

elif MODE == "complement":
    # Deuxième passe (06/10/2026) : « quid de TOUTES les campagnes et de TOUTES les vidéos, images, livrables… disponibles
    # dans ma machine ? » — le reste de la machine, inventorié par marque (classe.json). Le local est déplacé ; la clé
    # USB est copiée, jamais vidée ; iCloud est indexé et se rapatrie plus tard, par copie, quand la bande passante le permet.
    import hashlib
    _, _, _, CLASSE, PLAN, IDX_ICLOUD, RAPPORT = sys.argv
    ICLOUD = os.path.join(HOME, "Library/Mobile Documents/com~apple~CloudDocs")
    EXCLU = re.compile(r"Space — ancienne agence|References agences|/00 Matanga Agency|/\.(claude|vscode|codex|cache|bmad)/|Documents/Codex|"
                       r"/HOSTINGER/|/claude design system/|/03 OUTILS & DEV/|/06 LOGICIELS|/Downloads/Smash/|^" + re.escape(HOME) + r"/(FUKU|MATANGA BONNET ROUGE)/|"
                       r"/MATANGA — EXPORT DU TRAVAIL/|avenant_matanga|/Adobe/Premiere Pro|Auto-Save")
    VIRT = {"ROBUSTE": "Cadyst Group/Robuste", "MILKBAR": "FrieslandCampina/Milk Bar", "BAMS": "_Autres comptes/BAMS & BTP",
            "CIMENCAM": "_Autres comptes/Cimencam, Port de Kribi, LTA", "LTA": "_Autres comptes/Cimencam, Port de Kribi, LTA",
            "DELIFOOD": "Delifood", "PRUDENTIAL": "_Autres comptes/Prudential", "LMT": "_Autres comptes/LMT Group",
            "SUNHOUSE": "_Autres comptes/SunHouse", "HC": "_Autres comptes/H&C Executive Education",
            "WAFACASH": "_Autres comptes/Wafacash, Maritimo, Petvisidame, GUCE", "LOME": "_Autres comptes/Grand Marché de Lomé et Togo Marché",
            "FLORIDA": "Cap Esterias/Florida", "MATANGA": "_Matanga — sans marque"}
    NOMS = {"noel": "Noël & fin d'année", "ramadan": "Ramadan & Aïd", "paques": "Pâques & Carême", "rentree": "Back to School",
            "fete": "Fête des mères, des pères, journée mondiale", "promo": "Promotion & déstockage", "jeu": "Jeu-concours & activation",
            "evenement": "Séminaire, salon, événement", "lancement": "Lancement de produit ou de marque", "institutionnel": "Institutionnel & prise de parole"}
    MOTS2 = OCC_MOTS + [("evenement", r"cowlab|seminaire|salon|festival"), ("lancement", r"lancement|rebrand|nouveau look"),
                        ("institutionnel", r"communique|institutionnel")]
    SOURCES = [(os.path.join(WORK, "08 A TRIER"), "Depuis 08 A TRIER"), (os.path.join(WORK, "_TOUS LES KV"), "Depuis _TOUS LES KV"),
               (os.path.join(WORK, "_PREUVES DIRECTION CRÉATIVE"), "Depuis _PREUVES DIRECTION CRÉATIVE"),
               (os.path.join(WORK, "_MASTERS DE CAMPAGNE"), "Depuis _MASTERS DE CAMPAGNE"), (os.path.join(WORK, "04 RESSOURCES"), "Depuis 04 RESSOURCES"),
               (os.path.join(WORK, "05 ADMIN & GESTION"), "Depuis 05 ADMIN & GESTION"), ("/Volumes/NO NAME", "Depuis la clé NO NAME"),
               (os.path.join(ICLOUD, "Desktop/09 ARCHIVES PRE-2025/Matanga avant 2025"), "Depuis iCloud — Matanga avant 2025"),
               (os.path.join(ICLOUD, "Desktop/01 MARQUES CLIENTS"), "Depuis iCloud — 01 MARQUES CLIENTS"),
               (ICLOUD, "Depuis iCloud"), (DL, "Depuis Téléchargements"), (HOME, "Depuis le dossier personnel")]
    # Les copies : même taille, même extension, même contenu qu'un fichier déjà dans l'export.
    par_taille = collections.defaultdict(list)
    for dp, dn, fn in os.walk(RACINE):
        for f in fn:
            q = os.path.join(dp, f)
            try: par_taille[(os.path.getsize(q), os.path.splitext(f)[1].lower())].append(q)
            except OSError: pass
    def md5(q, cache={}):
        if q not in cache:
            h = hashlib.md5()
            with open(q, "rb") as fh:
                for b in iter(lambda: fh.read(1 << 20), b""): h.update(b)
            cache[q] = h.hexdigest()
        return cache[q]
    def copie(x):
        cands = par_taille.get((x["s"], os.path.splitext(x["p"])[1].lower()))
        if not cands: return None
        if x.get("dl"): return cands[0]   # pas téléchargé : la taille et l'extension suffisent à le signaler, sans le rapatrier
        h = md5(x["p"])
        return next((c for c in cands if md5(c) == h), None)
    # La marque se lit dans le chemin RELATIF à la source : « Matanga avant 2025/… » ne doit pas tout ranger chez Matanga.
    MARQUES_RE = [(k, re.compile(v)) for k, v in [
     ("MQ-pz-gold", r"pasta gold|lapasta gold|gold premium"), ("MQ-pz-pasta-first", r"pasta first"),
     ("MQ-lapasta", r"\bla ?pasta\b|lapasta|pasta food|pasta cook"), ("MQ-pz-delys", r"\bdelys\b"), ("MQ-pz-barka", r"\bbarka\b"),
     ("MQ-pz-salaka", r"\bsala[kc]a\b"), ("MQ-panzani", r"panzani|fratelli|vilva|\bolympic\b|leader (bleu|vert)|hermina|\bketty\b|\bsalma\b"),
     ("MQ-amigo", r"\bamigo\b"), ("MQ-cgrain", r"cadyst grain|farine"), ("MQ-cfarming", r"farming"), ("MQ-fuku", r"\bfuku\b"),
     ("MQ-softbaker", r"soft ?baker"), ("MQ-maci", r"\bmaci\b"), ("ROBUSTE", r"\brobuste\b"), ("MQ-cgroup", r"cadyst|cadsyt|cadysst"),
     ("MQ-peak", r"\bpeak\b"), ("MQ-rainbow", r"\brainbow\b"), ("MQ-omela", r"\bomela\b"),
     ("MQ-bh", r"belle hol+[ae]n+daise|belle hoalndaise|bella holandesa|\bbh\b"), ("MQ-dl", r"dutch lady"), ("MILKBAR", r"milk ?bar"),
     ("MQ-nunu", r"\bnunu\b"), ("MQ-br", r"bonnet ?rouge|\bbr\b|cowlab|bdsc|bien dans son corps"),
     ("MQ-fc", r"fr[ie]{2}sland|frieslandcampina|\bfcwa\b"), ("MQ-nsia-tontines", r"nsia ?tontine|tontines?\b"),
     ("MQ-nsia-voyages", r"nsia ?voyage"), ("MQ-nsia-auto", r"nsia ?auto"), ("MQ-nsia", r"\bnsia\b"), ("MQ-eco", r"ecobank"),
     ("MQ-tradex", r"tradex"), ("MQ-phosphatine", r"phosphatine"), ("MQ-apericube", r"apericube"),
     ("MQ-lvqr", r"vache qui rit|\blvqr\b|laughing cow"), ("MQ-pak", r"port autonome de kribi|\bpak\b|kribi"),
     ("MQ-presynat", r"presynat"), ("MQ-frutas", r"\bfrutas\b"), ("MQ-capesterias", r"cap ?esterias|sofavin"), ("MQ-mm", r"mamy makala|makala"),
     ("MQ-btomate", r"belles? tomates?"), ("MQ-bfromagerie", r"belle fromagerie"), ("MQ-bgraines", r"belles? graines?"), ("DELIFOOD", r"delifood"),
     ("BAMS", r"\bbams\b"), ("CIMENCAM", r"cimencam"), ("LTA", r"\blta\b"), ("PRUDENTIAL", r"prudential"), ("LMT", r"\blmt\b"),
     ("SUNHOUSE", r"sun ?house"), ("HC", r"h ?& ?c executive"), ("WAFACASH", r"wafacash|maritimo|petvisidame|\bguce\b"),
     ("LOME", r"marche de lome|togo marche"), ("MQ-kitoko", r"kitoko"), ("MATANGA", r"matanga")]]
    HORS_RE = re.compile(r"upgraders|friends ?(photo|studio)|beignet paradise|\bspawt\b|\bkof\b|otaku|musina|motion ?19|universal music|"
                         r"doual ?art|pen ?& ?grace|banahealth|villa corso|goodlocs|akwa palace|dot ?bites|xtincell|porfolio|portfolio|kinara")
    ARCHIVE = os.path.join(ICLOUD, "Desktop/09 ARCHIVES PRE-2025/Matanga avant 2025")
    def marque_de(p, src_racine):
        rel = norme(os.path.relpath(p, src_racine))
        if HORS_RE.search(rel): return None
        for k, rx in MARQUES_RE:
            if rx.search(rel): return k
        return "MATANGA" if p.startswith(ARCHIVE + os.sep) else None
    # Les ressources d'archive datent de leur téléchargement (un modèle de 2019) : l'année d'un dossier est celle de son fichier le plus récent.
    an_dossier = collections.defaultdict(int)
    tout = json.load(open(CLASSE))
    for x in tout: an_dossier[os.path.dirname(x["p"])] = max(an_dossier[os.path.dirname(x["p"])], x["m"])
    lignes, icloud, copies, oublies = [], [], [], []
    for x in tout:
        p = x["p"]
        # « marque » : une attribution faite à l'œil (troisième passe, les fichiers sans marque lisible) prime sur le chemin.
        if (x["cat"] == "hors-matanga" and not x.get("marque")) or EXCLU.search(p) or not os.path.exists(p): continue
        src_racine0 = next((r for r, l in SOURCES if p.startswith(r + os.sep)), os.path.dirname(p))
        cat = x.get("marque") or marque_de(p, src_racine0)
        if not cat: continue
        if datetime.datetime.fromtimestamp(x["m"]).year < 2021: x["m"] = max(x["m"], an_dossier[os.path.dirname(p)])
        if cat in M: mid, base = cat, chemin_marque(cat)
        elif cat in VIRT: mid, base = None, VIRT[cat]
        else: oublies.append(p); continue
        if copie(x): copies.append(p); continue
        src_racine, lib = next(((r, l) for r, l in SOURCES if p.startswith(r + os.sep)), (os.path.dirname(p), "Depuis " + os.path.basename(os.path.dirname(p))))
        rel = os.path.relpath(p, src_racine)
        n = norme(rel); occ = "continu"
        for k, pat in MOTS2:
            if re.search(pat, n): occ = k; break
        an = annee_fichier(x["m"], occ, rel)
        cands = campagnes_de_marque(mid, base) if mid or base.startswith("_Autres") else []
        camp = choisir(cands, occ, an) if occ != "continu" else None
        if occ == "continu" and re.search(r"\blogos?\b|charte|brand ?book|identite", n): dest = os.path.join(base, "_Identité de marque", lib, rel)
        elif camp: dest = os.path.join(chemin_campagne(camp), lib, rel)
        elif occ != "continu": dest = os.path.join(base, "Campagnes ponctuelles", propre(an + " — " + NOMS.get(occ, occ)), lib, rel)
        else:
            camp = choisir(cands, "continu", an)
            dest = os.path.join(chemin_campagne(camp) if camp else os.path.join(base, "Le long de l'année", an), lib, rel)
        ligne = {"source": p, "destination": os.path.join(RACINE, dest), "campagne": camp["id"] if camp else "",
                 "motif": f"{cat} · {occ} · {an}", "taille": x["s"], "op": x.get("op") or ("copier" if p.startswith("/Volumes/") else "deplacer")}
        (icloud if p.startswith(ICLOUD) else lignes).append(ligne)
    vus = set()
    for l in lignes + icloud:
        dst = l["destination"]; b, e = os.path.splitext(dst); k = 2
        while dst in vus or os.path.exists(dst):
            dst = f"{b} ({k}){e}"; k += 1
        vus.add(dst); l["destination"] = dst
    champs = ["source", "destination", "campagne", "motif", "taille", "op"]
    for fichier, xs in ((PLAN, lignes), (IDX_ICLOUD, icloud)):
        with open(fichier, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=champs); w.writeheader(); w.writerows(xs)
    def resume(xs):
        c = collections.Counter(os.path.relpath(l["destination"], RACINE).split(os.sep)[0] for l in xs)
        return [f"- {k} — {v}" for k, v in c.most_common()]
    R = [f"# Deuxième passe — le reste de la machine ({datetime.date.today()})\n",
         f"À déplacer ou copier (local) : {len(lignes)} fichiers, {sum(l['taille'] for l in lignes) / 1e9:.1f} Go.",
         f"À rapatrier d'iCloud (indexé, rien ne bouge) : {len(icloud)} fichiers, {sum(l['taille'] for l in icloud) / 1e9:.1f} Go.",
         f"Copies d'un fichier déjà dans l'export (laissées en place) : {len(copies)}.\n", "## Local, par groupe\n"] + resume(lignes) + \
        ["\n## iCloud, par groupe\n"] + resume(icloud)
    open(RAPPORT, "w").write("\n".join(R))
    print(len(lignes), "locaux ·", len(icloud), "iCloud ·", len(copies), "copies ·", len(oublies), "sans destination")

elif MODE == "executer":
    lignes = list(csv.DictReader(open(sys.argv[3], encoding="utf-8")))
    os.makedirs(RACINE, exist_ok=True)
    fait = []
    neuf = not os.path.exists(MANIF)
    with open(MANIF, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if neuf: w.writerow(["source", "destination"])
        for l in lignes:
            s, t = l["source"], l["destination"]
            if not os.path.exists(s) or os.path.exists(t): continue
            os.makedirs(os.path.dirname(t), exist_ok=True)
            if l.get("op") == "copier": shutil.copy2(s, t)   # une clé USB se copie, elle ne se vide pas
            else: shutil.move(s, t)
            w.writerow([os.path.relpath(s, DL), os.path.relpath(t, DL)]); fh.flush(); fait.append(l)
    ecrire(os.path.join(RACINE, "_ANNULER-LES-DEPLACEMENTS.command"), """#!/bin/bash
# Remet chaque fichier à sa place d'origine (chemins relatifs à ~/Downloads). Les .md générés restent.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import csv, os, shutil
n = 0
with open("MATANGA — EXPORT DU TRAVAIL/_MANIFESTE-DEPLACEMENTS.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if os.path.exists(row["destination"]) and not os.path.exists(row["source"]):
            os.makedirs(os.path.dirname(row["source"]) or ".", exist_ok=True)
            shutil.move(row["destination"], row["source"]); n += 1
print("restaurés :", n)
PY
""")
    os.chmod(os.path.join(RACINE, "_ANNULER-LES-DEPLACEMENTS.command"), 0o755)
    # Les fichiers présents, par dossier de campagne (relus sur le disque : un second passage ne perd rien).
    def presents(dossier):
        out = []
        for dp, dn, fn in os.walk(dossier):
            for f in fn:
                if f.startswith(".") or f.endswith(".md") or f.startswith("_couverture"): continue
                q = os.path.join(dp, f); out.append({"rel": os.path.relpath(q, dossier), "taille": os.path.getsize(q)})
        return out
    IDX = os.path.join(RACINE, "_A-RAPATRIER-DEPUIS-ICLOUD.csv")
    if os.path.exists(IDX): ICL[:] = list(csv.DictReader(open(IDX, encoding="utf-8")))
    marques_camps = collections.defaultdict(list)
    for cid, c in CM.items():
        dos = os.path.join(RACINE, chemin_campagne(c)); os.makedirs(dos, exist_ok=True)
        cov = (c.get("couverture") or {}).get("vignette")
        if cov and os.path.exists(os.path.join(APP, cov)):
            shutil.copyfile(os.path.join(APP, cov), os.path.join(dos, "_couverture" + os.path.splitext(cov)[1]))
        ecrire(os.path.join(dos, "CAMPAGNE.md"), md_campagne(c, presents(dos)))
        for p in PAR_CAMP[cid]: ecrire(os.path.join(dos, f"PROJET-{p['ref']}.md"), md_projet(p))
        mq = (c.get("marqueIds") or [None])[0]
        if mq in M: marques_camps[mq].append(os.path.relpath(dos, os.path.join(RACINE, chemin_marque(mq))))
    for mid, cs in marques_camps.items():
        ecrire(os.path.join(RACINE, chemin_marque(mid), "MARQUE.md"), md_marque(mid, sorted(cs)))
    # Les dossiers créés pour des fichiers sans campagne au dépôt.
    hors = collections.defaultdict(list)
    dossiers_camp = [chemin_campagne(c) + os.sep for c in CM.values()]
    for row in csv.DictReader(open(MANIF, encoding="utf-8")):
        r = os.path.relpath(os.path.join(DL, row["destination"]), RACINE)
        if not any(r.startswith(x) for x in dossiers_camp):
            l = row; m = re.match(r"(.+?/(?:Le long de l'année/\d{4}|Campagnes ponctuelles/[^/]+|_Identité de marque|_Packaging & étiquettes))/", r)
            if m: hors[m.group(1)].append(l)
    for dos in hors:
        chemin = os.path.join(RACINE, dos, "DOSSIER.md")
        if os.path.isdir(os.path.join(RACINE, dos)) and not os.path.exists(os.path.join(RACINE, dos, "CAMPAGNE.md")):
            ecrire(chemin, f"# {dos}\n\n> Aucun dossier de ce nom au dépôt LA BARRE : les fichiers y sont rangés d'après leur dossier d'origine et leur date. "
                           "Pas tracé ne veut pas dire pas fait.\n\n" + md_fichiers(presents(os.path.join(RACINE, dos))))
    # L'index et le lisez-moi.
    idx = collections.defaultdict(list)
    for cid, c in CM.items():
        idx[chemin_campagne(c).split(os.sep)[0]].append((chemin_campagne(c), c, len(PAR_CAMP[cid])))
    I = [f"# Index — le travail fait pour Matanga\n", f"Généré le {datetime.date.today()} depuis LA BARRE : {len(CM)} campagnes, {len(PM)} projets.\n"]
    for g in sorted(idx):
        I.append(f"\n## {g}\n")
        for ch, c, n in sorted(idx[g], key=lambda x: x[0]):
            I.append(f"- [{c['nom']}]({ch.replace(' ', '%20')}/CAMPAGNE.md) — {n} projet{'s' if n > 1 else ''}")
    if hors:
        I.append("\n## Rangé sans campagne au dépôt\n")
        I += [f"- `{k}` — {len(v)} fichiers" for k, v in sorted(hors.items())]
    if ICL:
        gi = collections.Counter(); ti = collections.Counter()
        for l in ICL:
            k = re.sub(r"/(Depuis [^/]+)/.*$", "", os.path.relpath(l["destination"], RACINE)); gi[k] += 1; ti[k] += int(l["taille"])
        I.append(f"\n## À rapatrier depuis iCloud — {len(ICL)} fichiers, {sum(ti.values()) / 1e9:.1f} Go\n")
        I.append("Lancer `_RAPATRIER-DEPUIS-ICLOUD.command` quand la bande passante le permet : il télécharge chaque fichier et le copie "
                 "à sa place ci-dessous. L'original reste dans iCloud. On peut l'interrompre et le relancer.\n")
        I += [f"- `{k}` — {v} fichiers, {ti[k] / 1e6:.0f} Mo" for k, v in sorted(gi.items())]
        ecrire(os.path.join(RACINE, "_RAPATRIER-DEPUIS-ICLOUD.command"), """#!/bin/bash
# Télécharge depuis iCloud les fichiers Matanga indexés et les COPIE à leur place dans l'export.
# Rien n'est retiré d'iCloud. Reprend où il s'est arrêté : un fichier déjà copié est sauté.
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
import csv, os, shutil, subprocess, time
ok = attente = 0
rows = list(csv.DictReader(open("_A-RAPATRIER-DEPUIS-ICLOUD.csv", encoding="utf-8")))
for i, r in enumerate(rows, 1):
    s, t = r["source"], r["destination"]
    if os.path.exists(t) or not os.path.exists(s): continue
    if os.stat(s).st_flags & 0x40000000:           # pas encore sur le disque : on le demande à iCloud
        subprocess.run(["brctl", "download", s], capture_output=True)
        for _ in range(600):
            if not os.stat(s).st_flags & 0x40000000: break
            time.sleep(1)
        else:
            attente += 1; print("toujours en téléchargement, à relancer :", s); continue
    os.makedirs(os.path.dirname(t), exist_ok=True)
    shutil.copy2(s, t); ok += 1
    if ok % 50 == 0: print(f"{i}/{len(rows)} — {ok} copiés")
print("copiés :", ok, "· en attente :", attente, "· total indexé :", len(rows))
PY
""")
        os.chmod(os.path.join(RACINE, "_RAPATRIER-DEPUIS-ICLOUD.command"), 0o755)
    ecrire(os.path.join(RACINE, "INDEX.md"), "\n".join(I) + "\n")
    ecrire(os.path.join(RACINE, "LISEZ-MOI.md"), f"""# Matanga — export du travail

Ce dossier rassemble le travail fait pour Matanga Agency, des archives d'avant 2025 jusqu'à 2026, rangé comme LA BARRE le tient :
**groupe → marque → campagne**. Chaque campagne est soit **ponctuelle** (un temps fort : Ramadan, Back to School,
un lancement…), soit **le long de l'année** (les actions hors temps fort, par année).

## Ce que contient chaque dossier

- `MARQUE.md` — la plateforme de marque (vision, positionnement, promesse, ton, symboles…).
- `CAMPAGNE.md` — la campagne, ses projets, et l'inventaire des fichiers.
- `PROJET-<réf>.md` — le dossier complet d'un projet : identité, brief, stratégie, big idea, pistes, livrables,
  documents reçus. Ce qui est marqué *(inféré)* est raisonné à partir des documents, pas encore validé.
- Les fichiers de travail, dans leurs sous-dossiers d'origine.
- `_Identité de marque/` et `_Packaging & étiquettes/` — ce qui n'appartient à aucune année.
- `DOSSIER.md` — un dossier rangé d'après le disque, sans campagne au dépôt : pas tracé ne veut pas dire pas fait.

## Ce qui n'y est pas

- Les opérations sous UPgraders, Friends Photography Studio ou en nom propre, et Beignet Paradise.
- `Work 2026/00 Matanga Agency` (l'agence elle-même) et les copies (`_TOUS LES KV`, `_MASTERS DE CAMPAGNE`, le corpus).
- Les montants : ils restent dans les factures et les devis.

## Ce qui reste à rapatrier d'iCloud

Une partie du travail vit dans iCloud Drive (le bureau rangé, les archives d'avant 2025). Ces fichiers sont **indexés**,
avec leur place prévue ici : `_A-RAPATRIER-DEPUIS-ICLOUD.csv`, et dans chaque `CAMPAGNE.md`. Le double-clic sur
`_RAPATRIER-DEPUIS-ICLOUD.command` les télécharge et les copie à leur place ; l'original reste dans iCloud.

## D'où viennent les fichiers

Les sous-dossiers `Depuis …` disent d'où vient un fichier rangé à la deuxième passe (08 A TRIER, _MASTERS DE CAMPAGNE,
la clé NO NAME…). Les fichiers de la clé USB ont été copiés, pas déplacés.

## Revenir en arrière

Chaque déplacement est noté dans `_MANIFESTE-DEPLACEMENTS.csv` (chemins relatifs à Téléchargements).
`_ANNULER-LES-DEPLACEMENTS.command` remet chaque fichier à sa place d'origine.

Mis à jour le {datetime.date.today()} — {sum(1 for _ in open(MANIF)) - 1} fichiers déplacés au total.
""")
    print("déplacés :", len(fait), "· campagnes documentées :", len(CM), "· marques :", len(marques_camps), "· dossiers hors dépôt :", len(hors))

elif MODE == "chemins":
    rows = list(csv.DictReader(open(MANIF, encoding="utf-8")))
    carte = {}
    for r in rows:
        carte[os.path.normpath(os.path.join(DL, r["source"]))] = os.path.normpath(os.path.join(DL, r["destination"]))
    # Le hors-Matanga (troisième passe) : 02 VENTURES et les fichiers reconnus à l'œil, partis sous UPGRADERS — EXPORT DU TRAVAIL.
    # Le coffre n'est pas lu : un chemin vers les papiers d'Alexandre n'a rien à faire dans un dépôt en ligne.
    MANIF_U = os.path.join(DL, "UPGRADERS — EXPORT DU TRAVAIL", "_MANIFESTE-DEPLACEMENTS.csv")
    if os.path.exists(MANIF_U):
        for r in csv.DictReader(open(MANIF_U, encoding="utf-8")):
            if r.get("op") != "copier": carte[r["source"]] = r["destination"]
    def resoudre(o):
        """Le dépôt écrit un chemin en absolu, en ~/ ou relatif à Work 2026 : on le ramène à l'absolu, et on rend la même forme."""
        if o.startswith("/"): return o, lambda b: b
        if o.startswith("~/"): return os.path.join(HOME, o[2:]), lambda b: b.replace(HOME, "~", 1)
        for base in (WORK, DL):
            q = os.path.normpath(os.path.join(base, o))
            if q in carte: return q, lambda b: b.replace(HOME, "~", 1)
        return None, None
    prefixes = []
    for r in rows:
        if r["source"].startswith("LVQR Campagne Not Laughing cow/"):
            dst = os.path.join(DL, r["destination"]); racine = dst[:dst.index("LVQR Campagne Not Laughing cow/") + len("LVQR Campagne Not Laughing cow/")]
            prefixes = [(os.path.join(DL, "LVQR Campagne Not Laughing cow/"), racine), ("~/Downloads/LVQR Campagne Not Laughing cow/", racine.replace(HOME, "~", 1))]
            break
    n = [0]
    def reecrire(o):
        if isinstance(o, dict): return {k: reecrire(v) for k, v in o.items()}
        if isinstance(o, list): return [reecrire(v) for v in o]
        if isinstance(o, str) and len(o) < 600:
            q, forme = resoudre(o)
            if q in carte: n[0] += 1; return forme(carte[q])
        # Les dossiers reçus déplacés entiers : un chemin descriptif (« DOC 2 · … ») garde son dossier.
        if isinstance(o, str):
            for a, b in prefixes:
                if o.startswith(a): n[0] += 1; return b + o[len(a):]
        return o
    d2 = reecrire(d)
    d2["enregistre_le"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    d2.setdefault("journal", []).append({"quand": d2["enregistre_le"], "qui": "creation", "action": "export Matanga",
        "type": "fichiers", "id": None, "detail": f"{n[0]} chemins de fichiers suivis vers « MATANGA — EXPORT DU TRAVAIL » et « UPGRADERS — EXPORT DU TRAVAIL »"})
    json.dump(d2, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
    print("chemins réécrits :", n[0])
