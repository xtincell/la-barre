/* Le bureau est une lecture du dépôt, jamais un deuxième modèle de décisions.
 * Une pièce, sa version et son projet restent joints jusque dans le geste. */
window.VUE_STUDIO = (function () {
  var el = O.el;
  var selection = null;
  var projet = "";

  function rendre(hote) {
    hote.className = "zone studio";
    O.vider(hote);
    var projets = DEPOT.liste("projets").filter(function (p) { return !CLOTURE.est(p); });
    if (projet && !projets.some(function (p) { return p.id === projet; })) projet = "";
    var toutes = VUE_REVUE.pieces();
    var pieces = toutes.filter(function (p) { return !projet || p.projet.id === projet; });
    var active = pieces.filter(function (p) { return p.projet.id + "/" + p.id === selection; })[0] || pieces[0];
    selection = active ? active.projet.id + "/" + active.id : null;
    var refresh = function () { rendre(hote); };
    var choix = el("select", { id: "studio-projet", onchange: function (e) { projet = e.target.value; selection = null; refresh(); } },
      el("option", { value: "" }, "Tous les projets"),
      projets.map(function (p) { return el("option", { value: p.id }, p.nom); }));
    choix.value = projet;
    var provenance = DEPOT.provenance();
    hote.appendChild(el("header.studio-entete", {},
      el("div", {},
        el("p.studio-date", {}, new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())),
        el("h1", {}, "L'œil sur la création."),
        el("p.studio-intro", {}, toutes.length ? toutes.length + (toutes.length > 1 ? " pièces à regarder. " : " pièce à regarder. ") + "Le contexte à côté. La décision à portée de main." : "Vos projets, vos créations et la prochaine décision, au même endroit.")),
      el("button.b.or", { type: "button", onclick: VUE_PROJETS.nouveau }, "+ Nouveau projet")));
    if (provenance.cle === "exemple") {
      hote.appendChild(el("div.studio-demo", { role: "status" },
        el("span", {}, "Espace de démonstration", el("small", {}, "Explorez le parcours avec les dossiers d'exemple.")),
        el("a", { href: "#/referentiel/parametres" }, "Importer mon travail")));
    }
    hote.appendChild(el("section.studio-revue", { "aria-label": "Revue créative" },
      el("div.studio-section-tete", {},
        el("h2", {}, "Sur la table", el("span.studio-compte", {}, String(pieces.length))),
        el("div.studio-filtre", {}, el("label", { for: "studio-projet" }, "Projet"), choix)),
      active ? el("div.studio-table", {},
        el("div.studio-file", { "aria-label": "Pièces à regarder" }, pieces.map(function (p) {
          var key = p.projet.id + "/" + p.id;
          var bouton = el("button.studio-piece" + (key === selection ? ".active" : ""), {
            type: "button", "aria-pressed": key === selection ? "true" : "false",
            onclick: function () { selection = key; refresh(); hote.querySelector('[data-piece="' + CSS.escape(key) + '"]').focus(); },
            "data-piece": key },
            el("span.studio-piece-ref", {}, p.projet.ref || "Projet"),
            el("strong", {}, p.titre),
            el("span", {}, p.type === "piste" ? "Piste créative" : "Livrable"),
            p.depuis ? el("small", {}, "Soumis le " + O.joli(p.depuis)) : el("small", {}, "Date de soumission à préciser"));
          return bouton;
        })),
        scene(active, refresh), contexte(active)) : el("div.studio-vide", {},
          el("div.studio-vide-signe", { "aria-hidden": "true" }, "✓"),
          el("h3", {}, projet ? "Ce projet n'attend pas de verdict." : "La table est libre."),
          el("p", {}, "Les pistes proposées et les versions sans verdict apparaissent ici. Retrouvez les retours client et les arbitrages dans Décisions."),
          el("a.b", { href: "#/valider" }, "Voir les décisions"))));
    hote.appendChild(el("section.studio-dossiers", { "aria-label": "Projets en cours" },
      el("div.studio-section-tete", {}, el("h2", {}, "L'atelier en cours", el("span.studio-compte", {}, String(projets.length))), el("a", { href: "#/projets" }, "Tous les projets ↗")),
      projets.length ? el("div.studio-projets", {}, projets.slice(0, 6).map(dossier)) : el("div.studio-vide", {},
        el("h3", {}, "Tout commence par un brief."), el("p", {}, "Un client, un nom de projet. Le reste se précise en travaillant."),
        el("button.b.or", { type: "button", onclick: VUE_PROJETS.nouveau }, "Créer mon premier projet"))));
    var actions = FILE.tout();
    if (actions.length) hote.appendChild(el("section.studio-suite", {},
      el("div", {}, el("h2", {}, "Et autour de la création ?"), el("p", {}, "Retours client, arbitrages de pistes, responsabilités et engagements.")),
      el("a.b", { href: "#/valider" }, "Voir les " + actions.length + " sujets à traiter")));
  }

  function scene(piece, refresh) {
    var o = piece.objet, p = piece.projet;
    var versions = o.versions || [];
    var version = versions.length ? versions[versions.length - 1].n : o.version || 1;
    var idee = o.concept || o.signature || o.titre || o.nom;
    var ouvrir = function () {
      if (piece.type === "livrable") VUE_ASSET.ouvrir(p, o, refresh, "juger");
      else GESTE.ouvrir("pistes", { p: p });
    };
    return el("article.studio-scene", {},
      el("div.studio-scene-tete", {}, el("span", {}, piece.type === "piste" ? "Piste à arbitrer" : "Version à examiner"), el("span", {}, "V" + version)),
      el("div.studio-visuel", {}, o.vignette ? IMAGE.vignette(o, "planche") : el("div.studio-intention", {},
        el("span", {}, "L'intention"), el("blockquote", {}, idee || "Une création à préciser"),
        el("small", {}, "Aucun visuel joint à cette pièce"))),
      el("div.studio-legende", {}, el("h3", {}, piece.titre), el("p", {}, piece.contexte)),
      el("div.studio-actions", {},
        el("button.b.or", { type: "button", onclick: ouvrir }, piece.type === "piste" ? "Examiner cette piste" : "Examiner et décider"),
        el("a.b.nu", { href: "#/projets/" + p.id + (piece.type === "piste" ? "/pistes" : "/livrables") }, "Ouvrir le dossier")));
  }

  function contexte(piece) {
    var p = piece.projet, s = p.sections || {}, brief = s.brief || {};
    var auteur = piece.auteur && DEPOT.trouve("personnes", piece.auteur);
    var criteres = MAISON.criteresDe(piece.criteres);
    var details = el("details.studio-criteres", {}, el("summary", {}, "Critères de revue", el("span", {}, String(criteres.length))),
      el("p", {}, "Points de refus à vérifier, sans verdict automatique."), el("ul", {}, criteres.map(function (c) { return el("li", {}, c); })));
    details.open = false;
    var objet = piece.objet;
    return el("aside.studio-contexte", { "aria-label": "Contexte de la pièce sélectionnée" },
      el("h3", {}, "Garder le cap"),
      el("a.studio-contexte-projet", { href: "#/projets/" + p.id }, p.nom),
      el("dl", {},
        el("dt", {}, "Responsable"), el("dd", {}, auteur ? auteur.nom : "À attribuer"),
        el("dt", {}, "Échéance du projet"), el("dd", {}, (s.identite || {}).echeance ? O.joli(s.identite.echeance) : "À définir")),
      el("div.studio-brief", {}, el("h4", {}, "Le brief"),
        el("p", {}, brief.probleme || brief.objectif || "Le cadrage se consulte dans le brief du projet."),
        el("a", { href: "#/projets/" + p.id + "/brief" }, "Lire le brief ↗")),
      details,
      piece.type === "livrable" ? el("p.studio-contexte-note", {}, (objet.versions || []).length + " version(s) au dossier. Un verdict porte sur une version précise.") : el("p.studio-contexte-note", {}, "Retenir une piste ne vaut pas accord de mise en production."));
  }

  function dossier(p) {
    var ident = p.sections.identite || {};
    var livrables = (p.livrables || []).filter(function (l) { return !l.annule; });
    var visuel = livrables.filter(function (l) { return l.vignette; })[0];
    var blocs = REGLES.blocages(p.id).filter(function (b) { return b.type !== "infere-non-contresigne"; });
    return el("a.studio-dossier", { href: "#/projets/" + p.id },
      el("div.studio-couverture", {}, visuel ? IMAGE.vignette(visuel, "planche") : el("span", {}, ident.marque || ident.client || p.ref || "Projet")),
      el("div.studio-dossier-texte", {}, el("span.studio-piece-ref", {}, p.ref), el("h3", {}, p.nom),
        el("p", {}, livrables.length + " livrables", el("span", {}, blocs.length ? blocs.length + " points à résoudre" : "Aucun blocage")))) ;
  }
  var recherche = "";
  var archives = false;
  function projets(hote) {
    hote.className = "zone studio studio-index";
    O.vider(hote);
    var tous = DEPOT.liste("projets");
    var champ = el("input", { type: "search", placeholder: "Nom, client, référence…", "aria-label": "Rechercher un projet" });
    champ.value = recherche;
    var liste = el("div.studio-projets");
    var compte = el("p.studio-resultats", { "aria-live": "polite" });
    function filtrer() {
      O.vider(liste);
      var visibles = tous.filter(function (p) {
        var ident = p.sections.identite || {};
        return CLOTURE.est(p) === archives && (!recherche || O.contient([p.nom, p.ref, ident.client, ident.marque].join(" "), recherche));
      }).sort(function (a, b) {
        return String((a.sections.identite || {}).echeance || "9999").localeCompare(String((b.sections.identite || {}).echeance || "9999"));
      });
      compte.textContent = visibles.length + (visibles.length > 1 ? " projets" : " projet") + (archives ? " archivés" : " en cours");
      visibles.forEach(function (p) { liste.appendChild(dossier(p)); });
      if (!visibles.length) liste.appendChild(el("div.studio-vide", {}, el("h3", {}, recherche ? "Aucun projet ne correspond." : archives ? "Aucun projet archivé." : "Votre prochain projet commence ici."),
        el("p", {}, recherche ? "Essayez un autre nom, un client ou une référence." : "Les dossiers restent accessibles, de leur premier brief à leur bilan."),
        !archives && !recherche ? el("button.b.or", { type: "button", onclick: VUE_PROJETS.nouveau }, "Créer un projet") : null));
    }
    champ.addEventListener("input", function () { recherche = champ.value; filtrer(); });
    hote.appendChild(el("header.studio-entete", {}, el("div", {}, el("p.studio-date", {}, "Le travail, dans son ensemble"),
      el("h1", {}, "Vos projets."), el("p.studio-intro", {}, "Du premier brief à la dernière livraison. Les échéances les plus proches passent devant.")),
      el("button.b.or", { type: "button", onclick: VUE_PROJETS.nouveau }, "+ Nouveau projet")));
    hote.appendChild(el("div.studio-index-outils", {}, el("div.studio-statuts", { "aria-label": "État des projets" },
      [false, true].map(function (etat) { return el("button" + (archives === etat ? ".active" : ""), {
        type: "button", "aria-pressed": archives === etat ? "true" : "false", onclick: function () { archives = etat; projets(hote); }
      }, etat ? "Archives" : "En cours"); })), champ, el("a", { href: "#/projets/marques" }, "Vue par marque")));
    hote.appendChild(compte);
    hote.appendChild(liste);
    filtrer();
  }
  return { rendre: rendre, projets: projets };
})();
