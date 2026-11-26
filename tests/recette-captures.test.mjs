// La recette des captures, sans navigateur : la liste des routes couvre tous
// les espaces, les termes interdits sont relevés juste, la planche s'écrit, et
// la sortie reste hors du dépôt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routesDe, lireArguments, planche, comparer, restreindre, problemes, preparerSortie, pluriel, dateLisible,
  MODES_ATTENDUS, LARGEURS, MARQUE } from '../outils/recette-captures.mjs';
import { relever, VALEURS_TECHNIQUES } from '../outils/termes-interdits.mjs';

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
    'plus', 'recherche', 'nouveau-projet', 'demande', 'partage',
    'dossier/campagne', 'dossier/campagne/identite', 'dossier/campagne/brief', 'dossier/campagne/livrables', 'dossier/pitch', 'dossier/pitch/pistes'])
    assert.ok(ids.includes(id), id);
  for (const [vue, modes] of Object.entries(MODES_ATTENDUS)) for (const m of modes) assert.ok(ids.includes(vue + '/' + m), vue + '/' + m);
  // 2 + 4 + 5 + 8 modes, comme le plan de recette les nomme.
  assert.equal(ids.filter(id => /^(valider|planning|reporting|referentiel)\//.test(id)).length, 19);
  assert.equal(new Set(ids).size, ids.length, 'aucune route en double');
  assert.equal(routes.find(r => r.id === 'piece/version-historique').hash, '#/projets/PRJ-a/livrables/L-3/juger/1');
  assert.equal(routes.find(r => r.id === 'partage').hash, '#/partage/c0ffee');
  assert.equal(routes.find(r => r.id === 'recherche').action, 'recherche');
  // Le formulaire de demande s'ouvre depuis les pistes : ici, le projet témoin du pitch.
  assert.deepEqual(routes.find(r => r.id === 'demande'), { id: 'demande', espace: 'demande', hash: '#/projets/PRO-t/pistes',
    nom: 'Demande de proposition ouverte', action: 'demande', cible: 'PRO-t' });
  assert.deepEqual(LARGEURS, [320, 390, 1440]);
});

test('les modes lus dans l’application l’emportent, et ce qui manque à la base est dit', () => {
  const { routes, manquantes } = routesDe({ ...INVENTAIRE, modes: { ...INVENTAIRE.modes, reporting: ['indicateurs', 'nouveau'] },
    marque: null, jeton: null, pieces: { attente: null, approuvee: null, historique: null, piste: null }, temoins: {} });
  const ids = routes.map(r => r.id);
  assert.ok(ids.includes('reporting/nouveau') && !ids.includes('reporting/equipe'));
  assert.ok(manquantes.includes('projets/marque') && manquantes.includes('partage') && manquantes.includes('piece/juger') && manquantes.includes('dossier/pitch'));
  assert.ok(manquantes.includes('demande'), 'aucun dossier n’a de pistes : la demande n’est pas inventée');
});

test('les termes interdits sont relevés avec les accents, sans faux positifs', () => {
  const t = relever('Rendre un verdict. Les verdicts sont opposables (§5, § 6 bis). Porte B, étage 1. Hors écart déclaré. Une étagère, un porte-voix, verdictal, une porte bleue, la porte a claqué.');
  const n = Object.fromEntries(t.map(x => [x.terme, x.nombre]));
  assert.deepEqual(n, { verdict: 2, opposable: 1, '§': 2, 'porte A/B/C': 1, 'étage': 1, 'hors écart déclaré': 1 });
  assert.ok(t[0].extraits[0].includes('verdict'));
  assert.deepEqual(relever('Valider la V2 · Demander des modifs'), []);
});

