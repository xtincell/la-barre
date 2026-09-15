/* insight.js — l'insight cesse d'être un paragraphe.
 *
 * Le produit portait deux champs de texte libre nommés « insight » : un dans le
 * brief — ce que le client ou le planneur a donné — et un dans la stratégie —
 * ce qu'on en a fait. Deux paragraphes, aucune prise. On ne pouvait ni dire à
 * quelle profondeur ils étaient écrits, ni ce qu'ils commandaient, ni si deux
 * pistes du même dossier en partageaient un.
 *
 * Or un insight n'est pas une opinion bien tournée. C'est un objet à quatre
 * propriétés, et chacune décide de quelque chose :
 *
 *   SA COUCHE      décide du livrable. Consommateur commande le message et le
 *                  ton ; culture commande la big idea ; catégorie commande le
 *                  positionnement ; entreprise commande une correction de
 *                  marque — parfois un refus de faire la campagne demandée.
 *                  Se tromper de couche est l'erreur la plus coûteuse du
 *                  métier, et la plus invisible : on répond juste à la
 *                  mauvaise question.
 *
 *   SA FORME       situation, tension, ce que ça empêche. Le troisième temps
 *                  est celui qu'on oublie, et c'est lui qui sépare un insight
 *                  d'un constat : si on peut le supprimer sans rien perdre,
 *                  on a décrit au lieu d'ouvrir.
 *
 *   SES SOURCES    trois au minimum, croisées. Une seule produit une opinion.
 *
 *   SON TEST       trois questions. Quelqu'un pourrait-il dire le contraire ?
 *                  Est-ce que ça met légèrement mal à l'aise ? Est-ce qu'une
 *                  idée arrive toute seule ? Trois oui : c'est un insight.
 *
 * Et une conséquence que le produit attendait sans le savoir : un insight
 * porte un identifiant. C'est ce qui permet à une piste de remonter à sa
 * racine — et au dossier de dire si ses axes en partagent une.
 */

