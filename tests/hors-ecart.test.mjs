import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { bac, semer, bouton, saisie, cliquer, PERSONNES } from './decisions-scenarios.mjs';

/* Une adaptation hors de son écart déclaré (décision du 12 novembre 2026).
 *
 * Le marché déclare au cadrage ce qu'il a le droit de changer du master
 * (ecarts-marche.js). Une adaptation qui change autre chose passe : elle n'est
 * pas bloquée. Elle est signalée « hors écart déclaré », avec la dimension qui
 * sort, et la revue tranche : corriger l'écart déclaré, ou corriger
 * l'adaptation. Les deux sont des décisions de la fabrique (decision.js).
 *
 * Ce qu'une adaptation change se lit contre son point de départ : ce qu'elle a
 * reçu du master et du référentiel à sa création. Une adaptation créée avant
 * cette capture n'en a pas : elle est « non évaluée », jamais signalée. */

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const copie = x => JSON.parse(JSON.stringify(x));

const MARCHES = [
  { id: 'M-GH', code: 'GH', nom: 'Ghana', langues: ['en'], sku: ['Tin 400 g', 'Boîte 400 g'], mentions: ['Best before end'] },
  { id: 'M-CI', code: 'CI', nom: 'Côte d’Ivoire', langues: ['fr'], sku: ['Boîte 400 g'], mentions: ['À consommer de préférence avant le…'] },
];

async function atelier(graine = 1, extra = {}) {
  const s = await bac(APP, graine);
  for (const nom of ['kv-modele', 'ecarts-marche', 'jurisprudence']) await s.charger(nom);
  s.ctx.IMAGE = { vignette: () => s.ctx.document.createElement('img'), bouton: () => s.ctx.document.createElement('button') };
  s.ctx.ANNOT = { ouvertes: () => [] };
  semer(s.ctx, { personnes: PERSONNES, marches: MARCHES, supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual', type: 'kv' }],
    projets: [{ id: 'P-1', ref: 'LUM-001', nom: 'Lumen — rentrée', cree_le: '2026-11-01T08:00:00.000Z',
      sections: { pistes: [{ id: 'PI-1', titre: 'Le jour se lève', statut: 'retenue', auteurDA: 'P-junior' }] },
      perimetre: { supports: ['S-kv'], marches: ['M-GH', 'M-CI'] }, volets: [], livrables: [] }], ...extra });
  const p = s.ctx.DEPOT.trouve('projets', 'P-1');
  const KV = s.ctx.KV, E = s.ctx.ECARTS_MARCHE;
  const master = KV.creer(p, null, null, 'maitre');
  Object.assign(master.kv, { marque: 'Lumen', copy: 'Le jour se lève ici', langue: 'fr', sku: ['Boîte 400 g'], restrictions: [] });
  return { s, p, KV, E, master };
}

const texte = n => (n && n.textContent) || '';
const decisions = s => copie(s.ctx.DEPOT.liste('decisions'));

test('une adaptation créée garde son point de départ : le master et le référentiel, sans toucher au commun', async () => {
  const { p, KV, master } = await atelier(1);
  master.version = 2;
  const avant = JSON.stringify(master);
  const a = KV.creer(p, 'M-GH', master, 'adaptation');
  assert.equal(JSON.stringify(master), avant, 'le commun ne bouge pas');
  const d = copie(a.depart);
  assert.equal(d.maitre, master.id); assert.equal(d.versionMaitre, 2);
  assert.ok(!Number.isNaN(Date.parse(d.le)));
  assert.deepEqual(d.kv, { marque: 'Lumen', copy: 'Le jour se lève ici', langue: 'en', sku: ['Boîte 400 g'],
    mentions: ['Best before end'], restrictions: [] }, 'la langue et les mentions du marché font partie du départ');
  a.kv.sku.push('Tin 400 g');
  assert.deepEqual(copie(a.depart.kv.sku), ['Boîte 400 g'], 'le départ est une copie, pas une référence');
  assert.equal(KV.creer(p, null, null, 'maitre').depart, undefined, 'un master n’a pas de départ : il est le départ');
});

