import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

/* Valider et dire : les mots que La Barre affiche autour d'une pièce.
 *
 * L'accord des nombres, le titre d'une pièce et l'auteur d'un retour posé sur
 * l'image se vérifient ici sur les vrais modules, sans navigateur. Le geste de
 * validation lui-même (un clic, huit secondes pour annuler) se rejoue dans le
 * parcours (tests/parcours.mjs), avec l'horloge de Playwright. */

const lire = nom => readFile(new URL('../app/' + nom + '.js', import.meta.url), 'utf8');

async function bac(modules = []) {
  const ctx = vm.createContext({ console, Date, Math, JSON });
  ctx.window = ctx;
  for (const nom of ['maison-base', 'outils', ...modules]) vm.runInContext(await lire(nom), ctx, { filename: nom + '.js' });
  return ctx;
}

test('O.pluriel accorde au singulier jusqu’à un, au pluriel à partir de deux', async () => {
  const { O } = await bac();
  assert.equal(O.pluriel(0, 'visuel manquant', 'visuels manquants'), '0 visuel manquant');
  assert.equal(O.pluriel(1, 'visuel manquant', 'visuels manquants'), '1 visuel manquant');
  assert.equal(O.pluriel(3, 'visuel manquant', 'visuels manquants'), '3 visuels manquants');
  assert.equal(O.pluriel(2, 'marché'), '2 marchés');
  assert.equal(O.pluriel(undefined, 'marché'), '0 marché');
});

test('O.finir clôt une phrase sans doubler le point d’une date abrégée', async () => {
  const { O } = await bac();
  assert.equal(O.finir('Accepté le ' + O.joli('2026-10-03T10:00:00')), 'Accepté le 3 oct.');
  assert.equal(O.finir('Accepté le 3 mai'), 'Accepté le 3 mai.');
  assert.equal(O.finir('Prêt !'), 'Prêt !');
});

function depot(donnees) {
  return { trouve: (k, id) => (donnees[k] || []).find(x => x.id === id) || null, liste: k => donnees[k] || [] };
}
const REFERENTIEL = {
  marches: [{ id: 'M-gh', code: 'GH', nom: 'Ghana' }, { id: 'M-ci', code: 'CI', nom: 'Côte d’Ivoire' }],
  supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual' }, { id: 'S-social', code: 'social', nom: 'Post social 1:1' }],
};

/* Une espace insécable tient le tiret au mot qui le suit : jamais
 * « Key visual — » pendu en fin de ligne. La marque que porte le code reste
 * dans le titre : sur une planche, elle seule distingue deux KV d'un marché. */
async function kvSeul() {
  const ctx = await bac();
  ctx.DEPOT = depot(REFERENTIEL);
  vm.runInContext(await lire('kv-modele'), ctx, { filename: 'kv-modele.js' });
  return ctx.KV;
}

test('KV.titre dit la pièce en clair et garde le code en surtitre, sans toucher au nom', async () => {
  const KV = await kvSeul();
  const cas = [
    [{ nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'Key visual —\u00a0Ghana ·\u00a0Orvelle', 'KV · GH · Orvelle'],
    [{ nom: 'KV · GH', support: 'S-kv', marche: 'M-gh' }, 'Key visual —\u00a0Ghana', 'KV · GH'],
    [{ nom: 'KV · GH', support: 'S-kv', marche: 'M-gh', kv: { marque: 'Peak' } }, 'Key visual —\u00a0Ghana ·\u00a0Peak', 'KV · GH'],
    [{ nom: 'KV master commun · Orvelle', support: 'S-kv', niveau: 'maitre' }, 'Key visual master ·\u00a0Orvelle', 'KV master commun · Orvelle'],
    [{ nom: 'KV master commun', support: 'S-kv', niveau: 'maitre' }, 'Key visual master', 'KV master commun'],
    [{ nom: 'Post social 1:1 · CI', support: 'S-social', marche: 'M-ci' }, 'Post social 1:1 —\u00a0Côte d’Ivoire', 'Post social 1:1 · CI'],
    [{ nom: 'Key visual — Ghana', support: 'S-kv', marche: 'M-gh' }, 'Key visual —\u00a0Ghana', null],
    [{ nom: 'Affiche de lancement', support: 'S-kv', marche: 'M-gh' }, 'Affiche de lancement', null],
    [{ nom: 'KV · CI · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'KV ·\u00a0CI ·\u00a0Orvelle', null],
  ];
  for (const [l, titre, surtitre] of cas) {
    const avant = JSON.stringify(l);
    assert.equal(KV.titre(l), titre, l.nom);
    assert.equal(KV.surtitre(l), surtitre, l.nom);
    assert.equal(JSON.stringify(l), avant, 'le nom enregistré ne change pas');
  }
});

test('deux KV du même marché pour deux marques ont deux titres', async () => {
  const KV = await kvSeul();
  const titres = ['KV · GH · Peak', 'KV · GH · Cowbell', 'KV · GH · Bonnet Rouge']
    .map(nom => KV.titre({ nom, support: 'S-kv', marche: 'M-gh' }));
  assert.deepEqual(titres, ['Key visual —\u00a0Ghana ·\u00a0Peak', 'Key visual —\u00a0Ghana ·\u00a0Cowbell', 'Key visual —\u00a0Ghana ·\u00a0Bonnet Rouge']);
  const masters = ['KV master commun · Orvelle', 'KV master commun · Lumen']
    .map(nom => KV.titre({ nom, support: 'S-kv', niveau: 'maitre' }));
  assert.equal(new Set(masters).size, 2, masters.join(' | '));
});

test('un nom posé par l’outil suit la marque ; un nom écrit par l’équipe ne bouge pas', async () => {
  const KV = await kvSeul();
  const neuf = { nom: 'Key visual master', support: 'S-kv', niveau: 'maitre', kv: { marque: 'Orvelle' } };
  assert.equal(KV.nomDeTravail(neuf), 'Key visual master · Orvelle');
  assert.equal(KV.suivreMarque(neuf, ''), true);
  assert.equal(neuf.nom, 'Key visual master · Orvelle');
  neuf.kv.marque = 'Lumen';
  KV.suivreMarque(neuf, 'Orvelle');
  assert.equal(neuf.nom, 'Key visual master · Lumen');

  const ada = { nom: 'Key visual — Ghana · Peak', support: 'S-kv', marche: 'M-gh', kv: { marque: 'Cowbell' } };
  KV.suivreMarque(ada, 'Peak');
  assert.equal(ada.nom, 'Key visual — Ghana · Cowbell');

  const code = { nom: 'KV · GH · Peak', support: 'S-kv', marche: 'M-gh', kv: { marque: 'Cowbell' } };
  KV.suivreMarque(code, 'Peak');
  assert.equal(code.nom, 'KV · GH · Cowbell', 'un code reste un code');

  const ecrit = { nom: 'Affiche de lancement', support: 'S-kv', marche: 'M-gh', kv: { marque: 'Cowbell' } };
  assert.equal(KV.suivreMarque(ecrit, 'Peak'), false);
  assert.equal(ecrit.nom, 'Affiche de lancement');
});

/* ————— L'auteur d'un retour posé sur l'image ————— */

const { bac: bacDecisions, semer, projet, livrable, PERSONNES, bouton, saisie, cliquer, soumettre } = await import('./decisions-scenarios.mjs');
const APP = new URL('../app/', import.meta.url).pathname;
function trouver(n, test) {
  if (!n || typeof n !== 'object') return null;
  if (test(n)) return n;
  for (const e of n.childNodes || []) { const r = trouver(e, test); if (r) return r; }
  return null;
}

async function annoter(choisir) {
  const s = await bacDecisions(APP, 31);
  await s.charger('annotation');
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('AN', { livrables: [livrable('L-an')] })] });
  choisir(s.ctx.ACTEUR);
  const p = s.ctx.DEPOT.trouve('projets', 'AN');
  const l = p.livrables[0];
  s.ctx.ANNOT.nouvelle(p, l, 40, 30, () => {}, null, null);
  const panneau = s.dernier();
  const auteur = trouver(panneau, n => n.tagName === 'SELECT');
  const options = (auteur.childNodes || []).map(o => [o.getAttribute('value'), o.textContent]);
  return { s, l, panneau, auteur, options,
    poser(texte, valeur) {
      if (valeur !== undefined) auteur.value = valeur;
      saisie(panneau).value = texte;
      cliquer(bouton(panneau, 'Poser'));
      return l.annotations[l.annotations.length - 1];
    } };
}

