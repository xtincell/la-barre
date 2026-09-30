# publier-images.py — chaque image que le dépôt cite doit exister en ligne.
#
# Le serveur n'accepte sous /assets/review que des chemins en [a-zA-Z0-9._/-] : les
# illustrations du corpus, nommées « Bonnet Rouge — Cahiers BTS.jpg », n'y sont jamais
# arrivées. En local tout s'affichait ; en ligne, la couverture de 93 projets était une
# image cassée.
#
# Le script :
#   1. relève tous les chemins d'image cités par le dépôt (projets, livrables, assets, SKU,
#      couvertures, fonds, pièces, inclassables) ;
#   2. renomme en nom sûr ceux que le serveur refuserait (copie locale, l'original reste),
#      et réécrit le chemin partout dans le dépôt — l'ancien nom est gardé dans `nomsOrigine` ;
#   3. demande au serveur lesquels il n'a pas, et les lui envoie.
#
# Usage : python3 outils/publier-images.py <depot-source.json> <depot-sortie.json> [--envoyer]

import json, sys, os, re, base64, shutil, unicodedata, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

SRC, DST = sys.argv[1], sys.argv[2]
ENVOYER = "--envoyer" in sys.argv
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://labarre.powerupgraders.com/"
SUR = re.compile(r"^assets/review/[a-zA-Z0-9._/-]+\.(jpg|jpeg|png|webp)$", re.I)
IMG = re.compile(r"^assets/review/.+\.(jpg|jpeg|png|webp)$", re.I)
MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}

d = json.load(open(SRC))

def slug(t):
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:90]

chemins = set()
def relever(o):
    if isinstance(o, dict): [relever(v) for v in o.values()]
    elif isinstance(o, list): [relever(v) for v in o]
    elif isinstance(o, str) and IMG.match(o): chemins.add(o)
relever(d)

renomme = {}
for c in sorted(chemins):
    if SUR.match(c): continue
    dossier, nom = os.path.split(c)
    base, ext = os.path.splitext(nom)
    neuf = dossier + "/" + slug(base) + ext.lower()
    src, dst = os.path.join(APP, c), os.path.join(APP, neuf)
    if os.path.exists(src) and not os.path.exists(dst): shutil.copyfile(src, dst)
    if os.path.exists(dst): renomme[c] = neuf

def reecrire(o):
    if isinstance(o, dict): return {k: reecrire(v) for k, v in o.items()}
    if isinstance(o, list): return [reecrire(v) for v in o]
    if isinstance(o, str) and o in renomme: return renomme[o]
    return o
d = reecrire(d)
if renomme:
    d.setdefault("nomsOrigine", {}).update({v: k for k, v in renomme.items()})

tous = sorted({renomme.get(c, c) for c in chemins})
absents_local = [c for c in tous if not os.path.exists(os.path.join(APP, c))]

def en_ligne(c):
    try:
        urllib.request.urlopen(urllib.request.Request(BASE + urllib.parse.quote(c), method="HEAD"), timeout=20)
        return c, True
    except Exception:
        return c, False

with ThreadPoolExecutor(12) as ex:
    etat = dict(ex.map(en_ligne, [c for c in tous if c not in absents_local]))
manquants = [c for c, ok in etat.items() if not ok]
poids = sum(os.path.getsize(os.path.join(APP, c)) for c in manquants)
print("images citées :", len(tous), "· renommées :", len(renomme), "· absentes du disque :", len(absents_local),
      "· manquantes en ligne :", len(manquants), "(%.1f Mo)" % (poids / 1048576))
if absents_local: print("absentes du disque :", absents_local[:10])

def envoyer(c):
    ext = c.rsplit(".", 1)[1].lower()
    corps = ("data:" + MIME[ext] + ";base64," + base64.b64encode(open(os.path.join(APP, c), "rb").read()).decode()).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(BASE + c, data=corps, method="PUT",
                                                          headers={"Content-Type": "text/plain"}), timeout=120)
        return c, r.status
    except Exception as e:
        return c, str(e)

if ENVOYER and manquants:
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(envoyer, manquants))
    ko = [(c, s) for c, s in res if s != 200]
    print("envoyées :", len(res) - len(ko), "· échecs :", len(ko))
    for c, s in ko[:20]: print("  ÉCHEC", c, s)

json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
