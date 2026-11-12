# Réception de la persistance — 6 octobre 2026

Le fichier partagé avait déjà une garde `X-Base`. Sa comparaison précédait une
écriture asynchrone non sérialisée : deux requêtes pouvaient accepter la même base.
Le client répondait au conflit en rechargeant la base, perdant le dernier geste.

La correction sérialise contrôle et remplacement, identifie le contenu exact et
conserve les gestes locaux jusqu'au reçu. Le rapprochement s'appuie sur les trois
versions ; seul un désaccord réel demande un choix. Le journal conserve les deux
événements : son `id` désigne l'objet suivi, pas un identifiant d'événement.

## Preuves

- Reproduction HTTP réelle : concurrence admise à tort, tentative déjà reçue refusée,
  fichier illisible remplacé avant correction ; tests corrigés après changement.
- 23 tests Node passent : serveur isolé, rapprochement pur, transport client.
- Interface native locale, données synthétiques : deux propositions d'un même champ,
  rechargement du second onglet, deux valeurs toujours visibles, choix explicite reçu.
- Deux champs distincts réunis sans ressaisie, journal des deux gestes conservé.
- Arrêt du serveur de recette, saisie, erreur visible, fermeture de l'onglet,
  reprise dans l'autre onglet, reçu serveur et disparition de la tâche de reprise.
- Un formulaire déjà ouvert conserve son objet après rapprochement compatible.
- Le cache d'une version antérieure reste récupérable séparément à la mise à jour.
- Un ordre de pages modifié et une correction de texte se réunissent ; deux ordres
  incompatibles demandent un choix sans abandonner le contenu.

Ces preuves ne valent pas recette de production ni réception complète du SI Shinkiro.

## Limites encore ouvertes

- Authentification et séparation des entreprises à assurer par l'installation.
- Les importeurs qui écrivent directement les fichiers contournent la garde.
- Un serveur par fichier ; pas de verrou distribué.
- Le corpus, ses vignettes et les sauvegardes doivent survivre au remplacement du
  conteneur. Un déploiement ne doit jamais substituer le corpus Git aux données vivantes.
- Les règles métier et les champs verrouillés par poste ne sont pas modifiés ici.

## Identifiants de décision entre postes, et import par la fabrique — 12 novembre 2026

Geste 4.9 du plan Shinkiro, après l'arbitrage 5.5 : Radar lit les décisions, et
sa clé de reçu est l'instance La Barre plus `decision.id`. Un identifiant était
un préfixe et six caractères tirés par `Math.random`, unique dans la seule base
locale. Deux décisions au même identifiant étaient écartées de la route Radar ;
le rapprochement les fondait champ par champ en une décision que personne
n'avait prise ; « Importer un fichier » remplaçait le registre sans passer par la
fabrique.

La correction, dans les modules existants : l'identifiant porte le code du poste
et douze caractères tirés par `crypto.getRandomValues` (`app/outils.js`,
`app/decision.js`) ; le rapprochement renomme et trace la décision locale dont
l'identifiant est pris dans la base relue, la base de référence gardant le sien
(`DECISION.departager`), et ne fond plus deux décisions en une
(`app/reconciliation.js`) ; l'import admet les décisions du fichier par la
fabrique, sans retirer ni remplacer celles du registre (`DECISION.admettre`) ;
`servir.mjs` refuse en 422 une écriture qui ferait porter un même identifiant à
deux décisions ou remplacerait une décision enregistrée. Les décisions
existantes gardent leur identifiant et leur empreinte servie.

### Preuves

- Tests écrits d'abord : 30 rouges sur `test:decisions` avant la correction,
  dont le serveur qui acceptait un doublon (200 au lieu de 422).
- Après correction, 266 tests Node verts sur les suites de la CI, dont 13
  nouveaux (`tests/decisions-unicite.test.mjs`) : deux postes contre un serveur
  simulé, l'import, et le vrai `servir.mjs` dans un dossier jetable.
- La garde des écrivains (`tests/decisions.test.mjs`) couvre aussi `outils/` :
  seules la fabrique et la base fictive de la démonstration écrivent des
  décisions ; l'ingestion du corpus n'en écrit aucune et le vérifie.
