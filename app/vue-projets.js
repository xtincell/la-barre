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
    { cle: "defaut", nom: "Ce qui ne tient pas", quoi: "classé par ce qui bloque, pas par date" },
    { cle: "marque", nom: "Par marque", quoi: "la marque, son rythme, ses campagnes" },
  ];
  var LENTILLE = "defaut";

  function rendre(hote, projetId, section) {
    if (!projetId && window.VUE_STUDIO) return VUE_STUDIO.projets(hote);
    if (projetId === "marques") return lentilleMarques(hote);
    if (projetId && /^MQ-/.test(projetId)) return marcheDeMarque(hote, projetId);
    if (projetId && /^CMP-/.test(projetId)) return ecranCampagne(hote, projetId);
    if (projetId) return projet(hote, projetId, section);

    var projets = DEPOT.liste("projets").filter(function (p) { return !p.fusionne; });
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
      el("h3", {}, "Le résultat",
        el("span.droite", { style: { color: e.ton === "vert" ? "var(--vert)"
          : e.ton === "attente" ? "var(--attente)" : "var(--clair-terne)" } }, e.nom)),
      el("p.psa-q", {}, e.quoi),
      rs.length
        ? el("div", { style: { "margin-top": ".6rem" } }, rs.map(function (r) {
            var n = window.EFFICACITE ? EFFICACITE.niveau(r.niveau) : null;
            var q = BOUCLES.qualifierResultat(r);
            return el("div.res-l", {},
              el("b", {}, r.quoi, r.valeur !== undefined && r.valeur !== null && String(r.valeur).trim()
                ? el("span.res-v", {}, r.valeur) : null),
              el("span.res-s", {}, r.source
                ? r.source + (n ? "  ·  " + n.nom.toLowerCase() : "")
                : "sans source — il se retournera en réunion"),
              !q.complet ? el("span.res-s", {}, "Note à qualifier : " + q.manques.join(", ") + ".") : null);
          }))
        : null,
      el("div", { style: { "margin-top": ".7rem" } },
        el("button.bouton.creux", { type: "button",
          onclick: function () { saisirResultat(p, rafraichir); } }, "Noter un résultat")));
  }

  function saisirResultat(p, rafraichir) {
    var quoi = el("input", { id: "resultat-mesure", type: "text", placeholder: "Portée, engagement, ventes, notoriété…" });
    var valeur = el("input", { id: "resultat-valeur", type: "text", placeholder: "+121 % · 206 030 · 3 points" });
    var source = el("input", { id: "resultat-source", type: "text", placeholder: "Rapport de régie, comptage terrain, Meta Insights…" });
    var sel = el("select", { id: "resultat-niveau" });
    sel.appendChild(el("option", { value: "" }, "— niveau de preuve —"));
    ((window.EFFICACITE && EFFICACITE.NIVEAUX) || []).forEach(function (n) {
      sel.appendChild(el("option", { value: n.cle, title: n.quoi }, n.rang + " · " + n.nom));
    });

    PANNEAU.ouvrir("Noter un résultat", p.ref || p.nom, el("div", {},
      UI.banniere("", "Un chiffre sans source se retourne en réunion. L'échelle de preuve "
        + "dit ce qu'il vaut : données maison, catégorie voisine, marché comparable, "
        + "déclaratif daté — dans cet ordre."),
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "resultat-mesure" }, "Ce qui a été mesuré"), quoi),
        el("div.champ", {}, el("label", { "for": "resultat-valeur" }, "La valeur"), valeur),
        el("div.champ", {}, el("label", { "for": "resultat-source" }, "D'où elle vient"),
          el("div.indice", {}, "Sans source, le résultat ne compte pas."), source),
        el("div.champ", {}, el("label", { "for": "resultat-niveau" }, "Niveau de preuve"), sel)),
      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          if (!quoi.value.trim()) { AVIS.refus("Il faut dire ce qui a été mesuré."); return; }
          var q = BOUCLES.poser(p, { quoi: quoi.value, valeur: valeur.value,
            source: source.value, niveau: sel.value || null });
          PANNEAU.fermer();
          AVIS.fait(q.complet ? "Résultat renseigné. Sa source reste à vérifier."
            : "Note conservée, à qualifier : " + q.manques.join(", ") + ".");
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
      el("h3", {}, "La remise",
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
      el("h3", {}, "Le coût",
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
      el("h3", {}, "Relevé",
        el("span.droite", { style: { color: "var(--clair-terne)" } },
          r.niveau === "fort" ? "preuve solide"
            : r.niveau === "moyen" ? "preuve partielle" : "trace ténue")),

      el("p.psa-q", {}, "Relevé de « " + r.source + " »"
        + (r.section ? ", section " + r.section : "") + ". Rien ici n'a été saisi."),

      (r.rolesNoms || []).length
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "Rôles tenus"),
            el("div", {}, r.rolesNoms.map(function (x) {
              return el("div.rlv-r", {}, x); })))
        : null,

      r.preuve
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "La preuve, mot pour mot"),
            el("p.rlv-p", {}, r.preuve))
        : null,

      /* Ce que le document annonce et que rien ne trace. On ne fabrique pas
       * les pièces manquantes : on affiche l'écart, qui est l'information. */
      a
        ? el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "Ce qui est annoncé"),
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
            el("div.rlv-eti", {}, "Au " + ((MAISON.registres || {}).radar || "registre des briefs")),
            el("p.rlv-p", {}, r.radar.join("  ·  ")),
            el("a.b.nu", { href: "#/referentiel/radar" }, "Voir le registre →"))
        : el("div", { style: { "margin-top": ".7rem" } },
            el("div.rlv-eti", {}, "Au " + ((MAISON.registres || {}).radar || "registre des briefs")),
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
      el("h3", {}, "La boucle",
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
    var lignes = marquesEnLignes();
    if (!lignes.length) {
      return el("p.rien", {}, "Aucun dossier n'est rattaché à une marque.");
    }
    return el("section.mql-liste", {}, lignes.map(ligneMarque));
  }

  /* La lentille par marque a son propre en-tête. Elle héritait du titre de la
   * liste des dossiers — « 2 dossiers tiennent, 99 blocages… » —, qui ne dit
   * rien des marques, et d'un sélecteur dont l'autre bouton renvoyait de toute
   * façon à l'index. Le retour devient un lien, le titre parle des marques. */
  function lentilleMarques(hote) {
    hote.className = "zone studio";
    O.vider(hote);
    var lignes = marquesEnLignes();
    /* Le corpus a versé trente marques dont plus rien n'est ouvert. Elles se
     * replient sous leur compte : sinon la marque qui tourne cette semaine
     * se cherche entre deux annuaires. Le compte de l'en-tête ne porte que
     * sur les vivantes — une marque sans dossier ouvert n'a pas à « manquer »
     * de rythme. */
    var vivantes = lignes.filter(function (x) { return x.vivants.length; });
    var dormantes = lignes.filter(function (x) { return !x.vivants.length; });
    hote.appendChild(el("header.studio-entete", {},
      el("h1", {}, "Par marque"),
      el("button.b.or", { type: "button", onclick: nouveau }, "+ Nouveau projet")));
    hote.appendChild(VUE_STUDIO.navProjets("marques"));

    if (!lignes.length) {
      hote.appendChild(el("div.studio-vide", {}, el("h3", {}, "Aucune marque ici."),
        el("p", {}, "Une marque apparaît dès qu'un dossier la nomme.")));
    }
    if (vivantes.length) hote.appendChild(el("section.mql-liste", {}, vivantes.map(ligneMarque)));
    if (dormantes.length) {
      var sansC = dormantes.filter(function (x) { return !x.campagnes.length; }).length;
      hote.appendChild(el("details.mql-dort", vivantes.length ? {} : { open: true },
        el("summary.mql-dort-t", {},
          dormantes.length + (dormantes.length > 1 ? " marques sans dossier ouvert" : " marque sans dossier ouvert"),
          el("span", {}, "leur histoire reste entière"
            + (sansC ? " · " + sansC + " sans campagne rattachée" : ""))),
        el("section.mql-liste", {}, dormantes.map(ligneMarque))));
    }

  }

  /* Une marque sur une ligne : son nom, ce qui tourne, son rythme, son socle.
   * Une marque sans rythme porte le filet et le signe de l'attente — c'est la
   * seule qui appelle un geste. */
  function ligneMarque(x) {
    var sansRythme = !x.campagnes.length;
    var n = window.VAULT ? VAULT.CHAMPS.length : 0;
    return el("a.mql-r" + (sansRythme ? ".f-attente" : ""), { href: "#/projets/" + x.id },
      el("span.mql-n", {}, x.nom),
      el("span.mql-o", {},
        x.vivants.length
          ? x.vivants.length + (x.vivants.length > 1 ? " projets ouverts" : " projet ouvert")
          : "Rien d'ouvert",
        el("small", {}, x.lot.length + " au total")),
      el("span.mql-c", {}, sansRythme
        ? [el("span.mql-signe", { "aria-hidden": "true" }, "◐ "), "Aucune campagne, aucun cycle"]
        : x.campagnes.length + (x.campagnes.length > 1 ? " campagnes" : " campagne")),
      el("span.mql-s", {}, x.socle + " / " + n + " au socle"));
  }

  function marquesEnLignes() {
    var ps = DEPOT.liste("projets").filter(function (p) { return !p.fusionne; });
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
    return lignes;
  }

  /* La marche : une marque, son rythme, ses campagnes, ses projets. */
  var SOCLE_OUVERT = {};
  function marcheDeMarque(hote, marqueId) {
    var m = DEPOT.trouve("marques", marqueId);
    hote.className = "zone studio";
    O.vider(hote);
    if (!m) {
      hote.appendChild(el("p.rien", {}, "Marque inconnue — ",
        el("a", { href: "#/projets" }, "revenir aux dossiers")));
      return;
    }
    DEPOT.lu("marques", marqueId);

    var ps = DEPOT.liste("projets").filter(function (p) {
      if (p.fusionne) return false;
      return ((p.sections.identite || {}).marqueIds || []).indexOf(marqueId) !== -1; });
    var cs = window.CAMPAGNE ? CAMPAGNE.deMarque(marqueId) : [];
    var sansCampagne = ps.filter(function (p) { return !p.campagneId; });
    var vie = window.VIE_MARQUE ? VIE_MARQUE.etat(marqueId) : null;

    var vivants = ps.filter(function (p) { return !(window.CLOTURE && CLOTURE.est(p)); }).length;

    hote.appendChild(el("header.studio-entete.pj-entete", {},
      el("div.pj-id", {},
        window.MARQUE ? MARQUE.pastille({ sections: { identite: { marqueIds: [marqueId] } } }, 44) : null,
        el("div.pj-id-t", {},
          el("p.studio-date", {}, el("a.mql-fil", { href: "#/projets" }, "Vos projets"), " · ",
            el("a.mql-fil", { href: "#/projets/marques" }, "Vos marques")),
          el("h1", {}, m.nom),
          el("p.studio-intro", {}, [
            vivants ? vivants + (vivants > 1 ? " projets ouverts" : " projet ouvert") : "Rien d'ouvert",
            ps.length + " au total",
            cs.length ? cs.length + (cs.length > 1 ? " campagnes" : " campagne") : "aucune campagne",
          ].join(" · ")),
          vie ? el("p.mqp-vie", {}, vie.quoi) : null)),
      el("a.studio-lien", { href: "#/referentiel/marques" }, "Le portefeuille →")));

    hote.appendChild(cs.length
      ? el("div.mqp-cmps", {}, cs.map(function (c) { return blocCampagne(c); }))
      : el("section.mqp-vide.f-attente", {},
          el("h2", {}, el("span.mqp-signe", { "aria-hidden": "true" }, "◐ "), "Aucune campagne, aucun cycle"),
          el("p", {}, "Une marque est pourtant toujours en campagne : tant que rien n'est ouvert "
            + "ici, son rythme n'existe que dans la tête de ceux qui le tiennent.")));

    /* Ce qui n'est rattaché à aucun moment de la vie de la marque, sous les
     * campagnes : ce n'est pas une faute, c'est un rattachement que personne
     * n'a encore dit. */
    if (sansCampagne.length) {
      hote.appendChild(el("section.mqp-cmp.mqp-orph", {},
        el("div.mqp-t", {},
          el("h2", {}, sansCampagne.length
            + (sansCampagne.length > 1 ? " projets ne sont rattachés" : " projet n'est rattaché")
            + " à aucune campagne")),
        el("p.mqp-q", {}, "Ce n'est pas une faute : personne n'a encore dit à quel moment "
          + "de la vie de la marque ils appartiennent."),
        el("div.mpl-liste", {}, sansCampagne.map(function (x) {
          return el("div.cg-pr", {}, ligneProjetCourte(x),
            el("div.cg-ch", {}, el("button.studio-lien", { type: "button", onclick: function () {
              CAMPAGNE.choisir(x, function () { marcheDeMarque(hote, marqueId); }); } }, "Ranger dans une campagne")));
        }))));
    }

    if (window.COUVERTURE) {
      var fds = COUVERTURE.fonds(m);
      if (fds) hote.appendChild(fds);
    }
    /* Les concepts qu'aucune campagne n'a encore pris : ils attendent leur brief ici. */
    if (window.CONCEPTS && m) hote.appendChild(CONCEPTS.bloc(m, function () {
      var y = window.scrollY; marcheDeMarque(hote, marqueId); window.scrollTo(0, y); }));
    if (window.DISQUE && m && DISQUE.bloc(m.disque)) hote.appendChild(DISQUE.bloc(m.disque));

    /* Le dossier de marque au complet : les quatre piliers, le brief de
     * plateforme, les décideurs, le catalogue, la vie. Il était dans
     * « La maison » ; il est ici, sous le rythme, parce que c'est ici qu'on
     * ouvre une marque pour travailler. Replié : on ouvre une marque pour voir
     * ce qui tourne avant de voir ce qui dure. */
    if (window.VUE_VAULT && VUE_VAULT.dossierDeMarque) {
      var socle = el("details.mqp-socle", SOCLE_OUVERT[marqueId] ? { open: true } : {},
        el("summary.mqp-socle-t", {}, "Le socle, le catalogue et la vie",
          el("span", {}, "Ce qui dure : identité, décideurs, packs, histoire")),
        VUE_VAULT.dossierDeMarque(marqueId, function () {
          var y = window.scrollY;
          marcheDeMarque(hote, marqueId);
          window.scrollTo(0, y);
        }));
      /* Un geste dans le socle redessine la page : il doit la retrouver ouverte
       * là où on l'a laissée. */
      socle.addEventListener("toggle", function () { SOCLE_OUVERT[marqueId] = socle.open; });
      hote.appendChild(socle);
    }
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
    hote.className = "zone studio";
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
    var reference = CAMPAGNE.reference(c.id);
    var vifs = ps.filter(function (p) { return !(window.CLOTURE && CLOTURE.est(p)); });

    hote.className = "zone studio";
    var couv = window.COUVERTURE ? COUVERTURE.campagne(c) : null;
    hote.appendChild(el("header.studio-entete.pj-entete" + (couv ? ".cg-avec-couv" : ""), {},
      couv ? el("figure.cg-couv", {}, COUVERTURE.rendre(couv, "planche", c.nom),
        el("figcaption", {}, couv.motif || "")) : null,
      el("div.pj-id", {},
        mq && window.MARQUE ? MARQUE.pastille({ sections: { identite: { marqueIds: [mq] } } }, 44) : null,
        el("div.pj-id-t", {},
          el("p.studio-date", {}, el("a.mql-fil", { href: "#/projets" }, "Vos projets"), " · ",
            m ? el("a.mql-fil", { href: "#/projets/" + m.id }, m.nom) : "Sans marque", " · ",
            c.regime === "always-on" ? "le cycle qui tourne" : "temps fort"),
          el("h1", {}, c.nom),
          el("p.studio-intro", {}, e ? e.quoi : "")))));

    /* La piste qui gouverne les frères. Sans elle, le film et l'activation
     * de la même campagne ignorent le concept qu'on vient d'arbitrer. Son
     * titre est ce qu'un humain a écrit : il prend l'aplat d'intention. */
    if (reference.etat !== "absente" || vifs.length > 1) hote.appendChild(CAMPAGNE.blocReference(c.id, rafraichir));

    hote.appendChild(blocComposition(c, rafraichir));
    if (window.COUVERTURE && COUVERTURE.pieces(c)) hote.appendChild(COUVERTURE.pieces(c));
    /* Les vidéos et les EXE de la campagne : lus depuis l'export en local. */
    if (window.DISQUE && DISQUE.bloc(c.disque)) hote.appendChild(DISQUE.bloc(c.disque));
    var sku = blocSku(c, ps);
    if (sku) hote.appendChild(sku);

    if (!ps.length) {
      hote.appendChild(el("section.cg-bloc", {},
        el("div.section-titre", {}, "Les projets", el("span.taille", {}, "· aucun")),
        el("p.cg-q", {}, "Aucun projet n'est rangé ici. ",
          el("button.studio-lien", { type: "button", onclick: function () {
            CAMPAGNE.accueillir(c, rafraichir); } }, "Ranger des projets existants"))));
    }
    if (ps.length) {
      hote.appendChild(el("section.cg-bloc", {},
        el("div.section-titre", {}, "Les projets", el("span.taille", {}, "· " + ps.length),
          el("button.studio-lien", { type: "button", onclick: function () {
            CAMPAGNE.accueillir(c, rafraichir); } }, "Ranger des projets existants")),
        el("p.cg-q", {}, "Un projet peut en attendre un autre. Le dire fait apparaître "
          + "les jours de production qui courent à vide."),
        el("div.mpl-liste", {}, ps.map(function (x) {
          return ligneProjetChainee(x, ps, rafraichir); }))));
    }

    /* Le bilan de la campagne : son brouillon, ses versions arrêtées et leur
     * transmission à La Fusée quand La Barre y est ouverte. */
    hote.appendChild(CAMPAGNE.blocBilan(c, rafraichir));
  }

  /* Les SKU que la campagne montre : relevés sur ses visuels (c.skus, avec le fichier
   * en preuve) et déclarés par ses livrables (kv.sku). C'est ce lien qui fait remonter
   * une campagne depuis un pack — et qui dit, avant l'impression, quel pack part où.
   * Un lien relevé sur un visuel est une lecture, pas une saisie : il se contresigne. */
  function blocSku(c, ps) {
    var vus = {};
    function fiche(id) { return vus[id] || (vus[id] = { preuves: [], livrables: [] }); }
    (c.skus || []).forEach(function (x) { fiche(x.sku).preuves = (x.preuves || []).slice(); });
    ps.forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        ((l.kv || {}).sku || []).forEach(function (id) { fiche(id).livrables.push({ p: p, l: l }); });
      });
    });
    var ids = Object.keys(vus).filter(function (id) { return DEPOT.trouve("sku", id); });
    if (!ids.length) return null;
    var aQualifier = ids.filter(function (id) { return DEPOT.trouve("sku", id).aQualifier; }).length;
    return el("details.fonds.cg-sku", {},
      el("summary", {}, "Les SKU montrés", el("span.studio-compte", {}, String(ids.length)),
        el("span.fonds-q", {}, "relevés sur les visuels de la campagne et déclarés par ses livrables"
          + (aQualifier ? " · " + aQualifier + " fiche" + (aQualifier > 1 ? "s" : "") + " à qualifier" : ""))),
      el("div.fonds-g", {}, ids.map(function (id) {
        var s = DEPOT.trouve("sku", id), x = vus[id];
        var preuve = x.preuves.length && window.DISQUE ? DISQUE.depuisOrigine(x.preuves[0]) : null;
        return el("figure.fonds-c", { title: s.nom },
          s.vignette ? el("img", { src: s.vignette, alt: s.nom, loading: "lazy" }) : el("span.fonds-v", {}, "pas de packshot"),
          el("figcaption", {}, el("b", {}, s.nom),
            el("span.disque-m", {}, [
              x.livrables.length ? x.livrables.length + " livrable" + (x.livrables.length > 1 ? "s" : "") : null,
              x.preuves.length ? "vu sur " + x.preuves.length + " fichier" + (x.preuves.length > 1 ? "s" : "") : null,
              s.aQualifier ? "à qualifier" : null].filter(Boolean).join(" · "))),
          preuve && DISQUE.local ? el("span.disque-g", {},
            el("button.studio-lien", { type: "button", onclick: function () { DISQUE.ouvrir(preuve, false); } }, "Voir la preuve")) : null);
      })));
  }

  /* La composition : ce que l'occasion appelle, et ce qui est déjà ouvert. */
  function blocComposition(c, rafraichir) {
    var comp = CAMPAGNE.composition(c);
    if (!comp.length) {
      return el("section.cg-bloc", {},
        el("div.section-titre", {}, "Ce que cette occasion appelle"),
        el("p.cg-q", {}, "Cette campagne n'a pas d'occasion déclarée : la maison ne sait "
          + "pas ce qu'elle appelle d'habitude."));
    }
    var manquants = comp.filter(function (x) { return !x.projet && !x.ecarte; }).length;

    return el("section.cg-bloc", {},
      el("div.section-titre", {}, "Ce que cette occasion appelle",
        el("span.taille", {}, manquants
          ? "· " + manquants + " à décider" : "· tout est décidé")),
      el("p.cg-q", {}, "La maison propose ; elle n'ouvre rien seule. Ce qu'on écarte "
        + "garde sa date, pour ne pas se rediscuter deux fois."),
      el("div.cg-liste", {}, comp.map(function (x) {
        return ligneComposition(c, x, rafraichir); }))
    );
  }

  function ligneComposition(c, x, rafraichir) {
    /* Proposé : l'attente, filet et signe. Ouvert : le signe du fait. Écarté :
     * l'encre pâlit, la date et le motif restent. */
    var etat = x.projet ? "ouvert" : x.ecarte ? "ecarte" : "propose";
    return el("div.cg-c." + etat + (etat === "propose" ? ".f-attente" : ""), {},
      el("span.cg-n", {}, x.nature.nom,
        x.nature.quoi ? el("span.cg-nq", {}, x.nature.quoi) : null),
      el("span.cg-e", {},
        etat === "ouvert" ? [el("span.cg-signe", { "aria-hidden": "true" }, "✓ "),
            el("a", { href: "#/projets/" + x.projet.id }, x.projet.ref)]
          : etat === "ecarte" ? "Écarté le " + O.jourCourt(x.ecarte.quand)
            + (x.ecarte.motif ? " · " + x.ecarte.motif : "")
          : [el("span.cg-signe", { "aria-hidden": "true" }, "◐ "), "Pas encore ouvert"]),
      el("span.cg-g", {},
        etat === "ecarte"
          ? el("button.studio-lien", { type: "button", onclick: function () {
              CAMPAGNE.reprendre(c, x.nature.cle); rafraichir(); } }, "Reprendre")
          : etat === "propose"
            ? [
                el("button.studio-lien", { type: "button", onclick: function () {
                  ouvrirDepuisCampagne(c, x.nature, rafraichir); } }, "Ouvrir"),
                el("button.studio-lien", { type: "button", onclick: function () {
                  PANNEAU.demander("Écarter « " + x.nature.nom + " »", {
                    label: "Pourquoi",
                    aide: "Pourquoi cette campagne n'en a pas besoin. La réponse est "
                        + "datée et ne se rediscutera pas.",
                    lignes: 2, requis: "Un écart sans motif se rediscute la semaine suivante.",
                  }, function (motif) {
                    try { CAMPAGNE.ecarter(c, x.nature.cle, motif); }
                    catch (e) { if (DECISION.estRefus(e)) { AVIS.refus(e.message); return; } throw e; }
                    rafraichir(); });
                } }, "Écarter")]
            : null));
  }

  /* Ouvrir un projet DEPUIS la campagne : il hérite ce qu'elle porte déjà —
   * client, marques, marchés, fenêtre. C'est tout l'intérêt de l'étage. */
  function ouvrirDepuisCampagne(c, nature, rafraichir) {
    var p = DEPOT.ajoute("projets", Object.assign(DEPOT.referenceNeuve("MT"), {
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
    }));
    DEPOT.tracer("création depuis campagne", "projets", p.id, c.nom + " · " + nature.nom);
    DEPOT.enregistrer();
    AVIS.fait("« " + p.nom + " » est ouvert. Il hérite le client, les marques, "
      + "les marchés et la fenêtre de la campagne.");
    location.hash = "#/projets/" + p.id;
  }

  /* Une campagne dans la vie de sa marque : une section, son régime en
   * étiquette, son état en une phrase, ses projets en lignes. Le régime n'est
   * pas un état : il ne porte ni filet ni couleur. L'inférence du
   * rattachement, si — c'est une attente de contreseing. */
  function blocCampagne(c) {
    var ps = window.CAMPAGNE ? CAMPAGNE.projets(c.id) : [];
    var e = window.CAMPAGNE ? CAMPAGNE.etat(c) : null;
    var couv = window.COUVERTURE ? COUVERTURE.campagne(c) : null;
    return el("section.mqp-cmp" + (couv ? ".avec-couv" : ""), {},
      couv ? el("a.mqp-couv", { href: "#/projets/" + c.id, "aria-hidden": "true", tabindex: "-1" },
        COUVERTURE.rendre(couv, "carte", c.nom)) : null,
      el("div.mqp-t", {},
        el("h2", {}, el("a", { href: "#/projets/" + c.id }, c.nom)),
        el("span.mqp-r", {}, c.regime === "always-on" ? "Le cycle qui tourne" : "Temps fort"),
        c.infere ? el("span.mqp-i", {}, el("span.mqp-signe", { "aria-hidden": "true" }, "◐ "),
          "Rattachement inféré") : null),
      e ? el("p.mqp-q", {}, e.quoi) : null,
      ps.length ? el("div.mpl-liste", {}, ps.map(ligneProjetCourte)) : null);
  }

  /* La ligne d'un projet dans sa campagne, avec ce qu'il attend de ses frères.
   * Le chaînage se déclare ici et nulle part ailleurs : c'est le seul écran
   * où l'on voit les frères ensemble. */
  function ligneProjetChainee(p, freres, rafraichir) {
    var ligne = ligneProjetCourte(p);
    var amonts = (p.attend || []).map(function (id) {
      var a = DEPOT.trouve("projets", id); return a ? a.nom : null; }).filter(Boolean);

    var sel = el("select", { "aria-label": "Ce que « " + p.nom + " » attend",
      onclick: function (e) { e.preventDefault(); e.stopPropagation(); } });
    sel.appendChild(el("option", { value: "" }, "N'attend aucun autre projet"));
    freres.forEach(function (f) {
      if (f.id === p.id) return;
      sel.appendChild(el("option", { value: f.id,
        selected: (p.attend || []).indexOf(f.id) !== -1 ? "" : null },
        "Attend « " + f.nom.slice(0, 38) + " »"));
    });
    sel.onchange = function () {
      p.attend = sel.value ? [sel.value] : [];
      DEPOT.tracer("chaînage", "projets", p.id, sel.value || "délié");
      DEPOT.enregistrer();
      rafraichir();
    };

    return el("div.cg-pr" + (amonts.length ? ".f-attente" : ""), {}, ligne,
      el("div.cg-ch", {}, sel,
        el("button.studio-lien", { type: "button", onclick: function () {
          CAMPAGNE.choisir(p, rafraichir); } }, "Déplacer"),
        amonts.length ? el("span.cg-cha", {}, el("span.cg-signe", { "aria-hidden": "true" }, "◐ "),
          "En attente de " + amonts.join(", ")) : null));
  }

  function ligneProjetCourte(p) {
    var blocs = REGLES.blocages(p.id);
    var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
    var clos = window.CLOTURE && CLOTURE.est(p);
    var n = (p.livrables || []).filter(function (l) { return !l.annule; }).length;
    /* L'état par la forme : le filet et le signe disent ce qui bloque, le
     * texte reste gris. Un dossier clos pâlit sans rien réclamer. */
    return el("a.mpl" + (clos ? ".clos" : durs ? ".f-alerte" : ""), { href: "#/projets/" + p.id },
      el("span.mpl-r", {}, p.ref),
      el("span.mpl-n", {}, p.nom),
      el("span.mpl-t", {}, window.NATURE ? NATURE.nom(p) : ""),
      el("span.mpl-q", {}, clos ? [el("span.mpl-signe", { "aria-hidden": "true" }, "✓ "), "Clos"]
        : durs ? [el("span.mpl-signe", { "aria-hidden": "true" }, "● "),
            durs + (durs > 1 ? " blocages" : " blocage")]
        : n ? n + (n > 1 ? " livrables" : " livrable") : "Rien encore"));
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

  /* La couverture du projet : la sienne, sinon celle de sa campagne, sinon
   * le logo et les packs de sa marque — COUVERTURE dit d'où elle vient. */
  function visuelDe(p) {
    return window.COUVERTURE ? COUVERTURE.projet(p)
      : (p.livrables || []).filter(function (l) { return l.vignette; })[0];
  }
  function rendreVisuel(p, taille) {
    var v = visuelDe(p);
    return window.COUVERTURE ? COUVERTURE.rendre(v, taille, p.nom) : IMAGE.vignette(v, taille);
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
      vis ? el("span.dlr-v", {}, rendreVisuel(p, "carte")) : null,
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
        visuelDe(p) ? rendreVisuel(p, "carte") : null),
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
        /* Par identifiant : deux références provisoires se ressemblent. */
        par[b.type].dossiers[x.p.id] = x.p.ref;
      });
    });
    var tous = Object.keys(par).map(function (k) { return par[k]; })
      .sort(function (a, b) { return b.n - a.n; });

    if (!tous.length) {
      return el("aside.dl-mur", {},
        el("div.dlm-t", {}, "Ce qui bloque, tous dossiers"),
        el("p.rien", {}, "Rien n'est ouvert. C'est rare — vérifie que les dossiers "
          + "récents ont bien leur cadrage."));
    }

    return el("aside.dl-mur", {},
      el("div.dlm-t", {}, "Ce qui bloque, tous dossiers"),
      el("div.dlm-l", {}, tous.map(function (t) {
        var dur = t.type !== "infere-non-contresigne";
        return el("div.dlm-b" + (dur ? ".dur" : ""), {},
          el("span.dlmb-p", {}),
          el("span.dlmb-c", {},
            el("span.dlmb-q", {}, nomCourt(t.quoi), el("b", {}, String(t.n))),
            el("span.dlmb-x", {}, REGLES.prix(t.type)),
            el("span.dlmb-d", {}, Object.keys(t.dossiers).map(function (id) { return t.dossiers[id]; }).join("  ·  "))));
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
    /* La plateforme d'un dossier qui porte des marques se lit à la bibliothèque,
     * comme son écran la lit. Compter les champs du dossier disait « vide » sur
     * une campagne dont les marques ont leur plateforme — et le navigateur
     * contredisait la page qu'il ouvre. Une marque est tenue quand ses trois
     * champs requis sont écrits, chez elle ou hérités de plus haut. */
    if (cle === "socle" && window.MARQUE && window.VAULT && MARQUE.toutes(p).length) {
      var mqs = MARQUE.toutes(p);
      var sec = CHAMPS.sections.filter(function (s) { return s.cle === "socle"; })[0];
      var requis = sec.champs.filter(function (c) { return c.requis; }).map(function (c) { return c.cle; });
      var cles = sec.champs.map(function (c) { return c.cle; });
      function plein(m, k) {
        var v = (VAULT.pourDossier(p, m.id, k) || {}).valeur;
        return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && String(v).trim() !== "";
      }
      var ecrites = mqs.filter(function (m) { return cles.some(function (k) { return plein(m, k); }); });
      var tenues = mqs.filter(function (m) { return requis.every(function (k) { return plein(m, k); }); });
      if (!ecrites.length) return { classe: "vide", texte: "vide à la bibliothèque" };
      if (tenues.length === mqs.length) return { classe: "plein", texte: mqs.length + (mqs.length > 1 ? " marques tenues" : " marque tenue") };
      var manque = sec.champs.filter(function (c) {
        return c.requis && mqs.some(function (m) { return !plein(m, c.cle); }); })
        .map(function (c) { return c.nom.toLowerCase(); });
      return { classe: "partiel", texte: ecrites.length + " sur " + mqs.length
        + (mqs.length > 1 ? " marques écrites" : " marque écrite") + " · manque : " + manque.join(", ") };
    }
    var e = CHAMPS.etat(cle, p.sections[cle]);
    if (e.fait === 0) return { classe: "vide", texte: "vide" };
    if (e.manquants.length) return { classe: "partiel", texte: e.fait + "/" + e.total + " · " + e.manquants.length + (e.manquants.length > 1 ? " manquants" : " manquant") };
    return { classe: "plein", texte: e.fait + "/" + e.total };
  }

  /* ————————————————————— Nouveau projet ————————————————————— */

  function nouveau() {
    var choixG = "campagne";
    var selG = el("select", { id: "nouveau-projet-nature" });
    NATURE.liste().forEach(function (g) {
      selG.appendChild(el("option", { value: g.cle, title: g.quoi }, g.nom)); });
    selG.addEventListener("change", function () { choixG = selG.value; });

    var f = FORM.rendre([
      { cle: "client", nom: "Client", type: "texte", requis: true },
      { cle: "nom", nom: "Nom du projet", type: "texte", requis: true },
      { cle: "ref", nom: "Référence", type: "texte" },
      { cle: "echeance", nom: "Échéance", type: "date" },
    ], {});

    var selMarque = el("select", { id: "nouveau-projet-marque" }, el("option", { value: "" }, "À rattacher plus tard"));
    VAULT.marquesDisponibles().forEach(function (m) { selMarque.appendChild(el("option", { value: m.id }, m.nom)); });
    PANNEAU.ouvrir("Nouveau projet", "le projet peut commencer avant que tout soit renseigné", el("div", {},
      el("div.champ", {}, el("label", { for: "nouveau-projet-nature" }, "Gabarit"),
        el("div.indice", {}, "Une demande simple n'a pas huit sections. Le gabarit se choisit maintenant et ne change plus."), selG),
      f.noeud,
      el("div.champ", {}, el("label", { for: "nouveau-projet-marque" }, "Marque"), selMarque),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var d = f.valeurs();
          if (!d.nom || !d.client) { AVIS.refus("Renseignez le client et le nom du projet."); return; }
          /* Une référence saisie est gardée si aucun autre projet ne la porte ;
           * sans saisie, la base de référence attribue le numéro suivant. */
          var marqueId, reference;
          try { reference = DEPOT.referenceNeuve("PRJ", d.ref); }
          catch (e) { AVIS.refus(e.message); return; }
          try { marqueId = selMarque.value ? VAULT.admettreMarque(selMarque.value) : null; }
          catch (e) { AVIS.refus(e.message); return; }
          var p = DEPOT.ajoute("projets", Object.assign(reference, {
            nom: d.nom, nature: choixG, statut: "ouvert", equipe: [],
            sections: { identite: { client: d.client || "", echeance: d.echeance || "", marqueIds: marqueId ? [marqueId] : [] } },
            volets: [], livrables: [],
          }));
          PANNEAU.fermer();
          location.hash = "#/projets/" + p.id;
          VAULT.initialiser(function () { APP.rendre(); });
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
    var accesBrief = section === "brief" && VUE_BRIEF.estContextuel(p);
    var courante = section ? (g.sections.indexOf(section) !== -1 || accesBrief ? section : g.sections[0]) : null;
    var phs = phases(p, g);
    var blocs = REGLES.blocages(p.id);
    var ident = p.sections.identite || {};
    var cloture = CLOTURE.etat(p);
    var rafraichir = function () { projet(hote, id, courante); };
    var ouverts = Array.from(hote.querySelectorAll("details[open][data-pj-detail]"), function (d) {
      return d.dataset.pjDetail;
    });

    hote.className = "zone pj";
    O.vider(hote);

    if (!courante && APP.retour) hote.appendChild(APP.retour("#/projets", "Retour"));
    hote.appendChild(el("header.pj-entete",
      el("div.pj-id",
        visuelDossier(p),
        el("div.pj-id-t",
          el("p.pj-reference.studio-date", {}, [p.ref, g.nom].filter(Boolean).join(" · ")),
          el("h1", {}, p.nom),
          el("div.pj-reperes",
            el("span", {}, nomClient(p) || "Client à renseigner"),
            ident.echeance ? el("span.pj-echeance", {}, UI.icone("horloge", 15), "Échéance le " + O.joli(ident.echeance)) : null))),
      el("span.pj-statut" + (cloture || p.fusionne ? ".archive" : ""), {},
        p.fusionne ? "Fusionné" : cloture ? cloture.nom : "En cours")));

    hote.appendChild(navigateur(p, phs, courante));
    hote.appendChild(el("div.pj-corps", {},
      courante
        ? el("div.pj-section", {}, corpsSection(p, courante, rafraichir))
        : vueEnsemble(p, phs, rafraichir),
      panneauSuivi(p, g, phs, courante, blocs, rafraichir)
    ));
    hote.querySelectorAll("details[data-pj-detail]").forEach(function (d) {
      d.open = ouverts.indexOf(d.dataset.pjDetail) !== -1;
    });
  }

  function visuelDossier(p) {
    var marque = MARQUE.pastille(p, 48);
    return marque.classList.contains("sans")
      ? el("span.pj-dossier-ico", { "aria-hidden": "true" }, UI.icone("projets", 23))
      : marque;
  }

  function prochainGeste(p, phs, rafraichir) {
    var lien = "#/projets/" + p.id;
    var phase = phs.find(function (x) { return x.etat !== "fait"; });
    var etape = phase && phase.bloque;
    var sections = NATURE.sections(p);
    var archive = CLOTURE.est(p);
    var cible = p.fusionne && DEPOT.trouve("projets", p.fusionne.dans);
    function action(titre, detail, section, nom) {
      return { titre: titre, detail: detail,
        action: el("a.b.or", { href: lien + "/" + section }, nom) };
    }

    if (cible) return { titre: "Projet fusionné", detail: cible.nom,
      action: el("a.b.or", { href: "#/projets/" + cible.id }, "Ouvrir le projet principal") };
    if (p.fusionne) return { titre: "Projet fusionné", detail: "Dossier cible : " + p.fusionne.dans };
    if (archive) {
      var cle = sections.indexOf("livrables") !== -1 ? "livrables"
        : sections.indexOf("presentation") !== -1 ? "presentation" : "identite";
      return action("Projet clos", CLOTURE.etat(p).quoi, cle,
        { livrables: "Consulter les livrables", presentation: "Consulter la présentation" }[cle] || "Consulter le dossier");
    }

    var recu = VUE_BRIEF.reception(p);
    var contexteBrief = VUE_BRIEF.estContextuel(p);
    if (recu.statut === "sous_reserve" && (sections.indexOf("brief") !== -1 || contexteBrief)) {
      return action("Relire le retour sur le brief", (p.sections.brief.reserve || {}).motif,
        "brief", "Consulter le retour");
    }
    if (recu.existe && !recu.statut && !VALIDATION.valide(p.sections.brief || {})
        && (sections.indexOf("brief") !== -1 || contexteBrief)) {
      return action("Examiner la demande reçue", "Brief de projet · V" + recu.version, "brief", "Ouvrir le brief");
    }
    var piece = VUE_REVUE.pieces().find(function (x) { return x.projet.id === p.id; });
    if (piece) {
      return { titre: "Examiner une pièce", detail: piece.titre,
        action: APP.adresse ? el("a.b.or", {
          href: APP.adresse("projets", p.id, piece.type === "piste" ? "pistes" : "livrables", piece.id),
        }, "Examiner la pièce") : el("button.b.or", { type: "button", onclick: function () {
          if (piece.type === "piste") VUE_ROUTE.ouvrir(p, piece.objet, rafraichir);
          else VUE_ASSET.ouvrir(p, piece.objet, rafraichir, "juger");
        } }, "Examiner la pièce") };
    }
    if (contexteBrief && !recu.existe && (NATURE.de(p) || {}).cle === "demande") {
      return action("Consigner la demande", "La note d’origine reste attachée au dossier.", "brief", "Ouvrir la demande");
    }
    if (sections.indexOf("livraison") !== -1 && REMISE.etat(p).cle !== "rien") {
      return { titre: "Vérifier la remise", detail: REMISE.etat(p).nom,
        action: el("button.b.or", { type: "button", onclick: function () { REMISE.ouvrir(p); } }, "Ouvrir le manifeste") };
    }
    if (etape) return action("Reprendre le dossier", nomSection(etape.cle) + " · " + etape.e.texte,
      etape.cle, "Ouvrir « " + nomSection(etape.cle) + " »");
    return action("Consulter le dossier", "", sections[0], "Voir " + nomSection(sections[0]).toLowerCase());
  }

  function vueEnsemble(p, phs, rafraichir) {
    var ident = p.sections.identite || {};
    var geste = prochainGeste(p, phs, rafraichir);
    return el("div.pj-apercu", {},
      el("section.pj-reprise", { "aria-labelledby": "pj-continuer" },
        el("div.pj-reprise-texte",
          el("h2", { id: "pj-continuer" }, geste.titre),
          geste.detail ? el("p", {}, geste.detail) : null),
        geste.action),
      el("section.pj-contextuel", { "aria-labelledby": "pj-contexte" },
        el("h2", { id: "pj-contexte" }, "Repères du projet"),
        el("dl.pj-meta", {},
          meta("Marchés", marches(p)),
          meta("Supports", supports(p)),
          meta("Décideur final", nomDecideur(p)),
          meta("Fenêtre", ident.fenetre)
        ),
        el("details.pj-detail.pj-contextuel-more", { "data-pj-detail": "contexte" },
          el("summary", {}, "Rattachements et références"),
          p.refDemandee ? el("button.studio-lien", { type: "button", onclick: function () { redemander(p, rafraichir); } },
            "Modifier la référence demandée") : null,
          ligneCampagne(p, rafraichir),
          window.STRUCTURE ? STRUCTURE.ligne(p) : null,
          chezPeople(p)))
    );
  }

  function panneauBlocages(p, blocs, rafraichir) {
    var blocages = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; });
    var ordre = blocages.concat(blocs.filter(function (b) { return b.type === "infere-non-contresigne"; }));

    return el("div.pj-points", {}, ordre.map(function (b) { return ligneBlocage(p, b, rafraichir); }));
  }

  function ligneBlocage(p, b, rafraichir) {
    var infere = b.type === "infere-non-contresigne";
    return el("div.pj-point." + (infere ? "attente" : "alerte"), { "data-blocage": b.cle },
      el("p.pj-point-nom", {}, UI.icone(infere ? "horloge" : "alerte", 17), el("strong", {}, b.quoi)),
      el("p.pj-point-date", {}, b.jours === 0 ? "Signalé aujourd’hui" : "Depuis " + b.jours + (b.jours > 1 ? " jours" : " jour")),
      b.prix ? el("p.pj-point-cout", {}, b.prix) : null,
      el("div.pj-point-actions", {},
        (b.pieces || []).length ? el("button.studio-lien", { type: "button",
          onclick: function () { lesPieces(p, b, rafraichir); } },
          b.pieces.length === 1 ? "Voir le livrable" : "Voir les " + b.pieces.length + " livrables") : null,
        infere ? el("button.studio-lien", { type: "button",
          onclick: function () { INFERENCE.panneau(p, rafraichir); } }, "Faire contresigner") : null,
        window.VUE_DOCTRINE ? VUE_DOCTRINE.lien(b.type) : null));
  }

  function panneauSuivi(p, g, phs, courante, blocs, rafraichir) {
    var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
    var transition = courante ? transitionDossier(p, phs, courante, rafraichir) : null;
    var rubriques = [
      ["documents", "Documents et phases précédentes", transition],
      ["activite-idee", "Validations par marché et activité", courante === "bigidea" ? VUE_BIGIDEA.rail(p) : null],
      ["champs", "Champs à renseigner", panneauSante(p, g, durs)],
      ["equipe", "Équipe", panneauEquipe(p)],
      ["cout", "Chiffrage", panneauChiffrage(p, rafraichir)],
      ["remise", "Remise et manifeste", panneauRemise(p)],
      ["resultat", "Résultats", panneauResultat(p, rafraichir)],
      ["cloture", "Clôture", panneauCloture(p, rafraichir)],
      ["releve", "Relevé d’origine", panneauReleve(p)],
    ];
    return el("details.pj-suivi.pj-detail", { id: "pj-suivi", "data-pj-detail": "suivi" },
      el("summary", {}, "Suivi du projet",
        blocs.length ? el("span.studio-compte" + (durs ? ".alerte" : ""), {},
          blocs.length + (blocs.length > 1 ? " points à traiter" : " point à traiter")) : null),
      el("div.pj-suivi-corps", {},
        blocs.length ? panneauBlocages(p, blocs, rafraichir) : null,
        rubriques.filter(function (r) { return r[2]; }).map(function (r) {
          return el("details.pj-detail", { "data-pj-detail": r[0] }, el("summary", {}, r[1]), r[2]);
        })));
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
      el("span.pep-t", {}, "Dans " + ((MAISON.registres || {}).people || "le registre des projets")),
      el("span.pep-r", {}, n
        ? (x.refs || []).join("  ·  ") + (x.nom ? "  —  " + x.nom : "")
        : "aucun dossier correspondant"),
      x.note ? el("p.pep-n", {}, x.note) : null);
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

  /* Le parcours s’appuie sur les phases métier et les rubriques propres à la nature. */
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

  function navigateur(p, phs, courante) {
    var lien = "#/projets/" + p.id;
    var contextuel = VUE_BRIEF.estContextuel(p);
    var ici = phs.find(function (x) {
      return x.cles.indexOf(courante) !== -1 || (courante === "brief" && contextuel && x.ph.cle === "cadrer");
    });
    var SIGNES = { plein: "✓", partiel: "◐", vide: "○" };
    var etapes = ici ? ici.etats.slice() : [];
    if (ici && ici.ph.cle === "cadrer" && contextuel && ici.cles.indexOf("brief") === -1) {
      etapes.splice(1, 0, { cle: "brief", e: etatSection(p, "brief"),
        etiquette: (NATURE.de(p) || {}).cle === "pitch" ? "Brief du pitch" : "Demande d’origine" });
    }

    return el("nav.pj-nav", { "aria-label": "Étapes du projet" },
      el("div.pj-phases", { role: "group", "aria-label": "Phases" },
        el("a.pj-phase", { href: lien, "aria-current": courante ? null : "page" }, "Vue d’ensemble"),
        phs.map(function (x) {
          return el("a.pj-phase", {
            href: lien + "/" + (x === ici ? courante : premierUtile(x)),
            "aria-current": x === ici ? "step" : null,
          }, x.ph.nom);
        })),
      etapes.length ? el("div.pj-etapes", { role: "group", "aria-label": "Sections de " + ici.ph.nom }, etapes.map(function (x) {
        var etiquette = x.etiquette || nomSection(x.cle);
        return el("a.pj-etape." + x.e.classe, {
          href: lien + "/" + x.cle,
          "aria-current": x.cle === courante ? "page" : null,
          "aria-description": x.e.texte,
        }, el("span.pje-s", { "aria-hidden": "true" }, SIGNES[x.e.classe]), etiquette);
      })) : null);
  }

  function transitionDossier(p, phs, courante, rafraichir) {
    var rang = phs.findIndex(function (x) { return x.cles.indexOf(courante) !== -1; });
    if (rang < 0) return null;
    var ici = phs[rang];
    var amont = phs.slice(0, rang).filter(function (x) { return x.etat !== "fait"; });
    var doc = { cadrer: "cadrage", concevoir: "conception" }[ici.ph.cle];
    if (!doc && !amont.length) return null;
    var d = doc && COMPILATEUR.DOCS[doc];
    var manque = d && COMPILATEUR.controles(p, doc).filter(function (c) { return !c.ok; }).length;
    return el("div.pj-transition", {},
      amont.length ? el("div.pj-condition", {},
        el("p", {}, UI.icone("alerte", 17),
          el("span", {},
            el("strong", {}, "Phases en amont à compléter"),
            " · " + amont.map(function (x) { return x.ph.nom; }).join(", "))),
        el("details.pj-details-condition", { "data-pj-detail": "condition" },
          el("summary", {}, "Conséquence"),
          el("p", {}, ici.ph.sans))) : null,
      d ? el("div.pj-document", {},
        el("span.pj-document-etat", {}, UI.icone("fichier", 16),
          manque ? manque + (manque === 1 ? " contrôle à compléter" : " contrôles à compléter") : "Document complet"),
        el("button.studio-lien", { type: "button", title: manque ? d.sans : d.ouvre,
          onclick: function () { COMPILATEUR.ouvrir(p, doc, rafraichir); } }, d.nom)) : null);
  }

  function premierUtile(x) {
    return x.bloque ? x.bloque.cle : x.cles[0];
  }

  /* La campagne du projet, et ses frères : un projet n'est presque jamais
   * seul dans un temps fort. Le geste pour l'y ranger est ici, là où l'on
   * travaille — pas seulement depuis la campagne. */
  function ligneCampagne(p, rafraichir) {
    /* Un doublon fusionné garde sa fiche — un lien ancien y mène — et dit où
     * vit désormais le dossier. */
    if (p.fusionne) {
      var g = DEPOT.trouve("projets", p.fusionne.dans);
      return el("p.pj-cmp", {}, el("span.pj-cmp-e", {}, "Doublon"), " fusionné dans ",
        g ? el("a", { href: "#/projets/" + g.id }, g.nom) : p.fusionne.dans, " — " + p.fusionne.motif);
    }
    if (!window.CAMPAGNE) return null;
    var c = CAMPAGNE.de(p.campagneId);
    var n = c ? CAMPAGNE.projets(c.id).length - 1 : 0;
    return el("p.pj-cmp", {},
      c ? [el("span.pj-cmp-e", {}, "Campagne"), " ", el("a", { href: "#/projets/" + c.id }, c.nom),
          n ? " · avec " + n + (n > 1 ? " autres projets" : " autre projet") : " · seul projet à ce jour"]
        : [el("span.pj-cmp-e", {}, "Campagne"), " ", el("span.pj-cmp-v", {}, "Aucune campagne liée")],
      el("button.studio-lien", { type: "button", onclick: function () { CAMPAGNE.choisir(p, rafraichir); } },
        c ? "Changer de campagne" : "Associer une campagne"));
  }

  function meta(t, v) {
    return el("div.pj-m", {}, el("dt", {}, t), el("dd" + (v ? "" : ".vide"), {}, v || "Non renseigné"));
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
      el("h3", {}, "Santé du dossier", el("span.droite", { style: { color: part === 100 ? "var(--vert)" : "var(--attente)" } }, part + " %")),
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
                el("div.fi-nom.psa-m", {}, el("span.psa-s", { "aria-hidden": "true" }, "○"), m)));
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
      el("h3", {}, "Équipe"),
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
    var confirmations = INFERENCE.bande(p, rafraichir, cle);
    var objet = VALIDATION.OBJETS[cle] && !(cle === "brief" && VUE_BRIEF.estContextuel(p))
      ? objetValidable(p, cle) : null;
    var validation = objet ? VALIDATION.bande(p, cle, objet, rafraichir) : null;
    if (!confirmations && !validation) return corps;
    var statut = objet ? VALIDATION.etat(objet) : null;
    return el("div.pj-contenu", {}, corps,
      el("details.pj-procedure.pj-detail", { "data-pj-detail": "procedure-" + cle },
        el("summary", {}, validation ? "Validation et versions" : "Confirmations de la rubrique",
          statut ? el("span.studio-compte", {},
            statut.cle === "aucun" ? "En attente" : VALIDATION.perime(objet) ? "À renouveler" : statut.nom) : null,
          confirmations ? el("span.studio-compte", {}, "À confirmer") : null),
        el("div.pj-procedure-corps", {}, confirmations, validation)));
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

  /* Une référence encore provisoire se change : une saisie que la base de
   * référence refuse, parce qu'un autre projet la porte déjà (REFERENCE_PRISE),
   * se corrige ici. Vide, la base attribue le numéro suivant du préfixe. Une
   * référence attribuée ne se change plus. */
  function redemander(p, rafraichir) {
    var d = p.refDemandee;
    PANNEAU.demander("Référence demandée", {
      label: "Référence", valeur: d.saisie || "", etiquette: p.nom,
      aide: "Elle est attribuée au prochain enregistrement, si aucun autre projet ne la porte. "
        + "Laissez vide pour recevoir le numéro suivant (" + (d.prefixe || "PRJ") + "-…).",
    }, function (v) {
      try { DEPOT.redemanderReference(p, v); }
      catch (e) { AVIS.refus(e.message); return; }
      rafraichir();
    });
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
      el("header.pj-travail-entete", {}, el("h2", {}, "Identité"),
        el("button.b.or", { type: "button", onclick: function () { editer(p, "identite", def, rafraichir); } },
          "Compléter la section")),
      el("div.id-g" + (inferes.length ? "" : ".seule"), {},
        el("div.id-col", {},
          el("div.idc-t", {}, "Renseigné",
            el("span.studio-compte", {}, String(recus.length))),
          recus.length
            ? recus.map(function (x) {
                return el("button.id-l", { type: "button", title: "modifier — " + x.c.nom,
                  onclick: function () { editerChamp(p, "identite", x.c.cle, rafraichir); } },
                  el("span.idl-n", {}, x.c.nom),
                  el("span.idl-v", {}, valeurLisible(x.c, x.v)));
              })
            : el("p.rien", {}, "Aucune valeur renseignée hors des propositions à confirmer.")),

        inferes.length ? el("div.id-col.infere", {},
          el("div.idc-t", {}, "À confirmer",
            el("span.studio-compte", {}, String(inferes.length))),
          inferes.map(function (x) {
                return el("div.id-l", {},
                  el("button.idl-h", { type: "button", title: "modifier — " + x.c.nom,
                    onclick: function () { editerChamp(p, "identite", x.c.cle, rafraichir); } },
                    el("span.idl-n", {}, x.c.nom),
                    el("span.idl-v", {}, valeurLisible(x.c, x.v))),
                  el("span.idl-p", {}, INFERENCE.pourquoi(p, "identite", x.c.cle)),
                  el("div.idl-g", {},
                    el("button.studio-lien", { type: "button", onclick: function () {
                      INFERENCE.confirmer(p, "identite", x.c.cle, rafraichir);
                    } }, "Consigner une confirmation →"),
                    el("button.studio-lien.idl-faux", { type: "button", onclick: function () {
                      INFERENCE.rejeter(p, "identite", x.c.cle);
                      DEPOT.enregistrer(); rafraichir();
                    } }, "Faux, à ressaisir")));
              })) : null),

      vides.length
        ? el("details.pj-procedure.pj-detail", { "data-pj-detail": "identite-champs" },
            el("summary", {}, "Champs à renseigner", el("span.studio-compte", {}, String(vides.length))),
            el("div.pj-procedure-corps", {}, vides.map(function (c) {
              return el("button.id-v", { type: "button", title: "renseigner — " + c.nom,
                onclick: function () { editerChamp(p, "identite", c.cle, rafraichir); } },
                el("span.idv-n", {}, el("span.idv-s", { "aria-hidden": "true" }, "○"), c.nom),
                el("span.idv-x", {}, c.critique
                  ? REGLES.prix(c.cle === "decideur" ? "decideur-absent"
                      : c.cle === "tueur" ? "tueur-absent"
                      : c.cle === "fenetre" ? "fenetre-absente" : "sans-proprietaire")
                  : "à renseigner — sans quoi la charge de ce dossier reste fausse"));
            })))
        : null,

      /* La bande de contreseing : elle nomme qui doit signer, pas « le client ». */
      inferes.length ? el("div.id-sign.due", {},
        el("div.ids-t", {}, "Confirmations en attente"),
        el("div.ids-c", {}, el("p", {}, (inferes.length > 1
          ? inferes.length + " champs doivent être confirmés par " : "Un champ doit être confirmé par ")
          + (pe ? pe.nom : "la " + clientele.nom) + ".")),
        el("div.ids-g", {}, el("button.b", { type: "button", onclick: function () {
          RENVOI.ouvrir({ quoi: "Contreseing de l'identité — " + inferes.length + " champs",
            projet: p.ref, projetId: p.id });
        } }, "Écrire la demande de contreseing"))) : null
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
            infere ? el("span.ste-i", {}, INFERENCE.libelle(p, "strategie", c.cle)) : null),
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
          "Compléter"))
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
    var monPoste = ACTEUR.exerce(def.poste);

    return el("div.se-propre", {},
      el("div.section-titre.se-titre", {}, def.nom,
        el("span.compte", {}, e.fait + " sur " + e.total + " champs"),
        el("span.droite", {}, "Propriétaire : " + O.poste(def.poste).nom)),

      e.manquants.length ? el("div.prix", {}, el("span.signe", {}, "⚠"),
        e.manquants.length + (e.manquants.length > 1 ? " champs manquants : " : " champ manquant : ")
        + e.manquants.map(function (c) { return c.nom; }).join(" · ")) : null,

      /* Les champs dans une section blanche, comme partout ailleurs. */
      el("div.se-champs.se-champs-seul", {},
        FORM.lire(def.champs, donnees, { projet: p, section: cle,
          editer: function (k) { editerChamp(p, cle, k, rafraichir); } })),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () { editer(p, cle, def, rafraichir); } },
          "Compléter"),
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

    var monPoste = window.ACTEUR ? ACTEUR.exerce(c.poste || def.poste) : def.poste === MAISON.titulaire;
    var f = FORM.rendre([c], p.sections[cle] || {}, { frontiere: true, poste: def.poste });
    var infere = INFERENCE.est(p, cle, champCle);
    var confirme = INFERENCE.confirmation(p, cle, champCle);

    PANNEAU.ouvrir(c.nom, p.ref + "  ·  " + def.nom, el("div", {},
      !monPoste
        ? el("div.prix", {}, el("span.signe", {}, "⚠"),
            "Ce champ appartient à " + O.poste(def.poste).nom
            + ". Vous pouvez préparer une proposition. Sa confirmation reste un geste distinct.")
        : null,
      infere
        ? el("div.prix", {}, el("span.signe", {}, "◐"),
            "Confirmation en attente : « " + INFERENCE.pourquoi(p, cle, champCle)
            + " » Votre correction sera conservée sans devenir un accord implicite.")
        : null,
      c.aide ? el("p.ch-aide", {}, c.aide) : null,
      confirme ? el("p.indice", {}, "Confirmation consignée : " + confirme.qui + " · " + confirme.reference) : null,
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          FORM.appliquer(f, function () { return p.sections[cle] || {}; }, function (changements) {
            if (corrigerChamps(p, cle, changements)) DEPOT.tracer("saisie", "projets", p.id, def.nom + " · " + c.nom);
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          });
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function corrigerChamps(p, cle, changements) {
    if (cle === "brief" && window.VUE_BRIEF && Object.keys(changements).some(function (c) {
      return JSON.stringify((p.sections.brief || {})[c]) !== JSON.stringify(changements[c]);
    })) VUE_BRIEF.preparerRevision(p);
    return INFERENCE.corriger(p, cle, changements);
  }

  function editer(p, cle, def, rafraichir) {
    var monPoste = window.ACTEUR ? ACTEUR.exerce(def.poste) : def.poste === MAISON.titulaire;
    var f = FORM.rendre(def.champs, p.sections[cle] || {}, { frontiere: true, poste: def.poste });

    PANNEAU.ouvrir("Compléter — " + def.nom, p.ref, el("div", {},
      !monPoste ? el("div.prix", {}, el("span.signe", {}, "⚠"),
        "Cette section appartient à " + O.poste(def.poste).nom
        + ". Vous pouvez préparer les champs ; leurs confirmations restent à consigner.") : null,
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          FORM.appliquer(f, function () { return p.sections[cle] || {}; }, function (changements) {
            if (corrigerChamps(p, cle, changements)) DEPOT.tracer("saisie", "projets", p.id, def.nom);
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          });
        } }, "Enregistrer"),
        !monPoste ? el("button.b", { type: "button", onclick: function () {
          FORM.appliquer(f, function () { return p.sections[cle] || {}; }, function (changements) {
            if (corrigerChamps(p, cle, changements)) DEPOT.tracer("saisie", "projets", p.id, def.nom);
            DEPOT.enregistrer(); PANNEAU.fermer();
            RENVOI.ouvrir({ quoi: def.nom + " — demande de confirmation", projet: p.ref, projetId: p.id, objet: cle });
          });
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
