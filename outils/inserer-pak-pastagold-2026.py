# inserer-pak-pastagold-2026.py — deux dossiers à cadrer : le Port Autonome de Kribi et le spot La Pasta Gold.
#
# Sources (Téléchargements d'Alex, 05/10/2026) :
#   PAK — « DIGITAL PAK 2026 by MATANGA » (stratégie digitale, 28 p.), « RETROPLANNING PAK » (plan de contenu
#         juillet 2026 → juin 2027, 21 p.), « RSE STRAT » (RSE & développement durable, 9 p.).
#   La Pasta Gold — « LA PASTA GOLD STORYBOARD OK » (15 p.), « MOTION BRIEF LA PASTA GOLD » (29/09/2026, 5 p.),
#         « La Pasta Gold Proposition Celebrites OK » (7 p.), « TENUES SPOT LA PASTA » (8 p.),
#         « CHRONOGRAMME LA PASTA GOLD (DÉFINITIF) » (xlsx), « FACURE PROFORMA SPOT LA PASTA » (10/09/2026).
#
# La demande : « importer ces deux nouveaux projets à cadrer, inférer ce qui doit l'être, la section cadrage
# complète, construire tout ce qui manque, plateforme de marque incluse ».
#
# Ce que le script ne recopie pas, et dit : aucun montant (ni le budget de 25 M FCFA du PAK, ni les lignes de
# la proforma) — le dépôt est lisible en ligne, les montants restent dans les documents. Aucune photo des
# personnalités proposées au casting : leurs noms seulement, comme le document les présente.
#
# Usage : python3 outils/inserer-pak-pastagold-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, datetime

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
V = "assets/review/vignettes/"
DL = "~/Downloads/"

d = json.load(open(SRC))
journal = d.setdefault("journal", [])
marques = {m["id"]: m for m in d["marques"]}
clients = {c["id"]: c for c in d["clients"]}

def trace(action, detail, typ, ident, mqs=None):
    e = {"quand": QUAND, "qui": PAR, "action": action, "type": typ, "id": ident, "detail": detail}
    if mqs: e["marques"] = mqs
    journal.append(e)

def vide(v): return v is None or v == "" or v == [] or v == {}

def ecrire_vault(v, cle, val, motif, recu=False, source=None):
    """N'écrase jamais : un champ déjà écrit garde sa valeur."""
    if not vide(v.get(cle)):
        return False
    v[cle] = val
    if recu:
        v.setdefault("sources", {})[cle] = source
    else:
        v.setdefault("inferences", {})[cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}
    return True

def ajouter_liste(v, cle, items, motif):
    """Ajoute à une liste existante sans rien retirer, et garde l'avant dans les révisions."""
    avant = list(v.get(cle) or [])
    neufs = [x for x in items if x not in avant]
    if not neufs: return
    v[cle] = avant + neufs
    v.setdefault("revisions", []).append({"quand": QUAND, "qui": PAR, "champ": cle, "avant": avant,
                                          "apres": v[cle], "motif": motif})

def campagne(c):
    if not any(x["id"] == c["id"] for x in d["campagnes"]):
        d["campagnes"].append(c)

def projet_neuf(p):
    ex = [x for x in d["projets"] if x["id"] == p["id"]]
    if ex: return ex[0]
    d["projets"].append(p)
    return p

def setter(p, INF):
    def s(section, cle, val, motif=None):
        p["sections"].setdefault(section, {})[cle] = val
        if motif: INF[section + "." + cle] = {"pourquoi": motif, "quand": QUAND, "par": PAR}
    return s

def livrable(i, nom, support, volet, resp, echeance, note=None, vignette=None, nature=None, niveau=None, src=None):
    l = {"id": i, "nom": nom, "support": support, "marche": "M-CM", "voletId": volet, "responsable": resp,
         "echeance": echeance, "remise": None, "publication": None, "origine": "prevu", "pisteId": None,
         "maitre": None, "versionMaitre": None, "version": 1, "versions": [], "estime": None, "reel": None,
         "toursVendus": None, "assets": [], "entrees": [], "annotations": [], "mockups": [], "niveau": niveau,
         "releve": {"source": src} if src else {}}
    if note: l["note"] = note
    if vignette: l["vignette"] = V + vignette
    if nature: l["nature"] = nature
    return l

# ═══════════════════════════════════════════════════════════════════════════════════════════
#  I. LE PORT AUTONOME DE KRIBI
# ═══════════════════════════════════════════════════════════════════════════════════════════
S_PAK = "« DIGITAL PAK 2026 by MATANGA » (stratégie digitale 2026)"
S_RETRO = "« RETROPLANNING PAK » (juillet 2026 → juin 2027)"
S_RSE = "« RSE STRAT » (RSE & développement durable 2026)"

if "C-pak" not in clients:
    d["clients"].append({"id": "C-pak", "nom": "Port Autonome de Kribi", "interne": False,
        "note": "Entreprise parapublique, port en eau profonde de Kribi (Sud Cameroun) et sa zone industrialo-portuaire. "
                "Client de Matanga depuis cinq ans : la stratégie initiale en a fait la première marque suivie sur LinkedIn "
                "en Afrique centrale (stratégie digitale 2026, p. 3). Des traces antérieures sont rangées dans XC-118.",
        "vault": {}, "marches": ["CM"], "categories": []})
if "MQ-pak" not in marques:
    m = {"id": "MQ-pak", "clientId": "C-pak", "nom": "Port Autonome de Kribi", "secteur": "portuaire et logistique",
         "socle": None, "logo": None, "couleurs": [], "nature": "marque institutionnelle", "vault": {},
         "historique": [{"quand": QUAND, "champ": "creation", "avant": None, "apres": "MQ-pak",
                         "motif": "Créée à l'import de la stratégie digitale 2026 du PAK."}]}
    d["marques"].append(m); marques["MQ-pak"] = m

v = marques["MQ-pak"].setdefault("vault", {})
R = lambda cle, val, src: ecrire_vault(v, cle, val, None, recu=True, source=src)
I = lambda cle, val, motif: ecrire_vault(v, cle, val, motif)
MP = ("Déduit de la stratégie digitale 2026, du rétroplanning et de la stratégie RSE rédigés par Matanga pour le PAK. "
      "Aucune plateforme de marque du PAK n'a été transmise : à contresigner avec la direction de la communication du port.")

R("vision", "Faire du PAK la référence portuaire en Afrique subsaharienne, et un modèle de communication digitale corporate au "
  "service de l'attractivité de Kribi et de la croissance nationale.", S_PAK + ", p. 11 — Vision 2026-2027")
I("mission", "Connecter l'Afrique centrale au monde : offrir aux armateurs, aux logisticiens et aux industriels un port en eau "
  "profonde fiable, innovant et transparent, et faire de Kribi un pôle de croissance pour la sous-région et ses communautés.", MP)
R("valeurs", ["Performance — des infrastructures deep-sea de classe mondiale", "Innovation — un écosystème digitalisé (Smart Port)",
              "Partenariat — plus qu'un port, un partenaire de croissance", "Fiabilité — une gestion transparente et orientée solutions"],
  S_PAK + ", p. 13 — proposition de valeur unique")
I("origine", "Un port en eau profonde construit à Kribi pour recevoir les navires que les ports d'estuaire ne pouvaient plus "
  "accueillir. Mis en service en 2018, il étend aujourd'hui ses quais spécialisés (Phase 2) et sa zone industrialo-portuaire, "
  "au bord de l'une des mangroves les plus riches du golfe de Guinée.",
  MP + " L'année de mise en service vient de l'histoire publique du port, à vérifier ; la mangrove est citée par la stratégie RSE (p. 4).")
I("archetype", "Le Souverain (Ruler) — secondaire : le Créateur. L'autorité portuaire qui tient et rassure, et qui bâtit l'avenir de Kribi.",
  MP + " Le playbook éditorial demande « une posture d'autorité portuaire » et « visionnaire » (p. 18).")
R("preuves_origine", ["Port en eau profonde : 16 m de tirant d'eau (p. 13)", "Première marque suivie sur LinkedIn en Afrique centrale (p. 3)",
                      "Phase 2 en cours : quais spécialisés, portiques STS (p. 8 et 20)",
                      "Entreprise parapublique, à fort impact territorial (RSE, p. 2)"],
  S_PAK + " et " + S_RSE)
R("positionnement", "Le port innovant qui connecte l'Afrique au monde — performance, innovation, partenariat, fiabilité.",
  S_PAK + ", p. 13")
R("promesse", "Plus qu'un port, un partenaire de croissance intégré.", S_PAK + ", p. 13 — Partenariat")
R("idee_directrice", "Créateur d'influence, de confiance et de business dans toute l'Afrique centrale.", S_PAK + ", p. 6 — Notre ambition")
R("ton", "Corporate et expert — une posture d'autorité portuaire, précise sur les chiffres, rassurante sur les opérations. "
  "Visionnaire et inspirant — l'innovation, l'avenir de Kribi, son rôle dans l'économie africaine. Humain et partenaire — "
  "proche de la communauté, valorisant les hommes et les femmes qui font le port.", S_PAK + ", p. 18 — playbook éditorial")
I("symboles", ["Les portiques STS et les quais en eau profonde", "Le conteneur et le navire à quai", "La mer et la mangrove de Kribi",
               "Le corridor Edéa–Kribi", "Le casque et le gilet des équipes du port"], MP)
R("dialecte", ["Kribi Connect", "PAK Innovation Lab", "PAK Trust", "TED PAK", "Smart Port", "#PAK60s", "#AskTheCaptain",
               "#PortFacts", "#KribiCommunauté", "#EcoportKribi", "Inside The Port"], S_PAK + " et " + S_RSE)
I("concurrents", ["Le Port Autonome de Douala — le port historique du Cameroun", "Les ports de la façade atlantique : Lomé, Pointe-Noire, Abidjan",
                  "DP World — la référence de communication corporate retenue au benchmark (p. 9-10)"],
  MP + " Seul DP World est nommé par le document, et comme modèle de communication, pas comme concurrent.")
I("benefices", ["Fonctionnel : accueillir les grands navires et les traiter vite — eau profonde, terminaux Phase 2",
                "Économique : une zone industrialo-portuaire où s'installer et croître",
                "Relationnel : un partenaire transparent, qui prévient et propose des solutions"], MP)
R("preuves", ["16 m de tirant d'eau (stratégie, p. 13)",
              "Partenaires installés : Tractafric, AGL, ACC Cacao, CMA CGM, Cimpor, Cadyst, Kridevco, Kamlog (rétroplanning, p. 4)",
              "25 managers en formation TrainForTrade avec la CNUCED, nov. 2025 → nov. 2026 (RSE, p. 5)",
              "Une unité de pêche complète remise au village de Lokoundjé-Embouchure (RSE, p. 5)",
              "Programme PASEK d'actions socio-économiques pour les riverains (RSE, p. 5)"],
  S_PAK + ", " + S_RETRO + " et " + S_RSE)
I("sacrifice", "Choisir Kribi, c'est accepter un corridor routier encore en travaux — l'Edéa–Kribi — en échange d'un port profond, "
  "moderne et d'une zone où s'installer. La marque doit le dire elle-même, avant qu'on le lui reproche.",
  MP + " La perception négative des routes d'accès est la menace n° 1 du SWOT (p. 8).")
I("jamais", ["Laisser le vide s'installer sur un sujet de friction — routes, travaux, délais (PAK Trust, p. 21)",
             "Polémiquer avec un usager sur les réseaux", "L'annonce sans la valeur ajoutée (audit, p. 7)", "Un chiffre sans source"], MP)
I("ne_fera_pas", ["Parler « one size fits all » aux armateurs, aux investisseurs et au grand public (SWOT, p. 8)",
                  "Promettre une date de travaux qu'elle ne tiendra pas", "Se limiter au posting quotidien sans objectif business (p. 4)"], MP)
R("rituels", ["Kribi Connect — un épisode par mois", "Data Motion — le 1er de chaque mois", "TED PAK — chaque trimestre",
              "Le « post du vendredi » des ambassadeurs internes (p. 23)", "Le Point Travaux trimestriel (p. 21)",
              "Le comité éditorial mensuel à J-30 avec Matanga (p. 25)"], S_PAK + " et " + S_RETRO)
R("occasions", ["20 mai — Fête nationale", "22 mai — Journée mondiale de la biodiversité", "5 juin — Journée mondiale de l'environnement ; 8 juin — des océans",
                "18 juillet — Journée Nelson Mandela", "12 août — Journée internationale de la jeunesse", "Journée maritime mondiale (septembre)",
                "1er octobre — Réunification (le rétroplanning la cite aussi au 11/11 : à vérifier)", "Vœux et bilan annuel (décembre-janvier)",
                "Les quatre TED PAK : septembre, décembre, mars, juin"], S_RETRO + ", p. 4-16")
