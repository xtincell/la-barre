# SPÉCIFICATION — OBJETS « BRIEF » ET « PLATEFORME DE MARQUE »

**Destinataire : IT Manager · Émetteur : Direction de la Création · Projet : Matanga People**

---

## 1. Pourquoi cette demande — la preuve est dans MT-0020

La tâche **MT-0020 « Vidéo de présentation produit »** est l'illustration exacte du problème à résoudre.

| Fait observé | Conséquence |
|---|---|
| Description = deux lignes de texte libre + une URL | Aucun élément exploitable pour produire |
| Créée le 10 août, échéance le 17 août | **Échéance dépassée de 14 jours** |
| Durée estimée : non estimée | Aucune charge planifiable |
| Pièces jointes : 0 · Sous-tâches : 0 | Aucun matériau, aucune décomposition |
| Le 10 août, le responsable écrit : *« il faut partager tous les éléments relatifs au projet et constituer un brief vidéo »* | La demande de brief est faite dès le premier jour, dans un commentaire — donc **invisible du système**. Elle n'a jamais été satisfaite |
| Le 31 août, un tiers est appelé en renfort | 21 jours perdus avant que le blocage ne remonte |

La cause n'est pas un défaut de rigueur individuelle : **le système ne dispose d'aucun endroit où un brief puisse exister.** Un champ de description libre accepte deux lignes aussi bien que quinze sections, et rien ne signale la différence. La demande de brief se retrouve dans un commentaire, où elle n'a ni statut, ni destinataire responsable, ni effet sur le workflow.

**Ce qui est demandé :** deux objets typés, versionnés, rattachés au projet, avec des règles de complétude qui conditionnent les transitions de statut de la tâche.

---

## 2. Principes communs aux deux objets

1. **Ce sont des documents, pas des champs de description.** Entités propres, avec leur cycle de vie, distinctes de la tâche qui les consomme.
2. **Rattachement.** Le *brief* est rattaché à une tâche ou à un lot de tâches. La *plateforme de marque* est rattachée au **projet ou à la marque**, jamais à une tâche : elle est réutilisée par toutes les tâches du projet.
3. **Versionnage.** Toute modification après émission crée une version (1.0, 1.1, 2.0). Aucun écrasement. L'historique est consultable.
4. **Tag de source par champ** — uniquement sur le brief. Quatre valeurs : `D` déclaré par le client · `F` fourni sous forme de document · `I` inféré par l'agence · `V` à vérifier. Sans ce tag, une inférence de l'agence devient indiscernable d'un fait client.
5. **Complétude bloquante.** Chaque objet définit des champs critiques. Tant qu'ils sont vides, la tâche ne peut pas passer au statut suivant.
6. **Verrouillage par section.** Certaines sections appartiennent à un rôle et ne sont éditables que par lui, même par un utilisateur ayant les droits d'édition sur la tâche.

---

## 3. OBJET 1 — BRIEF

### 3.1 Schéma

```
Brief {
  id                  string
  version             string          // "1.0"
  statut              enum            // brouillon | emis | sous_reserve | accepte | obsolete
  projet_id           string
  taches_liees        string[]
  emetteur_id         string          // rôle Clientèle
  contributeur_id     string          // rôle Planning
  destinataire_id     string          // rôle Création
  cree_le, emis_le, accepte_le  datetime
  delai_reponse_jours int             // décompte suspendu tant que statut = sous_reserve

  champs: Champ[]
}

Champ {
  cle        string
  valeur     richtext
  source     enum       // D | F | I | V | null
  critique   bool       // défini par le gabarit, non éditable
  section    string
  role       enum       // clientele | planning  → droit d'édition
}
```

### 3.2 Gabarit — 15 champs, 11 critiques

| Clé | Libellé | Section | Rôle | Critique |
|---|---|---|---|---|
| `verbatim` | Demande client en verbatim | 1 · Demande | clientele | ✔ |
| `decideur` | Décideur final nommé | 1 · Demande | clientele | ✔ |
| `tueur` | Qui peut annuler une idée validée | 1 · Demande | clientele | ✔ |
| `circuit` | Circuit et délai de validation | 1 · Demande | clientele | ✔ |
| `probleme` | Problème réel, distinct de la demande | 2 · Problème | planning | ✔ |
| `sources` | Source de chaque chiffre avancé | 2 · Problème | planning | — |
| `cible` | Cible et tension | 3 · Cible | planning | ✔ |
| `axe` | Territoire et axe recommandé | 4 · Territoire | planning | ✔ |
| `benefice` | Bénéfice à démontrer | 4 · Territoire | planning | ✔ |
| `rtb` | Reason to believe | 4 · Territoire | planning | — |
| `ton` | Ton et interdits de marque | 4 · Territoire | planning | ✔ |
| `livrables` | Périmètre de livrables chiffré | 5 · Cadre | clientele | ✔ |
| `fenetre` | Fenêtre et dates non négociables | 5 · Cadre | clientele | ✔ |
| `budget` | Budget et ventilation | 5 · Cadre | clientele | — |
| `succes` | Critères de succès mesurables | 6 · Succès | clientele | ✔ |

