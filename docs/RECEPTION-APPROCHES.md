# Approches : du projet à la proposition

Le générateur conserve sa méthode et sa valeur autonome. Son code canonique
vit dans `xtincell/generateur-approches`. Les trois fichiers sous
`app/ateliers/approches/` sont des exemplaires de distribution produits depuis
un commit explicite ; ils ne sont pas une seconde source à modifier.

```sh
node outils/distribuer-approches.mjs /chemin/du/depot/generateur-approches <commit-complet>
node outils/distribuer-approches.mjs --check
node --test tests/approches.test.mjs
```

Depuis les pistes d’un projet, « Explorer des approches » fournit les champs
présents du brief. Les absences restent vides. L’ouverture passe par le fragment
local de l’URL, sans requête à un fournisseur ni copie du dépôt entier. Le
contexte porte le dossier, le projet et l’empreinte des entrées utilisées. Les
brouillons sont séparés par dossier et projet dans le stockage du navigateur.

« Recevoir une approche » relit le JSON exporté, vérifie le contexte et la
version, présente les pistes, puis reçoit seulement celle choisie. Une entrée
est créée dans les pistes existantes, au statut `proposee`, avec son tirage
original et la saisie attribuée à l’acteur courant. Aucun auteur créatif n’est
inventé. Le ton, le sacrifice, les arguments et l’arbitrage restent à produire ;
la compatibilité des catégories n’est pas une validation du client.

Une réception identique retrouve la même piste, même après modification du
brief. Une nouvelle réception issue d’un autre dossier ou d’un brief périmé
échoue avant écriture. Le contrôle est répété après la prévisualisation et
l’admission du même tirage est protégée contre deux clics concurrents. Le dépôt,
son journal, sa sauvegarde et sa réconciliation restent les seules autorités.
Un refus d’écriture serveur laisse la proposition locale et affiche l’absence
de confirmation ; il ne prétend pas que le serveur l’a reçue.

Le raccord ne confère aucun droit de réutilisation commerciale aux éléments
du brief et ne fait aucune sélection créative ou approbation à la place de son
responsable. La qualification native et la livraison sont suivies par reçus
datés, séparément des contrôles de code.
