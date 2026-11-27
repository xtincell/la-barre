import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { relever } from '../outils/termes-interdits.mjs';

/* Naviguer : un bouton de destination mène d'un clic à l'écran qu'il nomme,
 * et une ancienne adresse mène au même écran quel que soit le chemin.
 *
 * Les modules réels (geste.js, application.js) tournent ici sans navigateur,
 * sur un document réduit à ce qu'ils touchent. Le clic lui-même, la recherche
 * au clavier et le Bureau se rejouent dans le parcours (tests/parcours.mjs). */

const lire = nom => readFile(new URL('../app/' + nom + '.js', import.meta.url), 'utf8');

/* Un nœud minimal : balise, classes, attributs, enfants. */
function noeud(balise) {
  return { balise, className: '', attributs: {}, enfants: [], ecouteurs: {},
    setAttribute(k, v) { this.attributs[k] = String(v); },
    addEventListener(type, f) { this.ecouteurs[type] = f; },
    appendChild(e) { this.enfants.push(e); return e; },
    get textContent() { return this.enfants.map(e => typeof e === 'string' ? e : e.textContent).join(''); } };
}

async function bac({ avecCoque = true, projets = [] } = {}) {
  const ctx = vm.createContext({ console, Date, Math, JSON });
  ctx.window = ctx;
  ctx.location = { hash: '#/bureau' };
  const ecoutes = [];
  ctx.document = { createElement: noeud, createTextNode: t => t,
    addEventListener: (type) => ecoutes.push(type) };
  ctx.DEPOT = { trouve: (k, id) => k === 'projets' ? projets.find(p => p.id === id) || null : null };
  vm.runInContext(await lire('maison-base'), ctx, { filename: 'maison-base.js' });
  vm.runInContext(await lire('outils'), ctx, { filename: 'outils.js' });
  /* O.el sur le nœud minimal : les chaînes restent des chaînes. */
  ctx.O.el = function (sel, attrs, ...enfants) {
    const parties = String(sel).split('.'); const n = noeud(parties.shift() || 'div');
    n.className = parties.join(' ');
    let reste = enfants;
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs) && !attrs.balise) {
      for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) {
        if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
      }
    } else reste = [attrs, ...enfants];
    for (const e of reste.flat()) if (e !== null && e !== undefined && e !== false) n.appendChild(e);
    return n;
  };
  vm.runInContext(await lire('geste'), ctx, { filename: 'geste.js' });
  if (avecCoque) vm.runInContext(await lire('application'), ctx, { filename: 'application.js' });
  return { ctx, ecoutes };
}

test('geste.js se charge sans la coque et sans rien faire : ni adresse, ni écouteur', async () => {
  const { ctx, ecoutes } = await bac({ avecCoque: false });
  assert.equal(ctx.location.hash, '#/bureau');
  assert.deepEqual(ecoutes, []);
  // Sans la coque (document publié, compilateur de La Fusée), un lien reste un lien.
  const a = ctx.GESTE.lien('#/valider/file', 'Ouvrir les décisions', 'b.or');
  assert.equal(a.balise, 'a');
  assert.equal(a.attributs.href, '#/valider/file');
});

test('une ancienne adresse a une seule adresse actuelle, la même pour la barre et pour les liens', async () => {
  const { ctx } = await bac();
  const { APP } = ctx;
  assert.equal(APP.actuelle('#/pipeline'), '#/planning/ordre');
  assert.equal(APP.actuelle('#/attentes/A-1'), '#/valider/du/A-1');
  assert.equal(APP.actuelle('#/galerie'), '#/projets/galerie');
  assert.equal(APP.actuelle('#/projets/PRO-x/brief'), '#/projets/PRO-x/brief');
  assert.equal(APP.actuelle('#/referentiel'), '#/referentiel', 'un espace actuel n’est pas un alias');
  const espaces = ['bureau', 'projets', 'valider', 'planning', 'reporting', 'referentiel'];
  for (const [ancienne, actuelle] of Object.entries(APP.ALIAS)) {
    assert.ok(espaces.includes(actuelle[0]), ancienne + ' mène à un espace qui existe');
    assert.ok(!espaces.includes(ancienne), ancienne + ' n’écrase pas un espace actuel');
    // Le lien d'un écran et la barre latérale arrivent au même endroit.
    assert.equal(ctx.GESTE.lien('#/' + ancienne).attributs.href, '#/' + actuelle.join('/'));
  }
});

