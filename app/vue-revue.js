/* vue-revue.js — la revue créative.
 *
 * Une pièce à la fois, en grand. À gauche ce qu'on juge, à droite ce contre quoi
 * on le juge. Et sous chaque verdict, son coût — parce qu'un retour n'est pas
 * gratuit et que personne ne le calcule au moment de décider.
 */

/* Depuis la fusion de « la file » et « une à une », cet écran n'a plus
 * d'adresse : la salle de tri de FILE présente la pièce en grand, et le
 * verdict se rend dans le panneau de la pièce. `pieces()` reste la source de
 * vérité de ce qui attend un verdict — c'est elle que la file interroge.
 * `rendre` est conservé : il porte la mise en scène de la revue hebdomadaire,
 * qui reviendra le jour où le rituel du lundi aura son propre écran. */

window.VUE_REVUE = (function () {
  var el = O.el;
  var ETAPES = ["Brief", "Concept", "Création", "Review", "Final"];
  var index = 0;
  var hote = null;

  function rafraichir() { if (hote) rendre(hote); }

  /* ————————————————————— Ce qui attend ————————————————————— */

  function pieces() {
    var liste = [];
    DEPOT.liste("projets").forEach(function (p) {
      (p.sections.pistes || []).forEach(function (pi) {
        if (pi.statut !== "proposee") return;
        liste.push({
          type: "piste", id: pi.id, projet: p, objet: pi, titre: pi.titre,
          contexte: p.ref + " · route créative",
          depuis: pi.soumis_le || p.cree_le, criteres: "proposition", etape: 1,
          auteur: pi.auteurDA,
        });
      });
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        var v = (l.versions || [])[l.versions.length - 1];
        if (!v || v.verdict) return;
        var s = DEPOT.trouve("supports", l.support);
        var m = DEPOT.trouve("marches", l.marche);
        liste.push({
          type: "livrable", id: l.id, projet: p, objet: l,
          titre: l.nom + " — V" + v.n,
          contexte: p.ref + (s ? " · " + s.nom : "") + (m ? " · " + m.nom : ""),
          depuis: v.soumis_le, criteres: "livrable", etape: 3,
          auteur: l.responsable, semaine: PLATEAU.semaineDe(PLATEAU.echeanceDe(p, l)),
        });
      });
    });
    return liste.sort(function (a, b) { return new Date(a.depuis) - new Date(b.depuis); });
  }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(h) {
    hote = h;
    h.className = "zone revue";
    O.vider(h);

    var toutes = pieces();
    if (index >= toutes.length) index = 0;

    h.appendChild(bandeHaute(toutes));

    if (!toutes.length) {
      h.appendChild(el("div.rv-fini", {},
        UI.icone("revue", 34),
        el("div.f-t", {}, "La file est vide."),
        el("div.f-s", {}, "Rien n'attend ton verdict.")
      ));
      return;
    }

    h.appendChild(scene(toutes[index], toutes));
    h.appendChild(navigation(toutes));
  }

  /* ————————————————————— 1 · Ce que je vise ici ————————————————————— */

  function bandeHaute(toutes) {
    var objs = OBJECTIFS.tous();
    var delai = objs.filter(function (o) { return o.cle === "verdict"; })[0];
    var sansreprise = objs.filter(function (o) { return o.cle === "sansreprise"; })[0];
    var file = COUT.fileBloquee(toutes);

    return el("div.rv-haut", {},
      kpi(delai.reel === null ? "—" : delai.reel, "j · mon délai de verdict",
        "cible " + delai.cible, delai.tenu === false ? "manque" : "tenu"),
      kpi(file.n, file.n > 1 ? "pièces en attente" : "pièce en attente",
        file.plusVieux ? "la plus vieille : " + file.plusVieux + " j" : "à jour",
        file.plusVieux > 3 ? "manque" : "tenu"),
      kpi(file.jours || "—", "j de production bloqués", "tant que je n'ai pas tranché",
        file.jours ? "manque" : "tenu"),
      kpi(sansreprise.reel === null ? "—" : sansreprise.reel, "% sans reprise majeure",
        "cible " + sansreprise.cible + " %", sansreprise.tenu === false ? "manque" : "tenu")
    );
  }

  function kpi(v, n, s, ton) {
    return el("div.rv-kpi." + ton, {},
      el("span.k-v", {}, String(v)),
      el("span.k-n", {}, n),
      el("span.k-s", {}, s)
    );
  }

  /* ————————————————————— 2 · La scène : une pièce, en grand ————————————————————— */

  function scene(pc, toutes) {
    var b = pc.projet.sections.bigidea || {};
    var auteur = pc.auteur ? DEPOT.trouve("personnes", pc.auteur) : null;

    return el("div.rv-scene", {},
      /* Ce qu'on juge */
      el("div.rv-piece", {},
        IMAGE.vignette(pc.objet, "grande"),
        el("div.rp-bas", {},
          el("div.rp-nom", {}, pc.titre),
          el("div.rp-meta", {},
            auteur ? UI.avatar(auteur, 20) : null,
            el("span", {}, auteur ? auteur.nom : "auteur non nommé"),
            el("span.sep", {}, "·"),
            el("span", {}, pc.contexte),
            el("span.sep", {}, "·"),
            el("span.age", {}, O.ancien(pc.depuis))
          ),
          UI.filEtapes(ETAPES, pc.etape, false),
          el("div.form-actions", {}, IMAGE.bouton(pc.objet, rafraichir))
        )
      ),

      /* Ce contre quoi on le juge */
      el("div.rv-contre", {},
        el("div.rc-idee", {},
          el("div.rc-t", {}, "L'IDÉE EN VIGUEUR"),
          el("div.rc-phrase", {}, b.idee || "Aucune idée écrite sur ce projet."),
          b.signature ? el("div.rc-sign", {}, "« " + b.signature + " »") : null
        ),
        grille(pc),
        verdicts(pc)
      )
    );
  }

  /* ————————————————————— La grille : cocher avant de juger ————————————————————— */

  function grille(pc) {
    var boite = el("div.rc-grille");
    function dessiner() {
      O.vider(boite);
      var g = REGLES.grille(pc.criteres, pc.objet);
      var etat = pc.objet.grille || {};
      var tenus = g.filter(function (c) { return etat[c.cle] === true; }).length;

      boite.appendChild(el("div.rg-tete", {},
        el("span", {}, "CE QUI LE FAIT REFUSER"),
        el("span.rg-c" + (tenus === g.length ? ".ok" : ""), {}, tenus + " / " + g.length + " tenus")
      ));
      g.forEach(function (c) {
        var tenu = etat[c.cle] === true;
        boite.appendChild(el("button.rg-l" + (tenu ? ".tenu" : ""), {
          type: "button",
          onclick: function () { etat[c.cle] = !tenu; pc.objet.grille = etat; DEPOT.enregistrer(); dessiner(); },
        }, el("span.m", {}, tenu ? "✓" : "○"), el("span", {}, c.texte)));
      });
    }
    dessiner();
    return boite;
  }

  /* ————————————————————— Les verdicts, avec leur coût ————————————————————— */

  function verdicts(pc) {
    return el("div.rc-verdicts", {}, MAISON.verdicts.map(function (v) {
      var c = COUT.verdict(pc, v.cle);
      var resume = c.alertes.length ? c.alertes[0]
        : c.jours ? "+" + c.jours + " j"
        : c.gagne.length ? c.gagne[0]
        : c.effets[0] || "";
      return el("button.rc-v." + v.cle, {
        type: "button",
        onclick: function () { confirmer(pc, v, c); },
      },
        el("span.v-signe", { style: { color: v.couleur } }, v.signe),
        el("span.v-nom", {}, v.nom),
        el("span.v-cout" + (c.alertes.length ? ".alerte" : ""), {}, resume.slice(0, 62))
      );
    }).concat([
      el("button.rc-v.pasamoi", {
        type: "button",
        onclick: function () {
          RENVOI.ouvrir({ quoi: pc.titre, projet: pc.projet.ref, projetId: pc.projet.id, objet: pc.id });
        },
      },
        el("span.v-signe", {}, "→"),
        el("span.v-nom", {}, "Pas à moi"),
        el("span.v-cout", {}, "mon horloge s'arrête, la sienne démarre"))
    ]));
  }

  /* ————————————————————— L'onde de choc du verdict ————————————————————— */

  function confirmer(pc, v, c) {
    var motif = null;

    var corps = el("div", {},
      el("div.oc-verdict", { style: { "border-color": v.couleur } },
        el("span.ocv-signe", { style: { color: v.couleur } }, v.signe),
        el("div", {}, el("div.ocv-nom", {}, v.nom), el("div.ocv-piece", {}, pc.titre))
      ),

      c.alertes.length
        ? el("div", {}, c.alertes.map(function (a) { return UI.banniere("rouge", a); }))
        : null,

      c.gagne.length
        ? el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA DÉBLOQUE"),
            el("div", {}, c.gagne.map(function (g) {
              return el("div.oc-l.gagne", {}, UI.icone("revue", 13), el("span", {}, g));
            })))
        : null,

      c.effets.length
        ? el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA COÛTE"),
            el("div", {}, c.effets.map(function (e) {
              return el("div.oc-l", {}, el("span.puce"), el("span", {}, e));
            })))
        : null,

      motifBloc(pc, v, function (m) { motif = m; })
    );

    corps.appendChild(el("div.form-actions", { style: { "margin-top": "1.2rem" } },
      el("button.b.or", { type: "button", onclick: function () {
        if (v.motifRequis && !motif) { AVIS.refus("Un retour sans motif n'est pas un retour."); return; }
        rendre_verdict(pc, v, motif || "");
        PANNEAU.fermer();
        rafraichir();
      } }, "Rendre le verdict"),
      el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Revenir")
    ));

    PANNEAU.ouvrir("Avant de trancher", "ce que ce verdict change", corps);
  }

  function motifBloc(pc, v, quand) {
    if (!v.motifRequis) return null;
    var g = REGLES.grille(pc.criteres, pc.objet);
    var etat = pc.objet.grille || {};
    var vides = g.filter(function (c) { return etat[c.cle] !== true; });
    var choisi = null;
    var libre = el("input", { type: "text", placeholder: "ou un motif écrit à la main" });
    var boite = el("div.oc-motifs");

    function dessiner() {
      O.vider(boite);
      vides.forEach(function (c) {
        boite.appendChild(el("button.oc-m" + (choisi === c.texte ? ".actif" : ""), {
          type: "button",
          onclick: function () { choisi = c.texte; libre.value = ""; quand(choisi); dessiner(); },
        }, c.texte));
      });
      if (!vides.length) {
        boite.appendChild(el("p.rien", {}, "Tous les critères sont cochés : le motif ne peut être qu'écrit à la main."));
      }
    }
    dessiner();
    libre.addEventListener("input", function () { choisi = null; quand(libre.value); dessiner(); });

    return el("div.sousbloc", {},
      el("h3", {}, "LE MOTIF — un critère écrit d'abord"),
      boite, libre);
  }

  function rendre_verdict(pc, v, motif) {
    var quand = new Date().toISOString();
    DEPOT.ajoute("decisions", {
      objet: pc.id, type: pc.type, projet: pc.projet.id, verdict: v.cle,
      motif: motif, quand: quand, qui: MAISON.titulaire, titre: pc.titre,
    });

    if (pc.type === "piste") {
      if (v.cle === "approuve") {
        (pc.projet.sections.pistes || []).forEach(function (x) {
          if (x.id !== pc.id && x.statut === "retenue") x.statut = "ecartee";
        });
        pc.objet.statut = "retenue";
        (pc.projet.livrables || []).forEach(function (l) { if (!l.pisteId) l.pisteId = pc.id; });
      } else if (v.cle === "hors") pc.objet.statut = "ecartee";
      else pc.objet.statut = "reprise";
      pc.objet.arbitre_le = quand;
      pc.objet.motif = motif;
    } else {
      var ver = (pc.objet.versions || [])[pc.objet.versions.length - 1];
      if (ver) { ver.verdict = v.cle; ver.motif = motif; ver.juge_le = quand; }
      if (v.cle === "approuve") pc.objet.axes.central = "pret";
    }
    DEPOT.enregistrer();
  }

  /* ————————————————————— 3 · La navigation dans la file ————————————————————— */

  function navigation(toutes) {
    return el("div.rv-nav", {},
      el("button.b.nu", { type: "button", disabled: index === 0 || null,
        onclick: function () { index = Math.max(0, index - 1); rafraichir(); } }, "← précédent"),

      el("div.rv-file", {}, toutes.map(function (p, i) {
        return el("button.rf-c" + (i === index ? ".actif" : ""), {
          type: "button", title: p.titre,
          onclick: function () { index = i; rafraichir(); },
        }, IMAGE.vignette(p.objet, "mini"));
      })),

      el("div.rv-pos", {}, (index + 1) + " sur " + toutes.length),

      el("button.b.nu", { type: "button", disabled: index >= toutes.length - 1 || null,
        onclick: function () { index = Math.min(toutes.length - 1, index + 1); rafraichir(); } }, "suivant →")
    );
  }

  return { rendre: rendre, titre: "Revue", pieces: pieces };
})();
