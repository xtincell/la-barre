/* vue-maison.js — le système, et lui seul.
 *
 * Cinquième couche : métadonnées, règles, audit, relations. Ce n'est pas du
 * travail, c'est ce qui le rend possible — et ça n'a rien à faire dans une vue
 * de décision.
 *
 * Deux modes, parce qu'on y vient pour deux raisons distinctes : renseigner ce
 * que le métier suppose, ou régler ce que la maison a décidé.
 */

window.VUE_MAISON = (function () {
  var el = O.el;
  var mode = null;
  var cible = null;
  var recherche = "";
  var registres = MAISON.registres || {};

  var MODES = [
    /* Le vault vit ici, hors des campagnes : ce qui définit une marque ne
     * change pas d'une saison à l'autre, et n'a rien à faire dans le dossier
     * qui l'a écrit en premier. */
    { cle: "marques", nom: "Marques" },
    { cle: "marches", nom: "Marchés et supports" },
    /* Le registre de l'autre outil. Il n'a pas sa place dans les projets : ce
     * n'est pas du travail, c'est ce qui dit lequel manque. */
    { cle: "people", nom: registres.people === "Matanga People" ? "Registre People" : (registres.people || "Registre des projets") },
    { cle: "radar", nom: registres.radar === "Radar Matanga" ? "Registre Radar" : (registres.radar || "Registre des briefs") },
    { cle: "intake", nom: "Boîte d’entrée" },
    /* Les vidéos et les EXE des exports : lus depuis le disque, en local. */
    { cle: "disque", nom: "Le disque" },
    /* La doctrine : d'où viennent les règles que le produit applique. Elle vit
     * ici parce que ce n'est pas du travail — c'est ce qui le rend jugeable. */
    { cle: "doctrine", nom: "Doctrine" },
    { cle: "parametres", nom: "Paramètres" },
  ];

  var FAMILLES = [
    { nom: "Référentiels", liens: {
      marques: "Plateformes et packs de marque",
      marches: "Contraintes, supports et fichiers",
      disque: "Fichiers locaux et exports"
    } },
    { nom: "Registres et demandes", liens: {
      people: "Projets associés et correspondances",
      radar: "Briefs associés et écarts",
      intake: "Demandes reçues et à qualifier"
    } },
    { nom: "Règles et sauvegarde", liens: {
      doctrine: "Documents et règles de production",
      parametres: "Dépôt, sauvegardes et réglages"
    } }
  ];

  function indexRessources() {
    var champ = el("input", { type: "search", id: "recherche-ressources", value: recherche,
      placeholder: "Marque, marché, support ou fichier", autocomplete: "off" });
    var retour = el("p.pilotage-meta", { role: "status" });
    var liste = el("ul.pilotage-liste.pilotage-resultats", { "aria-label": "Ressources trouvées" });
    var types = { Marque: "Marque", marche: "Marché", support: "Support", asset: "Fichier" };

    function afficher() {
      var texte = champ.value.trim();
      recherche = champ.value;
      O.vider(liste);
      liste.hidden = true;
      retour.textContent = "";
      if (!texte) return;
      if (texte.length < 2) {
        retour.textContent = "Saisir au moins deux caractères.";
        return;
      }
      var ressources = APP.chercher(texte).filter(function (x) { return Object.hasOwn(types, x.ou); });
      var limite = 10;
      retour.textContent = ressources.length > limite ? limite + " résultats sur " + ressources.length + ". Précisez votre recherche."
        : ressources.length ? ressources.length + (ressources.length === 1 ? " résultat" : " résultats") : "Aucune ressource trouvée.";
      liste.hidden = !ressources.length;
      ressources.slice(0, limite).forEach(function (x) {
        liste.appendChild(el("li", {}, el("a.pilotage-ligne", { href: x.lien },
          el("strong", {}, x.quoi), el("small.pilotage-etat", {}, types[x.ou]))));
      });
    }

    champ.addEventListener("input", afficher);
    afficher();

    return el("div.dc.pilotage.pilotage-ressources.pilotage-ressources-index", {},
      el("header.studio-entete.dc-tete", {}, el("h1", {}, "Ressources")),
      el("form.pilotage-recherche-ressource", { role: "search", "aria-label": "Ressources",
        onsubmit: function (e) {
          e.preventDefault();
          var premier = liste.querySelector("a");
          if (premier) premier.click();
        } },
        el("label", { for: champ.id }, "Rechercher une ressource"), champ, retour, liste),
      el("div.pilotage-familles", {}, FAMILLES.map(function (famille) {
        return el("section.pilotage-famille", {},
          el("h2", {}, famille.nom),
          el("ul.pilotage-liste", {}, Object.keys(famille.liens).map(function (cle) {
            var entree = MODES.find(function (m) { return m.cle === cle; });
            return el("li", {}, el("a.pilotage-ligne", { href: APP.adresse("referentiel", cle) },
              el("span", {}, el("strong", {}, entree.nom), el("small", {}, famille.liens[cle])),
              el("span.pilotage-chevron", { "aria-hidden": "true" }, "→")));
          })));
      }))
    );
  }

  function rendre(hote, arg, sous, id) {
    if (arguments.length > 1) {
      mode = MODES.some(function (m) { return m.cle === arg; }) ? arg : null;
      cible = mode === "marches" && sous ? { type: sous, id: id } : null;
    }

    hote.className = "zone studio";
    O.vider(hote);
    if (!mode) {
      hote.appendChild(indexRessources());
      return;
    }

    var trous = 0;
    DEPOT.liste("marches").forEach(function (m) {
      if (!(m.mentions || []).length) trous++;
      if (!(m.sku || []).length) trous++;
    });
    var w = DEPOT.poids();
    var age = DEPOT.ageSauvegarde();
    var vides = vaultsVides();
    var p = mode === "parametres" ? null : pire(mode, { trous: trous, vides: vides });
    var courant = MODES.find(function (m) { return m.cle === mode; });

    hote.appendChild(el("div.dc.pilotage.pilotage-ressources", {},
      el("header.studio-entete.dc-tete", {},
        el("div", {},
          el("p.pilotage-parent", {}, el("a", { href: APP.adresse("referentiel") }, "Ressources")),
          el("h1", {}, courant.nom))),
      UI.modes(MODES, mode, function (cle) { location.hash = "#/referentiel/" + cle; }, {
        titre: "Vues des ressources", route: "referentiel",
        compte: function (m) {
          if (m.cle === "doctrine") return 0;
          return m.cle === "marques" ? vides + VAULT.orphelins().length
            : m.cle === "marches" ? trous
            : m.cle === "people" ? REGISTRE.bilan().aveugles
            : m.cle === "radar" ? REGISTRE_RADAR.bilan().siensAveugles
            : m.cle === "intake" ? INTAKE.pile().length
            : m.cle === "disque" ? (DEPOT.tout().disque_sans_place || []).length
            : (w.grave || (!w.surDisque && (age === null || age > 2))) ? "!" : 0; },
        alerte: function (m) { return m.cle === mode; } }),

      el("div.dc-corps", {},
        p && !cible ? el("details.pilotage-contexte", {},
          el("summary", {}, p.t),
          el("p", {}, p.q)) : null,
        corps(hote))
    ));
  }

  function corps(hote) {
    var z = el("div");
    if (mode === "marques") VUE_VAULT.rendre(z);
    else if (mode === "marches") VUE_REFERENTIEL.rendre(z, cible);
    else if (mode === "people") REGISTRE.rendre(z, function () { rendre(hote); });
    else if (mode === "radar") REGISTRE_RADAR.rendre(z, function () { rendre(hote); });
    else if (mode === "intake") INTAKE.rendre(z, function () { rendre(hote); });
    else if (mode === "disque") DISQUE.ecran(z);
    else if (mode === "doctrine") z.appendChild(VUE_DOCTRINE.rendre(z));
    else VUE_REGLAGES.rendre(z);
    return z;
  }

  /* Le titre dit l'état de CE QU'ON REGARDE.
   *
   * Il disait l'état de l'intention entière : les réglages s'ouvraient sur
   * « 5 marques n'ont pas de socle », ce qui repoussait l'avertissement de
   * dépôt au second plan sur le seul écran où il compte. Un dépôt qui n'est
   * pas à l'abri est la chose la plus coûteuse que ce produit puisse taire. */
  function pire(mode, e) {
    if (mode === "doctrine") {
      var nd = ((MAISON.doctrine || {}).documents || []).length;
      return { t: "D'où viennent les règles",
        q: nd + " documents font foi. Chaque contrôle du produit renvoie à la page qui "
          + "l'explique — un refus sans critère est ce que la doctrine reproche aux agences." };
    }
    if (mode === "marques") return pireMarques(e);
    if (mode === "people") return REGISTRE.pire();
    if (mode === "radar") return REGISTRE_RADAR.pire();
    if (mode === "intake") return INTAKE.pire();
    if (mode === "disque") return DISQUE.pire();
    return pireReferentiel(e);
  }

  /* Le vault. Une marque sans socle est une marque que chaque campagne
   * réécrit ; un pack sans marque n'appartient à personne. */
  function pireMarques(e) {
    if (e.vides) {
      return { t: e.vides + (e.vides > 1 ? " marques n'ont pas de plateforme" : " marque n'a pas de plateforme"),
        q: "Sans plateforme de marque, chaque campagne repart d'une page blanche et rien ne "
          + "peut être refusé sur un fondement de marque." };
    }
    var orph = VAULT.orphelins().length;
    if (orph) {
      return { t: orph + (orph > 1 ? " packs n'appartiennent à personne" : " pack n'appartient à personne"),
        q: "Un pack sans marque n'est pas à tout le monde : il attend d'être qualifié. "
          + "Tant qu'il l'est, aucun cadrage ne peut le convoquer." };
    }
    return { t: "La bibliothèque de marque est tenue",
      q: "Chaque marque a sa plateforme, chaque pack sa marque. Une campagne peut convoquer "
        + "ce qui existe au lieu de le réécrire." };
  }

  /* Le référentiel se remplit par l'usage ; ce qui manque se découvre tard. */
  function pireReferentiel(e) {
    if (!DEPOT.liste("marches").length) return { t: "Aucun marché renseigné",
      q: "Ajoutez le premier marché lorsque le périmètre d’un dossier le précise. Les contraintes restent à renseigner." };
    if (e.trous) {
      return { t: e.trous + (e.trous > 1 ? " entrées du référentiel manquent" : " entrée du référentiel manque"),
        q: "Le référentiel se remplit par l'usage — mais ce qui manque se découvre à "
          + "l'impression, quand le fichier est déjà parti." };
    }
    return { t: "Le référentiel est renseigné",
      q: "Mentions et SKU posés sur chaque marché. Une case de matrice hérite de ses "
        + "contraintes sans qu'on les ressaisisse." };
  }

  /* Une marque sans socle est une marque que chaque campagne réécrit. */
  function vaultsVides() {
    return DEPOT.liste("marques").filter(function (m) {
      return VAULT.etat(m.id).ecrits === 0; }).length;
  }

  return { rendre: rendre, titre: "La maison", MODES: MODES };
})();
