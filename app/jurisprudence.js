/* jurisprudence.js — comment j'ai tranché, et sur quel critère.
 *
 * La dérive nommée dans ma fiche : « la construction d'une dépendance qui
 * bloque toute décision en son absence ». Un outil qui ne contient que des
 * états ne transmet rien. Ce qui reste quand je ne suis pas dans la pièce,
 * c'est le motif de chaque arbitrage — et il est déjà obligatoire partout.
 *
 * Rien ne se saisit ici : tout est déjà écrit, éparpillé entre les verdicts,
 * les pistes écartées, les idées arbitrées, les versions, les remarques de
 * revue et les blocages que j'ai déclarés non pertinents. Ce module les
 * rassemble et les range par critère.
 *
 * Et il fait une chose que la simple consultation ne fait pas : il repère les
 * motifs que j'écris à la main encore et encore sans qu'aucun critère ne les
 * porte. Un motif récurrent hors critère est un critère qui demande à être
 * écrit — c'est de là que vient la prochaine ligne du §8.
 */

window.JURISPRUDENCE = (function () {
  /* La famille d'une source dit dans quelle liste de MAISON.criteres un
   * nouveau critère irait se ranger — pas d'où vient l'arbitrage. */
  var SOURCES = {
    piste: { nom: "piste arbitrée", famille: "proposition", poids: 5 },
    idee: { nom: "idée arbitrée", famille: "bigidea", poids: 3 },
    livrable: { nom: "verdict sur un livrable", famille: "livrable", poids: 4 },
    version: { nom: "version close", famille: "livrable", poids: 3 },
    brief: { nom: "verdict sur le brief", famille: "brief", poids: 5 },
    socle: { nom: "verdict sur la plateforme", famille: "brief", poids: 4 },
    strategie: { nom: "verdict sur la stratégie", famille: "brief", poids: 4 },
    bigidea: { nom: "verdict sur la big idea", famille: "bigidea", poids: 5 },
    revue: { nom: "dite en revue", famille: "proposition", poids: 2 },
    blocage: { nom: "blocage écarté", famille: "livrable", poids: 4 },
    ecart: { nom: "écart écarté", famille: "livrable", poids: 3 },
  };

  /* Tous les critères écrits de la maison, à plat, avec leur famille. */
  function criteres() {
    var out = [];
    Object.keys(MAISON.criteres).forEach(function (famille) {
      MAISON.criteresDe(famille).forEach(function (c) {
        out.push({ texte: c, famille: famille, cle: O.normalise(c) });
      });
    });
    return out;
  }

  /* ————————————————————— Le recueil ————————————————————— */

  /* Un arbitrage : ce qui a été tranché, quand, sur quel motif, et si ce motif
   * s'adosse à un critère écrit ou à mon seul jugement. */
  function arbitrage(o) {
    var crit = null;
    if (o.motif) {
      var n = O.normalise(o.motif);
      crit = criteres().filter(function (c) {
        return n === c.cle || n.indexOf(c.cle) !== -1;
      })[0] || null;
    }
    return {
      source: o.source, def: SOURCES[o.source] || { nom: o.source, famille: "autre", poids: 1 },
      quand: o.quand, projet: o.projet || null, quoi: o.quoi, motif: o.motif,
      verdict: o.verdict || null, qui: o.qui || MAISON.titulaire,
      critere: crit,
    };
  }

  function tout() {
    var out = [];
    function pousse(o) { if (o.motif && o.quand) out.push(arbitrage(o)); }

    /* Le registre canonique, quand il existe. */
    DEPOT.liste("decisions").forEach(function (d) {
      pousse({ source: d.type, quand: d.quand, projet: DEPOT.trouve("projets", d.projet),
        quoi: d.titre, motif: d.motif, verdict: d.verdict, qui: d.qui });
    });

    /* Et tout ce qui porte un motif sans être passé par lui — un dossier
     * repris en cours de piste, un dépôt importé, un objet créé à la main. */
    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        if (dejaLa(out, pi.titre, pi.motif)) return;
        pousse({ source: "piste", quand: pi.arbitre_le || pi.cree_le, projet: p,
          quoi: pi.titre, motif: pi.motif,
          verdict: pi.statut === "retenue" ? "approuve" : "hors" });
      });

      (p.idees || []).forEach(function (i) {
        if (dejaLa(out, i.texte, i.motif)) return;
        pousse({ source: "idee", quand: i.arbitre_le || i.quand, projet: p,
          quoi: String(i.texte).slice(0, 80), motif: i.motif,
          verdict: i.statut === "retenue" ? "approuve" : "hors" });
      });

      ["brief", "socle", "strategie", "bigidea"].forEach(function (cle) {
        var v = (p.sections[cle] || {}).validation;
        if (!v || !v.motif) return;
        if (dejaLa(out, VALIDATION.OBJETS[cle].nom, v.motif)) return;
        pousse({ source: cle, quand: v.quand, projet: p,
          quoi: VALIDATION.OBJETS[cle].nom, motif: v.motif, verdict: v.verdict, qui: v.par });
      });

      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        (l.versions || []).forEach(function (v) {
          if (!v.motif || dejaLa(out, l.nom, v.motif)) return;
          pousse({ source: "version", quand: v.close_le || v.ouvert_le, projet: p,
            quoi: l.nom + " · V" + v.n, motif: v.motif, verdict: v.verdict });
        });
      });
    });

    /* Ce que j'ai dit en revue sans que ce soit un verdict. */
    DEPOT.liste("critiques").forEach(function (c) {
      var pe = DEPOT.trouve("personnes", c.personne);
      pousse({ source: "revue", quand: c.quand,
        projet: c.projet ? DEPOT.trouve("projets", c.projet) : null,
        quoi: (pe ? pe.nom + " · " : "") + (c.quoi || "en revue"), motif: c.texte });
    });

    /* Et — c'est la part la plus précieuse — les fois où j'ai décidé que la
     * règle ne s'appliquait pas ici. Sans elles, on refait le débat. */
    DEPOT.liste("blocages").forEach(function (b) {
      if (!b.ecarte) return;
      pousse({ source: "blocage", quand: b.ecarte.quand, quoi: b.cle,
        motif: b.ecarte.motif, verdict: "hors" });
    });
    var ee = DEPOT.tout().ecartsEcartes || {};
    Object.keys(ee).forEach(function (k) {
      pousse({ source: "ecart", quand: ee[k].quand, quoi: k,
        motif: ee[k].motif, verdict: "hors" });
    });

    return out.sort(function (a, b) { return String(b.quand).localeCompare(String(a.quand)); });
  }

  /* Le registre canonique et l'objet portent souvent le même arbitrage : on ne
   * le compte qu'une fois. */
  function dejaLa(out, quoi, motif) {
    if (!motif) return true;
    var n = O.normalise(motif);
    return out.some(function (x) { return O.normalise(x.motif) === n; });
  }

  /* ————————————————————— Par critère ————————————————————— */

  /* La question du poste : « comment a-t-on tranché, les six dernières fois
   * qu'une mécanique n'était pas lisible hors média ? » */
  function parCritere() {
    var arbs = tout();
    return criteres().map(function (c) {
      var cas = arbs.filter(function (a) { return a.critere && a.critere.cle === c.cle; });
      return {
        critere: c, cas: cas,
        /* Un critère invoqué une fois n'est pas une jurisprudence : c'est une
         * décision. Il en faut plusieurs pour qu'une ligne se dégage. */
        etabli: cas.length >= 3,
        constance: constance(cas),
      };
    }).sort(function (a, b) { return b.cas.length - a.cas.length; });
  }

  /* Ai-je tranché pareil à chaque fois ? Si non, c'est le critère qui est mal
   * écrit, pas mes décisions qui sont incohérentes — et il faut le reformuler. */
  function constance(cas) {
    if (cas.length < 2) return null;
    var verdicts = {};
    cas.forEach(function (a) { verdicts[a.verdict || "sans"] = (verdicts[a.verdict || "sans"] || 0) + 1; });
    var cles = Object.keys(verdicts);
    var dominant = cles.sort(function (a, b) { return verdicts[b] - verdicts[a]; })[0];
    var part = Math.round((verdicts[dominant] / cas.length) * 100);
    return { dominant: dominant, part: part, eclate: cles.length > 1 && part < 75 };
  }

  /* ————————————————————— Hors critère ————————————————————— */

  var VIDES = ("le la les de des du un une et ou a au aux en dans sur pour par ce cet cette "
    + "qui que quoi dont est sont pas ne plus moins tres bien mal fait faire cela ceci "
    + "avec sans sous entre vers chez son sa ses leur leurs nous vous ils elles").split(" ");

  function mots(t) {
    return O.normalise(t).replace(/[^a-z0-9]+/g, " ").split(" ")
      .filter(function (m) { return m.length > 4 && VIDES.indexOf(m) === -1; });
  }

  /* Les motifs que j'écris à la main sans qu'aucun critère ne les porte.
   * Regroupés par mots partagés : deux mots significatifs en commun suffisent
   * à reconnaître le même reproche formulé deux fois autrement. */
  function recurrents() {
    var libres = tout().filter(function (a) { return !a.critere; });
    var groupes = [];

    libres.forEach(function (a) {
      var ms = mots(a.motif);
      if (ms.length < 2) return;
      var g = groupes.filter(function (x) {
        return ms.filter(function (m) { return x.mots.indexOf(m) !== -1; }).length >= 2;
      })[0];
      if (g) {
        g.cas.push(a);
        ms.forEach(function (m) { if (g.mots.indexOf(m) === -1) g.mots.push(m); });
      } else {
        groupes.push({ mots: ms.slice(), cas: [a] });
      }
    });

    return groupes.filter(function (g) { return g.cas.length >= 2; })
      .map(function (g) {
        /* Les mots qui reviennent dans tous les cas nomment le critère. */
        var communs = g.mots.filter(function (m) {
          return g.cas.every(function (a) { return mots(a.motif).indexOf(m) !== -1; });
        });
        var cles = communs.length ? communs : g.mots.slice(0, 3);
        /* L'appariement d'un motif à un critère est volontairement strict —
         * sinon on prétendrait qu'un jugement s'adossait à une règle. Mais un
         * groupe récurrent peut très bien paraphraser un critère existant : il
         * faut alors le relire au refus, pas en écrire un second. */
        var proche = criteres().map(function (c) {
          var mc = mots(c.texte);
          return { c: c, n: cles.filter(function (m) { return mc.indexOf(m) !== -1; }).length };
        }).sort(function (a, b) { return b.n - a.n; })[0];
        return { cas: g.cas, mots: cles,
          famille: g.cas[0].def.famille,
          existe: proche && proche.n >= 2 ? proche.c : null };
      })
      .sort(function (a, b) { return b.cas.length - a.cas.length; });
  }

  /* ————————————————————— L'état du recueil ————————————————————— */

  function etat() {
    var arbs = tout();
    var avec = arbs.filter(function (a) { return a.critere; }).length;
    var pc = parCritere();
    return {
      total: arbs.length,
      surCritere: avec,
      libres: arbs.length - avec,
      criteresEcrits: pc.length,
      criteresEtablis: pc.filter(function (x) { return x.etabli; }).length,
      criteresJamais: pc.filter(function (x) { return !x.cas.length; }).length,
      incoherents: pc.filter(function (x) { return x.constance && x.constance.eclate; }),
      aEcrire: recurrents(),
    };
  }

  function chercher(q) {
    if (!q) return tout();
    return tout().filter(function (a) {
      return O.contient(a.motif + " " + a.quoi + " " + (a.critere ? a.critere.texte : ""), q);
    });
  }

  return { SOURCES: SOURCES, criteres: criteres, tout: tout,
    parCritere: parCritere, recurrents: recurrents, etat: etat, chercher: chercher };
})();
