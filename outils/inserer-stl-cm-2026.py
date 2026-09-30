# inserer-stl-cm-2026.py — « Spread the Laugh » de La Vache qui rit, et l'angle Cameroun à préparer.
#
# Source : le dossier global « LVQR Campagne Not Laughing cow » transmis le 29/09/2026 par
# Derick Tchaou (Direction clientèle, Matanga) : la présentation « Spread the Laugh —
# U.S. campaign, prepared for global teams 9/27/26 » (PPTX, PDF, et une version FR
# traduite automatiquement), la hiérarchie des messages US, le plan de crise Edelman du
# 28/09, les deux communiqués (actes 1 et 2), le planning de l'acte 2, cinq images presse,
# la photo de profil de l'acte 1, le teaser « Park » de 15 s en six formats, une police
# en attente de droits, et deux archives illisibles.
#
# La demande : préparer un angle pour le Cameroun, et le brainstorm qui le trouvera.
# Il n'existe pas de brief local : le brief est celui de la campagne américaine. Tout ce
# qui touche au Cameroun est donc inféré — avec son motif — et ce qui vient du dossier
# global est posé comme reçu.
#
# Ce que ce script ne fait pas, et dit : il ne recopie ni les téléphones ni les adresses
# personnelles de l'équipe Bel US. Le dépôt est lisible en ligne ; ces coordonnées restent
# dans le plan de crise, au dossier source.
#
# Usage : python3 outils/inserer-stl-cm-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, datetime, os

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
V = "assets/review/vignettes/"
SOURCE = "dossier global « Spread the Laugh » (Bel / The Laughing Cow US), transmis le 29/09/2026"
DOSSIER_LOCAL = "/Users/imacmatanga1/Downloads/LVQR Campagne Not Laughing cow/"

d = json.load(open(SRC))
journal = d.setdefault("journal", [])
marques = {m["id"]: m for m in d["marques"]}

def trace(action, detail, typ="projets", ident="PRJ-STL-CM", mqs=None):
    e = {"quand": QUAND, "qui": PAR, "action": action, "type": typ, "id": ident, "detail": detail}
    if mqs: e["marques"] = mqs
    journal.append(e)

def vide(v): return v is None or v == "" or v == [] or v == {}

# ════════════ 0. La marque rattachée à son groupe ════════════
lvqr = marques["MQ-lvqr"]
if not lvqr.get("clientId"):
    lvqr["clientId"] = lvqr.get("client") or "C-bel"   # l'héritage de plateforme lit clientId
client = next(c for c in d["clients"] if c["id"] == "C-bel")

def ecrire_vault(v, cle, val, motif, recu=False, source=None):
    if not vide(v.get(cle)):
        return
    v[cle] = val
    if recu:
        v.setdefault("sources", {})[cle] = source or SOURCE
    else:
        v.setdefault("inferences", {})[cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}

# ════════════ 1. Les éléments reçus ════════════
assets = d.setdefault("assets", [])
def asset(a):
    if not any(x["id"] == a["id"] for x in assets):
        assets.append(a)

ORGA = {"zones": ["monde"], "usage": "organique seulement", "expire": None,
        "note": "« APPROVED FOR ORGANIC ONLY GLOBAL USE 9.28 » — aucune diffusion payante"}
PAYANT = {"zones": ["monde"], "usage": "organique et payant", "expire": None,
          "note": "« APPROVED FOR ORGANIC + PAID GLOBAL USE 9.28 »"}
for ident, nom, f, dr, src in [
    ("A-stl-diner", "La Vache qui ne rit plus — au diner (image presse)", "stl26-diner.jpg", ORGA, "DOC 3 · image presse retouchée"),
    ("A-stl-parc", "La Vache qui ne rit plus — balançoire au parc (image presse)", "stl26-parc.jpg", ORGA, "DOC 3 · image presse retouchée"),
    ("A-stl-packs", "Pack qui rit et pack qui ne rit plus, côte à côte", "stl26-packs-cote-a-cote.jpg", ORGA, "DOC 3 · image presse retouchée"),
    ("A-stl-portion-1", "Pack « We need to talk » et portion", "stl26-pack-portion-1.jpg", ORGA, "DOC 3 · image presse retouchée"),
    ("A-stl-portion-2", "Pack « We need to talk » et portion — variante", "stl26-pack-portion-2.jpg", ORGA, "DOC 3 · image presse retouchée"),
    ("A-stl-profil", "Photo de profil de l'acte 1 — la vache qui ne rit pas", "stl26-profil-acte1.jpg",
     {"zones": ["monde"], "usage": "tout usage", "expire": None, "note": "« APPROVED FOR ALL GLOBAL USE 9.29 »"}, "DOC 2/3 · profil social"),
]:
    asset({"id": ident, "nom": nom, "marque": "MQ-lvqr", "role": "illustration", "vignette": V + f,
           "source": src + ", " + SOURCE, "droits": dr, "marches": []})
for ident, nom, fmt, poids, fichier in [
    ("A-stl-teaser-16x9", "Teaser « Park » 15 s — 16:9 (CTV)", "16:9", "47 Mo", "DOC 4/TLC26_Teaser_Park_15s_16X9_CTV.mp4"),
    ("A-stl-teaser-9x16", "Teaser « Park » 15 s — 9:16 (TikTok)", "9:16", "47 Mo", "DOC 3 · TLC26_Teaser_Park_15s_9X16_TT.mp4"),
    ("A-stl-teaser-1x1", "Teaser « Park » 15 s — 1:1 (Instagram)", "1:1", "47 Mo", "DOC 2 · TLC26_Teaser_Park_15s_1X1_IG.mp4"),
    ("A-stl-teaser-4x5", "Teaser « Park » 15 s — 4:5 (Instagram)", "4:5", "47 Mo", "DOC 2 · TLC26_Teaser_Park_15s_4X5_IG.mp4"),
    ("A-stl-master", "Teaser « Park » 15 s — masters 16:9 et 9:16 (ProRes)", "16:9 · 9:16", "424 Mo chacun", "DOC 2 · TLC26_Teaser_Park_15s_*_MASTER.mov"),
    ("A-stl-textless", "Teaser « Park » 15 s — masters sans texte 16:9, 4:5, 1:1", "16:9 · 4:5 · 1:1", "—",
     "NO TEXT MASTER FILE · TLC26_Teaser_Park_15s_*_TEXTLESS MASTER.mov"),
]:
    asset({"id": ident, "nom": nom, "marque": "MQ-lvqr", "role": "autre", "type": "film", "format": fmt,
           "duree": "15 s (17 s avec cartons)", "poids": poids, "master": DOSSIER_LOCAL + fichier,
           "vignette": V + ("stl26-teaser-parc-4x5.jpg" if "4X5" in fichier or "4:5" == fmt else "stl26-teaser-parc-16x9.jpg"),
           "source": SOURCE, "droits": PAYANT, "marches": [],
           "note": "La version sans texte est celle qu'on peut sous-titrer ou re-titrer pour le Cameroun."
                   if "TEXTLESS" in fichier else "Cartons en anglais : « The Laughing Cow® stopped laughing. »"})
asset({"id": "A-stl-police", "nom": "Police des vidéos — Bobby Jones Soft", "marque": "MQ-lvqr", "role": "police",
       "master": DOSSIER_LOCAL + "DOC 4/VIDEO CONTENT FONT_ AWAITING GLOBAL USAGE RIGHTS 9.29_BobbyJonesSoft-Regular.otf",
       "source": SOURCE, "droits": {"zones": [], "usage": "en attente", "expire": None,
                                    "note": "« AWAITING GLOBAL USAGE RIGHTS 9.29 » — ne pas l'employer avant confirmation écrite"},
       "marches": []})
asset({"id": "A-logo-bel", "nom": "Logo Bel — « for all for good »", "marque": "C-bel", "role": "logo",
       "vignette": V + "logo-bel.png", "source": "signature du courriel de transmission (image003)", "marches": [],
       "note": "Extrait en 140 × 132 px : bon pour l'écran, pas pour l'impression."})

