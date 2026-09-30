/* bigidea-ecoles.js — chercher la big idea au bon endroit, école par école.
 *
 * Le produit savait déclarer une école par étage et réclamer sa preuve. Il ne
 * savait pas aider à ÉCRIRE une idée dans une école. Or c'est le premier
 * exercice de la doctrine : « prendre un brief réel et produire trois angles —
 * un en Disruption, un en Truth Well Told, un en Brutal Simplicity. Ce n'est
 * pas un exercice de style : les trois mènent à trois campagnes réellement
 * différentes. »
 *
 * Chaque école répond à une seule question — où se trouve la bonne idée ? —
 * et cette réponse fixe les questions qu'on doit se poser avant d'écrire la
 * phrase. Le gabarit d'une école, ce sont ces questions, dans l'ordre, plus le
 * test qui dit si on est resté dans l'école ou si on en est sorti sans le voir.
 *
 * Deux choses restent vraies ici comme ailleurs :
 *   — une proposition porte sa racine : l'insight dont elle part. Deux
 *     propositions sur deux insights ne sont pas deux axes, ce sont deux
 *     recommandations concurrentes — le test d'une minute s'applique ;
 *   — retenir une proposition n'efface rien : la big idea précédente est
 *     archivée, datée, avec le motif du changement.
 */

