import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const copy = value => JSON.parse(JSON.stringify(value));
const piece = (id, versions = [], extra = {}) => ({ id, remise: '2026-10-05', versions, ...extra });
const resultat = extra => ({ quoi: 'Portée', valeur: '0', source: 'Comptage de recette', niveau: 'maison', date: '2026-10-05', ...extra });
async function atelier(livrables = []) {
  let saves = 0;
  const data = { projets: [{ id: 'P-recette', ref: 'REC-001', nom: 'Projet de recette', cree_le: '2026-10-01',
    sections: { brief: {}, pistes: [], identite: { client: 'Client de recette', marqueIds: ['M-recette'] } }, livrables }], decisions: [], journal: [] };
  const ctx = vm.createContext({ Date, console,
    O: { el() {}, jour: () => '2026-10-08', joli: String, poste: () => ({ nom: 'Poste de recette' }) },
    MAISON: { titulaire: 'creation' }, VALIDATION: { valide: o => o.validation?.verdict === 'approuve' },
    CLOTURE: { est: p => !!p.cloture },
    DEPOT: { liste: k => data[k] || [], trouve: () => null, journal: () => data.journal,
      tracer(...args) { data.journal.push(args); }, enregistrer() { saves++; } },
  });
  ctx.window = ctx;
  for (const name of ['version', 'efficacite', 'bilan', 'boucles', 'vie-marque']) {
    vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  }
  const fenetre = ctx.BILAN.fenetre('mois', '2026-10-08T23:59:59Z');
  return { ctx, data, fenetre, get saves() { return saves; }, chiffres: () => ctx.BILAN.chiffres(fenetre) };
}

test('neuf historiques absents ne diluent pas une reprise observée', async () => {
  const s = await atelier(Array.from({ length: 10 }, (_, i) => piece('L-' + i, i ? [] : [{ origine: 'client' }])));
  const n = s.chiffres();
  assert.equal(n.reprise, 100); assert.equal(n.avecVersions, 1); assert.equal(n.pieces, 10);
  const m = s.ctx.BILAN.indicateurs(n).find(x => x.nom === 'livrables repris');
  assert.match(m.quoi, /1.*historique/); assert.match(m.quoi, /9.*sans historique/);
  assert.equal(n.parCompte['Client de recette'].n, 1);
  assert.equal(n.parCompte['Client de recette'].sansHistorique, 9);
});

test('un historique connu sans retour payant est un zéro observé, un historique inconnu reste absent', async () => {
  const s = await atelier([piece('L-a', [{ origine: 'initiale' }]), piece('L-b', [{ origine: 'inconnue' }]), piece('L-c')]);
  const n = s.chiffres();
  assert.equal(n.reprise, 0); assert.equal(n.avecVersions, 1);
  s.data.projets[0].livrables.shift();
  assert.equal(s.chiffres().reprise, null);
});

test('dépassements et taux relisent la même cohorte remise sur la période', async () => {
  const h = [{ origine: 'client' }, { origine: 'client' }];
  const s = await atelier([piece('L-ancien', h, { remise: '2025-01-01', toursVendus: 1, estime: 2 }),
    piece('L-courant', h, { toursVendus: 1, estime: 2 }), piece('L-annule', h, { annule: true, toursVendus: 1 })]);
  const n = s.chiffres();
  assert.equal(n.pieces, 1); assert.equal(n.depassements, 1); assert.equal(n.joursDepasses, 1);
  assert.equal(s.ctx.BILAN.chiffres(null).depassements, 2);
});

test('pas de jours inventés sans estimé ; le document qualifie la formule comme estimation', async () => {
  const h = [{ origine: 'client' }, { origine: 'client' }];
  const s = await atelier([piece('L-sans', h, { toursVendus: 1 }), piece('L-avec', h, { toursVendus: 1, estime: 2 })]);
  const n = s.chiffres();
  assert.equal(n.depassements, 2); assert.equal(n.joursDepasses, 1); assert.equal(n.depassementsSansEstime, 1);
  const b = s.ctx.BILAN.compiler('mois').blocs.find(x => x.t === 'Ce que le périmètre a coûté');
  assert.match(JSON.stringify(b), /estimation|estimée/i); assert.match(JSON.stringify(b), /1.*sans estimé/);
  assert.doesNotMatch(JSON.stringify(b), /Jours absorbés/);
  const texte = s.ctx.BILAN.texte(s.ctx.BILAN.compiler('mois'));
  assert.match(texte, /0,5/); assert.match(texte, /pas un temps mesuré/);
});

