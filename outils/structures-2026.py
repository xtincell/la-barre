# structures-2026.py — sous quelle structure chaque opération a été faite, et ce que les factures en disent.
#
# Règle d'Alex (01/10/2026) : « toutes les opérations de photo sont à mon nom sous couvert Friends
# Photography Studio ; le reste (conseil marketing, design — KOF, Cysoul, Musina, entre autres) sous
# couvert UPgraders ». Les factures retrouvées sur le disque font foi quand elles existent : elles
# montrent aussi de la photo facturée par UPgraders SARL (CFAO, IFC, Universal 2021).
#
# Ce que le script pose :
#   d.structures       les quatre structures : Matanga (employeur), UPgraders SARL, Friends Photography
#                      Studio SARL, et le nom propre (factures à ton nom).
#   p.structure        la structure de chaque projet, avec sa source (facture, corpus, règle).
#   clients réels      UPgraders, Friends et « À son nom propre » n'étaient pas des clients mais des
#                      structures : chaque marque passe à son vrai client, l'ancien reste dans l'historique.
#   d.factures         chaque pièce (facture, devis, proforma, reçu) : émetteur, numéro, date, client,
#                      objet, fichiers. AUCUN montant, aucune coordonnée bancaire ni personnelle : le dépôt
#                      est lisible en ligne. Les montants restent dans les fichiers, sur la machine.
#   projets neufs      une opération facturée sans dossier devient un projet clos, à sa structure.
#
# Usage : python3 outils/structures-2026.py <depot-source.json> <depot-sortie.json>

import json, sys, os, re, hashlib, datetime, unicodedata

SRC, DST = sys.argv[1], sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
QUAND = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
PAR = "creation"
REGLE = "Règle d'Alex (01/10/2026) : la photo sous couvert Friends Photography Studio, le reste sous couvert UPgraders."
HOME = os.path.expanduser("~")

d = json.load(open(SRC))
P = {p["id"]: p for p in d["projets"]}
M = {m["id"]: m for m in d["marques"]}
C = {c["id"]: c for c in d["clients"]}
J = d.setdefault("journal", [])
bilan = {"structures": 0, "clients": 0, "marques": 0, "factures": 0, "projets": 0, "liees": 0}

def trace(action, typ, ident, detail):
    J.append({"quand": QUAND, "qui": PAR, "action": action, "type": typ, "id": ident, "detail": detail})

# ————————————————— 1 · Les structures —————————————————

d["structures"] = [
    {"id": "matanga", "nom": "Matanga Agency", "forme": "SARL", "role": "employeur",
     "quoi": "L'agence : Alexandre y est directeur de la création. Ses dossiers font les indicateurs d'agence."},
    {"id": "upgraders", "nom": "UPgraders SARL", "forme": "SARL", "role": "structure propre",
     "quoi": "Conseil marketing, design, production, événementiel — et une partie des couvertures photo/vidéo facturées par elle."},
    {"id": "friends", "nom": "Friends Photography Studio SARL", "forme": "SARL", "role": "structure propre",
     "quoi": "Les opérations photo d'Alexandre, à son nom, sous couvert du studio. Prestataire aussi de Matanga."},
    {"id": "nom-propre", "nom": "Alexandre Djengue, en nom propre", "forme": "personne", "role": "nom propre",
     "quoi": "Les quelques pièces facturées à son nom, sans structure."},
]

# ————————————————— 2 · La structure de chaque projet —————————————————

PHOTO = {"PRJ-XC-131", "PRJ-XC-133"}          # Doual'art shooting, PEN&GRACE prénuptial (section « nom propre »)
def poser(p, cle, motif, source):
    avant = p.get("structure")
    if avant == cle: return
    if avant: p.setdefault("historiqueStructure", []).append({"quand": QUAND, "avant": avant, "apres": cle, "motif": motif})
    p["structure"] = cle
    p["structureSource"] = {"source": source, "motif": motif, "quand": QUAND}
    bilan["structures"] += 1

for p in d["projets"]:
    s = (p.get("releve") or {}).get("section", "")
    if s.startswith("9."):
        poser(p, "upgraders", "Section « UPgraders » du document de campagnes.", "corpus")
    elif s.startswith("11."):
        poser(p, "friends", "Section « Friends Studio » du document de campagnes.", "corpus")
    elif s.startswith("10."):
        if p["id"] in PHOTO: poser(p, "friends", "Opération photo. " + REGLE, "règle")
        else: poser(p, "upgraders", "Conseil, design ou prospection, rangé « à ton nom propre ». " + REGLE, "règle")
    elif not p.get("structure"):
        poser(p, "matanga", "Dossier de l'agence.", "corpus" if s else "dépôt")

