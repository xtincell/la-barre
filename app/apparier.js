/* apparier.js — rapprocher deux listes de noms, et dire quand on hésite.
 *
 * Le problème se pose partout dès qu'on fait entrer du réel dans le produit :
 * des fichiers déposés face à des livrables attendus, des campagnes d'un
 * document face aux briefs d'un registre, des pièces rangées par dossier face
 * à des campagnes rangées par récit. Deux listes de noms, aucune clé commune.
 *
 * L'algorithme a été écrit pour l'import de visuels et corrigé par un vrai
 * dégât : mesuré dans un seul sens — « quelle part du candidat le fichier
 * contient-il » — un candidat court devient un joker. Trois livrables nommés
 * « DELYS » obtenaient 100 % sur n'importe quel fichier Delys et passaient
 * devant le bon.
 *
 * D'où la moyenne harmonique des deux sens, sévère par construction : il faut
 * que le candidat soit couvert ET que le sujet soit expliqué. Les mots du
 * sujet qu'aucun candidat ne porte — « v3 », « exe », « final » — sont du
 * bruit de nommage et ne comptent pas contre lui.
 *
 * Il vit ici plutôt que dans image.js parce qu'il n'a rien à voir avec les
 * images : c'est du rapprochement de noms, et le jour où on en écrit un
 * second, les deux divergent et l'un des deux garde le bug.
 *
 * Écrit pour tourner dans le navigateur ET hors de lui : aucun accès au DOM,
 * aucune dépendance. Un outil de ligne de commande peut le charger tel quel.
 */

(function (racine) {

  /* Les mots d'un nom. L'extension saute, la ponctuation aussi, et les mots
   * d'une lettre — ils n'identifient rien et pèsent comme les autres. */
  function mots(x) {
    return String(x || "").toLowerCase()
      .replace(/\.[a-z0-9]{2,5}$/, "")
      .replace(/[^a-z0-9àâäéèêëïîôöùûüçñ]+/g, " ")
      .split(" ")
      .filter(function (m) { return m.length > 1; });
  }

  /* candidats : [{ ref, mots: [] }]   ce à quoi on rattache
   * sujets    : [{ ref, mots: [] }]   ce qu'on rattache
   *
   * opts.seuil  en dessous, on ne propose rien
   * opts.marge  deux candidats plus proches que ça : on hésite
   * opts.unique un candidat ne prend qu'un sujet ; les suivants hésitent
   */
  function rapprocher(candidats, sujets, opts) {
    opts = opts || {};
    var SEUIL = opts.seuil === undefined ? 0.45 : opts.seuil;
    var MARGE = opts.marge === undefined ? 0.12 : opts.marge;
    var UNIQUE = opts.unique !== false;

    var cand = (candidats || []).filter(function (c) { return c && c.mots && c.mots.length; });
    if (!cand.length) {
      return (sujets || []).map(function (s) {
        return { sujet: s, candidat: null, score: 0, etat: "aucun", autres: [] };
      });
    }

    /* Fréquence documentaire : un mot porté par tous les candidats ne
     * distingue personne. « spaghetti » dans un lot de spaghettis ne vaut pas
     * « premium ». */
    var df = {};
    cand.forEach(function (c) {
      var vus = {};
      c.mots.forEach(function (m) { if (!vus[m]) { vus[m] = 1; df[m] = (df[m] || 0) + 1; } });
    });
    var N = cand.length;
    function poids(m) { return Math.log(N / (1 + (df[m] || 0))) + 1; }

    cand.forEach(function (c) {
      c._total = c.mots.reduce(function (t, m) { return t + poids(m); }, 0) || 1;
    });

    var vocabulaire = {};
    cand.forEach(function (c) { c.mots.forEach(function (m) { vocabulaire[m] = 1; }); });

    var resultats = (sujets || []).map(function (s) {
      var ms = s.mots || [];
      var connus = ms.filter(function (m) { return vocabulaire[m]; });
      var totalS = connus.reduce(function (t, m) { return t + poids(m); }, 0) || 1;

      var scores = cand.map(function (c) {
        var gagne = 0;
        c.mots.forEach(function (m) { if (ms.indexOf(m) !== -1) gagne += poids(m); });
        var rappel = gagne / c._total;    /* le candidat est-il couvert */
        var precision = gagne / totalS;   /* le sujet est-il expliqué */
        var v = (rappel + precision) ? (2 * rappel * precision) / (rappel + precision) : 0;
        return { c: c, s: v };
      }).sort(function (a, b) { return b.s - a.s; });

      var premier = scores[0];
      var second = scores[1] || { s: 0 };
      var etat = premier.s < SEUIL ? "aucun"
        : (premier.s - second.s) < MARGE ? "hesite" : "sur";

      return { sujet: s, candidat: etat === "aucun" ? null : premier.c,
        score: premier.s, etat: etat,
        autres: scores.filter(function (x) { return x.s >= SEUIL * 0.6; })
          .slice(0, 5).map(function (x) { return { candidat: x.c, s: x.s }; }) };
    });

    /* Un candidat ne reçoit qu'un sujet. Le mieux placé le garde ; les suivants
     * repassent en hésitation plutôt que d'écraser en silence. */
    if (UNIQUE) {
      var pris = [];
      resultats.slice().sort(function (a, b) { return b.score - a.score; })
        .forEach(function (r) {
          if (!r.candidat) return;
          if (pris.indexOf(r.candidat) !== -1) { r.etat = "hesite"; return; }
          pris.push(r.candidat);
        });
    }

    return resultats;
  }

  racine.APPARIER = { mots: mots, rapprocher: rapprocher };

})(typeof window !== "undefined" ? window : globalThis);
