# ranger-hors-matanga-2026.py — ce qui n'est pas Matanga, rangé sous UPgraders ; ce qui est à Alexandre, rangé au coffre.
#
# Demande d'Alex (06/10/2026), après la revue à l'œil des fichiers « sans marque lisible » :
#   « range aussi ce qui n'est pas matanga mais dans un dossier UPgraders tout simplement. Et ce qui est friends
#     photography studio est sous couvert UPgraders » · « Xtincell est sous couvert UPgraders aussi » ·
#   « Mes activités perso en tant qu'alexandre (cni, passeport, assurance, contrat…) peuvent aller dans mon vault privé »
#     — le coffre : Work 2026/07 PERSONNEL & DIVERS/Privé et partagé.
#
#   UPGRADERS — EXPORT DU TRAVAIL/
#     LISEZ-MOI.md · INDEX.md · _MANIFESTE-DEPLACEMENTS.csv · _ANNULER-LES-DEPLACEMENTS.command
#     _A-RAPATRIER-DEPUIS-ICLOUD.csv · _RAPATRIER-DEPUIS-ICLOUD.command
#     <client>/                          les clients UPgraders : Spawt, KOF, Musina… (PORTEUR.md : ce que LA BARRE en tient)
#       <dossiers d'origine>             ce qui était déjà rangé dans 02 VENTURES & MARQUES PROPRES garde sa forme
#       <AAAA>/Depuis <source>/…         ce que la revue à l'œil a reconnu ailleurs sur la machine
#     Friends Photography Studio/<client>/…   le studio photo, sous couvert UPgraders
#     Xtincell/…  ·  Xtincell/Beignet Paradise/…   la marque personnelle, sous couvert UPgraders
#     _UPgraders — la structure/…         statuts, RIB, NIU de la société, offres, prospection
#
# Le local est DÉPLACÉ (manifeste + commande d'annulation) ; la clé USB est copiée ; iCloud est indexé, jamais déplacé.
# Les pièces d'identité et papiers d'Alexandre vont au coffre, jamais dans un export : leur manifeste vit dans le coffre.
# Pictures/ (les shootings) ne bouge pas : Lightroom Classic les référence, et c'est Lightroom qui doit les déplacer.
#
# Usage :
#   python3 outils/ranger-hors-matanga-2026.py plan     <depot.json> <attributions.json> <dossier-sortie>   # rien ne bouge
#   python3 outils/ranger-hors-matanga-2026.py executer <plan.csv>                                          # déplace
#   python3 outils/ranger-hors-matanga-2026.py docs     <depot.json>                                        # .md de l'export

import json, sys, os, re, csv, datetime, unicodedata, shutil, collections, hashlib

HOME = os.path.expanduser("~")
DL = os.path.join(HOME, "Downloads")
WORK = os.path.join(DL, "Work 2026")
VENTURES = os.path.join(WORK, "02 VENTURES & MARQUES PROPRES")
ICLOUD = os.path.join(HOME, "Library/Mobile Documents/com~apple~CloudDocs")
RACINE = os.path.join(DL, "UPGRADERS — EXPORT DU TRAVAIL")
COFFRE = os.path.join(WORK, "07 PERSONNEL & DIVERS", "Privé et partagé")
FRIENDS = "Friends Photography Studio"
STRUCTURE = "_UPgraders — la structure"

def norme(t): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9&]+", " ", unicodedata.normalize("NFD", t or "").encode("ascii", "ignore").decode().lower())).strip()
def propre(t): return re.sub(r'[/:\\]+', "-", t).strip().rstrip(".")

# ————————————————— Où va chaque porteur —————————————————
# Le dossier client existant (02 VENTURES/CLIENTS UPGRADERS) fait foi pour le nom ; Friends est un sous-ensemble.
DOSSIER_U = {"KOF": "KOF - Kamer Otaku Fest", "Universal Music": "Universal Music - artistes", "UPgraders": STRUCTURE,
             "Dr Ikito": f"{FRIENDS}/Commandes privées/Dr Ikito — suite mémorielle"}
