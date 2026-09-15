# G · La doctrine — où chercher l'idée, et comment l'écrire

Les documents de formation de la maison. Ils ne décrivent pas Matanga : ils
décrivent le métier, et c'est ce qui les rend opposables — un désaccord sur une
piste se tranche en citant une page, pas une préférence.

**Ils sont la source du modèle de raisonnement du produit.** Les quatre couches
de l'insight, les douze écoles, les six structures de recommandation et
l'échelle de preuve viennent de là et de nulle part ailleurs. Quand un de ces
documents change, c'est le code qui doit suivre — voir « Ce que chaque document
gouverne » plus bas.

Statut : **courant** = fait autorité · **remplacé** = conservé pour l'historique,
ne plus diffuser.

---

## Les trois documents

| Fichier | Objet | Statut |
|---|---|---|
| `Ecoles_de_pensee_publicitaires_v4.pdf` | Douze écoles de la création et deux corpus d'efficacité. Où se trouve l'idée, quel effort chacune demande, **quelle preuve chacune attend**. Cas maison NSIA et AFG Bank, et le test des trois dossiers | **Courant** |
| `Insight_et_creation_v4.pdf` | Les quatre couches — consommateur, culture, catégorie, entreprise — et ce que chacune commande. Le test en trois questions, les cinq imposteurs, la forme en trois temps, les cinq sources sans budget | **Courant** |
| `Recommandation_creative_v5.pdf` | Six structures de deck, leurs squelettes, et la grille « qui décide dans la salle ». La règle maison de la slide d'arbitrage. Cas réel de l'anniversaire télécom | **Courant** |

Chacun est doublé d'un `.md` : le texte extrait, lisible et cherchable sans
lecteur PDF. **Le PDF fait foi** — la mise en page y porte du sens que le texte
seul ne rend pas, notamment les tableaux de synthèse.

### Remplacés

| Fichier | Ce qui a changé depuis |
|---|---|
| `remplaces/Ecoles_de_pensee_publicitaires_v1.pdf` | La v1 disait « ne pas mélanger les écoles ». La v4 corrige : **le mélange tient quand chaque école gouverne un étage différent**, et deux écoles au même étage ne se neutralisent que si leurs racines diffèrent. C'est une correction de fond, pas de forme |
| `remplaces/Insight_et_creation_v1.pptx` | La v4 ajoute les cas maison NSIA Tontines et AFG Bank — dont l'échelle de preuve quand aucun panel n'existe |
| `remplaces/Recommandation_creative_v1.pdf` | La v5 ajoute les fiches de piste par rôle, la règle maison de la slide d'arbitrage, le cas de l'anniversaire télécom, et « et si ce n'était pas un deck » |

---

## Ce que chaque document gouverne dans le code

Le lien est direct et il faut qu'il le reste : changer un document sans changer
le module laisse le produit enseigner l'inverse de la maison.

| Document | Module | Ce qui en vient |
|---|---|---|
| Insight et création | `app/insight.js` | les 4 couches et ce qu'elles commandent · le test en 3 questions · les 5 imposteurs · les 5 sources et le croisement à 3 · la forme en 3 temps · les 3 passes |
| Insight et création | `app/regles.js` | `decalage-de-couche`, et le fait qu'il se ferme par l'écrit |
| Insight et création | `app/modele-champs.js` | la section `briefback` et ses trois lignes |
| Les écoles | `app/ecoles.js` | les 12 écoles et les 2 corpus · la preuve attendue de chacune · les 3 étages |
| Les écoles | `app/territoire.js` | la convention et ses 3 visuels · le chemin de réduction |
| Les écoles | `app/efficacite.js` | l'échelle de preuve à 4 niveaux · le 60/40 et sa réserve · la grille de Sharp · l'ESOV |
| La recommandation | `app/reco.js` | les 6 structures et leurs squelettes · la grille « qui décide dans la salle » · les 3 rôles de piste · la slide d'arbitrage |
| La recommandation | `app/presentation-modele.js` | les types de page que les squelettes appellent |

---

## Ce qui est en dur, et qui ne devrait peut-être pas l'être

À dire franchement, parce que ça se paiera le jour où une deuxième agence
s'installe sur le produit — ou le jour où la maison change d'avis.

La règle du produit est : **le métier en code, la maison en configuration.** La
doctrine elle-même est du métier universel : une agence d'Accra a les mêmes
douze écoles. Elle est donc légitimement dans les modules.

Mais **la calibration de la maison** y est aussi, et elle n'a rien à y faire :

- trois sources croisées pour qu'un insight soit défendable (`INSIGHT.CROISEMENT`)
- trois visuels de concurrents pour qu'une convention soit prouvée (`TERRITOIRE.PREUVES_CONVENTION`)
- 60 / 40 comme référence de répartition (`EFFICACITE.CIBLE_MARQUE`)
- les seuils d'appariement de fichiers (`SEUIL`, `MARGE` dans `image.js`)
- les mots-clés qui font lire la salle (`RECO.SALLES`)

Ce sont des choix de maison écrits dans du code de métier. Tant qu'il n'y a
qu'une maison, ça ne coûte rien. Le jour où il y en a deux, il faudra les sortir
vers `maison.js`.

---

## Ce que le produit ne sait pas encore faire

Aucun écran ne lit ce dossier. `sources/` porte quarante-sept fichiers et
l'application n'en ouvre aucun : la doctrine est consultable sur le disque, pas
depuis l'outil qui l'applique. Quand un contrôle dit « la convention n'est pas
montrée », il ne peut pas encore renvoyer à la page qui explique pourquoi.
