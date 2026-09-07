/* vue-attentes.js — ce qu'on me doit, et depuis combien de temps.
 *
 * Deux listes se ressemblaient sans que la différence se voie : les renvois
 * que j'ai formulés, et les modifications que je constate sans les avoir
 * réclamées. Le lecteur devait résoudre lui-même la classification.
 *
 * Ici le TEMPS est l'axe. Chaque dette est une barre dont la longueur est son
 * âge : on lit le retard avant de lire le texte. Et le groupement se fait par
 * DÉBITEUR, pas par type — savoir chez qui ça dort vaut mieux que savoir de
 * quelle catégorie ça relève.
 */

window.VUE_ATTENTES = (function () {
  var el = O.el;
  var montrerResolues = false;

  /* ————————————————————— Le relevé, par débiteur ————————————————————— */

  /* Tout ce qui m'est dû, d'où que ça vienne, rapporté à une personne ou à un
   * poste. Un écart n'a pas toujours de destinataire nommé : il a toujours un
   * poste souverain, et c'est déjà chez quelqu'un. */
  function dettes() {
    var par = {};
    function chez(cle, nom, poste, personne) {
      if (!par[cle]) par[cle] = { cle: cle, nom: nom, poste: poste, personne: personne, l: [] };
      return par[cle];
    }

    DEPOT.liste("attentes").filter(function (a) { return !a.resolu_le; }).forEach(function (a) {
      var pe = a.destinataire ? DEPOT.trouve("personnes", a.destinataire) : null;
      var g = chez(a.destinataire || "sans", pe ? pe.nom : "Destinataire non nommé",
        pe ? O.poste(pe.poste).nom : null, pe);
      g.l.push({ quoi: a.quoi, age: O.depuis(a.envoye_le), critere: a.critere,
        source: "renvoi formulé", attente: a });
    });

    ECARTS.tous().filter(function (x) { return !x.ecarte; }).forEach(function (x) {
      var d = ECARTS.def(x.origine);
      var pe = x.responsable ? DEPOT.trouve("personnes", x.responsable) : null;
      var cle = pe ? pe.id : "poste:" + x.origine;
      var g = chez(cle, pe ? pe.nom : d.qui.charAt(0).toUpperCase() + d.qui.slice(1),
        pe ? O.poste(pe.poste).nom : d.nom, pe);
      g.l.push({ quoi: x.quoi, age: x.quand ? O.depuis(x.quand) : 0,
        critere: x.cout || d.quoi, source: "constaté, non réclamé", ecart: x, ton: d.ton,
        origine: d.nom });
    });

    var out = Object.keys(par).map(function (k) {
      var g = par[k];
      g.l.sort(function (a, b) { return b.age - a.age; });
      g.pire = g.l.length ? g.l[0].age : 0;
      return g;
    });
    return out.sort(function (a, b) { return b.pire - a.pire; });
  }

  function rendre(hote) {
    O.vider(hote);
    var groupes = dettes();
    var total = groupes.reduce(function (n, g) { return n + g.l.length; }, 0);
    var pire = groupes.reduce(function (n, g) { return Math.max(n, g.pire); }, 0);
    var echelle = Math.max(5, Math.ceil(pire / 5) * 5);

    if (!total) {
      hote.appendChild(UI.banniere("vert", "Rien ne m'est dû. Les livrables tiennent le brief, "
        + "la plateforme et les critères, et aucun renvoi n'attend de retour."));
      return;
    }

    hote.appendChild(el("div.at", {},
      el("div.at-tete", {},
        el("h3", {}, total + (total > 1 ? " choses me sont dues" : " chose m'est due")),
        el("p", {}, (pire ? "La plus vieille depuis " + pire + (pire > 1 ? " jours. " : " jour. ") : "")
          + "Le seul endroit où le retard des autres est visible sans avoir à les déranger.")),

      /* L'axe du temps, une fois pour toutes : les barres s'y rapportent. */
      el("div.at-axe", {}, [0, 0.25, 0.5, 0.75, 1].map(function (t) {
        return el("span.ata", { style: { left: (t * 100) + "%" } },
          Math.round(t * echelle) + (t === 1 ? " jours" : ""));
      })),

      el("div.at-g", {}, groupes.map(function (g) { return groupe(g, echelle, hote); })),

      montrerResolues ? resolues() : null,
      el("div.at-pied", {},
        el("button.b.nu", { type: "button",
          onclick: function () { montrerResolues = !montrerResolues; rendre(hote); } },
          montrerResolues ? "masquer les résolues" : "voir les résolues"))
    ));
  }

  function groupe(g, echelle, hote) {
    return el("div.at-d", {},
      el("div.atd-q", {},
        g.personne ? UI.avatar(g.personne, 36) : UI.avatar(null, 36),
        el("div", {},
          el("div.atdq-n", {}, g.nom),
          g.poste ? el("div.atdq-p", {}, g.poste) : null,
          el("div.atdq-c", {}, g.l.length + (g.l.length > 1 ? " choses dues" : " chose due")),
          /* L'origine se dit une fois pour le groupe, pas à chaque ligne. */
          (function () {
            var o = {}; g.l.forEach(function (x) { if (x.origine) o[x.origine] = 1; });
            var k = Object.keys(o);
            return k.length ? el("div.atdq-o", {}, k.join(" · ")) : null;
          })())),

      el("div.atd-b", {}, g.l.map(function (x) {
        var part = Math.max(6, Math.round((x.age / echelle) * 100));
        var ton = x.age >= 15 ? "alerte" : x.age >= 7 ? "attente" : "calme";
        return el("div.at-x", {},
          el("button.atx-b." + ton, { type: "button",
            style: { width: part + "%" },
            title: x.quoi,
            onclick: function () { agir(x, hote); } },
            el("span", {}, x.quoi)),
          el("span.atx-j." + ton, {}, x.age + " j"),
          el("span.atx-k", {}, x.critere || x.source));
      })));
  }

  /* Le geste : réclamer. L'outil n'envoie rien — il écrit. */
  function agir(x, hote) {
    if (x.attente) { messagePret(x.attente, hote); return; }
    var e = x.ecart;
    RENVOI.ouvrir({ quoi: e.quoi, projet: e.projet.ref, projetId: e.projet.id,
      objet: e.livrable ? e.livrable.id : null, motif: e.quoi });
  }

  /* Le message part rédigé : l'outil n'envoie rien, il écrit. C'est le geste
   * central du poste, et il n'a jamais eu de place à lui. */
  function messagePret(a, hote) {
    var pe = a.destinataire ? DEPOT.trouve("personnes", a.destinataire) : null;
    var zone = el("textarea", { rows: 12 });
    zone.value = a.message || "";
    PANNEAU.ouvrir(pe ? pe.nom : "Le destinataire",
      "dû depuis " + O.depuis(a.envoye_le) + " j", el("div", {},
      UI.banniere("", "L'outil n'envoie rien. Il écrit — et il rappelle tant que ce n'est pas revenu."),
      a.critere ? PANNEAU.ligne("Le critère opposé", a.critere) : null,
      a.attendu ? PANNEAU.ligne("Ce qui est attendu", a.attendu) : null,
      a.echeance ? PANNEAU.ligne("Pour le", O.joli(a.echeance)) : null,
      el("div.form", {}, el("div.champ", {}, el("label", {}, "Le message"), zone)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          zone.select();
          try { document.execCommand("copy"); } catch (e) { /* presse-papier fermé */ }
          AVIS.fait("Message copié. À porter par ton canal.");
        } }, "Copier le message"),
        el("button.b.vert", { type: "button", onclick: function () {
          RENVOI.resoudre(a.id); PANNEAU.fermer(); rendre(hote);
        } }, "C'est revenu"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Fermer"))
    ));
  }

  function resolues() {
    var r = DEPOT.liste("attentes").filter(function (a) { return a.resolu_le; });
    if (!r.length) return el("p.rien", {}, "Aucune attente résolue pour l'instant.");
    return el("div.at-res", {},
      el("div.atr-t", {}, "REVENUES  ·  " + r.length),
      r.map(function (a) {
        var j = Math.max(0, Math.round((new Date(a.resolu_le) - new Date(a.envoye_le)) / 86400000));
        return el("div.atr-x", {},
          el("span", {}, a.quoi),
          el("span.atr-j", {}, "rendue en " + j + (j > 1 ? " jours" : " jour")));
      }));
  }

  function lesPieces(x, hote) {
    PANNEAU.ouvrir(x.niveau.nom + " — l'onde", x.onde.assets + " livrables", el("div", {},
      el("div.fb-texte", {}, x.quoi),
      UI.banniere(x.niveau.ton === "alerte" ? "rouge" : "", x.niveau.onde + ".  " + x.niveau.avant),
      el("div.rt-mur", { style: { "margin-top": ".8rem" } }, x.onde.pieces.map(function (l) {
        return el("button.rt-c", { type: "button", onclick: function () {
          PANNEAU.fermer(); VUE_ASSET.ouvrir(x.projet, l, function () { rendre(hote); }); } },
          IMAGE.vignette(l, "planche"),
          el("span.rtc-bas", {},
            el("span.rtc-n", {}, l.nom),
            el("span.rtc-m", {}, KV.NIVEAUX[KV.niveau(l)].nom + " · V" + (l.version || 1))));
      }))));
  }

  return { rendre: rendre, titre: "Mes attentes" };
})();
