# disque-2026.py — les vidéos et les EXE des exports, visibles dans LA BARRE locale.
#
# Demande d'Alex (07/10/2026) : « rends-les disponibles dans la version locale de LA BARRE,
# pareil pour les EXE ». Le dépôt ne porte que des chemins et des aperçus : les octets restent
# dans les exports, et le serveur local les lit par /disque/<export>/<chemin>.
#
#   1. chaque vidéo et chaque fichier rangé dans un dossier EXE est rattaché à l'objet LA BARRE
#      que son dossier désigne — CAMPAGNE.md (nom exact de la campagne), sinon MARQUE.md (la marque),
#      sinon PORTEUR.md (la campagne du porteur dont l'année colle, sinon la marque du porteur) ;
#   2. un aperçu JPEG de revue est rangé sous assets/review/disque/ (local) ;
#   3. un livrable qui pointe une image de l'export sans vignette en reçoit une
#      (assets/review/livrables-disque/).
# Le proxy en ligne (copies de moins de 200 Ko) est le travail de proxy-2026.py.
#
# Usage : python3 outils/disque-2026.py <depot.json> <sortie.json> <trame-binaire>

import json, os, re, sys, hashlib, subprocess, shutil, tempfile, datetime, collections
from PIL import Image

SRC, DST, TRAME = sys.argv[1], sys.argv[2], sys.argv[3]
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = os.path.expanduser("~")
EXPORTS = {"matanga": H + "/Downloads/MATANGA — EXPORT DU TRAVAIL", "upgraders": H + "/Downloads/UPGRADERS — EXPORT DU TRAVAIL"}
CODE = ("/Spawt/08 PRODUIT & APPLICATION/", "/SPAWT Design System", "/_UPgraders — la structure/upgraders os v1")
VIDEOS = (".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".mts")
d = json.load(open(SRC))
CAMP = {c["nom"]: c for c in d["campagnes"]}
MARQ = {m["nom"]: m for m in d["marques"]}
apercus = os.path.join(APP, "assets/review/disque"); os.makedirs(apercus, exist_ok=True)

def cle(t): return hashlib.sha1(t.encode()).hexdigest()

def titre_md(p):
    try: return open(p, encoding="utf-8").readline().lstrip("# ").strip()
    except OSError: return None

def jpeg(im, dst, cote):
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA"); fond = Image.new("RGB", im.size, "white"); fond.paste(im, mask=im.split()[3]); im = fond
    im = im.convert("RGB"); im.thumbnail((cote, cote)); im.save(dst, "JPEG", quality=84, optimize=True)

def apercu(chemin_abs, ext, dst, cote=1280):
    """Un aperçu de revue, ou None. Jamais d'erreur bloquante : un fichier qui ne se rend pas reste listé."""
    if os.path.exists(dst): return dst
    try:
        if ext in VIDEOS:
            pre = dst[:-4]
            subprocess.run([TRAME, chemin_abs, pre], capture_output=True, timeout=60)
            if os.path.exists(pre + "_0.jpg"):
                jpeg(Image.open(pre + "_0.jpg"), dst, cote); os.remove(pre + "_0.jpg"); return dst
            return None
        if ext in (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".gif", ".bmp"):
            Image.MAX_IMAGE_PIXELS = None
            jpeg(Image.open(chemin_abs), dst, cote); return dst
        src = chemin_abs
        tmp = None
        if ext == ".ai":   # un .ai compatible PDF se lit comme un PDF
            tmp = tempfile.mkdtemp(); src = os.path.join(tmp, "a.pdf"); shutil.copyfile(chemin_abs, src)
        r = subprocess.run(["sips", "-s", "format", "jpeg", "-Z", str(cote), src, "--out", dst], capture_output=True, timeout=120)
        if tmp: shutil.rmtree(tmp, ignore_errors=True)
        if r.returncode == 0 and os.path.exists(dst):
            jpeg(Image.open(dst), dst, cote); return dst
    except Exception:
        pass
    if os.path.exists(dst): os.remove(dst)
    return None

def duree(chemin_abs):
    r = subprocess.run([TRAME, chemin_abs, "/dev/null/x"], capture_output=True, text=True, timeout=60)
    try: return float(r.stdout.split()[0])
    except (ValueError, IndexError): return None

def porteur(dossier, racine):
    """Le PORTEUR.md le plus proche : son titre et ses campagnes."""
    q = dossier
    while q.startswith(racine + os.sep):
        p = os.path.join(q, "PORTEUR.md")
        if os.path.exists(p):
            texte = open(p, encoding="utf-8").read()
            return texte.splitlines()[0].lstrip("# ").strip(), re.findall(r"^- Campagne : (.+)$", texte, re.M)
        q = os.path.dirname(q)
    return None, []

def cible(chemin_abs, racine):
    q = os.path.dirname(chemin_abs)
    while q.startswith(racine + os.sep):
        for md, table in (("CAMPAGNE.md", CAMP), ("MARQUE.md", MARQ)):
            t = titre_md(os.path.join(q, md)) if os.path.exists(os.path.join(q, md)) else None
            if t and t in table: return table[t]
        q = os.path.dirname(q)
    nom, camps = porteur(os.path.dirname(chemin_abs), racine)
    camps = [CAMP[c] for c in camps if c in CAMP]
    an = re.search(r"/(20\d\d)/", chemin_abs)
    if camps:
        bon = [c for c in camps if an and an.group(1) in c["nom"]]
        return (bon or camps)[0]
    if nom and nom in MARQ: return MARQ[nom]
    # le dossier de premier niveau porte souvent le nom de la marque
    parts = os.path.relpath(chemin_abs, racine).split(os.sep)[:-1]
    for t in reversed(parts[:3]):
        if t in MARQ: return MARQ[t]
    return None

par_objet = collections.defaultdict(list); sans_place = []; n_apercus = 0
for k, racine in EXPORTS.items():
    for dp, dn, fn in os.walk(racine):
        if any(c in dp + "/" for c in CODE): dn[:] = []; continue
        dans_exe = os.path.basename(dp) == "EXE"
        for f in fn:
            if f.startswith("._"): continue
            ext = os.path.splitext(f)[1].lower()
            genre = "video" if ext in VIDEOS else ("exe" if dans_exe else None)
            if not genre: continue
            p = os.path.join(dp, f); rel = k + "/" + os.path.relpath(p, racine)
            x = {"id": "D-" + cle(rel)[:10], "genre": genre, "nom": f, "chemin": rel, "ext": ext,
                 "octets": os.path.getsize(p)}
            if genre == "video": x["duree"] = duree(p)
            a = apercu(p, ext, os.path.join(apercus, cle(rel)[:16] + ".jpg"))
            if a: x["apercu"] = os.path.relpath(a, APP); n_apercus += 1
            o = cible(p, racine)
            if o is None: x["dossier"] = "/".join(rel.split("/")[1:3]); sans_place.append(x); continue
            par_objet[o["id"]].append(x)

n_c = n_m = 0
for o in d["campagnes"] + d["marques"]:
    o.pop("disque", None)
    if o["id"] in par_objet:
        o["disque"] = sorted(par_objet[o["id"]], key=lambda x: (x["genre"] != "video", x["nom"]))
        if o in d["campagnes"]: n_c += 1
        else: n_m += 1
d["disque_sans_place"] = sorted(sans_place, key=lambda x: x["chemin"])

# Les livrables qui pointent une image de l'export sans vignette.
vign = os.path.join(APP, "assets/review/livrables-disque"); os.makedirs(vign, exist_ok=True)
n_l = 0
for p in d["projets"]:
    for l in p.get("livrables", []):
        o = (l.get("releve") or {}).get("origine_disque")
        if l.get("vignette") or not o: continue
        a = o.replace("~", H, 1)
        ext = os.path.splitext(a)[1].lower()
        if not os.path.exists(a) or ext not in (".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"): continue
        v = apercu(a, ext, os.path.join(vign, cle(o)[:16] + ".jpg"), 1600)
        if v: l["vignette"] = os.path.relpath(v, APP); n_l += 1

tot = sum(len(v) for v in par_objet.values())
d["enregistre_le"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
d.setdefault("journal", []).append({"quand": d["enregistre_le"], "qui": "creation", "action": "le disque de l'agence relevé",
    "type": "disque", "id": None, "detail": f"{tot} vidéos et EXE rattachés à {n_c} campagnes et {n_m} marques · "
    f"{len(sans_place)} sans place · {n_l} livrables reçoivent leur vignette"})
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(tot, "fichiers ·", n_apercus, "aperçus ·", n_c, "campagnes ·", n_m, "marques ·", len(sans_place), "sans place ·", n_l, "vignettes de livrables")