# ════════════ 2. L'ombrelle Bel et la plateforme de La Vache qui rit ════════════
cv = client.setdefault("vault", {})
MOTIF_BEL = "Déduit des communiqués (« About The Laughing Cow ») et du logo « for all for good » joint au courriel. À contresigner."
ecrire_vault(cv, "positionnement",
    "Groupe familial de 160 ans, porté par une mission ; plus de trente marques locales et internationales vendues dans plus de "
    "120 pays ; acteur majeur du snacking en portions — produits laitiers, fruits, légumes — et du fromage végétal.", None,
    recu=True, source="communiqués actes 1 et 2, « About The Laughing Cow »")
ecrire_vault(cv, "idee_directrice", "For all, for good.", MOTIF_BEL)
ecrire_vault(cv, "mission", "Une alimentation plus saine et plus responsable, pour tous — « fight for better snacking » aux États-Unis.",
             MOTIF_BEL)
ecrire_vault(cv, "preuves_origine", ["160 ans, entreprise familiale (communiqués)", "Plus de 30 marques, plus de 120 pays (communiqués)",
                                    "The Laughing Cow, Babybel, Boursin, GoGo squeeZ aux États-Unis (communiqués)"],
             None, recu=True, source="communiqués actes 1 et 2")

v = lvqr.setdefault("vault", {})
R = lambda cle, val, src: ecrire_vault(v, cle, val, None, recu=True, source=src)
I = lambda cle, val, motif: ecrire_vault(v, cle, val, motif)
MG = ("Déduit du dossier global « Spread the Laugh » ; la marque est la même partout, mais sa lecture camerounaise est "
      "une inférence à vérifier avec Bel Afrique.")
R("vision", "Que chacun choisisse de rire de la vie. (« Inspiring people to choose to laugh at life » — la raison d'être de la marque.)",
  "hiérarchie des messages US, récit profond")
R("mission", "Faire de chaque moment de snacking un moment de joie et de lien. (« Turns everyday snacking into moments of joy and connection ».)",
  "hiérarchie des messages US")
R("idee_directrice", "Le rire est une rébellion active contre le fait de prendre la vie trop au sérieux. (« Laughter is an active rebellion against taking life too seriously » — lead belief.)",
  "présentation globale, p. 3")
R("positionnement", "Une portion de fromage tartinable pas sérieuse, avec un goût très sérieux pour le rire. (« An unserious wedge of spreadable cheese with serious taste for laughter. »)",
  "présentation globale, p. 3 — « We are »")
R("promesse", "Faire de chaque petite portion — et de chaque petite dispute — quelque chose dont on peut rire. (« Make every little wedge something we can laugh about. »)",
  "présentation globale, p. 3 — « So we will »")
R("valeurs", ["Optimisme", "Positivité", "Partage — « a wedge is meant to be shared »"], "communiqués ; hiérarchie des messages")
R("preuves_origine", ["Depuis 1921 (communiqués, plan de crise)", "Portions emballées une à une dans l'aluminium (hiérarchie des messages)",
                      "Une des marques les plus populaires du groupe Bel (communiqués)"], "communiqués et hiérarchie des messages")
R("dialecte", ["Spread the Laugh", "Wedge issues", "We need to talk", "Make her laugh again", "Join the challenge", "#SpreadTheLaugh"],
  "hiérarchie des messages US")
I("origine", "Née en 1921 chez Bel, dans le Jura : une vache rouge qui rit, et dont les boucles d'oreilles sont deux boîtes de La vache "
  "qui rit. Elle rit depuis plus de cent ans — des boîtes à goûter, des frigos, des cartables.", MG + " Le lieu de naissance vient de l'histoire publique de la marque.")
I("archetype", "Le Bouffon (Jester) — secondaire : l'Ami. On rit avec, jamais contre.", MG)
I("ton", "Pas sérieux, spirituel, dans une voix sociale et organique ; bienveillant — on rit avec les gens, jamais d'eux. "
  "Au Cameroun : le français de la rue, le camfranglais, l'anglais — jamais la traduction automatique du dossier global.", MG)
I("symboles", ["La vache rouge qui rit", "Ses boucles d'oreilles : deux boîtes de La vache qui rit", "La boîte ronde et ses portions triangulaires",
               "La languette rouge qui ouvre la portion", "Le rouge et le bleu"], MG)
I("concurrents", ["Les autres fromages fondus en portions ou en tranches", "Les tartinables du pain du matin : chocolat à tartiner, margarine, pâte d'arachide",
                  "Les snacks des boutiques de quartier"], MG + " Le mur de catégorie camerounais reste à faire.")
I("benefices", ["Émotionnel : un moment de joie et de lien", "Social : une portion se partage",
                "Fonctionnel : un fromage crémeux et pratique, en portions individuelles"], MG)
I("preuves", ["Des portions individuelles, emballées une à une", "Plus de cent ans de marque", "Un groupe présent dans plus de 120 pays"], MG)
I("sacrifice", "Renoncer au discours nutrition et goûter d'enfant pour parler de rire et de lien aux jeunes adultes — au risque de "
  "dérouter les mères, qui restent les acheteuses.", MG)
I("jamais", ["La politique, même par allusion", "La région, l'ethnie, la langue d'origine comme sujet de dispute",
             "Rire contre quelqu'un", "« Fais-la rire » lu comme « souris davantage » adressé aux femmes (plan de crise)"], MG)
I("ne_fera_pas", ["Amplifier un contenu d'utilisateur politique ou offensant (plan de crise)", "Débattre avec les critiques point par point (plan de crise)",
                  "Laisser croire que la vache ne rira plus jamais : l'arrêt est temporaire"], MG)
I("rituels", ["Le pain du matin et le goûter avec une portion", "Ouvrir la portion par la languette rouge", "Couper la portion en deux pour la partager"],
  MG + " Rituels camerounais à confirmer sur le terrain.")
I("occasions", ["Rentrée scolaire — Back to School Cameroun", "Ramadan — « Ramadan Mubarak »",
                "Spread the Laugh — automne 2026 aux États-Unis, à adapter"], MG)
trace("plateforme de marque", "La Vache qui rit : 8 champs reçus du dossier global, 12 inférés ; ombrelle Bel : 4 champs", "marques", "MQ-lvqr", ["MQ-lvqr"])

# ════════════ 3. Les contacts, sans coordonnées personnelles ════════════
contacts = d.setdefault("contacts", [])
NOTE_C = "Équipe Spread the Laugh (plan de crise Edelman, 28/09/2026). Coordonnées dans le document source, non recopiées."
for ident, nom, role, niveau in [
    ("CT-bel-lopez", "Paloma Lopez", "Chief Sustainability & Communications Officer, Bel North America", "valide les réponses de crise"),
    ("CT-bel-knight", "Lauren Knight", "External Communications & Mission Manager, Bel US", "boîte médias Bel"),
    ("CT-bel-pearlstein", "Jamee Pearlstein", "CMO, Bel US Cheese Brands", "valide les réponses de crise"),
    ("CT-bel-dillon", "Jessica Dillon", "Sr Brand Director, The Laughing Cow et Babybel", "direction de marque"),
    ("CT-bel-white", "Danielle White", "VP Legal, Bel US", "revue juridique"),
    ("CT-bel-barba", "Molly Barba", "Consumer Affairs, Bel US", "service consommateurs"),
    ("CT-bel-hunter", "Rocki Hunter", "Head of IMC, Bel US", "veille sociale"),
    ("CT-bel-kim", "Annie Kim", "IMC, Bel US", "veille sociale"),
    ("CT-bel-mcguinness", "Peter McGuinness", "CEO, Bel North America", "porte-parole (communiqué acte 2)"),
]:
    if not any(c["id"] == ident for c in contacts):
        contacts.append({"id": ident, "clientId": "C-bel", "nom": nom, "role": role, "niveau": niveau,
                         "marches": [], "note": NOTE_C})
for ident, nom, role in [
    ("CT-ag-edelman", "Edelman — Crisis & Issues", "Stephanie Addison, Jodie Singer ; compte : Adelaide Feuer — alias fonctionnel BelBrandsCrisis@edelman.com"),
    ("CT-ag-bestudio", "BeStudio (Oliver)", "Erin Sharpe, Veronica Casey — veille et réponse sociale"),
    ("CT-ag-horizon", "Horizon Media", "Arminda Guillama Rodriguez — médias payants"),
    ("CT-ag-onehorizon", "One Horizon", "Joan Deni"),
    ("CT-ag-inbeat", "InBeat", "TJ — créateurs"),
    ("CT-ag-spool", "Spool Marketing", "Jody Moore, Taryn Parker — relations presse (contact presse des communiqués)"),
]:
    if not any(c["id"] == ident for c in contacts):
        contacts.append({"id": ident, "clientId": "C-bel", "nom": nom, "role": role, "niveau": "agence partenaire (US)",
                         "marches": [], "note": NOTE_C})

