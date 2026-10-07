/* concepts.js — la réserve de concepts d'une marque.
 *
 * Demande du titulaire (07/10/2026) : « La Pasta dans la marmite, ça sent bon
 * déjà… on ne l'a pas exploité. J'aimerais que ce concept soit réexploité — on
 * a une section brouillon de concept ? »
 *
 * Il n'y en avait pas. Une idée vivait dans un projet : sa séance de concept, ses
 * pistes. Un concept qu'aucune campagne n'a pris — trop tôt, pas le bon brief, pas
 * de budget — disparaissait avec le dossier qui l'avait vu naître. La réserve le
 * garde au niveau de la marque, avec son auteur, sa date et ce qui le porte (un
 * son, un visuel). Reprendre un concept le pose comme idée dans la séance d'un
 * projet : il y entre avec son auteur d'origine, et la réserve garde la trace de
 * chaque reprise. On n'efface rien : un concept écarté reste lisible, avec son motif.
 *
 *   marque.concepts = [{ id, titre, phrase, texte, auteur, cree_le, statut,
 *                        sons: [chemin disque], visuels: [chemin], source,
 *                        reprises: [{ projetId, ideeId, quand }], motif }]
 *   statut : « reserve » · « repris » · « ecarte »
 */

window.CONCEPTS = (function () {
  var el = O.el;

  var ETATS = {
    reserve: { nom: "En réserve", ton: "attente" },
    repris: { nom: "Repris", ton: "vert" },
    ecarte: { nom: "Écarté", ton: "terne" },
  };

  function de(m) { return (m && m.concepts) || []; }

  function nomPersonne(id) { var p = id ? DEPOT.trouve("personnes", id) : null; return p ? p.nom : "auteur non nommé"; }

  function projetsDeMarque(m) {
    return DEPOT.liste("projets").filter(function (p) {
      return ((p.sections || {}).identite || {}).marqueIds && p.sections.identite.marqueIds.indexOf(m.id) !== -1
        && !(window.CLOTURE && CLOTURE.est(p));
    });
  }

  function poser(m, apres) {
    var titre = el("input", { type: "text", placeholder: "La Pasta dans la marmite" });
    var phrase = el("textarea", { rows: 3, placeholder: "Le concept en une phrase" });
    var auteur = el("select", {}, DEPOT.liste("personnes").map(function (p) {
      return el("option", { value: p.id }, p.nom); }));
    auteur.value = "P-alex";
    var corps = el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Titre"), titre),
        el("div.champ", {}, el("label", {}, "Le concept"), phrase),
        el("div.champ", {}, el("label", {}, "Auteur"), el("div.indice", {}, "Celui qui l'a eu. Il le reste à chaque reprise."), auteur)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!titre.value.trim() || !phrase.value.trim()) { AVIS.refus("Un concept se garde avec un titre et sa phrase."); return; }
          m.concepts = de(m).concat([{ id: O.id("CO"), titre: titre.value.trim(), phrase: phrase.value.trim(),
            auteur: auteur.value, cree_le: new Date().toISOString(), statut: "reserve", sons: [], visuels: [], reprises: [] }]);
          DEPOT.tracer("concept mis en réserve", "marques", m.id, titre.value.trim());
          DEPOT.enregistrer(); PANNEAU.fermerSur(); AVIS.fait("« " + titre.value.trim() + " » est en réserve chez " + m.nom + ".");
          if (apres) apres();
        } }, "Mettre en réserve"),
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermerSur(); } }, "Annuler")));
    PANNEAU.sur("Poser un concept", m.nom, corps);
  }

  /* Reprendre : le concept entre dans la séance de concept d'un projet, comme une
   * idée de son auteur. L'arbitrage reste celui du projet. */
  function reprendre(m, c, apres) {
    var ps = projetsDeMarque(m);
    if (!ps.length) { AVIS.refus("Aucun projet ouvert chez " + m.nom + " : ouvre la campagne d'abord, le concept y entrera."); return; }
    var sel = el("select", {}, ps.map(function (p) { return el("option", { value: p.id }, p.ref + " — " + p.nom); }));
    var corps = el("div", {},
      el("p.cg-q", {}, "« " + c.titre + " » entre dans la séance de concept du projet, au nom de "
        + nomPersonne(c.auteur) + ". Le projet l'arbitre comme les autres idées."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Projet"), sel)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var p = DEPOT.trouve("projets", sel.value);
          var idee = { id: O.id("ID"), texte: c.titre + " — " + c.phrase, auteur: c.auteur,
            pose_le: new Date().toISOString(), statut: "proposee", conceptId: c.id,
            source: "réserve de concepts " + m.nom };
          p.idees = (p.idees || []).concat([idee]);
          c.reprises = (c.reprises || []).concat([{ projetId: p.id, ideeId: idee.id, quand: idee.pose_le }]);
          c.statut = "repris";
          DEPOT.tracer("concept repris", "projets", p.id, c.titre);
          DEPOT.enregistrer(); PANNEAU.fermerSur();
          AVIS.fait("« " + c.titre + " » est posé dans la séance de " + p.ref + ".");
          if (apres) apres();
        } }, "Reprendre"),
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermerSur(); } }, "Annuler")));
    PANNEAU.sur("Reprendre un concept", m.nom, corps);
  }

  function ecarter(m, c, apres) {
    PANNEAU.demander("Écarter « " + c.titre + " »", { label: "Pourquoi", lignes: 2,
      aide: "Il reste lisible dans la réserve, avec ce motif.", requis: "Un concept écarté sans motif se rediscute." },
      function (motif) {
        c.statut = "ecarte"; c.motif = motif; c.ecarte_le = new Date().toISOString();
        DEPOT.tracer("concept écarté", "marques", m.id, c.titre + " · " + motif);
        DEPOT.enregistrer(); if (apres) apres();
      });
  }

  function son(chemin) {
    var nom = String(chemin).split("/").pop();
    return el("li.disque-e.disque-a", {},
      el("span.disque-ext", {}, "♪"),
      el("span.disque-t", {}, el("b", {}, nom.replace(/\.[a-z0-9]+$/i, "")),
        window.DISQUE && DISQUE.local ? el("audio", { src: DISQUE.url(chemin), controls: "controls", preload: "none" })
          : el("span", {}, "au disque de l'agence")));
  }

  function carte(m, c, apres) {
    var e = ETATS[c.statut] || ETATS.reserve;
    return el("article.co-c", {},
      el("div.co-t", {}, el("h3", {}, c.titre), UI.eti(e.nom, e.ton)),
      el("p.co-p", {}, c.phrase),
      c.texte ? el("p.co-x", {}, c.texte) : null,
      el("p.co-m", {}, nomPersonne(c.auteur) + " · " + O.joli(String(c.cree_le).slice(0, 10))
        + (c.source ? " · " + c.source : "")),
      (c.visuels || []).length ? el("div.co-v", {}, c.visuels.map(function (v) {
        return el("img", { src: v, alt: "", loading: "lazy" }); })) : null,
      (c.sons || []).length ? el("ul.fonds-l", {}, c.sons.map(son)) : null,
      (c.reprises || []).length ? el("p.co-m", {}, "Repris dans " + c.reprises.map(function (r) {
        var p = DEPOT.trouve("projets", r.projetId); return p ? p.ref : r.projetId; }).join(", ")) : null,
      c.statut === "ecarte" && c.motif ? el("p.co-m", {}, "Écarté : " + c.motif) : null,
      c.statut !== "ecarte" ? el("div.disque-g", {},
        el("button.studio-lien", { type: "button", onclick: function () { reprendre(m, c, apres); } },
          c.statut === "repris" ? "Reprendre ailleurs" : "Reprendre dans un projet"),
        el("button.studio-lien", { type: "button", onclick: function () { ecarter(m, c, apres); } }, "Écarter")) : null);
  }

  function bloc(m, apres) {
    var cs = de(m);
    var vifs = cs.filter(function (c) { return c.statut !== "ecarte"; }).length;
    return el("details.fonds.concepts" + (vifs ? "" : ""), cs.length ? { open: true } : {},
      el("summary", {}, "Concepts en réserve", el("span.studio-compte", {}, String(cs.length)),
        el("span.fonds-q", {}, cs.length
          ? "ce qu'aucune campagne n'a encore pris — il attend son brief, avec son auteur"
          : "aucun concept en attente : un concept non exploité se pose ici plutôt que de mourir avec son dossier")),
      cs.length ? el("div.co-l", {}, cs.map(function (c) { return carte(m, c, apres); })) : null,
      el("button.studio-lien", { type: "button", onclick: function () { poser(m, apres); } }, "Poser un concept"));
  }

  return { bloc: bloc, de: de, reprendre: reprendre };
})();
