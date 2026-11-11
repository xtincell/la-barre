# La Barre

La Barre est le poste de travail du directeur de la création : du brief au
livrable, et les talents qui les font.

C'est une application web statique. `index.html` charge directement les scripts
de `app/` et les feuilles de `styles/`, sans étape de compilation. Un petit
serveur Node, `servir.mjs`, la sert et enregistre la base dans un fichier. Il
n'utilise que les modules natifs de Node.

## Les vues

La navigation (`app/application.js`) compte sept entrées. Chaque mode a sa
propre adresse, par exemple `#/referentiel/parametres`. Les anciennes adresses
(`#/reglages`, `#/attentes`, `#/decider`…) mènent au mode correspondant.

| Entrée | Adresse | Ce qu'on y trouve | Fichiers de `app/` |
|---|---|---|---|
| Bureau | `#/bureau` | Les créations à regarder et les projets en cours. Un livrable à examiner s'ouvre en panneau. | `vue-studio.js`, `vue-revue.js`, `vue-asset.js` |
| Décisions | `#/valider` | À traiter · Retours attendus | `vue-decider.js`, `file-action.js`, `vue-attentes.js` |
| Planning | `#/planning` | Priorités · Plan de charge · Équipe · Livraisons | `vue-placer.js`, `vue-pipeline.js`, `vue-direction.js`, `vue-livraisons.js` |
| Bilan | `#/reporting` | Indicateurs · Reprises · Évaluation · Bilan mensuel · Arbitrages | `vue-constater.js`, `bilan.js`, `vue-equipe.js`, `vue-findemois.js`, `vue-jurisprudence.js` |
| Projets | `#/projets` | La liste des projets, leur lecture par marque, l'écran d'une marque ou d'une campagne, puis le dossier d'un projet. | `vue-projets.js`, `vue-studio.js` |
| Galerie | `#/galerie` | Les campagnes et leur structure, en images, par année. | `vue-galerie.js` |
| Ressources | `#/referentiel` | Marques · Marchés et supports · Registre des projets · Registre des briefs · Boîte d'entrée · Le disque · Doctrine · Paramètres | `vue-maison.js`, `vue-vault.js`, `vue-referentiel.js`, `registre-people.js`, `registre-radar.js`, `intake.js`, `disque.js`, `vue-doctrine.js`, `vue-reglages.js` |

Les noms des deux registres viennent du profil de l'installation
(`MAISON.registres`).

Le dossier d'un projet s'ouvre à `#/projets/<id>/<section>`. Ses sections
dépendent de la nature du projet (`MAISON.natures`, dans `app/maison-base.js`) :

| Section | Fichier de `app/` |
|---|---|
| Identité, Brief-back | `vue-projets.js` (champs de `modele-champs.js`) |
| Brief | `vue-brief.js` |
| Plateforme de marque | `vue-socle.js` |
| Stratégie | `vue-insight.js` |
| Séance de créa | `vue-atelier.js` |
| Big idea | `vue-bigidea.js` |
| Pistes créatives | `vue-pistes.js`, `vue-route.js` |
| Déclinaisons | `vue-planche.js` |
| Livrables (matrice support × marché) | `vue-matrice.js` |
| Planche de livraison | `vue-livraison.js` |
| Présentation | `vue-presentation.js` |

Un livrable s'ouvre en panneau (`vue-asset.js`, avec les onglets de
`vue-livrable.js`). L'adresse `#/partage/<jeton>` affiche un document compilé
ou la présentation, sans la navigation (`partage.js`). Depuis les pistes,
« Explorer des approches » ouvre l'atelier `app/ateliers/approches/index.html` ;
son résultat revient par un fichier JSON (voir
[docs/RECEPTION-APPROCHES.md](docs/RECEPTION-APPROCHES.md)).

## Ouvrir La Barre

### Sans serveur

Ouvrir `index.html` dans un navigateur. Aucune installation ni compte.

Ce qui fonctionne :

- tous les écrans ;
- la base, gardée dans le `localStorage` de ce navigateur ;
- à la première ouverture, le jeu d'exemple du profil historique : MT-0020 et
  MT-0031 ;
- l'export et l'import de la base en JSON.

Ce qui ne fonctionne pas en `file://` :

