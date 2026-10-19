/* La structure porte l’entreprise qui a fait le travail.
 * Les noms et la structure principale viennent de son profil ; les pièces
 * de facturation et leur source restent dans son dépôt.
 */

window.STRUCTURE = (function () {
  var el = O.el;
  var DEFAUT = MAISON.structures;
  function principale() { return MAISON.structurePrincipale; }

  function liste() {
    var s = DEPOT.liste("structures");
    return s.length ? s.map(function (x) {
      var d = DEFAUT.filter(function (y) { return y.id === x.id; })[0] || {};
      return Object.assign({ court: d.court || x.nom }, x);
    }) : DEFAUT;
  }
  function de(p) {
    var id = (p && p.structure) || principale();
    return liste().filter(function (s) { return s.id === id; })[0] || DEFAUT[0];
  }
  function estAgence(p) { return !p.structure || p.structure === principale(); }

  /* Les dossiers qui font les indicateurs de l'agence. */
  function agence() { return DEPOT.liste("projets").filter(function (p) { return estAgence(p) && !p.fusionne; }); }

  /* Les structures d'une marque, lues sur ses dossiers. */
  function deMarque(marqueId) {
    var vus = {};
    DEPOT.liste("projets").forEach(function (p) {
      if (((p.sections.identite || {}).marqueIds || []).indexOf(marqueId) !== -1) vus[(p.structure || principale())] = true;
    });
    return liste().filter(function (s) { return vus[s.id]; });
  }

  function factures(p) {
    var ids = (p && p.factures) || [];
    return DEPOT.liste("factures").filter(function (f) { return ids.indexOf(f.id) !== -1 || f.projetId === p.id; });
  }

  var NOMS_TYPE = { facture: "Facture", "reçu": "Reçu", proforma: "Proforma", devis: "Devis", "pièce": "Pièce" };

  /* La ligne du dossier : sa structure, et ce que la facturation en prouve. */
  function ligne(p) {
    var s = de(p);
    var fs = factures(p);
    var faites = fs.filter(function (f) { return f.type === "facture" || f.type === "reçu"; }).length;
    var etat = fs.length
      ? fs.length + (fs.length > 1 ? " pièces" : " pièce") + (faites ? " dont " + faites + " facturée" + (faites > 1 ? "s" : "") : " — devis seulement, rien ne prouve que l'opération a eu lieu")
      : (estAgence(p) ? null : "aucune pièce de facturation retrouvée");
    return el("div.pj-struct", {},
      el("p.pj-cmp", {},
        el("span.pj-cmp-e", {}, "Structure"), " ",
        el("span.st-badge.st-" + s.id, {}, s.court),
        etat ? el("span.pj-struct-q" + (fs.length ? "" : ".absent"), {}, " · " + etat) : null,
        p.sousTraitance ? el("span.pj-struct-q", {}, " · sous-traitance " + (de({ structure: p.sousTraitance.structure }).court)) : null),
      p.structureNote ? el("p.pj-struct-n", {}, p.structureNote) : null,
      p.sousTraitance ? el("p.pj-struct-n", {}, p.sousTraitance.motif) : null,
      fs.length ? el("details.fonds", {},
        el("summary", {}, "Les pièces de facturation", el("span.studio-compte", {}, String(fs.length)),
          el("span.fonds-q", {}, "référence, date, client, objet — les montants restent dans les fichiers")),
        el("ul.fonds-l", {}, fs.map(function (f) {
          return el("li", {},
            el("b", {}, (NOMS_TYPE[f.type] || f.type) + (f.numero ? " " + f.numero : "")),
            [f.date, f.client, f.objet].filter(Boolean).length ? " — " + [f.date, f.client, f.objet].filter(Boolean).join(" · ") : "",
            el("span", {}, "émise par " + (f.emetteur ? de({ structure: f.emetteur }).court : "émetteur non lu")
              + " · " + f.fichiers.length + (f.fichiers.length > 1 ? " fichiers" : " fichier") + " · " + f.fichiers[0]));
        }))) : null);
  }

  /* Le filtre de la liste des projets : il se souvient, par navigateur. */
  var CLE = "labarre.filtreStructure";
  function filtre() { try { return localStorage.getItem(CLE) || "toutes"; } catch (e) { return "toutes"; } }
  function choisir(v) { try { localStorage.setItem(CLE, v); } catch (e) {} }
  function garde(p) { var f = filtre(); return f === "toutes" || (p.structure || principale()) === f; }

  function puces(tous, quand) {
    var f = filtre();
    var compte = {};
    tous.forEach(function (p) { var k = p.structure || principale(); compte[k] = (compte[k] || 0) + 1; });
    var opts = [{ id: "toutes", court: "Toutes" }].concat(liste().filter(function (s) { return compte[s.id]; }));
    return el("div.st-filtre", { role: "group", "aria-label": "Filtrer par structure" }, opts.map(function (s) {
      return el("button.st-f" + (f === s.id ? ".ici" : ""), { type: "button", "aria-pressed": f === s.id ? "true" : "false",
        onclick: function () { choisir(s.id); quand(); } },
        s.court, el("span", {}, String(s.id === "toutes" ? tous.length : compte[s.id] || 0)));
    }));
  }

  return { principale: principale, liste: liste, de: de, estAgence: estAgence, agence: agence, deMarque: deMarque,
    factures: factures, ligne: ligne, puces: puces, garde: garde, filtre: filtre };
})();
