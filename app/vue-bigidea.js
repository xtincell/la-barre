/* vue-bigidea.js — l'idée.
 *
 * Elle est à moi : la question n'est pas « qu'est-ce qu'elle dit » mais
 * « est-elle opposable ». Une idée sans critères écrits ne permet de refuser
 * aucun travail en aval — et ça se chiffre en livrables.
 */

window.VUE_BIGIDEA = (function () {
  var el = O.el;


  /* Tous les champs de cette section, éditables un par un. La vue au-dessus
   * les met en scène ; ici on les corrige sans rouvrir tout le formulaire. */
  function champsEditables(p, rafraichir) {
    var def = CHAMPS.section("bigidea");
    if (!def) return null;
    return el("div.se-champs", {},
      el("div.sec-t", {}, "TOUS LES CHAMPS", el("span", {}, def.champs.length)),
      FORM.lire(def.champs, p.sections["bigidea"] || {},
        { projet: p, section: "bigidea",
          editer: function (k) { VUE_PROJETS.editerChamp(p, "bigidea", k, rafraichir); } }));
  }

  function rendre(p, rafraichir) {
    var b = p.sections.bigidea || {};
    var socle = p.sections.socle || {};
    var r = opposabilite(p, b, socle);

    /* L'idée est la plus grosse chose à l'écran, et elle passe devant ses
     * conditions : on juge une idée, puis on regarde si elle est opposable —
     * pas l'inverse. Les routes ont leur écran ; les répéter ici, c'est faire
     * juger la big idea sur ses exécutions. */
    return el("div.bi", {},
      idee(p, b, socle),
      bandeOpposable(p, b, r, rafraichir),
      atelier(p, rafraichir)
    ,
      champsEditables(p, rafraichir));
  }

  /* ————————————————————— La question : est-elle opposable ? ————————————————————— */

  function opposabilite(p, b, socle) {
    var enUnePhrase = b.idee && b.idee.split(/[.!?]/).filter(function (x) { return x.trim(); }).length <= 1;
    var livrables = (p.livrables || []).filter(function (l) { return !l.annule; }).length;

    var controles = [
      { quoi: "Critères d'acceptation", ok: !!(b.criteres || []).length, poids: 5,
        cout: livrables + " livrables ne pourront être refusés que par goût" },
      { quoi: "Auteur nommé", ok: !!b.auteur, poids: 4, cout: REGLES.prix("auteur-absent") },
      { quoi: "Une seule phrase", ok: !!enUnePhrase, poids: 3,
        cout: "au-delà d'une phrase, l'idée est refusable — §8" },
      { quoi: "Mécanique hors média", ok: !!b.mecanique, poids: 3,
        cout: "une mécanique lisible dans un seul média est refusable" },
      { quoi: "Rattachement au socle", ok: !!b.rattachement, poids: 2,
        cout: socle.idee_directrice ? "l'écart au socle n'est pas justifié" : REGLES.prix("socle-absent") },
      { quoi: "Condition de validité", ok: !!b.validite, poids: 2,
        cout: "sans elle, la plateforme est refusable" },
      { quoi: "Signature", ok: !!b.signature, poids: 1 },
    ];

    return { controles: controles, livrables: livrables,
      opposable: controles.every(function (c) { return c.ok; }) };
  }

  function bandeOpposable(p, b, r, rafraichir) {
    var manques = r.controles.filter(function (c) { return !c.ok; });
    var prix = null;   /* la bande choisit la conséquence la plus lourde */

    var gestes = [
      { nom: manques.length ? "Compléter l'idée" : "Modifier l'idée", fort: !!manques.length,
        quand: function () { VUE_PROJETS.editerSection(p, "bigidea", rafraichir); } },
    ];
    if (!b.auteur) {
      gestes.push({ nom: "Nommer l'auteur", quand: function () { nommer(p, b, rafraichir); } });
    }
    if (!(b.criteres || []).length) {
      gestes.push({ nom: "Écrire les critères", quand: function () { critereRapide(p, b, rafraichir); } });
    }
    gestes.push({ nom: "Séance de concept", doux: true, quand: function () { VUE_PISTES.seance(p, rafraichir); } });

    return UI.recevabilite(
      b.idee ? (r.opposable ? "Cette idée est opposable" : "Cette idée est-elle opposable ?")
             : "Aucune idée écrite",
      r.controles, prix, gestes);
  }

  /* Le geste le plus utile de cet écran : écrire les critères manquants. */
  function critereRapide(p, b, rafraichir) {
    var lignes = [];
    var boite = el("div.oc-motifs");
    var champ = el("input", { type: "text", placeholder: "un critère, une ligne — entrée pour l'ajouter" });

    function dessiner() {
      O.vider(boite);
      lignes.forEach(function (l, i) {
        boite.appendChild(el("button.oc-m", { type: "button", onclick: function () {
          lignes.splice(i, 1); dessiner();
        } }, l + "   ✕"));
      });
      if (!lignes.length) boite.appendChild(el("p.rien", {}, "Aucun critère. Sans eux, aucun refus n'est opposable."));
    }
    dessiner();
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && champ.value.trim()) { lignes.push(champ.value.trim()); champ.value = ""; dessiner(); }
    });

    PANNEAU.ouvrir("Les critères d'acceptation", "les seuls éléments opposables", el("div", {},
      UI.banniere("", "Ce sont eux — et eux seuls — qu'on pourra opposer au travail du DA. Tout le reste est du goût."),
      el("div.sousbloc", {}, el("h3", {}, "CE QUE J'EXIGE"), boite, champ),
      el("div.form-actions", { style: { "margin-top": "1rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          if (!lignes.length) { alert("Au moins un critère."); return; }
          b.criteres = (b.criteres || []).concat(lignes);
          if (!p.sections.bigidea) p.sections.bigidea = b;
          DEPOT.tracer("critères", "projets", p.id, lignes.length + " critères écrits");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Écrire"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function nommer(p, b, rafraichir) {
    var juniors = DEPOT.liste("personnes").filter(function (x) { return x.seniorite === "junior"; });
    PANNEAU.ouvrir("Qui a eu cette idée ?", "constaté, pas attribué", el("div", {},
      juniors.length
        ? UI.banniere("", "Nommer un junior fait avancer ton objectif — il est à "
            + (OBJECTIFS.tous().filter(function (o) { return o.cle === "juniors"; })[0] || {}).reel + ".")
        : null,
      el("div.affect", {}, DEPOT.liste("personnes").map(function (x) {
        return el("button.affect-l", { type: "button", onclick: function () {
          b.auteur = x.id;
          DEPOT.tracer("auteur", "projets", p.id, "idée attribuée à " + x.nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } },
          UI.avatar(x, 30),
          el("div.a-corps", {},
            el("div.a-nom", {}, x.nom, x.seniorite === "junior" ? UI.eti("junior", "or") : null),
            el("div.a-air", {}, O.poste(x.poste).nom)));
      }))
    ));
  }

  /* ————————————————————— L'idée ————————————————————— */

  function idee(p, b, socle) {
    if (!b.idee) return null;
    var auteur = b.auteur ? DEPOT.trouve("personnes", b.auteur) : null;
    return el("div.bi-idee", {},
      el("div.bii-nom", {}, b.campagne || "sans nom de campagne"),
      el("div.bii-phrase", {}, b.idee),
      b.signature ? el("div.bii-sign", {}, "« " + b.signature + " »") : null,
      el("div.bii-pied", {},
        auteur ? el("span.bii-a", {}, UI.avatar(auteur, 22), el("span", {}, auteur.nom)) : null,
        b.mecanique ? el("span.bii-m", {}, b.mecanique) : null
      )
    );
  }

  /* ————————————————————— Les routes, avec leur coût d'arbitrage ————————————————————— */

  /* Comparer deux routes, c'est comparer deux arguments — pas deux images.
   * On les met côte à côte, avec ce que chacune sacrifie et ce qu'elle oppose,
   * et le nom de qui la porte. C'est là qu'on tranche. */
  function colonneRoute(p, pi, rafraichir) {
    var da = DEPOT.trouve("personnes", pi.auteurDA);
    var cr = DEPOT.trouve("personnes", pi.auteurCR);
    var ls = (p.livrables || []).filter(function (l) { return !l.annule && l.pisteId === pi.id; });
    var pretes = ls.filter(function (l) { return PRODUCTION.ouverte(p, l); }).length;
    var disp = (pi.dispositif || []).length;
    var sourcees = (VUE_ATELIER.idees(p) || []).filter(function (i) { return i.pisteId === pi.id; });

    return el("div.bic" + (pi.statut === "retenue" ? ".retenue" : pi.statut === "ecartee" ? ".ecartee" : ""), {},
      el("button.bic-v", { type: "button", onclick: function () { VUE_ROUTE.ouvrir(p, pi, rafraichir); } },
        IMAGE.vignette(pi, "planche"),
        el("span.bic-eti", {}, ETAT.piste(p, pi).nom)),

      el("div.bic-t", {}, pi.titre || "Route sans titre"),
      ETAT.ligne(ETAT.piste(p, pi), "bic-etat"),
      el("div.bic-a", {},
        da ? UI.avatar(da, 20) : null,
        cr ? UI.avatar(cr, 20) : null,
        el("span", {}, (da ? da.nom : "auteur non nommé") + (cr ? "  ·  " + cr.nom : ""))),

      (pi.accroches || []).length
        ? el("div.bic-acc", {}, "« " + pi.accroches[0] + " »")
        : null,

      el("div.bic-c", {}, pi.concept || ""),

      /* Les deux lignes qui décident. Sans elles, la route est irrecevable. */
      el("div.bic-arg", {},
        el("div.bica.sacrifice", {},
          el("div.t", {}, "CE QU'ELLE SACRIFIE"),
          el("div.v" + (pi.sacrifice ? "" : ".vide"), {},
            pi.sacrifice || "non écrit — la route n'est pas arbitrable, §8")),
        el("div.bica.argument", {},
          el("div.t", {}, "L'ARGUMENT"),
          el("div.v" + (pi.argument ? "" : ".vide"), {},
            pi.argument || "non écrit — elle ne se défend que par le goût"))),

      sourcees.length
        ? el("div.bic-src", {}, "vient de l'atelier : " + sourcees.map(function (i) {
            var a = i.auteur ? DEPOT.trouve("personnes", i.auteur) : null;
            return "« " + i.texte.slice(0, 46) + (i.texte.length > 46 ? "…" : "") + " »"
              + (a ? " — " + a.nom : "");
          }).join("  ·  "))
        : el("div.bic-src.vide", {}, "aucune idée d'atelier rattachée"),

      el("div.bic-n", {},
        el("span", {}, el("b", {}, String(ls.length)), ls.length > 1 ? " pièces" : " pièce"),
        el("span", {}, el("b", {}, String(pretes)), " prêtes"),
        el("span" + (disp ? "" : ".alerte"), {}, el("b", {}, String(disp)),
          disp > 1 ? " activités" : disp ? " activité" : " dispositif")),

      el("div.bic-g", {},
        pi.statut !== "retenue"
          ? el("button.b.or", { type: "button", onclick: function () { VUE_ROUTE.ouvrir(p, pi, rafraichir); } },
              "Ouvrir pour arbitrer")
          : el("button.b", { type: "button", onclick: function () { VUE_ROUTE.ouvrir(p, pi, rafraichir); } },
              "Ouvrir la route"))
    );
  }

  /* ————————————————————— Ce que l'atelier a produit ————————————————————— */

  /* La question qu'on se pose vraiment devant une big idea : est-ce que les
   * idées de mes gars ont servi, ou est-ce que j'ai gardé les miennes ? */
  function atelier(p, rafraichir) {
    var is = VUE_ATELIER.idees(p);
    if (!is.length) {
      return el("div.bi-atelier", {},
        el("div.bir-tete", {}, el("span", {}, "LES IDÉES DE L'ATELIER"),
          el("span.bir-e", { style: { color: "var(--alerte)" } }, "aucune idée posée")),
        el("p.rien", {}, "Aucune idée n'a été posée en atelier. L'indicateur « idées retenues émanant de juniors » reste donc à zéro, quoi qu'il arrive."),
        el("div.form-actions", {},
          el("a.b", { href: "#/projets/" + p.id + "/atelier" }, "Ouvrir l'atelier →")));
    }

    var retenues = is.filter(function (i) { return i.statut === "retenue"; });
    var reprises = retenues.filter(function (i) { return i.pisteId; }).length;
    var juniors = retenues.filter(function (i) {
      var a = DEPOT.trouve("personnes", i.auteur); return a && a.seniorite === "junior"; }).length;

    return el("div.bi-atelier", {},
      el("div.bir-tete", {},
        el("span", {}, "LES IDÉES DE L'ATELIER"),
        el("span.bir-e", {}, retenues.length + " retenues sur " + is.length
          + "  ·  " + reprises + " reprises dans une route"
          + (juniors ? "  ·  " + juniors + " de juniors" : ""))),

      reprises < retenues.length
        ? UI.banniere("", (retenues.length - reprises)
            + (retenues.length - reprises > 1 ? " idées retenues ne sont reprises" : " idée retenue n'est reprise")
            + " dans aucune route. Retenue et jamais servie, c'est une idée volée à son auteur.")
        : null,

      el("div.bi-idees", {}, is.map(function (i) {
        var a = i.auteur ? DEPOT.trouve("personnes", i.auteur) : null;
        var pi = i.pisteId ? (p.sections.pistes || []).filter(function (x) { return x.id === i.pisteId; })[0] : null;
        return el("div.bii." + i.statut, {},
          el("div.bii-t", {}, i.texte),
          el("div.bii-m", {},
            a ? UI.avatar(a, 18) : null,
            el("span", {}, a ? a.nom : "auteur non nommé"),
            ETAT.pastille(ETAT.seniorite(a)),
            pi ? el("span.bii-r", {}, "→ " + pi.titre) : null),
          ETAT.ligne(ETAT.idee(p, i), "bii-etat"),
          i.motif ? el("div.bii-mo", {}, i.motif) : null,
          i.statut === "retenue" && !pi
            ? el("button.b.nu", { type: "button", onclick: function () { rattacher(p, i, rafraichir); } },
                "rattacher à une route")
            : null);
      }))
    );
  }

  function rattacher(p, i, rafraichir) {
    var sel = el("select", {});
    sel.appendChild(el("option", { value: "" }, "— aucune —"));
    (p.sections.pistes || []).forEach(function (pi) {
      sel.appendChild(el("option", { value: pi.id }, pi.titre || "route sans titre"));
    });
    PANNEAU.sur("Rattacher l'idée", p.ref, el("div", {},
      el("div.fb-texte", {}, i.texte),
      UI.banniere("", "Rattacher dit quelle route porte cette idée. C'est ce qui rend « on a pris l'idée de X » vérifiable — et l'indicateur juniors calculable."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "La route"), sel)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          i.pisteId = sel.value || null;
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Rattacher"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function retenir(p, pi, rafraichir) {
    var piece = { type: "piste", objet: pi, projet: p, titre: pi.titre };
    var c = COUT.verdict(piece, "approuve");
    var motif = el("input", { type: "text", placeholder: "une ligne d'argument — c'est ce que le processus demande" });

    PANNEAU.ouvrir("Retenir « " + (pi.titre || "cette route") + " »", "ce que ça change", el("div", {},
      c.alertes.length ? el("div", {}, c.alertes.map(function (a) { return UI.banniere("rouge", a); })) : null,
      c.gagne.length ? el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA DÉBLOQUE"),
        el("div", {}, c.gagne.map(function (g) {
          return el("div.oc-l.gagne", {}, UI.icone("revue", 13), el("span", {}, g));
        }))) : null,
      c.effets.length ? el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA ENTRAÎNE"),
        el("div", {}, c.effets.map(function (e) {
          return el("div.oc-l", {}, el("span.puce"), el("span", {}, e));
        }))) : null,
      el("div.sousbloc", {}, el("h3", {}, "L'ARGUMENT"), motif),
      el("div.form-actions", { style: { "margin-top": "1rem" } },
        el("button.b.or", { type: "button", onclick: function () {
          if (!motif.value.trim()) { alert("Un arbitrage sans argument écrit n'en est pas un."); return; }
          (p.sections.pistes || []).forEach(function (x) {
            if (x.id !== pi.id && x.statut === "retenue") x.statut = "ecartee";
          });
          pi.statut = "retenue"; pi.motif = motif.value.trim(); pi.arbitre_le = new Date().toISOString();
          (p.livrables || []).forEach(function (l) { if (!l.pisteId) l.pisteId = pi.id; });
          DEPOT.ajoute("decisions", { objet: pi.id, type: "piste", projet: p.id,
            verdict: "approuve", motif: pi.motif, quand: pi.arbitre_le, qui: MAISON.titulaire, titre: pi.titre });
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Retenir"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Revenir"))
    ));
  }

  /* ————————————————————— Ce que l'idée a produit ————————————————————— */

  function executions(p, rafraichir) {
    var retenue = (p.sections.pistes || []).filter(function (x) { return x.statut === "retenue"; })[0];
    var issues = (p.livrables || []).filter(function (l) {
      return !l.annule && (!retenue || l.pisteId === retenue.id);
    });
    if (!issues.length) return null;

    var parSupport = {};
    issues.forEach(function (l) {
      var s = DEPOT.trouve("supports", l.support);
      var cle = s ? s.nom : "Autre";
      if (!parSupport[cle]) parSupport[cle] = [];
      parSupport[cle].push(l);
    });

    var groupes = Object.keys(parSupport).map(function (nom) {
      var items = parSupport[nom];
      var prets = items.filter(function (l) { return REGLES.pretSur(l).part === 100; }).length;
      return {
        nom: nom,
        items: items.map(function (l) {
          var m = DEPOT.trouve("marches", l.marche);
          return { objet: l, etat: m ? m.code : "", livrable: l };
        }),
        pied: prets + " sur " + items.length + " prêts",
      };
    });

    return el("div.bi-exec", {},
      el("div.bir-tete", {}, el("span", {}, "CE QUE CETTE IDÉE A PRODUIT"),
        el("span.bir-e", {}, issues.length + " livrables")),
      UI.mur(groupes, function (it) { VUE_LIVRABLE.ouvrir(p, it.livrable, rafraichir); })
    );
  }

  /* Le rail droit reste : validations et périmètre. */
  function rail(p) {
    var b = p.sections.bigidea || {};
    var marches = {};
    (p.livrables || []).forEach(function (l) { if (l.marche) marches[l.marche] = true; });
    var codes = Object.keys(marches);

    return el("div", {},
      el("div.panneau-lat", {},
        el("h3", {}, "VALIDATION"),
        el("div.val-l", {}, el("span.v-t", {}, "CENTRALE"),
          el("span.v-v" + ((p.sections.identite || {}).decideur ? "" : ".vide"), {},
            (p.sections.identite || {}).decideur || "décideur non nommé")),
        codes.length ? el("div.val-locales", {}, el("span.v-t", {}, "LOCALES"),
          codes.map(function (c) {
            var prets = (p.livrables || []).filter(function (l) {
              return l.marche === c && (l.axes || {}).local === "pret"; }).length;
            var total = (p.livrables || []).filter(function (l) { return l.marche === c; }).length;
            return el("div.val-m", {}, UI.drapeau(c),
              el("span.v-etat" + (prets === total && total ? ".ok" : ""), {}, prets + "/" + total));
          })) : null
      ),
      el("div.panneau-lat", {},
        el("h3", {}, "ACTIVITÉ"),
        el("div", {}, DEPOT.journal().filter(function (l) { return l.id === p.id; }).slice(0, 6).map(function (l) {
          return UI.fileItem(null, l.detail || l.action, O.joli(l.quand) + " · " + l.action, null);
        }))
      )
    );
  }

  return { rendre: rendre, rail: rail };
})();
