/* axe.js — l'axe créatif, ce qui distingue une piste d'une autre.
 *
 * Une piste disait ce qu'elle FAIT — son concept, sa mécanique, son accroche,
 * son sacrifice. Elle ne disait jamais ce qu'elle DONNE À VOIR ET À ENTENDRE.
 * Or c'est exactement là que trois propositions se différencient : pour un café
 * bio, « Authenticité & Terroir » (chaleureux, brun et kraft, empattements) et
 * « Énergie & Modernité » (punchy, noir et ocre, géométries dures) peuvent
 * porter le même concept et ne pas être la même campagne.
 *
 * Sans axe écrit, présenter trois pistes n'est pas présenter un choix : c'est
 * présenter trois titres. Le client tranche alors sur le visuel qu'il a sous
 * les yeux, et la décision n'est ni argumentée ni opposable.
 *
 * Une piste EST un axe. Il n'y a pas d'objet de plus, pas d'arbitrage de plus :
 * arbitrer une piste, c'est retenir son axe. Ce module ne fait qu'écrire, lire
 * et contrôler les quatre champs qui manquaient.
 *
 * Le mot « axe » ne désigne plus que ça dans le produit. Ce qui s'appelait
 * « les dix axes de complétude » est devenu « les dix points de
 * recevabilité » — volet était déjà pris, c'est un lot de campagne — et ce qui
 * s'appelait « les axes d'un KV » est devenu « ses champs ».
 */

