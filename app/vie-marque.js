/* vie-marque.js — la chronologie d'une marque, tous actes confondus.
 *
 * Le titulaire l'a demandée dans ces termes : « un dossier marque tient lieu
 * de traceur de vie de marque, comme l'est le dossier médical d'un patient ».
 *
 * Ce que ça implique, et qui n'allait pas de soi : une chronologie n'est pas
 * un journal d'outil. Un journal enregistre ce que J'AI FAIT dans le produit ;
 * une vie de marque enregistre ce qui LUI EST ARRIVÉ — y compris ce qu'une
 * autre agence lui a fait, y compris les fautes, y compris les révisions de
 * sa propre plateforme. C'est la différence entre un log et une anamnèse.
 *
 * Le module ne stocke rien. Il compose, à la lecture, depuis cinq sources qui
 * existent déjà et qui ne se parlaient pas :
 *
 *   les campagnes       le rythme : ce qui a été ouvert, et quand
 *   les projets         ce qui a été commandé, par qui, et comment ça s'est
 *                       soldé — clôture, bilan, résultat
 *   les révisions       ce que la plateforme a cessé de dire, et pourquoi
 *   le journal          les actes tracés qui portent cette marque — ce qui est
 *                       devenu possible le jour où tracer() a cessé de passer
 *                       un identifiant nul
 *   les fautes          ce qui est parti faux, et qu'on traque depuis
 *
 * Rien n'est inventé : si une source est muette, la ligne n'existe pas. Une
 * chronologie qui comble ses trous ne se lit plus.
 */

window.VIE_MARQUE = (function () {
  var el = O.el;

  /* Les projets d'une marque, quelle que soit la façon dont ils s'y rattachent. */
  function projetsDe(marqueId) {
    return DEPOT.liste("projets").filter(function (p) {
      var ident = (p.sections || {}).identite || {};
      return (ident.marqueIds || []).indexOf(marqueId) !== -1;
    });
  }

  /* ————————————————————— La chronologie ————————————————————— */

  function actes(marqueId) {
    var out = [];
    var pousser = function (quand, genre, quoi, detail, par) {
      if (!quand) return;
      out.push({ quand: quand, genre: genre, quoi: quoi, detail: detail || null,
        par: par || null });
    };

    /* 1 · Le rythme */
    if (window.CAMPAGNE) {
      CAMPAGNE.deMarque(marqueId).forEach(function (c) {
        pousser(c.cree_le, "campagne",
          c.regime === "always-on" ? "Cycle ouvert" : "Campagne ouverte",
          c.nom + (c.infere ? "  ·  rattachement inféré" : ""));
        if ((c.bilan || "").trim()) {
          pousser(c.bilan_le || c.cree_le, "bilan", "Bilan de campagne", c.nom);
        }
      });
    }

    /* 2 · Ce qui a été commandé, et comment ça s'est soldé */
    projetsDe(marqueId).forEach(function (p) {
      var tiers = p.par && p.par.agence ? p.par.agence : null;
      pousser(p.cree_le, tiers ? "tiers" : "projet",
        tiers ? "Projet mené par " + tiers : "Projet ouvert",
        p.nom + (window.NATURE ? "  ·  " + NATURE.nom(p).toLowerCase() : ""),
        tiers);

      if (p.cloture && p.cloture.le) {
        pousser(p.cloture.le, "cloture",
          p.cloture.infere ? "Projet clos, par inférence" : "Projet clos",
          p.nom + ((p.cloture.bilan || "").trim() ? "" : "  ·  sans bilan"));
      }
      (p.resultat || []).forEach(function (r) {
        pousser(r.date, "resultat", "Résultat mesuré",
          (r.quoi || "") + (r.valeur ? " : " + r.valeur : "")
          + (r.source ? "  ·  " + r.source : ""));
      });
    });

    /* 3 · Ce que la plateforme a cessé de dire */
    if (window.VAULT && VAULT.revisions) {
      VAULT.revisions("marque", marqueId).forEach(function (r) {
        var champ = VAULT.CHAMPS.filter(function (c) { return c.cle === r.champ; })[0];
        pousser(r.quand, "revision", "Plateforme révisée",
          (champ ? champ.nom : r.champ) + (r.motif ? "  ·  " + r.motif : ""),
          r.qui);
      });
    }

    /* 4 · Les actes tracés qui portent cette marque. C'est ce que l'identifiant
     * nul rendait impossible : ils existaient et n'étaient pas retrouvables. */
    DEPOT.journal().forEach(function (e) {
      if ((e.marques || []).indexOf(marqueId) === -1) return;
      pousser(e.quand, "trace", e.action, e.detail, e.qui);
    });

    return out.sort(function (a, b) { return a.quand < b.quand ? 1 : -1; });
  }

  /* ————————————————————— Ce que la vie dit d'elle-même ————————————————————— */

  function etat(marqueId) {
    var a = actes(marqueId);
    if (!a.length) {
      return { cle: "muette", nom: "aucun acte", ton: "attente",
        quoi: "Rien n'est enregistré sur cette marque. La campagne suivante "
          + "repartira sans savoir ce que la précédente a fait." };
    }
    var dernier = a[0];
    var jours = O.depuis(dernier.quand);
    var tiers = a.filter(function (x) { return x.genre === "tiers"; }).length;
    return { cle: "vivante", nom: a.length + (a.length > 1 ? " actes" : " acte"),
      ton: jours > 180 ? "attente" : "terne",
      quoi: "Dernier acte il y a " + (jours || 0) + (jours > 1 ? " jours" : " jour")
        + (jours > 180 ? " — la marque dort dans l'outil, pas sur le marché." : ".")
        + (tiers ? "  " + tiers + (tiers > 1 ? " actes viennent" : " acte vient")
            + " d'une autre agence." : "") };
  }

  /* ————————————————————— Le rendu ————————————————————— */

  var TONS = {
    campagne: "vert", bilan: "vert", projet: "", cloture: "terne",
    resultat: "vert", revision: "attente", tiers: "attente", trace: "terne",
  };

  function rendre(marqueId, limite) {
    var a = actes(marqueId);
    if (!a.length) {
      return el("p.rien", {}, "Aucun acte enregistré. Une marque sans histoire "
        + "n'oppose rien à la campagne suivante.");
    }
    var montres = limite ? a.slice(0, limite) : a;

    return el("div.vie", {},
      el("div.vie-l", {}, montres.map(function (x) {
        return el("div.vie-a." + (TONS[x.genre] || ""), {},
          el("span.viea-d", {}, O.jourCourt(x.quand)),
          el("span.viea-q", {}, x.quoi,
            x.par ? el("span.viea-p", {}, x.par) : null),
          x.detail ? el("span.viea-x", {}, x.detail) : null);
      })),
      /* Une liste coupée en silence se lit comme une liste complète. */
      a.length > montres.length
        ? el("p.vie-reste", {}, "et " + (a.length - montres.length)
            + " actes plus anciens")
        : null);
  }

  return { actes: actes, etat: etat, rendre: rendre, projetsDe: projetsDe };
})();
