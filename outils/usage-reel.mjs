#!/usr/bin/env node
/* usage-reel.mjs — ce que l'équipe fait vraiment dans La Barre, compté sur une
 * copie de la base.
 *
 * Personne ne sait aujourd'hui combien de décisions, de versions ou de
 * personnes passent par l'outil (constats historique-processus-1 et -8,
 * fond-metier-12). Ce relevé donne le chiffre de départ, avant les séances
 * d'observation (documents/observation/PROTOCOLE.md).
 *
 * Il lit une copie de la base, téléchargée depuis une session ouverte
 * (/la-barre/depots/<référence du manifeste>.json), et rien d'autre :
 *   - aucun appel réseau ;
 *   - aucune écriture : le résultat part sur la sortie standard, en Markdown
 *     ou en CSV, et reste sur le poste de la personne qui le lance ;
 *   - la base n'est jamais modifiée, même en mémoire elle n'est que lue.
 *
 *   node outils/usage-reel.mjs <copie.json> [--format md|csv] [--depuis AAAA-MM-JJ] [--anonyme]
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = fileURLToPath(new URL('../', import.meta.url));

/* Les clés que Radar lit (C-5). Les libellés ne servent qu'à la lecture. */
export const RESULTATS = {
  approuve: 'validé',
  reserve: 'validé avec réserves',
  retour: 'modifs demandées',
  hors: 'refusé, hors brief',
};

const CANAUX = {
  seance: 'en séance', ecrit: 'par écrit', message: 'par messagerie', oral: "à l'oral",
  people: 'relevé du registre des projets', lien: 'lien de revue',
};

/* ————— Lecture prudente des dates ————— */

function jourDe(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  return Number.isNaN(Date.parse(v.length === 10 ? v + 'T00:00:00Z' : v)) ? null : v.slice(0, 10);
}
function moisDe(v) { const j = jourDe(v); return j ? j.slice(0, 7) : null; }
function instant(v) { return jourDe(v) ? Date.parse(v.length === 10 ? v + 'T00:00:00Z' : v) : null; }

export function dateValide(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
    && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
}

function liste(x) { return Array.isArray(x) ? x.filter(e => e && typeof e === 'object') : []; }
function objet(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }

