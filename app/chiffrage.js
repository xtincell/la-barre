/* chiffrage.js — ce que le projet coûte, à l'interne, et rien de plus.
 *
 * Deux failles de l'audit dorment depuis le début :
 *
 *   10.1  « L'effort est plafonné, jamais mesuré. 5/15/35/100 % sont
 *         théoriques ; aucun temps réel n'est saisi, donc aucune marge n'est
 *         vérifiable. »
 *   10.3  « Les engagements fermes ne sont listés nulle part. Non annulable
 *         sans frais n'a aucun montant à opposer. »
 *
 * Le produit portait `identite.budget` — un nombre, sans qui ni combien de
 * jours. Un nombre ne se vérifie pas : il se croit.
 *
 * La frontière est celle posée au premier jour et elle ne bouge pas : LE
 * PRODUIT NE FACTURE RIEN. Pas de devis, pas de lignes, pas d'avenants — ça,
 * c'est la Clientèle et la comptabilité. Ce qui est ici est le chiffrage
 * interne : combien de jours, de qui, pour quel montant, et le bon de commande
 * est-il arrivé. C'est le minimum pour que la marge existe et que la clause de
 * reprise ait un chiffre à opposer.
 */

window.CHIFFRAGE = (function () {
  var el = O.el;

  var BDC = {
    attendu: { nom: "attendu", ton: "attente",
      quoi: "Le travail est engagé et rien ne l'oppose au client le jour où il conteste le montant." },
    recu:    { nom: "reçu", ton: "vert",
      quoi: "Le montant est opposable." },
    absent:  { nom: "aucun", ton: "alerte",
      quoi: "Aucun bon de commande n'est attendu : ce travail n'a pas de contrepartie écrite." },
  };

  function de(p) { return (p && p.chiffrage) || null; }

  function jours(p) {
    var c = de(p);
    if (!c) return 0;
    return (c.jours || []).reduce(function (n, x) { return n + (+x.n || 0); }, 0);
  }

  /* Le réel, tiré des livrables : il existe déjà, personne ne le lisait. */
  function reel(p) {
    return (p.livrables || []).reduce(function (n, l) {
      return n + (l.annule ? 0 : (+l.reel || 0)); }, 0);
  }

  function estime(p) {
    var parLivrables = (p.livrables || []).reduce(function (n, l) {
      return n + (l.annule ? 0 : (+l.estime || 0)); }, 0);
    return jours(p) || parLivrables;
  }

  /* L'état, au contrat. L'écart estimé/réel est la moitié de ce que ce module
   * sert à dire — c'est l'indicateur central de la fiche 07, et le seul moyen
   * de savoir si une marge tient avant la fin. */
  function etat(p) {
    var c = de(p);
    var e = estime(p), r = reel(p);
    var b = c && c.bonDeCommande ? BDC[c.bonDeCommande] : null;

    if (!c && !e) {
      return { cle: "vide", nom: "non chiffré", ton: "attente",
        quoi: "Ni jours ni montant : la marge de ce projet n'est pas vérifiable, "
          + "et une reprise n'aura aucun chiffre à opposer." };
    }
    if (r && e) {
      var ecart = Math.round(((r - e) / e) * 100);
      if (ecart > 10) {
        return { cle: "depasse", nom: "+" + ecart + " %", ton: "alerte",
          quoi: r + " jours consommés pour " + e + " estimés. "
            + (b && b.nom === "reçu" ? "Le dépassement est à la charge de l'agence tant qu'aucune reprise ne l'a qualifié."
               : "Et le bon de commande n'est pas là.") };
      }
      return { cle: "tenu", nom: r + " / " + e + " j", ton: "vert",
        quoi: "L'estimation tient. C'est ce chiffre-là qui rend la prochaine crédible." };
    }
    if (e) {
      return { cle: "estime", nom: e + " j estimés", ton: b ? b.ton : "attente",
        quoi: (c && c.montant ? O.milliers(c.montant) + " FCFA. " : "Aucun montant. ")
          + (b ? b.quoi : "Le bon de commande n'est pas renseigné.") };
    }
    return { cle: "partiel", nom: "à compléter", ton: "attente",
      quoi: "Un montant sans jours ne dit pas si la marge tient." };
  }

  /* ————————————————————— Le panneau ————————————————————— */

  function ouvrir(p, apres) {
    var c = Object.assign({ jours: [], montant: null, bonDeCommande: "", note: "" }, de(p) || {});
    var lignes = (c.jours || []).slice();

    var zone = el("div.chf-l");
    function rendreLignes() {
      O.vider(zone);
      lignes.forEach(function (x, i) {
        var sel = el("select", {});
        (MAISON.postes || []).forEach(function (po) {
          sel.appendChild(el("option", { value: po.cle, selected: po.cle === x.poste ? "" : null }, po.court || po.nom));
        });
        sel.onchange = function () { x.poste = sel.value; };
        var n = el("input", { type: "number", min: "0", step: "0.5", value: x.n == null ? "" : String(x.n) });
        n.oninput = function () { x.n = +n.value || 0; total(); };
        zone.appendChild(el("div.chf-r", {}, sel, n,
          el("button.b.nu", { type: "button", onclick: function () {
            lignes.splice(i, 1); rendreLignes(); total(); } }, "retirer")));
      });
    }
    var somme = el("span.chf-t");
    function total() {
      var t = lignes.reduce(function (n, x) { return n + (+x.n || 0); }, 0);
      O.vider(somme);
      somme.appendChild(document.createTextNode(t + (t > 1 ? " jours" : " jour") + " au total"));
    }
    rendreLignes(); total();

    var champMontant = el("input", { type: "number", min: "0", step: "1000",
      value: c.montant == null ? "" : String(c.montant) });
    var selBdc = el("select", {});
    selBdc.appendChild(el("option", { value: "" }, "— non renseigné —"));
    Object.keys(BDC).forEach(function (k) {
      selBdc.appendChild(el("option", { value: k, selected: c.bonDeCommande === k ? "" : null }, BDC[k].nom));
    });
    var champNote = el("textarea", { rows: 2, placeholder: "Ce qui explique le chiffre" });
    champNote.value = c.note || "";

    PANNEAU.ouvrir("Chiffrer le projet", p.ref || p.nom, el("div", {},
      UI.banniere("", "Chiffrage interne seul. Le produit ne facture rien et n'édite aucun "
        + "devis : ce qui est ici sert à vérifier une marge et à donner un chiffre à la "
        + "clause de reprise."),

      PANNEAU.sousbloc("Les jours, par poste", el("div", {}, zone,
        el("div.form-actions", {},
          el("button.b.nu", { type: "button", onclick: function () {
            lignes.push({ poste: (MAISON.postes[0] || {}).cle, n: 1 }); rendreLignes(); total(); } },
            "+ un poste"),
          somme))),

      PANNEAU.sousbloc("Le montant", el("div.champ", {},
        el("label", {}, "En FCFA"), champMontant)),

      PANNEAU.sousbloc("Le bon de commande", el("div.champ", {},
        el("div.indice", {}, "Sans lui, le montant n'est opposable à personne."), selBdc)),

      PANNEAU.sousbloc("Note", champNote),

      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          p.chiffrage = { jours: lignes.filter(function (x) { return +x.n > 0; }),
            montant: champMontant.value === "" ? null : +champMontant.value,
            bonDeCommande: selBdc.value || null, note: champNote.value.trim() };
          DEPOT.tracer("chiffrage", "projets", p.id,
            jours(p) + " j" + (p.chiffrage.montant ? " · " + p.chiffrage.montant : ""));
          DEPOT.enregistrer();
          PANNEAU.fermer();
          if (apres) apres();
        } }, "Enregistrer le chiffrage"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ), "var(--accent)");
  }

  function bouton(p, apres) {
    return el("button.bouton.creux", { type: "button",
      onclick: function () { ouvrir(p, apres); } },
      de(p) ? "Reprendre le chiffrage" : "Chiffrer le projet");
  }

  return { BDC: BDC, de: de, jours: jours, estime: estime, reel: reel,
    etat: etat, ouvrir: ouvrir, bouton: bouton };
})();
