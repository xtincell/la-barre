# generer-plateformes-2026.py — concevoir les plateformes qui manquent, en hypothèses.
#
# Une marque sans plateforme ne permet pas de juger si une piste « est » la marque :
# seulement si elle est jolie. Les plateformes des marques qui n'en avaient pas (ou
# presque pas) sont rédigées dans outils/plateformes-2026/hypotheses/*.json, à partir
# de ce que le dépôt sait déjà d'elles : leur positionnement, leurs projets, leurs
# briefs au Radar, la plateforme de leur marque mère ou de leur ombrelle.
#
# Règles, qui ne perdent rien et ne fabriquent rien :
#   — une valeur ne s'écrit que dans un champ vide, jamais par-dessus ;
#   — elle entre comme INFÉRÉE, avec son motif : utilisable pour travailler,
#     contresignable d'un geste, pas opposable au client ;
#   — aucune preuve chiffrée n'est inventée : un champ de preuve sans document reste vide ;
#   — « fautes déjà commises » n'est jamais inféré : c'est un fait, ou rien.
#
# Format : { "MQ-x": { "motif": "...", "valeurs": { "cle": valeur } } }
# Usage : python3 outils/generer-plateformes-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, os, glob, datetime

SRC, DST = sys.argv[1], sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
PUCES = {"valeurs", "preuves_origine", "symboles", "dialecte", "concurrents", "benefices", "preuves",
         "jamais", "ne_fera_pas", "rituels", "occasions"}
INTERDITS = {"fautes"}

d = json.load(open(SRC))
M = {m["id"]: m for m in d["marques"]}
J = d.setdefault("journal", [])
bilan = {"valeurs": 0, "marques": 0, "ignorees": 0}

def vide(v): return v is None or v == "" or v == [] or v == {}

for f in sorted(glob.glob(os.path.join(ICI, "plateformes-2026", "hypotheses", "*.json"))):
    for mid, h in json.load(open(f)).items():
        if mid.startswith("_"): continue
        m = M.get(mid)
        if not m:
            print("marque inconnue :", mid); continue
        v = m.setdefault("vault", {})
        infs = v.setdefault("inferences", {})
        motif = "Plateforme hypothèse — " + h["motif"] + " À contresigner ou corriger."
        n = 0
        for cle, val in h["valeurs"].items():
            if cle in INTERDITS: continue
            if cle in PUCES and isinstance(val, str): val = [val]
            if cle not in PUCES and isinstance(val, list): val = " · ".join(val)
            if vide(val): continue
            if not vide(v.get(cle)):
                bilan["ignorees"] += 1; continue
            v[cle] = val
            infs[cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}
            n += 1
        if n:
            bilan["valeurs"] += n; bilan["marques"] += 1
            J.append({"quand": QUAND, "qui": PAR, "action": "plateforme hypothèse", "type": "marques",
                      "id": mid, "marques": [mid], "detail": m["nom"] + " — " + str(n) + " champs inférés"})

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(bilan)
