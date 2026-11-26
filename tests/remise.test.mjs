import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { bac, semer, projet, livrable, PERSONNES, saisie, soumettre, bouton, cliquer } from './decisions-scenarios.mjs';

const app = fileURLToPath(new URL('../app/', import.meta.url));
const saisiePreuve = {
  nom: 'Accusé de réception',
  url: 'https://documents.example.test/remises/42.pdf',
  destinataire: 'Chargée de production',
  quand: '2026-11-09',
};

function fichier({ id, type = 'asset', version = 2, emplacement, signataire = null }) {
  return { id, type, version, emplacement, signataire, nom: id + '.pdf' };
}

function version(n, verdict = 'approuve') {
  return { n, verdict, soumis_le: '2026-11-03T08:00:00.000Z', juge_le: '2026-11-06T12:00:00.000Z' };
}

async function installation() {
  const s = await bac(app, 20);
  s.ctx.URL = URL;
  await s.charger('production');
  await s.charger('regles');
  semer(s.ctx, {
    personnes: PERSONNES,
    supports: [{ id: 'S-affiche', type: 'print' }, { id: 'S-story', type: 'social' }],
    marches: [{ id: 'CI', nom: 'Côte d’Ivoire' }, { id: 'SN', nom: 'Sénégal' }],
    projets: [projet('P', {
      livrables: [
        livrable('L-ci', { marche: 'CI', version: 2, versions: [version(1), version(2)] }),
        livrable('L-sn', { marche: 'SN', version: 2, versions: [version(2)] }),
        livrable('L-digital', { support: 'S-story', marche: 'CI', version: 2, versions: [version(2)] }),
      ],
    })],
  });
  const p = s.ctx.DEPOT.trouve('projets', 'P');
  const [ci, sn, digital] = p.livrables;
  return { s, p, ci, sn, digital, R: s.ctx.REMISE };
}

function preparer(l, id) {
  l.fichiers = [
    fichier({ id: 'BAT-' + id, type: 'bat', emplacement: 'https://documents.example.test/bat/' + id + '.pdf', signataire: 'Imprimerie' }),
    fichier({ id: 'FINAL-' + id, emplacement: 'https://documents.example.test/final/' + id + '.pdf' }),
  ];
}

test('l’accord et le BAT courant ne valent ni fichier de sortie ni preuve', async () => {
  const { s, p, ci, digital, R } = await installation();
  assert.equal(R.etatPiece(ci).cle, 'bat');
  ci.fichiers = [
    fichier({ id: 'ancien', type: 'bat', version: 1, emplacement: '/production/ancien.pdf', signataire: 'Imprimerie' }),
    fichier({ id: 'declaration', type: 'bat', emplacement: ' ', signataire: 'Imprimerie' }),
  ];
  assert.equal(R.etatPiece(ci).cle, 'bat');
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).nom, 'BAT');
  ci.fichiers.push(fichier({ id: 'bat-actuel', type: 'bat', emplacement: '/production/bon-a-tirer.pdf', signataire: 'Imprimerie' }));
  assert.equal(R.etatPiece(ci).cle, 'sortie');
  assert.equal(R.lot(p).physiques, 0);
  assert.equal(R.piece(p, ci).pret, false);
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).quoi, 'Fichiers à remettre');
  ci.fichiers.push(fichier({ id: 'apercu', emplacement: 'assets/review/livrables/revue.jpg' }));
  assert.equal(R.etatPiece(ci).cle, 'sortie', 'un visuel compressé de revue ne devient pas un fichier de sortie');
  ci.fichiers.push(fichier({ id: 'asset', emplacement: '/production/affiche.pdf' }));
  assert.equal(R.etatPiece(ci).cle, 'preuve');
  assert.equal(R.lot(p).physiques, 1);
  assert.equal(R.preuveCourante(p, ci), null);
  assert.equal(R.etatPiece(digital).cle, 'sortie', 'le support social peut omettre le BAT');
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).quoi, 'Livraison à enregistrer');
});

test('une date de remise historique reste une échéance, jamais un justificatif', async () => {
  const { p, ci, R } = await installation();
  ci.versions = [];
  ci.remise = '2026-11-10';
  ci.production = '/production/affiche.pdf';
  assert.equal(R.etatPiece(ci).cle, 'validation');
  assert.equal(R.preuveCourante(p, ci), null);
  assert.ok(!R.lot(p).pieces.some(x => x.livrable.id === ci.id));
});

test('le reçu de lot écrit une seule preuve, couvre ses pièces et se rejoue sans deuxième écriture', async () => {
  const { s, p, ci, sn, digital, R } = await installation();
  preparer(ci, 'CI'); preparer(sn, 'SN'); preparer(digital, 'D');
  const pieces = [ci, sn].map(l => R.empreintePiece(l, R.etatPiece(l)));
  const ecrit = R.consigner(p.id, pieces, saisiePreuve);
  assert.ok(ecrit.recu);
  assert.match(ecrit.recu.id, /^REM-/);
  assert.equal(ecrit.recu.pieces[0].fichiers[0].nom, 'FINAL-CI.pdf');
  assert.equal(R.preuveCourante(p, ci), ecrit.recu);
  assert.equal(R.preuveCourante(p, sn), ecrit.recu);
  assert.equal(R.preuveCourante(p, digital), null);
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).nom, 'Remise justifiée');
  const relecture = JSON.parse(s.ctx.localStorage.getItem('la-barre'));
  assert.equal(relecture.projets[0].preuvesRemise[0].id, ecrit.recu.id);
  const rejeu = R.consigner(p.id, pieces.slice().reverse(), saisiePreuve);
  assert.equal(rejeu.deja, true);
  assert.equal(rejeu.recu.id, ecrit.recu.id);
  assert.equal(p.preuvesRemise.length, 1);
  assert.equal(s.ctx.DEPOT.journal().filter(x => x.action === 'preuve de remise').length, 1);
});

