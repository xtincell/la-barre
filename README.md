# LA BARRE

**Le poste de travail du directeur de la création.** Du brief au livrable, et les talents
qui les font.

*Placer la barre* — fixer et tenir le standard créatif. *Tenir la barre* — garder le cap
quand le client tire, quand le délai serre, quand deux concepts s'affrontent.

---

## Lancer

Double-cliquer `index.html`. Aucun serveur, aucune installation, aucun compte.

Avec une URL, depuis la racine du dossier parent :

```bash
node servir.mjs 5173
```

puis `http://localhost:5173/la-barre/`.

## Sauvegarder — à lire une fois

**Le dépôt de référence est un fichier JSON sur ton Drive.** Le navigateur n'en garde
qu'un cache de travail : vider les données du site l'effacerait.

- **Réglages → Exporter** à la fin de chaque séance. Le fichier porte la date et la machine.
- **Réglages → Importer** à l'ouverture, si tu changes de poste.
- Le compteur en haut des réglages passe en rouge au-delà de deux jours sans export.

C'est aussi le pont vers Matanga People : le même JSON, lu par autre chose.

## Le système visuel

Tous les composants vivent dans **`app/ui.js` + `styles/systeme.css`**, et nulle part
ailleurs : icônes, avatars, drapeaux de marché, anneau de progression, barres, sparkline,
répartition, fil d'étapes (deux tailles), cartes de statistique, bannière, mur de
vignettes, bande de vignettes, frise datée, cartes numérotées, graphe de dépendances,
onglets.

Trois règles tenues : **aucune couleur écrite en dur** hors des jetons de `base.css` —
vérifiable par `grep -n "#[0-9a-f]\{6\}" app/*.js`, qui ne doit rien rendre en dehors de
`maison.js` et `amorce.js` · **aucun composant recopié** d'un écran à l'autre · **chaque
composant sait dire son état vide**, comme la vignette dit « aucun visuel ».

## Les écrans

| Écran | Ce qu'on y fait |
|---|---|
| **Mon lundi** | Le rituel. Tout ce qui attend un verdict, avec l'idée et les critères d'acceptation affichés à côté. Quatre verdicts, et le motif se choisit d'abord dans les critères écrits. Puis ce qui bloque, la pile à ranger, et ce que tu attends des autres. |
| **Mes projets** | La liste, puis la vue 360 : les sections, les volets, la matrice support × marché, les livrables avec leurs dix axes de complétude. |
| **Mes attentes** | Ce que tu as renvoyé et qui n'est pas revenu — à qui, depuis combien de jours, sur quel critère, avec le message d'origine. |
| **Référentiel** | Marchés, supports et leurs gabarits par marché, assets et leurs droits. Il se remplit par l'usage, jamais en préalable. |
| **Réglages** | Export et import, jeu d'exemple, tes règles, l'équipe, le journal. |

Et **six écrans de détail**, ouverts depuis les onglets d'un projet :

| Écran | Ce qu'il montre |
|---|---|
| **Brief** | La santé du brief en anneau avec sa liste de contrôle, le problème en une phrase, ce qu'on va dire et faire en trois colonnes, les preuves, la cible, les territoires avec leurs langues, **la frise du timing**. À droite : ce qui manque, les contacts clés. |
| **Big idea** | L'idée en une phrase et sa signature, la mécanique, le rattachement au socle, la condition de validité. Les routes côte à côte, les exécutions qu'elle a produites en mur de vignettes. À droite : **validation centrale et locales par marché**, origine et périmètre, activité. |
| **Plateforme de marque** | Neuf cartes numérotées — chaque carte vide se voit, c'est la dette du socle. Un bouton **vérifie le vocabulaire** : les mots que la marque ne dit jamais et les noms retirés, détectés dans tout le projet (règles R10 et R12). |
| **Livrable** | L'aperçu, **le fil d'étapes en grand**, « où en sommes-nous » en une phrase, trois chiffres — tours consommés, temps réel contre estimé, complétude. **La bannière ambre quand les tours dépassent le vendu.** Les critères en ✓/✕, **les retours posés sur le visuel et les mises en situation**, les dépendances en graphe, l'historique des versions. |
| **Planche des KV** | Le niveau qui manquait : **le KV maître par marché, avant déclinaisons**. Une ligne par marque, une case par marché, et chaque case porte sa combinaison — marque, accroche, langue, SKU montrés, l'enfant, le métier illustré. La case dit si elle est conforme à *son* marché : le Ghana servi en français, l'accroche de neuf mots, le SKU qui n'est pas distribué là. **Décliner** engendre les formats depuis le KV — et toute reprise du maître les périme, avec le nombre écrit. |
| **Présentation** | Le dossier client, **engendré depuis le projet**. Chaque page dit d'où elle tire ce qu'elle montre ; une page dont la source est vide affiche sa dette et le bouton qui y renvoie — l'outil ne remplit jamais un champ dont il n'est pas propriétaire. Mode **présenter** en plein écran, flèches au clavier. À la fin de séance, les retours se saisissent et **redescendent sur la pièce qu'ils visent**, comme annotations. |

