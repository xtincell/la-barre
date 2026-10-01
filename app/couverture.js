/* couverture.js — ce qu'on voit d'un projet ou d'une campagne avant de l'ouvrir.
 *
 * La liste des dossiers montrait un carré gris pour un projet sur trois, et
 * les campagnes n'avaient aucun visage. Or presque tout a une image quelque
 * part : le KV master de la campagne, le logo de la marque, ses packs, les
 * visuels de son fonds. La couverture les cherche dans cet ordre, et dit
 * toujours d'où elle vient — une couverture déduite n'est pas une couverture
 * choisie.
 *
 *   campagne   sa couverture posée (le KV master, l'illustration de campagne)
 *              → le KV maître de ses livrables → la marque.
 *   projet     sa couverture posée → son KV maître → son illustration de
 *              campagne → la couverture de sa campagne → pour un cycle ou un
 *              planning mensuel, une mosaïque de ses visuels → la marque.
 *   marque     son logo et ses packs, ou une mosaïque de son fonds.
 */

window.COUVERTURE = (function () {
  var el = O.el;

  function img(o) { return o && o.vignette ? o.vignette : null; }
  function vivants(p) { return (p.livrables || []).filter(function (l) { return !l.annule && l.vignette; }); }
  function kvMaitre(p) {
    var ls = vivants(p);
    return ls.filter(function (l) { return l.niveau === "maitre"; })[0]
      || ls.filter(function (l) { return /\bkv\b|key visual/i.test(l.nom || ""); })[0] || null;
  }

  /* La marque : le logo et ses packs, sinon une mosaïque de son fonds. */
  function deMarque(marqueId) {
    var m = marqueId ? DEPOT.trouve("marques", marqueId) : null;
    if (!m) return null;
    var logo = window.MARQUE ? MARQUE.logo(m.id) : null;
    var packs = (window.VAULT ? VAULT.catalogue(m.id) : []).filter(function (s) {
      return s.vignette && !s.aQualifier; }).slice(0, 3);
    if (!packs.length && window.VAULT) packs = VAULT.catalogue(m.id).filter(function (s) { return s.vignette; }).slice(0, 3);
    if (logo && logo.vignette) {
      return { type: packs.length ? "marque" : "logo", logo: logo.vignette,
        images: packs.map(img), motif: "Logo" + (packs.length ? " et packs" : "") + " de " + m.nom + "." };
    }
    var fonds = (m.visuels || []).filter(function (v) { return v.vignette; }).map(img);
    if (fonds.length >= 2) return { type: "mosaique", images: fonds.slice(0, 4), motif: "Visuels du fonds de " + m.nom + "." };
    if (fonds.length) return { type: "kv", vignette: fonds[0], motif: "Visuel du fonds de " + m.nom + "." };
    if (packs.length) return { type: packs.length > 1 ? "mosaique" : "kv", images: packs.map(img),
      vignette: img(packs[0]), motif: "Packs de " + m.nom + "." };
    return null;
  }

  function campagne(c) {
    if (!c) return null;
    if (c.couverture && c.couverture.vignette) return c.couverture;
    var ps = window.CAMPAGNE ? CAMPAGNE.projets(c.id) : [];
    for (var i = 0; i < ps.length; i++) {
      var kv = kvMaitre(ps[i]);
      if (kv) return { type: "kv", vignette: kv.vignette, motif: "KV maître de « " + ps[i].nom + " »." };
    }
    /* Une campagne sans KV — le fil de l'année surtout — se montre par ce que
     * ses projets montrent : une image si elle n'en a qu'un, une mosaïque sinon. */
    var vus = {}, ims = [];
    ps.forEach(function (p) {
      var cv = projet(p);
      var src = cv && cv.type !== "aucune" && cv.type !== "marque" && cv.type !== "logo" ? (cv.vignette || (cv.images || [])[0]) : null;
      if (src && !vus[src]) { vus[src] = true; ims.push(src); }
    });
    if (ims.length > 1) return { type: "mosaique", images: ims.slice(0, 4), motif: "Ce que montrent ses projets." };
    if (ims.length === 1) return { type: "kv", vignette: ims[0], motif: "L'image de son projet." };
    var mqs = c.marqueIds || [];
    for (var j = 0; j < mqs.length; j++) { var d = deMarque(mqs[j]); if (d) return d; }
    return null;
  }

  function projet(p) {
    if (!p) return null;
    if (p.couverture && (p.couverture.type === "aucune" || p.couverture.vignette || (p.couverture.images || []).length)) return p.couverture;
    var kv = kvMaitre(p);
    if (kv) return { type: "kv", vignette: kv.vignette, motif: "KV maître du projet." };
    /* L'illustration propre du projet passe avant le KV de sa campagne : posé
     * sur la plateforme, les cahiers ou le storyboard, le KV du temps fort
     * faisait huit cartes identiques qui ne disaient plus ce que chacune est. */
    if (p.vignette) return { type: "illustration", vignette: p.vignette, motif: "Illustration du projet au corpus." };
    var c0 = window.CAMPAGNE ? CAMPAGNE.de(p.campagneId) : null;
    if (c0 && c0.couverture && c0.couverture.type === "kv" && c0.couverture.vignette) {
      return { type: "kv", vignette: c0.couverture.vignette, motif: "KV de sa campagne « " + c0.nom + " » — " + (c0.couverture.motif || "") };
    }
    var ls = vivants(p);
    /* Un cycle, un planning mensuel : plusieurs visuels disent mieux ce qu'il
     * est qu'un seul. */
    var cycle = p.gabarit === "cycle" || p.nature === "digital" || /planning|mensuel|éditorial|editorial|plan pub/i.test(p.nom || "");
    if (cycle && ls.length >= 2) return { type: "mosaique", images: ls.slice(0, 4).map(img), motif: "Les visuels du cycle." };
    var c = window.CAMPAGNE ? CAMPAGNE.de(p.campagneId) : null;
    var cc = c && c.couverture && c.couverture.vignette ? c.couverture : null;
    if (cc) return { type: cc.type, vignette: cc.vignette, motif: "Couverture de sa campagne « " + c.nom + " » — " + (cc.motif || "") };
    if (ls.length >= 2) return { type: "mosaique", images: ls.slice(0, 4).map(img), motif: "Les visuels du projet." };
    if (ls.length) return { type: "kv", vignette: ls[0].vignette, motif: "Visuel du projet." };
    var pi = ((p.sections || {}).pistes || []).filter(function (x) { return x.vignette; })[0];
    if (pi) return { type: "kv", vignette: pi.vignette, motif: "Visuel de la piste « " + (pi.titre || "") + " »." };
    var mqs = ((p.sections || {}).identite || {}).marqueIds || [];
    for (var j = 0; j < mqs.length; j++) { var d = deMarque(mqs[j]); if (d) return d; }
    return null;
  }

  /* Le rendu : le même gabarit que les vignettes, pour ne rien déplacer. */
  function rendre(cov, taille, nom) {
    var classe = "div.vignette.v-" + (taille || "carte") + ".couv";
    if (!cov || cov.type === "aucune") return IMAGE.vignette(null, taille || "carte", null);
    var titre = cov.motif || "";
    if (cov.type === "mosaique" && (cov.images || []).length > 1) {
      var ims = cov.images.slice(0, 4);
      return el(classe + ".couv-mos.n" + ims.length, { title: titre },
        ims.map(function (s) { return el("img", { src: s, alt: "", loading: "lazy" }); }));
    }
    if ((cov.type === "marque" || cov.type === "logo") && cov.logo) {
      return el(classe + ".couv-mq", { title: titre },
        el("img.couv-logo", { src: cov.logo, alt: nom ? "Logo " + nom : "" }),
        (cov.images || []).length ? el("span.couv-packs", {}, cov.images.map(function (s) {
          return el("img", { src: s, alt: "", loading: "lazy" }); })) : null);
    }
    var src = cov.vignette || (cov.images || [])[0];
    return src ? el(classe, { title: titre }, el("img", { src: src, alt: nom || "", loading: "lazy" }))
      : IMAGE.vignette(null, taille || "carte", null);
  }

  /* ————— Ce qui a été relevé sans place évidente —————
   *
   * Le fonds visuel d'une marque (chaque ligne des index du corpus), les pièces
   * d'une campagne qui ne sont pas son KV, et la collection des inclassables.
   * Rien de ce que la fouille du disque a trouvé n'est jeté : ça se range ici,
   * avec sa source, et ça se lit. */
  function source(t) { return String(t || "").replace(/^corpus\//, "corpus · "); }

  function fonds(m) {
    var vs = (m && m.visuels) || [];
    if (!vs.length) return null;
    var avec = vs.filter(function (v) { return v.vignette; });
    var sans = vs.filter(function (v) { return !v.vignette; });
    return el("details.fonds", {},
      el("summary", {}, "Le fonds visuel", el("span.studio-compte", {}, String(vs.length)),
        el("span.fonds-q", {}, avec.length + " montrés · " + sans.length + " au disque")),
      avec.length ? el("div.fonds-g", {}, avec.map(function (v) {
        return el("figure.fonds-c", { title: source(v.source) },
          el("img", { src: v.vignette, alt: v.campagne || "", loading: "lazy" }),
          el("figcaption", {}, [v.campagne, v.annee, v.statut].filter(Boolean).join(" · ")));
      })) : null,
      sans.length ? el("ul.fonds-l", {}, sans.map(function (v) {
        return el("li", {}, el("b", {}, v.campagne || "Sans campagne"),
          v.fichiers ? " — " + v.fichiers + " fichiers" : "", el("span", {}, source(v.source)));
      })) : null);
  }

  function pieces(c) {
    var ps = (c && c.pieces) || [];
    if (!ps.length) return null;
    return el("details.fonds", {},
      el("summary", {}, "Les pièces relevées", el("span.studio-compte", {}, String(ps.length)),
        el("span.fonds-q", {}, "ce que l'index porte pour cette campagne sans que ce soit son KV")),
      el("div.fonds-g", {}, ps.map(function (x) {
        return el("figure.fonds-c", { title: source(x.source) },
          x.vignette ? el("img", { src: x.vignette, alt: "", loading: "lazy" }) : el("span.fonds-v", {}, "pas de vignette"),
          el("figcaption", {}, x.statut || x.type));
      })));
  }

  function inclassables(filtre) {
    var xs = DEPOT.liste("inclassables").filter(filtre || function () { return true; });
    if (!xs.length) return null;
    return el("details.fonds.inclassables", {},
      el("summary", {}, "Ce qui n'a pas encore de place", el("span.studio-compte", {}, String(xs.length)),
        el("span.fonds-q", {}, "relevé, jamais jeté — une marque au dépôt, un projet, et chaque pièce trouve sa place")),
      el("ul.fonds-l", {}, xs.map(function (x) {
        return el("li", {}, el("b", {}, x.libelle), x.detail ? " — " + x.detail : "",
          el("span", {}, x.type + " · " + source(x.source)));
      })));
  }

  return { projet: projet, campagne: campagne, marque: deMarque, rendre: rendre,
    fonds: fonds, pieces: pieces, inclassables: inclassables };
})();
