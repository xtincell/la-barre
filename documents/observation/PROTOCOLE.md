# Observer La Barre avec ceux qui s'en servent

Ce dossier est un **kit de gabarits**. Il sert à regarder de vraies personnes
de l'agence travailler avec La Barre, sur leurs vrais dossiers, avant de
changer encore l'interface.

Pourquoi ce kit existe : la validation avec les DC a été planifiée deux fois
et jamais faite, et chaque refonte a été livrée sans qu'un seul utilisateur
ait été observé (constats `historique-processus-1`, `fond-metier-12` et
`historique-processus-8` de l'audit
[`docs/audits/2026-11-26-adoption.md`](../../docs/audits/2026-11-26-adoption.md)).

> **Règle de conservation.** Le dossier `documents/` est lisible par tout
> opérateur à travers La Fusée. On n'y range **que des gabarits vides**. Les
> grilles remplies, les semaines témoins, les verbatims, les enregistrements
> et les relevés d'usage restent **hors du dépôt**, dans un dossier privé de
> la personne qui observe.

## Le kit

| Fichier | À quoi il sert |
|---|---|
| `PROTOCOLE.md` | Ce document : qui, où, comment, quand. |
| [`TACHES.md`](TACHES.md) | Les tâches par rôle, avec leur critère de réussite sans aide. |
| [`grille-observation.csv`](grille-observation.csv) | La grille à remplir pendant chaque séance. |
| [`SEMAINE-TEMOIN.md`](SEMAINE-TEMOIN.md) et [`semaine-temoin.csv`](semaine-temoin.csv) | Le relevé que chaque participant tient pendant une semaine. |
| [`SYNTHESE-modele.md`](SYNTHESE-modele.md) | Le modèle de synthèse d'une vague de séances. |
| `outils/usage-reel.mjs` | Le relevé chiffré de l'usage, sur une copie de la base. |
| `outils/recette-captures.mjs` | Les captures de tous les espaces, avant et après. |

Copiez les gabarits dans votre dossier privé avant de les remplir. Ne
remplissez jamais la copie du dépôt.

## Qui

Six à sept personnes, chacune seule face à l'outil :

- **2 directeurs de création (DC)**, dont au moins un autre que le titulaire du
  poste si l'agence en a un ;
- **2 DA ou concepteurs-rédacteurs (CR)**, dont au moins un junior ;
- **1 chef de projet ou une personne de la Clientèle** ;
- **1 personne de la production** (chef de production ou traffic) ;
- pour la boucle client : **1 client réel et bienveillant**, sur un vrai dossier.

Chaque participant reçoit un code (`DC1`, `DC2`, `DA1`, `CR1`, `CP1`, `PROD1`,
`CLI1`). Les grilles ne portent que ce code. La correspondance entre codes et
noms reste dans le dossier privé de l'observateur.

## Où et sur quoi

- Sur **leurs dossiers en cours**, sur l'instance réelle (La Barre derrière La
  Fusée). Pas sur la vitrine, pas sur Orvelle, pas sur une base fictive.
- Sur **leur poste et leur téléphone**, avec leur compte. Pas sur le poste de
  l'observateur.
- Le lien de départ est envoyé **par WhatsApp**, comme dans la vraie vie.

Avant la séance, l'observateur vérifie avec le participant qu'il existe bien,
dans ses dossiers, de quoi faire chaque tâche (une V2 à valider, une pièce à
reprendre…). Une tâche sans support réel est notée « non applicable ». On ne
fabrique pas de faux dossier.

## Le rôle de l'observateur : muet

- Il lit la consigne de la tâche telle qu'elle est écrite dans `TACHES.md`, puis
  se tait. Les consignes n'emploient **aucun mot de l'interface** : elles ne
  doivent pas indiquer le bouton.
- Il ne montre rien, ne corrige rien, n'explique rien. Si le participant
  demande, il répond : « Faites comme vous feriez sans moi. »
- Il ne relance que par une question ouverte : « Qu'est-ce que vous cherchez ? »
- Si le participant est bloqué plus de trois minutes, ou demande à arrêter, la
  tâche est notée **échec**. Si l'observateur a dû aider pour continuer, elle est
  notée **avec aide**.
