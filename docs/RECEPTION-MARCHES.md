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