trace("plateforme de marque", "Port Autonome de Kribi : marque créée ; 11 champs reçus des documents Matanga, 9 inférés", "marques", "MQ-pak", ["MQ-pak"])

cv = clients["C-pak"].setdefault("vault", {}) if isinstance(clients.get("C-pak", {}).get("vault"), dict) else None
if cv is None:
    cv = next(c for c in d["clients"] if c["id"] == "C-pak").setdefault("vault", {})
ecrire_vault(cv, "positionnement", "Entreprise parapublique : le PAK rend compte à l'État, aux bailleurs et aux partenaires internationaux "
             "de ses impacts sociaux et environnementaux.", None, recu=True, source=S_RSE + ", p. 2")

camp_pak = "CMP-pak-strategie-digitale-2026"
campagne({"id": camp_pak, "nom": "Port Autonome de Kribi — Stratégie digitale 2026", "clientId": "C-pak", "marqueIds": ["MQ-pak"],
          "regime": "always-on", "occasion": "continu", "fenetre": {"debut": "2026-07-01", "fin": "2027-06-30"},
          "marches": ["M-CM"], "bilan": "", "ecartes": {}, "cree_le": QUAND, "source": S_RETRO,
          "couverture": {"type": "illustration", "vignette": V + "pak26-strategie-couverture.jpg",
                         "motif": "Couverture de la stratégie digitale 2026 rédigée par Matanga pour le PAK."},
          "pieces": [{"type": "planche", "statut": "architecture éditoriale", "vignette": V + "pak26-retroplanning-architecture.jpg", "source": S_RETRO + ", p. 2"},
                     {"type": "planche", "statut": "calendrier macro", "vignette": V + "pak26-retroplanning-macro-calendrier.jpg", "source": S_RETRO + ", p. 4"},
                     {"type": "planche", "statut": "RSE — les quatre piliers", "vignette": V + "pak26-rse-piliers.jpg", "source": S_RSE + ", p. 3"}],
          "infere": {"pourquoi": "Le fil de l'année du PAK : un exercice éditorial continu de douze mois (juillet 2026 → juin 2027), "
                                 "cinq programmes et un contenu natif quotidien. Fenêtre reçue du rétroplanning.", "quand": QUAND}})

p = projet_neuf({"id": "PRJ-PAK-2026", "ref": "MT-0051", "nom": "Port Autonome de Kribi — stratégie digitale et plan de contenu 2026-2027",
    "gabarit": "cycle", "nature": "cycle", "cree_le": QUAND, "statut": "cadrage", "campagneId": camp_pak, "structure": "matanga",
    "structureSource": {"source": "document", "motif": "« by Matanga Agency » sur les trois documents ; la stack et les licences sont prises en charge par Matanga (p. 25).", "quand": QUAND},
    "equipe": [{"personne": "P-alex", "poste": "creation"}, {"personne": "P-vanelle", "poste": "planning"},
               {"personne": "P-derick", "poste": "clientele"}, {"personne": "P-lydienne", "poste": "digital"},
               {"personne": "P-serge", "poste": "motion"}, {"personne": "P-adeline", "poste": "event"}],
    "sections": {"identite": {}, "brief": {}, "briefback": {}, "socle": {}, "strategie": {}, "bigidea": {}, "pistes": []},
    "idees": [], "fils": [], "volets": [], "livrables": [], "notes": [], "insights": [], "territoires": [],
    "perimetre": {"supports": ["S-digital", "S-film916", "S-carrousel", "S-infographie", "S-ads"], "marches": ["M-CM"]},
    "couverture": {"type": "illustration", "vignette": V + "pak26-strategie-couverture.jpg", "motif": "Couverture de la stratégie digitale 2026."},
    "historiqueCampagne": [{"quand": QUAND, "qui": PAR, "avant": None, "apres": camp_pak, "motif": "Rattaché à l'import : le fil de l'année 2026-2027 du PAK."}]})

INF = {}
s = setter(p, INF)
MI = "Inféré des trois documents Matanga (stratégie, rétroplanning, RSE). "

# — identité —
s("identite", "client", "Port Autonome de Kribi"); s("identite", "marque", "Port Autonome de Kribi")
s("identite", "clientId", "C-pak"); s("identite", "marqueIds", ["MQ-pak"]); s("identite", "marches", ["M-CM"])
s("identite", "type", "Stratégie digitale annuelle et plan de contenu : cinq programmes éditoriaux, contenu natif, achat média et RSE",
  MI + "Le document est une recommandation stratégique suivie d'un rétroplanning de production.")
s("identite", "objectif", "Passer d'une communication de notoriété à une stratégie d'influence business et de conversion : faire de "
  "l'audience digitale du PAK un levier de croissance économique pour la sous-région.")
s("identite", "fenetre", "Juillet 2026 → juin 2027 (douze mois) ; préparation avril-juin 2026 au plan. Au 5 octobre 2026, le dossier est "
  "encore à cadrer : les trois premiers mois du plan sont passés — le calendrier est à recaler, à commencer par le TED PAK de septembre.",
  MI + "La fenêtre est reçue ; le recalage est une déduction de la date d'import.")
s("identite", "debut", "2026-07-01"); s("identite", "echeance", "2027-06-30")
s("identite", "budget", None)
s("identite", "budgetNote", "Budget prévisionnel au document (p. 26), réparti entre honoraires, production, achat média et outils ; "
  "montant non recopié au dépôt. Réallocation possible de 10 % selon la performance.")
s("identite", "decideurId", None)
s("identite", "decideur", "La direction générale du PAK, sur proposition de sa direction de la communication — noms à obtenir par Derick",
  MI + "Le document dit seulement « le PAK valide la stratégie globale » (rétroplanning, p. 19).")
s("identite", "tueur", "La tutelle et la direction générale : une entreprise parapublique ne communique pas sur ses défis (routes, travaux) "
  "sans leur accord — c'est le programme PAK Trust qui peut tomber.", MI + "La transparence sur les défis est le pilier le plus exposé.")
s("identite", "circuit", "Comité éditorial stratégique mensuel à J-30 (performances M-1, thèmes, temps forts) → livraison du planning et des "
  "maquettes à J-15 pour validation par le PAK → point hebdomadaire de 30 min (actu chaude, sprints) → diffusion et modération "
  "quotidiennes → reporting à J+5.")
s("identite", "mesure", ["Portée multiplateforme : 500 K+ par mois", "Abonnés : +30 % sur l'ensemble des réseaux",
  "LinkedIn : portée +50 %, engagement > 3,5 %, 15 leads qualifiés par mois", "Kribi Connect : 10 K+ vues par épisode à J+21",
  "TED PAK : 500+ inscrits qualifiés B2B/B2G par édition", "RSE : 85 % de sentiment positif", "Réactivité : réponse aux actus chaudes < 2 h"])
s("identite", "pilier", "E", MI + "Un exercice d'influence et de communauté : pilier Engagement, adossé à la Distinction (Smart Port).")

# — brief —
b = "brief"
s(b, "porteur", "P-derick")
s(b, "verbatim", "Pas de brief écrit du PAK au dossier. Le document de référence est la recommandation de Matanga : « Repositionner le PAK "
  "comme la référence portuaire en Afrique centrale et un modèle d'innovation digitale. » (Stratégie digitale 2026, p. 1.) "
  "« Après avoir conquis la notoriété, le PAK doit aujourd'hui transformer son audience digitale en levier de croissance économique "
  "pour la sous-région. » (p. 3.)")
s(b, "probleme", "Le PAK est la première marque suivie sur LinkedIn en Afrique centrale, mais son engagement baisse (-15 % sur un an), "
  "sa communication se limite au posting quotidien sans objectif business, elle ne segmente pas (B2B / grand public), n'exploite ni la "
  "vidéo ni ses employés, et ne suit aucun lead. Pendant ce temps, l'extension du port et l'arrivée de nouveaux acteurs logistiques "
  "exigent de convertir — et la route Edéa–Kribi nourrit une perception négative que personne n'adresse.")
s(b, "objectif_business", "Attirer de nouveaux armateurs, transitaires et opérateurs logistiques vers Kribi, et des investisseurs dans la "
  "zone industrialo-portuaire ; fidéliser les partenaires installés.", MI + "Repris du pilier Attraction (p. 12) ; aucun chiffre de trafic n'est fixé.")
s(b, "objectif_com", "Passer de la notoriété à l'influence : leads qualifiés B2B, réputation corporate internationale, confiance du grand "
  "public et des riverains, et une marque employeur portée par 50 ambassadeurs internes.")
s(b, "strategie_client", "Quatre piliers : Attraction (lead gen et trafic — armateurs, transitaires, opérateurs), Valorisation (image et "
  "fidélisation — investisseurs ZIP, partenaires institutionnels), Transparence (confiance et réputation — usagers, grand public, médias), "
  "Influence (advocacy et marque employeur — collaborateurs, talents). Ciblage 60 / 30 / 10. LinkedIn 50 % des efforts, social temps "
  "réel 30 %, vidéo 20 %.")
s(b, "jtbd", "Amener un directeur supply chain, un armateur ou un investisseur qui connaît Kribi de nom à le considérer comme une option "
  "fiable et rentable — en lui montrant, preuves et témoignages à l'appui, ce que d'autres y ont déjà réussi.", MI)
s(b, "comportement_actuel", "« Kribi ? On voit passer leurs visites officielles et leurs signatures sur LinkedIn. C'est un beau port — mais la route… »", MI)
s(b, "comportement_vise", "« Kribi, c'est le port où mes concurrents s'installent : ils y gagnent du temps, le port dit les choses, et je sais à qui parler. »", MI)
s(b, "cible", "Business makers (60 %) : armateurs, transitaires, 3PL, directeurs supply chain internationaux — efficacité, ROI, connectivité. "
  "Investisseurs et décideurs (30 %) : investisseurs de la ZIP, bailleurs, gouvernement — vision long terme, stabilité, impact. "
  "Influenceurs et talents (10 %) : employés potentiels, médias, grand public local et sous-régional, leaders d'opinion — fierté, emploi, "
  "innovation, RSE. Tension : ils reconnaissent le port, ils doutent de son accès.")
s(b, "insight", "Un armateur ne croit pas une brochure : il croit un autre armateur — et il se méfie d'un port qui ne parle jamais de ses routes.",
  MI + "Détaillé dans les insights du dossier.")
s(b, "promesse", "Plus qu'un port, un partenaire de croissance intégré.")
s(b, "message_cle", "Le port innovant qui connecte l'Afrique au monde — et qui le prouve, chiffres, partenaires et chantiers à l'appui.")
s(b, "hierarchie_messages", [
  "L'ambition : faire du PAK un modèle de communication corporate portuaire — créateur d'influence, de confiance et de business",
  "La vision : la référence portuaire en Afrique subsaharienne",
  "La proposition de valeur : le port innovant qui connecte l'Afrique au monde — performance (16 m), innovation (Smart Port), partenariat, fiabilité",
  "Les preuves : Phase 2, trafic mensuel, partenaires de la ZIP, RSE",
  "La transparence : le point sur les routes et les travaux, les réponses directes du DG"])
s(b, "ctas", ["Investir à Kribi — rencontrer l'équipe ZIP", "S'inscrire au TED PAK", "Télécharger la fiche technique (Innovation Lab)",
              "Suivre Kribi Connect", "Rejoindre le PAK (recrutements)"], MI + "Déduits des KPIs (leads, inscrits, téléchargements) ; aucun CTA n'est écrit.")
s(b, "calendrier", [
  "Avril-juin 2026 — préparation : briefs, repérages, charte Kribi Connect",
  "Juillet 2026 — lancement de la nouvelle ère éditoriale ; Kribi Connect ép. 01 (Tractafric)",
  "Août 2026 — Kribi Connect ép. 02 (AGL) ; préparation du TED PAK Q2",
  "Septembre 2026 — TED PAK Q2 « Logistique verte »",
  "Décembre 2026 — TED PAK Q3 « Corridor Edéa–Kribi » ; vœux et bilan",
  "Mars 2027 — TED PAK Q4 « Investir à Kribi »",
  "Juin 2027 — TED PAK Q5 « Logistique verte II » ; bilan de l'exercice et teaser de la stratégie suivante",
  "Chaque mois — comité éditorial à J-30, planning à J-15, Data Motion le 1er, reporting à J+5",
  "Au 05/10/2026 — trois mois du plan sont passés sans démarrage tracé ici : le calendrier est à recaler"])
s(b, "canaux", ["LinkedIn — hub B2B et influence, 50 % des efforts, 3-4 posts par semaine",
  "YouTube et vidéo — vitrine d'expertise, 20 % des efforts, 2 vidéos majeures par mois",
  "TikTok et Reels — portée et marque employeur, 3-5 vidéos par semaine (#PAK60s, #AskTheCaptain, #PortFacts)",
  "X, Facebook, Instagram — social temps réel, 30 % des efforts, 4-6 posts par semaine",
  "Newsletter — récapitulatif mensuel", "Paid — 18 campagnes LinkedIn et Meta Ads sur l'exercice",
  "Événement — TED PAK trimestriel, hybride (physique et live LinkedIn / YouTube)"])