test('« étage » et « porte » sont relevés partout où la doctrine les emploie, pas dans la langue courante', () => {
  const n = Object.fromEntries(relever("Étage autorisé. Étage non fixé. Étage cohérent avec la plateforme. Une demande à l'étage 1. L’étage plafonné.").map(x => [x.terme, x.nombre]));
  assert.deepEqual(n, { 'étage': 5 });
  // Les phrases que l'écran montre vraiment (premier écran d'un dossier, d'une pièce, des Ressources).
  for (const phrase of ['Intercalaire : tire l’étage qui commence : cadrage, conception, pistes, suite', 'un étage reste à franchir',
    '3 étages restent à franchir', 'Un seul étage sur ce support', 'Une école par étage', 'L’école qui gouverne chaque étage'])
    assert.deepEqual(relever(phrase).map(x => x.terme), ['étage'], phrase);
  // « La porte » et son compteur, même collé au mot suivant comme à l'écran.
  assert.deepEqual(Object.fromEntries(relever('La porte 0 sur 1un étage reste à franchir').map(x => [x.terme, x.nombre])), { 'porte A/B/C': 1, 'étage': 1 });
  assert.deepEqual(relever('Une étagère, un étage de bureaux, les étages du siège, la porte a claqué, une porte bleue, 0 sur 1.'), []);
});

test('les valeurs techniques affichées sont relevées, sensibles à la casse', () => {
  const n = Object.fromEntries(relever('Fermée par : undefined · 4 NaN j · [object Object] · null · Invalid Date', VALEURS_TECHNIQUES).map(x => [x.terme, x.nombre]));
  assert.deepEqual(n, { undefined: 1, null: 1, NaN: 1, '[object Object]': 1, 'Invalid Date': 1 });
  assert.deepEqual(relever('Nulle part, Nan Diallo, une valeur nulle, indéfini.', VALEURS_TECHNIQUES), []);
});

test('la sortie doit rester hors du dépôt', () => {
  assert.throws(() => lireArguments(['--sortie', RACINE]), /hors du dépôt/);
  assert.throws(() => lireArguments(['--sortie', join(RACINE, 'documents', 'captures')]), /hors du dépôt/);
  const o = lireArguments(['--sortie', resolve(RACINE, '..', 'recette-x'), '--avant']);
  assert.equal(o.dossier, resolve(RACINE, '..', 'recette-x', 'avant'));
  assert.throws(() => lireArguments(['--avant', '--apres']), /pas les deux/);
  assert.throws(() => lireArguments(['--largeurs', '320,abc']), /largeurs/);
  assert.throws(() => lireArguments(['--inconnue']), /Option inconnue/);
  assert.throws(() => lireArguments(['--routes', '(']), /expression régulière/);
  assert.equal(lireArguments(['--routes', '^bureau']).filtre, '^bureau');
});

test('un dossier qui ne vient pas d’une recette n’est jamais vidé', async () => {
  const d = await mkdtemp(join(tmpdir(), 'recette-sortie-'));
  try {
    // Un dossier personnel qui aurait un sous-dossier « captures » : refusé, intact.
    await mkdir(join(d, 'captures'));
    await writeFile(join(d, 'captures', 'vacances.png'), 'x');
    await assert.rejects(preparerSortie(d), /ne vient pas d’une recette/);
    assert.ok(existsSync(join(d, 'captures', 'vacances.png')));
    // Une sortie de recette (captures.json à côté) : vidée, puis marquée.
    await writeFile(join(d, 'captures.json'), '{}');
    await mkdir(join(d, 'cibles'));
    await preparerSortie(d);
    assert.deepEqual(await readdir(join(d, 'captures')), [MARQUE]);
    assert.ok(!existsSync(join(d, 'cibles')));
    // La marque suffit, même sans captures.json (une passe interrompue).
    await rm(join(d, 'captures.json'));
    await writeFile(join(d, 'captures', 'bureau--320.png'), 'x');
    await preparerSortie(d);
    assert.deepEqual(await readdir(join(d, 'captures')), [MARQUE]);
    // Un dossier neuf : rien à vider.
    await preparerSortie(join(d, 'neuf'));
    assert.ok(existsSync(join(d, 'neuf', 'captures', MARQUE)));
  } finally { await rm(d, { recursive: true, force: true }); }
});

