# rangement.py — ranger et fusionner les exports UPgraders et le coffre personnel sur l'ordi dédié.
#
# Écrit le 13/10/2026 sur l'iMac Matanga, à partir de ce qu'ont appris le rangement de l'iMac et la fusion de la clé
# Ventoy. Tourne sous Windows comme sous macOS, avec Python 3.9 ou plus, sans dépendance.
#
#   python rangement.py inventaire <racine> [<racine>…]           → inventaire.csv (chemin, taille, date, sha1)
#   python rangement.py controler  <export> --type upgraders|matanga|coffre
#                                                                 → controle.md + plan-corrections.csv, rien ne bouge
#   python rangement.py fusionner  <source> <destination> [--copier]
#                                                                 → plan-fusion.csv, rien ne bouge
#   python rangement.py appliquer  <plan.csv> [--copier]          → exécute un plan relu ; manifeste + annulation
#   python rangement.py annuler    <manifeste.csv> [--a-sec]      → remet chaque fichier à sa place
#
# Les plans ont les colonnes actuel, nouveau, motif (chemins absolus). On les relit, on les corrige au besoin,
# puis on les applique. Rien n'est jamais supprimé : un doublon part dans <export>/_archive/doublons/.
import csv, hashlib, os, re, shutil, sys, datetime, unicodedata
from collections import defaultdict

TRAVAIL = os.path.join(os.path.expanduser("~"), "_travail-rangement")
IGNORER = {".git", "node_modules", "__pycache__", ".DS_Store", "Thumbs.db", "desktop.ini", "System Volume Information", "$RECYCLE.BIN"}
EXE = {".ai", ".psd", ".psb", ".eps"}
QUAND = lambda: datetime.datetime.now().isoformat(timespec="minutes")

def nfc(t): return unicodedata.normalize("NFC", t).replace("’", "'")

def L(p):
    """Chemin long sous Windows : sans le préfixe \\\\?\\, tout ce qui dépasse 260 caractères échoue."""
    p = os.path.abspath(p)
    if os.name == "nt" and not p.startswith("\\\\?\\"): return "\\\\?\\" + p
    return p

