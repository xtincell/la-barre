/* vue-livrable.js — l'écran d'un livrable.
 *
 * L'aperçu, le fil d'étapes, les trois chiffres, la bannière quand les allers-retours
 * dépassent le vendu, les critères, les dépendances. Tout ce qu'il faut pour
 * juger sans ouvrir autre chose.
 */

window.VUE_LIVRABLE = (function () {
  var el = O.el;

  /* La frise vit dans production.js : c'est elle qui sait ce qu'un support
   * exige, et le BAT en fait partie. Deux écrans la lisaient chacun à leur
   * façon — ils lisent maintenant la même. */
  var ETAPES = PRODUCTION.ETAPES;

  var ONGLETS = [
    { cle: "apercu", nom: "Aperçu" },
    { cle: "criteres", nom: "Critères & review" },
    { cle: "retours", nom: "Retours & situation" },
    { cle: "production", nom: "Production" },
    { cle: "dependances", nom: "Dépendances" },
    { cle: "historique", nom: "Historique" },
  ];

  /* L'écran d'un livrable, c'est VUE_ASSET. Celui-ci ne sert plus que de source
   * pour ses onglets — et redirige si on l'appelle encore. */
  function ouvrir(projet, livrable, rafraichir) {
    if (window.VUE_ASSET) { VUE_ASSET.ouvrir(projet, livrable, rafraichir); return; }
    ouvrirFiche(projet, livrable, rafraichir);
  }

  function ouvrirFiche(projet, livrable, rafraichir) {
    var courant = "apercu";

    function dessiner() {
      var corps = el("div", {},
        entete(projet, livrable),
        UI.onglets(ONGLETS, courant, function (c) { courant = c; PANNEAU.fermer(); dessiner(); }),
        el("div", { style: { "margin-top": ".9rem" } }, contenu(projet, livrable, courant, function () {
          PANNEAU.fermer(); dessiner(); if (rafraichir) rafraichir();
        })),
        actions(projet, livrable, function () { PANNEAU.fermer(); if (rafraichir) rafraichir(); })
      );
      PANNEAU.ouvrir(livrable.nom, etiquetteEtat(livrable), corps);
    }

    DEPOT.lu("livrables", livrable.id);
    dessiner();
  }

  /* ————————————————————— L'en-tête ————————————————————— */

  function entete(p, l) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var resp = DEPOT.trouve("personnes", l.responsable);
    var t = tours(l);
    var etape = etapeCourante(p, l);
    var perime = REGLES.maitrePerime(p, l);
    var droits = REGLES.droitsInsuffisants(l);

    return el("div", {},
      bandeLivrable(p, l, resp),

      el("div.liv-tete", {},
        el("div.liv-meta", {},
          s ? UI.eti(s.nom, "terne") : null,
          m ? UI.drapeau(m) : null,
          resp ? el("span.liv-resp", {}, UI.avatar(resp, 22), el("span", {}, resp.nom)) : UI.eti("sans responsable", "alerte"),
          el("span.liv-v", {}, "V" + (l.version || 1))
        )
      ),

      el("div.liv-apercu", {},
        el("div", {},
          IMAGE.vignette(l, "grande"),
          el("div.form-actions", {}, IMAGE.bouton(l, function () { PANNEAU.fermer(); ouvrir(p, l); }))
        ),
        el("div", {},
          UI.filEtapes(ETAPES, etape, true),
          el("div.ou-en", {},
            el("div.t", {}, "OÙ EN SOMMES-NOUS ?"),
            el("div.v", {}, phrase(p, l))
          ),
          el("div.stats", {},
            UI.stat("Tours consommés", t.faits + " / " + (t.vendus || "—"),
              t.vendus && t.faits > t.vendus ? "au-delà du vendu" : "dans le périmètre",
              t.vendus && t.faits > t.vendus ? "alerte" : ""),
            /* Le réel se saisit ICI, et nulle part ailleurs.
             *
             * Deux cent vingt-quatre livrables portaient un estimé, zéro un
             * réel — et pour cause : aucun écran ne permettait de l'écrire.
             * La faille 10.1 de l'audit tenait à ça. « L'effort est plafonné,
             * jamais mesuré » n'était pas un défaut de discipline : c'était un
             * champ sans porte.
             *
             * Sans lui, rien ne tourne en aval : ni la marge, ni la clause de
             * reprise, ni la dérive qui corrige l'estimation suivante, ni la
             * comparaison entre marques. Un chiffre, et quatre boucles
             * s'allument. */
            el("button.st.nu", { type: "button", title: "saisir le temps réel",
              onclick: function () { saisirReel(projet, l, rafraichir); } },
              UI.stat("Temps", l.reel ? l.reel + " j" : "à saisir",
                l.estime
                  ? "estimé : " + l.estime + " j" + (l.reel ? " · " + ecart(l) : "")
                  : "aucune estimation",
                l.reel && l.estime && l.reel > l.estime ? "alerte"
                  : l.estime && !l.reel ? "attente" : "")),
            UI.stat("Complétude", REGLES.pretSur(l).part + " %",
              REGLES.pretSur(l).pret + (REGLES.pretSur(l).pret > 1 ? " points prêts sur " : " point prêt sur ")
                + REGLES.pretSur(l).total, "")
          )
        )
      ),

      perime ? UI.banniere("rouge", "Une référence directe ou commune a changé ou manque. Le travail est conservé ; sa reprise reste à recevoir.") : null,
      droits ? UI.banniere("rouge", droits) : null,
      t.vendus && t.faits > t.vendus ? UI.banniere("",
        "Plus d'allers-retours que prévu. Chaque aller-retour supplémentaire est comptabilisé en reprise.") : null
    );
  }

  /* La question de cet écran : que manque-t-il pour que ça parte ? */
  function bandeLivrable(p, l, resp) {
    var v = (l.versions || [])[l.versions.length - 1];
    var coince = REGLES.coince(l);
    var t = tours(l);
    var d = PLATEAU.echeanceDe(p, l);

    var controles = [
      { quoi: "Responsable", ok: !!resp, poids: 5, cout: REGLES.prix("sans-proprietaire") },
      { quoi: "Charge estimée", ok: l.estime !== null && l.estime !== undefined, poids: 3,
        cout: "la semaine de production ne se calcule pas" },
      { quoi: "Échéance", ok: !!d, cout: "le livrable est hors du temps, donc invisible" },
      { quoi: "Maître à jour", ok: !REGLES.maitrePerime(p, l), poids: 4, cout: REGLES.prix("maitre-perime") },
      { quoi: "Droits couverts", ok: !REGLES.droitsInsuffisants(l), poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5, poids: 5,
        cout: REGLES.droitsInsuffisants(l) || "" },
      { quoi: "Entrées fournies", poids: 4, ok: (l.entrees || []).every(function (e) { return e.fournisseur; }),
        cout: REGLES.prix("entree-sans-fournisseur") },
      { quoi: "Dix points prêts", ok: coince.length === 0,
        cout: coince.length ? "en attente sur " + coince.map(function (c) { return c.point.toLowerCase(); }).join(", ") : "" },
      { quoi: "Allers-retours dans le vendu", ok: !(t.vendus && t.faits > t.vendus),
        cout: "chaque aller-retour au-delà se comptabilise en reprise" },
    ];

    var prix = null;   /* la bande choisit la conséquence la plus lourde */

    var gestes = [];
    if (v && !v.verdict) {
      gestes.push({ nom: "Juger cette version", fort: true, quand: function () {
        PANNEAU.fermer(); GESTE.ouvrir("file"); } });
    } else {
      gestes.push({ nom: "Soumettre une version", fort: true, quand: function () {
        var n = (l.versions || []).length + 1;
        if (!l.versions) l.versions = [];
        l.versions.push({ n: n, soumis_le: new Date().toISOString(), verdict: null });
        l.version = n;
        DEPOT.tracer("soumission", "livrables", p.id, l.nom + " V" + n);
        DEPOT.enregistrer(); PANNEAU.fermer(); ouvrir(p, l);
      } });
    }
    if (coince.length) {
      gestes.push({ nom: "Réclamer ce qui manque", quand: function () {
        PANNEAU.fermer();
        RENVOI.ouvrir({ quoi: l.nom + " — " + coince[0].axe, projet: p.ref, projetId: p.id, objet: l.id });
      } });
    }

    return UI.recevabilite(
      coince.length === 0 && !manques.length ? "Ce livrable est prêt" : "Que manque-t-il pour livrer ?",
      controles, prix, gestes);
  }

  function etiquetteEtat(l) {
    var v = (l.versions || [])[l.versions.length - 1];
    if (!v) return "pas encore soumis";
    if (!v.verdict) return "en attente de verdict";
    var nom = "";
    MAISON.verdicts.forEach(function (x) { if (x.cle === v.verdict) nom = x.nom; });
    return nom;
  }

  function phrase(p, l) {
    var v = (l.versions || [])[l.versions.length - 1];
    var coince = REGLES.coince(l);
    if (!v) return "Aucune version soumise. Le livrable existe, rien n'a encore été produit dessus.";
    if (!v.verdict) {
      return "V" + v.n + " soumise le " + O.joli(v.soumis_le) + ", en attente de ma décision"
        + (coince.length ? ". En attente aussi sur " + coince.length + " axes." : ".");
    }
    return "V" + v.n + " jugée le " + O.joli(v.juge_le) + (v.motif ? " — " + v.motif : "")
      + (coince.length ? ". Reste " + coince.map(function (c) { return c.point.toLowerCase(); }).join(", ") + "." : "");
  }

  /* Le temps réellement consommé, à la livraison. Deux nombres par livrable —
   * estimé à l'affectation, réel à la livraison — c'est le mécanisme M9 du
   * plan d'origine, écrit dès le premier jour et jamais posé. */
  function saisirReel(projet, l, rafraichir) {
    var champ = el("input", { type: "number", min: "0", step: "0.5",
      value: l.reel == null ? "" : String(l.reel) });
    var prop = window.BOUCLES ? BOUCLES.estimationProposee(projet, l) : null;

    PANNEAU.ouvrir("Le temps réellement consommé", l.nom, el("div", {},
      UI.banniere("", "Deux nombres par livrable : l'estimé à l'affectation, le réel à la "
        + "livraison. Sans le second, aucune marge n'est vérifiable, aucune reprise n'a de "
        + "chiffre à opposer, et l'estimation suivante ne s'améliore jamais."),

      l.estime
        ? PANNEAU.ligne("Estimé à l'affectation", l.estime + " jours")
        : el("p.lire", {}, "Ce livrable n'a pas d'estimation : le réel se notera quand même, "
            + "mais il n'y aura pas d'écart à lire."),

      prop
        ? PANNEAU.sousbloc("Ce que la mémoire de la maison suggère",
            el("p.lire", {}, prop.pourquoi))
        : null,

      el("div.form", {}, el("div.champ", {},
        el("label", {}, "Jours réellement consommés"), champ)),

      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          var v = champ.value === "" ? null : +champ.value;
          l.reel = v;
          DEPOT.tracer("temps réel", "livrables", l.id,
            l.nom + " · " + (v == null ? "effacé" : v + " j"),
            ((projet.sections || {}).identite || {}).marqueIds);
          DEPOT.enregistrer();
          PANNEAU.fermer();
          if (v != null && l.estime) {
            var e = Math.round(((v - l.estime) / l.estime) * 100);
            AVIS.fait("Réel noté : " + v + " j pour " + l.estime + " estimés ("
              + (e > 0 ? "+" : "") + e + " %). La prochaine estimation de même forme en tiendra compte.");
          } else {
            AVIS.fait("Réel noté.");
          }
          if (rafraichir) rafraichir();
        } }, "Noter le réel"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ), "var(--accent)");
  }

  function ecart(l) {
    var e = Math.round(((l.reel - l.estime) / l.estime) * 100);
    return (e > 0 ? "+" : "") + e + " %";
  }

  /* Les allers-retours consommés, et ceux qui étaient vendus. Trois lignes du
   * bloc d'export s'étaient recollées ici lors d'une reconstruction : elles ne
   * cassaient rien, elles mentaient seulement sur ce que la fonction rend. */
  function tours(l) {
    return {
      faits: (l.versions || []).filter(function (v) { return v.verdict && v.verdict !== "approuve"; }).length,
      vendus: l.toursVendus || 0,
    };
  }

  function etapeCourante(p, l) {
    return PRODUCTION.etape(p, l).i;
  }

  /* ————————————————————— Les onglets ————————————————————— */

  function contenu(p, l, courant, apres) {
    if (courant === "criteres") return criteres(p, l, apres);
    if (courant === "retours") return retours(p, l, apres);
    if (courant === "production") return PRODUCTION.bloc(p, l, apres);
    if (courant === "dependances") return dependances(p, l, apres);
    if (courant === "historique") return el("div", {},
      el("div.form-actions", { style: { "margin-bottom": ".8rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          VERSION.nouvelle(l, l.nom, apres, {
            perime: function () { return KV.descendance(p, l.id); },
          });
        } }, "Ouvrir une nouvelle version")),
      VERSION.fil(l, l.toursVendus),
      historique(l));
    return apercu(p, l, apres);
  }

  /* Les retours posés sur l'image, et l'image posée dans son support. */
  function retours(p, l, apres) {
    var ann = ANNOT.liste(l);
    var ouvertes = ANNOT.ouvertes(l);
    var reprises = ouvertes.filter(function (a) { return a.reprise; }).length;

    return el("div", {},
      el("div.sousbloc", {},
        el("h3", {}, "Retours sur le visuel",
          el("span.droite", {}, ann.length ? ouvertes.length + " à traiter sur " + ann.length : "aucun")),
        reprises
          ? UI.banniere("rouge", reprises + (reprises > 1 ? " retours arrivent" : " retour arrive")
              + " après une validation : ce sont des reprises, elles se comptent.")
          : null,
        ann.length
          ? el("div", {}, ann.slice(0, 6).map(function (a, i) {
              var pers = a.auteur ? DEPOT.trouve("personnes", a.auteur) : null;
              return UI.fileItem(null, (i + 1) + " · " + a.texte,
                (pers ? pers.nom : "client") + " · " + O.joli(a.quand) + " · V" + a.version,
                UI.eti(ANNOT.ETATS[a.statut].nom, a.statut === "aTraiter" ? "alerte" : "terne"));
            }))
          : el("p.rien", {}, "Aucun retour posé sur ce livrable. Un retour qui vit dans un message ne se traite jamais."),
        el("div.form-actions", {},
          el("button.b.or", { type: "button", onclick: function () {
            PANNEAU.fermer(); ANNOT.ouvrir(p, l, apres);
          } }, ann.length ? "Ouvrir les retours" : "Poser un retour"))
      ),
      el("div.sousbloc", {}, MOCKUP.bloc(p, l, apres))
    );
  }

  function apercu(p, l, apres) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var g = s && m ? (s.gabarits || {})[m.id] : null;

    return el("div", {},
      KV.estKV(l) ? el("div.sousbloc", {},
        UI.recevabilite("Ce KV est-il conforme à " + (m ? m.nom : "son marché") + " ?",
          KV.conformite(p, l), null, [])) : null,
      el("div.sousbloc", {},
        el("h3", {}, "Complétude — dix axes"),
        axes(l, apres),
        el("div.points-legende", {}, "cliquer un point le fait passer de en attente à prêt, puis sans objet")
      ),
      el("div.sousbloc", {},
        el("h3", {}, "Informations"),
        el("div.ligne", {}, el("span.etiq", {}, "Support"), el("span.val", {}, s ? s.nom : "—")),
        el("div.ligne", {}, el("span.etiq", {}, "Marché"), el("span.val", {}, m ? m.nom + " · " + (m.langues || []).join(", ") : "—")),
        el("div.ligne", {}, el("span.etiq", {}, "Format"), el("span.val" + (g && g.dimensions ? "" : ".vide"), {}, g && g.dimensions ? g.dimensions : "gabarit non renseigné")),
        el("div.ligne", {}, el("span.etiq", {}, "Remise fichier"), el("span.val" + (l.remise ? "" : ".vide"), {}, l.remise ? O.joli(l.remise) : "non fixée")),
        el("div.ligne", {}, el("span.etiq", {}, "Publication"), el("span.val" + (l.publication ? "" : ".vide"), {}, l.publication ? O.joli(l.publication) : "non fixée")),
        el("div.ligne", {}, el("span.etiq", {}, "Origine"), el("span.val", {},
          l.origine === "prevu" ? "prévu par la proposition retenue" : "ajouté après validation — une reprise s'ouvre"))
      ),
      (l.entrees || []).length ? el("div.sousbloc", {},
        el("h3", {}, "Éléments d'entrée"),
        el("div", {}, l.entrees.map(function (e) {
          var f = e.fournisseur ? DEPOT.trouve("personnes", e.fournisseur) : null;
          return UI.fileItem(null, e.quoi, f ? f.nom : "aucun fournisseur nommé",
            f ? null : UI.eti("bloque", "alerte"));
        }))
      ) : null
    );
  }

  function axes(l, apres) {
    var boite = el("div.points-r");
    function dessiner() {
      O.vider(boite);
      MAISON.points.forEach(function (a) {
        var etat = (l.points && l.points[a.cle]) || "attente";
        boite.appendChild(el("button.axe." + etat, {
          type: "button", title: a.nom + " — " + O.poste(a.poste).nom,
          onclick: function () {
            var suite = { attente: "pret", pret: "sansobjet", sansobjet: "attente" };
            l.points[a.cle] = suite[etat];
            DEPOT.enregistrer(); dessiner();
          },
        }, a.nom));
      });
    }
    dessiner();
    return boite;
  }

  function controles(p, l) {
    var b = p.sections.bigidea || {};
    var boite = el("div.criteres-l");
    function dessiner() {
      O.vider(boite);
      var g = REGLES.grille("livrable", l);
      var etat = l.grille || {};
      g.forEach(function (c) {
        var tenu = etat[c.cle] === true;
        boite.appendChild(el("button.critere-l" + (tenu ? ".tenu" : ".rate"), {
          type: "button", "aria-pressed": tenu ? "true" : "false",
          onclick: function (e) {
            etat[c.cle] = !tenu; l.grille = etat; DEPOT.enregistrer();
            e.currentTarget.classList.toggle("tenu", !tenu);
            e.currentTarget.classList.toggle("rate", tenu);
            e.currentTarget.setAttribute("aria-pressed", String(!tenu));
            e.currentTarget.querySelector(".marque").textContent = tenu ? "✕" : "✓";
            tenu = !tenu;
          },
        }, el("span.marque", { "aria-hidden": "true" }, tenu ? "✓" : "✕"), el("span", {}, c.texte)));
      });
    }
    dessiner();

    var accord = (b.criteres && b.criteres.length) ? PANNEAU.puces(b.criteres)
      : UI.banniere("", REGLES.prix("criteres-absents"));
    return el("div.sousbloc", {}, el("h3", {}, "Critères d'acceptation de l'idée"), accord,
      el("h3", {}, "Grille de refus"), boite);
  }

  /* ————————————————————— Décider ————————————————————— */

  /* Les quatre décisions, chacune avec ce qu'elle entraîne. */
  function choixVerdicts(p, l, choisir) {
    var piece = { type: "livrable", objet: l, projet: p, titre: l.nom,
      semaine: PLATEAU.semaineDe(PLATEAU.echeanceDe(p, l)) };
    return el("div.rc-verdicts", {}, MAISON.verdicts.map(function (v) {
      var c = COUT.verdict(piece, v.cle);
      var resume = c.alertes[0] || (c.jours ? "+" + c.jours + " j" : c.gagne[0] || c.effets[0] || "");
      return el("button.rc-v." + v.cle, { type: "button", onclick: function () { choisir(v); } },
        el("span.v-signe", { "aria-hidden": "true" }, v.signe),
        el("span.v-nom", {}, v.geste || v.nom),
        el("span.v-cout" + (c.alertes.length ? ".alerte" : ""), {}, resume));
    }));
  }

  function verdictDe(cle) {
    return MAISON.verdicts.filter(function (v) { return v.cle === cle; })[0] || null;
  }

  /* Ce que la pièce propose à qui la regarde : valider la version, ou demander
   * des modifs. Les réserves et le refus hors brief restent à un clic, sous
   * « Autre décision » : eux demandent d'écrire pourquoi. Pendant qu'une
   * validation peut encore s'annuler, la pièce le dit et propose de l'annuler. */
  function decider(p, l, apres) {
    var version = REMISE.versionCourante(l);
    if (!version) return null;
    var attente = validationEnCours(l);
    if (attente) {
      return el("div.rvp-decision", {},
        el("p.rvp-meta", { role: "status" }, "V" + attente.numero + " validée. Elle s'enregistre dans quelques secondes."),
        el("button.b.rvp-action", { type: "button", "data-geste": "annuler-validation",
          onclick: function () { annuler(attente); } }, "Annuler la validation"));
    }
    var contexte = etatPourVerdict(l, version.objet);
    function geste(cle) { return function () { juger(p, l, verdictDe(cle), apres, contexte); }; }
    var autres = MAISON.verdicts.filter(function (v) { return v.cle === "reserve" || v.cle === "hors"; });
    return el("div.rvp-decision", {},
      el("div.rvp-gestes", {},
        el("button.b.or.rvp-action", { type: "button", "data-geste": "valider", onclick: geste("approuve") },
          "Valider la V" + version.numero),
        el("button.b.rvp-action", { type: "button", "data-geste": "modifs", onclick: geste("retour") },
          "Demander des modifs")),
      autres.length ? el("details.rvp-autre", {}, el("summary", {}, "Autre décision"),
        el("div.rvp-gestes", {}, autres.map(function (v) {
          return el("button.b.nu", { type: "button", "data-geste": v.cle, onclick: geste(v.cle) }, v.geste || v.nom);
        }))) : null);
  }

  function criteres(p, l, apres, compact) {
    var b = p.sections.bigidea || {};
    var grille = controles(p, l);
    return el("div.revue-criteres", {},
      compact && b.criteres && b.criteres[0] ? el("p.revue-premier-critere", {}, b.criteres[0]) : null,
      !compact ? grille : null,
      el("div.sousbloc", {}, el("h3", {}, "Votre décision sur la V" + (l.version || 1)),
        choixVerdicts(p, l, function (v) { juger(p, l, v, apres); })),
      compact ? el("details", {}, el("summary", {}, "Voir tous les critères"), grille) : null
    );
  }

  /* Ce que chaque décision écrite demande d'écrire. */
  var DEMANDES = {
    retour: { champ: "Ce qu'il faut changer", bouton: "Envoyer la demande",
      vide: "Dites ce qu'il faut changer avant d'envoyer la demande." },
    reserve: { champ: "Vos réserves", bouton: "Valider avec réserves",
      vide: "Dites quelles réserves vous posez." },
    hors: { champ: "Ce qui sort du brief", bouton: "Refuser : hors brief",
      vide: "Dites ce qui sort du brief." },
  };

  /* Les retours encore ouverts sur l'image de cette version : ils disent déjà
   * ce qu'il faut changer, on ne les fait pas récrire. */
  function annotationsOuvertes(l, numero) {
    if (!window.ANNOT || !ANNOT.liste) return "";
    return ANNOT.liste(l, numero).map(function (a, i) { return { a: a, n: i + 1 }; })
      .filter(function (x) { return x.a.statut === "aTraiter" && x.a.texte; })
      .map(function (x) { return x.n + ". " + x.a.texte; }).join("\n");
  }

  /* Sans rien à écrire, la décision se pose d'un geste, comme avant la
   * confirmation ajoutée le 26 novembre. Sinon un seul panneau demande ce qu'il
   * faut changer, prérempli par les retours posés sur l'image. Dans les deux cas,
   * la version est celle qu'on regardait : si elle a changé, rien ne s'écrit. */
  function juger(p, l, verdict, apres, attendu) {
    var version = REMISE.versionCourante(l);
    if (!version) { AVIS.refus("Soumettez la version en cours avant de décider."); return; }
    var v = version.objet;
    var contexte = etatPourVerdict(l, v);
    if (attendu && (attendu !== contexte || v.verdict)) { AVIS.refus("La version a changé. Relisez la pièce avant de décider."); return; }
    if (!verdict.motifRequis) { engager(p, l, contexte, verdict, version.numero, apres); return; }
    var demande = DEMANDES[verdict.cle] || { champ: "Pourquoi", bouton: verdict.geste || verdict.nom, vide: "Dites pourquoi." };
    var marche = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var g = REGLES.grille("livrable", l);
    var etat = l.grille || {};
    var vides = g.filter(function (c) { return etat[c.cle] !== true; }).map(function (c) { return c.texte; });
    var enDessus = !!document.querySelector(".panneau[role='dialog']");
    var fermer = enDessus ? PANNEAU.fermerSur : PANNEAU.fermer;
    var champ = el("textarea", { id: "revue-motif", rows: 4, "aria-required": "true" });
    champ.value = annotationsOuvertes(l, version.numero);
    var statut = el("p.remise-erreur", { role: "alert" }, "");
    var formulaire = el("form.form", { onsubmit: function (e) {
      e.preventDefault();
      var motif = champ.value.trim();
      if (!motif) { statut.textContent = demande.vide; champ.focus(); return; }
      var erreur = poser(p.id, l.id, contexte, verdict, motif);
      if (erreur) { statut.textContent = erreur; return; }
      fermer();
      if (apres) apres();
    } }, el("p", {}, "Votre décision sur la V" + version.numero + " · " + (marche ? marche.nom : "Marché non renseigné")),
      v.verdict ? el("p", {}, "Cette version a déjà une décision. La nouvelle s'ajoute à son historique.") : null,
      el("div.champ", {},
        el("label", { for: "revue-motif" }, demande.champ), champ,
        vides.length ? el("details", {}, el("summary", {}, "Reprendre un critère non tenu"),
          el("div.form-actions", {}, vides.map(function (critere) {
            return el("button.motif", { type: "button", onclick: function () {
              champ.value = (champ.value.trim() ? champ.value.trim() + "\n" : "") + critere; champ.focus();
            } }, critere);
          }))) : null),
      statut,
      el("div.form-actions", {},
        el("button.b.or", { type: "submit" }, demande.bouton),
        el("button.b.nu", { type: "button", onclick: fermer }, "Annuler")));
    (enDessus ? PANNEAU.sur : PANNEAU.ouvrir)(verdict.geste || verdict.nom, window.KV && KV.titre ? KV.titre(l) : l.nom, formulaire);
  }

  /* ————— Valider, avec le temps de se reprendre —————
   *
   * Une validation ne s'écrit pas tout de suite. Pendant huit secondes,
   * « Annuler » la reprend sans qu'aucune décision ait existé : Radar ne lit
   * donc jamais une validation qu'on retire. À l'échéance, ou plus tôt si la
   * page se ferme (pagehide), elle s'écrit comme les autres, avec la même garde
   * de version. */
  var DELAI_ANNULATION = 8000;
  var engagements = [];

  function validationEnCours(l) {
    return engagements.filter(function (e) { return e.livrableId === l.id; })[0] || null;
  }

  function engager(p, l, contexte, verdict, numero, apres) {
    var e = { projetId: p.id, livrableId: l.id, contexte: contexte, verdict: verdict, numero: numero, apres: apres };
    /* Sans pile d'avis (un rejeu, le compilateur), rien à annuler : elle se pose. */
    if (!window.AVIS || !AVIS.action) { conclure(e); return; }
    if (validationEnCours(l)) return;
    engagements.push(e);
    ecouterFermeture();
    e.minuterie = setTimeout(function () { conclure(e); }, DELAI_ANNULATION);
    e.avis = AVIS.action("V" + numero + " validée.", "Annuler", function () { annuler(e); }, DELAI_ANNULATION);
    if (apres) apres();
  }

  function desengager(e) {
    var i = engagements.indexOf(e);
    if (i === -1) return false;
    engagements.splice(i, 1);
    clearTimeout(e.minuterie);
    if (e.avis && window.AVIS) AVIS.retirer(e.avis);
    return true;
  }

  function conclure(e, sansSuite) {
    desengager(e);
    var erreur = poser(e.projetId, e.livrableId, e.contexte, e.verdict, "");
    if (erreur && window.AVIS) AVIS.refus(erreur);
    if (!sansSuite && e.apres) e.apres();
  }

  function annuler(e) {
    if (!desengager(e)) return;
    AVIS.fait("Validation annulée : rien n'a été enregistré.");
    if (e.apres) e.apres();
  }

  /* Une page qui se ferme n'attend pas l'échéance : ce qui est engagé s'écrit. */
  var fermetureEcoutee = false;
  function ecouterFermeture() {
    if (fermetureEcoutee || !window.addEventListener) return;
    fermetureEcoutee = true;
    window.addEventListener("pagehide", function () {
      engagements.slice().forEach(function (e) { conclure(e, true); });
    });
  }

  function etatPourVerdict(l, v) {
    return JSON.stringify([l.version, l.marche, l.support, l.vignette, l.review, l.fichiers, l.grille, v]);
  }

  function poser(projetId, livrableId, contexte, verdict, motif) {
    var p = DEPOT.trouve("projets", projetId);
    var l = p && !p.fusionne && !(window.CLOTURE && CLOTURE.est(p)) && (p.livrables || []).find(function (x) {
      return x.id === livrableId && !x.annule;
    });
    var version = l && REMISE.versionCourante(l);
    if (!version || etatPourVerdict(l, version.objet) !== contexte)
      return "La pièce a changé pendant votre décision : rien n'est enregistré. Rouvrez sa version en cours.";
    var v = version.objet;
    if (v.verdict === verdict.cle && (v.motif || "") === motif) return null;
    var quand = new Date().toISOString();
    var decision;
    try {
      decision = DECISION.construire({ objet: l.id, type: "livrable", projet: p.id, verdict: verdict.cle,
        motif: motif, quand: quand, qui: MAISON.titulaire, titre: l.nom });
    } catch (e) { return e.message; }
    v.verdict = verdict.cle; v.motif = motif; v.juge_le = quand;
    if (verdict.cle === "approuve") {
      if (!l.points) l.points = {};
      l.points.central = "pret";
    }
    DECISION.ajouter(decision);
    DEPOT.enregistrer();
    return null;
  }

  function dependances(p, l, apres) {
    var liens = [];
    if (l.maitre) {
      var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
      if (m) liens.push({ nom: m.nom, ok: !REGLES.maitrePerime(p, l) });
    }
    (l.entrees || []).forEach(function (e) { liens.push({ nom: e.quoi, ok: !!e.fournisseur }); });
    (l.assets || []).forEach(function (aid) {
      var a = DEPOT.trouve("assets", aid);
      if (!a) {
        liens.push({ nom: "Élément de marque introuvable · " + aid, ok: false });
        return;
      }
      var droits = REGLES.droitsInsuffisants(Object.assign({}, l, { assets: [aid] }));
      liens.push({ nom: a.nom, ok: droits ? false : a.aQualifier ? null : true });
    });
    var adapt = REGLES.adaptations(p, l.id);
    adapt.forEach(function (a) {
      var mm = DEPOT.trouve("marches", a.marche);
      liens.push({ nom: (mm ? mm.code : "") + " " + a.nom.slice(0, 10), ok: !REGLES.maitrePerime(p, a) });
    });

    if (!liens.length) {
      return l.maitre ? reference(p, l, apres) : el("div", {}, UI.banniere("", "Aucune dépendance renseignée pour ce livrable."));
    }

    var manquants = liens.filter(function (x) { return x.ok === false; }).length;
    var aQualifier = liens.filter(function (x) { return x.ok === null; }).length;
    return el("div", {},
      reference(p, l, apres),
      manquants ? UI.banniere("rouge", manquants + (manquants > 1 ? " dépendances non satisfaites" : " dépendance non satisfaite")
        + " — c'est ce qui se découvre à l'impression quand on ne le regarde pas.") : null,
      aQualifier ? UI.banniere("", aQualifier + (aQualifier > 1 ? " références à qualifier" : " référence à qualifier")
        + " : vérifier la version et les droits avant usage.") : null,
      el("div.graphe-boite", {}, UI.graphe({ nom: l.nom, ok: manquants ? false : aQualifier ? null : true }, liens)),
      el("div", {}, liens.map(function (x) {
        return UI.fileItem(null, x.nom, null, UI.eti(x.ok === null ? "à qualifier" : x.ok ? "ok" : "manque",
          x.ok === null ? "terne" : x.ok ? "vert" : "alerte"));
      }))
    );
  }

  function reference(p, l, apres) {
    if (!l.maitre) return null;
    var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
    if (!m || m.annule) return UI.banniere("rouge", "La référence manque. Les fichiers et le travail restent au dossier ; leur rattachement est à vérifier.");
    return el("div.sousbloc", {}, el("h3", {}, "Référence du travail"),
      el("p", {}, m.nom + " · V" + (l.versionMaitre || "?") + " utilisée · V" + (m.version || 1) + " courante"),
      REGLES.maitrePerime(p, m) ? UI.banniere("", "La référence doit elle-même être reprise sur son parent. La préparation reste possible.") : null,
      REGLES.maitrePerime(p, l) ? el("button.b", { type: "button", onclick: function () { reprendre(p, l, m, apres); } }, "Recevoir la reprise sur cette référence") : null);
  }

  function reprendre(p, l, m, apres) {
    var attendu = { version: l.version || 1, maitreId: m.id, versionMaitre: m.version || 1, contenuMaitre: JSON.stringify(m.kv || {}), contenuLivrable: JSON.stringify(l) };
    var motif = el("textarea", { rows: 3, "aria-label": "Ajustements de la reprise" });
    var confirme = el("input", { type: "checkbox", "aria-label": "Travail ajusté sur cette référence" });
    PANNEAU.sur("Recevoir une reprise", m.nom + " · V" + attendu.versionMaitre, el("div", {},
      UI.banniere("", "Vérifiez le contenu et ajustez le travail avant de recevoir cette reprise. Une nouvelle version conserve l'ancien état ; les fichiers et accords antérieurs ne deviennent pas ceux de cette version."),
      el("div", {}, KV.axes(p).map(function (c) {
        return el("div.champ", {}, el("label", {}, c.nom),
          el("p", {}, "Référence : " + (FORM.texte(c, (m.kv || {})[c.cle]) || "Non renseigné")),
          l.kv ? el("p", {}, "Ce KV : " + (FORM.texte(c, l.kv[c.cle]) || "Non renseigné")) : null);
      })),
      el("div.champ", {}, el("label", {}, "Ce qui a été ajusté, ou pourquoi aucun ajustement n'était nécessaire"), motif),
      el("label", {}, confirme, " J'ai vérifié et ajusté ce travail sur cette référence."),
      el("div.form-actions", {}, el("button.b.or", { type: "button", onclick: function () {
        if (!confirme.checked) { AVIS.refus("Vérifier et ajuster le travail avant de recevoir sa reprise."); return; }
        try { KV.reprendreReference(p, l, attendu, motif.value); }
        catch (e) { AVIS.refus(e.message); return; }
        DEPOT.tracer("reprise reçue", "livrables", p.id, l.nom + " sur " + m.nom + " V" + attendu.versionMaitre);
        DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
      } }, "Recevoir la reprise"), el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  function historique(l) {
    var vs = (l.versions || []);
    if (!vs.length) return el("p.rien", {}, "Aucune version soumise.");
    return el("div", {}, vs.slice().reverse().map(function (v) {
      var vd = null;
      MAISON.verdicts.forEach(function (x) { if (x.cle === v.verdict) vd = x; });
      return el("div.ligne", {},
        el("span.etiq", {}, "V" + v.n + " · " + O.joli(v.soumis_le)),
        el("span.val", { style: vd ? { color: vd.couleur } : {} },
          vd ? vd.signe + " " + vd.nom + (v.motif ? " — " + v.motif : "") : "en attente de verdict"));
    }));
  }

  /* ————————————————————— Les gestes ————————————————————— */

  function actions(p, l, apres) {
    return el("div.form-actions", { style: { "margin-top": "1.2rem", "border-top": "1px solid var(--trait)", "padding-top": ".8rem" } },
      el("button.b.or", { type: "button", onclick: function () {
        var n = (l.versions || []).length + 1;
        if (!l.versions) l.versions = [];
        l.versions.push({ n: n, soumis_le: new Date().toISOString(), verdict: null });
        l.version = n;
        DEPOT.tracer("soumission", "livrables", p.id, l.nom + " V" + n);
        DEPOT.enregistrer();
        if (apres) apres();
      } }, "Soumettre une version"),
      /* Un clic, et l'exécutant a tout : le brief de production compile ce que
       * le modèle sait déjà de ce livrable, et nomme ce qui manque. */
      BRIEF_PRODUCTION.bouton(p, l),
      el("button.b", { type: "button", onclick: function () { VUE_MATRICE.editer(p, l, apres); } }, "Modifier"),
      el("button.b", { type: "button", onclick: function () {
        RENVOI.ouvrir({ quoi: l.nom, projet: p.ref, projetId: p.id, objet: l.id });
      } }, "Renvoyer")
    );
  }

  return { ouvrir: ouvrir, ouvrirFiche: ouvrirFiche,
    criteres: criteres, controles: controles, decider: decider, juger: juger,
    validationEnCours: validationEnCours, dependances: dependances };
})();
