import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

async function completer(proposition, vault = {}) {
  const root = await mkdtemp(join(tmpdir(), 'barre-provenances-'));
  try {
    const outils = join(root, 'outils');
    await mkdir(join(outils, 'plateformes-2026'), { recursive: true });
    await copyFile(new URL('../outils/completer-plateformes-2026.py', import.meta.url), join(outils, 'completer.py'));
    const input = { marques: [{ id: 'spawt-app', nom: 'SPAWT — application', vault }], clients: [], journal: [] };
    const source = join(root, 'source.json'), output = join(root, 'sortie.json');
    await writeFile(source, JSON.stringify(input));
    await writeFile(join(outils, 'plateformes-2026', 'lot.json'), JSON.stringify({
      _sources: { motion: 'Motion19 — Brand Book', spawt: 'SPAWT — plateforme', hotel: 'Akwa Palace — intake' },
      'spawt-app': proposition,
    }));
    const run = spawnSync('python3', [join(outils, 'completer.py'), source, output], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(await readFile(source, 'utf8')), input, 'le dépôt source reste intact');
    const result = JSON.parse(await readFile(output, 'utf8'));
    return { result, vault: result.marques[0].vault };
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('une inférence sans motif ne cite pas les documents des autres marques du lot', async () => {
  const { vault, result } = await completer({ infere: { positionnement: 'La surface mobile de SPAWT' } });
  assert.doesNotMatch(vault.inferences.positionnement.pourquoi, /Motion19|Akwa Palace|SPAWT — plateforme/);
  assert.match(vault.inferences.positionnement.pourquoi, /provenance.*qualifier/i);
  assert.doesNotMatch(JSON.stringify(result.journal), /Motion19|Akwa Palace|SPAWT — plateforme/);
});

test('la source d’une valeur reçue ne prouve pas un autre champ inféré', async () => {
  const { vault } = await completer({ recu: { vision: ['Une ville à la fois', 'spawt'] }, infere: { positionnement: 'La surface mobile' } });
  assert.equal(vault.sources.vision, 'SPAWT — plateforme');
  assert.doesNotMatch(vault.inferences.positionnement.pourquoi, /SPAWT — plateforme/);
});

test('chaque inférence conserve son motif précis, selon le format existant', async () => {
  const { vault } = await completer({
    infere: { positionnement: 'La surface mobile', promesse: 'Découvrir un lieu' },
    inferences: { positionnement: { pourquoi: 'Déduit du rôle de l’application dans la plateforme SPAWT.' }, promesse: { pourquoi: 'Hypothèse issue du parcours de découverte, à confirmer.' } },
  });
  assert.equal(vault.inferences.positionnement.pourquoi, 'Déduit du rôle de l’application dans la plateforme SPAWT.');
  assert.equal(vault.inferences.promesse.pourquoi, 'Hypothèse issue du parcours de découverte, à confirmer.');
  assert.equal(vault.sources?.positionnement, undefined);
});

test('un motif explicite commun reste possible sans citation fabriquée', async () => {
  const { vault } = await completer({ motif: 'L’application porte le socle SPAWT ; hypothèse à confirmer.', infere: { positionnement: 'La surface mobile' } });
  assert.equal(vault.inferences.positionnement.pourquoi, 'L’application porte le socle SPAWT ; hypothèse à confirmer.');
});

test('un motif vide ou mal typé reste à qualifier sans citation automatique', async () => {
  const { vault } = await completer({
    infere: { vision: 'Hypothèse', promesse: 'Autre hypothèse' }, motif: '  ',
    inferences: { vision: { pourquoi: [] }, promesse: { pourquoi: '' } },
  });
  for (const value of Object.values(vault.inferences)) {
    assert.match(value.pourquoi, /provenance.*qualifier/i);
    assert.doesNotMatch(value.pourquoi, /Motion19|Akwa Palace/);
  }
});

test('la reprise ne réécrit pas une valeur ou sa provenance déjà enregistrée', async () => {
  const initial = { positionnement: 'Choix humain', inferences: { positionnement: { pourquoi: 'Historique à rapprocher', quand: '2026-09-30', par: 'creation' } } };
  const { vault, result } = await completer({ infere: { positionnement: 'Autre choix' }, motif: 'Nouvelle hypothèse' }, initial);
  assert.deepEqual(vault.inferences, initial.inferences);
  assert.equal(vault.positionnement, 'Choix humain');
  assert.deepEqual(result.journal, []);
});

test('une valeur reçue remplace une inférence en conservant sa révision', async () => {
  const { vault } = await completer({ recu: { positionnement: ['Valeur du document', 'spawt'] } }, {
    positionnement: 'Ancienne hypothèse', inferences: { positionnement: { pourquoi: 'Hypothèse précédente' } },
  });
  assert.equal(vault.positionnement, 'Valeur du document');
  assert.equal(vault.sources.positionnement, 'SPAWT — plateforme');
  assert.equal(vault.inferences.positionnement, undefined);
  assert.equal(vault.revisions[0].avant, 'Ancienne hypothèse');
  assert.equal(vault.inferencesLevees[0].inference.pourquoi, 'Hypothèse précédente');
});