test('un retour posé sur l’image est d’abord celui de la personne du poste ; le client est un choix explicite', async () => {
  const a = await annoter(() => {});
  assert.equal(a.auteur.value, 'P-recette', 'la personne déclarée sur ce poste est choisie d’avance');
  assert.ok(a.options.some(([v, t]) => v === 'client' && t === 'Le client'), '« Le client » reste proposé');
  assert.ok(!a.options.some(([, t]) => /— le client —/.test(t)));
  const r = a.poser('Agrandir le logo');
  assert.equal(r.auteur, 'P-recette');
  assert.equal('auteurLibre' in r, false);
  assert.equal(a.s.ctx.ANNOT.auteur(r), 'Personne de recette');

  const c = await annoter(() => {});
  const rc = c.poser('Le client veut du rouge', 'client');
  assert.equal(rc.auteur, null);
  assert.equal(c.s.ctx.ANNOT.auteur(rc), 'client', 'choisi explicitement, le retour est celui du client');
});

test('sans personne déclarée, le retour porte le nom du poste, pas celui du client', async () => {
  const a = await annoter(ACTEUR => ACTEUR.choisir(null));
  assert.equal(a.auteur.value, '');
  assert.match(a.options[0][1], /^Moi · /);
  const r = a.poser('Le titre est trop long');
  assert.equal(r.auteur, null);
  assert.equal(r.auteurLibre, a.s.ctx.ACTEUR.nom());
  assert.notEqual(a.s.ctx.ANNOT.auteur(r), 'client');
});

/* ————— Valider, avec le temps de se reprendre —————
 *
 * La note de la validation engagée est ce qui survit à une page fermée ; la
 * page suivante la rejoue avec la même garde de version. Le geste complet, dans
 * un vrai navigateur et avec une base servie, est dans tests/parcours.mjs. */

async function validation(graine, stockage) {
  const s = await bacDecisions(APP, graine);
  if (stockage) for (const [k, v] of stockage) s.ctx.localStorage.setItem(k, v);
  await s.charger('vue-livrable');
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('VA', { livrables: [livrable('L-va', { nom: 'Affiche · CM' })] })] });
  const minuteries = [], avis = [];
  s.ctx.setTimeout = f => { minuteries.push(f); return minuteries.length; };
  s.ctx.AVIS = { refus: m => avis.push(['refus', m]), fait: m => avis.push(['fait', m]), grave: m => avis.push(['grave', m]),
    action: t => { avis.push(['action', t]); return {}; }, retirer() {} };
  const p = s.ctx.DEPOT.trouve('projets', 'VA');
  return { s, p, l: p.livrables[0], minuteries, avis, notes: () => JSON.parse(s.ctx.localStorage.getItem('la-barre-validations') || '[]') };
}

test('une validation engagée est notée sur-le-champ, et rien ne s’écrit avant l’échéance', async () => {
  const v = await validation(41);
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  assert.equal(v.l.versions[0].verdict, undefined);
  assert.deepEqual(v.notes().map(n => [n.livrableId, n.numero, n.verdict, n.rejouer]), [['L-va', 1, 'approuve', false]]);
  v.minuteries[0]();
  assert.equal(v.l.versions[0].verdict, 'approuve');
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 1);
  assert.deepEqual(v.notes(), [], 'écrite, la note est retirée');
});

test('à l’échéance, la pièce quittée : un avis dit la validation enregistrée ; la pièce à l’écran se redessine sans avis', async () => {
  const v = await validation(63);
  let rendus = 0;
  v.s.ctx.APP = { rendre: () => { rendus++; } };
  v.s.ctx.scrollTo = () => {};
  v.s.ctx.location.hash = '#/valider/file';
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  v.minuteries[0]();
  assert.equal(v.l.versions[0].verdict, 'approuve');
  assert.deepEqual(v.avis[v.avis.length - 1], ['fait', 'Validation de la V1 de « Affiche · CM » enregistrée.']);
  assert.equal(rendus, 1, 'Décisions, qui listait la version, se redessine');

  for (const [hash, attendu] of [['#/projets/VA/livrables/autre/juger', 0], ['#/planning', 0], ['#/bureau', 1], ['', 1]]) {
    const u = await validation(65);
    let n = 0;
    u.s.ctx.APP = { rendre: () => { n++; } };
    u.s.ctx.scrollTo = () => {};
    u.s.ctx.location.hash = hash;
    cliquer(bouton(u.s.ctx.VUE_LIVRABLE.decider(u.p, u.l, () => {}), 'Valider la V1'));
    u.minuteries[0]();
    assert.equal(n, attendu, 'redessin sur « ' + hash + ' »');
  }

  const w = await validation(64);
  let dessins = 0;
  const bloc = w.s.ctx.VUE_LIVRABLE.decider(w.p, w.l, () => { dessins++; });
  w.s.ctx.document.querySelectorAll = () => [bloc];
  cliquer(bouton(bloc, 'Valider la V1'));
  const avant = w.avis.length;
  w.minuteries[0]();
  assert.equal(dessins, 2, 'le bloc affiché est redessiné à l’échéance');
  assert.equal(w.avis.length, avant, 'il montre lui-même la décision : pas d’avis en plus');
});

test('« Annuler la validation » resté à l’écran après l’échéance dit qu’elle est enregistrée', async () => {
  const v = await validation(42);
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  const attente = v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {});
  v.minuteries[0]();
  cliquer(bouton(attente, 'Annuler la validation'));
  assert.deepEqual(v.avis[v.avis.length - 1], ['fait', 'La validation est déjà enregistrée.']);
  assert.equal(v.l.versions[0].verdict, 'approuve');
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 1);
});

test('une note déjà prise par un autre onglet ne s’écrit pas une seconde fois', async () => {
  const v = await validation(48);
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  v.s.ctx.localStorage.removeItem('la-barre-validations');   // l'autre onglet l'a rejouée
  v.minuteries[0]();
  assert.equal(v.l.versions[0].verdict, undefined);
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 0);
  assert.match(v.avis[v.avis.length - 1][1], /enregistrée depuis un autre onglet/);
  const redessine = v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {});
  assert.ok(!boutons(redessine).includes('Valider la V1'), 'la base de cet onglet est en retard : la validation ne se repropose pas');
  assert.match(textes(redessine), /V1 validée depuis un autre onglet\. Rechargez la page pour la voir\./);
  assert.ok(boutons(redessine).includes('Recharger la page'));
  assert.equal(v.s.ctx.VUE_LIVRABLE.valideeAilleurs(v.l, 1), true, 'la page de la pièce le sait aussi');
  v.s.ctx.VUE_LIVRABLE.juger(v.p, v.l, v.s.ctx.MAISON.verdicts.find(x => x.cle === 'approuve'), () => {});
  assert.equal(v.minuteries.length, 1, 'aucune seconde validation engagée');
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 0);
});

test('annulée à temps, la validation ne laisse ni décision ni note', async () => {
  const v = await validation(43);
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Annuler la validation'));
  v.minuteries[0]();
  assert.deepEqual(v.avis[v.avis.length - 1], ['fait', "Validation annulée : rien n'a été enregistré."]);
  assert.equal(v.l.versions[0].verdict, undefined);
  assert.deepEqual(v.notes(), []);
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 0);
});

