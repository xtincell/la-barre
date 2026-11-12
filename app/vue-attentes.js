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

  var choisi = null;

  /* Les dettes identiques se regroupent : « « SK-2 » n'est pas distribué sur
   * ce marché », huit fois de suite, livrable par livrable, faisait lire la
   * même phrase au lieu de lire le retard. Une ligne par cause, et les
   * livrables qu'elle touche en méta. */
  function regrouper(l) {
    var par = {}, ordre = [];
    l.forEach(function (x) {
      var cle = (x.attente ? "a:" + x.attente.id : (x.quoi || "") + "|" + (x.critere || ""));
      if (!par[cle]) { par[cle] = { tete: x, l: [], age: 0 }; ordre.push(cle); }
      par[cle].l.push(x);
      par[cle].age = Math.max(par[cle].age, x.age || 0);
    });
    return ordre.map(function (k) { return par[k]; });
  }

  function ton(age) { return age >= 15 ? "alerte" : age >= 7 ? "attente" : "calme"; }

  function rendre(hote) {
    O.vider(hote);
    var groupes = dettes();
    var total = groupes.reduce(function (n, g) { return n + g.l.length; }, 0);
    var pire = groupes.reduce(function (n, g) { return Math.max(n, g.pire); }, 0);
    var echelle = Math.max(5, Math.ceil(pire / 5) * 5);

    if (!total) {
      hote.appendChild(el("div.studio-revue", {}, el("div.studio-vide", {},
        el("div.studio-vide-signe", { "aria-hidden": "true" }, "✓"),
        el("h3", {}, "Rien ne m'est dû."),
        el("p", {}, "Les livrables tiennent le brief, la plateforme et les critères, "
          + "et aucun renvoi n'attend de retour."),
        resoluesBouton(hote))));
      if (montrerResolues) hote.appendChild(resolues());
      return;
    }

    var g = groupes.filter(function (x) { return x.cle === choisi; })[0] || groupes[0];
    choisi = g.cle;
    var neuve = window.RENVOI && RENVOI.consommerDernier ? RENVOI.consommerDernier() : null;

    /* La grammaire du Bureau : la file, ce sont les débiteurs — savoir chez qui
     * ça dort vaut mieux que savoir de quelle catégorie ça relève. */
    hote.appendChild(el("section.studio-revue.du", { "aria-label": "Ce qui m'est dû" },
      el("div.studio-section-tete", {},
        el("h2", {}, "Chez qui ça dort", el("span.studio-compte", {}, String(groupes.length))),
        resoluesBouton(hote)),
      el("div.studio-table.du-table", {},
        el("div.studio-file", { "aria-label": "Débiteurs" }, groupes.map(function (d) {
          return el("button.studio-piece.du-debiteur" + (d.cle === g.cle ? ".active" : "") + ".f-" + ton(d.pire), {
            type: "button", "aria-pressed": d.cle === g.cle ? "true" : "false",
            onclick: function () { choisi = d.cle; rendre(hote); } },
            el("span.studio-piece-ref", {}, d.poste || "Destinataire non nommé"),
            el("strong", {}, d.nom),
            el("span", {}, d.l.length + (d.l.length > 1 ? " choses dues" : " chose due")),
            d.pire ? el("small", {}, "la plus vieille : " + d.pire + " j") : null);
        })),
        scene(g, echelle, hote, neuve),
        contexte(g)),
      montrerResolues ? resolues() : null));
  }

  function resoluesBouton(hote) {
    return el("button.studio-lien", { type: "button",
      onclick: function () { montrerResolues = !montrerResolues; rendre(hote); } },
      montrerResolues ? "Masquer les attentes revenues" : "Voir les attentes revenues");
  }

  /* Une ligne par cause. L'âge se lit avant le texte : un filet dont la
   * longueur est l'âge, sur l'échelle commune à tous les débiteurs. */
  function scene(g, echelle, hote, neuve) {
    var lignes = regrouper(g.l);
    return el("div.studio-scene.du-scene", {},
      el("div.studio-scene-tete", {},
        el("span", {}, lignes.length + (lignes.length > 1 ? " causes" : " cause") + " · "
          + g.l.length + (g.l.length > 1 ? " livrables touchés" : " livrable touché")),
        el("span", {}, "échelle : " + echelle + " jours")),
      el("ul.du-lignes", {}, lignes.map(function (r) {
        var x = r.tete, t = ton(r.age);
        var part = Math.max(3, Math.round((r.age / echelle) * 100));
        var cibles = r.l.map(function (y) { return y.ecart && y.ecart.livrable ? y.ecart.livrable.nom : null; })
          .filter(Boolean);
        var projets = {};
        r.l.forEach(function (y) { if (y.ecart && y.ecart.projet) projets[y.ecart.projet.ref || y.ecart.projet.id] = 1; });
        var li = el("li.du-ligne.f-" + t, {},
          el("div.dul-texte", {},
            el("span.dul-cat", {}, x.critere && x.critere !== x.quoi ? x.quoi : (x.origine || x.source)),
            el("strong", {}, x.critere || x.quoi),
            el("span.dul-meta", {}, [Object.keys(projets).join(", "),
              cibles.length ? cibles.slice(0, 2).join(" · ")
                + (cibles.length > 2 ? " et " + (cibles.length - 2) + " autres" : "") : null]
              .filter(Boolean).join(" — "))),
          el("div.dul-age", {},
            el("span.dul-j", {}, r.age + " j"),
            el("span.dul-barre", { "aria-hidden": "true" }, el("i", { style: { width: part + "%" } }))),
          el("button.studio-lien", { type: "button", onclick: function () { agir(x, hote, r.l.length); } },
            x.attente ? "Voir le message" : "Réclamer"));
        return neuve && x.id === neuve ? O.arrive(li) : li;
      })));
  }

  function contexte(g) {
    var origines = {};
    g.l.forEach(function (x) { if (x.origine) origines[x.origine] = (origines[x.origine] || 0) + 1; });
    return el("aside.studio-contexte.du-contexte", {},
      el("div.du-qui", {},
        g.personne ? UI.avatar(g.personne, 36) : UI.avatar(null, 36),
        el("div", {}, el("h3", {}, g.nom), g.poste ? el("small", {}, g.poste) : null)),
      el("dl", {},
        el("dt", {}, "Dû"), el("dd", {}, g.l.length + (g.l.length > 1 ? " choses" : " chose")),
        el("dt", {}, "La plus vieille"), el("dd", {}, g.pire + (g.pire > 1 ? " jours" : " jour")),
        Object.keys(origines).length ? [el("dt", {}, "D'où ça vient"),
          el("dd", {}, Object.keys(origines).map(function (o) { return o + " (" + origines[o] + ")"; }).join(" · "))] : null),
      el("p.studio-contexte-note", {}, "Mon horloge est arrêtée sur ces dettes. L'outil n'envoie rien : "
        + "« Réclamer » rédige le message, je le porte par mon canal."));
  }

  /* Le geste : réclamer. L'outil n'envoie rien — il écrit. */
  function agir(x, hote, n) {
    if (x.attente) { messagePret(x.attente, hote); return; }
    var e = x.ecart;
    RENVOI.ouvrir({ quoi: (e.cout || e.quoi) + (n > 1 ? " — " + n + " livrables" : ""),
      projet: e.projet.ref, projetId: e.projet.id,
      objet: n > 1 ? null : e.livrable ? e.livrable.id : null, motif: e.quoi });
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
    if (!r.length) return el("p.du-revenues-rien", {}, "Aucune attente revenue pour l'instant.");
    return el("div.du-revenues", {},
      el("h3", {}, "Revenues", el("span.studio-compte", {}, String(r.length))),
      r.map(function (a) {
        var j = Math.max(0, Math.round((new Date(a.resolu_le) - new Date(a.envoye_le)) / 86400000));
        return el("div.du-rev", {},
          el("span", {}, a.quoi),
          el("span.du-rev-j", {}, "rendue en " + j + (j > 1 ? " jours" : " jour")));
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
