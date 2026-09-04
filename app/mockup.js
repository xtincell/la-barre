/* mockup.js — la mise en situation.
 *
 * Un KV posé sur un fond blanc ne se juge pas comme un KV sur un 4×3 au bord
 * d'une route. Le mockup n'est pas une décoration : c'est le seul endroit où
 * l'on voit qu'une accroche ne tient pas à trente mètres.
 *
 * L'outil ne fabrique pas le mockup — Photoshop le fait. Il le porte, le
 * rattache à sa pièce et à son contexte, et le fait entrer dans la
 * présentation sans qu'on le recolle à la main.
 */

window.MOCKUP = (function () {
  var el = O.el;

  function liste(l) { return (l.mockups || []).slice(); }

  function poser(l, vignette, contexte) {
    if (!l.mockups) l.mockups = [];
    var m = {
      id: O.id("MK"), vignette: vignette, contexte: contexte || "",
      quand: new Date().toISOString(), version: l.version || 1,
    };
    l.mockups.push(m);
    return m;
  }

  function retirer(l, id) {
    l.mockups = liste(l).filter(function (m) { return m.id !== id; });
  }

  /* Un mockup fait sur une version périmée montre une image qui n'existe plus. */
  function perimes(l) {
    return liste(l).filter(function (m) { return (m.version || 1) < (l.version || 1); });
  }

  function total(p) {
    return (p.livrables || []).reduce(function (n, l) { return n + liste(l).length; }, 0);
  }

  /* ————————————————————— Le bloc, posé sur une pièce ————————————————————— */

  function bloc(p, l, rafraichir) {
    var ms = liste(l);
    var vieux = perimes(l);

    return el("div.mk", {},
      el("div.mk-tete", {},
        el("span.mk-t", {}, "EN SITUATION"),
        el("span.mk-n", {}, ms.length ? ms.length + (ms.length > 1 ? " mises en situation" : " mise en situation") : "aucune"),
        el("button.b.nu", { type: "button", onclick: function () { ajouter(p, l, rafraichir); } }, "+ mockup")
      ),

      vieux.length
        ? UI.banniere("rouge", vieux.length + (vieux.length > 1 ? " mockups montrent" : " mockup montre")
            + " une version antérieure — présentés tels quels, ils font valider une image qui n'existe plus.")
        : null,

      ms.length
        ? el("div.mk-bande", {}, ms.map(function (m) {
            return el("div.mk-c" + ((m.version || 1) < (l.version || 1) ? ".perime" : ""), {},
              IMAGE.vignette(m, "carte"),
              el("div.mk-l", {}, m.contexte || "contexte non dit"),
              el("div.mk-g", {},
                el("span.mk-v", {}, "V" + (m.version || 1)),
                el("button.b.nu", { type: "button", onclick: function () {
                  if (!window.confirm("Retirer cette mise en situation ?")) return;
                  retirer(l, m.id); DEPOT.enregistrer(); if (rafraichir) rafraichir();
                } }, "retirer"))
            );
          }))
        : el("div.mk-vide", {}, "Le visuel n'a jamais été vu dans son support. C'est là que se voit une accroche trop longue.")
    );
  }

  function ajouter(p, l, rafraichir) {
    var s = DEPOT.trouve("supports", l.support);
    var champ = el("input", { type: "text",
      placeholder: s ? s.nom + " en situation" : "4×3 en bord de route, tête de gondole, story…" });
    var apercu = el("div.mk-apercu");
    var donnee = null;

    var poser2 = el("button.b.or", { type: "button", onclick: function () {
      if (!donnee) { AVIS.refus("Aucune image posée."); return; }
      /* Le mockup part sur le disque ; le dépôt n'en garde que le chemin. */
      IMAGE.ranger(donnee, function (chemin, refus) {
        if (!chemin) { AVIS.refus(refus); return; }
        MOCKUP.poser(l, chemin, champ.value.trim());
        DEPOT.tracer("mockup", "livrables", p.id, l.nom + " — " + (champ.value.trim() || "sans contexte"));
        DEPOT.enregistrer();
        PANNEAU.fermerSur();
        if (rafraichir) rafraichir();
      });
    } }, "Poser");

    PANNEAU.sur("Mise en situation", l.nom, el("div", {},
      UI.banniere("", "Le mockup se fabrique ailleurs. Ici il est rattaché à sa pièce et à sa version : le jour où le visuel repart en V2, on saura que ce mockup ne le montre plus."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Le contexte"),
          el("div.indice", {}, "Où on la voit. C'est ce qui sera écrit sous l'image en présentation."), champ),
        el("div.champ", {}, el("label", {}, "L'image"),
          el("button.b", { type: "button", onclick: function () {
            IMAGE.choisir(function (d, ko) {
              if (!d) { AVIS.refus("Image illisible."); return; }
              if (ko > 900) { AVIS.refus("Image trop lourde (" + ko + " Ko)."); return; }
              donnee = d;
              O.vider(apercu).appendChild(IMAGE.vignette({ vignette: d }, "carte"));
            });
          } }, "Choisir une image"), apercu)),
      el("div.form-actions", {}, poser2,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  return { liste: liste, poser: poser, retirer: retirer, perimes: perimes,
    total: total, bloc: bloc, ajouter: ajouter };
})();
