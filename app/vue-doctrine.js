/* vue-doctrine.js — la doctrine, consultable depuis l'outil qui l'applique.
 *
 * Le produit refusait des choses au nom de règles qu'il ne savait pas montrer.
 * « La convention n'est pas montrée », « c'est un constat », « deux racines
 * pour deux pistes » : des verdicts justes, et rien derrière pour les
 * comprendre. Quarante-sept documents au dossier sources/, et aucun écran pour
 * en ouvrir un.
 *
 * Ce n'est pas un détail de confort. La raison d'être de ces documents est
 * d'être OPPOSABLES — « en agence, on te dira ça ne marche pas sans te dire
 * selon quel critère ». Un contrôle qui ne renvoie pas à son critère refait
 * exactement ce que la doctrine reproche aux agences.
 *
 * L'écran rend donc trois choses, et la troisième est celle qui manquait le
 * plus : la doctrine ; ce que la maison en a réglé ; et, depuis chaque
 * blocage, le chemin vers la page qui l'explique.
 */

window.VUE_DOCTRINE = (function () {
  var el = O.el;
  var ouvert = null;

  /* ————————————————————— Où chaque contrôle trouve sa raison ————————————————————— */

  /* La carte des renvois. Un blocage porte un type ; ce type vient d'une page
   * de doctrine, et c'est elle qu'on ouvre. Sans cette table, le produit sait
   * refuser et ne sait pas expliquer. */
  var RENVOIS = {
    "insight-sans-couche": { bloc: "couches", quoi: "les quatre couches, et ce que chacune commande" },
    "insight-est-un-constat": { bloc: "forme", quoi: "la forme en trois temps" },
    "insight-une-source": { bloc: "sources", quoi: "les cinq sources, et le croisement" },
    "insight-non-teste": { bloc: "test", quoi: "le test en trois questions" },
    "decalage-de-couche": { bloc: "decalages", quoi: "les décalages de couche" },
    "axes-concurrents": { bloc: "racine", quoi: "le test d'une minute" },
    "piste-hors-territoire": { bloc: "racine", quoi: "insight, territoire, concept" },
    "territoire-a-un-concept": { bloc: "racine", quoi: "insight, territoire, concept" },
    "briefback-absent": { bloc: "briefback", quoi: "le brief-back en trois lignes" },
    "briefback-sans-reponse": { bloc: "briefback", quoi: "le brief-back en trois lignes" },
    "ecole-sans-preuve": { bloc: "ecoles", quoi: "les douze écoles et leur preuve" },
    "convention-supposee": { bloc: "ecoles", quoi: "la Disruption, et ses trois temps" },
    "ecoles-meme-etage": { bloc: "etages", quoi: "une école par étage" },
    "chiffre-sans-source": { bloc: "preuve", quoi: "l'échelle de preuve" },
    "reco-sans-arbitrage": { bloc: "arbitrage", quoi: "la règle maison de la slide d'arbitrage" },
    "pistes-sans-role": { bloc: "roles", quoi: "les trois rôles de piste" },
    "integrite-non-ecrite": { bloc: "roles", quoi: "l'intégrité de la piste" },
    "structure-hybride": { bloc: "structures", quoi: "les six structures" },
  };

  function renvoi(type) { return RENVOIS[type] || null; }

  /* Le lien qu'un blocage affiche. Rendu ici pour que la table des renvois
   * n'ait qu'un seul propriétaire. */
  function lien(type) {
    var r = renvoi(type);
    if (!r) return null;
    return el("button.b.nu.doc-lien", { type: "button",
      title: "ouvrir la doctrine — " + r.quoi,
      onclick: function (e) {
        e.stopPropagation();
        ouvert = r.bloc;
        location.hash = "#/referentiel/doctrine";
      } }, "pourquoi →");
  }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(hote) {
    var d = (MAISON.doctrine || {});

    return el("div.doc", {},
      tete(d),
      blocDocuments(d),
      bloc("couches", "Les quatre couches", "Insight et création",
        "Un insight ne vaut rien sans son étage. La couche où il vit décide du "
        + "livrable qu'on doit produire — et c'est un engagement, pas une indication : "
        + "une campagne ne répare pas un positionnement, et un positionnement ne "
        + "répare pas un service.", couches()),
      bloc("forme", "La forme en trois temps", "Insight et création",
        "Le troisième temps est celui qu'on oublie, et c'est lui qui sépare un "
        + "insight d'un constat. Si on peut le supprimer sans rien perdre, on a "
        + "décrit au lieu d'ouvrir.", forme()),
      bloc("test", "Le test en trois questions", "Insight et création",
        "Trois oui : c'est un insight. Deux : c'est une tension à creuser. Un seul : "
        + "on recommence.", test()),
      bloc("sources", "Les cinq sources sans budget", "Insight et création",
        "Aucune ne remplace une étude. Ensemble, elles suffisent à écrire un insight "
        + "défendable — et c'est ce qu'on vous demandera.", sources(d)),
      bloc("decalages", "Les décalages de couche", "Insight et création",
        "La plupart des briefs cassés viennent d'une erreur de couche. Savoir la "
        + "nommer vaut mieux que savoir y répondre.", decalages()),
      bloc("briefback", "Le brief-back en trois lignes", "Insight et création",
        "On obéit au brief, on documente le désaccord. C'est la seule position tenable "
        + "quand on n'est pas dans la salle où la décision se prend.", briefback()),
      bloc("racine", "Insight, territoire, concept", "Insight et création",
        "Trois objets différents, souvent confondus dans un même deck. Un insight qui "
        + "ne donne qu'un seul concept possible n'est pas un insight : c'est déjà une "
        + "idée, arrivée trop tôt.", racine()),
      bloc("ecoles", "Les douze écoles, et la preuve que chacune attend", "Les écoles de pensée",
        "Une école n'est pas un style : c'est une réponse à une seule question — où se "
        + "trouve la bonne idée ? Connaître les écoles, c'est connaître à l'avance le "
        + "critère sur lequel on sera jugé.", ecoles(d)),
      bloc("etages", "Une école par étage", "Les écoles de pensée",
        "La règle naïve dit « ne pas mélanger les écoles ». Elle est fausse. Le mélange "
        + "tient quand chacune gouverne un étage différent — et deux écoles au même "
        + "étage ne se neutralisent que si chacune apporte sa propre racine.", etages()),
      bloc("preuve", "L'échelle de preuve", "Les écoles de pensée",
        "On prend le niveau le plus haut atteignable, et on le dit. On n'invente jamais "
        + "un chiffre : un chiffre sans source se retourne en réunion.", preuve()),
      bloc("structures", "Les six structures de deck", "La recommandation créative",
        "La structure décide de l'ordre dans lequel le client rencontre l'idée, donc de "
        + "la façon dont il la juge. Le nombre d'étages de validation la détermine, "
        + "davantage que la nature du produit.", structures()),
      bloc("roles", "Les trois rôles de piste", "La recommandation créative",
        "Ne pas présenter trois pistes d'égale valeur : une piste à vendre, deux qui "
        + "bornent le territoire.", roles()),
      bloc("arbitrage", "La slide d'arbitrage", "La recommandation créative",
        "Aucun deck ne sort sans elle. Trois lignes, trente secondes à l'oral. "
        + "Recommander expose — et c'est ce risque que le client paie.", arbitrage())
    );
  }

  function tete(d) {
    var n = (d.documents || []).length;
    return el("div.doc-tete", {},
      el("h2", {}, "La doctrine"),
      el("p.doc-q", {}, "D'où viennent les règles que le produit applique. "
        + n + " documents font foi, et chaque contrôle renvoie ici."),
      el("p.doc-r", {}, "Ce qui suit est du métier : une agence d'Accra a les mêmes "
        + "écoles et les mêmes couches. Ce que la maison en a réglé est signalé "
        + "à part, et se change dans la configuration, pas dans le code."));
  }

  function blocDocuments(d) {
    var docs = d.documents || [];
    if (!docs.length) return null;
    return el("section.doc-s", {},
      el("h3.docs-t", {}, "Les documents qui font foi"),
      el("div.doc-docs", {}, docs.map(function (x) {
        return el("div.docd", {},
          el("span.docd-n", {}, x.nom),
          el("span.docd-g", {}, "gouverne " + x.gouverne),
          el("code.docd-f", {}, x.fichier));
      })),
      el("p.doc-note", {}, "Le produit ne les ouvre pas encore : il sait dire lequel "
        + "gouverne quoi, et où le trouver sur le disque."));
  }

  /* Une section repliable. Celle qu'un blocage vient d'ouvrir se déplie seule. */
  function bloc(cle, titre, source, chapeau, corps) {
    var det = el("details.doc-s" + (ouvert === cle ? ".vise" : ""), { id: "doc-" + cle },
      el("summary", {},
        el("span.docs-t", {}, titre),
        el("span.docs-src", {}, source)),
      el("p.docs-c", {}, chapeau),
      corps);
    if (ouvert === cle) {
      det.open = true;
      /* Ouvrir ne suffit pas : il faut y amener l'œil. */
      setTimeout(function () {
        if (det.scrollIntoView) det.scrollIntoView({ block: "start" });
        ouvert = null;
      }, 60);
    }
    return det;
  }

  /* ————————————————————— Les corps ————————————————————— */

  function couches() {
    return el("table.doc-t", {},
      el("thead", {}, el("tr", {},
        el("th", {}, "Couche"), el("th", {}, "Ce qu'on y trouve"),
        el("th", {}, "Ce que ça commande"), el("th", {}, "L'erreur courante"))),
      el("tbody", {}, INSIGHT.COUCHES.map(function (c) {
        return el("tr", {},
          el("td", {}, el("span.doc-n", {}, c.nom)),
          el("td", {}, c.trouve),
          el("td", {}, el("span.doc-cmd", {}, c.commande)),
          el("td", {}, c.erreur));
      })));
  }

  function forme() {
    return el("div", {},
      el("ol.doc-l", {},
        el("li", {}, el("span.doc-n", {}, "La situation"),
          " — ce que la personne fait, dit ou vit. Factuel, à la première personne, "
          + "sans jugement et sans vocabulaire d'agence."),
        el("li", {}, el("span.doc-n", {}, "La tension"),
          " — deux choses vraies en même temps qui ne devraient pas l'être."),
        el("li", {}, el("span.doc-n", {}, "Ce que ça empêche"),
          " — la conséquence concrète. C'est ce temps qui transforme une observation "
          + "en porte d'entrée pour la création.")),
      el("h4.doc-h", {}, "Cinq énoncés qu'on prend pour des insights"),
      el("ul.doc-imp", {}, INSIGHT.IMPOSTEURS.map(function (x) {
        return el("li", {},
          el("span.doc-n", {}, x.nom),
          el("span.doc-ex", {}, x.exemple),
          el("span.doc-x", {}, x.quoi));
      })));
  }

  function test() {
    return el("ol.doc-l", {}, INSIGHT.TEST.map(function (q) {
      return el("li", {}, el("span.doc-n", {}, q.question), " — " + q.quoi);
    }));
  }

  function sources(d) {
    return el("div", {},
      el("ul.doc-u", {}, INSIGHT.SOURCES.map(function (s) {
        return el("li", {}, el("span.doc-n", {}, s.nom), " — " + s.quoi);
      })),
      reglage("Croisement exigé", INSIGHT.CROISEMENT + " sources",
        "« Une seule produit une opinion ; trois produisent un insight. » La maison "
        + "peut relever ou abaisser ce seuil.", "sourcesCroisees"));
  }

  function decalages() {
    var D = [
      ["Une campagne de notoriété", "Catégorie", "Un positionnement", "on achète de la mémoire pour une marque interchangeable"],
      ["Un nouveau slogan", "Entreprise", "Une correction de service", "la promesse amplifie l'écart"],
      ["Un film émotionnel", "Consommateur", "Un message plus juste", "rien de grave, mais rien de durable"],
      ["Une plateforme de marque", "Culture", "Une big idea", "un document que personne n'utilise"],
      ["Une activation promotionnelle", "Catégorie", "Une raison de préférer", "du volume acheté, puis rendu"],
    ];
    return el("table.doc-t", {},
      el("thead", {}, el("tr", {},
        el("th", {}, "Ce qu'on demande"), el("th", {}, "Où vit le problème"),
        el("th", {}, "Le bon livrable"), el("th", {}, "Ce qui arrive si on obéit"))),
      el("tbody", {}, D.map(function (r) {
        return el("tr", {},
          el("td", {}, r[0]), el("td", {}, el("span.doc-n", {}, r[1])),
          el("td", {}, el("span.doc-cmd", {}, r[2])), el("td", {}, r[3]));
      })));
  }

  function briefback() {
    return el("div", {},
      el("ol.doc-l", {},
        el("li", {}, el("span.doc-n", {}, "Ce que nous avons compris"),
          " — le problème reformulé dans nos mots, en une phrase. Si le client corrige, "
          + "c'est déjà un gain."),
        el("li", {}, el("span.doc-n", {}, "La couche où nous pensons qu'il vit"),
          " — sans jargon : « le sujet nous semble être la place de la marque, plus que "
          + "sa notoriété »."),
        el("li", {}, el("span.doc-n", {}, "Ce que nous proposons de produire"),
          " — le livrable, nommé. S'il diffère de ce qui est demandé, c'est ici qu'on "
          + "l'écrit — pas en fin de présentation.")),
      el("h4.doc-h", {}, "Ce qui ne marche pas"),
      el("ul.doc-u", {},
        el("li", {}, el("span.doc-n", {}, "Refuser le brief"),
          " — vous avez raison et vous perdez le budget. Le problème, lui, reste entier."),
        el("li", {}, el("span.doc-n", {}, "Le dire en restitution"),
          " — le client découvre en public qu'il s'est trompé. Il défendra son brief au "
          + "lieu d'écouter."),
        el("li", {}, el("span.doc-n", {}, "Exécuter en silence"),
          " — vous livrez ce qui est demandé, ça ne marche pas, et c'est la création "
          + "qu'on tiendra pour responsable.")));
  }

  function racine() {
    return el("div", {},
      el("ol.doc-l", {},
        el("li", {}, el("span.doc-n", {}, "L'insight"),
          " — une vérité sur les gens. Ne se présente pas comme une idée : c'est le sol "
          + "sur lequel l'idée tiendra."),
        el("li", {}, el("span.doc-n", {}, "Le territoire"),
          " — l'espace d'expression que l'insight ouvre. Plusieurs concepts peuvent y "
          + "vivre : c'est ce qui donne de la durée à une plateforme."),
        el("li", {}, el("span.doc-n", {}, "Le concept"),
          " — l'idée en une phrase, avec sa signature et ses exécutions. Un territoire "
          + "en produit plusieurs.")),
      el("div.doc-regle", {},
        el("span.docr-t", {}, "LE TEST D'UNE MINUTE"),
        el("p", {}, "Remonter chaque axe jusqu'à son insight. Si les insights diffèrent, "
          + "ce ne sont pas des axes — ce sont des recommandations concurrentes dans le "
          + "même document, et c'est le client qui recomposera."),
        el("p.docr-cas", {}, "Cas maison : anniversaire télécom. Quatre-vingt-sept pages, "
          + "trois axes également finis, trois racines — donc trois baselines, donc trois "
          + "promesses. Le client a adoré le deck.")));
  }

  function ecoles(d) {
    var maison = d.ecolesMaison || [];
    return el("div", {},
      el("table.doc-t", {},
        el("thead", {}, el("tr", {},
          el("th", {}, "École"), el("th", {}, "Où se trouve l'idée"),
          el("th", {}, "Effort"), el("th", {}, "Preuve attendue"))),
        el("tbody", {}, ECOLES.ECOLES.map(function (e) {
          var pratiquee = maison.indexOf(e.cle) !== -1;
          return el("tr" + (e.corpus ? ".corpus" : "") + (pratiquee ? ".maison" : ""), {},
            el("td", {}, el("span.doc-n", {}, e.nom),
              el("span.doc-m", {}, e.maison + " · " + e.annee),
              pratiquee ? el("span.doc-prat", {}, "pratiquée ici") : null),
            el("td", {}, e.ou),
            el("td", {}, e.effort),
            el("td", {}, el("span.doc-cmd", {}, e.preuve)));
        }))),
      reglage("Écoles pratiquées par la maison", maison.length + " sur " + ECOLES.ECOLES.length,
        "Les autres restent consultables : on ne retire pas une école du métier parce "
        + "qu'on ne s'en sert pas cette année.", "ecolesMaison"),
      reglage("Visuels pour prouver une convention", TERRITOIRE.PREUVES_CONVENTION + " concurrents",
        "En dessous, la convention est supposée — et la rupture qu'on bâtit dessus casse "
        + "peut-être une porte ouverte.", "preuvesConvention"));
  }

  function etages() {
    return el("div", {},
      el("ul.doc-u", {}, ECOLES.ETAGES.map(function (t) {
        return el("li", {}, el("span.doc-n", {}, t.nom), " — " + t.quoi);
      })),
      el("div.doc-regle", {},
        el("span.docr-t", {}, "CAS MAISON — NSIA TONTINES"),
        el("p", {}, "Account Planning pour l'insight, Disruption pour le territoire, "
          + "Ehrenberg-Bass pour la diffusion. Trois écoles, aucune contradiction : "
          + "elles n'opèrent pas au même étage."),
        el("p.docr-cas", {}, "Et la nuance qui compte : deux écoles au même étage ne se "
          + "neutralisent pas si elles partagent la même racine. Elles se neutralisent "
          + "quand chacune apporte la sienne.")));
  }

  function preuve() {
    return el("div", {},
      el("ol.doc-l", {}, EFFICACITE.NIVEAUX.map(function (n) {
        return el("li", {}, el("span.doc-n", {}, n.nom), " — " + n.quoi,
          el("span.doc-x", {}, n.force));
      })),
      el("div.doc-regle", {},
        el("span.docr-t", {}, "SI AUCUN NIVEAU N'EST ATTEIGNABLE"),
        el("p", {}, "Ce n'est pas le diagnostic qui manque : c'est Consulting qui n'est "
          + "pas la bonne structure."),
        el("p.docr-cas", {}, "Cas maison — AFG Bank : pas de panel sur ce marché. Dix "
          + "entretiens menés par l'agence, un audit digital, une analyse concurrentielle "
          + "banque par banque. Le niveau 1, fabriqué à la main. Une donnée fabriquée à la "
          + "main vaut mieux qu'un chiffre emprunté — à condition de dire comment elle a "
          + "été faite.")),
      reglage("Référence marque / activation", EFFICACITE.CIBLE_MARQUE + " / "
        + (100 - EFFICACITE.CIBLE_MARQUE), EFFICACITE.RESERVE, "cibleMarque"));
  }

  function structures() {
    return el("div", {},
      el("table.doc-t", {},
        el("thead", {}, el("tr", {},
          el("th", {}, "Structure"), el("th", {}, "Le squelette"),
          el("th", {}, "Le brief qui va avec"))),
        el("tbody", {}, RECO.STRUCTURES.map(function (st) {
          return el("tr", {},
            el("td", {}, el("span.doc-n", {}, st.nom), el("span.doc-x", {}, st.quoi)),
            el("td", {}, st.squelette.map(function (t) {
              var def = PRESENTATION.TYPES[t];
              return el("span.doc-pg", {}, def ? def.nom : t);
            })),
            el("td", {}, st.brief, el("span.doc-garde", {}, st.garde)));
        }))),
      el("h4.doc-h", {}, "Qui décide dans la salle ?"),
      el("ul.doc-u", {}, RECO.SALLES.map(function (sa) {
        return el("li", {}, el("span.doc-n", {}, sa.nom),
          " → " + sa.structures.map(function (c) {
            var st = RECO.structure(c); return st ? st.nom : c;
          }).join(" · ")
          + (sa.integrite ? "  (+ slide d'intégrité)" : ""));
      })),
      reglage("Les mots qui font lire la salle", "quatre familles",
        "Ce sont ceux que nos clients emploient dans leur circuit de validation. Une "
        + "autre maison en écrirait d'autres.", "salles"));
  }

  function roles() {
    return el("ul.doc-u", {}, RECO.ROLES.map(function (r) {
      return el("li", {}, el("span.doc-n", {}, r.nom), " — " + r.quoi);
    }));
  }

  function arbitrage() {
    return el("div", {},
      el("ol.doc-l", {},
        el("li", {}, el("span.doc-n", {}, "La piste retenue"),
          " — nommée, sans détour. « Nous recommandons la piste B. » Pas « nous avons un "
          + "faible pour », pas « les trois sont fortes »."),
        el("li", {}, el("span.doc-n", {}, "Les trois raisons, dans cet ordre"),
          " — réponse au brief, potentiel de durée, capacité de la marque à la porter. "
          + "Aucun superlatif."),
        el("li", {}, el("span.doc-n", {}, "Ce qui casse si on recompose"),
          " — ce que perd la campagne si le concept de B est monté sur l'exécution de A. "
          + "Écrit ici, cité plus tard.")),
      el("p.doc-note", {}, "Quand le client ne la demande pas, c'est qu'il ignore qu'il "
        + "peut l'attendre. Il choisira quand même, seul, et sans les raisons."));
  }

  /* Un réglage de maison, signalé comme tel au milieu du métier. */
  function reglage(nom, valeur, quoi, cle) {
    return el("div.doc-reg", {},
      el("span.docg-t", {}, "RÉGLAGE DE LA MAISON"),
      el("span.docg-n", {}, nom),
      el("span.docg-v", {}, valeur),
      el("p.docg-q", {}, quoi),
      el("code.docg-c", {}, "maison.js · doctrine." + cle));
  }

  return { rendre: rendre, RENVOIS: RENVOIS, renvoi: renvoi, lien: lien,
    viser: function (b) { ouvert = b; } };
})();
