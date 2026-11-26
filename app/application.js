/* application.js — la coque : barre latérale, fil, recherche, capture.
 *
 * Les mêmes destinations ont une adresse sur ordinateur et sur téléphone.
 */

window.APP = (function () {
  var el = O.el;
  var corps = null;
  var railNoeud = null;

  var VUES = [
    { cle: "bureau", ico: "bureau", nom: "Bureau", vue: function () { return VUE_STUDIO; } },
    { cle: "projets", ico: "projets", nom: "Projets", vue: function () { return VUE_PROJETS; } },
    { cle: "valider", ico: "decision", nom: "Décisions", vue: function () { return VUE_DECIDER; } },
    { cle: "planning", ico: "calendrier", nom: "Planning", vue: function () { return VUE_PLACER; } },
    { cle: "reporting", ico: "standard", nom: "Bilan", vue: function () { return VUE_CONSTATER; } },
    { cle: "referentiel", ico: "referentiel", nom: "Ressources", vue: function () { return VUE_MAISON; } }
  ];
  var ANCIENNES = {
    decider: ["valider", "file"], placer: ["planning", "ordre"],
    constater: ["reporting", "indicateurs"], maison: ["referentiel", "marches"],
    direction: ["valider", "file"], revue: ["valider", "file"], attentes: ["valider", "du"],
    briefs: ["reporting", "indicateurs"], standard: ["reporting", "indicateurs"],
    pipeline: ["planning", "ordre"], reglages: ["referentiel", "parametres"], people: ["referentiel", "people"],
    galerie: ["projets", "galerie"]
  };
  function segments() {
    return location.hash.replace(/^#\/?/, "").split("/").map(function (s) {
      try { return decodeURIComponent(s); } catch (_) { return s; }
    });
  }
  function adresse() { return "#/" + Array.from(arguments).map(encodeURIComponent).join("/"); }
  function piste() {
    var m = segments();
    if (Object.prototype.hasOwnProperty.call(ANCIENNES, m[0])) m = ANCIENNES[m[0]].concat(m.slice(1));
    var cle = m[0] || "bureau";
    return { vue: VUES.find(function (v) { return v.cle === cle; }), cle: cle,
      arg: m[1], sous: m[2], objet: m[3], mode: m[4], version: m[5] };
  }

  function moi() { return ACTEUR.nom(); }
  function marque() {
    return el("a.lb-marque", { href: "#/bureau", "aria-label": "La Barre, bureau" },
      el("span.lb-signe", { "aria-hidden": "true" }), "La Barre");
  }
  function navigation(v, cle) {
    return el("a", { href: adresse(v.cle), "aria-current": cle === v.cle ? "page" : null },
      UI.icone(v.ico, 20), el("span", {}, v.nom));
  }
  function raccourci() { return /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘" : "Ctrl"; }
  function outils() {
    var age = DEPOT.ageSauvegarde();
    return el("div.lb-outils", {},
      el("button", { type: "button", onclick: CAPTURE.ouvrir }, UI.icone("capture"), "Prendre une note"),
      el("button", { type: "button", onclick: function () { RENVOI.ouvrir({}); } }, UI.icone("renvoi"), "Demander un retour"),
      el("button", { type: "button", onclick: function () { window.print(); } }, UI.icone("imprimer"), "Imprimer"),
      el("a", { href: "#/referentiel/parametres" }, UI.icone("reglages"), "Paramètres"),
      DEPOT.estDemonstration() ? null : el("button", { type: "button", title: age === null ? "Aucun export" : "Dernier export il y a " + age + " j",
        onclick: function () { DEPOT.exporter(); DEPOT.noterExport(); rendre(); } }, UI.icone("fichier"), "Exporter la sauvegarde"),
      MAISON.suite && MAISON.suite.url ? el("a", { href: MAISON.suite.url, target: "_blank", rel: "noopener noreferrer" }, "Ouvrir la suite ↗") : null,
      el("p.lb-identite", {}, moi(), el("small", {}, ACTEUR.postes().map(function (p) { return O.poste(p).court; }).join(" · ")), el("small", {}, ACTEUR.mention())));
  }
  function rail(r) {
    var principales = ["bureau","projets","valider"];
    return el("aside.rail.lb-rail", { "aria-label": DEPOT.estDemonstration() ? "Démonstration — données fictives" : "Espace de travail" },
      el("div.lb-entete-rail", {}, marque(),
        el("button.lb-chercher", { type: "button", "aria-label": "Rechercher", onclick: ouvrirRecherche },
          UI.icone("recherche", 20), el("span", {}, "Rechercher"), el("kbd", {}, raccourci() + " F"))),
      el("nav.rail-nav.lb-nav", { "aria-label": "Navigation principale" }, VUES.map(function (v) { return navigation(v, r.cle); })),
      el("details.lb-commande", {}, el("summary", {}, UI.icone("reglages", 18), "Outils du poste"), outils()),
      el("nav.lb-mobile", { "aria-label": "Navigation mobile" }, VUES.slice(0, 3).map(function (v) { return navigation(v, r.cle); }),
        navigation({ cle: "plus", ico: "plus", nom: "Plus" }, principales.indexOf(r.cle) < 0 ? "plus" : r.cle)));
  }
  function plus(zone) {
    zone.appendChild(el("header.studio-entete", {}, el("h1", {}, "Plus")));
    zone.appendChild(el("nav.lb-liste-liens", { "aria-label": "Autres espaces" },
      VUES.slice(3).map(function (v) { return navigation(v, ""); })));
    zone.appendChild(el("details.lb-outils-mobile", {}, el("summary", {}, "Outils du poste"), outils()));
  }

  function ouvrirRecherche(reprise) {
    if (document.querySelector("dialog[open], .panneau[role=dialog]") || segments()[0] === "partage") return;
    var declencheur = document.activeElement;
    var champ = el("input", { type: "search", placeholder: "Nom, référence ou marché", "aria-label": "Rechercher dans La Barre", autocomplete: "off" });
    var liste = el("div.lb-resultats");
    var retour = el("p", { role: "status", "aria-live": "polite" });
    var boite = el("dialog.lb-recherche", { "aria-labelledby": "lb-recherche-titre", "data-route":location.hash },
      el("header", {}, el("h2", { id: "lb-recherche-titre" }, "Rechercher"),
        el("button", { type: "button", "aria-label": "Fermer la recherche", onclick: function () { boite.close(); } }, "×")),
      champ, retour, liste);
    function afficher() {
      var q = champ.value.trim();
      var lignes = q.length >= 2 ? chercher(q) : [];
      O.vider(liste);
      retour.textContent = q.length < 2 ? "Saisissez au moins deux caractères." :
        lignes.length ? (lignes.length > 20 ? "20 premiers résultats sur " : "") + lignes.length + (lignes.length > 20 ? "" : lignes.length > 1 ? " résultats" : " résultat") : "Aucun résultat.";
      lignes.slice(0,20).forEach(function (x) {
        liste.appendChild(el("a", { href: x.lien, onclick: function (e) {
          if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) boite.close();
        } }, el("strong", {}, x.quoi), el("small", {}, x.ou)));
      });
    }
    champ.addEventListener("input", afficher);
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); boite.close(); }
      if ((e.key === "ArrowDown" || e.key === "Enter") && liste.firstElementChild) {
        e.preventDefault(); if (e.key === "Enter") liste.firstElementChild.click(); else liste.firstElementChild.focus();
      }
    });
    boite.addEventListener("close", function () { boite.remove(); if (declencheur && declencheur.isConnected) declencheur.focus(); }, { once: true });
    document.body.appendChild(boite);
    if (reprise && typeof reprise.texte === "string") champ.value = reprise.texte;
    afficher(); boite.showModal();
    var selection = reprise && Array.from(liste.querySelectorAll("a")).find(function (a) { return a.hash === reprise.lien; });
    (selection || champ).focus();
  }

  function chercher(q) {
    var t = [];
    DEPOT.liste("projets").forEach(function (p) {
      if (O.contient(p.nom + " " + p.ref, q)) t.push({ quoi: p.nom, ou: p.ref, lien: adresse("projets", p.id) });
      (p.livrables || []).forEach(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        if (O.contient(l.nom + " " + (m ? m.nom + " " + m.code : ""), q))
          t.push({ quoi: l.nom + (m ? " · " + m.code : ""), ou: p.ref + " · livrable", lien: adresse("projets", p.id, "livrables", l.id) });
      });
      (p.sections.pistes || []).forEach(function (pi) {
        if (O.contient(pi.titre + " " + (pi.concept || ""), q))
          t.push({ quoi: pi.titre, ou: p.ref + " · piste", lien: adresse("projets", p.id, "pistes", pi.id) });
      });
    });
    ["marches", "supports", "assets"].forEach(function (type) {
      DEPOT.liste(type).forEach(function (x) {
        if (O.contient(x.nom + " " + (x.code || "") + " " + (x.source || ""), q))
          t.push({ quoi: x.nom, ou: type.slice(0, -1), lien: adresse("referentiel", "marches", type.slice(0, -1), x.id) });
      });
    });
    DEPOT.liste("attentes").forEach(function (a) {
      if (O.contient((a.quoi || "") + " " + (a.critere || ""), q))
        t.push({ quoi: a.quoi, ou: "attente", lien: adresse("valider", "du", a.id) });
    });
    ["marques","campagnes"].forEach(function (type) {
      DEPOT.liste(type).forEach(function (x) {
        if (O.contient(x.nom || "", q)) t.push({ quoi:x.nom, ou:type === "marques" ? "Marque" : "Campagne", lien:adresse("projets", x.id) });
      });
    });
    return t;
  }

  /* ————————————————————— Rendu ————————————————————— */

  var dernierHash = null;
  function retour(fallback, label) {
    var depuis = (history.state || {}).barreDepuis;
    return el("a.lb-retour", { href: depuis || fallback,
      onclick: function (e) {
        if (depuis && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); history.back(); }
      } }, "← " + (label || "Retour"));
  }
  function piece(zone, r) {
    var p = DEPOT.trouve("projets", r.arg);
    var estPiste = r.sous === "pistes";
    var objets = p && (estPiste ? p.sections.pistes : p.livrables);
    var objet = (objets || []).find(function (x) { return x.id === r.objet; });
    zone.appendChild(retour(p ? adresse("projets", p.id, r.sous) : "#/projets"));
    if (!objet) { zone.appendChild(el("h1", {}, "Pièce introuvable")); return; }
    zone.appendChild(el("header.studio-entete", {}, el("div", {}, el("p.studio-date", {},
      el("a", { href: adresse("projets", p.id) }, p.nom)), el("h1", {}, objet.titre || objet.nom || "Pièce"))));
    var scene = el("div.lb-detail-piece"); zone.appendChild(scene);
    if (!estPiste && r.version) {
      var courante = REMISE.versionCourante(objet);
      if (!courante || String(courante.numero) !== r.version) {
        var ancienne = (objet.versions || []).find(function (v) { return String(v.n || v.numero) === r.version; });
        scene.appendChild(el("section.lb-version", {},
          el("h2", {}, ancienne ? "Version " + r.version + " · historique" : "Version introuvable"),
          ancienne ? el("p", {}, ancienne.verdict ? "Verdict consigné · " + ((MAISON.verdicts.find(function (v) { return v.cle === ancienne.verdict; }) || {}).nom || ancienne.verdict) : "Aucun verdict consigné.") : null,
          ancienne && ancienne.motif ? el("p", {}, ancienne.motif) : null,
          el("a.b", {href:adresse("projets", p.id, "livrables", objet.id)}, "Voir le livrable actuel")));
        return;
      }
    }
    if (estPiste) {
      function relire() { O.vider(scene); scene.appendChild(VUE_ROUTE.rendre(p, objet, relire)); }
      relire();
    } else {
      scene.appendChild(VUE_ASSET.page(p, objet, null, r.mode || "poser"));
    }
  }
  function rendre() {
    var hash = location.hash, r = piste(), change = dernierHash !== null && dernierHash !== hash;
    var initial = dernierHash === null;
    var ancienFocus = document.activeElement;
    var y = window.scrollY;
    dernierHash = hash;
    if (r.cle === "partage" && window.PARTAGE) {
      if (railNoeud) railNoeud.remove();
      railNoeud = null; document.body.dataset.vue = "partage"; O.vider(corps);
      if (DEPOT.estDemonstration()) corps.appendChild(bandeauDemonstration());
      PARTAGE.page(corps, r.arg || "", r.sous || null);
      document.title = ((corps.querySelector("h1") || {}).textContent || "Document partagé") + " · La Barre";
      if (initial || change) window.scrollTo(0,0);
      return;
    }
    delete document.body.dataset.impression;
    document.body.dataset.vue = r.cle;
    var nouveau = rail(r);
    if (railNoeud && railNoeud.isConnected) railNoeud.replaceWith(nouveau);
    else document.body.insertBefore(nouveau, corps);
    railNoeud = nouveau;
    O.vider(corps);
    if (DEPOT.estDemonstration()) corps.appendChild(bandeauDemonstration());
    var zone = el("div.zone.studio", {id:"contenu", tabindex:"-1"});
    corps.appendChild(zone);
    if (r.cle === "plus") plus(zone);
    else if (!r.vue) zone.appendChild(el("div", {}, el("h1", {}, "Page introuvable"), el("a.b", {href:"#/bureau"}, "Revenir au Bureau")));
    else if (r.cle === "projets" && r.arg === "galerie") VUE_GALERIE.rendre(zone);
    else if (r.cle === "projets" && r.arg === "archives") VUE_STUDIO.projets(zone, true);
    else if (r.cle === "projets" && r.objet && ["livrables","pistes"].includes(r.sous)) piece(zone, r);
    else r.vue.vue().rendre(zone, r.arg, r.sous, r.objet);
    if (window.VAULT && VAULT.statutContexte().etat === "erreur") zone.prepend(UI.banniere("", "La plateforme de marque n’a pas pu être actualisée. Rechargez le dossier pour réessayer."));
    var titre = zone.querySelector("h1");
    document.title = (titre ? titre.textContent.trim() : (r.vue && r.vue.nom || "Plus")) + " · La Barre";
    if (change) {
      var position = history.state || {};
      var cible = Array.from(zone.querySelectorAll("a[href]")).find(function (a) { return a.hash === position.barreLien && a.getClientRects().length; });
      if (document.querySelector("dialog[open], .panneau[role=dialog]")) return;
      if (titre) titre.setAttribute("tabindex", "-1");
      (cible || titre || zone).focus({preventScroll:true});
      window.scrollTo(0, position.barreY || 0);
      if (position.barreRecherche) ouvrirRecherche(position.barreRecherche);
    } else if (!initial) {
      if (ancienFocus && !ancienFocus.isConnected && ancienFocus.id) {
        var remplace = document.getElementById(ancienFocus.id);
        if (remplace) remplace.focus({preventScroll:true});
      }
      window.scrollTo(0,y);
    }
  }

  /* ————————————————————— La démonstration —————————————————————
   *
   * Servie depuis vitrine/demo/, La Barre tourne sur une base fictive lue à
   * côté de sa page. Le dépôt n'y lit ni n'écrit rien d'autre (depot.js) ; la
   * coque le dit sur chaque écran. */

  function bandeauDemonstration() {
    var d = DEPOT.demonstration() || {};
    return el("details.demo-bandeau.lb-demo", {},
      el("summary", {}, el("strong", {}, "Démonstration — données fictives.")),
      el("p", {}, "Les changements sont effacés au rechargement.",
        d.vitrine ? el("a", { href: d.vitrine }, "Retour à la vitrine") : null));
  }

  /* La base fictive est un fichier JSON posé à côté de la page, et rien
   * d'autre : un nom simple, sans dossier. Elle ne peut donc désigner ni un
   * dépôt servi, ni un fichier hors de la démonstration. */
  function demarrerDemonstration() {
    var d = DEPOT.demonstration();
    var base = String(d.base || "");
    function dire(texte) { O.vider(corps); corps.appendChild(bandeauDemonstration()); corps.appendChild(el("p.demo-attente", {}, texte)); }
    if (!/^[a-z0-9][a-z0-9-]*\.json$/.test(base)) { dire("La base de démonstration n'est pas désignée."); return; }
    dire("Chargement de la démonstration…");
    fetch(base, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (lu) {
        DEPOT.poserDemonstration(lu);
        if (d.acteur && window.ACTEUR) ACTEUR.choisir(d.acteur);
        rendre();
      })
      .catch(function (e) { dire("La base de démonstration n'a pas pu être lue (" + (e && e.message) + ")."); });
  }

  function ecouter() {
    document.addEventListener("click", function (e) {
      var lien = e.target.closest("a[href^='#/']");
      if (!lien || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var recherche = lien.closest(".lb-resultats") ? {texte:lien.closest("dialog").querySelector("input").value, lien:lien.hash} : null;
      history.replaceState(Object.assign({}, history.state, {barreY:window.scrollY, barreLien:lien.hash, barreRecherche:recherche}), "");
    }, true);
    window.addEventListener("hashchange", function (e) {
      PANNEAU.fermer(); PANNEAU.fermerSur();
      document.querySelectorAll("dialog[open]").forEach(function (d) { if (d.dataset.route !== location.hash) d.close(); });
      if (!history.state && e.oldURL) history.replaceState({barreDepuis:new URL(e.oldURL).hash || "#/bureau"}, "");
      rendre();
    });
    document.addEventListener("keydown", function (e) {
      if (!(e.metaKey || e.ctrlKey) || segments()[0] === "partage" || document.querySelector("dialog[open], .panneau[role=dialog]")) return;
      var k = e.key.toLowerCase();
      if (k === "k") { e.preventDefault(); CAPTURE.ouvrir(); }

      if (k === "f") { e.preventDefault(); ouvrirRecherche(); }
    });
  }

  function demarrer() {
    corps = document.getElementById("corps");
    document.querySelector(".aller-contenu").addEventListener("click", function (e) {
      e.preventDefault(); (document.getElementById("contenu") || corps).focus();
    });

    /* La démonstration ne lit ni le cache, ni un manifeste, ni l'exemple, ni
     * le contexte de La Fusée : seulement sa base fictive. */
    if (DEPOT.estDemonstration()) { ecouter(); demarrerDemonstration(); return; }

    /* localStorage est propre à un navigateur : ouvrir la même adresse ailleurs
     * donnait un autre contenu, et l'exemple d'amorce l'emportait. La règle est
     * renversée — un dépôt de référence servi à côté de l'application gagne
     * toujours sur l'exemple, et deux navigateurs convergent d'eux-mêmes. */
    /* L'amorçage se raconte. Un écran qui montre l'exemple alors qu'un vrai
     * dépôt est servi à côté n'est pas un détail d'affichage : c'est le
     * titulaire qui travaille sur des données qui ne sont pas les siennes. */
    var journalAmorce = [];
    function noter(x) { journalAmorce.push(x); window.__amorcage = journalAmorce; }

    var local = DEPOT.charger();
    if (window.VAULT) {
      function actualiserReferences() {
        VAULT.initialiser(function () { var x = window.scrollX, y = window.scrollY; rendre(); window.scrollTo(x, y); });
      }
      actualiserReferences();
      window.addEventListener("pageshow", function (e) { if (e.persisted) actualiserReferences(); });
      document.addEventListener("visibilitychange", function () { if (!document.hidden) actualiserReferences(); });
    }
    var surExemple = local && AMORCE.present();
    noter("local=" + local + " surExemple=" + surExemple);

    if (local && !surExemple) DEPOT.rattacherAuFichier(function () { noter("rattaché"); actualiserReferences(); rendre(); });

    if (!local || surExemple) {
      DEPOT.referenceDisponible(function (m) {
        noter("manifeste=" + (m ? m.reference : "aucun"));
        if (!m) {
          /* Rien à côté : l'exemple fait office, et le dit. */
          if (!local) { AMORCE.poser(); rendre(); }
          return;
        }
        DEPOT.chargerReference(m, function (ok) {
          noter("référence chargée=" + ok);
          if (!ok && !local) AMORCE.poser();
          actualiserReferences(); rendre();
        });
      });
      if (!local) { AMORCE.poser(); noter("exemple posé en attendant"); }
    }

    ecouter();
    rendre();
  }

  function remplacerVue(lien) {
    history.replaceState(Object.assign({}, history.state, {barreY:0, barreLien:null, barreRecherche:null}), "", lien);
    rendre();
  }
  return { demarrer: demarrer, rendre: rendre, chercher: chercher, moi: moi, adresse: adresse, retour: retour,
    remplacerVue: remplacerVue };
})();

