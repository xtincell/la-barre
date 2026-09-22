/* intake.js — la boîte d'entrée, et la porte de sortie qui lui manquait.
 *
 * Le produit a une capture rapide depuis le premier jour : ⌘K, une ligne, et
 * ça tombe dans `depot.captures`. C'était la bonne idée — « ta boîte d'entrée
 * réelle n'est pas l'outil : c'est WhatsApp le samedi, un couloir, un appel ».
 *
 * Mais RIEN N'AFFICHAIT LA PILE. On pouvait capturer ; on ne pouvait pas
 * relire. Une boîte d'entrée sans sortie n'est pas une boîte d'entrée, c'est
 * un trou — et au bout de trois semaines on cesse d'y jeter quoi que ce soit,
 * ce qui est exactement la cause d'abandon que le plan d'origine nommait.
 *
 * Elle reste FACULTATIVE, et c'est une décision du titulaire : « la boîte
 * d'entrée peut exister mais facultative, à disposition du directeur
 * clientèle. C'est son travail de filtrer, donc les briefs arrivent déjà chez
 * moi qualifiés mais pas mis en forme. » Elle n'est donc jamais un passage
 * obligé : ingesteur.js reste la porte d'entrée du titulaire, et une demande
 * qualifiée ouvre un dossier sans passer par ici.
 *
 * Trois issues, et pas une de plus : on ouvre un dossier, on écarte avec un
 * motif, ou ça reste. Ce qui reste vieillit à l'écran.
 */

