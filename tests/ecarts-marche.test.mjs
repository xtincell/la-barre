import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Les écarts de marché déclarés : ce que chaque marché a le droit de changer
 * du master. Arbitrage du 11 novembre 2026 : un écart se déclare sur le couple
 * projet × marché, et il porte une LISTE de types. Les types sont ceux de la
 * méthode (market-expansion-system, METHODE.md), repris tels quels. */

const copie = value => JSON.parse(JSON.stringify(value));

async function atelier({ projets = [], radar = [] } = {}) {
  let enregistrements = 0, panneau = null, fermetures = 0;
  const avis = [], journal = [];
  const marches = [
    { id: 'M-CM', code: 'CM', nom: 'Cameroun', langues: ['fr', 'en'] },
    { id: 'M-CI', code: 'CI', nom: 'Côte d’Ivoire', langues: ['fr'] },
    { id: 'M-GH', code: 'GH', nom: 'Ghana', langues: ['en'] },
  ];
  const data = { projets, marches, radar };
  function el(tag, props = {}, ...children) {
    if (props === null || typeof props !== 'object' || Array.isArray(props)) { children.unshift(props); props = {}; }
    return { tag, ...props, children: children.flat(Infinity).filter(x => x !== null && x !== undefined && x !== false),
      appendChild(child) { this.children.push(child); } };
  }
  const sb = { console, Date, JSON,
    O: { el },
    DEPOT: { liste: k => data[k] || [], trouve: (k, id) => (data[k] || []).find(x => x.id === id) || null,
      tracer: (action, type, id, detail) => journal.push({ action, type, id, detail }),
      enregistrer() { enregistrements += 1; } },
    ACTEUR: { trace: () => ({ personneId: 'PE-1', nom: 'Awa Recette', poste: 'da', postes: ['da'] }) },
    PANNEAU: { ouvrir: (titre, sous, corps) => { panneau = corps; }, fermer() { fermetures += 1; } },
    AVIS: { refus: m => avis.push(['refus', m]), fait: m => avis.push(['fait', m]) },
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(await readFile(new URL('../app/ecarts-marche.js', import.meta.url), 'utf8'), sb);
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.children || []) { const r = find(child, predicate); if (r) return r; }
  }
  function all(node, predicate, found = []) {
    if (!node || typeof node !== 'object') return found;
    if (predicate(node)) found.push(node);
    for (const child of node.children || []) all(child, predicate, found);
    return found;
  }
  const texte = n => n == null ? '' : typeof n !== 'object' ? String(n) : (n.children || []).map(texte).join(' ');
  const E = sb.ECARTS_MARCHE;
  return { sb, E, data, avis, journal, find, all, texte,
    get enregistrements() { return enregistrements; }, get panneau() { return panneau; }, get fermetures() { return fermetures; } };
}

const dossier = (extra = {}) => ({ id: 'P-1', ref: 'FC-CM-BR-001', nom: 'Back to School', sections: {},
  perimetre: { supports: ['S-KV'], marches: ['M-CM', 'M-GH'] }, volets: [], livrables: [], ...extra });

test('le vocabulaire est celui de la méthode : quatre types, dans son ordre', async () => {
  const s = await atelier();
  assert.deepEqual(copie(s.E.TYPES.map(t => t.code)), ['langue', 'marque', 'produit', 'reglementaire']);
  assert.deepEqual(copie(s.E.TYPES.map(t => t.nom)), ['Langue', 'Marque', 'Produit / SKU', 'Réglementaire']);
  assert.equal(s.E.FORMAT, 'ecarts-marche'); assert.equal(s.E.VERSION, 1);
  assert.equal(s.E.libelle(['marque', 'langue']), 'Langue + Marque');
  assert.equal(s.E.libelle([]), 'aucun écart');
});

test('un marché sans déclaration est « non déclaré », pas « aucun écart »', async () => {
  const s = await atelier();
  assert.equal(s.E.declaration(dossier(), 'M-GH'), null);
  assert.equal(s.E.declaration(dossier({ perimetre: undefined }), 'M-GH'), null);
});

test('déclarer : plusieurs types sur le couple projet × marché, datés et attribués', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  const r = s.E.declarer(p, 'M-GH', ['marque', 'langue', 'marque'], '  bascule marque + langue  ');
  assert.equal(r.ok, true);
  const stocke = copie(p.perimetre.ecarts['M-GH']);
  assert.deepEqual(stocke.types, ['langue', 'marque'], 'ordre du vocabulaire, sans doublon');
  assert.equal(stocke.detail, 'bascule marque + langue');
  assert.equal(stocke.source, 'saisie');
  assert.equal(stocke.acteur.nom, 'Awa Recette');
  assert.ok(!Number.isNaN(Date.parse(stocke.declare_le)));
  assert.deepEqual(copie(p.perimetre.marches), ['M-CM', 'M-GH'], 'le périmètre ne bouge pas');
  assert.equal(s.enregistrements, 1);
  assert.equal(s.journal.length, 1); assert.match(s.journal[0].detail, /GH : Langue \+ Marque/);

  assert.equal(s.E.declarer(p, 'M-CM', []).ok, true, 'aucune case : déclaré sans écart');
  assert.deepEqual(copie(s.E.declaration(p, 'M-CM').types), []);

  const refus = s.E.declarer(p, 'M-CI', ['marque', 'confort']);
  assert.equal(refus.ok, false); assert.match(refus.erreur, /confort/);
  assert.equal(p.perimetre.ecarts['M-CI'], undefined, 'un type inconnu ne s’écrit pas, même à moitié');
  assert.match(s.E.declarer(p, 'M-ZZ', ['langue']).erreur, /marché/);
  assert.equal(s.enregistrements, 2);
});