- l'écriture dans un fichier partagé : chaque navigateur garde sa propre base ;
- les brouillons de reprise (IndexedDB) ;
- l'envoi d'images et de médias : l'application refuse et demande `servir.mjs` ;
- les routes du serveur local : lecture des exports (`/disque/`), PDF de la
  présentation ;
- les références de marque de La Fusée.

### Avec `servir.mjs`

Avec une URL, depuis la racine du dépôt :

```bash
node servir.mjs 5173
```

puis `http://localhost:5173/`. Le serveur n'écoute que sur cette machine par défaut :
il ne fournit aucune authentification. L'ouvrir au réseau (`HOST=0.0.0.0`) est un
choix explicite, que l'installation doit alors protéger. Les images Docker le font,
car leur port publié en dépend.

`npm start` lance `node servir.mjs`, sur le port `5173` ou sur `PORT`. Un port
passé en argument prime sur `PORT`. Pour l'adresse d'écoute, voir `HOST`
plus bas.

Le serveur :

- sert en lecture tout fichier situé sous son dossier, sans authentification ;
- n'accepte d'écriture (`PUT` ou `POST`) que pour les `.json` d'un dossier
  `depots/`, les paquets `assets/review/partage/<24 caractères hexadécimaux>.json`
  et les médias de `assets/review/` (images, vidéos et PDF envoyés en `data:`
  base64), dans la limite de 24 Mo ;
- réserve trois routes à la machine locale : `/disque/…` lit les exports,
  `/disque-ouvrir` les ouvre avec la commande `open` de macOS, `/partage-pdf`
  imprime la présentation en PDF avec Chrome puis l'envoie à l'instance en ligne ;
- ajoute à chaque réponse l'en-tête `X-La-Barre-Runtime`, empreinte de
  `index.html`, `app/` et `styles/`.

### Avec Docker

```bash
docker build -t la-barre .
docker run -d -p 127.0.0.1:5173:3000 \
  -v la-barre-depots:/app/depots -v la-barre-review:/app/assets/review la-barre
```

L'image part de `node:22-alpine` et lance `node servir.mjs 3000`, sans
dépendance de développement. Les deux volumes gardent la base et les médias.
Le contexte de construction (`.dockerignore`) ne retient qu'une liste de
fichiers et de dossiers : ni `depots/`, ni `assets/`, ni `tests/`. Il retient
en revanche `docs/`, `documents/`, `extraits/`, `sources/`, `kit-ordi-dedie/`
et `outils/`, que le serveur sert comme le reste.

Ce Dockerfile est celui de l'installation historique. Pour une autre
entreprise, une image neutre se construit à partir de
`outils/distribuer-entreprise.mjs` et de `profils/entreprise/Dockerfile`. Elle
tourne sous l'utilisateur `node` et crée au premier démarrage
`depots/entreprise.json` et son manifeste. Voir
[docs/INSTALLATION-ENTREPRISE.md](docs/INSTALLATION-ENTREPRISE.md).

| Variable | Effet |
|---|---|
| `PORT` | Port d'écoute quand aucun port n'est passé en argument. Défaut : `5173`. L'image pose `PORT=3000`, et sa commande passe aussi `3000`. |
| `HOST` | Adresse d'écoute. Sur `main`, sans elle, `servir.mjs` écoute sur `0.0.0.0`, c'est-à-dire sur toutes les interfaces. À la fusion de #14, ce défaut devient `127.0.0.1`, et les deux Dockerfile posent `HOST=0.0.0.0`. |
| `LA_BARRE_EXPORT_MATANGA`, `LA_BARRE_EXPORT_UPGRADERS` | Dossiers lus par `/disque/`. Défaut : les deux exports rangés dans `~/Downloads`. |
| `LA_BARRE_CHROME` | Chrome utilisé par `/partage-pdf`. Défaut : le chemin de Google Chrome sous macOS. |
| `LA_BARRE_EN_LIGNE` | Instance où `/partage-pdf` envoie le PDF et la base. Défaut : `https://labarre.powerupgraders.com/`. |

## Où vivent les données

Il n'y a pas de compte. La personne qui agit se choisit dans Ressources →
Paramètres, parmi les personnes de la base. Ce choix est gardé dans le
`sessionStorage` de l'onglet. Il attribue les gestes ; il n'ouvre aucun droit.

