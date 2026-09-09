/* vue-placer.js — qui fait quoi, dans quel ordre, avec quelle capacité.
 *
 * Décider et placer sont deux gestes différents. Décider, c'est trancher sur
 * un livrable. Placer, c'est répartir du temps humain — et ça se fait sur la
 * totalité des dossiers, jamais dossier par dossier.
 *
 * Trois manières de servir cette intention :
 *   l'ordre      ce qui passe avant, et pourquoi — ferme, engagé, spéculatif
 *   la charge    où en sont les livrables, par étage de production
 *   les gens     la capacité de chacun, et ce qu'on peut lui protéger
 */

window.VUE_PLACER = (function () {
  var el = O.el;
  var mode = "ordre";

  var MODES = [
    { cle: "ordre", nom: "PRIORITÉS", quoi: "ce qui passe avant, et pourquoi" },
    { cle: "charge", nom: "PLAN DE CHARGE", quoi: "où en sont les livrables" },
    { cle: "gens", nom: "ÉQUIPE", quoi: "la capacité de chacun" },
    { cle: "livraisons", nom: "LIVRAISONS", quoi: "ce qui est dû et n'est pas arrivé" },
  ];

  function rendre(hote, arg) {
    if (arg && MODES.some(function (m) { return m.cle === arg; })) mode = arg;

    hote.className = "zone";
    O.vider(hote);

    var pieces = PRODUCTION.toutesLesPieces();
    var c = PRIORITE.conflits();
    var sansPlace = pieces.filter(function (x) {
      return !x.l.responsable || !x.l.estime || !x.l.remise; }).length;

    var souffrance = TRACE.enSouffrance();

    var p = mode === "livraisons" ? pireLivraisons(souffrance)
      : mode === "gens" ? pireGens()
      : mode === "charge" ? pireCharge(pieces, sansPlace)
      : pireOrdre(c, sansPlace);

    hote.appendChild(el("div.dc", {},
      el("div.dc-tete", {},
        el("div.dct-c", {},
          el("h2", {}, p.t),
          el("div.dct-q", {}, p.q))),

      el("div.dc-modes", {}, MODES.map(function (m) {
        var n = m.cle === "ordre" ? c.conflits.length
          : m.cle === "charge" ? sansPlace
          : m.cle === "livraisons" ? souffrance.length : 0;
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

  /* L'ordre et la charge parlent de livrables ; les gens parlent de capacité.
   * Annoncer « 3 livrables ne sont pas plaçables » au-dessus des gens, c'est
   * répondre à côté de la question qu'on vient de poser. */
  function pireOrdre(c, sansPlace) {
    if (c.conflits.length) {
      return { t: "L'ordre n'est pas tenu",
        q: "Quelqu'un tient du spéculatif pendant qu'un engagement contractuel traîne." };
    }
    if (sansPlace) {
      return { t: sansPlace + (sansPlace > 1 ? " livrables ne sont pas plaçables" : " livrable n'est pas plaçable"),
        q: "Sans responsable, sans charge ou sans date, un livrable est invisible dans la semaine." };
    }
    return { t: "Tout est placé",
      q: "Chaque livrable a son responsable, sa charge et sa date." };
  }

  /* Où en sont les livrables. Un livrable dont la date est passée n'est pas en
   * retard « un peu » : elle est en retard de N jours, et ce nombre est le
   * seul qui appelle un geste. */
  function pireCharge(pieces, sansPlace) {
    /* Avant le retard, la relançabilité. Un livrable sans date n'est jamais
     * « en retard » — il est hors du compte, et c'est pire : personne ne le
     * réclame et personne n'est en défaut. Le dire avant tout le reste évite
     * de relancer quelqu'un sur ce qui n'est pas exigible. */
    var t = TRACE.tous();
    if (t.total && t.relancables * 3 < t.total) {
      return { t: t.relancables + " livrables sur " + t.total + " sont relançables",
        q: "Les autres n'ont pas de date de remise, ou pas de responsable : rien n'est "
          + "exigible dessus, donc rien n'apparaît en retard. Relancer là-dessus serait "
          + "une impression, pas un constat." };
    }
    var enRetard = PLATEAU.pieces().filter(PLATEAU.estEnRetard);
    if (enRetard.length) {
      return { t: enRetard.length + (enRetard.length > 1 ? " livrables ont passé leur date" : " livrable a passé sa date"),
        q: "Ils occupent encore une semaine échue : tant qu'ils n'ont pas bougé, "
          + "la semaine en cours est fausse pour tout le monde." };
    }
    if (sansPlace) {
      return { t: sansPlace + (sansPlace > 1 ? " livrables ne sont pas plaçables" : " livrable n'est pas plaçable"),
        q: "Sans responsable, sans charge ou sans date, un livrable n'apparaît dans la "
          + "semaine de personne — et personne ne le porte." };
    }
    return { t: pieces.length + (pieces.length > 1 ? " livrables sont placés" : " livrable est placé"),
      q: "Chacun a son responsable, sa charge et sa date. Un livrable de plus se voit "
        + "immédiatement dans la semaine de quelqu'un." };
  }

  /* La capacité de chacun. Une personne au-delà de sa capacité est un délai
   * qu'on a déjà pris sans le dire ; une charge inconnue est pire, parce
   * qu'elle ne se voit pas du tout. */
  function pireGens() {
    var gens = PLATEAU.personnes();
    if (!gens.length) {
      return { t: "Personne au plateau",
        q: "Sans personnes déclarées, affecter un livrable ne réserve rien — et deux "
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
      return { t: n + (n > 1 ? " livrables sans charge estimée" : " livrable sans charge estimée"),
        q: "Ils occupent quelqu'un sans peser dans sa semaine : la capacité affichée "
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

  /* Les livraisons. Le titre nomme ce qui coûte le plus, jamais le total :
   * « 47 livrables en souffrance » n'appelle aucun geste, « 12 artworks
   * annoncés faits n'existent pas » en appelle un, et tout de suite. */
  function pireLivraisons(souffrance) {
    if (!souffrance.length) {
      return { t: "Rien en souffrance",
        q: "Tout ce qui est dû est arrivé, ou n'est pas encore exigible." };
    }
    var ment = souffrance.filter(function (x) { return x.s.cle === "dement"; }).length;
    if (ment) {
      return { t: ment + (ment > 1 ? " livraisons annoncées faites n'existent pas" : " livraison annoncée faite n'existe pas"),
        q: "Le tableau du client sert de preuve et n'en est pas une : l'écart se "
          + "découvre à l'impression, pas avant." };
    }
    var tard = souffrance.filter(function (x) { return x.s.cle === "depasse"; });
    if (tard.length) {
      return { t: tard.length + (tard.length > 1 ? " remises sont passées" : " remise est passée"),
        q: "La plus ancienne depuis " + tard[0].s.jours + " jours — « " + tard[0].l.nom + " »." };
    }
    var b = TRACE.bilan(souffrance.map(function (x) { return x.l; }));
    return TRACE.phrase(b);
  }

  function corps(hote) {
    if (mode === "livraisons") {
      var zl = el("div");
      VUE_LIVRAISONS.rendre(zl);
      return zl;
    }
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
