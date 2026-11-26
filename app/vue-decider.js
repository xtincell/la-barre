/* vue-decider.js — tout ce qui attend une décision de moi.
 *
 * Avant, quatre destinations répondaient à la même question : Maintenant, Revue,
 * Mes attentes, Pipeline. Quelqu'un qui découvrait le produit devait résoudre
 * un problème de classification — « est-ce un livrable à juger, un renvoi, un
 * retour client ? » — avant d'accéder à ce qu'il cherchait.
 *
 * Ce n'est pas son travail. C'est celui du produit.
 *
 * Ici il n'y a qu'une intention — décider — et deux manières de la servir :
 *   la file           une décision en entier, prête à être rendue
 *   ce qu'on me doit  ce que d'autres me doivent, et depuis quand
 *
 * Elles étaient trois. « La file » et « Une à une » ont fusionné : parcourir et
 * faire étaient deux moitiés du même geste, et choisir entre les deux était
 * précisément la micro-décision qu'un outil doit absorber. La file présente
 * maintenant un livrable en grand — c'est la salle de tri.
 *
 * Un mode n'est pas une catégorie : on n'a pas à choisir avant d'arriver.
 */

window.VUE_DECIDER = (function () {
  var el = O.el;

  var MODES = [
    { cle: "file", nom: "À traiter", quoi: "arbitrages, retours client et engagements" },
    { cle: "du", nom: "Retours attendus", quoi: "ce que j'ai renvoyé et qui n'est pas revenu" },
  ];

  /* « piece » a été absorbée par « file ». L'adresse continue de fonctionner :
   * un lien partagé il y a six mois doit arriver quelque part. */
  var ABSORBEES = { piece: "file" };

  /* Combien de décisions attendent, tous modes confondus. C'est le seul
   * compteur qui a le droit d'être permanent. */
  function combien() {
    return FILE.tout().length;
  }

  function rendre(hote, arg, sous) {
    if (arg && ABSORBEES[arg]) arg = ABSORBEES[arg];
    var mode = MODES.some(function (m) { return m.cle === arg; }) ? arg : "file";
    function rafraichir() { rendre(hote, mode, sous); }

    hote.className = "zone decisions-travail";
    O.vider(hote);

    var n = combien();
    var du = ECARTS.total() + RENVOI.ouvertes().length;

    /* L'en-tête d'écran du Studio : le titre dit l'état du mode, le chapô sa
     * conséquence ; le sélecteur vient dessous. Seul le compteur du mode
     * actif porte l'alerte : si tous sont rouges, la priorité cesse d'être rare. */
    hote.appendChild(el("div.dc", {},
      el("header.studio-entete.dc-tete", {},
        el("h1", {}, "Décisions")),
      UI.modes(MODES, mode, function (cle) { location.hash = "#/valider/" + cle; }, {
        route: "valider",
        titre: "Modes de Décisions",
        compte: function (m) { return m.cle === "du" ? du : n; },
        alerte: function (m) { return m.cle === mode; } }),
      el("div.dc-corps", {},
        mode === "file" ? FILE.salle(rafraichir) : du_(rafraichir, sous))
    ));
  }

  function du_(rafraichir, sous) {
    var zone = el("div");
    VUE_ATTENTES.rendre(zone, rafraichir, sous);
    return zone;
  }

  return { rendre: rendre, combien: combien, titre: "Décider", MODES: MODES };
})();
