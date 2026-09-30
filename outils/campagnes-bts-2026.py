# campagnes-bts-2026.py — ranger ensemble ce qui appartient au même temps fort.
#
# Une campagne tient plusieurs projets. Le Back to School 2026 de FrieslandCampina
# en portait quatre ; le Radar en relève trois de plus, restés hors campagne ou
# sans dossier :
#   FRC-059  la plateforme « Le combat d'une vie », livrée avec ses déclinaisons
#            Back to School 2026 (projet PRJ-XC-001, sans campagne) ;
#   FRC-048  le storyboard du spot TV 30 s « Chaque jour est un combat » (aucun dossier) ;
#   FRC-058  les couvertures de cahiers promotionnelles multi-pays, CI · BF · BJ/TG · ML
#            (apparié par l'ingestion à « Chartes & Brand Propellers », PRJ-XC-040 :
#            le nom ne correspond pas, le lien est déplacé et l'ancien gardé).
# Et deux campagnes inférées portaient la mauvaise année ou un identifiant pour nom.
#
# Rien n'est supprimé : chaque déplacement entre dans l'historique du projet ou de
# la campagne, avec son motif.
#
# Usage : python3 outils/campagnes-bts-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, datetime

SRC, DST = sys.argv[1], sys.argv[2]
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"

d = json.load(open(SRC))
P = {p["id"]: p for p in d["projets"]}
C = {c["id"]: c for c in d["campagnes"]}
R = {x["ndeg"]: x for x in d["radar"]}
J = d.setdefault("journal", [])
BTS = "CMP-mq-br-rentree-2026"

def trace(action, typ, ident, detail):
    J.append({"quand": QUAND, "qui": PAR, "action": action, "type": typ, "id": ident, "detail": detail})

def rattacher(p, cid, motif):
    avant = p.get("campagneId")
    if avant == cid: return
    p.setdefault("historiqueCampagne", []).append({"quand": QUAND, "qui": PAR, "avant": avant, "apres": cid, "motif": motif})
    p["campagneId"] = cid
    c = C[cid]
    for m in p["sections"]["identite"].get("marqueIds") or []:
        if m not in c["marqueIds"]: c["marqueIds"].append(m)
    trace("rattaché à une campagne", "projets", p["id"], c["nom"] + " — " + motif)

def renommer(c, nom, motif, **champs):
    c.setdefault("historique", []).append({"quand": QUAND, "qui": PAR, "avant": {k: c.get(k) for k in ["nom", *champs]},
                                           "motif": motif})
    c["nom"] = nom
    c.update(champs)
    trace("campagne corrigée", "campagnes", c["id"], nom + " — " + motif)

def livrable(pid, n, nom, marque, marche, source, ligne, statut, rattache, echeance):
    return {"id": "L-%s-%03d" % (pid, n), "nom": nom, "support": None, "marche": marche, "voletId": None,
            "responsable": None, "echeance": echeance, "remise": None, "publication": None, "origine": "prevu",
            "pisteId": None, "maitre": None, "versionMaitre": None, "version": 1, "versions": [], "estime": None,
            "reel": None, "toursVendus": None, "assets": [], "entrees": [], "annotations": [], "mockups": [],
            "niveau": "declinaison", "marqueId": marque, "points": {},
            "releve": {"source": "Radar " + source, "ligne": ligne, "statut": statut, "rattache": rattache, "sienne": False}}

def projet(pid, ref, nom, marques, marches, nature, fenetre, echeance, radar, livrables, note):
    if pid in P: return P[pid]
    p = {"id": pid, "ref": ref, "nom": nom, "gabarit": "campagne", "cree_le": QUAND, "statut": "creation",
         "equipe": [{"personne": "P-alex", "poste": "creation"}],
         "sections": {"identite": {"client": "FrieslandCampina WAMEA", "clientId": "C-fc",
                                   "marque": " · ".join({"MQ-br": "Bonnet Rouge", "MQ-peak": "Peak", "MQ-bh": "Belle Hollandaise"}[m] for m in marques),
                                   "marqueIds": marques, "marches": marches, "fenetre": fenetre, "type": "",
                                   "echeance": echeance, "budget": None, "decideur": "", "tueur": "", "circuit": ""},
                      "brief": {"verbatim": note}, "pistes": []},
         "inferences": {"identite.echeance": {"pourquoi": "Pas d'échéance au Radar : fin de la fenêtre de diffusion du Back to School 2026 (15 octobre), reprise du dispositif MT-0043.",
                                              "quand": QUAND, "par": PAR}},
         "livrables": livrables, "volets": [],
         "releve": {"source": "Radar Matanga", "radar": radar, "releve_le": QUAND},
         "insights": [], "territoires": [], "nature": nature,
         "perimetre": {"supports": [], "marches": marches}}
    d["projets"].append(p); P[pid] = p
    for k in radar:
        if k in R: R[k]["projetId"] = pid
    trace("création depuis le Radar", "projets", pid, ref + " · " + nom)
    return p

# 1 · La plateforme « Le combat d'une vie » : livrée avec ses déclinaisons Back to School 2026.
rattacher(P["PRJ-XC-001"], BTS, "FRC-059 : présentation de la plateforme en 7 chapitres + déclinaisons Back to School 2026 — « Ma rentrée, mon combat » en est la première floraison.")

