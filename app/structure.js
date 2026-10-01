/* structure.js — sous quelle structure une opération a été faite.
 *
 * LA BARRE tient les dossiers de Matanga, et aussi ce qu'Alexandre a fait
 * ailleurs : la photo à son nom sous couvert de Friends Photography Studio, le
 * conseil, le design et l'événementiel sous couvert d'UPgraders. Les deux
 * vivaient comme des « clients », mélangés aux vrais clients — Akwa Palace
 * rangé sous UPgraders comme Bonnet Rouge sous FrieslandCampina — et comptés
 * dans les indicateurs de l'agence.
 *
 * La structure est maintenant un axe à part : p.structure, avec sa source
 * (la facture quand elle existe, le corpus, ou la règle). Les indicateurs
 * d'agence ne lisent que les dossiers Matanga ; la liste des projets se filtre
 * par structure ; chaque dossier montre ses pièces de facturation — leur
 * présence prouve l'opération, leur absence se dit.
 */

window.STRUCTURE = (function () {
  var el = O.el;
  var DEFAUT = [
    { id: "matanga", nom: "Matanga Agency", court: "Matanga" },
    { id: "upgraders", nom: "UPgraders SARL", court: "UPgraders" },
    { id: "friends", nom: "Friends Photography Studio SARL", court: "Friends Studio" },
    { id: "nom-propre", nom: "Alexandre Djengue, en nom propre", court: "Nom propre" },
  ];

  function liste() {
    var s = DEPOT.liste("structures");
    return s.length ? s.map(function (x) {
      var d = DEFAUT.filter(function (y) { return y.id === x.id; })[0] || {};
      return Object.assign({ court: d.court || x.nom }, x);
    }) : DEFAUT;
  }
  function de(p) {
    var id = (p && p.structure) || "matanga";
    return liste().filter(function (s) { return s.id === id; })[0] || DEFAUT[0];
  }
  function estAgence(p) { return !p.structure || p.structure === "matanga"; }

  /* Les dossiers qui font les indicateurs de l'agence. */
  function agence() { return DEPOT.liste("projets").filter(estAgence); }

  /* Les structures d'une marque, lues sur ses dossiers. */
  function deMarque(marqueId) {
    var vus = {};
    DEPOT.liste("projets").forEach(function (p) {
      if (((p.sections.identite || {}).marqueIds || []).indexOf(marqueId) !== -1) vus[(p.structure || "matanga")] = true;
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
  function garde(p) { var f = filtre(); return f === "toutes" || (p.structure || "matanga") === f; }

  function puces(tous, quand) {
    var f = filtre();
    var compte = {};
    tous.forEach(function (p) { var k = p.structure || "matanga"; compte[k] = (compte[k] || 0) + 1; });
    var opts = [{ id: "toutes", court: "Toutes" }].concat(liste().filter(function (s) { return compte[s.id]; }));
    return el("div.st-filtre", { role: "group", "aria-label": "Filtrer par structure" }, opts.map(function (s) {
      return el("button.st-f" + (f === s.id ? ".ici" : ""), { type: "button", "aria-pressed": f === s.id ? "true" : "false",
        onclick: function () { choisir(s.id); quand(); } },
        s.court, el("span", {}, String(s.id === "toutes" ? tous.length : compte[s.id] || 0)));
    }));
  }

  return { liste: liste, de: de, estAgence: estAgence, agence: agence, deMarque: deMarque,
    factures: factures, ligne: ligne, puces: puces, garde: garde, filtre: filtre };
})();
