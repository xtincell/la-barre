/* application.js — la coque : barre latérale, fil, recherche, capture.
 *
 * Trois colonnes. À gauche ce qui ne bouge jamais — c'est la mémoire du geste
 * qui rend un rituel hebdomadaire tenable.
 */

window.APP = (function () {
  var el = O.el;
  var corps = null;
  var railNoeud = null;

  /* Quatre intentions, pas huit destinations.
   *
   * Une navigation n'est pas la liste des modules disponibles : c'est la
   * réponse à « quelle intention puis-je avoir en ouvrant ce logiciel ». Le
   * test qui la valide : quelqu'un qui découvre le produit doit savoir sans
   * hésiter où aller pour voir ce qui demande son intervention. */
  var VUES = [
    { cle: "valider", ico: "revue", nom: "À VALIDER",
      quoi: "ce qui attend ma validation",
      vue: function () { return VUE_DECIDER; } },
    { cle: "planning", ico: "charge", nom: "PLANNING",
      quoi: "charge, priorités, équipe",
      vue: function () { return VUE_PLACER; } },
    { cle: "reporting", ico: "standard", nom: "REPORTING",
      quoi: "indicateurs, bilan, arbitrages",
      vue: function () { return VUE_CONSTATER; } },
    { cle: "projets", ico: "projets", nom: "PROJETS",
      quoi: "où en est chaque projet",
      vue: function () { return VUE_PROJETS; } },
    { cle: "referentiel", ico: "referentiel", nom: "RÉFÉRENTIEL",
      quoi: "marques, marchés, gabarits, base",
      vue: function () { return VUE_MAISON; } },
  ];

  /* Les anciennes adresses continuent de fonctionner : elles arrivent au bon
   * mode de la bonne intention. Un lien ne se casse pas parce qu'on a changé
   * d'architecture. */
  var ANCIENNES = {
    /* Les noms d'avant la normalisation du vocabulaire. Un lien partagé il y a
     * six mois doit arriver quelque part — on ne casse pas une adresse. */
    decider: ["valider", "file"],
    placer: ["planning", "ordre"],
    constater: ["reporting", "indicateurs"],
    maison: ["referentiel", "marches"],
    direction: ["valider", "file"],
    revue: ["valider", "file"],
    attentes: ["valider", "du"],
    briefs: ["reporting", "indicateurs"],
    standard: ["reporting", "indicateurs"],
    pipeline: ["planning", "ordre"],
    reglages: ["referentiel", "parametres"],
    people: ["referentiel", "people"],
  };

  function piste() {
    var brut = location.hash.replace(/^#\/?/, "");
    var m = brut.split("/");
    var cle = m[0] || "decider";

    if (ANCIENNES[cle]) {
      var a = ANCIENNES[cle];
      cle = a[0];
      m = [a[0], a[1]].concat(m.slice(1));
    }

    var v = null;
    VUES.forEach(function (x) { if (x.cle === cle) v = x; });
    return { vue: v || VUES[0], arg: m[1] || null, sous: m[2] || null };
  }

  /* ————————————————————— La barre latérale ————————————————————— */

  /* Le dossier ouvert se retient : quitter un projet pour la Revue ne doit pas
   * le remplacer par le premier de la liste. */
  var dernierProjet = null;

  function rail() {
    var r = piste();
    var aJuger = VUE_REVUE.pieces().length;
    var attentes = RENVOI.ouvertes().length;
    var projets = DEPOT.liste("projets");
    var age = DEPOT.ageSauvegarde();

    if (r.vue.cle === "projets" && r.arg) dernierProjet = r.arg;
    var actif = (dernierProjet ? DEPOT.trouve("projets", dernierProjet) : null) || projets[0];

    var n = el("nav.rail", {},
      el("div.rail-marque", {},
        el("div.couronne", {}, "♛"),
        el("h1", {}, "La Barre"),
        el("div.os", {}, MAISON.nom.split(" ")[0] + " CREATIVE OS")
      ),

      /* Chaque place dit ce qui l'attend. Un compteur qui ne bouge jamais est
       * un compteur qu'on cesse de lire : on ne montre que ce qui appelle. */
      el("div.rail-nav", {}, VUES.map(function (v) {
        var c = charge(v.cle, aJuger, attentes, projets, age);
        return el("a", { href: "#/" + v.cle, "aria-current": r.vue.cle === v.cle ? "page" : null,
          title: c.quoi || null },
          el("span.ico", {}, UI.icone(v.ico, 15)),
          el("span", {}, v.nom),
          c.n ? el("span.compte" + (c.ton ? "." + c.ton : ""), {}, c.n) : null
        );
      })),

      actif ? blocDossier(actif, r, projets) : null,

      el("div.rail-titre", {}, "OUTILS RAPIDES"),
      el("div.rail-outils", {},
        el("button", { type: "button", onclick: function () { RENVOI.ouvrir({}); } },
          el("span.ico", {}, UI.icone("renvoi", 14)), "Renvoi", el("span.touche", {}, "⌘R")),
        el("button", { type: "button", onclick: CAPTURE.ouvrir },
          el("span.ico", {}, UI.icone("capture", 14)), "Capture rapide", el("span.touche", {}, "⌘K")),
        el("button", { type: "button", onclick: function () { var c = document.querySelector(".chapeau-outils input"); if (c) c.focus(); } },
          el("span.ico", {}, UI.icone("recherche", 14)), "Recherche", el("span.touche", {}, "⌘F")),
        el("button", { type: "button", onclick: function () { window.print(); } },
          el("span.ico", {}, UI.icone("imprimer", 14)), "Imprimer")
      ),

      el("div.rail-pied", {},
        el("div.qui", {},
          el("div.portrait", {}, initiales(moi())),
          el("div", {},
            el("div.nom", {}, moi()),
            el("div.poste", {}, O.poste(MAISON.titulaire).nom)
          )
        ),
        el("div.version", {}, "v1.0 · local"),
        el("div.sauvegarde." + (age === null || age > 2 ? "alerte" : "ok"), {},
          age === null ? "jamais exporté" : age === 0 ? "exporté aujourd'hui" : "exporté il y a " + age + " j")
      )
    );
    return n;
  }

  /* Ce qui attend derrière chaque place.
   *
   * Les clés sont celles des cinq destinations, pas celles des anciens
   * modules : renommer une vue sans renommer son compteur éteint le compteur
   * en silence, et un badge qui disparaît ne se remarque jamais.
   *
   * Reporting n'a pas de compteur : c'est une lecture mensuelle, pas une
   * file. Lui en donner un ferait cinq badges permanents, et la priorité
   * cesserait d'être rare. */
  function charge(cle, aJuger, attentes, projets, age) {
    if (cle === "valider") return { n: aJuger ? String(aJuger) : null, ton: "alerte",
      quoi: aJuger + (aJuger > 1 ? " livrables attendent mon verdict" : " livrable attend mon verdict")
        + (attentes ? " — et " + attentes + " renvois sont sans retour" : "") };

    if (cle === "planning") {
      /* Le compteur dit le plus coûteux des deux, pas leur somme. Un conflit
       * d'ordre passe avant un retard : il fait travailler quelqu'un sur du
       * spéculatif pendant qu'un engagement dort. Sans conflit, ce qui compte
       * est ce qui est annoncé livré et n'existe pas. */
      var c = PRIORITE.conflits().conflits.length;
      if (c) {
        return { n: String(c), ton: "alerte",
          quoi: c + (c > 1 ? " conflits d'ordre" : " conflit d'ordre")
            + " : du spéculatif passe avant un engagement" };
      }
      var souf = TRACE.enSouffrance();
      var ment = souf.filter(function (x) { return x.s.cle === "dement"; }).length;
      if (ment) {
        return { n: String(ment), ton: "alerte",
          quoi: ment + (ment > 1 ? " livraisons sont annoncées faites" : " livraison est annoncée faite")
            + " et rien n'est au dossier" };
      }
      var tard = souf.filter(function (x) { return x.s.cle === "depasse"; }).length;
      return { n: tard ? String(tard) : null, ton: "attente",
        quoi: tard + (tard > 1 ? " remises sont passées" : " remise est passée")
          + " sans que rien n'arrive" };
    }

    if (cle === "projets") {
      var n = projets.filter(function (p) {
        return REGLES.blocages(p.id).some(function (b) { return b.type !== "infere-non-contresigne"; });
      }).length;
      return { n: n ? String(n) : null, ton: "alerte",
        quoi: n + (n > 1 ? " projets ont un blocage ouvert" : " projet a un blocage ouvert") };
    }

    /* Le dépôt d'abord : c'est la seule perte irréversible du produit, et il
     * vit derrière cette place depuis que les réglages y ont déménagé. */
    if (cle === "referentiel") {
      if (age === null || age > 2) {
        return { n: "!", ton: "alerte",
          quoi: age === null ? "la base n'a jamais été exportée"
            : "la base a été exportée il y a " + age + " jours" };
      }
      var trous = 0;
      DEPOT.liste("marches").forEach(function (m) {
        if (!(m.mentions || []).length) trous++;
        if (!(m.sku || []).length) trous++;
      });
      return { n: trous ? String(trous) : null, ton: "attente",
        quoi: trous + (trous > 1 ? " entrées de référentiel manquent" : " entrée de référentiel manque") };
    }

    return { n: null };
  }

  /* ————————————————————— Le dossier ouvert ————————————————————— */

  /* Ce n'est pas une seconde table des matières : c'est l'état du dossier —
   * son visuel, ce qui le bloque, et où en sont ses sections en une ligne. */
  function blocDossier(p, r, projets) {
    var blocs = REGLES.blocages(p.id);
    var durs = blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
    var infs = window.INFERENCE ? INFERENCE.compte(p) : 0;
    var ici = r.vue.cle === "projets" && r.arg === p.id;
    var ech = (p.sections.identite || {}).echeance;
    var jours = ech ? Math.round((new Date(ech) - new Date(O.jour())) / 86400000) : null;
    var visuel = premierVisuel(p);

    return el("div.bloc-projets" + (ici ? ".ici" : ""), {},
      el("div.rail-titre", {}, "LE DOSSIER OUVERT",
        projets.length > 1
          ? el("button.rd-changer", { type: "button", onclick: function () { choisir(projets, p); } }, "changer")
          : null),

      el("a.rd", { href: "#/projets/" + p.id },
        visuel ? el("span.rd-vig", {}, IMAGE.vignette(visuel, "planche")) : null,
        el("span.rd-nom", {}, p.nom),
        el("span.rd-ref", {}, p.ref + (p.sections.identite && p.sections.identite.marque
          ? "  ·  " + p.sections.identite.marque : "")),
        el("span.rd-etat", {},
          durs
            ? el("span.rde.alerte", {
                title: blocs.filter(function (b) { return b.type !== "infere-non-contresigne"; })
                  .map(function (b) { return b.quoi + " — " + REGLES.prix(b.type); }).join("\n"),
              }, durs + (durs > 1 ? " blocages" : " blocage"))
            : el("span.rde.vert", {}, "rien ne bloque"),
          infs ? el("span.rde.attente", {}, infs + " inférés") : null),
        jours !== null
          ? el("span.rd-ech" + (jours < 0 ? ".alerte" : jours < 15 ? ".attente" : ""), {},
              jours < 0 ? "échéance dépassée de " + (-jours) + " j"
                : jours === 0 ? "échéance aujourd'hui" : "échéance dans " + jours + " j")
          : el("span.rd-ech.alerte", {}, "aucune échéance")
      ),

      /* Les sections en pastilles : la couleur dit l'état, le clic emmène. */
      el("div.rd-pips", {}, sectionsDe(p).map(function (sc) {
        var e = VUE_PROJETS.etatSection(p, sc.cle);
        return el("a.rdp." + e.classe + (r.arg === p.id && r.sous === sc.cle ? ".ici" : ""), {
          href: "#/projets/" + p.id + "/" + sc.cle,
          title: sc.nom + " — " + e.texte,
        }, el("span", {}, sc.nom));
      }))
    );
  }

  function premierVisuel(p) {
    var l = (p.livrables || []).filter(function (x) { return x.vignette && !x.annule; })[0];
    if (l) return l;
    return (p.sections.pistes || []).filter(function (x) { return x.vignette; })[0] || null;
  }

  function choisir(projets, courant) {
    PANNEAU.ouvrir("Changer de dossier", projets.length + " dossiers", el("div", {},
      projets.map(function (p) {
        var blocs = REGLES.blocages(p.id).filter(function (b) { return b.type !== "infere-non-contresigne"; }).length;
        return UI.fileItem(premierVisuel(p), p.nom,
          p.ref + (blocs ? "  ·  " + blocs + (blocs > 1 ? " blocages" : " blocage") : "  ·  rien ne bloque"),
          p.id === courant.id ? "ouvert" : null,
          function () { dernierProjet = p.id; PANNEAU.fermer(); location.hash = "#/projets/" + p.id; });
      })));
  }

  function moi() {
    var p = DEPOT.liste("personnes").filter(function (x) { return x.poste === MAISON.titulaire; })[0];
    return p ? p.nom : O.poste(MAISON.titulaire).nom;
  }

  function initiales(nom) {
    return String(nom).split(/\s+/).slice(0, 2).map(function (m) { return m[0]; }).join("").toUpperCase();
  }

  function sectionsDe(p) { return VUE_PROJETS.sectionsDe(p); }

  /* ————————————————————— Le fil et la recherche ————————————————————— */

  function chapeau() {
    var r = piste();
    var fil = [el("a", { href: "#/" + r.vue.cle }, r.vue.nom.charAt(0) + r.vue.nom.slice(1).toLowerCase())];
    if (r.arg) {
      var p = DEPOT.trouve("projets", r.arg);
      if (p) {
        fil.push(el("span", {}, " / "));
        fil.push(el("a", { href: "#/projets/" + p.id }, p.nom));
        if (r.sous) {
          fil.push(el("span", {}, " / "));
          fil.push(el("b", {}, VUE_PROJETS.nomSection(r.sous)));
        }
      }
    }

    var champ = el("input", { type: "search", placeholder: "Rechercher…", "aria-label": "Rechercher" });
    var resultats = el("div.resultats", { style: { display: "none" } });

    champ.addEventListener("input", function () {
      var q = champ.value.trim();
      O.vider(resultats);
      if (q.length < 2) { resultats.style.display = "none"; return; }
      var t = chercher(q);
      if (!t.length) resultats.appendChild(el("button", { type: "button" }, el("span.quoi", {}, "Rien trouvé")));
      t.slice(0, 20).forEach(function (x) {
        resultats.appendChild(el("button", {
          type: "button",
          onclick: function () { resultats.style.display = "none"; champ.value = ""; location.hash = x.lien; },
        }, el("span.quoi", {}, x.quoi), el("span.ou", {}, x.ou)));
      });
      resultats.style.display = "block";
    });
    champ.addEventListener("blur", function () { setTimeout(function () { resultats.style.display = "none"; }, 200); });

    return el("div.chapeau", {},
      el("div.fil", {}, fil),
      el("div.chapeau-outils", {},
        champ,
        el("button.b.nu", { type: "button", onclick: CAPTURE.ouvrir, title: "Capture rapide ⌘K" }, "✎"),
        resultats
      )
    );
  }

  function chercher(q) {
    var t = [];
    DEPOT.liste("projets").forEach(function (p) {
      if (O.contient(p.nom + " " + p.ref, q)) t.push({ quoi: p.nom, ou: p.ref, lien: "#/projets/" + p.id });
      (p.livrables || []).forEach(function (l) {
        var m = DEPOT.trouve("marches", l.marche);
        if (O.contient(l.nom + " " + (m ? m.nom + " " + m.code : ""), q))
          t.push({ quoi: l.nom + (m ? " · " + m.code : ""), ou: p.ref + " · livrable", lien: "#/projets/" + p.id + "/livrables" });
      });
      (p.sections.pistes || []).forEach(function (pi) {
        if (O.contient(pi.titre + " " + (pi.concept || ""), q))
          t.push({ quoi: pi.titre, ou: p.ref + " · piste", lien: "#/projets/" + p.id + "/pistes" });
      });
    });
    ["marches", "supports", "assets"].forEach(function (type) {
      DEPOT.liste(type).forEach(function (x) {
        if (O.contient(x.nom + " " + (x.code || "") + " " + (x.source || ""), q))
          t.push({ quoi: x.nom, ou: type.slice(0, -1), lien: "#/referentiel" });
      });
    });
    DEPOT.liste("attentes").forEach(function (a) {
      if (O.contient((a.quoi || "") + " " + (a.critere || ""), q))
        t.push({ quoi: a.quoi, ou: "attente", lien: "#/attentes" });
    });
    return t;
  }

  /* ————————————————————— Rendu ————————————————————— */

  function rendre() {
    var r = piste();

    var nouveauRail = rail();
    if (railNoeud && railNoeud.parentNode) railNoeud.parentNode.replaceChild(nouveauRail, railNoeud);
    else document.body.insertBefore(nouveauRail, document.body.firstChild);
    railNoeud = nouveauRail;

    O.vider(corps);
    corps.appendChild(chapeau());
    var zone = el("div.zone");
    corps.appendChild(zone);
    r.vue.vue().rendre(zone, r.arg, r.sous);
    window.scrollTo(0, 0);
  }

  function demarrer() {
    corps = document.getElementById("corps");

    /* localStorage est propre à un navigateur : ouvrir la même adresse ailleurs
     * donnait un autre contenu, et l'exemple d'amorce l'emportait. La règle est
     * renversée — un dépôt de référence servi à côté de l'application gagne
     * toujours sur l'exemple, et deux navigateurs convergent d'eux-mêmes. */
    /* L'amorçage se raconte. Un écran qui montre l'exemple alors qu'un vrai
     * dépôt est servi à côté n'est pas un détail d'affichage : c'est le
     * titulaire qui travaille sur des données qui ne sont pas les siennes. */
    var journalAmorce = [];
    function noter(x) { journalAmorce.push(x); window.__amorcage = journalAmorce; }

    var local = DEPOT.charger();
    var surExemple = local && AMORCE.present();
    noter("local=" + local + " surExemple=" + surExemple);

    if (local && !surExemple) DEPOT.rattacherAuFichier(function () { noter("rattaché"); rendre(); });

    if (!local || surExemple) {
      DEPOT.referenceDisponible(function (m) {
        noter("manifeste=" + (m ? m.reference : "aucun"));
        if (!m) {
          /* Rien à côté : l'exemple fait office, et le dit. */
          if (!local) { AMORCE.poser(); rendre(); }
          return;
        }
        DEPOT.chargerReference(m, function (ok) {
          noter("référence chargée=" + ok);
          if (!ok && !local) AMORCE.poser();
          rendre();
        });
      });
      if (!local) { AMORCE.poser(); noter("exemple posé en attendant"); }
    }

    window.addEventListener("hashchange", function () { PANNEAU.fermer(); rendre(); });
    document.addEventListener("keydown", function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      var k = e.key.toLowerCase();
      if (k === "k") { e.preventDefault(); CAPTURE.ouvrir(); }
      if (k === "r") { e.preventDefault(); RENVOI.ouvrir({}); }
      if (k === "f") { e.preventDefault(); var c = document.querySelector(".chapeau-outils input"); if (c) c.focus(); }
    });
    rendre();
  }

  return { demarrer: demarrer, rendre: rendre, chercher: chercher, moi: moi };
})();

