# Réception de la persistance — 6 octobre 2026

Le fichier partagé avait déjà une garde `X-Base`. Sa comparaison précédait une
écriture asynchrone non sérialisée : deux requêtes pouvaient accepter la même base.
Le client répondait au conflit en rechargeant la base, perdant le dernier geste.

La correction sérialise contrôle et remplacement, identifie le contenu exact et
conserve les gestes locaux jusqu'au reçu. Le rapprochement s'appuie sur les trois
versions ; seul un désaccord réel demande un choix. Le journal conserve les deux
événements : son `id` désigne l'objet suivi, pas un identifiant d'événement.

## Preuves

- Reproduction HTTP réelle : concurrence admise à tort, tentative déjà reçue refusée,
  fichier illisible remplacé avant correction ; tests corrigés après changement.
- 23 tests Node passent : serveur isolé, rapprochement pur, transport client.
- Interface native locale, données synthétiques : deux propositions d'un même champ,
  rechargement du second onglet, deux valeurs toujours visibles, choix explicite reçu.
- Deux champs distincts réunis sans ressaisie, journal des deux gestes conservé.
- Arrêt du serveur de recette, saisie, erreur visible, fermeture de l'onglet,
  reprise dans l'autre onglet, reçu serveur et disparition de la tâche de reprise.
- Un formulaire déjà ouvert conserve son objet après rapprochement compatible.
- Le cache d'une version antérieure reste récupérable séparément à la mise à jour.
- Un ordre de pages modifié et une correction de texte se réunissent ; deux ordres
  incompatibles demandent un choix sans abandonner le contenu.

Ces preuves ne valent pas recette de production ni réception complète du SI Shinkiro.

## Limites encore ouvertes

- Authentification et séparation des entreprises à assurer par l'installation.
- Les importeurs qui écrivent directement les fichiers contournent la garde.
- Un serveur par fichier ; pas de verrou distribué.
- Le corpus, ses vignettes et les sauvegardes doivent survivre au remplacement du
  conteneur. Un déploiement ne doit jamais substituer le corpus Git aux données vivantes.
- Les règles métier et les champs verrouillés par poste ne sont pas modifiés ici.
