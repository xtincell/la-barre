/* vue-maison.js — le système, et lui seul.
 *
 * Cinquième couche : métadonnées, règles, audit, relations. Ce n'est pas du
 * travail, c'est ce qui le rend possible — et ça n'a rien à faire dans une vue
 * de décision.
 *
 * Deux modes, parce qu'on y vient pour deux raisons distinctes : renseigner ce
 * que le métier suppose, ou régler ce que la maison a décidé.
 */

window.VUE_MAISON = (function () {
  var el = O.el;
  var mode = "referentiel";

  var MODES = [
    /* Le vault vit ici, hors des campagnes : ce qui définit une marque ne
     * change pas d'une saison à l'autre, et n'a rien à faire dans le dossier
     * qui l'a écrit en premier. */
    { cle: "marques", nom: "LES MARQUES", quoi: "socle, catalogue, marchés — le vault" },
    { cle: "referentiel", nom: "LE RÉFÉRENTIEL", quoi: "marchés, supports, gabarits, assets" },
    { cle: "reglages", nom: "LES RÉGLAGES", quoi: "dépôt, règles, équipe, journal" },
  ];

  function rendre(hote, arg) {
    if (arg && MODES.some(function (m) { return m.cle === arg; })) mode = arg;

    hote.className = "zone";
    O.vider(hote);

    var trous = 0;
    DEPOT.liste("marches").forEach(function (m) {
      if (!(m.mentions || []).length) trous++;
      if (!(m.sku || []).length) trous++;
    });
    var w = DEPOT.poids();
    var age = DEPOT.ageSauvegarde();
    var vides = vaultsVides();
    var p = pire(mode, { trous: trous, w: w, age: age, vides: vides });

    hote.appendChild(el("div.dc", {},
      el("div.dc-tete", {},
        el("div.dct-c", {},
          el("h2", {}, p.t),
          el("div.dct-q", {}, p.q))),

      el("div.dc-modes", {}, MODES.map(function (m) {
        var n = m.cle === "marques" ? vides + VAULT.orphelins().length
          : m.cle === "referentiel" ? trous
          : (w.grave || (!w.surDisque && (age === null || age > 2))) ? 1 : 0;
        return el("button.dcm" + (mode === m.cle ? ".ici" : ""), { type: "button",
          onclick: function () { mode = m.cle; rendre(hote); } },
          el("span.dcm-n", {}, m.nom),
          el("span.dcm-q", {}, m.quoi),
          n ? el("span.dcm-c", {}, m.cle === "reglages" ? "!" : String(n)) : null);
      })),

      el("div.dc-corps", {}, corps(hote))
    ));
  }

  function corps(hote) {
    var z = el("div");
    if (mode === "marques") VUE_VAULT.rendre(z);
    else if (mode === "referentiel") VUE_REFERENTIEL.rendre(z);
    else VUE_REGLAGES.rendre(z);
    return z;
  }

  /* Le titre dit l'état de CE QU'ON REGARDE.
   *
   * Il disait l'état de l'intention entière : les réglages s'ouvraient sur
   * « 5 marques n'ont pas de socle », ce qui repoussait l'avertissement de
   * dépôt au second plan sur le seul écran où il compte. Un dépôt qui n'est
   * pas à l'abri est la chose la plus coûteuse que ce produit puisse taire. */
  function pire(mode, e) {
    if (mode === "reglages") return pireReglages(e);
    if (mode === "marques") return pireMarques(e);
    return pireReferentiel(e);
  }

  /* Le dépôt d'abord : c'est la seule perte irréversible du produit. */
  function pireReglages(e) {
    if (e.w.grave) {
      return { t: "Le cache est plein",
        q: "Plus rien ne s'enregistre localement. Exporte maintenant, sinon la séance est perdue." };
    }
    if (!e.w.surDisque && e.age === null) {
      return { t: "Le dépôt n'est pas à l'abri",
        q: "Jamais exporté. Le navigateur ne garde qu'un cache : vider les données du "
          + "site effacerait tout." };
    }
    if (!e.w.surDisque && e.age > 2) {
      return { t: "Le dépôt n'est pas à l'abri",
        q: "Exporté il y a " + e.age + " jours. Le fichier sur ton Drive est le dépôt "
          + "de référence." };
    }
    /* Ce qui reste d'images dans le dépôt : elles y pesaient 93 %. */
    var v = window.IMAGE ? IMAGE.poids() : { restantes: 0, ko: 0 };
    if (v.restantes) {
      return { t: v.restantes + (v.restantes > 1 ? " vignettes pèsent sur le dépôt" : " vignette pèse sur le dépôt"),
        q: O.milliers(v.ko) + " Ko d'images rangées dans le fichier au lieu du disque. "
          + "Le dépôt se réécrit en entier à chaque frappe : ce poids se paie à chaque geste." };
    }
    return { t: e.w.surDisque ? "Le dépôt s'écrit dans son fichier" : "Le dépôt est à jour",
      q: e.w.surDisque
        ? "Tous les navigateurs voient la même chose, et les vignettes vivent sur le "
          + "disque à côté des packshots — le fichier ne porte que des liens."
        : "Exporté récemment. Le fichier sur ton Drive fait foi." };
  }

  /* Le vault. Une marque sans socle est une marque que chaque campagne
   * réécrit ; un pack sans marque n'appartient à personne. */
  function pireMarques(e) {
    if (e.vides) {
      return { t: e.vides + (e.vides > 1 ? " marques n'ont pas de socle" : " marque n'a pas de socle"),
        q: "Sans socle de marque, chaque campagne repart d'une page blanche et rien ne "
          + "peut être refusé sur un fondement de marque." };
    }
    var orph = VAULT.orphelins().length;
    if (orph) {
      return { t: orph + (orph > 1 ? " packs n'appartiennent à personne" : " pack n'appartient à personne"),
        q: "Un pack sans marque n'est pas à tout le monde : il attend d'être qualifié. "
          + "Tant qu'il l'est, aucun cadrage ne peut le convoquer." };
    }
    return { t: "Le vault est tenu",
      q: "Chaque marque a son socle, chaque pack sa marque. Une campagne peut convoquer "
        + "ce qui existe au lieu de le réécrire." };
  }

  /* Le référentiel se remplit par l'usage ; ce qui manque se découvre tard. */
  function pireReferentiel(e) {
    if (e.trous) {
      return { t: e.trous + (e.trous > 1 ? " entrées du référentiel manquent" : " entrée du référentiel manque"),
        q: "Le référentiel se remplit par l'usage — mais ce qui manque se découvre à "
          + "l'impression, quand le fichier est déjà parti." };
    }
    return { t: "Le référentiel est renseigné",
      q: "Mentions et SKU posés sur chaque marché. Une case de matrice hérite de ses "
        + "contraintes sans qu'on les ressaisisse." };
  }

  /* Une marque sans socle est une marque que chaque campagne réécrit. */
  function vaultsVides() {
    return DEPOT.liste("marques").filter(function (m) {
      return VAULT.etat(m.id).ecrits === 0; }).length;
  }

  return { rendre: rendre, titre: "La maison", MODES: MODES };
})();