test('changer la version, la portée ou le fichier conserve l’ancien document sans le réemployer', async () => {
  const { p, ci, sn, R } = await installation();
  preparer(ci, 'CI'); preparer(sn, 'SN');
  const as = l => R.empreintePiece(l, R.etatPiece(l));
  const pieces = [as(ci), as(sn)];
  assert.ok(R.consigner(p.id, pieces, saisiePreuve).recu);

  ci.fichiers[1].emplacement = 'https://documents.example.test/final/CI-corrige.pdf';
  assert.equal(R.preuveCourante(p, ci), null);
  assert.ok(R.preuveCourante(p, sn));
  assert.match(R.consigner(p.id, pieces, saisiePreuve).erreur, /sélection a changé/);
  assert.equal(p.preuvesRemise.length, 1);
  sn.marche = 'CI';
  assert.equal(R.preuveCourante(p, sn), null);
  ci.versions.push(version(3, null));
  ci.version = 3;
  assert.equal(R.etatPiece(ci).cle, 'validation');
  assert.equal(p.preuvesRemise[0].pieces[0].version, 2);
  assert.equal(p.preuvesRemise[0].pieces[0].marche, 'CI');
});

test('la preuve refuse une URL dangereuse, un lot doublé, et une écriture en vitrine', async () => {
  const { s, p, ci, R } = await installation();
  preparer(ci, 'CI');
  const piece = R.empreintePiece(ci, R.etatPiece(ci));
  for (const url of ['javascript:alert(1)', 'http://documents.example.test/42', 'https://client:secret@docs.example.test/42']) {
    assert.match(R.consigner(p.id, [piece], {...saisiePreuve, url}).erreur, /lien HTTPS/);
  }
  assert.match(R.consigner(p.id, [piece, piece], saisiePreuve).erreur, /une seule fois/);
  s.ctx.DEPOT.estDemonstration = () => true;
  assert.match(R.consigner(p.id, [piece], saisiePreuve).erreur, /vitrine/);
  assert.equal(p.preuvesRemise, undefined);
});

test('un écart de métadonnées reste un conseil ; le reçu décrit la sortie réelle', async () => {
  const { s, p, ci, R } = await installation();
  preparer(ci, 'CI');
  ci.assets = ['IMG-1'];
  s.ctx.DEPOT.tout().assets = [{ id: 'IMG-1', nom: 'Image principale', zones: ['SN'] }];
  const etat = R.piece(p, ci);
  assert.equal(etat.physique, true);
  assert.equal(etat.conformite, false);
  assert.equal(etat.pret, false);
  assert.ok(R.consigner(p.id, [R.empreintePiece(ci, R.etatPiece(ci))], saisiePreuve).recu);
});

test('un changement de portée pendant le dialogue empêche de rendre le verdict', async () => {
  const { s, p, ci } = await installation();
  ci.versions = [version(2, null)];
  await s.charger('vue-livrable', ['juger']);
  const retour = s.ctx.MAISON.verdicts.find(v => v.cle === 'retour');
  s.interne['vue-livrable'].juger(p, ci, retour);
  saisie(s.dernier()).value = 'Ajouter la mention obligatoire.';
  ci.marche = 'SN';
  soumettre(s.dernier());
  assert.match(s.dernier().textContent, /pièce a changé pendant votre décision/);
  assert.equal(ci.versions[0].verdict, null);
  assert.equal(s.ctx.DEPOT.liste('decisions').length, 0);
});

/* ————— Les preuves souples : un BAT reçu sur WhatsApp, des fichiers partis
 * par WeTransfer, une remise déclarée. ————— */

test('une preuve est un lien https, un fichier déposé ou une déclaration ; sans type, c’est un lien', async () => {
  const { R } = await installation();
  const v = x => JSON.parse(JSON.stringify(R.preuveValide(x)));
  assert.deepEqual(v({ url: 'https://documents.example.test/bat.pdf' }), { type: 'lien', url: 'https://documents.example.test/bat.pdf' });
  assert.deepEqual(v({ type: 'fichier', chemin: 'assets/review/preuves/preuve-x1.jpg' }), { type: 'fichier', chemin: 'assets/review/preuves/preuve-x1.jpg' });
  assert.deepEqual(v({ type: 'declaration', texte: 'OK par WhatsApp', contact: 'Imprimerie', date: '2026-11-08' }),
    { type: 'declaration', texte: 'OK par WhatsApp', contact: 'Imprimerie', date: '2026-11-08' });
  /* Le mot dit avec une pièce jointe la suit ; vide, il n'existe pas. */
  assert.deepEqual(v({ type: 'fichier', chemin: 'assets/review/preuves/preuve-x1.jpg', texte: ' OK WhatsApp de Paul ' }),
    { type: 'fichier', chemin: 'assets/review/preuves/preuve-x1.jpg', texte: 'OK WhatsApp de Paul' });
  assert.deepEqual(v({ type: 'lien', url: 'https://documents.example.test/bat.pdf', texte: '' }),
    { type: 'lien', url: 'https://documents.example.test/bat.pdf' });
  for (const faux of [null, {}, { url: 'http://documents.example.test/x' }, { type: 'lien', url: 'javascript:alert(1)' },
    { type: 'fichier', chemin: 'assets/review/livrables/revue.jpg' }, { type: 'fichier', chemin: 'assets/review/preuves/../depots/base.json' },
    { type: 'fichier', chemin: 'https://documents.example.test/x.jpg' }, { type: 'declaration', contact: 'Imprimerie' },
    { type: 'declaration', date: '2026-11-08' }, { type: 'declaration', contact: 'Imprimerie', date: '2026-02-30' }, { type: 'autre' }]) {
    assert.equal(R.preuveValide(faux), null, JSON.stringify(faux));
  }
});

