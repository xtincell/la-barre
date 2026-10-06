# rattacher-sku-2026.py — relier chaque campagne aux SKU que ses visuels montrent, et compléter le catalogue des SKU lus.
#
# Demande d'Alex (06/10/2026) : « les campagnes qui incluent ces SKU doivent être associées à eux, et tu devras pouvoir
# le faire » · « il y a des boîtes en anglais, en français, des variantes avec des goûts spéciaux ou des gammes : c'est le
# genre de détail à suivre ».
#
# Entrée : sku.jsonl (nommer-exports-2026.py — une fiche SKU par fichier qui montre un produit) et gestes.csv (les noms
# et dossiers définitifs). Pour chaque fiche :
#   1. un packshot qu'aucun SKU du catalogue ne désigne crée une fiche SKU « à qualifier », relevée sur le fichier
#      (marque, catégorie, variante, gamme, saveur, grammage, contenant, langue, promo) ;
#   2. le fichier est rattaché à la campagne LA BARRE dont le dossier le contient (CAMPAGNE.md porte le nom exact) :
#      campagne.skus = [{ sku, preuves: [chemins], releve }] ;
#   3. un livrable dont le fichier d'origine est ce fichier reçoit le SKU dans kv.sku.
# Les dossiers d'une année sans campagne au dépôt sont listés au rapport : rien n'est inventé.
#
# Usage : python3 outils/rattacher-sku-2026.py <base.json> <sku.jsonl> <gestes.csv> <base-sortie.json> <rapport.md>

import json, os, re, sys, csv, datetime, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sku_lu

HOME = os.path.expanduser("~")
RM = os.path.join(HOME, "Downloads", "MATANGA — EXPORT DU TRAVAIL")
_, BASE, SKUS, GESTES, SORTIE, RAPPORT = sys.argv
d = json.load(open(BASE))
aujourd = datetime.date.today().isoformat()
final = {g["actuel"]: g["nouveau"] for g in csv.DictReader(open(GESTES, encoding="utf-8"))}
fiches = [json.loads(l) for l in open(SKUS)]

# 1 · Le catalogue complété par les packshots lus.
cat = d["sku"]
cles = {}
def cle(f): return (f.get("marque"), f.get("desc") or (f.get("categorie"), f.get("variante"), f.get("gamme"), f.get("saveur"), tuple(f.get("poids", [])[:1]),
                    f.get("produit"), f.get("langue"), f.get("promo")))
n_neuf = 0
for x in fiches:
    f = x["fiche"]
    if x["type"] not in ("Packshot", "Étiquette") or not f.get("marque") or not f.get("desc") or not (f.get("poids") or (f.get("categorie") and f.get("variante"))):
        continue
    f2 = dict(f); f2["_poids"] = [sku_lu.g_ml(*re.match(r"([\d.,]+) (\w+)", p).groups()) for p in f.get("poids", [])[:1]] if f.get("poids") else []
    if f2["_poids"]: f2["_poids"] = [(v, "g" if u == "g" else "ml") for v, u in f2["_poids"]]
    if sku_lu.apparier(f2, cat) or cle(f) in cles:
        continue
    chemin = final.get(x["p"], x["p"])
    s = {"id": f"SK-lu-{len(cles) + 1:03d}", "marque": f["marque"], "nom": f.get("desc") or sku_lu.libelle(f) or os.path.basename(chemin),
         "categorie": f.get("categorie") if f.get("categorie") in ("IMP", "EVAP", "SCM", "UHT", "YAOURT") else (f.get("categorie") or None),
         "format": (f.get("poids") or [None])[0], "variante": f.get("variante"), "gamme": f.get("gamme"), "saveur": f.get("saveur"),
         "produit": f.get("produit"), "contenant": f.get("contenant"), "langue": f.get("langue"), "promo": f.get("promo"),
         "lot": f.get("lot"), "portions": f.get("portions"), "marches": [], "fichierOrigine": os.path.basename(chemin), "chemin": chemin,
         "aQualifier": True, "releve": f"lu sur le packshot le {aujourd} — à contresigner"}
    cles[cle(f)] = s["id"]; cat.append({k: v for k, v in s.items() if v not in (None, "")}); n_neuf += 1

