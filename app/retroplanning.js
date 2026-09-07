/* retroplanning.js — le rétroplanning d'une piste.
 *
 * Une piste ne porte pas qu'un concept : elle porte une chaîne de fabrication,
 * et chaque maillon a une durée. Sans elle, « c'est pour le 3 novembre » ne dit
 * rien : on ne sait pas quand il faut commencer, ni ce qui est déjà en retard.
 *
 * Le calcul se fait à l'envers, depuis la date d'exécution — c'est la seule
 * façon de savoir aujourd'hui si on est déjà en retard.
 */

window.RETRO = (function () {
  var el = O.el;

  /* Les phases d'une CAMPAGNE. Elles valent quel que soit ce qu'on fabrique —
   * une affiche, un rayon, un film. Ce sont les étapes du dossier, pas celles
   * d'un tournage.
   *
   * Une production lourde — film, 3D, événement — ne remplace pas cette chaîne :
   * elle s'y imbrique, entre la décision client et la remise. */
  var PHASES = [
    { cle: "cadrage", nom: "Cadrage", jours: 5,
      quoi: "brief accepté, plateforme de marque, stratégie — ce qui ferme le périmètre", poste: "clientele" },
    { cle: "conception", nom: "Conception", jours: 12,
      quoi: "atelier, big idea, pistes et leurs KV — l'étage 1", poste: "creation" },
    { cle: "presentation", nom: "Présentation", jours: 3,
      quoi: "montage du dossier, répétition, séance client", poste: "clientele" },
    { cle: "decision", nom: "Décision client", jours: 10,
      quoi: "les allers-retours jusqu'à la piste retenue. Ce délai n'est pas le nôtre.",
      poste: "clientele", subi: true },
    { cle: "execution", nom: "Exécution", jours: 10,
      quoi: "adaptations par marché, déclinaisons, gabarits, BAT", poste: "graphic" },
    { cle: "remise", nom: "Remise", jours: 3,
      quoi: "fichiers chez l'imprimeur ou la régie — la date qui ne bouge pas", poste: "creation" },
    { cle: "diffusion", nom: "Diffusion", jours: 0,
      quoi: "l'exécution du dispositif sur le terrain", poste: "clientele" },
  ];

  /* Les phases d'une PRODUCTION lourde. Elles n'existent que pour les livrables
   * qui en demandent une, et se logent dans la fenêtre d'exécution de la
   * campagne — jamais à côté. */
  var PRODUCTION_PHASES = [
    { cle: "preproduction", nom: "Préproduction", jours: 7,
      quoi: "casting, repérages, devis, autorisations, estimation technique", poste: "creation" },
    { cle: "tournage", nom: "Production", jours: 3,
      quoi: "tournage, shooting, captation", poste: "motion" },
    { cle: "postproduction", nom: "Postproduction", jours: 10,
      quoi: "montage, étalonnage, son, exports", poste: "motion" },
  ];

  /* Les supports qui exigent une production lourde. Pour les autres, l'exécution
   * suffit : on n'ouvre pas un plan de tournage pour un stop-rayon. */
  var LOURDS = ["film", "motion3d", "event"];

  function estLourd(l) {
    var s = DEPOT.trouve("supports", l.support);
    return !!s && LOURDS.indexOf(s.type) !== -1;
  }

  /* Ce que la piste doit produire en lourd. Au stade proposition, un film ne
   * se tourne pas : il se pitche. C'est le rang commercial qui le dit. */
  function productions(p, pi) {
    return (p.livrables || []).filter(function (l) {
      return !l.annule && l.pisteId === pi.id && estLourd(l);
    });
  }

  function plan(pi) { return pi.retro || null; }

  /* Ajoute n jours ouvrés à une date. Le samedi et le dimanche ne produisent
   * rien, et faire semblant du contraire fausse tous les rétroplannings. */
  function ouvres(d, n) {
    var x = new Date(d);
    var sens = n < 0 ? -1 : 1;
    var reste = Math.abs(n);
    while (reste > 0) {
      x.setDate(x.getDate() + sens);
      var j = x.getDay();
      if (j !== 0 && j !== 6) reste--;
    }
    return x;
  }

  /* Le calcul à l'envers : depuis la date d'exécution, on remonte. */
  function calculer(pi, finLe) {
    var p = plan(pi) || { phases: {} };
    var out = [];
    var curseur = new Date(finLe);

    PHASES.slice().reverse().forEach(function (ph) {
      var j = p.phases[ph.cle] !== undefined ? p.phases[ph.cle] : ph.jours;
      if (!j) { out.unshift({ ph: ph, jours: 0, hors: true }); return; }
      var fin = new Date(curseur);
      var debut = ouvres(fin, -j);
      out.unshift({ ph: ph, jours: j, debut: O.jour(debut), fin: O.jour(fin) });
      curseur = debut;
    });
    return { phases: out, demarrage: out.filter(function (x) { return !x.hors; })[0] };
  }

  /* Où on en est réellement, phase par phase. */
  function etat(p, pi) {
    var fin = finDe(p, pi);
    if (!fin) return null;
    var c = calculer(pi, fin);
    var auj = O.jour();
    var total = 0;
    c.phases.forEach(function (x) { if (!x.hors) total += x.jours; });

    var enCours = null, retard = 0;
    c.phases.forEach(function (x) {
      if (x.hors) return;
      if (x.debut <= auj && auj <= x.fin) enCours = x;
      if (x.fin < auj && !(plan(pi) && (plan(pi).faites || []).indexOf(x.ph.cle) !== -1)) {
        retard += x.jours;
      }
    });

    var demarrage = c.demarrage ? c.demarrage.debut : null;
    return {
      phases: c.phases, fin: fin, total: total, enCours: enCours, retard: retard,
      demarrage: demarrage,
      commenceHier: demarrage && demarrage < auj,
      joursAvantDemarrage: demarrage ? Math.round((new Date(demarrage) - new Date(auj)) / 86400000) : null,
    };
  }

  /* La date de fin d'une piste : la première exécution de son dispositif, ou
   * l'échéance du dossier à défaut. */
  function finDe(p, pi) {
    var dates = (pi.dispositif || []).map(function (a) { return a.debut; }).filter(Boolean).sort();
    if (dates.length) return dates[0];
    return (p.sections.identite || {}).echeance || null;
  }

  /* ————————————————————— Le bloc, dans la piste ————————————————————— */

  function bloc(p, pi, apres) {
    var e = etat(p, pi);
    if (!e) {
      return el("div.rt-bloc", {},
        el("div.rtbl-tete", {}, el("span.t", {}, "LE RÉTROPLANNING"),
          el("span.n", {}, "aucune date d'exécution"),
          el("button.b.nu", { type: "button", onclick: function () { editer(p, pi, apres); } }, "régler")),
        el("p.rien", {}, "Ni activité datée, ni échéance de dossier : impossible de dire quand il faut commencer."));
    }

    return el("div.rt-bloc", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, "LE RÉTROPLANNING"),
        el("span.n", {}, e.total + " jours ouvrés  ·  exécution le " + O.joli(e.fin)),
        el("button.b.nu", { type: "button", onclick: function () { editer(p, pi, apres); } }, "régler")),

      e.commenceHier
        ? UI.banniere("rouge", "À ce rythme il fallait commencer le " + O.joli(e.demarrage)
            + " — soit il y a " + (-e.joursAvantDemarrage) + " jours. Chaque jour de plus se prend sur une phase, et la première qui saute est toujours la préproduction.")
        : UI.banniere("vert", "Le démarrage est au " + O.joli(e.demarrage)
            + ", dans " + e.joursAvantDemarrage + " jours."),

      productionsBloc(p, pi, apres),

      el("div.re-l", {}, e.phases.map(function (x, n) {
        if (x.hors) return el("div.re-p.hors", {},
          el("span.rep-n", {}, x.ph.nom),
          el("span.rep-q", {}, "ne s'applique pas"));
        var faite = plan(pi) && (plan(pi).faites || []).indexOf(x.ph.cle) !== -1;
        var passee = x.fin < O.jour();
        var ici = e.enCours && e.enCours.ph.cle === x.ph.cle;
        return el("button.re-p" + (faite ? ".faite" : ici ? ".ici" : passee ? ".retard" : ""), {
          type: "button",
          onclick: function () { basculer(pi, x.ph.cle, apres); },
        },
          el("span.rep-n", {}, x.ph.nom, el("i", {}, x.jours + " j")),
          el("span.rep-d", {}, O.joli(x.debut) + "  →  " + O.joli(x.fin)),
          el("span.rep-q", {}, x.ph.quoi),
          el("span.rep-e", {}, ETAT.phase(x, faite, ici, passee, e.phases.length - n - 1).quoi),
          el("span.rep-w", {}, O.poste(x.ph.poste).court));
      }))
    );
  }

  /* Les productions lourdes de la piste, imbriquées dans sa fenêtre. */
  function productionsBloc(p, pi, apres) {
    var ls = productions(p, pi);
    if (!ls.length) return null;
    var rang = window.PRIORITE ? PRIORITE.rang(pi) : 3;

    return el("div.re-prod", {},
      el("div.rep-t", {}, "PRODUCTIONS LOURDES",
        el("span", {}, ls.length + (ls.length > 1 ? " livrables" : " livrable"))),

      rang >= 2
        ? UI.banniere("", "Tant que la piste n'est pas validée, un film ne se tourne pas : il se pitche. "
            + "Concept, storyboard, et une ébauche d'animation si le temps le permet — le plan de tournage ne s'ouvre qu'après signature.")
        : null,

      el("div", {}, ls.map(function (l) {
        var pl = planProduction(p, pi, l);
        if (!pl) return null;
        return el("div.rep-p" + (pl.deborde ? ".deborde" : ""), {},
          el("div.repp-t", {},
            el("span.repp-n", {}, l.nom),
            el("span.repp-j", {}, pl.total + " j ouvrés"),
            el("span.repp-f", {}, "dans la fenêtre du " + O.joli(pl.fenetre.debut)
              + " au " + O.joli(pl.fenetre.fin))),

          pl.deborde
            ? UI.banniere("rouge", "Cette production demande " + pl.manque
                + " jours de plus que la fenêtre d'exécution. Soit on avance la décision client, "
                + "soit on recule la diffusion, soit on tourne moins. Elle ne rentre pas telle quelle.")
            : null,

          el("div.repp-l", {}, pl.phases.map(function (x) {
            if (x.hors) return null;
            return el("div.repp-x", {},
              el("span.reppx-n", {}, x.ph.nom, el("i", {}, x.jours + " j")),
              el("span.reppx-d", {}, O.joli(x.debut) + "  →  " + O.joli(x.fin)),
              el("span.reppx-q", {}, x.ph.quoi));
          })));
      })));
  }

  function basculer(pi, cle, apres) {
    if (!pi.retro) pi.retro = { phases: {}, faites: [] };
    if (!pi.retro.faites) pi.retro.faites = [];
    var i = pi.retro.faites.indexOf(cle);
    if (i === -1) pi.retro.faites.push(cle); else pi.retro.faites.splice(i, 1);
    DEPOT.enregistrer(); if (apres) apres();
  }

  function editer(p, pi, apres) {
    if (!pi.retro) pi.retro = { phases: {}, faites: [] };
    var champs = {};
    var corps = el("div.form", {}, PHASES.map(function (ph) {
      var i = el("input", { type: "number", min: "0", step: "1" });
      i.value = pi.retro.phases[ph.cle] !== undefined ? pi.retro.phases[ph.cle] : ph.jours;
      champs[ph.cle] = i;
      return el("div.champ", {},
        el("label", {}, ph.nom + " — jours ouvrés"),
        el("div.indice", {}, ph.quoi + "  ·  zéro = ne s'applique pas"), i);
    }));

    PANNEAU.sur("Régler le rétroplanning", pi.titre || "", el("div", {},
      UI.banniere("", "Le calcul part de la première date d'exécution du dispositif et remonte. Mettre une phase à zéro la retire de la chaîne."),
      corps,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          PHASES.forEach(function (ph) {
            pi.retro.phases[ph.cle] = Math.max(0, parseInt(champs[ph.cle].value, 10) || 0);
          });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* Le plan d'une production lourde, calé sur la fenêtre d'exécution de la
   * campagne. S'il déborde, on le dit — c'est là que le film fait sauter tout
   * le reste. */
  function planProduction(p, pi, l) {
    var e = etat(p, pi);
    if (!e) return null;
    var exec = e.phases.filter(function (x) { return x.ph.cle === "execution"; })[0];
    var remise = e.phases.filter(function (x) { return x.ph.cle === "remise"; })[0];
    if (!exec || exec.hors) return null;

    var total = PRODUCTION_PHASES.reduce(function (n, x) {
      return n + ((l.retro && l.retro[x.cle] !== undefined) ? l.retro[x.cle] : x.jours); }, 0);

    /* On remonte depuis la remise, comme pour la campagne. */
    var curseur = new Date(remise ? remise.debut : exec.fin);
    var out = [];
    PRODUCTION_PHASES.slice().reverse().forEach(function (ph) {
      var j = (l.retro && l.retro[ph.cle] !== undefined) ? l.retro[ph.cle] : ph.jours;
      if (!j) { out.unshift({ ph: ph, jours: 0, hors: true }); return; }
      var fin = new Date(curseur);
      var debut = ouvres(fin, -j);
      out.unshift({ ph: ph, jours: j, debut: O.jour(debut), fin: O.jour(fin) });
      curseur = debut;
    });

    var demarrage = out.filter(function (x) { return !x.hors; })[0];
    var deborde = demarrage && exec.debut && demarrage.debut < exec.debut;
    return { phases: out, total: total, demarrage: demarrage ? demarrage.debut : null,
      fenetre: { debut: exec.debut, fin: remise ? remise.debut : exec.fin },
      deborde: deborde,
      manque: deborde ? Math.round((new Date(exec.debut) - new Date(demarrage.debut)) / 86400000) : 0 };
  }

  return { PHASES: PHASES, PRODUCTION_PHASES: PRODUCTION_PHASES, LOURDS: LOURDS,
    estLourd: estLourd, productions: productions, planProduction: planProduction,
    plan: plan, calculer: calculer, etat: etat,
    finDe: finDe, bloc: bloc, editer: editer, ouvres: ouvres };
})();
