import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

/* La grille support × marché : une case vide se crée d'un geste. Le « + »
 * utilisait une variable `volets` inexistante et échouait avant la création. */
async function atelier({ avecEcarts = false } = {}) {
  let sequence = 0, ouvert = null, enregistrements = 0;
  const supports = [{ id: 'S-KV', nom: 'KV' }, { id: 'S-OOH', nom: 'Affiche' }];
  const marches = [{ id: 'M-CI', nom: 'Côte d’Ivoire', code: 'CI', langues: ['fr'] },
    { id: 'M-GH', nom: 'Ghana', code: 'GH', langues: ['en'] }];
  function el(tag, props = {}, ...children) {
    return { tag, ...props, children: children.flat(Infinity).filter(Boolean),
      appendChild(child) { this.children.push(child); } };
  }
  const sb = { console, Date, O: { el, id: prefix => prefix + '-' + (++sequence) },
    MAISON: { points: [{ cle: 'technique' }, { cle: 'langue' }, { cle: 'local' }] },
    DEPOT: {
      trouve: (collection, id) => (collection === 'supports' ? supports : marches).find(x => x.id === id),
      liste: collection => collection === 'supports' ? supports : collection === 'marches' ? marches : [],
      tracer() {}, enregistrer() { enregistrements += 1; }, identifiant: prefix => prefix + '-' + (++sequence),
    },
    REGLES: { maitrePerime: () => false, pretSur: () => ({ part: 0, pret: 0, total: 0 }), droitsInsuffisants: () => false },
    ANNOT: { ouvertes: () => [] },
    PANNEAU: { ouvrir() {}, sur() {}, fermer() {}, fermerSur() {} },
    VUE_LIVRABLE: { ouvrir: (p, l) => { ouvert = l; } },
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(await readFile(new URL('../app/vue-matrice.js', import.meta.url), 'utf8'), sb);
  if (avecEcarts) vm.runInContext(await readFile(new URL('../app/ecarts-marche.js', import.meta.url), 'utf8'), sb);
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.children || []) { const result = find(child, predicate); if (result) return result; }
  }
  function all(node, predicate, found = []) {
    if (!node || typeof node !== 'object') return found;
    if (predicate(node)) found.push(node);
    for (const child of node.children || []) all(child, predicate, found);
    return found;
  }
  /* La grille n'est pas la lecture par défaut : on la choisit, comme à l'écran. */
  function grille(p) {
    let arbre = sb.VUE_MATRICE.rendre(p, () => {});
    find(arbre, n => n.tag.startsWith('button.pld') && n.children.includes('Grille')).onclick();
    arbre = sb.VUE_MATRICE.rendre(p, () => {});
    return all(arbre, n => n.tag === 'button.case-m.absente');
  }
  function lecture(p) {
    sb.VUE_MATRICE.rendre(p, () => {});
    const arbre = sb.VUE_MATRICE.rendre(p, () => {});
    const texte = n => n == null ? '' : typeof n !== 'object' ? String(n) : (n.children || []).map(texte).join(' ');
    return texte(arbre);
  }
  return { sb, grille, lecture, get ouvert() { return ouvert; }, get enregistrements() { return enregistrements; } };
}
const projet = (marchesDuVolet) => ({ id: 'P-RECETTE', sections: { pistes: [{ id: 'PI-1', statut: 'retenue' }] },
  volets: [{ id: 'V-1', nom: 'Volet de recette', supports: ['S-KV', 'S-OOH'], marches: marchesDuVolet }], livrables: [] });

test('le « + » d’une case vide crée le livrable, sans erreur', async () => {
  const s = await atelier(), p = projet(['M-CI', 'M-GH']);
  const vides = s.grille(p);
  assert.equal(vides.length, 4, 'deux supports croisés avec deux marchés');
  assert.doesNotThrow(() => vides[0].onclick());
  assert.equal(p.livrables.length, 1);
  const l = p.livrables[0];
  assert.deepEqual([l.voletId, l.support, l.marche], ['V-1', 'S-KV', 'M-CI']);
  assert.equal(s.ouvert, l, 'le livrable créé s’ouvre');
  assert.equal(s.enregistrements, 1);
});

test('la case créée porte ses points de recevabilité, comme une déclinaison de la planche', async () => {
  const s = await atelier(), p = projet(['M-CI', 'M-GH']);
  s.grille(p)[0].onclick();
  const l = p.livrables[0];
  assert.deepEqual(Object.keys(l.points).sort(), ['langue', 'local', 'technique']);
  assert.equal(l.points.technique, 'attente');
  assert.equal(l.points.langue, 'pret', 'un marché en français seul n’attend pas de traduction');
  assert.equal(l.points.local, 'attente', 'un volet à plusieurs marchés attend sa localisation');
  assert.equal('volets' in l, false, 'l’ancien champ ne revient pas');
});

test('un volet à un seul marché n’attend pas de localisation', async () => {
  const s = await atelier(), p = projet(['M-GH']);
  const vides = s.grille(p);
  assert.equal(vides.length, 2);
  vides[0].onclick();
  assert.equal(p.livrables[0].points.local, 'sansobjet');
  assert.equal(p.livrables[0].points.langue, 'attente', 'un marché anglophone attend sa langue');
});

test('une case créée n’est plus proposée vide', async () => {
  const s = await atelier(), p = projet(['M-CI', 'M-GH']);
  s.grille(p)[0].onclick();
  assert.equal(s.grille(p).length, 3);
});

test('la grille montre les écarts déclarés de chaque marché du projet', async () => {
  const s = await atelier({ avecEcarts: true }), p = projet(['M-CI', 'M-GH']);
  p.perimetre = { supports: [], marches: [], ecarts: { 'M-GH': { types: ['marque', 'langue'], detail: 'bascule' } } };
  s.grille(p);
  const texte = s.lecture(p);
  assert.match(texte, /Écarts déclarés par marché/);
  assert.match(texte, /1 sur 2 marchés déclarés/);
  assert.match(texte, /GH · Ghana Langue \+ Marque bascule/);
  assert.match(texte, /CI · Côte d’Ivoire non déclaré/);
});
