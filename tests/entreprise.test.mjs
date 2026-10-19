import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { distribuer, verifier } from '../outils/distribuer-entreprise.mjs';
import { preparer } from '../outils/preparer-entreprise.mjs';

const root = new URL('../', import.meta.url);
const base = await readFile(new URL('app/maison-base.js', root), 'utf8');
const legacy = await readFile(new URL('app/maison.js', root), 'utf8');
function contexte() {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(base, sb);
  return sb;
}

test('les profils partagent la méthode, sans partager leurs choix ni inventer une organisation', () => {
  const sb = contexte();
  const a = sb.MAISON_BASE.creer({ nom: 'Recette A' });
  const b = sb.MAISON_BASE.creer({ nom: 'Recette B' });
  a.postes[0].nom = 'Choix A'; a.criteres.brief.push('Critère A');
  assert.notEqual(a.postes[0].nom, b.postes[0].nom);
  assert.ok(!b.criteres.brief.includes('Critère A'));
  assert.equal(b.structures.length, 1); assert.equal(b.structures[0].nom, 'Recette B');
  assert.equal(b.titulaire, 'direction-generale');
  assert.equal(b.doctrine.documents.length, 0); assert.equal(b.doctrine.ecolesMaison.length, 0);
  assert.equal(b.nomsRetires.length, 0); assert.equal(b.postes.some(p => p.titulaire || p.aCreer || p.aCompleter), false);
});

test('le profil historique conserve sa structure, ses postes et son identité de présentation', () => {
  const sb = contexte(); vm.runInNewContext(legacy, sb);
  assert.equal(sb.MAISON.nom, 'MATANGA AGENCY');
  assert.equal(sb.MAISON.titulaire, 'creation');
  assert.equal(sb.MAISON.structures.length, 4);
  assert.equal(sb.MAISON.structurePrincipale, 'matanga');
  assert.equal(sb.MAISON.postes.find(p => p.cle === 'creation').nom, 'Directeur de la Création');
  assert.equal(sb.MAISON.doctrine.documents.length, 3);
  assert.equal(sb.MAISON.presentation.logo, 'assets/review/agence/matanga-logo-blanc.png');
});

test('un profil JSON ne modifie pas le prototype des autres maisons', () => {
  const sb = contexte(); const attack = JSON.parse('{"__proto__":{"polluted":true},"doctrine":{"constructor":{"polluted":true}}}');
  const a = sb.MAISON_BASE.creer(attack);
  assert.equal(a.polluted, undefined); assert.equal({}.polluted, undefined);
  assert.equal(sb.MAISON_BASE.creer({}).doctrine.polluted, undefined);
});

async function application() {
  const p = await mkdtemp(path.join(tmpdir(), 'barre-company-test-'));
  await mkdir(path.join(p, 'app')); await mkdir(path.join(p, 'depots'));
  for (const [name, original] of [['maison-base.js', 'app/maison-base.js'], ['maison.js', 'profils/entreprise/maison.js'], ['depot.js', 'app/depot.js']]) {
    await writeFile(path.join(p, 'app', name), await readFile(new URL(original, root)));
  }
  return p;
}

test('le premier dépôt vient de DEPOT.vide ; une reprise conserve le travail au byte près', async () => {
  const p = await application(); const destination = path.join(p, 'depots');
  assert.equal((await preparer({ application: p, destination })).created, true);
  const file = path.join(destination, 'entreprise.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(data.schema, 5); assert.equal(data.maison, 'Entreprise');
  for (const value of Object.values(data)) if (Array.isArray(value)) assert.equal(value.length, 0);
  data.projets.push({ id: 'OWNED-PROJECT', nom: 'Travail conservé', sections: {} });
  const text = JSON.stringify(data); await writeFile(file, text);
  assert.equal((await preparer({ application: p, destination })).created, false);
  assert.equal(await readFile(file, 'utf8'), text);
});

test('un dossier incomplet n’est jamais masqué par une base vide ou un exemple', async () => {
  const p = await application(); const destination = path.join(p, 'depots');
  await writeFile(path.join(destination, 'a-retrouver.json'), '{"projets":[{"id":"KEEP"}]}');
  await assert.rejects(preparer({ application: p, destination }), /sans manifeste/);
  assert.deepEqual(await readdir(destination), ['a-retrouver.json']);
});

test('un manifeste qui annonce un fichier absent ou sortant bloque le démarrage sans écrire', async () => {
  const p = await application(); const destination = path.join(p, 'depots');
  for (const reference of ['../outside.json', 'missing.json', 'manifeste.json']) {
    await writeFile(path.join(destination, 'manifeste.json'), JSON.stringify({ reference }));
    await assert.rejects(preparer({ application: p, destination }));
    assert.deepEqual(await readdir(destination), ['manifeste.json']);
  }
});

test('la distribution remplace les deux profils avant la copie et exclut toutes les familles privées', async () => {
  const source = await mkdtemp(path.join(tmpdir(), 'barre-source-test-'));
  const privateProbe = 'PRIVATE-COMPANY-DATA-PROBE';
  const files = {
    'index.html': '<html>Shared runtime</html>', 'servir.mjs': '// server', 'package.json': '{}', 'LICENSE': 'Fixture license',
    'app/maison.js': privateProbe, 'app/amorce.js': privateProbe, 'app/shared.js': '// common core', 'styles/base.css': 'body{}',
    'profils/entreprise/maison.js': 'window.MAISON={nom:"Entreprise"};',
    'profils/entreprise/amorce.js': 'window.AMORCE={disponible:false};',
    'profils/entreprise/Dockerfile': 'FROM scratch', 'profils/entreprise/dockerignore': '**',
    'outils/preparer-entreprise.mjs': '// initializer', 'outils/distribuer-entreprise.mjs': '// distributor',
    'depots/client.json': privateProbe, 'assets/review/client.png': privateProbe,
    'sources/brief.md': privateProbe, 'extraits/conversation.md': privateProbe, 'documents/client.md': privateProbe,
    'kit-ordi-dedie/private.txt': privateProbe, '.env': privateProbe,
  };
  for (const [name, value] of Object.entries(files)) { await mkdir(path.dirname(path.join(source, name)), { recursive: true }); await writeFile(path.join(source, name), value); }
  const git = args => execFileSync('git', ['-C', source, ...args], { stdio: 'pipe' }).toString().trim();
  git(['init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Receipt', '-c', 'user.email=receipt@shinkiro-fixture.invalid', 'commit', '-qm', 'Synthetic company boundary']);
  const destination = path.join(source, 'distribution');
  const manifest = await distribuer({ source, commit: git(['rev-parse', 'HEAD']), destination });
  for (const name of Object.keys(manifest.files)) assert.ok(!(await readFile(path.join(destination, name), 'utf8')).includes(privateProbe), name);
  assert.ok(!Object.keys(manifest.files).some(n => /^(depots|assets|sources|extraits|documents|kit-ordi-dedie)\//.test(n)));
  await assert.rejects(distribuer({ source, commit: manifest.commit, destination }), /EEXIST/);
  await writeFile(path.join(destination, 'app', 'unlisted.js'), privateProbe);
  await assert.rejects(verifier(destination), /Fichier non distribué/);
});
