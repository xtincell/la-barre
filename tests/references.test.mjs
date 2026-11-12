/* La référence humaine d'un projet, attribuée par le serveur au premier
 * enregistrement (décision du propriétaire, 12 novembre 2026, option 3).
 *
 * Quatre écrans tiraient `ref` sur le poste : le nombre de projets plus un, ou
 * le plus grand numéro plus un. Deux postes ouvraient le même MT-…, et un seul
 * poste pouvait retomber sur une référence existante. Désormais le poste
 * demande une référence (un préfixe, ou une référence saisie), l'écran la
 * montre provisoire, et servir.mjs attribue le numéro suivant, unique dans la
 * base de référence, au premier enregistrement. Une référence attribuée ne
 * change plus jamais. Sans base de référence (navigateur seul, démonstration),
 * la base du poste est la référence : il attribue lui-même, avec la même règle.
 *
 * On rejoue les vrais modules contre le vrai servir.mjs, dans un dossier
 * jetable. Aucune donnée réelle. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { webcrypto } from 'node:crypto';
import { bac, semer, PERSONNES } from './decisions-scenarios.mjs';

const APP = new URL('../app/', import.meta.url);
const SOURCES = await Promise.all(['outils.js', 'reconciliation.js', 'depot.js', 'decision.js']
  .map(nom => readFile(new URL(nom, APP), 'utf8')));
const copie = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
/* Le chemin d'un 409 rapproche puis attend le geste suivant : on attend ce
 * qui se voit, borné, plutôt qu'un rappel qui ne viendrait pas. */
async function attendre(condition, ms = 4000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (condition()) return true; await new Promise(r => setTimeout(r, 10)); }
  return false;
}
const PROVISOIRE = /\(provisoire\)$/;

/* ————— Le vrai serveur, dans un dossier jetable ————— */

