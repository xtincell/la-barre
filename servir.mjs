// servir.mjs — serveur statique minimal, sur le http natif de Node.
// Aucune dépendance. Utile si l'on préfère une URL http:// au double-clic.
//
// Usage : node servir.mjs [port]

import { createServer } from "node:http";
import { readFile, writeFile, rename, mkdir, stat, unlink, readdir } from "node:fs/promises";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
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

// ————— Un identifiant, une décision —————
//
// Plusieurs postes écrivent dans la même base, chacun tirant ses identifiants
// de décision sans voir ceux des autres. Le client renomme, avant de
// rapprocher, une décision dont l'identifiant est déjà pris dans la base relue
// (app/decision.js). Ce contrôle est le dernier : une écriture qui ferait
// porter un même identifiant à deux décisions, ou qui remplacerait une décision
// enregistrée par une autre sous le même identifiant, est refusée (422), et la
// base reste telle quelle. Radar reconnaît une décision à cet identifiant : la
// première serait perdue pour lui sans qu'aucun écran ne le dise.
//
// Seul ce que l'écriture ajoute est refusé : une base qui porte déjà un doublon
// reste inscriptible. Le contenu se compare sans `attestation` — La Fusée la
// pose à l'enregistrement — et sans dépendre de l'ordre des clés. Un import qui
// écrit le fichier directement, sans PUT, ne passe pas par ici.
//
// Même garde pour les projets et les livrables (app/reconciliation.js,
// `departager`) : un même identifiant porté par deux projets, ou par deux
// livrables où qu'ils soient, est refusé (PROJET_EN_DOUBLE, LIVRABLE_EN_DOUBLE),
// comme le remplacement d'un projet ou d'un livrable enregistré par un autre
// objet sous le même identifiant (PROJET_REMPLACE, LIVRABLE_REMPLACE). Un
// projet change à chaque geste : ce n'est pas son contenu qui dit qui il est,
// c'est sa date de naissance, `cree_le`, posée à la création et jamais
// réécrite. Un livrable est aussi celui de son projet : il n'en change jamais.
// Un objet sans date de naissance des deux côtés ne se compare que par là.
const objetLisible = (x) => x && typeof x === "object" && !Array.isArray(x) && typeof x.id === "string" && x.id.trim() !== "";
const listeDe = (x, cle) => (x && typeof x === "object" && Array.isArray(x[cle]) ? x[cle] : []);
const naissance = (x) => (typeof x.cree_le === "string" && x.cree_le.trim() ? x.cree_le : null);
function contenuDecision(d) {
  const { attestation: _attestation, ...reste } = d;
  return canonique(reste);
}
// identifiant → signature de chaque objet qui le porte
function parIdentifiant(objets, signature) {
  const m = new Map();
  for (const x of objets) {
    if (!objetLisible(x)) continue;
    if (!m.has(x.id)) m.set(x.id, []);
    m.get(x.id).push(signature(x));
  }
  return m;
}
function enConflit(avant, apres) {
  const doubles = [], remplaces = [];
  for (const [id, signatures] of apres) {
    const anciennes = avant.get(id) || [];
    if (signatures.length > 1 && signatures.length > anciennes.length) doubles.push(id);
    else if (signatures.length === 1 && anciennes.length === 1 && signatures[0] !== anciennes[0]) remplaces.push(id);
  }
  return { doubles, remplaces };
}
const REGISTRES = [
  { objets: (b) => listeDe(b, "decisions"), signature: contenuDecision,
    double: "DECISION_EN_DOUBLE", remplace: "DECISION_REMPLACEE",
    quoiDouble: "deux décisions porteraient le même identifiant",
    quoiRemplace: "une décision enregistrée serait remplacée par une autre sous le même identifiant" },
  { objets: (b) => listeDe(b, "projets"), signature: (p) => JSON.stringify(naissance(p)),
    double: "PROJET_EN_DOUBLE", remplace: "PROJET_REMPLACE",
    quoiDouble: "deux projets porteraient le même identifiant",
    quoiRemplace: "un projet enregistré serait remplacé par un autre projet sous le même identifiant" },
  { objets: (b) => listeDe(b, "projets").flatMap((p) => (objetLisible(p) ? listeDe(p, "livrables").map((l) => ({ l, p: p.id })) : []))
      .filter((x) => objetLisible(x.l)).map((x) => ({ id: x.l.id, l: x.l, p: x.p })),
    signature: (x) => JSON.stringify([naissance(x.l), x.p]),
    double: "LIVRABLE_EN_DOUBLE", remplace: "LIVRABLE_REMPLACE",
    quoiDouble: "deux livrables porteraient le même identifiant",
    quoiRemplace: "un livrable enregistré serait remplacé par un autre livrable sous le même identifiant" },
];
// ————— La référence humaine d'un projet —————
//
// Décision du propriétaire, 12 novembre 2026 : la base de référence attribue
// la référence (`ref`) au premier enregistrement. Le poste la demande
// (`refDemandee`) et montre en attendant une étiquette provisoire :
//
//   { prefixe }           le numéro suivant du préfixe, unique dans la base :
//                         MT-0043 après MT-0042 (seules comptent les références
//                         de la forme exacte PRÉFIXE-nombre ; quatre chiffres
//                         au moins) — même règle que O.referenceSuivante
//   { saisie, prefixe? }  la référence saisie, si aucun autre projet ne la porte
//
// Le serveur pose `ref`, retire `refDemandee`, écrit et rend dans son reçu ce
// qu'il a attribué (`references`). Sans référence à attribuer, le corps reçu
// s'écrit tel quel. Refusé (422), rien n'est écrit :
//
//   REFERENCE_ILLISIBLE   une demande qui n'a pas cette forme
//   REFERENCE_CHANGEE     un projet enregistré avec sa référence la perdrait ou
//                         en changerait : une référence attribuée ne change plus
//   REFERENCE_PRISE       une référence saisie, ou posée sans demande (ancien
//                         poste, import), déjà portée par un autre projet ;
//                         une base qui porte déjà un doublon reste inscriptible
//
// Une référence déjà présente dans une base est attribuée, telle quelle.
const PREFIXE_REFERENCE = /^[A-Za-z][A-Za-z0-9]{0,11}$/;
const SAISIE_MAX = 60;
function referenceSuivante(prefixe, prises) {
  const motif = new RegExp("^" + prefixe + "-(\\d+)$");
  let max = 0;
  for (const r of prises) { const m = motif.exec(r); if (m && Number(m[1]) > max) max = Number(m[1]); }
  for (let n = max + 1; ; n++) {
    const ref = prefixe + "-" + String(n).padStart(4, "0");
    if (!prises.has(ref)) return ref;
  }
}
const refAttribuee = (p) => (p.refDemandee === undefined && typeof p.ref === "string" && p.ref.trim() ? p.ref : null);
function demandeLisible(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return false;
  if (d.saisie !== undefined) {
    return typeof d.saisie === "string" && d.saisie.trim() !== "" && d.saisie.trim().length <= SAISIE_MAX
      && (d.prefixe === undefined || (typeof d.prefixe === "string" && PREFIXE_REFERENCE.test(d.prefixe)));
  }
  return typeof d.prefixe === "string" && PREFIXE_REFERENCE.test(d.prefixe);
}
function attribuerReferences(actuel, neuf) {
  const avant = listeDe(actuel, "projets").filter(objetLisible), apres = listeDe(neuf, "projets").filter(objetLisible);
  const refus = (code, ids, quoi) => ({ refus: { code, identifiants: ids, quoi } });
  const illisibles = apres.filter((p) => p.refDemandee !== undefined && !demandeLisible(p.refDemandee));
  if (illisibles.length) return refus("REFERENCE_ILLISIBLE", illisibles.map((p) => p.id), "une demande de référence est illisible");
  const anciennes = new Map(avant.filter((p) => typeof p.ref === "string" && p.ref.trim()).map((p) => [p.id, p.ref]));
  const changees = apres.filter((p) => anciennes.has(p.id) && refAttribuee(p) !== anciennes.get(p.id));
  if (changees.length) {
    return refus("REFERENCE_CHANGEE", changees.map((p) => p.id), "une référence attribuée changerait ("
      + changees.map((p) => p.id + " : " + anciennes.get(p.id)).join(", ") + ") ; elle ne change plus");
  }
  // Ce que l'écriture ajoute : une référence posée sans demande, portée par
  // plus de projets qu'avant.
  const compte = (projets) => {
    const m = new Map();
    for (const p of projets) { const r = refAttribuee(p); if (r) m.set(r, (m.get(r) || []).concat(p.id)); }
    return m;
  };
  const porteurs = compte(avant), prises = [];
  for (const [ref, ids] of compte(apres)) {
    const deja = porteurs.get(ref) || [];
    if (ids.length > 1 && ids.length > deja.length) prises.push(...ids.filter((id) => !deja.includes(id)).map((id) => [id, ref]));
  }
  if (prises.length) {
    return refus("REFERENCE_PRISE", prises.map((x) => x[0]), "une référence serait portée par deux projets ("
      + prises.map((x) => x[1]).join(", ") + ")");
  }
  const tenues = new Set();
  for (const p of avant.concat(apres)) { const r = refAttribuee(p); if (r) tenues.add(r); }
  const attribuees = [];
  for (const p of apres.filter((x) => x.refDemandee !== undefined && x.refDemandee.saisie !== undefined)) {
    const s = p.refDemandee.saisie.trim();
    if (tenues.has(s)) return refus("REFERENCE_PRISE", [p.id], "la référence saisie « " + s + " » est déjà portée par un autre projet");
    tenues.add(s); attribuees.push({ p, ref: s });
  }
  for (const p of apres.filter((x) => x.refDemandee !== undefined && x.refDemandee.saisie === undefined)) {
    const ref = referenceSuivante(p.refDemandee.prefixe, tenues);
    tenues.add(ref); attribuees.push({ p, ref });
  }
  // Dans l'ordre des projets de la base.
  attribuees.sort((a, b) => apres.indexOf(a.p) - apres.indexOf(b.p));
  for (const { p, ref } of attribuees) { p.ref = ref; delete p.refDemandee; }
  return { attribuees: attribuees.map(({ p, ref }) => ({ projet: p.id, ref })) };
}

