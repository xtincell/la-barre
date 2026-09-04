/* kv-modele.js — le visuel maître par marché.
 *
 * Entre l'idée et les formats, il y a un niveau que le modèle n'avait pas : le
 * KV par marché. Un seul concept, une image par pays — et chacune porte sa
 * combinaison : marque, copy, langue, SKU montrés, et les choix de direction
 * artistique (l'enfant, le métier illustré).
 *
 * Les formats viennent après : ils déclinent un KV, ils ne le remplacent pas.
 */

window.KV = (function () {

  /* Ce qui distingue un KV d'un autre, et qui vaut pour toute campagne :
   * la marque, ce qui est écrit, dans quelle langue, ce qui est montré. */
  var AXES = [
    { cle: "marque", nom: "Marque", type: "texte" },
    { cle: "copy", nom: "Accroche", type: "texte", aide: "Cinq mots maximum — critère du §8." },
    { cle: "langue", nom: "Langue", type: "texte", aide: "Héritée du marché, surchargeable." },
    { cle: "sku", nom: "SKU montrés", type: "puces", aide: "Un par ligne. Un SKU non distribué sur ce marché est une erreur qui fait rappeler la campagne." },
    { cle: "mentions", nom: "Mentions portées", type: "puces" },
    { cle: "restrictions", nom: "Restrictions du marché", type: "puces" },
  ];

  /* Les choix de direction artistique, eux, changent à chaque campagne : ici
   * l'enfant et le métier illustré, là le nombre de personnages et le lieu.
   * Les coder en dur reviendrait à écrire une campagne dans le produit. La
   * campagne les déclare une fois, chaque KV les renseigne. */
  function axesDA(p) {
    return (p.axesDA || []).map(function (a) {
      return { cle: a.cle, nom: a.nom || a.cle, type: a.type || "texte", aide: a.aide || "", da: true };
    });
  }

  /* Les axes complets d'un KV de ce projet. */
  function axes(p) {
    return AXES.slice(0, 4).concat(axesDA(p)).concat(AXES.slice(4));
  }

  /* Trois niveaux, pas deux. C'est la distinction qui manquait :
   *
   *   maître       — un par route. La référence. Il n'appartient à aucun marché.
   *   adaptation   — le maître réécrit pour un marché : sa langue, son casting,
   *                  ses SKU, ses mentions. Un marché peut en avoir une, ou zéro.
   *   déclinaison  — un format. Il naît d'une adaptation, ou du maître si le
   *                  marché n'en a pas eu besoin.
   *
   * Un marché peut donc avoir plus ou moins de déclinaisons qu'un autre, et une
   * adaptation ou pas. Confondre les deux, c'est croire que tous les marchés
   * reçoivent la même chose. */
  var NIVEAUX = {
    maitre: { nom: "KV maître", rang: 0 },
    adaptation: { nom: "Adaptation", rang: 1 },
    declinaison: { nom: "Déclinaison", rang: 2 },
  };

  function niveau(l) {
    if (l.niveau) return l.niveau;
    if (l.kv && !l.maitre) return "maitre";
    if (l.kv) return "adaptation";
    return "declinaison";
  }

  function estKV(l) { return niveau(l) !== "declinaison"; }
  function estMaitre(l) { return niveau(l) === "maitre"; }
  function estAdaptation(l) { return niveau(l) === "adaptation"; }

  function tous(p) {
    return (p.livrables || []).filter(function (l) { return estKV(l) && !l.annule; });
  }

  function maitres(p) {
    return (p.livrables || []).filter(function (l) { return estMaitre(l) && !l.annule; });
  }

  function adaptations(p, maitreId) {
    return (p.livrables || []).filter(function (l) {
      return estAdaptation(l) && !l.annule && (!maitreId || l.maitre === maitreId);
    });
  }

  /* Les formats nés d'une pièce — adaptation ou maître. */
  function declinaisons(p, kvId) {
    return (p.livrables || []).filter(function (l) {
      return l.maitre === kvId && !l.annule && niveau(l) === "declinaison";
    });
  }

  /* Tout ce qui descend d'une pièce, à tous les étages. */
  function descendance(p, id) {
    var out = [];
    (p.livrables || []).forEach(function (l) {
      if (l.annule || l.maitre !== id) return;
      out.push(l);
      out = out.concat(descendance(p, l.id));
    });
    return out;
  }

  /* Ce qu'un marché reçoit réellement : son adaptation s'il en a une, et ses
   * formats. Deux marchés n'ont aucune raison d'en avoir autant. */
  function parMarche(p, pisteId) {
    return DEPOT.liste("marches").map(function (m) {
      var ada = (p.livrables || []).filter(function (l) {
        return estAdaptation(l) && !l.annule && l.marche === m.id
          && (!pisteId || l.pisteId === pisteId);
      })[0] || null;
      var formats = (p.livrables || []).filter(function (l) {
        return niveau(l) === "declinaison" && !l.annule && l.marche === m.id
          && (!pisteId || l.pisteId === pisteId);
      });
      return { marche: m, adaptation: ada, formats: formats,
        servi: !!ada || formats.length > 0 };
    });
  }

  function creer(p, marcheId, base, niveauVoulu) {
    var m = DEPOT.trouve("marches", marcheId);
    var support = DEPOT.liste("supports").filter(function (s) { return s.code === "kv"; })[0];
    if (!support) support = DEPOT.ajoute("supports", { code: "kv", nom: "Key visual", type: "kv" });

    var axes = {};
    MAISON.axes.forEach(function (a) { axes[a.cle] = "attente"; });
    if (m && m.langues.length === 1) axes.langue = "pret";

    var l = {
      id: O.id("KV"), niveau: niveauVoulu || (marcheId ? "adaptation" : "maitre"),
      voletId: base && base.voletId ? base.voletId : null,
      support: support.id, marche: marcheId || null,
      nom: "KV · " + (m ? m.code : "?"),
      responsable: null,   /* posé juste après, selon le niveau */
      origine: "prevu", pisteId: base ? base.pisteId : pisteRetenue(p),
      maitre: (niveauVoulu === "adaptation" || (!niveauVoulu && marcheId)) && base ? base.id : null,
      versionMaitre: base ? (base.version || 1) : null,
      version: 1, versions: [], estime: base ? base.estime : null,
      reel: null, toursVendus: base ? base.toursVendus : null,
      assets: [], entrees: [], annotations: [], mockups: [], axes: axes,
      kv: {
        marque: base && base.kv ? base.kv.marque : "",
        copy: base && base.kv ? base.kv.copy : "",
        langue: m ? (m.langues || [])[0] : "",
        sku: base && base.kv ? (base.kv.sku || []).slice() : [],
        mentions: m ? (m.mentions || []).slice() : [],
        restrictions: [],
      },
    };
    /* Une adaptation est le travail du directeur artistique qui a porté la
     * route : c'est lui qui sait ce que le marché doit garder du maître et ce
     * qu'il peut en changer. Elle ne se rattache donc pas au responsable du
     * maître, mais à l'auteur de la piste. */
    l.responsable = l.niveau === "adaptation"
      ? (daDePiste(p, l.pisteId) || (base ? base.responsable : null))
      : (base ? base.responsable : null);

    /* Les choix de DA se reprennent du KV de référence, à ajuster ensuite. */
    axesDA(p).forEach(function (a) {
      l.kv[a.cle] = base && base.kv ? (base.kv[a.cle] || "") : "";
    });
    if (!p.livrables) p.livrables = [];
    p.livrables.push(l);
    DEPOT.tracer("création", "kv", p.id, l.nom);
    return l;
  }

  /* Le directeur artistique d'une piste. C'est lui qui répond de ses
   * adaptations — la règle vaut pour toutes les maisons, pas seulement ici. */
  function daDePiste(p, pisteId) {
    var pi = (p.sections.pistes || []).filter(function (x) { return x.id === pisteId; })[0];
    return pi ? (pi.auteurDA || null) : null;
  }

  /* Les adaptations qui ne sont pas au DA de leur route. Ce n'est pas une
   * faute de saisie : c'est une pièce dont personne ne sait qui la porte le
   * jour où le marché demande une correction. */
  function adaptationsMalPortees(p) {
    return (p.livrables || []).filter(function (l) {
      if (l.annule || niveau(l) !== "adaptation") return false;
      var da = daDePiste(p, l.pisteId);
      return da && l.responsable !== da;
    }).map(function (l) {
      var da = daDePiste(p, l.pisteId);
      var pe = DEPOT.trouve("personnes", da);
      var act = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
      return { l: l, da: da, attendu: pe, actuel: act,
        cout: (act ? act.nom + " porte" : "personne ne porte") + " l'adaptation "
          + l.nom + ", alors que la route est de " + (pe ? pe.nom : "un autre DA")
          + " : au premier retour du marché, la correction n'a pas d'auteur" };
    });
  }

  function pisteRetenue(p) {
    var r = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    return r ? r.id : null;
  }

  /* ————————————————————— La conformité d'un KV à son marché ————————————————————— */

  /* C'est le contrôle que la planche imprimée ne fait pas : on regarde
   * quatorze images côte à côte et on ne voit pas qu'un SKU n'est pas
   * distribué au Ghana. */
  function conformite(p, l) {
    var m = DEPOT.trouve("marches", l.marche);
    var k = l.kv || {};
    var out = [];

    out.push({ quoi: "Marque", ok: !!k.marque, poids: 5,
      cout: "sans marque déclarée, impossible de vérifier le SKU ni la charte" });

    var langueMarche = m ? (m.langues || []) : [];
    var langueOk = !k.langue || !langueMarche.length || langueMarche.indexOf(k.langue) !== -1;
    out.push({ quoi: "Langue du marché", ok: langueOk && !!k.langue, poids: 5,
      cout: !k.langue ? "langue non déclarée"
        : "le marché parle " + langueMarche.map(O.langue).join(" ou ")
          + ", le KV est en " + O.langue(k.langue) });

    var mots = k.copy ? k.copy.trim().split(/\s+/).length : 0;
    out.push({ quoi: "Accroche ≤ 5 mots", ok: !!k.copy && mots <= 5, poids: 4,
      cout: !k.copy ? "aucune accroche" : "« " + k.copy + " » fait " + mots + " mots — refusable au §8" });

    var skuHorsMarche = skuNonDistribues(m, k);
    out.push({ quoi: "SKU distribués ici", ok: skuHorsMarche.length === 0, poids: 5,
      cout: skuHorsMarche.length
        ? "« " + skuHorsMarche[0] + " » n'est pas distribué sur ce marché"
        : "" });

    /* Les choix de DA : ceux que la campagne a déclarés, et eux seuls. */
    var da = axesDA(p);
    if (!da.length) {
      out.push({ quoi: "Axes de DA déclarés", ok: false, poids: 2,
        cout: "la campagne n'a déclaré aucun choix de direction artistique — rien ne distingue un KV d'un autre que son marché" });
    } else {
      var vides = da.filter(function (a) {
        var v = k[a.cle];
        return Array.isArray(v) ? !v.length : !String(v || "").trim();
      });
      out.push({ quoi: "Choix de DA posés", ok: vides.length === 0, poids: 3,
        cout: vides.map(function (a) { return a.nom.toLowerCase(); }).join(", ")
          + (vides.length > 1 ? " non arrêtés" : " non arrêté")
          + " — l'exécutant devra deviner" });
    }

    var mentionsMarche = m ? (m.mentions || []) : [];
    var portees = k.mentions || [];
    var manquantes = mentionsMarche.filter(function (x) { return portees.indexOf(x) === -1; });
    out.push({ quoi: "Mentions obligatoires", ok: manquantes.length === 0, poids: 4,
      cout: mentionsMarche.length
        ? manquantes.length + " mentions du marché absentes du KV"
        : "le marché n'a pas de mentions renseignées" });

    return out;
  }

  /* Un SKU montré doit être distribué sur le marché. Le référentiel marché
   * porte la liste ; sans elle on ne peut rien affirmer, et on le dit. */
  function skuNonDistribues(m, k) {
    if (!m || !(m.sku || []).length) return [];
    return (k.sku || []).filter(function (s) { return (m.sku || []).indexOf(s) === -1; });
  }

  function conforme(p, l) {
    return conformite(p, l).every(function (c) { return c.ok; });
  }

  /* Le pire écart de toute la planche, avec la pièce qui le porte. Compter les
   * KV non conformes ne dit rien ; nommer celui qui coûte le plus dit tout. */
  function pireEcart(p) {
    var pire = null;
    tous(p).forEach(function (l) {
      conformite(p, l).forEach(function (c) {
        if (c.ok) return;
        if (!pire || (c.poids || 0) > (pire.poids || 0)) pire = { poids: c.poids, quoi: c.quoi, cout: c.cout, l: l };
      });
    });
    return pire;
  }

  /* La grille : une ligne par marque, une colonne par marché — la planche. */
  function grille(p) {
    var kvs = tous(p);
    var marques = {}, marches = {};
    kvs.forEach(function (l) {
      var mq = (l.kv || {}).marque || "sans marque";
      marques[mq] = true;
      if (l.marche) marches[l.marche] = true;
    });
    return {
      marques: Object.keys(marques),
      marches: Object.keys(marches).map(function (id) { return DEPOT.trouve("marches", id); }).filter(Boolean),
      trouver: function (marque, marcheId) {
        return kvs.filter(function (l) {
          return ((l.kv || {}).marque || "sans marque") === marque && l.marche === marcheId;
        })[0] || null;
      },
      kvs: kvs,
    };
  }

  return { AXES: AXES, NIVEAUX: NIVEAUX, axes: axes, axesDA: axesDA,
    niveau: niveau, estKV: estKV, estMaitre: estMaitre, estAdaptation: estAdaptation,
    tous: tous, maitres: maitres, adaptations: adaptations, declinaisons: declinaisons,
    descendance: descendance, parMarche: parMarche,
    creer: creer, daDePiste: daDePiste, adaptationsMalPortees: adaptationsMalPortees,
    conformite: conformite, conforme: conforme, pireEcart: pireEcart, grille: grille,
    skuNonDistribues: skuNonDistribues };
})();
