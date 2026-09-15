/* efficacite.js — le corpus réfutable, et la discipline du chiffre.
 *
 * Ce corpus ne vient pas des agences. Il vient de bases de cas, d'instituts et
 * d'universitaires — et contrairement aux doctrines créatives, il est
 * réfutable. C'est ce qui le rend citable en réunion, et c'est aussi ce qui
 * oblige à le citer avec ses controverses.
 *
 * D'où la seule règle dure de ce module, et elle n'est pas dans le corpus :
 * UN SEUL CONTRÔLE. Le reste est en lecture.
 *
 * La raison est écrite dans le document lui-même. Il n'existe pas de base de
 * cas francophone africaine, les panels sont rares et chers, les mesures média
 * incomplètes. « Appliquer le 60/40 sans mesure, c'est appliquer une croyance
 * de plus. » Un produit qui lèverait un blocage sur un écart au 60/40
 * importerait un seuil britannique en le déguisant en règle de maison — et
 * referait exactement l'erreur qu'on reproche aux doctrines d'agence.
 *
 * Ce qui est opérant ici, en revanche, l'est complètement : l'échelle de
 * preuve. On n'invente jamais un chiffre, on dit à quel niveau il a été
 * obtenu, et un chiffre sans source se retourne en réunion.
 */

window.EFFICACITE = (function () {
  var el = O.el;

  /* ————————————————————— L'échelle de preuve ————————————————————— */

  /* Quatre niveaux qui descendent. On prend le plus haut atteignable, et on le
   * dit. Le cas maison AFG Bank est le patron du niveau 1 : dix entretiens
   * menés par l'agence, un audit digital, une analyse concurrentielle banque
   * par banque — fabriqué à la main, faute de panel.
   *
   * « Une donnée fabriquée à la main vaut mieux qu'un chiffre emprunté — à
   * condition de dire comment elle a été faite. » */
  var NIVEAUX = [
    { cle: "maison", rang: 1, nom: "Données primaires maison",
      quoi: "terrain, entretiens, comptage, historique client",
      force: "faibles en volume, imbattables en crédibilité" },
    { cle: "voisine", rang: 2, nom: "Catégorie voisine",
      quoi: "ce qu'on sait d'un secteur au comportement comparable, sur le même marché",
      force: "transposable si le comportement l'est vraiment" },
    { cle: "comparable", rang: 3, nom: "Marché comparable",
      quoi: "le même secteur dans un pays proche",
      force: "à condition de nommer le pays et l'écart" },
    { cle: "declaratif", rang: 4, nom: "Déclaratif daté",
      quoi: "ce que disent les gens, présenté comme tel",
      force: "avec la date et la taille de l'échantillon, toujours" },
  ];

  function niveau(cle) {
    return NIVEAUX.filter(function (n) { return n.cle === cle; })[0] || null;
  }

  /* Les chiffres d'un dossier. Ils vivent sur le projet parce qu'ils servent
   * plusieurs pages — le diagnostic, les barrières, la mesure. */
  function chiffres(p) { return (p && p.chiffres) || []; }

  function creerChiffre(p) {
    if (!p.chiffres) p.chiffres = [];
    var c = { id: O.id("CH"), quoi: "", valeur: "", source: "", niveau: null,
      date: null, taille: null, barriere: null };
    p.chiffres.push(c);
    return c;
  }

  function sansSource(p) {
    return chiffres(p).filter(function (c) {
      return !(c.source || "").trim() || !c.niveau;
    });
  }

  /* Le niveau le plus haut atteint sur le dossier. S'il n'y en a aucun, ce
   * n'est pas le diagnostic qui manque : c'est Consulting qui n'est pas la
   * bonne structure. */
  function plafond(p) {
    var cs = chiffres(p).filter(function (c) { return !!c.niveau; });
    if (!cs.length) return null;
    return cs.map(function (c) { return niveau(c.niveau); })
      .filter(Boolean)
      .sort(function (a, b) { return a.rang - b.rang; })[0];
  }

  /* ————————————————————— Marque et activation ————————————————————— */

  /* « Environ 60 % marque, 40 % activation. La proportion varie selon la
   * catégorie. Mais l'inverse — que pratiquent la plupart des annonceurs sous
   * pression trimestrielle — détruit de la valeur. »
   *
   * Affiché, jamais contrôlé, et jamais sans sa réserve. */
  var NATURES = [
    { cle: "marque", nom: "Construction de marque",
      quoi: "émotionnelle, large, lente. Elle agit sur des gens qui n'achètent pas "
        + "maintenant, et ses effets s'accumulent.",
      mesure: "se mesure sur des années" },
    { cle: "activation", nom: "Activation commerciale",
      quoi: "rationnelle, ciblée, immédiate. Elle déclenche un achat maintenant — et "
        + "ne laisse rien derrière elle.",
      mesure: "se mesure en semaines" },
  ];

  var CIBLE_MARQUE = 60;

  var RESERVE = "Le 60/40 vient de la base de cas de l'IPA — Royaume-Uni, États-Unis, "
    + "Australie, grande consommation. Aucune donnée locale ne le corrobore ici : "
    + "c'est une référence, pas un seuil. L'écart se lit, il ne se corrige pas.";

  function repartition(p) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var marque = 0, activation = 0, muets = 0;
    ls.forEach(function (l) {
      if (l.nature === "marque") marque++;
      else if (l.nature === "activation") activation++;
      else muets++;
    });
    /* Les activités du dispositif comptent aussi : une activation vit souvent
     * là, pas dans un livrable. */
    (p.sections.pistes || []).forEach(function (pi) {
      (pi.dispositif || []).forEach(function (a) {
        if (a.nature === "marque") marque++;
        else if (a.nature === "activation") activation++;
        else muets++;
      });
    });
    var classes = marque + activation;
    return {
      marque: marque, activation: activation, muets: muets, classes: classes,
      total: classes + muets,
      partMarque: classes ? Math.round((marque / classes) * 100) : null,
      cible: CIBLE_MARQUE,
      reserve: RESERVE,
      /* Un dossier majoritairement non classé ne dit rien : le taux serait
       * calculé sur une poignée et présenté comme un fait. */
      lisible: classes > 0 && classes >= muets,
    };
  }

  /* ————————————————————— La grille de Sharp ————————————————————— */

  /* Cinq points, en lecture sur une campagne. Deux se branchent sur ce que le
   * produit connaît déjà — les actifs distinctifs vivent aux symboles de la
   * plateforme de marque — et c'est ce qui les rend vrais plutôt que
   * théoriques. */
  function sharp(p) {
    var socle = p.sections.socle || {};
    var actifs = (socle.symboles || []);
    var entrees = ((p.sections.strategie || {}).pointsEntree || p.pointsEntree || []);
    var ms = {};
    (p.livrables || []).forEach(function (l) { if (l.marche) ms[l.marche] = 1; });

    return [
      { cle: "penetration", nom: "Pénétration",
        quoi: "recruter large plutôt que fidéliser étroit",
        lecture: Object.keys(ms).length
          ? Object.keys(ms).length + " marchés couverts par le dossier"
          : "aucun marché déclaré sur les livrables",
        ok: Object.keys(ms).length > 0 },

      { cle: "double-jeopardy", nom: "Double jeopardy",
        quoi: "les petites marques ont moins d'acheteurs, et des acheteurs moins "
          + "fréquents. Régularité statistique, pas défaut de positionnement.",
        lecture: "à lire contre la part de marché — le produit ne la connaît pas",
        ok: null },

      { cle: "disponibilite", nom: "Disponibilité mentale et physique",
        quoi: "être facile à penser au moment de l'achat, et facile à trouver",
        lecture: "sur des marchés à distribution fragmentée, être trouvable pèse "
          + "davantage qu'être aimé — Sharp avant Binet",
        ok: null },

      { cle: "distinctivite", nom: "Distinctivité, pas différenciation",
        quoi: "les gens ne perçoivent pas vos différences produit. Ils reconnaissent "
          + "vos actifs : couleur, forme, son, personnage, typographie.",
        lecture: actifs.length
          ? actifs.length + " actifs distinctifs déclarés : " + actifs.slice(0, 4).join(", ")
          : "aucun actif distinctif à la plateforme de marque",
        ok: actifs.length >= 3 },

      { cle: "points-entree", nom: "Points d'entrée de catégorie",
        quoi: "une marque grandit en étant associée à plus de situations d'achat, pas "
          + "à une seule mieux",
        lecture: entrees.length
          ? entrees.length + " situations d'achat déclarées"
          : "aucune situation d'achat déclarée",
        ok: entrees.length > 0 },
    ];
  }

  /* ————————————————————— L'ESOV ————————————————————— */

  /* « L'excès de part de voix sur la part de marché prédit la croissance. »
   * Avec sa réserve, qui est sévère ici : quand deux ou trois annonceurs
   * occupent l'essentiel du bruit, la part de voix est instable et les seuils
   * britanniques ne transposent pas. */
  function esov(p) {
    var ident = p.sections.identite || {};
    var m = p.marche || {};
    var sov = m.sov !== undefined && m.sov !== null ? Number(m.sov) : null;
    var som = m.som !== undefined && m.som !== null ? Number(m.som) : null;
    if (sov === null || som === null || isNaN(sov) || isNaN(som)) {
      return { connu: false,
        quoi: "part de voix et part de marché ne sont pas au dossier : l'ESOV ne se "
          + "calcule pas, et l'estimer serait inventer un chiffre." };
    }
    var e = sov - som;
    return { connu: true, sov: sov, som: som, esov: e,
      quoi: e > 0
        ? "La marque parle plus fort que son poids (+" + e + " points) : c'est le "
          + "signal de croissance du corpus."
        : e < 0
        ? "La marque parle moins fort que son poids (" + e + " points) : elle rétrécit, "
          + "même sans rien faire de mal."
        : "Part de voix égale à la part de marché : ni gain ni perte attendus.",
      reserve: "Quand deux ou trois annonceurs occupent l'essentiel du bruit, la part "
        + "de voix est instable et les seuils britanniques ne transposent pas "
        + "directement." };
  }

  /* ————————————————————— Le contrôle, et lui seul ————————————————————— */

  function controles(p) {
    var sans = sansSource(p);
    var cs = chiffres(p);
    if (!cs.length) return [];
    return [{ quoi: "Chaque chiffre porte sa source et son niveau",
      ok: sans.length === 0, poids: 4,
      cout: sans.length + (sans.length > 1 ? " chiffres n'ont" : " chiffre n'a")
        + " ni source ni niveau de preuve. Un chiffre sans source se retourne en "
        + "réunion, et emporte avec lui le reste du diagnostic." }];
  }

  /* La preuve qu'un corpus déclaré réclame, au format d'ECOLES. */
  function preuve(p, exige, e) {
    if (exige === "repartition") {
      var r = repartition(p);
      return { ok: r.lisible, quoi: e.preuve,
        cout: r.total
          ? r.muets + " livrables sur " + r.total + " ne disent pas s'ils construisent "
            + "la marque ou déclenchent un achat : la répartition serait calculée sur "
            + "une poignée et présentée comme un fait."
          : "aucun livrable au dossier : il n'y a rien à répartir" };
    }
    if (exige === "distinctivite") {
      var s = sharp(p);
      var d = s.filter(function (x) { return x.cle === "distinctivite"; })[0];
      return { ok: !!d.ok, quoi: e.preuve,
        cout: "Les gens ne perçoivent pas vos différences produit : ils reconnaissent "
          + "vos actifs. Sans trois actifs distinctifs à la plateforme de marque, il "
          + "n'y a rien à rendre reconnaissable." };
    }
    return null;
  }

  /* ————————————————————— Les pages de la structure Consulting ————————————————————— */

  function page(p, type) {
    var cs = chiffres(p);

    if (type === "diagnostic") {
      if (!cs.length) return null;
      var pl = plafond(p);
      return { titre: "Diagnostic",
        corps: pl ? "Niveau de preuve atteint : " + pl.nom.toLowerCase() + " — " + pl.quoi + "." : null,
        blocs: cs.slice(0, 6).map(function (c) {
          var n = niveau(c.niveau);
          return { t: c.quoi || "sans intitulé",
            v: c.valeur + (c.source ? "  ·  " + c.source : "")
              + (n ? "  ·  niveau " + n.rang : "  ·  SANS NIVEAU") };
        }) };
    }

    if (type === "barrieres") {
      var bs = cs.filter(function (c) { return !!c.barriere; });
      if (!bs.length) return null;
      return { titre: "Les trois barrières",
        blocs: bs.slice(0, 3).map(function (c) {
          return { t: c.barriere, v: c.quoi + "  ·  " + c.valeur };
        }) };
    }

    if (type === "phases") {
      var acts = [];
      (p.sections.pistes || []).forEach(function (pi) {
        (pi.dispositif || []).forEach(function (a) { acts.push(a); });
      });
      if (!acts.length) return null;
      return { titre: "Plan d'activation",
        blocs: acts.slice(0, 6).map(function (a) {
          return { t: a.nom || a.quoi || "activité",
            v: [a.productionAvant ? "production avant le " + O.jourCourt(a.productionAvant) : null,
                a.nature ? (a.nature === "marque" ? "construction de marque" : "activation") : null]
              .filter(Boolean).join("  ·  ") || "—" };
        }) };
    }

    if (type === "mesure") {
      var kpis = ((p.sections.brief || {}).kpis || []);
      if (!kpis.length) return null;
      return { titre: "Mesure et indicateurs",
        corps: "Poser la fréquence de reporting ici évite qu'elle soit imposée plus tard.",
        blocs: kpis.map(function (k) { return { t: "Indicateur", v: k }; }) };
    }

    return null;
  }

  /* ————————————————————— Le bloc de lecture ————————————————————— */

  /* Tout ce qui suit est une lecture. Aucun de ces nombres ne lève de blocage,
   * et chacun porte sa réserve écrite à l'écran — c'est la condition pour
   * emprunter un corpus sans refaire l'erreur qu'on reproche aux doctrines. */
  function bloc(p) {
    var r = repartition(p);
    var s = sharp(p);
    var e = esov(p);
    var pl = plafond(p);

    return el("div.eff", {},
      el("div.eff-t", {}, "LECTURE D'EFFICACITÉ"),
      el("p.eff-q", {}, "Un corpus réfutable se cite avec ses controverses. Rien ici ne "
        + "lève de blocage : ce sont des lectures, et chacune porte sa réserve."),

      el("div.eff-g", {},
        /* La répartition. */
        el("div.eff-c", {},
          el("span.effc-t", {}, "MARQUE / ACTIVATION"),
          r.lisible
            ? el("span.effc-n", {}, r.partMarque + " / " + (100 - r.partMarque))
            : el("span.effc-n.sans", {}, "non lisible"),
          el("span.effc-x", {}, r.lisible
            ? "référence : " + r.cible + " / " + (100 - r.cible)
            : r.muets + " sur " + r.total + " ne déclarent pas leur nature"),
          el("p.effc-r", {}, r.reserve)),

        /* L'échelle de preuve. */
        el("div.eff-c", {},
          el("span.effc-t", {}, "NIVEAU DE PREUVE"),
          pl ? el("span.effc-n", {}, String(pl.rang)) : el("span.effc-n.sans", {}, "—"),
          el("span.effc-x", {}, pl ? pl.nom : "aucun chiffre ne porte de niveau"),
          el("p.effc-r", {}, pl ? pl.force
            : "Si aucun des quatre niveaux n'est atteignable, ce n'est pas le "
              + "diagnostic qui manque : c'est Consulting qui n'est pas la bonne structure.")),

        /* L'ESOV. */
        el("div.eff-c", {},
          el("span.effc-t", {}, "ESOV"),
          e.connu ? el("span.effc-n", {}, (e.esov > 0 ? "+" : "") + e.esov)
            : el("span.effc-n.sans", {}, "—"),
          el("span.effc-x", {}, e.connu ? e.quoi : "non calculable"),
          el("p.effc-r", {}, e.connu ? e.reserve : e.quoi))),

      /* Sharp, en cinq lignes. */
      el("div.eff-sharp", {},
        el("span.effc-t", {}, "LA GRILLE DE SHARP"),
        el("ul.effs-l", {}, s.map(function (x) {
          return el("li.effs" + (x.ok === true ? ".ok" : x.ok === false ? ".non" : ""), {},
            el("span.effs-n", {}, x.nom),
            el("span.effs-q", {}, x.quoi),
            el("span.effs-x", {}, x.lecture));
        })),
        el("p.effc-r", {}, "Les données viennent massivement du Royaume-Uni, des "
          + "États-Unis et de l'Australie, sur des catégories de grande consommation. "
          + "Sur des marchés à distribution fragmentée, être trouvable pèse davantage "
          + "qu'être aimé — Sharp avant Binet.")));
  }

  return { NIVEAUX: NIVEAUX, NATURES: NATURES, CIBLE_MARQUE: CIBLE_MARQUE, RESERVE: RESERVE,
    niveau: niveau, chiffres: chiffres, creerChiffre: creerChiffre,
    sansSource: sansSource, plafond: plafond,
    repartition: repartition, sharp: sharp, esov: esov,
    controles: controles, preuve: preuve, page: page, bloc: bloc };
})();
