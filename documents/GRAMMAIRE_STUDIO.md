# LA BARRE — GRAMMAIRE STUDIO
### Relevée sur les deux écrans qui la portent, avant de toucher aux autres

La passe Codex du 24/09 (`d9c87d8`) a posé une direction nouvelle — *Studio : le support
s'efface autour du travail* — sur **deux écrans seulement** : le Bureau (`vue-studio.js`)
et la liste des projets. Le reste du produit n'a reçu que la palette. Ce document relève
la grammaire de ces deux écrans **telle qu'elle est rendue** (valeurs calculées dans le
navigateur, pas lues dans le CSS), puis tranche ce qu'ils ne disent pas.

Il remplace, pour tout ce qui est visuel, `DESIGN_SYSTEM.md` (la planche sombre 2.0),
qui reste au dépôt comme archive. Les principes d'accessibilité de ce dernier (§14) restent
en vigueur sans changement.

**Règle de conduite pour appliquer ce document : une page à la fois.** Chaque page est une
passe : relevé de ses motifs → correspondance avec la grammaire → correction → mesure →
capture bureau et 375 px. On ne passe à la suivante qu'une fois la mesure à zéro.

---

## 1 · Ce qui est relevé (les deux écrans de référence)

### Le fond et les contenants

| Rôle | Valeur rendue |
|---|---|
| Toile | `#f5f7f9` (`--studio-fond`) |
| Chapeau (bandeau haut) | blanc, filet bas `#dce3e8`, 72 px, fil d'Ariane 13 px gris |
| Zone de travail | marges 32 × 36 px |
| **Section** | blanc, filet 1 px `#dce3e8`, rayon **10 px**, aucune ombre |
| Élément de liste | rayon **6 px**, transparent ; sélectionné : blanc, filet `#bccbd4`, ombre `elev-1` |
| Panneau de contexte | `#f5f7f9` (surface-4) **dans** la section, filet gauche, 23 × 20 px |
| Couverture de carte | aplat pâle (`#d9e9f0`, `#e7edf1`, `#e9efff` en alternance), rayon 5 px |

**Une ombre ne sert qu'à deux choses** : l'élément sélectionné (`elev-1`) et ce qui
flotte (panneau latéral, `elev-4`). Aucune carte au repos n'en porte.

### La typographie — une seule famille

Tout est en **Asap** (`--affichage`). Aucune capitale, aucun espacement de lettres sur
un libellé. Les tailles relevées, du plus grand au plus petit :

| Rôle | Rendu | Exemple |
|---|---|---|
| Titre d'écran | 600 · `clamp(32px, 3.6vw, 58px)` / 1.04 · −0.055em · `#193347` | *L'œil sur la création.* |
| Surtitre | 400 · 13 px · gris `#596574` · 1re lettre capitale | *Lundi 28 septembre* |
| Chapô | 400 · 14 px / 1.6 · gris · 65 ch max | *5 pièces à regarder. Le contexte à côté.* |
| Titre de section | 550 · 21 px · −0.02em | *Sur la table* |
| Titre de carte | 550 · 17–18 px | *Le produit roi* |
| Titre de panneau | 550 · 17 px | *Garder le cap* |
| Corps | 400 · 13–14 px · encre `#162b3d` | |
| Texte second | 400 · 12–13 px · gris | *Piste créative* |
| Libellé de champ | 400 · 11 px · gris, **minuscules** | *Responsable*, *Échéance du projet* |
| Référence | 400 · 11 px · +0.02em · gris, bleue si active | *MT-0042* |
| Sous-titre de bloc | 700 · 12 px · encre | *Le brief* |

### Les composants

