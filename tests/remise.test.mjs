import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { bac, semer, projet, livrable, PERSONNES, saisie, soumettre } from './decisions-scenarios.mjs';

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
  const piece = R.empreintePiece(ci, R.etatPiece(ci));
  /* La forme d'avant : une preuve sans type, un BAT sans preuve, une sortie sans canal. */
  p.preuvesRemise = [{ id: 'REM-ancien', remis_le: '2026-11-09', destinataire: 'Chargée de production',
    preuve: { nom: 'Accusé', url: 'https://documents.example.test/remises/42.pdf' }, pieces: [piece] }];
  assert.equal(R.preuveCourante(p, ci).id, 'REM-ancien');
  assert.equal(R.etatPiece(ci).cle, 'preuve');
  p.preuvesRemise[0].preuve.url = 'http://documents.example.test/remises/42.pdf';
  assert.equal(R.preuveCourante(p, ci), null, 'un lien qui n’est pas https ne devient pas valide');
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
  getAll(k) { return champs(this.form).filter(x => x.getAttribute('name') === k && x.checked).map(x => x.getAttribute('value')); }
}
const laisserFiler = () => new Promise(r => setImmediate(r));
function envoyer(racine) {
  const f = noeuds(racine, n => n.tagName === 'FORM')[0];
  for (const traiter of f.ecouteurs.submit || []) traiter.call(f, { preventDefault() {}, target: f });
}

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
  assert.deepEqual([recu.preuve.nom, recu.preuve.type, recu.preuve.chemin], ['bon-de-livraison.pdf', 'fichier', 'assets/review/preuves/preuve-2.jpg']);
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
