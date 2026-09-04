/* presentation-modele.js — le dossier de présentation, engendré.
 *
 * C'est le document 9 de la chaîne : celui qui porte la décision du client.
 * On ne le saisit pas — on choisit ce qu'il montre, et il se compose depuis le
 * projet. Le montage peut reformater, raccourcir, mettre en récit ; il n'altère
 * jamais la source.
 *
 * Une planche de déclinaisons, un mockup, une route : ce sont des pages. Pas
 * des objectifs.
 */

window.PRESENTATION = (function () {

  /* Les types de page, et ce que chacun tire du projet. */
  var TYPES = {
    titre: { nom: "Ouverture", tire: "le nom de campagne et le client" },
    probleme: { nom: "Le problème", tire: "le brief — problème, cible, tension" },
    strategie: { nom: "La stratégie", tire: "le territoire et l'insight" },
    idee: { nom: "L'idée", tire: "la big idea, sa mécanique, sa signature" },
    route: { nom: "Une route", tire: "une piste créative et son visuel" },
    planche: { nom: "Planche de déclinaisons", tire: "les pièces d'une route, en grille" },
    mockup: { nom: "Mise en situation", tire: "les mockups d'une route" },
    dispositif: { nom: "Le dispositif", tire: "les activités d'une route et leurs dates" },
    livrables: { nom: "Ce que nous livrons", tire: "la liste des livrables et leurs formats" },
    calendrier: { nom: "Le calendrier", tire: "les jalons et les dates de publication" },
    suite: { nom: "La suite", tire: "ce qui est validé aujourd'hui, et ce qui vient après" },
  };

  /* ————————————————————— Engendrer ————————————————————— */

  /* Ce que le client reçoit à minima : l'idée et deux ou trois KV. Le reste ne
   * se montre que sur un pitch ambitieux — et ne se produit qu'après validation.
   * Mettre les déclinaisons dans une présentation spéculative, c'est promettre
   * du travail qu'on n'a pas vendu. */
  var NIVEAUX = {
    minimum: { nom: "Minimum client", quoi: "le problème, la stratégie, l'idée, les routes et leurs KV" },
    ambitieux: { nom: "Pitch ambitieux", quoi: "en plus : dispositif, planches de déclinaisons, mises en situation, calendrier" },
  };

  function creer(p, niveau) {
    niveau = niveau || "minimum";
    var ambitieux = niveau === "ambitieux";
    var pages = [{ type: "titre" }];
    var b = p.sections.bigidea || {};
    var brief = p.sections.brief || {};
    var strat = p.sections.strategie || {};

    if (brief.probleme) pages.push({ type: "probleme" });
    if (strat.territoire) pages.push({ type: "strategie" });
    if (b.idee) pages.push({ type: "idee" });

    /* Chaque route porte ses propres pages : son visuel, son dispositif, sa
     * planche, ses mises en situation. Une planche globale mélangerait deux
     * concepts sur la même page. */
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var routes = retenue ? [retenue]
      : (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });

    routes.forEach(function (pi) {
      pages.push({ type: "route", pisteId: pi.id });
      /* Le KV maître et ses adaptations : c'est le minimum montrable. */
      var kvs = (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id && KV.estKV(l); });
      if (kvs.length) pages.push({ type: "planche", pisteId: pi.id, seulementKV: !ambitieux });
      if (!ambitieux) return;
      if ((pi.dispositif || []).length) pages.push({ type: "dispositif", pisteId: pi.id });
      var mk = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id && !l.annule; })
        .reduce(function (n, l) { return n + (l.mockups || []).length; }, 0);
      if (mk) pages.push({ type: "mockup", pisteId: pi.id });
    });

    if (ambitieux && (p.livrables || []).length) pages.push({ type: "livrables" });
    if (ambitieux && (p.livrables || []).some(function (l) { return l.publication || l.remise; }))
      pages.push({ type: "calendrier" });
    pages.push({ type: "suite" });

    return {
      id: O.id("PRES"), cree_le: new Date().toISOString(), statut: "brouillon",
      niveau: niveau, pages: pages, seance: null, retours: [],
    };
  }

  /* Régénérer : on garde le choix des pages, on rafraîchit ce qu'elles tirent. */
  function pagesPossibles(p) {
    var toutes = creer(p).pages;
    return toutes;
  }

  /* ————————————————————— Ce que chaque page montre ————————————————————— */

  function contenu(p, page) {
    var b = p.sections.bigidea || {};
    var brief = p.sections.brief || {};
    var strat = p.sections.strategie || {};
    var ident = p.sections.identite || {};

    if (page.type === "titre") {
      return { titre: b.campagne || p.nom, sous: ident.client || "",
        note: ident.marque || "", visuel: premierVisuel(p) };
    }
    if (page.type === "probleme") {
      return { titre: "Le problème", corps: brief.probleme,
        blocs: [
          { t: "La cible", v: brief.cible },
          { t: "L'insight", v: brief.insight || strat.insight },
        ] };
    }
    if (page.type === "strategie") {
      return { titre: "La stratégie", corps: strat.territoire,
        blocs: [
          { t: "La tension", v: strat.tension },
          { t: "La promesse", v: brief.promesse },
        ] };
    }
    if (page.type === "idee") {
      var auteur = b.auteur ? DEPOT.trouve("personnes", b.auteur) : null;
      return { titre: b.campagne || "L'idée", phrase: b.idee, signature: b.signature,
        corps: b.mecanique, note: auteur ? "Idée : " + auteur.nom : null };
    }
    if (page.type === "route") {
      var pi = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pi) return null;
      var da = pi.auteurDA ? DEPOT.trouve("personnes", pi.auteurDA) : null;
      return { titre: pi.titre, corps: pi.concept, visuel: pi,
        note: da ? "Direction artistique : " + da.nom : null,
        blocs: [
          { t: "La mécanique", v: pi.mecanique },
          { t: "Ce qu'elle sacrifie", v: pi.sacrifice },
          { t: "L'argument", v: pi.argument },
        ].filter(function (x) { return x.v; }),
        statut: pi.statut };
    }
    if (page.type === "planche") {
      var pr = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var ls = (p.livrables || []).filter(function (l) {
        if (l.annule) return false;
        if (page.seulementKV && !KV.estKV(l)) return false;
        return page.pisteId ? l.pisteId === page.pisteId : l.voletId === page.voletId;
      });
      if (!ls.length) return null;
      return { titre: pr ? pr.titre + " — les déclinaisons" : "Déclinaisons", cases: ls.map(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        var s = DEPOT.trouve("supports", l.support);
        /* Sur une planche de KV, ce qui distingue une case est sa marque et sa
         * langue — pas le nom du support, identique partout. */
        return { livrable: l, marche: m, support: s,
          etiquette: (m ? m.code : "") + (l.kv && l.kv.marque ? " · " + l.kv.marque : s ? " · " + s.nom : ""),
          langue: l.kv && l.kv.langue ? O.langue(l.kv.langue)
            : m ? (m.langues || []).map(O.langue).join(", ") : "",
          etat: REGLES.pretSur(l).part };
      }) };
    }
    if (page.type === "mockup") {
      var pr2 = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var mk = mockups(p).filter(function (x) {
        return !page.pisteId || x.livrable.pisteId === page.pisteId; });
      if (!mk.length) return null;
      return { titre: (pr2 ? pr2.titre + " — " : "") + "en situation", mockups: mk };
    }

    if (page.type === "dispositif") {
      var pr3 = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pr3 || !(pr3.dispositif || []).length) return null;
      return { titre: pr3.titre + " — le dispositif",
        activites: (pr3.dispositif || []).map(function (a) {
          return { nom: a.nom, quoi: a.quoi,
            canal: DISPOSITIF.CANAUX[a.canal].nom, lieu: DISPOSITIF.LIEUX[a.lieu].nom,
            debut: a.debut, fin: a.fin,
            marches: (a.marches || []).map(function (id) {
              var m = DEPOT.trouve("marches", id); return m ? m.code : "?"; }).join(" · "),
            pieces: DISPOSITIF.pieces(p, pr3, a).length };
        }) };
    }
    if (page.type === "livrables") {
      return { titre: "Ce que nous livrons", lignes: (p.livrables || []).filter(function (l) { return !l.annule; })
        .map(function (l) {
          var s = DEPOT.trouve("supports", l.support);
          var m = DEPOT.trouve("marches", l.marche);
          var g = s && m ? (s.gabarits || {})[m.id] : null;
          return { nom: l.nom, support: s ? s.nom : "", marche: m ? m.code : "",
            format: g && g.dimensions ? g.dimensions : null };
        }) };
    }
    if (page.type === "calendrier") {
      var jalons = [];
      (p.livrables || []).forEach(function (l) {
        var d = l.publication || l.remise;
        if (d) jalons.push({ nom: l.nom, date: d, fait: REGLES.pretSur(l).part === 100 });
      });
      jalons.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      return { titre: "Le calendrier", jalons: jalons, echeance: ident.echeance };
    }
    if (page.type === "suite") {
      var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
      return { titre: "Ce que nous validons aujourd'hui",
        valide: [
          retenue ? "La route « " + retenue.titre + " »" : "La route créative",
          b.idee ? "L'idée : " + (b.campagne || "") : null,
          b.signature ? "La signature : « " + b.signature + " »" : null,
          "Le périmètre de livrables",
        ].filter(Boolean),
        pasValide: [
          "Les textes définitifs",
          "Le casting et le décor",
          "Les formats et déclinaisons finales",
          "Le budget de production détaillé",
        ],
        decideur: ident.decideur };
    }
    return null;
  }

  function premierVisuel(p) {
    var l = (p.livrables || []).filter(function (x) { return x.vignette; })[0];
    if (l) return l;
    return (p.sections.pistes || []).filter(function (x) { return x.vignette; })[0] || null;
  }

  function mockups(p) {
    var out = [];
    (p.livrables || []).forEach(function (l) {
      (l.mockups || []).forEach(function (m) {
        out.push({ livrable: l, mockup: m });
      });
    });
    return out;
  }

  /* ————————————————————— Est-elle présentable ? ————————————————————— */

  function controles(p, pres) {
    var ident = p.sections.identite || {};
    var b = p.sections.bigidea || {};
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var sansVisuel = ls.filter(function (l) { return !l.vignette; }).length;
    var mentions = ls.filter(function (l) {
      var m = DEPOT.trouve("marches", l.marche);
      return m && !(m.mentions || []).length;
    }).length;
    var droits = ls.filter(function (l) { return REGLES.droitsInsuffisants(l); }).length;
    var sansBAT = ls.filter(function (l) {
      return PRODUCTION.exiges(l).indexOf("bat") !== -1 && !PRODUCTION.de(l, "bat").length; }).length;
    var sansDispositif = (p.sections.pistes || []).filter(function (x) {
      return x.statut !== "ecartee" && !(x.dispositif || []).length; }).length;
    var routesMaigres = (p.sections.pistes || []).filter(function (x) {
      if (x.statut === "ecartee") return false;
      return ls.filter(function (l) { return l.pisteId === x.id && KV.estKV(l) && l.vignette; }).length < 2;
    }).length;
    var enSituation = mockups(p).length;
    var mockupsPerimes = ls.reduce(function (n, l) { return n + MOCKUP.perimes(l).length; }, 0);

    return [
      { quoi: "Décideur final nommé", ok: !!ident.decideur, poids: 5,
        cout: "la validation ne prendra pas effet — elle sera suspendue" },
      { quoi: "Une route fait autorité", ok: !!retenue, poids: 4,
        cout: "présenter deux idées, c'est demander au client d'arbitrer à ma place" },
      { quoi: "Droits couverts", ok: droits === 0, poids: 4,
        cout: droits + " visuels hors zone ou hors durée" },
      { quoi: "Visuels posés", ok: sansVisuel === 0, poids: 3,
        cout: sansVisuel + (sansVisuel > 1 ? " cases sans visuel" : " case sans visuel") },
      { quoi: "Idée écrite", ok: !!b.idee, poids: 3, cout: "rien à présenter" },
      { quoi: "Vu en situation", ok: enSituation > 0 && mockupsPerimes === 0, poids: 3,
        cout: !enSituation
          ? "aucune mise en situation : le client valide un visuel qu'il n'a jamais vu dans son support"
          : mockupsPerimes + (mockupsPerimes > 1 ? " mockups montrent" : " mockup montre") + " une version dépassée" },
      { quoi: "Mentions par marché", ok: mentions === 0, poids: 2,
        cout: mentions + " marchés sans mentions obligatoires renseignées" },
      { quoi: "BAT livrables", ok: sansBAT === 0, poids: 4,
        cout: sansBAT + (sansBAT > 1 ? " pièces n'ont pas de BAT" : " pièce n'a pas de BAT")
          + " : valider aujourd'hui engage une livraison qu'on ne peut pas tenir" },
      { quoi: "Au moins deux KV par route", ok: routesMaigres === 0, poids: 4,
        cout: routesMaigres + (routesMaigres > 1 ? " routes présentées ont" : " route présentée a")
          + " moins de deux KV montrables : en dessous, on présente une intention, pas une campagne" },
      { quoi: "Un dispositif par route", ok: sansDispositif === 0, poids: 3,
        cout: sansDispositif + (sansDispositif > 1 ? " routes présentées n'ont" : " route présentée n'a")
          + " aucun dispositif : on présente une image, pas une campagne" },
    ];
  }

  /* ————————————————————— La séance et ses retours ————————————————————— */

  function enregistrerSeance(pres, seance) {
    pres.seance = seance;
    pres.statut = "presentee";
  }

  /* Un retour de séance redescend sur la pièce qu'il vise : c'est là qu'il se
   * traite, pas dans un compte rendu que personne ne rouvre. */
  function poserRetour(p, pres, retour) {
    pres.retours.push(retour);
    if (retour.livrableId) {
      var l = (p.livrables || []).filter(function (x) { return x.id === retour.livrableId; })[0];
      if (l) ANNOT.poser(l, 50, 50, retour.texte, null);
    }
  }

  return {
    TYPES: TYPES, NIVEAUX: NIVEAUX, creer: creer, contenu: contenu, controles: controles,
    mockups: mockups, pagesPossibles: pagesPossibles,
    enregistrerSeance: enregistrerSeance, poserRetour: poserRetour,
  };
})();
