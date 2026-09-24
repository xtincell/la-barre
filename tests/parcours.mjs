// Tests sur une base fictive, avec serveur et navigateur éphémères.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await readFile(new URL('./fixtures/studio.json', import.meta.url), 'utf8');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
  try { const data = await readFile(path); res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Erreur navigateur:', e.stack); });
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(data => { DEPOT.importer(data); APP.rendre(); }, fixture);
  await page.getByRole('heading', { name: "L'œil sur la création." }).waitFor();
  assert.equal(await page.locator('.studio-piece').count(), 3);
  await page.locator('.studio-piece').nth(1).click();
  assert.match(await page.locator('.studio-intention').innerText(), /Plus d’attachement/);
  assert.equal(await page.locator('.studio-piece[aria-pressed="true"]').count(), 1);
  await page.getByLabel('Projet', { exact: true }).selectOption('PRJ-demo-2');
  await page.getByText("Ce projet n'attend pas de verdict.").waitFor();
  await page.getByLabel('Projet', { exact: true }).selectOption('');
  await page.locator('.studio-piece').filter({ hasText: 'Affiche de lancement' }).click();
  await page.getByRole('button', { name: 'Examiner et décider', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  assert.ok(await page.locator('.rc-verdicts').isVisible(), 'Le verdict est accessible sans un onglet supplémentaire');
  await page.getByRole('button', { name: 'Fermer le panneau', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]')), 'Le focus reste dans le panneau');
  const approve = page.locator('.rc-v.approuve');
  await approve.click();
  assert.equal(await page.evaluate(() => DEPOT.trouve('projets','PRJ-demo').livrables[0].versions[0].verdict), 'approuve');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.studio-piece').count(), 2, 'La pièce validée sort de la revue');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => DEPOT.trouve('projets','PRJ-demo').livrables[0].versions[0].verdict), 'approuve', 'Le verdict survit au rechargement');
  // Deux retours touchant le même livrable ne doivent pas perdre leur identité.
  await page.evaluate(() => {
    DEPOT.ajoute('feedbacks', { id: 'FB-a', projet:'PRJ-demo', niveau:'declinaison', cibles:['L-demo'], texte:'Revoir la signature', auteur:'P-da', quand:'2026-09-24', issue:'ouvert' });
    DEPOT.ajoute('feedbacks', { id: 'FB-b', projet:'PRJ-demo', niveau:'declinaison', cibles:['L-demo'], texte:'Agrandir le produit', auteur:'P-da', quand:'2026-09-24', issue:'ouvert' });
  });
  const retours = await page.evaluate(() => FILE.tout().filter(x => x.verbatim).map(x => ({ texte:x.verbatim, impact:x.chiffre, ou:x.ou })));
  assert.equal(retours.length, 2);
  assert.ok(retours.every(x => /1 livrable/.test(x.impact) && x.ou.includes('PRJ-demo')));
  await page.goto(url + '/#/projets');
  await page.getByLabel('Rechercher un projet').fill('inexistant');
  await page.getByText('Aucun projet ne correspond.').waitFor();
  await page.getByLabel('Rechercher un projet').fill('Nacre');
  assert.equal(await page.locator('.studio-dossier').count(), 1);
  await page.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
  await page.getByLabel('Client', { exact: true }).fill('Studio fictif');
  await page.getByLabel('Nom du projet', { exact: true }).fill('Projet de contrôle');
  await page.getByRole('button', { name:'Créer', exact:true }).click();
  await page.waitForFunction(() => location.hash.startsWith('#/projets/PRJ-'));
  assert.ok(await page.evaluate(() => DEPOT.liste('projets').some(p => p.nom === 'Projet de contrôle')));
  // Aucun ancien lien ne doit provoquer d'erreur de rendu.
  for (const route of ['bureau','valider','planning','reporting','projets','projets/marques','referentiel','attentes','reglages']) {
    await page.goto(url + '/#/' + route);
    await page.waitForTimeout(60);
    assert.ok((await page.locator('#contenu').innerText()).length > 10, route);
  }
  // Captures reproductibles de la refonte : uniquement la fixture fictive.
  await page.evaluate(data => { DEPOT.importer(data); }, fixture);
  await page.goto(url + '/#/bureau');
  await page.getByLabel('Projet', { exact:true }).selectOption('');
  await page.locator('.studio-piece').first().click();
  if (process.env.SCREENSHOT_DIR) {
    await mkdir(process.env.SCREENSHOT_DIR, { recursive:true });
    await page.screenshot({ path: resolve(process.env.SCREENSHOT_DIR, 'bureau.png') });
    await page.goto(url + '/#/projets');
    await page.getByLabel('Rechercher un projet').fill('');
    await page.screenshot({ path: resolve(process.env.SCREENSHOT_DIR, 'projets.png') });
  }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['bureau', 'projets', 'valider']) {
      await page.goto(url + '/#/' + route);
      await page.waitForTimeout(60);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Pas de débordement ${route} à ${width}px`);
    }
  }
  await page.evaluate(() => { DEPOT.reinitialiser(); location.hash = '#/bureau'; APP.rendre(); });
  await page.getByRole('button', { name:'Créer mon premier projet', exact:true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS — revue, verdict persistant, retours distincts, recherche, création, 9 routes, clavier, 3 formats, base vide.');
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
