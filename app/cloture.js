/* cloture.js — fermer un dossier, et ce que ça change.
 *
 * Le produit savait ouvrir un dossier et le faire vivre ; il ne savait pas le
 * finir. Un dossier de 2025 réclamait encore son décideur, son brief-back et
 * ses critères d'acceptation, indéfiniment — des questions posées à personne,
 * sur du travail que plus rien ne peut réparer.
 *
 * La clôture n'est pas un statut de plus. C'est le moment où la campagne
 * cesse d'être un chantier et devient une entrée réutilisable : le cas client
 * pour l'appel d'offres suivant, le diagnostic que le prochain brief sur la
 * marque doit pouvoir opposer. D'où la seule chose qu'elle exige — un bilan.
 * Sans lui, « bilan-absent » le dit, et c'est le seul contrôle qui NAÎT à la
 * fermeture au lieu de se taire.
 *
 * Deux règles, et la seconde est la plus importante :
 *
 *   1 · La clôture se relève ou se décide. Elle ne se déduit JAMAIS d'une
 *       fenêtre échue : une date passée n'est pas une preuve de fin, et
 *       fermer sur cette base écrit une décision que personne n'a prise.
 *
 *   2 · Fermer ne fait pas taire ce qui peut encore mordre. Les pièces sont
 *       toujours dehors : un produit montré hors zone, une licence expirée,
 *       une faute qui repart avec le visuel réemployé. La liste vit dans
 *       regles.js, à côté du filtre qui l'applique.
 */