test('une adaptation sans point de départ est « non évaluée », jamais signalée', async () => {
  const { p, E, master } = await atelier(2);
  const ancienne = { id: 'KV-ancien', niveau: 'adaptation', maitre: master.id, versionMaitre: 1, marche: 'M-GH', version: 1,
    pisteId: 'PI-1', nom: 'KV · GH', kv: { marque: 'Autre marque', copy: 'The day rises', langue: 'en', sku: ['Tin 400 g'], mentions: [] } };
  p.livrables.push(ancienne);
  E.declarer(p, 'M-GH', ['produit']);
  const r = copie(E.evaluer(p, ancienne));
  assert.equal(r.etat, 'non-evaluee');
  assert.deepEqual([r.change, r.hors], [[], []]);
  assert.equal(copie(E.evaluer(p, master)).etat, 'sans-objet', 'un master n’est pas une adaptation');
  assert.deepEqual(copie(E.signales(p)), []);
});

test('la langue change alors que seul « produit » est déclaré : l’adaptation passe, signalée hors écart', async () => {
  const { s, p, KV, E } = await atelier(3);
  E.declarer(p, 'M-GH', ['produit'], 'Le Ghana vend la boîte en Tin');
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart', 'rien de changé : rien à signaler');
  a.kv.sku = ['Tin 400 g'];
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart', 'le produit est déclaré');
  const conformite = JSON.stringify(KV.conformite(p, a));
  a.kv.copy = 'The day rises here';
  const r = copie(E.evaluer(p, a));
  assert.equal(r.etat, 'hors-ecart');
  assert.deepEqual(r.change, ['langue', 'produit']);
  assert.deepEqual(r.hors, ['langue']);
  assert.deepEqual(r.champs, ['copy', 'sku']);
  assert.deepEqual(r.declaration.types, ['produit']);
  assert.equal(r.revue, null);
  /* Signaler n'est pas bloquer : la conformité du KV ne change pas, aucune décision n'est écrite. */
  const apres = KV.conformite(p, a);
  assert.equal(apres.length, JSON.parse(conformite).length);
  assert.ok(!apres.some(c => /écart déclaré/i.test(c.quoi)));
  assert.equal(decisions(s).length, 0);
  assert.deepEqual(copie(E.signales(p)).map(x => [x.livrable, x.hors]), [[a.id, ['langue']]]);
});

test('un champ que le départ laissait vide se complète sans écart ; un retrait est un changement', async () => {
  const { p, KV, E, master } = await atelier(4);
  master.kv.marque = ''; master.kv.restrictions = [];
  E.declarer(p, 'M-GH', []);
  const a = KV.creer(p, 'M-GH', master, 'adaptation');
  a.kv.marque = 'Lumen Ghana';
  a.kv.restrictions = ['Pas d’enfant seul à l’écran'];
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart', 'compléter n’est pas s’écarter du master');
  a.kv.mentions = [];
  const r = copie(E.evaluer(p, a));
  assert.deepEqual([r.etat, r.hors], ['hors-ecart', ['reglementaire']], 'retirer une mention du marché change le réglementaire');
});

test('« aucun écart » déclaré : toute modification sort de l’écart ; une langue en casse différente n’en est pas une', async () => {
  const { p, KV, E } = await atelier(5);
  E.declarer(p, 'M-CI', []);
  const a = KV.creer(p, 'M-CI', p.livrables[0], 'adaptation');
  a.kv.langue = 'FR'; a.kv.sku = ['Boîte 400 g'];
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart');
  a.kv.marque = 'Lumen Côte d’Ivoire';
  assert.deepEqual(copie(E.evaluer(p, a)).hors, ['marque']);
});

test('un marché non déclaré : ce que l’adaptation change sort d’un écart qui n’a jamais été déclaré', async () => {
  const { p, KV, E } = await atelier(6);
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart');
  a.kv.sku = ['Tin 400 g'];
  const r = copie(E.evaluer(p, a));
  assert.deepEqual([r.etat, r.hors, r.declaration], ['hors-ecart', ['produit'], null]);
});

