/* vue-pistes.js — les pistes créatives d'un projet, côte à côte. */

window.VUE_PISTES = (function () {
  var el = O.el;

  var ouverte = null;

  function rendre(p, rafraichir) {
    var pistes = (p.sections.pistes || []);

    /* Une piste ouverte prend toute la place. On y entre, on en ressort. */
    if (ouverte) {
      var pi = pistes.filter(function (x) { return x.id === ouverte; })[0];
      if (!pi) { ouverte = null; }
      else return el("div", {},
        el("button.retour", { type: "button", onclick: function () { ouverte = null; rafraichir(); } },
          "← toutes les pistes"),
        VUE_ROUTE.rendre(p, pi, rafraichir));
    }

    var vives = pistes.filter(function (x) { return x.statut !== "ecartee"; });
    var retenue = pistes.filter(function (x) { return x.statut === "retenue"; })[0];

    /* Comparer une piste à elle-même n'a pas de sens.
     *
     * Un cycle mensuel ne met pas deux pistes en concurrence : il en tient
     * une, et tout le mois vit dedans. Le comparateur mettait donc l'unique
     * piste derrière un clic, et ses dix-sept publications derrière deux —
     * autant dire qu'elles n'existaient pas dans l'onglet Concevoir. Quand il
     * n'y a qu'une piste vive et qu'elle est retenue, on entre directement. */
    if (retenue && vives.length === 1) {
      return el("div", {}, VUE_ROUTE.rendre(p, retenue, rafraichir));
    }

    if (!vives.length) {
      return el("div", {},
        el("div.section-titre", {}, "Pistes créatives"),
        el("p.rien", {}, "Aucune piste en lice. Une piste naît d'une demande de "
          + "proposition — c'est elle qui fixe l'étage, les critères et l'auteur."),
        el("div", { style: { "margin-top": "1.4rem" } }, DEMANDE.bloc(p, rafraichir)),
        gestes(p, rafraichir));
    }

    return el("div.cmp", {},
      el("div.cmp-t", {}, "Retenir une piste, c'est sacrifier l'autre — et l'écrire"),
      el("p.cmp-s", {}, retenue
        ? "« " + (retenue.titre || "une piste") + " » fait autorité. Les autres restent "
          + "lisibles : c'est leur sacrifice écrit qui rend la décision défendable."
        : "Ici on décide. La big idea, elle, se juge sur son opposabilité, pas sur ses pistes."),

      comparateur(p, vives, rafraichir),

      el("p.cmp-pied", {}, "Plusieurs pistes recommandées à égalité est un motif de "
        + "refus opposable. Une seule doit sortir d'ici."),

      el("div", { style: { "margin-top": "1.4rem" } }, DEMANDE.bloc(p, rafraichir)),
      gestes(p, rafraichir)
    );
  }

  function gestes(p, rafraichir) {
    return el("div.form-actions", {},
      el("button.b", { type: "button", onclick: function () { seance(p, rafraichir); } },
        "Ouvrir une séance de concept"),
      el("button.b.nu", { type: "button", onclick: function () { editer(p, null, rafraichir); } },
        "+ Ajouter une piste"));
  }

  /* ————————————————————— Le comparateur ————————————————————— */

  /* Des cartes empilées se lisent verticalement : on découvre une piste, puis
   * l'autre, et on compare de mémoire. Or la décision est une comparaison —
   * elle se lit en travers. Une colonne de libellés, une colonne par piste,
   * et chaque ligne aligne la même question pour toutes. */
  var LIGNES = [
    { cle: "visuel",     nom: "VISUEL" },
    { cle: "concept",    nom: "CONCEPT" },
    { cle: "sacrifice",  nom: "SACRIFICE" },
    { cle: "argument",   nom: "ARGUMENT" },
    { cle: "porteurs",   nom: "PORTEURS" },
    { cle: "dispositif", nom: "DISPOSITIF" },
    { cle: "delai",      nom: "DÉLAI" },
    { cle: "pieces",     nom: "PIÈCES" },
  ];
  var LETTRES = "ABCDEF";

  function comparateur(p, vives, rafraichir) {
    var n = vives.length;
    var grille = { "grid-template-columns": "7.5rem repeat(" + n + ", minmax(0, 1fr))" };

    return el("div.cmp-g", { style: grille },
      /* L'en-tête : le nom de chaque piste, et son état. */
      el("div.cmpg-l", {}),
      vives.map(function (pi, i) {
        var etat = pi.statut === "retenue" ? "retenue" : "";
        return el("div.cmp-h" + (etat ? "." + etat : ""), {},
          el("span.cmph-n", {}, LETTRES[i] + " — " + (pi.titre || "Sans titre")),
          pi.statut === "retenue" ? el("span.cmph-e", {}, "retenue") : null);
      }),

      LIGNES.map(function (L) {
        return [
          el("div.cmpg-l", {}, L.nom),
          vives.map(function (pi) { return cellule(p, pi, L.cle, rafraichir); }),
        ];
      }),

      /* Le verdict se rend au pied de la colonne choisie. */
      el("div.cmpg-l", {}),
      vives.map(function (pi) {
        return el("div.cmp-v", {}, pi.statut === "retenue"
          ? el("span.cmpv-ok", {}, "✓ retenue — le sacrifice de l'autre est écrit")
          : el("button.b.or.cmpv-b", { type: "button",
              onclick: function () { VUE_ROUTE.ouvrir(p, pi, rafraichir); } },
              "Retenir « " + (pi.titre || "cette piste") + " »"));
      })
    );
  }

  function vide(quoi, cout) {
    return el("span.cmp-vide", {}, el("b", {}, quoi), cout);
  }

  function cellule(p, pi, cle, rafraichir) {
    if (cle === "visuel") {
      return el("button.cmp-c.visuel", { type: "button",
        onclick: function () { ouverte = pi.id; rafraichir(); },
        title: "ouvrir « " + (pi.titre || "cette piste") + " »" },
        IMAGE.vignette(pi, "grande"));
    }

    if (cle === "concept") {
      return el("div.cmp-c", {}, pi.concept
        ? el("p.cmpc-p", {}, pi.concept)
        : vide("aucun concept écrit — ", "il n'y a rien à comparer, et rien à refuser."));
    }

    if (cle === "sacrifice") {
      return el("div.cmp-c", {}, pi.sacrifice
        ? el("p.cmpc-p", {}, pi.sacrifice)
        : vide("sacrifice non écrit — ", "refusable au §8 : une piste qui ne renonce à rien n'a pas choisi."));
    }

    if (cle === "argument") {
      return el("div.cmp-c", {}, pi.argument
        ? el("p.cmpc-p", {}, pi.argument)
        : vide("argument non écrit — ", "refusable au §8 : elle ne se défendra que par le goût."));
    }

    if (cle === "porteurs") {
      var ps = pi.porteurs || [];
      return el("div.cmp-c", {},
        ps.length
          ? el("div.cmp-chips", {}, ps.map(function (x) { return el("span.cmp-chip", {}, x); }))
          : null,
        /* Trois porteurs, dont deux doivent survivre au montage : c'est écrit
         * au §8, et c'est le contrôle que personne ne fait à l'œil. */
        ps.length < 3
          ? el("span.cmp-al", {}, ps.length + " porteur" + (ps.length > 1 ? "s" : "")
              + " sur 3 seulement — refusable au §8")
          : null);
    }

    if (cle === "dispositif") {
      var ds = pi.dispositif || [];
      if (!ds.length) return el("div.cmp-c", {},
        vide("aucun dispositif — ", "on ne sait pas ce que cette piste coûte à produire."));
      return el("div.cmp-c", {}, el("div.cmp-disp", {}, ds.slice(0, 5).map(function (a) {
        return el("div.cmpd", {},
          el("span.cmpd-c", {}, a.canal || "—"),
          el("span.cmpd-n", {}, a.nom || a.lieu || ""));
      })));
    }

    if (cle === "delai") {
      var fin = RETRO.finDe(p, pi);
      if (!fin) return el("div.cmp-c", {},
        vide("aucune date de fin — ", "le rétroplanning de cette piste ne se calcule pas."));
      var c = RETRO.calculer(pi, fin);
      var jal = c.phases.filter(function (x) { return !x.hors && x.fin; });
      return el("div.cmp-c", {}, el("div.cmp-frise", {}, jal.map(function (x) {
        return el("div.cmpf", {},
          el("span.cmpf-d", {}, O.court ? O.court(x.fin) : String(x.fin).slice(5).split("-").reverse().join("/")),
          el("span.cmpf-r", {}),
          el("span.cmpf-n", {}, x.ph.nom.toLowerCase()));
      })));
    }

    if (cle === "pieces") {
      var kvs = KV.tous(p).filter(function (l) { return l.pisteId === pi.id; });
      var tout = (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id; });
      var pretes = tout.filter(function (l) { return REGLES.pretSur(l).part === 100; }).length;
      var faux = kvs.filter(function (l) { return !KV.conforme(p, l); }).length;
      return el("div.cmp-c", {},
        el("span.cmpc-n", {}, tout.length + (tout.length > 1 ? " livrables" : " livrable")
          + "  ·  " + pretes + (pretes > 1 ? " prêtes" : " prête")),
        faux ? el("span.cmp-al", {}, faux + (faux > 1 ? " KV non conformes" : " KV non conforme")
          + " à leur marché") : null);
    }

    return el("div.cmp-c", {});
  }

  function detail(p, pi, rafraichir) {
    var da = DEPOT.trouve("personnes", pi.auteurDA);
    var cr = DEPOT.trouve("personnes", pi.auteurCR);

    var corps = el("div", {},
      PANNEAU.ligne("Statut", pi.statut === "retenue" ? "Retenue" : pi.statut === "ecartee" ? "Écartée" : "En lice"),
      PANNEAU.ligne("Auteur — DA", da ? da.nom : null, !da),
      PANNEAU.ligne("Auteur — rédaction", cr ? cr.nom : null, !cr),
      FORM.lire(CHAMPS.piste.filter(function (c) { return c.cle !== "titre" && c.cle !== "auteurDA" && c.cle !== "auteurCR"; }), pi),
      pi.motif ? PANNEAU.sousbloc("Motif de l'arbitrage", el("p", {}, pi.motif)) : null,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () { PANNEAU.fermer(); editer(p, pi, rafraichir); } }, "Modifier"),
        IMAGE.bouton(pi, function () { PANNEAU.fermer(); rafraichir(); }),
        pi.statut !== "retenue" ? el("button.b", {
          type: "button",
          onclick: function () {
            PANNEAU.fermer();
            VUE_ROUTE.ouvrir(p, pi, rafraichir);
          },
        }, "Retenir cette piste") : null,
        el("button.b", {
          type: "button",
          onclick: function () { PANNEAU.fermer(); RENVOI.ouvrir({ quoi: "Piste « " + pi.titre + " »", projet: p.ref, projetId: p.id, objet: pi.id }); },
        }, "Renvoyer au DA")
      )
    );
    PANNEAU.ouvrir(pi.titre || "Piste", p.ref, corps, O.poste("da").couleur);
  }

  function editer(p, pi, rafraichir) {
    var f = FORM.rendre(CHAMPS.piste, pi || {});
    PANNEAU.ouvrir(pi ? "Modifier la piste" : "Nouvelle piste", p.ref, el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Une piste sans son sacrifice ni son argument est refusable — critère écrit du §8."),
      f.noeud,
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            var d = f.valeurs();
            if (!p.sections.pistes) p.sections.pistes = [];
            if (pi) { Object.keys(d).forEach(function (k) { pi[k] = d[k]; }); }
            else {
              d.id = O.id("PI"); d.statut = "proposee"; d.soumis_le = new Date().toISOString();
              p.sections.pistes.push(d);
            }
            DEPOT.tracer(pi ? "modification" : "création", "pistes", p.id, d.titre || "");
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          },
        }, "Enregistrer"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ), O.poste("da").couleur);
  }

  /* ————— La séance de concept — porte A ————— */

  function seance(p, rafraichir) {
    var idees = [];
    var liste = el("div");

    function dessiner() {
      O.vider(liste);
      idees.forEach(function (i, n) {
        var pers = DEPOT.trouve("personnes", i.auteur);
        liste.appendChild(el("div.attente-l", {},
          el("div.tete", {},
            el("b", {}, i.texte),
            O.jeton(pers ? pers.poste : "creation", pers ? pers.nom : "—"),
            ETAT.pastille(ETAT.seniorite(pers))
          )
        ));
      });
      if (!idees.length) liste.appendChild(el("p.rien", {}, "Aucune idée posée. La porte A est ouverte : n'importe qui pose une idée, y compris et surtout le DA."));
    }
    dessiner();

    var champIdee = el("input", { type: "text", placeholder: "Une idée, en une phrase" });
    var selAuteur = el("select", {});
    selAuteur.appendChild(el("option", { value: "" }, "— auteur —"));
    DEPOT.liste("personnes").forEach(function (x) {
      selAuteur.appendChild(el("option", { value: x.id }, x.nom + " · " + O.poste(x.poste).court));
    });

    PANNEAU.ouvrir("Séance de concept — porte A", "45 minutes", el("div", {},
      el("div.prix", {}, el("span.signe", {}, "⚠"), "Les idées se saisissent avec leur auteur, avant l'arbitrage. C'est ce qui rend l'indicateur « idées retenues émanant de juniors » calculable."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "L'idée"), champIdee),
        el("div.champ", {}, el("label", {}, "Qui l'a posée"), selAuteur),
        el("div.form-actions", {},
          el("button.b", {
            type: "button",
            onclick: function () {
              if (!champIdee.value.trim() || !selAuteur.value) { AVIS.refus("Une idée et son auteur."); return; }
              idees.push({ texte: champIdee.value.trim(), auteur: selAuteur.value });
              champIdee.value = ""; dessiner();
            },
          }, "Poser l'idée")
        )
      ),
      PANNEAU.sousbloc("Les idées posées", liste),
      el("div.form-actions", {},
        el("button.b.or", {
          type: "button",
          onclick: function () {
            if (!idees.length) { PANNEAU.fermer(); return; }
            if (!p.seances) p.seances = [];
            p.seances.push({ id: O.id("SEA"), quand: new Date().toISOString(), idees: idees });
            DEPOT.tracer("séance de concept", "projets", p.id, idees.length + " idées posées");
            DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
          },
        }, "Clore la séance"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    ), O.poste("creation").couleur);
  }

  return { rendre: rendre, seance: seance, editer: editer, detail: detail,
    ouvrir: function (id) { ouverte = id; } };
})();
