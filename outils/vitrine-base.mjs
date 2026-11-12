// La base fictive de la démonstration publique (vitrine/demo/base-fictive.json).
//
// Une marque inventée, du brief au BAT. La base n'est pas écrite à la main :
// elle est rejouée par les vrais modules de l'application (dépôt, fabrique de
// décision, KV, écarts de marché, production, campagne, clôture), sur le profil
// de l'agence fictive, avec une horloge et un hasard figés. Ce que la
// démonstration montre est donc exactement ce que l'outil écrit.
//
//   node outils/vitrine-base.mjs            réécrit vitrine/demo/base-fictive.json
//   node outils/vitrine-base.mjs --check    vérifie que le fichier versionné est
//                                           celui que rejouent les modules actuels
//
// Aucune personne, marque, client ni campagne réels. Rien n'est lu dans
// depots/ ni ailleurs : la base part de zéro.

import vm from 'node:vm';
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../', import.meta.url));
export const SORTIE = join(RACINE, 'vitrine', 'demo', 'base-fictive.json');

/* L'horloge se règle sur la date du geste ; chaque lecture avance d'une
 * seconde, comme un poste où l'on clique. */
function horloge() {
  let base = Date.parse('2026-06-01T08:00:00.000Z'), n = 0;
  const suivante = () => base + 1000 * n++;
  class FauxDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(suivante()); }
    static now() { return suivante(); }
    static aller(iso) { base = Date.parse(iso); n = 0; }
  }
  return FauxDate;
}

// mulberry32 : le même tirage à chaque rejeu.
function hasard(graine) {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function memoire() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() };
}

/* Le hasard de crypto, figé lui aussi : les identifiants de décision y sont
 * tirés (app/outils.js, O.aleatoire). Les empreintes gardent le vrai
 * crypto.subtle. */
function cryptoFige(graine) {
  const tirage = hasard(graine);
  return { subtle: webcrypto.subtle,
    getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(tirage() * 256); return a; } };
}

async function bac() {
  const Date = horloge();
  const refus = [];
  const sandbox = {
    console, Date, Math: Object.create(Math, { random: { value: hasard(2027) } }),
    crypto: cryptoFige(2028), TextEncoder, Uint8Array,
    location: { protocol: 'http:', hash: '', hostname: 'localhost', pathname: '/vitrine/demo/' },
    navigator: { platform: 'Démonstration' }, localStorage: memoire(), sessionStorage: memoire(),
    setTimeout: () => 0, clearTimeout() {},
    document: { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {}, addEventListener() {} }),
      createTextNode: t => ({ textContent: t }), querySelector: () => null, querySelectorAll: () => [] },
    AVIS: { refus: m => { refus.push(m); }, fait() {}, grave() {} },
    REPRISES: { garder: async () => {}, lire: async () => null, retirer: async () => {}, lister: async () => [] },
    LA_BARRE_DEMO: { base: 'base-fictive.json', acteur: 'PE-clemence', vitrine: '../' },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const lire = chemin => readFile(join(RACINE, chemin), 'utf8');
  for (const f of ['app/maison-base.js', 'vitrine/demo/maison.js', 'app/outils.js', 'app/reconciliation.js', 'app/depot.js',
    'app/decision.js', 'app/acteur.js', 'app/version.js', 'app/kv-modele.js', 'app/ecarts-marche.js', 'app/production.js',
    'app/campagne.js', 'app/cloture.js',
    /* Le relevé des écarts et ce qu'il lit : le bilan de campagne s'arrête avec ses reprises. */
    'app/regles.js', 'app/annotation.js', 'app/feedback.js', 'app/ecarts.js']) {
    vm.runInContext(await lire(f), ctx, { filename: f });
  }
  return { ctx, Date, refus };
}

/* ————————————————————— Le référentiel fictif ————————————————————— */

const PERSONNES = [
  { id: 'PE-clemence', nom: 'Clémence Ardoise', poste: 'creation', casquettes: [], seniorite: 'senior' },
  { id: 'PE-ilan', nom: 'Ilan Corbeau', poste: 'da', casquettes: [{ poste: 'motion', part: 20 }], seniorite: 'senior' },
  { id: 'PE-nadia', nom: 'Nadia Sablier', poste: 'redacteur', casquettes: [], seniorite: 'confirme' },
  { id: 'PE-hugo', nom: 'Hugo Lanterne', poste: 'planning', casquettes: [], seniorite: 'confirme' },
  { id: 'PE-sacha', nom: 'Sacha Mistral', poste: 'clientele', casquettes: [], seniorite: 'senior' },
  { id: 'PE-yao', nom: 'Yao Brisant', poste: 'graphic', casquettes: [], seniorite: 'junior' },
];

