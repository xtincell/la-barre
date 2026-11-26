// La recette des captures, sans navigateur : la liste des routes couvre tous
// les espaces, les termes interdits sont relevés juste, la planche s'écrit, et
// la sortie reste hors du dépôt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routesDe, lireArguments, planche, comparer, restreindre, problemes, preparerSortie, pluriel, dateLisible,
  sortieParDefaut, typographie, aLOeil, versionMesure, causes, heureDuPoste, texteDeLaPage, ouChange, decrireNuance,
  MODES_ATTENDUS, LARGEURS, MARQUE, OUTIL, ECART, ONGLETS_PIECE } from '../outils/recette-captures.mjs';
import { relever, extrait, VALEURS_TECHNIQUES } from '../outils/termes-interdits.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executer = promisify(execFile);
const OUTIL_CHEMIN = fileURLToPath(new URL('../outils/recette-captures.mjs', import.meta.url));

const RACINE = fileURLToPath(new URL('../', import.meta.url));

const INVENTAIRE = {
  modes: { valider: null, planning: null, reporting: null, referentiel: null }, nomsSections: { pistes: 'Pistes créatives' },
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
  // Chaque écran porte un nom qu'une personne du métier reconnaît.
  assert.equal(routes.find(r => r.id === 'dossier/pitch/pistes').nom, 'Pitch · Pistes créatives');
  assert.equal(routes.find(r => r.id === 'referentiel/doctrine').nom, 'Ressources · doctrine');
  // Les onglets d'une pièce, nommés comme l'application les affiche, sans terme interdit.
  assert.equal(routes.find(r => r.id === 'piece/poser').nom, 'Pièce · Visuels et fichiers');
  assert.equal(routes.find(r => r.id === 'piece/juger').nom, 'Pièce · Critères et décision');
  assert.equal(routes.find(r => r.id === 'piece/origine').nom, 'Pièce · Versions et dépendances');
  assert.equal(routes.find(r => r.id === 'piece/remise').nom, 'Pièce · BAT et remise');
  assert.equal(routes.find(r => r.id === 'piece/version-historique').nom, 'Pièce · Critères et décision, version précédente');
  assert.deepEqual(Object.keys(ONGLETS_PIECE), ['poser', 'juger', 'origine', 'remise']);
  assert.deepEqual(relever(routes.map(r => r.nom).join('\n')), [], 'aucun nom d’écran ne porte de terme interdit');
  // Recopiés de l'application, qui ne les expose pas : ils doivent rester les siens, « verdict » mis à part.
  const source = readFileSync(join(RACINE, 'app', 'vue-asset.js'), 'utf8');
  const onglets = Object.fromEntries([...source.matchAll(/\{ cle: "(\w+)", nom: "([^"]+)" \}/g)].map(m => [m[1], m[2]]));
  assert.deepEqual(Object.keys(onglets), Object.keys(ONGLETS_PIECE));
  for (const [cle, nom] of Object.entries(onglets)) assert.equal(ONGLETS_PIECE[cle], nom.replace(/verdict/g, 'décision'), cle);
});

test('les modes lus dans l’application l’emportent, et ce qui manque à la base est dit', () => {
  const { routes, manquantes } = routesDe({ ...INVENTAIRE, modes: { ...INVENTAIRE.modes, reporting: ['indicateurs', 'nouveau'],
    referentiel: [{ cle: 'doctrine', nom: 'Doctrine' }] },
    marque: null, jeton: null, pieces: { attente: null, approuvee: null, historique: null, piste: null }, temoins: {} });
  const ids = routes.map(r => r.id);
  assert.ok(ids.includes('reporting/nouveau') && !ids.includes('reporting/equipe'));
  assert.equal(routes.find(r => r.id === 'referentiel/doctrine').nom, 'Ressources · Doctrine');
  assert.ok(manquantes.includes('projets/marque') && manquantes.includes('partage') && manquantes.includes('piece/juger') && manquantes.includes('dossier/pitch'));
  assert.ok(manquantes.includes('demande'), 'aucun dossier n’a de pistes : la demande n’est pas inventée');
});

test('les termes interdits sont relevés avec les accents, sans faux positifs', () => {
  const t = relever('Rendre un verdict. Les verdicts sont opposables (§5, § 6 bis). Porte B, étage 1. Hors écart déclaré. Une étagère, un porte-voix, verdictal, une porte bleue, la porte a claqué.');
  const n = Object.fromEntries(t.map(x => [x.terme, x.nombre]));
  assert.deepEqual(n, { verdict: 2, opposable: 1, '§': 2, 'porte A/B/C': 1, 'étage': 1, 'hors écart déclaré': 1 });
  assert.ok(t[0].extraits[0].includes('verdict'));
  assert.deepEqual(relever('Valider la V2 · Demander des modifs'), []);
  // L'extrait se coupe entre deux mots, jamais au milieu d'un mot.
  assert.deepEqual(relever('Le bureau du jeudi 26 novembre 2026 : rendre un verdict sur la V2 avant midi, sans faute ni retard.')[0].extraits,
    ['…26 novembre 2026 : rendre un verdict sur la V2 avant midi, sans…']);
  assert.equal(extrait('verdict', 0, 7), 'verdict');
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

test('la sortie par défaut est propre à la branche, et une passe faite depuis un export se nomme', () => {
  assert.equal(sortieParDefaut('adoption/11-valider-dire', 'abc1234'), resolve(RACINE, '..', 'recette-adoption', 'adoption-11-valider-dire'));
  // Un commit détaché, ou un export sans git.
  assert.equal(sortieParDefaut('HEAD', '848a1ed'), resolve(RACINE, '..', 'recette-adoption', 'commit-848a1ed'));
  assert.equal(sortieParDefaut(null, null), resolve(RACINE, '..', 'recette-adoption', 'hors-git'));
  assert.equal(lireArguments(['--commit', '848a1ed', '--sortie', resolve(RACINE, '..', 'r')]).commit, '848a1ed');
  assert.throws(() => lireArguments(['--commit', 'main; rm']), /--commit/);
  assert.match(lireArguments([]).sortie, /recette-adoption[\\/][^\\/]+$/);
  assert.equal(lireArguments(['--ou']).ou, true);
  // La page entière par défaut ; le premier écran seulement sur demande.
  assert.equal(lireArguments([]).pleinePage, true);
  assert.equal(lireArguments(['--premier-ecran']).pleinePage, false);
  assert.equal(lireArguments(['--pleine-page']).pleinePage, true);
  // L'horloge par défaut : l'heure du poste, à la minute, au format de --horloge.
  assert.equal(heureDuPoste(new Date(2026, 10, 26, 9, 5, 42)), '2026-11-26T09:05:00');
  assert.equal(lireArguments([]).horloge, null, 'fixée au lancement : celle de l’avant, ou l’heure du poste');
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
    // Une planche et un captures.json qui ne viennent pas d'une recette : refusés, intacts.
    const autre = join(d, 'autre');
    await mkdir(autre);
    await writeFile(join(autre, 'index.html'), '<p>Mon site</p>');
    await writeFile(join(autre, 'captures.json'), '{}');
    await assert.rejects(preparerSortie(autre), /contient déjà index\.html et captures\.json, qui ne vient pas d’une recette/);
    assert.equal(await readFile(join(autre, 'index.html'), 'utf8'), '<p>Mon site</p>');
    // Une sortie de recette (captures.json de cet outil à côté) : vidée, puis marquée.
    await writeFile(join(d, 'captures.json'), JSON.stringify({ outil: OUTIL }));
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
const MESURE = { version: 'v-test', contexte: { postes: { telephone: { deviceScaleFactor: 2 } }, sous: 768, pleinePage: false } };
/* Un écart de pixels tel que ecartDePixels le rend, sur un écran de 1 000 000 px. */
function ecart(hors, images = { pixels: 0, max: 0 }) {
  const pixels = hors.pixels + images.pixels;
  return { pixels, total: 1e6, part: pixels / 1e6, max: Math.max(hors.max, images.max), hors, images };
}

test('la planche-contact échappe le texte et compare avant et après', () => {
  const avant = { quand: '2026-11-26', commit: 'aaa', mesure: MESURE, captures: [capture('bureau', 320), capture('plus', 320)] };
  const apres = { quand: '2026-11-27', commit: 'bbb', mesure: MESURE, temps: 'apres', largeurs: [320], base: { fichier: 'b.json', projets: 1, livrables: 1 },
    manquantes: [], captures: [capture('bureau', 320, { debordement: 12, termes: [{ terme: 'verdict', nombre: 1, extraits: [] }] }), capture('galerie', 320)],
    resume: { routes: 2, captures: 2, exceptions: 0, debordements: 1, termes: 1, introuvables: 0, imagesCassees: 0 } };
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Titre &lt;b&gt;/);
  assert.match(html, /\.\.\/avant\/captures\/bureau--320\.png/);
  assert.match(html, /déborde de 12\u00a0px/);
  assert.match(html, /<meta name="generator" content="outils\/recette-captures\.mjs">/);
  const c = comparer(avant, apres);
  assert.deepEqual(c.routesNouvelles, ['galerie']);
  assert.deepEqual(c.routesDisparues, ['plus']);
  assert.deepEqual(c.debordementsNouveaux, ['bureau@320']);
  assert.deepEqual(c.termes, { avant: 0, apres: 1 });
  assert.equal(c.mesure.identique, true);
  assert.deepEqual(problemes(capture('x', 320)), []);
});

test('les termes repliés, les textes coupés, les contrôles hors écran et les valeurs techniques comptent', () => {
  const avant = { mesure: MESURE, captures: [capture('piece', 320), capture('piece', 1440, { termesReplies: [PORTE] })] };
  const apres = { mesure: MESURE, captures: [
    capture('piece', 320, { termesReplies: [PORTE], coupes: { nombre: 1, exemples: [{ selecteur: 'span.etat', texte: 'le projet peut…', px: 35 }] },
      horsEcran: { nombre: 1, exemples: [{ selecteur: 'button.panneau-fermer', texte: '✕' }] } }),
    capture('piece', 1440, { termesReplies: [PORTE], valeurs: [{ terme: 'undefined', nombre: 1, extraits: ['Fermée par : undefined'] }] }),
  ] };
  const c = comparer(avant, apres);
  assert.deepEqual(c.termesReplies, { avant: 2, apres: 4 });
  assert.deepEqual(c.coupesNouvelles, ['piece@320']);
  assert.deepEqual(c.horsEcranNouveaux, ['piece@320']);
  assert.deepEqual(c.valeursNouvelles, ['piece@1440']);
  // Le texte d'abord, le sélecteur à part : il ne sert qu'à qui corrige le code.
  const p = Object.fromEntries(problemes(apres.captures[0]).map(([k, t, e, d]) => [k, [t, e, d]]));
  assert.deepEqual(p.replie, ['replié : porte A/B/C ×2', '…la porte A se ferme…', '']);
  assert.deepEqual(p.coupe, ['1 texte coupé', 'le projet peut…', 'span.etat']);
  assert.deepEqual(p['hors-ecran'], ['1 contrôle hors écran', '✕', 'button.panneau-fermer']);
  assert.equal(problemes(apres.captures[1])[0][1], 'affiche « undefined »');
});

test('une passe « avant » d’une version plus ancienne : ce qu’elle ne mesurait pas est « non mesuré avant », et rien n’est compté comme modifié', () => {
  // L'avant de la première version de l'outil : ni contexte de téléphone, ni
  // textes coupés, ni contrôles hors écran, ni valeurs techniques, ni termes repliés.
  const ancienne = c => { const { coupes, horsEcran, valeurs, termesReplies, ...reste } = c; return reste; };
  const avant = { captures: [ancienne(capture('piece', 320, { termes: [VERDICT] })), ancienne(capture('bureau', 320))] };
  const apres = { mesure: MESURE, temps: 'apres', largeurs: [320], base: { fichier: 'base-fictive.json', projets: 1, livrables: 1 }, manquantes: [],
    resume: { routes: 2, captures: 2, exceptions: 0, debordements: 0, termes: 1, introuvables: 0, imagesCassees: 0 },
    captures: [
      capture('piece', 320, { termes: [VERDICT, PORTE], empreinte: 'autre', ecart: { pixels: null },
        coupes: { nombre: 1, exemples: [{ selecteur: 'span.etat', texte: 'le projet peut…', px: 35 }] },
        horsEcran: { nombre: 1, exemples: [{ selecteur: 'button', texte: '✕' }] }, valeurs: [{ terme: 'undefined', nombre: 1, extraits: ['x'] }] }),
      capture('bureau', 320)] };
  const c = comparer(avant, apres);
  assert.equal(c.coupesNouvelles, null);
  assert.equal(c.horsEcranNouveaux, null);
  assert.equal(c.valeursNouvelles, null);
  assert.equal(c.termesReplies.avant, null);
  assert.deepEqual(c.exceptionsNouvelles, [], 'les exceptions étaient déjà mesurées');
  // La version diffère : la capture qui a changé n'est pas « modifiée », elle n'est pas comparée.
  assert.deepEqual(c.mesure, { avant: null, apres: 'v-test', identique: false, version: false, contexte: false, horloge: true });
  assert.deepEqual(c.modifiees, []);
  assert.equal(c.identiques, 1);
  assert.equal(c.nonComparees, 1);
  assert.deepEqual(c.termes, { avant: 1, apres: 3 });
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /La passe «\u00a0avant\u00a0» n’a pas été prise dans les mêmes conditions\u00a0: une version de l’outil qui ne notait pas encore la sienne\.<\/b> Refaites la passe/);
  assert.match(html, /Écrans touchés\u00a0: non comparés/);
  assert.match(html, /Textes coupés nouveaux\u00a0: non mesuré avant\. Contrôles hors écran nouveaux\u00a0: non mesuré avant\. Valeurs techniques nouvelles\u00a0: non mesuré avant\./);
  assert.match(html, /badge etat inconnue">non comparée/);
  assert.match(html, /1 → 3\u202f; dans un bloc replié ou une bulle\u00a0: non mesuré avant → 0 <i>\(à refaire/);
  // Une autre version notée, ou un autre poste de capture : même refus.
  const autre = comparer({ ...avant, mesure: { ...MESURE, version: 'v-ancienne' } }, apres);
  assert.deepEqual(autre.mesure, { avant: 'v-ancienne', apres: 'v-test', identique: false, version: false, contexte: true, horloge: true });
  assert.deepEqual(causes(autre), ['une autre version de l’outil (la v-ancienne ; celle-ci est la v-test)']);
  const poste = comparer({ ...avant, mesure: { ...MESURE, contexte: { ...MESURE.contexte, pleinePage: true } } }, apres);
  assert.equal(poste.mesure.identique, false);
  assert.equal(poste.mesure.contexte, false);
});

test('une passe « avant » prise autrement : la planche dit laquelle des conditions manque, et une seule fois chacune', () => {
  const avant = { quand: '2026-11-26', commit: 'aaa', mesure: MESURE, horloge: '2026-11-26T09:00:00', captures: [capture('bureau', 320)] };
  const apres = { quand: '2026-11-26', commit: 'bbb', temps: 'apres', mesure: MESURE, horloge: '2026-11-26T09:00:00', largeurs: [320],
    base: { fichier: 'b.json', projets: 1, livrables: 1 }, manquantes: [], captures: [capture('bureau', 320, { empreinte: 'autre', ecart: ecart({ pixels: 900, max: 200 }) })],
    resume: { routes: 1, captures: 1, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 } };
  const voir = av => planche(apres, { dossier: '/tmp/r/apres', avant: av, avantDossier: '/tmp/r/avant' });
  // Même version, autre poste (la page entière d'un côté) : le poste seul est cité, pas la version.
  const cadrage = { ...avant, mesure: { ...MESURE, contexte: { ...MESURE.contexte, pleinePage: true } } };
  assert.deepEqual(causes(comparer(cadrage, apres)), ['un autre cadrage (page entière d’un côté, premier écran de l’autre)']);
  let html = voir(cadrage);
  assert.match(html, /dans les mêmes conditions\u00a0: un autre cadrage \(page entière d’un côté, premier écran de l’autre\)\.<\/b>/);
  assert.doesNotMatch(html, /autre version/);
  // Même version, autre densité d'écran : un autre poste de capture.
  const densite = { ...avant, mesure: { ...MESURE, contexte: { ...MESURE.contexte, postes: { telephone: { deviceScaleFactor: 3 } } } } };
  assert.deepEqual(causes(comparer(densite, apres)), ['un autre poste de capture (taille, densité ou réglages du navigateur)']);
  // La version et le poste : les deux sont cités.
  const lesDeux = { ...cadrage, mesure: { ...cadrage.mesure, version: 'v-ancienne' } };
  html = voir(lesDeux);
  assert.match(html, /une autre version de l’outil \(la v-ancienne\u202f; celle-ci est la v-test\) et un autre cadrage/);
  // Une autre horloge : pas de capture modifiée, aucun écran touché, et le remède dit quoi relancer.
  const horloge = { ...avant, horloge: '2026-11-25T09:00:00' };
  const c = comparer(horloge, apres);
  assert.deepEqual([c.mesure.identique, c.mesure.horloge, c.modifiees, c.nonComparees], [false, false, [], 1]);
  html = voir(horloge);
  assert.match(html, /une autre horloge \(25 novembre 2026 à 09:00 [^;]*\u202f; celle-ci\u00a0: 26 novembre 2026 à 09:00[^)]*\)/);
  assert.match(html, /Relancez la passe «\u00a0après\u00a0» sans --horloge/);
  assert.doesNotMatch(html, /Refaites la passe «\u00a0avant\u00a0»/);
  assert.match(html, /badge etat inconnue">non comparée/);
  // Les mêmes conditions : aucun avertissement.
  assert.doesNotMatch(voir(avant), /alerte-version">/);
});

test('une photo identique dont le texte change, ou un changement sous le premier écran, est « modifiée », et la planche dit où', () => {
  const lignesAvant = ['Bilan mensuel', 'aucune critique écrite sur la période', 'Ilan Corbeau'];
  const lignesApres = ['Bilan mensuel', 'AUCUNE CRITIQUE ÉCRITE', 'Ilan Corbeau'];
  const t = l => texteDeLaPage({ texte: l.join('\n'), texteReplie: '' });
  const avant = { quand: '2026-11-26', mesure: MESURE, captures: [
    capture('reporting/bilan', 320, t(lignesAvant)), capture('bureau', 1440, t(['Bureau'])), capture('plus', 390, { ...t(['Plus']), empreinte: 'p' })] };
  const apres = { quand: '2026-11-26', temps: 'apres', mesure: MESURE, largeurs: [320, 390, 1440], pleinePage: true,
    base: { fichier: 'b.json', projets: 1, livrables: 1 }, manquantes: [], resume: { routes: 3, captures: 3, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 },
    captures: [
      // La photo n'a pas changé (le texte est replié, ou dans une liste qui défile) : modifiée par le texte.
      capture('reporting/bilan', 320, { nom: 'Bilan · Bilan mensuel', ...t(lignesApres) }),
      // Un changement à 1 000 px de haut, sur un écran de 900 : sous le premier écran.
      capture('bureau', 1440, { nom: 'Bureau', ...t(['Bureau']), empreinte: 'autre', hauteurEcran: 900, hauteurPhoto: 2000,
        ecart: { ...ecart({ pixels: 400, max: 120 }), cadre: [10, 1000, 200, 1030] } }),
      // Une page qui s'allonge : la photo n'a plus la même taille.
      capture('plus', 390, { nom: 'Plus', ...t(['Plus']), empreinte: 'q', densite: 2, hauteurEcran: 844, hauteurPhoto: 2850,
        ecart: { pixels: null, taille: [780, 5656, 780, 5700] } })] };
  const c = comparer(avant, apres);
  assert.deepEqual(c.modifiees, ['reporting/bilan@320', 'bureau@1440', 'plus@390']);
  assert.deepEqual(c.textes, [{ capture: 'reporting/bilan@320', ajoute: 'AUCUNE CRITIQUE ÉCRITE', retire: 'aucune critique écrite sur la période' }]);
  assert.equal(ouChange(apres.captures[1]), 'sous le premier écran');
  assert.equal(ouChange({ ...apres.captures[1], ecart: { ...apres.captures[1].ecart, cadre: [0, 850, 10, 950] } }), 'dès le premier écran');
  assert.equal(ouChange({ ...apres.captures[1], hauteurPhoto: undefined }), '', 'au premier écran seulement, la question ne se pose pas');
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /On compare la page entière, de haut en bas, au pixel, et tout le texte de la page, blocs repliés et bulles d’aide compris\./);
  assert.match(html, /Photos de la page entière/);
  assert.match(html, /badge etat modifiee">modifiée · texte seulement \(replié ou hors de la photo\)/);
  assert.match(html, /badge etat modifiee">modifiée · 400\u00a0pixels \(moins de 0,1\u202f%\), sous le premier écran/);
  assert.match(html, /badge etat modifiee">modifiée · la page passe de 2\u202f828 à 2\u202f850\u00a0px de haut/);
  assert.match(html, /Écrans touchés\u00a0: <a href="#reporting\/bilan" title="reporting\/bilan">Bilan · Bilan mensuel<\/a> \(texte seulement\), <a href="#bureau" title="bureau">Bureau<\/a> \(sous le premier écran\), <a href="#plus"/);
  assert.match(html, /Textes changés\u00a0: <a href="#reporting\/bilan" title="reporting\/bilan">Bilan · Bilan mensuel<\/a> à 320\u00a0px\u00a0: <q>AUCUNE CRITIQUE ÉCRITE<\/q> au lieu de <q>aucune critique écrite sur la période<\/q>/);
  // Au premier écran seulement, la planche le dit.
  assert.match(planche({ ...apres, pleinePage: false }, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' }),
    /On compare le premier écran seulement, au pixel, et tout le texte de la page, blocs repliés et bulles d’aide compris\u00a0: un changement plus bas qui ne touche pas le texte ne se voit pas\./);
});

test('deux passes filtrées différemment : la planche prévient', () => {
  const avant = { quand: '2026-11-26', mesure: MESURE, filtre: '^(bureau|recherche|referentiel/doctrine)$', captures: [capture('bureau', 320)] };
  const apres = { quand: '2026-11-26', temps: 'apres', mesure: MESURE, largeurs: [320], filtre: '^bureau$', base: { fichier: 'b.json', projets: 1, livrables: 1 }, manquantes: [],
    resume: { routes: 1, captures: 1, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 }, captures: [capture('bureau', 320)] };
  const html = planche({ ...apres, comparaison: { filtres: { avant: avant.filtre, apres: apres.filtre }, ...comparer(avant, apres) } },
    { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /Comparaison limitée aux routes <code>\^\(bureau\|recherche\|referentiel\/doctrine\)\$<\/code> \(avant\) et <code>\^bureau\$<\/code> \(après\)\. <b>Les deux passes n’ont pas le même filtre<\/b>/);
});

test('avec --routes, la comparaison ne confronte que les routes filtrées', () => {
  const avant = { mesure: MESURE, captures: ['bureau', 'valider/file', 'plus', 'reporting/bilan'].map(id => capture(id, 320, { termes: [VERDICT] })) };
  const apres = { mesure: MESURE, filtre: '^(bureau|valider/)', captures: ['bureau', 'valider/file'].map(id => capture(id, 320, { termes: [VERDICT] })) };
  const brut = comparer(avant, apres);
  assert.deepEqual(brut.routesDisparues, ['plus', 'reporting/bilan'], 'sans restriction, la comparaison serait fausse');
  const c = comparer(restreindre(avant, /^(bureau|valider\/)/), restreindre(apres, null));
  assert.deepEqual(c.routesDisparues, []);
  assert.deepEqual(c.termes, { avant: 2, apres: 2 });
  // Et dans l'autre sens : une passe « avant » filtrée ne fait pas apparaître de routes nouvelles.
  const d = comparer(restreindre({ captures: avant.captures.slice(0, 2), filtre: '^(bureau|valider/)' }, null), restreindre({ captures: avant.captures }, '^(bureau|valider/)'));
  assert.deepEqual(d.routesNouvelles, []);
});

test('« identique à l’œil » ne pardonne que le lissage des images et le crénelage de quelques coins', () => {
  // Le lissage d'une vignette : des milliers de pixels, jusqu'à 16/255, tous dans l'image.
  assert.equal(aLOeil(ecart({ pixels: 0, max: 0 }, { pixels: 4943, max: 16 })), true);
  // Le crénelage des coins arrondis ou d'un bout de soulignement : quelques dizaines de pixels hors des images, jusqu'à 5/255.
  assert.equal(aLOeil(ecart({ pixels: 41, max: 2 })), true);
  assert.equal(aLOeil(ecart({ pixels: 8, max: 5 })), true);
  // Une page assombrie de 8 % : tous les pixels, jusqu'à 20/255. Modifiée.
  assert.equal(aLOeil(ecart({ pixels: 1e6, max: 20 })), false);
  // Une bordure d'un ton plus pâle (#deded8 → #e8e8e2) : 10/255 sur quelques milliers de pixels. Modifiée.
  assert.equal(aLOeil(ecart({ pixels: 3200, max: 10 })), false);
  // Un texte un peu éclairci (#1f2937 → #3a4250) : 27/255. Modifiée.
  assert.equal(aLOeil(ecart({ pixels: 900, max: 27 })), false);
  // Un fond décalé d'un point sur tout l'écran : invisible pixel par pixel, mais trop étendu pour du bruit.
  assert.equal(aLOeil(ecart({ pixels: 5000, max: 1 })), false);
  // Une autre image : plus de 32/255 dans l'image. Modifiée.
  assert.equal(aLOeil(ecart({ pixels: 0, max: 0 }, { pixels: 20000, max: 200 })), false);
  // Deux tailles différentes, ou rien de mesuré : modifiée.
  assert.equal(aLOeil({ pixels: null }), false);
  assert.equal(aLOeil(undefined), false);
  assert.deepEqual(ECART, { bruit: 8, partBruit: 0.001, image: 32 });
});

test('la planche « après » dit ce qui a changé, et laisse le lissage de côté sans le cacher', () => {
  const avant = { quand: '2026-11-26T08:00:00.000Z', commit: 'aaa', mesure: MESURE, captures: [
    capture('bureau', 320), capture('bureau', 1440), capture('plus', 320), capture('partage', 320)] };
  const apres = { quand: '2026-11-26T14:07:25.070Z', commit: 'bbb', temps: 'apres', mesure: MESURE, largeurs: [320, 1440], base: { fichier: 'base-fictive.json', projets: 2, livrables: 1 },
    manquantes: [], captures: [
      capture('bureau', 320, { nom: 'Bureau', empreinte: 'autre', ecart: ecart({ pixels: 1200, max: 255 }), termes: [VERDICT] }),
      capture('bureau', 1440, { nom: 'Bureau', termes: [VERDICT] }),
      capture('plus', 320, { nom: 'Plus' }),
      capture('partage', 320, { nom: 'Page partagée', empreinte: 'lisse', ecart: ecart({ pixels: 0, max: 0 }, { pixels: 300, max: 16 }) })],
    resume: { routes: 3, captures: 4, exceptions: 0, debordements: 0, coupes: 0, horsEcran: 0, valeurs: 0, termes: 2, termesReplies: 0, introuvables: 0, imagesCassees: 1 } };
  const c = comparer(avant, apres);
  assert.deepEqual(c.modifiees, ['bureau@320']);
  assert.equal(c.identiques, 2);
  assert.equal(c.identiquesALOeil, 1);
  assert.deepEqual(c.nuancees, [{ capture: 'partage@320', max: 16, pixels: 300, hors: { pixels: 0, max: 0 }, images: { pixels: 300, max: 16 } }]);
  const html = planche(apres, { dossier: '/tmp/r/apres', avant, avantDossier: '/tmp/r/avant' });
  assert.match(html, /Ce qui a changé depuis la passe «\u00a0avant\u00a0»/);
  assert.doesNotMatch(html, /alerte-version">/);
  assert.match(html, /<b>1 capture modifiée<\/b>, 3 identiques \(dont 1 à l’œil seulement/);
  assert.match(html, /Écrans touchés\u00a0: <a href="#bureau" title="bureau">Bureau<\/a>/);
  // Les captures nuancées sont nommées avec leur nuance, et restent visibles sous le filtre.
  assert.match(html, /Identiques à l’œil, à vérifier d’un regard\u00a0: <a href="#partage" title="partage">Page partagée<\/a> à 320\u00a0px \(nuance 16\/255 sur 300\u00a0pixels, dans une image\)/);
  // La règle écrite est celle qui est appliquée : le lissage d'une image et le crénelage de quelques bords.
  assert.match(html, /Seuls sont pardonnés le lissage d’une image \(jusqu’à 32\/255, dans les images\) et le crénelage de quelques bords \(au plus 8\/255, sur moins de 0,1\u202f% de la photo, hors des images\)\u202f; tout autre écart rend la capture «\u00a0modifiée\u00a0»/);
  assert.match(html, /\(dont 1 à l’œil seulement\u00a0: le lissage d’une image ou le crénelage de quelques bords, listées ci-dessous\)/);
  assert.match(html, /<article id="bureau" class="a-voir">/);
  assert.match(html, /<article id="partage" class="a-voir">/);
  assert.match(html, /<article id="plus">/);
  assert.match(html, /badge etat modifiee">modifiée · 1\u202f200\u00a0pixels \(0,1\u202f%\)/);
  assert.match(html, /badge etat quasi">identique à l’œil · nuance 16\/255 sur 300\u00a0pixels, dans une image/);
  assert.match(html, /id="seulement"/);
  assert.match(html, /figure\.identique,/);
  assert.doesNotMatch(html, /figure\.quasi\{|figure\.quasi,/, 'une capture nuancée n’est pas cachée par le filtre');
  // Quand le filtre ne garde rien, la planche le dit.
  assert.match(html, /<p class="rien">Aucune capture modifiée, nouvelle ou nuancée depuis la passe «\u00a0avant\u00a0»\.<\/p>/);
  assert.match(html, /body:has\(#seulement:checked\):not\(:has\(article\.a-voir\)\) \.rien\{display:block\}/);
  // Lisible par quelqu'un du métier : date en clair, base nommée une fois, pluriels accordés.
  assert.doesNotMatch(html, /2026-11-26T14:07/);
  assert.match(html, /Le 26 novembre 2026 à \d{2}:\d{2}/);
  assert.match(html, /base fictive \(base-fictive\.json\), 2 projets et 1 pièce/);
  assert.match(html, /version de la mesure v-test/);
  assert.doesNotMatch(html, /\(s\)/);
  assert.match(html, /0 exception</);
  assert.match(html, /1 image cassée</);
  // Les alertes : une entrée par écran, nommé comme dans l'application, ses largeurs et sa première phrase.
  // « À regarder » ne nomme que le filtre des captures, pas ce bloc.
  assert.match(html, /<summary>Alertes, écran par écran\u00a0: 1 écran \(termes\)<\/summary>/);
  assert.doesNotMatch(html, /À regarder/);
  assert.match(html, /<li><a href="#bureau" title="bureau">Bureau<\/a><ul><li><span class="badge terme">verdict<\/span> à 320 et 1440\u00a0px\u00a0: <q>…Rendre un verdict…<\/q><\/li><\/ul><\/li>/);
  assert.match(html, /<h3>Bureau<\/h3>/);
});

test('les alertes montrent le texte, et gardent le sélecteur sur une ligne discrète', () => {
  const r = { quand: '2026-11-26', largeurs: [320], base: { fichier: 'b.json', projets: 1, livrables: 1 }, manquantes: [],
    resume: { routes: 1, captures: 1, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 },
    captures: [capture('nouveau-projet', 320, { nom: 'Nouveau projet ouvert',
      coupes: { nombre: 1, exemples: [{ selecteur: 'div#contenu > div.lb-outils-collection > input', texte: 'Nom, client, référence, marque', px: 40 }] } })] };
  const html = planche(r, { dossier: '/tmp/r' });
  assert.match(html, /<a href="#nouveau-projet" title="nouveau-projet">Nouveau projet ouvert<\/a>/);
  assert.match(html, /<q>Nom, client, référence, marque<\/q><br><small class="tech" title="Où le trouver dans la page">div#contenu &gt; div\.lb-outils-collection &gt; input<\/small>/);
});

test('la typographie garde la ponctuation avec son mot, sans toucher aux balises ni au style', () => {
  assert.equal(typographie('<p>Termes : 138 → 138 ; repliés ? oui ! « avant » 0,1 %</p>'),
    '<p>Termes\u00a0: 138 → 138\u202f; repliés\u202f? oui\u202f! «\u00a0avant\u00a0» 0,1\u202f%</p>');
  assert.equal(typographie('<a href="#a :b" title="x ; y">z</a>'), '<a href="#a :b" title="x ; y">z</a>');
  // Un nombre et son unité ne se séparent pas.
  assert.equal(typographie('<p>nuance 5/255 sur 2 pixels, à 320 px, 1 pixel</p>'), '<p>nuance 5/255 sur 2\u00a0pixels, à 320\u00a0px, 1\u00a0pixel</p>');
  const html = planche({ quand: '2026-11-26', largeurs: [320], base: { fichier: 'b.json', projets: 1, livrables: 1 }, manquantes: [], captures: [capture('bureau', 320)],
    resume: { routes: 1, captures: 1, exceptions: 0, debordements: 0, termes: 0, introuvables: 0, imagesCassees: 0 } }, { dossier: '/tmp/r' });
  assert.match(html, /<style>\n:root\{/, 'la feuille de style est intacte');
  // Les guillemets des extraits portent leurs espaces insécables ; une pastille ne se casse pas en deux.
  assert.match(html, /q\{color:var\(--terne\);quotes:"«\\00a0" "\\00a0»"\}/);
  assert.match(html, /\.badge\{display:inline-block;max-width:100%/);
  // Une expression --routes longue se coupe, au lieu d'élargir la planche au téléphone.
  assert.match(html, /\.meta code\{overflow-wrap:anywhere\}/);
});

test('la version de la mesure est l’empreinte de l’outil et de la liste des termes', () => {
  assert.match(versionMesure(), /^[0-9a-f]{12}$/);
  assert.equal(versionMesure(), versionMesure());
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

test('la ligne de commande refuse un dossier de sortie qui ne vient pas d’une recette, avant d’ouvrir un navigateur', async () => {
  const d = await mkdtemp(join(tmpdir(), 'recette-refus-'));
  try {
    await writeFile(join(d, 'index.html'), '<p>Mon site</p>');
    const r = await executer(process.execPath, [OUTIL_CHEMIN, '--sortie', d, '--largeurs', '1440'], { env: { ...process.env, BROWSER_CHANNEL: '' } })
      .then(() => ({ code: 0 }), e => e);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /contient déjà index\.html, qui ne vient pas d’une recette/);
    assert.equal(await readFile(join(d, 'index.html'), 'utf8'), '<p>Mon site</p>');
  } finally { await rm(d, { recursive: true, force: true }); }
});

test('le texte de la page a une empreinte stable, et ses lignes sans doublon', () => {
  const a = texteDeLaPage({ texte: 'Bureau\n  Valider la V2 \nValider la V2\n', texteReplie: 'Critères' });
  const b = texteDeLaPage({ texte: 'Bureau\nValider   la V2\nValider la V2', texteReplie: 'Critères\n' });
  assert.equal(a.empreinteTexte, b.empreinteTexte, 'les blancs ne comptent pas');
  assert.deepEqual(a.lignes, ['Bureau', 'Valider la V2', 'Critères']);
  // Une occurrence de plus change l'empreinte, même si les lignes sans doublon sont les mêmes.
  assert.notEqual(texteDeLaPage({ texte: 'Bureau\nValider la V2', texteReplie: 'Critères' }).empreinteTexte, a.empreinteTexte);
});

test('une nuance dit où elle est : hors des images ou dans une image', () => {
  assert.equal(decrireNuance({ pixels: 60, max: 16, hors: { pixels: 52, max: 1 }, images: { pixels: 8, max: 16 } }),
    'nuance 1/255 sur 52 pixels, hors des images ; nuance 16/255 sur 8 pixels, dans une image');
  assert.equal(decrireNuance({ pixels: 1, max: 3 }), 'nuance 3/255 sur 1 pixel, hors des images');
});
