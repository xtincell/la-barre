// LB3 — l'acteur authentifié des décisions, côté La Barre.
//
// Servie derrière La Fusée, la base s'enregistre par la route de La Fusée, qui
// atteste les décisions et lignes de journal nouvelles avec la personne
// connectée et rend ce qu'elle a attesté. On rejoue ici les vrais modules —
// rapprochement, dépôt, acteur, fabrique, campagne, jurisprudence, réglages —
// contre une La Fusée simulée qui applique la même règle : poser sur ce qui est
// nouveau, rétablir ce qui est omis, refuser le reste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { bac, semer, PERSONNES } from './decisions-scenarios.mjs';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const clone = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
const revision = x => '"' + createHash('sha256').update(JSON.stringify(x)).digest('hex') + '"';
async function stable() { for (let i = 0; i < 12; i++) await tick(); }
const PARTAGE = JSON.parse(await readFile(new URL('./fixtures/bilan-campagne-atteste-v1.json', import.meta.url), 'utf8'));

/* ————— La Fusée simulée devant la base ————— */

const sans = e => { const { attestation: _a, ...r } = e; return JSON.stringify(r); };
const ALICE = { par: 'la-fusee', userId: 'user-alice', nom: 'Alice Martin', at: '2026-11-11T10:00:00.000Z', empreinte: 'e'.repeat(64), sceau: 's'.repeat(64) };
function fusee() {
  const server = { value: null, writes: [], perdre: false, refuser: null };
  server.fetch = async (path, init = {}) => {
    if (init.method !== 'PUT') return new Response(JSON.stringify(server.value), { headers: { ETag: revision(server.value) } });
    server.writes.push(clone(init));
    if (init.headers['If-Match'] !== revision(server.value)) return Response.json({ ok: false, code: 'REVISION_DEPASSEE' }, { status: 409 });
    if (server.refuser) return Response.json({ ok: false, code: server.refuser, quoi: 'Une attestation envoyée ne correspond à aucune attestation enregistrée.' }, { status: 422 });
    const doc = JSON.parse(init.body), attestations = [];
    for (const col of ['decisions', 'journal']) {
      const avant = new Map((server.value[col] || []).map(e => [sans(e), e.attestation]));
      (doc[col] || []).forEach((e, i) => {
        if (e.attestation) { assert.deepEqual(e.attestation, avant.get(sans(e)), 'le navigateur ne présente que ce qui est enregistré'); return; }
        if (avant.has(sans(e)) && !avant.get(sans(e))) return;
        const a = avant.get(sans(e)) || { ...ALICE, empreinte: createHash('sha256').update(sans(e)).digest('hex') };
        e.attestation = a; attestations.push({ chemin: [col, i], attestation: a, motif: avant.get(sans(e)) ? 'RETABLIE' : 'POSEE' });
      });
    }
    server.value = doc;
    if (server.perdre) { server.perdre = false; throw new Error('Réponse perdue'); }
    return Response.json({ ok: true, revision: revision(doc), enregistre_le: doc.enregistre_le, attestations });
  };
  return server;
}

async function client(server) {
  const sources = await Promise.all(['reconciliation.js', 'depot.js'].map(nom => readFile(new URL('../app/' + nom, import.meta.url), 'utf8')));
  const avis = [];
  const sandbox = { console, Date, Set, Map, Promise, Response,
    location: { protocol: 'http:' }, navigator: { platform: 'Test' },
    MAISON: { nom: 'Recette', titulaire: 'creation', natures: [{ cle: 'campagne' }] },
    O: { normalise: s => String(s).toLowerCase(), id: p => p + '-' + Math.random().toString(36).slice(2, 8) },
    AVIS: { grave: m => avis.push(m), fait() {}, refus() {} },
    setTimeout: () => 1, clearTimeout() {},
    localStorage: { setItem() {}, getItem() { return null; } },
    fetch: (path, init) => server.fetch(path, init),
    REPRISES: { garder: async () => {}, lire: async () => null, retirer: async () => {}, lister: async () => [], accuser: async () => {}, archiverAncien: async () => {} },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const source of sources) vm.runInContext(source, ctx);
  server.value = clone(ctx.DEPOT.vide());
  server.value.enregistre_le = '2026-11-11T09:00:00.000Z';
  server.value.rattachement2 = true;
  server.value.projets = [{ id: 'P1', nom: 'Noël', nature: 'campagne', perimetre: { supports: [], marches: [] } }];
  await new Promise(resolve => ctx.DEPOT.chargerReference({ reference: 'test.json' }, resolve));
  return { depot: ctx.DEPOT, avis };
}
const decision = { objet: 'P1', type: 'piste', projet: 'P1', verdict: 'approuve', motif: null, quand: '2026-11-11T10:00:00.000Z', qui: 'creation', titre: 'Piste A' };