# 2 · Campagnes : le dossier qui porte CAMPAGNE.md, et la campagne au nom exact.
par_nom = {c["nom"]: c for c in d["campagnes"]}
def campagne_de(chemin):
    q = os.path.dirname(chemin)
    while q.startswith(RM + os.sep):
        md = os.path.join(q, "CAMPAGNE.md")
        if os.path.exists(md):
            titre = open(md, encoding="utf-8").readline().lstrip("# ").strip()
            return par_nom.get(titre), q
        q = os.path.dirname(q)
    return None, None
rattache = collections.defaultdict(lambda: collections.defaultdict(list)); orphelins = collections.defaultdict(set)
liv_par_fichier = collections.defaultdict(list)
for p in d["projets"]:
    for l in p.get("livrables", []):
        o = (l.get("releve") or {}).get("origine_disque")
        if o: liv_par_fichier[o.replace("~", HOME, 1) if o.startswith("~") else o].append(l)
n_liv = 0
for x in fiches:
    f = x["fiche"]
    if not f.get("marque"): continue
    f2 = dict(f)
    if f.get("poids"):
        f2["_poids"] = []
        for pz in f["poids"]:
            m = re.match(r"([\d.,]+) (\w+)", pz)
            if m:
                v, u = sku_lu.g_ml(*m.groups()); f2["_poids"].append((v, u))
    ids = sku_lu.apparier(f2, cat)
    if not ids: continue
    chemin = final.get(x["p"], x["p"])
    c, dos = campagne_de(chemin)
    if c:
        for i in ids: rattache[c["id"]][i].append(chemin)
    elif chemin.startswith(RM + os.sep):
        orphelins[os.path.relpath(os.path.dirname(chemin), RM).split("/Depuis")[0]].update(ids)
    for l in liv_par_fichier.get(x["p"], []) + liv_par_fichier.get(chemin, []):
        l.setdefault("kv", {}).setdefault("sku", [])
        for i in ids:
            if i not in l["kv"]["sku"]: l["kv"]["sku"].append(i); n_liv += 1
for c in d["campagnes"]:
    if c["id"] not in rattache: continue
    deja = {s["sku"]: s for s in c.get("skus", [])}
    for i, preuves in rattache[c["id"]].items():
        s = deja.setdefault(i, {"sku": i, "preuves": [], "releve": f"lu sur les visuels de la campagne le {aujourd}"})
        s["preuves"] = sorted(set(s["preuves"]) | set(preuves))[:12]
    c["skus"] = list(deja.values())

d["enregistre_le"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
d.setdefault("journal", []).append({"quand": d["enregistre_le"], "qui": "creation", "action": "SKU lus sur les visuels", "type": "sku", "id": None,
    "detail": f"{n_neuf} SKU relevés sur les packshots · {sum(len(v) for v in rattache.values())} rattachements campagne × SKU dans {len(rattache)} campagnes · {n_liv} sur des livrables"})
json.dump(d, open(SORTIE, "w"), ensure_ascii=False, indent=1)
SK = {s["id"]: s for s in cat}
R = [f"# SKU lus sur les visuels — {aujourd}\n", f"- SKU relevés sur des packshots et ajoutés au catalogue (à qualifier) : **{n_neuf}**",
     f"- Campagnes reliées à leurs SKU : **{len(rattache)}** ({sum(len(v) for v in rattache.values())} liens)", f"- Livrables qui reçoivent leurs SKU : {n_liv}\n",
     "## Par campagne\n"]
CN = {c["id"]: c["nom"] for c in d["campagnes"]}
for cid, m in sorted(rattache.items(), key=lambda kv: CN[kv[0]]):
    R.append(f"### {CN[cid]}")
    for i, pr in sorted(m.items(), key=lambda kv: -len(kv[1])): R.append(f"- {SK[i]['nom']} — vu sur {len(pr)} fichier{'s' if len(pr) > 1 else ''}")
    R.append("")
R.append("## Dossiers qui montrent des SKU sans campagne au dépôt\n")
R.append("Ces dossiers rangent le travail d'une année sans campagne LA BARRE : les SKU y sont lus, pas encore reliés. Créer la campagne les relie.\n")
for k, ids in sorted(orphelins.items()): R.append(f"- `{k}` — " + ", ".join(sorted({SK[i]['nom'] for i in ids}))[:300])
open(RAPPORT, "w").write("\n".join(R))
print(n_neuf, "SKU neufs ·", len(rattache), "campagnes reliées ·", n_liv, "livrables ·", len(orphelins), "dossiers sans campagne")
