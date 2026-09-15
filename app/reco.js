/* reco.js — la structure du deck, et l'arbitrage sans lequel l'agence disparaît.
 *
 * Trois choses se passent dans presque toutes les agences, et ne se voient
 * qu'en réunion.
 *
 *   La structure se décide en dernier, la veille, par habitude : on reprend le
 *   dernier deck qui a marché. La forme précède alors le raisonnement au lieu
 *   d'en découler.
 *
 *   La salle n'est pas lue : le même deck part chez un directeur marketing qui
 *   tranche seul et chez un comité à trois étages de validation.
 *
 *   L'agence disparaît : sans slide d'arbitrage, le client recompose entre les
 *   pistes, l'agence devient exécutante, et le film qui sort n'est plus celui
 *   de personne.
 *
 * Ce module ne dit pas comment avoir une idée. Il dit comment la présenter pour
 * qu'elle survive à la salle — et il le fait avec des champs que le produit
 * collecte déjà : le décideur final, qui peut annuler une idée validée, le
 * circuit et son nombre de passages. Lire la salle n'a jamais demandé de
 * nouvelle saisie ; ça demandait de relire ce qui était là.
 *
 * Il porte aussi le test d'une minute — remonter chaque axe jusqu'à son
 * insight — parce que c'est lui qui décide si un deck présente des routes
 * parallèles ou trois recommandations concurrentes.
 */

