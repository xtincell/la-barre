/* Passe de cohérence : toutes les adresses du produit, une à une.
 * Charger mesure-grammaire.js d'abord ; appeler window.__passe(). */
window.__passe = async function () {
  var S = ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes",
    "planche", "livrables", "livraison", "presentation"];
  var r = ["bureau", "valider/file", "valider/du", "projets", "projets/marques", "projets/MQ-br", "projets/MQ-bp",
    "projets/CMP-mq-br-rentree-2026", "projets/CMP-mq-bp-lancement-2026"];
  ["PRJ-BTS26", "PRJ-BP"].forEach(function (p) {
    r.push("projets/" + p); S.forEach(function (s) { r.push("projets/" + p + "/" + s); }); });
  ["ordre", "charge", "gens", "livraisons"].forEach(function (m) { r.push("planning/" + m); });
  ["indicateurs", "reprises", "equipe", "bilan", "arbitrages"].forEach(function (m) { r.push("reporting/" + m); });
  ["marques", "marches", "people", "radar", "intake", "doctrine", "parametres"].forEach(function (m) { r.push("referentiel/" + m); });
  var out = [];
  for (var i = 0; i < r.length; i++) {
    var m = await __mesure([r[i]]);
    var x = m[0];
    if (x.erreur) { out.push([r[i], x.erreur]); continue; }
    var t = x.serif + x.aplats + x.cibles + x.contraste + (x.debord ? 1 : 0);
    out.push([r[i], x.caps, x.serif, x.aplats, x.cibles, x.contraste, x.debord,
      t || x.caps ? [].concat(x.ex.caps, x.ex.serif, x.ex.aplats, x.ex.cibles, x.ex.contraste).slice(0, 4).join(" | ") : ""]);
  }
  return out;
};