# ════════════ 4. La campagne et le dossier ════════════
camp_id = "CMP-lvqr-stl-cm-2026"
if not any(c["id"] == camp_id for c in d["campagnes"]):
    d["campagnes"].append({"id": camp_id, "nom": "La Vache qui rit — Spread the Laugh, angle Cameroun", "clientId": "C-bel",
        "marqueIds": ["MQ-lvqr"], "regime": "ponctuelle", "occasion": "institutionnel", "fenetre": {}, "marches": ["M-CM"],
        "bilan": "", "ecartes": {}, "cree_le": QUAND, "source": SOURCE,
        "infere": {"pourquoi": "Adaptation camerounaise d'une campagne globale de prise de parole de marque. Aucune fenêtre n'est "
                               "donnée : la campagne américaine se termine le 1er novembre 2026.", "quand": QUAND}})

INF = {}
def s(section, cle, val, motif=None):
    p["sections"].setdefault(section, {})[cle] = val
    if motif: INF[section + "." + cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}

existe = [x for x in d["projets"] if x["id"] == "PRJ-STL-CM"]
if existe:
    p = existe[0]
else:
    p = {"id": "PRJ-STL-CM", "ref": "MT-0050", "nom": "Spread the Laugh — La Vache qui rit, angle Cameroun",
         "gabarit": "campagne", "nature": "campagne", "cree_le": QUAND, "statut": "cadrage", "campagneId": camp_id,
         "equipe": [{"personne": "P-alex", "poste": "creation"}, {"personne": "P-serge", "poste": "da"},
                    {"personne": "P-vanelle", "poste": "planning"}, {"personne": "P-derick", "poste": "clientele"},
                    {"personne": "P-claude", "poste": "redacteur"}],
         "sections": {"identite": {}, "brief": {}, "briefback": {}, "socle": {}, "strategie": {}, "bigidea": {}, "pistes": []},
         "idees": [], "fils": [], "volets": [], "livrables": [], "notes": [], "insights": [], "territoires": [],
         "perimetre": {"supports": [], "marches": ["M-CM"]}}
    d["projets"].append(p)

MC = ("Inféré pour le Cameroun à partir du dossier global : aucun brief local n'existe. ")

# — identité —
s("identite", "client", "Bel"); s("identite", "marque", "La Vache qui rit")
s("identite", "clientId", "C-bel"); s("identite", "marqueIds", ["MQ-lvqr"]); s("identite", "debut", "2026-09-30")
s("identite", "budget", None)
s("identite", "type", "Adaptation camerounaise d'une campagne globale : angle, idée et dispositif social à proposer",
  MC + "La demande est de préparer un angle, pas de décliner les pièces américaines.")
s("identite", "objectif", "Faire entrer La Vache qui rit dans la culture des jeunes adultes camerounais — qu'ils la partagent et en rient "
  "entre eux, au lieu de la laisser au goûter des petits.", MC + "Traduit de « Get The Laughing Cow into culture among younger consumers » (p. 2).")
s("identite", "fenetre", "À caler : après la fin de l'activation américaine (1er novembre 2026), hors Ramadan (vers février–mars 2027) "
  "et hors toute séquence électorale camerounaise — le calendrier des élections de 2026 est à vérifier avant de proposer une date.",
  MC + "Le thème de la « division » est explosif à l'approche d'un scrutin : c'est la première leçon du plan de crise américain, "
  "construit autour des élections de mi-mandat.")
s("identite", "echeance", None)
s("identite", "decideur", "Le marketing Bel pour le Cameroun (Afrique centrale) — nom à obtenir par Derick",
  MC + "Le dossier ne nomme que l'équipe américaine.")
s("identite", "tueur", "L'équipe de marque globale The Laughing Cow et Bel Corporate : ils valident toute réponse de crise (plan Edelman) "
  "et détiennent les droits des éléments — une adaptation locale ne peut pas les contourner.", MC + "Plan de crise, rôles et escalade.")
s("identite", "circuit", "À établir avec Derick : validation Bel Cameroun, puis accord de l'équipe globale sur l'usage des éléments "
  "(images presse limitées à l'organique ; police en attente de droits).", MC)
s("identite", "mesure", ["Notoriété et mémorisation chez les 18-30 ans urbains — source : étude à convenir avec Bel",
  "Vues, engagements, usages du hashtag et portée sur TikTok et Facebook — statistiques des plateformes",
  "Sentiment de la conversation — veille sociale, comme aux États-Unis",
  "Participation au défi — nombre de vidéos publiées"],
  MC + "Repris des indicateurs par canal de la campagne américaine (p. 17).")
s("identite", "pilier", "E", MC + "Une campagne de culture et de participation : pilier Engagement.")

# — brief —
b = "brief"
s(b, "porteur", "P-derick")
s(b, "verbatim", "« Get The Laughing Cow into culture among younger consumers. » (The brief, présentation globale, p. 2.)\n"
  "Transmis par Derick Tchaou le 29/09/2026 avec l'ensemble du dossier américain. La demande à l'agence : préparer un angle pour le Cameroun.")
s(b, "campagne_source",
  "« Spread the Laugh », campagne américaine de The Laughing Cow (Bel US), en trois actes, du 14 septembre au 1er novembre 2026. "
  "Acte 1 — elle arrête de rire : packs « The Not Laughing Cow » en édition limitée (Albertsons, Target), prise de contrôle des "
  "réseaux, deux teasers de 15 s, page d'attente TheNotLaughingCow.com, créateurs qui réagissent. Acte 2 — pourquoi : les petites "
  "disputes du quotidien (« wedge issues ») nous divisent ; vidéo d'explication de 30 s, lettre ouverte, intégration à Jimmy Kimmel "
  "Live! (29/09 : les chaussettes dans les sandales), Josh Johnson en micro-trottoir. Acte 3 — on la fait rire à nouveau : défi UGC "
  "#SpreadTheLaugh (5–25 octobre) sur TikTok, créateurs, puis retour du pack qui rit vers le 1er novembre, avant les élections de mi-mandat. "
  "Plateforme créative : Spread the Laugh. Agences : BeStudio (Oliver), Edelman, Horizon Media, InBeat, Spool, One Horizon.")
s(b, "strategie_client", "Faire entrer la vache dans la culture des jeunes consommateurs. Lead belief : « Laughter is an active rebellion "
  "against taking life too seriously. » We are : « an unserious wedge of spreadable cheese with serious taste for laughter ». So we will : "
  "« make every little wedge something we can laugh about ». Au niveau du groupe : « For all, for good ».")
s(b, "probleme", "Aux États-Unis comme ailleurs, la marque est centenaire, aimée, et associée à l'enfance — les boîtes à goûter, les frigos, "
  "les cartables. Elle doit entrer dans la culture des jeunes adultes. Au Cameroun, s'y ajoute sa communication récente : rentrée "
  "scolaire, goûter, nutrition — parlée aux mères et aux enfants.",
  MC + "Lu dans la présentation (p. 6 : « lunchboxes, refrigerators, backpacks ») et dans les dossiers Bel Cameroun de la maison (Back to School).")
s(b, "objectif_business", "Recruter et fidéliser les jeunes adultes comme acheteurs de portions pour eux-mêmes, au-delà du goûter des enfants.",
  MC + "Le dossier global ne donne aucun objectif business : celui-ci est une déduction à faire confirmer.")
s(b, "objectif_com", "Faire entrer la vache dans la culture des 18-30 ans : notoriété, conversation et participation — faire parler de la "
  "marque sur TikTok, Facebook et WhatsApp, et y faire jouer les gens.", MC + "Traduit du brief global et des rôles de canaux (p. 17).")
s(b, "jtbd", "Amener les 18-30 ans urbains, qui connaissent La Vache qui rit depuis l'enfance, à la réinviter dans leurs moments entre amis — "
  "à la partager et à en rire — grâce à une idée qu'ils peuvent jouer eux-mêmes, dans leur langue.", MC)