**Dans le navigateur.** La base entière est copiée dans le `localStorage`, sous
la clé `la-barre`. Sans fichier servi, c'est le seul endroit : chaque navigateur
a sa propre base. Ressources → Paramètres affiche sa taille face à un plafond
de 5 Mo.

**Dans un fichier.** Avec `servir.mjs`, si `depots/manifeste.json` désigne une
`reference` (`{"reference": "nom.json"}`), le fichier `depots/nom.json` fait foi.
Il doit déjà exister : l'application ne le crée pas. Sans manifeste, elle reste
sur la base du navigateur, même servie. La base est envoyée au serveur environ
une seconde après le dernier geste. Le `localStorage` reste un filet.

- Le serveur exige la révision lue (`ETag` → `If-Match`). Une création utilise
  `If-None-Match: *`. Sans l'une ni l'autre, le serveur répond 428. Si le
  fichier a changé entre-temps, il répond 409. `X-Base` reste accepté pour les
  anciens clients.
- Le serveur contrôle puis remplace le fichier dans une seule section critique.
  Une réponse perdue peut être redemandée avec le même corps. Un JSON illisible
  n'écrase jamais la base.
- Cette garantie porte sur un seul processus serveur. Écrire le fichier
  directement, ou lancer plusieurs processus sur le même fichier, contourne ce
  protocole. `outils/ingerer-corpus.mjs --ecrire` écrit ainsi
  `depots/beignet-paradise.json`.
- Deux modifications sur des champs différents se réunissent. Deux valeurs du
  même champ demandent un choix : Ressources → Paramètres → « Rapprocher les
  modifications ».
- Tant qu'une sauvegarde n'est pas reçue, chaque onglet garde un brouillon dans
  IndexedDB (`la-barre-reprises`). Il est repris au rechargement. Le brouillon
  d'un autre onglet se reprend depuis Ressources → Paramètres.

**Les médias.** Les vignettes et médias envoyés sont rangés dans
`assets/review/`. La base n'en garde que le chemin.

**Export et import.** Le bouton de sauvegarde, en bas de la barre latérale, et
« Exporter la base » (Ressources → Paramètres) téléchargent la base en JSON
(`la-barre_<date>_<heure>.json`). Ils fonctionnent dans tous les modes.
« Importer un fichier » remplace la base par le fichier choisi. Un fichier d'un
schéma plus récent que 5 est refusé ; un plus ancien est migré. Avec un fichier
servi, la base importée est ensuite sauvegardée dans ce fichier.

`depots/*.json` et `assets/` sont exclus de Git (`.gitignore`) et de l'image.

**Derrière La Fusée.** Servie sous un chemin `/la-barre/`, l'application lit
aussi `contexte.json`, les références de marque de La Fusée, avec les cookies de
la même origine. Si ce contexte le permet, la publication d'un document passe
par `POST publication`, et son lien prend la forme
`/la-barre/partage/<jeton>/document`. `servir.mjs` ne sert ni `contexte.json`
ni `publication` : ils viennent de l'hôte qui sert `/la-barre/`. Selon
[docs/INSTALLATION-ENTREPRISE.md](docs/INSTALLATION-ENTREPRISE.md), La Fusée
fournit ce raccord authentifié. Hors de ce chemin, l'application ne fait aucune
de ces requêtes.

## Lancer les tests

La CI (`.github/workflows/verification.yml`) tourne sous Node 22, à chaque push
et à chaque pull request vers `main`, sans `npm install`. Le job `verification`
exécute :

```bash
node --check servir.mjs
for fichier in app/*.js; do node --check "$fichier" || exit; done
npm run test:persistance
npm run test:manuel
npm run test:marches
npm run test:provenances
npm run test:decisions
npm run test:bilan
node outils/distribuer-approches.mjs --check
node --test tests/approches.test.mjs
node --test tests/entreprise.test.mjs
```

S'il réussit, deux jobs construisent et exercent les images Docker :

- `image` lance l'image racine avec deux volumes. Il vérifie la page d'accueil
  et l'en-tête `X-La-Barre-Runtime`, l'absence des fichiers privés (404), la
  création d'une base, le refus d'une révision dépassée (409), l'écriture d'un
  média et d'un paquet de partage, leur conservation après redémarrage et
  l'état `healthy`.
