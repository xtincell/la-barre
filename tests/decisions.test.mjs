import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ECRIVAINS, CAPTURE, rejouer, extraire, commit, bac, semer, projet, livrable, PERSONNES } from './decisions-scenarios.mjs';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const capture = JSON.parse(await readFile(CAPTURE, 'utf8'));
const source = await readFile(join(APP, 'decision.js'), 'utf8');
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

for (const nom of Object.keys(ECRIVAINS)) {
  test(`${nom} : la décision est celle d'avant la fabrique, champ pour champ et dans le même ordre`, async () => {
    const avant = capture.ecrivains[nom], apres = await rejouer(APP, nom);
    assert.deepEqual(apres.refus, []);
    /* La chaîne JSON compare aussi l'ordre des champs : c'est ce qui part
     * dans le fichier, et ce qu'un relevé lirait. */
    assert.equal(JSON.stringify(apres.decisions), JSON.stringify(avant.decisions));
    assert.deepEqual(apres.decisions.map(d => typeof d.id), avant.decisions.map(() => 'string'));
    /* Et le reste de la base n'a pas bougé : journal, pièce jugée, sauvegarde. */
    assert.equal(JSON.stringify(apres.base), JSON.stringify(avant.base));
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

function fabrique({ decisions = [], tirages = [] } = {}) {
  const data = { decisions: copie(decisions) };
  const ajouts = [];
  let n = 0;
  const ctx = vm.createContext({ Date, console,
    O: { id: prefixe => (n < tirages.length ? tirages[n++] : prefixe + '-' + String(++n).padStart(6, '0')) },
    DEPOT: { liste: k => data[k] || [],
      ajoute(k, d) { ajouts.push(k); d.cree_le = d.cree_le || new Date().toISOString(); data[k].push(d); return d; } },
  });
  ctx.window = ctx;
  vm.runInContext(source, ctx);
  return { D: ctx.DECISION, data, ajouts, get tirages() { return n; } };
}
const champs = extra => ({ objet: 'L-1', type: 'livrable', projet: 'P-1', verdict: 'approuve', motif: '',
  quand: '2026-11-10T09:00:00.000Z', qui: 'creation', titre: 'Livrable', ...extra });

test('un identifiant déjà pris dans la base locale est retiré, jamais réutilisé', () => {
  const f = fabrique({ decisions: [{ id: 'DEC-aaaaaa' }, { id: 'DEC-bbbbbb' }], tirages: ['DEC-aaaaaa', 'DEC-bbbbbb', 'DEC-cccccc'] });
  const d = f.D.poser(champs());
  assert.equal(d.id, 'DEC-cccccc');
  assert.equal(f.tirages, 3);
  assert.deepEqual(f.data.decisions.map(x => x.id), ['DEC-aaaaaa', 'DEC-bbbbbb', 'DEC-cccccc']);
  assert.equal(new Set(f.data.decisions.map(x => x.id)).size, 3);
});

test('après soixante-quatre tirages tous pris, la fabrique refuse au lieu d’écraser', () => {
  const f = fabrique({ decisions: [{ id: 'DEC-aaaaaa' }], tirages: Array(70).fill('DEC-aaaaaa') });
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
  const lister = async dossier => {
    for (const e of await readdir(dossier, { withFileTypes: true })) {
      if (e.isDirectory()) await lister(join(dossier, e.name));
      else if (e.name.endsWith('.js')) fichiers.push(join(dossier, e.name));
    }
  };
  await lister(APP);
  const ecritures = [];
  for (const f of fichiers) {
    const texte = await readFile(f, 'utf8');
    for (const motif of [/ajoute\(\s*["'`]decisions["'`]/g, /decisions["'`]?\]?\)?\s*\.(push|unshift|splice)\(/g, /\.decisions\s*=\s*(?!\[\])/g]) {
      for (const m of texte.matchAll(motif)) ecritures.push(f.slice(APP.length) + ' : ' + m[0]);
    }
  }
  assert.deepEqual(ecritures, ['decision.js : ajoute("decisions"']);
  const appels = [];
  for (const f of fichiers) {
    const n = ((await readFile(f, 'utf8')).match(/DECISION\.(poser|ajouter)\(/g) || []).length;
    if (n) appels.push(f.slice(APP.length) + ':' + n);
  }
  assert.deepEqual(appels.sort(), ['bigidea-ecoles.js:1', 'campagne.js:1', 'validation.js:1', 'vue-atelier.js:1',
    'vue-bigidea.js:1', 'vue-livrable.js:1', 'vue-revue.js:1', 'vue-route.js:1']);
});

test('decision.js est chargé avant le premier écrivain et après le dépôt', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const rang = nom => html.indexOf('<script src="app/' + nom + '.js">');
  assert.ok(rang('decision') > rang('depot') && rang('depot') > rang('outils'));
  for (const nom of ['bigidea-ecoles', 'campagne', 'validation', 'vue-atelier', 'vue-bigidea', 'vue-livrable', 'vue-revue', 'vue-route']) {
    assert.ok(rang(nom) > rang('decision'), nom);
  }
});
