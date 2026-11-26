// Les visuels de la démonstration publique (vitrine/demo/visuels/).
//
// Deux photographies fictives, et rien d'autre : la canette Orvelle sur fond
// cobalt, et l'invitation d'Atelier Noro. Elles ont été produites pour la
// planche de conception de La Barre ; elles sont versionnées telles quelles
// dans vitrine/demo/sources/. Chaque visuel de la démonstration en dérive par
// ce script : un recadrage par format (3:2, 4:3, 1:1, 9:16), une couche de
// texte dans la langue du marché (français pour la Côte d'Ivoire, le Sénégal
// et le Cameroun, anglais pour le Ghana), et pour le KV master une V1 au pack
// illisible, que la V2 corrige. Aucun visuel ne porte de mention
// « démonstration » : la coque de l'application la porte, une fois.
//
//   node outils/visuels-demo.mjs --extraire <La-Barre.html>
//        une fois : écrit vitrine/demo/sources/{orvelle,atelier}.jpg depuis
//        les données de la planche de conception (clés « orvelle » et « atelier »)
//   node outils/visuels-demo.mjs
//        réécrit les visuels et vitrine/demo/visuels/LISEZMOI.json depuis les
//        sources ; demande Playwright et un navigateur (BROWSER_CHANNEL=chrome
//        pour Google Chrome), comme les tests de parcours
//   node outils/visuels-demo.mjs --check
//        sans navigateur : les sources sont intactes, chaque fichier du dossier
//        est déclaré au manifeste, fictif, présent et aux dimensions déclarées
//
// Le rendu passe par le canevas du navigateur : il se rejoue à l'identique sur
// un même moteur, pas forcément à l'octet près d'un moteur à l'autre. Ce que
// --check garantit, c'est le manifeste, pas l'octet.

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('../', import.meta.url));
export const SOURCES = join(RACINE, 'vitrine', 'demo', 'sources');
export const VISUELS = join(RACINE, 'vitrine', 'demo', 'visuels');
export const MANIFESTE = join(VISUELS, 'LISEZMOI.json');
const POLICES = join(RACINE, 'styles', 'polices');

const empreinte = octets => createHash('sha256').update(octets).digest('hex');

/* ————————————————————— Les sources ————————————————————— */

export const PHOTOS = {
  orvelle: { quoi: 'Canette fictive Orvelle, citron vert et feuilles, sur fond cobalt (photographie générée, marque inventée)' },
  atelier: { quoi: 'Carton d’invitation fictif « Atelier Noro » sur une enveloppe corail (photographie générée, atelier inventé)' },
};

/* La planche de conception porte ses images en données : un objet
 * `const assets={"atelier": "data:image/jpeg;base64,…", "orvelle": "…"}`. */
export function extraire(html) {
  const m = html.match(/const assets=(\{[\s\S]*?\});<\/script>/);
  if (!m) throw new Error('La planche ne déclare pas ses images (const assets={…}).');
  const assets = JSON.parse(m[1]);
  const sorties = {};
  for (const cle of Object.keys(PHOTOS)) {
    const d = String(assets[cle] || '').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!d) throw new Error('La photographie « ' + cle + ' » manque ou n’est pas un JPEG.');
    const octets = Buffer.from(d[1], 'base64');
    if (!dimensionsJpeg(octets)) throw new Error('La photographie « ' + cle + ' » est illisible.');
    sorties[cle] = octets;
  }
  return sorties;
}

/* Les dimensions d'un JPEG, lues dans son en-tête de trame (SOFn). */
export function dimensionsJpeg(o) {
  if (!o || o.length < 4 || o[0] !== 0xFF || o[1] !== 0xD8) return null;
  let i = 2;
  while (i + 9 < o.length) {
    if (o[i] !== 0xFF) { i++; continue; }
    const marque = o[i + 1];
    if (marque === 0xD8 || marque === 0x01 || (marque >= 0xD0 && marque <= 0xD7)) { i += 2; continue; }
    const longueur = o.readUInt16BE(i + 2);
    if (marque >= 0xC0 && marque <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marque)) {
      return { largeur: o.readUInt16BE(i + 7), hauteur: o.readUInt16BE(i + 5) };
    }
    i += 2 + longueur;
  }
  return null;
}

/* ————————————————————— Les déclinaisons ————————————————————— */

/* La canette dans la photographie Orvelle (1200 × 800), en pixels source :
 * c'est elle qu'on garde au cadre, et c'est elle que la V1 rend illisible. */
