import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const copy = x => JSON.parse(JSON.stringify(x));
const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const html = read('app/ateliers/approches/index.html');
const engine = vm.createContext({});
vm.runInContext('const METHOD_VERSION=2;' + html.slice(html.indexOf('const OBJECTIVES='), html.indexOf('function card(')), engine);
const defaults = { brand: '', product: '', benefit: '', problem: '', audience: '', market: '',
  objective: 'auto', medium: 'social', mode: 'divergent', count: 3, audacity: 2,
  familyLock: 'auto', executionLock: 'auto', productVisible: true, allowTemporal: true,
  strictDiversity: true, avoidCliches: true, constraints: '', seed: 'RECEIPT-01' };
function fixture() {
  let sequence = 0, saves = 0, dossier = 'recette.json';
  const project = { id: 'P-A', ref: 'REC-A', nom: 'Projet de recette',
    sections: { identite: { marqueIds: ['M-A'] }, brief: { promesse: 'Bénéfice déclaré', probleme: 'Tension déclarée', cible: 'Audience déclarée' }, pistes: [] } };
  const neighbor = { id: 'P-B', sections: { pistes: [{ id: 'PI-existing', statut: 'retenue' }] } };
  const data = { projets: [project, neighbor], marques: [{ id: 'M-A', nom: 'Marque de recette' }], decisions: [{ id: 'decision-existing' }] };
  const ctx = { TextEncoder, Uint8Array, crypto: webcrypto, Date, console,
    O: { el() {}, id: prefix => prefix + (++sequence) }, ACTEUR: { trace: () => ({ personneId: 'P-receiver' }) },
    DEPOT: { poids: () => ({ fichier: dossier }), tout: () => data,
      trouve: (key, id) => data[key]?.find(x => x.id === id), tracer() {}, enregistrer() { saves++; } } };
  ctx.window = ctx;
  vm.runInNewContext(read('app/ateliers/approches/raccord.js'), ctx);
  vm.runInNewContext(read('app/approches.js'), ctx);
  async function packet() {
    const launch = ctx.APPROCHES_CONTEXT.readLaunch((await ctx.APPROCHES.lien(project)).slice('app/ateliers/approches/index.html'.length));
    engine.input = { ...defaults, ...launch.brief };
    const generated = JSON.parse(vm.runInContext('JSON.stringify(generateData(input))', engine));
    return { ...generated, context: copy(launch.context) };
  }
  return { api: ctx.APPROCHES, project, neighbor, data, packet, get saves() { return saves; }, changeDossier: () => { dossier = 'other.json'; } };
}

test('project launch uses exact available brief fields, leaving missing fields empty', async () => {
  const f = fixture(), packet = await f.packet();
  assert.equal(packet.context.projectId, f.project.id);
  assert.equal(packet.context.depot, 'recette.json');
  assert.equal(packet.brief.brand, 'Marque de recette');
  assert.equal(packet.brief.benefit, f.project.sections.brief.promesse);
  assert.equal(packet.brief.product, '');
  assert.equal(f.saves, 0);
});

test('admission creates only one proposed piste with original provenance; neighboring work and decisions remain exact', async () => {
  const f = fixture(), packet = await f.packet(), before = copy(f.data);
  const result = await f.api.admettre(f.project, packet, 1), pi = result.piste;
  assert.equal(pi.statut, 'proposee'); assert.equal(pi.axe_ton, undefined); assert.equal(pi.score, undefined);
  assert.equal(pi.auteurDA, undefined); assert.equal(pi.arbitre_le, undefined);
  assert.equal(pi.provenance_approches.statut, 'INFERRED');
  assert.deepEqual(copy(pi.provenance_approches.original), packet);
  assert.deepEqual(f.neighbor, before.projets[1]);
  assert.deepEqual(f.project.sections.brief, before.projets[0].sections.brief);
  assert.deepEqual(f.data.decisions, before.decisions);
  const replay = await f.api.admettre(f.project, packet, 1);
  assert.equal(replay.dejaRecu, true); assert.equal(replay.piste.id, pi.id);
  assert.equal(f.project.sections.pistes.length, 1); assert.equal(f.saves, 1);
});

test('another project, dossier or stale source is refused before mutation, including after preview', async () => {
  for (const mutation of ['project', 'dossier', 'source']) {
    const f = fixture(), packet = await f.packet();
    await f.api.lire(packet, f.project);
    if (mutation === 'project') packet.context.projectId = 'P-B';
    if (mutation === 'dossier') f.changeDossier();
    if (mutation === 'source') f.project.sections.brief.promesse = 'New source';
    const before = copy(f.data);
    await assert.rejects(() => f.api.admettre(f.project, packet, 1), /autre|changé/);
    assert.deepEqual(f.data, before); assert.equal(f.saves, 0);
  }
});

test('concurrent identical admissions keep one piste and an exact replay remains valid after source changes', async () => {
  const f = fixture(), packet = await f.packet();
  const results = await Promise.all([f.api.admettre(f.project, packet, 1), f.api.admettre(f.project, packet, 1)]);
  assert.equal(results[0].piste.id, results[1].piste.id);
  assert.equal(f.project.sections.pistes.length, 1); assert.equal(f.saves, 1);
  f.project.sections.brief.promesse = 'Later source';
  const before = copy(f.data);
  assert.equal((await f.api.admettre(f.project, packet, 1)).dejaRecu, true);
  assert.deepEqual(copy(f.data), before);
});

test('unknown method and malformed routes are rejected without retaining an implied choice', async () => {
  const f = fixture(), packet = await f.packet();
  for (const value of [{ ...packet, methodVersion: 999 }, { ...packet, routes: [] },
    { ...packet, routes: [{ i: 1, title: 'Incomplete' }] }, { ...packet, context: null }]) {
    await assert.rejects(() => f.api.lire(value, f.project));
  }
  assert.equal(f.project.sections.pistes.length, 0); assert.equal(f.saves, 0);
});