test('la déclaration seule vaut BAT, la photo aussi ; sans signataire ni date, rien ne vaut', async () => {
  const { ci, sn, R } = await installation();
  ci.fichiers = [{ id: 'B-1', type: 'bat', version: 2, nom: 'BAT accordé par Imprimerie', emplacement: '', signataire: 'Imprimerie',
    signe_le: '2026-11-08', preuve: { type: 'declaration', texte: 'OK par WhatsApp', contact: 'Imprimerie', date: '2026-11-08' } }];
  assert.equal(R.etatPiece(ci).cle, 'sortie', 'BAT reçu de X le D');
  ci.fichiers = [{ id: 'B-2', type: 'bat', version: 2, nom: 'BAT', emplacement: '', signataire: 'Imprimerie', signe_le: '2026-11-08' }];
  assert.equal(R.etatPiece(ci).cle, 'sortie', 'signataire et date, sans emplacement');
  ci.fichiers = [{ id: 'B-3', type: 'bat', version: 2, nom: 'BAT', emplacement: '', signataire: '', signe_le: '2026-11-08' }];
  assert.equal(R.etatPiece(ci).cle, 'bat', 'sans signataire, pas de BAT');
  sn.fichiers = [{ id: 'B-4', type: 'bat', version: 2, nom: 'bon-signe.jpg', emplacement: 'assets/review/preuves/preuve-b4.jpg',
    signataire: 'Imprimerie', signe_le: '2026-11-08', preuve: { type: 'fichier', chemin: 'assets/review/preuves/preuve-b4.jpg' } }];
  assert.equal(R.etatPiece(sn).cle, 'sortie', 'la photo du bon signé');
  sn.fichiers[0].version = 1;
  assert.equal(R.etatPiece(sn).cle, 'bat', 'le BAT d’une autre version ne vaut pas');
});

test('des fichiers partis par WeTransfer ou sur le Drive valent sortie, lien facultatif', async () => {
  const { ci, R } = await installation();
  ci.fichiers = [{ id: 'B-1', type: 'bat', version: 2, nom: 'BAT', emplacement: '', signataire: 'Imprimerie', signe_le: '2026-11-08' },
    { id: 'S-1', type: 'asset', role: 'sortie', version: 2, nom: 'Fichiers finaux · V2', emplacement: '', canal: 'WeTransfer' }];
  assert.equal(R.etatPiece(ci).cle, 'preuve');
  ci.fichiers[1].canal = '';
  assert.equal(R.etatPiece(ci).cle, 'sortie', 'sans canal ni emplacement, rien n’est parti');
  ci.fichiers[1].emplacement = 'https://drive.example.test/finaux';
  assert.equal(R.etatPiece(ci).cle, 'preuve');
});

test('la remise se déclare : « remis à X le D », datée, attribuée, et rejouée sans doublon', async () => {
  const { s, p, ci, R } = await installation();
  preparer(ci, 'CI');
  const piece = R.empreintePiece(ci, R.etatPiece(ci));
  const saisieDeclaree = { destinataire: 'Chargée de production', quand: '2026-11-09', preuve: { type: 'declaration', texte: 'Remis en main propre' } };
  const ecrit = R.consigner(p.id, [piece], saisieDeclaree);
  assert.ok(ecrit.recu, ecrit.erreur);
  assert.deepEqual(JSON.parse(JSON.stringify(ecrit.recu.preuve)),
    { nom: 'Remise déclarée', type: 'declaration', texte: 'Remis en main propre', contact: 'Chargée de production', date: '2026-11-09' });
  assert.equal(ecrit.recu.acteur.personneId, 'P-recette', 'la remise porte celui qui l’écrit');
  assert.equal(R.preuveCourante(p, ci), ecrit.recu);
  assert.equal(R.consigner(p.id, [piece], saisieDeclaree).deja, true);
  assert.equal(p.preuvesRemise.length, 1);
  assert.match(R.consigner(p.id, [piece], { ...saisieDeclaree, destinataire: '' }).erreur, /à qui/);
  assert.match(R.consigner(p.id, [piece], { ...saisieDeclaree, quand: '2099-01-01' }).erreur, /date passée/);
  const photo = R.consigner(p.id, [piece], { destinataire: 'Imprimerie', quand: '2026-11-09',
    preuve: { type: 'fichier', chemin: 'assets/review/preuves/preuve-bl.pdf' } });
  assert.equal(photo.recu.preuve.type, 'fichier');
  /* Une nouvelle version invalide la preuve, comme pour un lien. */
  ci.versions.push(version(3, null)); ci.version = 3;
  assert.equal(R.preuveCourante(p, ci), null);
  void s;
});

test('les reçus et les BAT écrits avant les preuves souples se relisent à l’identique', async () => {
  const { p, ci, R } = await installation();
  preparer(ci, 'CI');
  /* L'empreinte telle que l'écrivait la formule d'avant les preuves souples
   * (BAT avec emplacement https, sortie sans canal), figée en clair : un
   * changement de formule qui la déplacerait rendrait orphelins les reçus
   * déjà écrits, et ce test le dirait. */
  const EMPREINTE_HISTORIQUE = '["2026-11-03T08:00:00.000Z","2026-11-06T12:00:00.000Z",'
    + '["BAT-CI","BAT-CI.pdf","Imprimerie","https://documents.example.test/bat/CI.pdf",null],'
    + '["[\\"FINAL-CI\\",\\"FINAL-CI.pdf\\",\\"https://documents.example.test/final/CI.pdf\\"]"]]';
  assert.equal(R.empreintePiece(ci, R.etatPiece(ci)).empreinte, EMPREINTE_HISTORIQUE);
  const piece = { id: 'L-ci', version: 2, marche: 'CI', support: 'S-affiche', empreinte: EMPREINTE_HISTORIQUE,
    nom: 'Livrable L-ci', fichiers: [{ id: 'FINAL-CI', nom: 'FINAL-CI.pdf' }] };
  /* La forme d'avant : une preuve sans type, un BAT sans preuve, une sortie sans canal. */
  p.preuvesRemise = [{ id: 'REM-ancien', remis_le: '2026-11-09', destinataire: 'Chargée de production',
    preuve: { nom: 'Accusé', url: 'https://documents.example.test/remises/42.pdf' }, pieces: [piece] }];
  assert.equal(R.preuveCourante(p, ci).id, 'REM-ancien');
  assert.equal(R.etatPiece(ci).cle, 'preuve');
  p.preuvesRemise[0].preuve.url = 'http://documents.example.test/remises/42.pdf';
  assert.equal(R.preuveCourante(p, ci), null, 'un lien qui n’est pas https ne devient pas valide');
});

