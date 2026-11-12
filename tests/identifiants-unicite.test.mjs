/* L'identifiant d'un projet et d'un livrable, unique entre postes.
 *
 * Plusieurs postes écrivent dans la même base de référence. La décision a son
 * identifiant unique depuis la-barre#26 (decisions-unicite.test.mjs) ; le
 * projet et le livrable tiraient encore un préfixe et six caractères de
 * Math.random. Deux postes pouvaient tirer le même, le rapprochement fondait
 * alors deux projets (ou deux livrables) champ par champ, et le serveur
 * acceptait une base qui en dupliquait un ou en remplaçait un autre.
 *
 * On rejoue les vrais modules — outils, rapprochement, dépôt, fabrique, KV,
 * écran des projets — contre un serveur simulé, puis le vrai servir.mjs dans un
 * dossier jetable. Aucune donnée réelle. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, readdir, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash, webcrypto } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';
import { bac, semer, PERSONNES } from './decisions-scenarios.mjs';

const APP = new URL('../app/', import.meta.url);
const RACINE = fileURLToPath(new URL('../', import.meta.url));
const SOURCES = await Promise.all(['outils.js', 'reconciliation.js', 'depot.js', 'decision.js']
  .map(nom => readFile(new URL(nom, APP), 'utf8')));
const PROJETS = await readFile(new URL('vue-projets.js', APP), 'utf8');
const copie = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const revision = x => '"' + createHash('sha256').update(JSON.stringify(x)).digest('hex') + '"';
async function stable() { for (let i = 0; i < 12; i++) await tick(); }

/* La forme neuve : le préfixe de l'objet, le code du poste, douze caractères. */
const FORME = {
  PRO: /^PRO-[0-9a-z]{4}-[0-9a-z]{12}$/,
  L: /^L-[0-9a-z]{4}-[0-9a-z]{12}$/,
  KV: /^KV-[0-9a-z]{4}-[0-9a-z]{12}$/,
};

function memoire(m) {
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
function fige(octets) {
  let n = 0;
  return { getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = octets[n++ % octets.length]; return a; } };
}

/* L'écran des projets, rendu joignable pour ouvrir un projet depuis sa campagne. */
function exposer(source, noms) {
  const i = source.lastIndexOf('\n  return {');
  return source.slice(0, i) + '\n  globalThis.__INTERNE__ = { ' + noms.map(n => n + ': ' + n).join(', ') + ' };' + source.slice(i);
}

function poste({ serveur = null, stockage = new Map(), crypto = webcrypto, ecrans = false } = {}) {
  const avis = [];
  const sandbox = { console, Date, Set, Map, Promise, Response,
    location: { protocol: 'http:', hash: '' }, navigator: { platform: 'Recette' },
    MAISON: { nom: 'Recette', titulaire: 'creation', natures: [{ cle: 'campagne' }] },
    AVIS: { grave: m => avis.push(m), fait: m => avis.push(m), refus: m => avis.push(m) },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: memoire(stockage),
    REPRISES: {
      garder: async () => {}, lire: async () => null, retirer: async () => {}, lister: async () => [],
      accuser: async () => {}, archiverAncien: async () => {},
    },
  };
  if (serveur) sandbox.fetch = (chemin, init) => serveur.fetch(chemin, init);
  if (crypto) sandbox.crypto = crypto;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const source of SOURCES) vm.runInContext(source, ctx);
  let ecran = null;
  if (ecrans) {
    vm.runInContext(exposer(PROJETS, ['ouvrirDepuisCampagne']), ctx);
    ecran = ctx.__INTERNE__; delete ctx.__INTERNE__;
  }
  return { ctx, D: ctx.DECISION, R: ctx.RECONCILIATION, depot: ctx.DEPOT, avis, stockage, ecran };
}

const geste = extra => ({ objet: 'L-1', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: '',
  quand: '2026-11-12T09:00:00.000Z', qui: 'creation', titre: 'Livrable', ...extra });

/* ————— La forme de l'identifiant ————— */

