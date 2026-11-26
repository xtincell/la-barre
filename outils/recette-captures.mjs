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
 *   - Plus, la recherche ouverte, Nouveau projet ouvert, la page partagée.
 *
 * Il écrit, hors du dépôt : les PNG, une planche-contact `index.html` et
 * `captures.json` (exceptions, débordement horizontal, termes interdits,
 * images cassées, pages introuvables). Il n'écrit jamais dans le dépôt ni
 * dans une base : le serveur éphémère ne répond qu'aux lectures et ne sert
 * aucun `depots/`.
 *
 *   BROWSER_CHANNEL=chrome node outils/recette-captures.mjs --avant
 *   BROWSER_CHANNEL=chrome node outils/recette-captures.mjs --apres
 *
 * Voir `--aide` pour les options, et documents/FINI.md pour l'usage en PR.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve, sep, join, dirname, relative, basename, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relever } from './termes-interdits.mjs';

const RACINE = fileURLToPath(new URL('../', import.meta.url));

export const LARGEURS = [320, 390, 1440];
export const HAUTEURS = { 320: 700, 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 3200: 1694 };

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
  ['dossier', 'Dossier : chaque rubrique de chaque nature'], ['partage', 'Page partagée'],
];

/* La planche cible de chaque espace, dans le dossier des planches de
 * conception (option --cibles). */
export const PLANCHES = {
  bureau: '01-bureau-projets.png', projets: '01-bureau-projets.png', dossier: '02-dossier.png',
  decisions: '03-decisions-revue.png', piece: '03-decisions-revue.png',
  planning: '04-planning-bilan.png', bilan: '04-planning-bilan.png',
  ressources: '05-ressources.png', partage: '06-mobile-remise-partage.png',
};

const ESPACE_DE = { valider: 'decisions', planning: 'planning', reporting: 'bilan', referentiel: 'ressources' };

function adresse(...segments) { return '#/' + segments.map(s => encodeURIComponent(String(s))).join('/'); }

/* La liste des routes, à partir de ce que la base contient. Une route absente
 * de la base (aucune marque, aucune version historique…) n'est pas inventée :
 * elle est signalée dans `manquantes`. */
export function routesDe(inv) {
  const routes = [], manquantes = [];
  const ajouter = (id, espace, hash, nom, action = null) => routes.push({ id, espace, hash, nom, action });
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
    ajouter('piece/' + mode, 'piece', adresse('projets', pc.attente.p, 'livrables', pc.attente.l, mode), 'Pièce · ' + mode);
  else manquantes.push('piece/poser', 'piece/juger', 'piece/origine');
  if (pc.approuvee) ajouter('piece/remise', 'piece', adresse('projets', pc.approuvee.p, 'livrables', pc.approuvee.l, 'remise'), 'Pièce · remise');
  else manquantes.push('piece/remise');
  if (pc.historique) ajouter('piece/version-historique', 'piece',
    adresse('projets', pc.historique.p, 'livrables', pc.historique.l, 'juger', pc.historique.n), 'Pièce · version historique');
  else manquantes.push('piece/version-historique');
  if (pc.piste) ajouter('piece/piste', 'piece', adresse('projets', pc.piste.p, 'pistes', pc.piste.id), 'Piste');
  else manquantes.push('piece/piste');

  for (const vue of ['valider', 'planning', 'reporting', 'referentiel']) {
    const modes = (inv.modes && Array.isArray(inv.modes[vue]) && inv.modes[vue].length) ? inv.modes[vue] : MODES_ATTENDUS[vue];
    for (const mode of modes) ajouter(vue + '/' + mode, ESPACE_DE[vue], adresse(vue, mode), vue + ' · ' + mode);
  }
  ajouter('plus', 'plus', '#/plus', 'Plus');
  ajouter('recherche', 'recherche', '#/bureau', 'Recherche ouverte', 'recherche');
  ajouter('nouveau-projet', 'nouveau-projet', '#/projets', 'Nouveau projet ouvert', 'nouveau-projet');

  for (const n of inv.natures || []) {
    const id = (inv.dossiers || {})[n.cle] || (inv.temoins || {})[n.cle];
    if (!id) { manquantes.push('dossier/' + n.cle); continue; }
    const temoin = !(inv.dossiers || {})[n.cle];
    ajouter('dossier/' + n.cle, 'dossier', adresse('projets', id), n.nom + (temoin ? ' (projet témoin vide)' : '') + ' · vue d’ensemble');
    for (const s of n.sections) ajouter('dossier/' + n.cle + '/' + s, 'dossier', adresse('projets', id, s), n.nom + ' · ' + s);
  }
  if (inv.jeton) ajouter('partage', 'partage', adresse('partage', inv.jeton), 'Page partagée');
  else manquantes.push('partage');
  return { routes, manquantes };
}

