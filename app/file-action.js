/* file-action.js — que dois-je faire maintenant ?
 *
 * Sept écrans, chacun juste, et pourtant la question du matin restait sans
 * réponse : par quoi je commence ? Chaque écran savait une chose et aucun ne
 * savait laquelle passait avant.
 *
 * Ici tout remonte dans une seule file, triée non pas par urgence ressentie
 * mais par ce que ça coûte d'attendre un jour de plus. Chaque ligne dit ce que
 * c'est, ce que ça coûte, et emmène à l'endroit où ça se règle.
 *
 * Cette file ne remplace aucun écran. Elle dit lequel ouvrir.
 */

window.FILE = (function () {
  var el = O.el;

  /* Les familles, par ce qu'elles coûtent quand on les laisse. */
  var FAMILLES = {
    trancher: { nom: "Trancher", ton: "alerte", ou: "revue",
      quoi: "tant que je n'ai pas tranché, l'équipe attend et le client aussi" },
    ordre: { nom: "Remettre en ordre", ton: "alerte", ou: "pipeline",
      quoi: "quelqu'un travaille sur du spéculatif pendant qu'un engagement traîne" },
    reclamer: { nom: "Réclamer", ton: "attente", ou: "attentes",
      quoi: "ce qu'on me doit et que personne ne sait qu'il me doit" },
    placer: { nom: "Placer", ton: "attente", ou: "direction",
      quoi: "des livrables sans responsable, sans charge ou sans date : invisibles dans la semaine" },
    traiter: { nom: "Traiter un brief", ton: "or", ou: "briefs",
      quoi: "la chaîne d'entrée s'est arrêtée quelque part" },
    contresigner: { nom: "Faire contresigner", ton: "attente", ou: "projets",
      quoi: "des champs restent à confirmer : utilisables pour travailler" },
  };

  /* ————————————————————— Le relevé ————————————————————— */

  function tout() {
    var out = [];
    /* Un dossier clos ne demande aucune décision.
     *
     * La file est le rituel du lundi, et son budget est de quatre-vingt-dix
     * minutes. L'ingestion du corpus l'a fait passer à deux cent quatre-vingt-
     * dix-neuf entrées — vingt-sept mille pixels — parce que cent trente-deux
     * campagnes terminées y réclamaient un arbitrage de piste et un verdict.
     *
     * Même ligne que pour les blocages, et pour la même raison : ce qu'on ne
     * peut plus réparer n'appelle pas de geste. Ce qui peut encore mordre,
     * lui, reste — et il passe par les blocages, qui sont son lieu. */
    var projets = DEPOT.liste("projets").filter(function (p) {
      return !(window.CLOTURE && CLOTURE.est(p));
    });

    /* 1 · Ce qui attend mon verdict. Rien ne coûte plus cher que ça. */
    VUE_REVUE.pieces().forEach(function (p) {
      var lien = VUE_REVUE.lienPiece(p);
      var libelle = p.type === "livrable" ? "Examiner et décider" : "Examiner la piste";
      out.push(item("trancher", p.contexte, "Une version attend votre décision.", 105, lien,
        p.objet && p.objet.vignette ? [p.objet] : [],
        { chiffre: p.titre, depuis: p.depuis ? O.depuis(p.depuis) : 0,
          trancher: "Ouvrir les critères de la pièce avant de trancher.",
          court: libelle, direct: true, gestes: [{ nom: libelle, href: lien, fort: true }] }));
    });

    /* 1 bis · Les adaptations qui changent ce que leur marché n'a pas prévu.
     * Elles ne sont pas bloquées : on autorise le changement pour ce marché, ou
     * on fait corriger la décli. Une fois la correction demandée, la décli est
     * due par son auteur : elle passe de « trancher » à « réclamer ». */
    if (window.ECARTS_MARCHE) ECARTS_MARCHE.aTrancher().forEach(function (x) {
      var p = DEPOT.trouve("projets", x.projet);
      var l = p ? (p.livrables || []).filter(function (y) { return y.id === x.livrable; })[0] : null;
      var hors = ECARTS_MARCHE.libelle(x.hors);
      var renvoyee = x.etat === "renvoyee";
      out.push(item(renvoyee ? "reclamer" : "trancher",
        (l && window.KV && KV.titre ? KV.titre(l) : x.nom) + " (" + x.ref + ") : changement non prévu",
        renvoyee
          ? "Correction demandée le " + O.joli(x.revue.quand) + " : la décli revient à ce qui était prévu."
          : x.texte,
        renvoyee ? 62 : 92, "#/projets/" + x.projet + "/livrables", l && l.vignette ? [l] : [],
        { chiffre: renvoyee ? x.marche + " · correction demandée à la décli (" + hors.toLowerCase() + ")" : x.texte.replace(/\.$/, ""),
          depuis: renvoyee && x.revue.quand ? O.depuis(x.revue.quand) : 0,
          trancher: renvoyee
            ? "Faire corriger la décli par son auteur, ou autoriser finalement le changement pour ce marché."
            : x.question,
          gestes: [{ nom: renvoyee ? "Revoir la correction" : "Décider", fort: true, quand: function () { x.ouvrir(function () { APP.rendre(); }); } }] }));
    });

    /* 2 · Les retours client non tranchés : ils suspendent des livrables. */
    FEEDBACK.ouverts().forEach(function (f) {
      var p = DEPOT.trouve("projets", f.projet);
      if (!p || CLOTURE.est(p)) return;
      var impact = FEEDBACK.impact(f);
      out.push(item("trancher", p.nom + " : retour client",
        !impact.assets ? "Ce retour ne désigne aucun livrable : il faut d'abord dire ce qu'il touche."
          : impact.assets + (impact.assets > 1 ? " livrables concernés par ce retour." : " livrable concerné par ce retour."),
        95 + impact.assets, "#/projets/" + p.id + "/livrables",
        impact.pieces.filter(function (l) { return l.vignette; }).slice(0, 2),
        { chiffre: p.ref + " · retour client" + (!impact.assets ? ", aucun livrable rattaché"
            : " sur " + impact.assets + (impact.assets > 1 ? " livrables" : " livrable")),
          depuis: f.quand ? O.depuis(f.quand) : 0,
          trancher: "Décider si ce retour est absorbé, facturé ou refusé, avec son motif.",
          verbatim: f.texte, verbatimPar: f.auteur, verbatimLe: f.quand,
          gestes: [{ nom: "Traiter ce retour", fort: true, quand: function () {
            FEEDBACK.trancher(f, function () { APP.rendre(); });
          } }] }));
    });

    /* 3 · Les pistes en lice sans arbitrage. */
    projets.forEach(function (p) {
      var pistes = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
      if (pistes.length > 1 && !pistes.some(function (x) { return x.statut === "retenue"; })) {
        var n = (p.livrables || []).filter(function (l) { return !l.annule; }).length;
        out.push(item("trancher", "« " + p.nom + " » : " + pistes.length + " pistes, aucune retenue",
          n + " livrables se fabriquent sans savoir quel concept fait autorité.",
          90, "#/projets/" + p.id + "/pistes"));
      }
    });

    /* 4 · Le conflit d'ordre : du spéculatif devant du ferme. */
    var c = PRIORITE.conflits();
    c.conflits.forEach(function (x) {
      out.push(item("ordre", (x.personne ? x.personne.nom : "Quelqu'un") + " tient du spéculatif",
        x.speculatif.length + " livrables spéculatifs pendant que " + x.ferme.length
          + " livrables engagés sont en retard. Le spéculatif ne s'arrête pas : il passe après.",
        85, "#/pipeline"));
    });

    /* 5 · Ce qu'on me doit, par origine. */
    var comptes = ECARTS.compte();
    Object.keys(comptes).forEach(function (o) {
      var d = ECARTS.def(o);
      out.push(item("reclamer", comptes[o] + (comptes[o] > 1 ? " livrables" : " livrable") + " — " + d.nom.toLowerCase(),
        d.quoi, o === "donneur" ? 70 : o === "brief" ? 75 : 60, "#/attentes"));
    });

    /* 6 · Les renvois sans retour, qui vieillissent. */
    var att = RENVOI.ouvertes();
    var vieux = att.filter(function (a) { return O.depuis(a.envoye_le || a.depuis) >= 5; });
    if (vieux.length) {
      out.push(item("reclamer", vieux.length + (vieux.length > 1 ? " renvois sans retour" : " renvoi sans retour") + " depuis plus de 5 jours",
        "Mon horloge est arrêtée dessus, pas la leur. C'est le seul endroit où le retard des autres est visible.",
        65, "#/attentes"));
    }

    /* 7 · La chaîne d'entrée arrêtée. */
    projets.forEach(function (p) {
      var a = CHAINE_BRIEF.avancement(p);
      if (!a.prochain) return;
      out.push(item("traiter", "« " + p.nom + " » : " + a.prochain.nom.toLowerCase() + " à faire",
        a.prochain.quoi + "  ·  " + a.faits + " étapes sur " + a.total + ".",
        55 - a.faits, "#/projets/" + p.id + "/" + a.prochain.section));
    });

    /* 8 · Les livrables qu'on ne peut ni placer ni réclamer. */
    var sansResp = 0, sansCharge = 0, sansDate = 0;
    projets.forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        if (!l.responsable) sansResp++;
        if (!l.estime) sansCharge++;
        if (!l.remise) sansDate++;
      });
    });
    if (sansResp) out.push(item("placer", sansResp + " livrables sans responsable",
      "Personne n'est en défaut le jour où ça n'avance pas.", 50, "#/pipeline"));
    if (sansCharge) out.push(item("placer", sansCharge + " livrables sans estimation",
      "Ils sont invisibles dans la charge : la semaine se calcule sans eux, et le mur arrive sans prévenir.", 45, "#/pipeline"));
    if (sansDate) out.push(item("placer", sansDate + " livrables sans date de remise",
      "Ni plaçables ni réclamables. Le rétroplanning ne les voit pas.", 40, "#/pipeline"));

    /* 9 · Ce qui tient sur une inférence. */
    projets.forEach(function (p) {
      var n = window.INFERENCE ? INFERENCE.compte(p) : 0;
      if (!n) return;
      out.push(item("contresigner", n + " champs à confirmer sur « " + p.nom + " »",
        "Utilisables pour travailler, mais pas encore confirmés par le client : faites-les confirmer avant qu'il ne conteste.",
        35, "#/projets/" + p.id + "/identite"));
    });

    return out.sort(function (a, b) { return b.poids - a.poids; });
  }

  /* Un item porte maintenant ce qu'il faut pour être TRANCHÉ sur place, pas
   * seulement listé : le chiffre qui justifie son rang, ce qu'il faut décider,
   * et les gestes possibles ici même. */
  function item(famille, quoi, cout, poids, ou, visuels, plus) {
    var o = { famille: famille, quoi: quoi, cout: cout, poids: poids, ou: ou,
      visuels: visuels || [] };
    if (plus) Object.keys(plus).forEach(function (k) { o[k] = plus[k]; });
    /* Le chiffre : ce qui se lit de loin et qui ordonne la file. À défaut,
     * on le tire du libellé — mieux vaut un chiffre imparfait qu'aucun. */
    if (!o.chiffre) {
      var m = String(quoi).match(/^(\d+)\s+([^\u2014·]+)/);
      o.chiffre = m ? m[1] + " " + m[2].trim() : quoi;
    }
    if (!o.court) o.court = String(quoi).replace(/^\d+\s+/, "").slice(0, 42);
    return o;
  }

  var famille = "";

  function salle(rafraichir) {
    var tous = tout();
    if (!tous.length) return el("section.decisions-file", { "aria-label": "Sujets à traiter" },
      el("p", {}, "Aucun sujet ne demande de décision."));

    var items = tous.filter(function (x) { return !famille || x.famille === famille; });
    if (!items.length) { famille = ""; items = tous; }
    var filtre = el("select", { id: "file-famille", onchange: function (e) {
      famille = e.target.value; rafraichir(); document.getElementById("file-famille").focus();
    } }, el("option", { value: "" }, "Tous les gestes"),
      Object.keys(FAMILLES).filter(function (key) {
        return tous.some(function (x) { return x.famille === key; });
      }).map(function (key) { return el("option", { value: key }, FAMILLES[key].nom); }));
    filtre.value = famille;

    return el("section.decisions-file", { "aria-label": "Sujets à traiter" },
      el("header.decisions-file-tete", {},
        el("h2", {}, famille ? FAMILLES[famille].nom : "Par priorité", el("span.studio-compte", {}, String(items.length))),
        el("div.decisions-file-filtre", {}, el("label", { for: "file-famille" }, "Geste"), filtre)),
      el("ul.decisions-file-liste", {}, items.map(ligne)));
  }

  function ligne(x) {
    var famille = FAMILLES[x.famille];
    var gestes = x.gestes || [];
    var direct = x.direct && gestes.find(function (g) { return g.href; });
    var image = x.visuels && x.visuels[0];
    var temps = x.depuis ? "Depuis " + x.depuis + (x.depuis > 1 ? " jours" : " jour") : "";
    var sujet = el("span.decisions-sujet", {},
      el("strong", {}, x.chiffre),
      el("span.decisions-meta", {}, direct ? x.quoi : famille.nom, temps ? " · " + temps : ""));
    if (direct) return el("li", {},
      el("a.decisions-ligne", { href: direct.href },
        image ? el("span.decisions-miniature", { "aria-hidden": "true" }, IMAGE.vignette(image, "mini")) : null,
        sujet, el("span.decisions-fleche", { "aria-hidden": "true" }, "›")));

    var personne = x.verbatimPar && (DEPOT.trouve("personnes", x.verbatimPar) || DEPOT.trouve("contacts", x.verbatimPar));
    return el("li", {},
      el("details.decisions-detail", {},
        el("summary.decisions-ligne", {}, sujet),
        el("div.decisions-suite", {},
          x.quoi !== x.chiffre ? el("p", {}, x.quoi) : null,
          x.trancher || x.cout ? el("p", {}, x.trancher || x.cout) : null,
          x.verbatim ? el("blockquote", {}, el("p", {}, x.verbatim),
            el("footer", {}, [personne && personne.nom, x.verbatimLe && O.joli(x.verbatimLe)].filter(Boolean).join(" · "))) : null,
          el("div.form-actions", {},
            gestes.map(function (g) {
              return g.href ? el("a.b", { href: g.href }, g.nom)
                : el("button.b" + (g.fort ? ".or" : ".nu"), { type: "button", onclick: g.quand }, g.nom);
            }),
            GESTE.lien(x.ou, gestes.length ? "Ouvrir le dossier" : famille.nom,
              gestes.length ? "b.nu" : "b.or", { quoi: x.quoi, cout: x.trancher || x.cout })))));
  }

  return { FAMILLES: FAMILLES, tout: tout, salle: salle };
})();