const MARCHES = [
  { id: 'M-ci', code: 'CI', nom: 'Côte d’Ivoire', langues: ['fr'], zone: 'UEMOA',
    sku: ['Canette 33 cl', 'Bouteille 50 cl'], mentions: ['À consommer de préférence avant le…'] },
  { id: 'M-sn', code: 'SN', nom: 'Sénégal', langues: ['fr'], zone: 'UEMOA',
    sku: ['Canette 33 cl'], mentions: ['À consommer de préférence avant le…'] },
  { id: 'M-gh', code: 'GH', nom: 'Ghana', langues: ['en'], zone: 'Afrique de l’Ouest',
    sku: ['Can 33 cl', 'Can 50 cl'], mentions: ['Best before end'] },
];

const SUPPORTS = [
  { id: 'S-kv', code: 'kv', nom: 'Key visual', type: 'kv' },
  { id: 'S-affiche', code: '4x3', nom: 'Affiche 4×3', type: 'print' },
  { id: 'S-social', code: 'social', nom: 'Post social 1:1', type: 'social' },
];

const DA = [
  { cle: 'geste', nom: 'Le geste', aide: 'Ce que fait la main sur la canette.' },
  { cle: 'lumiere', nom: 'La lumière', aide: 'L’heure du jour que le visuel montre.' },
];

const BRIEF = {
  verbatim: 'Lancer Orvelle Zeste, notre eau pétillante au citron, sur trois marchés d’Afrique de l’Ouest. Il faut qu’on la prenne le matin, pas seulement au déjeuner.',
  probleme: 'Orvelle est connue comme l’eau du déjeuner. Le citron l’emmène ailleurs : il faut lui trouver un moment à elle, sans renier la marque.',
  objectif_business: 'Installer Zeste dans les références de la marque sur la saison de lancement (chiffres fictifs).',
  objectif_com: 'Faire d’Orvelle Zeste la boisson qui ouvre la journée.',
  campagne_source: 'Le bilan arrêté d’« Orvelle Source 2026 » : la fraîcheur se montrait trop tard dans la journée, et les visuels sans produit ne se reconnaissaient pas à trois mètres.',
  cible: 'Les actifs urbains de 25 à 40 ans qui commencent tôt et cherchent un geste frais avant le premier rendez-vous.',
  insight: 'Le premier moment calme de la journée est celui qu’on se donne avant que les autres ne le prennent.',
  promesse: 'Le premier zeste du jour.',
  rtb: ['Citron pressé, sans sucres ajoutés', 'Fines bulles', 'Canette refermable de 33 cl'],
  ton: 'Lumineux, simple, matinal. Jamais énergisant ni sportif.',
  contraintes: 'Une seule idée pour trois marchés. Le Ghana parle anglais ; le Sénégal impose une mention sur les boissons aromatisées.',
  mandatories: ['Le logo Orvelle en haut', 'La canette lisible à trois mètres', 'La mention légale de chaque marché'],
  livrables_attendus: ['KV master commun', 'KV par marché', 'Affiche 4×3', 'Post social 1:1'],
  kpis: ['Notoriété assistée de Zeste après huit semaines (mesure fictive)', 'Présence en rayon des trois références'],
  canaux: ['Affichage urbain', 'Réseaux sociaux'],
  calendrier: ['Février 2027 : lancement CI et SN', 'Mars 2027 : lancement GH'],
  porteur: 'Sacha Mistral',
};

const BRIEFBACK = {
  compris: 'Vous nous demandez un moment de consommation pour Zeste, pas seulement un lancement de produit : le matin, sans renier « Reprendre son souffle ».',
  couche: 'consommateur',
  propose: 'Une seule idée pour les trois marchés, adaptée par marché sur ce que chacun déclare au cadrage.',
  ecart: '',
  envoye_le: '2026-10-08',
  reponse: 'C’est bien ça. Le Ghana doit être prêt en mars.',
  repondu_le: '2026-10-09',
};

const INSIGHT = {
  id: 'IN-matin', couche: 'consommateur', auteur: 'PE-hugo', ecrit_le: '2026-10-07T09:00:00.000Z',
  passes: { longue: 'Avant le premier rendez-vous, chacun se cherche une minute à soi, que personne ne lui a encore prise.',
    temps: { situation: 'Le matin, on part vite et on répond à tout le monde.',
      tension: 'La seule minute calme de la journée est celle qu’on se donne avant les autres.',
      empeche: 'Aucune boisson fraîche n’est associée à cette minute : on la passe sans geste.' },
    phrase: 'Le premier moment calme de la journée est celui qu’on se donne avant que les autres ne le prennent.' },
  sources: [
    { type: 'terrain', quoi: 'Six entretiens de rue à Abidjan et Dakar (fictifs)', quand: '2026-10-02' },
    { type: 'premiere-ligne', quoi: 'Les vendeurs de kiosque : la canette se vend surtout après midi (relevé fictif)', quand: '2026-10-03' },
    { type: 'mur', quoi: 'Le mur de catégorie : aucune boisson fraîche ne parle du matin', quand: '2026-10-04' },
  ],
  test: { contredit: true, gene: true, ouvre: true },
};

