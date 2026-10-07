/* vue-reglages.js — un avertissement, puis des réglages.
 *
 * Il n'y a qu'une urgence ici, et elle vaut tout le reste : vider les données
 * du navigateur détruirait trois mois de travail. Tant que le dépôt n'est pas
 * sorti, cette phrase occupe le premier tiers de l'écran. Le reste — les
 * règles, l'équipe, le journal — est calme par construction.
 */

window.VUE_REGLAGES = (function () {
  var el = O.el;
  var vueActive = null;
  DEPOT.surChangement(function () {
    if (vueActive && vueActive.repere.isConnected) rendre(vueActive.hote);
  });

  function cheminLisible(chemin) {
    var noms = { projets: "Projets", marques: "Marques", campagnes: "Campagnes",
      brief: "Brief", nom: "Nom", titre: "Titre", budget: "Budget", cible: "Cible",
      deadline: "Échéance", responsable: "Responsable", livrables: "Livrables",
      statut: "Statut", journal: "Journal", lectures: "Lectures", sections: "Cadrage",
      briefback: "Brief-back", compris: "Ce que nous avons compris",
      propose: "Ce que nous proposons de produire", ecart: "Écart avec la demande", "$ordre": "Ordre des éléments" };
    var courant = DEPOT.tout();
    return chemin.map(function (part) {
      if (Array.isArray(courant)) {
        courant = courant.find(function (x) { return x.id === part; });
        return courant && (courant.nom || courant.titre || courant.quoi) || part;
      }
      courant = courant && courant[part];
      return noms[part] || part.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    }).join(" · ");
  }
  function valeurLisible(v, present) {
    if (!present) return "Élément retiré";
    if (v === null || v === "") return "Non renseigné";
    return typeof v === "string" ? v : JSON.stringify(v, null, 2);
  }
  function rapprochement(hote) {
    var conflits = DEPOT.conflits();
    if (!conflits.length) return;
    var choix = {}, bouton = el("button.b.or", { type: "button", disabled: true,
      onclick: function () {
        if (!DEPOT.resoudre(choix)) { AVIS.refus("Choisissez une version pour chaque champ."); return; }
        AVIS.fait("Choix conservés. Sauvegarde en cours.");
        rendre(hote);
      } }, "Conserver ces choix et sauvegarder");
    hote.appendChild(el("section.groupe", { "aria-label": "Rapprocher les modifications" },
      el("h2", {}, "Rapprocher les modifications"),
      el("p", {}, "Les deux versions sont conservées. Les changements sur des champs différents seront réunis ; choisissez uniquement pour ces divergences."),
      conflits.map(function (c) {
        var nom = cheminLisible(c.chemin);
        var select = el("select", { "aria-label": "Version pour " + nom, onchange: function () {
          if (select.value) choix[c.cle] = select.value; else delete choix[c.cle];
          bouton.disabled = Object.keys(choix).length !== conflits.length;
        } },
          el("option", { value: "" }, "Choisir la version à conserver"),
          el("option", { value: "ici" }, "Ma modification"),
          el("option", { value: "distant" }, "Version reçue ailleurs"));
        return el("div.reglage", {},
          el("h3", {}, nom),
          el("p", {}, el("strong", {}, "Ma modification : "), valeurLisible(c.ici, c.iciPresent)),
          el("p", {}, el("strong", {}, "Version reçue ailleurs : "), valeurLisible(c.distant, c.distantPresent)),
          select);
      }), bouton));
  }

  function rendre(hote) {
    var age = DEPOT.ageSauvegarde();

        O.vider(hote);
    var repere = el("span", { hidden: true });
    hote.appendChild(repere); vueActive = { hote: hote, repere: repere };

    /* L'avertissement d'abord, et en grand tant qu'il est vrai. */
    var pds = DEPOT.poids();
    var risque = pds.fichier ? !pds.surDisque : age === null || age > 2;
    var n = DEPOT.liste("projets").length;
    var pcs = DEPOT.liste("projets").reduce(function (t, p) {
      return t + (p.livrables || []).filter(function (l) { return !l.annule; }).length; }, 0);
    var infs = DEPOT.liste("projets").reduce(function (t, p) {
      return t + (window.INFERENCE ? INFERENCE.compte(p) : 0); }, 0);

    hote.appendChild(el("div.rg-tete" + (risque ? ".risque" : ".sain"), {},
      el("div.rgt-c", {},
        el("div.rgt-h", {}, risque ? "⚠" : "✓"),
        el("div", {},
          el("h2", {}, pds.fichier ? (pds.surDisque ? "Sauvegarde reçue" : "Sauvegarde en attente")
            : age === null ? "La base n'a jamais été exportée"
            : risque ? "Dernier export il y a " + age + (age > 1 ? " jours" : " jour")
            : "La base est à jour"),
          el("p.rgt-q", {}, pds.fichier
            ? (pds.surDisque ? "Le fichier partagé a reçu votre travail." : "Les gestes non reçus sont conservés dans ce navigateur. Une divergence se règle ci-dessous.")
            : risque
            ? "Vider les données du navigateur détruirait tout : " + n
              + (n > 1 ? " dossiers, " : " dossier, ") + pcs + " livrables, " + infs + " inférences."
            : "Exporté il y a " + age + (age > 1 ? " jours" : " jour") + ". Le fichier sur le Drive fait foi."),
          el("p.rgt-s", {}, pds.fichier
            ? "Les sauvegardes sont automatiques. L’export reste une copie que vous pouvez emporter."
            : "Le navigateur n'en garde qu'un cache. Import à l'ouverture, export à la fermeture."))),
      el("div.rgt-g", {},
        el("button.b.or", { type: "button", onclick: function () {
          DEPOT.exporter(); DEPOT.noterExport(); rendre(hote); } }, "Exporter la base →"),
        el("button.b.nu", { type: "button", onclick: function () { importer(hote); } },
          "Importer un fichier"),
        pds.fichier && !pds.surDisque && !DEPOT.conflits().length
          ? el("button.b", { type: "button", onclick: function () {
              DEPOT.relire(pds.fichier, function (ok) {
                if (ok) DEPOT.ecrireSurDisque(function (recu) {
                  if (recu) AVIS.fait("Sauvegarde reçue.");
                  rendre(hote);
                }); else AVIS.refus("La base reste indisponible. Votre brouillon est conservé ici.");
              });
            } }, "Réessayer la sauvegarde") : null),
      el("div.rgt-j", {},
        el("i", { style: { width: Math.min(100, pds.part) + "%" } }),
        el("span", {}, pds.mo + " Mo sur 5 Mo · plafond du navigateur"))
    ));
    rapprochement(hote);
    var reprises = DEPOT.reprisesDisponibles();
    if (reprises.length) hote.appendChild(el("section.groupe", { "aria-label": "Autres brouillons conservés" },
      el("h2", {}, "Autres brouillons conservés"),
      el("p", {}, "Ces gestes proviennent d’un autre onglet. Ils restent disponibles après sa fermeture. Reprenez-les lorsque le travail ouvert est sauvegardé."),
      reprises.map(function (r) {
        return el("button.b", { type: "button", disabled: !pds.surDisque,
          onclick: function () { DEPOT.reprendre(r.cle); } }, (r.ancien ? "Rapprocher l’ancien cache conservé le " : "Reprendre le brouillon du ") + new Date(r.quand).toLocaleString("fr-FR"));
      })));

    hote.appendChild(el("div.groupe", {},
      el("div.section-titre", {}, "Le poste de travail"),
      el("div.reglages", {},
        choixActeur(),
        el("div.reglage", {},
          el("h4", {}, "Le jeu d'exemple"),
          el("p", {}, AMORCE.present()
            ? "MT-0020 est chargé, avec ses trous : identité à 4 champs sur 9, porte B non arbitrée."
            : "Aucun exemple chargé."),
          AMORCE.present()
            ? el("button.b", { type: "button", onclick: function () {
                if (!confirm("Vider l'exemple et repartir sur une application propre ?")) return;
                DEPOT.reinitialiser(); rendre(hote);
              } }, "Vider l'exemple")
            : el("button.b", { type: "button", onclick: function () { AMORCE.poser(); rendre(hote); } }, "Recharger l'exemple")
        ),
        el("div.reglage", {},
          el("h4", {}, "Mes règles"),
          el("p", {}, "Ce que je refuse de recevoir, et ce que « fini » veut dire."),
          el("div.form-actions", {},
            el("button.b", { type: "button", onclick: conditions }, "Conditions de réception"),
            el("button.b", { type: "button", onclick: reglesFini }, "Définitions de fini"))
        ),
        el("div.reglage", {},
          el("h4", {}, "L'équipe"),
          el("p", {}, DEPOT.liste("personnes").length + " personnes · "
            + DEPOT.liste("personnes").filter(function (p) { return (p.casquettes || []).length; }).length + " en cumul déclaré"),
          el("button.b", { type: "button", onclick: function () { equipe(hote); } }, "Voir et modifier")
        )
      )
    ));

    hote.appendChild(el("div.groupe", {},
      el("div.section-titre", {}, "Journal", el("span.droite", {}, "les cent dernières traces")),
      el("div.journal", {}, DEPOT.journal().slice(0, 100).map(function (l) {
        return el("div.journal-l", {},
          el("span.h", {}, O.jolieHeure(l.quand) + " " + O.joli(l.quand)),
          el("span.a", {}, l.action || l.quoi || "—"),
          el("span", {}, (l.type || l.objet ? (l.type || l.objet) + "  ·  " : "")
            + (l.detail || l.id || "")));
      }))
    ));
  }

  function choixActeur() {
    var p = ACTEUR.personne();
    var choix = el("select", { "aria-label": "Personne qui travaille ici", onchange: function () {
      if (!ACTEUR.choisir(choix.value)) { AVIS.refus("Le choix n’a pas pu être conservé dans cet onglet."); return; }
      if (window.APP) APP.rendre();
    } }, el("option", { value: "" }, "Poste " + O.poste(MAISON.titulaire).court + " — personne non précisée"));
    DEPOT.liste("personnes").filter(function (x) { return !x.archive; }).forEach(function (x) {
      choix.appendChild(el("option", { value: x.id, selected: p && p.id === x.id ? true : null }, x.nom));
    });
    return el("div.reglage", {}, el("h4", {}, "Qui travaille ici"),
      el("p", {}, "Les gestes sont attribués à cette personne dans cet onglet. Ses postes cumulés sont pris en compte."),
      choix, el("p.indice", {}, "Postes : " + ACTEUR.postes().map(function (x) { return O.poste(x).court; }).join(" · ")));
  }

  function importer(hote) {
    var entree = document.createElement("input");
    entree.type = "file";
    entree.accept = "application/json,.json";
    entree.addEventListener("change", function () {
      var f = entree.files[0];
      if (!f) return;
      var lecteur = new FileReader();
      lecteur.onload = function () {
        try {
          DEPOT.importer(String(lecteur.result));
          AVIS.refus("Base importée.");
          rendre(hote);
        } catch (e) { AVIS.refus("Import impossible : " + e.message); }
      };
      lecteur.readAsText(f);
    });
    entree.click();
  }

  function conditions() {
    PANNEAU.ouvrir("Conditions de réception", "ce que je refuse de recevoir sans", el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Ce qui arrive incomplet arrive avec la liste de ce qui manque déjà écrite, prête à renvoyer."),
      PANNEAU.sousbloc("Un brief", PANNEAU.puces(MAISON.criteresDe("brief").map(function (c) { return "Refusable si : " + c.toLowerCase(); }))),
      PANNEAU.sousbloc("Une big idea", PANNEAU.puces(MAISON.criteresDe("bigidea").map(function (c) { return "Refusable si : " + c.toLowerCase(); }))),
      PANNEAU.sousbloc("Une proposition créative", PANNEAU.puces(MAISON.criteresDe("proposition").map(function (c) { return "Refusable si : " + c.toLowerCase(); }))),
      PANNEAU.sousbloc("Un livrable", PANNEAU.puces(MAISON.criteresDe("livrable").map(function (c) { return "Refusable si : " + c.toLowerCase(); })))
    ));
  }

  function reglesFini() {
    PANNEAU.ouvrir("Définitions de fini", "par type de livrable", el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Sans définition de fini, « taux de livrables validés sans reprise » n'a pas de dénominateur."),
      Object.keys(MAISON.definitionsFini).map(function (k) {
        return PANNEAU.sousbloc(k, PANNEAU.puces(MAISON.definitionsFini[k]));
      })
    ));
  }

  function equipe(hote) {
    var corps = el("div", {}, el("button.b.or", { type: "button", onclick: function () { editerPersonne(null, hote); } }, "Ajouter une personne"),
      DEPOT.liste("personnes").map(function (p) {
      var charge = 100 + (p.casquettes || []).reduce(function (s, c) { return s + (c.part || 0); }, 0);
      return el("div.attente-l", { style: { "--dir": O.poste(p.poste).couleur } },
        el("div.tete", {},
          el("b", {}, p.nom),
          O.jeton(p.poste),
          el("span.age", { style: { color: charge > 100 ? "var(--alerte)" : "var(--clair-terne)" } }, charge + " %")
        ),
        (p.casquettes || []).length
          ? el("div.critere", {}, "cumul : " + p.casquettes.map(function (c) {
              return O.poste(c.poste).court + " " + (c.part ? c.part + " %" : "— part non déclarée");
            }).join(" · ") + " → contrôle chez " + O.poste(controleur(p)).nom)
          : null,
        ETAT.ligne(ETAT.cumul(p), "critere-etat"),
        el("div.critere", {}, "séniorité : " + (p.seniorite || "non renseignée")),
        el("button.b", { type: "button", onclick: function () { editerPersonne(p, hote); } }, "Modifier les postes de " + p.nom)
      );
    }));
    PANNEAU.ouvrir("L'équipe", DEPOT.liste("personnes").length + " personnes", corps);
  }

  function editerPersonne(p, hote) {
    var postes = MAISON.postes.map(function (x) { return { cle: x.cle, nom: x.nom }; });
    var f = FORM.rendre([
      { cle: "nom", nom: "Nom", type: "texte", requis: true },
      { cle: "poste", nom: "Poste principal", type: "choix", options: postes, requis: true },
      { cle: "cumuls", nom: "Autres postes exercés", type: "objets",
        source: function () { return MAISON.postes.map(function (x) { return { id: x.cle, nom: x.nom }; }); } },
    ], { nom: p ? p.nom : "", poste: p ? p.poste : "", cumuls: p ? (p.casquettes || []).map(function (c) { return c.poste; }) : [] });
    PANNEAU.sur(p ? "Modifier les postes" : "Ajouter une personne", "Équipe", el("div", {},
      f.noeud, el("p.indice", {}, "Le cumul décrit le travail exercé. Il ne consigne aucun accord client et ne modifie pas les accès serveur."),
      el("div.form-actions", {}, el("button.b.or", { type: "button", onclick: function () {
        var v = f.valeurs();
        if (!String(v.nom || "").trim() || !v.poste) { AVIS.refus("Le nom et le poste principal sont nécessaires."); return; }
        var avant = p ? (p.casquettes || []) : [];
        var valeurs = { nom: v.nom.trim(), poste: v.poste, casquettes: (v.cumuls || []).filter(function (c) {
          return c !== v.poste;
        }).map(function (c) { return avant.filter(function (x) { return x.poste === c; })[0] || { poste: c, part: null, revue_le: null }; }) };
        if (p) Object.assign(p, valeurs); else p = DEPOT.ajoute("personnes", valeurs);
        DEPOT.tracer("postes renseignés", "personnes", p.id, valeurs.nom);
        DEPOT.enregistrer(); PANNEAU.fermerSur(); equipe(hote);
      } }, "Enregistrer les postes"),
      el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  /* Règle 2 : le contrôle remonte d'un cran. */
  function controleur(p) {
    if (!(p.casquettes || []).length) return O.poste(p.poste).rattache || "direction-generale";
    return O.poste(p.poste).rattache || "direction-generale";
  }

  return { rendre: rendre, titre: "Réglages", conditions: conditions };
})();
