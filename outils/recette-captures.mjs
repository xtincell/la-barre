#!/usr/bin/env node
/* recette-captures.mjs — photographier tous les espaces de La Barre, avant et
 * après un changement, à 320, 390 et 1440 px.
 *
 * La recette ne photographiait que quatre routes (constat manque-3) : Planning,
 * Bilan, Ressources, la Galerie, la page partagée et la recherche n'avaient
 * jamais été regardés. Ce script les capture tous, sur un serveur statique
 * éphémère (comme tests/parcours.mjs) et une base importée en mémoire :
 *
 *   - Bureau ; Projets (en cours, archives, par marque, galerie, une marque,
 *     une campagne) ; chaque rubrique de chaque nature de projet ;
 *   - une pièce (poser, juger, origine, remise, version historique) et une piste ;
 *   - Décisions, Planning, Bilan et Ressources, mode par mode ;
 *   - Plus, la recherche ouverte, Nouveau projet ouvert, la demande de
 *     proposition ouverte, la page partagée.
 *
 * Sous 768 px, la page est vue comme sur un téléphone (écran tactile, densité
 * 2) ; au-dessus, comme sur un poste de bureau.
 *
 * Il écrit, hors du dépôt : les PNG, une planche-contact `index.html` et
 * `captures.json` (exceptions, débordement horizontal, textes coupés,
 * contrôles hors écran, valeurs techniques affichées, termes interdits visibles
 * ou dans un bloc replié, images cassées, pages introuvables). Il n'écrit
 * jamais dans le dépôt ni dans une base : le serveur éphémère ne répond qu'aux
 * lectures et ne sert aucun `depots/`.
 *
 * `captures.json` porte la version de la mesure (l'empreinte de ce script et
 * de la liste des termes) et le contexte des captures. Deux passes ne se
 * comparent que si elles ont la même : sinon, la planche demande de refaire
 * la passe « avant ».
 *
 *   BROWSER_CHANNEL=chrome node outils/recette-captures.mjs --avant
 *   BROWSER_CHANNEL=chrome node outils/recette-captures.mjs --apres
 *
 * Voir `--aide` pour les options, et documents/FINI.md pour l'usage en PR.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, sep, join, dirname, relative, basename, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relever, VALEURS_TECHNIQUES } from './termes-interdits.mjs';

const RACINE = fileURLToPath(new URL('../', import.meta.url));

export const LARGEURS = [320, 390, 1440];
/* Sous cette largeur, la capture se fait dans un contexte de téléphone. */
export const TELEPHONE = 768;
export const HAUTEURS = { 320: 700, 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 3200: 1694 };
/* Les deux postes de capture. Ils font partie de la version de la mesure : une
 * passe prise sur un autre poste ne se compare pas au pixel. */
export const POSTES = {
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' },
  telephone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' },
};
/* Le navigateur peint sans carte graphique. Rastérisés par la carte (Metal,
 * Skia Graphite), les bords d'un cercle (puce, pastille, avatar) changent
 * parfois de 18/255 d'une passe à l'autre, selon ce que la carte a peint
 * avant : la photo dépendrait de l'ordre des routes et de la charge du poste.
 * Peinte par le processeur, comme en CI, elle ne dépend que de la page. Fait
 * partie du poste de capture. */
export const RENDU = { args: ['--disable-gpu'] };
export function lancement(canal = process.env.BROWSER_CHANNEL) { return { headless: true, ...RENDU, ...(canal ? { channel: canal } : {}) }; }

/* La version de la mesure : l'empreinte de ce script et de la liste des
 * termes. Deux passes mesurées par des versions différentes ne se comparent
 * pas : une alerte « nouvelle » pourrait venir de l'outil, pas de l'écran. */
export function versionMesure() {
  const h = createHash('sha256');
  for (const f of ['recette-captures.mjs', 'termes-interdits.mjs']) h.update(readFileSync(new URL('./' + f, import.meta.url)));
  return h.digest('hex').slice(0, 12);
}

/* Les modes de chaque espace, tels que le plan de recette les nomme. Le script
 * les relit dans l'application (VUE_*.MODES) : un mode ajouté est capturé sans
 * toucher à ce fichier. Cette liste ne sert que si l'application ne les expose
 * plus. */
export const MODES_ATTENDUS = {
  valider: ['file', 'du'],
  planning: ['ordre', 'charge', 'gens', 'livraisons'],
  reporting: ['indicateurs', 'reprises', 'equipe', 'bilan', 'arbitrages'],
  referentiel: ['marques', 'marches', 'people', 'radar', 'intake', 'disque', 'doctrine', 'parametres'],
};

export const ESPACES = [
  ['bureau', 'Bureau'], ['projets', 'Projets'], ['piece', 'Pièce'], ['decisions', 'Décisions'],
  ['planning', 'Planning'], ['bilan', 'Bilan'], ['ressources', 'Ressources'], ['plus', 'Plus'],
  ['recherche', 'Recherche ouverte'], ['nouveau-projet', 'Nouveau projet ouvert'],
  ['dossier', 'Dossier : chaque rubrique de chaque nature'], ['demande', 'Demande de proposition ouverte'],
  ['partage', 'Page partagée'],
];

/* La planche cible de chaque espace, dans le dossier des planches de
 * conception (option --cibles). */
export const PLANCHES = {
  bureau: '01-bureau-projets.png', projets: '01-bureau-projets.png', dossier: '02-dossier.png', demande: '02-dossier.png',
  decisions: '03-decisions-revue.png', piece: '03-decisions-revue.png',
  planning: '04-planning-bilan.png', bilan: '04-planning-bilan.png',
  ressources: '05-ressources.png', partage: '06-mobile-remise-partage.png',
};

/* Les onglets d'une pièce, nommés comme l'application les affiche
 * (app/vue-asset.js, ONGLETS, que l'application n'expose pas). L'onglet
 * « juger » s'y appelle « Critères et verdict » : la recette l'écrit sans le
 * terme interdit, que la microcopie retirera de l'application. */
export const ONGLETS_PIECE = { poser: 'Visuels et fichiers', juger: 'Critères et décision', origine: 'Versions et dépendances', remise: 'BAT et remise' };

const ESPACE_DE = { valider: 'decisions', planning: 'planning', reporting: 'bilan', referentiel: 'ressources' };
const NOM_VUE = { valider: 'Décisions', planning: 'Planning', reporting: 'Bilan', referentiel: 'Ressources' };

function adresse(...segments) { return '#/' + segments.map(s => encodeURIComponent(String(s))).join('/'); }

/* La liste des routes, à partir de ce que la base contient. Une route absente
 * de la base (aucune marque, aucune version historique…) n'est pas inventée :
 * elle est signalée dans `manquantes`. Chaque route porte le nom de l'écran tel
 * que l'application le nomme (« Ressources · Doctrine »), pour la relecture. */
export function routesDe(inv) {
  const routes = [], manquantes = [];
  const ajouter = (id, espace, hash, nom, action = null, cible = null) => routes.push({ id, espace, hash, nom, action, ...(cible ? { cible } : {}) });
  ajouter('bureau', 'bureau', '#/bureau', 'Bureau');
  ajouter('projets/en-cours', 'projets', '#/projets', 'Projets en cours');
  ajouter('projets/archives', 'projets', '#/projets/archives', 'Archives');
  ajouter('projets/par-marque', 'projets', '#/projets/marques', 'Par marque');
  ajouter('projets/galerie', 'projets', '#/projets/galerie', 'Galerie');
  if (inv.marque) ajouter('projets/marque', 'projets', adresse('projets', inv.marque), 'Une marque');
  else manquantes.push('projets/marque');
  if (inv.campagne) ajouter('projets/campagne', 'projets', adresse('projets', inv.campagne), 'Une campagne');
  else manquantes.push('projets/campagne');

  const pc = inv.pieces || {};
  if (pc.attente) for (const mode of ['poser', 'juger', 'origine'])
    ajouter('piece/' + mode, 'piece', adresse('projets', pc.attente.p, 'livrables', pc.attente.l, mode), 'Pièce · ' + ONGLETS_PIECE[mode]);
  else manquantes.push('piece/poser', 'piece/juger', 'piece/origine');
  if (pc.approuvee) ajouter('piece/remise', 'piece', adresse('projets', pc.approuvee.p, 'livrables', pc.approuvee.l, 'remise'), 'Pièce · ' + ONGLETS_PIECE.remise);
  else manquantes.push('piece/remise');
  if (pc.historique) ajouter('piece/version-historique', 'piece',
    adresse('projets', pc.historique.p, 'livrables', pc.historique.l, 'juger', pc.historique.n), 'Pièce · ' + ONGLETS_PIECE.juger + ', version précédente');
  else manquantes.push('piece/version-historique');
  if (pc.piste) ajouter('piece/piste', 'piece', adresse('projets', pc.piste.p, 'pistes', pc.piste.id), 'Piste');
  else manquantes.push('piece/piste');

  for (const vue of ['valider', 'planning', 'reporting', 'referentiel']) {
    const modes = (inv.modes && Array.isArray(inv.modes[vue]) && inv.modes[vue].length) ? inv.modes[vue] : MODES_ATTENDUS[vue];
    for (const mode of modes) {
      const m = typeof mode === 'string' ? { cle: mode } : mode;
      ajouter(vue + '/' + m.cle, ESPACE_DE[vue], adresse(vue, m.cle), NOM_VUE[vue] + ' · ' + (m.nom || m.cle));
    }
  }
  ajouter('plus', 'plus', '#/plus', 'Plus');
  ajouter('recherche', 'recherche', '#/bureau', 'Recherche ouverte', 'recherche');
  ajouter('nouveau-projet', 'nouveau-projet', '#/projets', 'Nouveau projet ouvert', 'nouveau-projet');

  for (const n of inv.natures || []) {
    const id = (inv.dossiers || {})[n.cle] || (inv.temoins || {})[n.cle];
    if (!id) { manquantes.push('dossier/' + n.cle); continue; }
    const temoin = !(inv.dossiers || {})[n.cle];
    ajouter('dossier/' + n.cle, 'dossier', adresse('projets', id), n.nom + (temoin ? ' (projet témoin vide)' : '') + ' · vue d’ensemble');
    for (const s of n.sections) ajouter('dossier/' + n.cle + '/' + s, 'dossier', adresse('projets', id, s), n.nom + ' · ' + ((inv.nomsSections || {})[s] || s));
  }
  /* Le formulaire de demande de proposition, ouvert depuis les pistes d'un
   * dossier : un vrai dossier d'abord, un projet témoin sinon. */
  const avecPistes = (inv.natures || []).filter(n => (n.sections || []).includes('pistes'));
  const dossierPistes = avecPistes.map(n => (inv.dossiers || {})[n.cle]).find(Boolean) || avecPistes.map(n => (inv.temoins || {})[n.cle]).find(Boolean);
  if (dossierPistes) ajouter('demande', 'demande', adresse('projets', dossierPistes, 'pistes'), 'Demande de proposition ouverte', 'demande', dossierPistes);
  else manquantes.push('demande');
  if (inv.jeton) ajouter('partage', 'partage', adresse('partage', inv.jeton), 'Page partagée');
  else manquantes.push('partage');
  return { routes, manquantes };
}