const TERRITOIRE = { id: 'TR-matin', nom: 'Le matin', quoi: 'La minute qui précède la journée.', insightId: 'IN-matin',
  ecole: null, convention: null, reduction: null };

const AXES = {
  'PI-zeste': { axe_directrice: 'La minute avant la journée, saisie dans un geste.', axe_ton: 'Lumineux, simple, matinal',
    axe_univers: 'Vert profond et jaune citron, la canette au premier plan, la première lumière.', axe_valeurs: ['Fraîcheur', 'Un moment à soi'] },
  'PI-sieste': { axe_directrice: 'La pause de l’après-midi, réveillée.', axe_ton: 'Joueur, détendu',
    axe_univers: 'Couleurs chaudes, hamac, ombre.', axe_valeurs: ['Détente'] },
  'PI-minuit': { axe_directrice: 'La fraîcheur des nuits de ville.', axe_ton: 'Nocturne, électrique',
    axe_univers: 'Néons, bleu nuit, perles d’eau.', axe_valeurs: ['Liberté'] },
};

const SOCLE = {
  positionnement: 'Orvelle est l’eau pétillante qui accompagne les moments où l’on reprend son souffle.',
  promesse: 'Le premier zeste du jour.',
  idee_directrice: 'Reprendre son souffle',
  benefices: ['Fraîcheur', 'Légèreté', 'Un moment à soi'],
  preuves: ['Source unique', 'Citron pressé', 'Sans sucres ajoutés'],
  ton: 'Lumineux, simple, chaleureux.',
  jamais: ['énergisant', 'boost', 'performance'],
  symboles: ['La goutte', 'Le zeste', 'Le premier rayon'],
  ne_fera_pas: ['Parler de sport', 'Promettre de l’énergie'],
};

const BIGIDEA = {
  idee: 'Le premier zeste du jour',
  campagne: 'Orvelle Zeste — lancement 2027',
  auteur: 'PE-clemence',
  mecanique: 'Chaque visuel saisit la minute qui précède la journée : la main qui ouvre la canette, la lumière qui arrive.',
  rattachement: 'Elle prolonge « Reprendre son souffle » vers le matin, que le bilan de 2026 a montré inoccupé.',
  signature: 'Orvelle. Reprendre son souffle.',
  ton_campagne: 'Matinal et lumineux',
  phares: ['La canette ouverte', 'Le rayon de soleil'],
  criteres: ['La canette se lit à trois mètres', 'Une seule idée par visuel', 'Le matin se reconnaît sans texte'],
  interdits: ['Montrer un effort physique'],
  validite: 'Deux saisons au moins, sur les trois marchés.',
};

const PISTES = [
  { id: 'PI-zeste', titre: 'Le premier zeste', auteurDA: 'PE-ilan', auteurCR: 'PE-nadia', territoireId: 'TR-matin',
    concept: 'Le geste qui ouvre la journée : la canette s’ouvre, le soleil se lève.',
    accroches: ['Le premier zeste du jour', 'Ouvrir le jour'], visuel: 'Une main, une canette, la première lumière.',
    sacrifice: 'Le déjeuner, territoire historique de la marque', privilegie: 'Le matin, que personne n’occupe',
    argument: 'Le seul territoire que le bilan 2026 a montré libre.', statut: 'proposee', version: 1,
    soumis_le: '2026-10-16T09:00:00.000Z' },
  { id: 'PI-sieste', titre: 'La sieste pétillante', auteurDA: 'PE-ilan', auteurCR: 'PE-nadia',
    concept: 'La pause de l’après-midi, réveillée par le citron.',
    accroches: ['Réveillez la sieste'], visuel: 'Un hamac, une canette, un sourire.',
    sacrifice: 'Le matin', argument: 'La pause est déjà un rituel.', statut: 'proposee', version: 1,
    soumis_le: '2026-10-16T10:00:00.000Z' },
  { id: 'PI-minuit', titre: 'Citron de minuit', auteurDA: 'PE-yao', auteurCR: 'PE-nadia',
    concept: 'La fraîcheur des nuits de ville.',
    accroches: ['La ville a soif'], visuel: 'Des néons, une canette perlée.',
    sacrifice: 'La lumière du jour', argument: 'Un code plus jeune.', statut: 'proposee', version: 1,
    soumis_le: '2026-10-16T11:00:00.000Z' },
];

