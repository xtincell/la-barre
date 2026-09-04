/* vue-placer.js — qui fait quoi, dans quel ordre, avec quelle capacité.
 *
 * Décider et placer sont deux gestes différents. Décider, c'est trancher sur
 * une pièce. Placer, c'est répartir du temps humain — et ça se fait sur la
 * totalité des dossiers, jamais dossier par dossier.
 *
 * Trois manières de servir cette intention :
 *   l'ordre      ce qui passe avant, et pourquoi — ferme, engagé, spéculatif
 *   la charge    où en sont les pièces, par étage de production
 *   les gens     la capacité de chacun, et ce qu'on peut lui protéger
 */

window.VUE_PLACER = (function () {
  var el = O.el;
  var mode = "ordre";

  var MODES = [
    { cle: "ordre", nom: "L'ORDRE", quoi: "ce qui passe avant, et pourquoi" },
    { cle: "charge", nom: "LA CHARGE", quoi: "où en sont les pièces" },
    { cle: "gens", nom: "LES GENS", quoi: "la capacité de chacun" },
  ];

  function rendre(hote, arg) {
    if (arg && MODES.some(function (m) { return m.cle === arg; })) mode = arg;

    hote.className = "zone";
    O.vider(hote);

    var pieces = PRODUCTION.toutesLesPieces();
    var c = PRIORITE.conflits();
    var sansPlace = pieces.filter(function (x) {
      return !x.l.responsable || !x.l.estime || !x.l.remise; }).length;

    var p = mode === "gens" ? pireGens()
      : mode === "charge" ? pireCharge(pieces, sansPlace)
      : pireOrdre(c, sansPlace);

    hote.appendChild(el("div.dc", {},
      el("div.dc-tete", {},
        el("div.dct-c", {},
          el("h2", {}, p.t),
          el("div.dct-q", {}, p.q))),

      el("div.dc-modes", {}, MODES.map(function (m) {
        var n = m.cle === "ordre" ? c.conflits.length
          : m.cle === "charge" ? sansPlace : 0;
        return el("button.dcm" + (mode === m.cle ? ".ici" : ""), { type: "button",
          onclick: function () { mode = m.cle; rendre(hote); } },
          el("span.dcm-n", {}, m.nom),
          el("span.dcm-q", {}, m.quoi),
          n ? el("span.dcm-c", {}, String(n)) : null);
      })),

      el("div.dc-corps", {}, corps(hote))
    ));
  }

  /* ————————————————————— Le titre suit le mode ————————————————————— */

  /* L'ordre et la charge parlent de pièces ; les gens parlent de capacité.
   * Annoncer « 3 pièces ne sont pas plaçables » au-dessus des gens, c'est
   * répondre à côté de la question qu'on vient de poser. */
  function pireOrdre(c, sansPlace) {
    if (c.conflits.length) {
      return { t: "L'ordre n'est pas tenu",
        q: "Quelqu'un tient du spéculatif pendant qu'un engagement contractuel traîne." };
    }
    if (sansPlace) {
      return { t: sansPlace + (sansPlace > 1 ? " pièces ne sont pas plaçables" : " pièce n'est pas plaçable"),
        q: "Sans responsable, sans charge ou sans date, une pièce est invisible dans la semaine." };
    }
    return { t: "Tout est placé",
      q: "Chaque pièce a son responsable, sa charge et sa date." };
  }

  /* Où en sont les pièces. Une pièce dont la date est passée n'est pas en
   * retard « un peu » : elle est en retard de N jours, et ce nombre est le
   * seul qui appelle un geste. */
  function pireCharge(pieces, sansPlace) {
    var enRetard = PLATEAU.pieces().filter(PLATEAU.estEnRetard);
    if (enRetard.length) {
      return { t: enRetard.length + (enRetard.length > 1 ? " pièces ont passé leur date" : " pièce a passé sa date"),
        q: "Elles occupent encore une semaine échue : tant qu'elles n'ont pas bougé, "
          + "la semaine en cours est fausse pour tout le monde." };
    }
    if (sansPlace) {
      return { t: sansPlace + (sansPlace > 1 ? " pièces ne sont pas plaçables" : " pièce n'est pas plaçable"),
        q: "Sans responsable, sans charge ou sans date, une pièce n'apparaît dans la "
          + "semaine de personne — et personne ne la porte." };
    }
    return { t: pieces.length + (pieces.length > 1 ? " pièces sont placées" : " pièce est placée"),
      q: "Chacune a son responsable, sa charge et sa date. Une pièce de plus se voit "
        + "immédiatement dans la semaine de quelqu'un." };
  }

  /* La capacité de chacun. Une personne au-delà de sa capacité est un délai
   * qu'on a déjà pris sans le dire ; une charge inconnue est pire, parce
   * qu'elle ne se voit pas du tout. */
  function pireGens() {
    var gens = PLATEAU.personnes();
    if (!gens.length) {
      return { t: "Personne au plateau",
        q: "Sans personnes déclarées, affecter une pièce ne réserve rien — et deux "
          + "projets peuvent prendre le même créatif la même semaine." };
    }
    var charges = gens.map(function (pe) {
      return { pe: pe, c: PLATEAU.chargeDe(pe.id, null) }; });

    var pleins = charges.filter(function (x) { return x.c.part > 100; })
      .sort(function (a, b) { return b.c.part - a.c.part; });
    if (pleins.length) {
      var t = pleins[0];
      return { t: pleins.length + (pleins.length > 1 ? " personnes sont au-delà de leur capacité" : " personne est au-delà de sa capacité"),
        q: t.pe.nom.split(" ")[0] + " à " + t.c.part + " % — le dépassement est déjà "
          + "un délai, pris sans que personne l'ait annoncé." };
    }

    var floues = charges.filter(function (x) { return x.c.inconnues > 0; });
    if (floues.length) {
      var n = floues.reduce(function (s, x) { return s + x.c.inconnues; }, 0);
      return { t: n + (n > 1 ? " pièces sans charge estimée" : " pièce sans charge estimée"),
        q: "Elles occupent quelqu'un sans peser dans sa semaine : la capacité affichée "
          + "est plus large que la vraie." };
    }

    var cumuls = charges.filter(function (x) { return x.c.cumul > 0; });
    if (cumuls.length) {
      return { t: cumuls.length + (cumuls.length > 1 ? " personnes portent un cumul" : " personne porte un cumul"),
        q: "Leur capacité est réduite d'autant. Quand le contrôleur et le contrôlé sont "
          + "la même personne, le contrôle remonte d'un cran." };
    }
    return { t: "Chacun tient sa semaine",
      q: "Aucune capacité dépassée, aucune charge inconnue. Une affectation de plus se "
        + "voit immédiatement." };
  }

  function corps(hote) {
    if (mode === "gens") {
      var z = el("div");
      VUE_DIRECTION.rendre(z);
      return z;
    }
    var zone = el("div");
    VUE_PIPELINE.rendre(zone, mode === "charge" ? "charge" : "ordre");
    return zone;
  }

  return { rendre: rendre, titre: "Placer", MODES: MODES };
})();
