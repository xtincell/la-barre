import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import { readFile, writeFile, mkdir, mkdtemp, readdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { construire, serialiser, SORTIE } from '../outils/vitrine-base.mjs';
import { distribuer, verifier, MARQUEURS } from '../outils/distribuer-vitrine.mjs';

/* La vitrine publique (LB6) : une page qui raconte le brief-au-BAT, et une
 * démonstration qui fait tourner l'application elle-même sur une base fictive.
 * La démonstration ne lit ni n'écrit aucune base réelle ; l'outil réel reste
 * derrière la session de La Fusée. */

const RACINE = fileURLToPath(new URL('../', import.meta.url));
const lire = rel => readFile(path.join(RACINE, rel), 'utf8');
const copie = x => JSON.parse(JSON.stringify(x));
const scripts = html => [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const feuilles = html => [...html.matchAll(/<link rel="(?:stylesheet|preload)" href="([^"]+)"/g)].map(m => m[1]);

test('la page de démonstration charge l’application de index.html, dans le même ordre, sans le profil historique', async () => {
  const racine = await lire('index.html'), demo = await lire('vitrine/demo/index.html');
  const attendus = scripts(racine).map(s => s === 'app/maison.js' ? 'maison.js' : s === 'app/amorce.js' ? 'amorce.js' : '../../' + s);
  assert.deepEqual(scripts(demo), ['demonstration.js', ...attendus], 'seule la déclaration de démonstration s’ajoute, en premier');
  assert.deepEqual(feuilles(demo), feuilles(racine).map(f => '../../' + f));
  assert.ok(!scripts(demo).some(s => /app\/(maison|amorce)\.js$/.test(s)), 'ni le profil ni l’exemple de l’installation historique');
  assert.match(demo, /<title>[^<]*démonstration, données fictives<\/title>/);
});

/* ————— Le dépôt en démonstration ————— */

function espion(valeurs = {}) {
  const lus = [], ecrits = [];
  const m = new Map(Object.entries(valeurs));
  return { lus, ecrits, stockage: {
    getItem: k => { lus.push(k); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { ecrits.push(k); m.set(k, String(v)); }, removeItem: k => m.delete(k) } };
}

async function depot({ demo = true } = {}) {
  const local = espion({ 'la-barre': JSON.stringify({ schema: 5, projets: [{ id: 'PRJ-REEL', nom: 'Dossier réel', sections: {} }] }) });
  const appels = [];
  const sb = { console, Date, JSON, Promise,
    localStorage: local.stockage, sessionStorage: espion().stockage,
    location: { protocol: 'https:', hash: '', hostname: 'exemple.invalid', pathname: demo ? '/vitrine/demo/index.html' : '/la-barre/' },
    navigator: { platform: 'test' }, setTimeout: f => { appels.push('minuteur'); return 0; }, clearTimeout() {},
    fetch: (url, o) => { appels.push((o && o.method || 'GET') + ' ' + url); return Promise.reject(new Error('réseau interdit au test')); },
    REPRISES: { garder: async () => { appels.push('reprise'); }, lire: async () => null, retirer: async () => {}, lister: async () => [] },
    AVIS: { refus() {}, fait() {}, grave() {} },
  };
  if (demo) sb.LA_BARRE_DEMO = { base: 'base-fictive.json', acteur: 'PE-clemence', vitrine: '../' };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ['app/maison-base.js', 'vitrine/demo/maison.js', 'app/outils.js', 'app/reconciliation.js', 'app/depot.js']) {
    vm.runInContext(await lire(f), sb, { filename: f });
  }
  return { sb, D: sb.DEPOT, local, appels };
}

test('en démonstration, le dépôt ne lit ni n’écrit le cache de l’outil, ne cherche aucun manifeste et ne lit aucun dépôt servi', async () => {
  const { D, local, appels } = await depot();
  assert.equal(D.estDemonstration(), true);
  assert.equal(D.charger(), false, 'le cache de ce navigateur n’est pas lu');
  assert.deepEqual(local.lus, []);
  let reference = 'pas encore';
  D.referenceDisponible(m => { reference = m; });
  assert.equal(reference, null);
  let relu = null;
  D.relire('entreprise.json', ok => { relu = ok; });
  await new Promise(r => setImmediate(r));
  assert.equal(relu, false);
  assert.match(D.peutEcrire(), /démonstration/);
  const base = JSON.parse(await readFile(SORTIE, 'utf8'));
  D.poserDemonstration(base);
  assert.ok(D.trouve('projets', 'PRJ-zeste'));
  assert.equal(D.trouve('projets', 'PRJ-REEL'), null, 'aucun dossier réel ne s’y mêle');
  D.ajoute('captures', { texte: 'Une note dans la démonstration' });
  D.enregistrer();
  D.ecrireSurDisque(null);
  assert.deepEqual(local.ecrits, [], 'rien n’est écrit dans le cache');
  assert.ok(!appels.some(a => /^(GET|PUT|POST) /.test(a)), 'aucune requête : ' + appels.join(', '));
  assert.ok(!appels.includes('reprise'), 'aucun brouillon de reprise');
  assert.equal(D.stockage().cle, 'demonstration');
  assert.equal(D.provenance().cle, 'demonstration');
});

test('hors de la démonstration, rien ne change : le cache se lit, et la base fictive ne se pose pas', async () => {
  const { D, local } = await depot({ demo: false });
  assert.equal(D.estDemonstration(), false);
  assert.equal(D.charger(), true);
  assert.deepEqual(local.lus.slice(0, 1), ['la-barre']);
  assert.ok(D.trouve('projets', 'PRJ-REEL'));
  assert.throws(() => D.poserDemonstration({ schema: 5 }), /Hors de la démonstration/);
  assert.equal(D.demonstration(), null);
});

test('en démonstration, ni envoi de média ni contexte de La Fusée', async () => {
  const { sb, appels } = await depot();
  sb.O.vider = n => n;
  for (const f of ['app/image.js', 'app/vault.js']) vm.runInContext(await lire(f), sb, { filename: f });
  let refus = null;
  sb.IMAGE.ranger('data:image/png;base64,cHJvYmU=', (chemin, pourquoi) => { refus = [chemin, pourquoi]; });
  assert.equal(refus[0], null);
  assert.match(refus[1], /démonstration n'enregistre aucun fichier/);
  sb.location.pathname = '/la-barre/vitrine/demo/index.html';
  assert.equal(sb.VAULT.initialiser(() => {}), undefined);
  assert.ok(!appels.some(a => /^(GET|PUT|POST) /.test(a)), appels.join(', '));
});

/* ————— La base fictive ————— */

test('la base fictive est exactement celle que rejouent les modules de l’application', async () => {
  const { base } = await construire();
  assert.equal(serialiser(base), await readFile(SORTIE, 'utf8'),
    'vitrine/demo/base-fictive.json est périmée : node outils/vitrine-base.mjs');
});

test('la base fictive ne nomme aucune personne, marque ni campagne de l’installation historique', async () => {
  const texte = await readFile(SORTIE, 'utf8');
  assert.doesNotMatch(texte, MARQUEURS);
  const amorce = await lire('app/amorce.js');
  const reels = [...amorce.matchAll(/\{ id: "P-[a-z]+", nom: "([^"]+)"/g)].map(m => m[1]);
  assert.ok(reels.length >= 3, 'les personnes de l’exemple historique sont relevées');
  for (const nom of reels) assert.ok(!texte.includes(nom), nom);
  const base = JSON.parse(texte);
  assert.ok(base.marques.every(m => /fictive/.test(m.note)), 'la marque se dit fictive');
});

test('chaque décision de la base passe la fabrique, et le parcours va du brief au BAT', async () => {
  const base = JSON.parse(await readFile(SORTIE, 'utf8'));
  const sb = { console, Date, O: { id: p => p + '-x' }, DEPOT: { liste: k => base[k] || [], trouve: (k, id) => (base[k] || []).find(x => x && x.id === id) || null } };
  sb.window = sb; vm.createContext(sb);
  vm.runInContext(await lire('app/decision.js'), sb);
  for (const d of base.decisions) sb.DECISION.verifier(copie(d));
  assert.equal(new Set(base.decisions.map(d => d.id)).size, base.decisions.length);
  const types = base.decisions.map(d => d.type);
  for (const t of ['recevabilite', 'brief', 'socle', 'idee', 'bigidea', 'piste', 'livrable', 'bilan-campagne']) assert.ok(types.includes(t), t);
  const p = base.projets.find(x => x.id === 'PRJ-zeste');
  const master = p.livrables.find(l => l.niveau === 'maitre');
  assert.deepEqual(master.versions.map(v => v.verdict), ['retour', 'approuve'], 'le master est validé en deux tours');
  const bats = p.livrables.flatMap(l => (l.fichiers || []).filter(f => f.type === 'bat'));
  assert.deepEqual(bats.map(f => !!f.signataire), [true, false], 'un BAT signé, un BAT posé sans signataire');
  const cs = base.campagnes.find(c => c.id === 'CMP-orvelle-source');
  assert.equal(cs.bilanVersions.length, 1);
  assert.match(cs.bilanVersions[0].empreinte, /^[a-f0-9]{64}$/);
});

test('la démonstration porte un seul signal « hors écart déclaré » : la langue du Ghana, que la revue doit trancher', async () => {
  const { ctx } = await construire();
  const p = ctx.DEPOT.trouve('projets', 'PRJ-zeste');
  const evals = copie(p.livrables.filter(l => l.niveau === 'adaptation').map(l => ctx.ECARTS_MARCHE.evaluer(p, l)));
  const parMarche = Object.fromEntries(evals.map(x => [x.marche, [x.etat, x.hors, x.declaration && x.declaration.types]]));
  assert.deepEqual(parMarche, {
    'M-ci': ['dans-l-ecart', [], []],
    'M-sn': ['dans-l-ecart', [], ['reglementaire']],
    'M-gh': ['hors-ecart', ['langue'], ['produit']],
  });
  ctx.CLOTURE.est = q => !!(q && q.cloture && q.cloture.le);
  const file = copie(ctx.ECARTS_MARCHE.aTrancher());
  assert.deepEqual(file.map(x => [x.marche, x.etat, x.hors]), [['GH', 'a-trancher', ['langue']]]);
});

/* ————— Ce que voit le visiteur ————— */

test('chaque surface publique dit « Démonstration — données fictives »', async () => {
  const vitrine = await lire('vitrine/index.html');
  assert.ok((vitrine.match(/Démonstration — données fictives/g) || []).length >= 2, 'le ruban et le pied de la vitrine');
  assert.match(await lire('vitrine/demo/index.html'), /données fictives/);
  assert.match(await lire('app/application.js'), /"Démonstration — données fictives\."/);
  assert.match(await lire('app/application.js'), /"Démonstration — données fictives"/);
  const visuels = await readdir(path.join(RACINE, 'vitrine/demo/visuels'));
  assert.ok(visuels.length >= 5);
  for (const v of visuels) assert.match(await lire('vitrine/demo/visuels/' + v), /DÉMONSTRATION — DONNÉES FICTIVES|MARQUE FICTIVE/, v);
  assert.doesNotMatch(vitrine, MARQUEURS);
  assert.doesNotMatch(vitrine, /gain de temps de|\d+ ?% (de temps|plus rapide)/, 'aucune mesure revendiquée');
});

test('les liens de la vitrine ouvrent des écrans et des dossiers qui existent dans la démonstration', async () => {
  const vitrine = await lire('vitrine/index.html');
  const base = JSON.parse(await readFile(SORTIE, 'utf8'));
  const liens = [...vitrine.matchAll(/href="demo\/index\.html(#[^"]*)?"/g)].map(m => m[1] || '');
  assert.ok(liens.length >= 10);
  const sb = { console }; sb.window = sb; vm.createContext(sb);
  vm.runInContext(await lire('app/maison-base.js'), sb); vm.runInContext(await lire('vitrine/demo/maison.js'), sb);
  const sections = sb.MAISON.natures.find(n => n.cle === 'campagne').sections;
  for (const lien of liens.filter(Boolean)) {
    const [vue, arg, sous] = lien.replace(/^#\//, '').split('/');
    assert.ok(['bureau', 'valider', 'planning', 'reporting', 'projets', 'galerie', 'referentiel'].includes(vue), lien);
    if (vue === 'projets' && arg) {
      assert.ok(base.projets.some(p => p.id === arg) || base.campagnes.some(c => c.id === arg), lien);
      if (sous) assert.ok(sections.includes(sous), lien);
    }
    if (vue === 'reporting') assert.match(await lire('app/vue-constater.js'), new RegExp('cle: "' + arg + '"'), lien);
  }
});

test('aucun exemple de saisie de l’application ne nomme une marque de l’installation historique', async () => {
  const fautes = [];
  for (const f of (await readdir(path.join(RACINE, 'app'))).filter(n => n.endsWith('.js') && !['maison.js', 'amorce.js'].includes(n))) {
    for (const m of (await lire('app/' + f)).matchAll(/placeholder: "([^"]*)"/g)) if (MARQUEURS.test(m[1])) fautes.push(f + ' : ' + m[1]);
  }
  assert.deepEqual(fautes, []);
});

/* ————— La distribution statique ————— */

async function depotGit(fichiers) {
  const source = await mkdtemp(path.join(tmpdir(), 'barre-vitrine-test-'));
  for (const [name, value] of Object.entries(fichiers)) {
    await mkdir(path.dirname(path.join(source, name)), { recursive: true });
    await writeFile(path.join(source, name), value);
  }
  return source;
}
function commit(source) {
  const git = args => execFileSync('git', ['-C', source, ...args], { stdio: 'pipe' }).toString().trim();
  git(['init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Receipt', '-c', 'user.email=receipt@shinkiro-fixture.invalid', 'commit', '-qm', 'Vitrine']);
  return git(['rev-parse', 'HEAD']);
}

test('la distribution de la vitrine ne porte ni serveur, ni base, ni profil historique', async () => {
  const sonde = 'PRIVATE-COMPANY-DATA-PROBE';
  const source = await depotGit({
    'vitrine/index.html': '<link rel="stylesheet" href="vitrine.css" /><a href="demo/index.html#/bureau">démo</a>',
    'vitrine/vitrine.css': 'body{}', 'vitrine/demo/index.html': '<script src="../../app/commun.js"></script>',
    'vitrine/demo/base-fictive.json': '{"schema":5}', 'app/commun.js': '// cœur commun', 'styles/base.css': 'body{}',
    'LICENSE': 'Licence', 'app/maison.js': sonde, 'app/amorce.js': sonde, 'servir.mjs': sonde, 'index.html': sonde,
    'depots/client.json': sonde, 'assets/review/x.png': sonde, 'sources/brief.md': sonde, 'documents/x.md': sonde,
    'extraits/x.md': sonde, 'kit-ordi-dedie/x.txt': sonde, 'outils/x.mjs': sonde, 'profils/entreprise/maison.js': sonde,
  });
  const destination = path.join(source, 'distribution');
  const manifest = await distribuer({ source, commit: commit(source), destination });
  for (const name of Object.keys(manifest.files)) {
    assert.ok(!(await readFile(path.join(destination, name), 'utf8')).includes(sonde), name);
  }
  assert.deepEqual(Object.keys(manifest.files).sort(), ['LICENSE', 'app/commun.js', 'index.html', 'styles/base.css',
    'vitrine/demo/base-fictive.json', 'vitrine/demo/index.html', 'vitrine/index.html', 'vitrine/vitrine.css']);
  assert.match(await readFile(path.join(destination, 'index.html'), 'utf8'), /url=vitrine\/index\.html/);
  await assert.rejects(distribuer({ source, commit: manifest.commit, destination }), /EEXIST/);
  await writeFile(path.join(destination, 'depots-oublie.json'), sonde);
  await assert.rejects(verifier(destination), /Fichier non distribué/);
});

test('la distribution refuse une vitrine qui appelle un fichier absent ou nomme l’installation historique', async () => {
  const absent = await depotGit({ 'vitrine/index.html': '<script src="demo/manquant.js"></script>',
    'vitrine/demo/index.html': '', 'vitrine/demo/base-fictive.json': '{}', 'LICENSE': 'x' });
  await assert.rejects(distribuer({ source: absent, commit: commit(absent), destination: path.join(absent, 'd') }), /absent de la distribution/);
  const nomme = await depotGit({ 'vitrine/index.html': 'Dossier MT-0020', 'vitrine/demo/index.html': '',
    'vitrine/demo/base-fictive.json': '{}', 'LICENSE': 'x' });
  await assert.rejects(distribuer({ source: nomme, commit: commit(nomme), destination: path.join(nomme, 'd') }), /installation historique/);
});

test('la vitrine du dépôt se distribue telle quelle : chaque fichier appelé est présent', async () => {
  const source = await mkdtemp(path.join(tmpdir(), 'barre-vitrine-reelle-'));
  for (const rel of ['vitrine', 'app', 'styles', 'LICENSE']) await cp(path.join(RACINE, rel), path.join(source, rel), { recursive: true });
  const destination = path.join(source, 'distribution');
  const manifest = await distribuer({ source, commit: commit(source), destination });
  assert.ok(!Object.hasOwn(manifest.files, 'app/maison.js') && !Object.hasOwn(manifest.files, 'app/amorce.js'));
  assert.ok(Object.hasOwn(manifest.files, 'vitrine/demo/maison.js'));
  assert.ok(Object.keys(manifest.files).every(n => n === 'index.html' || /^(vitrine|app|styles)\/|^LICENSE$/.test(n)));
});