test('le suivi dit « BAT accordé » sans pièce, « BAT signé » avec, et « Fichiers à remettre » avant la remise', async () => {
  const { p, ci, R } = await installation();
  const accord = { type: 'declaration', texte: 'OK par WhatsApp', contact: 'Imprimerie', date: '2026-11-08' };
  ci.fichiers = [{ id: 'B-1', type: 'bat', version: 2, nom: 'BAT déclaré', emplacement: '', signataire: 'Imprimerie', signe_le: '2026-11-08', preuve: accord },
    { id: 'S-1', type: 'asset', role: 'sortie', version: 2, nom: 'Fichiers finaux · V2', emplacement: '', canal: 'WeTransfer' }];
  let suivi = R.suiviPiece(p, ci, () => {});
  assert.match(suivi.textContent, /BAT accordé · V2/);
  assert.match(suivi.textContent, /Déclaré : « OK par WhatsApp »/);
  assert.match(suivi.textContent, /Fichiers à remettre/);
  assert.doesNotMatch(suivi.textContent, /Fichiers remis/);
  /* Le bon photographié et posé à l'étage : il s'ouvre, et le BAT est signé. */
  Object.assign(ci.fichiers[0], { nom: 'bon-signe.jpg', emplacement: 'assets/review/livrables/L-ci-f1.jpg', preuve: { ...accord, texte: '' } });
  suivi = R.suiviPiece(p, ci, () => {});
  assert.match(suivi.textContent, /BAT signé · V2/);
  assert.equal(noeuds(suivi, n => n.tagName === 'A')[0].getAttribute('href'), 'assets/review/livrables/L-ci-f1.jpg');
  assert.doesNotMatch(suivi.textContent, /sans pièce jointe/, 'le fichier posé est la pièce jointe');
  assert.ok(R.consigner(p.id, [R.empreintePiece(ci, R.etatPiece(ci))], { destinataire: 'Imprimerie', quand: '2026-11-09',
    preuve: { type: 'declaration', texte: '' } }).recu);
  assert.match(R.suiviPiece(p, ci, () => {}).textContent, /Fichiers remis/);
  for (const faux of ['assets/review/../depots/base.json', 'assets/review/x.jpg', '/assets/review/livrables/x.jpg', 'https://exemple.test/x.jpg'])
    assert.equal(R.fichierServi(faux), null, faux);
});

/* ————— Le geste : un seul formulaire ————— */

function noeuds(n, test, out = []) {
  if (!n || typeof n !== 'object') return out;
  if (test(n)) out.push(n);
  for (const e of n.childNodes || []) noeuds(e, test, out);
  return out;
}
const champs = racine => noeuds(racine, n => ['INPUT', 'SELECT', 'TEXTAREA'].includes(n.tagName));
function remplir(racine, valeurs) {
  for (const c of champs(racine)) {
    const nom = c.getAttribute('name');
    if (Object.hasOwn(valeurs, nom)) { if (c.getAttribute('type') === 'file') c.fichier = valeurs[nom]; else c.value = valeurs[nom]; }
  }
}
class FormulaireLu {
  constructor(form) { this.form = form; }
  get(k) {
    const c = champs(this.form).find(x => x.getAttribute('name') === k);
    if (!c) return null;
    if (c.getAttribute('type') === 'file') return c.fichier || { name: '', size: 0 };
    return c.value !== '' ? c.value : (c.getAttribute('value') || '');
  }
  /* Une case cochée d'office porte l'attribut, comme dans le navigateur. */
  getAll(k) {
    return champs(this.form).filter(x => x.getAttribute('name') === k && (x.checked || x.getAttribute('checked') !== null))
      .map(x => x.getAttribute('value'));
  }
}
const laisserFiler = () => new Promise(r => setImmediate(r));
function envoyer(racine) {
  const f = noeuds(racine, n => n.tagName === 'FORM')[0];
  for (const traiter of f.ecouteurs.submit || []) traiter.call(f, { preventDefault() {}, target: f });
}
const erreur = form => noeuds(form, n => n.className === 'remise-erreur')[0].textContent;

async function geste() {
  const x = await installation();
  x.s.ctx.FormData = FormulaireLu;
  x.depots = [];
  x.s.ctx.IMAGE = { deposerPreuve(f, apres) { x.depots.push(f.name); apres('assets/review/preuves/preuve-' + x.depots.length + '.jpg'); } };
  return x;
}

test('« Marquer comme livré » : un seul geste, cinq champs requis au plus, aucun lien HTTPS exigé', async () => {
  const { s, p, ci, R } = await geste();
  R.marquerLivre(p, ci, () => {});
  const form = s.dernier();
  const requis = champs(form).filter(c => c.getAttribute('required') !== null).map(c => c.getAttribute('name'));
  assert.deepEqual(requis, ['bat-par', 'bat-le', 'canal', 'destinataire', 'remis-le']);
  assert.ok(!champs(form).some(c => c.getAttribute('type') === 'url' && c.getAttribute('required') !== null));
  remplir(form, { 'bat-par': 'Imprimerie du port', 'bat-comment': 'OK par WhatsApp', canal: 'WeTransfer', destinataire: 'Chargée de production' });
  envoyer(form);
  await laisserFiler();
  const bat = ci.fichiers.find(f => f.type === 'bat');
  assert.deepEqual([bat.signataire, bat.signe_le, bat.emplacement, bat.preuve.type, bat.preuve.texte, bat.version],
    ['Imprimerie du port', '2026-11-10', '', 'declaration', 'OK par WhatsApp', 2]);
  assert.equal(bat.acteur.personneId, 'P-recette');
  const sortie = ci.fichiers.find(f => f.role === 'sortie');
  assert.deepEqual([sortie.canal, sortie.emplacement, sortie.version], ['WeTransfer', '', 2]);
  const recu = R.preuveCourante(p, ci);
  assert.ok(recu, 'la pièce est livrée');
  assert.deepEqual([recu.destinataire, recu.remis_le, recu.preuve.type, recu.preuve.texte],
    ['Chargée de production', '2026-11-10', 'declaration', 'Fichiers envoyés par WeTransfer']);
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).nom, 'Remise justifiée');
});