/* ————————————————————— Les gestes ————————————————————— */

function points(ctx, etat) {
  const p = {};
  ctx.MAISON.points.forEach(a => { p[a.cle] = etat; });
  return p;
}

/* Soumettre une version, puis la juger : les deux gestes de la matrice et du
 * panneau du livrable (vue-matrice.js, vue-livrable.js). */
function soumettre(c, l, quand) {
  c.Date.aller(quand);
  l.versions = l.versions || [];
  const n = l.versions.length + 1;
  l.versions.push({ n, soumis_le: new c.Date().toISOString(), verdict: null });
  l.version = n;
  c.ctx.DEPOT.tracer('soumission', 'livrables', 'PRJ-zeste', l.nom + ' V' + n);
}
function juger(c, p, l, verdict, motif, quand) {
  c.Date.aller(quand);
  const v = l.versions[l.versions.length - 1];
  v.verdict = verdict; v.motif = motif; v.juge_le = new c.Date().toISOString();
  if (verdict === 'approuve') l.points.central = 'pret';
  c.ctx.DECISION.poser({ objet: l.id, type: 'livrable', projet: p.id, verdict, motif,
    quand: v.juge_le, qui: c.ctx.MAISON.titulaire, titre: l.nom });
}

function format(c, p, kv, supportId, nom, extra) {
  const { DEPOT, MAISON } = c.ctx;
  const m = DEPOT.trouve('marches', kv.marche);
  const l = {
    id: c.ctx.O.id('L'), niveau: 'declinaison', voletId: null, support: supportId, marche: kv.marche,
    nom: nom + ' · ' + m.code, responsable: 'PE-yao', origine: 'prevu', pisteId: kv.pisteId,
    maitre: kv.id, versionMaitre: kv.version || 1, version: 1, versions: [],
    estime: 1, reel: null, toursVendus: 2, remise: null, echeance: null, publication: null,
    assets: [], entrees: [], annotations: [], mockups: [], points: points(c.ctx, 'attente'), ...extra,
  };
  p.livrables.push(l);
  DEPOT.tracer('déclinaison', 'kv', p.id, '1 format depuis ' + kv.nom);
  void MAISON;
  return l;
}

