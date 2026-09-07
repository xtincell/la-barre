/* vue-cycle.js — suivre l'exécution d'un cycle éditorial.
 *
 * Le mur des livrables est fait pour une campagne : idée → KV master →
 * adaptation par marché → déclinaison par format. C'est la bonne vue quand un
 * visuel de référence gouverne vingt déclinaisons, parce que la question est
 * « le master est-il posé, et qu'est-ce qu'il périme ».
 *
 * Un cycle éditorial ne marche pas comme ça. Dix-sept publications datées sur
 * un mois n'ont pas de maître — et ce n'est pas un manque, c'est leur nature.
 * Les afficher sous « Hors piste · Sans master », c'était les décrire par ce
 * qui leur manquait sans que rien ne leur manque.
 *
 * Ce qui gouverne ici, c'est le calendrier : ce qui sort cette semaine, ce qui
 * est en retard, ce qui n'est pas prêt pour sa date. Et une chose que le mur
 * ne montrait pas du tout : LE CONTENU. Le texte de chaque post est écrit
 * depuis le début, dans le planning éditorial. Il doit se lire ici, sur la
 * livrable — pas derrière un bouton.
 *
 * Une chose ne change pas : une piste gouverne chaque livrable. Un cycle n'en
 * met pas deux en concurrence, il en tient une — mais il en tient une.
 */

