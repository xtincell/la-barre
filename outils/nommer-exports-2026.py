# nommer-exports-2026.py — donner à chaque fichier des exports un nom qui dit ce qu'il est, après l'avoir LU.
#
# Demande d'Alex (06/10/2026) : « je vois comment tu galères à identifier les packshots (boîtes de produits), pourtant il
# y a le nom dessus, parfois la promo concernée ; pareil pour les logos spéciaux de Bonnet Rouge. Tu devrais renommer les
# fichiers pour t'en sortir, après les avoir lus TOUS. » — et : des fichiers NSIA Tontines rangés dans NSIA Voyages,
# des KV 4x3 et 6x3 mélangés.
#
# Lecture : outil Swift `lire` (OCR Vision fr/en + dimensions) sur chaque image, PDF, AI, PSD et vidéo ; texte des
# documents Office. Ce script croise le texte lu, les dimensions et le dossier :
#
#   <Marque> — <Campagne> — <Type> <Format> — <ce qu'on lit dessus> — <langue, variante>.<ext>
#   « Bonnet Rouge — Ramadan 2026 — KV 6x3 — Avec vous du sahur à l'iftar — FR.png »
#   « Bonnet Rouge — Packshot — IMP boîte 400 g — Pack générosité +10 % gratuit.png »
#
# et signale la marque lue quand elle contredit le dossier (Tontines dans Voyages) : le fichier change de dossier.
# Rien ne s'applique ici : le script écrit `gestes.csv` pour reclasser-2026.py (manifeste, journal, annulation).
#
# Usage : python3 outils/nommer-exports-2026.py <ocr.jsonl> <office.jsonl> <sortie-dir>

import json, os, re, sys, csv, unicodedata, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sku_lu

HOME = os.path.expanduser("~")
DL = os.path.join(HOME, "Downloads")
RM = os.path.join(DL, "MATANGA — EXPORT DU TRAVAIL")
RU = os.path.join(DL, "UPGRADERS — EXPORT DU TRAVAIL")

def norme(t): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9%+&]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower())).strip()
def propre(t): return re.sub(r"\s+", " ", re.sub(r'[/:\\*?"<>|\n\r\t]+', " ", t)).strip(" .-—")

