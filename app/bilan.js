/* bilan.js — ce sur quoi je suis évalué, compilé sans ressaisie.
 *
 * Le 30 à minuit, personne ne reconstitue un mois de mémoire : on invente. Ce
 * module ne demande donc aucune saisie — il relit ce que le dépôt a enregistré
 * au fil de l'eau et le range dans l'ordre de ma fiche.
 *
 * Une seule règle nouvelle, et c'est la plus importante : **un zéro parce que
 * rien ne s'est passé et un zéro parce que rien n'est enregistré ne se lisent
 * pas pareil.** Le premier est un résultat, le second est un registre vide.
 * Chaque mesure porte donc son assise — le nombre de faits sur lesquels elle
 * repose — et quand cette assise est nulle, elle ne montre pas « 0 % » mais
 * dit ce qu'il faudrait enregistrer pour qu'elle existe.
 *
 * Sans ça, une fin de mois vide se lit comme une fin de mois calme.
 */

window.BILAN = (function () {
  var el = O.el;

  var PERIODES = {
    mois: { cle: "mois", nom: "Ma fin de mois", court: "le mois", jours: 30 },
    trimestre: { cle: "trimestre", nom: "Mon trimestre", court: "le trimestre", jours: 91 },
  };

  /* ————————————————————— La fenêtre ————————————————————— */

  /* Deux fenêtres, toujours : celle qu'on lit et celle d'avant. Un indicateur
   * sans son évolution ne dit pas si je progresse ou si je glisse. */
  function fenetre(cle, finIso) {
    var def = PERIODES[cle] || PERIODES.mois;
    var fin = finIso ? new Date(finIso) : new Date(O.jour() + "T23:59:59");
    var debut = new Date(fin.getTime() - def.jours * 86400000);
    var avantFin = new Date(debut.getTime() - 1);
    var avantDebut = new Date(avantFin.getTime() - def.jours * 86400000);
    return {
      def: def, debut: debut, fin: fin,
      precedente: { def: def, debut: avantDebut, fin: avantFin, precedente: null },
    };
  }

  function dedans(f, iso) {
    if (!f) return true;
    if (!iso) return false;
    var d = new Date(iso);
    return d >= f.debut && d <= f.fin;
  }

  /* ————————————————————— Une mesure ————————————————————— */

  function mesure(o) {
    return {
      nom: o.nom, valeur: o.valeur, assise: o.assise,
      quoi: o.quoi, sansQuoi: o.sansQuoi, ton: o.ton || "",
      brut: o.brut === undefined ? null : o.brut,
    };
  }

  /* L'évolution ne s'affiche que si les deux fenêtres ont une assise :
   * comparer un chiffre à un registre vide produit une fausse tendance. */
  function evolution(m, avant, sensBas) {
    if (!m || !avant || !m.assise || !avant.assise) return null;
    if (m.brut === null || avant.brut === null) return null;
    var d = Math.round((m.brut - avant.brut) * 10) / 10;
    if (!d) return { sens: "plat", texte: "stable" };
    var mieux = sensBas ? d < 0 : d > 0;
    return {
      sens: mieux ? "mieux" : "moins",
      texte: (d > 0 ? "+" : "") + d + " sur " + (avant.def ? "" : "") + "la période d'avant",
    };
  }

  /* ————————————————————— Les chiffres ————————————————————— */

  /* La même fonction sert Mon standard — sans fenêtre — et la fin de mois —
   * avec. Deux calculs séparés donneraient deux vérités sur le même fait, et
   * c'est exactement l'erreur que ce produit passe son temps à traquer. */
  function chiffres(f) {
    var projets = DEPOT.liste("projets");

    /* Les briefs traités : contresignés, et dans la fenêtre. */
    var briefs = projets.filter(function (p) {
      if (!VALIDATION.valide(p.sections.brief || {})) return false;
      return !f || dedans(f, ((p.sections.brief || {}).validation || {}).quand);
    });
    var ouverts = f
      ? projets.filter(function (p) { return dedans(f, p.cree_le); })
      : projets;

    /* Les big ideas et leur alignement au brief accepté. */
    var idees = 0, retenues = 0, alignees = 0;
    projets.forEach(function (p) {
      var b = p.sections.bigidea || {};
      if (b.idee && (!f || dedans(f, b.pose_le || p.cree_le))) idees++;
      var r = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
      if (r && (!f || dedans(f, r.arbitre_le || p.cree_le))) retenues++;
      if (b.idee && b.rattachement && VALIDATION.valide(p.sections.brief || {})) alignees++;
    });

    /* La qualité des propositions de mon équipe. */
    var props = 0, avecArg = 0, premiere = 0;
    projets.forEach(function (p) {
      (p.sections.pistes || []).forEach(function (x) {
        if (f && !dedans(f, x.cree_le || p.cree_le)) return;
        props++;
        if (x.sacrifice && x.argument) avecArg++;
        if (x.statut === "retenue" && !(x.versions || []).length) premiere++;
      });
    });

    /* Mon propre délai de verdict. Inconfortable, et c'est le but. */
    var delais = [];
    DEPOT.liste("decisions").forEach(function (d) {
      if (!d.quand || !d.soumis_le) return;
      if (f && !dedans(f, d.quand)) return;
      delais.push(Math.max(0, Math.round((new Date(d.quand) - new Date(d.soumis_le)) / 86400000)));
    });
    var enAttente = [];
    projets.forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        var v = (l.versions || [])[(l.versions || []).length - 1];
        if (v && !v.verdict && v.close_le) enAttente.push(O.depuis(v.close_le));
      });
    });
    var tous = delais.concat(f ? [] : enAttente);
    var verdict = tous.length
      ? Math.round((tous.reduce(function (a, b) { return a + b; }, 0) / tous.length) * 10) / 10
      : null;

    /* Le taux de reprise, par compte et par marché. */
    var pieces = 0, reprises = 0, avecVersions = 0, horsFenetre = 0;
    var parCompte = {}, parMarche = {};
    projets.forEach(function (p) {
      var compte = (p.sections.identite || {}).client || "sans client";
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        /* Une pièce compte dans le mois où elle est remise, pas dans celui où
         * elle est née : sinon la fin de mois compte du travail à venir. */
        if (f && !dedans(f, l.remise || l.echeance)) { horsFenetre++; return; }
        pieces++;
        if ((l.versions || []).length) avecVersions++;
        var t = VERSION.tours(l, l.toursVendus);
        var aRepris = t.faits > 0;
        if (aRepris) reprises++;

        if (!parCompte[compte]) parCompte[compte] = { n: 0, r: 0 };
        parCompte[compte].n++; if (aRepris) parCompte[compte].r++;

        var m = l.marche ? DEPOT.trouve("marches", l.marche) : null;
        var cle = m ? m.code : "sans marché";
        if (!parMarche[cle]) parMarche[cle] = { n: 0, r: 0 };
        parMarche[cle].n++; if (aRepris) parMarche[cle].r++;
      });
    });
    var reprise = avecVersions ? Math.round((reprises / pieces) * 100) : null;

    /* Les tours au-delà du vendu : le chiffre qui se porte en négociation. */
    var depassements = 0, joursDepasses = 0;
    projets.forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        var t = VERSION.tours(l, l.toursVendus);
        if (t.depasse) { depassements++; joursDepasses += t.depasse * (l.estime || 1) * 0.5; }
      });
    });

    return {
      fenetre: f,
      projets: ouverts.length, traites: briefs.length,
      idees: idees, retenues: retenues, alignees: alignees,
      props: props, avecArg: avecArg, premiere: premiere,
      verdict: verdict, cibleVerdict: 2, decisions: delais.length,
      reprise: reprise, pieces: pieces, reprises: reprises, avecVersions: avecVersions,
      horsFenetre: horsFenetre,
      parCompte: parCompte, parMarche: parMarche,
      depassements: depassements,
      joursDepasses: Math.round(joursDepasses * 10) / 10,
    };
  }

  /* ————————————————————— Mes six indicateurs ————————————————————— */

  function indicateurs(s) {
    return [
      mesure({ nom: "briefs traités", valeur: s.traites + " / " + s.projets, brut: s.traites,
        assise: s.projets,
        ton: s.projets && s.traites < s.projets ? "alerte" : "vert",
        quoi: s.projets - s.traites
          ? (s.projets - s.traites) + " sans go final : ils n'engagent la Clientèle sur rien"
          : "tous contresignés",
        sansQuoi: "aucun dossier ouvert sur la période" }),

      mesure({ nom: "big ideas retenues", valeur: s.retenues + " / " + s.idees, brut: s.retenues,
        assise: s.idees, ton: s.retenues < s.idees ? "attente" : "vert",
        quoi: s.alignees + " alignées à un brief accepté",
        sansQuoi: "aucune big idea posée — l'indicateur de ma fiche reste à zéro par défaut d'atelier" }),

      mesure({ nom: "propositions argumentées", valeur: s.avecArg + " / " + s.props, brut: s.avecArg,
        assise: s.props, ton: s.avecArg < s.props ? "alerte" : "vert",
        quoi: s.props - s.avecArg
          ? (s.props - s.avecArg) + " sans sacrifice ou sans argument — refusables au §8"
          : "toutes défendables",
        sansQuoi: "aucune proposition reçue de mon équipe sur la période" }),

      mesure({ nom: "retenues au premier tour", valeur: String(s.premiere), brut: s.premiere,
        assise: s.props,
        quoi: s.props ? Math.round((s.premiere / s.props) * 100) + " % des propositions" : "",
        sansQuoi: "aucune proposition présentée : rien à mesurer" }),

      mesure({ nom: "mon délai de verdict",
        valeur: s.verdict === null ? "?" : s.verdict + " j", brut: s.verdict,
        assise: s.decisions,
        ton: s.verdict === null ? "" : s.verdict > s.cibleVerdict ? "alerte" : "vert",
        quoi: s.verdict > s.cibleVerdict
          ? "au-delà de ma cible de " + s.cibleVerdict + " j — c'est la dérive nommée dans ma fiche"
          : "sous ma cible de " + s.cibleVerdict + " j",
        sansQuoi: "aucun verdict daté : le seul indicateur qui porte sur moi ne se calcule pas. "
          + "Il le fera dès qu'une pièce soumise recevra une décision" }),

      mesure({ nom: "livrables repris",
        valeur: s.reprise === null ? "?" : s.reprise + " %", brut: s.reprise,
        assise: s.avecVersions,
        ton: s.reprise === null ? "" : s.reprise > 20 ? "alerte" : "vert",
        quoi: s.reprises + " sur " + s.pieces + " pièces",
        sansQuoi: !s.pieces
          ? "aucune pièce à remettre sur la période"
            + (s.horsFenetre ? " — " + s.horsFenetre + " sont attendues plus tard" : "")
          : "aucune des " + s.pieces + " pièces ne porte de version : le taux de reprise "
            + "n'a pas de dénominateur, et il en aura un à la première soumission" }),
    ];
  }

  /* ————————————————————— Ce que j'ai produit ————————————————————— */

  /* Les livrables de ma propre fiche, relus dans le journal et les objets —
   * jamais ressaisis. */
  function mesLivrables(f) {
    var cadrages = [], revues = [], veilles = [], critiques = [];

    DEPOT.liste("projets").forEach(function (p) {
      var b = p.sections.bigidea || {};
      if (b.idee && dedans(f, b.pose_le || p.cree_le)) {
        cadrages.push(p.ref + " — « " + String(b.idee).slice(0, 70) + " »");
      }
    });

    DEPOT.liste("journal").forEach(function (j) {
      if (!dedans(f, j.quand)) return;
      if (String(j.action).indexOf("verdict") !== -1 || j.type === "revue") {
        revues.push(O.joli(j.quand) + " — " + j.detail);
      }
    });

    DEPOT.liste("engagementsTenus").forEach(function (e) {
      if (!dedans(f, e.quand)) return;
      if (e.personne && e.personne !== MAISON.titulaire) return;
      veilles.push(O.joli(e.quand) + " — " + e.quoi);
    });

    DEPOT.liste("critiques").forEach(function (c) {
      if (!dedans(f, c.quand)) return;
      var pe = DEPOT.trouve("personnes", c.personne);
      critiques.push(O.joli(c.quand) + " — " + (pe ? pe.nom : "?") + " : " + c.quoi);
    });

    return { cadrages: cadrages, revues: revues, veilles: veilles, critiques: critiques };
  }

  /* ————————————————————— Ce que j'ai réclamé ————————————————————— */

  function reclame(f) {
    var ouvertes = [], resolues = [];
    DEPOT.liste("attentes").forEach(function (a) {
      if (a.resolu_le) {
        if (dedans(f, a.resolu_le)) {
          resolues.push(a.quoi + " — " + (a.destinataire || "?")
            + ", rendue en " + Math.max(0, Math.round(
              (new Date(a.resolu_le) - new Date(a.ne_le)) / 86400000)) + " j");
        }
      } else {
        ouvertes.push(a.quoi + " — " + (a.destinataire || "?")
          + ", depuis " + O.depuis(a.ne_le) + " j");
      }
    });
    return { ouvertes: ouvertes, resolues: resolues };
  }

  /* ————————————————————— Le document ————————————————————— */

  function compiler(cle) {
    var f = fenetre(cle);
    var s = chiffres(f);
    var avant = chiffres(f.precedente);
    var ind = indicateurs(s), indAvant = indicateurs(avant);
    var basPourMieux = { "mon délai de verdict": true, "livrables repris": true };
    ind.forEach(function (m, i) {
      m.evol = evolution(m, indAvant[i], !!basPourMieux[m.nom]);
    });

    var mien = mesLivrables(f);
    var att = reclame(f);
    var trimestre = cle === "trimestre";

    return {
      titre: f.def.nom,
      sous: O.joli(f.debut.toISOString()) + "  →  " + O.joli(f.fin.toISOString())
        + "  ·  " + O.poste(MAISON.titulaire).nom,
      blocs: [
        { t: "Mes six indicateurs", mesures: ind,
          source: "les lignes de ma fiche, calculées — pas déclarées" },

        { t: "Mes livrables", siVide: "Rien de déposé sur la période — ma propre fiche "
            + "m'impose pourtant les mêmes engagements récurrents qu'à mon équipe.", lignes: [
          { q: "Cadrages créatifs", v: mien.cadrages.length ? String(mien.cadrages.length) : null },
          { q: "Revues tenues", v: mien.revues.length ? String(mien.revues.length) : null },
          { q: "Veille partagée", v: mien.veilles.length ? String(mien.veilles.length) : null },
          { q: "Critiques données", v: mien.critiques.length ? String(mien.critiques.length) : null },
        ], source: "ce que ma propre fiche m'impose, au même titre que mon équipe" },

        mien.cadrages.length ? { t: "Les cadrages signés", puces: mien.cadrages } : null,
        mien.critiques.length ? { t: "Les critiques données", puces: mien.critiques,
          source: "la matière de « progression mesurée des créatifs encadrés »" } : null,

        { t: "Mon exigence, par compte",
          lignes: Object.keys(s.parCompte).map(function (k) {
            var x = s.parCompte[k];
            return { q: k, v: x.r + " reprises sur " + x.n + " pièces" };
          }),
          corps: Object.keys(s.parCompte).length ? null
            : "Aucune pièce remise sur la période"
              + (s.horsFenetre ? " : les " + s.horsFenetre + " pièces du dossier sont attendues plus tard." : "."),
          source: "« exigence constante y compris sur les petits projets »" },

        Object.keys(s.parMarche).length
          ? { t: "Mon exigence, par marché",
              lignes: Object.keys(s.parMarche).map(function (k) {
                var x = s.parMarche[k];
                return { q: k, v: x.r + " reprises sur " + x.n + " pièces" };
              }) }
          : null,

        s.depassements
          ? { t: "Ce que le périmètre a coûté", lignes: [
              { q: "Pièces au-delà du vendu", v: String(s.depassements) },
              { q: "Jours absorbés", v: s.joursDepasses + " j" },
            ], source: "le chiffre qui rend la clause de reprise crédible en négociation" }
          : { t: "Ce que le périmètre a coûté", videBon: true,
              siVide: "Rien : aucune pièce n'a dépassé les tours vendus.",
              source: "le chiffre qui rend la clause de reprise crédible en négociation" },

        { t: "Ce que j'attends des autres",
          puces: att.ouvertes.length ? att.ouvertes : null,
          videBon: !att.ouvertes.length,
          siVide: "Rien en attente chez quelqu'un d'autre"
            + (att.resolues.length ? " — " + att.resolues.length + " rendues sur la période." : "."),
          source: att.resolues.length
            ? att.resolues.length + " rendues sur la période"
            : "la preuve de ce qui n'avance pas à cause d'un autre" },

        { t: "Mon équipe", equipe: matiereEquipe(f) },

        trimestre ? { t: "Les cumuls à revoir", puces: cumulsARevoir(),
          videBon: true, siVide: "Aucun cumul échu ni sans part déclarée." } : null,
        trimestre ? { t: "Les plans de progression", puces: plansDeProgression(),
          siVide: "Personne à encadrer au dépôt." } : null,
      ].filter(Boolean),
      inferences: [],
    };
  }

  /* ————————————————————— La matière d'évaluation ————————————————————— */

  function matiereEquipe(f) {
    if (!window.EQUIPE) return [];
    return EQUIPE.encadres().map(function (pe) {
      var b = EQUIPE.bilan(pe.id);
      var crits = EQUIPE.critiques(pe.id).filter(function (c) { return dedans(f, c.quand); });
      var engs = EQUIPE.engagements(pe.id);
      var duus = engs.filter(function (x) { return x.etat === "retard" || x.etat === "jamais"; });
      return {
        personne: pe,
        propose: b ? b.propose.length : 0,
        retenu: b ? b.retenu.length : 0,
        repris: b ? b.repris.length : 0,
        critiques: crits.length,
        engagements: (engs.length - duus.length) + " / " + engs.length,
        manque: !crits.length
          ? "aucune critique écrite sur la période — sa progression ne se mesurera pas"
          : b && b.jamaisSurUnePiste
            ? "aucune piste ne lui a été confiée — c'est un talent qu'on ne détecte pas"
            : duus.length
              ? duus.length + (duus.length > 1 ? " engagements de fiche non tenus" : " engagement de fiche non tenu")
              : null,
      };
    });
  }

  function cumulsARevoir() {
    if (!window.EQUIPE) return [];
    var out = [];
    DEPOT.liste("personnes").forEach(function (pe) {
      EQUIPE.cumuls(pe.id).forEach(function (c) {
        if (c.etat === "encours") return;
        out.push(pe.nom + " · " + c.poste.nom + " — " + c.cout);
      });
    });
    return out;
  }

  function plansDeProgression() {
    if (!window.EQUIPE) return [];
    return EQUIPE.encadres().map(function (pe) {
      var crits = EQUIPE.critiques(pe.id);
      var ecartes = crits.filter(function (c) { return c.ton === "ecarte"; }).length;
      return pe.nom + " — " + crits.length + (crits.length > 1 ? " traces" : " trace")
        + ", dont " + ecartes + (ecartes > 1 ? " arbitrages défavorables" : " arbitrage défavorable")
        + (crits.length ? " : la matière du plan est là" : " : rien à en tirer, il faut écrire");
    });
  }

  /* ————————————————————— La fiche d'une personne ————————————————————— */

  /* Pas la note : la matière. Ce que sa fiche exige, en regard de ce qui s'est
   * passé. La note reste à l'ECCP, et c'est très bien ainsi. */
  function parPersonne(id, cle) {
    var f = fenetre(cle);
    var pe = DEPOT.trouve("personnes", id);
    if (!pe) return null;
    var b = EQUIPE.bilan(id);
    var crits = EQUIPE.critiques(id).filter(function (c) { return dedans(f, c.quand); });
    var engs = EQUIPE.engagements(id);
    var cums = EQUIPE.cumuls(id);
    var poste = O.poste(pe.poste);

    return {
      titre: pe.nom,
      sous: poste.nom + "  ·  " + f.def.court + " au " + O.joli(f.fin.toISOString())
        + "  ·  matière d'évaluation, pas notation",
      blocs: [
        { t: "Ce que sa fiche exige", lignes: engs.map(function (x) {
            return { q: x.e.quoi + "  ·  " + x.e.rythme, v: x.texte };
          }),
          siVide: "Aucun engagement récurrent n'est écrit pour ce poste dans la maison — "
            + "il n'y a donc rien à lui réclamer, et rien à lui reprocher.",
          source: "les livrables récurrents, invisibles dans le pipeline et évalués quand même" },

        { t: "Ses propositions", mesures: [
          mesure({ nom: "propositions", valeur: String(b.propose.length), brut: b.propose.length,
            assise: 1, quoi: "routes et idées portées, tous dossiers confondus",
            sansQuoi: "" }),
          mesure({ nom: "retenues", valeur: String(b.retenu.length), brut: b.retenu.length,
            assise: b.propose.length, ton: b.retenu.length ? "vert" : "",
            quoi: b.propose.length
              ? Math.round((b.retenu.length / b.propose.length) * 100) + " % de ses propositions" : "",
            sansQuoi: "rien de proposé sur la période" }),
          mesure({ nom: "pièces reprises", valeur: String(b.repris.length), brut: b.repris.length,
            assise: b.pieces.length, ton: b.repris.length ? "alerte" : "vert",
            quoi: b.sansReprise !== null
              ? b.sansReprise + " % de ses pièces sortent sans repasser par la case départ" : "",
            sansQuoi: "aucune pièce sous sa responsabilité : rien à mesurer" }),
        ] },

        { t: "Ce que je lui ai dit",
          siVide: "Rien d'écrit sur la période. Sans trace, l'entretien se tiendra de mémoire.",
          puces: crits.length
            ? crits.map(function (c) {
                return O.joli(c.quand) + "  ·  " + c.source + " — " + c.motif; })
            : null,
          source: crits.length
            ? "« critiquer le travail, jamais la personne — toujours en expliquant pourquoi »"
            : "sans écrit, cette ligne de ma grille n'est pas vérifiable" },

        cums.length ? { t: "Ses cumuls", lignes: cums.map(function (c) {
            return { q: c.poste.nom + (c.part ? "  ·  " + c.part + " %" : ""), v: c.cout };
          }), source: "contrôle : " + (EQUIPE.controleur(pe) || {}).nom } : null,

        { t: "Ce qui reste à faire pour l'évaluer", puces: manquesPour(b, crits, engs) },
      ].filter(Boolean),
      inferences: [],
    };
  }

  function manquesPour(b, crits, engs) {
    var out = [];
    if (!crits.length) out.push("Écrire au moins une critique datée : sans elle, « progression mesurée » est une impression.");
    if (b.jamaisSurUnePiste) out.push("Lui confier une piste : un créatif qu'on n'y met jamais est un talent qu'on ne détecte pas.");
    if (!b.pieces.length) out.push("Lui affecter une pièce : sans responsabilité nommée, aucun taux ne se calcule.");
    engs.filter(function (x) { return x.etat !== "fait"; }).forEach(function (x) {
      out.push("Réclamer « " + x.e.quoi + " » : "
        + (x.etat === "jamais" ? "jamais déposé" : "en retard de " + x.retard + " j")
        + ", et c'est évalué dans sa fiche.");
    });
    if (!out.length) out.push("Rien : la matière est complète, l'entretien peut se tenir.");
    return out;
  }

  /* ————————————————————— Le texte brut ————————————————————— */

  function texte(d) {
    var out = [d.titre, d.sous, ""];
    d.blocs.filter(Boolean).forEach(function (bl) {
      var corps = [];
      (bl.mesures || []).forEach(function (m) {
        corps.push("  " + (m.assise === 0 ? "—" : m.valeur) + "  " + m.nom
          + (m.evol ? "  (" + m.evol.texte + ")" : ""));
        corps.push("      " + (m.assise === 0 ? m.sansQuoi : m.quoi));
      });
      (bl.puces || []).filter(Boolean).forEach(function (x) { corps.push("  · " + x); });
      (bl.lignes || []).forEach(function (l) { corps.push("  " + l.q + " : " + (l.v || "—")); });
      (bl.equipe || []).forEach(function (x) {
        corps.push("  · " + x.personne.nom + " — " + x.propose + " proposé, " + x.retenu
          + " retenu, " + x.repris + " repris, " + x.critiques + " critiques, engagements "
          + x.engagements + (x.manque ? "\n      " + x.manque : ""));
      });
      if (!corps.length) corps.push("  (rien d'enregistré sur la période)");
      out.push(bl.t.toUpperCase());
      out.push(corps.join("\n"));
      out.push("");
    });
    return out.join("\n");
  }

  return { PERIODES: PERIODES, fenetre: fenetre, dedans: dedans,
    chiffres: chiffres, indicateurs: indicateurs,
    compiler: compiler, parPersonne: parPersonne, texte: texte };
})();
