# inserer-eoy-2026.py — le brief EOY 2026 de FrieslandCampina dans LA BARRE.
#
# Source : « EOY 2026 BRIEFS CREATIVE & MEDIA » (FrieslandCampina WAMEA, rédigé le
# 28/09/2026, envoyé le 29/09, briefing agence le 30/09). Six pages.
#
# Le dossier existait : PRJ-EOTY26 · MT-0045, ouvert le 4 septembre sur un cadre
# entièrement déduit, avant qu'aucun brief n'arrive. Ce cadre n'est pas effacé :
# il est rangé, daté, dans p.cadresPrecedents. On archive, on ne supprime pas.
#
# Trois états, jamais deux :
#   reçu     le brief le dit — la valeur est posée, sans inférence ;
#   inféré   déduit du brief, avec son motif écrit — contresignable d'un clic ;
#   manquant aucun document ne le dit — le champ reste vide et le dossier le dit.
#
# Usage : python3 outils/inserer-eoy-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, copy

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = "2026-09-30T09:30:00.000Z"
PAR = "creation"
SOURCE = "brief « EOY 2026 BRIEFS CREATIVE & MEDIA », FrieslandCampina, 28/09/2026"

d = json.load(open(SRC))
p = next(x for x in d["projets"] if x["id"] == "PRJ-EOTY26")

# ————— 1. Ranger l'ancien cadre, sans rien en perdre —————
p.setdefault("cadresPrecedents", []).append({
    "range_le": QUAND,
    "motif": "Cadre déduit le 4 septembre, avant réception du brief. Remplacé par le brief "
             "EOY 2026 reçu le 29 septembre ; conservé pour mémoire.",
    "nom": p["nom"],
    "sections": copy.deepcopy({k: p["sections"].get(k, {}) for k in
                               ("identite", "brief", "briefback", "socle", "strategie")}),
    "inferences": copy.deepcopy(p.get("inferences", {})),
    "insights": copy.deepcopy(p.get("insights", [])),
    "territoires": copy.deepcopy(p.get("territoires", [])),
    "volets": copy.deepcopy(p.get("volets", [])),
})

# Les volets de septembre promettaient 15 marchés × 21 supports, dont la TV et la radio, que
# le brief ne demande pas : rangés ci-dessus. Les volets du brief les remplacent — un par
# famille du §6 — sur le seul marché nommé.
NOTE_V = ("Déclaré d'après le brief (§6). Marché : la Côte d'Ivoire, seul nommé — les « key "
          "markets » sont à lister avec le client.")
p["volets"] = [
    {"id": "V-eoy26-kv", "nom": "Key visual outdoor 4×3 — acteurs réels",
     "supports": ["S-billboard"], "marches": ["M-CI"], "note": NOTE_V},
    {"id": "V-eoy26-btl", "nom": "BTL — goodies brandés, bannière murale, guirlandes, banderoles",
     "supports": ["S-banderole", "S-tshirt", "S-casquette"], "marches": ["M-CI"],
     "note": NOTE_V + " Les goodies sont rapprochés du t-shirt et de la casquette du référentiel ; "
             "la bannière murale et les guirlandes n'y ont pas encore de support."},
    {"id": "V-eoy26-plv", "nom": "PLV — posters 40×60, wobblers Ø 15 cm, tête de gondole",
     "supports": ["S-p6040", "S-woobler", "S-tg"], "marches": ["M-CI"], "note": NOTE_V},
    {"id": "V-eoy26-digital", "nom": "Digital statique et vidéo — optionnel",
     "supports": ["S-digital", "S-film916"], "marches": ["M-CI"], "note": NOTE_V},
]

infs = {}
def infere(section, champ, valeur, motif):
    p["sections"].setdefault(section, {})[champ] = valeur
    infs[section + "." + champ] = {"pourquoi": motif, "quand": QUAND, "par": PAR}

def recu(section, champ, valeur):
    p["sections"].setdefault(section, {})[champ] = valeur

p["nom"] = "End Of Year 2026 — EVAP · Bonnet Rouge, Peak, Belle Hollandaise"
p["nature"] = "campagne"
p["gabarit"] = "campagne"
p["campagneId"] = "CMP-fc-evap-eoy-2026"

