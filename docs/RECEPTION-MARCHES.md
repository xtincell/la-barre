# Réception des marchés et des formats

Un référentiel absent ne prouve pas une conformité. La planche indique désormais
que la langue, les SKU distribués et les mentions restent à vérifier quand ces
informations manquent. La préparation des formats demeure accessible : ces
inconnues ne deviennent ni un accord ni une interdiction de travailler.

Le bouton « Décliner » utilisait une variable `volets` inexistante et échouait
avant la création du format. Il initialise maintenant les points de recevabilité
dans le champ courant `points`. Le format conserve marché, piste, master et
version du master ; aucun verdict n’est créé.

`npm run test:marches` reçoit les références absentes, incomplètes et renseignées,
les vrais écarts et le geste de déclinaison. Les tests de persistance et de saisie
restent nécessaires. La recette native utilise un dossier synthétique isolé :
création d’un format malgré les inconnues, puis rechargement et lecture du lien
au master V3. Elle ne produit aucun fichier client.

Limites : une liste de mentions vide ne distingue pas encore une absence de
référentiel d’une absence d’obligation explicitement attestée. Le contrôle
s’abstient donc de déclarer la conformité. Le rattachement du premier KV au
master commun, les écarts autorisés par marché, leur réception locale et leur
circulation dans Radar restent à recevoir dans le programme Shinkiro. Ces deux
corrections ne reçoivent pas à elles seules le Market Expansion System.

## Commun, adaptation et format

La planche et la piste utilisent désormais la même commande. Un master commun
n'a ni marché ni parent ; une adaptation choisit un master du dossier et une
destination. Les formats peuvent venir d'une adaptation ou directement du
commun. La langue n'est préremplie que si le marché en possède une seule.
Aucun ancien dossier n'est reclassé ni réécrit par cette livraison.

« Régler » appelait `KV.champs`, qui n'existait pas. Il utilise les axes actuels,
rapproche les champs reçus pendant la saisie, puis archive une version complète
avant la correction. Enregistrer sans changement n'ouvre aucune version.

La péremption remonte toute la chaîne, y compris une référence disparue ou une
boucle ; la lecture des descendants termine même sur une boucle ancienne. La
porte de production et le mur utilisent cette même règle. Le travail reste
consultable et modifiable.

Dans « Versions et dépendances », une reprise se reçoit après examen de la
référence et du travail, avec motif et confirmation explicite. Le geste ouvre
une version et actualise seulement la version du parent utilisée. Il ne copie
aucun contenu, fichier ou accord. Une référence changée pendant la lecture ou
elle-même périmée refuse la réception. La préparation reste disponible.

Les quinze scénarios marchés couvrent ces gestes, les changements concurrents,
les anciens accords conservés et la propagation jusqu'aux formats. La recette
native reçoit un master, une adaptation A et son format, un format B sans
adaptation, la correction du commun puis la reprise de A. Les fichiers et BAT
client, l'attribution authentifiée, le raccord Radar et les marchés réels de
Noël restent à recevoir. Le critère historique « accroche ≤ 5 mots » reste
présent ; sa portée par méthode/projet doit encore être auditée.