# ————————————————— Les marques, telles qu'on les lit sur un visuel —————————————————
# (motif lu, dossier de l'export, nom court). L'ordre compte : la gamme avant la marque, la marque avant le groupe.
MARQUES = [
 (r"\btontines?\b", "NSIA/NSIA Tontines", "NSIA Tontines"), (r"\bnsia\b.{0,30}\b(voyages?|travel)\b|\b(voyages?|travel)\b.{0,30}\bnsia\b", "NSIA/NSIA Voyages", "NSIA Voyages"),
 (r"\bnsia\b.{0,20}\bauto\b", "NSIA/NSIA Auto", "NSIA Auto"), (r"\bnsia\b", "NSIA", "NSIA"),
 (r"\bbonnet ?rouge\b", "FrieslandCampina/Bonnet Rouge", "Bonnet Rouge"), (r"\bpeak\b", "FrieslandCampina/Peak", "Peak"),
 (r"\bbelle hollandaise\b", "FrieslandCampina/Belle Hollandaise", "Belle Hollandaise"), (r"\brainbow\b", "FrieslandCampina/Rainbow", "Rainbow"),
 (r"\bomela\b", "FrieslandCampina/Omela", "Omela"), (r"\bpearl\b", "FrieslandCampina/Pearl", "Pearl"), (r"\bnunu\b", "FrieslandCampina/Nunu", "Nunu"),
 (r"\bfriesland ?campina\b", "FrieslandCampina", "FrieslandCampina"),
 (r"\bpasta first\b", "Cadyst Group/La Pasta/Pasta First", "Pasta First"), (r"\bla ?pasta\b.{0,15}\bgold\b|\bgold premium\b", "Cadyst Group/La Pasta/Gold", "La Pasta Gold"),
 (r"\bla ?pasta\b", "Cadyst Group/La Pasta", "La Pasta"), (r"\bpanzani\b", "Cadyst Group/Panzani", "Panzani"), (r"\bdelys\b", "Cadyst Group/Delys", "Delys"),
 (r"\bamigo\b|\bmigo\b", "Cadyst Group/Amigo", "Amigo"), (r"\bsoft ?baker\b", "Cadyst Group/Cadyst Grain", "Soft Baker"),
 (r"\brobuste\b", "Cadyst Group/Robuste", "Robuste"), (r"\bcadyst farming\b", "Cadyst Group/Cadyst Farming", "Cadyst Farming"),
 (r"\bcadyst grain\b|\bla camerounaise\b|\bsona\b|\bbara\b", "Cadyst Group/Cadyst Grain", "Cadyst Grain"), (r"\bmaci\b", "Cadyst Group/MACI", "MACI"),
 (r"\becobank\b", "Ecobank", "Ecobank"), (r"\btradex\b", "Tradex", "Tradex"), (r"\bphosphatine\b", "Phosphatine", "Phosphatine"),
 (r"\bvache qui rit\b|\blaughing cow\b", "Bel/La Vache qui rit", "La Vache qui rit"), (r"\bmamy makala\b", "Mamy Makala", "Mamy Makala"),
 (r"\bport autonome de kribi\b", "Port Autonome de Kribi", "PAK"), (r"\bpresynat\b", "PRESYNAT", "PRESYNAT"),
 (r"\bspawt\b", "U:Spawt", "Spawt"), (r"\bk ?mer otaku\b|\botaku festival\b", "U:KOF - Kamer Otaku Fest", "KOF"), (r"\bmusina\b", "U:Musina", "Musina"),
 (r"\bflorida\b", "_Autres comptes/Florida", "Florida"), (r"\bfrutas\b", "Cap Esterias/Frutas", "Frutas"), (r"\bcap esterias\b", "Cap Esterias", "Cap Esterias"),
]
# Ce que le dossier dit de la marque : le nom court du dossier le plus profond reconnu.
COURT = {d: c for _, d, c in MARQUES}
COURT.update({"Cadyst Group": "Cadyst", "Cadyst Group/Cadyst Grain": "Cadyst Grain", "Delifood/Belle Fromagerie": "Belle Fromagerie",
              "Delifood/Belles Tomates": "Belles Tomates", "Bel/La Vache qui rit": "La Vache qui rit"})

def marque_dossier(p):
    if not p.startswith(RM + os.sep): return None, None
    rel = os.path.relpath(p, RM).split(os.sep)
    for k in (3, 2, 1):
        d = "/".join(rel[:k])
        if d in COURT: return d, COURT[d]
    if rel[0] == "_Autres comptes" and len(rel) > 1: return "/".join(rel[:2]), rel[1]
    if rel[0] == "_Matanga — sans marque": return rel[0], "Matanga"
    return rel[0], rel[0]

def marques_lues(lignes):
    """Les marques écrites sur le visuel, pondérées par la taille des lettres : un logo pèse, une mention légale non."""
    poids = collections.Counter()
    txt = norme(" ".join(l[0] for l in lignes))
    for rx, d, c in MARQUES:
        for l in lignes:
            if re.search(rx, norme(l[0])): poids[d] += 1 + 20 * l[2]
        if re.search(rx, txt) and d not in poids: poids[d] += 0.5
    # Une gamme lue retire son groupe : « NSIA Tontines » ne compte pas aussi pour « NSIA ».
    for d in list(poids):
        par = d.rsplit("/", 1)[0] if "/" in d else None
        if par in poids and poids[d] >= 1: del poids[par]
    return poids