# ————— 2. Identité —————
ident = p["sections"].setdefault("identite", {})
recu("identite", "clientId", "C-fc")
recu("identite", "client", "FrieslandCampina WAMEA")
recu("identite", "marqueIds", ["MQ-br", "MQ-peak", "MQ-bh"])
recu("identite", "marque", "Bonnet Rouge · Peak · Belle Hollandaise")
recu("identite", "debut", "2026-09-29")
recu("identite", "echeance", "2026-10-20")
recu("identite", "budget", None)
recu("identite", "circuit",
     "Trois passages écrits au brief : 1er retour agence — stratégie créative et média, et plan "
     "d'exécution — le 9 octobre ; 2e retour le 15 octobre ; retour final sur toutes les tâches "
     "le 20 octobre. Le délai de réponse du client entre deux passages n'est pas dit.")

infere("identite", "type",
       "Campagne de fin d'année EVAP — trois marques, KV outdoor 4×3, BTL, PLV et dispositif social",
       "Déduit de la liste des livrables du brief (§6) et des trois hero SKUs EVAP. Le brief "
       "demande aussi une stratégie média : le périmètre dépasse la seule création.")
infere("identite", "fenetre",
       "Décembre 2026 — première semaine de janvier 2027 ; pic entre Noël et le Nouvel An. "
       "La PLV et le BTL doivent être en place dès fin novembre.",
       "Le brief ne donne pas de fenêtre de diffusion. Elle est déduite de l'occasion (la saison "
       "des fêtes, où se joue la tendance du pyjama assorti) et du retour final au 20 octobre, "
       "qui laisse environ cinq semaines de production avant fin novembre. À confirmer en "
       "réunion : elle commande tout le rétroplanning.")
infere("identite", "decideurId", "CT-epee",
       "Patrick Epee, directeur marketing, est le seul contact FrieslandCampina au dépôt. Le "
       "brief ne nomme pas le décideur final. À confirmer : sans lui, aucune validation ne "
       "prend effet.")
infere("identite", "decideur", "Patrick Epee — directeur marketing FrieslandCampina WAMEA (à confirmer)",
       "Même raison que le décideur final : seul contact connu du compte.")
infere("identite", "tueur",
       "Le siège régional FrieslandCampina, via la direction marketing WAMEA — et, par marché, "
       "les équipes locales des marchés clés.",
       "Le brief vise plusieurs « key markets » et deux langues : sur Back-To-School, la "
       "validation passait par une validation centrale puis locale. Le brief ne dit pas qui "
       "peut arrêter une idée validée.")
infere("identite", "objectif",
       "Faire de la fin d'année une propriété des marques EVAP de FrieslandCampina — un "
       "territoire qu'aucun concurrent direct n'occupe — et que les 18-35 ans passent de marques "
       "connues par héritage à des marques qu'ils aiment.",
       "Reformulation du §2 (« make EOY our own property across key markets ») et du §5 "
       "(changement de comportement attendu). À contresigner par la Clientèle.")
infere("identite", "mesure", [
    "Notoriété totale de 100 % sur les marchés clés — source : étude de notoriété "
    "FrieslandCampina, à confirmer",
    "Portée d'environ 10 millions d'utilisateurs de réseaux sociaux par marché clé, sur TikTok, "
    "Facebook et Instagram — source : statistiques des plateformes et plan média",
    "Volumes EVAP du T4 soutenus (PS 34,4 kt) — source : ventes FrieslandCampina",
    "Parts de marché EVAP maintenues à 93 % — source : panel distributeur, à confirmer",
    "Considération des 18-35 ans — source : à définir ; c'est l'objectif marketing, et le brief "
    "ne lui donne pas de mesure",
], "Les chiffres sont ceux du brief (§3). Les sources de mesure ne sont pas données : elles "
   "sont déduites et à confirmer. La dernière ligne signale un trou : « rajeunir » et « faire "
   "aimer » n'ont aucun indicateur.")
