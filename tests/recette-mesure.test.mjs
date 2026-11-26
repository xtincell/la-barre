// La mesure des captures, dans un vrai navigateur : ce qui est replié est lu
// puis refermé, ce qui est coupé ou rejeté hors de l'écran est relevé, une
// valeur technique affichée aussi, et deux captures se comparent au pixel près.
//
// Demande Playwright et un navigateur (BROWSER_CHANNEL=chrome pour Google
// Chrome). Sans eux, le test est sauté, sauf en CI où il doit tourner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mesurerDansLaPage, depouiller, ecartDePixels, SEUIL_PIXEL } from '../outils/recette-captures.mjs';

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

test('deux captures se comparent au pixel, sans compter le lissage', sauter, async () => {
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
  assert.deepEqual(await p.evaluate(ecartDePixels, { a, b: a, seuil: SEUIL_PIXEL }), { pixels: 0, max: 0 });
  // Une nuance de 12/255 : identique à l'œil.
  assert.equal((await p.evaluate(ecartDePixels, { a, b, seuil: SEUIL_PIXEL })).pixels, 0);
  // Un bloc déplacé de 4 px : 2 × 4 × 10 pixels changent.
  assert.equal((await p.evaluate(ecartDePixels, { a, b: c, seuil: SEUIL_PIXEL })).pixels, 80);
  // Une autre taille : modifiée, sans compte de pixels.
  assert.equal((await p.evaluate(ecartDePixels, { a, b: d, seuil: SEUIL_PIXEL })).pixels, null);
  await p.close();
});
