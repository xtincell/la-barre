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

  function liste(l, numero) {
    return (l.annotations || []).filter(function (a) { return !numero || Number(a.version || 1) === Number(numero); });
  }

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

  /* `auteur` est une personne du référentiel. Sans elle, `auteurLibre` dit qui
   * l'a posé (la personne connectée par La Fusée, ou le poste) ; sans l'un ni
   * l'autre, le retour est celui du client, comme il l'a toujours été. */
  function poser(l, x, y, texte, auteur, instant, auteurLibre) {
    if (!l.annotations) l.annotations = [];
    var quand = new Date().toISOString();
    var a = {
      id: O.id("AN"), x: x, y: y, texte: texte, auteur: auteur || null,
      /* Sur un livrable qui dure, c'est l'instant qui situe le retour. */
      instant: (instant === null || instant === undefined) ? null : Math.round(instant * 10) / 10,
      quand: quand, statut: "aTraiter", version: l.version || 1,
      reprise: estReprise(l, quand),
    };
    if (!auteur && auteurLibre) a.auteurLibre = auteurLibre;
    l.annotations.push(a);
    return a;
  }

  /* Qui a posé un retour, tel qu'on le lit. */
  function auteurDe(a) {
    var pers = a && a.auteur ? DEPOT.trouve("personnes", a.auteur) : null;
    return pers ? pers.nom : (a && a.auteurLibre) || "client";
  }

  function marquer(l, id, statut) {
    liste(l).forEach(function (a) { if (a.id === id) { a.statut = statut; a.traite_le = new Date().toISOString(); } });
    DEPOT.enregistrer();
  }

  /* ————————————————————— L'écran d'annotation ————————————————————— */

  function ouvrir(p, l, apres, numero) {
    var choisie = null;
    var boite = el("div.an-scene");
    var cote = el("div.an-cote");

    function dessiner() {
      O.vider(boite);
      O.vider(cote);

      /* Un livrable qui dure ne s'annote pas au même endroit qu'une image :
       * un point à 50 % / 50 % sur un film ne veut rien dire, un instant si.
       * Le lecteur reste le juge — on annote là où il est arrêté. */
      var source = numero && IMAGE.source(l);
      var objet = source && !IMAGE.estVideo(source) ? Object.assign({}, l, { vignette: source }) : l;
      var medium = IMAGE.media(objet, "toile");
      var film = medium.video || null;
      var ann = liste(l, numero);

      var toile = el("div.an-toile" + (film ? ".film" : ""), film ? {} : {
        onclick: function (e) {
          if (e.target.closest(".an-point")) return;
          var r = toile.getBoundingClientRect();
          var x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
          var y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
          nouvelle(p, l, x, y, function () { dessiner(); if (apres) apres(); }, null, numero);
        },
      }, medium);

      if (!film) {
        ann.forEach(function (a, i) {
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
              film.currentTime, numero);
          } }, "Noter cet instant"),
          el("span.anf-a", {}, "Le film s'arrête, et le retour porte le temps où il "
            + "s'est arrêté. « à 0:12 » se retrouve ; « au milieu » ne se retrouve pas.")));
      } else {
        boite.appendChild(el("div.an-aide", {}, numero
          ? el("button.b.nu", { type: "button", onclick: function () {
            nouvelle(p, l, 50, 50, function () { dessiner(); if (apres) apres(); }, null, numero);
          } }, "Annoter le centre du visuel") : null,
          el("span", {}, "Cliquer sur le visuel pose un point.")));
      }

      /* La colonne des retours */
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
        cote.appendChild(el("p.rien", {}, "Aucun retour. Cliquez sur le visuel pour en poser un."));
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
            el("span", {}, auteurDe(a) + " · " + O.joli(a.quand) + " · V" + a.version)
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
    PANNEAU.ouvrir(window.KV && KV.titre ? KV.titre(l) : l.nom, "Annoter", el("div.an", {}, boite, cote));
  }

  function nouvelle(p, l, x, y, apres, instant, numero) {
    var champ = el("textarea", { id: "annotation-texte", rows: 2,
      placeholder: instant !== null && instant !== undefined
        ? "Ce qui ne va pas à " + tc(instant) + ", en une phrase"
        : "Ce qui ne va pas, en une phrase" });
    /* Un retour posé ici est d'abord celui de qui le pose : la personne de ce
     * poste, ou la personne connectée. « Le client » reste un choix explicite :
     * oublier de changer ce champ n'attribue plus sa remarque au client. */
    var moi = window.ACTEUR ? ACTEUR.personne() : null;
    var selAuteur = el("select", { id: "annotation-auteur" });
    if (!moi) selAuteur.appendChild(el("option", { value: "" }, "Moi · " + (window.ACTEUR ? ACTEUR.nom() : "ce poste")));
    DEPOT.liste("personnes").forEach(function (pe) {
      selAuteur.appendChild(el("option", { value: pe.id }, pe.nom + (moi && moi.id === pe.id ? " (moi)" : "")));
    });
    selAuteur.appendChild(el("option", { value: "client" }, "Le client"));
    selAuteur.value = moi ? moi.id : "";

    var reprise = estReprise(l, new Date().toISOString());

    var sous = PANNEAU.sur("Poser un retour",
      (instant !== null && instant !== undefined ? "à " + tc(instant) + "  ·  " : "") + (window.KV && KV.titre ? KV.titre(l) : l.nom),
      el("div", {},
      reprise
        ? UI.banniere("rouge", "Ce livrable a déjà été validé. Ce retour ouvrira une reprise — il sera compté, pas absorbé en silence.")
        : null,
      el("div.form", {},
        el("div.champ", {}, el("label", { for: "annotation-texte" }, "Le retour"), champ),
        el("div.champ", {}, el("label", { for: "annotation-auteur" }, "De qui"), selAuteur)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Écrivez le retour avant de le poser."); champ.focus(); return; }
          if (numero && Number(l.version || 1) !== Number(numero)) { AVIS.refus("La version du visuel a changé. Rouvrez la revue."); return; }
          var qui = selAuteur.value;
          poser(l, x, y, champ.value.trim(), qui && qui !== "client" ? qui : null, instant,
            qui ? null : window.ACTEUR ? ACTEUR.nom() : null);
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
    ouvrir: ouvrir, nouvelle: nouvelle, auteur: auteurDe, total: total, ETATS: ETATS };
})();
