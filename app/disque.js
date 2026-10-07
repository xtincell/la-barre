/* disque.js — ce qui vit sur le disque de l'agence, et ce qui part en ligne.
 *
 * Deux règles du titulaire (07/10/2026) :
 *  — en local, LA BARRE lit les originaux : les vidéos se regardent, les EXE
 *    (.ai, .psd…) s'ouvrent dans leur logiciel, depuis les deux exports ;
 *  — en ligne, seules des copies compressées (moins de 200 Ko) des images
 *    partent, rangées dans un dossier proxy. Les vidéos et les EXE restent au
 *    disque : le site en ligne dit qu'ils existent, il ne les sert pas.
 *
 * L'aiguillage se fait à un seul endroit : O.el passe tout `src` et tout
 * `poster` par DISQUE.src. En local il rend le chemin tel quel ; en ligne il
 * rend la copie du proxy que le dépôt annonce (`proxys`). */

window.DISQUE = (function () {
  var el = O.el;

  var local = location.protocol === "file:"
    || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function proxys() {
    var t = window.DEPOT && DEPOT.tout ? DEPOT.tout() : null;
    return (t && t.proxys) || {};
  }

  function src(chemin) {
    if (!chemin || local) return chemin;
    return proxys()[chemin] || chemin;
  }

  /* « matanga/… » ou « upgraders/… » : l'adresse du fichier pour le serveur local. */
  function url(chemin) {
    return "/disque/" + String(chemin).split("/").map(encodeURIComponent).join("/");
  }

  /* Le chemin d'origine d'un livrable (« ~/Downloads/MATANGA — EXPORT… ») en chemin disque. */
  var EXPORTS = { "MATANGA — EXPORT DU TRAVAIL": "matanga", "UPGRADERS — EXPORT DU TRAVAIL": "upgraders" };
  function depuisOrigine(origine) {
    var m = String(origine || "").match(/Downloads\/(MATANGA — EXPORT DU TRAVAIL|UPGRADERS — EXPORT DU TRAVAIL)\/(.+)$/);
    return m ? EXPORTS[m[1]] + "/" + m[2] : null;
  }

  function ouvrir(chemin, reveler) {
    fetch("/disque-ouvrir", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-La-Barre": "1" },
      body: JSON.stringify({ chemin: chemin, reveler: !!reveler }),
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      if (window.AVIS) AVIS.fait(reveler ? "Le fichier est montré dans le Finder." : "Le fichier s'ouvre dans son logiciel.");
    }).catch(function () {
      if (window.AVIS) AVIS.refus("Le fichier n'a pas pu s'ouvrir : vérifie que « node servir.mjs » tourne "
        + "sur cette machine et que le fichier est toujours dans l'export.");
    });
  }

  function poids(o) {
    if (!o) return "";
    if (o < 1048576) return Math.max(1, Math.round(o / 1024)) + " Ko";
    if (o < 1073741824) return (o / 1048576).toFixed(o < 10485760 ? 1 : 0).replace(".", ",") + " Mo";
    return (o / 1073741824).toFixed(1).replace(".", ",") + " Go";
  }

  function duree(s) {
    if (!s) return "";
    s = Math.round(s);
    if (s < 60) return s + " s";
    if (s < 3600) return Math.floor(s / 60) + " min " + String(s % 60).padStart(2, "0");
    return Math.floor(s / 3600) + " h " + String(Math.floor(s % 3600 / 60)).padStart(2, "0");
  }

  function titre(x) { return x.nom.replace(/\.[a-z0-9]+$/i, ""); }

  function gestes(x) {
    if (!local) return null;
    return el("span.disque-g", {},
      el("button.studio-lien", { type: "button", onclick: function () { ouvrir(x.chemin, false); } }, "Ouvrir"),
      el("button.studio-lien", { type: "button", onclick: function () { ouvrir(x.chemin, true); } }, "Dans le Finder"));
  }

  function video(x) {
    var corps = local
      ? el("video", { src: url(x.chemin), poster: x.apercu || null, controls: "controls",
          preload: "none", playsinline: "playsinline" })
      : (x.apercu ? el("img", { src: x.apercu, alt: "", loading: "lazy" }) : el("span.fonds-v", {}, "vidéo au disque"));
    return el("figure.fonds-c.disque-v", { title: x.nom }, corps,
      el("figcaption", {}, titre(x), el("span.disque-m", {}, [duree(x.duree), poids(x.octets)].filter(Boolean).join(" · "))),
      gestes(x));
  }

  function exe(x) {
    return el("li.disque-e", {},
      x.apercu ? el("img", { src: x.apercu, alt: "", loading: "lazy" }) : el("span.disque-ext", {}, x.ext.replace(".", "").toUpperCase()),
      el("span.disque-t", {}, el("b", {}, titre(x)), el("span", {}, x.ext.replace(".", "").toUpperCase() + " · " + poids(x.octets))),
      gestes(x));
  }

  /* Le bloc : les vidéos se regardent, les EXE s'ouvrent. Replié par défaut. */
  function bloc(liste) {
    var xs = liste || [];
    if (!xs.length) return null;
    var vs = xs.filter(function (x) { return x.genre === "video"; });
    var es = xs.filter(function (x) { return x.genre === "exe"; });
    var compte = [vs.length ? vs.length + " vidéo" + (vs.length > 1 ? "s" : "") : null,
      es.length ? es.length + " EXE" : null].filter(Boolean).join(" · ");
    return el("details.fonds.disque", {},
      el("summary", {}, "Au disque", el("span.studio-compte", {}, String(xs.length)),
        el("span.fonds-q", {}, compte + (local
          ? " — lus depuis l'export, sur cette machine"
          : " — ils restent au disque de l'agence : en ligne, seuls leurs aperçus se voient"))),
      vs.length ? el("div.fonds-g.disque-vg", {}, vs.map(video)) : null,
      es.length ? el("ul.fonds-l.disque-el", {}, es.map(exe)) : null);
  }

  /* ————— L'écran « Le disque » (La maison) —————
   * Tout ce que les exports portent en vidéos et en EXE, au même endroit : d'abord ce
   * qui n'a pas de place au dépôt (un porteur sans fiche, Xtincell), puis ce qui est
   * rattaché, avec le lien vers sa campagne ou sa marque. Rien n'est inventé : un
   * fichier sans place reste sans place, et se lit quand même. */
  function porteurs() {
    var t = DEPOT.tout();
    var rang = [];
    (t.campagnes || []).forEach(function (c) { if ((c.disque || []).length) rang.push({ nom: c.nom, lien: "#/projets/" + c.id, xs: c.disque }); });
    (t.marques || []).forEach(function (m) { if ((m.disque || []).length) rang.push({ nom: m.nom, lien: "#/projets/" + m.id, xs: m.disque }); });
    return rang.sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });
  }

  function sansPlace() {
    var g = {};
    (DEPOT.tout().disque_sans_place || []).forEach(function (x) {
      /* Le dossier, jamais le fichier : deux niveaux sous l'export suffisent à le situer. */
      var k = String(x.chemin).split("/").slice(1, -1).slice(0, 2).join(" / ") || "À la racine de l'export";
      (g[k] = g[k] || []).push(x);
    });
    return Object.keys(g).sort(function (a, b) { return a.localeCompare(b, "fr"); })
      .map(function (k) { return { nom: k, xs: g[k] }; });
  }

  function pire() {
    var n = (DEPOT.tout().disque_sans_place || []).length;
    var tot = porteurs().reduce(function (s, r) { return s + r.xs.length; }, 0) + n;
    if (!tot) return { t: "Rien n'est relevé au disque", q: "Lance outils/disque-2026.py pour relever les vidéos et les EXE des exports." };
    return { t: tot + " vidéos et EXE au disque",
      q: (local ? "Ils se regardent et s'ouvrent depuis cette machine. " : "En ligne, seuls leurs aperçus se voient : les fichiers restent au disque. ")
        + (n ? n + " n'ont pas de campagne ni de marque au dépôt : ils restent lisibles ici." : "Tous sont rattachés à une campagne ou à une marque.") };
  }

  function groupe(r, ouvert) {
    var b = bloc(r.xs);
    if (!b) return null;
    if (ouvert) b.open = true;
    var s = b.querySelector("summary");
    s.insertBefore(r.lien ? el("a", { href: r.lien }, r.nom) : el("b", {}, r.nom), s.firstChild);
    s.childNodes[1].textContent = " · ";
    var cpt = s.querySelector(".studio-compte"); if (cpt) cpt.remove();
    return b;
  }

  function ecran(z) {
    var sp = sansPlace(), rs = porteurs();
    if (sp.length) {
      z.appendChild(el("div.section-titre", {}, "Sans place au dépôt", el("span.taille", {}, "· " + sp.reduce(function (s, r) { return s + r.xs.length; }, 0))));
      sp.forEach(function (r) { var g = groupe(r); if (g) z.appendChild(g); });
    }
    if (rs.length) {
      z.appendChild(el("div.section-titre", {}, "Rattachés", el("span.taille", {}, "· " + rs.length + " campagnes et marques")));
      rs.forEach(function (r) { var g = groupe(r); if (g) z.appendChild(g); });
    }
  }

  return { local: local, src: src, url: url, ouvrir: ouvrir, bloc: bloc, depuisOrigine: depuisOrigine,
    ecran: ecran, pire: pire };
})();