| Composant | Classe de référence | Anatomie |
|---|---|---|
| **En-tête d'écran** | `.studio-entete` | surtitre · titre · chapô à gauche ; **une** action principale à droite |
| **Tête de section** | `.studio-section-tete` | titre + pastille de compte à gauche ; filtre ou lien à droite ; 20 × 24 px |
| **Pastille de compte** | `.studio-compte` | 12 px 500, gris sur `#e7edf1`, rayon 5, 3 × 7 px |
| **Sélecteur de mode** | `.studio-statuts` | segments sur fond `#e7edf1`, rayon 7 ; actif blanc + `elev-1` ; 38 px |
| **Maître-détail** | `.studio-table` | 3 colonnes : file (190) · scène (souple) · contexte (250) |
| **Liste de fichiers** | `.studio-file` / `.studio-piece` | référence · titre 550 · nature · date 11 px |
| **Grille de cartes** | `.studio-projets` | 3 → 2 → 1 colonnes, gouttière 20 |
| **Carte** | `.studio-dossier` | couverture · référence · titre · ligne de méta 11 px en deux bouts |
| **Contexte** | `.studio-contexte` | titre · lien fort · `dl` (dt 11 px gris / dd 13 px) · repli `details` |
| **État vide** | `.studio-vide` | signe · titre 26 px 500 · phrase 14 px · **un** geste |
| **Bouton principal** | `.b.or` | bleu `#2856cb` plein, blanc, rayon 6, 44 px, 600 14 px |
| **Geste second** | lien `.studio-actions a` | texte gris, sans fond ni cadre |
| **Lien de sortie** | `.studio-section-tete > a` | 13 px gris, flèche `↗` |
| **Champ, liste** | `.studio-filtre select`, `.studio-index-outils input` | blanc, filet `#dce3e8`, rayon 5–6, 38–44 px |

### La voix

Phrases courtes, à la première personne implicite, en minuscules :
*« Sur la table »*, *« L'atelier en cours »*, *« Garder le cap »*, *« La table est libre. »*.
Un bouton nomme son geste : *Examiner cette piste*, *Ouvrir le dossier*, *+ Nouveau projet*.

---

## 2 · Ce que les deux écrans ne disent pas — tranché

Les écrans de référence n'ont ni blocage, ni chiffre-clé, ni onglet de mode à question,
ni tableau. Le reste du produit en est plein. Voici la règle pour chacun, dérivée de la
grammaire relevée plutôt qu'inventée à côté.

### L'état — il se dit par la forme, jamais par un aplat

| Jeton (déjà dans `studio.css`) | Valeur | Rôle |
|---|---|---|
| `--bloquant` | `#a33143` | rien n'avance tant que ce n'est pas levé |
| `--arbitrage` | `#80500d` | demande un jugement |
| `--succes` | `#267054` | tenu, validé |
| `--info` | `#2758be` | à consulter |

- **Plus aucun fond rose, ambre ou vert plein.** Un état est un **filet gauche de 3 px**
  sur un contenant blanc, plus un **signe** avant le texte (● bloquant · ◐ arbitrage ·
  ✓ tenu — règle §14 de l'accessibilité, inchangée).
- **L'ancienneté se colore, le coût non.** *« depuis 24 jours »* prend la couleur de
  l'état, en 12 px 550 ; la phrase de coût reste en gris second.
- **Le compteur d'alerte** dans un sélecteur de mode : pastille de compte, texte coloré de
  l'état — jamais une pilule rouge pleine.

### Le blocage — une ligne de contexte, pas une affiche

Le rail « Ce qui bloque ici » adopte le **panneau de contexte** : fond surface-4, filet
gauche, titre de panneau 550 17 px. Chaque blocage y est un élément de liste blanc à
filet gauche coloré : quoi (550 13 px) · depuis (12 px coloré) · coût (12 px gris) ·
geste (lien 12 px bleu).

### Le chiffre-clé — une rangée, pas cinq boîtes

Les tuiles à filet haut coloré deviennent **une seule section blanche** coupée par des
filets verticaux. Chaque case : nombre 550 28 px encre · libellé 13 px encre · précision
12 px gris. **Seul le nombre** prend la couleur d'état, et seulement s'il est en défaut.

### Le mode — un sélecteur, et sa question en dessous

Les onglets à deux lignes (`.dcm` : NOM EN CAPITALES + question) deviennent le
**sélecteur de mode** Studio, libellés en minuscules, pastille de compte. La question du
mode actif passe **sous** le sélecteur, en texte second, une seule ligne.

### La liste de lignes — le tableau Studio

Composition de campagne, comptes, marchés, registres : **une section blanche**, lignes de
56 px minimum séparées par un filet `#dce3e8`, nom 14 px 550 encre, méta 12 px gris,
gestes en liens texte à droite (44 px de cible par la règle §14).

### L'en-tête de dossier — l'en-tête d'écran, avec une ligne d'état

Surtitre : *MT-0043 · Campagne* (13 px gris, casse de phrase) · titre d'écran · chapô :
le client. La synthèse des blocages devient une **ligne d'état** sous le chapô (signe,
compte coloré, la phrase du plus ancien) — pas un bloc flottant à droite du titre.