DOSSIER_F = {"Friends Studio": f"{FRIENDS}/_Le studio", "Commandes privées": f"{FRIENDS}/Commandes privées",
             "PEN&GRACE": f"{FRIENDS}/Commandes privées/PENGRACE — shooting prénuptial"}
def dossier_porteur(code):
    k, _, qui = code.partition(":")
    if k == "X": return "Xtincell"
    if k == "U": return DOSSIER_U.get(qui, propre(qui))
    if k == "F": return DOSSIER_F.get(qui, f"{FRIENDS}/{propre(qui)}")
    raise ValueError(code)

# Ce qui était déjà rangé sous 02 VENTURES garde sa forme, sous la bonne tête.
VENTURES_DEST = [("CLIENTS UPGRADERS/_Commandes privées", f"{FRIENDS}/Commandes privées"),
                 ("CLIENTS UPGRADERS/Orange Cameroun", f"{FRIENDS}/Orange Cameroun"),   # LA BARRE : Orange Cameroun · Friends Studio
                 ("CLIENTS UPGRADERS", ""), ("Friends Studio", f"{FRIENDS}/_Le studio"), ("UPgraders", STRUCTURE),
                 ("Beignet Paradise", "Xtincell/Beignet Paradise"), ("Xtincell", "Xtincell")]

# Les papiers d'Alexandre, reconnus à leur nom où qu'ils soient : ils vont au coffre, jamais dans l'export.
PRIVE_NOM = [("Identité", r"^passe?port|^niu djengue|\bcni (recto|verso)\b|acte de naissance"),
             ("Banque", r"bulletin de souscription.*\bfcp\b"), ("Contrats", r"^avenant matanga")]
def prive_par_nom(p):
    n = norme(os.path.splitext(os.path.basename(p))[0])
    return next((t for t, rx in PRIVE_NOM if re.search(rx, n)), None)

SOURCES = [(os.path.join(WORK, "08 A TRIER"), "Depuis 08 A TRIER"), (os.path.join(WORK, "07 PERSONNEL & DIVERS"), "Depuis 07 PERSONNEL & DIVERS"),
           (os.path.join(WORK, "04 RESSOURCES"), "Depuis 04 RESSOURCES"), (os.path.join(WORK, "05 ADMIN & GESTION"), "Depuis 05 ADMIN & GESTION"),
           (os.path.join(WORK, "NON CLASSES"), "Depuis NON CLASSES"), (WORK, "Depuis Work 2026"), ("/Volumes/NO NAME", "Depuis la clé NO NAME"),
           (ICLOUD, "Depuis iCloud"), (os.path.join(HOME, "Desktop"), "Depuis le Bureau"), (os.path.join(HOME, "Movies"), "Depuis Vidéos"),
           (DL, "Depuis Téléchargements"), (HOME, "Depuis le dossier personnel")]
NE_BOUGE_PAS = re.compile(r"^" + re.escape(os.path.join(HOME, "Pictures")) + r"/|/MATANGA — EXPORT DU TRAVAIL/|/UPGRADERS — EXPORT DU TRAVAIL/|"
                          r"/03 OUTILS & DEV/|/06 LOGICIELS|/Downloads/Smash/|^" + re.escape(HOME) + r"/(FUKU|MATANGA BONNET ROUGE)/|/\.")

CODE = re.compile(r"/Spawt/08 PRODUIT & APPLICATION/MVP mobile/")   # l'application Spawt : un projet de code, il ne bouge pas

def annee(x, rel):
    ans = re.findall(r"(?<!\d)(20[12]\d)(?!\d)", rel)
    if ans: return ans[-1]
    m = re.match(r"^\d{4}(20[12]\d)", os.path.basename(rel))   # 14062026-IMG_… : jjmmaaaa
    return m.group(1) if m else str(datetime.datetime.fromtimestamp(x["m"]).year)

def md5(q, cache={}):
    if q not in cache:
        h = hashlib.md5()
        with open(q, "rb") as fh:
            for b in iter(lambda: fh.read(1 << 20), b""): h.update(b)
        cache[q] = h.hexdigest()
    return cache[q]

def ecrire(chemin, texte):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8") as f: f.write(texte.rstrip() + "\n")

