# Les EXE (sources .ai .psd .psb .eps, et les fichiers « Exé ») rejoignent un dossier EXE dans leur dossier.
# Demande d'Alex (07/10/2026) : « Les EXE (.ai, .psd) doivent être dans un dossier EXE à l'intérieur du dossier dédié. »
import os,re,csv,collections
H=os.path.expanduser("~")
RM,RU=H+"/Downloads/MATANGA — EXPORT DU TRAVAIL",H+"/Downloads/UPGRADERS — EXPORT DU TRAVAIL"
P=set(l.strip() for l in open(H+"/.nommage/proteges.txt"))
CODE=[l.strip() for l in open(H+"/.nommage/projets-code.txt") if l.strip()]
EXT=(".ai",".psd",".psb",".eps")
SEAU={"AI","PSD","PSB","EPS"}
paquet={}
def dans_un_paquet(p):
    d=os.path.dirname(p)
    if re.search(r"/(Links|Document fonts|Fonts|Footage|\(Footage\))(/|$)",d): return True
    for _ in range(2):
        if not d.startswith((RM,RU)) or d in (RM,RU): break
        if d not in paquet:
            try: paquet[d]=any(f.lower().endswith((".indd",".idml",".aep",".prproj",".fcpxml")) for f in os.listdir(d))
            except OSError: paquet[d]=False
        if paquet[d]: return True
        d=os.path.dirname(d)
    return False
rows=[]; laisse=collections.Counter()
for r in (RM,RU):
    for dp,dn,fn in os.walk(r):
        if "/Beignet Paradise" in dp or any(dp.startswith(c) for c in CODE): dn[:]=[]; continue
        if os.path.basename(dp)=="EXE": continue
        for f in fn:
            if f.startswith("._"): continue
            p=os.path.join(dp,f)
            if not (f.lower().endswith(EXT) or re.search(r" — Exé\b",f)): continue
            if p in P: laisse["cité par du code"]+=1; continue
            if dans_un_paquet(p): laisse["paquet InDesign / After Effects"]+=1; continue
            d=os.path.dirname(dp) if os.path.basename(dp).upper() in SEAU else dp
            rows.append({"actuel":p,"nouveau":os.path.join(d,"EXE",f),"motif":"EXE rangés dans le dossier EXE de leur dossier"})
with open(H+"/.nommage/nom/gestes-exe.csv","w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh,fieldnames=["actuel","nouveau","motif"]); w.writeheader(); w.writerows(rows)
c=collections.Counter(os.path.splitext(x["actuel"])[1].lower() for x in rows)
print(len(rows),"fichiers ·",dict(c),"· laissés:",dict(laisse))
print("dossiers EXE créés:",len({os.path.dirname(x["nouveau"]) for x in rows}))
print("collisions de nom:",len(rows)-len({x["nouveau"] for x in rows}))
for x in rows[::150]: print(" ",x["nouveau"].split("TRAVAIL/")[1][-120:])
