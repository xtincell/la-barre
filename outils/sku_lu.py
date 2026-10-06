# sku_lu.py — la fiche SKU d'un fichier, lue sur le visuel : marque, catégorie, variante, produit, contenant,
# grammage ou volume, lot, portions, promo, prix. Sert au nommage des exports et au rattachement des campagnes à leurs SKU.
# Demande d'Alex (06/10/2026) : « note aussi les grammages/litrages des produits, et toute information importante qui
# pourrait servir à classifier les SKU de la marque — les campagnes qui incluent ces SKU doivent être associées à eux. »
import re, unicodedata

def norme(t): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9%+&,.]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower())).strip()

# Nom court (dossier ou marque lue) → identifiant de marque dans LA BARRE
MARQUE_ID = {"Bonnet Rouge": "MQ-br", "Peak": "MQ-peak", "Belle Hollandaise": "MQ-bh", "Rainbow": "MQ-rainbow", "Omela": "MQ-omela",
             "Pearl": "MQ-pearl", "Coast": "MQ-coast", "Nunu": "MQ-nunu", "Dutch Lady": "MQ-dl", "Pasta First": "MQ-pz-pasta-first",
             "La Pasta Gold": "MQ-pz-gold", "La Pasta": "MQ-lapasta", "Panzani": "MQ-panzani", "Delys": "MQ-pz-delys", "Barka": "MQ-pz-barka",
             "Salaka": "MQ-pz-salaka", "Amigo": "MQ-amigo", "Soft Baker": "MQ-softbaker", "Cadyst Grain": "MQ-cgrain", "MACI": "MQ-maci",
             "La Vache qui rit": "MQ-lvqr", "Apéricube": "MQ-apericube", "Phosphatine": "MQ-phosphatine", "Tradex": "MQ-tradex",
             "Frutas": "MQ-frutas", "Cap Esterias": "MQ-capesterias", "Mamy Makala": "MQ-mm", "Kitoko": "MQ-kitoko", "Cadyst Farming": "MQ-cfarming"}
# Les gammes Panzani, lues sur le paquet
GAMMES_PZ = [(r"\bleader\b.{0,10}\bbleu", "MQ-pz-leader-bleu"), (r"\bleader\b.{0,10}\bvert", "MQ-pz-leader-vert"), (r"\bsalaka\b", "MQ-pz-salaka"),
             (r"\bsalma\b", "MQ-pz-salma"), (r"\bhermina\b", "MQ-pz-hermina"), (r"\bmado\b", "MQ-pz-mado"), (r"\bketty\b", "MQ-pz-ketty"),
             (r"\bvilva\b", "MQ-pz-vilva"), (r"\bolympic\b", "MQ-pz-olympic"), (r"\bfratelli\b", "MQ-pz-fratelli"), (r"\bpasta cook\b", "MQ-pz-pasta-cook"),
             (r"\bpasta food\b", "MQ-pz-pasta-food"), (r"\bgold premium\b", "MQ-pz-gold-premium"), (r"\bbarka\b", "MQ-pz-barka"),
             (r"\bpasta first\b", "MQ-pz-pasta-first"), (r"\bdelys\b", "MQ-pz-delys")]

CATEGORIES = [("SCM", r"concentre sucre|sweetened condensed|\bscm\b"), ("EVAP", r"\bevap|evapore|evaporated|concentre non sucre|unsweetened"),
              ("IMP", r"\bimp\b|\bivmp\b|en poudre|\bpowder|instant milk|lait entier en poudre|poudre de lait"), ("UHT", r"\buht\b|lait a boire|sterilise"),
              ("YAOURT", r"yaourt|yogoo|yogurt|yoghurt"), ("PATES", r"spaghetti|macaroni|coquillette|vermicell|penne|torsade|lasagn|tagliatell|\bpates?\b"),
              ("BISCUIT", r"biscuit|cookie|gaufrette"), ("FROMAGE", r"fromage|cheese|portions?\b|aperi"), ("CEREALES", r"cereales?|bouillie|farine infantile"),
              ("FARINE", r"farine|flour"), ("ALIMENT ANIMAL", r"aliment (complet|betail|volaille)|bovins|porcs|lapins|pondeuse|poulet de chair|volailles?\b"),
              ("LUBRIFIANT", r"huile moteur|\b2t\b|\b4t\b|jaso|lubrifiant|motor oil"), ("VIN", r"\bvin\b|mousseux|\brose\b|sparkling|\bwine\b")]