test('un projet neuf porte le code de son poste et douze caractères, comme une décision, et sa date de naissance', () => {
  const p = poste();
  const projet = p.depot.ajoute('projets', { nom: 'Projet neuf', livrables: [] });
  assert.match(projet.id, FORME.PRO);
  assert.equal(projet.id.split('-')[1], p.D.poste(), 'un seul code par poste, celui des décisions');
  assert.equal(p.stockage.get('la-barre-poste'), p.D.poste());
  assert.ok(!Number.isNaN(Date.parse(projet.cree_le)));
  const ids = Array.from({ length: 200 }, () => p.depot.identifiant('L'));
  for (const id of ids) assert.match(id, FORME.L);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(p.depot.identifiant('KV'), FORME.KV);
});

test('un identifiant déjà porté par un projet ou un livrable de la base n’est jamais tiré', () => {
  /* Le premier tirage tombe sur un livrable existant : le second est rendu. */
  const octets = [1, 1, 1, 1, ...Array(12).fill(1), ...Array(12).fill(2)];
  const p = poste({ crypto: fige(octets) });
  p.depot.tout().projets.push({ id: 'P-1', livrables: [{ id: 'L-1111-111111111111' }] });
  assert.equal(p.depot.identifiant('L'), 'L-1111-222222222222');
  const q = poste({ crypto: fige(octets) });
  q.depot.tout().projets.push({ id: 'PRO-1111-111111111111', livrables: [] });
  assert.equal(q.depot.ajoute('projets', { nom: 'Second' }).id, 'PRO-1111-222222222222');
});

test('un KV naît avec un identifiant unique entre postes et sa date de naissance', async () => {
  const s = await bac(fileURLToPath(APP), 7);
  await s.charger('kv-modele');
  s.ctx.IMAGE = { vignette: () => null, bouton: () => null };
  semer(s.ctx, { personnes: PERSONNES, supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual', type: 'kv' }],
    marches: [{ id: 'M-GH', code: 'GH', nom: 'Ghana', langues: ['en'], sku: [], mentions: [] }],
    projets: [{ id: 'P-1', ref: 'LUM-001', nom: 'Lumen', cree_le: '2026-11-01T08:00:00.000Z',
      sections: { pistes: [] }, perimetre: { supports: ['S-kv'], marches: ['M-GH'] }, volets: [], livrables: [] }] });
  const p = s.ctx.DEPOT.trouve('projets', 'P-1');
  const master = s.ctx.KV.creer(p, null, null, 'maitre');
  const adaptation = s.ctx.KV.creer(p, 'M-GH', master, 'adaptation');
  for (const l of [master, adaptation]) {
    assert.match(l.id, FORME.KV);
    assert.ok(!Number.isNaN(Date.parse(l.cree_le)), 'sa date de naissance');
  }
  assert.equal(adaptation.maitre, master.id);
});

