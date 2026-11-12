// La vitrine publique : une distribution statique, sans serveur ni base.
//
// La vitrine (vitrine/index.html) raconte le brief-au-BAT et ouvre la
// démonstration (vitrine/demo/), qui fait tourner l'application elle-même sur
// une base fictive. Pour la publier, on ne sert pas le dépôt : servir.mjs sert
// tout son dossier, et l'outil réel vit derrière la session de La Fusée. On
// extrait d'un commit les seuls fichiers dont la vitrine a besoin, et on les
// pose sur un hébergement statique, qui ne connaît ni écriture ni base.
//
//   node outils/distribuer-vitrine.mjs <nouveau-dossier> <commit de 40 caractères>
//   node outils/distribuer-vitrine.mjs --verifier <dossier>
//
// Ce qui part : vitrine/, app/ sans le profil ni l'exemple de l'installation
// historique (app/maison.js, app/amorce.js : la démonstration charge les siens),
// styles/ et LICENSE, plus un index.html racine qui mène à la vitrine. Ce qui ne
// part jamais : servir.mjs, depots/, assets/, sources/, documents/, extraits/,
// kit-ordi-dedie/, outils/, profils/, tests/.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export const PROFIL = 'vitrine-v1';
export const RETENUS = ['vitrine', 'app', 'styles', 'LICENSE'];
export const EXCLUS = ['app/maison.js', 'app/amorce.js'];
/* Ce que la vitrine ne doit jamais porter : les marqueurs de l'installation
 * historique, que ses propres fichiers et son profil ne nomment pas. */
export const MARQUEURS = /MATANGA|Matanga|P-alex|MT-0020|MT-0031|Djengue|Friesland|Bonnet Rouge|Beignet/;
const RACINE_HTML = '<!DOCTYPE html>\n<html lang="fr">\n  <head>\n    <meta charset="utf-8" />\n'
  + '    <meta http-equiv="refresh" content="0; url=vitrine/index.html" />\n'
  + '    <title>La Barre — démonstration, données fictives</title>\n  </head>\n'
  + '  <body><p><a href="vitrine/index.html">La Barre — du brief au BAT. Démonstration, données fictives.</a></p></body>\n</html>\n';

/* Les fichiers qu'une page appelle par src ou href relatifs. */
function references(html) {
  return [...html.matchAll(/\s(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(x => x && !x.startsWith('data:'));
}

export async function verifier(destination) {
  const manifest = JSON.parse(await readFile(path.join(destination, 'distribution.json'), 'utf8'));
  assert.equal(manifest.profile, PROFIL);
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
    assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'), name);
    assert.ok(name === 'index.html' || RETENUS.some(r => name === r || name.startsWith(r + '/')), 'Hors de la vitrine : ' + name);
    assert.ok(!EXCLUS.includes(name), 'Profil historique distribué : ' + name);
    assert.equal(hash(await readFile(path.join(destination, name))), expected, name);
  }
  /* La vitrine et la démonstration trouvent tout ce qu'elles appellent. */
  for (const page of ['vitrine/index.html', 'vitrine/demo/index.html']) {
    const html = await readFile(path.join(destination, page), 'utf8');
    for (const ref of references(html)) {
      const cible = path.posix.normalize(path.posix.join(path.posix.dirname(page), ref));
      assert.ok(Object.hasOwn(manifest.files, cible), page + ' appelle ' + ref + ', absent de la distribution');
    }
  }
  assert.ok(Object.hasOwn(manifest.files, 'vitrine/demo/base-fictive.json'), 'La base fictive manque.');
  for (const name of Object.keys(manifest.files).filter(n => n.startsWith('vitrine/') && !/\.(woff2?|png|jpe?g)$/.test(n))) {
    assert.doesNotMatch(await readFile(path.join(destination, name), 'utf8'), MARQUEURS, 'Marqueur de l’installation historique : ' + name);
  }
  return manifest;
}

export async function distribuer({ destination, commit, source = root }) {
  assert.match(commit, /^[a-f0-9]{40}$/, 'Un commit Git complet est requis.');
  const names = execFileSync('git', ['-C', source, 'ls-tree', '-r', '--name-only', '-z', commit, '--', ...RETENUS])
    .toString().split('\0').filter(Boolean).filter(n => !EXCLUS.includes(n));
  // Une destination existante n'est jamais nettoyée, recouverte ni remplacée.
  await mkdir(destination, { recursive: false, mode: 0o755 });
  const manifest = { schema: 1, profile: PROFIL, repository: 'xtincell/la-barre', commit,
    notice: 'Static showcase. Fictitious demo base, no server, no depot, no historic profile or example.',
    exclus: EXCLUS.slice(), files: {} };
  for (const name of names) {
    const bytes = execFileSync('git', ['-C', source, 'show', `${commit}:${name}`]);
    await mkdir(path.dirname(path.join(destination, name)), { recursive: true });
    await writeFile(path.join(destination, name), bytes);
    manifest.files[name] = hash(bytes);
  }
  await writeFile(path.join(destination, 'index.html'), RACINE_HTML);
  manifest.files['index.html'] = hash(Buffer.from(RACINE_HTML));
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
    assert.ok(destination && commit, 'Usage: node outils/distribuer-vitrine.mjs <nouveau-dossier> <commit de 40 caractères>');
    const manifest = await distribuer({ destination: path.resolve(destination), commit });
    console.log(JSON.stringify({ profile: manifest.profile, source: manifest.commit, files: Object.keys(manifest.files).length }));
  }
}