test('un bouton de destination est un lien : il part d’un clic, et dit au survol ce qu’on y trouve', async () => {
  const p = { id: 'PRO-a', ref: 'PRJ-0001' };
  const { ctx } = await bac({ projets: [p] });
  const { GESTE } = ctx;
  const file = GESTE.bouton('file', {}, null, 'b.nu');
  assert.equal(file.balise, 'a');
  assert.equal(file.className, 'b nu');
  assert.equal(file.attributs.href, '#/valider/file');
  assert.equal(file.textContent, 'Ouvrir la file de validation');
  assert.equal(file.attributs.title, GESTE.LIEUX.file.quoi);
  assert.equal(file.ecouteurs.click, undefined, 'aucun panneau ne s’intercale');

  const brief = GESTE.bouton('brief', { p }, 'Lire le brief', 'studio-lien');
  assert.equal(brief.attributs.href, '#/projets/PRO-a/brief');
  assert.equal(brief.textContent, 'Lire le brief');

  // Une ligne de Décisions : l'adresse calculée, le libellé de l'appelant, et
  // ce que l'appelant sait de la destination quand elle n'est pas déclarée.
  const ligne = GESTE.lien('#/projets/PRO-a/livraison', 'Ouvrir le dossier', 'b.nu', { quoi: 'Trois cases vides.' });
  assert.equal(ligne.attributs.href, '#/projets/PRO-a/livraison');
  assert.equal(ligne.attributs.title, GESTE.LIEUX.projet.quoi);
  const inconnue = GESTE.lien('#/ailleurs', 'Y aller', 'b', { quoi: 'Trois cases vides.' });
  assert.equal(inconnue.attributs.title, 'Trois cases vides.');

  // Un conflit d'ordre mène aux priorités, là où il est compté.
  assert.equal(GESTE.lien('#/planning/ordre').textContent, 'Régler les priorités');
});

test('GESTE.ouvrir va droit à l’adresse, sans étape intermédiaire', async () => {
  const p = { id: 'PRO-a' };
  const { ctx } = await bac({ projets: [p] });
  let apres = 0;
  ctx.GESTE.ouvrir('charge', {}, () => { apres++; });
  assert.equal(ctx.location.hash, '#/planning/charge');
  assert.equal(apres, 1);
  ctx.GESTE.ouvrir('projet', { p, section: 'brief' });
  assert.equal(ctx.location.hash, '#/projets/PRO-a/brief');
  ctx.GESTE.ouvrir('#/attentes');
  assert.equal(ctx.location.hash, '#/valider/du');
});

test('ce qu’un lien dit au survol ne contient aucun terme interdit', async () => {
  const { ctx } = await bac();
  for (const [cle, L] of Object.entries(ctx.GESTE.LIEUX)) {
    assert.deepEqual(relever(L.geste + ' ' + L.quoi), [], cle);
  }
});

test('le Bureau coupe l’extrait du brief à la fin d’un mot, vers 160 caractères', async () => {
  const { ctx } = await bac();
  vm.runInContext(await lire('vue-studio'), ctx, { filename: 'vue-studio.js' });
  const { extrait } = ctx.VUE_STUDIO;
  assert.equal(extrait('  Une   phrase courte. ', 160), 'Une phrase courte.');
  const long = 'Orvelle est connue comme l’eau du déjeuner. Le citron l’emmène ailleurs : il faut lui trouver un moment à elle, sans renier la marque, ni son public, ni ses prix.';
  const court = extrait(long, 160);
  assert.ok(court.length <= 161 && court.endsWith('…'), court);
  assert.ok(long.startsWith(court.slice(0, -1).replace(/[\u00a0\u202f]/g, ' ')), 'l’extrait reprend le début du texte');
  assert.ok(/\p{L}…$/u.test(court), 'coupé après un mot, sans ponctuation pendante');
  assert.equal(extrait(null, 160), '');
});

