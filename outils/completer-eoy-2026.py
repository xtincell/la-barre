# completer-eoy-2026.py — ce que la première insertion du brief EOY 2026 avait laissé.
#
# Relu après la première passe, le brief portait encore :
#   — des images : quatre photos de la tendance des pyjamas assortis, le KV EOY
#     2025 de Côte d'Ivoire (« à ne pas prendre pour base »), le graphique de
#     croissance EVAP 2019-2026, les deux brand propellers, et le logo
#     FrieslandCampina en en-tête de chaque page ;
#   — la matière de plusieurs insights, à plusieurs couches, là où un seul
#     avait été posé ;
#   — de quoi écrire la big idea dans plusieurs écoles, pour que la séance
#     compare des endroits et pas des formulations.
#
# Rien n'est effacé. Le périmètre de septembre rejoint le cadre déjà rangé ;
# la big idea du client reste en place et devient aussi une proposition parmi
# d'autres. Tout ce qui est proposé ici porte `infere` : utilisable, pas
# opposable, contresignable d'un clic.
#
# Usage : python3 outils/completer-eoy-2026.py <depot-source.json> <depot-sortie.json>
#         (les images sont attendues dans assets/review/vignettes/eoy26-*)

import json, sys, copy, os, datetime

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
SOURCE = "brief « EOY 2026 BRIEFS CREATIVE & MEDIA », FrieslandCampina, 28/09/2026"
V = "assets/review/vignettes/"

d = json.load(open(SRC))
p = next(x for x in d["projets"] if x["id"] == "PRJ-EOTY26")
journal = d.setdefault("journal", [])

def trace(action, detail, typ="projets", ident="PRJ-EOTY26"):
    journal.append({"quand": QUAND, "qui": PAR, "action": action, "type": typ,
                    "id": ident, "detail": detail})

def une_fois(liste, ident):
    return not any(x.get("id") == ident for x in liste)

for f in ["eoy26-tendance-1.jpg", "eoy26-tendance-2.jpg", "eoy26-tendance-3.jpg", "eoy26-tendance-4.jpg",
          "eoy26-kv-2025-ci.jpg", "eoy26-evap-croissance.png", "eoy26-propeller-bonnet-rouge.jpg",
          "eoy26-propeller-peak.jpg", "logo-frieslandcampina.png"]:
    assert os.path.exists(V + f), "image manquante : " + V + f

# ————— 1. Les éléments de marque que le brief apportait —————
assets = d.setdefault("assets", [])
nouveaux = [
    {"id": "A-logo-fc", "nom": "Logo FrieslandCampina", "marque": "C-fc", "role": "logo",
     "source": "en-tête de chaque page du " + SOURCE, "vignette": V + "logo-frieslandcampina.png",
     "marches": [], "note": "Extrait du PDF en 258 × 107 px : bon pour l'écran, pas pour l'impression. "
                            "Le fichier vectoriel reste à demander au client."},
    {"id": "A-prop-br", "nom": "Brand propeller Bonnet Rouge", "marque": "MQ-br", "role": "plateforme",
     "source": SOURCE + ", p. 5", "vignette": V + "eoy26-propeller-bonnet-rouge.jpg", "marches": []},
    {"id": "A-prop-peak", "nom": "Brand propeller Peak", "marque": "MQ-peak", "role": "plateforme",
     "source": SOURCE + ", p. 5", "vignette": V + "eoy26-propeller-peak.jpg", "marches": []},
]
for a in nouveaux:
    if une_fois(assets, a["id"]):
        assets.append(a)
        trace("élément de marque rangé", a["nom"] + " — " + a["source"], "assets", a["id"])

# ————— 2. Les pièces du brief : ce qui prouve, pas ce qui inspire —————
pieces = p.setdefault("piecesBrief", [])
if une_fois(pieces, "PB-eoy26-evap"):
    pieces.append({"id": "PB-eoy26-evap", "nom": "EVAP — croissance annuelle 2019-2026",
                   "vignette": V + "eoy26-evap-croissance.png", "source": "brief, p. 1",
                   "lecture": "32,61 (2019) · 33,44 · 36,52 (2021) · 29,57 · 26,47 (2023) · 31,56 · 35,08 · 34,28 (2026)",
                   "quand": QUAND})

