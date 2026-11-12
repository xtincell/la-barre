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
  nomsRetires = [], ecartsEcartes, decisions = [] } = {}) {
  let saves = 0;
  const data = { projets, personnes: [{ id: 'PE-1', nom: 'Awa Recette' }], decisions: copie(decisions), journal: [] };
  if (ecartsEcartes) data.ecartsEcartes = ecartsEcartes;
  /* Écarter et reprendre passent par la vraie fabrique (decision.js) : le
   * dépôt simulé tient ce qu'elle lui demande, ajouter, tracer, enregistrer. */
  const ctx = vm.createContext({ Date, console,
    MAISON: { nomsRetires, postes: [], titulaire: 'creation' },
    DEPOT: { liste: k => data[k] || [], trouve: (k, id) => (data[k] || []).find(x => x.id === id) || null,
      tout: () => data, enregistrer() { saves++; },
      ajoute(k, o) { (data[k] ||= []).push(o); o.cree_le = o.cree_le || new Date().toISOString();
        data.journal.push({ action: 'création', type: k, id: o.id }); saves++; return o; },
      tracer(action, type, id, detail) { data.journal.push({ action, type, id, detail }); } },
    KV: { tous: p => (p.livrables || []).filter(l => l.kv && !l.annule), conformite: (p, l) => conformite[l.id] || [] },
    REGLES: { maitrePerime: (p, l) => perimes.includes(l.id) },
    FEEDBACK: { ordre: id => retours[id] || [], nomAuteur: a => 'Auteur ' + a },
    ANNOT: { ouvertes: l => annotations[l.id] || [] },
  });
  ctx.window = ctx;
  for (const name of ['outils', 'cloture', 'decision', 'ecarts']) {
    vm.runInContext(await readFile(new URL('../app/' + name + '.js', import.meta.url), 'utf8'), ctx);
  }
  /* Le relevé est relu comme une copie persistée : les tableaux du contexte vm
   * n'ont pas le prototype de ce fichier, et un écart se lit en données. */
  const E = Object.create(ctx.ECARTS);
  E.tous = projetId => copie(ctx.ECARTS.tous(projetId));
  E.ecarterUn = (cle, motif) => copie(ctx.ECARTS.ecarterUn(cle, motif));
  E.reprendre = (cle, motif) => copie(ctx.ECARTS.reprendre(cle, motif));
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

/* ————— « Ce n'en est pas un » : écarter un écart, et le reprendre —————
 *
 * Les deux gestes passent par la fabrique (decision.js), dans le type que la
 * jurisprudence range déjà : `ecart`. Écarter est un verdict « hors » motivé ;
 * reprendre rouvre l'écart, d'une décision qui remplace l'écartement. */

const KAKEMONO = 'P-1|-|brief|« Kakémono » promis au brief, absent du dossier';
const promis = () => [dossier({ sections: sections({ brief: { livrables_attendus: ['Kakémono', 'Affiche'] } }) })];

test('écarter un écart passe par la fabrique, motif exigé ; il reste au relevé, marqué, hors des comptes', async () => {
  const projets = promis();
  const s = await atelier({ projets });
  assert.equal(s.E.total(), 2);

  for (const motif of [undefined, null, '', '   ']) {
    const r = s.E.ecarterUn(KAKEMONO, motif);
    assert.equal(r.ok, false, String(motif));
    assert.match(r.erreur, /exige un motif/);
  }
  assert.equal(s.saves, 0); assert.equal(s.data.ecartsEcartes, undefined); assert.deepEqual(s.data.decisions, []);

  const r = s.E.ecarterUn(KAKEMONO, '  Retiré du périmètre par avenant  ');
  assert.equal(r.ok, true);
  assert.equal(s.data.decisions.length, 1);
  const d = copie(s.data.decisions[0]);
  assert.deepEqual(r.decision, d);
  assert.deepEqual([d.type, d.objet, d.projet, d.verdict, d.motif, d.titre, d.origine, d.livrable],
    ['ecart', KAKEMONO, 'P-1', 'hors', 'Retiré du périmètre par avenant',
      '« Kakémono » promis au brief, absent du dossier', 'brief', null]);
  assert.equal(d.qui, 'creation');
  assert.ok(typeof d.id === 'string' && d.id.startsWith('DEC'));
  assert.equal('ecart' in d, false, 'écarter un écart du relevé n’est pas une déviation : rien n’est déclaré');
  assert.deepEqual(copie(s.data.ecartsEcartes[KAKEMONO]), { motif: d.motif, quand: d.quand, decision: d.id });
  assert.ok(s.saves >= 1, 'la base est sauvegardée');
  assert.ok(s.data.journal.some(e => e.type === 'decisions' && e.id === d.id), 'la décision entre au journal');
  assert.ok(s.data.journal.some(e => e.type === 'projets' && e.id === 'P-1' && /écarté/.test(e.action)),
    'le dossier garde la trace du geste');

  const ecarte = s.E.tous().find(x => x.cle === KAKEMONO);
  assert.equal(ecarte.ecarte.motif, 'Retiré du périmètre par avenant', 'il reste au relevé, marqué');
  assert.equal(ecarte.ecarte.decision, d.id);
  assert.equal(s.E.total(), 1); assert.deepEqual(copie(s.E.compte()), { brief: 1 });

  /* Déjà écarté, ou absent du relevé : rien n'est écrit. */
  const saves = s.saves;
  assert.match(s.E.ecarterUn(KAKEMONO, 'Une seconde fois').erreur, /déjà écarté/);
  assert.equal(s.E.ecarterUn('P-1|-|brief|Un écart inventé', 'Un motif').ok, false);
  assert.equal(s.E.ecarterUn('P-absent|-|brief|x', 'Un motif').ok, false);
  assert.equal(s.data.decisions.length, 1); assert.equal(s.saves, saves);

  const relu = await atelier({ projets: copie(projets), ecartsEcartes: copie(s.data.ecartsEcartes),
    decisions: copie(s.data.decisions) });
  assert.equal(relu.E.total(), 1, 'l’écart écarté survit à la sauvegarde');
});

test('reprendre un écart écarté passe par la fabrique et le rouvre ; la reprise remplace l’écartement', async () => {
  const projets = promis();
  const s = await atelier({ projets });
  s.E.ecarterUn(KAKEMONO, 'Retiré du périmètre par avenant');
  const ecartement = copie(s.data.decisions[0]);

  const r = s.E.reprendre(KAKEMONO);
  assert.equal(r.ok, true);
  assert.equal(s.data.decisions.length, 2, 'l’écartement reste au registre : la reprise ne l’efface pas');
  const d = copie(s.data.decisions[1]);
  assert.deepEqual(r.decision, d);
  assert.deepEqual([d.type, d.objet, d.projet, d.verdict, d.motif, d.remplace, d.origine, d.titre],
    ['ecart', KAKEMONO, 'P-1', 'approuve', null, ecartement.id, 'brief', ecartement.titre]);
  assert.equal('ecart' in d, false);
  assert.equal(KAKEMONO in s.data.ecartsEcartes, false);
  assert.equal(s.E.tous().find(x => x.cle === KAKEMONO).ecarte, null);
  assert.equal(s.E.total(), 2); assert.deepEqual(copie(s.E.compte()), { brief: 2 });
  assert.ok(s.data.journal.some(e => e.type === 'projets' && e.id === 'P-1' && /repris/.test(e.action)));

  /* Le motif d'une reprise est facultatif ; écrit, il est gardé. */
  assert.equal(s.E.ecarterUn(KAKEMONO, 'Encore hors avenant').ok, true);
  assert.equal(s.E.reprendre(KAKEMONO, '  Le client réintègre le kakémono ').ok, true);
  const motivee = copie(s.data.decisions[3]);
  assert.deepEqual([motivee.verdict, motivee.motif, motivee.remplace],
    ['approuve', 'Le client réintègre le kakémono', s.data.decisions[2].id]);

  /* Ce qui n'est pas écarté ne se reprend pas : rien n'est écrit. */
  const saves = s.saves;
  assert.match(s.E.reprendre(KAKEMONO).erreur, /n'est pas écarté/);
  assert.equal(s.data.decisions.length, 4); assert.equal(s.saves, saves);

  const vierge = await atelier({ projets: copie(projets) });
  assert.equal(vierge.E.reprendre(KAKEMONO).ok, false);
  assert.equal(vierge.saves, 0); assert.equal(vierge.data.ecartsEcartes, undefined);
  assert.deepEqual(vierge.data.decisions, []);
});

test('un écart écarté avant la fabrique reste écarté, et se reprend par elle', async () => {
  const s = await atelier({ projets: promis(),
    ecartsEcartes: { [KAKEMONO]: { motif: 'Retiré à la main', quand: '2026-10-01T08:00:00.000Z' } } });
  assert.equal(s.E.total(), 1, 'l’écartement ancien, sans décision, est lu tel quel');
  assert.equal(s.E.reprendre(KAKEMONO).ok, true);
  const d = copie(s.data.decisions[0]);
  assert.deepEqual([d.type, d.verdict, d.remplace], ['ecart', 'approuve', null],
    'aucune décision à remplacer : la reprise ne s’en invente pas une');
  assert.equal(s.E.total(), 2);
});

test('un écart d’un dossier clos s’écarte depuis le dossier, et sort de ses comptes', async () => {
  const clos = dossier({ id: 'P-clos', cloture: { le: '2026-09-30' },
    sections: sections({ brief: { livrables_attendus: ['Affiche'] } }) });
  const s = await atelier({ projets: [clos] });
  const cle = 'P-clos|-|brief|« Affiche » promis au brief, absent du dossier';
  assert.equal(s.E.ecarterUn(cle, 'Livrée hors outil').ok, true);
  assert.equal(s.E.total('P-clos'), 0);
  assert.equal(copie(s.data.decisions[0]).projet, 'P-clos');
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

/* ————— Qui paie la reprise : `facturable`, lu par origine —————
 *
 * `facturable` est posé sur l'origine (ORIGINES), pas sur l'écart ni sur son
 * type. Le compte le lit tel quel : une origine que la table ne connaît pas, ou
 * qui ne dit pas si elle se facture, n'est pas qualifiée — `def()` la rangerait
 * chez l'agence, le compte ne le fait pas. Un écart écarté n'est pas une reprise. */

test('facturable se lit sur l’origine, sans repli : une origine inconnue n’est pas qualifiée', async () => {
  const s = await atelier();
  assert.equal(s.E.facturable('donneur'), true);
  for (const o of ['brief', 'plateforme', 'bigidea', 'agence']) assert.equal(s.E.facturable(o), false, o);
  for (const o of ['inconnue', '', null, undefined, 'toString', '__proto__']) assert.equal(s.E.facturable(o), null, String(o));
  delete s.E.ORIGINES.plateforme.facturable;
  assert.equal(s.E.facturable('plateforme'), null, 'une origine qui ne dit pas si elle se facture n’est pas qualifiée');
  s.E.ORIGINES.plateforme.facturable = 'oui';
  assert.equal(s.E.facturable('plateforme'), null, 'seul un booléen qualifie');
});

test('le compte sépare les reprises facturables au client de celles à la charge de l’agence ; l’écarté n’en est pas une', async () => {
  const kv = { id: 'L-KV', nom: 'KV', kv: { copy: 'Signe' } };
  const s = await atelier({
    projets: [dossier({ livrables: [kv], sections: sections({ brief: { livrables_attendus: ['Kakémono'] } }) })],
    conformite: { 'L-KV': [{ quoi: 'Langue du marché', ok: false, cout: 'le KV est en français', types: ['langue'] }] },
    retours: { 'P-1': [
      { f: { id: 'FB-1', texte: 'Changer le fond', auteur: 'A', quand: '2026-10-03T10:00:00Z' },
        impact: { pieces: [kv], assets: 1, jours: 1, enProduction: 0 }, niveau: { rang: 1 }, attend: [], pret: true },
      { f: { id: 'FB-2', texte: 'Changer la typo', auteur: 'A', quand: '2026-10-04T10:00:00Z' },
        impact: { pieces: [kv], assets: 1, jours: 1, enProduction: 0 }, niveau: { rang: 2 }, attend: [], pret: true }] },
    annotations: { 'L-KV': [{ texte: 'Recadrer', quand: '2026-10-04T10:00:00Z' },
      { texte: 'Après validation', quand: '2026-10-06T10:00:00Z', reprise: true }] },
  });
  assert.deepEqual(copie(s.E.compteFacturable(s.E.tous('P-1'))), {
    facturables: 3, chargeAgence: 3, nonQualifiees: 0, ecartes: 0,
    parOrigine: { brief: { facturable: false, n: 2 }, agence: { facturable: false, n: 1 }, donneur: { facturable: true, n: 3 } },
  });
  assert.equal(s.E.ecarterUn('P-1|fb|FB-2', 'Retiré par le client lui-même').ok, true);
  assert.deepEqual(copie(s.E.compteFacturable(s.E.tous('P-1'))), {
    facturables: 2, chargeAgence: 3, nonQualifiees: 0, ecartes: 1,
    parOrigine: { brief: { facturable: false, n: 2 }, agence: { facturable: false, n: 1 }, donneur: { facturable: true, n: 2 } },
  }, 'un écart écarté sort des reprises facturables et se compte à part');

  /* Une origine sans qualification est comptée à part, jamais rangée chez l'agence. */
  const releve = [{ origine: 'donneur' }, { origine: 'inconnue' }, { origine: 'inconnue', ecarte: { motif: 'x' } }, {}];
  assert.deepEqual(copie(s.E.compteFacturable(releve)), {
    facturables: 1, chargeAgence: 0, nonQualifiees: 2, ecartes: 1,
    parOrigine: { donneur: { facturable: true, n: 1 }, inconnue: { facturable: null, n: 1 }, 'sans origine': { facturable: null, n: 1 } },
  });
  assert.deepEqual(copie(s.E.compteFacturable([])),
    { facturables: 0, chargeAgence: 0, nonQualifiees: 0, ecartes: 0, parOrigine: {} });
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
