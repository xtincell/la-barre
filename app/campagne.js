/* campagne.js — l'étage qui manquait entre la marque et le projet.
 *
 * Le code l'avait nommé sans lui donner de place. briefs.js porte depuis le
 * premier jour un type dont la fiche dit :
 *
 *     cle: "campagne",  fonde: "la campagne — son périmètre, son budget,
 *                               sa fenêtre",   porte: "projet"
 *
 * Le document qui FONDE LA CAMPAGNE était accroché au PROJET, faute d'un nœud
 * où le poser. Tout le reste en découlait : vingt briefs FrieslandCampina sur
 * un même Noël devenaient vingt dossiers sans lien, chacun repartant de zéro
 * sur le client, la marque, les marchés et la fenêtre.
 *
 * Une campagne, c'est le rythme de la marque. Deux régimes, et pas un de plus :
 *
 *   always-on    le cycle qui tourne — le digital mensuel, quelques actions
 *                terrain. Il n'a pas de fin : il court. Une marque en a un,
 *                et un seul.
 *   ponctuelle   un temps fort du calendrier de la marque — Noël, Ramadan,
 *                un lancement. Il a une fenêtre, et il se solde par un bilan.
 *
 * « Une marque est toujours en campagne. » Donc aucun projet ne flotte : il
 * appartient au cycle, ou à un temps fort. Un projet sans campagne n'est pas
 * un orphelin — c'est un projet dont on n'a pas dit à quel moment de la vie
 * de la marque il appartient, et le produit le dira.
 */

