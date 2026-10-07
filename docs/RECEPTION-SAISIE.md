# Saisie, responsabilités et confirmations

Un champ de campagne peut être préparé manuellement quel que soit le poste. Le responsable du champ reste visible. Une saisie devient une proposition à confirmer ; elle ne crée aucun accord client. Le registre existant des inférences porte aussi ces déclarations, avec `nature: "declaration"`. Les anciennes données sans preuve restent renseignées ; leur présence seule n'est pas présentée comme un accord.

Le choix de la personne, dans Ressources → Paramètres, est propre à l'onglet et au dépôt. Les casquettes existantes sont prises en compte et peuvent être modifiées dans l'équipe. Ce choix attribue les gestes : il ne remplace pas une authentification ni un contrôle d'accès serveur.

Une confirmation consignée contient la personne, une référence, la valeur exacte, sa version et l'acteur de la saisie. Le formulaire refuse de confirmer une valeur modifiée pendant son ouverture. Corriger ensuite la valeur garde la confirmation ancienne et remet le champ en attente. Les confirmations historiques sans ces informations ne sont pas complétées artificiellement.

Corriger un contenu approuvé ouvre une version interne avec l'ancien contenu complet. Le verdict antérieur devient périmé. Approuver un document contenant des propositions en attente donne une approbation **pour travail**, sans confirmer les champs. Un verdict ne peut être rendu sur un contenu qui a changé depuis l'ouverture de son dialogue.

Les formulaires ne soumettent que les champs modifiés. Le moteur de rapprochement commun conserve les changements reçus pendant leur ouverture et demande un choix pour deux modifications du même champ. Les sélections multiples restent dans le formulaire jusqu'à l'enregistrement.

## Vérification

`npm run test:manuel` couvre la conservation des saisies, les métadonnées, les versions, les confirmations, les conflits, les rôles et l'annulation d'une sélection. `npm run test:persistance` reçoit le transport et les reprises. Le workflow GitHub les exécute sans provider IA ni données métier.

Recette native à exercer sur un dépôt synthétique : saisir un champ d'un autre poste, recharger, consigner une confirmation référencée, recharger, corriger le champ et vérifier l'ancien reçu ; choisir une personne cumulant des postes, modifier ces postes puis recharger les paramètres. Aucun accord métier réel n'est requis pour cette recette.
