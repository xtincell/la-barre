/* regles.js — les mécanismes.
 *
 * Rien ne bloque. Tout se voit. Chaque raccourci affiche son prix.
 *
 * Un blocage n'est pas saisi : il est calculé depuis l'état. Le registre ne
 * garde que sa date de naissance, sa résolution, et le cas échéant la raison
 * pour laquelle tu as dit « ce n'en est pas un ».
 */

window.REGLES = (function () {
  /* ————— Le prix de chaque raccourci ————— */

  var PRIX = {
    "decideur-absent": "Aucune validation client ne prendra effet.",
    "tueur-absent": "La signature de l'étage 1 n'immunise rien : la remise en cause restera possible sans être imputable.",
    "fenetre-absente": "La charge de production ne peut être ni placée ni tenue.",
    "socle-absent": "La campagne pourra être refusée en revue sans recours.",
    "rattachement-absent": "Le §6 bis demande que toute plateforme créative se rattache explicitement au socle ou justifie son écart. Sans ce champ, la big idea n'a rien à opposer si la marque la conteste.",
    "criteres-absents": "Ce travail ne pourra être refusé que par goût.",
    "da-absent": "Direction de la Création qui produit : la porte A se ferme pour l'équipe.",
    "auteur-absent": "L'idée ne pourra être attribuée à personne, et l'indicateur juniors reste à zéro.",
    "arbitrage-absent": "L'équipe travaille sans savoir quel concept fait autorité.",
    "axe-absent": "La piste ne se distingue des autres que par son titre : la comparer n'oppose rien, et le client tranchera sur le visuel qu'on lui montre.",
    "axe-jumeau": "Deux pistes au même ton ne font pas un choix : on demande au client de trancher sur rien, et il reviendra dessus.",

    /* La chaîne du raisonnement : insight → territoire → axe.
     *
     * Ces prix ne parlent pas de champs vides mais de raisonnements faux. Un
     * insight sans couche ne manque pas d'information : il manque de savoir ce
     * qu'il commande, et c'est ce qui fait produire une campagne là où il
     * fallait corriger un service. */
    "insight-sans-couche": "On ne sait pas ce que cet insight commande — un message, une big idea, un positionnement ou une correction de marque. Les quatre appellent des livrables différents et un seul répond au problème.",
    "insight-est-un-constat": "Le troisième temps est vide : l'énoncé dit ce qui est, jamais ce que ça empêche. Vrai, vérifiable, et sans aucune conséquence pour la création.",
    "insight-une-source": "Une seule source produit une opinion ; trois produisent un insight. Celui-ci se défendra mal à la deuxième question du client.",
    "insight-non-teste": "Personne n'a posé les trois questions. Un énoncé que nul ne peut contredire n'ouvre aucun choix — et on ne le saura qu'en séance.",
    "decalage-de-couche": "Le problème ne vit pas à l'étage où on lui répond. Obéir au brief produira un travail juste sur une question qui n'est pas la bonne — et ce sera la création qu'on tiendra pour responsable.",
    "axes-concurrents": "Ce ne sont pas des axes : ce sont des recommandations concurrentes dans le même document. Le client recomposera entre elles, et il sortira autant de signatures que de pistes.",
    "piste-hors-territoire": "Cette piste ne remonte à aucune racine : impossible de dire si elle traite le même problème que les autres, ni de la défendre autrement que par le goût.",
    "territoire-a-un-concept": "Un insight qui ne donne qu'un seul concept possible n'est pas un insight : c'est déjà une idée, arrivée trop tôt. Le territoire n'a pas de durée.",
    "briefback-absent": "Le premier atelier est ouvert et rien n'est parti par écrit. Le jour où le client conteste ce qui a été compris, il n'y a rien à citer — et c'est la création qu'on tiendra pour responsable.",
    "briefback-sans-reponse": "Envoyé, jamais contresigné. Ce qui a été compris n'engage que nous : le client pourra dire qu'il demandait autre chose, et il aura raison puisque rien ne dit le contraire.",
    "reco-sans-arbitrage": "Trois pistes sans arbitrage ne sont pas des routes parallèles : ce sont trois recommandations dans le même document. Le client choisira seul, sans les raisons, et il recomposera entre les pistes — il sortira autant de signatures que de routes.",
    "pistes-sans-role": "Trois pistes d'égale valeur ne font pas un choix : il en faut une à vendre, et deux qui bornent le territoire. Sans rôles, la sage l'emporte par défaut, parce qu'elle rassure.",
    "integrite-non-ecrite": "Sur un compte à comités en cascade, c'est la seule pièce écrite qui protège le travail entre deux étages de validation. Sans elle, le concept d'une piste remontera monté sur l'exécution d'une autre, et personne ne saura dire ce qui a été perdu.",
    "structure-hybride": "Le deck mélange deux squelettes. Le client sent l'incohérence sans savoir la nommer, et l'argumentation s'affaiblit là où elle devrait porter.",
    "ecole-sans-preuve": "L'école est déclarée et ce qu'elle réclame n'est pas au dossier. On travaille selon un critère qu'on ne pourra pas produire le jour où le client demandera sur quoi la reco s'appuie.",
    "convention-supposee": "Une convention qu'on ne peut pas montrer en trois visuels de concurrents n'est pas identifiée : elle est supposée. La rupture qu'on construira dessus cassera peut-être une porte ouverte.",
    "ecoles-meme-etage": "Deux écoles au même étage, et chacune apporte sa racine. Elles se neutralisent : le deck portera deux raisonnements concurrents, et le client sentira l'incohérence sans savoir la nommer.",
    "chiffre-sans-source": "Un chiffre sans source se retourne en réunion, et emporte avec lui le reste du diagnostic. On n'invente jamais un chiffre : on dit à quel niveau il a été obtenu.",

    /* Une reprise d'emballage se suit sur deux sources — un tableau et un
     * disque. Quand les deux se contredisent, ce n'est pas un détail de
     * saisie : c'est une commande qu'on passe à l'imprimeur sur une hypothèse. */
    "releve-contredit": "Le tableau de suivi et les fichiers livrés ne disent pas la même chose : on ne sait pas ce qui est prêt, et une relance se fera sur la mauvaise moitié du parc.",
    "exe-annonce-absent": "Le tableau compte ces films comme faits. Ils ne le sont pas — et personne ne les réclamera puisqu'ils sont déjà cochés.",
    "codebarre-sur-exe-absent": "Le nouveau code-barre est déclaré posé sur un exé qui n'existe pas. La ligne est verte des deux côtés et il n'y a rien dessous.",
    "qr-sans-specification": "Le QR est exigé sur chaque film et rien ne dit vers quoi il pointe, à quelle taille ni à quel endroit du pack. Chaque exé produit avant cette décision sera à reprendre.",
    "exe-sans-pdf": "Un seul format livré. L'imprimeur qui demande l'autre le demandera la veille du départ.",
    "storyboard-vide": "Le découpage est écrit, les cadres sont vides. On ne peut ni chiffrer la production, ni faire valider un plan, ni briefer un générateur d'image.",
    "entree-sans-fournisseur": "Tout le monde attend un fichier que personne ne doit fournir.",
    "copy-non-verrouille": "Une correction tardive traversera toutes les déclinaisons et toutes les langues.",
    "droits-insuffisants": "Usage hors du territoire ou de la durée couverts par la licence.",
    "maitre-perime": "Des adaptations sont produites sur une version qui n'a plus cours.",
    "sans-proprietaire": "Personne n'est en défaut le jour où ça n'avance pas.",
    "casquette-sans-part": "La charge de cette personne est fausse.",
    "bilan-absent": "Le projet suivant sur cette marque partira sans son diagnostic.",
    "infere-non-contresigne": "Utilisable pour travailler, pas opposable au client : le jour où il conteste, rien ne tient.",
    "brief-sans-porteur": "Personne ne répond de ce qui a été compris : au premier écart entre le dit et l'écrit, il n'y a pas d'arbitre.",
    "adaptation-hors-da": "Une correction demandée par le marché arrivera chez quelqu'un qui n'a pas fait la piste.",
    "livrable-sans-piste": "Elle se fabrique sans concept opposable : refusable par le goût seul, jamais sur un critère écrit.",
    "sku-hors-zone": "Un produit montré là où il n'est pas vendu se rappelle, et le rappel est pour l'agence.",
    "orthographe-diffusee": "La faute part sur toute la descendance, et se lit sur chaque support imprimé.",
    "packshot-cmyk": "Bon pour l'impression, faux à l'écran : les couleurs ne seront pas celles validées.",
    "logo-ombrelle-absent": "L'ombrelle doit être considérée et n'apparaît nulle part : le client le verra avant nous.",
    "langue-marche-douteuse": "Une langue de marché que rien ne corrobore : on adapte dans une langue qu'on n'y parle pas.",
    "charge-hors-fenetre": "La charge dépasse la fenêtre : la date ne peut pas être tenue, et personne ne l'a encore dit.",
    "bon-de-commande-absent": "Le travail est engagé et rien ne l'oppose au client le jour où il conteste le montant.",
    "attend-un-projet-en-retard": "Des jours de production sont réservés et courent à vide tant que l'amont n'est pas livré.",
    "hors-piste-de-campagne": "Deux concepts sortiront du même temps fort, et c'est le client qui recomposera.",
    "remise-sans-manifeste": "Le fichier part sans ses droits ni ses métadonnées : au réemploi dans deux ans, personne ne saura ce qu'on a le droit d'en faire.",
    "clos-sans-resultat": "Personne ne saura si ça a marché : ni le bilan, ni l'estimation suivante, ni la comparaison entre marques n'auront de quoi s'appuyer.",
  };

  function prix(cle) { return PRIX[cle] || ""; }

  /* ————— Calcul des blocages ————— */

  function blocages(projetId) {
    var trouves = [];
    var projets = DEPOT.liste("projets").filter(function (p) {
      return !projetId || p.id === projetId;
    });

    projets.forEach(function (p) {
      var s = p.sections || {};

      /* Identité. Une valeur inférée remplit le champ mais ne le clôt pas :
       * elle fait travailler l'équipe, elle ne s'oppose à personne. Le blocage
       * ne disparaît pas — il change de nature. */
      critique(trouves, p, "identite", "decideur", "decideur-absent", "Décideur final non nommé", "clientele");
      critique(trouves, p, "identite", "tueur", "tueur-absent", "Qui peut annuler une idée validée : non nommé", "clientele");
      critique(trouves, p, "identite", "fenetre", "fenetre-absente", "Fenêtre et dates non fixées", "clientele");

      /* Socle avant big idea.
       *
       * La section du dossier n'est pas la seule source : une marque porte sa
       * plateforme à la bibliothèque, et c'est même là qu'elle doit vivre —
       * elle vaut plusieurs années, le dossier vaut une saison. Chercher
       * seulement dans le dossier faisait dire au contrôle « sans plateforme
       * de marque active » sur une marque qui en a une.
       *
       * Quand la bibliothèque en porte une, ce qui manque n'est plus la
       * plateforme : c'est le rattachement explicite que le §6 bis exige. */
      if (aSection(p, "bigidea") && s.bigidea && s.bigidea.idee) {
        var mid = (s.identite || {}).marqueIds ? (s.identite.marqueIds || [])[0] : null;
        var h = mid && window.VAULT ? VAULT.herite("marque", mid, "idee_directrice") : null;
        var auVault = !!(h && h.valeur);
        if (!(s.socle && s.socle.idee_directrice) && !auVault) {
          pousser(trouves, p, "socle-absent", "Big idea ouverte sans plateforme de marque active", "creation", "socle");
        } else if (auVault && !s.bigidea.rattachement) {
          pousser(trouves, p, "rattachement-absent",
            "La big idea ne dit pas à quoi elle se rattache dans la plateforme de marque",
            "creation", "bigidea");
        }
      }

      /* Auteur de l'idée */
      if (s.bigidea && s.bigidea.idee && !s.bigidea.auteur) {
        pousser(trouves, p, "auteur-absent", "L'auteur de la big idea n'est pas nommé", "creation", "bigidea");
      }

      /* Critères d'acceptation */
      if (s.bigidea && s.bigidea.idee && !(s.bigidea.criteres && s.bigidea.criteres.length)) {
        pousser(trouves, p, "criteres-absents", "Aucun critère d'acceptation écrit", "creation", "bigidea");
      }

      /* Le porteur du brief. Un brief est le travail de quelqu'un : c'est lui
       * qui a écouté, mis en forme, et qui répond de l'écart entre ce qui a
       * été dit et ce qui est écrit. Sans lui, le brief n'est de personne. */
      if (aSection(p, "brief") && !(s.brief && s.brief.porteur)) {
        pousser(trouves, p, "brief-sans-porteur", "Le brief n'a pas de porteur nommé", "clientele", "brief");
      }

      /* Un produit montré là où il n'est pas vendu. Le contrôle ne peut se
       * faire que sur les livrables qui déclarent leurs packs — les autres sont
       * muettes, et c'est une information aussi. */
      if (window.VAULT) {
        var horsZone = (p.livrables || []).filter(function (l) {
          return !l.annule && VAULT.packsHorsZone(l).hors.length; });
        if (horsZone.length) {
          pousser(trouves, p, "sku-hors-zone",
            horsZone.length + (horsZone.length > 1 ? " livrables montrent un produit" : " livrable montre un produit")
              + " non distribué sur son marché", "creation", "livrables");
        }

        /* Un packshot CMYK sur un support d'écran. Le fichier est bon, il n'est
         * pas au bon endroit. */
        var ecrans = { social: true, kv: true };
        var cmyk = (p.livrables || []).filter(function (l) {
          if (l.annule) return false;
          var sp = DEPOT.trouve("supports", l.support);
          if (!sp || !ecrans[sp.type]) return false;
          return VAULT.packsDe(l).some(function (s) { return s.espace === "CMYK"; });
        });
        if (cmyk.length) {
          pousser(trouves, p, "packshot-cmyk",
            cmyk.length + (cmyk.length > 1 ? " livrables digitales montrent un packshot CMYK"
                                           : " livrable digitale montre un packshot CMYK"),
            "creation", "livrables");
        }
      }

      /* Une faute déjà commise, encore présente. Elle est notée au vault de la
       * marque ; l'outil la traque sur tout ce qui se lit. */
      if (window.VAULT) {
        var fautives = (p.livrables || []).filter(function (l) {
          return !l.annule && VAULT.fautesSur(l).length; });
        if (fautives.length) {
          var f0 = VAULT.fautesSur(fautives[0])[0];
          pousser(trouves, p, "orthographe-diffusee",
            fautives.length + (fautives.length > 1 ? " livrables portent « " : " livrable porte « ")
              + f0.mauvais + " »" + (f0.bon ? " au lieu de « " + f0.bon + " »" : ""),
            "creation", "livrables");
        }
      }

      /* Une langue de marché que la source elle-même contredit. La note du
       * référentiel garde la contradiction ; le blocage la ramène au dossier. */
      var douteux = {};
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.marche) return;
        var mk = DEPOT.trouve("marches", l.marche);
        if (mk && mk.note) douteux[mk.code] = mk;
      });
      var codes = Object.keys(douteux);
      if (codes.length) {
        pousser(trouves, p, "langue-marche-douteuse",
          codes.length + (codes.length > 1 ? " marchés ont une langue contestée : "
                                           : " marché a une langue contestée : ")
            + codes.join(", "), "clientele", "livrables");
      }

      /* L'ombrelle doit être considérée : si la campagne la déclare et
       * qu'aucun maître ne porte son logo, on le dit avant le client. */
      if (p.campagne && p.campagne.ombrelle && !p.campagne.ombrelle.logo) {
        var maitres = (p.livrables || []).filter(function (l) {
          return !l.annule && l.niveau === "maitre"; }).length;
        if (maitres) {
          pousser(trouves, p, "logo-ombrelle-absent",
            "Logo " + p.campagne.ombrelle.nom + " absent des " + maitres
              + " KV masters", "creation", "livrables");
        }
      }

      /* La charge dépasse la fenêtre. Les deux nombres existent déjà ; ce qui
       * manquait, c'est qu'ils se regardent. */
      if (window.OBJECTIFS) {
        var eng = OBJECTIFS.engagements().filter(function (x) { return x.projet.id === p.id; })[0];
        if (eng && eng.tenable === false && eng.joursRestants !== null && eng.charge) {
          /* Deux phrases, deux fautes différentes. « Il reste moins de temps
           * que de travail » peut être du glissement, et se rattrape. « La
           * charge dépassait la fenêtre dès le premier jour » est un cadrage
           * qui ne pouvait pas marcher — et ça ne se reproche ni au même
           * moment, ni à la même personne. */
          pousser(trouves, p, "charge-hors-fenetre",
            eng.tenableDepart === false
              ? Math.round(eng.charge) + " j de travail pour une fenêtre de "
                + eng.duree + " j : elle ne tenait pas dès le départ"
              : Math.round(eng.charge) + " j de travail pour "
                + Math.max(0, eng.joursRestants) + " j restants",
            "creation", "livrables");
        }
      }

      /* Les adaptations reviennent au DA de leur piste. */
      if (window.KV) {
        var mal = KV.adaptationsMalPortees(p);
        if (mal.length) {
          pousser(trouves, p, "adaptation-hors-da",
            mal.length + (mal.length > 1 ? " adaptations ne sont pas au DA de leur piste"
                                         : " adaptation n'est pas au DA de sa piste"),
            "creation", "livrables");
        }
      }

      /* DA affecté */
      var aDA = (p.equipe || []).some(function (m) { return m.poste === "da"; });
      if (aSection(p, "pistes") && !aDA) {
        pousser(trouves, p, "da-absent", "Aucun Directeur Artistique affecté au dossier", "creation", "equipe");
      }

      /* Le brief-back : trois lignes avant le premier atelier.
       *
       * Il n'est dû qu'une fois la conception ouverte — le réclamer sur un
       * dossier qu'on vient de recevoir serait réclamer avant d'avoir lu. Ce
       * qui le déclenche est donc la séance de créa ou la première piste. */
      if (aSection(p, "briefback")) {
        var bb = s.briefback || {};
        var at = s.atelier || {};
        var conceptionOuverte = (s.pistes || []).length > 0
          || !!at.tenue_le
          || (at.idees || []).length > 0
          || !!((s.bigidea || {}).idee || "").trim();

        if (conceptionOuverte && !(bb.compris || "").trim()) {
          pousser(trouves, p, "briefback-absent",
            "La conception est ouverte, aucun brief-back n'est parti", "creation", "briefback");
        } else if (bb.envoye_le && !(bb.reponse || "").trim()) {
          pousser(trouves, p, "briefback-sans-reponse",
            "Brief-back envoyé le " + O.jourCourt(bb.envoye_le) + ", sans retour",
            "clientele", "briefback");
        }
      }

      /* ————— La chaîne du raisonnement —————
       *
       * Un insight, un territoire, des axes qui remontent à eux. Ces contrôles
       * ne cherchent pas des champs vides : ils cherchent des raisonnements qui
       * ne tiennent pas debout, et c'est ce qui les rend chers. */
      var insights = window.INSIGHT ? INSIGHT.liste(p) : [];
      insights.forEach(function (i) {
        INSIGHT.normaliser(i);
        var t = INSIGHT.texte(i);
        var court = t.length > 52 ? t.slice(0, 52) + "…" : t;

        if (!i.couche) {
          pousser(trouves, p, "insight-sans-couche",
            "Insight sans couche — « " + court + " »", "planning", "strategie", i.id);
        }
        if (!(i.passes.temps.empeche || "").trim() && INSIGHT.texte(i)) {
          pousser(trouves, p, "insight-est-un-constat",
            "« " + court + " » ne dit pas ce que ça empêche", "planning", "strategie", i.id);
        }
        if (i.sources.length < INSIGHT.CROISEMENT && INSIGHT.texte(i)) {
          pousser(trouves, p, "insight-une-source",
            (i.sources.length || "Aucune") + " source"
              + (i.sources.length > 1 ? "s croisées" : "") + " sur "
              + INSIGHT.CROISEMENT + " — « " + court + " »", "planning", "strategie", i.id);
        }
        if (INSIGHT.verdict(i).cle === "non-teste" && INSIGHT.texte(i)) {
          pousser(trouves, p, "insight-non-teste",
            "« " + court + " » n'a pas passé les trois questions", "planning", "strategie", i.id);
        }

        /* Le décalage de couche. Il se ferme par l'écrit, jamais par
         * l'obéissance : le brief-back qui porte l'écart le fait disparaître. */
        var d = INSIGHT.decalage(p, i);
        if (d) pousser(trouves, p, "decalage-de-couche", d.quoi, "planning", "strategie", i.id);
      });

      /* Le test d'une minute : remonter chaque axe jusqu'à son insight.
       *
       * Si les insights diffèrent, ce ne sont pas des axes — ce sont des
       * recommandations concurrentes, et c'est le client qui recomposera. Le
       * cas maison de l'anniversaire télécom est exactement celui-là : trois
       * axes également finis, trois racines, donc trois baselines. */
      if (window.RECO && aSection(p, "pistes")) {
        var r = RECO.racines(p);
        if (r.concurrents) {
          pousser(trouves, p, "axes-concurrents",
            r.nRacines + " racines pour " + r.nVives + " pistes vives", "creation", "pistes");
        }
        r.orphelines.forEach(function (pi) {
          pousser(trouves, p, "piste-hors-territoire",
            "Piste « " + (pi.titre || "sans titre") + " » ne remonte à aucun territoire",
            "creation", "pistes", pi.id);
        });
        /* Un territoire à un seul concept est légitime sur un cycle éditorial :
         * un mois ne met pas deux routes en concurrence, il en tient une. */
        if (!NATURE.estContinu(p)) {
          r.maigres.forEach(function (t) {
            pousser(trouves, p, "territoire-a-un-concept",
              "Territoire « " + (t.nom || t.quoi || "sans nom").slice(0, 40) + " » n'ouvre qu'un concept",
              "planning", "strategie", t.id);
          });
        }
      }

      /* ————— L'école déclarée, et la preuve qu'elle réclame —————
       *
       * Déclarer une école n'est pas une préférence de style : c'est s'engager
       * à porter sa preuve. Disruption veut la convention en trois visuels,
       * Brutal Simplicity le chemin de réduction, Account Planning un insight
       * qui passe le test. */
      if (window.ECOLES) {
        ECOLES.declarees(p).forEach(function (x) {
          var pr = ECOLES.preuve(p, x.cle, x.etage);
          if (!pr || pr.ok) return;
          var e = ECOLES.de(x.cle);
          /* La convention a son propre prix : c'est le contrôle le plus cité du
           * métier, et le confondre avec les autres l'affadirait. */
          if (e && e.exige === "convention") {
            pousser(trouves, p, "convention-supposee",
              "Disruption déclarée, la convention n'est pas montrée", "planning", "strategie",
              x.territoire ? x.territoire.id : null);
            return;
          }
          pousser(trouves, p, "ecole-sans-preuve",
            (e ? e.nom : x.cle) + " déclarée — " + pr.quoi + " manque",
            "planning", "strategie", x.territoire ? x.territoire.id : null);
        });

        /* Deux écoles au même étage. Elles ne se neutralisent QUE si chacune
         * apporte sa racine : c'est la nuance de la v4, et sans elle le
         * contrôle interdirait un mélange qui tient très bien. */
        var parEtage = {};
        ECOLES.declarees(p).forEach(function (x) {
          (parEtage[x.etage] = parEtage[x.etage] || []).push(x);
        });
        Object.keys(parEtage).forEach(function (et) {
          var xs = parEtage[et];
          if (xs.length < 2) return;
          var cles = {};
          xs.forEach(function (x) { cles[x.cle] = 1; });
          if (Object.keys(cles).length < 2) return;
          var racines = {};
          xs.forEach(function (x) {
            var r = x.territoire && x.territoire.insightId ? x.territoire.insightId : "?";
            racines[r] = 1;
          });
          if (Object.keys(racines).length < 2) return;
          pousser(trouves, p, "ecoles-meme-etage",
            Object.keys(cles).length + " écoles à l'étage « " + et + " », sur "
              + Object.keys(racines).length + " racines différentes",
            "planning", "strategie");
        });
      }

      /* Le seul contrôle du corpus d'efficacité. Le 60/40 et l'ESOV restent en
       * lecture : appliquer un seuil britannique sans mesure locale, ce serait
       * refaire l'erreur qu'on reproche aux doctrines d'agence. */
      if (window.EFFICACITE) {
        var sansSource = EFFICACITE.sansSource(p);
        if (sansSource.length) {
          pousser(trouves, p, "chiffre-sans-source",
            sansSource.length + (sansSource.length > 1 ? " chiffres du dossier n'ont" : " chiffre du dossier n'a")
              + " ni source ni niveau de preuve", "planning", "strategie");
        }
      }

      /* ————— La recommandation : sa structure, ses rôles, son arbitrage —————
       *
       * « Aucun deck ne sort sans slide d'arbitrage. Quelle que soit la
       * structure, l'agence recommande. Sans elle, elle devient exécutante. »
       * Le cas maison l'a prouvé : quatre-vingt-sept pages, trois axes
       * également finis, pas une ligne d'arbitrage — et trois baselines. */
      if (window.RECO && aSection(p, "presentation")) {
        var arb = RECO.arbitrage(p);
        var d = p.presentation || null;
        var salle = RECO.lireLaSalle(p);

        if (arb.due) {
          var aPage = d && (d.pages || []).some(function (x) { return x.type === "arbitrage"; });
          if (!arb.prete || (d && !aPage)) {
            pousser(trouves, p, "reco-sans-arbitrage",
              arb.pistes.length + " pistes présentées"
                + (!arb.piste ? ", aucune défendue"
                  : !(arb.piste.raisons || []).length ? ", sans les trois raisons"
                  : !(arb.piste.integrite || "").trim() ? ", sans ce qui casse si on recompose"
                  : ", sans page d'arbitrage au deck"),
              "creation", "presentation");
          }
          /* Les rôles n'ont de sens qu'en routes parallèles : c'est la seule
           * structure qui met les pistes côte à côte. */
          var enRoutes = (d && d.structure === "routes")
            || (!d && salle.structures.indexOf("routes") !== -1);
          if (enRoutes && !arb.pistes.some(function (pi) { return !!pi.role; })) {
            pousser(trouves, p, "pistes-sans-role",
              arb.pistes.length + " pistes d'égale valeur, aucun rôle posé", "creation", "pistes");
          }
          /* L'intégrité : due dès que la salle a plusieurs étages. */
          if (salle.integrite && arb.piste && !(arb.piste.integrite || "").trim()) {
            pousser(trouves, p, "integrite-non-ecrite",
              "Comités en cascade, et « " + (arb.piste.titre || "la piste défendue")
                + " » ne dit pas ce qui casse si on recompose", "creation", "pistes", arb.piste.id);
          }
        }

        /* Un deck qui mélange deux squelettes. On ne compare pas des pages à un
         * squelette théorique — on regarde si des pages appartiennent en propre
         * à une AUTRE structure que celle déclarée. */
        if (d && d.structure) {
          var mien = RECO.structure(d.structure);
          var communs = { titre: 1, piste: 1, planche: 1, mockup: 1, dispositif: 1,
            livrables: 1, calendrier: 1, suite: 1, credits: 1 };
          var etrangeres = (d.pages || []).filter(function (x) {
            return !communs[x.type] && mien && mien.squelette.indexOf(x.type) === -1;
          });
          if (etrangeres.length) {
            pousser(trouves, p, "structure-hybride",
              "Deck en « " + mien.nom + " » avec "
                + etrangeres.length + " page" + (etrangeres.length > 1 ? "s" : "")
                + " d'une autre structure", "creation", "presentation");
          }
        }
      }

      /* Arbitrage : plus d'une piste en lice, aucune retenue */
      var pistes = (s.pistes || []);
      var retenue = pistes.filter(function (x) { return x.statut === "retenue"; }).length;
      if (pistes.length > 1 && retenue === 0) {
        pousser(trouves, p, "arbitrage-absent", pistes.length + " pistes en lice, aucune retenue", "creation", "pistes");
      }
      /* L'axe créatif : ce qui sépare une piste d'une autre. Le contrôle ne
       * mord que sur les pistes vives — écarter une piste sans axe n'est pas
       * une faute, c'est une décision déjà prise. */
      /* Le même prix, répété une fois par piste, cesse d'être lu à la seconde.
       * Deux pistes sans axe se disent en un blocage qui porte le nombre —
       * c'est le mécanisme du lot, déjà écrit pour les livrables. */
      var jumeauxDits = {};
      var sansAxe = [];
      pistes.forEach(function (pi) {
        if (!pi.auteurDA) pousser(trouves, p, "auteur-absent", "Piste « " + (pi.titre || "sans titre") + " » sans auteur", "creation", "pistes");
        if (pi.statut === "ecartee" || !window.AXE) return;

        var a = AXE.de(pi);
        if (!a.complet) sansAxe.push({ l: { id: pi.id }, pi: pi, a: a });

        var j = AXE.jumelles(p, pi);
        if (j.length && !jumeauxDits[O.normalise(pi.axe_ton)]) {
          jumeauxDits[O.normalise(pi.axe_ton)] = true;
          pousser(trouves, p, "axe-jumeau",
            "« " + (pi.titre || "sans titre") + " » et « " + (j[0].titre || "sans titre")
              + " » portent le même ton", "da", "pistes");
        }
      });

      if (sansAxe.length === 1) {
        var x = sansAxe[0];
        pousser(trouves, p, "axe-absent",
          "Piste « " + (x.pi.titre || "sans titre") + " » — "
            + (x.a.vide ? "aucun axe créatif écrit"
              : x.a.manque.map(function (c) { return c.court.toLowerCase(); }).join(", ") + " à écrire"),
          "da", "pistes", x.pi.id);
      } else if (sansAxe.length > 1) {
        var tous = sansAxe.every(function (x) { return x.a.vide; });
        var b = pousser(trouves, p, "axe-absent",
          sansAxe.length + " pistes sur " + pistes.length
            + (tous ? " n'ont aucun axe créatif écrit" : " ont un axe incomplet"),
          "da", "pistes");
        b.pieces = sansAxe.map(function (x) { return x.pi.id; });
      }

      /* Livrables. Une campagne multi-marchés porte quatorze livrables : quatorze
       * lignes identiques dans le rail ne dirigent rien. Au-delà de deux, le
       * blocage se dit une fois, avec son nombre. */
      var lots = { "sans-proprietaire": [], "maitre-perime": [], "droits-insuffisants": [], "entree-sans-fournisseur": [], "livrable-sans-piste": [] };
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        (l.entrees || []).forEach(function (e) {
          if (!e.fournisseur) lots["entree-sans-fournisseur"].push({ l: l, quoi: "« " + e.quoi + " » attendu sans fournisseur nommé" });
        });
        if (!l.responsable) lots["sans-proprietaire"].push({ l: l, quoi: "Livrable « " + l.nom + " » sans responsable" });
        /* Un livrable que nulle piste ne gouverne ne se refuse que par le goût.
         * Vaut pour une campagne comme pour un cycle : un cycle ne met pas
         * deux pistes en concurrence, mais il en tient une.
         *
         * Sauf pour une reprise de conformité — un film d'emballage qu'on remet
         * au nouveau code-barre n'exécute aucun concept : il exécute une norme.
         * Lui réclamer une piste, c'est inventer un blocage là où il n'y en a
         * pas, et cinquante-neuf fois de suite. */
        if (!l.pisteId && !l.conformite) lots["livrable-sans-piste"].push({ l: l, quoi: "« " + l.nom + " » ne relève d'aucune piste" });
        if (maitrePerime(p, l)) lots["maitre-perime"].push({ l: l, quoi: "« " + l.nom + " » adapté sur une version dépassée du master" });
        var d = droitsInsuffisants(l);
        if (d) lots["droits-insuffisants"].push({ l: l, quoi: d });
      });

      /* Les inférences hors champs critiques : un seul blocage, avec le nombre. */
      if (window.INFERENCE) {
        var deja = {};
        trouves.forEach(function (b) { if (b.infere) deja[b.infere.section + "." + b.infere.champ] = true; });
        var infs = INFERENCE.liste(p).filter(function (x) { return !deja[x.cle]; });
        if (infs.length) {
          var bi = pousser(trouves, p, "infere-non-contresigne",
            infs.length + (infs.length > 1 ? " champs tiennent" : " champ tient") + " sur une inférence",
            "creation", "identite", "lot-inferences");
          bi.inferences = infs.map(function (x) { return x.cle; });
        }
      }

      poserLot(trouves, p, lots["sans-proprietaire"], "sans-proprietaire", "creation", "livrables",
        function (n) { return n + " livrables sans responsable"; });
      poserLot(trouves, p, lots["maitre-perime"], "maitre-perime", "da", "livrables",
        function (n) { return n + " adaptations faites sur une version dépassée du master"; });
      poserLot(trouves, p, lots["droits-insuffisants"], "droits-insuffisants", "motion", "livrables",
        function (n) { return n + " visuels hors zone ou hors durée de cession"; });
      poserLot(trouves, p, lots["entree-sans-fournisseur"], "entree-sans-fournisseur", "creation", "livrables",
        function (n) { return n + " éléments d'entrée attendus sans fournisseur nommé"; });
      poserLot(trouves, p, lots["livrable-sans-piste"], "livrable-sans-piste", "creation", "pistes",
        function (n) { return n + " livrables ne relèvent d'aucune piste"; });

      /* ————— La conformité d'un parc d'emballages —————
       *
       * Trois crans par film : l'exé existe, il porte le nouveau code-barre, il
       * porte le QR. Chaque film relevé garde ce que le tableau en disait ET ce
       * que le disque en montrait : c'est l'écart entre les deux qui coûte, pas
       * l'un ou l'autre pris seul. */
      var conformes = (p.livrables || []).filter(function (l) {
        return !l.annule && l.conformite; });
      if (conformes.length) {
        var contredits = conformes.filter(function (l) {
          return l.releve && l.releve.ecart; });
        var annonces = conformes.filter(function (l) {
          return l.releve && l.releve.ecart === "annonce-sans-fichier"; });
        var faux = conformes.filter(function (l) {
          return l.conformite.codebarre === "fait" && l.conformite.exe !== "fait"; });
        var sansQR = conformes.filter(function (l) { return l.conformite.qr !== "fait"; });
        var monoFormat = conformes.filter(function (l) {
          return l.releve && l.releve.formats && l.releve.formats.length === 1; });

        if (annonces.length) {
          var ba = pousser(trouves, p, "exe-annonce-absent",
            annonces.length + " films sont comptés faits sans qu'aucun fichier existe",
            "graphic", "livrables");
          ba.pieces = annonces.map(function (l) { return l.id; });
        }
        if (faux.length) {
          var bf = pousser(trouves, p, "codebarre-sur-exe-absent",
            faux.length + " films portent le nouveau code-barre sur un exé absent",
            "graphic", "livrables");
          bf.pieces = faux.map(function (l) { return l.id; });
        }
        if (contredits.length) {
          var bc = pousser(trouves, p, "releve-contredit",
            contredits.length + " films sur " + conformes.length
              + " : le tableau et le disque se contredisent",
            "clientele", "livrables");
          bc.pieces = contredits.map(function (l) { return l.id; });
        }
        /* Le QR n'est pas un état de fichier : c'est une décision qui n'est pas
         * prise. Tant qu'elle ne l'est pas, produire un exé, c'est produire une
         * reprise. */
        if (sansQR.length && !(p.sections.identite || {}).qr) {
          var bq = pousser(trouves, p, "qr-sans-specification",
            "Le QR est exigé sur " + sansQR.length + " films et n'est spécifié nulle part",
            "creation", "identite");
          bq.pieces = sansQR.slice(0, 12).map(function (l) { return l.id; });
        }
        if (monoFormat.length) {
          pousser(trouves, p, "exe-sans-pdf",
            monoFormat.length + (monoFormat.length > 1 ? " exés n'ont qu'un format livré" : " exé n'a qu'un format livré"),
            "graphic", "livrables");
        }
      }

      /* ————— Un découpage dont les cadres sont vides —————
       *
       * Un film qui a son plan de tournage écrit et aucune image n'est pas
       * « en cours » : il est arrêté à la porte de la production. */
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.plans || !l.plans.length) return;
        var vides = l.plans.filter(function (x) { return !x.visuel; }).length;
        if (!vides) return;
        pousser(trouves, p, "storyboard-vide",
          "« " + l.nom + " » — " + vides + " cadres du découpage sur "
            + l.plans.length + " sont vides", "da", "livrables", l.id);
      });

      /* Le dernier mètre. Un livrable approuvé qui part sans ses droits, ses
       * mentions ou son nommage entre faux dans le DAM du client — et il y
       * reste faux des années. C'est le seul contrôle qui regarde APRÈS le
       * verdict : tous les autres regardent avant. */
      if (window.REMISE) {
        var L = REMISE.lot(p);
        var incomplets = L.total - L.prets;
        if (incomplets) {
          pousser(trouves, p, "remise-sans-manifeste",
            incomplets + (incomplets > 1 ? " pièces approuvées partiraient" : " pièce approuvée partirait")
              + " sans manifeste complet", "da", "livraison");
        }
      }

      /* ————— Ce qui circule entre frères d'une même campagne —————
       *
       * La dépendance maître → adaptation existe depuis le début, mais au
       * niveau du livrable. Entre PROJETS il n'y avait rien : le film attend
       * le KV maître de la campagne, ses jours de production sont réservés, et
       * aucun écran ne le disait. */
      (p.attend || []).forEach(function (amont) {
        var a = DEPOT.trouve("projets", amont);
        if (!a) return;
        var livre = window.CLOTURE && CLOTURE.est(a);
        if (livre) return;
        var j = window.CHIFFRAGE ? CHIFFRAGE.estime(p) : 0;
        pousser(trouves, p, "attend-un-projet-en-retard",
          "En attente de « " + a.nom + " »"
            + (j ? " — " + j + (j > 1 ? " jours réservés" : " jour réservé") : ""),
          "creation", "identite", amont);
      });

      /* La piste retenue sur un projet de la campagne gouverne ses frères.
       * C'est le test d'une minute — deux racines, deux recommandations — un
       * cran plus haut : deux concepts dans le même temps fort, et le client
       * recompose. Un projet qui s'écarte le DÉCLARE ; le contrôle ne se lève
       * pas sur celui qui a écrit son écart. */
      if (window.CAMPAGNE && p.campagneId && aSection(p, "pistes")) {
        var ref = CAMPAGNE.pisteDeReference(p.campagneId);
        if (ref && ref.projet.id !== p.id && !(p.ecartDeCampagne || "").trim()) {
          var sienne = (s.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
          if (sienne) {
            pousser(trouves, p, "hors-piste-de-campagne",
              "Piste propre alors que « " + ref.projet.nom + " » gouverne la campagne",
              "creation", "pistes");
          }
        }
      }

      /* Le chiffrage engagé sans contrepartie écrite. Faille 10.3 de l'audit :
       * « non annulable sans frais n'a aucun montant à opposer ». Il en a un
       * désormais — encore faut-il que le bon de commande soit arrivé. */
      if (window.CHIFFRAGE && CHIFFRAGE.de(p)
          && (CHIFFRAGE.jours(p) || (p.chiffrage || {}).montant)
          && (p.chiffrage || {}).bonDeCommande !== "recu") {
        pousser(trouves, p, "bon-de-commande-absent",
          "Projet chiffré, bon de commande " + ((p.chiffrage || {}).bonDeCommande === "absent"
            ? "explicitement absent" : "non reçu"),
          "clientele", "identite");
      }

      /* La boucle qui se ferme, ou qui reste ouverte à l'écran.
       *
       * « bilan-absent » portait son prix dans la table depuis le premier jour
       * et aucun contrôle ne le levait : la promesse M10 écrite à moitié. La
       * clôture lui donne enfin son moment — c'est le seul contrôle qui NAÎT
       * quand un dossier se ferme, au lieu de se taire. */
      /* Seulement sur une clôture CONFIRMÉE. Réclamer un bilan pour une fin
       * que personne n'a encore validée, c'est demander le diagnostic d'une
       * campagne dont on n'a pas dit qu'elle était finie — et cent trente fois,
       * c'est du bruit qui enterre les seize vrais. */
      /* La première boucle, et celle dont les trois autres dépendent. Comme
       * « bilan-absent », elle ne vaut que sur une clôture CONFIRMÉE : on ne
       * réclame pas le résultat d'une campagne dont personne n'a encore dit
       * qu'elle était finie. */
      if (estClos(p) && !p.cloture.infere
          && window.BOUCLES && !BOUCLES.resultats(p).length) {
        pousser(trouves, p, "clos-sans-resultat",
          "Dossier clos sans résultat mesuré", "planning", "identite");
      }

      if (estClos(p) && !p.cloture.infere && !((p.cloture || {}).bilan || "").trim()) {
        pousser(trouves, p, "bilan-absent",
          "Dossier clos le " + O.jourCourt(p.cloture.le) + " sans bilan",
          "planning", "identite");
      }
    });

    return reconcilier(trouves);
  }

  /* Un champ critique a trois états, pas deux : reçu, inféré, absent. */
  function critique(liste, p, section, champ, type, quoi, poste) {
    var v = (p.sections[section] || {})[champ];
    var rempli = Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== "");
    if (!rempli) { pousser(liste, p, type, quoi, poste, section); return; }
    if (window.INFERENCE && INFERENCE.est(p, section, champ)) {
      var b = pousser(liste, p, "infere-non-contresigne",
        quoi.replace(/ non nommé$| : non nommé$| non fixées$/, "") + " — inféré, non contresigné",
        poste, section, section + "." + champ);
      b.infere = { section: section, champ: champ, valeur: v };
    }
  }

  /* Le mécanisme de silence vit dans nature.js, et nulle part ailleurs. Cinq
   * endroits bouclaient sur la table des gabarits, chacun avec ses mots. */
  function aSection(p, cle) { return NATURE.aSection(p, cle); }

  /* Un lot : en dessous de trois on nomme chaque livrable, au-delà on nomme le
   * nombre — et on garde la liste, pour pouvoir l'ouvrir. */
  var SEUIL_LOT = 3;

  function poserLot(liste, projet, lot, type, poste, section, phrase) {
    if (!lot.length) return;
    if (lot.length < SEUIL_LOT) {
      lot.forEach(function (x) { pousser(liste, projet, type, x.quoi, poste, section, x.l.id); });
      return;
    }
    var b = pousser(liste, projet, type, phrase(lot.length), poste, section);
    b.pieces = lot.map(function (x) { return x.l.id; });
  }

  /* ————— La clôture, et ce qu'elle ne fait pas taire —————
   *
   * Un dossier clos ne se répare plus. Nommer aujourd'hui le décideur d'une
   * campagne de 2025 ne rend aucune validation opposable, et écrire son
   * brief-back ne protège plus rien : le blocage ne demande rien à personne,
   * il occupe seulement la place de ceux qui demandent quelque chose.
   *
   * Mais les pièces, elles, sont toujours dehors. Un produit montré sur un
   * marché qui ne le vend pas se rappelle encore ; une faute part sur toute la
   * descendance le jour où on réemploie le visuel ; une licence expire après
   * la campagne, pas avec elle. Ceux-là continuent de parler.
   *
   * La ligne est donc celle-ci, et c'est la seule qui tienne : la clôture fait
   * taire ce qu'on ne peut plus réparer, jamais ce qui peut encore mordre.
   *
   * Le filtre vit ici, dans pousser(), et nulle part ailleurs : c'est le seul
   * passage obligé des cinquante-deux contrôles. Posé dans blocages(), il
   * aurait été oublié au cinquante-troisième. */
  var SURVIT_A_LA_CLOTURE = {
    "sku-hors-zone": 1,          /* le rappel est encore possible */
    "orthographe-diffusee": 1,   /* la faute repart avec le visuel réemployé */
    "packshot-cmyk": 1,          /* le fichier reste faux pour le prochain usage */
    "langue-marche-douteuse": 1, /* c'est le référentiel qui est faux, et il ressert */
    "droits-insuffisants": 1,    /* une cession expire après la campagne, pas avec elle */
    "maitre-perime": 1,          /* des adaptations vivent sur une version morte */
    "bilan-absent": 1,           /* le contrôle propre de la clôture */
    "clos-sans-resultat": 1,     /* idem : il NAÎT à la fermeture */
  };

  function estClos(p) { return !!(p && p.cloture && p.cloture.le); }

  function pousser(liste, projet, type, quoi, poste, section, cible) {
    var b = {
      cle: projet.id + "|" + type + "|" + (cible || section),
      projet: projet.id,
      projetNom: projet.nom,
      type: type,
      quoi: quoi,
      poste: poste,
      section: section,
      cible: cible || null,
      prix: prix(type),
    };
    /* Sur un dossier clos, seuls les contrôles qui mordent encore sont poussés.
     * L'objet est rendu quand même : les appelants lui posent des propriétés
     * (pieces, infere, inferences) et n'ont pas à savoir si le dossier est
     * clos. Il part au rebut, pas dans la liste. */
    if (estClos(projet) && !SURVIT_A_LA_CLOTURE[type]) return b;
    liste.push(b);
    return b;
  }

  /* Rapproche les blocages calculés du registre : date de naissance, résolution,
   * et les « ce n'en est pas un ». */
  function reconcilier(calcules) {
    var registre = DEPOT.liste("blocages");
    var parCle = {};
    registre.forEach(function (r) { parCle[r.cle] = r; });
    var maintenant = new Date().toISOString();
    var sortie = [];

    calcules.forEach(function (b) {
      var r = parCle[b.cle];
      if (!r) {
        r = { id: O.id("BLQ"), cle: b.cle, ne_le: maintenant, resolu_le: null, ecarte: null };
        DEPOT.liste("blocages").push(r);
      }
      if (r.resolu_le) { r.resolu_le = null; } /* il est revenu */
      if (r.ecarte) return; /* tu as dit que ce n'en était pas un */
      b.id = r.id;
      b.depuis = r.ne_le;
      b.jours = O.depuis(r.ne_le);
      sortie.push(b);
    });

    /* Ceux du registre qui ne sont plus calculés sont résolus. */
    var clesVives = {};
    calcules.forEach(function (b) { clesVives[b.cle] = true; });
    registre.forEach(function (r) {
      if (!clesVives[r.cle] && !r.resolu_le) r.resolu_le = maintenant;
    });

    return sortie.sort(function (a, b) { return b.jours - a.jours; });
  }

  function ecarter(id, motif) {
    var r = DEPOT.trouve("blocages", id);
    if (!r) return;
    r.ecarte = { motif: motif, quand: new Date().toISOString() };
    DEPOT.tracer("écarté", "blocages", id, motif);
    DEPOT.enregistrer();
  }

  /* ————— Maître et adaptations ————— */

  function maitrePerime(projet, livrable) {
    if (!livrable.maitre) return false;
    var m = (projet.livrables || []).filter(function (x) { return x.id === livrable.maitre; })[0];
    if (!m) return false;
    return (m.version || 1) > (livrable.versionMaitre || 0);
  }

  function adaptations(projet, maitreId) {
    return (projet.livrables || []).filter(function (l) { return l.maitre === maitreId; });
  }

  function adaptationsPerimees(projet, maitreId) {
    return adaptations(projet, maitreId).filter(function (l) { return maitrePerime(projet, l); });
  }

  /* ————— Droits ————— */

  function droitsInsuffisants(livrable) {
    var msg = null;
    (livrable.assets || []).forEach(function (aid) {
      var a = DEPOT.trouve("assets", aid);
      if (!a) return;
      if (a.zones && a.zones.length && livrable.marche && a.zones.indexOf(livrable.marche) === -1) {
        msg = "« " + a.nom + " » utilisé sur " + livrable.marche + ", hors des zones couvertes";
      }
      if (a.expire_le && livrable.publication && new Date(a.expire_le) < new Date(livrable.publication)) {
        msg = "Les droits de « " + a.nom + " » expirent avant la diffusion";
      }
    });
    return msg;
  }

  /* ————— Recevabilité sur dix points ————— */

  function completude(livrable) {
    var points = {};
    /* Repli sur l'ancienne clé : un dépôt écrit avant le renommage doit
     * continuer de s'ouvrir. Rien n'est réécrit tant qu'on ne touche pas au
     * livrable — la migration se fait au premier clic. */
    var porte = livrable.points || livrable.axes;
    MAISON.points.forEach(function (a) {
      points[a.cle] = (porte && porte[a.cle]) || "attente";
    });
    return points;
  }

  function pretSur(livrable) {
    var c = completude(livrable);
    var n = 0, total = 0;
    MAISON.points.forEach(function (a) {
      if (c[a.cle] === "sansobjet") return;
      total++;
      if (c[a.cle] === "pret") n++;
    });
    return { pret: n, total: total, part: total ? Math.round((n / total) * 100) : 0 };
  }

  /* L'axe qui coince, et chez qui. */
  function coince(livrable) {
    var c = completude(livrable);
    var liste = [];
    MAISON.points.forEach(function (a) {
      if (c[a.cle] === "attente") liste.push({ point: a.nom, poste: a.poste, cle: a.cle });
    });
    return liste;
  }

  /* ————— Grille d'évaluation, par cases cochées ————— */

  function grille(type, objet) {
    var criteres = MAISON.criteres[type] || [];
    var coches = (objet && objet.grille) || {};
    return criteres.map(function (c, i) {
      return { texte: c, cle: type + "-" + i, tenu: coches[type + "-" + i] === true };
    });
  }

  /* ————— Contrôle de vocabulaire — règles R10 et R12 ————— */

  function vocabulaire(texte) {
    var t = O.normalise(texte);
    var trouves = [];
    MAISON.motsInterdits.forEach(function (m) {
      if (t.indexOf(O.normalise(m)) !== -1) trouves.push({ mot: m, type: "interdit" });
    });
    MAISON.nomsRetires.forEach(function (m) {
      if (t.indexOf(O.normalise(m)) !== -1) trouves.push({ mot: m, type: "retire" });
    });
    return trouves;
  }

  return {
    prix: prix, blocages: blocages, ecarter: ecarter, estClos: estClos,
    adaptations: adaptations, adaptationsPerimees: adaptationsPerimees, maitrePerime: maitrePerime,
    droitsInsuffisants: droitsInsuffisants,
    completude: completude, pretSur: pretSur, coince: coince,
    grille: grille, vocabulaire: vocabulaire,
  };
})();
