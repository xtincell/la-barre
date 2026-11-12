# La Barre

**Du brief au BAT, chaque arbitrage est situé.**

Un brief arrive chez le directeur de la création. Il doit devenir une idée, des
pistes, un visuel maître, des variantes par marché, puis des fichiers qui
partent chez l'imprimeur. Entre chaque étape, quelqu'un tranche — et c'est là
que le travail se perd : le brief compris de mémoire, la piste retenue sans
motif, la V3 approuvée à la place de la V2, la variante d'un marché qui change
ce que personne n'avait autorisé, le BAT signé sur une autre version que celle
qu'on a montrée.

La Barre est le poste de travail qui tient ce chemin, et les talents qui le
font :

1. **Le brief** s'accepte sur pièces : ses champs critiques, son décideur, le
   bilan de la campagne précédente. Le brief-back part par écrit.
2. **La big idea** porte ses critères d'acceptation, écrits avant le travail :
   ce sont les seuls refus opposables.
3. **Les pistes** disent ce qu'elles sacrifient. L'une est retenue sur un
   argument, les autres sont écartées avec leur motif.
4. **Le KV master** se juge version par version : une approbation ne vaut que
   pour la version jugée.
5. **Les variantes par marché** ne portent que l'écart que leur marché a
   déclaré au cadrage. Celle qui change autre chose n'est pas bloquée : elle
   est signalée « hors écart déclaré », et la revue tranche.
6. **Le BAT** se pose et se signe sur une version précise ; la remise vérifie
   le manifeste avant que le fichier parte.
7. **Le bilan** de la campagne s'arrête en une version figée, que la campagne
   suivante peut opposer.

Chaque décision rejoint un seul registre — verdict, motif, date, personne — et
ce qui reste à trancher remonte dans une seule file, triée par ce que ça coûte
d'attendre.

