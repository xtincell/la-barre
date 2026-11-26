import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Valider et dire : les mots que La Barre affiche autour d'une pièce.
 *
 * L'accord des nombres, le titre d'une pièce et l'auteur d'un retour posé sur
 * l'image se vérifient ici sur les vrais modules, sans navigateur. Le geste de
 * validation lui-même (un clic, huit secondes pour annuler) se rejoue dans le
 * parcours (tests/parcours.mjs), avec l'horloge de Playwright. */

const lire = nom => readFile(new URL('../app/' + nom + '.js', import.meta.url), 'utf8');

async function bac(modules = []) {
  const ctx = vm.createContext({ console, Date, Math, JSON });
  ctx.window = ctx;
  for (const nom of ['maison-base', 'outils', ...modules]) vm.runInContext(await lire(nom), ctx, { filename: nom + '.js' });
  return ctx;
}

test('O.pluriel accorde au singulier jusqu’à un, au pluriel à partir de deux', async () => {
  const { O } = await bac();
  assert.equal(O.pluriel(0, 'visuel manquant', 'visuels manquants'), '0 visuel manquant');
  assert.equal(O.pluriel(1, 'visuel manquant', 'visuels manquants'), '1 visuel manquant');
  assert.equal(O.pluriel(3, 'visuel manquant', 'visuels manquants'), '3 visuels manquants');
  assert.equal(O.pluriel(2, 'marché'), '2 marchés');
  assert.equal(O.pluriel(undefined, 'marché'), '0 marché');
});
