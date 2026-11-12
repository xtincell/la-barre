/* La route que Radar lit : les seules décisions, derrière un jeton machine.
 *
 * SHK-0005, sens 1, arbitrage 5.5 du 11 novembre 2026. Ces tests lancent le vrai
 * servir.mjs, copié dans un dossier jetable, sur une base fictive : aucune
 * donnée réelle, aucun appel sortant. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';

const JETON = 'recette-'.padEnd(64, '7');
const AUTRE = 'recette-'.padEnd(64, '8');
const serveurs = [];

async function lancer(env = {}) {
  const root = await mkdtemp(join(tmpdir(), 'la-barre-radar-'));
  await mkdir(join(root, 'depots'));
  await copyFile(new URL('../servir.mjs', import.meta.url), join(root, 'servir.mjs'));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const propre = { ...process.env };
  delete propre.BARRE_RADAR_TOKEN;
  const child = spawn(process.execPath, [join(root, 'servir.mjs'), String(port)],
    { env: { ...propre, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  await once(child.stdout, 'data');
  const s = { root, child, origin: 'http://127.0.0.1:' + port };
  serveurs.push(s);
  return s;
}

after(async () => {
  for (const s of serveurs) {
    if (s.child.exitCode === null) { s.child.kill(); await once(s.child, 'exit'); }
    await rm(s.root, { recursive: true, force: true });
  }
});

const ACTEUR = { personneId: 'PER-1', nom: 'Alice Recette', poste: 'direction-creation', postes: ['direction-creation', 'CASQUETTE_PRIVEE'] };
function base() {
  return {
    schema: 5, maison: 'Recette', enregistre_le: '2026-11-01T09:00:00.000Z',
    personnes: [{ id: 'PER-1', nom: 'Alice Recette', email: 'PERSONNE_PRIVEE@recette.invalid' }],
    factures: [{ id: 'FAC-1', reference: 'FACTURE_PRIVEE' }],
    projets: [{ id: 'P-1', ref: 'REC-001', nom: 'PROJET_INTERNE' }],
    journal: [{ quand: '2026-11-01T08:00:00.000Z', detail: 'JOURNAL_INTERNE' }],
    decisions: [
      { objet: 'L-1', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: null,
        quand: '2026-11-01T08:00:00.000Z', qui: 'direction-generale', titre: 'Livrable un', acteur: ACTEUR,
        id: 'DEC-AAAAAA', cree_le: '2026-11-01T08:00:01.000Z',
        attestation: { par: 'la-fusee', userId: 'USER_PRIVE', nom: 'Alice Recette', at: '2026-11-01T08:00:02.000Z', sceau: 'SCEAU_PRIVE' } },
      { id: 'DEC-BBBBBB', type: 'reference-campagne', objet: 'PI-1', projet: 'P-1', campagne: 'C-1',
        verdict: 'approuve', portee: 'campagne', motif: 'Le socle commun', quand: '2026-11-02T10:30:00.000Z',
        qui: 'direction-generale', acteur: null, version: 2, titre: 'Piste retenue',
        contenuPiste: { concept: 'CONTENU_CREATIF_PRIVE' }, revisionSource: '"abc"', remplace: 'DEC-AAAAAA',
        cree_le: '2026-11-02T10:30:00.000Z' },
      { objet: 'mosaique', type: 'composition', campagne: 'C-1', verdict: 'hors', motif: 'Hors du dispositif',
        quand: '2026-11-03T07:00:00.000Z', qui: 'direction-generale', acteur: ACTEUR, titre: 'Mosaïque',
        id: 'DEC-CCCCCC', cree_le: '2026-11-03T07:00:00.000Z' },
      { objet: 'L-2', type: 'livrable', projet: 'P-1', verdict: 'retour', motif: 'Sans identifiant',
        quand: '2026-11-03T08:00:00.000Z', qui: 'direction-generale', titre: 'Orpheline' },
      { id: 'DEC-DOUBLE', objet: 'L-3', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: null,
        quand: '2026-11-03T09:00:00.000Z', qui: 'direction-generale', titre: 'Premier tirage' },
      { id: 'DEC-DOUBLE', objet: 'L-4', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: null,
        quand: '2026-11-03T09:05:00.000Z', qui: 'direction-generale', titre: 'Second tirage' },
    ],
  };
}

async function semer(s, donnees = base()) {
  await writeFile(join(s.root, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'recette.json' }));
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify(donnees));
  return donnees;
}

const lire = (s, jeton = JETON, extra = {}, method = 'GET') => fetch(s.origin + '/radar/decisions', {
  method, headers: { ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}), ...extra },
});

function canonique(v) {
  if (Array.isArray(v)) return '[' + v.map(canonique).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonique(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
function empreinte(decision) {
  const sans = { ...decision }; delete sans.empreinte_contenu;
  return 'sha256:' + createHash('sha256').update(canonique(sans)).digest('hex');
}

let ouvert;
before(async () => { ouvert = await lancer({ BARRE_RADAR_TOKEN: JETON }); await semer(ouvert); });

test('sans jeton configuré, ou avec un jeton trop court, la route reste fermée', async () => {
  for (const env of [{}, { BARRE_RADAR_TOKEN: '' }, { BARRE_RADAR_TOKEN: 'court-'.padEnd(31, 'x') }]) {
    const s = await lancer(env); await semer(s);
    for (const jeton of [null, JETON, env.BARRE_RADAR_TOKEN || 'x']) {
      const r = await lire(s, jeton);
      assert.equal(r.status, 503, JSON.stringify(env));
      const texte = await r.text();
      assert.equal(JSON.parse(texte).code, 'ROUTE_FERMEE');
      assert.doesNotMatch(texte, /DEC-|Livrable un/);
    }
  }
});

test('un jeton absent, faux ou présenté autrement reçoit 401, sans contenu', async () => {
  for (const headers of [{}, { Authorization: 'Bearer ' + AUTRE }, { Authorization: 'Bearer ' + JETON.slice(0, -1) },
    { Authorization: 'Bearer ' + JETON + 'x' }, { Authorization: 'Basic ' + Buffer.from('radar:' + JETON).toString('base64') },
    { Authorization: JETON }, { 'X-Radar-Key': JETON }]) {
    const r = await fetch(ouvert.origin + '/radar/decisions', { headers });
    assert.equal(r.status, 401, JSON.stringify(headers));
    assert.match(r.headers.get('www-authenticate') || '', /^Bearer /);
    assert.doesNotMatch(await r.text(), /DEC-|Livrable un/);
  }
  // Une empreinte connue ne dispense pas du jeton : pas de 304 sans identité.
  const etag = (await lire(ouvert)).headers.get('etag');
  assert.equal((await lire(ouvert, AUTRE, { 'If-None-Match': etag })).status, 401);
  assert.match(await readFile(new URL('../servir.mjs', import.meta.url), 'utf8'), /timingSafeEqual/);
});

test('seules les décisions sont servies, dans la forme de la fabrique, avec leur empreinte', async () => {
  const r = await lire(ouvert);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^application\/json/);
  assert.match(r.headers.get('cache-control'), /no-store/);
  const texte = await r.text(), corps = JSON.parse(texte);
  assert.deepEqual(Object.keys(corps), ['schema', 'maison', 'depot', 'decisions', 'ecartees']);
  assert.equal(corps.schema, 1); assert.equal(corps.maison, 'Recette'); assert.equal(corps.depot, 'recette.json');
  for (const prive of ['PERSONNE_PRIVEE', 'FACTURE_PRIVEE', 'PROJET_INTERNE', 'JOURNAL_INTERNE', 'CONTENU_CREATIF_PRIVE',
    'SCEAU_PRIVE', 'USER_PRIVE', 'CASQUETTE_PRIVEE', 'REC-001']) assert.ok(!texte.includes(prive), prive);
  assert.deepEqual(corps.decisions.map(d => d.id), ['DEC-AAAAAA', 'DEC-BBBBBB', 'DEC-CCCCCC']);
  const [a, b, c] = corps.decisions;
  assert.deepEqual(a, { id: 'DEC-AAAAAA', projet: 'P-1', objet: 'L-1', type: 'livrable', verdict: 'approuve', motif: null,
    quand: '2026-11-01T08:00:00.000Z', qui: 'direction-generale',
    acteur: { personneId: 'PER-1', nom: 'Alice Recette', poste: 'direction-creation' }, titre: 'Livrable un',
    cree_le: '2026-11-01T08:00:01.000Z', empreinte_contenu: a.empreinte_contenu });
  assert.equal(b.remplace, 'DEC-AAAAAA'); assert.equal(b.campagne, 'C-1'); assert.equal(b.version, 2);
  assert.equal(b.portee, 'campagne'); assert.equal(b.revisionSource, '"abc"'); assert.equal(b.acteur, null);
  assert.equal(b.contenuPiste, undefined); assert.equal(a.attestation, undefined);
  // Une décision de campagne sans projet garde son rattachement, et projet vaut null.
  assert.equal(c.projet, null); assert.equal(c.campagne, 'C-1');
  for (const d of corps.decisions) assert.equal(d.empreinte_contenu, empreinte(d), d.id);
  assert.deepEqual(corps.ecartees, [
    { id: null, raison: 'sans identifiant' },
    { id: 'DEC-DOUBLE', raison: 'identifiant en double' },
  ]);
});

test('l’ETag évite de relire des décisions inchangées, même quand le reste de la base bouge', async () => {
  const s = await lancer({ BARRE_RADAR_TOKEN: JETON }); const donnees = await semer(s);
  const premier = await lire(s);
  const etag = premier.headers.get('etag');
  assert.match(etag || '', /^"[a-f0-9]{64}"$/);
  const corps = await premier.text();
  const meme = await lire(s, JETON, { 'If-None-Match': etag });
  assert.equal(meme.status, 304); assert.equal(await meme.text(), ''); assert.equal(meme.headers.get('etag'), etag);
  const tete = await lire(s, JETON, {}, 'HEAD');
  assert.equal(tete.status, 200); assert.equal(tete.headers.get('etag'), etag); assert.equal(await tete.text(), '');
  donnees.personnes.push({ id: 'PER-2', nom: 'Bob' }); donnees.enregistre_le = '2026-11-04T00:00:00.000Z';
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify(donnees));
  assert.equal((await lire(s, JETON, { 'If-None-Match': etag })).status, 304);
  donnees.decisions[0].motif = 'Motif ajouté après coup';
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify(donnees));
  const change = await lire(s, JETON, { 'If-None-Match': etag });
  assert.equal(change.status, 200);
  assert.notEqual(change.headers.get('etag'), etag);
  assert.notEqual(await change.text(), corps);
});

test('la route ne s’écrit pas : la base reste octet pour octet', async () => {
  const avant = await readFile(join(ouvert.root, 'depots', 'recette.json'));
  for (const method of ['PUT', 'POST', 'DELETE', 'PATCH']) {
    const r = await fetch(ouvert.origin + '/radar/decisions', { method,
      headers: { Authorization: 'Bearer ' + JETON, 'Content-Type': 'application/json' }, body: '{"decisions":[]}' });
    assert.equal(r.status, 405, method); assert.match(r.headers.get('allow') || '', /GET/);
  }
  assert.deepEqual(await readFile(join(ouvert.root, 'depots', 'recette.json')), avant);
});

test('sans base de référence lisible, la route le dit et ne sert rien', async () => {
  const s = await lancer({ BARRE_RADAR_TOKEN: JETON });
  const indisponible = async () => {
    const r = await lire(s); assert.equal(r.status, 503);
    const corps = await r.json(); assert.equal(corps.code, 'BASE_INDISPONIBLE'); assert.equal(corps.decisions, undefined);
  };
  await indisponible(); // aucun manifeste
  await writeFile(join(s.root, 'depots', 'manifeste.json'), JSON.stringify({ reference: '../servir.mjs' }));
  await indisponible();
  await writeFile(join(s.root, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'absente.json' }));
  await indisponible();
  await writeFile(join(s.root, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'recette.json' }));
  await writeFile(join(s.root, 'depots', 'recette.json'), '{interrompu');
  await indisponible();
  // Une base sans collection de décisions n'est pas une base sans décision.
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify({ schema: 5, projets: [] }));
  await indisponible();
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify({ schema: 5, decisions: {} }));
  await indisponible();
  await writeFile(join(s.root, 'depots', 'recette.json'), JSON.stringify({ schema: 5, decisions: [] }));
  const vide = await lire(s); assert.equal(vide.status, 200);
  assert.deepEqual((await vide.json()).decisions, []);
});
