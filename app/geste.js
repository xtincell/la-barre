/* geste.js — un bouton de destination nomme le geste, et y mène d'un clic.
 *
 * Le produit était couvert de « y aller → », « voir la charge → ». Un lien nu
 * ne dit pas ce qu'on va faire là-bas. Chaque destination est donc décrite
 * ICI, une seule fois : le nom du geste, l'adresse, et une phrase sur ce
 * qu'on y trouve. Deux écrans qui mènent au même endroit disent la même
 * chose, et corriger un libellé le corrige partout.
 *
 * Le bouton porte le nom du geste, jamais « OK » ni « Continuer ».
 *
 * Il part tout de suite. Un panneau « Pourquoi maintenant / Ce qu'on y fait »
 * s'ouvrait avant chaque déplacement : trois clics et une leçon pour ouvrir
 * un dossier (constats fond-metier-13, ia-navigation-14). La phrase « ce
 * qu'on y trouve » reste, au survol du lien.
 *
 * Les anciennes adresses se traduisent par la table unique de la coque,
 * APP.ALIAS (application.js). Ce fichier ne lit APP qu'au rendu ou au clic,
 * jamais à son chargement.
 */

window.GESTE = (function () {
  var el = O.el;

  /* Un dossier, quand le contexte en porte un. */
  function pid(c) { return c && c.p ? c.p.id : (c && c.projet ? c.projet.id : null); }

  var LIEUX = {

    /* ————————————————————— Dans un dossier ————————————————————— */

    pistes: {
      geste: "Arbitrer les pistes",
      ou: function (c) { return "#/projets/" + pid(c) + "/pistes"; },
      quoi: "Les pistes créatives proposées pour ce dossier, chacune avec son auteur, "
        + "sa mécanique et son argument.",
    },

    brief: {
      geste: "Ouvrir le brief",
      ou: function (c) { return "#/projets/" + pid(c) + "/brief"; },
      quoi: "Le brief du dossier : les champs essentiels, le décideur final et le "
        + "circuit de validation.",
    },

    atelier: {
      geste: "Ouvrir la séance de créa",
      ou: function (c) { return "#/projets/" + pid(c) + "/atelier"; },
      quoi: "Les idées posées en séance, avec leur auteur.",
    },

    presentation: {
      geste: "Préparer la présentation",
      ou: function (c) { return "#/projets/" + pid(c) + "/presentation"; },
      quoi: "Ce qui part chez le client : les pièces retenues, l'ordre de passage "
        + "et la relecture avant envoi.",
    },

    livrables: {
      geste: "Voir les livrables du dossier",
      ou: function (c) { return "#/projets/" + pid(c) + "/livrables"; },
      quoi: "Les livrables du dossier par marque, marché et support, avec leur "
        + "responsable, leur version et leur décision.",
    },

    /* ————————————————————— Les espaces ————————————————————— */

    file: {
      geste: "Ouvrir la file de validation",
      ou: "#/valider/file",
      quoi: "Ce qui attend une décision, une pièce à la fois, la plus urgente d'abord.",
    },

    attente: {
      geste: "Voir ce qu'on me doit",
      ou: "#/valider/du",
      quoi: "Ce qui a été renvoyé et n'est pas revenu : à qui, depuis quand, avec le "
        + "message d'origine.",
    },

    ordre: {
      geste: "Régler les priorités",
      ou: "#/planning/ordre",
      quoi: "Ce qui passe avant, et pourquoi : ferme, engagé, spéculatif, et les "
        + "conflits entre les trois.",
    },

    charge: {
      geste: "Ouvrir le plan de charge",
      ou: "#/planning/charge",
      quoi: "Où en sont les livrables, étape par étape, et ce qui a passé sa date.",
    },

    equipe: {
      geste: "Voir la capacité de l'équipe",
      ou: "#/planning/gens",
      quoi: "La capacité de chacun et ce qui lui est déjà confié.",
    },

    reprises: {
      geste: "Voir les reprises",
      ou: "#/reporting/reprises",
      quoi: "Ce que les retours hors périmètre ont coûté, en jours absorbés et en "
        + "jours facturés.",
    },

    indicateurs: {
      geste: "Ouvrir mes indicateurs",
      ou: "#/reporting/indicateurs",
      quoi: "Les indicateurs du mois : reprises, délai de décision, briefs validés.",
    },

    marques: {
      geste: "Ouvrir la bibliothèque de marque",
      ou: "#/referentiel/marques",
      quoi: "Les marques et leur plateforme : positionnement, promesse, ton, interdits, "
        + "packs, marchés et décideurs.",
    },

    marches: {
      geste: "Ouvrir marchés & supports",
      ou: "#/referentiel/marches",
      quoi: "Les marchés avec leurs langues et mentions obligatoires ; les supports "
        + "avec leurs dimensions et gabarits.",
    },

    parametres: {
      geste: "Ouvrir les paramètres",
      ou: "#/referentiel/parametres",
      quoi: "La base, les règles de l'agence, l'équipe et le journal.",
    },

    projet: {
      geste: "Ouvrir le dossier",
      ou: function (c) { return "#/projets/" + pid(c) + (c.section ? "/" + c.section : ""); },
      quoi: "Le dossier en entier : cadrer, concevoir, produire.",
    },
  };

  function texte(v, c) { return typeof v === "function" ? v(c) : v; }

  /* L'adresse actuelle d'une adresse peut-être ancienne (« #/pipeline »). */
  function actuelle(ou) {
    return window.APP && APP.actuelle ? APP.actuelle(ou) : ou;
  }

  /* Aller à un lieu depuis un geste qui n'a pas de lien sous la main : une
   * pastille, une action de panneau. On y va, sans étape intermédiaire. */
  function ouvrir(cle, c, apres) {
    var L = LIEUX[cle];
    var ou = L ? texte(L.ou, c || {}) : typeof cle === "string" ? cle : "#/";
    location.hash = actuelle(ou);
    if (apres) apres();
  }

  /* ————————————————————— Retrouver un lieu depuis une adresse ————————————————————— */

  /* La file d'action et les indicateurs posent des adresses, pas des clés :
   * elles se calculent à partir des données. On retrouve le lieu pour nommer
   * le geste et dire ce qu'on y trouve. */

  /* Les sections d'un dossier qui ont leur propre lieu. */
  var SECTIONS = { pistes: "pistes", brief: "brief", atelier: "atelier",
    presentation: "presentation", livrables: "livrables" };

  function resoudre(ou) {
    if (!ou) return null;
    var a = actuelle(ou);

    var m = a.match(/^#\/projets\/([^/]+)(?:\/([^/]+))?/);
    if (m) {
      var p = DEPOT.trouve("projets", m[1]);
      if (!p) return null;
      var cle = SECTIONS[m[2]] || "projet";
      return { cle: cle, c: { p: p, section: m[2] || null } };
    }

    var trouve = null;
    Object.keys(LIEUX).forEach(function (k) {
      if (typeof LIEUX[k].ou === "string" && LIEUX[k].ou === a) trouve = k;
    });
    return trouve ? { cle: trouve, c: {} } : null;
  }

  /* Un vrai lien : il s'ouvre dans un autre onglet, se copie, et le retour
   * du navigateur y ramène. */
  function a(ou, libelle, classe, quoi) {
    return el("a." + (classe || "b"), { href: ou, title: quoi || null }, libelle);
  }

  /* Le lien vers une adresse calculée. Quand elle ne correspond à aucun lieu
   * déclaré, l'appelant sait dire ce qui attend là-bas (`secours.quoi`). */
  function lien(ou, libelle, classe, secours) {
    var cible = actuelle(ou);
    var r = resoudre(cible);
    var L = r && LIEUX[r.cle];
    return a(cible, libelle || (L ? L.geste : "Ouvrir"), classe,
      (L && L.quoi) || (secours && secours.quoi));
  }

  /* Le lien vers un lieu déclaré. Le libellé par défaut est le nom du geste :
   * un bouton nomme ce qu'on fait, pas où l'on va. */
  function bouton(cle, c, libelle, classe) {
    var L = LIEUX[cle];
    return a(L ? actuelle(texte(L.ou, c || {})) : "#/", libelle || (L ? L.geste : "Ouvrir"),
      classe, L && L.quoi);
  }

  return { LIEUX: LIEUX, ouvrir: ouvrir, bouton: bouton,
    resoudre: resoudre, lien: lien };
})();