s(b, "risques", ["La route Edéa–Kribi : parler des défis peut ouvrir une crise si les réponses ne suivent pas — chaque Point Travaux doit être validé par la direction",
  "Lassitude de l'audience face à un contenu répétitif (menace du SWOT)",
  "Charge : les mois de TED PAK sont « très élevés » — renfort audiovisuel et événementiel nécessaire à J-30 (rétroplanning, p. 18)",
  "Partenaires de Kribi Connect : chaque épisode suppose l'accord d'un CEO extérieur — douze accords à obtenir",
  "Le calendrier a déjà glissé de trois mois",
  "Incohérences au rétroplanning : deux fiches « octobre 2026 » et « novembre 2026 », Réunification au 1/10 et au 11/11, fiche de juillet citant des dates de mai"],
  MI + "Les incohérences sont relevées dans le document lui-même.")
s(b, "droits_usage", ["Témoignages et images des entreprises partenaires (Kribi Connect) : accord écrit de chaque partenaire",
  "Droit à l'image des employés ambassadeurs et des riverains (portraits RSE) : autorisations individuelles",
  "Prises de vue du port et drones : autorisations d'accès et de sûreté portuaire",
  "Outils de l'agence (Hootsuite, Adobe, Midjourney) : licences prises en charge par Matanga (p. 25)"], MI)
s(b, "contraintes", "Entreprise parapublique : rendre compte à l'État et aux bailleurs ; sûreté portuaire pour toute prise de vue ; "
  "validations PAK à chaque étape du cycle mensuel ; volume de ~600 contenus sur douze mois avec une équipe interne réduite (un graphiste "
  "exé, un community manager).")
s(b, "ton", "Corporate et expert, visionnaire et inspirant, humain et partenaire — passer d'une communication institutionnelle froide à un "
  "storytelling business engageant et humain.")
s(b, "mandatories", ["Le nom : Port Autonome de Kribi (PAK)", "Chaque chiffre avec sa source", "Aucune prise de vue sans autorisation de sûreté",
  "La validation PAK de tout contenu sur les défis (routes, travaux)"], MI)
s(b, "livrables_attendus", ["12 épisodes Kribi Connect (~60 livrables : vidéo, article, carrousel, reel, podcast)",
  "12 formats Innovation Lab (~72 contenus : Data Motion, Tech Focus, visite 360°, Perf Report)",
  "4 éditions TED PAK et ~80 dérivés (replays, extraits, quote cards)", "~96 contenus RSE (2 par semaine)",
  "~195 posts corporate et ~72 posts natifs institutionnels", "~18 campagnes paid", "Corporate Influencer Program : 50 ambassadeurs formés, 5 ambassadeurs externes",
  "1er rapport RSE annuel (aligné GRI) au S2 2026", "Reporting mensuel et dashboard temps réel"])
s(b, "kpis", ["Portée cumulée : 500 K+ par mois — analytics des plateformes", "Abonnés : +30 % — analytics",
  "LinkedIn : engagement > 3,5 %, 15 leads qualifiés par mois — CRM et formulaires à mettre en place",
  "Vidéo : +100 K vues qualifiées, rétention > 40 %, abonnés +25 %", "TikTok : VTR > 40 %, +15 K abonnés",
  "TED PAK : 500+ inscrits par édition", "Transparence : sentiment > 80 % positif, réclamations -40 %", "RSE : 85 % de sentiment positif"])
s(b, "rtb", ["16 m de tirant d'eau", "N° 1 sur LinkedIn en Afrique centrale", "Phase 2 : quais spécialisés et portiques STS",
             "Huit partenaires installés dans la zone", "TrainForTrade, PASEK, unité de pêche : la RSE en actes"])
s(b, "campagne_source", "Le partenariat historique : cinq ans de collaboration, une stratégie initiale qui a fait du PAK la première marque "
  "LinkedIn d'Afrique centrale (p. 3). Benchmark : DP World — trade enabler, tech first, contenu humain, thought leadership du CEO, "
  "« People of DP World », transparence sur les joint-ventures et l'ESG (p. 9-10).")

# — brief-back —
s("briefback", "compris", "Le PAK n'a plus un problème de notoriété : il a un problème de preuve et de conversion. Il doit montrer ce que "
  "d'autres réussissent à Kribi, parler lui-même de ce qui fâche, et faire parler ses gens.", MI)
s("briefback", "couche", "categorie", MI + "La convention de la communication portuaire — visites, signatures, annonces — est ce que le plan veut quitter.")
s("briefback", "propose", "Le plan en cinq programmes, recalé à partir de novembre 2026, avec un ordre de démarrage : Kribi Connect et "
  "Innovation Lab d'abord (preuve), PAK Trust ensuite (après accord de la direction), TED PAK dès que le premier partenaire et le lieu sont confirmés.", MI)
s("briefback", "ecart", "Le plan prévoit un démarrage en juillet 2026 : nous proposons de recaler l'exercice et d'annoncer au PAK ce que "
  "trois mois de retard coûtent — un TED PAK et trois épisodes Kribi Connect à reprogrammer.", MI)

# — socle (lu depuis la plateforme) et stratégie —
s("socle", "positionnement", v.get("positionnement")); s("socle", "promesse", v.get("promesse"))
s("socle", "idee_directrice", v.get("idee_directrice")); s("socle", "ton", v.get("ton"))
s("strategie", "probleme_reel", "Le digital du PAK est perçu comme un outil de diffusion, pas comme un levier de croissance (p. 4) : on y "
  "annonce, on n'y prouve pas, et on n'y parle pas aux bonnes personnes.")
s("strategie", "opportunite", "Aucun port d'Afrique centrale n'a de communication RSE structurée (RSE, p. 2) ; la Phase 2 et la ZIP offrent une "
  "matière riche ; huit partenaires installés peuvent témoigner ; le leadership LinkedIn est acquis.")
s("strategie", "gardefous", ["Aucun contenu sur les défis sans validation de la direction", "Chaque chiffre sourcé et daté",
  "Pas de témoignage partenaire sans accord écrit", "Pas de prise de vue sans autorisation de sûreté"], MI)
s("strategie", "pointsEntree", ["Le choix d'un port d'escale pour une nouvelle ligne", "L'implantation d'une usine ou d'un entrepôt en Afrique centrale",
  "Le passage d'un conteneur bloqué sur la route Edéa–Kribi", "La recherche d'un emploi qualifié dans la région", "La journée de l'environnement, la fête nationale"], MI)
s("strategie", "a_garder", ["La régularité de publication (2-3 par semaine)", "La couverture des visites et signatures", "Le leadership LinkedIn"])
s("strategie", "a_adapter", ["Le storytelling : de l'annonce à la valeur ajoutée", "Le format : de la photo et du texte à la vidéo",
  "La cible : segmenter B2B, B2G et grand public", "Les employés : de spectateurs à ambassadeurs"])
s("strategie", "a_ecarter", ["Le « one size fits all »", "Facebook et X en simple relais automatique", "Le silence sur les routes d'accès"])

# — la big idea sur la table : celle de la recommandation —
s("bigidea", "idee", "Le PAK devient un média : il cesse d'annoncer et commence à prouver — par ses partenaires (Kribi Connect), ses "
  "données (Innovation Lab), ses experts (TED PAK), sa transparence (PAK Trust) et ses gens (Corporate Influencer Program).",
  "Lu dans l'objectif de Kribi Connect : « transformer le PAK en média qui met en lumière la réussite de ses partenaires » (p. 19).")
s("bigidea", "mecanique", "Cinq programmes à rendez-vous fixes — mensuel, mensuel, trimestriel, trimestriel, quotidien — et un contenu natif "
  "qui tient le fil ; un comité éditorial mensuel qui arbitre ; un achat média qui pousse les contenus générateurs de leads.")
s("bigidea", "rattachement", "Rattachée à l'ambition de la marque — créateur d'influence, de confiance et de business — et à sa promesse de partenaire de croissance.")
s("bigidea", "campagne", "Le PAK, la référence", "Le titre de clôture des documents : « Ensemble, faisons du PAK la référence ».")
s("bigidea", "signature", "Le port innovant qui connecte l'Afrique au monde", "La proposition de valeur unique (p. 13), à valider comme signature.")
s("bigidea", "ton_campagne", "Expert, visionnaire, humain")
s("bigidea", "criteres", ["Chaque contenu sert un des quatre piliers et une des trois cibles", "Chaque programme a son rendez-vous et ses KPIs",
  "La transparence est validée avant publication", "Un partenaire ou un employé parle plus souvent que l'institution"], MI)
s("bigidea", "interdits", ["L'annonce sans valeur ajoutée", "Le contenu généraliste sans cible", "Les chiffres non sourcés"], MI)
s("bigidea", "validite", "L'idée ne vaut que si le PAK accepte de parler de ses défis : sans PAK Trust, le média redevient une vitrine — "
  "et la menace n° 1 du SWOT reste sans réponse.", MI)
p["sections"]["bigidea"]["source"] = "Recommandation Matanga (stratégie digitale 2026) — ni arbitrée par le PAK, ni attribuée"

# — volets et livrables —
p["volets"] = [{"id": "V-kc", "nom": "Kribi Connect — mensuel", "supports": ["S-digital", "S-film916", "S-carrousel"], "marches": ["M-CM"]},
               {"id": "V-lab", "nom": "PAK Innovation Lab — mensuel", "supports": ["S-animatique", "S-infographie", "S-digital"], "marches": ["M-CM"]},
               {"id": "V-ted", "nom": "TED PAK — trimestriel", "supports": ["S-digital", "S-film916"], "marches": ["M-CM"]},
               {"id": "V-trust", "nom": "PAK Trust — transparence et solutions", "supports": ["S-infographie", "S-digital"], "marches": ["M-CM"]},
               {"id": "V-rse", "nom": "RSE et durabilité — 2 par semaine", "supports": ["S-post11", "S-infographie", "S-film916"], "marches": ["M-CM"]},
               {"id": "V-corpo", "nom": "Corporate et natif — quotidien", "supports": ["S-post11", "S-digital"], "marches": ["M-CM"]},
               {"id": "V-influence", "nom": "Corporate Influencer Program", "supports": ["S-digital"], "marches": ["M-CM"]},
               {"id": "V-ads", "nom": "Paid media", "supports": ["S-ads"], "marches": ["M-CM"]},
               {"id": "V-pilotage", "nom": "Pilotage et reporting", "supports": ["S-digital"], "marches": ["M-CM"]}]
MOIS = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06"]
FIN = {"2026-07": "31", "2026-08": "31", "2026-09": "30", "2026-10": "31", "2026-11": "30", "2026-12": "31",
       "2027-01": "31", "2027-02": "28", "2027-03": "31", "2027-04": "30", "2027-05": "31", "2027-06": "30"}
KC = ["Tractafric Equipment", "AGL (Africa Global Logistics)", "ACC Cacao", "CMA CGM", "Cimpor", "Cadyst", "Kridevco", "Kamlog",
      "Tractafric II", "AGL II", "ACC Cacao II", "CMA CGM II"]
LAB = ["Tech Focus", "Visite 360°", "Tech Focus", "Perf Report", "Tech Focus", "Visite 360°", "Tech Focus", "Perf Report",
       "Tech Focus", "Visite 360°", "Tech Focus", "Perf Report"]
ls = []
for i, (mo, part) in enumerate(zip(MOIS, KC)):
    ls.append(livrable(f"L-pak-kc-{i+1:02d}", f"Kribi Connect ép. {i+1:02d} — {part} : interview CEO 3 min, article, carrousel, reel, podcast",
                       "S-digital", "V-kc", "P-lydienne", mo + "-" + FIN[mo], nature="marque", src=S_RETRO + ", p. 4"))
for i, (mo, f) in enumerate(zip(MOIS, LAB)):
    ls.append(livrable(f"L-pak-lab-{i+1:02d}", f"Innovation Lab — Data Motion (statistiques du mois précédent) + {f}",
                       "S-animatique", "V-lab", "P-serge", mo + "-01", nature="marque", src=S_RETRO + ", p. 4"))
for i, (mo, t) in enumerate([("2026-09", "Logistique verte"), ("2026-12", "Corridor Edéa–Kribi"), ("2027-03", "Investir à Kribi"), ("2027-06", "Logistique verte II")]):
    ls.append(livrable(f"L-pak-ted-{i+1}", f"TED PAK Q{i+2} — « {t} » : talk hybride, live LinkedIn / YouTube, replay chapitré, extraits, quote cards",
                       "S-digital", "V-ted", "P-adeline", mo + "-" + FIN[mo], nature="marque", src=S_RETRO + ", p. 4"))