test('une page fermée avant l’échéance : la note se rejoue à la réouverture, sauf si la pièce a changé', async () => {
  const avant = await validation(44);
  cliquer(bouton(avant.s.ctx.VUE_LIVRABLE.decider(avant.p, avant.l, () => {}), 'Valider la V1'));
  const note = { ...avant.notes()[0], rejouer: true };   // ce que pagehide écrit
  const stockage = [['la-barre-validations', JSON.stringify([note])]];

  const apres = await validation(45, stockage);
  assert.equal(apres.s.ctx.VUE_LIVRABLE.reprendreValidations(), 1);
  assert.equal(apres.l.versions[0].verdict, 'approuve');
  assert.equal(apres.s.ctx.DEPOT.liste('decisions').length, 1);
  assert.deepEqual(apres.avis, [['fait', 'Validation de la V1 de « Affiche · CM » enregistrée.']]);
  assert.deepEqual(apres.notes(), []);
  assert.equal(apres.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'une note ne se rejoue qu’une fois');

  const changee = await validation(46, stockage);
  changee.l.vignette = 'assets/review/autre.jpg';
  changee.s.ctx.VUE_LIVRABLE.reprendreValidations();
  assert.equal(changee.l.versions[0].verdict, undefined, 'une pièce changée n’est pas validée à l’aveugle');
  assert.equal(changee.s.ctx.DEPOT.liste('decisions').length, 0);
  assert.deepEqual(changee.avis.map(a => a[0]), ['grave'], 'un avis qui reste');
  assert.match(changee.avis[0][1], /n'a pas été enregistrée : la pièce a changé depuis/);
  assert.deepEqual(changee.notes(), []);

  /* Déjà écrite par la page fermée (sa base l'a), la note se retire sans rien
   * compter : aucun redessin pour rien. */
  const deja = await validation(49, stockage);
  deja.l.versions[0].verdict = 'approuve';
  assert.equal(deja.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0);
  assert.deepEqual(deja.avis, []);
  assert.deepEqual(deja.notes(), []);

  const ouverte = await validation(47, [['la-barre-validations', JSON.stringify([{ ...note, rejouer: false, quand: '2026-11-10T09:00:00.000Z' }])]]);
  assert.equal(ouverte.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'la note d’une page encore ouverte n’est pas prise');
  assert.equal(ouverte.notes().length, 1);
});

test('un onglet resté ouvert écrit la note d’un onglet fermé, mais n’abandonne pas une note qu’il ne reconnaît pas', async () => {
  const avant = await validation(60);
  cliquer(bouton(avant.s.ctx.VUE_LIVRABLE.decider(avant.p, avant.l, () => {}), 'Valider la V1'));
  const stockage = [['la-barre-validations', JSON.stringify([{ ...avant.notes()[0], rejouer: true }])]];

  const retard = await validation(61, stockage);
  retard.l.vignette = 'assets/review/autre.jpg';   // sa base n'est pas celle de l'onglet fermé
  assert.equal(retard.s.ctx.VUE_LIVRABLE.reprendreValidations({ surPlace: true }), 0);
  assert.deepEqual(retard.avis, [], 'aucun avis : la note n’est pas tranchée ici');
  assert.equal(retard.notes().length, 1, 'elle reste pour la prochaine ouverture');
  assert.equal(retard.s.ctx.DEPOT.liste('decisions').length, 0);

  const ouvert = await validation(62, stockage);
  assert.equal(ouvert.s.ctx.VUE_LIVRABLE.reprendreValidations({ surPlace: true }), 1);
  assert.equal(ouvert.l.versions[0].verdict, 'approuve');
  assert.deepEqual(ouvert.avis, [['fait', 'Validation de la V1 de « Affiche · CM » enregistrée.']]);
  assert.deepEqual(ouvert.notes(), []);
});

/* L'horloge du bac (decisions-scenarios.mjs) part du 10 novembre à 9 h et
 * avance d'une seconde à chaque lecture. */
test('une note jamais marquée (onglet tué sans pagehide) se rejoue passé 128 s, et pas avant', async () => {
  const avant = await validation(54);
  cliquer(bouton(avant.s.ctx.VUE_LIVRABLE.decider(avant.p, avant.l, () => {}), 'Valider la V1'));
  const note = avant.notes()[0];
  assert.equal(note.rejouer, false);

  const vieille = { ...note, quand: '2026-11-10T08:57:00.000Z' };   // trois minutes avant
  const ancienne = await validation(55, [['la-barre-validations', JSON.stringify([vieille])]]);
  assert.equal(ancienne.s.ctx.VUE_LIVRABLE.reprendreValidations(), 1);
  assert.equal(ancienne.l.versions[0].verdict, 'approuve');
  assert.equal(ancienne.s.ctx.DEPOT.liste('decisions').length, 1);
  assert.equal(ancienne.l.versions[0].juge_le, '2026-11-10T08:57:08.000Z', 'datée du clic et du délai d’annulation, pas du rejeu');
  assert.equal(ancienne.s.ctx.DEPOT.liste('decisions')[0].quand, '2026-11-10T08:57:08.000Z', 'la date que lit Radar est la même');
  assert.deepEqual(ancienne.notes(), [], 'rejouée, la note est retirée');
  assert.equal(ancienne.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'une note ne se rejoue qu’une fois');
  assert.equal(ancienne.s.ctx.DEPOT.liste('decisions').length, 1);

  const recente = { ...note, quand: '2026-11-10T08:59:00.000Z' };   // une minute avant
  const ouverte = await validation(56, [['la-barre-validations', JSON.stringify([recente])]]);
  assert.equal(ouverte.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'moins de 128 s : la page qui l’a posée est peut-être encore ouverte');
  assert.equal(ouverte.l.versions[0].verdict, undefined);
  assert.equal(ouverte.s.ctx.DEPOT.liste('decisions').length, 0);
  assert.deepEqual(ouverte.notes().map(n => n.id), [note.id], 'la note reste à sa place');
});

test('une page revenue du cache de navigation reprend sa validation : la note n’est plus à rejouer ailleurs', async () => {
  const v = await validation(57);
  const ecouteurs = {};
  v.s.ctx.addEventListener = (type, f) => { (ecouteurs[type] ||= []).push(f); };
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  ecouteurs.pagehide.forEach(f => f({ persisted: true }));
  assert.deepEqual(v.notes().map(n => n.rejouer), [true], 'la page qui se cache marque sa note');
  ecouteurs.pageshow.forEach(f => f({ persisted: true }));
  assert.deepEqual(v.notes().map(n => n.rejouer), [false], 'revenue, elle la reprend');

  const ailleurs = await validation(58, [['la-barre-validations', JSON.stringify(v.notes())]]);
  assert.equal(ailleurs.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'un autre onglet ne la prend pas');
  v.minuteries[0]();
  assert.equal(v.l.versions[0].verdict, 'approuve', 'elle s’écrit ici, à son échéance');
  assert.deepEqual(v.notes(), []);

  const recharge = await validation(59);
  const sur = {};
  recharge.s.ctx.addEventListener = (type, f) => { (sur[type] ||= []).push(f); };
  cliquer(bouton(recharge.s.ctx.VUE_LIVRABLE.decider(recharge.p, recharge.l, () => {}), 'Valider la V1'));
  sur.pagehide.forEach(f => f({ persisted: false }));
  sur.pageshow.forEach(f => f({ persisted: false }));
  assert.deepEqual(recharge.notes().map(n => n.rejouer), [true], 'une page neuve ne démarque pas la note d’une autre');
});

/* ————— Décider depuis la fiche de la pièce ————— */

const textes = n => (n && n.textContent) || '';
const boutons = n => {
  const out = [];
  (function voir(x) { if (!x || typeof x !== 'object') return; if (x.tagName === 'BUTTON') out.push(x.textContent.trim()); (x.childNodes || []).forEach(voir); })(n);
  return out;
};

test('la fiche propose les deux mêmes boutons que la page, le reste sous « Autre décision », sans coût affiché', async () => {
  const v = await validation(51);
  v.s.ctx.REGLES.prix = () => 'Aucun critère écrit.';
  const bloc = v.s.ctx.VUE_LIVRABLE.criteres(v.p, v.l, () => {}, true);
  const b = boutons(bloc);
  assert.ok(b.includes('Valider la V1') && b.includes('Demander des modifs'), b.join(' | '));
  assert.ok(b.includes('Valider avec réserves') && b.includes('Refuser : hors brief'));
  assert.match(textes(bloc), /Autre décision/);
  assert.doesNotMatch(textes(bloc), /Hors périmètre|passerait à|chiffrage/);
});

test('une version déjà décidée ne se valide pas d’un clic depuis la fiche : le panneau dit que la décision s’ajoute', async () => {
  const v = await validation(52);
  v.s.ctx.REGLES.prix = () => 'Aucun critère écrit.';
  Object.assign(v.l.versions[0], { verdict: 'retour', motif: 'Logo trop petit', juge_le: '2026-11-04T08:00:00.000Z' });
  const bloc = v.s.ctx.VUE_LIVRABLE.criteres(v.p, v.l, () => {}, true);
  assert.match(textes(bloc), /Logo trop petit/, 'la décision et son motif restent lisibles');
  assert.match(textes(bloc), /Changer la décision/);
  assert.ok(!boutons(bloc).includes('Valider la V1'), 'pas de validation en un clic');
  cliquer(bouton(bloc, 'Valider'));
  assert.equal(v.minuteries.length, 0, 'aucun engagement différé');
  assert.equal(v.l.versions[0].verdict, 'retour', 'rien n’est écrit sans confirmer');
  const panneau = v.s.dernier();
  assert.match(textes(panneau), /Cette version a déjà une décision\. La nouvelle s'ajoute à son historique\./);
  soumettre(panneau);
  assert.equal(v.l.versions[0].verdict, 'approuve');
  assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 1);
});

test('« Autre décision » exige son motif : des réserves ou un refus sans texte n’écrivent rien et disent quoi écrire', async () => {
  for (const [cle, vide, motif] of [['reserve', 'Dites quelles réserves vous posez.', 'Le fond peut être plus clair'],
    ['hors', 'Dites ce qui sort du brief.', 'Un second visuel n’était pas au devis']]) {
    const v = await validation(53);
    const verdict = v.s.ctx.MAISON.verdicts.find(x => x.cle === cle);
    v.s.ctx.VUE_LIVRABLE.juger(v.p, v.l, verdict, () => {});
    const panneau = v.s.dernier();
    assert.equal(saisie(panneau).value, '');
    soumettre(panneau);
    assert.match(textes(panneau), new RegExp(vide.replace('.', '\\.')));
    assert.equal(v.l.versions[0].verdict, undefined, cle + ' : rien n’est écrit sans motif');
    assert.equal(v.s.ctx.DEPOT.liste('decisions').length, 0);
    saisie(panneau).value = motif;
    soumettre(panneau);
    assert.equal(v.l.versions[0].verdict, cle);
    assert.equal(v.l.versions[0].motif, motif);
  }
});

/* ————— Valider un document (brief, plateforme, stratégie, big idea) ————— */

test('la validation d’un document : des boutons qui disent le geste, des refus qui disent quoi écrire', async () => {
  const s = await bacDecisions(APP, 61);
  await s.charger('validation');
  const el = s.ctx.O.el;
  s.ctx.UI = new Proxy({ banniere: (ton, t) => el('div', {}, t), eti: t => el('span', {}, t), stat: (a, b, c) => el('div', {}, a, ' ', b, ' ', c) },
    { get: (t, k) => t[k] || (() => el('div')) });
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('DO')] });
  const p = s.ctx.DEPOT.trouve('projets', 'DO');
  const bande = s.ctx.VALIDATION.bande(p, 'brief', p.sections.brief, () => {});
  const b = boutons(bande);
  for (const g of ['✓ Valider', '◐ Valider avec réserves', '↩ Demander des modifs', '✕ Refuser : hors périmètre']) {
    assert.ok(b.includes(g), g + ' dans ' + b.join(' | '));
  }
  assert.doesNotMatch(textes(bande), /Validé avec réserves|Modifs demandées|hors brief|verdict/);

  const verdict = cle => s.ctx.MAISON.verdicts.find(v => v.cle === cle);
  s.ctx.VALIDATION.rendre(p, 'brief', p.sections.brief, verdict('hors'), () => {});
  const refus = s.dernier();
  cliquer(bouton(refus, 'Refuser : hors périmètre'));
  assert.match(textes(refus), /Choisissez un critère ou écrivez pourquoi vous refusez\./);
  assert.doesNotMatch(textes(refus), /verdict|par goût|hors brief/i);
  assert.equal(p.sections.brief.validation, undefined, 'sans motif, rien n’est écrit');
  saisie(refus).value = 'Le brief demande un second marché';
  cliquer(bouton(refus, 'Refuser : hors périmètre'));
  assert.equal(p.sections.brief.validation.verdict, 'hors');
  const trace = s.ctx.DEPOT.tout().journal.filter(e => e.action === 'verdict').pop();
  assert.equal(trace.detail, 'Refusé : hors périmètre — Le brief demande un second marché', 'le journal dit ce que l’écran a dit');
  delete p.sections.brief.validation;

  s.ctx.VALIDATION.rendre(p, 'brief', p.sections.brief, verdict('approuve'), () => {});
  cliquer(bouton(s.dernier(), 'Valider'));
  assert.equal(p.sections.brief.validation.verdict, 'approuve');
  const bandeApres = s.ctx.VALIDATION.bande(p, 'brief', p.sections.brief, () => {});
  const apres = textes(bandeApres);
  assert.match(apres, /Validé le \d+ [a-zé]+\. Le travail créatif peut commencer\./);
  assert.doesNotMatch(apres, /\.\./, 'un seul point après la date');
  assert.ok(!boutons(bandeApres).includes('✓ Valider'), 'une version validée ne se repropose pas à valider');
  assert.ok(boutons(bandeApres).includes('↩ Demander des modifs'));
  /* Sous « Validé le … », les autres décisions se rangent sous « Changer la
   * décision », comme sur la page d'une pièce : pas de clic par mégarde. */
  const gestesDirects = n => {
    const out = [];
    (function voir(x) { if (!x || typeof x !== 'object' || x.tagName === 'DETAILS') return;
      if (x.tagName === 'BUTTON' && x.getAttribute('data-geste')) out.push(x.textContent.trim()); (x.childNodes || []).forEach(voir); })(n);
    return out;
  };
  assert.deepEqual(gestesDirects(bandeApres), [], 'aucune décision proposée à découvert sous « Validé le … »');
  const changer = trouver(bandeApres, n => n.tagName === 'DETAILS');
  assert.equal(trouver(changer, n => n.tagName === 'SUMMARY').textContent, 'Changer la décision');
  assert.deepEqual(boutons(changer), ['◐ Valider avec réserves', '↩ Demander des modifs', '✕ Refuser : hors périmètre']);
  assert.deepEqual(gestesDirects(bande), ['✓ Valider', '◐ Valider avec réserves', '↩ Demander des modifs', '✕ Refuser : hors périmètre'],
    'sans décision, les quatre gestes restent à découvert');

  /* Une validation « pour travail » reste à confirmer : « Valider » reste à
   * découvert, le reste sous « Changer la décision ». */
  p.sections.brief.validation.portee = 'travail';
  const pourTravail = s.ctx.VALIDATION.bande(p, 'brief', p.sections.brief, () => {});
  assert.deepEqual(gestesDirects(pourTravail), ['✓ Valider']);
  assert.deepEqual(boutons(trouver(pourTravail, n => n.tagName === 'DETAILS')), ['◐ Valider avec réserves', '↩ Demander des modifs', '✕ Refuser : hors périmètre']);
});

