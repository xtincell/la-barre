// La recette des captures, sans navigateur : la liste des routes couvre tous
// les espaces, les termes interdits sont relevés juste, la planche s'écrit, et
// la sortie reste hors du dépôt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routesDe, lireArguments, planche, comparer, problemes, MODES_ATTENDUS, LARGEURS } from '../outils/recette-captures.mjs';
import { relever } from '../outils/termes-interdits.mjs';

const RACINE = fileURLToPath(new URL('../', import.meta.url));

const INVENTAIRE = {
  modes: { valider: null, planning: null, reporting: null, referentiel: null },
  natures: [{ cle: 'campagne', nom: 'Campagne', sections: ['identite', 'brief', 'livrables'] }, { cle: 'pitch', nom: 'Pitch', sections: ['identite', 'pistes'] }],
  dossiers: { campagne: 'PRJ-a' }, temoins: { pitch: 'PRO-t' },
  pieces: { attente: { p: 'PRJ-a', l: 'L-1' }, approuvee: { p: 'PRJ-a', l: 'L-2' }, historique: { p: 'PRJ-a', l: 'L-3', n: 1 }, piste: { p: 'PRJ-a', id: 'PI-1' } },
  marque: 'MQ-x', campagne: 'CMP-x', jeton: 'c0ffee', recherche: 'Nacre',
};

test('les routes couvrent chaque espace, chaque mode et chaque rubrique de chaque nature', () => {
  const { routes, manquantes } = routesDe(INVENTAIRE);
  const ids = routes.map(r => r.id);
  assert.deepEqual(manquantes, []);
  for (const id of ['bureau', 'projets/en-cours', 'projets/archives', 'projets/par-marque', 'projets/galerie', 'projets/marque', 'projets/campagne',
    'piece/poser', 'piece/juger', 'piece/origine', 'piece/remise', 'piece/version-historique', 'piece/piste',
    'plus', 'recherche', 'nouveau-projet', 'partage',
    'dossier/campagne', 'dossier/campagne/identite', 'dossier/campagne/brief', 'dossier/campagne/livrables', 'dossier/pitch', 'dossier/pitch/pistes'])
    assert.ok(ids.includes(id), id);
  for (const [vue, modes] of Object.entries(MODES_ATTENDUS)) for (const m of modes) assert.ok(ids.includes(vue + '/' + m), vue + '/' + m);
  // 2 + 4 + 5 + 8 modes, comme le plan de recette les nomme.
  assert.equal(ids.filter(id => /^(valider|planning|reporting|referentiel)\//.test(id)).length, 19);
  assert.equal(new Set(ids).size, ids.length, 'aucune route en double');
  assert.equal(routes.find(r => r.id === 'piece/version-historique').hash, '#/projets/PRJ-a/livrables/L-3/juger/1');
  assert.equal(routes.find(r => r.id === 'partage').hash, '#/partage/c0ffee');
  assert.equal(routes.find(r => r.id === 'recherche').action, 'recherche');
  assert.deepEqual(LARGEURS, [320, 390, 1440]);
});

test('les modes lus dans l’application l’emportent, et ce qui manque à la base est dit', () => {
  const { routes, manquantes } = routesDe({ ...INVENTAIRE, modes: { ...INVENTAIRE.modes, reporting: ['indicateurs', 'nouveau'] },
    marque: null, jeton: null, pieces: { attente: null, approuvee: null, historique: null, piste: null }, temoins: {} });
  const ids = routes.map(r => r.id);
  assert.ok(ids.includes('reporting/nouveau') && !ids.includes('reporting/equipe'));
  assert.ok(manquantes.includes('projets/marque') && manquantes.includes('partage') && manquantes.includes('piece/juger') && manquantes.includes('dossier/pitch'));
});

test('les termes interdits sont relevés avec les accents, sans faux positifs', () => {
  const t = relever('Rendre un verdict. Les verdicts sont opposables (§5, § 6 bis). Porte B, étage 1. Hors écart déclaré. Une étagère, un porte-voix, verdictal, une porte bleue, la porte a claqué.');
  const n = Object.fromEntries(t.map(x => [x.terme, x.nombre]));
  assert.deepEqual(n, { verdict: 2, opposable: 1, '§': 2, 'porte A/B/C': 1, 'étage': 1, 'hors écart déclaré': 1 });
  assert.ok(t[0].extraits[0].includes('verdict'));
  assert.deepEqual(relever('Valider la V2 · Demander des modifs'), []);
});

test('la sortie doit rester hors du dépôt', () => {
  assert.throws(() => lireArguments(['--sortie', RACINE]), /hors du dépôt/);
  assert.throws(() => lireArguments(['--sortie', join(RACINE, 'documents', 'captures')]), /hors du dépôt/);
  const o = lireArguments(['--sortie', resolve(RACINE, '..', 'recette-x'), '--avant']);
  assert.equal(o.dossier, resolve(RACINE, '..', 'recette-x', 'avant'));
  assert.throws(() => lireArguments(['--avant', '--apres']), /pas les deux/);
  assert.throws(() => lireArguments(['--largeurs', '320,abc']), /largeurs/);
  assert.throws(() => lireArguments(['--inconnue']), /Option inconnue/);
});

function capture(id, largeur, extra = {}) {
  return { id, espace: 'bureau', hash: '#/' + id, largeur, fichier: 'captures/' + id + '--' + largeur + '.png', titre: 'Titre <b>', exceptions: [],
    debordement: 0, termes: [], images: { premierEcran: 1, cassees: 0 }, introuvable: false, vide: false, ...extra };
}

test('la planche-contact échappe le texte et compare avant et après', () => {
  const avant = { quand: '2026-11-26', commit: 'aaa', captures: [capture('bureau', 320), capture('plus', 320)] };
  const apres = { quand: '2026-11-27', commit: 'bbb', temps: 'apres', largeurs: [320], base: { fichier: 'b.json', projets: 1, livrables: 1 },
    manquantes: [], captures: [capture('bureau', 320, { debordement: 12, termes: [{ terme: 'verdict', nombre: 1, extraits: [] }] }), capture('galerie', 320)],
    resume: { routes: 2, captures: 2, exceptions: 0, debordements: 1, termes: 1, introuvables: 0, imagesCassees: 0 } };
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Titre &lt;b&gt;/);
  assert.match(html, /\.\.\/avant\/captures\/bureau--320\.png/);
  assert.match(html, /déborde de 12 px/);
  const c = comparer(avant, apres);
  assert.deepEqual(c.routesNouvelles, ['galerie']);
  assert.deepEqual(c.routesDisparues, ['plus']);
  assert.deepEqual(c.debordementsNouveaux, ['bureau@320']);
  assert.deepEqual(c.termes, { avant: 0, apres: 1 });
  assert.deepEqual(problemes(capture('x', 320)), []);
});