### Le texte écrit par un humain

L'ancienne règle mettait l'idée, la promesse, la signature en sérif italique
(`--ecrit`). Le Studio les porte en **Asap 500 grand**, sur l'aplat d'intention
(`.studio-intention`, `#d9e9f0`). C'est ce motif qui dit désormais *« un humain a écrit
ceci »*. `Source Serif 4` n'est plus employée dans l'interface ; les fichiers restent
chargés pour les documents imprimés (présentation, cas client) qui la demandent.

### Les liens

Un lien de navigation n'est jamais souligné en bleu brut. Trois formes seulement :
le **lien fort** (550, encre, bleu au survol), le **lien de sortie** (13 px gris, `↗`),
le **geste texte** (12–13 px bleu `#2856cb`).

---

## 3 · La mesure — ce qui fait qu'une page est finie

Une page est traitée quand, **à 1440 px et à 375 px** :

1. **Zéro capitale** rendue sur un libellé (hors sigles : MT, KV, BAT, marchés).
2. **Zéro texte d'interface en sérif.**
3. **Zéro aplat d'état** (fond rose, ambre, vert plein).
4. **Un seul titre d'écran**, à la taille relevée, et une seule action principale.
5. Zéro débordement horizontal, zéro erreur console.
6. Zéro cible sous 44 px, zéro contraste sous 4,5:1.
7. Une capture avant / après.

---

## 4 · L'ordre des passes

Par fréquence d'usage, une page par passe. Le dossier, trop gros pour une passe, est
coupé en quatre.

| Passe | Page | Adresse |
|---|---|---|
| 1 | Décisions — à traiter, retours attendus | `#/valider/file`, `#/valider/du` |
| 2 | Dossier — en-tête, navigateur à trois temps, rail des blocages | `#/projets/<id>` |
| 3 | Dossier — sections *Cadrer* | identité · brief · brief-back · socle · stratégie |
| 4 | Dossier — sections *Concevoir* | atelier · big idea · pistes |
| 5 | Dossier — sections *Produire* | planche · livrables · livraison · présentation |
| 6 | Livrable | l'écran d'un livrable |
| 7 | Marque (dossier de marque) | `#/projets/MQ-…`, `#/projets/marques` |
| 8 | Campagne | `#/projets/CMP-…` |
| 9 | Planning — quatre modes | `#/planning/…` |
| 10 | Bilan — cinq modes | `#/reporting/…` |
| 11 | Ressources — sept modes | `#/referentiel/…` |
| 12 | Panneaux et modales | clôture, résultat, chiffrage, remise, renvoi, capture |
| 13 | Passe de cohérence | les 35 adresses, bureau et 375 px, mesure complète |

L'état de départ, mesuré le 28/09 : Bureau, liste des projets et Décisions à zéro
capitale ; tous les autres écrans entre 7 et 140 libellés en capitales ; le dossier seul
titré en sérif.

---

## 5 · Journal des passes

**Passe 1 — Décisions (28/09).** *À traiter* et *Retours attendus* reprennent la table
du Bureau telle quelle (`studio-revue` · `studio-table` · `studio-piece` ·
`studio-contexte`), sous un en-tête d'écran et le sélecteur de mode partagé
`UI.modes`, créé à cette passe pour les quatre intentions. Trouvé en chemin, et réglé :
- **775 « choses dues » sur des dossiers clos** — `ECARTS.tous()` ignorait la clôture
  que la file de décision respecte déjà. Le mode passait de 64 336 px à 1 111 px.
- Les dettes identiques se regroupent (une ligne par cause, les livrables en méta) ;
  l'âge reste l'axe, en filet de 4 px au lieu d'une barre pleine illisible (1,55:1).
- La file cassait ses lignes sur quatre étages (colonne du rang masquée, grille restée).
- *« 53 livrable(s) »*, *« sur 0 livrable »* : pluriels et cas vide rédigés.
- Segments et listes Studio relevés de 38 à 44 px (règle §14), y compris sur la
  référence. Restent sur le Bureau cinq cibles sous 44 px : passe 13.

Mesure à 1280 et 375 px : zéro capitale, zéro sérif, zéro aplat, zéro cible sous
44 px, zéro contraste sous 4,5:1, zéro débordement.
