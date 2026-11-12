/* ecarts-marche.js — ce que chaque marché a le droit de changer du master.
 *
 * Le Market Expansion System (market-expansion-system, METHODE.md) le dit en
 * une phrase : le master porte la décision, les variantes ne portent que
 * l'écart. Cet écart se déclare au cadrage, avant le premier crayon.
 *
 * Arbitrage du 11 novembre 2026 : il se déclare sur le couple projet × marché,
 * et il porte une LISTE de types — le Ghana en porte deux, marque et langue.
 * Les types sont ceux de la méthode, repris tels quels :
 *
 *   langue         titraille, signature, mentions légales
 *   marque         le produit vendu diffère selon le pays
 *   produit        format, grammage, prix affiché (produit / SKU)
 *   reglementaire  mentions obligatoires, allégations autorisées
 *
 * C'est un autre axe que celui d'ecarts.js. Les origines disent qui doit une
 * reprise ; le type dit ce qui change. Une déclaration n'est due par personne :
 * c'est l'écart autorisé.
 *
 * La déclaration vit sous le périmètre, indexée par marché :
 * `p.perimetre.ecarts[marcheId] = { types, detail, declare_le, acteur, source }`.
 * Aucune migration : un marché absent est « non déclaré », ce qui n'est pas
 * « aucun écart » — celui-là s'écrit `types: []`. Une ancienne déclaration à un
 * seul type (`type: "marque"`) se lit comme une liste d'un élément.
 *
 * Le format d'échange `ecarts-marche` (version 1) est celui de la méthode : un
 * écart par couple projet × marché, le projet par sa référence, le marché par son
 * code. Le Market Expansion System le produit depuis sa matrice de cadrage
 * (`scripts/ecarts.mjs vers-json`) ; La Barre l'importe et l'exporte, dossier par
 * dossier.
 *
 * Décision du 12 novembre 2026 : une adaptation qui change autre chose que ce
 * que son marché a déclaré n'est pas bloquée. Elle passe, signalée « hors écart
 * déclaré » avec la dimension qui sort, et la revue tranche : corriger l'écart
 * déclaré, ou corriger l'adaptation. Les deux sont des décisions de la fabrique
 * (decision.js) :
 *
 *   ecart-marche  la déclaration s'étend à ce que l'adaptation change. C'est une
 *                 déviation du cadrage — l'écart devait être déclaré avant le
 *                 premier crayon —, de portée projet, motif exigé.
 *   hors-ecart    l'adaptation revient à ce que le marché a déclaré. Un retour
 *                 motivé sur le livrable ; le signal reste jusqu'à la correction.
 *
 * Ce qu'une adaptation change se lit contre son point de départ (`l.depart`,
 * posé par KV.creer) : ce qu'elle a reçu du master et du référentiel du marché.
 * Une adaptation créée avant cette capture n'en a pas : elle est « non
 * évaluée », jamais signalée — on ne lui invente pas un départ.
 */

