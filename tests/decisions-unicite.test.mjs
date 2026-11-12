/* L'identifiant d'une décision, unique entre postes, et l'import qui passe par
 * la fabrique.
 *
 * Plusieurs postes écrivent dans la même base de référence. Chacun tire ses
 * identifiants sans voir ceux des autres ; Radar reconnaît une décision à
 * l'instance La Barre et à son identifiant (arbitrage 5.5). Deux décisions au
 * même identifiant étaient écartées de la route Radar, donc perdues pour la
 * mesure, et le rapprochement les fondait champ par champ en une seule.
 *
 * On rejoue ici les vrais modules — outils, rapprochement, dépôt, fabrique —
 * contre un serveur simulé, puis le vrai servir.mjs dans un dossier jetable.
 * Aucune donnée réelle. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash, webcrypto } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';

const APP = new URL('../app/', import.meta.url);
const SOURCES = await Promise.all(['outils.js', 'reconciliation.js', 'depot.js', 'decision.js']
  .map(nom => readFile(new URL(nom, APP), 'utf8')));
const copie = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const revision = x => '"' + createHash('sha256').update(JSON.stringify(x)).digest('hex') + '"';
async function stable() { for (let i = 0; i < 12; i++) await tick(); }

/* La forme neuve : le préfixe, le code du poste, douze caractères tirés. */
const FORME = /^DEC-[0-9a-z]{4}-[0-9a-z]{12}$/;

function memoire(m) {
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

/* Un hasard figé, servi par crypto.getRandomValues. */
function fige(octets) {
  let n = 0;
  return { getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = octets[n++ % octets.length]; return a; } };
}

/* Un poste : un navigateur, avec son stockage, son hasard et, s'il en a un, le
 * serveur de la base de référence. */
function poste({ serveur = null, stockage = new Map(), crypto = webcrypto, demo = null, math = null, reprises = new Map() } = {}) {
  const avis = [];
  const sandbox = { console, Date, Set, Map, Promise, Response,
    location: { protocol: 'http:' }, navigator: { platform: 'Recette' },
    MAISON: { nom: 'Recette', titulaire: 'creation', natures: [{ cle: 'campagne' }] },
    AVIS: { grave: m => avis.push(m), fait: m => avis.push(m), refus: m => avis.push(m) },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: memoire(stockage),
    REPRISES: {
      garder: async (f, v) => { reprises.set(f, copie(v)); }, lire: async f => copie(reprises.get(f)),
      retirer: async f => { reprises.delete(f); }, lister: async () => [], accuser: async () => {},
      archiverAncien: async () => {},
    },
  };
  if (serveur) sandbox.fetch = (chemin, init) => serveur.fetch(chemin, init);
  if (crypto) sandbox.crypto = crypto;
  if (demo) sandbox.LA_BARRE_DEMO = demo;
  if (math) sandbox.Math = math;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const source of SOURCES) vm.runInContext(source, ctx);
  return { ctx, D: ctx.DECISION, depot: ctx.DEPOT, avis, stockage };
}

const geste = extra => ({ objet: 'L-1', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: '',
  quand: '2026-11-12T09:00:00.000Z', qui: 'creation', titre: 'Livrable', ...extra });

/* ————— La forme de l'identifiant ————— */

test('une décision neuve porte le code de son poste et douze caractères tirés au hasard', () => {
  const p = poste();
  const ids = Array.from({ length: 300 }, () => p.D.identifiant());
  for (const id of ids) assert.match(id, FORME);
  assert.equal(new Set(ids).size, ids.length);
  const code = ids[0].split('-')[1];
  assert.ok(ids.every(id => id.split('-')[1] === code), 'un seul code pour le poste');
  assert.equal(p.D.poste(), code);
  assert.equal(p.stockage.get('la-barre-poste'), code, 'le code est gardé dans ce navigateur');
  assert.match(p.D.poser(geste()).id, FORME);
  assert.ok(p.D.FORME.test(ids[0]));
  assert.equal(p.D.FORME.test('DEC-abc123'), false, 'l’ancienne forme reste lisible, mais n’est plus tirée');
});