const CANETTE = { x: 535, y: 122, l: 252, h: 535 };

const FR = { titre: ['Le premier zeste', 'du jour'], sous: 'Orvelle Zeste · eau pétillante au citron',
  signature: 'Orvelle. Reprendre son souffle.' };
const EN = { titre: ['First zest', 'of the day'], sous: 'Orvelle Zeste · sparkling lime water',
  signature: 'Orvelle. Catch your breath.' };
const CARRE_FR = { ...FR, titre: ['Le premier', 'zeste du jour'], sous: 'Eau pétillante au citron' };
const CARRE_EN = { ...EN, titre: ['First zest', 'of the day'], sous: 'Sparkling lime water' };

/* Les mentions portées par chaque KV dans la base fictive (sku et mentions
 * de son marché) : le visuel dit ce que la fiche dit. */
const LEGAL = {
  master: 'Canette 33 cl',
  CI: 'Canette 33 cl · À consommer de préférence avant le…',
  SN: 'Canette 33 cl · Boisson aromatisée — sans sucres ajoutés · À consommer de préférence avant le…',
  GH: 'Can 33 cl · Best before end',
};

const PLEIN = { x: 0, y: 0, l: 1200, h: 800 };
const QUATRE_TIERS = { x: 124, y: 0, l: 1066.67, h: 800 };
const CARRE = { x: 140, y: 0, l: 800, h: 800 };

