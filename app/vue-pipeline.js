/* vue-pipeline.js — tous les projets, toutes les pièces, tous les retours.
 *
 * C'est l'écran qui répond aux trois questions qu'aucun autre ne portait :
 *   — sur combien d'assets on travaille, et où ils en sont
 *   — combien sont touchés par tel retour, et par qui il a été formulé
 *   — sur quoi je peux m'opposer, et depuis quand j'aurais pu
 *
 * Il ne juge personne. Il compte. C'est ce qui manque le 30 du mois.
 */

window.VUE_PIPELINE = (function () {
  var el = O.el;
  var vue = "ordre";

  /* Deux modes seulement. « Les retours » disait la même chose que les
   * modifications dues dans Décider ; « qui bouscule » regarde le trimestre et
   * appartient donc à Constater. Deux vérités sur le même fait, c'est une de
   * trop. */
  var VUES = [
    { cle: "ordre", nom: "L'ORDRE" },
    { cle: "charge", nom: "LA CHARGE" },
  ];

  /* Le pipeline n'est plus une destination : c'est le corps de deux modes de
   * Placer. Il ne porte donc plus ni titre d'écran ni onglets — ceux-ci
   * appartiennent à l'intention qui l'appelle. */
  function rendre(hote, impose) {
    if (impose) vue = impose;
    hote.className = hote.className || "";
    O.vider(hote);

    var pieces = PRODUCTION.toutesLesPieces();
    hote.appendChild(el("div", {},
      bandeHaute(pieces),
      el("div", { style: { "margin-top": "1rem" } },
        vue === "charge" ? charge(pieces, hote) : ordre(hote))
    ));
  }

  /* ————————————————————— Les quatre nombres ————————————————————— */

  function bandeHaute(pieces) {
    var pretes = 0, sansResp = 0, touchees = 0;
    var parProjet = {};
    pieces.forEach(function (x) {
      parProjet[x.projet.id] = true;
      if (PRODUCTION.ouverte(x.projet, x.l)) pretes++;
      if (!x.l.responsable) sansResp++;
    });

    var fbOuverts = FEEDBACK.ouverts();
    fbOuverts.forEach(function (f) { touchees += FEEDBACK.impact(f).assets; });

    var fermes = 0, specu = 0;
    pieces.forEach(function (x) {
      if (PRIORITE.rangPiece(x.projet, x.l) <= 1) fermes++; else specu++;
    });

    return el("div.pi-haut", {},
      kpi(String(pieces.length), "assets en cours",
        Object.keys(parProjet).length + " dossiers", ""),
      kpi(fermes + " / " + pieces.length, "engagés ou fermes",
        specu + " spéculatifs", fermes ? "vert" : "attente"),
      kpi(pretes + " / " + pieces.length, "prêtes à produire",
        pretes === pieces.length ? "tout peut partir" : (pieces.length - pretes) + " bloquées", pretes < pieces.length ? "alerte" : "vert"),
      kpi(String(fbOuverts.length), fbOuverts.length > 1 ? "retours non tranchés" : "retour non tranché",
        touchees + (touchees > 1 ? " pièces suspendues" : " pièce suspendue"), fbOuverts.length ? "alerte" : "vert"),
      kpi(String(sansResp), "sans responsable",
        sansResp ? "personne en défaut le jour où ça n'avance pas" : "toutes affectées", sansResp ? "attente" : "vert")
    );
  }

  function kpi(v, t, s, ton) {
    return el("div.pi-k" + (ton ? "." + ton : ""), {},
      el("b", {}, v), el("span.pik-t", {}, t), el("span.pik-s", {}, s));
  }

  /* ————————————————————— L'ordre : ce qui passe avant ————————————————————— */

  /* Le seul écran qui répond à « sur quoi je mets mes gens ce matin ». On ne
   * trie pas par urgence ressentie, on trie par engagement pris. */
  /* ————————————————————— L'ordre : une balance ————————————————————— */

  /* Quatre bandes empilées se lisaient comme un classement. Or ce n'est pas un
   * classement, c'est un CONFLIT : d'un côté ce que le client a payé, de
   * l'autre ce qu'on produit en espérant qu'il paie. Deux colonnes qui se font
   * face rendent le déséquilibre physique — on le voit avant de le lire.
   *
   * « Aucun client ne doit souffrir » est la loi de cet écran. */

  function ordre(hote) {
    var rangs = [[], [], [], []];
    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        var ls = (p.livrables || []).filter(function (l) { return !l.annule && l.pisteId === pi.id; });
        rangs[PRIORITE.rang(pi)].push({ p: p, pi: pi, ls: ls });
      });
      var orphelines = (p.livrables || []).filter(function (l) {
        return !l.annule && !(p.sections.pistes || []).some(function (x) { return x.id === l.pisteId; }); });
      if (orphelines.length) rangs[3].push({ p: p, pi: null, ls: orphelines });
    });

    /* Ce que chaque côté consomme en jours : c'est la hauteur de la colonne. */
    function jours(g) {
      return g.reduce(function (t, x) {
        return t + x.ls.reduce(function (n, l) { return n + (l.estime || 0); }, 0); }, 0);
    }
    function pieces(g) { return g.reduce(function (t, x) { return t + x.ls.length; }, 0); }

    var vendu = { j: jours(rangs[0]) + jours(rangs[1]), n: pieces(rangs[0]) + pieces(rangs[1]) };
    var parie = { j: jours(rangs[2]) + jours(rangs[3]), n: pieces(rangs[2]) + pieces(rangs[3]) };
    var haut = Math.max(vendu.j, parie.j, 1);
    var c = PRIORITE.conflits();

    return el("div.bl", {},
      el("div.bl-t", {},
        el("h3", {}, parie.n && !vendu.n
          ? parie.n + " pièces se fabriquent, aucune n'est vendue"
          : vendu.n && parie.n
            ? Math.round(parie.j) + " j pariés contre " + Math.round(vendu.j) + " j vendus"
            : "Tout ce qui se produit est vendu"),
        el("p", {}, parie.n && !vendu.n
          ? "Rien n'est validé ni payé. Le jour où un autre client signe, ces jours-là seront déjà pris."
          : "Ce qui est payé passe avant ce qui espère l'être. Aucun client ne doit souffrir.")),

      /* Les deux plateaux, de part et d'autre d'un axe. */
      el("div.bl-b", {},
        cote("vendu", "CE QUI EST VENDU", vendu, haut, [
          { r: PRIORITE.RANGS[0], g: rangs[0] }, { r: PRIORITE.RANGS[1], g: rangs[1] },
        ], hote),
        el("div.bl-axe", {}),
        cote("parie", "CE QUI EST PARIÉ", parie, haut, [
          { r: PRIORITE.RANGS[2], g: rangs[2] }, { r: PRIORITE.RANGS[3], g: rangs[3] },
        ], hote)),

      /* Ce qui ferait basculer la balance — le geste, pas le constat. */
      el("div.bl-d", {},
        el("div.bld-t", {}, "CE QUI DÉBLOQUERAIT LA BALANCE"),
        el("p", {}, debloquer(rangs)),
        el("div.form-actions", {}, gestesBalance(rangs))),

      c.conflits.length
        ? el("div.pi-conflit", {},
            el("div.pic-t", {}, "DU SPÉCULATIF DEVANT DU FERME"),
            c.conflits.map(function (x) {
              return el("div.pic-l", {},
                x.personne ? UI.avatar(x.personne, 24) : null,
                el("div", {},
                  el("div.picl-n", {}, (x.personne ? x.personne.nom : "quelqu'un")
                    + " tient " + x.speculatif.length
                    + (x.speculatif.length > 1 ? " pièces spéculatives" : " pièce spéculative")
                    + " pendant que " + x.ferme.length
                    + (x.ferme.length > 1 ? " pièces engagées sont" : " pièce engagée est") + " en retard."),
                  el("div.picl-d", {}, x.ferme.slice(0, 3).map(function (f) {
                    return f.p.ref + " · " + f.l.nom; }).join("  ·  "))));
            }),
            el("div.pic-r", {}, "Ce n'est pas un reproche : c'est l'ordre qui n'a pas été dit."))
        : null
    );
  }

  /* Un plateau : sa hauteur est proportionnelle aux jours consommés. */
  function cote(cle, titre, tot, haut, blocs, hote) {
    var vide = !tot.n;
    return el("div.bl-c." + cle, {},
      el("div.blc-t", {}, titre),
      el("div.blc-p", {}, blocs.map(function (b) {
        var j = b.g.reduce(function (t, x) {
          return t + x.ls.reduce(function (n, l) { return n + (l.estime || 0); }, 0); }, 0);
        var n = b.g.reduce(function (t, x) { return t + x.ls.length; }, 0);
        var h = Math.max(n ? 54 : 34, Math.round((j / haut) * 260));
        return el("div.blc-b." + b.r.ton + (n ? "" : ".creux"), {
          style: { height: h + "px" },
          title: b.r.regle,
        },
          el("span.blcb-n", {}, b.r.nom.toUpperCase()),
          el("span.blcb-c", {}, n ? n + (n > 1 ? " pièces · " : " pièce · ") + Math.round(j) + " j"
            : "aucune pièce"),
          n && b.g.length ? el("div.blcb-v", {}, vignettesDe(b.g)) : null);
      })),
      el("div.blc-s" + (vide ? ".creux" : ""), {}, vide
        ? (cle === "vendu" ? "0 jour engagé contractuellement" : "rien de parié")
        : Math.round(tot.j) + " j sur " + tot.n + (tot.n > 1 ? " pièces" : " pièce")));
  }

  function vignettesDe(g) {
    var v = [];
    g.forEach(function (x) { x.ls.forEach(function (l) { if (l.vignette && v.length < 12) v.push(l); }); });
    return v.map(function (l) { return IMAGE.vignette(l, "carte"); });
  }

  function debloquer(rangs) {
    var enLice = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        if (pi.statut === "proposee") enLice.push({ p: p, pi: pi });
      });
    });
    if (enLice.length) {
      var age = enLice.reduce(function (n, x) {
        return Math.max(n, x.pi.soumis_le ? O.depuis(x.pi.soumis_le) : 0); }, 0);
      return "Une route retenue et validée fait basculer ses pièces à gauche. "
        + enLice.length + (enLice.length > 1 ? " routes sont en lice" : " route est en lice")
        + (age ? " depuis " + age + (age > 1 ? " jours" : " jour") : "") + ".";
    }
    if (!rangs[0].length && rangs[1].length) {
      return "Les routes sont validées mais pas payées. Relancer la facturation : "
        + "produire sans bon de commande, c'est financer le client.";
    }
    return "La balance tient : ce qui se produit est vendu.";
  }

  function gestesBalance(rangs) {
    var g = [];
    var cible = null;
    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        if (!cible && pi.statut === "proposee") cible = p;
      });
    });
    if (cible) {
      g.push(el("a.b.or", { href: "#/projets/" + cible.id + "/pistes" }, "Arbitrer les routes →"));
      g.push(el("a.b.nu", { href: "#/projets/" + cible.id + "/presentation" }, "Préparer la présentation"));
    } else {
      g.push(el("a.b.nu", { href: "#/placer/charge" }, "Voir où en sont les pièces →"));
    }
    return g;
  }

  function carteRoute(x, r, hote) {
    var m = x.pi ? PRIORITE.maturite(x.p, x.pi) : null;
    var pretes = x.ls.filter(function (l) { return PRODUCTION.ouverte(x.p, l); }).length;
    var e = x.pi ? RETRO.etat(x.p, x.pi) : null;

    return el("div.pi-rc", {},
      el("div.pirc-h", {},
        el("a.pirc-n", { href: "#/projets/" + x.p.id + "/pistes" },
          x.pi ? (x.pi.titre || "route sans titre") : "Pièces sans route"),
        el("span.pirc-p", {}, x.p.ref + " · " + x.p.nom),
        el("span.pirc-c", {}, pretes + " / " + x.ls.length + " prêtes")),

      m
        ? el("div.pirc-m", {},
            el("span.pircm-t", {}, "maturité " + m.part + " %"),
            el("span.pircm-b", {}, el("i", { style: { width: m.part + "%" } })),
            m.presentable ? el("span.vert", {}, "présentable")
              : el("span.alerte", {}, "sous le minimum client"))
        : null,

      e && e.commenceHier && r.rang <= 1
        ? el("div.pirc-r", {}, "rétroplanning : il fallait commencer le " + O.joli(e.demarrage))
        : e ? el("div.pirc-d", {}, "exécution le " + O.joli(e.fin)) : null,

      el("div.pi-l", {}, x.ls.slice(0, 8).map(function (l) {
        var manque = PRODUCTION.porte(x.p, l).filter(function (y) { return !y.ok; }).length;
        return el("button.pil", { type: "button",
          onclick: function () { VUE_ASSET.ouvrir(x.p, l, function () { rendre(hote); }); } },
          IMAGE.vignette(l, "planche"),
          l.exe ? el("span.pil-exe", {}, "EXE") : null,
          el("span.pil-bas", {},
            el("span.pil-n", {}, l.nom),
            el("span.pil-m", {}, manque ? manque + " manques" : "prête")));
      })),
      x.ls.length > 8
        ? el("a.pip-plus", { href: "#/projets/" + x.p.id + "/livrables" }, "les " + x.ls.length + " pièces →")
        : null
    );
  }

  /* ————————————————————— La charge : où en sont les pièces ————————————————————— */

  /* ————————————————————— La charge : le mur, ordonné par le risque ————————————————————— */

  /* Les images sont le contenu de cet écran, pas son illustration — c'est le
   * seul du produit où elles ont le droit d'occuper la majorité de la surface.
   *
   * Mais l'ordre n'est plus le volet : c'est le risque. Ce qui va tomber passe
   * devant et plus grand ; ce qui tient descend et pâlit. Un classement par
   * dossier fait chercher ; un classement par risque fait voir. */

  function risque(p, l) {
    var r = { pts: 0, causes: [] };
    var jours = l.remise ? Math.round((new Date(l.remise) - new Date(O.jour())) / 86400000) : null;
    var manque = PRODUCTION.porte(p, l).filter(function (c) { return !c.ok; });

    if (jours !== null && jours < 0) { r.pts += 60; r.causes.push("remise dépassée de " + (-jours) + " j"); }
    else if (jours !== null && jours <= 10) { r.pts += 40 - jours * 2; r.causes.push("remise dans " + jours + " j"); }
    if (!l.responsable) { r.pts += 25; r.causes.push("sans responsable"); }
    if (!l.estime) { r.pts += 20; r.causes.push("sans estimation"); }
    if (!l.remise) { r.pts += 18; r.causes.push("sans date de remise"); }
    if (window.KV && KV.niveau(l) !== "maitre" && l.maitre) {
      var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
      if (m && l.versionMaitre && m.version && l.versionMaitre !== m.version) {
        r.pts += 35; r.causes.push("maître périmé");
      }
    }
    r.pts += manque.length * 6;
    if (manque.length) r.causes.push(manque.length + (manque.length > 1 ? " manques" : " manque"));
    r.jours = jours; r.manque = manque;
    return r;
  }

  function charge(pieces, hote) {
    var tout = pieces.map(function (x) {
      var r = risque(x.projet, x.l);
      return { p: x.projet, l: x.l, r: r };
    }).sort(function (a, b) { return b.r.pts - a.r.pts; });

    if (!tout.length) {
      return el("p.rien", {}, "Aucune pièce en production. Le mur se remplit quand une route est retenue.");
    }

    /* La ligne de partage : au-delà, la semaine tient. */
    var chaud = tout.filter(function (x) { return x.r.pts >= 30; });
    var calme = tout.filter(function (x) { return x.r.pts < 30; });

    return el("div.mu", {},
      el("div.mu-t", {},
        el("h3", {}, chaud.length
          ? chaud.length + (chaud.length > 1 ? " pièces vont manquer leur date" : " pièce va manquer sa date")
          : tout.length + (tout.length > 1 ? " pièces, aucune en risque" : " pièce, aucune en risque")),
        el("p", {}, "Classées par ce qui va tomber, pas par volet. Une pièce sans estimation "
          + "est invisible dans la semaine — le mur arrive sans prévenir.")),

      chaud.length
        ? el("div.mu-g", {},
            el("div.mug-t", {}, "CE QUI VA TOMBER"),
            el("div.mu-l.chaud", {}, chaud.slice(0, 8).map(function (x) { return piece(x, hote, true); })))
        : null,

      calme.length
        ? el("div.mu-g", {},
            el("div.mug-t.calme", {}, "CE QUI TIENT",
              el("span", {}, "au-delà de cette ligne, la semaine tient")),
            el("div.mu-l.calme", {}, calme.slice(0, 12).map(function (x) { return piece(x, hote, false); })))
        : null,

      tout.length > 20
        ? el("a.pip-plus", { href: "#/projets/" + tout[0].p.id + "/livrables" },
            "les " + tout.length + " pièces →")
        : null);
  }

  function piece(x, hote, chaud) {
    var pe = x.l.responsable ? DEPOT.trouve("personnes", x.l.responsable) : null;
    var m = DEPOT.trouve("marches", x.l.marche);
    return el("button.mu-p" + (chaud ? ".chaud" : ""), { type: "button",
      onclick: function () { VUE_ASSET.ouvrir(x.p, x.l, function () { rendre(hote); }); } },
      IMAGE.vignette(x.l, "planche"),
      el("span.mup-n", {}, x.l.nom + (m ? "  ·  " + m.code : "")),
      el("span.mup-c" + (chaud ? ".alerte" : ""), {},
        x.r.causes.length ? x.r.causes.slice(0, 2).join("  ·  ")
          : x.r.jours !== null ? "remise dans " + x.r.jours + " j" : "prête"),
      el("span.mup-q", {}, pe ? pe.nom.split(" ")[0] : "personne"));
  }

  return { rendre: rendre, titre: "Pipeline" };
})();