**Voir sans installer.** La vitrine, `vitrine/index.html`, raconte ce parcours
sur une marque inventée, Orvelle Zeste, et ouvre une démonstration :
l'application elle-même, sur une base fictive, qui ne lit ni n'écrit aucune
base réelle. Elle est publiée sur https://la-barre-vitrine.powerupgraders.com.
Voir [La vitrine](#la-vitrine) et [docs/VITRINE.md](docs/VITRINE.md).

## L'application

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
| Projets | `#/projets` | La liste des projets, leur lecture par marque, l'écran d'une marque ou d'une campagne (avec son bilan), puis le dossier d'un projet. | `vue-projets.js`, `vue-studio.js` |
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
| Livrables (matrice support × marché, écarts déclarés par marché) | `vue-matrice.js`, `ecarts-marche.js` |
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
- sert à Radar les seules décisions sur `GET /radar/decisions`, derrière un
  jeton machine (voir plus bas) ;
- ajoute à chaque réponse l'en-tête `X-La-Barre-Runtime`, empreinte de
  `index.html`, `app/` et `styles/`.

#### `GET /radar/decisions` — les décisions que lit Radar

SHK-0005, sens 1, arbitrage 5.5 du 11 novembre 2026 : Radar vient chercher les
décisions ; La Barre ne lui envoie rien. La route lit le dépôt désigné par
`depots/manifeste.json` et ne sert que sa collection `decisions` : ni les
personnes, ni la facturation, ni le reste de la base.

- **Jeton.** La machine présente `Authorization: Bearer <BARRE_RADAR_TOKEN>`,
  comparé en temps constant. Sans jeton configuré, ou avec un jeton de moins de
  32 caractères, la route répond `503 ROUTE_FERMEE` : elle n'est jamais ouverte
  par défaut. Un jeton absent ou faux reçoit `401`, sans contenu.
- **Lecture seule.** `GET` et `HEAD` ; toute autre méthode reçoit `405`.
- **Empreinte.** La réponse porte un `ETag` calculé sur ce qui est servi. Avec
  `If-None-Match`, des décisions inchangées répondent `304`, même si le reste
  de la base a bougé.
- **Base illisible.** Sans manifeste, avec un fichier absent ou illisible, ou
  sans collection `decisions`, la route répond `503 BASE_INDISPONIBLE` et ne
  sert rien : une base qu'on ne lit pas n'est pas une base sans décision.

La réponse :

```json
{ "schema": 1, "maison": "…", "depot": "entreprise.json",
  "decisions": [ { "id": "DEC-…", "projet": "P-…", "objet": "…", "type": "livrable",
    "verdict": "approuve", "motif": null, "quand": "2026-11-01T08:00:00.000Z",
    "qui": "direction-generale", "acteur": { "personneId": "…", "nom": "…", "poste": "…" },
    "titre": "…", "cree_le": "…", "empreinte_contenu": "sha256:…" } ],
  "ecartees": [ { "id": "DEC-…", "raison": "identifiant en double" } ] }
```

Chaque décision garde la forme de la fabrique (`app/decision.js`), réduite aux
champs qui la datent et l'attribuent. `id`, `projet`, `objet`, `type`,
`verdict`, `motif`, `quand`, `qui`, `acteur` et `titre` sont toujours présents
(`null` s'ils manquent : une décision de campagne n'a pas de `projet`).
`campagne`, `marque`, `version`, `portee`, `remplace`, `ecart`, `empreinte`,
`revisionSource` et `cree_le` le sont quand la décision les porte. `quand` est
la date de la décision, distincte de l'heure du transfert. `qui` et `acteur`
sont l'auteur tel que déclaré ; `acteur` est réduit à `personneId`, `nom` et
`poste`. Deux champs ne sortent pas : `contenuPiste`, le travail créatif que
recopie la référence de campagne, et `attestation`, le sceau de session de La
Fusée. `empreinte_contenu` est le SHA-256 du JSON canonique — clés triées à
toutes les profondeurs, sans espace — de tous les autres champs servis.

Une décision sans identifiant, ou dont l'identifiant est pris deux fois, n'est
pas servie : elle est nommée dans `ecartees`, pour que le lecteur ne la prenne
pas pour une décision retirée.

La route ne ferme qu'elle-même. Le reste de `servir.mjs` reste sans
authentification : une installation qui l'ouvre à Radar n'expose que
`/radar/decisions` (La Fusée devant, ou une règle réseau), jamais tout le port.

### La vitrine

`vitrine/index.html` raconte le brief-au-BAT ; `vitrine/demo/index.html` est
l'application en mode démonstration, sur la base fictive
`vitrine/demo/base-fictive.json` (une marque, une agence, des personnes et des
campagnes inventées). Avec `servir.mjs` : `http://localhost:5173/vitrine/index.html`
(le serveur ne sert pas d'index de dossier).

La page de démonstration charge les mêmes scripts que `index.html`, dans le
même ordre, avec le profil d'une agence fictive et sans l'exemple de
l'installation historique. Elle déclare `window.LA_BARRE_DEMO` avant tout
module : le dépôt ne lit alors ni le cache du navigateur, ni un manifeste, ni
un dépôt servi, et n'écrit nulle part ; la base vit en mémoire et se remet à
zéro au rechargement. Le contexte de La Fusée n'est pas demandé, l'envoi de
médias et la publication sont refusés. Chaque écran porte « Démonstration —
données fictives ».

La base fictive est rejouée par les modules de l'application
(`node outils/vitrine-base.mjs`, vérifiée par `--check` en CI). La vitrine se
publie comme une distribution statique extraite d'un commit
(`node outils/distribuer-vitrine.mjs <nouveau-dossier> <commit>`), jamais en
exposant `servir.mjs` ou l'image Docker, qui servent tout le dossier sans
authentification. L'image Docker ne contient pas `vitrine/`. Déploiement et ce
que la production demande encore : [docs/VITRINE.md](docs/VITRINE.md).

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
| `HOST` | Adresse d'écoute. Défaut : `127.0.0.1`, cette machine seulement. Les deux Dockerfile posent `HOST=0.0.0.0`, car leur port publié en dépend. |
| `LA_BARRE_EXPORT_MATANGA`, `LA_BARRE_EXPORT_UPGRADERS` | Dossiers lus par `/disque/`. Défaut : les deux exports rangés dans `~/Downloads`. |
| `LA_BARRE_CHROME` | Chrome utilisé par `/partage-pdf`. Défaut : le chemin de Google Chrome sous macOS. |
| `LA_BARRE_EN_LIGNE` | Instance où `/partage-pdf` envoie le PDF et la base. Défaut : `https://labarre.powerupgraders.com/`. |
| `BARRE_RADAR_TOKEN` | Jeton machine de `GET /radar/decisions`, au moins 32 caractères (par exemple `openssl rand -hex 32`). Absent ou trop court : la route reste fermée (`503`). Le même jeton se pose côté Radar. |

## Où vivent les données

**Qui agit.** Deux régimes, et l'écran dit toujours lequel s'applique, sous le
nom au pied du rail :

- *Authentifié par La Fusée.* Servie derrière La Fusée (`/la-barre/`), La Barre
  lit dans `contexte.json` la capacité `actorAttestation: "SESSION_V1"` et la
  personne connectée (identifiant stable et nom, jamais l'e-mail). Elle est
  imposée : le sélecteur de Ressources → Paramètres est verrouillé sur elle, et
  ses postes sont ceux de l'installation, sans casquette prêtée. À chaque
  enregistrement de la base, La Fusée relit la version courante, pose sur chaque
  décision, ligne de journal et version de bilan nouvelle le champ
  `attestation` (`par: "la-fusee"`, identifiant, nom, date, empreinte du
  contenu, sceau) et rend dans son reçu ce qu'elle a attesté. Le navigateur ne
  peut pas en présenter une, en modifier une ni en effacer une : une
  attestation omise est rétablie, une attestation inconnue ou une entrée
  attestée retirée ou modifiée est refusée (422). Seules les lignes de journal
  sans marque peuvent disparaître, par la troncature du journal. Le journal et
  le recueil des arbitrages (Doctrine) affichent l'identité attestée.
- *Déclaré sur ce poste.* Utilisée seule, sans La Fusée, la personne qui agit
  se choisit dans Ressources → Paramètres, parmi les personnes de la base. Ce
  choix est gardé dans le `sessionStorage` de l'onglet. Il attribue les
  gestes ; il ne prouve rien et n'ouvre aucun droit. Le journal et le recueil
  le disent : « déclaré sur ce poste ».

**Le registre des décisions.** Une décision rejoint la collection `decisions`
par un seul chemin, `app/decision.js` : verdict parmi quatre (`approuve`,
`reserve`, `retour`, `hors`), motif écrit hors approbation, date, identifiant
libre. Elle se rattache à un projet, à une campagne ou à une marque. Passent
par lui : la big idea, la piste ou l'idée retenue ou écartée, la référence
commune d'une campagne, le verdict sur un document, un livrable ou une pièce
en revue, le concept écarté de la réserve d'une marque, le brief accepté ou
retourné, la case écartée de la composition d'une campagne, l'écart d'un
projet à la référence commune, l'arrêt du bilan d'une campagne, la revue
d'une adaptation hors de l'écart déclaré de son marché, et l'écart du relevé
écarté ou repris. Chaque
décision ajoute une ligne au journal, qui porte l'acteur. Toutes portent
`qui`, le poste titulaire. La référence de
campagne, le verdict sur un document et les gestes de choix ajoutés au
registre portent aussi `acteur`, l'acteur du poste ci-dessus. Derrière La
Fusée, toute décision nouvelle porte en plus son `attestation`. Les six autres
écrivains d'origine (big idea retenue, idée tranchée, piste retenue sur deux
écrans, livrable jugé, pièce jugée en revue) ne le recopient pas dans la
décision : leur forme stockée est figée par `tests/decisions.test.mjs`.

Une déviation s'écarte d'une décision ou du plan : un projet qui garde sa
propre piste alors qu'une référence commune est désignée, une case de la
composition écartée, un brief accepté malgré des conditions non remplies.
Elle nomme ce dont elle s'écarte (`ecart`), porte un motif et déclare sa
portée : `livrable`, `projet` ou `campagne`. La portée doit être le niveau de
l'objet visé, relu dans la base ; sinon la décision est refusée et rien n'est
écrit. L'écart d'un projet de campagne se déclare depuis l'écran de la
campagne, sous la référence commune ; il fait taire le contrôle « piste propre
alors que … gouverne la campagne » pour ce seul projet.

**Les écarts du relevé.** Ce qu'on me doit se calcule, il ne se saisit pas
(`app/ecarts.js`) : un livrable qui ne tient pas le brief, une plateforme
contredite, un critère d'acceptation non tenu, une annotation ouverte, un retour
client non tranché. L'origine dit qui le doit (`brief`, `plateforme`, `bigidea`,
`agence`, `donneur`). Décisions → Retours attendus range ces écarts par
débiteur ; la file de décision les compte par origine.

Un écart peut ne pas en être un. « Écarter », sur sa ligne, le sort de ce qui
m'est dû, motif exigé. Il n'est plus compté, mais il reste au relevé, marqué
dans `ecartsEcartes[cle]` (motif, date, décision), et se lit sous « Voir les
écarts écartés », avec qui l'a écarté. « Reprendre » le rouvre ; le motif y est
facultatif. Les deux gestes sont des décisions de la fabrique, du type que le
recueil des arbitrages range déjà, `ecart` : `objet` est la clé de l'écart,
`titre` ce qu'il dit, `origine` qui le doit, `livrable` le livrable visé.
Écarter rend le verdict `hors` ; reprendre rend le verdict `approuve` (l'écart
est fondé), et `remplace` nomme la décision qui l'avait écarté. Ce n'est pas une
déviation : rien n'est déclaré. Une ligne qui regroupe la même cause sur
plusieurs livrables s'écarte d'un geste, d'une décision par écart, et chacun se
reprend seul. Un écart écarté avant la fabrique, sans décision, se lit tel quel
et se reprend comme les autres ; le recueil des arbitrages le garde, et ne
compte qu'une fois celui que la fabrique a écarté. Le signal « hors écart
déclaré » d'une adaptation n'est pas un écart du relevé : il se tranche en revue
(voir plus bas).

**Les écarts de marché déclarés.** Ce que chaque marché a le droit de changer
du master se déclare au cadrage, sur le couple projet × marché, depuis la grille
des livrables (« Écarts déclarés par marché », `app/ecarts-marche.js`). Une
déclaration porte une liste de types, ceux du
[Market Expansion System](https://github.com/xtincell/market-expansion-system) :
`langue`, `marque`, `produit` (produit / SKU), `reglementaire`. Le Ghana en porte
deux. Elle vit sous le périmètre, indexée par marché :
`p.perimetre.ecarts[marcheId] = { types, detail, declare_le, acteur, source }`,
avec `par` et `importe_le` quand elle vient d'un import. Aucune migration : un
marché absent est « non déclaré », ce qui n'est pas « aucun écart »
(`types: []`). Une ancienne déclaration à un seul type (`type: "marque"`) se lit
comme une liste d'un élément.

Ces types croisent les origines de `app/ecarts.js` sans les remplacer :
l'origine dit qui paie, le type ce qui change. Les contrôles de conformité du KV
nomment le type qu'ils vérifient (« Langue du marché » : `langue`, « SKU
distribués ici » : `produit`, « Mentions obligatoires » : `reglementaire`,
« Marque » : `marque`), et chaque écart calculé porte cette liste dans `types` ;
`ECARTS.compteParType` les compte. L'accroche et les choix de direction
artistique n'ont pas de type.

**Une adaptation hors de son écart déclaré.** Décision du 12 novembre 2026 :
une adaptation qui change ce que son marché n'a pas déclaré n'est pas bloquée.
Elle passe, et elle est signalée « hors écart déclaré », avec la dimension qui
sort (`ECARTS_MARCHE.evaluer`). Le signal se voit sur la carte du mur et dans la
grille des livrables, sur la planche des KV, dans le bloc « Écarts déclarés par
marché » et dans Décisions → À traiter. La revue tranche, depuis le même
panneau, et chaque geste est une décision de `app/decision.js`, motif exigé :

- « Corriger l'écart déclaré » étend la déclaration du marché à ce que
  l'adaptation change (`source: "revue"`, avec l'identifiant de la décision).
  La décision `ecart-marche` est une déviation du cadrage, de portée `projet`,
  qui garde les types d'avant et d'après dans `ecart`.