window.CAMPAGNE = (function () {
  var el = O.el;

  function liste() { return DEPOT.liste("campagnes"); }

  function de(id) { return id ? DEPOT.trouve("campagnes", id) : null; }

  function deMarque(marqueId) {
    return liste().filter(function (c) {
      return (c.marqueIds || []).indexOf(marqueId) !== -1; });
  }

  /* Le cycle d'une marque : il n'y en a qu'un, et c'est ce qui le distingue
   * d'un temps fort. Deux cycles sur la même marque, c'est une erreur de
   * saisie, pas un choix. */
  function cycleDe(marqueId) {
    /* Le fil de l'année d'une marque : un par année depuis le regroupement ;
     * le cycle courant est celui de l'année en cours, sinon le plus récent. */
    var an = String(new Date().getFullYear());
    var cs = deMarque(marqueId).filter(function (c) { return c.regime === "always-on"; })
      .sort(function (a, b) { return String(b.nom).localeCompare(String(a.nom)); });
    return cs.filter(function (c) { return c.nom.indexOf(an) !== -1; })[0] || cs[0] || null;
  }

  function projets(campagneId) {
    return DEPOT.liste("projets").filter(function (p) {
      return p.campagneId === campagneId && !p.fusionne; });
  }

  function occasion(cle) {
    var o = null;
    (MAISON.occasions || []).forEach(function (x) { if (x.cle === cle) o = x; });
    return o;
  }

  /* ————————————————————— L'état, au contrat ————————————————————— */

  function etat(c) {
    if (!c) return null;
    var ps = projets(c.id);
    var clos = ps.filter(function (p) { return window.CLOTURE && CLOTURE.est(p); }).length;
    var n = ps.length;

    if (!n) {
      return { cle: "vide", nom: "aucun projet", ton: "attente",
        quoi: "La campagne est ouverte et rien ne s'y fabrique. "
          + "Composer, c'est dire ce qu'elle appelle — et ce qu'elle n'appelle pas." };
    }
    if (clos === n) {
      /* Un texte écrit n'est pas un bilan qui fait foi : seule une version
       * arrêtée l'est, et un texte modifié depuis ne l'est plus. */
      var b = etatBilan(c);
      return { cle: "close", nom: "tous les projets clos", ton: b.cle === "arrete" ? "terne" : "attente",
        quoi: b.cle === "absent"
          ? (n > 1 ? "Les " + n + " projets sont clos" : "Son seul projet est clos")
            + " et la campagne n'a pas de bilan : la suivante repartira sans son diagnostic."
          : b.quoi };
    }
    /* Ce qui retarde le reste : la première arête du chaînage qui ne tient pas. */
    var bloquants = ps.filter(function (p) {
      return (p.attend || []).length && !(window.CLOTURE && CLOTURE.est(p)); });
    var vifs = n - clos;
    return { cle: "encours", nom: vifs + (vifs > 1 ? " projets en cours" : " projet en cours"), ton: "attente",
      quoi: bloquants.length
        ? bloquants.length + (bloquants.length > 1 ? " projets attendent" : " projet attend")
          + " un amont qui n'est pas livré."
        : vifs > 1 ? vifs + " projets tournent, aucun n'en attend un autre."
        : "Un projet tourne, et il n'attend personne." };
  }

  /* ————————————————————— Composer ————————————————————— */

  /* Ce qu'une occasion appelle, confronté à ce qui existe déjà. On PROPOSE :
   * le produit n'ouvre jamais six dossiers dans le dos de personne. */
  function composition(c) {
    var o = occasion(c.occasion);
    var attendus = (o && o.appelle) || [];
    var ouverts = {};
    projets(c.id).forEach(function (p) { ouverts[p.nature || p.gabarit] = p; });
    var ecartes = c.ecartes || {};

    return attendus.map(function (cle) {
      var n = NATURE.liste().filter(function (x) { return x.cle === cle; })[0];
      return { nature: n || { cle: cle, nom: cle },
        projet: ouverts[cle] || null,
        ecarte: ecartes[cle] || null };
    });
  }

  /* Écarter, c'est décider — donc ça se date et ça porte un motif. Une case
   * vide sans motif se rediscute deux fois ; une case écartée avec sa date
   * ne se rediscute plus.
   *
   * La décision passe par le registre commun. Elle s'écarte de ce que
   * l'occasion appelle : c'est une déviation de portée campagne, refusée sans
   * motif. Elle se vérifie avant que la campagne ne change. */
  function ecarter(c, natureCle, motif) {
    var nature = window.NATURE ? NATURE.liste().filter(function (x) { return x.cle === natureCle; })[0] : null;
    var decision = DECISION.construire({ objet: natureCle, type: "composition", campagne: c.id, verdict: "hors",
      portee: "campagne", motif: typeof motif === "string" ? motif.trim() : "", quand: new Date().toISOString(),
      qui: MAISON.titulaire, acteur: DECISION.acteur(), titre: nature ? nature.nom : natureCle,
      ecart: { de: "composition", ref: c.occasion || null } });
    c.ecartes = c.ecartes || {};
    c.ecartes[natureCle] = { motif: decision.motif, quand: decision.quand };
    DECISION.ajouter(decision);
    DEPOT.tracer("écarté de la composition", "campagnes", c.id, natureCle);
    DEPOT.enregistrer();
    return decision;
  }

  function reprendre(c, natureCle) {
    if (!c.ecartes) return;
    delete c.ecartes[natureCle];
    DEPOT.tracer("repris à la composition", "campagnes", c.id, natureCle);
    DEPOT.enregistrer();
  }

  /* ————————————————————— Créer ————————————————————— */

  function creer(d) {
    var c = DEPOT.ajoute("campagnes", {
      nom: d.nom,
      clientId: d.clientId || null,
      marqueIds: d.marqueIds || [],
      regime: d.regime || "ponctuelle",
      occasion: d.occasion || null,
      fenetre: d.fenetre || { debut: null, fin: null },
      marches: d.marches || [],
      bilan: "",
      ecartes: {},
      cree_le: new Date().toISOString(),
    });
    DEPOT.tracer("création", "campagnes", c.id, c.nom);
    return c;
  }

  /* ————————————————————— Rattacher un projet existant —————————————————————
   *
   * Une campagne tient plusieurs projets : le Back to School 2026 de Bonnet
   * Rouge porte le dispositif, le film TV, les cahiers et la plateforme de
   * rentrée — quatre briefs, quatre projets, un seul temps fort. On ne pouvait
   * pourtant en ajouter un qu'en l'ouvrant depuis la campagne : un projet
   * existant restait là où l'ingestion l'avait rangé, ou nulle part.
   *
   * Rattacher, déplacer, retirer : les trois se tracent. L'ancienne campagne
   * reste dans l'historique du projet — on archive, on ne supprime pas. */
  function rattacher(p, campagneId, motif) {
    var avant = p.campagneId || null;
    var apres = campagneId || null;
    if (avant === apres) return false;
    p.historiqueCampagne = p.historiqueCampagne || [];
    p.historiqueCampagne.push({ quand: new Date().toISOString(), qui: MAISON.titulaire,
      avant: avant, apres: apres, motif: (motif || "").trim() || null });
    if (apres) p.campagneId = apres; else delete p.campagneId;
    var c = de(apres);
    if (c) {
      /* La campagne sert désormais aussi les marques de ce projet. */
      var ident = (p.sections || {}).identite || {};
      c.marqueIds = c.marqueIds || [];
      (ident.marqueIds || []).forEach(function (m) {
        if (c.marqueIds.indexOf(m) === -1) c.marqueIds.push(m); });
      if (!c.clientId && ident.clientId) c.clientId = ident.clientId;
    }
    var a = de(avant);
    DEPOT.tracer(apres ? (avant ? "changé de campagne" : "rattaché à une campagne") : "retiré de sa campagne",
      "projets", p.id, (a ? a.nom : "aucune") + " → " + (c ? c.nom : "aucune"));
    DEPOT.enregistrer();
    return true;
  }

  /* Les campagnes où un projet peut aller : d'abord celles de ses marques. */
  function candidates(p) {
    var mqs = (((p.sections || {}).identite || {}).marqueIds) || [];
    var siennes = [], autres = [];
    liste().forEach(function (c) {
      if (c.id === p.campagneId) return;
      ((c.marqueIds || []).some(function (m) { return mqs.indexOf(m) !== -1; }) ? siennes : autres).push(c);
    });
    var tri = function (a, b) { return String(b.cree_le || "").localeCompare(String(a.cree_le || "")) || a.nom.localeCompare(b.nom); };
    return { siennes: siennes.sort(tri), autres: autres.sort(function (a, b) { return a.nom.localeCompare(b.nom); }) };
  }

  /* Le geste : choisir la campagne d'un projet, ou en ouvrir une. */
  function choisir(p, rafraichir) {
    var c0 = de(p.campagneId);
    var cand = candidates(p);
    var sel = el("select", { id: "cmp-choix" });
    sel.appendChild(el("option", { value: "" }, c0 ? "— garder « " + c0.nom + " »" : "— choisir une campagne"));
    if (cand.siennes.length) sel.appendChild(el("optgroup", { label: "Les campagnes de ses marques" },
      cand.siennes.map(function (c) { return el("option", { value: c.id }, c.nom + " · " + projets(c.id).length + " projet(s)"); })));
    sel.appendChild(el("option", { value: "__nouvelle" }, "+ Ouvrir une nouvelle campagne…"));
    if (cand.autres.length) sel.appendChild(el("optgroup", { label: "Toutes les autres" },
      cand.autres.map(function (c) { return el("option", { value: c.id }, c.nom); })));

    var ident = p.sections.identite || {};
    var nom = el("input", { id: "cmp-nom", type: "text", placeholder: "Bonnet Rouge — Back to School 2026" });
    var occ = el("select", { id: "cmp-occ" }, [el("option", { value: "" }, "Occasion non déclarée")]
      .concat((MAISON.occasions || []).map(function (o) { return el("option", { value: o.cle }, o.nom); })));
    var deb = el("input", { id: "cmp-deb", type: "date" });
    var fin = el("input", { id: "cmp-fin", type: "date", value: ident.echeance || "" });
    var neuve = el("div.form", { hidden: true },
      el("div.champ", {}, el("label", { "for": "cmp-nom" }, "Nom de la campagne"), nom),
      el("div.champ", {}, el("label", { "for": "cmp-occ" }, "Occasion"), occ),
      el("div.champ", {}, el("label", { "for": "cmp-deb" }, "Début"), deb),
      el("div.champ", {}, el("label", { "for": "cmp-fin" }, "Fin"), fin));
    sel.onchange = function () { neuve.hidden = sel.value !== "__nouvelle"; };
    var motif = el("textarea", { id: "cmp-motif", rows: 2, placeholder: "Même temps fort, même fenêtre, même client." });

    PANNEAU.sur("La campagne de ce projet", p.ref, el("div", {},
      UI.banniere("", c0
        ? "« " + p.nom + " » est dans « " + c0.nom + " », avec " + (projets(c0.id).length - 1)
          + " autre(s) projet(s). Le déplacer garde l'ancienne campagne dans son historique."
        : "Ce projet n'appartient à aucun moment de la vie de sa marque. Le rattacher le range "
          + "avec ses frères : même fenêtre, même piste de référence."),
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "cmp-choix" }, "Campagne"), sel)),
      neuve,
      el("div.form", {}, el("div.champ", {}, el("label", { "for": "cmp-motif" }, "Pourquoi"),
        el("div.indice", {}, "Une ligne. Elle reste dans l'historique du projet."), motif)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var id = sel.value;
          if (id === "__nouvelle") {
            if (!nom.value.trim()) { AVIS.refus("Une campagne sans nom ne se retrouve pas."); return; }
            var c = creer({ nom: nom.value.trim(), clientId: ident.clientId || null,
              marqueIds: (ident.marqueIds || []).slice(), occasion: occ.value || null,
              fenetre: { debut: deb.value || null, fin: fin.value || null },
              marches: (ident.marches || []).slice() });
            id = c.id;
          }
          if (!id) { AVIS.refus("Choisissez une campagne, ou ouvrez-en une."); return; }
          rattacher(p, id, motif.value);
          PANNEAU.fermerSur();
          AVIS.fait("« " + p.nom + " » est rangé dans « " + de(id).nom + " ».");
          if (rafraichir) rafraichir();
        } }, "Ranger dans cette campagne"),
        c0 ? el("button.b.nu", { type: "button", onclick: function () {
          rattacher(p, null, motif.value);
          PANNEAU.fermerSur();
          AVIS.fait("« " + p.nom + " » n'appartient plus à « " + c0.nom + " ». L'historique le garde.");
          if (rafraichir) rafraichir();
        } }, "Retirer de sa campagne") : null,
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  /* Depuis la campagne : ranger d'un coup les projets existants qui en sont. */
  function accueillir(c, rafraichir) {
    var mqs = c.marqueIds || [];
    var ps = DEPOT.liste("projets").filter(function (p) { return p.campagneId !== c.id && !p.fusionne; });
    var siens = ps.filter(function (p) {
      return ((((p.sections || {}).identite || {}).marqueIds) || []).some(function (m) { return mqs.indexOf(m) !== -1; }); });
    var vivant = function (p) { return !(window.CLOTURE && CLOTURE.est(p)); };
    siens.sort(function (a, b) { return (vivant(b) - vivant(a)) || String(b.cree_le || "").localeCompare(String(a.cree_le || "")); });
    var coches = {};
    var ligne = function (p) {
      var cb = el("input", { type: "checkbox", id: "acc-" + p.id, onchange: function () { coches[p.id] = cb.checked; } });
      var ailleurs = de(p.campagneId);
      return el("label.cmp-acc", { "for": "acc-" + p.id }, cb,
        el("span", {}, el("b", {}, p.ref || p.id), " ", p.nom,
          el("span.cmp-acc-q", {}, (vivant(p) ? "ouvert" : "clos")
            + (ailleurs ? " · aujourd'hui dans « " + ailleurs.nom + " »" : " · sans campagne"))));
    };
    var motif = el("textarea", { id: "acc-motif", rows: 2 });
    PANNEAU.sur("Ranger des projets dans « " + c.nom + " »", "", el("div", {},
      UI.banniere("", siens.length
        ? "Les projets de ses marques qui n'y sont pas encore. Un projet déplacé garde son ancienne campagne dans son historique."
        : "Aucun projet de ses marques hors de cette campagne."),
      el("div.cmp-accs", {}, siens.map(ligne)),
      el("div.form", {}, el("div.champ", {}, el("label", { "for": "acc-motif" }, "Pourquoi"), motif)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var ids = Object.keys(coches).filter(function (k) { return coches[k]; });
          if (!ids.length) { AVIS.refus("Cochez au moins un projet."); return; }
          ids.forEach(function (id) { rattacher(DEPOT.trouve("projets", id), c.id, motif.value); });
          PANNEAU.fermerSur();
          AVIS.fait(ids.length + (ids.length > 1 ? " projets rangés" : " projet rangé") + " dans « " + c.nom + " ».");
          if (rafraichir) rafraichir();
        } }, "Ranger"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  /* La piste retenue sur le projet qui cherche l'idée devient la référence de
   * ses frères. Sans ça, le film et l'activation de la même campagne ignorent
   * le concept qu'on vient d'arbitrer, et deux signatures sortent du même
   * temps fort — c'est le test d'une minute, un cran plus haut. */
  /* Cette empreinte décrit la décision, pas les fichiers qu'elle produit.
   * Une nouvelle maquette ne réarbitre pas le concept. En revanche une
   * modification de son argument ou de sa version appelle une relecture. */
  function contenuPiste(pi) {
    return JSON.stringify([pi.id, pi.version || 1, pi.arbitre_le || null,
      pi.titre || null, pi.concept || null, pi.axe || null, pi.ton || null,
      pi.univers || null, pi.sacrifice || null, pi.argument || null,
      pi.motif || null, pi.ideeId || null]);
  }

  function reference(campagneId) {
    var c = de(campagneId), candidates = [];
    (c ? projets(campagneId) : []).forEach(function (p) {
      ((p.sections || {}).pistes || []).forEach(function (pi) {
        if (pi.statut === "retenue") candidates.push({ projet: p, piste: pi });
      });
    });
    candidates.sort(function (a, b) {
      var x = a.projet.id + "\u0000" + a.piste.id, y = b.projet.id + "\u0000" + b.piste.id;
      return x < y ? -1 : x > y ? 1 : 0;
    });
    var choix = c && c.referencePiste || null;
    var revision = JSON.stringify([choix, candidates.map(function (x) {
      return [x.projet.id, x.piste.id, contenuPiste(x.piste)];
    })]);
    var ref = null, etat = !candidates.length ? "absente" : candidates.length === 1 ? "unique" : "conflit";
    if (choix) {
      var candidate = candidates.filter(function (x) {
        return x.projet.id === choix.projetId && x.piste.id === choix.pisteId;
      })[0];
      var decision = DEPOT.trouve("decisions", choix.decisionId);
      if (candidate && contenuPiste(candidate.piste) === choix.contenu && decision
          && decision.type === "reference-campagne" && decision.campagne === campagneId
          && decision.verdict === "approuve" && decision.portee === "campagne"
          && decision.projet === choix.projetId && decision.objet === choix.pisteId
          && decision.contenuPiste === choix.contenu) {
        ref = candidate; etat = "choisie";
      } else etat = "perimee";
    } else if (c && candidates.length === 1) ref = candidates[0];
    return { etat: etat, reference: ref, candidates: candidates, revision: revision };
  }

  function pisteDeReference(campagneId) { return reference(campagneId).reference; }

  function designerReference(campagneId, projetId, pisteId, motif, attendu) {
    var c = de(campagneId), lu = reference(campagneId);
    if (!c) return { ok: false, erreur: "Campagne introuvable." };
    motif = typeof motif === "string" ? motif.trim() : "";
    if (!motif) return { ok: false, erreur: "Écrivez pourquoi cette piste porte le socle commun." };
    var candidate = lu.candidates.filter(function (x) {
      return x.projet.id === projetId && x.piste.id === pisteId;
    })[0];
    if (!candidate) return { ok: false, erreur: "Cette piste n'est plus retenue dans cette campagne." };
    var precedente = c.referencePiste && DEPOT.trouve("decisions", c.referencePiste.decisionId);
    if (lu.etat === "choisie" && lu.reference.projet.id === projetId
        && lu.reference.piste.id === pisteId && precedente.motif === motif
        && (attendu === lu.revision || attendu === precedente.revisionSource)) {
      return { ok: true, dejaRecu: true, decision: precedente };
    }
    if (attendu !== lu.revision) return { ok: false,
      erreur: "Les pistes ou la référence ont changé. Relisez la campagne avant de choisir." };
    /* L'identifiant est tiré d'avance, en tête de la décision : la référence
     * le porte avant la publication. La décision est vérifiée avant que la
     * campagne ne change. */
    var decision = DECISION.construire({ id: DECISION.identifiant(), type: "reference-campagne", objet: pisteId,
      projet: projetId, campagne: campagneId, verdict: "approuve", portee: "campagne",
      motif: motif, quand: new Date().toISOString(), qui: MAISON.titulaire,
      acteur: window.ACTEUR ? ACTEUR.trace() : null, version: candidate.piste.version || 1,
      titre: candidate.piste.titre || "Piste retenue", contenuPiste: contenuPiste(candidate.piste),
      revisionSource: lu.revision, remplace: precedente ? precedente.id : null });
    c.referencePiste = { projetId: projetId, pisteId: pisteId,
      decisionId: decision.id, contenu: decision.contenuPiste };
    /* ajouter() publie et sauvegarde immédiatement. Poser la référence avant
     * cet appel empêche de publier un reçu sans son choix commun. */
    DECISION.ajouter(decision);
    DEPOT.tracer("référence de campagne", "campagnes", c.id, decision.titre + " — " + motif);
    DEPOT.enregistrer();
    return { ok: true, dejaRecu: false, decision: decision };
  }

  function choisirReference(campagneId, apres) {
    var c = de(campagneId), lu = reference(campagneId);
    if (!c) return;
    var sel = el("select", { id: "reference-campagne" },
      el("option", { value: "" }, "— choisir une piste retenue"));
    lu.candidates.forEach(function (x, i) {
      sel.appendChild(el("option", { value: String(i) },
        (x.piste.titre || "Piste sans titre") + " — " + (x.projet.ref || x.projet.nom)));
      if (lu.reference && x.projet.id === lu.reference.projet.id && x.piste.id === lu.reference.piste.id) sel.value = String(i);
    });
    var motif = el("textarea", { id: "reference-motif", rows: 3 });
    PANNEAU.sur("La référence commune", c.nom, el("div", {},
      UI.banniere("", "Ce choix interne désigne le concept commun aux projets. Les pistes locales "
        + "et leur production sont conservées. L'accord client et le droit de diffusion restent à établir séparément."),
      el("div.form", {},
        el("div.champ", {}, el("label", { "for": "reference-campagne" }, "Piste retenue"), sel),
        el("div.champ", {}, el("label", { "for": "reference-motif" }, "Pourquoi elle porte le socle commun"), motif)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var x = sel.value === "" ? null : lu.candidates[Number(sel.value)];
          if (!x) { AVIS.refus("Choisissez une piste retenue."); return; }
          var r = designerReference(campagneId, x.projet.id, x.piste.id, motif.value, lu.revision);
          if (!r.ok) { AVIS.refus(r.erreur); return; }
          PANNEAU.fermerSur(); if (apres) apres();
        } }, "Consigner la référence commune"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  /* ————————————————————— L'écart à la référence commune —————————————————————
   *
   * Une fois la référence désignée, un projet de la campagne qui garde sa
   * propre piste retenue s'écarte d'une décision. Le contrôle « hors piste de
   * campagne » (regles.js) se tait sur le projet qui a écrit son écart, dans
   * `ecartDeCampagne` ; rien ne l'écrivait. Ce geste l'écrit, avec un reçu au
   * registre des décisions : le motif, l'acteur, la référence dont il s'écarte
   * et sa portée. La portée est le projet : sa piste relève de lui seul, et un
   * écart qui engagerait la campagne serait une nouvelle référence. */

  /* La déclaration d'écart d'une piste locale, adossée à la référence actuelle. */
  function declaration(campagneId, projetId, pisteId) {
    var c = de(campagneId), ref = c && c.referencePiste ? c.referencePiste.decisionId : null;
    var ds = DEPOT.liste("decisions").filter(function (d) {
      return d && d.type === "ecart-campagne" && d.campagne === campagneId && d.projet === projetId
        && d.objet === pisteId && d.ecart && d.ecart.ref === ref;
    });
    return ds[ds.length - 1] || null;
  }

  /* Les pistes retenues hors du projet de la référence, avec leur déclaration. */
  function ecartsLocaux(campagneId) {
    var lu = reference(campagneId);
    if (lu.etat !== "choisie") return [];
    return lu.candidates.filter(function (x) { return x.projet.id !== lu.reference.projet.id; })
      .map(function (x) {
        return { projet: x.projet, piste: x.piste, declaration: declaration(campagneId, x.projet.id, x.piste.id) };
      });
  }

  function declarerEcart(campagneId, projetId, pisteId, motif, portee, attendu) {
    var c = de(campagneId), lu = reference(campagneId);
    if (!c) return { ok: false, erreur: "Campagne introuvable." };
    if (lu.etat !== "choisie") {
      return { ok: false, erreur: "Aucune référence commune n'est désignée : il n'y a pas d'écart à déclarer." };
    }
    if (lu.reference.projet.id === projetId && lu.reference.piste.id === pisteId) {
      return { ok: false, erreur: "Cette piste porte la référence commune : elle ne s'en écarte pas." };
    }
    motif = typeof motif === "string" ? motif.trim() : "";
    if (!motif) return { ok: false, erreur: "Écrivez pourquoi ce projet garde sa propre piste." };
    var x = lu.candidates.filter(function (y) { return y.projet.id === projetId && y.piste.id === pisteId; })[0];
    if (!x) return { ok: false, erreur: "Cette piste n'est plus retenue dans cette campagne." };
    /* Un rejeu exact retrouve son reçu, même depuis un dialogue déjà relu. */
    var precedente = declaration(campagneId, projetId, pisteId);
    if (precedente && precedente.motif === motif && precedente.portee === portee
        && (x.projet.ecartDeCampagne || "").trim() === motif) {
      return { ok: true, dejaRecu: true, decision: precedente };
    }
    if (attendu !== lu.revision) return { ok: false,
      erreur: "Les pistes ou la référence ont changé. Relisez la campagne avant de déclarer l'écart." };
    var decision;
    try {
      decision = DECISION.construire({ type: "ecart-campagne", objet: pisteId, projet: projetId, campagne: campagneId,
        verdict: "approuve", portee: portee, motif: motif, quand: new Date().toISOString(), qui: MAISON.titulaire,
        acteur: DECISION.acteur(), version: x.piste.version || 1, titre: x.piste.titre || "Piste retenue",
        ecart: { de: "reference-campagne", ref: c.referencePiste.decisionId } });
    } catch (e) { if (DECISION.estRefus(e)) return { ok: false, erreur: e.message }; throw e; }
    /* Comme pour la référence : l'écart est posé avant que ajouter() ne
     * publie, pour ne jamais publier le reçu sans lui. */
    x.projet.ecartDeCampagne = motif;
    DECISION.ajouter(decision);
    DEPOT.tracer("écart à la référence commune", "projets", projetId, decision.titre + " — " + motif);
    DEPOT.enregistrer();
    return { ok: true, dejaRecu: false, decision: decision };
  }

  function declarerEcartDialogue(campagneId, x, apres) {
    var lu = reference(campagneId), c = de(campagneId);
    if (lu.etat !== "choisie") return;
    var motif = el("textarea", { id: "ecart-campagne-motif", rows: 3 });
    PANNEAU.sur("L'écart de « " + x.projet.nom + " »", c ? c.nom : "", el("div", {},
      UI.banniere("", "La référence commune reste « " + (lu.reference.piste.titre || "la piste retenue") + " », sur « "
        + lu.reference.projet.nom + " ». Ce projet garde sa propre piste, « " + (x.piste.titre || "piste sans titre")
        + " ». Portée de l'écart : ce projet seulement. Les autres projets suivent toujours la référence."),
      el("div.form", {}, el("div.champ", {},
        el("label", { "for": "ecart-campagne-motif" }, "Pourquoi ce projet garde sa piste"), motif)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          var r = declarerEcart(campagneId, x.projet.id, x.piste.id, motif.value, "projet", lu.revision);
          if (!r.ok) { AVIS.refus(r.erreur); return; }
          PANNEAU.fermerSur(); if (apres) apres();
        } }, "Déclarer l'écart"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  function blocEcarts(campagneId, apres) {
    var xs = ecartsLocaux(campagneId);
    if (!xs.length) return null;
    return el("div", {},
      el("p.cg-q", {}, xs.length > 1 ? xs.length + " projets gardent leur propre piste :" : "Un projet garde sa propre piste :"),
      el("ul", {}, xs.map(function (x) {
        /* Un motif écrit sans reçu pour la référence actuelle — importé, ou
         * déclaré avant que la référence ne soit redésignée — reste lisible,
         * et se confirme par le même geste. */
        var note = (x.projet.ecartDeCampagne || "").trim();
        return el("li", {},
          el("a", { href: "#/projets/" + x.projet.id }, (x.piste.titre || "Piste sans titre") + " — " + x.projet.nom),
          x.declaration
            ? " · écart déclaré pour ce projet le " + O.jourCourt(x.declaration.quand) + " : « " + x.declaration.motif + " »"
            : [note ? " · écart noté sans reçu pour la référence actuelle : « " + note + " ». " : " · écart non déclaré. ",
               el("button.studio-lien", { type: "button", onclick: function () {
                 declarerEcartDialogue(campagneId, x, apres); } }, "Déclarer l'écart de " + (x.projet.ref || x.projet.nom))]);
      })));
  }

  function blocReference(campagneId, apres) {
    var lu = reference(campagneId), ref = lu.reference;
    var conflit = lu.etat === "conflit" || lu.etat === "perimee";
    return el("section.cg-piste" + (conflit ? ".f-alerte" : ref ? "" : ".f-attente"), {},
      el("p.cg-l", {}, lu.etat === "conflit" ? "Références concurrentes"
        : lu.etat === "perimee" ? "Référence à relire" : ref ? "La référence commune" : "Aucune piste retenue"),
      ref ? el("p.cg-titre", {}, ref.piste.titre || "Piste retenue") : null,
      el("p.cg-q", {}, ref
        ? lu.etat === "unique"
          ? "Seule piste retenue, sur « " + ref.projet.nom + " ». Son rôle commun est déduit ; vous pouvez le consigner explicitement."
          : "Désignée pour la campagne, depuis « " + ref.projet.nom + " ». Les pistes locales et leurs décisions sont conservées."
        : lu.etat === "conflit" ? "Plusieurs pistes sont retenues. Aucune ne gouverne la campagne par sa place dans la liste."
        : lu.etat === "perimee" ? "La piste choisie a changé, a été retirée ou son reçu manque. Son ancienne décision reste conservée."
        : "Le travail peut continuer ; aucun concept commun n'est encore désigné."),
      conflit ? el("ul", {}, lu.candidates.map(function (x) {
        return el("li", {}, el("a", { href: "#/projets/" + x.projet.id },
          (x.piste.titre || "Piste sans titre") + " — " + x.projet.nom));
      })) : null,
      lu.etat === "choisie" ? blocEcarts(campagneId, apres) : null,
      lu.candidates.length ? el("button.b.nu", { type: "button", onclick: function () {
        choisirReference(campagneId, apres);
      } }, lu.etat === "choisie" ? "Revoir la référence commune" : "Choisir la référence commune") : null);
  }

  /* ————————————————————— Le bilan de campagne —————————————————————
   *
   * La campagne porte son bilan depuis le premier jour (`c.bilan`, un texte),
   * et rien ne l'écrivait. Ce n'est ni la fiche mensuelle (bilan.js), ni le
   * texte de clôture d'un projet (cloture.js), ni la chronologie de la marque
   * (vie-marque.js) : c'est le diagnostic que la campagne suivante doit pouvoir
   * opposer.
   *
   * Le texte reste un brouillon qu'on écrit et réécrit. Le clore est un choix :
   * il passe par la fabrique (une décision `bilan-campagne`, son acteur et sa
   * ligne de journal) et fige une version, que rien ne réécrit ensuite :
   *
   *   c.bilan          le texte de travail
   *   c.bilan_le       la date du dernier arrêt, lue par la chronologie
   *   c.bilanVersions  les versions arrêtées, dans l'ordre, jamais modifiées
   *   c.bilanRecus     l'accusé de La Fusée pour chaque version transmise
   *
   * Une version arrêtée garde son identité (la même d'une version à l'autre),
   * son numéro, sa date, la campagne et ses marques telles qu'elles étaient,
   * le texte, ce qu'elle change, l'empreinte de la précédente et la sienne :
   * SHA-256 du JSON aux clés triées, sans les champs `empreinte` et
   * `attestation`. Servie derrière La Fusée, une version reçoit en plus à son
   * enregistrement l'attestation de la personne connectée, posée après l'arrêt
   * et donc hors de l'empreinte. La Fusée recalcule l'empreinte et vérifie
   * l'attestation à la réception ; les jeux tests/fixtures/bilan-campagne-v1.json
   * et bilan-campagne-atteste-v1.json sont communs aux deux dépôts. */

  var BILAN_SCHEMA = "la-barre/bilan-campagne";
  var BILAN_MAX = 60000;
  var NOTE_MAX = 4000;

  function identiteBilan(c) { return "BIL-" + c.id; }

  function bilanVersions(c) { return c && Array.isArray(c.bilanVersions) ? c.bilanVersions : []; }

  function dernierBilan(c) {
    var vs = bilanVersions(c);
    return vs.length ? vs[vs.length - 1] : null;
  }

  /* L'état du bilan, et la révision que le dialogue relit avant d'arrêter. */
  function etatBilan(c) {
    var texte = String((c && c.bilan) || "").trim(), d = dernierBilan(c);
    var revision = JSON.stringify([texte, bilanVersions(c).length, d ? d.empreinte : null]);
    if (!d && !texte) return { cle: "absent", nom: "aucun bilan", ton: "attente", revision: revision,
      quoi: "Aucun bilan n'est écrit : la campagne suivante repartira sans son diagnostic." };
    if (!d) return { cle: "brouillon", nom: "bilan écrit, non arrêté", ton: "attente", revision: revision,
      quoi: "Le bilan est écrit, pas encore arrêté : il ne fait pas foi tant qu'il n'est pas clos." };
    var quand = "arrêté le " + O.jourCourt(d.arrete_le) + ", version " + d.version;
    if (texte === d.contenu) return { cle: "arrete", nom: "bilan arrêté", ton: "terne", revision: revision,
      version: d, quoi: "Le bilan est " + quand + "." };
    return { cle: "modifie", nom: "bilan modifié", ton: "attente", revision: revision, version: d,
      quoi: "Le bilan a changé depuis sa version " + d.version + " (" + quand + ") : "
        + "arrêtez une nouvelle version pour qu'il fasse foi." };
  }

  /* Le brouillon : un texte qu'on écrit, pas une décision. */
  function ecrireBilan(c, texte) {
    if (!c) return false;
    var t = String(texte || "");
    if (t === (c.bilan || "")) return false;
    c.bilan = t;
    DEPOT.tracer("bilan écrit", "campagnes", c.id, t.trim().slice(0, 80), c.marqueIds || []);
    DEPOT.enregistrer();
    return true;
  }

  /* Le JSON canonique : clés triées, rien d'autre. Une valeur indéfinie n'a
   * pas de forme commune aux deux dépôts ; la version n'en porte aucune. */
  function canonique(v) {
    if (Array.isArray(v)) return v.map(canonique);
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).sort().forEach(function (k) { o[k] = canonique(v[k]); });
      return o;
    }
    return v;
  }

  function empreinteBilan(doc) {
    var subtil = window.crypto && window.crypto.subtle;
    if (!subtil || !window.TextEncoder) {
      return Promise.reject(new Error("Ouvrez La Barre dans une connexion sécurisée pour arrêter le bilan : son empreinte en dépend."));
    }
    var sans = {};
    Object.keys(doc).forEach(function (k) { if (k !== "empreinte" && k !== "attestation") sans[k] = doc[k]; });
    var texte = JSON.stringify(canonique(sans));
    return subtil.digest("SHA-256", new window.TextEncoder().encode(texte)).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }

  function arreterBilan(campagneId, note, attendu) {
    var c = de(campagneId);
    if (!c) return Promise.resolve({ ok: false, erreur: "Campagne introuvable." });
    var lu = etatBilan(c), texte = String(c.bilan || "").trim(), d = dernierBilan(c);
    note = typeof note === "string" ? note.trim() : "";
    if (!texte) return Promise.resolve({ ok: false, erreur: "Écrivez le bilan avant de le clore." });
    /* Un rejeu exact retrouve sa version, même depuis un dialogue déjà relu. */
    if (d && d.contenu === texte) return Promise.resolve({ ok: true, dejaRecu: true, version: d });
    if (attendu !== lu.revision) return Promise.resolve({ ok: false,
      erreur: "Le bilan a changé. Relisez-le avant de l'arrêter." });
    if (texte.length > BILAN_MAX) return Promise.resolve({ ok: false,
      erreur: "Un bilan arrêté tient en 60 000 caractères. Resserrez-le, ou joignez le détail en pièce." });
    if (d && !note) return Promise.resolve({ ok: false,
      erreur: "Dites ce que cette nouvelle version change : la version " + d.version + " reste conservée telle quelle." });
    if (note.length > NOTE_MAX) return Promise.resolve({ ok: false, erreur: "Ce que la version change tient en 4 000 caractères." });

    var quand = new Date().toISOString();
    var fenetre = c.fenetre || {};
    var doc;
    try {
      doc = {
        schema: BILAN_SCHEMA, schemaVersion: 1, id: identiteBilan(c), version: d ? d.version + 1 : 1, arrete_le: quand,
        campagne: { id: c.id, nom: c.nom || null, regime: c.regime || null, occasion: c.occasion || null,
          debut: fenetre.debut || null, fin: fenetre.fin || null },
        marques: (c.marqueIds || []).map(function (id) {
          var m = DEPOT.trouve("marques", id);
          return { id: id, nom: m && m.nom ? m.nom : null };
        }),
        contenu: texte, note: note || null, precedente: d ? d.empreinte : null,
        /* L'identifiant de la décision est tiré d'avance : la version le porte. */
        decision: DECISION.identifiant(), qui: MAISON.titulaire, acteur: DECISION.acteur(),
      };
    } catch (e) {
      if (DECISION.estRefus(e)) return Promise.resolve({ ok: false, erreur: e.message });
      throw e;
    }
    return empreinteBilan(doc).then(function (h) {
      /* Le calcul est asynchrone : on relit avant d'écrire. */
      if (etatBilan(c).revision !== lu.revision || de(campagneId) !== c) {
        return { ok: false, erreur: "Le bilan a changé pendant son arrêt. Relisez-le avant de le clore." };
      }
      doc.empreinte = h;
      var decision;
      try {
        decision = DECISION.construire({ id: doc.decision, type: "bilan-campagne", objet: doc.id, campagne: c.id,
          verdict: "approuve", portee: "campagne", motif: doc.note, quand: quand, qui: doc.qui, acteur: doc.acteur,
          version: doc.version, titre: "Bilan de campagne — " + (c.nom || c.id), empreinte: h });
      } catch (e) {
        if (DECISION.estRefus(e)) return { ok: false, erreur: e.message };
        throw e;
      }
      /* Comme pour la référence : la version est posée avant que ajouter()
       * ne publie, pour ne jamais publier la décision sans elle. */
      c.bilanVersions = bilanVersions(c).concat([doc]);
      c.bilan_le = quand;
      DECISION.ajouter(decision);
      DEPOT.tracer("bilan arrêté", "campagnes", c.id, "version " + doc.version + " · " + h.slice(0, 12), c.marqueIds || []);
      DEPOT.enregistrer();
      return { ok: true, dejaRecu: false, version: doc, decision: decision };
    }, function (e) { return { ok: false, erreur: e.message }; });
  }

  /* La transmission : La Fusée relit la version dans la base enregistrée et
   * recalcule son empreinte. Le navigateur n'envoie que ce qui la désigne. */
  function peutTransmettre() {
    return !!(window.VAULT && VAULT.statutContexte && VAULT.statutContexte().bilan);
  }

  function transmettreBilan(campagneId, version) {
    var c = de(campagneId);
    var v = bilanVersions(c).filter(function (x) { return x.version === version; })[0];
    if (!v) return Promise.resolve({ ok: false, erreur: "Cette version du bilan est introuvable." });
    if (!peutTransmettre()) return Promise.resolve({ ok: false,
      erreur: "La transmission se fait depuis La Barre ouverte dans La Fusée." });
    return new Promise(function (resolve, reject) {
      DEPOT.ecrireSurDisque(function (ok, pourquoi) {
        ok ? resolve() : reject(new Error(pourquoi || "La base n'est pas enregistrée : le bilan ne peut pas encore être relu."));
      });
    }).then(function () {
      return window.fetch("bilan", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campagneId: c.id, bilanId: v.id, version: v.version, empreinte: v.empreinte }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.quoi || "Le bilan n'a pas été reçu par La Fusée.");
        return data;
      });
    }).then(function (data) {
      c.bilanRecus = c.bilanRecus || {};
      c.bilanRecus[String(v.version)] = { quand: data.receivedAt || new Date().toISOString(), empreinte: v.empreinte,
        source: data.sourceId || null, edition: typeof data.edition === "number" ? data.edition : null,
        lien: typeof data.url === "string" && data.url.charAt(0) === "/" ? data.url : null };
      DEPOT.tracer("bilan reçu par La Fusée", "campagnes", c.id, "version " + v.version
        + (data.alreadyReceived ? " · déjà reçue" : ""), c.marqueIds || []);
      DEPOT.enregistrer();
      return { ok: true, recu: data };
    }).catch(function (e) { return { ok: false, erreur: e.message }; });
  }

  /* ————— L'écran ————— */

  function clore(c, apres) {
    var lu = etatBilan(c), d = dernierBilan(c), n = d ? d.version + 1 : 1;
    var ouverts = projets(c.id).filter(function (p) { return !(window.CLOTURE && CLOTURE.est(p)); }).length;
    var note = el("textarea", { id: "bilan-note", rows: 2 });
    PANNEAU.sur("Clore le bilan", c.nom, el("div", {},
      UI.banniere("", "Arrêter fige ce texte en version " + n + ", daté et rattaché à votre décision. "
        + (d ? "La version " + d.version + " reste conservée telle quelle. " : "")
        + "Pour le modifier ensuite, il faudra arrêter une nouvelle version."),
      ouverts ? UI.banniere("attente", ouverts > 1 ? ouverts + " projets de la campagne sont encore ouverts : le bilan ne dira rien de leur suite."
        : "Un projet de la campagne est encore ouvert : le bilan ne dira rien de sa suite.") : null,
      (c.marqueIds || []).length ? null : UI.banniere("attente", "La campagne n'a pas de marque : La Fusée ne pourra pas ranger ce bilan."),
      PANNEAU.sousbloc ? PANNEAU.sousbloc("Le texte arrêté", el("p.lire", {}, String(c.bilan || "").trim()))
        : el("p.lire", {}, String(c.bilan || "").trim()),
      el("div.form", {}, el("div.champ", {},
        el("label", { "for": "bilan-note" }, d ? "Ce que cette version change" : "Une note de version, si besoin"),
        el("div.indice", {}, d ? "Obligatoire : elle accompagne la version dans le registre des décisions."
          : "Facultative. Elle accompagne la version dans le registre des décisions."), note)),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function (e) {
          var b = e && e.target;
          if (b) b.disabled = true;
          return arreterBilan(c.id, note.value, lu.revision).then(function (r) {
            if (b) b.disabled = false;
            if (!r.ok) { AVIS.refus(r.erreur); return; }
            PANNEAU.fermerSur();
            AVIS.fait(r.dejaRecu ? "Cette version était déjà arrêtée." : "Le bilan est arrêté en version " + r.version.version + ".");
            if (apres) apres();
          });
        } }, "Arrêter la version " + n),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))));
  }

  function ligneVersion(c, v, apres) {
    var recu = (c.bilanRecus || {})[String(v.version)];
    var par = ACTEUR.attribution(v);
    return el("li", {},
      el("details", {},
        el("summary", {}, "Version " + v.version + " · arrêtée le " + O.jourCourt(v.arrete_le) + " par " + par.nom
          + " (" + (par.mode === "authentifie" ? "authentifié par La Fusée" : "déclaré sur ce poste") + ")"
          + " · empreinte " + String(v.empreinte).slice(0, 12)),
        v.note ? el("p.cg-q", {}, "Ce qu'elle change : " + v.note) : null,
        el("p.lire", {}, v.contenu)),
      recu && recu.empreinte === v.empreinte
        ? el("span.cg-q", {}, " Reçue par La Fusée le " + O.jourCourt(recu.quand)
            + (recu.edition ? " (édition " + recu.edition + ")" : ""), recu.lien ? [" · ", el("a", { href: recu.lien }, "l'ouvrir")] : null)
        : null,
      peutTransmettre() ? el("button.studio-lien", { type: "button", onclick: function (e) {
        var b = e && e.target;
        if (b) b.disabled = true;
        return transmettreBilan(c.id, v.version).then(function (r) {
          if (b) b.disabled = false;
          if (!r.ok) { AVIS.refus(r.erreur); return; }
          AVIS.fait(r.recu.alreadyReceived ? "La Fusée avait déjà reçu cette version." : "La Fusée a reçu la version " + v.version + " du bilan.");
          if (apres) apres();
        });
      } }, recu ? "Transmettre de nouveau" : "Transmettre à La Fusée") : null);
  }

  function blocBilan(c, apres) {
    var e = etatBilan(c), vs = bilanVersions(c);
    var champ = el("textarea", { id: "bilan-campagne", rows: 8 });
    champ.value = c.bilan || "";
    return el("section.cg-bloc" + (e.cle === "arrete" ? "" : ".f-attente"), {},
      el("div.section-titre", {}, "Le bilan de campagne",
        el("span.taille", {}, vs.length ? "· version " + vs[vs.length - 1].version + " arrêtée" : "· non arrêté")),
      el("p.cg-q", {}, e.quoi),
      el("div.form", {}, el("div.champ", {},
        el("label", { "for": "bilan-campagne" }, "Ce que la campagne a appris"),
        el("div.indice", {}, "Distinct du bilan mensuel et du texte de clôture des projets. Le brouillon se réécrit ; une version arrêtée ne change plus."),
        champ)),
      el("div.form-actions", {},
        el("button.b.nu", { type: "button", onclick: function () {
          ecrireBilan(c, champ.value);
          AVIS.fait("Le brouillon du bilan est enregistré.");
          if (apres) apres();
        } }, "Enregistrer le brouillon"),
        el("button.b.or", { type: "button", onclick: function () {
          ecrireBilan(c, champ.value);
          if (!String(c.bilan || "").trim()) { AVIS.refus("Écrivez le bilan avant de le clore."); return; }
          if (etatBilan(c).cle === "arrete") { AVIS.fait("Ce texte est déjà arrêté en version " + dernierBilan(c).version + "."); return; }
          clore(c, apres);
        } }, "Clore le bilan de campagne")),
      vs.length ? el("ul.cg-versions", {}, vs.slice().reverse().map(function (v) { return ligneVersion(c, v, apres); })) : null,
      vs.length && !peutTransmettre() ? el("p.cg-q", {},
        "La transmission à La Fusée se fait depuis La Barre ouverte dans La Fusée.") : null);
  }

  return { liste: liste, de: de, deMarque: deMarque, cycleDe: cycleDe,
    projets: projets, occasion: occasion, etat: etat,
    etatBilan: etatBilan, ecrireBilan: ecrireBilan, empreinteBilan: empreinteBilan,
    arreterBilan: arreterBilan, transmettreBilan: transmettreBilan, blocBilan: blocBilan,
    composition: composition, ecarter: ecarter, reprendre: reprendre,
    creer: creer, pisteDeReference: pisteDeReference, reference: reference,
    designerReference: designerReference, choisirReference: choisirReference, blocReference: blocReference,
    ecartsLocaux: ecartsLocaux, declarerEcart: declarerEcart,
    rattacher: rattacher, candidates: candidates, choisir: choisir, accueillir: accueillir };
})();