/* Ce que la base contient, lu dans la page. Exécuté dans le navigateur. */
function inventaire() {
  const modes = v => (v && Array.isArray(v.MODES) ? v.MODES.map(m => ({ cle: m.cle, nom: m.nom || m.cle })) : null);
  const projets = DEPOT.liste('projets').filter(p => p && !p.fusionne);
  const natures = (window.NATURE ? NATURE.liste() : []).map(n => ({ cle: n.cle, nom: n.nom, sections: (n.sections || []).slice() }));
  const nomsSections = {};
  for (const n of natures) for (const s of n.sections)
    nomsSections[s] = window.VUE_PROJETS && VUE_PROJETS.nomSection ? VUE_PROJETS.nomSection(s) : s;
  const dossiers = {};
  for (const n of natures) {
    const candidats = projets.filter(p => (NATURE.de(p) || {}).cle === n.cle)
      .sort((a, b) => (b.livrables || []).length - (a.livrables || []).length);
    if (candidats[0]) dossiers[n.cle] = candidats[0].id;
  }
  const pieces = [];
  for (const p of projets) for (const l of p.livrables || []) {
    if (!l || l.annule) continue;
    const vs = (l.versions || []).filter(Boolean);
    const courante = vs.find(v => v.n === (l.version || 1)) || vs[vs.length - 1] || null;
    pieces.push({ p: p.id, l: l.id, nb: vs.length, n: vs[0] ? vs[0].n || 1 : 1, verdict: courante ? courante.verdict || null : null, courante: !!courante,
      ouvert: !(window.CLOTURE && CLOTURE.est(p)), fichiers: (l.fichiers || []).length });
  }
  /* Une pièce d'un dossier ouvert d'abord : c'est là que le travail se fait. */
  pieces.sort((a, b) => (b.ouvert - a.ouvert) || (b.fichiers - a.fichiers));
  const attente = pieces.find(x => x.courante && !x.verdict) || pieces[0] || null;
  const approuvee = pieces.find(x => x.verdict === 'approuve') || attente;
  const historique = pieces.find(x => x.nb >= 2) || null;
  let piste = null;
  for (const p of projets) { const pi = ((p.sections || {}).pistes || []).find(Boolean); if (pi) { piste = { p: p.id, id: pi.id }; break; } }
  let jeton = null;
  for (const p of projets) for (const d of Object.keys(p.partages || {}))
    if (!jeton && p.partages[d] && p.partages[d].jeton) jeton = p.partages[d].jeton;
  const nom = projets.map(p => String(p.nom || '')).find(x => x.trim().length >= 3) || 'KV';
  return {
    modes: { valider: modes(window.VUE_DECIDER), planning: modes(window.VUE_PLACER), reporting: modes(window.VUE_CONSTATER), referentiel: modes(window.VUE_MAISON) },
    natures, nomsSections, dossiers, pieces: { attente, approuvee, historique, piste },
    marque: (DEPOT.liste('marques').find(m => m && /^MQ-/.test(m.id)) || {}).id || null,
    campagne: (DEPOT.liste('campagnes').find(c => c && /^CMP-/.test(c.id)) || {}).id || null,
    jeton, recherche: nom.trim().split(/\s+/)[0].slice(0, 12),
    volume: { projets: projets.length, livrables: pieces.length },
  };
}

/* ————— Options ————— */

const AIDE = `Usage : BROWSER_CHANNEL=chrome node outils/recette-captures.mjs [options]

  --avant | --apres     range les captures dans <sortie>/avant ou <sortie>/apres ;
                        avec --apres, la planche compare à <sortie>/avant s'il existe
  --sortie <dossier>    dossier de sortie, hors du dépôt (défaut : ../recette-adoption/<branche>,
                        un dossier par branche) ; un dossier qui ne vient pas d'une
                        recette n'est jamais vidé ni écrasé
  --ou                  affiche le dossier de sortie, puis s'arrête (pour une passe faite
                        depuis un export : documents/FINI.md, section 2)
  --commit <sha>        nomme la passe faite depuis un export (git archive), hors de git
  --base <fichier>      base importée en mémoire (défaut : vitrine/demo/base-fictive.json)
  --medias <dossier>    où chercher les images que la base cite (défaut : le dossier de la base)
  --largeurs 320,390,1440   largeurs en px (3200 en option)
  --routes <expression> ne capture que les routes dont l'identifiant correspond ;
                        avec --apres, la comparaison ne porte que sur elles
  --horloge <date ISO>  fige l'heure de la page (défaut : avec --apres, celle de la passe
                        « avant » ; sinon, l'heure du début de la passe)
  --cibles <dossier>    planches cibles de la conception, montrées en tête de chaque espace
  --premier-ecran       ne photographie que le premier écran (défaut : la page entière ;
                        --pleine-page le dit explicitement)
  --strict              sort en erreur s'il y a une exception, un débordement, une valeur
                        technique affichée ou un terme interdit, visible ou replié`;

/* Git, sans bruit : hors d'un dépôt (un export pour la passe « avant »), il
 * répond null au lieu d'écrire « fatal » sur la sortie d'erreur. */