# ————— 3. Le moodboard : chaque image dit pourquoi elle est là —————
socle = p["sections"].setdefault("socle", {})
mb = socle.setdefault("moodboard", [])
images = [
    ("MB-eoy26-1", "reference", "eoy26-tendance-1.jpg",
     "Un groupe en tenues de Noël assorties, posté sur X : la tendance déborde la famille",
     "brief, p. 3 — exemple de la tendance mondiale"),
    ("MB-eoy26-2", "reference", "eoy26-tendance-2.jpg",
     "Une famille en pyjamas rouges assortis devant le sapin : la photo de groupe comme preuve d'être ensemble",
     "brief, p. 3 — exemple de la tendance mondiale"),
    ("MB-eoy26-3", "reference", "eoy26-tendance-3.jpg",
     "Mohamed Salah et sa famille en pyjamas à carreaux : une célébrité musulmane joue le jeu — le rituel dépasse la religion",
     "brief, p. 3 — publication de @MoSalah"),
    ("MB-eoy26-4", "reference", "eoy26-tendance-4.jpg",
     "Pyjamas assortis jusqu'au chien : le code visuel de la tendance, tel que le commerce l'a déjà standardisé",
     "brief, p. 3 — visuel de catalogue"),
    ("MB-eoy26-5", "passe", "eoy26-kv-2025-ci.jpg",
     "KV EOY 2025 Bonnet Rouge, Côte d'Ivoire — « Joyeuses célébrations ». Le client demande de ne pas repartir de ce visuel",
     "brief, p. 3 — « Do not take it as a base for 2026 KV »"),
]
for ident, role, f, leg, src in images:
    if une_fois(mb, ident):
        mb.append({"id": ident, "role": role, "vignette": V + f, "legende": leg, "source": src, "quand": QUAND})
trace("moodboard", str(len(images)) + " images du brief rangées au moodboard — 4 références, 1 campagne passée")

# ————— 4. La gamme de la campagne, et le périmètre du brief —————
camp = next(c for c in d["campagnes"] if c["id"] == "CMP-fc-evap-eoy-2026")
camp["gamme"] = "EVAP"

cadre = p["cadresPrecedents"][-1]
if "perimetre" not in cadre and p.get("perimetre"):
    cadre["perimetre"] = copy.deepcopy(p["perimetre"])
supports = []
for v in p.get("volets", []):
    for s in v.get("supports", []):
        if s not in supports:
            supports.append(s)
p["perimetre"] = {"supports": supports, "marches": ["M-CI"],
                  "infere": {"pourquoi": "Le périmètre suit les livrables du brief. Seule la Côte d'Ivoire est nommée : "
                                         "les « key markets » restent à lister avec le client. L'ancien périmètre "
                                         "(15 marchés, TV et radio) est rangé avec le cadre de septembre.",
                             "quand": QUAND, "par": PAR}}

# ————— 5. Les insights : une couche chacun, trois sources quand on les a —————
MOTIF_IN = ("Proposé pour préparer la séance, à partir du brief et des brand propellers. "
            "Le test en trois questions est une proposition : il se rejoue en équipe, "
            "et la réponse de l'équipe remplace la mienne.")

def infere(extra=""):
    return {"pourquoi": MOTIF_IN + (" " + extra if extra else ""), "quand": QUAND, "par": PAR}

ins = {i["id"]: i for i in p.setdefault("insights", [])}

i1 = ins["IN-eoy26-1"]
if not any("vivre sa vie" in (s.get("quoi") or "") or "individual lives" in (s.get("quoi") or "") for s in i1["sources"]):
    i1["sources"].append({"type": "publique",
        "quoi": "La plateforme écrite par le client : « as people grow older, we often become more focused on our "
                "individual lives » ; et le brand propeller Bonnet Rouge, qui sert des familles « coming from the heart "
                "of a WE culture » (brief, p. 2 et 5)"})
