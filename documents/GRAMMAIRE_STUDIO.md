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

**Passe 2 — Dossier : en-tête, navigateur, rail (28/09).** L'en-tête devient l'en-tête
d'écran Studio (surtitre *MT-0043 · Campagne*, titre Asap, client) et le bloc d'état
qui flottait à droite du titre devient une **ligne d'état** sous le chapô. La bande de
méta en capitales devient une liste de définitions dans une section blanche. Le
navigateur à trois temps prend la forme du sélecteur de mode, avec son avancement ; les
étapes deviennent une sous-navigation en texte (signe ✓ ◐ ○, filet bleu sous l'étape
active). Le rail gauche perd ses pastilles de sections, qui doublaient le navigateur.
Tranché au §2 pour tout le produit, parce que ce sont des composants partagés :
`.prix` et `.banniere` perdent leurs aplats et leurs couleurs écrites pour le sombre
(texte `#e5c88c` sur blanc) ; `.panneau-lat` devient une section blanche ; `.blocage`
un élément à filet ; `.b`, `.b.nu`, `.bouton`, `.bouton.creux` rejoignent les deux
gestes de la référence ; le lien « Pourquoi → » vers la doctrine devient un geste texte.
CSS mort retiré : l'ancien en-tête, les tuiles d'état, le navigateur `.np-*`, la bande
`.bande-meta` — trois commentaires orphelins retirés avec.

Mesure hors contenu de section, à 1280 et 375 px : zéro sérif, zéro aplat, zéro cible
sous 44 px, zéro contraste sous 4,5:1, zéro débordement. Restent en capitales deux
données (le nom du dossier chez People, des initiales) et le rail propre à la big idea,
repris en passe 4.

**Passe 3 — Dossier : les sections Cadrer (28/09).** Identité, brief, brief-back,
plateforme de marque, stratégie. **Changement de méthode à cette passe** : une classe
encore vivante n'est plus surchargée ; son ancienne définition est retirée et elle est
écrite une fois dans `studio-vues.css` — deux définitions qui se battent finissent par
diverger (le fichier en portait déjà en double : `.se-champs`, `.sec-t`, `.shf-h`,
`.svf-v`). Composants communs écrits au §2 : la bande de recevabilité, la barre de
verdict (le verdict positif perd son aplat vert), l'affichage des champs, le titre de
bloc. Chaque section range ses champs dans une section blanche ; les conséquences des
champs vides passent en gris, le signe ○ porte l'état ; l'insight — ce qu'un humain a
écrit — passe du sérif gras à l'aplat d'intention. Les libellés courts des couches,
des territoires et de l'axe (`court: "CATÉGORIE"`) passent en casse de phrase dans les
données. Une action principale par écran : les cartes de brief perdent leurs boutons
bleus pleins. Trouvé en chemin, et réglé :
- **« Tous les champs » s'affichait trois fois** sous le brief (`rendre()` l'appelait
  trois fois, et `corpsCampagne` une quatrième).
- **PRJ-BTS26 et son film n'étaient rattachés à aucune campagne** : « Back-To-School »,
  avec des tirets, échappait à la reconnaissance de « back to school ». Les tirets se
  lisent maintenant comme des espaces, et le rattachement tourne une seconde fois, une
  seule (`d.rattachement2`) ; la correction ne déplace que ces deux dossiers. Au même
  endroit, `aid` sans limite de mot aurait classé « Plaid » ou « aide » en Ramadan.
- Le brief d'un projet de campagne disait « il n'a pas de brief de campagne, et c'est
  normal » — vrai depuis que ce brief vit sur la campagne, mais sans y mener. Il nomme
  maintenant la campagne et y renvoie.
- Dans le socle, dix-sept filets rouges marquaient des champs qui se consultent ; seuls
  les deux qui servent à refuser gardent le bloquant.
- L'instrument de mesure comptait comme trop petits les boutons dont la zone invisible
  `::after` porte la cible à 44 px ; il les reconnaît désormais.

Mesure à 1280 et 375 px sur les dix adresses (deux dossiers × cinq sections) : zéro
sérif, zéro aplat, zéro cible sous 44 px, zéro contraste sous 4,5:1, zéro débordement,
zéro erreur console. Restent en capitales des données : codes de gamme, initiales, le
nom du dossier chez People.

**Passe 4a — Dossier : l'atelier (28/09).** La passe 4 est coupée en trois (atelier,
big idea, pistes) : Pistes seule rend 109 classes. Le compteur d'idées juniors devient
un chiffre-clé à filet ; les idées et la conversation deviennent deux sections
blanches ; une idée — ce qu'un humain a écrit — quitte le sérif pour l'Asap 500 ; les
gestes en minuscules (« retenir », « écarter », « répondre ») prennent la casse de
phrase. Tranché au §2 : l'étiquette `UI.eti` (26 emplois) perd ses capitales et garde
son signe d'état (● ◐ ✓), réécrit avec elle. Mesure à 1280 et 375 px : à zéro, hors
données.

