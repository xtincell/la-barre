// La mesure des captures, dans un vrai navigateur : ce qui est replié est lu
// puis refermé, ce qui est coupé ou rejeté hors de l'écran est relevé, une
// valeur technique affichée aussi, deux captures se comparent au pixel près,
// et l'outil entier tourne sur la base fictive, du bureau au téléphone.
//
// Demande Playwright et un navigateur (BROWSER_CHANNEL=chrome pour Google
// Chrome). Sans eux, ces tests sont sautés, sauf si RECETTE_NAVIGATEUR=exige :
// la CI pose cette variable sur `npm run test:recette`, lancé après `npm ci`,
// pour qu'un navigateur absent fasse échouer la vérification au lieu de la
// laisser verte sans le test de bout en bout.
//
// Si RECETTE_TEMOIN nomme un dossier, les passes du test de bout en bout y
// sont gardées quand il échoue (la CI les joint à l'exécution).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { mesurerDansLaPage, depouiller, ecartDePixels, aLOeil, versionMesure, stabiliser, apaiserLaPage, deplierLaPage, replierLaPage, lancement,
  ouChange, changement } from '../outils/recette-captures.mjs';

const OUTIL = fileURLToPath(new URL('../outils/recette-captures.mjs', import.meta.url));
const RACINE = fileURLToPath(new URL('../', import.meta.url));
const executer = promisify(execFile);
const EXIGE = process.env.RECETTE_NAVIGATEUR === 'exige';

let chromium = null, navigateur = null, raison = null;
try { ({ chromium } = await import('playwright')); }
catch (e) { if (EXIGE) throw new Error('RECETTE_NAVIGATEUR=exige, mais Playwright est absent : lancez npm ci.', { cause: e }); raison = 'Playwright absent : npm ci'; }
if (chromium) {
  try { navigateur = await chromium.launch(lancement()); }
  catch (e) { if (EXIGE) throw e; raison = 'aucun navigateur pour Playwright : essayez BROWSER_CHANNEL=chrome'; }
}
const sauter = raison ? { skip: raison } : {};
test.after(async () => { if (navigateur) await navigateur.close(); });

async function page(html, largeur = 1024) {
  const p = await navigateur.newPage({ viewport: { width: largeur, height: 700 } });
  await p.setContent(html);
  return p;
}
const compte = termes => Object.fromEntries(termes.map(t => [t.terme, t.nombre]));

test('un terme dans un bloc replié est relevé à part, et le bloc reste fermé', sauter, async () => {
  const p = await page(`<!doctype html><html lang="fr"><body style="margin:0;font:16px sans-serif"><main id="contenu">
    <h1>Une pièce</h1>
    <p>Valider la V2</p>
    <details><summary>Critères et contrôles</summary><p>Les seuls éléments opposables, porte A.</p>
      <details><summary>Plus loin</summary><p>Refusable au §8, à l'étage 1.</p></details></details>
    <details open><summary>Suivi</summary><p>Rendre un verdict</p></details>
    <button title="C'est imputable au DA">Aide</button>
    <input placeholder="Un critère, opposable" style="width:400px">
    <p>Fermée par : undefined</p>
  </main></body></html>`);
  const m = depouiller(await p.evaluate(mesurerDansLaPage));
  // Le visible : le bloc ouvert et le texte d'exemple du champ vide.
  assert.deepEqual(compte(m.termes), { verdict: 1, opposable: 1 });
  // À un geste : les deux blocs repliés (l'un dans l'autre) et la bulle d'aide.
  assert.deepEqual(compte(m.termesReplies), { opposable: 1, imputable: 1, '§': 1, 'porte A/B/C': 1, 'étage': 1 });
  assert.equal(m.blocsReplies, 1, 'seul le bloc extérieur est compté');
  assert.deepEqual(compte(m.valeurs), { undefined: 1 });
  assert.equal(m.titre, 'Une pièce');
  // Rien n'a bougé pour la photo.
  assert.equal(await p.evaluate(() => document.querySelectorAll('details:not([open])').length), 2);
  assert.equal(await p.evaluate(() => document.querySelectorAll('details[open]').length), 1);
  await p.close();
});

