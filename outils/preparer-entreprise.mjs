// Initialize only a new empty store using DEPOT.vide(), never a copied example.
import { readFile, writeFile, readdir, rename, lstat } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function preparer({ application = root, destination = path.join(root, 'depots') } = {}) {
  const names = await readdir(destination);
  if (names.includes('manifeste.json')) {
    const marker = path.join(destination, 'manifeste.json');
    assert.ok(!(await lstat(marker)).isSymbolicLink(), 'Le manifeste ne peut pas être un lien.');
    const manifest = JSON.parse(await readFile(marker, 'utf8'));
    assert.match(manifest.reference || '', /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.json$/);
    assert.notEqual(manifest.reference, 'manifeste.json');
    const existing = path.join(destination, manifest.reference);
    assert.ok((await lstat(existing)).isFile() && !(await lstat(existing)).isSymbolicLink(), 'Le dépôt annoncé doit exister.');
    JSON.parse(await readFile(existing, 'utf8'));
    return { created: false, reference: manifest.reference };
  }
  assert.equal(names.length, 0, 'Des fichiers existent sans manifeste. Aucun dépôt vide ne les masquera.');
  const sandbox = {};
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const name of ['maison-base.js', 'maison.js', 'depot.js']) {
    vm.runInContext(await readFile(path.join(application, 'app', name), 'utf8'), context, { filename: name });
  }
  const data = sandbox.DEPOT.vide();
  data.reference = 'entreprise.json';
  await writeFile(path.join(destination, '.entreprise-initiale'), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await rename(path.join(destination, '.entreprise-initiale'), path.join(destination, data.reference));
  // The pointer is committed last; a failed initial write never names a partial file.
  await writeFile(path.join(destination, 'manifeste.json'), JSON.stringify({ reference: data.reference }) + '\n', { flag: 'wx', mode: 0o600 });
  return { created: true, reference: data.reference };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await preparer()));
}