function capture(id, largeur, extra = {}) {
  return { id, espace: 'bureau', hash: '#/' + id, largeur, fichier: 'captures/' + id + '--' + largeur + '.png', titre: 'Titre <b>', exceptions: [],
    debordement: 0, termes: [], termesReplies: [], valeurs: [], coupes: { nombre: 0, exemples: [] }, horsEcran: { nombre: 0, exemples: [] },
    images: { premierEcran: 1, cassees: 0 }, introuvable: false, vide: false, empreinte: 'e-' + id + '-' + largeur, ...extra };
}
const VERDICT = { terme: 'verdict', nombre: 1, extraits: ['…Rendre un verdict…'] };
const PORTE = { terme: 'porte A/B/C', nombre: 2, extraits: ['…la porte A se ferme…'] };

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

test('les termes repliés, les textes coupés, les contrôles hors écran et les valeurs techniques comptent', () => {
  const avant = { captures: [capture('piece', 320), capture('piece', 1440, { termesReplies: [PORTE] })] };
  const apres = { captures: [
    capture('piece', 320, { termesReplies: [PORTE], coupes: { nombre: 1, exemples: [{ selecteur: 'span.etat', texte: 'le projet peut…', px: 35 }] },
      horsEcran: { nombre: 1, exemples: [{ selecteur: 'button.panneau-fermer', texte: '✕' }] } }),
    capture('piece', 1440, { termesReplies: [PORTE], valeurs: [{ terme: 'undefined', nombre: 1, extraits: ['Fermée par : undefined'] }] }),
  ] };
  const c = comparer(avant, apres);
  assert.deepEqual(c.termesReplies, { avant: 2, apres: 4 });
  assert.deepEqual(c.coupesNouvelles, ['piece@320']);
  assert.deepEqual(c.horsEcranNouveaux, ['piece@320']);
  assert.deepEqual(c.valeursNouvelles, ['piece@1440']);
  const p = Object.fromEntries(problemes(apres.captures[0]).map(([k, t, e]) => [k, [t, e]]));
  assert.deepEqual(p.replie, ['replié : porte A/B/C ×2', '…la porte A se ferme…']);
  assert.deepEqual(p.coupe, ['1 texte coupé', 'le projet peut… · span.etat']);
  assert.deepEqual(p['hors-ecran'], ['1 contrôle hors écran', '✕ · button.panneau-fermer']);
  assert.equal(problemes(apres.captures[1])[0][1], 'affiche « undefined »');
  // Une passe « avant » d'avant cet outil n'a pas de termes repliés : c'est dit, pas compté à zéro.
  assert.equal(comparer({ captures: [{ ...capture('piece', 320), termesReplies: undefined }] }, apres).termesReplies.avant, null);
});

test('avec --routes, la comparaison ne confronte que les routes filtrées', () => {
  const avant = { captures: ['bureau', 'valider/file', 'plus', 'reporting/bilan'].map(id => capture(id, 320, { termes: [VERDICT] })) };
  const apres = { filtre: '^(bureau|valider/)', captures: ['bureau', 'valider/file'].map(id => capture(id, 320, { termes: [VERDICT] })) };
  const brut = comparer(avant, apres);
  assert.deepEqual(brut.routesDisparues, ['plus', 'reporting/bilan'], 'sans restriction, la comparaison serait fausse');
  const c = comparer(restreindre(avant, /^(bureau|valider\/)/), restreindre(apres, null));
  assert.deepEqual(c.routesDisparues, []);
  assert.deepEqual(c.termes, { avant: 2, apres: 2 });
  // Et dans l'autre sens : une passe « avant » filtrée ne fait pas apparaître de routes nouvelles.
  const d = comparer(restreindre({ captures: avant.captures.slice(0, 2), filtre: '^(bureau|valider/)' }, null), restreindre({ captures: avant.captures }, '^(bureau|valider/)'));
  assert.deepEqual(d.routesNouvelles, []);
});