test('un texte coupé et un contrôle hors écran sont relevés, sans compter ce qui défile ou se cache exprès', sauter, async () => {
  const p = await page(`<!doctype html><html lang="fr"><body style="margin:0;font:16px sans-serif"><main id="contenu">
    <h1>Projets</h1>
    <div class="sous-titre" style="width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">le projet peut commencer avant que tout soit renseigné</div>
    <input class="recherche" placeholder="Nom, client, référence, marque" style="width:80px">
    <div style="overflow-x:auto;width:200px"><div style="width:700px"><a href="#a">Premier onglet</a><a href="#b" style="margin-left:500px">Onglet lointain</a></div></div>
    <span style="position:absolute;left:-9999px">masqué exprès</span>
    <p>Un texte court.</p>
  </main>
  <aside class="panneau" style="position:fixed;top:200px;left:0;width:500px;background:#eee">
    <span class="etat" style="white-space:nowrap">Un sous-titre qui passe le bord de l’écran du téléphone</span>
    <button class="fermer" style="position:absolute;right:8px;top:0">✕</button>
  </aside></body></html>`, 320);
  const m = depouiller(await p.evaluate(mesurerDansLaPage));
  // La page ne déborde pas : c'est bien ce que l'ancien relevé laissait passer.
  assert.equal(m.debordement, 0);
  const coupes = m.coupes.exemples.map(x => x.selecteur);
  assert.equal(m.coupes.nombre, 3, JSON.stringify(m.coupes));
  assert.ok(coupes.some(x => x.endsWith('div.sous-titre')));
  assert.ok(coupes.some(x => x.endsWith('input.recherche')));
  assert.ok(coupes.some(x => x.endsWith('span.etat')));
  assert.equal(m.horsEcran.nombre, 1, JSON.stringify(m.horsEcran));
  assert.match(m.horsEcran.exemples[0].selecteur, /button\.fermer$/);
  assert.equal(m.horsEcran.exemples[0].texte, '✕');
  await p.close();
});

test('deux captures se comparent au pixel, et seules les zones d’image pardonnent une nuance', sauter, async () => {
  const p = await page('<!doctype html><body></body>');
  const [a, b, c, d, plusLongue, decalee] = await p.evaluate(() => {
    const dessiner = (couleur, x, largeur = 40, hauteur = 40, y = 10) => {
      const t = document.createElement('canvas'); t.width = largeur; t.height = hauteur;
      const g = t.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, largeur, hauteur);
      g.fillStyle = couleur; g.fillRect(x, y, 10, 10);
      return t.toDataURL('image/png').split(',')[1];
    };
    return [dessiner('rgb(0,0,0)', 10), dessiner('rgb(12,12,12)', 10), dessiner('rgb(0,0,0)', 14), dessiner('rgb(0,0,0)', 10, 50),
      dessiner('rgb(0,0,0)', 10, 40, 60), dessiner('rgb(0,0,0)', 10, 40, 60, 24)];
  });
  const meme = await p.evaluate(ecartDePixels, { a, b: a });
  assert.equal(meme.pixels, 0);
  assert.equal(meme.cadre, null);
  assert.equal(aLOeil(meme), true);
  // Une nuance de 12/255 sur un bloc de 100 pixels, hors de toute image : modifiée.
  const nuance = await p.evaluate(ecartDePixels, { a, b });
  assert.deepEqual([nuance.pixels, nuance.max, nuance.hors.pixels], [100, 12, 100]);
  assert.equal(aLOeil(nuance), false);
  // Le rectangle du changement dit où regarder : [gauche, haut, droite, bas].
  assert.deepEqual(nuance.cadre, [10, 10, 20, 20]);
  assert.deepEqual([nuance.hors.cadre, nuance.images.cadre], [[10, 10, 20, 20], null]);
  // La même nuance dans une zone d'image (le lissage d'une vignette) : identique à l'œil.
  const lissage = await p.evaluate(ecartDePixels, { a, b, zones: [[5, 5, 20, 20]] });
  assert.deepEqual([lissage.hors.pixels, lissage.images.pixels, lissage.images.max], [0, 100, 12]);
  assert.equal(aLOeil(lissage), true);
  // Les zones et le rectangle sont en px CSS : sur un écran de densité 2, la
  // zone [5, 5, 10, 10] couvre le bloc, qui est en [5, 5, 10, 10].
  const dense = await p.evaluate(ecartDePixels, { a, b, zones: [[5, 5, 10, 10]], densite: 2 });
  assert.equal(dense.hors.pixels, 0);
  assert.deepEqual(dense.cadre, [5, 5, 10, 10]);
  // Un bloc déplacé de 4 px : 2 × 4 × 10 pixels changent.
  assert.equal((await p.evaluate(ecartDePixels, { a, b: c })).pixels, 80);
  // Une autre largeur : modifiée, sans compte de pixels ni première rangée.
  const taille = await p.evaluate(ecartDePixels, { a, b: d });
  assert.equal(taille.pixels, null);
  assert.equal(taille.debut, undefined);
  assert.equal(aLOeil(taille), false);
  // Une page qui s'allonge par le bas : rien ne change sur la hauteur commune,
  // le changement part du bas de la plus courte (40 px).
  assert.deepEqual(await p.evaluate(ecartDePixels, { a, b: plusLongue }), { pixels: null, taille: [40, 40, 40, 60], debut: 40 });
  // Un bloc descendu de 14 px dans une page plus longue : le changement part
  // de sa première rangée, en px CSS (deux pixels par px à densité 2).
  assert.equal((await p.evaluate(ecartDePixels, { a, b: decalee })).debut, 10);
  assert.equal((await p.evaluate(ecartDePixels, { a, b: decalee, densite: 2 })).debut, 5);
  await p.close();
});