window.CLOTURE = (function () {
  var el = O.el;

  function est(p) { return !!(p && p.cloture && p.cloture.le); }

  /* Une clôture inférée n'est pas une clôture décidée. Elle fait taire les
   * contrôles de cadrage — ils ne demandent rien à personne sur une campagne
   * de 2025 — mais elle ne réclame pas de bilan, et elle s'affiche comme ce
   * qu'elle est : une hypothèse que le titulaire confirme ou rouvre. */
  function estInferee(p) { return est(p) && !!p.cloture.infere; }

  function confirmer(p) {
    if (!estInferee(p)) return;
    var i = p.cloture.infere;
    delete p.cloture.infere;
    p.cloture.releve = "confirmé à la main" + (i && i.pourquoi ? " — proposé : " + i.pourquoi : "");
    p.cloture.confirme_le = new Date().toISOString();
    DEPOT.tracer("clôture confirmée", "projets", p.id, p.cloture.releve);
    DEPOT.enregistrer();
  }

  /* L'état au contrat : état, conséquence, coût, prochain geste. */
  function etat(p) {
    if (!est(p)) return null;
    var c = p.cloture;
    if (c.infere) {
      return { cle: "clos-infere", nom: "clos, inféré", ton: "attente",
        quoi: "Clos le " + O.jourCourt(c.le) + ", par inférence — "
          + (c.infere.pourquoi || "motif non écrit")
          + ". Utilisable, pas opposable : à confirmer ou à rouvrir." };
    }
    var avecBilan = !!(c.bilan || "").trim();
    return {
      cle: avecBilan ? "clos" : "clos-nu",
      nom: "clos",
      ton: avecBilan ? "terne" : "attente",
      quoi: "Clos le " + O.jourCourt(c.le)
        + (avecBilan ? " — le diagnostic est au dossier"
                     : " — sans bilan : le prochain brief sur la marque repartira à zéro"),
    };
  }

  /* D'où vient la preuve que c'est fini. Écrite, parce qu'une clôture relevée
   * d'un registre et une clôture décidée à la main ne se relisent pas pareil. */
  function cloturer(p, bilan, releve) {
    if (!p) return;
    p.cloture = {
      le: new Date().toISOString(),
      bilan: (bilan || "").trim(),
      releve: releve || "décidé à la main",
      par: MAISON.titulaire || null,
    };
    DEPOT.tracer("clôture", "projets", p.id, p.cloture.releve);
    DEPOT.enregistrer();
  }

  /* Rouvrir n'efface pas : la clôture précédente part à l'historique avec le
   * motif de sa réouverture. On archive, on ne supprime pas — et le jour où
   * on se demande pourquoi ce dossier a rouvert, la réponse est là. */
  function rouvrir(p, motif) {
    if (!p || !est(p)) return;
    p.cloturesPassees = p.cloturesPassees || [];
    p.cloturesPassees.push(Object.assign({}, p.cloture, {
      rouvert_le: new Date().toISOString(),
      motif: (motif || "").trim() || "sans motif écrit",
    }));
    delete p.cloture;
    DEPOT.tracer("réouverture", "projets", p.id, motif || "");
    DEPOT.enregistrer();
  }

  /* ————————————————————— Le geste ————————————————————— */

  /* Ce que la fermeture va faire taire, compté sur le dossier réel. Annoncer
   * « des contrôles vont se taire » sans dire lesquels ni combien, c'est
   * demander une signature à l'aveugle. */
  function cequiSeTait(p) {
    if (!window.REGLES) return { taisent: 0, restent: 0 };
    var b = REGLES.blocages(p.id);
    var restent = b.filter(function (x) { return REGLES.prix(x.type) && SURVIVANTS[x.type]; }).length;
    return { taisent: b.length - restent, restent: restent, liste: b };
  }

  /* Recopiée de regles.js à dessein : ce module lit, il ne décide pas. La
   * décision reste à l'endroit où le filtre s'applique. */
  var SURVIVANTS = {
    "sku-hors-zone": 1, "orthographe-diffusee": 1, "packshot-cmyk": 1,
    "langue-marche-douteuse": 1, "droits-insuffisants": 1, "maitre-perime": 1,
    "bilan-absent": 1,
  };

  function ouvrir(p, apres) {
    if (estInferee(p)) return ouvrirConfirmation(p, apres);
    if (est(p)) return ouvrirReouverture(p, apres);

    var compte = cequiSeTait(p);
    var champBilan = el("textarea", { rows: 6, placeholder:
      "Ce que la campagne a produit, ce qu'elle a appris, ce qu'on referait autrement." });

    var corps = el("div", {},
      UI.banniere("", "Fermer un dossier ne l'archive pas : il reste lisible, imprimable, "
        + "et exportable en cas client. Ce qui change, c'est qu'il cesse de réclamer "
        + "ce qu'on ne peut plus lui donner."),

      PANNEAU.sousbloc("Ce que la fermeture change",
        el("div", {},
          el("p.lire", {}, compte.taisent
            ? compte.taisent + (compte.taisent > 1 ? " blocages se tairont" : " blocage se taira")
              + " : ils demandent un cadrage que plus rien ne peut rendre opposable."
            : "Aucun blocage de cadrage à faire taire sur ce dossier."),
          el("p.lire", {}, compte.restent
            ? compte.restent + (compte.restent > 1 ? " continueront de parler" : " continuera de parler")
              + " : les pièces sont toujours dehors, et le risque avec elles."
            : "Aucun risque de diffusion en cours sur ce dossier."))),

      PANNEAU.sousbloc("Le bilan", el("div", {},
        el("p.meta", {}, "La seule chose que la clôture exige. Sans lui, le prochain brief "
          + "sur cette marque repartira sans son diagnostic — et le dossier le dira."),
        champBilan)),

      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          cloturer(p, champBilan.value, "décidé à la main");
          PANNEAU.fermer();
          AVIS.fait("« " + p.nom + " » est clos."
            + ((champBilan.value || "").trim() ? "" : "  Sans bilan : le dossier le signale."));
          if (apres) apres();
        } }, "Clore le dossier"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    );

    PANNEAU.ouvrir("Clore — la campagne devient une entrée réutilisable",
      p.ref || p.nom, corps, "var(--neutre)");
  }

  function ouvrirReouverture(p, apres) {
    var champ = el("textarea", { rows: 3, placeholder:
      "Pourquoi ce dossier rouvre : une reprise, une extension, une erreur de clôture." });
    var corps = el("div", {},
      UI.banniere("", "Rouvrir remet tous les contrôles de cadrage en marche. "
        + "La clôture précédente n'est pas effacée : elle part à l'historique avec ce motif."),
      PANNEAU.sousbloc("Clos le " + O.jourCourt(p.cloture.le),
        el("p.lire", {}, (p.cloture.bilan || "").trim() || "Aucun bilan n'avait été écrit.")),
      PANNEAU.sousbloc("Le motif de la réouverture", champ),
      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          rouvrir(p, champ.value);
          PANNEAU.fermer();
          AVIS.fait("« " + p.nom + " » est rouvert. Les contrôles de cadrage reprennent.");
          if (apres) apres();
        } }, "Rouvrir le dossier"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    );
    PANNEAU.ouvrir("Rouvrir un dossier clos", p.ref || p.nom, corps, "var(--attente)");
  }

  /* La confirmation d'une clôture inférée : deux issues, et le bilan au passage
   * puisqu'on y est. Refuser rouvre le dossier et tous ses contrôles. */
  function ouvrirConfirmation(p, apres) {
    var champBilan = el("textarea", { rows: 5, placeholder:
      "Ce que la campagne a produit, ce qu'elle a appris. Facultatif ici." });
    var corps = el("div", {},
      UI.banniere("", "Cette clôture a été inférée à l'ingestion du corpus, pas décidée. "
        + "Tant qu'elle n'est pas confirmée, elle fait taire les contrôles de cadrage "
        + "mais ne réclame pas de bilan."),
      PANNEAU.sousbloc("Ce qui a été inféré, et pourquoi", el("div", {},
        el("p.lire", {}, "Clos le " + O.jourCourt(p.cloture.le) + "."),
        el("p.meta", {}, p.cloture.infere.pourquoi || "Motif non écrit."))),
      PANNEAU.sousbloc("Le bilan, si vous l'avez", champBilan),
      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          if ((champBilan.value || "").trim()) p.cloture.bilan = champBilan.value.trim();
          confirmer(p);
          PANNEAU.fermer();
          AVIS.fait("Clôture confirmée sur « " + p.nom + " »."
            + ((champBilan.value || "").trim() ? "" : "  Sans bilan : le dossier le signale désormais."));
          if (apres) apres();
        } }, "Confirmer la clôture"),
        el("button.bouton.creux", { type: "button", onclick: function () {
          rouvrir(p, "clôture inférée refusée");
          PANNEAU.fermer();
          AVIS.fait("« " + p.nom + " » est rouvert. Les contrôles de cadrage reprennent.");
          if (apres) apres();
        } }, "Non — rouvrir"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Plus tard"))
    );
    PANNEAU.ouvrir("Confirmer une clôture inférée", p.ref || p.nom, corps, "var(--attente)");
  }

  function bouton(p, apres) {
    return el("button.bouton" + (estInferee(p) ? "" : ".creux"),
      { type: "button", onclick: function () { ouvrir(p, apres); } },
      estInferee(p) ? "Confirmer ou rouvrir" : est(p) ? "Rouvrir le dossier" : "Clore le dossier");
  }

  return { est: est, estInferee: estInferee, confirmer: confirmer,
    etat: etat, cloturer: cloturer, rouvrir: rouvrir,
    ouvrir: ouvrir, bouton: bouton, cequiSeTait: cequiSeTait };
})();
