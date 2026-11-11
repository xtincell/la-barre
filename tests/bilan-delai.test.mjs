import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Le délai de verdict se lit entre la soumission d'une version et le verdict
 * rendu sur elle. Ces tests posent les données comme les gestes du poste les
 * écrivent : la version porte `soumis_le` puis `verdict`/`juge_le`, et la
 * décision du journal ne porte que `quand` (la date du verdict). */

const MAINTENANT = Date.parse('2026-10-08T12:00:00Z');
class Horloge extends Date {
  constructor(...args) { super(...(args.length ? args : [MAINTENANT])); }
  static now() { return MAINTENANT; }
}
const copie = value => JSON.parse(JSON.stringify(value));
const jours = n => new Date(MAINTENANT - n * 86400000).toISOString();

const soumise = (n, soumis_le) => ({ n, soumis_le, verdict: null });
const jugee = (n, soumis_le, juge_le, verdict = 'approuve') => ({ n, soumis_le, verdict, motif: '', juge_le });
const livrable = (id, versions, extra = {}) => ({ id, nom: 'Livrable ' + id, remise: '2026-10-05', versions, ...extra });
/* La décision telle que vue-livrable.js et vue-revue.js l'écrivent. */
const decision = (objet, quand, extra = {}) => ({ objet, type: 'livrable', projet: 'P-recette',
  verdict: 'approuve', motif: '', quand, qui: 'creation', titre: 'Livrable ' + objet, ...extra });

async function atelier({ projets = [], decisions = [] } = {}) {
  const data = copie({ projets, decisions, journal: [] });
  const ctx = vm.createContext({ Date: Horloge, console,
    MAISON: { titulaire: 'creation', postes: [{ cle: 'creation', nom: 'Direction de la création' }] },
    VALIDATION: { valide: o => o.validation?.verdict === 'approuve' },
    DEPOT: { liste: k => data[k] || [], trouve: () => null, tracer() {}, enregistrer() {} },
  });
  ctx.window = ctx;
  for (const name of ['outils', 'cloture', 'version', 'bilan']) {
    vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  }
  const fenetre = ctx.BILAN.fenetre('mois', '2026-10-08T23:59:59Z');
  const indicateur = s => ctx.BILAN.indicateurs(s).find(m => m.nom === 'mon délai de verdict');
  return { ctx, data, fenetre, indicateur, mois: () => ctx.BILAN.chiffres(fenetre) };
}
const projet = (livrables, extra = {}) => ({ id: 'P-recette', ref: 'REC-001', nom: 'Projet de recette',
  cree_le: '2026-09-01', sections: { brief: {}, pistes: [], identite: { client: 'Client de recette' } }, livrables, ...extra });

test('une version soumise puis jugée donne mon délai de verdict, sans champ inventé sur la décision', async () => {
  const s = await atelier({
    projets: [projet([livrable('L-1', [
      jugee(1, '2026-10-01T09:00:00Z', '2026-10-04T09:00:00Z', 'retour'),
      jugee(2, '2026-10-05T09:00:00Z', '2026-10-06T09:00:00Z'),
    ])])],
    decisions: [decision('L-1', '2026-10-04T09:00:00Z', { verdict: 'retour' }), decision('L-1', '2026-10-06T09:00:00Z')],
  });
  const n = s.mois();
  assert.equal(n.verdict, 2, 'moyenne de 3 j et 1 j');
  assert.equal(n.decisions, 2);
  const m = s.indicateur(n);
  assert.equal(m.valeur, '2 j'); assert.equal(m.assise, 2); assert.equal(m.ton, 'vert');
  const texte = s.ctx.BILAN.texte(s.ctx.BILAN.compiler('mois'));
  assert.match(texte, /2 j {2}mon délai de verdict/);
  assert.doesNotMatch(texte, /aucun verdict daté/);
});

test('le verdict compte dans la période où il est rendu, et nourrit la comparaison', async () => {
  const s = await atelier({ projets: [projet([
    livrable('L-avant', [jugee(1, '2026-08-25T09:00:00Z', '2026-08-30T09:00:00Z')]),
    livrable('L-mois', [jugee(1, '2026-10-02T09:00:00Z', '2026-10-03T09:00:00Z')]),
  ])] });
  assert.equal(s.mois().verdict, 1);
  assert.equal(s.mois().decisions, 1);
  assert.equal(s.ctx.BILAN.chiffres(s.fenetre.precedente).verdict, 5);
  const m = s.ctx.BILAN.compiler('mois').blocs[0].mesures.find(x => x.nom === 'mon délai de verdict');
  assert.equal(m.valeur, '1 j');
  assert.equal(m.evol.sens, 'mieux'); assert.match(m.evol.texte, /^-4 /);
});