- Il chronomètre chaque tâche : départ à la fin de la lecture de la consigne,
  arrêt quand le critère de réussite est atteint ou quand la tâche est
  abandonnée. Le temps est **chronométré, jamais estimé**.

## Consentement

À lire au début de chaque séance, et à faire confirmer à voix haute :

> « Nous testons l'outil, pas vous. Il n'y a pas de bonne réponse : si quelque
> chose est difficile, c'est l'outil qui est en cause. Je vais noter ce que vous
> faites et quelques phrases que vous direz, sous un code, sans votre nom. Rien
> de ce que je note n'entre dans le dépôt de l'outil. Vous pouvez arrêter à tout
> moment, ou me demander de ne pas noter quelque chose. Êtes-vous d'accord ? »

- Aucun enregistrement audio ou vidéo sans un « oui » explicite, noté avec la date.
- Pour le client : son accord est demandé par écrit avant la séance, par la
  personne qui tient la relation.
- Un participant peut demander le retrait de ses notes : elles sont détruites.

## Conservation des notes

- Grilles remplies, semaines témoins, verbatims, relevés et captures d'une vraie
  base : **dans un dossier privé, hors du dépôt**. Jamais dans `documents/`.
- Dans une PR, on cite une observation par son identifiant et un fait d'une
  phrase, sans nom (voir « Citer une observation » plus bas).
- Les enregistrements éventuels sont détruits une fois la synthèse faite.

## Trois temps

1. **Référence**, avant les gains rapides. Elle fixe le point de départ. Aucune
   PR d'interface n'est proposée à la fusion avant elle.
2. **Après les gains rapides** (« Valider et dire », « Naviguer et retrouver »,
   « Vrais fichiers, vraie démo, BAT souple »).
3. **Après chaque chantier structurel**, sur les tâches qu'il touche.

Les mêmes participants, autant que possible, et les mêmes tâches : c'est ce qui
rend les temps comparables.

## Avant les séances : deux relevés

### Relevé 1 : l'usage réel

Personne ne sait aujourd'hui combien de décisions, de versions et de personnes
passent par La Barre. `outils/usage-reel.mjs` le compte sur une copie de la
base de production. Il ne fait que lire : pas d'écriture, pas de réseau.

1. **Récupérer une copie de la base**, depuis une session ouverte sur La Barre :
   - soit **Outils du poste → Exporter la sauvegarde** (ou **Ressources →
     Paramètres → Exporter la base**) : le navigateur télécharge
     `la-barre_<date>_<heure>.json` ;
   - soit, dans le même navigateur, ouvrir `/la-barre/depots/manifeste.json`,
     lire la `reference`, puis ouvrir `/la-barre/depots/<reference>` et
     l'enregistrer.
2. **La ranger hors du dépôt**, dans un dossier privé (par exemple
   `~/La-Barre-releves/`). Elle porte des clients et des personnes : elle ne
   doit jamais être copiée dans le dépôt, ni envoyée.
3. **Lancer le relevé**, depuis une copie du dépôt :

   ```bash
   node outils/usage-reel.mjs ~/La-Barre-releves/la-barre_2026-12-01_09h00.json \
     --depuis 2026-09-01 > ~/La-Barre-releves/usage-2026-12-01.md
   ```

   - `--format csv` donne un tableau à ouvrir dans un tableur ;
   - `--anonyme` remplace chaque nom par « Personne n » : c'est la version à
     citer dans une PR ou à partager ;
   - sans `--depuis`, toute la base est comptée.
4. **Lire la section « Ce que ces chiffres ne disent pas »** avant de citer un
   chiffre : `lectures[].qui` ne désigne personne, `qui` est le poste titulaire,
   et seule l'attestation de La Fusée identifie une personne connectée.
5. Refaire le relevé à chaque temps (référence, après les gains rapides, après
   chaque chantier), sur une copie fraîche, avec la même date `--depuis`.

### Relevé 2 : la semaine témoin

Pendant une semaine, chaque participant note, pour **un** de ses dossiers, par
où passe chaque échange : WhatsApp, Drive, mail, oral ou La Barre. Voir
[`SEMAINE-TEMOIN.md`](SEMAINE-TEMOIN.md). Elle se tient avant la séance de
référence, puis à nouveau après les gains rapides.

