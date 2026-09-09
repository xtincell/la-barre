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

  var FILTRES = [
    { cle: "tout", nom: "TOUT", quoi: "tout ce qui est dû et n'est pas arrivé" },
    { cle: "dement", nom: "LE TABLEAU MENT", quoi: "annoncé fait, rien au dossier" },
    { cle: "depasse", nom: "EN RETARD", quoi: "la remise est passée" },
    { cle: "sansTrace", nom: "SANS TRACE", quoi: "rien, nulle part" },
    { cle: "aTracer", nom: "À TRACER", quoi: "fait, non déposé — mon geste" },
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
        ? el("div.liv-liste", {}, lignes.map(function (x) { return ligne(hote, x); }))
        : el("p.rien", {}, filtre === "tout" && !projetId
            ? "Aucun livrable en souffrance. Tout ce qui est dû est arrivé, ou n'est pas encore exigible."
            : "Rien dans cette sélection.")
    ));
  }

  /* ————————————————————— Les filtres ————————————————————— */

  function barreFiltres(hote, comptes) {
    var selP = el("select", { onchange: function () { projetId = selP.value; rendre(hote); } });
    selP.appendChild(el("option", { value: "" }, "— tous les dossiers —"));
    DEPOT.liste("projets").forEach(function (p) {
      var o = el("option", { value: p.id }, (p.ref ? p.ref + " · " : "") + p.nom);
      if (p.id === projetId) o.selected = true;
      selP.appendChild(o);
    });

    return el("div.liv-filtres", {},
      el("div.liv-deg", {}, FILTRES.map(function (f) {
        var n = comptes[f.cle] || 0;
        return el("button.livf" + (filtre === f.cle ? ".ici" : "") + (n ? "" : ".vide"), {
          type: "button", title: f.quoi,
          onclick: function () { filtre = f.cle; rendre(hote); } },
          el("span.livf-n", {}, f.nom),
          el("span.livf-c", {}, String(n)));
      })),
      el("div.liv-p", {}, el("label", {}, "Dossier"), selP));
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
        el("span.livl-deg", { title: s.quoi }, s.nom),
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
          ? el("div.livl-f", {}, el("span.livl-fe", {}, "fichier attendu"), a.fichier)
          : null,
        el("div.livl-q", {}, a ? a.quoi : s.quoi)),

      el("div.livl-qui", {},
        qui ? el("span.livl-p", {}, qui.nom) : el("span.livl-p.sans", {}, "sans responsable"),
        l.remise ? el("span.livl-d", {}, "remise " + O.jourCourt(l.remise))
          : el("span.livl-d.sans", {}, "sans date")),

      el("div.livl-g", {},
        /* Le geste principal : le fichier entre ici, sur la ligne. C'est la
         * seule façon que le suivi cesse d'être une ressaisie. */
        el("button.b.or", { type: "button",
          onclick: function () { IMAGE.importer(l, function () { rendre(hote); }); } },
          "Importer"),
        el("button.b.nu", { type: "button",
          onclick: function () { VUE_LIVRABLE.ouvrir(p, l, function () { rendre(hote); }); } },
          "Ouvrir"))
    );

    /* Le fichier se lâche sur la ligne. Deux cents livraisons ne se saisissent
     * pas au formulaire ; elles se glissent depuis le Finder. */
    return IMAGE.accepterDepot(noeud, l, function () { rendre(hote); });
  }

  return { rendre: rendre, FILTRES: FILTRES };
})();