window.INSIGHT = (function () {
  var el = O.el;

  /* ————————————————————— Les quatre couches ————————————————————— */

  /* L'étage où vit le problème. La colonne « commande » est un engagement, pas
   * une indication : une campagne ne répare pas un positionnement, et un
   * positionnement ne répare pas un service. */
  var COUCHES = [
    { cle: "consommateur", nom: "Consommateur", court: "CONSOMMATEUR",
      trouve: "une tension vécue",
      cherche: "une contradiction dans le comportement d'une personne précise : ce "
        + "qu'elle fait et ce qu'elle voudrait, ce qu'elle dit et ce qu'elle vit",
      ou: "en parlant aux gens, en les regardant faire, en écoutant ce qu'ils disent "
        + "quand ils ne répondent pas à une question d'étude",
      reconnait: "elle se raconte à la première personne, et elle est un peu gênante "
        + "à lire à voix haute devant le client",
      commande: "le message et la langue de la campagne",
      livrable: "message",
      erreur: "lui faire porter une décision de positionnement. Un insight "
        + "consommateur ne répare pas une marque mal placée : il la rend seulement "
        + "plus sympathique." },

    { cle: "culture", nom: "Culture", court: "CULTURE",
      trouve: "une contradiction partagée",
      cherche: "une tension que la société porte sans la résoudre : tradition et "
        + "modernité, réussite individuelle et devoir familial, langue de la maison "
        + "et langue de l'école",
      ou: "dans la musique, les séries, l'humour, les débats, ce qui circule sur les "
        + "réseaux. Pas dans les panels.",
      reconnait: "elle ne parle pas de la catégorie. Elle existerait même si la "
        + "marque n'existait pas — c'est ce qui lui donne sa portée.",
      commande: "la big idea, celle qui tient plusieurs années et plusieurs campagnes",
      livrable: "bigidea",
      erreur: "porter un sujet de société sans que la marque ait le droit d'en "
        + "parler. La contradiction doit croiser quelque chose que la marque fait déjà." },

    { cle: "categorie", nom: "Catégorie", court: "CATÉGORIE",
      trouve: "une convention non interrogée",
      cherche: "ce que tous les concurrents tiennent pour acquis : la promesse qu'ils "
        + "font tous, les codes visuels qu'ils partagent, le registre dont aucun ne sort",
      ou: "en alignant toutes les communications de la catégorie sur un mur. La "
        + "convention apparaît d'elle-même quand tout se ressemble.",
      reconnait: "elle se prouve en trois visuels de concurrents. Si vous ne pouvez "
        + "pas la montrer, vous l'avez supposée.",
      commande: "le positionnement : la place qu'on occupe, et celle qu'on laisse aux autres",
      livrable: "positionnement",
      erreur: "casser la convention sans savoir ce qu'on met à la place. Une rupture "
        + "sans position produit un coup, pas une marque." },

    { cle: "entreprise", nom: "Entreprise", court: "ENTREPRISE",
      trouve: "un écart entre promesse et réalité",
      cherche: "la distance entre ce que la marque promet et ce qu'elle livre : le "
        + "service, le réseau, le délai, l'accueil en agence",
      ou: "chez les employés de première ligne, dans les réclamations, dans les "
        + "chiffres que le client ne montre pas spontanément",
      reconnait: "personne dans la salle ne veut en parler. C'est le signe le plus "
        + "fiable qu'on a trouvé la bonne couche.",
      commande: "une correction de marque, pas une campagne — parfois un refus de "
        + "faire la campagne demandée",
      livrable: "correction",
      erreur: "communiquer par-dessus l'écart. Une promesse que l'expérience "
        + "contredit accélère la perte de confiance au lieu de la ralentir." },
  ];

  function couche(cle) {
    return COUCHES.filter(function (c) { return c.cle === cle; })[0] || null;
  }

  /* ————————————————————— L'ordre de travail ————————————————————— */

  /* Catégorie, culture, consommateur, entreprise. Commencer par le
   * consommateur est le réflexe le plus répandu et le plus coûteux : on trouve
   * une jolie tension dans un espace déjà pris. Le produit ne l'impose pas —
   * il le rappelle là où on choisit une couche. */
  var ORDRE = [
    { cle: "categorie", rang: 1, tire: "le positionnement",
      saute: "on produit une idée déjà occupée" },
    { cle: "culture", rang: 2, tire: "la big idea",
      saute: "l'idée n'a aucune portée" },
    { cle: "consommateur", rang: 3, tire: "le ton et la langue",
      saute: "la campagne sonne faux" },
    { cle: "entreprise", rang: 4, tire: "le test de livrabilité",
      saute: "on promet ce qui ne sera pas livré" },
  ];

  /* ————————————————————— Les cinq sources ————————————————————— */

  /* Aucune ne remplace une étude. Ensemble elles suffisent à écrire un insight
   * défendable — et c'est ce qu'on demandera. */
  var SOURCES = [
    { cle: "terrain", nom: "Le terrain direct",
      quoi: "dix conversations valent mieux qu'un panel de cent réponses fermées" },
    { cle: "premiere-ligne", nom: "Les employés de première ligne",
      quoi: "guichetiers, commerciaux, livreurs. Ils entendent les objections réelles "
        + "toute la journée, et personne ne les interroge." },
    { cle: "mur", nom: "Le mur de catégorie",
      quoi: "toutes les communications de la catégorie, alignées au même endroit. "
        + "La convention saute aux yeux." },
    { cle: "culture", nom: "La culture qui circule",
      quoi: "musique, humour, séries, commentaires. Ce que les gens se racontent "
        + "entre eux quand personne ne les observe." },
    { cle: "publique", nom: "La donnée déjà publique",
      quoi: "rapports d'institutions, statistiques nationales, et les données du "
        + "client qu'il n'a jamais relues" },
  ];

  /* La calibration de la maison, avec son repli.
   *
   * La doctrine est du métier et vit ici ; ce que la maison en règle vit dans
   * maison.js. Une maison qui n'écrit pas la clé garde la valeur d'origine :
   * le produit tourne, il ne se tait pas. */
  function regle(cle, defaut) {
    var d = (window.MAISON && MAISON.doctrine) || {};
    return d[cle] === undefined || d[cle] === null ? defaut : d[cle];
  }

  var CROISEMENT = regle("sourcesCroisees", 3);

  /* ————————————————————— Les cinq imposteurs ————————————————————— */

  /* Ils ne déclenchent aucun contrôle : on ne détecte pas un constat par une
   * expression régulière. Ils s'affichent à la saisie, là où la confusion se
   * produit — la plupart des briefs arrivent avec un constat présenté comme un
   * insight. */
  var IMPOSTEURS = [
    { nom: "La donnée", exemple: "« 68 % des parents épargnent pour la rentrée »",
      quoi: "un chiffre. Sert à prouver un insight, jamais à en tenir lieu." },
    { nom: "Le constat", exemple: "« Les parents s'endettent pour l'école »",
      quoi: "une description exacte de ce qui se passe. Vrai, vérifiable, et sans conséquence." },
    { nom: "Le besoin déclaré", exemple: "« Ils veulent un crédit plus souple »",
      quoi: "ce que les gens disent vouloir. Un argumentaire produit, au mieux." },
    { nom: "Le verbatim", exemple: "« C'est dur, mais on n'a pas le choix »",
      quoi: "une phrase entendue sur le terrain. Une preuve, jamais un point de départ." },
    { nom: "La vérité générale", exemple: "« L'éducation est une priorité »",
      quoi: "si large qu'elle vaut pour tout un continent et pour aucune marque." },
  ];

  /* ————————————————————— Le test en trois questions ————————————————————— */

  var TEST = [
    { cle: "contredit", question: "Est-ce que quelqu'un pourrait dire le contraire ?",
      quoi: "si personne ne peut contredire l'énoncé, c'est une généralité. Un insight "
        + "prend parti sur une population précise, et laisse les autres de côté." },
    { cle: "gene", question: "Est-ce que ça met légèrement mal à l'aise ?",
      quoi: "un insight juste touche ce qu'on préfère ne pas dire. Le confort est le "
        + "signe qu'on est resté au constat." },
    { cle: "ouvre", question: "Est-ce qu'une idée arrive toute seule ?",
      quoi: "si, après l'avoir lu, personne dans la pièce ne propose rien, l'énoncé "
        + "n'ouvre pas. Il décrit." },
  ];

  /* ————————————————————— Lire ————————————————————— */

  function liste(p) { return (p && p.insights) || []; }

  function de(p, id) {
    return liste(p).filter(function (i) { return i.id === id; })[0] || null;
  }

  function creer(p) {
    if (!p.insights) p.insights = [];
    var i = {
      id: O.id("IN"),
      couche: null,
      auteur: null,
      ecrit_le: new Date().toISOString(),
      passes: { longue: "", temps: { situation: "", tension: "", empeche: "" }, phrase: "" },
      sources: [],
      test: { contredit: null, gene: null, ouvre: null },
    };
    p.insights.push(i);
    return i;
  }

  /* Le squelette, tolérant : un insight migré depuis un paragraphe n'a ni
   * passes ni test, et il ne doit pas faire tomber l'écran qui le lit. */
  function normaliser(i) {
    if (!i) return null;
    if (!i.passes) i.passes = {};
    if (!i.passes.temps) i.passes.temps = { situation: "", tension: "", empeche: "" };
    if (!i.sources) i.sources = [];
    if (!i.test) i.test = {};
    return i;
  }

  function texte(i) {
    i = normaliser(i);
    if (!i) return "";
    var t = i.passes.temps;
    return (i.passes.phrase || "").trim()
      || [t.situation, t.tension, t.empeche].filter(Boolean).join(" ")
      || (i.passes.longue || "").trim();
  }

  /* ————————————————————— Le verdict du test ————————————————————— */

  /* Trois oui : c'est un insight. Deux : c'est une tension à creuser. Un seul :
   * on recommence. Tant que les trois questions ne sont pas répondues, il n'y
   * a pas de verdict — et ne pas en avoir est une information. */
  function verdict(i) {
    i = normaliser(i);
    var repondues = TEST.filter(function (q) { return i.test[q.cle] === true || i.test[q.cle] === false; });
    if (repondues.length < TEST.length) {
      return { cle: "non-teste", nom: "non testé", ton: "attente",
        oui: TEST.filter(function (q) { return i.test[q.cle] === true; }).length,
        quoi: "les trois questions n'ont pas été posées : rien ne dit si l'énoncé "
          + "ouvre quelque chose ou s'il décrit" };
    }
    var oui = TEST.filter(function (q) { return i.test[q.cle] === true; }).length;
    if (oui === 3) {
      return { cle: "insight", nom: "insight", ton: "vert", oui: 3,
        quoi: "contredisible, inconfortable, et une idée en sort — les trois oui" };
    }
    if (oui === 2) {
      return { cle: "tension", nom: "tension à creuser", ton: "attente", oui: 2,
        quoi: "deux oui sur trois : il y a une tension, elle n'est pas encore un "
          + "insight. La question qui manque dit laquelle." };
    }
    return { cle: "recommencer", nom: "à réécrire", ton: "alerte", oui: oui,
      quoi: oui + " oui sur trois : l'énoncé décrit au lieu d'ouvrir. On recommence." };
  }

  /* ————————————————————— Ce que la couche commande ————————————————————— */

  /* La seule chose à retenir des quatre couches : celle où l'insight vit décide
   * du livrable qu'on doit produire. */
  function commande(cle) {
    var c = couche(cle);
    return c ? c.commande : null;
  }

  /* ————————————————————— L'état ————————————————————— */

  function etat(p, i) {
    i = normaliser(i);
    if (!i) return { nom: "aucun insight", ton: "alerte",
      quoi: "le dossier n'a pas de racine : les pistes ne remonteront à rien" };

    if (!texte(i)) {
      return { nom: "insight vide", ton: "alerte",
        quoi: "l'objet existe, rien n'est écrit dedans" };
    }
    if (!i.couche) {
      return { nom: "couche non nommée", ton: "alerte",
        quoi: "on ne sait pas ce que cet insight commande — un message, une big idea, "
          + "un positionnement ou une correction de marque" };
    }
    if (!(i.passes.temps.empeche || "").trim()) {
      return { nom: "c'est un constat", ton: "alerte",
        quoi: "le troisième temps est vide. Ce que ça empêche est ce qui transforme "
          + "une observation en porte d'entrée pour la création." };
    }
    var v = verdict(i);
    if (v.cle !== "insight") return { nom: v.nom, ton: v.ton, quoi: v.quoi };

    if (i.sources.length < CROISEMENT) {
      return { nom: "insight peu sourcé", ton: "attente",
        quoi: i.sources.length + (i.sources.length > 1 ? " sources croisées" : " source")
          + " sur " + CROISEMENT + " : une seule produit une opinion" };
    }
    var c = couche(i.couche);
    return { nom: "insight posé", ton: "vert",
      quoi: "testé, sourcé, à l'étage " + c.nom.toLowerCase() + " — il commande "
        + c.commande };
  }

  /* ————————————————————— Les contrôles ————————————————————— */

  function controles(p, i) {
    i = normaliser(i);
    var v = verdict(i);
    var t = i ? i.passes.temps : {};
    return [
      { quoi: "Une couche nommée", ok: !!(i && i.couche), poids: 5,
        cout: "sans étage, l'insight ne commande rien : on ne sait pas quel livrable "
          + "il appelle, ni lequel serait hors sujet" },
      { quoi: "Les trois temps écrits", ok: !!(t.situation && t.tension && t.empeche), poids: 5,
        cout: "si le troisième temps manque, c'est un constat — vrai, vérifiable, et "
          + "sans conséquence pour la création" },
      { quoi: "Le test passé", ok: v.cle === "insight", poids: 4, cout: v.quoi },
      { quoi: CROISEMENT + " sources croisées", ok: !!(i && i.sources.length >= CROISEMENT), poids: 3,
        cout: "une seule source produit une opinion ; trois produisent un insight" },
    ];
  }

  /* ————————————————————— Le décalage de couche ————————————————————— */

  /* Le contrôle central du module, et la faute la plus chère du métier.
   *
   * Il compare ce que la couche COMMANDE à ce que le dossier PRODUIT. Répondre
   * par une campagne à un problème d'entreprise n'est pas une erreur de goût :
   * c'est amplifier l'écart qu'on aurait dû corriger.
   *
   * Et il se ferme par l'écrit, jamais par l'obéissance : dès que le brief-back
   * porte l'écart, le blocage disparaît. C'est la règle du métier — « on obéit
   * au brief, on documente le désaccord » — et c'est le principe du produit :
   * rien ne bloque, tout affiche son prix. */
  function decalage(p, i) {
    i = normaliser(i);
    if (!i || !i.couche) return null;

    var s = p.sections || {};
    var bb = s.briefback || {};
    /* Le désaccord écrit ferme le décalage. Il ne le nie pas : il le porte. */
    if ((bb.ecart || "").trim()) return null;

    var c = couche(i.couche);

    if (i.couche === "entreprise") {
      return { cle: "decalage-de-couche", couche: c,
        quoi: "L'insight est à l'étage entreprise, le dossier produit une campagne",
        cout: "une promesse que l'expérience contredit accélère la perte de confiance "
          + "au lieu de la ralentir. Ce qu'il faut ici est une correction de marque — "
          + "ou l'écart écrit au brief-back." };
    }

    if (i.couche === "culture" && !((s.bigidea || {}).idee || "").trim()) {
      return { cle: "decalage-de-couche", couche: c,
        quoi: "L'insight est culturel et aucune big idea n'est ouverte",
        cout: "une contradiction sociale commande une idée qui tient plusieurs années. "
          + "Traitée en message de campagne, elle produit un document que personne "
          + "n'utilise." };
    }

    if (i.couche === "categorie" && !((s.socle || {}).positionnement || "").trim()) {
      return { cle: "decalage-de-couche", couche: c,
        quoi: "L'insight est de catégorie et le positionnement n'est pas ouvert",
        cout: "une convention non interrogée commande une place à prendre. Sans "
          + "positionnement, on produira une idée dans un espace déjà occupé." };
    }

    return null;
  }

  /* ————————————————————— Rendre ————————————————————— */

  /* Le chemin de réduction, rendu une fois pour deux usages : les trois passes
   * de l'insight, et les trois versions du problème en Brutal Simplicity.
   * « Le chemin se montre au client le jour où il trouve la phrase finale trop
   * simple. » */
  function chemin(etapes) {
    return el("ol.chem", {}, etapes.map(function (e, n) {
      return el("li.chem-e" + (e.texte ? "" : ".vide"), {},
        el("span.chem-n", {}, String(n + 1)),
        el("div.chem-c", {},
          el("div.chem-t", {}, e.nom),
          el("div.chem-x", {}, e.texte || e.attendu || "—"),
          e.mesure ? el("div.chem-m", {}, e.mesure) : null));
    }));
  }

  function passes(i) {
    i = normaliser(i);
    var t = i.passes.temps;
    return chemin([
      { nom: "La version longue", texte: i.passes.longue,
        attendu: "tout ce qu'on a compris, sans contrainte", mesure: "≈ 60 mots" },
      { nom: "Les trois temps",
        texte: [t.situation, t.tension, t.empeche].filter(Boolean).join("  ·  "),
        attendu: "situation, tension, ce que ça empêche", mesure: "3 phrases" },
      { nom: "La phrase unique", texte: i.passes.phrase,
        attendu: "dite à voix haute devant quelqu'un qui ne connaît pas le dossier",
        mesure: "1 phrase" },
    ]);
  }

  return { COUCHES: COUCHES, ORDRE: ORDRE, SOURCES: SOURCES, IMPOSTEURS: IMPOSTEURS,
    TEST: TEST, CROISEMENT: CROISEMENT,
    couche: couche, commande: commande,
    liste: liste, de: de, creer: creer, normaliser: normaliser, texte: texte,
    verdict: verdict, etat: etat, controles: controles, decalage: decalage,
    chemin: chemin, passes: passes };
})();
