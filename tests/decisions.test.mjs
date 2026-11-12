import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ECRIVAINS, CAPTURE, rejouer, extraire, commit, bac, semer, projet, livrable, piste, PERSONNES,
  bouton, saisie, cliquer } from './decisions-scenarios.mjs';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const capture = JSON.parse(await readFile(CAPTURE, 'utf8'));
const source = await readFile(join(APP, 'decision.js'), 'utf8');
const outils = await readFile(join(APP, 'outils.js'), 'utf8');
const copie = x => JSON.parse(JSON.stringify(x));

/* ————— Les huit écrivains : même forme qu'avant la fabrique ————— */

test('la capture couvre les huit écrivains, chacun avec au moins une décision', () => {
  assert.deepEqual(Object.keys(capture.ecrivains), Object.keys(ECRIVAINS));
  assert.equal(Object.keys(ECRIVAINS).length, 8);
  for (const [nom, avant] of Object.entries(capture.ecrivains)) {
    assert.ok(avant.decisions.length >= 1, nom);
    assert.deepEqual(avant.refus, [], nom);
  }
});

/* L'identifiant d'une décision a changé de forme : préfixe, code du poste et
 * douze caractères tirés au hasard, pour qu'il reste unique entre postes. Tout
 * le reste est comparé tel quel, chaque identifiant de décision remplacé par
 * son rang — y compris là où la base le cite : journal, référence, remplace,
 * et l'empreinte textuelle d'une désignation (revisionSource). */
const ANCIENNE = /^DEC-[0-9a-z]{6}$/, NEUVE = /^DEC-[0-9a-z]{4}-[0-9a-z]{12}$/;
function parRang(r) {
  const rangs = r.decisions.map((d, i) => [d.id, '«décision ' + (i + 1) + '»']);
  return JSON.parse(JSON.stringify(r, (k, v) => (typeof v === 'string'
    ? rangs.reduce((t, [id, rang]) => t.split(id).join(rang), v) : v)));
}

for (const nom of Object.keys(ECRIVAINS)) {
  test(`${nom} : la décision est celle d'avant la fabrique, champ pour champ et dans le même ordre`, async () => {
    const avant = capture.ecrivains[nom], apres = await rejouer(APP, nom);
    assert.deepEqual(apres.refus, []);
    for (const d of avant.decisions) assert.match(d.id, ANCIENNE);
    for (const d of apres.decisions) assert.match(d.id, NEUVE);
    /* La chaîne JSON compare aussi l'ordre des champs : c'est ce qui part
     * dans le fichier, et ce qu'un relevé lirait. */
    const a = parRang(apres), b = parRang(avant);
    assert.equal(JSON.stringify(a.decisions), JSON.stringify(b.decisions));
    /* Et le reste de la base n'a pas bougé : journal, pièce jugée, sauvegarde. */
    assert.equal(JSON.stringify(a.base), JSON.stringify(b.base));
  });
}

const sha = (() => { try { return commit(capture.source.commit); } catch { return null; } })();
test('la capture est bien ce qu’écrivait origin/main', { skip: sha ? false : 'révision ' + capture.source.commit.slice(0, 7) + ' absente de ce clone' }, async () => {
  const { app, nettoyer } = await extraire(sha);
  try {
    for (const nom of Object.keys(ECRIVAINS)) {
      const avant = await rejouer(app, nom);
      assert.equal(JSON.stringify(avant.decisions), JSON.stringify(capture.ecrivains[nom].decisions), nom);
      assert.equal(JSON.stringify(avant.base), JSON.stringify(capture.ecrivains[nom].base), nom);
    }
  } finally { await nettoyer(); }
});

/* ————— La fabrique elle-même ————— */

/* Le hasard de la fabrique est figé : le code du poste est déjà gardé dans ce
 * navigateur, et chaque tirage rend la suite donnée, puis un compteur. Le
 * tirage est le vrai (O.identifiantUnique, app/outils.js) : la suite lui
 * arrive par crypto, caractère pour octet. */
function fabrique({ decisions = [], tirages = [], projets = [], campagnes = [] } = {}) {
  const data = { decisions: copie(decisions), projets: copie(projets), campagnes: copie(campagnes) };
  const ajouts = [];
  let n = 0;
  const stockage = new Map([['la-barre-poste', 'p0st']]);
  const crypto = { getRandomValues(a) {
    const t = n < tirages.length ? tirages[n++] : String(++n).padStart(12, '0');
    for (let i = 0; i < a.length; i++) a[i] = parseInt(t[i], 36);
    return a;
  } };
  const ctx = vm.createContext({ Date, console, crypto, Uint8Array,
    localStorage: { getItem: k => (stockage.has(k) ? stockage.get(k) : null), setItem: (k, v) => stockage.set(k, String(v)) },
    DEPOT: { liste: k => data[k] || [], trouve: (k, id) => (data[k] || []).find(x => x && x.id === id) || null,
      ajoute(k, d) { ajouts.push(k); d.cree_le = d.cree_le || new Date().toISOString(); data[k].push(d); return d; } },
  });
  ctx.window = ctx;
  vm.runInContext(outils, ctx);
  vm.runInContext(source, ctx);
  return { D: ctx.DECISION, data, ajouts, get tirages() { return n; } };
}
const champs = extra => ({ objet: 'L-1', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: '',
  quand: '2026-11-10T09:00:00.000Z', qui: 'creation', titre: 'Livrable', ...extra });

