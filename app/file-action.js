/* file-action.js — que dois-je faire maintenant ?
 *
 * Sept écrans, chacun juste, et pourtant la question du matin restait sans
 * réponse : par quoi je commence ? Chaque écran savait une chose et aucun ne
 * savait laquelle passait avant.
 *
 * Ici tout remonte dans une seule file, triée non pas par urgence ressentie
 * mais par ce que ça coûte d'attendre un jour de plus. Chaque ligne dit ce que
 * c'est, ce que ça coûte, et emmène à l'endroit où ça se règle.
 *
 * Cette file ne remplace aucun écran. Elle dit lequel ouvrir.
 */

window.FILE = (function () {
  var el = O.el;

  /* Les familles, par ce qu'elles coûtent quand on les laisse. */
  var FAMILLES = {
    trancher: { nom: "Trancher", ton: "alerte", ou: "revue",
      quoi: "tant que je n'ai pas tranché, l'équipe attend et le client aussi" },
    ordre: { nom: "Remettre en ordre", ton: "alerte", ou: "pipeline",
      quoi: "quelqu'un travaille sur du spéculatif pendant qu'un engagement traîne" },
    reclamer: { nom: "Réclamer", ton: "attente", ou: "attentes",
      quoi: "ce qu'on me doit et que personne ne sait qu'il me doit" },
    placer: { nom: "Placer", ton: "attente", ou: "direction",
      quoi: "des livrables sans responsable, sans charge ou sans date : invisibles dans la semaine" },
    traiter: { nom: "Traiter un brief", ton: "or", ou: "briefs",
      quoi: "la chaîne d'entrée s'est arrêtée quelque part" },
    contresigner: { nom: "Faire contresigner", ton: "attente", ou: "projets",
      quoi: "des champs tiennent sur une inférence : utilisables, pas opposables" },
  };

  /* ————————————————————— Le relevé ————————————————————— */

  function tout() {
    var out = [];
    /* Un dossier clos ne demande aucune décision.
     *
     * La file est le rituel du lundi, et son budget est de quatre-vingt-dix
     * minutes. L'ingestion du corpus l'a fait passer à deux cent quatre-vingt-
     * dix-neuf entrées — vingt-sept mille pixels — parce que cent trente-deux
     * campagnes terminées y réclamaient un arbitrage de piste et un verdict.
     *
     * Même ligne que pour les blocages, et pour la même raison : ce qu'on ne
     * peut plus réparer n'appelle pas de geste. Ce qui peut encore mordre,
     * lui, reste — et il passe par les blocages, qui sont son lieu. */
    var projets = DEPOT.liste("projets").filter(function (p) {
      return !(window.CLOTURE && CLOTURE.est(p));
    });

    /* 1 · Ce qui attend mon verdict. Rien ne coûte plus cher que ça. */
    var pieces = VUE_REVUE.pieces();
    if (pieces.length) {
      var vieille = pieces.reduce(function (n, x) {
        return Math.max(n, x.depuis ? O.depuis(x.depuis) : 0); }, 0);
      out.push(item("trancher", pieces.length + (pieces.length > 1 ? " livrables attendent mon verdict" : " livrable attend mon verdict"),
        "Chaque jour sans verdict est un jour où l'équipe ne peut ni corriger ni continuer.",
        100 + pieces.length * 5, "#/revue",
        pieces.slice(0, 4).map(function (x) { return x.objet || x; }),
        { chiffre: pieces.length + (pieces.length > 1 ? " livrables suspendus" : " livrable suspendu"),
          depuis: vieille,
          trancher: "Approuver, renvoyer dans le périmètre, ou refuser sur critère. Tant que ce n'est pas dit, rien ne repart.",
          court: "attendent mon verdict",
          gestes: [{ nom: "Juger la première →", fort: true, quand: function () {
            var pr = pieces[0];
            if (pr && pr.type === "livrable" && window.VUE_ASSET) {
              VUE_ASSET.ouvrir(pr.projet, pr.objet, function () { location.reload(); });
            } else if (pr) {
              GESTE.ouvrir("pistes", { p: pr.projet });
            }
          } }] }));
    }

    /* 2 · Les retours client non tranchés : ils suspendent des livrables. */
    FEEDBACK.ouverts().forEach(function (f) {
      var p = DEPOT.trouve("projets", f.projet);
      if (!p || CLOTURE.est(p)) return;
      var impact = FEEDBACK.impact(f);
      out.push(item("trancher", p.nom + " : retour client",
        impact.assets + " livrable(s) concernés par ce retour.",
        95 + impact.assets, "#/projets/" + p.id + "/livrables",
        impact.pieces.filter(function (l) { return l.vignette; }).slice(0, 2),
        { chiffre: p.ref + " · " + impact.assets + " livrable(s)",
          depuis: f.quand ? O.depuis(f.quand) : 0,
          trancher: "Décider si ce retour est absorbé, facturé ou refusé, avec son motif.",
          verbatim: f.texte, verbatimPar: f.auteur, verbatimLe: f.quand,
          gestes: [{ nom: "Traiter ce retour", fort: true, quand: function () {
            FEEDBACK.trancher(f, function () { APP.rendre(); });
          } }] }));
    });

    /* 3 · Les pistes en lice sans arbitrage. */
    projets.forEach(function (p) {
      var pistes = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
      if (pistes.length > 1 && !pistes.some(function (x) { return x.statut === "retenue"; })) {
        var n = (p.livrables || []).filter(function (l) { return !l.annule; }).length;
        out.push(item("trancher", "« " + p.nom + " » : " + pistes.length + " pistes, aucune retenue",
          n + " livrables se fabriquent sans savoir quel concept fait autorité.",
          90, "#/projets/" + p.id + "/pistes"));
      }
    });

    /* 4 · Le conflit d'ordre : du spéculatif devant du ferme. */
    var c = PRIORITE.conflits();
    c.conflits.forEach(function (x) {
      out.push(item("ordre", (x.personne ? x.personne.nom : "Quelqu'un") + " tient du spéculatif",
        x.speculatif.length + " livrables spéculatifs pendant que " + x.ferme.length
          + " livrables engagés sont en retard. Le spéculatif ne s'arrête pas : il passe après.",
        85, "#/pipeline"));
    });

    /* 5 · Ce qu'on me doit, par origine. */
    var comptes = ECARTS.compte();
    Object.keys(comptes).forEach(function (o) {
      var d = ECARTS.def(o);
      out.push(item("reclamer", comptes[o] + (comptes[o] > 1 ? " livrables" : " livrable") + " — " + d.nom.toLowerCase(),
        d.quoi, o === "donneur" ? 70 : o === "brief" ? 75 : 60, "#/attentes"));
    });

    /* 6 · Les renvois sans retour, qui vieillissent. */
    var att = RENVOI.ouvertes();
    var vieux = att.filter(function (a) { return O.depuis(a.envoye_le || a.depuis) >= 5; });
    if (vieux.length) {
      out.push(item("reclamer", vieux.length + (vieux.length > 1 ? " renvois sans retour" : " renvoi sans retour") + " depuis plus de 5 jours",
        "Mon horloge est arrêtée dessus, pas la leur. C'est le seul endroit où le retard des autres est visible.",
        65, "#/attentes"));
    }

    /* 7 · La chaîne d'entrée arrêtée. */
    projets.forEach(function (p) {
      var a = CHAINE_BRIEF.avancement(p);
      if (!a.prochain) return;
      out.push(item("traiter", "« " + p.nom + " » : " + a.prochain.nom.toLowerCase() + " à faire",
        a.prochain.quoi + "  ·  " + a.faits + " étapes sur " + a.total + ".",
        55 - a.faits, "#/projets/" + p.id + "/" + a.prochain.section));
    });

    /* 8 · Les livrables qu'on ne peut ni placer ni réclamer. */
    var sansResp = 0, sansCharge = 0, sansDate = 0;
    projets.forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        if (!l.responsable) sansResp++;
        if (!l.estime) sansCharge++;
        if (!l.remise) sansDate++;
      });
    });
    if (sansResp) out.push(item("placer", sansResp + " livrables sans responsable",
      "Personne n'est en défaut le jour où ça n'avance pas.", 50, "#/pipeline"));
    if (sansCharge) out.push(item("placer", sansCharge + " livrables sans estimation",
      "Ils sont invisibles dans la charge : la semaine se calcule sans eux, et le mur arrive sans prévenir.", 45, "#/pipeline"));
    if (sansDate) out.push(item("placer", sansDate + " livrables sans date de remise",
      "Ni plaçables ni réclamables. Le rétroplanning ne les voit pas.", 40, "#/pipeline"));

    /* 9 · Ce qui tient sur une inférence. */
    projets.forEach(function (p) {
      var n = window.INFERENCE ? INFERENCE.compte(p) : 0;
      if (!n) return;
      out.push(item("contresigner", n + " champs inférés sur « " + p.nom + " »",
        "Utilisables pour travailler, pas opposables au client : le jour où il conteste, rien ne tient.",
        35, "#/projets/" + p.id + "/identite"));
    });

    return out.sort(function (a, b) { return b.poids - a.poids; });
  }

  /* Un item porte maintenant ce qu'il faut pour être TRANCHÉ sur place, pas
   * seulement listé : le chiffre qui justifie son rang, ce qu'il faut décider,
   * et les gestes possibles ici même. */
  function item(famille, quoi, cout, poids, ou, visuels, plus) {
    var o = { famille: famille, quoi: quoi, cout: cout, poids: poids, ou: ou,
      visuels: visuels || [] };
    if (plus) Object.keys(plus).forEach(function (k) { o[k] = plus[k]; });
    /* Le chiffre : ce qui se lit de loin et qui ordonne la file. À défaut,
     * on le tire du libellé — mieux vaut un chiffre imparfait qu'aucun. */
    if (!o.chiffre) {
      var m = String(quoi).match(/^(\d+)\s+([^\u2014·]+)/);
      o.chiffre = m ? m[1] + " " + m[2].trim() : quoi;
    }
    if (!o.court) o.court = String(quoi).replace(/^\d+\s+/, "").slice(0, 42);
    return o;
  }

  /* ————————————————————— La salle de tri ————————————————————— */

  /* Une liste fait lire sept lignes pour choisir par où commencer. Or le
   * système connaît déjà l'ordre du coût : il n'a aucune raison de faire
   * refaire ce tri à la main.
   *
   * Il présente donc UNE décision, en entier, prête à être rendue, et réduit
   * la file à une colonne de coûts qui sert à naviguer — pas à lire.
   *
   * C'est aussi ce qui absorbe l'ancien mode « une à une » : parcourir et
   * faire étaient deux moitiés du même geste. */

  var courant = 0;
  var famille = "";

  function salle(rafraichir) {
    var tous = tout();
    if (!tous.length) return vide();
    var items = tous.filter(function (x) { return !famille || x.famille === famille; });
    if (!items.length) { famille = ""; items = tous; }
    if (courant >= items.length) courant = 0;
    var x = items[courant];

    return el("div.sl", {},
      spine(items, rafraichir),
      O.arrive(decision(x, items.length, rafraichir)),
      preuve(x)
    );
  }

  function vide() {
    return el("div.fi-vide", {},
      el("div.fiv-s", {}, "Rien n'attend de décision. C'est le seul moment où l'on peut "
        + "faire mûrir une piste spéculative — celles qui sont mûres se valident plus souvent."),
      GESTE.bouton("ordre", {}, "Voir ce qui peut mûrir"));
  }

  /* La file, réduite à des coûts. Elle navigue, elle ne se lit pas. */
  function spine(items, rafraichir) {
    var filtre = el("select.studio-file-filtre", { "aria-label": "Filtrer les sujets", onchange: function (e) { famille = e.target.value; courant = 0; rafraichir(); } },
      el("option", { value: "" }, "Tous les sujets"),
      Object.keys(FAMILLES).map(function (key) { return el("option", { value: key }, FAMILLES[key].nom); }));
    filtre.value = famille;
    return el("div.sl-file", {}, filtre,
      el("div.slf-t", {}, "À traiter · " + items.length
        + (items.length > 1 ? " sujets" : " sujet")),
      /* La seconde ligne redisait la première, tronquée : « William Kwin
       * Mandengue tient du spéculatif » au-dessus de « William Kwin Mandengue
       * tient du spécul… ». Vingt-trois lignes grises identiques, et le
       * principe qui les ordonne — le geste, et depuis quand — invisible.
       *
       * Elle porte maintenant ce qui diffère : le geste que ça demande, et
       * l'âge quand on le connaît. Le filet de gauche prend le ton de la
       * famille : on voit les bandes avant de lire les mots. */
      el("div.slf-l", {}, items.map(function (x, n) {
        var f = FAMILLES[x.famille] || {};
        return el("button.slf-i" + (n === courant ? ".ici" : "")
          + (f.ton ? ".f-" + f.ton : ""), { type: "button",
          onclick: function () { courant = n; rafraichir(); } },
          el("span.slfi-n", {}, String(n + 1)),
          el("span.slfi-c", {}, x.chiffre),
          el("span.slfi-q", {},
            el("span.slfi-f", {}, f.nom || x.famille),
            x.depuis ? el("span.slfi-d", {}, "depuis " + x.depuis
              + (x.depuis > 1 ? " jours" : " jour")) : null));
      })),
      el("div.slf-p", {},
        el("span", {}, (courant + 1) + " sur " + items.length),
        el("i", { style: { width: Math.round(((courant + 1) / items.length) * 100) + "%" } })));
  }

  /* La décision elle-même. Le chiffre domine : c'est lui qui justifie le rang. */
  function decision(x, total, rafraichir) {
    var d = FAMILLES[x.famille] || {};
    return el("div.sl-d", {},
      el("div.sld-r", {}, "Sujet " + (courant + 1) + " sur " + total
        + (courant === 0 ? " · priorité proposée" : "")),

      el("div.sld-c", {}, x.chiffre),
      el("div.sld-s", {},
        (x.depuis ? "depuis " + x.depuis + (x.depuis > 1 ? " jours" : " jour") + "  ·  " : "")
        + x.quoi),

      x.visuels && x.visuels.length
        ? el("div.sld-v", {}, x.visuels.slice(0, 2).map(function (v) {
            return el("div.sldv", {}, IMAGE.vignette(v, "planche"),
              el("span", {}, v.nom || ""));
          }))
        : null,

      el("div.sld-t", {},
        el("div.sldt-l", {}, "La prochaine action"),
        el("p", {}, x.trancher || x.cout)),

      el("div.sld-g", {},
        /* Le geste rendu : la carte se retire avant que la suivante arrive.
         * Sur un écran où l'on tranche vingt-trois fois de suite, c'est la
         * seule chose qui dit que le clic a porté. Si l'animation n'a pas
         * lieu, le geste part quand même — O.sortir le garantit. */
        (x.gestes || []).map(function (g) {
          return el("button.b" + (g.fort ? ".or" : ""), { type: "button",
            onclick: function () {
              var carte = document.querySelector(".sl-d");
              O.sortir(carte, g.quand);
            } }, g.nom);
        }),
        /* Le lien nu de la file d'action était le plus coûteux du produit :
         * c'est l'écran où l'assistant passe sa journée, et il envoyait
         * ailleurs sans dire quoi y faire. L'item sait déjà ce qui attend et
         * ce que ça coûte — la modale se monte avec. */
        GESTE.lien(x.ou,
          (x.gestes || []).length ? "Ouvrir le dossier" : d.nom || "Ouvrir",
          "b" + ((x.gestes || []).length ? ".nu" : ".or"),
          { quoi: x.quoi, cout: x.trancher || x.cout }),
        el("button.b.nu", { type: "button", onclick: function () {
          var carte = document.querySelector(".sl-d");
          O.sortir(carte, function () {
            courant = (courant + 1) % total; rafraichir();
          });
        } }, "Sujet suivant")),

      el("div.sld-m", {}, "Consulter un sujet ou passer au suivant ne le résout pas."));
  }

  /* Ce qu'il faut avoir sous les yeux pour trancher — et rien de plus. */
  function preuve(x) {
    var b = [];

    if (x.verbatim) {
      var pe = x.verbatimPar ? DEPOT.trouve("personnes", x.verbatimPar) : null;
      var ct = x.verbatimPar ? DEPOT.trouve("contacts", x.verbatimPar) : null;
      b.push(el("div.sl-p", {},
        el("div.slp-t", {}, "Le retour client"),
        el("blockquote", {}, "« " + x.verbatim + " »"),
        el("div.slp-a", {}, (pe || ct ? (pe || ct).nom : "auteur non nommé")
          + (x.verbatimLe ? "  ·  " + O.joli(x.verbatimLe) : ""))));
    }

    var d = FAMILLES[x.famille] || {};
    if (d.quoi) {
      b.push(el("div.sl-p", {},
        el("div.slp-t", {}, "Pourquoi agir"),
        el("p", {}, d.quoi.charAt(0).toUpperCase() + d.quoi.slice(1) + ".")));
    }

    return el("div.sl-pr", {}, b);
  }

  return { FAMILLES: FAMILLES, tout: tout, salle: salle,
    ou: function () { return courant; }, aller: function (n) { courant = n; } };
})();