window.BI_ECOLES = (function () {
  var el = O.el;

  /* ————————————————————— Les gabarits ————————————————————— */

  /* Les questions viennent du document de formation, pas d'une invention :
   * chaque ligne reprend la mécanique de l'école. */
  var GABARITS = {
    "usp": {
      question: "Quel attribut du produit, qu'aucun concurrent ne peut ou ne veut revendiquer ?",
      champs: [
        { cle: "attribut", nom: "L'attribut différenciant", aide: "un fait produit, vérifiable — pas une qualité générale" },
        { cle: "benefice", nom: "Le bénéfice qu'il donne", aide: "ce que la personne y gagne, concrètement" },
        { cle: "proposition", nom: "La proposition", aide: "achetez ceci, vous obtenez cela — répétable sans variation" },
      ],
      test: "Un concurrent pourrait-il signer la même phrase ? Si oui, ce n'est pas une USP." },

    "brand-image": {
      question: "Quelle personnalité la marque construit-elle, qui vendra tous ses produits à venir ?",
      champs: [
        { cle: "personnalite", nom: "La personnalité", aide: "qui serait la marque si c'était quelqu'un" },
        { cle: "coherence", nom: "Ce qui reste identique d'une campagne à l'autre", aide: "ce qu'on s'engage à tenir cinq ans" },
      ],
      test: "Cette idée pourrait-elle signer la campagne de l'an prochain sans changer ? Sinon, c'est un coup, pas une image." },

    "creative-revolution": {
      question: "Quelle exécution EST l'idée — au point que mal exécutée, elle ne dirait plus rien ?",
      champs: [
        { cle: "execution", nom: "L'exécution clé", aide: "la pièce qu'on montre avant d'expliquer" },
        { cle: "intelligence", nom: "Ce qu'elle suppose du public", aide: "l'humour, l'autodérision, l'intelligence du lecteur" },
      ],
      test: "Racontée sans l'image, l'idée perd-elle l'essentiel ? Si non, l'exécution n'est qu'un habillage." },

    "inherent-drama": {
      question: "Quel drame le produit porte-t-il déjà, dans sa fabrication ou son usage ?",
      champs: [
        { cle: "drame", nom: "Le drame du produit", aide: "comment il est fait, par qui, pourquoi il existe — ou comment on s'en sert" },
        { cle: "scene", nom: "La mise en scène", aide: "le moment où le produit devient intéressant en lui-même" },
        { cle: "comportement", nom: "Ce que les gens feront", aide: "Humankind : l'idée se juge au comportement qu'elle change" },
      ],
      test: "Retirez le produit de la scène : reste-t-il une histoire ? Si oui, on l'a plaquée par-dessus." },

    "account-planning": {
      question: "Quelle vérité sur les gens, une fois énoncée, rend l'action évidente ?",
      champs: [
        { cle: "evidence", nom: "Ce que l'insight rend évident", aide: "l'action de communication qui s'impose après l'avoir lu" },
      ],
      racineRequise: true,
      test: "L'insight passe-t-il ses trois questions ? Si l'énoncé ne fait rien surgir, c'est un constat." },

    "truth-well-told": {
      question: "Quelle vérité existe déjà, et quel rôle la marque joue-t-elle dans la vie des gens ?",
      champs: [
        { cle: "verite", nom: "La vérité", aide: "qui existe sans la marque — on la révèle, on ne la fabrique pas" },
        { cle: "role", nom: "Le rôle de la marque", aide: "role for the brand : sa fonction sociale, pas son message" },
        { cle: "preuves", nom: "Les preuves", aide: "recherche, verbatim datés" },
      ],
      test: "Une belle histoire fausse s'effondre, une vérité mal racontée ne vend rien : les deux moitiés tiennent-elles ?" },

    "disruption": {
      question: "Que toute la catégorie tient-elle pour acquis, et que devient la marque une fois la convention tombée ?",
      champs: [
        { cle: "convention", nom: "1 · La convention", aide: "ce que plus personne n'interroge — à montrer en trois visuels de concurrents" },
        { cle: "rupture", nom: "2 · La disruption", aide: "la rupture — elle peut être douce, ce n'est pas une provocation" },
        { cle: "vision", nom: "3 · La vision", aide: "le temps qu'on saute le plus souvent, et le plus important" },
      ],
      test: "Pouvez-vous montrer la convention en trois visuels de concurrents ? Sinon, vous l'avez supposée." },

    "brutal-simplicite": {
      question: "Qu'est-ce qui reste du problème quand on retire tout ce qui peut l'être ?",
      champs: [
        { cle: "longue", nom: "Le problème, version longue", aide: "environ quarante mots, sans limite" },
        { cle: "dix", nom: "En dix mots", aide: "on perd les nuances de contexte — elles ne manquent presque jamais" },
        { cle: "six", nom: "En six mots", aide: "la coupe qui fait mal : ce qui était décoratif apparaît" },
      ],
      test: "Les trois versions sont-elles gardées ? C'est le chemin à montrer au client, sinon la phrase passe pour du travail bâclé." },

    "lovemarks": {
      question: "Comment la marque passe-t-elle de respectée à aimée ?",
      champs: [
        { cle: "mystere", nom: "Le mystère", aide: "les histoires, les rêves, ce qu'on ne dit pas tout à fait" },
        { cle: "sensualite", nom: "La sensualité", aide: "ce qui passe par les sens : le goût, l'odeur, le toucher" },
        { cle: "intimite", nom: "L'intimité", aide: "l'engagement, l'empathie, la passion partagée" },
        { cle: "rituel", nom: "Le rituel", aide: "le geste répété qui fait appartenir" },
      ],
      test: "La méthode est contestée : l'attachement visé peut-il se constater autrement que par le discours d'agence ?" },

    "big-ideal": {
      question: "Où se croisent une tension qui traverse la société et la meilleure version possible de la marque ?",
      champs: [
        { cle: "tension", nom: "La tension culturelle", aide: "ce qui traverse la société aujourd'hui, en rapport avec la catégorie" },
        { cle: "meilleure", nom: "La version la plus haute de la marque", aide: "ce qu'elle peut être de mieux" },
        { cle: "croyance", nom: "La croyance", aide: "« Nous croyons que… » — jamais un slogan" },
      ],
      test: "Est-ce une croyance qui décide de cinq ans, ou un slogan pour le mois prochain ? Le Big Ideal est un outil de plateforme." },

    "cultural-strategy": {
      question: "Quelle contradiction la société vit-elle mal, et quel mythe la marque peut-elle fournir pour la réparer ?",
      champs: [
        { cle: "contradiction", nom: "La contradiction sociale", aide: "tradition et modernité, réussite individuelle et devoir familial…" },
        { cle: "mythe", nom: "Le mythe qui la répare", aide: "l'histoire que la marque raconte et qui la résout" },
        { cle: "droit", nom: "Le droit de la marque d'en parler", aide: "ce qu'elle fait déjà qui croise cette contradiction" },
      ],
      test: "La marque a-t-elle le droit d'en parler ? Une contradiction qui ne croise rien de ce qu'elle fait est un sujet de société, pas une idée." },

    "brand-key": {
      question: "Quelle est la raison unique de choisir cette marque plutôt qu'une autre ?",
      champs: [
        { cle: "discriminator", nom: "Le discriminator", aide: "celle qu'on remplit en dernier et qu'on rate le plus souvent" },
        { cle: "essence", nom: "L'essence de marque", aide: "le cœur des neuf couches" },
      ],
      test: "Outil de discipline, jamais d'inspiration : l'idée respecte-t-elle le cadre existant, ou le contredit-elle ?" },
  };

  /* Les cinq endroits où chercher, dans l'ordre du document. Une école qui ne
   * figure pas ici cherche ailleurs — la formulation, l'exécution, la
   * structure — et se range à part. */
  var ENDROITS = [
    { cle: "produit", nom: "Dans le produit", ecoles: ["usp", "inherent-drama"] },
    { cle: "consommateur", nom: "Dans le consommateur", ecoles: ["account-planning", "truth-well-told"] },
    { cle: "categorie", nom: "Dans la catégorie", ecoles: ["disruption"] },
    { cle: "culture", nom: "Dans la culture", ecoles: ["big-ideal", "cultural-strategy"] },
    { cle: "marque", nom: "Dans la marque", ecoles: ["brand-image", "lovemarks", "brand-key"] },
    { cle: "forme", nom: "Dans la forme", ecoles: ["brutal-simplicite", "creative-revolution"] },
  ];

  function gabarit(cle) { return GABARITS[cle] || null; }
  function ecoleDe(c) { return c && c.ecole && window.ECOLES ? ECOLES.de(c.ecole) : null; }
  function creatives() {
    return (window.ECOLES ? ECOLES.ECOLES : []).filter(function (e) { return !!GABARITS[e.cle]; });
  }

  /* ————————————————————— Lire ————————————————————— */

  function liste(p) { return (p && p.bigideas) || []; }
  function vivantes(p) { return liste(p).filter(function (c) { return c.statut !== "ecartee"; }); }

  function racine(p, c) {
    if (!c) return null;
    if (c.insightId && window.INSIGHT) return INSIGHT.de(p, c.insightId);
    if (c.territoireId && window.TERRITOIRE) {
      var t = TERRITOIRE.liste(p).filter(function (x) { return x.id === c.territoireId; })[0];
      if (t && t.insightId && window.INSIGHT) return INSIGHT.de(p, t.insightId);
    }
    return null;
  }

  /* Ce que le gabarit réclame et qui n'est pas écrit. */
  function manques(p, c) {
    var g = gabarit(c.ecole);
    var out = [];
    if (!(c.phrase || "").trim()) out.push("l'idée en une phrase");
    if (g) g.champs.forEach(function (ch) {
      if (!((c.champs || {})[ch.cle] || "").trim()) out.push(ch.nom.replace(/^\d · /, "").toLowerCase());
    });
    if (g && g.racineRequise && !racine(p, c)) out.push("l'insight dont elle part");
    if (!c.ecole) out.push("son école");
    return out;
  }

  function etat(p, c) {
    if (c.statut === "retenue") return { nom: "retenue comme big idea", ton: "vert" };
    if (c.statut === "ecartee") return { nom: "écartée", ton: "terne" };
    var m = manques(p, c);
    if (m.length) return { nom: "à compléter — " + m.join(", "), ton: "attente" };
    if (!racine(p, c)) return { nom: "sans racine — elle ne remonte à aucun insight", ton: "alerte" };
    return { nom: "complète, prête à arbitrer", ton: "" };
  }

  /* Le test d'une minute, appliqué aux propositions : combien de racines
   * différentes portent-elles ? */
  function racines(p) {
    var par = {}, sans = [];
    vivantes(p).forEach(function (c) {
      var i = racine(p, c);
      if (!i) { sans.push(c); return; }
      (par[i.id] = par[i.id] || { insight: i, props: [] }).props.push(c);
    });
    var groupes = Object.keys(par).map(function (k) { return par[k]; });
    return { groupes: groupes, sans: sans, n: groupes.length };
  }

  /* ————————————————————— Écrire ————————————————————— */

  function creer(p, d) {
    if (!p.bigideas) p.bigideas = [];
    var c = {
      id: O.id("BE"), ecole: d.ecole || null, titre: d.titre || "", phrase: d.phrase || "",
      mecanique: d.mecanique || "", champs: d.champs || {},
      insightId: d.insightId || null, territoireId: d.territoireId || null,
      auteur: d.auteur || null, statut: "proposee", cree_le: new Date().toISOString(),
    };
    p.bigideas.push(c);
    return c;
  }

  /* Retenir une proposition l'écrit dans la section big idea. Ce qui y était
   * n'est pas perdu : on archive la section entière, datée, avec le motif. */
  function retenir(p, c, motif) {
    var b = p.sections.bigidea || {};
    if (!p.bigideaPrecedentes) p.bigideaPrecedentes = [];
    if ((b.idee || "").trim()) {
      p.bigideaPrecedentes.push({ quand: new Date().toISOString(), motif: motif,
        remplacee_par: c.id, section: JSON.parse(JSON.stringify(b)) });
    }
    liste(p).forEach(function (x) { if (x.statut === "retenue") x.statut = "proposee"; });
    b.idee = c.phrase;
    if ((c.mecanique || "").trim()) b.mecanique = c.mecanique;
    if ((c.titre || "").trim()) b.campagne = c.titre;
    if (c.auteur) b.auteur = c.auteur;
    b.ecole = c.ecole; b.propositionId = c.id;
    p.sections.bigidea = b;
    c.statut = "retenue"; c.motif = motif; c.retenue_le = new Date().toISOString();
    /* L'école de la proposition gouverne désormais le territoire. */
    if (c.ecole) {
      if (!p.ecoles) p.ecoles = {};
      var e = ecoleDe(c);
      if (e && e.etages.indexOf("territoire") !== -1) p.ecoles.territoire = c.ecole;
    }
    DEPOT.ajoute("decisions", { objet: c.id, type: "bigidea", projet: p.id, verdict: "approuve",
      motif: motif, quand: c.retenue_le, qui: MAISON.titulaire, titre: c.titre || c.phrase });
    DEPOT.tracer("big idea retenue", "projets", p.id, (e ? e.nom + " — " : "") + (c.titre || c.phrase));
  }

  /* Contresigner une proposition inférée : le motif reste, daté, à côté. */
  function contresigner(c) {
    if (!c.infere) return;
    c.contresigne = { quand: new Date().toISOString(), par: MAISON.titulaire, motif: c.infere.pourquoi };
    delete c.infere;
  }

  /* ————————————————————— L'écran ————————————————————— */

  function bloc(p, rafraichir) {
    var cs = liste(p);
    var r = racines(p);
    var parEcole = {};
    vivantes(p).forEach(function (c) { if (c.ecole) parEcole[c.ecole] = (parEcole[c.ecole] || 0) + 1; });

    return el("div.be", {},
      el("div.be-tete", {},
        el("div", {},
          el("div.be-t", {}, "Chercher la big idea par école",
            el("span.studio-compte", {}, String(vivantes(p).length))),
          el("p.be-chapo", {}, "Chaque école cherche l'idée à un endroit différent. Le même brief, "
            + "traité par trois écoles, donne trois campagnes réellement différentes.")),
        el("button.b.or", { type: "button", onclick: function () { editer(p, null, rafraichir); } },
          "+ Écrire une big idea par une école")),

      /* Les endroits explorés et ceux qu'on n'a pas regardés : c'est ce qui
       * se lit d'abord. Un endroit vide n'est pas une faute — c'est une
       * piste qu'on n'a pas tentée. */
      el("div.be-endroits", {}, ENDROITS.map(function (en) {
        var n = en.ecoles.reduce(function (s, k) { return s + (parEcole[k] || 0); }, 0);
        return el("div.be-en" + (n ? ".plein" : ""), {},
          el("span.be-en-n", {}, en.nom),
          el("span.be-en-c", {}, n ? n + (n > 1 ? " propositions" : " proposition") : "pas encore cherché"),
          el("span.be-en-e", {}, en.ecoles.map(function (k) {
            var e = ECOLES.de(k); return e ? e.nom.replace(/^(L'|La |Le |Les )/, "") : k;
          }).join(" · ")));
      })),

      cs.length ? verdictRacines(p, r) : null,

      !cs.length
        ? el("p.rien", {}, "Aucune proposition. Commencer par l'école que le brief appelle — et en écrire au moins une autre, "
            + "ailleurs, pour que l'arbitrage compare deux endroits et pas deux formulations.")
        : el("div.be-grille", {}, cs.map(function (c) { return carte(p, c, rafraichir); }))
    );
  }

  function verdictRacines(p, r) {
    if (!r.n && !r.sans.length) return null;
    var texte;
    if (r.n <= 1 && !r.sans.length) {
      texte = "Toutes les propositions remontent au même insight : ce sont des axes, on peut les comparer entre elles.";
    } else if (r.n > 1) {
      texte = r.n + " racines différentes sous les propositions. Ce ne sont pas des axes d'une même recommandation, "
        + "ce sont des recommandations concurrentes : l'arbitrage choisit d'abord l'insight, ensuite la phrase.";
    } else {
      texte = "Les propositions ne remontent à aucun insight : on ne peut pas dire si elles répondent au même problème.";
    }
    return el("div.be-racines", {},
      UI.banniere(r.n > 1 ? "" : "", texte),
      r.groupes.length ? el("div.be-rg", {}, r.groupes.map(function (g) {
        var c = g.insight.couche ? INSIGHT.couche(g.insight.couche) : null;
        return el("div.be-rgl", {},
          el("span.be-rgl-c", {}, c ? c.nom : "couche non nommée"),
          el("span.be-rgl-t", {}, INSIGHT.texte(g.insight)),
          el("span.be-rgl-n", {}, g.props.length + (g.props.length > 1 ? " propositions" : " proposition")));
      })) : null,
      r.sans.length ? el("div.be-rgl.sans", {},
        el("span.be-rgl-c", {}, "sans racine"),
        el("span.be-rgl-t", {}, r.sans.map(function (c) { return c.titre || c.phrase; }).join("  ·  ")),
        el("span.be-rgl-n", {}, String(r.sans.length))) : null);
  }

  function carte(p, c, rafraichir) {
    var e = ecoleDe(c);
    var g = gabarit(c.ecole);
    var i = racine(p, c);
    var st = etat(p, c);
    var auteur = c.auteur ? DEPOT.trouve("personnes", c.auteur) : null;

    return el("div.be-c." + (c.statut || "proposee"), {},
      el("div.be-c-e", {},
        el("span.be-c-ecole", {}, e ? e.nom : "École non déclarée"),
        el("span.be-c-ou", {}, e ? "l'idée est " + e.ou + " · " + e.effort : c.source || "à identifier : quelle question ses auteurs se sont-ils posée en premier ?")),
      c.titre ? el("div.be-c-titre", {}, c.titre) : null,
      el("div.be-c-phrase" + (c.phrase ? "" : ".vide"), {}, c.phrase || "L'idée en une phrase n'est pas écrite."),

      g ? el("div.be-c-l", {}, g.champs.map(function (ch) {
        var v = (c.champs || {})[ch.cle];
        return el("div.be-cl", {},
          el("span.be-cl-q", {}, ch.nom),
          el("span.be-cl-v" + (v ? "" : ".vide"), {}, v || "non écrit"));
      })) : null,

      c.mecanique ? el("div.be-cl", {}, el("span.be-cl-q", {}, "La mécanique"),
        el("span.be-cl-v", {}, c.mecanique)) : null,

      el("div.be-cl", {}, el("span.be-cl-q", {}, "Sa racine"),
        el("span.be-cl-v" + (i ? "" : ".vide"), {}, i
          ? (i.couche ? INSIGHT.couche(i.couche).nom + " — " : "") + INSIGHT.texte(i)
          : "aucun insight rattaché")),

      g ? el("div.be-c-test", {}, g.test) : null,

      el("div.be-c-etat." + (st.ton || "neutre"), {}, st.nom),
      c.infere ? el("div.be-c-inf", {}, (c.source ? "Reprise du brief — " : "Inférée — ")
        + c.infere.pourquoi) : null,
      c.motif ? el("div.be-c-inf", {}, "Retenue : " + c.motif) : null,

      el("div.be-c-pied", {},
        auteur ? el("span.be-c-a", {}, UI.avatar(auteur, 20), el("span", {}, auteur.nom))
          : el("span.be-c-a.vide", {}, "auteur non nommé"),
        el("span.be-c-g", {},
          c.infere ? el("button.studio-lien", { type: "button", onclick: function () {
            contresigner(c); DEPOT.enregistrer(); rafraichir(); } }, "Contresigner") : null,
          el("button.studio-lien", { type: "button", onclick: function () { editer(p, c, rafraichir); } }, "Modifier"),
          c.statut !== "retenue"
            ? el("button.b", { type: "button", onclick: function () { choisir(p, c, rafraichir); } }, "Retenir")
            : null))
    );
  }

  /* ————————————————————— Écrire une proposition ————————————————————— */

  function editer(p, c, rafraichir) {
    var neuf = !c;
    var d = c ? JSON.parse(JSON.stringify(c)) : { ecole: "", champs: {} };
    var zone = el("div");

    var selE = el("select", { id: "be-ecole" });
    selE.appendChild(el("option", { value: "" }, "— choisir l'école —"));
    ENDROITS.forEach(function (en) {
      var og = el("optgroup", { label: en.nom });
      en.ecoles.forEach(function (k) {
        var e = ECOLES.de(k);
        if (e) og.appendChild(el("option", { value: k }, e.nom + " — " + e.maison));
      });
      selE.appendChild(og);
    });
    selE.value = d.ecole || "";

    var titre = el("input", { type: "text", id: "be-titre", value: d.titre || "", placeholder: "le nom de travail de la campagne" });
    var phrase = el("textarea", { id: "be-phrase", rows: 2, placeholder: "l'idée en une phrase — s'il en faut deux, ce n'est pas un concept" });
    phrase.value = d.phrase || "";
    var meca = el("textarea", { id: "be-meca", rows: 2, placeholder: "ce que les gens font — lisible sans nommer le média" });
    meca.value = d.mecanique || "";

    var selI = el("select", { id: "be-insight" });
    selI.appendChild(el("option", { value: "" }, "— aucun insight —"));
    (window.INSIGHT ? INSIGHT.liste(p) : []).forEach(function (i) {
      var co = i.couche ? INSIGHT.couche(i.couche) : null;
      var t = INSIGHT.texte(i);
      selI.appendChild(el("option", { value: i.id }, (co ? co.nom + " — " : "") + t.slice(0, 90) + (t.length > 90 ? "…" : "")));
    });
    selI.value = d.insightId || "";

    var selT = el("select", { id: "be-territoire" });
    selT.appendChild(el("option", { value: "" }, "— aucun territoire —"));
    (window.TERRITOIRE ? TERRITOIRE.liste(p) : []).forEach(function (t) {
      selT.appendChild(el("option", { value: t.id }, t.nom || "territoire sans nom"));
    });
    selT.value = d.territoireId || "";

    var champsSaisis = {};

    function dessinerEcole() {
      O.vider(zone);
      champsSaisis = {};
      var e = selE.value ? ECOLES.de(selE.value) : null;
      var g = gabarit(selE.value);
      if (!e || !g) {
        zone.appendChild(el("p.indice", {}, "Choisir l'école fixe les questions à se poser avant d'écrire la phrase."));
        return;
      }
      zone.appendChild(el("div.be-f-ecole", {},
        el("div.be-f-q", {}, g.question),
        el("div.be-f-p", {}, e.principe),
        el("div.be-f-lim", {}, "Sa limite : " + e.limite),
        e.local ? el("div.be-f-lim", {}, "Sur nos marchés : " + e.local) : null,
        el("div.be-f-lim", {}, "Preuve attendue au dossier : " + e.preuve)));
      g.champs.forEach(function (ch) {
        var t = el("textarea", { rows: 2, id: "be-ch-" + ch.cle });
        t.value = (d.champs || {})[ch.cle] || "";
        champsSaisis[ch.cle] = t;
        zone.appendChild(el("div.champ", {}, el("label", { "for": "be-ch-" + ch.cle }, ch.nom), t,
          el("div.indice", {}, ch.aide)));
      });
      zone.appendChild(el("div.be-c-test", {}, "Le test de l'école : " + g.test));
    }
    selE.addEventListener("change", dessinerEcole);
    dessinerEcole();

    PANNEAU.ouvrir(neuf ? "Écrire une big idea par une école" : "Modifier la proposition", p.ref, el("div", {},
      UI.banniere("", "Une école ne produit pas l'idée : elle rend plus probable qu'on la cherche au bon endroit. "
        + "Répondre aux questions de l'école d'abord, écrire la phrase ensuite."),
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "be-ecole" }, "L'école"), selE),
        zone,
        el("div.champ", {}, el("label", { "for": "be-insight" }, "L'insight dont elle part"), selI,
          el("div.indice", {}, "La racine : c'est elle qui dit si deux propositions sont deux axes ou deux recommandations concurrentes.")),
        el("div.champ", {}, el("label", { "for": "be-territoire" }, "Le territoire"), selT),
        el("div.champ", {}, el("label", { "for": "be-titre" }, "Le nom de travail"), titre),
        el("div.champ", {}, el("label", { "for": "be-phrase" }, "L'idée en une phrase"), phrase),
        el("div.champ", {}, el("label", { "for": "be-meca" }, "La mécanique"), meca)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!selE.value && neuf) { AVIS.refus("Choisir l'école : c'est elle qui dit où l'on cherche."); return; }
          if (!phrase.value.trim() && !Object.keys(champsSaisis).some(function (k) { return champsSaisis[k].value.trim(); })) {
            AVIS.refus("Rien d'écrit."); return;
          }
          var champs = {};
          Object.keys(champsSaisis).forEach(function (k) { champs[k] = champsSaisis[k].value.trim(); });
          var vals = { ecole: selE.value || null, titre: titre.value.trim(), phrase: phrase.value.trim(),
            mecanique: meca.value.trim(), champs: champs,
            insightId: selI.value || null, territoireId: selT.value || null };
          if (neuf) {
            var x = creer(p, vals);
            DEPOT.tracer("big idea proposée", "projets", p.id, (ECOLES.de(x.ecole) || {}).nom + " — " + (x.titre || x.phrase));
          } else {
            /* On garde ce que le gabarit d'une autre école avait écrit : changer
             * d'école ne doit pas effacer une réflexion déjà faite. */
            var anciens = c.champs || {};
            Object.keys(anciens).forEach(function (k) { if (!(k in champs) && anciens[k]) champs[k] = anciens[k]; });
            Object.keys(vals).forEach(function (k) { c[k] = vals[k]; });
            c.modifie_le = new Date().toISOString();
            DEPOT.tracer("big idea modifiée", "projets", p.id, c.titre || c.phrase);
          }
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, neuf ? "Poser la proposition" : "Enregistrer"),
        !neuf && c.statut !== "ecartee" ? el("button.b.nu", { type: "button", onclick: function () {
          var m = window.prompt("Pourquoi l'écarter ? Une ligne — elle reste au dossier.");
          if (!m || !m.trim()) return;
          c.statut = "ecartee"; c.motif = m.trim(); c.ecartee_le = new Date().toISOString();
          DEPOT.tracer("big idea écartée", "projets", p.id, (c.titre || c.phrase) + " — " + c.motif);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Écarter") : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function choisir(p, c, rafraichir) {
    var b = p.sections.bigidea || {};
    var motif = el("input", { type: "text", id: "be-motif", placeholder: "une ligne d'argument — réponse au brief, durée, capacité de la marque à la porter" });
    var r = racines(p);
    PANNEAU.ouvrir("Retenir « " + (c.titre || "cette proposition") + " »", "ce qui change", el("div", {},
      el("div.be-c-phrase", {}, c.phrase),
      (b.idee || "").trim() ? UI.banniere("", "La big idea actuelle sera archivée, datée, avec ce motif : « "
        + b.idee.slice(0, 120) + (b.idee.length > 120 ? "…" : "") + " ». Rien n'est perdu.") : null,
      r.n > 1 ? UI.banniere("rouge", "Les propositions ont " + r.n + " racines différentes : retenir celle-ci, "
        + "c'est aussi choisir son insight contre les autres. Le motif doit le dire.") : null,
      !racine(p, c) ? UI.banniere("rouge", "Cette proposition ne remonte à aucun insight : elle ne se défendra qu'au goût.") : null,
      el("div.form", {}, el("div.champ", {}, el("label", { "for": "be-motif" }, "L'argument"), motif)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!motif.value.trim()) { AVIS.refus("Un arbitrage sans argument écrit n'en est pas un."); return; }
          retenir(p, c, motif.value.trim());
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Retenir comme big idea"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Revenir"))
    ));
  }

  return { GABARITS: GABARITS, ENDROITS: ENDROITS, gabarit: gabarit, liste: liste,
    vivantes: vivantes, racine: racine, racines: racines, manques: manques, etat: etat,
    creer: creer, retenir: retenir, contresigner: contresigner, bloc: bloc, editer: editer };
})();
