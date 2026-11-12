/* vue-livraisons.js — les livrables en souffrance.
 *
 * Le tableur qu'il faut remplacer.
 *
 * Le suivi des livraisons vivait dans un Excel tenu à la main, relu ligne par
 * ligne, et faux dès qu'un fichier arrivait sans que personne ne l'y écrive.
 * Le produit portait déjà toute la matière — un responsable, une date de
 * remise, des versions, des fichiers, et le relevé de ce que le client
 * annonce — mais aucun écran ne la posait côte à côte. On retournait donc au
 * tableur, qui, lui, tenait sur un seul écran.
 *
 * Celui-ci le remplace à trois conditions, et elles sont toutes des refus :
 *
 *   1. Il ne mélange pas « pas fait » et « pas tracé ». C'est TRACE qui
 *      tranche, et c'est ce qui protège de l'impair : relancer quelqu'un sur
 *      un travail qu'il a rendu.
 *   2. Il ne classe pas par date mais par COÛT. Une ligne de tableau qui
 *      annonce une livraison faite alors que rien n'est au dossier coûte plus
 *      cher qu'une date dépassée qu'on voit — parce qu'elle, on ne la voit
 *      pas, et qu'on la découvre à l'impression.
 *   3. Il porte le geste, pas seulement le constat. Importer le fichier se
 *      fait ici, sur la ligne, sans ouvrir le livrable — sinon on retourne au
 *      tableur, où au moins on ne clique pas.
 */

window.VUE_LIVRAISONS = (function () {
  var el = O.el;
  var filtre = "tout";
  var projetId = "";
  /* Cinq cents lignes en souffrance faisaient cinquante mille pixels : on les
   * lit par tranches de trente, dans l'ordre du coût. */
  var LOT = 30;
  var montres = LOT;

  var FILTRES = [
    { cle: "tout", nom: "Tout", quoi: "tout ce qui est dû et n'est pas arrivé" },
    { cle: "dement", nom: "Le tableau ment", quoi: "annoncé fait, rien au dossier" },
    { cle: "depasse", nom: "En retard", quoi: "la remise est passée" },
    { cle: "sansTrace", nom: "Sans trace", quoi: "rien, nulle part" },
    { cle: "aTracer", nom: "À tracer", quoi: "fait, non déposé — mon geste" },
  ];

  function rendre(hote) {
    O.vider(hote);

    var tout = TRACE.enSouffrance();
    var lignes = tout.filter(function (x) {
      if (projetId && x.projet.id !== projetId) return false;
      if (filtre !== "tout" && x.s.cle !== filtre) return false;
      return true;
    });

    var comptes = {};
    tout.forEach(function (x) {
      if (projetId && x.projet.id !== projetId) return;
      comptes[x.s.cle] = (comptes[x.s.cle] || 0) + 1;
      comptes.tout = (comptes.tout || 0) + 1;
    });

    hote.appendChild(el("div.liv", {},
      barreFiltres(hote, comptes),
      lignes.length
        ? el("section.liv-liste", {}, lignes.slice(0, montres).map(function (x) { return ligne(hote, x); }))
        : el("p.rien", {}, filtre === "tout" && !projetId
            ? "Aucun livrable en souffrance. Tout ce qui est dû est arrivé, ou n'est pas encore exigible."
            : "Rien dans cette sélection."),
      lignes.length > montres
        ? el("button.studio-lien.liv-plus", { type: "button",
            onclick: function () { montres += LOT; rendre(hote); } },
            "Afficher les " + Math.min(LOT, lignes.length - montres) + " suivantes · "
            + (lignes.length - montres) + " restent")
        : null
    ));
  }

  /* ————————————————————— Les filtres ————————————————————— */

  function barreFiltres(hote, comptes) {
    var selP = el("select", { id: "liv-dossier",
      onchange: function () { projetId = selP.value; montres = LOT; rendre(hote); } });
    selP.appendChild(el("option", { value: "" }, "Tous les dossiers"));
    DEPOT.liste("projets").forEach(function (p) {
      var o = el("option", { value: p.id }, (p.ref ? p.ref + " · " : "") + p.nom);
      if (p.id === projetId) o.selected = true;
      selP.appendChild(o);
    });

    return el("div.liv-filtres", {},
      el("div.liv-deg", {}, FILTRES.map(function (f) {
        var n = comptes[f.cle] || 0;
        return el("button.chip", {
          type: "button", title: f.quoi, "aria-pressed": filtre === f.cle ? "true" : "false",
          onclick: function () { filtre = f.cle; montres = LOT; rendre(hote); } },
          f.nom, el("span.n", {}, String(n)));
      })),
      el("div.liv-p", {}, el("label", { "for": "liv-dossier" }, "Dossier"), selP));
  }

  /* ————————————————————— Une ligne ————————————————————— */

  /* Elle porte l'état, sa conséquence, son coût et le prochain geste — dans cet
   * ordre, et le geste est cliquable là où on le lit. */
  function ligne(hote, x) {
    var l = x.l, p = x.projet, s = x.s, a = x.attendu;
    var qui = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    var sup = DEPOT.trouve("supports", l.support);

    var noeud = el("div.livl." + s.ton, {},
      el("div.livl-e", {},
        el("span.livl-deg", { title: s.quoi },
          el("span.livl-signe", { "aria-hidden": "true" }, s.ton === "alerte" ? "● " : "◐ "),
          s.nom.charAt(0).toUpperCase() + s.nom.slice(1)),
        s.jours !== null && s.jours > 0
          ? el("span.livl-j", {}, s.jours + (s.jours > 1 ? " jours" : " jour"))
          : null),

      el("div.livl-c", {},
        el("div.livl-n", {}, l.nom),
        el("div.livl-m", {}, [
          (p.ref ? p.ref + " · " : "") + p.nom,
          sup ? sup.nom : null,
          "V" + (l.version || 1),
        ].filter(Boolean).join("  ·  ")),
        a && a.fichier
          ? el("div.livl-f", {}, el("span.livl-fe", {}, "Fichier attendu"), a.fichier)
          : null,
        el("div.livl-q", {}, a ? a.quoi : s.quoi)),

      el("div.livl-qui", {},
        qui ? el("span.livl-p", {}, qui.nom) : el("span.livl-p.sans", {}, "◐ Sans responsable"),
        l.remise ? el("span.livl-d", {}, "Remise " + O.jourCourt(l.remise))
          : el("span.livl-d.sans", {}, "◐ Sans date")),

      el("div.livl-g", {},
        /* Le geste principal : le fichier entre ici, sur la ligne. C'est la
         * seule façon que le suivi cesse d'être une ressaisie. */
        /* Un geste par ligne, pas cinq cents boutons pleins : l'action
         * principale de l'écran reste rare. */
        el("button.b", { type: "button",
          onclick: function () { IMAGE.importer(l, function () { rendre(hote); }); } },
          "Importer"),
        el("button.studio-lien", { type: "button",
          onclick: function () { VUE_LIVRABLE.ouvrir(p, l, function () { rendre(hote); }); } },
          "Ouvrir"))
    );

    /* Le fichier se lâche sur la ligne. Deux cents livraisons ne se saisissent
     * pas au formulaire ; elles se glissent depuis le Finder. */
    return IMAGE.accepterDepot(noeud, l, function () { rendre(hote); });
  }

  return { rendre: rendre, FILTRES: FILTRES };
})();