# ————————————————— Le format —————————————————
FORMATS_PX = {(1080, 1080): "post 1-1", (1080, 1350): "post 4-5", (1080, 1920): "story 9-16", (1920, 1080): "16-9",
              (1200, 628): "lien 1,91-1", (1200, 630): "lien 1,91-1", (828, 315): "bannière Facebook", (820, 312): "bannière Facebook",
              (1584, 396): "bannière LinkedIn", (1500, 500): "bannière X", (2560, 1440): "bannière YouTube"}
RATIOS = [(1.0, "1-1"), (0.8, "4-5"), (0.5625, "9-16"), (1.7778, "16-9"), (4 / 3, "4x3"), (0.75, "3x4"), (2.0, "6x3"), (0.5, "3x6"),
          (3.0, "12x4"), (1 / 3, "4x12"), (1.5, "3-2"), (2 / 3, "40x60"), (1.4142, "A paysage"), (0.7071, "A portrait"), (1.91, "1,91-1"),
          (2.6286, "bannière Facebook"), (4.0, "4-1")]
A_MM = [(841, 1189, "A0"), (594, 841, "A1"), (420, 594, "A2"), (297, 420, "A3"), (210, 297, "A4"), (148, 210, "A5"), (105, 148, "A6")]
def format_de(x):
    w, h = x.get("w") or 0, x.get("h") or 0
    if x.get("wmm"):
        a, b = sorted((x["wmm"], x["hmm"]))
        for fa, fb, n in A_MM:
            if abs(a - fa) <= 6 and abs(b - fb) <= 6: return n + (" paysage" if x["wmm"] > x["hmm"] else "")
        w, h = x["wmm"], x["hmm"]
        if max(w, h) > 600: return f"{round(w / 10)}x{round(h / 10)} cm"
    if not w or not h: return ""
    for (fw, fh), n in FORMATS_PX.items():
        if abs(w - fw) <= 2 and abs(h - fh) <= 2: return n
    r = w / h
    best = min(RATIOS, key=lambda t: abs(t[0] - r) / t[0])
    return best[1] if abs(best[0] - r) / best[0] < 0.035 else f"{w}x{h}"

# ————————————————— Le type —————————————————
VID = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
SOURCE = {".psd": "PSD", ".psb": "PSB", ".ai": "AI", ".indd": "InDesign", ".eps": "EPS"}
IA = re.compile(r"^(gemini|freepik|magnific|replicate|dreamina|chatgpt|kling|midjourney|mj_|dall|firefly|leonardo|ideogram|flux|seedream|higgsfield)", re.I)
PRODUIT = re.compile(r"\b\d+(?:[.,]\d+)? ?(g|gr|kg|ml|cl|l)\b|\blait\b|\bmilk\b|\bp[aâ]tes?\b|\bspaghetti|\bmacaroni|\bfarine\b|\bflour\b|"
                     r"\bevap|\bconcentr|\ben poudre\b|\bpowder\b|\bsachet|\bbo[iî]te|\btin\b|\bsucr[eé]\b|\bvitamin|\bcalcium|\bfromage|\bportions?\b|"
                     r"\bbiscuits?\b|\bc[eé]r[eé]ales?\b|\bvin\b|\bmousseux\b|\bhuile\b|\bcroissance\b|\baliment\b", re.I)
PROMO = re.compile(r"(\+ ?\d+ ?%[^,;]{0,25}|\d+ ?% (gratuit|offert|free|extra)[^,;]{0,10}|pack [a-zéè]+|gratuits?|offerts?|\bfree\b|"
                   r"\bpromo[a-z]*\b|\d+ ?\+ ?\d+|\bprix (choc|spécial|special)\b|même prix|edition (limit|spécial)[a-zé]*|édition (limit|spécial)[a-zé]*|"
                   r"\bmini prix\b|\bbonus\b|\b\d+ ?(f|fcfa)\b)", re.I)
MOIS = "janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre"

