/* Le bureau est une lecture du dépôt, jamais un deuxième modèle de décisions.
 * Une pièce, sa version et son projet restent joints jusque dans le geste. */
window.VUE_STUDIO = (function () {
  var el = O.el;
  var selection = null;
  var projet = "";
  var derniereRubrique = null;

  function noterRubrique(p, rubrique) {
    if (!p || !rubrique || !NATURE.aSection(p,rubrique)) return;
    derniereRubrique = {projet:p.id, rubrique:rubrique};
    if (!DEPOT.estDemonstration()) {
      try { sessionStorage.setItem("labarre.rubrique", JSON.stringify(derniereRubrique)); } catch (_) {}
    }
  }

  function rubriqueRecente(projets) {
    if (!derniereRubrique && !DEPOT.estDemonstration()) {
      try { derniereRubrique = JSON.parse(sessionStorage.getItem("labarre.rubrique")); } catch (_) {}
    }
    if (!derniereRubrique) return null;
    var p = projets.find(function (x) { return x.id === derniereRubrique.projet; });
    return p && NATURE.aSection(p,derniereRubrique.rubrique) ? derniereRubrique : null;
  }

  function navProjets(vue) {
    var vues = [["", "En cours"], ["archives", "Archives"], ["marques", "Par marque"], ["galerie", "Galerie"]];
    return el("nav.studio-statuts.lb-vues-projets", {"aria-label":"Vues des projets"}, vues.map(function (v) {
      return el("a", {href: v[0] ? APP.adresse("projets",v[0]) : "#/projets", "aria-current": v[0] === vue ? "page" : null}, v[1]);
    }));
  }

  /* Le Bureau du matin : la pièce à regarder d'abord, avec de quoi la juger
   * sans ouvrir le dossier (qui en répond, pour quand, ce que dit le brief, ce
   * qu'il faut vérifier) ; puis toute la file, dépliée. Elle était repliée
   * sous « File de revue » et le DC ignorait ce qui l'attendait (constats
   * ia-navigation-5, friction-parcours-9). */
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
      var filtre = hote.querySelector("#studio-projet"); if (filtre) filtre.focus();
    } }, el("option", {value:""}, "Tous les projets"), projets.map(function (p) { return el("option", {value:p.id}, p.nom); }));
    choix.value = projet;
    hote.appendChild(el("header.studio-entete", {}, el("div", {},
      el("p.studio-date", {}, new Intl.DateTimeFormat("fr-FR", {weekday:"long",day:"numeric",month:"long"}).format(new Date())),
      el("h1", {}, "À valider aujourd’hui")),
      el("button.b", { type:"button", onclick:VUE_PROJETS.nouveau }, "+ Nouveau projet")));
    if (DEPOT.provenance().cle === "exemple") hote.appendChild(el("div.studio-demo", {role:"status"},
      el("span", {}, "Données d’exemple"), el("a", {href:"#/referentiel/parametres"}, "Importer mon travail")));
    var travail = el("div.lb-travail");
    var table = el("div.lb-table");
    travail.appendChild(table);
    hote.appendChild(travail);
    if (active) {
      var p = active.projet, o = active.objet;
      var piste = active.type === "piste";
      var marche = o.marche && DEPOT.trouve("marches",o.marche);
      var chemin = VUE_REVUE.lienPiece(active);
      var version = active.version;
      var titre = piste ? o.titre || o.nom || active.titre : KV.titre(o);
      /* Le titre dit déjà la pièce et son marché (« Key visual — Ghana ·
       * Orvelle ») : la carte ne redit ni son code ni le marché. Un nom écrit
       * par l'équipe (« Affiche de lancement ») garde le marché à côté. */
      var dit = String(titre).replace(/\u00a0/g, " ");
      var meta = [marche && dit.indexOf(marche.nom) === -1 ? marche.nom : null, version ? "V" + version : null].filter(Boolean).join(" · ");
      var intention = o.concept || o.signature;
      /* Le geste suit le titre, avant le contexte : au téléphone, il reste
       * dans le premier écran sous le visuel. Le visuel mène aussi à la pièce ;
       * le lien qui se lit et se tabule reste « Examiner ». */
      table.appendChild(el("article.lb-piece" + (!o.vignette && !intention ? ".sans-visuel" : ""), {},
        el("div.lb-piece-texte", {},
          el("p.lb-etat", {}, el("span", { "aria-hidden":"true" }, "◐"), piste ? "Piste à arbitrer" : "À valider"),
          el("p.lb-piece-projet", {}, el("a", {href:APP.adresse("projets",p.id)}, p.nom)),
          el("h2", {}, titre),
          meta ? el("p.lb-piece-meta",{}, meta) : null,
          el("a.b.or", {href:chemin}, piste ? "Examiner cette piste" : version ? "Examiner la V" + version : "Examiner la pièce"),
          contexte(active)),
        o.vignette ? el("a.lb-piece-image", { href:chemin, tabindex:"-1", "aria-hidden":"true" }, IMAGE.vignette(o,"planche")) : intention ?
          el("blockquote.studio-intention.lb-intention",{}, intention) : null));
    } else {
      var sujet = !projet && FILE.tout()[0];
      var t = projet ? "Rien à valider dans ce projet." : "Aucune pièce à valider.";
      table.appendChild(el("section.studio-vide.lb-vide", {},
        el("h2",{},t), sujet ? el("p",{}, sujet.chiffre || sujet.quoi) : null,
        sujet ? el("a.b.or",{href:"#/valider/file"},"Ouvrir les décisions") :
        el("a.b",{href:projet ? APP.adresse("projets",projet) : "#/projets"},projet ? "Ouvrir le dossier" : "Voir les projets")));
    }
    if (pieces.length || projet) table.appendChild(el("section.lb-file", { "aria-labelledby":"lb-file-titre" },
      el("div.lb-file-tete", {},
        el("h2", { id:"lb-file-titre" }, "File de revue", el("span.studio-compte",{},String(pieces.length))),
        el("div.studio-filtre",{},el("label",{for:"studio-projet"},"Projet"),choix)),
      el("div.lb-file-lignes", {}, pieces.map(function (x) {
        return el("button.studio-piece" + (active === x ? ".active":""), {type:"button","aria-pressed":String(active === x),onclick:function () {
          selection = cle(x); rendre(hote); var lien = hote.querySelector(".lb-piece .b.or"); if (lien) lien.focus();
        }}, apercu(x), el("strong",{},x.titre), el("span",{},x.projet.nom));
      }))));
    var reprise = rubriqueRecente(projets);
    var proches = projets.slice().sort(function (a,b) {
      if (reprise && a.id !== b.id) {
        if (a.id === reprise.projet) return -1;
        if (b.id === reprise.projet) return 1;
      }
      return String((a.sections.identite || {}).echeance || "9999").localeCompare(String((b.sections.identite || {}).echeance || "9999"));
    });
    travail.appendChild(el("section.studio-dossiers", { "aria-label":"Dossiers en cours" },
      el("div.studio-section-tete",{}, el("h2",{},"Dossiers en cours"), el("a",{href:"#/projets","aria-label":"Tous les projets"},"Tout voir")),
      proches.length ? el("div.lb-dossiers",{}, proches.slice(0,4).map(function (p) {
        return dossier(p, reprise && p.id === reprise.projet ? reprise.rubrique : null);
      })) :
        el("div.studio-vide",{},el("button.b.or",{type:"button",onclick:VUE_PROJETS.nouveau},"Créer mon premier projet"))));
  }

  /* Ce qu'il faut pour juger sans ouvrir le dossier. Le critère est celui que
   * la page de la pièce affiche à côté des décisions (vue-asset.js). */
  function contexte(piece) {
    var p = piece.projet, o = piece.objet, s = p.sections || {};
    var brief = s.brief || {};
    var qui = piece.auteur && DEPOT.trouve("personnes", piece.auteur);
    var echeance = piece.type === "livrable" ? PLATEAU.echeanceDe(p, o) : (s.identite || {}).echeance;
    var criteres = ((s.bigidea || {}).criteres || []).filter(Boolean);
    var critere = criteres[0] || (piece.type === "livrable" ? (REGLES.grille("livrable", o)[0] || {}).texte : null);
    var demande = extrait(brief.probleme || brief.objectif_com || brief.objectif, 160);
    var lireBrief = NATURE.aSection(p, "brief") ? el("a", { href:APP.adresse("projets", p.id, "brief") }, "Lire le brief") : null;
    return el("dl.lb-contexte", {},
      el("div", {}, el("dt", {}, "Responsable"), el("dd", {}, qui ? qui.nom : "À attribuer")),
      el("div", {}, el("dt", {}, "Échéance"), el("dd", {}, echeance ? O.joli(echeance) : "À définir")),
      demande || lireBrief ? el("div.lb-contexte-large", {}, el("dt", {}, "Le brief"), el("dd", {}, demande ? [el("q", {}, demande), " "] : null, lireBrief)) : null,
      critere ? el("div.lb-contexte-large", {}, el("dt", {}, "À vérifier"), el("dd", {}, critere)) : null);
  }

  /* Un extrait d'environ n caractères, coupé à la fin d'un mot. */
  function extrait(texte, n) {
    texte = String(texte || "").replace(/\s+/g, " ").trim();
    if (texte.length <= n) return texte;
    var coupe = texte.slice(0, n + 1);
    var espace = coupe.lastIndexOf(" ");
    return (espace > n * 0.6 ? coupe.slice(0, espace) : texte.slice(0, n)).replace(/[\s,;:.—–-]+$/, "") + "…";
  }

  /* La vignette d'une pièce dans la file : son visuel, ou son intention. */
  function apercu(x) {
    var o = x.objet;
    if (o.vignette) return el("span.lb-file-visuel", { "aria-hidden":"true" }, IMAGE.vignette(o, "planche"));
    var mot = o.concept || o.signature || o.titre || o.nom || "";
    return el("span.lb-file-visuel.lb-file-texte", { "aria-hidden":"true" }, extrait(mot, 90));
  }

  function dossier(p, rubrique) {
    var ident = p.sections.identite || {};
    var livrables = (p.livrables || []).filter(function (l) { return !l.annule; });
    var blocs = REGLES.blocages(p.id).filter(function (b) { return b.type !== "infere-non-contresigne"; });
    var couverture = COUVERTURE.projet(p);
    var type = (NATURE.de(p) || {}).nom || "Projet";
    return el("a.studio-dossier", { href: rubrique ? APP.adresse("projets",p.id,rubrique) : APP.adresse("projets",p.id) },
      el("div.studio-couverture", {"aria-hidden":"true"}, couverture && couverture.type !== "aucune"
        ? COUVERTURE.rendre(couverture, "planche", p.nom)
        : el("span.lb-monogramme",{}, (ident.marque || ident.client || p.nom || type).toString().slice(0,1).toUpperCase())),
      el("div.studio-dossier-texte", {}, el("span.studio-piece-ref", {}, p.ref,
          window.STRUCTURE && !STRUCTURE.estAgence(p) ? el("span.st-badge.st-" + STRUCTURE.de(p).id, {}, STRUCTURE.de(p).court) : null),
        el("h3", {}, p.nom),
        rubrique ? el("p.lb-reprendre", {}, "Reprendre · " + VUE_PROJETS.nomSection(rubrique)) : el("p", {}, livrables.length ? livrables.length + (livrables.length === 1 ? " livrable" : " livrables") : type,
          blocs.length ? el("span.lb-a-traiter", {}, blocs.length + " à traiter") : null)));
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
    hote.appendChild(navProjets(archives ? "archives" : ""));
    var outils = el("div.lb-outils-collection", {}, champ);
    if (window.STRUCTURE) {
      var structure = STRUCTURE.filtre();
      var filtre = el("details.lb-filtre-structure", {},
        el("summary", {}, UI.icone("reglages", 16), structure === "toutes" ? "Structure" : STRUCTURE.de({structure:structure}).court));
      filtre.appendChild(STRUCTURE.puces(tous, function () {
        projets(hote,archives);
        hote.querySelector(".lb-filtre-structure summary").focus();
      }));
      outils.appendChild(filtre);
    }
    hote.appendChild(outils);
    hote.appendChild(compte);
    hote.appendChild(liste);
    filtrer();
  }
  return { rendre: rendre, projets: projets, navProjets: navProjets, noterRubrique: noterRubrique, extrait: extrait };
})();