VARIANTES = {"MQ-br": [("Gold", r"\bgold\b"), ("Délice", r"delice"), ("Bleu", r"\bbleu\b|\bblue\b|\bbrb\b|blauw"), ("Rouge", r"\brouge\b|\bred\b")],
             "MQ-peak": [("Full Cream", r"full cream"), ("Low Fat", r"low fat|demi ecreme"), ("Green", r"\bgreen\b|\bvert\b"), ("Regular", r"regular")]}
PRODUITS = [r"spaghetti", r"macaroni (coude|tortille|amoureux)", r"coquillettes?", r"vermicelles?", r"penne", r"torsades?", r"lasagnes?", r"tagliatelles?",
            r"biscuit fourre", r"(bovins|porcs|lapins|poulet|pondeuse|volaille)s?( croissance| demarrage| finition| ponte)?",
            r"farine de ble( [a-z]+)?", r"2t jaso fc|2t|4t"]
VINS = r"\b(rose|rouge|blanc|mousseux|demi sec|brut)\b"
CONTENANTS = [("boîte", r"\bboite|\btin\b|\bcan\b|\bcanette"), ("sachet", r"\bsachet|\bpacket|\bpouch|\bsleeve"), ("brique", r"\bbrique|tetra|\bbrick"),
              ("bouteille", r"bouteille|bottle"), ("sac", r"\bsac\b|\bbag\b"), ("pot", r"\bpot\b"), ("carton", r"\bcarton\b"), ("paquet", r"\bpaquet\b|\bpack\b(?! gener)")]
# Une boîte en anglais, une en français, une bilingue : trois SKU. La langue se lit sur l'emballage, et dans le nom du fichier.
LANGUE_FR = r"\b(lait|entier|poudre|concentre|sucre|evapore|cremeux|riche|vitamines|proteines|pates|farine|gratuits?|offerts?|poids net|saveur|gout|nouveau|ecreme|enrichi|sans)\b"
LANGUE_EN = r"\b(milk|full cream|powder|evaporated|sweetened|condensed|creamy|rich|free|net weight|flavou?r|new|vitamins|proteins|skimmed|enriched|with)\b"
LANGUE_NOM = [("FR", r"\bfr\b|french|frans|francais|\bfra\b"), ("EN", r"\ben\b|\beng\b|english|engels|anglais")]
SAVEURS = [("fraise", r"fraise|strawberr"), ("vanille", r"vanill"), ("chocolat", r"chocola"), ("banane", r"banan"), ("miel", r"\bmiel\b|honey"),
           ("multicéréales", r"multi ?cereal|multigrain"), ("nature", r"\bnature\b|\bplain\b"), ("orange", r"\borange\b"), ("ananas", r"ananas|pineapple"),
           ("café", r"\bcafe\b|coffee"), ("caramel", r"caramel"), ("fruits", r"\bfruits?\b"), ("coco", r"\bcoco\b|coconut"), ("citron", r"citron|lemon"),
           ("biscuit", r"biscuit(?!s? fourre)"), ("tomate", r"\btomate"), ("poulet", r"\bpoulet\b(?! de chair)|chicken"), ("piment", r"piment|chili")]
GAMMES = [("Premium", r"\bpremium\b"), ("Junior", r"\bjunior\b"), ("Croissance", r"\bcroissance\b|growing up"), ("Lactée", r"\blactee\b"),
          ("Nursie", r"\bnursie\b"), ("Classic", r"\bclassi[cq]"), ("Original", r"\boriginal\b"), ("Light", r"\blight\b|allege"),
          ("Qualité supérieure", r"qualite superieure"), ("Instant", r"\binstant\b"), ("Sport", r"\bsport\b"), ("Gold", r"\bgold\b")]

