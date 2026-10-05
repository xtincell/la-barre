/* vue-galerie.js — les campagnes, en images.
 *
 * Tout le reste du produit répond à « qu'est-ce qui ne tient pas ? ». La
 * galerie répond à l'autre question, celle qu'on pose quand on montre son
 * travail : « qu'est-ce qu'on a fait ? ». Chaque campagne y est une carte —
 * son KV, sinon ce que ses projets montrent, sinon une carte typographique
 * aux couleurs de sa marque — rangée par année, la plus récente d'abord.
 *
 * Elle montre tout, et sous quelle structure : Matanga, UPgraders, Friends
 * Studio. Les filtres se souviennent, par navigateur.
 */

window.VUE_GALERIE = (function () {
  var el = O.el;
  var CLE = "labarre.galerie";
  var etat = lire();

  function lire() {
    try { return Object.assign({ structure: "toutes", annee: "toutes", regime: "tous", q: "" }, JSON.parse(localStorage.getItem(CLE) || "{}")); }
    catch (e) { return { structure: "toutes", annee: "toutes", regime: "tous", q: "" }; }
  }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }

  var NOMS_STRUCT = { matanga: "Matanga", upgraders: "UPgraders", friends: "Friends Studio", "nom-propre": "Nom propre" };

  /* Ce qu'une carte dit d'une campagne, calculé une fois. */
  function fiche(c) {
    var ps = CAMPAGNE.projets(c.id);
    var structs = {};
    ps.forEach(function (p) { structs[p.structure || "matanga"] = true; });
    var structure = Object.keys(structs)[0] || "matanga";
    var bouts = String(c.nom).split(" — ");
    var porteur = bouts.length > 1 ? bouts[0] : ((DEPOT.trouve("marques", (c.marqueIds || [])[0]) || {}).nom || "");
    var titre = (bouts.length > 1 ? bouts.slice(1).join(" — ") : c.nom).replace(/ · (UPgraders|Friends Studio)$/, "");
    titre = titre.charAt(0).toUpperCase() + titre.slice(1);
    var ans = String(c.nom).match(/20[12]\d/g);
    var f = c.fenetre || {};
    /* Une campagne sans année dans son nom ni dans sa fenêtre prend celle de
     * son projet le plus récent : « sans date » n'est pas une année. */
    var annee = ans ? ans[ans.length - 1] : (f.fin || f.debut || "").slice(0, 4)
      || ps.map(function (p) { return String(((p.sections || {}).identite || {}).echeance || p.cree_le || "").slice(0, 4); })
        .filter(function (a) { return /^20\d\d$/.test(a); }).sort().pop() || String(c.cree_le || "").slice(0, 4) || "Sans date";
    var m = DEPOT.trouve("marques", (c.marqueIds || [])[0]);
    var couleur = m && window.VAULT ? (VAULT.vaultDe("marque", m.id) || {}).couleur : null;
    return { c: c, ps: ps, structure: structure, porteur: porteur, titre: titre, annee: annee,
      fil: c.regime === "always-on", couleur: couleur, cle: (f.fin || f.debut || annee + "-06-30"),
      texte: O.normalise([c.nom, porteur, (DEPOT.trouve("clients", c.clientId) || {}).nom].concat(ps.map(function (p) { return p.nom; })).join(" ")) };
  }

  function periode(c) {
    var f = c.fenetre || {};
    if (f.debut && f.fin) {
      if (c.regime === "always-on") return "toute l'année";
      return O.joli(f.debut) + " → " + O.joli(f.fin);
    }
    return f.fin ? "jusqu'au " + O.joli(f.fin) : null;
  }

  /* La carte sans image : la marque, en grand, sur sa couleur. */
  /* Sans couleur de marque au dépôt, une teinte de la palette du produit,
   * toujours la même pour le même nom : la galerie reste lisible d'un coup
   * d'œil sans inventer de charte. */
  var TEINTES = ["var(--accent)", "var(--info)", "var(--violet)", "var(--succes)", "var(--n900)", "var(--or)"];
  function teinte(nom) {
    var h = 0; String(nom || "").split("").forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
    return TEINTES[h % TEINTES.length];
  }
  function carteTypo(x) {
    var fond = x.couleur || teinte(x.porteur || x.titre);
    return el("div.gal-typo" + (fond ? ".teinte" : ""), fond ? { style: { "--gal-fond": fond } } : {},
      el("span.gal-typo-p", {}, x.porteur || x.titre),
      el("span.gal-typo-t", {}, x.fil ? "le fil de l'année" : (x.c.occasion ? (CAMPAGNE.occasion(x.c.occasion) || {}).nom || "" : "")));
  }

  function carte(x) {
    var couv = window.COUVERTURE ? COUVERTURE.campagne(x.c) : null;
    var image = couv && couv.type !== "aucune" && (couv.vignette || couv.logo || (couv.images || []).length);
    var n = x.ps.length;
    var per = periode(x.c);
    return el("a.gal-carte", { href: "#/projets/" + x.c.id,
        "aria-label": x.c.nom + (n ? ", " + n + (n > 1 ? " projets" : " projet") : "") },
      el("div.gal-visuel", {}, image ? COUVERTURE.rendre(couv, "galerie", x.c.nom) : carteTypo(x)),
      el("div.gal-texte", {},
        el("p.gal-porteur", {}, x.porteur,
          x.structure !== "matanga" ? el("span.st-badge.st-" + x.structure, {}, NOMS_STRUCT[x.structure]) : null),
        el("h3.gal-titre", {}, x.titre),
        el("p.gal-meta", {}, [
          x.fil ? "Le fil de l'année" : "Temps fort",
          n + (n > 1 ? " projets" : " projet"),
          per,
        ].filter(Boolean).join(" · "))));
  }

  function puces(nom, options, cle, quand) {
    return el("div.gal-f", { role: "group", "aria-label": nom }, options.map(function (o) {
      return el("button.st-f" + (etat[cle] === o.v ? ".ici" : ""), { type: "button", "aria-pressed": etat[cle] === o.v ? "true" : "false",
        onclick: function () { etat[cle] = o.v; garder(); quand(); } },
        o.nom, o.n !== undefined ? el("span", {}, String(o.n)) : null);
    }));
  }

  function rendre(hote) {
    hote.className = "zone studio galerie";
    O.vider(hote);
    var toutes = DEPOT.liste("campagnes").map(fiche).filter(function (x) { return x.ps.length; });
    var projetsTotal = toutes.reduce(function (s, x) { return s + x.ps.length; }, 0);
    var ans = {}; toutes.forEach(function (x) { ans[x.annee] = (ans[x.annee] || 0) + 1; });
    var listeAns = Object.keys(ans).sort().reverse();
    var parStruct = {}; toutes.forEach(function (x) { parStruct[x.structure] = (parStruct[x.structure] || 0) + 1; });

    var zone = el("div.gal-zone");
    var compte = el("p.studio-resultats", { "aria-live": "polite" });
    var champ = el("input#gal-recherche", { type: "search", placeholder: "Marque, client, campagne, projet…", "aria-label": "Rechercher une campagne" });
    champ.value = etat.q || "";

    function filtrer() {
      O.vider(zone);
      var q = O.normalise(etat.q || "");
      var vis = toutes.filter(function (x) {
        return (etat.structure === "toutes" || x.structure === etat.structure)
          && (etat.annee === "toutes" || x.annee === etat.annee)
          && (etat.regime === "tous" || (etat.regime === "fil") === x.fil)
          && (!q || x.texte.indexOf(q) !== -1);
      });
      var n = vis.reduce(function (s, x) { return s + x.ps.length; }, 0);
      compte.textContent = vis.length + (vis.length > 1 ? " campagnes" : " campagne") + " · " + n + (n > 1 ? " projets" : " projet");
      if (!vis.length) {
        zone.appendChild(el("div.studio-vide", {}, el("h3", {}, "Aucune campagne ne correspond."),
          el("p", {}, "Retirez un filtre, ou cherchez une autre marque.")));
        return;
      }
      var groupes = {};
      vis.forEach(function (x) { (groupes[x.annee] = groupes[x.annee] || []).push(x); });
      Object.keys(groupes).sort().reverse().forEach(function (a) {
        var g = groupes[a].sort(function (x, y) {
          return (x.fil - y.fil) || String(y.cle).localeCompare(String(x.cle)) || x.c.nom.localeCompare(y.c.nom); });
        zone.appendChild(el("section.gal-annee", { "aria-labelledby": "gal-" + a },
          el("h2.gal-an", { id: "gal-" + a }, a, el("span", {}, g.length + (g.length > 1 ? " campagnes" : " campagne"))),
          el("div.gal-grille", {}, g.map(carte))));
      });
    }
    function tout() { rendre(hote); }
    champ.addEventListener("input", function () { etat.q = champ.value; garder(); filtrer(); });

    hote.appendChild(el("header.studio-entete", {},
      el("div", {},
        el("p.studio-date", {}, "Le travail, en images"),
        el("h1", {}, "La galerie."),
        el("p.studio-intro", {}, toutes.length + " campagnes, " + projetsTotal + " projets, de "
          + listeAns[listeAns.length - 1] + " à " + listeAns[0] + " — sous Matanga, UPgraders et Friends Studio. "
          + "Chaque carte ouvre sa campagne et ses projets."))));

    hote.appendChild(el("div.gal-filtres", {},
      puces("Structure", [{ v: "toutes", nom: "Toutes", n: toutes.length }].concat(["matanga", "upgraders", "friends"]
        .filter(function (s) { return parStruct[s]; }).map(function (s) { return { v: s, nom: NOMS_STRUCT[s], n: parStruct[s] }; })), "structure", tout),
      puces("Année", [{ v: "toutes", nom: "Toutes" }].concat(listeAns.map(function (a) { return { v: a, nom: a, n: ans[a] }; })), "annee", tout),
      puces("Régime", [{ v: "tous", nom: "Tout" }, { v: "temps", nom: "Temps forts" }, { v: "fil", nom: "Fils de l'année" }], "regime", tout),
      champ));
    hote.appendChild(compte);
    hote.appendChild(zone);
    filtrer();
  }

  return { rendre: rendre };
})();
