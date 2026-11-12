import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const copy = value => JSON.parse(JSON.stringify(value));
const piste = (id, statut = 'retenue') => ({ id, titre: 'Piste ' + id, statut, concept: 'Concept ' + id, version: 2, arbitre_le: '2026-10-08T00:00:00Z' });
const projet = (id, pi) => ({ id, ref: id, nom: 'Projet ' + id, campagneId: 'C-test', sections: { pistes: [pi] }, livrables: [{ id: 'L-' + id, pisteId: pi.id }] });
async function atelier(ps = [projet('A', piste('a')), projet('B', piste('b'))]) {
  let sequence = 0, saves = 0;
  const data = { campagnes: [{ id: 'C-test', nom: 'Campagne de recette' }], projets: ps, decisions: [], journal: [] };
  const publications = [];
  const ctx = vm.createContext({ Date, console, O: { el() {}, id: prefix => prefix + (++sequence), aleatoire: n => String(++sequence).padStart(n, '0'),
    TIRAGES: 64, identifiantUnique(prefixe, pris) {
      for (let i = 0; i < this.TIRAGES; i++) { const id = prefixe + '-test-' + this.aleatoire(12); if (!pris(id)) return id; }
      return null;
    } }, MAISON: { titulaire: 'creation' },
    ACTEUR: { trace: () => ({ personneId: 'P-recette', poste: 'creation' }) },
    DEPOT: { liste: key => data[key] || [], trouve: (key, id) => (data[key] || []).find(x => x.id === id),
      ajoute(key, value) { const row = { id: 'D-' + (++sequence), ...value }; data[key].push(row); publications.push(copy(data)); return row; },
      tracer(...args) { data.journal.push(args); }, enregistrer() { saves++; } },
  });
  ctx.window = ctx;
  for (const name of ['decision', 'campagne']) vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  return { ctx, data, publications, get saves() { return saves; } };
}

test('deux pistes retenues ne produisent aucune référence implicite, dans les deux ordres', async () => {
  const s = await atelier();
  assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test'), null);
  const a = copy(s.ctx.CAMPAGNE.reference('C-test'));
  s.data.projets.reverse();
  assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test'), null);
  assert.deepEqual(copy(s.ctx.CAMPAGNE.reference('C-test')), a);
  assert.equal(a.etat, 'conflit');
});

test('une seule piste conservée reste la référence ; zéro et projets fusionnés ne créent rien', async () => {
  const s = await atelier([projet('A', piste('a')), { ...projet('B', piste('b')), fusionne: 'A' }]);
  assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test').piste.id, 'a');
  assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'unique');
  s.data.projets[0].sections.pistes[0].statut = 'proposee';
  assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'absente');
  assert.equal(s.data.decisions.length, 0);
});

test('le choix commun conserve les décisions locales et leur production, avec motif et acteur', async () => {
  const s = await atelier(), before = copy(s.data.projets);
  const state = s.ctx.CAMPAGNE.reference('C-test');
  const r = s.ctx.CAMPAGNE.designerReference('C-test', 'B', 'b', 'Ce concept porte le socle commun', state.revision);
  assert.equal(r.ok, true);
  assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test').piste.id, 'b');
  assert.deepEqual(s.data.projets, before);
  assert.equal(s.data.decisions[0].type, 'reference-campagne');
  assert.equal(s.data.decisions[0].portee, 'campagne');
  assert.equal(s.data.decisions[0].acteur.personneId, 'P-recette');
  assert.equal(s.data.decisions[0].motif, 'Ce concept porte le socle commun');
  assert.equal(s.data.decisions[0].version, 2);
  assert.equal(s.saves, 1);
  for (const saved of s.publications) {
    assert.equal(saved.campagnes[0].referencePiste.decisionId, saved.decisions[0].id);
  }
});

