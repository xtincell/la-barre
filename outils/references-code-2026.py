# references-code.py — les fichiers qu'un code cite par leur nom (html, css, js, jsx, json, md) : ceux-là ne se renomment pas.
import os, re, sys, json, urllib.parse
H = os.path.expanduser("~")
RACINES = [H + "/Downloads/UPGRADERS — EXPORT DU TRAVAIL", H + "/Downloads/MATANGA — EXPORT DU TRAVAIL"]
CODE = (".html", ".htm", ".css", ".js", ".jsx", ".tsx", ".ts", ".json", ".md", ".mjs")
cites = {}   # nom de fichier → dossiers des codes qui le citent
for R in RACINES:
    for dp, dn, fn in os.walk(R):
        dn[:] = [d for d in dn if d != "node_modules" and not d.startswith(".")]
        for f in fn:
            if not f.lower().endswith(CODE): continue
            try: t = open(os.path.join(dp, f), errors="ignore").read(3_000_000)
            except OSError: continue
            for m in re.finditer(r"[\w\-. %()@&'À-ÿ]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|mov|pdf|psd|ai)", t, re.I):
                n = os.path.basename(urllib.parse.unquote(m.group(0)))
                cites.setdefault(n.lower(), set()).add(dp)
def protege(p):
    """Vrai si un code d'un dossier parent (ou voisin) cite ce fichier par son nom."""
    n = os.path.basename(p).lower(); d = os.path.dirname(p)
    for c in cites.get(n, ()):
        if d.startswith(c) or c.startswith(os.path.dirname(d)): return True
    return False
if __name__ == "__main__":
    out = []
    for R in RACINES:
        for dp, dn, fn in os.walk(R):
            for f in fn:
                p = os.path.join(dp, f)
                if f.lower().endswith(CODE): continue
                if protege(p): out.append(p)
    open(sys.argv[1], "w").write("\n".join(out))
    print(len(out), "fichiers cités par du code")