test('le Bureau dit une échéance dépassée, comme Planning > Livraisons', async () => {
  const { ctx } = await bac();
  vm.runInContext(await lire('vue-studio'), ctx, { filename: 'vue-studio.js' });
  const { delai } = ctx.VUE_STUDIO;
  const maintenant = new Date('2026-11-26T09:00:00Z');
  const dit = e => { const d = delai(e, maintenant); return d && { texte: d.texte.replace(/\u00a0/g, ' '), retard: d.retard }; };
  // La remise du KV GH, le 6 novembre : vingt jours de retard au 26.
  assert.deepEqual(dit('2026-11-06'), { texte: 'dépassée de 20 j', retard: true });
  assert.deepEqual(dit('2026-11-25'), { texte: 'dépassée de 1 j', retard: true });
  assert.deepEqual(dit('2026-11-26'), { texte: 'aujourd’hui', retard: false });
  assert.deepEqual(dit('2026-11-27'), { texte: 'dans 1 j', retard: false });
  assert.deepEqual(dit('2026-11-30'), { texte: 'dans 4 j', retard: false });
  assert.equal(delai(null, maintenant), null);
  assert.equal(delai('à définir', maintenant), null);
  // Le nombre et son unité ne se séparent pas en fin de ligne.
  assert.match(delai('2026-11-06', maintenant).texte, /20\u00a0j$/);
});

test('une vignette de la file dit qui en répond, et pour quand ou depuis quand', async () => {
  const personnes = [{ id: 'P-da', nom: 'Sacha Martin' }];
  const { ctx } = await bac();
  ctx.DEPOT.trouve = (k, id) => k === 'personnes' ? personnes.find(p => p.id === id) || null : null;
  ctx.PLATEAU = { echeanceDe: (p, l) => l.remise || null };
  vm.runInContext(await lire('vue-studio'), ctx, { filename: 'vue-studio.js' });
  const { suivi } = ctx.VUE_STUDIO;
  const jour = 86400000, il_y_a = n => new Date(Date.now() - n * jour - 60000).toISOString();
  const dit = x => suivi(x).textContent.replace(/ /g, ' ');
  const sansDate = { sections: {} };
  // Une échéance passée prime, dans le ton qui bloque.
  const retard = suivi({ type: 'livrable', projet: sansDate, objet: { remise: il_y_a(5).slice(0, 10) }, auteur: 'P-da', depuis: il_y_a(2) });
  assert.match(retard.textContent.replace(/ /g, ' '), /^Sacha Martin · échéance dépassée de [56] j$/);
  assert.equal(retard.enfants.at(-1).className, 'lb-delai retard');
  // Sans échéance, l'ancienneté : depuis quand la pièce attend.
  assert.equal(dit({ type: 'piste', projet: sansDate, objet: {}, auteur: null, depuis: il_y_a(3) }), 'à attribuer · en attente depuis 3 j');
  assert.equal(dit({ type: 'piste', projet: sansDate, objet: {}, auteur: 'P-da', depuis: new Date().toISOString() }), 'Sacha Martin · déposée aujourd’hui');
  assert.equal(dit({ type: 'piste', projet: sansDate, objet: {}, auteur: 'P-da' }), 'Sacha Martin');
});

test('l’extrait du brief garde ses espaces insécables et pose celles qui manquent', async () => {
  const { ctx } = await bac();
  vm.runInContext(await lire('vue-studio'), ctx, { filename: 'vue-studio.js' });
  const { extrait } = ctx.VUE_STUDIO;
  // Une espace insécable saisie reste insécable.
  assert.equal(extrait('Le citron : un moment à elle', 160), 'Le citron : un moment à elle');
  assert.equal(extrait('Un mot', 160), 'Un mot');
  // Celles qui manquent se posent : rien ne coupe avant « : », « ; », « ? »,
  // ni à l'intérieur des guillemets.
  assert.equal(extrait('Ailleurs : il faut « vite » ! Pourquoi ? Ici ; là', 160),
    'Ailleurs : il faut « vite » ! Pourquoi ? Ici ; là');
  // La coupe ne sépare jamais un mot de son deux-points.
  const long = 'Orvelle est connue comme l’eau du déjeuner. Le citron l’emmène ailleurs : il faut lui trouver un moment à elle, sans renier la marque, ni son public, ni ses prix.';
  for (let n = 60; n <= 160; n += 7) {
    const court = extrait(long, n);
    assert.ok(!/ [:;!?»]/.test(court) && !/« /.test(court), n + ' : ' + court);
  }
});
