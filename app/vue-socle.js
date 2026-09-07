/* vue-socle.js — la plateforme de marque.
 *
 * Un socle ne se consulte pas : il se tient. Chaque carte vide est une dette
 * qui se paiera en aval, sur une campagne, en revue. La question de cet écran
 * est donc : qu'est-ce que ce socle ne couvre pas, et ce que ça coûte.
 */

window.VUE_SOCLE = (function () {
  var el = O.el;

  var CARTES = [
    { n: 1, t: "Idée directrice", cle: "idee_directrice", forme: "phrase",
      cout: "toute campagne pourra être refusée en revue sans recours" },
    { n: 2, t: "Positionnement", cle: "positionnement", forme: "texte",
      cout: "rien ne dit contre quoi la marque se situe" },
    { n: 3, t: "Promesse", cle: "promesse", forme: "phrase",
      cout: "les briefs promettront chacun autre chose" },
    { n: 4, t: "Bénéfices, dans l'ordre", cle: "benefices", forme: "ordre",
      cout: "l'ordre se réarrangera à chaque campagne" },
    { n: 5, t: "Preuves", cle: "preuves", forme: "puces",
      cout: "la promesse reposera sur rien" },
    { n: 6, t: "Ton & personnalité", cle: "ton", forme: "texte",
      cout: "aucun ton opposable en relecture" },
    { n: 7, t: "Ce qu'on ne dit jamais", cle: "jamais", forme: "chips",
      cout: "le contrôle de vocabulaire n'a rien à vérifier" },
    { n: 8, t: "Symboles", cle: "symboles", forme: "puces",
      cout: "chaque campagne réinventera son imagerie" },
    { n: 9, t: "Ce que la plateforme de marque ne fera pas", cle: "ne_fera_pas", forme: "puces",
      cout: "aucune frontière écrite d'avance" },
  ];

  function rendre(p, rafraichir) {
    /* Le socle appartient à la marque, pas à la campagne. Un dossier lit le
     * vault de ses marques — et quand il en porte plusieurs, il les lit
     * toutes : trois marques sous une ombrelle n'ont pas le même socle. */
    var mqs = MARQUE.toutes(p);
    if (mqs.length) return socleDesMarques(p, mqs, rafraichir);
    var s = p.sections.socle || {};
    var vides = CARTES.filter(function (c) { return estVide(s[c.cle]); });
    var portee = campagnesRattachees(p);

    return el("div.so", {},
      bandeDette(p, s, vides, portee, rafraichir),
      MARQUE.bloc(p, rafraichir),
      socleHierarchise(p, s, rafraichir),
      moodboard(p, s, rafraichir)
    );
  }


  /* ————————————————————— Ce qui sert à refuser passe devant ————————————————————— */

  /* Onze cartes de poids égal font de la page la plus longue du produit une
   * liste plate. Or ces cartes ne servent pas à la même chose : deux d'entre
   * elles servent à REFUSER — l'idée directrice, à laquelle toute campagne doit
   * se rattacher, et ce qu'on ne dit jamais, que le contrôle de vocabulaire
   * applique. Un DA doit les avoir sous les yeux avant de dessiner ; le reste
   * se consulte. */
  var FONDATION = ["idee_directrice", "jamais"];

  function socleHierarchise(p, s, rafraichir) {
    var haut = CARTES.filter(function (c) { return FONDATION.indexOf(c.cle) !== -1; });
    var reste = CARTES.filter(function (c) { return FONDATION.indexOf(c.cle) === -1; });

    return el("div.sh", {},
      el("div.sh-haut", {}, haut.map(function (c) {
        var v = s[c.cle];
        return el("div.sh-f" + (estVide(v) ? ".vide" : ""), {},
          el("button.shf-h", { type: "button", title: "modifier — " + c.t,
            onclick: function () { VUE_PROJETS.editerChamp(p, "socle", c.cle, rafraichir); } },
          el("div.shf-t", {}, c.t,
            el("span.shf-r", {}, c.cle === "idee_directrice"
              ? "toute campagne s'y rattache, ou justifie son écart"
              : "le contrôle de vocabulaire s'y adosse")),
          estVide(v)
            ? el("div.shf-x", {}, "Non écrit — " + c.cout + ".",
                el("span.shf-a", {}, "l'écrire →"))
            : el("div.shf-v", {}, contenu(c, v))));
      })),

      el("div.sh-t", {}, "LE RESTE DU SOCLE",
        el("span", {}, reste.filter(function (c) { return !estVide(s[c.cle]); }).length
          + " sur " + reste.length + " écrits  ·  consultable, pas opposable seul")),
      el("div.sh-reste", {}, reste.map(function (c) {
        var v = s[c.cle];
        return el("button.sh-c", { type: "button", title: "modifier — " + c.t,
          onclick: function () { VUE_PROJETS.editerChamp(p, "socle", c.cle, rafraichir); } },
          estVide(v)
            ? carteVide(p, c, rafraichir)
            : UI.carteNumerotee(c.n, c.t, contenu(c, v), false));
      }))
    );
  }


  /* ————————————————————— Le socle vient du vault ————————————————————— */

  /* Ce qui définit une marque vit au vault et vaut plusieurs années. Ici on le
   * LIT : la campagne s'y adosse, elle ne le réécrit pas. Ce qui manque au
   * vault manque à toutes les campagnes de la marque — c'est pour ça que le
   * geste renvoie là-bas plutôt que d'ouvrir un formulaire de plus. */
  function socleDesMarques(p, mqs, rafraichir) {
    return el("div.sv", {},
      el("div.sv-h", {},
        el("h3.sv-t", {}, phraseSocle(mqs)),
        el("p.sv-s", {}, "La plateforme appartient à la marque et vaut plusieurs années. "
          + "La campagne s'y adosse ; ce qui n'est vrai que cette saison reste dans "
          + "le dossier."),
        el("a.b.or", { href: "#/referentiel/marques" }, "Ouvrir la bibliothèque de marque")),

      el("div.sv-l", {}, mqs.map(function (m) { return blocMarqueSocle(p, m); })),

      /* Le moodboard reste au dossier : il montre où va CETTE campagne. */
      moodboard(p, p.sections.socle || {}, rafraichir)
    );
  }

  function phraseSocle(mqs) {
    var sans = mqs.filter(function (m) { return VAULT.etatNiveau("marque", m.id).propres === 0; });
    if (sans.length) {
      return sans.map(function (m) { return m.nom; }).join(", ")
        + (sans.length > 1 ? " n'ont pas de plateforme de marque" : " n'a pas de plateforme de marque");
    }
    return mqs.length + (mqs.length > 1 ? " marques, " : " marque, ")
      + "leur plateforme de marque vient de la bibliothèque";
  }

  var TETE = ["idee_directrice", "jamais"];

  function blocMarqueSocle(p, m) {
    var e = VAULT.etatNiveau("marque", m.id);
    var logo = m.logo ? DEPOT.trouve("assets", m.logo) : null;
    var gammes = ((m.gammes && Object.keys(m.gammes)) || []);
    var reste = VAULT.CHAMPS.filter(function (c) { return TETE.indexOf(c.cle) === -1; });

    return el("div.svm", {},
      el("div.svm-h", {},
        logo && logo.vignette
          ? el("span.svm-l", {}, el("img", { src: logo.vignette, alt: m.nom }))
          : el("span.svm-l.vide", {}, "logo ?"),
        el("div.svm-i", {},
          el("span.svm-n", {}, m.nom),
          el("span.svm-q", {}, e.propres + (e.propres > 1 ? " champs propres" : " champ propre")
            + (e.herites ? "  ·  " + e.herites + (e.herites > 1 ? " hérités" : " hérité") : "")
            + (e.vides.length ? "  ·  " + e.vides.length
                + (e.vides.length > 1 ? " manquants" : " manquant") : ""))),
        el("a.svm-v", { href: "#/referentiel/marques" }, "à la bibliothèque de marque →")),

      /* Les deux qui servent à refuser passent devant et en grand. */
      el("div.svm-f", {}, TETE.map(function (cle) {
        var c = VAULT.CHAMPS.filter(function (x) { return x.cle === cle; })[0];
        return champSocle(m, c, true);
      })),

      /* Le logo et la gamme sous les yeux : un DA ne doit pas aller les chercher. */
      blocPacks(p, m),
      blocElements(m),

      /* Les sept autres, en retrait mais lisibles. Les supprimer était une
       * amputation : la section annonce neuf champs, elle doit en montrer neuf. */
      el("div.svm-r", {},
        el("span.svmg-t", {}, "LE RESTE DU SOCLE",
          el("span", {}, reste.filter(function (c) {
            var h = VAULT.herite("marque", m.id, c.cle);
            return h.valeur !== null && h.valeur !== undefined
              && (Array.isArray(h.valeur) ? h.valeur.length : String(h.valeur).trim());
          }).length + " sur " + reste.length + " écrits")),
        el("div.svm-rc", {}, reste.map(function (c) { return champSocle(m, c, false); }))),

      /* Les gammes : une marque × type de produit peut avoir son propre socle. */
      gammes.length
        ? el("div.svm-g", {},
            el("span.svmg-t", {}, "GAMMES AVEC LEUR PROPRE SOCLE"),
            el("div.svm-gc", {}, gammes.map(function (g) {
              var eg = VAULT.etatNiveau("gamme", m.id + "|" + g);
              return el("span.svg" + (eg.propres ? ".ici" : ""), {},
                g, el("i", {}, eg.propres ? eg.propres + " propres" : "hérite tout"));
            })))
        : null
    );
  }

  /* Un champ du socle, lu au vault. Il dit s'il est propre ou hérité — et il
   * s'édite là où il appartient, pas ici. */
  function champSocle(m, c, grand) {
    var h = VAULT.herite("marque", m.id, c.cle);
    var vide = h.valeur === null || h.valeur === undefined
      || (Array.isArray(h.valeur) ? !h.valeur.length : !String(h.valeur).trim());

    return el("a.svf" + (grand ? ".grand" : "") + (vide ? ".vide" : "")
        + (!h.propre && !vide ? ".herite" : ""),
      { href: "#/referentiel/marques", title: "modifier à la bibliothèque de marque — " + c.nom },
      el("span.svf-n", {}, c.nom,
        !h.propre && !vide && h.source ? el("span.svf-h", {}, "de " + h.source.nom) : null),
      el("span.svf-v", {}, vide
        ? (grand
            ? (c.cle === "idee_directrice"
                ? "Non écrite — toute campagne de cette marque pourra être refusée sans recours."
                : "Non écrits — le contrôle de vocabulaire n'a rien à vérifier.")
            : (c.aide || "non écrit"))
        : Array.isArray(h.valeur) ? h.valeur.join("  ·  ") : String(h.valeur)));
  }

  /* Les éléments de marque : logo, vues de gamme, illustrations. Strictement
   * ceux de cette marque. */
  function blocElements(m) {
    var as = MARQUE.assets(m.id);
    if (!as.length) return null;
    var parRole = {};
    as.forEach(function (a) {
      var r = MARQUE.role(a);
      (parRole[r] = parRole[r] || []).push(a);
    });
    return el("div.svm-e", {},
      el("span.svmg-t", {}, "LES ÉLÉMENTS DE MARQUE",
        el("span", {}, as.length + (as.length > 1 ? " éléments" : " élément"))),
      el("div.svm-ec", {}, Object.keys(parRole).map(function (r) {
        return el("div.sve", {},
          el("span.sve-r", {}, (MARQUE.ROLES[r] || { nom: r }).nom),
          el("div.sve-l", {}, parRole[r].slice(0, 6).map(function (a) {
            return el("span.sve-v", { title: a.nom },
              a.vignette ? el("img", { src: a.vignette, alt: a.nom })
                : el("span.sve-x", {}, "—"));
          })));
      })));
  }

  /* Les packs de la marque, montrés ici et pas seulement au vault. Ceux que la
   * campagne retient passent devant : c'est ce qu'on dessine. */
  function blocPacks(p, m) {
    /* La campagne ne convoque pas toute la gamme : ses KV masters portent des
     * catégories — ici EVAP et IMP — et ses volets des marchés. Montrer les
     * cinquante et un packs du vault, c'était poser des yaourts sous les yeux
     * d'un DA qui dessine du lait en poudre. Le cadrage existait déjà au
     * compilateur ; cette vue ne s'en servait pas. */
    var tout = VAULT.catalogue(m.id);
    var cat = window.COMPILATEUR ? COMPILATEUR.gammeDeLaCampagne(p, null, m.id) : tout;
    if (!cat.length) {
      return el("div.svm-p", {},
        el("span.svmg-t", {}, "LA GAMME"),
        el("p.svp-x", {}, "Aucun pack au catalogue de " + m.nom + ". Un DA qui dessine "
          + "sans les packs sous les yeux invente les proportions et les couleurs."));
    }

    var retenus = {};
    (p.livrables || []).forEach(function (l) {
      if (l.annule || l.marqueId !== m.id) return;
      ((l.kv || {}).sku || []).forEach(function (id) { retenus[id] = true; });
    });
    var n = Object.keys(retenus).length;
    var ordre = cat.slice().sort(function (a, b) {
      return (retenus[b.id] ? 1 : 0) - (retenus[a.id] ? 1 : 0); });

    /* Ce que la campagne sert, dit en clair : c'est ce qui justifie qu'on ne
     * montre pas le reste. */
    var cats = {};
    (p.livrables || []).forEach(function (l) {
      if (!l.annule && l.marqueId === m.id && l.categorie) cats[l.categorie] = true; });
    var noms = Object.keys(cats);
    var hors = tout.length - cat.length;

    /* Un pack dont la fiche ne dit pas la catégorie passe le filtre faute de
     * pouvoir être écarté. Le compter avec les autres donnerait un périmètre
     * plus large qu'il n'est : on le dit à part, parce que c'est une fiche à
     * finir, pas un pack de plus. */
    var muets = cat.filter(function (s) { return !s.categorie; }).length;
    var qualifies = cat.length - muets;

    return el("div.svm-p", {},
      el("span.svmg-t", {}, "LA GAMME",
        el("span", {}, (noms.length ? noms.join(" · ") + "  ·  " : "")
          + (n ? n + " retenus sur " + qualifies
               : qualifies + (qualifies > 1 ? " packs dans le périmètre" : " pack dans le périmètre")))),
      el("div.svp-l", {}, ordre.slice(0, 12).map(function (s) {
        return el("span.svp" + (retenus[s.id] ? ".ici" : ""), { title: s.nom },
          s.vignette ? el("img", { src: s.vignette, alt: s.nom }) : el("span.svp-v", {}, "—"),
          el("span.svp-n", {}, [s.format, s.variante].filter(Boolean).join(" · ") || s.nom));
      })),
      cat.length > 12 ? el("p.svp-x", {}, "et " + (cat.length - 12) + " autres dans le périmètre.") : null,
      muets
        ? el("p.svp-x", {}, "et " + muets + (muets > 1 ? " packs dont la fiche ne dit pas"
            : " pack dont la fiche ne dit pas") + " la catégorie — ils restent affichés "
            + "faute de pouvoir être écartés, et c'est la fiche qu'il faut finir.")
        : null,
      hors > 0
        ? el("p.svp-x", {}, hors + (hors > 1 ? " autres packs" : " autre pack")
            + " à la bibliothèque de marque de " + m.nom + (noms.length
              ? " — hors " + noms.join(" et ") + ", cette campagne ne les convoque pas."
              : " que cette campagne ne convoque pas."))
        : null,
      !n && !noms.length
        ? el("p.svp-x", {}, "Aucun livrable ne déclare les packs qu'elle montre. "
            + "Tant que c'est le cas, on ne peut pas vérifier qu'un produit "
            + "n'apparaît pas sur un marché qui ne le vend pas.")
        : null);
  }

  /* ————————————————————— Le moodboard ————————————————————— */

  /* Un socle n'est pas fait que de phrases. Les campagnes passées, les
   * références, ce qu'on ne veut plus refaire : ça se montre, ça ne se décrit
   * pas. Chaque image dit ce qu'elle fait là. */
  var ROLES = {
    passe: { nom: "Campagne passée", ton: "terne",
      aide: "Ce que la marque a déjà diffusé. Sert à ne pas se répéter, et à mesurer l'écart." },
    reference: { nom: "Référence", ton: "",
      aide: "Ce vers quoi on regarde. Hors catégorie de préférence." },
    interdit: { nom: "Ce qu'on ne refait pas", ton: "alerte",
      aide: "Une direction écartée, avec sa raison. C'est ce qui évite de la reproposer." },
  };

  function planches(s) { return (s.moodboard || []).slice(); }

  function moodboard(p, s, rafraichir) {
    var ms = planches(s);
    var parRole = { passe: [], reference: [], interdit: [] };
    ms.forEach(function (m) { (parRole[m.role] || parRole.reference).push(m); });

    return el("div.mb", {},
      el("div.mb-tete", {},
        el("span.t", {}, "MOODBOARD ET ANTÉRIEURS"),
        el("span.n", {}, ms.length ? ms.length + " images" : "aucune image"),
        el("button.b.nu", { type: "button", onclick: function () { ajouter(p, s, rafraichir); } }, "+ image")),

      !ms.length
        ? el("p.rien", {}, "La plateforme de marque ne porte que du texte. Une plateforme sans images oblige chaque DA à réinventer l'univers, et à se tromper.")
        : Object.keys(ROLES).map(function (r) {
            if (!parRole[r].length) return null;
            return el("div.mb-groupe", {},
              el("div.mbg-t", {}, ROLES[r].nom.toUpperCase(),
                el("span", {}, String(parRole[r].length))),
              el("div.rt-mur", {}, parRole[r].map(function (m) {
                return el("button.rt-c" + (r === "interdit" ? ".ecart" : ""), { type: "button",
                  title: m.legende || "", onclick: function () { detailImage(p, s, m, rafraichir); } },
                  IMAGE.vignette(m, "planche"),
                  el("span.rtc-bas", {},
                    el("span.rtc-n", {}, m.legende || "sans légende"),
                    el("span.rtc-m", {}, m.source || "source non dite")));
              })));
          })
    );
  }

  function ajouter(p, s, rafraichir) {
    var selR = el("select", {});
    Object.keys(ROLES).forEach(function (k) { selR.appendChild(el("option", { value: k }, ROLES[k].nom)); });
    var aide = el("div.indice", {}, ROLES.passe.aide);
    selR.addEventListener("change", function () { aide.textContent = ROLES[selR.value].aide; });
    var leg = el("input", { type: "text", placeholder: "Ce que cette image dit" });
    var src = el("input", { type: "text", placeholder: "D'où elle vient — campagne, année, auteur" });
    var apercu = el("div", { style: { "max-width": "180px", "margin-top": ".4rem" } });
    var donnee = null;

    PANNEAU.ouvrir("Ajouter au moodboard", p.ref, el("div", {},
      UI.banniere("", "Une image sans rôle ni légende devient une décoration. Chacune dit pourquoi elle est là : passé, référence, ou direction écartée."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Rôle"), selR, aide),
        el("div.champ", {}, el("label", {}, "Légende"), leg),
        el("div.champ", {}, el("label", {}, "Source"), src),
        el("div.champ", {}, el("label", {}, "L'image"),
          el("button.b", { type: "button", onclick: function () {
            IMAGE.choisir(function (d, ko) {
              if (!d) { AVIS.refus("Image illisible."); return; }
              if (ko > 900) { AVIS.refus("Image trop lourde (" + ko + " Ko)."); return; }
              donnee = d;
              O.vider(apercu).appendChild(IMAGE.vignette({ vignette: d }, "carte"));
            });
          } }, "Choisir une image"), apercu)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!donnee) { AVIS.refus("Aucune image posée."); return; }
          /* L'image part sur le disque ; le dépôt n'en garde que le chemin. */
          IMAGE.ranger(donnee, function (chemin, refus) {
            if (!chemin) { AVIS.refus(refus); return; }
            if (!s.moodboard) s.moodboard = [];
            s.moodboard.push({ id: O.id("MB"), role: selR.value, vignette: chemin,
              legende: leg.value.trim(), source: src.value.trim(), quand: new Date().toISOString() });
            p.sections.socle = s;
            DEPOT.tracer("moodboard", "socle", p.id, leg.value.trim() || ROLES[selR.value].nom);
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          });
        } }, "Ajouter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function detailImage(p, s, m, rafraichir) {
    PANNEAU.ouvrir(m.legende || "Image du moodboard", ROLES[m.role].nom, el("div", {},
      IMAGE.vignette(m, "grande"),
      PANNEAU.ligne("Rôle", ROLES[m.role].nom),
      PANNEAU.ligne("Source", m.source || null, !m.source),
      PANNEAU.ligne("Ajoutée le", O.joli(m.quand)),
      el("div.form-actions", {},
        el("button.b.nu", { type: "button", onclick: function () {
          if (!window.confirm("Retirer cette image du moodboard ?")) return;
          s.moodboard = planches(s).filter(function (x) { return x.id !== m.id; });
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Retirer"))
    ));
  }

  function estVide(v) { return Array.isArray(v) ? !v.length : !v; }

  /* ————————————————————— La question : que coûte ce qui manque ? ————————————————————— */

  function bandeDette(p, s, vides, portee, rafraichir) {
    var controles = CARTES.map(function (c) {
      return { quoi: c.t, ok: !estVide(s[c.cle]), cout: c.cout, poids: 10 - c.n };
    });

    var prix = vides.length
      ? vides[0].t.toLowerCase() + " manque — " + vides[0].cout
        + (portee > 1 ? ", sur " + portee + " campagnes" : "")
      : null;

    return UI.recevabilite(
      vides.length ? "Cette plateforme de marque laisse " + vides.length + (vides.length > 1 ? " dettes" : " dette") : "Cette plateforme de marque tient",
      controles, prix,
      vides.length
        ? [
            { nom: "Combler « " + vides[0].t.toLowerCase() + " »", fort: true,
              quand: function () { combler(p, vides[0], rafraichir); } },
            { nom: "Vérifier le vocabulaire", quand: function () { verifier(p); } },
            { nom: "Tout modifier", doux: true,
              quand: function () { VUE_PROJETS.editerSection(p, "socle", rafraichir); } },
          ]
        : [
            { nom: "Vérifier le vocabulaire", quand: function () { verifier(p); } },
            { nom: "Modifier la plateforme de marque", doux: true,
              quand: function () { VUE_PROJETS.editerSection(p, "socle", rafraichir); } },
          ]);
  }

  function campagnesRattachees(p) {
    var marque = (p.sections.identite || {}).marque;
    if (!marque) return 1;
    return DEPOT.liste("projets").filter(function (x) {
      return (x.sections.identite || {}).marque === marque;
    }).length;
  }

  /* Combler une dette : un champ, son coût rappelé, et c'est tout. */
  function combler(p, carte, rafraichir) {
    var champ = carte.forme === "phrase" || carte.forme === "texte"
      ? el("textarea", { rows: 3 })
      : el("textarea", { rows: 4, placeholder: "une ligne par élément" });

    PANNEAU.ouvrir(carte.t, "dette " + carte.n + " sur " + CARTES.length, el("div", {},
      UI.banniere("", "Tant que c'est vide : " + carte.cout + "."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, carte.t), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var v = champ.value.trim();
          if (!v) { AVIS.refus("Rien à enregistrer."); return; }
          if (!p.sections.socle) p.sections.socle = {};
          p.sections.socle[carte.cle] = (carte.forme === "phrase" || carte.forme === "texte")
            ? v : v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
          DEPOT.tracer("socle", "projets", p.id, carte.t + " renseigné");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function carteVide(p, c, rafraichir) {
    return el("div.carte-n.dette", {},
      el("div.carte-n-tete", {}, el("span.n", {}, String(c.n) + "."), el("span.t", {}, c.t)),
      el("div.cn-cout", {}, c.cout),
      el("button.b", { type: "button", style: { width: "100%", "justify-content": "center" },
        onclick: function () { combler(p, c, rafraichir); } }, "Combler")
    );
  }

  function contenu(c, v) {
    if (c.forme === "phrase") return el("div.phrase-marque", {}, v);
    if (c.forme === "chips") return el("div.chips", {}, v.map(function (x) { return el("span.chip", {}, x); }));
    if (c.forme === "ordre") {
      return el("div.ordre", {}, v.map(function (x, i) {
        return el("div.ordre-l", {}, el("span.n", {}, String(i + 1)), el("span", {}, x));
      }));
    }
    if (c.forme === "puces") return PANNEAU.puces(v);
    return el("p", {}, v);
  }

  /* ————————————————————— Le contrôle de vocabulaire — R10 et R12 ————————————————————— */

  function verifier(p) {
    var textes = [];
    (function ramasser(o) {
      Object.keys(o || {}).forEach(function (k) {
        var v = o[k];
        if (typeof v === "string") textes.push(v);
        else if (Array.isArray(v)) v.forEach(function (x) { if (typeof x === "string") textes.push(x); });
        else if (v && typeof v === "object") ramasser(v);
      });
    })(p.sections);
    (p.livrables || []).forEach(function (l) { textes.push(l.nom || ""); });

    var trouves = REGLES.vocabulaire(textes.join(" "));
    PANNEAU.ouvrir("Contrôle du vocabulaire", "règles R10 et R12", el("div", {},
      trouves.length
        ? el("div", {},
            UI.banniere("rouge", trouves.length + (trouves.length > 1 ? " termes surveillés apparaissent" : " terme surveillé apparaît") + " dans ce projet."),
            el("div.sousbloc", {}, el("h3", {}, "TROUVÉS"),
              el("div", {}, trouves.map(function (t) {
                return UI.fileItem(null, "« " + t.mot + " »",
                  t.type === "retire" ? "nom retiré du nommage" : "la marque ne le dit jamais", null);
              }))))
        : UI.banniere("vert", "Aucun mot interdit, aucun nom retiré.")
    ));
  }

  return { rendre: rendre };
})();