test('un rejeu exact conserve le reçu et ne double ni décision ni journal', async () => {
  const s = await atelier(), before = s.ctx.CAMPAGNE.reference('C-test');
  const r = s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', before.revision);
  const replay = s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
  assert.equal(replay.ok, true); assert.equal(replay.dejaRecu, true);
  assert.equal(replay.decision.id, r.decision.id);
  assert.equal(s.data.decisions.length, 1); assert.equal(s.saves, 1);
  const lostResponse = s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', before.revision);
  assert.equal(lostResponse.dejaRecu, true); assert.equal(lostResponse.decision.id, r.decision.id);
  assert.equal(s.data.decisions.length, 1);
});

test('un dialogue périmé ne remplace pas un choix plus récent et ne crée aucune décision', async () => {
  const s = await atelier(), initial = s.ctx.CAMPAGNE.reference('C-test');
  s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Premier choix', initial.revision);
  const before = copy(s.data);
  const r = s.ctx.CAMPAGNE.designerReference('C-test', 'B', 'b', 'Choix ancien', initial.revision);
  assert.equal(r.ok, false); assert.match(r.erreur, /changé|Relisez/);
  assert.deepEqual(copy(s.data), before);
});

test('une piste modifiée, réarbitrée ou retirée exige une nouvelle réception explicite', async () => {
  for (const change of [pi => pi.titre = 'Nouveau titre', pi => pi.version++, pi => pi.arbitre_le = '2026-10-09T00:00:00Z', pi => pi.statut = 'ecartee']) {
    const s = await atelier();
    s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
    change(s.data.projets[0].sections.pistes[0]);
    assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'perimee');
    assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test'), null);
    assert.equal(s.data.decisions.length, 1);
  }
});

test('un mauvais projet, une piste non retenue, une campagne absente ou un motif vide sont refusés sans écriture', async () => {
  for (const [campaign, p, pi, motif] of [['C-test', 'X', 'a', 'Motif'], ['C-test', 'A', 'b', 'Motif'], ['absente', 'A', 'a', 'Motif'], ['C-test', 'A', 'a', '  ']]) {
    const s = await atelier(), before = copy(s.data);
    const r = s.ctx.CAMPAGNE.designerReference(campaign, p, pi, motif, s.ctx.CAMPAGNE.reference(campaign).revision);
    assert.equal(r.ok, false); assert.deepEqual(s.data, before); assert.equal(s.saves, 0);
  }
});

test('le même identifiant de piste dans deux projets reste non ambigu par sa paire', async () => {
  const s = await atelier([projet('A', piste('x')), projet('B', piste('x'))]);
  s.ctx.CAMPAGNE.designerReference('C-test', 'B', 'x', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
  assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test').projet.id, 'B');
});

test('une reprise depuis les données sauvegardées retrouve le choix ; le changement de motif reste une nouvelle décision', async () => {
  const s = await atelier();
  s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
  const restored = await atelier(copy(s.data.projets));
  Object.assign(restored.data, copy(s.data));
  assert.equal(restored.ctx.CAMPAGNE.reference('C-test').etat, 'choisie');
  assert.equal(restored.ctx.CAMPAGNE.pisteDeReference('C-test').piste.id, 'a');
  restored.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Motif amendé', restored.ctx.CAMPAGNE.reference('C-test').revision);
  assert.equal(restored.data.decisions.length, 2);
  assert.equal(restored.data.decisions[0].motif, 'Socle commun');
});

test('un fichier ajouté ne change pas la décision ; un concept amendé conserve l’ancienne version dans le reçu', async () => {
  const s = await atelier(), pi = s.data.projets[0].sections.pistes[0];
  s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
  pi.fabrique = { musique: { fichier: 'son-recette.mp3' } };
  assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'choisie');
  pi.concept = 'Concept amendé';
  assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'perimee');
  s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Amendement reçu', s.ctx.CAMPAGNE.reference('C-test').revision);
  assert.equal(s.data.decisions.length, 2);
  assert.match(s.data.decisions[0].contenuPiste, /Concept a/);
  assert.doesNotMatch(s.data.decisions[0].contenuPiste, /Concept amendé/);
  assert.equal(s.data.decisions[1].remplace, s.data.decisions[0].id);
});