/* ————————————————————— La capture rapide ————————————————————— */

window.CAPTURE = (function () {
  var el = O.el;
  var ouvert = null;

  function ouvrir() {
    if (ouvert) return;
    var champ = el("input", { type: "text", placeholder: "Note ça — on rangera au moment de la revue" });
    var pile = DEPOT.liste("captures").filter(function (c) { return !c.range; });

    var boite = el("div.capture-fond", { onclick: function (e) { if (e.target === boite) fermer(); } },
      el("div.capture-boite", {},
        champ,
        el("div.capture-pied", {},
          el("span", {}, "Entrée pour poser · Échap pour fermer"),
          el("span", {}, pile.length + " en attente de rangement")
        )
      )
    );

    champ.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && champ.value.trim()) {
        DEPOT.ajoute("captures", { texte: champ.value.trim(), range: false });
        champ.value = ""; fermer(); APP.rendre();
      }
      if (e.key === "Escape") fermer();
    });

    document.body.appendChild(boite);
    ouvert = boite;
    champ.focus();
  }

  function fermer() { if (ouvert) { document.body.removeChild(ouvert); ouvert = null; } }

  return { ouvrir: ouvrir, fermer: fermer };
})();

document.addEventListener("DOMContentLoaded", function () { APP.demarrer(); });
