/* vue-pipeline.js — tous les projets, tous les livrables, tous les retours.
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
  var ouverts = new Set();

  function volet(selecteur, cle, ...contenu) {
    var d = el(selecteur, { open: ouverts.has(cle) }, contenu);
    d.addEventListener("toggle", function () {
      if (d.open) ouverts.add(cle);
      else ouverts.delete(cle);
    });
    return d;
  }

  /* Le pipeline n'est plus une destination : c'est le corps de deux modes de
   * Placer. Il ne porte donc plus ni titre d'écran ni onglets — ceux-ci
   * appartiennent à l'intention qui l'appelle. */
  function rendre(hote, impose) {
    if (impose) vue = impose;
    hote.className = hote.className || "";
    O.vider(hote);

    var pieces = PRODUCTION.toutesLesPieces();
    hote.appendChild(el("div", {},
      vue === "charge" ? charge(pieces) : ordre(),
      el("details.pilotage-contexte.pilotage-synthese", {},
        el("summary", {}, "Totaux de production"),
        bandeHaute(pieces))
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

    return el("section.pp-k", {},
      kpi(String(pieces.length), "livrables en cours",
        Object.keys(parProjet).length + " dossiers", ""),
      kpi(fermes + " / " + pieces.length, "engagés ou fermes",
        specu + " spéculatifs", fermes ? "vert" : "attente"),
      kpi(pretes + " / " + pieces.length, "prêts à produire",
        pretes === pieces.length ? "tout peut partir" : (pieces.length - pretes) + " bloqués", pretes < pieces.length ? "alerte" : "vert"),
      kpi(String(fbOuverts.length), fbOuverts.length > 1 ? "retours non tranchés" : "retour non tranché",
        touchees + (touchees > 1 ? " impacts comptés par retour" : " impact compté par retour"), fbOuverts.length ? "alerte" : "vert"),
      kpi(String(sansResp), "sans responsable",
        sansResp ? "responsable à attribuer" : "tous affectés", sansResp ? "attente" : "vert")
    );
  }

  /* Un chiffre à l'encre ; l'état dans le filet et le signe, jamais dans la
   * couleur du nombre. */
  var SIGNES = { alerte: "● ", attente: "◐ ", vert: "✓ " };
  function kpi(v, t, s, ton) {
    return el("div.pp-s" + (ton ? ".t-" + ton : ""), {},
      el("b", {}, v), el("span.pps-t", {}, t),
      el("span.pps-s", {}, SIGNES[ton] ? el("span.pp-signe", { "aria-hidden": "true" }, SIGNES[ton]) : null, s));
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

  function ordre() {
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
    var conflits = PRIORITE.conflits().conflits;
    if (!rangs.some(function (g) { return g.length; })) {
      return el("div.pilotage-action", {},
        el("h2", {}, "Aucun livrable ou piste à prioriser"),
        el("a.b.nu", { href: APP.adresse("projets") }, "Voir les projets"));
    }
    var action = conflits.length ? null : actionPrioritaire(rangs);

    return el("div.pp.pilotage-priorites", {},
      conflits.length
        ? el("section.pilotage-action.pilotage-alerte", {},
            el("h2", {}, "Engagements en retard"),
            conflits.map(function (x) {
              return el("div.pilotage-conflit", {},
                el("strong", {}, x.personne ? x.personne.nom : "Personne non renseignée"),
                el("p.pilotage-meta", {}, x.speculatif.length + " en spéculatif · " + x.ferme.length + " engagés en retard"),
                el("div.pilotage-liste", {}, x.ferme.map(function (f) {
                  return lignePiece(f.p, f.l, "En retard");
                })));
            }))
        : el("section.pilotage-action", {},
            el("h2", {}, "Prochaine action"),
            el("p", {}, action.texte),
            el("div.form-actions", {}, action.liens)),

      el("section.pilotage-rangs", {},
        el("h2", {}, "Ordre des engagements"),
        el("div.pilotage-liste", {}, rangs.map(function (g, i) {
          var r = PRIORITE.RANGS[i];
          var n = pieces(g);
          return volet("details.pilotage-rang", r.cle,
            el("summary", {}, el("strong", {}, r.nom),
              el("span.pilotage-meta", {}, n + (n === 1 ? " livrable" : " livrables")
                + (n ? " · " + Math.round(jours(g)) + " j estimés" : ""))),
            el("p", {}, r.regle),
            g.length ? el("div.pilotage-liste", {}, g.flatMap(function (x) {
              if (x.ls.length) return x.ls.map(function (l) { return lignePiece(x.p, l); });
              return x.pi ? [el("a.pilotage-ligne", { href: APP.adresse("projets", x.p.id, "pistes", x.pi.id) },
                el("span", {}, el("strong", {}, x.pi.titre || "Piste sans titre"),
                  el("small", {}, x.p.nom)), el("span.pilotage-etat", {}, "Sans livrable"))] : [];
            })) : null);
        }))),

      vendu.n || parie.n ? el("details.pilotage-contexte.pilotage-synthese", {},
        el("summary", {}, "Répartition du temps estimé"),
        el("div.pp-bal", {},
          cote("vendu", "Engagé", vendu, haut, [
            { r: PRIORITE.RANGS[0], g: rangs[0] }, { r: PRIORITE.RANGS[1], g: rangs[1] },
          ]),
          el("div.pp-axe", {}),
          cote("parie", "Sans engagement", parie, haut, [
            { r: PRIORITE.RANGS[2], g: rangs[2] }, { r: PRIORITE.RANGS[3], g: rangs[3] },
          ]))) : null
    );
  }

  /* Un plateau : sa hauteur est proportionnelle aux jours consommés. */
  function cote(cle, titre, tot, haut, blocs) {
    var vide = !tot.n;
    return el("div.pp-c." + cle, {},
      el("h3.ppc-t", {}, titre),
      el("div.ppc-p", {}, blocs.map(function (b) {
        var j = b.g.reduce(function (t, x) {
          return t + x.ls.reduce(function (n, l) { return n + (l.estime || 0); }, 0); }, 0);
        var n = b.g.reduce(function (t, x) { return t + x.ls.length; }, 0);
        var h = Math.max(n ? 54 : 34, Math.round((j / haut) * 260));
        return el("div.pp-b." + b.r.ton + (n ? "" : ".creux"), {
          style: { height: h + "px" },
          title: b.r.regle,
        },
          el("span.ppb-n", {}, b.r.nom),
          el("span.ppb-c", {}, n ? n + (n > 1 ? " livrables · " : " livrable · ") + Math.round(j) + " j"
            : "Aucun livrable"),
          n && b.g.length ? el("div.ppb-v", {}, vignettesDe(b.g)) : null);
      })),
      el("div.ppc-s" + (vide ? ".creux" : ""), {}, vide
        ? (cle === "vendu" ? "0 jour engagé contractuellement" : "Rien de parié")
        : Math.round(tot.j) + " j sur " + tot.n + (tot.n > 1 ? " livrables" : " livrable")));
  }

  function vignettesDe(g) {
    var v = [];
    g.forEach(function (x) { x.ls.forEach(function (l) { if (l.vignette && v.length < 12) v.push(l); }); });
    return v.map(function (l) { return IMAGE.vignette(l, "carte"); });
  }

  function actionPrioritaire(rangs) {
    var enLice = rangs.flat().filter(function (x) { return x.pi && x.pi.statut === "proposee"; });
    if (enLice.length) {
      enLice.sort(function (a, b) {
        return (a.pi.soumis_le || "9999").localeCompare(b.pi.soumis_le || "9999");
      });
      var x = enLice[0];
      var age = x.pi.soumis_le ? O.depuis(x.pi.soumis_le) : 0;
      return { texte: enLice.length + (enLice.length > 1 ? " pistes à arbitrer" : " piste à arbitrer")
          + (age > 0 ? " · la plus ancienne attend depuis " + age + (age > 1 ? " jours" : " jour") : "") + ".",
        liens: [
          el("a.b.or", { href: APP.adresse("projets", x.p.id, "pistes", x.pi.id) },
            "Ouvrir " + (x.pi.titre || "la piste")),
          GESTE.bouton("presentation", { p: x.p }, null, "b.nu")
        ] };
    }
    if (!rangs[0].length && rangs[1].length) {
      var validee = rangs[1][0];
      return { texte: rangs[1].length + (rangs[1].length === 1 ? " piste validée attend" : " pistes validées attendent") + " un bon de commande.",
        liens: [el("a.b.or", { href: APP.adresse("projets", validee.p.id, "pistes", validee.pi.id) },
          "Ouvrir " + (validee.pi.titre || "la piste"))] };
    }
    return { texte: rangs[2].length || rangs[3].length
        ? "Vérifier la charge avant d’engager les livrables spéculatifs."
        : "Vérifier les échéances et les affectations.",
      liens: [GESTE.bouton("charge", {}, null, "b.nu")] };
  }

  function lignePiece(p, l, etat) {
    var responsable = l.responsable && DEPOT.trouve("personnes", l.responsable);
    var marche = l.marche && DEPOT.trouve("marches", l.marche);
    return el("a.pilotage-ligne", { href: APP.adresse("projets", p.id, "livrables", l.id) },
      el("span", {},
        el("strong", {}, l.nom),
        el("small", {}, [p.nom, marche ? marche.nom : null, responsable ? responsable.nom : "Sans responsable"].filter(Boolean).join(" · "))),
      etat ? el("span.pilotage-etat", {}, etat) : null);
  }

  function carteRoute(x, r, hote) {
    var m = x.pi ? PRIORITE.maturite(x.p, x.pi) : null;
    var pretes = x.ls.filter(function (l) { return PRODUCTION.ouverte(x.p, l); }).length;
    var e = x.pi ? RETRO.etat(x.p, x.pi) : null;

    return el("div.pi-rc", {},
      el("div.pirc-h", {},
        el("a.pirc-n", { href: "#/projets/" + x.p.id + "/pistes" },
          x.pi ? (x.pi.titre || "piste sans titre") : "Livrables sans piste"),
        el("span.pirc-p", {}, x.p.ref + " · " + x.p.nom),
        el("span.pirc-c", {}, pretes + " / " + x.ls.length + " prêts")),

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
        ? el("a.pip-plus", { href: "#/projets/" + x.p.id + "/livrables" }, "les " + x.ls.length + " livrables →")
        : null
    );
  }

  /* ————————————————————— La charge : où en sont les livrables ————————————————————— */

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
    if (REGLES.maitrePerime(p, l)) {
      r.pts += 35; r.causes.push("référence à reprendre");
    }
    r.pts += manque.length * 6;
    if (manque.length) r.causes.push(manque.length + (manque.length > 1 ? " manques" : " manque"));
    r.jours = jours; r.manque = manque;
    return r;
  }

  function charge(pieces) {
    var tout = pieces.map(function (x) {
      var r = risque(x.projet, x.l);
      return { p: x.projet, l: x.l, r: r };
    }).sort(function (a, b) { return b.r.pts - a.r.pts; });

    if (!tout.length) {
      return el("p.rien", {}, "Aucun livrable en production.");
    }

    /* La ligne de partage : au-delà, la semaine tient. */
    var chaud = tout.filter(function (x) { return x.r.pts >= 30; });
    var calme = tout.filter(function (x) { return x.r.pts < 30; });

    return el("div.pp.pilotage-charge", {},
      el("h2", {}, tout.length + (tout.length > 1 ? " livrables suivis" : " livrable suivi")),
      groupeCharge("À surveiller", chaud, "charge-risques"),
      groupeCharge("Autres livrables", calme, "charge-suivi"));
  }

  function groupeCharge(titre, liste, cle) {
    if (!liste.length) return null;
    var limite = 6;
    return el("section.pp-mur", {},
      el("h3.ppm-t", {}, titre, " · ", liste.length),
      el("div.pilotage-liste", {}, liste.slice(0, limite).map(ligneCharge)),
      liste.length > limite ? volet("details.pilotage-contexte", cle,
        el("summary", {}, (liste.length - limite) + " autres"),
        el("div.pilotage-liste", {}, liste.slice(limite).map(ligneCharge))) : null);
  }

  function ligneCharge(x) {
    var etat = x.r.causes.length ? cap(x.r.causes.join(" · "))
      : x.r.jours !== null ? "Remise dans " + x.r.jours + " j" : "Sans alerte de charge";
    var ligne = lignePiece(x.p, x.l, etat);
    if (x.r.pts >= 30) ligne.classList.add("pilotage-ligne-alerte");
    return ligne;
  }

  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }

  return { rendre: rendre, titre: "Pipeline" };
})();