test('« Marquer comme livré » joint la photo du BAT et le PDF de la remise quand on les donne', async () => {
  const { s, p, ci, R, depots } = await geste();
  R.marquerLivre(p, ci, () => {});
  remplir(s.dernier(), { 'bat-par': 'Imprimerie', 'bat-fichier': { name: 'bon-signe.jpg', size: 2048 }, canal: 'Clé USB',
    destinataire: 'Imprimerie', 'remise-fichier': { name: 'bon-de-livraison.pdf', size: 4096 } });
  envoyer(s.dernier());
  await laisserFiler();
  assert.deepEqual(depots, ['bon-signe.jpg', 'bon-de-livraison.pdf']);
  const bat = ci.fichiers.find(f => f.type === 'bat');
  assert.deepEqual([bat.nom, bat.emplacement, bat.preuve.type], ['bon-signe.jpg', 'assets/review/preuves/preuve-1.jpg', 'fichier']);
  const recu = R.preuveCourante(p, ci);
  assert.deepEqual([recu.preuve.nom, recu.preuve.type, recu.preuve.chemin, recu.preuve.texte],
    ['bon-de-livraison.pdf', 'fichier', 'assets/review/preuves/preuve-2.jpg', 'Fichiers envoyés sur clé USB'],
    'le bon de livraison garde par où les fichiers sont partis');
});

test('le mot dit avec la photo du BAT n’est pas perdu : il suit la pièce jointe et se lit à côté', async () => {
  const { s, p, ci, R, depots } = await geste();
  R.marquerLivre(p, ci, () => {});
  remplir(s.dernier(), { 'bat-par': 'Imprimerie', 'bat-comment': 'OK WhatsApp de Paul', 'bat-fichier': { name: 'bon.jpg', size: 2048 },
    canal: 'WeTransfer', destinataire: 'Imprimerie' });
  envoyer(s.dernier());
  await laisserFiler();
  assert.deepEqual(depots, ['bon.jpg']);
  const bat = ci.fichiers.find(f => f.type === 'bat');
  assert.deepEqual(JSON.parse(JSON.stringify(bat.preuve)),
    { type: 'fichier', chemin: 'assets/review/preuves/preuve-1.jpg', texte: 'OK WhatsApp de Paul' });
  const suivi = R.suiviPiece(p, ci, () => {});
  assert.match(suivi.textContent, /BAT signé · V2.*Ouvrir le BAT« OK WhatsApp de Paul »/);
});

test('une photo et un lien joints ensemble sont refusés avant tout dépôt : aucun des deux n’est perdu en silence', async () => {
  const { s, p, ci, R, depots } = await geste();
  R.marquerLivre(p, ci, () => {});
  const form = s.dernier();
  remplir(form, { 'bat-par': 'Imprimerie', 'bat-fichier': { name: 'bon.jpg', size: 2048 }, 'bat-lien': 'https://documents.example.test/bat',
    canal: 'Drive', destinataire: 'Imprimerie' });
  envoyer(form);
  await laisserFiler();
  assert.match(erreur(form), /Pour le BAT, joignez une photo ou un PDF, ou bien un lien : pas les deux/);
  /* Le justificatif de remise aussi, et le BAT n'est pas monté pour rien. */
  remplir(form, { 'bat-lien': '', 'remise-fichier': { name: 'bl.pdf', size: 10 }, 'remise-lien': 'https://documents.example.test/bl' });
  envoyer(form);
  await laisserFiler();
  assert.match(erreur(form), /Pour le justificatif, joignez/);
  assert.deepEqual(depots, [], 'rien n’est monté sur le disque');
  assert.equal((ci.fichiers || []).length, 0);
  assert.equal(p.preuvesRemise, undefined);
});