s(b, "comportement_actuel", "« La Vache qui rit, c'est le goûter de quand j'étais petit, le pain de l'école. Je l'aime bien, je n'y pense plus. »", MC)
s(b, "comportement_vise", "« La Vache qui rit, c'est la marque qui nous fait rire entre nous — on se la passe, on se chambre avec. »", MC)
s(b, "cible", "Cœur : les 18-30 ans urbains de Douala et Yaoundé — étudiants, jeunes actifs, débrouillards — sur TikTok, Facebook et "
  "WhatsApp, qui parlent français, anglais et camfranglais. Élargie : ceux avec qui ils se chamaillent — frères et sœurs, colocataires, "
  "collègues, amis. Tension : ils adorent débattre et se chambrer, mais ont appris qu'un débat peut vite mal tourner.",
  MC + "Le dossier global vise les « younger consumers », nouveaux à la marque d'abord (p. 17).")
s(b, "insight", "Au Cameroun, on se chamaille pour rire — au bar, au carrefour, dans le groupe WhatsApp — tant que le débat ne touche ni la "
  "politique ni la région. C'est là que la vache peut jouer : la dispute qui finit en partage.",
  MC + "Détaillé dans les insights du dossier.")
s(b, "promesse", "Une portion, ça se partage — pas une dispute.", MC + "Adapté de la vérité de marque : « a wedge is meant to be shared, not the thing that divides us ».")
s(b, "message_cle", "Nos petites disputes ne valent pas la division : une portion, c'est fait pour être partagé. "
  "(« She believes a wedge is meant to be shared, not the thing that divides us. »)")
s(b, "hierarchie_messages", [
  "L'accroche : « After 100 years The Laughing Cow stopped laughing. » — Cameroun : « Après plus de cent ans, La Vache qui rit ne rit plus. »",
  "La tension : « Why? Small, petty arguments are driving a wedge between us. »",
  "La vérité de marque : « She believes a wedge is meant to be shared, not the thing that divides us. »",
  "Le récit long (page, talents, créateurs) : « We debate putting toilet paper over-or-under… People are taking things a little too seriously. "
  "Creating wedge issues out of just about anything. None of it is worth the divide. It's time to do better, come together and laugh again. »",
  "Le récit profond (presse, interviews) : elle rit depuis plus de cent ans — films muets, moonwalk, disco, invention de la section "
  "commentaires ; elle est partie voir de quoi riaient les gens et a trouvé une nation divisée… sur les plus petites choses.",
  "La marque : « an iconic brand of deliciously creamy, soft spreadable cheese… famous for its individually wrapped foil wedges… "
  "guided by its core purpose, inspiring people to choose to laugh at life »."])
s(b, "ctas", ["WE NEED TO TALK — pistes camerounaises : « Il faut qu'on parle », « On doit causer »",
              "MAKE HER LAUGH AGAIN — « Fais-la rire », « Redonnons-lui son rire » ; attention à la lecture « souris davantage » (plan de crise)",
              "JOIN THE CHALLENGE — « Rejoins le défi » ; mécanique : « Own it » (« Voici ma wedge issue… »), puis « Make a plea » (demander à la vache de rire à nouveau)"])
s(b, "calendrier", [
  "Semaine du 14/09 — packs « The Not Laughing Cow » en rayon, page d'attente en ligne, pré-diffusion presse sous embargo",
  "21-22/09 — prise de contrôle des réseaux, deux teasers de 15 s, communiqué de l'acte 1 (22/09)",
  "Semaine du 28/09 — vidéo d'explication, lettre ouverte, créateurs révèlent les wedge issues ; décision go / no-go Kimmel le 28/09",
  "29/09 — Jimmy Kimmel Live! (enregistrement 16-18 h ; diffusion) ; veille sociale à 0 h 50",
  "30/09 — veille du sentiment 6 h, communiqué de l'acte 2 (8-9 h), LinkedIn (11-12 h), Josh Johnson, créateurs",
  "1er-2/10 — créateurs, amplification",
  "Semaine du 5/10 — Josh Johnson, créateurs rejoignent le défi ; 5-25/10 : défi UGC #SpreadTheLaugh (TikTok Branded Buzz)",
  "Semaine du 26/10 — contenu de clôture, le rire revient en rayon, les réseaux reviennent ; idéalement le 1er novembre",
  "Cameroun — aucune date : la séance de brainstorm est à fixer ; fenêtre de diffusion à caler (voir identité)"])
s(b, "canaux", [
  "Consumer media — contribution : notoriété ; audience : nouveaux à la marque, puis clients actuels ; rôle : notoriété large et amplification ; KPIs : portée, engagement (6 s, VCR)",
  "Influence / créateurs (macro et TikTok Branded Buzz) — notoriété ; nouveaux à la marque ; susciter la conversation et le buzz UGC ; KPIs : vues, engagements, usages du hashtag, portée",
  "Social possédé — sentiment et engagement ; clients actuels ; créer l'attente chez les fans et tenir le récit ; KPIs : taux d'engagement, sentiment, abonnés gagnés",
  "Earned / RP — notoriété top of mind et buzz ; médias, clients actuels et nouveaux ; faire parler du stunt et du changement de pack ; KPIs : impressions, retombées, part de voix, qualité",
  "Page de marque (TheNotLaughingCow.com) — information et considération ; nouveaux à la marque ; centre d'information du défi ; KPIs : temps passé, clics vers le défi",
  "Cameroun (inféré) — Facebook et WhatsApp pèsent autant que TikTok ; les statuts WhatsApp sont un canal de partage à part entière"])
s(b, "risques", [
  "Lecture politique — au Cameroun plus encore qu'aux États-Unis : « division » renvoie à des fractures réelles (politique, région, langue). "
  "Garde-fou : aucune dispute qui touche la politique, la région, l'ethnie, la langue ou la religion",
  "Banalisation — dire « on prend tout trop au sérieux » peut sembler minimiser de vraies souffrances. Garde-fou : « il y a plein de choses "
  "qui ne sont pas drôles » — la campagne ne parle que des disputes futiles",
  "Contenus d'utilisateurs hors sujet — ne jamais les amplifier ; guider les créateurs par brief avec sujets interdits",
  "Talents — un humoriste local peut porter une étiquette politique : les qualifier avant de les engager",
  "Événement extérieur grave — suspendre toute la programmation ; prévoir qui décide de la pause",
  "Confusion sur le pack — au Cameroun, un pack qui change peut être pris pour une contrefaçon (inféré) ; le changement de pack américain ne se reprend pas sans décision de Bel",
  "« Fais-la rire » lu comme « souris davantage » adressé aux femmes — tenir la formule sur le récit de la vache",
  "Traduction — la version française du dossier est une traduction automatique (« La Vache Rieuse », « questions de coin ») : ne rien en reprendre"])
s(b, "messages_reactifs", [
  "Accusé d'être politique : « Spread the Laugh parle des petites disputes du quotidien dont on peut tous rire. Le rire fait partie de cette "
  "marque depuis plus de cent ans ; la campagne veut rassembler en riant de ce sur quoi on n'est pas d'accord au quotidien. »",
  "Accusé de banaliser : « Nous savons qu'il y a plein de choses qui ne sont pas drôles. Spread the Laugh parle seulement des petits désaccords "
  "qui déclenchent des avis très tranchés. »",
  "Sur le mot « wedge issues » : il joue sur les portions de La vache qui rit et sur les petits désaccords qui creusent un fossé entre les gens",
  "Pack introuvable ou déroutant : « La vache qui ne rit plus est une édition limitée ; le produit à l'intérieur est exactement le même. »",
  "Est-ce vraiment Bel ? « Bien vu ! C'est 100 % réel et produit par nous. C'est juste que La vache qui rit a arrêté de rire. »",
  "Pire scénario : rappeler que la campagne est de courte durée, que la vache revient, qu'elle n'a jamais été politique ni destinée à minimiser des sujets graves",
  "Appels au boycott isolés : ne pas répondre ; escalader seulement si retombées médias, inquiétude des distributeurs ou impact mesurable"])
s(b, "droits_usage", [
  "Images presse (diner, balançoire, packs côte à côte, pack et portion ×2) — organique seulement, usage global (28/09)",
  "Teaser « Park » 15 s, tous formats et masters, avec ou sans texte — organique et payant, usage global (28/09)",
  "Photo de profil de l'acte 1 — tout usage, global (29/09)",
  "Police Bobby Jones Soft — en attente de droits globaux (29/09) : ne pas l'employer",
  "Intégration Jimmy Kimmel Live! — image de la loge soumise à l'accord de Disney pour la presse : non disponible pour le Cameroun",
  "Aucun élément n'est validé pour une adaptation locale re-titrée : à demander à l'équipe globale avant toute production"])
