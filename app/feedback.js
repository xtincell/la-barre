/* feedback.js — le retour client, daté, signé, et compté.
 *
 * Un retour qui n'a ni auteur ni date ne se conteste pas. Trois mois plus tard,
 * « on a dû refaire trois fois » n'a plus de responsable et la clause de reprise
 * ne vaut rien.
 *
 * Ici un feedback est un objet du dépôt, pas du projet : il traverse les
 * dossiers. C'est ce qui permet de répondre à la seule question qui compte en
 * fin de trimestre — qui a bousculé le pipeline, et de combien.
 */

window.FEEDBACK = (function () {
  var el = O.el;

  var CANAUX = {
    seance: { nom: "En séance", trace: true },
    ecrit: { nom: "Par écrit", trace: true },
    message: { nom: "Par messagerie", trace: false,
      cout: "un retour WhatsApp n'a pas de version : on ne saura pas sur quoi il portait" },
    oral: { nom: "À l'oral", trace: false,
      cout: "aucune trace côté client : il pourra dire qu'il n'a jamais demandé ça" },
  };

  /* Le niveau auquel un retour s'applique. C'est lui qui dit l'onde de choc et
   * l'ordre de traitement — traiter une déclinaison avant le KV dont elle vient,
   * c'est la refaire deux fois.
   *
   * Les niveaux suivent le modèle : idée → KV maître → adaptation → déclinaison.
   * Et un cinquième, transversal : la MANIÈRE — la règle de déclinaison, qui ne
   * vise aucune pièce en particulier mais toutes celles à venir. */
  var NIVEAUX = {
    idee: { rang: 0, nom: "L'idée", ton: "alerte",
      quoi: "le concept lui-même est remis en cause",
      onde: "tout ce qui en découle est suspendu — routes, KV, adaptations, formats",
      avant: "Rien d'autre ne se traite tant que celui-ci n'est pas tranché." },
    maitre: { rang: 1, nom: "Le KV maître", ton: "alerte",
      quoi: "le visuel de référence d'une route",
      onde: "effet domino : toutes les adaptations et tous les formats en découlent",
      avant: "À traiter avant toute adaptation : une adaptation refaite sur l'ancien maître est à refaire." },
    adaptation: { rang: 2, nom: "Une adaptation marché", ton: "attente",
      quoi: "la version d'un marché — langue, casting, SKU, mentions",
      onde: "les formats de ce marché suivent ; les autres marchés ne bougent pas",
      avant: "À traiter avant les formats de ce marché." },
    maniere: { rang: 3, nom: "La manière de décliner", ton: "or",
      quoi: "la règle, pas une pièce — cadrage, place du logo, traitement du fond",
      onde: "elle s'applique à tous les formats, y compris ceux qui n'existent pas encore",
      avant: "À trancher avant de produire d'autres formats, sinon on décline deux fois." },
    declinaison: { rang: 4, nom: "Un format", ton: "terne",
      quoi: "une pièce, et elle seule",
      onde: "rien d'autre ne bouge",
      avant: "Se traite en dernier : c'est le seul niveau qui n'entraîne rien." },
  };

  /* Compatibilité : les anciennes portées se relisent en niveaux. */
  var PORTEES = NIVEAUX;

  function niveau(f) {
    if (f.niveau) return f.niveau;
    if (f.portee === "route" || f.portee === "projet" || f.portee === "marque") return "idee";
    if (f.portee === "marche") return "adaptation";
    return "declinaison";
  }

  function defNiveau(f) { return NIVEAUX[niveau(f)] || NIVEAUX.declinaison; }

  var ISSUES = {
    ouvert: { nom: "Non traité", ton: "attente" },
    absorbe: { nom: "Absorbé", ton: "alerte", motifRequis: true,
      quoi: "l'agence paie. Le compteur annuel monte." },
    facture: { nom: "Facturé", ton: "vert",
      quoi: "un devis complémentaire se pré-remplit du montant calculé." },
    refuse: { nom: "Refusé", ton: "", motifRequis: true,
      quoi: "sur quel motif écrit — c'est ça qui tient ou non." },
  };

  function tous() { return DEPOT.liste("feedbacks"); }

  function duProjet(projetId) {
    return tous().filter(function (f) { return f.projet === projetId; });
  }

  function ouverts(projetId) {
    return (projetId ? duProjet(projetId) : tous()).filter(function (f) { return f.issue === "ouvert"; });
  }

  /* ————————————————————— Ce qu'un feedback touche ————————————————————— */

  /* La portée dit combien de pièces bougent. C'est le seul chiffre qui rend un
   * retour discutable au moment où il arrive, pas au moment de la facture. */
  function impact(f) {
    var p = DEPOT.trouve("projets", f.projet);
    if (!p) return { pieces: [], assets: 0, marches: [], jours: 0, tours: 0, enProduction: 0 };

    var vivants = (p.livrables || []).filter(function (l) { return !l.annule; });
    var n = niveau(f);
    var touches = [];

    function avecDescendance(ls) {
      var out = ls.slice();
      ls.forEach(function (l) {
        KV.descendance(p, l.id).forEach(function (d) {
          if (out.indexOf(d) === -1) out.push(d);
        });
      });
      return out;
    }

    if (n === "idee") {
      /* L'idée remet tout en cause — ou seulement les routes visées. */
      touches = (f.routes || []).length
        ? vivants.filter(function (l) { return (f.routes || []).indexOf(l.pisteId) !== -1; })
        : vivants;

    } else if (n === "maitre") {
      /* Le maître, et tout ce qui en descend : c'est l'effet domino. */
      var maitres = (f.cibles || []).length
        ? vivants.filter(function (l) { return (f.cibles || []).indexOf(l.id) !== -1; })
        : vivants.filter(function (l) {
            return KV.estMaitre(l) && (!(f.routes || []).length || (f.routes || []).indexOf(l.pisteId) !== -1); });
      touches = avecDescendance(maitres);

    } else if (n === "adaptation") {
      var adas = (f.cibles || []).length
        ? vivants.filter(function (l) { return (f.cibles || []).indexOf(l.id) !== -1; })
        : vivants.filter(function (l) {
            return KV.estAdaptation(l) && (f.marches || []).indexOf(l.marche) !== -1; });
      touches = avecDescendance(adas);

    } else if (n === "maniere") {
      /* La manière touche les formats — pas les maîtres, pas les adaptations. */
      touches = vivants.filter(function (l) {
        if (KV.estKV(l)) return false;
        if ((f.marches || []).length && (f.marches || []).indexOf(l.marche) === -1) return false;
        if ((f.routes || []).length && (f.routes || []).indexOf(l.pisteId) === -1) return false;
        return true;
      });

    } else {
      touches = vivants.filter(function (l) { return (f.cibles || []).indexOf(l.id) !== -1; });
    }

    var marches = {};
    var jours = 0;
    touches.forEach(function (l) {
      if (l.marche) marches[l.marche] = true;
      jours += (l.estime || 1) * 0.5;
    });

    return {
      pieces: touches, assets: touches.length,
      marches: Object.keys(marches),
      jours: Math.round(jours * 10) / 10,
      /* Ce qui n'existe pas encore et suivra quand même la règle. */
      aVenir: n === "maniere",
      enProduction: touches.filter(function (l) {
        return window.PRODUCTION && PRODUCTION.ouverte(p, l);
      }).length,
    };
  }

  /* ————————————————————— L'ordre de traitement ————————————————————— */

  /* Canaliser la vague : on trie par niveau, et on dit lesquels attendent
   * qu'un niveau supérieur soit tranché. Traiter un format avant le KV dont il
   * vient, c'est le refaire deux fois. */
  function ordre(projetId) {
    var fbs = (projetId ? duProjet(projetId) : tous())
      .filter(function (f) { return f.issue === "ouvert"; });

    var tries = fbs.slice().sort(function (a, b) {
      var d = defNiveau(a).rang - defNiveau(b).rang;
      return d !== 0 ? d : String(a.quand).localeCompare(String(b.quand));
    });

    /* Un retour attend s'il vise une pièce qu'un retour de niveau supérieur
     * touche déjà. */
    return tries.map(function (f, i) {
      var mien = impact(f);
      var ids = {};
      mien.pieces.forEach(function (l) { ids[l.id] = true; });
      /* Les retours d'un niveau supérieur qui touchent déjà ces pièces : eux
       * d'abord, sinon on refait le travail. */
      var bloquants = tries.slice(0, i).filter(function (g) {
        if (defNiveau(g).rang >= defNiveau(f).rang) return false;
        return impact(g).pieces.some(function (l) { return ids[l.id]; });
      });
      return { f: f, impact: mien, niveau: defNiveau(f), attend: bloquants,
        rang: i, pret: bloquants.length === 0 };
    });
  }

  /* ————————————————————— Quand je peux bloquer ————————————————————— */

  /* L'outil n'interdit rien. Mais refuser demande un motif opposable, et il y
   * en a exactement cinq. Celui qui n'en a aucun refuse par goût. */
  function motifsDeRefus(f) {
    var p = DEPOT.trouve("projets", f.projet);
    var i = impact(f);
    var out = [];
    if (!p) return out;

    /* 1 · Au-delà des tours vendus */
    var depassements = i.pieces.filter(function (l) {
      var t = VERSION.tours(l, l.toursVendus);
      return t.vendus && t.faits >= t.vendus;
    });
    if (depassements.length) {
      out.push({ cle: "tours", quoi: "Les tours vendus sont consommés",
        detail: depassements.length + (depassements.length > 1 ? " pièces sont" : " pièce est")
          + " au bout de leur périmètre de révision",
        force: 5 });
    }

    /* 2 · Après une validation signée */
    var apresValidation = i.pieces.filter(function (l) {
      return (l.versions || []).some(function (v) { return v.verdict === "approuve"; })
        || (l.validation && l.validation.verdict === "approuve");
    });
    if (apresValidation.length) {
      out.push({ cle: "valide", quoi: "Il arrive après une validation",
        detail: apresValidation.length + (apresValidation.length > 1 ? " pièces avaient" : " pièce avait")
          + " été approuvée — ce n'est pas une correction, c'est une reprise",
        force: 5 });
    }

    /* 3 · Après le BAT */
    var apresBAT = i.pieces.filter(function (l) {
      return window.PRODUCTION && PRODUCTION.de(l, "bat").length > 0;
    });
    if (apresBAT.length) {
      out.push({ cle: "bat", quoi: "Le BAT est signé",
        detail: apresBAT.length + (apresBAT.length > 1 ? " pièces sont parties" : " pièce est partie")
          + " en production avec un accord écrit",
        force: 5 });
    }

    /* 4 · Hors du périmètre vendu */
    var spontanes = i.pieces.filter(function (l) { return l.origine !== "prevu"; });
    if (spontanes.length) {
      out.push({ cle: "perimetre", quoi: "C'est hors du périmètre vendu",
        detail: spontanes.length + (spontanes.length > 1 ? " pièces n'étaient" : " pièce n'était")
          + " pas dans la proposition validée",
        force: 4 });
    }

    /* 5 · Il contredit un critère écrit */
    var crit = ((p.sections.bigidea || {}).criteres || []).length;
    if (crit) {
      out.push({ cle: "critere", quoi: "Il peut contredire un critère écrit",
        detail: crit + " critères d'acceptation ont été posés avant : à confronter au retour",
        force: 3 });
    }

    return out.sort(function (a, b) { return b.force - a.force; });
  }

  /* ————————————————————— Enregistrer un retour ————————————————————— */

  function ouvrir(projetId, cibles, apres) {
    var p = DEPOT.trouve("projets", projetId);
    if (!p) return;

    var champ = el("textarea", { rows: 3, placeholder: "Ce que le client a demandé, dans ses mots" });
    var selCanal = el("select", {});
    Object.keys(CANAUX).forEach(function (k) { selCanal.appendChild(el("option", { value: k }, CANAUX[k].nom)); });
    var selAuteur = el("select", {});
    selAuteur.appendChild(el("option", { value: "" }, "— qui l'a formulé —"));
    DEPOT.liste("contacts").filter(function (c) {
      return !c.clientId || c.clientId === clientDe(p);
    }).forEach(function (c) {
      selAuteur.appendChild(el("option", { value: "CT:" + c.id }, c.nom + " · " + c.role));
    });
    DEPOT.liste("personnes").forEach(function (x) {
      selAuteur.appendChild(el("option", { value: "P:" + x.id }, x.nom + " · " + O.poste(x.poste).court));
    });
    var champDate = el("input", { type: "date" });
    champDate.value = O.jour();

    var selPortee = el("select", {});
    Object.keys(NIVEAUX).forEach(function (k) {
      selPortee.appendChild(el("option", { value: k }, NIVEAUX[k].nom + " — " + NIVEAUX[k].quoi));
    });
    if (cibles && cibles.length) selPortee.value = "declinaison";
    var aideN = el("div.indice", {}, NIVEAUX.idee.onde);
    selPortee.addEventListener("change", function () { aideN.textContent = NIVEAUX[selPortee.value].onde; });

    var choixCibles = coches((p.livrables || []).filter(function (l) { return !l.annule; })
      .map(function (l) { return { id: l.id, nom: l.nom }; }), cibles || []);
    var choixMarches = coches(DEPOT.liste("marches").map(function (m) { return { id: m.id, nom: m.nom }; }), []);
    var choixRoutes = coches((p.sections.pistes || []).map(function (x) { return { id: x.id, nom: x.titre }; }), []);

    var zoneCibles = el("div");
    var apercu = el("div");

    function brouillon() {
      return { projet: projetId, niveau: selPortee.value, portee: selPortee.value,
        cibles: choixCibles.valeurs(), marches: choixMarches.valeurs(),
        routes: choixRoutes.valeurs(), issue: "ouvert" };
    }

    function dessiner() {
      O.vider(zoneCibles);
      var n = selPortee.value;
      if (n === "declinaison" || n === "maitre") zoneCibles.appendChild(bloc("Quelles pièces", choixCibles.noeud));
      if (n === "adaptation" || n === "maniere") zoneCibles.appendChild(bloc("Quels marchés", choixMarches.noeud));
      if (n === "idee" || n === "maniere") zoneCibles.appendChild(bloc("Quelles routes", choixRoutes.noeud));

      var i = impact(brouillon());
      var c = CANAUX[selCanal.value];
      O.vider(apercu);
      var dn = NIVEAUX[selPortee.value];
      apercu.appendChild(el("div.stats", {},
        UI.stat("PIÈCES TOUCHÉES", String(i.assets), i.marches.length + " marchés", i.assets > 5 ? "alerte" : ""),
        UI.stat("COÛT ESTIMÉ", i.jours + " j", "à mi-estimation par pièce", i.jours > 5 ? "alerte" : ""),
        i.enProduction ? UI.stat("DÉJÀ EN PRODUCTION", String(i.enProduction),
          "BAT signé — les rappeler coûte", "alerte") : null
      ));
      apercu.appendChild(UI.banniere(dn.ton === "alerte" ? "rouge" : "",
        dn.onde + ".  " + dn.avant));
      if (i.aVenir) apercu.appendChild(UI.banniere("",
        "Une règle de déclinaison s'applique aussi à ce qui n'existe pas encore : les formats à venir la porteront sans qu'on ait à y penser."));
      if (!c.trace) apercu.appendChild(UI.banniere("rouge", c.cout));
    }
    selPortee.addEventListener("change", dessiner);
    selCanal.addEventListener("change", dessiner);
    choixCibles.surChangement(dessiner);
    choixMarches.surChangement(dessiner);
    choixRoutes.surChangement(dessiner);
    dessiner();

    PANNEAU.ouvrir("Enregistrer un retour", p.ref, el("div", {},
      UI.banniere("", "Un retour non enregistré n'existe pas — et personne ne sera comptable de ce qu'il coûte."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Ce qui est demandé"), champ),
        el("div.champ", {}, el("label", {}, "Par qui"), selAuteur),
        el("div.champ", {}, el("label", {}, "Quand"), champDate),
        el("div.champ", {}, el("label", {}, "Par quel canal"), selCanal),
        el("div.champ", {}, el("label", {}, "À quel niveau il s'applique"), selPortee, aideN)),
      zoneCibles,
      el("div.sousbloc", {}, el("h3", {}, "CE QUE ÇA TOUCHE"), apercu),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champ.value.trim()) { AVIS.refus("Un retour sans texte n'est pas un retour."); return; }
          if (!selAuteur.value) { AVIS.refus("Un retour sans auteur ne sera imputable à personne."); return; }
          var f = Object.assign(brouillon(), {
            id: O.id("FB"), texte: champ.value.trim(), auteur: selAuteur.value,
            canal: selCanal.value, quand: champDate.value,
            enregistre_le: new Date().toISOString(), par: MAISON.titulaire,
          });
          DEPOT.ajoute("feedbacks", f);
          DEPOT.tracer("retour client", "feedback", projetId, champ.value.trim().slice(0, 50));
          DEPOT.enregistrer(); PANNEAU.fermer(); if (apres) apres();
        } }, "Enregistrer"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  function bloc(t, n) { return el("div.sousbloc", {}, el("h3", {}, t.toUpperCase()), n); }

  function clientDe(p) {
    var nom = (p.sections.identite || {}).client;
    var c = DEPOT.liste("clients").filter(function (x) { return x.nom === nom; })[0];
    return c ? c.id : null;
  }

  function coches(liste, depart) {
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

  /* ————————————————————— Trancher un retour ————————————————————— */

  function trancher(f, apres) {
    var p = DEPOT.trouve("projets", f.projet);
    var i = impact(f);
    var motifs = motifsDeRefus(f);
    var selI = el("select", {});
    ["facture", "absorbe", "refuse"].forEach(function (k) {
      selI.appendChild(el("option", { value: k }, ISSUES[k].nom));
    });
    var aide = el("div.indice", {}, ISSUES.facture.quoi);
    selI.addEventListener("change", function () { aide.textContent = ISSUES[selI.value].quoi; });
    var champ = el("textarea", { rows: 2, placeholder: "Le motif, en une phrase" });

    var choisi = null;
    var listeM = el("div.motifs");
    motifs.forEach(function (m) {
      var b = el("button.motif", { type: "button", onclick: function () {
        choisi = m.quoi + " — " + m.detail;
        [].forEach.call(listeM.children, function (x) { x.className = "motif"; });
        b.className = "motif actif";
        champ.value = choisi;
      } }, el("b", {}, m.quoi), el("span", {}, m.detail));
      listeM.appendChild(b);
    });

    PANNEAU.ouvrir("Trancher — " + O.joli(f.quand), p ? p.ref : "", el("div", {},
      el("div.fb-texte", {}, f.texte),
      el("div.stats", {},
        UI.stat("PIÈCES", String(i.assets), i.marches.length + " marchés", ""),
        UI.stat("COÛT", i.jours + " j", "de reprise estimée", i.jours > 5 ? "alerte" : ""),
        UI.stat("VERSIONS", String(i.assets), "s'ouvriront si on l'applique", "")
      ),

      motifs.length
        ? el("div.sousbloc", {},
            el("h3", {}, "SUR QUOI JE PEUX M'OPPOSER",
              el("span.droite", {}, motifs.length + (motifs.length > 1 ? " motifs opposables" : " motif opposable"))),
            listeM)
        : UI.banniere("", "Aucun motif opposable : ce retour arrive avant validation, dans les tours vendus, sur du périmètre prévu. Il se traite, il ne se conteste pas."),

      el("div.form", {},
        el("div.champ", {}, el("label", {}, "L'issue"), selI, aide),
        el("div.champ", {}, el("label", {}, "Le motif"), champ)),

      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (ISSUES[selI.value].motifRequis && !champ.value.trim()) {
            AVIS.refus("Cette issue exige un motif écrit."); return;
          }
          f.issue = selI.value; f.motif = champ.value.trim();
          f.tranche_le = new Date().toISOString(); f.tranche_par = MAISON.titulaire;
          if (selI.value !== "refuse") appliquer(f, i);
          DEPOT.tracer("retour tranché", "feedback", f.projet, ISSUES[selI.value].nom);
          DEPOT.enregistrer(); PANNEAU.fermer(); if (apres) apres();
        } }, "Trancher"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermer }, "Annuler"))
    ));
  }

  /* Appliquer : chaque pièce touchée passe une version, avec ce retour en cause. */
  function appliquer(f, i) {
    var ouvertes = [];
    i.pieces.forEach(function (l) {
      VERSION.ouvrir(l, "client", f.texte.slice(0, 120), MAISON.titulaire);
      ouvertes.push(l.id);
    });
    f.versionsOuvertes = ouvertes;
  }

  /* ————————————————————— Qui a bousculé quoi ————————————————————— */

  /* Le tableau de fin de trimestre : par auteur, ce que ses retours ont coûté.
   * Ce n'est pas un procès, c'est un chiffre — et sans lui la négociation se
   * fait de mémoire. */
  function parAuteur(depuis) {
    var m = {};
    tous().forEach(function (f) {
      if (depuis && f.quand < depuis) return;
      var i = impact(f);
      var cle = f.auteur || "inconnu";
      if (!m[cle]) m[cle] = { cle: cle, nom: nomAuteur(cle), n: 0, assets: 0, jours: 0,
        absorbes: 0, factures: 0, ouverts: 0, projets: {} };
      var a = m[cle];
      a.n++; a.assets += i.assets; a.jours += i.jours;
      a.projets[f.projet] = true;
      if (f.issue === "absorbe") a.absorbes += i.jours;
      if (f.issue === "facture") a.factures += i.jours;
      if (f.issue === "ouvert") a.ouverts++;
    });
    return Object.keys(m).map(function (k) {
      var a = m[k];
      a.jours = Math.round(a.jours * 10) / 10;
      a.absorbes = Math.round(a.absorbes * 10) / 10;
      a.factures = Math.round(a.factures * 10) / 10;
      a.projets = Object.keys(a.projets).length;
      return a;
    }).sort(function (x, y) { return y.jours - x.jours; });
  }

  function nomAuteur(cle) {
    if (!cle || cle === "inconnu") return "auteur non nommé";
    var m = String(cle).split(":");
    var o = m[0] === "CT" ? DEPOT.trouve("contacts", m[1]) : DEPOT.trouve("personnes", m[1]);
    return o ? o.nom : cle;
  }

  function estClient(cle) { return String(cle || "").indexOf("CT:") === 0; }

  return { CANAUX: CANAUX, NIVEAUX: NIVEAUX, PORTEES: PORTEES, ISSUES: ISSUES,
    niveau: niveau, defNiveau: defNiveau, ordre: ordre,
    tous: tous, duProjet: duProjet, ouverts: ouverts, impact: impact,
    motifsDeRefus: motifsDeRefus, ouvrir: ouvrir, trancher: trancher,
    parAuteur: parAuteur, nomAuteur: nomAuteur, estClient: estClient };
})();