window.INTAKE = (function () {
  var el = O.el;

  function pile() {
    return DEPOT.liste("captures").filter(function (c) { return !c.range; })
      .slice().sort(function (a, b) { return (a.quand || "") < (b.quand || "") ? 1 : -1; });
  }

  function rangees() {
    return DEPOT.liste("captures").filter(function (c) { return c.range; });
  }

  function etat() {
    var p = pile();
    if (!p.length) {
      return { cle: "vide", nom: "rien en attente", ton: "terne",
        quoi: "La boîte est vide. Elle n'est pas obligatoire : un brief déjà qualifié "
          + "ouvre un dossier sans passer par ici." };
    }
    var vieux = p.reduce(function (n, c) {
      return Math.max(n, c.quand ? O.depuis(c.quand) : 0); }, 0);
    return { cle: "pleine", nom: p.length + (p.length > 1 ? " notes" : " note"),
      ton: vieux > 14 ? "alerte" : "attente",
      quoi: vieux > 14
        ? "La plus ancienne attend depuis " + vieux + " jours. Une boîte qu'on ne vide "
          + "pas cesse d'être lue, et on recommence à tout garder en tête."
        : "Capturé au vol, à ranger au moment de la revue." };
  }

  /* Écarter, c'est décider : ça se date et ça porte un motif. On ne supprime
   * pas — la note reste, rangée, avec la raison pour laquelle elle n'a pas
   * ouvert de dossier. */
  function ecarter(c, motif) {
    c.range = true;
    c.issue = "écartée";
    c.motif = (motif || "").trim() || "sans motif écrit";
    c.range_le = new Date().toISOString();
    DEPOT.tracer("note écartée", "captures", c.id, c.texte.slice(0, 60));
    DEPOT.enregistrer();
  }

  function rattacher(c, projetId) {
    c.range = true;
    c.issue = "rattachée";
    c.projetId = projetId;
    c.range_le = new Date().toISOString();
    DEPOT.tracer("note rattachée", "captures", c.id, c.texte.slice(0, 60));
    DEPOT.enregistrer();
  }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(hote, rafraichir) {
    var p = pile(), r = rangees(), e = etat();
    O.vider(hote);

    hote.appendChild(el("div.reg", {},
      el("div.reg-t", {},
        el("span.regt-l", {}, "BOÎTE D'ENTRÉE"),
        el("span.regt-d", {}, "⌘K pour capturer, d'où qu'on soit")),

      el("div.reg-n", {},
        el("b", {}, "Facultative, et c'est voulu.  "),
        "La Clientèle filtre : les briefs arrivent qualifiés mais pas mis en forme, et "
        + "c'est l'ingesteur qui les met en forme. Cette pile sert à ce qui arrive "
        + "autrement — un couloir, un appel, un message le samedi. C'est le seul endroit "
        + "du produit où l'on a le droit d'être sale."),

      p.length
        ? el("div.ink-l", {}, p.map(function (c) { return ligne(c, rafraichir); }))
        : el("p.rien", {}, e.quoi),

      r.length
        ? el("details.reg-plus", {},
            el("summary", {},
              el("b", {}, r.length + (r.length > 1 ? " notes rangées" : " note rangée")),
              el("span.dl-clos-q", {}, "ouvertes en dossier, ou écartées avec leur motif")),
            el("div.ink-l", {}, r.slice(0, 40).map(function (c) {
              return el("div.ink-r.range", {},
                el("span.inkr-t", {}, c.texte),
                el("span.inkr-q", {}, (c.issue || "rangée")
                  + (c.motif ? "  ·  " + c.motif : "")
                  + (c.range_le ? "  ·  " + O.jourCourt(c.range_le) : "")));
            })))
        : null
    ));
  }

  function ligne(c, rafraichir) {
    var age = c.quand ? O.depuis(c.quand) : 0;
    return el("div.ink-r" + (age > 14 ? ".vieille" : ""), {},
      el("span.inkr-t", {}, c.texte),
      el("span.inkr-d", {}, age === 0 ? "aujourd'hui"
        : "depuis " + age + (age > 1 ? " jours" : " jour")),
      el("span.inkr-g", {},
        el("button.b.nu", { type: "button", onclick: function () {
          ouvrirDossier(c, rafraichir); } }, "ouvrir un dossier"),
        el("button.b.nu", { type: "button", onclick: function () {
          PANNEAU.demander("Écarter cette note", {
            label: "Pourquoi",
            aide: "La note reste, rangée, avec la raison pour laquelle elle n'a pas "
                + "ouvert de dossier. On archive, on ne supprime pas.",
            lignes: 2, requis: "Une note écartée sans motif revient la semaine suivante.",
          }, function (m) { ecarter(c, m); rafraichir(); });
        } }, "écarter")));
  }

  /* Ouvrir un dossier depuis une note : trois champs, et le reste se complète
   * en travaillant. C'est la règle d'amorçage — entrer tout avant de
   * commencer, c'est ne jamais commencer. */
  function ouvrirDossier(c, rafraichir) {
    var champNom = el("input", { type: "text", value: c.texte.slice(0, 70) });
    var selN = el("select", {});
    NATURE.liste().forEach(function (n) {
      selN.appendChild(el("option", { value: n.cle, title: n.quoi }, n.nom)); });
    selN.value = "demande";
    var selC = el("select", {});
    selC.appendChild(el("option", { value: "" }, "— quel client ? —"));
    DEPOT.liste("clients").forEach(function (x) {
      selC.appendChild(el("option", { value: x.id }, x.nom)); });

    PANNEAU.ouvrir("Ouvrir un dossier", "depuis la boîte d'entrée", el("div", {},
      UI.banniere("", "Trois champs suffisent. Le dossier se complète en travaillant — "
        + "tout saisir avant de commencer, c'est ne jamais commencer."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom du dossier"), champNom),
        el("div.champ", {}, el("label", {}, "Nature"), selN),
        el("div.champ", {}, el("label", {}, "Client"), selC)),
      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          if (!champNom.value.trim()) { AVIS.refus("Un dossier a besoin d'un nom."); return; }
          var p = DEPOT.ajoute("projets", {
            ref: "MT-" + String(DEPOT.liste("projets").length + 1).padStart(4, "0"),
            nom: champNom.value.trim(), nature: selN.value,
            cree_le: new Date().toISOString(), statut: "creation", equipe: [],
            sections: { identite: { clientId: selC.value || null, marqueIds: [] },
              brief: { verbatim: c.texte }, pistes: [] },
            perimetre: { supports: [], marches: [] },
            livrables: [], volets: [],
          });
          rattacher(c, p.id);
          PANNEAU.fermer();
          AVIS.fait("Dossier ouvert. La note d'origine est au brief, mot pour mot.");
          location.hash = "#/projets/" + p.id;
        } }, "Ouvrir"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ), "var(--accent)");
  }

  function pire() {
    var e = etat();
    return { t: e.nom === "rien en attente" ? "La boîte d'entrée est vide" : e.nom + " à ranger",
      q: e.quoi };
  }

  return { pile: pile, etat: etat, rendre: rendre, pire: pire,
    ecarter: ecarter, rattacher: rattacher };
})();
