import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function atelier(marche) {
  let panneau, form;
  let sequence = 0;
  const supports = [{ id: 'S-KV', code: 'kv', type: 'kv', nom: 'KV' },
    { id: 'S-OOH', type: 'print', nom: 'Affiche' }];
  function el(tag, props = {}, ...children) {
    const node = { tag, value: '', ...props, children: children.flat(Infinity).filter(Boolean),
      appendChild(child) { this.children.push(child); if (this.children.length === 1 && child.tag === 'option') this.value = child.value; },
      addEventListener(event, handler) { this['on' + event] = handler; },
    };
    return node;
  }
  const sb = { console, Date, O: { el, id: prefix => prefix + (++sequence), langue: x => x },
    MAISON: { points: [{ cle: 'technique' }, { cle: 'central' }], titulaire: 'creation' },
    DEPOT: {
      trouve: (collection, id) => collection === 'marches' && marche?.id === id ? marche : supports.find(x => x.id === id),
      liste: collection => collection === 'marches' ? (marche ? [marche] : []) : collection === 'supports' ? supports : [],
      tracer() {}, enregistrer() {},
    },
    UI: { recevabilite: (titre, controles, rien, actions) => ({ tag: 'actions', children: actions.map(a => el('button', { onclick: a.quand }, a.nom)) }),
      banniere: (...x) => el('div', {}, ...x), icone: () => el('span'),
      graphe: () => el('div'), fileItem: (...x) => el('div', {}, ...x), eti: (...x) => el('span', {}, ...x) },
    ANNOT: { ouvertes: () => [] }, IMAGE: { vignette: () => el('img'), bouton: () => el('button') }, DENSITE: 'normale',
    PANNEAU: { ouvrir: (titre, sous, body) => { panneau = body; }, sur: (titre, sous, body) => { panneau = body; }, fermer() {}, fermerSur() {} },
    AVIS: { refus: message => { sb.erreur = message; } },
  };
  sb.window = sb;
  vm.createContext(sb);
  sb.O.vider = node => { node.children = []; };
  for (const f of ['reconciliation', 'formulaire', 'version', 'regles', 'kv-modele', 'production', 'vue-planche', 'vue-livrable']) vm.runInContext(await readFile(new URL('../app/' + f + '.js', import.meta.url), 'utf8'), sb);
  sb.FORM.rendre = (champs, valeurs) => {
    const base = JSON.parse(JSON.stringify(valeurs)), v = JSON.parse(JSON.stringify(valeurs));
    form = { champs, noeud: el('form'), valeurs: () => v, base: () => base,
      changements: () => Object.fromEntries(champs.filter(c => JSON.stringify(v[c.cle]) !== JSON.stringify(base[c.cle])).map(c => [c.cle, v[c.cle]])) };
    return form;
  };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.children || []) { const result = find(child, predicate); if (result) return result; }
  }
  const click = (tree, text) => { const b = find(tree, n => n.tag.startsWith('button') && n.children.includes(text)); assert.ok(b, text); b.onclick(); };
  return { sb, find, click, get panneau() { return panneau; }, get form() { return form; } };
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
  s.click(s.sb.VUE_PLANCHE.rendre(p, () => {}), 'Créer des formats');
  s.click(s.panneau, 'Affiche');
  s.click(s.panneau, 'Décliner');
  const format = p.livrables[1]; assert.ok(format);
  assert.equal(format.maitre, 'KV-1'); assert.equal(format.versionMaitre, 3); assert.equal(format.marche, 'M-1');
  assert.equal(format.pisteId, 'PI-1'); assert.equal(format.support, 'S-OOH');
  assert.deepEqual(JSON.parse(JSON.stringify(format.points)), { technique: 'attente', central: 'attente' });
  assert.equal(format.version, 1);
});

