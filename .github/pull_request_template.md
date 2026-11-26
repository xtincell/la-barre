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

<!-- outils/recette-captures.mjs --avant (sur main) puis --apres (sur la
branche), à 320, 390 et 1440 px, de tous les espaces touchés. Joindre les
captures des espaces touchés ; jamais celles d'une vraie base. -->

- Commande et horloge : 
- Espaces touchés : 
- `captures.json` : exceptions 0 · débordements 0 · termes interdits avant → après :

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