s(b, "mandatories", ["Le nom local : La vache qui rit — jamais « The Laughing Cow » ni la traduction « La Vache Rieuse »",
  "L'arrêt du rire est temporaire : la vache rit à nouveau à la fin", "Le produit ne change pas : c'est la même recette",
  "Aucune dispute politique, régionale, ethnique, linguistique ou religieuse", "Les droits d'usage des éléments globaux"],
  MC + "Les quatre premiers sont repris du plan de crise et de la hiérarchie des messages.")
s(b, "livrables_attendus", ["Un angle Cameroun présentable : insight local, idée, adaptation des trois actes, garde-fous",
  "Une liste de wedge issues camerounaises futiles, testées en interne", "Un dispositif social : TikTok, Facebook, WhatsApp, créateurs locaux",
  "Une proposition de talents locaux qualifiés (audience jeune, aucune étiquette politique)"],
  MC + "La demande dit « préparer un angle » : le périmètre est celui d'une recommandation, pas d'une production.")
s(b, "kpis", ["Vues, engagements, usages du hashtag et portée — statistiques TikTok et Facebook", "Sentiment de la conversation — veille sociale",
  "Nombre de vidéos publiées pour le défi — décompte du hashtag", "Notoriété chez les 18-30 ans — étude à convenir avec Bel"],
  MC + "Repris des KPIs par canal américains (p. 17), sources à confirmer localement.")
s(b, "contraintes", "Aucun brief local : tout ce qui est camerounais est à faire valider. Éléments globaux sous droits limités (voir droits "
  "d'usage). Langues : français, anglais, camfranglais. Le changement de pack américain n'est pas transposable sans décision de Bel "
  "Afrique (production, distribution, risque de contrefaçon).", MC)
s(b, "ton", "Pas sérieux, spirituel, voix sociale et organique — celle des réseaux camerounais : chambrer sans blesser. On rit avec, jamais "
  "contre. Ni leçon de morale, ni politique.", MC + "Adapté de la hiérarchie des messages : « delivery in a social first organic voice ».")
s(b, "rtb", ["Plus de cent ans de rire (depuis 1921)", "Des portions emballées une à une : faites pour être partagées",
             "Une marque connue de tous au Cameroun, des cartables aux boutiques de quartier"],
  MC + "Les deux premières viennent du dossier global ; la troisième est une lecture locale à confirmer.")

# — brief-back —
s("briefback", "compris", "Le sujet n'est pas de traduire Spread the Laugh : c'est de trouver au Cameroun la dispute futile qui fait rire "
  "au lieu de diviser — dans un pays où le mot « division » n'est jamais anodin.", MC)
s("briefback", "couche", "culture", MC + "La contradiction — adorer débattre, redouter la division — est culturelle ; elle commande la big idea.")
s("briefback", "propose", "Un angle Cameroun en trois actes adaptés, une liste de wedge issues locales, un dispositif social et une liste de talents qualifiés.", MC)
s("briefback", "ecart", "Nous ne proposons pas de reprendre le changement de pack ni le récit de la division tel quel : le premier se heurte "
  "au risque de contrefaçon, le second au contexte politique camerounais. Nous gardons la vérité de marque — une portion se partage — "
  "et le rire perdu, à faire valider par Bel.", MC)

# — stratégie —
s("strategie", "probleme_reel", "La vache est connue de tous et associée à l'enfance : les jeunes adultes l'aiment sans la choisir. La faire "
  "entrer dans leur culture suppose de parler leur humour — et le Cameroun a un humour de la chamaille, pas de la division.", MC)
s("strategie", "opportunite", "Personne dans la catégorie ne parle aux jeunes adultes camerounais de rire et de partage ; la chamaille "
  "futile est un genre national sur TikTok et dans les groupes WhatsApp ; et le dossier global fournit déjà un personnage, un teaser "
  "sans texte réutilisable et un plan de crise éprouvé.", MC)
s("strategie", "gardefous", ["Aucune dispute politique, régionale, ethnique, linguistique ou religieuse — liste d'interdits dans chaque brief créateur",
  "Pas de reprise de la traduction française du dossier", "Pas de changement de pack sans décision de Bel Afrique",
  "Chaque talent qualifié avant engagement", "Un protocole de pause décidé avant le lancement, avec son décideur"], MC)
s("strategie", "pointsEntree", ["Le pain du matin", "Le goûter", "La pause entre amis au quartier", "Le match regardé ensemble",
  "Le groupe WhatsApp de la famille ou des amis"], MC + "Situations camerounaises à confirmer.")
s("strategie", "a_garder", ["Le personnage de la vache et l'arrêt de son rire — le mystère qui ouvre", "La vérité de marque : une portion se partage",
  "La mécanique du défi : « Voici ma wedge issue… », puis on demande à la vache de rire à nouveau",
  "Le teaser « Park » sans texte, re-titrable si Bel l'autorise", "Le plan de crise : veille, escalade, messages réactifs"], MC)
s("strategie", "a_adapter", ["Les wedge issues : camerounaises, futiles — la nourriture, les transports, le téléphone, le foot",
  "La langue : français de la rue, camfranglais, anglais — jamais la traduction automatique",
  "Les talents : des humoristes et créateurs camerounais qualifiés à la place de Jimmy Kimmel et Josh Johnson",
  "Les canaux : Facebook et WhatsApp à égalité avec TikTok", "La fenêtre : hors élections, hors Ramadan"], MC)
s("strategie", "a_ecarter", ["Le changement de pack — risque de contrefaçon perçue, décision de production qui n'est pas la nôtre",
  "Le vocabulaire de la « division » et des « wedge issues » au sens politique américain — trop chargé ici",
  "Le calage sur des élections — c'est ce que tout le plan de crise cherche à désamorcer",
  "Les éléments réservés : image de la loge Kimmel (Disney), police en attente de droits"], MC)

# — la big idea sur la table : la plateforme globale —
s("bigidea", "idee", "Spread the Laugh — la vache a arrêté de rire parce que nous avons arrêté ; on la fait rire à nouveau en riant ensemble "
  "de nos petites disputes.", "Plateforme créative globale, reprise telle quelle pour être comparée aux angles camerounais.")
s("bigidea", "mecanique", "Trois actes : elle arrête de rire (mystère) ; on apprend pourquoi (nos petites disputes nous divisent) ; chacun "
  "partage sa dispute futile en vidéo et lui demande de rire à nouveau ; elle retrouve son rire.",
  "Présentation globale, p. 10.")
s("bigidea", "rattachement", "Rattachée à la raison d'être de la marque — « inspiring people to choose to laugh at life » — et à sa vérité : une portion se partage.",
  "Hiérarchie des messages.")
s("bigidea", "campagne", "Spread the Laugh", "Nom de la plateforme globale ; le nom camerounais reste à trouver.")
s("bigidea", "signature", "#SpreadTheLaugh — pistes locales : #FaisLaRire, #LaVacheNeRitPlus, #ÉtaleLeRire",
  "Le hashtag global et trois pistes françaises à tester ; « étaler » joue sur le fromage tartinable.")
s("bigidea", "ton_campagne", "Pas sérieux, complice, chambreur sans blesser", MC)
s("bigidea", "criteres", ["Elle se joue en vidéo courte, par n'importe qui, dans sa langue", "Aucune dispute proposée ne touche la politique, la région, la langue ou la religion",
  "La vache reste le personnage : c'est elle qu'on veut faire rire", "Elle tient sans changer le pack"], MC)
s("bigidea", "interdits", ["Reprendre la traduction automatique du dossier", "Le récit de la « division » nationale",
  "Des talents à étiquette politique"], MC)
s("bigidea", "validite", "L'idée ne vaut au Cameroun que si ses disputes font rire tout le monde et n'en blessent aucun : une seule "
  "wedge issue mal choisie la fait basculer dans ce qu'elle voulait désamorcer.", MC)
bi = p["sections"]["bigidea"]
bi["source"] = "Plateforme créative globale « Spread the Laugh » (US, 27/09/2026) — ni arbitrée, ni attribuée pour le Cameroun"
p.setdefault("inferences", {}).update(INF)

