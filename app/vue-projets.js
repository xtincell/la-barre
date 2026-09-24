/* vue-projets.js — la liste, puis la vue 360 d'un projet. */

window.VUE_PROJETS = (function () {
  var el = O.el;

  var NOMS = {
    identite: "Identité", brief: "Brief", briefback: "Brief-back", socle: "Plateforme de marque",
    strategie: "Stratégie", bigidea: "Big idea", pistes: "Pistes créatives",
    atelier: "Séance de créa", planche: "Déclinaisons", livrables: "Livrables", calendriers: "Calendriers",
    livraison: "Planche de livraison",
    presentation: "Présentation",
  };

  function nomSection(cle) { return NOMS[cle] || cle; }

  function gabarit(p) {
    var g = null;
    return NATURE.de(p);
  }

  /* ————————————————————— Mes engagements ————————————————————— */

  /* Deux lectures de la même question — « où en est chaque chose ? ».
   *
   * Par défaut, ce qui ne tient pas : c'est le lundi, et ça ne change pas.
   * Par marque, l'arbre : la marque, son rythme, ses campagnes, ses projets.
   * C'est la seule façon de répondre à « qu'a-t-on fait à cette marque, et
   * qu'est-ce qui tourne en ce moment » sans ouvrir douze dossiers.
   *
   * Une intention, deux lentilles — le produit fait déjà ça dans Décider et
   * dans Constater. Aucune destination de plus. */
  var LENTILLES = [
    { cle: "defaut", nom: "CE QUI NE TIENT PAS", quoi: "classé par ce qui bloque, pas par date" },
    { cle: "marque", nom: "PAR MARQUE", quoi: "la marque, son rythme, ses campagnes" },
  ];
  var LENTILLE = "defaut";

  function rendre(hote, projetId, section) {
    if (!projetId && window.VUE_STUDIO) return VUE_STUDIO.projets(hote);
    if (projetId === "marques") { projetId = null; LENTILLE = "marque"; }
    if (projetId && /^MQ-/.test(projetId)) return marcheDeMarque(hote, projetId);
    if (projetId && /^CMP-/.test(projetId)) return ecranCampagne(hote, projetId);
    if (projetId) return projet(hote, projetId, section);

    var projets = DEPOT.liste("projets");
    hote.className = "zone dossiers";
    O.vider(hote);

    if (!projets.length) {
      hote.appendChild(el("p.rien", {},
        "Aucun projet pour le moment."));
      hote.appendChild(el("button.b.or", { type: "button", onclick: nouveau }, "Créer un projet"));
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

    /* Les dossiers clos sortent de la liste vivante et se replient sous leur
     * compte. Ce n'est pas cosmétique : à cent quarante campagnes ingérées,
     * l'écran de travail devient un annuaire, et la question qu'il pose —
     * « qu'est-ce qui ne tient pas aujourd'hui » — n'a plus de place où
     * s'afficher. L'historique reste à un clic, et il est entier. */
    var closes = lignes.filter(function (x) { return window.CLOTURE && CLOTURE.est(x.p); });
    lignes = lignes.filter(function (x) { return !(window.CLOTURE && CLOTURE.est(x.p)); });

    var tiennent = lignes.filter(function (x) { return x.rang === 2; }).length;
    var enDefaut = lignes.length - tiennent;

    hote.appendChild(el("div.dl", {},
      el("div.dl-h", {},
        el("div", {},
          el("h2.dl-t", {}, titre(tiennent, enDefaut, lignes)),
          el("p.dl-s", {}, "Classés par ce qui ne tient pas, pas par date. "
            + "Ce que j'ai promis, et ce que je peux tenir.")),
        el("div", {},
          el("div.dl-lent", {}, LENTILLES.map(function (l) {
            return el("button.pld" + (LENTILLE === l.cle ? ".actif" : ""), { type: "button",
              title: l.quoi,
              onclick: function () { LENTILLE = l.cle; rendre(hote); } }, l.nom);
          })),
          el("button.b.or", { type: "button", onclick: nouveau }, "+ Nouveau dossier"))),

      LENTILLE === "marque" ? murDesMarques() : el("div.dl-corps", {},
        el("div.dl-liste", {}, lignes.map(function (x, i) {
          /* Le premier, s'il ne tient pas, s'ouvre : c'est celui sur lequel
           * il y a quelque chose à faire aujourd'hui. */
          return (i === 0 && x.rang !== 2) ? ligneGrande(x) : ligneDossier(x);
        })),
        murDesBlocages(lignes)),

      LENTILLE === "marque" ? null : blocClos(closes),

      el("p.dl-pied", {}, LENTILLE === "marque"
        ? "Une marque est toujours en campagne : un cycle qui tourne, et des temps forts. "
          + "Ce qui n'est rattaché à ni l'un ni l'autre se voit."
        : "Les dossiers qui tiennent descendent et pâlissent. "
          + "Seul ce qui ne tient pas remonte.")
    ));
  }

  /* Ce que le projet a produit, et comment on le sait.
   *
   * C'est la première des quatre boucles, et celle dont les trois autres
   * dépendent : sans résultat mesuré, la dérive n'a rien à corriger, la
   * jurisprudence rien à opposer et le benchmark rien à comparer. */
  function panneauResultat(p, rafraichir) {
    if (!window.BOUCLES) return null;
    var e = BOUCLES.etatResultat(p);
    var rs = BOUCLES.resultats(p);

    return el("div.panneau-lat", {},
      el("h3", {}, "LE RÉSULTAT",
        el("span.droite", { style: { color: e.ton === "vert" ? "var(--vert)"
          : e.ton === "attente" ? "var(--attente)" : "var(--clair-terne)" } }, e.nom)),
      el("p.psa-q", {}, e.quoi),
      rs.length
        ? el("div", { style: { "margin-top": ".6rem" } }, rs.map(function (r) {
            var n = window.EFFICACITE ? EFFICACITE.niveau(r.niveau) : null;
            return el("div.res-l", {},
              el("b", {}, r.quoi, r.valeur ? el("span.res-v", {}, r.valeur) : null),
              el("span.res-s", {}, r.source
                ? r.source + (n ? "  ·  " + n.nom.toLowerCase() : "")
                : "sans source — il se retournera en réunion"));
          }))
        : null,
      el("div", { style: { "margin-top": ".7rem" } },
        el("button.bouton.creux", { type: "button",
          onclick: function () { saisirResultat(p, rafraichir); } }, "Noter un résultat")));
  }

  function saisirResultat(p, rafraichir) {
    var quoi = el("input", { type: "text", placeholder: "Portée, engagement, ventes, notoriété…" });
    var valeur = el("input", { type: "text", placeholder: "+121 % · 206 030 · 3 points" });
    var source = el("input", { type: "text", placeholder: "Rapport de régie, comptage terrain, Meta Insights…" });
    var sel = el("select", {});
    sel.appendChild(el("option", { value: "" }, "— niveau de preuve —"));
    ((window.EFFICACITE && EFFICACITE.NIVEAUX) || []).forEach(function (n) {
      sel.appendChild(el("option", { value: n.cle, title: n.quoi }, n.rang + " · " + n.nom));
    });

    PANNEAU.ouvrir("Noter un résultat", p.ref || p.nom, el("div", {},
      UI.banniere("", "Un chiffre sans source se retourne en réunion. L'échelle de preuve "
        + "dit ce qu'il vaut : données maison, catégorie voisine, marché comparable, "
        + "déclaratif daté — dans cet ordre."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Ce qui a été mesuré"), quoi),
        el("div.champ", {}, el("label", {}, "La valeur"), valeur),
        el("div.champ", {}, el("label", {}, "D'où elle vient"),
          el("div.indice", {}, "Sans source, le résultat ne compte pas."), source),
        el("div.champ", {}, el("label", {}, "Niveau de preuve"), sel)),
      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          if (!quoi.value.trim()) { AVIS.refus("Il faut dire ce qui a été mesuré."); return; }
          BOUCLES.poser(p, { quoi: quoi.value, valeur: valeur.value,
            source: source.value, niveau: sel.value || null });
          PANNEAU.fermer();
          AVIS.fait("Résultat noté. Il entre dans la vie de la marque.");
          if (rafraichir) rafraichir();
        } }, "Noter"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ), "var(--vert)");
  }

  /* Le dernier mètre : ce qui part chez le client, et avec quoi.
   *
   * Il vient après le coût parce qu'il vient après le verdict — on ne remet
   * que ce qu'on a soi-même approuvé. */
  function panneauRemise(p) {
    if (!window.REMISE || !NATURE.aSection(p, "livraison")) return null;
    var e = REMISE.etat(p);
    if (e.cle === "rien") return null;

    return el("div.panneau-lat", {},
      el("h3", {}, "LA REMISE",
        el("span.droite", { style: { color: e.ton === "alerte" ? "var(--bloquant-txt)"
          : e.ton === "vert" ? "var(--vert)" : "var(--attente)" } }, e.nom)),
      el("p.psa-q", {}, e.quoi),
      el("div", { style: { "margin-top": ".7rem" } },
        el("button.bouton.creux", { type: "button",
          onclick: function () { REMISE.ouvrir(p); } }, "Voir le manifeste")));
  }

  /* Ce que le projet coûte, et ce que ça rend vérifiable.
   *
   * Le budget était un nombre dans l'identité — un chiffre qu'on croit, pas
   * qu'on vérifie. Ici : les jours par poste, le montant, le bon de commande,
   * et l'écart entre l'estimé et le réel. C'est l'indicateur de la fiche 07,
   * et le seul chiffre que la clause de reprise puisse opposer. */
  function panneauChiffrage(p, rafraichir) {
    if (!window.CHIFFRAGE) return null;
    var e = CHIFFRAGE.etat(p);
    var b = (p.chiffrage || {}).bonDeCommande;
    var bdc = b ? CHIFFRAGE.BDC[b] : null;

    return el("div.panneau-lat", {},
      el("h3", {}, "LE COÛT",
        el("span.droite", { style: { color: e.ton === "alerte" ? "var(--bloquant-txt)"
          : e.ton === "vert" ? "var(--vert)" : "var(--attente)" } }, e.nom)),
      el("p.psa-q", {}, e.quoi),
      bdc ? el("p.psa-q", { style: { "margin-top": ".4rem" } },
        "Bon de commande : " + bdc.nom + ".") : null,
      el("div", { style: { "margin-top": ".7rem" } }, CHIFFRAGE.bouton(p, rafraichir)));
  }

  /* Ce que le corpus dit de ce dossier, et qui ne vient pas de sa saisie.
   *
   * L'ingestion a fait entrer cent quarante campagnes avec leur attribution :
   * les rôles tenus, la cellule de preuve mot pour mot, les briefs du Radar
   * rattachés. Tout cela vivait dans la donnée et ne s'affichait nulle part —
   * donc, du point de vue de celui qui ouvre le dossier, ça n'existait pas.
   *
   * On le montre tel quel, sous son étiquette : RELEVÉ. Ce ne sont pas des
   * champs de saisie, ce sont les mots d'un document, et la distinction est
   * tout ce qui sépare une archive d'une déclaration. */
  function panneauReleve(p) {
    var r = p.releve;
    if (!r) return null;
    var a = r.annonce;

    return el("div.panneau-lat", {},
      el("h3", {}, "RELEVÉ",
        el("span.droite", { style: { color: "var(--clair-terne)" } },
          r.niveau === "fort" ? "preuve solide"
            : r.niveau === "moyen" ? "preuve partielle" : "trace ténue")),

      el("p.psa-q", {}, "Relevé de « " + r.source + " »"
        + (r.section ? ", section " + r.section : "") + ". Rien ici n'a été saisi."),

      (r.rolesNoms || []).length
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "RÔLES TENUS"),
            el("div", {}, r.rolesNoms.map(function (x) {
              return el("div.rlv-r", {}, x); })))
        : null,

      r.preuve
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "LA PREUVE, MOT POUR MOT"),
            el("p.rlv-p", {}, r.preuve))
        : null,

      /* Ce que le document annonce et que rien ne trace. On ne fabrique pas
       * les pièces manquantes : on affiche l'écart, qui est l'information. */
      a
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "CE QUI EST ANNONCÉ"),
            el("p.rlv-p", {}, "« " + a.phrase + " » au document, "
              + (a.traces ? a.traces + (a.traces > 1 ? " tracés ici" : " tracé ici")
                          : "aucun tracé ici")
              + (a.traces < a.nombre
                  ? ".  L'écart n'est pas une perte : les pièces existent sur le disque, "
                    + "elles ne sont simplement pas rattachées une à une."
                  : ".")))
        : null,

      (r.radar || []).length
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "AU RADAR MATANGA"),
            el("p.rlv-p", {}, r.radar.join("  ·  ")),
            el("a.b.nu", { href: "#/referentiel/radar" }, "voir le registre →"))
        : el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "AU RADAR MATANGA"),
            el("p.rlv-p", {}, "Aucun brief apparié. La campagne est documentée, "
              + "sa demande d'origine n'a pas été retrouvée au registre.")));
  }

  /* La boucle : ouverte, ou fermée et ce qu'elle a laissé.
   *
   * Le geste vit ici plutôt qu'en tête du dossier parce que clore n'est pas
   * une commande d'écran : c'est une décision, et elle se prend en sachant ce
   * qu'elle change. Le panneau le dit avant de proposer le bouton. */
  function panneauCloture(p, rafraichir) {
    if (!window.CLOTURE) return null;
    var clos = CLOTURE.est(p);
    var infere = CLOTURE.estInferee(p);
    var bilan = clos ? ((p.cloture.bilan || "").trim()) : "";

    return el("div.panneau-lat", {},
      el("h3", {}, "LA BOUCLE",
        el("span.droite", { style: { color: clos && !infere ? "var(--clair-terne)" : "var(--attente)" } },
          infere ? "close, inférée" : clos ? "close" : "ouverte")),

      clos
        ? el("div", {},
            el("p.psa-q", {}, "Clos le " + O.jourCourt(p.cloture.le)
              + (p.cloture.releve && p.cloture.releve !== "décidé à la main"
                  ? " — " + p.cloture.releve : "")
              + ". Les contrôles de cadrage se taisent ; ce qui peut encore mordre parle."),
            /* Une clôture inférée ne réclame pas de bilan : personne n'a
             * encore dit que la campagne était finie. Ce qu'elle attend, c'est
             * un oui ou un non, et c'est tout ce qu'on lui demande. */
            infere
              ? el("p.psa-q", { style: { color: "var(--attente)" } },
                  "Inférée à l'ingestion, pas décidée : " + p.cloture.infere.pourquoi)
              : bilan
                ? el("div.prix.vert", { style: { "margin-top": ".6rem" } },
                    el("span.signe", {}, "✓"), "Le diagnostic est au dossier.")
                : el("p.psa-q", { style: { color: "var(--attente)" } },
                    "Aucun bilan : le prochain brief sur cette marque repartira sans son diagnostic."))
        : el("p.psa-q", {}, "Tant qu'il est ouvert, le dossier réclame son cadrage — "
            + "et il a raison de le faire. À la clôture, il devient une entrée réutilisable : "
            + "le cas client, et le diagnostic que le brief suivant pourra opposer."),

      el("div", { style: { "margin-top": ".7rem" } }, CLOTURE.bouton(p, rafraichir))
    );
  }

  /* ————————————————————— L'arbre, par marque —————————————————————
   *
   * Une ligne par marque : ce que son socle porte, son rythme, et le compte de
   * ce qui tourne. On descend d'un clic. Les marques sans dossier n'y figurent
   * pas — ce mur montre le travail, pas le référentiel. */
  function murDesMarques() {
    var ps = DEPOT.liste("projets");
    var par = {};
    ps.forEach(function (p) {
      ((p.sections.identite || {}).marqueIds || []).forEach(function (id) {
        (par[id] = par[id] || []).push(p); });
    });

    var lignes = Object.keys(par).map(function (id) {
      var m = DEPOT.trouve("marques", id);
      var lot = par[id];
      var vivants = lot.filter(function (p) { return !(window.CLOTURE && CLOTURE.est(p)); });
      var cs = window.CAMPAGNE ? CAMPAGNE.deMarque(id) : [];
      var remplis = window.VAULT ? VAULT.CHAMPS.filter(function (c) {
        var h = VAULT.herite("marque", id, c.cle);
        return h && h.valeur !== null && h.valeur !== undefined
          && (Array.isArray(h.valeur) ? h.valeur.length : String(h.valeur).trim()); }).length : 0;
      return { id: id, m: m, nom: m ? m.nom : id, lot: lot, vivants: vivants,
        campagnes: cs, socle: remplis };
    }).sort(function (a, b) {
      return b.vivants.length - a.vivants.length || b.lot.length - a.lot.length;
    });

    if (!lignes.length) {
      return el("p.rien", {}, "Aucun dossier n'est rattaché à une marque.");
    }

    return el("div.dl-mq", {}, lignes.map(function (x) {
      var sansRythme = !x.campagnes.length;
      return el("a.mqr" + (sansRythme ? ".muet" : ""), { href: "#/projets/" + x.id },
        el("span.mqr-n", {}, x.nom),
        el("span.mqr-s", {},
          x.vivants.length
            ? x.vivants.length + (x.vivants.length > 1 ? " projets ouverts" : " projet ouvert")
            : "rien d'ouvert",
          el("span.mqr-t", {}, x.lot.length + " au total")),
        el("span.mqr-r", {}, sansRythme
          ? "aucune campagne, aucun cycle"
          : x.campagnes.length + (x.campagnes.length > 1 ? " campagnes" : " campagne")),
        el("span.mqr-so", {}, x.socle + " / " + (window.VAULT ? VAULT.CHAMPS.length : 0) + " au socle"));
    }));
  }

  /* La marche : une marque, son rythme, ses campagnes, ses projets. */
  function marcheDeMarque(hote, marqueId) {
    var m = DEPOT.trouve("marques", marqueId);
    hote.className = "zone";
    O.vider(hote);
    if (!m) {
      hote.appendChild(el("p.rien", {}, "Marque inconnue — ",
        el("a", { href: "#/projets" }, "revenir aux dossiers")));
      return;
    }
    DEPOT.lu("marques", marqueId);

    var ps = DEPOT.liste("projets").filter(function (p) {
      return ((p.sections.identite || {}).marqueIds || []).indexOf(marqueId) !== -1; });
    var cs = window.CAMPAGNE ? CAMPAGNE.deMarque(marqueId) : [];
    var sansCampagne = ps.filter(function (p) { return !p.campagneId; });
    var vie = window.VIE_MARQUE ? VIE_MARQUE.etat(marqueId) : null;

    hote.appendChild(el("div.dl", {},
      el("div.dl-h", {},
        el("div", {},
          el("p.dl-fil", {}, el("a", { href: "#/projets" }, "Les dossiers"), " / ", m.nom),
          el("h2.dl-t", {}, m.nom),
          el("p.dl-s", {}, vie ? vie.quoi : "")),
        el("a.b", { href: "#/referentiel/marques" }, "Le portefeuille →")),

      cs.length
        ? el("div", {}, cs.map(function (c) { return blocCampagne(c); }))
        : el("p.rien", {}, "Aucune campagne, aucun cycle. Une marque est pourtant "
            + "toujours en campagne : tant que rien n'est ouvert ici, son rythme "
            + "n'existe que dans la tête de ceux qui le tiennent."),

      /* Le dossier de marque au complet : les quatre piliers, le brief de
       * plateforme, les décideurs, le catalogue, la vie. Il était dans
       * « La maison » ; il est ici, sous le rythme, parce que c'est ici qu'on
       * ouvre une marque pour travailler. */
      window.VUE_VAULT && VUE_VAULT.dossierDeMarque
        ? el("details.dl-socle", {},
            el("summary", {},
              el("b", {}, "Le socle, le catalogue et la vie"),
              el("span.dl-clos-q", {}, "ce qui dure — identité, décideurs, packs, histoire")),
            VUE_VAULT.dossierDeMarque(marqueId, hote))
        : null,

      sansCampagne.length
        ? el("div.dl-orph", {},
            el("div.dlo-t", {}, sansCampagne.length
              + (sansCampagne.length > 1 ? " projets ne sont rattachés" : " projet n'est rattaché")
              + " à aucun moment de la vie de la marque"),
            el("p.dlo-q", {}, "Ce n'est pas une faute : personne n'a encore dit "
              + "à quelle campagne ils appartiennent."),
            el("div.dl-liste", {}, sansCampagne.map(ligneProjetCourte)))
        : null
    ));
  }

  /* ————————————————————— La campagne —————————————————————
   *
   * L'écran où une campagne se COMPOSE. C'est le flux qui manquait le plus :
   * monter un lancement voulait dire créer six dossiers à la main, sans lien,
   * chacun repartant de zéro sur le client, la marque, les marchés et la
   * fenêtre.
   *
   * L'occasion connaît sa composition usuelle et la propose. Elle ne crée
   * rien seule : le produit n'ouvre pas six dossiers dans le dos de personne.
   * Et ce qu'on écarte laisse sa trace datée — une case vide sans motif se
   * rediscute deux fois, une case écartée avec sa date ne se rediscute plus. */
  function ecranCampagne(hote, campagneId) {
    var c = window.CAMPAGNE ? CAMPAGNE.de(campagneId) : null;
    hote.className = "zone";
    O.vider(hote);
    if (!c) {
      hote.appendChild(el("p.rien", {}, "Campagne inconnue — ",
        el("a", { href: "#/projets" }, "revenir aux dossiers")));
      return;
    }
    var rafraichir = function () { ecranCampagne(hote, campagneId); };
    var ps = CAMPAGNE.projets(c.id);
    var e = CAMPAGNE.etat(c);
    var mq = (c.marqueIds || [])[0];
    var m = mq ? DEPOT.trouve("marques", mq) : null;
    var ref = CAMPAGNE.pisteDeReference(c.id);

    hote.appendChild(el("div.dl", {},
      el("div.dl-h", {},
        el("div", {},
          el("p.dl-fil", {},
            el("a", { href: "#/projets" }, "Les dossiers"), " / ",
            m ? el("a", { href: "#/projets/" + m.id }, m.nom) : "sans marque", " / ",
            c.regime === "always-on" ? "le cycle" : "temps fort"),
          el("h2.dl-t", {}, c.nom),
          el("p.dl-s", {}, e ? e.quoi : "")),
        el("a.b", { href: "#/projets/" + (m ? m.id : "") }, "← la marque")),

      /* La piste qui gouverne les frères. Sans elle, le film et l'activation
       * de la même campagne ignorent le concept qu'on vient d'arbitrer. */
      ref
        ? el("div.cmp-piste", {},
            el("div.cmpp-t", {}, "LA PISTE QUI GOUVERNE"),
            el("b", {}, ref.piste.titre || "piste retenue"),
            el("p.cmpp-q", {}, "Arbitrée sur « " + ref.projet.nom + " ». "
              + "Les autres projets de cette campagne en héritent — celui qui s'en "
              + "écarte doit le dire."))
        : ps.length > 1
          ? el("div.cmp-piste.vide", {},
              el("div.cmpp-t", {}, "AUCUNE PISTE RETENUE"),
              el("p.cmpp-q", {}, ps.length + " projets se fabriquent sans savoir quel "
                + "concept fait autorité. Deux signatures peuvent sortir du même temps fort."))
          : null,

      blocComposition(c, rafraichir),

      ps.length
        ? el("div", { style: { "margin-top": "1.2rem" } },
            el("div.section-titre", {}, "Les projets", el("span.taille", {}, "· " + ps.length)),
            el("p.cmpc-q", {}, "Un projet peut en attendre un autre. Le dire fait apparaître "
              + "les jours de production qui courent à vide."),
            el("div.dl-liste", {}, ps.map(function (x) {
              return ligneProjetChainee(x, ps, rafraichir); })))
        : null
    ));
  }

  /* La composition : ce que l'occasion appelle, et ce qui est déjà ouvert. */
  function blocComposition(c, rafraichir) {
    var comp = CAMPAGNE.composition(c);
    if (!comp.length) {
      return el("p.rien", {}, "Cette campagne n'a pas d'occasion déclarée : "
        + "la maison ne sait pas ce qu'elle appelle d'habitude.");
    }
    var manquants = comp.filter(function (x) { return !x.projet && !x.ecarte; }).length;

    return el("div.cmp-comp", {},
      el("div.section-titre", {}, "Ce que cette occasion appelle",
        el("span.taille", {}, manquants
          ? "· " + manquants + " à décider" : "· tout est décidé")),
      el("p.cmpc-q", {}, "La maison propose ; elle n'ouvre rien seule. Ce qu'on écarte "
        + "garde sa date, pour ne pas se rediscuter deux fois."),
      el("div.cmp-l", {}, comp.map(function (x) {
        return ligneComposition(c, x, rafraichir); }))
    );
  }

  function ligneComposition(c, x, rafraichir) {
    var etat = x.projet ? "ouvert" : x.ecarte ? "ecarte" : "propose";
    return el("div.cmpl." + etat, {},
      el("span.cmpl-n", {}, x.nature.nom,
        x.nature.quoi ? el("span.cmpl-q", {}, x.nature.quoi) : null),
      el("span.cmpl-e", {},
        etat === "ouvert" ? el("a", { href: "#/projets/" + x.projet.id }, x.projet.ref)
          : etat === "ecarte" ? "écarté le " + O.jourCourt(x.ecarte.quand)
            + (x.ecarte.motif ? "  ·  " + x.ecarte.motif : "")
          : "pas encore ouvert"),
      el("span.cmpl-g", {},
        etat === "ecarte"
          ? el("button.b.nu", { type: "button", onclick: function () {
              CAMPAGNE.reprendre(c, x.nature.cle); rafraichir(); } }, "reprendre")
          : etat === "propose"
            ? el("span", {},
                el("button.b.nu", { type: "button", onclick: function () {
                  ouvrirDepuisCampagne(c, x.nature, rafraichir); } }, "ouvrir"),
                el("button.b.nu", { type: "button", onclick: function () {
                  PANNEAU.demander("Écarter « " + x.nature.nom + " »", {
                    label: "Pourquoi",
                    aide: "Pourquoi cette campagne n'en a pas besoin. La réponse est "
                        + "datée et ne se rediscutera pas.",
                    lignes: 2, requis: "Un écart sans motif se rediscute la semaine suivante.",
                  }, function (motif) {
                    CAMPAGNE.ecarter(c, x.nature.cle, motif); rafraichir(); });
                } }, "écarter"))
            : null));
  }

  /* Ouvrir un projet DEPUIS la campagne : il hérite ce qu'elle porte déjà —
   * client, marques, marchés, fenêtre. C'est tout l'intérêt de l'étage. */
  function ouvrirDepuisCampagne(c, nature, rafraichir) {
    var p = DEPOT.ajoute("projets", {
      ref: "MT-" + String(DEPOT.liste("projets").length + 1).padStart(4, "0"),
      nom: c.nom + " — " + nature.nom.toLowerCase(),
      nature: nature.cle,
      campagneId: c.id,
      pilier: null,
      cree_le: new Date().toISOString(),
      statut: "creation",
      equipe: [],
      sections: {
        identite: {
          clientId: c.clientId || null,
          marqueIds: (c.marqueIds || []).slice(),
          marches: (c.marches || []).slice(),
          fenetre: c.fenetre && c.fenetre.fin ? O.joli(c.fenetre.fin) : "",
          echeance: (c.fenetre || {}).fin || "",
        },
        brief: {}, pistes: [],
      },
      perimetre: { supports: [], marches: (c.marches || []).slice() },
      livrables: [], volets: [],
    });
    DEPOT.tracer("création depuis campagne", "projets", p.id, c.nom + " · " + nature.nom);
    DEPOT.enregistrer();
    AVIS.fait("« " + p.nom + " » est ouvert. Il hérite le client, les marques, "
      + "les marchés et la fenêtre de la campagne.");
    location.hash = "#/projets/" + p.id;
  }

  function blocCampagne(c) {
    var ps = window.CAMPAGNE ? CAMPAGNE.projets(c.id) : [];
    var e = window.CAMPAGNE ? CAMPAGNE.etat(c) : null;
    return el("div.dl-cmp" + (c.regime === "always-on" ? ".continu" : ""), {},
      el("div.dlc-t", {},
        el("b", {}, el("a", { href: "#/projets/" + c.id }, c.nom)),
        el("span.dlc-r", {}, c.regime === "always-on" ? "le cycle qui tourne" : "temps fort"),
        c.infere ? el("span.dlc-i", {}, "rattachement inféré") : null),
      e ? el("p.dlc-q", {}, e.quoi) : null,
      ps.length ? el("div.dl-liste", {}, ps.map(ligneProjetCourte)) : null);
  }

  /* La ligne d'un projet dans sa campagne, avec ce qu'il attend de ses frères.
   * Le chaînage se déclare ici et nulle part ailleurs : c'est le seul écran
   * où l'on voit les frères ensemble. */
  function ligneProjetChainee(p, freres, rafraichir) {
    var ligne = ligneProjetCourte(p);
    var amonts = (p.attend || []).map(function (id) {
      var a = DEPOT.trouve("projets", id); return a ? a.nom : null; }).filter(Boolean);

    var sel = el("select", { onclick: function (e) { e.preventDefault(); e.stopPropagation(); } });
    sel.appendChild(el("option", { value: "" }, "— n'attend rien —"));
    freres.forEach(function (f) {
      if (f.id === p.id) return;
      sel.appendChild(el("option", { value: f.id,
        selected: (p.attend || []).indexOf(f.id) !== -1 ? "" : null },
        "attend « " + f.nom.slice(0, 38) + " »"));
    });
    sel.onchange = function () {
      p.attend = sel.value ? [sel.value] : [];
      DEPOT.tracer("chaînage", "projets", p.id, sel.value || "délié");
      DEPOT.enregistrer();
      rafraichir();
    };

    return el("div.cmp-pr", {}, ligne,
      el("div.cmp-ch", {}, sel,
        amonts.length ? el("span.cmp-cha", {}, "en attente de " + amonts.join(", ")) : null));
  }

  function ligneProjetCourte(p) {
    var blocs = REGLES.blocages(p.id);
    var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
    var clos = window.CLOTURE && CLOTURE.est(p);
    var n = (p.livrables || []).filter(function (l) { return !l.annule; }).length;
    return el("a.dlp" + (clos ? ".clos" : durs ? ".dur" : ""), { href: "#/projets/" + p.id },
      el("span.dlp-r", {}, p.ref),
      el("span.dlp-n", {}, p.nom),
      el("span.dlp-t", {}, window.NATURE ? NATURE.nom(p) : ""),
      el("span.dlp-q", {}, clos ? "clos"
        : durs ? durs + (durs > 1 ? " blocages" : " blocage")
        : n ? n + (n > 1 ? " livrables" : " livrable") : "rien encore"));
  }

  /* Les dossiers clos, repliés. Le compte dit aussi combien n'ont pas de bilan :
   * un dossier clos sans diagnostic ne sert pas le suivant, et c'est la seule
   * chose qu'il reste à en faire. */
  function blocClos(closes) {
    if (!closes.length) return null;
    /* Deux comptes, et ils n'appellent pas le même geste. Une clôture inférée
     * attend un oui ou un non ; une clôture confirmée sans bilan attend trois
     * lignes de diagnostic. Les additionner — « 132 sans bilan » — réclamait
     * un bilan pour cent seize campagnes dont personne n'a encore dit
     * qu'elles étaient finies. */
    var inferes = closes.filter(function (x) {
      return window.CLOTURE && CLOTURE.estInferee(x.p); });
    var sansBilan = closes.filter(function (x) {
      return !(window.CLOTURE && CLOTURE.estInferee(x.p))
        && !((x.p.cloture || {}).bilan || "").trim(); });

    var dits = [];
    if (inferes.length) dits.push(inferes.length + " clôture" + (inferes.length > 1 ? "s" : "")
      + " inférée" + (inferes.length > 1 ? "s" : "") + " à confirmer ou rouvrir");
    if (sansBilan.length) dits.push(sansBilan.length + " sans bilan : "
      + (sansBilan.length > 1 ? "autant de campagnes dont la suivante" : "une campagne dont la suivante")
      + " ne saura rien");
    if (!dits.length) dits.push("tous confirmés, tous avec leur bilan");

    return el("details.dl-clos", {},
      el("summary", {},
        el("b", {}, closes.length + (closes.length > 1 ? " dossiers clos" : " dossier clos")),
        el("span.dl-clos-q", {}, dits.join("  ·  "))),
      el("div.dl-liste", {}, closes.map(ligneDossier)));
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
    g = NATURE.de(p);
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
     * n'est pas une décoration, c'est un livrable ; quand il n'y en a pas, on le
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
    /* La planche de livraison ne demande ni idée ni maître : une case est due,
     * elle est pleine ou elle est vide. C'est ce qui la rend lisible sur une
     * reprise de parc, là où la planche des KV n'a rien à montrer. */
    if (cle === "livraison") {
      var lv = (p.livrables || []).filter(function (l) { return !l.annule; });
      if (!lv.length) return { classe: "vide", texte: "aucun livrable" };
      var pl = lv.filter(function (l) { return !!l.vignette; }).length;
      if (!pl) return { classe: "vide", texte: lv.length + " cases, aucune remplie" };
      return pl === lv.length
        ? { classe: "plein", texte: "planche complète · " + lv.length + " visuels" }
        : { classe: "partiel", texte: pl + " / " + lv.length + " cases remplies" };
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
      if (!pistes.length) return { classe: "vide", texte: "aucune piste" };
      return retenue ? { classe: "plein", texte: "une piste retenue" }
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
    NATURE.liste().forEach(function (g) {
      selG.appendChild(el("option", { value: g.cle, title: g.quoi }, g.nom)); });
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
          if (!d.nom || !d.client) { AVIS.refus("Renseignez le client et le nom du projet."); return; }
          var p = DEPOT.ajoute("projets", {
            ref: d.ref || "PRJ-" + String(DEPOT.liste("projets").length + 1).padStart(4, "0"),
            nom: d.nom, nature: choixG, statut: "ouvert", equipe: [],
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
        /* Chaque blocage porte sa clé : quand il tombe, il tombe aux quatre
         * endroits où il vit — le rail, la carte du dossier, la charge, la
         * file — et pas seulement là où on l'a résolu. C'est ce qui rend la
         * résolution croyable. */
        el("div.blocages", {}, blocs.map(function (b) {
          return el("div.blocage", { "data-blocage": b.cle },
            el("b", {}, b.quoi),
            el("span.quand", {}, b.jours === 0 ? "depuis aujourd'hui" : "depuis " + b.jours + (b.jours > 1 ? " jours" : " jour")),
            b.prix ? el("span.cout", {}, b.prix) : null,
            (b.pieces || []).length
              ? el("button.b.nu", { type: "button", style: { "font-size": "var(--t-micro)", "margin-top": ".25rem" },
                  onclick: function () { lesPieces(p, b, rafraichir); } },
                  "les " + b.pieces.length + " livrables →")
              : null,
            /* Le renvoi à la doctrine. Un contrôle qui refuse sans dire selon
             * quel critère refait exactement ce que la doctrine reproche aux
             * agences : « on te dira ça ne marche pas sans te dire selon quel
             * critère ». Celui qui remplace le DC doit pouvoir lire la règle. */
            window.VUE_DOCTRINE ? VUE_DOCTRINE.lien(b.type) : null,
            b.type === "infere-non-contresigne"
              ? el("button.b.nu", { type: "button", style: { "font-size": "var(--t-micro)", "margin-top": ".25rem" },
                  onclick: function () { INFERENCE.panneau(p, rafraichir); } }, "faire contresigner →")
              : null
          );
        }))
      ) : el("div.panneau-lat", {}, el("h3", {}, "ÉTAT"), el("div.prix.vert", {}, el("span.signe", {}, "✓"), "Rien ne bloque ce projet.")),
      panneauSante(p, g, durs),
      panneauReleve(p),
      panneauChiffrage(p, rafraichir),
      panneauRemise(p),
      panneauResultat(p, rafraichir),
      panneauCloture(p, rafraichir),
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

    /* Un dossier clos ne se lit pas par ce qui le bloque : il n'y a plus rien
     * à débloquer. Il se lit par ce qu'il laisse au suivant. */
    if (window.CLOTURE && CLOTURE.est(p)) {
      var e = CLOTURE.etat(p);
      var avecBilan = e.cle === "clos";
      return el("div.cotes", {}, el("div.pe-etat." + (avecBilan ? "terne" : "attente"), {},
        el("span.pee-c", {}, String(n)),
        el("span.pee-n", {}, n > 1 ? "livrables" : "livrable"),
        el("p.pee-q", {}, e.quoi
          + (durs ? "  " + durs + (durs > 1 ? " risques restent" : " risque reste")
              + " : les pièces sont toujours dehors." : ""))));
    }

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
      el("span.pee-n", {}, n > 1 ? "livrables" : "livrable"),
      el("p.pee-q", {}, n
        ? "Rien ne bloque ce dossier. Ce qui reste est du travail, pas une décision."
        : "Aucun livrable. Une piste retenue les engendre — c'est là qu'elles naissent.")));
  }

  /* Un blocage de lot s'ouvre : la liste des livrables qu'il porte, chacune
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

      el("p.psa-q", {}, (window.CLOTURE && CLOTURE.est(p))
        ? "Sur un dossier clos, ce taux ne mesure pas un retard : il dit ce que "
          + "l'archive ne portera jamais. " + (total - faits) + " champs sur " + total
          + " sont restés vides, et c'est l'état dans lequel la campagne s'est faite."
        : durs
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
      /* Une personne archivée qui a signé quelque chose ici reste au rail : on
       * n'efface pas une paternité. Mais elle ne s'affiche pas comme si elle
       * était au plateau — le rail disait « Claude · Concepteur-Rédacteur »
       * pour un poste vacant, et « Nadia Fotso » pour quelqu'un qui n'a jamais
       * été à l'agence. Le motif de l'archivage est écrit à côté du nom. */
      equipe.length
        ? equipe.map(function (m) {
            var pers = DEPOT.trouve("personnes", m.personne);
            var parti = pers && pers.archive;
            return el("div.file-item" + (parti ? ".parti" : ""), {},
              el("div.vignette.v-mini", {}, el("span.absente", {}, pers ? pers.nom.split(" ").map(function (x) { return x[0]; }).join("") : "?")),
              el("div.fi-corps", {},
                el("div.fi-nom", {}, pers ? pers.nom : "—",
                  parti ? el("span.fi-parti", {}, "plus au plateau") : null),
                el("div.fi-meta", {}, O.poste(m.poste).nom),
                parti && pers.archive.motif
                  ? el("div.fi-motif", {}, pers.archive.motif) : null
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
  /* La stratégie n'est plus une liste de champs.
   *
   * L'insight et le territoire y étaient deux paragraphes ; ce sont maintenant
   * des objets, et ce qui les relie aux pistes est une arborescence. Ce corps
   * ne sert plus que de repli — si le module de la chaîne n'est pas chargé, la
   * section reste lisible au lieu de disparaître. */
  function corpsStrategie(p, rafraichir) {
    if (window.VUE_INSIGHT) return VUE_INSIGHT.rendre(p, rafraichir);

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
                ? "Non écrit. Sans lui, une piste ne se juge que par le goût."
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
    if (cle === "livraison") return VUE_LIVRAISON.rendre(p, rafraichir);
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
    rendre: rendre, nouveau: nouveau, titre: "Projets", nomSection: nomSection, etatSection: etatSection,
    sectionsDe: sectionsDe, editerChamp: editerChamp,
    editerSection: function (p, cle, rafraichir) { editer(p, cle, CHAMPS.section(cle), rafraichir); },
  };
})();
