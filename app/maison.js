/* Profil de l’installation historique. Exclu de la distribution neutre. */
window.MAISON = MAISON_BASE.creer({
  "nom": "MATANGA AGENCY",
  "exempleDescription": "MT-0020 est chargé, avec ses trous : identité à 4 champs sur 9, porte B non arbitrée.",
  "postes": [
    {
      "cle": "clientele",
      "nom": "Directeur Clientèle",
      "court": "Clientèle",
      "position": "Le capitaine sur le terrain",
      "rattache": "direction-generale",
      "couleur": "#10646E"
    },
    {
      "cle": "creation",
      "nom": "Directeur de la Création",
      "court": "Création",
      "position": "L'entraîneur du jeu créatif",
      "rattache": "direction-generale",
      "couleur": "#B02118",
      "titulaire": true
    },
    {
      "cle": "da",
      "nom": "Directeur Artistique",
      "court": "Direction Artistique",
      "position": "Le meneur de jeu",
      "rattache": "creation",
      "couleur": "#B07714"
    },
    {
      "cle": "planning",
      "nom": "Strategy Planner",
      "court": "Planning",
      "position": "L'analyste qui lit le match avant qu'il commence",
      "rattache": "creation",
      "couleur": "#2E5D4A"
    },
    {
      "cle": "redacteur",
      "nom": "Concepteur-Rédacteur",
      "court": "Rédaction",
      "position": "Le passeur décisif",
      "rattache": "creation",
      "couleur": "#6B4E9E",
      "aCreer": true
    },
    {
      "cle": "graphic",
      "nom": "Graphic Designer",
      "court": "Graphic",
      "position": "Le milieu de terrain qui touche tous les ballons",
      "rattache": "da",
      "couleur": "#8A6A2F"
    },
    {
      "cle": "motion",
      "nom": "Motion Designer & IA",
      "court": "Motion",
      "position": "L'ailier rapide",
      "rattache": "da",
      "couleur": "#A0651F"
    },
    {
      "cle": "motion3d",
      "nom": "Motion Designer 3D / FX",
      "court": "Motion 3D",
      "position": "Le spécialiste des coups francs",
      "rattache": "da",
      "couleur": "#8C5A25"
    },
    {
      "cle": "webdesign",
      "nom": "Webdesigner",
      "court": "Web",
      "position": "L'ailier polyvalent",
      "rattache": "da",
      "couleur": "#7A6A55"
    },
    {
      "cle": "digital",
      "nom": "Digital Communication Manager",
      "court": "Digital",
      "position": "Le milieu box-to-box",
      "rattache": "clientele",
      "couleur": "#2F6E8F"
    },
    {
      "cle": "horsmedia",
      "nom": "Responsable Hors Média",
      "court": "Hors média",
      "position": "Le joueur de terrain, au contact",
      "rattache": "clientele",
      "couleur": "#456B5A"
    },
    {
      "cle": "event",
      "nom": "Event Planner",
      "court": "Événement",
      "position": "L'organisateur du match à domicile",
      "rattache": "clientele",
      "couleur": "#5A6B7A"
    },
    {
      "cle": "it",
      "nom": "IT Manager",
      "court": "IT",
      "position": "Le défenseur central",
      "rattache": "direction-generale",
      "couleur": "#4A5568"
    },
    {
      "cle": "eccp",
      "nom": "Chef·fe du Département ECCP",
      "court": "ECCP",
      "position": "Le staff : préparation, soin et vestiaire",
      "rattache": "direction-generale",
      "couleur": "#6B5B73"
    },
    {
      "cle": "daf",
      "nom": "Direction Administrative et Financière",
      "court": "DAF",
      "position": null,
      "rattache": "direction-generale",
      "couleur": "#5C5C5C",
      "aCompleter": true
    },
    {
      "cle": "direction-generale",
      "nom": "Direction Générale",
      "court": "DG",
      "position": null,
      "rattache": null,
      "couleur": "#241C18"
    }
  ],
  "titulaire": "creation",
  "motsInterdits": [
    "révolutionner",
    "disrupter",
    "innovant",
    "nouvelle génération",
    "tout-en-un",
    "gratuit",
    "solution",
    "centraliser"
  ],
  "nomsRetires": [
    "Creative Space"
  ],
  "doctrine": {
    "documents": [
      {
        "cle": "insight",
        "nom": "Insight et création",
        "fichier": "sources/07_doctrine/Insight_et_creation_v4.pdf",
        "gouverne": "les quatre couches, le test en trois questions, la forme en trois temps"
      },
      {
        "cle": "ecoles",
        "nom": "Les écoles de pensée publicitaires",
        "fichier": "sources/07_doctrine/Ecoles_de_pensee_publicitaires_v4.pdf",
        "gouverne": "les douze écoles, leur preuve attendue, les deux corpus d'efficacité"
      },
      {
        "cle": "reco",
        "nom": "La recommandation créative",
        "fichier": "sources/07_doctrine/Recommandation_creative_v5.pdf",
        "gouverne": "les six structures, la lecture de la salle, la slide d'arbitrage"
      }
    ],
    "ecolesMaison": [
      "account-planning",
      "disruption",
      "truth-well-told",
      "brutal-simplicite",
      "cultural-strategy",
      "ehrenberg-bass"
    ]
  },
  "structures": [
    {
      "id": "matanga",
      "nom": "Matanga Agency",
      "court": "Matanga"
    },
    {
      "id": "upgraders",
      "nom": "UPgraders SARL",
      "court": "UPgraders"
    },
    {
      "id": "friends",
      "nom": "Friends Photography Studio SARL",
      "court": "Friends Studio"
    },
    {
      "id": "nom-propre",
      "nom": "Alexandre Djengue, en nom propre",
      "court": "Nom propre"
    }
  ],
  "structurePrincipale": "matanga",
  "presentation": {
    "logo": "assets/review/agence/matanga-logo-blanc.png",
    "decor": "assets/review/agence/matanga-montagne.png"
  },
  "registres": {
    "people": "Matanga People",
    "radar": "Radar Matanga"
  }
});