## Déroulé d'une séance (environ 50 minutes)

| Temps | Quoi |
|---|---|
| 5 min | Accueil, consentement, code du participant. |
| 5 min | « Montrez-moi ce que vous avez à faire aujourd'hui sur vos dossiers, comme vous le feriez sans moi. » (premier clic, premiers mots) |
| 30 min | Les tâches de son rôle (`TACHES.md`), dans l'ordre, chronométrées. |
| 5 min | Une tâche refaite sur le téléphone. |
| 5 min | Réaction à chaud, notée mot pour mot, puis les deux questions de fin. |

Les deux questions de fin, posées telles quelles :

1. « Sur une note de 1 à 5, avez-vous envie de vous en servir pour ce dossier ? Pourquoi ? »
2. « Vous l'ouvrez demain matin pour ce dossier ? » Noter la réponse exacte :
   un « oui, mais… » n'est pas un oui.

## Ce qu'on observe

Une ligne par tâche et par participant, dans
[`grille-observation.csv`](grille-observation.csv) :

| Colonne | Ce qu'on y écrit |
|---|---|
| `seance` | Le numéro de séance et le code du participant : `S02-DC1`. |
| `date` | `AAAA-MM-JJ`. |
| `role` | `DC`, `DA`, `CR`, `CP`, `PROD` ou `CLI`. |
| `tache` | L'identifiant de `TACHES.md` : `DC-2`. |
| `premier_clic` | Ce qu'il touche en premier, en clair : « le dossier dans la liste ». |
| `mots_employes` | Les mots qu'il emploie à voix haute pour les choses de l'écran, à verser au glossaire. |
| `hesitations` | Un nombre : les arrêts de plus de trois secondes. |
| `retours_arriere` | Un nombre. |
| `demandes_aide` | Un nombre. |
| `sorties` | Chaque sortie vers un autre outil : `outil ; raison`, plusieurs séparées par `\|`. |
| `alertes_lues` | Un nombre, ou les alertes en clair. |
| `alertes_ignorees` | Un nombre, ou les alertes en clair. |
| `temps_s` | Le temps chronométré, en secondes. |
| `resultat` | `sans aide`, `avec aide`, `échec` ou `non applicable`. |
| `verbatim` | Une phrase notée mot pour mot, quand elle compte. Ce fichier rempli reste hors du dépôt. |

## Critères de succès

Aucun seuil chiffré n'est inventé ici : la séance de référence donne les
premiers chiffres.

- Chaque tâche cœur (ouvrir, valider, demander une modif, déposer, faire valider
  par le client, consigner la remise) est réussie **sans aide** par chaque
  participant concerné.
- Personne ne quitte La Barre pour regarder la pièce, la comparer ou obtenir
  l'accord.
- Pour un même DC, valider dans La Barre ne prend pas plus de temps que sur
  WhatsApp. Les deux sont chronométrés dans la séance.
- Le critère écrit au départ du produit, « Vingt secondes par geste,
  quatre-vingt-dix minutes le lundi », est enfin mesuré.
- Après la réécriture des textes, aucun libellé n'est incompris au second passage.
- Chaque participant répond oui, sans condition, à « Vous l'ouvrez demain matin
  pour ce dossier ? ».
- Sur la semaine témoin, la part des validations et des retours passés par La
  Barre augmente d'une semaine à l'autre.

## Citer une observation

Chaque fait observé reçoit un identifiant :
`OBS-<date>-<séance>-<tâche>`, par exemple `OBS-2026-12-03-S02-DC-2`.

Une PR d'interface cite au moins une observation datée, sous cette forme :

> `OBS-2026-12-03-S02-DC-2` : le participant a cherché le bouton de validation
> sous l'image pendant 40 s, puis a validé par WhatsApp.

Pas de nom, pas de dossier client, pas de verbatim long. La synthèse complète
reste hors du dépôt.

## Règle de processus

- Aucune PR d'interface n'est fusionnée sans citer une observation datée.
- Chaque écran touché est capturé avant et après (`outils/recette-captures.mjs`)
  et relu par une personne du métier contre sa planche cible.
- La définition de « fini » est dans [`../FINI.md`](../FINI.md).
