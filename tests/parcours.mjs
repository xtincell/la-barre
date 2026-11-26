// Tests sur une base fictive, avec serveur et navigateur éphémères.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, symlink, copyFile, writeFile, rm } from 'node:fs/promises';
import { extname, resolve, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer as reserver } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
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
  // L'horloge de la page est celle de Playwright : le délai d'annulation d'une
  // validation se rejoue sans attendre huit vraies secondes.
  await page.clock.install();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(data => { DEPOT.importer(data); APP.rendre(); }, fixture);
  await page.getByRole('heading', { name: "Sur la table" }).waitFor();
  // Un écran de studio très large doit commencer au même endroit que sur un portable.
  await page.setViewportSize({width: 3200, height: 1694});
  const bureau = await page.locator('#contenu h1').boundingBox();
  const rail = await page.locator('.lb-rail').boundingBox();
  assert.ok(bureau.y < 150 && bureau.x < rail.width + 100, 'Le travail commence en haut, près de la navigation');
  const pieceBureau = await page.locator('.lb-piece').boundingBox();
  const dossiersBureau = await page.locator('.studio-dossiers').boundingBox();
  assert.ok(dossiersBureau.x >= pieceBureau.x + pieceBureau.width && dossiersBureau.y < pieceBureau.y + 10,
    'Les dossiers sont accessibles à côté de la pièce sur un grand écran');
  await page.setViewportSize({width: 1440, height: 1050});
  assert.equal(await page.locator('.studio-piece').count(), 3);
  const listeRevue = page.locator('.lb-file');
  await listeRevue.locator('summary').click();
  await page.locator('.studio-piece').nth(1).click();
  assert.match(await page.locator('.studio-intention').innerText(), /Plus d’attachement/);
  assert.equal(await page.locator('.studio-piece[aria-pressed="true"]').count(), 1);
  await listeRevue.locator('summary').click();
  await page.getByLabel('Projet', { exact: true }).selectOption('PRJ-demo-2');
  await page.getByText("Rien à valider dans ce projet.").waitFor();
  await page.getByLabel('Projet', { exact: true }).selectOption('');
  await page.locator('.studio-piece').filter({ hasText: 'Affiche de lancement' }).click();
  await page.getByRole('link', { name: 'Examiner la V1', exact: true }).click();
  await page.waitForURL('**/#/projets/PRJ-demo/livrables/L-demo/juger/1');
  await page.setViewportSize({ width: 390, height: 650 });
  const valider = page.getByRole('button', { name:'Valider la V1', exact:true });
  const modifs = page.getByRole('button', { name:'Demander des modifs', exact:true });
  const critere = page.locator('.rvp-critere');
  await valider.waitFor();
  assert.match(await critere.innerText(), /Un seul objet au centre/);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const positions = await page.evaluate(() => ({
    valider: document.querySelector('[data-geste="valider"]').getBoundingClientRect().bottom + window.scrollY,
    modifs: document.querySelector('[data-geste="modifs"]').getBoundingClientRect().bottom + window.scrollY,
    navigation: document.querySelector('.lb-mobile').getBoundingClientRect().top,
    largeur: innerWidth, hauteur: innerHeight,
  }));
  assert.equal(positions.largeur, 390);
  assert.equal(positions.hauteur, 650);
  assert.ok(Math.max(positions.valider, positions.modifs) <= positions.navigation,
    `Le critère et les deux décisions précèdent la navigation à 390×650 (${JSON.stringify(positions)})`);
  const verdictDemo = () => page.evaluate(() => DEPOT.trouve('projets','PRJ-demo').livrables[0].versions[0].verdict || null);
  // Demander des modifs : un seul panneau, « Ce qu'il faut changer » est exigé
  // et prérempli par les retours posés sur l'image.
  await page.evaluate(() => ANNOT.poser(DEPOT.trouve('projets','PRJ-demo').livrables[0], 40, 30, 'Agrandir le logo', null));
  await modifs.click();
  const demande = page.getByRole('dialog', { name:'Demander des modifs' });
  await demande.waitFor();
  const aChanger = demande.getByLabel("Ce qu'il faut changer", { exact: true });
  assert.equal(await aChanger.inputValue(), '1. Agrandir le logo', 'Les retours posés sur l’image préremplissent la demande');
  await aChanger.fill('');
  await demande.getByRole('button', { name:'Envoyer la demande', exact:true }).click();
  await demande.getByText("Dites ce qu'il faut changer avant d'envoyer la demande.").waitFor();
  assert.equal(await verdictDemo(), null, 'Une demande vide n’écrit rien');
  await demande.getByRole('button').first().focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await demande.evaluate(d => d.contains(document.activeElement)), 'Le focus reste dans la demande');
  await page.keyboard.press('Escape');
  assert.equal(await demande.count(), 0);
  assert.ok(await modifs.evaluate(n => n === document.activeElement), 'Retour à « Demander des modifs » après Échap');
  await page.evaluate(() => { delete DEPOT.trouve('projets','PRJ-demo').livrables[0].annotations; });
  // Valider : un clic, puis huit secondes pour se reprendre. Rien ne s'écrit
  // avant l'échéance, donc Radar ne lit jamais une validation annulée.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  await valider.click();
  const avis = page.locator('.avis-pile .avis.action');
  await avis.getByText('V1 validée.').waitFor();
  await page.getByRole('button', { name:'Annuler la validation', exact:true }).waitFor();
  assert.equal(await verdictDemo(), null, 'Rien n’est écrit pendant le délai d’annulation');
  await avis.getByRole('button', { name:'Annuler', exact:true }).click();
  await valider.waitFor();
  await page.clock.runFor(10000);
  assert.equal(await verdictDemo(), null, 'Une validation annulée ne laisse aucune décision');
  assert.equal(await page.evaluate(() => DEPOT.liste('decisions').length), 0);
  await valider.click();
  // Quitter la pièce puis y revenir pendant le délai : l'échéance redessine
  // l'écran rouvert, pas celui du premier clic.
  const annulerValidation = page.getByRole('button', { name:'Annuler la validation', exact:true });
  await annulerValidation.waitFor();
  await page.goto(url + '/#/bureau');
  await page.waitForFunction(() => location.hash === '#/bureau');
  await page.goBack();
  await annulerValidation.waitFor();
  await page.clock.runFor(7000);
  assert.equal(await verdictDemo(), null, 'La validation attend son échéance');
  await page.clock.runFor(1000);
  assert.equal(await verdictDemo(), 'approuve', 'À l’échéance, la validation s’écrit');
  assert.equal(await annulerValidation.count(), 0, 'L’écran rouvert ne propose plus d’annuler une validation enregistrée');
  await page.locator('.rvp-etat').getByText('Validé', { exact:true }).waitFor();
  await page.clock.resume();
  await page.getByRole('link', { name:'Suivre le BAT et la remise' }).waitFor();
  assert.equal(await valider.count(), 0, 'La décision enregistrée reste en lecture seule');
  assert.equal(await avis.count(), 0, 'L’avis d’annulation part avec l’échéance');
  // Un refus corrigé ne s'empile pas : le suivant, ou un succès, le remplace.
  // Le ✕ d'un avis se touche au doigt : 44 px de côté.
  const pile = await page.evaluate(() => {
    AVIS.refus('Premier refus'); AVIS.refus('Second refus');
    const refus = document.querySelectorAll('.avis-pile .avis.refus').length;
    const x = document.querySelector('.avis-pile .avis.refus .avis-x').getBoundingClientRect();
    AVIS.fait('Réussi');
    const apres = document.querySelectorAll('.avis-pile .avis.refus').length;
    document.querySelectorAll('.avis-pile .avis').forEach(n => n.remove());
    return { refus, apres, x: [Math.round(x.width), Math.round(x.height)] };
  });
  assert.deepEqual(pile, { refus: 1, apres: 0, x: [44, 44] });
  await page.goBack();
  await page.setViewportSize({ width:1440, height:1050 });
  await page.getByRole('heading', {name:'Sur la table'}).waitFor();
  assert.equal(await page.locator('.studio-piece').count(), 2, 'La pièce validée sort de la revue');
  // Un lien de décision partagé continue à viser la même version après une nouvelle soumission.
  await page.evaluate(() => {
    const l = DEPOT.trouve('projets','PRJ-demo').livrables[0];
    l.version = 2; l.versions.push({n:2});
  });
  for (const onglet of ['juger', 'remise', 'poser', 'origine']) {
    await page.goto(url + '/#/projets/PRJ-demo/livrables/L-demo/' + onglet + '/1');
    await page.getByRole('heading',{name:'Version 1 · historique'}).waitFor();
    assert.equal(await page.locator('.rvp-archive button').count(), 0, 'Une version historique ne permet aucune écriture');
    assert.equal(await valider.count(), 0);
    await page.locator('.rvp-archive').getByText('Validé', { exact: true }).waitFor();
  }
  await page.goto(url+'/#/bureau');
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
  await page.goto(url + '/#/projets/PRJ-demo/atelier');
  await page.getByRole('button', { name:'Poser une idée', exact:true }).waitFor();
  await page.goto(url + '/#/bureau');
  const reprendre = page.getByRole('link', { name:/Reprendre · Séance de créa/ });
  await reprendre.click();
  assert.ok(page.url().endsWith('/PRJ-demo/atelier'), 'Le Bureau reprend le travail au bon endroit');
  await page.goto(url + '/#/projets/galerie');
  const campagne = page.getByRole('searchbox', {name:'Rechercher une campagne'});
  await campagne.fill('campagne introuvable');
  await page.getByRole('heading', {name:'Aucune campagne ne correspond.'}).waitFor();
  await page.getByRole('navigation', {name:'Vues des projets'}).getByRole('link', {name:'En cours'}).click();
  await page.goto(url + '/#/projets');
  await page.getByLabel('Rechercher un projet').fill('inexistant');
  await page.getByText('Aucun projet ne correspond.').waitFor();
  await page.getByLabel('Rechercher un projet').fill('Nacre');
  assert.equal(await page.locator('.studio-dossier').count(), 1);
  await page.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
  await page.getByLabel('Client', { exact: true }).fill('Studio fictif');
  await page.getByLabel('Nom du projet', { exact: true }).fill('Projet de contrôle');
  await page.getByRole('button', { name:'Créer', exact:true }).click();
  // Le projet créé s'ouvre sur sa propre route. Le préfixe de l'identifiant
  // vient du dépôt (DEPOT.ajoute) : on vérifie la route du projet réellement
  // créé plutôt qu'un préfixe supposé, qui avait dérivé (PRJ- contre PRO-).
  await page.waitForFunction(() => {
    const cree = DEPOT.liste('projets').find(p => p.nom === 'Projet de contrôle');
    return cree && location.hash === '#/projets/' + cree.id;
  });
  assert.ok(await page.evaluate(() => DEPOT.liste('projets').some(p => p.nom === 'Projet de contrôle')));
  // Son identifiant est unique entre postes : le code de ce poste, celui de ses
  // décisions, et douze caractères tirés par crypto.
  const cree = await page.evaluate(() => {
    const p = DEPOT.liste('projets').find(x => x.nom === 'Projet de contrôle');
    return { id: p.id, cree_le: p.cree_le, poste: localStorage.getItem('la-barre-poste'), ref: p.ref, demande: p.refDemandee || null };
  });
  // Cette base n'a pas de base de référence servie (l'exemple, sans serveur) : le
  // poste attribue lui-même la référence, avec la règle du serveur.
  assert.equal(cree.ref, 'PRJ-0001');
  assert.equal(cree.demande, null);
  assert.match(cree.id, /^PRO-[0-9a-z]{4}-[0-9a-z]{12}$/);
  assert.equal(cree.id.split('-')[1], cree.poste);
  assert.ok(!Number.isNaN(Date.parse(cree.cree_le)));
  await page.getByRole('heading', {level:1,name:'Projet de contrôle'}).waitFor();
  // La recherche conserve le résultat au clavier et ouvre le livrable identifié.
  await page.keyboard.press('Control+f');
  const rechercheGlobale = page.getByRole('dialog', { name:'Rechercher' });
  const saisie = rechercheGlobale.getByRole('searchbox');
  await saisie.fill('Affiche de lancement');
  await saisie.press('ArrowDown');
  assert.ok(await page.evaluate(() => document.activeElement.matches('.lb-resultats a')));
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#/projets/PRJ-demo/livrables/L-demo');
  await page.getByRole('heading',{level:1,name:'Affiche de lancement'}).waitFor();
  await page.keyboard.press('Control+f');
  await saisie.fill('support');
  await saisie.press('Escape');
  assert.equal(await rechercheGlobale.count(),0);
  await page.setViewportSize({width:320,height:700});
  await page.getByRole('navigation',{name:'Navigation mobile'}).getByRole('link',{name:'Plus'}).click();
  await page.locator('.lb-liste-liens').getByRole('link',{name:'Planning'}).click();
  await page.locator('.lb-modes summary').click();
  await page.locator('.lb-modes a[href="#/planning/charge"]').click();
  await page.waitForURL('**/#/planning/charge');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.lb-modes summary').click();
  assert.match(await page.locator('.lb-modes [aria-current="page"]').innerText(),/Plan de charge/);
  await page.setViewportSize({width:1440,height:1050});
  // Aucun ancien lien ne doit provoquer d'erreur de rendu.
  for (const route of ['bureau','valider','planning','reporting','projets','projets/marques','referentiel','attentes','reglages']) {
    await page.goto(url + '/#/' + route);
    await page.waitForTimeout(60);
    assert.ok((await page.locator('#contenu').innerText()).length > 10, route);
  }
  // Captures reproductibles de la refonte : uniquement la fixture fictive.
  await page.evaluate(data => { DEPOT.importer(data); }, fixture);
  await page.goto(url + '/#/bureau');
  await page.locator('.lb-file summary').click();
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
  // La décision rendue plus haut porte le code de ce poste, tiré par crypto et
  // gardé dans le navigateur. Réimporter la base ne double aucune décision ;
  // une décision d'un autre poste sous le même identifiant est renommée et tracée.
  const unicite = await page.evaluate(() => {
    const avant = DEPOT.liste('decisions').map(d => d.id);
    const fichier = JSON.parse(JSON.stringify(DEPOT.tout()));
    const d = fichier.decisions[fichier.decisions.length - 1];
    fichier.decisions.push({ ...d, titre: 'Vue par un autre poste', motif: 'Approuvée ailleurs' });
    const r = DEPOT.importer(JSON.stringify(fichier)).decisions;
    return { avant, apres: DEPOT.liste('decisions').map(x => x.id), poste: localStorage.getItem('la-barre-poste'), r,
      trace: DEPOT.journal().some(e => e.action === 'renommage' && e.id === r.renommees[0].vers) };
  });
  assert.equal(unicite.avant.length, 1);
  assert.match(unicite.avant[0], /^DEC-[0-9a-z]{4}-[0-9a-z]{12}$/);
  assert.equal(unicite.avant[0].split('-')[1], unicite.poste);
  assert.equal(unicite.r.deja, 1); assert.equal(unicite.r.renommees.length, 1);
  assert.deepEqual(unicite.apres, [unicite.avant[0], unicite.r.renommees[0].vers]);
  assert.ok(unicite.trace, 'le renommage est au journal');
  // Une page qui se ferme pendant le délai marque sa validation à rejouer :
  // elle s'écrit à la réouverture, une fois la base lue, et l'avis le dit.
  const fermee = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  fermee.on('pageerror', e => { errors.push(e.message); console.error('Erreur navigateur (fermée):', e.stack); });
  fermee.setDefaultTimeout(10000);
  await fermee.clock.install();
  await fermee.goto(url, { waitUntil: 'networkidle' });
  await fermee.evaluate(data => { DEPOT.importer(data); APP.rendre(); }, fixture);
  await fermee.goto(url + '/#/projets/PRJ-demo/livrables/L-demo/juger/1');
  await fermee.clock.pauseAt(await fermee.evaluate(() => Date.now()) + 1000);
  await fermee.getByRole('button', { name:'Valider la V1', exact:true }).click();
  await fermee.locator('.avis-pile .avis.action').waitFor();
  assert.equal(await fermee.evaluate(() => DEPOT.trouve('projets','PRJ-demo').livrables[0].versions[0].verdict || null), null);
  await fermee.reload({ waitUntil: 'networkidle' });
  await fermee.clock.resume();
  assert.equal(await fermee.evaluate(() => DEPOT.trouve('projets','PRJ-demo').livrables[0].versions[0].verdict), 'approuve',
    'La validation engagée s’écrit quand la page se ferme');
  assert.equal(await fermee.evaluate(() => DEPOT.liste('decisions').filter(d => d.objet === 'L-demo').length), 1);
  await fermee.getByText('Validation de la V1 de « Affiche de lancement » enregistrée.').waitFor();
  assert.equal(await fermee.evaluate(() => localStorage.getItem('la-barre-validations')), null, 'La note rejouée est retirée');
  await fermee.close();
  await page.evaluate(() => { DEPOT.reinitialiser(); location.hash = '#/bureau'; APP.rendre(); });
  await page.getByRole('button', { name:'Créer mon premier projet', exact:true }).waitFor();
  // Avec une base de référence servie par servir.mjs : la référence d'un projet
  // neuf est provisoire à l'écran, puis attribuée au premier enregistrement.
  const racine = await mkdtemp(join(tmpdir(), 'la-barre-parcours-'));
  let servi = null;
  try {
    for (const nom of ['index.html', 'app', 'styles']) await symlink(resolve(root, nom), join(racine, nom));
    await copyFile(resolve(root, 'servir.mjs'), join(racine, 'servir.mjs'));
    await mkdir(join(racine, 'depots'));
    const base = JSON.parse(fixture); delete base.exemple; base.enregistre_le = '2026-11-12T08:00:00.000Z';
    await writeFile(join(racine, 'depots', 'manifeste.json'), JSON.stringify({ reference: 'parcours.json' }));
    await writeFile(join(racine, 'depots', 'parcours.json'), JSON.stringify(base));
    const r = reserver(); r.listen(0, '127.0.0.1'); await once(r, 'listening');
    const port = r.address().port; await new Promise(x => r.close(x));
    servi = spawn(process.execPath, [join(racine, 'servir.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
    await once(servi.stdout, 'data');
    // Un contexte à part : ses onglets partagent un même navigateur (stockage).
    const navigateur = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
    const pageServie = await navigateur.newPage();
    pageServie.on('pageerror', e => { errors.push(e.message); console.error('Erreur navigateur (servie):', e.stack); });
    pageServie.setDefaultTimeout(10000);
    await pageServie.goto('http://127.0.0.1:' + port + '/#/projets', { waitUntil: 'networkidle' });
    await pageServie.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
    await pageServie.getByLabel('Client', { exact: true }).fill('Studio fictif');
    await pageServie.getByLabel('Nom du projet', { exact: true }).fill('Projet servi');
    await pageServie.getByRole('button', { name: 'Créer', exact: true }).click();
    const attente = await pageServie.evaluate(() => {
      const p = DEPOT.liste('projets').find(x => x.nom === 'Projet servi');
      return { ref: p.ref, demande: p.refDemandee || null, attribuee: DEPOT.referenceAttribuee(p) };
    });
    assert.equal(attente.ref, 'PRJ-… (provisoire)');
    assert.deepEqual(attente.demande, { prefixe: 'PRJ' });
    assert.equal(attente.attribuee, null);
    await pageServie.locator('.pj-reference', { hasText: '(provisoire)' }).waitFor();
    await pageServie.waitForFunction(() => DEPOT.referenceAttribuee(DEPOT.liste('projets').find(x => x.nom === 'Projet servi')) === 'PRJ-0001');
    const lu = JSON.parse(await readFile(join(racine, 'depots', 'parcours.json'), 'utf8')).projets.find(p => p.nom === 'Projet servi');
    assert.equal(lu.ref, 'PRJ-0001');
    assert.equal('refDemandee' in lu, false);
    await pageServie.reload({ waitUntil: 'networkidle' });
    await pageServie.locator('.pj-reference', { hasText: 'PRJ-0001' }).waitFor();
    assert.equal(await pageServie.locator('.pj-reference', { hasText: '(provisoire)' }).count(), 0);
    // Une validation engagée, puis la page rechargée avant l'échéance : la
    // sauvegarde n'a pas eu le temps de partir. La validation s'écrit à la
    // réouverture, dans le fichier servi, une seule fois.
    const surDisque = async (n) => {
      for (let i = 0; i < 80; i++) {
        const base = JSON.parse(await readFile(join(racine, 'depots', 'parcours.json'), 'utf8'));
        const l = base.projets.find(p => p.id === 'PRJ-demo').livrables[0];
        const v = l.versions.find(x => x.n === n);
        if (v && v.verdict) return { verdict: v.verdict, decisions: (base.decisions || []).filter(d => d.objet === 'L-demo').length };
        await new Promise(r => setTimeout(r, 100));
      }
      return { verdict: null, decisions: 0 };
    };
    await pageServie.goto('http://127.0.0.1:' + port + '/#/projets/PRJ-demo/livrables/L-demo/juger/1');
    await pageServie.getByRole('button', { name:'Valider la V1', exact:true }).click();
    await pageServie.locator('.avis-pile .avis.action').waitFor();
    await pageServie.reload({ waitUntil: 'networkidle' });
    await pageServie.getByText('Validation de la V1 de « Affiche de lancement » enregistrée.').waitFor();
    assert.deepEqual(await surDisque(1), { verdict: 'approuve', decisions: 1 }, 'La validation engagée avant le rechargement est dans le fichier');
    await pageServie.locator('.rvp-etat').getByText('Validé', { exact:true }).waitFor();
    await pageServie.reload({ waitUntil: 'networkidle' });
    await pageServie.locator('.rvp-etat').getByText('Validé', { exact:true }).waitFor();
    assert.deepEqual(await surDisque(1), { verdict: 'approuve', decisions: 1 }, 'Rien n’est rejoué deux fois');
    // Même chose quand l'onglet se ferme, puis qu'un autre s'ouvre dans le même navigateur.
    await pageServie.evaluate(() => {
      const l = DEPOT.trouve('projets', 'PRJ-demo').livrables[0];
      l.versions.push({ n: 2, soumis_le: new Date().toISOString(), verdict: null }); l.version = 2;
      DEPOT.enregistrer();
    });
    await pageServie.waitForFunction(() => DEPOT.stockage().cle === 'disque');
    await pageServie.goto('http://127.0.0.1:' + port + '/#/projets/PRJ-demo/livrables/L-demo/juger/2');
    await pageServie.getByRole('button', { name:'Valider la V2', exact:true }).click();
    await pageServie.locator('.avis-pile .avis.action').waitFor();
    await pageServie.close({ runBeforeUnload: true });
    const rouverte = await navigateur.newPage();
    rouverte.on('pageerror', e => { errors.push(e.message); console.error('Erreur navigateur (rouverte):', e.stack); });
    rouverte.setDefaultTimeout(10000);
    await rouverte.goto('http://127.0.0.1:' + port + '/#/projets/PRJ-demo/livrables/L-demo/juger/2', { waitUntil: 'networkidle' });
    await rouverte.getByText('Validation de la V2 de « Affiche de lancement » enregistrée.').waitFor();
    assert.deepEqual(await surDisque(2), { verdict: 'approuve', decisions: 2 }, 'La validation d’un onglet fermé est dans le fichier');
    await navigateur.close();
  } finally {
    if (servi && servi.exitCode === null) { servi.kill(); await once(servi, 'exit'); }
    await rm(racine, { recursive: true, force: true });
  }
  assert.deepEqual(errors, []);
  console.log('PASS — revue, validation en un clic avec annulation (échéance, écran rouvert, page fermée en poste seul et en base servie), demande de modifs, décision persistante, retours distincts, recherche, création, identifiant et référence du projet (poste seul et base servie), 9 routes, clavier, 3 formats, identifiant de décision et import, base vide.');
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