- `image-entreprise` prépare la distribution neutre et construit son image. Il
  vérifie une base `Entreprise` vide, l'exemple désactivé, l'absence de noms de
  l'installation historique et des fichiers privés (404), puis une écriture
  conservée après redémarrage.

Les scripts de `package.json` :

| Script | Commande |
|---|---|
| `npm start` | `node servir.mjs` |
| `npm test` | `node tests/parcours.mjs` |
| `npm run test:persistance` | `node --test tests/persistance.test.mjs tests/reconciliation.test.mjs tests/depot-reprise.test.mjs` |
| `npm run test:manuel` | `node --test tests/saisie-manuelle.test.mjs tests/acteur.test.mjs tests/formulaire.test.mjs tests/lecture-dependances.test.mjs` |
| `npm run test:marches` | `node --test tests/marches.test.mjs` |
| `npm run test:provenances` | `node --test tests/provenances-plateformes.test.mjs tests/vault-contexte.test.mjs` |
| `npm run test:decisions` | `node --test tests/reference-campagne.test.mjs` |
| `npm run test:bilan` | `node --test tests/bilan-preuves.test.mjs` |

Les tests `node --test` n'ont besoin d'aucune dépendance npm ;
`tests/entreprise.test.mjs` appelle aussi `git`. `npm test` lance un
parcours dans Chromium avec Playwright, sur un serveur éphémère et la base
fictive `tests/fixtures/studio.json`. Il demande `npm install` et un Chromium
pour Playwright (`npx playwright install chromium`, ou `BROWSER_CHANNEL` pour
un navigateur installé). La CI ne le lance pas.

## Ce qui manque

- **Aucun câblage vers Radar.** Le registre des briefs (Ressources) est un
  relevé. `outils/ingerer-corpus.mjs` le lit dans un CSV d'un corpus situé hors
  du dépôt (`../DOSSIER PROJETS — XTINCELL/00 DOCUMENTATION/RADAR — briefs releves.csv`)
  et l'écrit dans la base. L'application ne lit pas Radar en direct et ne lui
  envoie aucune décision.
- **Un registre des projets sans source dans le dépôt.** Le registre des
  projets se lit dans la base, mais aucun outil du dépôt ne le remplit.
- **Des écarts qu'on ne peut pas écarter.** `ECARTS.ecarterUn` et
  `ECARTS.reprendre` (`app/ecarts.js`) n'ont aucun appelant. Depuis
  l'interface, un écart ne peut être ni écarté ni repris. Les écarts déjà
  écartés dans une base (`ecartsEcartes`) restent lus, notamment par les
  arbitrages.
- **Aucune authentification dans `servir.mjs`.** Quiconque joint son port peut
  lire tout le dossier et écrire là où le serveur l'accepte.
- **Aucun envoi.** « Demander un retour » rédige le message et date l'attente.
  L'application n'envoie ni e-mail ni notification.
- **Des routes locales pensées pour macOS.** `/disque-ouvrir` appelle `open` ;
  `/partage-pdf` cherche Chrome à son chemin macOS, sauf si `LA_BARRE_CHROME`
  est défini.
- **Un parcours navigateur hors CI.** `npm test` ne se lance qu'à la main.

## Adapter l'installation

Le profil d'une installation vit dans `app/maison.js` ; les règles communes,
dans `app/maison-base.js`. Les champs de saisie sont déclarés dans
`app/modele-champs.js`, dont le schéma porte une version (`CHAMPS.version`).

## Documents

- [docs/INSTALLATION-ENTREPRISE.md](docs/INSTALLATION-ENTREPRISE.md) — image
  neutre pour une autre entreprise.
- [docs/RECEPTION-PERSISTANCE.md](docs/RECEPTION-PERSISTANCE.md),
  [docs/RECEPTION-SAISIE.md](docs/RECEPTION-SAISIE.md),
  [docs/RECEPTION-MARCHES.md](docs/RECEPTION-MARCHES.md),
  [docs/RECEPTION-APPROCHES.md](docs/RECEPTION-APPROCHES.md) — notes de
  réception de ces chantiers.
- `documents/` et `sources/` — documents de travail de l'installation
  historique : fiches, processus, doctrine, modèles.

## Licence

Licence propriétaire — UPgraders SARL. Voir [LICENSE](LICENSE).