// Le premier refus, dans l'ordre des registres : décisions, projets, livrables.
function identifiantsEnConflit(actuel, neuf) {
  for (const r of REGISTRES) {
    const { doubles, remplaces } = enConflit(parIdentifiant(r.objets(actuel), r.signature), parIdentifiant(r.objets(neuf), r.signature));
    if (doubles.length) return { code: r.double, identifiants: doubles, quoi: r.quoiDouble };
    if (remplaces.length) return { code: r.remplace, identifiants: remplaces, quoi: r.quoiRemplace };
  }
  return null;
}

// ————— Les décisions, lues par Radar —————
//
// SHK-0005, sens 1, arbitrage 5.5 du 11 novembre 2026 : Radar vient chercher
// les décisions. Cette route ne sert qu'elles — jamais les personnes, la
// facturation ni le reste de la base — et seulement à la machine qui présente
// le jeton BARRE_RADAR_TOKEN en Bearer, comparé en temps constant. Sans jeton
// configuré, ou avec un jeton de moins de 32 caractères, elle reste fermée
// (503) : elle n'est jamais ouverte par défaut.
//
// Elle ne ferme rien d'autre. Le reste de ce serveur reste sans
// authentification : une installation qui l'expose à Radar n'expose que cette
// route (La Fusée devant, ou une règle réseau), pas tout le port.
//
// Chaque décision garde la forme de la fabrique (app/decision.js), réduite aux
// champs qui la datent et l'attribuent. `quand` est la date de la décision,
// distincte de l'heure du transfert ; `qui` et `acteur` sont l'auteur tel que
// déclaré (pour `acteur` : personneId, nom, poste). Deux champs ne sortent pas :
// `contenuPiste`, le travail créatif que recopie la référence de campagne, et
// `attestation`, le sceau de session de La Fusée. `empreinte_contenu` est le
// SHA-256 du JSON canonique (clés triées, sans espace) de tous les autres
// champs servis : Radar s'en sert pour reconnaître une décision déjà reçue ou
// changée. Une décision sans identifiant, ou dont l'identifiant est pris deux
// fois, n'est pas servie : elle est nommée dans `ecartees`, pour que Radar ne
// la prenne pas pour une décision retirée.
const JETON_RADAR = process.env.BARRE_RADAR_TOKEN || "";
const JETON_RADAR_MIN = 32;
const CHAMPS_DECISION = ["id", "projet", "objet", "type", "verdict", "motif", "quand", "qui", "acteur", "titre"];
const CHAMPS_DECISION_SI_PRESENTS = ["campagne", "marque", "version", "portee", "remplace", "ecart", "empreinte",
  "revisionSource", "cree_le"];