# 2 · Le spot TV 30 s, storyboard proposition 1 : aucun dossier jusqu'ici.
x = R["FRC-048"]
p = projet("PRJ-FRC-048", "FRC-048", "Spot TV 30 s « Chaque jour est un combat » — storyboard", ["MQ-br"], [],
           "film", "rentrée 2026", "2026-10-15", ["FRC-048"],
           [livrable("frc-048", 1, "Storyboard spot TV 30 s — 4 scènes (maison/matin, classe, récréation, victoire) + packshot",
                     "MQ-br", None, "FRC-048", x["livrables"], x["statut"], "", "2026-10-15")],
           "Relevé au Radar (FRC-048, reçu le 17/06/2026) : « " + x["projet"] + " ». " + x["livrables"] + ".")
p["note"] = "Peut être la proposition 1 du film TV MT-0049 (45 s, Côte d'Ivoire) : à confirmer, puis chaîner ou fusionner."
rattacher(p, BTS, "Spot TV de rentrée Bonnet Rouge, concept « Chaque jour est un combat » (Radar FRC-048).")

# 3 · Les couvertures de cahiers multi-pays : quatre marchés, quatre déclinaisons.
x = R["FRC-058"]
marches = {"FRC-058.R1": ("MQ-br", "M-CI"), "FRC-058.R2": ("MQ-br", "M-BF"), "FRC-058.R3": ("MQ-peak", "M-BJ"), "FRC-058.R4": ("MQ-bh", "M-ML")}
ls = [livrable("frc-058", i + 1, R[k]["projet"].split(" — ")[-1].replace("Couvertures de cahiers promotionnelles BTS 2026 · ", "Couvertures de cahiers · "),
               marches[k][0], marches[k][1], k, R[k]["livrables"], R[k]["statut"], "FRC-058", "2026-10-15")
      for i, k in enumerate(["FRC-058.R1", "FRC-058.R2", "FRC-058.R3", "FRC-058.R4"])]
p = projet("PRJ-FRC-058", "FRC-058", "Couvertures de cahiers promotionnelles BTS 2026 — multi-pays",
           ["MQ-br", "MQ-peak", "MQ-bh"], ["M-CI", "M-BF", "M-BJ", "M-TG", "M-ML"], "campagne", "rentrée 2026", "2026-10-15",
           ["FRC-058", "FRC-058.R1", "FRC-058.R2", "FRC-058.R3", "FRC-058.R4"], ls,
           "Relevé au Radar (FRC-058, reçu le 26/06/2026) : « " + x["projet"] + " ». " + x["livrables"]
           + ". Par marché : CI Bonnet Rouge seul ; Burkina Bonnet Rouge + Peak ; Bénin/Togo Peak seul ; Mali Belle Hollandaise seule.")
rattacher(p, BTS, "Couvertures de cahiers Back to School 2026 pour les marchés d'Afrique de l'Ouest (Radar FRC-058).")
# Le lien de l'ingestion vers « Chartes & Brand Propellers » est déplacé, pas effacé.
x40 = P["PRJ-XC-040"]
rel = x40.setdefault("releve", {})
if any(k.startswith("FRC-058") for k in rel.get("radar", [])):
    rel["radarDeplaces"] = {"quand": QUAND, "vers": "PRJ-FRC-058", "radar": [k for k in rel["radar"] if k.startswith("FRC-058")],
                            "motif": "Appariement de l'ingestion douteux : FRC-058 porte sur des couvertures de cahiers BTS 2026, pas sur les chartes et brand propellers."}
    rel["radar"] = [k for k in rel["radar"] if not k.startswith("FRC-058")]

# 4 · La campagne Back to School 2026 : sa fenêtre était la fin de l'année de corpus.
c = C[BTS]
renommer(c, c["nom"], "Fenêtre reprise du dispositif MT-0043 (1er septembre — 15 octobre 2026) ; marché « CI » en double de M-CI retiré.",
         fenetre={"debut": "2026-09-01", "fin": "2026-10-15"},
         marches=[m for m in dict.fromkeys(c["marches"] + ["M-BJ", "M-TG", "M-ML"]) if m != "CI"])

# 5 · La Pasta : le brief CAD-094 est reçu le 17/06/2026 — c'est la rentrée 2026, pas 2025.
renommer(C["CMP-mq-lapasta-rentree-2025"], "La Pasta — Back to School 2026",
         "Brief CAD-094 « Maman est la première à croire en moi » reçu au Radar le 17/06/2026 : rentrée 2026. Le document de campagnes disait 2025.",
         fenetre={"debut": "2026-09-01", "fin": "2026-10-31"})

# 6 · Cadyst : un identifiant pour nom, et l'année du brief CAD-004 (« Rentrée scolaire 2025 »).
renommer(C["CMP-c-cadyst-rentree-2026"], "Cadyst Group — Back to School 2025",
         "Le brief CAD-004 s'intitule « Back to School / Rentrée scolaire 2025 » (reçu le 17/04/2025) ; le nom portait l'identifiant du client.",
         marqueIds=["MQ-cgroup"])
cg = P["PRJ-XC-067"]["sections"]["identite"]
if not cg.get("marqueIds"): cg["marqueIds"] = ["MQ-cgroup"]

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print("campagne BTS 2026 :", [p["ref"] for p in d["projets"] if p.get("campagneId") == BTS])