function git(...args) {
  try { return execFileSync('git', ['-C', RACINE, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; }
  catch { return null; }
}
function commit() { return git('rev-parse', '--short', 'HEAD'); }

/* L'heure du poste, à la minute, au format de --horloge. */
export function heureDuPoste(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':00';
}

/* La sortie par défaut : un dossier par branche, à côté du dépôt. Deux lots
 * qui lancent la recette en même temps n'écrasent pas leurs passes. */
export function sortieParDefaut(branche = git('rev-parse', '--abbrev-ref', 'HEAD'), sha = commit()) {
  const nom = branche && branche !== 'HEAD' ? branche : sha ? 'commit-' + sha : 'hors-git';
  return resolve(RACINE, '..', 'recette-adoption', nom.replace(/[^\p{L}\p{N}._-]+/gu, '-'));
}

export function lireArguments(args) {
  const o = { sortie: null, temps: null, base: join(RACINE, 'vitrine', 'demo', 'base-fictive.json'), commit: null,
    medias: null, largeurs: LARGEURS.slice(), routes: null, filtre: null, horloge: null, cibles: null, pleinePage: true, strict: false, aide: false, ou: false };
  const valeur = (i, nom) => { const v = args[i + 1]; if (v === undefined || v.startsWith('--')) throw new Error(nom + ' attend une valeur.'); return v; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--aide' || a === '-h' || a === '--help') o.aide = true;
    else if (a === '--ou') o.ou = true;
    else if (a === '--avant' || a === '--apres') {
      if (o.temps) throw new Error('Choisissez --avant ou --apres, pas les deux.');
      o.temps = a.slice(2);
    }
    else if (a === '--sortie') o.sortie = resolve(valeur(i++, a));
    else if (a === '--base') o.base = resolve(valeur(i++, a));
    else if (a === '--medias') o.medias = resolve(valeur(i++, a));
    else if (a === '--largeurs') {
      o.largeurs = valeur(i++, a).split(',').map(x => Number(x.trim()));
      if (!o.largeurs.length || o.largeurs.some(n => !Number.isInteger(n) || n < 240 || n > 4000)) throw new Error('--largeurs attend des nombres entre 240 et 4000, séparés par des virgules.');
    }
    else if (a === '--routes') {
      const v = valeur(i++, a);
      try { o.routes = new RegExp(v); } catch (e) { throw new Error('--routes attend une expression régulière : ' + e.message); }
      o.filtre = v;
    }
    else if (a === '--horloge') {
      o.horloge = valeur(i++, a);
      if (Number.isNaN(Date.parse(o.horloge))) throw new Error('--horloge attend une date ISO, par exemple 2026-11-26T09:00:00.');
    }
    else if (a === '--commit') {
      o.commit = valeur(i++, a);
      if (!/^[0-9a-f]{4,40}$/i.test(o.commit)) throw new Error('--commit attend l’identifiant d’un commit, par exemple 848a1ed.');
    }
    else if (a === '--cibles') o.cibles = resolve(valeur(i++, a));
    else if (a === '--pleine-page') o.pleinePage = true;
    else if (a === '--premier-ecran') o.pleinePage = false;
    else if (a === '--strict') o.strict = true;
    else throw new Error('Option inconnue : ' + a);
  }
  if (!o.medias) o.medias = dirname(o.base);
  if (!o.sortie) o.sortie = sortieParDefaut(undefined, o.commit || undefined);
  const dans = relative(RACINE, o.sortie);
  if (!dans || (!dans.startsWith('..') && !isAbsolute(dans)))
    throw new Error('La sortie doit être hors du dépôt : les captures d’une vraie base montrent des clients (documents/FINI.md).');
  o.dossier = o.temps ? join(o.sortie, o.temps) : o.sortie;
  return o;
}

/* ————— La planche-contact ————— */

function echapper(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function lien(depuis, fichier) { return relative(depuis, fichier).split(sep).map(encodeURIComponent).join('/'); }

/* La typographie française : une espace insécable avant « ; ? ! % » (fine)
 * et « : » (normale), à l'intérieur des guillemets, et entre un nombre et son
 * unité (« 2 px », « 52 pixels »), pour qu'aucun signe ni aucune unité ne
 * commence une ligne sur un téléphone. Seul le texte est touché, jamais une
 * balise ni la feuille de style. */
export function typographie(html) {
  return html.replace(/>([^<]+)</g, (m, t) => '>' + t
    .replace(/ ([;?!%])/g, '\u202f$1')
    .replace(/(\d) (px|pixels?)\b/g, '$1\u00a0$2')
    .replace(/ :/g, '\u00a0:')
    .replace(/« /g, '«\u00a0')
    .replace(/ »/g, '\u00a0»') + '<');
}

/* « 0 exception », « 1 exception », « 2 exceptions ». */
export function pluriel(n, un, plusieurs = un + 's') { return n + ' ' + (n > 1 ? plusieurs : un); }
function enumerer(t) { return t.length < 2 ? t.join('') : t.slice(0, -1).join(', ') + ' et ' + t[t.length - 1]; }
function nombre(x) { return (x && x.nombre) || 0; }
function occurrences(termes) { return (termes || []).reduce((n, t) => n + t.nombre, 0); }
function listeTermes(termes) { return termes.map(t => t.terme + (t.nombre > 1 ? ' ×' + t.nombre : '')).join(', '); }
function pourcent(part) { return part < 0.001 ? 'moins de 0,1 %' : (part * 100).toFixed(1).replace('.', ',') + ' %'; }

/* La date d'une passe, en clair et à l'heure du poste. */
export function dateLisible(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const jour = /^\d{4}-\d{2}-\d{2}$/.test(String(iso));
  return d.toLocaleString('fr-FR', jour ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
function nomBase(fichier) { return fichier === 'base-fictive.json' ? 'base fictive (base-fictive.json)' : 'base ' + fichier; }

/* Ce qu'il faut regarder sur une capture : [nature, libellé, premier extrait,
 * où le trouver dans la page]. L'extrait est ce que l'écran montre ; le
 * sélecteur ne sert qu'à qui corrige le code. */
export function problemes(c) {
  const p = [];
  const premier = x => (x && x.exemples && x.exemples[0]) || null;
  if (c.exceptions.length) p.push(['exception', pluriel(c.exceptions.length, 'exception'), c.exceptions[0], '']);
  if (c.debordement > 0) p.push(['debordement', 'déborde de ' + c.debordement + ' px', '', '']);
  if (nombre(c.horsEcran)) {
    const x = premier(c.horsEcran);
    p.push(['hors-ecran', pluriel(nombre(c.horsEcran), 'contrôle hors écran', 'contrôles hors écran'), x ? x.texte || '(sans texte)' : '', x ? x.selecteur : '']);
  }
  if (nombre(c.coupes)) {
    const x = premier(c.coupes);
    p.push(['coupe', pluriel(nombre(c.coupes), 'texte coupé', 'textes coupés'), x ? x.texte : '', x ? x.selecteur : '']);
  }
  if ((c.valeurs || []).length) p.push(['valeur', 'affiche ' + c.valeurs.map(v => '« ' + v.terme + ' »').join(', '), c.valeurs[0].extraits[0] || '', '']);
  if (c.termes.length) p.push(['terme', listeTermes(c.termes), c.termes[0].extraits[0] || '', '']);
  if ((c.termesReplies || []).length) p.push(['replie', 'replié : ' + listeTermes(c.termesReplies), c.termesReplies[0].extraits[0] || '', '']);
  if (c.images && c.images.cassees) p.push(['image', pluriel(c.images.cassees, 'image cassée', 'images cassées'), '', '']);
  if (c.introuvable) p.push(['introuvable', 'page introuvable', '', '']);
  else if (c.vide) p.push(['vide', 'presque vide', '', '']);
  return p;
}

/* Les alertes, regroupées par écran : chaque alerte une fois, avec les
 * largeurs où elle se voit et sa première phrase. */
function aRegarder(captures) {
  const routes = new Map();
  for (const c of captures) for (const [nature, libelle, extrait, detail] of problemes(c)) {
    if (!routes.has(c.id)) routes.set(c.id, { nom: c.nom || c.id, alertes: new Map() });
    const a = routes.get(c.id).alertes;
    if (!a.has(nature)) a.set(nature, { libelle, extrait, detail, largeurs: [] });
    const x = a.get(nature);
    x.largeurs.push(c.largeur);
    if (!x.extrait && extrait) { x.extrait = extrait; x.detail = detail; }
  }
  return routes;
}
/* Les sortes d'alertes présentes, dans l'ordre de `problemes`. */
const SORTES = { exception: 'exceptions', debordement: 'débordements', 'hors-ecran': 'contrôles hors écran', coupe: 'textes coupés',
  valeur: 'valeurs techniques', terme: 'termes', replie: 'termes repliés', image: 'images cassées', introuvable: 'pages introuvables', vide: 'pages presque vides' };
function sortesDAlertes(regarder) {
  const vues = new Set();
  for (const x of regarder.values()) for (const k of x.alertes.keys()) vues.add(k);
  return Object.keys(SORTES).filter(k => vues.has(k)).map(k => SORTES[k]);
}

/* Le texte de la page a-t-il changé entre deux passes ? Sans empreinte d'un
 * côté (une passe d'une version plus ancienne), on ne sait pas : non. */
function texteChange(c, a) { return !!(c && a && c.empreinteTexte && a.empreinteTexte && c.empreinteTexte !== a.empreinteTexte); }

/* L'état d'une capture par rapport à la passe « avant ». Une capture qui
 * diffère d'une passe prise dans d'autres conditions (autre version de
 * l'outil, autre poste, autre horloge) n'est pas « modifiée » : elle n'est pas
 * comparée. Une photo identique dont le texte change (dans un bloc replié, ou
 * hors de la photo) est modifiée. */
function etat(c, a, memeMesure = true, horsFiltre = false) {
  if (!a) return horsFiltre ? 'hors' : 'nouvelle';
  if (!a.empreinte || !c.empreinte) return 'inconnue';
  const texte = texteChange(c, a);
  if (a.empreinte === c.empreinte && !texte) return 'identique';
  if (!memeMesure) return 'inconnue';
  if (texte) return 'modifiee';
  return aLOeil(c.ecart) ? 'quasi' : 'modifiee';
}
/* « hors » : une route que la passe « avant », lancée avec un autre --routes,
 * n'a pas prise. Elle n'est ni nouvelle ni comparée. */
const ETATS = { nouvelle: 'nouvelle', inconnue: 'non comparée', identique: 'identique', quasi: 'identique à l’œil', modifiee: 'modifiée',
  hors: 'hors de la comparaison (autre filtre)' };

/* Où le changement se voit, dans une photo de la page entière : le
 * rectangle des pixels changés, rapporté à la hauteur de l'écran. Quand la
 * page change de hauteur, tout ce qui suit la première rangée changée bouge :
 * le changement part de là jusqu'en bas. */
export function ouChange(c) {
  const x = c && c.ecart;
  if (!x || !c.hauteurPhoto) return '';
  const h = c.hauteurEcran || HAUTEURS[c.largeur] || 900;
  if (x.pixels === null) return typeof x.debut === 'number' ? (x.debut >= h ? 'sous le premier écran' : 'dès le premier écran') : '';
  if (!x.cadre) return '';
  if (x.cadre[1] >= h) return 'sous le premier écran';
  if (x.cadre[3] <= h) return 'dans le premier écran';
  return 'dès le premier écran';
}

/* Ce qui change dans une capture modifiée :
 *   'texte'    la photo est la même (même empreinte, ou pas un pixel de
 *              différent) : seul le texte a changé, replié ou hors de la photo ;
 *   'hauteur'  la page a changé de hauteur (ou de largeur) ;
 *   'photo'    des pixels changent, à la même taille.
 * `ou` dit où, quand on le sait (ouChange). Un écart qui n'a pas pu être lu
 * donne 'photo', sans précision : on ne sait pas où regarder. */
export function changement(c, a) {
  const x = c && c.ecart;
  if ((a && a.empreinte && c.empreinte === a.empreinte) || (x && x.pixels === 0)) return { sorte: 'texte', ou: '' };
  if (x && x.pixels === null && x.taille) return { sorte: 'hauteur', ou: ouChange(c) };
  if (x && x.pixels) return { sorte: 'photo', ou: ouChange(c) };
  return { sorte: 'photo', ou: '' };
}

/* La précision d'un écran touché, d'après ce qui change à chaque largeur :
 * « texte seulement » si aucune photo ne change ; « sous le premier écran »
 * si tout ce qui change dans les photos est plus bas ; « la page change de
 * hauteur » si elle s'allonge ou raccourcit à une largeur au moins. */
export function precisionEcran(changements) {
  if (!changements.length) return '';
  if (changements.every(x => x.sorte === 'texte')) return 'texte seulement';
  const photos = changements.filter(x => x.sorte !== 'texte');
  const t = [];
  if (photos.every(x => x.ou === 'sous le premier écran')) t.push('sous le premier écran');
  if (photos.some(x => x.sorte === 'hauteur')) t.push('la page change de hauteur');
  return t.join(', ');
}

/* « nuance 1/255 sur 52 pixels, hors des images ». Les pixels sont ceux de
 * l'image : deux par px CSS au téléphone. */
export function decrireNuance(x) {
  const hors = x.hors || { pixels: x.pixels, max: x.max }, images = x.images || { pixels: 0, max: 0 };
  const une = (z, ou) => 'nuance ' + z.max + '/255 sur ' + pluriel(z.pixels, 'pixel').replace(/^\d+/, z.pixels.toLocaleString('fr-FR')) + ', ' + ou;
  return [hors.pixels ? une(hors, 'hors des images') : '', images.pixels ? une(images, 'dans une image') : ''].filter(Boolean).join(' ; ');
}

function libelleEtat(e, c, a) {
  const x = c.ecart;
  if (e === 'modifiee') {
    const { sorte, ou } = changement(c, a);
    if (sorte === 'texte') return 'modifiée · texte seulement (replié ou hors de la photo)';
    if (sorte === 'hauteur') {
      const d = c.densite || 1, h0 = Math.round(x.taille[1] / d), h1 = Math.round(x.taille[3] / d);
      if (x.taille[0] !== x.taille[2]) return 'modifiée · autre largeur';
      return [h0 === h1 ? 'modifiée · la page change de hauteur' : 'modifiée · la page passe de ' + h0.toLocaleString('fr-FR') + ' à ' + h1.toLocaleString('fr-FR') + ' px de haut', ou].filter(Boolean).join(', ');
    }
    if (x && x.pixels) return ['modifiée · ' + pluriel(x.pixels, 'pixel').replace(/^\d+/, x.pixels.toLocaleString('fr-FR')) + (x.part ? ' (' + pourcent(x.part) + ')' : ''), ou].filter(Boolean).join(', ');
    return 'modifiée';
  }
  if (e === 'quasi' && x && x.max) return 'identique à l’œil · ' + decrireNuance(x);
  return ETATS[e];
}

/* Pourquoi deux passes ne se comparent pas, en clair : la version de l'outil,
 * le poste de capture, l'horloge, ou plusieurs d'entre eux. */
export function causes(cmp) {
  const m = (cmp && cmp.mesure) || {}, t = [];
  if (m.version === false) t.push(m.avant ? 'une autre version de l’outil (la ' + m.avant + ' ; celle-ci est la ' + m.apres + ')'
    : 'une version de l’outil qui ne notait pas encore la sienne');
  if (m.contexte === false && m.avant) t.push(m.poste === 'cadrage' ? 'un autre cadrage (page entière d’un côté, premier écran de l’autre)'
    : 'un autre poste de capture (taille, densité ou réglages du navigateur)');
  if (m.horloge === false) {
    const h = (cmp.horloge || {});
    t.push('une autre horloge (' + (h.avant ? dateLisible(h.avant) : 'l’heure réelle') + ' ; celle-ci : ' + (h.apres ? dateLisible(h.apres) : 'l’heure réelle') + ')');
  }
  return t;
}
/* Ce qu'il faut faire : un remède par cause, tous à faire.
 *   - autre version ou autre poste : refaire l'avant, avec cet outil et les
 *     mêmes réglages (le cadrage compris) ;
 *   - autre cadrage seulement : relancer l'après avec celui de l'avant ;
 *   - autre horloge : relancer l'après sans --horloge, qui reprend celle de
 *     l'avant. */
export function remede(cmp) {
  const m = (cmp && cmp.mesure) || {};
  const t = [];
  const refaireAvant = m.version === false || (m.contexte === false && m.poste !== 'cadrage');
  if (refaireAvant) t.push('refaites la passe « avant » avec cet outil et les mêmes réglages (documents/FINI.md, section 2)');
  const options = [];
  if (!refaireAvant && m.contexte === false && m.poste === 'cadrage')
    options.push(m.cadrageAvant === 'premier-ecran' ? 'avec --premier-ecran' : 'sans --premier-ecran');
  if (m.horloge === false) options.push('sans --horloge');
  if (options.length) t.push('relancez la passe « après » ' + enumerer(options)
    + (m.horloge === false ? ' : elle reprend alors l’horloge de l’avant' : ', comme l’avant'));
  return t.join(' et ');
}

/* L'avertissement de tête : l'avant ne se compare pas à cette passe. */
function alerteVersion(cmp) {
  if (!cmp || !cmp.mesure || cmp.mesure.identique) return '';
  const r = remede(cmp);
  return `<p class="alerte-version"><b>La passe « avant » n’a pas été prise dans les mêmes conditions : ${echapper(enumerer(causes(cmp)))}.</b> ${r ? echapper(r.charAt(0).toUpperCase() + r.slice(1)) + '. ' : ''}En attendant, une capture qui diffère n’est pas comptée comme modifiée mais « non comparée », aucun écran n’est donné pour touché, et les alertes « nouvelles » ne sont pas sûres : l’autre passe ne les mesurait peut-être pas de la même façon.</p>`;
}

/* Le filtre --routes des deux passes : l'état en mémoire de l'application
 * dépend des routes visitées avant (un brouillon de présentation se crée à
 * l'ouverture d'un onglet), donc deux passes filtrées différemment peuvent
 * différer sans que le code ait changé. */
export function filtresDifferents(cmp) { return !!(cmp && cmp.filtres && (cmp.filtres.avant || null) !== (cmp.filtres.apres || null)); }

function blocComparaison(cmp, noms, captures, pleinePage, avantParCle = new Map(), horsFiltre = []) {
  const nom = id => noms.get(id) || id;
  const ecran = id => `<a href="#${echapper(id)}" title="${echapper(id)}">${echapper(nom(id))}</a>`;
  const routes = t => (t.length ? t.map(ecran).join(', ') : 'aucun');
  const captureDe = k => { const [id, l] = k.split('@'); return ecran(id) + ' à ' + l + ' px'; };
  const listeCaptures = (t, aucun = 'aucun') => (t === null ? 'non mesuré avant' : t.length ? t.map(captureDe).join(', ') : aucun);
  const avantApres = x => (x.avant === null || x.avant === undefined ? 'non mesuré avant → ' + x.apres : x.avant + ' → ' + x.apres);
  const parCle = new Map((captures || []).map(c => [c.id + '@' + c.largeur, c]));
  const comparable = !cmp.mesure || cmp.mesure.identique;
  /* Les écrans touchés, et pour chacun ce qui change à ses largeurs
   * (precisionEcran) : plus bas que le premier écran, la hauteur de la page,
   * ou le texte seulement. */
  const touches = new Map();
  for (const k of cmp.modifiees) {
    const id = k.split('@')[0];
    if (!noms.has(id)) continue;
    const c = parCle.get(k);
    if (!touches.has(id)) touches.set(id, []);
    touches.get(id).push(c ? changement(c, avantParCle.get(k)) : { sorte: 'photo', ou: '' });
  }
  const ecransTouches = [...touches].map(([id, t]) => { const p = precisionEcran(t); return ecran(id) + (p ? ' (' + p + ')' : ''); }).join(', ');
  const sur = comparable ? '' : ' <i>(à refaire : l’avant n’a pas été pris dans les mêmes conditions)</i>';
  const nuancees = (cmp.nuancees || []).map(x => captureDe(x.capture) + ' (' + decrireNuance(x) + ')');
  /* Le même changement de texte à plusieurs largeurs d'un écran : une fois,
   * avec ses largeurs. */
  const groupes = new Map();
  for (const x of cmp.textes || []) {
    const [id, l] = x.capture.split('@');
    const k = JSON.stringify([id, x.ajoute, x.retire]);
    if (!groupes.has(k)) groupes.set(k, { id, ajoute: x.ajoute, retire: x.retire, largeurs: [] });
    groupes.get(k).largeurs.push(l);
  }
  const q = t => '<q>' + echapper(t) + '</q>';
  const tousTextes = [...groupes.values()].map(g => ecran(g.id) + ' à ' + enumerer(g.largeurs) + ' px : '
    + (g.ajoute && g.retire ? q(g.ajoute) + ' au lieu de ' + q(g.retire) : g.ajoute ? q(g.ajoute) + ' en plus' : g.retire ? q(g.retire) + ' en moins'
      : 'une ligne répétée une fois de plus ou de moins, ou une ligne longue changée plus loin que l’extrait gardé'));
  const textes = tousTextes.slice(0, 12);
  const seuils = `le lissage d’une image (jusqu’à ${ECART.image}/255, dans les images) et le crénelage de quelques bords (au plus ${ECART.bruit}/255, sur moins de ${pourcent(ECART.partBruit).replace('moins de ', '')} de la photo, hors des images)`;
  const filtres = cmp.filtres && (cmp.filtres.avant || cmp.filtres.apres)
    ? `<p class="meta">Comparaison limitée aux routes ${[['avant', cmp.filtres.avant], ['après', cmp.filtres.apres]].filter(x => x[1]).map(([t, f]) => '<code>' + echapper(f) + '</code> (' + t + ')').join(' et ')}.${filtresDifferents(cmp)
      ? ' <b>Les deux passes n’ont pas le même filtre</b> : l’état en mémoire de l’application dépend des routes visitées avant (un brouillon se crée à l’ouverture d’un onglet), une capture peut donc changer sans que le code ait changé. Relancez-les avec le même --routes, ou toutes deux complètes.' : ''}</p>` : '';
  return `<section class="comparaison"><h2>Ce qui a changé depuis la passe « avant »</h2>
<p class="meta">On compare ${pleinePage ? 'la page entière, de haut en bas' : 'le premier écran seulement'}, au pixel, et tout le texte de la page, blocs repliés et bulles d’aide compris${pleinePage ? '' : ' : un changement plus bas qui ne touche pas le texte ne se voit pas'}.</p>
<ul>
<li><b>${pluriel(cmp.modifiees.length, 'capture modifiée', 'captures modifiées')}</b>, ${pluriel(cmp.identiques + cmp.identiquesALOeil, 'identique', 'identiques')}${cmp.identiquesALOeil ? ' (dont ' + cmp.identiquesALOeil + ' à l’œil seulement : le lissage d’une image ou le crénelage de quelques bords, listées ci-dessous)' : ''}${cmp.nonComparees ? ', ' + pluriel(cmp.nonComparees, 'non comparée', 'non comparées') : ''}. Écrans touchés : ${comparable ? ecransTouches || 'aucun' : 'non comparés (voir l’avertissement en tête)'}.</li>
${nuancees.length ? `<li>Identiques à l’œil, à vérifier d’un regard : ${nuancees.join(', ')}. Seuls sont pardonnés ${seuils} ; tout autre écart rend la capture « modifiée ».</li>` : ''}
${textes.length ? `<li>Textes changés : ${textes.join(' ; ')}${tousTextes.length > textes.length ? ' ; et ' + pluriel(tousTextes.length - textes.length, 'autre') : ''}.</li>` : ''}
<li>Écrans nouveaux : ${routes(cmp.routesNouvelles)}. Écrans disparus : ${cmp.routesDisparues.length ? cmp.routesDisparues.map(id => echapper(nom(id))).join(', ') : 'aucun'}.${horsFiltre.length ? ' Écrans hors du filtre de la passe « avant », donc non comparés : ' + routes(horsFiltre) + '.' : ''}</li>
<li>Termes interdits visibles : ${avantApres(cmp.termes)} ; dans un bloc replié ou une bulle : ${avantApres(cmp.termesReplies)}${sur}.</li>
<li>Exceptions nouvelles : ${listeCaptures(cmp.exceptionsNouvelles, 'aucune')}. Débordements nouveaux : ${listeCaptures(cmp.debordementsNouveaux)}.</li>
<li>Textes coupés nouveaux : ${listeCaptures(cmp.coupesNouvelles)}. Contrôles hors écran nouveaux : ${listeCaptures(cmp.horsEcranNouveaux)}. Valeurs techniques nouvelles : ${listeCaptures(cmp.valeursNouvelles, 'aucune')}.</li>
${cmp.base === false ? '<li>La base n’est pas la même que celle de la passe « avant » : une partie des écarts vient d’elle.</li>' : ''}
</ul>
${filtres}
<label class="filtre"><input type="checkbox" id="seulement"> N’afficher que les captures à regarder : modifiées, nouvelles, nuancées ou non comparées</label>
<p class="rien">Aucune capture modifiée, nouvelle ou nuancée depuis la passe « avant ».</p>
</section>`;
}

export function planche(r, { dossier, avant = null, avantDossier = null, cibles = {} } = {}) {
  const parCle = new Map();
  if (avant) for (const c of avant.captures) parCle.set(c.id + '@' + c.largeur, c);
  const groupes = ESPACES.map(([cle, nom]) => ({ cle, nom, routes: [] }));
  const ordre = new Map();
  for (const c of r.captures) {
    if (!ordre.has(c.id)) { ordre.set(c.id, []); (groupes.find(g => g.cle === c.espace) || groupes[0]).routes.push(c.id); }
    ordre.get(c.id).push(c);
  }
  const noms = new Map(r.captures.map(c => [c.id, c.nom || c.id]));
  if (avant) for (const c of avant.captures) if (!noms.has(c.id)) noms.set(c.id, c.nom || c.id);
  const badge = c => problemes(c).map(([k, t]) => `<span class="badge ${k}">${echapper(t)}</span>`).join('');
  const image = (titre, fichier, depuis) => `<a href="${lien(dossier, join(depuis, fichier))}" title="${echapper(titre)}"><img loading="lazy" alt="${echapper(titre)}" src="${lien(dossier, join(depuis, fichier))}"></a>`;
  const s = r.resume;
  const temps = r.temps ? ' · ' + ({ avant: 'avant', apres: 'après' }[r.temps] || echapper(r.temps)) : '';
  const cmp = avant ? (r.comparaison || comparer(avant, r)) : null;
  const memeMesure = !cmp || !cmp.mesure || cmp.mesure.identique;
  /* Les routes que la passe « avant », lancée avec un autre --routes, n'a pas
   * prises : hors de la comparaison, ni nouvelles ni comparées. */
  let filtreAvant = null;
  try { filtreAvant = avant && avant.filtre ? new RegExp(avant.filtre) : null; } catch { /* filtre illisible : aucun */ }
  const horsFiltre = id => !!(filtreAvant && !filtreAvant.test(id));
  const sections = groupes.filter(g => g.routes.length).map(g => {
    const cible = cibles[g.cle] ? `<a class="cible" href="${lien(dossier, cibles[g.cle])}" title="Ouvrir la planche cible en grand"><img loading="lazy" alt="Planche cible" src="${lien(dossier, cibles[g.cle])}"><span>Planche cible</span></a>` : '';
    const lignes = g.routes.map(id => {
      const cs = ordre.get(id);
      let aVoir = false;
      const cellules = cs.map(c => {
        const a = parCle.get(c.id + '@' + c.largeur);
        const e = avant ? etat(c, a, memeMesure, horsFiltre(c.id)) : null;
        if (e && e !== 'identique' && e !== 'hors') aVoir = true;
        const contenu = avant
          ? `<div class="paire"><div><small>Avant</small>${a ? image('Avant', a.fichier, avantDossier) : '<p class="absent">absente</p>'}</div><div><small>Après</small>${image('Après', c.fichier, dossier)}</div></div>`
          : image(c.nom + ' à ' + c.largeur + ' px', c.fichier, dossier);
        return `<figure class="${e || ''}"><figcaption><b>${c.largeur} px</b>${e ? ` <span class="badge etat ${e}">${echapper(libelleEtat(e, c, a))}</span>` : ''} ${badge(c)}</figcaption>${contenu}</figure>`;
      }).join('');
      const c0 = cs[0];
      /* Une colonne par largeur, proportionnée sans écraser le téléphone. */
      const colonnes = cs.map(c => Math.sqrt(c.largeur).toFixed(1) + 'fr').join(' ');
      return `<article id="${echapper(id)}"${aVoir ? ' class="a-voir"' : ''}><header><h3>${echapper(c0.nom || id)}</h3><span>${echapper(c0.titre || '(sans titre)')}</span><code title="L’identifiant de la route et son adresse">${echapper(id)} · ${echapper(c0.hash)}</code></header><div class="largeurs" style="grid-template-columns:${colonnes}">${cellules}</div></article>`;
    }).join('');
    return `<section><div class="tete"><h2>${echapper(g.nom)}</h2>${cible}</div>${lignes}</section>`;
  }).join('');
  const regarder = aRegarder(r.captures);
  const liste = [...regarder].map(([id, x]) => `<li><a href="#${echapper(id)}" title="${echapper(id)}">${echapper(x.nom)}</a><ul>${[...x.alertes].map(([k, a]) =>
    `<li><span class="badge ${k}">${echapper(a.libelle)}</span> à ${enumerer(a.largeurs.map(String))} px${a.extrait ? ` : <q>${echapper(a.extrait)}</q>` : ''}${a.detail ? `<br><small class="tech" title="Où le trouver dans la page">${echapper(a.detail)}</small>` : ''}</li>`).join('')}</ul></li>`).join('');
  const horloge = r.horloge ? ' · horloge figée au ' + echapper(dateLisible(r.horloge)) + (r.horlogeReprise ? ' (reprise de la passe « avant »)' : '') : '';
  const telephone = r.largeurs.some(l => l < TELEPHONE) ? ` (sous ${TELEPHONE} px, vue de téléphone tactile)` : '';
  const version = r.mesure && r.mesure.version ? ' · version de la mesure ' + echapper(r.mesure.version) : '';
  const corps = `<h1>Recette des captures${temps}</h1>
${alerteVersion(cmp)}
<p class="meta">Le ${echapper(dateLisible(r.quand))} · commit ${echapper(r.commit || 'inconnu')} · ${echapper(nomBase(r.base.fichier))}, ${pluriel(r.base.projets, 'projet')} et ${pluriel(r.base.livrables, 'pièce')} · largeurs ${enumerer(r.largeurs.map(String))} px${telephone}${horloge}${version}</p>
<div class="chiffres"><span>${pluriel(s.routes, 'écran')}</span><span>${pluriel(s.captures, 'capture')}</span><span>${pluriel(s.exceptions, 'exception')}</span><span>${pluriel(s.debordements, 'capture qui déborde', 'captures qui débordent')}</span><span>${pluriel(s.horsEcran || 0, 'capture avec un contrôle hors écran', 'captures avec un contrôle hors écran')}</span><span>${pluriel(s.coupes || 0, 'capture avec un texte coupé', 'captures avec un texte coupé')}</span><span>${pluriel(s.valeurs || 0, 'capture avec une valeur technique', 'captures avec une valeur technique')}</span><span>${pluriel(s.termes, 'capture avec un terme interdit visible', 'captures avec un terme interdit visible')}</span><span>${pluriel(s.termesReplies || 0, 'capture avec un terme dans un bloc replié', 'captures avec un terme dans un bloc replié')}</span><span>${pluriel(s.introuvables, 'page introuvable', 'pages introuvables')}</span><span>${pluriel(s.imagesCassees, 'image cassée', 'images cassées')}</span></div>
${r.filtre ? `<p class="meta">Routes limitées à <code>${echapper(r.filtre)}</code>.</p>` : ''}
<p class="meta">${r.pleinePage ? 'Photos de la page entière, de haut en bas : ce qui est fixé à l’écran (barre d’onglets, colonne latérale, panneau ouvert) y est posé sur la page. Les vignettes en montrent le haut ; un clic ouvre la page entière.' : 'Photos du premier écran seulement (--premier-ecran) : ce qui est plus bas n’y est pas.'}</p>
${r.manquantes.length ? `<p class="meta">Absentes de cette base, donc non capturées : ${r.manquantes.map(echapper).join(', ')}.</p>` : ''}
${avant ? `<p class="meta">Comparaison avec <a href="${echapper(lien(dossier, join(avantDossier, 'index.html')))}">la passe « avant »</a> du ${echapper(dateLisible(avant.quand))}, commit ${echapper(avant.commit || 'inconnu')}.</p>` : ''}
${cmp ? blocComparaison(cmp, noms, r.captures, !!r.pleinePage, parCle, [...ordre.keys()].filter(id => horsFiltre(id) && !avant.captures.some(c => c.id === id))) : ''}
${liste ? `<details><summary>Alertes, écran par écran : ${pluriel(regarder.size, 'écran')} (${enumerer(sortesDAlertes(regarder))})</summary><ul>${liste}</ul></details>` : '<p>Aucune exception, aucun débordement, aucun texte coupé, aucune valeur technique, aucun terme interdit.</p>'}
${sections}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="outils/recette-captures.mjs">
<title>Recette des captures${temps}</title>
<style>
:root{--fond:#f6f6f4;--carte:#fff;--texte:#1d1d1b;--terne:#6b6b66;--trait:#deded8;--alerte:#b3261e;--attente:#8a5a00;--change:#1f5fbf}
@media (prefers-color-scheme:dark){:root{--fond:#161615;--carte:#20201e;--texte:#ededea;--terne:#a3a39c;--trait:#3a3a36;--alerte:#ff8a80;--attente:#f0c060;--change:#8ab4ff}}
*{box-sizing:border-box}body{margin:0;padding:16px;font:14px/1.45 system-ui,-apple-system,sans-serif;background:var(--fond);color:var(--texte)}
h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:0}h3{font-size:14px;margin:0}
.meta{color:var(--terne);margin:0 0 12px}.meta code{overflow-wrap:anywhere}.chiffres{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chiffres span{background:var(--carte);border:1px solid var(--trait);border-radius:6px;padding:6px 10px}
.alerte-version{border:2px solid var(--alerte);border-radius:8px;padding:10px 14px;background:var(--carte)}
section{margin:28px 0}.tete{display:flex;align-items:flex-end;gap:16px;border-bottom:1px solid var(--trait);padding-bottom:8px;margin-bottom:12px;flex-wrap:wrap}
.cible{display:flex;align-items:flex-end;gap:8px;color:var(--terne);text-decoration:none;max-width:100%}.cible span{white-space:nowrap}
.cible img{width:auto;height:160px;max-width:100%;max-height:160px;object-fit:contain;border:1px solid var(--trait);border-radius:4px}
.comparaison{background:var(--carte);border:1px solid var(--trait);border-radius:8px;padding:12px 16px}.comparaison ul{margin:8px 0}
.filtre{display:inline-flex;gap:8px;align-items:center;font-weight:600}.rien{display:none;font-weight:600;margin:12px 0 0}
body:has(#seulement:checked) article:not(.a-voir),body:has(#seulement:checked) figure.identique,body:has(#seulement:checked) section:not(.comparaison):not(:has(article.a-voir)){display:none}
body:has(#seulement:checked):not(:has(article.a-voir)) .rien{display:block}
article{background:var(--carte);border:1px solid var(--trait);border-radius:8px;padding:12px;margin:0 0 12px}
article header{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-bottom:8px}article code{color:var(--terne);font-size:11px;overflow-wrap:anywhere}
.largeurs{display:grid;gap:12px;align-items:start}
@media (max-width:720px){.largeurs{grid-template-columns:1fr!important}}
figure{margin:0;min-width:0}figcaption{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px;font-size:12px}
img{display:block;width:100%;height:auto;max-height:640px;object-fit:cover;object-position:top;border:1px solid var(--trait);border-radius:4px;background:#fff}
.paire{display:grid;grid-template-columns:1fr 1fr;gap:6px}.paire small{color:var(--terne)}.absent{color:var(--terne);font-style:italic}
.badge{display:inline-block;max-width:100%;border-radius:10px;padding:1px 8px;font-size:11px;border:1px solid currentColor}.exception,.debordement,.image,.introuvable,.hors-ecran,.valeur{color:var(--alerte)}.terme,.replie,.coupe,.vide{color:var(--attente)}
.etat.modifiee,.etat.nouvelle{color:var(--change);font-weight:600}.etat.identique,.etat.quasi,.etat.inconnue,.etat.hors{color:var(--terne)}
.tech{color:var(--terne);font:11px/1.3 ui-monospace,monospace;overflow-wrap:anywhere}
ul{padding-left:18px}ul ul{padding-left:14px;margin:2px 0 6px}a{color:inherit}q{color:var(--terne);quotes:"«\\00a0" "\\00a0»"}
</style></head><body>
${typographie(corps)}
</body></html>
`;
}

/* Ce qui a changé entre deux recettes : routes, images, texte, exceptions,
 * débordements, textes coupés, contrôles hors écran, valeurs techniques et
 * termes interdits. Les deux passes doivent porter sur les mêmes routes :
 * filtrez-les avant (voir `principal`, option --routes).
 *
 * Elles doivent aussi être prises dans les mêmes conditions : la même version
 * de la mesure (`mesure.version`), le même poste de capture
 * (`mesure.contexte`, cadrage compris) et la même horloge. Sinon, une capture
 * qui diffère n'est pas comptée comme modifiée (l'outil, le poste ou la date
 * ont pu changer, pas l'écran), `mesure.identique` vaut false et
 * `mesure.version`, `mesure.contexte`, `mesure.horloge` disent laquelle des
 * conditions manque ; pour le poste, `mesure.poste` dit si c'est le cadrage
 * (et `mesure.cadrageAvant`, celui de l'avant) ou le navigateur. Un champ que
 * la passe « avant » ne mesurait pas encore vaut null, « non mesuré avant »,
 * jamais zéro. */
export function comparer(avant, apres) {
  const cle = c => c.id + '@' + c.largeur;
  const a = new Map(avant.captures.map(c => [cle(c), c]));
  const b = new Map(apres.captures.map(c => [cle(c), c]));
  const ids = x => [...new Set(x.captures.map(c => c.id))];
  const mesureAvant = champ => avant.captures.some(c => c[champ] !== undefined && c[champ] !== null);
  const nouveaux = (champ, test) => (mesureAvant(champ)
    ? [...b].filter(([k, c]) => test(c) && !(a.has(k) && test(a.get(k)))).map(([k]) => k) : null);
  const total = (x, champ) => (x.captures.some(c => Array.isArray(c[champ])) ? x.captures.reduce((n, c) => n + occurrences(c[champ]), 0) : null);
  const version = x => (x.mesure && x.mesure.version) || null;
  const contexte = x => (x.mesure && x.mesure.contexte ? JSON.stringify(x.mesure.contexte) : null);
  const cadrage = x => !!(x.mesure && x.mesure.contexte && x.mesure.contexte.pleinePage);
  const memeVersion = version(avant) !== null && version(avant) === version(apres);
  const memeContexte = contexte(avant) !== null && contexte(avant) === contexte(apres);
  const memeHorloge = (avant.horloge || null) === (apres.horloge || null);
  const memeMesure = memeVersion && memeContexte && memeHorloge;
  const communes = [...b].filter(([k]) => a.has(k));
  const comparables = communes.filter(([k, c]) => c.empreinte && a.get(k).empreinte);
  const differentes = comparables.filter(([k, c]) => c.empreinte !== a.get(k).empreinte || texteChange(c, a.get(k)));
  /* Une photo qui change sans un pixel visiblement différent hors des
   * images (le lissage d'une image), et dont le texte ne change pas, n'est
   * pas une capture modifiée. */
  const nuance = ([k, c]) => !texteChange(c, a.get(k)) && aLOeil(c.ecart);
  const nuancees = memeMesure ? differentes.filter(nuance) : [];
  const modifiees = memeMesure ? differentes.filter(x => !nuance(x)) : [];
  /* Pour chaque capture dont le texte change : la première ligne apparue et
   * la première disparue. */
  const textes = modifiees.filter(([k, c]) => texteChange(c, a.get(k)) && Array.isArray(c.lignes) && Array.isArray(a.get(k).lignes)).map(([k, c]) => {
    const av = new Set(a.get(k).lignes), ap = new Set(c.lignes);
    return { capture: k, ajoute: c.lignes.find(l => !av.has(l)) || null, retire: a.get(k).lignes.find(l => !ap.has(l)) || null };
  });
  const empreinteBase = x => (x.base && x.base.empreinte) || null;
  const zone = z => (z ? { pixels: z.pixels, max: z.max } : { pixels: 0, max: 0 });
  return {
    mesure: { avant: version(avant), apres: version(apres), identique: memeMesure, version: memeVersion, contexte: memeContexte,
      ...(memeContexte || contexte(avant) === null ? {} : cadrage(avant) !== cadrage(apres)
        ? { poste: 'cadrage', cadrageAvant: cadrage(avant) ? 'page-entiere' : 'premier-ecran' } : { poste: 'navigateur' }), horloge: memeHorloge },
    base: empreinteBase(avant) && empreinteBase(apres) ? empreinteBase(avant) === empreinteBase(apres) : null,
    horloge: { avant: avant.horloge || null, apres: apres.horloge || null },
    routesNouvelles: ids(apres).filter(id => !ids(avant).includes(id)),
    routesDisparues: ids(avant).filter(id => !ids(apres).includes(id)),
    modifiees: modifiees.map(([k]) => k),
    identiques: comparables.length - differentes.length,
    identiquesALOeil: nuancees.length,
    nuancees: nuancees.map(([k, c]) => ({ capture: k, max: c.ecart.max, pixels: c.ecart.pixels,
      hors: zone(c.ecart.hors || { pixels: c.ecart.pixels, max: c.ecart.max }), images: zone(c.ecart.images) })),
    textes,
    nonComparees: communes.length - comparables.length + (memeMesure ? 0 : differentes.length),
    exceptionsNouvelles: nouveaux('exceptions', c => c.exceptions.length > 0),
    debordementsNouveaux: nouveaux('debordement', c => c.debordement > 0),
    coupesNouvelles: nouveaux('coupes', c => nombre(c.coupes) > 0),
    horsEcranNouveaux: nouveaux('horsEcran', c => nombre(c.horsEcran) > 0),
    valeursNouvelles: nouveaux('valeurs', c => (c.valeurs || []).length > 0),
    termes: { avant: total(avant, 'termes'), apres: total(apres, 'termes') ?? 0 },
    termesReplies: { avant: total(avant, 'termesReplies'), apres: total(apres, 'termesReplies') ?? 0 },
  };
}

/* Ne garder d'une recette que les routes d'une expression (option --routes). */
export function restreindre(recette, expression) {
  if (!expression) return recette;
  const re = expression instanceof RegExp ? expression : new RegExp(expression);
  return { ...recette, captures: recette.captures.filter(c => re.test(c.id)) };
}

/* ————— Le serveur éphémère ————— */

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf' };

function serveur(racines) {
  return createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let chemin;
    try { chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    if (chemin === '/') chemin = '/index.html';
    /* Aucune base servie : la recette ne voit que celle qu'on lui passe. */
    if (/^\/depots(\/|$)/.test(chemin)) { res.writeHead(404).end(); return; }
    for (const racine of racines) {
      const base = racine.endsWith(sep) ? racine : racine + sep;
      const absolu = resolve(racine, '.' + chemin);
      if (!absolu.startsWith(base)) continue;
      try {
        const corps = await readFile(absolu);
        res.writeHead(200, { 'Content-Type': TYPES[extname(absolu).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : corps);
        return;
      } catch { /* la racine suivante */ }
    }
    res.writeHead(404).end();
  });
}

/* ————— La capture ————— */

/* Deux passes du même code doivent donner la même photo. Avant de mesurer, on
 * attend donc que la page soit au repos :
 *   - plus aucune mutation depuis 120 ms : les minuteries courtes de
 *     l'application (un champ qui prend le focus à 30 ou 40 ms, une classe
 *     d'arrivée retirée à 400 ms) sont passées, quelle que soit la vitesse du
 *     poste ;
 *   - la mise en page faite, puis les polices qu'elle a demandées chargées
 *     (`document.fonts.ready` ne connaît que les polices déjà demandées) ;
 *   - les images de toute la page chargées ou en erreur (au plus 1,5 s), les
 *     images différées (`loading="lazy"`) comprises : sinon, celles du bas
 *     de la page se chargeraient ou non selon le moment de la photo ; puis
 *     deux images peintes. */
export const REPOS = { calme: 120, plafond: 1500 };
export async function stabiliser(page) {
  await page.evaluate(async ({ calme, plafond }) => {
    document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
    await new Promise(fin => {
      let minuteur = null, limite = null;
      const observateur = new MutationObserver(() => { clearTimeout(minuteur); minuteur = setTimeout(finir, calme); });
      function finir() { observateur.disconnect(); clearTimeout(minuteur); clearTimeout(limite); fin(); }
      observateur.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
      minuteur = setTimeout(finir, calme);
      limite = setTimeout(finir, plafond);
    });
    void document.body.offsetHeight;
    await document.fonts.ready;
    const images = [...document.images].filter(i => i.getClientRects().length && i.getAttribute('src'));
    await Promise.race([
      Promise.all(images.map(i => (i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })))),
      new Promise(r => setTimeout(r, 1500)),
    ]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, REPOS);
}

/* Ce qui, dans la page, dépend du moment et non du code, retiré avant la
 * photo :
 *   - les avis passagers (AVIS.fait, AVIS.refus : ils disparaissent seuls au
 *     bout de 5,2 s) ; un avis grave, qui reste, est gardé ;
 *   - le focus posé par un script sur un bouton, un lien ou une liste : son
 *     anneau dépend de la dernière touche pressée dans la passe (l'heuristique
 *     :focus-visible du navigateur), donc de l'ordre des routes. La photo
 *     montre l'écran tel qu'un doigt ou une souris l'ouvre, sans anneau. Un
 *     champ de saisie garde son focus : il l'affiche toujours de la même façon.
 * Exécuté dans le navigateur. */
export function apaiserLaPage() {
  document.querySelectorAll('.avis:not(.grave)').forEach(n => n.remove());
  const a = document.activeElement;
  const saisie = a && (a.isContentEditable || a.tagName === 'TEXTAREA'
    || (a.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|range|color|file|image)$/i.test(a.type)));
  if (a && a !== document.body && a !== document.documentElement && !saisie && typeof a.blur === 'function') a.blur();
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

async function fermer(page) {
  await page.evaluate(() => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    if (window.PANNEAU) { try { PANNEAU.fermer(); if (PANNEAU.fermerSur) PANNEAU.fermerSur(); } catch (e) { /* déjà fermé */ } }
  });
}

/* Une erreur de rendu devient une exception de la page, relevée sur la
 * capture : elle n'arrête pas la recette. */
async function aller(page, hash) {
  await page.evaluate(h => new Promise(resolve => {
    if (location.hash === h) { setTimeout(() => { try { APP.rendre(); } finally { resolve(); } }, 0); return; }
    window.addEventListener('hashchange', () => setTimeout(resolve, 0), { once: true });
    setTimeout(resolve, 3000);
    location.hash = h;
  }), hash);
}

async function ouvrirRecherche(page, texte) {
  const ouverte = () => page.evaluate(() => !!document.querySelector('dialog[open] input[type=search]'));
  await page.evaluate(() => { const b = document.querySelector('.lb-chercher'); if (b) b.click(); });
  for (const touche of ['Control+k', 'Control+f']) {
    if (await ouverte()) break;
    await fermer(page);
    await page.keyboard.press(touche);
  }
  if (!(await ouverte())) throw new Error('La recherche ne s’ouvre ni par son bouton ni au clavier.');
  await page.locator('dialog[open] input[type=search]').fill(texte);
}

/* La page entière, pour la photo. Ce qui est fixé à l'écran ne se peindrait
 * qu'au premier écran : la barre d'onglets du téléphone au milieu de la page,
 * sur une ligne de texte ; la colonne latérale, le voile et un panneau ouvert
 * arrêtés à la hauteur de l'écran. Le temps de la photo, chacun est posé sur
 * la page :
 *   - ce qui tient toute la hauteur de l'écran (colonne latérale, voile,
 *     panneau) descend jusqu'au bas de la page, et un panneau déroule ce qu'il
 *     faisait défiler ;
 *   - ce qui est collé au bas de l'écran (la barre d'onglets) passe au bas de
 *     la page ;
 *   - le fond d'une fenêtre modale (::backdrop) et le grain du fond couvrent
 *     toute la page.
 * Une fenêtre modale (<dialog>) reste où elle est, au premier écran.
 * Exécuté dans le navigateur, page à son début ; `replierLaPage` remet chaque
 * style comme il était. Renvoie la hauteur de la page à photographier. */
export function deplierLaPage() {
  const H = innerHeight;
  const touches = [];
  const poser = (e, regles) => {
    touches.push([e, e.getAttribute('style')]);
    for (const [k, v] of Object.entries(regles)) e.style.setProperty(k, v, 'important');
  };
  /* Posé en absolu, un élément se place par rapport à son bloc conteneur :
   * on corrige l'écart pour qu'il reste à la même hauteur dans la page. */
  const recaler = (e, haut) => { const d = haut - e.getBoundingClientRect().top; if (Math.abs(d) > 0.5) e.style.setProperty('top', (parseFloat(e.style.top) + d) + 'px', 'important'); };
  const enHaut = e => e.matches('dialog[open]') || e.matches(':modal') || e.matches(':popover-open');
  const tous = [...document.body.querySelectorAll('*')].filter(e => {
    if (!e.getClientRects().length || enHaut(e) || e.closest('dialog[open]')) return false;
    const p = getComputedStyle(e).position;
    return p === 'fixed' || (p === 'sticky' && e.getBoundingClientRect().height >= H - 1);
  });
  const fixes = tous.filter(e => !tous.some(x => x !== e && x.contains(e)))
    .map(e => ({ e, r: e.getBoundingClientRect(), colle: getComputedStyle(e).position === 'sticky' }));
  const hauts = fixes.filter(x => x.r.top <= 1 && x.r.bottom >= H - 1);
  const bas = fixes.filter(x => !hauts.includes(x) && x.r.bottom >= H - 1 && x.r.top > H / 2);
  /* Ce qu'un élément, ou une liste en lui, fait encore défiler. */
  const reste = e => {
    let n = 0;
    for (const d of [e, ...e.querySelectorAll('*')]) {
      const oy = getComputedStyle(d).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && d.scrollHeight > d.clientHeight + 1) n = Math.max(n, d.scrollHeight - d.clientHeight);
    }
    return n;
  };
  /* 1. Ce qui tient la hauteur de l'écran, déroulé de ce qu'il fait défiler. */
  for (const { e, r, colle } of hauts) {
    const n = reste(e);
    if (colle) poser(e, { height: (r.height + n) + 'px', 'max-height': 'none' });
    else {
      poser(e, { position: 'absolute', top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', right: 'auto', bottom: 'auto',
        height: (r.height + n) + 'px', 'max-height': 'none' });
      recaler(e, r.top);
    }
    /* Un panneau en colonne flexible partage la hauteur gagnée avec son
     * en-tête, qui rétrécit moins : on rallonge tant qu'il reste à dérouler. */
    for (let i = 0, m; i < 4 && (m = reste(e)) > 1; i++) e.style.setProperty('height', (e.getBoundingClientRect().height + m) + 'px', 'important');
  }
  /* 2. Puis jusqu'au bas de la page, qu'un panneau déroulé a pu allonger. */
  const hauteur = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const total = hauteur();
  for (const { e, r } of hauts) if (e.getBoundingClientRect().height < total - r.top) e.style.setProperty('height', (total - r.top) + 'px', 'important');
  /* 3. Ce qui est collé au bas de l'écran, au bas de la page. */
  for (const { e, r } of bas) {
    const haut = total - r.height;
    poser(e, { position: 'absolute', top: haut + 'px', left: r.left + 'px', width: r.width + 'px', right: 'auto', bottom: 'auto' });
    recaler(e, haut);
  }
  /* 4. Les fonds qui n'ont pas d'élément à poser : ::backdrop, et le grain du corps. */
  const regles = ['dialog::backdrop{position:absolute!important;inset:0 0 auto 0!important;height:' + total + 'px!important}'];
  for (const p of ['::before', '::after']) if (getComputedStyle(document.body, p).position === 'fixed')
    regles.push('body' + p + '{position:absolute!important;inset:0 0 auto 0!important;height:' + total + 'px!important}');
  const feuille = document.createElement('style');
  feuille.setAttribute('data-recette', 'page-entiere');
  feuille.textContent = regles.join('\n');
  document.head.append(feuille);
  window.__recettePageEntiere = { touches, feuille };
  return { hauteur: hauteur(), poses: touches.length };
}

/* Remet la page comme `deplierLaPage` l'a trouvée. Exécuté dans le navigateur. */
export function replierLaPage() {
  const x = window.__recettePageEntiere;
  if (!x) return 0;
  for (const [e, style] of x.touches.reverse()) { if (style === null) e.removeAttribute('style'); else e.setAttribute('style', style); }
  x.feuille.remove();
  delete window.__recettePageEntiere;
  return x.touches.length;
}

/* Ce que l'écran montre, mesuré dans la page. Exécutée dans le navigateur :
 * cette fonction n'emploie rien du module.
 *
 *   texte        le texte visible (innerText), et le texte d'exemple des champs
 *                vides, qui est à l'écran ;
 *   texteReplie  ce qui est à un geste : le contenu des blocs repliés
 *                (<details> fermés, ouverts le temps de la lecture puis
 *                refermés avant la photo) et les bulles d'aide (title) ;
 *   coupes       les boîtes qui cachent une partie de leur texte (overflow
 *                hidden ou clip, points de suspension compris), les textes à
 *                cheval sur le bord de l'écran et les textes d'exemple plus
 *                larges que leur champ ;
 *   horsEcran    les contrôles (lien, bouton, champ) rejetés hors de l'écran ou
 *                rognés par un conteneur, qu'aucun défilement ne ramène ;
 *   zonesImages  les rectangles des images (img, vidéo, toile, fond en url()),
 *                en px CSS, page à son début : le lissage d'une image
 *                redimensionnée y nuance quelques pixels d'une passe à
 *                l'autre, et la comparaison ne le pardonne que là.
 * Le débordement de la page reste mesuré à part : son historique ne change pas. */
export function mesurerDansLaPage() {
  const zone = document.querySelector('#contenu') || document.querySelector('#corps') || document.body;
  const dialogue = document.querySelector('dialog[open], .panneau[role=dialog]');
  const titre = (dialogue && dialogue.querySelector('h1, h2')) || zone.querySelector('h1') || document.querySelector('h1');
  const images = [...document.images].filter(i => i.getClientRects().length);
  const dansEcran = i => { const b = i.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width >= 24 && b.height >= 24; };
  const rendu = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  /* Un texte court, coupé entre deux mots. */
  const court = t => { const x = String(t || '').replace(/\s+/g, ' ').trim(); if (x.length <= 90) return x;
    const c = x.slice(0, 90), i = c.lastIndexOf(' '); return (i > 40 ? c.slice(0, i) : c) + '…'; };
  const un = x => x.tagName.toLowerCase() + (x.id ? '#' + x.id : [...x.classList].slice(0, 2).map(c => '.' + c).join(''));
  const selecteur = e => { const t = []; for (let x = e; x && x !== document.body && t.length < 3; x = x.parentElement) t.unshift(un(x)); return t.join(' > '); };

  const champs = [...document.querySelectorAll('input[placeholder], textarea[placeholder]')].filter(e => rendu(e) && !e.value && e.placeholder.trim());
  const texte = document.body.innerText + '\n' + champs.map(e => e.placeholder).join('\n');

  /* Textes coupés : le plus profond seulement, son parent ne dit rien de plus. */
  const coupes = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (!e.clientWidth || e.scrollWidth <= e.clientWidth + 1 || !rendu(e)) continue;
    if (!['hidden', 'clip'].includes(getComputedStyle(e).overflowX)) continue;
    const t = court(e.innerText);
    if (t) coupes.push({ e, selecteur: selecteur(e), texte: t, px: e.scrollWidth - e.clientWidth });
  }
  const defilant = e => { for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll') return true; } return false; };
  /* Un texte à cheval sur le bord de l'écran (un panneau plus large que le
   * téléphone, par exemple) : coupé lui aussi. Un texte entièrement rejeté
   * hors de l'écran est un masquage voulu, il ne compte pas. */
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const plage = document.createRange();
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
    if (!n.data.trim() || !n.parentElement || coupes.some(x => x.e === n.parentElement)) continue;
    plage.selectNodeContents(n);
    const b = plage.getBoundingClientRect();
    if (!b.width || !((b.left < innerWidth && b.right > innerWidth + 1) || (b.right > 0 && b.left < -1))) continue;
    if (!rendu(n.parentElement) || defilant(n.parentElement)) continue;
    coupes.push({ e: n.parentElement, selecteur: selecteur(n.parentElement), texte: court(n.data), px: Math.ceil(Math.max(b.right - innerWidth, -b.left)) });
  }
  const toile = document.createElement('canvas').getContext('2d');
  for (const e of champs) {
    if (e.tagName !== 'INPUT') continue;
    const cs = getComputedStyle(e);
    toile.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(' ');
    const libre = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const besoin = toile.measureText(e.placeholder).width;
    if (besoin > libre + 1) coupes.push({ e, selecteur: selecteur(e), texte: court(e.placeholder), px: Math.ceil(besoin - libre) });
  }
  const coupesFinales = coupes.filter(x => !coupes.some(y => y !== x && x.e.contains(y.e)));

  const horsEcran = [];
  for (const e of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')) {
    if (!rendu(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    let cache = r.left < -1 || r.right > innerWidth + 1;
    for (let a = e.parentElement; !cache && a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox !== 'hidden' && ox !== 'clip') continue;
      const ar = a.getBoundingClientRect();
      if (r.left < ar.left - 1 || r.right > ar.right + 1) cache = true;
    }
    if (cache && !defilant(e)) horsEcran.push({ selecteur: selecteur(e), texte: court(e.innerText || e.getAttribute('aria-label') || e.title || e.value) });
  }

  /* Les blocs repliés : ouverts le temps de lire, puis refermés. */
  const fermes = [...document.querySelectorAll('details:not([open])')];
  fermes.forEach(d => { d.open = true; });
  const dehors = fermes.filter(d => !fermes.some(x => x !== d && x.contains(d)) && d.getClientRects().length);
  const replies = dehors.map(d => {
    const resume = d.querySelector(':scope > summary');
    let t = d.innerText;
    if (resume) { const r = resume.innerText, i = t.indexOf(r); if (i >= 0) t = t.slice(0, i) + t.slice(i + r.length); }
    return t;
  });
  const bulles = [...document.querySelectorAll('[title]')]
    .filter(e => e.title.trim() && rendu(e) && !(e.innerText || '').includes(e.title.trim())).map(e => e.title);
  fermes.forEach(d => { d.open = false; });

  const zonesImages = [];
  const cadrer = e => { for (const b of e.getClientRects()) if (b.width >= 1 && b.height >= 1 && b.bottom > 0 && b.right > 0)
    zonesImages.push([Math.floor(b.left) - 1, Math.floor(b.top) - 1, Math.ceil(b.width) + 2, Math.ceil(b.height) + 2]); };
  for (const e of document.querySelectorAll('img, video, canvas')) if (rendu(e)) cadrer(e);
  for (const e of document.body.querySelectorAll('*')) if (/url\(/.test(getComputedStyle(e).backgroundImage) && rendu(e)) cadrer(e);

  return {
    titre: titre ? titre.textContent.trim().replace(/\s+/g, ' ').slice(0, 140) : '',
    texte, texteReplie: replies.concat(bulles).join('\n'),
    blocsReplies: dehors.length,
    contenu: zone.innerText.trim().length,
    debordement: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    hauteurPage: document.documentElement.scrollHeight,
    coupes: { nombre: coupesFinales.length, exemples: coupesFinales.slice(0, 5).map(({ e, ...x }) => x) },
    horsEcran: { nombre: horsEcran.length, exemples: horsEcran.slice(0, 5) },
    images: {
      premierEcran: images.filter(i => i.complete && i.naturalWidth > 0 && dansEcran(i)).length,
      cassees: images.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length,
    },
    zonesImages: zonesImages.slice(0, 400), densite: devicePixelRatio,
  };
}

/* L'écart entre deux PNG, pixel par pixel. Exécutée dans le navigateur.
 * Chaque pixel qui change, même d'un point sur 255, est compté, à part selon
 * qu'il tombe dans une zone d'image (`zones`, en px CSS, multipliées par la
 * `densite` de l'écran) ou hors d'elles :
 *   { pixels, total, part, max, cadre, hors: { pixels, max, cadre }, images: { pixels, max, cadre } }
 * `cadre` est le rectangle qui contient les pixels changés, [gauche, haut,
 * droite, bas] en px CSS (null si rien ne change) : il dit où regarder, et si
 * le changement est dans le premier écran ou plus bas.
 * Deux tailles différentes : { pixels: null, taille: [l, h, l', h'] } (en
 * pixels de l'image). À la même largeur, la page s'allonge ou raccourcit :
 * `debut` est alors la première rangée qui change, en px CSS, sur la hauteur
 * commune ; si toute la hauteur commune est la même, le changement part du
 * bas de la plus courte. */
export async function ecartDePixels({ a, b, zones = [], densite = 1 }) {
  const charger = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i; };
  const [x, y] = await Promise.all([charger(a), charger(b)]);
  const lire = i => { const t = document.createElement('canvas'); t.width = i.width; t.height = i.height;
    const g = t.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
  if (x.width !== y.width || x.height !== y.height) {
    const taille = [x.width, x.height, y.width, y.height];
    if (x.width !== y.width) return { pixels: null, taille };
    const p = lire(x), q = lire(y), commune = Math.min(x.height, y.height) * x.width * 4;
    let k = 0;
    while (k < commune && p[k] === q[k]) k++;
    return { pixels: null, taille, debut: Math.floor(Math.floor(k / (x.width * 4)) / densite) };
  }
  const p = lire(x), q = lire(y), w = x.width, h = x.height;
  const masque = new Uint8Array(w * h);
  for (const [zx, zy, zw, zh] of zones) {
    const x0 = Math.max(0, Math.floor(zx * densite)), x1 = Math.min(w, Math.ceil((zx + zw) * densite));
    const y0 = Math.max(0, Math.floor(zy * densite)), y1 = Math.min(h, Math.ceil((zy + zh) * densite));
    if (x1 > x0) for (let j = y0; j < y1; j++) masque.fill(1, j * w + x0, j * w + x1);
  }
  const zone = () => ({ pixels: 0, max: 0, x0: w, y0: h, x1: -1, y1: -1 });
  const hors = zone(), images = zone();
  for (let k = 0, i = 0; k < p.length; k += 4, i++) {
    const d = Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2]), Math.abs(p[k + 3] - q[k + 3]));
    if (!d) continue;
    const z = masque[i] ? images : hors;
    z.pixels++;
    if (d > z.max) z.max = d;
    const x = i % w, y = (i - x) / w;
    if (x < z.x0) z.x0 = x; if (x > z.x1) z.x1 = x; if (y < z.y0) z.y0 = y; if (y > z.y1) z.y1 = y;
  }
  /* En px CSS, arrondi vers l'extérieur. */
  const cadre = z => (z.x1 < 0 ? null : [Math.floor(z.x0 / densite), Math.floor(z.y0 / densite), Math.ceil((z.x1 + 1) / densite), Math.ceil((z.y1 + 1) / densite)]);
  const net = z => ({ pixels: z.pixels, max: z.max, cadre: cadre(z) });
  const tout = { x0: Math.min(hors.x0, images.x0), y0: Math.min(hors.y0, images.y0), x1: Math.max(hors.x1, images.x1), y1: Math.max(hors.y1, images.y1) };
  const pixels = hors.pixels + images.pixels;
  return { pixels, total: w * h, part: pixels / (w * h), max: Math.max(hors.max, images.max), cadre: cadre(tout), hors: net(hors), images: net(images) };
}

/* Quand un écart reste « identique à l'œil ». Peintes sans carte graphique
 * (`RENDU`), deux passes du même code sont identiques au pixel. Peintes par
 * la carte, elles différaient de deux façons, toujours les mêmes : le
 * lissage des images redimensionnées (jusqu'à 16 à 21/255, dans les images
 * seulement) et le crénelage de quelques bords, coins arrondis ou bout de
 * soulignement (jusqu'à 5/255, quelques dizaines de pixels ; 18/255, rarement,
 * sur un cercle). Ces seuils restent pour un poste qui peindrait autrement.
 * Tout le reste est un vrai changement : hors des images, un pixel qui bouge
 * de plus de `bruit`/255 (une bordure #deded8 → #e8e8e2 bouge de 10, une
 * page assombrie de 8 % de 20), ou plus d'une part `partBruit` de la photo
 * qui bouge, même d'un point ;
 * dans une image, plus de `image`/255 (une autre image). */
export const ECART = { bruit: 8, partBruit: 0.001, image: 32 };
export function aLOeil(e) {
  if (!e || typeof e.pixels !== 'number') return false;
  if (e.pixels === 0) return true;
  const hors = e.hors || { pixels: e.pixels, max: e.max };
  const images = e.images || { pixels: 0, max: 0 };
  return hors.max <= ECART.bruit && hors.pixels <= ECART.partBruit * (e.total || 0) && images.max <= ECART.image;
}

/* Une ligne de plus de `n` caractères, coupée entre deux mots, avec « … ». */
export function couper(l, n) {
  if (l.length <= n) return l;
  const c = l.slice(0, n), i = c.lastIndexOf(' ');
  return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.]+$/, '') + '…';
}

