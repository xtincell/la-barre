/* territoire.js — l'espace que l'insight ouvre, et où plusieurs concepts vivent.
 *
 * Le produit passait directement de l'insight aux pistes. C'est un maillon de
 * trop sauté, et il se paie de deux façons.
 *
 * D'abord, une piste ne remontait à rien. Deux propositions dans le même
 * dossier pouvaient traiter deux problèmes différents sans que rien ne le
 * dise : elles avaient chacune leur titre, leur concept, leur axe, et aucune
 * racine commune à opposer. C'est le cas maison de l'anniversaire télécom —
 * quatre-vingt-sept pages, trois axes également finis, trois baselines donc
 * trois promesses. Le client a adoré, et il a recomposé.
 *
 * Ensuite, la durée. « Un insight qui ne donne qu'un seul concept possible
 * n'est pas un insight : c'est déjà une idée, arrivée trop tôt. » Sans objet
 * intermédiaire, rien ne permet de constater qu'un territoire n'a produit
 * qu'une route — donc qu'il n'a pas de durée, donc que la plateforme qu'on
 * vend au client tiendra une campagne et pas trois.
 *
 * Le territoire porte aussi ce que son école exige de lui : la convention et
 * ses trois visuels pour Disruption, le chemin de réduction pour Brutal
 * Simplicity. C'est l'étage que ces écoles gouvernent, c'est donc ici que leur
 * preuve se range.
 */