test('un identifiant déjà pris dans la base locale est retiré, jamais réutilisé', () => {
  const f = fabrique({ decisions: [{ id: 'DEC-p0st-aaaaaaaaaaaa' }, { id: 'DEC-p0st-bbbbbbbbbbbb' }],
    tirages: ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'] });
  const d = f.D.poser(champs());
  assert.equal(d.id, 'DEC-p0st-cccccccccccc');
  assert.equal(f.tirages, 3);
  assert.deepEqual(f.data.decisions.map(x => x.id), ['DEC-p0st-aaaaaaaaaaaa', 'DEC-p0st-bbbbbbbbbbbb', 'DEC-p0st-cccccccccccc']);
  assert.equal(new Set(f.data.decisions.map(x => x.id)).size, 3);
});

test('après soixante-quatre tirages tous pris, la fabrique refuse au lieu d’écraser', () => {
  const f = fabrique({ decisions: [{ id: 'DEC-p0st-aaaaaaaaaaaa' }], tirages: Array(70).fill('aaaaaaaaaaaa') });
  assert.throws(() => f.D.poser(champs()), { name: 'DecisionRefusee', message: /Aucun identifiant de décision libre après 64 tirages/ });
  assert.equal(f.tirages, 64);
  assert.deepEqual(f.ajouts, []);
  assert.equal(f.data.decisions.length, 1);
});

test('un identifiant fourni d’avance et déjà pris est refusé, à la construction comme à l’ajout', () => {
  const f = fabrique({ decisions: [{ id: 'DEC-pris00' }] });
  assert.throws(() => f.D.construire(champs({ id: 'DEC-pris00' })), /déjà pris/);
  const d = f.D.construire(champs({ id: 'DEC-libre0' }));
  f.data.decisions.push({ id: 'DEC-libre0' }); // une autre décision arrive entre construction et ajout
  assert.throws(() => f.D.ajouter(d), /déjà pris/);
  assert.deepEqual(f.ajouts, []);
});

test('un verdict hors des quatre valeurs est refusé, sans rien écrire', () => {
  for (const verdict of ['valide', 'Approuvé', 'APPROUVE', 'refuse', '', null, undefined, 1]) {
    const f = fabrique();
    assert.throws(() => f.D.poser(champs({ verdict, motif: 'Un motif' })), { name: 'DecisionRefusee', message: /Verdict inconnu/ }, String(verdict));
    assert.deepEqual(f.ajouts, []); assert.equal(f.data.decisions.length, 0); assert.equal(f.tirages, 0);
  }
  const f = fabrique();
  for (const verdict of ['approuve', 'reserve', 'retour', 'hors']) f.D.poser(champs({ verdict, motif: 'Un motif' }));
  assert.deepEqual(f.data.decisions.map(d => d.verdict), ['approuve', 'reserve', 'retour', 'hors']);
});

test('un verdict inconnu passé par un vrai écrivain n’atteint ni la base ni la sauvegarde', async () => {
  /* vue-livrable : le verdict vient de l'écran. S'il en sortait un cinquième,
   * la fabrique l'arrête avant le dépôt. */
  const s = await bac(APP, 1);
  await s.charger('vue-livrable', ['juger']);
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('LI', { livrables: [livrable('L-1')] })] });
  const p = s.ctx.DEPOT.trouve('projets', 'LI');
  assert.throws(() => s.interne['vue-livrable'].juger(p, p.livrables[0], { cle: 'valide', nom: 'Validé', motifRequis: false }, () => {}),
    { name: 'DecisionRefusee', message: /Verdict inconnu : « valide »/ });
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 0);
  assert.equal(s.ctx.DEPOT.tout().enregistre_le, null);
  assert.equal(s.ctx.localStorage.getItem('la-barre'), null);
  assert.ok(!s.ctx.DEPOT.journal().some(e => e.type === 'decisions'));
});

test('les champs requis, la date et le motif des verdicts non approuvés sont vérifiés', () => {
  const f = fabrique();
  for (const cle of ['objet', 'type', 'projet', 'qui']) {
    for (const v of [undefined, null, '', '   ', 3]) {
      assert.throws(() => f.D.poser(champs({ [cle]: v })), { message: new RegExp('incomplète : ' + cle) }, cle + '=' + v);
    }
  }
  for (const quand of ['hier', '2026-11-10', '2026-11-10T10:00:00+01:00', 42]) {
    assert.throws(() => f.D.poser(champs({ quand })), /pas datée/, String(quand));
  }
  for (const verdict of ['reserve', 'retour', 'hors']) {
    for (const motif of ['', '  ', null]) assert.throws(() => f.D.poser(champs({ verdict, motif })), /exige un motif/);
  }
  assert.throws(() => f.D.poser(champs({ motif: undefined })), /motif est un texte/);
  assert.throws(() => f.D.poser([]), /est un objet/);
  assert.deepEqual(f.ajouts, []);
  /* L'approbation garde son motif vide ou nul, comme l'écrivent les écrans. */
  assert.equal(f.D.poser(champs({ motif: '' })).motif, '');
  assert.equal(f.D.poser(champs({ motif: null })).motif, null);
});

test('la fabrique recopie les champs dans l’ordre du geste, date si besoin et pose l’identifiant après eux', () => {
  const f = fabrique();
  const entree = { titre: 'T', qui: 'creation', objet: 'o', type: 't', projet: 'p', verdict: 'approuve', motif: null, extra: [1] };
  const d = f.D.poser(entree);
  assert.notEqual(d, entree);
  assert.deepEqual(Object.keys(d), ['titre', 'qui', 'objet', 'type', 'projet', 'verdict', 'motif', 'extra', 'quand', 'id', 'cree_le']);
  assert.equal(new Date(d.quand).toISOString(), d.quand);
  assert.equal(d.extra, entree.extra);
  const tete = f.D.poser({ id: f.D.identifiant(), ...champs() });
  assert.equal(Object.keys(tete)[0], 'id');
});