/* Ce que la base contient, lu dans la page. Exécuté dans le navigateur. */
function inventaire() {
  const modes = v => (v && Array.isArray(v.MODES) ? v.MODES.map(m => m.cle) : null);
  const projets = DEPOT.liste('projets').filter(p => p && !p.fusionne);
  const natures = (window.NATURE ? NATURE.liste() : []).map(n => ({ cle: n.cle, nom: n.nom, sections: (n.sections || []).slice() }));
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
    natures, dossiers, pieces: { attente, approuvee, historique, piste },
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
  --sortie <dossier>    dossier de sortie, hors du dépôt (défaut : ../recette-adoption)
  --base <fichier>      base importée en mémoire (défaut : vitrine/demo/base-fictive.json)
  --medias <dossier>    où chercher les images que la base cite (défaut : le dossier de la base)
  --largeurs 320,390,1440   largeurs en px (3200 en option)
  --routes <expression> ne capture que les routes dont l'identifiant correspond
  --horloge <date ISO>  fige l'heure de la page, pour comparer deux jours différents
  --cibles <dossier>    planches cibles de la conception, montrées en tête de chaque espace
  --pleine-page         capture la page entière, pas seulement le premier écran
  --strict              sort en erreur s'il y a une exception, un débordement ou un terme interdit`;

export function lireArguments(args) {
  const o = { sortie: resolve(RACINE, '..', 'recette-adoption'), temps: null, base: join(RACINE, 'vitrine', 'demo', 'base-fictive.json'),
    medias: null, largeurs: LARGEURS.slice(), routes: null, horloge: null, cibles: null, pleinePage: false, strict: false, aide: false };
  const valeur = (i, nom) => { const v = args[i + 1]; if (v === undefined || v.startsWith('--')) throw new Error(nom + ' attend une valeur.'); return v; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--aide' || a === '-h' || a === '--help') o.aide = true;
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
    else if (a === '--routes') o.routes = new RegExp(valeur(i++, a));
    else if (a === '--horloge') {
      o.horloge = valeur(i++, a);
      if (Number.isNaN(Date.parse(o.horloge))) throw new Error('--horloge attend une date ISO, par exemple 2026-11-26T09:00:00.');
    }
    else if (a === '--cibles') o.cibles = resolve(valeur(i++, a));
    else if (a === '--pleine-page') o.pleinePage = true;
    else if (a === '--strict') o.strict = true;
    else throw new Error('Option inconnue : ' + a);
  }
  if (!o.medias) o.medias = dirname(o.base);
  const dans = relative(RACINE, o.sortie);
  if (!dans || (!dans.startsWith('..') && !isAbsolute(dans)))
    throw new Error('La sortie doit être hors du dépôt : les captures d’une vraie base montrent des clients (documents/FINI.md).');
  o.dossier = o.temps ? join(o.sortie, o.temps) : o.sortie;
  return o;
}

/* ————— La planche-contact ————— */

function echapper(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function lien(depuis, fichier) { return relative(depuis, fichier).split(sep).map(encodeURIComponent).join('/'); }

export function problemes(c) {
  const p = [];
  if (c.exceptions.length) p.push(['exception', c.exceptions.length + ' exception(s)']);
  if (c.debordement > 0) p.push(['debordement', 'déborde de ' + c.debordement + ' px']);
  if (c.termes.length) p.push(['terme', c.termes.map(t => t.terme + (t.nombre > 1 ? ' ×' + t.nombre : '')).join(', ')]);
  if (c.images && c.images.cassees) p.push(['image', c.images.cassees + ' image(s) cassée(s)']);
  if (c.introuvable) p.push(['introuvable', 'page introuvable']);
  else if (c.vide) p.push(['vide', 'presque vide']);
  return p;
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
  const badge = c => problemes(c).map(([k, t]) => `<span class="badge ${k}">${echapper(t)}</span>`).join('');
  const image = (titre, fichier, depuis) => `<a href="${lien(dossier, join(depuis, fichier))}" title="${echapper(titre)}"><img loading="lazy" alt="${echapper(titre)}" src="${lien(dossier, join(depuis, fichier))}"></a>`;
  const s = r.resume;
  const temps = r.temps ? ' · ' + ({ avant: 'avant', apres: 'après' }[r.temps] || echapper(r.temps)) : '';
  const sections = groupes.filter(g => g.routes.length).map(g => {
    const cible = cibles[g.cle] ? `<a class="cible" href="${lien(dossier, cibles[g.cle])}"><img loading="lazy" alt="Planche cible" src="${lien(dossier, cibles[g.cle])}"><span>Planche cible</span></a>` : '';
    const lignes = g.routes.map(id => {
      const cs = ordre.get(id);
      const cellules = cs.map(c => {
        const a = parCle.get(c.id + '@' + c.largeur);
        const contenu = avant
          ? `<div class="paire"><div><small>Avant</small>${a ? image('Avant', a.fichier, avantDossier) : '<p class="absent">absente</p>'}</div><div><small>Après</small>${image('Après', c.fichier, dossier)}</div></div>`
          : image(c.id + ' à ' + c.largeur + ' px', c.fichier, dossier);
        return `<figure><figcaption><b>${c.largeur} px</b> ${badge(c)}</figcaption>${contenu}</figure>`;
      }).join('');
      const c0 = cs[0];
      /* Une colonne par largeur, proportionnée sans écraser le téléphone. */
      const colonnes = cs.map(c => Math.sqrt(c.largeur).toFixed(1) + 'fr').join(' ');
      return `<article id="${echapper(id)}"><header><h3>${echapper(id)}</h3><code>${echapper(c0.hash)}</code><span>${echapper(c0.titre || '(sans titre)')}</span></header><div class="largeurs" style="grid-template-columns:${colonnes}">${cellules}</div></article>`;
    }).join('');
    return `<section><div class="tete"><h2>${echapper(g.nom)}</h2>${cible}</div>${lignes}</section>`;
  }).join('');
  const liste = r.captures.filter(c => problemes(c).length)
    .map(c => `<li><a href="#${echapper(c.id)}">${echapper(c.id)}</a> à ${c.largeur} px : ${problemes(c).map(p => echapper(p[1])).join(' · ')}</li>`).join('');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recette des captures${temps}</title>
<style>
:root{--fond:#f6f6f4;--carte:#fff;--texte:#1d1d1b;--terne:#6b6b66;--trait:#deded8;--alerte:#b3261e;--attente:#8a5a00}
@media (prefers-color-scheme:dark){:root{--fond:#161615;--carte:#20201e;--texte:#ededea;--terne:#a3a39c;--trait:#3a3a36;--alerte:#ff8a80;--attente:#f0c060}}
*{box-sizing:border-box}body{margin:0;padding:16px;font:14px/1.45 system-ui,-apple-system,sans-serif;background:var(--fond);color:var(--texte)}
h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:0}h3{font-size:14px;margin:0}
.meta{color:var(--terne);margin:0 0 12px}.chiffres{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chiffres span{background:var(--carte);border:1px solid var(--trait);border-radius:6px;padding:6px 10px}
section{margin:28px 0}.tete{display:flex;align-items:flex-end;gap:16px;border-bottom:1px solid var(--trait);padding-bottom:8px;margin-bottom:12px;flex-wrap:wrap}
.cible{display:flex;align-items:center;gap:8px;color:var(--terne);text-decoration:none}.cible img{height:64px;border:1px solid var(--trait);border-radius:4px}
article{background:var(--carte);border:1px solid var(--trait);border-radius:8px;padding:12px;margin:0 0 12px}
article header{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-bottom:8px}article code{color:var(--terne);font-size:12px;overflow-wrap:anywhere}
.largeurs{display:grid;gap:12px;align-items:start}
@media (max-width:720px){.largeurs{grid-template-columns:1fr!important}}
figure{margin:0;min-width:0}figcaption{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px;font-size:12px}
img{display:block;width:100%;height:auto;max-height:640px;object-fit:cover;object-position:top;border:1px solid var(--trait);border-radius:4px;background:#fff}
.paire{display:grid;grid-template-columns:1fr 1fr;gap:6px}.paire small{color:var(--terne)}.absent{color:var(--terne);font-style:italic}
.badge{border-radius:10px;padding:1px 8px;font-size:11px;border:1px solid currentColor}.exception,.debordement,.image,.introuvable{color:var(--alerte)}.terme,.vide{color:var(--attente)}
ul{padding-left:18px}a{color:inherit}
</style></head><body>
<h1>Recette des captures${temps}</h1>
<p class="meta">${echapper(r.quand)} · commit ${echapper(r.commit || 'inconnu')} · base ${echapper(r.base.fichier)} (${r.base.projets} projets, ${r.base.livrables} pièces) · largeurs ${r.largeurs.join(', ')} px${r.horloge ? ' · horloge figée ' + echapper(r.horloge) : ''}</p>
<div class="chiffres"><span>${s.routes} routes</span><span>${s.captures} captures</span><span>${s.exceptions} exception(s)</span><span>${s.debordements} débordement(s)</span><span>${s.termes} capture(s) avec un terme interdit</span><span>${s.introuvables} introuvable(s)</span><span>${s.imagesCassees} image(s) cassée(s)</span></div>
${r.manquantes.length ? `<p class="meta">Absentes de cette base, donc non capturées : ${r.manquantes.map(echapper).join(', ')}.</p>` : ''}
${avant ? `<p class="meta">Comparaison avec ${echapper(lien(dossier, avantDossier) || '.')}/ (${echapper(avant.quand)}, commit ${echapper(avant.commit || 'inconnu')}).</p>` : ''}
${liste ? `<details><summary>À regarder (${r.captures.filter(c => problemes(c).length).length})</summary><ul>${liste}</ul></details>` : '<p>Aucune exception, aucun débordement, aucun terme interdit.</p>'}
${sections}
</body></html>
`;
}

/* Ce qui a changé entre deux recettes : routes, exceptions, débordements, termes. */
export function comparer(avant, apres) {
  const cle = c => c.id + '@' + c.largeur;
  const a = new Map(avant.captures.map(c => [cle(c), c]));
  const b = new Map(apres.captures.map(c => [cle(c), c]));
  const ids = x => [...new Set(x.captures.map(c => c.id))];
  return {
    routesNouvelles: ids(apres).filter(id => !ids(avant).includes(id)),
    routesDisparues: ids(avant).filter(id => !ids(apres).includes(id)),
    exceptionsNouvelles: [...b].filter(([k, c]) => c.exceptions.length && !(a.get(k) || { exceptions: [] }).exceptions.length).map(([k]) => k),
    debordementsNouveaux: [...b].filter(([k, c]) => c.debordement > 0 && !((a.get(k) || {}).debordement > 0)).map(([k]) => k),
    termes: { avant: avant.captures.reduce((n, c) => n + c.termes.reduce((m, t) => m + t.nombre, 0), 0),
      apres: apres.captures.reduce((n, c) => n + c.termes.reduce((m, t) => m + t.nombre, 0), 0) },
  };
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

async function stabiliser(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const visibles = [...document.images].filter(i => { const b = i.getBoundingClientRect(); return b.width && b.bottom > 0 && b.top < innerHeight; });
    await Promise.race([
      Promise.all(visibles.map(i => (i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })))),
      new Promise(r => setTimeout(r, 1500)),
    ]);
  });
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

async function mesurer(page) {
  return page.evaluate(() => {
    const zone = document.querySelector('#contenu') || document.querySelector('#corps') || document.body;
    const dialogue = document.querySelector('dialog[open], .panneau[role=dialog]');
    const titre = (dialogue && dialogue.querySelector('h1, h2')) || zone.querySelector('h1') || document.querySelector('h1');
    const images = [...document.images].filter(i => i.getClientRects().length);
    const dansEcran = i => { const b = i.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width >= 24 && b.height >= 24; };
    return {
      titre: titre ? titre.textContent.trim().replace(/\s+/g, ' ').slice(0, 140) : '',
      texte: document.body.innerText,
      contenu: zone.innerText.trim().length,
      debordement: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      hauteurPage: document.documentElement.scrollHeight,
      images: {
        premierEcran: images.filter(i => i.complete && i.naturalWidth > 0 && dansEcran(i)).length,
        cassees: images.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length,
      },
    };
  });
}

function nomFichier(id, largeur) { return id.replace(/[^a-z0-9-]+/gi, '_') + '--' + largeur + '.png'; }

function commit() {
  try { return execFileSync('git', ['-C', RACINE, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return null; }
}

async function principal() {
  let o;
  try { o = lireArguments(process.argv.slice(2)); }
  catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 2; return; }
  if (o.aide) { process.stdout.write(AIDE + '\n'); return; }

  const texte = await readFile(o.base, 'utf8');
  const dossierCaptures = join(o.dossier, 'captures');
  await rm(dossierCaptures, { recursive: true, force: true });
  await rm(join(o.dossier, 'cibles'), { recursive: true, force: true });
  await mkdir(dossierCaptures, { recursive: true });

  const { chromium } = await import('playwright');
  const srv = serveur([RACINE, o.medias]);
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port;
  let navigateur;
  const r = { outil: 'outils/recette-captures.mjs', temps: o.temps, quand: new Date().toISOString(), commit: commit(),
    horloge: o.horloge, largeurs: o.largeurs, pleinePage: o.pleinePage,
    base: { fichier: basename(o.base), empreinte: createHash('sha256').update(texte).digest('hex').slice(0, 12) },
    manquantes: [], horsCapture: [], captures: [] };
  try {
    navigateur = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
    const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await contexte.newPage();
    page.setDefaultTimeout(15000);
    if (o.horloge) await page.clock.setFixedTime(new Date(o.horloge));
    let courant = null;
    page.on('pageerror', e => (courant ? courant.exceptions : r.horsCapture).push(String((e && e.message) || e)));
    await page.goto(url + '/#/bureau', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.APP && window.DEPOT && window.DECISION);
    const recu = await page.evaluate(t => {
      try { DEPOT.importer(t); APP.rendre(); return null; } catch (e) { return e.message; }
    }, texte);
    if (recu) throw new Error('La base n’a pas pu être importée : ' + recu);

    let inv = await page.evaluate(inventaire);
    Object.assign(r.base, inv.volume);
    const faites = new Set();

    async function capturer(routes) {
      for (const route of routes) {
        if (o.routes && !o.routes.test(route.id)) continue;
        faites.add(route.id);
        for (const largeur of o.largeurs) {
          const c = { id: route.id, espace: route.espace, nom: route.nom, hash: route.hash, largeur,
            hauteurEcran: HAUTEURS[largeur] || 900, fichier: join('captures', nomFichier(route.id, largeur)), exceptions: [] };
          courant = c;
          try {
            await fermer(page);
            await page.setViewportSize({ width: largeur, height: c.hauteurEcran });
            await aller(page, route.hash);
            await stabiliser(page);
            if (route.action === 'recherche') await ouvrirRecherche(page, inv.recherche);
            if (route.action === 'nouveau-projet') await page.evaluate(() => VUE_PROJETS.nouveau());
            await page.evaluate(() => window.scrollTo(0, 0));
            await stabiliser(page);
            const m = await mesurer(page);
            await page.screenshot({ path: join(o.dossier, c.fichier), fullPage: o.pleinePage, animations: 'disabled', caret: 'hide' });
            Object.assign(c, { titre: m.titre, contenu: m.contenu, debordement: m.debordement, hauteurPage: m.hauteurPage, images: m.images,
              introuvable: /introuvable|ne mène à rien/i.test(m.titre), vide: m.contenu < 10, termes: relever(m.texte) });
          } catch (e) {
            c.exceptions.push('Recette : ' + ((e && e.message) || e));
            Object.assign(c, { titre: '', contenu: 0, debordement: 0, hauteurPage: 0, images: { premierEcran: 0, cassees: 0 },
              introuvable: false, vide: true, termes: [] });
          }
          r.captures.push(c);
          courant = null;
        }
      }
      await fermer(page);
    }

    /* D'abord les espaces tels que la base les montre. */
    const premiers = routesDe(inv);
    await capturer(premiers.routes);

    /* Puis, en mémoire seulement : un projet témoin vide pour chaque nature
     * absente de la base, et un lien de partage s'il n'y en a aucun. Ils
     * viennent après, pour ne changer aucune des captures précédentes. */
    const absentes = inv.natures.filter(n => !inv.dossiers[n.cle]).map(n => n.cle);
    const ajouts = await page.evaluate(({ absentes, jeton, principal }) => {
      const temoins = {};
      for (const n of NATURE.liste()) if (absentes.includes(n.cle)) {
        temoins[n.cle] = DEPOT.ajoute('projets', { ref: 'TEMOIN-' + n.cle.toUpperCase(), nom: 'Projet témoin · ' + n.nom, nature: n.cle,
          statut: 'ouvert', equipe: [], volets: [], livrables: [], sections: { identite: { client: 'Témoin de recette' } } }).id;
      }
      let j = jeton;
      const p = DEPOT.trouve('projets', principal) || DEPOT.liste('projets')[0];
      if (!j && p) { j = 'c0ffeec0ffeec0ffeec0ffee'; p.partages = Object.assign({}, p.partages, { cadrage: { jeton: j, cree_le: new Date().toISOString() } }); }
      return { temoins, jeton: j };
    }, { absentes, jeton: inv.jeton, principal: inv.dossiers.campagne || Object.values(inv.dossiers)[0] || null });
    inv = { ...inv, temoins: ajouts.temoins, jeton: ajouts.jeton };
    const tout = routesDe(inv);
    await capturer(tout.routes.filter(x => !faites.has(x.id)));
    r.manquantes = tout.manquantes;
    if (o.routes) r.manquantes = r.manquantes.filter(id => o.routes.test(id));
  } finally {
    if (navigateur) await navigateur.close();
    await new Promise(x => srv.close(x));
  }

  r.resume = {
    routes: new Set(r.captures.map(c => c.id)).size, captures: r.captures.length,
    exceptions: r.captures.reduce((n, c) => n + c.exceptions.length, 0) + r.horsCapture.length,
    debordements: r.captures.filter(c => c.debordement > 0).length,
    termes: r.captures.filter(c => c.termes.length).length,
    introuvables: r.captures.filter(c => c.introuvable).length,
    imagesCassees: r.captures.reduce((n, c) => n + ((c.images || {}).cassees || 0), 0),
    termesParMot: Object.fromEntries(Object.entries(r.captures.flatMap(c => c.termes).reduce((t, x) => (t[x.terme] = (t[x.terme] || 0) + x.nombre, t), {})).sort((a, b) => b[1] - a[1])),
  };

  let avant = null, avantDossier = null;
  if (o.temps === 'apres') {
    avantDossier = join(o.sortie, 'avant');
    if (existsSync(join(avantDossier, 'captures.json'))) {
      avant = JSON.parse(await readFile(join(avantDossier, 'captures.json'), 'utf8'));
      r.comparaison = { avant: relative(o.dossier, avantDossier), ...comparer(avant, r) };
    }
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
  const { termesParMot, ...court } = r.resume;
  process.stdout.write(JSON.stringify({ sortie: o.dossier, planche: join(o.dossier, 'index.html'), ...court,
    manquantes: r.manquantes, ...(r.comparaison ? { comparaison: r.comparaison } : {}) }, null, 2) + '\n');
  if (o.strict && (r.resume.exceptions || r.resume.debordements || r.resume.termes)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  principal().catch(e => { process.stderr.write((e && e.stack) || String(e)); process.stderr.write('\n'); process.exitCode = 1; });
}