test('un lien invalide ou une pièce qui change pendant le geste n’écrivent rien', async () => {
  const { s, p, ci, R } = await geste();
  R.marquerLivre(p, ci, () => {});
  const form = s.dernier();
  remplir(form, { 'bat-par': 'Imprimerie', 'bat-lien': 'http://documents.example.test/bat', canal: 'Drive', destinataire: 'Imprimerie' });
  envoyer(form);
  await laisserFiler();
  assert.match(noeuds(form, n => n.className === 'remise-erreur')[0].textContent, /https:\/\//);
  assert.equal((ci.fichiers || []).length, 0);
  remplir(form, { 'bat-lien': '' });
  ci.versions.push(version(3, null)); ci.version = 3;
  envoyer(form);
  await laisserFiler();
  assert.match(noeuds(form, n => n.className === 'remise-erreur')[0].textContent, /ont changé/);
  assert.equal((ci.fichiers || []).length, 0);
  assert.equal(p.preuvesRemise, undefined);
});

test('un BAT posé à son étage, sans signataire, est complété : il n’y a jamais deux BAT', async () => {
  const { s, p, ci, R } = await geste();
  /* « Poser le BAT » : la photo du bon est rangée, personne n'a encore dit qui l'a accordé. */
  ci.fichiers = [{ id: 'F-pose', type: 'bat', version: 2, nom: 'bon-signe.jpg', emplacement: 'assets/review/livrables/L-ci-f1.jpg',
    signataire: null, quand: '2026-11-09T10:00:00.000Z' }];
  assert.equal(R.etatPiece(ci).cle, 'bat', 'un BAT sans signataire ne vaut pas');
  R.marquerLivre(p, ci, () => {});
  const form = s.dernier();
  assert.match(form.textContent, /« bon-signe\.jpg » est déjà posé/);
  remplir(form, { 'bat-par': 'Imprimerie du port', canal: 'Drive', destinataire: 'Chargée de production' });
  envoyer(form);
  await laisserFiler();
  const bats = ci.fichiers.filter(f => f.type === 'bat');
  assert.equal(bats.length, 1, 'le BAT posé est complété, pas doublé');
  assert.deepEqual([bats[0].id, bats[0].signataire, bats[0].signe_le, bats[0].emplacement, bats[0].preuve.type],
    ['F-pose', 'Imprimerie du port', '2026-11-10', 'assets/review/livrables/L-ci-f1.jpg', 'declaration']);
  assert.ok(R.preuveCourante(p, ci), 'la pièce est livrée');
});

test('une remise refusée après l’écriture du BAT rouvre le geste sur l’état atteint, qui ne demande plus que la remise', async () => {
  const { s, p, ci, R } = await geste();
  const attribuer = s.ctx.O.identifiantUnique;
  s.ctx.O.identifiantUnique = () => null;
  R.marquerLivre(p, ci, () => {});
  const premier = s.dernier();
  remplir(premier, { 'bat-par': 'Imprimerie', canal: 'WeTransfer', destinataire: 'Chargée de production' });
  envoyer(premier);
  await laisserFiler();
  assert.equal(R.etatPiece(ci).cle, 'preuve', 'le BAT et les fichiers sont écrits');
  assert.equal(p.preuvesRemise, undefined, 'la remise ne l’est pas');
  const rouvert = s.dernier();
  assert.notEqual(rouvert, premier, 'le formulaire se rouvre');
  assert.match(rouvert.textContent, /Le BAT et les fichiers remis sont enregistrés, pas encore la remise : impossible d’attribuer/);
  assert.deepEqual(champs(rouvert).filter(c => c.getAttribute('required') !== null).map(c => c.getAttribute('name')),
    ['destinataire', 'remis-le'], 'il ne redemande ni le BAT ni les fichiers');
  const valeur = nom => champs(rouvert).find(c => c.getAttribute('name') === nom).getAttribute('value');
  assert.deepEqual([valeur('destinataire'), valeur('remis-le')], ['Chargée de production', '2026-11-10'],
    'ce qui avait été dit de la remise n’est pas à retaper');
  s.ctx.O.identifiantUnique = attribuer;
  envoyer(rouvert);
  await laisserFiler();
  const recu = R.preuveCourante(p, ci);
  assert.ok(recu, 'la pièce est livrée au second envoi');
  assert.deepEqual([recu.destinataire, recu.preuve.type, recu.preuve.texte], ['Chargée de production', 'declaration', 'Fichiers envoyés par WeTransfer'],
    'la remise garde par où les fichiers sont partis, que le formulaire rouvert ne redemande pas');
  assert.equal(ci.fichiers.filter(f => f.type === 'bat').length, 1);
});

test('rouvert après un refus, le justificatif déjà déposé reste joint au lieu d’être redemandé', async () => {
  const { s, p, ci, R, depots } = await geste();
  const attribuer = s.ctx.O.identifiantUnique;
  s.ctx.O.identifiantUnique = () => null;
  R.marquerLivre(p, ci, () => {});
  remplir(s.dernier(), { 'bat-par': 'Imprimerie', canal: 'Clé USB', destinataire: 'Imprimerie',
    'remise-fichier': { name: 'bon-de-livraison.pdf', size: 4096 } });
  envoyer(s.dernier());
  await laisserFiler();
  assert.deepEqual(depots, ['bon-de-livraison.pdf']);
  const rouvert = s.dernier();
  assert.match(rouvert.textContent, /« bon-de-livraison\.pdf » est déjà déposé : il reste joint/);
  s.ctx.O.identifiantUnique = attribuer;
  envoyer(rouvert);
  await laisserFiler();
  assert.deepEqual(depots, ['bon-de-livraison.pdf'], 'il n’est pas déposé une seconde fois');
  const recu = R.preuveCourante(p, ci);
  assert.deepEqual([recu.preuve.nom, recu.preuve.type, recu.preuve.chemin], ['bon-de-livraison.pdf', 'fichier', 'assets/review/preuves/preuve-1.jpg']);
});

test('une erreur imprévue ne laisse jamais le bouton désactivé, et ne prétend pas que rien n’est écrit', async () => {
  const { s, p, ci, R } = await geste();
  const Lu = s.ctx.FormData;
  R.marquerLivre(p, ci, () => {});
  const form = s.dernier();
  const bouton = () => noeuds(form, n => n.tagName === 'BUTTON' && n.getAttribute('type') === 'submit')[0];
  remplir(form, { 'bat-par': 'Imprimerie', canal: 'Drive', destinataire: 'Imprimerie' });
  /* Une exception levée avant toute promesse. */
  s.ctx.FormData = class { constructor() { throw new Error('lecture impossible'); } };
  envoyer(form);
  await laisserFiler();
  assert.equal(bouton().disabled, false, 'le bouton se réactive');
  assert.match(erreur(form), /L’enregistrement n’a pas abouti\. Vérifiez ce que montre la pièce/);
  /* Une exception après l'écriture du BAT en mémoire : le message ne dit pas « rien n'a été enregistré ». */
  s.ctx.FormData = Lu;
  const tracer = s.ctx.DEPOT.tracer;
  s.ctx.DEPOT.tracer = (action, ...reste) => { if (action === 'fichier à remettre') throw new Error('journal'); return tracer(action, ...reste); };
  envoyer(form);
  await laisserFiler();
  assert.equal(bouton().disabled, false);
  assert.doesNotMatch(erreur(form), /Rien n’a été enregistré/);
  assert.match(erreur(form), /n’a pas abouti/);
  s.ctx.DEPOT.tracer = tracer;
});

test('« Enregistrer seulement le BAT » pose le BAT sans marquer la pièce livrée', async () => {
  const { s, p, ci, R } = await geste();
  R.marquerLivre(p, ci, () => {}, { batSeul: true });
  const form = s.dernier();
  assert.deepEqual(champs(form).filter(c => c.getAttribute('required') !== null).map(c => c.getAttribute('name')), ['bat-par', 'bat-le']);
  remplir(form, { 'bat-par': 'Imprimerie', 'bat-le': '2026-11-09' });
  envoyer(form);
  await laisserFiler();
  assert.equal(R.etatPiece(ci).cle, 'sortie');
  assert.equal(R.preuveCourante(p, ci), null);
  assert.equal(p.preuvesRemise, undefined);
});

/* ————— Le même geste pour un lot (l'ancien « Consigner une remise ») ————— */

test('« Marquer le lot comme livré » : deux champs requis, les pièces cochées, un seul reçu pour le lot', async () => {
  const { s, p, ci, sn, R } = await geste();
  preparer(ci, 'CI'); preparer(sn, 'SN');
  cliquer(bouton(R.suiviLot(p, p.livrables, () => {}), 'Marquer le lot comme livré'));
  const form = s.dernier();
  assert.deepEqual(champs(form).filter(c => c.getAttribute('required') !== null).map(c => c.getAttribute('name')),
    ['destinataire', 'remis-le']);
  const cases = champs(form).filter(c => c.getAttribute('name') === 'pieces');
  assert.equal(cases.length, 2, 'les deux pièces prêtes ; la story sans fichier n’est pas proposée');
  assert.ok(cases.every(c => c.getAttribute('checked') === null), 'à deux pièces, rien n’est coché d’office');
  /* Rien de coché : refus, rien d'écrit. */
  remplir(form, { destinataire: 'Chargée de production' });
  envoyer(form);
  await laisserFiler();
  assert.match(erreur(form), /Choisissez au moins une pièce/);
  assert.equal(p.preuvesRemise, undefined);
  /* Coché, mais sans dire à qui : refus, rien d'écrit. */
  for (const c of cases) c.checked = true;
  remplir(form, { destinataire: '' });
  envoyer(form);
  await laisserFiler();
  assert.match(erreur(form), /à qui le lot a été remis/);
  assert.equal(p.preuvesRemise, undefined);
  remplir(form, { destinataire: 'Chargée de production' });
  envoyer(form);
  await laisserFiler();
  assert.equal(p.preuvesRemise.length, 1, 'un seul reçu couvre le lot');
  const recu = p.preuvesRemise[0];
  assert.deepEqual([recu.destinataire, recu.remis_le, recu.preuve.type, recu.preuve.contact, recu.preuve.date],
    ['Chargée de production', '2026-11-10', 'declaration', 'Chargée de production', '2026-11-10']);
  assert.deepEqual(recu.pieces.map(x => [x.id, x.version]), [['L-ci', 2], ['L-sn', 2]]);
  assert.equal(recu.acteur.personneId, 'P-recette', 'le reçu porte celui qui l’écrit');
  assert.equal(R.preuveCourante(p, ci), recu);
  assert.equal(R.preuveCourante(p, sn), recu);
  assert.equal(s.ctx.DEPOT.journal().filter(x => x.action === 'preuve de remise').length, 1);
  /* Le suivi du lot liste la livraison et ses pièces, et ne repropose plus le geste. */
  const apres = R.suiviLot(p, p.livrables, () => {});
  assert.match(apres.textContent, /Livraisons enregistrées.*Remise déclarée.*Livrable L-ci · V2 · Côte d’Ivoire.*Livrable L-sn · V2 · Sénégal/);
  assert.doesNotMatch(apres.textContent, /preuve historique/);
  assert.throws(() => bouton(apres, 'Marquer le lot comme livré'), /introuvable/);
});

test('« Marquer le lot comme livré » joint le bon de livraison : la preuve est le fichier déposé', async () => {
  const { s, p, ci, sn, R, depots } = await geste();
  preparer(ci, 'CI');
  cliquer(bouton(R.suiviLot(p, p.livrables, () => {}), 'Marquer le lot comme livré'));
  const form = s.dernier();
  const cases = champs(form).filter(c => c.getAttribute('name') === 'pieces');
  assert.equal(cases.length, 1);
  assert.notEqual(cases[0].getAttribute('checked'), null, 'une seule pièce : elle est cochée d’office');
  remplir(form, { destinataire: 'Imprimerie', 'remise-fichier': { name: 'bon-de-livraison.pdf', size: 4096 } });
  envoyer(form);
  await laisserFiler();
  assert.deepEqual(depots, ['bon-de-livraison.pdf']);
  const recu = R.preuveCourante(p, ci);
  assert.ok(recu, 'la pièce est livrée');
  assert.deepEqual([recu.preuve.nom, recu.preuve.type, recu.preuve.chemin],
    ['bon-de-livraison.pdf', 'fichier', 'assets/review/preuves/preuve-1.jpg']);
  assert.equal(R.preuveCourante(p, sn), null);
});

/* ————— Le dépôt d'une pièce jointe (IMAGE.deposerPreuve) et l'étage imposé
 * (IMAGE.accueillir) : le vrai module, avec le lecteur de fichiers, l'image,
 * le canevas et le réseau simulés. ————— */

async function televersement() {
  const x = await installation();
  const { ctx } = x.s;
  x.envois = []; x.toiles = []; x.largeur = 2400;
  ctx.fetch = (url, o) => {
    x.envois.push({ url, methode: o.method, corps: o.body });
    return Promise.resolve(x.reponse || { ok: true, json: () => Promise.resolve({ ok: true }) });
  };
  ctx.FileReader = class { readAsDataURL(f) { setImmediate(() => { this.result = f.donnee; this.onload(); }); } };
  ctx.Image = class { set src(v) { this.width = x.largeur; this.height = x.largeur * 2 / 3; setImmediate(() => this.onload()); } };
  const creer = ctx.document.createElement;
  ctx.document.createElement = t => {
    if (t !== 'canvas') return creer(t);
    const toile = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: type => 'data:' + type + ';base64,UkVEVUlU' };
    x.toiles.push(toile);
    return toile;
  };
  await x.s.charger('image');
  return x;
}
const deposer = (IMAGE, f) => new Promise(r => IMAGE.deposerPreuve(f, r));

