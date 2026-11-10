import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Le registre du Radar se relève, il ne se saisit pas : pour chaque brief entré
 * là-bas, il dit s'il existe ici de quoi le suivre. Ces tests lisent les états
 * et le bilan tels qu'ils sont calculés aujourd'hui. */

async function atelier(radar = [], projets = []) {
  const data = { radar, projets };
  const ctx = vm.createContext({ Date, console,
    MAISON: { postes: [], registres: { radar: 'Radar' } },
    DEPOT: { liste: k => data[k] || [], trouve: (k, id) => (data[k] || []).find(x => x.id === id) || null,
      tout: () => data },
  });
  ctx.window = ctx;
  for (const name of ['outils', 'registre-radar']) {
    vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  }
  return { R: ctx.REGISTRE_RADAR, ctx, data };
}

const projets = [
  { id: 'P-1', ref: 'FRC-REC', livrables: [{ id: 'L-1' }, { id: 'L-2' }, { id: 'L-3', annule: true }] },
  { id: 'P-un', ref: 'UN-REC', livrables: [{ id: 'L-4' }] },
  { id: 'P-vide', ref: 'VIDE-REC' },
];

test('un enregistrement malformé est montré tel quel, avant toute autre lecture', async () => {
  const { R } = await atelier([], projets);
  const e = R.etat({ ndeg: 'FRC-059.T2b', malforme: true, entree: 'Doublon', projetId: 'P-1', statut: 'En cours' });
  assert.equal(e.cle, 'malforme'); assert.equal(e.ton, 'alerte');
  assert.match(e.quoi, /interverties à la source/); assert.match(e.quoi, /Rien n'a été corrigé ici/);
});

test('un doublon marqué par le Radar n’est pas ingéré, avec ou sans son original', async () => {
  const { R } = await atelier([], projets);
  const avec = R.etat({ ndeg: 'D-1', entree: 'Doublon', rattache: 'FRC-001', projetId: 'P-1' });
  assert.equal(avec.cle, 'doublon'); assert.equal(avec.ton, 'terne');
  assert.equal(avec.quoi, "Le Radar l'a marqué doublon de FRC-001. Non ingéré.");
  assert.equal(R.etat({ ndeg: 'D-2', entree: 'Doublon' }).quoi, "Le Radar l'a marqué doublon. Non ingéré.");
});

test('un brief rattaché à un dossier est suivi ici, quel que soit son statut au Radar', async () => {
  const { R } = await atelier([], projets);
  const deux = R.etat({ ndeg: 'S-1', projetId: 'P-1', statut: 'Bouclé' });
  assert.equal(deux.cle, 'suivi'); assert.equal(deux.ton, 'vert');
  assert.equal(deux.quoi, 'FRC-REC  ·  2 livrables', 'un livrable annulé ne compte pas');
  assert.equal(R.etat({ ndeg: 'S-2', projetId: 'P-un' }).quoi, 'UN-REC  ·  1 livrable');
  assert.equal(R.etat({ ndeg: 'S-3', projetId: 'P-vide' }).quoi, 'VIDE-REC  ·  aucun livrable encore');
  const absent = R.etat({ ndeg: 'S-4', projetId: 'P-absent' });
  assert.equal(absent.cle, 'suivi');
  assert.equal(absent.quoi, 'P-absent  ·  aucun livrable encore', 'un dossier introuvable garde son identifiant');
});

test('un brief que le Radar donne pour fini, ou sans statut, n’appelle rien', async () => {
  const { R } = await atelier();
  const fini = R.etat({ ndeg: 'H-1', statut: 'Bouclé' });
  assert.equal(fini.cle, 'hors'); assert.equal(fini.nom, 'Bouclé'); assert.equal(fini.ton, 'terne');
  assert.match(fini.quoi, /le Radar le donne pour fini/);
  const muet = R.etat({ ndeg: 'H-2' });
  assert.equal(muet.cle, 'hors'); assert.equal(muet.nom, 'sans statut');
});

test('un brief vivant sans dossier est aveugle, en alerte quand il est sous sa responsabilité', async () => {
  const { R, ctx } = await atelier();
  for (const statut of ['En cours', 'Reçu', 'Frozen', 'Bloqué', 'En attente client', 'Création KV']) {
    assert.equal(R.etat({ ndeg: 'A', statut }).cle, 'aveugle', statut);
  }
  const sien = R.etat({ ndeg: 'A-1', statut: 'En cours', sienne: true, recu: '2026-09-15' });
  assert.equal(sien.cle, 'aveugle'); assert.equal(sien.nom, 'aucun dossier ici'); assert.equal(sien.ton, 'alerte');
  assert.equal(sien.quoi, 'En cours  ·  reçu le ' + ctx.O.jourCourt('2026-09-15') + '  ·  sous sa responsabilité directe');
  const autre = R.etat({ ndeg: 'A-2', statut: 'Bloqué' });
  assert.equal(autre.ton, 'attente'); assert.equal(autre.quoi, 'Bloqué');
});

test('le bilan du registre compte chaque brief une fois, dans son état', async () => {
  const radar = [
    { ndeg: 'M-1', entree: 'Maître', projetId: 'P-1', statut: 'En cours', sienne: true },
    { ndeg: 'T-1', entree: 'Tâche', rattache: 'M-1', statut: 'En cours', sienne: true },
    { ndeg: 'T-2', entree: 'Tâche', rattache: 'M-1', statut: 'Bouclé' },
    { ndeg: 'D-1', entree: 'Doublon', rattache: 'M-1', sienne: true },
    { ndeg: 'X-1', malforme: true, entree: 'M-1', rattache: 'Tâche' },
    { ndeg: 'A-1', entree: 'Maître', statut: 'Bloqué' },
  ];
  const { R } = await atelier(radar, projets);
  assert.deepEqual({ ...R.bilan() }, { total: 6, suivis: 1, aveugles: 2, hors: 1, doublons: 1, malformes: 1,
    siens: 3, siensAveugles: 1, maitres: 2, taches: 2 });
});

test('ce que le registre met en tête : d’abord le sien qui tourne sans dossier, puis le reste', async () => {
  assert.equal((await atelier()).R.pire().t, 'Aucun relevé du Radar');

  const sien = await atelier([{ ndeg: 'A-1', statut: 'En cours', sienne: true },
    { ndeg: 'A-2', statut: 'Reçu' }]);
  assert.equal(sien.R.pire().t, '1 brief sous sa responsabilité tourne sans dossier ici');
  const siens = await atelier([{ ndeg: 'A-1', statut: 'En cours', sienne: true },
    { ndeg: 'A-2', statut: 'Reçu', sienne: true }]);
  assert.equal(siens.R.pire().t, '2 briefs sous sa responsabilité tournent sans dossier ici');

  const autres = await atelier([{ ndeg: 'A-1', statut: 'En cours' }, { ndeg: 'A-2', statut: 'Bloqué' },
    { ndeg: 'D-1', entree: 'Doublon', sienne: true }]);
  assert.equal(autres.R.pire().t, '2 briefs vivants sans dossier ici');
  assert.equal((await atelier([{ ndeg: 'A-1', statut: 'En cours' }])).R.pire().t, '1 brief vivant sans dossier ici');

  const calme = await atelier([{ ndeg: 'S-1', projetId: 'P-1' }, { ndeg: 'S-2', projetId: 'P-un', statut: 'En cours' },
    { ndeg: 'H-1', statut: 'Bouclé' }, { ndeg: 'H-2', statut: 'Livré' }, { ndeg: 'D-1', entree: 'Doublon' }], projets);
  const p = calme.R.pire();
  assert.equal(p.t, 'Tout ce qui tourne est suivi');
  assert.equal(p.q, '2 briefs ont leur dossier ici ; les 2 autres sont donnés pour finis au Radar.');
});

test('la liste est celle du dépôt, relue à chaque appel', async () => {
  const { R, data } = await atelier([{ ndeg: 'A-1', statut: 'En cours' }]);
  assert.equal(R.liste().length, 1);
  data.radar.push({ ndeg: 'S-1', projetId: 'P-1' });
  assert.equal(R.bilan().total, 2); assert.equal(R.bilan().suivis, 1);
});