/* Le texte de toute la page : ce qui est visible, de haut en bas (pas le
 * seul premier écran), le texte d'exemple des champs vides, les blocs repliés
 * et les bulles d'aide. Deux passes du même code le donnent à l'identique ; il
 * change dès qu'un mot change, même hors de la photo : dans un bloc replié,
 * dans une liste qui défile à l'intérieur d'une fenêtre. `lignes` le garde
 * ligne à ligne, sans doublon, pour montrer ce qui a changé ; une ligne longue
 * y est coupée entre deux mots, vers 200 caractères. */
export function texteDeLaPage(m) {
  const tout = String(m.texte || '') + '\n' + String(m.texteReplie || '');
  const lignes = [], vues = new Set();
  for (const brute of tout.split('\n')) {
    const l = couper(brute.replace(/\s+/g, ' ').trim(), 200);
    if (l && !vues.has(l) && lignes.length < 800) { vues.add(l); lignes.push(l); }
  }
  const normal = tout.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  return { empreinteTexte: createHash('sha256').update(normal).digest('hex').slice(0, 16), lignes };
}

/* La mesure brute, rangée comme `captures.json` la garde. */
export function depouiller(m) {
  return {
    ...texteDeLaPage(m),
    titre: m.titre, contenu: m.contenu, debordement: m.debordement, hauteurPage: m.hauteurPage, images: m.images,
    coupes: m.coupes, horsEcran: m.horsEcran, blocsReplies: m.blocsReplies, zonesImages: m.zonesImages || [], densite: m.densite || 1,
    introuvable: /introuvable|ne mène à rien/i.test(m.titre), vide: m.contenu < 10,
    termes: relever(m.texte), termesReplies: relever(m.texteReplie),
    valeurs: relever(m.texte + '\n' + m.texteReplie, VALEURS_TECHNIQUES),
  };
}

