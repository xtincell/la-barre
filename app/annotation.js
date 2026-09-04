/* annotation.js — le feedback posé sur le visuel.
 *
 * Un retour qui vit dans un message ne se traite jamais : il n'a ni cible, ni
 * état, ni auteur opposable. Ici il est un point sur une image, avec son auteur,
 * sa date, et son coût — parce qu'une annotation qui arrive après validation
 * n'est pas un commentaire, c'est une reprise.
 */

window.ANNOT = (function () {
  var el = O.el;

  var ETATS = {
    aTraiter: { nom: "à traiter", ton: "attente" },
    traite: { nom: "traité", ton: "vert" },
    ecarte: { nom: "écarté", ton: "terne" },
  };

  function liste(l) { return (l.annotations || []).slice(); }

  function ouvertes(l) {
    return liste(l).filter(function (a) { return a.statut === "aTraiter"; });
  }

  /* Une annotation posée après une validation est une reprise, pas un retour. */
  function estReprise(l, quand) {
    var validee = (l.versions || []).some(function (v) {
      return v.verdict === "approuve" && v.juge_le && new Date(v.juge_le) < new Date(quand);
    });
    return validee;
  }

  /* Un instant se lit « 0:12 », pas « 12.4 secondes ». */
  function tc(s) {
    if (s === null || s === undefined) return "";
    var n = Math.max(0, Math.round(s));
    return Math.floor(n / 60) + ":" + (n % 60 < 10 ? "0" : "") + (n % 60);
  }

  function poser(l, x, y, texte, auteur, instant) {
    if (!l.annotations) l.annotations = [];
    var quand = new Date().toISOString();
    var a = {
      id: O.id("AN"), x: x, y: y, texte: texte, auteur: auteur || null,
      /* Sur une pièce qui dure, c'est l'instant qui situe le retour. */
      instant: (instant === null || instant === undefined) ? null : Math.round(instant * 10) / 10,
      quand: quand, statut: "aTraiter", version: l.version || 1,
      reprise: estReprise(l, quand),
    };
    l.annotations.push(a);
    return a;
  }

  function marquer(l, id, statut) {
    liste(l).forEach(function (a) { if (a.id === id) { a.statut = statut; a.traite_le = new Date().toISOString(); } });
    DEPOT.enregistrer();
  }

  /* ————————————————————— L'écran d'annotation ————————————————————— */

  function ouvrir(p, l, apres) {
    var choisie = null;
    var boite = el("div.an-scene");
    var cote = el("div.an-cote");

    function dessiner() {
      O.vider(boite);
      O.vider(cote);

      /* Une pièce qui dure ne s'annote pas au même endroit qu'une image :
       * un point à 50 % / 50 % sur un film ne veut rien dire, un instant si.
       * Le lecteur reste le juge — on annote là où il est arrêté. */
      var medium = IMAGE.media(l, "toile");
      var film = medium.video || null;

      var toile = el("div.an-toile" + (film ? ".film" : ""), film ? {} : {
        onclick: function (e) {
          if (e.target.closest(".an-point")) return;
          var r = toile.getBoundingClientRect();
          var x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
          var y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
          nouvelle(p, l, x, y, function () { dessiner(); if (apres) apres(); });
        },
      }, medium);

      if (!film) {
        liste(l).forEach(function (a, i) {
          if (a.instant !== null && a.instant !== undefined) return;
          toile.appendChild(el("button.an-point." + ETATS[a.statut].ton
            + (choisie === a.id ? ".actif" : ""), {
            type: "button",
            style: { left: a.x + "%", top: a.y + "%" },
            title: a.texte,
            onclick: function (e) { e.stopPropagation(); choisie = a.id; dessiner(); },
          }, String(i + 1)));
        });
      }
      boite.appendChild(toile);

      if (film) {
        boite.appendChild(el("div.an-film", {},
          el("button.b.or", { type: "button", onclick: function () {
            film.pause();
            nouvelle(p, l, null, null, function () { dessiner(); if (apres) apres(); },
              film.currentTime);
          } }, "Noter cet instant"),
          el("span.anf-a", {}, "Le film s'arrête, et le retour porte le temps où il "
            + "s'est arrêté. « à 0:12 » se retrouve ; « au milieu » ne se retrouve pas.")));
      } else {
        boite.appendChild(el("div.an-aide", {}, "Cliquer sur le visuel pose un point."));
      }

      /* La colonne des retours */
      var ann = liste(l);
      var ouvertesN = ann.filter(function (a) { return a.statut === "aTraiter"; }).length;
      var reprises = ann.filter(function (a) { return a.reprise && a.statut === "aTraiter"; }).length;

      cote.appendChild(el("div.an-tete", {},
        el("span", {}, !ann.length ? "aucun retour"
          : ann.length + (ann.length > 1 ? " retours" : " retour")),
        ouvertesN ? el("span.an-o.alerte", {}, ouvertesN + " à traiter") : null
      ));

      if (reprises) {
        cote.appendChild(UI.banniere("rouge", reprises + (reprises > 1 ? " retours arrivent" : " retour arrive")
          + " après une validation — c'est une reprise, pas une correction."));
      }

      if (!ann.length) {
        cote.appendChild(el("p.rien", {}, "Aucun retour. Clique sur le visuel pour en poser un."));
      }

      ann.forEach(function (a, i) {
        var pers = a.auteur ? DEPOT.trouve("personnes", a.auteur) : null;
        cote.appendChild(el("div.an-l" + (choisie === a.id ? ".actif" : "") + "." + ETATS[a.statut].ton, {
          onclick: function () { choisie = a.id; dessiner(); },
        },
          el("div.anl-tete", {},
            a.instant !== null && a.instant !== undefined
              ? el("button.anl-tc", { type: "button", title: "revoir cet instant",
                  onclick: function (e) {
                    e.stopPropagation();
                    if (film) { film.currentTime = a.instant; film.play(); }
                  } }, tc(a.instant))
              : el("span.anl-n", {}, String(i + 1)),
            el("span.anl-texte", {}, a.texte),
            a.reprise ? UI.eti("reprise", "alerte") : null
          ),
          el("div.anl-meta", {},
            pers ? UI.avatar(pers, 18) : null,
            el("span", {}, (pers ? pers.nom : a.auteurLibre || "client") + " · " + O.joli(a.quand) + " · V" + a.version)
          ),
          a.statut === "aTraiter"
            ? el("div.anl-gestes", {},
                el("button.b.nu", { type: "button", onclick: function (e) {
                  e.stopPropagation(); marquer(l, a.id, "traite"); dessiner(); if (apres) apres();
                } }, "traité"),
                el("button.b.nu", { type: "button", onclick: function (e) {
                  e.stopPropagation();
                  PANNEAU.demander("Écarter ce retour", {
                    etiquette: a.texte.slice(0, 60), label: "Pourquoi", lignes: 2,
                    aide: "Écarter un retour sans motif, c'est le laisser revenir la fois suivante.",
                    requis: "Un retour écarté sans motif reviendra.",
                    bouton: "Écarter",
                  }, function (m) {
                    a.motifEcart = m; marquer(l, a.id, "ecarte"); dessiner(); if (apres) apres();
                  });
                } }, "écarter"))
            : el("div.anl-etat", {}, ETATS[a.statut].nom
                + (a.motifEcart ? " — " + a.motifEcart : "")),
        ));
      });
    }

    dessiner();
    PANNEAU.ouvrir(l.nom, "annoter", el("div.an", {}, boite, cote));
  }

  function nouvelle(p, l, x, y, apres, instant) {
    var champ = el("textarea", { rows: 2,
      placeholder: instant !== null && instant !== undefined
        ? "Ce qui ne va pas à " + tc(instant) + ", en une phrase"
        : "Ce qui ne va pas, en une phrase" });
    var selAuteur = el("select", {});
    selAuteur.appendChild(el("option", { value: "" }, "— le client —"));
    DEPOT.liste("personnes").forEach(function (pe) {
      selAuteur.appendChild(el("option", { value: pe.id }, pe.nom));
    });

    var reprise = estReprise(l, new Date().toISOString());

    var sous = PANNEAU.sur("Poser un retour",
      (instant !== null && instant !== undefined ? "à " + tc(instant) + "  ·  " : "") + l.nom,
      el("div", {},
      reprise
        ? UI.banniere("rouge", "Ce livrable a déjà été validé. Ce retour ouvrira une reprise — il sera compté, pas absorbé en silence.")
        : null,
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Le retour"), champ),
        el("div.champ", {}, el("label", {}, "De qui"), selAuteur)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Un retour sans texte n'est pas un retour."); return; }
          poser(l, x, y, champ.value.trim(), selAuteur.value || null, instant);
          DEPOT.tracer("annotation", "livrables", p.id,
            l.nom + (instant !== null && instant !== undefined ? " à " + tc(instant) : "")
            + " — " + champ.value.trim().slice(0, 40));
          DEPOT.enregistrer();
          PANNEAU.fermerSur();
          apres();
        } }, "Poser"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
    return sous;
  }

  /* Combien de retours ouverts, tous projets confondus. */
  function total() {
    var n = 0;
    DEPOT.liste("projets").forEach(function (p) {
      (p.livrables || []).forEach(function (l) { n += ouvertes(l).length; });
    });
    return n;
  }

  return { tc: tc, liste: liste, ouvertes: ouvertes, poser: poser, marquer: marquer,
    ouvrir: ouvrir, total: total, ETATS: ETATS };
})();
