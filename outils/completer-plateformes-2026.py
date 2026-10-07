# completer-plateformes-2026.py — compléter les plateformes avec la provenance de chaque champ.
#
# Sources fouillées le 30/09/2026 : Downloads/Work 2026 (marques clients, ventures, preuves de
# direction, zone à trier), le Bureau iCloud (chartes clients, archives avant 2025), les fiches du
# Radar Matanga, les Téléchargements (guidelines The Laughing Cow), et La Fusée (stratégies ADVE de
# Motion19, SPAWT, UP.graders, Akwa Palace). Les propositions par marque sont rédigées dans
# outils/plateformes-2026/*.json : chaque valeur y est soit « reçue » — tirée littéralement d'un
# document, avec sa source — soit « inférée » — déduite, avec son motif.
#
# Règles d'écriture, qui ne perdent rien :
#   — une valeur reçue remplace une inférence (ou, si la marque le demande, une valeur existante) ;
#     l'ancienne valeur entre dans les révisions du niveau, l'inférence levée dans inferencesLevees ;
#   — une valeur inférée ne s'écrit que dans un champ vide ;
#     son motif vient de `inferences[champ].pourquoi` ou d'un `motif` explicite
#     commun à la marque. Sans motif, sa provenance reste à qualifier ; les
#     documents du lot ou d'un autre champ ne lui sont jamais attribués ;
#   — un déplacement de client garde l'ancien client dans la fiche de la marque.
#
# Usage : python3 outils/completer-plateformes-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, os, glob, datetime

SRC, DST = sys.argv[1], sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
PUCES = {"valeurs", "preuves_origine", "symboles", "dialecte", "concurrents", "benefices", "preuves",
         "jamais", "ne_fera_pas", "rituels", "occasions", "fautes"}

d = json.load(open(SRC))
marques = {m["id"]: m for m in d["marques"]}
clients = {c["id"]: c for c in d["clients"]}
journal = d.setdefault("journal", [])
questions = []
bilan = {"recus": 0, "inferes": 0, "revises": 0, "marques": 0, "deplaces": 0}

def vide(v):
    return v is None or v == "" or v == [] or v == {}

def norme(cle, val):
    if cle in PUCES and isinstance(val, str):
        return [val]
    if cle not in PUCES and isinstance(val, list):
        return " · ".join(val)
    return val

for f in sorted(glob.glob(os.path.join(ICI, "plateformes-2026", "[!_]*.json"))):
    lot = json.load(open(f))
    sources = lot.pop("_sources", {})
    for mid, prop in lot.items():
        m = marques.get(mid)
        if not m:
            print("marque inconnue :", mid); continue
        v = m.setdefault("vault", {})
        infs = v.setdefault("inferences", {})
        srcs = v.setdefault("sources", {})
        touche = False
        remplacer_tout = prop.get("remplacer", False)
        remplacer = set(prop.get("remplacer_cles", []))

        for cle, (val, sk) in prop.get("recu", {}).items():
            val = norme(cle, val)
            avant = v.get(cle)
            peut = vide(avant) or cle in infs or remplacer_tout or cle in remplacer
            if not peut or avant == val:
                continue
            if not vide(avant):
                v.setdefault("revisions", []).append({"quand": QUAND, "qui": PAR, "champ": cle, "avant": avant,
                    "apres": val, "motif": "remplacé par une source : " + sources.get(sk, sk)})
                bilan["revises"] += 1
            if cle in infs:
                v.setdefault("inferencesLevees", []).append({"champ": cle, "quand": QUAND, "qui": PAR,
                    "comment": "remplacé par une source", "inference": infs.pop(cle)})
            v[cle] = val
            srcs[cle] = sources.get(sk, sk)
            bilan["recus"] += 1; touche = True

        cites = sorted({sources.get(sk, sk) for (_, sk) in prop.get("recu", {}).values()})
        for cle, val in prop.get("infere", {}).items():
            val = norme(cle, val)
            if not vide(v.get(cle)) or vide(val):
                continue
            metadata = prop.get("inferences", {})
            metadata = metadata.get(cle, {}) if isinstance(metadata, dict) else {}
            motif = metadata.get("pourquoi") if isinstance(metadata, dict) else None
            if not isinstance(motif, str) or not motif.strip():
                motif = prop.get("motif")
            if not isinstance(motif, str) or not motif.strip():
                motif = "Inférence sans motif documenté : provenance à qualifier. À contresigner ou corriger."
            v[cle] = val
            infs[cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}
            bilan["inferes"] += 1; touche = True

        dep = prop.get("deplacer")
        if dep:
            cid = dep["clientId"]
            if cid not in clients:
                c = {"id": cid, "nom": dep.get("clientNom", cid), "vault": {}, "cree_le": QUAND,
                     "note": "Créé en rangeant les plateformes : " + dep["motif"]}
                d["clients"].append(c); clients[cid] = c
            avant = m.get("clientId") or m.get("client")
            if avant != cid:
                m.setdefault("historique", []).append({"quand": QUAND, "champ": "clientId", "avant": avant,
                                                        "apres": cid, "motif": dep["motif"]})
                m["clientId"] = cid
                if "client" in m: m["client"] = cid
                bilan["deplaces"] += 1; touche = True
            if dep.get("nom") and m.get("nom") != dep["nom"]:
                m.setdefault("historique", []).append({"quand": QUAND, "champ": "nom", "avant": m["nom"],
                                                        "apres": dep["nom"], "motif": dep["motif"]})
                m["nom"] = dep["nom"]

        for q in prop.get("questions", []):
            questions.append({"marque": mid, "nom": m["nom"], "question": q})
        if touche:
            bilan["marques"] += 1
            journal.append({"quand": QUAND, "qui": PAR, "action": "plateforme complétée", "type": "marques",
                            "id": mid, "marques": [mid],
                            "detail": m["nom"] + " — provenance détaillée par champ."
                            + (" Sources des valeurs reçues : " + "; ".join(cites) if cites else "")})

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
json.dump(questions, open(os.path.join(ICI, "plateformes-2026", "_questions.json"), "w"), ensure_ascii=False, indent=1)
print(bilan, "· questions :", len(questions))
