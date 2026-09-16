# Normaliser un dossier ancien

**Pour un agent.** Comment amener un dossier de LA BARRE au standard du nouveau
système — la chaîne du raisonnement, les trois documents, la reco arbitrée —
sans rien inventer et sans rien casser.

Le dossier de référence est **MT-0042 · Beignet Paradise** : zéro blocage, six
sections à 100 %, deux insights à leur couche, un territoire avec sa convention,
trois pistes avec leurs rôles, trois documents qui compilent. C'est l'état à
atteindre, pas un idéal.

---

## La règle qui gouverne tout le reste

> **On ne fabrique jamais le contenu d'un client.**

Un agent qui normalise un dossier **range**, **relève** et **relie**. Il n'écrit
pas un insight à la place du planneur, ne nomme pas un décideur, n'invente pas
une convention de catégorie. Ce qu'il ne sait pas, il le laisse vide — et le
produit dira lui-même ce qui manque, avec son coût.

Trois conséquences pratiques :

- **Un champ vide est une information.** Le remplir au jugé transforme un
  blocage honnête en donnée fausse, et la donnée fausse ne se voit plus.
- **Ce qui vient d'un document existant se cite.** Un brief PDF, un deck, un
  compte rendu : on transpose, on ne reformule pas.
- **Ce qui manque se demande.** Le playbook indique à qui, à chaque étape.

Et sa réciproque, qui est la moitié utile du travail :

> **Beaucoup de blocages se ferment par l'écrit, pas par le travail.**

`decalage-de-couche` ne demande pas de refaire la campagne : il demande d'écrire
l'écart au brief-back. `insight-non-teste` ne demande pas un nouvel insight :
il demande de répondre à trois questions. Distinguer les deux, c'est la
différence entre une normalisation d'une heure et un chantier de trois jours.

---

## Où on en est aujourd'hui

Relevé sur les huit dossiers. **54 blocages**, et la chaîne du raisonnement
n'existe que sur MT-0042.

| Dossier | Bloc. | Insights | Territoire | Pistes rattachées | Brief-back | Écoles | Livrables |
|---|---|---|---|---|---|---|---|
| **MT-0042** Beignet Paradise | **0** | 2 · testés · sourcés | 1 · disruption | 3 / 3 · rôles posés | ✓ | 2 | 18 · nature posée |
| MT-0049 Bonnet Rouge — Film TV | 18 | 1 · sans couche | — | 0 / 1 | — | — | 5 |
| MT-0048 Panzani | 11 | — | — | 0 / 0 | — | — | 59 |
| MT-0047 Ecobank *(cycle)* | 10 | — | — | 0 / 1 | — | — | 17 |
| MT-0043 Back-To-School | 8 | — | — | 0 / 1 | — | — | 189 |
| MT-0044 Mamy Makala | 7 | — | — | 0 / 1 | — | — | 0 |
| MT-0046 La Vache qui rit | 7 | — | — | 0 / 1 | — | — | 1 |
| MT-0045 Bonnet Rouge — EOTY | 3 | — | — | 0 / 0 | — | — | 0 |

> Les blocages ne disent pas tout. En parallèle, l'état de livraison :
> MT-0043 porte 175 livrables sans aucune trace, MT-0048 en porte 12 **annoncés
> faits alors que rien n'est au dossier**, MT-0047 12 remises dépassées. C'est
> un autre compte, traité à l'étape 7.4.

**Par où commencer.** Pas par le plus bloqué. **MT-0045** (3 blocages, tous des
contreseings) se normalise en vingt minutes et valide la procédure. **MT-0049**
(18 blocages) est le cas dur et doit venir en dernier — c'est aussi celui qui a
un insight migré sans couche, donc le seul où l'étape 2 commence à moitié faite.

**MT-0047 est un cycle éditorial** : le gabarit `cycle` n'a pas de section
`planche`, et un territoire à un seul concept y est **normal** — un mois ne met
pas deux routes en concurrence. Les contrôles le savent déjà ; ne pas forcer.

---

## Étape 0 · Relever avant de toucher

Ouvrir le dossier, console du navigateur. **Ne rien écrire à cette étape.**

