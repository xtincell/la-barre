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
    if (!v.verdict) return "en attente de décision";
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
              return UI.fileItem(null, (i + 1) + " · " + a.texte,
                ANNOT.auteur(a) + " · " + O.joli(a.quand) + " · V" + a.version,
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
    var bloc;
    if (attente) {
      bloc = el("div.rvp-decision", { "data-livrable": l.id },
        el("p.rvp-meta", { role: "status" }, "V" + attente.numero + " validée. Elle s'enregistre dans quelques secondes."),
        el("button.b.rvp-action", { type: "button", "data-geste": "annuler-validation",
          onclick: function () { annuler(attente); } }, "Annuler la validation"));
    } else if (ecriteAilleurs(l, version.numero)) {
      /* La base de cette page ne l'a pas : reproposer « Valider » écrirait une
       * seconde décision. */
      bloc = el("div.rvp-decision", { "data-livrable": l.id },
        el("p.rvp-meta", { role: "status" }, "V" + version.numero + " validée depuis un autre onglet. Rechargez la page pour la voir."),
        el("button.b.rvp-action", { type: "button", "data-geste": "recharger",
          onclick: function () { location.reload(); } }, "Recharger la page"));
    } else {
      var contexte = etatPourVerdict(l, version.objet);
      var geste = function (cle) { return function () { juger(p, l, verdictDe(cle), apres, contexte); }; };
      var autres = MAISON.verdicts.filter(function (v) { return v.cle === "reserve" || v.cle === "hors"; });
      bloc = el("div.rvp-decision", { "data-livrable": l.id },
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
    /* Le redessin de l'écran qui dessine ce bloc : c'est lui que l'échéance
     * appelle, tant que le bloc est affiché (redessiner). */
    bloc.redessinerDecision = apres;
    return bloc;
  }

  /* Une version déjà décidée : la décision, et de quoi en changer. La nouvelle
   * décision s'ajoute à l'historique ; même une validation passe alors par le
   * panneau, qui le dit, et jamais par un clic. */
  function decisionRendue(p, l, version, apres, lecture) {
    var v = version.objet, def = verdictDe(v.verdict);
    return el("div.rvp-decidee", {},
      el("p", {}, UI.eti(def ? def.nom : "Décision enregistrée", v.verdict === "approuve" ? "vert" : "attente"),
        v.juge_le ? " " + O.joli(v.juge_le) : null),
      v.motif ? el("p.rvp-motif", {}, v.motif) : null,
      lecture ? null : changerDecision(p, l, version, apres));
  }

  /* De quoi changer une décision déjà prise : sur la fiche comme sur la page
   * de la pièce, là où on l'a prise. */
  function changerDecision(p, l, version, apres) {
    var v = version.objet;
    var autres = MAISON.verdicts.filter(function (x) { return x.cle !== v.verdict; });
    return el("details.rvp-autre", {}, el("summary", {}, "Changer la décision"),
      el("p.rvp-note", {}, "La nouvelle décision s'ajoute à l'historique de la V" + version.numero + "."),
      el("div.rvp-gestes", {}, autres.map(function (x) {
        return el("button.b.nu", { type: "button", "data-geste": x.cle,
          onclick: function () { juger(p, l, x, apres); } }, x.geste || x.nom);
      })));
  }

  /* L'onglet « Critères et décision » de la fiche : les mêmes deux boutons
   * que la page de la pièce, « Autre décision » en dessous. */
  function criteres(p, l, apres, compact) {
    var b = p.sections.bigidea || {};
    var grille = controles(p, l);
    var version = REMISE.versionCourante(l);
    var lecture = !version || l.annule || p.fusionne || (window.CLOTURE && CLOTURE.est(p));
    return el("div.revue-criteres", { "data-livrable": l.id },
      compact && b.criteres && b.criteres[0] ? el("p.revue-premier-critere", {}, b.criteres[0]) : null,
      !compact ? grille : null,
      el("div.sousbloc", {}, el("h3", {}, "Votre décision sur la V" + (version ? version.numero : l.version || 1)),
        !version ? el("p.rien", {}, "Aucune version à décider : soumettez d'abord la version en cours.")
          : version.objet.verdict ? decisionRendue(p, l, version, apres, lecture)
          : lecture ? el("p.rien", {}, "Ce dossier est clos : la pièce se consulte.")
          : decider(p, l, apres)),
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
    if (!v.verdict && ecriteAilleurs(l, version.numero)) {
      AVIS.refus("La V" + version.numero + " a déjà été validée depuis un autre onglet. Rechargez la page avant de décider.");
      return;
    }
    if (!verdict.motifRequis && !v.verdict) { engager(p, l, contexte, verdict, version.numero, apres); return; }
    /* Une validation sur une version déjà décidée passe par ce panneau : il dit
     * qu'elle s'ajoute à l'historique, et un mot y reste facultatif. */
    var demande = !verdict.motifRequis
      ? { champ: "Un mot sur cette validation (facultatif)", bouton: "Valider la V" + version.numero }
      : DEMANDES[verdict.cle] || { champ: "Pourquoi", bouton: verdict.geste || verdict.nom, vide: "Dites pourquoi." };
    var marche = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var g = REGLES.grille("livrable", l);
    var etat = l.grille || {};
    var vides = g.filter(function (c) { return etat[c.cle] !== true; }).map(function (c) { return c.texte; });
    var enDessus = !!document.querySelector(".panneau[role='dialog']");
    var fermer = enDessus ? PANNEAU.fermerSur : PANNEAU.fermer;
    var champ = el("textarea", { id: "revue-motif", rows: 4, "aria-required": verdict.motifRequis ? "true" : null });
    if (verdict.motifRequis) champ.value = annotationsOuvertes(l, version.numero);
    var statut = el("p.remise-erreur", { role: "alert" }, "");
    var formulaire = el("form.form", { onsubmit: function (e) {
      e.preventDefault();
      var motif = champ.value.trim();
      if (!motif && verdict.motifRequis) { statut.textContent = demande.vide; champ.focus(); return; }
      var erreur = poser(p.id, l.id, contexte, verdict, motif);
      if (erreur) { statut.textContent = erreur; return; }
      fermer();
      if (apres) apres();
    } }, el("p", {}, "Votre décision sur la V" + version.numero + " · " + (marche ? marche.nom : "Marché non renseigné")),
      v.verdict ? el("p", {}, "Cette version a déjà une décision. La nouvelle s'ajoute à son historique.") : null,
      el("div.champ", {},
        el("label", { for: "revue-motif" }, demande.champ), champ,
        verdict.motifRequis && vides.length ? el("details", {}, el("summary", {}, "Reprendre un critère non tenu"),
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
   * donc jamais une validation qu'on retire. À l'échéance, elle s'écrit comme
   * les autres, avec la même garde de version.
   *
   * Dès le clic, la validation engagée est notée dans ce navigateur
   * (localStorage, écrit sur-le-champ). C'est la seule écriture qui survit
   * sûrement à une page qu'on ferme : la copie de reprise est asynchrone, et la
   * sauvegarde ne part que 900 ms après le geste ; ni l'une ni l'autre n'aboutit
   * pendant pagehide. Une page qui se ferme avant l'échéance marque donc sa
   * note « à rejouer » ; à la prochaine ouverture, une fois la base de référence
   * lue, la validation s'écrit (reprendreValidations), ou elle est abandonnée
   * avec un avis si la pièce a changé entre-temps.
   *
   * Qui retire la note l'écrit : un autre onglet qui l'a rejouée la tient, et
   * cette page ne l'écrit pas une seconde fois. */
  var DELAI_ANNULATION = 8000;
  /* Une note jamais marquée (un onglet tué sans pagehide) se rejoue passé ce délai. */
  var ABANDON = DELAI_ANNULATION + 120000;
  var CLE_NOTES = "la-barre-validations";
  var engagements = [];
  var notesCreees = 0;
  /* Les validations qu'un autre onglet a écrites pendant le délai de celle-ci
   * (echeance, « ailleurs ») : la base de cette page ne les a pas encore. */
  var ecritesAilleurs = [];
  function ecriteAilleurs(l, numero) {
    return ecritesAilleurs.some(function (x) { return x.livrableId === l.id && String(x.numero) === String(numero); });
  }

  function validationEnCours(l) {
    return engagements.filter(function (e) { return e.livrableId === l.id; })[0] || null;
  }

  function notes() {
    try {
      var brut = window.localStorage ? window.localStorage.getItem(CLE_NOTES) : null;
      var n = brut ? JSON.parse(brut) : [];
      return Array.isArray(n) ? n.filter(function (x) { return x && typeof x.id === "string"; }) : [];
    } catch (e) { return []; }
  }
  function ecrireNotes(n) {
    try {
      if (n.length) window.localStorage.setItem(CLE_NOTES, JSON.stringify(n));
      else window.localStorage.removeItem(CLE_NOTES);
      return true;
    } catch (e) { return false; }
  }
  /* Retirer une note, c'est la prendre : seul celui qui la retire l'écrit. */
  function prendre(id) {
    var n = notes(), pris = null;
    n = n.filter(function (x) { if (!pris && x.id === id) { pris = x; return false; } return true; });
    if (pris) ecrireNotes(n);
    return pris;
  }
  function marquer(ids, rejouer) {
    var n = notes(), change = false;
    n.forEach(function (x) {
      if (ids.indexOf(x.id) !== -1 && !!x.rejouer !== rejouer) { x.rejouer = rejouer; change = true; }
    });
    if (change) ecrireNotes(n);
  }
  /* La note ne garde pas la pièce entière (sa vignette peut peser) : une
   * empreinte suffit à reconnaître la version qu'on regardait. */
  function empreinte(texte) {
    var h = 2166136261;
    for (var i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return texte.length + ":" + h.toString(36);
  }
  function noter(e) {
    if (!window.localStorage || (window.DEPOT && DEPOT.estDemonstration && DEPOT.estDemonstration())) return false;
    var n = notes();
    n.push({ id: e.id, fichier: window.DEPOT && DEPOT.fichierServi ? DEPOT.fichierServi() : null,
      projetId: e.projetId, livrableId: e.livrableId, numero: e.numero, verdict: e.verdict.cle,
      empreinte: empreinte(e.contexte), titre: e.titre, quand: new Date().toISOString(), rejouer: false });
    return ecrireNotes(n);
  }

  function engager(p, l, contexte, verdict, numero, apres) {
    var e = { projetId: p.id, livrableId: l.id, contexte: contexte, verdict: verdict, numero: numero,
      titre: window.KV && KV.titre ? KV.titre(l) : l.nom, apres: apres };
    /* Sans pile d'avis (un rejeu, le compilateur), rien à annuler : elle se pose. */
    if (!window.AVIS || !AVIS.action) { conclure(e); if (apres) apres(); return; }
    if (validationEnCours(l)) return;
    e.id = "VAL-" + Date.now().toString(36) + "-" + (++notesCreees);
    var demonstration = window.DEPOT && DEPOT.estDemonstration && DEPOT.estDemonstration();
    e.note = noter(e);
    /* Un navigateur qui refuse la note (plein, ou privé) : la validation
     * s'écrit tout de suite, sans délai d'annulation, plutôt que de risquer
     * d'être perdue. La démonstration n'écrit nulle part : elle garde le délai. */
    if (!e.note && !demonstration) {
      if (conclure(e)) AVIS.fait("V" + numero + " validée.");
      if (apres) apres();
      return;
    }
    engagements.push(e);
    ecouterFermeture();
    e.minuterie = setTimeout(function () { echeance(e); }, DELAI_ANNULATION);
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

  /* Redessiner les écrans qui montrent encore cette pièce, et eux seuls :
   * chaque bloc de décision garde le redessin de l'écran qui l'a dessiné. Un
   * écran quitté puis rouvert est redessiné par son propre rendu ; une échéance
   * venue d'un autre écran ne rouvre rien. */
  function redessiner(e) {
    if (!window.document || !document.querySelectorAll) return 0;
    var faits = [];
    [].slice.call(document.querySelectorAll(".rvp-decision[data-livrable]")).forEach(function (n) {
      var f = n.redessinerDecision;
      if (n.getAttribute("data-livrable") !== e.livrableId || typeof f !== "function") return;
      if (n.isConnected === false || faits.indexOf(f) !== -1) return;
      faits.push(f); f();
    });
    return faits.length;
  }

  /* La pièce n'est plus à l'écran : un avis court dit que sa validation est
   * écrite. La file de Décisions et le Bureau, qui la listaient encore, se
   * redessinent, sauf si l'on y est en train d'écrire ou de choisir. */
  function faireSavoir(e) {
    /* Les mêmes mots que pour une validation rejouée (rejouer) : un même
     * événement se dit d'une seule façon. */
    if (window.AVIS) AVIS.fait("Validation de la V" + e.numero + " de « " + e.titre + " » enregistrée.");
    var liste = /^#\/(bureau|valider|decider|revue|direction)(\/|$)|^#?\/?$/.test((window.location && location.hash) || "");
    var actif = window.document && document.activeElement;
    var saisie = !!actif && /^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName || "");
    if (liste && !saisie && window.APP && APP.rendre) {
      var x = window.scrollX, y = window.scrollY; APP.rendre(); window.scrollTo(x, y);
    }
  }

  /* Écrire la validation. Rend vrai si elle est enregistrée. */
  function conclure(e) {
    var erreur = poser(e.projetId, e.livrableId, e.contexte, e.verdict, "");
    e.issue = erreur ? "refusee" : "ecrite";
    if (erreur && window.AVIS) AVIS.refus(erreur);
    return !erreur;
  }

  function echeance(e) {
    if (!desengager(e)) return;
    /* La note a déjà été prise : un autre onglet a écrit cette validation. */
    if (e.note && !prendre(e.id)) {
      e.issue = "ailleurs";
      ecritesAilleurs.push({ livrableId: e.livrableId, numero: e.numero });
      if (window.AVIS) AVIS.fait("La V" + e.numero + " a été enregistrée depuis un autre onglet. Rechargez la page pour la voir.");
      redessiner(e);
      return;
    }
    var ecrite = conclure(e);
    if (!redessiner(e) && ecrite) faireSavoir(e);
  }

  function annuler(e) {
    var engagee = desengager(e);
    var notee = e.note ? !!prendre(e.id) : engagee;
    if (!engagee || !notee) {
      AVIS.fait(e.issue === "refusee" ? "Cette validation n'a pas été enregistrée : la pièce avait changé."
        : "La validation est déjà enregistrée.");
    } else {
      AVIS.fait("Validation annulée : rien n'a été enregistré.");
    }
    redessiner(e);
  }

  /* Une page qui se ferme marque ses validations à rejouer : elles s'écriront
   * à la prochaine ouverture. Revenue du cache de navigation, elle reprend ses
   * minuteries, et ses validations s'écrivent ici, à leur échéance. */
  var fermetureEcoutee = false;
  function ecouterFermeture() {
    if (fermetureEcoutee || !window.addEventListener) return;
    fermetureEcoutee = true;
    function notees() {
      return engagements.filter(function (e) { return e.note; }).map(function (e) { return e.id; });
    }
    window.addEventListener("pagehide", function () { var ids = notees(); if (ids.length) marquer(ids, true); });
    window.addEventListener("pageshow", function (ev) {
      var ids = notees(); if (ev && ev.persisted && ids.length) marquer(ids, false);
    });
    /* Une page passée à l'arrière-plan avant l'échéance peut être fermée, ou
     * gelée par un téléphone, sans rien écrire : sa validation attend alors la
     * prochaine ouverture. L'avis le dit, pour qui revient le lire. */
    if (window.document && document.addEventListener) document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "hidden") return;
      engagements.forEach(function (e) {
        var t = e.note && e.avis && e.avis.querySelector ? e.avis.querySelector(".avis-t") : null;
        if (t) t.textContent = "V" + e.numero + " validée. Si cette page se ferme maintenant, "
          + "elle s'enregistrera à votre prochaine ouverture de La Barre.";
      });
    });
  }

  /* À l'ouverture, une fois la base de référence lue (application.js) : les
   * validations engagées dans une page fermée avant leur échéance s'écrivent,
   * avec la même garde de version. Une pièce qui a changé entre-temps n'est pas
   * validée à l'aveugle : la note est abandonnée, et l'avis le dit.
   *
   * `surPlace` : la reprise vient d'un onglet resté ouvert, prévenu qu'un autre
   * s'est fermé (application.js, événement storage). Sa base peut être en
   * retard sur celle de l'onglet fermé : une note qu'elle ne reconnaît pas
   * n'est pas abandonnée, elle reste pour la prochaine ouverture. */
  function reprendreValidations(options) {
    if (!window.DEPOT || !DEPOT.baseLue || !DEPOT.baseLue()) return 0;
    var surPlace = !!(options && options.surPlace);
    var fichier = DEPOT.fichierServi ? DEPOT.fichierServi() : null;
    var maintenant = Date.now(), n = 0;
    notes().forEach(function (x) {
      if (x.fichier && x.fichier !== fichier) return;
      if (engagements.some(function (e) { return e.id === x.id; })) return;
      if (!x.rejouer && !(maintenant - Date.parse(x.quand) > ABANDON)) return;
      if (surPlace && etatDeNote(x).cle === "changee") return;
      if (!prendre(x.id)) return;
      /* Ne compte que ce qui change quelque chose à l'écran : une validation
       * écrite, ou abandonnée avec un avis. Une note déjà écrite ne redessine
       * rien. */
      if (rejouer(x) !== "deja") n++;
    });
    return n;
  }

  /* Ce que la base de cette page dit d'une note : déjà écrite, à écrire, ou
   * pièce changée depuis. */
  function etatDeNote(x) {
    var p = DEPOT.trouve("projets", x.projetId);
    var l = p && (p.livrables || []).filter(function (y) { return y.id === x.livrableId; })[0];
    var version = l && REMISE.versionCourante(l);
    var meme = version && String(version.numero) === String(x.numero);
    if (meme && version.objet.verdict === x.verdict) return { cle: "ecrite" };
    var contexte = meme ? etatPourVerdict(l, version.objet) : null;
    if (!verdictDe(x.verdict) || !contexte || version.objet.verdict || empreinte(contexte) !== x.empreinte) return { cle: "changee" };
    return { cle: "a-ecrire", contexte: contexte };
  }

  function rejouer(x) {
    var verdict = verdictDe(x.verdict);
    var nom = "la V" + x.numero + (x.titre ? " de « " + x.titre + " »" : "");
    var etat = etatDeNote(x);
    /* Déjà écrite (avant la fermeture, ou par un autre poste) : rien à refaire. */
    if (etat.cle === "ecrite") return "deja";
    var contexte = etat.contexte;
    if (etat.cle === "changee") {
      /* Un avis qui reste : la personne croyait cette validation enregistrée. */
      if (window.AVIS) AVIS.grave("La validation de " + nom + " n'a pas été enregistrée : la pièce a changé depuis. "
        + "Relisez-la, et validez-la de nouveau si c'est toujours votre décision.");
      return "abandonnee";
    }
    /* Datée du moment où elle se serait écrite (le clic, plus le délai
     * d'annulation), pas de son rejeu : le délai de décision du Bilan et la date
     * que lit Radar restent ceux du geste. */
    var clic = Date.parse(x.quand);
    var quand = isFinite(clic) ? new Date(Math.min(clic + DELAI_ANNULATION, Date.now())).toISOString() : null;
    var erreur = poser(x.projetId, x.livrableId, contexte, verdict, "", quand);
    if (window.AVIS) {
      if (erreur) AVIS.grave("La validation de " + nom + " n'a pas été enregistrée. " + erreur);
      else AVIS.fait("Validation de " + nom + " enregistrée.");
    }
    return erreur ? "abandonnee" : "ecrite";
  }

  function etatPourVerdict(l, v) {
    return JSON.stringify([l.version, l.marche, l.support, l.vignette, l.review, l.fichiers, l.grille, v]);
  }

  /* `quand`, facultatif, date la décision ; sans lui, c'est maintenant. */
  function poser(projetId, livrableId, contexte, verdict, motif, quand) {
    var p = DEPOT.trouve("projets", projetId);
    var l = p && !p.fusionne && !(window.CLOTURE && CLOTURE.est(p)) && (p.livrables || []).find(function (x) {
      return x.id === livrableId && !x.annule;
    });
    var version = l && REMISE.versionCourante(l);
    if (!version || etatPourVerdict(l, version.objet) !== contexte)
      return "La pièce a changé pendant votre décision : rien n'est enregistré. Rouvrez sa version en cours.";
    var v = version.objet;
    if (v.verdict === verdict.cle && (v.motif || "") === motif) return null;
    quand = quand || new Date().toISOString();
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
          vd ? vd.signe + " " + vd.nom + (v.motif ? " — " + v.motif : "") : "en attente de décision"));
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
    criteres: criteres, controles: controles, decider: decider, juger: juger, changerDecision: changerDecision,
    validationEnCours: validationEnCours, valideeAilleurs: ecriteAilleurs,
    reprendreValidations: reprendreValidations, dependances: dependances };
})();