for i, mo in enumerate(["2026-09", "2026-12", "2027-03", "2027-06"]):
    ls.append(livrable(f"L-pak-trust-{i+1}", f"PAK Trust — Point Travaux trimestriel n° {i+1} (infographie ou vidéo d'avancement route et autoroute)",
                       "S-infographie", "V-trust", "P-lydienne", mo + "-" + FIN[mo], src=S_PAK + ", p. 21"))
ls += [
  livrable("L-pak-trust-faq", "PAK Trust — La FAQ du DG : réponses directes aux questions qui fâchent", "S-film916", "V-trust", "P-lydienne", None, src=S_PAK + ", p. 21"),
  livrable("L-pak-trust-dossier", "PAK Trust — Dossier preuve : mesures palliatives et de sécurité", "S-infographie", "V-trust", "P-lydienne", None, src=S_PAK + ", p. 21"),
  livrable("L-pak-rse-rapport", "Premier rapport RSE annuel, aligné GRI", "S-digital", "V-rse", "P-vanelle", "2026-12-31", src=S_RSE + ", p. 6"),
  livrable("L-pak-rse-co2-s1", "Bilan carbone S1 2026 (scopes 1 et 2) — infographie", "S-infographie", "V-rse", "P-lydienne", "2026-09-30", src=S_RSE + ", p. 8"),
  livrable("L-pak-rse-co2-s2", "Bilan carbone S2 — infographie", "S-infographie", "V-rse", "P-lydienne", "2027-03-31", src=S_RETRO + ", p. 4"),
  livrable("L-pak-rse-kribicom", "Série #KribiCommunauté — portraits PASEK, pêcheurs, école maritime (2 contenus RSE par semaine)", "S-post11", "V-rse", "P-lydienne", "2027-06-30", src=S_RSE + ", p. 7"),
  livrable("L-pak-rse-ecoport", "#EcoportKribi — série avant / après faune et flore côtières", "S-post11", "V-rse", "P-lydienne", None, src=S_RSE + ", p. 4"),
  livrable("L-pak-corpo", "Corporate et natif — ~195 posts d'actu et ~72 posts institutionnels (dates clés, recrutements, appels d'offres)", "S-post11", "V-corpo", "P-lydienne", "2027-06-30", src=S_RETRO + ", p. 3"),
  livrable("L-pak-tiktok", "Formats verticaux #PAK60s, #AskTheCaptain, #PortFacts — 3 à 5 par semaine", "S-film916", "V-corpo", "P-serge", "2027-06-30", src=S_PAK + ", p. 16"),
  livrable("L-pak-academy", "Corporate Influencer Program — LinkedIn Masterclass et shooting photo pro des 50 ambassadeurs", "S-digital", "V-influence", "P-vanelle", None, src=S_PAK + ", p. 23"),
  livrable("L-pak-socialkit", "Social Kit des ambassadeurs — banque d'images et gabarits de posts", "S-digital", "V-influence", "P-william", None, src=S_PAK + ", p. 23"),
  livrable("L-pak-externes", "Sélection des 5 ambassadeurs externes de prestige", "S-digital", "V-influence", "P-derick", None, src=S_PAK + ", p. 23"),
  livrable("L-pak-charte-kc", "Charte graphique et éditoriale Kribi Connect", "S-digital", "V-kc", "P-william", "2026-06-30", src=S_RETRO + ", p. 5"),
  livrable("L-pak-ads", "Paid media — 18 campagnes LinkedIn et Meta Ads (lancement, B2B armateurs, investisseurs ZIP, leads Phase 2, RSE, TED)", "S-ads", "V-ads", "P-lydienne", "2027-06-30", nature="activation", src=S_RETRO + ", p. 4"),
  livrable("L-pak-reporting", "Reporting mensuel à J+5 et dashboard temps réel", "S-digital", "V-pilotage", "P-vanelle", "2027-06-30", src=S_RETRO + ", p. 19"),
]
p["livrables"] = ls
p["releve"] = {"source": S_PAK + " · " + S_RETRO + " · " + S_RSE, "annonce": "~603 contenus sur douze mois",
               "note": "Le compte de 603 contenus n'est pas éclaté en lignes : les livrables tracés sont les programmes et les épisodes nommés."}

# — insights, territoires —
def insight(i, couche, longue, sit, ten, emp, phrase, sources, test, x=""):
    return {"id": i, "couche": couche, "passes": {"longue": longue, "temps": {"situation": sit, "tension": ten, "empeche": emp}, "phrase": phrase},
            "sources": sources, "test": test, "auteur": None, "ecrit_le": QUAND,
            "infere": {"pourquoi": "Proposé pour le cadrage à partir des documents reçus. Le test en trois questions se rejoue en équipe." + (" " + x if x else ""), "quand": QUAND, "par": PAR}}
p["insights"] = [
  insight("IN-pak-1", "categorie",
    "Les ports africains communiquent tous de la même façon : visites officielles, signatures, premières pierres. Un armateur qui "
    "compare Kribi à Lomé ou Pointe-Noire voit les mêmes photos de poignées de main — et rien de ce qui l'intéresse : délais, "
    "équipements, partenaires qui réussissent.",
    "La communication portuaire est une communication d'annonces.", "Les décideurs veulent des preuves, pas des cérémonies.",
    "Le port le plus moderne se raconte comme les autres et ne se distingue pas.",
    "Les ports s'annoncent tous ; aucun ne prouve.",
    [{"type": "publique", "quoi": "Audit 2024-2025 : storytelling axé « annonce » vs « valeur ajoutée », 85 % de contenus institutionnels (p. 7)"},
     {"type": "publique", "quoi": "Benchmark DP World : communication sur l'impact économique et la technologie, pas les infrastructures seules (p. 9)"},
     {"type": "publique", "quoi": "SWOT : faiblesse « one size fits all », peu de ciblage B2B (p. 8)"}],
    {"contredit": True, "gene": True, "ouvre": True}),
  insight("IN-pak-2", "consommateur",
    "Un directeur supply chain qui hésite entre deux ports appelle un confrère avant de lire une brochure. Ce qui le décide, c'est "
    "qu'un autre logisticien comme lui ait choisi Kribi et en parle — avec ses chiffres et ses problèmes.",
    "Le décideur B2B choisit un port sur recommandation.", "L'institution parle d'elle-même ; ses partenaires, eux, se taisent.",
    "La meilleure preuve du port — ceux qui y réussissent — reste invisible.",
    "Un armateur ne croit pas une brochure : il croit un autre armateur.",
    [{"type": "publique", "quoi": "Kribi Connect : « Pourquoi Kribi ? » expliqué par le dirigeant partenaire (p. 19)"},
     {"type": "publique", "quoi": "Benchmark DP World : la transparence sur les projets communs rassure les investisseurs (p. 10)"},
     {"type": "terrain", "quoi": "Les huit partenaires installés listés au rétroplanning : à interroger avant la séance"}],
    {"contredit": True, "gene": True, "ouvre": True}),
  insight("IN-pak-3", "entreprise",
    "Tout le monde à Douala connaît l'état de la route Edéa–Kribi ; le port n'en parle pas. Ce silence fait plus de dégâts que la "
    "route elle-même : la rumeur remplit le vide, et chaque post de visite officielle se lit comme du déni.",
    "La route d'accès est le sujet que tout le monde a en tête.", "Le port communique sur tout, sauf sur ce qui inquiète.",
    "Tant que le PAK se tait, sa parole sur le reste perd en crédibilité.",
    "Le silence sur la route coûte plus cher que la route.",
    [{"type": "publique", "quoi": "SWOT : menace n° 1, perception négative des routes d'accès (p. 8)"},
     {"type": "publique", "quoi": "PAK Trust : « au lieu de laisser le vide s'installer » (p. 21)"},
     {"type": "publique", "quoi": "Rétroplanning : TED PAK Q3 « Corridor Edéa : solutions et avenir » (p. 4)"}],
    {"contredit": True, "gene": True, "ouvre": True},
    "Couche entreprise : elle commande une décision de la direction du PAK avant d'être une idée de communication."),
  insight("IN-pak-4", "culture",
    "Pour les jeunes de Kribi et du Sud, le port est à la fois une promesse d'emploi et une transformation de leur ville et de leur "
    "littoral. Ils en sont fiers, et ils se demandent ce qu'il leur laisse — aux pêcheurs, à la mangrove, aux riverains.",
    "Le port transforme la ville et le littoral.", "La fierté locale coexiste avec la crainte d'être les impactés, pas les bénéficiaires.",
    "Sans preuves concrètes, la licence sociale d'exploitation s'use.",
    "À Kribi, on est fier du port — et on veut savoir ce qu'il nous laisse.",
    [{"type": "publique", "quoi": "RSE : licence sociale d'exploitation, pêcheurs, populations pygmées et côtières (p. 2)"},
     {"type": "publique", "quoi": "RSE : don de l'unité de pêche, école maritime riveraine, formation des pêcheurs (p. 5)"},
     {"type": "terrain", "quoi": "La parole des riverains : à recueillir avant de la raconter"}],
    {"contredit": True, "gene": False, "ouvre": True}),
]
p["territoires"] = [
  {"id": "TR-pak-1", "nom": "La preuve par les autres", "insightId": "IN-pak-2", "ecole": None,
   "quoi": "Les partenaires, les employés et les experts parlent à la place de l'institution : Kribi Connect, TED PAK, ambassadeurs."},
  {"id": "TR-pak-2", "nom": "Le port qui dit les choses", "insightId": "IN-pak-3", "ecole": None,
   "quoi": "La transparence comme preuve de fiabilité : routes, travaux, chiffres — le PAK prend les devants."},
  {"id": "TR-pak-3", "nom": "Le port qui laisse quelque chose", "insightId": "IN-pak-4", "ecole": None,
   "quoi": "La RSE racontée par ceux qui en bénéficient : pêcheurs, riverains, jeunes formés, mangrove protégée."},
]
for t in p["territoires"]:
    t.update({"convention": None, "reduction": None, "cree_le": QUAND,
              "infere": {"pourquoi": "Ouvert à partir de son insight pour le cadrage.", "quand": QUAND, "par": PAR}})

# — moodboard, pièces, documents, préparation —
p["sections"]["socle"]["moodboard"] = [
  {"id": "MB-pak-1", "role": "reference", "vignette": V + "pak26-strategie-benchmark-dpworld.jpg", "legende": "Le benchmark DP World : storytelling, innovation, multiformat", "source": S_PAK + ", p. 9", "quand": QUAND},
  {"id": "MB-pak-2", "role": "reference", "vignette": V + "pak26-strategie-kribi-connect.jpg", "legende": "Kribi Connect : le PAK devient un média", "source": S_PAK + ", p. 19", "quand": QUAND},
  {"id": "MB-pak-3", "role": "reference", "vignette": V + "pak26-strategie-ted-pak.jpg", "legende": "TED PAK : le thought leadership trimestriel", "source": S_PAK + ", p. 22", "quand": QUAND},
  {"id": "MB-pak-4", "role": "reference", "vignette": V + "pak26-strategie-tiktok.jpg", "legende": "TikTok et Reels : #PAK60s, #AskTheCaptain, #PortFacts", "source": S_PAK + ", p. 16", "quand": QUAND},
  {"id": "MB-pak-5", "role": "reference", "vignette": V + "pak26-rse-couverture.jpg", "legende": "RSE et développement durable : du port à la communauté", "source": S_RSE + ", p. 1", "quand": QUAND},
]
p["piecesBrief"] = [{"id": "PB-pak-" + k, "nom": n, "vignette": V + f, "source": src, "quand": QUAND} for k, n, f, src in [
  ("defis", "Les défis actuels", "pak26-strategie-defis.jpg", S_PAK + ", p. 4"),
  ("audit", "L'audit de la présence digitale", "pak26-strategie-audit.jpg", S_PAK + ", p. 7"),
  ("swot", "Le SWOT", "pak26-strategie-swot.jpg", S_PAK + ", p. 8"),
  ("piliers", "Les quatre piliers stratégiques", "pak26-strategie-quatre-piliers.jpg", S_PAK + ", p. 12"),
  ("ciblage", "Segmentation et proposition de valeur", "pak26-strategie-ciblage.jpg", S_PAK + ", p. 13"),
  ("linkedin", "Stratégie LinkedIn", "pak26-strategie-linkedin.jpg", S_PAK + ", p. 14"),
  ("video", "Stratégie vidéo et YouTube", "pak26-strategie-video-youtube.jpg", S_PAK + ", p. 15"),
  ("social", "Social temps réel", "pak26-strategie-social-temps-reel.jpg", S_PAK + ", p. 17"),
  ("playbook", "Playbook éditorial 2026", "pak26-strategie-playbook.jpg", S_PAK + ", p. 18"),
  ("lab", "PAK Innovation Lab", "pak26-strategie-innovation-lab.jpg", S_PAK + ", p. 20"),
  ("trust", "Transparence et solutions — PAK Trust", "pak26-strategie-transparence.jpg", S_PAK + ", p. 21"),
  ("influence", "Corporate Influencer Program", "pak26-strategie-influencer-program.jpg", S_PAK + ", p. 23"),
  ("gouv", "Organisation et responsabilités", "pak26-strategie-gouvernance.jpg", S_PAK + ", p. 24"),
  ("workflow", "Processus de collaboration", "pak26-strategie-workflow.jpg", S_PAK + ", p. 25"),
  ("archi", "Architecture éditoriale 2026-2027", "pak26-retroplanning-architecture.jpg", S_RETRO + ", p. 2"),
  ("volumes", "Volumes et répartition par plateforme", "pak26-retroplanning-volumes.jpg", S_RETRO + ", p. 3"),
  ("macro", "Calendrier macro", "pak26-retroplanning-macro-calendrier.jpg", S_RETRO + ", p. 4"),
  ("juillet", "Fiche mensuelle type — juillet 2026", "pak26-retroplanning-juillet-2026.jpg", S_RETRO + ", p. 5"),
  ("charge", "Charge de production mensuelle", "pak26-retroplanning-charge.jpg", S_RETRO + ", p. 18"),
  ("kpis", "KPIs globaux", "pak26-retroplanning-kpis.jpg", S_RETRO + ", p. 20"),
  ("rse-enjeux", "Pourquoi la RSE est stratégique", "pak26-rse-enjeux.jpg", S_RSE + ", p. 2"),
  ("rse-piliers", "Les quatre piliers RSE", "pak26-rse-piliers.jpg", S_RSE + ", p. 3"),
  ("rse-playbook", "Plan de contenu RSE", "pak26-rse-playbook.jpg", S_RSE + ", p. 7"),
  ("rse-cal", "Calendrier RSE mai → décembre 2026", "pak26-rse-calendrier.jpg", S_RSE + ", p. 8")]]
