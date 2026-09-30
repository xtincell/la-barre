# plateformes-eoy-2026.py — les plateformes de marque de l'EOY 2026, et le brief remis à sa place.
#
# Troisième passe sur le brief EOY 2026 de FrieslandCampina. Elle corrige deux
# fautes de la première, relevées par le titulaire :
#
# 1. LE BRIEF N'ÉTAIT PAS RANGÉ. Le modèle n'avait ni stratégie de marque du
#    client, ni job to be done, ni changement de comportement, ni message clé :
#    ces instructions avaient fini dans l'objectif de communication et la cible.
#    Les champs existent désormais ; ce qui avait été mal rangé y est déplacé,
#    et la valeur d'avant est gardée dans p.revisionsCadrage.
#
# 2. LA PLATEFORME N'ÉTAIT PAS TRAITÉE. Le client demande une plateforme EVAP —
#    « The We » — et elle n'existait que par son nom et un paragraphe. Or « The
#    We » n'est pas la famille : c'est le fait d'être ensemble, en famille, entre
#    amis, entre collègues. Et la plateforme sert une marque qui veut quitter
#    l'héritage pour le présent : « Make your moment memorable in your daily
#    hustle ». Elle est conçue ici, champ par champ, au niveau de la gamme EVAP
#    des trois marques. Les champs vides de Bonnet Rouge et de Peak sont
#    inférés ; la plateforme de Belle Hollandaise, que le brief ne fournit pas,
#    est conçue — et dite hypothèse.
#
# Tout ce qui est conçu ou déduit ici porte son inférence : utilisable, pas
# opposable, contresignable d'un clic. Une valeur remplacée entre dans les
# révisions du niveau, avec son motif.
#
# Usage : python3 outils/plateformes-eoy-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, copy, datetime

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
SOURCE = "brief « EOY 2026 BRIEFS CREATIVE & MEDIA », FrieslandCampina, 28/09/2026"

d = json.load(open(SRC))
p = next(x for x in d["projets"] if x["id"] == "PRJ-EOTY26")
journal = d.setdefault("journal", [])
marques = {m["id"]: m for m in d["marques"]}

def trace(action, detail, typ="projets", ident="PRJ-EOTY26", mqs=None):
    e = {"quand": QUAND, "qui": PAR, "action": action, "type": typ, "id": ident, "detail": detail}
    if mqs: e["marques"] = mqs
    journal.append(e)

def vide(v):
    return v is None or v == "" or v == [] or v == {}

# ————— Écrire au dossier, en gardant l'avant —————
revs = p.setdefault("revisionsCadrage", [])
infs = p.setdefault("inferences", {})

def poser(section, cle, val, motif=None, recu=False):
    sec = p["sections"].setdefault(section, {})
    avant = sec.get(cle)
    if avant == val:
        return
    if not vide(avant):
        revs.append({"quand": QUAND, "qui": PAR, "champ": section + "." + cle, "avant": avant,
                     "apres": val, "motif": motif or "rangé au bon champ"})
    sec[cle] = val
    k = section + "." + cle
    if recu:
        infs.pop(k, None)
    else:
        infs[k] = {"pourquoi": motif, "quand": QUAND, "par": PAR}

# ————— Écrire à la bibliothèque de marque, en gardant l'avant —————
def vault(type_, ident):
    if type_ == "marque":
        return marques[ident].setdefault("vault", {})
    mid, g = ident.split("|")
    m = marques[mid]
    return m.setdefault("gammes", {}).setdefault(g, {}).setdefault("vault", {})

def ecrire(type_, ident, cle, val, motif, remplacer=False):
    v = vault(type_, ident)
    avant = v.get(cle)
    if not vide(avant) and not remplacer:
        return False
    if avant == val:
        return False
    if not vide(avant):
        v.setdefault("revisions", []).append({"quand": QUAND, "qui": PAR, "champ": cle,
                                              "avant": avant, "apres": val, "motif": motif})
    v[cle] = val
    v.setdefault("inferences", {})[cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}
    mid = ident.split("|")[0]
    trace("socle inféré" if vide(avant) else "socle révisé",
          (marques[mid]["nom"] + (" " + ident.split("|")[1] if "|" in ident else "")) + " · " + cle,
          "marques", mid, [mid])
    return True