test('un reçu absent ou appartenant à une autre référence ne valide pas le choix', async () => {
  for (const change of [d => d.decisions.length = 0, d => d.decisions[0].campagne = 'Autre', d => d.decisions[0].projet = 'B', d => d.decisions[0].objet = 'b', d => d.decisions[0].portee = 'document', d => d.decisions[0].verdict = 'hors']) {
    const s = await atelier();
    s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
    change(s.data);
    assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'perimee');
    assert.equal(s.ctx.CAMPAGNE.pisteDeReference('C-test'), null);
  }
});

test('deux choix concurrents ne fusionnent pas en un choix implicite ; leurs deux reçus sont conservés', async () => {
  const origin = await atelier(), base = copy(origin.data);
  const a = await atelier(), b = await atelier();
  a.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Choix A', a.ctx.CAMPAGNE.reference('C-test').revision);
  b.ctx.O.aleatoire = n => 'b'.repeat(n);
  b.ctx.CAMPAGNE.designerReference('C-test', 'B', 'b', 'Choix B', b.ctx.CAMPAGNE.reference('C-test').revision);
  vm.runInContext(await readFile(new URL('../app/reconciliation.js', import.meta.url), 'utf8'), origin.ctx);
  const merge = origin.ctx.RECONCILIATION.reconcilier(base, a.data, b.data);
  assert.ok(merge.conflits.length > 0);
  assert.equal(merge.valeur.decisions.length, 2);
});

test('la désignation et une édition indépendante se rapprochent sans perdre le reçu ni la saisie', async () => {
  const origin = await atelier(), base = copy(origin.data), a = await atelier(), b = copy(base);
  a.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Choix A', a.ctx.CAMPAGNE.reference('C-test').revision);
  b.projets[1].nom = 'Projet B renommé';
  vm.runInContext(await readFile(new URL('../app/reconciliation.js', import.meta.url), 'utf8'), origin.ctx);
  const merge = origin.ctx.RECONCILIATION.reconcilier(base, a.data, b);
  assert.equal(merge.conflits.length, 0);
  Object.assign(origin.data, copy(merge.valeur));
  assert.equal(origin.ctx.CAMPAGNE.reference('C-test').etat, 'choisie');
  assert.equal(origin.data.projets[1].nom, 'Projet B renommé');
});

/* ————— L'écart d'un projet à la référence commune ————— */

/* Une fois la référence désignée, un projet de la campagne qui garde sa propre
 * piste s'écarte d'une décision. Le contrôle « hors-piste-de-campagne » se tait
 * sur celui qui a écrit son écart (`ecartDeCampagne`) : ce geste l'écrit, par la
 * fabrique, avec son motif et sa portée. */
async function designee() {
  const s = await atelier();
  const r = s.ctx.CAMPAGNE.designerReference('C-test', 'A', 'a', 'Socle commun', s.ctx.CAMPAGNE.reference('C-test').revision);
  assert.equal(r.ok, true);
  return { s, reference: r.decision };
}
const declarer = (s, projet, pisteId, motif, portee) =>
  s.ctx.CAMPAGNE.declarerEcart('C-test', projet, pisteId, motif, portee, s.ctx.CAMPAGNE.reference('C-test').revision);

test('un projet qui garde sa piste déclare son écart à la référence choisie, de portée projet', async () => {
  const { s, reference } = await designee(), avantA = copy(s.data.projets[0]);
  assert.deepEqual(copy(s.ctx.CAMPAGNE.ecartsLocaux('C-test')).map(x => [x.projet.id, x.piste.id, x.declaration]), [['B', 'b', null]]);
  const r = declarer(s, 'B', 'b', 'Le film vise un autre public', 'projet');
  assert.equal(r.ok, true); assert.equal(r.dejaRecu, false);
  const d = s.data.decisions[1];
  assert.deepEqual({ type: d.type, objet: d.objet, projet: d.projet, campagne: d.campagne, verdict: d.verdict, portee: d.portee,
    motif: d.motif, ecart: copy(d.ecart) }, { type: 'ecart-campagne', objet: 'b', projet: 'B', campagne: 'C-test', verdict: 'approuve',
    portee: 'projet', motif: 'Le film vise un autre public', ecart: { de: 'reference-campagne', ref: reference.id } });
  assert.equal(d.acteur.personneId, 'P-recette'); assert.equal(d.qui, 'creation');
  assert.equal(s.data.projets[1].ecartDeCampagne, 'Le film vise un autre public');
  assert.deepEqual(s.data.projets[0], avantA);
  assert.equal(s.ctx.CAMPAGNE.reference('C-test').etat, 'choisie');
  assert.equal(s.saves, 2);
  /* Ce qui est publié porte l'écart et son reçu ensemble. */
  const publiee = s.publications[s.publications.length - 1];
  assert.equal(publiee.projets[1].ecartDeCampagne, 'Le film vise un autre public');
  assert.equal(publiee.decisions[1].id, d.id);
  assert.deepEqual(copy(s.ctx.CAMPAGNE.ecartsLocaux('C-test')).map(x => [x.projet.id, x.declaration && x.declaration.id]), [['B', d.id]]);
});