p["documentsRecus"] = [
  {"nom": "DIGITAL PAK 2026 by MATANGA.pdf", "type": "recommandation stratégique, 28 pages", "date": "fin 2025 (audit jan. 2024 → oct. 2025)",
   "tire": "Contexte, audit, SWOT, benchmark DP World, vision, piliers, ciblage, plateformes, programmes, influence, gouvernance — au cadrage et à la plateforme ; 20 planches en pièces. Budget lu, non recopié."},
  {"nom": "RETROPLANNING PAK.pdf", "type": "plan de contenu, 21 pages", "date": "2026",
   "tire": "Architecture, volumes, calendrier macro, douze fiches mensuelles, charge, workflow, KPIs — au calendrier et aux livrables. Deux fiches octobre et novembre en double, à faire corriger."},
  {"nom": "RSE STRAT.pdf", "type": "stratégie RSE, 9 pages", "date": "2026",
   "tire": "Quatre piliers RSE, actions en cours, cadre ISO 26000 / ODD / GRI, plan et calendrier de contenu — au cadrage, aux preuves de la marque et aux livrables RSE."},
]
p["preparation"] = {
  "objectif": "Recaler l'exercice à partir de novembre 2026 et sortir de la séance avec l'ordre de démarrage des programmes, les douze "
              "partenaires Kribi Connect à solliciter et la position à proposer au PAK sur la transparence.",
  "question": "Comment le PAK passe-t-il de la marque qu'on suit à la marque qu'on croit ?",
  "a_trancher": ["Le recalage : on décale tout de quatre mois, ou on resserre l'exercice sur juin 2027 ?",
                 "PAK Trust : qui, à la direction du PAK, accepte de parler des routes — et jusqu'où ?",
                 "Le premier TED PAK : quel thème, quel lieu, quelle date réaliste ?",
                 "L'équipe : qui produit la vidéo premium chaque mois, et le renfort des mois de TED ?",
                 "Le tracking des leads : quel formulaire, quel CRM, côté PAK ?"],
  "amorces": ["Et si chaque épisode Kribi Connect commençait par le trajet d'un conteneur ?", "Et si le DG répondait lui-même, en 60 secondes, à la question la plus posée du mois ?",
              "Et si le Point Travaux était filmé depuis la route, pas depuis le bureau ?", "Et si un pêcheur de Lokoundjé ouvrait le rapport RSE ?"],
  "directions": ["La preuve par les autres — Kribi Connect, TED PAK, ambassadeurs", "Le port qui dit les choses — PAK Trust",
                 "Le port qui laisse quelque chose — la RSE racontée par ses bénéficiaires"],
  "interdits": ["Publier sur les routes sans validation", "Un chiffre sans source", "Un témoignage sans accord écrit"],
  "materiel": ["La stratégie digitale 2026 (planches 4, 8, 12, 13, 19-23)", "Le calendrier macro du rétroplanning", "Les quatre piliers RSE", "La liste des huit partenaires installés"],
  "deroule": ["10 min — où en est le PAK au 5 octobre, par Derick", "15 min — le recalage du calendrier", "20 min — PAK Trust : jusqu'où aller",
              "15 min — Kribi Connect : les douze premiers partenaires et l'angle de chaque épisode", "10 min — les questions pour le PAK"],
  "notes": "Aucun brief écrit du PAK au dossier : tout part de la recommandation Matanga. Les noms des interlocuteurs du PAK sont à obtenir.",
  "infere": {"pourquoi": "Préparée à partir des trois documents et des insights du dossier. À relire avant la séance.", "quand": QUAND, "par": PAR}}
p.setdefault("inferences", {}).update(INF)
trace("dossier reçu", "Port Autonome de Kribi : 3 documents · " + str(len(ls)) + " livrables · 4 insights · 3 territoires · préparation", "projets", p["id"], ["MQ-pak"])

# ═══════════════════════════════════════════════════════════════════════════════════════════
#  II. LE SPOT LA PASTA GOLD
# ═══════════════════════════════════════════════════════════════════════════════════════════
S_SB = "« LA PASTA GOLD STORYBOARD OK » (storyboard de présentation)"
S_MB = "« MOTION BRIEF LA PASTA GOLD » (29/09/2026)"
S_CEL = "« La Pasta Gold Proposition Célébrités OK »"
S_TEN = "« TENUES SPOT LA PASTA » (direction stylistique)"
S_CHR = "« CHRONOGRAMME LA PASTA GOLD (DÉFINITIF) »"
S_PRO = "« FACTURE PROFORMA SPOT LA PASTA » (10/09/2026)"

g = marques["MQ-pz-gold"]
gv = g.setdefault("vault", {})
if not g.get("couleurs"):
    g["couleurs"] = [{"hex": "#2E1B0F", "nom": "Brun profond", "usage": "fonds sombres, cartons, packshot final"},
                     {"hex": "#4A2E1B", "nom": "Brun", "usage": "texte principal, éléments structurants"},
                     {"hex": "#B8860B", "nom": "Or principal", "usage": "lingots, liserés, logo, signature"},
                     {"hex": "#D9AE55", "nom": "Or clair", "usage": "reflets, dégradés, accents lumineux"},
                     {"hex": "#FFFFFF", "nom": "Blanc", "usage": "respiration, texte sur fond sombre"}]
    g.setdefault("historique", []).append({"quand": QUAND, "champ": "couleurs", "avant": [], "apres": "5 couleurs",
                                           "motif": "Palette du motion brief du spot (29/09/2026), « sous réserve d'une charte interne »."})
gv.setdefault("sources", {})["promesse"] = gv.get("sources", {}).get("promesse") or S_SB
ajouter_liste(gv, "dialecte", ["La Pasta Gold, de l'or en pâtes", "Des pâtes pour des moments privilégiés", "Quand l'or devient pâtes"],
              "ajouté depuis une source : " + S_SB + " et " + S_MB)
ajouter_liste(gv, "symboles", ["L'or : lingots, coffre-fort, reflets et poudre d'or (spot 2026)", "La touche dorée par petites touches : un bouton, un bijou, un accessoire"],
              "ajouté depuis une source : " + S_MB + " et " + S_TEN)
ajouter_liste(gv, "preuves", ["Une qualité qui résiste à l'examen le plus rigoureux — la démonstration du spot 2026"],
              "ajouté depuis une source : " + S_SB + ", p. 2")
ecrire_vault(gv, "fautes", ["Le storyboard 2026 cite « NSIA Assurance » comme valideur et « 2 actrices et 15 figurantes » : restes d'un autre dossier, corrigés avant envoi"],
             "Relevé dans le storyboard : à ne pas laisser repartir chez le client.")
ecrire_vault(gv, "cible", "Marque premium, familiale et urbaine — CSP A, B+ et B.", None, recu=True, source=S_CEL + ", p. 1-2")
trace("plateforme de marque", "Gold : palette reçue, vocabulaire, symboles et preuves complétés (révisions gardées), cible reçue", "marques", "MQ-pz-gold", ["MQ-pz-gold"])

camp_lpg = "CMP-mq-pz-gold-spot-2026"
campagne({"id": camp_lpg, "nom": "La Pasta Gold — De l'or en pâtes 2026", "clientId": "C-panzani", "marqueIds": ["MQ-pz-gold"],
          "regime": "ponctuelle", "occasion": "institutionnel", "fenetre": {"debut": "2026-10-15", "fin": "2027-01-07",
          "infere": "Début à la livraison des masters (15/10) ; fin après les fêtes, temps fort de Gold — à confirmer avec le plan média."},
          "marches": ["M-CM"], "bilan": "", "ecartes": {}, "cree_le": QUAND, "source": S_SB,
          "couverture": {"type": "kv", "vignette": V + "lpg26-scene-08-packshot.jpg", "motif": "Le packshot de fin du storyboard : « La Pasta Gold, de l'or en pâtes »."},
          "pieces": [{"type": "planche", "statut": "scène 01 — l'or", "vignette": V + "lpg26-scene-01-or.jpg", "source": S_SB + ", p. 6"},
                     {"type": "planche", "statut": "scène 05 — l'expertise", "vignette": V + "lpg26-scene-05-expertise.jpg", "source": S_SB + ", p. 10"}],
          "infere": {"pourquoi": "Un film de marque pour la gamme premium, hors temps fort du calendrier : rangé en prise de parole de marque. "
                                 "La fenêtre de diffusion n'est donnée par aucun document.", "quand": QUAND}})

q = projet_neuf({"id": "PRJ-LPG-SPOT", "ref": "MT-0052", "nom": "La Pasta Gold — spot TV « De l'or en pâtes » (2026)",
    "gabarit": "film", "nature": "film", "cree_le": QUAND, "statut": "cadrage", "campagneId": camp_lpg, "structure": "matanga",
    "structureSource": {"source": "document", "motif": "Chronogramme « Matanga Agency » ; la proforma du producteur est adressée à Matanga Agency.", "quand": QUAND},
    "equipe": [{"personne": "P-alex", "poste": "creation"}, {"personne": "P-william", "poste": "graphic"},
               {"personne": "P-serge", "poste": "motion"}, {"personne": "P-derick", "poste": "clientele"}, {"personne": "P-claude", "poste": "redacteur"}],
    "sections": {"identite": {}, "brief": {}, "briefback": {}, "socle": {}, "strategie": {}, "bigidea": {}, "pistes": []},
    "idees": [], "fils": [], "volets": [], "livrables": [], "notes": [], "insights": [], "territoires": [],
    "perimetre": {"supports": ["S-tv", "S-film916", "S-carre", "S-digital"], "marches": ["M-CM"]},
    "couverture": {"type": "kv", "vignette": V + "lpg26-scene-08-packshot.jpg", "motif": "Packshot de fin du storyboard."},
    "factures": ["FAC-lpg26-proforma"],
    "historiqueCampagne": [{"quand": QUAND, "qui": PAR, "avant": None, "apres": camp_lpg, "motif": "Rattaché à l'import."}]})
if not any(f["id"] == "FAC-lpg26-proforma" for f in d["factures"]):
    d["factures"].append({"id": "FAC-lpg26-proforma", "emetteur": "fournisseur", "type": "proforma", "versions": ["proforma"], "numero": None,
        "date": "10 Septembre 2026", "client": "Matanga Agency", "objet": "Spot publicitaire « La Pasta Gold » — nouveau casting de personnalités",
        "fichiers": [DL + "FACURE PROFORMA SPOT LA PASTA.pdf"], "releve_le": QUAND, "projetId": "PRJ-LPG-SPOT",
        "note": "Proforma du producteur à Matanga (« DOIT : MATANGA AGENCY »). Montants non recopiés au dépôt."})

INF = {}
s = setter(q, INF)
MQ = "Inféré des documents de production du spot. "

