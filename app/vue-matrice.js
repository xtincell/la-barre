/* vue-matrice.js — les volets, la matrice support × marché, et le livrable.
 *
 * On ne saisit pas soixante livrables : on croise. Chaque case hérite du
 * référentiel — dimensions, langue, mentions — et ne porte que ce qui lui est
 * propre.
 */

window.VUE_MATRICE = (function () {
  var el = O.el;

  /* Trois lectures du même jeu : le calendrier, qui date ; le mur, qui montre ;
   * la grille, qui compte. La bonne lecture par défaut dépend de ce que le
   * dossier produit — et elle se retient PAR DOSSIER : un mode partagé faisait
   * arriver sur Ecobank avec le mur de Back-To-School, c'est-à-dire avec la
   * vue d'une campagne sur un cycle éditorial. */
  var MODES = {};

  function modeDe(p, permis) {
    var m = MODES[p.id];
    if (!m || permis.indexOf(m) === -1) m = permis[0];
    return m;
  }

  /* Le mur faisait dix-sept mille pixels de haut et deux cent douze gestes
   * cliquables : cent quatre-vingt-neuf pièces à plat, sans repli ni filtre.
   * Vingt écrans de défilement pour choisir une pièce, ce n'est pas une vue
   * dense, c'est une vue qu'on ne lit pas.
   *
   * Deux gestes le corrigent, et ils vont ensemble. Le repli montre l'état de
   * chaque bloc en une ligne — on déplie ce qu'on travaille. Le filtre écarte
   * ce qu'on ne travaille pas. L'un sans l'autre laisse encore trop.
   *
   * Ce qui est déplié se retient d'un rendu à l'autre : replier ce qu'on vient
   * d'ouvrir à chaque clic serait pire que de tout laisser ouvert. */
  var deplie = {};
  var filtre = { marque: null, marche: null, bloque: false, muette: false };

  function ouvert(cle) { return deplie[cle] === true; }
  function basculer(cle) { deplie[cle] = !deplie[cle]; }

  /* Un filtre actif veut dire « montre-moi ça » : ce qui passe le filtre
   * s'ouvre tout seul, sinon on filtre pour ne rien voir. */
  function filtreActif() {
    return !!(filtre.marque || filtre.marche || filtre.bloque || filtre.muette);
  }

  /* Une pièce sans visuel ne se juge pas — c'est la première phrase du
   * produit. Ce n'est pas un blocage au sens des règles, et ça ne doit pas se
   * confondre avec eux : c'est l'état qui décide si la case sert à quelque
   * chose. Sur ce dossier, 175 pièces sur 189 sont dans ce cas. */
  function muette(l) { return !l.vignette; }

  /* Ce qui bloque une pièce : son maître a bougé, ou un retour n'est pas
   * traité. Ce sont les deux seules choses qui empêchent de la livrer. */
  function bloquee(p, l) {
    return REGLES.maitrePerime(p, l) || ANNOT.ouvertes(l).length > 0;
  }

  function retenue(p, l) {
    if (filtre.marque && l.marqueId !== filtre.marque) return false;
    if (filtre.marche && l.marche !== filtre.marche) return false;
    if (filtre.bloque && !bloquee(p, l)) return false;
    if (filtre.muette && !muette(l)) return false;
    return true;
  }

  function rendre(p, rafraichir) {
    var volets = p.volets || [];
    var tout = (p.livrables || []).filter(function (l) { return !l.annule; });

    /* Un dossier ne se suit pas de la même façon selon ce qu'il produit.
     *
     * Le mur par route et par maître est la vue d'une CAMPAGNE : la question y
     * est « le maître est-il posé, et qu'est-ce qu'il périme ». Un CYCLE
     * éditorial n'a pas de maître — dix-sept publications datées sur un mois
     * n'en ont pas besoin, et les ranger sous « sans maître » les décrivait
     * par un manque qui n'en est pas un. Ce qu'on y suit, c'est le calendrier
     * et le contenu de chaque post.
     *
     * La nature se déduit des pièces ; le mode reste choisissable, parce
     * qu'un dossier mixte existe. */
    var nat = window.VUE_CYCLE ? VUE_CYCLE.nature(p) : "campagne";
    var modes = nat === "cycle" ? ["calendrier", "mur", "grille"] : ["mur", "grille"];
    var MODE = modeDe(p, modes);

    return el("div", {},
      planDeCampagne(p),
      el("div.section-titre", {}, nat === "cycle" ? "Publications" : "Livrables",
        el("span.taille", {}, "· " + tout.length),
        el("span.droite", {}, el("div.pl-densite", {},
          modes.map(function (m) {
            return el("button.pld" + (MODE === m ? ".actif" : ""), { type: "button",
              onclick: function () { MODES[p.id] = m; rafraichir(); } }, m);
          })))),

      MODE === "calendrier" ? VUE_CYCLE.rendre(p, rafraichir)
        : MODE === "mur" ? mur(p, rafraichir)
        : volets.length
          ? volets.map(function (v) { return blocVolet(p, v, rafraichir); })
          : el("p.rien", {}, "Aucun volet. Un volet croise des supports et des marchés — c'est lui qui engendre les livrables."),

      el("div.form-actions", { style: { "margin-top": "1rem" } },
        el("button.b.or", { type: "button", onclick: function () { editerVolet(p, null, rafraichir); } }, "Ajouter un volet"),
        el("button.b", { type: "button", onclick: function () { frise(p); } }, "Voir la frise")
      )
    );
  }


  /* ————————————————————— Une ombrelle, plusieurs marques ————————————————————— */

  /* Trois marques qui partagent une campagne ne sont pas trois déclinaisons
   * d'une même chose : chacune a son message, ses couleurs, ses packs et ses
   * marchés. Présenter le dossier sans ça, c'est montrer à FrieslandCampina
   * un plan où Peak parle comme Bonnet Rouge. On sépare donc ce qui est
   * partagé — la mécanique, la scène, les modèles — de ce qui appartient à
   * chaque marque. */
  function planDeCampagne(p) {
    var c = p.campagne;
    if (!c || !(c.marques || []).length) return null;

    return el("div.pc", {},
      el("div.pc-h", {},
        el("div.pch-o", {},
          el("span.pcho-t", {}, "MARQUE OMBRELLE"),
          el("span.pcho-n", {}, c.ombrelle ? c.ombrelle.nom : "—"),
          c.ombrelle && !c.ombrelle.logo
            ? el("span.pcho-x", {}, c.ombrelle.note || "logo non fourni")
            : null),
        el("div.pch-n", {}, c.marques.length + " marques produit, une seule campagne")),

      /* Ce qui est partagé : c'est ce qui se produit une fois et sert partout. */
      el("div.pc-p", {},
        el("div.pcp-t", {}, "CE QUI EST PARTAGÉ",
          el("span", {}, "produit une fois, sert aux trois")),
        el("div.pcp-l", {}, (c.partage || []).map(function (x) {
          return el("div.pcp-i", {},
            el("span.pcpi-q", {}, x.quoi),
            el("span.pcpi-v", {}, x.valeur));
        }))),

      /* Ce qui est propre : c'est ce qui se produit trois fois, et se valide
       * trois fois. Une ligne mal recopiée d'une marque à l'autre est une
       * campagne qui parle faux. */
      el("div.pc-m", {}, c.marques.map(function (m) { return colonneMarque(p, m); }))
    );
  }

  /* Une campagne ne définit pas une marque : elle en RETIENT une part. Cette
   * colonne dit donc la sélection — combien de marchés sur ceux où la marque
   * est distribuée, combien de packs sur son catalogue — et le message de
   * cette saison, qui lui appartient. Le reste vit au vault. */
  function colonneMarque(p, m) {
    var sel = VAULT.selection(p, m.id);
    var v = VAULT.de(m.id) || {};
    var e = VAULT.etat(m.id);
    var couleur = v.couleur || "var(--trait-clair)";
    var kvs = (p.livrables || []).filter(function (l) {
      return !l.annule && l.marqueId === m.id && l.niveau === "adaptation"; });
    var poses = kvs.filter(function (l) { return l.vignette; }).length;

    return el("div.pcm", { style: { "border-top-color": couleur } },
      el("div.pcm-t", {},
        el("span.pcmt-n", {}, el("span.pcmt-p", { style: { background: couleur } }), m.nom),
        el("a.pcmt-v", { href: "#/maison/marques" },
          e.ecrits ? "son vault →" : "aucun socle au vault →")),

      /* La sélection : c'est ça, une campagne. */
      el("div.pcm-b", {},
        el("span.pcmb-t", {}, "CE QUE LA CAMPAGNE RETIENT"),
        el("div.pcm-sel", {},
          ligneSel(sel.marchesRetenus.length, sel.marchesDisponibles, "marchés",
            sel.marchesRetenus.map(function (x) { return x.code; }).join("  ·  ")),
          ligneSel(sel.skuRetenus, sel.skuCatalogue, "packs",
            sel.skuRetenus ? null : "aucun pack déclaré sur les pièces"),
          el("div.pcms", {},
            el("span.pcms-c", {}, String(sel.pieces)),
            el("span.pcms-n", {}, sel.pieces > 1 ? "pièces" : "pièce"),
            el("span.pcms-x", {}, "à produire")))),

      /* Ce qui appartient à cette campagne, et à elle seule : le message. */
      el("div.pcm-b", {},
        el("span.pcmb-t", {}, "SON MESSAGE, CETTE SAISON"),
        Object.keys(m.claim || {}).map(function (lg) {
          return el("div.pcmb-l", {},
            el("span.pcmbl-lg", {}, lg.toUpperCase()),
            el("span.pcmbl-v", {}, m.claim[lg]));
        }),
        m.mecaniquePromo
          ? el("div.pcmb-promo", {},
              el("span.pcmbl-lg", {}, "PROMO"),
              el("span.pcmbl-v", {}, m.mecaniquePromo.titre,
                el("i", {}, m.mecaniquePromo.detail)))
          : null),

      el("div.pcm-b", {},
        el("span.pcmb-t", {}, "SIGNATURE"),
        Object.keys(m.signature || {}).map(function (lg) {
          return el("div.pcmb-l", {},
            el("span.pcmbl-lg", {}, lg.toUpperCase()),
            el("span.pcmbl-v", {}, m.signature[lg]));
        })),

      el("div.pcm-b", {},
        el("span.pcmb-t", {}, "OMBRE PORTÉE"),
        el("div.pcm-chips", {}, (m.ombres || []).map(function (o) {
          return el("span.pcm-chip", {}, o); }))),

      el("div.pcm-e" + (poses === kvs.length && kvs.length ? ".ok" : ""), {},
        kvs.length
          ? poses + " KV posés sur " + kvs.length
            + (poses < kvs.length
                ? " — " + (kvs.length - poses)
                  + (kvs.length - poses > 1 ? " marchés attendent leur visuel" : " marché attend son visuel")
                : " — tous les marchés ont le leur")
          : "aucune adaptation : cette marque n'est servie nulle part"),

      m.note ? el("div.pcm-n", {}, m.note) : null
    );
  }

  /* Retenu sur disponible. L'écart n'est pas un manque : c'est le choix qu'on
   * a fait, et il doit se voir pour pouvoir se défendre. */
  function ligneSel(retenu, total, quoi, detail) {
    return el("div.pcmsel", {},
      el("span.pcmsel-c", {}, retenu + " / " + total),
      el("span.pcmsel-n", {}, quoi),
      detail ? el("span.pcmsel-d", {}, detail) : null);
  }

  /* ————— Le mur : par route, puis par marque, puis par KV maître ————— */

  function mur(p, rafraichir) {
    var pistes = (p.sections.pistes || []);
    var toutes = (p.livrables || []).filter(function (l) { return !l.annule; });

    /* Le filtre garde les pièces retenues, et avec elles le maître dont elles
     * dépendent : une adaptation sans sa référence à l'écran, c'est une
     * adaptation qu'on juge sans savoir de quoi elle découle. */
    var tout = toutes;
    if (filtreActif()) {
      var gardes = {};
      toutes.forEach(function (l) { if (retenue(p, l)) gardes[l.id] = true; });
      toutes.forEach(function (l) { if (gardes[l.id] && l.maitre) gardes[l.maitre] = true; });
      tout = toutes.filter(function (l) { return gardes[l.id]; });
    }
    var vises = filtreActif()
      ? toutes.filter(function (l) { return retenue(p, l); }).length : tout.length;

    var places = {};
    var blocs = pistes.map(function (pi) {
      var ls = tout.filter(function (l) { return l.pisteId === pi.id; });
      ls.forEach(function (l) { places[l.id] = true; });
      return { pi: pi, ls: ls };
    }).filter(function (b) { return b.ls.length; });

    var hors = tout.filter(function (l) { return !places[l.id]; });

    return el("div", {},
      filtres(p, toutes, tout, vises, rafraichir),
      el("div.mur-r", {},
        blocs.map(function (b) { return blocRoute(p, b.pi, b.ls, rafraichir); }),
        hors.length ? blocRoute(p, null, hors, rafraichir) : null,
        !blocs.length && !hors.length
          ? el("p.rien", {}, filtreActif()
              ? "Aucune pièce ne passe ce filtre. Ce n'est pas forcément une absence : "
                + "c'est peut-être un croisement qu'on n'a jamais produit."
              : "Aucun livrable. Une route retenue engendre ses pièces — c'est là qu'elles naissent.")
          : null)
    );
  }

  /* ————————————————————— Écarter ce qu'on ne travaille pas ————————————————————— */

  /* Les filtres ne listent que ce qui existe, et chacun porte son compte :
   * proposer un marché vide, c'est promettre un croisement qu'on n'a pas. */
  function filtres(p, toutes, montrees, vises, rafraichir) {
    if (toutes.length < 12) return null;

    var mqs = (p.campagne && p.campagne.marques) || [];
    var marches = [];
    toutes.forEach(function (l) {
      if (l.marche && marches.indexOf(l.marche) === -1) marches.push(l.marche);
    });
    var bloquees = toutes.filter(function (l) { return bloquee(p, l); }).length;
    var muettes = toutes.filter(muette).length;

    function compteMq(id) {
      return toutes.filter(function (l) { return l.marqueId === id; }).length;
    }
    function compteMa(id) {
      return toutes.filter(function (l) { return l.marche === id; }).length;
    }
    function bouton(actif, texte, quand) {
      return el("button.vtf" + (actif ? ".ici" : ""), { type: "button",
        onclick: function () { quand(); rafraichir(); } }, texte);
    }

    return el("div.vt-f.mr-f", {},
      el("div.mrf-e", {}, filtreActif()
        ? vises + (vises > 1 ? " pièces sur " : " pièce sur ") + toutes.length
          + " — le reste est écarté, pas absent"
          + (montrees.length > vises
              ? ", et " + (montrees.length - vises)
                + (montrees.length - vises > 1 ? " références dont elles découlent" : " référence dont elles découlent")
                + " restent à l'écran"
              : "")
        : toutes.length + " pièces. Déplie ce que tu travailles ; le compte de chaque "
          + "bloc dit ce qu'il y a dedans."),

      mqs.length > 1
        ? el("div.vtf-g", {},
            bouton(!filtre.marque, "toutes les marques", function () { filtre.marque = null; }),
            mqs.filter(function (m) { return compteMq(m.id); }).map(function (m) {
              return bouton(filtre.marque === m.id, m.nom + " · " + compteMq(m.id),
                function () { filtre.marque = filtre.marque === m.id ? null : m.id; });
            }))
        : null,

      marches.length > 1
        ? el("div.vtf-g", {},
            bouton(!filtre.marche, "tous les marchés", function () { filtre.marche = null; }),
            marches.map(function (id) {
              var m = DEPOT.trouve("marches", id);
              return bouton(filtre.marche === id, (m ? m.code : id) + " · " + compteMa(id),
                function () { filtre.marche = filtre.marche === id ? null : id; });
            }))
        : null,

      (bloquees || muettes)
        ? el("div.vtf-g", {},
            bloquees
              ? bouton(filtre.bloque, bloquees + (bloquees > 1 ? " pièces bloquées" : " pièce bloquée"),
                  function () { filtre.bloque = !filtre.bloque; })
              : null,
            muettes
              ? bouton(filtre.muette, muettes + (muettes > 1 ? " sans visuel" : " sans visuel"),
                  function () { filtre.muette = !filtre.muette; })
              : null)
        : null
    );
  }

  function blocRoute(p, pi, ls, rafraichir) {
    var kvs = ls.filter(KV.estKV);
    var reste = ls.filter(function (l) { return !KV.estKV(l); });
    var perimes = ls.filter(function (l) { return REGLES.maitrePerime(p, l); }).length;

    /* Sous chaque KV maître, ses formats. Le reste va dans « sans maître ». */
    /* Le maître d'abord, puis les adaptations. Un maître n'a pas de marché :
     * c'est ce qui le distingue d'une adaptation, pas un oubli. */
    var plusieursMaitres = kvs.filter(KV.estMaitre).length > 1;
    var groupes = kvs.slice().sort(function (a, b) {
      return KV.NIVEAUX[KV.niveau(a)].rang - KV.NIVEAUX[KV.niveau(b)].rang;
    }).map(function (kv) {
      var m = DEPOT.trouve("marches", kv.marche);
      var maitre = KV.estMaitre(kv);
      /* Une route peut porter plusieurs maîtres — une marque et une catégorie
       * de produit chacun. « La référence » au singulier les rendait tous
       * identiques à l'œil : on nomme celui dont il s'agit. */
      var nom;
      if (!maitre) nom = m ? "Adaptation " + m.nom : "sans marché";
      else if (plusieursMaitres) nom = kv.nom.replace(/^KV maître\s*·\s*/, "") + " — la référence";
      else nom = "La référence — aucun marché";
      return { kv: kv, code: maitre ? "MAÎTRE" : (m ? m.code : "?"), nom: nom,
        ls: reste.filter(function (l) { return l.maitre === kv.id; }) };
    });
    var orphelins = reste.filter(function (l) {
      return !kvs.some(function (kv) { return kv.id === l.maitre; }); });

    /* Ce que les volets ont promis. Un marché promis que rien ne porte n'est
     * pas une absence : c'est un engagement pris et non tenu, et il doit
     * occuper une case comme les autres — sinon il ne se voit qu'à la
     * livraison, quand le client demande où est sa version. */
    var promis = {};
    (p.volets || []).forEach(function (v) {
      (v.marches || []).forEach(function (id) { promis[id] = true; });
    });
    var servis = {};
    groupes.forEach(function (g) { if (g.kv.marche) servis[g.kv.marche] = true; });
    reste.forEach(function (l) { if (l.marche) servis[l.marche] = true; });
    /* La promesse est due par une route qui sert déjà : c'est l'asymétrie qui
     * fait le trou. Une route qui ne sert aucun marché n'a pas de trou — elle
     * est vide, ce qui est un autre problème et se dit ailleurs. */
    var doit = Object.keys(servis).length > 0;
    var trous = !doit ? [] : Object.keys(promis).filter(function (id) { return !servis[id]; })
      .map(function (id) { return DEPOT.trouve("marches", id); }).filter(Boolean);

    /* Quand la route porte plusieurs marques, on ne mélange pas leurs maîtres :
     * chaque marque est un bloc, avec son filet à sa couleur. Sinon on lit
     * quatorze KV d'affilée sans savoir lequel parle au nom de qui. */
    var parMarque = groupesParMarque(p, groupes, reste);

    return el("div.mr-route" + (pi && pi.statut === "retenue" ? ".retenue" : pi ? "" : ".hors"), {},
      el("div.mr-tete", {},
        el("span.mrt-nom", {}, pi ? (pi.titre || "Route sans titre") : "Hors route"),
        ETAT.pastille(ETAT.piste(p, pi)),
        el("span.mrt-n", {}, ls.length + (ls.length > 1 ? " pièces" : " pièce")
          + (perimes ? "  ·  " + perimes + " à regénérer" : "")),
        pi ? el("button.b.nu", { type: "button", onclick: function () { VUE_ROUTE.ouvrir(p, pi, rafraichir); } },
          "la route →") : null
      ),

      parMarque.map(function (bloc) {
        var cleMq = p.id + ":mq:" + (pi ? pi.id : "hors") + ":" + (bloc.m ? bloc.m.id : "sans");
        var mqOuvert = !bloc.m || filtreActif() || ouvert(cleMq);
        var pieces = bloc.groupes.reduce(function (a, g) {
          return a.concat([g.kv], g.ls); }, []);
        var bloques = pieces.filter(function (l) { return bloquee(p, l); }).length;
        var sansVisuel = pieces.filter(muette).length;

        return el("div.mr-mq" + (mqOuvert ? "" : ".replie"),
          bloc.m ? { style: { "border-left-color": (VAULT.de(bloc.m.id) || {}).couleur || "var(--trait-clair)" } } : {},
          bloc.m
            ? el("button.mrmq-t", { type: "button",
                onclick: function () { basculer(cleMq); rafraichir(); } },
                el("span.mrmqt-n", {}, el("span.pcmt-p", { style: { background: (VAULT.de(bloc.m.id) || {}).couleur || "var(--trait-clair)" } }), bloc.m.nom),
                /* Replié, ce bloc doit se lire sans s'ouvrir : combien de
                 * pièces, sur combien de KV, et ce qui bloque. */
                el("span.mrmqt-q", {}, bloc.n + (bloc.n > 1 ? " pièces" : " pièce")
                  + "  ·  " + bloc.groupes.length + " KV"
                  + (sansVisuel ? "  ·  " + sansVisuel + " sans visuel" : "")
                  + (bloques ? "  ·  " + bloques + (bloques > 1 ? " bloquées" : " bloquée") : "")),
                el("span.mrmqt-x", {}, mqOuvert ? "−" : "+"))
            : null,

          mqOuvert ? bloc.groupes.map(function (g) {
        var cleKv = p.id + ":kv:" + g.kv.id;
        var kvOuvert = filtreActif() || ouvert(cleKv);
        var dedans = [g.kv].concat(g.ls);
        var bl = dedans.filter(function (l) { return bloquee(p, l); }).length;
        var mu = dedans.filter(muette).length;

        return el("div.mr-groupe" + (kvOuvert ? "" : ".replie"), {},
          el("button.mrg-tete", { type: "button",
            onclick: function () { basculer(cleKv); rafraichir(); } },
            el("span.mrg-code", {}, g.code),
            el("span.mrg-nom", {}, g.nom),
            el("span.mrg-n", {}, (g.ls.length
              ? g.ls.length + (g.ls.length > 1 ? " formats" : " format")
              : KV.estMaitre(g.kv) ? "les formats naissent des adaptations" : "rien à imprimer")
              + (mu ? "  ·  " + mu + " sans visuel" : "")
              + (bl ? "  ·  " + bl + (bl > 1 ? " bloquées" : " bloquée") : "")),
            el("span.mrg-x", {}, kvOuvert ? "−" : "+")),

          kvOuvert ? el("div.rt-mur", {},
            caseM(p, g.kv, rafraichir, true),
            g.ls.map(function (l) { return caseM(p, l, rafraichir, false); }),
            /* Une adaptation sans un seul format est un marché qui a une image
             * et rien à imprimer. Ça se dessine, ça ne se légende pas. */
            !g.ls.length && !KV.estMaitre(g.kv)
              ? caseSansFormat(p, g.kv, rafraichir) : null) : null);
          }) : null);
      }),

      trous.length ? el("div.mr-groupe.trou", {},
        el("div.mrg-tete", {},
          el("span.mrg-code", {}, "VIDE"),
          el("span.mrg-nom", {}, trous.length > 1
            ? trous.length + " marchés promis, rien de produit"
            : "Un marché promis, rien de produit"),
          el("span.mrg-n", {}, "le volet les a engagés — cette route ne les sert pas")),
        el("div.rt-mur", {}, trous.map(function (m) { return caseTrou(p, pi, m, rafraichir); }))) : null,

      orphelins.length
        ? el("div.mr-groupe.orphelin", {},
            el("div.mrg-tete", {},
              el("span.mrg-code", {}, "—"),
              el("span.mrg-nom", {}, "Sans maître"),
              el("span.mrg-n", {}, orphelins.length + " — une V2 du KV ne les périmera pas")),
            el("div.rt-mur", {}, orphelins.map(function (l) { return caseM(p, l, rafraichir, false); })))
        : null
    );
  }


  /* Les groupes de KV rangés par marque produit. Sans campagne déclarée, tout
   * tient dans un seul bloc sans titre — le comportement d'avant. */
  function groupesParMarque(p, groupes, reste) {
    var mqs = (p.campagne && p.campagne.marques) || [];
    if (!mqs.length) return [{ m: null, groupes: groupes, n: reste.length }];

    var out = [];
    mqs.forEach(function (m) {
      var g = groupes.filter(function (x) { return x.kv.marqueId === m.id; });
      if (!g.length) return;
      var n = (p.livrables || []).filter(function (l) {
        return !l.annule && l.marqueId === m.id; }).length;
      out.push({ m: m, groupes: g, n: n });
    });
    /* Ce qu'aucune marque ne revendique ne disparaît pas : il se voit. */
    var orphelins = groupes.filter(function (x) {
      return !mqs.some(function (m) { return x.kv.marqueId === m.id; }); });
    if (orphelins.length) out.push({ m: null, groupes: orphelins, n: orphelins.length });
    return out;
  }

  function caseM(p, l, rafraichir, maitre) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var perime = REGLES.maitrePerime(p, l);
    var retours = ANNOT.ouvertes(l).length;
    var mk = (l.mockups || []).length;
    var pr = REGLES.pretSur(l);

    return el("button.rt-c" + (maitre ? ".grand" : "") + (perime ? ".perime" : ""), {
      type: "button", title: l.nom,
      onclick: function () { VUE_LIVRABLE.ouvrir(p, l, rafraichir); },
    },
      IMAGE.vignette(l, "planche"),
      maitre ? el("span.rtc-code", {}, m ? m.code : "?") : null,
      retours ? el("span.rtc-r", {}, String(retours)) : null,
      el("span.rtc-bas", {},
        el("span.rtc-n", {}, maitre ? ((l.kv || {}).copy || l.nom) : (s ? s.nom : l.nom)),
        el("span.rtc-m", {}, [
          "V" + (l.version || 1),
          pr.part + " %",
          mk ? mk + " en situation" : null,
          perime ? "maître dépassé" : null,
          !l.responsable ? "sans responsable" : null,
        ].filter(Boolean).join("  ·  "))
      )
    );
  }

  /* Un marché promis que rien ne porte. Même encombrement qu'une pièce : c'est
   * la seule façon qu'un vide se compte. Le geste est direct — ouvrir
   * l'adaptation manquante depuis la case qui la réclame. */
  function caseTrou(p, pi, m, rafraichir) {
    var kvRoute = (p.livrables || []).filter(function (l) {
      return !l.annule && KV.estMaitre(l) && (!pi || l.pisteId === pi.id); })[0] || null;

    return el("button.rt-c.trou", { type: "button",
      title: m.nom + " — aucune pièce sur ce marché",
      onclick: function () {
        if (!kvRoute) {
          AVIS.refus("Aucun KV maître sur cette route : c'est lui qui engendre les "
            + "adaptations. Il se crée depuis la route.");
          return;
        }
        KV.creer(p, m.id, kvRoute, "adaptation");
        DEPOT.enregistrer();
        AVIS.fait("Adaptation " + m.nom + " ouverte sur « "
          + (pi ? pi.titre : "cette route") + " ». Elle hérite du maître ; "
          + "ses formats restent à créer.");
        rafraichir();
      } },
      el("span.rtct-c", {}, m.code),
      el("span.rtct-x", {}, "aucune pièce"),
      el("span.rtc-bas", {},
        el("span.rtc-n", {}, m.nom),
        el("span.rtc-m", {}, "promis au volet  ·  " + ((m.langues || []).map(O.langue).join(", ") || "langue non dite")))
    );
  }

  /* Une adaptation existe, aucun format n'en sort. */
  function caseSansFormat(p, kv, rafraichir) {
    var m = DEPOT.trouve("marches", kv.marche);
    return el("button.rt-c.trou.mou", { type: "button",
      title: "aucun format sur ce marché",
      onclick: function () { VUE_LIVRABLE.ouvrir(p, kv, rafraichir); } },
      el("span.rtct-c", {}, m ? m.code : "?"),
      el("span.rtct-x", {}, "0 format"),
      el("span.rtc-bas", {},
        el("span.rtc-n", {}, "Aucun format"),
        el("span.rtc-m", {}, "l'image existe, rien ne s'imprime"))
    );
  }

  /* ————— Un volet et sa matrice ————— */

  function blocVolet(p, v, rafraichir) {
    var livrables = (p.livrables || []).filter(function (l) { return l.voletId === v.id; });
    var perimes = livrables.filter(function (l) { return REGLES.maitrePerime(p, l); }).length;

    return el("div.volet", {},
      el("div.volet-tete", {},
        el("span", {}, v.nom),
        el("span.taille", {}, livrables.length + " livrables"
          + (perimes ? " · " + perimes + " à regénérer" : "")),
        /* Le bouton prend la forme du système : une taille écrite à la main
         * ici sortait de l'échelle et employait deux jetons d'avant le DS. */
        el("button.b.nu", { type: "button",
          onclick: function () { editerVolet(p, v, rafraichir); } }, "modifier")
      ),
      matrice(p, v, rafraichir)
    );
  }

  function matrice(p, v, rafraichir) {
    /* Les axes sont l'union du croisement déclaré et de ce que les livrables
     * existants utilisent : aucun livrable ne disparaît de la grille. */
    var idsS = (v.supports || []).slice();
    var idsM = (v.marches || []).slice();
    (p.livrables || []).forEach(function (l) {
      if (l.voletId !== v.id) return;
      if (l.support && idsS.indexOf(l.support) === -1) idsS.push(l.support);
      if (l.marche && idsM.indexOf(l.marche) === -1) idsM.push(l.marche);
    });
    var supports = idsS.map(function (id) { return DEPOT.trouve("supports", id); }).filter(Boolean);
    var marches = idsM.map(function (id) { return DEPOT.trouve("marches", id); }).filter(Boolean);
    if (!supports.length || !marches.length) {
      return el("p.rien", { style: { padding: ".6rem .8rem" } }, "Ce volet n'a ni support ni marché : rien à croiser.");
    }

    var table = el("table.matrice");
    var thead = el("thead", {}, el("tr", {},
      el("th", {}, ""),
      marches.map(function (m) { return el("th", { title: m.nom + " · " + m.langues.join(", ") }, m.code); })
    ));
    table.appendChild(thead);

    var tbody = el("tbody");
    supports.forEach(function (s) {
      var tr = el("tr", {}, el("td.entete-ligne", {}, s.nom));
      marches.forEach(function (m) {
        var ls = trouver(p, v.id, s.id, m.id);
        tr.appendChild(el("td", {}, case_(p, v, s, m, ls, rafraichir)));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return el("div", { style: { overflow: "auto" } }, table);
  }

  /* Une case peut contenir plusieurs pièces : le maître et ses déclinaisons de
   * même support et même marché. Aucune ne doit disparaître de la grille. */
  function trouver(p, voletId, supportId, marcheId) {
    return (p.livrables || []).filter(function (l) {
      return l.voletId === voletId && l.support === supportId && l.marche === marcheId;
    });
  }

  function case_(p, v, s, m, ls, rafraichir) {
    if (!ls.length) {
      return el("button.case-m.absente", {
        type: "button",
        title: "Créer " + s.nom + " · " + m.nom,
        onclick: function () { creer(p, v, s, m, rafraichir); },
      }, el("span.rond"), el("span.part", {}, "+"));
    }

    /* L'état de la case est celui de sa pièce la plus en retard. */
    var pire = null, perime = false, bloque = false, somme = 0;
    ls.forEach(function (l) {
      var pr = REGLES.pretSur(l);
      somme += pr.part;
      if (pire === null || pr.part < pire) pire = pr.part;
      if (REGLES.maitrePerime(p, l)) perime = true;
      if (!l.responsable || REGLES.droitsInsuffisants(l)) bloque = true;
    });
    var moyenne = Math.round(somme / ls.length);
    var classe = perime ? "perime" : bloque ? "bloque" : pire === 100 ? "pret" : "encours";

    return el("button.case-m." + classe, {
      type: "button",
      title: ls.map(function (l) { return l.nom; }).join(" · ") + (perime ? " — maître dépassé" : ""),
      onclick: function () {
        if (ls.length === 1) VUE_LIVRABLE.ouvrir(p, ls[0], rafraichir);
        else liste(p, s, m, ls, rafraichir);
      },
    },
      el("span.rond"),
      el("span.part", {}, ls.length > 1 ? ls.length + " pièces" : moyenne + "%")
    );
  }

  /* Plusieurs pièces dans une case. */
  function liste(p, s, m, ls, rafraichir) {
    PANNEAU.ouvrir(s.nom + " · " + m.code, ls.length + " pièces", el("div", {},
      ls.map(function (l) {
        var pr = REGLES.pretSur(l);
        return el("div.attente-l", {
          style: { cursor: "pointer" },
          onclick: function () { PANNEAU.fermer(); VUE_LIVRABLE.ouvrir(p, l, rafraichir); },
        },
          el("div.tete", {},
            el("b", {}, l.nom),
            l.maitre ? el("span.critere", {}, "adaptation") : el("span.critere", {}, "maître"),
            el("span.age", {}, pr.pret + "/" + pr.total + " axes")
          )
        );
      }),
      el("div.form-actions", {},
        el("button.b", {
          type: "button",
          onclick: function () { PANNEAU.fermer(); creer(p, { id: ls[0].voletId }, s, m, rafraichir); },
        }, "Ajouter une pièce ici")
      )
    ));
  }

  /* ————— Créer une case ————— */

  function creer(p, v, s, m, rafraichir) {
    var axes = {};
    MAISON.axes.forEach(function (a) { axes[a.cle] = "attente"; });
    if (m.langues.length === 1 && m.langues[0] === "fr") axes.langue = "pret";
    if (!v.marches || v.marches.length < 2) axes.local = "sansobjet";

    var l = {
      id: O.id("L"), voletId: v.id, support: s.id, marche: m.id,
      nom: s.nom + " · " + m.code,
      responsable: null, echeance: null, remise: null, publication: null,
      origine: "prevu", pisteId: pisteRetenue(p), maitre: null, version: 1, versions: [],
      estime: null, reel: null, toursVendus: null, assets: [], entrees: [],
      axes: axes,
    };
    if (!p.livrables) p.livrables = [];
    p.livrables.push(l);
    DEPOT.tracer("création", "livrables", p.id, l.nom);
    DEPOT.enregistrer();
    rafraichir();
    VUE_LIVRABLE.ouvrir(p, l, rafraichir);
  }

  function pisteRetenue(p) {
    var r = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    return r ? r.id : null;
  }

  /* ————— Le détail d'un livrable ————— */

  function detail(p, l, rafraichir) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var resp = DEPOT.trouve("personnes", l.responsable);
    var pr = REGLES.pretSur(l);
    var coince = REGLES.coince(l);
    var perime = REGLES.maitrePerime(p, l);
    var droits = REGLES.droitsInsuffisants(l);

    var ann = ANNOT.ouvertes(l).length;

    var corps = el("div", {},
      perime ? el("div.avertissement", {}, "Le maître est passé en version " + versionMaitre(p, l) + ". Cette adaptation est à regénérer.") : null,
      droits ? el("div.avertissement", {}, droits) : null,

      /* La pièce elle-même, avant tout le reste : on ne juge pas un livrable
       * sur sa fiche. Un film s'y lit avec son lecteur — il s'affichait par
       * son arrêt sur image, et rien ne permettait de le regarder. */
      el("div.dt-media", {}, IMAGE.media(l, "grande")),

      /* Ce qui a été livré, tel qu'il est sur le disque. */
      (l.production || l.review)
        ? el("div.dt-fichiers", {},
            l.production ? el("a.dtf", { href: l.production, target: "_blank",
              rel: "noopener" }, "le fichier de production →") : null,
            l.review && l.review !== l.production
              ? el("a.dtf", { href: l.review, target: "_blank", rel: "noopener" },
                  "le fichier de revue →") : null)
        : null,

      PANNEAU.ligne("Support", s ? s.nom : l.support),
      PANNEAU.ligne("Marché", m ? m.nom + " · " + m.langues.join(", ") : "aucun"),
      PANNEAU.ligne("Responsable", resp ? resp.nom : null, !resp),
      PANNEAU.ligne("Origine", l.origine === "prevu" ? "Prévu par la proposition retenue" : "Ajouté après validation — une reprise s'ouvre"),
      PANNEAU.ligne("Remise du fichier", l.remise ? O.joli(l.remise) : null, !l.remise),
      PANNEAU.ligne("Publication", l.publication ? O.joli(l.publication) : null, !l.publication),
      PANNEAU.ligne("Estimé / réel", (l.estime || "—") + " j / " + (l.reel || "—") + " j"),

      gabaritSupport(s, m),

      PANNEAU.sousbloc("Complétude — dix axes", axesLivrable(l, rafraichir)),
      coince.length
        ? UI.banniere("", "En attente sur : " + coince.map(function (c) { return c.axe + " (" + O.poste(c.poste).court + ")"; }).join(" · "))
        : UI.banniere("vert", "Tous les axes sont prêts."),

      versions(p, l, rafraichir),
      entrees(l),

      el("div.form-actions", {},
        /* Regarder et dire : c'est le geste du poste. Il manquait ici. */
        el("button.b" + (ann ? ".or" : ""), { type: "button",
          onclick: function () { ANNOT.ouvrir(p, l, rafraichir); } },
          ann ? "Annoter  ·  " + ann + (ann > 1 ? " retours ouverts" : " retour ouvert")
              : "Annoter"),
        window.DEMANDE_VERSION ? DEMANDE_VERSION.bouton(p, l, rafraichir) : null,
        /* Le geste le plus fréquent depuis une case : sortir de quoi fabriquer. */
        BRIEF_PRODUCTION.bouton(p, l),
        el("button.b.or", { type: "button", onclick: function () { editer(p, l, rafraichir); } }, "Modifier"),
        el("button.b", {
          type: "button",
          onclick: function () {
            var n = (l.versions || []).length + 1;
            if (!l.versions) l.versions = [];
            l.versions.push({ n: n, soumis_le: new Date().toISOString(), verdict: null });
            l.version = n;
            DEPOT.tracer("soumission", "livrables", p.id, l.nom + " V" + n);
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          },
        }, "Soumettre une version"),
        el("button.b", {
          type: "button",
          onclick: function () { PANNEAU.fermer(); RENVOI.ouvrir({ quoi: l.nom, projet: p.ref, projetId: p.id, objet: l.id }); },
        }, "Renvoyer")
      )
    );

    PANNEAU.ouvrir(l.nom, pr.pret + "/" + pr.total + " axes", corps, O.poste("da").couleur);
  }

  function versionMaitre(p, l) {
    var mm = (p.livrables || []).filter(function (x) { return x.id === l.maitre; })[0];
    return mm ? mm.version : "?";
  }

  function gabaritSupport(s, m) {
    if (!s) return null;
    var g = (s.gabarits || {})[m ? m.id : ""] || null;
    if (g && g.dimensions) {
      return PANNEAU.sousbloc("Gabarit — " + (m ? m.code : ""), el("div", {},
        PANNEAU.ligne("Dimensions", g.dimensions),
        g.fondPerdu ? PANNEAU.ligne("Fond perdu", g.fondPerdu) : null,
        g.resolution ? PANNEAU.ligne("Résolution", g.resolution) : null,
        g.fournisseur ? PANNEAU.ligne("Fournisseur", g.fournisseur) : null
      ));
    }
    return el("div.prix", {}, "Aucun gabarit pour " + s.nom + (m ? " · " + m.nom : "") + ". Il se renseigne une fois, dans le référentiel, et sert ensuite pour toujours.");
  }

  function axesLivrable(l, rafraichir) {
    var boite = el("div.axes");
    function dessiner() {
      O.vider(boite);
      MAISON.axes.forEach(function (a) {
        var etat = (l.axes && l.axes[a.cle]) || "attente";
        boite.appendChild(el("button.axe." + etat, {
          type: "button",
          title: a.nom + " — " + O.poste(a.poste).nom,
          onclick: function () {
            var suite = { attente: "pret", pret: "sansobjet", sansobjet: "attente" };
            l.axes[a.cle] = suite[etat];
            DEPOT.enregistrer(); dessiner();
          },
        }, a.nom));
      });
    }
    dessiner();
    return boite;
  }

  function versions(p, l, rafraichir) {
    var vs = l.versions || [];
    if (!vs.length) return null;
    var tours = vs.filter(function (v) { return v.verdict && v.verdict !== "approuve"; }).length;
    return PANNEAU.sousbloc("Versions", el("div", {},
      vs.map(function (v) {
        var vd = null;
        MAISON.verdicts.forEach(function (x) { if (x.cle === v.verdict) vd = x; });
        return el("div.ligne", {},
          el("span.etiq", {}, "V" + v.n + " · " + O.joli(v.soumis_le)),
          el("span.val", {}, vd ? vd.signe + " " + vd.nom + (v.motif ? " — " + v.motif : "") : "en attente de verdict")
        );
      }),
      l.toursVendus
        ? UI.banniere(tours > l.toursVendus ? "rouge" : "",
            tours + " tours consommés / " + l.toursVendus + " vendus"
            + (tours > l.toursVendus ? " — au-delà du périmètre vendu." : ""))
        : null
    ));
  }

  function entrees(l) {
    var es = l.entrees || [];
    if (!es.length) return null;
    return PANNEAU.sousbloc("Éléments d'entrée", el("div", {}, es.map(function (e) {
      return el("div.ligne", {},
        el("span.etiq", {}, e.quoi),
        el("span.val" + (e.fournisseur ? "" : ".vide"), {},
          e.fournisseur ? (DEPOT.trouve("personnes", e.fournisseur) || {}).nom || e.fournisseur : "aucun fournisseur nommé")
      );
    })));
  }

  function editer(p, l, rafraichir) {
    var f = FORM.rendre(CHAMPS.livrable.filter(function (c) { return c.cle !== "support" && c.cle !== "marche"; }), l);
    PANNEAU.ouvrir("Modifier — " + l.nom, "", el("div", {},
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            var d = f.valeurs();
            Object.keys(d).forEach(function (k) { l[k] = d[k]; });
            DEPOT.tracer("modification", "livrables", p.id, l.nom);
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  /* ————— Le volet ————— */

  function editerVolet(p, v, rafraichir) {
    var nom = el("input", { type: "text", placeholder: "Film, OOH, Social, Activation…" });
    nom.value = v ? v.nom : "";
    var choixS = coches(DEPOT.liste("supports"), v ? v.supports : []);
    var choixM = coches(DEPOT.liste("marches"), v ? v.marches : []);

    PANNEAU.ouvrir(v ? "Modifier le volet" : "Nouveau volet", "supports × marchés", el("div", {},
      el("div.prix", {}, "Croiser les supports et les marchés engendre les livrables. Chaque case hérite du référentiel."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom du volet"), nom),
        el("div.champ", {}, el("label", {}, "Supports"), choixS.noeud),
        el("div.champ", {}, el("label", {}, "Marchés"), choixM.noeud)
      ),
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            if (!nom.value.trim()) { AVIS.refus("Un volet a un nom."); return; }
            if (!p.volets) p.volets = [];
            if (v) { v.nom = nom.value.trim(); v.supports = choixS.valeurs(); v.marches = choixM.valeurs(); }
            else p.volets.push({ id: O.id("V"), nom: nom.value.trim(), supports: choixS.valeurs(), marches: choixM.valeurs() });
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  function coches(liste, selection) {
    var sel = (selection || []).slice();
    var boite = el("div", { style: { display: "grid", gap: ".2rem" } });
    liste.forEach(function (x) {
      var b = el("button.axe" + (sel.indexOf(x.id) !== -1 ? ".pret" : ""), {
        type: "button",
        style: { "text-align": "left", padding: ".28rem .45rem", "font-size": "var(--t-eti)" },
        onclick: function () {
          var i = sel.indexOf(x.id);
          if (i === -1) sel.push(x.id); else sel.splice(i, 1);
          b.className = "axe" + (sel.indexOf(x.id) !== -1 ? " pret" : "");
        },
      }, x.nom + (x.code ? " · " + x.code : ""));
      boite.appendChild(b);
    });
    return { noeud: boite, valeurs: function () { return sel; } };
  }

  /* ————— La frise par semaine ————— */

  function frise(p) {
    var ls = (p.livrables || []).filter(function (l) { return l.echeance || l.publication; });
    if (!ls.length) { PANNEAU.ouvrir("Frise", "", el("p.rien", {}, "Aucune date saisie.")); return; }
    var sems = {};
    ls.forEach(function (l) {
      var d = l.publication || l.echeance;
      var s = O.semaine(d);
      if (!sems[s]) sems[s] = [];
      sems[s].push(l);
    });
    var cles = Object.keys(sems).sort(function (a, b) { return a - b; });
    PANNEAU.ouvrir("Frise par semaine", ls.length + " livrables datés", el("div", {},
      cles.map(function (s) {
        return el("div.sousbloc", {},
          el("h3", {}, "Semaine " + s + " · " + sems[s].length + (sems[s].length > 3 ? " — mur de production" : "")),
          el("ul.puces", {}, sems[s].map(function (l) {
            var m = DEPOT.trouve("marches", l.marche);
            return el("li", {}, l.nom + (m ? " · " + m.code : "") + " — " + O.joli(l.publication || l.echeance));
          }))
        );
      })
    ));
  }

  return { rendre: rendre, detail: detail, editer: editer };
})();