window.ECARTS_MARCHE = (function () {
  var el = O.el;

  var FORMAT = "ecarts-marche";
  var VERSION = 1;
  var SEPARATEUR = "+";
  var AUCUN = "aucun";

  var TYPES = [
    { code: "langue", nom: "Langue", change: "Titraille, signature, mentions légales" },
    { code: "marque", nom: "Marque", change: "Le produit vendu diffère selon le pays" },
    { code: "produit", nom: "Produit / SKU", change: "Format, grammage, prix affiché" },
    { code: "reglementaire", nom: "Réglementaire", change: "Mentions obligatoires, allégations autorisées" },
  ];
  var ORDRE = TYPES.map(function (t) { return t.code; });

  /* Sans casse, sans accent, sans ponctuation : « Produit / SKU » vaut produit,
   * « réglementaire » vaut reglementaire. Ce sont les mêmes règles que la méthode. */
  function cle(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  var PAR_CLE = {};
  TYPES.forEach(function (t) { PAR_CLE[cle(t.code)] = t.code; PAR_CLE[cle(t.nom)] = t.code; });
  /* L'ancienne valeur des gabarits pour le marché du master. Le master est ici
   * commun : il n'appartient à aucun marché, la valeur se lit donc « aucun ». */
  var ANCIENNES = { reference: AUCUN };

  function ordonner(codes) { return ORDRE.filter(function (c) { return codes.indexOf(c) !== -1; }); }

  /* Une valeur de types : liste, ou texte séparé par « + ». types vaut null quand
   * rien n'est déclaré, [] pour « aucun ». */
  function lireTypes(valeur) {
    var r = { types: null, inconnus: [], erreurs: [] };
    if (valeur === null || valeur === undefined) return r;
    var liste = Array.isArray(valeur);
    var jetons = (liste ? valeur.map(String) : String(valeur).split(SEPARATEUR))
      .map(function (j) { return j.trim(); }).filter(function (j) { return j !== ""; });
    if (!jetons.length) { if (liste) r.types = []; return r; }
    var codes = [], aucun = false;
    jetons.forEach(function (j) {
      var k = cle(j);
      if (k === AUCUN || ANCIENNES[k]) { aucun = true; return; }
      var code = PAR_CLE[k];
      if (code) { if (codes.indexOf(code) === -1) codes.push(code); } else r.inconnus.push(j);
    });
    if (aucun && (codes.length || r.inconnus.length)) r.erreurs.push("« " + AUCUN + " » ne se combine pas avec un type");
    r.types = ordonner(codes);
    return r;
  }

  function libelle(types) {
    if (!types || !types.length) return "aucun écart";
    return ordonner(types).map(function (c) { return TYPES[ORDRE.indexOf(c)].nom; }).join(" + ");
  }

  /* ————————————————————— La déclaration d'un couple projet × marché ————————————————————— */

  function table(p) { return (p && p.perimetre && p.perimetre.ecarts) || {}; }

  function declaration(p, marcheId) {
    var brut = table(p)[marcheId];
    if (!brut || typeof brut !== "object") return null;
    var t = lireTypes(brut.types !== undefined ? brut.types : brut.type);
    if (t.types === null) return null;
    return {
      marche: marcheId, types: t.types, inconnus: t.inconnus,
      detail: typeof brut.detail === "string" ? brut.detail : "",
      declare_le: brut.declare_le || null,
      par: typeof brut.par === "string" && brut.par ? brut.par : null,
      acteur: brut.acteur || null,
      source: brut.source || null,
      importe_le: brut.importe_le || null,
    };
  }

  /* Les marchés du projet : ce que le périmètre et les volets promettent, ce
   * que les livrables servent, et ce qui a été déclaré. Aucun ne disparaît. */
  function marches(p) {
    var ids = [];
    function ajouter(id) { if (id && ids.indexOf(id) === -1) ids.push(id); }
    ((p.perimetre || {}).marches || []).forEach(ajouter);
    (p.volets || []).forEach(function (v) { (v.marches || []).forEach(ajouter); });
    (p.livrables || []).forEach(function (l) { if (!l.annule) ajouter(l.marche); });
    Object.keys(table(p)).forEach(ajouter);
    return ids.map(function (id) {
      var m = DEPOT.trouve("marches", id) || { id: id, code: id, nom: "absent du référentiel" };
      return { marche: m, declaration: declaration(p, id) };
    });
  }

  function poser(p, marcheId, entree) {
    if (!p.perimetre) p.perimetre = { supports: [], marches: [] };
    if (!p.perimetre.ecarts) p.perimetre.ecarts = {};
    p.perimetre.ecarts[marcheId] = entree;
  }

  function acteur() { return window.ACTEUR ? ACTEUR.trace() : null; }

  function declarer(p, marcheId, types, detail) {
    var m = DEPOT.trouve("marches", marcheId);
    if (!m) return { ok: false, erreur: "Ce marché n'est pas au référentiel." };
    var t = lireTypes(Array.isArray(types) ? types : []);
    if (t.inconnus.length) return { ok: false, erreur: "Type d'écart inconnu : " + t.inconnus.join(", ") + "." };
    if (t.erreurs.length) return { ok: false, erreur: t.erreurs.join(" ; ") };
    poser(p, marcheId, { types: t.types, detail: String(detail || "").trim(),
      declare_le: new Date().toISOString(), acteur: acteur(), source: "saisie" });
    DEPOT.tracer("écart de marché déclaré", "projets", p.id, m.code + " : " + libelle(t.types));
    DEPOT.enregistrer();
    return { ok: true, declaration: declaration(p, marcheId) };
  }

  function retirer(p, marcheId) {
    if (!declaration(p, marcheId)) return { ok: false, erreur: "Ce marché n'a pas de déclaration." };
    delete p.perimetre.ecarts[marcheId];
    var m = DEPOT.trouve("marches", marcheId);
    DEPOT.tracer("déclaration d'écart retirée", "projets", p.id, m ? m.code : marcheId);
    DEPOT.enregistrer();
    return { ok: true };
  }

  /* ————————————————————— Le format d'échange ————————————————————— */

  function exporter(p) {
    var ecarts = [];
    marches(p).forEach(function (x) {
      var d = x.declaration;
      if (!d) return;
      ecarts.push({ projet: p.ref || p.id, marche: x.marche.code, types: d.types.slice(), detail: d.detail,
        declare_le: d.declare_le, par: d.par || (d.acteur && d.acteur.nom) || null });
    });
    return { format: FORMAT, version: VERSION, types: ORDRE.slice(), ecarts: ecarts };
  }

  /* Relit un fichier d'échange avec les règles de la méthode. Une ligne fautive
   * est nommée ; `fatal` dit que le fichier lui-même ne se lit pas. */
  function lire(objet) {
    var r = { ecarts: [], erreurs: [], avertissements: [], fatal: true };
    if (!objet || typeof objet !== "object" || Array.isArray(objet)) { r.erreurs.push("Le fichier n'est pas un objet JSON."); return r; }
    if (objet.format !== FORMAT) { r.erreurs.push("Format « " + objet.format + " » : attendu « " + FORMAT + " »."); return r; }
    if (objet.version !== VERSION) { r.erreurs.push("Version " + objet.version + " : seule la version " + VERSION + " se lit."); return r; }
    if (!Array.isArray(objet.ecarts)) { r.erreurs.push("La liste ecarts manque."); return r; }
    r.fatal = false;
    if (Array.isArray(objet.types)) {
      var etrangers = objet.types.filter(function (x) { return ORDRE.indexOf(x) === -1; });
      if (etrangers.length) r.avertissements.push("Vocabulaire différent : " + etrangers.join(", ") + " inconnus ici.");
    }
    var vus = {};
    objet.ecarts.forEach(function (x, i) {
      if (!x || typeof x !== "object") { r.erreurs.push("Écart " + (i + 1) + " : pas un objet."); return; }
      var projet = String(x.projet || "").trim(), marche = String(x.marche || "").trim().toUpperCase();
      var nom = (projet || "?") + " × " + (marche || "?");
      if (!projet || !marche) { r.erreurs.push(nom + " : projet et marché sont obligatoires."); return; }
      var t = lireTypes(x.types !== undefined ? x.types : x.type);
      if (t.types === null) { r.erreurs.push(nom + " : types absents."); return; }
      if (t.inconnus.length) { r.erreurs.push(nom + " : type inconnu " + t.inconnus.join(", ") + "."); return; }
      if (t.erreurs.length) { r.erreurs.push(nom + " : " + t.erreurs.join(" ; ") + "."); return; }
      if (vus[projet + "|" + marche]) { r.erreurs.push(nom + " : déclaré deux fois."); return; }
      vus[projet + "|" + marche] = true;
      r.ecarts.push({ projet: projet, marche: marche, types: t.types,
        detail: typeof x.detail === "string" ? x.detail.trim() : "",
        declare_le: x.declare_le ? String(x.declare_le) : null, par: x.par ? String(x.par) : null });
    });
    return r;
  }

  /* Le projet se reconnaît à sa référence, à son identifiant, ou au brief du
   * registre Radar qui lui est rattaché : c'est le code de la méthode (ndeg). */
  function codesDuProjet(p) {
    var codes = [p.ref, p.id];
    DEPOT.liste("radar").forEach(function (r) { if (r && r.projetId === p.id && r.ndeg) codes.push(r.ndeg); });
    return codes.filter(Boolean);
  }

  /* Pose les lignes de ce dossier. Les lignes d'autres projets sont ignorées ;
   * une seule ligne fautive refuse l'import entier : rien n'est écrit. */
  function importer(objet, p) {
    var lu = lire(objet);
    var r = { poses: [], remplaces: [], ignores: [], erreurs: lu.erreurs.slice(), avertissements: lu.avertissements.slice() };
    if (lu.fatal) return r;
    var codes = codesDuProjet(p), promis = (p.perimetre || {}).marches || [];
    var aPoser = [];
    lu.ecarts.forEach(function (x) {
      if (codes.indexOf(x.projet) === -1) { r.ignores.push(x.projet + " × " + x.marche); return; }
      var m = DEPOT.liste("marches").filter(function (y) { return String(y.code || "").toUpperCase() === x.marche; })[0];
      if (!m) { r.erreurs.push(x.projet + " × " + x.marche + " : marché inconnu du référentiel."); return; }
      if (promis.indexOf(m.id) === -1) r.avertissements.push(x.marche + " est hors du périmètre du dossier : la déclaration est gardée, le périmètre ne change pas.");
      aPoser.push({ x: x, m: m });
    });
    if (!r.erreurs.length && !aPoser.length) {
      r.erreurs.push("Aucune ligne pour ce dossier (" + codes.join(", ") + ").");
    }
    if (r.erreurs.length) return r;
    var quand = new Date().toISOString(), qui = acteur();
    aPoser.forEach(function (a) {
      if (declaration(p, a.m.id)) r.remplaces.push(a.m.code);
      poser(p, a.m.id, { types: a.x.types, detail: a.x.detail, declare_le: a.x.declare_le, par: a.x.par,
        acteur: qui, source: "import", importe_le: quand });
      r.poses.push(a.m.code);
    });
    DEPOT.tracer("écarts de marché importés", "projets", p.id, r.poses.join(", "));
    DEPOT.enregistrer();
    return r;
  }

  /* ————————————————————— Ce qu'une adaptation change ————————————————————— */

  /* Les champs du KV que chaque type couvre. L'accroche est la titraille : elle
   * relève de la langue, comme la méthode le dit (« titraille, signature,
   * mentions légales »). Les choix de direction artistique n'ont pas de type :
   * ils distinguent les KV par construction. */
  var CHAMPS = { langue: ["langue", "copy"], marque: ["marque"], produit: ["sku"],
    reglementaire: ["mentions", "restrictions"] };
  var NOMS_CHAMPS = { langue: "langue", copy: "accroche", marque: "marque", sku: "SKU montrés",
    mentions: "mentions", restrictions: "restrictions" };

  /* Une liste se compare sans son ordre ; un code de langue, sans sa casse. */
  function forme(champ, v) {
    if (Array.isArray(v)) return v.map(function (x) { return String(x).trim(); }).filter(Boolean).sort().join("\n");
    var t = v === undefined || v === null ? "" : String(v).trim();
    return champ === "langue" ? t.toLowerCase() : t;
  }

  /* Ce qui a changé depuis le point de départ, par type. null : rien ne dit
   * d'où l'adaptation est partie. Un champ que le départ laissait vide se
   * complète sans s'écarter du master : le master n'en avait rien décidé. */
  function changements(l) {
    var d = l && l.depart;
    if (!d || !d.kv || typeof d.kv !== "object") return null;
    var k = l.kv || {}, types = [], champs = [];
    ORDRE.forEach(function (type) {
      CHAMPS[type].forEach(function (c) {
        var avant = forme(c, d.kv[c]);
        if (avant === "" || forme(c, k[c]) === avant) return;
        champs.push(c);
        if (types.indexOf(type) === -1) types.push(type);
      });
    });
    return { types: types, champs: champs };
  }

  function estAdaptation(l) {
    return !!l && !l.annule && (window.KV ? KV.estAdaptation(l) : l.niveau === "adaptation");
  }

  /* Le retour déjà décidé sur ce qui sort aujourd'hui. Un retour ne couvre que
   * ce qu'il a tranché : une dimension de plus demande une nouvelle revue. */
  function renvoi(p, l, hors) {
    var r = null;
    DEPOT.liste("decisions").forEach(function (d) {
      if (!d || d.type !== "hors-ecart" || d.projet !== p.id || d.objet !== l.id) return;
      var types = Array.isArray(d.types) ? d.types : [];
      if (!hors.every(function (t) { return types.indexOf(t) !== -1; })) return;
      if (!r || String(d.quand || "") >= String(r.quand || "")) r = d;
    });
    return r;
  }

  /* L'adaptation face à la déclaration de son marché :
   *
   *   sans-objet     ce n'est pas une adaptation (master, format, livrable annulé)
   *   non-evaluee    elle n'a pas de point de départ
   *   dans-l-ecart   tout ce qu'elle change est déclaré — ou elle ne change rien
   *   hors-ecart     elle change une dimension que le marché n'a pas déclarée ;
   *                  un marché non déclaré n'en a déclaré aucune
   *
   * Signaler n'est pas bloquer : rien ici n'entre dans la conformité, les
   * blocages ou la porte de production. */
  function evaluer(p, l) {
    var r = { livrable: l ? l.id : null, marche: l ? l.marche || null : null, etat: "sans-objet",
      change: [], hors: [], champs: [], declaration: null, revue: null };
    if (!estAdaptation(l)) return r;
    r.declaration = declaration(p, l.marche);
    var c = changements(l);
    if (!c) { r.etat = "non-evaluee"; return r; }
    r.change = c.types; r.champs = c.champs;
    var permis = r.declaration ? r.declaration.types : [];
    r.hors = c.types.filter(function (t) { return permis.indexOf(t) === -1; });
    r.etat = r.hors.length ? "hors-ecart" : "dans-l-ecart";
    if (r.hors.length) r.revue = renvoi(p, l, r.hors);
    return r;
  }

  function adaptations(p) { return (p.livrables || []).filter(estAdaptation); }

  /* Les adaptations du dossier signalées hors écart déclaré. */
  function signales(p) {
    return adaptations(p).map(function (l) { return evaluer(p, l); })
      .filter(function (x) { return x.etat === "hors-ecart"; });
  }

  /* Ce que la file de décision doit montrer : chaque adaptation signalée d'un
   * dossier ouvert. Tranchée par un retour, elle est due par son auteur ; sinon
   * elle attend la revue. Un dossier clos ne réclame plus rien. */
  function aTrancher() {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      if (window.CLOTURE && CLOTURE.est(p)) return;
      signales(p).forEach(function (x) {
        var l = (p.livrables || []).filter(function (y) { return y.id === x.livrable; })[0];
        var m = DEPOT.trouve("marches", x.marche);
        out.push({ projet: p.id, ref: p.ref || p.id, nomProjet: p.nom, livrable: x.livrable,
          nom: l ? l.nom : x.livrable, marche: m ? m.code : x.marche, hors: x.hors.slice(),
          declaration: x.declaration ? x.declaration.types.slice() : null,
          etat: x.revue ? "renvoyee" : "a-trancher", revue: x.revue,
          ouvrir: function (apres) { revoir(p, l, apres); } });
      });
    });
    return out;
  }

  /* Une ligne courte, pour une carte : le signal, et s'il est déjà tranché. */
  function etiquette(p, l) {
    var x = evaluer(p, l);
    if (x.etat !== "hors-ecart") return null;
    return { texte: "Hors écart déclaré · " + libelle(x.hors), revue: x.revue,
      suite: x.revue ? "retour décidé" : "à revoir" };
  }

  /* ————————————————————— La revue tranche ————————————————————— */

  function refusDe(e) {
    if (window.DECISION && DECISION.estRefus(e)) return { ok: false, erreur: e.message };
    throw e;
  }

  function pasHors(x) {
    return x.etat === "non-evaluee"
      ? "Cette adaptation n'a pas de point de départ : ce qu'elle change n'est pas évalué."
      : "Cette adaptation ne sort pas de l'écart déclaré de son marché.";
  }

  /* Corriger l'écart déclaré : la déclaration s'étend à ce que l'adaptation
   * change. La décision se vérifie avant que la déclaration ne change ; sans
   * motif, rien n'est écrit. */
  function corrigerDeclaration(p, l, motif) {
    var x = evaluer(p, l);
    if (x.etat !== "hors-ecart") return { ok: false, erreur: pasHors(x) };
    var m = DEPOT.trouve("marches", l.marche);
    if (!m) return { ok: false, erreur: "Ce marché n'est pas au référentiel." };
    var avant = x.declaration ? x.declaration.types.slice() : null;
    var apres = ordonner((avant || []).concat(x.hors));
    var d;
    try {
      d = DECISION.construire({ objet: m.id, type: "ecart-marche", projet: p.id, verdict: "approuve", portee: "projet",
        motif: typeof motif === "string" ? motif.trim() : "", quand: new Date().toISOString(),
        qui: MAISON.titulaire, acteur: DECISION.acteur(),
        titre: m.code + " : écart déclaré étendu à " + libelle(x.hors), livrable: l.id,
        ecart: { de: "ecart-marche", ref: m.id, avant: avant, apres: apres } });
    } catch (e) { return refusDe(e); }
    poser(p, m.id, { types: apres, detail: x.declaration ? x.declaration.detail : "",
      declare_le: d.quand, acteur: d.acteur, source: "revue", decision: d.id });
    DECISION.ajouter(d);
    DEPOT.tracer("écart de marché corrigé en revue", "projets", p.id, m.code + " : " + libelle(apres));
    DEPOT.enregistrer();
    return { ok: true, decision: d, declaration: declaration(p, m.id) };
  }

  /* Corriger l'adaptation : elle revient à ce que son marché a déclaré. La
   * décision est un retour motivé ; la déclaration ne bouge pas, et le signal
   * reste jusqu'à ce que l'adaptation soit corrigée. */
  function corrigerAdaptation(p, l, motif) {
    var x = evaluer(p, l);
    if (x.etat !== "hors-ecart") return { ok: false, erreur: pasHors(x) };
    var d;
    try {
      d = DECISION.poser({ objet: l.id, type: "hors-ecart", projet: p.id, verdict: "retour",
        motif: typeof motif === "string" ? motif.trim() : "", quand: new Date().toISOString(),
        qui: MAISON.titulaire, acteur: DECISION.acteur(),
        titre: (l.nom || "Adaptation") + " : hors écart déclaré (" + libelle(x.hors) + ")",
        marche: l.marche, types: x.hors.slice() });
    } catch (e) { return refusDe(e); }
    DEPOT.tracer("adaptation renvoyée hors écart déclaré", "livrables", p.id, (l.nom || l.id) + " : " + libelle(x.hors));
    DEPOT.enregistrer();
    return { ok: true, decision: d };
  }

  function champsDe(x, type) {
    return x.champs.filter(function (c) { return CHAMPS[type].indexOf(c) !== -1; })
      .map(function (c) { return NOMS_CHAMPS[c] || c; });
  }

  /* La ligne d'un panneau, dans la forme de PANNEAU.ligne. */
  function ligne(etiq, valeur) {
    return el("div.ligne", {}, el("span.etiq", {}, etiq), el("span.val", {}, valeur || "non renseigné"));
  }

  /* Le panneau de revue : ce que le marché a déclaré, ce que l'adaptation
   * change, ce qui sort, et les deux gestes. Le motif est exigé par la fabrique. */
  function revoir(p, l, apres) {
    var x = evaluer(p, l);
    var m = DEPOT.trouve("marches", l && l.marche) || { code: (l && l.marche) || "?", nom: "absent du référentiel" };
    if (x.etat !== "hors-ecart") { AVIS.refus(pasHors(x)); return; }
    var zone = el("textarea", { id: "ecm-motif", rows: 3 });
    function geste(faire, fait) {
      return function () {
        var r = faire(p, l, zone.value);
        if (!r.ok) { AVIS.refus(r.erreur); return; }
        PANNEAU.fermer();
        AVIS.fait(fait);
        if (apres) apres();
      };
    }
    PANNEAU.ouvrir("Hors écart déclaré", (l.nom || "Adaptation") + " · " + m.nom, el("div", {},
      el("p.meta", {}, "Cette adaptation change ce que " + m.code + " n'a pas déclaré. Elle n'est pas bloquée : "
        + "la revue tranche. Corriger l'écart déclaré l'étend à ce que l'adaptation change ; corriger l'adaptation "
        + "la renvoie à ce que le marché a déclaré."),
      el("div.form", {},
        ligne("Déclaré pour " + m.code, x.declaration
          ? libelle(x.declaration.types) + (x.declaration.detail ? " — " + x.declaration.detail : "")
          : "non déclaré"),
        ligne("L'adaptation change", x.change.map(function (t) {
          return libelle([t]) + " (" + champsDe(x, t).join(", ") + ")"; }).join(" · ")),
        ligne("Hors écart déclaré", libelle(x.hors)),
        x.revue ? ligne("Retour décidé", O.joli(x.revue.quand) + " — " + x.revue.motif) : null,
        el("div.champ", {}, el("label", { "for": "ecm-motif" }, "Pourquoi"), zone)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: geste(corrigerDeclaration,
          m.code + " : écart déclaré étendu à " + libelle(x.hors) + ".") }, "Corriger l'écart déclaré"),
        el("button.b", { type: "button", onclick: geste(corrigerAdaptation,
          (l.nom || "L'adaptation") + " renvoyée : elle revient à l'écart déclaré.") }, "Corriger l'adaptation"),
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); } }, "Annuler"))));
  }

  /* ————————————————————— À l'écran ————————————————————— */

  function telecharger(p) {
    var texte = JSON.stringify(exporter(p), null, 2);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texte], { type: "application/json" }));
    a.download = "ecarts-marche_" + (p.ref || p.id) + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function choisirFichier(p, apres) {
    var entree = el("input", { type: "file", accept: "application/json,.json", onchange: function () {
      var f = entree.files && entree.files[0];
      if (!f) return;
      f.text().then(function (texte) {
        var objet;
        try { objet = JSON.parse(texte); } catch (e) { AVIS.refus("Ce fichier n'est pas du JSON."); return; }
        var r = importer(objet, p);
        if (r.erreurs.length) { AVIS.refus("Import refusé, rien n'est écrit. " + r.erreurs.join(" ")); return; }
        AVIS.fait(r.poses.length + (r.poses.length > 1 ? " marchés déclarés" : " marché déclaré")
          + (r.remplaces.length ? ", dont " + r.remplaces.join(", ") + (r.remplaces.length > 1 ? " remplacés" : " remplacé") : "")
          + (r.ignores.length ? " ; " + r.ignores.length + " lignes d'autres projets ignorées" : "")
          + (r.avertissements.length ? ". " + r.avertissements.join(" ") : "."));
        if (apres) apres();
      });
    } });
    entree.click();
  }

  function dialogue(p, m, apres) {
    var d = declaration(p, m.id);
    var cases = TYPES.map(function (t) {
      return el("input", { type: "checkbox", id: "ecm-" + t.code, value: t.code,
        checked: !!(d && d.types.indexOf(t.code) !== -1) });
    });
    var zone = el("textarea", { id: "ecm-detail", rows: 2 }, d ? d.detail : "");
    PANNEAU.ouvrir("L'écart de " + m.code, m.nom, el("div", {},
      el("p.meta", {}, "Ce que ce marché a le droit de changer du master, pour ce projet. Aucune case cochée : "
        + "le marché est déclaré sans écart. Tout autre écart se refuse, ou il se facture."),
      el("div.form", {},
        TYPES.map(function (t, i) {
          return el("label", { "for": "ecm-" + t.code }, cases[i], " ", el("b", {}, t.nom), " — " + t.change);
        }),
        el("div.champ", {}, el("label", { "for": "ecm-detail" }, "Ce qui change, et pourquoi"), zone)),
      d && d.inconnus.length ? el("p.meta", {}, "Types inconnus dans la déclaration enregistrée : " + d.inconnus.join(", ")
        + ". Déclarer à nouveau les retire.") : null,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var types = cases.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
          var r = declarer(p, m.id, types, zone.value);
          if (!r.ok) { AVIS.refus(r.erreur); return; }
          PANNEAU.fermer();
          AVIS.fait(m.code + " : " + libelle(r.declaration.types) + ".");
          if (apres) apres();
        } }, "Déclarer"),
        d ? el("button.b.nu", { type: "button", onclick: function () {
          retirer(p, m.id);
          PANNEAU.fermer();
          if (apres) apres();
        } }, "Retirer la déclaration") : null,
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); } }, "Annuler"))));
  }

  /* Le bloc de la grille : un marché par ligne, sa déclaration, le geste, et
   * ce que ses adaptations en font. Une adaptation hors écart déclaré se revoit
   * d'ici ; une adaptation non évaluée se compte, sans signal. */
  function bloc(p, rafraichir) {
    var lignes = marches(p);
    var declares = lignes.filter(function (x) { return x.declaration; }).length;
    var evals = adaptations(p).map(function (l) { return { l: l, x: evaluer(p, l) }; });
    var hors = evals.filter(function (e) { return e.x.etat === "hors-ecart"; }).length;
    var nonEvaluees = evals.filter(function (e) { return e.x.etat === "non-evaluee"; }).length;
    function adaptationsDe(marcheId) {
      return evals.filter(function (e) { return e.l.marche === marcheId; }).map(function (e) {
        var nom = e.l.nom || "adaptation";
        if (e.x.etat !== "hors-ecart") {
          return el("span.ecm-ad", {}, nom + " : " + (e.x.etat === "non-evaluee" ? "non évaluée" : "dans l'écart"));
        }
        return el("button.b.nu.ecm-signal", { type: "button", title: "Revoir l'écart de " + nom,
          onclick: function () { revoir(p, e.l, rafraichir); } },
          nom + " : hors écart déclaré : " + libelle(e.x.hors) + (e.x.revue ? " · retour décidé" : " · à revoir"));
      });
    }
    return el("div.volet", {},
      el("div.volet-tete", {},
        el("b", {}, "Écarts déclarés par marché"),
        el("span.age", {}, declares + " sur " + lignes.length + " marchés déclarés"),
        hors ? el("span.ecm-compte", {}, hors + (hors > 1 ? " adaptations hors écart déclaré" : " adaptation hors écart déclaré")) : null,
        nonEvaluees ? el("span.age", {}, nonEvaluees + (nonEvaluees > 1 ? " adaptations non évaluées" : " adaptation non évaluée")) : null,
        el("button.b.nu", { type: "button", onclick: function () { telecharger(p); } }, "Exporter"),
        el("button.b.nu", { type: "button", onclick: function () { choisirFichier(p, rafraichir); } }, "Importer")),
      el("p.meta", { style: { padding: "0 .8rem .4rem" } },
        "Ce que chaque marché a le droit de changer du master, pour ce projet : langue, marque, produit / SKU, "
        + "réglementaire. Un marché peut en porter plusieurs. « Non déclaré » n'est pas « aucun écart ». "
        + "Une adaptation qui change autre chose passe, signalée « hors écart déclaré » : la revue tranche. "
        + "L'import et l'export suivent le format ecarts-marche du Market Expansion System."),
      lignes.length
        ? el("div", { style: { overflow: "auto" } }, el("table.matrice", {}, el("tbody", {}, lignes.map(function (x) {
            var d = x.declaration;
            return el("tr", {},
              el("td.entete-ligne", {}, x.marche.code + " · " + x.marche.nom),
              el("td", {}, d ? libelle(d.types) + (d.inconnus.length ? " · inconnus : " + d.inconnus.join(", ") : "") : "non déclaré"),
              el("td", {}, d ? d.detail : ""),
              el("td.ecm-adaptations", {}, adaptationsDe(x.marche.id)),
              el("td", {}, el("button.b.nu", { type: "button", "aria-label": "Déclarer l’écart de " + x.marche.code,
                onclick: function () { dialogue(p, x.marche, rafraichir); } }, d ? "modifier" : "déclarer")));
          }))))
        : el("p.rien", { style: { padding: ".6rem .8rem" } }, "Aucun marché : le périmètre n'en promet encore aucun."));
  }

  return { FORMAT: FORMAT, VERSION: VERSION, TYPES: TYPES, lireTypes: lireTypes, libelle: libelle,
    declaration: declaration, marches: marches, declarer: declarer, retirer: retirer,
    exporter: exporter, lire: lire, importer: importer, bloc: bloc, dialogue: dialogue,
    CHAMPS: CHAMPS, changements: changements, evaluer: evaluer, signales: signales, aTrancher: aTrancher,
    etiquette: etiquette, corrigerDeclaration: corrigerDeclaration, corrigerAdaptation: corrigerAdaptation,
    revoir: revoir };
})();
