/* vue-brief.js — le brief.
 *
 * Un brief ne se lit pas, il se reçoit. La question de cet écran est donc :
 * est-ce que je l'accepte ? Et l'accepter en l'état a un prix, qui est écrit.
 */

window.VUE_BRIEF = (function () {
  var el = O.el;


  /* Tous les champs de cette section, éditables un par un. La vue au-dessus
   * les met en scène ; ici on les corrige sans rouvrir tout le formulaire. */
  function champsEditables(p, rafraichir) {
    var def = CHAMPS.section("brief");
    if (!def) return null;
    return el("div.se-champs", {},
      el("div.sec-t", {}, "Tous les champs", el("span.studio-compte", {}, String(def.champs.length))),
      FORM.lire(def.champs, p.sections["brief"] || {},
        { projet: p, section: "brief",
          editer: function (k) { VUE_PROJETS.editerChamp(p, "brief", k, rafraichir); } }));
  }

  function estContextuel(p) {
    return ["demande", "pitch"].indexOf((NATURE.de(p) || {}).cle) !== -1;
  }

  function reception(p) {
    var d = p.sections.brief || {};
    var avecSource = !!String(p.briefSource || "").trim();
    var version = VERSION.num(d);
    var decision = d.statut === "accepte" && d.accepte_le && DEPOT.liste("decisions").find(function (x) {
      return x.type === "recevabilite" && x.projet === p.id && x.quand === d.accepte_le;
    });
    return {
      existe: avecSource || CHAMPS.etat("brief", d).fait > 0,
      statut: decision && decision.version && decision.version !== version ? null : d.statut || null,
      version: version,
    };
  }

  function rendre(p, rafraichir) {
    var nature = NATURE.de(p);
    var types = BRIEFS.pourNature(nature.cle);
    var campagne = window.CAMPAGNE && CAMPAGNE.de(p.campagneId);
    var contextuel = estContextuel(p);
    return el("div.bf.recevoir-brief", {},
      campagne ? el("p.bf-campagne", {},
        "Cadre partagé dans la campagne ",
        el("a", { href: "#/projets/" + campagne.id }, campagne.nom)) : null,
      nature.cle !== "pitch" || reception(p).existe ? corpsReception(p, rafraichir, contextuel) : null,
      types.length ? el("details.bf-options",
        nature.cle === "pitch" && !reception(p).existe ? { open: true } : {},
        el("summary", {}, "Briefs de travail"),
        bandeBriefs(p, types),
        lesAutres(p, types, rafraichir)) : null
    );
  }

  /* La question de l'écran : ce dossier est-il fondé ? */
  function bandeBriefs(p, types) {
    var etats = types.map(function (t) { return { t: t, e: BRIEFS.etat(t, p) }; });
    var poses = etats.filter(function (x) { return x.e.existe; });
    var recevables = etats.filter(function (x) { return x.e.recevable; });

    return UI.recevabilite("Sur quoi ce dossier est-il fondé ?",
      etats.map(function (x) {
        return { quoi: x.t.nom, ok: x.e.recevable, poids: x.t.cle === "campagne" ? 5 : 3,
          cout: BRIEFS.cout(x.t, x.e) };
      }),
      poses.length
        ? recevables.length + " brief" + (recevables.length > 1 ? "s" : "") + " sur "
          + types.length + " fondent quelque chose d'opposable."
        : "Aucun brief posé. Ce dossier avance sur ce qui s'est dit, et ce qui s'est "
          + "dit ne se relit pas.",
      []);
  }

  /* ————————————————————— Les autres briefs ————————————————————— */

  function lesAutres(p, types, rafraichir) {
    if (!types.length) return null;
    return el("div.bf-l", {},
      el("div.bfl-t", {}, "Les autres briefs de ce dossier",
        el("span.studio-compte", {}, String(types.length)),
        el("span.bfl-q", {}, "Chacun fonde une demande et pilote un suivi.")),
      types.map(function (t) { return carteBrief(p, t, rafraichir); }));
  }

  function carteBrief(p, t, rafraichir) {
    var e = BRIEFS.etat(t, p);
    var em = O.poste(t.emetteur), de = O.poste(t.destinataire);

    /* « il fonde » et « il pilote » justifient que ce type existe — on les lit
     * une fois, pas neuf. Répétés sur chaque carte, ils faisaient six mille
     * pixels de tableau. Ils restent au survol, et en entier dans le panneau
     * où l'on écrit le brief : c'est là qu'ils servent. */
    return el("div.bfc" + (e.recevable ? ".ok" : e.existe ? ".partiel" : ".absent"),
      { title: "il fonde : " + t.fonde + "\nil pilote : " + t.boussole },
      el("div.bfc-h", {},
        el("span.bfc-n", {}, t.nom),
        el("span.bfc-f", {}, em.nom + "  →  " + de.nom),
        el("span.bfc-e", {}, e.existe ? e.ecrits + " sur " + e.champs + " champs" : "Non posé")),

      el("div.bfc-q", {}, t.quoi),

      el("div.bfc-c" + (e.recevable ? ".ok" : ""), {}, BRIEFS.cout(t, e)),

      el("div.bfc-g", {},
        t.module === "DEMANDE"
          ? GESTE.bouton("pistes", { p: p }, null, "studio-lien")
          : t.section
            ? el("button.studio-lien", { type: "button", onclick: function () {
                GESTE.ouvrir("projet", { p: p, section: t.section }); } },
                "Ouvrir « " + VUE_PROJETS.nomSection(t.section) + " » →")
            /* Un geste texte par carte : six boutons pleins empilés, c'était six
             * actions principales sur un écran qui n'en admet qu'une. */
            : el("button.studio-lien", { type: "button",
                onclick: function () { editerBrief(p, t, rafraichir); } },
                e.existe ? "Compléter ce brief →" : "Poser ce brief →")));
  }

  /* Poser ou compléter un brief : ses champs, et à qui chacun appartient. */
  function editerBrief(p, t, rafraichir) {
    var cs = BRIEFS.champs(t);
    var f = FORM.rendre(cs, BRIEFS.lire(t, p), {});
    PANNEAU.ouvrir(t.nom, p.ref, el("div", {},
      UI.banniere("", t.quoi),
      el("div.bfc-r", {},
        el("div.bfcr", {}, el("b", {}, "il fonde"), t.fonde),
        el("div.bfcr", {}, el("b", {}, "il pilote"), t.boussole)),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          BRIEFS.ecrire(t, p, f.valeurs());
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function corpsReception(p, rafraichir, contextuel) {
    var d = p.sections.brief || {};
    var ident = p.sections.identite || {};
    var accueil = reception(p);
    var source = p.briefSource;
    var r = recevabilite(p, d, ident);
    var ouvert = !CLOTURE.est(p) && !p.fusionne;

    return el("div.br", {},
      bandeAccueil(p, d, r, accueil, ouvert, rafraichir),
      accueil.existe && (d.verbatim || source) ? el("details.bf-options", { open: contextuel },
        el("summary", {}, "Demande d’origine"),
        el("blockquote.bf-source", {}, d.verbatim || source),
        d.verbatim && source && String(d.verbatim).trim() !== String(source).trim() ? el("details",
          el("summary", {}, "Source complète"),
          el("blockquote.bf-source", {}, source)) : null) : null,

      ouvert && accueil.existe ? el("details.bf-options",
        el("summary", {}, "Saisie et mise en forme"),
        el("div.br-ing",
          el("button.b", { type: "button", onclick: function () { INGESTEUR.ouvrir(p, rafraichir); } },
            source ? "Reprendre la mise en forme" : "Coller un brief reçu"),
          el("button.b.nu", { type: "button", onclick: function () {
            VUE_PROJETS.editerSection(p, "brief", rafraichir);
          } }, "Modifier les champs")),
        INGESTEUR.bande(p, rafraichir),
        champsEditables(p, rafraichir)) : null,
      !contextuel ? el("details.bf-options",
        el("summary", {}, "Repères du brief"),
        corps(p, d, ident, rafraichir)) : null
    );
  }

  /* ————————————————————— La question : est-ce que je l'accepte ? ————————————————————— */

  function recevabilite(p, d, ident) {
    if ((NATURE.de(p) || {}).cle === "demande") {
      var controlesDemande = [
        { quoi: "Demande d’origine", ok: !!String(d.verbatim || p.briefSource || "").trim(), poids: 5 },
        { quoi: "Client renseigné", ok: !!(ident.clientId || ident.client), poids: 3 },
      ];
      return { controles: controlesDemande, recevable: controlesDemande.every(function (c) { return c.ok; }) };
    }

    var eb = CHAMPS.etat("brief", d);
    var ei = CHAMPS.etat("identite", ident);
    var manquants = ei.manquants.concat(eb.manquants);
    /* Le verbatim est cité, pas écrit par nous : on ne reproche pas au client
     * son vocabulaire. Le contrôle porte sur ce que l'agence rédige. */
    var frontiere = REGLES.vocabulaire([d.probleme, d.promesse, d.objectif_com, d.cible].join(" "));
    var concept = detecterConcept(d);

    var controles = [
      { quoi: "Décideur nommé", ok: !!(ident.decideurId || ident.decideur), poids: 5, cout: REGLES.prix("decideur-absent") },
      { quoi: "Fenêtre et dates", ok: !!ident.fenetre, poids: 4, cout: REGLES.prix("fenetre-absente") },
      { quoi: "Qui peut annuler", ok: !!ident.tueur, poids: 3, cout: REGLES.prix("tueur-absent") },
      { quoi: "Champs critiques", ok: manquants.length === 0, poids: 2,
        cout: manquants.length + (manquants.length > 1 ? " champs critiques vides" : " champ critique vide") },
      { quoi: "Critères de succès", ok: !!(d.kpis || []).length, poids: 2,
        cout: "ce brief ne pourra pas être évalué" },
      { quoi: "Contrainte de production", ok: !!d.contraintes, poids: 1 },
      { quoi: "Vocabulaire de marque", ok: frontiere.length === 0,
        cout: frontiere.length ? "« " + frontiere[0].mot + " » dans ce que nous avons écrit" : "" },
      { quoi: "Clause de frontière", ok: !concept,
        cout: concept ? "le brief contient ce qui ressemble à une accroche : « " + concept + " »" : "" },
    ];

    return { controles: controles, manquants: manquants, frontiere: frontiere,
      recevable: controles.every(function (c) { return c.ok; }) };
  }

  /* §8 : un brief est retournable s'il contient un concept, une accroche ou une
   * piste visuelle. Garde-fou simple — une ligne courte entre guillemets dans un
   * champ de cadrage. Avertissement, jamais blocage. */
  function detecterConcept(d) {
    var champs = [d.probleme, d.objectif_com, d.cible, d.promesse];
    var trouve = null;
    champs.forEach(function (t) {
      if (trouve || !t) return;
      var m = String(t).match(/[«"]([^»"]{3,60})[»"]/);
      if (m && m[1].split(/\s+/).length <= 8) trouve = m[1];
    });
    return trouve;
  }

  function bandeAccueil(p, d, r, accueil, ouvert, rafraichir) {
    var statut = accueil.statut;
    var simple = (NATURE.de(p) || {}).cle === "demande";
    var revision = revisionLue(p);
    var titre = statut === "accepte" ? "Brief accepté" : statut === "sous_reserve" ? "Brief retourné sous réserve"
      : accueil.existe ? "Brief reçu" : "Demande à consigner";

    return el("section.bf-reception",
      el("div.bf-reception-tete",
        el("h2", {}, titre), el("span.studio-compte", {}, "V" + accueil.version)),
      statut === "sous_reserve" && d.reserve ? el("p", {},
        "Retourné le " + O.finir(O.joli(d.reserve.quand)) + " Motif : " + d.reserve.motif) : null,
      statut === "accepte" && d.accepte_le ? el("p", {},
        d.accepte_malgre ? "Accepté le " + O.joli(d.accepte_le) + " avec " + O.pluriel(d.accepte_malgre, "condition ouverte", "conditions ouvertes") + "."
          : "Accepté le " + O.finir(O.joli(d.accepte_le))) : null,
      accueil.existe ? el("details.bf-controles",
        el("summary", {}, r.recevable ? "Conditions remplies" : "Conditions à vérifier"),
        el("ul", {}, r.controles.map(function (c) {
          return el("li", {}, (c.ok ? "✓ " : "○ ") + c.quoi, !c.ok && c.cout ? " · " + c.cout : null);
        }))) : null,
      ouvert ? el("div.form-actions",
        !accueil.existe ? el("button.b.or", { type: "button", onclick: function () {
          if (simple) VUE_PROJETS.editerChamp(p, "brief", "verbatim", rafraichir);
          else INGESTEUR.ouvrir(p, rafraichir);
        } }, simple ? "Saisir la demande" : "Coller un brief reçu") : null,
        accueil.existe && statut !== "accepte" ? [
          el("button.b.or", { type: "button", onclick: function () { accepter(p, d, r, rafraichir); } }, "Accepter le brief"),
          el("button.b", { type: "button", onclick: function () { retourner(p, d, r, rafraichir); } }, "Retourner sous réserve")
        ] : null,
        statut === "accepte" ? el("button.b.nu", { type: "button", onclick: function () {
          if (!briefCourant(p, d, revision)) return;
          d.statut = null;
          DEPOT.tracer("réouverture", "projets", p.id, "réception du brief");
          DEPOT.enregistrer(); rafraichir();
        } }, "Rouvrir la réception") : null) : null
    );
  }

  function revisionLue(p) {
    return JSON.stringify([p.sections.brief, p.sections.identite, p.briefSource]);
  }

  function briefCourant(p, d, revision) {
    if (DEPOT.trouve("projets", p.id) === p && !CLOTURE.est(p) && !p.fusionne
        && revisionLue(p) === revision && (!p.sections.brief || p.sections.brief === d)) return true;
    AVIS.refus("Le dossier a changé. Relisez la demande avant de décider.");
    return false;
  }

  /* Une modification de la demande ouvre une nouvelle version de réception.
   * L'ancien état reste dans l'historique et dans le registre des décisions. */
  function preparerRevision(p) {
    var d = p.sections.brief;
    if (!d || reception(p).statut !== "accepte") return;
    VERSION.ouvrir(d, "interne", "Demande modifiée après sa réception", MAISON.titulaire, { complet: true });
    d.statut = null;
  }

  /* Accepter ou retourner le brief est une décision sur sa recevabilité, au
   * registre commun. Elle se vérifie avant que le brief ne change. L'accepter
   * malgré des conditions non remplies s'écarte du processus : c'est une
   * déviation, motivée, de portée projet. Rend la décision, ou rien si elle
   * est refusée. */
  function trancher(p, d, revision, verdict, motif, ecart, appliquer) {
    if (!briefCourant(p, d, revision)) return null;
    var champs = { objet: "brief", type: "recevabilite", projet: p.id, verdict: verdict, motif: motif,
      version: VERSION.num(d), qui: MAISON.titulaire, acteur: DECISION.acteur(), titre: "le brief" };
    if (ecart) { champs.portee = "projet"; champs.ecart = ecart; }
    var decision;
    try { decision = DECISION.construire(champs); }
    catch (e) { if (DECISION.estRefus(e)) { AVIS.refus(e.message); return null; } throw e; }
    var avant = { section: p.sections.brief, champs: Object.assign({}, d) };
    p.sections.brief = d;
    appliquer(decision);
    try { return DECISION.ajouter(decision); }
    catch (e) {
      Object.keys(d).forEach(function (k) { if (!(k in avant.champs)) delete d[k]; });
      Object.assign(d, avant.champs);
      if (!avant.section) delete p.sections.brief;
      if (DECISION.estRefus(e)) { AVIS.refus(e.message); return null; }
      throw e;
    }
  }

  function accepter(p, d, r, rafraichir) {
    var revision = revisionLue(p);
    var manques = r.controles.filter(function (c) { return !c.ok; });
    var motif = el("textarea", { id: "br-malgre", rows: 3 });
    PANNEAU.ouvrir("Accepter le brief", p.ref + " · V" + VERSION.num(d), el("div", {},
      el("p", {}, "La décision sera consignée pour ce dossier. Le go final de la Clientèle se consigne séparément."),
      manques.length ? el("div.sousbloc",
        el("h3", {}, "Conditions encore ouvertes"),
        el("ul", {}, manques.map(function (c) { return el("li", {}, c.quoi, c.cout ? " · " + c.cout : null); })),
        el("div.form", {}, el("div.champ", {},
          el("label", { "for": "br-malgre" }, "Motif de l’acceptation malgré ces conditions"), motif))) : null,
      el("div.form-actions",
        el("button.b.or", { type: "button", onclick: function () {
          var raison = manques.length ? motif.value.trim() : null;
          if (manques.length && !raison) {
            AVIS.refus("Indiquez le motif de l’acceptation malgré les conditions ouvertes.");
            motif.focus(); return;
          }
          var ecart = manqueEcart(manques);
          if (!trancher(p, d, revision, "approuve", raison, ecart, function (x) {
            d.statut = "accepte"; d.accepte_le = x.quand; d.accepte_malgre = manques.length;
          })) return;
          DEPOT.tracer("acceptation", "projets", p.id, "brief accepté" + (manques.length ? " malgré " + manques.length + " manques" : ""));
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, manques.length ? "Accepter quand même" : "Confirmer l’acceptation"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function manqueEcart(manques) {
    return manques.length ? { de: "recevabilite", ref: null, conditions: manques.map(function (c) { return c.quoi; }) } : null;
  }

  function retourner(p, d, r, rafraichir) {
    var revision = revisionLue(p);
    var manques = r.controles.filter(function (c) { return !c.ok; });
    var choisi = null;
    var boite = el("div.oc-motifs");
    manques.forEach(function (c) {
      boite.appendChild(el("button.oc-m", { type: "button", onclick: function () {
        choisi = c.quoi;
        Array.from(boite.children).forEach(function (b) { b.className = "oc-m"; });
        boite.children[manques.indexOf(c)].className = "oc-m actif";
      } }, c.quoi + (c.cout ? " — " + c.cout : "")));
    });
    if (!manques.length) boite.appendChild(el("p.rien", {}, "Aucune condition manquante : le retour ne peut être que motivé à la main."));
    var libre = el("input", { id: "bf-motif-retour", type: "text" });

    PANNEAU.ouvrir("Retourner sous réserve", p.ref + " · V" + VERSION.num(d), el("div", {},
      UI.banniere("", "Le délai de réponse créative est suspendu tant que la réserve n'est pas levée. C'est la règle la moins intuitive du processus, et la plus importante."),
      el("div.sousbloc", {}, el("h3", {}, "Conditions ouvertes"), boite,
        el("div.form", {}, el("div.champ", {}, el("label", { for: "bf-motif-retour" }, "Motif du retour"), libre))),
      el("div.form-actions", { style: { "margin-top": "1rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          var motif = choisi || libre.value.trim();
          if (!motif) { AVIS.refus("Un retour sans motif n'est pas un retour."); return; }
          if (!trancher(p, d, revision, "reserve", motif, null, function (x) {
            d.statut = "sous_reserve"; d.reserve = { quand: x.quand, motif: motif }; })) return;
          DEPOT.tracer("retour sous réserve", "projets", p.id, motif);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          RENVOI.ouvrir({ quoi: "Brief — " + p.ref, projet: p.ref, projetId: p.id, objet: "brief", motif: motif });
        } }, "Retourner"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Revenir"))
    ));
  }

  /* ————————————————————— Ce que le brief m'impose ————————————————————— */

  function corps(p, d, ident, rafraichir) {
    var marches = marchesDe(p);
    var eng = OBJECTIFS.engagements().filter(function (e) { return e.projet.id === p.id; })[0];

    return el("div.br-corps", {},
      /* La colonne de gauche : ce qu'il faut savoir, en cinq blocs courts */
      el("div.br-gauche", {},
        bloc("Le problème", d.probleme, "planning"),
        bloc("La promesse", d.promesse, "planning"),
        bloc("La cible", d.cible, "planning"),
        d.contraintes ? bloc("La contrainte de production", d.contraintes, "clientele") : null,
        d.verbatim ? el("div.br-verbatim", {},
          el("div.b-t", {}, "Ce que le client a dit"),
          el("blockquote", {}, "« " + d.verbatim + " »")) : null
      ),

      /* La colonne de droite : ce qui s'impose, en chiffres */
      el("div.br-droite", {},
        el("div.br-impose", {},
          el("div.bi-t", {}, "Ce que ce brief m'impose"),
          ligne("Échéance", ident.echeance ? O.joli(ident.echeance) : null,
            eng && eng.joursRestants !== null
              ? (eng.joursRestants < 0 ? "dépassée de " + (-eng.joursRestants) + " j" : "dans " + eng.joursRestants + " j")
              : null),
          ligne("Charge estimée", eng && eng.charge ? eng.charge + " j" : null,
            eng && eng.inconnues ? eng.inconnues + " sans estimation" : null),
          ligne("Livrables promis", (d.livrables_attendus || []).length || null, null),
          ligne("Décideur final", ident.decideur, null),
          ligne("Fenêtre", ident.fenetre, null)
        ),

        eng && eng.tenable === false
          ? UI.banniere("rouge", "Ce que le brief demande ne tient pas dans le temps qui reste.")
          : null,

        marches.length ? el("div.br-marches", {},
          el("div.bi-t", {}, "Marchés"),
          el("div.drapeaux", {}, marches.map(function (m) { return UI.drapeau(m, true); }))
        ) : null,

        el("div.br-frise", {},
          el("div.bi-t", {}, "Le chemin"),
          UI.frise(jalons(p, ident))
        ),

        (d.kpis || []).length ? el("div.br-kpis", {},
          el("div.bi-t", {}, "Ce qui sera mesuré"),
          el("div", {}, d.kpis.map(function (k) {
            return el("div.oc-l", {}, el("span.puce"), el("span", {}, k));
          }))
        ) : UI.banniere("", "Aucun critère de succès mesurable : ce brief ne pourra pas être évalué.")
      )
    );
  }

  function bloc(titre, texte, poste) {
    return el("div.br-bloc" + (texte ? "" : ".vide"), {},
      el("div.b-t", {}, titre, el("span.b-p", {}, O.poste(poste).court)),
      el("div.b-v", {}, texte || "Non renseigné")
    );
  }

  function ligne(quoi, valeur, note) {
    return el("div.bi-l", {},
      el("span.l-q", {}, quoi),
      el("span.l-v" + (valeur ? "" : ".vide"), {}, valeur === null || valeur === undefined ? "Non renseigné" : String(valeur)),
      note ? el("span.l-n", {}, note) : null
    );
  }

  function marchesDe(p) {
    var vus = {}, out = [];
    (p.livrables || []).forEach(function (l) {
      if (!l.marche || vus[l.marche]) return;
      var m = DEPOT.trouve("marches", l.marche);
      if (m) { vus[l.marche] = true; out.push(m); }
    });
    return out;
  }

  function jalons(p, ident) {
    var b = p.sections.bigidea || {};
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var produit = (p.livrables || []).some(function (l) { return (l.versions || []).length; });
    return [
      { nom: "Brief", date: p.cree_le, fait: (p.sections.brief || {}).statut === "accepte" },
      { nom: "Idée", date: null, fait: !!b.idee, ici: !!b.idee && !retenue },
      { nom: "Piste retenue", date: retenue ? retenue.arbitre_le : null, fait: !!retenue },
      { nom: "Production", date: null, fait: produit },
      { nom: "Échéance", date: ident.echeance, fait: false },
    ];
  }

  return { rendre: rendre, reception: reception, estContextuel: estContextuel, preparerRevision: preparerRevision };
})();