test('sans date de soumission lisible, le délai reste inconnu et le bilan le dit', async () => {
  /* Une version archivée par VERSION.ouvrir porte `close_le`, pas `soumis_le` :
   * jugée, elle ne fournit aucune date de soumission. On ne la devine pas. */
  const s = await atelier({ projets: [projet([
    livrable('L-ouverte', [{ n: 1, close_le: '2026-10-02T09:00:00Z', origine: 'client', motif: 'Retour',
      verdict: 'approuve', juge_le: '2026-10-05T09:00:00Z' }]),
    livrable('L-illisible', [jugee(1, 'pas une date', '2026-10-06T09:00:00Z')]),
  ])], decisions: [decision('L-ouverte', '2026-10-05T09:00:00Z'), decision('L-illisible', '2026-10-06T09:00:00Z')] });
  const n = s.mois();
  assert.equal(n.verdict, null);
  assert.equal(n.decisions, 0);
  assert.equal(n.verdictsSansDelai, 2);
  const m = s.indicateur(n);
  assert.equal(m.assise, 0); assert.equal(m.valeur, '?');
  assert.match(m.sansQuoi, /2 verdicts/); assert.match(m.sansQuoi, /date de soumission/); assert.match(m.sansQuoi, /inconnu/);
  const texte = s.ctx.BILAN.texte(s.ctx.BILAN.compiler('mois'));
  assert.match(texte, /— {2}mon délai de verdict/);
  assert.match(texte, /2 verdicts rendus sans date de soumission/);
});

test('un délai connu reste lu, et les verdicts sans soumission sont nommés à côté', async () => {
  const s = await atelier({ projets: [projet([
    livrable('L-1', [jugee(1, '2026-10-01T09:00:00Z', '2026-10-05T09:00:00Z')]),
    livrable('L-2', [{ n: 1, verdict: 'approuve', juge_le: '2026-10-06T09:00:00Z' }]),
  ])] });
  const n = s.mois();
  assert.equal(n.verdict, 4); assert.equal(n.decisions, 1); assert.equal(n.verdictsSansDelai, 1);
  const m = s.indicateur(n);
  assert.equal(m.ton, 'alerte'); assert.match(m.quoi, /au-delà de ma cible/);
  assert.match(m.quoi, /1 verdict sans date de soumission/);
});

test('une décision qui ne juge pas une version soumise ne fabrique aucun délai', async () => {
  const s = await atelier({ projets: [projet([livrable('L-1', [])])], decisions: [
    { objet: 'brief', type: 'brief', projet: 'P-recette', verdict: 'approuve', quand: '2026-10-05T09:00:00Z' },
    { id: 'DEC-1', type: 'reference-campagne', objet: 'PI-1', projet: 'P-recette', verdict: 'approuve',
      portee: 'campagne', quand: '2026-10-06T09:00:00Z' },
    decision('L-1', '2026-10-07T09:00:00Z'),
  ] });
  const n = s.mois();
  assert.equal(n.verdict, null); assert.equal(n.decisions, 0); assert.equal(n.verdictsSansDelai, 0);
  assert.match(s.indicateur(n).sansQuoi, /aucun verdict daté/);
});

test('mon standard compte l’attente depuis la soumission, ni depuis une version close ni sur un dossier clos', async () => {
  const s = await atelier({ projets: [
    projet([
      livrable('L-attend', [soumise(1, jours(3))]),
      /* Une version close par VERSION.ouvrir n'est pas une soumission. */
      livrable('L-reprise', [{ n: 1, close_le: jours(10), origine: 'client', motif: 'Retour client' }]),
      livrable('L-annule', [soumise(1, jours(15))], { annule: true }),
    ]),
    projet([livrable('L-clos', [soumise(1, jours(20))])], { id: 'P-clos', cloture: { le: '2026-09-30' } }),
  ] });
  const standard = s.ctx.BILAN.chiffres(null);
  assert.equal(standard.verdict, 3);
  assert.equal(standard.decisions, 0, 'une attente n’est pas un verdict rendu');
  assert.equal(s.mois().verdict, null, 'la fin de mois ne compte que les verdicts rendus');
});

test('un dépôt relu après sauvegarde donne le même délai', async () => {
  const projets = [projet([livrable('L-1', [jugee(1, '2026-10-03T09:00:00Z', '2026-10-05T21:00:00Z')])])];
  const premier = await atelier({ projets });
  const relu = await atelier({ projets: copie(premier.data.projets) });
  assert.equal(premier.mois().verdict, 3);
  assert.equal(relu.mois().verdict, 3);
});
