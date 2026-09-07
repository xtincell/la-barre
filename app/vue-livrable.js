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
    { cle: "apercu", nom: "APERÇU" },
    { cle: "criteres", nom: "CRITÈRES & REVIEW" },
    { cle: "retours", nom: "RETOURS & SITUATION" },
    { cle: "production", nom: "PRODUCTION" },
    { cle: "dependances", nom: "DÉPENDANCES" },
    { cle: "historique", nom: "HISTORIQUE" },
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
            UI.stat("TOURS CONSOMMÉS", t.faits + " / " + (t.vendus || "—"),
              t.vendus && t.faits > t.vendus ? "au-delà du vendu" : "dans le périmètre",
              t.vendus && t.faits > t.vendus ? "alerte" : ""),
            UI.stat("TEMPS", l.reel ? l.reel + " j" : "—",
              l.estime ? "estimé : " + l.estime + " j" + (l.reel && l.estime ? " · " + ecart(l) : "") : "aucune estimation",
              l.reel && l.estime && l.reel > l.estime ? "alerte" : ""),
            UI.stat("COMPLÉTUDE", REGLES.pretSur(l).part + " %",
              REGLES.pretSur(l).pret + (REGLES.pretSur(l).pret > 1 ? " points prêts sur " : " point prêt sur ")
                + REGLES.pretSur(l).total, "")
          )
        )
      ),

      perime ? UI.banniere("rouge", "Le master est passé en version " + versionMaitre(p, l)
        + ". Cette adaptation est à regénérer.") : null,
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
      coince.length === 0 && !manques.length ? "Ce livrable est prête" : "Que manque-t-il pour livrer ?",
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

  function versionMaitre(p, l) {
    var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
    return m ? m.version : "?";
  }

  /* ————————————————————— Les onglets ————————————————————— */

  function contenu(p, l, courant, apres) {
    if (courant === "criteres") return criteres(p, l, apres);
    if (courant === "retours") return retours(p, l, apres);
    if (courant === "production") return PRODUCTION.bloc(p, l, apres);
    if (courant === "dependances") return dependances(p, l);
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
        el("h3", {}, "RETOURS SUR LE VISUEL",
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
        el("h3", {}, "COMPLÉTUDE — DIX AXES"),
        axes(l, apres),
        el("div.points-legende", {}, "cliquer un point le fait passer de en attente à prêt, puis sans objet")
      ),
      el("div.sousbloc", {},
        el("h3", {}, "INFORMATIONS"),
        el("div.ligne", {}, el("span.etiq", {}, "Support"), el("span.val", {}, s ? s.nom : "—")),
        el("div.ligne", {}, el("span.etiq", {}, "Marché"), el("span.val", {}, m ? m.nom + " · " + (m.langues || []).join(", ") : "—")),
        el("div.ligne", {}, el("span.etiq", {}, "Format"), el("span.val" + (g && g.dimensions ? "" : ".vide"), {}, g && g.dimensions ? g.dimensions : "gabarit non renseigné")),
        el("div.ligne", {}, el("span.etiq", {}, "Remise fichier"), el("span.val" + (l.remise ? "" : ".vide"), {}, l.remise ? O.joli(l.remise) : "non fixée")),
        el("div.ligne", {}, el("span.etiq", {}, "Publication"), el("span.val" + (l.publication ? "" : ".vide"), {}, l.publication ? O.joli(l.publication) : "non fixée")),
        el("div.ligne", {}, el("span.etiq", {}, "Origine"), el("span.val", {},
          l.origine === "prevu" ? "prévu par la proposition retenue" : "ajouté après validation — une reprise s'ouvre"))
      ),
      (l.entrees || []).length ? el("div.sousbloc", {},
        el("h3", {}, "ÉLÉMENTS D'ENTRÉE"),
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

  function criteres(p, l, apres) {
    var b = p.sections.bigidea || {};
    var boite = el("div.criteres-l");
    function dessiner() {
      O.vider(boite);
      var g = REGLES.grille("livrable", l);
      var etat = l.grille || {};
      g.forEach(function (c) {
        var tenu = etat[c.cle] === true;
        boite.appendChild(el("div.critere-l" + (tenu ? ".tenu" : ".rate"), {
          onclick: function () { etat[c.cle] = !tenu; l.grille = etat; DEPOT.enregistrer(); dessiner(); },
        }, el("span.marque", {}, tenu ? "✓" : "✕"), el("span", {}, c.texte)));
      });
    }
    dessiner();

    return el("div", {},
      el("div.sousbloc", {}, el("h3", {}, "CRITÈRES D'ACCEPTATION DE L'IDÉE"),
        (b.criteres && b.criteres.length) ? PANNEAU.puces(b.criteres)
          : UI.banniere("", REGLES.prix("criteres-absents"))),
      el("div.sousbloc", {}, el("h3", {}, "CE QUI LE FAIT REFUSER"), boite),
      el("div.sousbloc", {}, el("h3", {}, "VERDICT — chacun porte son coût"),
        el("div.rc-verdicts", {}, MAISON.verdicts.map(function (v) {
          var piece = { type: "livrable", objet: l, projet: p, titre: l.nom,
            semaine: PLATEAU.semaineDe(PLATEAU.echeanceDe(p, l)) };
          var c = COUT.verdict(piece, v.cle);
          var resume = c.alertes.length ? c.alertes[0]
            : c.jours ? "+" + c.jours + " j"
            : c.gagne.length ? c.gagne[0] : (c.effets[0] || "");
          return el("button.rc-v." + v.cle, { type: "button", onclick: function () { juger(p, l, v, apres); } },
            el("span.v-signe", { style: { color: v.couleur } }, v.signe),
            el("span.v-nom", {}, v.nom),
            el("span.v-cout" + (c.alertes.length ? ".alerte" : ""), {}, resume.slice(0, 58)));
        })))
    );
  }

  function juger(p, l, verdict, apres) {
    var v = (l.versions || [])[l.versions.length - 1];
    if (!v) { AVIS.refus("Aucune version soumise : il n'y a rien à juger."); return; }

    if (!verdict.motifRequis) { poser(p, l, v, verdict, "", apres); return; }

    /* Le motif se choisit d'abord dans les critères écrits. Le texte libre
     * existe, il est le dernier de la liste — sinon chacun réinvente le
     * vocabulaire et rien n'est comparable d'un mois sur l'autre. */
    var g = REGLES.grille("livrable", l);
    var etat = l.grille || {};
    var vides = g.filter(function (c) { return etat[c.cle] !== true; }).map(function (c) { return c.texte; });

    PANNEAU.demander(verdict.nom, {
      etiquette: l.nom, label: "Le motif", lignes: 2,
      choix: vides,
      aide: vides.length
        ? "Cliquer un critère non tenu le recopie. Le texte libre reste possible, en dernier."
        : "Tous les critères écrits sont tenus : ce refus ne s'appuiera que sur du texte libre.",
      requis: "Un retour sans motif n'est pas un retour.",
      bouton: verdict.nom,
    }, function (motif) { poser(p, l, v, verdict, motif, apres); });
  }

  function poser(p, l, v, verdict, motif, apres) {
    v.verdict = verdict.cle; v.motif = motif; v.juge_le = new Date().toISOString();
    if (verdict.cle === "approuve") l.points.central = "pret";
    DEPOT.ajoute("decisions", { objet: l.id, type: "livrable", projet: p.id, verdict: verdict.cle,
      motif: motif, quand: v.juge_le, qui: MAISON.titulaire, titre: l.nom });
    DEPOT.enregistrer();
    if (apres) apres();
  }

  function dependances(p, l) {
    var liens = [];
    if (l.maitre) {
      var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
      if (m) liens.push({ nom: m.nom, ok: !REGLES.maitrePerime(p, l) });
    }
    (l.entrees || []).forEach(function (e) { liens.push({ nom: e.quoi, ok: !!e.fournisseur }); });
    (l.assets || []).forEach(function (aid) {
      var a = DEPOT.trouve("assets", aid);
      if (a) liens.push({ nom: a.nom, ok: !REGLES.droitsInsuffisants(l) });
    });
    var adapt = REGLES.adaptations(p, l.id);
    adapt.forEach(function (a) {
      var mm = DEPOT.trouve("marches", a.marche);
      liens.push({ nom: (mm ? mm.code : "") + " " + a.nom.slice(0, 10), ok: !REGLES.maitrePerime(p, a) });
    });

    if (!liens.length) {
      return el("div", {}, UI.banniere("vert", "Ce livrable ne dépend de rien et rien n'en dépend."));
    }

    var manquants = liens.filter(function (x) { return !x.ok; }).length;
    return el("div", {},
      manquants ? UI.banniere("rouge", manquants + (manquants > 1 ? " dépendances non satisfaites" : " dépendance non satisfaite")
        + " — c'est ce qui se découvre à l'impression quand on ne le regarde pas.") : null,
      el("div.graphe-boite", {}, UI.graphe({ nom: l.nom, ok: !manquants }, liens)),
      el("div", {}, liens.map(function (x) {
        return UI.fileItem(null, x.nom, null, UI.eti(x.ok ? "ok" : "manque", x.ok ? "vert" : "alerte"));
      }))
    );
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
    criteres: criteres, dependances: dependances };
})();
