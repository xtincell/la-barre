# LA BARRE — DESIGN SYSTEM 2.0
### Où vit chaque section de la planche, dans le code

La planche fait foi. Ce document dit **où** chaque section est implémentée, pour que
les deux ne divergent pas — un système qui vit dans une image et un code qui vit à côté
se séparent en trois semaines.

Tout ce qui suit est dans `styles/base.css`, sauf mention contraire.

---

## 01 · Principes

Ils ne s'implémentent pas, ils s'arbitrent. Ils sont la grille de lecture des quatre
autres documents du produit : `RECONCEPTION.md` en est l'application écran par écran.

## 02 · Couleurs sémantiques

| Jeton | Valeur | Emploi |
|---|---|---|
| `--bloquant` | `#FF4D4F` | la **marque** : filet, pastille, fond |
| `--bloquant-txt` | `#FF8082` | la même, portée par du **texte** |
| `--arbitrage` | `#FFB020` | demande un jugement |
| `--succes` | `#22C55E` | validé, terminé |
| `--info` | `#3B82F6` | à consulter |
| `--neutre` | `#64748B` | par défaut |

**Pourquoi deux rouges.** `#FF4D4F` donne 4,48:1 sur la surface la plus élevée — sous le
minimum AA de 4,5 exigé au §14, d'un centième. Une couleur a deux métiers et un seul est
soumis à cette règle : comme marque elle reste exactement celle de la planche, comme texte
elle s'éclaircit juste assez (5,6:1). Les 118 emplois de texte ont basculé, les 22 emplois
de marque n'ont pas bougé.

**Les neutres.** `#64748B` est le pas 500 de la famille ardoise : l'échelle N100→N900 en
découle. `--n950` prolonge la série vers le bas — la toile du produit est plus profonde
que N900, c'est ce qui donne sa tenue au sombre.

**Les anciens noms sont tenus comme alias** (`--nuit`, `--alerte`, `--attente`, `--vert`).
Soixante-cinq modules les emploient ; les faire pointer sur la nouvelle gamme a recoloré
tout le produit sans toucher une ligne de vue.

## 03 · Typographie

Sept pas, chacun avec **sa taille, son interligne et son approche** — une taille sans son
interligne n'est pas un pas de gamme, c'est un chiffre.

| Pas | Jetons | Spécifié |
|---|---|---|
| Display | `--t-display --lh-display --ls-display` | 40/48 −0.02em |
| H1 | `--t-ecran` | 32/40 −0.01em |
| H2 | `--t-h2` | 24/32 −0.01em |
| H3 | `--t-titre` | 20/28 0 |
| Body 1 | `--t-lire` | 16/24 0 |
| Body 2 | `--t-meta` | 14/20 +0.01em |
| Caption | `--t-eti` | 12/16 +0.02em |

`--t-micro` (11px) prolonge la gamme d'un cran sous Caption. Il ne porte jamais de texte à
lire : seulement des libellés en capitales espacées, qui se lisent plus grands que leur
taille. C'est une extension assumée, pas un huitième pas.

**Les 643 emplois de jetons ont reçu leur interligne et leur approche** par reprise
mécanique. Les 226 déclarations locales déjà présentes ont été respectées : un interligne
écrit à la main est un choix, pas un oubli.

**Satoshi n'est pas une police système.** La pile de repli tient la même largeur d'œil.
Pour l'installer : déposer les fichiers dans `styles/polices/` et les déclarer en
`@font-face` — le jeton `--affichage` la nomme déjà en tête de pile.

## 04 · Espacement & rayons

`--e1`…`--e13` — base 4, treize pas : 4 8 12 16 20 24 32 40 48 64 80 96 128.

`--r-xs` 4 · `--r-s` 6 · `--r-m` 8 · `--r-l` 12 · `--r-xl` 24 · `--r-pilule` 999.

> La planche note le quatrième rayon **11px**. La gamme est en base 4 et la progression
> 4·6·8·**12**·24 est celle qui s'y range : j'ai retenu 12. À corriger en une ligne si
> l'intention était bien 11.

**Un rayon dit la nature de l'objet** : `--r-s` pour ce qui se clique (boutons, champs),
`--r-m` pour ce qui se lit (cartes), `--r-l` pour ce qui flotte (panneau, résultats),
`--r-pilule` pour les jauges et les badges de compteur.

## 05 · Surfaces & élévation

`--surface-1` élevée (ce qui flotte) → `--surface-4` sombre (la toile). Ce qui est en
avant est plus clair, ce qui est en retrait plus sombre — l'inverse du réflexe, et c'est
ce qui marche en sombre.

`--elev-0` à `--elev-4`. **Une ombre sur un élément qui ne survole rien est une
décoration** : seuls le panneau (`--elev-4`), les résultats de recherche et la capture
(`--elev-3`), et les cartes au survol (`--elev-2`) en portent.

## 06 à 12 · Composants

Ils vivent dans `styles/systeme.css` (les composants nommés de `app/ui.js`),
`styles/commande.css` et `styles/planche.css` (les écrans). Les rayons, l'élévation, le
mouvement et le focus leur sont appliqués **par famille** depuis `base.css` — jamais
écran par écran.

## 13 · Interactions & mouvement

`--tr-rapide` 150ms (changements d'état) · `--tr-standard` 200ms · `--tr-lente` 300ms ·
`--easing` ease-out.

- **Hover** : un cran d'élévation, et rien de plus — pas de saut, pas de zoom.
- **Pressed** : `scale(--pressed)` = 0.98, opacité 80 %.
- **Focus** : anneau 2px, offset 2px, sur `:focus-visible` seulement — la souris ne le
  déclenche pas, le clavier toujours. **Il ne se retire jamais** : un outil qui se tient
  au clavier se perd dès qu'on ne voit plus où l'on est.
- `prefers-reduced-motion` coupe tout.

## 14 · Accessibilité

**Contrastes.** Mesurés sur les 35 adresses, composition alpha comprise :
**zéro texte sous 4,5:1, le pire à 5,71:1.** La mesure est refaite à chaque passe — elle
est reproductible, pas déclarative.

**Cibles d'interaction.** 44×44 (`--cible`) partout. Deux techniques :
les vrais boutons et les contrôles qui ont la place la prennent en `min-height` ; les
liens de texte en ligne, qui vivent dans des lignes denses, la prennent par une zone
invisible en `::after` — la cible grandit, la ligne non.

**Jamais la couleur seule.** Chaque étiquette d'état porte un signe avant son texte :
● bloquant · ◐ arbitrage · ✓ validé. Un état encodé par la seule couleur n'existe pas
pour qui ne la distingue pas.

**Navigation clavier.** Ordre logique du DOM, focus visible, `Échap` ferme tout panneau.

---

## Ce qui reste à faire

1. **Déposer Satoshi** dans `styles/polices/` et la déclarer en `@font-face`.
2. **Trancher le rayon 11 ou 12 px** (§04 ci-dessus).
3. **Migrer les noms d'alias** (`--nuit`, `--alerte`, `--attente`, `--vert`) vers les noms
   sémantiques dans les 65 modules. Sans urgence : les alias sont corrects et stables.
