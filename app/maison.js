/* maison.js — LA configuration.
 *
 * Tout ce qui est propre à une agence vit ici : les postes, les délais, les
 * étages, les critères de refus, le vocabulaire, la palette. Le reste du code
 * n'écrit jamais « Matanga » ni « 24 h ».
 *
 * Pour installer une autre agence : on remplace ce fichier, rien d'autre.
 */

window.MAISON = {
  nom: "MATANGA AGENCY",
  version: "1.0",
  suite: { nom: "Shinkiro", url: "https://github.com/xtincell/shinkiro" },

  /* ————— Les postes. Source : les fiches de poste. ————— */
  postes: [
    { cle: "clientele", nom: "Directeur Clientèle", court: "Clientèle", position: "Le capitaine sur le terrain", rattache: "direction-generale", couleur: "#10646E" },
    { cle: "creation", nom: "Directeur de la Création", court: "Création", position: "L'entraîneur du jeu créatif", rattache: "direction-generale", couleur: "#B02118", titulaire: true },
    { cle: "da", nom: "Directeur Artistique", court: "Direction Artistique", position: "Le meneur de jeu", rattache: "creation", couleur: "#B07714" },
    { cle: "planning", nom: "Strategy Planner", court: "Planning", position: "L'analyste qui lit le match avant qu'il commence", rattache: "creation", couleur: "#2E5D4A" },
    { cle: "redacteur", nom: "Concepteur-Rédacteur", court: "Rédaction", position: "Le passeur décisif", rattache: "creation", couleur: "#6B4E9E", aCreer: true },
    { cle: "graphic", nom: "Graphic Designer", court: "Graphic", position: "Le milieu de terrain qui touche tous les ballons", rattache: "da", couleur: "#8A6A2F" },
    { cle: "motion", nom: "Motion Designer & IA", court: "Motion", position: "L'ailier rapide", rattache: "da", couleur: "#A0651F" },
    { cle: "motion3d", nom: "Motion Designer 3D / FX", court: "Motion 3D", position: "Le spécialiste des coups francs", rattache: "da", couleur: "#8C5A25" },
    { cle: "webdesign", nom: "Webdesigner", court: "Web", position: "L'ailier polyvalent", rattache: "da", couleur: "#7A6A55" },
    { cle: "digital", nom: "Digital Communication Manager", court: "Digital", position: "Le milieu box-to-box", rattache: "clientele", couleur: "#2F6E8F" },
    { cle: "horsmedia", nom: "Responsable Hors Média", court: "Hors média", position: "Le joueur de terrain, au contact", rattache: "clientele", couleur: "#456B5A" },
    { cle: "event", nom: "Event Planner", court: "Événement", position: "L'organisateur du match à domicile", rattache: "clientele", couleur: "#5A6B7A" },
    { cle: "it", nom: "IT Manager", court: "IT", position: "Le défenseur central", rattache: "direction-generale", couleur: "#4A5568" },
    { cle: "eccp", nom: "Chef·fe du Département ECCP", court: "ECCP", position: "Le staff : préparation, soin et vestiaire", rattache: "direction-generale", couleur: "#6B5B73" },
    { cle: "daf", nom: "Direction Administrative et Financière", court: "DAF", position: null, rattache: "direction-generale", couleur: "#5C5C5C", aCompleter: true },
    { cle: "direction-generale", nom: "Direction Générale", court: "DG", position: null, rattache: null, couleur: "#241C18" },
  ],

  /* Le poste dont c'est l'outil. */
  titulaire: "creation",

  /* ————— Les délais. Source : processus §7. ————— */
  delais: {
    retourBrief: { heures: 24, texte: "24 h", quoi: "La Création peut retourner le brief sous réserve" },
    contestation: { heures: 24, texte: "24 h", quoi: "Le DA peut déposer une contre-proposition complète" },
    arbitrage: { heures: 48, texte: "48 h", quoi: "La Création tranche par écrit" },
    compteRendu: { heures: 48, texte: "48 h", quoi: "Compte rendu par la Clientèle" },
    relecture: { heures: 24, texte: "24 h", quoi: "Relecture Création sur les points touchant l'idée" },
  },

  /* ————— Les étages de finition. Source : processus §3. ————— */
  etages: [
    { n: 0, nom: "Territoire", effort: 5, produit: "Travail écrit. Aucun visuel", ouvertPar: "Brief accepté" },
    { n: 1, nom: "Concept", effort: 15, produit: "3 pistes maximum, une planche d'intention par piste", ouvertPar: "Plateforme créative émise" },
    { n: 2, nom: "Master", effort: 35, produit: "Le livrable master de la piste retenue, animatique", ouvertPar: "Fiche de validation étage 1 signée" },
    { n: 3, nom: "Déploiement", effort: 100, produit: "Formats, déclinaisons, fichiers finaux", ouvertPar: "Fiche de validation étage 2 signée" },
  ],

  /* ————— Les critères de refus, écrits d'avance. Source : §8. ————— */
  criteres: {
    brief: [
      "L'un des onze champs critiques est vide",
      "Il contient un concept, une accroche ou une piste visuelle",
    ],
    bigidea: [
      "L'idée tient en plus d'une phrase",
      "La mécanique n'est lisible que dans un seul média",
      "La condition de validité n'est pas écrite",
    ],
    proposition: [
      "Elle sort de l'étage autorisé",
      "Une piste ne porte pas son sacrifice et son argument",
      "Plusieurs pistes sont recommandées à égalité",
      "Une accroche dépasse cinq mots",
      "Le livrable perd deux de ses trois porteurs de reconnaissance",
    ],
    livrable: [
      "Un critère d'acceptation écrit n'est pas tenu",
      "Le format ne respecte pas le gabarit du support",
      "Une mention obligatoire du marché est absente",
      "Les droits ne couvrent pas l'usage prévu",
    ],
  },

  /* Les critères tels qu'ils se lisent réellement : ceux du fichier, plus ceux
   * que l'usage a fait écrire. Le référentiel se remplit par l'usage — mais un
   * critère ajouté doit survivre au rechargement, sinon on l'écrit deux fois. */
  criteresDe: function (famille) {
    var base = (this.criteres[famille] || []).slice();
    var ajouts = (window.DEPOT && DEPOT.tout().criteresAjoutes) || {};
    (ajouts[famille] || []).forEach(function (c) {
      if (base.indexOf(c) === -1) base.push(c);
    });
    return base;
  },

  ajouterCritere: function (famille, texte) {
    var d = DEPOT.tout();
    if (!d.criteresAjoutes) d.criteresAjoutes = {};
    if (!d.criteresAjoutes[famille]) d.criteresAjoutes[famille] = [];
    if (d.criteresAjoutes[famille].indexOf(texte) !== -1) return false;
    if ((this.criteres[famille] || []).indexOf(texte) !== -1) return false;
    d.criteresAjoutes[famille].push(texte);
    DEPOT.tracer("critère écrit", "maison", famille, texte);
    DEPOT.enregistrer();
    return true;
  },

  /* ————— Les langues des marchés servis. Le code se stocke, le nom s'affiche. ————— */
  langues: { fr: "français", en: "anglais", pt: "portugais", ar: "arabe" },

  /* ————— Le vocabulaire surveillé. Source : socle §10, règles R10 et R12. ————— */
  motsInterdits: ["révolutionner", "disrupter", "innovant", "nouvelle génération", "tout-en-un", "gratuit", "solution", "centraliser"],
  nomsRetires: ["Creative Space"],

  /* ————— Les quatre verdicts. ————— */
  verdicts: [
    { cle: "approuve", nom: "Approuvé", signe: "✓", couleur: "#2E7D4F", motifRequis: false },
    { cle: "reserve", nom: "Approuvé sous réserve", signe: "◐", couleur: "#B07714", motifRequis: true },
    { cle: "retour", nom: "Retour dans le périmètre", signe: "↩", couleur: "#C7501F", motifRequis: true },
    { cle: "hors", nom: "Hors périmètre", signe: "✕", couleur: "#B02118", motifRequis: true },
  ],

  /* ————— Les dix axes de complétude d'un livrable. ————— */
  /* Les dix points de recevabilité. Ils s'appelaient « axes » — le mot est
   * rendu à l'axe créatif, qui est autre chose. */
  points: [
    { cle: "concept", nom: "Concept", poste: "creation" },
    { cle: "copy", nom: "Copy", poste: "redacteur" },
    { cle: "asset", nom: "Asset", poste: "da" },
    { cle: "design", nom: "Design", poste: "da" },
    { cle: "technique", nom: "Technique", poste: "graphic" },
    { cle: "droits", nom: "Droits", poste: "motion" },
    { cle: "langue", nom: "Langue", poste: "redacteur" },
    { cle: "central", nom: "Validation centrale", poste: "clientele" },
    { cle: "local", nom: "Validation locale", poste: "clientele" },
    { cle: "final", nom: "Final", poste: "da" },
  ],

  /* ————— La définition de fini, par type de livrable. ————— */
  definitionsFini: {
    film: ["Exporté aux formats demandés", "Validé par le client", "Publié ou remis", "Sources archivées et nommées"],
    kv: ["Fichier final conforme au gabarit", "Mentions obligatoires vérifiées", "Validé central et local", "Sources archivées et nommées"],
    print: ["BAT signé", "Fichier remis à l'imprimeur", "Épreuve validée", "Sources archivées"],
    social: ["Format et poids conformes", "Copy verrouillé", "Programmé ou publié", "Sources archivées"],
    web: ["Recette passée", "Compatibilité vérifiée", "Mis en ligne", "Sources versionnées"],
    autre: ["Livré", "Validé", "Sources archivées"],
  },

  /* ————— Les trois temps d'un dossier.
   *
   * Ce ne sont pas dix sections de même rang : c'est une chaîne, et chaque
   * temps conditionne le suivant. Concevoir sans avoir cadré, c'est travailler
   * sans filet ; produire sans avoir conçu, c'est fabriquer au hasard.
   * ————— */
  phases: [
    { cle: "cadrer", nom: "Cadrer", quoi: "ce qui est demandé, et par qui",
      sections: ["identite", "brief", "briefback", "socle", "strategie"],
      sans: "on travaillera sans savoir ce qui est attendu, ni qui peut le refuser" },
    { cle: "concevoir", nom: "Concevoir", quoi: "l'idée, et les pistes qui la portent",
      sections: ["atelier", "bigidea", "pistes"],
      sans: "les livrables se fabriqueront sans concept opposable — refusables par goût" },
    { cle: "produire", nom: "Produire", quoi: "les livrables, et ce qu'on présente",
      sections: ["planche", "livrables", "livraison", "presentation"],
      sans: "rien ne part : l'idée reste au dossier" },
  ],

  /* ————— Les natures de projet —————
   *
   * Ce qui s'appelait « gabarit » ne connaissait que quatre valeurs, et les
   * quatre étaient des variantes de campagne publicitaire. Sur les 366 briefs
   * réels du registre de l'agence, 67 sont des campagnes. Les 299 autres —
   * digital, film, conseil, édition, packaging, branding, PLV, véhicule —
   * étaient forcés dans « campagne » et réclamaient un insight pour une mise
   * à jour de code-barre.
   *
   * Une nature déclare quatre choses :
   *   sections   ce que le dossier affiche, et donc ce que les contrôles
   *              peuvent exiger. C'est le même mécanisme qu'avant, appliqué
   *              à une table plus juste.
   *   brief      le type de briefs.js qui la gouverne
   *   pilier     celui des quatre piliers de la marque qu'elle sert, par
   *              défaut. PROPOSÉ, jamais imposé : le pilier est un jugement
   *              stratégique, il entre inféré et se contresigne.
   *   quoi       ce qu'elle est, en une phrase, pour celui qui choisit
   *
   * C'est de la maison, pas du métier : une agence d'Accra a d'autres lignes
   * de service, pas un autre produit.
   * ————— */
  natures: [
    { cle: "campagne", nom: "Campagne", pilier: "E", brief: "campagne",
      quoi: "Un temps fort : Noël, Ramadan, un lancement. Elle cherche une idée et la décline.",
      sections: ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes", "planche", "livrables", "livraison", "presentation"] },

    /* Le cycle garde tout sauf la planche des KV. Ses livrables ne découlent
     * pas d'un visuel de référence : ils se suivent dans un calendrier. J'avais
     * d'abord amputé la moitié de la chaîne, ce qui revenait à dire qu'un cycle
     * n'a pas de concept. Il en a un — il n'a pas de maître. */
    { cle: "cycle", nom: "Cycle éditorial", pilier: "E", brief: "campagne",
      quoi: "Le mois qui tourne : publications datées, un concept, aucun KV maître.",
      sections: ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes", "livrables", "livraison", "presentation"] },

    { cle: "branding", nom: "Identité / branding", pilier: "D", brief: "plateforme",
      quoi: "Créer ou refondre ce qui dure : nom, logo, charte, plateforme de marque.",
      sections: ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes", "planche", "livrables", "livraison", "presentation"] },

    /* Une consultance ne produit pas de visuel : elle produit un raisonnement.
     * Lui réclamer une piste et une planche, c'est lui demander d'être une
     * campagne — et c'est ce que le produit faisait. */
    { cle: "conseil", nom: "Stratégie / conseil", pilier: "A", brief: "requalification",
      quoi: "Un diagnostic, une recommandation, un plan. Aucun livrable visuel.",
      sections: ["identite", "brief", "briefback", "strategie", "presentation"] },

    { cle: "film", nom: "Film / motion", pilier: "E", brief: "estimation",
      quoi: "Un film, une animation. Découpage, estimation technique, versions par langue.",
      sections: ["identite", "brief", "briefback", "bigidea", "pistes", "livrables", "livraison", "presentation"] },

    { cle: "packaging", nom: "Packaging / SKU", pilier: "V", brief: "production",
      quoi: "Le pack, l'étiquette, le film d'emballage. Une norme s'exécute, elle ne se conçoit pas.",
      sections: ["identite", "brief", "livrables", "livraison"] },

    { cle: "plv", nom: "PLV · véhicule · bâtiment", pilier: "D", brief: "declinaison",
      quoi: "Ce qui s'installe : rayon, gondole, camion, mur, affichage.",
      sections: ["identite", "brief", "livrables", "livraison"] },

    { cle: "digital", nom: "Digital / social", pilier: "E", brief: "campagne",
      quoi: "Ce qui vit en ligne : posts, bannières, site, activation digitale.",
      sections: ["identite", "brief", "briefback", "bigidea", "pistes", "livrables", "livraison", "presentation"] },

    { cle: "edition", nom: "Édition / contenu", pilier: "V", brief: "production",
      quoi: "Ce qui se lit : calendrier, brochure, plaquette, catalogue, rapport.",
      sections: ["identite", "brief", "livrables", "livraison"] },

    { cle: "demande", nom: "Demande simple", pilier: "V", brief: "production",
      quoi: "Deux heures de travail. Deux champs et un livrable.",
      sections: ["identite", "livrables", "livraison"] },

    { cle: "pitch", nom: "Pitch", pilier: "D", brief: "pitch",
      quoi: "Sans brief client formel, avec sa date dure et ses jours spéculatifs.",
      sections: ["identite", "briefback", "strategie", "atelier", "bigidea", "pistes", "planche", "livrables", "livraison", "presentation"] },
  ],

  /* ————— Les occasions, et ce qu'elles appellent —————
   *
   * Une marque est toujours en campagne : un régime continu, et des temps
   * forts. Les temps forts ne sont pas des constantes du métier — ce sont le
   * calendrier de CETTE maison et de ses marchés. Noël ne veut pas dire la
   * même chose pour Bonnet Rouge au Cameroun et pour Peak au Somaliland ; une
   * marque peut donc surcharger cette liste dans son propre pilier E.
   *
   * `appelle` est la composition usuelle : ce qu'un lancement suppose comme
   * projets. Elle se PROPOSE à cocher, elle ne se crée jamais seule — et ce
   * qu'on décoche laisse sa trace datée, parce qu'une case vide sans motif se
   * rediscute deux fois.
   * ————— */
  occasions: [
    { cle: "lancement", nom: "Lancement de produit ou de marque",
      appelle: ["branding", "campagne", "film", "plv", "digital", "packaging"] },
    { cle: "noel", nom: "Noël & fin d'année",
      appelle: ["campagne", "plv", "digital"] },
    { cle: "ramadan", nom: "Ramadan & Aïd",
      appelle: ["campagne", "plv", "digital"] },
    { cle: "paques", nom: "Pâques & Carême",
      appelle: ["campagne", "plv", "digital"] },
    { cle: "rentree", nom: "Back to School",
      appelle: ["campagne", "plv", "digital", "film"] },
    { cle: "fete", nom: "Fête des mères, des pères, journée mondiale",
      appelle: ["campagne", "digital"] },
    { cle: "promo", nom: "Promotion & déstockage",
      appelle: ["packaging", "plv", "digital"] },
    { cle: "jeu", nom: "Jeu-concours & activation",
      appelle: ["campagne", "plv", "digital"] },
    { cle: "evenement", nom: "Séminaire, salon, événement",
      appelle: ["plv", "edition", "digital"] },
    { cle: "institutionnel", nom: "Institutionnel & prise de parole",
      appelle: ["conseil", "edition", "digital"] },
    { cle: "continu", nom: "Hors temps fort — le cycle qui tourne",
      appelle: ["cycle"] },
  ],

  /* ————— Les quatre piliers de la marque —————
   *
   * Le cadre ADVE du titulaire, réduit à ce qu'une agence d'exécution en
   * emploie. LA BARRE n'en reprend pas les 155 variables : elle en prend la
   * logique, et garde les codes pour que le branchement futur sur La Fusée
   * soit une identité et non une traduction.
   * ————— */
  piliers: [
    { cle: "A", nom: "Authenticité", figure: "Le Gospel",
      quoi: "Ce que la marque EST. Vision, mission, valeurs, mythe d'origine, archétype.",
      sert: "juger si une piste est la marque, et pas seulement si elle est belle" },
    { cle: "D", nom: "Distinction", figure: "Le Mythe",
      quoi: "Ce qui la sépare des autres. Positionnement, promesse, ton, symboles, dialecte.",
      sert: "refuser une exécution qui pourrait porter le logo d'un concurrent" },
    { cle: "V", nom: "Valeur", figure: "Le Miracle",
      quoi: "Ce qu'elle délivre. Catalogue, échelle de produits, bénéfices, sacrifice demandé.",
      sert: "vérifier qu'on promet ce que le produit tient" },
    { cle: "E", nom: "Engagement", figure: "L'Église",
      quoi: "Ce qui attache. Rituels, points de contact, calendrier sacré, tabous.",
      sert: "savoir quand parler, et ce qu'on ne dit jamais" },
  ],

  /* ————— Les engagements récurrents, tirés des fiches de poste. ————— */
  engagements: [
    { poste: "creation", quoi: "Revue de création", rythme: "hebdomadaire" },
    { poste: "creation", quoi: "Veille créative et technologique partagée", rythme: "mensuel" },
    { poste: "creation", quoi: "Plan de progression des créatifs", rythme: "trimestriel" },
    { poste: "da", quoi: "Veille visuelle partagée", rythme: "mensuel" },
    { poste: "planning", quoi: "Note de veille marché", rythme: "mensuel" },
    { poste: "planning", quoi: "Bilan post-campagne", rythme: "par campagne" },
    { poste: "motion", quoi: "Note de veille IA + démonstration", rythme: "trimestriel" },
    { poste: "motion3d", quoi: "Veille technique et démonstration", rythme: "trimestriel" },
    { poste: "redacteur", quoi: "Note de veille éditoriale", rythme: "mensuel" },
    { poste: "digital", quoi: "Rapport de performance", rythme: "mensuel" },
    { poste: "graphic", quoi: "Sources rangées et nommées", rythme: "par livraison" },
    { poste: "graphic", quoi: "Propositions personnelles", rythme: "par campagne" },
    { poste: "webdesign", quoi: "Rapport de performance", rythme: "par livraison" },
  ],

  /* ————— La doctrine, et ce que la maison en a réglé.
   *
   * La distinction que le produit tient depuis le premier jour : le métier en
   * code, la maison en configuration. La doctrine elle-même est du métier
   * universel — une agence d'Accra a les mêmes douze écoles, les mêmes quatre
   * couches, les mêmes six structures — et elle vit donc dans ses modules.
   *
   * Ce qui suit n'est pas la doctrine : c'est la CALIBRATION que cette
   * maison-ci lui applique. Trois sources croisées plutôt que deux, trois
   * visuels pour prouver une convention, une référence à 60/40 qu'aucune
   * donnée locale ne corrobore. Ce sont des choix, ils se discutent, et ils
   * n'ont rien à faire dans du code de métier.
   *
   * Chaque module lit ces valeurs et garde la sienne en repli : une maison qui
   * n'écrit pas la clé n'empêche pas le produit de tourner.
   * ————— */
  doctrine: {
    /* Les documents qui font foi. Le produit ne les lit pas encore ; il sait
     * au moins dire lequel gouverne quoi, et où le trouver. */
    documents: [
      { cle: "insight", nom: "Insight et création",
        fichier: "sources/07_doctrine/Insight_et_creation_v4.pdf",
        gouverne: "les quatre couches, le test en trois questions, la forme en trois temps" },
      { cle: "ecoles", nom: "Les écoles de pensée publicitaires",
        fichier: "sources/07_doctrine/Ecoles_de_pensee_publicitaires_v4.pdf",
        gouverne: "les douze écoles, leur preuve attendue, les deux corpus d'efficacité" },
      { cle: "reco", nom: "La recommandation créative",
        fichier: "sources/07_doctrine/Recommandation_creative_v5.pdf",
        gouverne: "les six structures, la lecture de la salle, la slide d'arbitrage" },
    ],

    /* Combien de sources indépendantes avant de tenir un insight pour écrit.
     * « Une seule produit une opinion ; trois produisent un insight. » */
    sourcesCroisees: 3,

    /* Combien de visuels de concurrents pour qu'une convention soit prouvée.
     * En dessous, elle est supposée — et la rupture qu'on bâtit dessus casse
     * peut-être une porte ouverte. */
    preuvesConvention: 3,

    /* Les écoles que la maison pratique réellement. Les autres restent
     * consultables : on ne retire pas une école du métier parce qu'on ne s'en
     * sert pas cette année. */
    ecolesMaison: ["account-planning", "disruption", "truth-well-told",
      "brutal-simplicite", "cultural-strategy", "ehrenberg-bass"],

    /* La référence de répartition marque / activation, et la réserve qui doit
     * l'accompagner partout où elle s'affiche. Sans la réserve, le chiffre
     * devient un seuil — et ce serait importer une croyance. */
    cibleMarque: 60,
    reserveEfficacite:
      "Le 60/40 vient de la base de cas de l'IPA — Royaume-Uni, États-Unis, "
      + "Australie, grande consommation. Aucune donnée locale ne le corrobore ici : "
      + "c'est une référence, pas un seuil. L'écart se lit, il ne se corrige pas.",

    /* Ce qui fait lire la salle. Ces mots-ci sont ceux que NOS clients emploient
     * dans leur circuit de validation — une autre maison en écrirait d'autres. */
    salles: {
      cascade: ["cascade", "regional", "régional", "groupe", "group", "siege",
        "siège", "holding", "maison mere"],
      board: ["board", "conseil", "actionnaire", "investisseur", "bailleur"],
      fondateur: ["fondateur", "fondatrice", "president", "président", "pdg",
        "directeur general", "directrice generale"],
      comite: ["comite", "comité", "collegial", "collégial"],
    },
    /* À partir de combien de dossiers antérieurs un compte est « installé ». */
    compteInstalle: 2,

    /* L'appariement d'un lot de fichiers livrés à leurs livrables. En dessous
     * du seuil on ne propose rien ; deux candidats plus proches que la marge
     * font hésiter plutôt que trancher. */
    appariement: { seuil: 0.45, marge: 0.12 },
  },

  /* ————— La palette. Source : l'ordre de fabrication MT-0020. ————— */
  palette: {
    sombre: "#241C18",
    papier: "#E6EAE7",
    accent: "#C7501F",
    vert: "#2E7D4F",
    alerte: "#B02118",
    attente: "#B07714",
  },
};