function jetonRadarValide(entete) {
  const m = /^Bearer (\S+)$/.exec(String(entete || ""));
  if (!m) return false;
  // Deux empreintes de même longueur : la comparaison ne dit rien de la taille.
  const recu = createHash("sha256").update(m[1]).digest();
  const attendu = createHash("sha256").update(JETON_RADAR).digest();
  return timingSafeEqual(recu, attendu);
}

function canonique(v) {
  if (Array.isArray(v)) return "[" + v.map(canonique).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonique(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

function acteurDeclare(a) {
  if (a === undefined) return null;
  if (!a || typeof a !== "object" || Array.isArray(a)) return a;
  const nul = (x) => (x === undefined ? null : x);
  return { personneId: nul(a.personneId), nom: nul(a.nom), poste: nul(a.poste) };
}

function decisionServie(d) {
  const s = {};
  for (const k of CHAMPS_DECISION) s[k] = k === "acteur" ? acteurDeclare(d.acteur) : (d[k] === undefined ? null : d[k]);
  for (const k of CHAMPS_DECISION_SI_PRESENTS) if (d[k] !== undefined) s[k] = d[k];
  s.empreinte_contenu = "sha256:" + createHash("sha256").update(canonique(s)).digest("hex");
  return s;
}

function decisionsServies(liste) {
  const occurrences = new Map();
  const lisible = (d) => d && typeof d === "object" && !Array.isArray(d) && typeof d.id === "string" && d.id.trim() !== "";
  for (const d of liste) if (lisible(d)) occurrences.set(d.id, (occurrences.get(d.id) || 0) + 1);
  const decisions = [], ecartees = [], doubles = new Set();
  for (const d of liste) {
    if (!d || typeof d !== "object" || Array.isArray(d)) { ecartees.push({ id: null, raison: "pas un objet" }); continue; }
    if (!lisible(d)) { ecartees.push({ id: null, raison: "sans identifiant" }); continue; }
    if (occurrences.get(d.id) > 1) {
      if (!doubles.has(d.id)) { doubles.add(d.id); ecartees.push({ id: d.id, raison: "identifiant en double" }); }
      continue;
    }
    decisions.push(decisionServie(d));
  }
  return { decisions, ecartees };
}

async function servirDecisionsRadar(requete, reponse) {
  const tete = requete.method === "HEAD";
  const refus = (statut, code, quoi, entetes = {}) => {
    reponse.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...entetes })
      .end(tete ? undefined : JSON.stringify({ ok: false, code, quoi }));
  };
  if (requete.method !== "GET" && !tete) {
    refus(405, "LECTURE_SEULE", "Cette route se lit ; elle n'écrit rien.", { Allow: "GET, HEAD" }); return;
  }
  if (JETON_RADAR.length < JETON_RADAR_MIN) {
    refus(503, "ROUTE_FERMEE", "Aucun jeton machine d'au moins " + JETON_RADAR_MIN + " caractères n'est configuré (BARRE_RADAR_TOKEN) : la route reste fermée.");
    return;
  }
  if (!jetonRadarValide(requete.headers.authorization)) {
    refus(401, "JETON_REFUSE", "Jeton machine absent ou refusé.", { "WWW-Authenticate": 'Bearer realm="la-barre-decisions"' });
    return;
  }
  let corps;
  try {
    // Le dépôt est remplacé d'un bloc (remplacer) : une lecture voit l'ancien
    // fichier ou le nouveau, jamais un fichier à moitié écrit.
    const manifeste = JSON.parse(await readFile(join(RACINE, "depots", "manifeste.json"), "utf8"));
    const reference = manifeste && manifeste.reference;
    if (typeof reference !== "string" || reference.includes("..") || !/^[a-zA-Z0-9._-]+\.json$/.test(reference)) {
      throw new Error("référence illisible");
    }
    const donnees = JSON.parse(await readFile(join(RACINE, "depots", reference), "utf8"));
    // Une base sans collection de décisions n'est pas une base sans décision.
    if (!donnees || typeof donnees !== "object" || !Array.isArray(donnees.decisions)) throw new Error("décisions absentes");
    const { decisions, ecartees } = decisionsServies(donnees.decisions);
    corps = JSON.stringify({ schema: 1, maison: typeof donnees.maison === "string" ? donnees.maison : null,
      depot: reference, decisions, ecartees });
  } catch {
    refus(503, "BASE_INDISPONIBLE", "La base de référence n'a pas pu être lue ; aucune décision n'est servie.");
    return;
  }
  // L'empreinte porte sur ce qui est servi : une base qui bouge ailleurs que
  // dans ses décisions garde la même.
  const version = revision(corps);
  const connues = String(requete.headers["if-none-match"] || "").split(",").map((x) => x.trim().replace(/^W\//, ""));
  if (connues.includes(version)) { reponse.writeHead(304, { ETag: version, "Cache-Control": "no-store" }).end(); return; }
  reponse.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ETag: version })
    .end(tete ? undefined : corps);
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

    // Les décisions que lit Radar : avant toute autre route, écriture comprise.
    if (chemin === "/radar/decisions") { await servirDecisionsRadar(requete, reponse); return; }

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
        let ecrit = contenu, version = revision(contenu), references = null;
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
          const conflit = identifiantsEnConflit(actuel, neuf);
          if (conflit) {
            json(reponse, 422, { ok: false, code: conflit.code, identifiants: conflit.identifiants,
              quoi: "La base n'a pas été remplacée : " + conflit.quoi + " (" + conflit.identifiants.join(", ") + ")." }, courante);
            return;
          }
          const attribution = attribuerReferences(actuel, neuf);
          if (attribution.refus) {
            const r = attribution.refus;
            json(reponse, 422, { ok: false, code: r.code, identifiants: r.identifiants,
              quoi: "La base n'a pas été remplacée : " + r.quoi + "." }, courante);
            return;
          }
          if (attribution.attribuees.length) {
            ecrit = Buffer.from(JSON.stringify(neuf, null, 1), "utf8");
            version = revision(ecrit);
            references = attribution.attribuees;
          }
        }
        await remplacer(cible, ecrit);
        json(reponse, 200, { ok: true, octets: ecrit.length,
          revision: version, enregistre_le: neuf?.enregistre_le || null,
          quand: new Date().toISOString(), ...(references ? { references } : {}) }, version);
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

/* Écoute locale par défaut : ce serveur n'a aucune authentification, lecture et
 * écriture comprises. L'ouvrir au réseau est un choix explicite (HOST), que les
 * images Docker font pour être jointes à travers leur port publié. */
serveur.listen(PORT, process.env.HOST || "127.0.0.1", () => {
  console.log(`Processus Matanga — http://localhost:${PORT}`);
});