i1["test"] = {"contredit": True, "gene": True, "ouvre": True}
i1["infere"] = infere("Trois sources désormais : la tendance, la campagne 2025, les mots du client.")

NOUVEAUX = [
  {"id": "IN-eoy26-2", "couche": "consommateur",
   "passes": {
     "longue": "À 25 ans on a son travail, sa ville, sa vie. Pour les fêtes on rentre, et on redevient l'enfant "
               "de ses parents — on aime ça. Mais ce sont les jeunes qui organisent la photo, choisissent les "
               "pyjamas, filment et publient. La tradition est celle des parents ; la mise en scène est la leur. "
               "Les marques de la table familiale, elles, restent « celles de nos parents ».",
     "temps": {"situation": "Pour les fêtes, les 18-35 ans rentrent à la table familiale.",
               "tension": "Ils aiment la tradition, mais ne veulent pas y être des figurants : ce sont eux qui la mettent en scène.",
               "empeche": "Tant que la marque appartient au décor des parents, elle ne fait pas partie de leur mise en scène."},
     "phrase": "Pour les fêtes, les 18-35 ans rentrent dans la tradition familiale — mais ils veulent en être les metteurs en scène, pas les figurants."},
   "sources": [
     {"type": "publique", "quoi": "Brief, p. 1 et 4 : les marques établies sont perçues comme moins pertinentes par les 18-35 ans ; "
                                  "comportement actuel : « je consomme Bonnet Rouge ou Peak parce que c'est un héritage familial »"},
     {"type": "culture", "quoi": "Les photos de la tendance au moodboard : mises en scène, cadrées, publiées — un geste de ceux qui tiennent le téléphone (brief, p. 3)"},
     {"type": "publique", "quoi": "Human truth du brand propeller Bonnet Rouge et Peak : « we want to grab every opportunity in life to progress » (brief, p. 5)"}],
   "test": {"contredit": True, "gene": True, "ouvre": True}},

  {"id": "IN-eoy26-3", "couche": "categorie",
   "passes": {
     "longue": "Toutes les marques laitières se battent au même moment, le Ramadan, et avec les mêmes mots : "
               "nutrition, énergie, matin, cent ans de qualité. Bonnet Rouge dit « l'énergie dès le matin », Peak "
               "« Reach your Peak ». La fin d'année, elle, n'appartient à personne : aucun concurrent direct ne "
               "l'occupe. La fête est un moment de lait — café, chocolat, gâteaux — dont aucune marque ne parle.",
     "temps": {"situation": "La catégorie communique au Ramadan et au petit-déjeuner.",
               "tension": "Tout le monde y dit la même chose — nutrition, énergie, héritage — pendant que la fête reste sans marque.",
               "empeche": "En restant sur la convention, on dépense pour être une marque de plus au Ramadan."},
     "phrase": "Toute la catégorie parle du matin, de la nutrition et du Ramadan ; personne ne parle de la fête."},
   "sources": [
     {"type": "publique", "quoi": "Brief, p. 3 : la campagne principale de la catégorie est au Ramadan, période où presque toutes les marques laitières sont présentes ; Nido, Cowbell et Laity n'occupent pas la fin d'année"},
     {"type": "mur", "quoi": "Les slogans et les brand propellers du client : « Pour l'Energie dès le matin », « Reach your Peak », « natural nutrition », « nutrient powerhouse » (brief, p. 5) — le mur de catégorie reste à faire avec trois visuels de concurrents"},
     {"type": "publique", "quoi": "Brief, p. 4 : comportement actuel fondé sur l'héritage et la qualité — « it has existed for more than 100 years and has a good quality »"}],
   "test": {"contredit": True, "gene": False, "ouvre": True},
   "extra": "Deux oui sur trois : c'est une tension de catégorie, pas encore un insight — et la convention ne sera prouvée qu'avec trois visuels de concurrents."},

  {"id": "IN-eoy26-4", "couche": "consommateur",
   "passes": {
     "longue": "Toute l'année on compte : le lait concentré est jugé cher, et on bascule vers le sachet d'IMP à 100 FCFA "
               "ou vers une autre catégorie. En fin d'année on compte moins pour la table : c'est le moment où l'on "
               "s'offre la vraie marque, celle qu'on veut voir quand la famille est là.",
     "temps": {"situation": "Le reste de l'année, on arbitre au franc près et on prend le sachet à 100 FCFA.",
               "tension": "En fin d'année, on ne veut pas que la table dise qu'on a compté.",
               "empeche": "Si la marque ne se montre pas à ce moment-là, le sachet la remplace aussi à la fête."},
     "phrase": "Toute l'année on compte ; pour la table de fin d'année, on veut la vraie marque."},
   "sources": [
     {"type": "publique", "quoi": "Brief, p. 1 : la catégorie est jugée chère, 9 % des consommateurs basculent vers l'IMP (sachet à 100 FCFA) ou vers une autre catégorie"},
     {"type": "publique", "quoi": "Brief, p. 4 : comportement désiré — « la marque que j'aime » plutôt que celle qu'on garde par héritage"}],
   "test": {"contredit": True, "gene": True, "ouvre": True},
   "extra": "Deux sources seulement : il manque le terrain — dix conversations avec des boutiquiers en décembre suffiraient."},

  {"id": "IN-eoy26-5", "couche": "entreprise",
   "passes": {
     "longue": "La campagne veut que la marque soit de toutes les retrouvailles. Or le brief lui-même dit que la "
               "catégorie recule à cause de ruptures d'approvisionnement et d'une couverture SKU insuffisante. Une "
               "campagne virale qui envoie des gens chercher une boîte absente du rayon accélère la bascule vers le sachet.",
     "temps": {"situation": "La campagne promet que la marque est là quand on se retrouve.",
               "tension": "Le brief reconnaît des ruptures et des formats manquants dans les points de vente.",
               "empeche": "Une promesse de présence que le rayon contredit fait perdre la confiance qu'elle devait gagner."},
     "phrase": "On ne peut pas être la marque de toutes les retrouvailles si on n'est pas dans toutes les boutiques."},
   "sources": [
     {"type": "publique", "quoi": "Brief, p. 1 : ruptures d'approvisionnement sur les produits Western et Tropical, couverture SKU insuffisante (Lupp)"},
     {"type": "publique", "quoi": "Brief, p. 1 : l'IMP gagne avec un pack de pénétration à 100 FCFA — un format, pas une idée"}],
   "test": {"contredit": True, "gene": True, "ouvre": True},
   "extra": "Couche entreprise : elle ne commande pas la campagne, elle commande une question au client — la disponibilité "
            "en décembre sur les trois hero SKUs. À poser en réunion avant la séance de concept."},
]
for n in NOUVEAUX:
    extra = n.pop("extra", "")
    if n["id"] not in ins:
        n.update({"auteur": None, "ecrit_le": QUAND, "infere": infere(extra)})
        p["insights"].append(n)
