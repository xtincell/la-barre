/* presentation-modele.js — le dossier de présentation, engendré.
 *
 * C'est le document 9 de la chaîne : celui qui porte la décision du client.
 * On ne le saisit pas — on choisit ce qu'il montre, et il se compose depuis le
 * projet. Le montage peut reformater, raccourcir, mettre en récit ; il n'altère
 * jamais la source.
 *
 * Une planche de déclinaisons, un mockup, une piste : ce sont des pages. Pas
 * des objectifs.
 */

window.PRESENTATION = (function () {

  /* Les types de page, et ce que chacun tire du projet. */
  var TYPES = {
    titre: { nom: "Ouverture", tire: "le nom de campagne et le client" },
    etape: { nom: "Intercalaire", tire: "l'étage qui commence : cadrage, conception, pistes, suite" },
    plateforme: { nom: "La plateforme de marque", tire: "l'idée directrice, la promesse et le rituel de la marque, ou de la gamme que sert la campagne" },
    kv: { nom: "Le KV d'une piste", tire: "la dernière maquette du KV, et ses accroches" },
    merci: { nom: "Merci", tire: "la page de fin, au nom de l'agence" },
    couverture: { nom: "Le brief, piste par piste", tire: "chaque action demandée au brief, et comment chaque piste y répond" },
    spot: { nom: "Le spot d'une piste", tire: "le storyboard, l'animatique, le son et la portée du spot" },
    probleme: { nom: "Le problème", tire: "le brief — problème, cible, tension" },
    strategie: { nom: "La stratégie", tire: "le territoire et l'insight" },
    idee: { nom: "L'idée", tire: "la big idea, sa mécanique, sa signature" },
    piste: { nom: "Une piste", tire: "une piste créative et son visuel" },
    planche: { nom: "Planche de déclinaisons", tire: "les livrables d'une piste, en grille" },
    mockup: { nom: "Mise en situation", tire: "les mockups d'une piste" },
    dispositif: { nom: "Le dispositif", tire: "les activités d'une piste et leurs dates" },
    livrables: { nom: "Ce que nous livrons", tire: "la liste des livrables et leurs formats" },
    calendrier: { nom: "Le calendrier", tire: "les jalons et les dates de publication" },
    suite: { nom: "La suite", tire: "ce qui est validé aujourd'hui, et ce qui vient après" },

    /* Les pages qu'appellent les cinq autres structures. Elles ne servent pas
     * toutes dans le même deck — c'est le squelette de la structure choisie qui
     * décide, et un deck qui mélange deux squelettes se voit. */
    contexte: { nom: "Contexte marché", tire: "le brief — le chiffre qui pose le problème" },
    verite: { nom: "La vérité inconfortable", tire: "l'insight, sa preuve, et le coût du statu quo" },
    transformation: { nom: "De … à …", tire: "le comportement de départ et celui que la campagne vise" },
    pourquoi: { nom: "Pourquoi ça marche", tire: "l'insight, pris à rebours — quatre arguments, pas plus" },
    faisabilite: { nom: "Faisabilité et budget", tire: "les estimés des livrables et les implications de production" },
    criteres: { nom: "Critères de lecture des pistes", tire: "la grille de comparaison de la reco" },
    comparatif: { nom: "Tableau comparatif", tire: "les pistes notées sur les quatre critères" },
    arbitrage: { nom: "Recommandation de l'agence", tire: "la piste défendue, ses trois raisons, et ce qui casse si on recompose" },
    diagnostic: { nom: "Diagnostic chiffré", tire: "les chiffres du dossier, avec leur source et leur niveau de preuve" },
    barrieres: { nom: "Les trois barrières", tire: "ce qui empêche, et sur quoi la communication peut agir" },
    phases: { nom: "Plan d'activation", tire: "les phases du dispositif et leur indicateur de sortie" },
    mesure: { nom: "Mesure et indicateurs", tire: "les critères de succès du brief et leur source" },
    reduction: { nom: "Le chemin de réduction", tire: "les trois versions du problème, du long au court" },
    convention: { nom: "La convention de catégorie", tire: "l'énoncé et ses trois visuels de concurrents" },
    manifeste: { nom: "Le texte de manifesto", tire: "la plateforme de marque — ce en quoi la marque croit" },
    principe: { nom: "Le principe créatif", tire: "la règle de conduite que le manifesto impose" },
    abandons: { nom: "Ce qu'on ne fera plus jamais", tire: "ce que la plateforme de marque ne fera pas" },
    signes: { nom: "Les premiers signes visibles", tire: "ce qui change dans les trois mois, concrètement" },
    credits: { nom: "Les crédits", tire: "fonction exercée, nom orthographié, validation écrite" },

    /* Les trois documents compilés. Ce ne sont pas des pages de deck : ce sont
     * les documents de la maison, rendus tels quels dans le dossier. Ils se
     * recomposent à chaque ouverture — une présentation ne fige pas un cadrage,
     * elle le cite dans son état du jour. */
    cadrage: { nom: "Document de cadrage", tire: "identité, brief, brief-back, plateforme de marque, insight et territoire" },
    conception: { nom: "Document de conception", tire: "la séance, l'idée, les pistes et leur arbitrage, le dispositif" },
    production: { nom: "Document de production", tire: "le parc, ce qui est tracé, ce qui manque, les crédits" },
  };

  /* ————————————————————— Engendrer ————————————————————— */

  /* Ce que le client reçoit à minima : l'idée et deux ou trois KV. Le reste ne
   * se montre que sur un pitch ambitieux — et ne se produit qu'après validation.
   * Mettre les déclinaisons dans une présentation spéculative, c'est promettre
   * du travail qu'on n'a pas vendu. */
  var NIVEAUX = {
    minimum: { nom: "Minimum client", quoi: "le problème, la stratégie, l'idée, les pistes et leurs KV" },
    ambitieux: { nom: "Pitch ambitieux", quoi: "en plus : dispositif, planches de déclinaisons, mises en situation, calendrier" },
  };

  /* La structure décide du squelette ; le niveau décide de sa longueur.
   *
   * Le produit ne connaissait qu'une structure — la linéaire — en deux
   * longueurs. Or « la structure d'une reco n'est pas un habillage : elle
   * décide de l'ordre dans lequel le client rencontre l'idée, donc de la façon
   * dont il la juge ». Le squelette vient donc de RECO, et le niveau ne règle
   * plus que ce qu'on ajoute : dispositif, planches, mises en situation,
   * calendrier — tout ce qu'on ne produit qu'après validation.
   *
   * Une page dont la source est vide ne s'invente pas : elle est écartée ici,
   * et l'écran dira ce qui lui manque. */
  function creer(p, structure, niveau) {
    /* Ancienne signature : creer(p, niveau). Un appel à deux arguments dont le
     * second est un niveau ne doit pas devenir un appel à une structure. */
    if (structure === "minimum" || structure === "ambitieux") { niveau = structure; structure = null; }
    niveau = niveau || "minimum";
    var ambitieux = niveau === "ambitieux";
    var b = p.sections.bigidea || {};
    var brief = p.sections.brief || {};
    var strat = p.sections.strategie || {};

    var st = (window.RECO && structure) ? RECO.structure(structure) : null;
    if (st) return creerDepuis(p, st, niveau);

    /* Le parcours par défaut suit les étages du dossier : ce qu'on nous a
     * demandé, ce qu'on en a compris, ce qu'on propose, les pistes une à une
     * avec leur KV et leur spot, puis la recommandation et la suite. Chaque
     * étage s'ouvre sur un intercalaire : le client sait toujours où il est. */
    var pages = [{ type: "titre" }];
    var pistesVives = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
    var retenue = pistesVives.filter(function (x) { return x.statut === "retenue"; })[0];
    var pistes = retenue ? [retenue] : pistesVives;

    var cadrage = [];
    if (brief.probleme || brief.objectif_business) cadrage.push({ type: "probleme" });
    if (INSIGHT.liste(p).length || strat.territoire) cadrage.push({ type: "strategie" });
    if (plateforme(p)) cadrage.push({ type: "plateforme" });
    if (cadrage.length) pages.push({ type: "etape", etape: "cadrage" });
    pages = pages.concat(cadrage);

    if (b.idee) pages.push({ type: "etape", etape: "conception" }, { type: "idee" });

    if (pistes.length) pages.push({ type: "etape", etape: "pistes" });
    pistes.forEach(function (pi) {
      pages.push({ type: "piste", pisteId: pi.id });
      /* La page de la piste porte l'idée ; le KV a sa propre page, en grand. */
      pagesKV(pi).forEach(function (x) { pages.push(x); });
      if (spotDe(pi)) pages.push({ type: "spot", pisteId: pi.id });
      /* Les KV produits en livrables : c'est le minimum montrable. */
      var kvs = (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id && KV.estKV(l); });
      if (kvs.length) pages.push({ type: "planche", pisteId: pi.id, seulementKV: !ambitieux });
      /* Le dispositif se montre dès le minimum : le brief demande un plan
       * d'exécution, et une piste sans ses actions n'est qu'une image. */
      if ((pi.dispositif || []).length) pages.push({ type: "dispositif", pisteId: pi.id });
      if (!ambitieux) return;
      var mk = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id && !l.annule; })
        .reduce(function (n, l) { return n + (l.mockups || []).length; }, 0);
      if (mk) pages.push({ type: "mockup", pisteId: pi.id });
    });

    pages.push({ type: "etape", etape: "suite" });
    if (!retenue && pistesVives.length > 1) pages.push({ type: "comparatif" });
    if (actionsDemandees(p).length && pistes.some(function (x) { return (x.dispositif || []).length; }))
      pages.push({ type: "couverture" });
    if (!retenue && pistesVives.length > 1 && window.RECO && RECO.arbitrage(p).piste) pages.push({ type: "arbitrage" });
    if (ambitieux && (p.livrables || []).length) pages.push({ type: "livrables" });
    if (ambitieux && (p.livrables || []).some(function (l) { return l.publication || l.remise; }))
      pages.push({ type: "calendrier" });
    /* Pas de crédits ni de noms dans ce qui part chez le client : le document
     * est émis par l'agence, en équipe. Les crédits restent aux documents
     * internes et se posent avant toute diffusion publique. */
    pages.push({ type: "suite" }, { type: "merci" });

    return {
      id: O.id("PRES"), cree_le: new Date().toISOString(), statut: "brouillon",
      structure: null, niveau: niveau, pages: pages, seance: null, retours: [],
    };
  }

  /* Le squelette d'une structure, déplié sur le dossier. Les pages par piste se
   * multiplient ; les autres se posent une fois. */
  function creerDepuis(p, st, niveau) {
    var ambitieux = niveau === "ambitieux";
    var pages = [];
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    /* En routes parallèles on montre TOUTES les pistes vives : c'est la
     * structure qui a pour objet de les mettre côte à côte. Ailleurs, la
     * retenue suffit dès qu'elle existe. */
    var vives = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
    var pistes = st.cle === "routes" ? vives : (retenue ? [retenue] : vives);

    st.squelette.forEach(function (t) {
      if (t === "piste") {
        pistes.forEach(function (pi) {
          pages.push({ type: "piste", pisteId: pi.id });
          pagesKV(pi).forEach(function (x) { pages.push(x); });
          if (spotDe(pi)) pages.push({ type: "spot", pisteId: pi.id });
          var kvs = (p.livrables || []).filter(function (l) {
            return !l.annule && l.pisteId === pi.id && KV.estKV(l); });
          if (kvs.length) pages.push({ type: "planche", pisteId: pi.id, seulementKV: !ambitieux });
          if (!ambitieux) return;
          if ((pi.dispositif || []).length) pages.push({ type: "dispositif", pisteId: pi.id });
          var mk = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id && !l.annule; })
            .reduce(function (n, l) { return n + (l.mockups || []).length; }, 0);
          if (mk) pages.push({ type: "mockup", pisteId: pi.id });
        });
        return;
      }
      /* Les pages ambitieuses ne s'ajoutent pas à un minimum : mettre des
       * déclinaisons dans une présentation spéculative, c'est promettre du
       * travail qu'on n'a pas vendu. */
      if (!ambitieux && (t === "planche" || t === "mockup" || t === "dispositif"
        || t === "calendrier" || t === "livrables")) return;
      pages.push({ type: t });
    });

    if (ambitieux && st.squelette.indexOf("livrables") === -1 && (p.livrables || []).length) {
      pages.push({ type: "livrables" });
    }

    return {
      id: O.id("PRES"), cree_le: new Date().toISOString(), statut: "brouillon",
      structure: st.cle, niveau: niveau, pages: pages, seance: null, retours: [],
    };
  }

  /* Ce qui identifie une page d'un montage à l'autre : son type, et ce qu'elle
   * vise. C'est par cette clé qu'on retient ce que le titulaire a retiré ou
   * déplacé, pendant que le reste se recompose depuis le dossier. */
  function cle(pg) {
    return pg.type + (pg.pisteId ? ":" + pg.pisteId : "") + (pg.etape ? ":" + pg.etape : "")
      + (pg.voletId ? ":" + pg.voletId : "") + (pg.variation ? ":" + pg.variation : "");
  }

  /* La plateforme que la campagne sert : la gamme quand la campagne en déclare
   * une (EVAP pour l'EOY 2026), sinon la marque — l'héritage remonte seul. Les
   * marques qui partagent une plateforme ne la répètent pas. */
  function plateforme(p) {
    var ids = ((p.sections.identite || {}).marqueIds || []).slice(0, 4);
    if (!ids.length || !window.VAULT || !VAULT.pourDossier) return null;
    var vues = {}, out = null, noms = [];
    ids.forEach(function (id) {
      var idee = VAULT.pourDossier(p, id, "idee_directrice").valeur;
      var m = DEPOT.trouve("marques", id);
      if (m) noms.push(m.nom);
      if (!idee || vues[idee]) return;
      vues[idee] = 1;
      if (out) return;
      function v(k) { return VAULT.pourDossier(p, id, k).valeur; }
      var premier = function (x) { return Array.isArray(x) ? x[0] : x; };
      out = { idee: idee, promesse: v("promesse"), rituel: premier(v("rituels")),
        symbole: premier(v("symboles")), ton: v("ton"), valeurs: v("valeurs") || [] };
    });
    if (!out) return null;
    var g = VAULT.gammeDuDossier ? VAULT.gammeDuDossier(p) : null;
    out.source = (g ? "Plateforme " + g + " · " : "Plateforme de marque · ") + noms.join(", ");
    return out;
  }

  /* Le KV qu'on montre d'une piste : sa dernière maquette, sinon son visuel. */
  /* La dernière version du KV, et ses variations : une même version peut en
   * porter plusieurs (« Le lait du moment » v3 en deux, le toast v2 en trois,
   * 13/10/2026). Chacune a sa page, en grand ; `variation` choisit laquelle. */
  function kvDe(pi, variation) {
    var vs = (pi.kvBrouillons || []).filter(function (v) { return v.vignette; })
      .sort(function (a, b) { return (b.version || 0) - (a.version || 0); });
    if (vs.length) {
      var der = vs.filter(function (v) { return String(v.version) === String(vs[0].version); })
        .sort(function (a, b) { return String(a.variation || "").localeCompare(String(b.variation || "")); });
      var k = (variation && der.filter(function (v) { return v.variation === variation; })[0]) || der[0];
      return { vignette: k.vignette, master: k.chemin || null, nom: pi.titre, version: k.version, versions: vs.length,
        variation: der.length > 1 ? k.variation || null : null, legende: k.legende || null,
        variations: der.length > 1 ? der.map(function (v) { return v.variation; }) : [] };
    }
    return pi.vignette ? { vignette: pi.vignette, master: pi.master || null, nom: pi.titre, variations: [] } : null;
  }

  function pagesKV(pi) {
    var k = kvDe(pi);
    if (!k) return [];
    if (!k.variations.length) return [{ type: "kv", pisteId: pi.id }];
    return k.variations.map(function (v) { return { type: "kv", pisteId: pi.id, variation: v }; });
  }

  /* Une diapositive ne recopie pas un paragraphe de travail : elle en garde les
   * premières phrases, sans jamais couper une phrase en deux. Le texte entier
   * reste au dossier. */
  function court(t, max) {
    t = String(t || "").trim();
    max = max || 220;
    if (t.length <= max) return t;
    var phrases = t.match(/[^.!?…]+[.!?…]+[»")]?\s*/g) || [t];
    var out = "";
    for (var i = 0; i < phrases.length; i++) {
      if (out && (out + phrases[i]).length > max) break;
      out += phrases[i];
    }
    return out.trim();
  }

  /* Les actions que le brief demande, avec les supports qui y répondent. La
   * stratégie et le plan d'exécution ne sont pas une action : ce document
   * entier y répond. */
  var REPONSES = [
    { re: /4\s*[×x]\s*3|outdoor|affichage/i, supports: ["S-billboard"], canal: "ATL" },
    { re: /goodies|banni[eè]re|guirlande|banderole/i, supports: ["S-banderole", "S-tshirt", "S-casquette", "S-goodies"], canal: "BTL" },
    { re: /poster/i, supports: ["S-p6040"] },
    { re: /wobbler|woobler/i, supports: ["S-woobler"] },
    { re: /gondole/i, supports: ["S-tg"] },
    { re: /digital|vid[ée]o|influen/i, supports: ["S-digital", "S-film916"], canal: "TTL" },
  ];
  function actionsDemandees(p) {
    return ((p.sections.brief || {}).livrables_attendus || []).map(function (ligne) {
      var r = REPONSES.filter(function (x) { return x.re.test(ligne); })[0];
      return r ? { ligne: ligne, supports: r.supports } : null;
    }).filter(Boolean);
  }
  function repondA(pi, demande) {
    return (pi.dispositif || []).filter(function (a) {
      return (a.supports || []).some(function (sid) { return demande.supports.indexOf(sid) !== -1; });
    });
  }

  /* Le numéro d'une piste : son rang parmi les pistes vivantes du dossier. Il
   * suit la piste sur toutes ses pages — sa page, son KV, son spot, son
   * dispositif, le comparatif — pour qu'aucune lecture ne la confonde avec une
   * autre. */
  function numero(p, pi) {
    var vs = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
    var i = vs.indexOf(pi);
    return i === -1 ? null : i + 1;
  }
  function nommer(p, pi) {
    var n = numero(p, pi);
    return (n ? "Piste " + n + " · " : "") + (pi.titre || "sans titre");
  }

  /* Ce qui distingue une piste des autres, en quatre lignes comparables. */
  function lecture(pi) {
    var l = pi.lecture || {};
    var portee = (pi.fabrique || {}).spot;
    var marques = l.marques || (portee && portee.marqueIds ? portee.marqueIds.map(function (id) {
      var m = DEPOT.trouve("marques", id); return m ? m.nom : id; }).join(", ") : null);
    return { marques: marques, moment: l.moment || null, moteur: l.moteur || null, distingue: l.distingue || null };
  }

  function aDesMaquettes(pi) {
    return (pi.kvBrouillons || []).some(function (v) { return v.vignette; });
  }

  /* Le spot d'une piste, tel que la fabrique le tient : le storyboard (illustré
   * ou seulement écrit), l'animatique, le son, la portée. */
  function spotDe(pi) {
    var f = pi.fabrique || {};
    var sb = f.storyboard && (f.storyboard.cases || []).length ? f.storyboard : null;
    var anims = f.animatiques || [];
    var film = anims.length ? anims[anims.length - 1] : null;
    if (!sb && !film && !(f.musique || {}).titre) return null;
    return { sb: sb, film: film, musique: f.musique || null, conducteur: f.conducteur || null, portee: f.spot || null };
  }

  /* Régénérer : on garde le choix des pages, on rafraîchit ce qu'elles tirent. */
  function pagesPossibles(p) {
    var toutes = creer(p).pages;
    return toutes;
  }

  /* La convention du dossier, prise au premier territoire qui l'énonce. */
  function conventionDuDossier(p) {
    var ts = window.TERRITOIRE ? TERRITOIRE.liste(p) : [];
    for (var i = 0; i < ts.length; i++) {
      var e = ((ts[i].convention || {}).enonce || "").trim();
      if (e) return e;
    }
    return null;
  }

  /* Qui a fait quoi. « Fonction exercée, nom orthographié, validation écrite
   * avant tout dépôt » — les crédits se composent, ils ne se ressaisissent pas. */
  function credits(p) {
    var vus = {};
    var out = [];
    function poser(fonction, id) {
      if (!id) return;
      var pers = DEPOT.trouve("personnes", id);
      if (!pers) return;
      var cle = fonction + "|" + pers.id;
      if (vus[cle]) return;
      vus[cle] = 1;
      out.push({ fonction: fonction, nom: pers.nom });
    }
    var b = p.sections.bigidea || {};
    poser("Idée", b.auteur);
    (p.sections.pistes || []).forEach(function (pi) {
      if (pi.statut === "ecartee") return;
      poser("Direction artistique", pi.auteurDA);
      poser("Conception-rédaction", pi.auteurCR);
    });
    return out;
  }

  /* ————————————————————— Ce que chaque page montre ————————————————————— */

  function contenu(p, page) {
    var b = p.sections.bigidea || {};
    var brief = p.sections.brief || {};
    var strat = p.sections.strategie || {};
    var ident = p.sections.identite || {};

    if (page.type === "titre") {
      return { titre: b.campagne || p.nom, sous: ident.client || "",
        note: ident.marque || "" };
    }
    if (page.type === "etape") {
      var ETAPES = {
        cadrage: { titre: "Ce que vous nous avez demandé", phrase: ident.objectif || brief.objectif_com || brief.probleme },
        conception: { titre: "Ce que nous proposons", phrase: b.campagne ? "« " + b.campagne + " »" : b.idee },
        pistes: { titre: "Les pistes", phrase: (function () {
          var vs = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
          return vs.length + (vs.length > 1 ? " pistes : " : " piste : ") + vs.map(function (x, i) { return (i + 1) + ". " + x.titre; }).join("  ·  ");
        })() },
        suite: { titre: "Et maintenant", phrase: "Ce que nous recommandons, ce qui se décide aujourd'hui, et ce qui vient après." },
      };
      var e = ETAPES[page.etape];
      return e ? { titre: e.titre, phrase: e.phrase, etape: page.etape } : null;
    }
    if (page.type === "plateforme") {
      var pf = plateforme(p);
      if (!pf) return null;
      return { titre: "La plateforme", phrase: pf.idee,
        blocs: [
          { t: "La promesse", v: pf.promesse },
          { t: "Le rituel", v: pf.rituel },
          { t: "Le signe", v: pf.symbole },
          { t: "Les valeurs", v: (pf.valeurs || []).join("  ·  ") },
        ].filter(function (x) { return x.v; }),
        note: pf.source };
    }
    if (page.type === "merci") {
      return { titre: "Merci.", campagne: (b.campagne || p.nom || "") };
    }
    if (page.type === "kv") {
      var pk = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var k = pk ? kvDe(pk, page.variation) : null;
      if (!k) return null;
      return { titre: nommer(p, pk), visuel: k, accroches: pk.accroches || [],
        variation: k.variation ? "Variation " + k.variation + (k.legende ? " — " + k.legende : "") : null,
        note: k.version ? "Maquette v" + k.version + (k.variations.length ? ", " + k.variations.length + " variations" : "")
          + " — brouillon, avant shooting" : null };
    }
    if (page.type === "spot") {
      var ps = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var sp = ps ? spotDe(ps) : null;
      if (!sp) return null;
      var cases = sp.sb ? sp.sb.cases : [];
      var portee = sp.portee ? (sp.portee.exclusif
        ? "Spot exclusif : " + (sp.portee.marqueIds || []).map(function (id) { var m = DEPOT.trouve("marques", id); return m ? m.nom : id; }).join(", ")
          + ", " + (sp.portee.marches || []).map(function (id) { var m = DEPOT.trouve("marches", id); return m ? m.nom : id; }).join(", ")
        : "Pensé pour être décliné") : null;
      return { titre: nommer(p, ps) + " — le spot",
        cases: cases, illustre: cases.filter(function (c) { return c.vignette; }).length,
        ratio: sp.sb ? sp.sb.ratio : null, film: sp.film,
        son: sp.musique && sp.musique.titre ? "« " + sp.musique.titre + " »" : null,
        formats: sp.conducteur && sp.conducteur.formats ? sp.conducteur.formats.map(function (f) { return f.nom.replace(/\s*[—(].*$/, ""); }) : [],
        portee: portee };
    }
    if (page.type === "probleme") {
      if (!brief.probleme && !brief.objectif_business) return null;
      return { titre: "Ce que vous nous avez demandé", corps: brief.probleme || brief.objectif_business,
        blocs: [
          { t: "L'objectif", v: ident.objectif || brief.objectif_com },
          { t: "La cible", v: brief.cible },
          { t: "Aujourd'hui", v: brief.comportement_actuel },
          { t: "Demain", v: brief.comportement_vise },
        ].filter(function (x) { return x.v; }) };
    }
    if (page.type === "strategie") {
      /* L'insight n'est plus un paragraphe : la page tire de l'objet, et du
       * territoire qu'il ouvre. Le repli sur les anciens champs tient tant
       * qu'un dossier n'a pas été repris à la main. */
      var i0 = INSIGHT.liste(p)[0] || null;
      var t0 = window.TERRITOIRE ? TERRITOIRE.liste(p)[0] : null;
      if (!i0 && !t0 && !strat.territoire) return null;
      var tps = i0 ? INSIGHT.normaliser(i0).passes.temps : {};
      return { titre: "La stratégie",
        corps: (t0 && (t0.quoi || t0.nom)) || strat.territoire,
        phrase: i0 ? INSIGHT.texte(i0) : null,
        blocs: [
          { t: "La tension", v: tps.tension || strat.tension },
          { t: "Ce que ça empêche", v: tps.empeche },
          { t: "La promesse", v: brief.promesse },
        ].filter(function (x) { return x.v; }) };
    }

    /* ————— Les pages des cinq autres structures ————— */

    /* Un document compilé. Le contenu sert l'aperçu ; le rendu complet passe
     * par COMPILATEUR.document, qui sait le mettre en page. */
    if (page.type === "cadrage" || page.type === "conception" || page.type === "production") {
      if (!window.COMPILATEUR) return null;
      var def = COMPILATEUR.DOCS[page.type];
      var doc = COMPILATEUR.compiler(p, page.type);
      var pleins = doc.blocs.filter(Boolean).length;
      if (!pleins) return null;
      var manques = COMPILATEUR.controles(p, page.type).filter(function (x) { return !x.ok; });
      return { titre: def.nom, document: page.type,
        corps: pleins + (pleins > 1 ? " blocs compilés" : " bloc compilé")
          + (manques.length ? "  ·  " + manques.length + " condition"
            + (manques.length > 1 ? "s" : "") + " non remplie"
            + (manques.length > 1 ? "s" : "") : "  ·  recevable"),
        manques: manques };
    }

    if (page.type === "contexte") {
      if (!brief.objectif_business && !brief.probleme) return null;
      return { titre: "Contexte marché", corps: brief.objectif_business || brief.probleme,
        blocs: [{ t: "La barrière", v: brief.probleme }].filter(function (x) { return x.v; }) };
    }

    if (page.type === "verite") {
      var iv = INSIGHT.liste(p)[0];
      if (!iv) return null;
      var tv = INSIGHT.normaliser(iv).passes.temps;
      return { titre: "La vérité inconfortable", phrase: INSIGHT.texte(iv),
        blocs: [
          { t: "Ce qui la rend crédible", v: (iv.sources || []).map(function (x) { return x.quoi; })
            .filter(Boolean).join("  ·  ") },
          { t: "Ce que ça coûte de ne rien faire", v: tv.empeche },
        ].filter(function (x) { return x.v; }) };
    }

    if (page.type === "transformation") {
      var it = INSIGHT.liste(p)[0];
      if (!it && !b.idee) return null;
      var tt = it ? INSIGHT.normaliser(it).passes.temps : {};
      return { titre: "De … à …", phrase: b.signature || null,
        blocs: [
          { t: "Aujourd'hui", v: tt.situation },
          { t: "Après la campagne", v: b.idee },
        ].filter(function (x) { return x.v; }) };
    }

    if (page.type === "pourquoi") {
      var ip = INSIGHT.liste(p)[0];
      if (!ip && !b.rattachement) return null;
      return { titre: "Pourquoi ça marche",
        blocs: [
          { t: "Le ressort humain", v: ip ? INSIGHT.texte(ip) : null },
          { t: "Le décalage de catégorie", v: conventionDuDossier(p) },
          { t: "La preuve de marque", v: b.rattachement },
          { t: "La longévité", v: b.validite },
        ].filter(function (x) { return x.v; }) };
    }

    if (page.type === "faisabilite") {
      var jours = (p.livrables || []).reduce(function (n, l) { return n + (l.estime || 0); }, 0);
      if (!jours) return null;
      return { titre: "Faisabilité et budget",
        blocs: [{ t: "Charge estimée", v: jours + " jours sur " + (p.livrables || []).length + " livrables" }] };
    }

    if (page.type === "criteres") {
      if (!window.RECO) return null;
      return { titre: "Comment lire les pistes",
        corps: "Chaque piste se juge sur les mêmes quatre critères, et sur son prix à payer.",
        blocs: RECO.COMPARAISON.map(function (c) { return { t: c.nom, v: "—" }; }) };
    }

    if (page.type === "comparatif") {
      var vivs = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
      if (vivs.length < 2) return null;
      var compte = function (pi, c) { return (pi.dispositif || []).filter(function (a) { return a.canal === c; }).length; };
      return { titre: "Les pistes, côte à côte", pistes: vivs.map(function (x) { return nommer(p, x); }),
        lignes: [
          { t: "L'idée", v: vivs.map(function (x) { return court(x.idee, 150); }) },
          { t: "Pour qui", v: vivs.map(function (x) { return lecture(x).marques || "—"; }) },
          { t: "Le moment", v: vivs.map(function (x) { return lecture(x).moment || "—"; }) },
          { t: "Le moteur", v: vivs.map(function (x) { return lecture(x).moteur || "—"; }) },
          { t: "Ce qui la distingue", v: vivs.map(function (x) { return lecture(x).distingue || "—"; }) },
          { t: "Le dispositif", v: vivs.map(function (x) {
            return ["ATL", "BTL", "TTL"].map(function (c) { var n = compte(x, c); return n ? c + " " + n : null; })
              .filter(Boolean).join(" · ") || "—"; }) },
        ] };
    }

    if (page.type === "couverture") {
      var vv = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
      var dem = actionsDemandees(p);
      if (!dem.length) return null;
      return { titre: "Ce que le brief demande, piste par piste", pistes: vv.map(function (x) { return nommer(p, x); }),
        lignes: dem.map(function (d) {
          return { t: d.ligne.replace(/\s*—\s*(fichiers? ouverts?|acteurs réels)$/i, ""),
            v: vv.map(function (x) { var r = repondA(x, d); return r.length ? r.map(function (a) { return a.nom; }).join(" · ") : "—"; }) };
        }) };
    }

    /* La slide d'arbitrage. Aucun deck ne sort sans elle : trois lignes, trente
     * secondes. Ce qui manque s'affiche comme manquant — recommander expose, et
     * c'est ce risque que le client paie. */
    if (page.type === "arbitrage") {
      if (!window.RECO) return null;
      var ar = RECO.arbitrage(p);
      if (!ar.due) return null;
      return { titre: "Notre recommandation",
        phrase: ar.piste ? "Nous recommandons la " + nommer(p, ar.piste).replace("Piste", "piste").replace(" · ", " : « ") + " »."
          : null,
        blocs: [
          { t: "Les trois raisons", v: ar.raisons.length ? ar.raisons.join("  ·  ") : null },
          { t: "Ce qui casse si on recompose", v: ar.integrite || null },
        ].filter(function (x) { return x.v; }) };
    }

    if (page.type === "convention") {
      var c = conventionDuDossier(p);
      if (!c) return null;
      var tc = (window.TERRITOIRE ? TERRITOIRE.liste(p) : [])
        .filter(function (x) { return (x.convention || {}).enonce; })[0];
      var pr = tc ? TERRITOIRE.convention(tc) : null;
      return { titre: "Ce que toute la catégorie tient pour acquis", phrase: c,
        blocs: pr ? [{ t: "Prouvée par", v: pr.preuves.length + " visuels de concurrents" }] : [] };
    }

    if (page.type === "reduction") {
      var tr = (window.TERRITOIRE ? TERRITOIRE.liste(p) : [])
        .filter(function (x) { return (x.reduction || {}).six; })[0];
      if (!tr) return null;
      var r = tr.reduction;
      return { titre: "Le chemin de réduction", phrase: r.six,
        blocs: [{ t: "Dix mots", v: r.dix }, { t: "Le problème, au départ", v: r.longue }]
          .filter(function (x) { return x.v; }) };
    }

    if (page.type === "manifeste") {
      var so = p.sections.socle || {};
      if (!so.idee_directrice && !so.positionnement) return null;
      return { titre: "Ce en quoi nous croyons", phrase: so.idee_directrice,
        corps: so.positionnement };
    }

    if (page.type === "principe") {
      var sp = p.sections.socle || {};
      if (!sp.ton) return null;
      return { titre: "Le principe créatif", corps: sp.ton };
    }

    if (page.type === "abandons") {
      var sa = p.sections.socle || {};
      var jamais = (sa.jamais || []).concat(sa.ne_fera_pas || []);
      if (!jamais.length) return null;
      return { titre: "Ce qu'on ne fera plus jamais",
        blocs: jamais.slice(0, 3).map(function (x) { return { t: "Abandonné", v: x }; }) };
    }

    if (page.type === "signes") {
      var proches = (p.livrables || []).filter(function (l) { return l.publication; })
        .sort(function (a, b2) { return String(a.publication).localeCompare(String(b2.publication)); })
        .slice(0, 3);
      if (!proches.length) return null;
      return { titre: "Les premiers signes visibles",
        blocs: proches.map(function (l) {
          return { t: O.jourCourt(l.publication), v: l.nom };
        }) };
    }

    if (page.type === "diagnostic" || page.type === "barrieres"
      || page.type === "phases" || page.type === "mesure") {
      return window.EFFICACITE ? EFFICACITE.page(p, page.type) : null;
    }

    /* Les crédits se posent avant la diffusion : fonction exercée, nom
     * orthographié, validation écrite avant tout dépôt. */
    if (page.type === "credits") {
      var gens = credits(p);
      if (!gens.length) return null;
      return { titre: "Crédits",
        blocs: gens.map(function (g) { return { t: g.fonction, v: g.nom }; }) };
    }
    if (page.type === "idee") {
      var auteur = b.auteur ? DEPOT.trouve("personnes", b.auteur) : null;
      return { titre: b.campagne || "L'idée", phrase: b.idee, signature: b.signature,
        corps: b.mecanique };
    }
    if (page.type === "piste") {
      var pi = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pi) return null;
      var lec = lecture(pi);
      var vivantes = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
      return { titre: pi.titre, corps: null, visuel: kvDe(pi) || pi,
        numero: numero(p, pi), message: (pi.accroches || [])[0] || null,
        moment: lec.moment, moteur: lec.moteur, marques: lec.marques,
        pour: [lec.marques, lec.moment].filter(Boolean).join(" · "), distingue: lec.distingue,
        phrase: pi.idee || null, accroches: pi.accroches || [],
        /* Le sacrifice et le motif restent à l'interne : le client reçoit
         * l'idée, la mécanique et ce qui la rend juste. */
        blocs: [
          { t: "La mécanique", v: court(pi.mecanique) },
          { t: "L'exécution clé", v: court(pi.executionCle) },
          { t: "Pourquoi elle marche", v: court(pi.argument) },
        ].filter(function (x) { return x.v; }),
        statut: pi.statut };
    }
    if (page.type === "planche") {
      var pr = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var ls = (p.livrables || []).filter(function (l) {
        if (l.annule) return false;
        if (page.seulementKV && !KV.estKV(l)) return false;
        return page.pisteId ? l.pisteId === page.pisteId : l.voletId === page.voletId;
      });
      if (!ls.length) return null;
      return { titre: pr ? nommer(p, pr) + " — les déclinaisons" : "Déclinaisons", cases: ls.map(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        var s = DEPOT.trouve("supports", l.support);
        /* Sur une planche de KV, ce qui distingue une case est sa marque et sa
         * langue — pas le nom du support, identique partout. */
        return { livrable: l, marche: m, support: s,
          etiquette: (m ? m.code : "") + (l.kv && l.kv.marque ? " · " + l.kv.marque : s ? " · " + s.nom : ""),
          langue: l.kv && l.kv.langue ? O.langue(l.kv.langue)
            : m ? (m.langues || []).map(O.langue).join(", ") : "",
          etat: REGLES.pretSur(l).part };
      }) };
    }
    if (page.type === "mockup") {
      var pr2 = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      var mk = mockups(p).filter(function (x) {
        return !page.pisteId || x.livrable.pisteId === page.pisteId; });
      if (!mk.length) return null;
      return { titre: (pr2 ? nommer(p, pr2) + " — " : "") + "en situation", mockups: mk };
    }

    if (page.type === "dispositif") {
      var pr3 = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pr3 || !(pr3.dispositif || []).length) return null;
      var mois = function (d) { return d ? O.joli(String(d).slice(0, 10)) : null; };
      return { titre: nommer(p, pr3) + " — le dispositif",
        activites: (pr3.dispositif || []).map(function (a) {
          return { nom: a.nom, quoi: court(a.quoi, 200), canalCle: a.canal,
            quand: a.debut ? (a.fin && a.fin !== a.debut ? mois(a.debut) + " → " + mois(a.fin) : mois(a.debut)) : null,
            supportsNoms: (a.supports || []).map(function (id) { var x = DEPOT.trouve("supports", id); return x ? x.nom : null; }).filter(Boolean).join(", "),
            canal: DISPOSITIF.CANAUX[a.canal].nom, lieu: DISPOSITIF.LIEUX[a.lieu].nom,
            debut: a.debut, fin: a.fin,
            marches: (a.marches || []).map(function (id) {
              var m = DEPOT.trouve("marches", id); return m ? m.code : "?"; }).join(" · "),
            pieces: DISPOSITIF.pieces(p, pr3, a).length };
        }) };
    }
    if (page.type === "livrables") {
      return { titre: "Ce que nous livrons", lignes: (p.livrables || []).filter(function (l) { return !l.annule; })
        .map(function (l) {
          var s = DEPOT.trouve("supports", l.support);
          var m = DEPOT.trouve("marches", l.marche);
          var g = s && m ? (s.gabarits || {})[m.id] : null;
          return { nom: l.nom, support: s ? s.nom : "", marche: m ? m.code : "",
            format: g && g.dimensions ? g.dimensions : null };
        }) };
    }
    if (page.type === "calendrier") {
      var jalons = [];
      (p.livrables || []).forEach(function (l) {
        var d = l.publication || l.remise;
        if (d) jalons.push({ nom: l.nom, date: d, fait: REGLES.pretSur(l).part === 100 });
      });
      jalons.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      return { titre: "Le calendrier", jalons: jalons, echeance: ident.echeance };
    }
    if (page.type === "suite") {
      var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
      return { titre: "Ce que nous validons aujourd'hui",
        valide: [
          retenue ? nommer(p, retenue) : "La piste créative",
          b.idee ? "L'idée : " + (b.campagne || "") : null,
          b.signature ? "La signature : « " + b.signature + " »" : null,
          "Le périmètre de livrables",
        ].filter(Boolean),
        pasValide: [
          "Les textes définitifs",
          "Le casting et le décor",
          "Les formats et déclinaisons finales",
          "Le budget de production détaillé",
        ],
        decideur: ident.decideur };
    }
    return null;
  }

  function premierVisuel(p) {
    var l = (p.livrables || []).filter(function (x) { return x.vignette; })[0];
    if (l) return l;
    return (p.sections.pistes || []).filter(function (x) { return x.vignette; })[0] || null;
  }

  function mockups(p) {
    var out = [];
    (p.livrables || []).forEach(function (l) {
      (l.mockups || []).forEach(function (m) {
        out.push({ livrable: l, mockup: m });
      });
    });
    return out;
  }

  /* ————————————————————— Est-elle présentable ? ————————————————————— */

  function controles(p, pres) {
    var ident = p.sections.identite || {};
    var b = p.sections.bigidea || {};
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var sansVisuel = ls.filter(function (l) { return !l.vignette; }).length;
    var mentions = ls.filter(function (l) {
      var m = DEPOT.trouve("marches", l.marche);
      return m && !(m.mentions || []).length;
    }).length;
    var droits = ls.filter(function (l) { return REGLES.droitsInsuffisants(l); }).length;
    var sansBAT = ls.filter(function (l) {
      return PRODUCTION.exiges(l).indexOf("bat") !== -1 && !PRODUCTION.de(l, "bat").length; }).length;
    var sansDispositif = (p.sections.pistes || []).filter(function (x) {
      return x.statut !== "ecartee" && !(x.dispositif || []).length; }).length;
    var pistesMaigres = (p.sections.pistes || []).filter(function (x) {
      if (x.statut === "ecartee") return false;
      return ls.filter(function (l) { return l.pisteId === x.id && KV.estKV(l) && l.vignette; }).length < 2;
    }).length;
    var enSituation = mockups(p).length;
    var mockupsPerimes = ls.reduce(function (n, l) { return n + MOCKUP.perimes(l).length; }, 0);

    return [
      { quoi: "Décideur final nommé", ok: !!ident.decideur, poids: 5,
        cout: "la validation ne prendra pas effet — elle sera suspendue" },
      { quoi: "Une piste fait autorité", ok: !!retenue, poids: 4,
        cout: "présenter deux idées, c'est demander au client d'arbitrer à ma place" },
      { quoi: "Droits couverts", ok: droits === 0, poids: 4,
        cout: droits + " visuels hors zone ou hors durée" },
      { quoi: "Visuels posés", ok: sansVisuel === 0, poids: 3,
        cout: sansVisuel + (sansVisuel > 1 ? " cases sans visuel" : " case sans visuel") },
      { quoi: "Idée écrite", ok: !!b.idee, poids: 3, cout: "rien à présenter" },
      { quoi: "Vu en situation", ok: enSituation > 0 && mockupsPerimes === 0, poids: 3,
        cout: !enSituation
          ? "aucune mise en situation : le client valide un visuel qu'il n'a jamais vu dans son support"
          : mockupsPerimes + (mockupsPerimes > 1 ? " mockups montrent" : " mockup montre") + " une version dépassée" },
      { quoi: "Mentions par marché", ok: mentions === 0, poids: 2,
        cout: mentions + " marchés sans mentions obligatoires renseignées" },
      { quoi: "BAT livrables", ok: sansBAT === 0, poids: 4,
        cout: sansBAT + (sansBAT > 1 ? " livrables n'ont pas de BAT" : " livrable n'a pas de BAT")
          + " : valider aujourd'hui engage une livraison qu'on ne peut pas tenir" },
      { quoi: "Au moins deux KV par piste", ok: pistesMaigres === 0, poids: 4,
        cout: pistesMaigres + (pistesMaigres > 1 ? " pistes présentées ont" : " piste présentée a")
          + " moins de deux KV montrables : en dessous, on présente une intention, pas une campagne" },
      { quoi: "Un dispositif par piste", ok: sansDispositif === 0, poids: 3,
        cout: sansDispositif + (sansDispositif > 1 ? " pistes présentées n'ont" : " piste présentée n'a")
          + " aucun dispositif : on présente une image, pas une campagne" },
    ];
  }

  /* ————————————————————— La séance et ses retours ————————————————————— */

  function enregistrerSeance(pres, seance) {
    pres.seance = seance;
    pres.statut = "presentee";
  }

  /* Un retour de séance redescend sur le livrable qu'il vise : c'est là qu'il se
   * traite, pas dans un compte rendu que personne ne rouvre. */
  function poserRetour(p, pres, retour) {
    pres.retours.push(retour);
    if (retour.livrableId) {
      var l = (p.livrables || []).filter(function (x) { return x.id === retour.livrableId; })[0];
      if (l) ANNOT.poser(l, 50, 50, retour.texte, null);
    }
  }

  return {
    TYPES: TYPES, NIVEAUX: NIVEAUX, creer: creer, creerDepuis: creerDepuis, credits: credits, cle: cle,
    plateforme: plateforme, kvDe: kvDe, spotDe: spotDe, lecture: lecture, numero: numero, nommer: nommer, actionsDemandees: actionsDemandees,
    contenu: contenu, controles: controles,
    mockups: mockups, pagesPossibles: pagesPossibles,
    enregistrerSeance: enregistrerSeance, poserRetour: poserRetour,
  };
})();