export function mediane(nombres) {
  const t = nombres.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (!t.length) return null;
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

/* ————— Qui a fait le geste —————
 *
 * Trois niveaux de preuve, du plus sûr au plus faible :
 *   attestée   La Fusée a posé `attestation` (par: "la-fusee", userId) à
 *              l'enregistrement : c'est la personne connectée ;
 *   déclarée   `acteur` : la personne choisie sur le poste, ou le nom que La
 *              Fusée déclare avant d'attester ;
 *   poste      seulement `qui`, le poste titulaire de l'installation : il ne
 *              désigne personne. */
export function auteur(e) {
  const a = objet(e.attestation);
  if (a.par === 'la-fusee' && typeof a.userId === 'string' && a.userId)
    return { cle: 'attestee:' + a.userId, nom: typeof a.nom === 'string' && a.nom.trim() ? a.nom.trim() : a.userId, identite: 'attestée' };
  const d = objet(e.acteur);
  const id = typeof d.personneId === 'string' && d.personneId ? d.personneId : null;
  const nom = typeof d.nom === 'string' && d.nom.trim() ? d.nom.trim() : null;
  if (id || nom) return { cle: 'declaree:' + (id || nom), nom: nom || id, identite: 'déclarée' };
  return { cle: 'poste:' + (e.qui || 'inconnu'), nom: 'poste ' + (e.qui || 'inconnu'), identite: 'poste' };
}

/* ————— Le relevé ————— */

function compteur() {
  const parMois = new Map();
  return {
    parMois,
    ajouter(mois, cle = '', n = 1) {
      const m = mois || 'sans date';
      if (!parMois.has(m)) parMois.set(m, new Map());
      const t = parMois.get(m);
      t.set(cle, (t.get(cle) || 0) + n);
    },
    total(cle) {
      let n = 0;
      for (const t of parMois.values()) for (const [k, v] of t) if (cle === undefined || k === cle) n += v;
      return n;
    },
    duMois(mois, cle) {
      const t = parMois.get(mois); if (!t) return 0;
      let n = 0; for (const [k, v] of t) if (cle === undefined || k === cle) n += v;
      return n;
    },
    cles() { const s = new Set(); for (const t of parMois.values()) for (const k of t.keys()) s.add(k); return [...s].sort(); },
  };
}

/* Mesure une base. `depuis` (AAAA-MM-JJ) écarte ce qui est daté avant ; ce qui
 * n'a pas de date est compté à part, jamais attribué à un mois. */
export function mesurer(base, { depuis = null, anonyme = false } = {}) {
  if (!base || typeof base !== 'object' || Array.isArray(base)) throw new Error("Ce fichier n'est pas une base de La Barre.");
  if (depuis !== null && !dateValide(depuis)) throw new Error('--depuis attend une date AAAA-MM-JJ.');
  const ecartees = { avant: 0, sansDate: 0 };
  function retenir(date) {
    const j = jourDe(date);
    if (!j) { ecartees.sansDate++; return depuis ? null : 'sans date'; }
    if (depuis && j < depuis) { ecartees.avant++; return null; }
    return j.slice(0, 7);
  }

  const projets = liste(base.projets);
  const m = {
    decisions: compteur(), decisionsParAuteur: new Map(),
    soumises: compteur(), jugees: compteur(), delais: new Map(), enAttente: 0, jugeesSansDate: 0,
    retours: compteur(), annotations: compteur(), fichiers: compteur(), projets: compteur(),
    liens: compteur(), remises: compteur(), journal: compteur(), actions: new Map(),
    personnes: new Map(), actifsParMois: new Map(),
  };

  function actif(e, mois) {
    const a = auteur(e);
    if (a.identite === 'poste') return;
    const p = m.personnes.get(a.cle) || { ...a, gestes: 0, premier: null, dernier: null };
    p.gestes++;
    const j = jourDe(e.quand || e.cree_le);
    if (j && (!p.premier || j < p.premier)) p.premier = j;
    if (j && (!p.dernier || j > p.dernier)) p.dernier = j;
    m.personnes.set(a.cle, p);
    if (!m.actifsParMois.has(mois)) m.actifsParMois.set(mois, { attestée: new Set(), déclarée: new Set() });
    m.actifsParMois.get(mois)[a.identite].add(a.cle);
  }

  for (const d of liste(base.decisions)) {
    const mois = retenir(d.quand || d.cree_le);
    if (!mois) continue;
    m.decisions.ajouter(mois, (d.type || 'sans type') + '/' + (d.verdict || 'sans résultat'));
    const a = auteur(d);
    const x = m.decisionsParAuteur.get(a.cle) || { ...a, nombre: 0 };
    x.nombre++; m.decisionsParAuteur.set(a.cle, x);
    actif(d, mois);
  }

  for (const e of liste(base.journal)) {
    const mois = retenir(e.quand);
    if (!mois) continue;
    m.journal.ajouter(mois);
    m.actions.set(e.action || 'sans action', (m.actions.get(e.action || 'sans action') || 0) + 1);
    actif(e, mois);
  }

  for (const p of projets) {
    const releve = !!(p.releve && typeof p.releve === 'object');
    const mois = retenir(p.cree_le);
    if (mois) m.projets.ajouter(mois, releve ? 'relevé' : 'saisi');
    const partages = Object.entries(objet(p.partages)).map(([doc, x]) => ({ doc, ...objet(x) }))
      .concat(liste(p.partagesRevoques));
    const vus = new Set();
    for (const x of partages) {
      const cle = x.jeton || (x.doc + '@' + x.cree_le);
      if (vus.has(cle)) continue; vus.add(cle);
      const mo = retenir(x.cree_le); if (mo) m.liens.ajouter(mo, x.doc || 'document');
    }
    for (const r of liste(p.preuvesRemise)) {
      const mo = retenir(r.quand || r.remis_le); if (mo) m.remises.ajouter(mo);
    }
    for (const l of liste(p.livrables)) {
      const origine = releve || !!(l.releve && typeof l.releve === 'object') ? 'relevé' : 'saisi';
      for (const v of liste(l.versions)) {
        if (v.soumis_le) { const mo = retenir(v.soumis_le); if (mo) m.soumises.ajouter(mo, origine); }
        if (v.juge_le) {
          const mo = retenir(v.juge_le);
          if (mo) {
            m.jugees.ajouter(mo, origine);
            const a = instant(v.soumis_le), b = instant(v.juge_le);
            if (a !== null && b !== null && b >= a) {
              if (!m.delais.has(mo)) m.delais.set(mo, []);
              m.delais.get(mo).push((b - a) / 3600000);
            }
          }
        } else if (v.verdict) m.jugeesSansDate++;
        else if (v.soumis_le && !l.annule) m.enAttente++;
      }
      for (const a of liste(l.annotations)) { const mo = retenir(a.quand); if (mo) m.annotations.ajouter(mo); }
      for (const f of liste(l.fichiers)) { const mo = retenir(f.quand); if (mo) m.fichiers.ajouter(mo, f.type || 'sans type'); }
    }
  }

  for (const f of liste(base.feedbacks)) {
    const mo = retenir(f.quand || f.cree_le); if (mo) m.retours.ajouter(mo, f.canal || 'non renseigné');
  }

  /* Des noms remplacés par un rang, pour citer un relevé sans nommer personne. */
  const noms = new Map();
  if (anonyme) {
    [...m.personnes.values()].concat([...m.decisionsParAuteur.values()])
      .filter(p => p.identite !== 'poste').map(p => p.cle)
      .filter((c, i, t) => t.indexOf(c) === i).sort()
      .forEach((c, i) => noms.set(c, 'Personne ' + (i + 1)));
  }
  const nommer = p => (anonyme && noms.has(p.cle) ? noms.get(p.cle) : p.nom);

  const moisConnus = new Set();
  for (const c of [m.decisions, m.soumises, m.jugees, m.retours, m.annotations, m.fichiers, m.projets, m.liens, m.remises, m.journal])
    for (const k of c.parMois.keys()) moisConnus.add(k);
  const mois = [...moisConnus].sort((a, b) => (a === 'sans date') - (b === 'sans date') || a.localeCompare(b));

  const tousDelais = [].concat(...m.delais.values());
  const livrables = projets.reduce((n, p) => n + liste(p.livrables).length, 0);
  const versions = projets.reduce((n, p) => n + liste(p.livrables).reduce((k, l) => k + liste(l.versions).length, 0), 0);

  return {
    depuis, anonyme, ecartees,
    volume: { projets: projets.length, projetsReleves: projets.filter(p => p.releve && typeof p.releve === 'object').length,
      livrables, versions, decisions: liste(base.decisions).length, journal: liste(base.journal).length,
      lectures: liste(base.lectures).length, schema: base.schema ?? null },
    totaux: {
      decisions: m.decisions.total(), versionsSoumises: m.soumises.total(), versionsJugees: m.jugees.total(),
      versionsEnAttente: m.enAttente, versionsJugeesSansDate: m.jugeesSansDate,
      delaiMedianHeures: mediane(tousDelais), retours: m.retours.total(), annotations: m.annotations.total(),
      fichiers: m.fichiers.total(), projets: m.projets.total(), projetsSaisis: m.projets.total('saisi'),
      liens: m.liens.total(), remises: m.remises.total(), gestesJournal: m.journal.total(),
      personnesAttestees: [...m.personnes.values()].filter(p => p.identite === 'attestée').length,
      personnesDeclarees: [...m.personnes.values()].filter(p => p.identite === 'déclarée').length,
    },
    parMois: mois.map(mo => ({
      mois: mo,
      decisions: m.decisions.duMois(mo), versionsSoumises: m.soumises.duMois(mo), versionsJugees: m.jugees.duMois(mo),
      delaiMedianHeures: mediane(m.delais.get(mo) || []), retours: m.retours.duMois(mo), annotations: m.annotations.duMois(mo),
      fichiers: m.fichiers.duMois(mo), projets: m.projets.duMois(mo), liens: m.liens.duMois(mo), remises: m.remises.duMois(mo),
      gestesJournal: m.journal.duMois(mo),
      personnesAttestees: (m.actifsParMois.get(mo) || { attestée: new Set() }).attestée.size,
      personnesDeclarees: (m.actifsParMois.get(mo) || { déclarée: new Set() }).déclarée.size,
    })),
    decisionsParType: m.decisions.cles().map(cle => {
      const [type, resultat] = cle.split('/');
      return { type, resultat, nombre: m.decisions.total(cle) };
    }),
    decisionsParMoisEtType: [...m.decisions.parMois].flatMap(([mo, t]) => [...t].map(([cle, n]) => {
      const [type, resultat] = cle.split('/');
      return { mois: mo, type, resultat, nombre: n };
    })).sort((a, b) => a.mois.localeCompare(b.mois) || a.type.localeCompare(b.type) || a.resultat.localeCompare(b.resultat)),
    decisionsParAuteur: [...m.decisionsParAuteur.values()].map(p => ({ auteur: nommer(p), identite: p.identite, nombre: p.nombre }))
      .sort((a, b) => b.nombre - a.nombre || a.auteur.localeCompare(b.auteur)),
    retoursParCanal: m.retours.cles().map(c => ({ canal: c, libelle: CANAUX[c] || c, nombre: m.retours.total(c) }))
      .sort((a, b) => b.nombre - a.nombre),
    fichiersParType: m.fichiers.cles().map(t => ({ type: t, nombre: m.fichiers.total(t) })).sort((a, b) => b.nombre - a.nombre),
    liensParDocument: m.liens.cles().map(d => ({ document: d, nombre: m.liens.total(d) })),
    actions: [...m.actions].map(([action, nombre]) => ({ action, nombre })).sort((a, b) => b.nombre - a.nombre).slice(0, 12),
    personnes: [...m.personnes.values()].map(p => ({ nom: nommer(p), identite: p.identite, gestes: p.gestes, premier: p.premier, dernier: p.dernier }))
      .sort((a, b) => (a.identite === b.identite ? 0 : a.identite === 'attestée' ? -1 : 1) || b.gestes - a.gestes || a.nom.localeCompare(b.nom)),
  };
}

/* ————— Mise en forme ————— */

function heures(h) {
  if (h === null || h === undefined) return '—';
  return h < 48 ? h.toFixed(1).replace('.', ',') + ' h' : (h / 24).toFixed(1).replace('.', ',') + ' j';
}
function cellule(v) { return String(v ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }
function tableau(entetes, lignes) {
  if (!lignes.length) return '_Rien à compter._\n';
  return ['| ' + entetes.join(' | ') + ' |', '|' + entetes.map(() => '---').join('|') + '|']
    .concat(lignes.map(l => '| ' + l.map(cellule).join(' | ') + ' |')).join('\n') + '\n';
}

export function enMarkdown(r, meta = {}) {
  const t = r.totaux, v = r.volume;
  const out = [];
  out.push('# Usage réel de La Barre', '');
  out.push(`- Base lue : \`${meta.fichier || 'base'}\`${meta.empreinte ? ` · empreinte \`${meta.empreinte}\`` : ''} · schéma ${v.schema ?? '—'}`);
  out.push(`- Relevé fait le ${meta.le || new Date().toISOString().slice(0, 10)}, en lecture seule (aucune écriture, aucun appel réseau).`);
  out.push(r.depuis
    ? `- Période : depuis le ${r.depuis}. ${r.ecartees.avant} élément(s) plus ancien(s) et ${r.ecartees.sansDate} sans date sont écartés.`
    : `- Période : toute la base. ${r.ecartees.sansDate} élément(s) sans date sont comptés à part (« sans date »).`);
  out.push(`- Volume : ${v.projets} projets (dont ${v.projetsReleves} relevés par ingestion), ${v.livrables} livrables, ${v.versions} versions, ${v.decisions} décisions, ${v.journal} lignes de journal.`);
  if (r.anonyme) out.push('- Les noms sont remplacés par « Personne n ».');
  out.push('', '## En bref', '');
  out.push(tableau(['Mesure', 'Nombre'], [
    ['Décisions', t.decisions],
    ['Versions soumises', t.versionsSoumises],
    ['Versions jugées (datées)', t.versionsJugees],
    ['Délai médian entre dépôt et décision', heures(t.delaiMedianHeures)],
    ['Versions en attente de décision', t.versionsEnAttente],
    ['Retours enregistrés', t.retours],
    ['Annotations posées sur une image', t.annotations],
    ['Fichiers posés (BAT, simulations, situations…)', t.fichiers],
    ['Projets créés (dont saisis à la main)', `${t.projets} (${t.projetsSaisis})`],
    ['Liens de partage créés', t.liens],
    ['Remises consignées', t.remises],
    ['Gestes au journal', t.gestesJournal],
    ['Personnes actives attestées par La Fusée', t.personnesAttestees],
    ['Personnes déclarées sur le poste', t.personnesDeclarees],
  ]));
  out.push('## Par mois', '');
  out.push(tableau(['Mois', 'Décisions', 'Versions soumises', 'Versions jugées', 'Délai médian', 'Retours', 'Annotations', 'Fichiers',
    'Projets', 'Liens', 'Remises', 'Journal', 'Personnes attestées', 'Personnes déclarées'],
  r.parMois.map(x => [x.mois, x.decisions, x.versionsSoumises, x.versionsJugees, heures(x.delaiMedianHeures), x.retours,
    x.annotations, x.fichiers, x.projets, x.liens, x.remises, x.gestesJournal, x.personnesAttestees, x.personnesDeclarees])));
  out.push('## Décisions par mois, type et résultat', '');
  out.push(tableau(['Mois', 'Type', 'Résultat', 'Nombre'],
    r.decisionsParMoisEtType.map(x => [x.mois, x.type, RESULTATS[x.resultat] ? `${x.resultat} (${RESULTATS[x.resultat]})` : x.resultat, x.nombre])));
  out.push('## Décisions par auteur', '');
  out.push(tableau(['Auteur', 'Identité', 'Décisions'], r.decisionsParAuteur.map(x => [x.auteur, x.identite, x.nombre])));
  out.push('## Retours par canal', '');
  out.push(tableau(['Canal', 'Retours'], r.retoursParCanal.map(x => [x.libelle, x.nombre])));
  out.push('## Fichiers posés par type', '');
  out.push(tableau(['Type', 'Fichiers'], r.fichiersParType.map(x => [x.type, x.nombre])));
  out.push('## Liens de partage par document', '');
  out.push(tableau(['Document', 'Liens'], r.liensParDocument.map(x => [x.document, x.nombre])));
  out.push('## Personnes actives', '');
  out.push(tableau(['Personne', 'Identité', 'Gestes', 'Premier', 'Dernier'], r.personnes.map(x => [x.nom, x.identite, x.gestes, x.premier, x.dernier])));
  out.push('## Gestes les plus fréquents au journal', '');
  out.push(tableau(['Action', 'Nombre'], r.actions.map(x => [x.action, x.nombre])));
  out.push('## Ce que ces chiffres ne disent pas', '');
  out.push(
    `- \`lectures[].qui\` vaut toujours le poste titulaire (\`app/depot.js\`, fonction \`lu\`) : les ${v.lectures} lectures enregistrées ne disent pas qui a regardé. Elles ne sont pas comptées.`,
    '- `qui` sur une décision ou une ligne de journal est le poste titulaire de l\'installation, pas une personne. Seule l\'attestation de La Fusée identifie la personne connectée ; `acteur` est déclaré.',
    '- Le journal est tronqué au-delà de 2 000 lignes (il en garde environ 1 500) : les mois anciens sont sous-comptés.',
    '- Un projet relevé par ingestion porte la date de l\'ingestion (`cree_le`), pas celle du travail.',
    '- Les échanges qui ne passent pas par La Barre (WhatsApp, Drive, mail, oral) ne laissent ici aucune trace : la semaine témoin les compte (`documents/observation/SEMAINE-TEMOIN.md`).',
    `- ${t.versionsJugeesSansDate} version(s) portent un résultat sans date de décision : elles ne sont pas dans les délais.`,
    '');
  return out.join('\n');
}

function csv(v) { const s = String(v ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

export function enCsv(r) {
  const lignes = [['mesure', 'mois', 'cle', 'valeur']];
  const serpent = k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
  const pousser = (mesure, mois, cle, valeur) => lignes.push([serpent(mesure), mois, cle, valeur]);
  for (const [k, val] of Object.entries(r.totaux)) pousser(k, 'tout', '', val === null ? '' : (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val));
  for (const x of r.parMois) for (const [k, val] of Object.entries(x)) if (k !== 'mois')
    pousser(k, x.mois, '', val === null ? '' : (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val));
  for (const x of r.decisionsParMoisEtType) pousser('decisions_par_type', x.mois, x.type + '/' + x.resultat, x.nombre);
  for (const x of r.decisionsParAuteur) pousser('decisions_par_auteur', 'tout', x.auteur + ' (' + x.identite + ')', x.nombre);
  for (const x of r.retoursParCanal) pousser('retours_par_canal', 'tout', x.canal, x.nombre);
  for (const x of r.fichiersParType) pousser('fichiers_par_type', 'tout', x.type, x.nombre);
  for (const x of r.liensParDocument) pousser('liens_par_document', 'tout', x.document, x.nombre);
  for (const x of r.personnes) pousser('personne_' + (x.identite === 'attestée' ? 'attestee' : 'declaree'), 'tout', x.nom, x.gestes);
  for (const x of r.actions) pousser('journal_action', 'tout', x.action, x.nombre);
  return lignes.map(l => l.map(csv).join(',')).join('\n') + '\n';
}

/* ————— En ligne de commande ————— */

const AIDE = `Usage : node outils/usage-reel.mjs <copie-de-la-base.json> [--format md|csv] [--depuis AAAA-MM-JJ] [--anonyme]

Compte, sur une copie de la base, les décisions, versions, délais, retours,
annotations, fichiers, projets, liens, remises et personnes actives.
Lecture seule : le résultat part sur la sortie standard. Rangez-le hors du dépôt.`;

export function lireArguments(args) {
  const o = { fichier: null, format: 'md', depuis: null, anonyme: false, aide: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--aide' || a === '-h' || a === '--help') o.aide = true;
    else if (a === '--anonyme') o.anonyme = true;
    else if (a === '--format') o.format = args[++i];
    else if (a.startsWith('--format=')) o.format = a.slice(9);
    else if (a === '--depuis') o.depuis = args[++i] ?? '';
    else if (a.startsWith('--depuis=')) o.depuis = a.slice(9);
    else if (/^(-o|--sortie|--ecrire|--output|--out)(=|$)/.test(a))
      throw new Error("usage-reel ne fait que lire : il n'écrit aucun fichier. Redirigez la sortie standard vers un fichier hors du dépôt.");
    else if (a.startsWith('-')) throw new Error('Option inconnue : ' + a);
    else if (o.fichier) throw new Error('Une seule copie de base à la fois.');
    else o.fichier = a;
  }
  if (!['md', 'csv'].includes(o.format)) throw new Error('--format attend md ou csv.');
  if (o.depuis !== null && !dateValide(o.depuis)) throw new Error('--depuis attend une date AAAA-MM-JJ.');
  return o;
}

function principal() {
  let o;
  try { o = lireArguments(process.argv.slice(2)); }
  catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 2; return; }
  if (o.aide || !o.fichier) { (o.aide ? process.stdout : process.stderr).write(AIDE + '\n'); if (!o.aide) process.exitCode = 2; return; }
  const chemin = resolve(o.fichier);
  const dans = relative(RACINE, chemin);
  if (!dans.startsWith('..') && !isAbsolute(dans) && !dans.startsWith(join('tests', 'fixtures')))
    process.stderr.write('Attention : cette copie est dans le dépôt. Rangez-la hors du dépôt : une base porte des clients et des personnes.\n');
  let texte, base;
  try { texte = readFileSync(chemin, 'utf8'); base = JSON.parse(texte); }
  catch (e) { process.stderr.write('Copie illisible : ' + e.message + '\n'); process.exitCode = 1; return; }
  try {
    const r = mesurer(base, { depuis: o.depuis, anonyme: o.anonyme });
    const meta = { fichier: basename(chemin), empreinte: createHash('sha256').update(texte).digest('hex').slice(0, 12) };
    process.stdout.write(o.format === 'csv' ? enCsv(r) : enMarkdown(r, meta));
  } catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) principal();