test('le premier KV commun se crée sans marché ni parent et garde sa piste', async () => {
  const s = await atelier(null), p = projet();
  s.click(s.sb.VUE_PLANCHE.rendre(p, () => {}), 'Ajouter un KV');
  s.click(s.panneau, 'Créer');
  const l = p.livrables[0];
  assert.equal(l.niveau, 'maitre'); assert.equal(l.marche, null); assert.equal(l.maitre, null);
  assert.equal(l.versionMaitre, null); assert.equal(l.pisteId, 'PI-1');
  assert.deepEqual(JSON.parse(JSON.stringify(l.points)), { technique: 'attente', central: 'attente' });
  assert.equal(l.validation, undefined);
});

test('une adaptation exige un vrai master et hérite sans modifier le commun', async () => {
  const s = await atelier({ id: 'M-1', langues: ['FR', 'EN'], mentions: [] }), p = projet();
  assert.throws(() => s.sb.KV.creer(p, 'M-1', null, 'adaptation'), /master/i);
  assert.equal(p.livrables.length, 0);
  const master = s.sb.KV.creer(p, null, null, 'maitre'); master.version = 3;
  master.kv.copy = 'La référence'; master.kv.sku = ['Pack A']; master.kv.signe = 'Cercle';
  const before = JSON.stringify(master);
  const a = s.sb.KV.creer(p, 'M-1', master, 'adaptation');
  assert.equal(a.maitre, master.id); assert.equal(a.versionMaitre, 3); assert.equal(a.langue, undefined);
  assert.equal(a.kv.langue, ''); assert.equal(a.kv.signe, 'Cercle');
  a.kv.sku.push('Pack B'); a.kv.copy = 'Écart local';
  assert.equal(JSON.stringify(master), before);
  assert.throws(() => s.sb.KV.creer(p, 'M-inconnu', master, 'adaptation'), /marché/);
  assert.throws(() => s.sb.KV.creer(p, 'M-1', a, 'adaptation'), /master/i);
});

test('la commande native distingue explicitement master et adaptation', async () => {
  const s = await atelier({ id: 'M-1', nom: 'Marché de recette', langues: ['FR'], mentions: [] }), p = projet();
  const master = s.sb.KV.creer(p, null, null, 'maitre');
  s.sb.VUE_PLANCHE.ajouter(p, () => {});
  const type = s.find(s.panneau, n => n['aria-label'] === 'Niveau du KV');
  assert.equal(type.value, 'adaptation');
  s.find(s.panneau, n => n['aria-label'] === 'Marché de destination').value = 'M-1';
  s.click(s.panneau, 'Créer');
  assert.equal(p.livrables[1].maitre, master.id); assert.equal(p.livrables[1].niveau, 'adaptation');
  assert.equal(p.livrables[1].marche, 'M-1');
});

test('un format peut recevoir le commun directement sur un marché choisi', async () => {
  const s = await atelier({ id: 'M-1', nom: 'Marché de recette', code: 'REC', langues: ['FR'], mentions: [] }), p = projet();
  const master = s.sb.KV.creer(p, null, null, 'maitre');
  s.click(s.sb.VUE_PLANCHE.rendre(p, () => {}), 'Créer des formats');
  s.click(s.panneau, 'Affiche');
  s.find(s.panneau, n => n['aria-label'] === 'Marché des formats').value = 'M-1';
  s.click(s.panneau, 'Décliner');
  assert.equal(p.livrables.length, 2); assert.equal(p.livrables[1].maitre, master.id);
  assert.equal(p.livrables[1].marche, 'M-1'); assert.equal(p.livrables[1].niveau, 'declinaison');
});

test('une reprise du commun périme aussi les formats de ses adaptations sans effacer leur travail', async () => {
  const s = await atelier(null), p = projet();
  const m = { id: 'M', version: 1 }, a = { id: 'A', version: 1, maitre: 'M', versionMaitre: 1 };
  const f = { id: 'F', version: 2, maitre: 'A', versionMaitre: 1, fichiers: ['travail conservé'] };
  p.livrables = [m, a, f]; const before = JSON.stringify(f);
  assert.equal(s.sb.REGLES.maitrePerime(p, f), false);
  m.version = 2;
  assert.equal(s.sb.REGLES.maitrePerime(p, f), true); assert.equal(JSON.stringify(f), before);
  a.versionMaitre = 2;
  assert.equal(s.sb.REGLES.maitrePerime(p, f), false);
  a.version = 2; assert.equal(s.sb.REGLES.maitrePerime(p, f), true);
});

