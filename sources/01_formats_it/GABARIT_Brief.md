---
objet: brief
gabarit_version: "1.0"
document_version: "{{version}}"
statut: "{{statut}}"          # brouillon | emis | sous_reserve | accepte | obsolete
projet: "{{projet}}"
taches_liees: "{{taches}}"
emetteur: "{{emetteur}}"            # rôle Clientèle
contributeur: "{{contributeur}}"    # rôle Planning
destinataire: "{{destinataire}}"    # rôle Création
emis_le: "{{emis_le}}"
delai_reponse_jours: "{{delai}}"
delai_suspendu_depuis: "{{suspendu_depuis}}"
---

# BRIEF CLIENT QUALIFIÉ

**{{client_marque}} — {{campagne}}**
Référence {{reference}} · version {{version}} · statut {{statut}}

> Document d'entrée en création. Seul point d'entrée recevable : aucun travail créatif n'est engagé sans lui.
> Complétude : **{{critiques_remplis}}/11 champs critiques**.

<!-- source: D déclaré par le client · F fourni (document) · I inféré par l'agence · V à vérifier -->

---

## 1 · La demande

### Demande en verbatim `[{{src.verbatim}}]` — critique
<!-- champ: verbatim | richtext | rôle: clientele | critique: oui -->
{{verbatim}}

### Décideur final `[{{src.decideur}}]` — critique
<!-- champ: decideur | text | rôle: clientele | critique: oui -->
{{decideur}}

### Qui peut annuler une idée déjà validée `[{{src.tueur}}]` — critique
<!-- champ: tueur | text | rôle: clientele | critique: oui -->
{{tueur}}

### Circuit et délai de validation `[{{src.circuit}}]` — critique
<!-- champ: circuit | richtext | rôle: clientele | critique: oui -->
{{circuit}}

---

## 2 · Le problème réel

### Problème, distinct de la demande `[{{src.probleme}}]` — critique
<!-- champ: probleme | richtext | rôle: planning | critique: oui -->
{{probleme}}

### Source de chaque chiffre avancé `[{{src.sources}}]`
<!-- champ: sources | richtext | rôle: planning -->
{{sources}}

---

## 3 · La cible

### Cible et tension `[{{src.cible}}]` — critique
<!-- champ: cible | richtext | rôle: planning | critique: oui -->
{{cible}}

---

## 4 · Le territoire stratégique

### Axe recommandé `[{{src.axe}}]` — critique
<!-- champ: axe | richtext | rôle: planning | critique: oui -->
{{axe}}

### Bénéfice à démontrer `[{{src.benefice}}]` — critique
<!-- champ: benefice | text | rôle: planning | critique: oui -->
{{benefice}}

### Reason to believe `[{{src.rtb}}]`
<!-- champ: rtb | richtext | rôle: planning -->
{{rtb}}

### Ton attendu et ce que la marque ne dit jamais `[{{src.ton}}]` — critique
<!-- champ: ton | richtext | rôle: planning | critique: oui -->
{{ton}}

---

## 5 · Le cadre

### Périmètre de livrables `[{{src.livrables}}]` — critique
<!-- champ: livrables | table | rôle: clientele | critique: oui -->

| Livrable | Quantité | Format |
|---|---|---|
| {{livrable_1}} | {{qte_1}} | {{format_1}} |
| {{livrable_2}} | {{qte_2}} | {{format_2}} |
| {{livrable_3}} | {{qte_3}} | {{format_3}} |

**Hors périmètre :** {{hors_perimetre}}

### Fenêtre et dates non négociables `[{{src.fenetre}}]` — critique
<!-- champ: fenetre | richtext | rôle: clientele | critique: oui -->
{{fenetre}}

### Budget et ventilation `[{{src.budget}}]`
<!-- champ: budget | richtext | rôle: clientele -->
{{budget}}

---

## 6 · Les critères de succès

### Résultats mesurables `[{{src.succes}}]` — critique
<!-- champ: succes | table | rôle: clientele | critique: oui -->

| Indicateur | Point de départ | Cible | Mesuré par |
|---|---|---|---|
| {{ind_1}} | {{dep_1}} | {{cible_1}} | {{mes_1}} |
| {{ind_2}} | {{dep_2}} | {{cible_2}} | {{mes_2}} |

---

## 7 · Pièces et références

<!-- champ: pieces | liste_fichiers | rôle: clientele -->

| Pièce | Statut | Reçue le |
|---|---|---|
| {{piece_1}} | {{statut_piece_1}} | {{date_piece_1}} |
| {{piece_2}} | {{statut_piece_2}} | {{date_piece_2}} |

<!-- slot-image: references — captures, documents client, éléments existants. À compléter manuellement. -->

![{{legende_ref_1}}]({{image_ref_1}})

![{{legende_ref_2}}]({{image_ref_2}})

