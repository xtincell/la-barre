import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Le relevé des écarts tel qu'il se comporte aujourd'hui. ECARTS lit ses
 * voisins — conformité KV, péremption du master, retours client, annotations —
 * par leur interface publique : ici on les remplace par ce qu'ils rendent, pour
 * observer ce que le relevé en fait, et seulement cela. */

const copie = value => JSON.parse(JSON.stringify(value));

async function atelier({ projets = [], conformite = {}, perimes = [], retours = {}, annotations = {},
  nomsRetires = [], ecartsEcartes } = {}) {
  let saves = 0;
  const data = { projets, personnes: [{ id: 'PE-1', nom: 'Awa Recette' }] };
  if (ecartsEcartes) data.ecartsEcartes = ecartsEcartes;
  const ctx = vm.createContext({ Date, console,
    MAISON: { nomsRetires, postes: [] },
    DEPOT: { liste: k => data[k] || [], trouve: (k, id) => (data[k] || []).find(x => x.id === id) || null,
      tout: () => data, enregistrer() { saves++; } },
    KV: { tous: p => (p.livrables || []).filter(l => l.kv && !l.annule), conformite: (p, l) => conformite[l.id] || [] },
    REGLES: { maitrePerime: (p, l) => perimes.includes(l.id) },
    FEEDBACK: { ordre: id => retours[id] || [], nomAuteur: a => 'Auteur ' + a },
    ANNOT: { ouvertes: l => annotations[l.id] || [] },
  });
  ctx.window = ctx;
  for (const name of ['outils', 'cloture', 'ecarts']) {
    vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  }
  /* Le relevé est relu comme une copie persistée : les tableaux du contexte vm
   * n'ont pas le prototype de ce fichier, et un écart se lit en données. */
  const E = Object.create(ctx.ECARTS);
  E.tous = projetId => copie(ctx.ECARTS.tous(projetId));
  return { E, data, get saves() { return saves; } };
}

const dossier = (extra = {}) => ({ id: 'P-1', ref: 'REC-001', cree_le: '2026-09-01T08:00:00Z',
  sections: { brief: {}, socle: {}, bigidea: {}, pistes: [] }, livrables: [], ...extra });
const sections = (extra = {}) => ({ brief: {}, socle: {}, bigidea: {}, pistes: [], ...extra });

test('le brief : une conformité non tenue est due par l’exécutant, l’accroche relève de la big idea', async () => {
  const kv = { id: 'L-KV', nom: 'Master KV', kv: { copy: 'Signe' }, responsable: 'PE-1',
    versions: [{ n: 1, close_le: '2026-10-02T09:00:00Z', origine: 'client' }] };
  const s = await atelier({ projets: [dossier({ livrables: [kv] })], conformite: { 'L-KV': [
    { quoi: 'Langue du marché', ok: false, cout: 'la langue ne correspond pas' },
    { quoi: 'SKU distribués ici', ok: true, cout: '' },
    { quoi: 'Accroche ≤ 5 mots', ok: false, cout: 'sept mots' },
  ] } });
  const t = s.E.tous();
  assert.deepEqual(t.map(x => [x.origine, x.quoi]), [['brief', 'Langue du marché'], ['bigidea', 'Accroche ≤ 5 mots']]);
  assert.equal(t[0].cle, 'P-1|L-KV|brief|Langue du marché');
  assert.equal(t[0].livrable.id, 'L-KV'); assert.equal(t[0].responsable, 'PE-1');
  assert.equal(t[0].poste, 'da'); assert.equal(t[0].cout, 'la langue ne correspond pas');
  assert.equal(t[0].ecarte, null);
  assert.equal(t[0].quand, '2026-10-02T09:00:00Z', 'la date du fait : la dernière version du livrable');
});