test('une ancienne déclaration à un seul type se lit comme une liste d’un élément', async () => {
  const p = dossier({ perimetre: { supports: [], marches: ['M-GH'], ecarts: {
    'M-GH': { type: 'marque', detail: 'bascule' },
    'M-CI': { types: 'langue+marque' },
    'M-CM': { types: ['marque', 'confort'] },
    'M-ZA': { detail: 'sans types' },
  } } });
  const s = await atelier({ projets: [p] });
  assert.deepEqual(copie(s.E.declaration(p, 'M-GH').types), ['marque']);
  assert.equal(s.E.declaration(p, 'M-GH').detail, 'bascule');
  assert.deepEqual(copie(s.E.declaration(p, 'M-CI').types), ['langue', 'marque']);
  const inconnu = copie(s.E.declaration(p, 'M-CM'));
  assert.deepEqual([inconnu.types, inconnu.inconnus], [['marque'], ['confort']], 'un type inconnu se montre, il ne disparaît pas');
  assert.equal(s.E.declaration(p, 'M-ZA'), null);
});

test('les marchés du projet : périmètre, volets, livrables et déclarations, chacun une fois', async () => {
  const p = dossier({ volets: [{ id: 'V-1', marches: ['M-CI', 'M-GH'] }],
    livrables: [{ id: 'L-1', marche: 'M-CM' }, { id: 'L-2', marche: 'M-ZA', annule: true }],
    perimetre: { supports: [], marches: ['M-GH'], ecarts: { 'M-CM': { types: [] } } } });
  const s = await atelier({ projets: [p] });
  const ms = s.E.marches(p);
  assert.deepEqual(copie(ms.map(x => x.marche.code)), ['GH', 'CI', 'CM']);
  assert.deepEqual(copie(ms.map(x => x.declaration && x.declaration.types)), [null, null, []]);
});

test('retirer une déclaration rend le marché « non déclaré »', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  s.E.declarer(p, 'M-GH', ['langue']);
  assert.equal(s.E.retirer(p, 'M-GH').ok, true);
  assert.equal(s.E.declaration(p, 'M-GH'), null);
  assert.equal(s.enregistrements, 2); assert.equal(s.journal.length, 2);
  assert.equal(s.E.retirer(p, 'M-GH').ok, false, 'rien à retirer');
});

test('l’export suit le format d’échange : projet, marché, liste de types', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  s.E.declarer(p, 'M-GH', ['marque', 'langue'], 'bascule');
  s.E.declarer(p, 'M-CM', [], 'master');
  const e = copie(s.E.exporter(p));
  assert.equal(e.format, 'ecarts-marche'); assert.equal(e.version, 1);
  assert.deepEqual(e.types, ['langue', 'marque', 'produit', 'reglementaire']);
  assert.deepEqual(e.ecarts.map(x => [x.projet, x.marche, x.types, x.detail, x.par]), [
    ['FC-CM-BR-001', 'CM', [], 'master', 'Awa Recette'],
    ['FC-CM-BR-001', 'GH', ['langue', 'marque'], 'bascule', 'Awa Recette'],
  ]);
  assert.ok(e.ecarts.every(x => !Number.isNaN(Date.parse(x.declare_le))));
});

test('l’import pose les lignes du projet, par sa référence ou son brief au registre', async () => {
  const p = dossier({ ref: 'MT-0007' });
  const s = await atelier({ projets: [p], radar: [{ ndeg: 'FC-CM-BR-001', projetId: 'P-1' }] });
  const r = copie(s.E.importer({ format: 'ecarts-marche', version: 1, types: ['langue', 'marque', 'produit', 'reglementaire'],
    ecarts: [
      { projet: 'FC-CM-BR-001', marche: 'gh', types: ['marque', 'langue'], detail: 'bascule', declare_le: '2026-09-14', par: 'Cadrage' },
      { projet: 'MT-0007', marche: 'CI', type: 'produit' },
      { projet: 'FC-CM-BR-001', marche: 'CM', types: [] },
      { projet: 'AUTRE-002', marche: 'CM', types: ['langue'] },
    ] }, p));
  assert.deepEqual(r.erreurs, []);
  assert.deepEqual(r.poses, ['GH', 'CI', 'CM']);
  assert.deepEqual(r.ignores, ['AUTRE-002 × CM']);
  assert.match(r.avertissements.join(' '), /CI.*hors du périmètre/);
  const gh = copie(s.E.declaration(p, 'M-GH'));
  assert.deepEqual([gh.types, gh.detail, gh.declare_le, gh.par, gh.source], [['langue', 'marque'], 'bascule', '2026-09-14', 'Cadrage', 'import']);
  assert.ok(!Number.isNaN(Date.parse(gh.importe_le)));
  assert.equal(gh.acteur.nom, 'Awa Recette', 'qui a importé');
  assert.deepEqual(copie(s.E.declaration(p, 'M-CI').types), ['produit'], 'une ligne à un seul type devient une liste d’un élément');
  assert.equal(s.E.declaration(p, 'M-CI').declare_le, null, 'une date absente ne s’invente pas');
  assert.equal(s.enregistrements, 1, 'un import, un enregistrement'); assert.equal(s.journal.length, 1);
});