# ════════════ 1. Le brief, rangé ════════════

b = p["sections"]["brief"]

poser("brief", "strategie_client",
      "Protéger et consolider le leadership EVAP : rajeunir les marques cœur pour séduire et recruter les 18-35 ans, "
      "et renouveler leur récit et leurs expériences pour en faire des « love brands ».\n\n"
      "La plateforme proposée par le client : « Our EVAP brands target families. In Africa, family values remain deeply "
      "important. However, as people grow older, we often become more focused on our individual lives, challenges, and "
      "lifestyles. This creates an opportunity for our brands to play a meaningful role in reinforcing togetherness and "
      "preserving the collective spirit […] EVAP should become the brand that champions family/friends/colleagues "
      "togetherness. » — « The We Culture ».\n\n"
      "(Brief, p. 2 : « Protect and consolidate our leadership position in EVAP by rejuvenating our core brands to appeal "
      "to and recruit younger consumers (18-35 years old target) — refreshing our core brands narrative & experiences to "
      "become love brands ».)",
      "reçu — brief, p. 2", recu=True)

poser("brief", "jtbd",
      "Amener les 18-35 ans — optimistes, dans la tendance, connectés — à considérer la catégorie, puis à aimer et utiliser "
      "nos marques dans toutes les occasions qui comptent, en rajeunissant la marque et en rendant le portefeuille "
      "accessible : abordable, disponible, plus pratique.\n\n"
      "(Brief, p. 2 : « Get young adults 18-35 yo (optimistic, trendy & digitally connected) to consider the category, to "
      "love & use our brands across all relevant occasions by rejuvenating the brand & making the portfolio accessible "
      "(affordable/available/more convenient). »)",
      "reçu — brief, p. 2", recu=True)

poser("brief", "comportement_actuel",
      "« Je consomme Bonnet Rouge ou Peak parce que c'est un héritage familial : la marque existe depuis plus de cent ans "
      "et elle est de bonne qualité. » (Brief, p. 4 : « Actual behavior ».)",
      "reçu — brief, p. 4", recu=True)

poser("brief", "comportement_vise",
      "« Je choisis Bonnet Rouge ou Peak comme ma marque d'aujourd'hui, parce que c'est une marque que j'aime, qui me "
      "parle, avec une qualité prouvée. » (Brief, p. 4 : « Desired behavior ».)",
      "reçu — brief, p. 4", recu=True)

poser("brief", "message_cle",
      "Nos marques, championnes des moments qui comptent — là où l'on se retrouve. "
      "(Brief, p. 3 : « Key message: our brand the champions when it comes to event that matter / championing ».)",
      "reçu — brief, p. 3", recu=True)

# Ce qui était rangé ailleurs en sort.
poser("brief", "objectif_com",
      "Notoriété totale de 100 % sur les marchés clés. Une campagne de fin d'année virale sur TikTok, Facebook et "
      "Instagram : portée d'environ 10 millions d'utilisateurs de réseaux sociaux par marché clé.",
      "reçu — brief, p. 4 ; le message clé est passé dans son propre champ", recu=True)

poser("brief", "cible",
      "Cœur : les jeunes adultes de 18 à 35 ans — optimistes, dans la tendance, connectés, pris dans la course du "
      "quotidien (études, premier emploi, débrouille). Élargie : ceux avec qui ils se retrouvent — famille, amis, "
      "collègues. Tension : ils connaissent la marque par héritage, sans l'avoir choisie ; elle appartient à la table de "
      "leurs parents, pas à leurs moments à eux.",
      "Déduit du brief (p. 4, cible ; p. 2, plateforme « family/friends/colleagues togetherness »). Le comportement "
      "actuel et le comportement visé ont désormais leurs champs : la cible ne garde que la tension.")