/* ————— Enregistrer un retour client ————— */

test('un retour WhatsApp s’enregistre sans bannière rouge, étiquettes reliées, un refus à la fois dit sur place', async () => {
  const s = await bacDecisions(APP, 71);
  await s.charger('kv-modele');
  await s.charger('feedback');
  s.ctx.PRODUCTION.ouverte = () => false;
  const el = s.ctx.O.el, bannieres = [];
  s.ctx.UI = new Proxy({ banniere: (ton, t) => { bannieres.push([ton, t]); return el('div', {}, t); },
    stat: (a, b, c) => el('div', {}, a, ' ', b, ' ', c) }, { get: (t, k) => t[k] || (() => el('div')) });
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL,
    projets: [projet('FB', { livrables: [livrable('L-fb', { nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh' })] })] });
  s.ctx.FEEDBACK.ouvrir('FB', ['L-fb'], () => {});
  const panneau = s.dernier();
  const tous = (n, f, out = []) => { if (n && typeof n === 'object') { if (f(n)) out.push(n); (n.childNodes || []).forEach(c => tous(c, f, out)); } return out; };

  const canal = tous(panneau, n => n.getAttribute && n.getAttribute('id') === 'fb-canal')[0];
  canal.value = 'message';
  (canal.ecouteurs.change || []).forEach(f => f());
  assert.deepEqual(bannieres.filter(([ton]) => ton === 'rouge'), [], 'aucune bannière rouge sur le canal messagerie');
  assert.doesNotMatch(textes(panneau), /WhatsApp n'a pas de version|n'existe pas|comptable/);
  assert.match(textes(panneau), /Notez le retour tel qu'il a été dit ou écrit, même sur WhatsApp/);
  assert.match(textes(panneau), /Rien d'autre ne bouge\. Se traite en dernier/, 'le niveau se dit avec une majuscule');

  const labels = tous(panneau, n => n.tagName === 'LABEL');
  assert.ok(labels.length >= 5);
  for (const l of labels) {
    const cible = l.getAttribute('for');
    assert.ok(cible, 'l’étiquette « ' + l.textContent + ' » a un for');
    assert.equal(tous(panneau, n => n.getAttribute && n.getAttribute('id') === cible).length, 1, cible);
  }
  const puce = tous(panneau, n => n.tagName === 'BUTTON' && /chip/.test(n.className))[0];
  assert.equal(puce.textContent, 'Key visual —\u00a0Ghana ·\u00a0Orvelle');
  assert.equal(puce.getAttribute('title'), 'KV · GH · Orvelle', 'le code reste en info-bulle');

  cliquer(bouton(panneau, 'Enregistrer'));
  assert.match(textes(panneau), /Écrivez ce qui est demandé avant d'enregistrer\./);
  saisie(panneau).value = 'Le logo plus grand';
  cliquer(bouton(panneau, 'Enregistrer'));
  assert.match(textes(panneau), /Dites qui a formulé ce retour/);
  assert.doesNotMatch(textes(panneau), /Écrivez ce qui est demandé/, 'le refus corrigé ne reste pas');
  assert.deepEqual(s.refus, []);
  assert.equal(s.ctx.DEPOT.liste('feedbacks').length, 0);
});

test('un retour enregistré le dit, avec la pièce, et mène au bloc des retours', async () => {
  const s = await bacDecisions(APP, 72);
  await s.charger('kv-modele');
  await s.charger('feedback');
  s.ctx.PRODUCTION.ouverte = () => false;
  const el = s.ctx.O.el, avis = [];
  s.ctx.UI = new Proxy({ banniere: (ton, t) => el('div', {}, t), stat: (a, b, c) => el('div', {}, a, ' ', b, ' ', c) },
    { get: (t, k) => t[k] || (() => el('div')) });
  s.ctx.AVIS = { refus: m => avis.push(['refus', m]), fait: m => avis.push(['fait', m]), grave() {}, retirer() {},
    action: (t, libelle, quand) => { avis.push(['action', t, libelle]); quand(); } };
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL,
    projets: [projet('FB', { livrables: [livrable('L-fb', { nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh' })] })] });
  let vu = 0;
  s.ctx.FEEDBACK.ouvrir('FB', ['L-fb'], () => {}, () => { vu++; });
  const panneau = s.dernier();
  const tous = (n, f, out = []) => { if (n && typeof n === 'object') { if (f(n)) out.push(n); (n.childNodes || []).forEach(c => tous(c, f, out)); } return out; };
  saisie(panneau).value = 'Le logo plus grand';
  tous(panneau, n => n.getAttribute && n.getAttribute('id') === 'fb-auteur')[0].value = 'P:P-recette';
  cliquer(bouton(panneau, 'Enregistrer'));
  assert.equal(s.ctx.DEPOT.liste('feedbacks').length, 1);
  assert.deepEqual(avis, [['action', 'Retour enregistré sur « Key visual —\u00a0Ghana ·\u00a0Orvelle ».', 'Voir les retours']]);
  assert.equal(vu, 1, '« Voir les retours » mène au bloc des retours de la pièce');
});

test('la recherche dit le référentiel en mots, pas par sa clé', async () => {
  const s = await bacDecisions(APP, 73);
  s.ctx.document.addEventListener = () => {};
  await s.charger('kv-modele');
  await s.charger('application');
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, assets: [{ id: 'A-logo', nom: 'Logo Ghana' }], projets: [] });
  const ou = [...s.ctx.APP.chercher('Ghana')].map(r => r.quoi + ' — ' + r.ou);
  assert.deepEqual(ou, ['Ghana — Marché', 'Logo Ghana — Visuel de marque']);
  assert.deepEqual([...s.ctx.APP.chercher('Post social')].map(r => r.ou), ['Support']);
});

test('« KV GH » trouve un KV né avec un nom en clair, et lui seul', async () => {
  const s = await bacDecisions(APP, 74);
  s.ctx.document.addEventListener = () => {};
  await s.charger('kv-modele');
  await s.charger('application');
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('OR')] });
  const p = s.ctx.DEPOT.trouve('projets', 'OR');
  const master = s.ctx.KV.creer(p, null, null, 'maitre', { marque: 'Orvelle' });
  s.ctx.KV.creer(p, 'M-gh', master, 'adaptation');
  s.ctx.KV.creer(p, 'M-ci', master, 'adaptation');
  p.livrables.push({ id: 'F-so', nom: 'Post social 1:1 · CI', support: 'S-social', marche: 'M-ci' });
  const trouve = q => [...s.ctx.APP.chercher(q)].filter(r => /livrables/.test(r.lien)).map(r => r.quoi.replace(/\u00a0/g, ' ') + ' — ' + r.ou);
  assert.deepEqual(trouve('KV GH'), ['Key visual — Ghana · Orvelle — REF-OR · KV · GH · Orvelle']);
  assert.deepEqual(trouve('kv · ci'), ['Key visual — Côte d’Ivoire · Orvelle — REF-OR · KV · CI · Orvelle']);
  assert.equal(trouve('KV').length, 3, 'le master et ses deux adaptations');
  assert.deepEqual(trouve('Ghana Orvelle'), ['Key visual — Ghana · Orvelle — REF-OR · KV · GH · Orvelle']);
});

/* ————— Le code reste la clé de rapprochement —————
 *
 * Un KV neuf s'appelle « Key visual — Ghana · Orvelle », mais l'agence nomme
 * ses fichiers par code : « KV_GH_Orvelle_V3.jpg ». Sans le code dans les mots
 * du KV, « GH » ne désignait plus que l'affiche du Ghana, et le rendu du KV
 * allait « sûr » sous l'affiche : cette erreur-là s'imprime. */

async function dossierDeRendus(nommer) {
  const s = await bacDecisions(APP, 91);
  for (const nom of ['kv-modele', 'apparier', 'image']) await s.charger(nom);
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('OR')],
    marches: [{ id: 'M-gh', code: 'GH', nom: 'Ghana', langues: ['en'] }, { id: 'M-ci', code: 'CI', nom: 'Côte d’Ivoire', langues: ['fr'] },
      { id: 'M-sn', code: 'SN', nom: 'Sénégal', langues: ['fr'] }],
    supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual', type: 'kv' }, { id: 'S-aff', code: 'affiche', nom: 'Affiche 4×3' },
      { id: 'S-so', code: 'social', nom: 'Post social 1:1' }] });
  const { KV, DEPOT } = s.ctx;
  const p = DEPOT.trouve('projets', 'OR');
  const master = KV.creer(p, null, null, 'maitre', { marque: 'Orvelle' });
  const kvs = ['M-gh', 'M-ci', 'M-sn'].map(m => KV.creer(p, m, master, 'adaptation'));
  if (nommer) nommer([master, ...kvs]);
  p.livrables.push({ id: 'F-aff', nom: 'Affiche 4×3 · GH', support: 'S-aff', marche: 'M-gh', maitre: kvs[0].id, niveau: 'declinaison' });
  p.livrables.push({ id: 'F-so', nom: 'Post social 1:1 · CI', support: 'S-so', marche: 'M-ci', maitre: kvs[1].id, niveau: 'declinaison' });
  return { s, p, KV, master, kvs, apparier: noms => s.ctx.IMAGE.apparier(p.livrables, noms.map(name => ({ name }))) };
}

test('KV.code redonne le code d’un KV nommé en clair ; un nom écrit par l’équipe n’en a pas', async () => {
  const d = await dossierDeRendus();
  assert.deepEqual([d.master, ...d.kvs].map(l => [l.nom, d.KV.code(l)]), [
    ['Key visual master · Orvelle', 'KV master commun · Orvelle'],
    ['Key visual — Ghana · Orvelle', 'KV · GH · Orvelle'],
    ['Key visual — Côte d’Ivoire · Orvelle', 'KV · CI · Orvelle'],
    ['Key visual — Sénégal · Orvelle', 'KV · SN · Orvelle']]);
  assert.equal(d.KV.code({ nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh', kv: {} }), 'KV · GH · Orvelle');
  assert.equal(d.KV.code({ nom: 'Affiche 4×3 · GH', support: 'S-aff', marche: 'M-gh' }), 'Affiche 4×3 · GH');
  assert.equal(d.KV.code({ nom: 'Affiche de lancement', support: 'S-kv', marche: 'M-gh', kv: {} }), null);
  assert.equal(d.KV.code({ nom: 'Post de la semaine', support: 'S-so', marche: 'M-ci' }), null);
});

test('un rendu nommé par code va sûr sur son KV nommé en clair, jamais sur l’affiche du même marché', async () => {
  const d = await dossierDeRendus();
  const [gh, ci, sn] = d.kvs;
  for (const [fichier, attendu] of [['KV-GH-Orvelle.png', gh], ['KV_GH_Orvelle_V3.jpg', gh], ['KV_CI_Orvelle_V3.jpg', ci],
    ['KV_SN_Orvelle_V3.jpg', sn], ['Orvelle KV CI V2.jpg', ci], ['KV Ghana Orvelle.png', gh], ['KV_master_Orvelle.jpg', d.master]]) {
    const [r] = d.apparier([fichier]);
    assert.equal(r.etat, 'sur', fichier + ' : ' + r.etat + ' ' + r.score.toFixed(2));
    assert.equal(r.l, attendu, fichier + ' va sous ' + (r.l && r.l.nom));
  }
  const [affiche] = d.apparier(['Affiche_4x3_GH.jpg']);
  assert.equal(affiche.l.id, 'F-aff');

  /* Un dossier entier : chaque KV reçoit le sien, l'affiche n'en reçoit aucun. */
  const lot = d.apparier(['KV_GH_Orvelle_V3.jpg', 'KV_CI_Orvelle_V3.jpg', 'KV_SN_Orvelle_V3.jpg']);
  assert.deepEqual(lot.map(r => [r.etat, r.l && r.l.id]), [['sur', gh.id], ['sur', ci.id], ['sur', sn.id]]);
});

test('chaque nom d’un KV compte pour lui-même : un rendu nommé par code a le même score qu’avant', async () => {
  const neuf = await dossierDeRendus();
  const ancien = await dossierDeRendus(ls => {
    ls[0].nom = 'KV master commun · Orvelle';
    ['GH', 'CI', 'SN'].forEach((c, i) => { ls[i + 1].nom = 'KV · ' + c + ' · Orvelle'; });
  });
  /* Le nom en clair ne dilue pas le code : « KV-GH-Orvelle.png » vaut 1, comme
   * contre « KV · GH · Orvelle ». Un fichier au format maison hésite entre les
   * KV, comme avant, au lieu de ne plus rien trouver. */
  for (const fichier of ['KV-GH-Orvelle.png', 'KV_CI_Orvelle_V3.jpg', 'Orvelle KV CI V2.jpg',
    'Orvelle — Lancement — KV 4x3 — Le goût d ici — EN.png', 'Affiche_4x3_GH.jpg']) {
    const [a] = ancien.apparier([fichier]), [n] = neuf.apparier([fichier]);
    assert.deepEqual([n.etat, n.score.toFixed(2), n.l && n.l.id], [a.etat, a.score.toFixed(2), a.l && a.l.id], fichier);
  }
  const [maison] = neuf.apparier(['Orvelle — Lancement — KV 4x3 — Le goût d ici — EN.png']);
  assert.equal(maison.etat, 'hesite');
  assert.ok(neuf.kvs.includes(maison.l), 'il hésite entre les KV, pas vers l’affiche');

  /* Le nom en clair compte aussi : « KV Ghana Orvelle » va sûr sur le KV. */
  const [clair] = neuf.apparier(['KV Ghana Orvelle.png']);
  assert.deepEqual([clair.etat, clair.l], ['sur', neuf.kvs[0]]);
});

test('APPARIER sans formes rapproche comme avant ; avec, chaque forme compte pour elle-même', async () => {
  const s = await bacDecisions(APP, 90);
  await s.charger('apparier');
  const { APPARIER } = s.ctx;
  const c = (ref, ...noms) => ({ ref, mots: [...new Set(noms.flatMap(n => APPARIER.mots(n)))], formes: noms.map(n => APPARIER.mots(n)) });
  const sans = x => ({ ref: x.ref, mots: x.mots });
  const cand = [c('gh', 'Key visual — Ghana · Orvelle', 'KV · GH · Orvelle'), c('aff', 'Affiche 4×3 · GH')];
  const sujet = [{ ref: 'f', mots: APPARIER.mots('KV-GH-Orvelle.png') }];
  const [avec] = APPARIER.rapprocher(cand, sujet), [reunion] = APPARIER.rapprocher(cand.map(sans), sujet);
  assert.equal(avec.score, 1);
  assert.ok(reunion.score < avec.score, 'la réunion seule dilue le code : ' + reunion.score.toFixed(2));
  assert.deepEqual([avec.etat, avec.candidat.ref], ['sur', 'gh']);
});

test('les KV nommés par code, d’avant ce lot, se rapprochent comme avant', async () => {
  const d = await dossierDeRendus(ls => {
    ls[0].nom = 'KV master commun · Orvelle';
    ['GH', 'CI', 'SN'].forEach((c, i) => { ls[i + 1].nom = 'KV · ' + c + ' · Orvelle'; });
  });
  const lot = d.apparier(['KV_GH_Orvelle_V3.jpg', 'KV_CI_Orvelle_V3.jpg', 'KV_SN_Orvelle_V3.jpg', 'KV-GH-Orvelle.png']);
  assert.deepEqual(lot.slice(0, 3).map(r => [r.etat, r.l && r.l.id, r.score]), d.kvs.map(l => ['sur', l.id, 1]));
});

test('le journal nomme un master neuf avec sa marque dès la création', async () => {
  const s = await bacDecisions(APP, 92);
  await s.charger('kv-modele');
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('OR')] });
  const p = s.ctx.DEPOT.trouve('projets', 'OR');
  const master = s.ctx.KV.creer(p, null, null, 'maitre', { marque: ' Orvelle ' });
  s.ctx.KV.creer(p, 'M-gh', master, 'adaptation');
  assert.equal(master.kv.marque, 'Orvelle');
  const creations = [...s.ctx.DEPOT.liste('journal')].filter(j => j.action === 'création' && j.type === 'kv').map(j => j.detail);
  assert.deepEqual([...creations], ['Key visual master · Orvelle', 'Key visual — Ghana · Orvelle']);
  const sans = s.ctx.KV.creer(p, null, null, 'maitre');
  assert.equal(sans.nom, 'Key visual master', 'sans marque saisie, le nom n’en invente pas');
});

/* ————— Un KV sans fichier dit ce qui reste à faire —————
 *
 * Au début d'une campagne, c'est le cas normal : la case ne lit pas un
 * procès-verbal (« Nom de fichier non arrêté », « Accroche non écrite »,
 * « 2 manquements · aucun format n'en hérite encore »). */

function texteDe(n) { return n && typeof n === 'object' ? (n.childNodes || []).map(texteDe).join('|') + (n.data ? n.data : '') : ''; }

test('la case d’un KV sans fichier dit ce qui reste à faire, pas un procès-verbal', async () => {
  const s = await bacDecisions(APP, 93);
  for (const nom of ['kv-modele', 'apparier', 'image', 'trace', 'annotation', 'vue-planche']) await s.charger(nom);
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('OR')] });
  const p = s.ctx.DEPOT.trouve('projets', 'OR');
  const master = s.ctx.KV.creer(p, null, null, 'maitre', { marque: 'Orvelle' });
  const gh = s.ctx.KV.creer(p, 'M-gh', master, 'adaptation');
  for (const l of [master, gh]) {
    const t = texteDe(s.ctx.VUE_PLANCHE.caseKV(p, l, () => {}));
    assert.match(t, /Fichier à nommer/);
    assert.match(t, /visuel à déposer/);
    assert.match(t, /Accroche à écrire/);
    assert.match(t, /\d points? à régler/);
    assert.doesNotMatch(t, /non arrêté|non écrite|manquement|jamais regardé|aucun format n’en hérite|aucun format n'en hérite|aucune version/, t);
  }
  gh.versions = [{ n: 1, soumis_le: '2026-11-03T08:00:00.000Z' }];
  assert.equal(s.ctx.TRACE.attendu(gh).quoi, 'pas encore vu');
});

test('la file accorde « 1 livrable sans responsable » et ses voisins au singulier', async () => {
  const s = await bacDecisions(APP, 94);
  Object.assign(s.ctx, {
    VUE_REVUE: { pieces: () => [] }, FEEDBACK: { ouverts: () => [] }, ECARTS: { compte: () => ({}) },
    RENVOI: { ouvertes: () => [] }, CHAINE_BRIEF: { avancement: () => ({}) },
    PRIORITE: { conflits: () => ({ conflits: [{ personne: { nom: 'Ilan' }, speculatif: [{}], ferme: [{}] }] }) },
  });
  await s.charger('file-action');
  semer(s.ctx, { personnes: PERSONNES, projets: [projet('FA', { livrables: [livrable('L-fa', { responsable: null })],
    inferences: { identite: [{ cle: 'promesse' }] } })] });
  s.ctx.INFERENCE.compte = p => ((p.inferences || {}).identite || []).length;
  const lignes = [...s.ctx.FILE.tout()].map(x => x.quoi + ' — ' + x.cout);
  for (const attendu of [/^1 livrable sans responsable — /, /^1 livrable sans estimation — /, /^1 livrable sans date de remise — /,
    /^1 champ à confirmer sur « Projet FA »/, /— 1 livrable spéculatif pendant que 1 livrable engagé est en retard\./]) {
    assert.ok(lignes.some(l => attendu.test(l)), attendu + '\n' + lignes.join('\n'));
  }
  assert.ok(!lignes.some(l => /\b1 (livrables|champs)\b/.test(l)), lignes.join('\n'));
});

test('Décisions ne redit pas le support et le marché que le titre de la pièce donne déjà', async () => {
  const s = await bacDecisions(APP, 95);
  await s.charger('kv-modele');
  await s.charger('vue-revue');
  const v1 = { versions: [{ n: 1, soumis_le: '2026-11-03T08:00:00.000Z' }] };
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('RV', { livrables: [
    livrable('L-kv', { nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh', ...v1 }),
    livrable('L-eq', { nom: 'Bannière de lancement', support: 'S-social', marche: 'M-ci', ...v1 })] })] });
  const lignes = [...s.ctx.VUE_REVUE.pieces()].map(x => [x.titre.replace(/ /g, ' '), x.contexte]);
  assert.deepEqual(lignes, [
    ['Key visual — Ghana · Orvelle · V1', 'REF-RV'],
    ['Bannière de lancement · V1', 'REF-RV · Post social 1:1 · Côte d’Ivoire']]);
});

test('sur la planche, un master ancien et un master neuf se lisent de la même façon', async () => {
  const s = await bacDecisions(APP, 96);
  for (const nom of ['kv-modele', 'apparier', 'image', 'trace', 'annotation', 'vue-planche']) await s.charger(nom);
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('PL')] });
  const p = s.ctx.DEPOT.trouve('projets', 'PL');
  const ancien = s.ctx.KV.creer(p, null, null, 'maitre', { marque: 'Orvelle' });
  ancien.nom = 'KV master commun · Orvelle';
  const neuf = s.ctx.KV.creer(p, null, null, 'maitre', { marque: 'Peak' });
  const sous = l => trouver(s.ctx.VUE_PLANCHE.caseKV(p, l, () => {}), n => /plc-sous/.test(n.className)).textContent.split(' · ')[0];
  assert.deepEqual([sous(ancien), sous(neuf)].map(t => t.replace(/ /g, ' ')), ['Key visual master · Orvelle', 'Key visual master · Peak']);
  s.ctx.VUE_PLANCHE.ajouter(p, () => {});
  const menu = trouver(s.dernier(), n => n.tagName === 'SELECT' && n.getAttribute('aria-label') === 'Master de référence');
  assert.deepEqual(menu.childNodes.map(o => o.textContent.replace(/ /g, ' ')), ['Key visual master · Orvelle · V1', 'Key visual master · Peak · V1']);
});

