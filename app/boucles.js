/* boucles.js — ce que le produit apprend de ce qu'il a produit.
 *
 * « Le système est antifragile : il s'améliore avec chaque transaction. »
 * C'est la définition du titulaire, tirée de son propre dépôt. Elle est
 * exigeante : résilient veut dire encaisser, antifragile veut dire GAGNER à
 * l'épreuve. Un produit qui enregistre sans jamais rien en tirer est
 * résilient au mieux.
 *
 * Quatre boucles, et elles s'enchaînent — aucune ne tourne sans la première.
 *
 *   1 · LE RÉSULTAT      Un projet se clôt aujourd'hui sans jamais dire s'il
 *                        a marché. Sans résultat mesuré, il n'y a rien à
 *                        apprendre : les trois autres boucles tournent à vide.
 *
 *   2 · LA DÉRIVE        `estime` et `reel` existent sur chaque livrable
 *                        depuis toujours et rien ne calculait leur écart. On
 *                        le calcule, et on le REND : le livrable suivant de
 *                        même forme reçoit l'estimation corrigée.
 *
 *   3 · LA JURISPRUDENCE Les motifs d'arbitrage sont indexés par critère, pas
 *                        par marque. Une contradiction déjà tranchée sur
 *                        Bonnet Rouge ne remonte pas quand on rouvre un
 *                        dossier Bonnet Rouge — et c'est là qu'elle servirait.
 *
 *   4 · LE BENCHMARK     Cent quarante campagnes ingérées et rien ne les
 *                        compare. Avec sa réserve écrite : un corpus d'une
 *                        seule agence n'est pas un référentiel de marché, et
 *                        le dire est la condition pour s'en servir.
 */

