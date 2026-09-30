/* preparation.js — ce qu'on apporte en séance de brainstorm, écrit avant.
 *
 * Une séance qui commence par « alors, on fait quoi ? » dépense sa première
 * demi-heure à refaire le cadrage à voix haute. Le cadrage dit ce qui est
 * demandé ; la préparation dit ce que la séance doit produire, la question
 * qu'on pose, ce qu'il faut avoir tranché avant, les amorces qui lancent, et
 * ce qu'on ne proposera pas. Elle se lit en cinq minutes avant d'entrer.
 *
 * Et à côté, les pièces reçues : l'inventaire de ce que le client a envoyé,
 * fichier par fichier, avec ce qu'on en a tiré et ce qui n'a pas pu être lu.
 * Un fichier qu'on n'a pas ouvert ne doit pas passer pour un fichier lu.
 */

window.PREPARATION = (function () {
  var el = O.el;

  var CHAMPS = [
    { cle: "objectif", nom: "Ce que la séance doit produire", type: "long",
      aide: "Le livrable de la séance, pas celui de la campagne : trois angles, une idée retenue, dix wedge issues…" },
    { cle: "question", nom: "La question de la séance", type: "texte",
      aide: "Une seule, commençant par « comment ». C'est elle qu'on écrit au mur." },
    { cle: "a_trancher", nom: "À trancher avant d'entrer", type: "puces",
      aide: "Ce que la séance ne doit pas rediscuter : le marché, la cible, l'insight retenu, les interdits." },
    { cle: "amorces", nom: "Les amorces", type: "puces",
      aide: "Des provocations qui lancent — une par ligne. Elles se jettent, elles ne se défendent pas." },
    { cle: "directions", nom: "Les directions à explorer", type: "puces" },
    { cle: "interdits", nom: "Ce qu'on ne proposera pas", type: "puces" },
    { cle: "materiel", nom: "À apporter en séance", type: "puces" },
    { cle: "deroule", nom: "Le déroulé", type: "puces", aide: "Les temps de la séance, avec leur durée." },
    { cle: "notes", nom: "Notes", type: "long" },
  ];

  function de(p) { return (p && p.preparation) || {}; }

  function remplis(p) {
    var v = de(p);
    return CHAMPS.filter(function (c) {
      var x = v[c.cle];
      return Array.isArray(x) ? x.length : x !== undefined && x !== null && String(x).trim();
    }).length;
  }

  function editer(p, rafraichir) {
    var f = FORM.rendre(CHAMPS, de(p), {});
    PANNEAU.ouvrir("Préparer la séance", p.ref, el("div", {},
      UI.banniere("", "Ce qu'on écrit ici se lit en cinq minutes avant d'entrer. Tout ce qui n'y est pas se "
        + "rediscutera en séance, au prix de la première demi-heure."),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var v = f.valeurs();
          var avant = p.preparation || {};
          p.preparation = Object.assign({}, avant, v);
          /* Réécrire la préparation la fait passer au reçu ; le motif de
           * l'inférence reste, daté, à côté. */
          if (avant.infere) { p.preparation.contresigne = { quand: new Date().toISOString(),
            par: MAISON.titulaire, motif: avant.infere.pourquoi }; delete p.preparation.infere; }
          DEPOT.tracer("préparation écrite", "projets", p.id, remplis(p) + " champs");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))));
  }

  /* Le bloc de l'atelier : lisible d'abord, modifiable ensuite. */
  function bloc(p, rafraichir) {
    var v = de(p);
    var n = remplis(p);
    return el("div.prep", {},
      el("div.prep-tete", {},
        el("div", {},
          el("div.prep-t", {}, "Préparer la séance", el("span.studio-compte", {}, n + " / " + CHAMPS.length)),
          v.question ? el("p.prep-q", {}, v.question) : el("p.prep-q.vide", {}, "La question de la séance n'est pas écrite.")),
        el("button.b" + (n ? "" : ".or"), { type: "button", onclick: function () { editer(p, rafraichir); } },
          n ? "Modifier" : "Écrire la préparation")),
      v.infere ? el("div.rin-inf", {}, el("span", {}, "Inférée — " + v.infere.pourquoi),
        el("button.studio-lien", { type: "button", onclick: function () {
          v.contresigne = { quand: new Date().toISOString(), par: MAISON.titulaire, motif: v.infere.pourquoi };
          delete v.infere; DEPOT.enregistrer(); rafraichir(); } }, "Contresigner")) : null,
      n ? el("div.prep-c", {}, FORM.lire(CHAMPS.filter(function (c) { return c.cle !== "question"; }), v, {})) : null,
      documents(p));
  }

  function documents(p) {
    var ds = (p && p.documentsRecus) || [];
    if (!ds.length) return null;
    var illisibles = ds.filter(function (x) { return x.etat === "illisible"; }).length;
    return el("details.prep-docs", {},
      el("summary", {}, "Les pièces reçues", el("span.studio-compte", {}, String(ds.length)),
        illisibles ? el("span.studio-compte.alerte", {}, illisibles + " illisibles") : null),
      el("div.prep-dl", {}, ds.map(function (x) {
        return el("div.prep-d" + (x.etat === "illisible" ? ".ko" : ""), {},
          el("span.prep-dn", {}, x.nom),
          el("span.prep-dq", {}, [x.type, x.date, x.droits].filter(Boolean).join(" · ")),
          x.tire ? el("span.prep-dt", {}, x.tire) : null);
      })));
  }

  /* Pour le document de cadrage. */
  function blocCadrage(p) {
    var v = de(p);
    if (!remplis(p)) return null;
    return { t: "La préparation du brainstorm", fort: true,
      source: v.infere ? "inférée — à relire avant la séance" : "écrite pour la séance",
      corps: v.question || null,
      lignes: CHAMPS.filter(function (c) { return c.cle !== "question" && c.cle !== "notes"; }).map(function (c) {
        var x = v[c.cle];
        return { q: c.nom, v: Array.isArray(x) ? x.join("  ·  ") : x };
      }).filter(function (l) { return !!(l.v || "").trim(); }) };
  }

  function blocDocuments(p) {
    var ds = (p && p.documentsRecus) || [];
    if (!ds.length) return null;
    return { t: "Les pièces reçues", source: "ce que le client a envoyé, fichier par fichier — et ce qu'on en a tiré",
      lignes: ds.map(function (x) {
        return { q: x.nom, v: [x.type, x.droits, x.tire].filter(Boolean).join("  ·  ") || null };
      }) };
  }

  return { CHAMPS: CHAMPS, de: de, remplis: remplis, bloc: bloc, editer: editer,
    blocCadrage: blocCadrage, blocDocuments: blocDocuments };
})();