const serveurs = [];
after(async () => {
  for (const s of serveurs) {
    if (s.child.exitCode === null) { s.child.kill(); await once(s.child, 'exit'); }
    await rm(s.root, { recursive: true, force: true });
  }
});
async function lancer() {
  const root = await mkdtemp(join(tmpdir(), 'la-barre-references-'));
  await mkdir(join(root, 'depots'));
  await copyFile(new URL('../servir.mjs', import.meta.url), join(root, 'servir.mjs'));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(r => reservation.close(r));
  const child = spawn(process.execPath, [join(root, 'servir.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await once(child.stdout, 'data');
  const s = { root, child, origin: 'http://127.0.0.1:' + port, url: 'http://127.0.0.1:' + port + '/depots/recette.json' };
  s.brut = () => readFile(join(root, 'depots', 'recette.json'), 'utf8');
  s.lire = async () => JSON.parse(await s.brut());
  s.poser = async base => {
    await writeFile(join(root, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'recette.json' }));
    await writeFile(join(root, 'depots', 'recette.json'), JSON.stringify(base));
  };
  s.ecrire = async donnees => {
    const lu = await fetch(s.url);
    return fetch(s.url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': lu.headers.get('etag') },
      body: typeof donnees === 'string' ? donnees : JSON.stringify(donnees) });
  };
  serveurs.push(s);
  return s;
}

const NE = '2026-11-01T08:00:00.000Z';
function baseRecette() {
  return { schema: 5, maison: 'Recette', enregistre_le: '2026-11-12T08:00:00.000Z', rattachement2: true,
    decisions: [], journal: [], campagnes: [{ id: 'C-1', nom: 'Noël', marches: [], marqueIds: [] }],
    projets: [
      { id: 'P-1', ref: 'MT-0007', nom: 'Sept', cree_le: NE, livrables: [] },
      { id: 'P-2', ref: 'XC-012', nom: 'Corpus', cree_le: NE, livrables: [] },
      { id: 'P-3', ref: 'ORV-2026-01', nom: 'Démonstration', cree_le: NE, livrables: [] },
      { id: 'P-4', ref: 'PRJ-0002', nom: 'Saisi à la création', cree_le: NE, livrables: [] },
      { id: 'P-5', nom: 'Sans référence', cree_le: NE, livrables: [] },
    ] };
}

/* ————— Un poste ————— */

function memoire(m) {
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
function poste({ serveur = null, demo = null, stockage = new Map() } = {}) {
  const avis = [];
  const sandbox = { console, Date, Set, Map, Promise, Response, crypto: webcrypto,
    location: { protocol: 'http:', hash: '' }, navigator: { platform: 'Recette' },
    MAISON: { nom: 'Recette', titulaire: 'creation', natures: [{ cle: 'campagne' }] },
    AVIS: { grave: m => avis.push(m), fait: m => avis.push(m), refus: m => avis.push(m) },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: memoire(stockage),
    REPRISES: { garder: async () => {}, lire: async () => null, retirer: async () => {}, lister: async () => [],
      accuser: async () => {}, archiverAncien: async () => {} },
  };
  /* Le chemin relatif du navigateur, servi par le vrai serveur. `perdre` jette
   * la réponse du prochain PUT après qu'il a été reçu : une réponse perdue. */
  const reseau = { perdre: false };
  if (serveur) {
    sandbox.fetch = async (chemin, init) => {
      const r = await fetch(serveur.origin + '/' + chemin, init);
      if (init && init.method === 'PUT' && reseau.perdre) { reseau.perdre = false; throw new TypeError('réponse perdue'); }
      return r;
    };
  }
  if (demo) sandbox.LA_BARRE_DEMO = demo;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const source of SOURCES) vm.runInContext(source, ctx);
  return { ctx, depot: ctx.DEPOT, O: ctx.O, avis, reseau, stockage };
}
async function brancher(s) {
  const p = poste({ serveur: s });
  await new Promise(r => p.depot.chargerReference({ reference: 'recette.json' }, r));
  return p;
}
const sauver = p => Promise.race([new Promise(r => p.depot.ecrireSurDisque((ok, pourquoi) => r({ ok, pourquoi }))),
  new Promise(r => setTimeout(() => r({ ok: 'sans réponse' }), 4000))]);
const projetNeuf = (p, prefixe, saisie, nom) => p.depot.ajoute('projets',
  Object.assign(p.depot.referenceNeuve(prefixe, saisie), { nom, cree_le: '2026-11-12T09:00:00.000Z', livrables: [] }));

/* ————— Au premier enregistrement ————— */

test('le serveur attribue au premier enregistrement la référence suivante de son préfixe, et le poste la reçoit', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const A = await brancher(s);
  const mt = projetNeuf(A, 'MT', null, 'Ouvert depuis la boîte');
  const prj = projetNeuf(A, 'PRJ', null, 'Nouveau projet');
  const saisi = projetNeuf(A, 'PRJ', 'CLI-2026-07', 'Référence du client');
  /* Avant l'enregistrement : provisoire, à l'écran comme au dépôt. */
  assert.match(mt.ref, PROVISOIRE); assert.match(mt.ref, /^MT-/);
  assert.deepEqual(copie(mt.refDemandee), { prefixe: 'MT' });
  assert.deepEqual(copie(saisi.refDemandee), { prefixe: 'PRJ', saisie: 'CLI-2026-07' });
  assert.equal(saisi.ref, 'CLI-2026-07 (provisoire)');
  for (const p of [mt, prj, saisi]) assert.equal(A.depot.referenceAttribuee(p), null);

  assert.deepEqual(await sauver(A), { ok: true, pourquoi: undefined });
  const lu = await s.lire();
  const ref = id => lu.projets.find(p => p.id === id);
  assert.equal(ref(mt.id).ref, 'MT-0008', 'le numéro suivant du préfixe, unique dans la base');
  assert.equal(ref(prj.id).ref, 'PRJ-0003');
  assert.equal(ref(saisi.id).ref, 'CLI-2026-07', 'une référence saisie libre est gardée telle quelle');
  for (const id of [mt.id, prj.id, saisi.id]) assert.equal('refDemandee' in ref(id), false);
  assert.deepEqual(lu.projets.slice(0, 5).map(p => p.ref), ['MT-0007', 'XC-012', 'ORV-2026-01', 'PRJ-0002', undefined],
    'les références déjà présentes restent, aucune n’est donnée à un projet qui n’en demandait pas');

  /* Le poste a reçu les références avec le reçu : l'écran les montre, sans provisoire. */
  assert.equal(A.depot.trouve('projets', mt.id).ref, 'MT-0008');
  assert.equal(A.depot.referenceAttribuee(A.depot.trouve('projets', mt.id)), 'MT-0008');
  assert.equal('refDemandee' in A.depot.trouve('projets', mt.id), false);
  assert.ok(A.avis.some(m => m.includes('MT-0008')), 'l’écran le dit');
  /* La règle est la même des deux côtés : celle du poste aurait donné le même numéro. */
  assert.equal(A.O.referenceSuivante('MT', new Set(['MT-0007', 'XC-012', 'ORV-2026-01', 'PRJ-0002'])), 'MT-0008');

  /* Le poste et le fichier s'accordent : le geste suivant s'enregistre sans rapprochement. */
  A.depot.modifie('projets', mt.id, { nom: 'Renommé' });
  assert.deepEqual(await sauver(A), { ok: true, pourquoi: undefined });
  assert.equal((await s.lire()).projets.find(p => p.id === mt.id).nom, 'Renommé');
  assert.equal(A.depot.conflits().length, 0);
});