def langue(lignes):
    t = " " + norme(" ".join(l[0] for l in lignes)) + " "
    fr = len(re.findall(r" (le|la|les|des|du|et|pour|avec|vous|votre|nos|une|est|plus|sans|tous) ", t))
    en = len(re.findall(r" (the|and|for|with|you|your|our|is|more|all|get|now|of) ", t))
    if fr >= 2 and en >= 2 and min(fr, en) / max(fr, en) > 0.35: return "FR-EN"
    if fr >= 2 and fr > en: return "FR"
    if en >= 2 and en > fr: return "EN"
    return ""

BRUIT = re.compile(r"^(www\.|http|@|#|\d+$|©|tel|tél|contact|.{0,2}$)|m\w{0,2} ?mat[ao]ng[ao]|\bagen[cs]|\+ ?237", re.I)   # la signature « Matanga Agency », les numéros
def titre(lignes, exclure):
    """La plus grande phrase lue qui ne soit ni une marque ni une mention : l'accroche, ou le nom du produit."""
    cands = []
    for l in lignes:
        s = l[0].strip()
        n = norme(s)
        if BRUIT.search(s) or len(n) < 3 or l[1] < 0.5: continue
        mots = n.split()
        if not mots or sum(len(m) >= 3 and m.isalpha() for m in mots) / len(mots) < 0.6: continue   # « 95H1 », « ( SPAWT » : du bruit d'OCR
        if any(re.fullmatch(rx, n) for rx in exclure): continue
        cands.append((l[2], l[3], s))
    if not cands: return ""
    cands.sort(key=lambda c: -c[0])
    haut = cands[0][0]
    # Les lignes de même corps, dans l'ordre de lecture : une accroche sur deux lignes reste une accroche.
    grands = sorted([c for c in cands if c[0] >= haut * 0.6], key=lambda c: c[1])[:6]
    t = " ".join(c[2] for c in grands)
    t = re.sub(r"\s+", " ", t)
    return t[:85].rsplit(" ", 1)[0] if len(t) > 85 else t

def variante(nom):
    """Ce que le nom d'origine dit de la version et qu'aucun visuel ne montre : v2, fix, final, A/B, centre, FR/EN."""
    n = os.path.splitext(nom)[0]
    out = []
    for rx, lab in [(r"\bv ?(\d+)\b", "v{}"), (r"\bfix\b|\bcorrig", "corrigé"), (r"\bfinal\b|\bdef\b|\bdéfinitif", "final"),
                    (r"\bcenter\b|\bcentr", "centré"), (r"\bbat\b", "BAT"), (r"\blow\b|\bbasse def", "basse déf"), (r"\bhd\b", "HD"),
                    (r"(?<![a-z])([ab])(?![a-z])\s*(?:\(\d+\))?$", "variante {}")]:
        m = re.search(rx, n, re.I)
        if m: out.append(lab.format(*[g.upper() for g in m.groups() if g]) if "{}" in lab else lab)
    return out

def campagne_dossier(p):
    """« Campagnes ponctuelles/2026 — Ramadan & Aïd » → « Ramadan & Aïd 2026 » ; « Le long de l'année/2025 » → « 2025 »."""
    m = re.search(r"/Campagnes ponctuelles/(20\d\d) — ([^/]+)/", p)
    if m: return f"{m.group(2)} {m.group(1)}"
    m = re.search(r"/Le long de l'année/(20\d\d)/", p)
    if m: return m.group(1)
    if "/_Packaging & étiquettes/" in p: return ""
    if "/_Identité de marque/" in p: return ""
    m = re.search(r"/(20\d\d)/", p)
    return m.group(1) if m else ""

