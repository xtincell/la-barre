import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function atelier(marche) {
  let panneau;
  let sequence = 0;
  const supports = [{ id: 'S-KV', code: 'kv', type: 'kv', nom: 'KV' },
    { id: 'S-OOH', type: 'print', nom: 'Affiche' }];
  function el(tag, props = {}, ...children) {
    const node = { tag, value: '', ...props, children: children.flat(Infinity).filter(Boolean),
      appendChild(child) { this.children.push(child); if (!this.value && child.tag === 'option') this.value = child.value; },
    };
    return node;
  }
  const sb = { console, Date, O: { el, id: prefix => prefix + (++sequence), langue: x => x },
    MAISON: { points: [{ cle: 'technique' }, { cle: 'central' }] },
    DEPOT: {
      trouve: (collection, id) => collection === 'marches' && marche?.id === id ? marche : supports.find(x => x.id === id),
      liste: collection => collection === 'marches' ? (marche ? [marche] : []) : collection === 'supports' ? supports : [],
      tracer() {}, enregistrer() {},
    },
    UI: { recevabilite: (titre, controles, rien, actions) => ({ tag: 'actions', children: actions.map(a => el('button', { onclick: a.quand }, a.nom)) }),
      banniere: (...x) => el('div', {}, ...x) },
    ANNOT: { ouvertes: () => [] }, IMAGE: { vignette: () => el('img'), bouton: () => el('button') }, DENSITE: 'normale',
    PANNEAU: { ouvrir: (titre, sous, body) => { panneau = body; }, fermer() {} },
  };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ['kv-modele', 'vue-planche']) vm.runInContext(await readFile(new URL('../app/' + f + '.js', import.meta.url), 'utf8'), sb);
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.children || []) { const result = find(child, predicate); if (result) return result; }
  }
  const click = (tree, text) => { const b = find(tree, n => n.tag.startsWith('button') && n.children.includes(text)); assert.ok(b, text); b.onclick(); };
  return { sb, find, click, get panneau() { return panneau; } };
}
const projet = () => ({ id: 'P-RECETTE', sections: { pistes: [{ id: 'PI-1', statut: 'retenue' }] },
  champsDA: [{ cle: 'signe', nom: 'Signe' }], livrables: [] });
const kv = () => ({ id: 'KV-1', nom: 'Master de recette', niveau: 'maitre', marche: 'M-1', version: 3,
  pisteId: 'PI-1', support: 'S-KV', kv: { marque: 'Marque de recette', copy: 'Le signe commun', langue: 'FR', sku: ['Pack A'], mentions: ['Mention A'], signe: 'Cercle' } });
const controle = (s, p, l, nom) => s.sb.KV.conformite(p, l).find(c => c.quoi === nom);

test('un marché introuvable ne devient pas une conformité verte', async () => {
  const s = await atelier(null), p = projet(), l = kv();
  assert.equal(controle(s, p, l, 'Langue du marché').ok, false);
  assert.equal(controle(s, p, l, 'SKU distribués ici').ok, false);
  assert.equal(controle(s, p, l, 'Mentions obligatoires').ok, false);
  assert.equal(s.sb.KV.conforme(p, l), false);
});
test('un référentiel incomplet distingue les inconnues d’un accord', async () => {
  const s = await atelier({ id: 'M-1', langues: [], sku: [], mentions: [] }), p = projet(), l = kv();
  for (const nom of ['Langue du marché', 'SKU distribués ici', 'Mentions obligatoires']) {
    const c = controle(s, p, l, nom); assert.equal(c.ok, false); assert.match(c.cout, /non renseign|impossible|vérifi/);
  }
});
test('un référentiel reçu permet les contrôles positifs et expose les vrais écarts', async () => {
  const s = await atelier({ id: 'M-1', langues: ['FR'], sku: ['Pack A'], mentions: ['Mention A'] }), p = projet(), l = kv();
  assert.equal(s.sb.KV.conforme(p, l), true);
  l.kv.langue = 'EN'; l.kv.sku = ['Pack B']; l.kv.mentions = [];
  for (const nom of ['Langue du marché', 'SKU distribués ici', 'Mentions obligatoires']) assert.equal(controle(s, p, l, nom).ok, false);
});
test('la planche crée réellement un format relié à la version du master', async () => {
  const s = await atelier({ id: 'M-1', code: 'CM', langues: ['FR'], sku: ['Pack A'], mentions: ['Mention A'] });
  const p = projet(); p.livrables.push(kv());
  s.click(s.sb.VUE_PLANCHE.rendre(p, () => {}), 'Décliner un marché');
  s.click(s.panneau, 'Affiche');
  s.click(s.panneau, 'Décliner');
  const format = p.livrables[1]; assert.ok(format);
  assert.equal(format.maitre, 'KV-1'); assert.equal(format.versionMaitre, 3); assert.equal(format.marche, 'M-1');
  assert.equal(format.pisteId, 'PI-1'); assert.equal(format.support, 'S-OOH');
  assert.deepEqual(JSON.parse(JSON.stringify(format.points)), { technique: 'attente', central: 'attente' });
  assert.equal(format.version, 1);
});
