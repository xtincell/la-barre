// Les huit gestes qui écrivent une décision, rejoués dans un bac à sable fixe.
//
// Même base fictive, même horloge, même hasard : seul change le dossier `app/`
// qu'on charge. On rejoue ici l'arbre courant ; la capture fige ce qu'écrivait
// `origin/main` avant la fabrique unique (tests/fixtures/decisions-avant.json).
//
// Les vrais modules sont chargés : profil neutre, outils, dépôt, acteur, version
// et l'écrivain lui-même. Seuls les écrans voisins sont simulés, et un faux DOM tient les
// boutons qu'on clique. Cinq gestes vivent dans une fonction interne de leur
// module : une ligne ajoutée avant le `return` final du module la rend
// joignable, sans toucher à son corps. La même ligne est ajoutée avant et après.
//
//   node tests/decisions-scenarios.mjs capturer [révision]
//
// réécrit la capture depuis la révision donnée (par défaut origin/main).

import vm from 'node:vm';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../', import.meta.url));
export const CAPTURE = fileURLToPath(new URL('./fixtures/decisions-avant.json', import.meta.url));
const copie = x => JSON.parse(JSON.stringify(x));

/* ————— Un DOM juste assez réel pour O.el ————— */

class Noeud {
  constructor(nom) {
    this.nodeName = nom; this.tagName = String(nom).toUpperCase();
    this.childNodes = []; this.parentNode = null; this.attributs = {}; this.ecouteurs = {};
    this.className = ''; this.value = ''; this.checked = false; this.disabled = false;
    this.style = { setProperty() {}, removeProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  get children() { return this.childNodes.filter(n => !(n instanceof Texte)); }
  get firstChild() { return this.childNodes[0] || null; }
  appendChild(n) {
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this; this.childNodes.push(n); return n;
  }
  removeChild(n) { this.childNodes = this.childNodes.filter(x => x !== n); n.parentNode = null; return n; }
  setAttribute(k, v) { this.attributs[k] = String(v); }
  getAttribute(k) { return k in this.attributs ? this.attributs[k] : null; }
  addEventListener(type, f) { (this.ecouteurs[type] ||= []).push(f); }
  removeEventListener() {}
  focus() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(t) { this.childNodes = [new Texte(String(t))]; }
}
class Texte extends Noeud {
  constructor(t) { super('#text'); this.data = t; }
  get textContent() { return this.data; }
}

function parcourir(n, test, out = []) {
  if (!n || typeof n !== 'object') return out;
  if (test(n)) out.push(n);
  for (const e of n.childNodes || []) parcourir(e, test, out);
  return out;
}
function bouton(racine, libelle) {
  const b = parcourir(racine, n => n.tagName === 'BUTTON' && n.textContent.trim() === libelle)[0];
  if (!b) throw new Error('Bouton introuvable : ' + libelle);
  return b;
}
function saisie(racine) {
  const c = parcourir(racine, n => n.tagName === 'TEXTAREA' || (n.tagName === 'INPUT' && n.attributs.type !== 'checkbox'))[0];
  if (!c) throw new Error('Aucun champ de saisie');
  return c;
}
function cliquer(n) { for (const f of n.ecouteurs.click || []) f.call(n, { preventDefault() {}, target: n }); }

/* ————— L'horloge et le hasard figés ————— */

// Chaque lecture de l'horloge avance d'une seconde : un geste qui lirait
// l'heure une fois de plus, ou dans un autre ordre, change les dates écrites.
function horloge(debut) {
  const base = Date.parse(debut);
  let n = 0;
  const suivante = () => base + 1000 * n++;
  return class FauxDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(suivante()); }
    static now() { return suivante(); }
  };
}

// mulberry32 : le même tirage à chaque rejeu.
function hasard(graine) {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function memoire() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() };
}

/* ————— Le bac à sable ————— */