s("identite", "client", "Panzani Cameroun (Cadyst Group)"); s("identite", "marque", "La Pasta Gold")
s("identite", "clientId", "C-panzani"); s("identite", "marqueIds", ["MQ-pz-gold"]); s("identite", "marches", ["M-CM"])
s("identite", "type", "Spot TV 30 s et 50 s, et 4 clips digitaux — remake du scénario de 2018 avec un nouveau casting de personnalités",
  MQ + "La proforma parle de « reprise et adaptation du scénario 2018 avec nouveaux talents ».")
s("identite", "objectif", "Prouver la qualité supérieure de La Pasta Gold — une qualité qui résiste à l'examen le plus rigoureux — et "
  "l'installer comme la pâte des moments privilégiés.")
s("identite", "debut", "2026-09-25"); s("identite", "echeance", "2026-10-15")
s("identite", "fenetre", "Production du 25 septembre au 15 octobre 2026 (chronogramme) ; tournage en une journée, le 6 octobre au tableau, "
  "le 8 octobre dans la note de bas de page — à trancher. Diffusion : non donnée.", MQ + "Les deux dates de tournage sont dans le même document.")
s("identite", "budget", None)
s("identite", "budgetNote", "Proforma du producteur au dossier (10/09/2026) : pré-production, équipe technique, cachets, décor, matériel. Montants non recopiés.")
s("identite", "decideur", "Le marketing de Panzani Cameroun (Cadyst) — validation du concept, puis du « go tournage » le 4 octobre et du premier montage",
  MQ + "Le chronogramme nomme « Client » aux trois validations ; aucun nom.")
s("identite", "tueur", "La direction de Cadyst : un cadre du groupe figure au casting des couples d'influenceurs — le film passe sous ses yeux.",
  MQ + "La proposition de célébrités cite « Nicolas Lehoucq — Cadyst Group ».")
s("identite", "circuit", "Validation du concept (storyboard) → contrats talents (29-30/09) → essayages (3/10) → go tournage client (4/10) → "
  "tournage (6/10) → premier montage → validation client (12-16/10 au tableau) → corrections (13/10) → export et livraison (14-15/10).")
s("identite", "mesure", ["Mémorisation de la signature « de l'or en pâtes » — post-test à convenir avec Panzani",
  "Vues, complétion et partages des 4 clips — statistiques des plateformes", "Ventes de Gold sur la période de diffusion — données Panzani"],
  MQ + "Aucun KPI n'est donné par les documents.")
s("identite", "pilier", "D", MQ + "Un film de preuve qui installe un territoire — l'or — propre à la marque : pilier Distinction.")

b = "brief"
s(b, "porteur", "P-derick", MQ + "Aucun émetteur nommé ; le compte relève de la direction clientèle.")
s(b, "verbatim", "« La Pasta Gold est la gamme premium de la marque de pâtes alimentaires La Pasta, positionnée sur le marché camerounais avec "
  "une communication portée par des personnalités influentes. Ce spot publicitaire, tourné dans un restaurant haut de gamme, met en scène "
  "un négociant en or (le Trader) qui applique à un plat de pâtes la même rigueur d'expertise qu'il réserve habituellement à l'or. » "
  "(Motion brief, 29/09/2026, § 01.)")
s(b, "campagne_source", "Le spot de 2018, dont le scénario est repris et adapté avec de nouveaux talents (proforma). Les « anciens » "
  "talents sont cités page à page dans la proposition de célébrités, face aux « nouveaux ».")
s(b, "probleme", "Gold doit tenir son rang de premium face aux pâtes importées : le prix ne suffit pas à le prouver. Il faut une preuve de "
  "qualité crédible, que le public camerounais retienne — et un casting qui renouvelle celui de 2018.",
  MQ + "Lu dans la plateforme de Gold (« reprendre le premium des imports ») et dans la proforma (nouveau casting).")
s(b, "objectif_business", "Soutenir la montée en gamme et les ventes de Gold, surtout aux grands jours de fin d'année.", MQ)
s(b, "objectif_com", "Associer La Pasta Gold à l'or — valeur, rareté, expertise — et faire mémoriser « de l'or en pâtes ».")
s(b, "strategie_client", "Une communication premium portée par des personnalités influentes (motion brief) ; marque premium, familiale et "
  "urbaine pour les CSP A, B+ et B (proposition de célébrités).")
s(b, "jtbd", "Amener la maman des grands jours et l'hôte qui reçoit à choisir La Pasta Gold plutôt qu'une pâte importée pour la table "
  "qui compte — parce qu'une pâte camerounaise peut, elle aussi, passer l'examen le plus exigeant.", MQ)
s(b, "comportement_actuel", "« Pour recevoir, je prends des pâtes importées : c'est plus sûr. Gold, c'est bien, mais est-ce vraiment au niveau ? »", MQ)
s(b, "comportement_vise", "« Gold, c'est de l'or en pâtes : même un expert n'y trouve rien à redire. C'est elle que je sers quand je reçois. »", MQ)
s(b, "cible", "CSP A, B+ et B, urbaines, familiales : la maman des grands jours, l'hôte qui reçoit, le Douala qui sort au restaurant. "
  "Tension : elles veulent le meilleur pour leur table, et doutent qu'une pâte locale soit au niveau d'une importée.")
s(b, "insight", "Pour une table qui reçoit, on ne prend pas de risque : on choisit ce qui a fait ses preuves. Personne ne veut être "
  "l'hôte qui a servi « des pâtes ordinaires ».", MQ + "Détaillé dans les insights du dossier.")
s(b, "promesse", "Une qualité qui résiste à l'examen le plus rigoureux — de l'or en pâtes.")
s(b, "message_cle", "La Pasta Gold est une pâte dont la qualité supérieure résiste à l'examen le plus rigoureux. Un produit qui n'a rien à cacher.")
s(b, "hierarchie_messages", ["L'invitation (0-6 s) : un coffre-fort, des lingots — le prestige", "La magie (6-20 s) : les lingots se transforment en pâtes ; le chef sert",
  "L'expertise (20-38 s) : le trader examine à la loupe et valide", "La promesse (38-45 s) : une qualité qui résiste à l'examen le plus rigoureux",
  "L'appel (45-50 s) : La Pasta Gold, des pâtes pour des moments privilégiés — « de l'or en pâtes »"])
s(b, "ctas", ["La Pasta Gold, de l'or en pâtes", "Des pâtes pour des moments privilégiés"])
s(b, "calendrier", ["25/09 — mise à disposition des fonds", "26-28/09 — négociation avec les acteurs ; styliste et validation des costumes",
  "28-29/09 — repérage et validation du restaurant (le tableau écrit 28-29/10 : coquille probable)", "29-30/09 — contrats des acteurs",
  "30/09 — repérage avec la décoratrice", "30/09-2/10 — confection des costumes ; décor « Gold » et matériel du trader",
  "1-2/10 — casting des figurants", "2/10 — kick-off acteurs et influenceurs", "3/10 — essayages, repérage technique, plan de travail",
  "4/10 — préparation technique ; validation finale client (go tournage)", "5/10 — mise en place, produits livrés au restaurant",
  "6/10 — tournage de toutes les séquences (la note dit 8/10, plus un jour tampon)", "7-10/10 — dérushage, premier montage, motion design",
  "11/10 — étalonnage, voix off ; 11-12/10 — sound design et mixage", "12/10 — validation du premier montage (le tableau étire jusqu'au 16/10)",
  "13/10 — corrections", "14/10 — export des formats", "15/10 — livraison finale"])
s(b, "canaux", ["TV — spot 30 s et 50 s, 1920×1080, 25 i/s (norme TV Cameroun), H.264", "TikTok et Stories — C-01 « Le verdict de l'or », 9:16",
  "Instagram et Facebook — C-02 « De l'or… à l'assiette », 1:1", "Stories et Reels — C-03 « Le sourire qui valide tout », 16:9, 15 s max",
  "Instagram — clip packshot « La Pasta Gold… de l'or en pâtes », 1:1"])
s(b, "risques", ["Deux dates de tournage dans le chronogramme (6 et 8 octobre)", "Durée du spot long : 50 s au storyboard, 60 s au motion brief",
  "Le storyboard cite « NSIA Assurance » comme valideur et « 2 actrices, 15 figurantes » : restes d'un autre dossier à corriger avant tout envoi",
  "Repérage du restaurant daté du 28-29/10 au chronogramme, après la livraison", "Un cadre de Cadyst au casting : son image engage le groupe",
  "Les séquences or → pâtes en motion doivent raccorder avec les gros plans réels de pâtes", "Calendrier serré : quatre jours de post-production avant validation"])
s(b, "droits_usage", ["Invité spécial : cachet, rôle, création de contenus sur 6 mois, affichage tous supports",
  "Influenceuse : rôle, contenus sur 6 mois, shooting photo, affichage multi-supports", "Autres influenceurs : rôle seulement — pas de contenus ni d'affichage sans avenant",
  "Cuisinier : rôle, contenus 6 mois, shooting, affichage — sans cachet à la proforma (à confirmer)", "Figurants : présence en arrière-plan, autorisations de droit à l'image à faire signer",
  "Musique et voix off : droits à préciser — aucun document n'en parle", "Photos de plateau et making-of : pour la communication digitale"],
  MQ + "Lu dans les intitulés de cachets de la proforma ; aucun contrat n'est au dossier.")
s(b, "casting", ["Le Trader, invité spécial : Blaise Option (nouveau) — acteur apprécié, très naturel, chef d'entreprise dans ses séries ; partenariat long terme possible",
  "Le Chef : Sir Pierre Mbengue (nouveau) — chef reconnu pour sa créativité et ses contenus viraux",
  "Couple d'influenceurs 01 : Princesse Issie (nouvelle) — glamour et populaire ; Nicolas Lehoucq (Cadyst Group)",
  "Couple d'influenceurs 02 : Eshu « Mr Mbarga » (nouveau) — image de père de famille ; Chelsy Suzy (nouvelle) — image familiale",
  "Figurants : une dizaine de clients du restaurant, sans réplique",
  "Grille de sélection : adéquation à l'image premium, capital sympathie auprès des familles, pouvoir d'influence sur les CSP A, B+, B"])
s(b, "production", ["Lieu : restaurant premium de Douala, privatisé une journée ; décor « Gold » — motifs or, nappage, vaisselle premium",
  "Accessoires du trader : loupe de joaillier, source lumineuse compacte, pince de précision",
  "Équipe : réalisateur, directeur photo, cadreur, ingénieur son et perchman, électricien, machiniste, régisseur, maquilleuse, styliste, photographe de plateau",
  "Stylisme : marron, or et blanc ; matières nobles ; la touche or par petites touches. Chef : veste blanc cassé col mao, boutons dorés. Trader : costume trois pièces noir, revers brodés or, nœud papillon et broche dorée",
  "Motion design : séquence 1 coffre-fort et lingots (4-5 s), séquence 2 transformation or → pâtes (6-8 s), séquence 8 packshot (4-5 s), clip packshot 100 % motion pour les réseaux",
  "Charte motion : #2E1B0F, #4A2E1B, #B8860B, #D9AE55, #FFFFFF ; titres Cambria ou Georgia en capitales, textes Arial ou Helvetica ; mouvements feutrés, registre joaillerie et spiritueux premium",
  "Post-production : montage, motion, étalonnage, voix off, sound design et mixage"])
s(b, "contraintes", "Une journée de tournage ; 25 i/s ; logo La Pasta toujours visible sur les clips ; safe zone texte 15 % en haut et en bas ; "
  "packagings HD et logo vectoriel fournis par le client ; aucune typographie fantaisie.")
s(b, "ton", "Élégant, feutré, avec une pointe d'humour british dans le sérieux exagéré de l'expertise. Jamais caricatural.")
s(b, "mandatories", ["La signature : « La Pasta Gold, de l'or en pâtes »", "Les deux produits de la gamme au packshot", "Le logo La Pasta toujours visible sur les clips",
  "Une version avec l'incrustation de M. Massimo (scène 06, demandé au storyboard)"])
s(b, "livrables_attendus", ["Spot TV 30 s", "Spot TV 50 s", "4 clips digitaux (C-01 à C-04)", "Photos de plateau et making-of"])
s(b, "kpis", ["Mémorisation de la signature — post-test", "Vues et complétion des clips — plateformes", "Ventes Gold sur la période — Panzani"], MQ)
s(b, "rtb", ["Semoule Premium Quality (plateforme Gold)", "La validation d'un expert de l'or, à l'écran", "La gamme premium de la première marque de pâtes du Cameroun"],
  MQ + "La première vient de la plateforme ; les deux autres du film et de la plateforme La Pasta.")

s("briefback", "compris", "Le film ne vend pas des pâtes dorées : il fait passer à Gold l'examen le plus exigeant qui soit — celui d'un "
  "négociant en or — et le sourire de l'expert devient la preuve.", MQ)