/* ————— Les retours client : chaque compte s'accorde ————— */

async function retoursDe(cibles, extra = {}) {
  const s = await bacDecisions(APP, 97);
  await s.charger('kv-modele');
  await s.charger('feedback');
  await s.charger('annotation');
  await s.charger('vue-asset', ['retoursClient']);
  s.ctx.PRODUCTION.ouverte = () => false;
  s.ctx.PRODUCTION.de = () => [];
  const el = s.ctx.O.el;
  s.ctx.UI = new Proxy({ banniere: (ton, t) => el('div', {}, t), stat: (a, b, c) => el('div', {}, a, ' ', b, ' ', c),
    eti: t => el('span', {}, t) }, { get: (t, k) => t[k] || (() => el('div')) });
  const valide = { versions: [{ n: 1, soumis_le: '2026-11-03T08:00:00.000Z', verdict: 'approuve' }], origine: 'prevu' };
  const p = projet('RC', { livrables: [livrable('L-1', valide), livrable('L-2', valide)], ...extra });
  const fbs = cibles.map((c, i) => ({ id: 'FB-' + i, projet: 'RC', niveau: 'declinaison', cibles: c, texte: 'Le logo plus grand',
    auteur: 'P-recette', quand: '2026-11-04', issue: 'ouvert', canal: 'whatsapp' }));
  semer(s.ctx, { personnes: PERSONNES, projets: [p], feedbacks: fbs });
  return { s, p: s.ctx.DEPOT.trouve('projets', 'RC'), fbs: s.ctx.DEPOT.liste('feedbacks') };
}

