/* compilateur.js — les deux documents qui font passer d'un temps au suivant.
 *
 * Un atelier ne se convoque pas sur une intuition : il se convoque sur un
 * cadrage. Une production ne s'ouvre pas sur un accord oral : elle s'ouvre sur
 * une conception. Ces deux documents existaient en morceaux, éparpillés dans
 * six sections ; personne ne pouvait les lire d'un trait, encore moins les
 * remettre à quelqu'un.
 *
 * Ils ne se saisissent pas : ils se compilent. Et ils disent d'abord s'ils
 * sont recevables — un document de cadrage incomplet convoque un atelier qui
 * tournera à vide.
 */

window.COMPILATEUR = (function () {
  var el = O.el;

  var DOCS = {
    cadrage: {
      nom: "Document de cadrage", court: "Cadrage",
      pour: "l'atelier", ouvre: "la conception",
      quoi: "ce qui est demandé, par qui, dans quel cadre — et ce qu'on ne fera pas",
      sans: "l'atelier partira d'une page blanche et produira des idées hors sujet",
      sections: ["identite", "brief", "socle", "strategie"],
    },
    conception: {
      nom: "Document de conception", court: "Conception",
      pour: "la production", ouvre: "l'exécution",
      quoi: "l'idée retenue, la piste qui la porte, son dispositif et son calendrier",
      sans: "on fabriquera sans savoir quel concept fait autorité, ni pour quand",
      sections: ["bigidea", "pistes"],
    },
  };

  /* ————————————————————— La recevabilité ————————————————————— */

  function controles(p, cle) {
    return cle === "cadrage" ? controlesCadrage(p) : controlesConception(p);
  }


  /* Le socle a quitté le projet pour le vault de la marque : il vaut plusieurs
   * années et n'appartient pas au dossier qui l'a écrit en premier. Le
   * compilateur doit le lire là — sinon il déclare manquant ce qui est écrit,
   * et un document de cadrage ment sur ce dont il dispose.
   *
   * Une campagne à plusieurs marques a plusieurs socles. Pour les contrôles, on
   * regarde si CHAQUE marque servie a la ligne : un champ écrit sur une seule
   * des trois ne cadre pas la campagne. */
  function socleDe(p) {
    var mqs = window.MARQUE ? MARQUE.toutes(p) : [];
    if (!window.VAULT || !mqs.length) return p.sections.socle || {};
    var out = {};
    (VAULT.CHAMPS || []).forEach(function (c) {
      var vals = mqs.map(function (m) { return VAULT.herite("marque", m.id, c.cle).valeur; })
        .filter(function (v) {
          return v !== null && v !== undefined
            && (Array.isArray(v) ? v.length : String(v).trim()); });
      /* Toutes les marques doivent l'avoir : sinon le cadrage est partiel. */
      if (vals.length !== mqs.length) return;
      if (Array.isArray(vals[0])) {
        var plat = [];
        vals.forEach(function (v) { v.forEach(function (x) {
          if (plat.indexOf(x) === -1) plat.push(x); }); });
        out[c.cle] = plat;
      } else if (mqs.length === 1) {
        out[c.cle] = vals[0];
      } else {
        /* Plusieurs marques, plusieurs formulations : on les attribue. */
        out[c.cle] = mqs.map(function (m, i) { return m.nom + " — " + vals[i]; }).join("\n");
      }
    });
    /* Ce que le dossier porte encore en propre l'emporte : une campagne peut
     * spécialiser, et on ne lui retire pas ce qu'elle a écrit. */
    var local = p.sections.socle || {};
    Object.keys(local).forEach(function (k) {
      var v = local[k];
      if (v !== null && v !== undefined && (Array.isArray(v) ? v.length : String(v).trim()))
        out[k] = v;
    });
    return out;
  }

  function controlesCadrage(p) {
    var i = p.sections.identite || {}, b = p.sections.brief || {},
        s = socleDe(p), st = p.sections.strategie || {};
    var eb = CHAMPS.etat("brief", b);
    var infs = window.INFERENCE ? INFERENCE.liste(p).filter(function (x) {
      return ["identite", "brief", "socle", "strategie"].indexOf(x.section) !== -1; }) : [];

    return [
      { quoi: "Le problème réel", ok: !!b.probleme, poids: 5,
        cout: "l'atelier travaillera sur la demande exprimée, pas sur le problème — et produira une réponse à côté" },
      { quoi: "La cible et sa tension", ok: !!b.cible, poids: 5,
        cout: "on cherchera une idée sans savoir à qui elle parle" },
      { quoi: "L'insight", ok: !!(b.insight || st.insight), poids: 4,
        cout: "rien pour accrocher : l'atelier tournera sur des jeux de mots" },
      { quoi: "Le territoire", ok: !!st.territoire, poids: 4,
        cout: "aucun cadre : toutes les idées se vaudront, et aucune ne sera arbitrable" },
      { quoi: "L'idée directrice de la plateforme de marque", ok: !!s.idee_directrice, poids: 4,
        cout: "la campagne pourra être refusée en revue sans recours" },
      { quoi: "Le ton et les interdits", ok: !!(b.ton || s.ton || (s.jamais || []).length), poids: 3,
        cout: "on découvrira les interdits en présentation, quand il sera trop tard" },
      { quoi: "Le périmètre de livrables", ok: (b.livrables_attendus || []).length > 0, poids: 4,
        cout: "on ne saura pas ce qu'il faut produire — ni ce qui est hors périmètre" },
      { quoi: "Décideur nommé", ok: !!i.decideur, poids: 5,
        cout: "aucune validation ne prendra effet" },
      { quoi: "Fenêtre de diffusion", ok: !!i.fenetre, poids: 4,
        cout: "aucun rétroplanning n'est calculable" },
      { quoi: "Critères de succès", ok: (b.kpis || []).length > 0, poids: 3,
        cout: "le bilan de campagne n'aura pas de dénominateur" },
      { quoi: "Rien ne tient sur une inférence", ok: infs.length === 0, poids: 3,
        cout: infs.length + " champs sont inférés : l'atelier travaillera sur du raisonné, pas sur du reçu" },
      { quoi: "Le logo au dossier", ok: !!(MARQUE.de(p) && MARQUE.logo(MARQUE.de(p).id)), poids: 4,
        cout: "aucun logo : chaque exécutant ira le chercher ailleurs, et le trouvera faux" },
      { quoi: "La gamme déclarée", ok: gammeDeLaCampagne(p, MARQUE.de(p)).length > 0, poids: 3,
        cout: "on ne sait pas ce qu'on vend — ni quel SKU un KV a le droit de montrer" },
      { quoi: "Brief contresigné", ok: !!(p.goFinal && p.goFinal.recu_le), poids: 4,
        cout: "le brief n'a pas de go final : il n'engage la Clientèle sur rien" },
    ];
  }

  function controlesConception(p) {
    var b = p.sections.bigidea || {};
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var pistes = (p.sections.pistes || []).filter(function (x) { return x.statut !== "ecartee"; });
    var e = retenue ? RETRO.etat(p, retenue) : null;
    var kvs = retenue ? KV.tous(p).filter(function (l) { return l.pisteId === retenue.id; }) : [];
    var faux = kvs.filter(function (l) { return !KV.conforme(p, l); }).length;

    return [
      { quoi: "L'idée en une phrase", ok: !!b.idee, poids: 5,
        cout: "rien à faire porter : la production inventera au fil de l'eau" },
      { quoi: "Les critères d'acceptation", ok: (b.criteres || []).length > 0, poids: 5,
        cout: "ce qui sortira ne pourra être refusé que par goût" },
      { quoi: "Une piste retenue", ok: !!retenue, poids: 5,
        cout: pistes.length > 1
          ? pistes.length + " pistes en lice : l'équipe travaille sans savoir quel concept fait autorité"
          : "aucune piste arbitrée" },
      { quoi: "Sacrifice et argument", ok: !!(retenue && retenue.sacrifice && retenue.argument), poids: 4,
        cout: "la piste ne se défend pas : le premier retour client la fera tomber" },
      { quoi: "Un dispositif", ok: !!(retenue && (retenue.dispositif || []).length), poids: 5,
        cout: "on ne saura pas quoi fabriquer, ni pour quelle activité" },
      { quoi: "Un rétroplanning", ok: !!e, poids: 4,
        cout: "aucune date de démarrage calculable : la charge ne peut être placée" },
      { quoi: "Les KV conformes", ok: kvs.length > 0 && faux === 0, poids: 5,
        cout: !kvs.length ? "aucun KV à décliner"
          : faux + " KV non conformes à leur marché — les formats hériteront de l'erreur" },
      { quoi: "Validation client", ok: !!(retenue && retenue.commercial && retenue.commercial.valide_le), poids: 4,
        cout: "produire avant validation, c'est parier : tout peut être jeté" },
      { quoi: "Bon de commande", ok: !!(retenue && retenue.commercial && retenue.commercial.paye_le), poids: 3,
        cout: "produire sans bon de commande, c'est financer le client" },
    ];
  }

  function pret(p, cle) { return controles(p, cle).every(function (c) { return c.ok; }); }

  /* ————————————————————— Le document ————————————————————— */

  function compiler(p, cle) {
    return cle === "cadrage" ? cadrage(p) : conception(p);
  }


  /* Les packs que CETTE campagne convoque. Verser tout le portefeuille dans un
   * document de cadrage, c'est demander à la production de choisir elle-même —
   * et elle choisira mal, parce que rien ne lui dit sur quels marchés on est.
   *
   * L'ordre : ce que les livrables déclarent d'abord (le fait), puis ce qui est
   * distribué sur les marchés de la campagne et dans ses catégories (le
   * probable), et rien d'autre. */
  function gammeDeLaCampagne(p, mq, seulement) {
    var mqs = window.MARQUE ? MARQUE.toutes(p) : (mq ? [mq] : []);
    if (seulement) mqs = mqs.filter(function (m) { return m.id === seulement; });
    if (!mqs.length || !window.VAULT) return mq ? MARQUE.sku(mq.id) : [];

    var pieces = (p.livrables || []).filter(function (l) { return !l.annule; });

    /* Les marchés et les catégories que la campagne sert réellement. */
    var marches = {}, cats = {};
    pieces.forEach(function (l) {
      if (l.marche) marches[l.marche] = true;
      if (l.categorie) cats[l.categorie] = true;
    });
    /* Un dossier qui n'a encore aucun livrable a quand même un périmètre : ses
     * volets déclarent les marchés. C'est le cas d'une campagne qu'on cadre
     * avant l'atelier — et c'est justement là que le cadrage sert le plus. */
    if (!Object.keys(marches).length) {
      (p.volets || []).forEach(function (v) {
        (v.marches || []).forEach(function (id) { marches[id] = true; });
      });
    }
    var aucunCadre = !Object.keys(marches).length && !Object.keys(cats).length;

    /* Ce que les livrables déclarent : c'est un fait, il passe devant. */
    var declares = {};
    pieces.forEach(function (l) {
      ((l.kv || {}).sku || []).forEach(function (id) { declares[id] = true; });
    });

    var out = [], vus = {};
    mqs.forEach(function (m) {
      VAULT.catalogue(m.id).forEach(function (s) {
        if (vus[s.id]) return;
        var retenu = !!declares[s.id];
        if (!retenu && !aucunCadre) {
          /* Une catégorie hors campagne n'a rien à faire au cadrage. */
          if (Object.keys(cats).length && s.categorie && !cats[s.categorie]) return;
          /* Un pack dont on sait qu'il n'est vendu sur aucun marché servi non plus. */
          var d = s.marches || [];
          if (d.length && !d.some(function (id) { return marches[id]; })) return;
        }
        vus[s.id] = true;
        s.__retenu = retenu;
        out.push(s);
      });
    });
    /* Les déclarés d'abord : ce sont ceux qu'on montre vraiment. */
    return out.sort(function (a, b) {
      return (b.__retenu ? 1 : 0) - (a.__retenu ? 1 : 0); });
  }

  function cadrage(p) {
    var i = p.sections.identite || {}, b = p.sections.brief || {},
        s = socleDe(p), st = p.sections.strategie || {};

    var mq = MARQUE.de(p);
    var logo = mq ? MARQUE.logo(mq.id) : null;
    var gamme = gammeDeLaCampagne(p, mq);
    var elts = (mq ? MARQUE.assets(mq.id) : []).filter(function (a) {
      return MARQUE.role(a) !== "logo"; });

    return {
      titre: "Cadrage — " + p.nom,
      sous: p.ref + "  ·  " + (i.client || "client non renseigné")
        + (i.marque ? "  ·  " + i.marque : ""),
      logo: logo,
      blocs: [
        { t: "La marque", elements: logo ? [logo] : [], gamme: gamme,
          source: mq ? mq.nom + (mq.secteur ? " · " + mq.secteur : "") : "marque non rattachée" },
        { t: "Ce qu'on nous demande", corps: b.verbatim, source: "les mots du client",
          citation: (p.briefCitations || {}).verbatim },
        { t: "Le problème réel", corps: b.probleme, source: "Strategy Planner" },
        { t: "À qui on parle", corps: b.cible },
        { t: "L'insight", corps: b.insight || st.insight, fort: true },
        { t: "La tension", corps: st.tension },
        { t: "Le territoire", corps: st.territoire, fort: true },
        { t: "La promesse", corps: b.promesse || s.promesse, fort: true },
        { t: "L'idée directrice de la marque", corps: s.idee_directrice,
          source: "plateforme de marque — pluriannuelle, elle ne se rediscute pas ici" },
        { t: "Ce qu'on peut prouver", puces: (b.rtb || []).concat(s.preuves || []) },
        { t: "Le ton, et ce qu'on ne dit jamais", corps: b.ton || s.ton,
          puces: s.jamais && s.jamais.length ? s.jamais.map(function (x) { return "jamais : " + x; }) : null },
        { t: "Les garde-fous", puces: st.gardefous },
        { t: "Ce qu'il faut produire", puces: b.livrables_attendus },
        { t: "Les mandatories", puces: b.mandatories },
        { t: "Les contraintes", corps: b.contraintes },
        { t: "Comment on mesurera", puces: b.kpis },
        elts.length ? { t: "Les éléments de marque", elements: elts,
          source: "ce qu'un DA doit avoir sous les yeux avant de dessiner" } : null,
        { t: "Le cadre de décision", lignes: [
          { q: "Décideur final", v: i.decideur },
          { q: "Qui peut annuler", v: i.tueur },
          { q: "Circuit et délai", v: i.circuit },
          { q: "Fenêtre de diffusion", v: i.fenetre },
          { q: "Échéance", v: i.echeance ? O.joli(i.echeance) : null },
          { q: "Budget", v: i.budget ? String(i.budget) + " FCFA" : null },
        ] },
      ].filter(Boolean),
      inferences: window.INFERENCE
        ? INFERENCE.liste(p).filter(function (x) {
            return DOCS.cadrage.sections.indexOf(x.section) !== -1; })
        : [],
    };
  }

  function conception(p) {
    var b = p.sections.bigidea || {};
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0]
      || (p.sections.pistes || [])[0];
    var e = retenue ? RETRO.etat(p, retenue) : null;
    var kvs = retenue ? KV.tous(p).filter(function (l) { return l.pisteId === retenue.id; }) : [];
    var auteur = b.auteur ? DEPOT.trouve("personnes", b.auteur) : null;
    var da = retenue && retenue.auteurDA ? DEPOT.trouve("personnes", retenue.auteurDA) : null;

    return {
      titre: "Conception — " + (b.campagne || p.nom),
      sous: p.ref + (retenue ? "  ·  piste « " + retenue.titre + " »" : "  ·  aucune piste retenue")
        + (retenue && retenue.statut === "retenue" ? "" : "  —  NON ARBITRÉE"),
      blocs: [
        { t: "La marque", elements: (function () {
            var mq2 = MARQUE.de(p);
            var l2 = mq2 ? MARQUE.logo(mq2.id) : null;
            return l2 ? [l2] : [];
          })(), gamme: gammeDeLaCampagne(p, MARQUE.de(p)) },
        { t: "L'idée", corps: b.idee, fort: true,
          source: auteur ? "posée par " + auteur.nom : "auteur non nommé" },
        { t: "La signature", corps: b.signature ? "« " + b.signature + " »" : null },
        { t: "La mécanique", corps: b.mecanique },
        { t: "Le rattachement à la plateforme de marque", corps: b.rattachement },
        { t: "La condition de validité", corps: b.validite,
          source: "le jour où elle tombe, l'idée tombe avec" },
        { t: "Les critères d'acceptation", puces: b.criteres,
          source: "les seuls éléments opposables au travail" },
        { t: "Les directions interdites", puces: b.interdits },
        retenue ? { t: "La piste", corps: retenue.concept, fort: true,
          source: da ? "direction artistique : " + da.nom : null } : null,
        retenue ? { t: "Ce qu'elle sacrifie", corps: retenue.sacrifice } : null,
        retenue ? { t: "L'argument", corps: retenue.argument } : null,
        retenue ? { t: "Les porteurs de reconnaissance", puces: retenue.porteurs } : null,
        retenue && (retenue.dispositif || []).length
          ? { t: "Le dispositif", activites: retenue.dispositif.map(function (a) {
              return { nom: a.nom, quoi: a.quoi,
                canal: DISPOSITIF.CANAUX[a.canal].nom, lieu: DISPOSITIF.LIEUX[a.lieu].nom,
                debut: a.debut, production: a.productionAvant,
                marches: (a.marches || []).map(function (id) {
                  var m = DEPOT.trouve("marches", id); return m ? m.code : "?"; }).join(" · ") };
            }) }
          : null,
        e ? { t: "Le rétroplanning", lignes: e.phases.filter(function (x) { return !x.hors; })
              .map(function (x) {
                return { q: x.ph.nom, v: O.joli(x.debut) + " → " + O.joli(x.fin) + "  ·  " + x.jours + " j" };
              }).concat([{ q: "Démarrage", v: O.joli(e.demarrage)
                + (e.commenceHier ? "  —  déjà dépassé de " + (-e.joursAvantDemarrage) + " j" : "") }]) }
          : null,
        kvs.length ? { t: "Les visuels de référence", pieces: kvs } : null,
        { t: "Ce qu'il reste à produire", pieces: retenue
            ? (p.livrables || []).filter(function (l) {
                return !l.annule && l.pisteId === retenue.id && KV.niveau(l) === "declinaison"; })
            : [] },
      ].filter(Boolean),
      inferences: window.INFERENCE
        ? INFERENCE.liste(p).filter(function (x) {
            return DOCS.conception.sections.indexOf(x.section) !== -1; })
        : [],
    };
  }

  /* ————————————————————— L'écran ————————————————————— */

  function ouvrir(p, cle, rafraichir) {
    var def = DOCS[cle];
    var d = compiler(p, cle);
    var cs = controles(p, cle);
    var manques = cs.filter(function (c) { return !c.ok; });

    PANNEAU.ouvrir(def.nom, p.ref, el("div.co", {},
      UI.recevabilite(
        manques.length
          ? "Ce document peut-il ouvrir " + def.ouvre + " ?"
          : def.nom + " complet — " + def.ouvre + " peut s'ouvrir",
        cs, null,
        [
          { nom: "Imprimer", fort: !manques.length, quand: function () { window.print(); } },
          { nom: "Copier le texte", quand: function () { copier(d, def); } },
          manques.length
            ? { nom: "Combler ce qui manque", doux: true, quand: function () {
                PANNEAU.fermer();
                location.hash = "#/projets/" + p.id + "/" + def.sections[0];
              } }
            : null,
        ].filter(Boolean)),

      manques.length
        ? UI.banniere("rouge", "Ouvrir " + def.ouvre + " sur ce document en l'état : " + def.sans + ".")
        : UI.banniere("vert", "Tout y est. " + def.quoi.charAt(0).toUpperCase() + def.quoi.slice(1) + "."),

      d.inferences.length
        ? UI.banniere("", d.inferences.length
            + (d.inferences.length > 1 ? " champs de ce document tiennent" : " champ de ce document tient")
            + " sur une inférence : utilisables pour travailler, pas opposables au client.")
        : null,

      document(d)
    ));
  }

  function bloc(p, bl) {
    var vide = !bl.corps && !(bl.puces || []).length && !(bl.lignes || []).length
      && !(bl.activites || []).length && !(bl.pieces || []).length
      && !(bl.elements || []).length && !(bl.gamme || []).length
      && !(bl.mesures || []).length && !(bl.equipe || []).length;

    return el("div.co-b" + (bl.fort ? ".fort" : "") + (vide ? ".vide" : ""), {},
      el("div.cob-t", {}, bl.t,
        bl.source ? el("span", {}, bl.source) : null),

      /* « non renseigné » convient à un champ de brief qu'on a oublié. Il ne
       * convient pas à une liste d'attentes vide, qui est une bonne nouvelle.
       * Un bloc peut donc dire lui-même ce que son vide signifie. */
      vide ? el("div.cob-v" + (bl.videBon ? ".bon" : ""), {},
        bl.siVide || "non renseigné") : null,
      bl.corps ? el("div.cob-c", {}, bl.corps) : null,
      bl.citation ? el("div.cob-cit", {}, "citation d'origine conservée") : null,

      (bl.puces || []).length
        ? el("ul.cob-p", {}, bl.puces.filter(Boolean).map(function (x) { return el("li", {}, x); }))
        : null,

      (bl.lignes || []).length
        ? el("div.cob-l", {}, bl.lignes.map(function (l) {
            return el("div.cobl", {},
              el("span.cobl-q", {}, l.q),
              el("span.cobl-v" + (l.v ? "" : ".vide"), {}, l.v || "non renseigné"));
          }))
        : null,

      (bl.activites || []).length
        ? el("div.cob-a", {}, bl.activites.map(function (a) {
            return el("div.coba", {},
              el("div.coba-t", {}, el("span.coba-c", {}, a.canal), a.nom,
                el("span.coba-l", {}, a.lieu)),
              el("div.coba-q", {}, a.quoi),
              el("div.coba-d", {}, [a.marches,
                a.production ? "production avant le " + O.joli(a.production) : null,
                a.debut ? "exécution le " + O.joli(a.debut) : null].filter(Boolean).join("  ·  ")));
          }))
        : null,

      (bl.elements || []).length
        ? el("div.co-elts", {}, bl.elements.map(function (a) {
            return el("div.co-e", {}, IMAGE.vignette(a, "planche"),
              el("span", {}, a.nom));
          }))
        : null,

      (bl.gamme || []).length
        ? el("div.co-gamme", {}, bl.gamme.map(function (sk) {
            var v = sk.vignette ? sk : (sk.asset ? DEPOT.trouve("assets", sk.asset) : null);
            var mm = (sk.marches || []).map(function (id) {
              var x = DEPOT.trouve("marches", id); return x ? x.code : null; }).filter(Boolean);
            return el("div.co-g", {},
              v ? IMAGE.vignette(v, "planche") : null,
              el("span.cog-n", {}, sk.nom),
              sk.contenu ? el("span.cog-q", {}, sk.contenu) : null,
              el("span.cog-m", {}, mm.length ? mm.join(" · ") : "aucun marché"));
          }))
        : null,

      /* Une mesure porte sa valeur, son évolution, et surtout son assise :
       * un zéro parce que rien ne s'est passé et un zéro parce que rien n'est
       * enregistré ne se lisent pas pareil, et le second n'est pas un
       * résultat — c'est un registre vide. */
      (bl.mesures || []).length
        ? el("div.cob-me", {}, bl.mesures.map(function (m) {
            var creux = m.assise === 0;
            return el("div.cobm" + (creux ? ".creux" : "") + (m.ton ? "." + m.ton : ""), {},
              el("span.cobm-v", {}, creux ? "—" : m.valeur),
              el("span.cobm-n", {}, m.nom),
              m.evol ? el("span.cobm-e." + m.evol.sens, {}, m.evol.texte) : null,
              el("span.cobm-q", {}, creux ? m.sansQuoi : m.quoi));
          }))
        : null,

      /* La matière d'évaluation d'une équipe : une ligne par personne, et ce
       * qui manque pour pouvoir l'évaluer — c'est ça qu'on vient chercher. */
      (bl.equipe || []).length
        ? el("div.cob-eq", {}, bl.equipe.map(function (x) {
            return el("div.cobe" + (x.manque ? ".manque" : ""), {},
              el("span.cobe-n", {}, x.personne.nom),
              el("span.cobe-c", {},
                x.propose + " proposé  ·  " + x.retenu + " retenu  ·  " + x.repris
                  + " repris  ·  " + x.critiques
                  + (x.critiques > 1 ? " critiques" : " critique")
                  + "  ·  engagements " + x.engagements),
              x.manque ? el("span.cobe-m", {}, x.manque) : null);
          }))
        : null,

      (bl.pieces || []).length
        ? el("div.rt-mur", {}, bl.pieces.map(function (l) {
            var m = DEPOT.trouve("marches", l.marche);
            return el("div.rt-c", {},
              IMAGE.vignette(l, "planche"),
              el("span.rtc-bas", {},
                el("span.rtc-n", {}, l.nom),
                el("span.rtc-m", {}, KV.NIVEAUX[KV.niveau(l)].nom
                  + (m ? "  ·  " + m.code : ""))));
          }))
        : null
    );
  }

  /* Le texte brut : pour le coller dans un mail, une convocation, un ordre. */
  function texte(d, def) {
    var out = [d.titre, d.sous, ""];
    d.blocs.filter(Boolean).forEach(function (bl) {
      var corps = [];
      if (bl.corps) corps.push(bl.corps);
      (bl.puces || []).filter(Boolean).forEach(function (x) { corps.push("  · " + x); });
      (bl.lignes || []).forEach(function (l) { corps.push("  " + l.q + " : " + (l.v || "—")); });
      (bl.activites || []).forEach(function (a) {
        corps.push("  · [" + a.canal + " · " + a.lieu + "] " + a.nom
          + (a.quoi ? " — " + a.quoi : "")
          + (a.production ? "  (production avant le " + O.joli(a.production) + ")" : ""));
      });
      (bl.elements || []).forEach(function (a) { corps.push("  · " + a.nom); });
      (bl.gamme || []).forEach(function (sk) {
        var mm = (sk.marches || []).map(function (id) {
          var x = DEPOT.trouve("marches", id); return x ? x.code : null; }).filter(Boolean);
        corps.push("  · " + sk.nom + (sk.contenu ? " — " + sk.contenu : "")
          + (mm.length ? "  (" + mm.join(", ") + ")" : "  (aucun marché)"));
      });
      (bl.pieces || []).forEach(function (l) { corps.push("  · " + l.nom); });
      (bl.mesures || []).forEach(function (m) {
        corps.push("  " + (m.assise === 0 ? "—" : m.valeur) + "  " + m.nom
          + (m.evol ? "  (" + m.evol.texte + ")" : "")
          + "\n      " + (m.assise === 0 ? m.sansQuoi : m.quoi));
      });
      if (!corps.length) corps.push("  (non renseigné)");
      out.push(bl.t.toUpperCase());
      out.push(corps.join("\n"));
      out.push("");
    });
    if (d.inferences.length) {
      out.push("CE QUI TIENT SUR UNE INFÉRENCE");
      d.inferences.forEach(function (x) { out.push("  · " + x.nom + " — " + x.pourquoi); });
    }
    return out.join("\n");
  }

  function copier(d, def) {
    var t = texte(d, def);
    var zone = el("textarea", { rows: 16 });
    zone.value = t;
    PANNEAU.sur("Le document en texte", def.nom, el("div", {},
      UI.banniere("", "À coller dans une convocation d'atelier, un ordre de fabrication, ou un mail. L'outil n'envoie rien : il écrit."),
      el("div.form", {}, el("div.champ", {}, zone)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          zone.select();
          try { document.execCommand("copy"); } catch (e) { /* le presse-papier peut être fermé */ }
          PANNEAU.fermerSur();
        } }, "Sélectionner et copier"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Fermer"))
    ));
    setTimeout(function () { zone.focus(); zone.select(); }, 40);
  }

  /* ————————————————————— Le bouton, là où il sert ————————————————————— */

  function bouton(p, cle, rafraichir) {
    var def = DOCS[cle];
    var manques = controles(p, cle).filter(function (c) { return !c.ok; }).length;
    return el("button.b" + (manques ? "" : ".or"), { type: "button",
      title: def.quoi, onclick: function () { ouvrir(p, cle, rafraichir); } },
      def.nom + (manques ? "  ·  " + manques + " manques" : "  ·  complet"));
  }

  /* Le rendu d'un document compilé, quel qu'il soit. BILAN s'en sert pour la
   * fin de mois : un seul moteur de mise en page, sinon deux documents de la
   * même maison ne se ressemblent plus au bout de trois semaines. */
  function document(d) {
    return el("div.co-doc", {},
      el("div.cod-tete", {},
        d.logo ? el("span.cod-logo", {}, el("img", { src: d.logo.vignette, alt: "" })) : null,
        el("div", {},
          el("h3", {}, d.titre),
          el("div.codt-s", {}, d.sous))),
      el("div.co-blocs", {}, d.blocs.filter(Boolean).map(function (bl) {
        return bloc(null, bl);
      }))
    );
  }

  return { DOCS: DOCS, controles: controles, pret: pret, compiler: compiler,
    texte: texte, ouvrir: ouvrir, bouton: bouton,
    /* Le cadrage de la gamme sert aussi hors du compilateur : la plateforme
     * de marque montrait le catalogue entier faute de pouvoir l'appeler. */
    gammeDeLaCampagne: gammeDeLaCampagne,
    bloc: bloc, document: document, copier: copier };
})();
