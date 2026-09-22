/* vue-piste.js — une piste créative, en entier.
 *
 * Une piste n'est pas une vignette et trois lignes de texte : c'est un concept,
 * ses KV masters par marché, et tout ce qui en découle. Tant qu'on ne voit pas
 * l'arbre complet, on arbitre sur une impression.
 *
 * L'image commande. Le texte se range autour.
 */

window.VUE_ROUTE = (function () {
  var el = O.el;

  function kvs(p, pi) {
    return KV.tous(p).filter(function (l) { return l.pisteId === pi.id; });
  }

  function declinaisons(p, pi) {
    return (p.livrables || []).filter(function (l) {
      return !l.annule && !KV.estKV(l) && l.pisteId === pi.id;
    });
  }

  function mockups(p, pi) {
    var out = [];
    (p.livrables || []).forEach(function (l) {
      if (l.pisteId !== pi.id) return;
      (l.mockups || []).forEach(function (m) { out.push({ l: l, m: m }); });
    });
    return out;
  }

  /* ————————————————————— L'écran ————————————————————— */

  /* Ouvrir une piste, c'est changer d'écran — pas ouvrir un tiroir. */
  function ouvrir(p, pi, rafraichir) {
    VUE_PISTES.ouvrir(pi.id);
    location.hash = "#/projets/" + p.id + "/pistes";
    if (rafraichir) rafraichir();
  }

  function etiquette(pi) {
    return pi.statut === "retenue" ? "retenue" : pi.statut === "ecartee" ? "écartée" : "en lice";
  }

  function rendre(p, pi, apres) {
    var mes = kvs(p, pi);
    var da = DEPOT.trouve("personnes", pi.auteurDA);
    var decl = declinaisons(p, pi);
    var mks = mockups(p, pi);

    return el("div.rt", {},
      el("div.rt-tete", {},
        el("h2", {}, pi.titre || "Piste sans titre"),
        UI.eti(etiquette(pi), pi.statut === "retenue" ? "vert" : pi.statut === "ecartee" ? "terne" : "attente"),
        controle(p, da)
      ),
      scene(p, pi, apres),
      PRIORITE.bande(p, pi, apres),
      el("div", {}, VALIDATION.bande(p, "piste", pi, apres)),
      bande(p, pi, mes, decl, apres),
      /* L'axe avant l'argumentaire : le sacrifice et l'argument défendent
       * quelque chose, et ce quelque chose est l'axe. Le lire après, c'est
       * lire une plaidoirie avant de savoir sur quoi elle porte. */
      AXE.bloc(p, pi, apres),
      argumentaire(pi),
      DISPOSITIF.bloc(p, pi, apres),
      RETRO.bloc(p, pi, apres),
      mes.length ? blocKV(p, pi, mes, apres) : null,
      decl.length ? blocDecl(p, pi, decl, apres) : null,
      mks.length ? blocSituation(p, mks, apres) : null,
      gestes(p, pi, apres)
    );
  }

  /* Règle 2 des cumuls : quand le contrôleur et le contrôlé sont la même
   * personne, le contrôle remonte d'un cran. L'écran le dit, personne n'a à
   * s'en souvenir. */
  function controle(p, da) {
    if (!da) return null;
    var moi = DEPOT.liste("personnes").filter(function (x) { return x.poste === MAISON.titulaire; })[0];
    if (!moi || da.id !== moi.id) return null;
    return el("span.rt-controle", {},
      "contrôle : " + O.poste(O.poste(MAISON.titulaire).rattache).nom
      + " — cumul déclaré sur ce dossier");
  }

  /* Le visuel maître, en grand. C'est lui qu'on juge. */
  function scene(p, pi, apres) {
    var da = DEPOT.trouve("personnes", pi.auteurDA);
    var cr = DEPOT.trouve("personnes", pi.auteurCR);

    return el("div.rt-scene", {},
      el("div.rts-toile", {}, IMAGE.vignette(pi, "toile")),
      el("div.rts-pied", {},
        el("div.rts-auteurs", {},
          da ? UI.avatar(da, 22) : null,
          cr ? UI.avatar(cr, 22) : null,
          el("span", {}, (da ? da.nom : "auteur non nommé") + (cr ? "  ·  " + cr.nom : ""))
        ),
        IMAGE.bouton(pi, apres)
      )
    );
  }

  /* La question de la piste. */
  function bande(p, pi, mes, decl, apres) {
    var marches = DEPOT.liste("marches");
    var sansKV = marches.filter(function (m) {
      return !mes.some(function (l) { return l.marche === m.id; });
    });
    var nonConformes = mes.filter(function (l) { return !KV.conforme(p, l); });
    var sansMaitre = decl.filter(function (l) { return !l.maitre; });
    var perimees = decl.filter(function (l) { return REGLES.maitrePerime(p, l); });

    var controles = [
      { quoi: "Sacrifice écrit", ok: !!pi.sacrifice, poids: 5,
        cout: "une piste sans sacrifice n'est pas arbitrable — refusable au §8" },
      { quoi: "Argument écrit", ok: !!pi.argument, poids: 5,
        cout: "elle ne se défend que par le goût" },
      { quoi: "Auteur nommé", ok: !!pi.auteurDA, poids: 4,
        cout: "l'indicateur des idées retenues restera à zéro" },
      { quoi: "Un KV par marché", ok: sansKV.length === 0, poids: 4,
        cout: sansKV.map(function (m) { return m.nom; }).join(", ") + " sans visuel maître" },
      { quoi: "KV conformes", ok: nonConformes.length === 0, poids: 5,
        cout: nonConformes.length ? pireEcart(p, nonConformes) : "" },
      { quoi: "Déclinaisons rattachées", ok: sansMaitre.length === 0, poids: 3,
        cout: sansMaitre.length + " formats ne savent pas de quel KV ils viennent : une V2 ne les périmera pas" },
      { quoi: "Aucune adaptation dépassée", ok: perimees.length === 0, poids: 4,
        cout: perimees.length + " formats faits sur une version antérieure du master" },
      { quoi: "Un dispositif", ok: DISPOSITIF.liste(pi).length > 0, poids: 5,
        cout: "un concept sans activités ne se produit pas : le jour où elle est retenue, personne ne saura quoi fabriquer" },
    ];

    return UI.recevabilite(
      pi.statut === "retenue" ? "Cette piste fait autorité" : "Cette piste peut-elle être retenue ?",
      controles, null,
      [
        pi.statut !== "retenue"
          ? { nom: "Retenir cette piste", fort: true, quand: function () { retenir(p, pi, apres); } }
          : null,
        { nom: "Ajouter un KV", quand: function () { ajouterKV(p, pi, apres); } },
        { nom: "Renvoyer au DA", doux: true, quand: function () {
            PANNEAU.fermer();
            RENVOI.ouvrir({ quoi: "Route « " + pi.titre + " »", projet: p.ref, projetId: p.id, objet: pi.id });
          } },
      ].filter(Boolean));
  }

  function pireEcart(p, ls) {
    var pire = null;
    ls.forEach(function (l) {
      KV.conformite(p, l).forEach(function (c) {
        if (c.ok) return;
        if (!pire || (c.poids || 0) > (pire.poids || 0)) pire = { poids: c.poids, cout: c.cout, l: l };
      });
    });
    return pire ? pire.l.nom + " — " + pire.cout : "";
  }

  /* Ce qui se dit de la piste : court, et sous l'image. */
  function argumentaire(pi) {
    var blocs = [
      { t: "Le concept", v: pi.concept },
      { t: "La mécanique", v: pi.mecanique },
      { t: "Ce qu'elle sacrifie", v: pi.sacrifice, ton: "alerte" },
      { t: "L'argument", v: pi.argument, ton: "vert" },
      { t: "Implications de production", v: pi.production },
    ].filter(function (b) { return b.v; });

    return el("div.rt-arg", {},
      (pi.accroches || []).length
        ? el("div.rta-accroches", {}, pi.accroches.map(function (a) {
            var n = a.trim().split(/\s+/).length;
            return el("span.rta-a" + (n > 5 ? ".trop" : ""), { title: n + " mots" }, a);
          }))
        : null,
      el("div.rt-blocs", {}, blocs.map(function (b) {
        return el("div.rtb" + (b.ton ? "." + b.ton : ""), {},
          el("div.t", {}, b.t), el("div.v", {}, b.v));
      })),
      (pi.porteurs || []).length
        ? el("div.rta-porteurs", {}, el("span.t", {}, "PORTEURS DE RECONNAISSANCE"),
            pi.porteurs.map(function (x) { return UI.eti(x, "terne"); }),
            pi.porteurs.length < 3 ? UI.eti("il en faut trois", "alerte") : null)
        : null
    );
  }

  /* ————————————————————— Les KV masters de la piste ————————————————————— */

  function blocKV(p, pi, mes, apres) {
    return el("div.rt-bloc", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, "LES KV MASTERS"),
        el("span.n", {}, mes.length + (mes.length > 1 ? " marchés" : " marché"))),
      el("div.rt-mur", {}, mes.map(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        var ecarts = KV.conformite(p, l).filter(function (c) { return !c.ok; });
        var n = KV.declinaisons(p, l.id).length;
        return el("button.rt-c.grand" + (ecarts.length ? ".ecart" : ""), { type: "button",
          onclick: function () { VUE_ASSET.ouvrir(p, l, apres); } },
          IMAGE.vignette(l, "carte"),
          el("span.rtc-code", {}, m ? m.code : "?"),
          el("span.rtc-bas", {},
            el("span.rtc-n", {}, (l.kv || {}).copy || l.nom),
            el("span.rtc-m", {}, O.langue((l.kv || {}).langue)
              + (n ? "  ·  " + n + (n > 1 ? " formats" : " format") : "  ·  aucun format")),
            ecarts.length
              ? el("span.rtc-e", {}, ecarts.length + (ecarts.length > 1 ? " écarts" : " écart"))
              : el("span.rtc-ok", {}, "conforme"))
        );
      })));
  }

  /* ————————————————————— Les déclinaisons, groupées par KV master ————————————————————— */

  function blocDecl(p, pi, decl, apres) {
    var mes = kvs(p, pi);
    var cycle = window.VUE_CYCLE && VUE_CYCLE.regime(p) === "cycle";
    var groupes;

    if (cycle) {
      /* Dans un cycle, les livrables ne découlent pas d'un maître : elles se
       * suivent dans le temps. Les grouper par KV les envoyait toutes sous
       * « Sans master » — la piste gouverne pourtant chacune, et c'est ici
       * qu'on doit les voir. */
      groupes = [];
      decl.slice().sort(function (a, b) {
        return String(a.remise || a.publication || "").localeCompare(
               String(b.remise || b.publication || "")); })
        .forEach(function (l) {
          var d = l.remise || l.publication;
          var code = d ? "S" + O.semaine(new Date(d)) : "—";
          var g = groupes.filter(function (x) { return x.code === code; })[0];
          if (!g) {
            g = { code: code, ls: [],
              nom: d ? "à remettre à partir du " + O.joli(d) : "sans date" };
            groupes.push(g);
          }
          g.ls.push(l);
        });
    } else {
      groupes = mes.map(function (kv) {
        var m = DEPOT.trouve("marches", kv.marche);
        return { nom: (m ? m.nom : "?") + "  ·  " + ((kv.kv || {}).copy || kv.nom),
          code: m ? m.code : "?",
          ls: decl.filter(function (l) { return l.maitre === kv.id; }) };
      }).filter(function (g) { return g.ls.length; });

      var orphelines = decl.filter(function (l) {
        return !mes.some(function (kv) { return kv.id === l.maitre; });
      });
      if (orphelines.length) groupes.push({ nom: "Sans master", code: "—", ls: orphelines, orphelin: true });
    }

    return el("div.rt-bloc", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, cycle ? "LES PUBLICATIONS DE CETTE ROUTE" : "LES DÉCLINAISONS"),
        el("span.n", {}, decl.length + (cycle
          ? (decl.length > 1 ? " publications" : " publication")
          : (decl.length > 1 ? " formats" : " format")))),
      cycle ? el("p.rt-q", {}, "Chacune sert la piste ou n'appartient pas au mois. "
        + "C'est ce qui permet de refuser une publication sur autre chose que le goût.") : null,

      groupes.map(function (g) {
        return el("div.rt-groupe" + (g.orphelin ? ".orphelin" : ""), {},
          el("div.rtg-tete", {},
            el("span.rtg-code", {}, g.code),
            el("span.rtg-nom", {}, g.nom),
            el("span.rtg-n", {}, g.ls.length + (g.ls.length > 1 ? " formats" : " format"))),
          el("div.rt-mur", {}, g.ls.map(function (l) { return case_(p, l, apres); })));
      })
    );
  }

  function case_(p, l, apres) {
    var s = DEPOT.trouve("supports", l.support);
    var perime = REGLES.maitrePerime(p, l);
    var retours = ANNOT.ouvertes(l).length;
    var mk = (l.mockups || []).length;

    return el("button.rt-c" + (perime ? ".perime" : ""), { type: "button",
      onclick: function () { VUE_ASSET.ouvrir(p, l, apres); } },
      IMAGE.vignette(l, "carte"),
      retours ? el("span.rtc-r", {}, String(retours)) : null,
      el("span.rtc-bas", {},
        el("span.rtc-n", {}, s ? s.nom : l.nom),
        el("span.rtc-m", {}, "V" + (l.version || 1)
          + (mk ? "  ·  " + mk + " en situation" : "")
          + (perime ? "  ·  maître dépassé" : ""))
      )
    );
  }

  /* ————————————————————— Les mises en situation de la piste ————————————————————— */

  function blocSituation(p, mks, apres) {
    return el("div.rt-bloc", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, "EN SITUATION"),
        el("span.n", {}, mks.length + (mks.length > 1 ? " mises en situation" : " mise en situation"))),
      el("div.rt-mur", {}, mks.map(function (x) {
        return el("button.rt-c", { type: "button",
          onclick: function () { VUE_LIVRABLE.ouvrir(p, x.l, apres); } },
          IMAGE.vignette(x.m, "carte"),
          el("span.rtc-bas", {},
            el("span.rtc-n", {}, x.m.contexte || "contexte non dit"),
            el("span.rtc-m", {}, x.l.nom))
        );
      })));
  }

  /* ————————————————————— Les gestes ————————————————————— */

  function gestes(p, pi, apres) {
    return el("div.form-actions", { style: { "margin-top": "1.2rem" } },
      el("button.b.or", { type: "button", onclick: function () {
        PANNEAU.fermer(); VUE_PISTES.editer(p, pi, apres);
      } }, "Modifier la piste"),
      el("button.b", { type: "button", onclick: function () { ajouterKV(p, pi, apres); } }, "Ajouter un KV"),
      pi.statut !== "ecartee" && pi.statut !== "retenue"
        ? el("button.b.nu", { type: "button", onclick: function () { ecarter(p, pi, apres); } }, "Écarter")
        : null
    );
  }

  /* Retenir n'est pas valider un visuel : c'est ouvrir la production de tout
   * un dispositif. L'onde de choc dit ce que ça fabrique, et ce que ça coûte
   * aux pistes qui s'écartent. */
  function retenir(p, pi, apres) {
    var autres = (p.sections.pistes || []).filter(function (x) { return x.id !== pi.id && x.statut !== "ecartee"; });
    var mes = kvs(p, pi);
    var d = DISPOSITIF.declenche(p, pi);
    var perdues = 0;
    autres.forEach(function (x) {
      perdues += (p.livrables || []).filter(function (l) { return l.pisteId === x.id && !l.annule; }).length;
    });
    var champ = el("textarea", { rows: 2, placeholder: "Une ligne d'argument — c'est ce que le processus demande" });
    var creer = el("input", { type: "checkbox" });
    creer.checked = d.aCreer.length > 0;

    PANNEAU.sur("Retenir « " + (pi.titre || "cette piste") + " »", "ce que ça ouvre", el("div", {},
      el("div.stats", {},
        UI.stat("ACTIVITÉS", String(DISPOSITIF.liste(pi).length),
          "passent en production", DISPOSITIF.liste(pi).length ? "vert" : "alerte"),
        UI.stat("LIVRABLES À CRÉER", String(d.aCreer.length),
          d.aCreer.length ? "croisements du dispositif non couverts" : "tout existe déjà", ""),
        UI.stat("BAT MANQUANTS", String(d.sansBAT.length),
          d.sansBAT.length ? "sur les livrables existantes" : "tous posés",
          d.sansBAT.length ? "alerte" : "vert"),
        UI.stat("ORPHELINS", String(perdues),
          perdues ? "livrables faits sur les autres pistes" : "rien de perdu", perdues ? "alerte" : "")
      ),

      d.sansBAT.length
        ? UI.banniere("rouge", "La validation engage la livraison des BAT : "
            + d.sansBAT.length + (d.sansBAT.length > 1 ? " livrables n'en ont pas" : " livrable n'en a pas")
            + ". Sans eux, rien ne part à l'impression.")
        : UI.banniere("vert", "Tous les BAT sont posés : la production peut s'ouvrir."),

      d.aCreer.length
        ? el("div.sousbloc", {},
            el("h3", {}, "CE QUE LE DISPOSITIF EXIGE ET QUI N'EXISTE PAS"),
            el("div.chips", {}, d.aCreer.slice(0, 12).map(function (x) {
              return el("span.chip", {}, x.support.nom + " · " + x.marche.code); })),
            d.aCreer.length > 12 ? el("div.indice", {}, "et " + (d.aCreer.length - 12) + " autres") : null,
            el("label.coche", {}, creer,
              el("span", {}, "Créer ces " + d.aCreer.length + " livrables maintenant, rattachés à leur activité")))
        : null,

      perdues
        ? UI.banniere("", perdues + (perdues > 1 ? " livrables ont été produites" : " livrable a été produite")
            + " sur les pistes qui s'écartent. Elles restent au dossier, comptées.")
        : null,

      el("div.form", {}, el("div.champ", {}, el("label", {}, "L'argument"),
        el("div.indice", {}, "Il entre à la jurisprudence : c'est ce qui restera quand tu ne seras pas dans la pièce."), champ)),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Un arbitrage sans argument écrit n'en est pas un."); return; }
          (p.sections.pistes || []).forEach(function (x) { if (x.statut === "retenue") x.statut = "ecartee"; });
          pi.statut = "retenue"; pi.motif = champ.value.trim(); pi.arbitre_le = new Date().toISOString();
          var n = creer.checked ? DISPOSITIF.ouvrirProduction(p, pi) : 0;
          DEPOT.ajoute("decisions", { objet: pi.id, type: "piste", projet: p.id, verdict: "approuve",
            motif: pi.motif, quand: pi.arbitre_le, qui: MAISON.titulaire, titre: pi.titre });
          DEPOT.tracer("piste retenue", "pistes", p.id,
            pi.titre + (n ? " — " + n + " livrables ouverts en production" : ""));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); apres();
        } }, "Retenir et ouvrir la production"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function ecarter(p, pi, apres) {
    var n = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id && !l.annule; }).length;
    var champ = el("textarea", { rows: 2, placeholder: "Pourquoi elle ne part pas" });
    PANNEAU.sur("Écarter « " + (pi.titre || "cette piste") + " »", "ce que ça change", el("div", {},
      n ? UI.banniere("", n + (n > 1 ? " livrables restent" : " livrable reste") + " au dossier, comptées comme travail fait sur une piste écartée.")
        : UI.banniere("vert", "Aucun livrable n'a été produite sur cette piste."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Le motif"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Écarter sans motif écrit, c'est écarter par goût."); return; }
          pi.statut = "ecartee"; pi.motif = champ.value.trim();
          DEPOT.tracer("piste écartée", "pistes", p.id, pi.titre);
          DEPOT.enregistrer(); PANNEAU.fermerSur(); apres();
        } }, "Écarter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function ajouterKV(p, pi, apres) {
    var mes = kvs(p, pi);
    var selM = el("select", {});
    DEPOT.liste("marches").forEach(function (m) {
      var deja = mes.some(function (l) { return l.marche === m.id; });
      selM.appendChild(el("option", { value: m.id },
        m.nom + " · " + (m.langues || []).map(O.langue).join(", ") + (deja ? "  (déjà un KV)" : "")));
    });

    PANNEAU.sur("Nouveau KV master", pi.titre, el("div", {},
      UI.banniere("", "Le KV naît sur cette piste et en hérite : concept, accroche, choix de DA. Sa langue vient du marché."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Marché"), selM)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var l = KV.creer(p, selM.value, mes[0] || null);
          l.pisteId = pi.id;
          if (!l.vignette && pi.vignette) l.vignette = pi.vignette;
          var m = DEPOT.trouve("marches", selM.value);
          l.nom = "KV · " + (m ? m.code : "?") + " · " + (pi.titre || "");
          DEPOT.enregistrer(); PANNEAU.fermerSur(); apres();
        } }, "Créer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { ouvrir: ouvrir, rendre: rendre, kvs: kvs, declinaisons: declinaisons, mockups: mockups };
})();
