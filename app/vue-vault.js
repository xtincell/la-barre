/* vue-vault.js — le vault de marque, hors des campagnes.
 *
 * Une campagne est une sélection : des marques, des SKU, des marchés. Ce qui
 * définit la marque, lui, ne change pas d'une saison à l'autre — et vivait
 * pourtant dans le projet qui l'avait écrit en premier. Il vit ici.
 *
 * L'écran répond à une question : « qu'est-ce qu'on sait de cette marque, et
 * qu'est-ce qu'on ne sait pas encore ? » Ce qui manque au vault se réécrit à
 * chaque campagne — c'est le coût, et il est chiffré en haut.
 */

window.VUE_VAULT = (function () {
  var el = O.el;
  var ouverte = null;
  /* Trente-deux packs sans filtre, c'est une liste où l'on se perd. Le tri se
   * fait sur ce qui distingue réellement un pack d'un autre : sa catégorie et
   * sa variante. */
  var filtre = { categorie: null, variante: null, etat: null };

  function rendre(hote) {
    var arbre = VAULT.arbre();
    O.vider(hote);

    if (!arbre.length) {
      hote.appendChild(el("p.rien", {}, "Aucune marque. Une marque naît avec son "
        + "premier dossier — et son vault se remplit en travaillant."));
      return;
    }

    var orphelins = VAULT.orphelins();

    hote.appendChild(el("div.vt", {},
      el("div.vt-h", {},
        el("h3.vt-t", {}, phrase(arbre, orphelins)),
        el("p.vt-s", {}, "Ce qui est ici vaut plusieurs années. Une campagne y puise — "
          + "elle n'y écrit pas. Chaque niveau hérite du précédent : ce qu'on n'écrit "
          + "pas plus bas vaut tel quel.")),

      orphelins.length ? blocOrphelins(orphelins, DEPOT.liste("marques"), hote) : null,

      el("div.vt-arbre", {}, arbre.map(function (n) { return noeud(n, 0, hote); }))
    ));
  }

  /* L'état de l'ensemble en une phrase, avec sa conséquence. */
  function phrase(arbre, orphelins) {
    var marques = [];
    arbre.forEach(function (o) { marques = marques.concat(o.enfants); });
    var sansSocle = marques.filter(function (m) {
      return VAULT.etatNiveau("marque", m.id).propres === 0
        && VAULT.etatNiveau("marque", m.id).herites === 0; });
    if (sansSocle.length) {
      return sansSocle.length
        + (sansSocle.length > 1 ? " marques n'ont pas de socle" : " marque n'a pas de socle")
        + " — chaque campagne le réécrira depuis zéro";
    }
    if (orphelins.length) {
      return orphelins.length
        + (orphelins.length > 1 ? " packs n'appartiennent" : " pack n'appartient")
        + " à aucune marque";
    }
    return marques.length + (marques.length > 1 ? " marques tenues" : " marque tenue")
      + ", socle et catalogue renseignés";
  }

  /* ————————————————————— Un nœud de l'arbre ————————————————————— */

  /* Trois niveaux : l'ombrelle, la marque, la gamme. Chacun porte un socle et
   * hérite du précédent. FrieslandCampina dit ce qui vaut pour tout le
   * portefeuille ; Bonnet Rouge dit « Réussir dès le matin » ; Bonnet Rouge IMP
   * parle d'enfance et de famille. Sans cet arbre on écrit trois fois la même
   * promesse — ou on la contredit sans s'en apercevoir. */
  var RANGS = { ombrelle: "OMBRELLE", marque: "MARQUE", gamme: "GAMME" };

  function cle(n) { return n.type + ":" + n.id; }

  function noeud(n, profondeur, hote) {
    if (!n.id) return sansOmbrelle(n, hote);
    var ici = ouverte === cle(n);
    var e = VAULT.etatNiveau(n.type, n.id);
    var m = n.type === "marque" ? DEPOT.trouve("marques", n.id) : null;
    var logo = m && m.logo ? DEPOT.trouve("assets", m.logo) : null;
    var couleur = (VAULT.vaultDe(n.type, n.id) || {}).couleur;

    return el("div.vn.n" + profondeur + (ici ? ".ici" : ""), {},
      el("button.vn-h", { type: "button",
        onclick: function () { ouverte = ici ? null : cle(n); rendre(hote); } },
        el("span.vn-e", {}, ici ? "−" : "+"),
        logo && logo.vignette
          ? el("span.vn-l", {}, el("img", { src: logo.vignette, alt: n.nom }))
          : el("span.vn-p", couleur ? { style: { background: couleur } } : {}),
        el("span.vn-n", {}, n.nom),
        el("span.vn-r", {}, RANGS[n.type]),
        el("span.vn-q", {}, resume(n, e))),

      /* La conséquence, avant d'ouvrir. */
      el("div.vn-c" + (e.propres || e.herites ? "" : ".manque"), {}, consequence(n, e)),

      ici ? corps(n, hote) : null,

      /* Les enfants restent visibles même replié : c'est l'arbre qu'on lit. */
      (n.enfants || []).length
        ? el("div.vn-k", {}, n.enfants.map(function (k) {
            return noeud(k, profondeur + 1, hote); }))
        : null
    );
  }

  function resume(n, e) {
    var bouts = [e.propres + " propres"];
    if (e.herites) bouts.push(e.herites + " hérités");
    if (e.vides.length) bouts.push(e.vides.length + " manquants");
    if (n.type === "marque") {
      var st = VAULT.etat(n.id);
      bouts.push(st.packs + (st.packs > 1 ? " packs" : " pack"));
      bouts.push(st.marches + (st.marches > 1 ? " marchés" : " marché"));
    }
    return bouts.join("  ·  ");
  }

  function consequence(n, e) {
    if (e.propres || e.herites) {
      if (n.type === "gamme" && !e.propres) {
        return "Hérite tout de sa marque. C'est légitime tant que la gamme ne dit "
          + "rien de particulier — sinon elle se spécialise ici.";
      }
      var c = n.type === "marque" ? VAULT.campagnesDe(n.id) : [];
      return (c.length
        ? "Servi par " + c.map(function (p) { return p.ref; }).join(", ")
        : "Aucune campagne ne s'en sert encore.")
        + (e.vides.length ? "  ·  " + e.vides.length + " champs manquent encore" : "");
    }
    if (n.type === "ombrelle") {
      return "Aucun socle d'entreprise. Ce qui vaut pour tout le portefeuille "
        + "sera réécrit marque par marque, et finira par diverger.";
    }
    if (n.type === "gamme") {
      return "Ni socle propre, ni socle de marque à hériter : cette gamme se "
        + "dessine sans fondement.";
    }
    return "Aucun socle écrit. Chaque campagne repartira d'une page blanche, "
      + "et rien ne pourra être refusé sur un fondement de marque.";
  }

  /* Les marques qu'aucune ombrelle ne revendique. */
  function sansOmbrelle(n, hote) {
    return el("div.vn.n0.orphelin", {},
      el("div.vn-h", {},
        el("span.vn-p", {}),
        el("span.vn-n", {}, n.nom),
        el("span.vn-q", {}, n.enfants.length
          + (n.enfants.length > 1 ? " marques" : " marque"))),
      el("div.vn-c.manque", {}, "Sans client déclaré, ces marques n'héritent de rien "
        + "et ne se regroupent nulle part."),
      el("div.vn-k", {}, n.enfants.map(function (k) { return noeud(k, 1, hote); })));
  }

  /* ————————————————————— Le corps d'un nœud ————————————————————— */

  function corps(n, hote) {
    var blocs = [socleDuNoeud(n, hote)];
    if (n.type === "marque") {
      var m = DEPOT.trouve("marques", n.id);
      /* Le socle ne se commande pas tout seul : il naît d'un brief, comme le
       * reste. Sans lui, le vault se remplit au fil des campagnes et finit par
       * dire trois choses différentes. */
      blocs.push(blocBriefPlateforme(m, hote));
      blocs.push(blocDecideurs(m, hote));
      blocs.push(blocPromos(m, hote));
      blocs.push(blocCatalogue(m, hote));
      blocs.push(blocMarches(m));
      blocs.push(blocCampagnes(m));
    }
    return el("div.vn-b", {}, blocs);
  }

  /* Le socle du niveau : ce qui lui est propre, ce qu'il hérite, et d'où. */
  function socleDuNoeud(n, hote) {
    return el("div.vtb-s", {}, VAULT.CHAMPS.map(function (c) {
      var h = VAULT.herite(n.type, n.id, c.cle);
      var vide = h.valeur === null || h.valeur === undefined
        || (Array.isArray(h.valeur) ? !h.valeur.length : !String(h.valeur).trim());
      return el("button.vtc" + (vide ? ".vide" : h.propre ? "" : ".herite"), {
        type: "button", title: "modifier — " + c.nom,
        onclick: function () { editer(n, c, hote); } },
        el("span.vtc-n", {}, c.nom,
          !vide && !h.propre && h.source
            ? el("span.vtc-h", {}, "de " + h.source.nom) : null),
        el("span.vtc-v", {}, vide ? (c.aide || "non écrit")
          : Array.isArray(h.valeur) ? h.valeur.join("  ·  ") : String(h.valeur)));
    }));
  }


  /* ————————————————————— Le brief qui commande le socle ————————————————————— */

  function blocBriefPlateforme(m, hote) {
    var t = BRIEFS.def("plateforme");
    if (!t) return null;
    var e = BRIEFS.etat(t, m);

    return el("div.vtb-bp" + (e.recevable ? ".ok" : e.existe ? ".partiel" : ".absent"), {},
      el("div.vtbk-t", {}, "LE BRIEF DE PLATEFORME",
        el("span", {}, e.existe ? e.ecrits + " sur " + e.champs + " champs" : "non posé"),
        el("button.b" + (e.existe ? ".nu" : ".or"), { type: "button",
          onclick: function () { editerBriefPlateforme(m, t, hote); } },
          e.existe ? "compléter" : "poser ce brief")),
      el("div.bfc-r", {},
        el("div.bfcr", {}, el("b", {}, "il fonde"), t.fonde),
        el("div.bfcr", {}, el("b", {}, "il pilote"), t.boussole)),
      el("div.bfc-c" + (e.recevable ? ".ok" : ""), {}, BRIEFS.cout(t, e)));
  }

  function editerBriefPlateforme(m, t, hote) {
    var f = FORM.rendre(BRIEFS.champs(t), BRIEFS.lire(t, m), {});
    PANNEAU.ouvrir(t.nom, m.nom, el("div", {},
      UI.banniere("", t.quoi),
      el("div.bfc-r", {},
        el("div.bfcr", {}, el("b", {}, "il fonde"), t.fonde),
        el("div.bfcr", {}, el("b", {}, "il pilote"), t.boussole)),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          BRIEFS.ecrire(t, m, f.valeurs());
          DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
        } }, "Enregistrer au vault"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* ————————————————————— Qui décide pour cette marque ————————————————————— */

  /* Une validation obtenue de quelqu'un qui n'a pas ce pouvoir ne tient pas, et
   * on ne le découvre qu'au moment où elle est contestée. */
  function blocDecideurs(m, hote) {
    var ds = VAULT.decideurs(m.id);
    var propres = ds.filter(function (x) { return x.propre; });

    return el("div.vtb-d", {},
      el("div.vtbk-t", {}, "QUI DÉCIDE",
        el("span", {}, propres.length
          ? propres.length + (propres.length > 1 ? " décideurs nommés" : " décideur nommé")
          : "aucun décideur nommé pour cette marque")),
      ds.length
        ? el("div.vt-dec", {}, ds.map(function (x) {
            return el("button.vtd" + (x.propre ? ".ici" : ""), { type: "button",
              title: x.propre ? "retirer de cette marque" : "nommer pour cette marque",
              onclick: function () {
                VAULT.basculerDecideur(m.id, x.contact.id);
                DEPOT.enregistrer(); rendre(hote);
              } },
              el("span.vtd-n", {}, x.contact.nom),
              el("span.vtd-r", {}, [x.contact.role, x.contact.niveau].filter(Boolean).join(" · ")),
              el("span.vtd-x", {}, x.propre ? "nommé ici" : "du client"));
          }))
        : el("p.rien", {}, "Aucun contact chez ce client. Sans décideur nommé, "
            + "aucune validation ne prend effet."),
      !propres.length && ds.length
        ? el("p.vtb-x", {}, "Ceux du client valent par défaut. Nommer ceux qui décident "
            + "vraiment pour cette marque évite de faire valider par la mauvaise personne.")
        : null);
  }

  /* ————————————————————— Ce que la marque sait faire en promo ————————————————————— */

  function blocPromos(m, hote) {
    var ps = VAULT.promos(m.id);
    return el("div.vtb-p", {},
      el("div.vtbk-t", {}, "MÉCANIQUES DE PROMO",
        el("span", {}, ps.length + (ps.length > 1 ? " connues" : " connue")),
        el("button.b.nu", { type: "button", onclick: function () { ajouterPromo(m, hote); } },
          "+ en déclarer une")),
      ps.length
        ? el("div.vt-pr", {}, ps.map(function (x) {
            return el("div.vtpr" + (x.parLUsage ? ".usage" : ""), {},
              el("span.vtpr-n", {}, x.nom),
              x.detail ? el("span.vtpr-d", {}, x.detail) : null,
              el("span.vtpr-q", {}, x.packs
                ? x.packs + (x.packs > 1 ? " packs la portent" : " pack la porte")
                : "aucun pack ne la porte")
              , x.parLUsage ? el("span.vtpr-u", {}, "vue sur les packs, jamais déclarée") : null);
          }))
        : el("p.rien", {}, "Aucune mécanique connue. Une promo qui s'invente au moment "
            + "de la campagne n'a ni coût ni historique."));
  }

  function ajouterPromo(m, hote) {
    var nom = el("input", { type: "text", placeholder: "10% de plus, Achète et gagne…" });
    var det = el("input", { type: "text", placeholder: "Ce qu'elle donne, en une ligne" });
    PANNEAU.ouvrir("Déclarer une mécanique", m.nom, el("div", {},
      UI.banniere("", "Une mécanique déclarée porte un historique : on saura sur quels "
        + "marchés elle a marché, et combien de packs l'ont portée."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom"), nom),
        el("div.champ", {}, el("label", {}, "Détail"), det)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var t = nom.value.trim();
          if (!t) { AVIS.refus("Une mécanique sans nom ne se retrouve pas."); return; }
          if (!VAULT.ajouterPromo(m.id, t, det.value.trim() || null)) {
            AVIS.refus("Cette mécanique existe déjà."); return;
          }
          DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
        } }, "Déclarer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
    setTimeout(function () { nom.focus(); }, 40);
  }

  /* ————————————————————— Les packs que personne ne revendique ————————————————————— */

  /* Un pack sans marque n'appartient pas à tout le monde — c'est cette
   * tolérance qui faisait apparaître les boîtes Bonnet Rouge dans le dossier
   * Beignet Paradise. Il n'appartient à personne, et il attend un geste. */
  function blocOrphelins(orphelins, marques, hote) {
    return el("div.vt-orph", {},
      el("div.vto-t", {}, "PACKS SANS MARQUE",
        el("span", {}, orphelins.length + "  ·  ils n'entrent dans aucun catalogue")),
      el("p.vto-x", {}, "Leur nom de fichier ne dit ni la marque ni la catégorie. "
        + "Tant qu'ils ne sont pas rattachés, aucune campagne ne peut les montrer — "
        + "et c'est voulu : un pack attribué au hasard se retrouve sur le KV d'une "
        + "autre marque."),
      el("div.vt-og", {}, orphelins.slice(0, 24).map(function (s) {
        return el("div.vto", {},
          s.vignette ? el("span.vto-v", {}, el("img", { src: s.vignette, alt: s.nom })) : null,
          el("span.vto-n", {}, s.fichierOrigine || s.nom),
          choixMarque(s, marques, hote));
      })),
      orphelins.length > 24
        ? el("p.vto-x", {}, "et " + (orphelins.length - 24) + " autres.")
        : null);
  }

  function choixMarque(s, marques, hote) {
    var sel = el("select", {});
    sel.appendChild(el("option", { value: "" }, "à qui ?"));
    marques.forEach(function (m) { sel.appendChild(el("option", { value: m.id }, m.nom)); });
    sel.onchange = function () {
      if (!sel.value) return;
      VAULT.rattacher(s.id, sel.value);
      DEPOT.enregistrer();
      AVIS.fait("« " + (s.fichierOrigine || s.nom) + " » entre au catalogue "
        + (DEPOT.trouve("marques", sel.value) || {}).nom + ".");
      rendre(hote);
    };
    return sel;
  }

  /* ————————————————————— Une marque ————————————————————— */

  /* ————————————————————— Le catalogue de la marque ————————————————————— */

  function blocCatalogue(m, hote) {
    var cat = VAULT.catalogue(m.id);
    var vus = filtrer(cat);

    return el("div.vtb-k", {},
      el("div.vtbk-t", {}, "LE CATALOGUE",
        el("span", {}, vus.length + " sur " + cat.length
          + (cat.length > 1 ? " packs" : " pack")),
        el("button.b.nu", { type: "button", onclick: function () {
          var neufPack = VAULT.creerSku(m.id);
          DEPOT.enregistrer(); rendre(hote); fiche(neufPack, m, hote);
        } }, "+ ajouter un pack")),
      filtres(m, cat, hote),
      vus.length
        ? el("div.vt-packs", {}, vus.map(function (s) {
            var ctrl = VAULT.controles(s.id).length;
            return el("button.vtp" + (ctrl ? ".aq" : ""), {
              type: "button", title: (s.fichierOrigine || s.nom) + " — ouvrir la fiche",
              onclick: function () { fiche(s, m, hote); } },
              s.vignette ? el("span.vtp-v", {}, el("img", { src: s.vignette, alt: s.nom })) : null,
              el("span.vtp-n", {}, s.nom),
              el("span.vtp-m", {}, [s.categorie, s.format, s.variante,
                s.langue ? O.langue(s.langue) : null, s.promo].filter(Boolean).join(" · ")
                || "à qualifier"),
              ctrl
                ? el("span.vtp-x", {}, ctrl + (ctrl > 1 ? " manques à la fiche" : " manque à la fiche"))
                : el("span.vtp-ok", {}, "fiche complète"));
          }))
        : el("p.rien", {}, cat.length
            ? "Aucun pack ne répond à ce filtre."
            : "Aucun pack. La marque n'a rien à montrer sur ses formats."),

      VAULT.archives(m.id).length
        ? el("div.vtb-a", {},
            el("div.vtbk-t", {}, "ARCHIVÉS",
              el("span", {}, VAULT.archives(m.id).length
                + "  ·  hors catalogue, toujours au dépôt")),
            el("div.vt-arch", {}, VAULT.archives(m.id).map(function (s) {
              return el("div.vta", {},
                el("span.vta-n", {}, s.nom),
                el("span.vta-m", {}, "archivé le " + O.joli(s.archive.quand)
                  + (s.archive.motif ? "  ·  " + s.archive.motif : "")),
                el("button.b.nu", { type: "button", onclick: function () {
                  VAULT.restaurer(s.id); DEPOT.enregistrer(); rendre(hote);
                } }, "remettre au catalogue"));
            })))
        : null);
  }

  /* ————————————————————— Où la marque est distribuée ————————————————————— */

  function blocMarches(m) {
    var mk = VAULT.marches(m.id);
    return el("div.vtb-m", {},
      el("div.vtbk-t", {}, "DISTRIBUÉE SUR",
        el("span", {}, mk.length + (mk.length > 1 ? " marchés" : " marché"))),
      mk.length
        ? el("div.vt-mk", {}, mk.map(function (x) {
            return el("span.vtmk" + (x.origine === "déclaré" ? ".dit" : ""), {},
              el("b", {}, x.marche.code), x.marche.nom,
              el("i", {}, x.origine));
          }))
        : el("p.rien", {}, "Aucun marché. Elle n'a encore rien produit nulle part."));
  }

  /* ————————————————————— Ce que les campagnes en retiennent ————————————————————— */

  function blocCampagnes(m) {
    var cs = VAULT.campagnesDe(m.id);
    return el("div.vtb-c", {},
      el("div.vtbk-t", {}, "CAMPAGNES QUI S'EN SERVENT",
        el("span", {}, cs.length ? cs.length : "aucune")),
      cs.length
        ? el("div.vt-cp", {}, cs.map(function (p) {
            var sel = VAULT.selection(p, m.id);
            return el("a.vtcp", { href: "#/projets/" + p.id },
              el("span.vtcp-n", {}, p.nom),
              el("span.vtcp-q", {}, sel.pieces + " pièces  ·  "
                + sel.marchesRetenus.length + " marchés sur " + sel.marchesDisponibles
                + "  ·  " + sel.skuRetenus + " packs retenus sur " + sel.skuCatalogue));
          }))
        : el("p.rien", {}, "Aucune."));
  }

  function filtrer(cat) {
    return cat.filter(function (s) {
      if (filtre.categorie && s.categorie !== filtre.categorie) return false;
      if (filtre.variante && s.variante !== filtre.variante) return false;
      if (filtre.etat === "aq" && !VAULT.controles(s.id).length) return false;
      if (filtre.etat === "ok" && VAULT.controles(s.id).length) return false;
      return true;
    });
  }

  /* Les filtres ne listent que ce qui existe : proposer une catégorie vide,
   * c'est promettre un rangement qu'on n'a pas. */
  function filtres(m, cat, hote) {
    function compte(champ, val) {
      return cat.filter(function (s) { return s[champ] === val; }).length;
    }
    var cats = VAULT.CATEGORIES.filter(function (c) { return compte("categorie", c.cle); });
    var vars = VAULT.variantesDe(m.id).filter(function (v) { return compte("variante", v); });
    var aq = cat.filter(function (s) { return VAULT.controles(s.id).length; }).length;

    function bouton(actif, texte, quand) {
      return el("button.vtf" + (actif ? ".ici" : ""), { type: "button",
        onclick: function () { quand(); rendre(hote); } }, texte);
    }

    return el("div.vt-f", {},
      el("div.vtf-g", {},
        bouton(!filtre.categorie, "toutes", function () { filtre.categorie = null; }),
        cats.map(function (c) {
          return bouton(filtre.categorie === c.cle, c.cle + " · " + compte("categorie", c.cle),
            function () { filtre.categorie = filtre.categorie === c.cle ? null : c.cle; });
        })),
      vars.length > 1
        ? el("div.vtf-g", {}, vars.map(function (v) {
            return bouton(filtre.variante === v, v + " · " + compte("variante", v),
              function () { filtre.variante = filtre.variante === v ? null : v; });
          }))
        : null,
      aq
        ? el("div.vtf-g", {},
            bouton(filtre.etat === "aq", aq + " fiches incomplètes",
              function () { filtre.etat = filtre.etat === "aq" ? null : "aq"; }))
        : null
    );
  }

  /* ————————————————————— La fiche d'un pack ————————————————————— */

  /* Un pack n'est pas une image : c'est un article. Sa fiche porte son code,
   * ses mentions, les marchés qui le vendent — et la liste des pièces qui le
   * montrent, seul endroit d'où l'on voit qu'on l'affiche là où il n'est pas
   * distribué. */
  function fiche(s, m, hote, liste) {
    /* On navigue dans le catalogue sans repasser par la liste : c'est la
     * différence entre consulter trente-deux fiches et en parcourir une. */
    var voisins = liste || filtrer(VAULT.catalogue(s.marque));
    var i = voisins.findIndex ? voisins.findIndex(function (x) { return x.id === s.id; })
      : voisins.map(function (x) { return x.id; }).indexOf(s.id);

    function corps() {
      var ctrl = VAULT.controles(s.id);
      var dist = VAULT.distribution(s.id);
      var usage = VAULT.usage(s.id);

      return el("div.fi", {},
        voisins.length > 1
          ? el("div.fi-nav", {},
              el("button.b.nu", { type: "button", disabled: i <= 0 ? true : null,
                onclick: function () { fiche(voisins[i - 1], m, hote, voisins); } }, "← précédent"),
              el("span.fin-q", {}, (i + 1) + " sur " + voisins.length
                + (filtre.categorie || filtre.variante || filtre.etat ? "  ·  filtré" : "")),
              el("button.b.nu", { type: "button", disabled: i >= voisins.length - 1 ? true : null,
                onclick: function () { fiche(voisins[i + 1], m, hote, voisins); } }, "suivant →"))
          : null,
        s.vignette ? el("div.fi-v", {}, el("img", { src: s.vignette, alt: s.nom })) : null,

        ctrl.length
          ? el("div.fi-ctrl", {},
              el("div.fic-t", {}, ctrl.length
                + (ctrl.length > 1 ? " choses manquent à cette fiche" : " chose manque à cette fiche")),
              ctrl.map(function (c) {
                return el("div.fic", {},
                  el("span.fic-q", {}, c.quoi,
                    c.aQui ? el("span.fic-a", {}, O.poste(c.aQui).nom) : null),
                  el("span.fic-x", {}, c.cout));
              }))
          : el("div.fi-ok", {}, "Fiche complète. Ce pack peut être montré sans risque."),

        !VAULT.categoriesPossibles(s).length
          ? el("div.fi-cat", {},
              el("span.fic-q", {}, (VAULT.clientDe(s.marque) || {}).nom
                + " n'a aucune catégorie de produit déclarée"),
              el("span.fic-x", {}, "Les catégories appartiennent au client : « Boîte » et "
                + "« Sachet » chez un pâtissier n'ont rien à voir avec « EVAP » et « UHT ». "
                + "Tant qu'aucune n'existe, ce champ ne peut rien proposer."),
              el("button.b.nu", { type: "button",
                onclick: function () { nouvelleCategorie(s, m, hote); } },
                "+ déclarer une catégorie"))
          : null,

        el("div.fi-champs", {}, VAULT.FICHE.map(function (c) {
          var v = s[c.cle];
          var vide = Array.isArray(v) ? !v.length : (v === undefined || v === null || String(v).trim() === "");
          var aMoi = !c.poste || c.poste === MAISON.titulaire;
          return el("button.ch-e" + (vide ? ".vide" : "") + (aMoi ? "" : ".autrui"),
            { type: "button", onclick: function () { editerFiche(s, c, m, hote, voisins); } },
            el("span.che-n", {}, c.nom,
              aMoi ? null : el("span.che-p", {}, O.poste(c.poste).nom)),
            el("span.che-v", {}, vide
              ? (aMoi ? (c.aide || "non renseigné") : "à réclamer — " + (c.aide || ""))
              : Array.isArray(v) ? v.join("  ·  ") : String(v)));
        })),

        /* Les marchés qui le vendent. C'est ce champ qui empêche de le montrer
         * là où il n'existe pas. */
        el("div.fi-b", {},
          el("div.fib-t", {}, "DISTRIBUÉ SUR",
            el("span", {}, dist.length + (dist.length > 1 ? " marchés" : " marché")
              + "  ·  " + (VAULT.clientDe(s.marque) || {}).nom + " en sert "
              + VAULT.marchesPossibles(s).length)),
          el("div.fi-mk", {}, VAULT.marchesPossibles(s).map(function (mk) {
            var ici = (s.marches || []).indexOf(mk.id) !== -1;
            return el("button.fimk" + (ici ? ".ici" : ""), { type: "button",
              onclick: function () {
                s.marches = s.marches || [];
                var i = s.marches.indexOf(mk.id);
                if (i === -1) s.marches.push(mk.id); else s.marches.splice(i, 1);
                DEPOT.enregistrer(); PANNEAU.fermer(); fiche(s, m, hote);
              } }, mk.code);
          }))),

        /* Où il est montré — la relation que le modèle réclame. */
        el("div.fi-b", {},
          el("div.fib-t", {}, "MONTRÉ SUR",
            el("span", {}, usage.length
              ? usage.length + (usage.length > 1 ? " pièces" : " pièce")
              : "aucune pièce")),
          usage.length
            ? el("div.fi-u", {}, usage.slice(0, 12).map(function (x) {
                var hors = x.marche && dist.length
                  && !dist.some(function (d) { return d.id === x.marche.id; });
                return el("div.fiu" + (hors ? ".hors" : ""), {},
                  el("span.fiu-n", {}, x.livrable.nom),
                  el("span.fiu-m", {}, x.projet.ref
                    + (x.marche ? "  ·  " + x.marche.code : "")
                    + (hors ? "  ·  non distribué ici" : "")));
              }))
            : el("p.rien", {}, "Aucune pièce ne le déclare. Tant que les pièces ne "
                + "disent pas quels packs elles montrent, on ne peut pas vérifier "
                + "qu'un SKU n'apparaît pas là où il n'est pas vendu.")),

        el("div.fi-g", {},
          IMAGE.bouton(s, function () { DEPOT.enregistrer(); PANNEAU.fermer(); fiche(s, m, hote); }),
          el("button.b", { type: "button", onclick: function () { archiverPack(s, m, hote); } },
            "Archiver ce pack")),

        el("div.fi-f", {},
          el("span.fif-l", {}, "fichier de production"),
          el("span.fif-v", {}, s.production || "aucun"),
          s.espace ? el("span.fif-l", {}, "espace") : null,
          s.espace ? el("span.fif-v" + (s.espace === "CMYK" ? ".alerte" : ""), {}, s.espace) : null)
      );
    }

    PANNEAU.ouvrir(s.nom, (m ? m.nom + "  ·  " : "") + "fiche pack", corps());
  }


  /* On n'efface pas : on archive, avec le motif. C'est la règle du produit —
   * l'information ne se perd pas, elle sort du chemin. */

  /* Déclarer une catégorie pour le client. Elle vaudra pour toutes ses marques
   * et tous ses packs — c'est une donnée de portefeuille, pas de pack. */
  function nouvelleCategorie(s, m, hote) {
    var c = VAULT.clientDe(s.marque);
    if (!c) { AVIS.refus("Ce pack n'est rattaché à aucun client."); return; }
    var cle = el("input", { type: "text", placeholder: "IMP, BOITE, SACHET…" });
    var nom = el("input", { type: "text", placeholder: "Ce que ça veut dire, en clair" });
    PANNEAU.ouvrir("Déclarer une catégorie", c.nom, el("div", {},
      UI.banniere("", "Elle vaudra pour toutes les marques de " + c.nom
        + " et tous leurs packs. C'est une donnée de portefeuille, pas de pack."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Code"), cle),
        el("div.champ", {}, el("label", {}, "Nom lisible"), nom)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var k = cle.value.trim().toUpperCase();
          if (!k) { AVIS.refus("Une catégorie sans code ne se retrouve pas."); return; }
          if (!VAULT.ajouterCategorie(c.id, k, nom.value.trim() || null)) {
            AVIS.refus("Cette catégorie existe déjà chez " + c.nom + "."); return;
          }
          DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote); fiche(s, m, hote);
        } }, "Déclarer"),
        el("button.b.nu", { type: "button",
          onclick: function () { PANNEAU.fermer(); fiche(s, m, hote); } }, "Annuler"))
    ));
    setTimeout(function () { cle.focus(); }, 40);
  }

  function archiverPack(s, m, hote) {
    var champ = el("input", { type: "text",
      placeholder: "Pourquoi il sort du catalogue — format arrêté, promo terminée…" });
    PANNEAU.ouvrir("Archiver « " + s.nom + " »", m ? m.nom : "", el("div", {},
      UI.banniere("", "Le pack sort du catalogue et n'est plus proposé aux campagnes. "
        + "Il reste au dépôt : les campagnes passées qui le montrent gardent leur trace, "
        + "et il se remet au catalogue d'un geste."),
      VAULT.usage(s.id).length
        ? el("div.prix", {}, el("span.signe", {}, "⚠"),
            VAULT.usage(s.id).length + " pièces le montrent encore. Elles ne changent pas — "
            + "mais plus personne ne pourra en ajouter.")
        : null,
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Motif"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          VAULT.archiver(s.id, champ.value.trim() || null);
          DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
          AVIS.fait("« " + s.nom + " » est archivé. Il reste au dépôt.");
        } }, "Archiver"),
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); fiche(s, m, hote, liste); } },
          "Annuler"))
    ));
    setTimeout(function () { champ.focus(); }, 40);
  }

  function editerFiche(s, c, m, hote, liste) {
    var aMoi = !c.poste || c.poste === MAISON.titulaire;
    var f = FORM.rendre([c], s, {});
    PANNEAU.ouvrir(c.nom, s.nom, el("div", {},
      c.aide ? el("p.ch-aide", {}, c.aide) : null,
      /* Un champ qui appartient au client ne se devine pas : on le réclame. */
      !aMoi
        ? el("div.form-actions", { style: { "margin-bottom": ".8rem" } },
            el("button.b", { type: "button", onclick: function () {
              PANNEAU.fermer();
              RENVOI.ouvrir({ quoi: c.nom + " du pack « " + s.nom + " »" });
            } }, "Le réclamer à " + O.poste(c.poste).nom))
        : null,
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          VAULT.ecrireSku(s.id, c.cle, f.valeurs()[c.cle]);
          DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote); fiche(s, m, hote, liste);
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); fiche(s, m, hote, liste); } },
          "Annuler"))
    ));
  }

  /* Écrire au niveau où l'on est. Un champ posé sur l'ombrelle vaut pour toutes
   * ses marques ; posé sur la gamme, il ne vaut que là. */
  function editer(n, c, hote) {
    var v = VAULT.vaultDe(n.type, n.id) || {};
    var h = VAULT.herite(n.type, n.id, c.cle);
    var f = FORM.rendre([c], v, {});
    var par = VAULT.parent(n.type, n.id);

    PANNEAU.ouvrir(c.nom, VAULT.nomDe(n.type, n.id) + "  ·  " + RANGS[n.type].toLowerCase(),
      el("div", {},
        el("p.ch-aide", {}, "Ce champ vaut pour ce niveau et tout ce qui en descend. "
          + "Ce qui n'est vrai que cette saison reste dans la campagne."),
        !h.propre && h.valeur && h.source
          ? el("div.prix", {}, el("span.signe", {}, "◐"),
              "Hérité de " + h.source.nom + " : « "
              + (Array.isArray(h.valeur) ? h.valeur.join(", ") : String(h.valeur)).slice(0, 90)
              + " ». L'écrire ici le spécialise pour " + VAULT.nomDe(n.type, n.id) + ".")
          : null,
        f.noeud,
        el("div.form-actions", {},
          el("button.b.or", { type: "button", onclick: function () {
            VAULT.ecrireNiveau(n.type, n.id, c.cle, f.valeurs()[c.cle]);
            DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
          } }, "Enregistrer"),
          h.propre && par
            ? el("button.b", { type: "button", onclick: function () {
                /* Renoncer à sa version : le niveau redevient ce que dit le parent. */
                VAULT.ecrireNiveau(n.type, n.id, c.cle, Array.isArray(h.valeur) ? [] : "");
                DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
              } }, "Reprendre celui de " + VAULT.nomDe(par.type, par.id))
            : null,
          el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
      ));
  }

  return { rendre: rendre };
})();