test('le motif d’un retour arrivé après validation s’accorde à un et à deux livrables validés', async () => {
  const un = await retoursDe([['L-1']], { sections: { bigidea: { criteres: ['Un seul objet au centre'] }, pistes: [] } });
  const motifs = [...un.s.ctx.FEEDBACK.motifsDeRefus(un.fbs[0])].map(m => m.detail);
  assert.ok(motifs.includes('1 livrable avait été validé : ce n\'est pas une correction, c\'est une reprise'), motifs.join('\n'));
  assert.ok(motifs.includes('1 critère d\'acceptation a été posé avant : à confronter au retour'), motifs.join('\n'));
  const deux = await retoursDe([['L-1', 'L-2']]);
  assert.ok([...deux.s.ctx.FEEDBACK.motifsDeRefus(deux.fbs[0])].some(m => m.detail === '2 livrables avaient été validés : ce n\'est pas une correction, c\'est une reprise'));
});

test('« Décider de ce retour » compte ses motifs : « 1 motif », « 2 motifs »', async () => {
  for (const [extra, attendu] of [[{}, '1 motif'], [{ sections: { bigidea: { criteres: ['Un seul objet au centre'] }, pistes: [] } }, '2 motifs']]) {
    const r = await retoursDe([['L-1']], extra);
    r.s.ctx.FEEDBACK.trancher(r.fbs[0], () => {});
    const h3 = trouver(r.s.dernier(), n => n.tagName === 'H3' && /Ce qui permet de discuter ce retour/.test(n.textContent));
    assert.equal(h3.textContent, 'Ce qui permet de discuter ce retour' + attendu);
  }
});