test('aucun livrable ne naît plus d’un préfixe et six caractères tirés par Math.random', async () => {
  const fichiers = [];
  for (const e of await readdir(join(RACINE, 'app'))) if (e.endsWith('.js')) fichiers.push(join(RACINE, 'app', e));
  fichiers.push(join(RACINE, 'outils', 'vitrine-base.mjs'));
  const restants = [];
  for (const f of fichiers) {
    for (const m of (await readFile(f, 'utf8')).matchAll(/O\.id\(\s*["'`](L|KV|PRJ|PRO)["'`]\s*\)/g)) restants.push(f.slice(RACINE.length) + ' : ' + m[0]);
  }
  assert.deepEqual(restants, []);
});

/* ————— Le rapprochement de deux postes ————— */

function serveurSimule() {
  const s = { value: null };
  s.fetch = async (chemin, init = {}) => {
    if (init.method !== 'PUT') return new Response(JSON.stringify(s.value), { headers: { ETag: revision(s.value) } });
    if (init.headers['If-Match'] !== revision(s.value)) return Response.json({ code: 'REVISION_DEPASSEE' }, { status: 409 });
    s.value = JSON.parse(init.body);
    return Response.json({ ok: true, revision: revision(s.value), enregistre_le: s.value.enregistre_le });
  };
  return s;
}

async function deuxPostes(options = {}) {
  const serveur = serveurSimule();
  const A = poste({ serveur, ...options }), B = poste({ serveur, ...options });
  serveur.value = copie(A.depot.vide());
  Object.assign(serveur.value, { enregistre_le: '2026-11-12T08:00:00.000Z', rattachement2: true,
    campagnes: [{ id: 'C-1', nom: 'Noël', marches: [], marqueIds: [] }],
    projets: [{ id: 'P-1', ref: 'MT-0001', nom: 'Projet', nature: 'campagne', campagneId: 'C-1', cree_le: '2026-11-01T08:00:00.000Z',
      perimetre: { supports: [], marches: [] }, livrables: [{ id: 'L-1', nom: 'KV', cree_le: '2026-11-01T08:00:00.000Z' }] }] });
  for (const p of [A, B]) await new Promise(r => p.depot.chargerReference({ reference: 'recette.json' }, r));
  return { serveur, A, B };
}
async function sauver(p) { p.depot.ecrireSurDisque(); await stable(); }
const CLES_PROJET = ['id', 'ref', 'nom', 'cree_le', 'livrables'];
const tel = (o, cles) => Object.fromEntries(cles.map(k => [k, copie(o[k])]));

test('deux postes au même identifiant de projet : le projet local est renommé, ce qui le cite le suit, celui de la base garde le sien', async () => {
  const { serveur, A, B } = await deuxPostes();
  const ID = 'PRO-meme00';
  A.depot.ajoute('projets', { id: ID, ref: 'MT-0002', nom: 'Projet de A', cree_le: '2026-11-12T09:00:00.000Z', livrables: [] });
  await sauver(A);
  const enregistre = copie(serveur.value.projets.find(p => p.id === ID));
  assert.equal(enregistre.nom, 'Projet de A');

  /* Le poste B, hors ligne, tire le même identifiant pour un autre projet, et
   * le cite : une décision, un retour, un écart écarté et sa décision, un blocage. */
  B.depot.ajoute('projets', { id: ID, ref: 'MT-0002', nom: 'Projet de B', cree_le: '2026-11-12T09:05:00.000Z', campagneId: 'C-1',
    livrables: [{ id: 'L-b1', nom: 'Affiche', cree_le: '2026-11-12T09:05:01.000Z' }] });
  const verdict = B.D.poser(geste({ objet: 'L-b1', projet: ID, titre: 'Affiche de B' }));
  B.depot.ajoute('feedbacks', { projet: ID, cibles: ['L-b1'], texte: 'Plus grand', issue: 'ouvert' });
  const cle = ID + '|L-b1|agence|Annotation ouverte';
  const ecarte = B.D.poser({ objet: cle, type: 'ecart', projet: ID, verdict: 'hors', motif: 'Déjà traité',
    quand: '2026-11-12T09:06:00.000Z', qui: 'creation', titre: 'Annotation ouverte' });
  B.depot.tout().ecartsEcartes = { [cle]: { motif: 'Déjà traité', quand: ecarte.quand, decision: ecarte.id } };
  B.depot.tout().blocages = [{ id: 'BLQ-b', cle: ID + '|tueur-absent|identite', ne_le: '2026-11-12T09:06:00.000Z', resolu_le: null, ecarte: null }];
  await sauver(B);
  assert.equal(B.depot.conflits().length, 0, 'aucun choix à faire : ce sont deux projets');
  await sauver(B);

  const ps = serveur.value.projets;
  assert.equal(ps.length, 3, 'aucun projet perdu');
  /* La migration du chargement complète les projets (nature, périmètre…) : on compare ce qui les identifie. */
  assert.deepEqual(tel(ps.find(p => p.nom === 'Projet de A'), CLES_PROJET), tel(enregistre, CLES_PROJET),
    'le projet déjà enregistré garde son identifiant et son contenu');
  const renomme = ps.find(p => p.nom === 'Projet de B');
  assert.match(renomme.id, FORME.PRO);
  assert.equal(renomme.id.split('-')[1], B.D.poste());
  assert.deepEqual(Object.keys(renomme.renommage), ['de', 'le', 'raison']);
  assert.equal(renomme.renommage.de, ID);
  assert.match(renomme.renommage.raison, /déjà pris/);
  assert.equal(renomme.livrables[0].id, 'L-b1', 'ses livrables le suivent tels quels');
  const N = renomme.id;
  const ds = serveur.value.decisions;
  assert.equal(ds.find(d => d.id === verdict.id).projet, N, 'la décision qui le cite le suit');
  assert.equal(ds.find(d => d.id === ecarte.id).projet, N);
  assert.equal(ds.find(d => d.id === ecarte.id).objet, N + '|L-b1|agence|Annotation ouverte', 'la clé de l’écart aussi');
  assert.deepEqual(Object.keys(serveur.value.ecartsEcartes), [N + '|L-b1|agence|Annotation ouverte'], 'l’écart reste écarté');
  assert.equal(serveur.value.feedbacks[0].projet, N);
  assert.deepEqual(serveur.value.feedbacks[0].cibles, ['L-b1']);
  assert.equal(serveur.value.blocages[0].cle, N + '|tueur-absent|identite', 'le blocage garde sa date de naissance');
  const journal = serveur.value.journal;
  assert.equal(journal.filter(e => e.type === 'projets' && e.action === 'création' && e.id === ID).length, 1, 'la ligne du poste A');
  assert.equal(journal.filter(e => e.type === 'projets' && e.action === 'création' && e.id === N).length, 1);
  const trace = journal.find(e => e.action === 'renommage');
  assert.equal(trace.type, 'projets'); assert.equal(trace.id, N); assert.match(trace.detail, /PRO-meme00/);
  assert.ok(B.avis.some(m => m.includes(ID) && m.includes(N)), 'le poste le dit');
  assert.equal(new Set(ps.map(p => p.id)).size, 3);
});

test('deux postes au même identifiant de livrable : le livrable local est renommé, ce qui le cite le suit', async () => {
  const { serveur, A, B } = await deuxPostes();
  const ID = 'L-meme00';
  A.depot.trouve('projets', 'P-1').livrables.push({ id: ID, nom: 'Affiche de A', cree_le: '2026-11-12T09:00:00.000Z' });
  A.depot.enregistrer(); await sauver(A);
  const enregistre = copie(serveur.value.projets[0].livrables.find(l => l.id === ID));

  const p = B.depot.trouve('projets', 'P-1');
  p.livrables.push({ id: ID, nom: 'Bannière de B', cree_le: '2026-11-12T09:05:00.000Z' });
  p.livrables.push({ id: 'L-fille', nom: 'Format de B', maitre: ID, cree_le: '2026-11-12T09:05:01.000Z' });
  const verdict = B.D.poser(geste({ objet: ID, projet: 'P-1', titre: 'Bannière de B' }));
  B.depot.ajoute('feedbacks', { projet: 'P-1', cibles: [ID, 'L-1'], texte: 'Plus lisible', issue: 'ouvert' });
  const cle = 'P-1|' + ID + '|brief|Langue du marché';
  B.depot.tout().ecartsEcartes = { [cle]: { motif: 'Bilingue voulu', quand: '2026-11-12T09:06:00.000Z', decision: null } };
  B.depot.enregistrer(); await sauver(B);
  assert.equal(B.depot.conflits().length, 0);
  await sauver(B);

  const ls = serveur.value.projets[0].livrables;
  assert.deepEqual(ls.map(l => l.nom), ['KV', 'Affiche de A', 'Bannière de B', 'Format de B'], 'aucun livrable perdu ni mêlé');
  assert.deepEqual(tel(ls[1], ['id', 'nom', 'cree_le']), tel(enregistre, ['id', 'nom', 'cree_le']));
  const renomme = ls[2];
  assert.match(renomme.id, FORME.L);
  assert.equal(renomme.renommage.de, ID);
  const N = renomme.id;
  assert.equal(ls[3].maitre, N, 'son format le suit');
  assert.equal(serveur.value.decisions.find(d => d.id === verdict.id).objet, N);
  assert.deepEqual(serveur.value.feedbacks[0].cibles, [N, 'L-1']);
  assert.deepEqual(Object.keys(serveur.value.ecartsEcartes), ['P-1|' + N + '|brief|Langue du marché']);
  const trace = serveur.value.journal.find(e => e.action === 'renommage');
  assert.equal(trace.type, 'livrables'); assert.equal(trace.id, N); assert.match(trace.detail, /L-meme00/);
  assert.ok(B.avis.some(m => m.includes(ID) && m.includes(N)));
});

test('un livrable au même identifiant dans un autre projet est un autre livrable, même né au même instant', () => {
  const { R } = poste();
  const ne = '2026-11-12T09:00:00.000Z';
  const base = { projets: [{ id: 'P-1', livrables: [] }, { id: 'P-2', livrables: [] }] };
  const ici = { projets: [{ id: 'P-1', livrables: [] }, { id: 'P-2', livrables: [{ id: 'L-x', nom: 'Ici', cree_le: ne }] }], journal: [] };
  const distant = { projets: [{ id: 'P-1', livrables: [{ id: 'L-x', nom: 'Ailleurs', cree_le: ne }] }, { id: 'P-2', livrables: [] }] };
  const r = copie(R.departager(base, ici, distant, () => 'L-neuf'));
  assert.deepEqual(r.renommes.map(x => [x.type, x.de, x.vers]), [['livrables', 'L-x', 'L-neuf']]);
  assert.equal(ici.projets[1].livrables[0].id, 'L-neuf');
});

test('le même projet revenu du serveur — une réponse perdue — n’est pas une collision', () => {
  const { R } = poste();
  const ne = '2026-11-12T09:00:00.000Z';
  const ici = { projets: [{ id: 'PRO-x', nom: 'Renommé ici', cree_le: ne, livrables: [{ id: 'L-x', cree_le: ne, nom: 'Neuf' }] }] };
  const distant = { projets: [{ id: 'PRO-x', nom: 'Envoyé', cree_le: ne, livrables: [{ id: 'L-x', cree_le: ne, nom: 'Envoyé' }] }] };
  const avant = JSON.stringify(ici);
  const r = copie(R.departager({ projets: [] }, ici, distant, () => { throw new Error('aucun tirage attendu'); }));
  assert.deepEqual(r, { renommes: [], bloques: [] });
  assert.equal(JSON.stringify(ici), avant);
  /* Le rapprochement les réunit champ par champ, comme deux versions d'un même projet. */
  const res = R.reconcilier({ projets: [] }, ici, distant);
  assert.deepEqual(copie(res.conflits.map(c => c.chemin)), [['projets', 'PRO-x', 'nom'], ['projets', 'PRO-x', 'livrables', 'L-x', 'nom']]);
});

test('un projet ou un livrable que le renommage casserait ne se renomme pas : le conflit reste à trancher, entier', () => {
  const { R } = poste();
  const distant = { projets: [{ id: 'PRO-x', nom: 'Ailleurs', cree_le: '2026-11-12T08:00:00.000Z', livrables: [] }],
    decisions: [geste({ id: 'DEC-lu', projet: 'P-9' })] };
  const projetIci = () => ({ id: 'PRO-x', nom: 'Ici', cree_le: '2026-11-12T09:00:00.000Z', livrables: [] });
  const cas = [
    ['attestée', { decisions: [geste({ id: 'DEC-a', projet: 'PRO-x', attestation: { par: 'la-fusee', sceau: 's' } })] }, /attest|sceau/],
    ['bilan arrêté', { campagnes: [{ id: 'C-1', bilanVersions: [{ id: 'BIL-C-1', version: 1, projets: ['PRO-x'], empreinte: 'e'.repeat(64) }] }] }, /bilan/],
    ['décision déjà dans la base de référence', { decisions: [geste({ id: 'DEC-lu', projet: 'PRO-x' })] }, /base de référence/],
    ['deux fois dans ce poste', { projets: [projetIci(), projetIci()] }, /deux fois/],
  ];
  for (const [nom, extra, raison] of cas) {
    const ici = { projets: [projetIci()], journal: [], ...copie(extra) };
    const avant = JSON.stringify(ici);
    const r = copie(R.departager({ projets: [], decisions: [] }, ici, distant, () => 'PRO-neuf'));
    assert.deepEqual(r.renommes, [], nom);
    assert.deepEqual(r.bloques.map(b => b.id), ['PRO-x'], nom);
    assert.match(r.bloques[0].raison, raison, nom);
    assert.equal(JSON.stringify(ici), avant, nom + ' : rien n’est réécrit');
  }
  /* Le rapprochement ne fond jamais deux projets en un : le projet entier est à choisir. */
  const ici = { projets: [projetIci()] };
  const res = R.reconcilier({ projets: [] }, ici, distant);
  assert.equal(res.conflits.length, 1);
  assert.deepEqual(copie(res.conflits[0].chemin), ['projets', 'PRO-x']);
  assert.equal(res.conflits[0].ici.nom, 'Ici'); assert.equal(res.conflits[0].distant.nom, 'Ailleurs');
  assert.deepEqual(copie(res.valeur.projets[0]), projetIci(), 'aucun projet mêlé de l’autre');
  const choisi = R.reconcilier({ projets: [] }, ici, distant, { [res.conflits[0].cle]: 'distant' });
  assert.deepEqual(copie(choisi.valeur.projets), copie(distant.projets));
});

test('le rapprochement ne fond jamais deux livrables nés séparément ; sans date de naissance, il rapproche comme avant', () => {
  const { R } = poste();
  const P = livrables => ({ projets: [{ id: 'P-1', nom: 'Projet', livrables }] });
  const base = P([]);
  /* Nés à deux instants : deux livrables. */
  let res = R.reconcilier(base, P([{ id: 'L-x', nom: 'Ici', cree_le: '2026-11-12T09:00:00.000Z' }]),
    P([{ id: 'L-x', nom: 'Ailleurs', cree_le: '2026-11-12T08:00:00.000Z', points: { central: 'pret' } }]));
  assert.deepEqual(copie(res.conflits.map(c => c.chemin)), [['projets', 'P-1', 'livrables', 'L-x']]);
  assert.deepEqual(copie(res.valeur.projets[0].livrables[0]), { id: 'L-x', nom: 'Ici', cree_le: '2026-11-12T09:00:00.000Z' });
  /* Une date de naissance d'un seul côté : deux objets. */
  res = R.reconcilier({ projets: [] }, { projets: [{ id: 'P-x', nom: 'Ici', cree_le: '2026-11-12T09:00:00.000Z' }] },
    { projets: [{ id: 'P-x', nom: 'Ailleurs' }] });
  assert.deepEqual(copie(res.conflits.map(c => c.chemin)), [['projets', 'P-x']]);
  /* Sans date de naissance des deux côtés, on ne sait pas : champ par champ,
   * comme un cache ancien repris sans base, où tout est « absent de la base ». */
  res = R.reconcilier({ projets: [] }, { projets: [{ id: 'P-x', nom: 'Ici' }] }, { projets: [{ id: 'P-x', nom: 'Ailleurs', ref: 'R' }] });
  assert.deepEqual(copie(res.conflits.map(c => c.chemin)), [['projets', 'P-x', 'nom']]);
  assert.equal(res.valeur.projets[0].ref, 'R');
  /* Sans date de naissance mais identiques : un seul objet. */
  res = R.reconcilier({ projets: [] }, { projets: [{ id: 'P-x', nom: 'Même' }] }, { projets: [{ id: 'P-x', nom: 'Même' }] });
  assert.equal(res.conflits.length, 0);
  assert.deepEqual(copie(res.valeur.projets), [{ id: 'P-x', nom: 'Même' }]);
});

/* ————— La référence humaine ————— */

/* Décision du propriétaire (12 novembre 2026, option 3) : le serveur attribue
 * la référence au premier enregistrement. On rejoue ici les deux postes contre
 * le vrai servir.mjs, et l'écran qui ouvre un projet depuis sa campagne. */
test('deux projets ouverts sur deux postes depuis la même campagne ne portent pas la même référence', async () => {
  const s = await lancer();
  const reel = { fetch: (chemin, init) => fetch(s.origin + '/' + chemin, init) };
  const A = poste({ serveur: reel, ecrans: true }), B = poste({ serveur: reel, ecrans: true });
  const base = copie(A.depot.vide());
  Object.assign(base, { enregistre_le: '2026-11-12T08:00:00.000Z', rattachement2: true,
    campagnes: [{ id: 'C-1', nom: 'Noël', marches: [], marqueIds: [] }],
    projets: [{ id: 'P-1', ref: 'MT-0001', nom: 'Projet', nature: 'campagne', campagneId: 'C-1', cree_le: '2026-11-01T08:00:00.000Z',
      perimetre: { supports: [], marches: [] }, livrables: [] }] });
  await writeFile(join(s.root, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'recette.json' }));
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify(base));
  for (const p of [A, B]) await new Promise(r => p.depot.chargerReference({ reference: 'recette.json' }, r));
  const fini = (p, condition) => new Promise(r => {
    const t = setInterval(() => { if (condition()) { clearInterval(t); r(true); } }, 10);
    setTimeout(() => { clearInterval(t); r(false); }, 4000);
  });

  A.ecran.ouvrirDepuisCampagne(A.depot.trouve('campagnes', 'C-1'), { cle: 'activation', nom: 'Activation' }, () => {});
  B.ecran.ouvrirDepuisCampagne(B.depot.trouve('campagnes', 'C-1'), { cle: 'film', nom: 'Film' }, () => {});
  /* Hors ligne, chaque poste montre une référence provisoire, et la même : ce n'est pas encore une référence. */
  for (const p of [A, B]) assert.match(p.depot.liste('projets')[1].ref, /^MT-… \(provisoire\)$/);
  A.depot.ecrireSurDisque();
  assert.ok(await fini(A, () => A.depot.liste('projets')[1].ref === 'MT-0002'), 'A reçoit la sienne');
  B.depot.ecrireSurDisque();
  assert.ok(await fini(B, () => B.depot.liste('projets').length === 3), 'B relit la base et rapproche');
  B.depot.ecrireSurDisque();
  assert.ok(await fini(B, () => (B.depot.liste('projets').find(p => /film/.test(p.nom)) || {}).ref === 'MT-0003'), 'B reçoit la suivante');
  const ps = JSON.parse(await readFile(join(s.root, 'depots', 'recette.json'), 'utf8')).projets;
  assert.equal(ps.length, 3);
  assert.equal(new Set(ps.map(p => p.id)).size, 3, 'les identifiants sont départagés');
  assert.deepEqual(ps.map(p => p.ref), ['MT-0001', 'MT-0002', 'MT-0003'], 'les références aussi');
  assert.ok(ps.every(p => !('refDemandee' in p)), 'aucune demande ne reste dans la base de référence');
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
  const root = await mkdtemp(join(tmpdir(), 'la-barre-identifiants-'));
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

test('le serveur refuse une base qui dupliquerait un projet ou un livrable, ou en remplacerait un par un autre', async () => {
  const s = await lancer();
  const url = s.origin + '/depots/base.json';
  const c1 = '2026-11-01T08:00:00.000Z', c2 = '2026-11-12T09:00:00.000Z';
  const base = () => ({ schema: 5, enregistre_le: '2026-11-12T08:00:00.000Z', decisions: [],
    projets: [
      { id: 'PRO-a', nom: 'A', cree_le: c1, livrables: [{ id: 'L-a', nom: 'Affiche', cree_le: c1 }, { id: 'L-ancien', nom: 'Ancien' }] },
      { id: 'PRJ-legs', nom: 'Legs', livrables: [{ id: 'L-legs', nom: 'Legs' }] }] });
  await writeFile(join(s.root, 'depots', 'base.json'), JSON.stringify(base()));
  const ecrire = async donnees => {
    const lu = await fetch(url);
    return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': lu.headers.get('etag') },
      body: JSON.stringify(donnees) });
  };
  const brut = () => readFile(join(s.root, 'depots', 'base.json'), 'utf8');
  const avant = await brut();

  const refus = [
    ['PROJET_EN_DOUBLE', ['PRO-a'], b => b.projets.push({ id: 'PRO-a', nom: 'Autre A', cree_le: c2, livrables: [] })],
    ['PROJET_REMPLACE', ['PRO-a'], b => { b.projets[0] = { id: 'PRO-a', nom: 'Autre A', cree_le: c2, livrables: [] }; }],
    ['PROJET_REMPLACE', ['PRJ-legs'], b => { b.projets[1].cree_le = c2; }],
    ['LIVRABLE_EN_DOUBLE', ['L-a'], b => b.projets[1].livrables.push({ id: 'L-a', nom: 'Autre affiche', cree_le: c2 })],
    ['LIVRABLE_REMPLACE', ['L-a'], b => { b.projets[0].livrables[0] = { id: 'L-a', nom: 'Autre affiche', cree_le: c2 }; }],
    /* Un livrable né avant sa date de naissance : il ne change pas de projet. */
    ['LIVRABLE_REMPLACE', ['L-ancien'], b => { b.projets[1].livrables.push(b.projets[0].livrables.pop()); }],
  ];
  for (const [code, identifiants, changer] of refus) {
    const b = base(); changer(b);
    const r = await ecrire(b);
    assert.equal(r.status, 422, code);
    const corps = await r.json();
    assert.equal(corps.code, code); assert.deepEqual(corps.identifiants, identifiants);
    assert.match(corps.quoi, new RegExp(identifiants[0]));
    assert.equal(await brut(), avant, code + ' : rien n’est écrit');
  }

  /* Ce qui reste permis : modifier un projet et ses livrables, en ajouter, en annuler un. */
  const permis = base();
  permis.projets[0].nom = 'A renommé'; permis.projets[0].livrables[0].annule = true;
  permis.projets[0].livrables.push({ id: 'L-neuf', nom: 'Neuf', cree_le: c2 });
  permis.projets.push({ id: 'PRO-k3f9-0a1b2c3d4e5f', nom: 'Neuf', cree_le: c2, livrables: [] });
  assert.equal((await ecrire(permis)).status, 200);

  /* Une base qui porte déjà un doublon reste inscriptible ; seul ce que l'écriture ajoute est refusé. */
  const legs = { ...copie(permis), projets: [...copie(permis.projets), { id: 'PRJ-legs', nom: 'Legs bis', livrables: [] }] };
  await writeFile(join(s.root, 'depots', 'base.json'), JSON.stringify(legs));
  assert.equal((await ecrire({ ...legs, enregistre_le: '2026-11-12T09:30:00.000Z' })).status, 200);
  const r = await ecrire({ ...legs, projets: [...legs.projets, { id: 'PRJ-legs', nom: 'Legs ter', livrables: [] }] });
  assert.equal(r.status, 422); assert.equal((await r.json()).code, 'PROJET_EN_DOUBLE');

  /* Une base neuve ne peut pas naître avec un doublon. */
  const neuve = await fetch(s.origin + '/depots/neuve.json', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-None-Match': '*' },
    body: JSON.stringify({ schema: 5, projets: [{ id: 'P-1', livrables: [{ id: 'L-1' }] }, { id: 'P-2', livrables: [{ id: 'L-1' }] }] }) });
  assert.equal(neuve.status, 422); assert.equal((await neuve.json()).code, 'LIVRABLE_EN_DOUBLE');
  assert.equal((await fetch(s.origin + '/depots/neuve.json')).status, 404);
});
