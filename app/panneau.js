/* panneau.js — le panneau latéral, générique. Tout le détail passe par lui. */

window.PANNEAU = (function () {
  var el = O.el;
  var ouvert = null;
  var retourFocus = null;
  var retourFocusSur = null;

  function fermer() {
    if (!ouvert) return;
    fermerSur();
    document.body.removeChild(ouvert);
    ouvert = null;
    document.removeEventListener("keydown", surTouche);
    if (retourFocus && retourFocus.isConnected) retourFocus.focus();
  }

  function surTouche(e) {
    var actif = dessus || ouvert;
    if (!actif) return;
    if (e.key === "Escape") { e.preventDefault(); if (dessus) fermerSur(); else fermer(); return; }
    if (e.key !== "Tab") return;
    var choix = Array.prototype.slice.call(actif.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]'))
      .filter(function (n) { return !n.disabled && n.getClientRects().length; });
    if (!choix.length) return;
    var premier = choix[0], dernier = choix[choix.length - 1];
    if (e.shiftKey && (document.activeElement === premier || !actif.contains(document.activeElement))) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && (document.activeElement === dernier || !actif.contains(document.activeElement))) { e.preventDefault(); premier.focus(); }
  }

  function ouvrir(titre, etiquette, corps, couleur) {
    fermer();
    retourFocus = document.activeElement;
    var p = el("aside.panneau", { role: "dialog", "aria-modal": "true", "aria-label": titre, style: { "--dir": couleur || "var(--accent)" } },
      el("div.panneau-tete", {},
        el("h2", {}, titre),
        etiquette ? el("span.etat", {}, etiquette) : null,
        el("button.panneau-fermer", { type: "button", onclick: fermer, "aria-label": "Fermer le panneau" }, "✕")
      ),
      el("div.panneau-corps", {}, corps)
    );
    var env = el("div", {}, el("div.voile", { onclick: fermer }), p);
    document.body.appendChild(env);
    ouvert = env;
    document.addEventListener("keydown", surTouche);
    p.querySelector("button").focus();
    return p;
  }

  function ligne(etiq, valeur, vide) {
    return el("div.ligne", {},
      el("span.etiq", {}, etiq),
      el("span.val" + (vide ? ".vide" : ""), {}, valeur || "non renseigné")
    );
  }

  function sousbloc(titre, contenu) {
    return el("div.sousbloc", {}, el("h3", {}, titre), contenu);
  }

  function puces(liste) {
    if (!liste || !liste.length) return el("p.rien", {}, "Rien de saisi.");
    return el("ul.puces", {}, liste.map(function (x) { return el("li", {}, x); }));
  }

  /* Un second panneau, par-dessus le premier : poser un retour sans perdre
   * ce qu'on regardait. */
  var dessus = null;

  function sur(titre, etiquette, corps) {
    fermerSur();
    retourFocusSur = document.activeElement;
    var p = el("aside.panneau.dessus", { role: "dialog", "aria-modal": "true", "aria-label": titre },
      el("div.panneau-tete", {},
        el("h2", {}, titre),
        etiquette ? el("span.etat", {}, etiquette) : null,
        el("button.panneau-fermer", { type: "button", onclick: fermerSur, "aria-label": "Fermer le dialogue" }, "✕")
      ),
      el("div.panneau-corps", {}, corps)
    );
    var env = el("div", {}, el("div.voile.voile-dessus", { onclick: fermerSur }), p);
    document.body.appendChild(env);
    dessus = env;
    document.addEventListener("keydown", surTouche);
    p.querySelector("button").focus();
    return p;
  }

  function fermerSur() {
    if (!dessus) return;
    document.body.removeChild(dessus);
    dessus = null;
    if (retourFocusSur && retourFocusSur.isConnected) retourFocusSur.focus();
    if (!ouvert) document.removeEventListener("keydown", surTouche);
  }

  /* Demander une valeur sans window.prompt : le navigateur le bloque dans les
   * contextes encadrés, et une saisie qui disparaît sans prévenir est pire
   * qu'une saisie laide. */
  function demander(titre, o, quand) {
    o = o || {};
    var champ = o.lignes && o.lignes > 1
      ? el("textarea", { rows: o.lignes, placeholder: o.exemple || "" })
      : el("input", { type: o.type || "text", placeholder: o.exemple || "" });
    if (o.valeur !== undefined && o.valeur !== null) champ.value = String(o.valeur);

    var corps = el("div", {},
      o.avertissement ? UI.banniere(o.ton || "", o.avertissement) : null,
      el("div.form", {}, el("div.champ", {},
        o.label ? el("label", {}, o.label) : null,
        o.aide ? el("div.indice", {}, o.aide) : null,
        champ)),
      o.choix && o.choix.length
        ? el("div.motifs", {}, o.choix.map(function (c) {
            return el("button.motif", { type: "button", onclick: function () { champ.value = c; } }, c);
          }))
        : null,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var v = champ.value.trim();
          if (o.requis && !v) { AVIS.refus(o.requis === true ? "Ce champ est requis." : o.requis); return; }
          fermerSur(); quand(v);
        } }, o.bouton || "Valider"),
        el("button.b.nu", { type: "button", onclick: fermerSur }, "Annuler"))
    );

    sur(titre, o.etiquette || "", corps);
    setTimeout(function () { champ.focus(); }, 30);
  }

  return { ouvrir: ouvrir, fermer: fermer, ligne: ligne, sousbloc: sousbloc, puces: puces,
    sur: sur, fermerSur: fermerSur, demander: demander };
})();
