# LA BARRE — RECONCEPTION

Ce document ne décrit pas des écrans. Il décrit **comment le produit pense le travail**.
Les écrans en sont la conséquence, et se jugent à cette aune.

---

## PASSE 1 — LE MODÈLE MENTAL

### Le rôle

Un directeur de la création n'administre pas un système. Il **arbitre**. Sa journée n'est
pas faite d'objets à gérer mais de décisions à rendre — et le coût de son poste, c'est le
temps pendant lequel une décision n'est pas rendue.

### Les six décisions, et rien d'autre

| Décision | La question | Ce qu'elle coûte quand elle traîne |
|---|---|---|
| **Trancher** | J'accepte, je renvoie, ou je refuse sur critère ? | l'équipe attend, le client aussi |
| **Arbitrer** | Quelle route, quelle idée, qui a raison ? | on fabrique sans savoir quel concept fait autorité |
| **Placer** | Qui le fait, en combien de jours, pour quand ? | la pièce est invisible dans la charge, le mur arrive sans prévenir |
| **Réclamer** | Qu'est-ce qu'on me doit, et depuis quand ? | le retard des autres devient le mien |
| **Engager** | Est-ce que ça peut partir ? | on présente une intention, ou on produit sans accord |
| **Constater** | Est-ce que ma décision a produit l'effet attendu ? | on refait les mêmes arbitrages tous les trimestres |

**Tout le reste — projets, livrables, KV, pistes, marchés, assets — est de la matière, pas
de l'architecture.** Ce sont les objets sur lesquels ces six décisions portent.

### Le conflit avec l'architecture existante

L'architecture actuelle est une carte du système, pas du travail. Elle a été construite
comme le décrit la première loi : *le système possède des objets, donc on crée des écrans
pour chaque objet ; les objets ont des états, donc on ajoute des onglets ; les états ont
des statuts, donc on ajoute des badges.* C'est exactement ce qui s'est passé.

**Le test des catégories concurrentes, appliqué honnêtement :**

| Question posée à quelqu'un qui découvre le produit | Destinations possibles aujourd'hui |
|---|---|
| Où vais-je pour voir ce qui demande mon intervention ? | Maintenant · Revue · Mes attentes · Pipeline — **4** |
| Où vais-je pour juger un KV ? | Revue · Projet › Planche · Projet › Livrables · Pipeline — **4** |
| Où vois-je un retour client ? | Mes attentes · Pipeline › Les retours · la pièce — **3** |
| Où vois-je ce qui bloque un dossier ? | Maintenant · le rail du projet · Pipeline — **3** |

Quatre destinations pour une intention, c'est une architecture défaillante par son propre
test. Le diagnostic est sévère et il est juste.

**La cause :** j'ai créé une destination à chaque fois qu'un besoin apparaissait, au lieu
de reconnaître qu'il s'agissait de la même intention vue sous un autre angle. *Revue* et
*Mes attentes* ne sont pas des lieux : ce sont deux modes de **trancher** et **réclamer**.
*Pipeline* n'est pas un lieu : c'est le mode collectif de **placer**.

---

## PASSE 2 — L'ARCHITECTURE CIBLE

### Quatre destinations, une intention chacune

```
DÉCIDER        tout ce qui attend une décision de moi, quel que soit l'objet
               modes : la file · une pièce à la fois · ce qu'on me doit

PLACER         qui fait quoi, dans quel ordre, avec quelle capacité
               modes : l'ordre · la charge · les personnes

LES DOSSIERS   où en est chaque chose — contexte, preuve, historique
               un dossier : cadrer › concevoir › produire

LA MAISON      référentiel, règles, dépôt, équipe
```

**Ce qui disparaît comme destination :** Maintenant, Revue, Mes attentes, Pipeline, Mes
briefs. Aucune fonction n'est perdue — elles deviennent des **modes** à l'intérieur de
Décider et de Placer. Un mode n'est pas une catégorie : on n'a pas à choisir avant
d'arriver.

**Ce que ça règle :** les quatre questions ci-dessus n'ont plus qu'une réponse chacune.
*« Ce qui demande mon intervention »* → Décider. *« Juger un KV »* → Décider. *« Un retour
client »* → Décider. *« Ce qui bloque un dossier »* → le dossier.

### La règle qui remplace la classification

> **L'utilisateur exprime une intention. Le système trouve la donnée.**

On n'ouvre pas *Revue* parce qu'on a affaire à un livrable, ni *Attentes* parce qu'il
s'agit d'un renvoi. On ouvre **Décider**, et le produit présente ce qui attend — trié par
ce que ça coûte d'attendre, pas par le type de l'objet.

