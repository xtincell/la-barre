/* objectifs.js — ce que je vise, et ce que les briefs m'imposent.
 *
 * C'est le livrable qui sépare un observatoire d'un poste de commande. Un
 * observatoire montre l'état. Un poste de commande compare l'état à une
 * intention — la mienne, et celle que le brief a fixée.
 *
 * Mes objectifs sont ceux de ma fiche de poste. Je fixe la cible ; l'outil
 * calcule le réel et met l'écart devant moi au moment où j'agis.
 */

window.OBJECTIFS = (function () {

  /* Les miens : tirés des indicateurs de la fiche 03. La cible est à moi. */
  var MIENS = [
    {
      cle: "juniors", nom: "Idées retenues émanant de juniors",
      unite: "par trimestre", cible: 3, sens: "haut",
      source: "fiche 03 · indicateur",
      calcul: function () {
        var n = 0;
        DEPOT.liste("projets").forEach(function (p) {
          (p.seances || []).forEach(function (s) {
            (s.idees || []).forEach(function (i) {
              var pers = DEPOT.trouve("personnes", i.auteur);
              if (pers && pers.seniorite === "junior" && i.retenue) n++;
            });
          });
          (p.sections.pistes || []).forEach(function (pi) {
            if (pi.statut !== "retenue") return;
            var a = DEPOT.trouve("personnes", pi.auteurDA);
            if (a && a.seniorite === "junior") n++;
          });
        });
        return n;
      },
    },
    {
      cle: "premiere", nom: "Pistes retenues à la première présentation",
      unite: "%", cible: 60, sens: "haut",
      source: "fiche 04 · indicateur du DA, que je pilote",
      calcul: function () {
        var pistes = [], retenues = 0;
        DEPOT.liste("projets").forEach(function (p) {
          (p.sections.pistes || []).forEach(function (pi) {
            if (pi.statut === "proposee") return;
            pistes.push(pi);
            if (pi.statut === "retenue") retenues++;
          });
        });
        return pistes.length ? Math.round((retenues / pistes.length) * 100) : null;
      },
    },
    {
      cle: "sansreprise", nom: "Livrables validés sans reprise majeure",
      unite: "%", cible: 80, sens: "haut",
      source: "fiche 03 · indicateur",
      calcul: function () {
        var juges = 0, propres = 0;
        DEPOT.liste("projets").forEach(function (p) {
          (p.livrables || []).forEach(function (l) {
            var vs = (l.versions || []).filter(function (v) { return v.verdict; });
            if (!vs.length) return;
            juges++;
            var retours = vs.filter(function (v) { return v.verdict !== "approuve"; }).length;
            if (retours <= 1) propres++;
          });
        });
        return juges ? Math.round((propres / juges) * 100) : null;
      },
    },
    {
      cle: "delais", nom: "Délais créatifs tenus",
      unite: "%", cible: 90, sens: "haut",
      source: "fiche 03 · indicateur",
      calcul: function () {
        var total = 0, tenus = 0;
        DEPOT.liste("projets").forEach(function (p) {
          (p.livrables || []).forEach(function (l) {
            var d = PLATEAU.echeanceDe(p, l);
            if (!d) return;
            total++;
            if (O.depuis(d) === 0 || REGLES.pretSur(l).part === 100) tenus++;
          });
        });
        return total ? Math.round((tenus / total) * 100) : null;
      },
    },
    {
      cle: "verdict", nom: "Mon délai moyen de verdict",
      unite: "jours", cible: 2, sens: "bas",
      source: "la dérive nommée dans ma fiche",
      calcul: function () {
        var d = [];
        DEPOT.liste("projets").forEach(function (p) {
          (p.livrables || []).forEach(function (l) {
            (l.versions || []).forEach(function (v) {
              if (v.verdict && v.soumis_le && v.juge_le) {
                d.push((new Date(v.juge_le) - new Date(v.soumis_le)) / 86400000);
              }
            });
          });
        });
        if (!d.length) return null;
        return Math.round((d.reduce(function (a, b) { return a + b; }, 0) / d.length) * 10) / 10;
      },
    },
  ];

  /* ————————————————————— Lecture ————————————————————— */

  function tous() {
    var perso = DEPOT.tout().objectifs || {};
    return MIENS.map(function (o) {
      var cible = perso[o.cle] !== undefined ? perso[o.cle] : o.cible;
      var reel = o.calcul();
      var tenu = reel === null ? null
        : o.sens === "haut" ? reel >= cible : reel <= cible;
      return {
        cle: o.cle, nom: o.nom, unite: o.unite, source: o.source, sens: o.sens,
        cible: cible, reel: reel, tenu: tenu,
        ecart: reel === null ? null : (o.sens === "haut" ? reel - cible : cible - reel),
        part: reel === null ? 0 : o.sens === "haut"
          ? Math.min(100, Math.round((reel / (cible || 1)) * 100))
          : Math.min(100, Math.round((cible / (reel || cible || 1)) * 100)),
      };
    });
  }

  function fixer(cle, valeur) {
    var d = DEPOT.tout();
    if (!d.objectifs) d.objectifs = {};
    d.objectifs[cle] = Number(valeur);
    DEPOT.tracer("objectif", "objectifs", cle, "cible fixée à " + valeur);
    DEPOT.enregistrer();
  }

  function manques() {
    return tous().filter(function (o) { return o.tenu === false; });
  }

  /* ————————————————————— Ce que les briefs imposent ————————————————————— */

  function engagements() {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      var ident = p.sections.identite || {};
      var brief = p.sections.brief || {};
      var livrables = (p.livrables || []).filter(function (l) { return !l.annule; });

      var charge = livrables.reduce(function (t, l) { return t + (Number(l.estime) || 0); }, 0);
      var inconnues = livrables.filter(function (l) { return l.estime === null || l.estime === undefined; }).length;
      var joursRestants = ident.echeance
        ? Math.round((new Date(ident.echeance) - new Date()) / 86400000)
        : null;
      /* La durée accordée : d'un bout à l'autre de la fenêtre. Elle dit ce
       * qu'on a eu, là où `joursRestants` dit ce qu'il reste. */
      var duree = (ident.debut && ident.echeance)
        ? Math.round((new Date(ident.echeance) - new Date(ident.debut)) / 86400000)
        : null;

      out.push({
        projet: p,
        echeance: ident.echeance || null,
        joursRestants: joursRestants,
        charge: charge,
        inconnues: inconnues,
        livrables: livrables.length,
        kpis: (brief.kpis || []).length,
        perimetre: (brief.livrables_attendus || []).length,
        /* Une échéance dépassée n'est jamais tenable. Une charge inconnue n'est
         * pas un verdict : c'est une décision qui manque. */
        duree: duree,
        /* Est-ce que ça tenait AU DÉPART ? Faux ici veut dire que la fenêtre
         * était trop courte le jour où on l'a acceptée — ce n'est pas du
         * glissement, c'est un cadrage qui ne pouvait pas marcher. */
        tenableDepart: (duree === null || !charge) ? null : charge <= duree,
        tenable: joursRestants === null ? null
          : joursRestants < 0 ? false
          : (charge === 0 && inconnues) ? null
          : charge <= joursRestants,
        exige: exigences(p, brief, ident),
      });
    });
    return out;
  }

  function exigences(p, brief, ident) {
    var e = [];
    if (brief.contraintes) e.push({ quoi: "Contrainte de production", texte: brief.contraintes });
    if (ident.fenetre) e.push({ quoi: "Fenêtre de diffusion", texte: ident.fenetre });
    if ((brief.kpis || []).length) e.push({ quoi: "Critères de succès", texte: brief.kpis.join(" · ") });
    if (!ident.decideur) e.push({ quoi: "Décideur final", texte: null });
    if (!ident.fenetre) e.push({ quoi: "Fenêtre et dates", texte: null });
    return e;
  }

  return { tous: tous, fixer: fixer, manques: manques, engagements: engagements };
})();