test('le code du poste se garde d’une ouverture à l’autre, et deux navigateurs ont chacun le leur', () => {
  const stockage = new Map();
  const a = poste({ stockage, crypto: fige([1]) }).D.identifiant();
  const b = poste({ stockage, crypto: fige([7]) }).D.identifiant();
  assert.equal(a, 'DEC-1111-111111111111');
  assert.equal(b, 'DEC-1111-777777777777', 'le second onglet reprend le code gardé');
  const ailleurs = poste({ stockage: new Map(), crypto: fige([2]) }).D.identifiant();
  assert.equal(ailleurs, 'DEC-2222-222222222222');
  /* Un code illisible dans le stockage n'est pas repris : il est remplacé. */
  const abime = new Map([['la-barre-poste', 'Ä?']]);
  assert.equal(poste({ stockage: abime, crypto: fige([3]) }).D.identifiant(), 'DEC-3333-333333333333');
  assert.equal(abime.get('la-barre-poste'), '3333');
});

test('le hasard vient de crypto, sans biais ; Math.random ne sert qu’à défaut', () => {
  let appels = 0;
  const math = Object.create(Math, { random: { value: () => { appels++; return 0.5; } } });
  /* 252 = 7 × 36 : un octet au-delà de 251 est rejeté, chaque caractère garde la même chance. */
  const p = poste({ math, crypto: fige([255, 0, 35]) });
  assert.equal(p.D.identifiant(), 'DEC-0z0z-0z0z0z0z0z0z');
  assert.equal(appels, 0);
  const sans = poste({ math, crypto: null, stockage: new Map() });
  assert.match(sans.D.identifiant(), FORME);
  assert.ok(appels > 0);
});

test('la démonstration tire ses identifiants sans rien écrire dans ce navigateur', () => {
  const stockage = new Map();
  const p = poste({ stockage, demo: { base: 'base-fictive.json' }, crypto: fige([5]) });
  assert.equal(p.depot.estDemonstration(), true);
  assert.equal(p.D.identifiant(), 'DEC-5555-555555555555');
  assert.equal(stockage.size, 0);
});

/* ————— Le rapprochement de deux postes ————— */

function serveurSimule() {
  const s = { value: null, writes: [] };
  s.fetch = async (chemin, init = {}) => {
    if (init.method !== 'PUT') return new Response(JSON.stringify(s.value), { headers: { ETag: revision(s.value) } });
    s.writes.push(copie(init));
    if (init.headers['If-Match'] !== revision(s.value)) return Response.json({ code: 'REVISION_DEPASSEE' }, { status: 409 });
    s.value = JSON.parse(init.body);
    return Response.json({ ok: true, revision: revision(s.value), enregistre_le: s.value.enregistre_le });
  };
  return s;
}

async function deuxPostes() {
  const serveur = serveurSimule();
  const A = poste({ serveur }), B = poste({ serveur });
  serveur.value = copie(A.depot.vide());
  Object.assign(serveur.value, { enregistre_le: '2026-11-12T08:00:00.000Z', rattachement2: true,
    campagnes: [{ id: 'C-1', nom: 'Noël' }],
    projets: [{ id: 'P-1', nom: 'Projet', nature: 'campagne', campagneId: 'C-1', perimetre: { supports: [], marches: [] }, livrables: [{ id: 'L-1' }] }] });
  for (const p of [A, B]) await new Promise(r => p.depot.chargerReference({ reference: 'recette.json' }, r));
  return { serveur, A, B };
}