infere("identite", "pilier", "E",
       "Une campagne de temps fort qui installe un rituel partagé (se retrouver en fin d'année) "
       "sert l'Engagement — le calendrier et les rituels de la marque. Proposé par la nature "
       "« campagne », pas imposé.")

# ————— 3. Brief —————
recu("brief", "porteur", p["sections"].get("brief", {}).get("porteur") or "P-derick")
recu("brief", "verbatim",
     "« We want to explore a new territory, a place where no brands in direct competition "
     "(Nido, Cowbell, Laity, etc..) with us has yet to explore. We want to make EOY our own "
     "property across key markets with our key brands, and make it social media viral. »\n\n"
     "« Develop an EOY campaign on the trend highlighted earlier in the brief » — la tendance des "
     "familles et amis qui prennent des photos en pyjamas assortis pendant les fêtes et les "
     "partagent en ligne.\n\n"
     "« KEY MESSAGE : our brand the champions when it comes to event that matter / championing. »\n\n"
     "Plateforme EVAP : « The We Culture » — « EVAP should become the brand that champions "
     "family/friends/colleagues togetherness. »")
recu("brief", "objectif_business",
     "Soutenir les volumes EVAP du T4 (PS 34,4 kt) et maintenir les parts de marché à 93 %.")
recu("brief", "objectif_com",
     "Notoriété totale de 100 % sur les marchés clés. Une campagne de fin d'année virale sur "
     "TikTok, Facebook et Instagram : portée d'environ 10 millions d'utilisateurs de réseaux "
     "sociaux par marché clé. Message clé : nos marques, championnes des moments qui comptent.")
recu("brief", "contraintes",
     "Langues : français et anglais. Brand propeller (à préciser par le client). KV outdoor 4×3 m "
     "avec de vrais acteurs. Digital statique et vidéo en option, en IA ou avec acteurs réels ou "
     "influenceurs. Fichiers ouverts pour le BTL et la tête de gondole. Le KV EOY 2025 de Côte "
     "d'Ivoire est montré en exemple et ne doit pas servir de base.")
recu("brief", "mandatories", [
    "Slogan Bonnet Rouge : « Pour l'Energie dès le matin »",
    "Slogan Peak : « Reach your Peak »",
    "Hero SKUs : Bonnet Rouge 150 g, Peak 160 g, Belle Hollandaise 160 g",
    "Langues : français et anglais",
    "Brand propeller — à préciser par le client",
])
recu("brief", "livrables_attendus", [
    "Stratégie créative et média, et plan d'exécution — au 1er retour, le 9 octobre",
    "Key visual outdoor 4×3 m — acteurs réels",
    "BTL : goodies brandés, bannière murale, guirlandes, banderoles — fichiers ouverts",
    "Posters 40×60 cm",
    "Wobblers — diamètre 15 cm",
    "Tête de gondole — fichier ouvert",
    "Digital statique et vidéo — optionnel, IA ou acteurs réels / influenceurs",
])
recu("brief", "kpis", [
    "Notoriété totale : 100 % sur les marchés clés — source à confirmer",
    "Portée sociale : environ 10 millions d'utilisateurs par marché clé (TikTok, Facebook, "
    "Instagram) — statistiques des plateformes",
    "Volumes EVAP T4 : PS 34,4 kt — ventes FrieslandCampina",
    "Parts de marché EVAP : 93 % maintenues — panel à confirmer",
])

infere("brief", "probleme",
       "La catégorie EVAP stagne (TCAC volume +0,72 % ; 32,61 en 2019, creux à 26,47 en 2023, "
       "34,28 en 2026 au graphique du brief), freinée par des ruptures d'approvisionnement sur "
       "les produits Western et Tropical et une couverture SKU insuffisante. Jugée chère, elle perd des consommateurs "
       "— 9 % basculent vers l'IMP et son pack de pénétration à 100 FCFA, ou vers d'autres "
       "catégories — et ses marques établies paraissent moins pertinentes aux 18-35 ans, qui "
       "portent la croissance. Le problème n'est pas la notoriété, déjà quasi totale : c'est la "
       "préférence. Les marques sont connues et utilisées par héritage, pas aimées.",
       "Les faits sont ceux du brief (compréhension de la catégorie, §1 et §5). La lecture — "
       "préférence plutôt que notoriété — est une inférence du planning, à défendre en réunion.")