- « Corriger l'adaptation » renvoie l'adaptation à ce que le marché a déclaré.
  La décision `hors-ecart` est un retour (`verdict: "retour"`) sur le livrable ;
  la déclaration ne bouge pas, et le signal reste, marqué « retour décidé »,
  jusqu'à ce que l'adaptation soit corrigée. Dans la file, elle passe alors de
  « Trancher » à « Réclamer ».

Ce qu'une adaptation change se lit contre son point de départ, `l.depart`, que
`KV.creer` pose à sa création : le master (identifiant, version) et ce qu'elle
en a reçu, avec la langue et les mentions du référentiel du marché. La langue
ou les mentions imposées par le marché ne sont donc pas des écarts. Les champs
du KV se rangent par type : `langue` et l'accroche (la titraille) pour
`langue`, `marque`, les SKU montrés pour `produit`, les mentions et les
restrictions pour `reglementaire`. Les choix de direction artistique n'ont pas
de type. Un champ que le départ laissait vide se complète sans écart ; le
retirer est un changement. Une reprise du master renouvelle le départ d'une
adaptation qui en a un. Un marché non déclaré n'a rien déclaré : ce que
l'adaptation change en sort. Une adaptation créée avant cette capture n'a pas
de point de départ : elle est « non évaluée », comptée dans le bloc, jamais
signalée. Aucune n'est évaluée après coup.

