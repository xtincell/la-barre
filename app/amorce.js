/* amorce.js — le jeu d'exemple : MT-0020, tel qu'il est réellement.
 *
 * Avec ses trous. Le brief est à 12 champs sur 15, la porte B n'est pas
 * arbitrée, et l'ordre de fabrication porte le concept contesté. C'est ce qui
 * rend l'exemple utile : on voit l'outil sur un dossier qui va mal.
 *
 * Effaçable depuis les réglages. Rien ici n'est nécessaire au produit.
 */

window.AMORCE = (function () {
  function poser() {
    var d = DEPOT.tout();

    /* ————— Les gens ————— */
    d.personnes = [
      { id: "P-alex", nom: "Alexandre Djengue", poste: "creation", casquettes: [{ poste: "producteur", part: 20 }], seniorite: "senior" },
      { id: "P-serge", nom: "Serge Ngueli", poste: "da", casquettes: [{ poste: "motion", part: 40 }], seniorite: "senior" },
      { id: "P-vanelle", nom: "Vanelle", poste: "planning", casquettes: [], seniorite: "confirme" },
      { id: "P-derick", nom: "Derick", poste: "clientele", casquettes: [], seniorite: "senior" },
      { id: "P-jean", nom: "Jean Ronald Mboumgni", poste: "clientele", casquettes: [], seniorite: "confirme" },
    ];

    /* ————— Les marchés : la langue et la zone sont des faits. Le reste se
     * remplit à la première utilisation. ————— */
    d.marches = [
      { id: "M-CM", code: "CM", nom: "Cameroun", langues: ["fr", "en"], zone: "CEMAC",
        sku: ["Boîte 400 g", "Sachet 380 g", "Stick 12 g"], mentions: ["À consommer de préférence avant le…"] },
      { id: "M-CI", code: "CI", nom: "Côte d'Ivoire", langues: ["fr"], zone: "UEMOA",
        sku: ["Boîte 400 g", "Sachet 380 g"], mentions: ["À consommer de préférence avant le…"] },
      { id: "M-GH", code: "GH", nom: "Ghana", langues: ["en"], zone: "Afrique de l'Ouest",
        sku: ["Tin 400 g", "Sachet 380 g"], mentions: ["Best before end"] },
      { id: "M-CG", code: "CG", nom: "Congo", langues: ["fr"], zone: "CEMAC",
        sku: ["Boîte 400 g"], mentions: [] },
      { id: "M-ZA", code: "ZA", nom: "Afrique du Sud", langues: ["en"], zone: "ESA",
        sku: ["Tin 400 g", "Stick 12 g"], mentions: ["Best before end"] },
      { id: "M-BJ", code: "BJ", nom: "Bénin", langues: ["fr"], zone: "UEMOA",
        sku: ["Sachet 380 g"], mentions: [] },
    ];

    /* Les supports existent, leurs gabarits sont vides : ils se renseignent la
     * première fois qu'on les utilise. C'est le principe du référentiel. */
    d.supports = [
      { id: "S-film", code: "film", nom: "Film", type: "film" },
      { id: "S-vertical", code: "vertical", nom: "Vertical 9:16", type: "film" },
      { id: "S-billboard", code: "billboard", nom: "Billboard big size", type: "print" },
      { id: "S-4x3", code: "4x3", nom: "Affiche 4×3", type: "print" },
      { id: "S-pos", code: "pos", nom: "Tête de gondole", type: "print" },
      { id: "S-social", code: "social", nom: "Post social", type: "social" },
      { id: "S-kv", code: "kv", nom: "Key visual", type: "kv" },
    ];

    d.clients = [{ id: "C-matanga", nom: "Matanga Agency", interne: true }];
    d.marques = [{ id: "MQ-people", clientId: "C-matanga", nom: "Matanga People" }];

    /* ————— Le projet ————— */
    var projet = {
      id: "PRJ-0020",
      ref: "MT-0020",
      nom: "Vidéo de présentation Matanga People",
      gabarit: "campagne",
      cree_le: "2026-08-10T08:08:00.000Z",
      statut: "production",
      equipe: [
        { personne: "P-alex", poste: "creation" },
        { personne: "P-serge", poste: "da" },
        { personne: "P-vanelle", poste: "planning" },
      ],
      sections: {
        identite: {
          client: "Matanga Agency",
          marque: "Matanga People",
          type: "Film de présentation produit",
          echeance: "2026-08-17",
          budget: null,
          decideur: "",
          tueur: "",
          circuit: "",
          fenetre: "",
        },
        brief: {
          verbatim: "Créer une vidéo de présentation de la solution Matanga People, à ses différents client.",
          probleme: "Le produit existe et il est documenté. Il a un problème de perception de valeur : inclus sans surcoût, il est reçu comme un accessoire de la collaboration plutôt que comme une raison de choisir l'agence.",
          objectif_business: "Impressionner les clients actuels et les prospects.",
          objectif_com: "Établir un niveau de standard, pas expliquer comment se connecter.",
          cible: "Le prospect — décideur marketing qui compare deux ou trois agences. Le client actuel — accès ouvert, usage faible. Tension commune : l'un comme l'autre a déjà vécu la relation d'agence opaque, et aucun ne le formule à voix haute.",
          insight: "Le client ne demande pas plus de reporting. Il demande de ne plus avoir à le réclamer.",
          promesse: "Vous ne demandez plus où en est votre projet.",
          rtb: [
            "Parcours en quatre étapes, sans installation",
            "Chaque version datée, chaque validation attribuée",
            "Drive permanent, aucun lien qui expire",
            "Visioconférence dans le navigateur, compte rendu en PDF",
            "Cloisonnement strict par entreprise",
            "Inclus dans la collaboration, sans surcoût",
            "Douze marques déjà servies",
          ],
          ton: "Sobre, précis, adulte, sans esbroufe. Interdits : révolutionner, disrupter, nouvelle génération, tout-en-un. Jamais « gratuit » — dire « inclus ».",
          contraintes: "Motion design à partir d'éléments graphiques. Pas ou peu de prise de vue réelle. Un motion designer dédié attend la proposition retenue : sa disponibilité est le chemin critique.",
          mandatories: ["Nom officiel Matanga People et son descripteur", "Le mot « inclus », une seule occurrence", "Les douze marques références"],
          livrables_attendus: ["1 film principal 75 à 90 s", "1 version courte 30 s", "1 version anglaise", "3 extraits verticaux"],
          kpis: [
            "Usage commercial : le film est utilisé en rendez-vous sans qu'on le demande",
            "Demandes de démo depuis la page produit après mise en ligne",
            "Réactivation : clients existants connectés dans les deux semaines",
          ],
        },
        socle: {
          positionnement: "Matanga People est le seul espace où le client d'une agence lit exactement la même information que l'équipe qui travaille pour lui.",
          promesse: "Vous ne demandez plus où en est votre projet.",
          idee_directrice: "Derrière la vitre",
          benefices: ["Vous savez", "Vous tranchez", "Vous retrouvez", "Vous restez maître"],
          preuves: ["Versions datées et attribuées", "Drive permanent", "Cloisonnement par entreprise", "Douze marques références"],
          ton: "Sobre, précis, démontré, adulte, sans esbroufe. Phrases courtes, verbes concrets, deuxième personne.",
          jamais: ["révolutionner", "disrupter", "innovant", "nouvelle génération", "tout-en-un", "gratuit"],
          symboles: ["La vitre", "Le fil", "La clé"],
          ne_fera_pas: [
            "Positionner le produit contre un éditeur de logiciel",
            "Promettre un gain de temps chiffré non mesuré",
            "S'appuyer sur des captures d'écran comme argument principal",
          ],
        },
        strategie: {
          probleme_reel: "Reçu comme un accessoire parce qu'il est décrit comme un outil.",
          insight: "Le client ne demande pas plus de reporting, il demande de ne plus avoir à le réclamer.",
          tension: "Transparence offerte contre transparence risquée.",
          territoire: "La transparence comme risque pris par l'agence, pas comme confort offert au client.",
          gardefous: ["Ne jamais présenter la transparence comme une fonctionnalité", "Aucun écran datable ne porte le film"],
        },
        bigidea: {
          idee: "La transparence n'est pas un service que l'agence rend au client. C'est un risque qu'elle accepte de prendre.",
          campagne: "DE L'AUTRE CÔTÉ",
          auteur: "P-alex",
          mecanique: "Le film ne coupe jamais. Un seul mouvement continu, du côté client vers la structure de travail de l'agence.",
          rattachement: "Déclinaison directe de l'idée directrice « Derrière la vitre ».",
          signature: "Rien ne se referme.",
          ton_campagne: "Sobre, sans emphase.",
          phares: [
            "Nom officiel et descripteur, une fois en clair",
            "La preuve mastersse « derrière la vitre », sujet du film",
            "Les quatre bénéfices dans l'ordre de la plateforme de marque",
            "La traçabilité datée et attribuée, plan le plus long",
            "Le mot « inclus », une seule occurrence",
            "Les douze marques références",
            "L'interface en matière graphique, jamais en capture",
          ],
          criteres: [],
          interdits: ["Aucune interface lisible plus de trois secondes", "Ni témoignage, ni voix commerciale, ni musique montante"],
          validite: "La mécanique est l'idée. Un montage qui introduit une coupe franche, un fondu ou un retour en arrière n'ampute pas la campagne : il l'annule.",
        },
        pistes: [
          {
            id: "PI-1", titre: "De l'autre côté — traitement motion design",
            auteurDA: "P-serge", auteurCR: null,
            concept: "Le projet est un objet, la caméra le longe. Plan horizontal continu, objets graphiques posés dessus, franchissement de la vitre à 00:12.",
            accroches: ["Vous attendez.", "Chez Matanga, non.", "Même ce qui retarde.", "Rien ne se referme."],
            visuel: "Fond sombre avant la vitre, fond clair après. Accent orange réservé aux éléments de décision.",
            mecanique: "Mouvement latéral ininterrompu, 80 secondes, aucune coupe.",
            sacrifice: "", argument: "",
            porteurs: ["Le mouvement latéral ininterrompu", "La traversée de la vitre", "L'orange réservé à la décision"],
            production: "12 à 15 jours ouvrés pour un motion designer dédié.",
            statut: "proposee", recommandee: true,
          },
          {
            id: "PI-2", titre: "Ça, plus jamais — deux listes",
            auteurDA: "P-serge", auteurCR: null,
            concept: "Deux énumérations de même longueur et de même cadence, séparées par un seul mot : le nom du produit.",
            accroches: ["Ça, plus jamais.", "Même ce qui retarde.", "Rien ne se referme."],
            visuel: "Volet artistique laissé ouvert volontairement.",
            mecanique: "Huit douleurs, le pivot, huit réponses dans le même ordre. 75 secondes.",
            sacrifice: "", argument: "",
            porteurs: ["La symétrie des deux listes"],
            production: "Conçu pour LinkedIn, sans son, sur téléphone.",
            statut: "proposee", recommandee: false,
          },
        ],
      },
      volets: [
        { id: "V-film", nom: "Film", supports: ["S-film"], marches: ["M-CM"] },
      ],
      livrables: [
        {
          id: "L-master", niveau: "maitre", nom: "Film principal 80 s", support: "S-film", marche: "M-CM",
          voletId: "V-film", responsable: "P-serge", echeance: null, remise: null, publication: null,
          origine: "prevu", pisteId: "PI-1", maitre: null, version: 1, versions: [],
          estime: null, reel: null, toursVendus: 2, assets: [], entrees: [
            { quoi: "Logotypes vectoriels des douze marques", fournisseur: null, date: null },
            { quoi: "Palette et polices de la charte", fournisseur: null, date: null },
            { quoi: "Jeu de données neutre validé par l'IT", fournisseur: null, date: null },
          ],
          points: { concept: "attente", copy: "attente", asset: "attente", design: "attente", technique: "attente", droits: "attente", langue: "pret", central: "attente", local: "sansobjet", final: "attente" },
        },
        {
          id: "L-30", nom: "Version courte 30 s", support: "S-film", marche: "M-CM",
          voletId: "V-film", responsable: "P-serge", origine: "prevu", pisteId: "PI-1",
          maitre: "L-master", versionMaitre: 1, version: 1, versions: [],
          estime: null, reel: null, toursVendus: 2, assets: [], entrees: [],
          points: { concept: "attente", copy: "attente", asset: "attente", design: "attente", technique: "attente", droits: "attente", langue: "pret", central: "attente", local: "sansobjet", final: "attente" },
        },
        {
          id: "L-vert", nom: "Vertical 9:16", support: "S-vertical", marche: "M-CM",
          voletId: "V-film", responsable: "P-serge", origine: "prevu", pisteId: "PI-1",
          maitre: "L-master", versionMaitre: 1, version: 1, versions: [],
          estime: null, reel: null, toursVendus: 2, assets: [], entrees: [],
          points: { concept: "attente", copy: "attente", asset: "attente", design: "attente", technique: "attente", droits: "attente", langue: "pret", central: "attente", local: "sansobjet", final: "attente" },
        },
        {
          id: "L-en", nom: "Version anglaise", support: "S-film", marche: "M-GH",
          voletId: "V-film", responsable: "P-serge", origine: "prevu", pisteId: "PI-1",
          maitre: "L-master", versionMaitre: 1, version: 1, versions: [],
          estime: null, reel: null, toursVendus: 2, assets: [], entrees: [],
          points: { concept: "attente", copy: "attente", asset: "attente", design: "attente", technique: "attente", droits: "attente", langue: "attente", central: "attente", local: "attente", final: "attente" },
        },
      ],
      notes: "L'ordre de fabrication transmis porte le concept de la piste 2, alors que la big idea en vigueur porte celui de la piste 1. La porte B n'est pas arbitrée.",
    };

    d.projets = [projet, campagneMarches()];

    /* Les blocages de MT-0020 ont une date réelle : c'est tout l'intérêt de
     * l'exemple. Le décideur manque depuis le premier jour, l'échéance est
     * dépassée depuis le 17, l'arbitrage attend depuis le 31. */
    d.blocages = [
      { id: "BLQ-dec", cle: "PRJ-0020|decideur-absent|identite", ne_le: "2026-08-10T08:08:00.000Z", resolu_le: null, ecarte: null },
      { id: "BLQ-tue", cle: "PRJ-0020|tueur-absent|identite", ne_le: "2026-08-10T08:08:00.000Z", resolu_le: null, ecarte: null },
      { id: "BLQ-fen", cle: "PRJ-0020|fenetre-absente|identite", ne_le: "2026-08-17T08:00:00.000Z", resolu_le: null, ecarte: null },
      { id: "BLQ-arb", cle: "PRJ-0020|arbitrage-absent|pistes", ne_le: "2026-08-31T09:00:00.000Z", resolu_le: null, ecarte: null },
      { id: "BLQ-cri", cle: "PRJ-0020|criteres-absents|bigidea", ne_le: "2026-08-31T09:00:00.000Z", resolu_le: null, ecarte: null },
    ];

    d.exemple = true;
    DEPOT.enregistrer();
  }

  /* ————— Le second exemple : une campagne multi-marchés.
   *
   * Quatorze KV masters, trois marques, six marchés — la planche réelle, avec
   * ses erreurs : un marché anglophone servi en français, une accroche de sept
   * mots, un SKU montré là où il n'est pas distribué. C'est exactement ce
   * qu'une planche imprimée ne dit pas.
   */
  function campagneMarches() {
    var COMBIS = [
      ["Peak", "M-CM", "La fête a un goût", ["Boîte 400 g", "Sachet 380 g"], "garçon", "astronaute"],
      ["Peak", "M-CI", "La fête a un goût", ["Boîte 400 g"], "fille", "médecin"],
      ["Peak", "M-GH", "La fête a un goût", ["Tin 400 g"], "garçon", "astronaute"],
      ["Peak", "M-CG", "La fête a un goût", ["Boîte 400 g"], "fille", "juge"],
      ["Peak", "M-ZA", "Christmas tastes like this", ["Tin 400 g"], "garçon", "pilote"],
      ["Peak", "M-BJ", "La fête a un goût", ["Sachet 380 g"], "", ""],
      ["Bonnet Rouge", "M-CM", "Le matin change tout", ["Sachet 380 g"], "fille", "architecte"],
      ["Bonnet Rouge", "M-CI", "Le matin change tout", ["Sachet 380 g"], "garçon", "ingénieur"],
      ["Bonnet Rouge", "M-CG", "Le matin change tout", ["Boîte 400 g"], "", "juge"],
      ["Bonnet Rouge", "M-BJ", "Le matin change tout et pour toute la famille", ["Sachet 380 g"], "fille", "médecin"],
      ["Cowbell", "M-CM", "Grandir ensemble", ["Stick 12 g"], "garçon", "professeur"],
      ["Cowbell", "M-CI", "Grandir ensemble", ["Stick 12 g"], "fille", "avocate"],
      ["Cowbell", "M-GH", "Grandir ensemble", ["Tin 400 g"], "garçon", "professeur"],
      ["Cowbell", "M-ZA", "Growing up together", ["Stick 12 g"], "fille", ""],
    ];

    var livrables = COMBIS.map(function (c, i) {
      var m = null;
      DEPOT.tout().marches.forEach(function (x) { if (x.id === c[1]) m = x; });
      var points = {};
      MAISON.points.forEach(function (a) { points[a.cle] = "attente"; });
      points.concept = "pret";
      if (i < 6) points.design = "pret";
      return {
        id: "KV-" + (i + 1), voletId: "V-kv", support: "S-kv", marche: c[1],
        nom: "KV · " + (m ? m.code : "?") + " · " + c[0],
        responsable: i % 2 ? "P-serge" : null,
        echeance: "2026-09-18", remise: "2026-09-25", publication: null,
        origine: "prevu", pisteId: null, maitre: null, version: 1, versions: [],
        estime: 1, reel: null, toursVendus: 2,
        assets: [], entrees: [], annotations: [], mockups: [], points: points,
        kv: {
          marque: c[0],
          /* Le Ghana est servi en français : l'erreur que la planche ne dit pas. */
          copy: c[2],
          langue: c[1] === "M-GH" && c[0] === "Peak" ? "fr" : (m ? m.langues[0] : ""),
          sku: c[3], enfant: c[4], metier: c[5],
          mentions: m ? (m.mentions || []).slice() : [],
          restrictions: [],
        },
      };
    });

    /* Un SKU montré là où il n'est pas distribué : l'erreur qui fait rappeler
     * une campagne. Ici le stick 12 g, absent du Bénin. */
    livrables[9].kv.sku = ["Sachet 380 g", "Stick 12 g"];

    return {
      id: "PRJ-NOEL", ref: "MT-0031", nom: "Campagne de fin d'année — six marchés",
      gabarit: "campagne", cree_le: "2026-08-24T09:00:00.000Z", statut: "creation",
      equipe: [
        { personne: "P-alex", poste: "creation" },
        { personne: "P-serge", poste: "da" },
        { personne: "P-derick", poste: "clientele" },
      ],
      sections: {
        identite: { client: "Compte lait & nutrition", marque: "Peak · Bonnet Rouge · Cowbell",
          type: "Campagne 360 multi-marchés", echeance: "2026-10-06", budget: null,
          decideur: "", tueur: "", circuit: "" },
        brief: {}, socle: {}, strategie: {},
        bigidea: { idee: "Ce qu'ils deviendront commence à cette table.",
          campagne: "Ce qui commence à table", signature: "Ça commence ici",
          auteur: "P-serge", mecanique: "L'ombre de l'enfant projette le métier qu'il exercera.",
          criteres: [] },
        pistes: [],
      },
      /* Les choix de direction artistique propres à cette campagne. */
      champsDA: [
        { cle: "enfant", nom: "Enfant", type: "texte", aide: "Garçon ou fille." },
        { cle: "metier", nom: "Métier illustré", type: "texte", aide: "L'ombre projetée : astronaute, juge, médecin…" },
      ],
      volets: [{ id: "V-kv", nom: "Key visuals", supports: ["S-kv"],
        marches: ["M-CM", "M-CI", "M-GH", "M-CG", "M-ZA", "M-BJ"] }],
      livrables: livrables,
      notes: "Les KV masters par marché, avant déclinaisons. Chacun porte sa combinaison : marque, accroche, langue, SKU montrés, et les choix de direction artistique.",
    };
  }

  function present() {
    return DEPOT.tout().exemple === true;
  }

  return { poser: poser, present: present };
})();