### Les cinq couches

Aucun écran ne présente les cinq simultanément.

| Couche | Contenu | Où elle vit |
|---|---|---|
| 1 · **Décision** | ce qui demande l'attention | l'écran lui-même |
| 2 · **Contexte** | pourquoi ça existe | sous la décision, en une ligne |
| 3 · **Preuve** | de quoi vérifier | à l'ouverture de l'objet |
| 4 · **Historique** | comment on en est arrivé là | onglet, jamais en premier |
| 5 · **Système** | métadonnées, règles, relations | La maison |

### Le contrat d'un objet affiché

Toute chose montrée doit répondre à quatre questions, dans cet ordre :

```
ÉTAT           « Adaptation ZA · V1 »
CONSÉQUENCE    « le marché parle anglais, le KV est en français »
COÛT           « rien ne peut partir en production sud-africaine »
PROCHAIN GESTE « Régler la langue »
```

Un état sans conséquence est une information — elle recule. Un objet sans prochain geste
n'a rien à faire dans une vue de décision.

---

## PASSE 2 bis — LA MATRICE D'AUDIT

Les dix-huit écrans passés au test. `⚑` = à reconcevoir, `→` = devient un mode,
`✓` = tient.

| Écran | Pourquoi il existe | Décision permise | Action principale | Verdict |
|---|---|---|---|---|
| Maintenant | par quoi je commence | les six | ouvrir le bon endroit | → **devient Décider** |
| Revue | juger une pièce | trancher | rendre un verdict | → mode de Décider |
| Mes attentes | ce qu'on me doit | réclamer | renvoyer | → mode de Décider |
| Mes briefs | où en est l'entrée | trancher, engager | traiter l'étape suivante | → mode de Décider |
| Pipeline · L'ordre | sur quoi je mets mes gens | placer | réordonner | → **devient Placer** |
| Pipeline · La charge | où en sont les pièces | placer | affecter | → mode de Placer |
| Pipeline · Les retours | qui a bousculé quoi | trancher | trancher un retour | → mode de Décider |
| Pipeline · Qui bouscule | ce que ça coûte | constater | négocier | → mode de Placer |
| Projets (liste) | choisir un dossier | — | ouvrir | ⚑ fusionne dans Les dossiers |
| Projet 360 | où en est ce dossier | constater | ouvrir un temps | ✓ tient — trois temps |
| Brief · Socle · Stratégie | cadrer | trancher, engager | valider, compléter | ✓ tiennent |
| Atelier | recueillir les idées | arbitrer | retenir une idée | ✓ tient |
| Big idea | comparer les routes | arbitrer | retenir une route | ✓ tient |
| Routes créatives | une route en entier | arbitrer, engager | retenir, ouvrir la production | ✓ tient |
| Planche des KV | les KV par marché | trancher | régler un écart | ✓ tient |
| Livrables | ce qu'il reste à produire | placer | affecter | ⚑ doublonne avec Placer |
| Présentation | ce qui part au client | engager | présenter | ✓ tient |
| Référentiel · Réglages | le système | — | renseigner | ✓ tiennent — couche 5 |

**Trois constats.**

Les écrans **à l'intérieur d'un dossier tiennent** : ils portent chacun une question, un
coût, et un à trois gestes. C'est la partie du produit qui a été conçue dans le bon ordre.

Les écrans **transversaux ne tiennent pas** : cinq destinations pour deux intentions.
C'est là que la reconstruction porte.

**Livrables** doublonne : la même liste sert à placer (dans Pipeline) et à consulter (dans
le dossier). Elle doit rester dans le dossier comme **preuve**, et disparaître comme lieu
de placement.

---

## PASSE 3 — LE SYSTÈME D'INTERACTION

### Ce qui est déjà en place et doit être généralisé

La bande de recevabilité — *une question, des contrôles en ✓/✕, la conséquence la plus
lourde, un à trois gestes* — est le bon patron. Elle applique déjà état + conséquence +
action. Elle existe sur onze écrans ; elle doit exister sur tous ceux qui demandent une
décision, et sur aucun de ceux qui n'en demandent pas.

### Ce qui manque

**~~Les statuts nus subsistent.~~ Traité — livraison 2.** « en lice », « brouillon »,
« junior », « en cumul » nommaient une case de base de données. Ils sont désormais écrits
par un seul module, `app/etats.js`, sous la forme *état + conséquence* :

