import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

async function ouvrir() {
  const state = { marques: [{ id: 'MQ', nom: 'Marque', clientId: 'C', vault: { promesse: 'Ancienne référence', idee_directrice: 'Lecture locale', inferences: { promesse: { pourquoi: 'Ancienne hypothèse' } } }, gammes: { EVAP: { vault: { promesse: 'La gamme ensemble' } } } }], clients: [{ id: 'C', nom: 'Client', vault: {} }] };
  const c = vm.createContext({ console, Date, crypto: webcrypto, location: { pathname: '/la-barre/index.html', origin: 'https://test.invalid' }, MAISON: {}, O: { el() {} },
    DEPOT: { trouve: (type, id) => (state[type] || []).find(x => x.id === id), liste: type => state[type] || [], tracer() {}, enregistrer() {} },
  });
  c.window = c;
  vm.runInContext(await readFile(new URL('../app/vault.js', import.meta.url), 'utf8'), c);
  const context = { generatedAt: '2026-10-16T00:00:00Z', sharingMode: 'DOCUMENT_V2', brands: { MQ: { name: 'Marque courante', strategyId: 'current', url: '/cockpit/brand/fondation?strategy=current', fields: {
    'd.promesseMaitre': { value: 'Promesse courante', provenance: 'SOURCE', sourceId: 'D', sourceVersion: 29 },
    'a.prophecy': { value: { vision: 'Une ville vivante', horizon: '2029' }, provenance: 'INFERRED', sourceId: 'A', sourceVersion: 11 },
    'a.valeurs': { value: [{ valeur: 'Instinct', justification: 'Reconnue' }, { valeur: 'Communauté' }], provenance: 'UNKNOWN', sourceVersion: 11 },
  } } }, issues: [] };
  return { c, state, context };
}

test('les références courantes sont lues sans réécrire le dépôt ni lever une inférence', async () => {
  const { c, state, context } = await ouvrir(); const before = JSON.stringify(state);
  c.VAULT.connecter(context);
  assert.equal(c.VAULT.valeur('MQ', 'promesse'), 'Promesse courante');
  assert.equal(c.VAULT.inference('marque', 'MQ', 'promesse'), null);
  assert.match(c.VAULT.sourceDe('marque', 'MQ', 'promesse'), /documenté.*29/);
  assert.equal(c.VAULT.valeur('MQ', 'vision'), 'Une ville vivante');
  assert.equal(c.VAULT.inference('marque', 'MQ', 'vision').reference, true);
  assert.deepEqual(Array.from(c.VAULT.valeur('MQ', 'valeurs')), ['Instinct', 'Communauté']);
  assert.match(c.VAULT.sourceDe('marque', 'MQ', 'valeurs'), /origine à qualifier/);
  assert.equal(JSON.stringify(state), before);
});

test('la gamme spécialise sa marque et les références locales manquantes gardent leur origine', async () => {
  const { c, context } = await ouvrir(); c.VAULT.connecter(context);
  const p = { sections: { identite: { gamme: 'EVAP' } } };
  assert.equal(c.VAULT.pourDossier(p, 'MQ', 'promesse').valeur, 'La gamme ensemble');
  assert.equal(c.VAULT.valeur('MQ', 'idee_directrice'), 'Lecture locale');
  assert.match(c.VAULT.sourceDe('marque', 'MQ', 'idee_directrice'), /Référence La Barre.*absent/);
});

test('l’édition canonique reste dans son éditeur ; les autres gestes natifs restent persistants', async () => {
  const { c, state, context } = await ouvrir(); c.VAULT.connecter(context);
  assert.equal(c.VAULT.ecrireNiveau('marque', 'MQ', 'promesse', 'Écrasement'), false);
  assert.equal(c.VAULT.contresigner('marque', 'MQ', 'vision'), false);
  assert.equal(c.VAULT.ecrireNiveau('marque', 'MQ', 'idee_directrice', 'Correction locale'), true);
  assert.equal(state.marques[0].vault.idee_directrice, 'Correction locale');
  assert.equal(c.VAULT.ajouterPromo('MQ', 'Promo', 'Déclarée'), true);
  assert.equal(state.marques[0].vault.promos[0].nom, 'Promo');
  assert.equal(state.marques[0].vault.promesse, 'Ancienne référence');
});

test('un ancien lien exposé est renouvelé seulement sur le geste explicite ; la reprise ne double pas le lien', async () => {
  const { c, context } = await ouvrir(); c.VAULT.connecter(context);
  vm.runInContext(await readFile(new URL('../app/partage.js', import.meta.url), 'utf8'), c);
  const project = { id: 'P', partages: { cadrage: { jeton: 'a'.repeat(24), cree_le: '2026-10-13' } } };
  assert.equal(project.partages.cadrage.portee, undefined);
  const first = c.PARTAGE.creer(project, 'cadrage');
  assert.equal(first.portee, 'document'); assert.match(first.jeton, /^[a-f0-9]{24}$/);
  assert.equal(project.partagesRevoques.length, 1);
  assert.equal(project.partagesRevoques[0].jeton, 'a'.repeat(24));
  assert.equal(c.PARTAGE.creer(project, 'cadrage'), first);
  assert.match(c.PARTAGE.lien(first), /^https:\/\/test.invalid\/la-barre\/partage\/[a-f0-9]{24}\/document$/);
  c.PARTAGE.revoquer(project, 'cadrage');
  assert.equal(project.partages.cadrage, undefined);
});