« Exporter » et « Importer » suivent le format d'échange `ecarts-marche`,
version 1, décrit dans `METHODE.md` du Market Expansion System. Il y est produit
depuis la matrice de cadrage (`node scripts/ecarts.mjs vers-json`). Un fichier
porte un écart par couple projet × marché : le projet par sa référence, le
marché par son code. À l'import, une ligne vaut pour le dossier ouvert si son
projet est sa référence, son identifiant ou le `ndeg` d'un brief du registre
Radar qui lui est rattaché ; les lignes d'autres projets sont ignorées. Un
marché inconnu du référentiel, un type inconnu ou un couple déclaré deux fois
refusent l'import entier : rien n'est écrit. Un marché hors du périmètre est
déclaré quand même, et signalé ; le périmètre ne change pas. Une date absente du
fichier reste absente.

**Le bilan de campagne.** C'est le diagnostic que la campagne suivante doit
pouvoir opposer : ni la fiche mensuelle (Bilan → Bilan mensuel), ni le texte
de clôture d'un projet, ni la chronologie de la marque. Il s'écrit en bas de
l'écran de la campagne (`app/campagne.js`, `blocBilan`). Le texte de travail
(`campagne.bilan`) se réécrit librement ; « Clore le bilan de campagne » est
une décision (`bilan-campagne`, portée `campagne`) qui fige une version dans
`campagne.bilanVersions`. Une version porte une identité stable
(`BIL-<campagne>`), son numéro, sa date (`arrete_le`, recopiée dans
`campagne.bilan_le`), la campagne et ses marques telles qu'elles étaient, le
texte, l'acteur, la décision, l'empreinte de la version précédente et la
sienne : SHA-256 du JSON aux clés triées, sans les champs `empreinte` et
`attestation`. Derrière La Fusée, la version reçoit l'attestation de la
personne connectée à son enregistrement, hors de l'empreinte ; La Fusée vérifie
cette attestation à la réception. Une
nouvelle version exige d'écrire ce qu'elle change ; les précédentes ne sont
jamais réécrites. L'empreinte se calcule avec `crypto.subtle`, que le
navigateur réserve aux contextes sécurisés (HTTPS, `localhost`) : sur une
adresse HTTP du réseau, le bilan n'est pas arrêté.
`tests/fixtures/bilan-campagne-v1.json` et `bilan-campagne-atteste-v1.json`
sont les jeux communs avec La Fusée.

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
`/la-barre/partage/<jeton>/document`. Si le contexte déclare
`campaignReviewReception: "CAMPAIGN_REVIEW_V1"`, chaque version arrêtée d'un
bilan de campagne propose « Transmettre à La Fusée » : la base est d'abord
enregistrée, puis `POST bilan` n'envoie que `campagneId`, `bilanId`, `version`
et `empreinte`. La Fusée relit la version dans la base enregistrée, recalcule
son empreinte et la range dans les documents de la marque ; son accusé est
gardé dans `campagne.bilanRecus`, sans toucher à la version. `servir.mjs` ne
sert ni `contexte.json`, ni `publication`, ni `bilan` : ils viennent de l'hôte
qui sert `/la-barre/`. Selon
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
node --test tests/bilan-delai.test.mjs tests/ecarts.test.mjs tests/registre-radar.test.mjs
node outils/distribuer-approches.mjs --check
node --test tests/approches.test.mjs
node --test tests/entreprise.test.mjs
npm run test:radar
node outils/vitrine-base.mjs --check
npm run test:vitrine
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
| `npm run test:marches` | `node --test tests/marches.test.mjs tests/grille.test.mjs tests/ecarts-marche.test.mjs tests/hors-ecart.test.mjs` |
| `npm run test:provenances` | `node --test tests/provenances-plateformes.test.mjs tests/vault-contexte.test.mjs` |
| `npm run test:decisions` | `node --test tests/reference-campagne.test.mjs tests/decisions.test.mjs tests/attestation.test.mjs` |
| `npm run test:bilan` | `node --test tests/bilan-preuves.test.mjs tests/bilan-campagne.test.mjs` |
| `npm run test:radar` | `node --test tests/radar-decisions.test.mjs` |
| `npm run test:vitrine` | `node --test tests/vitrine.test.mjs` |
| `npm run vitrine:base` | `node outils/vitrine-base.mjs` (réécrit la base fictive de la démonstration) |

