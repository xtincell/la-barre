// servir.mjs — serveur statique minimal, sur le http natif de Node.
// Aucune dépendance. Utile si l'on préfère une URL http:// au double-clic.
//
// Usage : node servir.mjs [port]

import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir, stat, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, normalize, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { homedir } from "node:os";
import { execFile } from "node:child_process";

const RACINE = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 5173);

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
};

// ————— Le disque de l'agence, en local seulement —————
//
// Les masters, les vidéos et les EXE vivent dans les deux exports de
// Téléchargements, pas dans ce dossier. En local, LA BARRE les lit ici, en
// lecture seule : /disque/matanga/… et /disque/upgraders/…. Le site en ligne ne
// les a pas et n'a pas à les avoir — il montre les copies compressées du proxy.
// Deux gardes : la requête vient de cette machine, et le chemin ne sort jamais
// de l'export.
const DISQUES = {
  matanga: join(homedir(), "Downloads", "MATANGA — EXPORT DU TRAVAIL"),
  upgraders: join(homedir(), "Downloads", "UPGRADERS — EXPORT DU TRAVAIL"),
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

// Les vignettes vivent à côté des packshots, pas dans le dépôt.
//
// Elles y étaient : 93 % du fichier, 4,8 Mo pour 0,3 Mo de données métier. Un
// dépôt de cinq mégaoctets sature le cache du navigateur, se relit lentement et
// se réécrit en entier à chaque frappe. Une vignette est un fichier ; elle se
// range comme un fichier, et le dépôt n'en garde que le chemin.
function vignetteAutorisee(chemin) {
  if (chemin.includes("..")) return false;
  return /(?:^|\/)assets\/review\/[a-zA-Z0-9._/-]+\.(jpg|jpeg|png|webp|mp4|webm)$/i.test(chemin);
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

const serveur = createServer(async (requete, reponse) => {
  try {
    const url = new URL(requete.url, "http://localhost");
    let chemin = decodeURIComponent(url.pathname);
    if (chemin === "/") chemin = "/index.html";

    // Le disque de l'agence : lire un fichier, ou l'ouvrir dans son logiciel.
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
      if (!depotAutorise(chemin) && !estVignette) {
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
        const m = texte.match(/^data:(?:image|video)\/[a-z0-9+.-]+;base64,([A-Za-z0-9+/=\s]+)$/i);
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

    const corps = await readFile(absolu);
    reponse.writeHead(200, {
      "Content-Type": TYPES[extname(absolu).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      ...(depotAutorise(chemin) ? { ETag: revision(corps) } : {}),
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