function nomFichier(id, largeur) { return id.replace(/[^a-z0-9-]+/gi, '_') + '--' + largeur + '.png'; }
function empreinte(tampon) { return createHash('sha256').update(tampon).digest('hex').slice(0, 16); }

/* Le dossier de sortie : `captures/` et `cibles/` y sont vidés, `index.html`
 * et `captures.json` remplacés à chaque passe, mais seulement s'ils viennent
 * d'une passe précédente : la marque déposée dans captures/, ou un
 * captures.json écrit par cet outil. Un dossier quelconque n'est jamais
 * effacé ni écrasé. */
export const MARQUE = '.recette-captures';
export const OUTIL = 'outils/recette-captures.mjs';
export function vientDUneRecette(dossier) {
  if (existsSync(join(dossier, 'captures', MARQUE))) return true;
  try { return JSON.parse(readFileSync(join(dossier, 'captures.json'), 'utf8')).outil === OUTIL; }
  catch { return false; }
}
export async function preparerSortie(dossier) {
  const captures = join(dossier, 'captures');
  const deja = ['captures', 'cibles', 'index.html', 'captures.json'].filter(x => existsSync(join(dossier, x)));
  if (deja.length && !vientDUneRecette(dossier))
    throw new Error(dossier + ' contient déjà ' + enumerer(deja) + ', qui ne vient pas d’une recette : choisissez un autre --sortie, ou videz ce dossier vous-même.');
  for (const d of [captures, join(dossier, 'cibles')]) {
    if (existsSync(d)) await rm(d, { recursive: true, force: true });
  }
  await mkdir(captures, { recursive: true });
  await writeFile(join(captures, MARQUE), 'Écrit par outils/recette-captures.mjs : ce dossier est vidé à chaque passe.\n');
  return captures;
}

