#!/usr/bin/env node
/* ingerer-corpus.mjs — faire entrer dans LA BARRE les campagnes déjà produites.
 *
 * Le titulaire a rassemblé dans « DOSSIER PROJETS — XTINCELL » le relevé de ce
 * qu'il a fait depuis janvier 2025 : cent quarante campagnes documentées, trois
 * cent soixante-six briefs au registre de l'agence, mille trois cent soixante-
 * deux pièces. Quatre registres qui décrivent le même travail dans quatre
 * langues différentes, sans une seule clé commune.
 *
 * Ce que cette passe fait, et dans cet ordre :
 *
 *   — elle RELÈVE : ce qu'un document écrit littéralement entre tel quel ;
 *   — elle INFÈRE : ce qui se déduit d'un document entre avec son motif, et
 *     s'affiche comme non opposable jusqu'à contreseing ;
 *   — elle LAISSE VIDE : ce qu'aucun document n'énonce reste vide, et le
 *     dossier dira lui-même ce que ça coûte.
 *
 * Le plancher est dur, et c'est lui qui sépare l'inférence de la fabrication :
 * un document l'énonce, ou le champ reste vide. « Le combat d'une vie » devient
 * un nom de campagne parce que le document l'écrit entre guillemets. L'insight
 * de cette campagne ne s'infère pas — personne ne l'a écrit, et le déduire
 * cent quarante fois rendrait la base entière suspecte, y compris ses
 * inférences honnêtes.
 *
 *   node outils/ingerer-corpus.mjs            passe à blanc, rapport seul
 *   node outils/ingerer-corpus.mjs --ecrire   écrit le dépôt, après archivage
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import * as CORR from "./correspondances.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const BARRE = join(ICI, "..");
const CORPUS = join(BARRE, "..", "DOSSIER PROJETS — XTINCELL");
const DEPOT = join(BARRE, "depots", "beignet-paradise.json");

const ECRIRE = process.argv.includes("--ecrire");

/* ————————————————————— L'apparieur du produit —————————————————————
 *
 * Chargé depuis app/apparier.js, pas recopié : c'est le même code qui tourne
 * dans le navigateur. Il a été écrit pour l'import de visuels et corrigé par
 * un vrai dégât — un candidat court devenait un joker. Le rattachement d'une
 * campagne à un brief pose exactement le même problème. */
function chargerApparieur() {
  const ctx = {};
  createContext(ctx);
  runInContext(readFileSync(join(BARRE, "app", "apparier.js"), "utf8"), ctx, { filename: "apparier.js" });
  return ctx.APPARIER;
}
const APPARIER = chargerApparieur();

/* ————————————————————— Lire ————————————————————— */

/* Un CSV avec des guillemets, des virgules dedans et un BOM. Les trois sont
 * présents dans les index du corpus. */