test('deux postes au même identifiant : la décision locale est renommée et tracée, celle de la base garde le sien', async () => {
  const { serveur, A, B } = await deuxPostes();
  const ID = 'DEC-meme00';
  /* Le poste A enregistre sa décision : elle est dans la base, Radar peut l'avoir lue. */
  const deA = A.D.poser(geste({ id: ID, titre: 'Livrable vu par A' }));
  A.depot.ecrireSurDisque(); await stable();
  const enregistree = copie(serveur.value.decisions[0]);
  assert.equal(enregistree.id, ID);

  /* Le poste B, hors ligne, tire le même identifiant pour une autre décision,
   * puis la cite ailleurs : une décision qui la remplace, la référence d'une campagne. */
  const deB = copie(B.D.poser(geste({ id: ID, verdict: 'retour', motif: 'Le logo est sous la taille minimale', titre: 'Livrable vu par B' })));
  const suite = B.D.poser(geste({ titre: 'Reprise', remplace: ID }));
  B.depot.modifie('campagnes', 'C-1', { referencePiste: { decisionId: ID } });
  B.depot.ecrireSurDisque(); await stable();
  assert.equal(B.depot.conflits().length, 0, 'aucun choix à faire : ce sont deux décisions');
  B.depot.ecrireSurDisque(); await stable();

  const ds = serveur.value.decisions;
  assert.equal(ds.length, 3, 'aucune décision perdue');
  assert.deepEqual(ds[0], enregistree, 'la décision déjà enregistrée garde son identifiant et son contenu');
  const renommee = ds.find(d => d.titre === 'Livrable vu par B');
  assert.match(renommee.id, FORME);
  assert.notEqual(renommee.id, ID);
  assert.equal(renommee.verdict, 'retour');
  assert.deepEqual(Object.keys(renommee.renommage), ['de', 'le', 'raison']);
  assert.equal(renommee.renommage.de, ID);
  assert.match(renommee.renommage.raison, /déjà pris/);
  const { id: _i, renommage: _r, ...contenuB } = renommee;
  const { id: _j, ...contenuAvant } = deB;
  assert.deepEqual(contenuB, contenuAvant, 'le reste de la décision est intact');
  assert.equal(ds.find(d => d.id === suite.id).remplace, renommee.id, 'ce qui la citait la suit');
  assert.equal(serveur.value.campagnes[0].referencePiste.decisionId, renommee.id);
  const journal = serveur.value.journal;
  assert.equal(journal.filter(e => e.type === 'decisions' && e.action === 'création' && e.id === ID).length, 1, 'la ligne du poste A');
  assert.equal(journal.filter(e => e.type === 'decisions' && e.action === 'création' && e.id === renommee.id).length, 1);
  const trace = journal.find(e => e.action === 'renommage');
  assert.equal(trace.type, 'decisions'); assert.equal(trace.id, renommee.id); assert.match(trace.detail, /DEC-meme00/);
  assert.ok(B.avis.some(m => m.includes(ID) && m.includes(renommee.id)), 'le poste le dit');
  assert.equal(deA.id, ID);
  assert.equal(new Set(ds.map(d => d.id)).size, 3);
});

test('une même décision revenue du serveur, même attestée, n’est pas une collision', () => {
  const { D } = poste();
  const d = geste({ id: 'DEC-a', cree_le: '2026-11-12T09:00:01.000Z' });
  const ici = { decisions: [copie(d)], journal: [] };
  const distant = { decisions: [{ ...copie(d), attestation: { par: 'la-fusee', sceau: 'x' } }] };
  const r = D.departager({ decisions: [] }, ici, distant);
  assert.deepEqual(copie(r), { renommees: [], bloquees: [] });
  assert.equal(ici.decisions[0].id, 'DEC-a');
  /* Une décision déjà dans la base commune n'est pas neuve : rien à départager. */
  const r2 = D.departager({ decisions: [copie(d)] }, { decisions: [geste({ id: 'DEC-a', verdict: 'reserve', motif: 'Oui' })] }, distant);
  assert.deepEqual(copie(r2.renommees), []);
});

test('une décision attestée, ou citée par une version de bilan arrêtée, ne se renomme pas : le conflit reste à trancher', () => {
  const { D, ctx } = poste();
  const distant = { decisions: [geste({ id: 'DEC-x', titre: 'Ailleurs' })] };
  const atteste = { decisions: [geste({ id: 'DEC-x', titre: 'Ici', attestation: { par: 'la-fusee', sceau: 'x' } })] };
  const avant = JSON.stringify(atteste);
  let r = D.departager({ decisions: [] }, atteste, distant);
  assert.deepEqual(copie(r.renommees), []);
  assert.deepEqual(copie(r.bloquees).map(b => b.id), ['DEC-x']);
  assert.equal(JSON.stringify(atteste), avant);

  const scelle = { decisions: [geste({ id: 'DEC-x', titre: 'Ici' })],
    campagnes: [{ id: 'C-1', bilanVersions: [{ id: 'BIL-C-1', version: 1, decision: 'DEC-x', empreinte: 'e'.repeat(64) }] }] };
  const avant2 = JSON.stringify(scelle);
  r = D.departager({ decisions: [] }, scelle, distant);
  assert.match(copie(r.bloquees)[0].raison, /bilan/);
  assert.equal(JSON.stringify(scelle), avant2, 'la version arrêtée et la décision restent telles quelles');

  /* Le rapprochement ne fond jamais deux décisions en une : la décision entière est à choisir. */
  const res = ctx.RECONCILIATION.reconcilier({ decisions: [] }, scelle, distant);
  assert.equal(res.conflits.length, 1);
  assert.deepEqual(copie(res.conflits[0].chemin), ['decisions', 'DEC-x']);
  assert.equal(res.conflits[0].ici.titre, 'Ici'); assert.equal(res.conflits[0].distant.titre, 'Ailleurs');
  assert.deepEqual(copie(res.valeur.decisions[0]), copie(scelle.decisions[0]), 'aucune décision mêlée de l’autre');
  const choisie = ctx.RECONCILIATION.reconcilier({ decisions: [] }, scelle, distant, { [res.conflits[0].cle]: 'distant' });
  assert.deepEqual(copie(choisie.valeur.decisions), copie(distant.decisions));
});