test('la photo ne dépend ni du moment ni de l’ordre des routes : focus posé par script, avis passager, minuterie courte', sauter, async () => {
  const PAGE = `<!doctype html><html lang="fr"><body style="margin:0;font:16px sans-serif"><main id="contenu" style="padding:24px">
    <h1>Nouvelle demande</h1>
    <button id="fermer" style="width:44px;height:44px">✕</button> <button id="autre" style="width:120px;height:44px">+ demande</button>
    <input id="champ" class="champ" placeholder="Titre" style="width:240px;border:1px solid #ccc">
    <div class="avis-pile" style="position:fixed;right:16px;bottom:16px"><div class="avis fait">Enregistré.</div><div class="avis grave">Sauvegarde impossible.</div></div>
    <style>:focus-visible{outline:3px solid #2856cb;outline-offset:4px}.champ:focus{border-color:#c7501f!important}</style>
  </main></body></html>`;
  const photo = async (avantFocus) => {
    const p = await navigateur.newPage({ viewport: { width: 390, height: 300 } });
    await p.setContent(PAGE);
    if (avantFocus) await avantFocus(p);
    // Le panneau pose le focus sur sa croix, par script, comme PANNEAU.ouvrir.
    await p.evaluate(() => document.getElementById('fermer').focus());
    const brute = await p.screenshot({ animations: 'disabled', caret: 'hide' });
    await p.evaluate(apaiserLaPage);
    const image = await p.screenshot({ animations: 'disabled', caret: 'hide' });
    const etat = await p.evaluate(() => ({ actif: document.activeElement.id || document.activeElement.tagName,
      avis: [...document.querySelectorAll('.avis')].map(x => x.className) }));
    await p.close();
    return { brute: brute.toString('base64'), image: image.toString('base64'), etat };
  };
  // Un clic plus tôt dans la passe éteint l'anneau d'un focus posé par script ;
  // une touche pressée (la recherche ouverte au clavier) le rallume. Sans
  // apaisement, les deux photos diffèrent ; après, elles sont les mêmes.
  const clavier = await photo(p => p.keyboard.press('Shift'));
  const clic = await photo(async p => { await p.locator('#autre').click(); await p.mouse.move(380, 290); });
  assert.deepEqual(clavier.etat, { actif: 'BODY', avis: ['avis grave'] });
  assert.deepEqual(clic.etat, clavier.etat);
  const p = await page('<!doctype html><body></body>');
  assert.ok((await p.evaluate(ecartDePixels, { a: clavier.brute, b: clic.brute })).pixels > 0, 'l’anneau dépend bien de la dernière touche');
  assert.equal((await p.evaluate(ecartDePixels, { a: clavier.image, b: clic.image })).pixels, 0);
  await p.close();

  // Un champ qui prend le focus 40 ms après l'ouverture : la page attend qu'il
  // l'ait pris, et le champ le garde (il l'affiche toujours de la même façon).
  const q = await navigateur.newPage({ viewport: { width: 390, height: 300 } });
  await q.setContent(PAGE);
  await q.evaluate(() => setTimeout(() => document.getElementById('champ').focus(), 40));
  await stabiliser(q);
  await q.evaluate(apaiserLaPage);
  assert.equal(await q.evaluate(() => document.activeElement.id), 'champ');
  await q.close();
});

