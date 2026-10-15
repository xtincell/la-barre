import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = Object.fromEntries(await Promise.all(
  ['ui', 'regles', 'vue-livrable', 'vue-planche', 'compilateur'].map(async name =>
    [name, await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8')])));

function noeud(tag, props = {}, ...children) {
  return { tag, ...props, attrs: {}, children: children.flat(Infinity).filter(x => x != null),
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(n) { this.children.push(n); } };
}
function texte(n) {
  if (n == null) return '';
  if (typeof n !== 'object') return String(n);
  return (n.textContent || '') + (n.children || []).map(texte).join(' ');
}
function tous(n) { return n && typeof n === 'object' ? [n, ...(n.children || []).flatMap(tous)] : []; }

function moteur(assets = []) {
  const capture = {};
  const sb = { console, O: { el: noeud, langue: x => x || '', vider() {} },
    PRODUCTION: { ETAPES: [] },
    DEPOT: { trouve: (collection, id) => collection === 'assets' ? assets.find(x => x.id === id) : null },
    document: { createElementNS: (_, tag) => noeud(tag) },
    ANNOT: { ouvertes: () => [] }, IMAGE: { vignette: () => noeud('div', {}, 'Sans visuel'), bouton: () => null },
  };
  sb.window = sb;
  const context = vm.createContext(sb);
  for (const name of ['ui', 'regles', 'vue-livrable']) vm.runInContext(sources[name], context);
  const originalGraph = sb.UI.graphe;
  sb.UI.graphe = (centre, liens) => {
    capture.centre = JSON.parse(JSON.stringify(centre));
    capture.liens = JSON.parse(JSON.stringify(liens));
    return originalGraph(centre, liens);
  };
  return { sb, context, capture };
}

test('une source à qualifier reste disponible sans devenir une dépendance validée', () => {
  const asset = { id: 'source', nom: 'Document de campagne', aQualifier: true };
  const l = { id: 'master', nom: 'Maître IMP', assets: ['source'], version: 1 };
  const p = { livrables: [l] }, before = JSON.stringify({ asset, p });
  const m = moteur([asset]);
  const vue = m.sb.VUE_LIVRABLE.dependances(p, l);
  assert.equal(m.capture.liens[0].ok, null);
  assert.equal(m.capture.centre.ok, null);
  assert.match(texte(vue), /à qualifier/i);
  assert.doesNotMatch(texte(vue), /dépendance non satisfaite|manque|\bok\b/i);
  assert.equal(JSON.stringify({ asset, p }), before, 'la lecture ne qualifie ni la source ni le maître');
});

test('une restriction concerne son asset et ne condamne pas toutes les autres dépendances', () => {
  const assets = [{ id: 'CI', nom: 'Visuel CI', zones: ['M-CI'] },
    { id: 'GH', nom: 'Visuel GH', zones: ['M-GH'] }];
  const l = { id: 'master', nom: 'Maître', assets: ['CI', 'GH'], marche: 'M-GH' };
  const m = moteur(assets);
  m.sb.VUE_LIVRABLE.dependances({ livrables: [l] }, l);
  assert.deepEqual(m.capture.liens.map(x => x.ok), [false, true]);
});

test('une référence disparue reste visible et ne devient pas une liste vide', () => {
  const l = { id: 'master', nom: 'Maître', assets: ['source-absente'] };
  const m = moteur();
  const vue = m.sb.VUE_LIVRABLE.dependances({ livrables: [l] }, l);
  assert.equal(m.capture.liens?.length, 1);
  assert.equal(m.capture.liens[0].ok, false);
  assert.match(texte(vue), /source-absente|introuvable/);
});

test('un graphe distingue qualification inconnue, disponible et manquant', () => {
  const m = moteur();
  const vue = m.sb.UI.graphe({ nom: 'Maître', ok: null }, [
    { nom: 'À qualifier', ok: null }, { nom: 'Disponible', ok: true }, { nom: 'Manquant', ok: false },
  ]);
  const cercles = tous(vue).filter(n => n.tag === 'circle' && n.attrs.r === 5);
  assert.equal(cercles[1].attrs.fill, 'var(--vert)');
  assert.equal(cercles[2].attrs.fill, 'var(--alerte)');
  assert.notEqual(cercles[0].attrs.fill, 'var(--vert)');
  assert.notEqual(cercles[0].attrs.fill, 'var(--alerte)');
  const centre = tous(vue).find(n => n.tag === 'circle' && n.attrs.r === 24);
  assert.equal(centre.attrs.stroke, cercles[0].attrs.fill);
});

test('les cartes de deux maîtres montrent leur identité sans dépendre du title', () => {
  const m = moteur();
  const livrables = ['IMP', 'EVAP'].map(categorie => ({ id: categorie, nom: 'Bonnet Rouge ' + categorie,
    niveau: 'maitre', kv: { marque: 'Bonnet Rouge' }, assets: [], version: 1 }));
  const p = { sections: { pistes: [] }, livrables };
  m.sb.KV = { grille: () => ({ kvs: livrables, marques: ['Bonnet Rouge'] }),
    conforme: () => true, conformite: () => [], pireEcart: () => null,
    maitres: () => livrables, estMaitre: l => l.niveau === 'maitre', estAdaptation: () => false,
    declinaisons: () => [], niveau: l => l.niveau, NIVEAUX: { maitre: { nom: 'KV master' } } };
  vm.runInContext(sources['vue-planche'], m.context);
  const vue = m.sb.VUE_PLANCHE.rendre(p, () => {});
  const cartes = tous(vue).filter(n => n.tag === 'button.plc-visuel');
  assert.equal(cartes.length, 2);
  assert.match(texte(cartes[0]), /Bonnet Rouge IMP/);
  assert.match(texte(cartes[1]), /Bonnet Rouge EVAP/);
});

test('une dépendance connue garde son état et les choix enregistrés intacts', () => {
  const asset = { id: 'source', nom: 'Source connue', aQualifier: false, zones: ['M-CI'] };
  const l = { id: 'master', nom: 'Maître', assets: ['source'], marche: 'M-CI', version: 3 };
  const before = JSON.stringify({ asset, l });
  const m = moteur([asset]);
  m.sb.VUE_LIVRABLE.dependances({ livrables: [l] }, l);
  assert.equal(m.capture.liens[0].ok, true);
  assert.equal(m.capture.centre.ok, true);
  assert.equal(JSON.stringify({ asset, l }), before);
});

test('compiler la gamme ordonne les packs déclarés sans écrire dans le catalogue', () => {
  const catalogue = [{ id: 'probable', nom: 'Pack du catalogue' },
    { id: 'declare', nom: 'Pack montré', __retenu: false }];
  const before = JSON.stringify(catalogue), m = moteur();
  m.sb.MARQUE = { toutes: () => [{ id: 'marque' }] };
  m.sb.VAULT = { catalogue: () => catalogue, gammeDuDossier: () => null };
  vm.runInContext(sources.compilateur, m.context);
  const p = { livrables: [{ kv: { sku: ['declare'] } }] };
  const rendu = m.sb.COMPILATEUR.gammeDeLaCampagne(p, { id: 'marque' });
  assert.deepEqual(Array.from(rendu, x => x.id), ['declare', 'probable']);
  assert.equal(JSON.stringify(catalogue), before);
});

test('lire les blocages d’un dossier conserve les résolutions des autres dossiers', () => {
  const m = moteur();
  const donnees = { projets: ['A', 'A-2', 'B'].map(id => ({ id, sections: {
    identite: { decideur: 'Client', tueur: 'Client', fenetre: 'Octobre' },
  }, livrables: [] })), blocages: ['A', 'A-2', 'B'].map(id => ({
    id: 'blocage-' + id, cle: id + '|ancien|identite', ne_le: '2026-09-01', resolu_le: null,
  })) };
  m.sb.DEPOT.liste = collection => donnees[collection] || [];
  m.sb.NATURE = { aSection: () => false };
  m.sb.O.id = prefix => prefix + donnees.blocages.length;
  m.sb.O.depuis = () => 0;
  const autres = JSON.stringify(donnees.blocages.slice(1));
  m.sb.REGLES.blocages('A');
  assert.ok(donnees.blocages[0].resolu_le, 'le blocage disparu du dossier lu est résolu');
  assert.equal(JSON.stringify(donnees.blocages.slice(1)), autres, 'les autres dossiers ne sont pas recalculés');
  const resolution = donnees.blocages[0].resolu_le;
  m.sb.REGLES.blocages('A');
  assert.equal(donnees.blocages[0].resolu_le, resolution, 'une relecture conserve la date');
  m.sb.REGLES.blocages();
  assert.ok(donnees.blocages.slice(1).every(x => x.resolu_le), 'le calcul global traite encore tous les dossiers');
});
