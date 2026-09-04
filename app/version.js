/* version.js — tout ce que le client voit se versionne.
 *
 * Le brief se versionne, la plateforme se versionne, l'idée se versionne, les
 * routes se versionnent. Pas seulement les livrables. Sans ça, « le client a
 * changé d'avis » n'a ni date, ni auteur, ni coût — et la reprise n'existe pas.
 *
 * Une version naît d'un retour, jamais d'une envie : on écrit ce qui l'a
 * provoquée avant de l'ouvrir.
 */

window.VERSION = (function () {
  var el = O.el;

  /* Ce qui a provoqué la version. C'est ce champ qui rend la reprise chiffrable. */
  var ORIGINES = {
    initiale: { nom: "Première version", cout: false },
    interne: { nom: "Décision interne", cout: false,
      aide: "Nous avons changé d'avis. Le coût est pour nous." },
    client: { nom: "Retour client", cout: true,
      aide: "Le client demande un changement. C'est là que la reprise se compte." },
    conformite: { nom: "Non-conformité", cout: false,
      aide: "Langue, SKU, mention, gabarit : une erreur de notre côté." },
    perimetre: { nom: "Nouveau périmètre", cout: true,
      aide: "Ce n'était pas dans ce qui a été vendu." },
  };

  function num(o) { return o && o.version ? o.version : 1; }

  function historique(o) { return (o && o.versions ? o.versions : []).slice(); }

  /* Ouvrir une version : le numéro monte, l'ancienne est archivée avec ce qui
   * l'a tuée. Rien ne s'écrase. */
  function ouvrir(o, origine, motif, par) {
    if (!o.versions) o.versions = [];
    var n = num(o);
    o.versions.push({
      n: n, close_le: new Date().toISOString(),
      origine: origine, motif: motif, par: par || MAISON.titulaire,
      etat: instantane(o),
    });
    o.version = n + 1;
    o.derniereOrigine = origine;
    return o.version;
  }

  /* Ce qu'on garde d'une version : de quoi comparer, pas de quoi restaurer. */
  function instantane(o) {
    var g = {};
    ["idee", "campagne", "signature", "titre", "concept", "accroches", "sacrifice",
     "argument", "positionnement", "promesse", "idee_directrice", "probleme",
     "territoire", "insight"].forEach(function (c) {
      if (o[c] !== undefined && o[c] !== null && o[c] !== "") g[c] = o[c];
    });
    if (o.kv) g.kv = Object.assign({}, o.kv);
    if (o.vignette) g.avaitVisuel = true;
    return g;
  }

  /* Combien de tours au-delà de ce qui a été vendu. */
  function tours(o, vendus) {
    var payants = historique(o).filter(function (v) {
      return ORIGINES[v.origine] && ORIGINES[v.origine].cout;
    }).length;
    return { faits: payants, vendus: vendus || null,
      depasse: vendus ? Math.max(0, payants - vendus) : 0 };
  }

  /* ————————————————————— Le geste ————————————————————— */

  function nouvelle(objet, nom, apres, options) {
    options = options || {};
    var selO = el("select", {});
    Object.keys(ORIGINES).filter(function (k) { return k !== "initiale"; }).forEach(function (k) {
      selO.appendChild(el("option", { value: k }, ORIGINES[k].nom));
    });
    var aide = el("div.indice", {}, ORIGINES.interne.aide);
    selO.addEventListener("change", function () { aide.textContent = ORIGINES[selO.value].aide; });
    var champ = el("textarea", { rows: 2, placeholder: "Ce qui a provoqué cette version" });

    var onde = el("div");
    function dessiner() {
      O.vider(onde);
      var o = ORIGINES[selO.value];
      var suite = options.perime ? options.perime() : [];
      onde.appendChild(el("div.stats", {},
        UI.stat("VERSION", "V" + num(objet) + "  →  V" + (num(objet) + 1), "", ""),
        UI.stat("COMPTÉE", o.cout ? "oui" : "non",
          o.cout ? "elle entre dans les tours de révision" : "le coût reste pour nous",
          o.cout ? "alerte" : ""),
        suite.length ? UI.stat("PÉRIME", String(suite.length),
          suite.length > 1 ? "pièces à regénérer" : "pièce à regénérer", "alerte") : null
      ));
      if (suite.length) {
        onde.appendChild(UI.banniere("rouge", suite.slice(0, 4).map(function (x) { return x.nom; }).join(" · ")
          + (suite.length > 4 ? "  et " + (suite.length - 4) + " autres" : "")
          + " basculent en « à regénérer ». Rien n'est jeté ; le nombre est écrit."));
      }
    }
    selO.addEventListener("change", dessiner);
    dessiner();

    PANNEAU.sur("Nouvelle version — " + nom, "V" + num(objet) + " → V" + (num(objet) + 1), el("div", {},
      UI.banniere("", "Une version qui n'a pas de cause écrite ne se défend pas trois mois plus tard. C'est ce champ qui rend la clause de reprise opposable."),
      onde,
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Ce qui l'a provoquée"), selO, aide),
        el("div.champ", {}, el("label", {}, "En une phrase"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Une version sans motif écrit n'est pas traçable."); return; }
          ouvrir(objet, selO.value, champ.value.trim(), null);
          if (options.quand) options.quand(selO.value);
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, "Ouvrir la version"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— Le fil des versions ————————————————————— */

  function fil(objet, vendus) {
    var h = historique(objet);
    var t = tours(objet, vendus);
    if (!h.length) return el("p.rien", {}, "Une seule version. Rien n'a encore été repris.");

    return el("div.vs", {},
      t.depasse
        ? UI.banniere("rouge", t.faits + " tours consommés pour " + t.vendus
            + " vendus — " + t.depasse + " au-delà du périmètre. C'est le chiffre à porter en négociation.")
        : t.vendus ? el("div.vs-t", {}, t.faits + " / " + t.vendus + " tours consommés") : null,

      el("div.vs-l", {}, h.slice().reverse().map(function (v) {
        var o = ORIGINES[v.origine] || { nom: v.origine, cout: false };
        return el("div.vs-v" + (o.cout ? ".cout" : ""), {},
          el("span.vsv-n", {}, "V" + v.n),
          el("div.vsv-c", {},
            el("div.vsv-o", {}, o.nom, o.cout ? UI.eti("comptée", "alerte") : null),
            el("div.vsv-m", {}, v.motif),
            el("div.vsv-q", {}, O.joli(v.close_le))
          ));
      })),
      el("div.vs-v.actuelle", {},
        el("span.vsv-n", {}, "V" + num(objet)),
        el("div.vsv-c", {}, el("div.vsv-o", {}, "version en cours")))
    );
  }

  return { ORIGINES: ORIGINES, num: num, historique: historique, ouvrir: ouvrir,
    tours: tours, nouvelle: nouvelle, fil: fil };
})();
