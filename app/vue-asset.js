/* vue-asset.js — l'écran de validation d'un asset.
 *
 * C'est l'écran le plus utilisé de tous, et il n'existait pas comme tel : une
 * livrable se jugeait dans un panneau à onglets où l'image était un détail.
 *
 * Ici il n'y a qu'une question — ce qui doit être posé l'est-il ? — et quatre
 * cases : l'asset, le BAT, la simulation, la mise en situation. Une case vide
 * n'est pas un trou : elle porte le brief de ce qu'on attend. Une case pleine
 * montre la version précédente et ce que le client en a dit.
 */

window.VUE_ASSET = (function () {
  var el = O.el;

  function ouvrir(p, l, rafraichir, mode) {
    onglet = mode || "poser";
    function apres() { PANNEAU.fermer(); ouvrir(p, l, rafraichir, onglet); if (rafraichir) rafraichir(); }
    PANNEAU.ouvrir(KV.titre(l), "V" + (l.version || 1), rendre(p, l, apres));
    DEPOT.lu("livrables", l.id);
  }

  /* Les vues d’un livrable séparent la création, son verdict et sa remise. */
  var ONGLETS = [
    { cle: "poser", nom: "Visuels et fichiers" },
    { cle: "juger", nom: "Critères et décision" },
    { cle: "origine", nom: "Versions et dépendances" },
    { cle: "remise", nom: "BAT et remise" },
  ];
  var onglet = "poser";
  /* La pièce dont le bloc des retours s'ouvre au prochain dessin, une fois. */
  var retoursOuverts = null;
  function retoursAOuvrir(l) {
    if (retoursOuverts !== l.id) return null;
    retoursOuverts = null;
    return true;
  }

  function page(p, l, apres, modeInitial, numero) {
    var mode = ONGLETS.some(function (x) { return x.cle === modeInitial; }) ? modeInitial : "poser";
    var zone = el("div.asset-page");
    function lien(cle, version) {
      if (version === undefined) version = numero;
      return "#/projets/" + encodeURIComponent(p.id) + "/livrables/" + encodeURIComponent(l.id)
        + "/" + cle + (version ? "/" + encodeURIComponent(version) : "");
    }
    function dessiner() {
      var projet = DEPOT.trouve("projets", p.id);
      var livrable = projet && (projet.livrables || []).find(function (x) { return x.id === l.id; });
      O.vider(zone);
      if (!livrable) { zone.appendChild(vide("Ce livrable n’est plus au dossier.")); return; }
      var courante = REMISE.versionCourante(livrable);
      var historique = numero && (!courante || String(courante.numero) !== String(numero));
      function rafraichir() {
        var reprendreFocus = zone.contains(document.activeElement);
        dessiner();
        if (reprendreFocus) {
          var cible = zone.querySelector(".rvp-action, .remise-suivi > button.b.or")
            || zone.querySelector(".rvp-etat, .remise-tete h3")
            || zone.querySelector(".onglet[aria-current]");
          if (cible) { if (cible.tabIndex < 0) cible.tabIndex = -1; cible.focus(); }
        }
        if (apres) apres();
      }
      zone.appendChild(historique ? archive(projet, livrable, numero, lien)
        : mode === "juger" ? revue(projet, livrable, courante, lien, rafraichir)
        : mode === "remise" ? remise(projet, livrable, lien, rafraichir)
        : rendre(projet, livrable, rafraichir, mode, lien));
    }
    dessiner();
    return zone;
  }

  function ongletLien(lien, mode, classe, nom, version) {
    var href = lien(mode, version);
    return el("a." + classe, { href: href, onclick: function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0 || !APP.remplacerVue) return;
      e.preventDefault(); APP.remplacerVue(href);
    } }, nom);
  }

  /* `ailleurs` : un autre onglet a écrit la validation de cette version, que
   * la base de cette page n'a pas encore. L'étiquette dit « Validé », comme
   * la ligne d'à côté, et pas « À examiner ». */
  function etatVerdict(v, enCours, ailleurs) {
    if (enCours) return UI.eti("Validation en cours", "vert");
    if (ailleurs) return UI.eti(MAISON.verdicts.find(function (x) { return x.cle === "approuve"; }).nom, "vert");
    var def = v && MAISON.verdicts.find(function (x) { return x.cle === v.verdict; });
    var ton = v && v.verdict === "approuve" ? "vert" : "attente";
    return def ? UI.eti(def.nom, ton) : v && v.verdict ? UI.eti("Décision enregistrée", "terne") : UI.eti("À examiner", "attente");
  }

  function mediaRevue(objet, nom) {
    var source = IMAGE.source(objet);
    if (!source) return el("p.rvp-visuel-vide", {}, "Aucun aperçu de cette version");
    var medium = IMAGE.media(Object.assign({}, objet, { nom: nom,
      vignette: IMAGE.estVideo(source) ? objet.vignette : source }), "planche");
    var image = medium.querySelector("img");
    if (image) image.addEventListener("error", function () {
      medium.replaceWith(el("p.rvp-visuel-vide", {}, "L’aperçu est indisponible."));
    }, { once: true });
    return medium;
  }

  /* La loupe posée sur l'image en cachait le coin bas à droite : celui où une
   * affiche porte sa signature ou son logo. Rien de l'interface ne se pose
   * plus sur la création : l'image s'agrandit d'un clic, et le bouton
   * « Agrandir le visuel » vit dans la barre des gestes, sous la décision. */
  function zoomable(objet) {
    var source = IMAGE.source(objet);
    return !!source && !IMAGE.estVideo(source);
  }

  function agrandir(objet, nom) {
    return function () { PANNEAU.ouvrir("Aperçu du visuel", nom, el("div.rvp-zoom", {}, mediaRevue(objet, nom))); };
  }

  function toile(objet, nom) {
    if (!zoomable(objet)) return el("figure.rvp-toile", {}, mediaRevue(objet, nom));
    var ouvrir = agrandir(objet, nom);
    return el("figure.rvp-toile.rvp-zoomable", { title: "Agrandir le visuel", onclick: function (e) {
      if (e.currentTarget.querySelector("img")) ouvrir();
    } }, mediaRevue(objet, nom));
  }

  function dossier(f) {
    try {
      var u = new URL(f.emplacement);
      if (u.protocol === "https:" && !u.username && !u.password)
        return el("a", { href: u.href, target: "_blank", rel: "noopener noreferrer" }, f.nom || "Document");
    } catch (e) { /* Les anciens chemins locaux restent lisibles dans le dossier. */ }
    return el("span", {}, f.nom || "Document");
  }

  function fichiersRevue(l, numero) {
    var docs = (l.fichiers || []).filter(function (f) { return Number(f.version || 1) === Number(numero); });
    if (!docs.length) return null;
    return el("ul.rvp-docs", {}, docs.map(function (f) { return el("li", {}, dossier(f)); }));
  }

  function archive(p, l, numero, lien) {
    var versions = (l.versions || []).filter(function (v) { return String(v.n || v.numero) === String(numero); });
    versions.reverse();
    var ancienne = versions.find(function (v) { return v.verdict; }) || versions[0];
    var media = versions.map(function (v) { return v.etat; }).find(IMAGE.source);
    var ouverture = ongletLien(lien, "juger", "b.rvp-action", "Voir le livrable actuel", null);
    if (!ancienne) return el("section.rvp-archive", {}, el("h2", {}, "Version introuvable"), ouverture);
    var motive = versions.find(function (v) { return v.close_le && v.motif; });
    var preuves = (p.preuvesRemise || []).filter(function (r) {
      return r && r.preuve && (r.pieces || []).some(function (x) { return x.id === l.id && String(x.version) === String(numero); });
    });
    return el("section.rvp-archive", {},
      el("h2", {}, "Version " + numero + " · historique"),
      el("div.rvp-plan", {},
        el("figure.rvp-toile", {}, mediaRevue(media, l.nom + " — V" + numero)),
        el("div.rvp-pupitre", {}, ancienne.verdict ? etatVerdict(ancienne) : el("p", {}, "Aucune décision enregistrée."),
          ancienne.juge_le ? el("p.rvp-meta", {}, O.joli(ancienne.juge_le)) : null,
          ancienne.motif ? el("p", {}, ancienne.motif) : null,
          ouverture)),
      fichiersRevue(l, numero),
      preuves.length ? el("details", {}, el("summary", {}, "Justificatifs de remise de la V" + numero),
        el("ul.rvp-docs", {}, preuves.map(function (r) {
          return el("li", {}, dossier({ nom: r.preuve.nom, emplacement: r.preuve.url }), " · ", r.id, " · ", O.joli(r.remis_le));
        }))) : null,
      motive && motive !== ancienne ? el("p.rvp-meta", {}, "Motif du passage à la version suivante « " + motive.motif + " »") : null);
  }

  function revue(p, l, version, lien, apres) {
    var v = version && version.objet;
    var numero = version ? version.numero : l.version || 1;
    var verdict = v && v.verdict;
    var lecture = !v || l.annule || p.fusionne || (window.CLOTURE && CLOTURE.est(p));
    var marche = l.marche && DEPOT.trouve("marches", l.marche);
    var b = p.sections.bigidea || {};
    var critere = (b.criteres || []).find(Boolean) || (REGLES.grille("livrable", l)[0] || {}).texte;
    var enCours = !lecture && !verdict && VUE_LIVRABLE.validationEnCours(l);
    var ailleurs = !lecture && !verdict && !enCours && VUE_LIVRABLE.valideeAilleurs(l, numero);
    var action = !lecture && !verdict ? VUE_LIVRABLE.decider(p, l, apres)
      : !lecture && verdict === "approuve" ? ongletLien(lien, "remise", "b.or.rvp-action", "Suivre le BAT et la remise") : null;
    var historique = Array.from(new Set((l.versions || []).map(function (ancienne) { return ancienne.n || ancienne.numero; })))
      .filter(function (n) { return n && Number(n) !== numero; }).reverse();
    var retours = retoursClient(p, l, apres, lecture, numero);
    var ouvrirRetours = retoursAOuvrir(l);
    var documents = fichiersRevue(l, numero);
    var annotation = !lecture && IMAGE.source(l) ? el("button.b.nu", { type: "button",
      onclick: function () { ANNOT.ouvrir(p, l, apres, numero); } }, "Annoter le visuel") : null;
    var titre = KV.titre(l) + " — V" + numero;
    var zoom = zoomable(l) ? el("button.b.nu", { type: "button", onclick: agrandir(l, titre) }, "Agrandir le visuel") : null;
    return el("div.rvp", {},
      el("div.rvp-plan", {},
        toile(l, titre),
        el("div.rvp-pupitre", {},
          el("div.rvp-portee", {},
            el("p.rvp-meta", {}, (marche ? marche.nom : "Marché non renseigné") + " · V" + numero),
            el("div.rvp-etat", { tabindex: "-1" }, verdict || !lecture ? etatVerdict(v, enCours, ailleurs)
              : UI.eti(v ? "Consultation" : "Version à soumettre", "terne"))),
          !verdict && critere ? el("p.rvp-critere", {}, critere) : null,
          action,
          verdict && v.motif ? el("p.rvp-motif", {}, v.motif) : null,
          !lecture && verdict ? VUE_LIVRABLE.changerDecision(p, l, version, apres) : null)),
      el("div.rvp-annexes", {},
        horsEcart(p, l, apres, lecture),
        !lecture && !verdict ? el("details", {}, el("summary", {}, "Critères et contrôles"), VUE_LIVRABLE.controles(p, l)) : null,
        retours ? el("details", { open: ouvrirRetours }, el("summary", {}, "Retours et annotations"), retours) : null,
        documents ? el("details", {}, el("summary", {}, "Documents de la V" + numero), documents) : null,
        historique.length ? el("details", {}, el("summary", {}, "Versions précédentes"),
          el("ul.rvp-docs", {}, historique.map(function (n) {
            return el("li", {}, ongletLien(lien, "juger", "rvp-lien", "Version " + n, n));
          }))) : null,
        el("nav.rvp-liens", { "aria-label": "Autres actions du livrable" }, zoom, annotation,
          ongletLien(lien, "poser", "b.nu", "Visuels et fichiers"),
          ongletLien(lien, "origine", "b.nu", "Origine et dépendances"))));
  }

  function remise(p, l, lien, apres) {
    return el("div.rvp.rvp-remise", {}, REMISE.suiviPiece(p, l, apres),
      el("nav.rvp-liens", { "aria-label": "Autres vues du livrable" },
        ongletLien(lien, "juger", "b.nu", "Revoir la décision"),
        ongletLien(lien, "poser", "b.nu", "Visuels et fichiers")));
  }

  function rendre(p, l, apres, mode, lien) {
    var courant = mode || onglet;
    function choisir(c) { onglet = c; apres(); }
    function naviguer(cle) {
      return function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0 || !APP.remplacerVue) return;
        e.preventDefault();
        APP.remplacerVue(lien(cle));
      };
    }
    /* Après un retour enregistré : l'onglet de la décision, son bloc de
     * retours ouvert. */
    function voirRetours() {
      retoursOuverts = l.id;
      if (lien && APP.remplacerVue) APP.remplacerVue(lien("juger")); else choisir("juger");
    }
    var navigation = lien ? el("nav.onglets", { "aria-label": "Vues du livrable" }, ONGLETS.map(function (o) {
      return el("a.onglet", { href: lien(o.cle), onclick: naviguer(o.cle), "aria-current": o.cle === courant ? "page" : null }, o.nom);
    })) : UI.onglets(ONGLETS, courant, choisir);
    var retours = courant === "juger" ? retoursClient(p, l, apres) : null;
    var ouvrirRetours = courant === "juger" ? retoursAOuvrir(l) : null;
    return el("div.as" + (courant === "juger" ? ".as-revue" : ""), {},
      entete(p, l, !!lien),
      horsEcart(p, l, apres),
      courant === "poser" ? bande(p, l, apres, voirRetours) : null,
      navigation,
      el("div", { style: { "margin-top": "1rem" } },
        courant === "poser" ? el("div", {}, cases(p, l, apres), packsMontres(p, l, apres), MOCKUP.bloc(p, l, apres))
          : courant === "juger" ? el("div", {}, VUE_LIVRABLE.criteres(p, l, apres, true),
              retours ? el("details", { open: ouvrirRetours }, el("summary", {}, "Retours client"), retours) : null,
              REMISE.etatPiece(l).cle !== "validation" ? (lien
                ? el("a.b.or", { href: lien("remise"), onclick: naviguer("remise") }, "Suivre le BAT et la remise")
                : el("button.b.or", { type: "button", onclick: function () { choisir("remise"); } }, "Suivre le BAT et la remise")) : null)
          : courant === "remise" ? REMISE.suiviPiece(p, l, apres)
          : el("div", {}, precedente(p, l) || vide("Une seule version : rien n'a encore été repris."),
              VUE_LIVRABLE.dependances(p, l, apres))),
      courant === "poser" ? gestes(p, l, apres) : null
    );
  }

  function vide(t) { return el("p.rien", {}, t); }

  /* Ce qu'on voit avant de juger : le livrable, son niveau, son marché, son état.
   * Sur la page, le code est déjà en surtitre : la ligne d'infos ne le redit pas. */
  function entete(p, l, surPage) {
    var m = DEPOT.trouve("marches", l.marche);
    var s = DEPOT.trouve("supports", l.support);
    var resp = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    var piste = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    var pr = window.PRIORITE && piste ? PRIORITE.def(PRIORITE.etat(piste)) : null;

    return el("div.as-tete", {},
      el("div.ast-v", {}, IMAGE.vignette(l, "planche")),
      el("div.ast-c", {},
        el("div.ast-n", {}, KV.titre(l)),
        el("div.ast-m", {},
          !surPage && KV.surtitre(l) ? el("span", {}, KV.surtitre(l)) : null,
          UI.eti(KV.NIVEAUX[KV.niveau(l)].nom, "terne"),
          m ? el("span", {}, UI.drapeau(m), " ", m.nom) : null,
          s ? el("span", {}, s.nom) : null,
          el("span", {}, "V" + (l.version || 1)),
          pr ? UI.eti(pr.nom, pr.ton) : null),
        el("div.ast-r", {},
          resp ? UI.avatar(resp, 22) : UI.avatar(null, 22),
          el("span", {}, resp ? resp.nom : "Sans responsable"),
          piste ? el("span", {}, "piste « " + piste.titre + " »") : el("span.alerte", {}, "Hors piste")),
        original(l)
      ));
  }

  /* Le fichier original, dans l'export : il s'ouvre sur cette machine, il ne part
   * jamais en ligne (en ligne, l'image vient du proxy compressé). */
  function original(l) {
    var d = window.DISQUE ? DISQUE.depuisOrigine((l.releve || {}).origine_disque) : null;
    if (!d) return null;
    return el("div.ast-r.ast-o", {}, el("span", {}, "Original"),
      DISQUE.local
        ? [el("button.studio-lien", { type: "button", onclick: function () { DISQUE.ouvrir(d, false); } }, "Ouvrir"),
           el("button.studio-lien", { type: "button", onclick: function () { DISQUE.ouvrir(d, true); } }, "Dans le Finder")]
        : el("span", {}, "au disque de l'agence"));
  }

  /* Une adaptation qui change ce que son marché n'a pas prévu : elle se valide
   * comme les autres — rien ne la bloque —, et la question est posée en clair à
   * côté (ecarts-marche.js) : autoriser pour ce marché, ou faire corriger. */
  function horsEcart(p, l, apres, lecture) {
    var x = window.ECARTS_MARCHE ? ECARTS_MARCHE.etiquette(p, l) : null;
    if (!x) return null;
    if (lecture) return el("p.rvp-meta", {}, x.texte);
    /* Le bandeau est le bouton qui ouvre le choix : il le dit (« Décider › »),
     * sur téléphone aussi, où rien ne se survole. */
    return el("button.plc-hors.as-hors", { type: "button",
      onclick: function () { ECARTS_MARCHE.revoir(p, l, apres); } },
      el("span.plch-q", {}, x.texte),
      el("span.plch-x", {}, x.revue ? "Correction demandée : la décli revient à ce qui était prévu."
        : x.question),
      el("span.plch-a", {}, x.revue ? "Revoir" : "Décider", el("span", { "aria-hidden": "true" }, " ›")));
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(p, l, apres, voirRetours) {
    return UI.recevabilite("Que manque-t-il pour produire ?",
      PRODUCTION.porte(p, l), null,
      [
        /* Poser, c'est choisir le fichier : le sélecteur s'ouvre tout de
         * suite. Décrire un fichier resté sur le Drive reste possible, en
         * second. */
        { nom: "Poser un fichier", fort: true, quand: function () { IMAGE.importer(l, apres); } },
        { nom: "Décrire un fichier sans le déposer", doux: true, quand: function () { PRODUCTION.ajouter(p, l, apres); } },
        { nom: "Enregistrer un retour", quand: function () { FEEDBACK.ouvrir(p.id, [l.id], apres, voirRetours); } },
        { nom: "Nouvelle version", doux: true, quand: function () {
            VERSION.nouvelle(l, l.nom, apres, { perime: function () { return KV.descendance(p, l.id); } });
          } },
      ]);
  }

  /* ————————————————————— La porte ————————————————————— */

  /* Quatre cases côte à côte disaient quatre choses égales et simultanées. Ce
   * n'en est pas une : c'est un passage, avec un ordre, et surtout une ligne
   * au-delà de laquelle on ne revient pas. Le BAT signé engage l'agence sur
   * l'erreur d'impression — ça ne peut pas avoir la même forme qu'une vignette
   * de présentation. On dessine donc la porte : les étages franchis se réduisent
   * à une ligne, celui où l'on est occupe la place, et ceux d'après sont fermés
   * en disant par quoi. */
  /* « Le BAT » est un acronyme : le passer en minuscules donne « le bat », qui
   * ne veut plus rien dire. On retire l'article, on ne touche pas au reste. */
  function nu(nom) { return String(nom).replace(/^(Le |La |L')/, ""); }
  function minuscule(nom) { return String(nom).charAt(0).toLowerCase() + String(nom).slice(1); }

  function cases(p, l, apres) {
    var piste = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    var retenue = piste && piste.statut === "retenue";

    /* Les étages, dans l'ordre de franchissement. Ce que le support ne demande
     * pas ne fait pas partie du passage — mais un fichier posé quand même y
     * reste : il existe, on ne l'efface pas de l'écran. */
    var tous = PRODUCTION.etages(l).sort(function (x, y) { return x.def.rang - y.def.rang; });
    var et = tous.filter(function (e) { return e.exige || e.n; });
    var horsSujet = tous.filter(function (e) { return !e.exige && !e.n; });

    /* Où je suis : le premier étage exigé qui n'est pas franchi. */
    var ici = -1;
    et.forEach(function (e, i) { if (ici === -1 && e.exige && !e.ok) ici = i; });

    return el("div.pt", {},
      cadre(p, l, piste, retenue, et, ici),
      el("div.pt-p", {}, et.map(function (e, i) {
        return el("div.pt-e", {},
          e.def.signable && !e.ok ? ligne() : null,
          i < ici || (!e.exige && e.n) ? franchi(p, l, e, apres)
            : i === ici ? ouvert(p, l, e, apres, retenue)
            : e.ok ? franchi(p, l, e, apres)
            : ferme(l, e, et[i - 1]));
      })),
      /* Énumérer quatre absences n'apprend rien. Ce qui compte, c'est ce que
       * le support épargne : un seul étage veut dire que rien ne part en
       * fabrication, donc que rien n'est irréversible. */
      horsSujet.length
        ? el("p.pt-hs", {}, et.filter(function (e) { return e.exige; }).length === 1
            ? "Une seule étape sur ce support : rien ne part en fabrication, "
              + "donc rien ne devient irréversible."
            : horsSujet.length === 1
              ? "Ce support ne demande pas de " + nu(horsSujet[0].def.nom) + "."
              : "Ce support n'en demande pas plus : ni "
                + horsSujet.map(function (e) { return nu(e.def.nom); }).join(", ni ") + ".")
        : null
    );
  }

  /* Le chambranle. Un livrable qui ne vient d'aucune piste arbitrée n'a pas de
   * porte à franchir : elle n'a pas de mur autour. */
  function cadre(p, l, piste, retenue, et, ici) {
    var exiges = et.filter(function (e) { return e.exige; });
    var faits = exiges.filter(function (e) { return e.ok; }).length;

    return el("div.pt-c" + (retenue ? "" : ".hors"), {},
      el("div.ptc-t", {}, "Avant le départ"),
      el("div.ptc-n", {}, faits + " sur " + exiges.length,
        el("span", {}, faits === exiges.length
          ? "tout est prêt : le livrable peut partir"
          : O.pluriel(exiges.length - faits, "étape reste à faire", "étapes restent à faire"))),
      retenue
        ? el("div.ptc-r", {}, "Sur la piste « " + piste.titre + " », arbitrée et retenue.")
        : el("div.ptc-r", {}, piste
            ? "La piste « " + piste.titre + " » n'a pas été arbitrée. Produire ici, "
              + "c'est parier — et si elle tombe, tout ce qui est posé tombe avec elle."
            : "Ce livrable n'est rattaché à aucune piste : elle ne vient de nulle part, "
              + "et rien ne dira pourquoi elle a été faite.")
    );
  }

  /* La ligne de non-retour, tracée en travers du passage juste avant l'étage
   * qui engage. C'est le seul endroit du produit où le coût est irréversible. */
  function ligne() {
    return el("div.pt-l", {},
      el("span.ptl-t", {}, "Au-delà de cette ligne, l'erreur est pour l'agence"),
      el("span.ptl-s", {}, "Un BAT signé part en fabrication — aucune correction sans tout refaire."));
  }

  /* Un étage franchi n'a plus besoin de place : son fichier, son emplacement,
   * et de quoi le remplacer. */
  function franchi(p, l, e, apres) {
    return el("div.pt-f", {},
      el("div.ptf-h", {},
        el("span.ptf-c", {}, "✓"),
        el("span.ptf-n", {}, e.def.nom),
        el("span.ptf-q", {}, e.n + (e.n > 1 ? " fichiers" : " fichier")),
        !e.exige ? el("span.ptf-x", {}, "posé sans être demandé ici") : null),
      el("div.ptf-fs", {}, e.fichiers.map(function (f) {
        return el("div.ptff", {},
          el("span.ptff-n", {}, f.nom),
          el("span.ptff-m", {}, (f.emplacement || "Emplacement non dit")
            + (f.signataire ? " · signé " + f.signataire : e.def.signable ? " · non signé" : "")),
          el("button.b.nu", { type: "button", onclick: function () {
            if (!window.confirm("Retirer « " + f.nom + " » ?")) return;
            PRODUCTION.retirer(l, f.id); DEPOT.enregistrer(); apres();
          } }, "Retirer"));
      })),
      e.cle === "situation" && (l.mockups || []).length
        ? el("div.ptf-v", {}, (l.mockups || []).slice(0, 3).map(function (mk) {
            return el("div.ptfv", {}, IMAGE.vignette(mk, "planche"),
              el("span", {}, mk.contexte || "Sans contexte"));
          }))
        : null,
      el("div.ptf-a", {},
        el("button.b.nu", { type: "button",
          onclick: function () { IMAGE.importer(l, apres, e.cle); } }, "+ Remplacer"),
        decrire(p, l, apres)));
  }

  /* Le second geste de chaque étage : dire où est un fichier qu'on ne dépose
   * pas (un master sur le Drive, un lien de transfert). */
  function decrire(p, l, apres) {
    return el("button.studio-lien", { type: "button",
      onclick: function () { PRODUCTION.ajouter(p, l, apres); } }, "Décrire un fichier sans le déposer");
  }

  /* L'étage où l'on est. C'est le seul qui prend de la place, et il porte tout
   * ce qu'il faut pour le franchir sans aller chercher ailleurs. */
  function ouvert(p, l, e, apres, retenue) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var g = s && m ? (s.gabarits || {})[m.id] : null;

    return el("div.pt-o" + (e.def.signable ? ".dur" : ""), {},
      el("div.pto-h", {},
        el("span.pto-i", {}, "Vous êtes ici"),
        el("span.pto-n", {}, e.def.nom),
        el("span.pto-e", {}, e.def.ext)),

      el("div.pto-b", {},
        el("div.ptob", {}, el("b", {}, "Ce qu'on attend"), e.def.quoi),
        el("div.ptob", {}, el("b", {}, "Pour qui"), e.def.pour),
        el("div.ptob", {}, el("b", {}, "Format"), g && g.dimensions
          ? g.dimensions + (g.fond_perdu ? " · fond perdu " + g.fond_perdu : "")
          : el("i", {}, "Gabarit " + (s ? s.nom : "ce support") + (m ? " · " + m.code : "")
              + " non renseigné — le fichier partira sans qu'on ait vérifié sa taille")),
        m ? el("div.ptob", {}, el("b", {}, "Langue"),
              (m.langues || []).map(O.langue).join(", ")) : null),

      el("button.pto-z", { type: "button",
        onclick: function () { IMAGE.importer(l, apres, e.cle); } },
        el("span.ptoz-p", {}, "+"),
        el("span.ptoz-t", {}, "Poser " + minuscule(e.def.nom))),
      decrire(p, l, apres),

      el("div.pto-c", {}, el("b", {}, "Sans lui"), PRODUCTION.coutDe(l, e.cle)),
      !retenue && e.def.signable
        ? el("div.pto-a", {}, "Et la piste n'est pas arbitrée : ce serait signer un bon "
            + "à tirer sur une idée que personne n'a retenue.")
        : null);
  }

  /* Un étage fermé dit par quoi il est fermé. « Pas encore » n'apprend rien ;
   * « le BAT n'est pas posé » se corrige. */
  function ferme(l, e, avant) {
    return el("div.pt-x", {},
      el("span.ptx-c", {}, "·"),
      el("span.ptx-n", {}, e.def.nom),
      el("span.ptx-q", {}, avant && !avant.ok
        ? "Fermé — " + minuscule(avant.def.nom) + " n'est pas pos" + (avant.def.f ? "ée" : "é")
        : "À venir"),
      el("span.ptx-o", {}, PRODUCTION.coutDe(l, e.cle)));
  }


  /* ————————————————————— Les packs montrés ————————————————————— */

  /* Un livrable montre des produits. Lesquels, ça ne se devine pas — et c'est le
   * seul endroit d'où l'on peut voir qu'un pack apparaît sur un marché qui ne
   * le vend pas. Le catalogue proposé est celui de la marque du livrable, et
   * d'aucune autre. */
  function packsMontres(p, l, apres) {
    var cat = VAULT.proposables(l);
    var choisis = VAULT.packsDe(l);
    var z = VAULT.packsHorsZone(l);
    var m = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var mq = l.marqueId ? DEPOT.trouve("marques", l.marqueId) : null;

    if (!l.marqueId) {
      return el("div.pm", {},
        el("div.pm-t", {}, "Les packs montrés"),
        el("p.pm-x", {}, "Ce livrable n'est rattaché à aucune marque : on ne peut "
          + "lui proposer aucun catalogue, et rien ne dira si elle montre un produit "
          + "qui n'est pas vendu ici."));
    }

    return el("div.pm" + (z.hors.length ? ".alerte" : ""), {},
      el("div.pm-t", {}, "Les packs montrés",
        el("span", {}, choisis.length + " sur " + cat.length
          + " · catalogue " + (mq ? mq.nom : ""))),

      /* Le contrôle qui vaut le plus cher. */
      z.hors.length
        ? el("div.pm-h", {},
            el("span.pmh-t", {}, z.hors.length
              + (z.hors.length > 1 ? " packs ne sont pas distribués" : " pack n'est pas distribué")
              + (m ? " sur " + m.nom : " sur ce marché")),
            el("span.pmh-x", {}, z.hors.map(function (s) { return s.nom; }).join(" · ")
              + " — un livrable qui montre un produit qu'on n'y vend pas se rappelle, "
              + "et le rappel est pour l'agence."))
        : null,

      z.muets.length
        ? el("div.pm-m", {}, z.muets.length
            + (z.muets.length > 1 ? " packs ne disent pas où ils sont distribués"
                                  : " pack ne dit pas où il est distribué")
            + " : le contrôle ne peut pas se faire. À renseigner sur leur fiche.")
        : null,

      /* Les packs retenus restent sous les yeux ; le catalogue se replie. Une
       * marque en porte cinquante : les étaler, c'est enterrer la fiche sous
       * un rayon. Le titre du repli nomme le geste. */
      cat.length && choisis.length
        ? el("div.pm-l", {}, choisis.map(function (s) { return pack(s); }))
        : null,
      cat.length
        ? el("details.pm-cat", {},
            el("summary.pmc-t", {}, choisis.length ? "Changer les packs montrés" : "Choisir les packs montrés",
              el("span", {}, cat.length + (cat.length > 1 ? " packs au catalogue" : " pack au catalogue"))),
            el("div.pm-l", {}, cat.map(function (s) { return pack(s); })))
        : el("p.pm-x", {}, "Le catalogue de " + (mq ? mq.nom : "cette marque")
            + " est vide. Un pack se crée à la bibliothèque de marque.")
    );

    function pack(s) {
      var ici = choisis.some(function (x) { return x.id === s.id; });
      var hors = ici && z.hors.some(function (x) { return x.id === s.id; });
      return el("button.pmp" + (ici ? ".ici" : "") + (hors ? ".hors" : ""), {
        type: "button",
        title: (s.marches || []).length
          ? "distribué sur " + (s.marches || []).map(function (id) {
              var x = DEPOT.trouve("marches", id); return x ? x.code : id; }).join(", ")
          : "marchés de distribution non renseignés",
        onclick: function () {
          VAULT.basculerPack(l, s.id); DEPOT.enregistrer(); apres();
        } },
        s.vignette ? el("span.pmp-v", {}, el("img", { src: s.vignette, alt: s.nom })) : null,
        el("span.pmp-n", {}, s.nom),
        el("span.pmp-m", {}, [s.format, s.variante].filter(Boolean).join(" · ")
          || "À qualifier"));
    }
  }

  /* ————————————————————— Ce que le client en a dit ————————————————————— */

  function retoursClient(p, l, apres, lecture, numero) {
    var fbs = FEEDBACK.duProjet(p.id).filter(function (f) {
      return FEEDBACK.impact(f).pieces.some(function (x) { return x.id === l.id; });
    });
    var annots = ANNOT.liste(l, numero);
    if (!fbs.length && !annots.length) return null;

    return el("div.as-bloc", {},
      el("div.asb-t", {}, "Ce que le client en a dit",
        el("span", {}, O.pluriel(fbs.length + annots.length, "retour"))),

      fbs.map(function (f) {
        var i = FEEDBACK.impact(f);
        /* Un retour relevé ailleurs (Matanga People) peut arriver sans issue :
         * il est alors non traité, pas illisible. */
        var iss = FEEDBACK.ISSUES[f.issue] || FEEDBACK.ISSUES.ouvert;
        return el("div.as-fb" + (iss.ton ? "." + iss.ton : ""), {},
          el("div.asfb-t", {}, f.texte),
          el("div.asfb-m", {},
            el("span", {}, FEEDBACK.nomAuteur(f.auteur)),
            el("span", {}, O.joli(f.quand)),
            el("span", {}, (FEEDBACK.CANAUX[f.canal] || { nom: f.canal || "Canal non dit" }).nom),
            el("span", {}, i.assets + (i.assets > 1 ? " livrables touchés" : " livrable touché")),
            UI.eti(iss.nom, iss.ton)),
          f.issue === "ouvert" && !lecture
            ? el("button.b.nu", { type: "button", onclick: function () { FEEDBACK.trancher(f, apres); } }, "Décider")
            : f.motif ? el("div.asfb-mo", {}, f.motif) : null);
      }),

      annots.length && !lecture
        ? el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); ANNOT.ouvrir(p, l, apres, numero); } },
            O.pluriel(annots.length, "point posé", "points posés") + " sur le visuel →")
        : null
    );
  }

  /* ————————————————————— La version précédente ————————————————————— */

  function precedente(p, l) {
    var h = VERSION.historique(l);
    if (!h.length) return null;
    var d = h[h.length - 1];
    /* Une version reçue sans motif de clôture (une simple soumission) n'a pas
     * d'origine : on n'écrit pas « Fermée par : undefined », on se tait. */
    var o = VERSION.ORIGINES[d.origine] || { nom: d.origine };

    return el("div.as-bloc", {},
      el("div.asb-t", {}, "La version précédente", el("span", {}, "V" + d.n)),
      el("div.as-prec", {},
        d.etat && d.etat.avaitVisuel
          ? el("div.asp-v", {}, el("span", {}, "Le visuel de la V" + d.n + " n'est pas conservé — seul le dernier l'est."))
          : null,
        el("div.asp-c", {},
          o.nom ? el("div.aspc-o", {}, "Fermée par : " + o.nom) : null,
          d.motif ? el("div.aspc-m", {}, d.motif) : null,
          d.close_le ? el("div.aspc-q", {}, O.joli(d.close_le)) : null,
          d.etat && d.etat.kv && d.etat.kv.copy
            ? el("div.aspc-d", {}, "Accroche d'alors : « " + d.etat.kv.copy + " »")
            : null)
      ),
      VERSION.fil(l, l.toursVendus));
  }

  function gestes(p, l, apres) {
    return el("div.form-actions", { style: { "margin-top": "1.2rem" } },
      IMAGE.bouton(l, apres),
      el("button.b", { type: "button", onclick: function () { PANNEAU.fermer(); ANNOT.ouvrir(p, l, apres); } }, "Annoter"),
      el("button.b", { type: "button", onclick: function () { MOCKUP.ajouter(p, l, apres); } }, "Mise en situation"),
      el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); VUE_LIVRABLE.ouvrir(p, l, apres); } },
        "Fiche complète")
    );
  }

  return { ouvrir: ouvrir, rendre: rendre, page: page };
})();
