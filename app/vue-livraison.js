/* vue-livraison.js — la planche de présentation, et la planche de livraison.
 *
 * Pourquoi elle n'existait pas, et pourquoi il fallait forcer le workflow.
 *
 * Le produit modélise une DESCENDANCE : une idée, des pistes, un KV maître,
 * puis N adaptations qui en découlent. Un seul point d'origine, beaucoup
 * d'enfants. Toutes les vues de planche sont construites là-dessus —
 * `vue-planche.js` groupe par KV maître, et sans maître elle n'a rien à
 * montrer.
 *
 * Or la mise à jour d'un parc a la forme INVERSE : N origines qui existent
 * déjà, et UNE règle qu'on applique à toutes. Cinquante-neuf films
 * d'emballage, dix-sept familles de SKU, un code-barres et un QR à poser
 * partout. Il n'y a pas d'idée à concevoir, donc l'étage Concevoir reste vide
 * à jamais et la chaîne annonce « rien ne part » pour toujours. Il n'y a pas
 * de maître, donc les cinquante-neuf tombent dans un unique bloc « Sans
 * master ». Et ce qui se décide UNE FOIS PAR FAMILLE — où va le code-barres,
 * sur quoi pointe le QR, à quelle taille — n'a nulle part où vivre : il se
 * ressaisit cinquante-neuf fois, ou il ne se saisit pas.
 *
 * Cette planche répond aux trois :
 *
 *   elle groupe par FAMILLE, le niveau qui existe déjà dans les données
 *   (marqueId, volet) et qu'aucun écran n'employait ;
 *   elle ne demande ni idée ni maître — une case est due, elle est pleine ou
 *   elle est vide ;
 *   et elle porte le geste de livraison : on tire le dossier de rendus
 *   dessus, chaque fichier trouve sa case, et ce qui hésite se tranche
 *   à la main plutôt que de se ranger tout seul sous le mauvais SKU.
 *
 * Deux lectures d'une même planche, et c'est la même donnée :
 *
 *   LIVRAISON     tout, les trous compris — l'écran de travail
 *   PRÉSENTATION  ce qui est livré, imprimable — l'écran de séance
 */

