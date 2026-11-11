// Le bilan de campagne : le geste qui l'arrête, sa forme figée et sa transmission.
//
// Le bilan d'une campagne était un texte (`campagne.bilan`) que personne ne
// pouvait écrire ni arrêter. On rejoue ici, dans le bac à sable des décisions,
// les vrais modules : dépôt, fabrique, acteur et campagne. Seuls l'écran voisin,
// le réseau et La Fusée sont simulés.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bac, semer, projet, PERSONNES, bouton, saisie, cliquer } from './decisions-scenarios.mjs';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const FIXTURE = JSON.parse(await readFile(new URL('./fixtures/bilan-campagne-v1.json', import.meta.url), 'utf8'));
const copie = x => JSON.parse(JSON.stringify(x));
const HEX = /^[a-f0-9]{64}$/;

/* Une seconde lecture de l'empreinte, indépendante du module : JSON aux clés
 * triées, sans le champ empreinte, SHA-256 de l'UTF-8. La Fusée refait la même. */
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const sceau = d => { const { empreinte: _e, ...reste } = d; return createHash('sha256').update(JSON.stringify(canon(reste)), 'utf8').digest('hex'); };

const CAMPAGNE = { id: 'C-bilan', nom: 'Marque de recette — Noël', regime: 'ponctuelle', occasion: 'noel',
  fenetre: { debut: '2026-11-15', fin: '2027-01-06' }, marqueIds: ['MQ-r'], bilan: '', ecartes: {} };

async function atelier({ campagne = {}, projets = [], securise = true } = {}) {
  const s = await bac(APP, 31);
  if (securise) { s.ctx.crypto = webcrypto; s.ctx.TextEncoder = TextEncoder; }
  await s.charger('campagne');
  semer(s.ctx, { personnes: PERSONNES, marques: [{ id: 'MQ-r', nom: 'Marque de recette' }],
    campagnes: [{ ...copie(CAMPAGNE), ...campagne }], projets });
  return s;
}
const lire = s => s.ctx.DEPOT.trouve('campagnes', 'C-bilan');
const revision = s => s.ctx.CAMPAGNE.etatBilan(lire(s)).revision;
const decisions = s => copie(s.ctx.DEPOT.liste('decisions'));

async function attendre(condition) {
  for (let i = 0; i < 200; i++) { if (condition()) return; await new Promise(r => setTimeout(r, 5)); }
  throw new Error('Délai dépassé');
}

test('le jeu commun : la même empreinte que La Fusée recalcule', async () => {
  const s = await atelier();
  for (const v of FIXTURE.versions) {
    assert.equal(sceau(v), v.empreinte);
    assert.equal(await s.ctx.CAMPAGNE.empreinteBilan(v), v.empreinte);
  }
  /* Une lettre change, l'empreinte change. */
  const altere = { ...FIXTURE.versions[1], contenu: FIXTURE.versions[1].contenu.replace('film', 'filn') };
  assert.notEqual(await s.ctx.CAMPAGNE.empreinteBilan(altere), FIXTURE.versions[1].empreinte);
  assert.equal(FIXTURE.versions[1].precedente, FIXTURE.versions[0].empreinte);
});

test('clore le bilan fige une version : identité, version, date, campagne, marque, contenu et empreinte', async () => {
  const s = await atelier({ campagne: { bilan: '  Le film a porté, l’affiche moins.  ' } });
  const r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  assert.equal(r.ok, true, r.erreur); assert.equal(r.dejaRecu, false);
  const c = lire(s), v = copie(c.bilanVersions[0]);
  assert.equal(c.bilanVersions.length, 1);
  assert.deepEqual(Object.keys(v), ['schema', 'schemaVersion', 'id', 'version', 'arrete_le', 'campagne', 'marques',
    'contenu', 'note', 'precedente', 'decision', 'qui', 'acteur', 'empreinte']);
  assert.equal(v.schema, 'la-barre/bilan-campagne'); assert.equal(v.schemaVersion, 1);
  assert.equal(v.id, 'BIL-C-bilan'); assert.equal(v.version, 1);
  assert.deepEqual(v.campagne, { id: 'C-bilan', nom: 'Marque de recette — Noël', regime: 'ponctuelle', occasion: 'noel',
    debut: '2026-11-15', fin: '2027-01-06' });
  assert.deepEqual(v.marques, [{ id: 'MQ-r', nom: 'Marque de recette' }]);
  assert.equal(v.contenu, 'Le film a porté, l’affiche moins.');
  assert.equal(v.note, null); assert.equal(v.precedente, null);
  assert.equal(new Date(v.arrete_le).toISOString(), v.arrete_le);
  assert.match(v.empreinte, HEX); assert.equal(sceau(v), v.empreinte);
  assert.equal(c.bilan_le, v.arrete_le);
  /* La fabrique : une décision au registre, avec son acteur et sa ligne de journal. */
  const ds = decisions(s);
  assert.equal(ds.length, 1);
  const d = ds[0];
  assert.equal(d.id, v.decision);
  for (const [k, x] of Object.entries({ type: 'bilan-campagne', objet: 'BIL-C-bilan', campagne: 'C-bilan', verdict: 'approuve',
    portee: 'campagne', motif: null, quand: v.arrete_le, version: 1, empreinte: v.empreinte })) assert.deepEqual(d[k], x, k);
  assert.equal('projet' in d, false);
  assert.equal(d.acteur.personneId, 'P-recette'); assert.equal(v.acteur.personneId, 'P-recette');
  const journal = copie(s.ctx.DEPOT.journal());
  assert.equal(journal.filter(e => e.type === 'decisions' && e.id === d.id).length, 1);
  const trace = journal.find(e => e.action === 'bilan arrêté');
  assert.ok(trace); assert.deepEqual(trace.marques, ['MQ-r']); assert.equal(trace.id, 'C-bilan');
  assert.ok(s.ctx.localStorage.getItem('la-barre'), 'la base est sauvegardée');
});