test('le brief : un périmètre promis sans livrable vivant qui le porte est dû par la création', async () => {
  const livrables = [{ id: 'L-1', nom: 'Affiche 4x3 Douala' }, { id: 'L-2', nom: 'Spot radio 30s', annule: true },
    { id: 'L-3', nom: 'Video teaser 15s' }];
  const s = await atelier({ projets: [dossier({ livrables,
    sections: sections({ brief: { livrables_attendus: 'Affiche 4x3\nSpot radio\n  \nVidéo teaser' } }) })] });
  const t = s.E.tous();
  assert.equal(t.length, 1, 'l’annulé ne couvre pas le promis ; l’accent ne compte pas');
  assert.equal(t[0].origine, 'brief'); assert.equal(t[0].livrable, null); assert.equal(t[0].poste, 'creation');
  assert.equal(t[0].quoi, '« Spot radio » promis au brief, absent du dossier');
  assert.equal(t[0].cle, 'P-1|-|brief|« Spot radio » promis au brief, absent du dossier');
  assert.equal(t[0].quand, '2026-09-01T08:00:00Z', 'sans livrable, la date est celle du dossier');

  const enListe = await atelier({ projets: [dossier({ sections: sections({ brief: { livrables_attendus: ['Kakémono', ''] } }) })] });
  assert.deepEqual(enListe.E.tous().map(x => x.quoi), ['« Kakémono » promis au brief, absent du dossier']);
  const malType = await atelier({ projets: [dossier({ sections: sections({ brief: { livrables_attendus: { a: 1 } } }) })] });
  assert.deepEqual(malType.E.tous(), [], 'un périmètre mal typé ne fait pas tomber le relevé');
});

test('la plateforme : mots interdits, noms retirés et big idea sans socle', async () => {
  const livrables = [
    { id: 'L-1', nom: 'Bannière', kv: { copy: 'Pas CHÈR du tout' } },
    { id: 'L-2', nom: 'Reprise ancien nom' },
    { id: 'L-3', nom: 'Cher annulé', annule: true },
    { id: 'L-4' },
  ];
  const s = await atelier({ nomsRetires: ['Ancien Nom'], projets: [dossier({ livrables,
    sections: sections({ socle: { jamais: ['cher'] }, bigidea: { idee: 'Une idée' } }) })] });
  const t = s.E.tous();
  assert.deepEqual(t.map(x => [x.livrable && x.livrable.id, x.quoi, x.poste]), [
    ['L-1', '« cher » — la marque ne le dit jamais', 'redacteur'],
    ['L-2', '« Ancien Nom » est un nom retiré', 'redacteur'],
    [null, 'Big idea ouverte sans plateforme de marque active', 'creation'],
  ]);
  assert.ok(t.every(x => x.origine === 'plateforme'));

  const avecSocle = await atelier({ projets: [dossier({
    sections: sections({ socle: { idee_directrice: 'Le socle' }, bigidea: { idee: 'Une idée' } }) })] });
  assert.deepEqual(avecSocle.E.tous(), []);
});

test('la big idea : sans critère écrit rien n’est opposable, avec eux pistes et masters dépassés le sont', async () => {
  const pistes = [{ id: 'PI-1', titre: 'Piste A', statut: 'proposee' },
    { id: 'PI-2', titre: 'Piste B', statut: 'ecartee' },
    { id: 'PI-3', titre: 'Piste C', statut: 'retenue', sacrifice: 's', argument: 'a' },
    { id: 'PI-4', statut: 'proposee', sacrifice: 's' }];
  const livrables = [{ id: 'L-1', nom: 'Format' }, { id: 'L-2', nom: 'Format annulé', annule: true }];
  const sansCritere = await atelier({ perimes: ['L-1', 'L-2'],
    projets: [dossier({ livrables, sections: sections({ pistes, socle: {}, bigidea: {} }) })] });
  assert.deepEqual(sansCritere.E.tous(), []);

  const s = await atelier({ perimes: ['L-1', 'L-2'], projets: [dossier({ livrables,
    sections: sections({ pistes, bigidea: { criteres: ['Lisible à 30 m'] } }) })] });
  const t = s.E.tous();
  assert.deepEqual(t.map(x => [x.origine, x.livrable && x.livrable.id, x.quoi]), [
    ['bigidea', null, '« Piste A » sans sacrifice écrit'],
    ['bigidea', null, '« Piste A » sans argument écrit'],
    ['bigidea', null, '« piste » sans argument écrit'],
    ['bigidea', 'L-1', 'Faite sur une version dépassée du master'],
  ]);
  assert.ok(t.every(x => x.poste === 'da'));
});

