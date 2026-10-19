// Distribution artifact of the canonical standalone tool, never a second
// authored engine. Updating it requires an explicit source commit.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const target = fileURLToPath(new URL('../app/ateliers/approches/', import.meta.url));
const files = ['index.html', 'raccord.js', 'LICENSE'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv[2] === '--check') {
  const manifest = JSON.parse(await readFile(path.join(target, 'source.json'), 'utf8'));
  assert.equal(manifest.repository, 'xtincell/generateur-approches');
  assert.match(manifest.commit, /^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(manifest.files), files);
  for (const name of files) assert.equal(digest(await readFile(path.join(target, name))), manifest.files[name], name);
  console.log('Distribution Approches : trois fichiers exacts au manifeste de source.');
} else {
  const [source, commit] = process.argv.slice(2);
  assert.ok(source && /^[a-f0-9]{40}$/.test(commit || ''), 'Usage: node outils/distribuer-approches.mjs <source-repository> <40-char-commit>');
  await mkdir(target, { recursive: true });
  const manifest = { schema: 1, repository: 'xtincell/generateur-approches', commit,
    notice: 'Generated distribution copy. Edit the canonical component, then regenerate with its explicit commit.', files: {} };
  for (const name of files) {
    const bytes = execFileSync('git', ['-C', source, 'show', `${commit}:${name}`]);
    await writeFile(path.join(target, name), bytes); manifest.files[name] = digest(bytes);
  }
  await writeFile(path.join(target, 'source.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Distribution Approches préparée depuis ' + commit);
}