def typer(x, office):
    p = x["p"]; nom = os.path.basename(p); e = os.path.splitext(nom)[1].lower(); n = norme(nom)
    L = x.get("lignes") or []
    txt = norme(" ".join(l[0] for l in L))
    if e in VID:
        d = x.get("dur") or 0
        return ("Spot" if 5 <= d <= 95 and L else "Vidéo"), f"{int(round(d))} s"
    if re.search(r"capture d ?ecran|screenshot|screen shot", n): return "Capture d'écran", ""
    if e in (".docx", ".doc", ".pptx", ".xlsx", ".txt"):
        t = norme(office.get(p, "")[:600] + " " + n)
        for rx, lab in [(r"\bbrief", "Brief"), (r"\bdevis\b|\bquotation\b|\bproforma", "Devis"), (r"\bfacture\b|\binvoice\b", "Facture"),
                        (r"bon de commande|\bpo\b", "Bon de commande"), (r"compte rendu|\bcr\b|\bdebrief", "Compte rendu"),
                        (r"\bplan media|\bmedia plan", "Plan média"), (r"\bretro ?planning|\bplanning\b|\bcalendrier", "Planning"),
                        (r"\bcontrat\b|\bprotocole\b|\bconvention\b", "Contrat"), (r"\brecommandation|\breco\b|\bstrategi|\bplateforme", "Recommandation"),
                        (r"\bscript\b|\bstoryboard\b|\bscenario", "Script"), (r"\brapport\b|\bbilan\b|\breporting\b", "Rapport")]:
            if re.search(rx, t): return lab, ""
        return {".pptx": "Présentation", ".xlsx": "Tableau"}.get(e, "Document"), ""
    if e == ".pdf" and (x.get("pages") or 1) > 2:
        t = txt + " " + n
        for rx, lab in [(r"\bbrief", "Brief"), (r"\bdevis\b|\bproforma", "Devis"), (r"\bfacture\b|\binvoice\b", "Facture"),
                        (r"\brecommandation|\breco\b|\bstrategi|\bplateforme de marque", "Recommandation"), (r"\bcharte\b|brand ?book|guidelines", "Charte"),
                        (r"\bbat\b", "BAT")]:
            if re.search(rx, t): return lab, f"{x['pages']} p."
        return "Présentation", f"{x['pages']} p."
    if re.search(r"\blogo", n) or "/_Identité de marque/" in p and len(txt.split()) <= 6 and not re.search(r"charte|brand ?book", n):
        return "Logo", ""
    if re.search(r"\bcharte\b|brand ?book|guidelines", n): return "Charte", ""
    if IA.search(nom): return "Image IA", ""
    if e in (".cr3", ".nef", ".dng", ".cr2", ".arw") or (re.match(r"^(img|dsc|_mg|mvi)[_ -]?\d+", n) and len(L) <= 2): return "Photo", ""
    paq = "/_Packaging & étiquettes/" in p or re.search(r"packshot|\bsku\b|\bpack\b|packaging|\betiquette|\blabel\b", n)
    if re.search(r"\bpolo\b|t ?shirt|\bshirt\b|casquette|tablier|\bmug\b|stylo|goodies|tote ?bag|\bcap\b|uniforme|chemise", n): return "Goodies", ""
    if (paq or len(PRODUIT.findall(txt)) >= 2) and not re.search(r"\bkv\b|\bbat\b|billboard|affiche|poster|post\b|story|banner|banniere|declinaison|"
                                                                r"\bexe\b|flyer|kakemono|roll ?up|\bplv\b|stop ?rayon|wobbler|presentoir|\btg\b|gondole|chevalet|menu|fresque|sticker", n):
        if paq and re.search(r"etiquette|label", n): return "Étiquette", ""
        if paq or len(L) < 25: return "Packshot", ""
    if e in SOURCE: return f"Source {SOURCE[e]}", ""
    if re.search(r"\bbat\b", n): return "BAT", ""
    if re.search(r"\bexe\b|\bexé", n): return "Exé", ""
    if re.search(r"\bmaster\b|\bkv\b", n): return "KV master" if re.search(r"master", n) else "KV", ""
    if "/Masters & déclinaisons/" in p or re.search(r"declinaison", n): return "Déclinaison", ""
    if L: return "Visuel", ""
    return "Image", ""

