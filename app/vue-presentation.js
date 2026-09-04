/* vue-presentation.js — le dossier de présentation, engendré et présenté.
 *
 * C'est la pièce qui porte la décision du client. Elle ne se saisit pas : elle
 * se compose depuis le projet, et chaque page dit d'où elle tire ce qu'elle
 * montre. Une page dont la source est vide ne s'invente pas — elle affiche sa
 * dette, et le bouton qui la comble.
 *
 * Après la séance, les retours ne restent pas dans un compte rendu : ils
 * redescendent sur la pièce qu'ils visent.
 */

window.VUE_PRESENTATION = (function () {
  var el = O.el;

  function pres(p) {
    if (!p.presentation) p.presentation = PRESENTATION.creer(p);
    return p.presentation;
  }

  function rendre(p, rafraichir) {
    var d = pres(p);
    return el("div.pr", {},
      bande(p, d, rafraichir),
      d.statut === "presentee" ? apresSeance(p, d, rafraichir) : null,
      /* Le montage client n'est pas le dossier moins quelques pages : c'est un
       * choix, et le choix doit être visible. À gauche ce qui part dans son
       * ordre de lecture, à droite ce qu'on retire — pour qu'on sache ce qu'on
       * ne dit pas, et qu'on puisse le défendre si on le demande. */
      el("div.pr-deux", {},
        el("div.prd-c", {},
          el("div.prd-t", {}, "CE QUI PART CHEZ LE CLIENT",
            el("span", {}, d.pages.length + (d.pages.length > 1 ? " pages" : " page"))),
          pages(p, d, rafraichir)),
        registreRetire(p))
    );
  }

  /* ————————————————————— Ce qui ne part pas ————————————————————— */

  /* Rien de tout cela n'est caché : c'est de l'interne, et l'interne ne se
   * présente pas. Mais un directeur doit savoir ce qu'il ne montre pas — c'est
   * exactement ce qu'on lui demandera en séance. */
  function registreRetire(p) {
    var out = [];

    var ecartees = (p.sections.pistes || []).filter(function (x) { return x.statut === "ecartee"; });
    if (ecartees.length) {
      out.push({ quoi: ecartees.length + (ecartees.length > 1 ? " routes écartées" : " route écartée"),
        detail: ecartees.map(function (x) { return x.titre; }).join(", "),
        pourquoi: "on ne présente pas ce qu'on a refusé — mais le motif reste "
          + "au dossier, et c'est lui qui rend la recommandation défendable." });
    }

    var motifs = (p.sections.pistes || []).filter(function (x) { return x.motif; }).length;
    if (motifs) {
      out.push({ quoi: motifs + (motifs > 1 ? " motifs d'arbitrage" : " motif d'arbitrage"),
        detail: null,
        pourquoi: "le client reçoit la recommandation, pas la délibération. "
          + "Le motif sert en interne, et en jurisprudence." });
    }

    var sacrifices = (p.sections.pistes || []).filter(function (x) { return x.sacrifice; }).length;
    if (sacrifices) {
      out.push({ quoi: sacrifices + (sacrifices > 1 ? " sacrifices écrits" : " sacrifice écrit"),
        detail: null,
        pourquoi: "ce à quoi chaque route renonce se dit à l'oral si on le demande. "
          + "Écrit sur une planche, il se lit comme un aveu de faiblesse." });
    }

    var charge = (p.livrables || []).reduce(function (n, l) {
      return n + (Number(l.estime) || 0); }, 0);
    if (charge) {
      out.push({ quoi: O.decimal(charge) + " jours de charge estimée",
        detail: (p.livrables || []).length + " pièces",
        pourquoi: "la Création s'engage sur une date, jamais sur un prix. "
          + "La charge est une donnée de production, pas un argument client." });
    }

    var budget = (p.sections.identite || {}).budget;
    if (budget) {
      out.push({ quoi: "le budget au dossier",
        detail: O.milliers(budget) + " FCFA",
        pourquoi: "il vient de la Clientèle et repart par elle. Le montrer ici, "
          + "c'est engager la Création sur un chiffre qui n'est pas le sien." });
    }

    var infs = window.INFERENCE ? INFERENCE.compte(p) : 0;
    if (infs) {
      out.push({ quoi: infs + (infs > 1 ? " champs inférés" : " champ inféré"),
        detail: null,
        pourquoi: "utilisables pour travailler, pas opposables. Les présenter "
          + "comme reçus, c'est faire valider une hypothèse pour un fait." });
    }

    var blocs = REGLES.blocages(p.id).filter(function (b) {
      return b.type !== "infere-non-contresigne"; });
    if (blocs.length) {
      out.push({ quoi: blocs.length + (blocs.length > 1 ? " blocages ouverts" : " blocage ouvert"),
        detail: blocs.map(function (b) { return b.quoi; }).slice(0, 2).join("  ·  "),
        pourquoi: "ce sont nos manques, pas les siens. Ils se règlent avant la "
          + "séance, ou ils se disent à l'oral — jamais sur une planche." });
    }

    var frontiere = (p.sections.brief || {}).contraintes;
    if (frontiere) {
      out.push({ quoi: "la clause de frontière du brief",
        detail: null,
        pourquoi: "elle protège la Création de l'amont. C'est un document de "
          + "gouvernance interne, il n'a rien à faire dans une présentation." });
    }

    return el("div.prd-c.retire", {},
      el("div.prd-t", {}, "CE QUI EST RETIRÉ",
        el("span", {}, out.length + (out.length > 1 ? " registres" : " registre"))),
      out.length
        ? el("div.pr-ret", {}, out.map(function (x) {
            return el("div.prr", {},
              el("span.prr-q", {}, x.quoi),
              x.detail ? el("span.prr-d", {}, x.detail) : null,
              el("span.prr-p", {}, x.pourquoi));
          }))
        : el("p.rien", {}, "Rien n'est retiré : ce dossier ne porte encore ni charge, "
            + "ni arbitrage, ni frontière écrite. Le montage client est le dossier."),
      el("p.prd-x", {}, "Le montage client n'est pas le dossier amputé : c'est un "
        + "document destiné à une séance. Ce qui est ici se dit à l'oral si on le "
        + "demande, jamais sur une planche.")
    );
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(p, d, rafraichir) {
    var controles = PRESENTATION.controles(p, d);
    var vides = d.pages.filter(function (pg) { return !PRESENTATION.contenu(p, pg); }).length;
    if (vides) {
      controles = controles.concat([{ quoi: "Pages alimentées", ok: false, poids: 3,
        cout: vides + (vides > 1 ? " pages tirent d'une source vide" : " page tire d'une source vide") }]);
    }

    return UI.recevabilite(
      d.statut === "presentee" ? "Présentée le " + O.joli((d.seance || {}).date) : "Cette présentation peut-elle partir ?",
      controles, null,
      [
        { nom: "Présenter", fort: true, quand: function () { presenter(p, d, rafraichir); } },
        { nom: "Ajouter une page", quand: function () { ajouterPage(p, d, rafraichir); } },
        { nom: d.niveau === "ambitieux" ? "Revenir au minimum client" : "Passer en pitch ambitieux",
          quand: function () { regenerer(p, d, rafraichir); } },
        { nom: "Imprimer", doux: true, quand: function () { window.print(); } },
      ]);
  }

  function regenerer(p, d, rafraichir) {
    var niveau = d.niveau === "ambitieux" ? "minimum" : "ambitieux";
    var neuves = PRESENTATION.creer(p, niveau).pages;
    var gain = neuves.length - d.pages.length;
    var def = PRESENTATION.NIVEAUX[niveau];
    PANNEAU.ouvrir("Régénérer la présentation", p.ref, el("div", {},
      UI.banniere("", "Passer en « " + def.nom + " » : " + def.quoi
        + ". Le client reçoit à minima l'idée et deux ou trois KV — au-delà, on montre du travail qu'on n'a pas encore vendu."),
      el("div.stats", {},
        UI.stat("AUJOURD'HUI", String(d.pages.length), d.pages.length > 1 ? "pages" : "page", ""),
        UI.stat("APRÈS", String(neuves.length), neuves.length > 1 ? "pages" : "page", ""),
        UI.stat("ÉCART", (gain > 0 ? "+" : "") + gain,
          gain === 0 ? "rien ne change" : gain > 0 ? "pages gagnées" : "pages perdues",
          gain < 0 ? "alerte" : "")
      ),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          d.pages = neuves; d.niveau = niveau;
          DEPOT.tracer("régénération", "presentation", p.id,
            def.nom + " — " + neuves.length + " pages");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Régénérer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* ————————————————————— Les pages ————————————————————— */

  function pages(p, d, rafraichir) {
    return el("div.pr-pages", {}, d.pages.map(function (pg, i) {
      var t = PRESENTATION.TYPES[pg.type] || { nom: pg.type, tire: "" };
      var c = PRESENTATION.contenu(p, pg);

      return el("div.pr-p" + (c ? "" : ".dette"), {},
        el("div.prp-rang", {}, String(i + 1)),
        el("div.prp-corps", {},
          el("div.prp-tete", {},
            el("span.prp-type", {}, t.nom),
            el("span.prp-tire", {}, "tire " + t.tire)
          ),
          c ? apercu(p, pg, c) : el("div.prp-vide", {},
            el("span", {}, "La source est vide. Cette page ne montrerait rien."),
            el("button.b.nu", { type: "button", onclick: function () { combler(p, pg, rafraichir); } }, "Combler"))
        ),
        el("div.prp-gestes", {},
          el("button.b.nu", { type: "button", title: "monter", disabled: i === 0 ? true : null,
            onclick: function () { bouger(p, d, i, -1, rafraichir); } }, "↑"),
          el("button.b.nu", { type: "button", title: "descendre", disabled: i === d.pages.length - 1 ? true : null,
            onclick: function () { bouger(p, d, i, 1, rafraichir); } }, "↓"),
          el("button.b.nu", { type: "button", title: "retirer", onclick: function () {
            d.pages.splice(i, 1); DEPOT.enregistrer(); rafraichir();
          } }, "✕")
        )
      );
    }));
  }

  function bouger(p, d, i, sens, rafraichir) {
    var j = i + sens;
    if (j < 0 || j >= d.pages.length) return;
    var x = d.pages[i]; d.pages[i] = d.pages[j]; d.pages[j] = x;
    DEPOT.enregistrer(); rafraichir();
  }

  /* L'aperçu d'une page dans la liste : ce qu'elle montrera, en petit. */
  function apercu(p, pg, c) {
    if (pg.type === "planche" || pg.type === "mockup") {
      var items = pg.type === "planche" ? c.cases : c.mockups;
      return el("div.prp-grille", {}, items.slice(0, 8).map(function (x) {
        var objet = pg.type === "planche" ? x.livrable : x.mockup;
        return el("div.prp-c", {}, IMAGE.vignette(objet, "case"),
          el("span", {}, pg.type === "planche" ? x.etiquette : (x.mockup.contexte || x.livrable.nom)));
      }).concat(items.length > 8 ? [el("div.prp-plus", {}, "+" + (items.length - 8))] : []));
    }
    if (pg.type === "livrables") {
      return el("div.prp-l", {}, String(c.lignes.length) + (c.lignes.length > 1 ? " livrables · " : " livrable · ")
        + c.lignes.slice(0, 4).map(function (x) { return x.nom; }).join(" · ")
        + (c.lignes.length > 4 ? "…" : ""));
    }
    if (pg.type === "calendrier") {
      return el("div.prp-l", {}, c.jalons.length + (c.jalons.length > 1 ? " jalons, du " : " jalon, le ")
        + O.joli(c.jalons[0].date) + (c.jalons.length > 1 ? " au " + O.joli(c.jalons[c.jalons.length - 1].date) : ""));
    }
    return el("div.prp-l", {}, el("b", {}, c.titre || ""),
      c.phrase || c.corps ? el("span", {}, " — " + String(c.phrase || c.corps).slice(0, 120)) : null);
  }

  /* Combler : on renvoie vers la section propriétaire, jamais on n'écrit à sa place. */
  function combler(p, pg, rafraichir) {
    var vers = { probleme: "brief", strategie: "strategie", idee: "bigidea",
      route: "pistes", planche: "livrables", mockup: "livrables",
      livrables: "livrables", calendrier: "livrables", titre: "identite", suite: "identite" };
    var cle = vers[pg.type] || "identite";
    location.hash = "#/projets/" + p.id + "/" + cle;
  }

  function ajouterPage(p, d, rafraichir) {
    var choix = el("div.pr-choix");
    Object.keys(PRESENTATION.TYPES).forEach(function (t) {
      var def = PRESENTATION.TYPES[t];
      choix.appendChild(el("button.pr-ch", { type: "button", onclick: function () {
        var pg = { type: t };
        if (t === "planche" && (p.volets || []).length) pg.voletId = p.volets[0].id;
        if (t === "route" && (p.sections.pistes || []).length) pg.pisteId = p.sections.pistes[0].id;
        d.pages.push(pg);
        DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
      } }, el("b", {}, def.nom), el("span", {}, def.tire)));
    });
    PANNEAU.ouvrir("Ajouter une page", p.ref, choix);
  }

  /* ————————————————————— Présenter ————————————————————— */

  function presenter(p, d, rafraichir) {
    var i = 0;
    var scene = el("div.pr-scene");
    var toile = el("div.pr-toile");
    var pied = el("div.pr-pied");
    scene.appendChild(toile);
    scene.appendChild(pied);

    function dessiner() {
      O.vider(toile);
      O.vider(pied);
      var pg = d.pages[i];
      toile.appendChild(page(p, pg));
      pied.appendChild(el("div.prp-fil", {}, d.pages.map(function (x, j) {
        return el("button.prf-p" + (j === i ? ".actif" : ""), { type: "button",
          onclick: function () { i = j; dessiner(); } });
      })));
      pied.appendChild(el("div.prp-cmd", {},
        el("span", {}, (i + 1) + " / " + d.pages.length),
        el("button.b.nu", { type: "button", onclick: function () { if (i > 0) { i--; dessiner(); } } }, "←"),
        el("button.b.nu", { type: "button", onclick: function () { if (i < d.pages.length - 1) { i++; dessiner(); } } }, "→"),
        el("button.b", { type: "button", onclick: function () { fermer(); seance(p, d, rafraichir); } }, "Fin de séance"),
        el("button.b.nu", { type: "button", onclick: fermer }, "Fermer")
      ));
    }

    function touche(e) {
      if (e.key === "ArrowRight" || e.key === " ") { if (i < d.pages.length - 1) { i++; dessiner(); } e.preventDefault(); }
      else if (e.key === "ArrowLeft") { if (i > 0) { i--; dessiner(); } e.preventDefault(); }
      else if (e.key === "Escape") fermer();
    }

    function fermer() {
      document.removeEventListener("keydown", touche);
      if (scene.parentNode) document.body.removeChild(scene);
    }

    document.addEventListener("keydown", touche);
    dessiner();
    document.body.appendChild(scene);
  }

  /* ————————————————————— Une page, en grand ————————————————————— */

  function page(p, pg) {
    var c = PRESENTATION.contenu(p, pg);
    if (!c) return el("div.pg.pg-vide", {}, el("div.pg-t", {}, "Page sans source"),
      el("div.pg-s", {}, "Rien à montrer ici. Elle ne devrait pas être dans le dossier."));

    if (pg.type === "titre") {
      return el("div.pg.pg-titre", {},
        c.visuel ? el("div.pg-fond", {}, IMAGE.vignette(c.visuel, "toile")) : null,
        el("div.pg-t", {}, c.titre),
        c.sous ? el("div.pg-s", {}, c.sous + (c.note ? " · " + c.note : "")) : null);
    }

    if (pg.type === "idee") {
      return el("div.pg.pg-idee", {},
        el("div.pg-eti", {}, "L'idée"),
        el("div.pg-phrase", {}, c.phrase || "—"),
        c.signature ? el("div.pg-sign", {}, "« " + c.signature + " »") : null,
        c.corps ? el("div.pg-corps", {}, c.corps) : null,
        c.note ? el("div.pg-note", {}, c.note) : null);
    }

    if (pg.type === "route") {
      return el("div.pg.pg-route", {},
        el("div.pg-gauche", {}, IMAGE.vignette(c.visuel, "toile")),
        el("div.pg-droite", {},
          el("div.pg-eti", {}, "Route" + (c.statut === "retenue" ? " · retenue" : "")),
          el("div.pg-t", {}, c.titre),
          c.corps ? el("div.pg-corps", {}, c.corps) : null,
          el("div.pg-blocs", {}, (c.blocs || []).map(function (b) {
            return el("div.pg-b", {}, el("div.t", {}, b.t), el("div.v", {}, b.v));
          })),
          c.note ? el("div.pg-note", {}, c.note) : null));
    }

    if (pg.type === "planche") {
      return el("div.pg.pg-planche", {},
        el("div.pg-eti", {}, c.titre),
        el("div.pg-grille", {}, c.cases.map(function (x) {
          return el("div.pgc", {}, IMAGE.vignette(x.livrable, "carte"),
            el("div.pgc-l", {}, x.etiquette),
            el("div.pgc-m", {}, x.langue + (x.livrable.kv && x.livrable.kv.copy ? " · " + x.livrable.kv.copy : "")));
        })));
    }

    if (pg.type === "mockup") {
      return el("div.pg.pg-mockup", {},
        el("div.pg-eti", {}, c.titre),
        el("div.pg-grille", {}, c.mockups.map(function (x) {
          return el("div.pgc", {}, IMAGE.vignette(x.mockup, "grande"),
            el("div.pgc-l", {}, x.mockup.contexte || x.livrable.nom));
        })));
    }

    if (pg.type === "livrables") {
      return el("div.pg.pg-liste", {},
        el("div.pg-eti", {}, c.titre),
        el("table.pg-tab", {}, el("tbody", {}, c.lignes.map(function (x) {
          return el("tr", {}, el("td", {}, x.nom), el("td", {}, x.support),
            el("td", {}, x.marche), el("td", {}, x.format || "format à poser"));
        }))));
    }

    if (pg.type === "calendrier") {
      return el("div.pg.pg-liste", {},
        el("div.pg-eti", {}, c.titre),
        el("table.pg-tab", {}, el("tbody", {}, c.jalons.map(function (j) {
          return el("tr", {}, el("td", {}, O.joli(j.date)), el("td", {}, j.nom),
            el("td", {}, j.fait ? "fait" : "à venir"));
        }))));
    }

    if (pg.type === "suite") {
      return el("div.pg.pg-suite", {},
        el("div.pg-eti", {}, c.titre),
        el("div.pg-deux", {},
          el("div", {}, el("div.t", {}, "Ce qui se valide aujourd'hui"),
            el("ul", {}, c.valide.map(function (x) { return el("li", {}, x); }))),
          el("div", {}, el("div.t", {}, "Ce qui ne se valide pas encore"),
            el("ul.gris", {}, c.pasValide.map(function (x) { return el("li", {}, x); })))),
        c.decideur ? el("div.pg-note", {}, "Décideur : " + c.decideur)
          : el("div.pg-note.alerte", {}, "Aucun décideur nommé — cette validation ne prendra pas effet."));
    }

    /* problème, stratégie : même forme. */
    return el("div.pg.pg-texte", {},
      el("div.pg-eti", {}, c.titre),
      c.corps ? el("div.pg-corps", {}, c.corps) : null,
      el("div.pg-blocs", {}, (c.blocs || []).filter(function (b) { return b.v; }).map(function (b) {
        return el("div.pg-b", {}, el("div.t", {}, b.t), el("div.v", {}, b.v));
      })));
  }

  /* ————————————————————— La séance et ce qu'elle laisse ————————————————————— */

  function seance(p, d, rafraichir) {
    var f = FORM.rendre([
      { cle: "date", nom: "Date de la séance", type: "date" },
      { cle: "presents", nom: "Qui était là", type: "puces", aide: "Un par ligne. Le décideur en premier." },
      { cle: "verdict", nom: "Ce qui est ressorti", type: "long" },
    ], { date: O.jour() });

    PANNEAU.ouvrir("Fin de séance", p.ref, el("div", {},
      UI.banniere("", "Ce qui n'est pas enregistré ici n'existe pas. Un retour dit à l'oral et non écrit reviendra, plus tard, comme un reproche."),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          PRESENTATION.enregistrerSeance(d, f.valeurs());
          DEPOT.tracer("séance", "presentation", p.id, "présentation tenue");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer la séance"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Plus tard"))
    ));
  }

  function apresSeance(p, d, rafraichir) {
    var s = d.seance || {};
    var sansCible = (d.retours || []).filter(function (r) { return !r.livrableId; }).length;

    return el("div.pr-apres", {},
      el("div.pra-tete", {},
        el("div", {}, el("b", {}, "Séance du " + O.joli(s.date)),
          el("span.pra-q", {}, (s.presents || []).join(" · ") || "personne n'est nommé")),
        el("button.b", { type: "button", onclick: function () { retour(p, d, rafraichir); } }, "+ retour de séance")
      ),
      s.verdict ? el("div.pra-v", {}, s.verdict) : null,

      (d.retours || []).length
        ? el("div.pra-l", {}, d.retours.map(function (r) {
            var l = r.livrableId ? (p.livrables || []).filter(function (x) { return x.id === r.livrableId; })[0] : null;
            return el("div.pra-r", {},
              el("span.prar-t", {}, r.texte),
              el("span.prar-c", {}, l ? "→ " + l.nom : "sans cible"));
          }))
        : el("p.rien", {}, "Aucun retour enregistré."),

      sansCible
        ? UI.banniere("", sansCible + (sansCible > 1 ? " retours n'ont pas de pièce" : " retour n'a pas de pièce")
            + " : il ne se traitera nulle part. Rattache-le à un livrable.")
        : null
    );
  }

  function retour(p, d, rafraichir) {
    var champ = el("textarea", { rows: 2, placeholder: "Ce que le client a dit, en une phrase" });
    var sel = el("select", {});
    sel.appendChild(el("option", { value: "" }, "— sans pièce visée —"));
    (p.livrables || []).filter(function (l) { return !l.annule; }).forEach(function (l) {
      sel.appendChild(el("option", { value: l.id }, l.nom));
    });

    PANNEAU.sur("Retour de séance", p.ref, el("div", {},
      UI.banniere("", "Un retour rattaché à une pièce y descend comme annotation — il se traite là où le travail se fait, pas dans un compte rendu que personne ne rouvre."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Le retour"), champ),
        el("div.champ", {}, el("label", {}, "Sur quelle pièce"), sel)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Un retour sans texte n'est pas un retour."); return; }
          PRESENTATION.poserRetour(p, d, { texte: champ.value.trim(), livrableId: sel.value || null,
            quand: new Date().toISOString() });
          DEPOT.tracer("retour de séance", "presentation", p.id, champ.value.trim().slice(0, 40));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { rendre: rendre, page: page, presenter: presenter, pres: pres };
})();
