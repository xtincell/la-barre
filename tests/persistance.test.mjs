import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

let root, child, origin;
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'la-barre-persistence-'));
  await mkdir(join(root, 'depots'));
  await copyFile(new URL('../servir.mjs', import.meta.url), join(root, 'servir.mjs'));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  origin = 'http://127.0.0.1:' + port;
  child = spawn(process.execPath, [join(root, 'servir.mjs'), String(port)], { stdio: ['ignore','pipe','pipe'] });
  await once(child.stdout, 'data');
});
after(async () => {
  if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); }
  if (root) await rm(root, { recursive: true, force: true });
});
async function fixture(name) {
  const data = { schema: 5, enregistre_le: '2026-10-06T00:00:00.000Z', projets: [{ id: 'P1', nom: 'Initial' }] };
  await writeFile(join(root, 'depots', name + '.json'), JSON.stringify(data));
  const url = origin + '/depots/' + name + '.json';
  const read = await fetch(url);
  return { url, data, revision: read.headers.get('etag') };
}
const put = (url, data, headers = {}) => fetch(url, {
  method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data),
});

test('la révision identifie le contenu exact, même sans changement de date', async () => {
  const f = await fixture('revision');
  assert.match(f.revision || '', /^"[a-f0-9]{64}"$/);
  const changed = { ...f.data, projets: [{ id: 'P1', nom: 'Corrigé' }] };
  const saved = await put(f.url, changed, { 'If-Match': f.revision });
  assert.equal(saved.status, 200);
  assert.notEqual(saved.headers.get('etag'), f.revision);
  const receipt = await saved.json();
  assert.equal(receipt.revision, saved.headers.get('etag'));
  assert.equal(receipt.enregistre_le, f.data.enregistre_le);
});

test('deux écritures concurrentes depuis la même lecture : une reçue, les autres refusées', async () => {
  const f = await fixture('concurrent');
  const results = await Promise.all(Array.from({ length: 16 }, (_, i) => put(f.url,
    { ...f.data, enregistre_le: `2026-10-06T01:00:${String(i).padStart(2,'0')}.000Z`, projets: [{ id: 'P1', nom: 'Geste ' + i }] },
    { 'X-Base': f.data.enregistre_le })));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal(results.filter(r => r.status === 409).length, 15);
  assert.match((await (await fetch(f.url)).json()).projets[0].nom, /^Geste /);
});

test('la nouvelle tentative d’un geste reçu reste idempotente après perte de réponse', async () => {
  const f = await fixture('retry');
  const next = { ...f.data, enregistre_le: '2026-10-06T02:00:00.000Z' };
  const first = await put(f.url, next, { 'X-Base': f.data.enregistre_le });
  assert.equal(first.status, 200);
  const retry = await put(f.url, next, { 'X-Base': f.data.enregistre_le });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).dejaRecu, true);
});

test('une révision dépassée ne remplace jamais le fichier courant', async () => {
  const f = await fixture('conflict');
  const first = { ...f.data, enregistre_le: '2026-10-06T02:00:00.000Z', projets: [{ id: 'P1', nom: 'Reçu' }] };
  assert.equal((await put(f.url, first, { 'X-Base': f.data.enregistre_le })).status, 200);
  const stale = await put(f.url, { ...first, projets: [] }, { 'If-Match': f.revision || '"ancienne"' });
  assert.equal(stale.status, 409);
  assert.equal((await (await fetch(f.url)).json()).projets[0].nom, 'Reçu');
});

test('une base illisible ne se remplace pas silencieusement', async () => {
  const f = await fixture('corrupt');
  await writeFile(join(root, 'depots/corrupt.json'), '{interrompu');
  const r = await put(f.url, f.data, { 'X-Base': f.data.enregistre_le });
  assert.equal(r.status, 409);
  assert.equal(await readFile(join(root, 'depots/corrupt.json'), 'utf8'), '{interrompu');
});

test('une création exige une intention de création et ne remplace pas un dépôt apparu entre-temps', async () => {
  const url = origin + '/depots/new.json';
  assert.equal((await put(url, { schema: 5 })).status, 428);
  assert.equal((await put(url, { schema: 5 }, { 'If-None-Match': '*' })).status, 200);
  assert.equal((await put(url, { schema: 5, projets: [] }, { 'If-None-Match': '*' })).status, 409);
});