test('deux projets ouverts sur deux postes depuis la même campagne reçoivent deux références', async () => {
  const s = await lancer();
  const base = baseRecette();
  await s.poser(base);
  const A = await brancher(s), B = await brancher(s);
  projetNeuf(A, 'MT', null, 'De A');
  projetNeuf(B, 'MT', null, 'De B');
  assert.equal((await sauver(A)).ok, true);
  B.depot.ecrireSurDisque();
  assert.ok(await attendre(() => B.depot.liste('projets').some(p => p.nom === 'De A')), 'B a relu la base et rapproché');
  assert.equal(B.depot.conflits().length, 0);
  assert.equal((await sauver(B)).ok, true);
  const lu = await s.lire();
  assert.deepEqual(lu.projets.slice(5).map(p => [p.nom, p.ref]), [['De A', 'MT-0008'], ['De B', 'MT-0009']]);
  assert.equal(B.depot.liste('projets').find(p => p.nom === 'De B').ref, 'MT-0009');
});

test('une réponse perdue : le poste reprend la référence attribuée, sans conflit ni doublon', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const A = await brancher(s);
  const p = projetNeuf(A, 'MT', null, 'Perdu en route');
  A.reseau.perdre = true;
  assert.equal((await sauver(A)).ok, false);
  assert.equal((await s.lire()).projets.find(x => x.id === p.id).ref, 'MT-0008', 'le serveur l’a reçu et attribué');
  assert.match(A.depot.trouve('projets', p.id).ref, PROVISOIRE, 'le poste ne le sait pas encore');
  /* Un autre geste, pendant ce temps : il se réunit au rapprochement. */
  A.depot.modifie('projets', 'P-5', { nom: 'Corrigé entre-temps' });
  A.depot.ecrireSurDisque();
  await attendre(() => A.depot.trouve('projets', p.id).ref === 'MT-0008' || A.depot.conflits().length > 0);
  assert.equal(A.depot.conflits().length, 0, 'la référence attribuée est reprise, pas mise en conflit');
  assert.equal((await sauver(A)).ok, true);
  const lu = await s.lire();
  assert.deepEqual(lu.projets.filter(x => x.id === p.id).map(x => [x.ref, x.nom]), [['MT-0008', 'Perdu en route']]);
  assert.equal(lu.projets.find(x => x.id === 'P-5').nom, 'Corrigé entre-temps');
  assert.equal(A.depot.trouve('projets', p.id).ref, 'MT-0008');
  assert.equal('refDemandee' in A.depot.trouve('projets', p.id), false);
});

test('deux références demandées dans un même enregistrement reçoivent deux numéros, dans l’ordre', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const b = baseRecette();
  b.projets.push({ id: 'P-6', ref: 'MT-… (provisoire)', refDemandee: { prefixe: 'MT' }, nom: 'Six', cree_le: NE },
    { id: 'P-7', ref: 'MT-… (provisoire)', refDemandee: { prefixe: 'MT' }, nom: 'Sept bis', cree_le: NE });
  const r = await s.ecrire(b);
  assert.equal(r.status, 200);
  const recu = await r.json();
  assert.deepEqual(recu.references, [{ projet: 'P-6', ref: 'MT-0008' }, { projet: 'P-7', ref: 'MT-0009' }]);
  const lu = await fetch(s.url);
  assert.equal(lu.headers.get('etag'), recu.revision, 'la révision rendue est celle du fichier écrit');
  assert.deepEqual((await lu.json()).projets.slice(5).map(p => p.ref), ['MT-0008', 'MT-0009']);
});

