/* vue-referentiel.js — marchés, supports et gabarits, assets et droits.
 * Se remplit par l'usage : un gabarit s'enregistre la première fois qu'on
 * l'utilise, et sert ensuite pour toujours.
 */

window.VUE_REFERENTIEL = (function () {
  var el = O.el;

  /* Le référentiel comptait cent cinquante gestes cliquables sur six mille
   * pixels : chaque marché déroulait tous ses supports, y compris les douze
   * qui vont bien. Or un support dont le gabarit est renseigné n'appelle
   * rien — il se compte, il ne se lit pas. Seuls les gabarits manquants
   * restent dépliés : ce sont les seuls qui demandent un geste. */
  var deplies = {};
  var ciblages = new WeakMap();
  var collections = { marche: "marches", support: "supports", asset: "assets" };

  function rendre(hote, cible) {
    if (cible) ciblages.set(hote, cible);
    var marches = DEPOT.liste("marches");
    var supports = DEPOT.liste("supports");
    var assets = DEPOT.liste("assets");
    O.vider(hote);

    /* Trois piles de même poids disaient trois inventaires. Or le référentiel
     * est une hiérarchie : le marché gouverne la langue, les mentions, les
     * gabarits et le décideur local. Le support n'existe que servi sur un
     * marché — c'est le couple qui porte les dimensions, pas le support seul. */
    var usage = croisements();
    var ciblage = ciblages.get(hote);
    if (ciblage) {
      rendreCible(hote, ciblage, marches, usage, cible !== undefined);
      return;
    }

    hote.appendChild(el("div.rf-h", {},
      el("h2.rf-t", {}, phrase(marches, compterGabaritsManquants(), assets))));

    hote.appendChild(el("section.rf-b", {},
      el("div.rfb-t", {}, el("h3", {}, "Marchés"),
        el("span", {}, marches.length),
        el("button.b.nu", { type: "button",
          onclick: function () { editerMarche(null, hote); } }, "Ajouter un marché")),
      marches.length
        ? el("div.rf-l", {}, marches.map(function (m) {
            return blocMarche(m, usage, hote); }))
        : el("p.rien", {}, "Aucun marché renseigné.")));

    hote.appendChild(blocAssets(assets, hote));

    /* Les supports qu'aucun marché ne sert n'ont pas de place dans la
     * hiérarchie — mais ils existent, et les taire serait mentir. */
    var orphelins = supports.filter(function (s) {
      return !Object.keys(usage).some(function (k) { return k.split("|")[1] === s.id; });
    });
    if (orphelins.length) {
      hote.appendChild(el("section.rf-b", {},
        el("div.rfb-t", {}, el("h3", {}, "Supports jamais servis"),
          el("span", {}, orphelins.length + " sur " + supports.length),
          el("button.b.nu", { type: "button",
            onclick: function () { editerSupport(null, hote); } }, "Ajouter un support")),
        el("div.rf-chips", {}, orphelins.map(function (s) {
          return el("button.rf-chip", { type: "button", "data-resource-type": "support", "data-resource-id": s.id,
            onclick: function () { editerSupport(s, hote); } }, s.nom); }))));
    }
  }

  function rendreCible(hote, cible, marches, usage, focus) {
    var collection = Object.hasOwn(collections, cible.type) ? collections[cible.type] : null;
    var objet = collection && cible.id ? DEPOT.trouve(collection, cible.id) : null;
    var titre = el("h2.rf-t", { tabindex: "-1" }, objet ? objet.nom : "Ressource introuvable");
    hote.appendChild(el("div.pilotage-fiche", {},
      APP.retour("#/referentiel/marches"),
      titre));

    if (!objet) hote.appendChild(el("p.rien", {}, "Cette référence ne figure pas dans le dépôt ouvert."));
    else if (cible.type === "marche") hote.appendChild(blocMarche(objet, usage, hote));
    else if (cible.type === "asset") hote.appendChild(blocAssets([objet], hote, true));
    else {
      var marchesServis = marches.filter(function (m) { return usage[m.id + "|" + objet.id]; });
      hote.appendChild(el("section.rf-b", { "data-resource-type": "support", "data-resource-id": objet.id },
        el("div.rfb-t", {},
          el("h3", {}, "Gabarits par marché"),
          el("button.b.nu", { type: "button", onclick: function () { editerSupport(objet, hote); } }, "Modifier le support")),
        marchesServis.length ? el("ul", {}, marchesServis.map(function (m) {
          var g = (objet.gabarits || {})[m.id];
          return el("li", {},
            el("a", { href: "#/referentiel/marches/marche/" + encodeURIComponent(m.id) }, m.nom),
            " · " + (g ? g.dimensions || "Gabarit renseigné" : "Gabarit manquant"));
        })) : el("p.rien", {}, "Aucun marché n’utilise encore ce support.")));
    }
    if (focus) requestAnimationFrame(function () {
      if (titre.isConnected) titre.focus();
    });
  }

  /* L'état du référentiel en une phrase, avec sa conséquence. */
  function phrase(marches, manquants, assets) {
    var perimes = assets.filter(function (a) {
      return a.expire_le && new Date(a.expire_le) < new Date(); }).length;
    if (perimes) {
      return perimes + (perimes > 1 ? " assets ont des droits expirés" : " asset a des droits expirés");
    }
    if (manquants) return manquants + (manquants > 1 ? " gabarits manquants" : " gabarit manquant");
    if (!marches.length) return "Aucun marché servi pour l’instant";
    return marches.length + (marches.length > 1 ? " marchés servis" : " marché servi")
      + ", tous leurs gabarits renseignés";
  }

  /* Les couples support × marché réellement employés par les dossiers. C'est
   * l'usage qui fait le référentiel, pas une déclaration préalable. */
  function croisements() {
    var out = {};
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.marche || !l.support) return;
        var k = l.marche + "|" + l.support;
        if (!out[k]) out[k] = { marche: l.marche, support: l.support, n: 0, projets: {} };
        out[k].n++;
        out[k].projets[p.ref] = true;
      });
    });
    return out;
  }

  function blocMarche(m, usage, hote) {
    var siens = Object.keys(usage).filter(function (k) { return k.split("|")[0] === m.id; })
      .map(function (k) { return usage[k]; });
    var sansGabarit = siens.filter(function (c) {
      var s = DEPOT.trouve("supports", c.support);
      return !s || !(s.gabarits || {})[m.id];
    });
    var pieces = siens.reduce(function (n, c) { return n + c.n; }, 0);

    return el("div.rf-m", { "data-resource-type": "marche", "data-resource-id": m.id },
      el("button.rfm-h", { type: "button", onclick: function () { editerMarche(m, hote); } },
        el("span.rfm-code", {}, m.code),
        el("span.rfm-n", {}, m.nom),
        el("span.rfm-l", {}, (m.langues || []).map(O.langue).join(", ")
          + (m.zone ? " · " + m.zone : "")),
        el("span.rfm-q", {}, pieces
          ? pieces + (pieces > 1 ? " livrables" : " livrable") + " sur " + siens.length
            + (siens.length > 1 ? " supports" : " support")
          : "Aucun livrable à ce jour")),

      /* Les mentions obligatoires sont une responsabilité de marché : leur
       * absence ne se voit qu'à l'impression, et coûte un rappel. */
      (m.mentions && m.mentions.length)
        ? el("div.rfm-x", {}, m.mentions.length
            + (m.mentions.length > 1 ? " mentions obligatoires" : " mention obligatoire"))
        : el("div.rfm-x.manque", {}, el("span.rf-signe", { "aria-hidden": "true" }, "◐ "),
            "Mentions obligatoires à renseigner"),
      m.note ? el("div.rfm-x.manque", {}, el("span.rf-signe", { "aria-hidden": "true" }, "◐ "), m.note) : null,

      supports_(m, siens, hote),

      sansGabarit.length
        ? el("div.rfm-c", {}, el("span.rf-signe", { "aria-hidden": "true" }, "● "), sansGabarit.length
            + (sansGabarit.length > 1 ? " gabarits manquants" : " gabarit manquant"))
        : null
    );
  }

  /* Cent dix-neuf cartes de support, dont cent dix-huit sans gabarit.
   *
   * Ma première idée était de replier ce qui va bien : sur ce dépôt, ça ne
   * cachait rien. La densité n'est pas décorative ici, c'est cent dix-huit
   * manques réels — et les répéter à plat ne les fait pas traiter, ça les
   * rend illisibles. On replie donc par marché : seize lignes qui disent
   * chacune ce qu'elles contiennent, et on ouvre celui qu'on renseigne. */
  function supports_(m, siens, hote) {
    if (!siens.length) {
      return el("p.rf-p", {}, "Aucun support utilisé sur ce marché.");
    }
    var tries = siens.slice().sort(function (a, b) { return b.n - a.n; });
    function gabaritDe(c) {
      var s = DEPOT.trouve("supports", c.support);
      return s ? (s.gabarits || {})[m.id] : null;
    }
    var manquent = tries.filter(function (c) { return !gabaritDe(c); }).length;
    var ouvert = deplies[m.id] === true;

    return el("details", { open: ouvert, ontoggle: function (e) { deplies[m.id] = e.currentTarget.open; } },
      el("summary.rf-plus" + (manquent ? ".manque" : ""), {},
        tries.length + (tries.length > 1 ? " supports" : " support")
          + (manquent ? " · " + manquent + " sans gabarit" : "")),

      el("div.rf-sup", {}, tries.map(function (c) {
            var s = DEPOT.trouve("supports", c.support);
            var g = gabaritDe(c);
            return el("button.rf-s" + (g ? "" : ".manque"), { type: "button",
              "data-resource-type": "support", "data-resource-id": c.support,
              disabled: !s,
              onclick: function () { editerSupport(s, hote); },
              title: Object.keys(c.projets).join(", ") },
              el("span.rfs-n", {}, s ? s.nom : c.support),
              el("span.rfs-q", {}, c.n + (c.n > 1 ? " livrables" : " livrable")),
              el("span.rfs-g", {}, g ? (g.dimensions || "Gabarit renseigné")
                : [el("span.rf-signe", { "aria-hidden": "true" }, "◐ "), "Gabarit manquant"]));
          }))
    );
  }

  /* Les droits en troisième, et ce qui expire d'abord. Un asset dont la
   * licence tombe avant la fin de diffusion est un incident déjà écrit. */
  function blocAssets(assets, hote, fiche) {
    var aujourdhui = new Date();
    var classes = assets.slice().sort(function (a, b) {
      var x = a.expire_le ? new Date(a.expire_le) : new Date(8640000000000000);
      var y = b.expire_le ? new Date(b.expire_le) : new Date(8640000000000000);
      return x - y;
    });

    return el("section.rf-b", {},
      el("div.rfb-t", {}, el("h3", {}, "Droits des fichiers"),
        fiche ? null : el("span", {}, assets.length),
        fiche ? null : el("button.b.nu", { type: "button",
          onclick: function () { editerAsset(null, hote); } }, "Ajouter un fichier")),

      classes.length
        ? el("div.rf-a", {}, classes.map(function (a) {
            var exp = a.expire_le ? new Date(a.expire_le) : null;
            var perime = exp && exp < aujourdhui;
            var bientot = exp && !perime
              && (exp - aujourdhui) / 86400000 < 90;
            return el("button.rf-as" + (perime ? ".perime" : bientot ? ".bientot" : ""),
              { type: "button", onclick: function () { editerAsset(a, hote); },
                "data-resource-type": "asset", "data-resource-id": a.id },
              el("span.rfa-n", {}, a.nom),
              el("span.rfa-s", {}, a.source ? "Source : " + a.source : "Source non renseignée"),
              el("span.rfa-z", {}, a.zones && a.zones.length
                ? "Zones déclarées : " + a.zones.join(", ") : "Aucune zone déclarée"),
              fiche ? el("span.rfa-s", {}, "Licence : " + (a.licence || "non renseignée")) : null,
              fiche ? el("span.rfa-s", {}, "Usage commercial : " + (a.commercial || "non renseigné")) : null,
              fiche ? el("span.rfa-s", {}, a.master ? "Original référencé" : "Original non renseigné") : null,
              exp
                ? el("span.rfa-e", {}, perime || bientot ? el("span.rf-signe", { "aria-hidden": "true" }, perime ? "● " : "◐ ") : null, perime
                    ? "Droits expirés le " + O.joli(a.expire_le)
                    : bientot
                      ? "Expire le " + O.joli(a.expire_le) + " — dans "
                        + Math.round((exp - aujourdhui) / 86400000) + " jours"
                      : "Jusqu'au " + O.joli(a.expire_le))
                : el("span.rfa-e.manque", {}, el("span.rf-signe", { "aria-hidden": "true" }, "◐ "), "Échéance des droits non renseignée"));
          }))
        : el("p.rien", {}, "Aucun fichier renseigné.")
    );
  }

  function compterGabaritsManquants() {
    var n = 0;
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) {
        var s = DEPOT.trouve("supports", l.support);
        if (!s) return;
        if (!(s.gabarits || {})[l.marche]) n++;
      });
    });
    return n;
  }

  /* ————— Édition ————— */

  function editerMarche(m, hote) {
    var champs = [
      { cle: "nom", nom: "Nom", type: "texte", requis: true },
      { cle: "code", nom: "Code", type: "texte", requis: true, aide: "CM, CI, GH…" },
      { cle: "langues", nom: "Langues", type: "puces", aide: "Une par ligne : fr, en…" },
      { cle: "zone", nom: "Zone", type: "texte" },
      { cle: "mentions", nom: "Mentions obligatoires", type: "puces", aide: "Par secteur. Elles ne sont pas les mêmes d'un pays à l'autre." },
      { cle: "feries", nom: "Fenêtres interdites", type: "puces", aide: "Jours fériés, périodes à éviter." },
      { cle: "decideur", nom: "Décideur local", type: "texte" },
      { cle: "delai", nom: "Délai de retour habituel", type: "texte" },
    ];
    var f = FORM.rendre(champs, m || {});
    PANNEAU.ouvrir(m ? "Marché — " + m.nom : "Nouveau marché", "", el("div", {},
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            var d = f.valeurs();
            if (m) DEPOT.modifie("marches", m.id, d, d.nom); else DEPOT.ajoute("marches", d);
            PANNEAU.fermer(); rendre(hote);
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  function editerSupport(s, hote) {
    var champs = [
      { cle: "nom", nom: "Nom", type: "texte", requis: true },
      { cle: "code", nom: "Code", type: "texte" },
      { cle: "type", nom: "Type", type: "texte", aide: "film, print, social, web…" },
    ];
    var f = FORM.rendre(champs, s || {});
    var boiteG = el("div");

    if (s) {
      DEPOT.liste("marches").forEach(function (m) {
        var g = (s.gabarits || {})[m.id] || {};
        boiteG.appendChild(el("div.ligne", {},
          el("span.etiq", {}, m.code),
          el("span.val" + (g.dimensions ? "" : ".vide"), {},
            g.dimensions ? g.dimensions + (g.fournisseur ? " · " + g.fournisseur : "") : "gabarit non renseigné")
        ));
      });
      boiteG.appendChild(el("div.form-actions", {},
        el("button.b", { type: "button", onclick: function () { editerGabarit(s, hote); } }, "Renseigner un gabarit")
      ));
    }

    PANNEAU.ouvrir(s ? "Support — " + s.nom : "Nouveau support", "", el("div", {},
      f.noeud,
      s ? PANNEAU.sousbloc("Gabarits par marché", boiteG) : null,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            var d = f.valeurs();
            if (s) DEPOT.modifie("supports", s.id, d, d.nom); else DEPOT.ajoute("supports", d);
            PANNEAU.fermer(); rendre(hote);
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  function editerGabarit(s, hote) {
    var selM = el("select", {});
    DEPOT.liste("marches").forEach(function (m) { selM.appendChild(el("option", { value: m.id }, m.nom)); });
    var champs = [
      { cle: "dimensions", nom: "Dimensions", type: "texte", aide: "En cm ou en pixels, telles qu'elles sont exigées." },
      { cle: "fondPerdu", nom: "Fond perdu", type: "texte" },
      { cle: "resolution", nom: "Résolution", type: "texte" },
      { cle: "profil", nom: "Profil colorimétrique", type: "texte" },
      { cle: "contraintes", nom: "Contraintes", type: "long" },
      { cle: "fournisseur", nom: "Fournisseur", type: "texte" },
      { cle: "delaiRemise", nom: "Délai de remise fichier", type: "texte" },
    ];
    var f = FORM.rendre(champs, {});
    PANNEAU.ouvrir("Gabarit — " + s.nom, "une fois pour toutes", el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Renseigné une fois, il sert à tous les projets suivants sur ce marché."),
      el("div.champ", {}, el("label", {}, "Marché"), selM),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            if (!s.gabarits) s.gabarits = {};
            s.gabarits[selM.value] = f.valeurs();
            DEPOT.tracer("gabarit", "supports", s.id, s.nom);
            DEPOT.enregistrer(); PANNEAU.fermer(); rendre(hote);
          },
        }, "Enregistrer le gabarit"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  function editerAsset(a, hote) {
    var champs = [
      { cle: "nom", nom: "Nom", type: "texte", requis: true },
      { cle: "source", nom: "Source", type: "texte", aide: "Outil et version, banque d'images, production interne." },
      { cle: "prompt", nom: "Prompt ou référence", type: "long" },
      { cle: "licence", nom: "Licence", type: "texte" },
      { cle: "commercial", nom: "Usage commercial autorisé", type: "texte", aide: "oui / non / sous conditions" },
      { cle: "zones", nom: "Zones autorisées", type: "puces", aide: "Codes marché, une par ligne. Vide = aucune limite déclarée." },
      { cle: "expire_le", nom: "Expiration des droits", type: "date" },
      { cle: "master", nom: "Lien vers le master", type: "texte" },
    ];
    var f = FORM.rendre(champs, a || {});
    PANNEAU.ouvrir(a ? "Asset — " + a.nom : "Nouvel asset", "droits", el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Un asset utilisé hors de ses zones ou après expiration est signalé sur chaque livrable concerné."),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            var d = f.valeurs();
            if (a) DEPOT.modifie("assets", a.id, d, d.nom); else DEPOT.ajoute("assets", d);
            PANNEAU.fermer(); rendre(hote);
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ));
  }

  return { rendre: rendre, titre: "Référentiel" };
})();