test('la planche « après » dit ce qui a changé, et laisse le lissage de côté', () => {
  const avant = { quand: '2026-11-26T08:00:00.000Z', commit: 'aaa', captures: [
    capture('bureau', 320), capture('bureau', 1440), capture('plus', 320), capture('partage', 320)] };
  const apres = { quand: '2026-11-26T14:07:25.070Z', commit: 'bbb', temps: 'apres', largeurs: [320, 1440], base: { fichier: 'base-fictive.json', projets: 2, livrables: 1 },
    manquantes: [], captures: [
      capture('bureau', 320, { empreinte: 'autre', ecart: { pixels: 1200, max: 255 }, termes: [VERDICT] }),
      capture('bureau', 1440, { termes: [VERDICT] }),
      capture('plus', 320),
      capture('partage', 320, { empreinte: 'lisse', ecart: { pixels: 0, max: 2 } })],
    resume: { routes: 3, captures: 4, exceptions: 0, debordements: 0, coupes: 0, horsEcran: 0, valeurs: 0, termes: 2, termesReplies: 0, introuvables: 0, imagesCassees: 1 } };
  const c = comparer(avant, apres);
  assert.deepEqual(c.modifiees, ['bureau@320']);
  assert.equal(c.identiques, 2);
  assert.equal(c.identiquesALOeil, 1);
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /Ce qui a changé depuis la passe « avant »/);
  assert.match(html, /<b>1 capture modifiée<\/b>, 3 identiques \(dont 1 à l’œil seulement/);
  assert.match(html, /<article id="bureau" class="modifiee">/);
  assert.match(html, /<article id="plus">/);
  assert.match(html, /badge etat modifiee">modifiée · 1\u202f200 px|badge etat modifiee">modifiée · 1 200 px/);
  assert.match(html, /badge etat quasi">identique à l’œil/);
  assert.match(html, /id="seulement"/);
  // Lisible par quelqu'un du métier : date en clair, base nommée une fois, pluriels accordés.
  assert.doesNotMatch(html, /2026-11-26T14:07/);
  assert.match(html, /Le 26 novembre 2026 à \d{2}:\d{2}/);
  assert.match(html, /base fictive \(base-fictive\.json\), 2 projets et 1 pièce/);
  assert.doesNotMatch(html, /\(s\)/);
  assert.match(html, /0 exception</);
  assert.match(html, /1 image cassée</);
  // « À regarder » : une entrée par route, ses largeurs et sa première phrase.
  assert.match(html, /À regarder : 1 route/);
  assert.match(html, /<li><a href="#bureau">bureau<\/a><ul><li><span class="badge terme">verdict<\/span> à 320 et 1440 px : <q>…Rendre un verdict…<\/q><\/li><\/ul><\/li>/);
});

test('la planche montre la planche cible assez grande, et les pluriels justes', () => {
  assert.equal(pluriel(0, 'exception'), '0 exception');
  assert.equal(pluriel(2, 'texte coupé', 'textes coupés'), '2 textes coupés');
  assert.equal(dateLisible('2026-11-26'), '26 novembre 2026');
  const r = { quand: '2026-11-26', largeurs: [320], base: { fichier: 'copie.json', projets: 1, livrables: 3 }, manquantes: [], captures: [capture('bureau', 320)],
    resume: { routes: 1, captures: 1, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 } };
  const html = planche(r, { dossier: '/tmp/r', cibles: { bureau: '/tmp/r/cibles/01-bureau-projets.png' } });
  assert.match(html, /\.cible img\{[^}]*height:160px/);
  assert.match(html, /\.cible span\{white-space:nowrap\}/);
  assert.match(html, /base copie\.json, 1 projet et 3 pièces/);
  assert.match(html, /vue de téléphone tactile/);
  assert.match(html, /Aucune exception, aucun débordement/);
});
