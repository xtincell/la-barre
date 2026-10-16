// servir.mjs — serveur statique minimal, sur le http natif de Node.
// Aucune dépendance. Utile si l'on préfère une URL http:// au double-clic.
//
// Usage : node servir.mjs [port]

import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir, stat, unlink, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, normalize, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { homedir } from "node:os";
import { execFile } from "node:child_process";

const RACINE = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 5173);

// Le lecteur de documents peut vérifier qu'il utilise un seul runtime natif,
// même pendant un remplacement de conteneur. Les médias/dépôts n'entrent pas
// dans cette empreinte de code ; ils conservent leurs révisions distinctes.
async function empreinteRuntime() {
  const h = createHash("sha256");
  async function ajouter(rel) {
    const cible = join(RACINE, rel);
    let info;
    try { info = await stat(cible); }
    catch (e) { if (e.code === "ENOENT") { h.update(rel + "\0absent\0"); return; } throw e; }
    if (info.isDirectory()) {
      for (const nom of (await readdir(cible)).sort()) await ajouter(join(rel, nom));
    } else h.update(rel).update("\0").update(await readFile(cible)).update("\0");
  }
  for (const rel of ["index.html", "app", "styles"]) await ajouter(rel);
  return h.digest("hex");
}
const RUNTIME = await empreinteRuntime();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  /* Les polices auto-hébergées. Sans leur type, elles partaient en
   * application/octet-stream : les navigateurs les acceptent quand même en
   * @font-face, mais refusent de les précharger. */
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  /* Et les films de revue, qui partaient dans le même sac : sans type, la
   * barre de lecture ne sait pas se placer et le timecode d'annotation
   * tombe à zéro. */
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".psd": "image/vnd.adobe.photoshop",
  ".psb": "image/vnd.adobe.photoshop",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
};

// ————— Le disque de l'agence, en local seulement —————
//
// Les masters, les vidéos et les EXE vivent dans les deux exports de
// Téléchargements, pas dans ce dossier. En local, LA BARRE les lit ici, en
// lecture seule : /disque/matanga/… et /disque/upgraders/…. Le site en ligne ne
// les a pas et n'a pas à les avoir — il montre les copies compressées du proxy.
// Deux gardes : la requête vient de cette machine, et le chemin ne sort jamais
// de l'export.
// Où sont les exports sur cette machine : ~/Downloads par défaut, ou là où l'indiquent
// LA_BARRE_EXPORT_MATANGA et LA_BARRE_EXPORT_UPGRADERS (l'ordi dédié les range ailleurs).
const DISQUES = {
  matanga: process.env.LA_BARRE_EXPORT_MATANGA || join(homedir(), "Downloads", "MATANGA — EXPORT DU TRAVAIL"),
  upgraders: process.env.LA_BARRE_EXPORT_UPGRADERS || join(homedir(), "Downloads", "UPGRADERS — EXPORT DU TRAVAIL"),
};

function deCetteMachine(requete) {
  const a = requete.socket.remoteAddress || "";
  const hote = String(requete.headers.host || "").replace(/:\d+$/, "");
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(a)
    && ["localhost", "127.0.0.1", "[::1]"].includes(hote);
}

function cheminDisque(rel) {
  const m = String(rel || "").match(/^(matanga|upgraders)\/(.+)$/);
  if (!m || m[2].split("/").includes("..")) return null;
  const racine = DISQUES[m[1]];
  const absolu = normalize(join(racine, m[2]));
  return absolu.startsWith(racine + sep) ? absolu : null;
}

/* Une vidéo se lit par morceaux : sans les plages, le lecteur ne sait pas
 * avancer, et un film de deux gigaoctets se chargerait en entier. */