Les tests `node --test` n'ont besoin d'aucune dépendance npm ;
`tests/entreprise.test.mjs` et `tests/vitrine.test.mjs` appellent aussi `git`. `npm test` lance un
parcours dans Chromium avec Playwright, sur un serveur éphémère et la base
fictive `tests/fixtures/studio.json`. Il demande `npm install` et un Chromium
pour Playwright (`npx playwright install chromium`, ou `BROWSER_CHANNEL` pour
un navigateur installé). La CI ne le lance pas.

## Ce qui manque

- **Un câblage vers Radar en lecture seulement.** Radar lit les décisions sur
  `GET /radar/decisions` (voir plus haut) ; La Barre n'envoie rien. Le
  rattachement d'un projet à un dossier Radar se tient dans Radar, pas ici.
  Le registre des briefs (Ressources) reste un relevé :
  `outils/ingerer-corpus.mjs` le lit dans un CSV d'un corpus situé hors du
  dépôt (`../DOSSIER PROJETS — XTINCELL/00 DOCUMENTATION/RADAR — briefs releves.csv`)
  et l'écrit dans la base. L'application ne lit pas Radar en direct. La route
  ne reçoit aucune mesure avant/après (arbitrage 5.6) ; l'accès machine à
  travers La Fusée n'est pas décrit, et l'attestation de La Fusée ne part pas
  vers Radar.
