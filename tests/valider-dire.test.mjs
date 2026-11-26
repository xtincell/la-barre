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

function depot(donnees) {
  return { trouve: (k, id) => (donnees[k] || []).find(x => x.id === id) || null, liste: k => donnees[k] || [] };
}
const REFERENTIEL = {
  marches: [{ id: 'M-gh', code: 'GH', nom: 'Ghana' }, { id: 'M-ci', code: 'CI', nom: 'Côte d’Ivoire' }],
  supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual' }, { id: 'S-social', code: 'social', nom: 'Post social 1:1' }],
};

test('KV.titre dit la pièce en clair et garde le code en surtitre, sans toucher au nom', async () => {
  const ctx = await bac();
  ctx.DEPOT = depot(REFERENTIEL);
  vm.runInContext(await lire('kv-modele'), ctx, { filename: 'kv-modele.js' });
  const { KV } = ctx;
  const cas = [
    [{ nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'Key visual — Ghana', 'KV · GH · Orvelle'],
    [{ nom: 'KV · GH', support: 'S-kv', marche: 'M-gh' }, 'Key visual — Ghana', 'KV · GH'],
    [{ nom: 'KV master commun · Orvelle', support: 'S-kv', niveau: 'maitre' }, 'Key visual master', 'KV master commun · Orvelle'],
    [{ nom: 'Post social 1:1 · CI', support: 'S-social', marche: 'M-ci' }, 'Post social 1:1 — Côte d’Ivoire', 'Post social 1:1 · CI'],
    [{ nom: 'Affiche de lancement', support: 'S-kv', marche: 'M-gh' }, 'Affiche de lancement', null],
    [{ nom: 'KV · CI · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'KV · CI · Orvelle', null],
  ];
  for (const [l, titre, surtitre] of cas) {
    const avant = JSON.stringify(l);
    assert.equal(KV.titre(l), titre, l.nom);
    assert.equal(KV.surtitre(l), surtitre, l.nom);
    assert.equal(JSON.stringify(l), avant, 'le nom enregistré ne change pas');
  }
});
