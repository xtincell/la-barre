# La vitrine publique — du brief au BAT, sur données fictives

La vitrine (LB6 au plan de Shinkiro) montre La Barre sans ouvrir l'outil réel.
Elle tient en deux pages :

- `vitrine/index.html` raconte le parcours du brief au BAT, étape par étape,
  et chaque étape ouvre l'écran correspondant de la démonstration ;
- `vitrine/demo/index.html` est l'application elle-même — les mêmes scripts et
  les mêmes feuilles que `index.html`, dans le même ordre — en mode
  démonstration, sur une base fictive.

La marque (Orvelle), son client, ses personnes, ses campagnes, ses relevés et
ses chiffres sont inventés. Chaque écran le dit : un ruban en tête de la
vitrine et de chaque écran de la démonstration, une mention dans le rail, et
« DÉMONSTRATION — DONNÉES FICTIVES » dans chaque visuel.

## Ce que montre la démonstration

Le dossier « Orvelle Zeste — lancement » (ORV-2027-01) suit un lancement sur
trois marchés : brief accepté et brief-back écrit, plateforme de marque et big
idea validées, idée d'atelier retenue, trois pistes arbitrées par écrit, KV
master revenu en V1 puis approuvé en V2, adaptations par marché, formats, un
BAT signé et un BAT sans signataire. La campagne précédente, close, porte son
bilan arrêté (version figée, empreinte) que cite le brief.

Au cadrage, chaque marché a déclaré son écart : la Côte d'Ivoire aucun, le
Sénégal le réglementaire, le Ghana le produit. L'adaptation du Ghana a traduit
la titraille : elle sort de son écart déclaré, sur la langue. Elle n'est pas
bloquée ; le signal « hors écart déclaré » est à trancher par le visiteur,
depuis Décisions → À traiter, la grille des livrables, la planche des KV ou le
panneau de revue (voir le README, « Une adaptation hors de son écart
déclaré »).

## Ce qui isole la démonstration des données réelles

La page de démonstration déclare `window.LA_BARRE_DEMO`
(`vitrine/demo/demonstration.js`) avant tout module. Le dépôt (`app/depot.js`)
le lit à son chargement et, dans ce mode :

- ne lit pas le cache du navigateur (`localStorage`, clé `la-barre`) et n'y
  écrit rien — servie à la même origine que l'outil, la démonstration ne voit
  ni ne touche la base de ce navigateur ;
- ne cherche aucun manifeste (`depots/manifeste.json`), ne lit ni n'écrit aucun
  dépôt servi, ne garde aucun brouillon de reprise (IndexedDB) ;
- tient sa base en mémoire : recharger la page la remet à zéro.

La coque (`app/application.js`) ne charge que la base fictive, un fichier JSON
au nom simple posé à côté de la page (`base-fictive.json`) : elle ne peut
désigner ni un dépôt, ni un fichier ailleurs. Le contexte de La Fusée
(`contexte.json`) n'est pas demandé ; l'envoi de médias et la publication de
documents sont refusés ; les filtres de la liste des projets et de la galerie
restent en mémoire. La page charge le profil d'une agence fictive
(`vitrine/demo/maison.js`) et une amorce vide (`vitrine/demo/amorce.js`) : ni
`app/maison.js` ni `app/amorce.js`, qui nomment l'installation historique.

`tests/vitrine.test.mjs` vérifie ces garanties, ainsi que la base : rejouée par
les modules, sans aucun nom de l'installation historique, chaque décision
admise par la fabrique, un seul signal « hors écart déclaré ».

## La base fictive

`vitrine/demo/base-fictive.json` n'est pas écrite à la main.
`outils/vitrine-base.mjs` la rejoue avec les vrais modules (dépôt, fabrique de
décision, KV, écarts de marché, production, campagne, clôture), une horloge
et un hasard figés. Après un changement de ces modules :

```bash
node outils/vitrine-base.mjs          # réécrit la base
node outils/vitrine-base.mjs --check  # ce que fait la CI
```

## Voir la vitrine en local

```bash
node servir.mjs 5173
```

puis `http://localhost:5173/vitrine/index.html`. `servir.mjs` ne sert pas
d'index de dossier : l'adresse nomme `index.html`. Ce serveur sert tout le
dossier du dépôt, sans authentification : il ne sert qu'en local, jamais pour
publier la vitrine.