## Les gestes

- **Ctrl/⌘ + K** — noter quelque chose. Une ligne, ça part dans la pile *à ranger*, on
  range au moment du rituel. C'est le seul endroit où l'on a le droit d'être sale.
- **Annoter** — cliquer sur un visuel pose un point numéroté, avec son auteur, sa date et
  sa version. Une annotation qui arrive après une validation n'est pas un commentaire :
  l'outil l'appelle une reprise, et le dit avant qu'on la pose.
- **Mettre en situation** — le mockup se fabrique ailleurs ; ici il est rattaché à sa pièce
  et à sa version. Le jour où le visuel repart en V2, l'outil sait que ce mockup montre
  une image qui n'existe plus.
- **Rechercher** — projets, livrables, pistes, marchés, supports, assets, attentes.
- **Imprimer** — la mise en page tient sur papier pour la réunion de production.
- **Renvoyer** — sur toute pièce : le destinataire est proposé par la table des
  souverainetés, le message est rédigé, l'attente est datée. L'outil n'envoie rien : il
  écrit, tu portes.

## Les trois niveaux d'un visuel

C'est la hiérarchie que la planche imprimée aplatit, et que l'outil tient :

| Niveau | Ce qu'il porte | Ce qui le périme |
|---|---|---|
| **Idée** | l'idée en une phrase, sa mécanique, sa signature | rien : elle est arbitrée une fois |
| **KV maître, un par marché** | marque, accroche, langue, SKU montrés, enfant, métier illustré, mentions | un écart de conformité à son marché |
| **Déclinaison** | un format, hérité d'un KV | **une nouvelle version du maître** — toutes basculent, le nombre est écrit |

Une planche papier montre quatorze images côte à côte et ne dit jamais qu'un SKU n'est pas
distribué au Ghana. Ici la planche est **une vue** sur ces quatorze objets — pas l'objectif.

## L'ordre du pipeline — ce qui passe avant, et pourquoi

Une agence ne manque pas de travail, elle manque d'ordre. Le vrai risque n'est pas de mal
faire : c'est de passer trois jours sur les déclinaisons d'une piste que personne n'a payée
pendant qu'un client qui a signé attend son EXE.

L'ordre ne se discute pas, il se déduit de l'état commercial de la route :

| Rang | État | La règle |
|---|---|---|
| **Ferme** | validé **et payé** | rétroplanning contractuel. Rien ne passe devant. Un jour pris ici est un jour pris à un client qui a signé |
| **Engagé** | validé, pas encore facturé | on produit, et on relance la facturation : produire sans bon de commande, c'est financer le client |
| **Présenté** | chez le client | on ne décline pas. Tant qu'aucune route n'est retenue, chaque format produit peut être jeté |
| **Spéculatif** | en élaboration | se fait avec le temps qui reste. Mûrir une piste augmente ses chances — jamais au prix d'un ferme |

**La validation client est le pivot.** C'est à ce moment que les KV et leurs adaptations
passent en **demande d'EXE**, que la route change de rang, et que la priorité du pipeline
bascule. L'écran le dit avant d'appliquer : combien de pièces passent en exécution, et
combien de pièces spéculatives passent après.

**Le conflit d'ordre** est la seule alerte qui compte : quelqu'un tient du spéculatif
pendant qu'un engagement contractuel est en retard. *« Ce n'est pas un reproche : c'est
l'ordre qui n'a pas été dit. Le spéculatif ne s'arrête pas, il passe après. »*

**La maturité d'une piste** se lit en pourcentage — idée, sacrifice et argument, KV maître,
deux à trois KV montrables, dispositif, rétroplanning, situations, adaptations,
déclinaisons. Les quatre premiers sont le **minimum client** : en dessous, on présente une
intention, pas une campagne.

## Ce que le client reçoit

À minima : **le problème, la stratégie, l'idée, les routes et leurs KV.** Pas plus. La
présentation se compose à ce niveau par défaut ; un bouton la passe en **pitch ambitieux**
— dispositif, planches de déclinaisons, mises en situation, calendrier. Mettre les
déclinaisons dans une présentation spéculative, c'est promettre un travail qu'on n'a pas
vendu.

## Ce qui ouvre la production

Une route retenue n'ouvre rien. Ce qui ouvre la production, c'est **le fichier** — et la
porte a cinq conditions, chacune avec son prix :

| Condition | Ce que ça coûte de passer outre |
|---|---|
| Route retenue | produire sur une route non arbitrée, c'est parier |
| Fichier ouvert | aucune correction possible sans tout refaire |
| BAT signé | l'imprimeur travaille sans accord écrit : l'erreur est pour l'agence |
| Mise en situation liée au fichier | le mockup montre une image d'écran, pas ce qui part à l'impression |
| Rien de périmé | envoyer un fichier d'une version antérieure, c'est imprimer ce qui a été corrigé |

