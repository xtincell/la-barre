# Ce que « fini » veut dire

Jusqu'ici, une page était « finie » quand ses tests passaient et qu'elle ne
débordait pas. La recette du 26/11 est passée à l'identique avant et après une
mise à jour que l'équipe rejette toujours (constat `historique-processus-2`),
et trois espaces sur six n'avaient jamais été regardés (`manque-3`).

Désormais, **les tests verts sont un prérequis, pas un critère de sortie.** Une
PR qui touche l'interface est finie quand les huit conditions ci-dessous sont
remplies et écrites dans sa description (gabarit
[`.github/pull_request_template.md`](../.github/pull_request_template.md)).

## 1. Les tests sont verts

```bash
node --check servir.mjs
for f in app/*.js; do node --check "$f" || exit; done
npm run test:persistance && npm run test:manuel && npm run test:marches
npm run test:provenances && npm run test:decisions && npm run test:bilan
npm run test:radar && npm run test:vitrine
BROWSER_CHANNEL=chrome npm run test:recette   # la mesure des captures demande un navigateur
node --test tests/bilan-delai.test.mjs tests/ecarts.test.mjs tests/registre-radar.test.mjs
node --test tests/approches.test.mjs tests/entreprise.test.mjs
node outils/vitrine-base.mjs --check
node outils/distribuer-approches.mjs --check
BROWSER_CHANNEL=chrome npm test        # ou npm test avec le Chromium de Playwright
```

La CI (`.github/workflows/verification.yml`) passe, avec ses jobs `image` et
`image-entreprise`. Une PR qui renomme un libellé met à jour l'assertion de test
dans le même commit.

## 2. Les captures avant et après sont jointes

`outils/recette-captures.mjs` photographie **tous** les espaces à 320, 390 et
1440 px : Bureau ; Projets (en cours, archives, par marque, galerie, une marque,
une campagne) ; chaque rubrique de chaque nature ; une pièce (poser, juger,
origine, remise, version historique) et une piste ; Décisions, Planning (4 vues),
Bilan (5 vues), Ressources (8 vues) ; Plus ; la recherche ouverte ; Nouveau
projet ouvert ; la demande de proposition ouverte ; la page partagée. Sous
768 px, la page est vue comme sur un téléphone : écran tactile, densité 2,
`(hover: none)` et `(pointer: coarse)` vrais.

La passe « avant » se fait **sur la branche de base du lot** : `main`, ou
`adoption/00-mesurer` tant que ce lot n'est pas fusionné (les gains rapides
s'empilent dessus). La passe « après » se fait sur la branche du lot, **avec
la même version de l'outil**.

```bash
# 1. Au début du lot, avant le premier changement (la branche est encore
#    au commit de base) :
BROWSER_CHANNEL=chrome npm run recette:captures -- --avant --horloge 2026-11-26T09:00:00
# 2. À la fin du lot :
BROWSER_CHANNEL=chrome npm run recette:captures -- --apres --horloge 2026-11-26T09:00:00
```

Si le lot a déjà commencé, ou s'il modifie `outils/recette-captures.mjs` ou
`outils/termes-interdits.mjs`, refaites l'avant depuis un export du commit de
base, avec l'outil de la branche :

```bash
base=<commit de base du lot>     # par exemple : git merge-base HEAD origin/main
export=$(mktemp -d) && git archive "$base" | tar -x -C "$export"
cp outils/recette-captures.mjs outils/termes-interdits.mjs "$export/outils/"
ln -s "$PWD/node_modules" "$export/node_modules"
BROWSER_CHANNEL=chrome node "$export/outils/recette-captures.mjs" --avant \
  --commit "$(git rev-parse --short "$base")" --sortie "$(node outils/recette-captures.mjs --ou)" \
  --horloge 2026-11-26T09:00:00
```

- Les captures sont écrites **hors du dépôt**, dans un dossier par branche :
  `../recette-adoption/<branche>/avant` et `…/apres` par défaut (`--sortie`
  pour un autre dossier ; `--ou` affiche celui de la branche courante). Deux
  lots qui lancent la recette en même temps n'écrasent pas leurs passes. Le
  script refuse d'écrire dans le dépôt, et ne vide ni n'écrase jamais un
  dossier qui ne vient pas d'une recette.