- **Un registre des projets sans source dans le dépôt.** Le registre des
  projets se lit dans la base, mais aucun outil du dépôt ne le remplit.
- **Un écart écarté ne se lit que dans Retours attendus.** La planche des KV
  et la route d'une piste lisent la conformité du KV directement : un
  manquement écarté y reste affiché comme manquement. Aucun écran ne montre le
  relevé d'un seul dossier : Retours attendus ignore les dossiers clos, et un
  écart d'un dossier clos ne s'écarte que par `ECARTS.ecarterUn`. Le marquage
  d'un écart dont la cause a disparu reste dans `ecartsEcartes`, sans être
  montré.
- **Une déclaration d'écart ne juge que les adaptations.** Une adaptation hors
  de son écart déclaré est signalée et tranchée en revue ; elle ne produit pas
  d'écart calculé dans `app/ecarts.js`, faute d'origine : rien ne dit qui a
  demandé le changement, ni qui paie sa reprise. Les formats ne sont pas
  évalués, ni les adaptations créées avant le point de départ (« non
  évaluées »), ni les choix de direction artistique. La règle « déclaré avant
  le premier crayon » n'est pas contrôlée : la date de déclaration n'est pas
  comparée à la première pièce du marché, et une déclaration corrigée en revue
  porte sa propre date. Le contrôle « Marque » de la conformité vérifie une
  présence ; la bascule, elle, se lit maintenant contre le point de départ.