### 3.3 Règles de validation

- **R1 — Émission.** Un brief ne peut passer en `emis` que si les 11 champs critiques sont non vides.
- **R2 — Contrôle de frontière.** Blocage à l'émission si un champ contient une accroche, un slogan ou un concept. Détection simple : dans les champs de section 1 à 6, signaler toute ligne de moins de 8 mots entourée de guillemets ou terminée par un point d'exclamation. **Avertissement, pas blocage** — c'est un garde-fou, pas un juge.
- **R3 — Réserve.** Le destinataire dispose de 24 h pour passer le brief en `sous_reserve` en cochant les champs manquants ou incomplets. Le compteur `delai_reponse_jours` **est suspendu** tant que ce statut dure. C'est la règle la plus importante de la spécification.
- **R4 — Retour automatique.** Le passage en `sous_reserve` génère un document de retour listant les champs signalés, notifie l'émetteur, et publie un commentaire système sur la tâche.
- **R5 — Version.** Toute édition d'un brief `accepte` incrémente la version et repasse le statut en `emis`.
- **R6 — Blocage de workflow.** Une tâche dont le brief n'est pas en statut `accepte` ne peut pas passer de « À faire » à « En cours ».

### 3.4 Comportement d'interface

Sur la page de tâche, un bloc **Brief** au-dessus de la description, avec :
- une barre de complétude : `11/11 champs critiques` en vert, ou `4/11` en rouge ;
- le statut et, si `sous_reserve`, la mention **« délai suspendu depuis le … »** ;
- les sections repliées par défaut, dépliables ;
- une pastille de source à droite de chaque champ, colorée : D bleu-vert, F vert, I ocre, V rouge ;
- un bouton **« Émettre »** (Clientèle) et un bouton **« Retourner sous réserve »** (Création).

**Le champ Description actuel reste**, mais devient ce qu'il aurait dû être : une phrase de contexte. Il n'est plus le support du brief.

---

## 4. OBJET 2 — PLATEFORME DE MARQUE

### 4.1 Nature

Objet **de projet ou de marque**, pas de tâche. Une seule plateforme active par marque. Durée de vie pluriannuelle. Toutes les tâches créatives du projet la référencent en lecture.

### 4.2 Schéma

```
PlateformeMarque {
  id              string
  marque_id       string
  version         string
  statut          enum      // brouillon | active | en_revision | archivee
  proprietaire_id string    // rôle Création — seul éditeur
  active_depuis   date

  nommage {
    nom_officiel     string
    descripteur      string
    noms_retires     string[]
    usage_interne    string[]
  }
  raison_etre        text
  probleme           text
  insight            text
  cadre_reference    text
  positionnement     text
  point_difference   text
  promesse           text
  cibles             Cible[]         // { rang, nom, qui, a_produire, tension }
  benefices          Benefice[]      // { rang, titre, corps }  — ordre porteur de sens
  preuves            Preuve[]        // { texte, maitresse: bool }
  personnalite {
    adjectifs        string[]        // 5 à 7
    registre         text
    jamais           string[]        // interdits de langage
  }
  langage            Terme[]         // { terme, sens, remplace }
  phrases_socle      string[]
  symboles           Symbole[]       // { nom, sens, contrainte_visuelle }
  territoires        Territoire[]    // { nom, porte, ou, cible_rang }
  architecture       text
  ne_fera_pas        string[]
  adve {
    a, d, v, e: { sections: string[], statut: enum }   // complet | partiel | incomplet
  }
}
```

### 4.3 Règles