/* ————— L'import passe par la fabrique ————— */

const X = geste({ id: 'DEC-x', titre: 'X', cree_le: '2026-11-12T09:00:01.000Z' });
const Y = { titre: 'Y', qui: 'creation', objet: 'L-2', type: 'livrable', projet: 'P-1', verdict: 'hors', motif: 'Hors périmètre',
  quand: '2026-11-12T10:00:00.000Z', id: 'DEC-y', cree_le: '2026-11-12T10:00:01.000Z' };
const fichier = (decisions, extra = {}) => JSON.stringify({ schema: 5, maison: 'Recette', projets: [{ id: 'P-1', nom: 'Projet' }], decisions, ...extra });

test('importer une base dans un poste vide garde chaque décision octet pour octet, dans son ordre', () => {
  const p = poste();
  const decisions = [copie(Y), copie(X), geste({ id: 'DEC-k3f9-0a1b2c3d4e5f', motif: null })];
  const r = p.depot.importer(fichier(decisions));
  assert.equal(JSON.stringify(p.depot.liste('decisions')), JSON.stringify(decisions), 'même forme, même ordre : même empreinte pour Radar');
  assert.deepEqual(copie(r.decisions), { recues: 3, ajoutees: 3, deja: 0, doublons: 0, renommees: [] });
  /* Le même fichier, une seconde fois : rien n'est ajouté. */
  const r2 = p.depot.importer(fichier(decisions));
  assert.deepEqual(copie(r2.decisions), { recues: 3, ajoutees: 0, deja: 3, doublons: 0, renommees: [] });
  assert.equal(JSON.stringify(p.depot.liste('decisions')), JSON.stringify(decisions));
});

test('un import ne retire aucune décision du registre, et renomme celle qui prendrait un identifiant déjà pris', () => {
  const p = poste();
  p.depot.importer(fichier([copie(X), copie(Y)]));
  const registre = copie(p.depot.liste('decisions'));
  /* Un fichier d'un autre poste : son DEC-x n'est pas le nôtre, et il le cite. */
  const autreX = geste({ id: 'DEC-x', titre: 'X ailleurs', verdict: 'retour', motif: 'Pas lisible' });
  const Z = geste({ id: 'DEC-z', titre: 'Z', remplace: 'DEC-x' });
  const r = p.depot.importer(fichier([autreX, Z], { campagnes: [{ id: 'C-1', referencePiste: { decisionId: 'DEC-x' } }] }));
  const ds = copie(p.depot.liste('decisions'));
  assert.deepEqual(ds.slice(0, 2), registre, 'le registre garde ses décisions et leur place');
  assert.equal(ds.length, 4);
  const renommee = ds[2];
  assert.match(renommee.id, FORME);
  assert.equal(renommee.titre, 'X ailleurs');
  assert.equal(renommee.renommage.de, 'DEC-x');
  assert.match(renommee.renommage.raison, /déjà pris/);
  assert.equal(ds[3].remplace, renommee.id, 'ce que le fichier citait suit sa décision');
  assert.equal(p.depot.trouve('campagnes', 'C-1').referencePiste.decisionId, renommee.id);
  assert.deepEqual(copie(r.decisions.renommees), [{ de: 'DEC-x', vers: renommee.id, raison: renommee.renommage.raison }]);
  const trace = p.depot.journal().find(e => e.action === 'renommage');
  assert.equal(trace.id, renommee.id); assert.match(trace.detail, /DEC-x/);
  assert.ok(p.depot.journal().some(e => e.action === 'import' && /2 reçue/.test(e.detail)));
});