test('une référence absente ou cyclique ne se présente pas comme à jour et ne bloque pas la lecture', async () => {
  const s = await atelier(null), p = projet();
  const a = { id: 'A', maitre: 'B', version: 1, versionMaitre: 1 }, b = { id: 'B', maitre: 'A', version: 1, versionMaitre: 1 };
  p.livrables = [a]; assert.equal(s.sb.REGLES.maitrePerime(p, a), true);
  p.livrables.push(b); assert.equal(s.sb.REGLES.maitrePerime(p, a), true);
  assert.deepEqual(Array.from(s.sb.KV.descendance(p, 'A'), l => l.id), ['B']);
});

test('régler un KV versionne le contenu et conserve les champs reçus pendant la saisie', async () => {
  const s = await atelier({ id: 'M-1', langues: ['FR'], mentions: [], sku: [] }), p = projet(), m = kv();
  p.livrables = [m]; m.validation = { verdict: 'approuve', version: 3 };
  s.click(s.sb.VUE_PLANCHE.caseKV(p, m, () => {}), 'Régler');
  s.form.valeurs().copy = 'Ma correction'; m.kv.signe = 'Autre signe reçu';
  s.click(s.panneau, 'Enregistrer');
  assert.equal(m.version, 4); assert.equal(m.kv.copy, 'Ma correction'); assert.equal(m.kv.signe, 'Autre signe reçu');
  assert.equal(m.versions[0].etat.kv.copy, 'Le signe commun'); assert.equal(m.validation.version, 3);
  s.click(s.sb.VUE_PLANCHE.caseKV(p, m, () => {}), 'Régler'); s.click(s.panneau, 'Enregistrer');
  assert.equal(m.version, 4);
});

test('recevoir une reprise conserve l’ancien accord et périme les formats suivants', async () => {
  const s = await atelier(null), p = projet();
  const m = { id: 'M', nom: 'Commun', version: 2, kv: { copy: 'Nouveau commun' } };
  const a = { id: 'A', nom: 'Adaptation', maitre: 'M', versionMaitre: 1, version: 1,
    kv: { copy: 'Travail local ajusté' }, validation: { verdict: 'approuve', version: 1 }, fichiers: [{ id: 'ancien-bat', version: 1 }] };
  const f = { id: 'F', maitre: 'A', versionMaitre: 1, version: 1 };
  p.livrables = [m, a, f];
  const attendu = { maitreId: 'M', versionMaitre: 2, version: 1, contenuMaitre: JSON.stringify(m.kv), contenuLivrable: JSON.stringify(a) };
  s.sb.KV.reprendreReference(p, a, attendu, 'Accroche locale révisée');
  assert.equal(a.version, 2); assert.equal(a.versionMaitre, 2); assert.equal(s.sb.REGLES.maitrePerime(p, a), false);
  assert.equal(s.sb.REGLES.maitrePerime(p, f), true);
  assert.equal(a.versions[0].etat.kv.copy, 'Travail local ajusté');
  assert.equal(a.versions[0].etat.versionMaitre, 1); assert.equal(a.validation.version, 1);
  assert.equal(a.fichiers[0].version, 1); assert.equal(a.kv.copy, 'Travail local ajusté');
  assert.throws(() => s.sb.KV.reprendreReference(p, a, attendu, 'Deuxième clic'), /changé/);
  assert.equal(a.version, 2);
});

