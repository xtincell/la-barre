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
  var CHAMPS_KV = [
    { cle: "marque", nom: "Marque", type: "texte" },
    { cle: "copy", nom: "Accroche", type: "texte", aide: "Cinq mots maximum." },
    { cle: "langue", nom: "Langue", type: "texte", aide: "Héritée du marché, surchargeable." },
    { cle: "sku", nom: "SKU montrés", type: "puces", aide: "Un par ligne. Un SKU non distribué sur ce marché est une erreur qui fait rappeler la campagne." },
    { cle: "mentions", nom: "Mentions portées", type: "puces" },
    { cle: "restrictions", nom: "Restrictions du marché", type: "puces" },
  ];

  /* Les choix de direction artistique, eux, changent à chaque campagne : ici
   * l'enfant et le métier illustré, là le nombre de personnages et le lieu.
   * Les coder en dur reviendrait à écrire une campagne dans le produit. La
   * campagne les déclare une fois, chaque KV les renseigne. */
  function champsDA(p) {
    return (p.champsDA || []).map(function (a) {
      return { cle: a.cle, nom: a.nom || a.cle, type: a.type || "texte", aide: a.aide || "", da: true };
    });
  }

  /* Les axes complets d'un KV de ce projet. */
  function axes(p) {
    return CHAMPS_KV.slice(0, 4).concat(champsDA(p)).concat(CHAMPS_KV.slice(4));
  }

  /* Trois niveaux, pas deux. C'est la distinction qui manquait :
   *
   *   maître       — un par piste. La référence. Il n'appartient à aucun marché.
   *   adaptation   — le master réécrit pour un marché : sa langue, son casting,
   *                  ses SKU, ses mentions. Un marché peut en avoir une, ou zéro.
   *   déclinaison  — un format. Il naît d'une adaptation, ou du master si le
   *                  marché n'en a pas eu besoin.
   *
   * Un marché peut donc avoir plus ou moins de déclinaisons qu'un autre, et une
   * adaptation ou pas. Confondre les deux, c'est croire que tous les marchés
   * reçoivent la même chose. */
  var NIVEAUX = {
    maitre: { nom: "KV master", rang: 0 },
    adaptation: { nom: "Adaptation marché", rang: 1 },
    declinaison: { nom: "Format", rang: 2 },
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

  /* Les formats nés d'un livrable — adaptation ou maître. */
  function declinaisons(p, kvId) {
    return (p.livrables || []).filter(function (l) {
      return l.maitre === kvId && !l.annule && niveau(l) === "declinaison";
    });
  }

  /* Tout ce qui descend d'un livrable, à tous les étages. */
  function descendance(p, id, vus) {
    vus = vus || Object.create(null);
    vus[id] = true;
    var out = [];
    (p.livrables || []).forEach(function (l) {
      if (l.annule || l.maitre !== id || vus[l.id]) return;
      vus[l.id] = true;
      out.push(l);
      out = out.concat(descendance(p, l.id, vus));
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

  /* ————— Le titre d'une pièce à l'écran —————
   *
   * L'outil nommait les pièces par leurs codes : « KV · GH · Orvelle », « Post
   * social 1:1 · CI ». Le studio dit « Key visual — Ghana · Orvelle ». Quand le
   * nom suit ce motif, l'écran compose le support et le marché en clair, garde
   * ce qui suit le code (la marque), et le code passe en surtitre ; un nom écrit
   * par l'équipe reste tel quel. Rien n'est réécrit dans la base.
   *
   * La marque reste dans le titre : sur une planche, trois KV du Cameroun ne se
   * distinguent que par elle. */
  function referentiel(l) {
    return { m: l && l.marche ? DEPOT.trouve("marches", l.marche) : null,
      s: l && l.support ? DEPOT.trouve("supports", l.support) : null };
  }

  /* Ce qui suit le code (« Orvelle » dans « KV · GH · Orvelle »), « » s'il n'y
   * a rien, null si le nom n'est pas un code. */
  function suiteDeCode(l) {
    var nom = l && typeof l.nom === "string" ? l.nom.trim() : "";
    if (!nom) return null;
    var maitre = /^KV master commun(?: · (.+))?$/.exec(nom);
    if (maitre) return maitre[1] || "";
    var r = referentiel(l);
    if (!r.m || !r.m.code) return null;
    var prefixes = ["KV"].concat(r.s ? [r.s.nom, r.s.code] : []).filter(Boolean);
    for (var i = 0; i < prefixes.length; i++) {
      var debut = prefixes[i] + " · " + r.m.code;
      if (nom === debut) return "";
      if (nom.indexOf(debut + " · ") === 0) return nom.slice(debut.length + 3);
    }
    return null;
  }
  function nomDeCode(l) { return suiteDeCode(l) !== null; }

  function marqueDe(l) { return l && l.kv && typeof l.kv.marque === "string" ? l.kv.marque.trim() : ""; }

  /* « Key visual — Ghana · Orvelle », « Key visual master · Orvelle ». */
  function composer(l, suite) {
    var r = referentiel(l);
    var support = (r.s && r.s.nom) || "Key visual";
    return (r.m ? support + " — " + (r.m.nom || r.m.code) : support + " master") + (suite ? " · " + suite : "");
  }

  /* Le nom qu'un KV neuf reçoit : ce qu'il est, où, et pour quelle marque. */
  function nomDeTravail(l) { return composer(l, marqueDe(l)); }

  /* Quand la marque d'un KV change, un nom posé par l'outil la suit : un code
   * reste un code (« KV · GH · Peak »), un nom de travail reste un nom de
   * travail (« Key visual — Ghana · Peak »). Un nom écrit par l'équipe ne bouge
   * pas. `avant` est la marque d'avant le changement. */
  function suivreMarque(l, avant) {
    var nom = l && typeof l.nom === "string" ? l.nom.trim() : "";
    var marque = marqueDe(l), r = referentiel(l);
    if (nomDeCode(l)) {
      l.nom = (estMaitre(l) && !l.marche ? "KV master commun" : "KV · " + (r.m ? r.m.code : "?")) + (marque ? " · " + marque : "");
      return true;
    }
    avant = typeof avant === "string" ? avant.trim() : "";
    if (nom === composer(l, "") || (avant && nom === composer(l, avant))) { l.nom = nomDeTravail(l); return true; }
    return false;
  }

  /* Le tiret et le point médian ne restent jamais pendus en fin de ligne
   * (« Key visual — » / « Ghana », « Ghana · » / « Orvelle ») : une espace
   * insécable les tient au mot qui les suit, et la ligne se coupe avant eux. */
  function tenir(t) { return String(t).replace(/ — /g, " —\u00a0").replace(/ · /g, " ·\u00a0"); }

  function titre(l) {
    if (!l) return "";
    var suite = suiteDeCode(l);
    if (suite === null) return tenir(l.nom || "Pièce sans nom");
    return tenir(composer(l, suite || marqueDe(l)));
  }

  function surtitre(l) { return nomDeCode(l) ? l.nom.trim() : null; }

  /* La forme de code d'une pièce dont l'outil a posé le nom : « KV · GH ·
   * Orvelle », « KV master commun · Orvelle ». L'écran ne la montre plus en
   * titre, mais l'agence nomme ses fichiers (« KV_GH_Orvelle_V3.jpg ») et
   * cherche ses pièces (« KV GH ») ainsi : c'est la clé de rapprochement. Un
   * KV né avec un nom de travail (« Key visual — Ghana · Orvelle ») la reçoit
   * comme un KV nommé par son code. null pour un nom écrit par l'équipe. */
  function code(l) {
    if (!l) return null;
    if (nomDeCode(l)) return l.nom.trim();
    if (!estKV(l)) return null;
    var nom = typeof l.nom === "string" ? l.nom.trim() : "";
    var base = composer(l, ""), suite;
    if (nom === base) suite = "";
    else if (nom.indexOf(base + " · ") === 0) suite = nom.slice(base.length + 3);
    else return null;
    var r = referentiel(l);
    var tete = !l.marche ? (estMaitre(l) ? "KV master commun" : null) : (r.m && r.m.code ? "KV · " + r.m.code : null);
    if (!tete) return null;
    suite = suite || marqueDe(l);
    return tete + (suite ? " · " + suite : "");
  }

  /* `options.marque` : la marque d'un master neuf. Elle est posée avant le nom
   * et avant le journal, pour que l'un et l'autre la disent dès la création ;
   * une adaptation hérite celle de son master. */
  function creer(p, marcheId, base, niveauVoulu, options) {
    var cible = niveauVoulu || (marcheId ? "adaptation" : "maitre");
    if (cible !== "maitre" && cible !== "adaptation") throw new Error("Niveau de KV inconnu.");
    var m = DEPOT.trouve("marches", marcheId);
    if (cible === "adaptation") {
      if (!base || !estMaitre(base) || base.annule || (p.livrables || []).indexOf(base) === -1) {
        throw new Error("Une adaptation doit référencer un KV master du dossier.");
      }
      if (!m) throw new Error("Choisir un marché renseigné avant de créer son adaptation.");
    } else { marcheId = null; m = null; }
    var support = DEPOT.liste("supports").filter(function (s) { return s.code === "kv"; })[0];
    if (!support) support = DEPOT.ajoute("supports", { code: "kv", nom: "Key visual", type: "kv" });

    var axes = {};
    MAISON.points.forEach(function (a) { axes[a.cle] = "attente"; });
    if (m && (m.langues || []).length === 1) axes.langue = "pret";

    var l = {
      id: DEPOT.identifiant("KV"), cree_le: new Date().toISOString(), niveau: cible,
      voletId: base && base.voletId ? base.voletId : null,
      support: support.id, marche: marcheId || null,
      nom: null,           /* posé juste après, avec la marque reçue */
      responsable: null,   /* posé juste après, selon le niveau */
      origine: "prevu", pisteId: base ? base.pisteId : pisteRetenue(p),
      maitre: cible === "adaptation" ? base.id : null,
      versionMaitre: cible === "adaptation" ? (base.version || 1) : null,
      version: 1, versions: [], estime: base ? base.estime : null,
      reel: null, toursVendus: base ? base.toursVendus : null,
      assets: [], entrees: [], annotations: [], mockups: [], points: axes,
      kv: herite(base, m),
    };
    /* Une adaptation est le travail du directeur artistique qui a porté la
     * piste : c'est lui qui sait ce que le marché doit garder du master et ce
     * qu'il peut en changer. Elle ne se rattache donc pas au responsable du
     * maître, mais à l'auteur de la piste. */
    l.responsable = l.niveau === "adaptation"
      ? (daDePiste(p, l.pisteId) || (base ? base.responsable : null))
      : (base ? base.responsable : null);

    /* Les choix de DA se reprennent du KV de référence, à ajuster ensuite. */
    champsDA(p).forEach(function (a) {
      l.kv[a.cle] = base && base.kv ? (base.kv[a.cle] || "") : "";
    });
    if (cible === "maitre" && options && typeof options.marque === "string") l.kv.marque = options.marque.trim();
    if (cible === "adaptation") l.depart = pointDeDepart(base, l.kv);
    l.nom = nomDeTravail(l);
    if (!p.livrables) p.livrables = [];
    p.livrables.push(l);
    DEPOT.tracer("création", "kv", p.id, l.nom);
    return l;
  }

  /* Ce qu'une adaptation reçoit en naissant : le contenu du master, et du
   * référentiel du marché sa langue (quand il n'en parle qu'une) et ses
   * mentions. Une langue ou une mention héritées du marché ne sont pas un
   * écart au master : c'est le marché qui les impose, pas l'adaptation. */
  function herite(base, m) {
    return {
      marque: base && base.kv ? base.kv.marque : "",
      copy: base && base.kv ? base.kv.copy : "",
      langue: m && (m.langues || []).length === 1 ? m.langues[0] : "",
      sku: base && base.kv ? (base.kv.sku || []).slice() : [],
      mentions: m ? (m.mentions || []).slice() : [],
      restrictions: base && base.kv ? (base.kv.restrictions || []).slice() : [],
    };
  }

  /* Le point de départ d'une adaptation : ce qu'elle a reçu, et de quelle
   * version du master. Une copie figée des champs de CHAMPS_KV — les choix de
   * DA n'en sont pas, ils changent d'un KV à l'autre par construction.
   *
   * C'est ce qui permet de dire ce qu'une adaptation CHANGE, et donc si son
   * marché l'a déclaré (ecarts-marche.js). Une adaptation créée avant cette
   * capture n'en a pas, et on ne lui en invente pas : elle reste « non
   * évaluée ». */
  function pointDeDepart(base, kv) {
    var recu = {};
    CHAMPS_KV.forEach(function (c) {
      var v = kv[c.cle];
      recu[c.cle] = Array.isArray(v) ? v.slice() : v;
    });
    return { maitre: base.id, versionMaitre: base.version || 1, le: new Date().toISOString(), kv: recu };
  }

  /* Le directeur artistique d'une piste. C'est lui qui répond de ses
   * adaptations — la règle vaut pour toutes les maisons, pas seulement ici. */
  function daDePiste(p, pisteId) {
    var pi = (p.sections.pistes || []).filter(function (x) { return x.id === pisteId; })[0];
    return pi ? (pi.auteurDA || null) : null;
  }

  /* Les adaptations qui ne sont pas au DA de leur piste. Ce n'est pas une
   * faute de saisie : c'est un livrable dont personne ne sait qui la porte le
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
          + l.nom + ", alors que la piste est de " + (pe ? pe.nom : "un autre DA")
          + " : au premier retour du marché, la correction n'a pas d'auteur" };
    });
  }

  function pisteRetenue(p) {
    var r = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    return r ? r.id : null;
  }

  /* Le geste ne copie rien : l'exécutant atteste une reprise sur une référence
   * précise. L'ancien contenu et ses accords restent dans l'historique. */
  function reprendreReference(p, l, attendu, motif) {
    var m = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
    if (!m || m.annule || l.annule || (p.livrables || []).indexOf(l) === -1) throw new Error("La référence n'est plus disponible.");
    if (!attendu || JSON.stringify(l) !== attendu.contenuLivrable || l.maitre !== attendu.maitreId || (l.version || 1) !== attendu.version
      || (m.version || 1) !== attendu.versionMaitre || JSON.stringify(m.kv || {}) !== attendu.contenuMaitre) {
      throw new Error("Le livrable ou sa référence a changé pendant la lecture. Rouvrir la reprise.");
    }
    if (REGLES.maitrePerime(p, m)) throw new Error("Reprendre d'abord la référence sur son propre parent. La préparation du livrable reste possible.");
    if (!String(motif || "").trim()) throw new Error("Décrire ce qui a été repris ou pourquoi aucun ajustement n'était nécessaire.");
    VERSION.ouvrir(l, "interne", "Reprise sur « " + m.nom + " » V" + (m.version || 1) + " : " + motif.trim(), null, { complet: true });
    l.versionMaitre = m.version || 1;
    /* Une adaptation évaluée repart de la référence reprise : ce qu'elle change
     * se lit désormais contre elle. Sans cela, reprendre la titraille du master
     * passerait pour un écart à l'ancien. Une adaptation qui n'avait pas de
     * départ n'en reçoit pas ici : la reprise ne copie rien. */
    if (l.depart && estAdaptation(l)) l.depart = pointDeDepart(m, herite(m, DEPOT.trouve("marches", l.marche)));
    return l.version;
  }

  /* ————————————————————— La conformité d'un KV à son marché ————————————————————— */

  /* C'est le contrôle que la planche imprimée ne fait pas : on regarde
   * quatorze images côte à côte et on ne voit pas qu'un SKU n'est pas
   * distribué au Ghana.
   *
   * Chaque contrôle nomme dans `types` le type d'écart de la méthode qu'il
   * vérifie (ecarts-marche.js) ; l'accroche et les choix de DA n'en ont pas. */
  function conformite(p, l) {
    var m = DEPOT.trouve("marches", l.marche);
    var commun = estMaitre(l) && !l.marche;
    var k = l.kv || {};
    var out = [];

    out.push({ quoi: "Marque", ok: !!k.marque, poids: 5, types: ["marque"],
      cout: "sans marque déclarée, impossible de vérifier le SKU ni la charte" });

    var langueMarche = m ? (m.langues || []) : [];
    var langueOk = langueMarche.length > 0 && langueMarche.indexOf(k.langue) !== -1;
    if (!commun) out.push({ quoi: "Langue du marché", ok: langueOk && !!k.langue, poids: 5, types: ["langue"],
      cout: !langueMarche.length ? "langues du marché non renseignées — conformité impossible à vérifier"
        : !k.langue ? "langue non déclarée"
        : "le marché parle " + langueMarche.map(O.langue).join(" ou ")
          + ", le KV est en " + O.langue(k.langue) });

    var mots = k.copy ? k.copy.trim().split(/\s+/).length : 0;
    out.push({ quoi: "Accroche ≤ 5 mots", ok: !!k.copy && mots <= 5, poids: 4,
      cout: !k.copy ? "aucune accroche" : "« " + k.copy + " » fait " + mots + " mots : cinq au plus" });

    var skuHorsMarche = skuNonDistribues(m, k);
    var distributionConnue = !!(m && (m.sku || []).length);
    if (!commun) out.push({ quoi: "SKU distribués ici", ok: distributionConnue && skuHorsMarche.length === 0, poids: 5, types: ["produit"],
      cout: !distributionConnue ? "SKU distribués sur le marché non renseignés — conformité impossible à vérifier"
        : skuHorsMarche.length
        ? "« " + skuHorsMarche[0] + " » n'est pas distribué sur ce marché"
        : "" });

    /* Les choix de DA : ceux que la campagne a déclarés, et eux seuls. */
    var da = champsDA(p);
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
    if (!commun) out.push({ quoi: "Mentions obligatoires", ok: mentionsMarche.length > 0 && manquantes.length === 0, poids: 4, types: ["reglementaire"],
      cout: mentionsMarche.length
        ? manquantes.length + " mentions du marché absentes du KV"
        : "mentions du marché non renseignées — conformité impossible à vérifier" });

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

  /* Le pire écart de toute la planche, avec le livrable qui le porte. Compter les
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

  return { CHAMPS_KV: CHAMPS_KV, NIVEAUX: NIVEAUX, axes: axes, champsDA: champsDA,
    niveau: niveau, estKV: estKV, estMaitre: estMaitre, estAdaptation: estAdaptation,
    tous: tous, maitres: maitres, adaptations: adaptations, declinaisons: declinaisons,
    descendance: descendance, parMarche: parMarche,
    creer: creer, reprendreReference: reprendreReference, daDePiste: daDePiste, adaptationsMalPortees: adaptationsMalPortees,
    conformite: conformite, conforme: conforme, pireEcart: pireEcart, grille: grille,
    skuNonDistribues: skuNonDistribues, titre: titre, surtitre: surtitre, nomDeCode: nomDeCode, code: code,
    nomDeTravail: nomDeTravail, suivreMarque: suivreMarque };
})();