/* Un projet témoin vide pour chaque nature absente de la base, et un lien de
 * partage s'il n'y en a aucun. En mémoire seulement, avec des identifiants
 * fixes : chaque page (bureau, téléphone) reçoit les mêmes. Exécuté dans le
 * navigateur. */
function ajouterTemoins({ absentes, jeton, principal }) {
  const temoins = {};
  for (const n of NATURE.liste()) if (absentes.includes(n.cle)) {
    temoins[n.cle] = DEPOT.ajoute('projets', { id: 'PRO-temoin-' + n.cle, ref: 'TEMOIN-' + n.cle.toUpperCase(), nom: 'Projet témoin · ' + n.nom, nature: n.cle,
      statut: 'ouvert', equipe: [], volets: [], livrables: [], sections: { identite: { client: 'Témoin de recette' } } }).id;
  }
  let j = jeton;
  const p = DEPOT.trouve('projets', principal) || DEPOT.liste('projets')[0];
  if (!j && p) { j = 'c0ffeec0ffeec0ffeec0ffee'; p.partages = Object.assign({}, p.partages, { cadrage: { jeton: j, cree_le: new Date().toISOString() } }); }
  return { temoins, jeton: j };
}

async function principal() {
  let o;
  try { o = lireArguments(process.argv.slice(2)); }
  catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 2; return; }
  if (o.aide) { process.stdout.write(AIDE + '\n'); return; }
  if (o.ou) { process.stdout.write(o.sortie + '\n'); return; }

  const texte = await readFile(o.base, 'utf8');
  try { await preparerSortie(o.dossier); }
  catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 2; return; }
  const mesure = { version: versionMesure(), contexte: { postes: POSTES, sous: TELEPHONE, pleinePage: o.pleinePage, rendu: RENDU.args } };
  let avant = null;
  const avantDossier = o.temps === 'apres' ? join(o.sortie, 'avant') : null;
  if (avantDossier && existsSync(join(avantDossier, 'captures.json'))) {
    avant = JSON.parse(await readFile(join(avantDossier, 'captures.json'), 'utf8'));
    /* Une passe « avant » plus ancienne n'a pas d'empreinte : on la calcule. */
    for (const c of avant.captures) if (!c.empreinte) {
      try { c.empreinte = empreinte(await readFile(join(avantDossier, c.fichier))); } catch { /* capture absente */ }
    }
  } else if (avantDossier) {
    process.stderr.write('Attention : aucune passe « avant » dans ' + avantDossier + ' : la planche est faite sans comparaison. '
      + 'Lancez --avant sur la branche de base du lot, avec le même --sortie (documents/FINI.md, section 2).\n');
  }
  /* L'horloge de la page : celle qu'on donne ; à défaut, avec --apres, celle
   * de la passe « avant », pour que les dates affichées soient les mêmes ; à
   * défaut encore, l'heure du début de la passe, figée pour toute la passe. */
  let horlogeReprise = false;
  if (!o.horloge && avant && avant.horloge) { o.horloge = avant.horloge; horlogeReprise = true; }
  if (!o.horloge) o.horloge = heureDuPoste();
  if (horlogeReprise) process.stderr.write('Horloge reprise de la passe « avant » : ' + o.horloge + '.\n');
  let memeMesure = false;
  if (avant) {
    const conditions = comparer({ ...avant, captures: [] }, { mesure, horloge: o.horloge, captures: [] });
    memeMesure = conditions.mesure.identique;
    if (!memeMesure)
      process.stderr.write('Attention : la passe « avant » (' + avantDossier + ') n’a pas été prise dans les mêmes conditions : '
        + enumerer(causes(conditions)) + '. ' + remede(conditions).replace(/^./, x => x.toUpperCase())
        + '. Les captures qui diffèrent ne sont pas comparées.\n');
    if ((avant.filtre || null) !== (o.filtre || null))
      process.stderr.write('Attention : la passe « avant » a été prise avec ' + (avant.filtre ? '--routes ' + avant.filtre : 'toutes les routes')
        + ', celle-ci avec ' + (o.filtre ? '--routes ' + o.filtre : 'toutes les routes') + '. L’état en mémoire de l’application dépend des routes '
        + 'visitées avant : une capture peut changer sans que le code ait changé. Relancez les deux passes avec le même --routes (documents/FINI.md, section 2).\n');
  }

  const { chromium } = await import('playwright');
  const srv = serveur([RACINE, o.medias]);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port;
  let navigateur;
  const r = { outil: OUTIL, temps: o.temps, quand: new Date().toISOString(), commit: o.commit || commit(), mesure,
    horloge: o.horloge, ...(horlogeReprise ? { horlogeReprise } : {}), largeurs: o.largeurs, pleinePage: o.pleinePage, filtre: o.filtre,
    base: { fichier: basename(o.base), empreinte: createHash('sha256').update(texte).digest('hex').slice(0, 12) },
    manquantes: [], horsCapture: [], captures: [] };
  try {
    navigateur = await chromium.launch(lancement());
    let courant = null;

    /* Un poste de bureau, et un téléphone (tactile, densité 2) pour les
     * largeurs étroites : (hover: none) et (pointer: coarse) y sont vrais. */
    async function ouvrirPoste(telephone) {
      const contexte = await navigateur.newContext(telephone ? POSTES.telephone : POSTES.bureau);
      const page = await contexte.newPage();
      page.setDefaultTimeout(15000);
      await page.clock.setFixedTime(new Date(o.horloge));
      page.on('pageerror', e => (courant ? courant.exceptions : r.horsCapture).push(String((e && e.message) || e)));
      await page.goto(url + '/#/bureau', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.APP && window.DEPOT && window.DECISION);
      const recu = await page.evaluate(t => {
        try { DEPOT.importer(t); APP.rendre(); return null; } catch (e) { return e.message; }
      }, texte);
      if (recu) throw new Error('La base n’a pas pu être importée : ' + recu);
      /* Toutes les polices tout de suite, sous-ensembles compris : aucune ne
       * se charge en retard, pendant une photo, parce qu'un écran en demande
       * une variante pour la première fois. */
      await page.evaluate(() => Promise.all([...document.fonts].map(f => f.load().catch(() => null))));
      return page;
    }
    const pages = new Map();
    for (const telephone of [...new Set(o.largeurs.map(l => l < TELEPHONE))]) pages.set(telephone, await ouvrirPoste(telephone));
    const pageDe = largeur => pages.get(largeur < TELEPHONE);

    let inv = await pageDe(o.largeurs[0]).evaluate(inventaire);
    Object.assign(r.base, inv.volume);
    const faites = new Set();

    async function capturer(routes) {
      for (const route of routes) {
        if (o.routes && !o.routes.test(route.id)) continue;
        faites.add(route.id);
        for (const largeur of o.largeurs) {
          const page = pageDe(largeur);
          const c = { id: route.id, espace: route.espace, nom: route.nom, hash: route.hash, largeur, telephone: largeur < TELEPHONE,
            hauteurEcran: HAUTEURS[largeur] || 900, fichier: join('captures', nomFichier(route.id, largeur)), exceptions: [] };
          courant = c;
          try {
            await fermer(page);
            await page.setViewportSize({ width: largeur, height: c.hauteurEcran });
            await aller(page, route.hash);
            await stabiliser(page);
            if (route.action === 'recherche') await ouvrirRecherche(page, inv.recherche);
            if (route.action === 'nouveau-projet') await page.evaluate(() => VUE_PROJETS.nouveau());
            if (route.action === 'demande') await page.evaluate(id => DEMANDE.editer(DEPOT.trouve('projets', id), null, () => {}), route.cible);
            await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
            await stabiliser(page);
            await page.evaluate(apaiserLaPage);
            const m = await page.evaluate(mesurerDansLaPage);
            let tampon;
            if (o.pleinePage) {
              /* La page entière : ce qui est fixé à l'écran est posé sur la page le temps de la photo.
               * Elle garde la largeur de l'écran : un panneau plus large que le téléphone,
               * posé sur la page, ne l'élargit pas ; ce qui en dépasse ne se voyait pas. */
              c.hauteurPhoto = (await page.evaluate(deplierLaPage)).hauteur;
              try { tampon = await page.screenshot({ path: join(o.dossier, c.fichier), fullPage: true, clip: { x: 0, y: 0, width: largeur, height: c.hauteurPhoto },
                animations: 'disabled', caret: 'hide' }); }
              finally { await page.evaluate(replierLaPage); }
            } else tampon = await page.screenshot({ path: join(o.dossier, c.fichier), animations: 'disabled', caret: 'hide' });
            Object.assign(c, depouiller(m), { empreinte: empreinte(tampon) });
          } catch (e) {
            c.exceptions.push('Recette : ' + ((e && e.message) || e));
            Object.assign(c, { titre: '', contenu: 0, debordement: 0, hauteurPage: 0, images: { premierEcran: 0, cassees: 0 },
              coupes: { nombre: 0, exemples: [] }, horsEcran: { nombre: 0, exemples: [] },
              introuvable: false, vide: true, termes: [], termesReplies: [], valeurs: [], zonesImages: [], densite: 1 });
          }
          r.captures.push(c);
          courant = null;
        }
      }
      for (const page of pages.values()) await fermer(page);
    }

    /* D'abord les espaces tels que la base les montre. */
    const premiers = routesDe(inv);
    await capturer(premiers.routes);

    /* Puis les témoins, en mémoire : ils viennent après, pour ne changer
     * aucune des captures précédentes. */
    const params = { absentes: inv.natures.filter(n => !inv.dossiers[n.cle]).map(n => n.cle), jeton: inv.jeton,
      principal: inv.dossiers.campagne || Object.values(inv.dossiers)[0] || null };
    let ajouts = null;
    for (const page of pages.values()) ajouts = await page.evaluate(ajouterTemoins, params);
    inv = { ...inv, temoins: ajouts.temoins, jeton: ajouts.jeton };
    const tout = routesDe(inv);
    await capturer(tout.routes.filter(x => !faites.has(x.id)));
    r.manquantes = tout.manquantes;
    if (o.routes) r.manquantes = r.manquantes.filter(id => o.routes.test(id));

    /* Avec --apres : l'écart de pixels de chaque capture dont l'empreinte a
     * changé, pour ne pas montrer comme modifié un simple lissage. Les zones
     * d'image des deux passes y sont pardonnées, rien d'autre. Seulement si
     * l'avant a été mesuré de la même façon : sinon, rien ne se compare. */
    if (avant && memeMesure) {
      const parCle = new Map(avant.captures.map(c => [c.id + '@' + c.largeur, c]));
      const outil = await (await navigateur.newContext()).newPage();
      for (const c of r.captures) {
        const a = parCle.get(c.id + '@' + c.largeur);
        if (!a || !a.empreinte || !c.empreinte || a.empreinte === c.empreinte) continue;
        try {
          const [x, y] = await Promise.all([readFile(join(avantDossier, a.fichier)), readFile(join(o.dossier, c.fichier))]);
          c.ecart = await outil.evaluate(ecartDePixels, { a: x.toString('base64'), b: y.toString('base64'),
            zones: (a.zonesImages || []).concat(c.zonesImages || []), densite: c.densite || 1 });
        } catch { /* illisible : la capture reste « modifiée » */ }
      }
    }
  } finally {
    if (navigateur) await navigateur.close();
    await new Promise(x => srv.close(x));
  }

  const parMot = champ => Object.fromEntries(Object.entries(r.captures.flatMap(c => c[champ]).reduce((t, x) => (t[x.terme] = (t[x.terme] || 0) + x.nombre, t), {})).sort((a, b) => b[1] - a[1]));
  r.resume = {
    routes: new Set(r.captures.map(c => c.id)).size, captures: r.captures.length,
    exceptions: r.captures.reduce((n, c) => n + c.exceptions.length, 0) + r.horsCapture.length,
    debordements: r.captures.filter(c => c.debordement > 0).length,
    coupes: r.captures.filter(c => c.coupes.nombre > 0).length,
    horsEcran: r.captures.filter(c => c.horsEcran.nombre > 0).length,
    valeurs: r.captures.filter(c => c.valeurs.length).length,
    termes: r.captures.filter(c => c.termes.length).length,
    termesReplies: r.captures.filter(c => c.termesReplies.length).length,
    introuvables: r.captures.filter(c => c.introuvable).length,
    imagesCassees: r.captures.reduce((n, c) => n + ((c.images || {}).cassees || 0), 0),
    termesParMot: parMot('termes'),
    termesRepliesParMot: parMot('termesReplies'),
    valeursParMot: parMot('valeurs'),
  };

  if (avant) {
    /* Les deux passes portent sur les mêmes routes : chacune est restreinte
     * au filtre de l'autre. */
    r.comparaison = { avant: relative(o.dossier, avantDossier), filtres: { avant: avant.filtre || null, apres: o.filtre }, seuils: ECART,
      ...comparer(restreindre(avant, o.routes), restreindre(r, avant.filtre)) };
  }
  const cibles = {};
  if (o.cibles) {
    await mkdir(join(o.dossier, 'cibles'), { recursive: true });
    for (const [espace, fichier] of Object.entries(PLANCHES)) {
      const source = join(o.cibles, fichier);
      if (!existsSync(source)) continue;
      const dest = join(o.dossier, 'cibles', fichier);
      if (!existsSync(dest)) await copyFile(source, dest);
      cibles[espace] = dest;
    }
  }
  await writeFile(join(o.dossier, 'captures.json'), JSON.stringify(r, null, 1));
  await writeFile(join(o.dossier, 'index.html'), planche(r, { dossier: o.dossier, avant, avantDossier, cibles }));
  const { termesParMot, termesRepliesParMot, valeursParMot, ...court } = r.resume;
  const { modifiees, nuancees, textes, seuils, ...cmp } = r.comparaison || {};
  process.stdout.write(JSON.stringify({ sortie: o.dossier, planche: join(o.dossier, 'index.html'), ...court,
    manquantes: r.manquantes, ...(r.comparaison ? { comparaison: { ...cmp, modifiees: modifiees.length, nuancees: nuancees.length, textes: textes.length } } : {}) }, null, 2) + '\n');
  if (o.strict && (r.resume.exceptions || r.resume.debordements || r.resume.valeurs || r.resume.termes || r.resume.termesReplies)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  principal().catch(e => { process.stderr.write((e && e.stack) || String(e)); process.stderr.write('\n'); process.exitCode = 1; });
}
