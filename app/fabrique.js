/* fabrique.js — la fabrication d'une piste : ce qu'il faut pour la montrer avant de la tourner.
 *
 * Demande du titulaire (07/10/2026) : « tu mets toutes ces informations dans LA BARRE, storyboard
 * inclus ». Une piste n'est pas qu'un concept et un argument : avant l'arbitrage, elle se montre —
 * une maquette de KV, un son, un conducteur, un storyboard. Ces pièces vivaient dans des
 * fichiers à côté ; elles vivent ici, sur la piste, et chaque prompt se copie d'un geste.
 *
 *   pi.kvBrouillons = [{ version, vignette, chemin, auteur, quand, retours: [{ texte, statut }] }]
 *   pi.fabrique = {
 *     musique:    { titre, methode, style, exclure, paroles, notes },
 *     kv:         { brouillon, photo, texte, corrections },
 *     conducteur: { formats: [{ nom, plans: [{ temps, image, son, texte }] }], notes: [] },
 *     storyboard: { format, personnages: [{ nom, qui, signe }], tenue, style,
 *                   cases: [{ n, temps, cadrage, action, son, texte, prompt, vignette }],
 *                   variantes: [], notes: [] },
 *     animatiques: [{ version, video, poster, duree, son, montage, par, demandePar, quand }] }
 */

