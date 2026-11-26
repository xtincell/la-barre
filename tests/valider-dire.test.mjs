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

function depot(donnees) {
  return { trouve: (k, id) => (donnees[k] || []).find(x => x.id === id) || null, liste: k => donnees[k] || [] };
}
const REFERENTIEL = {
  marches: [{ id: 'M-gh', code: 'GH', nom: 'Ghana' }, { id: 'M-ci', code: 'CI', nom: 'Côte d’Ivoire' }],
  supports: [{ id: 'S-kv', code: 'kv', nom: 'Key visual' }, { id: 'S-social', code: 'social', nom: 'Post social 1:1' }],
};

/* Une espace insécable tient le tiret au mot qui le précède : jamais
 * « Key visual — » seul en fin de ligne. */
test('KV.titre dit la pièce en clair et garde le code en surtitre, sans toucher au nom', async () => {
  const ctx = await bac();
  ctx.DEPOT = depot(REFERENTIEL);
  vm.runInContext(await lire('kv-modele'), ctx, { filename: 'kv-modele.js' });
  const { KV } = ctx;
  const cas = [
    [{ nom: 'KV · GH · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'Key visual\u00a0— Ghana', 'KV · GH · Orvelle'],
    [{ nom: 'KV · GH', support: 'S-kv', marche: 'M-gh' }, 'Key visual\u00a0— Ghana', 'KV · GH'],
    [{ nom: 'KV master commun · Orvelle', support: 'S-kv', niveau: 'maitre' }, 'Key visual master', 'KV master commun · Orvelle'],
    [{ nom: 'Post social 1:1 · CI', support: 'S-social', marche: 'M-ci' }, 'Post social 1:1\u00a0— Côte d’Ivoire', 'Post social 1:1 · CI'],
    [{ nom: 'Key visual — Ghana', support: 'S-kv', marche: 'M-gh' }, 'Key visual\u00a0— Ghana', null],
    [{ nom: 'Affiche de lancement', support: 'S-kv', marche: 'M-gh' }, 'Affiche de lancement', null],
    [{ nom: 'KV · CI · Orvelle', support: 'S-kv', marche: 'M-gh' }, 'KV · CI · Orvelle', null],
  ];
  for (const [l, titre, surtitre] of cas) {
    const avant = JSON.stringify(l);
    assert.equal(KV.titre(l), titre, l.nom);
    assert.equal(KV.surtitre(l), surtitre, l.nom);
    assert.equal(JSON.stringify(l), avant, 'le nom enregistré ne change pas');
  }
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

  const ouverte = await validation(47, [['la-barre-validations', JSON.stringify([{ ...note, rejouer: false, quand: '2026-11-10T09:00:00.000Z' }])]]);
  assert.equal(ouverte.s.ctx.VUE_LIVRABLE.reprendreValidations(), 0, 'la note d’une page encore ouverte n’est pas prise');
  assert.equal(ouverte.notes().length, 1);
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

  s.ctx.VALIDATION.rendre(p, 'brief', p.sections.brief, verdict('approuve'), () => {});
  cliquer(bouton(s.dernier(), 'Valider'));
  assert.equal(p.sections.brief.validation.verdict, 'approuve');
  const apres = textes(s.ctx.VALIDATION.bande(p, 'brief', p.sections.brief, () => {}));
  assert.match(apres, /Validé le \d+ [a-zé]+\. Le travail créatif peut commencer\./);
  assert.doesNotMatch(apres, /\.\./, 'un seul point après la date');
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
  assert.equal(puce.textContent, 'Key visual — Ghana');
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