Chaque fichier est rattaché à **la version de sa pièce**. Le jour où elle repart en V2,
il apparaît comme périmé.

## Tout se versionne, pas seulement les livrables

Le brief, la plateforme, la stratégie, l'idée, les routes : chacun porte son numéro de
version et son historique. Une version **naît d'une cause écrite**, choisie dans cinq
origines — première, décision interne, retour client, non-conformité, nouveau périmètre.
Seules deux comptent dans les tours de révision vendus, et c'est ce compteur qui rend la
clause de reprise opposable en négociation.

Conséquence directe : **un verdict rendu sur la V1 ne couvre plus la V2.** L'écran le dit
au lieu de laisser croire que c'est validé.

## Le principe

**Rien ne bloque, rien ne peut se taire, et tout raccourci affiche son prix.**

Aucune transition n'est interdite. Mais un blocage est un objet : il a un propriétaire,
une date de naissance, un compteur de jours, et il ne disparaît que résolu. Et quand tu
prends un raccourci, l'outil écrit ce qu'il coûte — *« vous assignez sans critères
d'acceptation : ce travail ne pourra être refusé que par goût »*.

## Changer de maison

Tout ce qui est propre à une agence vit dans **`app/maison.js`** : les postes, les délais,
les étages, les critères de refus, le vocabulaire surveillé, les axes, les gabarits de
projet, la palette. Le reste du code n'écrit jamais « Matanga » ni « 24 h ».

Installer une autre agence : remplacer ce fichier. Rien d'autre.

## Ajouter un champ

Dans **`app/modele-champs.js`**, une ligne dans la section concernée. Le formulaire, la
lecture, la complétude et les manquants suivent tout seuls.

**Le schéma est versionné.** On n'ajoute ni ne renomme un champ sans incrémenter
`CHAMPS.version`, sinon les projets d'avant ne se lisent plus. Une évolution du process se
décide, se date, et s'applique aux projets suivants — pas aux anciens, sinon les
indicateurs ne se comparent plus d'un mois sur l'autre.

## Le jeu d'exemple

MT-0020 est pré-rempli **avec ses trous** : brief à 4 champs d'identité sur 9, décideur
final absent depuis le 10 août, échéance dépassée depuis le 17, deux pistes en lice et
aucune retenue. C'est ce qui rend l'exemple utile — on voit l'outil sur un dossier qui va
mal. Réglages → *Vider l'exemple* pour repartir propre.

Un second exemple, **MT-0031**, porte le cas multi-marchés : quatorze KV maîtres, trois
marques, six marchés — avec ses erreurs volontaires, celles qu'une planche imprimée ne
signale pas. Un marché anglophone servi en français, une accroche de neuf mots, deux SKU
montrés là où ils ne sont pas distribués. Les visuels ne sont pas fournis : ils viennent
de ton artboard.

## Ce que l'outil ne fait pas

Comptabilité, paie, stock, sauvegarde technique, achat média, production graphique. Il
pointe vers eux, il ne les remplace pas. Il ne fabrique rien et ne facture rien : il
garantit qu'aucun problème ne se découvre à l'impression.

## Fichiers

```
index.html
app/
  maison.js          la configuration : postes, délais, critères, axes, palette
  outils.js          construction d'éléments, dates, formatage
  depot.js           persistance, journal, trace de lecture, export/import
  modele-champs.js   les champs de chaque section, versionnés
  regles.js          blocages calculés, prix des raccourcis, complétude, grilles, vocabulaire
  amorce.js          le jeu d'exemple MT-0020
  panneau.js         le panneau latéral
  formulaire.js      moteur de saisie et de lecture
  renvoi.js          « ceci n'est pas à moi » : critère, destinataire, message, attente
  vue-lundi.js       le rituel
  vue-projets.js     liste et vue 360
  vue-pistes.js      pistes créatives et séance de concept
  vue-matrice.js     volets, matrice support × marché, livrables et axes
  vue-attentes.js    ce qui n'est pas revenu
  vue-referentiel.js marchés, supports, gabarits, assets et droits
  vue-reglages.js    dépôt, règles, équipe, journal
  application.js     barre, routage, recherche, capture rapide
styles/
  base.css  ecrans.css
documents/           les fiches et amendements à remettre
```

## Ce qui vient ensuite

**1b — encadrer.** Mon équipe, Mon standard, la fiche d'évaluation pré-remplie de faits,
l'estimé et le réel, Ma fin de mois.

**1c — tenir la chaîne.** Preuves, contacts et décideurs locaux, reprises chiffrées,
bibliothèque.

**Puis l'intégration à Matanga People** : l'export devient un état partagé, les attentes
deviennent des blocages chez leurs destinataires, les notifications partent seules.