x118 = P.get("PRJ-XC-118")
if x118:
    x118["structureNote"] = ("Dossier Matanga mêlé : Musina et Dr Ikito (Impact Santé Afrique) relèvent d'UPgraders — "
                             "factures UPgraders 2025121301 et 2026011401. Cimencam, Port de Kribi et LTA restent Matanga.")

# ————————————————— 3 · Les vrais clients —————————————————

def client(cid, nom, note=None):
    if cid not in C:
        c = {"id": cid, "nom": nom, "vault": {}, "cree_le": QUAND}
        if note: c["note"] = note
        d["clients"].append(c); C[cid] = c; bilan["clients"] += 1
    return C[cid]

VRAIS = {
    "MQ-spawt": ("C-spawt", "Spawt (Abidjan)", None),
    "MQ-spawt-app": ("C-spawt", "Spawt (Abidjan)", None),
    "MQ-kof": ("C-alte", "ALTE — K-Mer Otaku Festival", "L'association qui porte le festival."),
    "MQ-motion19": ("C-motion19", "MOTION19", None),
    "MQ-musina": ("C-musina", "Festival Musina", None),
    "MQ-dotbites": ("C-dotbites", "Dot Bites", None),
    "MQ-universal": ("C-universal", "Universal Music Africa (Cameroun)", None),
    "MQ-akwapalace": ("C-akwapalace", "Akwa Palace (CICC)", None),
    "MQ-banahealth": ("C-banahealth", "BanaHealth", None),
    "MQ-villacorso": ("C-villacorso", "Villa Corso", None),
    "MQ-goodlocs": ("C-goodlocs", "Goodlocs", None),
    "MQ-orange": ("C-orange", "Orange Cameroun", "Donneur d'ordre : McCann Douala. Facturé par Friends Photography Studio."),
    "MQ-doualart": ("C-doualart", "Doual'art", None),
    "MQ-arcenciel": ("C-arcenciel", "Arc en Ciel Distribution", None),
    "MQ-nyama": ("C-nyama", "NYAMA", "Prospect non gagné."),
    "MQ-penetgrace": ("C-particuliers", "Particuliers — commandes privées", "Commandes de personnes privées : aucun nom ni coordonnée au dépôt."),
}
for mid, (cid, nom, note) in VRAIS.items():
    m = M.get(mid)
    if not m: continue
    client(cid, nom, note)
    if m.get("clientId") != cid:
        m.setdefault("historique", []).append({"quand": QUAND, "champ": "clientId", "avant": m.get("clientId"), "apres": cid,
            "motif": "UPgraders, Friends et « À son nom propre » sont des structures, pas des clients. " + REGLE})
        m["clientId"] = cid; bilan["marques"] += 1
if "MQ-orange" in M: M["MQ-orange"]["donneurOrdre"] = "McCann Douala"
for p in d["projets"]:
    i = p["sections"].get("identite") or {}
    mq = (i.get("marqueIds") or [None])[0]
    if mq in VRAIS and i.get("clientId") in ("C-upgraders", "C-friends", "C-propre", None):
        cid = VRAIS[mq][0]
        p.setdefault("historiqueStructure", []).append({"quand": QUAND, "champ": "clientId", "avant": i.get("clientId"), "apres": cid,
            "motif": "Client réel ; la structure passe dans p.structure."})
        i["clientId"] = cid; i["client"] = C[cid]["nom"]
for cid in ("C-propre",):
    c = C.get(cid)
    if c and not any(m.get("clientId") == cid for m in d["marques"]):
        c["archive"] = {"quand": QUAND, "motif": "« À son nom propre » était une structure, pas un client : ses marques ont rejoint leur vrai client. " + REGLE}

# ————————————————— 4 · Les factures —————————————————
#
# Elles servent à identifier les opérations — par leur présence ou leur absence — et à lever les
# ambiguïtés de structure. Les abonnements logiciels (OpenAI, Adobe, Higgsfield, Replicate…) sont au nom
# personnel d'Alexandre : aucune personne morale n'y a souscrit. Ils sont écartés, pas rattachés.