MODE = sys.argv[1]
CHAMPS = ["source", "destination", "motif", "taille", "op"]

if MODE == "plan":
    _, _, DEPOT, ATTR, SORTIE = sys.argv
    os.makedirs(SORTIE, exist_ok=True)
    upg, prive, icloud_u, icloud_p, matanga, copies, restent = [], [], [], [], [], [], collections.Counter()
    # 1 · 02 VENTURES & MARQUES PROPRES, tel quel, sous sa nouvelle tête.
    for dp, dn, fn in os.walk(VENTURES):
        # Un dossier de code reste où il est, entier : ses fichiers cachés (.gitignore, .claude, .env.example) vont avec lui.
        dn[:] = [d for d in dn if not CODE.search(os.path.join(dp, d) + os.sep)]
        for f in fn:
            if f in (".DS_Store", "LISEZ-MOI — déplacé.md"): continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, VENTURES)
            t = prive_par_nom(p)
            if t: prive.append({"source": p, "destination": os.path.join(COFFRE, t, f), "motif": f"P:{t} · par le nom", "taille": os.path.getsize(p), "op": "deplacer"}); continue
            pre, tete = next((a, b) for a, b in VENTURES_DEST if rel == a or rel.startswith(a + os.sep))
            upg.append({"source": p, "destination": os.path.join(RACINE, tete, os.path.relpath(rel, pre)), "motif": "02 VENTURES · " + (tete or "client UPgraders"),
                        "taille": os.path.getsize(p), "op": "deplacer"})
    # Les papiers d'Alexandre que la revue n'a pas vus (avenant au contrat Matanga posé dans Téléchargements, CNI dans 08 A TRIER).
    deja = {l["source"] for l in prive}
    for base, prof in ((DL, False), (os.path.join(WORK, "08 A TRIER"), True)):
        for dp, dn, fn in os.walk(base):
            if not prof: dn[:] = []
            for f in fn:
                p = os.path.join(dp, f); t = prive_par_nom(p)
                if t and p not in deja:
                    prive.append({"source": p, "destination": os.path.join(COFFRE, t, f), "motif": f"P:{t} · par le nom", "taille": os.path.getsize(p), "op": "deplacer"}); deja.add(p)
    # Les copies : même taille, même extension, même contenu qu'un fichier de VENTURES ou de l'export.
    par_taille = collections.defaultdict(list)
    for base in (VENTURES, RACINE):
        for dp, dn, fn in os.walk(base):
            for f in fn:
                q = os.path.join(dp, f)
                try: par_taille[(os.path.getsize(q), os.path.splitext(f)[1].lower())].append(q)
                except OSError: pass
    def copie(x):
        cands = par_taille.get((x["s"], os.path.splitext(x["p"])[1].lower()))
        if not cands: return None
        if x.get("dl"): return cands[0]
        h = md5(x["p"]); return next((c for c in cands if md5(c) == h), None)
    # 2 · Ce que la revue à l'œil a attribué.
    for x in json.load(open(ATTR)):
        p, code = x["p"], x["code"]
        if not os.path.exists(p) or p.startswith(VENTURES + os.sep): continue
        t = prive_par_nom(p)
        if t:
            if p in deja: continue
            code = "P:" + t
        if code.startswith("F:PEN&GRACE") and not re.match(r"^14062026", os.path.basename(p)): code = "F:Commandes privées"   # la grappe mêle deux shootings
        k = code.split(":")[0]
        if k in "?RL" or NE_BOUGE_PAS.search(p):
            restent[k if k in "?RL" else "Pictures et dossiers outils"] += 1; continue
        if k == "M":
            mq, _, op = code[2:].partition("+")
            y = dict(x); y["marque"] = mq
            if op == "copie": y["op"] = "copier"
            matanga.append(y); continue
        src, lib = next(((r, l) for r, l in SOURCES if p.startswith(r + os.sep)), (os.path.dirname(p), "Depuis " + os.path.basename(os.path.dirname(p))))
        rel = os.path.relpath(p, src)
        op = "copier" if p.startswith("/Volumes/") else "deplacer"
        if k == "P":
            if p.startswith(COFFRE + os.sep): continue
            ligne = {"source": p, "destination": os.path.join(COFFRE, code[2:], os.path.basename(p)), "motif": code, "taille": x["s"], "op": op}
            (icloud_p if p.startswith(ICLOUD) else prive).append(ligne); continue
        if copie(x): copies.append(p); continue
        ligne = {"source": p, "destination": os.path.join(RACINE, dossier_porteur(code), annee(x, rel), lib, rel), "motif": code, "taille": x["s"], "op": op}
        (icloud_u if p.startswith(ICLOUD) else upg).append(ligne)
    vus = set()
    for l in upg + prive + icloud_u + icloud_p:
        dst = l["destination"]; b, e = os.path.splitext(dst); n = 2
        while dst in vus or os.path.exists(dst): dst = f"{b} ({n}){e}"; n += 1
        vus.add(dst); l["destination"] = dst
    for nom, xs in (("plan-upgraders.csv", upg), ("plan-prive.csv", prive), ("icloud-upgraders.csv", icloud_u), ("icloud-prive.csv", icloud_p)):
        with open(os.path.join(SORTIE, nom), "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=CHAMPS); w.writeheader(); w.writerows(xs)
    json.dump(matanga, open(os.path.join(SORTIE, "classe-matanga.json"), "w"), ensure_ascii=False)
    def resume(xs, racine):
        c = collections.Counter(); s = collections.Counter()
        for l in xs:
            r = os.path.relpath(l["destination"], racine).split(os.sep)
            k = os.sep.join(r[:2]) if r[0] in (FRIENDS, "Xtincell") and len(r) > 2 else r[0]
            c[k] += 1; s[k] += int(l["taille"])
        return [f"- {k} — {v} fichiers, {s[k] / 1e9:.2f} Go" for k, v in sorted(c.items())]
    R = [f"# Hors Matanga — plan du {datetime.date.today()}\n",
         f"UPgraders (local) : {len(upg)} fichiers, {sum(int(l['taille']) for l in upg) / 1e9:.1f} Go — dont 02 VENTURES tel quel.",
         f"UPgraders (iCloud, indexé) : {len(icloud_u)} · Coffre (local) : {len(prive)} · Coffre (iCloud, indexé) : {len(icloud_p)}.",
         f"Matanga, à passer à l'exporteur Matanga : {len(matanga)} · Copies déjà rangées, laissées en place : {len(copies)}.",
         "Restent en place : " + ", ".join(f"{k} {v}" for k, v in restent.items()) + ".\n", "## UPgraders, par dossier\n"] + resume(upg, RACINE)
    open(os.path.join(SORTIE, "rapport.md"), "w").write("\n".join(R))
    print("\n".join(R[:5]))

elif MODE == "executer":
    lignes = list(csv.DictReader(open(sys.argv[2], encoding="utf-8")))
    if not lignes: print("rien à faire"); sys.exit()
    racine = COFFRE if lignes[0]["destination"].startswith(COFFRE + os.sep) else RACINE
    manif = os.path.join(racine, "_MANIFESTE-RANGEMENT-2026-10.csv" if racine == COFFRE else "_MANIFESTE-DEPLACEMENTS.csv")
    os.makedirs(racine, exist_ok=True)
    neuf = not os.path.exists(manif); n = 0; echecs = []
    with open(manif, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if neuf: w.writerow(["source", "destination", "op"])
        for l in lignes:
            s, t = l["source"], l["destination"]
            if not os.path.exists(s) or os.path.exists(t): continue
            try:
                os.makedirs(os.path.dirname(t), exist_ok=True)
                (shutil.copy2 if l["op"] == "copier" else shutil.move)(s, t)
                w.writerow([s, t, l["op"]]); n += 1
            except OSError as e: echecs.append(f"{s} — {e}")
    annuler = os.path.join(racine, "_ANNULER-LES-DEPLACEMENTS.command" if racine == RACINE else "_ANNULER-LE-RANGEMENT-2026-10.command")
    ecrire(annuler, f'''#!/bin/bash
# Remet chaque fichier déplacé à sa place d'origine (chemins absolus du manifeste). Une copie (clé USB) n'est que retirée de l'export si l'original existe.
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
import csv, os, shutil
n = 0
for r in csv.DictReader(open("{os.path.basename(manif)}", encoding="utf-8")):
    s, t = r["source"], r["destination"]
    if not os.path.exists(t): continue
    if r.get("op") == "copier":
        continue
    if not os.path.exists(s):
        os.makedirs(os.path.dirname(s), exist_ok=True); shutil.move(t, s); n += 1
print("restaurés :", n)
PY''')
    os.chmod(annuler, 0o755)
    # Les dossiers vidés par le déplacement : on les retire, sauf la racine 02 VENTURES qui reçoit un mot de renvoi.
    for l in lignes:
        d = os.path.dirname(l["source"])
        while d.startswith(WORK + os.sep) and d != VENTURES and os.path.isdir(d):
            reste = [f for f in os.listdir(d) if f != ".DS_Store"]
            if reste: break
            try: shutil.rmtree(d)
            except OSError: break
            d = os.path.dirname(d)
    if any(l["source"].startswith(VENTURES + os.sep) for l in lignes):
        ecrire(os.path.join(VENTURES, "LISEZ-MOI — déplacé.md"), f"""# 02 VENTURES & MARQUES PROPRES — déplacé le {datetime.date.today()}

Tout ce dossier vit désormais dans `Téléchargements/UPGRADERS — EXPORT DU TRAVAIL/` :
les clients UPgraders à la racine, Friends Photography Studio et Xtincell (avec Beignet Paradise) sous couvert UPgraders,
les papiers de la société dans `{STRUCTURE}/`. Les pièces d'identité d'Alexandre sont au coffre (`07 PERSONNEL & DIVERS/Privé et partagé`).

Reste ici, exprès : `CLIENTS UPGRADERS/Spawt/08 PRODUIT & APPLICATION/MVP mobile/` — le code de l'application Spawt.
Un projet de code ne se déplace pas : ses réglages (.claude, .github, .env) pointent vers ce chemin.

Pour tout remettre ici : `_ANNULER-LES-DEPLACEMENTS.command` dans l'export.""")
    print(n, "fichiers →", racine, "·", len(echecs), "échecs")
    for e in echecs[:20]: print("  ÉCHEC", e)

elif MODE == "docs":
    d = json.load(open(sys.argv[2]))
    C = {c["id"]: c for c in d["clients"]}
    P = [p for p in d["projets"] if not p.get("fusionne") and (p.get("structure") or "matanga") in ("upgraders", "friends")]
    def porteur_camp(c): return c["nom"].split(" — ")[0]
    CAMP = {c["id"]: c for c in d["campagnes"]}
    par_porteur = collections.defaultdict(list)
    for p in P:
        c = CAMP.get(p.get("campagneId"))
        qui = porteur_camp(c) if c else (C.get(((p.get("sections") or {}).get("identite") or {}).get("clientId")) or {}).get("nom", "?")
        par_porteur[qui].append(p)
    # Un porteur LA BARRE → son dossier dans l'export.
    def dossier_de(qui, structure):
        for code in (("F:" if structure == "friends" else "U:") + qui, "U:" + qui, "F:" + qui):
            cand = os.path.join(RACINE, dossier_porteur(code))
            if os.path.isdir(cand): return cand
        return None
    def compte(dos):
        n = s = 0
        for dp, dn, fn in os.walk(dos):
            for f in fn:
                if not f.endswith(".md") and not f.startswith("."): n += 1; s += os.path.getsize(os.path.join(dp, f))
        return n, s
    index = []
    for qui, ps in sorted(par_porteur.items()):
        dos = dossier_de(qui, ps[0].get("structure"))
        if not dos: index.append((qui, None, ps)); continue
        L = [f"# {qui}\n", f"Ce que LA BARRE tient sur ce porteur ({len(ps)} projet{'s' if len(ps) > 1 else ''}) — généré le {datetime.date.today()}.\n"]
        for p in ps:
            i = (p.get("sections") or {}).get("identite") or {}
            c = CAMP.get(p.get("campagneId"))
            L.append(f"## {p.get('ref') or p['id']} — {p['nom']}")
            if c: L.append(f"- Campagne : {c['nom']}")
            if i.get("fenetre"): L.append(f"- Fenêtre : {i['fenetre'] if isinstance(i['fenetre'], str) else json.dumps(i['fenetre'], ensure_ascii=False)}")
            if p.get("cloture"): L.append(f"- Clos le {p['cloture'].get('le', '?')}")
            L.append("")
        ecrire(os.path.join(dos, "PORTEUR.md"), "\n".join(L))
        index.append((qui, dos, ps))
    lignes = []
    for tete in sorted(os.listdir(RACINE)):
        q = os.path.join(RACINE, tete)
        if not os.path.isdir(q): continue
        subs = [s for s in sorted(os.listdir(q)) if os.path.isdir(os.path.join(q, s))] if tete in (FRIENDS, "Xtincell") else []
        n, s = compte(q)
        lignes.append(f"| **{tete}** | {n} | {s / 1e9:.2f} Go |")
        for sub in subs:
            n2, s2 = compte(os.path.join(q, sub))
            lignes.append(f"| ↳ {sub} | {n2} | {s2 / 1e9:.2f} Go |")
    sans = [qui for qui, dos, _ in index if not dos]
    ecrire(os.path.join(RACINE, "INDEX.md"), "\n".join([f"# UPGRADERS — index ({datetime.date.today()})\n",
        "| Dossier | Fichiers | Poids |", "|---|---:|---:|"] + lignes +
        ["", "## Porteurs que LA BARRE connaît sans dossier ici", ""] + [f"- {q}" for q in sans] +
        ["", "« Sans dossier ici » ne veut pas dire « pas fait » : les pièces peuvent être dans iCloud (voir `_A-RAPATRIER-DEPUIS-ICLOUD.csv`)",
         "ou dans Images (les shootings, que Lightroom référence)."]))
    ecrire(os.path.join(RACINE, "LISEZ-MOI.md"), f"""# UPGRADERS — export du travail

Tout ce qui n'est pas du travail Matanga, rangé sous UPgraders (demande d'Alexandre, 06/10/2026).

- **Un dossier par client UPgraders** à la racine (Spawt, KOF, Musina…). `PORTEUR.md` y dit ce que LA BARRE en tient.
  Ce qui était déjà rangé dans `02 VENTURES & MARQUES PROPRES` garde sa forme ; ce que la revue à l'œil a reconnu
  ailleurs sur la machine arrive dans `<année>/Depuis <source>/`.
- **{FRIENDS}/** — le studio photo, sous couvert UPgraders : ses clients, ses commandes privées, et `_Le studio`.
- **Xtincell/** — la marque personnelle d'Alexandre, sous couvert UPgraders, avec **Beignet Paradise**.
- **{STRUCTURE}/** — la société elle-même : statuts, RIB, NIU, offres, prospection. Ne pas envoyer tel quel.

## Ce qui n'est pas ici, exprès

- **Les pièces d'identité et papiers d'Alexandre** (passeport, CNI, NIU personnel, contrats, assurances, banque) :
  au coffre, `Work 2026/07 PERSONNEL & DIVERS/Privé et partagé/`, avec leur propre manifeste.
- **Les shootings de `Images/`** (Kamer Otaku Festival 2025, CFAO, Doual'art, Pacey) : Lightroom Classic les référence.
  Les déplacer à la main casserait le catalogue ; c'est depuis Lightroom (clic droit sur le dossier → déplacer) qu'il faut le faire.
- **Le contenu iCloud** : indexé dans `_A-RAPATRIER-DEPUIS-ICLOUD.csv`. `_RAPATRIER-DEPUIS-ICLOUD.command` le télécharge
  et le copie ici quand la bande passante le permet — rien n'est retiré d'iCloud.

## Revenir en arrière

`_ANNULER-LES-DEPLACEMENTS.command` remet chaque fichier à sa place d'origine, d'après `_MANIFESTE-DEPLACEMENTS.csv`.""")
    print(len(index), "porteurs ·", len(sans), "sans dossier")