test('sans référence à attribuer, la base s’écrit octet pour octet', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const b = baseRecette(); b.projets[4].nom = 'Toujours sans référence';
  const corps = JSON.stringify(b);
  const r = await s.ecrire(corps);
  assert.equal(r.status, 200);
  assert.equal('references' in await r.json(), false);
  assert.equal(await s.brut(), corps);
});

test('une référence attribuée ne change plus jamais : le serveur refuse, rien n’est écrit', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const avant = await s.brut();
  const cas = [
    b => { b.projets[0].ref = 'MT-0099'; },
    b => { delete b.projets[0].ref; },
    b => { b.projets[0].ref = 'MT-… (provisoire)'; b.projets[0].refDemandee = { prefixe: 'MT' }; },
  ];
  for (const changer of cas) {
    const b = baseRecette(); changer(b);
    const r = await s.ecrire(b);
    assert.equal(r.status, 422);
    const corps = await r.json();
    assert.equal(corps.code, 'REFERENCE_CHANGEE'); assert.deepEqual(corps.identifiants, ['P-1']);
    assert.match(corps.quoi, /MT-0007/);
    assert.equal(await s.brut(), avant);
  }
});

test('une référence saisie, ou posée sans demande, déjà prise par un autre projet est refusée : rien n’est écrit', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const avant = await s.brut();
  const cas = [
    { id: 'P-6', ref: 'MT-0007 (provisoire)', refDemandee: { saisie: 'MT-0007' }, nom: 'Saisi', cree_le: NE },
    { id: 'P-6', ref: 'XC-012', nom: 'Ancien poste', cree_le: NE },
  ];
  for (const projet of cas) {
    const b = baseRecette(); b.projets.push(projet);
    const r = await s.ecrire(b);
    assert.equal(r.status, 422);
    const corps = await r.json();
    assert.equal(corps.code, 'REFERENCE_PRISE'); assert.deepEqual(corps.identifiants, ['P-6']);
    assert.match(corps.quoi, projet.refDemandee ? /MT-0007/ : /XC-012/);
    assert.equal(await s.brut(), avant);
  }
  /* Deux saisies identiques dans le même enregistrement : la seconde est prise. */
  const b = baseRecette();
  b.projets.push({ id: 'P-6', ref: 'A (provisoire)', refDemandee: { saisie: 'CLI-1' }, cree_le: NE },
    { id: 'P-7', ref: 'B (provisoire)', refDemandee: { saisie: 'CLI-1' }, cree_le: NE });
  const r = await s.ecrire(b);
  assert.equal(r.status, 422); assert.deepEqual((await r.json()).identifiants, ['P-7']);
  /* Une base qui porte déjà deux fois la même référence reste inscriptible ; seul ce qu'on ajoute est refusé. */
  const legs = baseRecette(); legs.projets.push({ id: 'P-6', ref: 'MT-0007', nom: 'Doublon ancien', cree_le: NE });
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify(legs));
  assert.equal((await s.ecrire({ ...legs, enregistre_le: '2026-11-12T09:00:00.000Z' })).status, 200);
  const encore = { ...legs, projets: [...legs.projets, { id: 'P-7', ref: 'MT-0007', cree_le: NE }] };
  assert.equal((await s.ecrire(encore)).status, 422);
});

test('une demande de référence illisible est refusée', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  for (const refDemandee of [{ prefixe: 'M T' }, { prefixe: '' }, { saisie: '   ' }, 'MT', { prefixe: 'M T', saisie: 'X' }, { saisie: 'x'.repeat(61) }]) {
    const b = baseRecette(); b.projets.push({ id: 'P-6', ref: 'x', refDemandee, cree_le: NE });
    const r = await s.ecrire(b);
    assert.equal(r.status, 422, JSON.stringify(refDemandee));
    assert.equal((await r.json()).code, 'REFERENCE_ILLISIBLE');
  }
});