infere("brief", "cible",
       "Cœur : les jeunes adultes de 18 à 35 ans — optimistes, dans la tendance, connectés. "
       "Élargie : les familles et les amis qui cherchent à vivre ensemble les moments de fin "
       "d'année. Tension : ils consomment Bonnet Rouge ou Peak parce que c'est l'héritage "
       "familial — une marque de plus de cent ans, de bonne qualité — sans l'avoir choisie pour "
       "eux. Ils veulent une marque d'aujourd'hui, qu'ils aiment.",
       "La cible est celle du brief (§4). La tension est tirée du changement de comportement "
       "attendu (§5 : « family heritage » → « my Today's brand »).")
infere("brief", "insight",
       "En grandissant, chacun vit sa vie. La fin d'année est le seul moment où la famille — et "
       "la bande — se reforme pour de bon, et on veut en garder la preuve : d'où le pyjama "
       "assorti, qui dit « on est ensemble » avant même la photo.",
       "Croisement de la plateforme « The We Culture » (§2 : « as people grow older, we often "
       "become more focused on our individual lives ») et de la tendance citée au contexte "
       "(pyjamas assortis, jouée au-delà des religions). Une seule source terrain : à nourrir "
       "avant l'atelier.")
infere("brief", "promesse",
       "Là où l'on se retrouve, la marque est de la fête.",
       "Tirée du message clé du brief (« the champions when it comes to events that matter ») et "
       "de la plateforme « The We Culture ». Une proposition de travail, pas une signature.")
infere("brief", "rtb", [
    "Plus de cent ans dans les familles — l'héritage que cite le brief",
    "Une qualité prouvée",
    "Leader EVAP : 93 % de parts de marché",
    "Une première campagne de fin d'année en Côte d'Ivoire en 2025, sur la même tendance",
], "Les preuves sont toutes dans le brief ; leur choix et leur ordre sont une inférence.")
infere("brief", "ton",
       "Chaleureux, festif, complice ; les codes des réseaux sociaux (défis, photos de groupe, "
       "vidéos courtes). Inclusif : le rituel dépasse Noël, la campagne ne doit pas être "
       "religieuse. À ne pas faire : la nostalgie « héritage », qui vieillit la marque — c'est "
       "précisément ce qu'on veut quitter — et reprendre le KV 2025 comme base.",
       "Déduit de la cible (§4), du changement attendu (§5) et de la remarque du brief sur la "
       "tendance « au-delà de la culture et de la religion ». L'interdit du KV 2025 est écrit "
       "au brief.")

# ————— 4. Brief-back — un brouillon pour la réunion, rien n'est envoyé —————
infere("briefback", "compris",
       "La fin d'année doit devenir la propriété des marques EVAP : un territoire qu'aucun "
       "concurrent direct n'occupe, où Bonnet Rouge, Peak et Belle Hollandaise passent de marques "
       "connues par héritage à marques aimées des 18-35 ans — en devenant la marque des "
       "retrouvailles.",
       "Brouillon du brief-back, à relire en équipe avant l'envoi. Rien n'est parti.")
infere("briefback", "couche", "culture",
       "Le brief part d'un fait culturel — une tendance mondiale, jouée au-delà des religions — "
       "pour en faire une propriété de marque : c'est la couche culture, qui commande la big "
       "idea.")
infere("briefback", "propose",
       "Une plateforme de campagne de fin d'année commune aux trois marques, adossée à « The We "
       "Culture » et au rituel du pyjama assorti, déclinée en KV 4×3 à acteurs réels, BTL, PLV "
       "(posters, wobblers, tête de gondole) et un dispositif social pensé pour la viralité ; avec "
       "la stratégie créative et média et le plan d'exécution au 9 octobre.",
       "Déduit du périmètre du brief (§6) et du premier jalon (§8).")