```js
const p = DEPOT.liste('projets').find(x => x.ref === 'MT-00XX');
const bl = REGLES.blocages(p.id);
console.table(bl.map(b => ({ type: b.type, quoi: b.quoi, section: b.section })));
```

Puis l'état des sections à champs :

```js
['identite','brief','briefback','socle','strategie','bigidea'].forEach(c => {
  const e = CHAMPS.etat(c, p.sections[c] || {});
  console.log(c, e.fait + '/' + e.total, e.manquants.map(x => x.nom).join(' · '));
});
```

**Noter le compte de départ.** C'est contre lui qu'on vérifiera à la fin, et
c'est lui qui dit si une étape a fait tomber ce qu'elle devait faire tomber.

---

## Étape 1 · Cadrer — ce qui n'appelle aucun jugement

Ces champs existent presque toujours ailleurs : dans le brief reçu, dans un
mail, dans la tête du commercial. Ils se transposent.

| Geste | Ferme | Qui sait |
|---|---|---|
| Nommer le décideur final | `decideur-absent` | Direction Clientèle |
| Nommer qui peut annuler une idée validée | `tueur-absent` | Direction Clientèle |
| Poser la fenêtre de diffusion | `fenetre-absente` | Clientèle · client |
| Nommer le porteur du brief | `brief-sans-porteur` | Direction Clientèle |
| Affecter un Directeur Artistique | `da-absent` | vous |

**Les inférences.** L'ingesteur a rempli des champs par déduction : utilisables
pour travailler, **pas opposables au client**. Elles se contresignent une par
une, et le contreseing dit qui a confirmé.

```js
INFERENCE.liste(p).forEach(x => console.log(x.section + '.' + x.champ, '—', x.pourquoi));
// après relecture avec la personne qui sait :
INFERENCE.contresigner(p, 'brief', 'kpis', 'CT-xxxx');
DEPOT.enregistrer();
```

> À l'écran : le blocage « N champs tiennent sur une inférence » porte un bouton
> **faire contresigner →** qui ouvre le panneau. Le passer par là plutôt que par
> la console quand une personne relit avec vous.

**Ne pas contresigner en masse.** Un contreseing est une affirmation : quelqu'un
a lu et confirmé. Contresigner sans relire remplace un doute visible par une
fausse certitude — exactement ce que le produit sert à éviter.

---

## Étape 2 · La racine — insight, puis territoire

C'est l'étape qui demande du vrai travail, et la seule qui ne se bâcle pas.
Elle ouvre tout le reste : sans racine, les pistes ne remontent à rien et le
dossier ne peut pas être arbitré.

### 2.1 — L'insight

Si le dossier porte déjà un paragraphe d'insight (migration du schéma 2), il
est devenu un objet **sans couche, sans sources, sans test**. On le qualifie ;
on ne le réécrit pas.

```js
let i = INSIGHT.liste(p)[0] || INSIGHT.creer(p);
```

Quatre choses à poser, dans cet ordre :

**La couche** — et c'est la décision, pas un étiquetage. Elle décide du livrable.

| Couche | Ce qu'on y cherche | Ce qu'elle commande |
|---|---|---|
| `consommateur` | une tension vécue, à la première personne | le message et le ton |
| `culture` | une contradiction que la société porte sans la résoudre | la big idea |
| `categorie` | une convention que tous les concurrents tiennent pour acquis | le positionnement |
| `entreprise` | l'écart entre ce que la marque promet et ce qu'elle livre | une correction de marque |

> L'ordre de travail recommandé est **catégorie → culture → consommateur →
> entreprise**. Commencer par le consommateur est le réflexe le plus répandu et
> le plus coûteux : on trouve une jolie tension dans un espace déjà pris.

**Les trois temps** — `situation`, `tension`, `empeche`. Le troisième est celui
qu'on oublie et c'est lui qui sépare un insight d'un constat. S'il se supprime
sans rien perdre, l'énoncé décrit au lieu d'ouvrir. Ferme
`insight-est-un-constat`.

**Les sources** — trois croisées au minimum (réglable :
`MAISON.doctrine.sourcesCroisees`). Terrain direct · employés de première ligne
· mur de catégorie · culture qui circule · donnée publique. Ferme
`insight-une-source`.