window.AXE = (function () {
  var el = O.el;

  /* Les quatre champs. Ils vivent ici et nulle part ailleurs : le formulaire de
   * la piste les concatène, l'écran de la piste les rend, le comparateur les
   * met côte à côte. Une seule définition, trois usages. */
  var CHAMPS = [
    { cle: "axe_directrice", nom: "L'idée directrice de l'axe", court: "IDÉE DIRECTRICE",
      type: "texte", requis: true,
      aide: "Une phrase. « Le retour aux sources et le travail de l'artisan. »",
      cout: "L'axe n'a pas de phrase : on ne peut ni le défendre en séance, ni le "
        + "rappeler trois semaines plus tard quand l'exé dérive." },

    { cle: "axe_ton", nom: "Le ton", court: "TON",
      type: "texte", requis: true,
      aide: "Deux ou trois mots. « Chaleureux, rassurant, terrien. »",
      cout: "Le DA et le rédacteur choisiront chacun le leur, et la piste s'écrira "
        + "deux fois — une en image, une en mots." },

    { cle: "axe_univers", nom: "L'univers visuel", court: "UNIVERS VISUEL",
      type: "long", requis: true,
      aide: "Couleurs, typographies, textures, formes. « Bruns et terracotta, "
        + "empattements gravés, papier kraft. »",
      cout: "Deux pistes se ressembleront à l'écran, et le client choisira sur "
        + "l'humeur du visuel qu'on lui montre, pas sur l'axe." },

    { cle: "axe_valeurs", nom: "Les valeurs véhiculées", court: "VALEURS",
      type: "puces", requis: false,
      aide: "Une par ligne. Elles se lisent contre la plateforme de marque.",
      cout: "Rien ne permet de refuser un exé qui trahit la marque : le contrôle "
        + "n'a pas de référence à opposer." },
  ];

  /* ————————————————————— Lire un axe ————————————————————— */

  function de(pi) {
    if (!pi) return { complet: false, manque: CHAMPS.slice(), vide: true };
    var manque = CHAMPS.filter(function (c) {
      var v = pi[c.cle];
      return c.requis && !(c.type === "puces" ? (v || []).length : (v || "").trim());
    });
    var rien = CHAMPS.every(function (c) {
      var v = pi[c.cle];
      return !(c.type === "puces" ? (v || []).length : (v || "").trim());
    });
    return {
      directrice: pi.axe_directrice || "",
      ton: pi.axe_ton || "",
      univers: pi.axe_univers || "",
      valeurs: pi.axe_valeurs || [],
      manque: manque, complet: manque.length === 0, vide: rien,
    };
  }

  /* Deux pistes qui déclarent le même ton ne proposent pas un choix.
   *
   * C'est le contrôle qui vaut le plus cher et qui ne se voit jamais à l'œil :
   * on présente trois planches, elles sont différentes, et elles disent la
   * même chose. Le client le sent sans savoir le nommer, et il tranche au
   * hasard — puis il revient dessus. */
  function jumelles(p, pi) {
    var t = O.normalise(pi.axe_ton || "");
    if (!t) return [];
    return (p.sections.pistes || []).filter(function (x) {
      return x.id !== pi.id && x.statut !== "ecartee"
        && O.normalise(x.axe_ton || "") === t;
    });
  }

  /* L'état de l'axe : ce qu'il est, ce que ça produit ou empêche. */
  function etat(p, pi) {
    var a = de(pi);
    if (a.vide) {
      return { nom: "sans axe", ton: "alerte",
        quoi: "cette piste ne se distingue des autres que par son titre — la "
          + "comparer à une autre n'oppose rien" };
    }
    if (!a.complet) {
      return { nom: "axe incomplet", ton: "attente",
        quoi: a.manque.length + (a.manque.length > 1 ? " champs manquent : " : " champ manque : ")
          + a.manque.map(function (c) { return c.court.toLowerCase(); }).join(", ") };
    }
    var j = p ? jumelles(p, pi) : [];
    if (j.length) {
      return { nom: "axe non distinctif", ton: "attente",
        quoi: "même ton que « " + (j[0].titre || "une autre piste") + " » : deux "
          + "propositions au même ton ne font pas un choix" };
    }
    return { nom: "axe posé", ton: "vert",
      quoi: "idée directrice, ton et univers écrits — la piste est comparable et "
        + "l'exé a une référence" };
  }

  /* ————————————————————— Les contrôles ————————————————————— */

  /* Recevabilité de l'axe, au format des autres grilles du produit. */
  function controles(p, pi) {
    var a = de(pi);
    var out = CHAMPS.filter(function (c) { return c.requis; }).map(function (c) {
      var v = pi[c.cle];
      var ok = c.type === "puces" ? (v || []).length > 0 : !!(v || "").trim();
      return { quoi: c.nom, ok: ok, poids: 4, cout: c.cout };
    });

    var j = jumelles(p, pi);
    out.push({ quoi: "Un ton qui n'est celui d'aucune autre", ok: j.length === 0, poids: 3,
      cout: j.length
        ? "« " + (j[0].titre || "une autre piste") + " » porte le même ton : présenter "
          + "les deux, c'est demander au client de trancher sur rien."
        : "" });

    /* R10 et R12 : les mots que la marque ne dit jamais, et les noms retirés.
     * L'axe est le premier endroit où ils passent — avant l'accroche, avant
     * l'exé, avant l'impression. */
    var mots = window.REGLES ? REGLES.vocabulaire(texte(pi)) : [];
    out.push({ quoi: "Aucun mot proscrit par la marque", ok: mots.length === 0, poids: 5,
      cout: mots.length
        ? mots.map(function (m) { return "« " + m.mot + " »"; }).join(", ")
          + " — la marque ne le dit jamais, et l'axe le porte jusqu'à l'exé."
        : "" });

    if (!a.valeurs.length) {
      out.push({ quoi: "Des valeurs écrites", ok: false, poids: 2,
        cout: CHAMPS[3].cout });
    }
    return out;
  }

  function texte(pi) {
    return [pi.axe_directrice, pi.axe_ton, pi.axe_univers]
      .concat(pi.axe_valeurs || []).filter(Boolean).join(" · ");
  }

  /* ————————————————————— Ce que la marque impose déjà ————————————————————— */

  /* On n'écrit pas un axe dans le vide : le ton de la marque et ce qu'elle ne
   * dit jamais sont pluriannuels, l'axe est saisonnier. Les afficher pendant
   * la saisie, c'est la seule façon honnête de « contrôler contre la
   * plateforme » — le produit ne juge pas le sens, il met la règle sous les
   * yeux de celui qui écrit. */
  function socle(p) {
    if (!window.VAULT || !p) return null;
    /* Un dossier nomme ses marques de trois façons selon son âge : marqueIds
     * (le tableau), campagne.marques (l'ombrelle multi-marques), ou rien.
     * On prend la première déclarée — c'est celle dont l'axe relève. */
    var ids = (p.sections.identite || {}).marqueIds || [];
    var mid = ids[0]
      || (((p.campagne || {}).marques || [])[0] || {}).id
      || (p.livrables || []).map(function (l) { return l.marqueId; })
           .filter(Boolean)[0];
    if (!mid) return null;
    var lire = function (cle) {
      var h = VAULT.herite("marque", mid, cle);
      return h && h.valeur ? h : null;
    };
    var t = lire("ton"), j = lire("jamais"), d = lire("idee_directrice"), n = lire("ne_fera_pas");
    if (!t && !j && !d && !n) return null;
    return { marque: VAULT.nomDe ? VAULT.nomDe("marque", mid) : null,
      ton: t, jamais: j, directrice: d, neFeraPas: n };
  }

  function liste(h) {
    var v = h && h.valeur;
    return Array.isArray(v) ? v : v ? [v] : [];
  }

  /* ————————————————————— Le bloc, sur l'écran de la piste ————————————————————— */

  function bloc(p, pi, apres) {
    var a = de(pi);
    var e = etat(p, pi);

    return el("div.axe" + (a.vide ? ".vide" : ""), {},
      el("div.axe-t", {},
        el("span.axet-l", {}, "L'AXE CRÉATIF"),
        el("span.axet-e." + e.ton, {}, e.nom)),

      el("div.axe-q", {}, e.quoi),

      a.vide
        ? el("div.axe-rien", {},
            "Rien n'est écrit. Le concept dit ce que la piste fait ; l'axe dit ce "
            + "qu'elle donne à voir et à entendre — c'est lui qui la rend comparable "
            + "aux autres.")
        : el("div.axe-c", {}, CHAMPS.map(function (c) { return champ(pi, c); })),

      el("div.form-actions", {},
        el("button.b" + (a.complet ? "" : ".or"), { type: "button",
          onclick: function () { editer(p, pi, apres); } },
          a.vide ? "Écrire l'axe créatif" : "Modifier l'axe"))
    );
  }

  function champ(pi, c) {
    var v = pi[c.cle];
    var vide = c.type === "puces" ? !(v || []).length : !(v || "").trim();

    return el("div.axec" + (vide ? ".vide" : ""), {},
      el("div.axec-l", {}, c.court),
      vide
        ? el("div.axec-v.manque", {}, c.requis ? c.cout : "non écrit")
        : c.type === "puces"
          ? el("div.axec-p", {}, (v || []).map(function (x) { return el("span.axe-val", {}, x); }))
          : el("div.axec-v", {}, v)
    );
  }

  /* ————————————————————— Une cellule du comparateur ————————————————————— */

  /* Trois lignes seulement — idée directrice, ton, univers — parce que c'est
   * sur celles-là que deux pistes se départagent. Les valeurs voyagent avec
   * l'idée directrice : elles la qualifient, elles ne se comparent pas seules. */
  function cellule(p, pi, cle) {
    var a = de(pi);

    if (cle === "axe") {
      if (!a.directrice) {
        return el("div.cmp-c", {}, el("span.cmp-vide", {},
          el("b", {}, "aucun axe écrit — "),
          "cette colonne ne se compare à aucune autre."));
      }
      return el("div.cmp-c", {},
        el("p.cmpc-p", {}, a.directrice),
        a.valeurs.length
          ? el("div.axec-p", {}, a.valeurs.map(function (x) { return el("span.axe-val", {}, x); }))
          : null);
    }

    if (cle === "ton") {
      if (!a.ton) {
        return el("div.cmp-c", {}, el("span.cmp-vide", {},
          el("b", {}, "sans ton — "), "le DA et le rédacteur choisiront chacun le leur."));
      }
      var j = jumelles(p, pi);
      return el("div.cmp-c", {},
        el("div.axe-ton", {}, a.ton),
        j.length ? el("div.axe-jum", {}, "même ton que "
          + j.map(function (x) { return "« " + (x.titre || "sans titre") + " »"; }).join(", ")
          + " — deux propositions au même ton ne font pas un choix") : null);
    }

    return a.univers
      ? el("div.cmp-c", {}, el("p.cmpc-p", {}, a.univers))
      : el("div.cmp-c", {}, el("span.cmp-vide", {},
          el("b", {}, "univers non décrit — "),
          "on comparera deux images, pas deux partis pris."));
  }

  /* ————————————————————— Écrire l'axe ————————————————————— */

  function editer(p, pi, apres) {
    var f = FORM.rendre(CHAMPS, pi || {});
    var s = socle(p);

    PANNEAU.ouvrir("L'axe créatif", pi.titre || "piste sans titre", el("div", {},

      el("div.prix", {}, el("span.signe", {}, "⚠"),
        "Trois pistes sans axe ne sont pas trois propositions : ce sont trois "
        + "titres. C'est ici que se décide ce qui les sépare."),

      /* La marque d'abord : elle est pluriannuelle, l'axe est saisonnier. */
      s ? el("div.axe-socle", {},
          el("div.axsoc-l", {}, "CE QUE LA MARQUE IMPOSE DÉJÀ"
            + (s.marque ? "  ·  " + s.marque : "")),
          s.directrice ? ligneSocle("Idée directrice pluriannuelle", s.directrice.valeur, s.directrice) : null,
          s.ton ? ligneSocle("Ton de la marque", s.ton.valeur, s.ton) : null,
          liste(s.jamais).length ? ligneSocle("Ce qu'on ne dit jamais", liste(s.jamais).join("  ·  "), s.jamais) : null,
          liste(s.neFeraPas).length ? ligneSocle("Ce que la marque ne fera pas", liste(s.neFeraPas).join("  ·  "), s.neFeraPas) : null,
          el("div.axsoc-i", {}, "L'axe s'y rattache ou s'en écarte en le disant. "
            + "Le contrôle de vocabulaire s'adosse à « ce qu'on ne dit jamais ».")
        ) : null,

      f.noeud,

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var d = f.valeurs();
          Object.keys(d).forEach(function (k) { pi[k] = d[k]; });
          var mots = window.REGLES ? REGLES.vocabulaire(texte(pi)) : [];
          DEPOT.tracer("axe créatif", "pistes", p.id,
            (pi.titre || "") + " — " + (pi.axe_ton || "sans ton"));
          DEPOT.enregistrer();
          PANNEAU.fermer();
          if (mots.length) {
            AVIS.refus("L'axe porte " + mots.map(function (m) { return "« " + m.mot + " »"; }).join(", ")
              + " : la marque ne le dit jamais. C'est enregistré, et signalé sur la piste.");
          }
          if (apres) apres();
        } }, "Enregistrer l'axe"),
        el("button.b", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ), O.poste("da").couleur);
  }

  function ligneSocle(nom, valeur, h) {
    return el("div.axsoc-r", {},
      el("span.axsocr-n", {}, nom),
      el("span.axsocr-v", {}, String(valeur)),
      /* La source n'est utile que si le champ est HÉRITÉ : dire « de Beignet
       * Paradise » sur le vault de Beignet Paradise n'apprend rien. */
      h && h.source && !h.propre
        ? el("span.axsocr-s", {}, "hérité de " + (h.source.nom || h.source.id))
        : null);
  }

  return { CHAMPS: CHAMPS, de: de, etat: etat, jumelles: jumelles, controles: controles,
    texte: texte, socle: socle, bloc: bloc, cellule: cellule, editer: editer };
})();
