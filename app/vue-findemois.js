/* vue-findemois.js — le bouton qui produit ce sur quoi je suis évalué.
 *
 * Quatrième mode de Constater. Rien ne s'y saisit : tout se relit. Le mois ou
 * le trimestre, la feuille de l'agence ou celle d'une personne, à l'écran ou
 * en texte à coller dans un mail.
 *
 * L'écran dit d'abord si la feuille est lisible. Une fin de mois dont la moitié
 * des mesures reposent sur un registre vide n'est pas une fin de mois calme :
 * c'est une fin de mois qu'on ne peut pas défendre. La bande le dit avant que
 * je l'imprime, pas après.
 */

window.VUE_FINDEMOIS = (function () {
  var el = O.el;
  var periode = "mois";
  var qui = null; /* null = l'agence ; un id = la fiche d'une personne */

  function rendre(hote, rafraichir) {
    var d = qui ? BILAN.parPersonne(qui, periode) : BILAN.compiler(periode);
    if (!d) { qui = null; d = BILAN.compiler(periode); }

    return el("div.fm", {},
      bande(d),
      barre(hote, rafraichir),
      COMPILATEUR.document(d)
    );
  }

  /* ————————————————————— La question ————————————————————— */

  /* Une mesure sans assise n'est pas un mauvais résultat : c'est une mesure qui
   * n'existe pas. Les compter est la seule façon de savoir ce que la feuille
   * vaut avant de la remettre. */
  function bande(d) {
    var ms = [];
    d.blocs.forEach(function (b) { (b.mesures || []).forEach(function (m) { ms.push(m); }); });
    var creuses = ms.filter(function (m) { return m.assise === 0; });
    var vides = d.blocs.filter(function (b) {
      return !b.corps && !(b.puces || []).length && !(b.lignes || []).filter(function (l) { return l.v; }).length
        && !(b.mesures || []).length && !(b.equipe || []).length;
    });

    return UI.recevabilite(
      qui ? "Puis-je tenir cet entretien ?" : "Cette feuille est-elle défendable ?",
      [
        { quoi: "Les mesures reposent sur des faits", ok: creuses.length === 0, poids: 5,
          cout: creuses.length + (creuses.length > 1 ? " mesures n'ont" : " mesure n'a")
            + " aucune assise : « " + creuses.map(function (m) { return m.nom; }).join(" », « ")
            + " ». Un zéro faute de registre se lit comme un résultat — et n'en est pas un" },
        { quoi: "Aucune section muette", ok: vides.length === 0, poids: 3,
          cout: vides.length + (vides.length > 1 ? " sections sont vides" : " section est vide")
            + " : " + vides.map(function (b) { return b.t.toLowerCase(); }).join(", ") },
        /* La fenêtre court jusqu'à aujourd'hui : tant que le jour n'est pas
         * passé, ce qui est imprimé n'est pas définitif. */
        { quoi: "La période est close", ok: false, poids: 2,
          cout: "la fenêtre court jusqu'à aujourd'hui — ce qui sort est provisoire "
            + "et peut encore bouger d'ici ce soir" },
      ],
      creuses.length
        ? "Ce qui manque n'est pas du travail non fait, c'est du travail non enregistré. "
          + (qui
             ? "Une piste confiée, une pièce affectée, une critique écrite : trois gestes, "
               + "et cette fiche devient tenable."
             : "Les verdicts, les versions et les attentes se posent en travaillant — "
               + "et cette feuille se remplira toute seule.")
        : null,
      []);
  }

  /* ————————————————————— La barre ————————————————————— */

  function barre(hote, rafraichir) {
    var gens = window.EQUIPE ? EQUIPE.encadres() : [];

    var sel = el("select", { onchange: function () { qui = sel.value || null; rafraichir(); } });
    sel.appendChild(el("option", { value: "" }, "Toute l'agence"));
    gens.forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom);
      if (qui === pe.id) o.selected = true;
      sel.appendChild(o);
    });

    return el("div.fm-barre", {},
      el("div.fmb-p", {}, Object.keys(BILAN.PERIODES).map(function (k) {
        var def = BILAN.PERIODES[k];
        return el("button.fmb" + (periode === k ? ".ici" : ""), { type: "button",
          onclick: function () { periode = k; rafraichir(); } }, def.nom);
      })),

      el("div.fmb-q", {}, el("label", {}, "Sur"), sel),

      el("div.fmb-g", {},
        el("button.b.or", { type: "button", onclick: function () { window.print(); } }, "Imprimer"),
        el("button.b.nu", { type: "button", onclick: copier }, "Copier le texte"))
    );
  }

  /* L'outil n'envoie rien : il écrit. */
  function copier() {
    var d = qui ? BILAN.parPersonne(qui, periode) : BILAN.compiler(periode);
    var zone = el("textarea", { rows: 18 });
    zone.value = BILAN.texte(d);
    PANNEAU.ouvrir(d.titre, "en texte", el("div", {},
      UI.banniere("", qui
        ? "À relire avant l'entretien, et à remettre à l'ECCP. C'est la matière, pas la note."
        : "À coller dans un point mensuel ou un mail à la Direction générale."),
      el("div.form", {}, el("div.champ", {}, zone)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          zone.select();
          try { document.execCommand("copy"); } catch (e) { /* le presse-papier peut être fermé */ }
          PANNEAU.fermer();
        } }, "Sélectionner et copier"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Fermer"))
    ));
    setTimeout(function () { zone.focus(); zone.select(); }, 40);
  }

  return { rendre: rendre };
})();
