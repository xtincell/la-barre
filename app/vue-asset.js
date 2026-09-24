/* vue-asset.js — l'écran de validation d'un asset.
 *
 * C'est l'écran le plus utilisé de tous, et il n'existait pas comme tel : une
 * livrable se jugeait dans un panneau à onglets où l'image était un détail.
 *
 * Ici il n'y a qu'une question — ce qui doit être posé l'est-il ? — et quatre
 * cases : l'asset, le BAT, la simulation, la mise en situation. Une case vide
 * n'est pas un trou : elle porte le brief de ce qu'on attend. Une case pleine
 * montre la version précédente et ce que le client en a dit.
 */

window.VUE_ASSET = (function () {
  var el = O.el;

  function ouvrir(p, l, rafraichir, mode) {
    onglet = mode || "poser";
    function apres() { PANNEAU.fermer(); ouvrir(p, l, rafraichir, onglet); if (rafraichir) rafraichir(); }
    PANNEAU.ouvrir(l.nom, "V" + (l.version || 1), rendre(p, l, apres));
    DEPOT.lu("livrables", l.id);
  }

  /* Trois onglets, pas cinq : ce qu'on regarde, ce qu'on juge, d'où ça vient.
   * L'écran de livrable faisait doublon — il est absorbé ici. */
  var ONGLETS = [
    { cle: "poser", nom: "Visuels et fichiers" },
    { cle: "juger", nom: "Critères et verdict" },
    { cle: "origine", nom: "Versions et dépendances" },
  ];
  var onglet = "poser";

  function rendre(p, l, apres) {
    return el("div.as", {},
      entete(p, l),
      bande(p, l, apres),
      UI.onglets(ONGLETS, onglet, function (c) { onglet = c; apres(); }),
      el("div", { style: { "margin-top": "1rem" } },
        onglet === "poser" ? el("div", {}, cases(p, l, apres), packsMontres(p, l, apres), MOCKUP.bloc(p, l, apres))
          : onglet === "juger" ? el("div", {}, retoursClient(p, l, apres) || vide("Aucun retour sur ce livrable."),
              VUE_LIVRABLE.criteres(p, l, apres))
          : el("div", {}, precedente(p, l) || vide("Une seule version : rien n'a encore été repris."),
              VUE_LIVRABLE.dependances(p, l))),
      gestes(p, l, apres)
    );
  }

  function vide(t) { return el("p.rien", {}, t); }

  /* Ce qu'on voit avant de juger : le livrable, son niveau, son marché, son état. */
  function entete(p, l) {
    var m = DEPOT.trouve("marches", l.marche);
    var s = DEPOT.trouve("supports", l.support);
    var resp = l.responsable ? DEPOT.trouve("personnes", l.responsable) : null;
    var piste = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    var pr = window.PRIORITE && piste ? PRIORITE.def(PRIORITE.etat(piste)) : null;

    return el("div.as-tete", {},
      el("div.ast-v", {}, IMAGE.vignette(l, "planche")),
      el("div.ast-c", {},
        el("div.ast-n", {}, l.nom),
        el("div.ast-m", {},
          UI.eti(KV.NIVEAUX[KV.niveau(l)].nom, "terne"),
          m ? UI.drapeau(m) : null,
          s ? el("span", {}, s.nom) : null,
          el("span", {}, "V" + (l.version || 1)),
          pr ? UI.eti(pr.nom, pr.ton) : null),
        el("div.ast-r", {},
          resp ? UI.avatar(resp, 22) : UI.avatar(null, 22),
          el("span", {}, resp ? resp.nom : "sans responsable"),
          piste ? el("span", {}, "piste « " + piste.titre + " »") : el("span.alerte", {}, "hors piste"))
      ));
  }

  /* ————————————————————— La question ————————————————————— */

  function bande(p, l, apres) {
    return UI.recevabilite("Que manque-t-il pour produire ?",
      PRODUCTION.porte(p, l), null,
      [
        { nom: "Poser un fichier", fort: true, quand: function () { PRODUCTION.ajouter(p, l, apres); } },
        { nom: "Enregistrer un retour", quand: function () { FEEDBACK.ouvrir(p.id, [l.id], apres); } },
        { nom: "Nouvelle version", doux: true, quand: function () {
            VERSION.nouvelle(l, l.nom, apres, { perime: function () { return KV.descendance(p, l.id); } });
          } },
      ]);
  }

  /* ————————————————————— La porte ————————————————————— */

  /* Quatre cases côte à côte disaient quatre choses égales et simultanées. Ce
   * n'en est pas une : c'est un passage, avec un ordre, et surtout une ligne
   * au-delà de laquelle on ne revient pas. Le BAT signé engage l'agence sur
   * l'erreur d'impression — ça ne peut pas avoir la même forme qu'une vignette
   * de présentation. On dessine donc la porte : les étages franchis se réduisent
   * à une ligne, celui où l'on est occupe la place, et ceux d'après sont fermés
   * en disant par quoi. */
  /* « Le BAT » est un acronyme : le passer en minuscules donne « le bat », qui
   * ne veut plus rien dire. On retire l'article, on ne touche pas au reste. */
  function nu(nom) { return String(nom).replace(/^(Le |La |L')/, ""); }
  function minuscule(nom) { return String(nom).charAt(0).toLowerCase() + String(nom).slice(1); }

  function cases(p, l, apres) {
    var piste = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    var retenue = piste && piste.statut === "retenue";

    /* Les étages, dans l'ordre de franchissement. Ce que le support ne demande
     * pas ne fait pas partie du passage — mais un fichier posé quand même y
     * reste : il existe, on ne l'efface pas de l'écran. */
    var tous = PRODUCTION.etages(l).sort(function (x, y) { return x.def.rang - y.def.rang; });
    var et = tous.filter(function (e) { return e.exige || e.n; });
    var horsSujet = tous.filter(function (e) { return !e.exige && !e.n; });

    /* Où je suis : le premier étage exigé qui n'est pas franchi. */
    var ici = -1;
    et.forEach(function (e, i) { if (ici === -1 && e.exige && !e.ok) ici = i; });

    return el("div.pt", {},
      cadre(p, l, piste, retenue, et, ici),
      el("div.pt-p", {}, et.map(function (e, i) {
        return el("div.pt-e", {},
          e.def.signable && !e.ok ? ligne() : null,
          i < ici || (!e.exige && e.n) ? franchi(p, l, e, apres)
            : i === ici ? ouvert(p, l, e, apres, retenue)
            : e.ok ? franchi(p, l, e, apres)
            : ferme(e, et[i - 1]));
      })),
      /* Énumérer quatre absences n'apprend rien. Ce qui compte, c'est ce que
       * le support épargne : un seul étage veut dire que rien ne part en
       * fabrication, donc que rien n'est irréversible. */
      horsSujet.length
        ? el("p.pt-hs", {}, et.filter(function (e) { return e.exige; }).length === 1
            ? "Un seul étage sur ce support : rien ne part en fabrication, "
              + "donc rien ne devient irréversible."
            : horsSujet.length === 1
              ? "Ce support ne demande pas de " + nu(horsSujet[0].def.nom) + "."
              : "Ce support n'en demande pas plus : ni "
                + horsSujet.map(function (e) { return nu(e.def.nom); }).join(", ni ") + ".")
        : null
    );
  }

  /* Le chambranle. Un livrable qui ne vient d'aucune piste arbitrée n'a pas de
   * porte à franchir : elle n'a pas de mur autour. */
  function cadre(p, l, piste, retenue, et, ici) {
    var exiges = et.filter(function (e) { return e.exige; });
    var faits = exiges.filter(function (e) { return e.ok; }).length;

    return el("div.pt-c" + (retenue ? "" : ".hors"), {},
      el("div.ptc-t", {}, "LA PORTE"),
      el("div.ptc-n", {}, faits + " sur " + exiges.length,
        el("span", {}, faits === exiges.length
          ? "la porte est franchie — le livrable peut partir"
          : exiges.length - faits === 1 ? "un étage reste à franchir"
          : (exiges.length - faits) + " étages restent à franchir")),
      retenue
        ? el("div.ptc-r", {}, "Sur la piste « " + piste.titre + " », arbitrée et retenue.")
        : el("div.ptc-r", {}, piste
            ? "La piste « " + piste.titre + " » n'a pas été arbitrée. Produire ici, "
              + "c'est parier — et si elle tombe, tout ce qui est posé tombe avec elle."
            : "Ce livrable n'est rattaché à aucune piste : elle ne vient de nulle part, "
              + "et rien ne dira pourquoi elle a été faite.")
    );
  }

  /* La ligne de non-retour, tracée en travers du passage juste avant l'étage
   * qui engage. C'est le seul endroit du produit où le coût est irréversible. */
  function ligne() {
    return el("div.pt-l", {},
      el("span.ptl-t", {}, "AU-DELÀ DE CETTE LIGNE, L'ERREUR EST POUR L'AGENCE"),
      el("span.ptl-s", {}, "un BAT signé part en fabrication — aucune correction sans tout refaire"));
  }

  /* Un étage franchi n'a plus besoin de place : son fichier, son emplacement,
   * et de quoi le remplacer. */
  function franchi(p, l, e, apres) {
    return el("div.pt-f", {},
      el("div.ptf-h", {},
        el("span.ptf-c", {}, "✓"),
        el("span.ptf-n", {}, e.def.nom),
        el("span.ptf-q", {}, e.n + (e.n > 1 ? " fichiers" : " fichier")),
        !e.exige ? el("span.ptf-x", {}, "posé sans être demandé ici") : null),
      el("div.ptf-fs", {}, e.fichiers.map(function (f) {
        return el("div.ptff", {},
          el("span.ptff-n", {}, f.nom),
          el("span.ptff-m", {}, (f.emplacement || "emplacement non dit")
            + (f.signataire ? "  ·  signé " + f.signataire : e.def.signable ? "  ·  non signé" : "")),
          el("button.b.nu", { type: "button", onclick: function () {
            if (!window.confirm("Retirer « " + f.nom + " » ?")) return;
            PRODUCTION.retirer(l, f.id); DEPOT.enregistrer(); apres();
          } }, "retirer"));
      })),
      e.cle === "situation" && (l.mockups || []).length
        ? el("div.ptf-v", {}, (l.mockups || []).slice(0, 3).map(function (mk) {
            return el("div.ptfv", {}, IMAGE.vignette(mk, "planche"),
              el("span", {}, mk.contexte || "sans contexte"));
          }))
        : null,
      el("button.b.nu", { type: "button",
        onclick: function () { PRODUCTION.ajouter(p, l, apres); } }, "+ remplacer"));
  }

  /* L'étage où l'on est. C'est le seul qui prend de la place, et il porte tout
   * ce qu'il faut pour le franchir sans aller chercher ailleurs. */
  function ouvert(p, l, e, apres, retenue) {
    var s = DEPOT.trouve("supports", l.support);
    var m = DEPOT.trouve("marches", l.marche);
    var g = s && m ? (s.gabarits || {})[m.id] : null;

    return el("div.pt-o" + (e.def.signable ? ".dur" : ""), {},
      el("div.pto-h", {},
        el("span.pto-i", {}, "VOUS ÊTES ICI"),
        el("span.pto-n", {}, e.def.nom),
        el("span.pto-e", {}, e.def.ext)),

      el("div.pto-b", {},
        el("div.ptob", {}, el("b", {}, "ce qu'on attend"), e.def.quoi),
        el("div.ptob", {}, el("b", {}, "pour qui"), e.def.pour),
        el("div.ptob", {}, el("b", {}, "format"), g && g.dimensions
          ? g.dimensions + (g.fond_perdu ? "  ·  fond perdu " + g.fond_perdu : "")
          : el("i", {}, "gabarit " + (s ? s.nom : "ce support") + (m ? " · " + m.code : "")
              + " non renseigné — le fichier partira sans qu'on ait vérifié sa taille")),
        m ? el("div.ptob", {}, el("b", {}, "langue"),
              (m.langues || []).map(O.langue).join(", ")) : null),

      el("button.pto-z", { type: "button",
        onclick: function () { PRODUCTION.ajouter(p, l, apres); } },
        el("span.ptoz-p", {}, "+"),
        el("span.ptoz-t", {}, "poser " + minuscule(e.def.nom))),

      el("div.pto-c", {}, el("b", {}, "sans lui"), e.def.cout),
      !retenue && e.def.signable
        ? el("div.pto-a", {}, "Et la piste n'est pas arbitrée : ce serait signer un bon "
            + "à tirer sur une idée que personne n'a retenue.")
        : null);
  }

  /* Un étage fermé dit par quoi il est fermé. « Pas encore » n'apprend rien ;
   * « le BAT n'est pas posé » se corrige. */
  function ferme(e, avant) {
    return el("div.pt-x", {},
      el("span.ptx-c", {}, "·"),
      el("span.ptx-n", {}, e.def.nom),
      el("span.ptx-q", {}, avant && !avant.ok
        ? "fermé — " + minuscule(avant.def.nom) + " n'est pas pos" + (avant.def.f ? "ée" : "é")
        : "à venir"),
      el("span.ptx-o", {}, e.def.cout));
  }


  /* ————————————————————— Les packs montrés ————————————————————— */

  /* Un livrable montre des produits. Lesquels, ça ne se devine pas — et c'est le
   * seul endroit d'où l'on peut voir qu'un pack apparaît sur un marché qui ne
   * le vend pas. Le catalogue proposé est celui de la marque du livrable, et
   * d'aucune autre. */
  function packsMontres(p, l, apres) {
    var cat = VAULT.proposables(l);
    var choisis = VAULT.packsDe(l);
    var z = VAULT.packsHorsZone(l);
    var m = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var mq = l.marqueId ? DEPOT.trouve("marques", l.marqueId) : null;

    if (!l.marqueId) {
      return el("div.pm", {},
        el("div.pm-t", {}, "LES PACKS MONTRÉS"),
        el("p.pm-x", {}, "Ce livrable n'est rattaché à aucune marque : on ne peut "
          + "lui proposer aucun catalogue, et rien ne dira si elle montre un produit "
          + "qui n'est pas vendu ici."));
    }

    return el("div.pm" + (z.hors.length ? ".alerte" : ""), {},
      el("div.pm-t", {}, "LES PACKS MONTRÉS",
        el("span", {}, choisis.length + " sur " + cat.length
          + "  ·  catalogue " + (mq ? mq.nom : ""))),

      /* Le contrôle qui vaut le plus cher. */
      z.hors.length
        ? el("div.pm-h", {},
            el("span.pmh-t", {}, z.hors.length
              + (z.hors.length > 1 ? " packs ne sont pas distribués" : " pack n'est pas distribué")
              + (m ? " sur " + m.nom : " sur ce marché")),
            el("span.pmh-x", {}, z.hors.map(function (s) { return s.nom; }).join("  ·  ")
              + " — un livrable qui montre un produit qu'on n'y vend pas se rappelle, "
              + "et le rappel est pour l'agence."))
        : null,

      z.muets.length
        ? el("div.pm-m", {}, z.muets.length
            + (z.muets.length > 1 ? " packs ne disent pas où ils sont distribués"
                                  : " pack ne dit pas où il est distribué")
            + " : le contrôle ne peut pas se faire. À renseigner sur leur fiche.")
        : null,

      cat.length
        ? el("div.pm-l", {}, cat.map(function (s) {
            var ici = choisis.some(function (x) { return x.id === s.id; });
            var hors = ici && z.hors.some(function (x) { return x.id === s.id; });
            return el("button.pmp" + (ici ? ".ici" : "") + (hors ? ".hors" : ""), {
              type: "button",
              title: (s.marches || []).length
                ? "distribué sur " + (s.marches || []).map(function (id) {
                    var x = DEPOT.trouve("marches", id); return x ? x.code : id; }).join(", ")
                : "marchés de distribution non renseignés",
              onclick: function () {
                VAULT.basculerPack(l, s.id); DEPOT.enregistrer(); apres();
              } },
              s.vignette ? el("span.pmp-v", {}, el("img", { src: s.vignette, alt: s.nom })) : null,
              el("span.pmp-n", {}, s.nom),
              el("span.pmp-m", {}, [s.format, s.variante].filter(Boolean).join(" · ")
                || "à qualifier"));
          }))
        : el("p.pm-x", {}, "Le catalogue de " + (mq ? mq.nom : "cette marque")
            + " est vide. Un pack se crée à la bibliothèque de marque.")
    );
  }

  /* ————————————————————— Ce que le client en a dit ————————————————————— */

  function retoursClient(p, l, apres) {
    var fbs = FEEDBACK.duProjet(p.id).filter(function (f) {
      return FEEDBACK.impact(f).pieces.some(function (x) { return x.id === l.id; });
    });
    var annots = ANNOT.liste(l);
    if (!fbs.length && !annots.length) return null;

    return el("div.as-bloc", {},
      el("div.asb-t", {}, "CE QUE LE CLIENT EN A DIT",
        el("span", {}, (fbs.length + annots.length) + " retours")),

      fbs.map(function (f) {
        var i = FEEDBACK.impact(f);
        return el("div.as-fb." + FEEDBACK.ISSUES[f.issue].ton, {},
          el("div.asfb-t", {}, f.texte),
          el("div.asfb-m", {},
            el("span", {}, FEEDBACK.nomAuteur(f.auteur)),
            el("span", {}, O.joli(f.quand)),
            el("span", {}, FEEDBACK.CANAUX[f.canal].nom),
            el("span", {}, i.assets + (i.assets > 1 ? " livrables touchés" : " livrable touché")),
            UI.eti(FEEDBACK.ISSUES[f.issue].nom, FEEDBACK.ISSUES[f.issue].ton)),
          f.issue === "ouvert"
            ? el("button.b.nu", { type: "button", onclick: function () { FEEDBACK.trancher(f, apres); } }, "trancher")
            : f.motif ? el("div.asfb-mo", {}, f.motif) : null);
      }),

      annots.length
        ? el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); ANNOT.ouvrir(p, l, apres); } },
            annots.length + " points posés sur le visuel →")
        : null
    );
  }

  /* ————————————————————— La version précédente ————————————————————— */

  function precedente(p, l) {
    var h = VERSION.historique(l);
    if (!h.length) return null;
    var d = h[h.length - 1];
    var o = VERSION.ORIGINES[d.origine] || { nom: d.origine };

    return el("div.as-bloc", {},
      el("div.asb-t", {}, "LA VERSION PRÉCÉDENTE", el("span", {}, "V" + d.n)),
      el("div.as-prec", {},
        d.etat && d.etat.avaitVisuel
          ? el("div.asp-v", {}, el("span", {}, "le visuel de la V" + d.n + " n'est pas conservé — seul le dernier l'est"))
          : null,
        el("div.asp-c", {},
          el("div.aspc-o", {}, "Fermée par : " + o.nom),
          el("div.aspc-m", {}, d.motif),
          el("div.aspc-q", {}, O.joli(d.close_le)),
          d.etat && d.etat.kv && d.etat.kv.copy
            ? el("div.aspc-d", {}, "accroche d'alors : « " + d.etat.kv.copy + " »")
            : null)
      ),
      VERSION.fil(l, l.toursVendus));
  }

  function gestes(p, l, apres) {
    return el("div.form-actions", { style: { "margin-top": "1.2rem" } },
      IMAGE.bouton(l, apres),
      el("button.b", { type: "button", onclick: function () { PANNEAU.fermer(); ANNOT.ouvrir(p, l, apres); } }, "Annoter"),
      el("button.b", { type: "button", onclick: function () { MOCKUP.ajouter(p, l, apres); } }, "Mise en situation"),
      el("button.b.nu", { type: "button", onclick: function () { PANNEAU.fermer(); VUE_LIVRABLE.ouvrir(p, l, apres); } },
        "Fiche complète")
    );
  }

  return { ouvrir: ouvrir, rendre: rendre };
})();
