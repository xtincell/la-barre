import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
const source = await readFile(new URL('../app/reconciliation.js', import.meta.url), 'utf8').catch(() => '');
vm.runInContext(source, context);
const merge = (...args) => context.window.RECONCILIATION.reconcilier(...args);
const plain = value => JSON.parse(JSON.stringify(value));

test('deux gestes sur des champs distincts sont conservés sans arbitrage', () => {
  const base = { projets: [{ id: 'P1', nom: 'Noël', brief: { cible: 'Familles', budget: null } }] };
  const local = structuredClone(base), remote = structuredClone(base);
  local.projets[0].brief.cible = 'Jeunes adultes'; remote.projets[0].brief.budget = 100;
  const result = merge(base, local, remote);
  assert.equal(result.conflits.length, 0);
  assert.deepEqual(plain(result.valeur.projets[0].brief), { cible: 'Jeunes adultes', budget: 100 });
});

test('deux corrections du même champ restent proposées jusqu’au choix explicite', () => {
  const base = { projets: [{ id: 'P1', nom: 'Noël' }] };
  const local = { projets: [{ id: 'P1', nom: 'Local' }] };
  const remote = { projets: [{ id: 'P1', nom: 'Ailleurs' }] };
  const result = merge(base, local, remote);
  assert.equal(result.conflits.length, 1);
  assert.deepEqual(plain(result.conflits[0].chemin), ['projets','P1','nom']);
  assert.equal(result.conflits[0].ici, 'Local');
  const choices = { [result.conflits[0].cle]: 'distant' };
  assert.equal(merge(base, local, remote, choices).valeur.projets[0].nom, 'Ailleurs');
});

test('ajouts indépendants, ordre courant et journal sont préservés', () => {
  const base = { projets: [{ id: 'P1' }], journal: [{ quand: 'a', quoi: 'lu' }] };
  const local = structuredClone(base), remote = structuredClone(base);
  local.projets.push({ id: 'P2' }); remote.projets.push({ id: 'P3' });
  local.journal.push({ quand: 'b', quoi: 'ici' }); remote.journal.push({ quand: 'c', quoi: 'ailleurs' });
  const result = merge(base, local, remote);
  assert.equal(result.conflits.length, 0);
  assert.deepEqual(plain(result.valeur.projets.map(x => x.id)), ['P1','P3','P2']);
  assert.equal(result.valeur.journal.length, 3);
});

test('une suppression et une édition concurrentes exigent un choix', () => {
  const result = merge({ projets: [{ id: 'P1', nom: 'Initial' }] }, { projets: [] }, { projets: [{ id: 'P1', nom: 'Corrigé' }] });
  assert.equal(result.conflits.length, 1);
  assert.equal(result.conflits[0].iciPresent, false);
  const choices = { [result.conflits[0].cle]: 'distant' };
  assert.equal(merge({ projets: [{ id: 'P1', nom: 'Initial' }] }, { projets: [] }, { projets: [{ id: 'P1', nom: 'Corrigé' }] }, choices).valeur.projets.length, 1);
});

test('deux traces sur le même projet restent deux événements, leur id désigne le projet', () => {
  const result = merge({ journal: [] },
    { journal: [{ id:'P1', type:'projets', action:'saisie', quand:'a', detail:'Brief-back' }] },
    { journal: [{ id:'P1', type:'projets', action:'saisie', quand:'b', detail:'Brief-back' }] });
  assert.equal(result.conflits.length, 0);
  assert.equal(result.valeur.journal.length, 2);
});

test('réordonner des pages et corriger un texte conserve les deux gestes', () => {
  const base = { pages: [{ id:'a', titre:'A' }, { id:'b', titre:'B' }] };
  const local = { pages: [base.pages[1], base.pages[0]] }, remote = structuredClone(base);
  remote.pages[0].titre = 'A corrigé';
  const result = merge(base, local, remote);
  assert.equal(result.conflits.length, 0);
  assert.deepEqual(plain(result.valeur.pages.map(p => p.id)), ['b','a']);
  assert.equal(result.valeur.pages[1].titre, 'A corrigé');
});

test('deux ordres incompatibles restent à choisir sans perdre le contenu', () => {
  const base = { pages: ['a','b','c'].map(id => ({ id })) };
  const local = { pages:[base.pages[1],base.pages[0],base.pages[2]] };
  const remote = { pages:[base.pages[0],base.pages[2],base.pages[1]] };
  const result = merge(base,local,remote);
  assert.equal(result.conflits.length, 1);
  const chosen = merge(base,local,remote,{ [result.conflits[0].cle]:'ici' });
  assert.deepEqual(plain(chosen.valeur.pages.map(p => p.id)), ['b','a','c']);
});

test('un refus n’altère jamais les trois originaux', () => {
  const base = { valeur: 1 }, local = { valeur: 2 }, remote = { valeur: 3 };
  const before = JSON.stringify([base,local,remote]); merge(base,local,remote);
  assert.equal(JSON.stringify([base,local,remote]), before);
});

test('les champs spéciaux de JSON restent des données', () => {
  const remote = JSON.parse('{"__proto__":{"polluted":true},"x":1}');
  const result = merge({}, { y: 2 }, remote);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(result.valeur, '__proto__'), true);
});

/* LB3 : une entrée revenue du serveur avec son attestation n'est pas une
 * modification concurrente de l'entrée restée nue ici. */
const ATTESTATION = { par: 'la-fusee', userId: 'user-alice', nom: 'Alice Martin', at: '2026-11-11T10:00:00.000Z', empreinte: 'e'.repeat(64), sceau: 's'.repeat(64) };
test('une attestation posée par le serveur se réunit sans arbitrage, journal compris', () => {
  const base = { decisions: [], journal: [{ quand: 'a', action: 'lu' }], campagnes: [{ id: 'C1', bilanVersions: [] }] };
  const decision = { id: 'DEC-1', type: 'piste', verdict: 'approuve' };
  const ligne = { quand: 'b', action: 'création', type: 'decisions', id: 'DEC-1' };
  const version = { id: 'BIL-C1', version: 1, contenu: 'Bilan', empreinte: 'f'.repeat(64) };
  const local = { decisions: [decision], journal: [...base.journal, ligne], campagnes: [{ id: 'C1', bilanVersions: [version] }] };
  const remote = { decisions: [{ ...decision, attestation: ATTESTATION }], journal: [...base.journal, { ...ligne, attestation: ATTESTATION }],
    campagnes: [{ id: 'C1', bilanVersions: [{ ...version, attestation: ATTESTATION }] }] };
  const result = merge(base, local, remote);
  assert.equal(result.conflits.length, 0);
  assert.deepEqual(plain(result.valeur), plain(remote), 'une seule ligne de journal, attestée ; la version de bilan attestée');
  /* Une ligne ajoutée ici entre-temps reste, nue, après celles du serveur. */
  const plus = { ...local, journal: [...local.journal, { quand: 'c', action: 'ici' }] };
  const r2 = merge(base, plus, remote);
  assert.equal(r2.conflits.length, 0);
  assert.deepEqual(plain(r2.valeur.journal), [...plain(remote.journal), { quand: 'c', action: 'ici' }]);
  /* Une vraie différence de contenu reste à arbitrer. */
  const autre = { ...remote, decisions: [{ ...decision, verdict: 'hors', attestation: ATTESTATION }] };
  const local2 = { ...local, decisions: [{ ...decision, verdict: 'reserve' }] };
  assert.equal(merge(base, local2, autre).conflits.length, 1);
});