**Passe 4b — Dossier : la big idea et son rail (28/09).** L'idée prend l'aplat
d'intention du Bureau en Asap 500 (elle était en sérif italique) ; les idées de
l'atelier deviennent une section blanche ; le rail de validation (« VALIDATION »,
« CENTRALE », « LOCALES », « ACTIVITÉ ») passe en casse de phrase. Tranché au §2 :
la ligne d'état `ETAT.ligne` et ses variantes (`.bic-etat`, `.dmd-etat`…). Signalé,
non traité : `colonneRoute` et `executions`, dans `vue-bigidea.js`, ne sont plus
appelées nulle part. Mesure à 1280 et 375 px : à zéro, hors données.

**Passe 4c — Dossier : les pistes (28/09).** Six modules composent la section
(`vue-pistes`, `vue-route`, `axe`, `priorite`, `retroplanning`, `dispositif`) ; tous
passent en casse de phrase, `UI.stat` compris. Tranché au §2 : la vignette vide
(`IMAGE.vignette`), qui portait 175 sérifs sur PRJ-BTS26. La densité, surtout : la
section de PRJ-BTS26 faisait **24 817 px**. Les 34 KV maîtres étaient de grandes
cartes à deux colonnes, une par rangée — ils passent en grille compacte ; les 155
déclinaisons, et les productions lourdes du rétroplanning, deviennent repliables, leur
tête disant le compte et ce qui cloche (maîtres dépassés, retours, débordement de
fenêtre). La section tombe à 7 463 px. Une carte sans visuel prend la hauteur de son
texte au lieu de le cacher sous son bandeau. Trouvé : `.axe` nommait deux composants
(le bloc de l'axe créatif et les puces d'axe du livrable) dont les règles
s'appliquaient l'une à l'autre — le bloc devient `.axe-bloc`. Le bouton vert plein
« Bon de commande reçu » passe au bleu du geste principal. Treize commentaires
orphelins retirés, dont celui qui imposait les capitales sous `--t-eti`, règle que le
Studio abolit. Mesure à 1280 et 375 px sur quatre dossiers : à zéro, hors données.

