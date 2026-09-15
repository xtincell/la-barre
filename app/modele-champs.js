/* modele-champs.js — les champs de chaque section.
 *
 * Un seul moteur de saisie et un seul moteur de lecture s'en servent.
 * Ajouter un champ = une ligne ici. Le schéma est versionné : on n'en retire
 * jamais un sans incrémenter, sinon les projets d'avant ne se lisent plus.
 */

window.CHAMPS = {
  version: 1,

  sections: [
    {
      cle: "identite",
      nom: "Identité",
      poste: "clientele",
      champs: [
        /* Le client et les marques se convoquent au vault. Recopiés à la main,
         * ils ne se lient à rien : ni au socle, ni au catalogue de packs, ni
         * aux décideurs — et « Bonnet Rouge & Peak » devient une chaîne que
         * rien ne sait relire. */
        { cle: "clientId", nom: "Client", type: "objet", source: "clients", requis: true,
          vide: "— quel annonceur ? —" },
        { cle: "marqueIds", nom: "Marques", type: "objets", requis: true,
          aide: "Une campagne peut en porter plusieurs. Elles viennent de la bibliothèque de marque.",
          source: function (v) {
            var t = DEPOT.liste("marques");
            return v.clientId ? t.filter(function (m) { return m.clientId === v.clientId; }) : t;
          } },
        { cle: "type", nom: "Type de projet", type: "texte", aide: "Film, campagne 360, KV, activation…" },
        { cle: "echeance", nom: "Échéance client", type: "date", requis: true },
        { cle: "budget", nom: "Budget", type: "nombre", aide: "En FCFA. Absent est une information, pas un vide." },
        { cle: "decideurId", nom: "Décideur final", type: "objet", source: function (v) {
            var t = DEPOT.liste("contacts");
            return v.clientId ? t.filter(function (c) { return c.clientId === v.clientId; }) : t;
          }, libelle: function (c) { return c.nom + (c.role ? " · " + c.role : ""); },
          requis: true, critique: true, poste: "clientele",
          vide: "— qui décide ? —",
          aide: "Un contact du client, pas un nom recopié : c'est lui qui porte le délai de retour." },
        { cle: "tueur", nom: "Qui peut annuler une idée validée", type: "texte", requis: true, critique: true, aide: "Siège, comité de marque, actionnaire. Il y en a presque toujours un." },
        { cle: "circuit", nom: "Circuit et délai de validation", type: "texte", critique: true, aide: "Nombre de passages, délai réel entre présentation et accord ferme." },
        { cle: "fenetre", nom: "Fenêtre de diffusion", type: "texte", requis: true, critique: true },
      ],
    },
    {
      cle: "brief",
      nom: "Brief",
      poste: "clientele",
      contributeur: "planning",
      champs: [
        { cle: "verbatim", nom: "Demande, mot pour mot", type: "long", critique: true, poste: "clientele", aide: "Les mots du client. Ne pas corriger, ne pas lisser." },
        { cle: "probleme", nom: "Problème réel", type: "long", critique: true, poste: "planning", aide: "Distinct de la demande exprimée." },
        { cle: "objectif_business", nom: "Objectif business", type: "long", critique: true, poste: "clientele" },
        { cle: "objectif_com", nom: "Objectif de communication", type: "long", critique: true, poste: "clientele" },
        { cle: "cible", nom: "Cible et tension", type: "long", critique: true, poste: "planning" },
        { cle: "insight", nom: "Insight", type: "long", critique: true, poste: "planning" },
        { cle: "promesse", nom: "Promesse", type: "texte", critique: true, poste: "planning" },
        { cle: "rtb", nom: "Reason to believe", type: "puces", poste: "planning" },
        { cle: "ton", nom: "Ton et interdits", type: "long", critique: true, poste: "planning" },
        { cle: "contraintes", nom: "Contraintes de production", type: "long", critique: true, poste: "clientele" },
        { cle: "mandatories", nom: "Mandatories", type: "puces", poste: "clientele" },
        { cle: "livrables_attendus", nom: "Périmètre de livrables", type: "puces", critique: true, poste: "clientele" },
        { cle: "kpis", nom: "Critères de succès mesurables", type: "puces", critique: true, poste: "clientele", aide: "Chacun avec sa source de mesure, sinon il n'est pas mesurable." },
      ],
    },
    /* Le brief-back. Trois lignes, par écrit, avant le premier atelier.
     *
     * « Le document le moins coûteux et le plus protecteur du métier. » Il ne
     * refuse pas le brief — refuser fait perdre le budget et laisse le problème
     * entier. Il ne le dit pas non plus en réunion de restitution, où le client
     * découvre en public qu'il s'est trompé et défend son brief au lieu
     * d'écouter. Il pose la question par écrit, avant de commencer, et laisse
     * le client y répondre lui-même.
     *
     * La quatrième ligne n'est pas dans la méthode : c'est le produit qui
     * l'exige. Sans écart écrit, le désaccord n'existe nulle part — et c'est
     * la création qu'on tiendra pour responsable. */
    {
      cle: "briefback",
      nom: "Brief-back",
      poste: "creation",
      champs: [
        { cle: "compris", nom: "Ce que nous avons compris", type: "long", requis: true,
          critique: true,
          aide: "Le problème reformulé dans nos mots, en une phrase. Si le client "
            + "corrige, c'est déjà un gain." },
        { cle: "couche", nom: "La couche où nous pensons qu'il vit", type: "choix",
          requis: true, critique: true,
          options: [{ cle: "consommateur", nom: "Consommateur — le message et le ton" },
                    { cle: "culture", nom: "Culture — la big idea" },
                    { cle: "categorie", nom: "Catégorie — le positionnement" },
                    { cle: "entreprise", nom: "Entreprise — une correction de marque" }],
          aide: "Sans jargon, dans la phrase : « le sujet nous semble être la place "
            + "de la marque, plus que sa notoriété »." },
        { cle: "propose", nom: "Ce que nous proposons de produire", type: "long",
          requis: true, critique: true,
          aide: "Le livrable, nommé." },
        { cle: "ecart", nom: "L'écart avec ce qui est demandé", type: "long",
          aide: "Si le livrable diffère de ce qui est demandé, c'est ici qu'on l'écrit "
            + "— pas en fin de présentation. Une ligne suffit : elle protège le "
            + "travail, et elle se cite six mois plus tard." },
        { cle: "envoye_le", nom: "Envoyé le", type: "date" },
        { cle: "reponse", nom: "Réponse du client", type: "long",
          aide: "Ce qu'il a corrigé, confirmé ou ignoré." },
        { cle: "repondu_le", nom: "Répondu le", type: "date" },
      ],
    },

    {
      cle: "socle",
      nom: "Plateforme de marque",
      poste: "creation",
      partage: true,
      champs: [
        { cle: "positionnement", nom: "Positionnement", type: "long", requis: true },
        { cle: "promesse", nom: "Promesse", type: "texte", requis: true },
        { cle: "idee_directrice", nom: "Idée directrice", type: "texte", requis: true, aide: "Pluriannuelle. Les campagnes en sont des déclinaisons." },
        { cle: "benefices", nom: "Bénéfices, dans l'ordre", type: "puces", aide: "L'ordre ne se réarrange pas." },
        { cle: "preuves", nom: "Preuves tangibles", type: "puces" },
        { cle: "ton", nom: "Personnalité et ton", type: "long" },
        { cle: "jamais", nom: "La marque ne dit jamais", type: "puces" },
        { cle: "symboles", nom: "Symboles", type: "puces" },
        { cle: "ne_fera_pas", nom: "Ce que la plateforme de marque ne fera pas", type: "puces" },
      ],
    },
    {
      cle: "strategie",
      nom: "Stratégie",
      poste: "planning",
      champs: [
        { cle: "probleme_reel", nom: "Problème réel", type: "long", requis: true },
        /* L'insight et le territoire ne sont plus des champs.
         *
         * Ils étaient deux paragraphes, et deux paragraphes ne portent ni
         * couche, ni sources, ni test, ni identifiant — donc une piste ne
         * pouvait remonter à rien. Ce sont maintenant des objets, dans
         * p.insights et p.territoires, rendus par VUE_INSIGHT. Les anciennes
         * clés restent au dépôt : on archive, on ne supprime pas.
         *
         * « tension » a rejoint le deuxième temps de l'insight : elle n'était
         * pas un champ à côté, elle en était la moitié. */
        { cle: "opportunite", nom: "Opportunité", type: "long" },
        { cle: "gardefous", nom: "Garde-fous", type: "puces" },
      ],
    },
    {
      cle: "bigidea",
      nom: "Big idea",
      poste: "creation",
      champs: [
        { cle: "idee", nom: "L'idée, en une phrase", type: "texte", requis: true, aide: "Au-delà d'une phrase, elle est refusable." },
        { cle: "campagne", nom: "Nom de campagne", type: "texte", requis: true },
        { cle: "auteur", nom: "Auteur de l'idée", type: "personne", requis: true, aide: "Constaté, pas attribué. Se saisit en séance, avant l'arbitrage." },
        { cle: "mecanique", nom: "La mécanique", type: "long", requis: true, aide: "Lisible indépendamment du média. Test : la reformuler sans nommer le support." },
        { cle: "rattachement", nom: "Rattachement à la plateforme de marque", type: "long", requis: true, aide: "Explicite, ou justifier l'écart." },
        { cle: "signature", nom: "Signature de campagne", type: "texte" },
        { cle: "ton_campagne", nom: "Ton", type: "texte" },
        { cle: "phares", nom: "Éléments phares imposés", type: "puces", aide: "Leur absence est un motif de refus." },
        { cle: "criteres", nom: "Critères d'acceptation", type: "puces", requis: true, aide: "Les seuls éléments opposables au travail du DA." },
        { cle: "interdits", nom: "Directions interdites", type: "puces" },
        { cle: "validite", nom: "Condition de validité", type: "long", requis: true },
      ],
    },
  ],

  /* Une piste créative. */
  piste: [
    { cle: "titre", nom: "Titre de la piste", type: "texte", requis: true },
    /* La racine. C'est elle qui rend le test d'une minute possible : remonter
     * chaque axe jusqu'à son insight, et voir s'ils en partagent un. Sans elle,
     * trois pistes dans un deck peuvent traiter trois problèmes différents sans
     * que rien ne le dise — et le client sortira trois signatures. */
    { cle: "territoireId", nom: "Territoire", type: "territoire", requis: true,
      aide: "L'espace dont cette piste est un concept. Il porte l'insight." },
    { cle: "auteurDA", nom: "Auteur — Direction Artistique", type: "personne", requis: true },
    { cle: "auteurCR", nom: "Auteur — Concepteur-rédacteur", type: "personne" },
    { cle: "concept", nom: "Le concept", type: "long", requis: true },
    { cle: "accroches", nom: "Accroches", type: "puces", aide: "Cinq mots maximum, sinon refusable." },
    { cle: "visuel", nom: "Concept visuel", type: "long" },
    { cle: "mecanique", nom: "Mécanique", type: "long", requis: true },
    { cle: "executionCle", nom: "L'exécution clé", type: "long",
      aide: "Celle qui rend la piste lisible avant qu'on l'explique." },
    /* Le prix à payer a deux moitiés, et le produit n'en portait qu'une. Ce
     * qu'une piste privilégie se lit rarement tout seul : c'est ce qui la rend
     * défendable autrement que par le goût. « sacrifice » reste lu par les
     * anciens écrans, et suit prix.sacrifie. */
    { cle: "sacrifice", nom: "Ce qu'elle sacrifie", type: "long", requis: true },
    { cle: "privilegie", nom: "Ce qu'elle privilégie", type: "long",
      aide: "L'autre moitié du prix à payer." },
    { cle: "argument", nom: "L'argument qui la soutient", type: "long", requis: true },
    /* Les trois rôles. « Ne pas présenter trois pistes d'égale valeur : une
     * piste à vendre, deux qui bornent le territoire. » N'a de sens que sur une
     * reco en routes parallèles — ailleurs le champ reste vide sans coûter. */
    { cle: "role", nom: "Rôle dans la reco", type: "choix",
      options: [{ cle: "sage", nom: "La sage" },
                { cle: "defendue", nom: "Celle qu'on défend" },
                { cle: "radicale", nom: "La radicale" }],
      aide: "La sage rassure et rend les autres lisibles ; la radicale borne le "
        + "territoire par le haut et rend la défendue raisonnable." },
    { cle: "integrite", nom: "Ce qui casse si on recompose", type: "long",
      aide: "Ce qui se perd si le concept de cette piste est monté sur l'exécution "
        + "d'une autre. Écrit ici, cité plus tard — sur un compte à comités en "
        + "cascade, c'est la seule pièce écrite qui protège le travail." },
    { cle: "raisons", nom: "Les trois raisons de la recommander", type: "puces",
      aide: "Dans l'ordre : réponse au brief, potentiel de durée, capacité de la "
        + "marque à la porter. Pas de superlatif." },
    { cle: "porteurs", nom: "Porteurs de reconnaissance", type: "puces", aide: "Trois. Deux doivent survivre au montage." },
    { cle: "production", nom: "Implications de production", type: "long" },
  ],

  /* Un livrable — une case de la matrice. */
  livrable: [
    { cle: "nom", nom: "Nom", type: "texte", requis: true },
    { cle: "support", nom: "Support", type: "texte", requis: true },
    { cle: "marche", nom: "Marché", type: "texte" },
    { cle: "responsable", nom: "Responsable", type: "personne", requis: true },
    { cle: "echeance", nom: "Échéance", type: "date" },
    { cle: "remise", nom: "Remise du fichier", type: "date", aide: "Au fournisseur. Différente de la publication." },
    { cle: "publication", nom: "Publication", type: "date" },
    { cle: "estime", nom: "Estimé (jours)", type: "nombre" },
    { cle: "reel", nom: "Réel (jours)", type: "nombre" },
    { cle: "toursVendus", nom: "Allers-retours de révision vendus", type: "nombre" },
  ],

  /* Utilitaires */
  section: function (cle) {
    var t = null;
    CHAMPS.sections.forEach(function (s) { if (s.cle === cle) t = s; });
    return t;
  },

  critiques: function (cleSection) {
    var s = CHAMPS.section(cleSection);
    return s ? s.champs.filter(function (c) { return c.critique; }) : [];
  },

  /* Complétude d'une section : renseignés sur total, et les critiques manquants. */
  etat: function (cleSection, donnees) {
    var s = CHAMPS.section(cleSection);
    if (!s) return { fait: 0, total: 0, manquants: [] };
    var d = donnees || {};
    var fait = 0, manquants = [];
    s.champs.forEach(function (c) {
      var v = d[c.cle];
      var rempli = Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== "");
      if (rempli) fait++;
      else if (c.critique || c.requis) manquants.push(c);
    });
    return { fait: fait, total: s.champs.length, manquants: manquants };
  },
};
