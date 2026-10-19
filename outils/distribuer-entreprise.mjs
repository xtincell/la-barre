// The same native application, with a neutral profile and no company corpus.
// Read only tracked runtime files from one explicit Git commit.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const substitutions = {
  'app/maison.js': 'profils/entreprise/maison.js',
  'app/amorce.js': 'profils/entreprise/amorce.js',
  'Dockerfile': 'profils/entreprise/Dockerfile',
  '.dockerignore': 'profils/entreprise/dockerignore',
};

export async function verifier(destination) {
  const manifest = JSON.parse(await readFile(path.join(destination, 'distribution.json'), 'utf8'));
  assert.equal(manifest.profile, 'entreprise-v1');
  assert.match(manifest.commit, /^[a-f0-9]{40}$/);
  async function inspecter(relative = '') {
    for (const entry of await readdir(path.join(destination, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      assert.ok(!entry.isSymbolicLink(), 'Lien non distribué : ' + name);
      if (entry.isDirectory()) await inspecter(name);
      else assert.ok(name === 'distribution.json' || Object.hasOwn(manifest.files, name), 'Fichier non distribué : ' + name);
    }
  }
  await inspecter();
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'));
    assert.equal(hash(await readFile(path.join(destination, name))), expected, name);
  }
  return manifest;
}

export async function distribuer({ destination, commit, source = root }) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'Un commit Git complet est requis.');
  const names = execFileSync('git', ['-C', source, 'ls-tree', '-r', '--name-only', '-z', commit, '--',
    'index.html', 'servir.mjs', 'package.json', 'LICENSE', 'app', 'styles']).toString().split('\0').filter(Boolean);
  const mappings = Object.fromEntries(names.filter(n => !Object.hasOwn(substitutions, n)).map(n => [n, n]));
  Object.assign(mappings, substitutions, {
    'outils/preparer-entreprise.mjs': 'outils/preparer-entreprise.mjs',
    'outils/distribuer-entreprise.mjs': 'outils/distribuer-entreprise.mjs',
  });
  // Existing destinations are never cleaned, overlaid or overwritten.
  await mkdir(destination, { recursive: false, mode: 0o700 });
  const manifest = { schema: 1, profile: 'entreprise-v1', repository: 'xtincell/la-barre', commit,
    notice: 'Native shared core. Company profile and example substituted before any Docker layer. No customer corpus or assets.',
    substitutions, files: {} };
  for (const [name, original] of Object.entries(mappings)) {
    const bytes = execFileSync('git', ['-C', source, 'show', `${commit}:${original}`]);
    await mkdir(path.dirname(path.join(destination, name)), { recursive: true });
    await writeFile(path.join(destination, name), bytes);
    manifest.files[name] = hash(bytes);
  }
  await writeFile(path.join(destination, 'distribution.json'), JSON.stringify(manifest, null, 2) + '\n');
  await verifier(destination);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--verifier') {
    const manifest = await verifier(path.resolve(process.argv[3] || '.'));
    console.log(JSON.stringify({ profile: manifest.profile, source: manifest.commit, files: Object.keys(manifest.files).length, exact: true }));
  } else {
    const [destination, commit] = process.argv.slice(2);
    assert.ok(destination && commit, 'Usage: node outils/distribuer-entreprise.mjs <new-directory> <40-char-commit>');
    const manifest = await distribuer({ destination: path.resolve(destination), commit });
    console.log(JSON.stringify({ profile: manifest.profile, source: manifest.commit, files: Object.keys(manifest.files).length }));
  }
}
