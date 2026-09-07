/* dispositif.js — une piste n'est pas un visuel, c'est un dispositif.
 *
 * Le KV est ce qu'on montre en présentation. Ce qu'on vend, c'est un ensemble
 * d'actions : de l'affichage, du rayon, un événement, du digital — chacune avec
 * sa date d'exécution et, en amont, sa date de production.
 *
 * Sans ce niveau, retenir une piste ne déclenche rien : on a un visuel validé
 * et personne ne sait ce qu'il faut fabriquer, ni pour quand.
 */

window.DISPOSITIF = (function () {
  var el = O.el;

  /* Le vocabulaire du média, tel qu'il se dit dans une agence. */
  var CANAUX = {
    ATL: { nom: "ATL", quoi: "média payé de masse — affichage, radio, TV, presse",
      couleur: "or" },
    BTL: { nom: "BTL", quoi: "hors média — rayon, PLV, activation, événement, goodies",
      couleur: "vert" },
    TTL: { nom: "TTL", quoi: "les deux à la fois — un dispositif qui traverse",
      couleur: "violet" },
  };

  var LIEUX = {
    outdoor: { nom: "Extérieur", quoi: "rue, piste, façade — vu en mouvement, à distance" },
    indoor: { nom: "Intérieur", quoi: "rayon, mall, point de vente — vu de près, à l'arrêt" },
    digital: { nom: "Digital", quoi: "fil, story, display — vu sans son, sur un téléphone" },
    evenement: { nom: "Événement", quoi: "un lieu, une date, des gens" },
  };

  function liste(pi) { return (pi.dispositif || []).slice(); }

  function creer(pi, a) {
    if (!pi.dispositif) pi.dispositif = [];
    var x = Object.assign({ id: O.id("AC"), canal: "BTL", lieu: "indoor",
      nom: "", quoi: "", marches: [], supports: [], debut: null, fin: null,
      productionAvant: null, fournisseur: "", cout: null }, a || {});
    pi.dispositif.push(x);
    return x;
  }

  /* Les livrables qu'une activité exige : croisement de ses supports et de ses
   * marchés, rapproché de ce qui existe déjà. */
  function pieces(p, pi, a) {
    return (p.livrables || []).filter(function (l) {
      if (l.annule || l.pisteId !== pi.id) return false;
      var s = !(a.supports || []).length || (a.supports || []).indexOf(l.support) !== -1;
      var m = !(a.marches || []).length || (a.marches || []).indexOf(l.marche) !== -1;
      return s && m;
    });
  }

  function manquantes(p, pi, a) {
    var out = [];
    (a.supports || []).forEach(function (sid) {
      (a.marches || []).forEach(function (mid) {
        var existe = (p.livrables || []).some(function (l) {
          return !l.annule && l.pisteId === pi.id && l.support === sid && l.marche === mid;
        });
        if (!existe) out.push({ support: DEPOT.trouve("supports", sid), marche: DEPOT.trouve("marches", mid) });
      });
    });
    return out;
  }

  /* Ce qu'une activité coûte en retard : la production doit être finie avant
   * la date de remise, pas avant la date d'exécution. */
  function tension(p, pi, a) {
    if (!a.productionAvant) return { etat: "flou", texte: "aucune date de production" };
    var reste = Math.round((new Date(a.productionAvant) - new Date(O.jour())) / 86400000);
    var ls = pieces(p, pi, a);
    var pretes = ls.filter(function (l) { return PRODUCTION.ouverte(p, l); }).length;
    var manque = ls.length - pretes;
    if (reste < 0) return { etat: "depasse", texte: "production dépassée de " + (-reste) + " j",
      reste: reste, manque: manque };
    if (!manque) return { etat: "tenu", texte: "tout est prêt", reste: reste, manque: 0 };
    return { etat: reste < 10 ? "tendu" : "encours",
      texte: manque + (manque > 1 ? " livrables à produire" : " livrable à produire") + " en " + reste + " j",
      reste: reste, manque: manque };
  }

  /* ————————————————————— Le bloc, dans la piste ————————————————————— */

  function bloc(p, pi, apres) {
    var acts = liste(pi);
    var parCanal = { ATL: [], BTL: [], TTL: [] };
    acts.forEach(function (a) { (parCanal[a.canal] || parCanal.BTL).push(a); });

    return el("div.rt-bloc", {},
      el("div.rtbl-tete", {},
        el("span.t", {}, "LE DISPOSITIF"),
        el("span.n", {}, acts.length
          ? acts.length + (acts.length > 1 ? " activités" : " activité")
          : "aucune activité"),
        el("button.b.nu", { type: "button", onclick: function () { editer(p, pi, null, apres); } },
          "+ activité")),

      !acts.length
        ? el("p.rien", {}, "Cette piste n'a pas de dispositif. Un concept sans actions ne se vend pas et ne se produit pas : on ne saurait pas quoi fabriquer le jour où elle est retenue.")
        : Object.keys(parCanal).map(function (c) {
            if (!parCanal[c].length) return null;
            return el("div.di-canal", {},
              el("div.dic-t", {}, el("span.dic-b." + CANAUX[c].couleur, {}, CANAUX[c].nom),
                el("span", {}, CANAUX[c].quoi)),
              el("div.di-l", {}, parCanal[c].map(function (a) { return ligne(p, pi, a, apres); })));
          })
    );
  }

  function ligne(p, pi, a, apres) {
    var t = tension(p, pi, a);
    var ls = pieces(p, pi, a);
    var manq = manquantes(p, pi, a);

    return el("button.di-a." + t.etat, { type: "button",
      onclick: function () { editer(p, pi, a, apres); } },
      el("div.dia-h", {},
        el("span.dia-lieu", {}, LIEUX[a.lieu].nom),
        el("span.dia-nom", {}, a.nom || "activité sans nom"),
        el("span.dia-t", {}, t.texte)),
      el("div.dia-q", {}, a.quoi || ""),
      el("div.dia-m", {},
        el("span", {}, ls.length + (ls.length > 1 ? " livrables" : " livrable")),
        manq.length ? el("span.alerte", {}, manq.length + " à créer") : null,
        (a.marches || []).length
          ? el("span", {}, (a.marches || []).map(function (id) {
              var m = DEPOT.trouve("marches", id); return m ? m.code : "?"; }).join(" · "))
          : el("span.alerte", {}, "aucun marché"),
        a.debut ? el("span", {}, "exécution " + O.joli(a.debut)) : null,
        a.productionAvant ? el("span", {}, "production avant " + O.joli(a.productionAvant)) : null)
    );
  }

  /* ————————————————————— Saisir une activité ————————————————————— */

  function editer(p, pi, a, apres) {
    var neuf = !a;
    a = a || { canal: "BTL", lieu: "indoor", marches: [], supports: [] };

    var nom = el("input", { type: "text", placeholder: "Tête de gondole 300 magasins" });
    nom.value = a.nom || "";
    var quoi = el("textarea", { rows: 2, placeholder: "Ce qui se passe, en une phrase" });
    quoi.value = a.quoi || "";

    var selC = el("select", {});
    Object.keys(CANAUX).forEach(function (k) {
      var o = el("option", { value: k }, CANAUX[k].nom + " — " + CANAUX[k].quoi);
      if (a.canal === k) o.selected = true;
      selC.appendChild(o);
    });
    var selL = el("select", {});
    Object.keys(LIEUX).forEach(function (k) {
      var o = el("option", { value: k }, LIEUX[k].nom + " — " + LIEUX[k].quoi);
      if (a.lieu === k) o.selected = true;
      selL.appendChild(o);
    });

    var chM = chips(DEPOT.liste("marches").map(function (m) { return { id: m.id, nom: m.nom }; }), a.marches || []);
    var chS = chips(DEPOT.liste("supports").map(function (s) { return { id: s.id, nom: s.nom }; }), a.supports || []);

    var debut = el("input", { type: "date" }); debut.value = a.debut || "";
    var fin = el("input", { type: "date" }); fin.value = a.fin || "";
    var prod = el("input", { type: "date" }); prod.value = a.productionAvant || "";
    var four = el("input", { type: "text", placeholder: "Imprimeur, régie, agence relais" });
    four.value = a.fournisseur || "";

    var onde = el("div");
    function dessiner() {
      var faux = Object.assign({}, a, { marches: chM.valeurs(), supports: chS.valeurs() });
      var ls = pieces(p, pi, faux);
      var manq = manquantes(p, pi, faux);
      O.vider(onde);
      onde.appendChild(el("div.stats", {},
        UI.stat("PIÈCES EXISTANTES", String(ls.length), "déjà au dossier", ""),
        UI.stat("À CRÉER", String(manq.length),
          manq.length ? "croisements non couverts" : "rien ne manque",
          manq.length ? "alerte" : ""),
        prod.value && debut.value
          ? UI.stat("MARGE", Math.round((new Date(debut.value) - new Date(prod.value)) / 86400000) + " j",
              "entre remise et exécution",
              (new Date(debut.value) - new Date(prod.value)) < 0 ? "alerte" : "")
          : null
      ));
      if (manq.length) {
        onde.appendChild(UI.banniere("", manq.slice(0, 5).map(function (x) {
          return (x.support ? x.support.nom : "?") + " · " + (x.marche ? x.marche.code : "?");
        }).join(" · ") + (manq.length > 5 ? "  et " + (manq.length - 5) + " autres" : "")
          + " — à créer au moment où la piste est retenue."));
      }
    }
    chM.surChangement(dessiner); chS.surChangement(dessiner);
    debut.addEventListener("change", dessiner); prod.addEventListener("change", dessiner);
    dessiner();

    PANNEAU.sur(neuf ? "Nouvelle activité" : "Modifier l'activité", pi.titre || "", el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Nom"), nom),
        el("div.champ", {}, el("label", {}, "Ce qui se passe"), quoi),
        el("div.champ", {}, el("label", {}, "Canal"), selC),
        el("div.champ", {}, el("label", {}, "Où"), selL),
        el("div.champ", {}, el("label", {}, "Marchés"), chM.noeud),
        el("div.champ", {}, el("label", {}, "Supports"), chS.noeud),
        el("div.champ", {}, el("label", {}, "Exécution — début"), debut),
        el("div.champ", {}, el("label", {}, "Exécution — fin"), fin),
        el("div.champ", {}, el("label", {}, "Production avant le"),
          el("div.indice", {}, "La date de remise du fichier, pas celle de l'affichage. C'est elle qui commande la charge."), prod),
        el("div.champ", {}, el("label", {}, "Fournisseur"), four)),
      onde,
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!nom.value.trim()) { AVIS.refus("Une activité sans nom ne se pilote pas."); return; }
          var cible = neuf ? creer(pi) : a;
          cible.nom = nom.value.trim(); cible.quoi = quoi.value.trim();
          cible.canal = selC.value; cible.lieu = selL.value;
          cible.marches = chM.valeurs(); cible.supports = chS.valeurs();
          cible.debut = debut.value || null; cible.fin = fin.value || null;
          cible.productionAvant = prod.value || null; cible.fournisseur = four.value.trim();
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, neuf ? "Créer" : "Enregistrer"),
        !neuf ? el("button.b.nu", { type: "button", onclick: function () {
          if (!window.confirm("Retirer cette activité ?")) return;
          pi.dispositif = liste(pi).filter(function (x) { return x.id !== a.id; });
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (apres) apres();
        } }, "Retirer") : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  function chips(liste, depart) {
    var sel = (depart || []).slice();
    var ecouteurs = [];
    var boite = el("div.chips");
    liste.forEach(function (x) {
      var b = el("button.chip", { type: "button",
        "aria-pressed": sel.indexOf(x.id) !== -1 ? "true" : null,
        onclick: function () {
          var i = sel.indexOf(x.id);
          if (i === -1) sel.push(x.id); else sel.splice(i, 1);
          b.setAttribute("aria-pressed", sel.indexOf(x.id) !== -1 ? "true" : "false");
          ecouteurs.forEach(function (f) { f(); });
        } }, x.nom);
      boite.appendChild(b);
    });
    return { noeud: boite, valeurs: function () { return sel; },
      surChangement: function (f) { ecouteurs.push(f); } };
  }

  /* ————————————————————— Ce que retenir déclenche ————————————————————— */

  /* Retenir une piste ne valide pas un visuel : ça ouvre la production de tout
   * son dispositif. Voici ce que ça fabrique. */
  function declenche(p, pi) {
    var aCreer = [];
    liste(pi).forEach(function (a) {
      manquantes(p, pi, a).forEach(function (x) {
        if (!x.support || !x.marche) return;
        var deja = aCreer.some(function (y) {
          return y.support.id === x.support.id && y.marche.id === x.marche.id; });
        if (!deja) aCreer.push({ support: x.support, marche: x.marche, activite: a });
      });
    });
    var existantes = (p.livrables || []).filter(function (l) {
      return !l.annule && l.pisteId === pi.id; });
    return { aCreer: aCreer, existantes: existantes,
      sansBAT: existantes.filter(function (l) { return !PRODUCTION.de(l, "bat").length; }) };
  }

  /* Créer les livrables manquantes du dispositif, d'un coup. */
  function ouvrirProduction(p, pi) {
    var d = declenche(p, pi);
    d.aCreer.forEach(function (x) {
      var axes = {};
      MAISON.axes.forEach(function (a) { axes[a.cle] = "attente"; });
      /* Le format naît de l'adaptation du marché si elle existe, sinon du master. */
      var parent = (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id && KV.estAdaptation(l) && l.marche === x.marche.id;
      })[0] || (p.livrables || []).filter(function (l) {
        return !l.annule && l.pisteId === pi.id && KV.estMaitre(l); })[0];

      p.livrables.push({
        id: O.id("L"), niveau: "declinaison", nom: x.support.nom + " · " + x.marche.code,
        support: x.support.id, marche: x.marche.id, voletId: "V-formats",
        pisteId: pi.id, maitre: parent ? parent.id : null,
        versionMaitre: parent ? (parent.version || 1) : null,
        responsable: null, origine: "prevu",
        echeance: x.activite.productionAvant, remise: x.activite.productionAvant,
        publication: x.activite.debut,
        version: 1, versions: [], estime: 1, reel: null, toursVendus: 2,
        assets: [], entrees: [], annotations: [], mockups: [], fichiers: [], axes: axes,
        activiteId: x.activite.id,
      });
    });
    DEPOT.tracer("production ouverte", "dispositif", p.id,
      d.aCreer.length + " livrables créés depuis le dispositif de « " + pi.titre + " »");
    return d.aCreer.length;
  }

  return { CANAUX: CANAUX, LIEUX: LIEUX, liste: liste, creer: creer,
    pieces: pieces, manquantes: manquantes, tension: tension,
    bloc: bloc, editer: editer, declenche: declenche, ouvrirProduction: ouvrirProduction };
})();
