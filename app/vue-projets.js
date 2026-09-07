/* vue-projets.js — la liste, puis la vue 360 d'un projet. */

window.VUE_PROJETS = (function () {
  var el = O.el;

  var NOMS = {
    identite: "Identité", brief: "Brief", socle: "Plateforme de marque",
    strategie: "Stratégie", bigidea: "Big idea", pistes: "Routes créatives",
    atelier: "Atelier", planche: "Planche des KV", livrables: "Livrables", calendriers: "Calendriers",
    presentation: "Présentation",
  };

  function nomSection(cle) { return NOMS[cle] || cle; }

  function gabarit(p) {
    var g = null;
    MAISON.gabarits.forEach(function (x) { if (x.cle === p.gabarit) g = x; });
    return g || MAISON.gabarits[0];
  }

  /* ————————————————————— Mes engagements ————————————————————— */

  function rendre(hote, projetId, section) {
    if (projetId) return projet(hote, projetId, section);

    var projets = DEPOT.liste("projets");
    hote.className = "zone dossiers";
    O.vider(hote);

    if (!projets.length) {
      hote.appendChild(el("p.rien", {},
        "Aucun dossier. On n'entre que ce qui est vivant, et partiellement."));
      return;
    }

    /* Des cartes d'un quart d'écran ne tiennent plus à quatre dossiers, et
     * elles classent par date d'arrivée — ce qui est l'inverse de la question
     * posée. On range par ce qui ne tient pas : le dossier en défaut occupe la
     * place, ceux qui tiennent descendent et se réduisent à une ligne. */
    var lignes = OBJECTIFS.engagements().map(function (e) {
      var blocs = REGLES.blocages(e.projet.id);
      var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; });
      return { e: e, p: e.projet, blocs: blocs, durs: durs,
        rang: e.tenable === false ? 0 : e.tenable === null ? 1 : 2,
        age: durs.reduce(function (n, b) {
          return Math.max(n, b.ne_le ? O.depuis(b.ne_le) : 0); }, 0) };
    }).sort(function (x, y) {
      return x.rang - y.rang || y.durs.length - x.durs.length || y.age - x.age;
    });

    var tiennent = lignes.filter(function (x) { return x.rang === 2; }).length;
    var enDefaut = lignes.length - tiennent;

    hote.appendChild(el("div.dl", {},
      el("div.dl-h", {},
        el("div", {},
          el("h2.dl-t", {}, titre(tiennent, enDefaut, lignes)),
          el("p.dl-s", {}, "Classés par ce qui ne tient pas, pas par date. "
            + "Ce que j'ai promis, et ce que je peux tenir.")),
        el("button.b.or", { type: "button", onclick: nouveau }, "+ Nouveau dossier")),

      el("div.dl-corps", {},
        el("div.dl-liste", {}, lignes.map(function (x, i) {
          /* Le premier, s'il ne tient pas, s'ouvre : c'est celui sur lequel
           * il y a quelque chose à faire aujourd'hui. */
          return (i === 0 && x.rang !== 2) ? ligneGrande(x) : ligneDossier(x);
        })),
        murDesBlocages(lignes)),

      el("p.dl-pied", {}, "Les dossiers qui tiennent descendent et pâlissent. "
        + "Seul ce qui ne tient pas remonte.")
    ));
  }

  /* Le titre dit l'état de l'ensemble et sa conséquence, pas le nom de l'écran. */
  function titre(tiennent, enDefaut, lignes) {
    var durs = lignes.reduce(function (n, x) { return n + x.durs.length; }, 0);
    if (!enDefaut) {
      return lignes.length + (lignes.length > 1 ? " dossiers tiennent" : " dossier tient")
        + (durs ? ", " + durs + (durs > 1 ? " blocages restent ouverts" : " blocage reste ouvert") : "");
    }
    return tiennent + (tiennent > 1 ? " dossiers tiennent" : " dossier tient") + ", "
      + durs + (durs > 1 ? " blocages les empêchent" : " blocage l'empêche") + " d'avancer";
  }

  /* ————————————————————— Une ligne de dossier ————————————————————— */

  function marchesDe(p) {
    var vus = {};
    (p.livrables || []).forEach(function (l) { if (l.marche) vus[l.marche] = true; });
    return Object.keys(vus).map(function (id) {
      var m = DEPOT.trouve("marches", id); return m ? m.code : null;
    }).filter(Boolean);
  }

  function verdictDe(e) {
    if (e.tenable === false) {
      return e.joursRestants !== null && e.joursRestants < 0
        ? "échéance dépassée de " + (-e.joursRestants) + " j"
        : e.charge + " j de travail pour " + Math.max(0, e.joursRestants) + " j restants";
    }
    if (e.tenable === true) return "tenable — " + e.charge + " j pour " + e.joursRestants + " j";
    if (!e.echeance) return "aucune échéance fixée";
    return e.inconnues + (e.inconnues > 1 ? " livrables sans estimation" : " livrable sans estimation")
      + " — pas de verdict possible";
  }

  /* La ligne d'identification d'un dossier : sa référence, ses marchés, qui
   * décide. Trois faits, pas un de plus — la ligne doit rester lisible. */
  function identification(p) {
    var ms = marchesDe(p);
    var d = (p.sections.identite || {}).decideur;
    return [p.ref, ms.join(", ") || null, d || null].filter(Boolean).join("  ·  ");
  }

  /* Les sections que ce gabarit porte. Le rail et la liste posent la même
   * question — elle n'a pas à être écrite deux fois. */
  function sectionsDe(p) {
    var g = null;
    MAISON.gabarits.forEach(function (x) { if (x.cle === p.gabarit) g = x; });
    return (g ? g.sections : []).map(function (cle) {
      return { cle: cle, nom: nomSection(cle) };
    });
  }

  function pips(p) {
    return el("span.dl-pips", {}, sectionsDe(p).map(function (sc) {
      var et = etatSection(p, sc.cle);
      return el("span.dlp." + et.classe, { title: sc.nom + " — " + et.texte });
    }));
  }

  function visuelDe(p) {
    return (p.livrables || []).filter(function (l) { return l.vignette; })[0]
      || (p.sections.pistes || []).filter(function (x) { return x.vignette; })[0];
  }

  /* Le dossier en défaut : celui-là occupe la place, et dit son prix. */
  function ligneGrande(x) {
    var p = x.p, e = x.e;
    /* S'il n'y a pas de blocage dur, ce sont les inférences qui coûtent —
     * un dossier entier posé sur des hypothèses n'est opposable à personne. */
    var ouverts = x.durs.length ? x.durs : x.blocs;
    var vieux = ouverts.slice().sort(function (a, b) {
      return String(a.ne_le || "").localeCompare(String(b.ne_le || "")); })[0];
    var equipe = (p.equipe || []).slice(0, 4);

    /* Un dossier sans visuel ne mérite pas un quart d'écran de carré gris :
     * la place revient à ce qui se lit — le verdict et son coût. L'illustration
     * n'est pas une décoration, c'est une pièce ; quand il n'y en a pas, on le
     * dit en une ligne et on passe. */
    var vis = visuelDe(p);
    return el("a.dl-r.grand." + (vis ? "" : "sansvisuel.")
        + (e.tenable === false ? "intenable" : "flou"),
      { href: "#/projets/" + p.id },
      vis ? el("span.dlr-v", {}, IMAGE.vignette(vis, "carte")) : null,
      el("span.dlr-c", {},
        el("span.dlr-n", {}, p.nom),
        el("span.dlr-m", {}, identification(p)),
        el("span.dlr-verdict", {}, verdictDe(e)),
        ouverts.length
          ? el("span.dlr-b", {}, "mais " + ouverts.length
              + (ouverts.length > 1 ? " blocages ouverts" : " blocage ouvert")
              + (vieux && vieux.ne_le ? "  ·  le plus ancien depuis " + O.depuis(vieux.ne_le) + " jours" : ""))
          : null,
        vieux ? el("span.dlr-cout", {}, vieux.quoi + " — " + REGLES.prix(vieux.type)) : null,
        !vis ? el("span.dlr-sv", {}, "Aucun visuel au dossier : rien à montrer, "
          + "et rien à juger en revue.") : null),
      el("span.dlr-d", {},
        el("span.dlr-eq", {}, equipe.length
          ? equipe.map(function (m) { return UI.avatar(m.personne, 24); })
          : [el("span.dlr-sans", {}, "personne d'affecté")]),
        pips(p),
        el("span.dlr-fl", {}, "→"))
    );
  }

  /* Un dossier qui tient tient sur une ligne. */
  function ligneDossier(x) {
    var p = x.p, e = x.e;
    var ton = x.rang === 0 ? "intenable" : x.rang === 1 ? "flou" : "tenable";
    return el("a.dl-r." + ton, { href: "#/projets/" + p.id },
      el("span.dlr-v" + (visuelDe(p) ? "" : ".vide"), {},
        visuelDe(p) ? IMAGE.vignette(visuelDe(p), "carte") : null),
      el("span.dlr-c", {},
        el("span.dlr-n", {}, p.nom),
        el("span.dlr-m", {}, identification(p)),
        el("span.dlr-verdict", {}, verdictDe(e),
          el("span.dlr-b2", {}, x.durs.length
            ? "  ·  " + x.durs.length + (x.durs.length > 1 ? " blocages" : " blocage")
            : "  ·  rien ne bloque"))),
      el("span.dlr-d", {}, pips(p), el("span.dlr-fl", {}, "→"))
    );
  }

  /* ————————————————————— Ce qui bloque, tous dossiers ————————————————————— */

  /* Un blocage vu dossier par dossier ne dit pas qu'il est systémique. Cinq
   * dossiers sans décideur, c'est une question à poser une fois — pas cinq. */
  function murDesBlocages(lignes) {
    var par = {};
    lignes.forEach(function (x) {
      x.blocs.forEach(function (b) {
        if (!par[b.type]) par[b.type] = { type: b.type, quoi: b.quoi, n: 0, dossiers: {} };
        par[b.type].n++;
        par[b.type].dossiers[x.p.ref] = true;
      });
    });
    var tous = Object.keys(par).map(function (k) { return par[k]; })
      .sort(function (a, b) { return b.n - a.n; });

    if (!tous.length) {
      return el("aside.dl-mur", {},
        el("div.dlm-t", {}, "CE QUI BLOQUE, TOUS DOSSIERS"),
        el("p.rien", {}, "Rien n'est ouvert. C'est rare — vérifie que les dossiers "
          + "récents ont bien leur cadrage."));
    }

    return el("aside.dl-mur", {},
      el("div.dlm-t", {}, "CE QUI BLOQUE, TOUS DOSSIERS"),
      el("div.dlm-l", {}, tous.map(function (t) {
        var dur = t.type !== "infere-non-contresigne";
        return el("div.dlm-b" + (dur ? ".dur" : ""), {},
          el("span.dlmb-p", {}),
          el("span.dlmb-c", {},
            el("span.dlmb-q", {}, nomCourt(t.quoi), el("b", {}, String(t.n))),
            el("span.dlmb-x", {}, REGLES.prix(t.type)),
            el("span.dlmb-d", {}, Object.keys(t.dossiers).join("  ·  "))));
      })));
  }

  /* Le libellé d'un blocage porte souvent son objet ; au mur on ne garde que
   * la nature, sinon la même ligne se répète en cinq variantes. */
  function nomCourt(q) {
    return String(q).replace(/^\d+\s+/, "").replace(/\s*—.*$/, "").toLowerCase();
  }


  function etatSection(p, cle) {
    if (cle === "atelier") {
      var is = VUE_ATELIER.idees(p);
      if (!is.length) return { classe: "vide", texte: "aucune idée" };
      var ret = is.filter(function (i) { return i.statut === "retenue"; }).length;
      return ret ? { classe: "plein", texte: is.length + " idées · " + ret + " retenue" + (ret > 1 ? "s" : "") }
        : { classe: "partiel", texte: is.length + " idées, aucune retenue" };
    }
    if (cle === "planche") {
      var kvs = KV.tous(p);
      if (!kvs.length) return { classe: "vide", texte: "aucun KV" };
      var faux = kvs.filter(function (l) { return !KV.conforme(p, l); }).length;
      return faux
        ? { classe: "partiel", texte: kvs.length + " KV · " + faux + (faux > 1 ? " non conformes" : " non conforme") }
        : { classe: "plein", texte: kvs.length + " KV conformes" };
    }
    if (cle === "presentation") {
      var d = p.presentation;
      if (!d) return { classe: "vide", texte: "non composée" };
      if (d.statut === "presentee") return { classe: "plein", texte: "présentée" };
      var manques = PRESENTATION.controles(p, d).filter(function (c) { return !c.ok; }).length;
      return manques
        ? { classe: "partiel", texte: d.pages.length + " pages · " + manques + (manques > 1 ? " manques" : " manque") }
        : { classe: "plein", texte: d.pages.length + " pages, prête" };
    }
    if (cle === "livrables" || cle === "calendriers") {
      var n = (p.livrables || []).length;
      return n ? { classe: "plein", texte: n + " livrables" } : { classe: "vide", texte: "aucun livrable" };
    }
    if (cle === "pistes") {
      var pistes = (p.sections.pistes || []);
      var retenue = pistes.filter(function (x) { return x.statut === "retenue"; }).length;
      if (!pistes.length) return { classe: "vide", texte: "aucune route" };
      return retenue ? { classe: "plein", texte: "une route retenue" }
        : { classe: "partiel", texte: pistes.length + " en lice, aucune retenue" };
    }
    var e = CHAMPS.etat(cle, p.sections[cle]);
    if (e.fait === 0) return { classe: "vide", texte: "vide" };
    if (e.manquants.length) return { classe: "partiel", texte: e.fait + "/" + e.total + " · " + e.manquants.length + (e.manquants.length > 1 ? " manquants" : " manquant") };
    return { classe: "plein", texte: e.fait + "/" + e.total };
  }

  /* ————————————————————— Nouveau projet ————————————————————— */

  function nouveau() {
    var choixG = "campagne";
    var selG = el("select", {});
    MAISON.gabarits.forEach(function (g) { selG.appendChild(el("option", { value: g.cle }, g.nom)); });
    selG.addEventListener("change", function () { choixG = selG.value; });

    var f = FORM.rendre([
      { cle: "client", nom: "Client", type: "texte", requis: true },
      { cle: "nom", nom: "Nom du projet", type: "texte", requis: true },
      { cle: "ref", nom: "Référence", type: "texte" },
      { cle: "echeance", nom: "Échéance", type: "date" },
    ], {});

    PANNEAU.ouvrir("Nouveau projet", "quatre champs suffisent", el("div", {},
      el("div.champ", {}, el("label", {}, "Gabarit"),
        el("div.indice", {}, "Une demande simple n'a pas huit sections. Le gabarit se choisit maintenant et ne change plus."), selG),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var d = f.valeurs();
          if (!d.nom) { alert("Un projet a un nom."); return; }
          var p = DEPOT.ajoute("projets", {
            ref: d.ref || "PRJ-" + String(DEPOT.liste("projets").length + 1).padStart(4, "0"),
            nom: d.nom, gabarit: choixG, statut: "ouvert", equipe: [],
            sections: { identite: { client: d.client || "", echeance: d.echeance || "" } },
            volets: [], livrables: [],
          });
          PANNEAU.fermer();
          location.hash = "#/projets/" + p.id;
        } }, "Créer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  /* ————————————————————— La vue 360 ————————————————————— */

  function projet(hote, id, section) {
    var p = DEPOT.trouve("projets", id);
    /* Une adresse ne se réécrit jamais toute seule.
     *
     * Au démarrage, l'écran se dessine avant que le dépôt ne soit lu : le
     * dossier n'existait pas encore, et l'adresse était remplacée par la
     * liste. Le dépôt arrivait une seconde plus tard, mais l'adresse demandée
     * était perdue — donc aucun lien profond ne s'ouvrait jamais. On attend
     * plutôt qu'on n'efface : le rendu suivant trouvera le dossier. */
    if (!p) {
      hote.className = "zone";
      O.vider(hote);
      hote.appendChild(el("p.rien", {},
        "Ce dossier n'est pas encore chargé. S'il ne s'affiche pas dans un instant, "
        + "c'est qu'il n'existe pas — ",
        el("a", { href: "#/projets" }, "voir tous les dossiers")));
      return;
    }
    DEPOT.lu("projets", id);

    var g = gabarit(p);
    var courante = section && g.sections.indexOf(section) !== -1 ? section : g.sections[0];
    var blocs = REGLES.blocages(p.id);
    var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
    var infs = window.INFERENCE ? INFERENCE.compte(p) : 0;
    var ident = p.sections.identite || {};
    var rafraichir = function () { projet(hote, id, courante); };

    hote.className = "zone avec-rail";
    O.vider(hote);

    var gauche = el("div", {},
      el("div.projet-entete", {},
        MARQUE.pastille(p, 52),
        el("div.titre", {},
          el("span.ref", { style: { "font-size": "var(--t-micro)", "letter-spacing": ".1em", color: "var(--clair-terne)" } },
            p.ref + " · " + g.nom.toUpperCase()),
          el("h2", {}, p.nom),
          el("div.sous", {}, ident.client || "client non renseigné")
        ),
        etatDuDossier(p, blocs, durs, infs)
      ),

      el("div.bande-meta", { style: { "margin-top": "1rem" } },
        meta("MARCHÉS", marches(p)),
        meta("SUPPORTS", supports(p)),
        meta("ÉCHÉANCE", ident.echeance ? O.joli(ident.echeance) : null),
        meta("DÉCIDEUR FINAL", nomDecideur(p)),
        meta("FENÊTRE", ident.fenetre)
      ),

      chezPeople(p),

      navigateur(p, g, courante, hote),

      el("div", { style: { "margin-top": "1.2rem" } }, corpsSection(p, courante, rafraichir))
    );

    var particulier = courante === "bigidea" ? VUE_BIGIDEA.rail(p) : null;
    var droite = el("div.aside", {},
      particulier,
      blocs.length ? el("div.panneau-lat", {},
        el("h3", {}, "CE QUI BLOQUE ICI", el("span.droite", {}, String(blocs.length))),
        el("div.blocages", {}, blocs.map(function (b) {
          return el("div.blocage", {},
            el("b", {}, b.quoi),
            el("span.quand", {}, b.jours === 0 ? "depuis aujourd'hui" : "depuis " + b.jours + (b.jours > 1 ? " jours" : " jour")),
            b.prix ? el("span.cout", {}, b.prix) : null,
            (b.pieces || []).length
              ? el("button.b.nu", { type: "button", style: { "font-size": "var(--t-micro)", "margin-top": ".25rem" },
                  onclick: function () { lesPieces(p, b, rafraichir); } },
                  "les " + b.pieces.length + " pièces →")
              : null,
            b.type === "infere-non-contresigne"
              ? el("button.b.nu", { type: "button", style: { "font-size": "var(--t-micro)", "margin-top": ".25rem" },
                  onclick: function () { INFERENCE.panneau(p, rafraichir); } }, "faire contresigner →")
              : null
          );
        }))
      ) : el("div.panneau-lat", {}, el("h3", {}, "ÉTAT"), el("div.prix.vert", {}, el("span.signe", {}, "✓"), "Rien ne bloque ce projet.")),
      panneauSante(p, g, durs),
      panneauEquipe(p)
    );

    hote.appendChild(gauche);
    hote.appendChild(droite);
  }

  /* ————————————————————— Le même dossier, chez People ————————————————————— */

  /* Deux systèmes suivent le même travail sous deux références. Tant qu'elles
   * ne se nomment pas l'une l'autre, on compare de mémoire — et c'est comme ça
   * qu'on découvre trois dossiers Ecobank ouverts en parallèle après coup. */
  function chezPeople(p) {
    var x = p.people;
    if (!x) return null;
    var n = (x.refs || []).length;
    return el("div.pe-people" + (n > 1 ? ".multiple" : n ? "" : ".absent"), {},
      el("span.pep-t", {}, "MATANGA PEOPLE"),
      el("span.pep-r", {}, n
        ? (x.refs || []).join("  ·  ") + (x.nom ? "  —  " + x.nom : "")
        : "aucun dossier correspondant"),
      x.note ? el("p.pep-n", {}, x.note) : null);
  }

  /* ————————————————————— L'état du dossier, en une phrase ————————————————————— */

  /* Trois nombres côte à côte ne demandent rien.
   *
   * « 3 blocages · 6 inférés · 189 livrables » se lisent en une seconde et
   * n'appellent aucun geste. C'est exactement ce que la refonte devait
   * retirer : un compteur n'a sa place en tête d'un dossier que s'il provoque
   * une décision — et alors il porte sa conséquence, sinon il rassure à tort.
   *
   * Un seul reste en grand, celui qui coûte le plus cher aujourd'hui. Les
   * autres passent dans la phrase, et disparaissent quand ils valent zéro.
   * La liste des blocages est déjà au rail : ce n'est pas elle qu'on répète,
   * c'est ce qu'elle coûte qu'on dit. */
  function etatDuDossier(p, blocs, durs, infs) {
    var n = (p.livrables || []).filter(function (l) { return !l.annule; }).length;
    /* REGLES.blocages trie du plus ancien au plus récent. */
    var vieux = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; })[0];

    if (durs) {
      return el("div.cotes", {}, el("div.pe-etat.alerte", {},
        el("span.pee-c", {}, String(durs)),
        el("span.pee-n", {}, durs > 1 ? "blocages" : "blocage"),
        /* Le rail les liste déjà tous. Ce qu'on dit ici, c'est ce que coûte
         * celui qui traîne depuis le plus longtemps — et on le nomme, sinon
         * son prix a l'air d'être celui des trois. */
        el("p.pee-q", {},
          (vieux
            ? (durs > 1 ? "Le plus ancien" : "Le seul")
              + (vieux.jours > 0
                  ? ", depuis " + vieux.jours + (vieux.jours > 1 ? " jours" : " jour") : "")
              + " : " + vieux.quoi + ". "
              + (vieux.prix || "")
            : "Rien ne se livre tant qu'ils tiennent.")
          + (infs ? "  " + infs + (infs > 1 ? " champs tiennent" : " champ tient")
              + " en plus sur une hypothèse." : ""))));
    }

    if (infs) {
      return el("div.cotes", {}, el("div.pe-etat.attente", {},
        el("span.pee-c", {}, String(infs)),
        el("span.pee-n", {}, infs > 1 ? "champs inférés" : "champ inféré"),
        el("p.pee-q", {}, "Utilisables pour travailler, pas opposables au client : "
          + "le jour où il conteste, rien ne tient.")));
    }

    return el("div.cotes", {}, el("div.pe-etat.vert", {},
      el("span.pee-c", {}, String(n)),
      el("span.pee-n", {}, n > 1 ? "pièces" : "pièce"),
      el("p.pee-q", {}, n
        ? "Rien ne bloque ce dossier. Ce qui reste est du travail, pas une décision."
        : "Aucune pièce. Une route retenue les engendre — c'est là qu'elles naissent.")));
  }

  /* Un blocage de lot s'ouvre : la liste des pièces qu'il porte, chacune
   * cliquable. Le nombre dirige, la liste exécute. */
  function lesPieces(p, b, rafraichir) {
    var ls = (p.livrables || []).filter(function (l) { return b.pieces.indexOf(l.id) !== -1; });
    PANNEAU.ouvrir(b.quoi, p.ref, el("div", {},
      b.prix ? el("div.prix", {}, el("span.signe", {}, "⚠"), b.prix) : null,
      el("div", { style: { "margin-top": ".7rem" } }, ls.map(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        return UI.fileItem(l, l.nom, m ? m.nom : "", null, function () {
          PANNEAU.fermer(); VUE_LIVRABLE.ouvrir(p, l, rafraichir);
        });
      }))
    ));
  }

  /* ————————————————————— Le navigateur : trois temps, pas dix onglets ————————————————————— */

  /* Dix onglets de même rang qui défilent horizontalement, ça ne se lit pas et
   * ça ne dit rien de l'ordre. Ici : les trois temps du dossier, toujours à la
   * même place, et sous eux les étapes du temps où l'on se trouve. Deux lignes,
   * jamais de défilement. */
  function phases(p, g) {
    return MAISON.phases.map(function (ph) {
      var cles = ph.sections.filter(function (c) { return g.sections.indexOf(c) !== -1; });
      var etats = cles.map(function (c) { return { cle: c, e: etatSection(p, c) }; });
      var pleins = etats.filter(function (x) { return x.e.classe === "plein"; }).length;
      var vides = etats.filter(function (x) { return x.e.classe === "vide"; }).length;
      return {
        ph: ph, cles: cles, etats: etats, pleins: pleins, total: cles.length,
        etat: !cles.length ? "hors" : pleins === cles.length ? "fait"
          : vides === cles.length ? "vierge" : "encours",
        bloque: etats.filter(function (x) { return x.e.classe !== "plein"; })[0] || null,
      };
    }).filter(function (x) { return x.cles.length; });
  }

  function navigateur(p, g, courante, hote) {
    var phs = phases(p, g);
    var ici = phs.filter(function (x) { return x.cles.indexOf(courante) !== -1; })[0] || phs[0];
    var rang = phs.indexOf(ici);

    return el("div.nav-p", {},
      /* Les trois temps. Toujours les mêmes, toujours au même endroit. */
      el("div.np-phases", {}, phs.map(function (x, i) {
        var amont = phs.slice(0, i).filter(function (y) { return y.etat !== "fait"; });
        return el("button.npp." + x.etat + (x === ici ? ".ici" : ""), {
          type: "button",
          title: x.ph.quoi + (amont.length ? "  —  " + x.ph.sans : ""),
          onclick: function () { location.hash = "#/projets/" + p.id + "/" + premierUtile(x); },
        },
          el("span.npp-r", {}, String(i + 1)),
          el("span.npp-c", {},
            el("span.npp-n", {}, x.ph.nom),
            el("span.npp-q", {}, x.etat === "fait" ? x.ph.quoi
              : x.bloque ? nomSection(x.bloque.cle).toLowerCase() + " · " + x.bloque.e.texte
              : x.ph.quoi)),
          el("span.npp-j", {}, x.pleins + "/" + x.total),
          el("span.npp-b", {}, el("i", { style: { width: Math.round((x.pleins / x.total) * 100) + "%" } }))
        );
      })),

      /* Les étapes du temps où l'on est. */
      el("div.np-etapes", {}, ici.etats.map(function (x) {
        return el("button.npe." + x.e.classe + (x.cle === courante ? ".ici" : ""), {
          type: "button",
          onclick: function () { location.hash = "#/projets/" + p.id + "/" + x.cle; },
        }, el("span.npe-n", {}, nomSection(x.cle)),
          el("span.npe-e", {}, x.e.texte));
      })),

      /* Le document qui fait passer au temps suivant. */
      (function () {
        var doc = ici.ph.cle === "cadrer" ? "cadrage" : ici.ph.cle === "concevoir" ? "conception" : null;
        if (!doc) return null;
        var d = COMPILATEUR.DOCS[doc];
        var m = COMPILATEUR.controles(p, doc).filter(function (c) { return !c.ok; }).length;
        return el("div.np-doc" + (m ? ".manque" : ""), {},
          el("div.npd-c", {},
            el("b", {}, d.nom),
            el("span", {}, m
              ? m + (m > 1 ? " manques — " : " manque — ") + d.sans
              : "complet — " + d.ouvre + " peut s'ouvrir")),
          el("button.b" + (m ? ".nu" : ".or"), { type: "button",
            onclick: function () { COMPILATEUR.ouvrir(p, doc, function () { projet(hote, p.id, courante); }); } },
            "ouvrir"));
      })(),

      /* Ce que ce temps coûte s'il démarre sans que l'amont soit fait. */
      (function () {
        var amont = phs.slice(0, rang).filter(function (y) { return y.etat !== "fait"; });
        if (!amont.length) return null;
        return el("div.np-cout", {},
          el("b", {}, amont.map(function (y) { return y.ph.nom.toLowerCase(); }).join(" et ")
            + (amont.length > 1 ? " ne sont pas finis" : " n'est pas fini")),
          el("span", {}, ici.ph.sans));
      })()
    );
  }

  function premierUtile(x) {
    var b = x.etats.filter(function (y) { return y.e.classe !== "plein"; })[0];
    return b ? b.cle : x.cles[0];
  }

  function meta(t, v) {
    return el("div.bloc", {}, el("div.t", {}, t), el("div.v" + (v ? "" : ".vide"), {}, v || "non renseigné"));
  }

  function marches(p) {
    var codes = {};
    (p.livrables || []).forEach(function (l) {
      var m = DEPOT.trouve("marches", l.marche);
      if (m) codes[m.code] = true;
    });
    var liste = Object.keys(codes);
    return liste.length ? liste.join(", ") : null;
  }

  function supports(p) {
    var noms = {};
    (p.livrables || []).forEach(function (l) {
      var s = DEPOT.trouve("supports", l.support);
      if (s) noms[s.nom] = true;
    });
    var liste = Object.keys(noms);
    return liste.length ? liste.join(", ") : null;
  }

  /* Un pourcentage seul rassure, et c'est le pire service qu'un outil puisse
   * rendre. Un dossier à 29 % avec trois blocages ouverts n'est pas à 29 % :
   * il est arrêté. L'avancement est donc toujours subordonné au blocage —
   * c'est écrit dans le plan, et ça n'avait jamais été appliqué ici. */
  function panneauSante(p, g, durs) {
    var total = 0, faits = 0, manquants = [];
    g.sections.forEach(function (cle) {
      if (cle === "livrables" || cle === "calendriers" || cle === "pistes") return;
      var e = CHAMPS.etat(cle, p.sections[cle]);
      total += e.total; faits += e.fait;
      e.manquants.forEach(function (c) { manquants.push(nomSection(cle) + " · " + c.nom); });
    });
    var part = total ? Math.round((faits / total) * 100) : 0;
    var montres = manquants.slice(0, 6);

    return el("div.panneau-lat", {},
      el("h3", {}, "SANTÉ DU DOSSIER", el("span.droite", { style: { color: part === 100 ? "var(--vert)" : "var(--attente)" } }, part + " %")),
      el("div.jauge." + (part === 100 ? "" : part >= 70 ? "limite" : "depasse"), {}, el("i", { style: { width: part + "%" } })),

      el("p.psa-q", {}, durs
        ? "Le chiffre ne veut pas dire que le dossier avance : "
          + durs + (durs > 1 ? " blocages l'arrêtent" : " blocage l'arrête")
          + ", et les remplir tous ne les lèvera pas."
        : part === 100
          ? "Tous les champs critiques sont renseignés, et rien ne bloque."
          : (total - faits) + (total - faits > 1 ? " champs manquent" : " champ manque")
            + " sur " + total + ". Chacun est un endroit où le dossier tient sur "
            + "une hypothèse plutôt que sur un fait."),

      el("div", { style: { "margin-top": ".6rem" } },
        manquants.length
          ? el("div", {}, montres.map(function (m) {
              return el("div.file-item", {}, el("div.fi-corps", {},
                el("div.fi-nom", { style: { color: "var(--attente)", "font-size": "var(--t-eti)" } }, "○ " + m)));
            }).concat(
              /* Une liste coupée en silence se lit comme une liste complète. */
              manquants.length > montres.length
                ? [el("div.psa-reste", {}, "et " + (manquants.length - montres.length)
                    + " autres champs — la section les nomme tous")]
                : []))
          : el("div.prix.vert", {}, el("span.signe", {}, "✓"), "Tous les champs critiques sont renseignés.")
      )
    );
  }

  function panneauEquipe(p) {
    var equipe = p.equipe || [];
    return el("div.panneau-lat", {},
      el("h3", {}, "ÉQUIPE"),
      equipe.length
        ? equipe.map(function (m) {
            var pers = DEPOT.trouve("personnes", m.personne);
            return el("div.file-item", {},
              el("div.vignette.v-mini", {}, el("span.absente", {}, pers ? pers.nom.split(" ").map(function (x) { return x[0]; }).join("") : "?")),
              el("div.fi-corps", {},
                el("div.fi-nom", {}, pers ? pers.nom : "—"),
                el("div.fi-meta", {}, O.poste(m.poste).nom)
              )
            );
          })
        : el("div.prix", {}, el("span.signe", {}, "⚠"), "Aucun DA affecté : " + REGLES.prix("da-absent"))
    );
  }

  /* ————————————————————— Le corps d'une section ————————————————————— */

  function corpsSection(p, cle, rafraichir) {
    var corps = corpsPropre(p, cle, rafraichir);
    if (!VALIDATION.OBJETS[cle]) return corps;
    return el("div", {},
      el("div", { style: { "margin-bottom": ".9rem" } },
        VALIDATION.bande(p, cle, objetValidable(p, cle), rafraichir)),
      corps);
  }



  /* Le client et le décideur viennent du dépôt. Le texte recopié ne sert plus
   * que de secours pour les dossiers d'avant la liaison. */
  function nomClient(p) {
    var i = p.sections.identite || {};
    var c = i.clientId ? DEPOT.trouve("clients", i.clientId) : null;
    return c ? c.nom : (i.client || null);
  }

  function nomDecideur(p) {
    var i = p.sections.identite || {};
    var ct = i.decideurId ? DEPOT.trouve("contacts", i.decideurId) : null;
    if (ct) return ct.nom + (ct.role ? "  ·  " + ct.role : "");
    return i.decideur || null;
  }

  /* Renommer la campagne. Le nom est du dossier, pas d'une section — il n'avait
   * donc aucun geste, et restait figé sur ce qu'on avait tapé à l'ouverture. */
  function renommer(p, rafraichir) {
    var champ = el("input", { type: "text", value: p.nom });
    PANNEAU.ouvrir("Nom de la campagne", p.ref, el("div", {},
      el("p.ch-aide", {}, "Il apparaît partout : la liste des dossiers, le fil, "
        + "les documents compilés. Le changer ne casse aucun lien — la référence "
        + p.ref + " reste l'identité du dossier."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Nom"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var t = champ.value.trim();
          if (!t) { AVIS.refus("Un dossier sans nom ne se retrouve pas."); return; }
          p.nom = t;
          DEPOT.tracer("renommage", "projets", p.id, t);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
    setTimeout(function () { champ.focus(); champ.select(); }, 40);
  }

  /* ————————————————————— 16 · L'identité : un document à signer ————————————————————— */

  /* Une grille de champs uniformes ne dit pas ce qui est reçu et ce qui est
   * supposé — or c'est la seule chose qui compte ici : un champ inféré fait
   * travailler l'équipe, il ne s'oppose à personne. Deux colonnes, et une
   * bande de contreseing en pied qui nomme qui doit signer. */
  function corpsIdentite(p, rafraichir) {
    var def = CHAMPS.section("identite");
    var d = p.sections.identite || {};
    var recus = [], inferes = [], vides = [];

    def.champs.forEach(function (c) {
      var v = d[c.cle];
      var rempli = v !== null && v !== undefined && String(v).trim() !== "";
      if (!rempli) { vides.push(c); return; }
      (INFERENCE.est(p, "identite", c.cle) ? inferes : recus).push({ c: c, v: v });
    });

    var clientele = O.poste("clientele");
    var qui = (p.equipe || []).filter(function (m) { return m.poste === "clientele"; })[0];
    var pe = qui ? DEPOT.trouve("personnes", qui.personne) : null;

    return el("div.id", {},
      el("h3.id-t", {}, inferes.length
        ? inferes.length + (inferes.length > 1 ? " champs tiennent sur une hypothèse" : " champ tient sur une hypothèse")
          + ", " + recus.length + " sont reçus"
        : recus.length + (recus.length > 1 ? " champs reçus" : " champ reçu")
          + ", rien ne tient sur une hypothèse"),
      el("p.id-s", {}, "Ce qui est reçu s'oppose au client. Ce qui est inféré fait "
        + "travailler l'équipe et ne prouve rien — c'est le contreseing qui fait passer "
        + "de la colonne de droite à celle de gauche."),

      el("div.id-g", {},
        el("div.id-col", {},
          el("div.idc-t", {}, "REÇU ET OPPOSABLE",
            el("span", {}, String(recus.length))),
          recus.length
            ? recus.map(function (x) {
                return el("button.id-l", { type: "button", title: "modifier — " + x.c.nom,
                  onclick: function () { editerChamp(p, "identite", x.c.cle, rafraichir); } },
                  el("span.idl-n", {}, x.c.nom),
                  el("span.idl-v", {}, valeurLisible(x.c, x.v)));
              })
            : el("p.rien", {}, "Rien n'est reçu. Tout ce dossier tient sur ce qu'on a supposé.")),

        el("div.id-col.infere", {},
          el("div.idc-t", {}, "INFÉRÉ, NON CONTRESIGNÉ",
            el("span", {}, String(inferes.length))),
          inferes.length
            ? inferes.map(function (x) {
                return el("div.id-l", {},
                  el("button.idl-h", { type: "button", title: "modifier — " + x.c.nom,
                    onclick: function () { editerChamp(p, "identite", x.c.cle, rafraichir); } },
                    el("span.idl-n", {}, x.c.nom),
                    el("span.idl-v", {}, valeurLisible(x.c, x.v))),
                  el("span.idl-p", {}, INFERENCE.pourquoi(p, "identite", x.c.cle)),
                  el("div.idl-g", {},
                    el("button.b.nu", { type: "button", onclick: function () {
                      INFERENCE.contresigner(p, "identite", x.c.cle, pe ? pe.nom : null);
                      DEPOT.enregistrer(); rafraichir();
                    } }, "contresigné →"),
                    el("button.b.nu", { type: "button", onclick: function () {
                      INFERENCE.rejeter(p, "identite", x.c.cle);
                      DEPOT.enregistrer(); rafraichir();
                    } }, "faux, à ressaisir")));
              })
            : el("p.rien", {}, "Aucune hypothèse. Tout ce qui est écrit ici a été reçu."))),

      vides.length
        ? el("div.id-vides", {},
            el("div.idc-t", {}, "NI REÇU NI SUPPOSÉ", el("span", {}, String(vides.length))),
            vides.map(function (c) {
              return el("button.id-v", { type: "button", title: "renseigner — " + c.nom,
                onclick: function () { editerChamp(p, "identite", c.cle, rafraichir); } },
                el("span.idv-n", {}, c.nom),
                el("span.idv-x", {}, c.critique
                  ? REGLES.prix(c.cle === "decideur" ? "decideur-absent"
                      : c.cle === "tueur" ? "tueur-absent"
                      : c.cle === "fenetre" ? "fenetre-absente" : "sans-proprietaire")
                  : "à renseigner — sans quoi la charge de ce dossier reste fausse"));
            }))
        : null,

      /* La bande de contreseing : elle nomme qui doit signer, pas « le client ». */
      el("div.id-sign" + (inferes.length ? ".due" : ".ok"), {},
        el("div.ids-t", {}, inferes.length ? "CONTRESEING DÛ" : "RIEN N'ATTEND DE SIGNATURE"),
        el("div.ids-c", {}, inferes.length
          ? el("p", {}, "Ces " + inferes.length + " champs doivent être confirmés par "
              + (pe ? pe.nom : "la " + clientele.nom)
              + ". Tant qu'ils ne le sont pas, aucune validation obtenue sur ce dossier "
              + "ne tiendra le jour où le client conteste.")
          : el("p", {}, "Tout ce qui est écrit ici est reçu. Les validations obtenues "
              + "sur ce dossier sont opposables.")),
        el("div.ids-g", {},
          inferes.length
            ? el("button.b.or", { type: "button", onclick: function () {
                RENVOI.ouvrir({ quoi: "Contreseing de l'identité — " + inferes.length + " champs",
                  projet: p.ref, projetId: p.id });
              } }, "Écrire la demande de contreseing")
            : null,
          el("button.b", { type: "button", onclick: function () {
            editer(p, "identite", def, rafraichir); } },
            def.poste === MAISON.titulaire ? "Compléter la section" : "Mettre en forme la section")))
    );
  }

  /* Un seul endroit traduit un identifiant en nom : FORM.texte. Deux
   * traductions concurrentes finissent toujours par diverger, et l'une des
   * deux affiche le code. */
  function valeurLisible(c, v) { return FORM.texte(c, v); }

  /* ————————————————————— 19 · La stratégie : une page de prose ————————————————————— */

  /* L'écran le plus court et le plus calme du produit, et c'est très bien. Une
   * liste de champs en faisait un formulaire de plus ; ce sont des énoncés, ils
   * se lisent à la largeur d'une colonne de lecture. */
  function corpsStrategie(p, rafraichir) {
    var def = CHAMPS.section("strategie");
    var d = p.sections.strategie || {};

    return el("div.st", {},
      def.champs.map(function (c) {
        var v = d[c.cle];
        var rempli = Array.isArray(v) ? v.length : (v !== null && v !== undefined && String(v).trim() !== "");
        var infere = INFERENCE.est(p, "strategie", c.cle);

        return el("button.st-e" + (rempli ? "" : ".vide") + (infere ? ".infere" : ""), {
            type: "button", title: "modifier — " + c.nom,
            onclick: function () { editerChamp(p, "strategie", c.cle, rafraichir); } },
          el("div.ste-n", {}, c.nom,
            infere ? el("span.ste-i", {}, "inféré") : null),
          rempli
            ? (Array.isArray(v)
                ? el("ul.ste-l", {}, v.map(function (x) { return el("li", {}, x); }))
                : el("p.ste-v", {}, String(v)))
            : el("p.ste-x", {}, c.requis
                ? "Non écrit. Sans lui, une route ne se juge que par le goût."
                : "Non écrit."),
          infere ? el("p.ste-p", {}, INFERENCE.pourquoi(p, "strategie", c.cle)) : null);
      }),

      el("div.form-actions", {},
        el("button.b.or", { type: "button",
          onclick: function () { editer(p, "strategie", def, rafraichir); } },
          def.poste === MAISON.titulaire ? "Compléter" : "Mettre en forme"))
    );
  }

  function corpsPropre(p, cle, rafraichir) {
    if (cle === "identite") return corpsIdentite(p, rafraichir);
    if (cle === "strategie") return corpsStrategie(p, rafraichir);
    if (cle === "brief") return VUE_BRIEF.rendre(p, rafraichir);
    if (cle === "bigidea") return VUE_BIGIDEA.rendre(p, rafraichir);
    if (cle === "socle") return VUE_SOCLE.rendre(p, rafraichir);
    if (cle === "pistes") return VUE_PISTES.rendre(p, rafraichir);
    if (cle === "atelier") return VUE_ATELIER.rendre(p, rafraichir);
    if (cle === "planche") return VUE_PLANCHE.rendre(p, rafraichir);
    if (cle === "presentation") return VUE_PRESENTATION.rendre(p, rafraichir);
    if (cle === "livrables" || cle === "calendriers") return VUE_MATRICE.rendre(p, rafraichir);

    var def = CHAMPS.section(cle);
    if (!def) return el("p.rien", {}, "Section inconnue.");
    var donnees = p.sections[cle] || {};
    var e = CHAMPS.etat(cle, donnees);
    var monPoste = def.poste === MAISON.titulaire;

    return el("div", {},
      el("div.section-titre", {}, def.nom,
        el("span.compte", {}, "· " + e.fait + " sur " + e.total + " champs"),
        el("span.droite", {}, "propriétaire : " + O.poste(def.poste).nom)),

      e.manquants.length ? el("div.prix", {}, el("span.signe", {}, "⚠"),
        e.manquants.length + (e.manquants.length > 1 ? " champs manquants : " : " champ manquant : ")
        + e.manquants.map(function (c) { return c.nom; }).join(" · ")) : null,

      INFERENCE.compte(p, cle) ? el("div", { style: { margin: ".7rem 0" } }, INFERENCE.bande(p, rafraichir, cle)) : null,

      el("div", { style: { "margin-top": ".8rem" } },
        FORM.lire(def.champs, donnees, { projet: p, section: cle,
          editer: function (k) { editerChamp(p, cle, k, rafraichir); } })),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () { editer(p, cle, def, rafraichir); } },
          monPoste ? "Compléter" : "Mettre en forme"),
        !monPoste ? el("button.b", { type: "button", onclick: function () {
          RENVOI.ouvrir({ quoi: def.nom + " — " + p.ref, projet: p.ref, projetId: p.id, objet: cle });
        } }, "Renvoyer à " + O.poste(def.poste).court) : null
      )
    );
  }

  /* Une section se valide comme un objet : elle porte sa version et son verdict. */
  function objetValidable(p, cle) {
    if (!p.sections[cle]) p.sections[cle] = {};
    return p.sections[cle];
  }


  /* ————————————————————— Modifier un champ, et lui seul ————————————————————— */

  /* Rouvrir le formulaire entier pour corriger une ligne fait relire trente
   * champs pour en changer un. Chaque champ porte donc son propre geste — et
   * quand il est inféré, l'écran dit ce qu'il devient une fois confirmé. */
  function editerChamp(p, cle, champCle, rafraichir) {
    var def = CHAMPS.section(cle);
    if (!def) return;
    var c = def.champs.filter(function (x) { return x.cle === champCle; })[0];
    if (!c) return;

    var monPoste = def.poste === MAISON.titulaire;
    var f = FORM.rendre([c], p.sections[cle] || {}, { frontiere: !monPoste });
    var infere = INFERENCE.est(p, cle, champCle);

    PANNEAU.ouvrir(c.nom, p.ref + "  ·  " + def.nom, el("div", {},
      !monPoste
        ? el("div.prix", {}, el("span.signe", {}, "⚠"),
            "Ce champ appartient à " + O.poste(def.poste).nom
            + ". Vous rangez ce qui vous a été transmis ; le contreseing lui sera demandé.")
        : null,
      infere
        ? el("div.prix", {}, el("span.signe", {}, "◐"),
            "Ce champ tient sur une inférence : « " + INFERENCE.pourquoi(p, cle, champCle)
            + " » L'écrire à la main la remplace par une valeur reçue.")
        : null,
      c.aide ? el("p.ch-aide", {}, c.aide) : null,
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var vals = f.valeurs();
          if (!p.sections[cle]) p.sections[cle] = {};
          p.sections[cle][champCle] = vals[champCle];
          /* Écrire à la main sur un champ inféré, c'est le reprendre : il cesse
           * d'être une hypothèse et redevient une valeur qu'on assume. */
          if (infere) INFERENCE.rejeter(p, cle, champCle);
          DEPOT.tracer("saisie", "projets", p.id, def.nom + " · " + c.nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function editer(p, cle, def, rafraichir) {
    var monPoste = def.poste === MAISON.titulaire;
    var f = FORM.rendre(def.champs, p.sections[cle] || {}, { frontiere: !monPoste });

    PANNEAU.ouvrir((monPoste ? "Compléter — " : "Mettre en forme — ") + def.nom, p.ref, el("div", {},
      !monPoste ? el("div.prix", {}, el("span.signe", {}, "⚠"),
        "Cette section appartient à " + O.poste(def.poste).nom
        + ". Vous rangez ce qui vous a été transmis ; vous n'écrivez pas à sa place. Le contreseing lui sera demandé.") : null,
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          p.sections[cle] = f.valeurs();
          DEPOT.tracer("saisie", "projets", p.id, def.nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        !monPoste ? el("button.b", { type: "button", onclick: function () {
          p.sections[cle] = f.valeurs(); DEPOT.enregistrer(); PANNEAU.fermer();
          RENVOI.ouvrir({ quoi: def.nom + " mis en forme — demande de go final", projet: p.ref, projetId: p.id, objet: cle });
        } }, "Enregistrer et demander le go final") : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  /* Le rail droit dépend de la section ouverte. */
  function railSection(p, cle) {
    if (cle === "bigidea") return VUE_BIGIDEA.rail(p);
    return null;
  }

  return {
    rendre: rendre, titre: "Projets", nomSection: nomSection, etatSection: etatSection,
    sectionsDe: sectionsDe, editerChamp: editerChamp,
    editerSection: function (p, cle, rafraichir) { editer(p, cle, CHAMPS.section(cle), rafraichir); },
  };
})();