test('dans un même fichier : un doublon exact compte une fois, deux décisions au même identifiant sont départagées', () => {
  const p = poste();
  const W = geste({ id: 'DEC-w', titre: 'W' }), autreW = geste({ id: 'DEC-w', titre: 'Autre W', motif: null });
  const sansId = { ...geste({ titre: 'Sans identifiant' }) };
  const r = p.depot.importer(fichier([W, autreW, copie(W), sansId], { campagnes: [{ id: 'C-1', referencePiste: { decisionId: 'DEC-w' } }] }));
  const ds = copie(p.depot.liste('decisions'));
  assert.deepEqual(ds.map(d => d.titre), ['W', 'Autre W', 'Sans identifiant']);
  assert.deepEqual(ds[0], W);
  assert.match(ds[1].id, FORME); assert.equal(ds[1].renommage.de, 'DEC-w'); assert.match(ds[1].renommage.raison, /deux fois/);
  assert.match(ds[2].id, FORME); assert.equal(ds[2].renommage.de, null); assert.match(ds[2].renommage.raison, /sans identifiant/);
  /* Ce que le fichier citait était ambigu : la citation reste sur la première. */
  assert.equal(p.depot.trouve('campagnes', 'C-1').referencePiste.decisionId, 'DEC-w');
  assert.equal(r.decisions.doublons, 1); assert.equal(r.decisions.renommees.length, 2);
});

