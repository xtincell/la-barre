/* nature.js — ce qu'un projet est, et donc ce qu'on peut lui demander.
 *
 * Le produit posait la question à cinq endroits, chacun avec sa propre boucle
 * sur MAISON.gabarits, et deux d'entre eux en tiraient des conclusions
 * différentes. La question est une : quelle est la nature de ce projet, et
 * qu'est-ce qu'elle commande ?
 *
 * Elle commande trois choses, et rien de plus :
 *
 *   ce qui s'affiche   les sections du dossier — donc ce que les contrôles
 *                      ont le droit d'exiger. Une mise à jour de code-barre
 *                      n'a pas de section Concevoir, donc aucun contrôle ne
 *                      lui réclamera d'insight. Ce n'est pas un contrôle
 *                      affaibli : c'est un contrôle qui ne s'applique pas.
 *
 *   le brief qui gouverne   chaque nature a le sien, et briefs.js les porte
 *                      déjà tous. Le film est gouverné par son estimation
 *                      technique, pas par un brief de campagne.
 *
 *   le pilier servi    proposé, jamais imposé. Quel pilier de la marque ce
 *                      travail fait bouger — c'est un jugement stratégique,
 *                      il entre inféré avec son motif et se contresigne.
 *
 * Un projet sans nature reconnue retombe sur la campagne : c'est la plus
 * exigeante, et se tromper par excès d'exigence est le bon sens de l'erreur.
 */

window.NATURE = (function () {

  function liste() { return MAISON.natures || []; }

  function de(p) {
    var cle = p && (p.nature || p.gabarit);   /* gabarit : l'ancienne clé, le temps d'une migration */
    var n = null;
    liste().forEach(function (x) { if (x.cle === cle) n = x; });
    return n || liste()[0] || null;
  }

  function nom(p) { var n = de(p); return n ? n.nom : "—"; }

  /* Le mécanisme de silence, et il n'y en a qu'un. */
  function aSection(p, cle) {
    var n = de(p);
    return !n || n.sections.indexOf(cle) !== -1;
  }

  function sections(p) { var n = de(p); return n ? n.sections : []; }

  /* Ce qui tourne en continu.
   *
   * Remplace les quatre `p.gabarit === "cycle"` éparpillés — dans reco.js,
   * regles.js et territoire.js — qui posaient tous la même question avec
   * leurs propres mots. Et elle a changé de sens : un projet est continu
   * parce qu'il appartient au régime always-on de sa marque, pas seulement
   * parce qu'on l'a étiqueté « cycle ». L'étiquette reste vraie ; elle n'est
   * plus la seule réponse. */
  function estContinu(p) {
    if (!p) return false;
    if ((p.nature || p.gabarit) === "cycle") return true;
    if (window.CAMPAGNE && p.campagneId) {
      var c = CAMPAGNE.de(p.campagneId);
      if (c && c.regime === "always-on") return true;
    }
    return false;
  }

  /* Le pilier : celui qu'on a contresigné, sinon celui que la nature propose. */
  function pilier(p) {
    if (p && p.pilier) return p.pilier;
    var n = de(p);
    return n ? n.pilier : null;
  }

  function pilierDef(cle) {
    var d = null;
    (MAISON.piliers || []).forEach(function (x) { if (x.cle === cle) d = x; });
    return d;
  }

  /* Le type de brief qui gouverne ce projet. briefs.js les porte tous : on ne
   * décrit pas un dixième brief, on dit lequel des neuf s'applique. */
  function brief(p) { var n = de(p); return n ? n.brief : null; }

  return { liste: liste, de: de, nom: nom, aSection: aSection, sections: sections,
    estContinu: estContinu, pilier: pilier, pilierDef: pilierDef, brief: brief };
})();