test('une reprise refuse la référence modifiée et une chaîne qui reste périmée', async () => {
  const s = await atelier(null), p = projet();
  const m = { id: 'M', nom: 'Commun', version: 2, kv: { copy: 'Commun' } };
  const a = { id: 'A', maitre: 'M', versionMaitre: 1, version: 1 };
  const f = { id: 'F', maitre: 'A', versionMaitre: 1, version: 1 };
  p.livrables = [m, a, f];
  const attendu = { maitreId: 'A', versionMaitre: 1, version: 1, contenuMaitre: '{}', contenuLivrable: JSON.stringify(f) };
  assert.throws(() => s.sb.KV.reprendreReference(p, f, attendu, 'Reprise'), /propre parent/);
  assert.equal(f.versions, undefined);
  const lu = { maitreId: 'M', versionMaitre: 2, version: 1, contenuMaitre: JSON.stringify(m.kv), contenuLivrable: JSON.stringify(a) };
  m.kv.copy = 'Correction concurrente';
  assert.throws(() => s.sb.KV.reprendreReference(p, a, lu, 'Reprise'), /changé/);
  assert.equal(a.versions, undefined);
  m.kv.copy = 'Commun'; a.fichiers = [{ nom: 'Fichier arrivé pendant la lecture' }];
  assert.throws(() => s.sb.KV.reprendreReference(p, a, lu, 'Reprise'), /changé/);
  assert.equal(a.versions, undefined);
});

test('le réglage conserve les deux propositions concurrentes avant de choisir', async () => {
  const s = await atelier({ id: 'M-1', langues: ['FR'], mentions: [], sku: [] }), p = projet(), m = kv();
  p.livrables = [m];
  s.click(s.sb.VUE_PLANCHE.caseKV(p, m, () => {}), 'Régler');
  s.form.valeurs().copy = 'Ma correction'; m.kv.copy = 'Correction reçue';
  s.click(s.panneau, 'Enregistrer');
  assert.equal(m.version, 3); assert.equal(m.kv.copy, 'Correction reçue');
  assert.match(JSON.stringify(s.panneau), /Ma correction/); assert.match(JSON.stringify(s.panneau), /Correction reçue/);
  const choice = s.find(s.panneau, n => n['aria-label'] === 'Version pour Accroche');
  choice.value = 'ici'; choice.onchange(); s.click(s.panneau, 'Conserver ces choix');
  assert.equal(m.version, 4); assert.equal(m.kv.copy, 'Ma correction');
  assert.equal(m.versions[0].etat.kv.copy, 'Correction reçue');
});

test('la porte de production et le geste natif demandent une reprise explicite', async () => {
  const s = await atelier(null), p = projet();
  const m = { id: 'M', nom: 'Master', version: 2, kv: { copy: 'Commun reçu' } };
  const f = { id: 'F', nom: 'Format', maitre: 'M', versionMaitre: 1, version: 1, pisteId: 'PI-1', support: 'S-KV' };
  p.livrables = [m, f];
  assert.equal(s.sb.PRODUCTION.porte(p, f).find(c => c.quoi === 'Référence reçue à jour').ok, false);
  s.click(s.sb.VUE_LIVRABLE.dependances(p, f, () => {}), 'Recevoir la reprise sur cette référence');
  s.click(s.panneau, 'Recevoir la reprise'); assert.equal(f.version, 1); assert.match(s.sb.erreur, /Vérifier/);
  s.find(s.panneau, n => n['aria-label'] === 'Travail ajusté sur cette référence').checked = true;
  s.find(s.panneau, n => n['aria-label'] === 'Ajustements de la reprise').value = 'Format ajusté sur le commun';
  s.click(s.panneau, 'Recevoir la reprise');
  assert.equal(f.version, 2); assert.equal(f.versionMaitre, 2);
  assert.equal(s.sb.PRODUCTION.porte(p, f).find(c => c.quoi === 'Référence reçue à jour').ok, true);
  p.livrables = [f]; assert.match(JSON.stringify(s.sb.VUE_LIVRABLE.dependances(p, f)), /référence manque/);
});
