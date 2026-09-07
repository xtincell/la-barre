/* ecarts.js — ce que je dois réclamer, et à qui.
 *
 * Une attente ne naît pas seulement d'un renvoi que j'ai écrit : elle naît de
 * tout écart constaté. Un KV en français sur un marché anglophone est une
 * demande de modification due par quelqu'un, que je l'aie formulée ou non.
 *
 * Cinq origines, et elles ne se valent pas. C'est l'origine qui dit qui est
 * légitimement sur le crochet, et si la reprise se facture :
 *
 *   brief        le livrable ne tient pas ce que le brief demande
 *   plateforme   elle contredit le socle de marque — vocabulaire, symboles, interdits
 *   bigidea      elle ne tient pas un critère d'acceptation écrit
 *   agence       nous avons changé d'avis. Le coût est pour nous.
 *   donneur      le client demande autre chose. C'est là que la reprise se compte.
 */

window.ECARTS = (function () {
  var el = O.el;

  var ORIGINES = {
    brief: { nom: "Non-respect du brief", ton: "alerte", rang: 0,
      qui: "l'exécutant", facturable: false,
      quoi: "le livrable ne tient pas ce que le brief demandait. La reprise est pour nous." },
    plateforme: { nom: "Non-respect de la plateforme", ton: "alerte", rang: 1,
      qui: "l'exécutant", facturable: false,
      quoi: "elle contredit le plateforme de marque. Refusable en revue sans recours." },
    bigidea: { nom: "Critère d'acceptation non tenu", ton: "alerte", rang: 2,
      qui: "l'exécutant", facturable: false,
      quoi: "un critère écrit avant le travail n'est pas tenu. C'est le seul refus opposable." },
    agence: { nom: "Desiderata de l'agence", ton: "attente", rang: 3,
      qui: "nous", facturable: false,
      quoi: "nous avons changé d'avis. Le coût reste pour nous, et il se compte." },
    donneur: { nom: "Desiderata du donneur d'ordre", ton: "or", rang: 4,
      qui: "le client", facturable: true,
      quoi: "le client demande autre chose. C'est là que la clause de reprise s'applique." },
  };

  function def(cle) { return ORIGINES[cle] || ORIGINES.agence; }

  /* Depuis quand cet écart existe-t-il ? Un écart est calculé, jamais saisi :
   * sa date est celle du fait qui le produit. Sans elle, « ce qu'on me doit »
   * ne peut pas se lire dans le temps — et c'est sa seule bonne lecture. */
  function depuisQuand(x) {
    if (x.feedback && x.feedback.quand) return x.feedback.quand;
    if (x.annotation && x.annotation.quand) return x.annotation.quand;
    if (x.livrable) {
      var vs = x.livrable.versions || [];
      var v = vs[vs.length - 1];
      if (v && (v.close_le || v.ouvert_le)) return v.close_le || v.ouvert_le;
    }
    return x.projet ? x.projet.cree_le : null;
  }

  /* ————————————————————— Le relevé ————————————————————— */

  /* Tout ce qui, aujourd'hui, exige une modification. Calculé, jamais saisi :
   * un écart qu'il faut penser à déclarer n'est jamais déclaré. */
  function tous(projetId) {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      if (projetId && p.id !== projetId) return;
      out = out.concat(duBrief(p), deLaPlateforme(p), deLaBigIdea(p), duDonneur(p), deLAgence(p));
    });
    out.forEach(function (x) { if (!x.quand) x.quand = depuisQuand(x); });
    return out.sort(function (a, b) {
      var d = def(a.origine).rang - def(b.origine).rang;
      if (d !== 0) return d;
      /* Chez le donneur, l'ordre est celui des niveaux : le KV avant le format. */
      var na = a.niveau ? a.niveau.rang : 9, nb = b.niveau ? b.niveau.rang : 9;
      return na - nb;
    });
  }

  function pousser(out, p, l, origine, quoi, cout, poste) {
    out.push({
      cle: p.id + "|" + (l ? l.id : "-") + "|" + origine + "|" + quoi,
      projet: p, livrable: l || null, origine: origine, quoi: quoi, cout: cout,
      poste: poste || "da",
      responsable: l && l.responsable ? l.responsable : null,
      ecarte: ecarte(p.id + "|" + (l ? l.id : "-") + "|" + origine + "|" + quoi),
    });
  }

  /* Le brief exige une langue, des SKU, des mentions par marché. Un livrable qui
   * ne les tient pas ne respecte pas le brief — pas le goût de quelqu'un. */
  function duBrief(p) {
    var out = [];
    KV.tous(p).forEach(function (l) {
      KV.conformite(p, l).forEach(function (c) {
        if (c.ok) return;
        var origine = c.quoi === "Accroche ≤ 5 mots" ? "bigidea" : "brief";
        pousser(out, p, l, origine, c.quoi, c.cout, "da");
      });
    });
    /* Les périmètres promis et non produits.
     *
     * Le périmètre est une liste de puces. Un dépôt importé peut le porter en
     * texte — et une seule ligne mal typée faisait tomber tout le calcul des
     * écarts, donc la liste des dossiers avec. On lit ce qui est là. */
    var promis = (p.sections.brief || {}).livrables_attendus;
    if (typeof promis === "string") promis = promis.split("\n");
    if (!Array.isArray(promis)) promis = [];
    promis.filter(function (x) { return x && String(x).trim(); }).forEach(function (x) {
      var n = O.normalise(x);
      var existe = (p.livrables || []).some(function (l) {
        return !l.annule && O.normalise(l.nom).indexOf(n.split(" ")[0]) !== -1;
      });
      if (!existe) {
        pousser(out, p, null, "brief", "« " + x + " » promis au brief, absent du dossier",
          "le périmètre vendu n'est pas couvert : l'écart se découvrira à la livraison", "creation");
      }
    });
    return out;
  }

  /* Le socle interdit des mots et retire des noms. R10 et R12, appliquées. */
  function deLaPlateforme(p) {
    var out = [];
    var s = p.sections.socle || {};
    (p.livrables || []).forEach(function (l) {
      if (l.annule) return;
      var textes = [l.nom, (l.kv || {}).copy].filter(Boolean).join(" ");
      if (!textes) return;
      (s.jamais || []).forEach(function (mot) {
        if (O.contient(textes, mot)) {
          pousser(out, p, l, "plateforme", "« " + mot + " » — la marque ne le dit jamais",
            "le livrable contredit la plateforme de marque : refusable en revue sans recours", "redacteur");
        }
      });
      MAISON.nomsRetires.forEach(function (nom) {
        if (O.contient(textes, nom)) {
          pousser(out, p, l, "plateforme", "« " + nom + " » est un nom retiré",
            "règle R12 : ce nom ne doit plus apparaître nulle part", "redacteur");
        }
      });
    });
    if ((p.sections.bigidea || {}).idee && !s.idee_directrice) {
      pousser(out, p, null, "plateforme", "Big idea ouverte sans plateforme de marque active",
        "la campagne pourra être refusée en revue sans recours", "creation");
    }
    return out;
  }

  /* Les critères d'acceptation : écrits avant, opposables après. */
  function deLaBigIdea(p) {
    var out = [];
    var crit = ((p.sections.bigidea || {}).criteres || []);
    if (!crit.length) return out;

    (p.sections.pistes || []).forEach(function (pi) {
      if (pi.statut === "ecartee") return;
      if (!pi.sacrifice) pousser(out, p, null, "bigidea",
        "« " + (pi.titre || "piste") + " » sans sacrifice écrit",
        "la piste n'est pas arbitrable — refusable au §8", "da");
      if (!pi.argument) pousser(out, p, null, "bigidea",
        "« " + (pi.titre || "piste") + " » sans argument écrit",
        "elle ne se défend que par le goût", "da");
    });

    (p.livrables || []).forEach(function (l) {
      if (l.annule) return;
      if (REGLES.maitrePerime(p, l)) {
        pousser(out, p, l, "bigidea", "Faite sur une version dépassée du master",
          "ce qui est produit ne correspond plus à ce qui a été validé", "da");
      }
    });
    return out;
  }

  /* Les retours client non tranchés : chacun est une modification en attente. */
  /* Un retour client fait UNE ligne, pas une par livrable touché. Sinon le même
   * feedback se répète six fois et l'on ne voit plus lequel commande les autres. */
  function duDonneur(p) {
    var out = [];
    FEEDBACK.ordre(p.id).forEach(function (x) {
      var f = x.f, i = x.impact;
      var l = i.pieces[0] || null;
      out.push({
        cle: p.id + "|fb|" + f.id,
        projet: p, livrable: l, origine: "donneur",
        quoi: f.texte.slice(0, 110) + (f.texte.length > 110 ? "…" : ""),
        cout: FEEDBACK.nomAuteur(f.auteur) + " · " + O.joli(f.quand)
          + "  ·  " + i.assets + (i.assets > 1 ? " livrables" : " livrable")
          + ", " + i.jours + " j"
          + (i.enProduction ? "  ·  " + i.enProduction + " déjà en production" : ""),
        poste: "da", responsable: l && l.responsable ? l.responsable : null,
        feedback: f, niveau: x.niveau, attend: x.attend, pret: x.pret,
        onde: i, ecarte: ecarte(p.id + "|fb|" + f.id),
      });
    });
    return out;
  }

  /* Ce que nous nous devons à nous-mêmes : les annotations ouvertes. */
  function deLAgence(p) {
    var out = [];
    (p.livrables || []).forEach(function (l) {
      if (l.annule) return;
      ANNOT.ouvertes(l).forEach(function (a) {
        var qui = a.auteur ? DEPOT.trouve("personnes", a.auteur) : null;
        pousser(out, p, l, a.reprise ? "donneur" : "agence",
          a.texte.slice(0, 90) + (a.texte.length > 90 ? "…" : ""),
          (qui ? qui.nom : "client") + " · " + O.joli(a.quand)
            + (a.reprise ? " · après validation : c'est une reprise" : ""), "da");
      });
    });
    return out;
  }

  /* ————————————————————— « Ce n'en est pas un » ————————————————————— */

  function ecartes() { return DEPOT.tout().ecartsEcartes || {}; }
  function ecarte(cle) { return ecartes()[cle] || null; }

  function ecarterUn(cle, motif) {
    var d = DEPOT.tout();
    if (!d.ecartsEcartes) d.ecartsEcartes = {};
    d.ecartsEcartes[cle] = { motif: motif, quand: new Date().toISOString() };
    DEPOT.enregistrer();
  }

  function reprendre(cle) {
    var d = DEPOT.tout();
    if (d.ecartsEcartes) delete d.ecartsEcartes[cle];
    DEPOT.enregistrer();
  }

  /* ————————————————————— Le compte ————————————————————— */

  function compte(projetId) {
    var m = {};
    tous(projetId).forEach(function (x) {
      if (x.ecarte) return;
      m[x.origine] = (m[x.origine] || 0) + 1;
    });
    return m;
  }

  function total(projetId) {
    return tous(projetId).filter(function (x) { return !x.ecarte; }).length;
  }

  return { ORIGINES: ORIGINES, def: def, depuisQuand: depuisQuand, tous: tous, compte: compte, total: total,
    ecarterUn: ecarterUn, reprendre: reprendre };
})();