export const DECLINAISONS = [
  { fichier: 'kv-source-2026.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    grade: 'saturate(.45) contrast(1.08) brightness(.88)', langue: 'fr', marche: 'CI · SN',
    textes: { titre: ['L’eau qui pétille', 'd’ici'], sous: 'Orvelle Source · 2026', signature: 'Orvelle. Reprendre son souffle.' },
    quoi: 'KV de la campagne précédente, Orvelle Source 2026' },
  { fichier: 'kv-master-v1.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    defaut: CANETTE, langue: 'fr', marche: null, textes: { ...FR, legal: LEGAL.master },
    quoi: 'KV master, V1 : la canette est dans l’ombre et floue, le pack ne se lit pas (défaut voulu, corrigé en V2)' },
  { fichier: 'kv-master.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    langue: 'fr', marche: null, textes: { ...FR, legal: LEGAL.master },
    quoi: 'KV master, V2 : la canette se lit à trois mètres' },
  { fichier: 'kv-ci.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    langue: 'fr', marche: 'CI', textes: { ...FR, legal: LEGAL.CI }, quoi: 'KV adapté à la Côte d’Ivoire' },
  { fichier: 'kv-sn.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    langue: 'fr', marche: 'SN', textes: { ...FR, legal: LEGAL.SN },
    quoi: 'KV adapté au Sénégal, avec la mention imposée' },
  { fichier: 'kv-gh.jpg', source: 'orvelle', format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'cote',
    langue: 'en', marche: 'GH', textes: { ...EN, legal: LEGAL.GH },
    quoi: 'KV adapté au Ghana, titraille traduite en anglais' },
  { fichier: 'affiche-ci.jpg', source: 'orvelle', format: '4:3', largeur: 1200, hauteur: 900, cadre: QUATRE_TIERS, mise: 'cote',
    langue: 'fr', marche: 'CI', textes: { ...FR, legal: LEGAL.CI }, quoi: 'Affiche 4×3, Côte d’Ivoire' },
  { fichier: 'affiche-sn.jpg', source: 'orvelle', format: '4:3', largeur: 1200, hauteur: 900, cadre: QUATRE_TIERS, mise: 'cote',
    langue: 'fr', marche: 'SN', textes: { ...FR, legal: LEGAL.SN },
    quoi: 'Affiche 4×3, Sénégal' },
  { fichier: 'social-ci.jpg', source: 'orvelle', format: '1:1', largeur: 800, hauteur: 800, cadre: CARRE, mise: 'cote',
    langue: 'fr', marche: 'CI', textes: { ...CARRE_FR, legal: LEGAL.CI }, quoi: 'Post social 1:1, Côte d’Ivoire' },
  { fichier: 'social-gh.jpg', source: 'orvelle', format: '1:1', largeur: 800, hauteur: 800, cadre: CARRE, mise: 'cote',
    langue: 'en', marche: 'GH', textes: { ...CARRE_EN, legal: LEGAL.GH }, quoi: 'Post social 1:1, Ghana' },
  /* La photographie telle quelle, recopiée à l'octet : la distribution
   * publique ne porte pas vitrine/demo/sources/, et la démo montre
   * l'invitation à décliner. Le manifeste le dit, --check le vérifie. */
  { fichier: 'noro-invitation.jpg', source: 'atelier', copie: true, format: '3:2', largeur: 1200, hauteur: 800, cadre: PLEIN, mise: 'aucune',
    langue: 'fr', marche: 'CM', textes: null,
    quoi: 'L’invitation d’Atelier Noro telle qu’elle existe, à décliner : la photographie source, recopiée telle quelle' },
  { fichier: 'noro-story.jpg', source: 'atelier', format: '9:16', largeur: 540, hauteur: 960, cadre: { x: 375, y: 0, l: 450, h: 800 },
    mise: 'story', langue: 'fr', marche: 'CM',
    textes: { haut: 'Atelier Noro vous invite', bas: ['Vernissage · jeudi 10 décembre', '19 h · Douala'] },
    quoi: 'Story 9:16 de l’invitation d’Atelier Noro' },
];

/* Ce qui reste au dossier sans dériver d'une photographie. */
const AUTRES = {
  'logo-orvelle.svg': { fictif: true, source: null, format: null, quoi: 'Logo de la marque fictive Orvelle' },
};

/* ————————————————————— Le rendu, dans le navigateur ————————————————————— */

/* Exécuté dans la page : compose un visuel sur un canevas et le rend en JPEG. */
async function composerDansLaPage({ donnees, v }) {
  const img = new Image();
  img.src = donnees;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = v.largeur; c.height = v.hauteur;
  const ctx = c.getContext('2d');
  const k = v.largeur / v.cadre.l;
  const versSortie = r => ({ x: (r.x - v.cadre.x) * k, y: (r.y - v.cadre.y) * k, l: r.l * k, h: r.h * k });
  ctx.filter = v.grade || 'none';
  ctx.drawImage(img, v.cadre.x, v.cadre.y, v.cadre.l, v.cadre.h, 0, 0, v.largeur, v.hauteur);
  ctx.filter = 'none';

  /* Le défaut de la V1 : la canette passe dans l'ombre et se brouille. Le
   * masque est adouci pour que le défaut ait l'air d'un choix, pas d'un trou. */
  if (v.defaut) {
    const r = versSortie(v.defaut);
    const flou = document.createElement('canvas'); flou.width = c.width; flou.height = c.height;
    const f = flou.getContext('2d');
    f.filter = 'blur(9px) brightness(.4) saturate(.45)';
    f.drawImage(c, 0, 0);
    f.filter = 'none';
    const masque = document.createElement('canvas'); masque.width = c.width; masque.height = c.height;
    const m = masque.getContext('2d');
    m.filter = 'blur(22px)';
    m.fillStyle = '#000';
    m.beginPath(); m.roundRect(r.x - 18, r.y - 10, r.l + 36, r.h + 20, 40); m.fill();
    f.globalCompositeOperation = 'destination-in';
    f.drawImage(masque, 0, 0);
    ctx.drawImage(flou, 0, 0);
  }

  const t = v.textes;
  if (!t) return c.toDataURL('image/jpeg', 0.84);
  const W = v.largeur, H = v.hauteur;
  const marge = Math.round(Math.min(W, H) * 0.065);

  function ajuster(lignes, police, taille, largeurMax, plancher) {
    let s = taille;
    for (; s > plancher; s--) {
      ctx.font = police.replace('{t}', s);
      if (Math.max(...lignes.map(l => ctx.measureText(l).width)) <= largeurMax) break;
    }
    ctx.font = police.replace('{t}', s);
    return s;
  }

  if (v.mise === 'story') {
    ctx.fillStyle = '#1C1A17';
    ctx.textAlign = 'center';
    ajuster([t.haut], 'italic 500 {t}px "Source Serif 4"', 34, W - 2 * marge, 18);
    ctx.fillText(t.haut, W / 2, marge + 22);
    const s = ajuster(t.bas, '600 {t}px "Asap"', 26, W - 2 * marge, 14);
    t.bas.forEach((l, i) => ctx.fillText(l, W / 2, H - marge - (t.bas.length - 1 - i) * s * 1.35));
    return c.toDataURL('image/jpeg', 0.84);
  }

  /* Un voile léger côté texte : la titraille se lit sans assombrir la canette. */
  const voile = ctx.createLinearGradient(0, 0, W * 0.6, 0);
  voile.addColorStop(0, 'rgba(3, 8, 38, .55)');
  voile.addColorStop(1, 'rgba(3, 8, 38, 0)');
  ctx.fillStyle = voile;
  ctx.fillRect(0, 0, W * 0.6, H);
  const bas = ctx.createLinearGradient(0, H * 0.78, 0, H);
  bas.addColorStop(0, 'rgba(3, 8, 38, 0)');
  bas.addColorStop(1, 'rgba(3, 8, 38, .6)');
  ctx.fillStyle = bas;
  ctx.fillRect(0, H * 0.78, W, H * 0.22);

  const canette = versSortie(v.produit);
  const zone = Math.max(120, canette.x - marge * 1.6);
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, .35)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#FFFFFF';
  const st = ajuster(t.titre, 'italic 600 {t}px "Source Serif 4"', Math.round(H * 0.09), zone, 22);
  let y = marge + st * 0.95;
  t.titre.forEach(l => { ctx.fillText(l, marge, y); y += st * 1.08; });
  ctx.fillStyle = '#DDF26B';
  const ss = ajuster([t.sous], '600 {t}px "Asap"', Math.round(H * 0.03), zone, 12);
  ctx.fillText(t.sous, marge, y + ss * 0.4);

  ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(255, 255, 255, .88)';
  const pied = H - marge * 0.8;
  const sp = ajuster([t.signature], 'italic 500 {t}px "Source Serif 4"', Math.round(H * 0.03), W * 0.42, 11);
  ctx.textAlign = 'right';
  ctx.fillText(t.signature, W - marge, pied);
  const largeurSignature = ctx.measureText(t.signature).width;
  if (t.legal) {
    ctx.textAlign = 'left';
    ajuster([t.legal], '500 {t}px "Asap"', Math.round(sp * 0.82), W - 2 * marge - largeurSignature - marge, 10);
    ctx.fillText(t.legal, marge, pied);
  }
  return c.toDataURL('image/jpeg', 0.84);
}