| Avant | Maintenant |
|---|---|
| « en lice » | « en lice — 6 pièces se fabriquent sans savoir laquelle fait autorité » |
| « brouillon » | « brouillon — le DA ne l'a pas reçue, rien ne part, et rien ne court » |
| « écartée » | « écartée — le motif est écrit, elle ne consomme plus de ressource » |
| « junior » | « junior — chaque idée retenue de sa part fait bouger un indicateur de ma fiche » |
| « en cumul » | « en cumul — sans date de revue, il deviendra un poste non écrit par simple durée » |
| « en retard » | « en retard — les 3 phases suivantes glissent d'autant » |

Deux rendus, un seul modèle : `ETAT.ligne()` écrit la conséquence en toutes lettres — le
rendu par défaut — et `ETAT.pastille()` réduit à la pastille avec la conséquence au
survol, réservée aux places réellement serrées, une case de matrice ou une ligne dense.
La règle est la même que pour les composants : **un seul endroit les écrit**, sinon chaque
écran réinvente son vocabulaire et rien n'est comparable d'un mois sur l'autre.

**Le silence n'est pas réglé.** Dix-huit compteurs s'affichent en permanence dans le rail.
Si tout attire l'attention, rien n'attire l'attention. Un compteur ne doit apparaître que
s'il appelle une action **aujourd'hui**.

**Les métriques décoratives.** Cinq objectifs affichés dont quatre non calculables, qui
montrent « ? ». Une métrique qui ne provoque aucune décision n'a rien à faire au premier
plan : elle appartient à *constater*, pas à *décider*.

**~~La décoration structurelle.~~ Traité — livraison 3.** Trente-trois règles portaient à
la fois un fond distinct et une bordure grise pleine : deux dispositifs pour un seul
travail. La bordure est tombée partout où le fond suffisait ; elle reste là où elle répond
à une question — l'affordance d'un bouton ou d'un champ, un filet coloré qui porte un
état, la grille d'un tableau, l'arête d'une surface flottante. Dix-huit cibles cliquables
ont donc gardé la leur, et les tuiles d'indicateur ont perdu le cadre gris tout en gardant
le filet d'état, qui porte maintenant seul le signal.

**Et une règle nouvelle, née de la fin de mois : le zéro sans assise.** Une mesure qui vaut
zéro parce que rien ne s'est passé et une mesure qui vaut zéro parce que rien n'est
enregistré ne se lisent pas pareil. La première est un résultat, la seconde est un registre
vide — et affichée « 0 % », elle se lit comme un mois calme. Chaque mesure porte donc son
assise, et quand celle-ci est nulle elle n'affiche pas de chiffre : elle dit ce qu'il
faudrait enregistrer pour qu'elle existe. Même règle pour un bloc vide, qui dit désormais
si son vide est un oubli ou une bonne nouvelle.

---

## PASSE 4 — L'EXPRESSION VISUELLE

L'échelle d'information a été posée : six tailles, mesure plafonnée à 72 caractères,
conteneur à 1180 px, aucun écran verrouillé à la hauteur du viewport. Cette partie tient.

**Ce qui reste :** la décoration qui imite la structure. L'interface est une mosaïque de
cartes bordées — chaque groupe reçoit une boîte, un filet, un titre et une pastille. La
structure doit passer par l'espace, l'alignement et le contraste ; une boîte ne se
justifie que par une distinction fonctionnelle réelle.

Règle : **une bordure doit répondre à une question.** Si elle ne sépare rien qu'un blanc
ne séparerait mieux, elle disparaît.

---

## L'ORDRE DE RECONSTRUCTION

| | Ce qui change | État |
|---|---|---|
| **1** | La navigation : quatre intentions au lieu de huit destinations | **fait** |
| **2** | Décider absorbe Revue, Attentes, Briefs et les retours | **fait** |
| **3** | Placer absorbe Pipeline et les ressources | **fait** |
| **4** | **Constater** : la cinquième intention, et les deux orphelins retrouvés | **fait** |
| **5** | Le silence : un compteur n'apparaît que s'il appelle une action | **fait** |
| **6** | Les métriques passent de *décider* à *constater* | **fait** |
| **7** | Les statuts nus deviennent état + conséquence | **fait** |
| **8** | La décoration structurelle : moins de boîtes, plus d'espace | **fait** |

---

## LA CORRECTION — CE QUE LA PREMIÈRE PASSE AVAIT MANQUÉ

La restructuration en quatre intentions était juste sur son diagnostic et fausse sur son
compte. Le modèle mental ci-dessus nomme **six** décisions — trancher, arbitrer, placer,
réclamer, engager, **constater**. Les quatre intentions n'en couvraient que cinq.

