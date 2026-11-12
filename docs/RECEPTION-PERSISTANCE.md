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