test('« Ce que le client en a dit » compte « 1 retour », « 2 retours », et « 1 point posé sur le visuel »', async () => {
  const un = await retoursDe([['L-1']]);
  const l1 = un.p.livrables[0];
  const bloc = un.s.interne['vue-asset'].retoursClient(un.p, l1, () => {});
  assert.equal(trouver(bloc, n => /asb-t/.test(n.className)).textContent, 'Ce que le client en a dit1 retour');
  const deux = await retoursDe([['L-1'], ['L-1', 'L-2']]);
  const l = deux.p.livrables[0];
  deux.s.ctx.ANNOT.poser(l, 40, 30, 'Agrandir le logo', null);
  const b2 = deux.s.interne['vue-asset'].retoursClient(deux.p, l, () => {});
  assert.equal(trouver(b2, n => /asb-t/.test(n.className)).textContent, 'Ce que le client en a dit3 retours');
  assert.ok(trouver(b2, n => n.tagName === 'BUTTON' && n.textContent === '1 point posé sur le visuel →'));
});

test('la version précédente ne dit pas « Fermée par : undefined » quand elle n’a pas d’origine', async () => {
  const s = await bacDecisions(APP, 98);
  await s.charger('vue-asset', ['precedente']);
  s.ctx.VERSION.fil = () => null;
  const l = livrable('L-pr', { versions: [{ n: 1, soumis_le: '2026-11-03T08:00:00.000Z', verdict: 'approuve' }] });
  const t = texteDe(s.interne['vue-asset'].precedente(projet('PR'), l));
  assert.doesNotMatch(t, /undefined|Fermée par/, t);
  const close = livrable('L-cl', { versions: [{ n: 1, origine: 'client', motif: 'Le logo plus grand', close_le: '2026-11-03T08:00:00.000Z' }] });
  assert.match(texteDe(s.interne['vue-asset'].precedente(projet('PR'), close)), /Fermée par : Retour client\|Le logo plus grand\|3 nov\./);
});

