// La mesure des captures, dans un vrai navigateur : ce qui est replié est lu
// puis refermé, ce qui est coupé ou rejeté hors de l'écran est relevé, une
// valeur technique affichée aussi, et deux captures se comparent au pixel près.
//
// Demande Playwright et un navigateur (BROWSER_CHANNEL=chrome pour Google
// Chrome). Sans eux, le test est sauté, sauf en CI où il doit tourner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mesurerDansLaPage, depouiller, ecartDePixels, aLOeil } from '../outils/recette-captures.mjs';

let chromium = null, navigateur = null, raison = null;
try { ({ chromium } = await import('playwright')); } catch { raison = 'Playwright absent : npm ci'; }
if (chromium) {
  try { navigateur = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) }); }
  catch (e) { if (process.env.CI) throw e; raison = 'aucun navigateur pour Playwright : essayez BROWSER_CHANNEL=chrome'; }
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
  const [a, b, c, d] = await p.evaluate(() => {
    const dessiner = (couleur, x, largeur = 40) => {
      const t = document.createElement('canvas'); t.width = largeur; t.height = 40;
      const g = t.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, largeur, 40);
      g.fillStyle = couleur; g.fillRect(x, 10, 10, 10);
      return t.toDataURL('image/png').split(',')[1];
    };
    return [dessiner('rgb(0,0,0)', 10), dessiner('rgb(12,12,12)', 10), dessiner('rgb(0,0,0)', 14), dessiner('rgb(0,0,0)', 10, 50)];
  });
  const meme = await p.evaluate(ecartDePixels, { a, b: a });
  assert.equal(meme.pixels, 0);
  assert.equal(aLOeil(meme), true);
  // Une nuance de 12/255 sur un bloc de 100 pixels, hors de toute image : modifiée.
  const nuance = await p.evaluate(ecartDePixels, { a, b });
  assert.deepEqual([nuance.pixels, nuance.max, nuance.hors.pixels], [100, 12, 100]);
  assert.equal(aLOeil(nuance), false);
  // La même nuance dans une zone d'image (le lissage d'une vignette) : identique à l'œil.
  const lissage = await p.evaluate(ecartDePixels, { a, b, zones: [[5, 5, 20, 20]] });
  assert.deepEqual([lissage.hors.pixels, lissage.images.pixels, lissage.images.max], [0, 100, 12]);
  assert.equal(aLOeil(lissage), true);
  // Les zones sont en px CSS : sur un écran de densité 2, la zone [5, 5, 10, 10] couvre le bloc.
  assert.equal((await p.evaluate(ecartDePixels, { a, b, zones: [[5, 5, 10, 10]], densite: 2 })).hors.pixels, 0);
  // Un bloc déplacé de 4 px : 2 × 4 × 10 pixels changent.
  assert.equal((await p.evaluate(ecartDePixels, { a, b: c })).pixels, 80);
  // Une autre taille : modifiée, sans compte de pixels.
  const taille = await p.evaluate(ecartDePixels, { a, b: d });
  assert.equal(taille.pixels, null);
  assert.equal(aLOeil(taille), false);
  await p.close();
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