**Le test** — trois questions, répondues par oui ou non :

1. Quelqu'un pourrait-il dire le contraire ?
2. Est-ce que ça met légèrement mal à l'aise ?
3. Est-ce qu'une idée arrive toute seule ?

Trois oui : c'est un insight. Deux : une tension à creuser. Un : on recommence.
Ferme `insight-non-teste`.

> À l'écran : **Stratégie → Écrire / Tester / N sources**. Les trois panneaux
> portent l'aide et les cinq imposteurs. Préférer l'écran à la console — il
> rappelle ce qu'on est en train de rater.

### 2.2 — Le décalage de couche

Une fois la couche posée, ce contrôle peut se lever. **Il ne demande pas de
refaire le dossier.**

```js
INSIGHT.decalage(p, i);   // null, ou {quoi, cout}
```

Trois cas, et le même remède :

- insight `entreprise` sur un dossier de campagne → on communique par-dessus un
  écart de service ;
- insight `culture` sans big idea ouverte → une contradiction sociale traitée en
  message ;
- insight `categorie` sans positionnement ouvert → une idée dans un espace pris.

**Il se ferme en écrivant `briefback.ecart`** — pas en changeant le brief. C'est
la règle du métier rendue mécanique : *on obéit au brief, on documente le
désaccord*. Voir l'étape 3.

### 2.3 — Le territoire

```js
const t = TERRITOIRE.creer(p, i.id);
t.nom = '…';   // court, retenable : c'est ce que le client répétera
t.quoi = '…';  // l'espace, pas l'idée — plusieurs concepts doivent y vivre
DEPOT.enregistrer();
```

Si le dossier portait un paragraphe `strategie.territoire`, la migration l'a
déjà mis dans `t.quoi`. Il reste à le nommer et à le rattacher.

Ferme `piste-hors-territoire` une fois les pistes rattachées (2.4).
`territoire-a-un-concept` reste ouvert tant qu'une seule piste l'occupe — et
c'est juste, sauf en gabarit `cycle` où le contrôle se tait de lui-même.

### 2.4 — Rattacher les pistes

```js
(p.sections.pistes || []).forEach(pi => { if (!pi.territoireId) pi.territoireId = t.id; });
DEPOT.enregistrer();
```

**Ne rattacher au même territoire que ce qui en descend vraiment.** Deux pistes
qui traitent deux problèmes différents ne se rangent pas sous une racine
commune pour faire tomber un contrôle : c'est précisément ce que l'étape 7
vérifie.

### 2.5 — L'école, par étage

Optionnel mais bon marché, et ça engendre la preuve attendue.

```js
p.ecoles = { insight: 'account-planning', territoire: null, diffusion: 'ehrenberg-bass' };
t.ecole = 'disruption';   // l'école du territoire vit sur le territoire
DEPOT.enregistrer();
```

Une école par étage — `insight`, `territoire`, `diffusion`. Le mélange tient
quand chacune en gouverne un différent. Déclarer une école **crée une dette** :
Disruption réclame la convention prouvée en trois visuels de concurrents,
Brutal Simplicity le chemin de réduction, Account Planning un insight qui passe
le test. Ne déclarer que ce qu'on peut porter.

```js
ECOLES.declarees(p).forEach(x => console.log(x.cle, ECOLES.preuve(p, x.cle, x.etage)));
```

> Le catalogue complet, avec ce que chaque école réclame : **RÉFÉRENTIEL →
> DOCTRINE**. Chaque blocage de cette famille y renvoie par **pourquoi →**.

---

## Étape 3 · Le brief-back

Trois lignes, et une quatrième que le produit exige.

| Champ | Ce qu'on y met |
|---|---|
| `compris` | le problème reformulé dans nos mots, en une phrase |
| `couche` | où nous pensons qu'il vit — sans jargon |
| `propose` | le livrable, nommé |
| `ecart` | si le livrable diffère de ce qui est demandé, **c'est ici** |