test('l’étiquette d’une pièce validée depuis un autre onglet dit « Validé », pas « À examiner »', async () => {
  const s = await bacDecisions(APP, 99);
  await s.charger('vue-asset', ['etatVerdict']);
  s.ctx.UI = { eti: (t, ton) => ({ texte: t, ton }) };
  const etat = s.interne['vue-asset'].etatVerdict;
  assert.deepEqual({ ...etat({ n: 1 }, false, false) }, { texte: 'À examiner', ton: 'attente' });
  assert.deepEqual({ ...etat({ n: 1 }, false, true) }, { texte: 'Validé', ton: 'vert' });
  assert.deepEqual({ ...etat({ n: 1 }, true, false) }, { texte: 'Validation en cours', ton: 'vert' });
});

test('une page passée à l’arrière-plan avant l’échéance dit que la validation attendra la prochaine ouverture', async () => {
  const v = await validation(66);
  const ecoute = {}, texte = { textContent: 'V1 validée.' };
  v.s.ctx.addEventListener = () => {};
  v.s.ctx.document.addEventListener = (type, f) => { ecoute[type] = f; };
  v.s.ctx.AVIS.action = t => { v.avis.push(['action', t]); return { querySelector: s => (s === '.avis-t' ? texte : null) }; };
  cliquer(bouton(v.s.ctx.VUE_LIVRABLE.decider(v.p, v.l, () => {}), 'Valider la V1'));
  v.s.ctx.document.visibilityState = 'visible';
  ecoute.visibilitychange();
  assert.equal(texte.textContent, 'V1 validée.');
  v.s.ctx.document.visibilityState = 'hidden';
  ecoute.visibilitychange();
  assert.equal(texte.textContent, 'V1 validée. Si cette page se ferme maintenant, elle s\'enregistrera à votre prochaine ouverture de La Barre.');
  v.minuteries[0]();
  assert.equal(v.l.versions[0].verdict, 'approuve', 'revenue à temps, la page l’écrit à l’échéance');
});

/* ————— Les étiquettes des formulaires désignent leur champ —————
 *
 * Toucher « Nom » place le curseur dans le champ, et le lecteur d'écran le
 * nomme : chaque étiquette porte un for qui désigne un champ du panneau. */

function etiquettesReliees(panneau, attendues) {
  const tous = (n, f, out = []) => { if (n && typeof n === 'object') { if (f(n)) out.push(n); (n.childNodes || []).forEach(c => tous(c, f, out)); } return out; };
  const labels = tous(panneau, n => n.tagName === 'LABEL');
  assert.deepEqual(labels.map(l => l.textContent), attendues);
  for (const l of labels) {
    const cible = l.getAttribute('for');
    assert.ok(cible, 'l’étiquette « ' + l.textContent + ' » a un for');
    const champs = tous(panneau, n => n.getAttribute && n.getAttribute('id') === cible);
    assert.equal(champs.length, 1, cible);
    assert.match(champs[0].tagName, /^(INPUT|SELECT|TEXTAREA)$/, cible);
  }
}

test('« Demander un retour », « Décrire un fichier » et « Nouveau KV » relient leurs étiquettes', async () => {
  const s = await bacDecisions(APP, 101);
  for (const nom of ['kv-modele', 'apparier', 'image', 'trace', 'annotation', 'vue-planche', 'renvoi', 'production']) await s.charger(nom);
  s.ctx.PANNEAU.sousbloc = (t, c) => c;
  s.ctx.O.jeton = () => null;
  semer(s.ctx, { personnes: PERSONNES, ...REFERENTIEL, projets: [projet('ET')] });
  const p = s.ctx.DEPOT.trouve('projets', 'ET');

  s.ctx.RENVOI.ouvrir({ quoi: 'Brief — REF-ET', projet: 'REF-ET', projetId: 'ET', objet: 'brief' });
  etiquettesReliees(s.dernier(), ['Sur quel critère', 'À qui', 'Ce que j\'attends', 'Pour quand', 'Si « autre motif »']);
  /* Sans destinataire, le refus vouvoie, comme le reste de l'interface. */
  const qui = trouver(s.dernier(), n => n.getAttribute && n.getAttribute('id') === 'renvoi-qui');
  qui.value = ''; (qui.ecouteurs.change || []).forEach(f => f());
  cliquer(trouver(s.dernier(), n => n.tagName === 'BUTTON' && /bouton/.test(n.className) && !/creux/.test(n.className)));
  assert.deepEqual(s.refus, ['Nommez une personne : un renvoi ne s\'adresse pas à une direction.']);

  const l = livrable('L-et', { mockups: [{ id: 'MK-1', contexte: 'Abribus' }] });
  p.livrables.push(l);
  s.ctx.PRODUCTION.ajouter(p, l, () => {});
  etiquettesReliees(s.dernier(), ['Type', 'Nom', 'Où il est', 'Signataire', 'Lier à une mise en situation']);

  s.ctx.VUE_PLANCHE.ajouter(p, () => {});
  etiquettesReliees(s.dernier(), ['Niveau du KV', 'Marque', 'Piste du master', 'Master de référence', 'Marché de destination']);
});