POIDS = re.compile(r"(?<![\d,.])(\d{1,4}(?:[.,]\d{1,2})?) ?(kg|kilogram|g|gr|gram|grammes?|ml|cl|l|litres?|liters?)(?![a-z])")
LOT = re.compile(r"(?<!\d)(\d{1,3}) ?[x×] ?(\d{1,4}(?:[.,]\d+)?) ?(kg|g|ml|cl|l)\b|carton de (\d{1,3})")
PORTIONS = re.compile(r"(?<!\d)(\d{1,2}) ?portions?")
PRIX = re.compile(r"(?<![\d.])(\d{2,3}(?:[ .]\d{3})?|\d{2,5}) ?(f ?cfa|fcfa|frs?|f)\b")
PROMO = re.compile(r"(\+ ?\d{1,2} ?% ?(gratuits?|offerts?|free|extra|de plus|more)?|\d{1,2} ?% ?(gratuits?|offerts?|free|extra|de plus|more)|"
                   r"pack (generosite|famille|eco|promo|decouverte|economique)|(\d{1,3}) ?(g|ml) (gratuits?|offerts?|free)|"
                   r"\b(1|2|3) ?\+ ?(1|2)\b|meme prix|prix (choc|special|bas)|mini prix|edition (limitee|speciale|collector)|\b100 ans\b|100 jaar|"
                   r"jeu concours|a gagner|grattez|tombola)")

def g_ml(q, u):
    q = float(q.replace(",", "."))
    u = u.lower()
    if u.startswith("kilo") or u == "kg": return q * 1000, "g"
    if u in ("g", "gr") or u.startswith("gram"): return q, "g"
    if u == "ml": return q, "ml"
    if u == "cl": return q * 10, "ml"
    return q * 1000, "ml"
def joli(v, u):
    if u == "g": return f"{v / 1000:g} kg" if v >= 1000 and v % 100 == 0 else f"{v:g} g"
    if v in (330, 700, 750, 1500): return f"{v / 10:g} cl"
    return f"{v / 1000:g} L" if v >= 1000 else f"{v:g} ml"

def fiche(texte, nom_fichier, marque_court=None):
    """texte : tout ce qu'on lit (OCR + nom du fichier). Rend la fiche ; vide si rien ne parle d'un produit."""
    nf = re.sub(r"(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z]{2})", " ", re.sub(r"[_\-+]+", " ", nom_fichier))
    t = norme(texte + " " + nf)
    f = {}
    mid = MARQUE_ID.get(marque_court or "")
    for rx, g in GAMMES_PZ:
        if re.search(rx, t): mid = g; break
    if mid: f["marque"] = mid
    for c, rx in CATEGORIES:
        if re.search(rx, t): f["categorie"] = c; break
    tv = re.sub(r"bonnet ?rouge", " ", t)   # le « Rouge » du nom de marque n'est pas la variante Rouge
    for v, rx in VARIANTES.get(mid, []):
        if re.search(rx, tv): f["variante"] = v; break
    prods = []
    for rx in PRODUITS:
        m = re.search(rx, t)
        if m and m.group(0) not in prods: prods.append(m.group(0))
    if f.get("categorie") == "VIN":
        prods += [m.group(0) for m in re.finditer(VINS, t) if m.group(0) not in prods]
    if prods: f["produit"] = ", ".join(prods[:3])
    for c, rx in CONTENANTS:
        if re.search(rx, t): f["contenant"] = c; break
    poids = []
    for m in POIDS.finditer(t):
        v, u = g_ml(m.group(1), m.group(2))
        if (u == "g" and 5 <= v <= 50000) or (u == "ml" and 20 <= v <= 20000):
            if (v, u) not in poids: poids.append((v, u))
    if poids: f["poids"] = [joli(v, u) for v, u in poids[:6]]; f["_poids"] = poids[:6]
    m = LOT.search(t)
    if m: f["lot"] = (f"x{m.group(1)} {m.group(2)} {m.group(3)}" if m.group(1) else f"carton de {m.group(4)}")
    m = PORTIONS.search(t)
    if m: f["portions"] = int(m.group(1))
    nfn = norme(nf)
    lg = next((c for c, rx in LANGUE_NOM if re.search(rx, nfn)), None)
    if not lg:
        tl = norme(texte)
        fr, en = len(re.findall(LANGUE_FR, tl)), len(re.findall(LANGUE_EN, tl))
        lg = "FR-EN" if fr >= 1 and en >= 1 and min(fr, en) * 3 >= max(fr, en) else "FR" if fr > en else "EN" if en > fr else None
    if lg: f["langue"] = lg
    sv = [c for c, rx in SAVEURS if re.search(rx, t)]
    if sv and f.get("categorie") not in ("ALIMENT ANIMAL", "LUBRIFIANT", "VIN"): f["saveur"] = ", ".join(sv[:3])
    gm = [c for c, rx in GAMMES if re.search(rx, t) and c != f.get("variante")]
    if gm: f["gamme"] = ", ".join(gm[:2])
    pr = sorted({m.group(0).strip() for m in PROMO.finditer(t)}, key=len, reverse=True)
    if pr: f["promo"] = ", ".join(pr[:3])
    m = PRIX.search(t)
    if m and f.get("categorie"): f["prix"] = m.group(1).replace(" ", "").replace(".", "") + " F"
    return f if (f.get("categorie") or f.get("poids") or f.get("produit")) else {}

