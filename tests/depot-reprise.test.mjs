import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';

const sources = await Promise.all(['reconciliation.js','depot.js'].map(name =>
  readFile(new URL('../app/' + name, import.meta.url), 'utf8')));
const clone = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const revision = x => '"' + createHash('sha256').update(JSON.stringify(x)).digest('hex') + '"';
async function stable() { for (let i=0;i<12;i++) await tick(); }
function client(server, records = new Map(), cache = new Map()) {
  const sandbox = { console, Date, Set, Map, Promise, Response,
    location: { protocol: 'http:' }, navigator: { platform: 'Test' },
    MAISON: { nom: 'Recette', titulaire: 'Test', natures: [{ cle:'campagne' }] },
    O: { normalise: s => String(s).toLowerCase(), id: () => 'local' },
    AVIS: { grave() {}, fait() {}, refus() {} },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: { setItem(k,v) { cache.set(k,v); }, getItem(k) { return cache.get(k) || null; } },
    fetch: (path, init) => server.fetch(path, init),
    REPRISES: {
      garder: async (file, value) => { records.set(file, clone(value)); },
      lire: async file => clone(records.get(file)),
      retirer: async file => { records.delete(file); },
      lister: async () => [...records.values()].filter(r => r.cle && !r.recue_le).map(clone),
      accuser: async r => { const row = records.get(r.cle); if (row?.quand === r.quand) row.recue_le = 'reçu'; },
      archiverAncien: async (file, state) => { records.set('ancien', { cle:'ancien', quand:'migration', ancien:true, base:{}, etat:clone(state) }); },
    },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const source of sources) vm.runInContext(source, context);
  return { depot: context.DEPOT, records };
}
function backend() {
  const server = { value: null, writes: [], pause: null, unavailable: false };
  server.fetch = async (path, init = {}) => {
    if (init.method !== 'PUT') return new Response(JSON.stringify(server.value), {
      headers: { ETag: revision(server.value) },
    });
    server.writes.push(clone(init));
    if (server.pause) await server.pause;
    if (server.unavailable) throw new Error('Réseau interrompu');
    if (init.headers['If-Match'] !== revision(server.value))
      return Response.json({ code:'REVISION_DEPASSEE' }, { status:409 });
    server.value = JSON.parse(init.body);
    return Response.json({ ok:true, revision:revision(server.value), enregistre_le:server.value.enregistre_le });
  };
  return server;
}
async function setup() {
  const server = backend(), c = client(server);
  server.value = clone(c.depot.vide());
  server.value.enregistre_le = '2026-10-06T01:00:00.000Z';
  server.value.rattachement2 = true;
  server.value.projets = [{ id:'P1', nom:'Noël', nature:'campagne', perimetre:{ supports:[], marches:[] } }];
  await new Promise(resolve => c.depot.chargerReference({ reference:'test.json' }, resolve));
  return { server, ...c };
}

test('un geste pendant une sauvegarde utilise le reçu du document réellement envoyé', async () => {
  const { server, depot } = await setup();
  let release; server.pause = new Promise(r => { release = r; });
  depot.modifie('projets','P1',{ nom:'Première correction' });
  depot.ecrireSurDisque(); await stable();
  depot.modifie('projets','P1',{ budget:100 });
  release(); await stable();
  const receivedRevision = revision(server.value);
  assert.equal(server.value.projets[0].budget, undefined);
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.writes[1].headers['If-Match'], receivedRevision);
  assert.equal(server.value.projets[0].budget, 100);
  assert.equal(depot.poids().surDisque, true);
});

test('le conflit conserve le geste et son brouillon, puis reçoit le choix explicite', async () => {
  const { server, depot, records } = await setup();
  depot.modifie('projets','P1',{ nom:'Mon titre' });
  server.value.projets[0].nom = 'Autre titre';
  depot.ecrireSurDisque(); await stable();
  assert.equal(depot.trouve('projets','P1').nom, 'Mon titre');
  assert.equal(records.get('test.json').etat.projets[0].nom, 'Mon titre');
  assert.equal(depot.conflits().length, 1);
  assert.equal(depot.resoudre({ [depot.conflits()[0].cle]:'distant' }), true);
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.value.projets[0].nom, 'Autre titre');
  assert.equal(depot.conflits().length, 0);
  assert.equal(records.has('test.json'), false);
});