- **R7 — Unicité.** Une seule plateforme `active` par marque. L'activation d'une nouvelle archive la précédente.
- **R8 — Propriété.** Seul le rôle Création édite. Les autres rôles ont un accès en lecture et un droit de commentaire.
- **R9 — Référence obligatoire.** Un brief émis sur un projet doté d'une plateforme active affiche automatiquement le positionnement, la promesse et les interdits en lecture seule. Ils ne sont pas recopiés : ils sont référencés.
- **R10 — Contrôle de cohérence.** À l'émission d'une plateforme créative ou d'un brief, comparer les champs `ton` et `interdits` avec `personnalite.jamais`. Signaler les collisions. Avertissement, pas blocage.
- **R11 — Complétude ADVE.** Le score par pilier est calculé à partir du remplissage des sections associées et affiché sur la page projet. Un pilier `incomplet` ne bloque rien mais reste visible : c'est un indicateur de dette stratégique.
- **R12 — Nommage.** Les valeurs de `nommage.noms_retires` alimentent un contrôle de rédaction : tout document du projet contenant un nom retiré déclenche un avertissement.

### 4.4 Comportement d'interface

Un onglet **Plateforme de marque** au niveau du projet, pas de la tâche. En tête : nom officiel, positionnement, promesse, et les quatre jauges ADVE. Sur chaque tâche créative, un encart replié **« Socle de marque »** rappelant positionnement, promesse et interdits — trois lignes, en lecture seule.

---

## 5. Rôles et droits

| Rôle | Brief | Plateforme de marque |
|---|---|---|
| Clientèle | Édite sections 1, 5, 6 · émet | Lecture, commentaire |
| Planning | Édite sections 2, 3, 4 | Lecture, commentaire |
| Création | Lecture · retourne sous réserve · accepte | **Édite et active** |
| Direction Artistique | Lecture | Lecture |
| Direction générale | Lecture intégrale | Lecture intégrale |

Un utilisateur peut cumuler des rôles ; les droits s'additionnent. Le rôle est porté par le membre sur le projet, pas globalement.

---

## 6. Effet sur les statuts de tâche

| Transition | Condition |
|---|---|
| À faire → En cours | Brief lié en statut `accepte` |
| En cours → En revue | Aucun champ critique du brief vidé depuis l'acceptation |
| En revue → Terminé | Inchangé |

Une tentative de transition bloquée affiche le motif et la liste des champs manquants — jamais un message générique.

---

## 7. Cas de test — MT-0020

État actuel de la tâche, à faire passer par le nouveau système :

```json
{
  "tache": "MT-0020",
  "titre": "Vidéo de présentation produit",
  "projet": "Matanga People",
  "responsable": "SERGE NGUELI",
  "creee_par": "Jean Ronald Mboumgni",
  "creee_le": "2026-08-10",
  "echeance": "2026-08-17",
  "duree_estimee": null,
  "brief": {
    "statut": "sous_reserve",
    "version": "1.0",
    "champs_renseignes": 2,
    "champs_critiques_manquants": 9,
    "champs": [
      { "cle": "verbatim", "source": "D",
        "valeur": "Créer une vidéo de présentation de la solution Matanga People, à ses différents client." },
      { "cle": "rtb", "source": "F",
        "valeur": "Page produit publiée : parcours en 4 étapes, traçabilité datée, drive permanent, visioconférence navigateur, inclus sans surcoût, 12 marques références." },
      { "cle": "decideur", "valeur": null },
      { "cle": "tueur", "valeur": null },
      { "cle": "circuit", "valeur": null },
      { "cle": "probleme", "valeur": null },
      { "cle": "cible", "valeur": null },
      { "cle": "axe", "valeur": null },
      { "cle": "benefice", "valeur": null },
      { "cle": "ton", "valeur": null },
      { "cle": "livrables", "valeur": null },
      { "cle": "fenetre", "valeur": null },
      { "cle": "succes", "valeur": null }
    ],
    "delai_suspendu_depuis": "2026-08-10"
  }
}
```

**Résultat attendu du système :** la tâche n'aurait jamais pu passer en « En cours ». Le retour sous réserve aurait été émis le 10 août — le jour même où le responsable en a fait la demande dans un commentaire — et le compteur d'échéance aurait été suspendu au lieu de courir 14 jours à vide.

**Le gain n'est pas le brief.** C'est que le blocage devient visible le premier jour, sur la tâche, pour tout le monde.

---

## 8. Phasage proposé

| Phase | Contenu | Valeur |
|---|---|---|
| **V1** | Objet Brief, 15 champs, tags de source, complétude, retour sous réserve, suspension du délai, blocage de transition | Règle 90 % du problème |
| **V2** | Objet Plateforme de marque, encart socle sur les tâches, jauges ADVE | Cohérence inter-campagnes |
| **V3** | Contrôles de cohérence R10 et R12, gabarits par type de tâche, export PDF des deux objets | Confort |

La V1 seule justifie le développement. Les deux suivantes peuvent attendre.