function csv(chemin) {
  const brut = readFileSync(chemin, "utf8").replace(/^﻿/, "");
  const lignes = [];
  let champ = "", ligne = [], q = false;
  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];
    if (q) {
      if (c === '"' && brut[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') q = false;
      else champ += c;
    } else if (c === '"') q = true;
    else if (c === ",") { ligne.push(champ); champ = ""; }
    else if (c === "\n") { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; }
    else if (c !== "\r") champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const entete = lignes.shift().map((x) => x.trim());
  return lignes.filter((l) => l.some((x) => x.trim()))
    .map((l) => Object.fromEntries(entete.map((k, i) => [k, (l[i] || "").trim()])));
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/* ————————————————————— Les périodes —————————————————————
 *
 * Le document écrit « 06/2026 », « 07/2025 → 07/2026 », « 2025 », « → 08/2025 ».
 * La fenêtre garde le texte tel quel ; l'échéance en est déduite, et c'est une
 * inférence : la fin d'une période n'est pas une date de remise. */
function periode(txt) {
  const t = String(txt || "").replace(/\*\*/g, "").trim();
  if (!t) return null;
  const bornes = t.split("→").map((x) => x.trim()).filter(Boolean);
  const lire = (b) => {
    let m = b.match(/^(\d{2})\/(\d{4})$/);
    if (m) return { a: +m[2], m: +m[1] };
    m = b.match(/^(\d{4})$/);
    if (m) return { a: +m[1], m: null };
    return null;
  };
  const der = lire(bornes[bornes.length - 1]);
  if (!der) return null;
  const mois = der.m || 12;
  const dernierJour = new Date(Date.UTC(der.a, mois, 0)).getUTCDate();
  return {
    texte: t,
    fin: `${der.a}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}`,
  };
}

/* ————————————————————— Les sources ————————————————————— */

const { lireComptes } = await import(
  join(CORPUS, ".generateur", "lire-campagnes.mjs").replace(/^/, "file://").replace(/ /g, "%20"));

const DOC = readFileSync(join(CORPUS, "00 DOCUMENTATION/CAMPAGNES PAR MARQUE.md"), "utf8");
const COMPTES = lireComptes(DOC).filter((c) => c.num <= 11);

const RADAR = csv(join(CORPUS, "00 DOCUMENTATION/RADAR — briefs releves.csv"));
const IDX_CAMP = csv(join(CORPUS, "01 CAMPAGNES/_INDEX.csv")).filter((r) => r["catégorie"] === "campagne");
/* Les masters, moins l'historique : trente pièces de 2017-2024, que le document
 * range lui-même hors du cadre d'attribution — celui-ci commence en janvier
 * 2025. Les ingérer créerait des livrables sur des campagnes qui n'existent pas
 * dans le corpus. */
const IDX_MASTER_TOUT = csv(join(CORPUS, "02 MASTERS DE CAMPAGNE/_INDEX.csv"));
const IDX_MASTER = IDX_MASTER_TOUT.filter((r) => r.statut !== "historique (folio)");
const MASTERS_HISTORIQUES = IDX_MASTER_TOUT.length - IDX_MASTER.length;
const IDX_KV = csv(join(CORPUS, "03 KEY VISUALS PAR MARQUE/_INDEX.csv"));

const depot = JSON.parse(readFileSync(DEPOT, "utf8"));

/* ————————————————————— Le rapport —————————————————————
 *
 * Il n'est pas un accessoire : c'est la moitié du travail. Une passe qui range
 * cent quarante dossiers sans dire ce qu'elle a deviné n'est pas relisible, et
 * ce qui n'est pas relisible n'est pas corrigeable. */
const R = { hesite: [], aucun: [], inconnus: new Set(), douteux: [], notes: [], compte: {} };
const note = (x) => R.notes.push(x);

/* ————————————————————— Les campagnes ————————————————————— */

/* Le nom d'une campagne, tel qu'on peut espérer le retrouver ailleurs. Le
 * document préfixe parfois le porteur — « PRESYNAT · Campagne social 360 » —
 * et les autres registres ne le font pas. */
function nomsDe(nom) {
  const bouts = String(nom).split(" · ");
  const sortie = [nom];
  if (bouts.length > 1) { sortie.push(bouts.slice(1).join(" · ")); sortie.push(bouts[0]); }
  return [...new Set(sortie.map((x) => x.trim()).filter(Boolean))];
}

const campagnes = [];
for (const c of COMPTES) {
  for (const mq of c.marques) {
    for (const k of mq.campagnes) {
      campagnes.push({
        compte: c.nom, compteNum: c.num, sectionMarque: mq.nom,
        nom: k.nom, periode: k.periode, marches: k.marches,
        roles: k.roles, preuve: k.preuve, niveau: k.niveau,
      });
    }
  }
}

/* ————— Le client et les marques d'une campagne —————
 *
 * L'index des illustrations porte « FrieslandCampina · Bonnet Rouge » : le
 * couple exact, et c'est la meilleure source. Quand il ne connaît pas la
 * campagne, on retombe sur les titres de section du document. */
const idxParNom = new Map();
for (const r of IDX_CAMP) {
  const k = norm(r["campagne ou outil"]);
  if (!idxParNom.has(k)) idxParNom.set(k, r);
}

function resoudreClientMarque(k) {
  let groupe = null, illustration = null;
  for (const n of nomsDe(k.nom)) {
    const hit = idxParNom.get(norm(n));
    if (hit) { groupe = hit["marque / groupe"]; illustration = hit; break; }
  }

  /* Le groupe de l'index est « Compte · Marque » ; à défaut, les titres de
   * section du document donnent les mêmes deux niveaux. */
  const bouts = groupe ? groupe.split("·").map((x) => x.trim()) : [k.compte, k.sectionMarque];
  const libelleCompte = bouts[0];
  const libelleMarque = bouts.length > 1 ? bouts[bouts.length - 1] : k.sectionMarque;

  let clientId = CORR.CLIENTS[libelleCompte] || CORR.CLIENTS[k.compte] || null;
  if (!clientId && CORR.CLIENTS_DOUTEUX[libelleCompte]) {
    clientId = CORR.CLIENTS_DOUTEUX[libelleCompte].vers;
    R.douteux.push({ quoi: libelleCompte, ...CORR.CLIENTS_DOUTEUX[libelleCompte], ou: k.nom });
  }
  if (!clientId) R.inconnus.add("client : " + libelleCompte);

  /* Les marques : celle de la section, plus celles que le nom de la campagne
   * nomme explicitement. Une section « Rainbow · Nunu · Omela » en porte cinq. */
  const marqueIds = [];
  for (const lib of String(libelleMarque).split("·").map((x) => x.trim())) {
    const m = CORR.MARQUES[lib];
    if (m) marqueIds.push(...m);
    else if (lib && !/^(groupe|autres marques|autres marques filles|clients)$/i.test(lib)) {
      R.inconnus.add("marque : " + lib);
    }
  }
  const premierBout = nomsDe(k.nom)[nomsDe(k.nom).length - 1];
  if (CORR.MARQUES[premierBout]) marqueIds.push(...CORR.MARQUES[premierBout]);

  return { clientId, marqueIds: [...new Set(marqueIds)], illustration, libelleCompte, libelleMarque };
}

/* ————— Les marchés —————
 *
 * La colonne du document, normalisée. Ce qu'elle nomme et que la table ne
 * connaît pas sort au rapport plutôt que d'être deviné. */
function marchesDe(txt) {
  const t = String(txt || "").replace(/\*\*/g, "").trim();
  if (!t) return [];
  if (CORR.MARCHES[t]) return CORR.MARCHES[t];
  const ids = [];
  let reconnus = 0;
  const bouts = t.split(/,|·/).map((x) => x.trim()).filter(Boolean);
  for (const b of bouts) {
    if (CORR.MARCHES[b]) { ids.push(...CORR.MARCHES[b]); reconnus++; }
    else R.inconnus.add("marché : " + b);
  }
  if (!reconnus && bouts.length) R.inconnus.add("marchés (libellé entier) : " + t);
  return [...new Set(ids)];
}

/* ————————————————————— Le Radar, et sa hiérarchie ————————————————————— */

/* Le registre porte deux couches que rien ne dit ailleurs : `entree` sépare le
 * brief maître de la tâche qui en dépend, et `rattache` nomme le parent. C'est
 * exactement ce que le titulaire a relevé — « des briefs de livrables
 * spécifiques d'une campagne qui a son brief également ». La hiérarchie est
 * dans la donnée : on la lit, on ne la devine pas. */
const radarParId = new Map(RADAR.map((r) => [r.ndeg, r]));
const maitres = RADAR.filter((r) => r.entree === "Maître");
const taches = RADAR.filter((r) => r.entree === "Tâche");
const doublons = RADAR.filter((r) => r.entree === "Doublon");

/* Un enregistrement dont les colonnes `entree` et `rattache` sont interverties.
 * On le signale ; le corriger en silence effacerait la seule trace du défaut. */
const malformes = RADAR.filter((r) =>
  r.entree !== "Maître" && r.entree !== "Tâche" && r.entree !== "Doublon");

/* Les tâches d'un maître, à tous les étages : FRC-059 → T1 → T1a. */
const enfantsDe = new Map();
for (const t of taches) {
  if (!t.rattache) continue;
  if (!enfantsDe.has(t.rattache)) enfantsDe.set(t.rattache, []);
  enfantsDe.get(t.rattache).push(t);
}
function descendance(ndeg, vus = new Set()) {
  if (vus.has(ndeg)) return [];
  vus.add(ndeg);
  const directs = enfantsDe.get(ndeg) || [];
  return directs.concat(...directs.map((d) => descendance(d.ndeg, vus)));
}

function clientDuRadar(r) {
  return CORR.CLIENTS[r.client]
    || (CORR.CLIENTS_DOUTEUX[r.client] ? CORR.CLIENTS_DOUTEUX[r.client].vers : null);
}

/* ————————————————————— Les appariements —————————————————————
 *
 * Deux règles, et la seconde compte autant que la première :
 *
 *   — on n'apparie qu'à l'intérieur d'un même client. Sans ce cloisonnement,
 *     « Back to School » rattache une campagne Bonnet Rouge à un brief Ecobank,
 *     et les deux existent.
 *   — seul « sûr » est appliqué. « hésite » et « aucun » partent au rapport :
 *     les lire est un geste du titulaire, pas du script. */
function apparierDans(sujets, candidats, cle) {
  const s = sujets.map((x) => ({ ref: x, mots: APPARIER.mots(cle.sujet(x)) }));
  const c = candidats.map((x) => ({ ref: x, mots: APPARIER.mots(cle.candidat(x)) }));
  return APPARIER.rapprocher(c, s, { seuil: 0.45, marge: 0.12 });
}

/* Campagne → brief maître.
 *
 * Cloisonné par client ET par marque. Le cloisonnement n'est pas une
 * optimisation : c'est ce qui rend l'appariement honnête. Sans lui,
 * « Back to School » rattache une campagne Bonnet Rouge à un brief Ecobank —
 * les deux existent, et l'erreur serait invisible.
 *
 * Par marque, le lot de candidats fond de cinquante-deux à trente et la
 * pondération des mots devient tranchante : « Saison des bouillies » trouve
 * son brief, ce qu'elle ne faisait pas dans le lot du client entier. Les
 * campagnes sans marque rattachable retombent sur le lot du client — c'est
 * moins précis, et c'est dit.
 *
 * Une campagne peut concourir dans plusieurs lots : elle garde le meilleur
 * « sûr », et rien d'autre. */
const maitreDe = new Map();
const campagneDuMaitre = new Map();
{
  for (const k of campagnes) k._res = resoudreClientMarque(k);

  const lots = new Map();   /* clé de lot → { camp:[], brefs:[] } */
  const lot = (cle) => {
    if (!lots.has(cle)) lots.set(cle, { camp: [], brefs: [] });
    return lots.get(cle);
  };

  for (const k of campagnes) {
    const cid = k._res.clientId;
    if (!cid) continue;
    /* Deux lectures pour chaque campagne, et on garde la meilleure : le lot
     * de sa marque, où la pondération est tranchante, et le lot du client
     * entier, qui rattrape les campagnes dont la marque du brief est écrite
     * autrement. Aucune des deux ne baisse le seuil. */
    k._res.marqueIds.forEach((m) => lot(cid + "|" + m).camp.push(k));
    lot(cid + "|—").camp.push(k);
  }
  for (const b of maitres) {
    const cid = clientDuRadar(b);
    if (!cid) continue;
    const mqs = CORR.MARQUES[b.marque] || [];
    if (mqs.length) mqs.forEach((m) => { if (lots.has(cid + "|" + m)) lot(cid + "|" + m).brefs.push(b); });
    /* Le lot « sans marque » du client reçoit tout : c'est le filet. */
    if (lots.has(cid + "|—")) lot(cid + "|—").brefs.push(b);
  }

  const meilleur = new Map();   /* campagne → { brief, score } */
  const hesitations = new Map();
  for (const [cle, l] of lots) {
    if (!l.camp.length || !l.brefs.length) continue;
    const res = apparierDans(l.camp, l.brefs,
      { sujet: (k) => nomsDe(k.nom).join(" "), candidat: (b) => b.projet });
    for (const r of res) {
      const k = r.sujet.ref;
      if (r.etat === "sur") {
        /* Le lot du client entier rattrape, mais il laisse passer ce que le
         * lot de marque aurait refusé : « Back to School — pilote FR/EN »,
         * campagne Peak, emportait FRC-049 « Présentation BONNET ROUGE — Back
         * to School » parce que les mots collaient. Un brief qui nomme une
         * marque doit la partager avec la campagne, sinon le nom ment. */
        const mqBrief = CORR.MARQUES[r.candidat.ref.marque] || [];
        const mqCamp = k._res.marqueIds || [];
        const ombrelle = mqBrief.some((m) => CORR.OMBRELLES.has(m))
          || mqCamp.some((m) => CORR.OMBRELLES.has(m));
        if (!ombrelle && mqBrief.length && mqCamp.length
            && !mqBrief.some((m) => mqCamp.includes(m))) {
          R.hesite.push({ quoi: "campagne → brief (marque contraire)", campagne: k.nom,
            propose: r.candidat.ref.ndeg + " · " + r.candidat.ref.projet
              + " — marque « " + r.candidat.ref.marque + " »",
            score: Math.round(r.score * 100) / 100 });
          continue;
        }
        const dej = meilleur.get(k);
        if (!dej || r.score > dej.score) meilleur.set(k, { brief: r.candidat.ref, score: r.score, lot: cle });
      } else if (r.etat === "hesite" && r.candidat && !hesitations.has(k)) {
        hesitations.set(k, { campagne: k.nom, lot: cle,
          propose: r.candidat.ref.ndeg + " · " + r.candidat.ref.projet,
          score: Math.round(r.score * 100) / 100,
          autres: r.autres.slice(1, 4).map((a) => a.candidat.ref.ndeg) });
      }
    }
  }

  /* Un brief maître ne sert qu'une campagne. Deux campagnes qui le réclament
   * ne peuvent pas avoir raison toutes les deux : la mieux placée le garde,
   * l'autre passe au rapport. */
  const prisPar = new Map();
  [...meilleur.entries()].sort((a, b) => b[1].score - a[1].score).forEach(([k, v]) => {
    if (prisPar.has(v.brief.ndeg)) {
      R.hesite.push({ quoi: "campagne → brief (déjà pris)", campagne: k.nom,
        propose: v.brief.ndeg + " — gardé par « " + prisPar.get(v.brief.ndeg).nom + " »",
        score: Math.round(v.score * 100) / 100 });
      return;
    }
    prisPar.set(v.brief.ndeg, k);
    maitreDe.set(k, v.brief);
    campagneDuMaitre.set(v.brief.ndeg, k);
  });

  for (const [k, h] of hesitations) {
    if (maitreDe.has(k)) continue;
    R.hesite.push({ quoi: "campagne → brief", ...h });
  }
  for (const k of campagnes) {
    if (!maitreDe.has(k) && !hesitations.has(k)) {
      R.aucun.push({ quoi: "campagne → brief", campagne: k.nom, client: k._res.clientId });
    }
  }
}

/* Campagne → pièces. Les index rangent par couple (marque, campagne) avec une
 * taxinomie de DOSSIERS — « Hors temps fort », « Jeux & activations » — qui
 * n'est pas celle du récit. La jointure y est floue par nature, et les pièces
 * qui ne trouvent pas leur campagne restent au fonds de la marque : les forcer
 * dans un dossier inventerait un rattachement. */
const piecesDe = new Map();   /* campagne → { masters:[], declinaisons:[] } */
{
  const coupleCle = (marque, camp) => norm(marque) + "|" + norm(camp);
  const couples = new Map();
  const ajouter = (r, genre) => {
    const c = coupleCle(r.marque, r.campagne);
    if (!couples.has(c)) couples.set(c, { marque: r.marque, campagne: r.campagne, masters: [], declinaisons: [] });
    couples.get(c)[genre].push(r);
  };
  for (const r of IDX_MASTER) ajouter(r, "masters");
  for (const r of IDX_KV) ajouter(r, "declinaisons");

  /* Par marque : une campagne ne peut recevoir que des pièces de ses marques. */
  const parMarque = new Map();
  for (const c of couples.values()) {
    const ids = CORR.MARQUES[c.marque] || [];
    for (const id of ids) {
      if (!parMarque.has(id)) parMarque.set(id, []);
      parMarque.get(id).push(c);
    }
    if (!ids.length) R.inconnus.add("marque (pièces) : " + c.marque);
  }

  for (const [mqId, lot] of parMarque) {
    const cands = campagnes.filter((k) => (k._res.marqueIds || []).includes(mqId));
    if (!cands.length) {
      R.aucun.push({ quoi: "pièces → campagne", marque: mqId,
        couples: lot.map((c) => c.campagne).join(" · ") });
      continue;
    }
    const res = apparierDans(lot, cands,
      { sujet: (c) => c.campagne, candidat: (k) => nomsDe(k.nom).join(" ") });
    for (const r of res) {
      const c = r.sujet.ref;
      if (r.etat === "sur") {
        const k = r.candidat.ref;
        if (!piecesDe.has(k)) piecesDe.set(k, { masters: [], declinaisons: [] });
        piecesDe.get(k).masters.push(...c.masters);
        piecesDe.get(k).declinaisons.push(...c.declinaisons);
      } else if (r.etat === "hesite" && r.candidat) {
        R.hesite.push({ quoi: "pièces → campagne", dossier: c.marque + " / " + c.campagne,
          pieces: c.masters.length + c.declinaisons.length,
          propose: r.candidat.ref.nom, score: Math.round(r.score * 100) / 100 });
      } else {
        R.aucun.push({ quoi: "pièces → campagne", dossier: c.marque + " / " + c.campagne,
          pieces: c.masters.length + c.declinaisons.length,
          note: "reste au fonds de la marque" });
      }
    }
  }
}

/* ————————————————————— Construire ————————————————————— */

const MAINTENANT = new Date().toISOString();
const AUJOURD_HUI = MAINTENANT.slice(0, 10);
const SOURCE_DOC = "CAMPAGNES PAR MARQUE.md";

/* Poser une inférence, exactement comme le fait INFERENCE.poser() dans le
 * produit : la valeur va dans la section, le registre garde qu'elle est
 * inférée et POURQUOI. Sans le motif, une inférence n'est plus qu'une
 * fabrication avec une étiquette. */
function inferer(p, section, champ, valeur, motif) {
  if (valeur === null || valeur === undefined || valeur === "" ||
      (Array.isArray(valeur) && !valeur.length)) return;
  p.sections[section] = p.sections[section] || {};
  p.sections[section][champ] = valeur;
  p.inferences[section + "." + champ] = { pourquoi: motif, quand: MAINTENANT, par: "creation" };
}

/* Le poste que les rôles tenus impliquent. Une campagne où il a fait la
 * direction artistique et une où il l'a supervisée ne se lisent pas pareil au
 * moment de l'évaluation, et c'est la seule chose que le corpus en dit. */
function equipeDe(roles) {
  const r = new Set(roles);
  const postes = [];
  if (r.has("DA") || r.has("KV") || r.has("PKG") || r.has("BR") || r.has("PH")) postes.push("da");
  if (r.has("SUP") || r.has("BI")) postes.push("creation");
  if (r.has("STR")) postes.push("planning");
  if (r.has("DEV")) postes.push("motion3d");
  if (!postes.length) postes.push("creation");
  return [...new Set(postes)].map((poste) => ({ personne: "P-alex", poste }));
}

/* Le nom de campagne que le document met entre guillemets. C'est le seul cas
 * où la big idea s'infère : « Le combat d'une vie » est écrit, pas déduit. */
function nomEntreGuillemets(nom) {
  const m = String(nom).match(/[«"]\s*([^»"]{3,})\s*[»"]/);
  return m ? m[1].trim() : null;
}

/* Deux natures de chemin, et il faut les distinguer.
 *
 * La VIGNETTE est servie par l'application : elle doit vivre sous sa racine.
 * outils/vignettes-corpus.sh en pose une copie à 600 px dans assets/review/
 * — la meme voie que les visuels importes, et le depot ne porte que le chemin.
 *
 * Le MASTER est un chemin de travail : il designe la piece sur le disque, hors
 * de l'application. Il ne se sert pas, il se retrouve — et c'est ce qu'on
 * demande a un master. Les 5,7 Go du corpus restent ou ils sont. */
const CHEMIN = {
  vignette: "assets/review/corpus/",
  master: "../DOSSIER PROJETS — XTINCELL/02 MASTERS DE CAMPAGNE/",
  kv: "../DOSSIER PROJETS — XTINCELL/03 KEY VISUALS PAR MARQUE/",
};

const dossiers = [];
const stats = { livrablesMasters: 0, variantes: 0, livrablesKV: 0, livrablesRadar: 0,
  closInferes: 0, closSansDate: 0, vivants: 0, vignetteManquante: 0,
  clos: 0, sansIllustration: 0, sansMarque: 0, sansSupport: 0 };

campagnes.forEach((k, rang) => {
  const res = k._res;
  const num = String(rang + 1).padStart(3, "0");
  const maitre = maitreDe.get(k) || null;
  const per = periode(k.periode);
  const pieces = piecesDe.get(k) || { masters: [], declinaisons: [] };
  const filles = maitre ? descendance(maitre.ndeg) : [];

  const p = {
    id: "PRJ-XC-" + num,
    /* La référence du Radar quand elle existe — elle est vraie et vérifiable.
     * Sinon une série qu'on ne peut pas confondre avec une référence d'agence. */
    ref: maitre ? maitre.ndeg : "XC-" + num,
    nom: k.nom,
    gabarit: CORR.gabaritSuggere(k.roles),
    cree_le: MAINTENANT,
    statut: "creation",
    equipe: equipeDe(k.roles),
    sections: { identite: {}, brief: {}, pistes: [] },
    inferences: {},
    livrables: [],
    volets: [],
    /* Tout ce que le corpus AFFIRME, groupé et marqué comme relevé. Ce ne sont
     * pas des champs de saisie : ce sont les mots d'un document. */
    releve: {
      source: SOURCE_DOC,
      section: k.compteNum + ". " + k.compte + (k.sectionMarque ? " / " + k.sectionMarque : ""),
      roles: k.roles,
      rolesNoms: k.roles.map((r) => CORR.ROLES[r] || r),
      /* Le document est du markdown : son gras marque le chiffre qui compte.
       * Affiché tel quel, « **avec et sans foulard** » se lit avec ses
       * astérisques. La citation garde ses mots, pas sa syntaxe. */
      preuve: String(k.preuve || "").replace(/\*\*/g, ""),
      niveau: k.niveau,
      radar: maitre ? [maitre.ndeg, ...filles.map((f) => f.ndeg)] : [],
      releve_le: MAINTENANT,
    },
  };

  /* ————— Identité ————— */
  const client = res.clientId ? depot.clients.find((c) => c.id === res.clientId) : null;
  p.sections.identite = {
    client: client ? client.nom : res.libelleCompte,
    marque: res.marqueIds.map((id) => {
      const m = depot.marques.find((x) => x.id === id);
      return m ? m.nom : id;
    }).join(" · "),
    clientId: res.clientId,
    marqueIds: res.marqueIds,
    marches: marchesDe(k.marches),
    fenetre: per ? per.texte : "",
    type: "", echeance: "", budget: null,
    decideur: "", tueur: "", circuit: "",
  };
  if (!res.marqueIds.length) stats.sansMarque++;

  /* L'échéance : déduite de la fin de la période. Une période n'est pas une
   * date de remise, donc c'est bien une inférence et elle porte son motif. */
  if (per) {
    inferer(p, "identite", "echeance", per.fin,
      `Fin de la période « ${per.texte} » relevée au document de campagnes.`);
  }

  /* La big idea, seulement quand le document l'écrit entre guillemets. */
  const guill = nomEntreGuillemets(k.nom);
  if (guill) {
    inferer(p, "bigidea", "campagne", guill,
      `Le document nomme la campagne « ${guill} », entre guillemets, dans son titre.`);
  }

  /* Ce que le Radar annonce comme livrables attendus : une nature, jamais un
   * compte. « Visuels » ne dit pas combien. */
  const attendus = [...new Set([maitre, ...filles].filter(Boolean)
    .flatMap((r) => String(r.livrables || "").split(/[,;]| \+ /))
    .map((x) => x.trim()).filter(Boolean))];
  if (attendus.length) {
    inferer(p, "brief", "livrables_attendus", attendus,
      `Colonne « livrables » du Radar sur ${maitre.ndeg}`
      + (filles.length ? ` et ses ${filles.length} tâches.` : "."));
  }

  /* ————— La clôture —————
   *
   * Deux natures, et il ne faut surtout pas les confondre.
   *
   * RELEVÉE : un brief du Radar porte « Bouclé », « Archivé » ou « Livré ».
   * Quelqu'un l'a écrit ; c'est un fait, et le contrôle du bilan s'applique.
   *
   * INFÉRÉE : le document est un HISTORIQUE de production — son titre le dit,
   * son cadre va de janvier 2025 à aujourd'hui — et la période de la campagne
   * s'est achevée. Une campagne inventoriée dans un rétrospectif, dont la
   * fenêtre est passée et qu'aucun brief vivant ne contredit, n'est pas un
   * chantier ouvert. C'est une déduction, donc elle porte son motif, ne
   * réclame aucun bilan, et se confirme ou se rouvre d'un geste.
   *
   * Sans cette distinction, les cent vingt-quatre campagnes sans brief
   * apparié restaient ouvertes et réclamaient leur décideur : sept cent deux
   * blocages, et l'écran du lundi enterré sous l'historique. Avec elle, ce
   * qui reste ouvert est ce dont un document dit qu'il tourne encore. */
  const VIVANT = { "En cours": 1, "Reçu": 1, "Frozen": 1, "Bloqué": 1, "En attente client": 1 };
  const briefsDuDossier = [maitre, ...filles].filter(Boolean);
  const encoreVivant = briefsDuDossier.some((b) => VIVANT[b.statut]);

  if (maitre && CORR.STATUTS_CLOS[maitre.statut]) {
    p.cloture = {
      le: (maitre.recu ? maitre.recu + "T00:00:00.000Z" : MAINTENANT),
      bilan: "",
      releve: `Radar ${maitre.ndeg}, statut « ${maitre.statut} »`,
      par: "creation",
    };
    stats.clos++;
  } else if (!encoreVivant) {
    /* La regle, et elle se dit en une phrase : dans un inventaire
     * retrospectif, une campagne est finie sauf si quelque chose dit qu'elle
     * tourne. C'est la nature du document qui porte l'inference, pas la date.
     *
     * J'avais d'abord exige une periode echue. Vingt-cinq campagnes ecrites
     * « 2025 -> 2026 » restaient alors ouvertes — non parce qu'un document les
     * disait vivantes, mais parce qu'une annee nue se lit « jusqu'au 31
     * decembre ». Elles reclamaient leur decideur et leur porteur de brief :
     * cent cinquante blocages sur du travail livre.
     *
     * La date, quand elle est la et passee, renforce le motif. Quand elle
     * manque, le motif tient seul sur l'inventaire — et il le dit. */
    const dateSure = !!(per && per.fin < AUJOURD_HUI);
    /* Une clôture ne se date jamais dans le futur.
     *
     * « 2025 → 2026 » se lit « jusqu'au 31 décembre 2026 », et ce 31 décembre
     * n'est pas encore arrivé. La chronologie de la marque affichait donc des
     * projets clos à une date à venir, en tête de son histoire. Quand la fin
     * de période dépasse aujourd'hui, c'est aujourd'hui qui fait foi : on
     * constate la clôture, on ne l'anticipe pas. */
    p.cloture = {
      le: (dateSure ? per.fin : AUJOURD_HUI) + "T00:00:00.000Z",
      bilan: "",
      infere: {
        pourquoi: `Le document « ${SOURCE_DOC} » est un historique de production : `
          + `il inventorie ce qui a été fait. `
          + (dateSure ? `La période « ${per.texte} » s'est achevée le ${per.fin}. `
             : per ? `La période « ${per.texte} » ne donne pas de fin précise. `
                   : `Le document ne donne aucune période. `)
          + (maitre ? `Le brief ${maitre.ndeg} porte « ${maitre.statut} », qui n'est pas un statut vivant.`
                    : `Aucun brief du Radar ne dit que la campagne tourne encore.`),
        solide: dateSure ? "date échue" : "inventaire seul",
        quand: MAINTENANT, par: "creation",
      },
      par: "creation",
    };
    stats.closInferes++;
    if (!dateSure) stats.closSansDate++;
  } else {
    stats.vivants++;
  }

  /* ————— Les livrables ————— */
  let n = 0;
  const idL = () => "L-xc-" + num + "-" + String(++n).padStart(3, "0");

  /* 1 · Les masters. L'index dit « une copie renommée du KV validé » : le
   * support n'est pas déduit, il est écrit.
   *
   * Trois natures dans le même index, et elles ne sont pas le même objet :
   *   master           le KV validé de la campagne
   *   variante marché  la même campagne déclinée sur un marché — une
   *                    ADAPTATION, qui pend de son master. C'est la dépendance
   *                    la plus coûteuse du métier, et elle est écrite sur le
   *                    disque : vingt dossiers la nomment marché par marché.
   *   équivalent       il n'y a pas de KV — un événement, un shooting, une
   *                    captation. La pièce tient lieu de master et le dit. */
  const vraisMasters = pieces.masters.filter((m) => m.statut === "master");
  const variantes = pieces.masters.filter((m) => m.statut === "variante marché");
  const equivalents = pieces.masters.filter((m) => /^équivalent/.test(m.statut));

  for (const m of vraisMasters.concat(equivalents)) {
    p.livrables.push({
      id: idL(), nom: m.campagne + " — master" + (m.annee ? " " + m.annee : ""),
      support: "S-kv", marche: null, voletId: null, responsable: null,
      echeance: null, remise: null, publication: null,
      origine: "prevu", pisteId: null, maitre: null, versionMaitre: null,
      version: 1, versions: [], estime: null, reel: null, toursVendus: null,
      assets: [], entrees: [], annotations: [], mockups: [],
      niveau: "maitre",
      marqueId: (CORR.MARQUES[m.marque] || [])[0] || null,
      master: CHEMIN.master + m.copie,
      points: {},
      releve: { source: "02 MASTERS DE CAMPAGNE/_INDEX.csv", ligne: m.copie,
        origine_disque: m.source || null, statut: m.statut || null,
        sansKV: /^équivalent/.test(m.statut) || undefined },
    });
    stats.livrablesMasters++;
  }

  /* Les variantes marché : des adaptations, pendues au master de la campagne. */
  const leMaster = p.livrables.find((l) => l.niveau === "maitre");
  for (const v of variantes) {
    p.livrables.push({
      id: idL(), nom: v.copie.replace(/\.[a-z0-9]+$/i, "").split("/").pop(),
      support: "S-kv", marche: null, voletId: null, responsable: null,
      echeance: null, remise: null, publication: null,
      origine: "prevu", pisteId: null,
      maitre: leMaster ? leMaster.id : null, versionMaitre: leMaster ? 1 : null,
      version: 1, versions: [], estime: null, reel: null, toursVendus: null,
      assets: [], entrees: [], annotations: [], mockups: [],
      niveau: "adaptation",
      marqueId: (CORR.MARQUES[v.marque] || [])[0] || null,
      master: CHEMIN.master + v.copie,
      points: {},
      releve: { source: "02 MASTERS DE CAMPAGNE/_INDEX.csv", ligne: v.copie,
        origine_disque: v.source || null, statut: v.statut },
    });
    stats.variantes++;
  }

  /* 2 · Les déclinaisons. Elles pendent du master de leur couple quand il y en
   * a un : c'est la dépendance maître → adaptations, lue sur le disque. */
  const premierMaster = leMaster;
  for (const d of pieces.declinaisons) {
    p.livrables.push({
      id: idL(), nom: d.copie.split("/").pop().replace(/\.[a-z0-9]+$/i, ""),
      support: null, marche: null, voletId: null, responsable: null,
      echeance: null, remise: null, publication: null,
      origine: "prevu", pisteId: null,
      /* La version du maitre au moment ou l'adaptation a ete produite. La
       * laisser nulle faisait lever « maitre perime » sur les cent cinquante-
       * six pieces : elles auraient toutes ete reputees faites sur une version
       * anterieure a la premiere. Rien ne dit cela. */
      maitre: premierMaster ? premierMaster.id : null,
      versionMaitre: premierMaster ? (premierMaster.version || 1) : null,
      version: 1, versions: [], estime: null, reel: null, toursVendus: null,
      assets: [], entrees: [], annotations: [], mockups: [],
      niveau: premierMaster ? "adaptation" : "declinaison",
      marqueId: (CORR.MARQUES[d.marque] || [])[0] || null,
      master: CHEMIN.kv + d.copie,
      points: {},
      releve: { source: "03 KEY VISUALS PAR MARQUE/_INDEX.csv", ligne: d.copie,
        dimensions: d.dimensions || null, origine_disque: d.source || null },
    });
    stats.livrablesKV++;
    stats.sansSupport++;
  }

  /* 3 · Les tâches du Radar. Chacune est un livrable nommé, daté, statué —
   * c'est la couche que le titulaire a relevée lui-même. */
  for (const t of filles) {
    p.livrables.push({
      id: idL(), nom: t.projet,
      support: null, marche: (marchesDe(t.pays) || [])[0] || null,
      voletId: null, responsable: null,
      echeance: t.recu || null, remise: null, publication: null,
      origine: "prevu", pisteId: null, maitre: null, versionMaitre: null,
      version: 1, versions: [], estime: null, reel: null, toursVendus: null,
      assets: [], entrees: [], annotations: [], mockups: [],
      niveau: "declinaison",
      marqueId: (CORR.MARQUES[t.marque] || [])[0] || null,
      points: {},
      releve: { source: "Radar " + t.ndeg, ligne: t.projet,
        statut: t.statut, rattache: t.rattache,
        sienne: t.sous_sa_responsabilite === "true" },
    });
    stats.livrablesRadar++;
  }

  /* ————— La vignette du dossier ————— */
  if (res.illustration) {
    const nom = res.illustration["fichier exporté"].split("/").pop();
    if (existsSync(join(BARRE, CHEMIN.vignette, nom))) {
      p.vignette = CHEMIN.vignette + nom;
    } else {
      /* Le chemin existe a l'index mais la vignette n'a pas ete montee. On ne
       * pose pas un chemin mort : la carte dira « aucun visuel », ce qui est
       * vrai, plutot qu'une image cassee qui pretend le contraire. */
      stats.vignetteManquante++;
    }
  } else {
    stats.sansIllustration++;
  }

  /* ————— Ce qui est annoncé sans être nommé —————
   *
   * « 20 posters », « 122 fichiers » : un compte, pas une liste. On ne fabrique
   * pas vingt lignes « Poster 1…20 » — ce seraient vingt mensonges. Le nombre
   * est gardé ; la vue des livrables en souffrance montrera l'écart. */
  const annonce = String(k.preuve).match(/(\d+)\s*(fichiers?|posters?|visuels?|slides?|pièces?|exés?|déclinaisons?)/i);
  if (annonce) {
    p.releve.annonce = { nombre: +annonce[1], quoi: annonce[2],
      phrase: annonce[0], traces: p.livrables.length };
  }

  dossiers.push(p);
});

/* ————————————————————— La garantie —————————————————————
 *
 * Le seul contrôle qui sépare l'inférence de la fabrication : tout champ
 * rempli est soit relevé d'un document — et il figure dans cette liste — soit
 * tracé dans `inferences` avec son motif. S'il n'est ni l'un ni l'autre, la
 * passe échoue. Sans ce contrôle, « inférer » n'est qu'un mot plus poli. */
const RELEVES = new Set([
  "identite.client", "identite.marque", "identite.clientId",
  "identite.marqueIds", "identite.marches", "identite.fenetre",
]);

function verifier(dossiers) {
  const fautes = [];
  for (const p of dossiers) {
    for (const [sec, champs] of Object.entries(p.sections)) {
      if (Array.isArray(champs)) continue;
      for (const [c, v] of Object.entries(champs)) {
        const vide = v === null || v === undefined || v === ""
          || (Array.isArray(v) && !v.length);
        if (vide) continue;
        const cle = sec + "." + c;
        if (RELEVES.has(cle) || p.inferences[cle]) continue;
        fautes.push(p.ref + " · " + cle + " = " + JSON.stringify(v).slice(0, 60));
      }
    }
    /* Le plancher : ce qu'aucun document n'énonce ne doit pas exister.
     *
     * VIDE, en revanche, est normal : la migration du produit pose `insights:
     * []` et `territoires: []` sur tout dossier qu'elle ouvre. Un contrôle qui
     * refuse la clé plutôt que son contenu échoue sur un dossier parfaitement
     * propre — et un contrôle qui crie à tort finit par ne plus être lu. */
    const plein = (v) => v && (Array.isArray(v) ? v.length : Object.keys(v).length);
    for (const interdit of ["socle", "strategie", "insights", "territoires", "ecoles"]) {
      if (plein(p[interdit]) || plein(p.sections[interdit])) {
        fautes.push(p.ref + " · " + interdit + " ne devrait pas être rempli");
      }
    }
    if (p.sections.bigidea && (p.sections.bigidea.idee || p.sections.bigidea.mecanique)) {
      fautes.push(p.ref + " · bigidea.idee ou .mecanique fabriquée");
    }
  }
  return fautes;
}

/* ————————————————————— Le rapport ————————————————————— */

const ligne = (n, t) => `  ${String(n).padStart(5)}  ${t}`;
const titre = (t) => "\n" + t + "\n" + "─".repeat(t.length);

const totalLivrables = dossiers.reduce((n, p) => n + p.livrables.length, 0);
const appariesRadar = dossiers.filter((p) => p.releve.radar.length).length;
const piecesRattachees = stats.livrablesMasters + stats.livrablesKV;
const fautes = verifier(dossiers);

console.log(titre("CE QUI ENTRE"));
console.log(ligne(dossiers.length, "dossiers, un par campagne documentée"));
console.log(ligne(totalLivrables, "livrables"));
console.log(ligne(stats.livrablesMasters, "  · depuis 02 MASTERS — masters de campagne"));
console.log(ligne(stats.variantes, "  · depuis 02 MASTERS — variantes marché, en adaptations"));
console.log(ligne(stats.livrablesKV, "  · depuis 03 KEY VISUALS — déclinaisons"));
console.log(ligne(stats.livrablesRadar, "  · depuis les tâches du Radar"));
console.log(ligne(dossiers.reduce((n, p) => n + Object.keys(p.inferences).length, 0),
  "inférences posées, chacune avec son motif"));
console.log(ligne(stats.clos, "dossiers clos, RELEVÉ — statut Bouclé/Archivé/Livré au Radar"));
console.log(ligne(stats.closInferes, "dossiers clos, INFÉRÉ — inventaire rétrospectif, à confirmer"));
console.log(ligne(stats.closSansDate, "  · dont sans date échue : le motif tient sur l'inventaire seul"));
console.log(ligne(stats.vivants, "dossiers ouverts — un brief du Radar les dit vivants"));
console.log(ligne(appariesRadar, "dossiers portant une référence réelle du Radar"));
console.log(ligne(dossiers.length - appariesRadar, "dossiers en série XC- : aucun brief apparié"));

console.log(titre("CE QUE LE CORPUS COMPTE, ET CE QUI EST RATTACHÉ"));
console.log(ligne(IDX_MASTER.length, `pièces master au disque (hors historique) → `
  + `${stats.livrablesMasters + stats.variantes} rattachées`));
console.log(ligne(MASTERS_HISTORIQUES, "masters 2017-2024 écartés : hors du cadre d'attribution"));
console.log(ligne(IDX_KV.length, `pièces indexées → ${stats.livrablesKV} rattachées`));
console.log(ligne(taches.length, `tâches au Radar → ${stats.livrablesRadar} rattachées`));
console.log(ligne(maitres.length, `briefs maîtres → ${appariesRadar} appariés à une campagne`));
console.log(ligne(doublons.length, "doublons du Radar — non ingérés, montrés comme doublons"));
console.log(ligne(malformes.length, "enregistrements malformés : "
  + malformes.map((m) => m.ndeg).join(", ")));

console.log(titre("CE QUI MANQUE, ET QUI NE S'INVENTE PAS"));
console.log(ligne(stats.sansIllustration, "dossiers sans illustration au corpus"));
console.log(ligne(stats.vignetteManquante, "illustrations indexées sans vignette montée — "
  + "lancer outils/vignettes-corpus.sh"));
console.log(ligne(stats.sansMarque, "dossiers sans marque rattachable"));
console.log(ligne(stats.sansSupport, "pièces sans support : le référentiel ne porte aucune"));
console.log("         dimension de gabarit, rien ne permet de le déduire.");

if (R.douteux.length) {
  console.log(titre("RATTACHEMENTS DOUTEUX — appliqués, à trancher"));
  const vus = new Set();
  for (const d of R.douteux) {
    if (vus.has(d.quoi)) continue;
    vus.add(d.quoi);
    const n = R.douteux.filter((x) => x.quoi === d.quoi).length;
    console.log(`\n  « ${d.quoi} » → ${d.vers}   (${n} campagnes)`);
    console.log("  " + d.pourquoi.replace(/\s+/g, " ").match(/.{1,74}(\s|$)/g).join("\n  ").trim());
  }
}

if (R.inconnus.size) {
  console.log(titre("LIBELLÉS NON RECONNUS — à ajouter à correspondances.mjs"));
  [...R.inconnus].sort().forEach((x) => console.log("  - " + x));
}

console.log(titre(`APPARIEMENTS QUI HÉSITENT — ${R.hesite.length}, non appliqués`));
R.hesite.slice(0, 20).forEach((h) => {
  console.log(`  ${h.quoi} · ${h.campagne || h.dossier}`);
  console.log(`      proposé : ${h.propose}  (${h.score})`
    + (h.autres && h.autres.length ? "  autres : " + h.autres.join(", ") : ""));
});
if (R.hesite.length > 20) console.log(`  … et ${R.hesite.length - 20} autres`);

const sansRien = R.aucun.filter((a) => a.quoi === "pièces → campagne");
console.log(titre(`PIÈCES QUI RESTENT AU FONDS — ${sansRien.length} lots`));
sansRien.slice(0, 12).forEach((a) => console.log(
  `  ${a.dossier || a.marque}${a.pieces ? "  · " + a.pieces + " pièces" : ""}`));
if (sansRien.length > 12) console.log(`  … et ${sansRien.length - 12} autres`);

console.log(titre("GABARITS PROPOSÉS"));
const parGab = {};
dossiers.forEach((p) => { parGab[p.gabarit] = (parGab[p.gabarit] || 0) + 1; });
Object.entries(parGab).forEach(([g, n]) => console.log(ligne(n, g)));

console.log(titre("LA GARANTIE"));
if (fautes.length) {
  console.log(`  ÉCHEC — ${fautes.length} champs ni relevés ni tracés comme inférés :`);
  fautes.slice(0, 15).forEach((f) => console.log("    " + f));
  console.log("\n  La passe n'écrit rien. Un champ rempli sans motif est une fabrication.");
  process.exit(1);
}
console.log("  ✓ tout champ rempli est relevé d'un document ou tracé comme inféré, avec son motif");
console.log("  ✓ aucun socle, aucune stratégie, aucun insight, aucun territoire, aucune école");

/* ————————————————————— Écrire ————————————————————— */

if (!ECRIRE) {
  console.log(titre("PASSE À BLANC"));
  console.log("  Rien n'a été écrit. Relire ci-dessus, corriger correspondances.mjs,");
  console.log("  rejouer. Puis : node outils/ingerer-corpus.mjs --ecrire");
  process.exit(0);
}

/* On archive avant d'écrire. Toujours, sans condition. */
const horodate = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const archive = join(BARRE, "depots", "archive", `avant-corpus-${horodate}.json`);
copyFileSync(DEPOT, archive);

const idsClients = new Set(depot.clients.map((c) => c.id));
for (const c of CORR.CLIENTS_NEUFS) {
  if (!idsClients.has(c.id)) depot.clients.push({ ...c, vault: {}, marches: [], categories: [] });
}
const idsMarques = new Set(depot.marques.map((m) => m.id));
for (const m of CORR.MARQUES_NEUVES) {
  if (!idsMarques.has(m.id)) depot.marques.push({ ...m, vault: {}, secteur: "", couleurs: [] });
}
const idsMarches = new Set(depot.marches.map((m) => m.id));
for (const m of CORR.MARCHES_NEUFS) if (!idsMarches.has(m.id)) depot.marches.push(m);

/* Les dossiers déjà là ne sont jamais touchés. Une passe qui rejoue remplace
 * les siens et laisse les autres intacts. */
const ancienne = new Set(dossiers.map((p) => p.id));
depot.projets = depot.projets.filter((p) => !ancienne.has(p.id)).concat(dossiers);

/* Le Radar entre comme registre, pas comme dossiers : l'écart entre 366 briefs
 * et 140 campagnes est l'information, pas le bruit. */
depot.radar = RADAR.map((r) => ({
  ndeg: r.ndeg, client: r.client, marque: r.marque, pays: r.pays,
  projet: r.projet, livrables: r.livrables, recu: r.recu, statut: r.statut,
  entree: r.entree, rattache: r.rattache,
  sienne: r.sous_sa_responsabilite === "true",
  clientId: clientDuRadar(r),
  projetId: (campagneDuMaitre.has(r.ndeg)
    ? dossiers[campagnes.indexOf(campagneDuMaitre.get(r.ndeg))].id
    : (r.rattache && campagneDuMaitre.has(r.rattache)
        ? dossiers[campagnes.indexOf(campagneDuMaitre.get(r.rattache))].id : null)),
  malforme: !["Maître", "Tâche", "Doublon"].includes(r.entree) || undefined,
}));
depot.radar_releve_le = MAINTENANT;

/* Le fichier porte désormais des clôtures : c'est du schéma 4, et le dire
 * évite que l'application croie migrer un fichier qu'elle a déjà migré. */
depot.schema = 4;
depot.enregistre_le = MAINTENANT;
depot.machine = "ingestion corpus Xtincell";
writeFileSync(DEPOT, JSON.stringify(depot, null, 1));

const ko = Math.round(Buffer.byteLength(JSON.stringify(depot)) / 1024);
console.log(titre("ÉCRIT"));
console.log(ligne(dossiers.length, "dossiers"));
console.log(ligne(depot.clients.length, "clients  (+" + CORR.CLIENTS_NEUFS.length + ")"));
console.log(ligne(depot.marques.length, "marques  (+" + CORR.MARQUES_NEUVES.length + ")"));
console.log(ligne(depot.marches.length, "marchés  (+" + CORR.MARCHES_NEUFS.length + ")"));
console.log(ligne(depot.radar.length, "briefs au registre du Radar"));
console.log(ligne(ko, "Ko — dépôt"));
console.log("\n  archive : depots/archive/avant-corpus-" + horodate + ".json");