EXT = json.load(open(os.path.join(ICI, "plateformes-2026", "_factures-extraites.json")))
BRUIT = re.compile(r"OpenAI|Higgsfield|Replicate|Adobe|ASKY|Electronic ticket|Midjourney|Envato|Freepik|Canva|Anthropic|Runway|ElevenLabs|"
                   r"Kling|Suno|Hostinger|Stripe|Paddle|Magnific|Krea|CASS AUTO|DEPANNAGE", re.I)

def emetteur(t):
    tt = t[:900]
    if re.search(r"UPgraders SARL|S/C UPgraders|s/c Upgraders", tt, re.I): return "upgraders"
    if re.search(r"FRIENDS PHOTOGRAPH|Friends Photography|Émetteur : Friends", tt, re.I): return "friends"
    if re.search(r"FRIENDSFOOD", tt): return "friendsfood"
    if re.search(r"MATANGA|SOFAVINC Yaoundé|FRIESLANDCAMPINA IVORY", tt, re.I): return "matanga"
    if re.search(r"DJENGUE MBANGUE|Émis par : Alexandre", tt, re.I): return "nom-propre"
    if re.search(r"PANZANI CAMEROUN SA", tt): return "client"
    if re.search(r"Giant Graphics", tt, re.I): return "sous-traitant"
    if re.search(r"Association BCS", tt): return "tiers"
    if re.search(r"Proforma N° P2025", tt): return "matanga"
    return None

def type_de(nom, t):
    s = (nom + " " + t[:80]).upper()
    for k, v in (("PROFORMA", "proforma"), ("PRO FORMA", "proforma"), ("RECU", "reçu"), ("REÇU", "reçu"), ("DEVIS", "devis"), ("ESTIMATE", "devis"), ("FACTURE", "facture"), ("INVOICE", "facture")):
        if k in s: return v
    return "pièce"

def ref_de(t):
    for pat in (r"Invoice Number:\s*(\d{2,})", r"Estimate Number:\s*(\d{2,})", r"Num[ée]ro de Facture\s*:\s*(\d+)",
                r"(?:Facture|Devis|Proforma)[^N]{0,20}N[°o]\s*:?\s*([A-Z]{1,3}[A-Z0-9/\-]{4,})", r"N[°o]\s*:?\s*((?:DE|FA|FPS|FP|UPG|F|P)[A-Z0-9/\-]{4,})",
                r"FACTURE\s*N\s*(\d{6,})", r"FACTURE\s*#\s*(\d+)", r"FACTURE N°(\S+)"):
        m = re.search(pat, t, re.I)
        if m: return m.group(1).strip(" .,")
    return None

def date_de(t):
    for pat in (r"Invoice Date:\s*([A-Za-z]+ \d+, \d{4})", r"Estimate Date:\s*([A-Za-z]+ \d+, \d{4})", r"Date d.émission\s*:\s*(\w+ \d+, \d{4})",
                r"le (\d\d/\d\d/\d{4})", r"Date\s*:?\s*(\d\d/\d\d/\d{4})",
                r"(\d{1,2} (?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|Janvier|Juin|Juillet|Août|Mars|Mai) \d{4})"):
        m = re.search(pat, t)
        if m: return m.group(1)
    return None

def objet_de(t):
    for pat in (r"Objet\s*:\s*(.+?)(?: TOTAL| DÉSIGNATION| Désignation| Arrêtée| Réf\.| Date| Designation)",
                r"^(?:FACTURE|PROFORMA|RECU|DEVIS)\s+(.+?)\s+UPgraders", r"Services (?:Quantity|Rate) (?:Price )?Montant (.+?) (?:\d|Fr)",
                r"(Couverture photographique du tournage[^.]+?) pour"):
        m = re.search(pat, t, re.I)
        if m:
            o = m.group(1).strip()
            if len(o) > 3 and not o.lower().startswith("instructions"): return o[:140]
    return None

