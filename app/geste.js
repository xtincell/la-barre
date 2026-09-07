/* geste.js — un CTA nomme un geste, et le geste s'explique avant de partir.
 *
 * Le produit était couvert de « y aller → », « voir la charge → », « aux
 * pistes créatives → ». Un lien nu suppose qu'on sait déjà ce qu'il y a au
 * bout et ce qu'on doit y faire. Le titulaire le sait. Son assistant, non —
 * et c'est précisément quand le titulaire n'est pas là que l'outil doit
 * porter le métier.
 *
 * Donc : aucune navigation n'arrive à l'aveugle. Chaque destination est
 * décrite ICI, une seule fois, avec les quatre choses que le produit exige
 * partout ailleurs — état, conséquence, coût, prochain geste :
 *
 *   quoi     ce qu'on trouve là-bas
 *   faire    ce qu'on y fait, dans l'ordre, numéroté
 *   change   ce que ça débloque une fois fait
 *   cout     ce que ça coûte de ne pas y aller — calculé sur les données
 *
 * La guidance vit dans une table, pas dans vingt appels : deux écrans qui
 * mènent au même endroit disent la même chose, et corriger une consigne la
 * corrige partout.
 *
 * Le bouton porte le nom du geste, jamais « OK » ni « Continuer ». Quelqu'un
 * qui lit le bouton sait ce qu'il vient de décider.
 */