/* ————— Sur le poste ————— */

test('une référence saisie que ce poste voit déjà prise est refusée dès la création', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const A = await brancher(s);
  assert.throws(() => A.depot.referenceNeuve('PRJ', 'MT-0007'), /MT-0007/);
  assert.throws(() => A.depot.referenceNeuve('M T'), /préfixe/i);
  assert.equal(A.depot.liste('projets').length, 5);
});

test('tant qu’elle est provisoire, la référence demandée se change ; attribuée, elle ne se change plus', async () => {
  const s = await lancer();
  await s.poser(baseRecette());
  const A = await brancher(s);
  const p = projetNeuf(A, 'PRJ', 'CLI-1', 'Saisi trop vite');
  A.depot.redemanderReference(p, 'CLI-2');
  assert.deepEqual(copie(p.refDemandee), { prefixe: 'PRJ', saisie: 'CLI-2' }); assert.equal(p.ref, 'CLI-2 (provisoire)');
  A.depot.redemanderReference(p, '');
  assert.deepEqual(copie(p.refDemandee), { prefixe: 'PRJ' }, 'vide : le serveur attribue le numéro suivant du préfixe');
  assert.throws(() => A.depot.redemanderReference(p, 'MT-0007'), /MT-0007/);
  assert.equal((await sauver(A)).ok, true);
  assert.equal(p.ref, 'PRJ-0003');
  assert.throws(() => A.depot.redemanderReference(p, 'CLI-3'), /attribuée/);
});

test('sans base de référence, navigateur seul ou démonstration, le poste attribue la référence lui-même, avec la même règle', () => {
  for (const options of [{}, { demo: { base: 'base-fictive.json' } }]) {
    const P = poste(options);
    Object.assign(P.depot.tout(), { projets: copie(baseRecette().projets) });
    const p = projetNeuf(P, 'MT', null, 'Hors ligne');
    assert.equal(p.ref, 'MT-0008');
    assert.equal('refDemandee' in p, false);
    assert.equal(P.depot.referenceAttribuee(p), 'MT-0008');
    assert.equal(projetNeuf(P, 'PRJ', 'CLI-9', 'Saisi').ref, 'CLI-9');
    assert.throws(() => P.depot.referenceNeuve('PRJ', 'CLI-9'), /CLI-9/);
  }
  /* Une base déjà rattachée à un fichier servi continue de demander, même si le
   * serveur ne répond pas au chargement : attribuer ici ferait deux références. */
  const P = poste();
  Object.assign(P.depot.tout(), { reference: 'recette.json', projets: copie(baseRecette().projets) });
  const p = projetNeuf(P, 'MT', null, 'Serveur injoignable');
  assert.deepEqual(copie(p.refDemandee), { prefixe: 'MT' });
  assert.match(p.ref, PROVISOIRE);
});

/* ————— Ce qui part chez le client ————— */

test('tant que la référence est provisoire, ni le manifeste de remise, ni l’étude, ni l’export des écarts ne partent', async () => {
  const s = await bac(fileURLToPath(APP), 3);
  for (const nom of ['remise', 'etude', 'ecarts-marche']) await s.charger(nom);
  const enAttente = { id: 'P-x', ref: 'MT-… (provisoire)', refDemandee: { prefixe: 'MT' }, nom: 'En attente',
    cree_le: NE, sections: { identite: {} }, perimetre: { supports: [], marches: [] }, livrables: [] };
  semer(s.ctx, { personnes: PERSONNES, projets: [enAttente] });
  const p = s.ctx.DEPOT.trouve('projets', 'P-x');
  s.ctx.REMISE.ouvrir(p);
  s.ctx.ETUDE.exporter(p, {});
  assert.equal(s.refus.length, 2);
  for (const m of s.refus) assert.match(m, /référence/);
  assert.throws(() => s.ctx.ECARTS_MARCHE.exporter(p), /référence/);
  assert.equal(s.panneaux.length, 0, 'aucun panneau de remise ouvert');
});
