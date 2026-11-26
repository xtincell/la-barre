/* Le bureau est une lecture du dépôt, jamais un deuxième modèle de décisions.
 * Une pièce, sa version et son projet restent joints jusque dans le geste. */
window.VUE_STUDIO = (function () {
  var el = O.el;
  var selection = null;
  var projet = "";

  function rendre(hote) {
    hote.className = "zone studio lb-bureau";
    O.vider(hote);
    var projets = DEPOT.liste("projets").filter(function (p) { return !CLOTURE.est(p) && !p.fusionne; });
    if (!projets.some(function (p) { return p.id === projet; })) projet = "";
    var pieces = VUE_REVUE.pieces().filter(function (x) { return !projet || x.projet.id === projet; });
    function cle(x) { return x.projet.id + "/" + x.id; }
    var active = pieces.find(function (x) { return cle(x) === selection; }) || pieces[0];
    selection = active ? cle(active) : null;
    var choix = el("select", { id:"studio-projet", onchange:function () {
      projet = choix.value; selection = null; rendre(hote);
      var menu = hote.querySelector(".lb-file"); menu.open = true; menu.querySelector("select").focus();
    } }, el("option", {value:""}, "Tous les projets"), projets.map(function (p) { return el("option", {value:p.id}, p.nom); }));
    choix.value = projet;
    hote.appendChild(el("header.studio-entete", {}, el("div", {},
      el("p.studio-date", {}, new Intl.DateTimeFormat("fr-FR", {weekday:"long",day:"numeric",month:"long"}).format(new Date())),
      el("h1", {}, "Sur la table"))));
    if (DEPOT.provenance().cle === "exemple") hote.appendChild(el("div.studio-demo", {role:"status"},
      el("span", {}, "Données d’exemple"), el("a", {href:"#/referentiel/parametres"}, "Importer mon travail")));
    if (active) {
      var p = active.projet, o = active.objet;
      var piste = active.type === "piste", versions = o.versions || [], derniere = versions[versions.length-1];
      var marche = o.marche && DEPOT.trouve("marches",o.marche);
      var chemin = VUE_REVUE.lienPiece(active);
      var version = derniere && derniere.n || o.version;
      var meta = [marche && marche.nom, version ? "V" + version : null].filter(Boolean).join(" · ");
      var intention = o.concept || o.signature;
      hote.appendChild(el("article.lb-piece" + (!o.vignette && !intention ? ".sans-visuel" : ""), {},
        el("div.lb-piece-texte", {},
          el("p.lb-etat", {}, el("span", { "aria-hidden":"true" }, "◐"), piste ? "Piste à arbitrer" : "Verdict attendu"),
          el("p.lb-piece-projet", {}, el("a", {href:APP.adresse("projets",p.id)}, p.nom)),
          el("h2", {}, o.titre || o.nom || active.titre),
          meta ? el("p.lb-piece-meta",{}, meta) : null,
          el("a.b.or", {href:chemin}, piste ? "Examiner cette piste" : version ? "Examiner la V" + version : "Examiner la pièce")),
        o.vignette ? el("div.lb-piece-image", {}, IMAGE.vignette(o,"planche")) : intention ?
          el("blockquote.studio-intention.lb-intention",{}, intention) : null));
    } else {
      var sujets = FILE.tout();
      var t = projet ? "Ce projet n'attend pas de verdict." : "Aucune pièce en attente de verdict.";
      hote.appendChild(el("section.studio-vide.lb-vide", {},
        el("h2",{},t), sujets.length ? el("a.b.or",{href:"#/valider/file"},"Ouvrir les décisions") :
        el("a.b",{href:"#/projets"},"Voir les projets")));
    }
    var file = el("details.lb-file", {}, el("summary", {}, "File de revue", el("span.studio-compte",{},String(pieces.length))),
      el("div.studio-filtre",{},el("label",{for:"studio-projet"},"Projet"),choix),
      el("div.lb-file-lignes", {}, pieces.map(function (x) {
        return el("button.studio-piece" + (active === x ? ".active":""), {type:"button","aria-pressed":String(active === x),onclick:function () {
          selection = cle(x); rendre(hote); var lien = hote.querySelector(".lb-piece .b"); if (lien) lien.focus();
        }}, el("strong",{},x.titre),el("span",{},x.projet.nom));
      })));
    hote.appendChild(file);
    hote.appendChild(el("section.studio-dossiers", { "aria-label":"Dossiers en cours" },
      el("div.studio-section-tete",{}, el("h2",{},"Dossiers en cours"), el("a",{href:"#/projets"},"Tous les projets ↗")),
      projets.length ? el("div.lb-dossiers",{}, projets.slice(0,4).map(dossier)) :
        el("div.studio-vide",{},el("button.b.or",{type:"button",onclick:VUE_PROJETS.nouveau},"Créer mon premier projet"))));
  }

  function dossier(p) {
    var ident = p.sections.identite || {};
    var livrables = (p.livrables || []).filter(function (l) { return !l.annule; });
    var visuel = livrables.filter(function (l) { return l.vignette; })[0];
    var blocs = REGLES.blocages(p.id).filter(function (b) { return b.type !== "infere-non-contresigne"; });
    return el("a.studio-dossier", { href: "#/projets/" + p.id },
      el("div.studio-couverture", {}, (function () {
        var cov = window.COUVERTURE ? COUVERTURE.projet(p) : null;
        if (cov) return COUVERTURE.rendre(cov, "planche", p.nom);
        return visuel ? IMAGE.vignette(visuel, "planche") : el("span", {}, ident.marque || ident.client || p.ref || "Projet");
      })()),
      el("div.studio-dossier-texte", {}, el("span.studio-piece-ref", {}, p.ref,
          window.STRUCTURE && !STRUCTURE.estAgence(p) ? el("span.st-badge.st-" + STRUCTURE.de(p).id, {}, STRUCTURE.de(p).court) : null),
        el("h3", {}, p.nom),
        el("p", {}, livrables.length + " livrables", el("span", {}, blocs.length ? blocs.length + " points à résoudre" : "Aucun blocage")))) ;
  }
  var recherche = "";
  function projets(hote, archives) {
    archives = !!archives;
    hote.className = "zone studio studio-index";
    O.vider(hote);
    var tous = DEPOT.liste("projets").filter(function (p) { return !p.fusionne; });
    var champ = el("input", { type: "search", placeholder: "Nom, client, référence…", "aria-label": "Rechercher un projet" });
    champ.value = recherche;
    var liste = el("div.studio-projets");
    var compte = el("p.studio-resultats", { "aria-live": "polite" });
    function filtrer() {
      O.vider(liste);
      var visibles = tous.filter(function (p) {
        var ident = p.sections.identite || {};
        /* Les dossiers UPgraders et Friends Studio sont presque tous clos : filtrer
         * sur leur structure montre tout, en cours et archivés ensemble. */
        var f = window.STRUCTURE ? STRUCTURE.filtre() : "toutes";
        var etatOk = (f === "toutes" || f === STRUCTURE.principale()) ? CLOTURE.est(p) === archives : true;
        return etatOk && (!window.STRUCTURE || STRUCTURE.garde(p))
          && (!recherche || O.contient([p.nom, p.ref, ident.client, ident.marque].join(" "), recherche));
      }).sort(function (a, b) {
        return String((a.sections.identite || {}).echeance || "9999").localeCompare(String((b.sections.identite || {}).echeance || "9999"));
      });
      var fs = window.STRUCTURE ? STRUCTURE.filtre() : "toutes";
      compte.textContent = visibles.length + (visibles.length > 1 ? " projets" : " projet")
        + (fs !== "toutes" && fs !== STRUCTURE.principale() ? ", en cours et archivés" : archives ? " archivés" : " en cours");
      visibles.forEach(function (p) { liste.appendChild(dossier(p)); });
      if (!visibles.length) liste.appendChild(el("div.studio-vide", {}, el("h3", {}, recherche ? "Aucun projet ne correspond." : archives ? "Aucun projet archivé." : "Votre prochain projet commence ici."),
        el("p", {}, recherche ? "Essayez un autre nom, un client ou une référence." : "Les dossiers restent accessibles, de leur premier brief à leur bilan."),
        !archives && !recherche ? el("button.b.or", { type: "button", onclick: VUE_PROJETS.nouveau }, "Créer un projet") : null));
    }
    champ.addEventListener("input", function () { recherche = champ.value; filtrer(); });
    hote.appendChild(el("header.studio-entete", {}, el("div", {}, el("h1", {}, "Projets")),
      el("button.b.or", { type:"button", onclick:VUE_PROJETS.nouveau }, "+ Nouveau projet")));
    hote.appendChild(el("div.studio-index-outils", {}, el("nav.studio-statuts.lb-vues-projets", { "aria-label":"Vues des projets" },
      el("a", { href:"#/projets", "aria-current":!archives ? "page" : null }, "En cours"),
      el("a", { href:"#/projets/archives", "aria-current":archives ? "page" : null }, "Archives"),
      el("a", { href:"#/projets/marques" }, "Par marque"), el("a", { href:"#/projets/galerie" }, "Galerie")), champ));
    /* Matanga, UPgraders, Friends Studio : trois structures, une seule liste — filtrable. */
    if (window.STRUCTURE) hote.appendChild(STRUCTURE.puces(tous, function () { projets(hote,archives); }));
    hote.appendChild(compte);
    hote.appendChild(liste);
    filtrer();
  }
  return { rendre: rendre, projets: projets };
})();