async function polices() {
  const faces = [
    ['Source Serif 4', 'italic', 'sourceserif-italic-latin.woff2'],
    ['Asap', 'normal', 'asap-normal-latin.woff2'],
  ];
  const css = [];
  for (const [famille, style, fichier] of faces) {
    const b64 = (await readFile(join(POLICES, fichier))).toString('base64');
    css.push(`@font-face{font-family:"${famille}";font-style:${style};font-weight:300 700;src:url(data:font/woff2;base64,${b64}) format("woff2");}`);
  }
  return css.join('\n');
}

export async function generer() {
  const { chromium } = await import('playwright');
  const sources = {};
  for (const cle of Object.keys(PHOTOS)) sources[cle] = await readFile(join(SOURCES, cle + '.jpg'));
  const navigateur = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const ecrits = {};
  try {
    const page = await navigateur.newPage();
    await page.setContent('<!doctype html><meta charset="utf-8"><style>' + await polices()
      + '</style><body><p style="font:italic 600 20px \'Source Serif 4\'">a</p><p style="font:600 20px Asap">a</p></body>');
    await page.evaluate(async () => {
      await document.fonts.load('italic 600 40px "Source Serif 4"');
      await document.fonts.load('600 40px "Asap"');
      await document.fonts.ready;
    });
    for (const v of DECLINAISONS) {
      let octets;
      if (v.copie) {
        octets = sources[v.source];
      } else {
        const donnees = 'data:image/jpeg;base64,' + sources[v.source].toString('base64');
        const url = await page.evaluate(composerDansLaPage, { donnees, v: { ...v, produit: CANETTE } });
        octets = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      }
      const d = dimensionsJpeg(octets);
      if (!d || d.largeur !== v.largeur || d.hauteur !== v.hauteur)
        throw new Error(v.fichier + ' : ' + JSON.stringify(d) + ' au lieu de ' + v.largeur + ' × ' + v.hauteur);
      await writeFile(join(VISUELS, v.fichier), octets);
      ecrits[v.fichier] = octets;
    }
  } finally {
    await navigateur.close();
  }
  const manifeste = await composerManifeste(sources);
  await writeFile(MANIFESTE, JSON.stringify(manifeste, null, 1) + '\n');
  return { manifeste, ecrits };
}