test('corriger l’écart déclaré : une déviation de la fabrique étend la déclaration, et le signal tombe', async () => {
  const { s, p, KV, E } = await atelier(7);
  E.declarer(p, 'M-GH', ['produit'], 'Le Ghana vend la boîte en Tin');
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  a.kv.copy = 'The day rises here';
  const avant = copie(p.perimetre.ecarts['M-GH']);

  for (const motif of ['', '   ']) {
    assert.equal(E.corrigerDeclaration(p, a, motif).ok, false);
  }
  assert.deepEqual(copie(p.perimetre.ecarts['M-GH']), avant, 'sans motif, rien n’est écrit');
  assert.equal(decisions(s).length, 0);

  const r = E.corrigerDeclaration(p, a, 'Le distributeur ghanéen exige la titraille en anglais');
  assert.equal(r.ok, true);
  const d = decisions(s)[0];
  assert.deepEqual([d.type, d.objet, d.projet, d.verdict, d.portee], ['ecart-marche', 'M-GH', 'P-1', 'approuve', 'projet']);
  assert.deepEqual(d.ecart, { de: 'ecart-marche', ref: 'M-GH', avant: ['produit'], apres: ['langue', 'produit'] });
  assert.equal(d.livrable, a.id);
  assert.equal(d.motif, 'Le distributeur ghanéen exige la titraille en anglais');
  assert.equal(d.acteur.personneId, 'P-recette');
  assert.equal(d.qui, s.ctx.MAISON.titulaire);
  const decl = copie(E.declaration(p, 'M-GH'));
  assert.deepEqual([decl.types, decl.detail, decl.source], [['langue', 'produit'], 'Le Ghana vend la boîte en Tin', 'revue']);
  assert.equal(p.perimetre.ecarts['M-GH'].decision, d.id);
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart');
  assert.deepEqual(copie(E.exporter(p)).ecarts.map(x => [x.marche, x.types]), [['GH', ['langue', 'produit']]],
    'le format d’échange ne change pas');
  assert.ok(s.ctx.DEPOT.journal().some(e => e.type === 'decisions' && e.id === d.id));
  assert.equal(E.corrigerDeclaration(p, a, 'Une seconde fois').ok, false, 'plus rien à corriger');
  assert.equal(decisions(s).length, 1);
});

test('corriger l’adaptation : un retour motivé de la fabrique ; le signal reste jusqu’à la correction', async () => {
  const { s, p, KV, E } = await atelier(8);
  E.declarer(p, 'M-GH', ['produit']);
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  a.kv.copy = 'The day rises here';
  assert.equal(E.corrigerAdaptation(p, a, '').ok, false);
  assert.equal(decisions(s).length, 0);
  const r = E.corrigerAdaptation(p, a, 'La titraille reste celle du master : le Ghana ne déclare que le produit');
  assert.equal(r.ok, true);
  const d = decisions(s)[0];
  assert.deepEqual([d.type, d.objet, d.projet, d.verdict, d.marche], ['hors-ecart', a.id, 'P-1', 'retour', 'M-GH']);
  assert.deepEqual(d.types, ['langue']);
  assert.equal('ecart' in d, false, 'tenir la déclaration n’est pas une déviation');
  assert.deepEqual(copie(E.declaration(p, 'M-GH')).types, ['produit'], 'la déclaration ne bouge pas');
  let ev = copie(E.evaluer(p, a));
  assert.equal(ev.etat, 'hors-ecart');
  assert.equal(ev.revue.id, d.id, 'le signal dit qu’un retour est décidé');
  a.kv.marque = 'Lumen Ghana Ltd';
  ev = copie(E.evaluer(p, a));
  assert.deepEqual(ev.hors, ['langue', 'marque']);
  assert.equal(ev.revue, null, 'un retour ne couvre que ce qu’il a tranché');
  a.kv.marque = 'Lumen'; a.kv.copy = 'Le jour se lève ici';
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart', 'corrigée, l’adaptation n’est plus signalée');
});

test('la revue tranche depuis un panneau : motif exigé, puis l’un des deux gestes', async () => {
  const { s, p, KV, E } = await atelier(9);
  E.declarer(p, 'M-GH', ['produit']);
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  a.kv.copy = 'The day rises here';
  let rafraichi = 0;
  E.revoir(p, a, () => { rafraichi += 1; });
  assert.match(texte(s.dernier()), /Hors écart déclaré/);
  assert.match(texte(s.dernier()), /Langue/);
  cliquer(bouton(s.dernier(), 'Corriger l\'écart déclaré'));
  assert.equal(decisions(s).length, 0, 'sans motif, rien');
  assert.ok(s.refus.length);
  saisie(s.dernier()).value = 'Le distributeur exige l’anglais';
  cliquer(bouton(s.dernier(), 'Corriger l\'écart déclaré'));
  assert.equal(decisions(s).length, 1); assert.equal(rafraichi, 1);
  a.kv.sku = ['Tin 400 g']; a.kv.marque = 'Lumen Ghana Ltd';
  E.revoir(p, a, () => { rafraichi += 1; });
  saisie(s.dernier()).value = 'La marque reste Lumen sur tous les marchés';
  cliquer(bouton(s.dernier(), 'Corriger l\'adaptation'));
  assert.deepEqual(decisions(s).map(d => d.type), ['ecart-marche', 'hors-ecart']);
  assert.equal(rafraichi, 2);
});

