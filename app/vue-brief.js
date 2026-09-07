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
      el("div.sec-t", {}, "TOUS LES CHAMPS", el("span", {}, def.champs.length)),
      FORM.lire(def.champs, p.sections["brief"] || {},
        { projet: p, section: "brief",
          editer: function (k) { VUE_PROJETS.editerChamp(p, "brief", k, rafraichir); } }));
  }

  function rendre(p, rafraichir) {
    /* Un dossier n'a pas UN brief : il en a autant que de demandes qu'il fonde.
     * Le brief de campagne reste ici, en tête — c'est celui qu'on reçoit — et
     * les autres se déclarent sous lui, chacun avec ce qu'il fonde et ce qu'il
     * pilote. Deux gabarits sur trois n'en avaient aucun. */
    var g = p.gabarit || "campagne";
    var types = BRIEFS.pourGabarit(g);
    var campagne = types.filter(function (t) { return t.cle === "campagne"; })[0];
    var autres = types.filter(function (t) { return t.cle !== "campagne"; });

    return el("div.bf", {},
      bandeBriefs(p, types),
      campagne ? corpsCampagne(p, rafraichir) : premierBrief(p, g, types, rafraichir),
      lesAutres(p, autres, rafraichir),
      champsEditables(p, rafraichir)
    ,
      champsEditables(p, rafraichir),
      champsEditables(p, rafraichir));
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

  /* Le premier brief d'un gabarit qui n'en avait aucun. */
  function premierBrief(p, g, types, rafraichir) {
    return el("div.bf-vide", {},
      el("p", {}, "Ce dossier est un " + (MAISON.gabarits.filter(function (x) {
        return x.cle === g; })[0] || { nom: g }).nom.toLowerCase()
        + " : il n'a pas de brief de campagne, et c'est normal. "
        + "Ce sont les " + types.length + " types ci-dessous qui le fondent."));
  }

  /* ————————————————————— Les autres briefs ————————————————————— */

  function lesAutres(p, types, rafraichir) {
    if (!types.length) return null;
    return el("div.bf-l", {},
      el("div.bfl-t", {}, "LES AUTRES BRIEFS DE CE DOSSIER",
        el("span", {}, types.length + "  ·  chacun fonde une demande et pilote un suivi")),
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
        el("span.bfc-e", {}, e.existe ? e.ecrits + " sur " + e.champs + " champs" : "non posé")),

      el("div.bfc-q", {}, t.quoi),

      el("div.bfc-c" + (e.recevable ? ".ok" : ""), {}, BRIEFS.cout(t, e)),

      el("div.bfc-g", {},
        t.module === "DEMANDE"
          ? el("button.b.nu", { type: "button", onclick: function () {
              location.hash = "#/projets/" + p.id + "/pistes"; } }, "aux pistes créatives →")
          : t.section
            ? el("button.b.nu", { type: "button", onclick: function () {
                location.hash = "#/projets/" + p.id + "/" + t.section; } },
                "à la section " + t.section + " →")
            : el("button.b" + (e.existe ? ".nu" : ".or"), { type: "button",
                onclick: function () { editerBrief(p, t, rafraichir); } },
                e.existe ? "compléter" : "poser ce brief")));
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

  function corpsCampagne(p, rafraichir) {
    var d = p.sections.brief || {};
    var ident = p.sections.identite || {};
    var r = recevabilite(p, d, ident);

    var vide = !CHAMPS.etat("brief", d).fait;

    return el("div.br", {},
      INGESTEUR.bande(p, rafraichir),
      bandeAccueil(p, d, ident, r, rafraichir),

      /* Le brief n'arrive jamais au format. C'est le geste le plus fréquent du
       * poste : le mettre en forme moi-même, puis faire contresigner. */
      el("div.br-ing", {},
        el("button.b" + (vide ? ".or" : ""), { type: "button",
          onclick: function () { INGESTEUR.ouvrir(p, rafraichir); } },
          vide ? "Ingérer un brief reçu" : "Reprendre la mise en forme"),
        p.briefSource
          ? el("span.bri-s", {}, "source conservée · "
              + Math.round(p.briefSource.length / 100) / 10 + " k caractères")
          : el("span.bri-s.vide", {}, "aucune source conservée — les champs n'ont pas de citation d'origine")),

      corps(p, d, ident, rafraichir)
    ,
      champsEditables(p, rafraichir));
  }

  /* ————————————————————— La question : est-ce que je l'accepte ? ————————————————————— */

  function recevabilite(p, d, ident) {
    var eb = CHAMPS.etat("brief", d);
    var ei = CHAMPS.etat("identite", ident);
    var manquants = ei.manquants.concat(eb.manquants);
    /* Le verbatim est cité, pas écrit par nous : on ne reproche pas au client
     * son vocabulaire. Le contrôle porte sur ce que l'agence rédige. */
    var frontiere = REGLES.vocabulaire([d.probleme, d.promesse, d.objectif_com, d.cible].join(" "));
    var concept = detecterConcept(d);

    var controles = [
      { quoi: "Décideur nommé", ok: !!ident.decideur, poids: 5, cout: REGLES.prix("decideur-absent") },
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

  function bandeAccueil(p, d, ident, r, rafraichir) {
    var statut = d.statut || null;
    var prix = null;

    if (!r.recevable) {
      var pires = r.controles.filter(function (c) { return !c.ok && c.cout; })
        .sort(function (a, b) { return (b.poids || 0) - (a.poids || 0); });
      prix = "L'accepter en l'état : " + (pires[0] ? pires[0].cout.toLowerCase() : "des champs critiques resteront vides")
        + (pires.length > 1 ? " · et " + (pires.length - 1) + (pires.length > 2 ? " autres conséquences" : " autre conséquence") : "");
    }

    var gestes = [];
    if (statut === "accepte") {
      gestes.push({ nom: "Rouvrir", doux: true, quand: function () {
        d.statut = null; DEPOT.enregistrer(); rafraichir(); } });
    } else {
      gestes.push({ nom: "Accepter le brief", fort: true, quand: function () { accepter(p, d, r, rafraichir); } });
      gestes.push({ nom: "Retourner sous réserve", quand: function () { retourner(p, d, r, rafraichir); } });
    }
    gestes.push({ nom: "Mettre en forme", doux: true, quand: function () {
      VUE_PROJETS.editerSection(p, "brief", rafraichir); } });

    return el("div", {},
      UI.recevabilite(
        statut === "accepte" ? "Brief accepté" :
        statut === "sous_reserve" ? "Brief retourné sous réserve" : "Est-ce que j'accepte ce brief ?",
        r.controles, prix, gestes
      ),
      statut === "sous_reserve" && d.reserve
        ? UI.banniere("", "Retourné le " + O.joli(d.reserve.quand) + " — " + d.reserve.motif
            + ". Mon horloge est à l'arrêt jusqu'à sa levée.")
        : null,
      statut === "accepte"
        ? UI.banniere("vert", "Accepté le " + O.joli(d.accepte_le)
            + (d.accepte_malgre ? " malgré " + d.accepte_malgre + " conditions non remplies." : "."))
        : null
    );
  }

  function accepter(p, d, r, rafraichir) {
    if (r.recevable) {
      d.statut = "accepte"; d.accepte_le = new Date().toISOString(); d.accepte_malgre = 0;
      DEPOT.tracer("acceptation", "projets", p.id, "brief accepté");
      DEPOT.enregistrer(); rafraichir();
      return;
    }

    var manques = r.controles.filter(function (c) { return !c.ok; });
    PANNEAU.ouvrir("Avant d'accepter", "ce que ça engage", el("div", {},
      UI.banniere("rouge", manques.length + " conditions ne sont pas remplies. Accepter, c'est renoncer à les opposer plus tard."),
      el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA COÛTE"),
        el("div", {}, manques.map(function (c) {
          return el("div.oc-l", {}, el("span.puce"), el("span", {},
            c.quoi + (c.cout ? " — " + c.cout : "")));
        }))),
      el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA DÉBLOQUE"),
        el("div.oc-l.gagne", {}, UI.icone("revue", 13),
          el("span", {}, "La plateforme créative peut être écrite, et le délai de réponse démarre."))),
      el("div.form-actions", { style: { "margin-top": "1.2rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          d.statut = "accepte"; d.accepte_le = new Date().toISOString();
          d.accepte_malgre = manques.length;
          DEPOT.tracer("acceptation", "projets", p.id, "brief accepté malgré " + manques.length + " manques");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Accepter quand même"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Revenir"))
    ));
  }

  function retourner(p, d, r, rafraichir) {
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
    var libre = el("input", { type: "text", placeholder: "ou un motif écrit à la main" });

    PANNEAU.ouvrir("Retourner sous réserve", "l'horloge s'arrête", el("div", {},
      UI.banniere("", "Le délai de réponse créative est suspendu tant que la réserve n'est pas levée. C'est la règle la moins intuitive du processus, et la plus importante."),
      el("div.sousbloc", {}, el("h3", {}, "LE MOTIF — une condition manquante d'abord"), boite, libre),
      el("div.form-actions", { style: { "margin-top": "1rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          var motif = choisi || libre.value.trim();
          if (!motif) { AVIS.refus("Un retour sans motif n'est pas un retour."); return; }
          d.statut = "sous_reserve";
          d.reserve = { quand: new Date().toISOString(), motif: motif };
          DEPOT.tracer("retour sous réserve", "projets", p.id, motif);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          RENVOI.ouvrir({ quoi: "Brief — " + p.ref, projet: p.ref, projetId: p.id, objet: "brief" });
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
        bloc("LE PROBLÈME", d.probleme, "planning"),
        bloc("LA PROMESSE", d.promesse, "planning"),
        bloc("LA CIBLE", d.cible, "planning"),
        d.contraintes ? bloc("LA CONTRAINTE DE PRODUCTION", d.contraintes, "clientele") : null,
        d.verbatim ? el("div.br-verbatim", {},
          el("div.b-t", {}, "CE QUE LE CLIENT A DIT"),
          el("blockquote", {}, "« " + d.verbatim + " »")) : null
      ),

      /* La colonne de droite : ce qui s'impose, en chiffres */
      el("div.br-droite", {},
        el("div.br-impose", {},
          el("div.bi-t", {}, "CE QUE CE BRIEF M'IMPOSE"),
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
          el("div.bi-t", {}, "MARCHÉS"),
          el("div.drapeaux", {}, marches.map(function (m) { return UI.drapeau(m, true); }))
        ) : null,

        el("div.br-frise", {},
          el("div.bi-t", {}, "LE CHEMIN"),
          UI.frise(jalons(p, ident))
        ),

        (d.kpis || []).length ? el("div.br-kpis", {},
          el("div.bi-t", {}, "CE QUI SERA MESURÉ"),
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
      el("div.b-v", {}, texte || "non renseigné")
    );
  }

  function ligne(quoi, valeur, note) {
    return el("div.bi-l", {},
      el("span.l-q", {}, quoi),
      el("span.l-v" + (valeur ? "" : ".vide"), {}, valeur === null || valeur === undefined ? "non renseigné" : String(valeur)),
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

  return { rendre: rendre };
})();
