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

    var pages = [{ type: "titre" }];
    if (brief.probleme) pages.push({ type: "probleme" });
    if (INSIGHT.liste(p).length || strat.territoire) pages.push({ type: "strategie" });
    if (b.idee) pages.push({ type: "idee" });

    /* Chaque piste porte ses propres pages : son visuel, son dispositif, sa
     * planche, ses mises en situation. Une planche globale mélangerait deux
     * concepts sur la même page. */
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var pistes = retenue ? [retenue]
      : (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });

    pistes.forEach(function (pi) {
      pages.push({ type: "piste", pisteId: pi.id });
      /* Le KV master et ses adaptations : c'est le minimum montrable. */
      var kvs = (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id && KV.estKV(l); });
      if (kvs.length) pages.push({ type: "planche", pisteId: pi.id, seulementKV: !ambitieux });
      if (!ambitieux) return;
      if ((pi.dispositif || []).length) pages.push({ type: "dispositif", pisteId: pi.id });
      var mk = (p.livrables || []).filter(function (l) { return l.pisteId === pi.id && !l.annule; })
        .reduce(function (n, l) { return n + (l.mockups || []).length; }, 0);
      if (mk) pages.push({ type: "mockup", pisteId: pi.id });
    });

    if (ambitieux && (p.livrables || []).length) pages.push({ type: "livrables" });
    if (ambitieux && (p.livrables || []).some(function (l) { return l.publication || l.remise; }))
      pages.push({ type: "calendrier" });
    pages.push({ type: "suite" });

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
    /* Les crédits se posent avant la diffusion, quelle que soit la structure. */
    if (pages[pages.length - 1] && pages[pages.length - 1].type !== "credits") {
      pages.push({ type: "credits" });
    }

    return {
      id: O.id("PRES"), cree_le: new Date().toISOString(), statut: "brouillon",
      structure: st.cle, niveau: niveau, pages: pages, seance: null, retours: [],
    };
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
        note: ident.marque || "", visuel: premierVisuel(p) };
    }
    if (page.type === "probleme") {
      return { titre: "Le problème", corps: brief.probleme,
        blocs: [
          { t: "La cible", v: brief.cible },
          { t: "L'insight", v: brief.insight || strat.insight },
        ] };
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
      if (!window.RECO) return null;
      var a = RECO.arbitrage(p);
      if (a.pistes.length < 2) return null;
      return { titre: "Les pistes, côte à côte",
        blocs: a.pistes.map(function (pi) {
          var r = pi.role ? RECO.role(pi.role) : null;
          return { t: (pi.titre || "sans titre") + (r ? "  ·  " + r.nom : ""),
            v: [(pi.prix || {}).privilegie || pi.privilegie,
                "sacrifie : " + ((pi.prix || {}).sacrifie || pi.sacrifice || "—")]
              .filter(Boolean).join("  —  ") };
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
        phrase: ar.piste ? "Nous recommandons la piste « " + (ar.piste.titre || "sans titre") + " »."
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
        corps: b.mecanique, note: auteur ? "Idée : " + auteur.nom : null };
    }
    if (page.type === "piste") {
      var pi = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pi) return null;
      var da = pi.auteurDA ? DEPOT.trouve("personnes", pi.auteurDA) : null;
      return { titre: pi.titre, corps: pi.concept, visuel: pi,
        note: da ? "Direction artistique : " + da.nom : null,
        blocs: [
          { t: "La mécanique", v: pi.mecanique },
          { t: "Ce qu'elle sacrifie", v: pi.sacrifice },
          { t: "L'argument", v: pi.argument },
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
      return { titre: pr ? pr.titre + " — les déclinaisons" : "Déclinaisons", cases: ls.map(function (l) {
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
      return { titre: (pr2 ? pr2.titre + " — " : "") + "en situation", mockups: mk };
    }

    if (page.type === "dispositif") {
      var pr3 = (p.sections.pistes || []).filter(function (x) { return x.id === page.pisteId; })[0];
      if (!pr3 || !(pr3.dispositif || []).length) return null;
      return { titre: pr3.titre + " — le dispositif",
        activites: (pr3.dispositif || []).map(function (a) {
          return { nom: a.nom, quoi: a.quoi,
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
          retenue ? "La piste « " + retenue.titre + " »" : "La piste créative",
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
    TYPES: TYPES, NIVEAUX: NIVEAUX, creer: creer, creerDepuis: creerDepuis, credits: credits,
    contenu: contenu, controles: controles,
    mockups: mockups, pagesPossibles: pagesPossibles,
    enregistrerSeance: enregistrerSeance, poserRetour: poserRetour,
  };
})();