- `captures.json` porte la **version de la mesure** (`mesure.version`,
  l'empreinte de l'outil et de la liste des termes) et le poste de capture
  (`mesure.contexte`). Si l'avant a été pris par une autre version, la
  planche le dit en tête (« refaites-la »), aucune capture n'est comptée comme
  modifiée et `comparaison.mesure.identique` vaut `false` : la comparaison ne
  vaut rien, refaites l'avant. Avec `--apres` sans passe avant, l'outil
  prévient sur la sortie d'erreur.
- Ouvrez `apres/index.html` : la planche-contact montre chaque écran, avant et
  après, à chaque largeur, avec ses alertes. Elle s'ouvre sur ce qui a changé :
  chaque capture porte « modifiée », « identique » ou « identique à l'œil »,
  et la case « N'afficher que les captures à regarder » ne garde que les
  modifiées, nouvelles, nuancées ou non comparées (ou dit qu'il n'y en a
  aucune). « Identique à l'œil » ne pardonne que le lissage des images
  (jusqu'à 32/255, dans les rectangles des images seulement) et le crénelage
  de quelques bords (au plus 8/255, sur moins de 0,1 % de l'écran) : une
  couleur de fond, de bordure ou de texte qui change, même d'un ton, rend la
  capture « modifiée ». Les captures nuancées sont listées, avec leur nuance,
  dans « Ce qui a changé ».
- `apres/captures.json` ne contient **ni exception, ni débordement
  horizontal**. Sa section `comparaison` liste les captures modifiées et
  nuancées, les routes apparues ou disparues, les exceptions, débordements,
  textes coupés, contrôles hors écran et valeurs techniques nouveaux, et le
  nombre de termes interdits avant et après. Un relevé que l'avant ne
  mesurait pas encore vaut `null` (« non mesuré avant »), jamais zéro.
- Aucune alerte nouvelle : `comparaison.coupesNouvelles` (un texte rogné par
  sa boîte ou par le bord de l'écran, un texte d'exemple plus large que son
  champ), `comparaison.horsEcranNouveaux` (un bouton ou un lien rejeté hors de
  l'écran) et `comparaison.valeursNouvelles` (« undefined », « null », « NaN »,
  « [object Object] » à l'écran) sont vides. Sur les écrans touchés, celles qui
  existaient déjà sont corrigées, ou la PR dit pourquoi elles restent. Une
  liste à `null` (« non mesuré avant ») ne prouve rien : refaites l'avant.
- La comparaison se fait sur une passe complète. Avec `--routes`, elle ne porte
  que sur les routes filtrées, et la planche le dit.
- Joignez à la PR les captures des espaces touchés, aux trois largeurs.
- La base par défaut est la base fictive de la vitrine. Une passe sur une copie
  de la vraie base (`--base`, `--medias`) est recommandée pour voir le volume
  réel (`historique-processus-8`) : ses captures montrent des clients, elles
  restent sur le poste et ne sont **jamais** jointes à une PR.

## 3. La comparaison avec la planche cible est faite

Chaque espace a sa planche cible dans les planches de conception (dossier
`La-Barre-ImageGen`, hors dépôt) :

| Espace | Planche cible |
|---|---|
| Bureau, Projets | `01-bureau-projets.png` |
| Dossier | `02-dossier.png` |
| Décisions, pièce | `03-decisions-revue.png` |
| Planning, Bilan | `04-planning-bilan.png` |
| Ressources | `05-ressources.png` |
| Remise et page partagée, sur téléphone | `06-mobile-remise-partage.png` |

Avec `--cibles <dossier des planches>`, la planche-contact les montre en tête
de chaque espace. La PR dit, écran par écran, ce qui rejoint la cible et ce
qui s'en écarte encore.

## 4. Une personne du métier a relu, nommée et datée

Un DC, un DA, un CR, un chef de projet ou une personne de la production, selon
l'écran, regarde les captures et la cible. La PR l'écrit ainsi :

> Relu par <prénom>, <rôle>, le <date> : <ce qui a été regardé>, <son avis en une phrase>.

La relecture par un agent ou par l'auteur de la PR ne compte pas.

## 5. Une observation datée est citée

La PR cite au moins une observation des séances
([`observation/PROTOCOLE.md`](observation/PROTOCOLE.md)), par son identifiant
et un fait d'une phrase :

> `OBS-2026-12-03-S02-DC-2` : le participant a cherché le bouton de validation
> sous l'image pendant 40 s, puis a validé par WhatsApp.

Quand la PR change un geste, elle dit aussi ce qui a été mesuré sur des
personnes : le temps pour valider la bonne version, le taux de réussite sans
aide des tâches touchées, les hésitations, la note de désirabilité. Ces
chiffres viennent de la synthèse d'observation, pas d'une estimation.

Sans observation, la PR reste en brouillon, sauf dérogation écrite du
propriétaire du produit.

## 6. Aucun terme interdit

Aucun écran touché n'affiche de terme de tribunal ou de doctrine, ni d'emblée,
ni à un clic dans un bloc replié. La liste est dans
`outils/termes-interdits.mjs` : verdict, opposable, imputable, sans recours,
indéfendable, paragraphe, « § » suivi d'un numéro, « porte A/B/C » et son
compteur (« la porte 0 sur 1 »), « étage » partout où la doctrine l'emploie
(« étage 1 », « l'étage qui commence », « un étage reste à franchir », « une
école par étage » ; seuls « un étage de bureaux » et ses pareils passent),
« hors écart déclaré ». Elle s'enrichira du glossaire validé par l'agence ;
elle ne s'invente pas.

- `captures.json` relève ces termes capture par capture, en deux champs :
  - `termes` : le texte visible, et le texte d'exemple des champs vides ;
  - `termesReplies` : ce qui est à un geste, c'est-à-dire le contenu des blocs
    repliés (ouverts le temps de la lecture, refermés avant la photo) et les
    bulles d'aide.

  En tout : `resume.termesParMot` et `resume.termesRepliesParMot`. La planche
  montre les deux.
- Aucune PR n'ajoute d'occurrence : `comparaison.termes.apres` ne dépasse pas
  `comparaison.termes.avant`, ni `comparaison.termesReplies.apres`
  `comparaison.termesReplies.avant`. Ces nombres ne se comparent que si
  `comparaison.mesure.identique` vaut `true` : une liste de termes élargie
  change la version de la mesure, et l'avant se refait.
- Une fois la microcopie réécrite, la recette tourne avec `--strict`, qui
  échoue au premier terme, visible ou replié, et à la première valeur
  technique affichée.

Les clés de données (`verdict`, `approuve`, `reserve`, `retour`, `hors`) ne
changent pas : Radar les lit. Seul le texte affiché est en cause.

## 7. L'écart de lignes CSS est déclaré

```bash
git diff --numstat origin/main -- styles/
```

La PR donne les lignes ajoutées et retirées. Toute règle nouvelle retire celle
qu'elle remplace ; aucun `!important` n'est ajouté. Les feuilles restent à plat
(`styles/ecran-x.css`). Supprimer ou renommer une feuille casse le style des
liens déjà publiés : il faut alors republier les partages, et la PR le dit.

## 8. La compatibilité des données est expliquée

La PR dit ce qu'elle lit et écrit dans la base, et confirme :

- le schéma reste à 5, **aucune nouvelle collection racine** ; tout champ
  nouveau est imbriqué (livrable, version, personne, annotation) et facultatif,
  sans migration ;
- les clés lues par Radar (`verdict`, `qui`, `acteur`, et les valeurs
  `approuve`, `reserve`, `retour`, `hors`) sont inchangées ;
- toute adresse déplacée garde son ancienne adresse ;
- tout nouveau script est chargé par la forme exacte
  `<script src="app/x.js"></script>`, à plat dans `app/`, sans effet au
  chargement (ni réseau, ni minuterie, ni appel à l'application) ;
- le retour arrière : ce qu'il suffit de défaire, et ce que deviennent les
  données écrites entre-temps.

## Et toujours

- **Ce qui change pour vous.** La PR porte un paragraphe en mots simples, pour
  l'équipe, sur ce qui change à l'écran. Une PR qui touche la navigation met à
  jour le tableau « Les vues » du README (`historique-processus-13`).
- **Le relevé d'usage.** À chaque temps d'observation, un relevé
  `outils/usage-reel.mjs` sur une copie fraîche de la base, rangé hors du dépôt.
- **La fusion et la livraison.** Les PR sont ouvertes en brouillon. Aucune
  fusion ni livraison sans le feu vert explicite du propriétaire du produit ;
  la livraison passe seulement par les scripts de livraison, avec un commit
  dont la CI est reçue.