/* Une page d'agence ordinaire : une carte bordée, un texte, une vignette. */
const CARTE = `<!doctype html><html lang="fr"><body style="margin:0;font:16px sans-serif;background:#fff">
  <main id="contenu" style="padding:24px">
    <h1 style="color:#1f2937">Orvelle Zeste — lancement</h1>
    <div class="carte" style="border:1px solid #deded8;border-radius:12px;padding:16px;width:420px">
      <p style="color:#1f2937">KV · Ghana · V1, en attente de décision.</p>
      <img alt="" width="120" height="80" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23c7501f'/%3E%3C/svg%3E">
    </div>
    <div style="width:240px;height:60px;background:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='%23eee'/%3E%3C/svg%3E&quot;)"></div>
  </main></body></html>`;

test('une page assombrie de 8 %, une bordure ou un texte d’un ton plus pâle sont « modifiés », pas « identiques à l’œil »', sauter, async () => {
  const p = await page(CARTE, 1440);
  const m = await p.evaluate(mesurerDansLaPage);
  // L'image et le fond en url() sont des zones d'image, en px CSS, débordées d'un pixel.
  assert.equal(m.zonesImages.length, 2, JSON.stringify(m.zonesImages));
  assert.equal(m.densite, 1);
  const photo = async css => {
    await p.evaluate(x => { let s = document.getElementById('essai'); if (!s) { s = document.createElement('style'); s.id = 'essai'; document.head.append(s); } s.textContent = x; }, css);
    return (await p.screenshot({ animations: 'disabled', caret: 'hide' })).toString('base64');
  };
  const avant = await photo('');
  const zones = m.zonesImages;
  const classer = async css => { const e = await p.evaluate(ecartDePixels, { a: avant, b: await photo(css), zones }); return [aLOeil(e) ? 'à l’œil' : 'modifiée', e]; };
  // La même page, photographiée deux fois : rien ne change.
  assert.equal((await classer(''))[1].pixels, 0);
  for (const [cas, css] of [
    ['page assombrie de 8 %', 'html{filter:brightness(.92)}'],
    ['bordure d’un ton plus pâle', '.carte{border-color:#e8e8e2!important}'],
    ['texte éclairci', 'p,h1{color:#3a4250!important}'],
  ]) {
    const [v, e] = await classer(css);
    assert.equal(v, 'modifiée', cas + ' : ' + JSON.stringify({ ...e, total: undefined }));
  }
  // Une nuance dans la vignette seulement (son lissage) : identique à l'œil.
  const [v] = await classer('img{filter:brightness(.97)}');
  assert.equal(v, 'à l’œil');
  await p.close();
});