test('la reprise d’un master modifié renouvelle le point de départ d’une adaptation évaluée', async () => {
  const { s, p, KV, E, master } = await atelier(10);
  E.declarer(p, 'M-CI', []);
  const a = KV.creer(p, 'M-CI', master, 'adaptation');
  master.version = 2; master.kv.copy = 'Le jour se lève encore ici';
  a.kv.copy = 'Le jour se lève encore ici';
  assert.deepEqual(copie(E.evaluer(p, a)).hors, ['langue'], 'contre l’ancien départ, la nouvelle titraille semble un écart');
  const attendu = { maitreId: master.id, versionMaitre: 2, version: a.version || 1,
    contenuMaitre: JSON.stringify(master.kv), contenuLivrable: JSON.stringify(a) };
  s.ctx.KV.reprendreReference(p, a, attendu, 'Titraille du master V2 reprise');
  assert.equal(a.depart.versionMaitre, 2);
  assert.equal(a.depart.kv.copy, 'Le jour se lève encore ici');
  assert.equal(copie(E.evaluer(p, a)).etat, 'dans-l-ecart');
  const ancienne = { id: 'KV-x', niveau: 'adaptation', maitre: master.id, versionMaitre: 1, version: 1, marche: 'M-CI', kv: { copy: 'Autre' } };
  p.livrables.push(ancienne);
  KV.reprendreReference(p, ancienne, { maitreId: master.id, versionMaitre: 2, version: 1,
    contenuMaitre: JSON.stringify(master.kv), contenuLivrable: JSON.stringify(ancienne) }, 'Reprise');
  assert.equal(ancienne.depart, undefined, 'une reprise n’invente pas le départ d’une adaptation qui n’en avait pas');
});

test('la grille, la planche et la file de décision montrent le signal ; un dossier clos ne réclame rien', async () => {
  const { s, p, KV, E } = await atelier(11);
  E.declarer(p, 'M-GH', ['produit']);
  const a = KV.creer(p, 'M-GH', p.livrables[0], 'adaptation');
  a.kv.copy = 'The day rises here';
  p.livrables.push({ id: 'KV-ancien', niveau: 'adaptation', maitre: p.livrables[0].id, versionMaitre: 1, version: 1,
    marche: 'M-CI', nom: 'KV · CI', kv: { copy: 'Le jour' } });

  const bloc = texte(E.bloc(p, () => {}));
  assert.match(bloc, /1 adaptation hors écart déclaré/);
  assert.match(bloc, /GH[^]*hors écart déclaré : Langue/);
  assert.match(bloc, /1 adaptation non évaluée/);

  await s.charger('vue-planche');
  const carte = texte(s.ctx.VUE_PLANCHE.caseKV(p, a, () => {}));
  assert.match(carte, /Hors écart déclaré · Langue/);
  assert.doesNotMatch(texte(s.ctx.VUE_PLANCHE.caseKV(p, p.livrables[2], () => {})), /écart déclaré/);

  let items = copie(E.aTrancher());
  assert.equal(items.length, 1);
  assert.deepEqual([items[0].projet, items[0].livrable, items[0].hors, items[0].etat], ['P-1', a.id, ['langue'], 'a-trancher']);
  E.corrigerAdaptation(p, a, 'La titraille reste celle du master');
  items = copie(E.aTrancher());
  assert.equal(items[0].etat, 'renvoyee', 'tranché : l’adaptation est due par son auteur, plus à trancher');
  p.cloture = { quand: '2026-11-11T08:00:00.000Z' };
  assert.deepEqual(copie(E.aTrancher()), []);
});

test('les deux décisions de la revue sont rangées dans la jurisprudence', async () => {
  const { s } = await atelier(12);
  for (const type of ['ecart-marche', 'hors-ecart']) {
    assert.ok(s.ctx.JURISPRUDENCE.SOURCES[type], type);
  }
});