# ════════════ 5. Insights, territoires, propositions par école ════════════
MI = ("Proposé pour préparer le brainstorm. Les sources locales marquées « terrain » sont des lectures de la maison, à confirmer ; "
      "le test en trois questions se rejoue en équipe.")
def infere(x=""): return {"pourquoi": MI + (" " + x if x else ""), "quand": QUAND, "par": PAR}
IN = [
 {"id": "IN-stl-1", "couche": "culture",
  "passes": {"longue": "Au Cameroun, la dispute est un plaisir partagé : on se chambre au bar, on débat au carrefour, on s'écharpe dans le "
             "groupe WhatsApp pour savoir si le ndolé se mange avec du plantain ou du miondo. Mais dès qu'un débat touche la politique, "
             "la région ou la langue, plus personne ne rit — et tout le monde le sait.",
             "temps": {"situation": "On adore débattre et se chambrer, partout, pour tout.",
                       "tension": "On a appris qu'un débat peut basculer du jeu à la fracture en une phrase.",
                       "empeche": "Faute de terrain sûr, on garde pour soi le plaisir de la chamaille."},
             "phrase": "Au Cameroun, on se chamaille pour rire — tant que ça ne touche ni la politique ni la région."},
  "sources": [{"type": "publique", "quoi": "Le plan de crise américain : tout le risque de la campagne vient de la lecture politique du mot « division » (Edelman, 28/09)"},
              {"type": "culture", "quoi": "Les débats futiles comme genre des réseaux camerounais — chambrage, kongossa, sketchs d'humoristes (terrain, à documenter)"},
              {"type": "publique", "quoi": "La présentation globale, p. 4 : chaque pays a ses wedge issues (pain au chocolat ou chocolatine, la bise à deux ou trois)"}],
  "test": {"contredit": True, "gene": True, "ouvre": True}},
 {"id": "IN-stl-2", "couche": "consommateur",
  "passes": {"longue": "Pour un Camerounais de vingt-cinq ans, La Vache qui rit, c'est le pain de l'école et le goûter de l'enfance. On l'aime, "
             "on la reconnaît partout, mais on la laisse aux petits frères : ce n'est pas une marque qu'on sort entre amis.",
             "temps": {"situation": "La vache est un souvenir d'enfance que tout le monde partage.",
                       "tension": "On l'aime, mais elle appartient au cartable, pas à la bande.",
                       "empeche": "Tant qu'elle reste au goûter, elle ne fait pas partie de nos moments à nous."},
             "phrase": "La Vache qui rit, c'est notre goûter d'enfant — on l'aime, mais on la laisse aux petits."},
  "sources": [{"type": "publique", "quoi": "La présentation globale, p. 6 : cent ans « from lunchboxes, refrigerators, backpacks »"},
              {"type": "publique", "quoi": "Les dossiers Bel Cameroun de la maison : Back to School Cameroun, la communication parlée aux mères et aux enfants"},
              {"type": "publique", "quoi": "Le brief global : « get The Laughing Cow into culture among younger consumers » — le même problème aux États-Unis"}],
  "test": {"contredit": True, "gene": True, "ouvre": True}},
 {"id": "IN-stl-3", "couche": "categorie",
  "passes": {"longue": "Les fromages fondus parlent aux mères : calcium, goûter, rentrée. Personne ne parle aux jeunes adultes de ce qu'ils "
             "font avec une portion — la couper en deux, la tendre à l'autre, la manger en se chambrant.",
             "temps": {"situation": "La catégorie parle nutrition et goûter, aux mères.",
                       "tension": "Les jeunes adultes en mangent aussi, mais personne ne leur parle.",
                       "empeche": "Rester sur la convention, c'est laisser la marque vieillir avec ses acheteuses."},
             "phrase": "Le fromage fondu parle aux mamans du goûter ; personne ne parle aux jeunes de ce qu'ils partagent."},
  "sources": [{"type": "publique", "quoi": "Les campagnes Bel Cameroun de la maison : rentrée scolaire, For Good (pack), goûter"},
              {"type": "mur", "quoi": "Le mur de catégorie camerounais reste à faire : trois visuels de concurrents avant de présenter cette convention"}],
  "test": {"contredit": True, "gene": False, "ouvre": True},
  "x": "Deux oui sur trois et une convention supposée : il faut le mur de catégorie."},
 {"id": "IN-stl-4", "couche": "consommateur",
  "passes": {"longue": "Une portion se partage déjà : on la coupe en deux, on l'offre, on la tartine sur le pain d'un autre. Même son ouverture "
             "fait débat — la languette rouge ou l'ongle. Le triangle est fait pour être donné.",
             "temps": {"situation": "Chacun a sa façon de manger sa portion.",
                       "tension": "On n'est d'accord sur rien — ni comment l'ouvrir, ni comment la manger — et pourtant on se la passe.",
                       "empeche": "Personne n'a encore fait de ces petites manies un jeu commun."},
             "phrase": "Même pour ouvrir une portion, on n'est pas d'accord — et pourtant on se la passe."},
  "sources": [{"type": "publique", "quoi": "La vérité de marque globale : « a wedge is meant to be shared, not the thing that divides us »"},
              {"type": "terrain", "quoi": "La portion vendue à l'unité dans les boutiques de quartier, et coupée pour être partagée (terrain, à confirmer)"},
              {"type": "publique", "quoi": "La hiérarchie des messages : « wedge issues x recipes », les débats culinaires comme contenu (US, social possédé)"}],
  "test": {"contredit": True, "gene": False, "ouvre": True}},
 {"id": "IN-stl-5", "couche": "entreprise",
  "passes": {"longue": "Aux États-Unis, le pack qui ne rit plus a déclenché la question « est-ce vraiment Bel ? ». Au Cameroun, où la peur "
             "du faux et du périmé est forte, un pack qui change peut être pris pour une contrefaçon — et faire fuir l'acheteuse.",
             "temps": {"situation": "La campagne américaine commence par un changement de pack.",
                       "tension": "Ici, un pack qui change fait d'abord penser à un faux.",
                       "empeche": "Reprendre le stunt, c'est risquer la confiance qu'il devait amuser."},
             "phrase": "Au Cameroun, un pack qui change fait d'abord penser à une contrefaçon."},
  "sources": [{"type": "publique", "quoi": "Plan de crise, déclaration déployée : « Good eye! We can confirm that The NOT Laughing Cow is 100 % real and produced by us »"},
              {"type": "terrain", "quoi": "La méfiance envers les contrefaçons et les produits périmés sur les marchés camerounais (terrain, à documenter)"}],
  "test": {"contredit": True, "gene": True, "ouvre": True},
  "x": "Couche entreprise : elle ne commande pas l'idée, elle commande une décision à Bel — pas de changement de pack local sans elle."},
]
ins = p.setdefault("insights", [])
for i in IN:
    x = i.pop("x", "")
    if not any(y["id"] == i["id"] for y in ins):
        i.update({"auteur": None, "ecrit_le": QUAND, "infere": infere(x)}); ins.append(i)

ts = p.setdefault("territoires", [])
for t in [
  {"id": "TR-stl-1", "nom": "La chamaille qui rassemble", "insightId": "IN-stl-1", "ecole": None,
   "quoi": "Les disputes futiles du quotidien camerounais — la nourriture, le taxi, le téléphone, le foot — jouées pour rire et qui "
           "finissent en partage. La vache y est l'arbitre qui ne tranche jamais : elle veut juste qu'on rie."},
  {"id": "TR-stl-2", "nom": "La portion qu'on se passe", "insightId": "IN-stl-4", "ecole": None,
   "quoi": "Les manies autour de la portion — l'ouvrir, la couper, la tartiner, la tendre à l'autre. Le produit devient le terrain de jeu, "
           "et le geste de partage la réponse à toutes les disputes."},
]:
    if not any(y["id"] == t["id"] for y in ts):
        t.update({"convention": None, "reduction": None, "cree_le": QUAND,
                  "infere": {"pourquoi": "Ouvert pour préparer le brainstorm à partir de son insight. Plusieurs concepts doivent pouvoir y vivre.",
                             "quand": QUAND, "par": PAR}}); ts.append(t)