async function servirDisque(requete, reponse, absolu) {
  const infos = await stat(absolu);
  if (!infos.isFile()) { reponse.writeHead(404).end("Introuvable"); return; }
  const type = TYPES[extname(absolu).toLowerCase()] || "application/octet-stream";
  const plage = String(requete.headers.range || "").match(/^bytes=(\d*)-(\d*)$/);
  if (plage) {
    const debut = plage[1] ? Number(plage[1]) : Math.max(0, infos.size - Number(plage[2]));
    const fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), infos.size - 1) : infos.size - 1;
    if (debut > fin || debut >= infos.size) {
      reponse.writeHead(416, { "Content-Range": `bytes */${infos.size}` }).end(); return;
    }
    reponse.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${debut}-${fin}/${infos.size}`, "Content-Length": fin - debut + 1,
      "Cache-Control": "no-store" });
    createReadStream(absolu, { start: debut, end: fin }).pipe(reponse);
    return;
  }
  reponse.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes",
    "Content-Length": infos.size, "Cache-Control": "no-store" });
  createReadStream(absolu).pipe(reponse);
}

// ————— Le dépôt vit sur disque, pas dans le navigateur —————
//
// localStorage est propre à un navigateur : deux navigateurs sur la même
// machine montraient deux dossiers différents pour la même adresse. Le dépôt
// est donc écrit ici, dans un fichier, et tous les navigateurs lisent le même.
//
// L'écriture est volontairement étroite : uniquement sous /depots ou
// /assets/review, uniquement du .json ou une image, taille plafonnée, et jamais
// de chemin qui remonte. Ce serveur est fait pour tourner en local — il n'a
// aucune authentification et n'a rien à faire sur un réseau ouvert.

const PLAFOND = 24 * 1024 * 1024; // 24 Mo

// Contrôle et remplacement forment une section critique. L'installation
// utilise un seul processus serveur ; les importeurs doivent utiliser PUT.
const ecritures = new Map();
async function exclusivement(cible, travail) {
  const precedente = ecritures.get(cible) || Promise.resolve();
  const operation = precedente.catch(() => {}).then(travail);
  ecritures.set(cible, operation);
  try { return await operation; }
  finally { if (ecritures.get(cible) === operation) ecritures.delete(cible); }
}
const revision = (contenu) => '"' + createHash("sha256").update(contenu).digest("hex") + '"';
async function remplacer(cible, contenu) {
  await mkdir(dirname(cible), { recursive: true });
  const provisoire = cible + ".ecriture-" + randomUUID();
  try { await writeFile(provisoire, contenu, { flag: "wx" }); await rename(provisoire, cible); }
  finally { await unlink(provisoire).catch((e) => { if (e.code !== "ENOENT") throw e; }); }
}
function json(reponse, statut, valeur, version) {
  reponse.writeHead(statut, {
    "Content-Type": "application/json", "Cache-Control": "no-store",
    ...(version ? { ETag: version } : {}),
  }).end(JSON.stringify(valeur));
}

function depotAutorise(chemin) {
  // L'application peut être servie depuis un sous-dossier (/la-barre/…) :
  // on exige un segment « depots » quelque part, pas un préfixe.
  if (chemin.includes("..")) return false;
  const m = chemin.match(/(?:^|\/)depots\/([a-zA-Z0-9._-]+\.json)$/);
  return !!m;
}

function publicationAutorisee(chemin) {
  return /^\/assets\/review\/partage\/[a-f0-9]{24}\.json$/.test(chemin);
}

// Les vignettes vivent à côté des packshots, pas dans le dépôt.
//
// Elles y étaient : 93 % du fichier, 4,8 Mo pour 0,3 Mo de données métier. Un
// dépôt de cinq mégaoctets sature le cache du navigateur, se relit lentement et
// se réécrit en entier à chaque frappe. Une vignette est un fichier ; elle se
// range comme un fichier, et le dépôt n'en garde que le chemin.
function vignetteAutorisee(chemin) {
  if (chemin.includes("..")) return false;
  return /(?:^|\/)assets\/review\/[a-zA-Z0-9._/-]+\.(jpg|jpeg|png|webp|mp4|webm|pdf)$/i.test(chemin);
}

function lireCorps(requete) {
  return new Promise((resoudre, rejeter) => {
    const bouts = [];
    let taille = 0;
    requete.on("data", (b) => {
      taille += b.length;
      if (taille > PLAFOND) { rejeter(new Error("trop gros")); requete.destroy(); return; }
      bouts.push(b);
    });
    requete.on("end", () => resoudre(Buffer.concat(bouts).toString("utf8")));
    requete.on("error", rejeter);
  });
}

const CHROME = process.env.LA_BARRE_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EN_LIGNE = process.env.LA_BARRE_EN_LIGNE || "https://labarre.powerupgraders.com/";
const BASE = "depots/beignet-paradise.json";

function lancer(cmd, args) {
  return new Promise((ok, ko) => execFile(cmd, args, { timeout: 120000 }, (e, so, se) => e ? ko(new Error(se || e.message)) : ok(so)));
}

/* Chrome, piloté par son protocole de débogage : on ouvre la page, on attend
 * que les diapositives soient là — l'application charge sa base après coup —,
 * puis on demande le PDF au format des pages déclaré par la feuille de style. */
async function imprimerPdf(url, sortie) {
  const { spawn } = await import("node:child_process");
  const profil = join(homedir(), ".la-barre-chrome-pdf");
  await mkdir(profil, { recursive: true });
  try { await unlink(join(profil, "DevToolsActivePort")); } catch {}
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
    "--remote-debugging-port=0", "--user-data-dir=" + profil, "about:blank"], { stdio: "ignore" });
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let port = null;
    for (let i = 0; i < 60 && !port; i++) {
      try { port = (await readFile(join(profil, "DevToolsActivePort"), "utf8")).split("\n")[0].trim(); } catch { await attendre(250); }
    }
    if (!port) throw new Error("Chrome n'a pas démarré");
    const cibles = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
    const page = cibles.find((c) => c.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error("connexion à Chrome impossible")); });
    let n = 0; const attente = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attente.has(m.id)) { attente.get(m.id)(m); attente.delete(m.id); } };
    const cmd = (method, params = {}) => new Promise((ok) => { const id = ++n; attente.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
    await cmd("Page.enable");
    // Le profil de Chrome est gardé d'une fois sur l'autre : sans cela, il
    // ressert le code de la veille depuis son cache et le PDF montre l'ancien deck.
    await cmd("Network.enable");
    await cmd("Network.setCacheDisabled", { cacheDisabled: true });
    // La mise en page se fait à la taille d'une diapositive : sans cela, Chrome
    // compose à 800 px et chaque piste passe en mise en page étroite.
    await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
    await cmd("Page.navigate", { url });
    let pret = false, etat = "";
    for (let i = 0; i < 120 && !pret; i++) {
      await attendre(500);
      const r = await cmd("Runtime.evaluate", { expression:
        "(document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'), JSON.stringify({ n: document.querySelectorAll('.pt-impression .pr-diapo').length, img: [...document.images].every(i => i.complete) && window.__pdfPret === true, a: (window.__amorcage || []).join(' / ') }))", returnByValue: true });
      const v = JSON.parse((r.result && r.result.result && r.result.result.value) || "{}");
      etat = (v.a || "") + " ; " + (v.n || 0) + " diapositives, images " + (v.img ? "chargées" : "en attente"); pret = v.n > 0 && v.img;
    }
    if (!pret) throw new Error("la présentation n'a pas chargé (" + etat + ")");
    await attendre(800);
    const pdf = await cmd("Page.printToPDF", { printBackground: true, preferCSSPageSize: true,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    if (!pdf.result) throw new Error("Chrome a refusé l'impression");
    await writeFile(sortie, Buffer.from(pdf.result.data, "base64"));
    ws.close();
  } finally { chrome.kill(); }
}

async function partagePdf(projetId) {
  // La page vient d'écrire ses jetons : on relit la base jusqu'à les y trouver.
  let p = null;
  for (let i = 0; i < 10 && !(p && p.partages && p.partages.presentation); i++) {
    const d = JSON.parse(await readFile(join(RACINE, BASE), "utf8"));
    p = (d.projets || []).find((x) => x.id === projetId);
    if (!(p && p.partages && p.partages.presentation)) await new Promise((r) => setTimeout(r, 500));
  }
  if (!p || !p.partages || !p.partages.presentation) throw new Error("le dossier n'a pas encore de lien de présentation");
  const jeton = p.partages.presentation.jeton;
  const rel = "assets/review/partage/" + jeton + ".pdf";
  const sortie = join(RACINE, rel);
  await mkdir(dirname(sortie), { recursive: true });
  await imprimerPdf("http://localhost:" + PORT + "/#/partage/" + jeton + "/impression", sortie);
  const octets = await readFile(sortie);
  const pages = (octets.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages < 2) throw new Error("Chrome a rendu " + pages + " page(s) : la présentation n'a pas chargé");
  const pdf = { chemin: rel, quand: new Date().toISOString(), pages };

  // En ligne : le PDF, puis les liens et le PDF dans la base, par un PUT gardé.
  let enLigne = false, erreurEnLigne = null;
  try {
    const r1 = await fetch(EN_LIGNE + rel, { method: "PUT", headers: { "Content-Type": "text/plain" },
      body: "data:application/pdf;base64," + octets.toString("base64") });
    if (!r1.ok) throw new Error("PDF refusé en ligne (" + r1.status + ")");
    const r2 = await fetch(EN_LIGNE + BASE, { cache: "no-store" });
    const etag = r2.headers.get("etag");
    const d2 = await r2.json();
    const p2 = (d2.projets || []).find((x) => x.id === projetId);
    if (!p2) throw new Error("le dossier n'existe pas dans la base en ligne");
    p2.partages = p.partages; p2.partagesRevoques = p.partagesRevoques || []; p2.partagePdf = pdf;
    d2.enregistre_le = new Date().toISOString();
    const r3 = await fetch(EN_LIGNE + BASE, { method: "PUT", headers: { "Content-Type": "application/json", "If-Match": etag },
      body: JSON.stringify(d2) });
    if (!r3.ok) throw new Error("base en ligne refusée (" + r3.status + ")");
    enLigne = true;
  } catch (e) { erreurEnLigne = String(e.message || e); }
  return { ok: true, pdf, enLigne, erreurEnLigne };
}

const serveur = createServer(async (requete, reponse) => {
  reponse.setHeader("X-La-Barre-Runtime", RUNTIME);
  try {
    const url = new URL(requete.url, "http://localhost");
    let chemin = decodeURIComponent(url.pathname);
    if (chemin === "/") chemin = "/index.html";

    // Le disque de l'agence : lire un fichier, ou l'ouvrir dans son logiciel.
    // Le PDF de la présentation : Chrome, sur cette machine, imprime les
    // diapositives de la route de partage, puis le PDF et les liens partent en
    // ligne. Réservé à cette machine, et à l'application (en-tête maison).
    if (chemin === "/partage-pdf") {
      if (!deCetteMachine(requete) || requete.method !== "POST" || requete.headers["x-la-barre"] !== "1") {
        reponse.writeHead(403).end("Réservé à cette machine"); return;
      }
      let corps;
      try { corps = JSON.parse(await lireCorps(requete)); } catch { reponse.writeHead(400).end("Illisible"); return; }
      try { json(reponse, 200, await partagePdf(corps.projetId)); }
      catch (e) { json(reponse, 200, { ok: false, quoi: String(e.message || e) }); }
      return;
    }

    if (chemin.startsWith("/disque/") || chemin === "/disque-ouvrir") {
      if (!deCetteMachine(requete)) { reponse.writeHead(403).end("Réservé à cette machine"); return; }
      if (chemin === "/disque-ouvrir") {
        // Un en-tête maison : une page d'un autre site ne peut pas l'envoyer sans
        // une autorisation que ce serveur ne donne jamais.
        if (requete.method !== "POST" || requete.headers["x-la-barre"] !== "1") {
          reponse.writeHead(403).end("Interdit"); return;
        }
        let corps;
        try { corps = JSON.parse(await lireCorps(requete)); } catch { reponse.writeHead(400).end("Illisible"); return; }
        const absolu = cheminDisque(corps.chemin);
        if (!absolu) { reponse.writeHead(403).end("Hors des exports"); return; }
        await stat(absolu);
        execFile("open", corps.reveler ? ["-R", absolu] : [absolu], (err) => {
          reponse.writeHead(err ? 500 : 200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: !err }));
        });
        return;
      }
      if (requete.method !== "GET" && requete.method !== "HEAD") { reponse.writeHead(405).end(); return; }
      if (chemin === "/disque/") {
        reponse.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
          .end(JSON.stringify({ ok: true })); return;
      }
      const absolu = cheminDisque(chemin.slice("/disque/".length));
      if (!absolu) { reponse.writeHead(403).end("Hors des exports"); return; }
      await servirDisque(requete, reponse, absolu);
      return;
    }

    // L'écriture du dépôt, et celle des vignettes.
    if (requete.method === "PUT" || requete.method === "POST") {
      const estVignette = vignetteAutorisee(chemin);
      if (!depotAutorise(chemin) && !publicationAutorisee(chemin) && !estVignette) {
        reponse.writeHead(403, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ok: false,
            quoi: "seuls les .json de /depots et les images d'/assets/review s'écrivent" }));
        return;
      }
      let texte;
      try { texte = await lireCorps(requete); }
      catch { reponse.writeHead(413).end("Corps trop volumineux"); return; }

      // Ce qu'on écrit : des octets d'image, ou un dépôt qui se relit.
      let contenu, neuf;
      if (estVignette) {
        // Le navigateur envoie une donnée « data:image/… ;base64,… » : elle se
        // range en fichier binaire, pas en texte.
        const m = texte.match(/^data:(?:image\/[a-z0-9+.-]+|video\/[a-z0-9+.-]+|application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/i);
        if (!m) {
          reponse.writeHead(400, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, quoi: "ce n'est pas une image ni une vidéo en base64" }));
          return;
        }
        contenu = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
        if (!contenu.length) {
          reponse.writeHead(400, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, quoi: "image vide — rien n'a été écrit" }));
          return;
        }
      } else {
        // Un dépôt illisible ne doit jamais écraser un dépôt lisible.
        try {
          neuf = JSON.parse(texte);
          if (!neuf || typeof neuf !== "object" || Array.isArray(neuf)) throw new Error("objet attendu");
        }
        catch {
          reponse.writeHead(400, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, quoi: "JSON illisible — rien n'a été écrit" }));
          return;
        }
        contenu = Buffer.from(texte, "utf8");


      }

      const cible = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ""));
      if (!cible.startsWith(RACINE)) { reponse.writeHead(403).end("Interdit"); return; }

      await exclusivement(cible, async () => {
        const version = revision(contenu);
        if (!estVignette) {
          let avant = null, actuel = null;
          try { avant = await readFile(cible); }
          catch (e) { if (e.code !== "ENOENT") throw e; }
          if (avant) {
            try { actuel = JSON.parse(avant.toString("utf8")); }
            catch {
              json(reponse, 409, { ok: false, conflit: true, code: "BASE_ILLISIBLE", quoi: "La base ne peut pas être relue ; elle a été conservée sans remplacement." });
              return;
            }
          }
          const attendue = requete.headers["if-match"];
          const creation = requete.headers["if-none-match"] === "*";
          const base = requete.headers["x-base"];
          const courante = avant ? revision(avant) : null;
          const vA = actuel && actuel.enregistre_le;
          if (avant ? (!attendue && !base && !creation) : !creation) {
            json(reponse, 428, { ok: false, conflit: true, code: "REVISION_REQUISE", quoi: "La version lue est requise avant la sauvegarde." }, courante);
            return;
          }
          // Une réponse perdue ne transforme pas un geste déjà reçu en échec.
          if (avant && courante === version && !creation) {
            json(reponse, 200, { ok: true, dejaRecu: true, revision: courante,
              enregistre_le: vA || null, octets: avant.length }, courante);
            return;
          }
          const depasse = avant && (creation || (attendue ? attendue !== courante
            : !vA || base !== vA || (neuf.enregistre_le && new Date(neuf.enregistre_le) < new Date(vA))));
          if (depasse) {
            json(reponse, 409, { ok: false, conflit: true, code: "REVISION_DEPASSEE",
              actuel: vA || null, revision: courante, quoi: "Une autre version a été enregistrée. Vos modifications doivent être rapprochées de cette version." }, courante);
            return;
          }
        }
        await remplacer(cible, contenu);
        json(reponse, 200, { ok: true, octets: contenu.length,
          revision: version, enregistre_le: neuf?.enregistre_le || null,
          quand: new Date().toISOString() }, version);
      });
      return;
    }

    // On ne sort jamais du dossier du projet.
    const absolu = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ""));
    if (!absolu.startsWith(RACINE)) {
      reponse.writeHead(403).end("Interdit");
      return;
    }

    const infos = await stat(absolu);
    if (infos.isDirectory()) {
      reponse.writeHead(404).end("Introuvable");
      return;
    }

    // Une vidéo ou un son se sert par morceaux : Safari ne lit pas un film servi d'un bloc.
    if (/^(video|audio)\//.test(TYPES[extname(absolu).toLowerCase()] || "")) {
      await servirDisque(requete, reponse, absolu);
      return;
    }

    const corps = await readFile(absolu);
    reponse.writeHead(200, {
      "Content-Type": TYPES[extname(absolu).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      ...(depotAutorise(chemin) || publicationAutorisee(chemin) ? { ETag: revision(corps) } : {}),
    });
    reponse.end(corps);
  } catch (erreur) {
    if (erreur && erreur.code === "ENOENT") {
      reponse.writeHead(404).end("Introuvable");
      return;
    }
    reponse.writeHead(500).end("Erreur serveur");
  }
});

serveur.listen(PORT, process.env.HOST || "0.0.0.0", () => {
  console.log(`Processus Matanga — http://localhost:${PORT}`);
});