/* ————————————————————— Le manifeste ————————————————————— */

async function composerManifeste(sources) {
  const visuels = {};
  for (const v of DECLINAISONS) {
    visuels[v.fichier] = { fictif: true, source: v.source + '.jpg', ...(v.copie ? { copie: true } : {}), format: v.format,
      largeur: v.largeur, hauteur: v.hauteur, langue: v.textes ? v.langue : null, marche: v.marche, quoi: v.quoi };
  }
  Object.assign(visuels, AUTRES);
  const triés = Object.fromEntries(Object.keys(visuels).sort().map(k => [k, visuels[k]]));
  return {
    mention: 'Démonstration — données fictives',
    note: 'Visuels de la démonstration publique : marques, campagnes, lieux et textes inventés. '
      + 'Dérivés par outils/visuels-demo.mjs des deux photographies fictives de vitrine/demo/sources/. '
      + 'La mention de démonstration est portée par la coque de l’application, pas par les images.',
    sources: Object.fromEntries(Object.keys(PHOTOS).map(cle => {
      const d = dimensionsJpeg(sources[cle]);
      return [cle + '.jpg', { sha256: empreinte(sources[cle]), largeur: d.largeur, hauteur: d.hauteur, quoi: PHOTOS[cle].quoi }];
    })),
    visuels: triés,
  };
}

/* Ce qui se vérifie sans navigateur : chaque fichier du dossier est déclaré
 * fictif au manifeste, et chaque déclaration a son fichier, à ses dimensions. */
export async function verifier() {
  const manifeste = JSON.parse(await readFile(MANIFESTE, 'utf8'));
  const fautes = [];
  for (const [nom, s] of Object.entries(manifeste.sources || {})) {
    let octets = null;
    try { octets = await readFile(join(SOURCES, nom)); } catch { fautes.push('source absente : ' + nom); continue; }
    if (empreinte(octets) !== s.sha256) fautes.push('source modifiée : ' + nom);
  }
  const presents = (await readdir(VISUELS)).filter(n => n !== 'LISEZMOI.json');
  const declares = Object.keys(manifeste.visuels || {});
  for (const n of presents) if (!declares.includes(n)) fautes.push('visuel non déclaré : ' + n);
  for (const n of declares) {
    const v = manifeste.visuels[n];
    if (v.fictif !== true) fautes.push('visuel non déclaré fictif : ' + n);
    if (!presents.includes(n)) { fautes.push('visuel déclaré absent : ' + n); continue; }
    if (v.source && !Object.hasOwn(manifeste.sources, v.source)) fautes.push('source inconnue pour ' + n);
    if (/\.jpe?g$/.test(n)) {
      const octets = await readFile(join(VISUELS, n));
      if (v.copie && empreinte(octets) !== (manifeste.sources[v.source] || {}).sha256) fautes.push('copie différente de sa source : ' + n);
      const d = dimensionsJpeg(octets);
      if (!d || d.largeur !== v.largeur || d.hauteur !== v.hauteur) fautes.push('dimensions de ' + n + ' : ' + JSON.stringify(d));
    }
  }
  const attendus = DECLINAISONS.map(v => v.fichier).concat(Object.keys(AUTRES)).sort();
  if (JSON.stringify(declares.slice().sort()) !== JSON.stringify(attendus)) fautes.push('le manifeste ne suit pas la liste du script');
  return { manifeste, fautes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [mode, chemin] = process.argv.slice(2);
  if (mode === '--extraire') {
    if (!chemin) { console.error('Usage : node outils/visuels-demo.mjs --extraire <La-Barre.html>'); process.exit(2); }
    const sorties = extraire(await readFile(chemin, 'utf8'));
    await mkdir(SOURCES, { recursive: true });
    for (const [cle, octets] of Object.entries(sorties)) {
      await writeFile(join(SOURCES, cle + '.jpg'), octets);
      console.log(cle + '.jpg : ' + octets.length + ' octets, ' + empreinte(octets));
    }
  } else if (mode === '--check') {
    const { fautes, manifeste } = await verifier();
    if (fautes.length) { console.error(fautes.join('\n')); process.exit(1); }
    console.log('Visuels de la démonstration : ' + Object.keys(manifeste.visuels).length + ' déclarés, sources intactes.');
  } else {
    const { ecrits } = await generer();
    console.log('Visuels écrits : ' + Object.keys(ecrits).join(', '));
  }
}