window.VUE_CYCLE = (function () {
  var el = O.el;
  var ouverts = {};
  var filtre = "tout";

  /* ————————————————————— La nature de la mission ————————————————————— */

  /* Trois natures, trois façons de suivre. Elle se déclare sur le dossier ;
   * à défaut elle se déduit, parce qu'un dossier importé n'a rien déclaré. */
  function nature(p) {
    if (p.nature) return p.nature;
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    if (!ls.length) return "campagne";
    var maitres = ls.filter(function (l) { return KV.estMaitre(l); }).length;
    var dates = ls.filter(function (l) { return l.publication; }).length;
    /* Un cycle : des livrables datés, aucun visuel de référence au-dessus. */
    if (!maitres && dates >= ls.length * 0.8 && ls.length > 2) return "cycle";
    if (ls.length === 1) return "piece";
    return "campagne";
  }

  /* ————————————————————— L'état d'une publication ————————————————————— */

  function etat(p, l) {
    var manques = BRIEF_PRODUCTION.controles(p, l).filter(function (c) { return !c.ok; });
    var dem = (l.demandes || []).filter(function (x) { return !x.rendu_le; });
    var v = (l.versions || []).length;
    /* Deux horloges, et c'est la remise qui court en premier : un livrable non
     * remise à J-3 ne se valide plus avant sa parution. */
    var apresParution = l.publication ? O.depuis(l.publication) : null;
    var apresRemise = l.remise ? O.depuis(l.remise) : null;

    if (v && (l.versions[v - 1] || {}).verdict === "approuve") {
      return { cle: "prete", nom: "prête", cout: "validée, elle peut partir à sa date" };
    }
    /* Une date de parution passée ne veut pas dire « en retard ».
     *
     * L'outil ne sait pas ce qui est réellement sorti : il sait ce qui est
     * enregistré. Une publication dont la date est passée est PARUE — et si
     * aucune version n'est au dossier, ce qui manque est la trace, pas le
     * travail. Le dire « raté » accusait le titulaire d'un retard qui n'existe
     * pas, et c'est exactement le genre d'alarme qui apprend à ne plus lire
     * les alarmes. */
    if (apresParution !== null && apresParution >= 0 && !v) {
      return { cle: "aDocumenter", nom: "parue",
        cout: "parue le " + O.joli(l.publication) + ", rien au dossier — c'est la "
          + "trace qui manque, pas le travail. Sans elle, elle ne compte ni au "
          + "bilan du mois ni dans ce qu'on montre au client" };
    }
    if (apresRemise !== null && apresRemise > 0 && !v) {
      return { cle: "remiseRatee", nom: "remise passée",
        cout: "la remise était le " + O.joli(l.remise) + " ; rien n'est rendu, et la "
          + "parution du " + O.joli(l.publication) + " ne sera plus validée avant de partir" };
    }
    if (dem.length) {
      var q = DEPOT.trouve("personnes", dem[0].qui);
      return { cle: "demandee", nom: "demandée",
        cout: "attendue de " + (q ? q.nom.split(" ")[0] : "quelqu'un")
          + (dem[0].pour ? " pour le " + O.joli(dem[0].pour) : ", sans date") };
    }
    if (v) {
      return { cle: "soumise", nom: "V" + v + " soumise",
        cout: "en attente de mon verdict" };
    }
    if (!l.responsable) {
      return { cle: "sansqui", nom: "sans personne",
        cout: "personne n'en répond : elle n'apparaît dans la semaine de personne" };
    }
    return { cle: "attente", nom: "à demander",
      cout: manques.length
        ? manques.length + (manques.length > 1 ? " manques au brief" : " manque au brief")
        : "le brief est complet — la demande peut partir" };
  }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(p, rafraichir) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; })
      .sort(function (a, b) {
        return String(a.remise || a.publication || a.echeance || "").localeCompare(
               String(b.remise || b.publication || b.echeance || "")); });

    var etats = ls.map(function (l) { return { l: l, e: etat(p, l) }; });
    var garde = etats.filter(function (x) {
      if (filtre === "tout") return true;
      if (filtre === "bloque") return ["remiseRatee", "sansqui"].indexOf(x.e.cle) !== -1;
      if (filtre === "documenter") return x.e.cle === "aDocumenter";
      if (filtre === "demandee") return x.e.cle === "demandee";
      if (filtre === "juger") return x.e.cle === "soumise";
      return true;
    });

    return el("div.cy", {},
      bande(p, etats, rafraichir),
      barre(p, etats, rafraichir),
      garde.length
        ? el("div.cy-sem", {}, semaines(p, garde, rafraichir))
        : el("p.rien", {}, "Aucune publication ne passe ce filtre.")
    );
  }

  /* La question du cycle : est-ce que ce qui doit sortir cette semaine sortira ? */
  function bande(p, etats, rafraichir) {
    var piste = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0]
      || (p.sections.pistes || [])[0] || null;
    var sansRoute = etats.filter(function (x) { return !x.l.pisteId; }).length;
    var rates = etats.filter(function (x) { return x.e.cle === "remiseRatee"; }).length;
    var aDoc = etats.filter(function (x) { return x.e.cle === "aDocumenter"; }).length;
    var sansQui = etats.filter(function (x) { return x.e.cle === "sansqui"; }).length;
    var pretes = etats.filter(function (x) { return x.e.cle === "prete"; }).length;

    return UI.recevabilite(
      "Ce qui doit sortir ce mois-ci sortira-t-il ?",
      [
        { quoi: "Une piste gouverne chaque publication", ok: sansRoute === 0, poids: 5,
          cout: sansRoute + (sansRoute > 1 ? " publications ne relèvent d'aucune piste" : " publication ne relève d'aucune piste")
            + " : elles se fabriquent sans concept opposable, et ne sont refusables que par le goût" },
        { quoi: "Chacune a quelqu'un", ok: sansQui === 0, poids: 4,
          cout: sansQui + (sansQui > 1 ? " publications n'ont personne" : " publication n'a personne")
            + " : elles n'apparaissent dans la semaine de personne, et personne n'est en défaut si elles ne sortent pas" },
        { quoi: "Aucune remise passée sans rendu", ok: rates === 0, poids: 5,
          cout: rates + (rates > 1 ? " remises sont passées" : " remise est passée")
            + " sans que rien ne soit rendu : ces parutions ne seront plus validées "
            + "avant de partir" },
        { quoi: "Ce qui est paru est au dossier", ok: aDoc === 0, poids: 3,
          cout: aDoc + (aDoc > 1 ? " publications sont parues" : " publication est parue")
            + " sans rien au dossier — elles ne comptent ni au bilan du mois, ni dans "
            + "ce qu'on montre au client" },
        { quoi: "Le mois est produit", ok: pretes === etats.length, poids: 2,
          cout: pretes + " publications validées sur " + etats.length },
      ],
      piste
        ? "La piste du mois : « " + piste.titre + " ». " + (piste.argument || "")
        : "Aucune piste retenue : rien ne dit ce qui appartient à ce mois et ce qui n'y "
          + "appartient pas.",
      []);
  }

  function barre(p, etats, rafraichir) {
    function compte(c) { return etats.filter(function (x) { return c.indexOf(x.e.cle) !== -1; }).length; }
    var f = [
      { cle: "tout", nom: "les " + etats.length + " publications" },
      { cle: "bloque", nom: compte(["remiseRatee", "sansqui"]) + " bloquées" },
      { cle: "documenter", nom: compte(["aDocumenter"]) + " à documenter" },
      { cle: "demandee", nom: compte(["demandee"]) + " demandées" },
      { cle: "juger", nom: compte(["soumise"]) + " à juger" },
    ];
    return el("div.vt-f.cy-f", {},
      el("div.vtf-g", {}, f.map(function (x) {
        return el("button.vtf" + (filtre === x.cle ? ".ici" : ""), { type: "button",
          onclick: function () { filtre = x.cle; rafraichir(); } }, x.nom);
      })));
  }

  /* ————————————————————— Le calendrier ————————————————————— */

  /* Par semaine, parce que c'est l'unité où l'on décide : ce qui part cette
   * semaine se prépare la précédente. */
  function semaines(p, etats, rafraichir) {
    var groupes = [];
    etats.forEach(function (x) {
      /* On range par la remise : c'est la date qu'on pilote. La parution en
       * découle, et se lit à côté. */
      var d = x.l.remise || x.l.publication || x.l.echeance;
      var cle = d ? "S" + O.semaine(new Date(d)) : "sans";
      var g = groupes.filter(function (y) { return y.cle === cle; })[0];
      if (!g) { g = { cle: cle, d: d, items: [] }; groupes.push(g); }
      g.items.push(x);
    });

    return groupes.map(function (g) {
      var bloques = g.items.filter(function (x) {
        return ["remiseRatee", "sansqui"].indexOf(x.e.cle) !== -1; }).length;
      return el("div.cys", {},
        el("div.cys-t", {},
          el("span.cyst-n", {}, g.d ? "Semaine " + O.semaine(new Date(g.d)) : "Sans date"),
          el("span.cyst-d", {}, g.d ? "à remettre à partir du " + O.joli(g.d)
            : "ni remise ni parution"),
          el("span.cyst-q", {}, g.items.length + (g.items.length > 1 ? " publications" : " publication")
            + (bloques ? "  ·  " + bloques + (bloques > 1 ? " bloquées" : " bloquée") : ""))),
        el("div.cys-l", {}, g.items.map(function (x) { return publication(p, x, rafraichir); })));
    });
  }

  /* Une publication, avec son contenu. C'est le point : le texte est écrit
   * depuis le planning éditorial, il se lit ici. */
  function publication(p, x, rafraichir) {
    var l = x.l, e = x.e;
    var b = l.brief || {};
    var s = DEPOT.trouve("supports", l.support);
    var resp = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    var cle = l.id;
    var ici = ouverts[cle] === true;

    return el("div.cyp." + e.cle + (ici ? ".ici" : ""), {},
      el("button.cyp-h", { type: "button",
        onclick: function () { ouverts[cle] = !ici; rafraichir(); } },
        /* Les deux dates, dans l'ordre où elles arrivent : on remet, puis ça
         * paraît. Une seule des deux à l'écran, et on pilote à l'aveugle. */
        el("span.cyph-d", {},
          el("span.cyphd-r", {}, l.remise ? O.jourCourt(l.remise) : "remise ?"),
          el("span.cyphd-f", {}, "→"),
          el("span.cyphd-p", {}, l.publication ? O.jourCourt(l.publication) : "parution ?")),
        el("span.cyph-c", {},
          el("span.cyph-n", {}, b.concept || l.nom),
          el("span.cyph-m", {}, [
            s ? s.nom : null,
            b.rubrique || null,
            b.produit || null,
          ].filter(Boolean).join("  ·  "))),
        el("span.cyph-e." + e.cle, {}, e.nom),
        el("span.cyph-x", {}, ici ? "−" : "+")),

      /* Replié, la ligne dit déjà son coût : on ne déplie que pour agir. */
      el("div.cyp-q", {}, e.cout),

      ici ? corps(p, l, b, resp, rafraichir) : null
    );
  }

  function corps(p, l, b, resp, rafraichir) {
    return el("div.cyp-b", {},
      /* Le contenu, tel qu'il a été arrêté. */
      bloc("SUR LE VISUEL", b.texteVisuel),
      bloc("EN PUBLICATION", b.textePublication),
      el("div.cyp-r", {},
        b.cta ? el("div.cypr", {}, el("b", {}, "appel à l'action"), b.cta) : null,
        b.hashtags ? el("div.cypr", {}, el("b", {}, "mots-dièse"), b.hashtags) : null,
        b.objectif ? el("div.cypr", {}, el("b", {}, "objectif"), b.objectif) : null),

      (b.scenes || []).length
        ? el("div.cyp-sc", {},
            el("div.cypsc-t", {}, b.scenes.length + " scènes"),
            b.scenes.map(function (sc) {
              return el("div.cypsc", {},
                el("span.cypsc-n", {}, sc.n),
                el("div.cypsc-c", {},
                  el("div.cypsc-e", {}, sc.texteEcran),
                  el("div.cypsc-i", {}, sc.visuel),
                  el("div.cypsc-v", {}, sc.voixOff)));
            }))
        : null,

      /* Qui la fait, et où elle en est. */
      el("div.cyp-qui", {},
        el("span", {}, resp ? resp.nom + " · " + O.poste(resp.poste).nom : "personne d'affecté"),
        demandes(p, l)),

      el("div.form-actions", {},
        DEMANDE_VERSION.bouton(p, l, rafraichir),
        BRIEF_PRODUCTION.bouton(p, l),
        el("button.b.nu", { type: "button", onclick: function () {
          VUE_MATRICE.detail(p, l, rafraichir); } }, "le livrable →"))
    );
  }

  function bloc(titre, texte) {
    if (!texte) return null;
    return el("div.cypb", {},
      el("div.cypb-t", {}, titre),
      el("div.cypb-c", {}, texte));
  }

  function demandes(p, l) {
    var ds = (l.demandes || []);
    if (!ds.length) return null;
    return el("span.cyp-dm", {}, ds.map(function (dm) {
      var q = DEPOT.trouve("personnes", dm.qui);
      return el("span.cypdm" + (dm.rendu_le ? ".rendu" : ""), {},
        (q ? q.nom.split(" ")[0] : "?") + " · "
        + (dm.rendu_le ? "rendu le " + O.joli(dm.rendu_le)
           : "pour le " + (dm.pour ? O.joli(dm.pour) : "—")));
    }));
  }

  return { nature: nature, etat: etat, rendre: rendre };
})();