MB = ("Proposée pour préparer le brainstorm, à partir du dossier global et de la doctrine des écoles. Ni arbitrée, ni attribuée : "
      "l'auteur se nomme en séance.")
def prop(i, e, t, ph, me, ch, ins_, ter, source=None):
    c = {"id": i, "ecole": e, "titre": t, "phrase": ph, "mecanique": me, "champs": ch, "insightId": ins_, "territoireId": ter,
         "auteur": None, "statut": "proposee", "cree_le": QUAND, "infere": {"pourquoi": MB, "quand": QUAND, "par": PAR}}
    if source:
        c["source"] = source
        c["infere"] = {"pourquoi": "La plateforme globale, reprise telle quelle pour être comparée aux angles camerounais. Son école n'est "
                                   "pas déclarée : la retrouver est l'exercice de rétro-ingénierie — on y lit une Cultural Strategy (la "
                                   "division comme contradiction sociale) portée par un Big Ideal (« laughter is an active rebellion »).",
                       "quand": QUAND, "par": PAR}
    return c
PROPS = [
 prop("BE-stl-global", None, "Spread the Laugh", bi["idee"], bi["mecanique"], {}, "IN-stl-1", "TR-stl-1",
      source="plateforme créative globale (US), présentation du 27/09"),
 prop("BE-stl-culture", "cultural-strategy", "On doit causer",
      "Au Cameroun, on se chamaille pour rire — et ça finit en partage.",
      "La vache ne rit plus. Pour la faire rire, chacun publie sa chamaille futile — « Ndolé : plantain ou miondo ? » — et la termine en "
      "tendant une portion à l'autre camp.",
      {"contradiction": "On adore débattre, et on redoute le débat qui divise : la chamaille est un plaisir national, la division une peur nationale.",
       "mythe": "La chamaille pour rire : celle qui finit autour de la même table, la portion partagée.",
       "droit": "La marque est la vérité même du partage — une portion est faite pour être donnée — et elle est connue de tous, de tous âges."},
      "IN-stl-1", "TR-stl-1"),
 prop("BE-stl-ideal", "big-ideal", "Rire, c'est rester ensemble",
      "On peut ne jamais être d'accord et rire ensemble quand même.",
      "Des duos que tout oppose sur une broutille — deux frères, deux colocataires, deux collègues — défendent leur camp, puis rient ; la "
      "vache retrouve un peu de son rire à chaque duo.",
      {"tension": "Une société qui débat de tout, et où chaque débat peut devenir une fracture.",
       "meilleure": "La marque qui rappelle que le désaccord n'empêche pas de partager.",
       "croyance": "Nous croyons que rire ensemble est la première façon de rester ensemble."},
      "IN-stl-1", "TR-stl-1"),
 prop("BE-stl-disruption", "disruption", "Pas que pour le goûter",
      "La Vache qui rit n'est pas qu'un goûter d'enfant : c'est le rire qu'on se partage à vingt ans.",
      "La vache quitte le cartable : on la retrouve au quartier, au match, dans le groupe WhatsApp — là où les jeunes adultes se chambrent.",
      {"convention": "Le fromage fondu parle aux mères du goûter, du calcium et de la rentrée.",
       "rupture": "Parler aux jeunes adultes de rire et de chamaille — sans renier le goûter.",
       "vision": "La vache devient la marque du rire partagé, à tout âge."},
      "IN-stl-3", "TR-stl-1"),
 prop("BE-stl-simplicite", "brutal-simplicite", "Ça se partage", "Une portion, ça se partage.",
      "Chaque dispute se règle de la même façon : on coupe la portion en deux.",
      {"longue": "Les jeunes adultes camerounais connaissent la vache depuis l'enfance et ne la choisissent plus ; ils adorent se chamailler, "
                 "mais redoutent les débats qui divisent ; la marque doit entrer dans leurs moments entre eux sans parler de division.",
       "dix": "Faire de la portion la réponse à nos petites disputes.",
       "six": "Une dispute, une portion, partagée."},
      "IN-stl-4", "TR-stl-2"),
 prop("BE-stl-drama", "inherent-drama", "La languette",
      "Même pour ouvrir une portion, on n'est pas d'accord.",
      "Le premier débat du pays : la languette rouge ou l'ongle ? Chacun défend sa méthode en vidéo ; la vache, elle, attend qu'on rie.",
      {"drame": "La portion s'ouvre par une languette rouge que tout le monde connaît — et que la moitié du pays n'utilise pas.",
       "scene": "Le moment où l'on ouvre la portion devant quelqu'un qui fait autrement.",
       "comportement": "Les gens filment leur façon d'ouvrir, de couper, de tartiner — et se chambrent."},
      "IN-stl-4", "TR-stl-2"),
 prop("BE-stl-verite", "truth-well-told", "Tends-lui une portion",
      "Au Cameroun, on règle tout autour d'un repas partagé — même les disputes.",
      "Chaque chamaille finit par le même geste : tendre une portion à l'autre. La vache ne rit que quand la portion change de main.",
      {"verite": "Chez nous, on ne se réconcilie pas en discutant : on se réconcilie en partageant à manger.",
       "role": "La marque est le trait d'union — la petite chose qu'on tend à l'autre pour dire « c'est bon ».",
       "preuves": "La vérité de marque globale (« a wedge is meant to be shared ») ; les usages de partage au Cameroun, à documenter en verbatim avant la séance."},
      "IN-stl-4", "TR-stl-2"),
]
bes = p.setdefault("bigideas", [])
for c in PROPS:
    if not any(y["id"] == c["id"] for y in bes): bes.append(c)

# ════════════ 6. Le moodboard, les pièces, l'inventaire ════════════
mb = p["sections"].setdefault("socle", {}).setdefault("moodboard", [])
for ident, role, f, leg, src in [
  ("MB-stl-1", "reference", "stl26-teaser-parc-16x9.jpg", "Le teaser « Park » : la vache sur une balançoire, sans rire — le mystère tient en une image", "teaser 15 s, organique et payant"),
  ("MB-stl-2", "reference", "stl26-diner.jpg", "La vache seule au diner : le personnage en costume, dans un lieu du quotidien", "image presse, organique seulement"),
  ("MB-stl-3", "reference", "stl26-packs-cote-a-cote.jpg", "Le pack qui rit et le pack qui ne rit plus — « We need to talk » : le stunt américain, à ne pas reprendre tel quel", "image presse, organique seulement"),
  ("MB-stl-4", "reference", "stl26-profil-acte1.jpg", "La photo de profil de l'acte 1 : la vache qui ne rit pas, en logo", "tout usage"),
  ("MB-stl-5", "reference", "stl26-pack-portion-1.jpg", "La portion à côté du pack : le triangle, objet du partage", "image presse, organique seulement"),
  ("MB-stl-6", "passe", "lvqr-ramadan-mubarak.png", "« La vache qui rit — Ramadan Mubarak » : une prise de parole locale récente, avec la vache qui rit", "courriel de transmission (image003)"),
]:
    if not any(x["id"] == ident for x in mb):
        mb.append({"id": ident, "role": role, "vignette": V + f, "legende": leg, "source": src, "quand": QUAND})

pb = p.setdefault("piecesBrief", [])
for ident, f, nom, page in [("PB-stl-3", "stl26-slide-03-strategie.jpg", "Stratégie en une ligne", "p. 3"),
  ("PB-stl-4", "stl26-slide-04-tension.jpg", "La tension culturelle : les wedge issues", "p. 4"),
  ("PB-stl-10", "stl26-slide-10-trois-actes.jpg", "L'activation en trois actes", "p. 10"),
  ("PB-stl-11", "stl26-slide-11-calendrier.jpg", "Le calendrier américain au 27/09", "p. 11"),
  ("PB-stl-16", "stl26-slide-16-messages.jpg", "La matrice des messages", "p. 16"),
  ("PB-stl-17", "stl26-slide-17-canaux.jpg", "Rôles et objectifs des canaux", "p. 17")]:
    if not any(x["id"] == ident for x in pb):
        pb.append({"id": ident, "nom": nom, "vignette": V + f, "source": "présentation globale, " + page, "quand": QUAND})

