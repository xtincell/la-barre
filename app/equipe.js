/* equipe.js — la matière d'évaluation, calculée et non saisie.
 *
 * Ma fiche m'évalue sur « la progression mesurée des créatifs encadrés ». Sans
 * trace de ce que j'ai dit à qui, c'est une impression — et au moment de
 * l'entretien trimestriel, on reconstitue de mémoire, c'est-à-dire mal.
 *
 * Presque tout est déjà au dépôt : chaque verdict, chaque route écartée, chaque
 * idée arbitrée porte son motif obligatoire. Ce module ne demande donc aucune
 * saisie nouvelle — il rassemble ce qui existe et l'attribue à une personne.
 *
 * Une seule chose ne se dérive pas : la remarque faite en revue qui n'est pas
 * un verdict. Celle-là se pose à la main, et c'est le seul ajout.
 */

window.EQUIPE = (function () {
  var el = O.el;

  /* Les gens que j'encadre. Ma fiche en nomme six : le DA et le Planning en
   * direct, puis Graphic, Motion IA, Motion 3D et Web par le DA. */
  var ENCADRES = ["da", "planning", "redacteur", "graphic", "motion", "motion3d", "webdesign"];

  function encadres() {
    return DEPOT.liste("personnes").filter(function (p) {
      /* Une personne archivée a quitté le plateau : elle reste au dépôt — on
       * n'efface rien — mais on ne l'encadre plus, et elle ne compte plus dans
       * « progression mesurée des créatifs encadrés ». */
      if (p.archive) return false;
      if (p.poste === MAISON.titulaire) return false;
      if (ENCADRES.indexOf(p.poste) !== -1) return true;
      return (p.casquettes || []).some(function (c) { return ENCADRES.indexOf(c.poste) !== -1; });
    });
  }

  /* ————————————————————— Ce qu'une personne a produit ————————————————————— */

  /* Proposé, retenu, repris : les trois nombres qui font une évaluation, et
   * qu'aucun outil ne sait donner parce qu'ils traversent les dossiers. */
  function bilan(id) {
    var pe = DEPOT.trouve("personnes", id);
    if (!pe) return null;

    var propose = [], retenu = [], repris = [], pieces = [];

    DEPOT.liste("projets").forEach(function (p) {
      /* Les routes qu'il a portées. */
      (p.sections.pistes || []).forEach(function (pi) {
        if (pi.auteurDA !== id && pi.auteurCR !== id) return;
        propose.push({ type: "route", projet: p, objet: pi, nom: pi.titre,
          quand: pi.cree_le || null });
        if (pi.statut === "retenue") retenu.push({ type: "route", projet: p, objet: pi, nom: pi.titre });
      });

      /* Les idées qu'il a posées en atelier. */
      (p.idees || []).forEach(function (i) {
        if (i.auteur !== id) return;
        propose.push({ type: "idee", projet: p, objet: i, nom: i.texte, quand: i.quand });
        if (i.statut === "retenue") retenu.push({ type: "idee", projet: p, objet: i, nom: i.texte });
      });

      /* Les pièces dont il répond. */
      (p.livrables || []).forEach(function (l) {
        if (l.annule || l.responsable !== id) return;
        pieces.push({ projet: p, l: l });
        var t = VERSION.tours(l, l.toursVendus);
        if (t.faits > 0) repris.push({ type: "piece", projet: p, objet: l, nom: l.nom, tours: t });
      });
    });

    var c = PLATEAU.chargeDe(id, null);

    return {
      personne: pe, propose: propose, retenu: retenu, repris: repris, pieces: pieces,
      charge: c,
      /* Le taux qui compte : ce qui sort sans repasser par la case départ. */
      sansReprise: pieces.length
        ? Math.round(((pieces.length - repris.length) / pieces.length) * 100) : null,
      /* Un créatif jamais affecté à une piste est un talent qu'on ne détecte
       * pas — c'est une ligne de ma fiche. */
      jamaisSurUnePiste: propose.filter(function (x) { return x.type === "route"; }).length === 0,
    };
  }

  /* ————————————————————— Ce que je lui ai dit ————————————————————— */

  /* Chaque arbitrage qui a touché son travail est une critique, qu'on l'ait
   * appelée comme ça ou non. On les rassemble plutôt que de les redemander.
   *
   * La date d'arbitrage n'est pas toujours saisie — la date de dépôt fait
   * alors foi. Sans cette tolérance, un motif écrit mais non daté disparaît
   * de l'entretien, ce qui est exactement le contraire du but. */
  function critiques(id) {
    var out = [];
    function quand() {
      for (var i = 0; i < arguments.length; i++) if (arguments[i]) return arguments[i];
      return null;
    }

    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        if (pi.auteurDA !== id && pi.auteurCR !== id) return;
        if (!pi.motif) return;
        out.push({ quand: quand(pi.arbitre_le, pi.cree_le), projet: p,
          quoi: pi.titre, motif: pi.motif,
          ton: pi.statut === "retenue" ? "retenu" : "ecarte",
          source: pi.statut === "retenue" ? "route retenue" : "route écartée" });
      });

      (p.idees || []).forEach(function (i) {
        if (i.auteur !== id || !i.motif) return;
        out.push({ quand: quand(i.arbitre_le, i.quand), projet: p,
          quoi: i.texte.slice(0, 70), motif: i.motif,
          ton: i.statut === "retenue" ? "retenu" : "ecarte",
          source: i.statut === "retenue" ? "idée retenue" : "idée écartée" });
      });

      (p.livrables || []).forEach(function (l) {
        if (l.annule || l.responsable !== id) return;
        (l.versions || []).forEach(function (v) {
          if (!v.motif) return;
          out.push({ quand: quand(v.close_le, v.ouvert_le), projet: p,
            quoi: l.nom, motif: v.motif,
            ton: v.verdict === "approuve" ? "retenu" : "ecarte",
            source: "V" + v.n + " · " + (VERSION.ORIGINES[v.origine] || {}).nom });
        });
        ANNOT.liste(l).forEach(function (a) {
          if (!a.texte) return;
          out.push({ quand: a.quand, projet: p, quoi: l.nom, motif: a.texte,
            ton: "note", source: "annotation sur le visuel" });
        });
      });
    });

    /* Les remarques posées à la main : ce qui n'est pas un verdict. */
    DEPOT.liste("critiques").filter(function (c) { return c.personne === id; })
      .forEach(function (c) {
        out.push({ quand: c.quand, projet: c.projet ? DEPOT.trouve("projets", c.projet) : null,
          quoi: c.quoi || "en revue", motif: c.texte, ton: c.ton || "note",
          source: "dite en revue", id: c.id });
      });

    return out.filter(function (x) { return x.quand; })
      .sort(function (a, b) { return String(b.quand).localeCompare(String(a.quand)); });
  }

  function noter(id, quoi, texte, ton, projetId) {
    DEPOT.ajoute("critiques", { personne: id, quoi: quoi, texte: texte,
      ton: ton || "note", projet: projetId || null, quand: new Date().toISOString(),
      par: MAISON.titulaire });
  }

  /* ————————————————————— Ce que sa fiche lui impose ————————————————————— */

  var PERIODES = {
    hebdomadaire: 7, mensuel: 30, trimestriel: 91,
    "par campagne": null, "par livraison": null, annuel: 365,
  };

  /* Les engagements récurrents sont évalués dans les fiches, invisibles dans le
   * pipeline, et sacrifiés les premiers quand la production déborde. Ici ils
   * portent leur échéance. */
  function engagements(id) {
    var pe = DEPOT.trouve("personnes", id);
    if (!pe) return [];
    var postes = [pe.poste].concat((pe.casquettes || []).map(function (c) { return c.poste; }));

    return MAISON.engagements.filter(function (e) {
      return postes.indexOf(e.poste) !== -1;
    }).map(function (e) {
      var tenus = DEPOT.liste("engagementsTenus").filter(function (t) {
        return t.personne === id && t.quoi === e.quoi;
      }).sort(function (a, b) { return String(b.quand).localeCompare(String(a.quand)); });
      var dernier = tenus[0] || null;
      var jours = PERIODES[e.rythme];

      /* La conséquence est la même dans les deux cas de « jamais » : un
       * engagement évalué qui n'a laissé aucune trace ne se prouvera pas à
       * l'entretien, et se sacrifie en silence dès que la production déborde. */
      if (!jours) {
        return { e: e, dernier: dernier, etat: dernier ? "fait" : "jamais",
          texte: dernier ? "dernier le " + O.joli(dernier.quand)
            : "jamais déposé — évalué dans sa fiche, invisible partout ailleurs",
          retard: 0 };
      }
      if (!dernier) {
        return { e: e, dernier: null, etat: "jamais",
          texte: "jamais déposé — évalué dans sa fiche, invisible partout ailleurs",
          retard: null };
      }
      var age = O.depuis(dernier.quand);
      var retard = age - jours;
      return { e: e, dernier: dernier, retard: retard,
        etat: retard > 0 ? "retard" : "fait",
        texte: retard > 0
          ? "en retard de " + retard + (retard > 1 ? " jours" : " jour")
          : age === 0 ? "déposé aujourd'hui — le prochain est dû dans " + jours + " jours"
          : "déposé il y a " + age + (age > 1 ? " jours" : " jour")
            + " — le prochain est dû dans " + (jours - age)
            + (jours - age > 1 ? " jours" : " jour") };
    });
  }

  function deposer(id, quoi, apres) {
    DEPOT.ajoute("engagementsTenus", { personne: id, quoi: quoi,
      quand: new Date().toISOString(), par: MAISON.titulaire });
    DEPOT.tracer("engagement déposé", "equipe", null, quoi);
    if (apres) apres();
  }

  /* ————————————————————— Les cumuls et leur échéance ————————————————————— */

  /* Un cumul prolongé trois trimestres de suite est un poste que l'agence
   * occupe sans l'avoir écrit. L'échéance le dit. */
  function cumuls(id) {
    var pe = DEPOT.trouve("personnes", id);
    if (!pe) return [];
    return (pe.casquettes || []).map(function (c) {
      var jours = c.revue_le
        ? Math.round((new Date(c.revue_le) - new Date(O.jour())) / 86400000) : null;
      return {
        c: c, poste: O.poste(c.poste),
        part: c.part || null,
        /* Une casquette sans part déclarée rend la charge de cette personne
         * fausse — c'est le seul chiffre qui compte ici. */
        etat: !c.part ? "sansPart" : jours === null ? "sansEcheance"
          : jours < 0 ? "echue" : "encours",
        jours: jours,
        cout: !c.part ? "la charge de " + pe.nom.split(" ")[0] + " est fausse tant que la part n'est pas déclarée"
          : jours === null ? "sans date de revue, ce cumul devient un poste non écrit"
          : jours < 0 ? "échu depuis " + (-jours) + " jours — à prolonger, transformer en poste, ou rendre"
          : "à revoir dans " + jours + " jours",
      };
    });
  }

  /* Le contrôle qui s'applique quand quelqu'un cumule : règle 2 des cumuls —
   * quand le contrôleur et le contrôlé sont la même personne, le contrôle
   * remonte d'un cran. */
  function controleur(pe) {
    if (!pe) return null;
    var cumuleMonPoste = (pe.casquettes || []).some(function (c) { return c.poste === MAISON.titulaire; })
      || pe.poste === MAISON.titulaire;
    if (cumuleMonPoste) {
      var au = O.poste(MAISON.titulaire).rattache;
      return au ? O.poste(au) : null;
    }
    return O.poste(MAISON.titulaire);
  }

  return { ENCADRES: ENCADRES, encadres: encadres, bilan: bilan,
    critiques: critiques, noter: noter,
    engagements: engagements, deposer: deposer,
    cumuls: cumuls, controleur: controleur };
})();
