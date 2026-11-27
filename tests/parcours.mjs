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
  await page.getByRole('heading', { name: "À valider aujourd’hui" }).waitFor();
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
  // La file de revue est dépliée : chaque pièce se voit sans un clic, en
  // vignette d'au moins 160 px. « + Nouveau projet » est sur le Bureau.
  assert.equal(await page.locator('.studio-piece').count(), 3);
  assert.equal(await page.locator('.lb-file summary, details.lb-file').count(), 0, 'La file n’est plus repliée');
  const vignettes = await page.locator('.lb-file-lignes .studio-piece').evaluateAll(ns => ns.map(n => n.getBoundingClientRect().width));
  assert.ok(vignettes.every(l => l >= 160) && await page.locator('.studio-piece').first().isVisible(), `Vignettes de la file : ${vignettes}`);
  // « + Nouveau projet » ouvre, depuis le Bureau, le panneau de création.
  await page.getByRole('button', { name: '+ Nouveau projet', exact: true }).click();
  const creation = page.getByRole('dialog', { name: 'Nouveau projet' });
  await creation.getByLabel('Nom du projet', { exact: true }).waitFor();
  // L'avertissement d'un mot que la marque ne dit jamais se lit : texte à
  // l'encre sur un fond opaque, contraste d'au moins 4,5:1.
  const lisible = await page.evaluate(() => {
    const a = document.querySelector('#contenu').appendChild(document.createElement('div'));
    a.className = 'avertissement'; a.textContent = '« lourd » fait partie de ce que la marque ne dit jamais.';
    const s = getComputedStyle(a), rgba = c => c.match(/[\d.]+/g).map(Number);
    const lum = c => { const [r, g, b] = rgba(c).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return .2126 * r + .7152 * g + .0722 * b; };
    const [clair, sombre] = [lum(s.color), lum(s.backgroundColor)].sort((x, y) => y - x);
    const opaque = (rgba(s.backgroundColor)[3] ?? 1) === 1;
    a.remove();
    return { contraste: (clair + .05) / (sombre + .05), opaque };
  });
  assert.ok(lisible.opaque && lisible.contraste >= 4.5, 'Avertissement lisible : ' + JSON.stringify(lisible));
  await page.keyboard.press('Escape');
  await creation.waitFor({ state: 'detached' });
  await page.locator('.studio-piece').nth(1).click();
  assert.match(await page.locator('.studio-intention').innerText(), /Plus d’attachement/);
  assert.equal(await page.locator('.studio-piece[aria-pressed="true"]').count(), 1);
  await page.getByLabel('Projet', { exact: true }).selectOption('PRJ-demo-2');
  await page.getByText("Rien à valider dans ce projet.").waitFor();
  await page.getByLabel('Projet', { exact: true }).selectOption('');
  await page.locator('.studio-piece').filter({ hasText: 'Affiche de lancement' }).click();
  // De quoi juger sans ouvrir le dossier : qui en répond, pour quand, le
  // brief en extrait et le critère principal.
  const contexte = await page.locator('.lb-piece .lb-contexte').innerText();
  for (const attendu of ['Responsable', 'Sacha Martin', 'Échéance', '15 oct.', 'Une maison d’objets', 'Un seul objet au centre de la composition'])
    assert.ok(contexte.includes(attendu), `Le Bureau dit « ${attendu} » : ${contexte}`);
  // Le 15 octobre est passé : l'échéance le dit, dans le ton qui bloque, avec
  // le même compte de jours que Planning > Livraisons.
  const retard = await page.locator('.lb-piece .lb-delai').evaluate(s => {
    const jours = Math.floor((Date.now() - new Date(PLATEAU.echeanceDe(DEPOT.trouve('projets', 'PRJ-demo'),
      DEPOT.trouve('projets', 'PRJ-demo').livrables[0]))) / 86400000);
    const temoin = document.body.appendChild(document.createElement('span'));
    temoin.style.color = 'var(--bloquant-txt)';
    const bloquant = getComputedStyle(temoin).color; temoin.remove();
    return { texte: s.textContent.replace(/\u00a0/g, ' '), attendu: 'dépassée de ' + jours + ' j',
      retard: s.classList.contains('retard'), couleur: getComputedStyle(s).color, bloquant };
  });
  assert.equal(retard.texte, retard.attendu);
  assert.ok(retard.retard && retard.couleur === retard.bloquant, 'Échéance dépassée dans le ton qui bloque : ' + retard.couleur);
  await page.locator('.lb-piece').getByRole('link', { name: 'Lire le brief' }).waitFor();
  // Les guillemets de l'extrait tiennent à leur texte : espaces fines insécables.
  assert.equal(await page.locator('.lb-piece .lb-contexte q').evaluate(q => getComputedStyle(q).quotes),
    '"«\u202f" "\u202f»" "“" "”"');
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
  assert.equal(await valider.count(), 0, 'La décision enregistrée ne se repropose pas d’un clic');
  await page.locator('.rvp-pupitre .rvp-autre > summary', { hasText: 'Changer la décision' }).waitFor();
  assert.equal(await avis.count(), 0, 'L’avis d’annulation part avec l’échéance');
  // Un refus corrigé ne s'empile pas : le suivant, ou un succès, le remplace.
  // Le ✕ d'un avis se touche au doigt : 44 px de côté.
  const pile = await page.evaluate(() => {
    AVIS.refus('Premier refus'); AVIS.refus('Second refus');
    const refus = document.querySelectorAll('.avis-pile .avis.refus').length;
    const x = document.querySelector('.avis-pile .avis.refus .avis-x').getBoundingClientRect();
    AVIS.fait('Réussi');
    const apres = document.querySelectorAll('.avis-pile .avis.refus').length;
    // Sur téléphone, un avis grave se tient en haut, loin des gestes du bas.
    // Deux avis graves s'empilent sans se recouvrir, et la page descend
    // d'autant : le titre reste visible.
    scrollTo(0, 0);
    window.__graves = [AVIS.grave('Grave'),
      AVIS.grave('La validation de la V1 n’a pas été enregistrée : la pièce a changé depuis. Relisez-la, et validez-la de nouveau si c’est toujours votre décision.')];
    return { refus, apres, x: [Math.round(x.width), Math.round(x.height)] };
  });
  // La page descend sans animation, mais le mouvement réduit garde une
  // transition de 0,01 ms que l'horloge simulée ne fait pas avancer d'elle-même.
  await page.waitForFunction(() => getComputedStyle(document.body).paddingTop === document.body.style.paddingTop, null, { polling: 50 });
  const graves = await page.evaluate(() => {
    const [premier, second] = window.__graves.map(n => n.getBoundingClientRect());
    const titre = document.querySelector('#corps h1').getBoundingClientRect();
    // « Annuler » se touche au doigt.
    const annuler = AVIS.action('Engagé', 'Annuler', null, 0).querySelector('.avis-a').getBoundingClientRect();
    document.querySelectorAll('.avis-pile .avis').forEach(n => AVIS.retirer(n));
    return { graveEnHaut: premier.top < 60, empiles: second.top >= premier.bottom, titreVisible: titre.top >= second.bottom,
      decalage: document.body.style.paddingTop, annuler: Math.round(annuler.height) };
  });
  assert.deepEqual({ ...pile, ...graves }, { refus: 1, apres: 0, x: [44, 44], graveEnHaut: true, empiles: true, titreVisible: true,
    decalage: '', annuler: 44 });
  // Livrer, c'est un seul geste, sans lien HTTPS : qui a accordé le BAT, par
  // où les fichiers sont partis, à qui ils ont été remis.
  await page.getByRole('link', { name:'Suivre le BAT et la remise' }).click();
  await page.getByRole('button', { name:'Marquer comme livré', exact:true }).click();
  const livrer = page.getByRole('dialog', { name:'Marquer comme livré' });
  assert.equal(await livrer.locator('input[type="url"][required]').count(), 0, 'Aucun lien HTTPS n’est exigé');
  await livrer.getByLabel('BAT accordé par').fill('Imprimerie de recette');
  // Une photo choisie par erreur se retire, sans rouvrir le sélecteur.
  await livrer.locator('summary', { hasText: /une photo, un PDF, un lien ou un mot/ }).click();
  const photoBat = livrer.locator('input[name="bat-fichier"]');
  await photoBat.setInputFiles({ name: 'photo-par-erreur.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('recette') });
  await livrer.locator('.remise-joint-nom', { hasText: 'photo-par-erreur.jpg' }).waitFor();
  await livrer.getByRole('button', { name: 'Retirer « photo-par-erreur.jpg »' }).click();
  assert.equal(await photoBat.evaluate(i => i.files.length), 0, 'La photo retirée ne part pas');
  assert.equal(await livrer.getByText('photo-par-erreur.jpg').count(), 0);
  assert.equal(await livrer.getByRole('button', { name: /^Retirer/ }).count(), 0);
  await livrer.getByLabel('Moyen d’envoi').selectOption('WeTransfer');
  await livrer.getByLabel('Remis à').fill('Production de recette');
  await livrer.getByRole('button', { name:'Marquer comme livré', exact:true }).click();
  await page.locator('.remise-tete').getByText('Remise justifiée').waitFor();
  await page.goBack();
  await page.setViewportSize({ width:1440, height:1050 });
  await page.getByRole('heading', {name:'À valider aujourd’hui'}).waitFor();
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
  // L'étiquette « Marque » désigne son menu (elle portait un htmlFor inerte).
  assert.equal(await page.getByLabel('Marque', { exact: true }).evaluate(n => n.id), 'nouveau-projet-marque');
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
  // Elle s'ouvre sur ⌘K ou Ctrl K, comme dans les outils de l'équipe.
  await page.keyboard.press('Control+k');
  const rechercheGlobale = page.getByRole('dialog', { name:'Rechercher' });
  const saisie = rechercheGlobale.getByRole('searchbox');
  await saisie.fill('Affiche de lancement');
  await saisie.press('ArrowDown');
  assert.ok(await page.evaluate(() => document.activeElement.matches('.lb-resultats a')));
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#/projets/PRJ-demo/livrables/L-demo');
  await page.getByRole('heading',{level:1,name:'Affiche de lancement'}).waitFor();
  // « Poser un fichier » ouvre le sélecteur du système, pas un formulaire ;
  // décrire un fichier resté sur le Drive est le geste second.
  const [selecteur] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name:'Poser un fichier', exact:true }).click(),
  ]);
  assert.equal(selecteur.isMultiple(), false);
  assert.equal(await page.getByRole('dialog', { name:'Décrire un fichier' }).count(), 0, 'Aucun formulaire de description ne s’ouvre');
  const decrire = page.getByRole('button', { name:'Décrire un fichier sans le déposer' });
  await decrire.first().waitFor();
  assert.equal(await decrire.count(), 1, '« Décrire un fichier sans le déposer » n’est proposé qu’une fois');
  await page.keyboard.press('Meta+k');
  await saisie.fill('support');
  await saisie.press('Escape');
  assert.equal(await rechercheGlobale.count(),0);
  // ⌘F et Ctrl F restent au navigateur : La Barre ne les intercepte plus.
  await page.evaluate(() => { window.__toucheF = []; window.addEventListener('keydown', e => { if (e.code === 'KeyF') window.__toucheF.push(e.defaultPrevented); }); });
  await page.keyboard.press('Meta+f');
  await page.keyboard.press('Control+f');
  assert.deepEqual(await page.evaluate(() => window.__toucheF), [false, false], '⌘F et Ctrl F ne sont pas interceptés');
  assert.equal(await rechercheGlobale.count(), 0);
  // La note rapide est en accès direct dans la barre, et sur Alt N hors d'un champ.
  const note = page.getByRole('dialog', { name:'Prendre une note' });
  // Au téléphone, elle n'est qu'une icône : un crayon, pas l'appareil photo
  // qu'on lisait « photo » ou « capture ».
  assert.equal(await page.locator('.lb-noter svg path').getAttribute('d'),
    await page.evaluate(() => UI.icone('note').querySelector('path').getAttribute('d')));
  await page.locator('.lb-rail').getByRole('button', { name:'Note rapide', exact:true }).click();
  await note.waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await note.count(), 0);
  await page.locator('#contenu h1').click();
  await page.keyboard.press('Alt+KeyN');
  await note.waitFor();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await saisie.waitFor();
  await saisie.press('Alt+KeyN');
  assert.equal(await note.count(), 0, 'Dans un champ, Alt N reste à la saisie');
  await saisie.press('Escape');
  // Un lien de Décisions mène à sa destination d'un clic, sans panneau qui
  // s'intercale ; une ligne sur une date manquante ouvre le plan de charge.
  await page.goto(url + '/#/valider/file');
  const ligneSansDate = page.locator('.decisions-detail').filter({ hasText: 'sans date de remise' });
  await ligneSansDate.locator('summary').click();
  await ligneSansDate.getByRole('link').click();
  await page.waitForURL('**/#/planning/charge');
  assert.equal(await page.locator('dialog[open], .panneau[role=dialog]').count(), 0, 'Aucun panneau ne s’intercale avant la destination');
  await page.setViewportSize({width:320,height:700});
  await page.getByRole('navigation',{name:'Navigation mobile'}).getByRole('link',{name:'Plus'}).click();
  await page.locator('.lb-liste-liens').getByRole('link',{name:'Planning'}).click();
  // Les vues ne se replient jamais : sur téléphone, une ligne qui défile,
  // la vue active en vue, sans élargir la page.
  const vuesPlanning = page.getByRole('group', { name:'Vues du planning' });
  assert.equal(await page.locator('.st-modes summary').count(), 0, 'Aucune vue repliée derrière « Vue »');
  await vuesPlanning.locator('a[href="#/planning/charge"]').click();
  await page.waitForURL('**/#/planning/charge');
  await page.reload({waitUntil:'networkidle'});
  assert.match(await vuesPlanning.locator('[aria-current="page"]').innerText(),/Plan de charge/);
  const ligneVues = await vuesPlanning.evaluate(g => {
    const hauts = [...g.children].map(a => Math.round(a.getBoundingClientRect().top));
    const actif = g.querySelector('[aria-current]').getBoundingClientRect(), cadre = g.getBoundingClientRect();
    return { lignes: new Set(hauts).size, defile: g.scrollWidth > g.clientWidth,
      actifVisible: actif.left >= cadre.left - 1 && actif.right <= cadre.right + 1,
      page: document.documentElement.scrollWidth <= innerWidth };
  });
  assert.deepEqual(ligneVues, { lignes: 1, defile: true, actifVisible: true, page: true });
  // La ligne dit qu'elle continue : la vue active au milieu, ses voisines qui
  // dépassent, et un fondu sur chaque bord qui cache encore des vues.
  const bordsVues = async (groupe) => {
    await page.waitForFunction(n => {
      const g = document.querySelector('[role=group][aria-label="' + n + '"]');
      return g && /deborde-/.test(g.parentElement.className);
    }, await groupe.getAttribute('aria-label'));
    return groupe.evaluate(g => {
      const cadre = g.getBoundingClientRect(), vues = [...g.children];
      const i = vues.findIndex(a => a.hasAttribute('aria-current'));
      const voit = a => { const r = a.getBoundingClientRect(); return Math.min(r.right, cadre.right) - Math.max(r.left, cadre.left) >= 24; };
      const s = getComputedStyle(g);
      return { avant: i > 0 && voit(vues[i - 1]), apres: i < vues.length - 1 && voit(vues[i + 1]),
        gauche: g.parentElement.classList.contains('deborde-gauche'),
        droite: g.parentElement.classList.contains('deborde-droite'),
        fondu: /gradient/.test(s.maskImage || s.webkitMaskImage || '') };
    });
  };
  assert.deepEqual(await bordsVues(vuesPlanning), { avant: true, apres: true, gauche: true, droite: true, fondu: true },
    'Plan de charge au milieu de la ligne, Priorités et Équipe en partie visibles');
  await page.goto(url + '/#/referentiel/parametres');
  const vuesRessources = page.getByRole('group', { name:'Vues des ressources' });
  await vuesRessources.waitFor();
  assert.deepEqual(await bordsVues(vuesRessources), { avant: true, apres: false, gauche: true, droite: false, fondu: true },
    'Paramètres, dernière vue : la précédente se voit, le fondu reste à gauche');
  // Sur ordinateur, les huit vues de Ressources se voient toutes, sans repli ni fondu.
  await page.setViewportSize({width:1440,height:1050});
  const vuesOrdinateur = await vuesRessources.evaluate(g => {
    const cadre = g.getBoundingClientRect(), s = getComputedStyle(g);
    return { vues: [...g.querySelectorAll('a')].filter(a => { const r = a.getBoundingClientRect();
        return r.width > 0 && r.left >= cadre.left - 1 && r.right <= cadre.right + 1; }).length,
      fondu: /gradient/.test(s.maskImage || s.webkitMaskImage || '') };
  });
  assert.deepEqual(vuesOrdinateur, { vues: 8, fondu: false }, 'Les huit vues de Ressources à 1440 px');
  assert.equal(await page.locator('.st-modes summary, .st-modes details').count(), 0, 'Aucune vue repliée sur ordinateur');
  // À 320 et 360 px, le titre d'une pièce longue (« Key visual — Côte
  // d'Ivoire · Orvelle ») passe sous celui du panneau : la croix reste entière
  // dans l'écran, et « Demander des modifs » tient sur une ligne.
  const kvCI = await page.evaluate(() => {
    DEPOT.ajoute('marches', { id: 'M-ci-etroit', code: 'CI', nom: 'Côte d’Ivoire', langues: ['fr'] });
    const p = DEPOT.trouve('projets', 'PRJ-demo');
    const master = KV.creer(p, null, null, 'maitre', { marque: 'Orvelle' });
    const l = KV.creer(p, 'M-ci-etroit', master, 'adaptation');
    l.versions = [{ n: 1, soumis_le: '2026-09-25T09:00:00Z', verdict: null }];
    DEPOT.enregistrer();
    return l.id;
  });
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(url + '/#/projets/PRJ-demo/livrables/' + kvCI + '/juger/1');
    await page.getByRole('button', { name:'Demander des modifs', exact:true }).click();
    const panneauModifs = page.getByRole('dialog', { name:'Demander des modifs' });
    await panneauModifs.waitFor();
    const tete = await panneauModifs.evaluate(d => {
      const x = d.querySelector('.panneau-fermer').getBoundingClientRect();
      const h2 = d.querySelector('.panneau-tete h2');
      const ligne = parseFloat(getComputedStyle(h2).lineHeight);
      return { gauche: x.left >= 0, droite: x.right <= innerWidth, largeur: Math.round(x.width),
        lignes: Math.round(h2.getBoundingClientRect().height / ligne),
        etat: d.querySelector('.panneau-tete .etat').textContent.replace(/\u00a0/g, ' ') };
    });
    assert.deepEqual(tete, { gauche: true, droite: true, largeur: 44, lignes: 1, etat: 'Key visual — Côte d’Ivoire · Orvelle' },
      `En-tête du panneau à ${width}px`);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1440,height:1050});
  // Sur le Bureau, la carte « À valider » de ce KV tient son titre en deux
  // lignes et ne redit ni son code ni son marché.
  await page.goto(url + '/#/bureau');
  await page.locator('.studio-piece').filter({ hasText: 'Côte d’Ivoire' }).first().click();
  const carteKV = await page.locator('.lb-piece').evaluate(c => {
    const h2 = c.querySelector('h2');
    return { titre: h2.textContent.replace(/\u00a0/g, ' '), lignes: Math.round(h2.getBoundingClientRect().height / parseFloat(getComputedStyle(h2).lineHeight)),
      metas: [...c.querySelectorAll('.lb-piece-meta')].map(x => x.textContent) };
  });
  assert.ok(carteKV.lignes <= 2, 'Le titre de la carte tient en deux lignes : ' + carteKV.lignes);
  delete carteKV.lignes;
  assert.deepEqual(carteKV, { titre: 'Key visual — Côte d’Ivoire · Orvelle', metas: ['V1'] }, 'Carte « À valider » du Bureau');
  // Un repère d'annotation fait 22 px sur l'image, mais se touche au doigt :
  // à 20 px de son centre, dans les quatre directions, on le touche encore.
  const repere = await page.evaluate(id => {
    const p = DEPOT.trouve('projets', 'PRJ-demo'), l = p.livrables.find(x => x.id === id);
    ANNOT.poser(l, 50, 50, 'Agrandir le logo', null);
    ANNOT.ouvrir(p, l, () => {});
    const r = document.querySelector('.an-point').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return [Math.round(r.width), ...[[20, 0], [0, -20], [-20, 0], [0, 20]].map(([dx, dy]) => {
      const e = document.elementFromPoint(cx + dx, cy + dy); return !!e && !!e.closest('.an-point');
    })];
  }, kvCI);
  assert.deepEqual(repere, [22, true, true, true, true], 'Cible d’un repère d’annotation');
  await page.keyboard.press('Escape');
  // L'évaluation d'équipe n'est plus une vue du Bilan ; son adresse mène aux indicateurs.
  await page.goto(url + '/#/reporting/equipe');
  await page.getByRole('heading', { level:1, name:'Indicateurs' }).waitFor();
  assert.equal(await page.evaluate(() => location.hash), '#/reporting/indicateurs');
  assert.equal(await page.getByRole('group', { name:'Vues du bilan' }).getByText('Évaluation').count(), 0);
  // La planche de livraison se lit d'une seule façon : plus de bascule
  // « Livraison | Présentation ». Imprimée, elle sort entière, toutes familles
  // ouvertes, puis chaque famille reprend l'état où on l'avait laissée.
  await page.goto(url + '/#/projets/PRJ-demo/livraison');
  await page.getByRole('heading', { name:'Planche de livraison' }).waitFor();
  assert.equal(await page.locator('.plv-modes').count(), 0, 'Plus de bascule Livraison | Présentation');
  const impression = await page.evaluate(() => {
    const familles = () => [...document.querySelectorAll('details.plv-f')];
    familles()[0].open = false;
    const avant = familles().map(d => d.open);
    dispatchEvent(new Event('beforeprint'));
    const pendant = familles().map(d => d.open);
    dispatchEvent(new Event('afterprint'));
    return { n: avant.length, avant, pendant, apres: familles().map(d => d.open) };
  });
  assert.ok(impression.n >= 1 && impression.avant[0] === false, 'Une famille repliée avant l’impression');
  assert.ok(impression.pendant.every(Boolean), 'Toutes les familles ouvertes à l’impression : ' + impression.pendant);
  assert.deepEqual(impression.apres, impression.avant, 'Chaque famille reprend son état après l’impression');
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
  // Bureau au téléphone : la pièce, son visuel et « Examiner » tiennent dans
  // le premier écran, au-dessus de la barre du bas ; le visuel mène à la pièce ;
  // « + Nouveau projet » se range sur la ligne de la date.
  await page.evaluate(() => {
    const l = DEPOT.trouve('projets', 'PRJ-demo').livrables.find(x => x.id === 'L-demo');
    l.vignette = 'vitrine/demo/visuels/social-gh.svg';
  });
  for (const [width, height] of [[390, 844], [320, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(url + '/#/bureau');
    await page.locator('.studio-piece').filter({ hasText: 'Affiche de lancement' }).click();
    await page.locator('.lb-piece-image img').evaluate(i => i.complete || new Promise(r => { i.onload = i.onerror = r; }));
    const tel = await page.evaluate(() => {
      scrollTo(0, 0);
      const r = s => document.querySelector(s).getBoundingClientRect();
      const examiner = document.querySelector('.lb-piece a.b.or'), visuel = document.querySelector('.lb-piece a.lb-piece-image');
      return { examinerAuDessus: r('.lb-piece a.b.or').bottom <= r('.lb-mobile').top,
        visuel: visuel && visuel.getAttribute('href') === examiner.getAttribute('href'),
        nouveauSurLaDate: Math.abs(r('.studio-entete > .b').top - r('.studio-date').top) < 30 && r('.studio-entete > .b').bottom <= r('.studio-entete h1').top + 4,
        page: document.documentElement.scrollWidth <= innerWidth };
    });
    assert.deepEqual(tel, { examinerAuDessus: true, visuel: true, nouveauSurLaDate: true, page: true }, `Bureau à ${width} px`);
  }
  await page.setViewportSize({ width: 1440, height: 1050 });
  // Dans la file, une vignette est un bouton sans bloc : l'image seule,
  // recadrée par le haut pour garder le bandeau d'un format carré.
  await page.goto(url + '/#/bureau');
  const tuile = await page.locator('.lb-file-lignes .studio-piece').filter({ hasText: 'Affiche de lancement' }).evaluate(b => ({
    blocs: b.querySelectorAll('div, p, section, article, blockquote').length,
    image: !!b.querySelector('.lb-file-visuel > img'), haut: getComputedStyle(b.querySelector('img')).objectPosition }));
  assert.deepEqual(tuile, { blocs: 0, image: true, haut: '50% 0px' }, 'Vignette de la file');
  // Chaque vignette dit qui en répond et pour quand, sans ouvrir la pièce.
  const suivis = await page.locator('.lb-file-lignes .studio-piece').evaluateAll(bs => bs.map(b => {
    const s = b.querySelector('.lb-file-suivi');
    return s && s.textContent.replace(/\u00a0/g, ' ');
  }));
  const joursDemo = await page.evaluate(() => Math.floor((Date.now() - new Date(DEPOT.trouve('projets', 'PRJ-demo').sections.identite.echeance)) / 86400000));
  assert.ok(suivis.length === 3 && suivis.every(Boolean), 'Une ligne de suivi par vignette : ' + suivis);
  assert.ok(suivis.includes('Sacha Martin · échéance dépassée de ' + joursDemo + ' j'), 'Suivi de « Affiche de lancement » : ' + suivis);
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
  // Valider, puis ouvrir Décisions avant l'échéance : à l'échéance, un avis
  // le dit et la file ne liste plus la version validée.
  await fermee.evaluate(() => {
    const l = DEPOT.trouve('projets', 'PRJ-demo').livrables[0];
    l.versions.push({ n: 2, soumis_le: new Date().toISOString() }); l.version = 2; DEPOT.enregistrer();
  });
  await fermee.goto(url + '/#/projets/PRJ-demo/livrables/L-demo/juger/2');
  await fermee.clock.pauseAt(await fermee.evaluate(() => Date.now()) + 1000);
  await fermee.getByRole('button', { name:'Valider la V2', exact:true }).click();
  await fermee.locator('.avis-pile .avis.action').waitFor();
  await fermee.goto(url + '/#/valider/file');
  await fermee.locator('.decisions-file').getByText('Affiche de lancement · V2').waitFor();
  await fermee.clock.runFor(9000);
  await fermee.getByText('Validation de la V2 de « Affiche de lancement » enregistrée.').waitFor();
  assert.equal(await fermee.locator('.decisions-file').getByText('Affiche de lancement · V2').count(), 0,
    'La file de Décisions ne liste plus la version validée');
  await fermee.clock.resume();
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
    // Un onglet resté ouvert n'attend pas le prochain chargement : il écrit la
    // validation de l'onglet qu'on vient de fermer, et le dit.
    await rouverte.evaluate(() => {
      const l = DEPOT.trouve('projets', 'PRJ-demo').livrables[0];
      l.versions.push({ n: 3, soumis_le: new Date().toISOString(), verdict: null }); l.version = 3;
      DEPOT.enregistrer();
    });
    await rouverte.waitForFunction(() => DEPOT.stockage().cle === 'disque');
    const principal = await navigateur.newPage();
    principal.on('pageerror', e => { errors.push(e.message); console.error('Erreur navigateur (principal):', e.stack); });
    principal.setDefaultTimeout(10000);
    // Quelqu'un y écrit dans un champ : la reprise ne lui prend ni son focus
    // ni sa saisie ; l'avis suffit.
    await principal.goto('http://127.0.0.1:' + port + '/#/projets', { waitUntil: 'networkidle' });
    const champPrincipal = principal.getByLabel('Rechercher un projet');
    await champPrincipal.fill('Nac');
    await rouverte.goto('http://127.0.0.1:' + port + '/#/projets/PRJ-demo/livrables/L-demo/juger/3');
    await rouverte.getByRole('button', { name:'Valider la V3', exact:true }).click();
    await rouverte.locator('.avis-pile .avis.action').waitFor();
    await rouverte.close({ runBeforeUnload: true });
    await principal.getByText('Validation de la V3 de « Affiche de lancement » enregistrée.').waitFor();
    assert.deepEqual(await principal.evaluate(() => [document.activeElement.getAttribute('aria-label') || document.activeElement.id,
      document.activeElement.value]), [await champPrincipal.getAttribute('aria-label') || await champPrincipal.getAttribute('id'), 'Nac'],
      'Le champ garde son focus et sa saisie');
    assert.deepEqual(await surDisque(3), { verdict: 'approuve', decisions: 3 }, 'L’onglet resté ouvert a écrit la validation');
    assert.equal(await principal.evaluate(() => localStorage.getItem('la-barre-validations')), null);
    // De vrais fichiers, sur le serveur : l'asset devient le visuel de la
    // pièce ; la photo du BAT se range à son étage sans le remplacer ; le PDF
    // joint au BAT monte dans assets/review/preuves/, s'ouvre depuis le suivi,
    // et la pièce se livre en un geste.
    const adresse = 'http://127.0.0.1:' + port;
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const livrableServi = () => principal.evaluate(() => JSON.parse(JSON.stringify(DEPOT.trouve('projets', 'PRJ-demo').livrables[0])));
    const telecharger = async chemin => { const r = await fetch(adresse + '/' + chemin); return { statut: r.status, type: r.headers.get('content-type'), octets: Buffer.from(await r.arrayBuffer()) }; };
    // La piste retenue engage la pièce : après l'asset, l'étage du BAT s'ouvre.
    await principal.evaluate(() => { DEPOT.trouve('projets', 'PRJ-demo').sections.pistes[0].statut = 'retenue'; DEPOT.enregistrer(); });
    await principal.goto(adresse + '/#/projets/PRJ-demo/livrables/L-demo/poser');
    const poserEtage = async (nom, fichier) => {
      const [choix] = await Promise.all([principal.waitForEvent('filechooser'), principal.getByRole('button', { name: nom }).click()]);
      await choix.setFiles(fichier);
      await principal.getByText('« ' + fichier.name + ' » est au dossier').waitFor();
    };
    await poserEtage(/Poser l'asset/, { name: 'kv-recette.png', mimeType: 'image/png', buffer: PNG });
    const visuel = (await livrableServi()).vignette;
    assert.match(visuel, /^assets\/review\/livrables\/L-demo-f-[a-z0-9]+\.jpg$/);
    assert.equal((await telecharger(visuel)).statut, 200);
    await poserEtage(/Poser le BAT/, { name: 'bon-signe.png', mimeType: 'image/png', buffer: PNG });
    const avecBat = await livrableServi();
    const batPose = avecBat.fichiers.filter(f => f.type === 'bat');
    assert.equal(avecBat.vignette, visuel, 'La photo du BAT ne remplace pas le visuel de la pièce');
    assert.deepEqual(batPose.map(f => [f.nom, f.signataire]), [['bon-signe.png', null]]);
    assert.equal((await telecharger(batPose[0].emplacement)).statut, 200);
    await principal.goto(adresse + '/#/projets/PRJ-demo/livrables/L-demo/remise');
    await principal.getByRole('button', { name: 'Marquer comme livré', exact: true }).click();
    const livraison = principal.getByRole('dialog', { name: 'Marquer comme livré' });
    await livraison.getByText('« bon-signe.png » est déjà posé').waitFor();
    await livraison.getByLabel('BAT accordé par').fill('Imprimerie de recette');
    await livraison.locator('summary', { hasText: 'Ajouter une photo, un PDF' }).click();
    await livraison.getByLabel('Photo ou PDF du BAT').setInputFiles({ name: 'bat-signe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% recette\n') });
    await livraison.locator('.remise-joint-nom', { hasText: 'bat-signe.pdf' }).waitFor();
    await livraison.getByLabel('Moyen d’envoi').selectOption('Clé USB');
    await livraison.getByLabel('Remis à').fill('Production de recette');
    await livraison.getByRole('button', { name: 'Marquer comme livré', exact: true }).click();
    await principal.locator('.remise-tete').getByText('Remise justifiée').waitFor();
    await principal.getByText('BAT signé · V3').waitFor();
    // « Ouvrir le BAT » ouvre le fichier posé à son étage ; la pièce jointe
    // donnée en le marquant accordé s'ouvre à côté.
    assert.equal(await principal.getByRole('link', { name: 'Ouvrir le BAT', exact: true }).getAttribute('href'), batPose[0].emplacement);
    const preuveBat = await principal.getByRole('link', { name: 'Ouvrir la pièce jointe', exact: true }).getAttribute('href');
    assert.match(preuveBat, /^assets\/review\/preuves\/preuve-[a-z0-9]+\.pdf$/);
    const pdf = await telecharger(preuveBat);
    assert.deepEqual([pdf.statut, pdf.type, pdf.octets.toString('latin1', 0, 5)], [200, 'application/pdf', '%PDF-']);
    assert.equal(String(await readFile(join(racine, preuveBat))).slice(0, 5), '%PDF-', 'Le PDF est sur le disque du serveur');
    for (let i = 0; i < 80; i++) {
      const l = JSON.parse(await readFile(join(racine, 'depots', 'parcours.json'), 'utf8')).projets.find(p => p.id === 'PRJ-demo').livrables[0];
      const bats = (l.fichiers || []).filter(f => f.type === 'bat');
      if (bats.some(f => f.signataire)) {
        assert.deepEqual(bats.map(f => [f.nom, f.signataire, f.preuve && f.preuve.chemin]), [['bon-signe.png', 'Imprimerie de recette', preuveBat]],
          'Un seul BAT au fichier : celui posé à l’étage, complété');
        break;
      }
      assert.ok(i < 79, 'Le BAT accordé est dans le fichier');
      await new Promise(r => setTimeout(r, 100));
    }
    // Les fichiers remis déclarés n'ont pas d'emplacement : à leur étage, ils
    // disent par où ils sont partis.
    await principal.goto(adresse + '/#/projets/PRJ-demo/livrables/L-demo/poser');
    await principal.locator('.ptff', { hasText: 'Fichiers finaux · V3' }).getByText('Fichiers envoyés sur clé USB').waitFor();
    assert.equal(await principal.getByText('Emplacement non dit').count(), 0);
    // Rien de l'interface ne se pose sur l'image : elle s'agrandit d'un clic,
    // ou par « Agrandir le visuel », dans la barre des gestes.
    await principal.goto(adresse + '/#/projets/PRJ-demo/livrables/L-demo/juger/3');
    const toile = principal.locator('.rvp-plan .rvp-toile');
    await toile.locator('img').waitFor();
    assert.equal(await toile.locator('button').count(), 0, 'Aucun bouton posé sur la création');
    const apercu = principal.getByRole('dialog', { name: 'Aperçu du visuel' });
    await principal.locator('.rvp-liens').getByRole('button', { name: 'Agrandir le visuel', exact: true }).click();
    await apercu.locator('img').waitFor();
    await principal.keyboard.press('Escape');
    await apercu.waitFor({ state: 'detached' });
    await toile.locator('img').click();
    await apercu.locator('img').waitFor();
    await principal.keyboard.press('Escape');
    await apercu.waitFor({ state: 'detached' });
    // L'historique d'une version ouvre ses documents servis et dit les
    // déclarations : le BAT, nommé comme tel, sa photo posée et le PDF joint ;
    // les fichiers remis ; la remise déclarée.
    await principal.evaluate(() => {
      const l = DEPOT.trouve('projets', 'PRJ-demo').livrables[0];
      l.versions.push({ n: 4, soumis_le: new Date().toISOString(), verdict: null }); l.version = 4;
      APP.rendre();
    });
    const archive = principal.locator('.rvp-archive');
    await archive.getByRole('heading', { name: 'Version 3 · historique' }).waitFor();
    assert.equal(await archive.getByRole('link', { name: 'BAT · bon-signe.png', exact: true }).getAttribute('href'), batPose[0].emplacement);
    assert.equal(await archive.getByRole('link', { name: 'pièce jointe', exact: true }).getAttribute('href'), preuveBat);
    await archive.locator('.rvp-docs li', { hasText: 'Fichiers finaux · V3' }).waitFor();
    await archive.locator('summary', { hasText: 'Justificatifs de remise de la V3' }).click();
    await archive.getByText('Remise déclarée · Fichiers envoyés sur clé USB', { exact: true }).waitFor();
    await navigateur.close();
  } finally {
    if (servi && servi.exitCode === null) { servi.kill(); await once(servi, 'exit'); }
    await rm(racine, { recursive: true, force: true });
  }
  assert.deepEqual(errors, []);
  console.log('PASS — revue, validation en un clic avec annulation (échéance, écran rouvert, page fermée en poste seul et en base servie, reprise par un onglet resté ouvert, Décisions à jour à l’échéance), demande de modifs, décision persistante, retours distincts, recherche, création, identifiant et référence du projet (poste seul et base servie), 9 routes, clavier, 3 formats, identifiant de décision et import, base vide, fichiers posés et pièce jointe du BAT sur le serveur, loupe hors de l’image, documents d’une version.');
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
