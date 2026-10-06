# reclasser-2026.py — renommer ou changer de dossier un fichier déjà rangé dans un export, sans perdre son origine.
#
# Les deux exports (MATANGA — et UPGRADERS — EXPORT DU TRAVAIL) tiennent chacun un manifeste source → destination qui
# permet d'annuler. Un fichier qu'on renomme, ou qu'on fait passer d'un export à l'autre, garde sa SOURCE d'origine :
# sa ligne quitte le manifeste qui la tenait et rejoint celui de l'export où il arrive, avec sa nouvelle destination.
# Chaque geste s'écrit aussi au journal `_JOURNAL-RECLASSEMENT.csv` de l'export d'arrivée (ancien, nouveau, motif, quand),
# que le mode `base` relit pour réécrire les chemins de LA BARRE.
#
# Usage :
#   python3 outils/reclasser-2026.py appliquer <gestes.csv>               # colonnes : actuel, nouveau, motif
#   python3 outils/reclasser-2026.py base      <base.json> <sortie.json>  # suit les fichiers renommés dans la base

import csv, os, sys, shutil, datetime, json

HOME = os.path.expanduser("~")
DL = os.path.join(HOME, "Downloads")
WORK = os.path.join(DL, "Work 2026")
RACINES = {"matanga": os.path.join(DL, "MATANGA — EXPORT DU TRAVAIL"), "upgraders": os.path.join(DL, "UPGRADERS — EXPORT DU TRAVAIL"),
           "coffre": os.path.join(WORK, "07 PERSONNEL & DIVERS", "Privé et partagé")}   # les papiers d'Alexandre : jamais dans un export
MANIFESTES = {"matanga": "_MANIFESTE-DEPLACEMENTS.csv", "upgraders": "_MANIFESTE-DEPLACEMENTS.csv", "coffre": "_MANIFESTE-RANGEMENT-2026-10.csv"}
JOURNAL = "_JOURNAL-RECLASSEMENT.csv"

def racine_de(p):
    return next((k for k, r in RACINES.items() if p.startswith(r + os.sep)), None)

class Manifeste:
    """Matanga écrit ses chemins relatifs à ~/Downloads (source, destination) ; UPgraders les écrit absolus (+ op)."""
    def __init__(self, cle):
        self.cle = cle; self.chemin = os.path.join(RACINES[cle], MANIFESTES[cle])
        self.rel = cle == "matanga"
        self.lignes = list(csv.DictReader(open(self.chemin, encoding="utf-8"))) if os.path.exists(self.chemin) else []
        self.par_dest = {self.abs(l["destination"]): i for i, l in enumerate(self.lignes)}
    def abs(self, p): return os.path.normpath(os.path.join(DL, p)) if self.rel else p
    def ecrit(self, p): return os.path.relpath(p, DL) if self.rel else p
    def retirer(self, dest):
        i = self.par_dest.pop(dest, None)
        if i is None: return None
        l = self.lignes[i]; self.lignes[i] = None
        return {"source": self.abs(l["source"]), "op": l.get("op") or "deplacer"}
    def ajouter(self, source, dest, op):
        self.lignes.append({"source": self.ecrit(source), "destination": self.ecrit(dest), "op": op})
        self.par_dest[dest] = len(self.lignes) - 1
    def sauver(self):
        champs = ["source", "destination"] + ([] if self.rel else ["op"])
        with open(self.chemin, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=champs, extrasaction="ignore"); w.writeheader()
            w.writerows(l for l in self.lignes if l)

MODE = sys.argv[1]

if MODE == "appliquer":
    gestes = list(csv.DictReader(open(sys.argv[2], encoding="utf-8")))
    M = {k: Manifeste(k) for k in RACINES}
    quand = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    journaux = {k: [] for k in RACINES}; n = 0; echecs = []
    for g in gestes:
        a, b = g["actuel"], g["nouveau"]
        ka, kb = racine_de(a), racine_de(b)
        if not ka or not kb or ka == "coffre": echecs.append(f"hors des exports : {a}"); continue
        if not os.path.exists(a): echecs.append(f"introuvable : {a}"); continue
        if a == b: continue
        base, ext = os.path.splitext(b); k = 2
        while os.path.exists(b): b = f"{base} ({k}){ext}"; k += 1
        os.makedirs(os.path.dirname(b), exist_ok=True)
        shutil.move(a, b); n += 1
        orig = M[ka].retirer(a) or {"source": a, "op": "deplacer"}
        M[kb].ajouter(orig["source"], b, orig["op"])
        journaux[kb].append([a, b, g.get("motif", ""), quand])
        # Le dossier quitté, s'il est vide, disparaît (il ne contenait plus rien).
        d = os.path.dirname(a)
        while d not in RACINES.values() and os.path.isdir(d) and not [f for f in os.listdir(d) if f != ".DS_Store"]:
            shutil.rmtree(d); d = os.path.dirname(d)
    for k, m in M.items():
        m.sauver()
        if journaux[k]:
            j = os.path.join(RACINES[k], JOURNAL); neuf = not os.path.exists(j)
            with open(j, "a", newline="", encoding="utf-8") as fh:
                w = csv.writer(fh)
                if neuf: w.writerow(["ancien", "nouveau", "motif", "quand"])
                w.writerows(journaux[k])
    print(n, "fichiers reclassés ·", len(echecs), "échecs")
    for e in echecs[:30]: print("  ", e)

elif MODE == "base":
    d = json.load(open(sys.argv[2]))
    carte = {}
    for k, r in RACINES.items():
        if k == "coffre": continue
        j = os.path.join(r, JOURNAL)
        if os.path.exists(j):
            for l in csv.DictReader(open(j, encoding="utf-8")): carte[l["ancien"]] = l["nouveau"]
    def final(p, vus=0):
        while p in carte and vus < 50: p = carte[p]; vus += 1
        return p
    n = [0]
    def reecrire(o):
        if isinstance(o, dict): return {k: reecrire(v) for k, v in o.items()}
        if isinstance(o, list): return [reecrire(v) for v in o]
        if isinstance(o, str) and len(o) < 600:
            q, tilde = (os.path.join(HOME, o[2:]), True) if o.startswith("~/") else (o, False)
            if q in carte:
                n[0] += 1; f = final(q)
                return f.replace(HOME, "~", 1) if tilde else f
        return o
    d2 = reecrire(d)
    d2["enregistre_le"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    d2.setdefault("journal", []).append({"quand": d2["enregistre_le"], "qui": "creation", "action": "reclassement des exports",
        "type": "fichiers", "id": None, "detail": f"{n[0]} chemins de fichiers suivis après renommage ou reclassement"})
    json.dump(d2, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
    print("chemins suivis :", n[0])