## Publier la vitrine

On ne publie pas le dépôt : on publie une distribution statique, extraite d'un
commit.

```bash
node outils/distribuer-vitrine.mjs ../barre-vitrine "$(git rev-parse HEAD)"
node outils/distribuer-vitrine.mjs --verifier ../barre-vitrine
```

Le dossier produit contient `vitrine/`, `app/` sans `app/maison.js` ni
`app/amorce.js`, `styles/`, `LICENSE`, un `index.html` racine qui renvoie vers
`vitrine/index.html`, et `distribution.json` (commit et empreinte de chaque
fichier). Il ne contient ni `servir.mjs`, ni `depots/`, ni `assets/`, ni
`sources/`, `documents/`, `extraits/`, `kit-ordi-dedie/`, `outils/`, `profils/`
ou `tests/`. Le vérificateur refuse un fichier non listé, un fichier appelé par
une des deux pages et absent, ou un marqueur de l'installation historique dans
`vitrine/`.

Tout hébergement de fichiers statiques convient : il sert les fichiers tels
quels, en lecture seule, avec les bons types (`.svg` en `image/svg+xml`,
`.json`, `.woff2`). La démonstration n'envoie aucune requête d'écriture ; elle
ne lit que ses propres fichiers.

### En production

Publiée le 12 novembre 2026 sur une origine distincte de l'outil :
**https://la-barre-vitrine.powerupgraders.com**, en HTTPS.

- La distribution est extraite du commit `adf4540` et vérifiée par
  `--verifier` (155 fichiers, exacte).
- Elle est poussée seule sur la branche `vitrine-distribution` : un commit
  par publication, aucun développement sur cette branche.
- Une application statique Coolify (nginx) sert cette branche, et elle seule.
  Les fichiers du dépôt qui ne sont pas distribués (`servir.mjs`, `depots/`…)
  répondent 404.
- La vitrine et la démonstration chargent dans Chromium sans erreur ni
  requête en échec.

**Republier** après une nouvelle version :

```bash
node outils/distribuer-vitrine.mjs ../barre-vitrine "$(git rev-parse origin/main)"
node outils/distribuer-vitrine.mjs --verifier ../barre-vitrine
```

Puis remplacer le contenu de la branche `vitrine-distribution` par ce
dossier, en un commit qui nomme le commit source, et redéployer
l'application Coolify `la-barre-vitrine`.

### Ce qui reste ouvert

1. ~~**Choisir l'hébergement et l'adresse.**~~ Fait : origine distincte,
   ci-dessus.
2. **Ou une route publique de La Fusée.** Si la vitrine doit vivre sous
   `/la-barre/vitrine/`, La Fusée doit servir ce seul préfixe sans session, en
   `GET` et `HEAD`, **depuis la distribution statique** — jamais en relayant le
   conteneur de La Barre, qui sert tout son dossier sans authentification. Les
   pages appellent `../styles/`, `../../app/` et `../../styles/` : la
   distribution doit donc être servie à une racine qui contient `vitrine/`,
   `app/` et `styles/` côte à côte.
3. **HTTPS.** Clore un bilan de campagne dans la démonstration demande
   `crypto.subtle`, que le navigateur réserve aux connexions sécurisées. Fait :
   l'adresse publiée est en HTTPS.
4. **Décider de ce qui part avec `app/`.** Les commentaires du code nomment
   des clients de l'installation historique. Le dépôt étant public, la
   distribution n'en divulgue pas davantage ; aucun nom de l'installation
   historique ne s'affiche dans la démonstration.
5. **Republier à chaque version.** La distribution porte son commit ; une
   nouvelle version de l'application demande une nouvelle distribution. Ce
   geste est manuel : aucune automatisation ne republie la vitrine.

## Limites

- La démonstration ne publie aucun document, ne génère aucun PDF et n'accepte
  aucun fichier : ces gestes répondent par un refus qui le dit.
- Elle ne montre aucune mesure d'impact : les relevés et chiffres de la base
  sont fictifs, et la vitrine ne revendique ni gain de temps, ni taux
  d'adoption, ni résultat commercial.
- Deux contrôles du dossier restent ouverts, comme sur un vrai dossier : le
  territoire n'ouvre qu'un concept, et le manifeste de remise des pièces
  approuvées n'est pas complet.