poser("brief", "insight",
      "Dans la course du quotidien, chacun avance de son côté — le travail, les études, la débrouille. Les moments où "
      "l'on se retrouve — en famille, entre amis, entre collègues — deviennent rares, et c'est pour ça qu'on veut qu'ils "
      "comptent, et qu'ils se voient : d'où la tenue assortie, qui dit « on est ensemble » avant même la photo.",
      "Déduit de la plateforme « The We » (brief, p. 2 : togetherness en famille, entre amis, entre collègues) et de la "
      "tendance des pyjamas assortis (p. 2-3). Élargi : la première version réduisait « The We » à la famille.")

poser("brief", "promesse",
      "Là où l'on se retrouve — en famille, entre amis, entre collègues — EVAP rend le moment mémorable.",
      "Déduit de la plateforme EVAP conçue dans cette passe : « Make your moment memorable in your daily hustle ».")

poser("brief", "ton",
      "Complice, énergique, du présent : les codes des réseaux sociaux (défis, photos de groupe, vidéos courtes). "
      "Chaleureux sans nostalgie. Inclusif : le rituel dépasse Noël, la campagne n'est pas religieuse, et « The We » "
      "n'est jamais seulement la famille. À ne pas faire : le registre « héritage » (« depuis des générations », « comme "
      "nos grands-parents »), qui vieillit la marque — c'est précisément ce qu'on quitte — et reprendre le KV 2025.",
      "Déduit du brief (p. 2 : rajeunir, « love brands » ; p. 3 : ne pas repartir du KV 2025) et de la plateforme EVAP.")

# ════════════ 2. Les champs vides du dossier ════════════

bi = p["sections"]["bigidea"]
poser("bigidea", "campagne", "Les championnes des retrouvailles",
      "Nommée d'après l'idée proposée par le client (« EVAP, champion of togetherness at the end of the year ») et son "
      "message clé. Nom de travail : la séance le remplacera.")
poser("bigidea", "signature", "The We — make your moment memorable.",
      "Déduite de l'idée directrice EVAP « The We » et de sa promesse. Les slogans de marque (« Pour l'Energie dès le "
      "matin », « Reach your Peak ») restent signés par chaque marque.")
poser("bigidea", "rattachement",
      "Rattachée à la plateforme EVAP « The We » : le moment où l'on se retrouve — en famille, entre amis, entre "
      "collègues — devient mémorable. Côté marques : Bonnet Rouge sert des familles « coming from the heart of a WE "
      "culture » ; Peak, des gens dont la détermination est « for themselves as well as others ». Belle Hollandaise "
      "n'a pas de brand propeller : sa plateforme est une hypothèse.",
      "Déduit des plateformes conçues dans cette passe et des deux brand propellers (brief, p. 5).")

# ════════════ 3. La plateforme EVAP « The We » ════════════

MOTIF_EVAP = ("Conçue pour l'EOY 2026 à partir de la plateforme écrite par le client (« The We Culture », brief p. 2), de "
              "sa stratégie (rajeunir, « love brands ») et du repositionnement demandé : quitter l'héritage pour le "
              "présent — « Make your moment memorable in your daily hustle ». « The We » y est le fait d'être ensemble, "
              "pas seulement la famille. Écrite à l'identique sur la gamme EVAP des trois marques.")