test('le donneur : un retour client fait une ligne, pas une par livrable touché', async () => {
  const l1 = { id: 'L-1', nom: 'KV', responsable: 'PE-1' }, l2 = { id: 'L-2', nom: 'Affiche' };
  const long = 'Changer le fond pour quelque chose de plus chaleureux, et revoir toute la hiérarchie du texte '
    + 'avant la diffusion de lundi prochain.';
  const s = await atelier({ projets: [dossier({ livrables: [l1, l2] })], retours: { 'P-1': [
    { f: { id: 'FB-2', texte: 'Court', auteur: 'B', quand: '2026-10-05T10:00:00Z' },
      impact: { pieces: [], assets: 1, jours: 1, enProduction: 0 }, niveau: { rang: 2 }, attend: [], pret: true },
    { f: { id: 'FB-1', texte: long, auteur: 'A', quand: '2026-10-03T10:00:00Z' },
      impact: { pieces: [l1, l2], assets: 2, jours: 3, enProduction: 1 }, niveau: { rang: 0 }, attend: [], pret: true },
  ] } });
  const t = s.E.tous();
  assert.equal(t.length, 2);
  assert.deepEqual(t.map(x => x.cle), ['P-1|fb|FB-1', 'P-1|fb|FB-2'], 'le niveau ordonne : le KV avant le format');
  assert.ok(t.every(x => x.origine === 'donneur'));
  assert.equal(t[0].quoi, long.slice(0, 110) + '…');
  assert.equal(t[0].livrable.id, 'L-1'); assert.equal(t[0].responsable, 'PE-1');
  assert.match(t[0].cout, /Auteur A/); assert.match(t[0].cout, /2 livrables, 3 j/); assert.match(t[0].cout, /1 déjà en production/);
  assert.equal(t[0].quand, '2026-10-03T10:00:00Z', 'la date du retour, pas celle du dossier');
  assert.equal(t[1].quoi, 'Court'); assert.equal(t[1].livrable, null);
  assert.match(t[1].cout, /1 livrable, 1 j/); assert.doesNotMatch(t[1].cout, /déjà en production/);
});