# Le client, nommé par son entité — jamais une personne privée.
CLIENTS_FACT = [
    (r"MC ?CANN|AGP/|\bDMC\b|_MCCANN", "McCann Douala"), (r"DELIFOODS|_8M_|Brief_Option|FP-2026-0[78]", "Delifoods × ADM"), (r"GoldenK|Golden K", "Golden K"), (r"AG PARTNERS", "AG Partners Cameroun"), (r"ALL LUXURY SUITES", "All Luxury Suites Group"),
    (r"CICC AKWA PALACE|Akwa Palace", "Akwa Palace (CICC)"), (r"DELIFOODS", "Delifoods × ADM"), (r"Matanga Agency", "Matanga Agency"),
    (r"CFAO", "CFAO Mobility Cameroon"), (r"Universal Music|UNIVERSAL MUSIC", "Universal Music Africa"), (r"EMPIRE", "Empire (management Cysoul)"),
    (r"AMMCO", "AMMCO"), (r"\bAUF\b|Agence universitaire", "AUF — Agence universitaire de la Francophonie"),
    (r"Banahealth", "BanaHealth"), (r"Business Event Solution|\bBES\b", "Business Event Solution"), (r"Business Facilities", "Business Facilities Corporation"),
    (r"\bCFI\b|Canal France", "CFI — Canal France International"), (r"Beausourire", "Clinique Beausourire"), (r"France Volontaires", "France Volontaires"),
    (r"Gimane", "Gimane SARL"), (r"IFC Douala", "IFC Douala"), (r"Impact Sante|IKITO", "Impact Santé Afrique"), (r"Xcape Quest", "Xcape Quest"),
    (r"SPAWT", "Spawt (Abidjan)"), (r"DENTSU", "Dentsu"), (r"Pacey|Joyce", "Pacey (Canada)"), (r"KossKoss|KOSS", "KossKoss Select"),
    (r"FRIESLANDCAMPINA IVORY", "FrieslandCampina Côte d'Ivoire"), (r"SOFAVINC", "SOFAVINC"), (r"PANZANI", "Panzani Cameroun"),
    (r"KEAMS", "KEAMS (podcast)"), (r"SABC", "SABC"), (r"MINSANTE|Shoppings bags 1 000", "Ministère de la Santé (RCA)"),
    (r"Bebey|YAPPI|Yappi|Happi|HAPPI|Audrey Obey|Nnanga|mariage|Wedding", "Particulier"),
    (r"Shooting photos Campagne Ramadan", "FrieslandCampina"), (r"Tropisme", "SCIC Tropisme"), (r"MOTION19|Motion19|Canon Eos", "MOTION19 (achat de matériel)"),
    (r"\bOMT\b|stylisme", "AG Partners Cameroun"), (r"cosplay|Deathstroke|Nubia", "Cosplayland237 (location)"),
    (r"Cap Est", "Matanga Agency"),
]
def client_de(nom, t):
    s = nom + " " + t[:1200]
    for pat, n in CLIENTS_FACT:
        if re.search(pat, s, re.I): return n
    return None