test('les quatre verdicts du contrat sont ceux que l’écran propose', async () => {
  /* Le profil de l'installation historique et le profil neutre de l'entreprise. */
  for (const profil of [join(APP, 'maison.js'), join(APP, '..', 'profils', 'entreprise', 'maison.js')]) {
    const ctx = vm.createContext({ console });
    ctx.window = ctx;
    for (const f of [join(APP, 'maison-base.js'), profil, join(APP, 'decision.js')]) vm.runInContext(await readFile(f, 'utf8'), ctx);
    assert.deepEqual([...ctx.DECISION.VERDICTS], copie(ctx.MAISON.verdicts.map(v => v.cle)), profil);
    assert.deepEqual([...ctx.DECISION.VERDICTS], ['approuve', 'reserve', 'retour', 'hors']);
    assert.deepEqual(copie(ctx.MAISON.verdicts.filter(v => v.motifRequis).map(v => v.cle)), ['reserve', 'retour', 'hors']);
  }
});

test('rien d’autre que la fabrique n’écrit dans la collection des décisions', async () => {
  const fichiers = [];
  const lister = async (dossier, ext) => {
    for (const e of await readdir(dossier, { withFileTypes: true })) {
      if (e.isDirectory()) await lister(join(dossier, e.name), ext);
      else if (e.name.endsWith(ext)) fichiers.push(join(dossier, e.name));
    }
  };
  /* L'application, et les outils qui écrivent une base : l'ingestion du corpus
   * et la base fictive de la démonstration. */
  const RACINE = join(APP, '..');
  await lister(APP, '.js');
  await lister(join(RACINE, 'outils'), '.mjs');
  const nom = f => f.slice(RACINE.length + 1).replace(/^app\//, '');
  const ecritures = [];
  for (const f of fichiers) {
    const texte = await readFile(f, 'utf8');
    for (const motif of [/ajoute\(\s*["'`]decisions["'`]/g, /decisions["'`]?\]?\)?\s*\.(push|unshift|splice)\(/g, /\.decisions\s*=\s*(?!\[\])/g]) {
      for (const m of texte.matchAll(motif)) ecritures.push(nom(f) + ' : ' + m[0]);
    }
  }
  /* Deux écritures, toutes deux dans la fabrique : le geste qui ajoute une
   * décision, et l'import qui admet celles d'un fichier dans le registre. */
  assert.deepEqual(ecritures, ['decision.js : ajoute("decisions"', 'decision.js : .decisions = ']);
  const appels = [];
  for (const f of fichiers) {
    const n = ((await readFile(f, 'utf8')).match(/DECISION\.(poser|ajouter|admettre|departager)\(/g) || []).length;
    if (n) appels.push(nom(f) + ':' + n);
  }
  /* Les huit écrivains d'origine, plus les gestes de choix qui écrivaient leur
   * objet sans décision : écarter une piste ou une proposition de big idea,
   * écarter un concept de la réserve, accepter ou retourner le brief, écarter
   * une case de la composition, déclarer l'écart d'un projet de campagne,
   * clore le bilan d'une campagne, trancher une adaptation hors de l'écart
   * déclaré de son marché (corriger l'écart déclaré ou l'adaptation), et
   * écarter un écart du relevé ou le reprendre. Le dépôt, lui, passe par la
   * fabrique à deux endroits : l'import d'une base (`admettre`) et le
   * rapprochement avec la base de référence (`departager`). La base fictive de
   * la démonstration est écrite par les mêmes gestes. L'ingestion du corpus
   * n'écrit aucune décision : elle rend la collection telle qu'elle l'a lue. */
  assert.deepEqual(appels.sort(), ['bigidea-ecoles.js:2', 'campagne.js:4', 'concepts.js:1', 'depot.js:2', 'ecarts-marche.js:2', 'ecarts.js:2',
    'outils/vitrine-base.mjs:8', 'validation.js:1', 'vue-atelier.js:1', 'vue-bigidea.js:1', 'vue-brief.js:1', 'vue-livrable.js:1', 'vue-revue.js:1', 'vue-route.js:2']);
  /* Le dépôt n'y passe que par ces deux portes : ni ajout, ni affectation. */
  const depot = await readFile(join(APP, 'depot.js'), 'utf8');
  assert.match(depot, /DECISION\.admettre\(lu, etat\)/);
  assert.match(depot, /DECISION\.departager\(/);
  const corpus = await readFile(join(RACINE, 'outils', 'ingerer-corpus.mjs'), 'utf8');
  assert.match(corpus, /n'écrit aucune décision/);
});

test('aucun module ne déclare deux fois la même fonction : la seconde remplacerait la première en silence', async () => {
  /* vue-brief.js portait déjà `recevabilite(p, d, ident)` ; une seconde
   * déclaration du même nom, pour la décision, l'aurait remplacée dans tout le
   * module et cassé l'écran du brief sans qu'aucun geste testé ne le voie. */
  const doubles = [];
  for (const nom of (await readdir(APP)).filter(f => f.endsWith('.js'))) {
    const vus = {};
    for (const m of (await readFile(join(APP, nom), 'utf8')).matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\s*\(/gm)) {
      vus[m[1]] = (vus[m[1]] || 0) + 1;
    }
    for (const [f, n] of Object.entries(vus)) if (n > 1) doubles.push(nom + ' : ' + f + ' ×' + n);
  }
  assert.deepEqual(doubles, []);
});

test('decision.js est chargé avant le premier écrivain et après le dépôt', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const rang = nom => html.indexOf('<script src="app/' + nom + '.js">');
  assert.ok(rang('decision') > rang('depot') && rang('depot') > rang('outils'));
  for (const nom of ['bigidea-ecoles', 'campagne', 'concepts', 'ecarts', 'ecarts-marche', 'validation', 'vue-atelier', 'vue-bigidea', 'vue-brief', 'vue-livrable', 'vue-revue', 'vue-route']) {
    assert.ok(rang(nom) > rang('decision'), nom);
  }
});

/* ————— Le rattachement d'une décision ————— */

const sans = (o, ...cles) => { const r = { ...o }; for (const k of cles) delete r[k]; return r; };

test('une décision se rattache à un projet, à une campagne ou à une marque, jamais à rien', () => {
  const f = fabrique();
  /* Écarter une case de la composition vise la campagne ; écarter un concept
   * de la réserve vise sa marque. Ni l'un ni l'autre n'a de projet. */
  const c = f.D.poser({ ...sans(champs({ verdict: 'hors', motif: 'Pas de film pour ce temps fort' }), 'projet'),
    type: 'composition', objet: 'film', campagne: 'C-1' });
  assert.equal(c.campagne, 'C-1'); assert.equal('projet' in c, false);
  const m = f.D.poser({ ...sans(champs({ verdict: 'hors', motif: 'Déjà porté par le concurrent' }), 'projet'),
    type: 'concept', objet: 'CO-1', marque: 'MQ-1' });
  assert.equal(m.marque, 'MQ-1');
  assert.throws(() => f.D.poser(sans(champs(), 'projet')), { name: 'DecisionRefusee', message: /incomplète : projet \(ou campagne, ou marque\)/ });
  /* Un rattachement nommé doit être lisible, même à côté d'un autre. */
  for (const v of ['', '   ', 3, []]) {
    assert.throws(() => f.D.poser(champs({ campagne: v })), { message: /incomplète : campagne/ }, 'campagne=' + v);
    assert.throws(() => f.D.poser({ ...sans(champs(), 'projet'), marque: v }), { message: /incomplète : marque/ }, 'marque=' + v);
  }
  assert.deepEqual(f.data.decisions.map(d => d.type), ['composition', 'concept']);
});

/* ————— La portée des déviations ————— */

/* Une déviation s'écarte d'une décision ou du plan. Elle nomme ce dont elle
 * s'écarte (`ecart`), porte un motif et déclare sa portée dans le vocabulaire
 * des objets du dépôt : livrable, projet ou campagne. */
const DEPOT_ECARTS = {
  campagnes: [{ id: 'C-1', nom: 'Noël' }, { id: 'C-2', nom: 'Rentrée' }],
  projets: [
    { id: 'P-ref', campagneId: 'C-1', sections: { pistes: [{ id: 'pi-ref', statut: 'retenue' }] }, livrables: [] },
    { id: 'P-1', campagneId: 'C-1', sections: { pistes: [{ id: 'pi-local', statut: 'retenue' }] }, livrables: [{ id: 'L-1' }] },
    { id: 'P-2', campagneId: 'C-2', sections: { pistes: [{ id: 'pi-ailleurs', statut: 'retenue' }] }, livrables: [] },
  ],
  decisions: [
    { id: 'DEC-ref001', type: 'reference-campagne', campagne: 'C-1', projet: 'P-ref', objet: 'pi-ref', verdict: 'approuve', portee: 'campagne' },
    { id: 'DEC-ref002', type: 'reference-campagne', campagne: 'C-2', projet: 'P-2', objet: 'pi-ailleurs', verdict: 'approuve', portee: 'campagne' },
  ],
};
const ecartDeCampagne = extra => champs({ type: 'ecart-campagne', objet: 'pi-local', projet: 'P-1', campagne: 'C-1',
  motif: 'Le film garde son propre concept', portee: 'projet', ecart: { de: 'reference-campagne', ref: 'DEC-ref001' }, ...extra });
const composition = extra => ({ ...sans(champs({ verdict: 'hors', motif: 'La campagne n’a pas de film' }), 'projet'),
  type: 'composition', objet: 'film', campagne: 'C-1', portee: 'campagne', ecart: { de: 'composition', ref: 'noel' }, ...extra });
const recevabilite = extra => champs({ type: 'recevabilite', objet: 'brief', projet: 'P-1', motif: 'Le client a confirmé par écrit',
  portee: 'projet', ecart: { de: 'recevabilite', ref: null }, ...extra });

test('une déviation déclare sa portée : absente ou inconnue, elle est refusée sans rien écrire', () => {
  const f = fabrique(DEPOT_ECARTS);
  for (const portee of [undefined, null, '', '   ']) {
    assert.throws(() => f.D.poser(ecartDeCampagne({ portee })),
      { name: 'DecisionRefusee', message: /déclare sa portée : livrable, projet ou campagne/ }, String(portee));
  }
  /* « document » et « travail » sont des portées de validation, pas de déviation. */
  for (const portee of ['document', 'travail', 'marque', 'Projet', 'monde', 3]) {
    assert.throws(() => f.D.poser(ecartDeCampagne({ portee })), { message: /Portée inconnue/ }, String(portee));
  }
  assert.deepEqual(f.ajouts, []); assert.equal(f.data.decisions.length, 2); assert.equal(f.tirages, 0);
});

test('la portée d’une déviation doit correspondre à l’objet visé', () => {
  const f = fabrique(DEPOT_ECARTS);
  const pasLeNiveau = /ne correspond pas à l'objet visé/;
  /* Une piste relève de son projet : ni un livrable, ni la campagne. Une
   * déviation qui engagerait la campagne ne serait plus un écart, mais une
   * référence. */
  assert.throws(() => f.D.poser(ecartDeCampagne({ portee: 'livrable' })), pasLeNiveau);
  assert.throws(() => f.D.poser(ecartDeCampagne({ portee: 'campagne' })), pasLeNiveau);
  /* Un livrable visé est de portée livrable, pas projet. */
  assert.throws(() => f.D.poser(ecartDeCampagne({ objet: 'L-1', portee: 'projet' })), pasLeNiveau);
  /* Le projet doit exister et appartenir à la campagne nommée. */
  assert.throws(() => f.D.poser(ecartDeCampagne({ projet: 'P-2', objet: 'pi-ailleurs' })), /n'appartient pas à la campagne/);
  assert.throws(() => f.D.poser(ecartDeCampagne({ projet: 'P-absent' })), /projet visé est introuvable/);
  /* Une case de composition relève de la campagne, et la campagne doit exister. */
  assert.throws(() => f.D.poser(composition({ portee: 'projet' })), pasLeNiveau);
  assert.throws(() => f.D.poser(composition({ campagne: 'C-absente' })), /campagne visée est introuvable/);
  assert.throws(() => f.D.poser(recevabilite({ portee: 'campagne' })), pasLeNiveau);
  assert.deepEqual(f.ajouts, []);

  assert.equal(f.D.poser(ecartDeCampagne()).portee, 'projet');
  assert.equal(f.D.poser(ecartDeCampagne({ objet: 'L-1', portee: 'livrable' })).portee, 'livrable');
  assert.equal(f.D.poser(composition()).portee, 'campagne');
  assert.equal(f.D.poser(recevabilite()).portee, 'projet');
  assert.deepEqual(f.data.decisions.slice(2).map(d => d.type + ':' + d.portee),
    ['ecart-campagne:projet', 'ecart-campagne:livrable', 'composition:campagne', 'recevabilite:projet']);
});

test('une déviation porte un motif, nomme ce dont elle s’écarte et s’adosse à une référence existante', () => {
  const f = fabrique(DEPOT_ECARTS);
  /* Même approuvée : s'écarter sans dire pourquoi, c'est s'écarter par goût. */
  for (const motif of ['', '  ', null]) assert.throws(() => f.D.poser(ecartDeCampagne({ motif })), /déviation exige un motif/);
  for (const ecart of [null, 'reference-campagne', [], {}, { de: '' }, { de: 3 }]) {
    assert.throws(() => f.D.poser(ecartDeCampagne({ ecart })), /nomme ce dont elle s'écarte/, JSON.stringify(ecart));
  }
  assert.throws(() => f.D.poser(ecartDeCampagne({ ecart: { de: 'humeur' } })), /Écart inconnu : « humeur »/);
  assert.throws(() => f.D.poser(recevabilite({ ecart: { de: 'recevabilite', ref: 3 } })), /référence de l'écart est illisible/);
  /* L'écart de campagne s'adosse à la décision de référence de cette campagne. */
  for (const ref of [undefined, null, 'DEC-absente', 'DEC-ref002']) {
    assert.throws(() => f.D.poser(ecartDeCampagne({ ecart: { de: 'reference-campagne', ref } })),
      /référence commune de la campagne C-1/, String(ref));
  }
  assert.throws(() => f.D.poser({ ...ecartDeCampagne(), campagne: undefined }), /écart à la référence commune nomme sa campagne/);
  assert.deepEqual(f.ajouts, []);
});

test('une décision qui n’est pas une déviation garde sa portée telle quelle', () => {
  /* Le verdict sur un document (document, travail) et la référence de campagne
   * (campagne, depuis le projet de la piste) ne sont pas des déviations : leur
   * portée dit ce que le verdict engage, et la fabrique ne la relit pas. */
  const f = fabrique();
  for (const portee of ['document', 'travail', 'campagne']) assert.equal(f.D.poser(champs({ portee })).portee, portee);
});

/* ————— Les autres gestes de choix passent par la fabrique ————— */

const derniere = s => {
  const ds = s.ctx.DEPOT.liste('decisions');
  assert.ok(ds.length, 'le geste n’a écrit aucune décision');
  return copie(ds[ds.length - 1]);
};
const journalDe = (s, d) => copie(s.ctx.DEPOT.journal().filter(e => e.type === 'decisions' && e.id === d.id));
const iso = v => typeof v === 'string' && new Date(v).toISOString() === v;

function memeGeste(s, d, attendu) {
  for (const [k, v] of Object.entries(attendu)) assert.deepEqual(d[k], v, k);
  assert.equal(d.qui, s.ctx.MAISON.titulaire);
  assert.equal(d.acteur.personneId, 'P-recette');
  assert.ok(iso(d.quand) && iso(d.cree_le) && d.quand <= d.cree_le);
  const j = journalDe(s, d);
  assert.equal(j.length, 1, 'une ligne de journal pour la décision');
  assert.equal(j[0].acteur.personneId, 'P-recette');
  assert.ok(s.ctx.localStorage.getItem('la-barre'), 'la base est sauvegardée');
}

test('écarter une piste depuis sa route passe par la fabrique, motif exigé', async () => {
  const s = await bac(APP, 21);
  await s.charger('vue-route', ['ecarter']);
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('EC', { sections: { pistes: [piste('pi-e')] } })] });
  const p = s.ctx.DEPOT.trouve('projets', 'EC'), pi = p.sections.pistes[0];
  s.interne['vue-route'].ecarter(p, pi, () => {});
  cliquer(bouton(s.dernier(), 'Écarter'));
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 0); assert.equal(pi.statut, 'proposee');
  saisie(s.dernier()).value = 'Trop proche du concurrent';
  cliquer(bouton(s.dernier(), 'Écarter'));
  const d = derniere(s);
  memeGeste(s, d, { type: 'piste', objet: 'pi-e', projet: 'EC', verdict: 'hors', motif: 'Trop proche du concurrent', titre: 'Piste pi-e' });
  assert.equal(pi.statut, 'ecartee'); assert.equal(pi.motif, d.motif);
});

test('écarter une proposition de big idea passe par la fabrique, au même registre que la retenue', async () => {
  const s = await bac(APP, 22);
  await s.charger('bigidea-ecoles');
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('BE', { bigideas: [{ id: 'BE-2', titre: 'Le gué', phrase: 'Tout passe à gué',
    statut: 'proposee', cree_le: '2026-11-01T08:00:00.000Z' }] })] });
  const p = s.ctx.DEPOT.trouve('projets', 'BE'), c = p.bigideas[0];
  assert.throws(() => s.ctx.BI_ECOLES.ecarter(p, c, '   '), { name: 'DecisionRefusee' });
  assert.equal(c.statut, 'proposee'); assert.equal(s.ctx.DEPOT.liste('decisions').length, 0);
  s.ctx.BI_ECOLES.ecarter(p, c, 'Elle ne tient pas trois ans');
  const d = derniere(s);
  memeGeste(s, d, { type: 'bigidea', objet: 'BE-2', projet: 'BE', verdict: 'hors', motif: 'Elle ne tient pas trois ans', titre: 'Le gué' });
  assert.equal(c.statut, 'ecartee'); assert.equal(c.ecartee_le, d.quand);
});

test('écarter un concept de la réserve passe par la fabrique, rattaché à sa marque', async () => {
  const s = await bac(APP, 23);
  await s.charger('concepts', ['ecarter']);
  semer(s.ctx, { personnes: PERSONNES, marques: [{ id: 'MQ-r', nom: 'Marque de recette', concepts: [{ id: 'CO-1', titre: 'Le pont',
    phrase: 'Tout passe par le pont', auteur: 'P-junior', statut: 'reserve', cree_le: '2026-11-01T08:00:00.000Z' }] }] });
  const m = s.ctx.DEPOT.trouve('marques', 'MQ-r'), c = m.concepts[0];
  s.interne.concepts.ecarter(m, c, () => {});
  s.demandes.pop()('Déjà porté par le concurrent');
  const d = derniere(s);
  memeGeste(s, d, { type: 'concept', objet: 'CO-1', marque: 'MQ-r', verdict: 'hors', motif: 'Déjà porté par le concurrent', titre: 'Le pont' });
  assert.equal('projet' in d, false);
  assert.equal(c.statut, 'ecarte'); assert.equal(c.ecarte_le, d.quand);
});

test('accepter ou retourner le brief passe par la fabrique ; l’accepter malgré ses manques est une déviation de portée projet', async () => {
  const s = await bac(APP, 24);
  await s.charger('vue-brief', ['accepter', 'retourner']);
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('BR'), projet('BM'), projet('BS')] });
  const brief = id => s.ctx.DEPOT.trouve('projets', id).sections.brief;
  const manques = { recevable: false, controles: [{ ok: true, quoi: 'Objectif écrit' },
    { ok: false, quoi: 'Aucune cible nommée', cout: 'la cible se devinera' }, { ok: false, quoi: 'Pas de date', cout: 'aucun délai' }] };

  s.interne['vue-brief'].accepter(s.ctx.DEPOT.trouve('projets', 'BR'), brief('BR'), { recevable: true, controles: [] }, () => {});
  let d = derniere(s);
  memeGeste(s, d, { type: 'recevabilite', objet: 'brief', projet: 'BR', verdict: 'approuve', motif: null });
  assert.equal('portee' in d, false); assert.equal('ecart' in d, false);
  assert.equal(brief('BR').statut, 'accepte'); assert.equal(brief('BR').accepte_le, d.quand);

  /* Accepter malgré deux manques : le motif est demandé, la portée est le projet. */
  s.interne['vue-brief'].accepter(s.ctx.DEPOT.trouve('projets', 'BM'), brief('BM'), manques, () => {});
  cliquer(bouton(s.dernier(), 'Accepter quand même'));
  assert.equal(brief('BM').statut, undefined); assert.equal(s.ctx.DEPOT.liste('decisions').length, 1);
  saisie(s.dernier()).value = 'Le client a confirmé la cible par écrit';
  cliquer(bouton(s.dernier(), 'Accepter quand même'));
  d = derniere(s);
  memeGeste(s, d, { type: 'recevabilite', objet: 'brief', projet: 'BM', verdict: 'approuve', portee: 'projet',
    motif: 'Le client a confirmé la cible par écrit', ecart: { de: 'recevabilite', ref: null, conditions: ['Aucune cible nommée', 'Pas de date'] } });
  assert.equal(brief('BM').accepte_malgre, 2);

  s.interne['vue-brief'].retourner(s.ctx.DEPOT.trouve('projets', 'BS'), brief('BS'), manques, () => {});
  cliquer(bouton(s.dernier(), 'Aucune cible nommée — la cible se devinera'));
  cliquer(bouton(s.dernier(), 'Retourner'));
  d = derniere(s);
  memeGeste(s, d, { type: 'recevabilite', objet: 'brief', projet: 'BS', verdict: 'reserve', motif: 'Aucune cible nommée' });
  assert.equal(brief('BS').statut, 'sous_reserve'); assert.equal(brief('BS').reserve.quand, d.quand);
});

test('écarter une case de la composition est une déviation de portée campagne ; sans motif, rien n’est écrit', async () => {
  const s = await bac(APP, 25);
  await s.charger('campagne');
  semer(s.ctx, { personnes: PERSONNES, campagnes: [{ id: 'C-n', nom: 'Noël de recette', occasion: 'noel', ecartes: {} }] });
  const c = s.ctx.DEPOT.trouve('campagnes', 'C-n');
  for (const motif of ['', '   ', undefined]) {
    assert.throws(() => s.ctx.CAMPAGNE.ecarter(c, 'film', motif), { name: 'DecisionRefusee' });
  }
  assert.deepEqual(copie(c.ecartes), {}); assert.equal(s.ctx.DEPOT.liste('decisions').length, 0);
  s.ctx.CAMPAGNE.ecarter(c, 'film', 'Le budget ne couvre pas un tournage');
  const d = derniere(s);
  memeGeste(s, d, { type: 'composition', objet: 'film', campagne: 'C-n', verdict: 'hors', portee: 'campagne',
    motif: 'Le budget ne couvre pas un tournage', ecart: { de: 'composition', ref: 'noel' } });
  assert.equal('projet' in d, false);
  assert.deepEqual(copie(c.ecartes.film), { motif: d.motif, quand: d.quand });
});

test('déclarer l’écart d’un projet depuis la référence commune passe par la fabrique, portée projet', async () => {
  const s = await bac(APP, 26);
  await s.charger('campagne');
  semer(s.ctx, { personnes: PERSONNES, campagnes: [{ id: 'C-r', nom: 'Rentrée de recette' }], projets: [
    projet('RA', { campagneId: 'C-r', sections: { pistes: [piste('pi-a', { statut: 'retenue', arbitre_le: '2026-11-04T08:00:00.000Z' })] } }),
    projet('RB', { campagneId: 'C-r', sections: { pistes: [piste('pi-b', { statut: 'retenue', arbitre_le: '2026-11-05T08:00:00.000Z' })] } })] });
  const C = s.ctx.CAMPAGNE;
  assert.equal(C.designerReference('C-r', 'RA', 'pi-a', 'Le socle commun', C.reference('C-r').revision).ok, true);
  const ref = derniere(s);
  /* L'écran de la campagne propose la déclaration pour le projet qui s'écarte. */
  const bloc = C.blocReference('C-r', () => {});
  cliquer(bouton(bloc, 'Déclarer l\'écart de REF-RB'));
  cliquer(bouton(s.dernier(), 'Déclarer l\'écart'));
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 1, 'sans motif, rien n’est déclaré');
  saisie(s.dernier()).value = 'Le film vise un autre public';
  cliquer(bouton(s.dernier(), 'Déclarer l\'écart'));
  const d = derniere(s);
  memeGeste(s, d, { type: 'ecart-campagne', objet: 'pi-b', projet: 'RB', campagne: 'C-r', verdict: 'approuve', portee: 'projet',
    motif: 'Le film vise un autre public', ecart: { de: 'reference-campagne', ref: ref.id } });
  assert.equal(s.ctx.DEPOT.trouve('projets', 'RB').ecartDeCampagne, 'Le film vise un autre public');
  assert.equal(C.reference('C-r').etat, 'choisie', 'l’écart déclaré ne touche pas à la référence commune');
});

test('chaque type de décision écrit par un geste est rangé dans la jurisprudence', async () => {
  const ctx = vm.createContext({ console });
  ctx.window = ctx;
  vm.runInContext(await readFile(join(APP, 'jurisprudence.js'), 'utf8'), ctx);
  const familles = ['brief', 'bigidea', 'proposition', 'livrable'];
  for (const type of ['bigidea', 'reference-campagne', 'brief', 'socle', 'idee', 'piste', 'livrable',
    'concept', 'recevabilite', 'composition', 'ecart-campagne', 'bilan-campagne', 'ecart-marche', 'hors-ecart', 'ecart']) {
    assert.ok(ctx.JURISPRUDENCE.SOURCES[type], type);
    assert.ok(familles.includes(ctx.JURISPRUDENCE.SOURCES[type].famille), type);
  }
});

/* ————— Écarter un écart du relevé, et le reprendre —————
 *
 * Retours attendus montre ce qu'on me doit, calculé par ecarts.js. « Écarter »
 * dit que ce que le contrôle réclame ne l'est pas ici, motif exigé ;
 * « Reprendre » rouvre l'écart. Les deux gestes passent par la fabrique, dans
 * le type que la jurisprudence range déjà : `ecart`. */

const texteDe = n => (n && n.textContent) || '';

async function releve(graine, projets) {
  const s = await bac(APP, graine);
  s.ctx.KV.conformite = () => [];
  s.ctx.FEEDBACK = { ordre: () => [], nomAuteur: a => a };
  s.ctx.ANNOT = { ouvertes: () => [] };
  s.ctx.PANNEAU.ligne = (etiq, val) => s.ctx.O.el('div.ligne', {}, s.ctx.O.el('span.etiq', {}, etiq), s.ctx.O.el('span.val', {}, val || ''));
  for (const nom of ['ecarts', 'jurisprudence', 'vue-attentes']) await s.charger(nom);
  semer(s.ctx, { personnes: PERSONNES, projets });
  return s;
}
const promesse = (id, ...attendus) => projet(id, { sections: { brief: { livrables_attendus: attendus }, pistes: [] } });

test('écarter un écart depuis Retours attendus passe par la fabrique, motif exigé ; il reste visible, et se reprend', async () => {
  const s = await releve(27, [promesse('EA', 'Kakémono')]);
  const E = s.ctx.ECARTS, cle = 'EA|-|brief|« Kakémono » promis au brief, absent du dossier';
  const zone = s.ctx.document.createElement('div');
  s.ctx.VUE_ATTENTES.rendre(zone);
  assert.equal(E.total(), 1);
  assert.match(texteDe(zone), /Kakémono/);

  cliquer(bouton(zone, 'Écarter'));
  assert.match(texteDe(s.dernier()), /Kakémono/, 'le panneau dit ce qui est écarté');
  cliquer(bouton(s.dernier(), 'Écarter'));
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 0, 'sans motif, rien n’est écarté');
  assert.ok(s.refus.some(m => /motif/.test(m)), 'le refus de la fabrique est rendu à la personne');
  assert.equal(E.total(), 1);

  saisie(s.dernier()).value = 'Retiré du périmètre par avenant';
  cliquer(bouton(s.dernier(), 'Écarter'));
  const d = derniere(s);
  memeGeste(s, d, { type: 'ecart', objet: cle, projet: 'EA', verdict: 'hors', motif: 'Retiré du périmètre par avenant',
    titre: '« Kakémono » promis au brief, absent du dossier', origine: 'brief' });
  assert.deepEqual(copie(s.ctx.DEPOT.tout().ecartsEcartes[cle]), { motif: d.motif, quand: d.quand, decision: d.id });
  assert.equal(E.total(), 0, 'écarté, il n’est plus compté comme ouvert');

  /* La vue est relue : plus rien n'est dû, et l'écart écarté reste visible,
   * avec son motif et qui l'a dit. */
  assert.match(texteDe(zone), /Rien ne m'est dû/);
  cliquer(bouton(zone, 'Voir les écarts écartés (1)'));
  assert.match(texteDe(zone), /Retiré du périmètre par avenant/);
  assert.match(texteDe(zone), /Personne de recette/);
  assert.match(texteDe(zone), /REF-EA/);

  /* Le registre des arbitrages le compte une fois, pas deux. */
  const arbs = s.ctx.JURISPRUDENCE.tout().filter(a => a.source === 'ecart');
  assert.equal(arbs.length, 1);
  assert.equal(arbs[0].motif, 'Retiré du périmètre par avenant');
  assert.equal(arbs[0].verdict, 'hors');

  cliquer(bouton(zone, 'Reprendre'));
  assert.match(texteDe(s.dernier()), /Retiré du périmètre par avenant/, 'le panneau rappelle le motif de l’écartement');
  cliquer(bouton(s.dernier(), 'Reprendre'));
  const r = derniere(s);
  memeGeste(s, r, { type: 'ecart', objet: cle, projet: 'EA', verdict: 'approuve', motif: null, remplace: d.id, origine: 'brief' });
  assert.equal(cle in s.ctx.DEPOT.tout().ecartsEcartes, false);
  assert.equal(E.total(), 1, 'repris, il est de nouveau dû');
  assert.doesNotMatch(texteDe(zone), /Rien ne m'est dû/);
  assert.doesNotMatch(texteDe(zone), /écarts écartés/);
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 2, 'l’écartement reste au registre');
});

test('une ligne qui regroupe la même cause s’écarte d’un geste : une décision par écart, chacun se reprend seul', async () => {
  const s = await releve(28, [promesse('GA', 'Kakémono'), promesse('GB', 'Kakémono'), promesse('GC', 'Affiche')]);
  const E = s.ctx.ECARTS;
  const zone = s.ctx.document.createElement('div');
  s.ctx.VUE_ATTENTES.rendre(zone);
  assert.equal(E.total(), 3);
  /* La première ligne est celle du kakémono, sur deux dossiers. */
  cliquer(bouton(zone, 'Écarter'));
  assert.match(texteDe(s.dernier()), /REF-GA[^]*REF-GB/);
  saisie(s.dernier()).value = 'Le kakémono sort du dispositif';
  cliquer(bouton(s.dernier(), 'Écarter'));
  const ds = copie(s.ctx.DEPOT.liste('decisions'));
  assert.deepEqual(ds.map(d => [d.projet, d.verdict, d.motif]),
    [['GA', 'hors', 'Le kakémono sort du dispositif'], ['GB', 'hors', 'Le kakémono sort du dispositif']]);
  assert.equal(E.total(), 1);
  assert.deepEqual(copie(E.tous().filter(x => !x.ecarte).map(x => x.projet.id)), ['GC']);

  cliquer(bouton(zone, 'Voir les écarts écartés (2)'));
  cliquer(bouton(zone, 'Reprendre'));
  saisie(s.dernier()).value = 'GA garde son kakémono';
  cliquer(bouton(s.dernier(), 'Reprendre'));
  const r = derniere(s);
  assert.deepEqual([r.projet, r.verdict, r.motif, r.remplace], ['GA', 'approuve', 'GA garde son kakémono', ds[0].id]);
  assert.equal(E.total(), 2);
  assert.deepEqual(copie(E.tous().filter(x => x.ecarte).map(x => x.projet.id)), ['GB'], 'l’autre reste écarté');
});

test('un écart écarté avant la fabrique reste au registre des arbitrages ; celui de la fabrique n’y est pas doublé', async () => {
  const s = await releve(29, [promesse('JA', 'Kakémono', 'Affiche')]);
  const ancien = 'JA|-|brief|« Affiche » promis au brief, absent du dossier';
  s.ctx.DEPOT.tout().ecartsEcartes = { [ancien]: { motif: 'Hors devis signé', quand: '2026-10-01T08:00:00.000Z' } };
  assert.equal(s.ctx.ECARTS.ecarterUn('JA|-|brief|« Kakémono » promis au brief, absent du dossier', 'Remplacé par une oriflamme').ok, true);
  const arbs = s.ctx.JURISPRUDENCE.tout().filter(a => a.source === 'ecart');
  assert.deepEqual(copie(arbs.map(a => a.motif)).sort(), ['Hors devis signé', 'Remplacé par une oriflamme']);
});
