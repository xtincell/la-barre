/* demande-version.js — demander une version à quelqu'un, et l'attendre.
 *
 * Le produit savait déjà SOUMETTRE une version : le designer rend, je juge.
 * Il ne savait pas la DEMANDER. Or entre les deux il y a tout ce qui fait
 * qu'un cycle sort ou ne sort pas : à qui je l'ai demandée, pour quand, et
 * depuis combien de jours je l'attends.
 *
 * Sans cet objet, un livrable non rendue ressemble à un livrable non commencé.
 * L'une est de ma faute, l'autre pas — et c'est exactement la distinction que
 * ma fiche me demande de tenir.
 *
 * Une demande n'est pas un renvoi. Le renvoi remonte ce qui n'est pas à moi ;
 * la demande descend ce que j'attends de mon équipe. Elle porte donc ce que
 * le §5 impose à une demande créative : qui, quoi, pour quand — et l'aller-retour
 * qu'elle consomme, parce qu'un aller-retour au-delà du vendu se paie.
 */

window.DEMANDE_VERSION = (function () {
  var el = O.el;

  function ouvertes(l) {
    return (l.demandes || []).filter(function (d) { return !d.rendu_le; });
  }

  function toutes(l) { return (l.demandes || []).slice(); }

  /* Toutes les demandes ouvertes du dépôt, pour la charge de chacun. */
  function parPersonne(id) {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        ouvertes(l).forEach(function (d) {
          if (id && d.qui !== id) return;
          out.push({ projet: p, l: l, d: d,
            retard: d.pour ? O.depuis(d.pour) : null });
        });
      });
    });
    return out.sort(function (a, b) {
      return String(a.d.pour || "9999").localeCompare(String(b.d.pour || "9999")); });
  }

  /* ————————————————————— Le geste ————————————————————— */

  function demander(p, l, apres) {
    var t = VERSION.tours(l, l.toursVendus);
    var prochain = t.faits + 1;
    var depasse = l.toursVendus && prochain > l.toursVendus;

    var selQui = el("select", {});
    selQui.appendChild(el("option", { value: "" }, "— à qui —"));
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + "  ·  " + O.poste(pe.poste).nom);
      if (pe.id === l.responsable) o.selected = true;
      selQui.appendChild(o);
    });

    var quoi = el("textarea", { rows: 3,
      placeholder: "Ce que j'attends de cette version — et à quoi je la jugerai" });
    /* Le brief de production porte déjà le contenu : on ne le recopie pas,
     * on dit ce que CETTE version doit apporter de plus. */
    var b = l.brief || {};
    if (b.concept && !prochain - 1) quoi.value = "";

    var pour = el("input", { type: "date" });
    if (l.remise) pour.value = String(l.remise).slice(0, 10);

    function corps() {
      return el("div", {},
        UI.banniere(depasse ? "rouge" : "",
          depasse
            ? "Ce serait l'aller-retour " + prochain + " sur " + l.toursVendus + " vendus. "
              + "Au-delà du vendu, le temps passé est absorbé par l'agence tant que "
              + "personne n'a tranché qui le porte."
            : "Aller-retour " + prochain + " sur " + (l.toursVendus || 2) + " vendus. "
              + "L'outil n'envoie rien : il écrit la demande et compte les jours."),

        el("div.form", {},
          el("div.champ", {}, el("label", {}, "À qui"), selQui,
            el("div.indice", {}, "Celui qui rend est celui qui en répond : l'affectation "
              + "du livrable suit la demande.")),
          el("div.champ", {}, el("label", {}, "Ce que j'attends"), quoi),
          el("div.champ", {}, el("label", {}, "Pour quand"), pour,
            el("div.indice", {}, l.publication
              ? "La parution est le " + O.joli(l.publication)
                + (l.remise ? " ; la remise est posée au " + O.joli(l.remise) + "." : ".")
              : "Aucune date de parution sur ce livrable."))),

        el("div.form-actions", {},
          el("button.b.or", { type: "button", onclick: function () {
            if (!selQui.value) { AVIS.refus("Une demande sans destinataire n'attend personne."); return; }
            if (!quoi.value.trim()) {
              AVIS.refus("Sans ce que j'attends, la version ne pourra être refusée que par le goût.");
              return;
            }
            poser(p, l, { qui: selQui.value, quoi: quoi.value.trim(),
              pour: pour.value || null, tour: prochain });
            PANNEAU.fermerSur();
            if (apres) apres();
          } }, "Demander la version"),
          el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
      );
    }

    PANNEAU.sur("Demander une version", l.nom, corps());
    setTimeout(function () { quoi.focus(); }, 40);
  }

  function poser(p, l, o) {
    if (!l.demandes) l.demandes = [];
    l.demandes.push({
      id: O.id("DV"), qui: o.qui, quoi: o.quoi, pour: o.pour, tour: o.tour,
      demande_le: new Date().toISOString(), par: MAISON.titulaire,
      rendu_le: null, version: null,
    });
    /* Demander, c'est affecter : le livrable entre dans la semaine de celui à qui
     * on la demande. Sans ça la charge reste fausse. */
    if (!l.responsable) l.responsable = o.qui;
    var q = DEPOT.trouve("personnes", o.qui);
    DEPOT.tracer("version demandée", "livrables", p.id,
      l.nom + " → " + (q ? q.nom : o.qui) + (o.pour ? " pour le " + o.pour : ""));
    DEPOT.enregistrer();
    AVIS.fait("Demande écrite. Elle compte les jours à partir d'aujourd'hui — "
      + "porte-la par ton canal, l'outil n'envoie rien.");
  }

  /* Le designer a rendu : la demande se ferme, la version s'ouvre. */
  function rendue(p, l, dm, apres) {
    dm.rendu_le = new Date().toISOString();
    var n = (l.versions || []).length + 1;
    if (!l.versions) l.versions = [];
    l.versions.push({ n: n, soumis_le: dm.rendu_le, origine: "interne",
      motif: dm.quoi, verdict: null, par: dm.qui });
    l.version = n;
    dm.version = n;
    DEPOT.tracer("version rendue", "livrables", p.id, l.nom + " V" + n);
    DEPOT.enregistrer();
    if (apres) apres();
  }

  /* ————————————————————— Ce qu'on voit ————————————————————— */

  function bouton(p, l, apres) {
    var o = ouvertes(l);
    if (o.length) {
      var dm = o[0];
      var q = DEPOT.trouve("personnes", dm.qui);
      var retard = dm.pour ? O.depuis(dm.pour) : null;
      return el("button.b.or", { type: "button",
        title: dm.quoi,
        onclick: function () { rendue(p, l, dm, apres); } },
        "Marquer rendue" + (retard !== null && retard > 0
          ? "  ·  " + retard + " j de retard"
          : q ? "  ·  " + q.nom.split(" ")[0] : ""));
    }
    return el("button.b", { type: "button",
      onclick: function () { demander(p, l, apres); } }, "Demander une version");
  }

  /* La ligne d'état, pour les écrans qui listent. */
  function ligne(l) {
    var o = ouvertes(l);
    if (!o.length) return null;
    var dm = o[0];
    var q = DEPOT.trouve("personnes", dm.qui);
    var jours = O.depuis(dm.demande_le);
    var retard = dm.pour ? O.depuis(dm.pour) : null;
    return (q ? q.nom.split(" ")[0] : "quelqu'un")
      + " · demandée depuis " + jours + (jours > 1 ? " jours" : " jour")
      + (retard !== null && retard > 0 ? ", en retard de " + retard : "");
  }

  return { ouvertes: ouvertes, toutes: toutes, parPersonne: parPersonne,
    demander: demander, poser: poser, rendue: rendue, bouton: bouton, ligne: ligne };
})();