EVAP = {
  "vision": "Un monde où l'on avance ensemble : chacun trace sa route, et les moments partagés sont ceux dont on se souvient.",
  "mission": "Faire de chaque moment où l'on se retrouve — en famille, entre amis, entre collègues — un moment mémorable, "
             "au milieu de la course du quotidien.",
  "valeurs": ["Ensemble — le « we » avant le « je »", "Générosité — ce qu'on a se partage", "Élan — on avance, on ne se retourne pas"],
  "origine": "Une boîte de lait concentré ne se finit jamais seul : elle passe de main en main, du café du matin au thé du "
             "bureau et au dessert de fête. EVAP garde cette vérité et laisse la nostalgie : ce qu'on partageait hier, "
             "on le partage aujourd'hui, à sa façon.",
  "archetype": "L'Ami (Everyman) — secondaire : le Bouffon (Jester). Appartenir, rire ensemble ; jamais le patriarche.",
  "preuves_origine": ["Plus de cent ans de présence des marques du portefeuille (brief, p. 4)",
                      "Leader EVAP : 93 % de part de marché (brief, p. 4)",
                      "Première campagne de fin d'année en Côte d'Ivoire en 2025, sur la tendance des pyjamas assortis (brief, p. 2)"],
  "positionnement": "Pour les 18-35 ans optimistes et connectés, pris dans la course du quotidien, EVAP est le lait des moments "
                    "partagés — en famille, entre amis, entre collègues — parce qu'une boîte ne se finit jamais seul. La marque "
                    "quitte l'héritage (« la marque de nos parents ») pour le présent : Make your moment memorable in your daily hustle.",
  "promesse": "Make your moment memorable in your daily hustle — dans la course du quotidien, le moment partagé qui compte.",
  "idee_directrice": "The We — le fait d'être ensemble : famille, amis, collègues, voisins. Là où l'on se retrouve, le moment devient mémorable.",
  "ton": "Complice, énergique, contemporain. Les codes des réseaux (vidéo courte, défi, photo de groupe). Chaleureux sans "
         "nostalgie ; inclusif — jamais religieux, jamais seulement la famille.",
  "symboles": ["Le groupe dans le cadre — jamais une personne seule avec le produit",
               "La tenue assortie — pyjama, t-shirt, couleur commune : le signe visible du « We »",
               "La boîte qui passe de main en main",
               "S'ajoutent aux actifs propres de chaque marque : le bonnet rouge, la montagne et le ciel de Peak, le bleu de Belle Hollandaise"],
  "dialecte": ["The We", "Make your moment memorable", "Daily hustle", "On se retrouve / Together"],
  "concurrents": ["Nido, Cowbell, Laity — au Ramadan et au petit-déjeuner, sur la nutrition (brief, p. 3)",
                  "L'IMP en sachet à 100 FCFA — la bascule prix (brief, p. 1)",
                  "Les substituts : jus, sodas, thé, café, boissons énergisantes (brand propellers, p. 5)"],
  "benefices": ["Émotionnel : le moment partagé dont on se souvient",
                "Social : être de ceux qui rassemblent",
                "Fonctionnel : un lait riche et crémeux qui se partage — café, thé, bouillie, desserts"],
  "preuves": ["Une boîte, plusieurs tasses : le format se partage",
              "La qualité FrieslandCampina, marques de référence depuis plus de cent ans",
              "Leader EVAP à 93 % de part de marché"],
  "sacrifice": "Renoncer à parler d'abord de nutrition et d'héritage : la marque parle du moment présent, pas du produit ni du passé.",
  "jamais": ["« Depuis des générations », « comme nos grands-parents » — le registre héritage",
             "Une personne seule avec le produit",
             "Une fête présentée comme exclusivement religieuse",
             "« The We » réduit à la seule famille"],
  "ne_fera_pas": ["Reprendre le KV EOY 2025 comme base",
                  "Opposer les générations",
                  "Promettre une présence que le rayon ne tient pas"],
  "rituels": ["La tenue assortie de fin d'année — pyjamas, t-shirts : le code visuel du « We »",
              "La photo de groupe partagée",
              "La pause café ou thé entre collègues",
              "Le dessert de fête au lait concentré"],
  "occasions": ["Fin d'année — le territoire à prendre : aucun concurrent direct ne l'occupe (brief, p. 3)",
                "Les pauses du quotidien — bureau, campus, atelier",
                "Ramadan — la saison principale de la catégorie, occupée par presque toutes les marques laitières"],
}
for mid in ["MQ-br", "MQ-peak", "MQ-bh"]:
    for cle, val in EVAP.items():
        # Le positionnement et l'idée directrice écrits par le client restent en révision : on les remplace, on ne les perd pas.
        ecrire("gamme", mid + "|EVAP", cle, val, MOTIF_EVAP, remplacer=True)