Sur un dossier ancien, le brief-back est **rétrospectif** : on écrit ce qui a
été compris et proposé à l'époque. C'est légitime et utile — il redevient
citable. Le dater honnêtement (`envoye_le` vide si rien n'est jamais parti).

Ferme `briefback-absent`, et ferme `decalage-de-couche` dès que `ecart` est
rempli. `briefback-sans-reponse` ne se lève que si `envoye_le` est posé sans
`reponse` : ne pas inventer une date d'envoi.

---

## Étape 4 · Concevoir

| Geste | Ferme |
|---|---|
| Poser les idées de la séance avec leur auteur, en retenir une, écrire le motif | — *(fonde l'attribution)* |
| Nommer l'auteur de la big idea | `auteur-absent` |
| Écrire les critères d'acceptation | `criteres-absents` |
| Rattacher la big idea à la plateforme de marque, ou justifier l'écart | `rattachement-absent` |
| Écrire les quatre champs de l'axe sur chaque piste vive | `axe-absent` |
| Donner des tons distincts aux pistes | `axe-jumeau` |
| Arbitrer : retenir une piste, avec son motif | `arbitrage-absent` |
| Poser les rôles — sage / défendue / radicale | `pistes-sans-role` |
| Écrire l'intégrité de la piste défendue | `integrite-non-ecrite` |
| Écrire les trois raisons de la recommander | `reco-sans-arbitrage` |

**L'intégrité** est le champ qu'on saute et celui qui protège le travail : *ce
qui casse si le concept d'une piste est monté sur l'exécution d'une autre*. Sur
un compte à comités en cascade, c'est la seule pièce écrite qui tienne entre
deux étages de validation.

**Les trois raisons, dans cet ordre, sans superlatif** : réponse au brief,
potentiel de durée, capacité de la marque à la porter.

> Une piste écartée (`statut: 'ecartee'`) ne réclame ni axe ni rôle. Écarter ce
> qui est mort est un geste de normalisation légitime — et moins coûteux que de
> le compléter.

---

## Étape 5 · Produire

| Geste | Ferme |
|---|---|
| Un responsable par livrable | `sans-proprietaire` |
| Rattacher chaque livrable à une piste | `livrable-sans-piste` |
| Déclarer la nature : `marque` ou `activation` | — *(ouvre la lecture 60/40)* |
| Chaque chiffre porte sa source et son niveau | `chiffre-sans-source` |

**La nature** se pose en lot quand la logique est claire :

```js
const ACTIVATION = ['D-gondole', 'D-stoprayon'];      // point de vente, achat immédiat
p.livrables.forEach(l => { l.nature = ACTIVATION.indexOf(l.id) !== -1 ? 'activation' : 'marque'; });
DEPOT.enregistrer();
```

Un écart au 60/40 **n'est pas une faute** : c'est une lecture, et sur un
lancement 78/22 est correct. Le produit l'affiche avec sa réserve et ne lève
rien.

**Les chiffres** portent leur niveau sur une échelle qui descend : `maison` ·
`voisine` · `comparable` · `declaratif`. On prend le plus haut atteignable et on
le dit. Si aucun n'est atteignable, ce n'est pas le diagnostic qui manque :
c'est la structure Consulting qui n'est pas la bonne.

---

## Étape 6 · La reco

```js
RECO.lireLaSalle(p);   // {salle, structures, integrite, pourquoi, sur}
```

La lecture se calcule sur le décideur, le tueur d'idée et le circuit — trois
champs posés à l'étape 1. Si `sur: false`, la lecture est une supposition et le
dit : ne pas la traiter comme un fait.

Choisir la structure (**Présentation → Choisir la structure**), puis vérifier
que la page d'arbitrage est au montage dès qu'il y a deux pistes. Un deck qui
mélange deux squelettes lève `structure-hybride`.

---

## Étape 7 · Passe de cohérence

Les contrôles précédents regardent chacun une chose. **Cette passe regarde si
l'ensemble tient debout.** Un dossier peut avoir zéro blocage et rester
incohérent.

### 7.1 — Le test d'une minute

```js
const r = RECO.racines(p);
// {nRacines, nVives, concurrents, orphelines, maigres}
```

**Si `nRacines > 1`, ce ne sont pas des axes : ce sont des recommandations
concurrentes.** Le client recomposera, et il sortira autant de signatures que
de pistes.

Deux issues honnêtes, jamais une troisième :

- les pistes traitent bien le même problème → une seule racine, on rattache ;
- elles traitent des problèmes différents → **ce n'est pas un deck, c'est
  deux.** On scinde, ou on écarte.

Ne jamais rattacher de force pour éteindre le contrôle.

### 7.2 — Deux écoles au même étage

`ecoles-meme-etage` ne se lève que si les deux écoles apportent **des racines
différentes**. Deux écoles au même étage sur la même racine ne se neutralisent
pas — c'est la nuance qui sauve le contrôle de la bêtise, et il faut la
respecter en corrigeant : soit une seule école par étage, soit une racine
commune.

### 7.3 — La couche et le livrable

```js
INSIGHT.liste(p).forEach(i => console.log(i.couche, '→', INSIGHT.commande(i.couche), INSIGHT.decalage(p, i)));
```

Un insight de catégorie sur un dossier qui ne rouvre pas le positionnement
produit une idée dans un espace déjà pris. Le contrôle le dit ; l'écrit au
brief-back le ferme. **Vérifier que l'écart écrit dit vraiment quelque chose** —
un `ecart` rempli de « RAS » ferme le contrôle et ment.

### 7.4 — Le tableau contre le disque *(dossiers de parc)*

Sur un dossier de reprise — Panzani est le cas type — deux sources se
contredisent : ce que le tableau client annonce, et ce qui est au dossier.

```js
TRACE.enSouffrance(x => x.id === p.id).filter(x => x.s.cle === 'dement');
```

`exe-annonce-absent`, `codebarre-sur-exe-absent`, `releve-contredit` ne se
ferment **pas** en corrigeant le produit : ils se ferment en tranchant avec le
client quelle source fait foi. Les laisser ouverts est plus honnête que de les
éteindre.

> **La souffrance n'est pas un blocage.** MT-0042 est à zéro blocage et compte
> 18 livrables en souffrance — tous `aTracer` : le travail n'est simplement pas
> encore produit. Ne pas confondre les deux comptes. Seul `dement` — annoncé
> fait, rien au dossier — appelle un arbitrage avec le client.
>
> Relevé aujourd'hui : **MT-0048 est le seul dossier qui en porte** (12 sur 59).
> MT-0047 en compte 12 `depasse` — des remises passées, ce qui est un retard,
> pas un mensonge. Les autres n'ont que du `sansTrace` ou de l'`aTracer`.

### 7.5 — Hygiène de données

Le piège qui a déjà mordu : **un champ déclaré en liste rempli avec une chaîne**.
Le rendu blanchissait un écran entier.

```js
const LISTES = ['rtb','mandatories','livrables_attendus','kpis','criteres','interdits','phares',
  'benefices','preuves','jamais','symboles','ne_fera_pas','gardefous','accroches','porteurs','raisons'];
(function verifier(o, ou) {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) return o.forEach(x => verifier(x, ou));
  Object.keys(o).forEach(k => {
    const v = o[k];
    if (LISTES.indexOf(k) !== -1 && v != null && !Array.isArray(v)) console.warn('SCALAIRE', ou, k, v);
    else if (v && typeof v === 'object') verifier(v, ou);
  });
})(p, p.ref);
```

Vérifier aussi : `maitre-perime` (des adaptations sur une version qui n'a plus
cours) et `axe-jumeau` (deux pistes au même ton ne font pas un choix).

---

## Étape 8 · Passe de vérification

### 8.1 — Le dossier

```js
REGLES.blocages(p.id).length;                                   // attendu : 0
['identite','brief','briefback','socle','strategie','bigidea']
  .map(c => c + ' ' + (e => e.fait + '/' + e.total)(CHAMPS.etat(c, p.sections[c] || {})));
RECO.racines(p).nRacines;                                       // attendu : 1
```

Un blocage qui reste doit être **un blocage vrai** — un fait du dossier que
personne n'a encore tranché — et pas un champ oublié. Le dire dans le compte
rendu plutôt que de l'éteindre.

### 8.2 — Les trois documents compilent

```js
['cadrage','conception','production'].forEach(c => {
  const d = COMPILATEUR.compiler(p, c);
  const m = COMPILATEUR.controles(p, c).filter(x => !x.ok);
  console.log(c, d.blocs.filter(Boolean).length + ' blocs', m.length + ' conditions non remplies',
    m.map(x => x.quoi).join(' · '));
});
```

### 8.3 — Le dossier se lit, s'imprime, se publie

À l'écran : **Présentation → Lire le dossier**. Vérifier que les trois documents
sont là, que les pages du deck suivent, et qu'aucune section ne dit « la source
est vide » sans raison.

Puis **Exporter en cas client** — le fichier doit peser quelques mégaoctets,
porter ses visuels et n'avoir aucun script.

### 8.4 — La passe du produit

Sur les adresses du dossier, bureau **et** 375 px :

```js
const adr = ['identite','brief','briefback','socle','strategie','atelier','bigidea',
             'pistes','planche','livrables','livraison','presentation']
  .map(s => '#/projets/' + p.id + '/' + s);
const bugs = []; window.onerror = m => bugs.push(location.hash + ' :: ' + m);
for (const a of adr) {
  location.hash = a; await new Promise(r => setTimeout(r, 320));
  const z = document.querySelector('.zone');
  if (!z || !z.textContent.trim()) bugs.push(a + ' :: vide');
  const d = document.documentElement.scrollWidth - window.innerWidth;
  if (d > 2) bugs.push(a + ' :: debord ' + d);
}
console.log(bugs);   // attendu : []
```

Zéro erreur console · zéro débordement · zéro écran vide · zéro texte hors de
l'échelle à huit crans · zéro contraste sous 4,5:1 · zéro cible sous 44 px.

> **Attention à la mesure.** Si le panneau du navigateur est masqué,
> `clientWidth` vaut 0 et le calcul de débordement rend n'importe quoi. Fixer
> une largeur explicite avant de mesurer.

### 8.5 — Le dépôt

`DEPOT.enregistrer()` écrit dans le fichier. Avant toute passe de
normalisation : **archiver le dépôt**.

```
cp depots/beignet-paradise.json "depots/archive/avant-normalisation-$(date +%Y%m%d-%H%M%S).json"
```

On archive, on ne supprime pas.

---

## Le compte rendu

À la fin de chaque dossier, écrire trois choses — c'est ce qui rend la passe
suivante possible :

1. **Ce qui est tombé** : blocages avant → après, et lesquels.
2. **Ce qui reste ouvert, et pourquoi.** Un blocage qui demande une décision du
   client n'est pas un échec de normalisation : c'est un fait. Le nommer.
3. **Ce qui a été supposé.** Toute valeur posée sans source doit être listée
   pour relecture — sinon elle devient vraie par le seul fait d'être écrite.

---

## Ordre recommandé

| Rang | Dossier | Pourquoi ici |
|---|---|---|
| 1 | **MT-0045** Bonnet Rouge — EOTY | 3 blocages, tous des contreseings. Valide la procédure en vingt minutes |
| 2 | **MT-0044** Mamy Makala | 7 blocages, aucun livrable : la chaîne se pose à vide, sans risque |
| 3 | **MT-0046** La Vache qui rit | 7 blocages, 1 livrable déjà produit — le cas « reconstitué après coup » |
| 4 | **MT-0047** Ecobank | gabarit `cycle` : vérifier que les contrôles se taisent là où ils doivent |
| 5 | **MT-0043** Back-To-School | 189 livrables : l'étape 5 se fait en lot, jamais un par un |
| 6 | **MT-0048** Panzani | dossier de parc : la passe 7.4 est l'essentiel du travail |
| 7 | **MT-0049** Bonnet Rouge — Film TV | 18 blocages, le cas dur. Un insight migré à qualifier |

---

## Ce que ce playbook ne couvre pas

- **La création.** Écrire un insight juste, trouver un territoire, arbitrer
  entre trois routes : ce sont des actes de métier, pas de normalisation. Le
  playbook dit où ils manquent et ce qu'ils coûtent ; il ne les remplace pas.
- **Les décisions client.** Décideur final, fenêtre, circuit, arbitrage entre
  deux sources qui se contredisent : ça se demande.
- **La doctrine.** Elle est dans `sources/07_doctrine/` et consultable dans
  **RÉFÉRENTIEL → DOCTRINE**. Chaque contrôle de la chaîne y renvoie par
  **pourquoi →**.
