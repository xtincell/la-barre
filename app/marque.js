/* marque.js — les éléments de marque, là où on en a besoin.
 *
 * Un logo, une gamme, des produits : c'est ce qu'un DA regarde en premier et
 * ce qu'un document de cadrage doit porter. Ils étaient dans le dépôt et ne
 * sortaient qu'au Référentiel — c'est-à-dire à l'endroit où personne ne va
 * quand il travaille.
 *
 * Ici ils remontent : sur la fiche de marque, dans le socle, dans le document
 * de cadrage, et à côté des SKU qu'un KV prétend montrer.
 */

window.MARQUE = (function () {
  var el = O.el;

  /* Ce qu'un élément de marque est, et où il sert. */
  var ROLES = {
    logo: { rang: 0, nom: "Logo", pluriel: "Logos",
      quoi: "le bloc-marque, dans ses versions", ou: "partout",
      cout: "aucun logo au dossier : chaque exécutant ira le chercher ailleurs, et le trouvera faux" },
    gamme: { rang: 1, nom: "Vue de gamme", pluriel: "Vues de gamme",
      quoi: "les produits photographiés côte à côte", ou: "socle, cadrage, présentation" },
    produit: { rang: 2, nom: "Produit", pluriel: "Produits",
      quoi: "un SKU, un packaging, un item", ou: "socle, KV, référentiel",
      cout: "les KV montreront des produits que personne n'a validés" },
    illustration: { rang: 3, nom: "Illustration", pluriel: "Illustrations",
      quoi: "les dessins propriétaires de la marque", ou: "socle, goodies" },
    charte: { rang: 4, nom: "Charte", pluriel: "Chartes",
      quoi: "le document de normes graphiques", ou: "socle" },
    police: { rang: 5, nom: "Police", pluriel: "Polices",
      quoi: "les fontes, avec leur licence", ou: "référentiel",
      cout: "une licence de fonte non vérifiée est un risque juridique réel et sous-estimé" },
    autre: { rang: 9, nom: "Autre", pluriel: "Autres", quoi: "", ou: "" },
  };

  function role(a) {
    if (a.role) return a.role;
    /* Sans rôle déclaré, on déduit du nom — une fois, pas à chaque lecture. */
    var n = O.normalise(a.nom || "");
    if (n.indexOf("logo") !== -1) return "logo";
    if (n.indexOf("gamme") !== -1) return "gamme";
    if (n.indexOf("packaging") !== -1 || n.indexOf("product") !== -1 || n.indexOf("sku") !== -1) return "produit";
    if (n.indexOf("illustration") !== -1) return "illustration";
    return "autre";
  }

  /* La marque d'un dossier. Le nom est dans l'identité ; l'objet est au dépôt. */
  /* Les marques d'un dossier. Une campagne peut en porter plusieurs — c'est
   * même le cas courant chez un annonceur à portefeuille. La référence du vault
   * fait foi ; le nom recopié ne sert que de secours pour les vieux dossiers. */
  function toutes(p) {
    var ident = p.sections.identite || {};
    if ((ident.marqueIds || []).length) {
      return ident.marqueIds.map(function (id) { return DEPOT.trouve("marques", id); })
        .filter(Boolean);
    }
    var vus = {};
    (p.livrables || []).forEach(function (l) { if (l.marqueId) vus[l.marqueId] = true; });
    if (Object.keys(vus).length) {
      return Object.keys(vus).map(function (id) { return DEPOT.trouve("marques", id); })
        .filter(Boolean);
    }
    if (!ident.marque) return [];
    return DEPOT.liste("marques").filter(function (m) {
      return O.normalise(m.nom) === O.normalise(ident.marque); });
  }

  function de(p) { return toutes(p)[0] || null; }

  /* Strictement les éléments de cette marque. La règle permissive — un asset
   * sans marque appartient à tout le monde — faisait apparaître le logo Beignet
   * Paradise sur la page FrieslandCampina. C'est la même faute que sur les
   * packs, et elle vaut ici aussi : sans marque, un élément n'appartient à
   * personne et attend d'être rattaché. */
  function assets(marqueId, r) {
    if (!marqueId) return [];
    return DEPOT.liste("assets").filter(function (a) {
      if (a.marque !== marqueId) return false;
      return !r || role(a) === r;
    });
  }

  /* Ce que personne ne revendique — visible, mais nulle part ailleurs. */
  function assetsOrphelins() {
    return DEPOT.liste("assets").filter(function (a) { return !a.marque; });
  }

  function logo(marqueId) { return assets(marqueId, "logo")[0] || null; }

  /* Les SKU d'une marque. Strictement les siens : un pack sans marque
   * n'appartient pas à tout le monde — c'est cette tolérance qui faisait
   * apparaître les boîtes Bonnet Rouge dans le dossier Beignet Paradise.
   * Le catalogue vit au vault de la marque ; on le lit là. */
  function sku(marqueId) {
    return window.VAULT ? VAULT.catalogue(marqueId)
      : DEPOT.liste("sku").filter(function (s) { return s.marque === marqueId; });
  }

  function skuParNom(nom) {
    var n = O.normalise(nom);
    return DEPOT.liste("sku").filter(function (s) { return O.normalise(s.nom) === n; })[0] || null;
  }

  function visuelSku(nom) {
    var s = skuParNom(nom);
    if (!s) return null;
    if (s.vignette) return s;
    return s.asset ? DEPOT.trouve("assets", s.asset) : null;
  }

  /* ————————————————————— La pastille de marque ————————————————————— */

  /* Le logo a une place certaine : partout où la marque est nommée. */
  function pastille(p, taille) {
    var m = de(p);
    var l = m ? logo(m.id) : null;
    var t = taille || 44;
    if (!l) {
      return el("span.mq-p.sans", { style: { width: t + "px", height: t + "px" },
        title: "aucun logo au dossier — " + ROLES.logo.cout }, "?");
    }
    return el("span.mq-p", { style: { width: t + "px", height: t + "px" },
      title: (m ? m.nom : "") + " · " + l.nom },
      el("img", { src: l.vignette, alt: m ? m.nom : "logo" }));
  }

  /* ————————————————————— Le bloc, dans le socle ————————————————————— */

  function bloc(p, rafraichir) {
    var mqs = toutes(p);
    /* Plusieurs marques : chacune montre les siennes, aucune ne montre celles
     * des autres. Une seule : le comportement d'avant. */
    if (mqs.length > 1) return blocMulti(p, mqs, rafraichir);
    var m = mqs[0] || null;
    var tous = m ? assets(m.id) : [];
    var parRole = {};
    tous.forEach(function (a) {
      var r = role(a);
      if (!parRole[r]) parRole[r] = [];
      parRole[r].push(a);
    });
    var gamme = sku(m ? m.id : null);

    return el("div.mq", {},
      el("div.mq-tete", {},
        pastille(p, 56),
        el("div.mqt-c", {},
          el("div.mqt-n", {}, m ? m.nom : "marque non rattachée"),
          el("div.mqt-q", {}, tous.length
            ? tous.length + (tous.length > 1 ? " éléments de marque" : " élément de marque")
              + (gamme.length ? "  ·  " + gamme.length + " SKU" : "")
            : "aucun élément de marque au dossier")),
        el("button.b.nu", { type: "button", onclick: function () { ajouter(p, m, rafraichir); } },
          "+ élément")),

      !parRole.logo
        ? UI.banniere("rouge", ROLES.logo.cout)
        : null,

      gamme.length ? blocGamme(p, gamme, rafraichir) : null,

      !tous.length
        ? el("p.rien", {}, "Le socle ne porte que du texte. Un DA qui ouvre ce dossier ne sait pas à quoi ressemble la marque, et ira chercher ailleurs.")
        : el("div.mq-roles", {}, Object.keys(ROLES)
            .filter(function (r) { return parRole[r] && r !== "produit"; })
            .map(function (r) {
              return el("div.mq-r", {},
                el("div.mqr-t", {}, ROLES[r].pluriel,
                  el("span", {}, ROLES[r].quoi)),
                el("div.rt-mur", {}, parRole[r].map(function (a) { return carte(p, a, rafraichir); })));
            }))
    );
  }

  /* La gamme : ce qu'on vend, avec ce que ça montre et où c'est distribué. */

  /* Une campagne à plusieurs marques : un bloc par marque, et rien qui déborde
   * de l'une sur l'autre. */
  function blocMulti(p, mqs, rafraichir) {
    return el("div.mq-multi", {}, mqs.map(function (m) {
      var tous = assets(m.id);
      var gamme = sku(m.id);
      return el("div.mqm", {},
        el("div.mqm-t", {},
          el("span.mqm-n", {}, m.nom),
          el("span.mqm-q", {}, tous.length + (tous.length > 1 ? " éléments" : " élément")
            + "  ·  " + gamme.length + (gamme.length > 1 ? " packs" : " pack")),
          el("a.mqm-v", { href: "#/maison/marques" }, "son vault →")),
        tous.length
          ? el("div.mq-el", {}, tous.slice(0, 8).map(function (a) {
              return el("span.mqe", { title: a.nom },
                a.vignette ? el("img", { src: a.vignette, alt: a.nom })
                  : el("span.mqe-x", {}, "—"));
            }))
          : el("p.rien", {}, "Aucun élément de marque au vault. Un DA doit avoir le "
              + "logo et la gamme sous les yeux avant de dessiner."));
    }));
  }

  function blocGamme(p, gamme, rafraichir) {
    return el("div.mq-gamme", {},
      el("div.mqr-t", {}, "La gamme", el("span", {}, "ce qui est vendu, et où")),
      el("div.mq-sku", {}, gamme.map(function (s) {
        var v = s.vignette ? s : (s.asset ? DEPOT.trouve("assets", s.asset) : null);
        var marches = (s.marches || []).map(function (id) {
          var m = DEPOT.trouve("marches", id); return m ? m.code : null; }).filter(Boolean);
        return el("div.mq-s", {},
          v ? IMAGE.vignette(v, "planche") : el("div.mqs-sans", {}, "aucun visuel"),
          el("div.mqs-c", {},
            el("div.mqs-n", {}, s.nom),
            s.contenu ? el("div.mqs-q", {}, s.contenu) : null,
            el("div.mqs-m", {}, marches.length
              ? marches.join(" · ")
              : el("span.alerte", {}, "aucun marché déclaré"))));
      })));
  }

  function carte(p, a, rafraichir) {
    var d = a.droits || {};
    var expire = d.expire && d.expire < O.jour();
    return el("button.rt-c" + (expire ? ".ecart" : ""), { type: "button",
      title: a.note || a.nom, onclick: function () { detail(p, a, rafraichir); } },
      IMAGE.vignette(a, "planche"),
      el("span.rtc-bas", {},
        el("span.rtc-n", {}, a.nom),
        el("span.rtc-m", {}, expire ? "droits expirés"
          : (d.zones || []).length ? (d.zones || []).join(" · ") : "zones non dites")));
  }

  function detail(p, a, rafraichir) {
    var d = a.droits || {};
    PANNEAU.ouvrir(a.nom, ROLES[role(a)].nom, el("div", {},
      IMAGE.vignette(a, "grande"),
      a.note ? el("p.mq-note", {}, a.note) : null,
      PANNEAU.ligne("Rôle", ROLES[role(a)].nom),
      PANNEAU.ligne("Source", a.source || null, !a.source),
      PANNEAU.ligne("Zones autorisées", (d.zones || []).join(" · ") || null, !(d.zones || []).length),
      PANNEAU.ligne("Durée de cession", d.cession || null, !d.cession),
      PANNEAU.ligne("Expire le", d.expire ? O.joli(d.expire) : null, !d.expire),
      PANNEAU.ligne("Master", a.master || null, !a.master),
      el("div.form-actions", {},
        IMAGE.bouton(a, function () { DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir(); }),
        el("button.b.nu", { type: "button", onclick: function () {
          location.hash = "#/referentiel";
          PANNEAU.fermer();
        } }, "voir au référentiel"))
    ));
  }

  function ajouter(p, m, rafraichir) {
    var nom = el("input", { type: "text", placeholder: "Logo principal, gamme 2026, packaging 6 pièces…" });
    var selR = el("select", {});
    Object.keys(ROLES).forEach(function (k) {
      selR.appendChild(el("option", { value: k }, ROLES[k].nom + " — " + ROLES[k].quoi));
    });
    var note = el("input", { type: "text", placeholder: "Ce qu'il faut en savoir" });
    var apercu = el("div", { style: { "max-width": "190px", "margin-top": ".4rem" } });
    var donnee = null;

    PANNEAU.ouvrir("Ajouter un élément de marque", m ? m.nom : p.ref, el("div", {},
      UI.banniere("", "Un élément de marque sert partout : socle, cadrage, présentation, contrôle de conformité. C'est le seul endroit où on le pose."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom"), nom),
        el("div.champ", {}, el("label", {}, "Rôle"), selR),
        el("div.champ", {}, el("label", {}, "Note"), note),
        el("div.champ", {}, el("label", {}, "L'image"),
          el("button.b", { type: "button", onclick: function () {
            IMAGE.choisir(function (dd, ko) {
              if (!dd) { AVIS.refus("Image illisible."); return; }
              if (ko > 900) { AVIS.refus("Image trop lourde (" + ko + " Ko)."); return; }
              donnee = dd;
              O.vider(apercu).appendChild(IMAGE.vignette({ vignette: dd }, "carte"));
            });
          } }, "Choisir une image"), apercu)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!nom.value.trim()) { AVIS.refus("Un élément sans nom ne se retrouve pas."); return; }
          /* L'image part sur le disque avant d'entrer au dépôt : ce dernier ne
           * porte que son chemin. */
          IMAGE.ranger(donnee, function (chemin, refus) {
            if (donnee && !chemin) { AVIS.refus(refus); return; }
            DEPOT.ajoute("assets", { nom: nom.value.trim(), role: selR.value,
              marque: m ? m.id : null, vignette: chemin, note: note.value.trim(),
              source: "", droits: { zones: [], expire: null, cession: "" } });
            DEPOT.tracer("élément de marque", "assets", p.id, nom.value.trim());
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          });
        } }, "Ajouter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  return { ROLES: ROLES, role: role, de: de, toutes: toutes,
    assets: assets, assetsOrphelins: assetsOrphelins, logo: logo,
    sku: sku, skuParNom: skuParNom, visuelSku: visuelSku,
    pastille: pastille, bloc: bloc, blocGamme: blocGamme, detail: detail };
})();