test('le reçu de La Fusée pose les attestations sur la base envoyée et sur l’état courant', async () => {
  const server = fusee(), { depot } = await client(server);
  const d = depot.ajoute('decisions', { ...decision });
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.writes.length, 1);
  const ici = depot.trouve('decisions', d.id);
  assert.deepEqual(clone(ici.attestation), server.value.decisions[0].attestation);
  const trace = depot.journal().find(l => l.id === d.id);
  assert.equal(trace.attestation.userId, 'user-alice');
  assert.equal(depot.poids().surDisque, true, 'le document envoyé et l’état courant concordent');
  /* L'enregistrement suivant présente les attestations reçues, telles quelles. */
  depot.modifie('projets', 'P1', { nom: 'Noël 2026' });
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.writes.length, 2);
  assert.equal(server.value.projets[0].nom, 'Noël 2026');
  assert.equal(server.value.decisions.length, 1);
  assert.deepEqual(JSON.parse(server.writes[1].body).decisions[0].attestation, server.value.decisions[0].attestation);
});

test('une réponse perdue : le rapprochement reprend l’attestation du serveur, sans doublon ni arbitrage', async () => {
  const server = fusee(), { depot } = await client(server);
  server.perdre = true;
  const d = depot.ajoute('decisions', { ...decision });
  depot.ecrireSurDisque(); await stable();
  assert.equal(depot.trouve('decisions', d.id).attestation, undefined);
  depot.ecrireSurDisque(); await stable();   // 409 : relu puis rapproché
  assert.deepEqual(clone(depot.conflits()), []);
  assert.deepEqual(clone(depot.trouve('decisions', d.id).attestation), server.value.decisions[0].attestation);
  assert.equal(depot.journal().filter(l => l.id === d.id && l.action === 'création').length, 1);
  depot.ecrireSurDisque(); await stable();
  assert.equal(server.value.decisions.length, 1);
  assert.equal(server.value.journal.filter(l => l.id === d.id && l.action === 'création').length, 1);
  assert.equal(depot.poids().surDisque, true);
});

test('un refus d’attestation est rendu tel quel ; le travail reste dans le navigateur', async () => {
  const server = fusee(), { depot, avis } = await client(server);
  server.refuser = 'ATTESTATION_NOT_RECOGNIZED';
  depot.ajoute('decisions', { ...decision });
  depot.ecrireSurDisque(); await stable();
  assert.match(avis.at(-1), /Une attestation envoyée ne correspond à aucune attestation enregistrée/);
  assert.equal(depot.poids().surDisque, false);
  assert.equal(depot.liste('decisions').length, 1);
});

/* ————— Ce que l'écran en dit ————— */

async function atelier(statut) {
  const s = await bac(APP, 41);
  s.ctx.crypto = webcrypto; s.ctx.TextEncoder = TextEncoder;
  s.ctx.VAULT = { statutContexte: () => statut };
  /* Le bilan se fige avec les reprises du relevé : le vrai module, sans écart ici. */
  s.ctx.KV.conformite = () => [];
  s.ctx.FEEDBACK = { ordre: () => [], nomAuteur: a => a };
  s.ctx.ANNOT = { ouvertes: () => [] };
  await s.charger('ecarts');
  await s.charger('campagne');
  await s.charger('jurisprudence');
  semer(s.ctx, { personnes: PERSONNES, marques: [{ id: 'MQ-r', nom: 'Marque de recette' }],
    campagnes: [{ id: 'C-bilan', nom: 'Campagne', marqueIds: ['MQ-r'], bilan: 'Le film a porté.', ecartes: {} }] });
  return s;
}
const texte = n => (n.childNodes || []).map(x => x.data !== undefined ? x.data : texte(x)).join('');