/* ————————————————————— La capture rapide ————————————————————— */

window.CAPTURE = (function () {
  var el = O.el;
  var ouvert = null;

  function ouvrir() {
    if (ouvert) return;
    var origine = document.activeElement;
    var champ = el("input", { id: "lb-note", type: "text", required: true, autocomplete: "off" });
    var pile = DEPOT.liste("captures").filter(function (c) { return !c.range; });
    var boite = el("dialog.lb-recherche.lb-capture", { "aria-labelledby":"lb-note-titre", "data-route":location.hash },
      el("header", {}, el("h2", {id:"lb-note-titre"}, "Prendre une note"),
        el("button", {type:"button", onclick:fermer, "aria-label":"Fermer la note"}, "×")),
      el("form", {onsubmit:function (e) {
        e.preventDefault();
        var texte = champ.value.trim();
        if (!texte) { champ.setCustomValidity("Saisissez votre note."); champ.reportValidity(); return; }
        DEPOT.ajoute("captures", {texte:texte, range:false}); fermer(); APP.rendre();
      }}, el("label", {for:"lb-note"}, "Note pour la boîte d’entrée"), champ,
      el("button.b.or", {type:"submit"}, "Enregistrer la note")),
      pile.length ? el("p", {}, pile.length + " en attente de rangement") : null);
    champ.addEventListener("input", function () { champ.setCustomValidity(""); });
    boite.addEventListener("close", function () {
      boite.remove(); ouvert = null;
      if (origine && origine.isConnected) origine.focus();
    }, {once:true});
    document.body.appendChild(boite); ouvert = boite; boite.showModal(); champ.focus();
  }

  function fermer() { if (ouvert) ouvert.close(); }

  return { ouvrir: ouvrir, fermer: fermer };
})();

document.addEventListener("DOMContentLoaded", function () { APP.demarrer(); });
