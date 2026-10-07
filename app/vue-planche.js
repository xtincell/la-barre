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
      { quoi: "Une référence commune", ok: KV.maitres(p).length > 0, poids: 5,
        cout: "aucun master commun : les adaptations n'ont pas de référence partagée" },
      { quoi: "Références à jour", ok: !g.kvs.some(function (l) { return REGLES.maitrePerime(p, l); }), poids: 5,
        cout: "Une référence a changé, manque ou forme une boucle. Le travail reste conservé, sa réception est à reprendre." },
      { quoi: "Contrôles renseignés", ok: nonConformes.length === 0, poids: 5,
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
        ? (nonConformes.length ? "Quels choix restent à vérifier ?" : "Contrôles renseignés — réception distincte")
        : "Aucun KV master",
      controles, null,
      [
        { nom: "Ajouter un KV", fort: !g.kvs.length,
          quand: function () { ajouter(p, rafraichir); } },
        g.kvs.length ? { nom: "Créer des formats", quand: function () { decliner(p, g, rafraichir); } } : null,
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
      el("div.plv-s", {}, "Le master porte les choix communs de la piste. Une adaptation ne porte que les différences d'un marché ; les formats peuvent venir directement du master."),
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
          el("span.plm-n", {}, r.kvs.length + " KV"
            + (r.statut ? " · " + r.statut : ""))
        ),
        el("div.pl-cases", {}, r.kvs.map(function (l) { return caseKV(p, l, rafraichir); }))
      );
    }));
  }

  function pistes(p, g) {
    var pistes = p.sections.pistes || [];
    var out = pistes.map(function (pi) {
      return { nom: pi.titre || "Piste sans titre", statut: pi.statut === "retenue" ? "retenue" : null,
        kvs: g.kvs.filter(function (l) { return l.pisteId === pi.id; }) };
    }).filter(function (r) { return r.kvs.length; });

    var orphelins = g.kvs.filter(function (l) {
      return !pistes.some(function (pi) { return pi.id === l.pisteId; });
    });
    if (orphelins.length) out.push({ nom: "Sans piste", statut: "rattachement manquant", kvs: orphelins });
    return out.length ? out : [{ nom: g.marques[0] || "Sans marque", kvs: g.kvs }];
  }

  /* Une case de planche est d'abord une image. Le reste s'y pose : le code
   * marché en haut, l'accroche en bas, et l'écart en une ligne. Le détail
   * s'ouvre, il ne s'étale pas. */
  function caseKV(p, l, rafraichir) {
    var m = DEPOT.trouve("marches", l.marche);
    var k = l.kv || {};
    var ecarts = KV.conformite(p, l).filter(function (c) { return !c.ok; })
      .sort(function (a, b) { return (b.poids || 0) - (a.poids || 0); });
    if (REGLES.maitrePerime(p, l)) ecarts.unshift({ quoi: "Référence à reprendre", cout: "Le parent ou un ancêtre a changé ou n'est plus disponible." });
    if (KV.estAdaptation(l) && !l.maitre) ecarts.unshift({ quoi: "Master non renseigné", cout: "Cet ancien KV reste conservé ; sa référence commune n'est pas établie." });
    var retours = ANNOT.ouvertes(l).length;
    var decl = KV.declinaisons(p, l.id).length;
    var mks = (l.mockups || []).length;

    return el("div.pl-c" + (ecarts.length ? ".ecart" : ".ok"), {},
      el("button.plc-visuel", { type: "button", title: l.nom,
        onclick: function () { detail(p, l, rafraichir); } },
        IMAGE.vignette(l, "planche"),

        el("span.plc-haut", {},
          el("span.plc-marche", {}, KV.estMaitre(l) ? "Maître" : (m ? m.code : "?")),
          el("span.plc-droite", {},
            retours ? el("span.plc-retours", {}, String(retours)) : null,
            ecarts.length ? null : el("span.plc-pastille.ok", {}, "✓"))
        ),

        el("span.plc-bas", {},
          el("span.plc-copy" + (k.copy ? "" : ".vide"), {}, k.copy || "Accroche non écrite"),
          el("span.plc-sous", {}, [
            KV.NIVEAUX[KV.niveau(l)].nom.toLowerCase(),
            O.langue(k.langue) || "langue ?",
            decl ? decl + (decl > 1 ? " formats" : " format") : "aucun format",
            mks ? mks + " en situation" : null,
          ].filter(Boolean).join(" · "))
        )
      ),

      /* Un « 3 » en pastille ne dit pas ce qui ne va pas. Les manquements se
       * nomment, et chacun dit combien de déclinaisons héritent de l'erreur —
       * c'est ce nombre-là qui décide si on corrige maintenant ou jamais. */
      ecarts.length
        ? el("div.plc-m", {},
            el("div.plcm-t", {}, ecarts.length
              + (ecarts.length > 1 ? " manquements" : " manquement")
              + (decl ? " · " + decl + (decl > 1 ? " formats en héritent" : " format en hérite")
                      : " · aucun format n'en hérite encore")),
            el("div.plcm-l", {}, ecarts.slice(0, 4).map(function (c) {
              return el("button.plcm", { type: "button", title: c.cout,
                onclick: function () { detail(p, l, rafraichir); } },
                el("span.plcm-q", {}, c.quoi),
                el("span.plcm-x", {}, c.cout));
            })),
            ecarts.length > 4
              ? el("button.b.nu", { type: "button",
                  onclick: function () { detail(p, l, rafraichir); } },
                  "Et " + (ecarts.length - 4) + " autres →")
              : null)
        : null,

      el("div.plc-gestes", {},
        el("button.b.nu", { type: "button", onclick: function () { detail(p, l, rafraichir); } }, "Régler"),
        el("button.b.nu", { type: "button", onclick: function () { ANNOT.ouvrir(p, l, rafraichir); } },
          retours ? retours + (retours > 1 ? " retours" : " retour") : "Annoter"),
        el("button.b.nu", { type: "button", onclick: function () { VUE_LIVRABLE.ouvrir(p, l, rafraichir); } }, "Le livrable"),
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
    return el("div.pl-densite.studio-statuts", { role: "group", "aria-label": "Densité de la planche" },
      ["dense", "moyen", "grand"].map(function (d) {
        return el("button.pld" + (DENSITE === d ? ".active" : ""), { type: "button",
          "aria-pressed": DENSITE === d ? "true" : "false",
          onclick: function () { DENSITE = d; rafraichir(); } }, d.charAt(0).toUpperCase() + d.slice(1));
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
        KV.estMaitre(l) && !l.marche ? "Les choix communs sont-ils renseignés ?" : "Ce KV est-il conforme à " + (m ? m.nom : "son marché") + " ?",
        ecarts, null, []));
    }
    dessiner();

    var f = FORM.rendre(KV.axes(p).map(function (a) {
      return { cle: a.cle, nom: a.nom, type: a.type === "choix" ? "texte" : a.type, aide: a.aide };
    }), k);

    PANNEAU.ouvrir(l.nom, m ? m.nom + " · " + (m.langues || []).map(O.langue).join(", ") : "", el("div", {},
      boite,
      KV.estMaitre(l) && !l.marche ? UI.banniere("", "Cette référence commune ne confirme aucun marché. Les contrôles de langue, distribution et mentions s'appliquent à chaque destination.") : m && (m.sku || []).length
        ? el("div.sousbloc", {},
            el("h3", {}, "Ce qui est distribué ici",
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
      el("div.sousbloc", {}, el("h3", {}, KV.estMaitre(l) && !l.marche ? "Les choix communs" : "La combinaison de ce marché"), f.noeud),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          FORM.appliquer(f, function () { return l.kv || {}; }, function (changements) {
            if (Object.keys(changements).length) {
              VERSION.ouvrir(l, "interne", "Correction du KV : " + Object.keys(changements).join(", "), null, { complet: true });
              l.kv = Object.assign({}, l.kv || {}, changements);
              l.nom = (KV.estMaitre(l) && !l.marche ? "KV master commun" : "KV · " + (m ? m.code : "?")) + (l.kv.marque ? " · " + l.kv.marque : "");
              DEPOT.tracer("modification", "kv", p.id, l.nom);
              DEPOT.enregistrer();
            }
            PANNEAU.fermer(); rafraichir();
          });
        } }, "Enregistrer"),
        el("button.b", { type: "button", onclick: function () {
          PANNEAU.fermer(); ANNOT.ouvrir(p, l, rafraichir);
        } }, "Annoter le visuel"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* ————————————————————— Ajouter, décliner ————————————————————— */

  function ajouter(p, rafraichir, piste, sur) {
    var maitres = KV.maitres(p).filter(function (l) { return !piste || l.pisteId === piste.id; });
    var selType = el("select", { "aria-label": "Niveau du KV" });
    selType.appendChild(el("option", { value: "maitre" }, "Master commun"));
    selType.appendChild(el("option", { value: "adaptation" }, "Adaptation marché"));
    selType.value = maitres.length ? "adaptation" : "maitre";
    var selBase = el("select", { "aria-label": "Master de référence" });
    maitres.forEach(function (l) { selBase.appendChild(el("option", { value: l.id }, l.nom + " · V" + (l.version || 1))); });
    var selM = el("select", { "aria-label": "Marché de destination" });
    selM.appendChild(el("option", { value: "" }, "Choisir un marché"));
    DEPOT.liste("marches").forEach(function (m) {
      selM.appendChild(el("option", { value: m.id }, m.nom + " · " + (m.langues || []).map(O.langue).join(", ")));
    });
    var champMarque = el("input", { type: "text", placeholder: "Bonnet Rouge, Peak, Belle Hollandaise…" });
    var commun = el("div", {},
      UI.banniere("", "Le master porte les choix communs. Il ne confirme ni marché ni réception client."),
      el("div.champ", {}, el("label", {}, "Marque"), champMarque));
    var selPiste = el("select", { "aria-label": "Piste du master" });
    selPiste.appendChild(el("option", { value: "" }, "Piste à renseigner"));
    (p.sections.pistes || []).forEach(function (pi) { selPiste.appendChild(el("option", { value: pi.id }, pi.titre || "Piste sans titre")); });
    var retenues = (p.sections.pistes || []).filter(function (pi) { return pi.statut === "retenue"; });
    selPiste.value = piste ? piste.id : retenues.length === 1 ? retenues[0].id : "";
    if (!piste) commun.appendChild(el("div.champ", {}, el("label", {}, "Piste du master"), selPiste));
    var adaptation = el("div", {},
      el("div.champ", {}, el("label", {}, "Master de référence"), selBase),
      el("div.champ", {}, el("label", {}, "Marché de destination"), selM),
      UI.banniere("", "Le contenu de cette version du master est repris comme point de départ. Les écarts se règlent ensuite, sans modifier le commun."));
    function afficher() { commun.hidden = selType.value !== "maitre"; adaptation.hidden = selType.value !== "adaptation"; }
    selType.addEventListener("change", afficher); afficher();
    var fermer = sur ? PANNEAU.fermerSur : PANNEAU.fermer;
    (sur ? PANNEAU.sur : PANNEAU.ouvrir)("Nouveau KV", piste ? piste.titre : "Commun, puis différences", el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Niveau du KV"), selType), commun, adaptation),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var base = selType.value === "adaptation" ? maitres.filter(function (l) { return l.id === selBase.value; })[0] : null;
          if (selType.value === "adaptation" && (!base || base.annule || !DEPOT.trouve("marches", selM.value))) {
            AVIS.refus("Choisir un master commun et un marché renseigné. Les anciens KV restent conservés."); return;
          }
          var l = KV.creer(p, selType.value === "adaptation" ? selM.value : null, base, selType.value);
          if (piste) { l.pisteId = piste.id; if (l.niveau === "maitre") l.responsable = piste.auteurDA || null; }
          else if (l.niveau === "maitre") l.pisteId = selPiste.value || null;
          if (l.niveau === "maitre") l.kv.marque = champMarque.value.trim();
          l.nom += l.kv.marque ? " · " + l.kv.marque : "";
          DEPOT.enregistrer(); fermer(); rafraichir();
        } }, "Créer"),
        el("button.b.nu", { type: "button", onclick: fermer }, "Annuler"))
    ));
  }

  /* Décliner : les formats naissent du KV, et le savent. */
  function decliner(p, g, rafraichir) {
    var selKV = el("select", { "aria-label": "KV de référence" });
    g.kvs.forEach(function (l) {
      var m = DEPOT.trouve("marches", l.marche);
      selKV.appendChild(el("option", { value: l.id }, l.nom + (m ? " · " + m.nom : "")));
    });
    var selM = el("select", { "aria-label": "Marché des formats" });
    selM.appendChild(el("option", { value: "" }, "Choisir un marché"));
    DEPOT.liste("marches").forEach(function (m) { selM.appendChild(el("option", { value: m.id }, m.nom)); });
    function destination() {
      var ref = g.kvs.filter(function (l) { return l.id === selKV.value; })[0];
      selM.disabled = !!(ref && ref.marche); selM.value = ref && ref.marche ? ref.marche : "";
    }
    selKV.addEventListener("change", destination); destination();
    var choix = coches(DEPOT.liste("supports").filter(function (s) { return s.type !== "kv"; }));

    PANNEAU.ouvrir("Décliner un KV", "les formats viennent après", el("div", {},
      UI.banniere("", "Chaque format créé porte ce KV comme maître. Si le KV repart en V2, ils basculent tous en « à regénérer » — et le nombre est écrit."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Le KV de référence"), selKV),
        el("div.champ", {}, el("label", {}, "Marché des formats"), selM),
        el("div.champ", {}, el("label", {}, "Les formats"), choix.noeud)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var maitre = (p.livrables || []).filter(function (x) { return x.id === selKV.value; })[0];
          if (!maitre || maitre.annule) { AVIS.refus("La référence n'est plus disponible."); return; }
          var marcheId = maitre.marche || selM.value;
          if (!DEPOT.trouve("marches", marcheId)) { AVIS.refus("Choisir le marché de destination ; le master reste commun."); return; }
          if (!choix.valeurs().length) { AVIS.refus("Choisir au moins un format."); return; }
          var faits = 0;
          choix.valeurs().forEach(function (sid) {
            var s = DEPOT.trouve("supports", sid);
            var points = {};
            MAISON.points.forEach(function (a) { points[a.cle] = "attente"; });
            p.livrables.push({
              id: O.id("L"), niveau: "declinaison", voletId: maitre.voletId, support: sid, marche: marcheId,
              nom: (s ? s.nom : "format") + " · " + (DEPOT.trouve("marches", marcheId) || {}).code,
              responsable: maitre.responsable, origine: "prevu", pisteId: maitre.pisteId,
              maitre: maitre.id, versionMaitre: maitre.version || 1, version: 1, versions: [],
              estime: null, reel: null, toursVendus: maitre.toursVendus,
              assets: [], entrees: [], annotations: [], mockups: [], points: points,
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

  return { rendre: rendre, caseKV: caseKV, ajouter: ajouter };
})();
