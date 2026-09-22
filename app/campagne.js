/* campagne.js — l'étage qui manquait entre la marque et le projet.
 *
 * Le code l'avait nommé sans lui donner de place. briefs.js porte depuis le
 * premier jour un type dont la fiche dit :
 *
 *     cle: "campagne",  fonde: "la campagne — son périmètre, son budget,
 *                               sa fenêtre",   porte: "projet"
 *
 * Le document qui FONDE LA CAMPAGNE était accroché au PROJET, faute d'un nœud
 * où le poser. Tout le reste en découlait : vingt briefs FrieslandCampina sur
 * un même Noël devenaient vingt dossiers sans lien, chacun repartant de zéro
 * sur le client, la marque, les marchés et la fenêtre.
 *
 * Une campagne, c'est le rythme de la marque. Deux régimes, et pas un de plus :
 *
 *   always-on    le cycle qui tourne — le digital mensuel, quelques actions
 *                terrain. Il n'a pas de fin : il court. Une marque en a un,
 *                et un seul.
 *   ponctuelle   un temps fort du calendrier de la marque — Noël, Ramadan,
 *                un lancement. Il a une fenêtre, et il se solde par un bilan.
 *
 * « Une marque est toujours en campagne. » Donc aucun projet ne flotte : il
 * appartient au cycle, ou à un temps fort. Un projet sans campagne n'est pas
 * un orphelin — c'est un projet dont on n'a pas dit à quel moment de la vie
 * de la marque il appartient, et le produit le dira.
 */

window.CAMPAGNE = (function () {
  var el = O.el;

  function liste() { return DEPOT.liste("campagnes"); }

  function de(id) { return id ? DEPOT.trouve("campagnes", id) : null; }

  function deMarque(marqueId) {
    return liste().filter(function (c) {
      return (c.marqueIds || []).indexOf(marqueId) !== -1; });
  }

  /* Le cycle d'une marque : il n'y en a qu'un, et c'est ce qui le distingue
   * d'un temps fort. Deux cycles sur la même marque, c'est une erreur de
   * saisie, pas un choix. */
  function cycleDe(marqueId) {
    return deMarque(marqueId).filter(function (c) {
      return c.regime === "always-on"; })[0] || null;
  }

  function projets(campagneId) {
    return DEPOT.liste("projets").filter(function (p) {
      return p.campagneId === campagneId; });
  }

  function occasion(cle) {
    var o = null;
    (MAISON.occasions || []).forEach(function (x) { if (x.cle === cle) o = x; });
    return o;
  }

  /* ————————————————————— L'état, au contrat ————————————————————— */

  function etat(c) {
    if (!c) return null;
    var ps = projets(c.id);
    var clos = ps.filter(function (p) { return window.CLOTURE && CLOTURE.est(p); }).length;
    var n = ps.length;

    if (!n) {
      return { cle: "vide", nom: "aucun projet", ton: "attente",
        quoi: "La campagne est ouverte et rien ne s'y fabrique. "
          + "Composer, c'est dire ce qu'elle appelle — et ce qu'elle n'appelle pas." };
    }
    if (clos === n) {
      var avecBilan = !!((c.bilan || "").trim());
      return { cle: "close", nom: "tous les projets clos", ton: avecBilan ? "terne" : "attente",
        quoi: avecBilan ? "Le bilan est au dossier."
          : "Les " + n + " projets sont clos et la campagne n'a pas de bilan : "
            + "la suivante repartira sans son diagnostic." };
    }
    /* Ce qui retarde le reste : la première arête du chaînage qui ne tient pas. */
    var bloquants = ps.filter(function (p) {
      return (p.attend || []).length && !(window.CLOTURE && CLOTURE.est(p)); });
    return { cle: "encours", nom: (n - clos) + " projets en cours", ton: "attente",
      quoi: bloquants.length
        ? bloquants.length + (bloquants.length > 1 ? " projets attendent" : " projet attend")
          + " un amont qui n'est pas livré."
        : n - clos + " projets tournent, aucun n'en attend un autre." };
  }

  /* ————————————————————— Composer ————————————————————— */

  /* Ce qu'une occasion appelle, confronté à ce qui existe déjà. On PROPOSE :
   * le produit n'ouvre jamais six dossiers dans le dos de personne. */
  function composition(c) {
    var o = occasion(c.occasion);
    var attendus = (o && o.appelle) || [];
    var ouverts = {};
    projets(c.id).forEach(function (p) { ouverts[p.nature || p.gabarit] = p; });
    var ecartes = c.ecartes || {};

    return attendus.map(function (cle) {
      var n = NATURE.liste().filter(function (x) { return x.cle === cle; })[0];
      return { nature: n || { cle: cle, nom: cle },
        projet: ouverts[cle] || null,
        ecarte: ecartes[cle] || null };
    });
  }

  /* Écarter, c'est décider — donc ça se date et ça porte un motif. Une case
   * vide sans motif se rediscute deux fois ; une case écartée avec sa date
   * ne se rediscute plus. */
  function ecarter(c, natureCle, motif) {
    c.ecartes = c.ecartes || {};
    c.ecartes[natureCle] = { motif: (motif || "").trim() || "sans motif écrit",
      quand: new Date().toISOString() };
    DEPOT.tracer("écarté de la composition", "campagnes", c.id, natureCle);
    DEPOT.enregistrer();
  }

  function reprendre(c, natureCle) {
    if (!c.ecartes) return;
    delete c.ecartes[natureCle];
    DEPOT.tracer("repris à la composition", "campagnes", c.id, natureCle);
    DEPOT.enregistrer();
  }

  /* ————————————————————— Créer ————————————————————— */

  function creer(d) {
    var c = DEPOT.ajoute("campagnes", {
      nom: d.nom,
      clientId: d.clientId || null,
      marqueIds: d.marqueIds || [],
      regime: d.regime || "ponctuelle",
      occasion: d.occasion || null,
      fenetre: d.fenetre || { debut: null, fin: null },
      marches: d.marches || [],
      bilan: "",
      ecartes: {},
      cree_le: new Date().toISOString(),
    });
    DEPOT.tracer("création", "campagnes", c.id, c.nom);
    return c;
  }

  /* La piste retenue sur le projet qui cherche l'idée devient la référence de
   * ses frères. Sans ça, le film et l'activation de la même campagne ignorent
   * le concept qu'on vient d'arbitrer, et deux signatures sortent du même
   * temps fort — c'est le test d'une minute, un cran plus haut. */
  function pisteDeReference(campagneId) {
    var trouvee = null;
    projets(campagneId).forEach(function (p) {
      if (trouvee) return;
      ((p.sections || {}).pistes || []).forEach(function (pi) {
        if (pi.statut === "retenue" && !trouvee) trouvee = { projet: p, piste: pi };
      });
    });
    return trouvee;
  }

  return { liste: liste, de: de, deMarque: deMarque, cycleDe: cycleDe,
    projets: projets, occasion: occasion, etat: etat,
    composition: composition, ecarter: ecarter, reprendre: reprendre,
    creer: creer, pisteDeReference: pisteDeReference };
})();