infere("briefback", "ecart",
       "Trois points à lever avant de produire. Les marchés clés ne sont pas listés : seule la "
       "Côte d'Ivoire est nommée. Le brief fixe une notoriété de 100 % alors que le levier décrit "
       "est la préférence : nous proposons de mesurer aussi la considération des 18-35 ans. Le "
       "« brand propeller » est cité sans être défini.",
       "Les trous relevés dans le brief. À poser par écrit, avant l'atelier, plutôt qu'en "
       "restitution.")

# ————— 5. Stratégie —————
infere("strategie", "probleme_reel",
       "Les marques EVAP sont connues et utilisées, pas aimées : leur légitimité vient de "
       "l'héritage, ce qui en fait « les marques de nos parents » aux yeux des 18-35 ans — au "
       "moment où le prix pousse vers l'IMP à 100 FCFA.",
       "Même lecture que le problème réel du brief, formulée pour le planning.")
infere("strategie", "opportunite",
       "La fin d'année : aucun concurrent direct (Nido, Cowbell, Laity…) ne l'occupe, alors que "
       "Ramadan est saturé par toutes les marques laitières. Et une tendance mondiale déjà "
       "éprouvée sur le terrain en 2025, en Côte d'Ivoire : le pyjama assorti.",
       "Les deux faits sont au brief (§2, idée de campagne ; contexte). Leur rapprochement est "
       "l'opportunité.")
infere("strategie", "gardefous", [
    "Ne pas faire de la fin d'année une fête religieuse : le rituel est transculturel, c'est ce "
    "qui le rend vaste",
    "Ne pas repartir du KV 2025",
    "Une idée pour trois marques, et ce qui reste propre à chacune — slogan, couleur, pack : la "
    "leçon de Back-To-School",
    "Penser TikTok d'abord : l'idée doit se jouer en vidéo courte avant de s'afficher en 4×3",
    "Montrer l'accessibilité — format et prix — et pas seulement l'émotion : le brief veut un "
    "portefeuille « affordable, available, more convenient »",
], "Déduits des limites du brief (§7), de son objectif de viralité (§3) et du job to be done "
   "(§2).")
infere("strategie", "pointsEntree", [
    "Le repas de fête en famille",
    "Les retrouvailles entre amis et entre collègues",
    "La photo de groupe de fin d'année",
    "Le petit-déjeuner des lendemains de fête",
    "Les desserts et boissons de fête",
], "Les occasions où l'on se retrouve (§2 : « whenever people come together to celebrate, "
   "reconnect, or create memories »), traduites en situations d'achat.")

# L'insight et le territoire sont des objets : c'est eux qu'une piste remontera.
p["insights"] = [{
    "id": "IN-eoy26-1", "couche": "culture", "auteur": None, "ecrit_le": QUAND,
    "passes": {
        "longue": "En grandissant, chacun vit sa vie — son travail, ses soucis, son quartier. La "
                  "famille et la bande ne se voient plus qu'à l'occasion. La fin d'année est le "
                  "seul moment où elles se reforment pour de bon : on se retrouve, on se met "
                  "d'accord jusque sur le pyjama, et on veut en garder la preuve à montrer.",
        "temps": {
            "situation": "La fin d'année, quand la famille et les amis se retrouvent.",
            "tension": "Le reste de l'année, chacun vit sa vie et le « nous » s'effiloche.",
            "empeche": "Sans preuve partagée, les retrouvailles ne laissent rien derrière elles.",
        },
        "phrase": "La fin d'année, c'est le moment où l'on redevient « nous » — et on veut que ça se voie.",
    },
    "sources": [
        {"type": "culture", "quoi": "La tendance mondiale des photos en pyjamas assortis pendant "
                                    "les fêtes, partagées en ligne, jouée au-delà des religions "
                                    "(brief, contexte)"},
        {"type": "terrain", "quoi": "La campagne de fin d'année 2025 en Côte d'Ivoire, sur la même "
                                    "tendance (brief, contexte)"},
    ],
    "test": {"contredit": None, "gene": None, "ouvre": None},
    "infere": {"pourquoi": "Déduit de la plateforme « The We Culture » et de la tendance citée "
                           "au brief. Deux sources sur trois : il en manque une pour qu'il soit "
                           "défendable, et le test en trois questions reste à faire en équipe.",
               "quand": QUAND, "par": PAR},
}]
p["territoires"] = [{
    "id": "TR-eoy26-1",
    "nom": "The We Culture — les retrouvailles de fin d'année",
    "quoi": "Tout ce qui rassemble et laisse une trace : le repas, le pyjama assorti, la photo de "
            "groupe, les lendemains de fête. La marque y est l'invitée évidente, celle qui est là "
            "quand on se retrouve.",
    "insightId": "IN-eoy26-1", "ecole": None, "convention": None, "reduction": None,
    "cree_le": QUAND,
    "infere": {"pourquoi": "Le territoire de la plateforme EVAP écrite au brief, restreint à "
                           "l'occasion de fin d'année. Plusieurs concepts peuvent y vivre : "
                           "c'est ce qu'on lui demande.", "quand": QUAND, "par": PAR},
}]