test('sans référence choisie, ou pour la piste qui la porte, il n’y a pas d’écart à déclarer', async () => {
  const libre = await atelier(), avant = copy(libre.data);
  const r0 = declarer(libre, 'B', 'b', 'Motif', 'projet');
  assert.equal(r0.ok, false); assert.match(r0.erreur, /Aucune référence commune/);
  assert.deepEqual(copy(libre.data), avant);
  const { s } = await designee();
  for (const [campagne, p, pi, motif, attendu] of [['C-test', 'A', 'a', 'Motif', /porte la référence|n'est plus retenue/],
    ['C-test', 'B', 'x', 'Motif', /n'est plus retenue/], ['absente', 'B', 'b', 'Motif', /introuvable/], ['C-test', 'B', 'b', '   ', /Écrivez pourquoi/]]) {
    const figee = copy(s.data), saves = s.saves;
    const r = s.ctx.CAMPAGNE.declarerEcart(campagne, p, pi, motif, 'projet', s.ctx.CAMPAGNE.reference(campagne).revision);
    assert.equal(r.ok, false, p + pi); assert.match(r.erreur, attendu);
    assert.deepEqual(copy(s.data), figee); assert.equal(s.saves, saves);
  }
});

test('une portée absente ou qui ne correspond pas au projet qui s’écarte est refusée sans écriture', async () => {
  const { s } = await designee();
  for (const [portee, attendu] of [[undefined, /déclare sa portée/], ['', /déclare sa portée/], ['campagne', /ne correspond pas à l'objet visé/],
    ['livrable', /ne correspond pas à l'objet visé/], ['document', /Portée inconnue/]]) {
    const figee = copy(s.data), saves = s.saves;
    const r = declarer(s, 'B', 'b', 'Le film vise un autre public', portee);
    assert.equal(r.ok, false, String(portee)); assert.match(r.erreur, attendu);
    assert.deepEqual(copy(s.data), figee); assert.equal(s.saves, saves);
  }
});

test('un rejeu exact retrouve le reçu de l’écart ; un dialogue périmé est refusé', async () => {
  const { s } = await designee(), lu = s.ctx.CAMPAGNE.reference('C-test').revision;
  const r = s.ctx.CAMPAGNE.declarerEcart('C-test', 'B', 'b', 'Autre public', 'projet', lu);
  const rejeu = s.ctx.CAMPAGNE.declarerEcart('C-test', 'B', 'b', 'Autre public', 'projet', lu);
  assert.equal(rejeu.ok, true); assert.equal(rejeu.dejaRecu, true); assert.equal(rejeu.decision.id, r.decision.id);
  assert.equal(s.data.decisions.length, 2); assert.equal(s.saves, 2);
  /* La référence change entre la lecture et la déclaration : relire d'abord. */
  s.data.projets[0].sections.pistes[0].concept = 'Concept amendé';
  const figee = copy(s.data);
  const perime = s.ctx.CAMPAGNE.declarerEcart('C-test', 'B', 'b', 'Un autre motif', 'projet', lu);
  assert.equal(perime.ok, false); assert.deepEqual(copy(s.data), figee);
});