test('un rejeu sans changement retrouve la version, sans seconde décision', async () => {
  const s = await atelier({ campagne: { bilan: 'Le film a porté.' } });
  const premier = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  const avant = copie(s.ctx.DEPOT.tout());
  const rejeu = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  assert.equal(rejeu.ok, true); assert.equal(rejeu.dejaRecu, true);
  assert.equal(rejeu.version.empreinte, premier.version.empreinte);
  assert.deepEqual(copie(s.ctx.DEPOT.tout()), avant);
});

test('une nouvelle version dit ce qu’elle change ; la précédente reste intacte et chaînée', async () => {
  const s = await atelier({ campagne: { bilan: 'Première lecture.' } });
  await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  const v1 = copie(lire(s).bilanVersions[0]);
  s.ctx.CAMPAGNE.ecrireBilan(lire(s), 'Seconde lecture, avec les chiffres du distributeur.');
  assert.equal(s.ctx.CAMPAGNE.etatBilan(lire(s)).cle, 'modifie');
  for (const note of ['', '   ', null]) {
    const r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', note, revision(s));
    assert.equal(r.ok, false); assert.match(r.erreur, /ce que cette nouvelle version change/);
  }
  assert.equal(lire(s).bilanVersions.length, 1); assert.equal(decisions(s).length, 1);
  const r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', 'Chiffres du distributeur ajoutés', revision(s));
  assert.equal(r.ok, true, r.erreur);
  const [a, b] = copie(lire(s).bilanVersions);
  assert.deepEqual(a, v1);
  assert.equal(b.id, a.id); assert.equal(b.version, 2); assert.equal(b.precedente, a.empreinte);
  assert.equal(b.note, 'Chiffres du distributeur ajoutés'); assert.equal(sceau(b), b.empreinte);
  const d = decisions(s)[1];
  assert.equal(d.motif, 'Chiffres du distributeur ajoutés'); assert.equal(d.version, 2);
  assert.equal(s.ctx.CAMPAGNE.etatBilan(lire(s)).cle, 'arrete');
});

test('un bilan vide, trop long ou un dialogue périmé n’arrête rien', async () => {
  const s = await atelier();
  let r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  assert.equal(r.ok, false); assert.match(r.erreur, /Écrivez le bilan/);
  s.ctx.CAMPAGNE.ecrireBilan(lire(s), 'x'.repeat(60001));
  r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  assert.equal(r.ok, false); assert.match(r.erreur, /60 000/);
  s.ctx.CAMPAGNE.ecrireBilan(lire(s), 'Lu dans le dialogue.');
  const lue = revision(s);
  s.ctx.CAMPAGNE.ecrireBilan(lire(s), 'Modifié ailleurs entre-temps.');
  r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', lue);
  assert.equal(r.ok, false); assert.match(r.erreur, /a changé/);
  r = await s.ctx.CAMPAGNE.arreterBilan('C-absente', '', lue);
  assert.equal(r.ok, false); assert.match(r.erreur, /introuvable/);
  assert.equal(lire(s).bilanVersions, undefined); assert.equal(decisions(s).length, 0);
});

test('sans empreinte possible, le bilan n’est pas arrêté', async () => {
  const s = await atelier({ campagne: { bilan: 'Le film a porté.' }, securise: false });
  const r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  assert.equal(r.ok, false); assert.match(r.erreur, /connexion sécurisée/);
  assert.equal(lire(s).bilanVersions, undefined); assert.equal(decisions(s).length, 0);
});

