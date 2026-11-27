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
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).quoi, 'Fichier à remettre à rattacher');
  ci.fichiers.push(fichier({ id: 'apercu', emplacement: 'assets/review/livrables/revue.jpg' }));
  assert.equal(R.etatPiece(ci).cle, 'sortie', 'un visuel compressé de revue ne devient pas un fichier de sortie');
  ci.fichiers.push(fichier({ id: 'asset', emplacement: '/production/affiche.pdf' }));
  assert.equal(R.etatPiece(ci).cle, 'preuve');
  assert.equal(R.lot(p).physiques, 1);
  assert.equal(R.preuveCourante(p, ci), null);
  assert.equal(R.etatPiece(digital).cle, 'sortie', 'le support social peut omettre le BAT');
  assert.equal(s.ctx.PRODUCTION.etape(p, ci).quoi, 'Preuve de remise à joindre');
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
