/* vue-reglages.js — un avertissement, puis des réglages.
 *
 * Il n'y a qu'une urgence ici, et elle vaut tout le reste : vider les données
 * du navigateur détruirait trois mois de travail. Tant que le dépôt n'est pas
 * sorti, cette phrase occupe le premier tiers de l'écran. Le reste — les
 * règles, l'équipe, le journal — est calme par construction.
 */

window.VUE_REGLAGES = (function () {
  var el = O.el;

  function rendre(hote) {
    var age = DEPOT.ageSauvegarde();

        O.vider(hote);

    /* L'avertissement d'abord, et en grand tant qu'il est vrai. */
    var pds = DEPOT.poids();
    var risque = age === null || age > 2;
    var n = DEPOT.liste("projets").length;
    var pcs = DEPOT.liste("projets").reduce(function (t, p) {
      return t + (p.livrables || []).filter(function (l) { return !l.annule; }).length; }, 0);
    var infs = DEPOT.liste("projets").reduce(function (t, p) {
      return t + (window.INFERENCE ? INFERENCE.compte(p) : 0); }, 0);

    hote.appendChild(el("div.rg-tete" + (risque ? ".risque" : ".sain"), {},
      el("div.rgt-c", {},
        el("div.rgt-h", {}, risque ? "⚠" : "✓"),
        el("div", {},
          el("h2", {}, age === null ? "Le dépôt n'a jamais été exporté"
            : risque ? "Dernier export il y a " + age + (age > 1 ? " jours" : " jour")
            : "Le dépôt est à jour"),
          el("p.rgt-q", {}, risque
            ? "Vider les données du navigateur détruirait tout : " + n
              + (n > 1 ? " dossiers, " : " dossier, ") + pcs + " pièces, " + infs + " inférences."
            : "Exporté il y a " + age + (age > 1 ? " jours" : " jour") + ". Le fichier sur le Drive fait foi."),
          el("p.rgt-s", {}, "Le navigateur n'en garde qu'un cache. Import à l'ouverture, "
            + "export à la fermeture — c'est ce qui règle le cas des deux machines."))),
      el("div.rgt-g", {},
        el("button.b.or", { type: "button", onclick: function () {
          DEPOT.exporter(); DEPOT.noterExport(); rendre(hote); } }, "Exporter le dépôt →"),
        el("button.b.nu", { type: "button", onclick: function () { importer(hote); } },
          "Importer un fichier")),
      el("div.rgt-j", {},
        el("i", { style: { width: Math.min(100, pds.part) + "%" } }),
        el("span", {}, pds.mo + " Mo sur 5 Mo · plafond du navigateur"))
    ));

    hote.appendChild(el("div.groupe", {},
      el("div.section-titre", {}, "Le poste de travail"),
      el("div.reglages", {},
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
          AVIS.refus("Dépôt importé.");
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
    var corps = el("div", {}, DEPOT.liste("personnes").map(function (p) {
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
        el("div.critere", {}, "séniorité : " + (p.seniorite || "non renseignée"))
      );
    }));
    PANNEAU.ouvrir("L'équipe", DEPOT.liste("personnes").length + " personnes", corps);
  }

  /* Règle 2 : le contrôle remonte d'un cran. */
  function controleur(p) {
    if (!(p.casquettes || []).length) return O.poste(p.poste).rattache || "direction-generale";
    return O.poste(p.poste).rattache || "direction-generale";
  }

  return { rendre: rendre, titre: "Réglages", conditions: conditions };
})();
