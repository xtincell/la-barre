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

  /* ————— Les gabarits de projet. ————— */
  gabarits: [
    { cle: "campagne", nom: "Campagne", sections: ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes", "planche", "livrables", "livraison", "presentation"] },
    /* Un cycle éditorial est une campagne mensuelle : il a sa plateforme de
     * marque, son atelier au début du cycle, sa big idea et sa piste — et
     * toutes les publications du mois vivent DANS cette piste.
     *
     * Une seule chose lui manque, et ce n'est pas un manque : le KV master.
     * Ses livrables ne découlent pas d'un visuel de référence, elles se suivent
     * dans un calendrier. C'est donc la planche des KV qui saute, et elle
     * seule — j'avais d'abord amputé la moitié de la chaîne, ce qui revenait
     * à dire qu'un cycle n'a pas de concept. */
    { cle: "cycle", nom: "Cycle éditorial",
      sections: ["identite", "brief", "briefback", "socle", "strategie", "atelier", "bigidea", "pistes", "livrables", "livraison", "presentation"] },
    { cle: "demande", nom: "Demande simple", sections: ["identite", "livrables", "livraison"] },
    { cle: "pitch", nom: "Pitch", sections: ["identite", "briefback", "strategie", "atelier", "bigidea", "pistes", "planche", "livrables", "livraison", "presentation"] },
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