# Une opération = un groupe de pièces ; elle se rattache à un projet existant, ou en devient un.
OPS = [
    # (motif de reconnaissance, projet existant ou clé d'opération neuve, structure, nom, marque, nature)
    (r"McCann Douala", "PRJ-XC-134", "friends", None, "MQ-orange", None),
    (r"AG Partners Cameroun", "PRJ-XC-136", "friends", None, None, None),
    (r"Ready Party", "PRJ-XC-136", "friends", None, None, None),
    (r"Spawt \(Abidjan\)", "PRJ-XC-119", "upgraders", None, "MQ-spawt", None),
    (r"BanaHealth", "PRJ-XC-128", "upgraders", None, "MQ-banahealth", None),
    (r"KossKoss Select", "PRJ-XC-137", None, None, None, None),
    (r"SOFAVINC", "PRJ-XC-115", "matanga", None, None, None),
    (r"Matanga Agency", "PRJ-XC-108", "friends", None, "MQ-capesterias", None),
    (r"Impact Santé Afrique", "OP-ikito", "upgraders", "Dr Ikito — suite mémorielle (Impact Santé Afrique)", None, "edition"),
    (r"Akwa Palace \(CICC\)", "OP-akwa-resto", "friends", "Akwa Palace — photos du restaurant (2025)", "MQ-akwapalace", "film"),
    (r"All Luxury Suites", "OP-als-drone", "friends", "Kempinski Shekinah Palace — couverture drone de la pose de la première pierre (ALS Group, 2026)", None, "film"),
    (r"Universal Music Africa|Empire", "OP-universal-2021", "upgraders", "Universal Music Africa — couvertures photo 2021 (media tour Charlotte Dipanda, backstage Cysoul)", "MQ-universal", "film"),
    (r"CFAO Mobility", "OP-cfao-2025", "upgraders", "CFAO Mobility — lancement Peugeot : couverture, spot « Reveal », interviews (2025)", None, "film"),
    (r"AMMCO", "OP-ammco", "upgraders", "AMMCO — vidéos, documentaires et couvertures (2022-2024, dont Streetwhale 2024)", None, "film"),
    (r"AUF", "OP-auf-2024", "upgraders", "AUF — conception graphique d'un flyer (2024)", None, "edition"),
    (r"CFI", "OP-cfi-2024", "upgraders", "CFI — direction artistique et photographie (2024)", None, "film"),
    (r"Clinique Beausourire", "OP-beausourire-2024", "upgraders", "Clinique Beausourire — pack média corporate (2024)", None, "film"),
    (r"Gimane SARL", "OP-gimane-2024", "upgraders", "Maison Gimane — couverture du vernissage (2024)", None, "film"),
    (r"Business Event Solution", "OP-bes-2025", "upgraders", "Business Event Solution — 150 ans du Port de Douala-Bonabéri (2025)", None, "film"),
    (r"Business Facilities", "OP-bfc-2025", "upgraders", "Business Facilities Corporation — couverture vidéo (2025)", None, "film"),
    (r"France Volontaires", "OP-francevol-2025", "upgraders", "France Volontaires — identité de marque (2025)", None, "branding"),
    (r"IFC Douala|Cosplayland", "OP-ifc", "upgraders", "IFC Douala — prestation cosplay et couverture d'exposition (2025-2026)", None, "film"),
    (r"Xcape Quest", "OP-xcape-2025", "upgraders", "Xcape Quest — couverture d'un team building (2025)", None, "film"),
    (r"Dentsu", "OP-dentsu", "upgraders", "Dentsu — prestation UPgraders", None, "demande"),
    (r"Pacey", "OP-pacey-2026", "upgraders", "Pacey — retouche photos produits et GIF (2026)", None, "demande"),
    (r"Particulier", "OP-particuliers", None, "Commandes privées — mariages et séances (particuliers)", None, "film"),
]

groupes = {}
for h, x in EXT.items():
    t = x["texte"]
    nom = os.path.basename(x["fichiers"][0])
    if not t.strip() or t.startswith("ERREUR"):
        t = ""
    if BRUIT.search(t[:700] + nom): continue
    em = emetteur(t) or ("friends" if re.search(r"Friends_Photography|FPS|FriendsPhotography", nom) else
                         "upgraders" if re.search(r"upgraders|UPGRADERS", nom) else None)
    cl = client_de(nom, t)
    if not em and not cl: continue
    ref = ref_de(t)
    cle = (em, ref) if ref and not ref.lower().startswith(("unamo", "uvelles", "contrib", "raires", "services", "vembre")) else (em, cl, (objet_de(t) or nom)[:30])
    g = groupes.setdefault(cle, {"emetteur": em, "numero": ref if len(cle) == 2 else None, "client": cl, "objet": objet_de(t),
                                "date": date_de(t), "types": set(), "fichiers": []})
    g["types"].add(type_de(nom, t))
    g["fichiers"] += [f.replace(HOME, "~") for f in x["fichiers"]]
    g["objet"] = g["objet"] or objet_de(t); g["date"] = g["date"] or date_de(t); g["client"] = g["client"] or cl

d["factures"] = []
ops = {}
for cle, g in sorted(groupes.items(), key=lambda kv: str(kv[0])):
    types = sorted(g["types"])
    typ = "facture" if "facture" in types else "reçu" if "reçu" in types else "proforma" if "proforma" in types else "devis" if "devis" in types else types[0]
    f = {"id": "FAC-" + hashlib.md5(json.dumps(cle, default=str).encode()).hexdigest()[:10],
         "emetteur": g["emetteur"], "type": typ, "versions": types, "numero": g["numero"], "date": g["date"],
         "client": g["client"], "objet": g["objet"], "fichiers": sorted(set(g["fichiers"])), "releve_le": QUAND,
         "projetId": None}
    # Rattachement : seulement une pièce émise par une structure d'Alexandre ou par Matanga.
    if not g["client"] and re.search(r"ReadyParty", " ".join(f["fichiers"])): g["client"] = "Ready Party"
    if g["client"] == "Matanga Agency" and not re.search(r"Cap Est", (g["objet"] or "") + " ".join(f["fichiers"])):
        g["client"] = None      # une pièce rangée dans le dossier Matanga n'est pas une pièce adressée à Matanga
    if g["client"]:
        for pat, cible, struct, nom, mq, nature in OPS:
            if re.search(pat, g["client"]):
                f["operation"] = cible
                ops.setdefault(cible, {"struct": struct, "nom": nom, "mq": mq, "nature": nature, "pieces": []})["pieces"].append(f)
                break
    d["factures"].append(f); bilan["factures"] += 1

