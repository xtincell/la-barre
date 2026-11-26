/* vue-atelier.js — l'endroit où l'équipe parle, et où les idées se posent.
 *
 * Deux manques que rien ne couvrait : je n'avais aucun endroit pour discuter
 * avec mes gars, et aucun endroit pour recueillir leurs idées avant que je
 * tranche. Or l'indicateur « idées retenues émanant de juniors » suppose
 * exactement ça — des idées posées, avec leur auteur, avant l'arbitrage.
 *
 * Idées et discussions sont le travail de la séance. Les documents qui la
 * préparent et les contrôles de sortie restent consultables dans le même écran.
 */

window.VUE_ATELIER = (function () {
  var el = O.el;

  function idees(p) { return (p.idees || []).slice(); }
  function fils(p) { return (p.fils || []).slice(); }

  /* ————————————————————— L'écran ————————————————————— */

  function rendre(p, rafraichir) {
    var is = idees(p);
    var fs = fils(p);
    var preparation = window.PREPARATION ? PREPARATION.de(p) : null;
    return el("div.at", {},
      el("header.at-entete", {},
        el("div", {},
          el("h2", {}, "Séance de créa"),
          preparation && preparation.question ? el("p.at-question", {}, preparation.question) : null),
        el("button.b.or.at-action", { type: "button", onclick: function () { poserIdee(p, null, rafraichir); } },
          "Poser une idée")),
      el("div.at-corps", {},
        colonneIdees(p, is, rafraichir),
        colonneFil(p, fs, rafraichir)),
      el("details.at-coulisses.pj-detail", { "data-pj-detail": "atelier-preparation" },
        el("summary", {}, "Préparation et contrôles"),
        el("div.at-coulisses-corps", {},
          briefing(p, rafraichir),
          window.PREPARATION ? PREPARATION.bloc(p, rafraichir) : null,
          controles(is, fs),
          compteurJuniors(is)))
    );
  }


  /* ————————————————————— L'indicateur qui fait la décision ————————————————————— */

  /* Le compteur se calcule à partir des idées signées au moment de l'arbitrage. */
  function compteurJuniors(is) {
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
        el("div.aj-n", {}, jr > 1 ? "idées de juniors retenues" : "idée de junior retenue"),
        el("div.aj-x", {}, jp
          ? "Sur " + jp + (jp > 1 ? " idées proposées par des juniors." : " idée proposée par un junior.")
          : "Aucune idée proposée par un junior.")));
  }

  /* Un atelier ne se convoque pas sur une intuition : il se convoque sur un
   * cadrage. Le document est là, compilé, avec ce qui lui manque. */
  function briefing(p, rafraichir) {
    var manques = COMPILATEUR.controles(p, "cadrage").filter(function (c) { return !c.ok; });
    return el("div.at-brief" + (manques.length ? ".manque" : ""), {},
      el("div.atb-c", {},
        el("div.atb-t", {}, "Le briefing de cet atelier"),
        el("div.atb-q", {}, manques.length
          ? manques.length + (manques.length > 1 ? " points à compléter dans le cadrage" : " point à compléter dans le cadrage")
          : "Le cadrage est complet."),
        manques.length ? el("ul.atb-manques", {}, manques.map(function (c) { return el("li", {}, c.quoi); })) : null),
      COMPILATEUR.bouton(p, "cadrage", rafraichir));
  }

  function controles(is, fs) {
    var sansAuteur = is.filter(function (i) { return !i.auteur; }).length;
    var retenues = is.filter(function (i) { return i.statut === "retenue"; });
    var ouverts = fs.filter(function (f) { return !f.clos; }).length;

    return UI.recevabilite(
      "Conditions de sortie de la séance",
      [
        { quoi: "Des idées posées", ok: is.length > 0, poids: 5,
          cout: "Consignez les idées avant l’arbitrage." },
        { quoi: "Chacune a son auteur", ok: sansAuteur === 0, poids: 5,
          cout: sansAuteur + (sansAuteur > 1 ? " idées sans auteur" : " idée sans auteur")
            + " à nommer avant l’arbitrage." },
        { quoi: "Une idée retenue", ok: retenues.length > 0, poids: 3,
          cout: "Aucune idée n’a encore été retenue." },
        { quoi: "Conversations closes", ok: ouverts === 0, poids: 2,
          cout: ouverts + (ouverts > 1 ? " fils ouverts" : " fil ouvert") + " sans conclusion écrite" },
      ]);
  }

  /* ————————————————————— Les idées ————————————————————— */

  function colonneIdees(p, is, rafraichir) {
    var parStatut = { proposee: [], retenue: [], ecartee: [] };
    is.forEach(function (i) { (parStatut[i.statut] || parStatut.proposee).push(i); });

    return el("section.at-idees", { "aria-labelledby": "at-idees" },
      el("div.at-tete", {}, el("h3.t", { id: "at-idees" }, "Idées"),
        is.length ? el("span.n", {}, String(is.length)) : null),

      !is.length
        ? el("div.at-vide", {}, el("strong", {}, "Aucune idée pour l’instant"),
          el("p", {}, "Consignez une proposition avec son auteur avant de l’arbitrer."))
        : null,

      ["proposee", "retenue", "ecartee"].map(function (st) {
        if (!parStatut[st].length) return null;
        return el("div.at-groupe." + st, {},
          el("h4.atg-t", {}, st === "retenue" ? "Retenues" : st === "ecartee" ? "Écartées" : "À examiner"),
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
          el("span", {}, a ? a.nom : "Auteur non nommé"),
          junior ? UI.eti("junior", "or") : null,
          el("span.ati-q", {}, O.joli(i.quand))
        ),
        i.motif ? el("div.ati-mo", {}, i.motif) : null,
        el("div.ati-g", {},
          i.statut === "proposee"
            ? el("button.b.nu", { type: "button", onclick: function () { trancher(p, i, "retenue", rafraichir); } }, "Retenir")
            : null,
          i.statut === "proposee"
            ? el("button.b.nu", { type: "button", onclick: function () { trancher(p, i, "ecartee", rafraichir); } }, "Écarter")
            : null,
          el("button.b.nu", { type: "button", onclick: function () { poserIdee(p, i, rafraichir); } }, "Modifier"),
          IMAGE.bouton(i, rafraichir)
        )
      )
    );
  }

  function poserIdee(p, i, rafraichir) {
    var champ = el("textarea", { id: "at-idee-texte", rows: 3, placeholder: "Une phrase pour expliquer la proposition" });
    if (i) champ.value = i.texte || "";
    var selA = el("select", { id: "at-idee-auteur" });
    selA.appendChild(el("option", { value: "" }, "Sélectionner un auteur"));
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court
        + (pe.seniorite === "junior" ? " · junior" : ""));
      if (i && i.auteur === pe.id) o.selected = true;
      selA.appendChild(o);
    });

    PANNEAU.sur(i ? "Modifier l'idée" : "Poser une idée", p.ref, el("div", {},
      el("p.ch-aide", {}, "Nommez l’auteur pour que l’idée lui soit attribuée lors de l’arbitrage."),
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "at-idee-texte" }, "Idée"), champ),
        el("div.champ", {}, el("label", { "for": "at-idee-auteur" }, "Auteur"), selA)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Écrivez l’idée avant de l’enregistrer."); champ.focus(); return; }
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
    var champ = el("textarea", { id: "at-idee-motif", rows: 2, placeholder: "Une ligne d’argument" });

    PANNEAU.sur(statut === "retenue" ? "Retenir cette idée" : "Écarter cette idée", p.ref, el("div", {},
      statut === "retenue" && a
        ? UI.banniere("vert", "L'idée sera attribuée à " + a.nom
            + (a.seniorite === "junior" ? " — et l'indicateur « idées retenues émanant de juniors » bouge." : "")
            + " Son nom apparaîtra dans la plateforme créative sans ressaisie.")
        : statut === "retenue"
          ? UI.banniere("rouge", "Aucun auteur nommé : cette idée sera retenue sans que personne en ait le crédit.")
          : null,
      el("div.form", {}, el("div.champ", {}, el("label", { "for": "at-idee-motif" }, "Argument"),
        el("div.indice", {}, "Il reste consultable dans le journal des décisions."), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Ajoutez un argument pour enregistrer la décision."); champ.focus(); return; }
          i.statut = statut; i.motif = champ.value.trim();
          i.arbitre_le = new Date().toISOString();
          DECISION.poser({ objet: i.id, type: "idee", projet: p.id,
            verdict: statut === "retenue" ? "approuve" : "hors", motif: i.motif,
            quand: i.arbitre_le, qui: MAISON.titulaire, titre: i.texte.slice(0, 60) });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); rafraichir();
        } }, statut === "retenue" ? "Retenir" : "Écarter"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* ————————————————————— La conversation ————————————————————— */

  function colonneFil(p, fs, rafraichir) {
    return el("section.at-fil", { "aria-labelledby": "at-fils" },
      el("div.at-tete", {}, el("h3.t", { id: "at-fils" }, "Discussions"),
        fs.length ? el("span.n", {}, String(fs.length)) : null),

      !fs.length
        ? el("p.at-fil-vide", {}, "Aucun fil dans cette séance.")
        : null,

      el("div.at-fil-actions", {},
        el("button.studio-lien", { type: "button", onclick: function () { ouvrirFil(p, rafraichir); } }, "Ouvrir un fil"),
        el("button.studio-lien", { type: "button", onclick: function () { IMPORT_FIL.ouvrir(p, rafraichir); } }, "Importer un fil")),
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
        !f.clos ? el("button.b.nu", { type: "button", onclick: function () { repondre(p, f, rafraichir); } }, "Répondre") : null,
        !f.clos ? el("button.b.nu", { type: "button", onclick: function () { clore(p, f, rafraichir); } }, "Conclure") : null,
        (f.messages || []).length
          ? el("button.b.nu", { type: "button", onclick: function () { IMPORT_FIL.extraire(p, f, rafraichir); } },
              "Extraire les idées →")
          : null
      )
    );
  }

  function ouvrirFil(p, rafraichir) {
    var sujet = el("input", { id: "at-fil-sujet", type: "text" });
    var premier = el("textarea", { id: "at-fil-premier", rows: 3 });
    var selQ = el("select", { id: "at-fil-auteur" });
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court);
      if (pe.poste === MAISON.titulaire) o.selected = true;
      selQ.appendChild(o);
    });

    PANNEAU.sur("Ouvrir un fil", p.ref, el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "at-fil-sujet" }, "Sujet"), sujet),
        el("div.champ", {}, el("label", { "for": "at-fil-auteur" }, "Auteur"), selQ),
        el("div.champ", {}, el("label", { "for": "at-fil-premier" }, "Message"), premier)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!sujet.value.trim()) { AVIS.refus("Un fil sans sujet ne se retrouve pas."); return; }
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
    var champ = el("textarea", { id: "at-fil-reponse", rows: 3 });
    var selQ = el("select", { id: "at-fil-repondant" });
    DEPOT.liste("personnes").forEach(function (pe) {
      var o = el("option", { value: pe.id }, pe.nom + " · " + O.poste(pe.poste).court);
      if (pe.poste === MAISON.titulaire) o.selected = true;
      selQ.appendChild(o);
    });

    PANNEAU.sur("Répondre — " + f.sujet, p.ref, el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "at-fil-repondant" }, "Auteur"), selQ),
        el("div.champ", {}, el("label", { "for": "at-fil-reponse" }, "Réponse"), champ)),
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
    var champ = el("textarea", { id: "at-fil-conclusion", rows: 2 });
    PANNEAU.sur("Conclure — " + f.sujet, p.ref, el("div", {},
      UI.banniere("", "Un fil qui se ferme sans conclusion écrite se rouvrira à l'identique dans trois semaines."),
      el("div.form", {}, el("div.champ", {}, el("label", { "for": "at-fil-conclusion" }, "Conclusion"), champ)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Une conclusion vide n'en est pas une."); return; }
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
