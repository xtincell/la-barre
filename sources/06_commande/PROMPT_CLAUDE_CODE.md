# Invite pour Claude Code

Copier-coller ce fichier entier comme premier message dans Claude Code, à la racine du dossier décompressé.

---

## Contexte

Ce dossier contient le processus créatif d'une agence de communication (Matanga Agency, Douala) et un dossier réel qui sert de cas d'application : **MT-0020, une vidéo de présentation du produit Matanga People**.

Le processus décrit une chaîne de documents où la sortie de l'un est l'entrée du suivant, avec des propriétaires distincts, des portes de validation, des délais qui se suspendent et des critères de refus écrits d'avance. Aujourd'hui tout cela vit dans des fichiers markdown séparés : c'est illisible pour quelqu'un qui découvre le système, et impossible à parcourir dans l'ordre.

## Ce que je veux

Une **application web locale, statique, en français**, qui donne une vue complète du processus et permet de dérouler le dossier MT-0020 pas à pas, de manière interactive.

Elle sert à deux usages :
1. **Former** un nouvel arrivant — il doit comprendre la chaîne en dix minutes sans lire les onze documents.
2. **Piloter** un dossier réel — voir où on en est, ce qui bloque, et pourquoi.

## Sources — à lire avant d'écrire une ligne de code

```
INDEX.md                     carte de tous les fichiers et de leur statut
00_processus/                le processus complet, 11 sections — LA source de vérité
01_formats_it/               schémas de données des objets brief et plateforme de marque
02_dossier_MT0020/           le dossier réel, sept documents
03_modeles_KOMBA/            les mêmes formats sur une campagne fictive, utile comme second exemple
04_outils/                   deux outils HTML autonomes déjà construits — reprendre leur grammaire visuelle
99_archive/                  versions remplacées, à ignorer sauf pour la section historique
```

**Règle absolue : ne rien inventer.** Tout le contenu affiché provient des fichiers. Si une information manque, l'afficher comme manquante — c'est le sujet même du processus. Aucun texte de remplissage, aucun exemple imaginé, aucune donnée fictive ajoutée.

## Ce qu'il faut construire

### 1. Vue « La chaîne »

Écran d'accueil. Les onze documents du processus, dans leur ordre, avec pour chacun : propriétaire, horizon, ce qu'il ouvre. Cliquer sur un document ouvre sa fiche : à quoi il sert, ce qu'il ne contient pas, ses critères de refus, et le fichier réel correspondant dans le dossier MT-0020.

Faire apparaître visuellement ce qui compte : **les documents changent de propriétaire trois fois** (Clientèle → Création → Direction Artistique). C'est la friction que tout le processus cherche à régler.

### 2. Vue « Les portes »

Deux familles de portes, distinctes et à ne pas confondre :
- **portes client** — trois étages de finition, avec le pourcentage d'effort engagé et ce que la signature déclenche ;
- **portes de latitude créative** — trois portes internes : séance de concept, contestation sous 24 h, souveraineté d'exécution.

Montrer les délais et surtout **les suspensions** : quand un document est retourné sous réserve, l'horloge du destinataire s'arrête. C'est la règle la plus importante et la moins intuitive.

### 3. Vue « MT-0020 » — le déroulé interactif

Le cœur de l'application. Une progression pas à pas dans le dossier réel :

- **une chronologie** : ce qui s'est passé du 10 au 31 août 2026, et en regard, ce que le processus aurait produit. Le dossier a pris 21 jours de retard parce qu'aucun endroit du système ne pouvait accueillir un brief ; la chronologie doit rendre ça évident.
- **une progression par étapes** : brief → socle de marque → plateforme créative → propositions créatives → ordre de fabrication. À chaque étape : le document, son état de complétude, ce qui bloque le passage à l'étape suivante.
- **les champs manquants du brief** — trois sont bloquants. Ils doivent être visibles partout où ils empêchent quelque chose, pas seulement dans la fiche du brief.
- **un arbitrage en attente** : deux concepts concurrents (`FINAL_3` et `FINAL_5`) sont en circulation. L'application doit montrer que la porte B n'est pas rendue et que rien ne peut avancer tant qu'elle ne l'est pas.

### 4. Vue « Les documents »

Lecture confortable de n'importe quel fichier markdown du dossier, avec sa position dans la chaîne, son propriétaire et son statut courant ou remplacé. Rendu markdown propre : titres, listes, citations, tableaux.

## Contraintes techniques

- **Statique.** Ouvrable par `index.html` ou servi par un `npm run dev`. Pas de backend, pas de base de données, pas de compte.
- Le contenu markdown peut être lu au build ou importé comme texte. Choisir la solution la plus simple à faire tourner sur une machine sans configuration.
- Responsive. Utilisable sur téléphone.
- Une seule dépendance de rendu markdown au maximum.
- Français partout, y compris les noms de fichiers et de composants.

## Contraintes de design

Reprendre la grammaire visuelle des deux outils déjà construits dans `04_outils/` et de `02_dossier_MT0020/MT0020_Ordre_Fabrication_Serge.html`, sans les copier :

- fond sombre brun `#241C18`, papier gris-vert pâle `#E6EAE7`, accent orange brûlé `#C7501F` ;
- une couleur par direction pour les propriétaires de documents — Clientèle, Planning, Création, Direction Artistique — utilisée partout de façon cohérente ;
- typographie : une famille pour l'affichage, une pour la lecture, clairement distinctes ;
- pas de cartes arrondies identiques partout, pas de dégradés décoratifs, pas d'étiquettes en capitales au-dessus de chaque titre.

Une seule animation dans toute l'application, à l'endroit qui le mérite : la bascule d'un délai en suspension.

## Critères d'acceptation

1. Depuis l'accueil, on comprend en une minute qui produit quoi et dans quel ordre.
2. La chronologie MT-0020 rend le retard de 21 jours et sa cause immédiatement lisibles.
3. Les trois champs bloquants du brief sont visibles partout où ils bloquent.
4. Les portes client et les portes de latitude ne sont jamais mélangées.
5. Chaque écran permet d'atteindre le fichier source en un clic.
6. Aucun contenu affiché n'est absent des fichiers markdown.
7. L'application tourne sans configuration ni clé.

## Ordre de travail

1. Lire `INDEX.md` puis `00_processus/PROCESSUS_CREATIF_MATANGA_v2.md` en entier.
2. Proposer un plan : arborescence, écrans, modèle de données extrait des markdown, choix techniques. **Attendre ma validation avant de coder.**
3. Construire la vue « La chaîne », me la montrer, puis continuer.
4. Terminer par un `README.md` : comment lancer, comment ajouter un dossier, où se trouve chaque source.

## Ce que je ne veux pas

- Un site de présentation du processus. C'est un outil de travail, pas une plaquette.
- Des données d'exemple inventées pour remplir des écrans.
- Une pile technique lourde pour ce que fait l'application.
- Des animations sur chaque section.
