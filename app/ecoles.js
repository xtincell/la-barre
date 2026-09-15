/* ecoles.js — où chercher l'idée, et ce qu'il faut alors pouvoir montrer.
 *
 * Une école de pensée n'est pas un style graphique ni une façon de présenter.
 * C'est une réponse à une seule question — où se trouve la bonne idée ? — et
 * tout le reste en découle : la méthode, les documents, la structure du deck.
 * Deux agences peuvent recevoir le même brief et produire deux campagnes
 * irréconciliables : elles ne cherchent pas au même endroit.
 *
 * « En agence, on te dira ça ne marche pas sans te dire selon quel critère.
 * Connaître les écoles, c'est connaître le critère à l'avance. »
 *
 * Deux choses rendent ce module opérant plutôt que décoratif.
 *
 * LA PREUVE. Chaque école attend une preuve différente, et c'est une exigence
 * de dossier, pas une posture : Disruption veut la convention montrée en trois
 * visuels de concurrents, Brutal Simplicity veut le chemin de réduction,
 * Account Planning veut un insight qui passe le test, Brand Key veut ses neuf
 * couches et son discriminator. Déclarer une école engendre donc ce que le
 * dossier doit porter — et le produit sait déjà afficher une recevabilité.
 *
 * L'ÉTAGE. La règle naïve dit « ne pas mélanger les écoles ». Elle est fausse,
 * et le cas maison NSIA le prouve : Account Planning pour l'insight, Disruption
 * pour le territoire, Ehrenberg-Bass pour la diffusion — aucune contradiction.
 * La règle juste est celle-ci : le mélange tient quand chaque école gouverne un
 * étage différent. Et la nuance qui sauve le contrôle de la bêtise : deux
 * écoles au même étage ne se neutralisent pas si elles partagent la même
 * racine. Elles se neutralisent quand chacune apporte la sienne.
 *
 * Ce qu'on teste n'est donc jamais l'école. C'est la racine — et ça vit dans
 * RECO.racines().
 */