> Ces images sont des références de contexte fournies par le client ou l'agence. **Elles ne constituent pas une piste créative** et n'engagent aucune direction visuelle.

---

## 8 · Demandes de proposition créative

<!-- objet lié: DemandeProposition[] — répétable, créé par la Direction de la Création, assigné à un DA -->
<!-- statuts: a_assigner | assignee | en_cours | livree | retenue | ecartee -->

> Bloc rempli par la Direction de la Création après acceptation du brief. Chaque demande est une affectation nominative, bornée par un étage de finition.
> **Aucune demande ne peut être créée tant que le brief n'est pas en statut `accepte`.**

### DPC-{{dpc_num}} — {{dpc_titre}}

| Champ | Valeur |
|---|---|
| Assignée à | {{dpc_da}} |
| Statut | {{dpc_statut}} |
| Étage autorisé | {{dpc_etage}} <!-- 0 territoire · 1 concept · 2 master · 3 déploiement --> |
| Ouverte le | {{dpc_ouverte}} |
| Attendue le | {{dpc_echeance}} |
| Charge estimée | {{dpc_charge}} |

**Ce qui est demandé**
<!-- champ: dpc_demande | richtext -->
{{dpc_demande}}

**Ce qui est autorisé à cet étage**
<!-- pré-rempli par le système selon dpc_etage — non éditable -->
{{dpc_autorise}}

**Ce qui est interdit à cet étage**
<!-- pré-rempli par le système selon dpc_etage — non éditable -->
{{dpc_interdit}}

**Ancrage — rappel non éditable**
- Axe du brief : {{axe}}
- Bénéfice à démontrer : {{benefice}}
- Interdits de marque : {{ton}}
- Socle de marque : {{lien_plateforme_marque}}

**Critères d'acceptation** <!-- checklist, cochée par le DC à la livraison -->
- [ ] La proposition tient dans le périmètre de l'étage autorisé
- [ ] Chaque route porte ce qu'elle sacrifie, et l'argument qui la soutient
- [ ] Accroches de cinq mots maximum
- [ ] Une seule route est recommandée
- [ ] Sans le logo, la marque reste identifiable
- [ ] Aucun interdit de marque enfreint

**Livraison**

| Élément | Valeur |
|---|---|
| Livrée le | {{dpc_livree_le}} |
| Emplacement | {{dpc_lien}} |
| Décision | {{dpc_decision}} <!-- retenue | à retravailler | écartée --> |
| Motif | {{dpc_motif}} |

<!-- slot-image: dpc_livrables — planches d'intention livrées par le DA. À compléter manuellement. -->

![{{dpc_legende_1}}]({{dpc_image_1}})

---

## 9 · Clause de frontière

Ce document **ne contient pas**, et ne doit jamais contenir :

- [ ] Aucun concept ni idée de campagne
- [ ] Aucun titre, accroche, signature ou tagline
- [ ] Aucun naming de campagne ou de mécanique
- [ ] Aucune piste visuelle, référence d'exécution ou moodboard présenté comme direction
- [ ] Aucun scénario ni storyboard
- [ ] Aucune promesse d'exécution déjà faite au client

> **Test de contrôle avant émission :** si une phrase de ce document pouvait figurer sur une affiche, elle n'a rien à y faire.

---

## 10 · Réception

**Réserves émises**
<!-- champ: reserves | liste | rôle: creation — alimente le retour sous 24 h -->

| # | Champ concerné | Nature | Levée le |
|---|---|---|---|
| 1 | {{res_champ_1}} | {{res_nature_1}} | {{res_levee_1}} |
| 2 | {{res_champ_2}} | {{res_nature_2}} | {{res_levee_2}} |

> La Direction de la Création dispose de 24 h pour retourner ce brief sous réserve.
> **Le délai de réponse créative est suspendu tant que le statut est `sous_reserve`.**

| Signataire | Nom | Date |
|---|---|---|
| Direction Clientèle — émetteur | {{emetteur}} | {{emis_le}} |
| Planning — contributeur | {{contributeur}} | {{emis_le}} |
| Direction de la Création — réception | {{destinataire}} | {{accepte_le}} |

---

<!--
NOTE D'INTÉGRATION — à retirer du rendu final

Syntaxe : {{cle}} = champ de saisie · [{{src.cle}}] = pastille de source (D/F/I/V)
Champs critiques : verbatim, decideur, tueur, circuit, probleme, cible, axe, benefice, ton, livrables, fenetre, succes
Blocages :
  · statut emis        → les 11 champs critiques non vides
  · tâche À faire → En cours  → brief en statut accepte
  · création d'une DPC → brief en statut accepte
  · delai_reponse_jours gelé tant que statut = sous_reserve
Les blocs marqués slot-image acceptent 0 à n images, légendées, ajoutées manuellement.
-->