def sha1(p):
    h = hashlib.sha1()
    with open(L(p), "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def fichiers(racine):
    for r, ds, fs in os.walk(L(racine)):
        ds[:] = [d for d in ds if d not in IGNORER and not d.startswith(".")]
        for f in fs:
            if f in IGNORER or f.startswith(".") or f.startswith("~$"): continue
            p = os.path.join(r, f)
            if os.name == "nt": p = p[4:] if p.startswith("\\\\?\\") else p
            if os.path.isfile(L(p)): yield p          # une entrée fantôme (clé retirée sans éjection) ne compte pas

def ecrire_csv(nom, entetes, lignes):
    os.makedirs(TRAVAIL, exist_ok=True); p = os.path.join(TRAVAIL, nom)
    with open(p, "w", newline="", encoding="utf-8") as o:
        w = csv.writer(o); w.writerow(entetes); w.writerows(lignes)
    return p

# ———————————————————————— inventaire ————————————————————————
def inventaire(racines):
    lignes = []
    for r in racines:
        for p in fichiers(r):
            st = os.stat(L(p))
            lignes.append([p, st.st_size, datetime.datetime.fromtimestamp(st.st_mtime).isoformat(timespec="minutes"), sha1(p)])
    print(len(lignes), "fichiers ·", round(sum(l[1] for l in lignes) / 1e9, 1), "Go ·",
          ecrire_csv("inventaire.csv", ["chemin", "taille", "modifie", "sha1"], lignes))

# ———————————————————————— contrôle d'un export ————————————————————————
def controler(export, genre):
    export = os.path.abspath(export)
    corr, notes, vus = [], defaultdict(list), {}
    par_taille = defaultdict(list)
    for p in fichiers(export): par_taille[os.path.getsize(L(p))].append(p)
    for taille, ps in par_taille.items():
        if len(ps) < 2: continue
        for p in sorted(ps, key=len):
            h = sha1(p)
            if h in vus:
                dst = os.path.join(export, "_archive", "doublons", os.path.relpath(p, export))
                corr.append([p, dst, "copie identique de « %s »" % os.path.relpath(vus[h], export)])
            else: vus[h] = p
    for r, ds, fs in os.walk(L(export)):
        r0 = r[4:] if r.startswith("\\\\?\\") else r
        rel = os.path.relpath(r0, export); parts = [] if rel == "." else rel.split(os.sep)
        if "_archive" in parts: ds[:] = []; continue
        for f in fs + ds:
            if nfc(f) != f: notes["noms à normaliser (Unicode décomposé ou apostrophe courbe)"].append(os.path.join(rel, f))
        for f in fs:
            p = os.path.join(r0, f)
            if os.path.splitext(f)[1].lower() in EXE and "EXE" not in parts and len(parts) >= 1:
                corr.append([p, os.path.join(r0, "EXE", f), "règle d'Alex : les sources .ai .psd .psb .eps dans EXE/"])
        if genre == "matanga" and len(parts) >= 2 and re.fullmatch(r"(19|20)\d\d", parts[-1]) and parts[-2] != "Le long de l'année" \
                and nfc(parts[-2]) != "Le long de l'année" and "Campagnes ponctuelles" not in parts:
            notes["années posées sous la marque, sans « Le long de l'année »"].append(rel)
        if genre == "coffre" and len(parts) == 1 and parts[0] not in COFFRE and not parts[0].startswith("_"):
            notes["dossiers du coffre hors des catégories"].append(rel)
        if not fs and not ds: notes["dossiers vides (à archiver, pas à supprimer)"].append(rel)
    if genre == "upgraders":
        clients = {nfc(d) for d in os.listdir(L(export)) if os.path.isdir(L(os.path.join(export, d)))}
        notes["clients absents de la liste de l'iMac (nouveaux, ou mal nommés ?)"] = sorted(c for c in clients
            if c not in CLIENTS_UPGRADERS and not c.startswith("_"))
    p = ecrire_csv("plan-corrections.csv", ["actuel", "nouveau", "motif"], corr)
    md = ["# Contrôle de « %s » (%s) — %s" % (os.path.basename(export), genre, QUAND()), "",
          "- Corrections proposées dans `plan-corrections.csv` : %d (doublons et EXE). Rien n'a bougé." % len(corr), ""]
    for k, v in notes.items():
        md += ["## " + k + " (%d)" % len(v), ""] + ["- `%s`" % x for x in v[:200]] + ([""] if len(v) <= 200 else ["- … et %d autres" % (len(v) - 200), ""])
    open(os.path.join(TRAVAIL, "controle.md"), "w", encoding="utf-8").write("\n".join(md))
    print(len(corr), "corrections proposées ·", {k: len(v) for k, v in notes.items()}, "→", os.path.join(TRAVAIL, "controle.md"))

# ———————————————————————— fusion de deux exports ————————————————————————
def fusionner(source, dest, copier):
    source, dest = os.path.abspath(source), os.path.abspath(dest)
    src = list(fichiers(source))
    tailles = {os.path.getsize(L(p)) for p in src}
    present = {}
    for p in fichiers(dest):                     # la destination n'est hachée que là où une taille correspond
        if os.path.getsize(L(p)) in tailles: present.setdefault(sha1(p), p)
    lignes, deja = [], 0
    for p in sorted(src):
        h = sha1(p)
        if h in present: deja += 1; continue
        rel = nfc(os.path.relpath(p, source))
        cible = os.path.join(dest, rel)
        if os.path.splitext(cible)[1].lower() in EXE and "EXE" not in rel.split(os.sep)[:-1]:
            cible = os.path.join(os.path.dirname(cible), "EXE", os.path.basename(cible))
        if os.path.basename(cible) in ("PORTEUR.md", "MARQUE.md", "CAMPAGNE.md") and os.path.exists(L(cible)):
            cible = cible[:-3] + " — relevé de la source.md"
        lignes.append([p, cible, "fusion depuis « %s »" % os.path.basename(source)])
    pl = ecrire_csv("plan-fusion.csv", ["actuel", "nouveau", "motif"], lignes)
    print(len(src), "fichiers dans la source ·", len(lignes), "à", "copier" if copier else "déplacer", "·", deja,
          "déjà présents à l'identique dans la destination →", pl)

# ———————————————————————— appliquer un plan, annuler ————————————————————————
def libre(p):
    if not os.path.exists(L(p)): return p
    b, e = os.path.splitext(p); k = 2
    while os.path.exists(L("%s (%d)%s" % (b, k, e))): k += 1
    return "%s (%d)%s" % (b, k, e)

def appliquer(plan, copier):
    rows = list(csv.DictReader(open(plan, encoding="utf-8")))
    if not rows: print("plan vide"); return
    racine = os.path.commonpath([os.path.dirname(r["nouveau"]) for r in rows])
    man = os.path.join(racine, "_MANIFESTE-%s.csv" % datetime.date.today().isoformat()); neuf = not os.path.exists(L(man))
    n = 0
    with open(L(man), "a", newline="", encoding="utf-8") as o:
        w = csv.writer(o)
        if neuf: w.writerow(["ancien", "nouveau", "motif", "quand", "sha1", "op"])
        for r in rows:
            s, t = r["actuel"], libre(r["nouveau"])
            if not os.path.exists(L(s)): continue
            h = sha1(s) if os.path.isfile(L(s)) else ""
            os.makedirs(L(os.path.dirname(t)), exist_ok=True)
            if copier:
                shutil.copy2(L(s), L(t))
                if h and sha1(t) != h: raise SystemExit("copie altérée : " + t)
            else: shutil.move(L(s), L(t))
            w.writerow([s, t, r.get("motif", ""), QUAND(), h, "copier" if copier else "deplacer"]); o.flush(); n += 1
    print(n, "fichiers", "copiés" if copier else "déplacés", "· manifeste :", man)
    print("pour défaire : python rangement.py annuler \"%s\"" % man)

def annuler(manifeste, a_sec):
    rows = list(csv.DictReader(open(manifeste, encoding="utf-8")))
    archive = os.path.join(os.path.dirname(manifeste), "_archive", "copies retirées")
    for r in reversed(rows):
        t, s = r["nouveau"], r["ancien"]
        if not os.path.exists(L(t)): continue
        if r.get("op") == "copier":             # une copie ne se supprime pas : elle part à l'archive
            d = os.path.join(archive, os.path.basename(t)); print(("rangerait " if a_sec else "range ") + t + " → archive")
            if not a_sec: os.makedirs(L(archive), exist_ok=True); shutil.move(L(t), L(libre(d)))
        else:
            print(("remettrait " if a_sec else "remet ") + t + " → " + s)
            if not a_sec: os.makedirs(L(os.path.dirname(s)), exist_ok=True); shutil.move(L(t), L(libre(s)))

# ———————————————————————— références de l'iMac (13/10/2026) ————————————————————————
COFFRE = {"Abonnements", "Administratif", "Assurances", "Banque", "Carrière", "Contrats", "Correspondance", "Identité", "Logement", "Voyages"}
CLIENTS_UPGRADERS = {nfc(x) for x in """AMMCO|Akwa Palace|Anatomy by Roida|Arc en Ciel|BFA — Business Femmes Actives|BanaHealth|Cosmos Bubble Tea|
Divine Afro Hair|Fantribe|France Volontaires|Friends Photography Studio|Godliner|Goodlocs|Grand Prix de caisse à savon de Yaoundé|IFC Douala|
KOF - Kamer Otaku Fest|Kinara|Kwatta Vibes|MLD|MOTION19|Massanda Awe Coffee|Meta Trade|Musina|NYAMA|Paradis des Anges|Shakazz|Shinkiro|Spawt|
StreetWhale|Universal Music - artistes|Villa Corso|Xtincell""".replace("\n", "").split("|")}

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__ if __doc__ else open(__file__, encoding="utf-8").read().split("import csv")[0]); sys.exit()
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    if a[0] == "inventaire": inventaire([x for x in a[1:] if not x.startswith("--")])
    elif a[0] == "controler": controler(a[1], opt("--type") or "upgraders")
    elif a[0] == "fusionner": fusionner(a[1], a[2], "--copier" in a)
    elif a[0] == "appliquer": appliquer(a[1], "--copier" in a)
    elif a[0] == "annuler": annuler(a[1], "--a-sec" in a)
    else: print("commande inconnue :", a[0])