- **Aucune authentification dans `servir.mjs`.** Quiconque joint son port peut
  lire tout le dossier et écrire là où le serveur l'accepte, attestations
  comprises : `servir.mjs` ne connaît aucune identité et ne vérifie aucun
  sceau. L'attestation n'a de valeur que si le port de La Barre n'est joint que
  par La Fusée, comme dans l'installation conteneurisée.
- **Ce que l'acteur authentifié ne couvre pas encore.** La Fusée atteste les
  entrées nouvelles des décisions, du journal et des versions de bilan ; elle
  vérifie le sceau à la réception d'un bilan seulement. La Barre ne peut pas le
  vérifier : elle affiche ce qui est enregistré. Les autres objets de la base
  (projets, livrables, réglages) restent écrits d'un bloc, sans attestation.
  Les décisions et lignes prises avant l'arrivée du contexte, ou hors de La
  Fusée, restent déclarées et ne sont jamais attestées après coup. La personne
  connectée n'est reliée à aucune personne de la base : ses casquettes ne sont
  pas reprises. Un geste sans acteur authentifié n'est pas refusé : sans La
  Fusée, la base reste ouverte aux gestes déclarés.
- **L'acceptation du brief n'est plus proposée.** « Accepter le brief » et
  « Retourner sous réserve » (`app/vue-brief.js`, `corpsCampagne`) ne
  s'affichent que si la nature du projet offre le brief de campagne. Or ce
  brief porte sur la campagne, et `BRIEFS.pourNature` ne l'offre jamais sur un
  dossier (`app/briefs.js`). Les deux gestes passent par le registre des
  décisions, mais aucun écran ne les montre.
- **Un bilan reçu n'est pas encore relu pour la campagne suivante.** La Fusée
  range chaque version transmise comme proposition dans les documents de la
  marque ; rien ne la ramène encore automatiquement dans le brief ou la
  composition de la campagne suivante, et la transmission se fait version par
  version, à la main. Derrière La Fusée, une version arrêtée porte
  l'attestation de la personne connectée qui l'a enregistrée ; La Fusée
  enregistre en plus celle qui transmet. Une version arrêtée hors de La Fusée
  reste déclarée.
- **Aucun envoi.** « Demander un retour » rédige le message et date l'attente.
  L'application n'envoie ni e-mail ni notification.
- **Une vitrine prête, pas encore publiée.** La distribution statique de la
  vitrine existe et se vérifie ; aucun hébergement, aucune adresse ni aucune
  route publique de La Fusée n'est configuré. Voir
  [docs/VITRINE.md](docs/VITRINE.md), « Ce que la production demande encore ».
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
- [docs/VITRINE.md](docs/VITRINE.md) — la vitrine publique et sa
  démonstration sur données fictives : isolement, base, publication.
- [docs/RECEPTION-PERSISTANCE.md](docs/RECEPTION-PERSISTANCE.md),
  [docs/RECEPTION-SAISIE.md](docs/RECEPTION-SAISIE.md),
  [docs/RECEPTION-MARCHES.md](docs/RECEPTION-MARCHES.md),
  [docs/RECEPTION-APPROCHES.md](docs/RECEPTION-APPROCHES.md) — notes de
  réception de ces chantiers.
- `documents/` et `sources/` — documents de travail de l'installation
  historique : fiches, processus, doctrine, modèles.

## Licence

Licence propriétaire — UPgraders SARL. Voir [LICENSE](LICENSE).