window.FABRIQUE = (function () {
  var el = O.el;

  function copier(texte, quoi) {
    return el("button.studio-lien.fb-copier", { type: "button", onclick: function () {
      (navigator.clipboard ? navigator.clipboard.writeText(texte) : Promise.reject())
        .then(function () { AVIS.fait((quoi || "Le prompt") + " est copié."); })
        .catch(function () { AVIS.refus("Copie impossible ici : sélectionne le texte à la main."); });
    } }, "Copier");
  }

  function prompt(titre, texte, quoi) {
    if (!texte) return null;
    return el("div.fb-p", {},
      el("div.fb-pt", {}, el("span", {}, titre), copier(texte, quoi)),
      el("pre.fb-pre", {}, texte));
  }

  function personne(id) { var x = id ? DEPOT.trouve("personnes", id) : null; return x ? x.nom : ""; }

  function brouillons(pi) {
    var vs = pi.kvBrouillons || [];
    if (!vs.length) return null;
    return el("details.fonds.fb", { open: true },
      el("summary", {}, "Maquettes du KV", el("span.studio-compte", {}, String(vs.length)),
        el("span.fonds-q", {}, "chaque version garde ses retours")),
      el("div.fb-kv", {}, vs.slice().reverse().map(function (v) {
        var ouverts = (v.retours || []).filter(function (r) { return r.statut !== "traite"; }).length;
        return el("figure.fb-kvc", {},
          el("img", { src: v.vignette, alt: "Maquette v" + v.version, loading: "lazy" }),
          el("figcaption", {}, el("b", {}, "v" + v.version), " · " + personne(v.auteur) + " · " + O.joli(String(v.quand).slice(0, 10))
            + (ouverts ? " · " + ouverts + " retour" + (ouverts > 1 ? "s" : "") + " à traiter" : "")),
          (v.retours || []).length ? el("ul.fb-r", {}, v.retours.map(function (r) {
            return el("li" + (r.statut === "traite" ? ".fait" : ""), {}, r.texte); })) : null);
      })));
  }

  function musique(m) {
    if (!m) return null;
    return el("details.fonds.fb", {},
      el("summary", {}, "La musique", el("span.fonds-q", {}, m.titre ? "« " + m.titre + " »" : "")),
      m.methode ? el("p.fb-n", {}, m.methode) : null,
      prompt("Style", m.style, "Le style"),
      prompt("Exclure", m.exclure, "Les exclusions"),
      prompt("Paroles", m.paroles, "Les paroles"),
      (m.notes || []).length ? el("ul.fb-notes", {}, m.notes.map(function (n) { return el("li", {}, n); })) : null);
  }

  function kv(k) {
    if (!k) return null;
    return el("details.fonds.fb", {},
      el("summary", {}, "Le KV — prompts", el("span.fonds-q", {}, "brouillon sur feuille blanche, puis version photo")),
      prompt("Brouillon, sur feuille blanche", k.brouillon, "Le prompt du brouillon"),
      prompt("Version photo, maquette finale", k.photo, "Le prompt photo"),
      prompt("Corrections pour la v2", k.corrections, "Les corrections"),
      k.texte ? el("p.fb-n", {}, "Texte de l'affiche : " + k.texte) : null);
  }

  function table(entetes, lignes) {
    return el("div.fb-tw", {}, el("table.fb-t", {},
      el("thead", {}, el("tr", {}, entetes.map(function (h) { return el("th", {}, h); }))),
      el("tbody", {}, lignes.map(function (l) { return el("tr", {}, l.map(function (c) { return el("td", {}, c || "—"); })); }))));
  }

  function conducteur(c) {
    if (!c || !(c.formats || []).length) return null;
    return el("details.fonds.fb", {},
      el("summary", {}, "Le conducteur", el("span.fonds-q", {}, c.formats.map(function (f) { return f.nom; }).join(" · "))),
      c.formats.map(function (f) {
        return el("div.fb-f", {}, el("h4", {}, f.nom),
          (f.plans || []).length ? table(["Temps", "Image", "Son", "Texte à l'écran"],
            f.plans.map(function (x) { return [x.temps, x.image, x.son, x.texte]; })) : null,
          f.resume ? el("p.fb-n", {}, f.resume) : null);
      }),
      (c.notes || []).length ? el("ul.fb-notes", {}, c.notes.map(function (n) { return el("li", {}, n); })) : null);
  }

  function storyboard(s, precedents) {
    if (!s || !(s.cases || []).length) return null;
    return el("details.fonds.fb", { open: true },
      el("summary", {}, "Le storyboard", el("span.studio-compte", {}, String(s.cases.length)),
        el("span.fonds-q", {}, (s.version ? "v" + s.version + " · " : "") + (s.format || "") + " — un prompt par case, même style, mêmes personnages")),
      s.source ? el("p.fb-n", {}, s.source) : null,
      (precedents || []).length ? el("p.fb-n", {}, precedents.map(function (v) {
        return "v" + v.version + " archivée le " + O.joli(String(v.archive_le).slice(0, 10)) + (v.motif ? " — " + v.motif : ""); }).join(" · ")) : null,
      (s.personnages || []).length ? el("div.fb-f", {}, el("h4", {}, "Les personnages"),
        table(["Nom", "Qui", "Signe distinctif"], s.personnages.map(function (x) { return [x.nom, x.qui, x.signe]; })),
        s.tenue ? el("p.fb-n", {}, s.tenue) : null) : null,
      prompt("Préfixe de style, à coller en tête de chaque prompt", s.style, "Le préfixe de style"),
      el("div.fb-sb" + (s.ratio === "16:9" ? ".h" : ""), {}, s.cases.map(function (c) {
        return el("article.fb-case", {},
          c.vignette ? el("img", { src: c.vignette, alt: "Case " + c.n, loading: "lazy" })
            : el("div.fb-vide", {}, "case " + c.n),
          el("div.fb-ct", {}, el("b", {}, "Case " + c.n), " · " + [c.temps, c.cadrage].filter(Boolean).join(" · ")),
          c.paroles ? el("p.fb-par", {}, "« " + c.paroles + " »") : null,
          c.statut ? el("p.fb-st" + (/^à générer/.test(c.statut) ? ".a-faire" : ""), {}, c.statut) : null,
          c.action ? el("p.fb-a", {}, c.action) : null,
          c.son ? el("p.fb-m", {}, "Son : " + c.son) : null,
          c.texte ? el("p.fb-m", {}, "Texte : " + c.texte) : null,
          c.prompt ? el("details.fb-cp", {}, el("summary", {}, "Prompt"),
            el("pre.fb-pre", {}, (s.style ? s.style + "\n" : "") + c.prompt),
            copier((s.style ? s.style + " " : "") + c.prompt, "Le prompt de la case " + c.n)) : null);
      })),
      (s.variantes || []).length ? el("ul.fb-notes", {}, s.variantes.map(function (n) { return el("li", {}, n); })) : null,
      (s.notes || []).length ? el("ul.fb-notes", {}, s.notes.map(function (n) { return el("li", {}, n); })) : null);
  }

  function references(pi) {
    var rs = (pi.references || []).filter(function (r) { return r.url || r.conceptId; });
    var ds = pi.documents || [];
    if (!rs.length && !ds.length) return null;
    return el("details.fonds.fb", {},
      el("summary", {}, "Références et documents", el("span.studio-compte", {}, String(rs.length + ds.length))),
      el("ul.fb-notes", {},
        rs.map(function (r) {
          return el("li", {}, r.url ? el("a", { href: r.url, target: "_blank", rel: "noopener" }, r.titre || r.url) : el("b", {}, r.quoi || "Concept"),
            r.note ? " — " + r.note : "");
        }),
        ds.map(function (x) {
          var d = window.DISQUE ? DISQUE.depuisOrigine(x.chemin) : null;
          return el("li", {}, el("b", {}, x.type), " — " + (x.quoi || ""),
            d && DISQUE.local ? [" ", el("button.studio-lien", { type: "button", onclick: function () { DISQUE.ouvrir(d, false); } }, "Ouvrir")] : null);
        })));
  }

  /* La portée du spot : exclusif à une marque et un marché, ou pensé pour être décliné.
   *   pi.fabrique.spot = { exclusif, marqueIds, marches, axes: [], source: { qui, quand } } */
  function noms(coll, ids) {
    return (ids || []).map(function (id) { var x = DEPOT.trouve(coll, id); return x ? x.nom : id; });
  }
  function portee(pi) {
    var s = (pi.fabrique || {}).spot;
    if (!s) return null;
    var marques = noms("marques", s.marqueIds), marches = noms("marches", s.marches);
    if (s.exclusif) return el("p.fb-portee.exclusif", {},
      el("b", {}, "Spot exclusif : "), [marques.join(", "), marches.join(", ")].filter(Boolean).join(", en ")
        + " seulement. Il ne se décline pas.");
    return el("div.fb-portee.decline", {},
      el("p", {}, el("b", {}, "Pensé pour être décliné"),
        marques.length ? " : " + marques.join(", ") : "",
        " · " + (marches.length ? marches.join(", ") : "marchés clés à lister avec le client")),
      (s.axes || []).length ? el("ul", {}, s.axes.map(function (x) { return el("li", {}, x); })) : null);
  }

  /* L'animatique : le storyboard monté sur le son, la dernière version d'abord. */
  function film(a, petit) {
    return el("video.fb-film" + (petit ? ".petit" : ""), { src: a.video, poster: a.poster, controls: true,
      preload: "metadata", playsinline: true });
  }
  function animatiques(pi) {
    var as = (pi.fabrique || {}).animatiques || [];
    if (!as.length) return null;
    var d = as[as.length - 1];
    return el("details.fonds.fb", { open: true },
      el("summary", {}, "L'animatique", el("span.fonds-q", {}, "v" + d.version + " · " + d.duree + " s · le storyboard monté sur le son")),
      film(d),
      d.montage ? el("p.fb-n", {}, d.montage) : null,
      d.son ? el("p.fb-n", {}, "Son : " + d.son) : null,
      as.length > 1 ? el("ul.fb-notes", {}, as.slice(0, -1).reverse().map(function (x) {
        return el("li", {}, el("a", { href: DISQUE ? DISQUE.src(x.video) : x.video, target: "_blank", rel: "noopener" }, "v" + x.version),
          " · " + O.joli(String(x.quand).slice(0, 10)));
      })) : null);
  }

  function bloc(pi) {
    var f = pi.fabrique || {};
    var parts = [brouillons(pi), animatiques(pi), portee(pi), storyboard(f.storyboard, f.storyboardsPrecedents), conducteur(f.conducteur), musique(f.musique), kv(f.kv), references(pi)]
      .filter(Boolean);
    if (!parts.length) return null;
    return el("section.fb-bloc", {}, el("div.section-titre", {}, "La fabrique", el("span.taille", {}, "· ce qu'il faut pour la montrer")), parts);
  }

  return { bloc: bloc, portee: portee, film: film };
})();
