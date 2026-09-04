/* vue-jurisprudence.js — ce qui reste quand je ne suis pas dans la pièce.
 *
 * Cinquième mode de Constater. Trois lectures d'un même recueil :
 *
 *   par critère  — comment j'ai tranché les N dernières fois qu'on l'a invoqué
 *   à écrire     — les motifs récurrents qu'aucun critère ne porte encore
 *   tout         — le fil, cherchable
 *
 * L'écran ne demande rien. Son seul geste est d'ajouter un critère à la maison
 * quand le recueil montre qu'il en manque un — et c'est exactement comme ça
 * qu'un référentiel se remplit : par l'usage, pas en préalable.
 */

window.VUE_JURISPRUDENCE = (function () {
  var el = O.el;
  var q = "";
  var ouvert = null;
  var toutLeFil = false;

  function rendre(hote, rafraichir) {
    var e = JURISPRUDENCE.etat();

    /* Une seule page. Ce qui demande à devenir un critère passe devant : c'est
     * le seul endroit du produit où le référentiel se complète tout seul. Le
     * corpus vient après, en matière de consultation. */
    return el("div.ju", {},
      bande(e),
      aEcrire(e, rafraichir),
      parCritere(rafraichir),
      el("div.ju-fil", {},
        el("button.b.nu", { type: "button",
          onclick: function () { toutLeFil = !toutLeFil; rafraichir(); } },
          toutLeFil ? "masquer le fil" : "le fil des " + e.total + " arbitrages"),
        toutLeFil ? leFil(rafraichir) : null)
    );
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(e) {
    return UI.recevabilite(
      "Quelqu'un pourrait-il trancher comme moi sans moi ?",
      [
        { quoi: "Des arbitrages écrits", ok: e.total >= 5, poids: 5,
          cout: e.total
            ? "seulement " + e.total + (e.total > 1 ? " arbitrages motivés" : " arbitrage motivé")
              + " au dépôt : trop peu pour qu'une ligne se dégage"
            : "aucun arbitrage motivé : le poste ne se transmet pas, il se subit" },
        { quoi: "Adossés à un critère", ok: e.total > 0 && e.libres <= e.surCritere, poids: 4,
          cout: e.libres + " sur " + e.total + " tranchés au jugement seul, sans critère écrit — "
            + "défendables par moi, indéfendables par un autre" },
        { quoi: "Des critères établis", ok: e.criteresEtablis > 0, poids: 4,
          cout: "aucun critère n'a servi trois fois : rien n'est encore une jurisprudence, "
            + "tout est encore une décision" },
        { quoi: "Rien d'incohérent", ok: e.incoherents.length === 0, poids: 3,
          cout: e.incoherents.length + (e.incoherents.length > 1 ? " critères ont été tranchés" : " critère a été tranché")
            + " dans les deux sens : c'est le critère qui est mal écrit, pas la décision" },
      ], null, []);
  }

  /* ————————————————————— Par critère ————————————————————— */

  function parCritere(rafraichir) {
    var lignes = JURISPRUDENCE.parCritere();
    var titre = el("div.jue-t", {}, "LE CORPUS  ·  COMMENT J'AI TRANCHÉ");
    var servis = lignes.filter(function (x) { return x.cas.length; });
    var jamais = lignes.filter(function (x) { return !x.cas.length; });

    return el("div.ju-c", {}, titre,
      servis.length
        ? el("div.ju-liste", {}, servis.map(function (x) { return critere(x, rafraichir); }))
        : el("p.rien", {}, "Aucun critère écrit n'a encore servi. Ils existent dans la maison ; "
            + "ils entrent au recueil au premier refus qui s'y adosse."),

      jamais.length
        ? el("div.ju-jamais", {},
            el("div.jub-t", {}, "JAMAIS INVOQUÉS",
              el("span", {}, jamais.length + " sur " + lignes.length)),
            el("p.jum", {}, "Un critère qui ne sert jamais est soit inutile, soit oublié au "
              + "moment de refuser. Les deux se corrigent — l'un en le retirant, l'autre en "
              + "le relisant avant la revue."),
            el("div.ju-jl", {}, jamais.map(function (x) {
              return el("span.juj", {}, x.critere.texte);
            })))
        : null
    );
  }

  function critere(x, rafraichir) {
    var ici = ouvert === x.critere.cle;
    var c = x.constance;

    return el("div.ju-cr" + (ici ? ".ici" : "") + (c && c.eclate ? ".eclate" : ""), {},
      el("button.jucr-t", { type: "button",
        onclick: function () { ouvert = ici ? null : x.critere.cle; rafraichir(); } },
        el("span.jucr-f", {}, x.critere.famille),
        el("span.jucr-n", {}, x.critere.texte),
        el("span.jucr-c", {}, x.cas.length + (x.cas.length > 1 ? " fois" : " fois")),
        el("span.jucr-e", {}, ici ? "−" : "+")),

      el("div.jucr-q", {}, x.etabli
        ? c && c.eclate
          ? "Tranché dans les deux sens — " + c.part + " % seulement vont dans le même sens. "
            + "Le critère est mal écrit : deux situations différentes s'y rangent."
          : "Établi : " + x.cas.length + " fois, " + (c ? c.part + " % dans le même sens" : "")
            + ". Un autre pourrait trancher pareil en lisant ces cas."
        : x.cas.length === 1
          ? "Une seule fois : c'est une décision, pas encore une jurisprudence."
          : x.cas.length + " fois : encore une de plus et la ligne se lira."),

      ici ? el("div.jucr-cas", {}, x.cas.map(cas)) : null
    );
  }

  function cas(a) {
    var v = MAISON.verdicts.filter(function (x) { return x.cle === a.verdict; })[0];
    return el("div.ju-cas", {},
      el("div.jucas-h", {},
        el("span.jucas-d", {}, O.joli(a.quand)),
        el("span.jucas-s", {}, a.def.nom),
        a.projet ? el("a.jucas-p", { href: "#/projets/" + a.projet.id }, a.projet.ref) : null,
        v ? el("span.jucas-v", { style: { color: v.couleur } }, v.signe + " " + v.nom) : null),
      el("div.jucas-o", {}, a.quoi),
      el("div.jucas-m", {}, a.motif));
  }

  /* ————————————————————— À écrire ————————————————————— */

  /* Le seul endroit du produit où le référentiel se complète tout seul : ce que
   * j'ai reproché plusieurs fois sans critère est un critère qui manque. */
  function aEcrire(e, rafraichir) {
    if (!e.aEcrire.length) {
      return el("div.ju-e", {},
        el("div.jue-t", {}, "CE QUI DEMANDE À DEVENIR UN CRITÈRE"),
        UI.banniere("vert", "Aucun motif récurrent hors critère. Tout ce que je refuse "
          + "plusieurs fois s'adosse déjà à une ligne écrite."),
        e.libres
          ? el("p.jum", {}, e.libres + " motifs libres au recueil, mais aucun ne se répète : "
              + "ce sont des cas d'espèce, et c'est très bien ainsi.")
          : null);
    }

    return el("div.ju-e", {},
      el("div.jue-t", {}, "CE QUI DEMANDE À DEVENIR UN CRITÈRE"),
      UI.banniere("", "Chacun de ces reproches a été formulé plusieurs fois à la main. "
        + "L'écrire comme critère, c'est le rendre opposable — et permettre à quelqu'un "
        + "d'autre de refuser sur le même fondement."),

      el("div.ju-liste", {}, e.aEcrire.map(function (g) {
        return el("div.ju-g", {},
          el("div.jug-t", {},
            el("span.jug-m", {}, g.mots.join(" · ")),
            el("span.jug-n", {}, g.cas.length + " fois"),
            g.existe
              ? el("span.jug-d", {}, "un critère dit déjà ça")
              : el("button.b.or", { type: "button", onclick: function () {
                  ecrire(g, rafraichir);
                } }, "en faire un critère")),
          g.existe
            ? el("div.jug-e", {}, "« " + g.existe.texte + " » — écrit sur "
                + g.existe.famille + ". Le choisir au moment du refus plutôt que "
                + "de le reformuler à la main : c'est ce qui le rend opposable.")
            : null,
          el("div.jug-cas", {}, g.cas.map(function (a) {
            return el("div.jug-c", {},
              el("span.jugc-d", {}, O.joli(a.quand)),
              el("span.jugc-m", {}, a.motif));
          })));
      })));
  }

  function ecrire(g, rafraichir) {
    var familles = Object.keys(MAISON.criteres);
    var sel = el("select", {});
    familles.forEach(function (f) {
      var o = el("option", { value: f }, f);
      if (f === g.famille) o.selected = true;
      sel.appendChild(o);
    });
    var champ = el("input", { type: "text",
      placeholder: "En une phrase, ce qui rend la pièce refusable" });

    PANNEAU.ouvrir("Écrire un critère", g.cas.length + " cas le réclament", el("div", {},
      UI.banniere("", "Un critère se rédige comme un fait vérifiable, pas comme un goût : "
        + "« la mécanique n'est lisible que dans un seul média » se constate, "
        + "« ce n'est pas assez fort » ne se constate pas."),
      el("div.ju-rappel", {}, g.cas.map(function (a) {
        return el("div.jugc-m", {}, "« " + a.motif + " »"); })),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Sur quoi il porte"), sel),
        el("div.champ", {}, el("label", {}, "Le critère"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var t = champ.value.trim();
          if (!t) { AVIS.refus("Un critère vide ne refuse rien."); return; }
          if (!MAISON.ajouterCritere(sel.value, t)) {
            AVIS.refus("Ce critère existe déjà sur " + sel.value + "."); return;
          }
          AVIS.fait("Critère ajouté à " + sel.value + ". Il apparaîtra dans la liste des "
            + "motifs au prochain refus, et il part avec l'export du dépôt.");
          PANNEAU.fermer(); rafraichir();
        } }, "Écrire le critère"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
    setTimeout(function () { champ.focus(); }, 40);
  }

  /* ————————————————————— Le fil ————————————————————— */

  function leFil(rafraichir) {
    var arbs = JURISPRUDENCE.chercher(q);
    var champ = el("input", { type: "search", value: q,
      placeholder: "Chercher dans les motifs — « lisible », « périmètre », « droits »…" });
    champ.oninput = function () { q = champ.value; rafraichir(); setTimeout(function () {
      var n = document.querySelector(".ju-rech input"); if (n) { n.focus();
        n.setSelectionRange(n.value.length, n.value.length); } }, 0); };

    return el("div.ju-f", {},
      el("div.ju-rech", {}, champ,
        el("span", {}, arbs.length + (arbs.length > 1 ? " arbitrages" : " arbitrage"))),
      arbs.length
        ? el("div.ju-liste", {}, arbs.map(function (a) {
            return el("div.ju-fc" + (a.critere ? ".sur" : ""), {},
              cas(a),
              el("div.jufc-c", {}, a.critere
                ? "critère : " + a.critere.texte
                : "au jugement seul — aucun critère écrit ne porte ce refus"));
          }))
        : el("p.rien", {}, q ? "Rien sur « " + q + " »."
            : "Le recueil est vide. Il se remplit tout seul : chaque verdict motivé y entre.")
    );
  }

  return { rendre: rendre };
})();