s("briefback", "couche", "consommateur", MQ + "La peur de servir « ordinaire » à ses invités commande le message et le ton.")
s("briefback", "propose", "Le storyboard en 30 s et 50 s, les quatre clips, et une version avec l'incrustation de M. Massimo.", MQ)
s("briefback", "ecart", "Avant tout envoi : retirer du storyboard les mentions d'un autre dossier (NSIA, actrices), trancher la date de "
  "tournage et la durée du spot long (50 ou 60 s).", MQ)

s("socle", "positionnement", gv.get("positionnement")); s("socle", "promesse", gv.get("promesse"))
s("socle", "idee_directrice", gv.get("idee_directrice")); s("socle", "ton", gv.get("ton"))
s("strategie", "probleme_reel", "Le premium se prouve, il ne se proclame pas : il faut une démonstration que le public camerounais trouve à la fois crédible et plaisante.", MQ)
s("strategie", "opportunite", "L'or est déjà dans le nom et le packaging de Gold : la marque peut posséder la métaphore entière — valeur, expertise, rareté.", MQ)
s("strategie", "gardefous", ["L'humour reste dans le sérieux de l'expertise, jamais dans la caricature", "Le produit reste le héros du packshot",
  "La touche or par petites touches, jamais en surenchère"])

s("bigidea", "idee", "Et si l'or devenait la métaphore de la qualité de La Pasta Gold ? Un négociant en or applique à un plat de pâtes la "
  "rigueur qu'il réserve à l'or ; sa validation, sincère et complice, devient la preuve la plus crédible de la promesse.")
s("bigidea", "mecanique", "De la curiosité (qui est cet homme ?) à la tension (pourquoi ne mange-t-il pas ?) puis au soulagement complice du "
  "verdict : coffre-fort, transformation or → pâtes, dressage du chef, expertise à la loupe, validation, dégustation, packshot.")
s("bigidea", "rattachement", "La promesse de Gold : « De l'or en pâtes ». Le film la prend au mot.")
s("bigidea", "campagne", "De l'or en pâtes"); s("bigidea", "signature", "La Pasta Gold, de l'or en pâtes.")
s("bigidea", "ton_campagne", "Élégant, feutré, humour british")
s("bigidea", "phares", ["Le coffre-fort et les lingots", "La machine qui transforme l'or en pâtes", "La loupe de joaillier", "Le hochement de tête du trader"])
s("bigidea", "criteres", ["La transformation or → pâtes raccorde avec les gros plans réels", "Le verdict se lit sans voix off", "La signature et les deux produits au packshot",
  "Le ton ne bascule jamais dans la caricature"])
s("bigidea", "interdits", ["Le doré clinquant", "La typographie fantaisie", "Un trader ridicule"])
s("bigidea", "validite", "Le film ne vaut que si l'examen paraît sérieux : si le trader joue la farce, la preuve tombe et il ne reste qu'un sketch.", MQ)
q["sections"]["bigidea"]["source"] = S_SB

q["sections"]["pistes"] = [{"id": "PI-lpg-trader", "titre": "Le négociant en or", "statut": "retenue", "auteurDA": None, "auteurCR": None,
  "territoireId": "TR-lpg-1", "vignette": V + "lpg26-scene-05-expertise.jpg",
  "concept": q["sections"]["bigidea"]["idee"],
  "accroches": ["De l'or en pâtes", "Quand l'or devient pâtes"],
  "visuel": "Restaurant premium, dominante or et matières nobles, lumière chaude et feutrée ; motion design pour l'or (coffre, lingots, transformation) ; macro sur la texture de la pâte.",
  "mecanique": q["sections"]["bigidea"]["mecanique"],
  "executionCle": "Le trader saisit une lamelle de pâte à la pince et l'examine à la loupe, sous les regards amusés des tables voisines.",
  "sacrifice": "Le repas familial à la maison : le film se passe au restaurant, chez les CSP A, au risque de paraître loin des familles.",
  "privilegie": "La preuve de qualité et l'aspiration premium.",
  "argument": "L'expert le plus exigeant valide : c'est la preuve la plus crédible de « une qualité qui résiste à l'examen le plus rigoureux ».",
  "porteurs": ["L'or et le coffre-fort", "La loupe du trader", "La signature « de l'or en pâtes »"],
  "production": "Une journée de tournage, trois séquences motion, un casting de personnalités ; raccord or → pâtes à soigner.",
  "source": S_SB, "infere": {"pourquoi": "Le concept du storyboard, retenu puisqu'il est en production. Auteurs non nommés par les documents.", "quand": QUAND, "par": PAR}}]

q["volets"] = [{"id": "V-tv", "nom": "Spots TV", "supports": ["S-tv"], "marches": ["M-CM"]},
               {"id": "V-clips", "nom": "Clips digitaux", "supports": ["S-film916", "S-carre", "S-digital"], "marches": ["M-CM"]},
               {"id": "V-plateau", "nom": "Photos de plateau", "supports": ["S-digital"], "marches": ["M-CM"]}]