export async function construire() {
  const c = await bac();
  const { ctx, Date } = c;
  const { DEPOT, DECISION, KV, ECARTS_MARCHE, PRODUCTION, CAMPAGNE, CLOTURE, ACTEUR, MAISON } = ctx;

  Date.aller('2026-03-01T08:00:00.000Z');
  DEPOT.poserDemonstration({
    schema: 5, maison: MAISON.nom, rattachement2: true,
    personnes: PERSONNES, marches: MARCHES, supports: SUPPORTS,
    clients: [{ id: 'CL-orvelle', nom: 'Sources d’Orvelle', interne: false,
      nommage: '{marque}_{campagne}_{marche}_{support}_{langue}_{version}' }],
    contacts: [{ id: 'CT-margaux', clientId: 'CL-orvelle', nom: 'Margaux Tilleul', role: 'Directrice marketing (fictive)' }],
    marques: [{ id: 'MQ-orvelle', clientId: 'CL-orvelle', nom: 'Orvelle', secteur: 'Boissons',
      note: 'Marque fictive, inventée pour la démonstration.',
      vault: { couleur: '#0F3B3A', vision: 'Un monde où chacun reprend son souffle avant la journée.',
        mission: 'Une eau pétillante de source, sans sucres ajoutés, pour les moments où l’on souffle.',
        valeurs: ['Simplicité', 'Fraîcheur', 'Proximité'], positionnement: SOCLE.positionnement,
        promesse: 'Reprendre son souffle.', idee_directrice: SOCLE.idee_directrice, ton: SOCLE.ton,
        jamais: SOCLE.jamais.slice(), symboles: SOCLE.symboles.slice() } }],
    assets: [{ id: 'AS-logo-orvelle', nom: 'Logo Orvelle', marque: 'MQ-orvelle', role: 'logo',
      vignette: 'visuels/logo-orvelle.svg', cree_le: '2026-02-02T08:00:00.000Z' }],
    campagnes: [
      { id: 'CMP-orvelle-source', nom: 'Orvelle Source 2026', clientId: 'CL-orvelle', marqueIds: ['MQ-orvelle'],
        regime: 'ponctuelle', occasion: 'lancement', fenetre: { debut: '2026-03-01', fin: '2026-05-31' },
        marches: ['M-ci', 'M-sn'], bilan: '', ecartes: {}, cree_le: '2026-02-02T08:00:00.000Z' },
      { id: 'CMP-orvelle-zeste', nom: 'Orvelle Zeste — lancement 2027', clientId: 'CL-orvelle', marqueIds: ['MQ-orvelle'],
        regime: 'ponctuelle', occasion: 'lancement', fenetre: { debut: '2027-02-01', fin: '2027-04-30' },
        marches: ['M-ci', 'M-sn', 'M-gh'], bilan: '', ecartes: {}, cree_le: '2026-09-28T08:00:00.000Z' },
    ],
    projets: [],
  });
  ACTEUR.choisir('PE-clemence');
  const projets = DEPOT.liste('projets');

  /* ——— La campagne précédente : livrée, close, et son bilan arrêté. ——— */
  const source = {
    id: 'PRJ-source', ref: 'ORV-2026-01', nom: 'Orvelle Source — affichage 2026', nature: 'campagne', gabarit: 'campagne',
    campagneId: 'CMP-orvelle-source', statut: 'livre', cree_le: '2026-02-02T08:00:00.000Z',
    equipe: [{ personne: 'PE-clemence', poste: 'creation' }, { personne: 'PE-ilan', poste: 'da' }],
    perimetre: { supports: ['S-affiche'], marches: ['M-ci', 'M-sn'] }, volets: [],
    sections: { identite: { client: 'Sources d’Orvelle', clientId: 'CL-orvelle', marqueIds: ['MQ-orvelle'], type: 'Campagne d’affichage',
      echeance: '2026-02-27', decideurId: 'CT-margaux', objectif: 'Rappeler la source de la marque.' },
    brief: { probleme: 'Rappeler d’où vient Orvelle.', promesse: 'L’eau qui pétille d’ici.' },
    pistes: [{ id: 'PI-source', titre: 'L’eau qui pétille d’ici', statut: 'retenue', auteurDA: 'PE-ilan', version: 1,
      motif: 'Elle porte la source sans la nommer.', arbitre_le: '2026-02-10T09:00:00.000Z' }] },
    livrables: [{ id: 'L-source-kv', niveau: 'maitre', nom: 'KV master commun · Orvelle', support: 'S-kv', marche: null,
      pisteId: 'PI-source', maitre: null, versionMaitre: null, version: 1, responsable: 'PE-ilan', estime: 3, reel: 4,
      remise: '2026-02-20', vignette: 'visuels/kv-source-2026.svg', origine: 'prevu',
      versions: [{ n: 1, soumis_le: '2026-02-18T09:00:00.000Z', verdict: 'approuve', motif: '', juge_le: '2026-02-19T09:00:00.000Z' }],
      kv: { marque: 'Orvelle', copy: 'L’eau qui pétille d’ici', langue: 'fr', sku: ['Bouteille 50 cl'], mentions: [], restrictions: [] },
      points: points(ctx, 'pret'), assets: [], entrees: [], annotations: [], mockups: [] }],
    idees: [],
    resultat: [{ quoi: 'Citation spontanée de la marque', valeur: '+6 points en trois mois (relevé fictif)',
      source: 'Relevé fictif de la démonstration', niveau: 'declaratif', date: '2026-06-15' }],
  };
  projets.push(source);
  Date.aller('2026-06-20T16:00:00.000Z');
  CLOTURE.cloturer(source, 'Campagne livrée sur les deux marchés. Le bilan de campagne fait foi.', 'décidé à la main');
  const cs = DEPOT.trouve('campagnes', 'CMP-orvelle-source');
  Date.aller('2026-06-25T10:00:00.000Z');
  CAMPAGNE.ecrireBilan(cs, 'Ce qui a tenu : la source se reconnaît, la marque a été citée spontanément sur les deux marchés (relevé fictif).\n'
    + 'Ce qui n’a pas tenu : la fraîcheur se montrait trop tard dans la journée, et les visuels sans produit ne se lisaient pas à trois mètres.\n'
    + 'Pour la campagne suivante : montrer le produit, et chercher un moment de la journée que la marque n’occupe pas encore.');
  Date.aller('2026-06-26T09:00:00.000Z');
  const arret = await CAMPAGNE.arreterBilan(cs.id, '', CAMPAGNE.etatBilan(cs).revision);
  if (!arret.ok) throw new Error('Bilan non arrêté : ' + arret.erreur);

  /* ——— Le projet de la démonstration : du brief au BAT. ——— */
  Date.aller('2026-10-01T08:00:00.000Z');
  const p = {
    id: 'PRJ-zeste', ref: 'ORV-2027-01', nom: 'Orvelle Zeste — lancement', nature: 'campagne', gabarit: 'campagne',
    campagneId: 'CMP-orvelle-zeste', statut: 'production', cree_le: new Date().toISOString(),
    equipe: [{ personne: 'PE-clemence', poste: 'creation' }, { personne: 'PE-ilan', poste: 'da' },
      { personne: 'PE-nadia', poste: 'redacteur' }, { personne: 'PE-hugo', poste: 'planning' },
      { personne: 'PE-sacha', poste: 'clientele' }, { personne: 'PE-yao', poste: 'graphic' }],
    perimetre: { supports: ['S-kv', 'S-affiche', 'S-social'], marches: ['M-ci', 'M-sn', 'M-gh'] }, volets: [],
    champsDA: DA,
    sections: {
      identite: { client: 'Sources d’Orvelle', clientId: 'CL-orvelle', marqueIds: ['MQ-orvelle'], type: 'Lancement de produit, trois marchés',
        debut: '2026-10-01', echeance: '2026-12-11', budget: 18000000, decideurId: 'CT-margaux',
        decideur: 'Margaux Tilleul, directrice marketing (fictive)',
        tueur: 'La direction générale du client (fictive)', circuit: 'Marketing, puis direction générale du client (fictif)',
        fenetre: 'Février à avril 2027', objectif: 'Faire d’Orvelle Zeste la boisson qui ouvre la journée.',
        mesure: ['Notoriété assistée (mesure fictive)'], pilier: 'E' },
      brief: Object.assign({}, BRIEF),
      briefback: Object.assign({}, BRIEFBACK),
      socle: Object.assign({}, SOCLE),
      strategie: { territoire: 'Le matin, la minute qui précède la journée.', probleme_reel: 'La marque n’a pas de moment à elle : le déjeuner appartient à tout le monde.',
        opportunite: 'Le matin, avant le premier rendez-vous, n’est occupé par aucune boisson fraîche.',
        a_garder: ['La source', 'La goutte'], a_adapter: ['Le moment de consommation'], a_ecarter: ['Le registre sportif'] },
      bigidea: Object.assign({}, BIGIDEA),
      pistes: PISTES.map(x => Object.assign({}, x, AXES[x.id])),
      atelier: { tenue_le: '2026-10-12T09:00:00.000Z' },
    },
    insights: [JSON.parse(JSON.stringify(INSIGHT))], territoires: [Object.assign({}, TERRITOIRE)],
    livrables: [],
    demandes: [{ id: 'DP-zeste', etat: 'recue', cree_le: '2026-10-14T16:00:00.000Z',
      titre: 'Proposition créative — lancement Orvelle Zeste', da: 'PE-ilan', etage: 1,
      criteres: BIGIDEA.criteres.slice(), interdits: ['Montrer un effort physique', 'Parler d’énergie'],
      latitude: ['Le cadrage et la lumière', 'Le casting', 'La place de la canette, tant qu’elle se lit à trois mètres'],
      entrees: ['La plateforme de marque', 'Le bilan arrêté d’Orvelle Source 2026', 'Les packshots de la canette (fictifs)'],
      echeance: '2026-10-16', emise_le: '2026-10-14T16:05:00.000Z', recue_le: '2026-10-16T11:30:00.000Z' }],
    idees: [{ id: 'ID-geste', texte: 'Le geste qui ouvre la journée : la canette, avant le premier rendez-vous.',
      auteur: 'PE-nadia', statut: 'proposee', quand: '2026-10-12T10:00:00.000Z' }],
  };
  projets.push(p);
  DEPOT.tracer('création', 'projets', p.id, p.nom);

  /* Le brief accepté et validé, la plateforme validée. */
  Date.aller('2026-10-03T09:30:00.000Z');
  const accepte = DECISION.construire({ objet: 'brief', type: 'recevabilite', projet: p.id, verdict: 'approuve', motif: null,
    quand: new Date().toISOString(), qui: MAISON.titulaire, acteur: DECISION.acteur(), titre: 'le brief' });
  Object.assign(p.sections.brief, { statut: 'accepte', accepte_le: accepte.quand, accepte_malgre: 0 });
  DECISION.ajouter(accepte);
  DEPOT.tracer('acceptation', 'projets', p.id, 'brief accepté');

  Date.aller('2026-10-03T10:00:00.000Z');
  const briefValide = new Date().toISOString();
  p.sections.brief.validation = { verdict: 'approuve', motif: null, quand: briefValide, par: MAISON.titulaire,
    acteur: ACTEUR.trace(), portee: 'document', confirmationsEnAttente: [], version: 1 };
  DECISION.poser({ objet: 'brief', type: 'brief', projet: p.id, verdict: 'approuve', motif: null, quand: briefValide,
    qui: MAISON.titulaire, acteur: p.sections.brief.validation.acteur, version: 1, portee: 'document', titre: 'le brief' });

  Date.aller('2026-10-06T11:00:00.000Z');
  const valide = new Date().toISOString();
  p.sections.socle.validation = { verdict: 'approuve', motif: null, quand: valide, par: MAISON.titulaire,
    acteur: ACTEUR.trace(), portee: 'document', confirmationsEnAttente: [], version: 1 };
  DECISION.poser({ objet: 'socle', type: 'socle', projet: p.id, verdict: 'approuve', motif: null, quand: valide,
    qui: MAISON.titulaire, acteur: p.sections.socle.validation.acteur, version: 1, portee: 'document', titre: 'la plateforme de marque' });

  /* L'idée tranchée en séance de créa (vue-atelier.js). */
  Date.aller('2026-10-12T16:00:00.000Z');
  const ideeAtelier = p.idees[0];
  ideeAtelier.statut = 'retenue'; ideeAtelier.motif = 'Elle occupe le matin, que la catégorie laisse libre.';
  ideeAtelier.arbitre_le = new Date().toISOString();
  DECISION.poser({ objet: ideeAtelier.id, type: 'idee', projet: p.id, verdict: 'approuve', motif: ideeAtelier.motif,
    quand: ideeAtelier.arbitre_le, qui: MAISON.titulaire, titre: ideeAtelier.texte });

  Date.aller('2026-10-14T15:00:00.000Z');
  const idee = new Date().toISOString();
  p.sections.bigidea.validation = { verdict: 'approuve', motif: 'Elle tient la promesse et occupe le seul moment libre.', quand: idee,
    par: MAISON.titulaire, acteur: ACTEUR.trace(), portee: 'document', confirmationsEnAttente: [], version: 1 };
  DECISION.poser({ objet: 'bigidea', type: 'bigidea', projet: p.id, verdict: 'approuve',
    motif: 'Elle tient la promesse et occupe le seul moment libre.', quand: idee, qui: MAISON.titulaire,
    acteur: p.sections.bigidea.validation.acteur, version: 1, portee: 'document', titre: 'la big idea' });

  /* Les pistes arbitrées : une retenue, deux écartées, chacune motivée. */
  const [zeste, sieste, minuit] = p.sections.pistes;
  Date.aller('2026-10-20T10:00:00.000Z');
  zeste.statut = 'retenue'; zeste.motif = 'La seule qui occupe le matin, que le bilan 2026 a laissé libre.';
  zeste.arbitre_le = new Date().toISOString();
  DECISION.poser({ objet: zeste.id, type: 'piste', projet: p.id, verdict: 'approuve', motif: zeste.motif,
    quand: zeste.arbitre_le, qui: MAISON.titulaire, titre: zeste.titre });
  DEPOT.tracer('piste retenue', 'pistes', p.id, zeste.titre);
  for (const [pi, motif] of [[sieste, 'L’après-midi appartient déjà aux sodas : la marque y serait suiveuse.'],
    [minuit, 'La nuit contredit « Reprendre son souffle » et vieillit la cible.']]) {
    const d = DECISION.construire({ objet: pi.id, type: 'piste', projet: p.id, verdict: 'hors', motif,
      quand: new Date().toISOString(), qui: MAISON.titulaire, acteur: DECISION.acteur(), titre: pi.titre });
    pi.statut = 'ecartee'; pi.motif = d.motif;
    DECISION.ajouter(d);
    DEPOT.tracer('piste écartée', 'pistes', p.id, pi.titre);
  }

  /* Le cadrage par marché, avant le premier crayon. Le Ghana ne déclare que le
   * produit : la langue y a été oubliée — c'est ce que la revue rattrapera. */
  Date.aller('2026-10-21T09:00:00.000Z');
  ECARTS_MARCHE.declarer(p, 'M-ci', [], 'Le master tel quel.');
  ECARTS_MARCHE.declarer(p, 'M-sn', ['reglementaire'], 'La mention « boisson aromatisée » est exigée sur les boissons au citron.');
  ECARTS_MARCHE.declarer(p, 'M-gh', ['produit'], 'La canette se vend sous sa référence locale, Can 33 cl.');

  /* Le KV master : un retour, puis la validation du master. */
  Date.aller('2026-10-22T09:00:00.000Z');
  const master = KV.creer(p, null, null, 'maitre');
  master.pisteId = zeste.id; master.responsable = 'PE-ilan';
  Object.assign(master.kv, { marque: 'Orvelle', copy: 'Le premier zeste du jour', langue: 'fr', sku: ['Canette 33 cl'],
    restrictions: [], geste: 'La main ouvre la canette', lumiere: 'Le premier rayon, avant sept heures' });
  master.nom = 'KV master commun · Orvelle';
  Object.assign(master, { vignette: 'visuels/kv-master.svg', estime: 4, remise: '2026-10-28', echeance: '2026-10-29' });
  soumettre(c, master, '2026-10-24T17:00:00.000Z');
  juger(c, p, master, 'retour', 'La canette ne se lit pas à trois mètres : un critère écrit de la big idea.', '2026-10-26T09:00:00.000Z');
  soumettre(c, master, '2026-10-28T17:00:00.000Z');
  juger(c, p, master, 'approuve', '', '2026-10-29T10:00:00.000Z');

  /* Les adaptations par marché, nées du master validé. */
  Date.aller('2026-11-02T09:00:00.000Z');
  const ci = KV.creer(p, 'M-ci', master, 'adaptation');
  const sn = KV.creer(p, 'M-sn', master, 'adaptation');
  const gh = KV.creer(p, 'M-gh', master, 'adaptation');
  for (const [a, code] of [[ci, 'CI'], [sn, 'SN'], [gh, 'GH']]) {
    a.nom = 'KV · ' + code + ' · Orvelle';
    Object.assign(a, { vignette: 'visuels/kv-' + code.toLowerCase() + '.svg', estime: 2, remise: '2026-11-06', echeance: '2026-11-07' });
  }
  sn.kv.mentions = sn.kv.mentions.concat(['Boisson aromatisée — sans sucres ajoutés']);
  gh.kv.sku = ['Can 33 cl'];
  gh.kv.copy = 'First zest of the day';
  soumettre(c, ci, '2026-11-04T16:00:00.000Z');
  soumettre(c, sn, '2026-11-04T16:30:00.000Z');
  juger(c, p, ci, 'approuve', '', '2026-11-05T09:00:00.000Z');
  juger(c, p, sn, 'approuve', '', '2026-11-05T09:10:00.000Z');
  soumettre(c, gh, '2026-11-06T16:00:00.000Z');

  /* Les formats, et le BAT. */
  Date.aller('2026-11-06T10:00:00.000Z');
  const afficheCi = format(c, p, ci, 'S-affiche', 'Affiche 4×3', { vignette: 'visuels/affiche-ci.svg', remise: '2026-11-09', echeance: '2026-11-10' });
  const socialCi = format(c, p, ci, 'S-social', 'Post social 1:1', { vignette: 'visuels/social-ci.svg', remise: '2026-11-12', echeance: '2026-11-13' });
  const afficheSn = format(c, p, sn, 'S-affiche', 'Affiche 4×3', { vignette: 'visuels/affiche-sn.svg', remise: '2026-11-10', echeance: '2026-11-11' });
  format(c, p, gh, 'S-social', 'Post social 1:1', { vignette: 'visuels/social-gh.svg', remise: '2026-11-16', echeance: '2026-11-17' });
  soumettre(c, afficheCi, '2026-11-07T15:00:00.000Z');
  juger(c, p, afficheCi, 'approuve', '', '2026-11-08T09:00:00.000Z');
  Date.aller('2026-11-09T11:00:00.000Z');
  PRODUCTION.poser(afficheCi, 'bat', 'ORV-2027-01_affiche-4x3_CI_V1_BAT.pdf', 'Dossier de production (fictif)', 'Margaux Tilleul');
  PRODUCTION.poser(afficheCi, 'asset', 'ORV-2027-01_affiche-4x3_CI_V1.jpg', 'Dossier de production (fictif)');
  DEPOT.tracer('BAT signé', 'livrables', p.id, afficheCi.nom + ' V1');
  soumettre(c, afficheSn, '2026-11-09T15:00:00.000Z');
  juger(c, p, afficheSn, 'approuve', '', '2026-11-10T09:00:00.000Z');
  Date.aller('2026-11-10T14:00:00.000Z');
  PRODUCTION.poser(afficheSn, 'bat', 'ORV-2027-01_affiche-4x3_SN_V1_BAT.pdf', 'Dossier de production (fictif)');
  soumettre(c, socialCi, '2026-11-11T15:00:00.000Z');

  Date.aller('2026-11-11T18:00:00.000Z');
  DEPOT.enregistrer();
  if (c.refus.length) throw new Error('Gestes refusés : ' + c.refus.join(' ; '));

  const base = JSON.parse(JSON.stringify(DEPOT.tout()));
  delete base.demonstration;
  return { base, ctx };
}

export function serialiser(base) { return JSON.stringify(base, null, 1) + '\n'; }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { base } = await construire();
  const texte = serialiser(base);
  if (process.argv[2] === '--check') {
    let actuel = null;
    try { actuel = await readFile(SORTIE, 'utf8'); } catch {}
    if (actuel !== texte) {
      console.error('vitrine/demo/base-fictive.json n’est pas celle que rejouent les modules : node outils/vitrine-base.mjs');
      process.exit(1);
    }
    console.log('Base fictive de la démonstration : identique au rejeu des modules.');
  } else {
    await writeFile(SORTIE, texte);
    console.log('Base fictive écrite : ' + base.projets.length + ' projets, ' + base.decisions.length + ' décisions.');
  }
}