p["documentsRecus"] = [
  {"nom": "SPREAD THE LAUGH CAMPAIGN OVERVIEW _ 9_27 FOR GLOBAL TEAMS (.pptx, .pdf)", "type": "présentation, 18 pages", "date": "27/09/2026",
   "tire": "Brief, stratégie, tension culturelle, trois actes, calendrier, matrice des messages, rôles des canaux — tout est au cadrage ; six planches en pièces. Le PPTX de DOC 4 est identique à celui de DOC 3."},
  {"nom": "SPREAD THE LAUGH CAMPAIGN OVERVIEW _ 9_27 FOR GLOBAL TEAMS FR.pdf", "type": "traduction, 18 pages", "date": "27/09/2026",
   "tire": "Traduction automatique (« La Vache Rieuse », « questions de coin ») : lue, écartée — rien n'en est repris."},
  {"nom": "US SPREAD THE LAUGH MESSAGING HIERARCHY_FINAL.pptx", "type": "hiérarchie des messages, 5 planches", "date": "09/09/2026",
   "tire": "Hiérarchie des messages, CTAs, messages par élément (pack, teasers, page, Kimmel, Josh Johnson, créateurs, social, presse)."},
  {"nom": "Edelman_TLC_Spread the Laugh 9.28.26.docx", "type": "plan de crise et Q&R", "date": "28/09/2026",
   "tire": "Analyse des risques, équipe de crise, veille, escalade, protocole social, scénarios et messages réactifs — au cadrage (risques, messages réactifs) et aux contacts, sans coordonnées personnelles."},
  {"nom": "ACT 1_ Not Laughing Cow Release Draft 9.18.26 (deux versions : DOC 1 et DOC 2)", "type": "communiqué", "date": "22/09/2026",
   "tire": "Texte identique dans les deux archives ; « About The Laughing Cow » et le groupe Bel versés à la plateforme."},
  {"nom": "ACT 2_ Spread the Laugh Release Draft 9.28.26 5_30pm.docx", "type": "communiqué", "date": "30/09/2026",
   "tire": "Révélation chez Kimmel, mécanique du défi, exemples de wedge issues, citation du CEO Bel North America."},
  {"nom": "SPREAD THE LAUGH ACT 2 SCHEDULE AS OF 9.28.xlsx", "type": "planning horaire de l'acte 2", "date": "28/09/2026",
   "tire": "Versé au calendrier (29/09 → 2/10)."},
  {"nom": "Cinq images presse retouchées (diner, balançoire, packs côte à côte, pack et portion ×2)", "type": "images", "date": "28/09/2026",
   "droits": "organique seulement", "tire": "Rangées comme éléments de marque et au moodboard."},
  {"nom": "ACT 1_SOCIAL PROFILE PICTURE (en double : DOC 2 et DOC 3)", "type": "image", "date": "29/09/2026", "droits": "tout usage",
   "tire": "Rangée comme élément de marque."},
  {"nom": "Teaser « Park » 15 s — CTV 16:9, TikTok 9:16, Meta 1:1 et 4:5, masters ProRes 16:9 et 9:16, masters sans texte 16:9, 4:5 et 1:1",
   "type": "vidéos (≈ 17 s, 1920×1080 pour la CTV)", "date": "28/09/2026", "droits": "organique et payant",
   "tire": "Référencées comme éléments de marque, avec leur chemin ; restent sur le disque (2 Go). La version sans texte est re-titrable."},
  {"nom": "VIDEO CONTENT FONT — BobbyJonesSoft-Regular.otf", "type": "police", "droits": "en attente de droits",
   "tire": "Référencée ; à ne pas employer avant confirmation."},
  {"nom": "image002 / image004 — signature de Derick Tchaou (Matanga)", "type": "images de courriel",
   "tire": "Donne l'émetteur : la Direction clientèle de Matanga."},
  {"nom": "image003 / image005 — logo Bel « for all for good » et badge « La vache qui rit — Ramadan Mubarak »", "type": "images de courriel",
   "tire": "Logo Bel rangé à l'ombrelle ; badge Ramadan au moodboard."},
  {"nom": "48OneDrive_2026-09-29.zip et Smash.zip", "type": "archives de 4 Ko", "etat": "illisible",
   "tire": "Téléchargements interrompus : aucun contenu. À redemander si elles portaient autre chose que les doublons."},
]

# ════════════ 7. La préparation du brainstorm ════════════
p["preparation"] = {
  "objectif": "Trois angles camerounais défendables, chacun avec sa racine, et une liste d'au moins vingt wedge issues camerounaises "
              "futiles — triées, sans une seule qui touche à ce qui divise vraiment.",
  "question": "Comment faire rire La Vache qui rit à nouveau, au Cameroun, sans jamais parler de ce qui divise vraiment ?",
  "a_trancher": ["Garde-t-on le récit « la vache ne rit plus », ou seulement la vérité de marque « une portion se partage » ?",
                 "Change-t-on le pack localement (risque de contrefaçon perçue, décision de Bel) ou reste-t-on digital et PLV ?",
                 "La fenêtre : après le 1er novembre 2026, hors Ramadan, hors toute séquence électorale — calendrier électoral à vérifier",
                 "Les langues : français, anglais, camfranglais — lesquelles, pour quelles pièces ?",
                 "Qui sont nos Kimmel et Josh Johnson camerounais — et sont-ils sans étiquette politique ?",
                 "Quelle racine d'abord : la chamaille (culture), le goûter d'enfant (consommateur) ou la portion partagée (consommateur) ?"],
  "amorces": ["Ndolé : plantain mûr, plantain vert ou miondo ?", "Beignets-haricots-bouillie : on trempe le beignet ou pas ?",
              "Le taxi : on fixe le prix avant de monter ou à l'arrivée ?", "« Je suis en route » : ça veut dire combien de temps, exactement ?",
              "Le vocal WhatsApp de trois minutes : acceptable ou crime ?", "Le poulet DG : plat de fête ou plat de tous les jours ?",
              "Le match des Lions : à la maison ou au bar ?", "La portion : languette rouge ou ongle ?", "La portion : tartinée ou croquée ?",
              "Et si la vache ne riait plus parce qu'on ne se passe plus la portion ?",
              "Et si le premier débat du pays était la languette rouge ?"],
  "directions": ["On doit causer — Cultural Strategy", "Rire, c'est rester ensemble — Big Ideal", "Pas que pour le goûter — Disruption",
                 "Ça se partage — Brutal Simplicity", "La languette — Inherent Drama", "Tends-lui une portion — Truth Well Told",
                 "Spread the Laugh tel quel — la plateforme globale, pour mesurer l'écart"],
  "interdits": ["Toute dispute politique, électorale, régionale, ethnique, linguistique (anglophone / francophone) ou religieuse",
                "Les rivalités de villes ou de régions — à trancher : Douala contre Yaoundé est-il encore futile ?",
                "La traduction française automatique du dossier", "Le changement de pack sans décision de Bel",
                "« Fais-la rire » adressé comme « souris » à une femme"],
  "materiel": ["Le teaser « Park » de 15 s (version CTV) et sa version sans texte", "Les cinq images presse et la photo de profil",
               "La planche des trois actes et la matrice des messages", "Le plan de crise : les scénarios et les messages réactifs",
               "Une grande feuille : « nos wedge issues » — chacun écrit, sans débat, pendant dix minutes"],
  "deroule": ["10 min — le dossier américain en trois actes, par Derick", "10 min — ce qui ne voyage pas : les risques camerounais",
              "15 min — les wedge issues camerounaises, en vrac, chacun écrit, puis tri : futile ou dangereuse ?",
              "25 min — trois angles, un par racine ; chaque idée posée avec son auteur", "10 min — tri, auteurs nommés, questions pour Bel"],
  "notes": "Le brief local n'existe pas : tout ce qui est camerounais dans le dossier est une inférence à faire valider. Les deux archives "
           "illisibles (48OneDrive, Smash) sont à redemander à Derick.",
  "infere": {"pourquoi": "Préparée à partir du dossier global, des insights et des propositions par école. À relire avant la séance.",
             "quand": QUAND, "par": PAR},
}

trace("dossier global reçu", SOURCE + " · 14 pièces inventoriées, 2 illisibles · 5 insights, 2 territoires, 7 propositions, préparation du brainstorm")
d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print("dossier :", p["ref"], p["nom"])
print("inférences :", len(p["inferences"]), "· insights :", len(p["insights"]), "· propositions :", len(p["bigideas"]),
      "· moodboard :", len(mb), "· pièces :", len(pb), "· documents :", len(p["documentsRecus"]))
