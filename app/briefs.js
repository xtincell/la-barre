/* briefs.js — les types de brief.
 *
 * « Les briefs sont les socles des demandes et les boussoles des suivis. »
 *
 * Un type de brief n'existe donc que s'il répond aux deux :
 *   — ce qu'il FONDE : la demande qu'il rend légitime, et refusable. Sans lui,
 *     on ne peut refuser que par le goût.
 *   — ce qu'il PILOTE : ce qu'on relit ensuite pour savoir si on a dérivé.
 *
 * Le produit n'en avait qu'un — le brief de campagne — appliqué à tout, et deux
 * gabarits de projet sur trois n'en avaient aucun : un pitch et une demande
 * simple se pilotaient sans aucun cadrage écrit.
 *
 * Chaque type est adossé à une fiche de poste : c'est elle qui dit qui l'émet
 * et qui le reçoit. Un brief sans émetteur nommé n'engage personne.
 */

window.BRIEFS = (function () {

  /* Les champs communs à tout brief. Le verbatim d'abord : les mots de celui
   * qui demande, non corrigés — c'est ce qui tient le jour où il conteste. */
  function socleCommun(emetteur) {
    return [
      { cle: "verbatim", nom: "La demande, mot pour mot", type: "long", critique: true,
        poste: emetteur, aide: "Ses mots. Ne pas corriger, ne pas lisser." },
      { cle: "pourquoi", nom: "Pourquoi maintenant", type: "long", critique: true,
        poste: emetteur, aide: "Ce qui a changé pour que ça devienne urgent." },
    ];
  }

  var TYPES = [
    /* ————— Ce qui fonde la marque, au-dessus des campagnes ————— */
    {
      cle: "plateforme", nom: "Brief de plateforme de marque",
      porte: "marque",
      emetteur: "clientele", contributeur: "planning", destinataire: "creation",
      fonde: "la commande du plateforme de marque — positionnement, promesse, idée directrice",
      boussole: "toutes les campagnes de la marque : chacune s'y rattache, ou justifie son écart",
      quoi: "Il commande la plateforme de marque. Sans elle, la bibliothèque se remplit au fil des campagnes "
          + "et finit par dire trois choses différentes.",
      champs: socleCommun("clientele").concat([
        { cle: "horizon", nom: "Horizon", type: "texte", critique: true, poste: "clientele",
          aide: "Combien d'années cette plateforme de marque doit tenir. En dessous de trois, ce n'est pas une plateforme de marque." },
        { cle: "concurrence", nom: "Contre qui la marque se situe", type: "long",
          critique: true, poste: "planning" },
        { cle: "heritage", nom: "Ce qui ne se touche pas", type: "puces", critique: true,
          poste: "clientele", aide: "Le capital acquis : un nom, un code couleur, une signature." },
        { cle: "aTrancher", nom: "Ce qui est ouvert", type: "puces", poste: "planning",
          aide: "Ce que la plateforme doit trancher, et qui ne l'est pas aujourd'hui." },
        { cle: "gammes", nom: "Gammes à couvrir", type: "puces", poste: "clientele",
          aide: "Une gamme peut mériter son propre plateforme sous celui de la marque." },
        { cle: "marches", nom: "Marchés à couvrir", type: "puces", critique: true, poste: "clientele" },
      ]),
    },

    /* ————— Ce qui fonde une campagne —————
     *
     * Ce type portait sur le PROJET, et sa propre fiche disait qu'il fonde
     * « la campagne — son périmètre, son budget, sa fenêtre ». Le document qui
     * fonde la campagne était accroché au projet faute d'un nœud où le poser.
     *
     * Il reprend sa place. Conséquence directe et voulue : un client qui envoie
     * vingt briefs sur le même Noël ouvre UNE campagne, et les vingt projets en
     * héritent la fenêtre, le budget et le périmètre au lieu de les rédéclarer.
     *
     * Ce qui ne bouge pas : la section `brief` du dossier. Un projet garde la
     * sienne — c'est son cadrage à lui, celui de sa nature. Rien n'a été
     * déplacé au dépôt : cent six projets n'ont pas encore de campagne, et
     * déménager leur brief vers un nœud qui n'existe pas les aurait vidés. */
    {
      cle: "campagne", nom: "Brief de campagne",
      porte: "campagne",
      emetteur: "clientele", contributeur: "planning", destinataire: "creation",
      fonde: "la campagne — son périmètre, son budget, sa fenêtre",
      boussole: "l'arbitrage des pistes et le verdict des livrables : hors brief, c'est refusable",
      quoi: "Le document reçu de la Clientèle. Onze champs critiques, et la clause "
          + "de frontière qui protège la Création de l'amont.",
      champs: socleCommun("clientele").concat([
        { cle: "perimetre", nom: "Le périmètre", type: "long", critique: true, poste: "clientele",
          aide: "Ce que la campagne couvre, et ce qu'elle ne couvre pas." },
        { cle: "budget", nom: "Budget", type: "nombre", poste: "clientele",
          aide: "En FCFA. Absent est une information, pas un vide." },
        { cle: "fenetre", nom: "La fenêtre", type: "texte", critique: true, poste: "clientele",
          aide: "Du premier jour au dernier. C'est elle qui contraint tous les projets." },
        { cle: "marches", nom: "Marchés couverts", type: "puces", critique: true, poste: "clientele" },
        { cle: "kpis", nom: "Critères de succès mesurables", type: "puces", critique: true,
          poste: "clientele", aide: "Chacun avec sa source de mesure, sinon il n'est pas mesurable." },
      ]),
    },

    /* ————— Ce que le Planning rend, et qui est son livrable de fiche ————— */
    {
      cle: "requalification", nom: "Brief requalifié",
      porte: "projet", gabarits: ["campagne", "pitch"],
      emetteur: "planning", destinataire: "creation",
      fonde: "la recommandation stratégique — problème réel, insight, territoire",
      boussole: "le territoire : une piste qui en sort est refusable sans discuter du goût",
      quoi: "Livrable explicite de la fiche 12. Il requalifie la demande reçue : "
          + "ce que le client demande n'est pas toujours son problème.",
      section: "strategie",
    },

    /* ————— Ce que la Création émet vers son équipe ————— */
    {
      cle: "proposition", nom: "Demande de proposition créative",
      porte: "projet", gabarits: ["campagne", "pitch"],
      emetteur: "creation", destinataire: "da",
      fonde: "la proposition créative — l'étage autorisé et les critères d'acceptation",
      boussole: "le verdict : les critères écrits sont les seuls éléments opposables",
      quoi: "Le seul document que j'émets vers mon équipe, et le processus impose "
          + "son ordre : on ferme d'abord, on ouvre ensuite.",
      module: "DEMANDE",
    },

    /* ————— Ce qui fonde l'adaptation d'un marché ————— */
    {
      cle: "declinaison", nom: "Brief de déclinaison",
      porte: "marche", gabarits: ["campagne"],
      emetteur: "creation", contributeur: "clientele", destinataire: "graphic",
      fonde: "l'adaptation d'un marché — sa langue, ses mentions, ses packs",
      boussole: "la conformité : ce qu'on découvre sinon à l'impression, et qui se paie en rappel",
      quoi: "Un marché n'est pas une traduction. Sa tenue scolaire, son ombre portée, "
          + "ses packs distribués et ses mentions obligatoires sont un cadrage à part.",
      champs: [
        { cle: "langue", nom: "Langue du marché", type: "texte", critique: true, poste: "clientele" },
        { cle: "packs", nom: "Packs à montrer", type: "puces", critique: true, poste: "clientele",
          aide: "Ceux qui y sont distribués. Montrer un produit qu'on n'y vend pas se rappelle." },
        { cle: "mentions", nom: "Mentions obligatoires", type: "puces", critique: true,
          poste: "clientele", aide: "Elles changent d'un pays à l'autre." },
        { cle: "specifique", nom: "Ce qui est propre à ce marché", type: "long", poste: "creation",
          aide: "Tenue, décor, silhouette, codes locaux. C'est ce qui distingue une adaptation d'une traduction." },
        { cle: "interdits", nom: "Ce qui ne passe pas ici", type: "puces", poste: "clientele" },
        { cle: "valideur", nom: "Qui valide localement", type: "texte", critique: true,
          poste: "clientele", aide: "Le décideur local, avec son délai de retour." },
      ],
    },

    /* ————— Ce qui fait démarrer un exécutant ————— */
    {
      cle: "fabrication", nom: "Ordre de fabrication",
      porte: "livrable", gabarits: ["campagne", "pitch", "demande"],
      emetteur: "creation", destinataire: "graphic",
      fonde: "l'exécution d'un livrable — et ce que l'exécutant décide seul",
      boussole: "le contrôle avant remise : conforme à l'ordre, ou pas",
      quoi: "Une page, écrite et jamais générée. Quinze minutes à l'oral d'abord, "
          + "la page ensuite — c'est le §9.3 du processus.",
      champs: [
        { cle: "enUnePhrase", nom: "Le livrable en une phrase", type: "texte", critique: true,
          poste: "creation" },
        { cle: "seDire", nom: "Ce que le spectateur doit se dire", type: "long",
          critique: true, poste: "creation" },
        { cle: "forme", nom: "La forme et le déroulé", type: "long", critique: true, poste: "creation" },
        { cle: "materiau", nom: "Le matériau fourni", type: "puces", critique: true, poste: "creation",
          aide: "Ce qu'il reçoit pour démarrer. Ce qui manque ici l'arrête." },
        { cle: "interdits", nom: "Les interdits", type: "puces", poste: "creation" },
        { cle: "latitude", nom: "Ce qu'il décide seul", type: "long", critique: true,
          poste: "creation", aide: "Sans ça, l'ordre reprend d'une main ce qu'il donne de l'autre." },
        { cle: "avantDeDemarrer", nom: "Ce dont il a besoin avant de démarrer", type: "puces",
          poste: "creation" },
      ],
    },

    /* ————— Ce qui part chez le prestataire ————— */
    {
      cle: "production", nom: "Brief de production",
      porte: "livrable", gabarits: ["campagne", "demande"],
      emetteur: "creation", contributeur: "graphic", destinataire: "horsmedia",
      fonde: "le bon à tirer — gabarit, profil, support",
      boussole: "la remise : un fichier refusé la veille du départ n'a plus de recours",
      quoi: "Ce qui part chez l'imprimeur ou le prestataire. Ce document est le "
          + "dernier endroit où une erreur coûte encore peu.",
      champs: [
        { cle: "support", nom: "Support et gabarit", type: "texte", critique: true, poste: "creation" },
        { cle: "specs", nom: "Dimensions, fond perdu, résolution", type: "long", critique: true,
          poste: "graphic" },
        { cle: "profil", nom: "Profil colorimétrique", type: "texte", critique: true, poste: "graphic",
          aide: "CMJN pour l'impression, RVB pour l'écran. Se tromper se voit à la livraison." },
        { cle: "prestataire", nom: "Prestataire", type: "texte", critique: true, poste: "horsmedia" },
        { cle: "remise", nom: "Date de remise fichier", type: "date", critique: true, poste: "horsmedia",
          aide: "Distincte de la date de publication. C'est elle qui commande." },
        { cle: "quantite", nom: "Quantité et façonnage", type: "texte", poste: "horsmedia" },
      ],
    },

    /* ————— Le cas sans brief client ————— */
    {
      cle: "pitch", nom: "Brief de pitch",
      porte: "projet", gabarits: ["pitch"],
      emetteur: "clientele", contributeur: "planning", destinataire: "creation",
      fonde: "le pitch — et les jours spéculatifs qu'on accepte d'engager",
      boussole: "le débrief : ce qu'on a consommé, et ce qu'on en retient",
      quoi: "Un pitch n'a pas de brief client formel. Sans ce document, les jours "
          + "spéculatifs ne sont chiffrés nulle part et on perd deux fois.",
      champs: socleCommun("clientele").concat([
        { cle: "competiteurs", nom: "Contre qui on concourt", type: "puces", poste: "clientele" },
        { cle: "jury", nom: "Qui décide, et sur quoi", type: "long", critique: true, poste: "clientele" },
        { cle: "deadline", nom: "Deadline dure", type: "date", critique: true, poste: "clientele",
          aide: "Un pitch n'a pas de rallonge." },
        { cle: "joursSpeculatifs", nom: "Jours qu'on accepte d'engager", type: "nombre",
          critique: true, poste: "creation",
          aide: "Chiffrés avant, pas après. C'est ce qui rend un pitch perdu analysable." },
        { cle: "aGagner", nom: "Ce qu'on gagne si on gagne", type: "texte", poste: "clientele" },
      ]),
    },

    /* ————— Ce que la fiche 07 exige avant toute production lourde ————— */
    {
      cle: "estimation", nom: "Demande d'estimation technique",
      porte: "livrable", gabarits: ["campagne", "pitch"],
      emetteur: "creation", destinataire: "motion3d",
      fonde: "la production lourde — nul ne s'engage sur une date sans elle",
      boussole: "l'écart estimé / réalisé, qui est l'indicateur de la fiche 07",
      quoi: "La fiche du Motion 3D l'exige avant toute production lourde, et "
          + "personne ne la réclame jamais.",
      champs: [
        { cle: "quoi", nom: "Ce qu'il faut produire", type: "long", critique: true, poste: "creation" },
        { cle: "reference", nom: "Références de rendu", type: "puces", poste: "creation" },
        { cle: "contraintes", nom: "Contraintes techniques connues", type: "long", poste: "creation" },
        { cle: "pourQuand", nom: "Pour quand la réponse", type: "date", critique: true, poste: "creation" },
      ],
    },
  ];

  function def(cle) {
    return TYPES.filter(function (t) { return t.cle === cle; })[0] || null;
  }

  /* Les types qui s'appliquent à un dossier, selon son gabarit. Un pitch n'a
   * pas de brief de campagne ; une demande simple n'a pas de requalification. */
  /* Les types qui s'appliquent à un DOSSIER. Ceux qui portent sur la marque ou
   * sur la campagne n'y sont pas : ils ont leur propre nœud. La liste des
   * gabarits qui filtrait chaque type disparaît avec eux — c'est la nature du
   * projet, et ses sections, qui disent désormais ce qui s'applique. */
  function pourNature(cle) {
    var n = window.NATURE ? NATURE.de({ nature: cle }) : null;
    if (!n) return TYPES.filter(function (t) {
      return t.porte !== "marque" && t.porte !== "campagne"; });
    var a = function (x) { return n.sections.indexOf(x) !== -1; };

    return TYPES.filter(function (t) {
      /* Ce qui a son propre nœud n'est pas offert sur un dossier. */
      if (t.porte === "marque" || t.porte === "campagne") return false;

      /* Un brief qui porte sur un livrable ou sur un marché suppose que le
       * dossier en produise. Un projet de conseil n'a ni l'un ni l'autre :
       * lui proposer un ordre de fabrication, c'est lui demander d'être une
       * campagne — exactement ce que les quatre gabarits faisaient. */
      if (t.porte === "livrable" || t.porte === "marche") return a("livrables");

      /* Ce qui porte sur le dossier lui-même se règle sur sa section. */
      if (t.section) return a(t.section);

      /* Le pitch n'est un brief que pour un pitch. */
      if (t.cle === "pitch") return cle === "pitch";
      return true;
    });
  }
  var pourGabarit = pourNature;   /* l'ancien nom, le temps que les vues suivent */

  /* Les champs d'un type. Ceux qui vivent dans une section du projet les
   * empruntent — on ne duplique pas un modèle qui existe. */
  function champs(t) {
    if (t.champs) return t.champs;
    if (t.section && window.CHAMPS) {
      var s = CHAMPS.section(t.section);
      return s ? s.champs : [];
    }
    return [];
  }

  /* Où vit un brief. La plateforme appartient à la marque : elle vaut plusieurs
   * années et ne se réécrit pas à chaque campagne. */
  function contenant(t, cible) {
    /* La campagne porte ses briefs comme la marque porte les siens : dans un
     * sac nommé, pas dans une section de dossier. Une campagne n'a pas de
     * sections — elle a des projets. */
    if (t.porte === "campagne") {
      if (!cible) return null;
      cible.briefs = cible.briefs || {};
      return cible.briefs;
    }
    if (t.porte === "marque") {
      if (!cible) return null;
      cible.briefs = cible.briefs || {};
      return cible.briefs;
    }
    if (t.section && cible) return cible.sections;
    if (!cible) return null;
    cible.briefs = cible.briefs || {};
    return cible.briefs;
  }

  function lire(t, cible) {
    var c = contenant(t, cible);
    if (!c) return {};
    return c[t.section || t.cle] || {};
  }

  function ecrire(t, cible, valeurs) {
    var c = contenant(t, cible);
    if (!c) return false;
    c[t.section || t.cle] = valeurs;
    DEPOT.tracer("brief", "projets", cible.id || null, t.nom);
    return true;
  }

  /* L'état d'un brief : ce qui manque, et ce que ça coûte. Un brief n'est pas
   * un formulaire à remplir — c'est un socle : tant qu'un champ critique
   * manque, ce qu'il fonde ne peut pas être refusé sur un fondement écrit. */
  function etat(t, cible) {
    var v = lire(t, cible);
    var cs = champs(t);
    var manquants = cs.filter(function (c) {
      var x = v[c.cle];
      var vide = Array.isArray(x) ? !x.length
        : (x === undefined || x === null || String(x).trim() === "");
      return vide && (c.critique || c.requis);
    });
    var ecrits = cs.filter(function (c) {
      var x = v[c.cle];
      return Array.isArray(x) ? x.length
        : (x !== undefined && x !== null && String(x).trim() !== "");
    });
    return {
      champs: cs.length, ecrits: ecrits.length, manquants: manquants,
      existe: ecrits.length > 0,
      /* Un brief est recevable quand rien de critique ne manque : c'est à ce
       * moment-là seulement qu'il fonde une demande opposable. */
      recevable: manquants.length === 0 && ecrits.length > 0,
    };
  }

  /* Ce que coûte son absence — la phrase qui remplace « champ manquant ». */
  function cout(t, e) {
    if (!e.existe) {
      return "Sans lui, " + t.fonde + " n'a pas de plateforme de marque : on ne pourra la refuser "
        + "que par le goût, et rien ne dira si on a dérivé.";
    }
    if (e.manquants.length) {
      return e.manquants.length + (e.manquants.length > 1 ? " champs critiques manquent"
                                                          : " champ critique manque")
        + " — " + e.manquants.map(function (c) { return c.nom.toLowerCase(); }).join(", ")
        + ". Le brief existe mais ne s'oppose à rien.";
    }
    return "Recevable : il fonde " + t.fonde + ", et sert de boussole à " + t.boussole + ".";
  }

  return { TYPES: TYPES, def: def, pourNature: pourNature, pourGabarit: pourGabarit, champs: champs,
    lire: lire, ecrire: ecrire, etat: etat, cout: cout, contenant: contenant };
})();