*Constater* n'avait aucun lieu. Ce n'était pas un oubli d'implémentation : deux écrans
sont devenus inatteignables parce qu'ils n'avaient nulle part où aller.

| Devenu orphelin | Ce qu'il portait | Où il est maintenant |
|---|---|---|
| `vue-briefs.js` | les quatre indicateurs de la fiche 03 | Constater › Mon standard |
| `vue-pipeline.js` mode `auteurs` | qui bouscule le pipeline, et ce que ça coûte | Constater › Qui bouscule |

**Et la même cause expliquait un manque ancien.** Mon équipe, Ma fin de mois, la
jurisprudence — tout le lot « Encadrer » — n'a jamais été construit parce qu'il n'avait
pas de lieu. Il en a un désormais.

### Ce que la correction a aussi permis de nettoyer

`vue-pipeline` perd son mode « les retours » : il disait la même chose que les
modifications dues dans Décider. Deux vérités sur le même fait, c'est une de trop.

`vue-briefs` cesse d'être un écran et devient `chaine-brief.js` — un modèle. La chaîne de
traitement se lit déjà à deux endroits qui existent : le navigateur à trois temps d'un
dossier, et la file de Décider. Un module nommé `vue-` qui n'est pas une vue est un piège
pour la prochaine passe.

`vue-direction` perd sa bande d'objectifs. Cinq métriques dont trois affichaient « pas
encore mesurable », dans un écran de décision : un taux de reprise ne se corrige pas en le
regardant. Elles regardent le mois, elles vivent dans Constater.

### L'architecture, corrigée

| Intention | La question | Ses modes |
|---|---|---|
| **Décider** | qu'est-ce qui attend une décision de moi ? | la file · une à une · ce qu'on me doit |
| **Placer** | qui fait quoi, dans quel ordre ? | l'ordre · la charge · les gens |
| **Constater** | mes décisions produisent-elles l'effet attendu ? | mon standard · qui bouscule · mon équipe · ma fin de mois · la jurisprudence |
| **Les dossiers** | où en est chaque chose ? | cadrer › concevoir › produire |
| **La maison** | — | le référentiel · les réglages |

Cinq reste peu, et chaque question a une seule réponse. Les horizons sont distincts :
Décider et Placer regardent aujourd'hui, Constater regarde le mois.

---

## LA PASSE FINALE — LE CONTRAT, VÉRIFIÉ

Trente-cinq adresses parcourues, à 1180 px et à 375 px : **aucune erreur console, aucun
écran vide, aucun débordement horizontal, aucun `rendre` orphelin, aucune couleur écrite
en dur hors des jetons.**

Trois choses que la vérification a réellement trouvées, et qui sont corrigées :

**1 · « 5 blocages » ne disait rien.** Un compte nu sur la carte d'un dossier et dans
l'en-tête de projet. Chaque blocage porte pourtant son prix depuis toujours dans
`REGLES.prix`. Le plus ancien — celui qui coûte depuis le plus longtemps — s'écrit
maintenant en toutes lettres sous le compte, et le survol les donne tous.

**2 · Une taille et une priorité portaient la même classe.** `.compte` servait à la fois
pour « 7 décisions attendent » — une réclamation — et pour « 9 supports » — un inventaire.
Tant que les deux se confondaient, la règle du silence ne se mesurait pas. Onze appels
passent à `.taille` ; il reste **trois compteurs de priorité au maximum sur toute
adresse**, contre un plafond de cinq.

**3 · Un critère écrit à l'usage ne survivait pas au rechargement.** `MAISON.criteres` est
un fichier que le navigateur ne peut pas écrire : la jurisprudence poussait dans un tableau
en mémoire, perdu au premier F5. Les ajouts vivent désormais au dépôt
(`criteresAjoutes`), et `MAISON.criteresDe()` fusionne les deux à la lecture — la
validation, les réglages et la jurisprudence lisent tous la même liste, et un critère écrit
part avec l'export.

### L'état du contrat, par famille d'écran

| Famille | État · conséquence | Coût | Prochain geste |
|---|---|---|---|
| Les cinq intentions | titre = pire état, sous-titre = sa conséquence | oui | modes et gestes en tête |
| Les objets — brief, socle, big idea, route, pièce | bande de recevabilité | oui, pondéré | gestes de la bande |
| Les documents compilés | contrôles avant ouverture | oui | « combler ce qui manque » |
| Les listes — dossiers, pièces, routes | verdict par carte | oui depuis cette passe | la carte ouvre son objet |
| Les étiquettes d'état | `app/etats.js`, un seul endroit | oui | — |
| Les mesures | assise, et ce qu'il faut enregistrer | oui | — |
