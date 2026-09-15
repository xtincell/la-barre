/* vue-insight.js — la chaîne du raisonnement, à l'écran.
 *
 * Un insight, les territoires qu'il ouvre, les axes qui les occupent. Rendue
 * comme une arborescence et non comme trois listes, parce que c'est la
 * profondeur qui porte l'information : une piste sans territoire flotte
 * visiblement, un territoire sans racine aussi, et deux racines pour un même
 * deck se voient d'un seul regard.
 *
 * L'écran répond à la question qu'on posait en réunion sans pouvoir y
 * répondre : est-ce que ces trois propositions traitent le même problème ?
 */

window.VUE_INSIGHT = (function () {
  var el = O.el;

  function rendre(p, rafraichir) {
    var insights = INSIGHT.liste(p);
    var r = RECO.racines(p);

    return el("div.rais", {},
      bande(p, insights, r, rafraichir),
      insights.length
        ? el("div.rais-arbre", {}, insights.map(function (i) {
            return noeudInsight(p, i, rafraichir);
          }))
        : vide(p, rafraichir),
      r.orphelines.length ? orphelines(p, r, rafraichir) : null,
      window.ECOLES ? blocEcoles(p, rafraichir) : null,
      window.EFFICACITE ? EFFICACITE.bloc(p) : null,
      reste(p, rafraichir)
    );
  }

  /* ————————————————————— L'école, étage par étage ————————————————————— */

  /* « C'est de plus en plus à vous de savoir dans quelle école vous travaillez
   * — personne ne vous le dira. » Trois étages, une école par étage. Le
   * mélange tient quand chacune en gouverne un différent ; deux au même étage
   * se neutralisent, sauf si elles partagent la même racine. */
  function blocEcoles(p, rafraichir) {
    var d = p.ecoles || {};
    var e = ECOLES.etat(p);

    return el("section.eco." + e.ton, {},
      el("div.eco-tete", {},
        el("span.eco-t", {}, "L'ÉCOLE QUI GOUVERNE CHAQUE ÉTAGE"),
        el("span.eco-e", {}, e.nom)),
      el("p.eco-q", {}, e.quoi),

      el("div.eco-g", {}, ECOLES.ETAGES.map(function (et) {
        /* Le territoire déclare son école lui-même : c'est l'étage qu'il
         * gouverne, et un dossier peut en porter deux. */
        var surT = et.cle === "territoire"
          ? TERRITOIRE.liste(p).filter(function (t) { return !!t.ecole; }) : [];
        var cle = d[et.cle] || (surT.length === 1 ? surT[0].ecole : null);
        var ec = cle ? ECOLES.de(cle) : null;
        var pr = cle ? ECOLES.preuve(p, cle, et.cle) : null;

        return el("div.ecoe" + (ec ? (pr && !pr.ok ? ".manque" : ".posee") : ".vide"), {},
          el("span.ecoe-t", {}, et.nom),
          el("span.ecoe-n", {}, ec ? ec.nom : "non déclarée"),
          ec ? el("span.ecoe-m", {}, ec.maison) : null,
          ec ? el("span.ecoe-p", {}, "preuve attendue : " + ec.preuve) : null,
          pr && !pr.ok ? el("p.ecoe-x", {}, pr.cout) : null,
          ec && ec.local ? el("p.ecoe-l", {}, "Ici : " + ec.local) : null,
          surT.length > 1
            ? el("p.ecoe-x", {}, surT.length + " territoires déclarent chacun la leur — "
                + "elles ne se neutralisent que si leurs racines diffèrent.")
            : null,
          et.cle === "territoire" && surT.length
            ? null
            : el("button.b.nu", { type: "button",
                onclick: function () { choisirEcole(p, et, rafraichir); } },
                ec ? "Changer" : "Déclarer"));
      })),

      el("details.eco-tab", {},
        el("summary", {}, "Les douze écoles, et ce que chacune réclame"),
        ECOLES.tableau()));
  }

  function choisirEcole(p, etage, rafraichir) {
    var d = p.ecoles || {};
    var choix = d[etage.cle] || null;
    var liste = ECOLES.parEtage(etage.cle);

    var cartes = liste.map(function (ec) {
      var pr = ECOLES.preuve(p, ec.cle, etage.cle);
      var b = el("button.ecc" + (choix === ec.cle ? ".ici" : "") + (ec.corpus ? ".corpus" : ""),
        { type: "button" },
        el("div.ecc-t", {},
          el("span.ecc-n", {}, ec.nom),
          el("span.ecc-m", {}, ec.maison + " · " + ec.annee)),
        el("p.ecc-p", {}, ec.principe),
        el("p.ecc-pr", {}, el("span.ecc-e", {}, "PREUVE ATTENDUE  "), ec.preuve,
          pr ? el("span.ecc-ok" + (pr.ok ? ".ok" : ""), {},
            pr.ok ? "  — elle est au dossier" : "  — elle n'y est pas") : null),
        el("p.ecc-lim", {}, el("span.ecc-e", {}, "LA LIMITE  "), ec.limite),
        ec.local ? el("p.ecc-loc", {}, el("span.ecc-e", {}, "ICI  "), ec.local) : null);
      b.addEventListener("click", function () {
        choix = ec.cle;
        [].forEach.call(b.parentNode.children, function (x) { x.classList.remove("ici"); });
        b.classList.add("ici");
      });
      return b;
    });

    PANNEAU.sur("L'école de " + etage.nom.toLowerCase(), p.ref, el("div", {},
      UI.banniere("", "Une école répond à une seule question : où se trouve la bonne "
        + "idée ? Le mélange tient quand chacune gouverne un étage différent — deux au "
        + "même étage se neutralisent, sauf si elles partagent la même racine."),
      el("div.ecc-l", {}, cartes),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!p.ecoles) p.ecoles = {};
          p.ecoles[etage.cle] = choix || null;
          DEPOT.tracer("école", "strategie", p.id,
            etage.nom + " — " + (choix ? ECOLES.de(choix).nom : "aucune"));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Déclarer"),
        choix ? el("button.b", { type: "button", onclick: function () {
          if (!p.ecoles) p.ecoles = {};
          p.ecoles[etage.cle] = null;
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Retirer l'école") : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(p, insights, r, rafraichir) {
    var testes = insights.filter(function (i) {
      return INSIGHT.verdict(i).cle === "insight"; }).length;
    var couches = insights.filter(function (i) { return !!i.couche; }).length;
    var decalages = insights.map(function (i) { return INSIGHT.decalage(p, i); })
      .filter(Boolean);

    var controles = [
      { quoi: "Un insight au dossier", ok: insights.length > 0, poids: 5,
        cout: "le dossier n'a pas de racine : les pistes ne remonteront à rien, et "
          + "rien ne dira si elles traitent le même problème" },
      { quoi: "Sa couche est nommée", ok: insights.length > 0 && couches === insights.length, poids: 5,
        cout: "on ne sait pas ce que l'insight commande — un message, une big idea, "
          + "un positionnement ou une correction de marque" },
      { quoi: "Il répond au bon problème", ok: decalages.length === 0, poids: 5,
        cout: decalages.length ? decalages[0].cout : "" },
      { quoi: "Le test est passé", ok: insights.length > 0 && testes === insights.length, poids: 4,
        cout: "un énoncé que personne ne peut contredire n'ouvre aucun choix" },
      { quoi: "Une seule racine pour les axes", ok: !r.concurrents, poids: 5,
        cout: r.concurrents
          ? r.nRacines + " racines pour " + r.nVives + " pistes : ce ne sont pas des "
            + "axes, ce sont des recommandations concurrentes — le client recomposera"
          : "" },
    ];

    return UI.recevabilite("Ce raisonnement tient-il debout ?", controles, null,
      [{ nom: "Écrire un insight", fort: !insights.length,
         quand: function () { editerInsight(p, INSIGHT.creer(p), rafraichir, true); } }]);
  }

  function vide(p, rafraichir) {
    return el("div.rais-vide", {},
      el("p.rien", {}, "Aucun insight au dossier. Tant qu'il n'y en a pas, les pistes "
        + "se jugent au goût : rien ne dit à quelle profondeur le problème a été lu, "
        + "ni ce que cette profondeur commande."),
      el("div.rais-ordre", {},
        el("div.ro-t", {}, "L'ORDRE DE TRAVAIL"),
        el("p.ro-q", {}, "Commencer par le consommateur est le réflexe le plus "
          + "répandu, et le plus coûteux : on trouve une jolie tension dans un espace "
          + "déjà pris."),
        el("ol.ro-l", {}, INSIGHT.ORDRE.map(function (o) {
          var c = INSIGHT.couche(o.cle);
          return el("li", {},
            el("span.ro-n", {}, c.nom),
            el("span.ro-x", {}, "→ " + o.tire),
            el("span.ro-s", {}, "sauté : " + o.saute));
        }))));
  }

  /* ————————————————————— Un insight, et ce qui en découle ————————————————————— */

  function noeudInsight(p, i, rafraichir) {
    INSIGHT.normaliser(i);
    var e = INSIGHT.etat(p, i);
    var v = INSIGHT.verdict(i);
    var c = i.couche ? INSIGHT.couche(i.couche) : null;
    var d = INSIGHT.decalage(p, i);
    var ts = TERRITOIRE.liste(p).filter(function (t) { return t.insightId === i.id; });

    return el("section.rin." + e.ton, {},
      el("header.rin-tete", {},
        el("div.rin-c", {},
          el("span.rin-couche" + (c ? "" : ".sans"), {},
            c ? c.court : "COUCHE NON NOMMÉE"),
          el("span.rin-v." + v.ton, { title: v.quoi }, v.nom)),
        el("h3.rin-p", {}, INSIGHT.texte(i) || "insight vide"),
        c ? el("p.rin-cmd", {}, "Cette couche commande " + c.commande + ".") : null,
        el("p.rin-e", {}, e.quoi),
        el("div.rin-g", {},
          el("button.b.nu", { type: "button",
            onclick: function () { editerInsight(p, i, rafraichir); } }, "Écrire"),
          el("button.b.nu", { type: "button",
            onclick: function () { testerInsight(p, i, rafraichir); } }, "Tester"),
          el("button.b.nu", { type: "button",
            onclick: function () { sourcer(p, i, rafraichir); } },
            i.sources.length + " / " + INSIGHT.CROISEMENT + " sources"))),

      /* Le décalage de couche, dit à l'endroit où il se décide — et avec la
       * seule chose qui le ferme : l'écrire au brief-back. */
      d ? el("div.rin-dec", {},
        el("div.rind-t", {}, d.quoi),
        el("p.rind-q", {}, d.cout),
        el("button.b", { type: "button", onclick: function () {
          location.hash = "#/projets/" + p.id + "/briefback";
        } }, "Documenter l'écart au brief-back")) : null,

      INSIGHT.passes(i),

      el("div.rin-ter", {},
        el("div.rint-t", {}, ts.length
          ? ts.length + (ts.length > 1 ? " territoires" : " territoire")
          : "Aucun territoire"),
        ts.length
          ? ts.map(function (t) { return noeudTerritoire(p, t, rafraichir); })
          : el("p.rien", {}, "Un insight sans territoire n'ouvre rien d'écrit : les "
              + "pistes qui en sortiront ne pourront pas s'y rattacher."),
        el("button.b.nu", { type: "button", onclick: function () {
          editerTerritoire(p, TERRITOIRE.creer(p, i.id), rafraichir, true);
        } }, "Ouvrir un territoire"))
    );
  }

  /* ————————————————————— Un territoire, et ses axes ————————————————————— */

  function noeudTerritoire(p, t, rafraichir) {
    var e = TERRITOIRE.etat(p, t);
    var pis = TERRITOIRE.pistes(p, t);
    var conv = TERRITOIRE.convention(t);

    return el("article.rte." + e.ton, {},
      el("div.rte-tete", {},
        el("h4.rte-n", {}, t.nom || "territoire sans nom"),
        t.ecole && window.ECOLES
          ? el("span.rte-ec", {}, (ECOLES.de(t.ecole) || {}).nom || t.ecole) : null,
        el("span.rte-c", {}, pis.length + (pis.length > 1 ? " concepts" : " concept"))),
      t.quoi ? el("p.rte-q", {}, t.quoi) : null,
      el("p.rte-e", {}, e.quoi),

      /* La preuve que l'école réclame à cet étage. */
      t.ecole === "disruption"
        ? el("div.rte-preuve" + (conv.prouvee ? ".ok" : ""), {},
            el("span.rtp-t", {}, "LA CONVENTION"),
            el("span.rtp-x", {}, conv.enonce || "non énoncée"),
            el("span.rtp-p", {}, conv.prouvee
              ? conv.preuves.length + " visuels de concurrents"
              : conv.manque + " visuel" + (conv.manque > 1 ? "s" : "")
                + " manque" + (conv.manque > 1 ? "nt" : "")
                + " — une convention qu'on ne peut pas montrer est une convention supposée"))
        : null,

      pis.length
        ? el("ul.rte-pi", {}, pis.map(function (pi) {
            var r = pi.role ? RECO.role(pi.role) : null;
            return el("li.rtep" + (r ? "." + r.cle : ""), {},
              el("span.rtep-n", {}, pi.titre || "piste sans titre"),
              r ? el("span.rtep-r", { title: r.quoi }, r.nom) : null,
              pi.statut === "retenue" ? el("span.rtep-s", {}, "retenue") : null);
          }))
        : null,

      el("div.rte-g", {},
        el("button.b.nu", { type: "button",
          onclick: function () { editerTerritoire(p, t, rafraichir); } }, "Écrire"))
    );
  }

  /* ————————————————————— Les pistes qui ne remontent à rien ————————————————————— */

  function orphelines(p, r, rafraichir) {
    return el("section.rais-orph", {},
      el("div.rao-t", {}, r.orphelines.length
        + (r.orphelines.length > 1 ? " pistes ne remontent à rien" : " piste ne remonte à rien")),
      el("p.rao-q", {}, "Impossible de dire si elles traitent le même problème que les "
        + "autres. Les rattacher à un territoire est le geste qui rend le deck défendable."),
      el("ul.rao-l", {}, r.orphelines.map(function (pi) {
        return el("li", {},
          el("span.rao-n", {}, pi.titre || "piste sans titre"),
          el("button.b.nu", { type: "button",
            onclick: function () { rattacher(p, pi, rafraichir); } }, "Rattacher"));
      })));
  }

  /* ————————————————————— Ce qui reste de la section ————————————————————— */

  /* Problème réel, opportunité, garde-fous : des champs, et qui le restent. */
  function reste(p, rafraichir) {
    var def = CHAMPS.section("strategie");
    var d = p.sections.strategie || {};
    return el("div.rais-reste", {},
      el("div.section-titre", {}, "Le cadre"),
      el("div.st", {}, def.champs.map(function (c) {
        var v = d[c.cle];
        var rempli = Array.isArray(v) ? v.length : (v !== null && v !== undefined && String(v).trim() !== "");
        return el("button.st-e" + (rempli ? "" : ".vide"), { type: "button",
            title: "modifier — " + c.nom,
            onclick: function () { VUE_PROJETS.editerChamp(p, "strategie", c.cle, rafraichir); } },
          el("div.ste-n", {}, c.nom),
          rempli
            ? (Array.isArray(v)
                ? el("ul.ste-l", {}, v.map(function (x) { return el("li", {}, x); }))
                : el("p.ste-v", {}, String(v)))
            : el("p.ste-x", {}, "Non écrit."));
      })));
  }

  /* ————————————————————— Écrire un insight ————————————————————— */

  function editerInsight(p, i, rafraichir, neuf) {
    INSIGHT.normaliser(i);

    var selC = el("select", {});
    selC.appendChild(el("option", { value: "" }, "— à quelle couche vit le problème ? —"));
    INSIGHT.COUCHES.forEach(function (c) {
      var o = el("option", { value: c.cle }, c.nom + " — commande " + c.commande);
      if (i.couche === c.cle) o.selected = true;
      selC.appendChild(o);
    });
    var aide = el("div.indice", {});
    function direCouche() {
      var c = INSIGHT.couche(selC.value);
      O.vider(aide);
      if (!c) { aide.textContent = "Sans couche, on ne sait pas quel livrable l'insight appelle."; return; }
      aide.appendChild(el("div", {}, "On y cherche : " + c.cherche + "."));
      aide.appendChild(el("div", {}, "On la reconnaît : " + c.reconnait + "."));
      aide.appendChild(el("div.indice-err", {}, "L'erreur courante : " + c.erreur));
    }
    selC.addEventListener("change", direCouche);
    direCouche();

    var longue = el("textarea", { rows: "4" }); longue.value = i.passes.longue || "";
    var sit = el("textarea", { rows: "2" }); sit.value = i.passes.temps.situation || "";
    var ten = el("textarea", { rows: "2" }); ten.value = i.passes.temps.tension || "";
    var emp = el("textarea", { rows: "2" }); emp.value = i.passes.temps.empeche || "";
    var phr = el("textarea", { rows: "2" }); phr.value = i.passes.phrase || "";

    PANNEAU.sur(neuf ? "Écrire un insight" : "L'insight", p.ref, el("div", {},
      UI.banniere("", "Trois passes, et on les conserve toutes les trois : le chemin se "
        + "montre au client le jour où il trouve la phrase finale trop simple."),

      el("div.form", {},
        el("div.champ", {}, el("label", {}, "La couche"), selC, aide),

        el("div.champ", {}, el("label", {}, "1 · La version longue"),
          el("div.indice", {}, "Tout ce qu'on a compris de la personne, sans contrainte. "
            + "Le contexte, la donnée, la nuance. ≈ 60 mots."), longue),

        el("div.champ", {}, el("label", {}, "2 · La situation"),
          el("div.indice", {}, "Ce que la personne fait, dit ou vit. Factuel, à la "
            + "première personne, sans jugement et sans vocabulaire d'agence."), sit),
        el("div.champ", {}, el("label", {}, "2 · La tension"),
          el("div.indice", {}, "Deux choses vraies en même temps qui ne devraient pas l'être."), ten),
        el("div.champ", {}, el("label", {}, "2 · Ce que ça empêche"),
          el("div.indice", {}, "La conséquence concrète. C'est ce temps qui transforme une "
            + "observation en porte d'entrée pour la création — et si on peut le "
            + "supprimer sans rien perdre, c'est qu'on a écrit un constat."), emp),

        el("div.champ", {}, el("label", {}, "3 · La phrase unique"),
          el("div.indice", {}, "Un seul énoncé, dit à voix haute devant quelqu'un qui ne "
            + "connaît pas le dossier. S'il ne réagit pas, on recommence."), phr)),

      imposteurs(),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          i.couche = selC.value || null;
          i.passes.longue = longue.value.trim();
          i.passes.temps = { situation: sit.value.trim(), tension: ten.value.trim(),
            empeche: emp.value.trim() };
          i.passes.phrase = phr.value.trim();
          i.migre = false;
          DEPOT.tracer("saisie", "strategie", p.id, "Insight — " + (i.couche || "sans couche"));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* Les cinq imposteurs, affichés là où la confusion se produit. Ils ne
   * contrôlent rien : on ne détecte pas un constat par une expression
   * régulière. Ils rappellent, au moment où on écrit. */
  function imposteurs() {
    return el("details.imp", {},
      el("summary", {}, "Cinq énoncés qu'on prend pour des insights"),
      el("ul.imp-l", {}, INSIGHT.IMPOSTEURS.map(function (x) {
        return el("li", {},
          el("span.imp-n", {}, x.nom),
          el("span.imp-e", {}, x.exemple),
          el("span.imp-q", {}, x.quoi));
      })));
  }

  /* ————————————————————— Le test en trois questions ————————————————————— */

  function testerInsight(p, i, rafraichir) {
    INSIGHT.normaliser(i);
    var reponses = {};
    INSIGHT.TEST.forEach(function (q) { reponses[q.cle] = i.test[q.cle]; });

    var verdictLigne = el("div.tst-v", {});
    function redire() {
      var faux = { test: reponses, passes: i.passes, sources: i.sources };
      var v = INSIGHT.verdict(faux);
      O.vider(verdictLigne);
      verdictLigne.className = "tst-v " + v.ton;
      verdictLigne.appendChild(el("span.tstv-n", {}, v.nom));
      verdictLigne.appendChild(el("span.tstv-q", {}, v.quoi));
    }

    var lignes = INSIGHT.TEST.map(function (q) {
      var oui = el("button.b" + (reponses[q.cle] === true ? ".or" : ".nu"), { type: "button" }, "Oui");
      var non = el("button.b" + (reponses[q.cle] === false ? ".or" : ".nu"), { type: "button" }, "Non");
      oui.addEventListener("click", function () {
        reponses[q.cle] = true;
        oui.className = "b or"; non.className = "b nu"; redire();
      });
      non.addEventListener("click", function () {
        reponses[q.cle] = false;
        non.className = "b or"; oui.className = "b nu"; redire();
      });
      return el("div.tst-q", {},
        el("div.tstq-t", {}, q.question),
        el("p.tstq-x", {}, q.quoi),
        el("div.tstq-g", {}, oui, non));
    });
    redire();

    PANNEAU.sur("Le test en trois questions", INSIGHT.texte(i) || p.ref, el("div", {},
      UI.banniere("", "Trois oui : c'est un insight. Deux oui : c'est une tension à "
        + "creuser. Un seul : on recommence."),
      el("div.tst", {}, lignes),
      verdictLigne,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          i.test = reponses;
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Enregistrer le verdict"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— Les sources ————————————————————— */

  function sourcer(p, i, rafraichir) {
    INSIGHT.normaliser(i);
    var choix = {};
    var quoi = {};
    INSIGHT.SOURCES.forEach(function (s) {
      var d = i.sources.filter(function (x) { return x.type === s.cle; })[0];
      choix[s.cle] = !!d;
      quoi[s.cle] = d ? (d.quoi || "") : "";
    });

    var compte = el("div.src-c", {});
    function redire() {
      var n = Object.keys(choix).filter(function (k) { return choix[k]; }).length;
      compte.className = "src-c " + (n >= INSIGHT.CROISEMENT ? "vert" : "attente");
      compte.textContent = n + " source" + (n > 1 ? "s" : "") + " sur "
        + INSIGHT.CROISEMENT + (n >= INSIGHT.CROISEMENT
          ? " — croisées, l'insight est défendable"
          : " — une seule produit une opinion ; trois produisent un insight");
    }

    var lignes = INSIGHT.SOURCES.map(function (s) {
      var coche = el("input", { type: "checkbox" });
      coche.checked = choix[s.cle];
      var champ = el("input", { type: "text", placeholder: "ce qu'elle a donné" });
      champ.value = quoi[s.cle];
      coche.addEventListener("change", function () { choix[s.cle] = coche.checked; redire(); });
      champ.addEventListener("input", function () { quoi[s.cle] = champ.value; });
      return el("div.src-l", {},
        el("label.src-t", {}, coche, el("span", {}, s.nom)),
        el("p.src-q", {}, s.quoi),
        champ);
    });
    redire();

    PANNEAU.sur("Les sources", INSIGHT.texte(i) || p.ref, el("div", {},
      UI.banniere("", "Aucune ne remplace une étude. Ensemble, elles suffisent à écrire "
        + "un insight défendable — et c'est ce qu'on vous demandera."),
      el("div.src", {}, lignes),
      compte,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          i.sources = INSIGHT.SOURCES.filter(function (s) { return choix[s.cle]; })
            .map(function (s) {
              return { type: s.cle, quoi: quoi[s.cle], quand: new Date().toISOString() };
            });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— Écrire un territoire ————————————————————— */

  function editerTerritoire(p, t, rafraichir, neuf) {
    var nom = el("input", { type: "text", placeholder: "La banque de l'année scolaire entière" });
    nom.value = t.nom || "";
    var quoi = el("textarea", { rows: "4" }); quoi.value = t.quoi || "";

    var selI = el("select", {});
    selI.appendChild(el("option", { value: "" }, "— aucune racine —"));
    INSIGHT.liste(p).forEach(function (i) {
      var o = el("option", { value: i.id }, INSIGHT.texte(i).slice(0, 70) || "insight vide");
      if (t.insightId === i.id) o.selected = true;
      selI.appendChild(o);
    });

    var selE = el("select", {});
    selE.appendChild(el("option", { value: "" }, "— aucune école déclarée —"));
    if (window.ECOLES) {
      ECOLES.parEtage("territoire").forEach(function (e) {
        var o = el("option", { value: e.cle }, e.nom + " — " + e.preuve);
        if (t.ecole === e.cle) o.selected = true;
        selE.appendChild(o);
      });
    }

    PANNEAU.sur(neuf ? "Ouvrir un territoire" : "Le territoire", p.ref, el("div", {},
      UI.banniere("", "Le territoire est l'espace que l'insight ouvre, pas l'idée. "
        + "Plusieurs concepts doivent pouvoir y vivre — c'est ce qui donne de la durée "
        + "à une plateforme."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom"),
          el("div.indice", {}, "Court, retenable. C'est ce que le client répétera."), nom),
        el("div.champ", {}, el("label", {}, "L'espace qu'il ouvre"),
          el("div.indice", {}, "Ce qu'on peut y raconter, et sur plusieurs vagues."), quoi),
        el("div.champ", {}, el("label", {}, "La racine"),
          el("div.indice", {}, "L'insight dont il découle. Sans racine, c'est une "
            + "intuition — elle ne se défend qu'au goût."), selI),
        window.ECOLES
          ? el("div.champ", {}, el("label", {}, "L'école qui gouverne cet étage"),
              el("div.indice", {}, "Déclarer une école engendre la preuve que le dossier "
                + "doit porter. Une seule par étage."), selE)
          : null),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          t.nom = nom.value.trim();
          t.quoi = quoi.value.trim();
          t.insightId = selI.value || null;
          t.ecole = selE.value || null;
          t.migre = false;
          DEPOT.tracer("saisie", "strategie", p.id, "Territoire — " + (t.nom || "sans nom"));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— Rattacher une piste ————————————————————— */

  function rattacher(p, pi, rafraichir) {
    var ts = TERRITOIRE.liste(p);
    if (!ts.length) {
      AVIS.refus("Aucun territoire n'est ouvert : il n'y a nulle part où rattacher "
        + "cette piste. Écris d'abord l'insight et le territoire qu'il ouvre.");
      return;
    }
    var sel = el("select", {});
    ts.forEach(function (t) {
      var i = t.insightId ? INSIGHT.de(p, t.insightId) : null;
      sel.appendChild(el("option", { value: t.id },
        (t.nom || "territoire sans nom") + (i ? "  ·  " + INSIGHT.texte(i).slice(0, 50) : "  ·  sans racine")));
    });

    PANNEAU.sur("Rattacher une piste", pi.titre || "piste sans titre", el("div", {},
      UI.banniere("", "Une piste rattachée remonte à un insight. C'est ce qui permet de "
        + "dire, avant la séance, si les axes du deck traitent le même problème."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Territoire"), sel)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          pi.territoireId = sel.value;
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Rattacher"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { rendre: rendre, editerInsight: editerInsight, editerTerritoire: editerTerritoire,
    rattacher: rattacher };
})();