# Les inférences : on remplace celles de l'ancien cadre (rangées plus haut) par les nouvelles.
p["inferences"] = infs

# ————— 5 bis. La big idea : la proposition du client, posée avant la séance —————
# Le brief ne commande pas seulement une campagne : il en propose l'idée. On la pose en
# amont de la séance de conception pour qu'elle y soit discutée — jamais arbitrée ici.
# L'auteur reste vide : il se constate en séance, avant l'arbitrage.
MOTIF_BI = ("Proposée par le client au brief (§1 contexte, §2 idée de campagne, message clé). "
            "Posée en amont de la séance de conception pour y être discutée : rien n'est "
            "arbitré, et l'auteur se constate en séance.")
infere("bigidea", "idee",
       "Les marques EVAP, championnes des retrouvailles de fin d'année — autour du rituel du "
       "pyjama assorti.", MOTIF_BI)
infere("bigidea", "mecanique",
       "Familles et bandes d'amis se mettent en pyjamas assortis, se prennent en photo ou en "
       "vidéo et partagent ; la marque fournit le prétexte (goodies, défi, filtre) et la scène "
       "(PLV, 4×3). Sans nommer le média : un rituel collectif qui laisse une preuve partagée.",
       MOTIF_BI + " La mécanique est déduite de la tendance décrite et du KV 2025.")
infere("bigidea", "rattachement",
       "Rattachée à « The We Culture », la plateforme EVAP écrite au brief, et aux deux brand "
       "propellers : Bonnet Rouge sert des familles « coming from the heart of a WE culture » ; "
       "Peak, des gens dont la détermination est « pour eux-mêmes comme pour les autres ».",
       "Citations du brief (§2) et des brand propellers (§7).")
infere("bigidea", "ton_campagne", "Festif, complice, inclusif",
       "Déduit de la cible 18-35 ans et de la remarque du brief sur un rituel qui dépasse les religions.")
infere("bigidea", "phares", [
    "Les trois hero SKUs : Bonnet Rouge 150 g, Peak 160 g, Belle Hollandaise 160 g",
    "Les slogans de marque : « Pour l'Energie dès le matin », « Reach your Peak »",
    "De vrais acteurs sur le KV 4×3",
    "Les actifs distinctifs de Peak : le ciel bleu, les palmiers, la montagne",
], "Imposés par le brief (§6 et §7) et le brand propeller de Peak.")
infere("bigidea", "criteres", [
    "Elle se joue en vidéo courte avant de s'afficher : un geste que le public peut refaire et partager",
    "Elle tient pour trois marques sans les confondre : une idée commune, un signe propre à chacune",
    "Elle n'est pas religieuse : le rituel parle aux musulmans comme aux athées",
    "Le produit est dans le moment, pas un packshot posé à côté",
    "Elle ne repart pas du KV 2025",
], "Critères proposés pour la séance, tirés des objectifs (§3), des limites (§7) et de la "
   "leçon de Back-To-School. Ils ne sont opposables qu'une fois contresignés.")