trace("insights proposés", "4 insights ajoutés (consommateur ×2, catégorie, entreprise) ; l'insight culture reçoit sa troisième source")

# ————— 6. Un second territoire, là où la catégorie laisse une place —————
terr = p.setdefault("territoires", [])
if une_fois(terr, "TR-eoy26-2"):
    terr.append({"id": "TR-eoy26-2", "nom": "La fête, propriété de la marque",
      "quoi": "Tout ce que la fête contient de lait et dont personne ne parle : le chocolat de minuit, le café du "
              "lendemain, les gâteaux, les desserts de fête. La marque y quitte le petit-déjeuner et le Ramadan.",
      "insightId": "IN-eoy26-3", "ecole": "disruption",
      "convention": {"enonce": "Le lait concentré se vend au Ramadan et au petit-déjeuner, sur la nutrition, l'énergie et l'héritage.",
                     "preuves": []},
      "reduction": None, "cree_le": QUAND,
      "infere": {"pourquoi": "Ouvert par l'insight de catégorie. La convention est énoncée, pas prouvée : il faut trois "
                             "visuels de concurrents (Nido, Cowbell, Laity) avant de la présenter.",
                 "quand": QUAND, "par": PAR}})

# ————— 7. Les propositions de big idea, école par école —————
MOTIF_BE = ("Proposée pour préparer la séance, à partir du brief, des brand propellers et de la doctrine des écoles. "
            "Ni arbitrée, ni attribuée : l'auteur se nomme en séance, et une idée d'atelier peut la remplacer.")
