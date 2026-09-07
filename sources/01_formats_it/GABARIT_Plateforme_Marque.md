---
objet: plateforme_marque
gabarit_version: "1.0"
document_version: "{{version}}"
statut: "{{statut}}"          # brouillon | active | en_revision | archivee
marque: "{{marque}}"
projet: "{{projet}}"
proprietaire: "{{proprietaire}}"   # rôle Création — seul éditeur
active_depuis: "{{active_depuis}}"
remplace_version: "{{version_precedente}}"
---

# PLATEFORME DE MARQUE — {{marque}}

**Socle permanent · {{entite}}**
Version {{version}} · statut {{statut}} · active depuis {{active_depuis}}

> Document de fondation, pas de campagne. Il cadre toutes les prises de parole de la marque et vit plusieurs années.
> **Toute campagne qui le contredit est refusée en revue, quelle qu'en soit la qualité d'exécution.**
> Éditable par la Direction de la Création uniquement. Les autres rôles disposent d'un accès en lecture et d'un droit de commentaire.

---

## 0 · Nommage

<!-- champ: nommage | objet | critique: oui -->

| Niveau | Valeur | Usage |
|---|---|---|
| Nom officiel | **{{nom_officiel}}** | Toutes prises de parole externes |
| Descripteur | {{descripteur}} | Accompagne le nom à la première occurrence, jamais seul |
| Noms retirés | {{noms_retires}} | Déclenchent un avertissement s'ils apparaissent dans un document du projet |
| Usage interne toléré | {{usage_interne}} | Conversation d'équipe uniquement |

**Motif de l'arbitrage :** {{motif_nommage}}

---

## 1 · Raison d'être

<!-- champ: raison_etre | richtext | critique: oui -->
{{raison_etre}}

## 2 · Le problème adressé

<!-- champ: probleme | richtext | critique: oui -->
{{probleme}}

## 3 · Insight

<!-- champ: insight | richtext | critique: oui -->
{{insight}}

## 4 · Cadre de référence

<!-- champ: cadre_reference | richtext -->
{{cadre_reference}}

> Contre quoi la marque se compare réellement dans la tête de sa cible — pas la catégorie déclarée.

## 5 · Positionnement

<!-- champ: positionnement | text | critique: oui -->
> **{{positionnement}}**

**Point de différence**
<!-- champ: point_difference | richtext | critique: oui -->
{{point_difference}}

## 6 · Promesse

<!-- champ: promesse | text | critique: oui -->
> **{{promesse}}**

Désirable — {{promesse_desirable}}
Crédible — {{promesse_credible}}
Unique — {{promesse_unique}}

---

## 7 · Cibles

<!-- champ: cibles | table répétable | critique: oui -->

| Rang | Cible | Qui | Ce qu'il faut produire | Tension |
|---|---|---|---|---|
| 1 | {{cible_1}} | {{qui_1}} | {{produire_1}} | {{tension_1}} |
| 2 | {{cible_2}} | {{qui_2}} | {{produire_2}} | {{tension_2}} |
| 3 | {{cible_3}} | {{qui_3}} | {{produire_3}} | {{tension_3}} |

**Hors cible :** {{hors_cible}}

## 8 · Bénéfices, hiérarchisés

<!-- champ: benefices | liste ordonnée | l'ordre est porteur de sens, il ne se réarrange pas -->

1. **{{benefice_1}}** — {{benefice_1_corps}}
2. **{{benefice_2}}** — {{benefice_2_corps}}
3. **{{benefice_3}}** — {{benefice_3_corps}}
4. **{{benefice_4}}** — {{benefice_4_corps}}

> L'ordre va de la friction la plus fréquente à la moins fréquente. Une prise de parole qui ouvre sur le dernier bénéfice est une prise de parole ratée.

## 9 · Preuves tangibles

<!-- champ: preuves | liste | attribut: maitresse (bool) -->

{{preuves}}

**Preuve maîtresse, à ne jamais reléguer :** {{preuve_maitresse}}

---

## 10 · Personnalité et ton

**Adjectifs** <!-- 5 à 7, pas davantage -->
{{adjectifs}}

**Registre**
<!-- champ: registre | richtext -->
{{registre}}

**La marque ne dit jamais** <!-- champ: jamais | liste — alimente le contrôle de cohérence R10 -->
{{jamais}}

## 11 · Langage propriétaire

<!-- champ: langage | table répétable -->

| Terme | Sens | Remplace |
|---|---|---|
| **{{terme_1}}** | {{sens_1}} | {{remplace_1}} |
| **{{terme_2}}** | {{sens_2}} | {{remplace_2}} |
| **{{terme_3}}** | {{sens_3}} | {{remplace_3}} |

**Phrases-socle**, réutilisables telles quelles :
{{phrases_socle}}

## 12 · Symboles

<!-- champ: symboles | table répétable + slot-image -->

| Symbole | Sens | Contrainte visuelle |
|---|---|---|
| **{{symbole_1}}** | {{sens_symbole_1}} | {{contrainte_symbole_1}} |
| **{{symbole_2}}** | {{sens_symbole_2}} | {{contrainte_symbole_2}} |
| **{{symbole_3}}** | {{sens_symbole_3}} | {{contrainte_symbole_3}} |

<!-- slot-image: symboles — références visuelles des symboles. À compléter manuellement. -->

![{{legende_symbole_1}}]({{image_symbole_1}})

![{{legende_symbole_2}}]({{image_symbole_2}})

## 13 · Territoires d'expression

<!-- champ: territoires | table répétable -->