function exposer(source, noms) {
  const i = source.lastIndexOf('\n  return {');
  if (i < 0) throw new Error('Fin de module introuvable');
  const ligne = '\n  globalThis.__INTERNE__ = { '
    + noms.map(n => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(', ') + ' };';
  return source.slice(0, i) + ligne + source.slice(i);
}

export async function bac(app, graine) {
  const lire = nom => readFile(join(app, nom + '.js'), 'utf8');
  const panneaux = [], demandes = [], refus = [];
  const document = {
    createElement: t => new Noeud(t), createTextNode: t => new Texte(String(t)),
    querySelectorAll: () => [], getElementById: () => null, body: new Noeud('body'),
  };
  const ui = new Proxy({}, { get: () => () => new Noeud('div') });
  const sandbox = {
    console, document, Node: Noeud, Date: horloge('2026-11-10T09:00:00.000Z'),
    Math: Object.create(Math, { random: { value: hasard(graine) } }),
    location: { protocol: 'http:', hash: '' }, navigator: { platform: 'Recette' },
    localStorage: memoire(), sessionStorage: memoire(),
    setTimeout: () => 0, clearTimeout() {},
    AVIS: { refus: m => refus.push(m), fait() {}, grave() {} },
    REPRISES: { garder: async () => {}, lire: async () => null, retirer: async () => {}, lister: async () => [] },
    PANNEAU: {
      ouvrir(titre, sous, contenu) { panneaux.push(contenu); }, sur(titre, sous, contenu) { panneaux.push(contenu); },
      demander(titre, o, quand) { demandes.push(quand); }, fermer() {}, fermerSur() {},
    },
    UI: ui,
    INFERENCE: { liste: (p, cle) => ((p.inferences || {})[cle] || []).slice(), compte: (p, cle) => ((p.inferences || {})[cle] || []).length },
    COUT: { verdict: () => ({ alertes: [], gagne: ['Le livrable peut partir'], effets: ['La relecture se ferme'], jours: 0 }) },
    REGLES: { grille: () => [{ cle: 'lisible', texte: 'La promesse ne se lit pas en trois secondes' }], maitrePerime: () => false },
    KV: { tous: p => (p.livrables || []).filter(l => l.kv), estKV: l => !!l.kv },
    DISPOSITIF: {
      declenche: () => ({ aCreer: [{ support: { nom: 'Affiche' }, marche: { code: 'CM' } }], sansBAT: [] }),
      liste: () => [{ cle: 'affichage' }], ouvrirProduction: () => 1,
    },
    PRODUCTION: { ETAPES: [] }, RENVOI: { ouvrir() {} },
    PLATEAU: { semaineDe: () => 1, echeanceDe: () => null }, CLOTURE: { est: p => !!p.cloture },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  /* Le profil neutre, celui de la distribution d'entreprise : aucune donnée
   * d'installation n'entre dans la capture. */
  vm.runInContext(await lire('maison-base'), ctx);
  vm.runInContext(await readFile(join(app, '..', 'profils', 'entreprise', 'maison.js'), 'utf8'), ctx);
  for (const nom of ['outils', 'reconciliation', 'depot']) vm.runInContext(await lire(nom), ctx);
  if (existsSync(join(app, 'decision.js'))) vm.runInContext(await lire('decision'), ctx);
  for (const nom of ['acteur', 'version']) vm.runInContext(await lire(nom), ctx);
  const interne = {};
  const charger = async (nom, noms = []) => {
    vm.runInContext(noms.length ? exposer(await lire(nom), noms) : await lire(nom), ctx);
    interne[nom] = ctx.__INTERNE__; delete ctx.__INTERNE__;
  };
  return { ctx, interne, charger, panneaux, demandes, refus, dernier: () => panneaux[panneaux.length - 1] };
}

/* ————— La base fictive ————— */

export const PERSONNES = [
  { id: 'P-recette', nom: 'Personne de recette', poste: 'creation', seniorite: 'senior' },
  { id: 'P-junior', nom: 'Junior de recette', poste: 'da', seniorite: 'junior' },
];
const piste = (id, extra = {}) => ({ id, titre: 'Piste ' + id, concept: 'Concept ' + id, axe: 'Axe ' + id,
  statut: 'proposee', version: 1, soumis_le: '2026-11-02T08:00:00.000Z', ...extra });
export const livrable = (id, extra = {}) => ({ id, nom: 'Livrable ' + id, support: 'S-affiche', marche: 'M-cm',
  points: { central: 'en cours' }, versions: [{ n: 1, soumis_le: '2026-11-03T08:00:00.000Z' }], ...extra });
export const projet = (id, extra = {}) => ({ id, ref: 'REF-' + id, nom: 'Projet ' + id, cree_le: '2026-11-01T08:00:00.000Z',
  sections: { brief: { objectif: 'Faire connaître' }, identite: { marque: 'Marque de recette' }, pistes: [] },
  livrables: [], idees: [], ...extra });

export function semer(ctx, donnees) {
  const base = ctx.DEPOT.tout();
  for (const [cle, valeurs] of Object.entries(donnees)) base[cle] = copie(valeurs);
  ctx.ACTEUR.choisir('P-recette');
}

/* ————— Les huit gestes ————— */

export const ECRIVAINS = {
  /* bigidea-ecoles.js — retenir une proposition comme big idea. */
  async 'bigidea-ecoles'(s) {
    await s.charger('bigidea-ecoles', ['choisir']);
    const p = projet('BI', { bigideas: [{ id: 'BE-1', ecole: null, titre: 'Le pont', phrase: 'Tout passe par le pont',
      mecanique: '', champs: {}, insightId: null, territoireId: null, auteur: 'P-junior', statut: 'proposee',
      cree_le: '2026-11-01T08:00:00.000Z' }] });
    p.sections.bigidea = { idee: 'Une idée plus ancienne' };
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'BI');
    s.interne['bigidea-ecoles'].choisir(pr, pr.bigideas[0], () => {});
    saisie(s.dernier()).value = 'Elle répond au brief et tient trois ans';
    cliquer(bouton(s.dernier(), 'Retenir comme big idea'));
  },

  /* campagne.js — désigner la référence commune d'une campagne, puis la
   * redésigner avec un autre motif : la seconde décision remplace la première. */
  async campagne(s) {
    await s.charger('campagne');
    const p = projet('CA', { campagneId: 'C-1', sections: { pistes: [piste('pi-a', { statut: 'retenue', arbitre_le: '2026-11-04T08:00:00.000Z' })] } });
    semer(s.ctx, { personnes: PERSONNES, projets: [p], campagnes: [{ id: 'C-1', nom: 'Campagne de recette' }] });
    const C = s.ctx.CAMPAGNE;
    let r = C.designerReference('C-1', 'CA', 'pi-a', 'Elle porte le socle commun', C.reference('C-1').revision);
    if (!r.ok) throw new Error(r.erreur);
    r = C.designerReference('C-1', 'CA', 'pi-a', 'Le motif amendé', C.reference('C-1').revision);
    if (!r.ok) throw new Error(r.erreur);
  },

  /* validation.js — un verdict sur un document : une réserve motivée sur le
   * brief, puis une approbation du socle avec des champs encore à confirmer. */
  async validation(s) {
    await s.charger('validation');
    const p = projet('VA', { inferences: { socle: [{ cle: 'promesse' }] } });
    p.sections.socle = { promesse: 'Une promesse' };
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'VA');
    const verdict = cle => s.ctx.MAISON.verdicts.find(v => v.cle === cle);
    s.ctx.VALIDATION.rendre(pr, 'brief', pr.sections.brief, verdict('reserve'), () => {});
    cliquer(bouton(s.dernier(), s.ctx.MAISON.criteresDe('brief')[0]));
    cliquer(bouton(s.dernier(), verdict('reserve').nom));
    s.ctx.VALIDATION.rendre(pr, 'socle', pr.sections.socle, verdict('approuve'), () => {});
    cliquer(bouton(s.dernier(), verdict('approuve').nom));
  },

  /* vue-atelier.js — trancher deux idées : l'une retenue, l'autre écartée. */
  async 'vue-atelier'(s) {
    await s.charger('vue-atelier', ['trancher']);
    const p = projet('AT', { idees: [
      { id: 'ID-1', texte: 'Un pont entre deux rives, et les gens qui le traversent', auteur: 'P-junior', statut: 'proposee' },
      { id: 'ID-2', texte: 'Une idée trop proche du concurrent', auteur: null, statut: 'proposee' }] });
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'AT');
    s.interne['vue-atelier'].trancher(pr, pr.idees[0], 'retenue', () => {});
    saisie(s.dernier()).value = 'Elle porte le territoire';
    cliquer(bouton(s.dernier(), 'Retenir'));
    s.interne['vue-atelier'].trancher(pr, pr.idees[1], 'ecartee', () => {});
    saisie(s.dernier()).value = 'Trop proche du concurrent';
    cliquer(bouton(s.dernier(), 'Écarter'));
  },

  /* vue-bigidea.js — retenir une piste depuis l'écran de la big idea. */
  async 'vue-bigidea'(s) {
    await s.charger('vue-bigidea', ['retenir']);
    const p = projet('VB', { sections: { pistes: [piste('pi-b'), piste('pi-c', { statut: 'retenue' })] },
      livrables: [livrable('L-vb')] });
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'VB');
    s.interne['vue-bigidea'].retenir(pr, pr.sections.pistes[0], () => {});
    saisie(s.dernier()).value = 'La seule qui tient la promesse';
    cliquer(bouton(s.dernier(), 'Retenir'));
  },

  /* vue-livrable.js — juger la dernière version : une approbation sans motif,
   * puis un retour motivé sur un autre livrable. */
  async 'vue-livrable'(s) {
    await s.charger('vue-livrable', ['juger']);
    const p = projet('LI', { livrables: [livrable('L-1'), livrable('L-2')] });
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'LI');
    const verdict = cle => s.ctx.MAISON.verdicts.find(v => v.cle === cle);
    s.interne['vue-livrable'].juger(pr, pr.livrables[0], verdict('approuve'), () => {});
    s.interne['vue-livrable'].juger(pr, pr.livrables[1], verdict('retour'), () => {});
    s.demandes.pop()('Le logo est sous la taille minimale');
  },

  /* vue-revue.js — la revue : une piste approuvée, un livrable hors périmètre,
   * le motif choisi dans les critères écrits. */
  async 'vue-revue'(s) {
    await s.charger('vue-revue', ['confirmer']);
    const p = projet('RE', { sections: { pistes: [piste('pi-r')] }, livrables: [livrable('L-r')] });
    semer(s.ctx, { personnes: PERSONNES, projets: [p], supports: [{ id: 'S-affiche', nom: 'Affiche' }], marches: [{ id: 'M-cm', nom: 'Cameroun' }] });
    const pieces = s.ctx.VUE_REVUE.pieces();
    const verdict = cle => s.ctx.MAISON.verdicts.find(v => v.cle === cle);
    const cout = { alertes: [], gagne: [], effets: [], jours: 0 };
    const de = type => pieces.find(x => x.type === type);
    s.interne['vue-revue'].confirmer(de('piste'), verdict('approuve'), cout);
    cliquer(bouton(s.dernier(), 'Rendre le verdict'));
    s.interne['vue-revue'].confirmer(de('livrable'), verdict('hors'), cout);
    cliquer(bouton(s.dernier(), 'La promesse ne se lit pas en trois secondes'));
    cliquer(bouton(s.dernier(), 'Rendre le verdict'));
  },

  /* vue-route.js — retenir une piste depuis sa route et ouvrir la production. */
  async 'vue-route'(s) {
    await s.charger('vue-route', ['retenir']);
    const p = projet('RO', { sections: { pistes: [piste('pi-o'), piste('pi-p', { statut: 'retenue' })] },
      livrables: [livrable('L-ro', { pisteId: 'pi-p' })] });
    semer(s.ctx, { personnes: PERSONNES, projets: [p] });
    const pr = s.ctx.DEPOT.trouve('projets', 'RO');
    s.interne['vue-route'].retenir(pr, pr.sections.pistes[0], () => {});
    saisie(s.dernier()).value = 'Elle se décline sur tout le dispositif';
    cliquer(bouton(s.dernier(), 'Retenir et ouvrir la production'));
  },
};