test('le geste natif : l’écran de campagne écrit, puis clôt le bilan par la fabrique', async () => {
  const s = await atelier({ projets: [projet('PB', { campagneId: 'C-bilan', cloture: { le: '2026-11-09T08:00:00.000Z', bilan: 'Clos.' } })] });
  let bloc = s.ctx.CAMPAGNE.blocBilan(lire(s), () => {});
  saisie(bloc).value = 'Ce que la campagne a appris.';
  cliquer(bouton(bloc, 'Enregistrer le brouillon'));
  assert.equal(lire(s).bilan, 'Ce que la campagne a appris.');
  assert.equal(decisions(s).length, 0, 'écrire un brouillon n’est pas une décision');
  assert.match(s.ctx.CAMPAGNE.etat(lire(s)).quoi, /pas encore arrêté/);
  bloc = s.ctx.CAMPAGNE.blocBilan(lire(s), () => {});
  cliquer(bouton(bloc, 'Clore le bilan de campagne'));
  cliquer(bouton(s.dernier(), 'Arrêter la version 1'));
  await attendre(() => decisions(s).length === 1);
  assert.equal(lire(s).bilanVersions[0].contenu, 'Ce que la campagne a appris.');
  assert.equal(decisions(s)[0].type, 'bilan-campagne');
  assert.match(s.ctx.CAMPAGNE.etat(lire(s)).quoi, /arrêté.*version 1/);
});

function fusee(s, reponse) {
  const appels = [];
  s.ctx.VAULT = { statutContexte: () => ({ etat: 'recu', bilan: true }) };
  s.ctx.DEPOT.ecrireSurDisque = rappel => rappel(true);
  s.ctx.fetch = async (url, options) => {
    appels.push({ url, options: copie(options) });
    const { status = 200, corps } = reponse(JSON.parse(options.body));
    return { ok: status >= 200 && status < 300, status, json: async () => corps };
  };
  return appels;
}

test('transmettre envoie l’identité et l’empreinte, jamais le texte, et garde l’accusé de La Fusée', async () => {
  const s = await atelier({ campagne: { bilan: 'Le film a porté.' } });
  const { version } = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  const appels = fusee(s, () => ({ corps: { sourceId: 'src-1', edition: 1, version: 1, alreadyReceived: false,
    receivedAt: '2026-11-11T12:00:00.000Z', url: '/cockpit/brand/sources?strategy=s-1' } }));
  const r = await s.ctx.CAMPAGNE.transmettreBilan('C-bilan', 1);
  assert.equal(r.ok, true, r.erreur);
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, 'bilan');
  assert.equal(appels[0].options.method, 'POST'); assert.equal(appels[0].options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(appels[0].options.body), { campagneId: 'C-bilan', bilanId: 'BIL-C-bilan', version: 1, empreinte: version.empreinte });
  assert.doesNotMatch(appels[0].options.body, /film/);
  assert.deepEqual(copie(lire(s).bilanRecus['1']), { quand: '2026-11-11T12:00:00.000Z', empreinte: version.empreinte,
    source: 'src-1', edition: 1, lien: '/cockpit/brand/sources?strategy=s-1' });
  assert.deepEqual(copie(lire(s).bilanVersions[0]), copie(version), 'la version figée ne change pas');
  assert.ok(copie(s.ctx.DEPOT.journal()).some(e => e.action === 'bilan reçu par La Fusée'));
});

test('un refus de La Fusée est rendu tel quel et n’écrit aucun accusé', async () => {
  const s = await atelier({ campagne: { bilan: 'Le film a porté.' } });
  await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  fusee(s, () => ({ status: 409, corps: { code: 'BRAND_NOT_LINKED', quoi: 'Aucune marque de ce bilan n’est reliée à un dossier que vous pouvez ouvrir.' } }));
  const r = await s.ctx.CAMPAGNE.transmettreBilan('C-bilan', 1);
  assert.equal(r.ok, false); assert.match(r.erreur, /Aucune marque de ce bilan/);
  assert.equal(lire(s).bilanRecus, undefined);
});

test('hors de La Fusée, aucune transmission n’est proposée ni tentée', async () => {
  const s = await atelier({ campagne: { bilan: 'Le film a porté.' } });
  await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  let appels = 0; s.ctx.fetch = async () => { appels++; return { ok: true, json: async () => ({}) }; };
  const r = await s.ctx.CAMPAGNE.transmettreBilan('C-bilan', 1);
  assert.equal(r.ok, false); assert.match(r.erreur, /ouverte dans La Fusée/);
  assert.equal(appels, 0);
  assert.throws(() => bouton(s.ctx.CAMPAGNE.blocBilan(lire(s), () => {}), 'Transmettre à La Fusée'), /introuvable/);
  s.ctx.VAULT = { statutContexte: () => ({ etat: 'recu', bilan: true }) };
  assert.ok(bouton(s.ctx.CAMPAGNE.blocBilan(lire(s), () => {}), 'Transmettre à La Fusée'));
});

test('la chronologie de la marque montre chaque version arrêtée, à sa date', async () => {
  const s = await atelier({ campagne: { bilan: 'Première lecture.' } });
  await s.charger('vie-marque');
  await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', revision(s));
  s.ctx.CAMPAGNE.ecrireBilan(lire(s), 'Seconde lecture.');
  await s.ctx.CAMPAGNE.arreterBilan('C-bilan', 'Relu après les ventes', revision(s));
  const actes = copie(s.ctx.VIE_MARQUE.actes('MQ-r')).filter(a => a.genre === 'bilan');
  assert.deepEqual(actes.map(a => a.quand), copie(lire(s).bilanVersions).map(v => v.arrete_le).reverse());
  assert.ok(actes.every(a => /arrêté/.test(a.quoi)));
});