window.VUE_LIVRAISON = (function () {
  var el = O.el;
  var mode = "livraison";

  function rendre(p, rafraichir) {
    var ls = (p.livrables || []).filter(function (l) { return !l.annule; });
    var familles = grouper(p, ls);
    var pleins = ls.filter(function (l) { return !!l.vignette; });

    var noeud = el("div.plv", {},
      bande(p, ls, pleins, familles, rafraichir),
      tete(p, ls, pleins, rafraichir),
      !familles.length
        ? el("p.rien", {}, "Aucun livrable à ce dossier. La planche se remplit "
            + "quand les livrables existent — elle ne les invente pas.")
        /* Une planche de présentation vide ne se rend pas silencieusement :
         * elle dit qu'il n'y a rien à montrer, et pourquoi. Un écran blanc
         * laisserait croire à une panne. */
        : (mode === "presentation" && !pleins.length)
        ? el("p.rien", {}, "Rien à présenter : aucune des " + ls.length
            + " cases ne porte de visuel. Passe en livraison et dépose les rendus — "
            + "la planche de séance se compose de ce qui est effectivement livré.")
        : el("div.plv-familles", {}, familles.map(function (f) {
            return famille(p, f, rafraichir);
          }))
    );

    /* Le dossier entier se lâche sur la planche. C'est le geste qui remplace
     * le tableur : soixante-et-onze fichiers d'un coup, et chacun trouve sa
     * case — ou se déclare perdu, ce qui vaut mieux que de se ranger au
     * hasard. */
    return zoneDepot(noeud, p, ls, rafraichir);
  }

  /* ————————————————————— La recevabilité ————————————————————— */

  function bande(p, ls, pleins, familles, rafraichir) {
    var manquants = ls.length - pleins.length;
    var sansQui = ls.filter(function (l) { return !l.responsable; }).length;
    var ment = ls.filter(function (l) {
      return (l.releve || {}).ecart === "annonce-sans-fichier"; }).length;

    var controles = [
      { quoi: "Chaque case porte son visuel", ok: manquants === 0, poids: 5,
        cout: manquants + (manquants > 1 ? " cases sont vides" : " case est vide")
          + " : il n'y a pas de planche à montrer, seulement une liste de promesses" },
      { quoi: "Le tableau dit vrai", ok: ment === 0, poids: 5,
        cout: ment + (ment > 1 ? " livraisons sont annoncées faites" : " livraison est annoncée faite")
          + " et rien n'est au dossier — l'écart se découvre à l'impression" },
      { quoi: "Chaque livrable a un responsable", ok: sansQui === 0, poids: 3,
        cout: sansQui + " sans porteur : personne n'est en défaut le jour où ça n'avance pas" },
      { quoi: "Les familles sont identifiées", ok: familles.length > 0, poids: 2,
        cout: "sans famille, la planche est une liste de cinquante-neuf lignes à plat" },
    ];

    return UI.recevabilite("Cette planche peut-elle se montrer ?", controles, null,
      [{ nom: "Déposer un dossier de rendus", fort: manquants > 0,
         quand: function () { choisirLot(p, ls, rafraichir); } }]);
  }

  function tete(p, ls, pleins, rafraichir) {
    return el("div.plv-tete", {},
      el("div.plv-t", {},
        el("span.plv-n", {}, pleins.length + " / " + ls.length),
        el("span.plv-q", {}, pleins.length === ls.length
          ? "la planche est complète — elle se montre telle quelle"
          : (ls.length - pleins.length) + " cases attendent leur visuel. "
            + "Tire le dossier de rendus n'importe où sur la planche.")),
      el("div.plv-modes", {}, [
        { cle: "livraison", nom: "LIVRAISON", quoi: "tout, les trous compris" },
        { cle: "presentation", nom: "PRÉSENTATION", quoi: "ce qui est livré, imprimable" },
      ].map(function (m) {
        return el("button.b" + (mode === m.cle ? ".or" : ".nu"), { type: "button",
          title: m.quoi,
          onclick: function () { mode = m.cle; rafraichir(); } }, m.nom);
      })));
  }

  /* ————————————————————— Les familles ————————————————————— */

  /* Le niveau que le produit avait dans ses données et nulle part à l'écran.
   * Une famille de SKU est ce sur quoi une décision technique se prend une
   * fois : la place du code-barres, la cible du QR, le gabarit d'exé. */
  function grouper(p, ls) {
    var par = {};
    var ordre = [];
    ls.forEach(function (l) {
      var cle = l.marqueId || l.voletId || "sans";
      if (!par[cle]) {
        var mq = l.marqueId ? DEPOT.trouve("marques", l.marqueId) : null;
        var vo = (p.volets || []).filter(function (v) { return v.id === l.voletId; })[0];
        par[cle] = { cle: cle, nom: mq ? mq.nom : vo ? vo.nom : "Sans famille",
          volet: vo ? vo.nom : null, ls: [] };
        ordre.push(par[cle]);
      }
      par[cle].ls.push(l);
    });
    ordre.sort(function (a, b) { return b.ls.length - a.ls.length; });
    return ordre;
  }

  function famille(p, f, rafraichir) {
    var pleins = f.ls.filter(function (l) { return !!l.vignette; });
    var montres = mode === "presentation" ? pleins : f.ls;
    if (mode === "presentation" && !montres.length) return null;

    var noeud = el("section.plv-f", {},
      el("div.plvf-tete", {},
        el("h3", {}, f.nom),
        f.volet ? el("span.plvf-v", {}, f.volet) : null,
        el("span.plvf-n", {}, mode === "presentation"
          ? montres.length + (montres.length > 1 ? " visuels" : " visuel")
          : pleins.length + " / " + f.ls.length)),
      el("div.plvf-mur", {}, montres.map(function (l) {
        return case_(p, l, rafraichir);
      })));

    /* Une famille aussi accepte un lot : c'est le dossier d'une marque qu'on
     * reçoit, rarement les cinquante-neuf d'un coup. */
    return mode === "presentation" ? noeud
      : zoneDepot(noeud, p, f.ls, rafraichir, f.nom);
  }

  /* ————————————————————— Une case ————————————————————— */

  function case_(p, l, rafraichir) {
    var t = TRACE.de(l);
    var noeud = el("button.plvc" + (l.vignette ? ".pleine" : ".vide")
      + (t.cle === "trace" ? ".tracee" : ""), {
      type: "button", title: l.nom,
      onclick: function () { VUE_LIVRABLE.ouvrir(p, l, rafraichir); } },
      IMAGE.vignette(l, "planche"),
      el("span.plvc-bas", {},
        el("span.plvc-n", {}, l.nom),
        el("span.plvc-m", {}, [
          "V" + (l.version || 1),
          (l.fichiers || []).length ? (l.fichiers || []).length + " fichiers" : null,
          l.responsable ? null : "sans responsable",
        ].filter(Boolean).join("  ·  "))));

    return mode === "presentation" ? noeud
      : IMAGE.accepterDepot(noeud, l, rafraichir);
  }

  /* ————————————————————— Le dépôt d'un lot ————————————————————— */

  function zoneDepot(noeud, p, ls, rafraichir, ou) {
    noeud.addEventListener("dragover", function (e) {
      if (mode === "presentation") return;
      e.preventDefault(); noeud.classList.add("survol-lot");
    });
    noeud.addEventListener("dragleave", function (e) {
      if (e.target === noeud) noeud.classList.remove("survol-lot");
    });
    noeud.addEventListener("drop", function (e) {
      if (mode === "presentation") return;
      noeud.classList.remove("survol-lot");
      var fs = e.dataTransfer && e.dataTransfer.files;
      if (!fs || !fs.length) return;
      /* Un seul fichier lâché sur une case précise : c'est la case qui gagne,
       * elle a déjà traité l'évènement. */
      if (e.defaultPrevented) return;
      e.preventDefault(); e.stopPropagation();
      arbitrer(p, ls, [].slice.call(fs), rafraichir, ou);
    });
    return noeud;
  }

  function choisirLot(p, ls, rafraichir) {
    var entree = document.createElement("input");
    entree.type = "file"; entree.multiple = true;
    entree.addEventListener("change", function () {
      if (entree.files.length) arbitrer(p, ls, [].slice.call(entree.files), rafraichir);
    });
    entree.click();
  }

  /* ————————————————————— L'arbitrage, avant la pose ————————————————————— */

  /* Rien ne se pose sans être montré d'abord.
   *
   * Un appariement automatique qui se trompe range un artwork sous le mauvais
   * SKU, et cette erreur-là s'imprime. On affiche donc ce qui va se passer,
   * ligne par ligne, on laisse trancher ce qui hésite, et on ne pose que ce
   * qui est décidé. Ce qui ne correspond à rien reste dehors, visible. */
  function arbitrer(p, ls, fichiers, rafraichir, ou) {
    var r = IMAGE.apparier(ls, fichiers);
    var choix = {};
    r.forEach(function (x, i) { choix[i] = x.l ? x.l.id : ""; });

    var surs = r.filter(function (x) { return x.etat === "sur"; }).length;
    var hesite = r.filter(function (x) { return x.etat === "hesite"; }).length;
    var aucun = r.filter(function (x) { return x.etat === "aucun"; }).length;

    function options(x) {
      var sel = el("select", {});
      sel.appendChild(el("option", { value: "" }, "— ne pas poser ce fichier —"));
      /* Les candidats plausibles d'abord, puis tout le reste : on ne cache
       * jamais une case, on la range plus bas. */
      var vus = {};
      x.autres.forEach(function (a) {
        vus[a.l.id] = 1;
        sel.appendChild(el("option", { value: a.l.id },
          a.l.nom + "  ·  " + Math.round(a.s * 100) + " %"));
      });
      ls.forEach(function (l) {
        if (vus[l.id]) return;
        sel.appendChild(el("option", { value: l.id }, l.nom));
      });
      return sel;
    }

    var lignes = r.map(function (x, i) {
      var sel = options(x);
      sel.value = choix[i];
      sel.addEventListener("change", function () { choix[i] = sel.value; });
      return el("div.arb-l." + x.etat, {},
        el("div.arb-f", {},
          el("span.arb-fn", {}, x.f.name),
          el("span.arb-e", {}, x.etat === "sur" ? "appariement sûr"
            : x.etat === "hesite" ? "deux cases se valent — tranche"
            : "ne correspond à aucune case")),
        el("div.arb-c", {}, sel));
    });

    PANNEAU.sur("Déposer " + fichiers.length + (fichiers.length > 1 ? " fichiers" : " fichier"),
      (ou ? ou + " · " : "") + p.nom, el("div", {},
      UI.banniere(aucun ? "rouge" : "",
        surs + (surs > 1 ? " fichiers trouvent leur case" : " fichier trouve sa case")
        + (hesite ? ", " + hesite + " hésitent entre deux — le nom ne suffit pas à trancher" : "")
        + (aucun ? ", " + aucun + " ne correspondent à rien et resteront dehors" : "")
        + ".  Rien n'est posé tant que tu n'as pas validé : un artwork rangé sous le "
        + "mauvais SKU s'imprime."),

      el("div.arb", {}, lignes),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var couples = [];
          r.forEach(function (x, i) {
            var id = choix[i];
            if (!id) return;
            var l = ls.filter(function (y) { return y.id === id; })[0];
            if (l) couples.push({ f: x.f, l: l });
          });
          if (!couples.length) {
            AVIS.refus("Aucun fichier n'est apparié : il n'y a rien à poser.");
            return;
          }
          PANNEAU.fermerSur();
          DEPOT.tracer("fichier", "livraison", p.id,
            couples.length + " fichiers posés depuis la planche");
          IMAGE.poserLot(couples, function () { rafraichir(); });
        } }, "Poser ce qui est apparié"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { rendre: rendre };
})();