test('les gestes compatibles se réunissent sans demander de recommencer', async () => {
  const { server, depot } = await setup();
  depot.modifie('projets','P1',{ nom:'Mon titre' });
  server.value.projets[0].budget = 100;
  depot.ecrireSurDisque(); await stable();
  assert.equal(depot.conflits().length, 0);
  assert.equal(depot.trouve('projets','P1').nom, 'Mon titre');
  assert.equal(depot.trouve('projets','P1').budget, 100);
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.value.projets[0].nom, 'Mon titre');
  assert.equal(server.value.projets[0].budget, 100);
});

test('un formulaire encore ouvert conserve sa référence après un rapprochement compatible', async () => {
  const { server, depot } = await setup();
  const projetOuvert = depot.trouve('projets', 'P1');
  depot.modifie('projets','P1',{ nom:'Mon titre' });
  server.value.projets[0].budget = 100;
  depot.ecrireSurDisque(); await stable();
  projetOuvert.perimetre.supports.push('S-film'); depot.enregistrer();
  depot.ecrireSurDisque(); await stable();
  assert.deepEqual(server.value.projets[0].perimetre.supports, ['S-film']);
  assert.equal(server.value.projets[0].budget, 100);
});

test('un rechargement restitue le brouillon non reçu et retrouve ses conflits', async () => {
  const { server, depot, records } = await setup();
  depot.modifie('projets','P1',{ nom:'À conserver' });
  server.value.projets[0].nom = 'Reçu ailleurs';
  depot.ecrireSurDisque(); await stable();
  const resumed = client(server, records);
  await new Promise(resolve => resumed.depot.chargerReference({ reference:'test.json' }, resolve));
  assert.equal(resumed.depot.trouve('projets','P1').nom, 'À conserver');
  assert.equal(resumed.depot.conflits().length, 1);
  assert.equal(server.value.projets[0].nom, 'Reçu ailleurs');
});

test('une panne réseau laisse la sauvegarde en attente et une reprise exploitable', async () => {
  const { server, depot, records } = await setup();
  server.unavailable = true;
  depot.modifie('projets','P1',{ nom:'Non perdu' });
  depot.ecrireSurDisque(); await stable();
  assert.equal(depot.poids().surDisque, false);
  assert.equal(records.get('test.json').etat.projets[0].nom, 'Non perdu');
  server.unavailable = false; depot.ecrireSurDisque(); await stable();
  assert.equal(server.value.projets[0].nom, 'Non perdu');
  assert.equal(depot.poids().surDisque, true);
});

test('reprendre un onglet fermé ne solde son brouillon qu’après réception effective', async () => {
  const { server, records } = await setup();
  const original = clone(server.value), pending = clone(server.value);
  pending.projets[0].nom = 'Travail de l’onglet fermé';
  records.set('autre', { cle:'autre', quand:'hier', base:original, etat:pending });
  const resumed = client(server, records);
  await new Promise(resolve => resumed.depot.chargerReference({ reference:'test.json' }, resolve));
  resumed.depot.reprendre('autre'); await stable();
  assert.equal(records.get('autre').recue_le, undefined);
  server.unavailable = true; resumed.depot.ecrireSurDisque(); await stable();
  assert.equal(records.get('autre').recue_le, undefined);
  assert.equal(records.get('test.json').adoptees[0].cle, 'autre');
  server.unavailable = false; resumed.depot.ecrireSurDisque(); await stable();
  assert.equal(records.get('autre').recue_le, 'reçu');
  assert.equal(resumed.depot.reprisesDisponibles().length, 0);
  assert.equal(server.value.projets[0].nom, 'Travail de l’onglet fermé');
});

test('une mise à jour conserve séparément le cache ancien sans le pousser dans le fichier', async () => {
  const { server, records } = await setup();
  const ancien = clone(server.value); ancien.projets[0].nom = 'Geste dans l’ancienne version';
  const cache = new Map([['la-barre', JSON.stringify(ancien)]]);
  const resumed = client(server, records, cache);
  assert.equal(resumed.depot.charger(), true);
  await new Promise(resolve => resumed.depot.chargerReference({ reference:'test.json' }, resolve));
  assert.equal(resumed.depot.trouve('projets','P1').nom, 'Noël');
  assert.equal(server.writes.length, 0);
  assert.equal(records.get('ancien').etat.projets[0].nom, 'Geste dans l’ancienne version');
  resumed.depot.reprendre('ancien'); await stable();
  assert.equal(resumed.depot.conflits().length, 1);
  assert.equal(resumed.depot.conflits()[0].ici, 'Geste dans l’ancienne version');
  assert.equal(resumed.depot.conflits()[0].distant, 'Noël');
});