| Territoire | Ce qu'il porte | Où | Cible visée |
|---|---|---|---|
| {{territoire_1}} | {{porte_1}} | {{ou_1}} | {{cible_visee_1}} |
| {{territoire_2}} | {{porte_2}} | {{ou_2}} | {{cible_visee_2}} |
| {{territoire_3}} | {{porte_3}} | {{ou_3}} | {{cible_visee_3}} |

**Règle de non-mélange :** {{regle_melange}}

<!-- slot-image: territoires — inspiration visuelle par territoire. À compléter manuellement. -->

![{{legende_territoire_1}}]({{image_territoire_1}})

![{{legende_territoire_2}}]({{image_territoire_2}})

> Ces images fixent un registre. **Elles ne sont pas des visuels de campagne** et ne préjugent d'aucune exécution.

## 14 · Architecture de marque

<!-- champ: architecture | richtext -->
{{architecture}}

## 15 · Ce que cette plateforme ne fera pas

<!-- champ: ne_fera_pas | liste | critique: oui -->
{{ne_fera_pas}}

---

## 16 · Demandes de proposition créative — exploration de territoire

<!-- objet lié: DemandeProposition[] · contexte: plateforme_marque -->
<!-- statuts: a_assigner | assignee | en_cours | livree | retenue | ecartee -->

> Bloc rempli par la Direction de la Création pour faire explorer visuellement un territoire du socle, hors campagne.
> Une exploration de territoire **n'est jamais présentée au client comme une piste** : elle alimente le socle, pas une prise de parole.

### DPC-{{dpc_num}} — {{dpc_titre}}

| Champ | Valeur |
|---|---|
| Assignée à | {{dpc_da}} |
| Statut | {{dpc_statut}} |
| Territoire exploré | {{dpc_territoire}} |
| Symbole travaillé | {{dpc_symbole}} |
| Étage autorisé | 0 — exploration <!-- une exploration de socle ne dépasse jamais l'étage 0 --> |
| Ouverte le | {{dpc_ouverte}} |
| Attendue le | {{dpc_echeance}} |
| Charge estimée | {{dpc_charge}} |

**Ce qui est demandé**
{{dpc_demande}}

**Ce qui est autorisé**
Planches de registre, références externes commentées, essais de traitement. Volume plafonné à {{dpc_volume}}.

**Ce qui est interdit**
Toute exécution finalisée · tout texte de campagne · tout packshot retouché · toute présentation au client.

**Ancrage — rappel non éditable**
- Positionnement : {{positionnement}}
- Promesse : {{promesse}}
- Contrainte du symbole : {{contrainte_symbole}}
- Interdits de langage : {{jamais}}

**Critères d'acceptation**
- [ ] L'exploration sert le symbole, elle ne l'illustre pas littéralement
- [ ] Le registre tient sans le logo
- [ ] Aucun interdit de marque enfreint
- [ ] La contrainte de durée de vie est respectée <!-- ex. : ne pas reposer sur une interface datable -->

**Livraison**

| Élément | Valeur |
|---|---|
| Livrée le | {{dpc_livree_le}} |
| Emplacement | {{dpc_lien}} |
| Décision | {{dpc_decision}} |
| Motif | {{dpc_motif}} |
| Intégrée au socle en version | {{dpc_version_integration}} |

<!-- slot-image: dpc_exploration — planches livrées par le DA. À compléter manuellement. -->

![{{dpc_legende_1}}]({{dpc_image_1}})

---

## 17 · Complétude du socle

<!-- champ: completude | calculé | affiché en jauges sur la page projet -->
<!-- statut par bloc : complet | partiel | incomplet — calculé sur le remplissage des sections listées -->

| Bloc | Sections | Statut | À traiter |
|---|---|---|---|
| **Fondation** — pourquoi la marque existe | 1, 2, 3, 4 | {{bloc_fondation}} | {{fondation_todo}} |
| **Position** — ce qu'elle revendique | 0, 5, 6 | {{bloc_position}} | {{position_todo}} |
| **Audience et valeur** — pour qui, et ce qu'elle apporte | 7, 8, 9 | {{bloc_valeur}} | {{valeur_todo}} |
| **Expression** — comment elle se manifeste | 10, 11, 12, 13 | {{bloc_expression}} | {{expression_todo}} |
| **Cadre** — ses limites assumées | 14, 15 | {{bloc_cadre}} | {{cadre_todo}} |

**Dette stratégique prioritaire :** {{dette_prioritaire}}

---

## 18 · Historique

| Version | Date | Auteur | Ce qui change | Motif |
|---|---|---|---|---|
| {{v_1}} | {{v_1_date}} | {{v_1_auteur}} | {{v_1_change}} | {{v_1_motif}} |

| Signataire | Nom | Date |
|---|---|---|
| Direction de la Création — propriétaire | {{proprietaire}} | {{active_depuis}} |
| Direction générale — visa | {{visa_dg}} | {{visa_date}} |

---

<!--
NOTE D'INTÉGRATION — à retirer du rendu final

Rattachement : marque ou projet, jamais une tâche. Une seule plateforme statut=active par marque.
Activation d'une nouvelle version → archivage automatique de la précédente.
Édition : rôle Création uniquement. Lecture + commentaire pour les autres rôles.
Encart « Socle de marque » à afficher replié sur chaque tâche créative du projet :
   nom officiel · positionnement · promesse · interdits — en lecture seule, référencés, jamais recopiés.
Contrôles :
  · R10 — comparer le champ `ton` d'un brief avec `jamais` : signaler les collisions (avertissement)
  · R12 — signaler tout document du projet contenant une valeur de `noms_retires` (avertissement)
  · R11 — recalculer les jauges de complétude du socle à chaque enregistrement
Les blocs marqués slot-image acceptent 0 à n images, légendées, ajoutées manuellement.
-->
