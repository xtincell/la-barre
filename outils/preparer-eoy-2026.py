# preparer-eoy-2026.py — l'EOY 2026 au même niveau que les dossiers qui suivent.
#
# Les champs créés pour « Spread the Laugh » valent aussi pour l'EOY : le calendrier du
# brief (p. 6), le rôle des canaux, les risques, l'inventaire des pièces reçues, et la
# préparation du brainstorm. Ce qui vient du brief est reçu ; le reste est inféré.
#
# Usage : python3 outils/preparer-eoy-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, datetime

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
d = json.load(open(SRC))
p = next(x for x in d["projets"] if x["id"] == "PRJ-EOTY26")
b = p["sections"]["brief"]
inf = p.setdefault("inferences", {})

def poser(cle, val, motif=None):
    if b.get(cle): return
    b[cle] = val
    if motif: inf["brief." + cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}

poser("calendrier", ["28/09/2026 — rédaction du brief", "29/09/2026 — envoi du brief à l'agence", "30/09/2026 — briefing agence",
  "9/10/2026 — 1er retour agence : stratégie créative et média, et plan d'exécution",
  "15/10/2026 — 2e retour agence", "20/10/2026 — retour final sur toutes les tâches",
  "Fin novembre 2026 — PLV et BTL en place (inféré)", "Décembre 2026 → première semaine de janvier 2027 — diffusion, pic entre Noël et le Nouvel An (inféré)"])
poser("canaux", ["TikTok, Facebook, Instagram — viralité : portée d'environ 10 millions d'utilisateurs par marché clé (brief, p. 4)",
  "Affichage 4×3 m — le KV avec de vrais acteurs (brief, p. 5)", "BTL — goodies, bannière murale, guirlandes, banderoles (brief, p. 5)",
  "PLV — posters 40×60, wobblers Ø 15 cm, tête de gondole (brief, p. 5)", "Digital statique et vidéo — optionnel, IA ou acteurs réels et influenceurs (brief, p. 5)"])
poser("risques", ["Une fête lue comme religieuse — le rituel est transculturel, la campagne ne doit pas l'être",
  "Le registre « héritage », qui vieillit la marque au moment où on veut la rajeunir",
  "Une promesse de présence que le rayon ne tient pas : ruptures d'approvisionnement et SKU manquants (brief, p. 1)",
  "Trois marques confondues — une idée commune, un signe propre à chacune",
  "Belle Hollandaise sans plateforme validée : sa présence repose sur une hypothèse"],
  "Déduits du brief (contexte, limitations) et de la plateforme EVAP ; le client n'a pas écrit de section risques.")
poser("droits_usage", ["KV EOY 2025 Côte d'Ivoire — montré comme exemple, à ne pas prendre pour base (brief, p. 3)",
  "Photos de la tendance (brief, p. 3) — références trouvées en ligne : inspiration seulement, aucune réutilisation",
  "Logo FrieslandCampina — extrait du PDF en basse définition : le fichier vectoriel est à demander"],
  "Déduit de l'origine des images du brief.")

p["documentsRecus"] = [
  {"nom": "EOY 2026 BRIEFS CREATIVE & MEDIA.pdf", "type": "brief, 6 pages", "date": "28/09/2026",
   "tire": "Tout le texte est au cadrage : contexte de catégorie, stratégie, job to be done, plateforme « The We Culture », contexte 2025, "
           "idée de campagne, objectifs, cible, changement de comportement, tâche et livrables, limitations, calendrier."},
  {"nom": "Graphique « EVAP YoY Growth 2019-2026 » (p. 1)", "type": "image", "tire": "Rangé en pièce du brief, valeurs relevées."},
  {"nom": "Quatre photos de la tendance des pyjamas assortis (p. 3)", "type": "images", "tire": "Découpées et rangées au moodboard comme références."},
  {"nom": "KV EOY 2025 Bonnet Rouge, Côte d'Ivoire (p. 3)", "type": "image", "tire": "Au moodboard comme campagne passée, avec la consigne du client."},
  {"nom": "Brand propellers Bonnet Rouge et Peak (p. 5)", "type": "images", "tire": "Rangés à la bibliothèque de chaque marque ; leurs champs écrits."},
  {"nom": "Logo FrieslandCampina (en-tête de chaque page)", "type": "image 258 × 107 px", "tire": "Rangé à l'ombrelle ; basse définition."},
]

p["preparation"] = {
  "objectif": "Arbitrer l'insight racine, puis retenir une big idea EOY pour le 1er retour du 9 octobre — avec son auteur nommé.",
  "question": "Comment faire de la fin d'année le moment « The We » des marques EVAP — sans héritage, sans religion ?",
  "a_trancher": ["La racine : se retrouver (culture), mettre en scène (18-35 ans) ou occuper la fête (catégorie) ?",
                 "Les marchés clés : seule la Côte d'Ivoire est nommée", "Le rôle de Belle Hollandaise, qui n'a pas de brand propeller",
                 "La disponibilité des trois hero SKUs en décembre — une question au client, pas à la création",
                 "La mesure de la considération des 18-35 ans, que le brief ne donne pas"],
  "amorces": ["Et si le pyjama assorti devenait une convocation ?", "Et si ce n'était pas la famille qu'on retrouvait, mais la bande du bureau ?",
              "Et si les 18-35 ans offraient la fête à leurs parents cette année ?", "Et si la boîte faisait le tour de la table comme un micro ?",
              "Et si la marque restait jusqu'au bout de la nuit — et au café du lendemain ?"],
  "directions": ["Le signal des retrouvailles — Big Ideal", "On rentre — Cultural Strategy", "La marque qui reste à la fête — Disruption",
                 "C'est nous qui offrons — Brutal Simplicity", "La boîte qui fait le tour — Inherent Drama",
                 "La même photo de groupe, chaque année — Truth Well Told", "Les championnes des retrouvailles — l'idée du client"],
  "interdits": ["Repartir du KV EOY 2025", "Le registre « héritage »", "Une fête exclusivement chrétienne", "« The We » réduit à la famille"],
  "materiel": ["Le document de cadrage imprimé", "Le moodboard : les quatre photos de la tendance et le KV 2025",
               "Les brand propellers de Bonnet Rouge et de Peak", "Le graphique EVAP 2019-2026"],
  "deroule": ["10 min — le brief et la plateforme « The We », par Derick", "10 min — les trois racines : on en garde une",
              "25 min — les idées, posées avec leur auteur", "15 min — les sept propositions par école, comparées à ce qui est sorti",
              "10 min — tri, critères, questions pour le client"],
  "notes": "Le 1er retour du 9 octobre porte la stratégie créative et média et le plan d'exécution, pas seulement l'idée.",
  "infere": {"pourquoi": "Préparée à partir du brief, des insights et des propositions par école. À relire avant la séance.",
             "quand": QUAND, "par": PAR},
}
d.setdefault("journal", []).append({"quand": QUAND, "qui": PAR, "action": "préparation du brainstorm", "type": "projets",
  "id": "PRJ-EOTY26", "detail": "calendrier, canaux, risques, droits, pièces reçues et préparation de séance"})
d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print("EOY : préparation", sum(1 for k, v in p["preparation"].items() if v and k != "infere"), "champs · documents", len(p["documentsRecus"]))
