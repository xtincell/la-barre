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
    { cle: "accepte", nom: "Brief accepté", section: "brief",
      quoi: "les onze champs critiques, le décideur, la clause de frontière",
      fait: function (p) { return VALIDATION.valide(p.sections.brief || {}); } },
    { cle: "socle", nom: "Plateforme de marque", section: "socle",
      quoi: "reçue du client, ou élaborée ici",
      fait: function (p) { return !!(p.sections.socle || {}).idee_directrice; } },
    { cle: "strategie", nom: "Stratégie", section: "strategie",
      quoi: "territoire, insight, tension — reçus du Planning ou définis",
      fait: function (p) { return !!(p.sections.strategie || {}).territoire; } },
    { cle: "atelier", nom: "Atelier", section: "atelier",
      quoi: "la séance qui affine le socle et la stratégie, et où les idées se posent",
      fait: function (p) { return (VUE_ATELIER.idees(p) || []).length > 0; } },
    { cle: "bigidea", nom: "Big idea", section: "bigidea",
      quoi: "la séance de définition — je la gouverne, je n'ai pas le monopole de l'idée",
      fait: function (p) { return !!(p.sections.bigidea || {}).idee
        && ((p.sections.bigidea || {}).criteres || []).length > 0; } },
    { cle: "demande", nom: "Demande au DA", section: "pistes",
      quoi: "avec son périmètre d'expression — sinon le DA exécute au lieu de proposer",
      fait: function (p) { return DEMANDE.toutes(p).some(function (d) { return d.etat !== "brouillon"; }); } },
  ];

  function avancement(p) {
    var faits = CHAINE.filter(function (c) { return c.fait(p); });
    var bloque = CHAINE.filter(function (c) { return !c.fait(c === null ? p : p); })[0];
    return { faits: faits.length, total: CHAINE.length,
      prochain: CHAINE.filter(function (c) { return !c.fait(p); })[0] || null };
  }

  return { CHAINE: CHAINE, avancement: avancement };
})();