# ════════════ 4. Bonnet Rouge et Peak : les champs vides ════════════

MOTIF_BR = ("Déduit du brand propeller Bonnet Rouge remis au brief (p. 5 : purpose, personality, discriminating benefit, "
            "human truth) et du slogan « Pour l'Energie dès le matin ». À contresigner ou corriger avec le client.")
BR = {
  "mission": "Donner chaque matin aux familles l'énergie et l'assurance de bien choisir, pour avancer.",
  "valeurs": ["Bienveillance — on accompagne, on ne juge pas", "Progrès — chaque jour un pas de plus", "Confiance — une qualité qui a fait ses preuves"],
  "origine": "La boîte au bonnet rouge est celle qu'on ouvre le matin avant l'école et le travail. La promesse d'énergie dès "
             "le matin vient de là : un lait qui aide à bien commencer, pour aller plus loin.",
  "archetype": "Le Soignant (Caregiver) — secondaire : l'Ami. « A lifelong companion who is caring, supportive » (propeller).",
  "preuves_origine": ["Plus de cent ans de présence (brief, p. 4)",
                      "Source de calcium, de vitamines et de protéines recommandée par les autorités (propeller, p. 5)"],
  "idee_directrice": "L'énergie de réussir, dès le matin.",
  "symboles": ["Le bonnet rouge", "Le rouge Bonnet Rouge (#E4322B)", "Le logotype Bonnet Rouge"],
  "sacrifice": "Une boîte au-dessus du sachet d'IMP à 100 FCFA : un prix que la marque justifie par la qualité et par le moment.",
  "jamais": ["Aucune allégation pour l'alimentation des nourrissons", "Un effet santé que rien ne prouve", "La nostalgie « comme autrefois »"],
  "ne_fera_pas": ["Laisser penser que le lait concentré remplace le lait maternel",
                  "Montrer un pack sur un marché où il n'est pas distribué"],
  "rituels": ["Le petit-déjeuner avant l'école ou le travail", "Le café ou le thé au lait du matin", "La bouillie des enfants"],
  "occasions": ["Rentrée scolaire", "Ramadan", "Fin d'année"],
}
MOTIF_PK = ("Déduit du brand propeller Peak remis au brief (p. 5 : purpose, personality, discriminating benefit, reasons to "
            "believe, distinctive assets) et du slogan « Reach your Peak ». À contresigner ou corriger avec le client.")
PK = {
  "mission": "Donner à chacun, chaque jour, la force d'aller au bout de ses défis — pour soi et pour les autres.",
  "valeurs": ["Détermination", "Franchise — dire les choses comme elles sont", "Élan partagé — pour soi et pour les autres"],
  "origine": "Plus de soixante ans à accompagner les défis du quotidien (propeller). La montagne dit le sommet qu'on vise, "
             "le ciel bleu la pureté du lait, les palmiers la croissance et la famille.",
  "archetype": "Le Héros — secondaire : l'Ami. « A proud lifelong and inspiring friend who grows with you » (propeller).",
  "preuves_origine": ["Plus de 60 ans de qualité constante (propeller, p. 5)",
                      "Enrichi au-delà de 28 vitamines et minéraux (propeller, p. 5)"],
  "idee_directrice": "Reach your Peak — chaque jour, un sommet à atteindre.",
  "sacrifice": "Un prix de marque premium face aux sachets, justifié par l'enrichissement et la constance de qualité.",
  "jamais": ["Aucune allégation pour l'alimentation des nourrissons", "Le registre de l'échec ou de la honte",
             "Une personne seule au sommet : la détermination de Peak est « for themselves as well as others »"],
  "ne_fera_pas": ["Détourner la montagne, le ciel bleu ou les palmiers de leur sens (propeller)",
                  "Promettre une performance médicale"],
  "rituels": ["Le lait du matin avant l'effort", "Le verre partagé après l'effort", "Le thé ou le café au lait"],
  "occasions": ["Rentrée scolaire", "Ramadan", "Fin d'année"],
}
for cle, val in BR.items(): ecrire("marque", "MQ-br", cle, val, MOTIF_BR)
for cle, val in PK.items(): ecrire("marque", "MQ-peak", cle, val, MOTIF_PK)