window.RECO = (function () {
  var el = O.el;

  /* ————————————————————— Les six structures ————————————————————— */

  var STRUCTURES = [
    { cle: "lineaire", nom: "Linéaire classique",
      quoi: "Contexte → insight → idée → exécutions. La plus lisible, la moins spectaculaire.",
      squelette: ["titre", "contexte", "probleme", "strategie", "idee", "piste", "planche", "dispositif"],
      brief: "Brief complet, promesse déjà arbitrée, indicateurs posés. Client qui sait "
        + "ce qu'il veut et n'attend pas d'être surpris.",
      produits: "Grande consommation installée, telco sur offre tarifaire, banque de "
        + "détail. Tout ce qui joue la répétition plutôt que la rupture.",
      garde: "Le client arrive à l'idée la garde montée. À éviter pour vendre un parti pris risqué." },

    { cle: "storytelling", nom: "Storytelling — arc narratif",
      quoi: "Tension → révélation → résolution. L'idée arrive comme la seule sortie possible.",
      squelette: ["titre", "verite", "territoire", "idee", "piste", "transformation"],
      brief: "Brief flou, ou brief de repositionnement où la vraie question n'est pas "
        + "celle posée. Structure de référence en compétition d'agences.",
      produits: "Marques challenger, produits de parité où seule la marque différencie, "
        + "mobile money, campagnes d'intérêt général et bailleurs.",
      garde: "Demande de tenir la salle. Un deck envoyé par mail perd la moitié de son effet." },

    { cle: "idea-first", nom: "Idea-first",
      quoi: "L'idée en slide 2, avant toute justification. La démonstration vient ensuite.",
      squelette: ["titre", "idee", "piste", "pourquoi", "dispositif", "faisabilite"],
      brief: "Brief court, délai court, ou client déjà convaincu qu'il faut oser. "
        + "Fonctionne aussi quand l'agence est en position de force.",
      produits: "Boissons, snacking, mode, opérateurs sur campagne image, événementiel "
        + "et sponsoring. Tout ce qui se juge à l'émotion immédiate.",
      garde: "Se retourne contre l'agence si l'idée a besoin de contexte pour être "
        + "comprise. Tester la slide 2 sur quelqu'un hors du dossier." },

    { cle: "routes", nom: "Routes parallèles",
      quoi: "Plusieurs directions présentées ensemble. Le client se sent maître de l'arbitrage.",
      squelette: ["titre", "probleme", "criteres", "piste", "comparatif", "arbitrage"],
      roles: true,
      brief: "Brief exploratoire, nouveau client, territoire de marque à défricher. "
        + "Attendu par défaut dès qu'il y a plusieurs comités de décision.",
      produits: "Lancement de produit, création de marque, naming, packaging, identité. "
        + "Très demandé par les institutionnels, les telco et les appels d'offres publics.",
      garde: "La slide de recommandation n'est pas optionnelle. Sans elle, l'agence "
        + "devient exécutante et le client recompose les pistes entre elles." },

    { cle: "consulting", nom: "Problème → solution",
      quoi: "Structure business, argumentée et chiffrée. Le client doit pouvoir la revendre en interne.",
      squelette: ["titre", "diagnostic", "barrieres", "strategie", "idee", "phases", "mesure"],
      chiffree: true,
      brief: "Brief avec objectifs chiffrés, contexte de justification budgétaire, client "
        + "qui doit défendre le budget devant un board ou un siège régional.",
      produits: "B2B, assurance, industrie, santé, telco sur la data, et campagnes "
        + "financées par bailleurs où le reporting fait partie du livrable.",
      garde: "La créativité y est jugée sur sa logique, pas sur son audace. Ne pas y "
        + "placer une idée qui ne se justifie que par le goût." },

    { cle: "manifesto", nom: "Manifesto",
      quoi: "Un texte de posture avant toute exécution. On énonce ce en quoi la marque croit.",
      squelette: ["titre", "manifeste", "principe", "piste", "abandons", "signes"],
      brief: "Brief de plateforme de marque, changement de direction marketing, fusion, "
        + "sortie de crise, anniversaire de marque.",
      produits: "Marques patrimoniales locales, brasseries historiques, banques "
        + "panafricaines, fédérations sportives, institutions culturelles.",
      garde: "Inadapté à une promotion tarifaire ou à un lancement isolé. Le manifesto "
        + "engage la marque au-delà de la campagne." },
  ];

  function structure(cle) {
    return STRUCTURES.filter(function (x) { return x.cle === cle; })[0] || null;
  }

  /* ————————————————————— Lire la salle ————————————————————— */

  /* « Le nombre d'étages de validation détermine la structure, davantage que la
   * nature du produit. »
   *
   * Rien de neuf ne se saisit : on relit le décideur final, qui peut annuler une
   * idée validée, et le circuit de validation — trois champs critiques que le
   * dossier porte déjà. La lecture est une PROPOSITION, jamais une décision :
   * elle s'affiche avec sa raison, et le titulaire choisit. */
  /* Les mots qui font lire la salle sont un réglage de maison, pas une
   * propriété du métier : ce sont ceux que NOS clients emploient dans leur
   * circuit de validation. Une autre maison en écrirait d'autres, et le repli
   * ci-dessous reste le nôtre. */
  function mots(cle, defaut) {
    var d = ((window.MAISON && MAISON.doctrine) || {}).salles || {};
    return d[cle] || defaut;
  }

  var SALLES = [
    { cle: "cascade", nom: "Comités en cascade",
      quoi: "local → régional → groupe",
      mots: mots("cascade", ["cascade", "regional", "régional", "groupe", "group", "siege", "siège", "holding", "maison mere"]),
      structures: ["routes"], integrite: true },

    { cle: "board", nom: "Board ou siège étranger à reconvaincre",
      quoi: "il faut pouvoir revendre en interne",
      mots: mots("board", ["board", "conseil", "actionnaire", "investisseur", "bailleur"]),
      structures: ["consulting"] },

    { cle: "fondateur", nom: "Fondateur, président de fédération",
      quoi: "une personne qui engage la marque",
      mots: mots("fondateur", ["fondateur", "fondatrice", "president", "président", "pdg", "directeur general", "directrice generale"]),
      structures: ["manifesto"] },

    { cle: "comite", nom: "Comité unique",
      quoi: "un seul étage, mais collectif",
      mots: mots("comite", ["comite", "comité", "collegial", "collégial"]),
      structures: ["routes"] },

    { cle: "autonome", nom: "Directeur marketing autonome",
      quoi: "il tranche seul dans la salle",
      mots: [],
      structures: ["idea-first", "storytelling"] },
  ];

  function lireLaSalle(p) {
    var s = (p.sections || {}).identite || {};
    var brut = [s.tueur, s.circuit, s.decideur].filter(Boolean).join(" ");
    var n = O.normalise ? O.normalise(brut) : String(brut).toLowerCase();

    /* Un client installé sur un brief récurrent prend le linéaire, quelle que
     * soit la salle : il n'attend pas d'être surpris. On le teste d'abord. */
    var anciens = DEPOT.liste("projets").filter(function (x) {
      return x.id !== p.id && x.sections && x.sections.identite
        && x.sections.identite.clientId === s.clientId;
    }).length;
    var seuilInstalle = ((window.MAISON && MAISON.doctrine) || {}).compteInstalle;
    if (seuilInstalle === undefined || seuilInstalle === null) seuilInstalle = 2;
    if (anciens >= seuilInstalle && (p.gabarit === "campagne" || p.gabarit === "cycle")) {
      return { salle: { cle: "installe", nom: "Client installé, brief récurrent",
          quoi: anciens + " dossiers antérieurs sur ce compte" },
        structures: ["lineaire"], integrite: false,
        pourquoi: "Le compte porte déjà " + anciens + " dossiers : la relation est "
          + "ancienne et la promesse arbitrée. Le deck devient une cérémonie, et la "
          + "cérémonie coûte trois jours.",
        sur: !!s.clientId };
    }

    for (var i = 0; i < SALLES.length; i++) {
      var sa = SALLES[i];
      var touche = sa.mots.some(function (m) { return n.indexOf(m) !== -1; });
      if (touche || !sa.mots.length) {
        return { salle: sa, structures: sa.structures, integrite: !!sa.integrite,
          pourquoi: sa.mots.length
            ? "« " + sa.nom.toLowerCase() + " » se lit dans le circuit et dans qui peut "
              + "annuler une idée validée."
            : "Rien dans le circuit n'indique un comité ni un étage au-dessus : on "
              + "suppose un décideur qui tranche seul. Si c'est faux, la structure l'est aussi.",
          sur: touche };
      }
    }
    return { salle: null, structures: [], integrite: false, sur: false,
      pourquoi: "La salle n'est pas lisible : le circuit et le tueur d'idée sont vides." };
  }

  /* La structure retenue pour un dossier, ou celle qu'on propose. */
  function choisie(p) {
    var d = p.presentation || {};
    return d.structure || null;
  }

  function suggerer(p) {
    var l = lireLaSalle(p);
    return { cle: l.structures[0] || null, autres: l.structures.slice(1),
      salle: l.salle, pourquoi: l.pourquoi, integrite: l.integrite, sur: l.sur };
  }

  /* ————————————————————— Le test d'une minute ————————————————————— */

  /* « Remonter chaque axe jusqu'à son insight. Si les insights diffèrent, ce ne
   * sont pas des axes — ce sont des recommandations concurrentes. »
   *
   * La nuance de la v4 compte, et c'est elle qui empêche le contrôle d'être
   * bête : deux écoles au même étage ne se neutralisent PAS si elles partagent
   * la même racine. Ce qu'on teste n'est donc jamais l'école — c'est la racine. */
  function racines(p) {
    var pistes = ((p.sections || {}).pistes || []).filter(function (pi) {
      return pi.statut !== "ecartee";
    });

    var par = {};
    var orphelines = [];
    pistes.forEach(function (pi) {
      var i = window.TERRITOIRE ? TERRITOIRE.racine(p, pi) : null;
      if (!i) { orphelines.push(pi); return; }
      (par[i.id] = par[i.id] || { insight: i, pistes: [] }).pistes.push(pi);
    });

    var cles = Object.keys(par);
    var ts = window.TERRITOIRE ? TERRITOIRE.liste(p) : [];
    var maigres = ts.filter(function (t) {
      return t.insightId && TERRITOIRE.pistes(p, t).length === 1;
    });

    return {
      groupes: cles.map(function (k) { return par[k]; }),
      nRacines: cles.length,
      nVives: pistes.length,
      orphelines: orphelines,
      maigres: maigres,
      /* Deux racines pour des pistes présentées ensemble : le client tranchera
       * entre deux problèmes, pas entre deux réponses au même. */
      concurrents: cles.length > 1,
    };
  }

  /* ————————————————————— Les trois rôles ————————————————————— */

  /* « Ne pas présenter trois pistes d'égale valeur : une piste à vendre, deux
   * qui bornent le territoire. » */
  var ROLES = [
    { cle: "sage", nom: "La sage", rang: 1,
      quoi: "elle répond au brief sans le déborder. Elle rassure, et c'est son rôle : "
        + "elle rend les deux autres lisibles." },
    { cle: "defendue", nom: "Celle qu'on défend", rang: 2,
      quoi: "celle que l'agence recommande. Elle porte le parti pris, et c'est elle "
        + "qui sera reprise en slide d'arbitrage." },
    { cle: "radicale", nom: "La radicale", rang: 3,
      quoi: "elle borne le territoire par le haut. Elle n'est pas là pour être "
        + "choisie, mais pour rendre la défendue raisonnable." },
  ];

  function role(cle) {
    return ROLES.filter(function (r) { return r.cle === cle; })[0] || null;
  }

  function defendue(p) {
    return ((p.sections || {}).pistes || []).filter(function (pi) {
      return pi.role === "defendue" && pi.statut !== "ecartee";
    })[0] || null;
  }

  /* ————————————————————— La slide d'arbitrage ————————————————————— */

  /* Trois lignes, trente secondes à l'oral. Aucun deck ne sort sans elle.
   *
   * Elle ne se saisit pas : elle se compose depuis la piste défendue, son
   * intégrité et la grille de comparaison. Ce qui manque s'affiche comme
   * manquant — « recommander expose, et c'est ce risque que le client paie ». */
  var COMPARAISON = [
    { cle: "brief", nom: "Réponse au brief" },
    { cle: "differenciation", nom: "Différenciation" },
    { cle: "faisabilite", nom: "Faisabilité et budget" },
    { cle: "declinaison", nom: "Potentiel de déclinaison" },
  ];

  function arbitrage(p) {
    var d = defendue(p);
    var pistes = ((p.sections || {}).pistes || []).filter(function (pi) {
      return pi.statut !== "ecartee";
    });
    return {
      piste: d,
      raisons: d ? (d.raisons || []) : [],
      integrite: d ? (d.integrite || "") : "",
      grille: COMPARAISON,
      pistes: pistes,
      /* Elle n'est due qu'à partir de deux pistes : une piste seule n'est pas
       * un choix, c'est une proposition. */
      due: pistes.length > 1,
      prete: !!(d && (d.raisons || []).length >= 3 && (d.integrite || "").trim()),
    };
  }

  /* ————————————————————— Et si ce n'était pas un deck ————————————————————— */

  /* « Le deck existe parce que le document doit survivre à la réunion et
   * circuler sans son auteur. Quand ce besoin n'existe pas, un autre format est
   * meilleur. » Ce n'est pas un contrôle : c'est une ligne dans le geste qui
   * ouvre la présentation. */
  var AUTRES_FORMES = [
    { cle: "note", nom: "La note d'une page", quand: "Client installé",
      quoi: "brief récurrent, relation ancienne, promesse déjà arbitrée. Le deck "
        + "devient une cérémonie, et la cérémonie coûte trois jours." },
    { cle: "film", nom: "Le film d'idée", quand: "Quand ça se démontre",
      quoi: "l'idée se montre mieux qu'elle ne s'explique. Coûteux : à réserver aux "
        + "compétitions qui le valent." },
    { cle: "atelier", nom: "L'atelier", quand: "Quand le client doit défendre",
      quoi: "il devra reprendre l'idée devant son board. On ne présente pas : on "
        + "construit avec lui, et il en sort porteur." },
  ];

  return { STRUCTURES: STRUCTURES, SALLES: SALLES, ROLES: ROLES,
    COMPARAISON: COMPARAISON, AUTRES_FORMES: AUTRES_FORMES,
    structure: structure, lireLaSalle: lireLaSalle, suggerer: suggerer, choisie: choisie,
    racines: racines, role: role, defendue: defendue, arbitrage: arbitrage };
})();