infere("bigidea", "interdits", [
    "Reprendre le KV EOY 2025 de Côte d'Ivoire comme base — écrit au brief",
    "La nostalgie « héritage », qui vieillit la marque",
    "Une fête exclusivement chrétienne",
], "Le premier est écrit au brief ; les deux autres en sont déduits (§1, §5).")
infere("bigidea", "validite",
       "L'idée ne vaut que si elle s'approprie la fin d'année avant les concurrents directs et "
       "donne au public un geste à refaire : si elle ne se partage pas, elle manque l'objectif "
       "de viralité.",
       "Déduite de l'idée de campagne (§2) et de l'objectif de communication (§3).")

# ————— 6. La campagne : l'étage au-dessus du dossier —————
d.setdefault("campagnes", [])
d["campagnes"] = [c for c in d["campagnes"] if c["id"] != "CMP-fc-evap-eoy-2026"]
d["campagnes"].append({
    "id": "CMP-fc-evap-eoy-2026",
    "nom": "EVAP — End Of Year 2026",
    "clientId": "C-fc",
    "marqueIds": ["MQ-br", "MQ-peak", "MQ-bh"],
    "regime": "ponctuelle",
    "occasion": "noel",
    "fenetre": {"debut": "2026-12-01", "fin": "2027-01-07"},
    "marches": ["M-CI"],
    "bilan": "",
    "ecartes": {},
    "cree_le": QUAND,
    "source": SOURCE,
    "infere": {"pourquoi": "La campagne est nommée par le brief. Sa fenêtre est déduite (le "
                           "brief n'en donne pas) et ses marchés se limitent à la Côte d'Ivoire, "
                           "seul marché nommé : les « key markets » restent à lister avec le client.",
               "quand": QUAND},
})

# ————— 7. La plateforme EVAP, là où elle vit : la bibliothèque de marque —————
# Le brief pose une plateforme de catégorie, pas de marque. Elle s'écrit au niveau de la
# gamme EVAP de chacune des trois marques — là où un dossier multi-marques la lit — et
# seulement ce que le brief dit mot pour mot. Rien n'y est inféré : la bibliothèque n'a pas
# d'état « inféré », elle ne reçoit que du reçu.
EVAP = {
    "idee_directrice": "The We Culture",
    "positionnement": "Our EVAP brands target families. In Africa, family values remain deeply "
                      "important. However, as people grow older, we often become more focused on "
                      "our individual lives, challenges, and lifestyles. This creates an "
                      "opportunity for our brands to play a meaningful role in reinforcing "
                      "togetherness and preserving the collective spirit within families. EVAP "
                      "should become the brand that champions family/friends/colleagues "
                      "togetherness. Whenever people come together to celebrate, reconnect, or "
                      "create memories, our brand should stand out as a natural part of those "
                      "moments.",
    "occasions": [
        "Ramadan — la saison principale de la catégorie, occupée par presque toutes les marques "
        "laitières",
        "Fin d'année — le territoire à prendre : première campagne en Côte d'Ivoire en 2025",
    ],
}
journal = d.setdefault("journal", [])
for mid in ("MQ-br", "MQ-peak", "MQ-bh"):
    m = next(x for x in d["marques"] if x["id"] == mid)
    g = m.setdefault("gammes", {}).setdefault("EVAP", {})
    v = g.setdefault("vault", {})
    for cle, val in EVAP.items():
        avant = v.get(cle)
        if avant not in (None, "", []) and avant != val:
            v.setdefault("revisions", []).append({"quand": QUAND, "qui": PAR, "champ": cle,
                                                  "avant": avant, "apres": val,
                                                  "motif": "plateforme EVAP écrite au " + SOURCE})
        v[cle] = val
        journal.append({"quand": QUAND, "qui": PAR, "action": "socle écrit", "type": "marques",
                        "id": mid, "detail": m["nom"] + " EVAP · " + cle + " — " + SOURCE,
                        "marques": [mid]})