test('l’empreinte d’une version de bilan ignore son attestation (jeu commun avec La Fusée)', async () => {
  const s = await atelier({ etat: 'independant', acteur: null });
  const v = PARTAGE.version;
  assert.equal(await s.ctx.CAMPAGNE.empreinteBilan(v), v.empreinte);
  const { attestation: _a, ...nue } = v;
  assert.equal(await s.ctx.CAMPAGNE.empreinteBilan(nue), v.empreinte);
});

test('derrière La Fusée, le bilan arrêté porte la personne connectée ; la version attestée le dit', async () => {
  const s = await atelier({ etat: 'recu', bilan: true, acteur: { id: 'user-alice', nom: 'Alice Martin' } });
  const c = s.ctx.DEPOT.trouve('campagnes', 'C-bilan');
  const r = await s.ctx.CAMPAGNE.arreterBilan('C-bilan', '', s.ctx.CAMPAGNE.etatBilan(c).revision);
  assert.equal(r.ok, true, r.erreur);
  assert.deepEqual(clone(r.version.acteur), { personneId: null, nom: 'Alice Martin', poste: s.ctx.MAISON.titulaire, postes: [s.ctx.MAISON.titulaire] });
  assert.equal(clone(r.decision.acteur).nom, 'Alice Martin');
  assert.match(texte(s.ctx.CAMPAGNE.blocBilan(c, () => {})), /par Alice Martin \(déclaré sur ce poste\)/,
    'tant que La Fusée ne l’a pas attestée, la version reste déclarée');
  c.bilanVersions[0].attestation = { ...ALICE };
  assert.match(texte(s.ctx.CAMPAGNE.blocBilan(c, () => {})), /par Alice Martin \(authentifié par La Fusée\)/);
});

test('le recueil des arbitrages dit qui a décidé : attesté ou déclaré', async () => {
  const s = await atelier({ etat: 'independant', acteur: null });
  const base = s.ctx.DEPOT.tout();
  base.decisions = [
    { ...decision, id: 'DEC-a', motif: 'Elle tient la promesse', verdict: 'reserve', acteur: { personneId: 'P-recette', nom: 'Personne de recette' }, attestation: { ...ALICE } },
    { ...decision, id: 'DEC-b', quand: '2026-11-11T11:00:00.000Z', motif: 'Trop proche', verdict: 'hors', acteur: { personneId: 'P-recette', nom: 'Personne de recette' } },
  ];
  const arbs = clone(s.ctx.JURISPRUDENCE.tout());
  const a = arbs.find(x => x.motif === 'Elle tient la promesse'), b = arbs.find(x => x.motif === 'Trop proche');
  assert.equal(a.attribution.texte, 'Alice Martin · authentifié par La Fusée');
  assert.equal(b.attribution.texte, 'Personne de recette · déclaré sur ce poste');
});

test('les réglages : sélecteur verrouillé sur la personne connectée, journal attesté ou déclaré', async () => {
  let statut = { etat: 'independant', acteur: null };
  const s = await bac(APP, 43);
  s.ctx.VAULT = { statutContexte: () => statut };
  await s.charger('vue-reglages', ['choixActeur', 'ligneJournal']);
  semer(s.ctx, { personnes: PERSONNES });
  const { choixActeur, ligneJournal } = s.interne['vue-reglages'];
  const libre = choixActeur();
  const select = n => n.tagName === 'SELECT' ? n : (n.childNodes || []).map(select).find(Boolean);
  assert.equal(select(libre).attributs.disabled, undefined);
  assert.match(texte(libre), /Déclaré sur ce poste/);
  statut = { etat: 'recu', acteur: { id: 'user-alice', nom: 'Alice Martin' } };
  const verrou = choixActeur();
  assert.equal(select(verrou).attributs.disabled, '');
  assert.match(texte(verrou), /Authentifié par La Fusée/); assert.match(texte(select(verrou)), /^Alice Martin$/);
  assert.match(texte(ligneJournal({ quand: '2026-11-11T10:00:00.000Z', action: 'création', type: 'decisions', id: 'DEC-1', attestation: { ...ALICE } })),
    /Alice Martin · authentifié par La Fusée$/);
  assert.match(texte(ligneJournal({ quand: '2026-11-11T10:00:00.000Z', action: 'création', type: 'decisions', id: 'DEC-1', acteur: { nom: 'Personne de recette' } })),
    /Personne de recette · déclaré sur ce poste$/);
});