test('une pièce jointe se dépose : la photo réduite à 1800 px, le PDF tel quel, sous un chemin reconnu comme preuve', async () => {
  const x = await televersement();
  const { IMAGE, REMISE } = x.s.ctx;
  const pdf = await deposer(IMAGE, { name: 'bon-de-livraison.pdf', size: 4096, donnee: 'data:application/octet-stream;base64,JVBERi0xLjQK' });
  assert.match(pdf, /^assets\/review\/preuves\/preuve-[a-z0-9]+\.pdf$/);
  assert.deepEqual(x.envois[0], { url: pdf, methode: 'PUT', corps: 'data:application/pdf;base64,JVBERi0xLjQK' },
    'le PDF part tel quel, déclaré application/pdf pour le serveur');
  assert.equal(x.toiles.length, 0, 'un PDF ne passe pas par le canevas');
  assert.ok(REMISE.preuveValide({ type: 'fichier', chemin: pdf }));
  const photo = await deposer(IMAGE, { name: 'BON-SIGNE.PNG', size: 2 * 1048576, donnee: 'data:image/png;base64,iVBORw0K' });
  assert.match(photo, /^assets\/review\/preuves\/preuve-[a-z0-9]+\.jpg$/);
  assert.deepEqual([x.toiles[0].width, x.toiles[0].height], [1800, 1200], 'une photo de 2400 px est réduite à 1800 px');
  assert.deepEqual([x.envois[1].url, x.envois[1].corps], [photo, 'data:image/jpeg;base64,UkVEVUlU']);
  assert.ok(REMISE.preuveValide({ type: 'fichier', chemin: photo }));
  assert.deepEqual(x.s.refus, []);
});

