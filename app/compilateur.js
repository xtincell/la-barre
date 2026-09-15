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
      /* Le brief-back appartient au cadrage : c'est son dernier acte. Un
       * document de cadrage qui ne porte pas ce qu'on a répondu au client
       * raconte la moitié de la conversation. */
      sections: ["identite", "brief", "briefback", "socle", "strategie"],
    },
    conception: {
      nom: "Document de conception", court: "Conception",
      pour: "la production", ouvre: "l'exécution",
      quoi: "l'idée retenue, la piste qui la porte, son dispositif et son calendrier",
      sans: "on fabriquera sans savoir quel concept fait autorité, ni pour quand",
      /* La séance de créa en fait partie : c'est là que les idées ont été
       * posées et que l'auteur a été constaté. Sans elle, le document dit ce
       * qu'on a retenu sans dire entre quoi on a choisi. */
      sections: ["atelier", "bigidea", "pistes"],
    },
    /* Le troisième temps avait ses écrans et pas son document. Or c'est celui
     * qu'on remet — à l'imprimeur, au client, à celui qui reprend le dossier
     * dans six mois. */
    production: {
      nom: "Document de production", court: "Production",
      pour: "la remise", ouvre: "la diffusion",
      quoi: "ce qui a été fabriqué, ce qui manque, et sous quelles conditions ça part",
      sans: "on remet un dossier dont personne ne sait ce qu'il contient vraiment",
      sections: ["planche", "livrables", "livraison", "presentation"],
    },
  };

  /* ————————————————————— La recevabilité ————————————————————— */

  function controles(p, cle) {
    if (cle === "cadrage") return controlesCadrage(p);
    if (cle === "production") return controlesProduction(p);
    return controlesConception(p);
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
    if (cle === "cadrage") return cadrage(p);
    if (cle === "production") return production(p);
    return conception(p);
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
        briefbackBloc(p),
        { t: "À qui on parle", corps: b.cible },
        /* L'insight n'est plus un paragraphe : il a une couche, et la couche
         * décide du livrable. Un cadrage qui donne l'énoncé sans son étage
         * envoie l'atelier chercher au mauvais endroit. */
        insightBloc(p, b, st),
        territoireBloc(p, st),
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
        ecolesBloc(p),
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

  /* ————————————————————— La chaîne du raisonnement, dans le document —————————————————————
   *
   * Trois blocs qui n'existaient pas parce que les objets qu'ils rendent
   * n'existaient pas. Ils tombent d'eux-mêmes sur un dossier qui n'a rien :
   * un document ne montre pas des rubriques vides, il montre ce qu'il a. */

  function insightBloc(p, b, st) {
    var is = window.INSIGHT ? INSIGHT.liste(p) : [];
    if (!is.length) {
      /* Repli sur les anciens champs : un dossier d'avant la chaîne garde son
       * paragraphe, et le cadrage le rend plutôt que de mentir par omission. */
      var txt = b.insight || st.insight;
      return txt ? { t: "L'insight", corps: txt, fort: true,
        source: "écrit avant que la couche ne soit un champ — son étage n'est pas nommé" } : null;
    }
    return { t: is.length > 1 ? "Les insights" : "L'insight", fort: true,
      source: "chacun à sa couche — et la couche décide du livrable",
      lignes: is.map(function (i) {
        INSIGHT.normaliser(i);
        var c = i.couche ? INSIGHT.couche(i.couche) : null;
        var v = INSIGHT.verdict(i);
        return { q: c ? c.nom.toUpperCase() : "COUCHE NON NOMMÉE",
          v: INSIGHT.texte(i)
            + (c ? "  —  commande " + c.commande : "")
            + "  ·  " + v.nom
            + (i.sources.length ? "  ·  " + i.sources.length + " sources croisées" : "  ·  sans source") };
      }) };
  }

  function territoireBloc(p, st) {
    var ts = window.TERRITOIRE ? TERRITOIRE.liste(p) : [];
    if (!ts.length) {
      return st.territoire ? { t: "Le territoire", corps: st.territoire, fort: true } : null;
    }
    var t = ts[0];
    var conv = TERRITOIRE.convention(t);
    var puces = [];
    ts.forEach(function (x) {
      var n = TERRITOIRE.pistes(p, x).length;
      puces.push((x.nom || "territoire sans nom") + " — " + (x.quoi || "espace non décrit")
        + "  ·  " + n + (n > 1 ? " concepts" : " concept"));
    });
    return { t: ts.length > 1 ? "Les territoires" : "Le territoire", fort: true,
      corps: ts.length === 1 ? t.quoi : null,
      puces: ts.length > 1 ? puces : null,
      source: conv.enonce
        ? "convention de catégorie : " + conv.enonce
          + (conv.prouvee ? "  —  prouvée en " + conv.preuves.length + " visuels de concurrents"
            : "  —  " + conv.manque + " visuel(s) manquent : elle est supposée")
        : "l'espace que l'insight ouvre, et où plusieurs concepts vivent" };
  }

  function briefbackBloc(p) {
    var bb = (p.sections || {}).briefback || {};
    if (!(bb.compris || "").trim()) return null;
    var c = bb.couche && window.INSIGHT ? INSIGHT.couche(bb.couche) : null;
    return { t: "Ce que nous avons répondu au client", fort: !!(bb.ecart || "").trim(),
      source: bb.envoye_le
        ? "brief-back envoyé le " + O.joli(bb.envoye_le)
          + (bb.repondu_le ? ", contresigné le " + O.joli(bb.repondu_le) : " — sans retour à ce jour")
        : "brief-back rédigé, pas encore envoyé",
      lignes: [
        { q: "Ce que nous avons compris", v: bb.compris },
        { q: "Où vit le problème", v: c ? c.nom + " — commande " + c.commande : bb.couche },
        { q: "Ce que nous proposons de produire", v: bb.propose },
        { q: "L'écart avec ce qui est demandé", v: bb.ecart },
        { q: "Sa réponse", v: bb.reponse },
      ].filter(function (x) { return !!(x.v || "").trim(); }) };
  }

  function ecolesBloc(p) {
    if (!window.ECOLES) return null;
    var ds = ECOLES.declarees(p);
    if (!ds.length) return null;
    return { t: "L'école qui gouverne chaque étage",
      source: "le mélange tient quand chacune gouverne un étage différent",
      lignes: ds.map(function (x) {
        var e = ECOLES.de(x.cle);
        var pr = ECOLES.preuve(p, x.cle, x.etage);
        var et = ECOLES.ETAGES.filter(function (t) { return t.cle === x.etage; })[0];
        return { q: et ? et.nom : x.etage,
          v: (e ? e.nom + " · " + e.maison : x.cle)
            + "  —  preuve attendue : " + (e ? e.preuve : "—")
            + (pr ? (pr.ok ? "  ✓ au dossier" : "  ✕ absente") : "") };
      }) };
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
        racineBloc(p, retenue),
        retenue ? { t: "La piste retenue", corps: retenue.concept, fort: true,
          source: da ? "direction artistique : " + da.nom : null } : null,
        retenue ? { t: "L'axe", lignes: (window.AXE ? AXE.CHAMPS : []).map(function (c) {
            var v = retenue[c.cle];
            return { q: c.court, v: Array.isArray(v) ? v.join(" · ") : v };
          }).filter(function (x) { return !!(x.v || "").trim(); }) } : null,
        retenue ? { t: "Le prix à payer", lignes: [
            { q: "Ce qu'elle privilégie", v: (retenue.prix || {}).privilegie },
            { q: "Ce qu'elle sacrifie", v: (retenue.prix || {}).sacrifie || retenue.sacrifice },
          ].filter(function (x) { return !!(x.v || "").trim(); }) } : null,
        retenue ? { t: "L'argument", corps: retenue.argument } : null,
        retenue ? { t: "Les porteurs de reconnaissance", puces: retenue.porteurs } : null,
        arbitrageBloc(p, retenue),
        seanceBloc(p),
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

  /* ————————————————————— Ce que la conception doit porter en plus ————————————————————— */

  /* D'où l'idée descend. Une conception qui ne dit pas sa racine laisse
   * l'exécutant croire que le concept est arrivé de nulle part — et il le
   * défendra comme tel, c'est-à-dire mal. */
  function racineBloc(p, retenue) {
    if (!retenue || !window.TERRITOIRE) return null;
    var i = TERRITOIRE.racine(p, retenue);
    var t = retenue.territoireId ? TERRITOIRE.de(p, retenue.territoireId) : null;
    if (!i && !t) return null;
    var c = i && i.couche ? INSIGHT.couche(i.couche) : null;
    return { t: "D'où elle descend",
      source: "remonter un axe jusqu'à son insight est le seul test qui dise si deux pistes sont comparables",
      lignes: [
        { q: "L'insight", v: i ? INSIGHT.texte(i) + (c ? "  ·  couche " + c.nom.toLowerCase() : "") : null },
        { q: "Le territoire", v: t ? (t.nom || t.quoi) : null },
      ].filter(function (x) { return !!(x.v || "").trim(); }) };
  }

  /* L'arbitrage. « Trois pistes sans arbitrage ne sont pas des routes
   * parallèles : ce sont trois recommandations dans le même document. » Le
   * document de conception est précisément l'endroit où ça s'écrit. */
  function arbitrageBloc(p, retenue) {
    if (!window.RECO) return null;
    var a = RECO.arbitrage(p);
    if (!a.due) return null;
    var lignes = a.pistes.map(function (pi) {
      var r = pi.role ? RECO.role(pi.role) : null;
      var px = pi.prix || {};
      return { q: (pi.titre || "sans titre") + (r ? "  ·  " + r.nom : "")
          + (pi.statut === "retenue" ? "  ·  RETENUE" : ""),
        v: [pi.concept, px.privilegie ? "privilégie : " + px.privilegie : null,
            (px.sacrifie || pi.sacrifice) ? "sacrifie : " + (px.sacrifie || pi.sacrifice) : null]
          .filter(Boolean).join("  —  ") };
    });
    if (a.raisons.length) {
      lignes.push({ q: "Pourquoi celle-là", v: a.raisons.join("  ·  ") });
    }
    if ((a.integrite || "").trim()) {
      lignes.push({ q: "Ce qui casse si on recompose", v: a.integrite });
    }
    return { t: "L'arbitrage", fort: true, lignes: lignes,
      source: a.prete
        ? "l'agence recommande, et dit ce que coûte de recomposer"
        : "incomplet : sans les trois raisons et sans l'intégrité, le client choisira seul" };
  }

  /* La séance de concept. Elle fonde l'attribution : « l'auteur se saisit
   * avant l'arbitrage, pas après. » Sans elle au document, l'idée retenue n'a
   * pas d'histoire et l'indicateur juniors reste à zéro. */
  function seanceBloc(p) {
    var is = (p.idees || []);
    if (!is.length) return null;
    var se = p.seance || {};
    return { t: "La séance de créa",
      source: se.date
        ? O.joli(se.date) + (se.duree ? "  ·  " + se.duree + " min" : "")
          + "  ·  " + is.length + " idées posées"
        : is.length + " idées posées",
      lignes: is.map(function (i) {
        var a = i.auteur ? DEPOT.trouve("personnes", i.auteur) : null;
        return { q: (a ? a.nom : "auteur non nommé") + (i.statut === "retenue" ? "  ·  RETENUE" : ""),
          v: i.texte };
      }).concat(se.motif ? [{ q: "Le motif de l'arbitrage", v: se.motif }] : []) };
  }

  /* ————————————————————— Le document de production ————————————————————— */

  /* Ce qui a été fabriqué, ce qui manque, et sous quelles conditions ça part.
   * Il se compile depuis l'état réel des livrables — jamais depuis une
   * déclaration : c'est la différence entre un bordereau et une promesse. */
  function production(p) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var pleins = ls.filter(function (l) { return !!l.vignette; });
    var b = window.TRACE ? TRACE.bilan(ls) : null;
    var souf = window.TRACE ? TRACE.enSouffrance(function (x) { return x.id === p.id; }) : [];
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];

    /* Par famille : c'est le niveau auquel on réclame, jamais livrable par
     * livrable. */
    var fam = {};
    ls.forEach(function (l) {
      var cle = l.marqueId || l.voletId || "sans";
      if (!fam[cle]) {
        var mq = l.marqueId ? DEPOT.trouve("marques", l.marqueId) : null;
        var vo = (p.volets || []).filter(function (v) { return v.id === l.voletId; })[0];
        fam[cle] = { nom: mq ? mq.nom : vo ? vo.nom : "Sans famille", n: 0, pleins: 0 };
      }
      fam[cle].n++;
      if (l.vignette) fam[cle].pleins++;
    });

    var eff = window.EFFICACITE ? EFFICACITE.repartition(p) : null;

    return {
      titre: "Production — " + p.nom,
      sous: p.ref + "  ·  " + pleins.length + " / " + ls.length + " livrables portent leur visuel"
        + (retenue ? "  ·  piste « " + retenue.titre + " »" : ""),
      logo: (function () { var m = MARQUE.de(p); return m ? MARQUE.logo(m.id) : null; })(),
      blocs: [
        { t: "Où en est le parc", fort: true,
          lignes: Object.keys(fam).map(function (k) {
            return { q: fam[k].nom, v: fam[k].pleins + " / " + fam[k].n + " visuels posés" };
          }) },

        b ? { t: "Ce qui est tracé, et ce qui ne l'est pas",
          source: "« pas fait » et « pas tracé » ne se relancent pas de la même façon",
          lignes: [
            { q: "Tracé", v: b.trace + " — une version ou un fichier au dossier" },
            { q: "Vu, non déposé", v: b.vu + " — le travail se voit, la trace manque" },
            { q: "Muet", v: b.muet + " — aucune version, aucun fichier, aucun visuel" },
            { q: "Relançables", v: b.relancables + " sur " + b.total
                + " portent un responsable ET une date" },
          ] } : null,

        souf.length ? { t: "Ce qui est en souffrance",
          source: "classé par coût : ce qui est faux avant ce qui est en retard",
          lignes: souf.slice(0, 12).map(function (x) {
            return { q: x.s.nom + (x.s.jours ? "  ·  " + x.s.jours + " j" : ""),
              v: x.l.nom + (x.attendu && x.attendu.fichier ? "  —  attendu : " + x.attendu.fichier : "") };
          }) } : null,

        eff && eff.lisible ? { t: "Construction de marque et activation",
          source: eff.reserve,
          lignes: [{ q: "Répartition", v: eff.partMarque + " / " + (100 - eff.partMarque)
            + "  —  référence " + eff.cible + " / " + (100 - eff.cible) }] } : null,

        { t: "Ce qui part", pieces: pleins },
        ls.length > pleins.length
          ? { t: "Ce qui manque encore",
              pieces: ls.filter(function (l) { return !l.vignette; }) }
          : null,

        creditsBloc(p),
      ].filter(Boolean),
      inferences: [],
    };
  }

  /* Les crédits se posent avant la diffusion : fonction exercée, nom
   * orthographié, validation écrite avant tout dépôt. */
  function creditsBloc(p) {
    var gens = window.PRESENTATION && PRESENTATION.credits ? PRESENTATION.credits(p) : [];
    if (!gens.length) return null;
    return { t: "Crédits",
      source: "fonction exercée, nom orthographié — avant tout dépôt",
      lignes: gens.map(function (g) { return { q: g.fonction, v: g.nom }; }) };
  }

  function controlesProduction(p) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var pleins = ls.filter(function (l) { return !!l.vignette; }).length;
    var sansQui = ls.filter(function (l) { return !l.responsable; }).length;
    var gens = window.PRESENTATION && PRESENTATION.credits ? PRESENTATION.credits(p) : [];
    var ment = ls.filter(function (l) {
      return (l.releve || {}).ecart === "annonce-sans-fichier"; }).length;

    return [
      { quoi: "Des livrables au dossier", ok: ls.length > 0, poids: 5,
        cout: "il n'y a rien à remettre : le dossier s'arrête à l'idée" },
      { quoi: "Chaque livrable porte son visuel", ok: ls.length > 0 && pleins === ls.length, poids: 4,
        cout: (ls.length - pleins) + " cases vides : le document promet ce qu'il ne montre pas" },
      { quoi: "Le tableau dit vrai", ok: ment === 0, poids: 5,
        cout: ment + " livraisons sont annoncées faites et rien n'est au dossier — "
          + "l'écart se découvre à l'impression" },
      { quoi: "Chaque livrable a un responsable", ok: sansQui === 0, poids: 3,
        cout: sansQui + " sans porteur : personne n'est en défaut le jour où ça n'avance pas" },
      { quoi: "Les crédits sont posés", ok: gens.length > 0, poids: 3,
        cout: "aucun nom au document : le travail part sans que personne en réponde" },
    ];
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
                GESTE.ouvrir("projet", { p: p, section: def.sections[0] });
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

  /* Une liste attendue peut arriver en chaîne : un champ déclaré en puces que
   * quelqu'un a rempli en prose, un import, une reprise à la main. Le document
   * doit alors la rendre — pas blanchir l'écran entier. C'est le pire échec
   * possible pour un produit dont la promesse est que rien ne se taise. */
  function enListe(v) {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v;
    var t = String(v).trim();
    return t ? [t] : [];
  }

  function bloc(p, bl) {
    if (bl && bl.puces !== undefined) bl = Object.keys(bl).reduce(function (o, k) {
      o[k] = k === "puces" ? enListe(bl[k]) : bl[k]; return o;
    }, {});

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
