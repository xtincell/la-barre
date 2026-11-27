<!--
Cette PR reste en brouillon tant que la définition de « fini » n'est pas
remplie : documents/FINI.md. Aucune fusion ni livraison sans le feu vert
explicite du propriétaire du produit.
-->

## Ce qui change pour vous

<!-- En mots simples, pour l'équipe : ce qui change à l'écran et dans les gestes. -->

## Observation datée citée

<!-- Au moins une observation des séances (documents/observation/PROTOCOLE.md),
par son identifiant et un fait d'une phrase, sans nom ni dossier client.
Exemple : `OBS-2026-12-03-S02-DC-2` : le participant a cherché le bouton de
validation sous l'image pendant 40 s, puis a validé par WhatsApp.
Si le geste change : temps, réussite sans aide, hésitations, désirabilité. -->

- 

## Constats couverts

<!-- Identifiants de l'audit docs/audits/2026-11-26-adoption.md, par exemple
fond-langage-1, friction-parcours-5. -->

- 

## Captures avant et après

<!-- outils/recette-captures.mjs --avant sur la branche de base du lot (main,
ou adoption/00-mesurer tant que ce lot n'est pas fusionné), puis --apres sur
la branche, avec la même version de l'outil (documents/FINI.md, section 2),
à 320, 390 et 1440 px, page entière (le réglage par défaut). Recopier
« Écrans touchés » de la planche, avec ses précisions (sous le premier écran,
la page change de hauteur, texte seulement). Joindre les captures des
espaces touchés ; jamais celles d'une vraie base. -->

- Commande, horloge et commit de la passe avant : 
- Espaces touchés : 
- `captures.json` : version de la mesure identique (`comparaison.mesure.identique`) · exceptions 0 · débordements 0 · termes interdits avant → après :

| Espace | 320 | 390 | 1440 |
|---|---|---|---|
| | | | |

## Comparaison avec la planche cible

<!-- Écran par écran : ce qui rejoint la planche cible (01 à 06), ce qui s'en
écarte encore, et pourquoi. -->

## Relecture humaine

<!-- Une personne du métier, ni l'auteur ni un agent :
Relu par <prénom>, <rôle>, le <date> : <ce qui a été regardé>, <son avis>. -->

- 

## Données touchées et compatibilité

- [ ] Schéma 5 inchangé, aucune nouvelle collection racine ; champs nouveaux imbriqués et facultatifs
- [ ] Clés lues par Radar inchangées (`verdict`, `qui`, `acteur` ; `approuve`, `reserve`, `retour`, `hors`)
- [ ] Anciennes adresses conservées
- [ ] Nouveau script au format exact `<script src="app/x.js"></script>`, à plat, sans effet au chargement
- [ ] Feuilles CSS : lignes ajoutées / retirées (`git diff --numstat origin/main -- styles/`) : 
- [ ] Aucune feuille supprimée ou renommée, ou partages republiés
- [ ] README à jour si la navigation change

<!-- Ce que la PR lit et écrit dans la base. -->

## Tests

- [ ] `node --check` sur `servir.mjs` et `app/*.js`
- [ ] `test:persistance`, `test:manuel`, `test:marches`, `test:provenances`, `test:decisions`, `test:bilan`, `test:radar`, `test:vitrine`, `test:recette`
- [ ] `bilan-delai`, `ecarts`, `registre-radar`, `approches`, `entreprise`
- [ ] `vitrine-base --check`, `distribuer-approches --check`
- [ ] `npm test` (parcours dans le navigateur)
- [ ] Libellés renommés : assertions mises à jour dans le même commit

## Retour arrière

<!-- Ce qu'il suffit de défaire, et ce que deviennent les données écrites entre-temps. -->