test('l’agence : une annotation ouverte est due par nous, sauf après validation où elle devient une reprise', async () => {
  const livrables = [{ id: 'L-1', nom: 'KV' }, { id: 'L-2', nom: 'Annulé', annule: true }];
  const long = 'Resserrer le cadrage du produit pour que la marque se lise avant le personnage, côté gauche du visuel.';
  const s = await atelier({ projets: [dossier({ livrables })], annotations: {
    'L-1': [{ texte: 'Recadrer', auteur: 'PE-1', quand: '2026-10-04T10:00:00Z' },
      { texte: long, quand: '2026-10-06T10:00:00Z', reprise: true }],
    'L-2': [{ texte: 'Jamais lue', quand: '2026-10-04T10:00:00Z' }],
  } });
  const t = s.E.tous();
  assert.deepEqual(t.map(x => x.origine), ['agence', 'donneur'], 'l’agence passe avant le donneur');
  assert.equal(t[0].quoi, 'Recadrer'); assert.match(t[0].cout, /^Awa Recette · /);
  assert.equal(t[1].quoi, long.slice(0, 90) + '…');
  assert.match(t[1].cout, /^client · /); assert.match(t[1].cout, /après validation : c'est une reprise/);
  assert.ok(t.every(x => x.livrable.id === 'L-1' && x.poste === 'da'));
});

test('l’ordre des origines, les dossiers clos et les comptes', async () => {
  const ouvert = dossier({ livrables: [{ id: 'L-1', nom: 'KV', kv: {} }],
    sections: sections({ brief: { livrables_attendus: ['Kakémono'] }, socle: { jamais: ['kv'] } }) });
  const clos = dossier({ id: 'P-clos', cloture: { le: '2026-09-30' },
    sections: sections({ brief: { livrables_attendus: ['Affiche'] } }) });
  const s = await atelier({ projets: [ouvert, clos], annotations: { 'L-1': [{ texte: 'Recadrer', quand: '2026-10-04' }] } });
  assert.deepEqual(s.E.tous().map(x => x.origine), ['brief', 'plateforme', 'agence']);
  assert.ok(s.E.tous().every(x => x.projet.id === 'P-1'), 'un dossier clos ne doit plus rien à personne');
  assert.deepEqual(s.E.tous('P-clos').map(x => x.quoi), ['« Affiche » promis au brief, absent du dossier'],
    'ouvert seul, le dossier clos montre toujours ses écarts');
  assert.deepEqual(copie(s.E.compte()), { brief: 1, plateforme: 1, agence: 1 });
  assert.equal(s.E.total(), 3); assert.equal(s.E.total('P-clos'), 1);
});

test('un écart écarté sort des comptes avec son motif, et repris il y revient', async () => {
  const projets = [dossier({ sections: sections({ brief: { livrables_attendus: ['Kakémono', 'Affiche'] } }) })];
  const s = await atelier({ projets });
  const cle = 'P-1|-|brief|« Kakémono » promis au brief, absent du dossier';
  assert.equal(s.E.total(), 2);

  s.E.ecarterUn(cle, 'Retiré du périmètre par avenant');
  assert.equal(s.saves, 1);
  assert.equal(s.data.ecartsEcartes[cle].motif, 'Retiré du périmètre par avenant');
  assert.ok(!Number.isNaN(Date.parse(s.data.ecartsEcartes[cle].quand)));
  const ecarte = s.E.tous().find(x => x.cle === cle);
  assert.equal(ecarte.ecarte.motif, 'Retiré du périmètre par avenant', 'il reste au relevé, marqué');
  assert.equal(s.E.total(), 1); assert.deepEqual(copie(s.E.compte()), { brief: 1 });

  const relu = await atelier({ projets: copie(projets), ecartsEcartes: copie(s.data.ecartsEcartes) });
  assert.equal(relu.E.total(), 1, 'l’écart écarté survit à la sauvegarde');

  s.E.reprendre(cle);
  assert.equal(s.saves, 2);
  assert.equal(cle in s.data.ecartsEcartes, false);
  assert.equal(s.E.tous().find(x => x.cle === cle).ecarte, null);
  assert.equal(s.E.total(), 2);

  const vierge = await atelier({ projets: copie(projets) });
  vierge.E.reprendre(cle);
  assert.equal(vierge.saves, 1); assert.equal(vierge.data.ecartsEcartes, undefined);
});

test('les origines déclarées et la date d’un écart calculé', async () => {
  const s = await atelier();
  assert.equal(s.E.def('inconnue'), s.E.ORIGINES.agence);
  assert.deepEqual(Object.keys(s.E.ORIGINES).sort((a, b) => s.E.ORIGINES[a].rang - s.E.ORIGINES[b].rang),
    ['brief', 'plateforme', 'bigidea', 'agence', 'donneur']);
  assert.deepEqual(Object.keys(s.E.ORIGINES).filter(k => s.E.ORIGINES[k].facturable), ['donneur']);

  const q = s.E.depuisQuand;
  assert.equal(q({ feedback: { quand: 'F' }, annotation: { quand: 'A' }, projet: { cree_le: 'P' } }), 'F');
  assert.equal(q({ annotation: { quand: 'A' }, projet: { cree_le: 'P' } }), 'A');
  assert.equal(q({ livrable: { versions: [{ close_le: 'C1' }, { ouvert_le: 'O2' }] }, projet: { cree_le: 'P' } }), 'O2');
  assert.equal(q({ livrable: { versions: [{ soumis_le: 'S1' }] }, projet: { cree_le: 'P' } }), 'P');
  assert.equal(q({}), null);
});

test('un écart porte la liste des types de la méthode que son contrôle vérifie', async () => {
  const kv = { id: 'L-KV', nom: 'KV · GH', kv: { copy: 'Signe' } };
  const s = await atelier({ projets: [dossier({ livrables: [kv],
    sections: sections({ brief: { livrables_attendus: ['Kakémono'] } }) })], conformite: { 'L-KV': [
    { quoi: 'Langue du marché', ok: false, cout: 'le KV est en français', types: ['langue'] },
    { quoi: 'SKU distribués ici', ok: false, cout: 'Pack B', types: ['produit'] },
    { quoi: 'Accroche ≤ 5 mots', ok: false, cout: 'sept mots' },
  ] } });
  const t = s.E.tous();
  assert.deepEqual(t.map(x => [x.quoi, x.types]), [
    ['Langue du marché', ['langue']],
    ['SKU distribués ici', ['produit']],
    ['« Kakémono » promis au brief, absent du dossier', []],
    ['Accroche ≤ 5 mots', []],
  ], 'l’origine dit qui paie, le type ce qui change : les deux axes se croisent');
  assert.deepEqual(copie(s.E.compteParType()), { langue: 1, produit: 1 });
  s.E.ecarterUn('P-1|L-KV|brief|SKU distribués ici', 'Distribution confirmée');
  assert.deepEqual(copie(s.E.compteParType()), { langue: 1 }, 'un écart écarté ne compte plus');
});