q["livrables"] = [
  livrable("L-lpg-50s", "Spot TV 50 s — version complète", "S-tv", "V-tv", "P-alex", "2026-10-15", niveau="maitre", vignette="lpg26-scene-05-expertise.jpg", nature="marque", src=S_SB + ", p. 14"),
  livrable("L-lpg-30s", "Spot TV 30 s — format essentiel", "S-tv", "V-tv", "P-alex", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-01-or.jpg", nature="marque", src=S_SB + ", p. 14"),
  livrable("L-lpg-massimo", "Spot — version avec l'incrustation de M. Massimo (scène 06)", "S-tv", "V-tv", "P-alex", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-06-validation.jpg", src=S_SB + ", p. 11"),
  livrable("L-lpg-c01", "C-01 « Le verdict de l'or » — 9:16 TikTok / Stories, cadre « certification » et « Analyse en cours »", "S-film916", "V-clips", "P-serge", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-05-expertise.jpg", src=S_MB + ", § 05"),
  livrable("L-lpg-c02", "C-02 « De l'or… à l'assiette » — 1:1 Instagram / Facebook, « QUAND L'OR DEVIENT PÂTES »", "S-carre", "V-clips", "P-serge", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-02-transformation.jpg", src=S_MB + ", § 05"),
  livrable("L-lpg-c03", "C-03 « Le sourire qui valide tout » — 16:9 Stories / Reels, tampon « APPROUVÉ »", "S-digital", "V-clips", "P-serge", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-06-validation.jpg", src=S_MB + ", § 05"),
  livrable("L-lpg-c04", "C-04 « La Pasta Gold… de l'or en pâtes » — 1:1 Instagram, packshot 100 % motion", "S-carre", "V-clips", "P-serge", "2026-10-15", niveau="declinaison", vignette="lpg26-scene-08-packshot.jpg", src=S_MB + ", § 05 — codé C-03 par erreur au document"),
  livrable("L-lpg-photos", "Photos de plateau et making-of", "S-digital", "V-plateau", "P-william", "2026-10-15", src=S_PRO),
]
for l in q["livrables"]:
    if l["niveau"] == "declinaison" and l["id"] != "L-lpg-50s": l["maitre"] = "L-lpg-50s"

q["insights"] = [
  insight("IN-lpg-1", "consommateur",
    "Quand on reçoit, on ne prend pas de risque : on sert ce qui a fait ses preuves. Pour la table du dimanche ou d'une fête, la maman "
    "des grands jours achète une pâte importée parce qu'elle est « sûre » — pas parce qu'elle l'a comparée.",
    "Recevoir, c'est être jugé sur sa table.", "On aimerait servir local, mais on doute que ce soit au niveau.",
    "Faute de preuve, la pâte locale reste celle du quotidien.",
    "Personne ne veut être l'hôte qui a servi des pâtes ordinaires.",
    [{"type": "publique", "quoi": "Plateforme Gold : « reprendre le premium des imports », la maman des grands jours, les hôtes"},
     {"type": "publique", "quoi": "Proposition de célébrités : marque premium, familiale, urbaine, CSP A, B+, B"},
     {"type": "terrain", "quoi": "Les achats de fête en grande surface à Douala : à observer avant la diffusion"}],
    {"contredit": True, "gene": True, "ouvre": True}),
  insight("IN-lpg-2", "culture",
    "Au Cameroun, l'or est la valeur qu'on vérifie : on le pèse, on le regarde, on le fait expertiser. Un négociant qui examine un "
    "plat avec le même sérieux, c'est drôle — et c'est la preuve la plus parlante qui soit.",
    "L'or est la mesure de la valeur, et il se vérifie.", "Personne n'expertise des pâtes — et pourtant on veut savoir si elles valent leur prix.",
    "La qualité d'une pâte reste une affaire de parole de marque.",
    "Ce qui vaut de l'or, on le vérifie.",
    [{"type": "publique", "quoi": "Storyboard : « l'or, matière la plus précieuse et la plus expertisée au monde » (p. 2)"},
     {"type": "publique", "quoi": "Motion brief : registre joaillerie et spiritueux premium"}],
    {"contredit": True, "gene": False, "ouvre": True}),
]
q["territoires"] = [{"id": "TR-lpg-1", "nom": "L'examen de l'or", "insightId": "IN-lpg-2", "ecole": "inherent-drama",
  "quoi": "Gold passe les examens que l'on réserve à l'or : l'expertise, la loupe, le verdict. Plusieurs films peuvent y vivre — le trader, le joaillier, la pesée.",
  "convention": None, "reduction": None, "cree_le": QUAND,
  "infere": {"pourquoi": "Le territoire du storyboard, nommé pour le cadrage. L'école Inherent Drama : le drame est déjà dans le produit — son nom et sa couleur.", "quand": QUAND, "par": PAR}}]

q["sections"]["socle"]["moodboard"] = [{"id": "MB-lpg-" + k, "role": "reference", "vignette": V + f, "legende": leg, "source": src, "quand": QUAND} for k, f, leg, src in [
  ("00", "lpg26-scene-00-prestige.jpg", "Scène 00 — une question de prestige : le restaurant, le trader seul à sa table", S_SB + ", p. 5"),
  ("01", "lpg26-scene-01-or.jpg", "Scène 01 — l'or, matière précieuse : le lingot et sa poudre d'or", S_SB + ", p. 6"),
  ("02", "lpg26-scene-02-transformation.jpg", "Scène 02 — quand l'or devient pâtes : la machine", S_SB + ", p. 7"),
  ("03", "lpg26-scene-03-dressage.jpg", "Scène 03 — le chef compose son œuvre", S_SB + ", p. 8"),
  ("04", "lpg26-scene-04-livraison.jpg", "Scène 04 — la livraison du plat", S_SB + ", p. 9"),
  ("05", "lpg26-scene-05-expertise.jpg", "Scène 05 — l'expertise à la loupe", S_SB + ", p. 10"),
  ("06", "lpg26-scene-06-validation.jpg", "Scène 06 — la validation de l'expert", S_SB + ", p. 11"),
  ("07", "lpg26-scene-07-degustation.jpg", "Scène 07 — la dégustation, un couple trinque", S_SB + ", p. 12"),
  ("08", "lpg26-scene-08-packshot.jpg", "Scène 08 — le packshot : « La Pasta Gold, de l'or en pâtes »", S_SB + ", p. 13"),
  ("chef", "lpg26-tenue-chef.jpg", "Tenue du chef : veste blanc cassé, col mao, boutons dorés", S_TEN + ", p. 3"),
  ("trader", "lpg26-tenue-trader.jpg", "Tenue du trader : trois pièces noir, revers brodés or", S_TEN + ", p. 4"),
  ("influenceur", "lpg26-tenue-influenceur.jpg", "Tenue de l'influenceur : élégance de soirée", S_TEN + ", p. 5"),
  ("influenceuse", "lpg26-tenue-influenceuse.jpg", "Tenue de l'influenceuse : noir et or, satin", S_TEN + ", p. 6"),
  ("figurants", "lpg26-tenue-figurants.jpg", "Figurants : palette neutre et profonde, sans doré éclatant", S_TEN + ", p. 7")]]
q["piecesBrief"] = [{"id": "PB-lpg-" + k, "nom": n, "vignette": V + f, "source": src, "quand": QUAND} for k, n, f, src in [
  ("couv", "Le spot en un regard : 30 s, 50 s, 4 clips", "lpg26-storyboard-couverture.jpg", S_SB + ", p. 1"),
  ("intention", "L'intention créative", "lpg26-storyboard-intention.jpg", S_SB + ", p. 2"),
  ("protagonistes", "Les visages du spot", "lpg26-storyboard-protagonistes.jpg", S_SB + ", p. 3"),
  ("flux", "Le flux du spot en 50 s", "lpg26-storyboard-flux-50s.jpg", S_SB + ", p. 4"),
  ("versions", "Un tournage, deux déclinaisons TV", "lpg26-storyboard-deux-versions.jpg", S_SB + ", p. 14"),
  ("motion-1", "Motion brief — contexte et palette", "lpg26-motion-brief-p1.jpg", S_MB + ", p. 1"),
  ("motion-2", "Motion brief — typographie, style, séquences", "lpg26-motion-brief-p2.jpg", S_MB + ", p. 2"),
  ("tenues", "Direction stylistique générale", "lpg26-tenues-principes.jpg", S_TEN + ", p. 2")]]
q["documentsRecus"] = [
  {"nom": "LA PASTA GOLD STORYBOARD OK.pdf", "type": "storyboard de présentation, 15 pages", "date": "septembre 2026",
   "tire": "Intention, protagonistes, flux en 50 s, neuf scènes, deux versions, prochaines étapes — au cadrage, à la piste et au moodboard. Mentions « NSIA Assurance » et « 2 actrices, 15 figurantes » d'un autre dossier."},
  {"nom": "MOTION BRIEF LA PASTA GOLD.pdf", "type": "brief motion design, 5 pages", "date": "29/09/2026",
   "tire": "Contexte, palette, typographie, style, trois séquences, quatre clips, spécifications — au brief (fabrication) et à la palette de Gold. Annonce un spot de 60 s ; deux clips codés C-03."},
  {"nom": "La Pasta Gold Proposition Celebrites OK.pdf", "type": "proposition de casting, 7 pages",
   "tire": "Grille de sélection et talents proposés — au brief (casting), noms seulement ; photos non reprises."},
  {"nom": "TENUES SPOT LA PASTA.PDF", "type": "direction stylistique, 8 pages", "tire": "Principes et tenues par personnage — au brief (fabrication) et au moodboard."},
  {"nom": "CHRONOGRAMME LA PASTA GOLD( DEFNITIF.xlsx", "type": "chronogramme, 25/09 → 15/10/2026",
   "tire": "Au calendrier, avec ses trois incohérences : repérage daté d'octobre, tournage le 6 ou le 8, validation étirée au 16."},
  {"nom": "FACURE PROFORMA SPOT LA PASTA.pdf", "type": "proforma du producteur à Matanga, 4 pages", "date": "10/09/2026",
   "tire": "Postes et engagements des talents au brief (droits d'usage, fabrication) ; rangée aux factures. Montants non recopiés."},
]
q["preparation"] = {
  "objectif": "Sortir de la séance avec un storyboard propre à renvoyer au client, la date de tournage tranchée et la version Massimo cadrée.",
  "question": "Comment rendre l'examen du trader si sérieux qu'il en devienne drôle — et qu'on y croie ?",
  "a_trancher": ["Tournage le 6 ou le 8 octobre ?", "Spot long : 50 s ou 60 s ?", "La version avec M. Massimo : qui est-il, où l'incruster, quels droits ?",
                 "Le cuisinier sans cachet à la proforma : est-ce voulu ?", "La voix off : qui, et quel texte ?", "La musique : création ou banque, et ses droits ?"],
  "amorces": ["Et si le trader pesait la pâte sur une balance de bijoutier ?", "Et si le tampon « APPROUVÉ » devenait le visuel d'affichage ?",
              "Et si chaque clip ouvrait sur « Analyse en cours… » ?"],
  "directions": ["Le négociant en or — le storyboard retenu", "Variante : la version Massimo en caution du fabricant"],
  "interdits": ["Le doré clinquant", "Le trader caricatural", "Les mentions d'un autre dossier dans les documents client"],
  "materiel": ["Le storyboard (planches 4 à 14)", "Le motion brief", "Les tenues", "Le chronogramme"],
  "deroule": ["10 min — le film en 50 s, par la création", "10 min — les incohérences à corriger", "15 min — casting et tenues",
              "15 min — motion design : coffre, transformation, packshot", "10 min — le plan de post-production"],
  "notes": "Le film est déjà en production au 5 octobre : ce cadrage rattrape un dossier commencé hors de LA BARRE.",
  "infere": {"pourquoi": "Préparée à partir des six documents de production. À relire avant la séance.", "quand": QUAND, "par": PAR}}
q.setdefault("inferences", {}).update(INF)
trace("dossier reçu", "La Pasta Gold — spot TV : 6 documents · 8 livrables · 2 insights · 1 territoire · 1 piste retenue · proforma rangée", "projets", q["id"], ["MQ-pz-gold"])

# ═══════════════════════════════════════════════════════════════════════════════════════════
#  III. Ce que la passe de contrôle a trouvé vide, et qui se remplit depuis les documents
# ═══════════════════════════════════════════════════════════════════════════════════════════
for x, vx in ((p, v), (q, gv)):
    for cle in ("benefices", "preuves", "jamais", "symboles", "ne_fera_pas"):
        if vide(x["sections"]["socle"].get(cle)) and not vide(vx.get(cle)):
            x["sections"]["socle"][cle] = vx[cle]
    x["sections"]["socle"]["source"] = "Lu dans la plateforme de marque au jour de l'import"

s = setter(p, INF_P := {})
s("brief", "messages_reactifs", [
  "Sur la route Edéa–Kribi : « Nous savons ce que ce trajet coûte à nos usagers. Voici où en sont les travaux, ce qui est fait d'ici là, et quand nous ferons le prochain point. »",
  "Sur un retard de travaux : donner la nouvelle date, la raison, et la mesure palliative — jamais une date qu'on ne tiendra pas",
  "Sur une plainte d'usager : réponse en moins de 2 h, publique pour le principe, en message privé pour le détail",
  "Sur une critique RSE (pêcheurs, mangrove) : répondre par les actes et les chiffres sourcés — PASEK, unité de pêche, suivi de l'eau",
  "Rumeur ou fausse information : démenti court, sourcé, publié par le compte officiel, relayé par les ambassadeurs"],
  MI + "Déduits du programme PAK Trust (p. 21) et de l'objectif de réactivité < 2 h ; aucun message réactif n'est écrit.")
s("brief", "casting", ["Les dirigeants des entreprises partenaires — un par épisode Kribi Connect (Tractafric, AGL, ACC Cacao, CMA CGM, Cimpor, Cadyst, Kridevco, Kamlog)",
  "Le directeur général du PAK — La FAQ du DG, thought leadership", "50 ambassadeurs internes formés à LinkedIn",
  "5 ambassadeurs externes de prestige — experts reconnus en économie, logistique, industrie, à recruter par l'agence",
  "Les experts des TED PAK — internes et externes, régionaux", "Les riverains, pêcheurs et employés des portraits RSE"])
s("brief", "production", ["Équipe interne PAK : un graphiste exé, un community manager", "Matanga : stratège digital, senior creative / DA, motion designer, media trader",
  "Outils : Hootsuite ou Sprout Social, Adobe Premiere et After Effects, Midjourney, Meta et LinkedIn Ads Manager, social listening, dashboards",
  "Tournages : interviews CEO, visites 360°, drones — autorisations de sûreté portuaire", "TED PAK : lieu, scénographie, streaming LinkedIn / YouTube, 150 VIP et ~2 000 spectateurs en ligne",
  "Renfort audiovisuel et événementiel à J-30 les mois de TED PAK"])
s("bigidea", "phares", ["Kribi Connect", "PAK Innovation Lab", "TED PAK", "PAK Trust", "Les 50 ambassadeurs"])
p["inferences"].update(INF_P)
p["sections"]["pistes"] = [{"id": "PI-pak-media", "titre": "Le PAK devient un média", "statut": "proposee", "auteurDA": None, "auteurCR": None,
  "territoireId": "TR-pak-1", "vignette": V + "pak26-strategie-kribi-connect.jpg",
  "concept": p["sections"]["bigidea"]["idee"], "mecanique": p["sections"]["bigidea"]["mecanique"],
  "accroches": ["Ensemble, faisons du PAK la référence"],
  "executionCle": "Kribi Connect ép. 01 : le CEO de Tractafric explique en 3 minutes pourquoi il a choisi Kribi.",
  "sacrifice": "La communication de cérémonie — visites, signatures — passe au second plan, et l'institution accepte de parler de ses défis.",
  "privilegie": "La preuve, la conversion B2B et la confiance.",
  "argument": "Un armateur croit un autre armateur : le PAK gagne en crédibilité quand ses partenaires, ses données et ses gens parlent pour lui.",
  "porteurs": ["Le format Kribi Connect", "Les Data Motion du 1er du mois", "Le rendez-vous TED PAK"],
  "axe_directrice": "Prouver au lieu d'annoncer.", "axe_ton": "Corporate et expert, visionnaire, humain",
  "axe_univers": "Le port en action : portiques, quais, navires, chantiers Phase 2, et les visages de ceux qui y travaillent.",
  "axe_valeurs": ["Performance", "Innovation", "Partenariat", "Fiabilité"],
  "source": S_PAK, "infere": {"pourquoi": "La recommandation de Matanga, posée comme piste pour être arbitrée avec le PAK. Auteurs non nommés par le document.", "quand": QUAND, "par": PAR}}]
for l in p["livrables"]: l["pisteId"] = "PI-pak-media"

s = setter(q, INF_Q := {})
s("brief", "messages_reactifs", [
  "« Ce sont de vraies pâtes en or ? » — « De l'or en pâtes, c'est notre façon de dire leur qualité : 100 % semoule de blé dur, Premium Quality. »",
  "« Pourquoi un restaurant chic ? Gold, c'est pour les riches ? » — « Gold, c'est la pâte des moments qui comptent, à la maison comme au restaurant. »",
  "Sur le casting : répondre sur le film et la marque, jamais sur la vie des personnalités",
  "Sur le prix : rappeler la semoule premium et la tenue à la cuisson, sans comparaison nominative avec une marque importée"],
  MQ + "Déduits de la plateforme Gold et du film ; aucun message réactif n'est écrit.")
s("strategie", "pointsEntree", ["La table du dimanche", "Le repas de fête et la fin d'année", "Recevoir des invités", "Le dîner au restaurant"], MQ)
s("strategie", "a_garder", ["Le scénario de 2018 — le trader qui expertise le plat", "La signature « de l'or en pâtes »", "La communication portée par des personnalités"], MQ)
s("strategie", "a_adapter", ["Le casting — nouveaux talents face aux anciens", "Le motion design de l'or — coffre, transformation", "Les quatre clips pour les réseaux"], MQ)
s("strategie", "a_ecarter", ["Les mentions d'un autre dossier dans le storyboard", "Le doré clinquant", "La caricature de l'expert"], MQ)
q["inferences"].update(INF_Q)
pi = q["sections"]["pistes"][0]
pi.update({"axe_directrice": "Une qualité qui résiste à l'examen le plus rigoureux.", "axe_ton": "Élégant, feutré, humour british",
           "axe_univers": "Restaurant premium de Douala, dominante or et matières nobles, lumière chaude et feutrée ; or en motion design, macro sur la pâte.",
           "axe_valeurs": ["Excellence", "Exigence", "Plaisir partagé"]})
for l in q["livrables"]:
    l["pisteId"] = "PI-lpg-trader"
    if l.get("maitre"): l["versionMaitre"] = 1
for l in q["livrables"]:
    if l["id"] in ("L-lpg-50s", "L-lpg-30s", "L-lpg-c04"):
        l["kv"] = {"marque": "La Pasta Gold", "sku": ["SKU-pz-001", "SKU-pz-000"], "copy": "La Pasta Gold, de l'or en pâtes",
                   "infere": "« Les deux produits de la gamme » au packshot (motion brief, séquence 8) : Gold et Gold Premium spaghetti 500 g, d'après l'image du storyboard. À confirmer."}
if not any(a["id"] == "A-logo-pz-gold" for a in d["assets"]):
    d["assets"].append({"id": "A-logo-pz-gold", "nom": "Logo La Pasta Gold — « de l'or en pâte »", "marque": "MQ-pz-gold", "role": "logo",
        "vignette": V + "logo-la-pasta-gold.png", "source": "extrait du storyboard du spot (p. 1), " + S_SB, "marches": [],
        "note": "Extrait en 429 × 261 px avec sa transparence : bon pour l'écran, pas pour l'impression. Le motion brief demande le logo vectoriel au client."})
q["insights"][1]["sources"].append({"type": "publique", "quoi": "Tenues : la touche or par petites touches, un bouton, un bijou — l'or comme signe de standing à Douala"})
q["territoires"][0]["ecole"] = None
q["territoires"][0]["infere"]["pourquoi"] = ("Le territoire du storyboard, nommé pour le cadrage. On y lit une Inherent Drama — le drame est déjà dans "
                                             "le produit, son nom et sa couleur — à déclarer en équipe, avec sa preuve.")

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
for x in (p, q):
    print(x["ref"], x["nom"], "· inférences :", len(x["inferences"]), "· livrables :", len(x["livrables"]),
          "· moodboard :", len(x["sections"]["socle"]["moodboard"]), "· pièces :", len(x["piecesBrief"]))