test('la page entière pose sur la page ce qui est fixé à l’écran, puis remet tout en place', sauter, async () => {
  const p = await page(`<!doctype html><html lang="fr"><body style="margin:0;font:16px sans-serif">
    <div style="display:grid;grid-template-columns:200px 1fr">
      <nav id="rail" style="position:sticky;top:0;height:100vh;overflow-y:auto;background:#eee">Rail</nav>
      <main id="contenu"><h1>Page</h1><div style="height:2000px">long</div><p>Fin de page</p></main>
    </div>
    <nav id="onglets" style="position:fixed;left:0;right:0;bottom:0;height:50px;background:#c7501f">Onglets</nav>
    <div id="voile" style="position:fixed;inset:0;background:rgba(0,0,0,.5)"></div>
    <aside id="panneau" style="position:fixed;top:0;right:0;bottom:0;width:300px;display:flex;flex-direction:column;background:#fff">
      <h2 style="margin:0;height:60px">Panneau</h2><div id="corps" style="overflow-y:auto"><div style="height:3000px">contenu</div><p>Fin du panneau</p></div>
    </aside></body></html>`, 600);
  const styles = () => p.evaluate(() => ['rail', 'onglets', 'voile', 'panneau'].map(id => document.getElementById(id).getAttribute('style')));
  const avant = await styles();
  const { hauteur, poses } = await p.evaluate(deplierLaPage);
  const r = await p.evaluate(() => Object.fromEntries(['rail', 'onglets', 'voile', 'panneau', 'corps'].map(id => {
    const b = document.getElementById(id).getBoundingClientRect(); return [id, [Math.round(b.top), Math.round(b.bottom)]]; })));
  // Le panneau déroule tout ce qu'il faisait défiler : la page s'allonge jusqu'à sa fin.
  assert.ok(hauteur >= 3060, String(hauteur));
  assert.equal(poses, 4);
  assert.equal(await p.evaluate(() => { const c = document.getElementById('corps'); return c.scrollHeight <= c.clientHeight + 1; }), true);
  // La colonne, le voile et le panneau descendent jusqu'au bas de la page ; la barre d'onglets y est posée.
  assert.deepEqual([r.rail, r.voile, r.panneau], [[0, hauteur], [0, hauteur], [0, hauteur]]);
  assert.deepEqual(r.onglets, [hauteur - 50, hauteur]);
  const photo = await p.screenshot({ fullPage: true });
  assert.equal(photo.readUInt32BE(20), hauteur);
  // Tout est remis comme avant : styles, positions, feuille ôtée.
  assert.equal(await p.evaluate(replierLaPage), 4);
  assert.deepEqual(await styles(), avant);
  assert.equal(await p.evaluate(() => document.querySelectorAll('style[data-recette]').length), 0);
  assert.deepEqual(await p.evaluate(() => { const b = document.getElementById('onglets').getBoundingClientRect(); return [b.top, b.bottom]; }), [650, 700]);
  await p.close();
});

test('la ligne de commande prévient : pas de passe « avant », horloge reprise, autre version, autre filtre', { ...sauter, timeout: 240000 }, async () => {
  const dossier = await mkdtemp(join(tmpdir(), 'recette-avertissements-'));
  const base = ['--sortie', dossier, '--routes', '^plus$', '--largeurs', '1440'];
  const lancer = (...x) => executer(process.execPath, [OUTIL, ...x], { env: { ...process.env }, timeout: 120000 });
  try {
    // --apres sans passe « avant » : la planche se fait, sans comparaison, et le dit.
    let r = await lancer('--apres', ...base);
    assert.match(r.stderr, /Attention : aucune passe « avant » dans .* : la planche est faite sans comparaison/);
    // L'avant fige son horloge ; l'après, sans --horloge, la reprend et le dit.
    await lancer('--avant', ...base, '--horloge', '2026-11-26T09:00:00');
    r = await lancer('--apres', ...base);
    assert.match(r.stderr, /Horloge reprise de la passe « avant » : 2026-11-26T09:00:00\./);
    assert.doesNotMatch(r.stderr, /Attention/);
    let j = JSON.parse(await readFile(join(dossier, 'apres', 'captures.json'), 'utf8'));
    assert.deepEqual([j.horloge, j.horlogeReprise, j.comparaison.mesure.identique, j.pleinePage], ['2026-11-26T09:00:00', true, true, true]);
    // Un avant pris par une autre version de l'outil : la version est citée, pas le poste.
    const fichier = join(dossier, 'avant', 'captures.json');
    const av = JSON.parse(await readFile(fichier, 'utf8'));
    await writeFile(fichier, JSON.stringify({ ...av, mesure: { ...av.mesure, version: 'v-ancienne' } }));
    r = await lancer('--apres', ...base);
    assert.match(r.stderr, new RegExp('n’a pas été prise dans les mêmes conditions : une autre version de l’outil \\(la v-ancienne ; celle-ci est la ' + versionMesure() + '\\)\\. Refaites la passe « avant »'));
    assert.doesNotMatch(r.stderr, /poste|horloge/);
    // Un autre filtre --routes que l'avant : la sortie d'erreur prévient.
    await writeFile(fichier, JSON.stringify(av));
    r = await lancer('--apres', '--sortie', dossier, '--routes', '^(plus|bureau)$', '--largeurs', '1440');
    assert.match(r.stderr, /a été prise avec --routes \^plus\$, celle-ci avec --routes \^\(plus\|bureau\)\$/);
    j = JSON.parse(await readFile(join(dossier, 'apres', 'captures.json'), 'utf8'));
    assert.match(await readFile(join(dossier, 'apres', 'index.html'), 'utf8'), /Les deux passes n’ont pas le même filtre/);
  } finally { await rm(dossier, { recursive: true, force: true }); }
});