test('une décision qui ne passe pas les gardes de la fabrique refuse l’import entier : rien n’est écrit', () => {
  const p = poste();
  p.depot.importer(fichier([copie(X)]));
  const avant = JSON.stringify(p.depot.tout()), sauvegarde = p.stockage.get('la-barre');
  const fautifs = [
    [geste({ id: 'DEC-v', verdict: 'valide' }), /Verdict inconnu/],
    [geste({ id: 'DEC-m', verdict: 'hors', motif: '' }), /exige un motif/],
    [geste({ id: 'DEC-q', quand: '12/11/2026' }), /pas datée/],
    [geste({ id: 'DEC-r', projet: undefined }), /incomplète/],
    [geste({ id: 3 }), /Identifiant de décision illisible/],
    ['pas une décision', /n'est pas un objet|est un objet/],
    [geste({ id: 'DEC-e', portee: 'monde', ecart: { de: 'recevabilite', ref: null }, motif: 'Oui' }), /Portée inconnue/],
  ];
  for (const [fautif, motif] of fautifs) {
    assert.throws(() => p.depot.importer(fichier([copie(Y), fautif])),
      e => e.name === 'DecisionRefusee' && motif.test(e.message) && /n° 2/.test(e.message), String(motif));
    assert.equal(JSON.stringify(p.depot.tout()), avant);
    assert.equal(p.stockage.get('la-barre'), sauvegarde);
  }
  assert.throws(() => p.depot.importer(JSON.stringify({ schema: 5, decisions: {} })), /décisions du fichier est illisible/);
  assert.equal(JSON.stringify(p.depot.tout()), avant);
});

test('une décision attestée s’importe telle quelle, mais ne se renomme pas', () => {
  const p = poste();
  const attestation = { par: 'la-fusee', userId: 'u', nom: 'Alice', at: '2026-11-12T09:00:02.000Z', empreinte: 'e'.repeat(64), sceau: 's'.repeat(64) };
  const attestee = { ...copie(Y), attestation };
  p.depot.importer(fichier([copie(X), attestee]));
  assert.deepEqual(copie(p.depot.trouve('decisions', 'DEC-y')), attestee);
  const avant = JSON.stringify(p.depot.tout());
  assert.throws(() => p.depot.importer(fichier([{ ...geste({ id: 'DEC-x', titre: 'Autre' }), attestation }])),
    { name: 'DecisionRefusee', message: /attestée/ });
  /* Ni une décision que cite une version de bilan arrêtée : la version est scellée par son empreinte. */
  assert.throws(() => p.depot.importer(fichier([geste({ id: 'DEC-x', titre: 'Autre' })],
    { campagnes: [{ id: 'C-1', bilanVersions: [{ id: 'BIL-C-1', version: 1, decision: 'DEC-x', empreinte: 'e'.repeat(64) }] }] })),
  { name: 'DecisionRefusee', message: /bilan/ });
  assert.equal(JSON.stringify(p.depot.tout()), avant);
});

/* ————— Le serveur, dernier garde ————— */

const serveurs = [];
after(async () => {
  for (const s of serveurs) {
    if (s.child.exitCode === null) { s.child.kill(); await once(s.child, 'exit'); }
    await rm(s.root, { recursive: true, force: true });
  }
});

async function lancer() {
  const root = await mkdtemp(join(tmpdir(), 'la-barre-unicite-'));
  await mkdir(join(root, 'depots'));
  await copyFile(new URL('../servir.mjs', import.meta.url), join(root, 'servir.mjs'));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(r => reservation.close(r));
  const child = spawn(process.execPath, [join(root, 'servir.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  await once(child.stdout, 'data');
  const s = { root, child, origin: 'http://127.0.0.1:' + port };
  serveurs.push(s);
  return s;
}

test('le serveur refuse une base qui donnerait un identifiant à deux décisions, ou remplacerait une décision enregistrée', async () => {
  const s = await lancer();
  const url = s.origin + '/depots/base.json';
  const base = { schema: 5, enregistre_le: '2026-11-12T08:00:00.000Z', decisions: [copie(X), copie(Y)] };
  await writeFile(join(s.root, 'depots', 'base.json'), JSON.stringify(base));
  const ecrire = async (donnees, entetes) => {
    const lu = await fetch(url);
    return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': lu.headers.get('etag'), ...entetes },
      body: JSON.stringify(donnees) });
  };
  const brut = () => readFile(join(s.root, 'depots', 'base.json'), 'utf8');
  const avant = await brut();

  let r = await ecrire({ ...base, decisions: [...base.decisions, geste({ id: 'DEC-x', titre: 'Autre X' })] });
  assert.equal(r.status, 422);
  let corps = await r.json();
  assert.equal(corps.code, 'DECISION_EN_DOUBLE'); assert.deepEqual(corps.identifiants, ['DEC-x']); assert.match(corps.quoi, /DEC-x/);
  assert.equal(await brut(), avant);

  r = await ecrire({ ...base, decisions: [{ ...copie(X), verdict: 'hors', motif: 'Réécrite' }, copie(Y)] });
  assert.equal(r.status, 422);
  corps = await r.json();
  assert.equal(corps.code, 'DECISION_REMPLACEE'); assert.deepEqual(corps.identifiants, ['DEC-x']);
  assert.equal(await brut(), avant);

  /* Ce qui reste permis : ajouter une décision, recevoir une attestation, ordonner autrement les clés. */
  const { titre, ...reste } = copie(Y);
  const permis = { ...base, decisions: [{ ...copie(X), attestation: { par: 'la-fusee', sceau: 's' } }, { ...reste, titre },
    geste({ id: 'DEC-k3f9-0a1b2c3d4e5f' })] };
  assert.equal((await ecrire(permis)).status, 200);

  /* Une base qui porte déjà un doublon reste inscriptible ; on ne refuse que ce que l'écriture ajoute. */
  const legs = { ...permis, decisions: [...permis.decisions, geste({ id: 'DEC-k3f9-0a1b2c3d4e5f', titre: 'Ancien doublon' })] };
  await writeFile(join(s.root, 'depots', 'base.json'), JSON.stringify(legs));
  assert.equal((await ecrire({ ...legs, enregistre_le: '2026-11-12T09:00:00.000Z' })).status, 200);
  r = await ecrire({ ...legs, decisions: [...legs.decisions, geste({ id: 'DEC-k3f9-0a1b2c3d4e5f', titre: 'Troisième' })] });
  assert.equal(r.status, 422);

  /* Une création ne peut pas non plus naître avec un doublon. */
  r = await fetch(s.origin + '/depots/neuve.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify({ schema: 5, decisions: [copie(X), geste({ id: 'DEC-x', titre: 'Autre' })] }) });
  assert.equal(r.status, 422);
  assert.equal((await fetch(s.origin + '/depots/neuve.json')).status, 404);
});
