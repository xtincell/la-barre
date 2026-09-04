/* vue-constater.js — est-ce que mes décisions produisent l'effet attendu ?
 *
 * La cinquième intention, et celle qui manquait. Le modèle mental en nomme six —
 * trancher, arbitrer, placer, réclamer, engager, constater — et l'architecture
 * n'en couvrait que cinq. Deux écrans se sont retrouvés orphelins parce qu'ils
 * n'avaient nulle part où aller : les indicateurs de ma fiche, et qui bouscule
 * le pipeline. Ce n'était pas un oubli d'implémentation.
 *
 * Constater ne regarde pas aujourd'hui. Décider et Placer regardent aujourd'hui.
 * Constater regarde le mois et le trimestre — et c'est ce qui sort quand on
 * m'évalue.
 */

window.VUE_CONSTATER = (function () {
  var el = O.el;
  var mode = "standard";

  var MODES = [
    { cle: "standard", nom: "MON STANDARD", quoi: "ce sur quoi je suis évalué" },
    { cle: "bouscule", nom: "QUI BOUSCULE", quoi: "ce que les retours ont coûté, et à qui" },
    { cle: "equipe", nom: "MON ÉQUIPE", quoi: "ce qu'ils ont produit, et ce que je leur ai dit" },
    { cle: "fin", nom: "MA FIN DE MOIS", quoi: "ce qui sort, compilé sans ressaisie" },
    { cle: "jurisprudence", nom: "LA JURISPRUDENCE", quoi: "comment j'ai tranché, et sur quel critère" },
  ];

  function rendre(hote, arg) {
    if (arg && MODES.some(function (m) { return m.cle === arg; })) mode = arg;

    hote.className = "zone";
    O.vider(hote);

    var s = standardChiffres();

    hote.appendChild(el("div.dc", {},
      el("div.dc-tete", {},
        el("div.dct-c", {},
          el("h2", {}, titre(s)),
          el("div.dct-q", {}, sousTitre(s)))),

      el("div.dc-modes", {}, MODES.map(function (m) {
        return el("button.dcm" + (mode === m.cle ? ".ici" : ""), { type: "button",
          onclick: function () { mode = m.cle; rendre(hote); } },
          el("span.dcm-n", {}, m.nom),
          el("span.dcm-q", {}, m.quoi));
      })),

      el("div.dc-corps", {},
        mode === "standard" ? standard(s, hote)
          : mode === "equipe" ? VUE_EQUIPE.rendre(hote, function () { rendre(hote); })
          : mode === "fin" ? VUE_FINDEMOIS.rendre(hote, function () { rendre(hote); })
          : mode === "jurisprudence" ? VUE_JURISPRUDENCE.rendre(hote, function () { rendre(hote); })
          : bouscule(hote))
    ));
  }

  /* Le titre dit le pire état, le sous-titre dit sa conséquence.
   *
   * Et il dit le pire état DE CE QU'ON REGARDE. La plus grosse phrase de
   * l'écran était calculée pour l'intention entière : la jurisprudence
   * s'ouvrait sur « 4 briefs sans go final », une affaire de Décider, pendant
   * que le recueil disait autre chose juste en dessous. Un titre qui ne parle
   * pas de ce qu'on a sous les yeux n'est pas un raccourci : c'est un mensonge
   * d'affichage, et il apprend à ne plus lire le titre.
   *
   * Chaque mode sait déjà calculer son propre état. Il ne s'agit que de
   * l'appeler. */
  function pire(s) {
    if (mode === "bouscule") return pireBouscule();
    if (mode === "equipe") return pireEquipe();
    if (mode === "fin") return pireFin();
    if (mode === "jurisprudence") return pireJurisprudence();
    return pireStandard(s);
  }

  /* Ce que les retours ont coûté, et à qui. Ce qui n'est ni absorbé ni facturé
   * passe devant : c'est une dépense réelle que personne ne porte. */
  function pireBouscule() {
    var as = FEEDBACK.parAuteur();
    if (!as.length) {
      return { cle: "sansRetour", t: "Aucun retour enregistré",
        q: "Tant qu'ils vivent dans les messageries, les retours n'ont ni date ni auteur — "
          + "et rien de ce qu'ils coûtent ne s'oppose en négociation." };
    }
    var attente = as.reduce(function (n, a) {
      return n + (a.ouverts ? Math.max(0, a.jours - a.absorbes - a.factures) : 0); }, 0);
    var abs = as.reduce(function (n, a) { return n + a.absorbes; }, 0);

    if (attente > abs) {
      return { cle: "suspens", t: O.decimal(attente) + (attente > 1 ? " jours en suspens" : " jour en suspens"),
        q: "Le travail est fait, la dépense est réelle, et personne n'a dit qui la porte. "
          + "Un retour sans issue ne se facture jamais rétroactivement." };
    }
    if (abs) {
      var tete = as[0];
      return { cle: "absorbe", t: O.decimal(abs) + (abs > 1 ? " jours absorbés" : " jour absorbé"),
        q: "Payés par l'agence, dont " + O.decimal(tete.jours) + " sur " + tete.nom
          + ". C'est ce chiffre qui rend la clause de reprise crédible — pas le "
          + "paragraphe du contrat." };
    }
    return { cle: "tenuRetours", t: "Aucune reprise absorbée",
      q: "Tous les retours enregistrés ont trouvé leur issue. Le compteur ne se remet "
        + "pas à zéro d'une année sur l'autre : c'est ce qui lui donne son poids." };
  }

  /* Ce que mon équipe produit, et ce que sa fiche lui impose. Une casquette
   * sans part déclarée fausse la charge : elle passe avant tout le reste. */
  function pireEquipe() {
    var gens = window.EQUIPE ? EQUIPE.encadres() : [];
    if (!gens.length) {
      return { cle: "sansEquipe", t: "Personne à encadrer au dépôt",
        q: "Sans personnes déclarées, « progression mesurée des créatifs encadrés » "
          + "n'a pas de sujet — et l'indicateur reste à zéro par construction." };
    }
    var sansPart = [], echus = [], jamais = [], vierges = [];
    gens.forEach(function (pe) {
      EQUIPE.cumuls(pe.id).forEach(function (c) {
        if (c.etat === "sansPart") sansPart.push(pe);
        else if (c.etat === "echue") echus.push(pe);
      });
      EQUIPE.engagements(pe.id).forEach(function (g) {
        if (g.etat === "jamais") jamais.push(pe.nom);
      });
      var b = EQUIPE.bilan(pe.id);
      if (b && b.jamaisSurUnePiste) vierges.push(pe.nom);
    });

    if (sansPart.length) {
      return { cle: "sansPart",
        t: sansPart.length + (sansPart.length > 1 ? " cumuls sans part déclarée" : " cumul sans part déclarée"),
        q: "La charge de " + sansPart.map(function (p) { return p.nom.split(" ")[0]; }).join(", ")
          + " est fausse tant que la part n'est pas écrite — donc l'affectation qui s'y "
          + "appuie l'est aussi." };
    }
    if (echus.length) {
      return { cle: "cumulEchu",
        t: echus.length + (echus.length > 1 ? " cumuls échus" : " cumul échu"),
        q: "Un cumul qu'on prolonge sans le dire est un poste que l'agence occupe sans "
          + "l'avoir écrit. Trois issues : prolongé avec motif, transformé en poste, ou rendu." };
    }
    if (jamais.length) {
      var n = jamais.length;
      return { cle: "engagement",
        t: n + (n > 1 ? " engagements jamais déposés" : " engagement jamais déposé"),
        q: "Veilles, notes, démonstrations : évalués dans leur fiche, invisibles partout "
          + "ailleurs — donc sacrifiés les premiers quand la production déborde." };
    }
    if (vierges.length) {
      return { cle: "jamaisAffecte",
        t: vierges.length + (vierges.length > 1 ? " créatifs sans piste confiée" : " créatif sans piste confiée"),
        q: vierges.join(", ") + " — « détecter les talents et leur confier des "
          + "responsabilités dès qu'ils sont prêts » ne se constate que par les pistes confiées." };
    }
    return { cle: "equipeTenue", t: "L'encadrement tient",
      q: "Cumuls déclarés et à jour, engagements déposés, chacun a eu une piste. Le plan "
        + "de progression trimestriel se compile sans rien reconstituer de mémoire." };
  }

  /* La feuille de fin de mois. Une mesure sans assise n'est pas un mauvais
   * résultat : c'est une mesure qui n'existe pas. */
  function pireFin() {
    var d = BILAN.compiler("mois");
    var ms = [];
    d.blocs.forEach(function (b) { (b.mesures || []).forEach(function (m) { ms.push(m); }); });
    var creuses = ms.filter(function (m) { return m.assise === 0; });

    if (creuses.length) {
      return { cle: "creuses",
        t: creuses.length + (creuses.length > 1 ? " mesures sans assise" : " mesure sans assise"),
        q: "« " + creuses.map(function (m) { return m.nom; }).join(" », « ") + " ». "
          + "Un zéro faute de registre se lit comme un résultat — et n'en est pas un. "
          + "Ce n'est pas du travail non fait, c'est du travail non enregistré." };
    }
    return { cle: "feuilleTenue", t: "La feuille est défendable",
      q: "Chaque mesure repose sur des faits datés. La période court jusqu'à aujourd'hui : "
        + "ce qui sort maintenant peut encore bouger d'ici ce soir." };
  }

  /* Le recueil des arbitrages. Un critère tranché dans les deux sens est un
   * critère mal écrit — c'est le seul défaut qui rende le recueil trompeur. */
  function pireJurisprudence() {
    var e = JURISPRUDENCE.etat();

    if (e.incoherents.length) {
      var n = e.incoherents.length;
      return { cle: "incoherent",
        t: n + (n > 1 ? " critères tranchés dans les deux sens" : " critère tranché dans les deux sens"),
        q: "« " + e.incoherents[0].critere.texte + " » — c'est le critère qui est mal "
          + "écrit, pas la décision : deux situations différentes s'y rangent." };
    }
    if (e.aEcrire.length) {
      var k = e.aEcrire.length;
      return { cle: "aEcrire",
        t: k + (k > 1 ? " motifs demandent à devenir des critères" : " motif demande à devenir un critère"),
        q: "Reprochés plusieurs fois à la main, portés par aucune ligne écrite. Tant "
          + "qu'ils ne le sont pas, ils sont défendables par moi et indéfendables par un autre." };
    }
    if (e.total < 5) {
      return { cle: "recueilMince",
        t: e.total ? e.total + (e.total > 1 ? " arbitrages motivés" : " arbitrage motivé")
          : "Aucun arbitrage motivé",
        q: "Trop peu pour qu'une ligne se dégage. C'est ce qui reste quand je ne suis pas "
          + "dans la pièce — sans lui, le poste ne se transmet pas, il se subit." };
    }
    if (!e.criteresEtablis) {
      return { cle: "aucunEtabli", t: "Aucun critère n'a servi trois fois",
        q: "Rien n'est encore une jurisprudence, tout est encore une décision. Un critère "
          + "invoqué une seule fois ne permet à personne d'autre de trancher pareil." };
    }
    return { cle: "recueilTenu",
      t: e.criteresEtablis + (e.criteresEtablis > 1 ? " critères établis" : " critère établi"),
      q: "Sur " + e.total + " arbitrages écrits. Quelqu'un pourrait trancher comme moi "
        + "en lisant ces cas — c'est exactement ce que la fiche appelle transmettre." };
  }

  /* Mon standard. L'ordre n'est pas arbitraire : ce qui est sur moi passe
   * devant ce qui est sur les autres, et ce qui coûte de l'argent devant ce
   * qui coûte du temps. */
  function pireStandard(s) {
    if (s.verdict !== null && s.verdict > s.cibleVerdict) {
      return { cle: "verdict",
        t: "Mon délai de verdict est de " + s.verdict + " jours",
        q: "La dérive nommée dans ma fiche : « une dépendance qui bloque toute décision "
          + "en son absence ». C'est la seule mesure qui porte sur moi, et c'est pour ça "
          + "qu'elle est inconfortable." };
    }
    if (s.depassements) {
      return { cle: "tours",
        t: s.joursDepasses + " jours au-delà du périmètre vendu",
        q: "Sur " + s.depassements + (s.depassements > 1 ? " pièces" : " pièce")
          + ". C'est ce chiffre qui rend la clause de reprise crédible en négociation — "
          + "pas le paragraphe du contrat." };
    }
    if (s.reprise !== null && s.reprise > 20) {
      return { cle: "reprise",
        t: s.reprise + " % des livrables repartent en reprise",
        q: "L'exigence se mesure au taux de reprise, y compris sur les petits projets. "
          + "Le compteur ne se remet pas à zéro d'un mois sur l'autre." };
    }
    if (s.projets - s.traites) {
      var n = s.projets - s.traites;
      return { cle: "briefs",
        t: n + (n > 1 ? " briefs sans go final" : " brief sans go final"),
        q: "Je suis évalué sur les briefs traités. Sans contreseing de la Clientèle, "
          + "un brief mis en forme n'engage personne — et ne compte pas comme traité." };
    }
    if (s.idees - s.retenues) {
      var m = s.idees - s.retenues;
      return { cle: "arbitrage",
        t: m + (m > 1 ? " big ideas sans route retenue" : " big idea sans route retenue"),
        q: "Je suis évalué sur les big ideas retenues et alignées au brief. Une idée sans "
          + "route arbitrée ne produit rien de mesurable." };
    }
    if (s.props - s.avecArg) {
      var k = s.props - s.avecArg;
      return { cle: "propositions",
        t: k + (k > 1 ? " propositions sans argument" : " proposition sans argument"),
        q: "Je suis évalué sur la qualité des propositions de mon équipe. Sans sacrifice "
          + "ni argument écrits, elles ne se défendent que par le goût — et sont "
          + "refusables au §8." };
    }
    return { cle: "tenu", t: "Le standard tient",
      q: "Délai de verdict tenu, reprises contenues, briefs contresignés, routes "
        + "arbitrées, propositions argumentées. Ce qui sort en fin de mois se calcule "
        + "tout seul." };
  }

  function titre(s) { return pire(s).t; }
  function sousTitre(s) { return pire(s).q; }

  /* ————————————————————— Mon standard ————————————————————— */

  /* Les chiffres vivent dans BILAN : la fin de mois et Mon standard lisent la
   * même fonction, sans fenêtre ici et avec une fenêtre là-bas. Deux calculs
   * séparés donneraient deux vérités sur le même fait. */
  function standardChiffres() { return BILAN.chiffres(null); }

  /* Les six indicateurs, mais pas à poids égal.
   *
   * Six chiffres de même taille, c'est six chiffres qu'on ne lit pas. Un
   * indicateur doit provoquer une décision : celui qui décroche prend l'écran,
   * avec sa cause et le geste qui le remonte. Les cinq autres se réduisent à
   * une ligne — ils restent lisibles, ils ne réclament rien. */
  function indicateurs(s) {
    return [
      { cle: "briefs", v: s.traites + " / " + s.projets, nom: "briefs traités",
        ko: s.projets > 0 && s.traites < s.projets,
        quoi: s.projets - s.traites
          ? (s.projets - s.traites) + (s.projets - s.traites > 1 ? " sans go final : ils n'engagent" : " sans go final : il n'engage") + " la Clientèle sur rien"
          : "tous contresignés",
        pourquoi: "Sans contreseing de la Clientèle, un brief mis en forme ne compte pas comme traité — et c'est la première ligne sur laquelle je suis évalué.",
        geste: { nom: "Réclamer le contreseing →", ou: "#/decider/du" } },

      { cle: "idees", v: s.retenues + " / " + s.idees, nom: "big ideas retenues",
        ko: s.retenues < s.idees,
        quoi: s.alignees + (s.alignees > 1 ? " alignées" : " alignée") + " à un brief accepté",
        pourquoi: "Une idée sans route arbitrée ne produit rien de mesurable.",
        geste: { nom: "Arbitrer les routes →", ou: "#/decider/file" } },

      { cle: "args", v: s.avecArg + " / " + s.props, nom: "propositions argumentées",
        ko: s.avecArg < s.props,
        quoi: s.props - s.avecArg
          ? (s.props - s.avecArg) + " sans sacrifice ou sans argument — refusables au §8"
          : "toutes défendables",
        pourquoi: "Sans sacrifice ni argument écrits, une proposition ne se défend que par le goût.",
        geste: null },

      { cle: "premier", v: String(s.premiere), nom: "retenues au premier tour",
        ko: false,
        quoi: s.props ? Math.round((s.premiere / s.props) * 100) + " % des propositions"
          : "aucune proposition présentée",
        pourquoi: "", geste: null },

      { cle: "verdict", v: s.verdict === null ? "—" : s.verdict + " j",
        nom: "mon délai de verdict",
        ko: s.verdict !== null && s.verdict > s.cibleVerdict,
        creux: s.verdict === null,
        quoi: s.verdict === null
          ? "aucun verdict daté : le seul indicateur qui porte sur moi ne se calcule pas"
          : s.verdict > s.cibleVerdict
            ? "au-delà de ma cible de " + s.cibleVerdict + " j"
            : "sous ma cible de " + s.cibleVerdict + " j",
        pourquoi: "C'est la dérive nommée dans ma fiche : « une dépendance qui bloque toute décision en son absence ».",
        geste: { nom: "Trancher ce qui attend →", ou: "#/decider/file" } },

      { cle: "reprise", v: s.reprise === null ? "—" : s.reprise + " %",
        nom: "livrables repris",
        ko: s.reprise !== null && s.reprise > 20,
        creux: s.reprise === null,
        quoi: s.reprise === null
          ? "aucune pièce ne porte de version : le taux n'a pas de dénominateur"
          : s.reprises + " sur " + s.pieces + " pièces",
        pourquoi: "L'exigence se mesure au taux de reprise, y compris sur les petits projets.",
        geste: null },
    ];
  }

  function standard(s, hote) {
    var ind = indicateurs(s);
    /* Celui qui décroche prend l'écran. À défaut, le premier qui n'a pas
     * d'assise — un registre vide se corrige aussi. */
    var gros = ind.filter(function (i) { return i.ko; })[0]
      || ind.filter(function (i) { return i.creux; })[0]
      || ind[0];
    var autres = ind.filter(function (i) { return i !== gros; });

    return el("div", {},
      el("div.st-gros" + (gros.ko ? ".ko" : gros.creux ? ".creux" : ".ok"), {},
        el("div.stg-r", {}, gros.ko ? "L'INDICATEUR QUI DÉCROCHE  ·  1 SUR 6"
          : gros.creux ? "L'INDICATEUR QUI NE SE CALCULE PAS  ·  1 SUR 6"
          : "MON STANDARD  ·  1 SUR 6"),
        el("div.stg-h", {},
          el("span.stg-v", {}, gros.v),
          el("span.stg-n", {}, gros.nom)),
        el("div.stg-q", {}, gros.quoi),
        gros.pourquoi
          ? el("div.stg-p", {},
              el("span", {}, "POURQUOI ÇA COMPTE"),
              el("p", {}, gros.pourquoi))
          : null,
        gros.geste
          ? el("div.stg-g", {}, el("a.b.or", { href: gros.geste.ou }, gros.geste.nom))
          : null),

      /* Les cinq autres : lisibles, sans rien réclamer. */
      el("div.st-cinq", {}, autres.map(function (i) {
        return el("div.stc" + (i.creux ? ".creux" : i.ko ? ".ko" : ""), {},
          el("span.stc-v", {}, i.v),
          el("span.stc-n", {}, i.nom),
          el("span.stc-q", {}, i.quoi));
      })),

      /* L'exigence par compte et par marché : la ligne « constante y compris sur
       * les petits projets » de la grille d'évaluation. */
      ventilation("PAR COMPTE", s.parCompte),
      ventilation("PAR MARCHÉ", s.parMarche),

      s.depassements
        ? el("div.cs-bloc", {},
            el("div.csb-t", {}, "AU-DELÀ DU PÉRIMÈTRE VENDU"),
            UI.banniere("rouge", s.depassements
              + (s.depassements > 1 ? " pièces ont consommé" : " pièce a consommé")
              + " plus de tours que ce qui a été vendu — soit "
              + s.joursDepasses + " jours. C'est ce chiffre qui rend la clause de reprise "
              + "crédible en négociation, pas le paragraphe du contrat."),
            el("div.form-actions", {},
              el("a.b", { href: "#/constater/bouscule" }, "voir qui les a demandés →")))
        : null,

      el("div.st-cibles", {},
        el("button.b.nu", { type: "button", onclick: function () { cibles(hote); } },
          "mes cibles"),
        el("span", {}, "ce que je vise sur ces six lignes — modifiable"))
    );
  }

  /* Les cibles ne sont plus au premier plan : elles ne provoquent aucune
   * décision quotidienne. Elles restent à portée, et modifiables. */
  function cibles(hote) {
    var os = OBJECTIFS.tous();
    PANNEAU.ouvrir("Mes cibles", os.length + " lignes de ma fiche", el("div", {},
      UI.banniere("", "Une cible qu'on ne tient jamais cesse d'être lue. Elles se règlent ici, "
        + "et sortent en fin de mois qu'elles soient tenues ou non."),
      el("div.ci-l", {}, os.map(function (o) {
        var ton = o.tenu === null ? "flou" : o.tenu ? "tenu" : "manque";
        return el("button.ci-o." + ton, { type: "button",
          onclick: function () { detailObjectif(o, hote); } },
          el("span.cio-v", {}, o.reel === null ? "—" : String(o.reel)),
          el("span.cio-c", {}, o.reel === null ? "pas encore mesurable"
            : "sur une cible de " + o.cible + " " + o.unite),
          el("span.cio-n", {}, o.nom));
      })))
    );
  }

  function ventilation(t, m) {
    var cles = Object.keys(m);
    if (!cles.length) return null;
    var max = cles.reduce(function (n, k) {
      var r = m[k].n ? m[k].r / m[k].n : 0; return Math.max(n, r); }, 0) || 1;

    return el("div.cs-bloc", {},
      el("div.csb-t", {}, t),
      el("div.cs-v", {}, cles.sort(function (a, b) {
        return (m[b].r / m[b].n) - (m[a].r / m[a].n);
      }).map(function (k) {
        var part = m[k].n ? Math.round((m[k].r / m[k].n) * 100) : 0;
        return el("div.cs-l", {},
          el("span.csl-n", {}, k),
          el("span.csl-b", {}, el("i", {
            style: { width: Math.round((part / (max * 100)) * 100) + "%" } })),
          el("span.csl-c" + (part > 20 ? ".alerte" : ""), {},
            part + " %  ·  " + m[k].r + " sur " + m[k].n));
      })));
  }

  function detailObjectif(o, hote) {
    PANNEAU.ouvrir(o.nom, o.reel === null ? "pas encore mesurable"
      : o.reel + " / " + o.cible + " " + o.unite, el("div", {},
      el("p.mq-note", {}, o.source),
      o.reel === null
        ? UI.banniere("", "Cet indicateur n'a pas encore de quoi se calculer. Ce n'est pas "
            + "un mauvais résultat — c'est une donnée qui manque, et elle se renseigne en "
            + "travaillant, pas en la saisissant.")
        : o.tenu === false
          ? UI.banniere("rouge", "Écart de " + Math.abs(o.ecart) + " " + o.unite
              + " sur la cible. Cet indicateur sort en fin de mois, tenu ou pas.")
          : UI.banniere("vert", "Tenu."),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          PANNEAU.demander("Changer ma cible", {
            label: o.nom + "  (" + o.unite + ")", valeur: o.cible, type: "number",
            aide: "Une cible qu'on ne tient jamais cesse d'être lue.",
            requis: "Une cible vide n'en est pas une.",
          }, function (v) {
            if (isNaN(Number(v))) return;
            OBJECTIFS.fixer(o.cle, Number(v));
            PANNEAU.fermer(); rendre(hote);
          });
        } }, "Changer ma cible"))));
  }

  function kpi(v, t, s, ton) {
    return el("div.pi-k" + (ton ? "." + ton : ""), {},
      el("b", {}, v), el("span.pik-t", {}, t), el("span.pik-s", {}, s));
  }

  /* ————————————————————— Qui bouscule ————————————————————— */

  /* Ce n'est pas un procès, c'est un chiffre. Sans lui, la renégociation de fin
   * de trimestre se fait de mémoire — et de mémoire, c'est toujours l'agence
   * qui a tort. */
  /* ————————————————————— Qui bouscule : un grand livre ————————————————————— */

  /* Des tuiles de compteurs disaient des totaux. Ce qu'il faut voir, c'est une
   * ASYMÉTRIE : ce que l'agence a payé, contre ce qu'elle a refacturé. Un axe
   * central, les jours absorbés à gauche, les jours facturés à droite, une
   * ligne par auteur. Le déséquilibre se voit avant de se lire.
   *
   * C'est ce chiffre qui rend la clause de reprise crédible en négociation —
   * pas le paragraphe du contrat. Il doit se photographier. */

  function bouscule(hote) {
    var as = FEEDBACK.parAuteur();
    if (!as.length) {
      return el("p.rien", {}, "Aucun retour enregistré : personne n'est encore comptable "
        + "de rien. Tant qu'ils vivent dans les messageries, ils n'ont ni date ni auteur.");
    }
    var abs = as.reduce(function (n, a) { return n + a.absorbes; }, 0);
    var fac = as.reduce(function (n, a) { return n + a.factures; }, 0);
    var ouverts = as.reduce(function (n, a) { return n + a.ouverts; }, 0);
    var jourFCFA = 300000;
    var max = as.reduce(function (n, a) {
      return Math.max(n, a.absorbes, a.factures, a.ouverts ? a.jours : 0); }, 1);

    /* Ce qui n'est ni absorbé ni facturé n'est pas un zéro : c'est une somme
     * en suspens. Tant qu'elle domine, c'est elle le chiffre du haut — sinon
     * le grand livre annonce « 0 FCFA » sur une année qui a déjà coûté. */
    var attente = as.reduce(function (n, a) {
      return n + (a.ouverts ? Math.max(0, a.jours - a.absorbes - a.factures) : 0); }, 0);
    var suspendu = attente > abs;
    var chiffre = suspendu ? attente : abs;

    return el("div.gl" + (suspendu ? ".susp" : ""), {},
      el("div.gl-t", {},
        el("span.glt-c", {}, O.decimal(chiffre)
          + (chiffre > 1 ? " jours " : " jour ") + (suspendu ? "en suspens" : "absorbés")),
        el("span.glt-m", {}, "soit " + O.milliers(chiffre * jourFCFA) + " FCFA"),
        el("p", {}, suspendu
          ? "Ni absorbés ni facturés : le travail est fait, la dépense est réelle, et "
            + "personne n'a dit qui la porte. Le grand livre n'affiche pas zéro parce que "
            + "rien n'a coûté — il l'affiche parce que rien n'a été tranché."
            + (abs ? "  " + O.decimal(abs) + " jours sont déjà absorbés par ailleurs." : "")
          : "Payés par l'agence cette année, contre "
            + O.decimal(fac) + (fac > 1 ? " jours facturés" : " jour facturé") + ". "
            + "C'est ce chiffre qui rend la clause de reprise crédible en négociation — "
            + "pas le paragraphe du contrat.")),

      el("div.gl-h", {},
        el("span.glh-a", {}, "ABSORBÉ"),
        el("span.glh-x", {}),
        el("span.glh-f", {}, "FACTURÉ")),

      el("div.gl-l", {}, as.map(function (a) {
        var client = FEEDBACK.estClient(a.cle);
        var pe = DEPOT.trouve("personnes", a.cle) || DEPOT.trouve("contacts", a.cle);
        var enAttente = a.ouverts ? a.jours - a.absorbes - a.factures : 0;
        return el("div.gl-r", {},
          el("div.glr-q", {},
            /* Un « ? » sur trois lignes ne dit rien. Un contact client n'a pas
             * de poste dans la maison, mais il a un nom — et c'est lui qu'on
             * lit dans un grand livre. */
            UI.avatar(pe && pe.poste ? pe : { nom: a.nom, poste: client ? "client" : "interne" }, 32),
            el("div", {},
              el("div.glrq-n", {}, a.nom, client ? UI.eti("client", "or") : UI.eti("interne", "terne")),
              el("div.glrq-p", {}, a.n + (a.n > 1 ? " retours" : " retour")
                + "  ·  " + a.assets + (a.assets > 1 ? " pièces touchées" : " pièce touchée")))),

          /* Le plateau gauche : ce que l'agence a payé. */
          el("div.glr-a", {},
            a.absorbes
              ? el("span.glr-b.abs", { style: { width: Math.round((a.absorbes / max) * 100) + "%" } },
                  el("b", {}, O.decimal(a.absorbes) + " j"))
              : null,
            enAttente > 0
              ? el("span.glr-b.att", { style: { width: Math.round((enAttente / max) * 100) + "%" },
                  title: "non tranché : ni absorbé, ni facturé" },
                  el("b", {}, O.decimal(enAttente) + " j"))
              : null),

          el("div.glr-x", {}),

          /* Le plateau droit : ce qui est parti au client. */
          el("div.glr-f", {},
            a.factures
              ? el("span.glr-b.fac", { style: { width: Math.round((a.factures / max) * 100) + "%" } },
                  el("b", {}, O.decimal(a.factures) + " j"))
              : el("span.glr-rien", {}, "rien de facturé")),

          /* Ce qui compose la ligne — les retours eux-mêmes. */
          el("div.glr-d", {}, retoursDe(a.cle).slice(0, 3).map(function (f) {
            var i = FEEDBACK.impact(f);
            return el("div.glrd", {},
              el("span.glrd-d", {}, O.joli(f.quand)),
              el("span.glrd-t", {}, String(f.texte).slice(0, 78)
                + (String(f.texte).length > 78 ? "…" : "")),
              el("span.glrd-n", {}, (f.niveau ? "niveau " + f.niveau + "  ·  " : "")
                + i.assets + (i.assets > 1 ? " pièces" : " pièce")));
          })));
      })),

      ouverts
        ? el("div.gl-g", {},
            el("div.glg-t", {}, "DEUX ISSUES, JAMAIS TROIS"),
            el("p", {}, ouverts + (ouverts > 1 ? " retours ne sont ni absorbés ni facturés" : " retour n'est ni absorbé ni facturé")
              + ". Tant que ce n'est pas dit, les pièces restent suspendues et le coût reste chez nous."),
            el("div.form-actions", {},
              el("a.b.or", { href: "#/decider/file" }, "Trancher les retours →")))
        : abs > fac
          ? UI.banniere("rouge", "Plus de jours absorbés que facturés. La clause de reprise "
              + "existe et ne sert pas : c'est une décision commerciale, pas une fatalité.")
          : null
    );
  }

  function retoursDe(cle) {
    return FEEDBACK.tous().filter(function (f) { return (f.auteur || "inconnu") === cle; })
      .sort(function (a, b) { return String(b.quand).localeCompare(String(a.quand)); });
  }

  return { rendre: rendre, titre: "Constater", MODES: MODES,
    chiffres: standardChiffres };
})();
