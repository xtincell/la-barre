# proxy-2026.py — le dossier proxy : des copies compressées, pour le site en ligne seulement.
#
# Demande d'Alex (07/10/2026) : « Ce sont les png/jpg que tu peux mettre en ligne, des versions
# compressées (moins de 200 Ko) » · « crée un dossier proxy uniquement pour le site en ligne avec
# les versions compressées des images dedans ».
#
# Chaque image que le dépôt cite (assets/review/…) reçoit sa copie sous assets/review/proxy/,
# de moins de 200 Ko, au même chemin relatif. Le dépôt garde la correspondance dans `proxys`
# (original → copie) : en local l'application montre l'original, en ligne la copie (DISQUE.src).
# Les vidéos et les EXE n'ont pas de proxy : ils restent au disque.
#
# Usage : python3 outils/proxy-2026.py <depot.json> <sortie.json> [--envoyer]

import json, os, re, sys, io, base64, urllib.request, datetime
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
ENVOYER = "--envoyer" in sys.argv
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://labarre.powerupgraders.com/"
PLAFOND = 200 * 1024
IMG = re.compile(r"^assets/review/(?!proxy/).+\.(jpg|jpeg|png|webp)$", re.I)
Image.MAX_IMAGE_PIXELS = None
d = json.load(open(SRC))

cites = set()
def relever(o):
    if isinstance(o, dict): [relever(v) for k, v in o.items() if k != "proxys"]
    elif isinstance(o, list): [relever(v) for v in o]
    elif isinstance(o, str) and IMG.match(o): cites.add(o)
relever(d)

def transparent(im):
    if im.mode not in ("RGBA", "LA", "P"): return False
    a = im.convert("RGBA").split()[3]
    return a.getextrema()[0] < 250

def comprimer(src, dst_base):
    """Rend le chemin de la copie (.jpg, ou .png si l'image est vraiment transparente)."""
    im = Image.open(src); im.load()
    if transparent(im):
        im = im.convert("RGBA"); cote = 1200
        while cote >= 200:
            t = im.copy(); t.thumbnail((cote, cote))
            b = io.BytesIO(); t.quantize(colors=128, method=Image.Quantize.FASTOCTREE).save(b, "PNG", optimize=True)
            if b.tell() <= PLAFOND:
                open(dst_base + ".png", "wb").write(b.getvalue()); return dst_base + ".png"
            cote = int(cote * 0.8)
    if im.mode != "RGB":
        fond = Image.new("RGB", im.size, "white")
        if im.mode in ("RGBA", "LA", "P"): im = im.convert("RGBA"); fond.paste(im, mask=im.split()[3])
        else: fond.paste(im.convert("RGB"))
        im = fond
    cote = 1600
    while True:
        t = im.copy(); t.thumbnail((cote, cote))
        for q in (82, 74, 66, 58, 50):
            b = io.BytesIO(); t.save(b, "JPEG", quality=q, optimize=True, progressive=True)
            if b.tell() <= PLAFOND:
                open(dst_base + ".jpg", "wb").write(b.getvalue()); return dst_base + ".jpg"
        cote = int(cote * 0.8)

proxys, manquants, poids = {}, [], 0
for c in sorted(cites):
    src = os.path.join(APP, c)
    if not os.path.exists(src): manquants.append(c); continue
    base = os.path.join(APP, "assets/review/proxy", os.path.splitext(c[len("assets/review/"):])[0])
    os.makedirs(os.path.dirname(base), exist_ok=True)
    fait = next((base + e for e in (".jpg", ".png") if os.path.exists(base + e)
                 and os.path.getmtime(base + e) >= os.path.getmtime(src)), None)
    dst = fait or comprimer(src, base)
    proxys[c] = os.path.relpath(dst, APP); poids += os.path.getsize(dst)

d["proxys"] = proxys
d["enregistre_le"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
d.setdefault("journal", []).append({"quand": d["enregistre_le"], "qui": "creation", "action": "proxy en ligne",
    "type": "images", "id": None, "detail": f"{len(proxys)} copies de moins de 200 Ko sous assets/review/proxy"})
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
gros = [p for p in proxys.values() if os.path.getsize(os.path.join(APP, p)) > PLAFOND]
print(len(proxys), "copies ·", round(poids / 1e6, 1), "Mo au total ·", len(gros), "au-dessus de 200 Ko ·", len(manquants), "originaux absents")

if ENVOYER:
    def envoyer(p):
        donnee = base64.b64encode(open(os.path.join(APP, p), "rb").read()).decode()
        mime = "image/png" if p.endswith(".png") else "image/jpeg"
        req = urllib.request.Request(BASE + urllib.parse.quote(p), method="PUT",
            data=f"data:{mime};base64,{donnee}".encode(), headers={"Content-Type": "text/plain"})
        try: return urllib.request.urlopen(req, timeout=60).status == 200
        except Exception: return False
    import urllib.parse
    with ThreadPoolExecutor(6) as ex: ok = list(ex.map(envoyer, sorted(set(proxys.values()))))
    print("envoyées :", sum(ok), "· échecs :", len(ok) - sum(ok))