/* Rejouer un geste sur un dossier `app/` donné. Une graine par écrivain : les
 * huit rejeux restent indépendants. */
export async function rejouer(app, nom) {
  const graine = [...nom].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const s = await bac(app, graine);
  await ECRIVAINS[nom](s);
  return { decisions: copie(s.ctx.DEPOT.liste('decisions')), base: copie(s.ctx.DEPOT.tout()), refus: s.refus.slice() };
}

export async function rejouerTout(app) {
  const out = {};
  for (const nom of Object.keys(ECRIVAINS)) out[nom] = await rejouer(app, nom);
  return out;
}

/* Extraire `app/` et le profil neutre d'une révision dans un dossier jetable. */
export async function extraire(revision) {
  const dossier = await mkdtemp(join(tmpdir(), 'decisions-avant-'));
  const archive = execFileSync('git', ['archive', '--format=tar', revision, 'app', 'profils/entreprise/maison.js'], { cwd: RACINE, maxBuffer: 1 << 28 });
  execFileSync('tar', ['-x', '-C', dossier], { input: archive });
  return { app: join(dossier, 'app'), nettoyer: () => rm(dossier, { recursive: true, force: true }) };
}

export function commit(revision) {
  return execFileSync('git', ['rev-parse', '--verify', revision + '^{commit}'], { cwd: RACINE, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === 'capturer') {
  const revision = process.argv[3] || 'origin/main';
  const sha = commit(revision);
  const { app, nettoyer } = await extraire(sha);
  try {
    if (existsSync(join(app, 'decision.js'))) throw new Error(sha + ' porte déjà la fabrique : ce n’est pas un « avant ».');
    const ecrivains = await rejouerTout(app);
    await writeFile(CAPTURE, JSON.stringify({ source: { depot: 'xtincell/la-barre', commit: sha },
      ecrivains }, null, 2) + '\n');
    console.log('Capture écrite depuis ' + sha + ' : ' + Object.keys(ecrivains).length + ' écrivains.');
  } finally { await nettoyer(); }
}