def libelle(f):
    """« IMP Rouge boîte 400 g » — la forme courte, pour un nom de fichier."""
    b = [f.get("categorie") if f.get("categorie") not in ("PATES", "FROMAGE", "BISCUIT", "ALIMENT ANIMAL") else None,
         f.get("variante"), f.get("gamme"), f.get("produit"), f.get("saveur"), f.get("contenant"), " / ".join(f.get("poids", [])[:3]),
         f"{f['portions']} portions" if f.get("portions") else None, f.get("lot")]
    return " ".join(x for x in b if x) + (f" ({f['langue']})" if f.get("langue") else "")

def apparier(f, catalogue):
    """Les SKU du catalogue LA BARRE que la fiche désigne : même marque, même grammage, catégorie et variante compatibles."""
    if not f.get("marque"): return []
    out = []
    for s in catalogue:
        if s.get("marque") != f["marque"] or s.get("archive"): continue
        fm = re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b", (s.get("format") or "").lower())
        sv = g_ml(fm.group(1), fm.group(2)) if fm else None
        if f.get("_poids") and sv and sv not in f["_poids"]: continue
        if f.get("_poids") and not sv: continue
        if s.get("categorie") and f.get("categorie") and s["categorie"] != f["categorie"] and f["categorie"] not in ("PATES", "BISCUIT"): continue
        if s.get("variante") and f.get("variante") and s["variante"] != f["variante"]: continue
        sl = (s.get("langue") or "").upper()
        if sl and f.get("langue") and sl != f["langue"]: continue
        if s.get("saveur") and f.get("saveur") and s["saveur"] != f["saveur"]: continue
        if not f.get("_poids") and not (s.get("categorie") and s.get("categorie") == f.get("categorie") and s.get("variante") and s.get("variante") == f.get("variante")): continue
        score = (2 if s.get("categorie") == f.get("categorie") else 0) + (2 if s.get("variante") == f.get("variante") else 0) + (0 if s.get("aQualifier") else 1)
        prod = f.get("produit", "")
        if prod and any(w in norme(s.get("nom", "")) for w in prod.split() if len(w) > 4): score += 3
        out.append((score, s["id"]))
    out.sort(reverse=True)
    if not out: return []
    top = out[0][0]
    return [i for sc, i in out if sc == top][:4]

JOLI = {"generosite": "générosité", "economique": "économique", "decouverte": "découverte", "meme prix": "même prix", "edition": "édition",
        "limitee": "limitée", "speciale": "spéciale", "a gagner": "à gagner", "special": "spécial", "100 jaar": "100 ans"}
def promo_joli(p):
    for a, b in JOLI.items(): p = p.replace(a, b)
    return p[:1].upper() + p[1:] if p else p
