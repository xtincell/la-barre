# Une distribution pour une autre entreprise

Le moteur et ses écrans restent communs. `app/maison-base.js` porte les règles et
comportements partagés ; `app/maison.js` porte le profil de l’installation
historique. Le profil nomme les structures, responsabilités, registres et
éléments d’identité de ses présentations. Les personnes, leurs casquettes,
projets, marques, sources et décisions restent dans le dépôt de l’entreprise.

Le Dockerfile à la racine reste celui de l’installation historique. Il ne doit
pas être utilisé comme image de départ pour une autre entreprise : son contexte
contient des extraits et des sources professionnels. Aucun de ces fichiers
n’est supprimé ou déplacé par ce changement.

## Préparer une image neutre

```sh
node outils/distribuer-entreprise.mjs /chemin/nouveau-contexte COMMIT_COMPLET
docker build -t la-barre-entreprise:COMMIT_COMPLET /chemin/nouveau-contexte
```

Le répertoire doit être nouveau. Le distributeur ne lit que les fichiers de
runtime suivis au commit choisi et substitue les profils **avant** toute couche
Docker. Il ne part jamais d’une image contenant un corpus d’entreprise. Il
écarte `depots`, `assets`, `sources`, `extraits`, `documents`, les outils locaux,
les secrets et le véritable exemple préchargé. Le générateur Approches reste
la copie distribuée de sa source canonique, sans seconde méthode.

`distribution.json` enregistre le commit et les empreintes de tous les fichiers
du contexte. La construction vérifie ces empreintes et refuse les fichiers
inconnus. Les familles privées déposées dans le contexte après génération sont
aussi exclues du contexte Docker. Le profil neutre ne déclare ni historique
client, ni salariés, ni documents de doctrine propres à une autre entreprise.
La méthode et les écrans doctrinaux du programme restent dans le moteur.

## Paramétrer le poste

Une entreprise peut monter, en lecture seule, son fichier à
`/app/app/maison.js`, par exemple :

```js
window.MAISON = MAISON_BASE.creer({ nom: "Entreprise de recette" });
```

La configuration peut préciser les responsabilités, la structure principale,
les noms des registres et l’identité des présentations. Elle ne contient aucun
mot de passe ou jeton. Elle n’accorde pas de permission serveur et ne remplace
pas la sélection explicite d’une personne et de ses casquettes dans le dépôt.

Monter deux volumes privés distincts sur `/app/depots` et `/app/assets/review`.
Le processus tourne avec l’utilisateur `node`. Au premier démarrage,
`outils/preparer-entreprise.mjs` appelle le véritable `DEPOT.vide()` puis écrit
son fichier et le manifeste. Un redémarrage ne réécrit aucun de leurs octets.
Un manifeste incohérent, un fichier absent ou un dossier non vide sans manifeste
arrête l’initialisation ; aucun exemple ne masque le travail à retrouver.

## Accès et reprise

Le serveur natif reste sans authentification : le placer sur le réseau privé de
l’installation. La Fusée fournit déjà le raccord authentifié `/la-barre/`, les
contrôles d’origine et les permissions d’écriture. Configurer les mécanismes
existants `PORTFOLIO_BARRE_UPSTREAM`, `PORTFOLIO_BARRE_OPERATOR_IDS`,
`PORTFOLIO_BARRE_INSTANCE` et `PORTFOLIO_BARRE_DEPOT` (`entreprise.json`) dans cette
installation ; ne jamais partager l’adresse du serveur d’une autre entreprise.

La sauvegarde doit recevoir ensemble le dépôt, ses fichiers de revue et le
profil, en plus de la base et des originaux de La Fusée. Un succès de build ou
un dépôt vide ne vaut pas réception de cette reprise ni de toute la flotte.

Le formulaire natif Nouveau projet propose les marques autorisées de l’équipe.
Le choix explicite admet uniquement un pointeur vers le BrandNode et sa stratégie,
sans copier leurs réponses dans le dépôt. La création/classification de la marque
et le rattachement d’une stratégie se font dans le portefeuille existant. Un
projet peut commencer avec une marque à rattacher ; aucun socle n’est inventé.
Les champs d’un pointeur canonique restent édités dans La Fusée, même absents ou
indisponibles. Le portefeuille relit les projets réellement rattachés au pointeur.