/* La largeur d'un PNG, lue dans son en-tête. */
async function largeurPng(fichier) { return (await readFile(fichier)).readUInt32BE(16); }

test('l’outil entier tourne sur la base fictive : bureau, recherche, nouveau projet, demande, page partagée et bilan, au bureau et au téléphone', { ...sauter, timeout: 300000 }, async () => {
  const dossier = await mkdtemp(join(tmpdir(), 'recette-bout-en-bout-'));
  const options = ['--sortie', dossier, '--routes', '^(bureau|recherche|nouveau-projet|demande|partage|reporting/bilan)$', '--largeurs', '390,1440',
    '--horloge', '2026-11-26T09:00:00', '--commit', 'abc1234'];
  const env = { ...process.env };
  let reussi = false;
  try {
    await executer(process.execPath, [OUTIL, '--avant', ...options], { env, timeout: 120000 });
    const { stdout, stderr } = await executer(process.execPath, [OUTIL, '--apres', ...options], { env, timeout: 120000 });
    assert.doesNotMatch(stderr, /fatal|Attention/, stderr);
    const r = JSON.parse(await readFile(join(dossier, 'apres', 'captures.json'), 'utf8'));
    // Toutes les actions de l'outil trouvent encore ce qu'elles appellent dans l'application.
    assert.deepEqual(r.captures.flatMap(c => c.exceptions.map(e => c.id + '@' + c.largeur + ' : ' + e)), []);
    assert.equal(r.horsCapture.length, 0, r.horsCapture.join('\n'));
    assert.deepEqual([...new Set(r.captures.map(c => c.id))].sort(), ['bureau', 'demande', 'nouveau-projet', 'partage', 'recherche', 'reporting/bilan']);
    assert.equal(r.captures.length, 12);
    assert.equal(r.commit, 'abc1234');
    assert.equal(r.mesure.version, versionMesure());
    // Peinte par le processeur, pas par la carte graphique : le poste de capture le dit.
    assert.deepEqual(r.mesure.contexte.rendu, ['--disable-gpu']);
    // Le formulaire, la recherche et Nouveau projet sont bien ouverts.
    const titre = id => r.captures.find(c => c.id === id && c.largeur === 1440).titre;
    assert.notEqual(titre('recherche'), titre('bureau'));
    assert.notEqual(titre('nouveau-projet'), '');
    // Au téléphone, la page est vue en densité 2 : 390 px font 780 pixels.
    for (const c of r.captures) {
      assert.equal(c.telephone, c.largeur < 768);
      assert.equal(await largeurPng(join(dossier, 'apres', c.fichier)), c.largeur * (c.telephone ? 2 : 1), c.fichier);
      assert.equal(c.densite, c.telephone ? 2 : 1);
    }
    // Deux passes du même code : rien de modifié, la même mesure, aucune alerte nouvelle.
    const cmp = r.comparaison;
    assert.equal(cmp.mesure.identique, true);
    assert.deepEqual(cmp.modifiees, [], JSON.stringify(r.captures.filter(c => c.ecart).map(c => [c.id, c.largeur, c.ecart]))
      + (process.env.RECETTE_TEMOIN ? ' (passes gardées dans ' + process.env.RECETTE_TEMOIN + ')' : ''));
    assert.equal(cmp.identiques + cmp.identiquesALOeil, 12);
    for (const champ of ['exceptionsNouvelles', 'debordementsNouveaux', 'coupesNouvelles', 'horsEcranNouveaux', 'valeursNouvelles'])
      assert.deepEqual(cmp[champ], [], champ);
    assert.equal(cmp.termes.avant, cmp.termes.apres);
    assert.match(stdout, /"modifiees": 0/);
    assert.match(await readFile(join(dossier, 'apres', 'index.html'), 'utf8'), /Ce qui a changé depuis la passe/);

    // Un vrai changement, plus bas que le premier écran : une copie de la base
    // où un membre de l'équipe change de nom. Dans le Bilan mensuel, son nom ne
    // se peint que dans « Mon équipe », en bas de la page : la capture est
    // « modifiée », sous le premier écran, et le texte changé est montré. (La
    // demande de proposition, qui liste l'équipe, change aussi.)
    const base = join(dossier, 'base', 'base-fictive.json');
    await cp(join(RACINE, 'vitrine', 'demo'), join(dossier, 'base'), { recursive: true });
    const texte = await readFile(base, 'utf8');
    assert.equal(texte.split('Nadia Sablier').length, 2, 'le nom n’est cité qu’une fois dans la base fictive');
    await writeFile(base, texte.replace('Nadia Sablier', 'Nadia Sablon'));
    const autre = await executer(process.execPath, [OUTIL, '--apres', ...options, '--base', base], { env, timeout: 120000 });
    const s = JSON.parse(await readFile(join(dossier, 'apres', 'captures.json'), 'utf8'));
    assert.equal(s.comparaison.base, false);
    const ecarts = JSON.stringify(s.captures.filter(c => c.ecart).map(c => [c.id, c.largeur, c.ecart]));
    assert.deepEqual(s.comparaison.modifiees.filter(k => k.startsWith('reporting/')), ['reporting/bilan@390', 'reporting/bilan@1440'], ecarts);
    // Tout ce qui change vient du nom : chaque capture modifiée montre le nouveau.
    for (const k of s.comparaison.modifiees)
      assert.ok(s.comparaison.textes.some(x => x.capture === k && String(x.ajoute).includes('Nadia Sablon')), k + ' : ' + JSON.stringify(s.comparaison.textes));
    for (const c of s.captures.filter(x => x.id === 'reporting/bilan')) {
      assert.equal(ouChange(c), 'sous le premier écran', c.largeur + ' : ' + JSON.stringify(c.ecart));
      assert.equal(changement(c, r.captures.find(x => x.id === c.id && x.largeur === c.largeur)).sorte === 'texte', false, 'la photo a changé');
    }
    assert.deepEqual(s.comparaison.textes.filter(x => x.capture.startsWith('reporting/')).map(x => [x.capture, x.ajoute, x.retire]),
      [['reporting/bilan@390', 'Nadia Sablon', 'Nadia Sablier'], ['reporting/bilan@1440', 'Nadia Sablon', 'Nadia Sablier']]);
    const html = await readFile(join(dossier, 'apres', 'index.html'), 'utf8');
    assert.match(html, /Écrans touchés\u00a0: <a href="#reporting\/bilan" title="reporting\/bilan">Bilan · Bilan mensuel<\/a> \(sous le premier écran(, la page change de hauteur)?\)[,.]/);
    assert.match(html, /à 390 et 1440\u00a0px\u00a0: <q>Nadia Sablon<\/q> au lieu de <q>Nadia Sablier<\/q>/);
    assert.match(html, /La base n’est pas la même que celle de la passe/);
    assert.match(autre.stdout, new RegExp('"modifiees": ' + s.comparaison.modifiees.length + '\\b'));
    reussi = true;
  } finally {
    /* Un échec garde ses deux passes, pour voir ce qui a bougé. */
    if (!reussi && process.env.RECETTE_TEMOIN) await cp(dossier, join(process.env.RECETTE_TEMOIN, 'bout-en-bout'), { recursive: true }).catch(() => null);
    await rm(dossier, { recursive: true, force: true });
  }
});