# ════════════ 5. Belle Hollandaise : la plateforme qui manquait ════════════

MOTIF_BH = ("Conçue sans document client : le brief ne fournit aucun brand propeller pour Belle Hollandaise. Son rôle dans "
            "le portefeuille — la générosité accessible, à côté de la nutrition familiale de Bonnet Rouge et de la "
            "détermination de Peak — est une hypothèse à valider avec FrieslandCampina avant toute exécution.")
BH = {
  "vision": "Que le bon lait soit sur toutes les tables, tous les jours.",
  "mission": "Mettre la qualité laitière hollandaise à portée de chaque foyer, pour les petits et les grands moments partagés.",
  "valeurs": ["Générosité", "Simplicité", "Accessibilité"],
  "origine": "Son nom dit sa source : le savoir-faire laitier néerlandais de FrieslandCampina, coopérative d'éleveurs.",
  "archetype": "L'Ami (Everyman) — secondaire : le Soignant.",
  "preuves_origine": ["FrieslandCampina, coopérative laitière néerlandaise", "Hero SKU Belle Hollandaise 160 g au brief EOY 2026"],
  "positionnement": "Pour les foyers qui veulent bien faire sans compter à chaque fois, Belle Hollandaise est le lait concentré "
                    "généreux du quotidien, parce qu'elle porte la qualité laitière hollandaise dans un format et à un prix "
                    "accessibles.",
  "promesse": "La qualité hollandaise, généreuse au quotidien.",
  "idee_directrice": "Le bon lait, pour tout le monde.",
  "ton": "Chaleureux, simple, direct ; jamais condescendant.",
  "symboles": ["Le bleu Belle Hollandaise (#1B75BC)", "Le logotype Belle Hollandaise"],
  "dialecte": ["Belle Hollandaise", "Généreux", "Pour tout le monde"],
  "concurrents": ["L'IMP en sachet à 100 FCFA", "Les laits concentrés d'entrée de gamme", "Les substituts : thé, café sans lait, boissons sucrées"],
  "benefices": ["Fonctionnel : un lait crémeux qui s'utilise partout — boissons, bouillies, desserts",
                "Émotionnel : bien faire pour les siens sans se ruiner",
                "Social : avoir de quoi recevoir"],
  "preuves": ["La qualité FrieslandCampina", "Le format 160 g"],
  "sacrifice": "Moins de discours nutrition que Bonnet Rouge et Peak : elle gagne sur la générosité et l'accessibilité, pas sur l'enrichissement.",
  "jamais": ["Aucune allégation pour l'alimentation des nourrissons", "Le registre « pas cher »", "Le territoire de Bonnet Rouge ou de Peak"],
  "ne_fera_pas": ["Se battre sur le prix contre le sachet"],
  "rituels": ["Le thé ou le café au lait partagé", "Les desserts et boissons de fête"],
  "occasions": ["Fin d'année", "Ramadan"],
}
for cle, val in BH.items(): ecrire("marque", "MQ-bh", cle, val, MOTIF_BH)

# ════════════ 6. « The We » n'est pas la famille : la chaîne du raisonnement suit ════════════

