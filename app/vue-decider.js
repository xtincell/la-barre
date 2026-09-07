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
  var mode = "file";

  var MODES = [
    { cle: "file", nom: "FILE DE VALIDATION", quoi: "un livrable en entier, dans l'ordre du coût" },
    { cle: "du", nom: "EN ATTENTE DE TIERS", quoi: "ce que j'ai renvoyé et qui n'est pas revenu" },
  ];

  /* « piece » a été absorbée par « file ». L'adresse continue de fonctionner :
   * un lien partagé il y a six mois doit arriver quelque part. */
  var ABSORBEES = { piece: "file" };

  /* Combien de décisions attendent, tous modes confondus. C'est le seul
   * compteur qui a le droit d'être permanent. */
  function combien() {
    return FILE.tout().length;
  }

  function rendre(hote, arg) {
    if (arg && ABSORBEES[arg]) arg = ABSORBEES[arg];
    if (arg && MODES.some(function (m) { return m.cle === arg; })) mode = arg;

    hote.className = "zone";
    O.vider(hote);

    var n = combien();
    var du = ECARTS.total() + RENVOI.ouvertes().length;
    var p = mode === "du" ? pireDu(du) : pireFile(n);

    hote.appendChild(el("div.dc", {},
      el("div.dc-tete", {},
        el("div.dct-c", {},
          el("h2", {}, p.t),
          el("div.dct-q", {}, p.q))),

      /* Les trois modes. Pas des catégories : trois façons de faire la même chose. */
      /* Deux modes. Seul le compteur du mode actif porte l'alerte : si tous
       * les compteurs sont rouges, la priorité cesse d'être rare. */
      el("div.dc-modes", {}, MODES.map(function (m) {
        var c = m.cle === "du" ? du : n;
        return el("button.dcm" + (mode === m.cle ? ".ici" : ""), { type: "button",
          onclick: function () { mode = m.cle; rendre(hote); } },
          el("span.dcm-n", {}, m.nom),
          el("span.dcm-q", {}, m.quoi),
          c ? el("span.dcm-c" + (mode === m.cle ? "" : ".terne"), {}, String(c)) : null);
      })),

      el("div.dc-corps", {},
        mode === "file" ? FILE.salle(function () { rendre(hote); }) : du_(hote))
    ));
  }

  /* ————————————————————— Le titre suit le mode ————————————————————— */

  /* La file annonçait « Rien n'avance sans ces N décisions » jusque sur
   * l'écran de ce qu'on me doit — où rien de ce N n'est de mon ressort. */
  function pireFile(n) {
    return n
      ? { t: "Rien n'avance sans ces " + n + " décisions",
          q: "Triées par ce que ça coûte d'attendre un jour de plus — pas par ordre d'arrivée." }
      : { t: "Rien n'attend",
          q: "Aucun verdict en suspens, aucune modification due, aucun conflit d'ordre." };
  }

  /* Ce que d'autres me doivent. Ici le retard n'est pas le mien : ce qui
   * compte est depuis quand il court, et chez qui. */
  function pireDu(du) {
    if (!du) {
      return { t: "On ne me doit rien",
        q: "Aucun renvoi ouvert, aucune modification attendue. Ce qui n'est pas à moi "
          + "est reparti chez son propriétaire, et en est revenu." };
    }
    var ouvertes = RENVOI.ouvertes();
    var vieille = ouvertes[0] || null;
    var jours = vieille && vieille.envoye_le
      ? Math.round((new Date(O.jour()) - new Date(vieille.envoye_le)) / 86400000) : null;

    return { t: du + (du > 1 ? " choses me sont dues" : " chose m'est due"),
      q: jours !== null && jours > 0
        ? "La plus ancienne attend depuis " + jours + " jours. Mon horloge est arrêtée "
          + "dessus — c'est la seule trace de ce qui n'avance pas à cause d'un autre."
        : "Mon horloge est arrêtée dessus. C'est la seule trace de ce qui n'avance pas "
          + "à cause d'un autre, sans avoir à le déranger." };
  }

  /* ————————————————————— Ce qu'on me doit ————————————————————— */

  function du_(hote) {
    var zone = el("div");
    VUE_ATTENTES.rendre(zone);
    return zone;
  }

  return { rendre: rendre, combien: combien, titre: "Décider", MODES: MODES };
})();