window.TERRITOIRE = (function () {
  var el = O.el;

  var CHAMPS = [
    { cle: "nom", nom: "Nom du territoire", court: "NOM", type: "texte", requis: true,
      aide: "Court, retenable. « La banque de l'année scolaire entière. »",
      cout: "Un territoire sans nom ne se cite pas en réunion, donc il ne survit "
        + "pas à la séance où il a été présenté." },

    { cle: "quoi", nom: "L'espace qu'il ouvre", court: "CE QU'IL OUVRE",
      type: "long", requis: true,
      aide: "Ce qu'on peut y raconter, et sur plusieurs vagues. Pas une idée : un espace.",
      cout: "Sans espace décrit, la première piste qui sort devient le territoire — "
        + "et les suivantes n'ont plus de place où exister." },

    { cle: "insightId", nom: "L'insight dont il découle", court: "RACINE",
      type: "insight", requis: true,
      aide: "Un territoire sans racine est une intuition. Avec, il est défendable.",
      cout: "La piste qui en sort ne remontera à rien : impossible de dire si elle "
        + "traite le même problème que les autres." },
  ];

  /* ————————————————————— Lire ————————————————————— */

  function liste(p) { return (p && p.territoires) || []; }

  function de(p, id) {
    return liste(p).filter(function (t) { return t.id === id; })[0] || null;
  }

  function creer(p, insightId) {
    if (!p.territoires) p.territoires = [];
    var t = {
      id: O.id("TR"), nom: "", quoi: "",
      insightId: insightId || null,
      ecole: null,
      convention: null,
      reduction: null,
      cree_le: new Date().toISOString(),
    };
    p.territoires.push(t);
    return t;
  }

  /* Les pistes vives d'un territoire. Une piste écartée ne compte pas : elle
   * n'occupe plus l'espace, elle témoigne qu'on y est passé. */
  function pistes(p, t) {
    return ((p.sections || {}).pistes || []).filter(function (pi) {
      return pi.territoireId === t.id && pi.statut !== "ecartee";
    });
  }

  /* La racine d'une piste, en remontant par son territoire. C'est la fonction
   * que le test d'une minute appelle, et la seule raison pour laquelle le
   * territoire est un objet plutôt qu'un paragraphe. */
  function racine(p, pi) {
    if (!pi || !pi.territoireId) return null;
    var t = de(p, pi.territoireId);
    if (!t || !t.insightId) return null;
    return window.INSIGHT ? INSIGHT.de(p, t.insightId) : null;
  }

  /* ————————————————————— La convention ————————————————————— */

  /* Ce que toute la catégorie tient pour acquis. Elle se démontre, elle ne se
   * suppose pas : « si vous ne pouvez pas la montrer en trois visuels de
   * concurrents, vous ne l'avez pas identifiée ». */
  /* La calibration de la maison, avec son repli.
   *
   * La doctrine est du métier et vit ici ; ce que la maison en règle vit dans
   * maison.js. Une maison qui n'écrit pas la clé garde la valeur d'origine :
   * le produit tourne, il ne se tait pas. */
  function regle(cle, defaut) {
    var d = (window.MAISON && MAISON.doctrine) || {};
    return d[cle] === undefined || d[cle] === null ? defaut : d[cle];
  }

  var PREUVES_CONVENTION = regle("preuvesConvention", 3);

  function convention(t) {
    var c = (t && t.convention) || {};
    var preuves = c.preuves || [];
    return {
      enonce: (c.enonce || "").trim(),
      preuves: preuves,
      prouvee: !!(c.enonce || "").trim() && preuves.length >= PREUVES_CONVENTION,
      manque: Math.max(0, PREUVES_CONVENTION - preuves.length),
    };
  }

  /* ————————————————————— L'état ————————————————————— */

  function etat(p, t) {
    if (!t) return { nom: "aucun territoire", ton: "alerte",
      quoi: "les pistes ne remonteront à rien" };

    if (!(t.quoi || "").trim() && !(t.nom || "").trim()) {
      return { nom: "territoire vide", ton: "alerte",
        quoi: "l'objet existe, l'espace qu'il ouvre n'est pas décrit" };
    }
    if (!t.insightId) {
      return { nom: "territoire sans racine", ton: "alerte",
        quoi: "aucun insight derrière : c'est une intuition, pas une position — "
          + "elle ne se défend qu'au goût" };
    }
    var n = pistes(p, t).length;
    if (!n) {
      return { nom: "territoire inexploré", ton: "attente",
        quoi: "aucune piste ne l'occupe encore" };
    }
    if (n === 1 && p.gabarit !== "cycle") {
      return { nom: "territoire à un concept", ton: "attente",
        quoi: "une seule piste en sort : un insight qui ne donne qu'un concept "
          + "possible est déjà une idée, arrivée trop tôt — et la plateforme n'a "
          + "pas de durée" };
    }
    return { nom: "territoire tenu", ton: "vert",
      quoi: n + " concepts y vivent, tous sur la même racine" };
  }

  function controles(p, t) {
    var n = pistes(p, t).length;
    var out = CHAMPS.filter(function (c) { return c.requis; }).map(function (c) {
      var v = t[c.cle];
      return { quoi: c.nom, ok: !!(v && String(v).trim()), poids: 4, cout: c.cout };
    });
    out.push({ quoi: "Plusieurs concepts y vivent", ok: n > 1 || p.gabarit === "cycle", poids: 3,
      cout: "un seul concept : le territoire n'a pas de durée, et la plateforme "
        + "qu'on vend tiendra une campagne, pas trois" });

    /* La preuve que l'école réclame, quand une école est déclarée. */
    if (t.ecole === "disruption") {
      var c = convention(t);
      out.push({ quoi: "La convention, prouvée en " + PREUVES_CONVENTION + " visuels",
        ok: c.prouvee, poids: 5,
        cout: !c.enonce
          ? "Disruption commence par la convention. Sans elle, il n'y a rien à casser."
          : c.manque + " visuel" + (c.manque > 1 ? "s" : "") + " de concurrent manque"
            + (c.manque > 1 ? "nt" : "") + " : une convention qu'on ne peut pas montrer "
            + "est une convention supposée" });
    }
    if (t.ecole === "brutal-simplicite") {
      var r = t.reduction || {};
      out.push({ quoi: "Le chemin de réduction", ok: !!(r.longue && r.dix && r.six), poids: 5,
        cout: "Brutal Simplicity se vend mal aux clients qui achètent au volume de "
          + "raisonnement. Sans les trois versions, une reco de trois slides passe "
          + "pour du travail bâclé." });
    }
    return out;
  }

  /* ————————————————————— Le chemin de réduction ————————————————————— */

  /* Les trois versions du problème, conservées. « Ce qui subsiste juste avant
   * la rupture est la campagne. » Même rendu que les trois passes de l'insight :
   * c'est le même geste, sur un autre objet. */
  function reduction(t) {
    var r = (t && t.reduction) || {};
    return INSIGHT.chemin([
      { nom: "La version longue", texte: r.longue,
        attendu: "le problème tel qu'il a été compris, sans limite de mots",
        mesure: "≈ 40 mots" },
      { nom: "Dix mots", texte: r.dix,
        attendu: "première coupe. On perd les nuances de contexte — elles ne manquent presque jamais.",
        mesure: "10 mots" },
      { nom: "Six mots", texte: r.six,
        attendu: "la coupe qui fait mal : ce qui était décoratif dans notre propre compréhension",
        mesure: "6 mots" },
    ]);
  }

  return { CHAMPS: CHAMPS, PREUVES_CONVENTION: PREUVES_CONVENTION,
    liste: liste, de: de, creer: creer, pistes: pistes, racine: racine,
    convention: convention, etat: etat, controles: controles, reduction: reduction };
})();