# ————— 8. Les brand propellers : la plateforme de chaque marque, reçue —————
# Deux planches jointes au brief (§7). Elles sont la plateforme de marque réelle de Bonnet
# Rouge et de Peak : elles s'écrivent au niveau de la marque, dans les mots du client.
# Belle Hollandaise n'en a pas au brief.
PROPELLERS = {
    "MQ-br": {
        "positionnement": "Part of FC Family Nutrition platform. People we serve: positive minded "
                          "African families and individuals that are working towards a better "
                          "future, coming from the heart of a WE culture. Human truth: we want to "
                          "grab every opportunity in life to progress, but we are missing the "
                          "means and the reassurance of the right choice.",
        "vision": "Enabling all African to grow and reach their full potential.",
        "ton": "A lifelong companion who is caring, supportive and encourages you to give your "
               "best and move forward.",
        "benefices": ["Functional: enjoyment of natural nutrition that is building physical and "
                      "mental strength, with a great taste at the same time.",
                      "Emotional: I feel reassured (I am making a right decision for the future), "
                      "it's like a warm hug from the inside."],
        "preuves": ["Entry to the nutrient powerhouse of dairy; calcium, vitamins and protein — "
                    "recommended by authorities all over the world."],
        "promesse": "The rich nutritious taste that has stood the test of time.",
        "concurrents": ["Other products (e.g. fruit juices)",
                        "Refreshments (water, tea, coffee)",
                        "Dairy products, local dairy dishes, porridge, nutritious sodas",
                        "Breakfast alternatives (bread, Garba, Yam, Pacalli)"],
        "dialecte": ["Pour l'Energie dès le matin"],
    },
    "MQ-peak": {
        "positionnement": "People we serve: people with a positive take on reality — whose "
                          "determination is for themselves as well as others. Human truth: we want "
                          "to grab every opportunity in life to progress, but we are missing the "
                          "means and the reassurance of the right choice.",
        "vision": "Enabling ALL Africans reach their Peak each and everyday.",
        "ton": "A proud lifelong and inspiring friend who grows with you, tells it like it is "
               "and cheers you on.",
        "benefices": ["Functional: rich & creamy natural nutrition that strengthens and supports "
                      "what's already inside.",
                      "Emotional: a delightful experience that makes me ready to overcome the "
                      "challenge each day brings."],
        "preuves": ["Peak is a balanced nutrient powerhouse. It is extra fortified (on top of 28 "
                    "V&M) and a reliable and trusted milk brand in West Africa."],
        "promesse": "Helping you meet life challenges for over 60 years with consistent and "
                    "trusted quality.",
        "concurrents": ["Other dairy products", "Porridge", "Nutritious products", "Refreshments",
                        "Energy drinks", "Breakfast alternatives"],
        "symboles": ["Blue sky — calmness and healing; symbol of hope underlining the harmless "
                     "nature of milk",
                     "Palm trees — symbol of nutrition & growth; healthy green leaves = good "
                     "nutrition; multiple trees represent family",
                     "Mountain — symbol of performance; ultimate top position & strength through "
                     "nutrition"],
        "dialecte": ["Reach your Peak"],
    },
}
for mid, champs in PROPELLERS.items():
    m = next(x for x in d["marques"] if x["id"] == mid)
    v = m.setdefault("vault", {})
    for cle, val in champs.items():
        avant = v.get(cle)
        if avant == val:
            continue
        if avant not in (None, "", []):
            v.setdefault("revisions", []).append({"quand": QUAND, "qui": PAR, "champ": cle,
                                                  "avant": avant, "apres": val,
                                                  "motif": "brand propeller joint au " + SOURCE})
        v[cle] = val
        journal.append({"quand": QUAND, "qui": PAR, "action": "socle écrit" if avant in (None, "", []) else "socle révisé",
                        "type": "marques", "id": mid,
                        "detail": m["nom"] + " · " + cle + " — brand propeller, " + SOURCE,
                        "marques": [mid]})

journal.append({"quand": QUAND, "qui": PAR, "action": "brief reçu", "type": "projets",
                "id": "PRJ-EOTY26", "detail": SOURCE + " · cadre de septembre rangé, "
                + str(len(infs)) + " champs inférés"})

json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print("dossier :", p["nom"])
print("inférences :", len(infs), "— reçus posés sans inférence")
print("campagne :", d["campagnes"][-1]["id"])