window.ECOLES = (function () {
  var el = O.el;

  /* Les trois étages qu'une école peut gouverner. */
  var ETAGES = [
    { cle: "insight", nom: "L'insight", quoi: "où l'on cherche la vérité sur les gens" },
    { cle: "territoire", nom: "Le territoire", quoi: "où l'on cherche l'espace à occuper" },
    { cle: "diffusion", nom: "La diffusion", quoi: "comment on décide que ça a marché" },
  ];

  /* ————————————————————— Les douze écoles ————————————————————— */

  /* La colonne « preuve » est la seule qui engage le dossier. Les autres
   * situent ; celle-là réclame. */
  var ECOLES = [
    { cle: "usp", nom: "L'USP", maison: "Ted Bates · Rosser Reeves", annee: 1961,
      ou: "dans le produit", effort: "isoler",
      preuve: "un attribut différenciant du produit",
      exige: "attribut",
      principe: "Chaque publicité fait une proposition précise : achetez ceci, vous "
        + "obtenez cela. Unique, et assez forte pour déplacer des gens.",
      limite: "Sur les marchés de parité, où les produits sont objectivement "
        + "identiques, l'USP ne trouve rien. C'est cette impasse qui a fait naître "
        + "toutes les écoles suivantes.",
      local: "Les catégories sont moins saturées ici : de vraies différences produit "
        + "existent encore. Ne pas importer les diagnostics d'un marché mûr.",
      etages: ["insight", "territoire"] },

    { cle: "brand-image", nom: "La Brand Image", maison: "Ogilvy", annee: 1963,
      ou: "dans la marque", effort: "construire",
      preuve: "une cohérence tenue dans la durée",
      exige: "socle",
      principe: "On ne vend pas un produit, on construit une personnalité qui vendra "
        + "tous les produits à venir.",
      limite: "Le brief cesse d'être ponctuel — ce qui est un gain, et un coût : rien "
        + "ne se juge plus sur une seule campagne.",
      etages: ["territoire"] },

    { cle: "creative-revolution", nom: "La Creative Revolution", maison: "DDB · Bill Bernbach", annee: 1959,
      ou: "dans l'exécution", effort: "exécuter",
      preuve: "le travail lui-même",
      exige: null,
      principe: "L'exécution n'est pas l'habillage de l'idée : elle EST l'idée. Une "
        + "même proposition, mal exécutée, ne vend rien.",
      limite: "Pas de méthode formelle. Le travail arbitre : libérateur pour un bon "
        + "créatif, brutal pour un créatif moyen — rien derrière quoi s'abriter.",
      etages: ["territoire"] },

    { cle: "inherent-drama", nom: "L'Inherent Drama", maison: "Leo Burnett", annee: 1935,
      ou: "dans le produit", effort: "révéler",
      preuve: "le produit, montré",
      exige: "attribut",
      principe: "Chaque produit contient un drame naturel, inscrit dans sa fabrication "
        + "ou son usage. On le trouve et on le met en scène ; on ne plaque pas une "
        + "histoire par-dessus.",
      limite: "Demande d'interroger le produit avant le consommateur — donc du temps "
        + "en usine, que le délai ne donne pas toujours.",
      etages: ["insight", "territoire"] },

    { cle: "account-planning", nom: "L'Account Planning", maison: "BMP / JWT", annee: 1968,
      ou: "dans le consommateur", effort: "écouter",
      preuve: "un insight qui passe le test",
      exige: "insight",
      principe: "Quelqu'un dans l'agence représente le consommateur dans la pièce. Pas "
        + "le client, pas la création. Son livrable est l'insight.",
      limite: "Le poste n'existe pas dans beaucoup d'agences d'Afrique francophone. La "
        + "fonction, elle, existe toujours — absorbée par le commerce ou la création, "
        + "sans être nommée ni payée.",
      etages: ["insight"] },

    { cle: "truth-well-told", nom: "Truth Well Told", maison: "McCann", annee: 1912,
      ou: "dans la vérité", effort: "raconter",
      preuve: "de la recherche et des verbatim datés",
      exige: "sources",
      principe: "La publicité ne fabrique pas, elle révèle. Les deux moitiés comptent : "
        + "une vérité mal racontée ne vend rien, une belle histoire fausse s'effondre.",
      limite: "Des campagnes longues et pesées. Le rythme d'un brief de dix jours ne "
        + "s'y prête pas.",
      etages: ["insight", "territoire"] },

    { cle: "disruption", nom: "La Disruption", maison: "TBWA · Jean-Marie Dru", annee: 1996,
      ou: "dans la convention", effort: "casser",
      preuve: "la convention, montrée en trois visuels de concurrents",
      exige: "convention",
      principe: "Trois temps : la convention que toute la catégorie tient pour acquis, "
        + "la rupture, et la vision que la rupture ouvre.",
      limite: "La rupture pour la rupture. Une convention cassée sans vision derrière "
        + "produit un coup, pas une marque — et le troisième temps est celui qu'on "
        + "saute le plus souvent.",
      etages: ["territoire"] },

    { cle: "brutal-simplicite", nom: "Brutal Simplicity of Thought", maison: "M&C Saatchi", annee: 1995,
      ou: "dans la formulation", effort: "réduire",
      preuve: "le chemin de réduction — les trois versions conservées",
      exige: "reduction",
      principe: "Réduire le problème avant de chercher la solution. La solution hérite "
        + "de la simplicité du problème. Ce qui subsiste juste avant la rupture est la "
        + "campagne.",
      limite: "Se vend mal aux clients qui achètent au volume de raisonnement. Une reco "
        + "de trois slides passe pour du travail bâclé — la parade est de montrer le "
        + "chemin de réduction.",
      etages: ["territoire"] },

    { cle: "lovemarks", nom: "Les Lovemarks", maison: "Saatchi & Saatchi · Kevin Roberts", annee: 2004,
      ou: "dans l'attachement", effort: "attacher",
      preuve: "de l'affect documenté sur le terrain",
      exige: "sources",
      principe: "Au-dessus des marques respectées, les marques aimées : mystère, "
        + "sensualité, intimité.",
      limite: "Largement critiquée comme relevant du discours d'agence plus que de la "
        + "méthode vérifiable. L'intuition n'est pas fausse ; le problème est "
        + "méthodologique, pas empirique.",
      etages: ["territoire"] },

    { cle: "big-ideal", nom: "The Big Ideal", maison: "Ogilvy", annee: 2005,
      ou: "dans la tension culturelle", effort: "croiser",
      preuve: "une tension culturelle documentée, croisée à la marque",
      exige: "insight-culture",
      principe: "L'idée juste est à l'intersection d'une tension culturelle et de la "
        + "meilleure version possible de la marque. Elle s'écrit comme une croyance : "
        + "« nous croyons que… ».",
      limite: "Outil de plateforme, pas de campagne. Il décide ce que la marque fera "
        + "pendant cinq ans, pas ce qu'elle dira le mois prochain.",
      etages: ["insight", "territoire"] },

    { cle: "cultural-strategy", nom: "La Cultural Strategy", maison: "Douglas Holt", annee: 2004,
      ou: "dans la contradiction sociale", effort: "analyser",
      preuve: "une analyse historique et sociale, avant l'analyse consommateur",
      exige: "insight-culture",
      principe: "Les marques iconiques gagnent en résolvant une contradiction sociale "
        + "que la société n'arrive pas à traiter, en fournissant un mythe qui la répare.",
      limite: "Les sources changent : presse, musique, terrain, plutôt que panels. Le "
        + "planning cesse d'être une lecture d'études pour devenir une lecture de société.",
      local: "Particulièrement pertinente ici : les sociétés en transformation rapide "
        + "produisent des contradictions vives, et presque personne ne les travaille "
        + "sérieusement. C'est une ouverture, pas un constat d'échec.",
      etages: ["insight"] },

    { cle: "brand-key", nom: "Le Brand Key", maison: "Unilever", annee: 2000,
      ou: "dans la structure", effort: "vérifier",
      preuve: "les neuf couches remplies, discriminator compris",
      exige: "brand-key",
      principe: "Une structure en couches concentriques qui garantit que rien n'a été "
        + "oublié. Outil de discipline, jamais d'inspiration.",
      limite: "Sur un compte FMCG international, ce document existe déjà et vous sera "
        + "remis. La liberté créative s'exerce à l'intérieur de son cadre.",
      etages: ["territoire"] },

    /* ————— Les deux corpus d'efficacité —————
     *
     * Ils ne viennent pas des agences : ils viennent de bases de cas, d'instituts
     * et d'universitaires, et contrairement aux doctrines créatives ils sont
     * RÉFUTABLES. Une agence qui applique le 60/40 applique Binet — elle n'a
     * pas inventé une pensée maison. */
    { cle: "binet-field", nom: "Binet & Field", maison: "IPA · adam&eveDDB", annee: 2013,
      ou: "dans la mesure", effort: "répartir",
      preuve: "une répartition marque / activation, et sa réserve écrite",
      exige: "repartition", corpus: true,
      principe: "Deux mécaniques : la construction de marque, émotionnelle, large et "
        + "lente ; l'activation, rationnelle, ciblée et immédiate. Environ 60 / 40.",
      limite: "L'erreur la plus coûteuse du métier : mesurer la marque avec les "
        + "indicateurs de l'activation, puis conclure qu'elle ne marche pas.",
      local: "Pas de base de cas francophone africaine, panels rares, mesures média "
        + "incomplètes. Appliquer le 60/40 sans mesure, c'est appliquer une croyance "
        + "de plus.",
      etages: ["diffusion"] },

    { cle: "ehrenberg-bass", nom: "Ehrenberg-Bass · Byron Sharp", maison: "Ehrenberg-Bass Institute", annee: 2010,
      ou: "dans la disponibilité", effort: "recruter",
      preuve: "les actifs distinctifs, et les points d'entrée de catégorie",
      exige: "distinctivite", corpus: true,
      principe: "Les marques grandissent en recrutant plus d'acheteurs occasionnels, "
        + "pas en fidélisant les gros consommateurs. La fidélité est une conséquence de "
        + "la taille, pas sa cause.",
      limite: "Les données viennent massivement du Royaume-Uni, des États-Unis et de "
        + "l'Australie, sur des catégories de grande consommation. La transposition "
        + "n'est pas acquise.",
      local: "Sur des marchés à distribution fragmentée et largement informelle, être "
        + "trouvable pèse davantage qu'être aimé. Sharp avant Binet.",
      etages: ["diffusion"] },
  ];

  function de(cle) {
    return ECOLES.filter(function (e) { return e.cle === cle; })[0] || null;
  }

  function parEtage(etage) {
    return ECOLES.filter(function (e) { return e.etages.indexOf(etage) !== -1; });
  }

  /* ————————————————————— Ce qu'une école déclarée réclame ————————————————————— */

  /* Le cœur du module. Déclarer une école n'est pas une préférence de style :
   * c'est s'engager à porter sa preuve. Chaque exigence se vérifie sur le
   * dossier, et rend un contrôle au format des autres grilles du produit. */
  function preuve(p, cle, etage) {
    var e = de(cle);
    if (!e || !e.exige) return null;
    var ts = window.TERRITOIRE ? TERRITOIRE.liste(p) : [];
    var is = window.INSIGHT ? INSIGHT.liste(p) : [];
    var socle = p.sections.socle || {};

    if (e.exige === "insight") {
      var bon = is.filter(function (i) { return INSIGHT.verdict(i).cle === "insight"; });
      return { ok: bon.length > 0, quoi: e.preuve,
        cout: "Account Planning a un seul livrable : l'insight. Sans énoncé qui passe "
          + "les trois questions, l'école est déclarée et rien ne la porte." };
    }

    if (e.exige === "insight-culture") {
      var cult = is.filter(function (i) { return i.couche === "culture"; });
      return { ok: cult.length > 0, quoi: e.preuve,
        cout: "Cette école cherche dans la société, pas dans les comportements. Sans "
          + "insight de couche culture, on tient un insight consommateur habillé en "
          + "sujet de société — et la marque n'aura pas le droit d'en parler." };
    }

    if (e.exige === "convention") {
      var prouvee = ts.some(function (t) { return TERRITOIRE.convention(t).prouvee; });
      var enoncee = ts.some(function (t) { return !!TERRITOIRE.convention(t).enonce; });
      return { ok: prouvee, quoi: e.preuve,
        cout: !enoncee
          ? "Disruption commence par la convention. Sans elle, il n'y a rien à casser "
            + "— et la rupture devient de la provocation."
          : "Une convention qu'on ne peut pas montrer en trois visuels de concurrents "
            + "n'est pas identifiée : elle est supposée." };
    }

    if (e.exige === "reduction") {
      var red = ts.some(function (t) {
        var r = t.reduction || {}; return !!(r.longue && r.dix && r.six); });
      return { ok: red, quoi: e.preuve,
        cout: "Sans les trois versions, une reco de trois slides passe pour du travail "
          + "bâclé. Le chemin de réduction est ce qui montre l'effort derrière la "
          + "phrase finale." };
    }

    if (e.exige === "sources") {
      var sourcee = is.some(function (i) {
        return (INSIGHT.normaliser(i).sources || []).length >= INSIGHT.CROISEMENT; });
      return { ok: sourcee, quoi: e.preuve,
        cout: "Cette école révèle une vérité qui existe déjà : elle se prouve, elle ne "
          + "s'affirme pas. Sans sources croisées, la vérité n'est qu'un avis bien tourné." };
    }

    if (e.exige === "socle") {
      return { ok: !!(socle.idee_directrice || "").trim(), quoi: e.preuve,
        cout: "La Brand Image se juge sur la durée : sans idée directrice écrite, il "
          + "n'y a rien à tenir d'une campagne à l'autre." };
    }

    if (e.exige === "attribut") {
      return { ok: (socle.preuves || []).length > 0, quoi: e.preuve,
        cout: "Cette école cherche dans le produit. Sans preuve tangible au dossier, "
          + "elle n'a rien à isoler ni à révéler." };
    }

    if (e.exige === "brand-key") {
      var neuf = ["positionnement", "promesse", "idee_directrice", "benefices",
        "preuves", "ton", "jamais", "symboles", "ne_fera_pas"];
      var remplies = neuf.filter(function (k) {
        var v = socle[k]; return Array.isArray(v) ? v.length : !!(v || "").trim(); }).length;
      return { ok: remplies === neuf.length, quoi: e.preuve,
        n: remplies, sur: neuf.length,
        cout: remplies + " couches sur " + neuf.length + ". Le discriminator — la "
          + "raison unique de choisir cette marque-là — est celle qu'on remplit en "
          + "dernier et qu'on rate le plus souvent." };
    }

    if (e.exige === "repartition" || e.exige === "distinctivite") {
      if (!window.EFFICACITE) return null;
      return EFFICACITE.preuve(p, e.exige, e);
    }

    return null;
  }

  /* Les écoles déclarées sur un dossier, étage par étage. */
  function declarees(p) {
    var d = p.ecoles || {};
    /* L'école du territoire peut aussi se déclarer sur un territoire précis :
     * c'est l'étage qu'elle gouverne, et un dossier peut en avoir deux. */
    var surTerritoires = (window.TERRITOIRE ? TERRITOIRE.liste(p) : [])
      .filter(function (t) { return !!t.ecole; })
      .map(function (t) { return { etage: "territoire", cle: t.ecole, territoire: t }; });

    var out = [];
    ETAGES.forEach(function (et) {
      if (d[et.cle]) out.push({ etage: et.cle, cle: d[et.cle], territoire: null });
    });
    return out.concat(surTerritoires);
  }

  /* ————————————————————— L'état ————————————————————— */

  function etat(p) {
    var ds = declarees(p);
    if (!ds.length) {
      return { nom: "aucune école déclarée", ton: "attente",
        quoi: "personne ne dira dans quelle école ce dossier travaille — et le critère "
          + "sur lequel il sera jugé n'est écrit nulle part" };
    }
    var sans = ds.filter(function (x) {
      var pr = preuve(p, x.cle, x.etage); return pr && !pr.ok; });
    if (sans.length) {
      var e0 = de(sans[0].cle);
      return { nom: "preuve manquante", ton: "alerte",
        quoi: (e0 ? e0.nom : sans[0].cle) + " est déclarée et sa preuve n'est pas au "
          + "dossier : " + (preuve(p, sans[0].cle, sans[0].etage) || {}).quoi };
    }
    return { nom: ds.length + (ds.length > 1 ? " écoles déclarées" : " école déclarée"),
      ton: "vert",
      quoi: "chacune gouverne son étage, et chacune porte sa preuve" };
  }

  function controles(p) {
    var ds = declarees(p);
    if (!ds.length) {
      return [{ quoi: "Une école par étage", ok: false, poids: 3,
        cout: "sans école déclarée, le critère de jugement n'est écrit nulle part — et "
          + "on l'apprendra en réunion, sous la forme « ça ne marche pas »" }];
    }
    return ds.map(function (x) {
      var e = de(x.cle);
      var pr = preuve(p, x.cle, x.etage);
      var etage = ETAGES.filter(function (t) { return t.cle === x.etage; })[0];
      return { quoi: (e ? e.nom : x.cle) + " — " + (pr ? pr.quoi : "aucune preuve exigée"),
        ok: !pr || pr.ok, poids: 4,
        cout: pr ? pr.cout : "",
        etage: etage ? etage.nom : x.etage };
    });
  }

  /* ————————————————————— Le tableau des douze ————————————————————— */

  /* Où se trouve l'idée · l'effort · la preuve attendue. C'est la synthèse du
   * document, et elle sert de sélecteur : on choisit une école en lisant ce
   * qu'elle réclamera. */
  function tableau(etage) {
    var liste = etage ? parEtage(etage) : ECOLES;
    return el("table.ecot", {},
      el("thead", {}, el("tr", {},
        el("th", {}, "École"),
        el("th", {}, "Où se trouve l'idée"),
        el("th", {}, "Effort"),
        el("th", {}, "Preuve attendue"))),
      el("tbody", {}, liste.map(function (e) {
        return el("tr" + (e.corpus ? ".corpus" : ""), {},
          el("td", {}, el("span.eco-n", {}, e.nom),
            el("span.eco-m", {}, e.maison)),
          el("td", {}, e.ou),
          el("td", {}, e.effort),
          el("td", {}, e.preuve));
      })));
  }

  return { ETAGES: ETAGES, ECOLES: ECOLES,
    de: de, parEtage: parEtage, preuve: preuve, declarees: declarees,
    etat: etat, controles: controles, tableau: tableau };
})();
