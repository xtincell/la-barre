/* vue-atelier.js — l'endroit où l'équipe parle, et où les idées se posent.
 *
 * Deux manques que rien ne couvrait : je n'avais aucun endroit pour discuter
 * avec mes gars, et aucun endroit pour recueillir leurs idées avant que je
 * tranche. Or l'indicateur « idées retenues émanant de juniors » suppose
 * exactement ça — des idées posées, avec leur auteur, avant l'arbitrage.
 *
 * Deux colonnes : les idées à gauche, la conversation à droite. Une idée n'est
 * pas un message ; un message n'est pas une idée.
 */

window.VUE_ATELIER = (function () {
  var el = O.el;
  var onglet = "idees";

  function idees(p) { return (p.idees || []).slice(); }
  function fils(p) { return (p.fils || []).slice(); }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(p, rafraichir) {
    return el("div.at", {},
      compteurJuniors(p),
      briefing(p, rafraichir),
      bande(p, rafraichir),
      el("div.at-corps", {},
        colonneIdees(p, rafraichir),
        colonneFil(p, rafraichir)
      )
    );
  }


  /* ————————————————————— L'indicateur qui fait la décision ————————————————————— */

  /* « Nombre d'idées retenues émanant de juniors » est une ligne de ma fiche,
   * et le seul endroit du produit où elle bouge est ici : c'est l'arbitrage de
   * cet écran qui l'incrémente. Enfoui dans une liste de gestes, il ne pesait
   * sur rien. En tête, il rappelle ce qu'on est en train de décider. */
  function compteurJuniors(p) {
    var is = idees(p);
    var retenues = is.filter(function (i) { return i.statut === "retenue"; });
    var junior = function (i) {
      var pe = DEPOT.trouve("personnes", i.auteur);
      return pe && pe.seniorite === "junior";
    };
    var jr = retenues.filter(junior).length;
    var jp = is.filter(junior).length;

    return el("div.aj" + (jp && !jr ? ".zero" : jr ? ".ok" : ""), {},
      el("div.aj-c", {}, String(jr)),
      el("div.aj-t", {},
        el("div.aj-n", {}, jr > 1 ? "idées de junior retenues" : "idée de junior retenue"),
        el("div.aj-x", {}, !is.length
          ? "Aucune idée posée. Tant que rien n'est écrit avant l'arbitrage, "
            + "la porte A est un théâtre et cet indicateur reste structurellement à zéro."
          : !jp
            ? "Aucun junior n'a posé d'idée dans cet atelier. L'indicateur ne peut "
              + "pas bouger : détecter les talents suppose de leur donner le ballon."
            : !jr
              ? jp + (jp > 1 ? " idées de juniors sont en lice" : " idée de junior est en lice")
                + " et aucune n'est retenue. C'est ici que ça se joue — nulle part ailleurs."
              : "sur " + jp + (jp > 1 ? " idées de juniors posées" : " idée de junior posée")
                + ", et sur " + retenues.length + " retenues au total. "
                + "Chaque arbitrage rendu ici le fait bouger.")));
  }

  /* Un atelier ne se convoque pas sur une intuition : il se convoque sur un
   * cadrage. Le document est là, compilé, avec ce qui lui manque. */
  function briefing(p, rafraichir) {
    var manques = COMPILATEUR.controles(p, "cadrage").filter(function (c) { return !c.ok; });
    return el("div.at-brief" + (manques.length ? ".manque" : ""), {},
      el("div.atb-c", {},
        el("div.atb-t", {}, "LE BRIEFING DE CET ATELIER"),
        el("div.atb-q", {}, manques.length
          ? manques.length + (manques.length > 1 ? " manques au cadrage" : " manque au cadrage")
            + " — l'atelier partira d'une page blanche sur : "
            + manques.slice(0, 3).map(function (c) { return c.quoi.toLowerCase(); }).join(", ")
          : "Le cadrage est complet : problème, cible, insight, territoire, ton, périmètre.")),
      COMPILATEUR.bouton(p, "cadrage", rafraichir));
  }

  function bande(p, rafraichir) {
    var is = idees(p);
    var sansAuteur = is.filter(function (i) { return !i.auteur; }).length;
    var retenues = is.filter(function (i) { return i.statut === "retenue"; });
    var juniors = retenues.filter(function (i) {
      var pe = DEPOT.trouve("personnes", i.auteur);
      return pe && pe.seniorite === "junior";
    }).length;
    var ouverts = fils(p).filter(function (f) { return !f.clos; }).length;

    return UI.recevabilite(
      is.length ? "Les idées sont-elles attribuables ?" : "Personne n'a encore posé d'idée",
      [
        { quoi: "Des idées posées", ok: is.length > 0, poids: 5,
          cout: "sans idées écrites avant l'arbitrage, la porte A est un théâtre et l'indicateur juniors reste à zéro" },
        { quoi: "Chacune a son auteur", ok: sansAuteur === 0, poids: 5,
          cout: sansAuteur + (sansAuteur > 1 ? " idées sans auteur" : " idée sans auteur")
            + " — impossible d'attribuer ce qui sera retenu" },
        { quoi: "Une idée retenue", ok: retenues.length > 0, poids: 3,
          cout: "l'atelier n'a rien produit d'opposable" },
        { quoi: "Conversations closes", ok: ouverts === 0, poids: 2,
          cout: ouverts + (ouverts > 1 ? " fils ouverts" : " fil ouvert") + " sans conclusion écrite" },
      ], null,
      [
        { nom: "Poser une idée", fort: !is.length, quand: function () { poserIdee(p, null, rafraichir); } },
        { nom: "Importer un fil", fort: !is.length, quand: function () { IMPORT_FIL.ouvrir(p, rafraichir); } },
        { nom: "Ouvrir un fil", quand: function () { ouvrirFil(p, rafraichir); } },
        juniors ? { nom: juniors + " idée" + (juniors > 1 ? "s" : "") + " de junior retenue" + (juniors > 1 ? "s" : ""), doux: true, quand: function () {} } : null,
      ].filter(Boolean));
  }

  /* ————————————————————— Les idées ————————————————————— */

  function colonneIdees(p, rafraichir) {
    var is = idees(p);
    var parStatut = { proposee: [], retenue: [], ecartee: [] };
    is.forEach(function (i) { (parStatut[i.statut] || parStatut.proposee).push(i); });

    return el("div.at-idees", {},
      el("div.at-tete", {}, el("span.t", {}, "LES IDÉES"),
        el("span.n", {}, is.length + (is.length > 1 ? " posées" : " posée"))),

      !is.length
        ? el("p.rien", {}, "Aucune idée posée. C'est ici qu'elles s'écrivent, avec leur auteur, avant que je tranche.")
        : null,

      ["retenue", "proposee", "ecartee"].map(function (st) {
        if (!parStatut[st].length) return null;
        return el("div.at-groupe." + st, {},
          el("div.atg-t", {}, st === "retenue" ? "RETENUES" : st === "ecartee" ? "ÉCARTÉES" : "EN LICE"),
          parStatut[st].map(function (i) { return carteIdee(p, i, rafraichir); }));
      })
    );
  }

  function carteIdee(p, i, rafraichir) {
    var a = i.auteur ? DEPOT.trouve("personnes", i.auteur) : null;
    var junior = a && a.seniorite === "junior";

    return el("div.at-i." + i.statut, {},
      i.vignette ? el("div.ati-v", {}, IMAGE.vignette(i, "planche")) : null,
      el("div.ati-c", {},
        el("div.ati-t", {}, i.texte),
        el("div.ati-m", {},
          a ? UI.avatar(a, 20) : null,
          el("span", {}, a ? a.nom : "auteur non nommé"),
          junior ? UI.eti("junior", "or") : null,
          el("span.ati-q", {}, O.joli(i.quand))
        ),
        i.motif ? el("div.ati-mo", {}, i.motif) : null,
        el("div.ati-g", {},
          i.statut === "proposee"
            ? el("button.b.nu", { type: "button", onclick: function () { trancher(p, i, "retenue", rafraichir); } }, "retenir")
            : null,
          i.statut === "proposee"
            ? el("button.b.nu", { type: "button", onclick: function () { trancher(p, i, "ecartee", rafraichir); } }, "écarter")
            : null,
          el("button.b.nu", { type: "button", onclick: function () { poserIdee(p, i, rafraichir); } }, "modifier"),
          IMAGE.bouton(i, rafraichir)
        )
      )
    );
  }

  function poserIdee(p, i, rafraichir) {
    var champ = el("textarea", { rows: 3, placeholder: "L'idée, en une phrase" });
    if (i) champ.value = i.texte || "";
    var selA = el("select", {});
    selA.appendChild(el("option", { value: "" }, "— auteur —"));
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court
        + (pe.seniorite === "junior" ? " · junior" : ""));
      if (i && i.auteur === pe.id) o.selected = true;
      selA.appendChild(o);
    });

    PANNEAU.sur(i ? "Modifier l'idée" : "Poser une idée", p.ref, el("div", {},
      UI.banniere("", "L'auteur se saisit maintenant, avant l'arbitrage. C'est ce qui rend « ne jamais s'attribuer l'idée d'un membre de son équipe » vérifiable au lieu d'être déclaratif."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "L'idée"), champ),
        el("div.champ", {}, el("label", {}, "De qui"), selA)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { alert("Une idée sans texte n'est pas une idée."); return; }
          if (!i) {
            if (!p.idees) p.idees = [];
            p.idees.push({ id: O.id("ID"), texte: champ.value.trim(), auteur: selA.value || null,
              quand: new Date().toISOString(), statut: "proposee" });
          } else {
            i.texte = champ.value.trim(); i.auteur = selA.value || null;
          }
          DEPOT.tracer(i ? "idée modifiée" : "idée posée", "atelier", p.id, champ.value.trim().slice(0, 50));
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, i ? "Enregistrer" : "Poser"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function trancher(p, i, statut, rafraichir) {
    var a = i.auteur ? DEPOT.trouve("personnes", i.auteur) : null;
    var champ = el("textarea", { rows: 2, placeholder: "Une ligne d'argument" });

    PANNEAU.sur(statut === "retenue" ? "Retenir cette idée" : "Écarter cette idée", p.ref, el("div", {},
      statut === "retenue" && a
        ? UI.banniere("vert", "L'idée sera attribuée à " + a.nom
            + (a.seniorite === "junior" ? " — et l'indicateur « idées retenues émanant de juniors » bouge." : "")
            + " Son nom apparaîtra dans la plateforme créative sans ressaisie.")
        : statut === "retenue"
          ? UI.banniere("rouge", "Aucun auteur nommé : cette idée sera retenue sans que personne en ait le crédit.")
          : null,
      el("div.form", {}, el("div.champ", {}, el("label", {}, "L'argument"),
        el("div.indice", {}, "Il rejoint la jurisprudence : c'est ce qui reste quand je ne suis pas dans la pièce."), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { alert("Trancher sans argument écrit, c'est trancher par goût."); return; }
          i.statut = statut; i.motif = champ.value.trim();
          i.arbitre_le = new Date().toISOString();
          DEPOT.ajoute("decisions", { objet: i.id, type: "idee", projet: p.id,
            verdict: statut === "retenue" ? "approuve" : "hors", motif: i.motif,
            quand: i.arbitre_le, qui: MAISON.titulaire, titre: i.texte.slice(0, 60) });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, statut === "retenue" ? "Retenir" : "Écarter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— La conversation ————————————————————— */

  function colonneFil(p, rafraichir) {
    var fs = fils(p);
    return el("div.at-fil", {},
      el("div.at-tete", {}, el("span.t", {}, "LA CONVERSATION"),
        el("span.n", {}, fs.length + (fs.length > 1 ? " fils" : " fil"))),

      !fs.length
        ? el("p.rien", {}, "Aucun fil. Un retour dit à l'oral et non écrit reviendra plus tard comme un reproche.")
        : null,

      fs.slice().reverse().map(function (f) { return carteFil(p, f, rafraichir); })
    );
  }

  function carteFil(p, f, rafraichir) {
    return el("div.at-f" + (f.clos ? ".clos" : ""), {},
      el("div.atf-tete", {},
        el("span.atf-s", {}, f.sujet),
        f.clos ? UI.eti("clos", "terne") : UI.eti("ouvert", "attente")),
      el("div.atf-msgs", {}, (f.messages || []).map(function (m) {
        var a = m.qui ? DEPOT.trouve("personnes", m.qui) : null;
        return el("div.atf-m", {},
          a ? UI.avatar(a, 20) : null,
          el("div", {},
            el("div.atfm-t", {}, m.texte),
            el("div.atfm-q", {}, (a ? a.nom : "?") + " · " + O.joli(m.quand))));
      })),
      f.conclusion ? el("div.atf-c", {}, "Conclusion : " + f.conclusion) : null,
      el("div.atf-g", {},
        !f.clos ? el("button.b.nu", { type: "button", onclick: function () { repondre(p, f, rafraichir); } }, "répondre") : null,
        !f.clos ? el("button.b.nu", { type: "button", onclick: function () { clore(p, f, rafraichir); } }, "conclure") : null,
        (f.messages || []).length
          ? el("button.b.nu", { type: "button", onclick: function () { IMPORT_FIL.extraire(p, f, rafraichir); } },
              "→ extraire les idées")
          : null
      )
    );
  }

  function ouvrirFil(p, rafraichir) {
    var sujet = el("input", { type: "text", placeholder: "De quoi on parle" });
    var premier = el("textarea", { rows: 3, placeholder: "Le premier message" });
    var selQ = el("select", {});
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court);
      if (pe.poste === MAISON.titulaire) o.selected = true;
      selQ.appendChild(o);
    });

    PANNEAU.sur("Ouvrir un fil", p.ref, el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Sujet"), sujet),
        el("div.champ", {}, el("label", {}, "De qui"), selQ),
        el("div.champ", {}, el("label", {}, "Le message"), premier)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!sujet.value.trim()) { alert("Un fil sans sujet ne se retrouve pas."); return; }
          if (!p.fils) p.fils = [];
          p.fils.push({ id: O.id("FI"), sujet: sujet.value.trim(), clos: false,
            ouvert_le: new Date().toISOString(),
            messages: premier.value.trim()
              ? [{ qui: selQ.value, texte: premier.value.trim(), quand: new Date().toISOString() }]
              : [] });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Ouvrir"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function repondre(p, f, rafraichir) {
    var champ = el("textarea", { rows: 3, placeholder: "La réponse" });
    var selQ = el("select", {});
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court);
      if (pe.poste === MAISON.titulaire) o.selected = true;
      selQ.appendChild(o);
    });

    PANNEAU.sur("Répondre — " + f.sujet, p.ref, el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "De qui"), selQ),
        el("div.champ", {}, el("label", {}, "Le message"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) return;
          if (!f.messages) f.messages = [];
          f.messages.push({ qui: selQ.value, texte: champ.value.trim(), quand: new Date().toISOString() });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Envoyer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function clore(p, f, rafraichir) {
    var champ = el("textarea", { rows: 2, placeholder: "Ce qui en sort" });
    PANNEAU.sur("Conclure — " + f.sujet, p.ref, el("div", {},
      UI.banniere("", "Un fil qui se ferme sans conclusion écrite se rouvrira à l'identique dans trois semaines."),
      el("div.form", {}, el("div.champ", {}, el("label", {}, "La conclusion"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { alert("Une conclusion vide n'en est pas une."); return; }
          f.clos = true; f.conclusion = champ.value.trim(); f.clos_le = new Date().toISOString();
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, "Conclure"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* Une conversation qui produit une idée : elle passe à gauche, avec son auteur. */
  function versIdee(p, f, rafraichir) {
    var m = (f.messages || [])[(f.messages || []).length - 1];
    if (!p.idees) p.idees = [];
    p.idees.push({ id: O.id("ID"), texte: m ? m.texte : f.sujet, auteur: m ? m.qui : null,
      quand: new Date().toISOString(), statut: "proposee", filId: f.id });
    DEPOT.tracer("idée posée", "atelier", p.id, "depuis le fil « " + f.sujet + " »");
    DEPOT.enregistrer(); rafraichir();
  }

  return { rendre: rendre, idees: idees, fils: fils };
})();
