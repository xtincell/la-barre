/* vue-equipe.js — par créatif : ce qu'il a produit, et ce que je lui ai dit.
 *
 * Mode de Constater. C'est ce qui manquait pour tenir la ligne « progression
 * mesurée des créatifs encadrés » sans reconstituer le trimestre de mémoire.
 *
 * L'écran ne note personne. Il donne la matière — et il dit franchement quand
 * elle manque : un créatif jamais affecté à une piste, un cumul échu, un
 * engagement de fiche jamais déposé. C'est là que se trouve mon travail
 * d'encadrement, pas dans les scores.
 */

window.VUE_EQUIPE = (function () {
  var el = O.el;
  var ouverte = null;

  function rendre(hote, rafraichir) {
    var gens = EQUIPE.encadres();
    if (!gens.length) {
      return el("p.rien", {}, "Personne à encadrer à la base. Les postes rattachés à la "
        + "Direction de la Création s'ajoutent dans La maison › Les réglages › L'équipe.");
    }

    var bilans = gens.map(function (p) { return EQUIPE.bilan(p.id); }).filter(Boolean);
    var sansPiste = bilans.filter(function (b) { return b.jamaisSurUnePiste; });
    var enRetard = [];
    bilans.forEach(function (b) {
      EQUIPE.engagements(b.personne.id).forEach(function (x) {
        if (x.etat === "retard" || x.etat === "jamais") enRetard.push({ b: b, x: x });
      });
    });
    var cumulsKO = [];
    bilans.forEach(function (b) {
      EQUIPE.cumuls(b.personne.id).forEach(function (c) {
        if (c.etat !== "encours") cumulsKO.push({ b: b, c: c });
      });
    });

    return el("div.eq", {},
      bande(bilans, sansPiste, enRetard, cumulsKO),
      tableau(bilans, rafraichir)
    );
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(bilans, sansPiste, enRetard, cumulsKO) {
    var avecCritiques = bilans.filter(function (b) {
      return EQUIPE.critiques(b.personne.id).length; }).length;

    return UI.recevabilite(
      "Ai-je de quoi les évaluer ?",
      [
        { quoi: "Chacun a une trace", ok: avecCritiques === bilans.length, poids: 5,
          cout: (bilans.length - avecCritiques)
            + (bilans.length - avecCritiques > 1 ? " personnes n'ont" : " personne n'a")
            + " aucune critique écrite : leur progression ne se mesurera que d'impression" },
        { quoi: "Une piste confiée à chacun", ok: sansPiste.length === 0, poids: 4,
          cout: "aucune piste n'a jamais été confiée à "
            + sansPiste.map(function (b) { return b.personne.nom.split(" ")[0]; }).join(", ")
            + " — c'est un talent qu'on ne détecte pas" },
        { quoi: "Engagements de fiche tenus", ok: enRetard.length === 0, poids: 3,
          cout: enRetard.length + (enRetard.length > 1 ? " engagements récurrents" : " engagement récurrent")
            + " en retard ou jamais déposés — ils sont évalués, et sacrifiés les premiers" },
        { quoi: "Cumuls tenus", ok: cumulsKO.length === 0, poids: 4,
          cout: cumulsKO.length + (cumulsKO.length > 1 ? " cumuls sont échus" : " cumul est échu")
            + " ou sans part déclarée — un cumul permanent est un poste non écrit" },
      ], null, []);
  }

  /* ————————————————————— Le tableau comparable ————————————————————— */

  /* Cinq cartes dépliables rendaient la comparaison impossible : pour savoir
   * qui n'a jamais eu sa chance, il fallait ouvrir cinq fois et se souvenir.
   *
   * Un tableau à colonnes alignées répond d'un regard. La décision réelle
   * n'est pas de lire cinq fiches : c'est de repérer qui n'a rien reçu. */

  var COLONNES = [
    { cle: "propose", nom: "proposé" },
    { cle: "retenu", nom: "retenu" },
    { cle: "repris", nom: "repris" },
    { cle: "critiques", nom: "critiques" },
    { cle: "engagements", nom: "engagements" },
  ];

  function tableau(bilans, rafraichir) {
    return el("div.eqt", {},
      el("div.eqt-h", {},
        el("span.eqth-p", {}, "PERSONNE"),
        COLONNES.map(function (c) { return el("span.eqth-c", {}, c.nom.toUpperCase()); })),

      el("div.eqt-l", {}, bilans.map(function (b) {
        return ligne(b, rafraichir);
      })));
  }

  function ligne(b, rafraichir) {
    var pe = b.personne;
    var ici = ouverte === pe.id;
    var crits = EQUIPE.critiques(pe.id);
    var engs = EQUIPE.engagements(pe.id);
    var cums = EQUIPE.cumuls(pe.id);
    var duus = engs.filter(function (x) { return x.etat === "retard" || x.etat === "jamais"; });
    var manque = ce_qui_manque(b, crits, engs, cums);

    var vals = {
      propose: b.propose.length, retenu: b.retenu.length, repris: b.repris.length,
      critiques: crits.length, engagements: (engs.length - duus.length) + " / " + engs.length,
    };

    return el("div.eqt-r" + (ici ? ".ici" : "") + (manque ? ".manque" : ""), {},
      el("button.eqtr-c", { type: "button",
        onclick: function () { ouverte = ici ? null : pe.id; rafraichir(); } },
        el("span.eqtr-p", {},
          UI.avatar(pe, 32),
          el("span", {},
            el("span.eqtr-n", {}, pe.nom,
              ETAT.pastille(ETAT.seniorite(pe)),
              ETAT.pastille(problemeDeCumul(pe))),
            el("span.eqtr-q", {}, O.poste(pe.poste).nom
              + (cums.length ? "  ·  cumule " + cums.map(function (c) {
                  return c.poste.court + (c.part ? "\u00a0" + c.part + "\u00a0%" : ""); }).join(", ") : "")))),
        COLONNES.map(function (c) {
          var v = vals[c.cle];
          var ton = c.cle === "retenu" && b.retenu.length ? ".vert"
            : c.cle === "repris" && b.repris.length ? ".alerte"
            : c.cle === "critiques" && !crits.length ? ".alerte"
            : c.cle === "engagements" && duus.length ? ".attente" : "";
          return el("span.eqtr-v" + ton, {}, String(v));
        })),

      manque ? el("div.eqtr-m", {}, manque) : null,
      ici ? detail(b, crits, engs, cums, null, rafraichir) : null
    );
  }

  /* Une seule phrase, la plus coûteuse — pas une liste de puces par personne. */
  function ce_qui_manque(b, crits, engs, cums) {
    if (!crits.length) return "aucune critique écrite — sa progression ne se mesurera que d'impression";
    if (b.jamaisSurUnePiste) return "aucune piste ne lui a été confiée — c'est un talent qu'on ne détecte pas";
    var c = cums.filter(function (x) { return x.etat !== "encours"; })[0];
    if (c) return c.cout;
    var e = engs.filter(function (x) { return x.etat === "retard" || x.etat === "jamais"; })[0];
    if (e) return e.e.quoi.toLowerCase() + " — " + (e.etat === "jamais" ? "jamais déposée"
      : "en retard de " + e.retard + (e.retard > 1 ? " jours" : " jour"));
    if (b.charge && b.charge.part > 100) return "au-delà de sa capacité : "
      + b.charge.jours + " j sur " + b.charge.capacite;
    return null;
  }

  /* Sur quoi une relance serait un constat, et sur quoi elle serait un impair. */
  function blocTrace(b) {
    var t = TRACE.dePersonne(b.personne.id);
    if (!t.total) return null;
    var ph = TRACE.phrase(t, b.personne.nom.split(" ")[0]);

    return el("div.eqd-bloc", {},
      el("div.eqdb-t", {}, "SUR QUOI JE PEUX LE RELANCER"),
      el("div.trc-p." + (ph.ton || ""), {}, el("b", {}, ph.t), el("span", {}, ph.q)),
      el("div.trc-g", {},
        chiffre(t.relancables + " / " + t.total, "relançables",
          "responsable et date : la relance est un constat", t.relancables ? "vert" : "attente"),
        t.vu ? chiffre(String(t.vu), "faits, non déposés",
          "le visuel existe, la version manque — mon geste, pas le sien", "attente") : null,
        t.muet ? chiffre(String(t.muet), "sans aucune trace",
          "ni version, ni fichier, ni visuel — c'est là qu'une question se pose", "alerte") : null,
        t.sansDate ? chiffre(String(t.sansDate), "sans date de remise",
          "rien n'est exigible, donc rien n'est en retard", "attente") : null));
  }

  function chiffre(v, nom, quoi, ton) {
    return el("div.trc-c" + (ton ? "." + ton : ""), {},
      el("span.trcc-v", {}, v),
      el("span.trcc-n", {}, nom),
      el("span.trcc-q", {}, quoi));
  }

  /* Ouvert, elle montre la matière — et de quoi la compléter. */
  function detail(b, crits, engs, cums, _hote, rafraichir) {
    var pe = b.personne;
    var ctrl = EQUIPE.controleur(pe);

    return el("div.eqp-detail", {},
      /* La charge, et ce que les cumuls lui prennent. */
      el("div.eqd-bloc", {},
        el("div.eqdb-t", {}, "SA SEMAINE"),
        el("div.eqd-charge", {},
          el("div.eqdc-b", {}, el("i", {
            style: { width: Math.min(100, b.charge.part) + "%" } })),
          el("div.eqdc-t", {}, b.charge.jours + " j sur " + b.charge.capacite
            + (b.charge.cumul ? "  ·  capacité réduite de " + b.charge.cumul + " % par ses cumuls" : "")
            + (b.charge.part > 100 ? "  ·  au-delà du mur : le dépassement se paiera en délai"
               : !b.pieces.length ? "  ·  aucun livrable ne lui est affecté : il n'y a rien à mesurer"
               : ""))),
        cums.length
          ? el("div.eqd-cums", {}, cums.map(function (c) {
              return el("div.eqd-cum." + c.etat, {},
                el("span.eqdc-n", {}, c.poste.nom),
                el("span.eqdc-q", {}, c.cout));
            }))
          : null,
        ctrl ? el("div.eqd-ctrl", {}, "contrôle : " + ctrl.nom) : null),

      /* Ce qu'on a le droit de lui reprocher.
       *
       * C'est le bloc qui protège de l'impair : avant de lire « 0 soumis »
       * comme un défaut, il faut savoir combien de ses livrables sont seulement
       * non instrumentés — et sur combien une relance serait un constat plutôt
       * qu'une impression. */
      blocTrace(b),

      /* Ce que sa fiche lui impose, avec son échéance. */
      el("div.eqd-bloc", {},
        el("div.eqdb-t", {}, "CE QUE SA FICHE LUI IMPOSE"),
        engs.length
          ? el("div.eqd-engs", {}, engs.map(function (x) {
              return el("div.eqd-eng." + x.etat, {},
                el("span.eqde-n", {}, x.e.quoi),
                el("span.eqde-r", {}, x.e.rythme),
                el("span.eqde-t", {}, x.texte),
                el("button.b.nu", { type: "button", onclick: function () {
                  EQUIPE.deposer(pe.id, x.e.quoi, rafraichir);
                } }, "déposé"));
            }))
          : el("p.rien", {}, "Sa fiche ne porte aucun engagement récurrent.")),

      /* Ce qu'il a porté. */
      b.propose.length
        ? el("div.eqd-bloc", {},
            el("div.eqdb-t", {}, "SES PROPOSITIONS",
              el("span", {}, b.retenu.length
                ? b.retenu.length + " sur " + b.propose.length + " ont été retenus"
                : "aucun retenu sur " + b.propose.length)),
            el("div.eqd-prod", {}, b.propose.slice(0, 8).map(function (x) {
              var pris = b.retenu.some(function (r) { return r.objet === x.objet; });
              var ecarte = x.objet.statut === "ecartee";
              return el("div.eqd-pr" + (pris ? ".retenu" : ""), {},
                el("span.eqdp-t", {}, x.type === "piste" ? "piste" : "idée"),
                el("span.eqdp-n", {}, String(x.nom).slice(0, 80)),
                el("span.eqdp-e", {}, pris ? "retenue — elle fait autorité"
                  : ecarte ? "écartée — le motif est écrit"
                  : x.type === "piste" ? "en lice — rien ne se produit tant qu'aucune ne l'emporte"
                  : "en lice — non arbitrée, elle ne compte dans aucun indicateur"));
            })))
        : null,

      /* Ce que je lui ai dit — la seule chose qui rend l'entretien tenable. */
      el("div.eqd-bloc", {},
        el("div.eqdb-t", {}, "CE QUE JE LUI AI DIT",
          el("span", {}, crits.length
            ? crits.length + (crits.length > 1 ? " traces datées" : " trace datée")
            : "aucune trace"),
          el("button.b.nu", { type: "button", onclick: function () { noter(pe, rafraichir); } },
            "+ noter")),
        crits.length
          ? el("div.eqd-crits", {}, crits.slice(0, 10).map(function (c) {
              return el("div.eqd-cr." + c.ton, {},
                el("div.eqdc-h", {},
                  el("span.eqdc-d", {}, O.joli(c.quand)),
                  el("span.eqdc-s", {}, c.source),
                  c.projet ? el("span.eqdc-p", {}, c.projet.ref) : null),
                el("div.eqdc-q", {}, c.quoi),
                el("div.eqdc-m", {}, c.motif));
            }))
          : UI.banniere("rouge", "Aucune trace. « Critiquer le travail, jamais la personne — "
              + "toujours en expliquant pourquoi » est une ligne de ma grille : sans écrit, "
              + "elle n'est pas vérifiable, et sa progression ne se mesure pas."))
    );
  }

  function problemeDeCumul(pe) {
    var e = ETAT.cumul(pe);
    return e && e.ton !== "terne" ? e : null;
  }

  function nombre(n, t, ton) {
    return el("span.eqp-nb" + (ton ? "." + ton : ""), {},
      el("b", {}, String(n)), el("span", {}, t));
  }

  /* ————————————————————— Noter une remarque ————————————————————— */

  function noter(pe, rafraichir) {
    var quoi = el("input", { type: "text", placeholder: "Sur quoi — un livrable, une piste, une attitude" });
    var texte = el("textarea", { rows: 3, placeholder: "Ce que je lui ai dit, et pourquoi" });
    var selT = el("select", {});
    [["note", "Une observation"], ["retenu", "Ce qui a bien marché"],
     ["ecarte", "Ce qui doit changer"]].forEach(function (x) {
      selT.appendChild(el("option", { value: x[0] }, x[1]));
    });
    var selP = el("select", {});
    selP.appendChild(el("option", { value: "" }, "— hors dossier —"));
    DEPOT.liste("projets").forEach(function (p) {
      selP.appendChild(el("option", { value: p.id }, p.ref + " · " + p.nom));
    });

    PANNEAU.ouvrir("Noter — " + pe.nom, O.poste(pe.poste).nom, el("div", {},
      UI.banniere("", "Ce qui est déjà un verdict n'a pas besoin d'être noté : il remonte "
        + "tout seul. Ici on pose ce qui s'est dit en revue et qui, sinon, n'existera "
        + "nulle part au moment de l'entretien."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Sur quoi"), quoi),
        el("div.champ", {}, el("label", {}, "De quel ordre"), selT),
        el("div.champ", {}, el("label", {}, "Le dossier"), selP),
        el("div.champ", {}, el("label", {}, "Ce que j'ai dit"),
          el("div.indice", {}, "Le travail, jamais la personne — et toujours le pourquoi."), texte)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!texte.value.trim()) {
            AVIS.refus("Une critique sans motif écrit n'est pas une critique."); return;
          }
          EQUIPE.noter(pe.id, quoi.value.trim() || "en revue", texte.value.trim(),
            selT.value, selP.value || null);
          PANNEAU.fermer(); rafraichir();
        } }, "Noter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  return { rendre: rendre };
})();