- Parcours Chromium (`npm test`) : l'identifiant d'une décision rendue à l'écran
  porte le code gardé dans le navigateur ; une base réimportée ne double rien,
  une décision d'un autre poste au même identifiant est renommée et tracée.
- Base fictive de la démonstration régénérée : ses identifiants de décision ont
  la forme neuve, et les autres identifiants tirés après eux ont changé.

Ces preuves sont locales, sur données fictives : ni CI distante, ni production.

### Limites

- Seules les décisions changent de forme ; les autres objets gardent six
  caractères sans contrôle entre postes.
- Le refus du serveur ne couvre que les écritures par `PUT`.
- `revisionSource`, texte qui date une désignation de référence, garde l'ancien
  identifiant après un renommage.
- Une décision ancienne qui ne passe pas la garde fait refuser l'import de son
  fichier.

## Identifiants de projet et de livrable entre postes — 12 novembre 2026

Suite du geste 4.9 du plan Shinkiro. La décision avait son identifiant unique
entre postes (la-barre#26). Le projet et le livrable tiraient encore un préfixe
et six caractères de `Math.random` (`DEPOT.ajoute`, `app/depot.js` ; `O.id("L")`
et `O.id("KV")` dans `app/kv-modele.js`, `app/dispositif.js`,
`app/vue-matrice.js`, `app/vue-planche.js`). Deux postes pouvaient tirer le
même ; le rapprochement fondait alors deux projets, ou deux livrables, champ par
champ ; le serveur acceptait une base qui en dupliquait un ou en remplaçait un.

La correction réutilise le mécanisme de #26, sans nouveau module. Le code du
poste et le tirage passent de `app/decision.js` à `app/outils.js`
(`O.codePoste`, `O.identifiantUnique`) : la décision, le projet (`PRO-…`) et le
livrable (`L-…`, `KV-…`) partagent le même générateur, appelé pour les projets
et les livrables par `DEPOT.identifiant`. Un livrable neuf reçoit sa date de
naissance (`cree_le`), qui dit, avec son projet, qui il est. Le parcours des
citations passe de `app/decision.js` à `app/reconciliation.js`
(`RECONCILIATION.citations`), où `departager` renomme avant le rapprochement le
projet ou le livrable local absent de la dernière base reçue, dont l'identifiant
est porté dans la base relue par un objet né ailleurs ; ce qui le cite suit,
clés composées comprises. `reconcilier` ne fond plus deux projets, ou deux
livrables d'un projet, nés à deux instants. `servir.mjs` refuse en 422
`PROJET_EN_DOUBLE`, `PROJET_REMPLACE`, `LIVRABLE_EN_DOUBLE` et
`LIVRABLE_REMPLACE`. Les identifiants existants ne changent pas ;
`GET /radar/decisions` est inchangé.

### Preuves

- Tests écrits d'abord : `tests/identifiants-unicite.test.mjs`, 11 rouges sur 11
  avant la correction — dont le rapprochement qui laissait deux conflits de champ
  au lieu de départager, et le serveur qui acceptait un doublon (200 au lieu de
  422) —, plus un douzième en attente (`todo`), la référence humaine.
- Après correction, 285 tests Node verts sur les suites de la CI, dont 11
  nouveaux, et le `todo` de la référence ; syntaxe, `distribuer-approches.mjs
  --check` et `vitrine-base.mjs --check` à zéro.
- Cinq bancs d'essai de tests existants simulaient `O` ou `DEPOT` sans le
  générateur commun (`decisions.test.mjs`, `reference-campagne.test.mjs`,
  `saisie-manuelle.test.mjs`, `marches.test.mjs`, `grille.test.mjs`) : ils le
  reçoivent, et `decisions.test.mjs` exerce désormais le vrai tirage, nourri par
  `crypto`.
- Un premier essai fondait en un choix entier tout objet sans date de naissance
  absent de la base : la reprise d'un cache ancien, sans base, le montrait
  (`depot-reprise.test.mjs`). Un tel objet se rapproche désormais champ par champ,
  comme avant.
- Parcours Chromium (`npm test`) : le projet créé par « Nouveau projet » porte
  `PRO-`, le code du poste et douze caractères.
- Base fictive de la démonstration régénérée : ses KV et formats ont la forme
  neuve et une date de naissance ; les identifiants de décision tirés après eux
  ont changé.
- Les assertions HTTP des jobs `image` et `image-entreprise` rejouées sur
  `servir.mjs` lancé directement : le démon Docker n'était pas disponible, les
  images ne sont pas construites ici.

Ces preuves sont locales, sur données fictives : ni CI distante, ni production.

### Limites

- La référence humaine (`ref`) peut encore se répéter entre postes, et déjà dans
  un seul poste : sa forme et son attribution sont à arbitrer (README, « Ce qui
  manque »).
- Un projet ou un livrable né avant ce changement sans date de naissance ne se
  départage pas.
- Un renommage ne réécrit ni un texte libre (`revisionSource`, journal) ni un
  chemin de fichier.
- Le refus du serveur ne couvre que les écritures par `PUT` ; l'ingestion du
  corpus écrit son fichier directement.

## Référence d'un projet attribuée par la base de référence — 12 novembre 2026

Décision du propriétaire, option 3 : le serveur attribue la référence humaine
(`ref`) au premier enregistrement. La limite laissée ouverte ci-dessus est close.
Quatre écrans tiraient la référence sur le poste (`app/intake.js`,
`app/registre-people.js`, `app/vue-projets.js` deux fois), sur deux règles ;
deux postes ouvraient le même `MT-…`, et un seul poste pouvait retomber sur une
référence existante.

Un projet neuf demande désormais sa référence (`refDemandee` : le préfixe de
l'écran, et la saisie s'il y en a une) et montre une étiquette provisoire.
`servir.mjs` attribue le numéro suivant du préfixe, unique dans la base, retire
la demande, écrit et rend `references` dans son reçu ; le poste l'applique
(`DEPOT`), ou la reprend au rapprochement après une réponse perdue
(`RECONCILIATION.adopterReferences`). Une référence attribuée ne change plus
(`REFERENCE_CHANGEE`) ; une saisie ou une référence posée sans demande déjà
portée par un autre projet est refusée (`REFERENCE_PRISE`) ; une demande mal
formée aussi (`REFERENCE_ILLISIBLE`). Les références existantes restent
attribuées, telles quelles. Le manifeste de remise, l'étude et l'export des écarts
attendent la référence ; les documents compilés et la page partagée ne montrent
pas une référence provisoire. Sans base de référence (navigateur jamais rattaché
à un fichier servi, exemple, démonstration), le poste attribue lui-même avec la
même règle (`O.referenceSuivante`) ; une base déjà rattachée continue de demander
si le serveur ne répond pas. `GET /radar/decisions` est inchangé.

### Preuves

- Tests écrits d'abord : `tests/references.test.mjs` et le test de la référence
  de `tests/identifiants-unicite.test.mjs`, jusque-là en attente (`todo`),
  désormais exercé contre le vrai `servir.mjs` : 12 rouges avant la correction ;
  un treizième, l'écriture octet pour octet sans référence à attribuer, était déjà
  vert et le reste.
- Après correction, 298 tests Node verts sur les suites de la CI, aucun en
  attente ; syntaxe, `distribuer-approches.mjs --check` et `vitrine-base.mjs
  --check` à zéro (la base fictive ne change pas).
- Parcours Chromium (`npm test`) : sans base servie, « Nouveau projet » reçoit
  `PRJ-0001` sur le poste ; avec `servir.mjs` et une base servie, il montre
  `PRJ-… (provisoire)`, la base enregistrée porte `PRJ-0001` sans demande, et
  l'en-tête le montre après rechargement.
- Les assertions HTTP des jobs `image` et `image-entreprise` rejouées sur
  `servir.mjs` lancé directement ; le démon Docker n'était pas disponible.

Ces preuves sont locales, sur données fictives : ni CI distante, ni production.

### Limites

- Une saisie faite hors ligne sur deux postes passe sur le premier enregistré ;
  le second ne sauvegarde plus tant que sa demande n'est pas changée, depuis
  l'en-tête du dossier.
- Le registre People ne commence plus à `MT-0042` : il suit le plus grand `MT-`
  de la base, comme les autres écrans.
- Un message de relance et le contexte d'un tirage d'approches reprennent
  l'étiquette provisoire, marquée comme telle.
- La règle de numérotation est écrite deux fois, dans `app/outils.js` et dans
  `servir.mjs`, qui reste sans dépendance ; un test vérifie qu'elles rendent le
  même numéro.
