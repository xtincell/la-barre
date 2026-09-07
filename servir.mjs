// servir.mjs — serveur statique minimal, sur le http natif de Node.
// Aucune dépendance. Utile si l'on préfère une URL http:// au double-clic.
//
// Usage : node servir.mjs [port]

import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir, stat } from "node:fs/promises";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
};

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
      let contenu;
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
        try { JSON.parse(texte); }
        catch {
          reponse.writeHead(400, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, quoi: "JSON illisible — rien n'a été écrit" }));
          return;
        }
        contenu = Buffer.from(texte, "utf8");
      }

      const cible = join(RACINE, normalize(chemin).replace(/^(\.\.[/\\])+/, ""));
      if (!cible.startsWith(RACINE)) { reponse.writeHead(403).end("Interdit"); return; }

      // Écriture atomique : on écrit à côté, puis on renomme. Une coupure au
      // milieu laisse l'ancien fichier intact plutôt qu'un fichier tronqué.
      await mkdir(dirname(cible), { recursive: true });
      const provisoire = cible + ".ecriture";
      await writeFile(provisoire, contenu);
      await rename(provisoire, cible);

      reponse.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
        .end(JSON.stringify({ ok: true, octets: contenu.length,
          quand: new Date().toISOString() }));
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

serveur.listen(PORT, () => {
  console.log(`Processus Matanga — http://localhost:${PORT}`);
});
