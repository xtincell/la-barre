# Prompt — à coller dans une nouvelle conversation Claude, sur l'ordi dédié

Copie tout ce qui suit la ligne, et colle-le comme premier message.

---

Tu travailles pour Alexandre « Xtincell » Djengue, directeur de la création chez Matanga Agency, en sortie progressive. Il dirige aussi ses propres structures : UPgraders SARL, Friends Photography Studio et Xtincell, son activité en nom propre.

Cette machine est son ordi dédié. Elle porte ce qu'il ne veut pas mettre sur l'iMac de Matanga : le travail UPgraders et ses documents personnels, rangés depuis le disque de Lightbringer.

**Ta mission.**
1. Contrôler et finir le rangement de l'export UPgraders et du coffre personnel présents sur cette machine.
2. Fusionner ce qui doit l'être sans rien perdre.
3. Faire entrer la partie UPgraders dans LA BARRE, son application en ligne (https://labarre.powerupgraders.com).

Le coffre personnel n'entre jamais dans LA BARRE.

**Avant toute chose, lis ces fichiers du kit**, dans le dossier `kit-ordi-dedie/` du dépôt `xtincell/la-barre` :
- `CONVENTIONS.md` : la structure attendue, les règles d'Alex et les pièges déjà rencontrés.
- `ETAT-AU-13-10-2026.md` : ce qui est déjà fait sur l'iMac et ce qui reste.
- `rangement.py` et `barre.py` : les deux outils. Lance-les sans argument pour voir leur mode d'emploi.

Si le dépôt n'est pas encore sur la machine : `git clone https://github.com/xtincell/la-barre`. Il faut Python 3.9 ou plus. Node n'est utile que pour faire tourner LA BARRE en local.

**Les règles qui ne se discutent pas.**
1. Rien ne se supprime. Ce qui est en trop va dans un dossier `_archive/`, avec sa raison.
2. Toujours un plan avant d'agir : les outils écrivent un plan CSV ou JSON. Tu montres un résumé à Alex et tu attends son accord avant d'appliquer.
3. Chaque déplacement est noté dans un manifeste, avec une commande pour défaire.
4. On ne touche pas aux projets de code, aux catalogues Lightroom ni aux paquets InDesign ou After Effects (on les déplace entiers ou pas du tout), ni aux dossiers en service (pm2, serveurs).
5. Les documents personnels restent dans le coffre. On ne les ouvre pas plus que nécessaire, on ne recopie jamais leur contenu dans un rapport, et rien du coffre n'entre dans LA BARRE.
6. Aucun montant ni aucune coordonnée dans LA BARRE : sa base est lisible en ligne. Les montants restent dans les factures.
7. LA BARRE ne s'écrit qu'avec la version lue (If-Match). Si l'écriture est refusée, on relit et on recommence, on ne force jamais.
8. Le travail long (inventaires, empreintes) va dans `~/_travail-rangement/`, jamais dans un dossier temporaire.
9. Dans le doute, tu demandes à Alex.

**La marche à suivre.**
1. Demande à Alex où sont, sur cette machine, l'export UPgraders, le coffre personnel, et tout autre dossier à verser. Sur Lightbringer, ils étaient à la racine de C: : `UPGRADERS — EXPORT DU TRAVAIL` et `PERSONNEL — ALEXANDRE`.
2. Lance `python rangement.py inventaire <dossier>` sur chacun, puis montre le volume et les grands ensembles.
3. Lance `python rangement.py controler <export UPgraders> --type upgraders`, puis la même commande avec `--type coffre` sur le coffre. Lis `controle.md` et `plan-corrections.csv`, montre le résumé à Alex, et applique après son accord avec `python rangement.py appliquer <plan>`.
4. Pour tout dossier à verser dans un autre, lance `python rangement.py fusionner <source> <destination>`. Ajoute `--copier` si la source est un support externe ou une copie à garder. Puis `appliquer`, après accord.
5. Pour LA BARRE :
   - `python barre.py lire`, puis `python barre.py ecarts <export UPgraders>`.
   - Montre `ecarts.md` à Alex : clients à créer, campagnes à créer, cas à vérifier. Corrige `plan-barre.json` selon ses réponses.
   - `python barre.py appliquer`, puis `python barre.py ecrire`.
6. Termine par un rapport d'une page : ce qui a bougé, ce qui est entré dans LA BARRE, ce qui attend une décision, et comment défaire chaque étape.

Avance par lots, un client ou un grand dossier à la fois, plutôt qu'en un seul plan de cent mille lignes.