test('une pièce jointe est refusée : extension inconnue, plus de 16 Mo, refus du serveur, vitrine', async () => {
  const x = await televersement();
  const { IMAGE, DEPOT } = x.s.ctx;
  assert.equal(await deposer(IMAGE, { name: 'bon.heic', size: 1000, donnee: 'data:image/heic;base64,AAAA' }), null);
  assert.match(x.s.refus.at(-1), /photo, une capture ou un PDF/);
  assert.equal(await deposer(IMAGE, { name: 'bon.pdf', size: 17 * 1048576, donnee: 'data:application/pdf;base64,JVBE' }), null);
  assert.match(x.s.refus.at(-1), /pèse 17 Mo\. Au-delà de 16 Mo/);
  assert.equal(x.envois.length, 0, 'rien ne part au serveur');
  x.reponse = { ok: false, json: () => Promise.resolve({ ok: false }) };
  assert.equal(await deposer(IMAGE, { name: 'bon.pdf', size: 10, donnee: 'data:application/pdf;base64,JVBE' }), null);
  assert.match(x.s.refus.at(-1), /pas été enregistré/);
  x.reponse = null;
  DEPOT.estDemonstration = () => true;
  const envois = x.envois.length;
  assert.equal(await deposer(IMAGE, { name: 'bon.pdf', size: 10, donnee: 'data:application/pdf;base64,JVBE' }), null);
  assert.match(x.s.refus.at(-1), /démonstration/);
  assert.equal(x.envois.length, envois, 'la vitrine n’envoie rien');
});

test('« Poser le BAT » range la photo à l’étage du BAT, sans remplacer le visuel de la pièce', async () => {
  const x = await televersement();
  const { IMAGE } = x.s.ctx;
  x.largeur = 1200;
  const { ci } = x;
  ci.vignette = 'assets/review/vignettes/kv.jpg';
  const bat = await new Promise(r => IMAGE.accueillir(ci, { name: 'bon-signe.jpg', size: 3000, donnee: 'data:image/jpeg;base64,/9j/' }, r, false, 'bat'));
  assert.equal(ci.vignette, 'assets/review/vignettes/kv.jpg', 'le visuel de la pièce ne change pas');
  assert.deepEqual([bat.type, bat.nom, bat.signataire], ['bat', 'bon-signe.jpg', null]);
  assert.match(bat.emplacement, /^assets\/review\/livrables\/L-ci-f-[a-z0-9]+\.jpg$/);
  assert.equal(x.envois.at(-1).url, bat.emplacement);
  assert.equal(x.s.ctx.REMISE.etatPiece(ci).cle, 'bat', 'posé sans signataire, le BAT reste à accorder');
  /* Sans étage imposé, une image devient le visuel de la pièce. */
  const visuel = await new Promise(r => IMAGE.accueillir(ci, { name: 'kv-v2.jpg', size: 3000, donnee: 'data:image/jpeg;base64,/9j/' }, r, false));
  assert.equal(visuel.type, 'asset');
  assert.equal(ci.vignette, visuel.emplacement);
});

test('le PDF posé à l’étage du BAT monte sur le serveur comme celui joint à la livraison ; un .ai n’entre que par son nom, et le suivi le dit', async () => {
  const x = await televersement();
  const { IMAGE, REMISE } = x.s.ctx;
  const dits = [];
  x.s.ctx.AVIS.fait = m => dits.push(m);
  const { ci, p } = x;
  const pdf = await new Promise(r => IMAGE.accueillir(ci, { name: 'BAT-imprimeur.pdf', size: 4096, donnee: 'data:application/octet-stream;base64,JVBERi0xLjQK' }, r, false, 'bat'));
  assert.deepEqual([pdf.type, pdf.nom, pdf.signataire], ['bat', 'BAT-imprimeur.pdf', null]);
  assert.match(pdf.emplacement, /^assets\/review\/preuves\/preuve-[a-z0-9]+\.pdf$/);
  assert.deepEqual([x.envois.at(-1).url, x.envois.at(-1).corps], [pdf.emplacement, 'data:application/pdf;base64,JVBERi0xLjQK']);
  assert.ok(REMISE.fichierServi(pdf.emplacement), 'il s’ouvre depuis le suivi');
  assert.match(dits.at(-1), /se range à côté de la pièce/);
  /* Un .ai ne se regarde pas : rien ne part au serveur, seul son nom entre. */
  const envois = x.envois.length;
  const ai = await new Promise(r => IMAGE.accueillir(ci, { name: 'BAT-imprimeur.ai', size: 4096, donnee: 'data:application/octet-stream;base64,AAAA' }, r, false, 'bat'));
  assert.equal(x.envois.length, envois);
  assert.equal(ai.emplacement, '');
  assert.match(dits.at(-1), /seul son nom entre à la base\.$/);
  assert.doesNotMatch(dits.at(-1), /chemin/);
  /* Accordé, le BAT .ai dit qu'il n'est noté que par son nom, pas « sans pièce jointe ». */
  ci.fichiers = [Object.assign(ai, { signataire: 'Imprimerie', signe_le: '2026-11-09', version: 2,
    preuve: { type: 'declaration', texte: '', contact: 'Imprimerie', date: '2026-11-09' } })];
  const suivi = REMISE.suiviPiece(p, ci, () => {});
  assert.match(suivi.textContent, /BAT accordé · V2.*BAT-imprimeur\.ai · Imprimerie/);
  assert.match(suivi.textContent, /Fichier noté par son nom : il n’est pas déposé ici/);
  assert.doesNotMatch(suivi.textContent, /sans pièce jointe/);
});

test('des fichiers remis déclarés disent par où ils sont partis, « Autre » compris', async () => {
  const { R } = await installation();
  assert.equal(R.envoi('WeTransfer'), 'Fichiers envoyés par WeTransfer');
  assert.equal(R.envoi('Autre'), 'Fichiers envoyés par un autre moyen');
  assert.equal(R.envoi(''), '');
});