MOTIF_WE = " Élargi le " + QUAND[:10] + " : « The We » est le fait d'être ensemble — famille, amis, collègues — pas la seule famille."
ins = {i["id"]: i for i in p.get("insights", [])}
i1 = ins.get("IN-eoy26-1")
if i1 and "collègues" not in i1["passes"]["phrase"]:
    i1.setdefault("versions", []).append({"quand": QUAND, "passes": copy.deepcopy(i1["passes"])})
    i1["passes"] = {
      "longue": "Dans la course du quotidien, chacun vit sa vie — le travail, les études, la débrouille, son quartier. La "
                "famille, la bande, l'équipe du bureau ne se retrouvent plus qu'à l'occasion. La fin d'année est le moment "
                "où tous ces « nous » se reforment pour de bon : on se met d'accord jusque sur la tenue, et on veut en "
                "garder la preuve à montrer.",
      "temps": {"situation": "La fin d'année, quand la famille, les amis et les collègues se retrouvent.",
                "tension": "Le reste de l'année, chacun court de son côté et le « nous » s'effiloche.",
                "empeche": "Sans preuve partagée, les retrouvailles ne laissent rien derrière elles."},
      "phrase": "La fin d'année, c'est le moment où l'on redevient « nous » — en famille, entre amis, entre collègues — et on veut que ça se voie."}
    if i1.get("infere"): i1["infere"]["pourquoi"] += MOTIF_WE

for t in p.get("territoires", []):
    if t["id"] == "TR-eoy26-1" and "collègues" not in t["quoi"]:
        t.setdefault("versions", []).append({"quand": QUAND, "nom": t["nom"], "quoi": t["quoi"]})
        t["nom"] = "The We — les retrouvailles de fin d'année"
        t["quoi"] = ("Tout ce qui rassemble et laisse une trace, en famille, entre amis, entre collègues : le repas, la tenue "
                     "assortie, la photo de groupe, les lendemains de fête. La marque y est l'invitée évidente — celle qui rend "
                     "le moment mémorable, pas celle qui rappelle le passé.")
        if t.get("infere"): t["infere"]["pourquoi"] += MOTIF_WE

for c in p.get("bigideas", []):
    ch = c.get("champs", {})
    if c["id"] == "BE-eoy26-ideal" and "collègues" not in ch.get("tension", ""):
        c.setdefault("versions", []).append({"quand": QUAND, "champs": copy.deepcopy(ch)})
        ch["tension"] = ("Chacun réussit sa vie de son côté — la ville, le travail, la débrouille — et les « nous » qui comptent "
                         "(la famille, la bande, l'équipe) s'effilochent sans que personne ne veuille les perdre.")
        ch["croyance"] = "Nous croyons que les liens ne se perdent pas : ils attendent une raison de se retrouver."
    if c["id"] == "BE-eoy26-verite" and "groupe" not in c.get("phrase", ""):
        c.setdefault("versions", []).append({"quand": QUAND, "champs": copy.deepcopy(ch), "mecanique": c.get("mecanique")})
        ch["verite"] = ("Chaque fin d'année on refait la même photo de groupe — la famille, la bande, l'équipe — et c'est "
                        "précisément pour ça qu'on la refait.")
        c["mecanique"] = ("On publie côte à côte la photo de groupe de cette année et celle d'avant : les visages ont changé, les "
                          "tenues aussi, la marque est toujours là.")
        c["phrase"] = "Chaque année la même photo de groupe ; chaque année, on est là."

trace("cadrage rangé", "5 champs de brief créés et remplis (stratégie client, job to be done, comportements, message clé) ; "
      "plateforme EVAP « The We » conçue ; Bonnet Rouge et Peak complétés ; Belle Hollandaise conçue (hypothèse)")

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
n = lambda t, i: len(vault(t, i).get("inferences", {}))
print("inférences de plateforme — EVAP:", n("gamme", "MQ-br|EVAP"), "· BR:", n("marque", "MQ-br"),
      "· Peak:", n("marque", "MQ-peak"), "· BH:", n("marque", "MQ-bh"))
print("révisions de cadrage :", len(revs), "· inférences du dossier :", len(infs))