**Passe 5a — Dossier : la planche des KV (28/09).** La passe 5 est coupée en quatre
(planche, livrables, livraison, présentation). Chaque case de la planche perd son
dégradé noir (l'accroche et la méta y tombaient à **1,32:1**, 34 textes) pour un
bandeau opaque sous l'image ; l'accroche — ce qu'un humain a écrit — passe en Asap
500 ; le réglage de densité devient un sélecteur Studio ; chaque ligne de la planche
une section blanche. Trouvé : la base `.vignette` centrait sa piste de grille
(`justify-content: center`), si bien que le texte d'attente s'affichait centré malgré
son alignement à gauche — corrigé pour toutes les vignettes vides. `.atx-b`, reste de
l'ancien écran des attentes, retiré. Mesure à 1280 et 375 px : à zéro, hors données.

**Passe 5b — Dossier : les livrables (28/09).** Le plan de campagne à plusieurs marques
(ce qui est partagé, puis une colonne par marque), le mur par piste, marque et KV maître,
et le calendrier d'un cycle éditorial (Ecobank) passent en sections blanches ; le
message et la signature de chaque marque — ce qu'un humain a écrit — en Asap 500 ;
l'avertissement du logo ombrelle perd son encre ambre au profit d'un signe. Le basculeur
de mode (mur, grille, calendrier) devient un sélecteur Studio. Tranché au §2 : les
puces de filtre (`vtf`), partagées avec le catalogue du vault — l'active écrivait du
noir sur l'accent plein (3,28:1). Le titre de bloc peut désormais passer à la ligne
(débordement à 375 px sur Ecobank). Mesure à 1280 et 375 px sur quatre dossiers : à
zéro, hors données.

**Passe 5c — Dossier : la livraison (28/09).** La planche de livraison de PRJ-BTS26
faisait **10 929 px** : 189 cases dépliées en trois familles. En mode livraison, chaque
famille se replie (ouverte si elle est la première ou assez courte pour se lire d'un
coup) et sa tête garde le compte des visuels posés ; en mode présentation — la planche
qu'on imprime — tout reste déplié. La page tombe à 5 179 px. Le choix de mode devient
un sélecteur Studio. Mesure à 1280 et 375 px : à zéro, hors données.

**Passe 5d — Dossier : la présentation (28/09).** La salle (qui décide, quelle
structure de deck elle appelle), le montage client et ce qui en est retiré passent en
sections blanches ; les deux colonnes se partagent la largeur au lieu d'écraser la
première sous une colonne fixe de 20rem. « Présenter » et « Lire le dossier » étaient
deux boutons pleins côte à côte : le second devient un geste visible sans être une
seconde action principale. Hors passe, et assumé : la vue de lecture compilée
(`pr-dossier`, `prd-doc`), document destiné au papier avec ses propres règles
d'impression. Mesure à 1280 et 375 px : à zéro, hors données.

**Passe 6 — La fiche du livrable (28/09).** Le panneau ouvert depuis n'importe quel
livrable, sur ses trois onglets (visuels et fichiers · critères et verdict · versions et
dépendances). La porte de production, l'étage « Vous êtes ici », les packs montrés, ce
que le client en a dit, la version précédente et la mise en situation passent en
sections blanches ; libellés en casse de phrase (« Critères d'acceptation de l'idée »,
« Ce qui le fait refuser », qui étaient en capitales écrites dans le code, y compris
dans la revue du Bureau). Les signes des verdicts prenaient la couleur écrite dans la
maison (#B07714, #C7501F : **3,2:1** sur le blanc) : ils lisent désormais les jetons
par classe. Le catalogue des packs étalait **51 pastilles** sous chaque fiche Bonnet
Rouge : les packs retenus restent visibles, le catalogue se replie derrière « Choisir
les packs montrés ».

Trois défauts de fond, trouvés en passant. **Le panneau se fermait au premier clic
d'onglet** : changer d'onglet redessine la fiche, qui plantait sur deux retours relevés
de Matanga People (canal `people` inconnu). Le canal existe maintenant — relevé, absent
du formulaire de saisie —, et un canal ou une issue inconnus s'affichent au lieu de
tout faire tomber. **L'écran se contredisait** : sous une vignette affichée, la porte
disait « rien à montrer : le livrable n'existe qu'en tête ». `PRODUCTION.coutDe()`
distingue l'aperçu du fichier plat, et la porte comme l'étage lisent la même phrase.
**L'instrument comptait le contenu des `<details>` fermés** (ils gardent un
`offsetParent`) : il teste désormais `checkVisibility()` — les mesures des passes
précédentes n'en sont que plus sévères, pas moins. Mesure à 1280 et 375 px sur trois
livrables (maître avec vignette, maître sans vignette, Beignet Paradise) : à zéro, hors
données (noms de livrables et de SKU).

**Passe 7a — La marque : la lentille (28/09).** La passe 7 est coupée en trois
(lentille, page de marque, socle). La lentille « par marque » héritait du titre de la
liste des dossiers — « 2 dossiers tiennent, 99 blocages… », qui ne dit rien des
marques — et d'un sélecteur en capitales (« CE QUI NE TIENT PAS / PAR MARQUE », cibles
de 20 px) dont l'autre bouton renvoyait de toute façon à l'index Studio. Elle a
désormais son en-tête (« Vos marques. », retour vers « Vos projets »), une ligne par
marque dans une section blanche, et le filet et le signe de l'attente sur la seule
marque qui appelle un geste : celle qui a un dossier ouvert sans campagne ni cycle.
Le corpus avait versé 32 marques dont plus rien n'est ouvert : elles se replient sous
leur compte, et l'en-tête ne compte plus que les vivantes (« 27 sans rythme »
comptait 22 marques d'historique). La page tombe de **3 028 à 1 170 px**. Collision
évitée : `.mq-r` et `.mq-p` appartiennent déjà au bloc marque de `marque.js`, d'où le
préfixe `mql-`. Mesure à 1280 et 375 px : à zéro, hors données (noms de marque en
capitales).

**Passe 7b — La marque : sa page (28/09).** L'en-tête reprend celui du dossier
(pastille de marque, fil « Vos projets · Vos marques », le compte de ce qui tourne) ;
« Le portefeuille » devient un geste texte, faute d'action principale sur cette page.
Chaque campagne est une section blanche : son titre en titre de section (zone de
44 px), son régime en étiquette grise — « Temps fort », « Le cycle qui tourne » —,
et le filet vert du cycle disparaît, parce qu'un régime n'est pas un état ; le
rattachement inféré garde le signe de l'attente, c'est un contreseing dû. Les
projets sans campagne passent sous les campagnes, le socle replié en dernier. La
ligne de projet s'appelait `.dlp`, comme les carrés d'avancement du navigateur
(10 px de large d'un côté, 100 % de l'autre) : elle devient `.mpl`, écrite au §2
parce que la page de campagne la partage ; ses blocages portent le filet et le
signe, le texte reste gris. Corrigé en passant : « Les 1 projets sont clos », « 1
projets tournent » (`CAMPAGNE.etat`). Mesure à 1280 et 375 px sur Bonnet Rouge,
Beignet Paradise et NSIA (sans campagne) : à zéro.