test('sans historique ni tours vendus, aucun bilan vert de non-dépassement', async () => {
  const s = await atelier([piece('L-vide')]);
  const b = s.ctx.BILAN.compiler('mois').blocs.find(x => x.t === 'Ce que le périmètre a coûté');
  assert.notEqual(b.videBon, true); assert.match(JSON.stringify(b), /non observ|pas.*conclure/i);
});

test('un résultat sans valeur reste une note visible, jamais une mesure verte', async () => {
  const s = await atelier(), p = s.data.projets[0];
  p.resultat = [resultat({ valeur: '', niveau: null })];
  const e = s.ctx.BOUCLES.etatResultat(p);
  assert.equal(e.ton, 'attente'); assert.equal(s.ctx.BOUCLES.resultats(p).length, 1);
  assert.equal(s.ctx.BOUCLES.resultatsQualifies(p).length, 0);
  const a = s.ctx.VIE_MARQUE.actes('M-recette').find(x => x.genre === 'resultat-note');
  assert.ok(a); assert.match(a.quoi, /qualifier/);
});

test('valeur zéro et preuve déclarative reconnue restent recevables comme données renseignées', async () => {
  const s = await atelier(), p = s.data.projets[0];
  p.resultat = [resultat({ valeur: 0, niveau: 'declaratif' })];
  assert.equal(s.ctx.BOUCLES.resultatsQualifies(p).length, 1);
  assert.equal(s.ctx.BOUCLES.etatResultat(p).ton, 'vert');
  assert.match(s.ctx.BOUCLES.etatResultat(p).quoi, /déclaratif/i);
});

test('source vide, niveau inconnu, date absente ou invalide et métrique vide ne qualifient rien', async () => {
  const s = await atelier(), p = s.data.projets[0];
  for (const extra of [{ source: '  ' }, { niveau: 'inventé' }, { date: '' }, { date: '2026-02-30' }, { quoi: ' ' }]) {
    p.resultat = [resultat(extra)];
    assert.equal(s.ctx.BOUCLES.resultatsQualifies(p).length, 0, JSON.stringify(extra));
    assert.equal(s.ctx.BOUCLES.etatResultat(p).ton, 'attente');
  }
});

test('une meilleure preuve incomplète ne remplace pas la qualification d’une preuve complète', async () => {
  const s = await atelier(), p = s.data.projets[0];
  p.resultat = [resultat({ valeur: '', niveau: 'maison' }), resultat({ niveau: 'declaratif' })];
  const e = s.ctx.BOUCLES.etatResultat(p);
  assert.equal(e.ton, 'attente'); assert.match(e.quoi, /déclaratif/i);
  assert.doesNotMatch(e.quoi, /primaires maison/i);
});

test('poser une note partielle conserve la donnée sans fabriquer de preuve et survit à une copie persistée', async () => {
  const s = await atelier(), p = s.data.projets[0];
  const q = s.ctx.BOUCLES.poser(p, resultat({ valeur: '', niveau: null }));
  assert.equal(q.complet, false); assert.equal(s.saves, 1); assert.equal(p.resultat.length, 1);
  const reload = await atelier(); reload.data.projets[0].resultat = copy(p.resultat);
  assert.equal(reload.ctx.BOUCLES.etatResultat(reload.data.projets[0]).ton, 'attente');
  assert.equal(reload.ctx.BOUCLES.resultatsQualifies(reload.data.projets[0]).length, 0);
});

test('le dépassement sans couverture reste inconnu dans l’export, avec son assise', async () => {
  const s = await atelier([piece('L-vide')]);
  const texte = s.ctx.BILAN.texte(s.ctx.BILAN.compiler('mois'));
  assert.match(texte, /Dépassement non observé/); assert.match(texte, /Assise/);
});

test('un timestamp daté avec fuseau reste qualifiable ; aucune origine ou vente non finie ne fabrique de zéro', async () => {
  const s = await atelier([piece('L-proto', [{ origine: '__proto__' }]),
    piece('L-infini', [{ origine: 'initiale' }], { toursVendus: 'Infinity' })]);
  assert.equal(s.chiffres().avecVersions, 1); assert.equal(s.chiffres().avecToursVendus, 0);
  assert.equal(s.ctx.BOUCLES.qualifierResultat(resultat({ date: '2026-10-05T23:30:00-03:00' })).complet, true);
});