if __name__ == "__main__":
    _, OCR, OFFICE, SORTIE = sys.argv
    os.makedirs(SORTIE, exist_ok=True)
    X = {}
    for f in OCR.split(","):
        for l in open(f):
            try: x = json.loads(l); X[x["p"]] = x
            except Exception: pass
    office = {}
    for l in open(OFFICE):
        o = json.loads(l); office[o["p"]] = o["texte"]
        X.setdefault(o["p"], {"p": o["p"], "lignes": [[s, 1, 0.01, 0] for s in re.split(r"(?<=[.!?])\s+", o["texte"])[:3]]})
    lignes_csv, conflits, skus = [], [], []
    CATALOGUE = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "depots", "beignet-paradise.json")))["sku"]
    # Ce qu'on ne renomme jamais : les fichiers d'un paquet de mise en page (InDesign « Links », polices du document, un dossier
    # qui contient un .indd, un .aep ou un .prproj — les renommer casse la maquette) et les couvertures générées par l'export.
    paquet = {}
    def dans_un_paquet(p):
        d = os.path.dirname(p)
        if re.search(r"/(Links|Document fonts|Fonts|Footage|\(Footage\))(/|$)", d): return True
        for _ in range(2):   # le dossier du fichier et son parent : là où vivent les sources liées
            if not d.startswith((RM, RU)) or d in (RM, RU): break
            if d not in paquet:
                try: paquet[d] = any(f.lower().endswith((".indd", ".idml", ".aep", ".prproj", ".fcpxml")) for f in os.listdir(d))
                except OSError: paquet[d] = False
            if paquet[d]: return True
            d = os.path.dirname(d)
        return False
    for p, x in sorted(X.items()):
        if not os.path.exists(p): continue
        if os.path.basename(p).startswith("_couverture") or dans_un_paquet(p): continue
        L = x.get("lignes") or []
        dossier, court = marque_dossier(p)
        lues = marques_lues(L)
        marque_nom, dest_dossier = court, None
        if lues and dossier and p.startswith(RM + os.sep):
            top, pt = lues.most_common(1)[0]
            dans = dossier in lues or any(d.startswith(dossier + "/") or dossier.startswith(d + "/") for d in lues)
            # La marque lue contredit le dossier : seulement si elle pèse (logo, gros titre) et que le dossier n'est pas lu du tout.
            if not dans and pt >= 1.6 and top != dossier and not dossier.startswith("_Autres comptes/") or (
               dossier.startswith("NSIA/") and top.startswith("NSIA/") and top != dossier and lues[top] > 2 * lues.get(dossier, 0) + 1):
                dest_dossier = top; marque_nom = COURT.get(top, court)
                conflits.append((p, dossier, top, round(pt, 2)))
        elif p.startswith(RU + os.sep):
            rel = os.path.relpath(p, RU).split(os.sep)
            marque_nom = rel[1] if rel[0] in ("Friends Photography Studio",) and len(rel) > 2 else rel[0]
            marque_nom = {"_UPgraders — la structure": "UPgraders", "KOF - Kamer Otaku Fest": "KOF", "Universal Music - artistes": "Universal Music",
                          "_Le studio": "Friends Studio"}.get(marque_nom, marque_nom)
        typ, info = typer(x, office)
        fmt = "" if typ in ("Packshot", "Logo", "Goodies", "Image IA", "Photo", "Image") else format_de(x) if typ not in ("Document", "Brief", "Devis", "Facture", "Bon de commande", "Compte rendu", "Plan média", "Planning",
                                          "Contrat", "Recommandation", "Script", "Rapport", "Présentation", "Tableau", "Charte", "Capture d'écran") else ""
        excl = [rx for rx, _, _ in MARQUES] + [r"bonnet", r"rouge", r"friesland ?campina", r"nsia", r"cadyst", r"panzani", r"frieslandcampina"]
        tt = titre(L, excl)
        # La fiche SKU : ce que le visuel dit du produit (marque, catégorie, variante, grammage, promo…).
        texte = " ".join(l[0] for l in L) + " " + office.get(p, "")[:400]
        fs = sku_lu.fiche(texte, os.path.basename(p), marque_nom) if typ not in ("Document", "Contrat", "Facture", "Devis", "Planning", "Compte rendu", "Photo") else {}
        # Le produit lu dit le groupe : un lait n'est jamais chez Ecobank (le dossier « BOITES 2 » des packshots FrieslandCampina
        # par marché y avait été rangé avant les exports). La marque vient alors de ce qu'on lit, puis du nom du fichier.
        GROUPE = {"IMP": "FrieslandCampina", "EVAP": "FrieslandCampina", "SCM": "FrieslandCampina", "UHT": "FrieslandCampina",
                  "YAOURT": "FrieslandCampina", "FARINE": "Cadyst Group", "ALIMENT ANIMAL": "Cadyst Group/Robuste"}
        g = GROUPE.get(fs.get("categorie"))
        if p.startswith(RM + os.sep) and g and dossier and not dossier.startswith(g) and typ in ("Packshot", "Étiquette", "Visuel", "Image", "Source PSD", "Source AI"):
            nf = norme(os.path.basename(p)); dd = None
            fc = [d for d, _ in lues.most_common() if d.startswith(g)]
            if fc: dd = fc[0]
            elif g == "FrieslandCampina":
                for rx, d in [(r"\bpeak\b", "FrieslandCampina/Peak"), (r"\b(bh|belle)\b", "FrieslandCampina/Belle Hollandaise"), (r"\bpearl\b", "FrieslandCampina/Pearl"),
                              (r"\b(br|brb|bonnet|red|blue|ren|bleu|rouge)\b|^br", "FrieslandCampina/Bonnet Rouge")]:
                    if re.search(rx, nf): dd = d; break
            elif g == "Cadyst Group":
                dd = "Cadyst Group/Cadyst Grain" if not re.search(r"amigo|migo", nf + " " + norme(texte)) else "Cadyst Group/Amigo"
            dd = dd or g
            conflits.append((p, dossier, dd, "produit lu : " + fs.get("categorie", "")))
            dest_dossier = dd; marque_nom = COURT.get(dd, dd.split("/")[-1])
            fs = sku_lu.fiche(texte, os.path.basename(p), marque_nom)
        if typ in ("Packshot", "Étiquette"):
            tt = " · ".join(x for x in [sku_lu.libelle(fs), sku_lu.promo_joli(fs.get("promo", ""))] if x)[:90] or tt
        if fs.get("marque", "").startswith("MQ-pz-") and typ in ("Packshot", "Étiquette"):
            gm = {"MQ-pz-barka": "Barka", "MQ-pz-salaka": "Salaka", "MQ-pz-gold": "La Pasta Gold", "MQ-pz-pasta-first": "Pasta First", "MQ-pz-delys": "Delys",
                  "MQ-pz-leader-bleu": "Leader Bleu", "MQ-pz-leader-vert": "Leader Vert", "MQ-pz-gold-premium": "Gold Premium"}.get(fs["marque"])
            if gm and gm not in marque_nom: marque_nom = f"{marque_nom} {gm}" if marque_nom in ("La Pasta", "Panzani", "Cadyst") else gm
        if fs:
            skus.append({"p": p, "type": typ, "marque_dossier": dossier, "campagne": campagne_dossier(p), "fiche": {k: v for k, v in fs.items() if k != "_poids"},
                         "sku": sku_lu.apparier(fs, CATALOGUE)})
        if typ == "Logo":
            autres = [l[0] for l in L if not any(re.search(rx, norme(l[0])) for rx in excl) and len(norme(l[0])) > 2 and l[1] >= 0.8
                      and all(len(m) >= 3 and m.isalpha() for m in norme(l[0]).split())]
            tt = ("spécial " + " ".join(autres))[:60] if autres else ""
        camp = campagne_dossier(p)
        if dest_dossier: camp = re.sub(r"^.*? (20\d\d)$", r"\1", camp) if camp else camp
        morceaux = [marque_nom, camp, (typ + (" " + fmt if fmt else "")).strip(), tt]
        lg = langue(L) if typ not in ("Photo", "Image", "Image IA", "Logo") else ""
        var = variante(os.path.basename(p))
        if "BAT" in var and typ == "BAT": var.remove("BAT")
        queue = ", ".join([v for v in [lg] + var + ([info] if info else []) if v])
        if queue: morceaux.append(queue)
        e = os.path.splitext(p)[1]
        nouveau_nom = propre(" — ".join(m for m in morceaux if m))[:180] + e.lower()
        dos = os.path.dirname(p)
        if dest_dossier and dest_dossier.startswith("U:"):   # un fichier UPgraders égaré dans l'export Matanga
            an = re.search(r"/(20\d\d)(/|$)", os.path.dirname(p))
            dos = os.path.join(RU, dest_dossier[2:], an.group(1) if an else "", "Depuis l'export Matanga")
        elif dest_dossier:
            rel = os.path.relpath(dos, os.path.join(RM, dossier))
            dos = os.path.join(RM, dest_dossier, rel)
        lignes_csv.append({"actuel": p, "nouveau": os.path.join(dos, nouveau_nom), "motif": "renommé après lecture" + (f" · marque lue : {COURT.get(dest_dossier)}" if dest_dossier else ""),
                           "type": typ, "format": fmt, "titre": tt, "marque_lue": ";".join(f"{COURT.get(k, k)}:{round(v, 1)}" for k, v in lues.most_common(3))})
    # Un dossier qui mélange les formats (des 6x3 et des 4x3 côte à côte) : chaque format dans son sous-dossier.
    VISUELS = {"Visuel", "KV", "KV master", "Déclinaison", "Exé", "BAT", "Source PSD", "Source AI", "Source PSB", "Image"}
    par_dos = collections.defaultdict(list)
    for l in lignes_csv:
        if l["type"] in VISUELS and l["format"] and not re.match(r"^\d{3,}x\d{3,}$", l["format"]): par_dos[os.path.dirname(l["nouveau"])].append(l)
    for dos, ls in par_dos.items():
        fmts = collections.Counter(l["format"] for l in ls)
        if len(fmts) >= 2 and len(ls) >= 4 and not os.path.basename(dos).startswith("Format "):
            for l in ls: l["nouveau"] = os.path.join(dos, "Format " + l["format"], os.path.basename(l["nouveau"]))
    # Deux fichiers qui recevraient le même nom dans le même dossier : on les numérote, dans l'ordre du nom d'origine.
    par = collections.defaultdict(list)
    for l in lignes_csv: par[l["nouveau"]].append(l)
    for k, ls in par.items():
        if len(ls) > 1:
            b, e = os.path.splitext(k)
            for i, l in enumerate(sorted(ls, key=lambda l: l["actuel"]), 1): l["nouveau"] = f"{b} — {i:02d}{e}"
    with open(os.path.join(SORTIE, "gestes.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["actuel", "nouveau", "motif", "type", "format", "titre", "marque_lue"]); w.writeheader(); w.writerows(lignes_csv)
    with open(os.path.join(SORTIE, "conflits.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh); w.writerow(["fichier", "dossier", "marque lue", "poids"]); w.writerows(conflits)
    with open(os.path.join(SORTIE, "sku.jsonl"), "w", encoding="utf-8") as fh:
        for s in skus: fh.write(json.dumps(s, ensure_ascii=False) + "\n")
    print(len(skus), "fichiers montrent un produit ·", sum(1 for s in skus if s["sku"]), "rapprochés du catalogue")
    c = collections.Counter(l["type"] for l in lignes_csv)
    print(len(lignes_csv), "fichiers ·", len(conflits), "marques lues contre le dossier ·", dict(c.most_common()))