window.BOUCLES = (function () {
  var el = O.el;

  /* ————————————————————— 1 · Le résultat ————————————————————— */

  /* Il se qualifie par l'échelle de preuve d'efficacite.js — quatre crans qui
   * descendent : données maison, catégorie voisine, marché comparable,
   * déclaratif daté. Elle existait et ne servait qu'aux chiffres du dossier.
   * Un résultat sans source ne compte pas : `chiffre-sans-source` s'y
   * applique déjà, et c'est le même mécanisme. */
  function resultats(p) { return (p && p.resultat) || []; }

  function texte(v) {
    return typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  }

  /* Renseigner la preuve ne vérifie pas sa vérité. Une note partielle reste
   * conservée, mais ne devient pas un résultat mesuré par sa seule présence. */
  function qualifierResultat(r) {
    r = r || {};
    var manques = [];
    if (!texte(r.quoi)) manques.push("mesure");
    if (!texte(r.valeur)) manques.push("valeur");
    if (!texte(r.source)) manques.push("source");
    var n = window.EFFICACITE ? EFFICACITE.niveau(r.niveau) : null;
    if (!n) manques.push("niveau de preuve");
    var date = texte(r.date), d = new Date(date), jour = new Date(date.slice(0, 10) + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) || !Number.isFinite(d.getTime())
        || !Number.isFinite(jour.getTime()) || jour.toISOString().slice(0, 10) !== date.slice(0, 10)) manques.push("date valide");
    return { complet: !manques.length, manques: manques, niveau: n };
  }

  function resultatsQualifies(p) {
    return resultats(p).filter(function (r) { return qualifierResultat(r).complet; });
  }

  function poser(p, r) {
    p.resultat = p.resultat || [];
    var note = {
      quoi: texte(r.quoi), valeur: texte(r.valeur),
      source: texte(r.source), niveau: r.niveau || null,
      date: r.date || new Date().toISOString().slice(0, 10),
    };
    p.resultat.push(note);
    DEPOT.tracer("résultat", "projets", p.id, r.quoi,
      ((p.sections || {}).identite || {}).marqueIds);
    DEPOT.enregistrer();
    return qualifierResultat(note);
  }

  function etatResultat(p) {
    var rs = resultats(p);
    var clos = window.CLOTURE && CLOTURE.est(p);
    if (!rs.length) {
      return { cle: "aucun", nom: "aucun résultat", ton: clos ? "attente" : "terne",
        quoi: clos
          ? "Le projet est clos et personne ne sait s'il a marché. Il n'apprendra rien "
            + "au suivant, et les trois autres boucles tournent à vide."
          : "Rien de mesuré pour l'instant — c'est normal tant que ça tourne." };
    }
    var qualifies = resultatsQualifies(p), partiels = rs.length - qualifies.length;
    var meilleur = qualifies.reduce(function (n, r) {
      var d = window.EFFICACITE ? EFFICACITE.niveau(r.niveau) : null;
      return d && (!n || d.rang < n.rang) ? d : n; }, null);
    return { cle: qualifies.length ? "mesure" : "partiel",
      nom: qualifies.length + (qualifies.length > 1 ? " résultats renseignés" : " résultat renseigné")
        + (partiels ? " · " + partiels + " à qualifier" : ""),
      ton: partiels ? "attente" : "vert",
      quoi: (meilleur ? "Meilleure preuve : " + meilleur.nom.toLowerCase() + ". " : "")
        + (partiels ? partiels + " notes à qualifier : mesure, valeur, source, niveau et date sont nécessaires. " : "")
        + "Une preuve renseignée reste à vérifier dans sa source." };
  }

  /* ————————————————————— 2 · La dérive ————————————————————— */

  /* On compare l'estimé au réel, par forme de livrable — sa nature de projet
   * et son support. Deux points ne font pas une tendance : en dessous de
   * trois observations, on ne propose rien. Une correction tirée d'un seul
   * cas est une superstition. */
  var MINIMUM = 3;

  function observations() {
    var par = {};
    (window.STRUCTURE ? STRUCTURE.agence() : DEPOT.liste("projets")).forEach(function (p) {
      var nat = (window.NATURE ? (NATURE.de(p) || {}).cle : p.nature) || "campagne";
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        var e = +l.estime, r = +l.reel;
        if (!e || !r) return;
        var cle = nat + "|" + (l.support || "sans-support");
        (par[cle] = par[cle] || []).push({ e: e, r: r, projet: p, livrable: l });
      });
    });
    return par;
  }

  function derive(natureCle, supportId) {
    var lot = observations()[natureCle + "|" + (supportId || "sans-support")] || [];
    if (lot.length < MINIMUM) {
      return { n: lot.length, assez: false, facteur: null,
        quoi: lot.length
          ? lot.length + (lot.length > 1 ? " observations" : " observation")
            + " : pas assez pour corriger une estimation. Il en faut " + MINIMUM + "."
          : "Aucune observation sur cette forme." };
    }
    var se = lot.reduce(function (n, x) { return n + x.e; }, 0);
    var sr = lot.reduce(function (n, x) { return n + x.r; }, 0);
    var f = sr / se;
    var pct = Math.round((f - 1) * 100);
    return { n: lot.length, assez: true, facteur: f, pct: pct,
      quoi: lot.length + " observations : le réel dépasse l'estimé de " + pct + " %."
        + (Math.abs(pct) < 5 ? "  L'estimation tient, rien à corriger." : "") };
  }

  /* Ce que la dérive PROPOSE pour un livrable neuf. Inférée, avec son motif —
   * elle ne s'impose pas, elle se contresigne comme tout le reste. */
  function estimationProposee(p, l) {
    var nat = (window.NATURE ? (NATURE.de(p) || {}).cle : p.nature) || "campagne";
    var d = derive(nat, l.support);
    if (!d.assez || !l.estime) return null;
    var propose = Math.round(l.estime * d.facteur * 2) / 2;
    if (propose === +l.estime) return null;
    return { valeur: propose,
      pourquoi: "Sur " + d.n + " livrables de même forme, le réel a dépassé l'estimé de "
        + d.pct + " %. " + l.estime + " j deviennent " + propose + " j." };
  }

  /* ————————————————————— 3 · La jurisprudence par marque ————————————————————— */

  /* JURISPRUDENCE indexe par critère. On ajoute l'axe qui manquait : rouvrir
   * un dossier Bonnet Rouge doit faire remonter comment les questions Bonnet
   * Rouge ont été tranchées. C'est ce qui reste quand le titulaire n'est pas
   * dans la pièce — la dérive que sa propre fiche nomme. */
  function parMarque(marqueId, limite) {
    if (!window.JURISPRUDENCE) return [];
    return JURISPRUDENCE.tout().filter(function (a) {
      if (!a.projet) return false;
      var ids = ((a.projet.sections || {}).identite || {}).marqueIds || [];
      return ids.indexOf(marqueId) !== -1;
    }).slice(0, limite || 12);
  }

  /* ————————————————————— 4 · Le benchmark ————————————————————— */

  var RESERVE = "Ce comparatif porte sur les dossiers de cette maison, et sur eux seuls. "
    + "Une agence, un point de vue, des marchés très différents : c'est une mémoire "
    + "interne, pas un référentiel de marché. Le dire est la condition pour s'en servir.";

  function parForme() {
    var obs = observations();
    return Object.keys(obs).map(function (cle) {
      var lot = obs[cle];
      var m = cle.split("|");
      var su = m[1] === "sans-support" ? null : DEPOT.trouve("supports", m[1]);
      var nat = (MAISON.natures || []).filter(function (n) { return n.cle === m[0]; })[0];
      var se = lot.reduce(function (n, x) { return n + x.e; }, 0);
      var sr = lot.reduce(function (n, x) { return n + x.r; }, 0);
      return { nature: nat ? nat.nom : m[0], support: su ? su.nom : "sans support",
        n: lot.length, estime: se, reel: sr,
        ecart: se ? Math.round(((sr - se) / se) * 100) : 0 };
    }).filter(function (x) { return x.n >= MINIMUM; })
      .sort(function (a, b) { return b.ecart - a.ecart; });
  }

  /* Les tours consommés par rapport aux tours vendus : l'autre chiffre qu'on
   * se pose en chiffrant, et que personne ne sait dire de mémoire. */
  function tours() {
    var par = {};
    (window.STRUCTURE ? STRUCTURE.agence() : DEPOT.liste("projets")).forEach(function (p) {
      var nat = (window.NATURE ? (NATURE.de(p) || {}).cle : p.nature) || "campagne";
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.toursVendus) return;
        var pris = (l.versions || []).length || l.version || 0;
        if (!pris) return;
        (par[nat] = par[nat] || []).push({ vendus: l.toursVendus, pris: pris });
      });
    });
    return Object.keys(par).map(function (k) {
      var lot = par[k];
      var nat = (MAISON.natures || []).filter(function (n) { return n.cle === k; })[0];
      var v = lot.reduce(function (n, x) { return n + x.vendus; }, 0);
      var pr = lot.reduce(function (n, x) { return n + x.pris; }, 0);
      return { nature: nat ? nat.nom : k, n: lot.length, vendus: v, pris: pr,
        depasse: lot.filter(function (x) { return x.pris > x.vendus; }).length };
    }).filter(function (x) { return x.n >= MINIMUM; })
      .sort(function (a, b) { return b.depasse - a.depasse; });
  }

  function etatBenchmark() {
    var f = parForme(), t = tours();
    if (!f.length && !t.length) {
      return { cle: "vide", nom: "rien à comparer", ton: "terne",
        quoi: "Aucune forme ne porte " + MINIMUM + " observations avec un estimé ET un réel. "
          + "La mémoire se remplit en saisissant le réel à la livraison." };
    }
    var pire = f[0];
    return { cle: "mesure", nom: f.length + " formes comparables", ton: "terne",
      quoi: pire
        ? "La forme qui dérape le plus : " + pire.nature.toLowerCase() + " · "
          + pire.support.toLowerCase() + ", " + pire.ecart + " % au-dessus de l'estimé "
          + "sur " + pire.n + " livrables."
        : t.length + " natures comparables sur les tours de révision." };
  }

  return { RESERVE: RESERVE, MINIMUM: MINIMUM,
    resultats: resultats, resultatsQualifies: resultatsQualifies, qualifierResultat: qualifierResultat,
    poser: poser, etatResultat: etatResultat,
    observations: observations, derive: derive, estimationProposee: estimationProposee,
    parMarque: parMarque, parForme: parForme, tours: tours, etatBenchmark: etatBenchmark };
})();