test('un import fautif n’écrit rien', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  const fautif = copie(s.E.importer({ format: 'ecarts-marche', version: 1, ecarts: [
    { projet: 'FC-CM-BR-001', marche: 'GH', types: ['langue'] },
    { projet: 'FC-CM-BR-001', marche: 'ZZ', types: ['langue'] },
    { projet: 'FC-CM-BR-001', marche: 'CM', types: ['confort'] },
  ] }, p));
  assert.equal(fautif.erreurs.length, 2);
  assert.match(fautif.erreurs.join(' '), /ZZ.*référentiel/); assert.match(fautif.erreurs.join(' '), /confort/);
  assert.deepEqual(fautif.poses, []);
  assert.equal(p.perimetre.ecarts, undefined); assert.equal(s.enregistrements, 0);
  assert.match(s.E.importer({ format: 'autre', version: 1, ecarts: [] }, p).erreurs[0], /format/i);
  assert.match(s.E.importer({ format: 'ecarts-marche', version: 2, ecarts: [] }, p).erreurs[0], /version/i);
  assert.match(s.E.importer({ format: 'ecarts-marche', version: 1, ecarts: [{ projet: 'X', marche: 'GH', types: [] }] }, p).erreurs[0],
    /aucune ligne pour ce dossier/i);
  assert.equal(s.enregistrements, 0);
});

test('exporter puis importer ailleurs restitue les mêmes déclarations', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  s.E.declarer(p, 'M-GH', ['marque', 'langue'], 'bascule');
  s.E.declarer(p, 'M-CM', ['reglementaire'], 'mentions');
  const fichier = copie(s.E.exporter(p));
  const q = dossier(), t = await atelier({ projets: [q] });
  assert.deepEqual(copie(t.E.importer(fichier, q)).erreurs, []);
  for (const id of ['M-GH', 'M-CM']) {
    const a = copie(s.E.declaration(p, id)), b = copie(t.E.declaration(q, id));
    assert.deepEqual([b.types, b.detail, b.declare_le, b.par], [a.types, a.detail, a.declare_le, 'Awa Recette']);
  }
});

test('le bloc de la grille montre chaque marché et déclare depuis le panneau', async () => {
  const p = dossier(), s = await atelier({ projets: [p] });
  let rafraichi = 0;
  let bloc = s.E.bloc(p, () => { rafraichi += 1; });
  assert.match(s.texte(bloc), /Écarts déclarés par marché/);
  assert.match(s.texte(bloc), /0 sur 2 marchés déclarés/);
  assert.match(s.texte(bloc), /non déclaré/);
  s.find(bloc, n => n.tag.startsWith('button') && n.children.includes('déclarer') && n['aria-label'] === 'Déclarer l’écart de GH').onclick();
  const cases = s.all(s.panneau, n => n.tag === 'input' && n.type === 'checkbox');
  assert.deepEqual(cases.map(c => c.value), ['langue', 'marque', 'produit', 'reglementaire']);
  cases[0].checked = true; cases[1].checked = true;
  s.find(s.panneau, n => n.tag === 'textarea').value = 'bascule';
  s.find(s.panneau, n => n.tag.startsWith('button') && n.children.includes('Déclarer')).onclick();
  assert.deepEqual(copie(s.E.declaration(p, 'M-GH').types), ['langue', 'marque']);
  assert.equal(s.fermetures, 1); assert.equal(rafraichi, 1);
  bloc = s.E.bloc(p, () => {});
  assert.match(s.texte(bloc), /1 sur 2 marchés déclarés/);
  assert.match(s.texte(bloc), /Langue \+ Marque/);

  s.find(bloc, n => n['aria-label'] === 'Déclarer l’écart de GH').onclick();
  const rouvertes = s.all(s.panneau, n => n.tag === 'input' && n.type === 'checkbox');
  assert.deepEqual(rouvertes.map(c => !!c.checked), [true, true, false, false], 'la déclaration se relit cochée');
  s.find(s.panneau, n => n.tag.startsWith('button') && n.children.includes('Retirer la déclaration')).onclick();
  assert.equal(s.E.declaration(p, 'M-GH'), null);
});
