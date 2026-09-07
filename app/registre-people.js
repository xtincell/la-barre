/* registre-people.js — les 50 dossiers de Matanga People, et lesquels ont un
 * dossier ici.
 *
 * LA BARRE couvrait huit références sur cinquante. Les quarante-deux autres
 * n'étaient pas « ailleurs » : elles étaient invisibles. Relancer un DA sur la
 * base d'un écran qui montre 16 % du portefeuille, c'est relancer sur ce qui
 * se voit et ignorer le reste — l'impair exact que ce registre empêche.
 *
 * Il ne duplique pas People : People reste la source. Il dit une seule chose,
 * celle que People ne peut pas dire — pour chaque dossier là-bas, y a-t-il
 * ici de quoi suivre l'exécution ? Et il donne le geste : ouvrir le dossier.
 *
 * Le registre se relève, il ne se saisit pas. La date du relevé est écrite
 * sur chaque ligne : un registre vieux d'un mois se lit autrement qu'un
 * registre d'hier, et le taire serait pire que de ne rien montrer.
 */

window.REGISTRE = (function () {
  var el = O.el;

  /* Ce qui appelle un dossier ici, et ce qui n'en appelle pas.
   *
   * Un dossier clôturé n'a plus rien à suivre ; un dossier en pause non plus,
   * tant qu'il l'est. Le cadrage, si : c'est là qu'on écrit le brief, et un
   * cadrage sans brief est précisément ce qui se découvre trop tard. */
  var SUIVRE = { actif: true, cadrage: true, "en pause": false, "clôturé": false };

  function liste() { return DEPOT.liste("people"); }

  function couverture() {
    var par = {};
    DEPOT.liste("projets").forEach(function (p) {
      ((p.people || {}).refs || []).forEach(function (r) {
        (par[r] = par[r] || []).push(p);
      });
    });
    return par;
  }

  function etat(r, dossiers) {
    if (dossiers && dossiers.length) {
      var n = dossiers.reduce(function (s, p) {
        return s + (p.livrables || []).filter(function (l) { return !l.annule; }).length; }, 0);
      return { cle: "suivi", nom: "suivi ici", ton: "vert",
        quoi: dossiers.map(function (p) { return p.ref; }).join(", ")
          + (n ? "  ·  " + n + (n > 1 ? " livrables" : " livrable") : "  ·  aucun livrable encore") };
    }
    if (!SUIVRE[r.statut]) {
      return { cle: "hors", nom: r.statut, ton: "terne",
        quoi: "rien à suivre tant qu'il est " + r.statut };
    }
    /* La conséquence est la même pour les trente-quatre : elle se dit une fois,
     * au-dessus de la liste. Écrite sur chaque ligne, elle occupait trois
     * lignes de haut et cessait d'être lue à la deuxième. */
    return { cle: "aveugle", nom: "aucun dossier ici",
      ton: r.priorite === "critique" ? "alerte" : "attente",
      quoi: fenetre(r) };
  }

  /* Ce qui reste propre à la ligne : quand ça tourne, et jusqu'à quand.
   * C'est la seule chose qui distingue un dossier aveugle d'un autre. */
  function fenetre(r) {
    if (r.debut && r.fin) return O.jourCourt(r.debut) + " → " + O.jourCourt(r.fin);
    if (r.fin) return "jusqu'au " + O.jourCourt(r.fin);
    if (r.debut) return "ouvert le " + O.jourCourt(r.debut);
    return "sans dates chez People";
  }

  /* Le bilan : ce qui manque, et ce que ça coûte. */
  function bilan() {
    var par = couverture();
    var b = { total: 0, suivis: 0, aveugles: 0, hors: 0, critiques: [], actifs: [] };
    liste().forEach(function (r) {
      b.total++;
      var e = etat(r, par[r.ref]);
      if (e.cle === "suivi") b.suivis++;
      else if (e.cle === "hors") b.hors++;
      else {
        b.aveugles++;
        if (r.priorite === "critique") b.critiques.push(r);
        if (r.statut === "actif") b.actifs.push(r);
      }
    });
    return b;
  }

  function pire() {
    var b = bilan();
    if (!b.total) {
      return { t: "Aucun relevé de Matanga People",
        q: "Sans relevé, on ne sait pas ce qui existe là-bas et n'existe pas ici — "
          + "et on relance sur ce qui se voit." };
    }
    if (b.critiques.length) {
      var c = b.critiques[0];
      return { t: b.critiques.length
          + (b.critiques.length > 1 ? " dossiers critiques n'ont aucun dossier ici"
                                    : " dossier critique n'a aucun dossier ici"),
        q: "« " + c.nom + " » est en priorité critique chez People et son exécution ne "
          + "se voit nulle part ici. Personne n'est en défaut le jour où il déraille." };
    }
    if (b.actifs.length) {
      return { t: b.actifs.length
          + (b.actifs.length > 1 ? " dossiers actifs n'ont aucun dossier ici"
                                 : " dossier actif n'a aucun dossier ici"),
        q: "Leur exécution ne se voit nulle part : rien n'y est relançable, et leur "
          + "absence ne se signale pas d'elle-même. C'est là que se commet l'impair — "
          + "relancer sur les " + b.suivis + " qu'on voit, et ignorer ceux-là." };
    }
    if (b.aveugles) {
      return { t: b.aveugles + (b.aveugles > 1 ? " dossiers en cadrage sans dossier ici" : " dossier en cadrage sans dossier ici"),
        q: "Le cadrage est le moment où le brief s'écrit. Sans dossier, il s'écrira "
          + "ailleurs — ou pas du tout." };
    }
    return { t: "Tout ce qui se suit est suivi",
      q: b.suivis + " dossiers actifs ou en cadrage ont leur dossier ici ; les "
        + b.hors + " autres sont clôturés ou en pause." };
  }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(hote, rafraichir) {
    var par = couverture();
    var rs = liste();
    var b = bilan();
    O.vider(hote);

    if (!rs.length) {
      hote.appendChild(el("p.rien", {},
        "Aucun relevé. Le registre se remplit depuis une extraction de Matanga People."));
      return;
    }

    var releve = rs[0].releve_le;
    var age = releve ? Math.round((new Date(O.jour()) - new Date(releve)) / 86400000) : null;

    hote.appendChild(el("div.reg", {},
      el("div.reg-t", {},
        el("span.regt-l", {}, "MATANGA PEOPLE"),
        el("span.regt-d", {}, age === null ? "date de relevé inconnue"
          : age <= 0 ? "relevé aujourd'hui"
          : "relevé il y a " + age + (age > 1 ? " jours" : " jour")
            + (age > 14 ? " — un registre de cet âge se lit comme une photo, pas comme un état" : ""))),

      el("div.reg-c", {},
        compte(String(b.suivis), "suivis ici", "leur exécution se voit", "vert"),
        b.aveugles ? compte(String(b.aveugles), "sans dossier ici",
          "leur exécution ne se voit nulle part", b.critiques.length ? "alerte" : "attente") : null,
        b.hors ? compte(String(b.hors), "clôturés ou en pause", "rien à suivre", "terne") : null),

      /* La conséquence, une fois. Elle vaut pour toutes les lignes marquées
       * « aucun dossier ici » — la répéter trente-quatre fois ne la rendait
       * pas plus vraie, seulement invisible. */
      b.aveugles
        ? el("div.reg-n", {}, el("b", {}, "« aucun dossier ici » — ce que ça veut dire  :  "),
            "l'exécution ne se voit nulle part dans LA BARRE, rien n'y est relançable, "
            + "et cette absence ne se signale pas d'elle-même.")
        : null,

      el("div.reg-l", {}, rs.map(function (r) { return ligne(r, par[r.ref], rafraichir); }))
    ));
  }

  function compte(v, nom, quoi, ton) {
    return el("div.reg-cc" + (ton ? "." + ton : ""), {},
      el("span.regc-v", {}, v),
      el("span.regc-n", {}, nom),
      el("span.regc-q", {}, quoi));
  }

  function ligne(r, dossiers, rafraichir) {
    var e = etat(r, dossiers);
    var p = (dossiers || [])[0];

    return el("div.reg-r." + e.cle, {},
      el("span.regr-ref", {}, r.ref),
      el("span.regr-n", {}, r.nom),
      el("span.regr-s", {},
        el("span.regrs-e." + e.ton, {}, e.nom),
        r.priorite === "critique" ? el("span.regrs-p", {}, "critique") : null),
      el("span.regr-q", {}, e.quoi),
      el("span.regr-g", {},
        p
          ? GESTE.bouton("projet", { p: p }, "Ouvrir " + p.ref, "b.nu")
          : e.cle === "aveugle"
            ? el("button.b.nu", { type: "button",
                onclick: function () { ouvrirDossier(r, rafraichir); } }, "Ouvrir un dossier")
            : null)
    );
  }

  /* ————————————————————— Ouvrir un dossier depuis le registre ————————————————————— */

  /* On n'importe pas People : on ouvre ici ce qu'il faut pour suivre. Trois
   * champs relevés, et le dossier se complète en travaillant — c'est la règle
   * d'amorçage : entrer tout avant de commencer, c'est ne jamais commencer. */
  function ouvrirDossier(r, rafraichir) {
    var champNom = el("input", { type: "text", value: r.nom });
    var selG = el("select", {});
    MAISON.gabarits.forEach(function (g) {
      selG.appendChild(el("option", { value: g.cle }, g.nom));
    });
    selG.value = "piece";

    PANNEAU.ouvrir("Ouvrir un dossier", r.ref, el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"),
        "Tant qu'il n'a pas de dossier ici, son exécution ne se voit nulle part : "
        + "rien n'y est relançable, et son absence ne se signale pas d'elle-même."),

      el("div.axe-socle", {},
        el("div.axsoc-l", {}, "CE QUE PEOPLE EN DIT"),
        detail("Statut", r.statut), detail("Priorité", r.priorite),
        detail("Début", r.debut ? O.joli(r.debut) : "non renseigné"),
        detail("Fin", r.fin ? O.joli(r.fin) : "non renseignée"),
        r.description ? detail("Description", r.description) : null),

      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom du dossier"), champNom),
        el("div.champ", {}, el("label", {}, "Gabarit"),
          el("div.indice", {}, "Le gabarit se choisit à la création et ne change plus. "
            + "Une demande simple n'a pas besoin des huit sections d'une campagne."),
          selG)),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var refs = DEPOT.liste("projets").map(function (x) {
            return parseInt(String(x.ref).replace(/\D/g, ""), 10) || 0; });
          var num = Math.max.apply(null, refs.concat([41])) + 1;
          var p = DEPOT.ajoute("projets", {
            ref: "MT-" + String(num).padStart(4, "0"),
            nom: champNom.value.trim() || r.nom,
            gabarit: selG.value,
            cree_le: new Date().toISOString(),
            people: { refs: [r.ref], nom: r.nom,
              note: "Ouvert depuis le registre People du " + O.joli(r.releve_le) + "." },
            sections: { identite: {
              echeance: r.fin || null,
              /* Ce que People sait, posé tel quel — jamais complété d'hypothèses. */
              note: r.description || null } },
            livrables: [], volets: [], idees: [],
          });
          DEPOT.tracer("ouverture", "projets", p.id, p.ref + " — depuis " + r.ref);
          DEPOT.enregistrer();
          PANNEAU.fermer();
          AVIS.fait(p.ref + " ouvert. Il vit avec ce que People en dit ; le reste "
            + "se complète en travaillant.");
          if (rafraichir) rafraichir();
        } }, "Ouvrir le dossier"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function detail(nom, v) {
    return el("div.axsoc-r", {},
      el("span.axsocr-n", {}, nom),
      el("span.axsocr-v", {}, String(v)));
  }

  return { liste: liste, couverture: couverture, etat: etat, bilan: bilan,
    pire: pire, rendre: rendre, ouvrirDossier: ouvrirDossier };
})();