bi = p["sections"].setdefault("bigidea", {})
bi["source"] = "Proposée par FrieslandCampina au brief (contexte et « campaign idea », p. 2-3) — ni arbitrée, ni attribuée"

def prop(ident, ecole, titre, phrase, mecanique, champs, insight, territoire, source=None):
    c = {"id": ident, "ecole": ecole, "titre": titre, "phrase": phrase, "mecanique": mecanique,
         "champs": champs, "insightId": insight, "territoireId": territoire, "auteur": None,
         "statut": "proposee", "cree_le": QUAND,
         "infere": {"pourquoi": MOTIF_BE, "quand": QUAND, "par": PAR}}
    if source:
        c["source"] = source
        c["infere"] = {"pourquoi": "L'idée du client, reprise telle quelle pour être comparée aux autres. Son école "
                                   "n'est pas déclarée : la retrouver est l'exercice de rétro-ingénierie.",
                       "quand": QUAND, "par": PAR}
    return c

PROPS = [
  prop("BE-eoy26-client", None, "Les championnes des retrouvailles", bi.get("idee", ""), bi.get("mecanique", ""), {},
       "IN-eoy26-1", "TR-eoy26-1", source="proposée par le client au brief, p. 2-3"),

  prop("BE-eoy26-ideal", "big-ideal", "Le signal des retrouvailles",
       "EVAP donne le signal : cette fin d'année, on se retrouve.",
       "Le pyjama assorti devient une convocation : on l'envoie à ceux qu'on veut retrouver, la photo prouve qu'ils ont répondu. "
       "La marque fournit le signal — le kit, le filtre, le défi.",
       {"tension": "Chacun réussit sa vie de son côté — la ville, le travail, l'indépendance — et le « nous » de la famille "
                   "s'effiloche sans que personne ne veuille le perdre.",
        "meilleure": "La marque qui a toujours été sur la table quand on était ensemble, et qui donne le signal pour s'y remettre.",
        "croyance": "Nous croyons qu'une famille ne se perd pas : elle attend une raison de se retrouver."},
       "IN-eoy26-1", "TR-eoy26-1"),

  prop("BE-eoy26-culture", "cultural-strategy", "On rentre",
       "Rentrer pour les fêtes, c'est la réussite qu'on partage.",
       "Ceux qui rentrent — de la ville, de l'étranger, du nouveau travail — posent avec ceux qui les attendent, en pyjamas "
       "assortis : la photo du retour. La marque accueille, sur la table et dans le kit.",
       {"contradiction": "Réussir sa vie à soi — la ville, l'emploi, l'indépendance à 25 ans — et rester l'enfant de la "
                         "famille, avec son devoir de retour et sa table commune.",
        "mythe": "Le retour : rentrer pour les fêtes n'est pas revenir en arrière, c'est montrer ce qu'on est devenu à ceux "
                 "qui nous ont faits.",
        "droit": "Bonnet Rouge et Peak sont dans la cuisine familiale depuis des générations : la marque est déjà ce qu'on "
                 "retrouve en rentrant. Les propellers le disent — « the heart of a WE culture », « for themselves as well as others »."},
       "IN-eoy26-1", "TR-eoy26-1"),

  prop("BE-eoy26-disruption", "disruption", "La marque qui reste à la fête",
       "Pendant que les autres parlent du matin, EVAP reste à la fête.",
       "Chaque moment de la nuit de fête a sa recette au lait — le chocolat de minuit, le gâteau, le café du lendemain. "
       "Les gens publient la leur ; les trois marques signent chacune un moment.",
       {"convention": "Le lait concentré se vend au Ramadan et au petit-déjeuner, sur la nutrition, l'énergie et cent ans "
                      "d'héritage — toutes les marques laitières, au même moment, avec les mêmes mots.",
        "rupture": "Parler de la fête, pas de nutrition : le lait de ceux qui restent tard. Une rupture douce — on garde "
                   "les slogans, on change le moment.",
        "vision": "EVAP devient la marque des moments partagés : la fin d'année d'abord, puis toutes les retrouvailles "
                  "de l'année."},
       "IN-eoy26-3", "TR-eoy26-2"),

  prop("BE-eoy26-simplicite", "brutal-simplicite", "C'est nous qui offrons",
       "Cette année, c'est nous qui l'offrons.",
       "Les 18-35 ans offrent le kit des retrouvailles — pyjamas assortis et coffret des trois marques — à leur famille "
       "ou à leur bande ; la photo dit qui l'a offert.",
       {"longue": "Les 18-35 ans connaissent nos marques parce que leurs parents les achetaient : sûres, mais pas à eux. "
                  "La fin d'année les ramène à la table familiale, là où la marque est déjà. Il faut qu'ils la choisissent "
                  "au lieu d'en hériter.",
        "dix": "Faire choisir aux jeunes la marque dont ils héritent.",
        "six": "Héritée des parents, choisie par nous."},
       "IN-eoy26-2", "TR-eoy26-1"),

  prop("BE-eoy26-drama", "inherent-drama", "La boîte qui fait le tour",
       "Une boîte, toute la famille.",
       "La boîte ouverte pour les fêtes passe de main en main — le café des parents, le chocolat des enfants, le gâteau "
       "de la tante. Chacun montre ce qu'il en a fait.",
       {"drame": "Le lait concentré est fait pour être partagé : une boîte ne se finit jamais seul, elle sert toute la "
                 "maison pendant les fêtes.",
        "scene": "La boîte qui fait le tour de la table et de la cuisine, du réveillon au lendemain.",
        "comportement": "Les gens filment le tour de leur boîte — qui s'en sert, pour quoi faire."},
       "IN-eoy26-1", "TR-eoy26-1"),

  prop("BE-eoy26-verite", "truth-well-told", "La même photo, chaque année",
       "Chaque année la même photo ; chaque année, on est là.",
       "On publie côte à côte la photo de famille de cette année et celle d'avant : les enfants ont grandi, les pyjamas "
       "ont changé, la marque est toujours sur la table.",
       {"verite": "Chaque fin d'année on refait la même photo de famille — et c'est précisément pour ça qu'on la refait.",
        "role": "Gardienne du rituel : la marque est dans les photos de famille depuis des années, sur la table, dans la tasse.",
        "preuves": "La tendance des photos en pyjamas assortis, jouée au-delà des religions ; la campagne 2025 en Côte d'Ivoire ; "
                   "plus de cent ans dans les familles (brief, p. 2-4). Verbatim à collecter en séance."},
       "IN-eoy26-1", "TR-eoy26-1"),
]
bes = p.setdefault("bigideas", [])
for c in PROPS:
    if une_fois(bes, c["id"]):
        bes.append(c)
trace("big ideas proposées", "7 propositions pour la séance : l'idée du client et six écoles "
      "(Big Ideal, Cultural Strategy, Disruption, Brutal Simplicity, Inherent Drama, Truth Well Told) — trois racines")

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print("insights :", len(p["insights"]), "· territoires :", len(p["territoires"]), "· propositions :", len(p["bigideas"]))
print("moodboard :", len(p["sections"]["socle"]["moodboard"]), "· pièces :", len(p["piecesBrief"]), "· assets ajoutés :", len(nouveaux))
