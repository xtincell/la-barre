/* demande.js — la demande de proposition créative.
 *
 * C'est le seul document que j'émets vers mon équipe, et le processus impose
 * son ordre de rédaction : on ferme d'abord, on ouvre ensuite. L'inverse donne
 * l'impression de reprendre d'une main ce qu'on donne de l'autre.
 *
 * Donc, dans cet ordre et pas un autre :
 *   1 · le DA nommé          — champ bloquant du §10
 *   2 · l'étage autorisé     — et ce qu'il plafonne
 *   3 · les critères         — les seuls éléments opposables
 *   4 · les interdits
 *   5 · le périmètre d'expression — ce qu'il décide seul, et que personne ne discutera
 *   6 · le délai et les entrées
 *
 * Le formulaire ne propose pas d'émettre tant que le périmètre d'expression est
 * vide. C'est le seul endroit où l'outil impose un ordre, et c'est pour protéger
 * la latitude du DA.
 */

window.DEMANDE = (function () {
  var el = O.el;

  var ETATS = {
    brouillon: { nom: "Brouillon", ton: "terne" },
    emise: { nom: "Émise", ton: "attente" },
    recue: { nom: "Proposition reçue", ton: "vert" },
    close: { nom: "Close", ton: "terne" },
  };

  function toutes(p) { return (p.demandes || []).slice(); }

  function ouvertes(p) {
    return toutes(p).filter(function (d) { return d.etat === "emise"; });
  }

  /* Ce qu'une demande doit porter pour être recevable par un DA. */
  function recevabilite(p, d) {
    var e = MAISON.etages.filter(function (x) { return x.n === d.etage; })[0];
    return [
      { quoi: "Un DA nommé", ok: !!d.da, poids: 5,
        cout: "champ bloquant du §10 : sans nom, personne n'est en défaut le jour où rien n'arrive" },
      { quoi: "Étage autorisé", ok: d.etage !== null && d.etage !== undefined, poids: 4,
        cout: "sans plafond d'effort, la proposition arrivera finie — et l'écart se paiera en jours" },
      { quoi: "Critères d'acceptation", ok: (d.criteres || []).length > 0, poids: 5,
        cout: "ce travail ne pourra être refusé que par goût" },
      { quoi: "Périmètre d'expression", ok: (d.latitude || []).length > 0, poids: 5,
        cout: "rien n'est donné au DA : il exécutera au lieu de proposer, et la porte A se ferme" },
      { quoi: "Un délai", ok: !!d.echeance, poids: 3,
        cout: "aucune date : la charge ne peut être ni placée ni réclamée" },
      { quoi: "Entrées fournies", ok: (d.entrees || []).length > 0, poids: 2,
        cout: "il attendra des fichiers que personne ne doit lui donner" },
      { quoi: "Étage cohérent avec la plateforme de marque", ok: !!(p.sections.socle || {}).idee_directrice, poids: 3,
        cout: "sans plateforme de marque active, la proposition pourra être refusée en revue sans recours" },
      { quoi: "Rattachée à une big idea", ok: !!(p.sections.bigidea || {}).idee, poids: 4,
        cout: e ? "à l'étage " + e.n + ", le DA n'a rien à traiter — il inventera l'idée aussi" : "" },
    ];
  }

  function pret(p, d) { return recevabilite(p, d).every(function (c) { return c.ok; }); }

  /* ————————————————————— Le bloc, dans le projet ————————————————————— */

  function bloc(p, rafraichir) {
    var ds = toutes(p);
    return el("div.dm", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, "LES DEMANDES DE PROPOSITION"),
        el("span.n", {}, ds.length ? ds.length + (ds.length > 1 ? " émises" : " émise") : "aucune"),
        el("button.b.nu", { type: "button", onclick: function () { editer(p, null, rafraichir); } },
          "+ demande")),

      !ds.length
        ? el("p.rien", {}, "Aucune demande émise. Tant qu'il n'y en a pas, ce qui arrivera du DA ne pourra être refusé sur aucun critère écrit.")
        : el("div.dm-l", {}, ds.map(function (d) { return ligne(p, d, rafraichir); }))
    );
  }

  function ligne(p, d, rafraichir) {
    var da = DEPOT.trouve("personnes", d.da);
    var e = MAISON.etages.filter(function (x) { return x.n === d.etage; })[0];
    var manque = recevabilite(p, d).filter(function (c) { return !c.ok; }).length;
    var retard = d.echeance ? Math.round((new Date(d.echeance) - new Date(O.jour())) / 86400000) : null;

    return el("button.dm-d." + ETATS[d.etat].ton + (manque ? " manque" : ""), { type: "button",
      onclick: function () { editer(p, d, rafraichir); } },
      el("div.dmd-h", {},
        da ? UI.avatar(da, 22) : UI.avatar(null, 22),
        el("span.dmd-n", {}, d.titre || "Demande sans titre")),
      ETAT.ligne(ETAT.demande(d), "dmd-etat"),
      el("div.dmd-m", {},
        el("span", {}, da ? da.nom : "aucun DA nommé"),
        e ? el("span", {}, "étage " + e.n + " · " + e.effort + " %") : el("span.alerte", {}, "étage non fixé"),
        el("span", {}, (d.criteres || []).length + " critères"),
        el("span" + ((d.latitude || []).length ? "" : ".alerte"), {},
          (d.latitude || []).length + " points de latitude"),
        d.echeance
          ? el("span" + (retard < 0 ? ".alerte" : retard < 3 ? ".attente" : ""), {},
              retard < 0 ? "en retard de " + (-retard) + " j" : "dans " + retard + " j")
          : el("span.alerte", {}, "sans délai")),
      manque ? el("div.dmd-k", {}, manque + (manque > 1 ? " conditions manquantes" : " condition manquante")) : null
    );
  }

  /* ————————————————————— Le formulaire, dans l'ordre imposé ————————————————————— */

  function editer(p, d, rafraichir) {
    var neuf = !d;
    d = d || { etat: "brouillon", etage: 1, criteres: [], interdits: [], latitude: [], entrees: [] };

    var titre = el("input", { type: "text", placeholder: "Proposition créative — lancement Beignet Paradise" });
    titre.value = d.titre || "";

    /* 1 · Le DA */
    var selDA = el("select", {});
    selDA.appendChild(el("option", { value: "" }, "— nommer un DA —"));
    DEPOT.liste("personnes").filter(function (x) {
      return x.poste === "da" || (x.casquettes || []).some(function (c) { return c.poste === "da"; });
    }).forEach(function (x) {
      var o = el("option", { value: x.id }, x.nom + " · " + O.poste(x.poste).court);
      if (d.da === x.id) o.selected = true;
      selDA.appendChild(o);
    });

    /* 2 · L'étage */
    var selE = el("select", {});
    MAISON.etages.forEach(function (x) {
      var o = el("option", { value: x.n },
        "Étage " + x.n + " — " + x.nom + "  ·  " + x.effort + " %  ·  " + x.produit);
      if (d.etage === x.n) o.selected = true;
      selE.appendChild(o);
    });

    /* 3 · Les critères — repris de la big idea, complétables */
    var critB = ((p.sections.bigidea || {}).criteres || []);
    var lCrit = puces(d.criteres && d.criteres.length ? d.criteres : critB.slice(),
      "Un critère par ligne — ce sont les seuls éléments opposables");
    /* 4 · Les interdits */
    var lInt = puces(d.interdits && d.interdits.length ? d.interdits
      : ((p.sections.bigidea || {}).interdits || []).slice(), "Une direction interdite par ligne");
    /* 5 · Le périmètre d'expression */
    var lLat = puces(d.latitude || [], "Ce qu'il décide seul, et que personne ne rediscutera");
    /* 6 · Les entrées */
    var lEnt = puces(d.entrees || [], "Un élément fourni par ligne, avec qui le fournit");

    var ech = el("input", { type: "date" }); ech.value = d.echeance || "";

    var bande = el("div");
    function dessiner() {
      var faux = Object.assign({}, d, {
        da: selDA.value, etage: parseInt(selE.value, 10),
        criteres: lCrit.valeurs(), interdits: lInt.valeurs(),
        latitude: lLat.valeurs(), entrees: lEnt.valeurs(), echeance: ech.value,
      });
      O.vider(bande);
      bande.appendChild(UI.recevabilite("Cette demande est-elle recevable par un DA ?",
        recevabilite(p, faux), null, []));
    }
    [selDA, selE, ech].forEach(function (x) { x.addEventListener("change", dessiner); });
    [lCrit, lInt, lLat, lEnt].forEach(function (x) { x.surChangement(dessiner); });
    dessiner();

    var e0 = MAISON.etages.filter(function (x) { return x.n === (d.etage || 1); })[0];
    var aideE = el("div.indice", {}, e0 ? "Ouvert par : " + e0.ouvertPar : "");
    selE.addEventListener("change", function () {
      var x = MAISON.etages.filter(function (y) { return y.n === parseInt(selE.value, 10); })[0];
      aideE.textContent = x ? "Ouvert par : " + x.ouvertPar : "";
    });

    PANNEAU.ouvrir(neuf ? "Nouvelle demande de proposition" : (d.titre || "Demande"), p.ref, el("div", {},
      bande,
      UI.banniere("", "L'ordre de ce formulaire est celui du §5, porte C : on ferme d'abord, on ouvre ensuite. L'inverse donne l'impression de reprendre d'une main ce qu'on donne de l'autre."),

      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Titre"), titre)),

      etape(1, "Le DA nommé", "Champ bloquant du §10. Une direction ne se demande pas à un service.", selDA),
      etape(2, "L'étage autorisé", "Ce qu'il plafonne, et ce que le client aura signé pour l'ouvrir.",
        el("div", {}, selE, aideE)),
      etape(3, "Les critères d'acceptation", "Écrits avant de lire. Ce sont les seuls éléments opposables — sans eux, je ne pourrai refuser que par goût.", lCrit.noeud),
      etape(4, "Les interdits", "Les directions que je ne veux pas voir revenir. Dites maintenant, pas en revue.", lInt.noeud),
      etape(5, "Le périmètre d'expression", "Ce que le DA décide seul et que personne ne rediscutera. C'est la porte A : sans cette zone, il exécute au lieu de proposer.", lLat.noeud),
      etape(6, "Le délai et les entrées", "La date, et ce que je lui fournis avec qui le fournit.",
        el("div", {}, el("div.champ", {}, el("label", {}, "Attendue le"), ech), lEnt.noeud)),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var cible = enregistrer();
          if (!(cible.latitude || []).length) {
            AVIS.refus("Le périmètre d'expression est vide. Émettre ainsi, c'est demander une exécution, pas une proposition.");
            return;
          }
          cible.etat = "emise"; cible.emise_le = new Date().toISOString();
          DEPOT.tracer("demande émise", "demandes", p.id, cible.titre || "");
          DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Émettre au DA"),
        el("button.b", { type: "button", onclick: function () {
          enregistrer(); DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
        } }, "Enregistrer en brouillon"),
        !neuf && d.etat === "emise"
          ? el("button.b", { type: "button", onclick: function () {
              enregistrer(); d.etat = "recue"; d.recue_le = new Date().toISOString();
              DEPOT.enregistrer(); PANNEAU.fermer(); rafraichir();
            } }, "Proposition reçue")
          : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));

    function enregistrer() {
      var cible = d;
      if (neuf) {
        if (!p.demandes) p.demandes = [];
        cible = { id: O.id("DP"), etat: "brouillon", cree_le: new Date().toISOString() };
        p.demandes.push(cible);
      }
      cible.titre = titre.value.trim() || "Demande de proposition";
      cible.da = selDA.value || null;
      cible.etage = parseInt(selE.value, 10);
      cible.criteres = lCrit.valeurs();
      cible.interdits = lInt.valeurs();
      cible.latitude = lLat.valeurs();
      cible.entrees = lEnt.valeurs();
      cible.echeance = ech.value || null;
      return cible;
    }
  }

  function etape(n, t, aide, corps) {
    return el("div.dm-e", {},
      el("div.dme-t", {}, el("span.dme-n", {}, String(n)), t),
      el("div.dme-a", {}, aide),
      el("div.dme-c", {}, corps));
  }

  function puces(depart, aide) {
    var v = (depart || []).slice();
    var ecouteurs = [];
    var zone = el("textarea", { rows: 3, placeholder: aide });
    zone.value = v.join("\n");
    zone.addEventListener("input", function () { ecouteurs.forEach(function (f) { f(); }); });
    return {
      noeud: el("div", {}, zone),
      valeurs: function () {
        return zone.value.split("\n").map(function (x) { return x.trim(); })
          .filter(function (x) { return x; });
      },
      surChangement: function (f) { ecouteurs.push(f); },
    };
  }

  return { ETATS: ETATS, toutes: toutes, ouvertes: ouvertes,
    recevabilite: recevabilite, pret: pret, bloc: bloc, editer: editer };
})();