window.GESTE = (function () {
  var el = O.el;

  /* Un dossier, quand le contexte en porte un. */
  function pid(c) { return c && c.p ? c.p.id : (c && c.projet ? c.projet.id : null); }
  function proj(c) { return (c && (c.p || c.projet)) || null; }

  function livrablesSansPiste(p) {
    if (!p) return 0;
    return (p.livrables || []).filter(function (l) {
      return !l.annule && !l.pisteId; }).length;
  }

  var LIEUX = {

    /* ————————————————————— Dans un dossier ————————————————————— */

    pistes: {
      geste: "Arbitrer les pistes",
      ou: function (c) { return "#/projets/" + pid(c) + "/pistes"; },
      quoi: "Les pistes créatives proposées pour ce dossier : chacune avec son auteur, "
        + "sa mécanique, son sacrifice et son argument.",
      faire: [
        "Lire chaque piste jusqu'à son sacrifice — une piste sans sacrifice ne se défend pas.",
        "En retenir une : c'est elle qui fera autorité sur toute la production.",
        "Écarter les autres avec un motif écrit — sans motif, leur auteur ne saura pas pourquoi.",
      ],
      change: "La production s'ouvre sur la piste retenue. Les livrables cessent de se "
        + "fabriquer sans savoir laquelle fait autorité, et l'auteur retenu est crédité.",
      cout: function (c) {
        var p = proj(c);
        var n = livrablesSansPiste(p);
        if (!n) return "Tant qu'aucune piste n'est arbitrée, rien de ce qui se produit "
          + "n'est opposable : un refus ne pourra se fonder que sur le goût.";
        return n + (n > 1 ? " livrables se fabriquent" : " livrable se fabrique")
          + " sans piste qui les gouverne — ils ne sont refusables que par le goût.";
      },
    },

    brief: {
      geste: "Ouvrir le brief",
      ou: function (c) { return "#/projets/" + pid(c) + "/brief"; },
      quoi: "Le brief du dossier : les onze champs critiques, la clause de frontière, "
        + "le décideur final et le circuit de validation.",
      faire: [
        "Vérifier les champs critiques — un seul vide et le rétroplanning est faux dès le jour 1.",
        "Contrôler que le décideur final est nommé : sans lui, aucune validation ne prend effet.",
        "Renvoyer à la Clientèle ce qui n'est pas de mon ressort, avec le critère du §8.",
      ],
      change: "Le brief contresigné devient opposable : ce qui arrive après et le contredit "
        + "est un nouveau périmètre, pas une correction.",
      cout: "Un brief non contresigné n'engage personne. Le jour où le client conteste, "
        + "la frontière ne tient pas.",
    },

    atelier: {
      geste: "Ouvrir la séance de créa",
      ou: function (c) { return "#/projets/" + pid(c) + "/atelier"; },
      quoi: "Les idées posées en séance, avec leur auteur et sa séniorité — avant "
        + "l'arbitrage, jamais après.",
      faire: [
        "Poser chaque idée au nom de celui qui l'a eue, séniorité comprise.",
        "Arbitrer ensuite : une idée retenue, un argument d'une ligne.",
        "Rattacher l'idée retenue à la piste qu'elle porte.",
      ],
      change: "L'auteur est crédité automatiquement dans la plateforme créative, et "
        + "l'indicateur « idées retenues émanant de juniors » se calcule seul.",
      cout: "Sans idées posées avec leur auteur, cet indicateur reste à zéro — et "
        + "l'attitude « ne jamais s'attribuer l'idée d'un membre de son équipe » n'est "
        + "plus vérifiable, seulement déclarée.",
    },

    presentation: {
      geste: "Préparer la présentation",
      ou: function (c) { return "#/projets/" + pid(c) + "/presentation"; },
      quoi: "Ce qui part chez le client : les livrables retenus, l'ordre de passage, "
        + "et le contrôle avant envoi.",
      faire: [
        "Choisir ce qui se montre, et ce qui reste à l'agence.",
        "Passer le contrôle avant présentation : le dossier peut-il partir au montage ?",
        "Nommer qui présente et qui décide en séance.",
      ],
      change: "Le dossier part complet, et chaque retour de séance redescend sur le "
        + "livrable qu'il vise au lieu de flotter dans un compte rendu.",
      cout: "Une présentation montée à la main se retrouve sans trace : les retours "
        + "arrivent sur le projet et personne ne sait quel livrable ils touchent.",
    },

    livrables: {
      geste: "Voir les livrables du dossier",
      ou: function (c) { return "#/projets/" + pid(c) + "/livrables"; },
      quoi: "La matrice du dossier : marque × marché × support, chaque case étant "
        + "un livrable avec son responsable, sa version et son verdict.",
      faire: [
        "Replier ce qui est tenu, déplier ce qu'on travaille.",
        "Repérer les cases sans responsable, sans charge ou sans date : elles sont invisibles dans la semaine.",
        "Ouvrir un livrable pour le juger, l'annoter ou demander une version.",
      ],
      change: "Ce qui manque se voit avant l'impression, pas après.",
      cout: "Une case oubliée dans la matrice est un livrable que personne ne porte — "
        + "et qui se découvre le jour de la remise.",
    },

    /* ————————————————————— Les cinq destinations ————————————————————— */

    file: {
      geste: "Ouvrir la file de validation",
      ou: "#/valider/file",
      quoi: "Tout ce qui attend une décision de moi, un livrable en entier à la fois, "
        + "trié par ce que ça coûte d'attendre un jour de plus.",
      faire: [
        "Juger le livrable présenté : les critères écrits sont affichés à côté.",
        "Rendre un des quatre verdicts — le motif se choisit d'abord dans les critères.",
        "Passer au suivant : la file se réordonne seule.",
      ],
      change: "L'horloge s'arrête sur ce que j'ai rendu et repart chez celui qui doit reprendre.",
      cout: function () {
        var n = window.FILE ? FILE.tout().length : 0;
        return n ? "Rien n'avance sans ces " + n + " décisions : chaque jour d'attente "
          + "est un jour pris sur la production."
          : "Rien n'attend aujourd'hui.";
      },
    },

    attente: {
      geste: "Voir ce qu'on me doit",
      ou: "#/valider/du",
      quoi: "Ce que j'ai renvoyé et qui n'est pas revenu : à qui, depuis combien de "
        + "jours, sur quel critère, avec le message d'origine.",
      faire: [
        "Repérer la plus ancienne : c'est celle qui bloque en silence.",
        "Relancer avec le message déjà rédigé — l'outil l'a écrit, je le porte par mon canal.",
        "Clore l'attente le jour où la réponse arrive.",
      ],
      change: "Mon horloge reste arrêtée dessus : le retard reste chez celui qui le porte.",
      cout: "Une attente non tracée redevient mon retard à moi dès qu'on cherche un coupable.",
    },

    ordre: {
      geste: "Régler les priorités",
      ou: "#/planning/ordre",
      quoi: "Ce qui passe avant, et pourquoi : ferme, engagé, spéculatif — et les "
        + "conflits entre les trois.",
      faire: [
        "Lire les conflits : quelqu'un tient du spéculatif pendant qu'un engagement traîne.",
        "Remonter l'engagement, ou assumer le spéculatif avec son motif.",
        "Vérifier que rien de ferme n'attend derrière du spéculatif.",
      ],
      change: "L'ordre devient opposable : personne n'a plus à deviner ce qui passe d'abord.",
      cout: "Sans ordre écrit, c'est le plus insistant qui passe — pas le plus engagé.",
    },

    charge: {
      geste: "Ouvrir le plan de charge",
      ou: "#/planning/charge",
      quoi: "Où en sont les livrables, par étage de production, et ce qui a passé sa date.",
      faire: [
        "Repérer les livrables sans responsable, sans charge estimée ou sans date.",
        "Leur donner les trois, sinon ils n'apparaissent dans la semaine de personne.",
        "Déplacer ce qui a passé sa date : une semaine échue fausse la semaine en cours.",
      ],
      change: "La semaine de chacun devient vraie, et une affectation de plus se voit "
        + "immédiatement.",
      cout: "Un livrable sans responsable, sans charge ou sans date est invisible — et "
        + "personne n'est en défaut le jour où il ne sort pas.",
    },

    equipe: {
      geste: "Voir la capacité de l'équipe",
      ou: "#/planning/gens",
      quoi: "La capacité de chacun, ses cumuls déclarés et leur échéance de revue.",
      faire: [
        "Repérer qui est au-delà de sa capacité : le dépassement est déjà un délai.",
        "Voir les charges inconnues — elles occupent quelqu'un sans peser dans sa semaine.",
        "Vérifier les cumuls arrivés à échéance : prolongés, transformés en poste, ou rendus.",
      ],
      change: "Affecter cesse d'être un espoir : ça réserve une fenêtre chez quelqu'un.",
      cout: "Deux projets peuvent prendre le même créatif la même semaine sans que rien "
        + "ne le signale.",
    },

    reprises: {
      geste: "Voir les reprises",
      ou: "#/reporting/reprises",
      quoi: "Ce que les retours hors périmètre ont coûté, et à qui — en jours absorbés "
        + "contre jours facturés.",
      faire: [
        "Lire qui demande le plus de reprises, et sur quel compte.",
        "Trancher chaque reprise ouverte : absorbée avec un motif, ou facturée.",
        "Emporter le chiffre en négociation — c'est lui qui rend la clause crédible.",
      ],
      change: "Le compteur d'absorbé par compte devient opposable au client.",
      cout: "Une reprise non chiffrée est une reprise offerte, et la clause du contrat "
        + "reste un paragraphe sans montant.",
    },

    indicateurs: {
      geste: "Ouvrir mes indicateurs",
      ou: "#/reporting/indicateurs",
      quoi: "Ce sur quoi je suis évalué : reprises, délai de verdict, briefs contresignés, "
        + "idées retenues émanant de juniors.",
      faire: [
        "Lire mon délai moyen de verdict — c'est la mesure inconfortable, et la seule honnête.",
        "Comparer l'exigence par compte : le standard tombe-t-il sur les petits projets ?",
        "Repérer l'indicateur qui décroche, et le geste qui le redresse.",
      ],
      change: "La fin de mois se compile sans rien ressaisir.",
      cout: "Reconstituer le mois de mémoire le 30 à minuit, et se tromper.",
    },

    marques: {
      geste: "Ouvrir la bibliothèque de marque",
      ou: "#/referentiel/marques",
      quoi: "Les marques et leur plateforme : positionnement, promesse, ton, interdits, "
        + "catalogue de packs, marchés et décideurs.",
      faire: [
        "Choisir la marque, puis sa gamme si elle en a une.",
        "Écrire ce qui manque au niveau où ça se décide : un champ hérité dit d'où il vient.",
        "Qualifier les packs sans marque — un pack sans marque n'appartient à personne.",
      ],
      change: "Une campagne convoque ce qui existe au lieu de le réécrire, et un refus "
        + "peut se fonder sur la marque.",
      cout: function () {
        if (!window.DEPOT || !window.VAULT) return "";
        var v = DEPOT.liste("marques").filter(function (m) {
          return VAULT.etat(m.id).ecrits === 0; }).length;
        return v ? v + (v > 1 ? " marques n'ont pas de plateforme" : " marque n'a pas de plateforme")
          + " : chaque campagne repart d'une page blanche."
          : "Sans plateforme écrite, chaque campagne repart d'une page blanche.";
      },
    },

    marches: {
      geste: "Ouvrir marchés & supports",
      ou: "#/referentiel/marches",
      quoi: "Les marchés avec leurs langues, mentions obligatoires et SKU distribués ; "
        + "les supports avec leurs dimensions, gabarits et fournisseurs.",
      faire: [
        "Renseigner ce qui manque sur le marché qu'on travaille — le référentiel se remplit par l'usage.",
        "Poser le gabarit du support la première fois qu'on l'utilise : tous les projets suivants en hériteront.",
        "Vérifier les mentions obligatoires du secteur sur ce marché.",
      ],
      change: "Chaque case de matrice hérite de ses contraintes sans qu'on les ressaisisse.",
      cout: "Ce qui manque au référentiel se découvre à l'impression, quand le fichier "
        + "est déjà parti.",
    },

    parametres: {
      geste: "Ouvrir les paramètres",
      ou: "#/referentiel/parametres",
      quoi: "La base, les règles de la maison, l'équipe et le journal.",
      faire: [
        "Exporter la base : le fichier daté sur le Drive fait foi.",
        "Vérifier les règles de la maison — délais, étages, critères écrits.",
        "Relire le journal si quelque chose a changé sans qu'on sache quand.",
      ],
      change: "La base est à l'abri, et une machine de plus voit le même état.",
      cout: "Le navigateur ne garde qu'un cache : vider les données du site effacerait tout.",
    },

    projet: {
      geste: "Ouvrir le dossier",
      ou: function (c) { return "#/projets/" + pid(c) + (c.section ? "/" + c.section : ""); },
      quoi: "Le dossier en entier : cadrer, concevoir, produire.",
      faire: [
        "Lire d'abord ce qui bloque — l'avancement passe après.",
        "Ouvrir la section où le travail attend.",
        "Résoudre ou réattribuer ce qui bloque : c'est le seul geste possible dessus.",
      ],
      change: "Le dossier reprend là où il s'est arrêté, sans reconstituer de mémoire.",
      cout: "Un blocage qui vieillit à l'écran finit par ne plus se lire.",
    },
  };

  /* ————————————————————— La modale ————————————————————— */

  function texte(v, c) { return typeof v === "function" ? v(c) : v; }

  function ouvrir(cle, c, apres) {
    var L = LIEUX[cle];
    if (!L) { location.hash = typeof cle === "string" ? cle : "#/"; return; }
    c = c || {};
    var ou = texte(L.ou, c);
    var cout = texte(L.cout, c);
    var p = proj(c);

    function partir() {
      PANNEAU.fermer();
      location.hash = ou;
      if (apres) apres();
    }

    PANNEAU.ouvrir(L.geste, p ? p.ref : null, el("div.geste", {},

      /* Pourquoi maintenant. C'est la seule raison d'ouvrir une modale plutôt
       * que de poser un lien : le coût de ne pas y aller ne tient pas dans
       * une flèche. */
      cout ? el("div.geste-pourquoi", {},
        el("div.gp-t", {}, "POURQUOI MAINTENANT"),
        el("div.gp-v", {}, cout)) : null,

      el("div.geste-quoi", {},
        el("div.gq-t", {}, "CE QU'ON Y TROUVE"),
        el("div.gq-v", {}, L.quoi)),

      el("div.geste-faire", {},
        el("div.gf-t", {}, "CE QU'ON Y FAIT, DANS L'ORDRE"),
        el("ol.gf-l", {}, (L.faire || []).map(function (x, i) {
          return el("li", {}, el("span.gf-n", {}, String(i + 1)), el("span", {}, x));
        }))),

      el("div.geste-change", {},
        el("div.gc-t", {}, "CE QUE ÇA CHANGE"),
        el("div.gc-v", {}, L.change)),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: partir }, L.geste),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Pas maintenant")),

      el("div.geste-ou", {}, "Destination : " + ou)
    ));
  }

  /* ————————————————————— Retrouver un lieu depuis une adresse ————————————————————— */

  /* La file d'action et les indicateurs posent des adresses, pas des clés :
   * elles se calculent à partir des données. On résout donc l'adresse vers
   * son lieu — sinon un écran entier retomberait au lien nu, et ce serait
   * précisément celui où l'assistant passe sa journée. */
  var ALIAS = {
    "#/pipeline": "#/planning/charge", "#/attentes": "#/valider/du",
    "#/revue": "#/valider/file", "#/decider": "#/valider/file",
    "#/placer": "#/planning/ordre", "#/constater": "#/reporting/indicateurs",
    "#/maison": "#/referentiel/marches", "#/referentiel": "#/referentiel/marches",
    "#/reglages": "#/referentiel/parametres", "#/standard": "#/reporting/indicateurs",
  };

  /* Les sections d'un dossier qui ont leur propre consigne. */
  var SECTIONS = { pistes: "pistes", brief: "brief", atelier: "atelier",
    presentation: "presentation", livrables: "livrables" };

  function resoudre(ou) {
    if (!ou) return null;
    var a = ALIAS[ou] || ou;

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

  /* Le lien nu du produit, remplacé partout par un bouton guidé.
   *
   * Quand l'adresse ne correspond à aucun lieu déclaré, on n'abandonne pas :
   * l'appelant sait déjà dire ce qui attend là-bas et ce que ça coûte — c'est
   * le contrat de tout objet affiché. On monte la modale avec ça. */
  function lien(ou, libelle, classe, secours) {
    var r = resoudre(ou);
    if (r) return bouton(r.cle, r.c, libelle, classe);
    return el("button." + (classe || "b"), { type: "button",
      onclick: function () { improvise(ou, libelle, secours || {}); } },
      libelle || "Ouvrir");
  }

  function improvise(ou, libelle, sec) {
    PANNEAU.ouvrir(libelle || "Y aller", null, el("div.geste", {},
      sec.cout ? el("div.geste-pourquoi", {},
        el("div.gp-t", {}, "POURQUOI MAINTENANT"),
        el("div.gp-v", {}, sec.cout)) : null,
      sec.quoi ? el("div.geste-quoi", {},
        el("div.gq-t", {}, "CE QU'ON Y TROUVE"),
        el("div.gq-v", {}, sec.quoi)) : null,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          PANNEAU.fermer(); location.hash = ou; } }, libelle || "Y aller"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Pas maintenant")),
      el("div.geste-ou", {}, "Destination : " + ou)
    ));
  }

  /* Un bouton qui ouvre la modale. Le libellé par défaut est le nom du geste :
   * un CTA nomme ce qu'on fait, pas où l'on va. */
  function bouton(cle, c, libelle, classe) {
    var L = LIEUX[cle];
    return el("button." + (classe || "b"), { type: "button",
      onclick: function () { ouvrir(cle, c); } },
      libelle || (L ? L.geste : "Y aller"));
  }

  return { LIEUX: LIEUX, ouvrir: ouvrir, bouton: bouton,
    resoudre: resoudre, lien: lien };
})();
