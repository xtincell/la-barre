/* vue-planche.js — la planche des KV par marché.
 *
 * Ce n'est pas un objectif, c'est une vue : quatorze visuels côte à côte, comme
 * sur l'artboard. La différence avec la planche imprimée, c'est qu'ici chaque
 * case sait si elle est conforme à son marché — la langue, le SKU, l'accroche,
 * les mentions. Une planche papier ne dit jamais qu'un SKU n'est pas distribué
 * au Ghana.
 */

window.VUE_PLANCHE = (function () {
  var el = O.el;

  function rendre(p, rafraichir) {
    var g = KV.grille(p);
    var nonConformes = g.kvs.filter(function (l) { return !KV.conforme(p, l); });
    var sansVisuel = g.kvs.filter(function (l) { return !l.vignette; });
    var retours = g.kvs.reduce(function (t, l) { return t + ANNOT.ouvertes(l).length; }, 0);

    return el("div.pl", {},
      bande(p, g, nonConformes, sansVisuel, retours, rafraichir),
      g.kvs.length ? tete(rafraichir) : null,
      g.kvs.length ? grille(p, g, rafraichir) : vide(p, rafraichir)
    );
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(p, g, nonConformes, sansVisuel, retours, rafraichir) {
    var pire = KV.pireEcart(p);
    var controles = [
      { quoi: "Un KV par marché", ok: g.kvs.length > 0, poids: 5,
        cout: "aucun visuel maître : les formats n'ont rien à décliner" },
      { quoi: "Conformes au marché", ok: nonConformes.length === 0, poids: 5,
        cout: pire ? pire.l.nom + " — " + pire.cout
          + (nonConformes.length > 2 ? "  ·  et " + (nonConformes.length - 1) + " autres en écart"
            : nonConformes.length === 2 ? "  ·  et un autre en écart" : "")
          : "" },
      { quoi: "Visuels posés", ok: sansVisuel.length === 0, poids: 3,
        cout: sansVisuel.length + " sans image : rien à montrer en séance" },
      { quoi: "Retours traités", ok: retours === 0, poids: 4,
        cout: retours + (retours > 1 ? " retours ouverts" : " retour ouvert") + " sur les KV" },
    ];

    return UI.recevabilite(
      g.kvs.length
        ? (nonConformes.length ? "Ces KV sont-ils conformes à leurs marchés ?" : "Les KV tiennent")
        : "Aucun KV master",
      controles, null,
      [
        { nom: "Ajouter un KV", fort: !g.kvs.length,
          quand: function () { ajouter(p, rafraichir); } },
        g.kvs.length ? { nom: "Décliner un marché", quand: function () { decliner(p, g, rafraichir); } } : null,
        { nom: "Imprimer la planche", doux: true, quand: function () { window.print(); } },
      ].filter(Boolean));
  }

  function tete(rafraichir) {
    return el("div.pl-tete", {}, reglette(rafraichir));
  }

  function vide(p, rafraichir) {
    return el("div.pl-vide", {},
      UI.icone("projets", 28),
      el("div.plv-t", {}, "La planche est vide."),
      el("div.plv-s", {}, "Un KV master par marché, avant les formats. Chacun porte sa marque, son accroche, sa langue, ses SKU et les choix de direction artistique."),
      el("button.b.or", { type: "button", onclick: function () { ajouter(p, rafraichir); } }, "Poser le premier KV")
    );
  }

  /* ————————————————————— La grille ————————————————————— */

  /* Les lignes de la planche portent ce qui distingue les KV entre eux : les
   * marques quand il y en a plusieurs, sinon les pistes. Une planche à une
   * seule ligne ne dit rien. */
  function grille(p, g, rafraichir) {
    var parRoute = g.marques.length < 2;
    var lignes = parRoute ? pistes(p, g) : g.marques.map(function (marque) {
      return { nom: marque, kvs: g.kvs.filter(function (l) {
        return ((l.kv || {}).marque || "sans marque") === marque; }) };
    });

    return el("div.pl-grille." + DENSITE, {}, lignes.map(function (r) {
      return el("div.pl-marque", {},
        el("div.plm-tete", {},
          el("span.plm-nom", {}, r.nom),
          el("span.plm-n", {}, r.kvs.length + (r.kvs.length > 1 ? " marchés" : " marché")
            + (r.statut ? " · " + r.statut : ""))
        ),
        el("div.pl-cases", {}, r.kvs.map(function (l) { return caseKV(p, l, rafraichir); }))
      );
    }));
  }

  function pistes(p, g) {
    var pistes = p.sections.pistes || [];
    var out = pistes.map(function (pi) {
      return { nom: pi.titre || "piste sans titre", statut: pi.statut === "retenue" ? "retenue" : null,
        kvs: g.kvs.filter(function (l) { return l.pisteId === pi.id; }) };
    }).filter(function (r) { return r.kvs.length; });

    var orphelins = g.kvs.filter(function (l) {
      return !pistes.some(function (pi) { return pi.id === l.pisteId; });
    });
    if (orphelins.length) out.push({ nom: "Sans piste", statut: "rattachement manquant", kvs: orphelins });
    return out.length ? out : [{ nom: g.marques[0] || "sans marque", kvs: g.kvs }];
  }

  /* Une case de planche est d'abord une image. Le reste s'y pose : le code
   * marché en haut, l'accroche en bas, et l'écart en une ligne. Le détail
   * s'ouvre, il ne s'étale pas. */
  function caseKV(p, l, rafraichir) {
    var m = DEPOT.trouve("marches", l.marche);
    var k = l.kv || {};
    var ecarts = KV.conformite(p, l).filter(function (c) { return !c.ok; })
      .sort(function (a, b) { return (b.poids || 0) - (a.poids || 0); });
    var retours = ANNOT.ouvertes(l).length;
    var decl = KV.declinaisons(p, l.id).length;
    var mks = (l.mockups || []).length;

    return el("div.pl-c" + (ecarts.length ? ".ecart" : ".ok"), {},
      el("button.plc-visuel", { type: "button", title: l.nom,
        onclick: function () { detail(p, l, rafraichir); } },
        IMAGE.vignette(l, "planche"),

        el("span.plc-haut", {},
          el("span.plc-marche", {}, KV.estMaitre(l) ? "MAÎTRE" : (m ? m.code : "?")),
          el("span.plc-droite", {},
            retours ? el("span.plc-retours", {}, String(retours)) : null,
            ecarts.length ? null : el("span.plc-pastille.ok", {}, "✓"))
        ),

        el("span.plc-bas", {},
          el("span.plc-copy" + (k.copy ? "" : ".vide"), {}, k.copy || "accroche non écrite"),
          el("span.plc-sous", {}, [
            KV.NIVEAUX[KV.niveau(l)].nom.toLowerCase(),
            O.langue(k.langue) || "langue ?",
            decl ? decl + (decl > 1 ? " formats" : " format") : "aucun format",
            mks ? mks + " en situation" : null,
          ].filter(Boolean).join("  ·  "))
        )
      ),

      /* Un « 3 » en pastille ne dit pas ce qui ne va pas. Les manquements se
       * nomment, et chacun dit combien de déclinaisons héritent de l'erreur —
       * c'est ce nombre-là qui décide si on corrige maintenant ou jamais. */
      ecarts.length
        ? el("div.plc-m", {},
            el("div.plcm-t", {}, ecarts.length
              + (ecarts.length > 1 ? " manquements" : " manquement")
              + (decl ? "  ·  " + decl + (decl > 1 ? " formats en héritent" : " format en hérite")
                      : "  ·  aucun format n'en hérite encore")),
            el("div.plcm-l", {}, ecarts.slice(0, 4).map(function (c) {
              return el("button.plcm", { type: "button", title: c.cout,
                onclick: function () { detail(p, l, rafraichir); } },
                el("span.plcm-q", {}, c.quoi),
                el("span.plcm-x", {}, c.cout));
            })),
            ecarts.length > 4
              ? el("button.b.nu", { type: "button",
                  onclick: function () { detail(p, l, rafraichir); } },
                  "et " + (ecarts.length - 4) + " autres →")
              : null)
        : null,

      el("div.plc-gestes", {},
        el("button.b.nu", { type: "button", onclick: function () { detail(p, l, rafraichir); } }, "régler"),
        el("button.b.nu", { type: "button", onclick: function () { ANNOT.ouvrir(p, l, rafraichir); } },
          retours ? retours + (retours > 1 ? " retours" : " retour") : "annoter"),
        el("button.b.nu", { type: "button", onclick: function () { VUE_LIVRABLE.ouvrir(p, l, rafraichir); } }, "le livrable"),
        IMAGE.bouton(l, rafraichir)
      )
    );
  }

  function axe(valeur, nom) {
    return el("span.plc-a" + (valeur ? "" : ".vide"), { title: nom }, valeur || nom + " ?");
  }

  /* Trois densités : la planche se lit de loin ou de près. */
  var DENSITE = "moyen";
  function reglette(rafraichir) {
    return el("div.pl-densite", {}, ["dense", "moyen", "grand"].map(function (d) {
      return el("button.pld" + (DENSITE === d ? ".actif" : ""), { type: "button",
        onclick: function () { DENSITE = d; rafraichir(); } }, d);
    }));
  }

  /* ————————————————————— Régler un KV ————————————————————— */

  function detail(p, l, rafraichir) {
    var k = Object.assign({}, l.kv || {});
    var m = DEPOT.trouve("marches", l.marche);
    var boite = el("div");

    function dessiner() {
      O.vider(boite);
      var ecarts = KV.conformite(p, Object.assign({}, l, { kv: k }));
      boite.appendChild(UI.recevabilite(
        "Ce KV est-il conforme à " + (m ? m.nom : "son marché") + " ?",
        ecarts, null, []));
    }
    dessiner();

    var f = FORM.rendre(KV.axes(p).map(function (a) {
      return { cle: a.cle, nom: a.nom, type: a.type === "choix" ? "texte" : a.type, aide: a.aide };
    }), k);

    PANNEAU.ouvrir(l.nom, m ? m.nom + " · " + (m.langues || []).map(O.langue).join(", ") : "", el("div", {},
      boite,
      m && (m.sku || []).length
        ? el("div.sousbloc", {},
            el("h3", {}, "CE QUI EST DISTRIBUÉ ICI",
              el("span.droite", {}, m.sku.length + " SKU")),
            el("div.mq-sku", {}, m.sku.map(function (nom) {
              var v = MARQUE.visuelSku(nom);
              var montre = ((l.kv || {}).sku || []).indexOf(nom) !== -1;
              return el("div.mq-s" + (montre ? ".montre" : ""), {},
                v ? IMAGE.vignette(v, "planche") : el("div.mqs-sans", {}, "aucun visuel"),
                el("div.mqs-c", {},
                  el("div.mqs-n", {}, nom),
                  el("div.mqs-m" + (montre ? ".vert" : ""), {},
                    montre ? "montré par ce KV" : "non montré")));
            })))
        : UI.banniere("", "Le référentiel ne dit pas quels SKU sont distribués sur ce marché. Sans cette liste, on ne peut pas vérifier ce que le KV montre."),
      el("div.sousbloc", {}, el("h3", {}, "LA COMBINAISON DE CE MARCHÉ"), f.noeud),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          l.kv = f.valeurs();
          l.nom = "KV · " + (m ? m.code : "?") + (l.kv.marque ? " · " + l.kv.marque : "");
          DEPOT.tracer("modification", "kv", p.id, l.nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer"),
        el("button.b", { type: "button", onclick: function () {
          PANNEAU.fermer(); ANNOT.ouvrir(p, l, rafraichir);
        } }, "Annoter le visuel"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* ————————————————————— Ajouter, décliner ————————————————————— */

  function ajouter(p, rafraichir) {
    var selM = el("select", {});
    DEPOT.liste("marches").forEach(function (m) {
      selM.appendChild(el("option", { value: m.id }, m.nom + " · " + (m.langues || []).map(O.langue).join(", ")));
    });
    var champMarque = el("input", { type: "text", placeholder: "Bonnet Rouge, Peak, Belle Hollandaise…" });
    var base = KV.tous(p)[0] || null;

    PANNEAU.ouvrir("Nouveau KV master", "un par marché", el("div", {},
      UI.banniere("", "Le KV vient avant les formats. Une fois posé, il se décline — et toute reprise du KV périme ses déclinaisons."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Marché"), selM),
        el("div.champ", {}, el("label", {}, "Marque"),
          el("div.indice", {}, "Une planche peut porter plusieurs marques — c'est ce qui fait ses lignes."), champMarque)),
      base ? UI.banniere("vert", "La combinaison du premier KV sera reprise comme point de départ : accroche, SKU, enfant, métier. À ajuster ensuite.") : null,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var l = KV.creer(p, selM.value, base);
          l.kv.marque = champMarque.value.trim() || (base && base.kv ? base.kv.marque : "");
          l.nom = "KV · " + (DEPOT.trouve("marches", selM.value) || {}).code + (l.kv.marque ? " · " + l.kv.marque : "");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Créer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* Décliner : les formats naissent du KV, et le savent. */
  function decliner(p, g, rafraichir) {
    var selKV = el("select", {});
    g.kvs.forEach(function (l) {
      var m = DEPOT.trouve("marches", l.marche);
      selKV.appendChild(el("option", { value: l.id }, l.nom + (m ? " · " + m.nom : "")));
    });
    var choix = coches(DEPOT.liste("supports").filter(function (s) { return s.type !== "kv"; }));

    PANNEAU.ouvrir("Décliner un KV", "les formats viennent après", el("div", {},
      UI.banniere("", "Chaque format créé porte ce KV comme maître. Si le KV repart en V2, ils basculent tous en « à regénérer » — et le nombre est écrit."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Le KV master"), selKV),
        el("div.champ", {}, el("label", {}, "Les formats"), choix.noeud)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var maitre = (p.livrables || []).filter(function (x) { return x.id === selKV.value; })[0];
          if (!maitre) return;
          var faits = 0;
          choix.valeurs().forEach(function (sid) {
            var s = DEPOT.trouve("supports", sid);
            var axes = {};
            MAISON.axes.forEach(function (a) { axes[a.cle] = "attente"; });
            p.livrables.push({
              id: O.id("L"), voletId: maitre.voletId, support: sid, marche: maitre.marche,
              nom: (s ? s.nom : "format") + " · " + (DEPOT.trouve("marches", maitre.marche) || {}).code,
              responsable: maitre.responsable, origine: "prevu", pisteId: maitre.pisteId,
              maitre: maitre.id, versionMaitre: maitre.version || 1, version: 1, versions: [],
              estime: null, reel: null, toursVendus: maitre.toursVendus,
              assets: [], entrees: [], annotations: [], mockups: [], axes: axes,
            });
            faits++;
          });
          DEPOT.tracer("déclinaison", "kv", p.id,
            faits + (faits > 1 ? " formats" : " format") + " depuis " + maitre.nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Décliner"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function coches(liste) {
    var sel = [];
    var boite = el("div", { style: { display: "grid", gap: ".2rem" } });
    liste.forEach(function (x) {
      var b = el("button.axe", { type: "button",
        style: { "text-align": "left", padding: ".3rem .5rem", "font-size": "var(--t-eti)" },
        onclick: function () {
          var i = sel.indexOf(x.id);
          if (i === -1) sel.push(x.id); else sel.splice(i, 1);
          b.className = "axe" + (sel.indexOf(x.id) !== -1 ? " pret" : "");
        } }, x.nom);
      boite.appendChild(b);
    });
    return { noeud: boite, valeurs: function () { return sel; } };
  }

  return { rendre: rendre, caseKV: caseKV };
})();
