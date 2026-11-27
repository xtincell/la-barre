/* chaine-brief.js — la chaîne de traitement d'un brief.
 *
 * Ce n'est plus un écran. Traiter un brief n'est pas le lire : c'est une chaîne
 * de six gestes, et cette chaîne se lit à deux endroits qui existent déjà —
 * le navigateur à trois temps d'un dossier, et la file de Décider, qui dit
 * lequel s'est arrêté et où.
 *
 * Les indicateurs sur lesquels je suis évalué sont partis dans Constater : ils
 * regardent le mois, pas la journée.
 *
 * Ce module ne porte donc plus que le modèle : les six gestes, et où chaque
 * dossier en est.
 */

window.CHAINE_BRIEF = (function () {
  var el = O.el;

  /* Les cinq gestes du traitement, dans l'ordre où ils se conditionnent. */
  var CHAINE = [
    { cle: "accepte", nom: "Brief accepté", afaire: "brief à accepter", section: "brief",
      quoi: "les onze champs critiques, le décideur, la clause de frontière",
      fait: function (p) { return VALIDATION.valide(p.sections.brief || {}); } },
    { cle: "socle", nom: "Plateforme de marque", afaire: "plateforme de marque à établir", section: "socle",
      quoi: "reçue du client, ou élaborée ici",
      fait: function (p) { return !!(p.sections.socle || {}).idee_directrice; } },
    { cle: "strategie", nom: "Stratégie", afaire: "stratégie à définir", section: "strategie",
      quoi: "territoire, insight, tension — reçus du Planning ou définis",
      fait: function (p) { return !!(p.sections.strategie || {}).territoire; } },
    { cle: "atelier", nom: "Atelier", afaire: "atelier à tenir", section: "atelier",
      quoi: "la séance qui affine la plateforme de marque et la stratégie, et où les idées se posent",
      fait: function (p) { return (VUE_ATELIER.idees(p) || []).length > 0; } },
    { cle: "bigidea", nom: "Big idea", afaire: "big idea à définir", section: "bigidea",
      quoi: "la séance de définition — je la gouverne, je n'ai pas le monopole de l'idée",
      fait: function (p) { return !!(p.sections.bigidea || {}).idee
        && ((p.sections.bigidea || {}).criteres || []).length > 0; } },
    { cle: "demande", nom: "Demande au DA", afaire: "demande au DA à envoyer", section: "pistes",
      quoi: "avec son périmètre d'expression — sinon le DA exécute au lieu de proposer",
      fait: function (p) { return DEMANDE.toutes(p).some(function (d) { return d.etat !== "brouillon"; }); } },
  ];

  /* Les gestes que la nature du dossier porte. Un geste dont la section
   * n'existe pas pour elle ne se réclame pas : son dossier ne l'affiche nulle
   * part, et la ligne de la file ne pourrait jamais se lever. Un pitch n'a ni
   * brief à accepter ni plateforme de marque, mais il a sa stratégie, son
   * atelier, sa big idea et sa demande au DA. Un packaging n'a que son brief.
   * Une demande simple n'en a aucun : la file ne lui réclame rien, comme son
   * dossier. */
  function etapes(p) {
    if (!window.NATURE) return CHAINE;
    return CHAINE.filter(function (c) { return NATURE.aSection(p, c.section); });
  }

  function avancement(p) {
    var es = etapes(p);
    var faits = es.filter(function (c) { return c.fait(p); });
    return { faits: faits.length, total: es.length,
      prochain: es.filter(function (c) { return !c.fait(p); })[0] || null };
  }

  return { CHAINE: CHAINE, etapes: etapes, avancement: avancement };
})();