def struct_op(o):
    if o["struct"]: return o["struct"]
    ems = [p["emetteur"] for p in o["pieces"] if p["emetteur"] in ("upgraders", "friends", "nom-propre", "matanga")]
    return max(set(ems), key=ems.count) if ems else "friends"

for cible, o in ops.items():
    facturee = any(p["type"] in ("facture", "reçu") for p in o["pieces"])
    if cible.startswith("PRJ-"):
        p = P.get(cible)
        if not p: continue
        for f in o["pieces"]: f["projetId"] = cible
        p["factures"] = sorted({f["id"] for f in o["pieces"]} | set(p.get("factures", [])))
        bilan["liees"] += len(o["pieces"])
        ems = {f["emetteur"] for f in o["pieces"]}
        if cible == "PRJ-XC-108":
            p["sousTraitance"] = {"structure": "friends", "motif": "Devis FPS-24-06-17 : Friends Photography Studio exécute pour Matanga la production du spot Cap Esterias."}
        elif cible == "PRJ-XC-137" and "upgraders" in ems:
            p["structureNote"] = "Rangé chez Friends Studio (KOSS PIC — prestation photo) ; le devis de système de contenu KossKoss Select est émis par UPgraders."
        elif o["struct"] and p.get("structure") != o["struct"]:
            poser(p, o["struct"], "Les factures sont émises par " + o["struct"] + ".", "facture")
        continue
    if not facturee:          # un devis seul n'est pas une opération faite : il reste une pièce, rattachée à rien
        for f in o["pieces"]: f["operation"] = None
        continue
    pid = "PRJ-" + cible
    st = struct_op(o)
    dates = [f["date"] for f in o["pieces"] if f["date"]]
    ident = {"client": (o["pieces"][0]["client"] or ""), "clientId": None, "marqueIds": [o["mq"]] if o["mq"] else [],
             "marches": ["M-CM"], "fenetre": ", ".join(sorted(set(dates)))[:80], "type": "", "echeance": "", "budget": None,
             "decideur": "", "tueur": "", "circuit": ""}
    if o["mq"] and M.get(o["mq"]): ident["clientId"] = M[o["mq"]].get("clientId")
    if pid not in P:
        p = {"id": pid, "ref": cible.replace("OP-", "OP-").upper()[:18], "nom": o["nom"], "gabarit": "campagne", "nature": o["nature"] or "demande",
             "cree_le": QUAND, "statut": "creation", "equipe": [{"personne": "P-alex", "poste": "creation"}],
             "sections": {"identite": ident, "brief": {"verbatim": "Opération relevée depuis ses pièces de facturation : "
                          + " ; ".join(sorted({(f["objet"] or f["type"]) for f in o["pieces"]}))[:600]}, "pistes": []},
             "livrables": [], "volets": [], "insights": [], "territoires": [],
             "perimetre": {"supports": [], "marches": ["M-CM"]},
             "releve": {"source": "factures", "releve_le": QUAND},
             "factures": sorted({f["id"] for f in o["pieces"]}),
             "cloture": {"le": QUAND, "bilan": "", "releve": "facturée — " + ", ".join(sorted({(f["numero"] or f["type"]) for f in o["pieces"]}))[:200]}}
        d["projets"].append(p); P[pid] = p; bilan["projets"] += 1
        poser(p, st, "Structure émettrice de ses factures.", "facture")
        trace("création depuis les factures", "projets", pid, o["nom"])
    for f in o["pieces"]: f["projetId"] = pid

d["enregistre_le"] = QUAND
json.dump(d, open(DST, "w"), ensure_ascii=False, indent=1)
print(bilan)
import collections
print("par structure :", collections.Counter(p.get("structure") for p in d["projets"]))
print("factures par émetteur :", collections.Counter(f["emetteur"] for f in d["factures"]))
print("factures non rattachées :", [(f["emetteur"], f["type"], f["client"], (f["objet"] or "")[:40]) for f in d["factures"] if not f["projetId"]])
