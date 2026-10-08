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
      var avecBilan = !!((c.bilan || "").trim());
      return { cle: "close", nom: "tous les projets clos", ton: avecBilan ? "terne" : "attente",
        quoi: avecBilan ? "Le bilan est au dossier."
          : (n > 1 ? "Les " + n + " projets sont clos" : "Son seul projet est clos")
            + " et la campagne n'a pas de bilan : la suivante repartira sans son diagnostic." };
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
   * ne se rediscute plus. */
  function ecarter(c, natureCle, motif) {
    c.ecartes = c.ecartes || {};
    c.ecartes[natureCle] = { motif: (motif || "").trim() || "sans motif écrit",
      quand: new Date().toISOString() };
    DEPOT.tracer("écarté de la composition", "campagnes", c.id, natureCle);
    DEPOT.enregistrer();
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
    var decision = { id: O.id("DEC"), type: "reference-campagne", objet: pisteId,
      projet: projetId, campagne: campagneId, verdict: "approuve", portee: "campagne",
      motif: motif, quand: new Date().toISOString(), qui: MAISON.titulaire,
      acteur: window.ACTEUR ? ACTEUR.trace() : null, version: candidate.piste.version || 1,
      titre: candidate.piste.titre || "Piste retenue", contenuPiste: contenuPiste(candidate.piste),
      revisionSource: lu.revision, remplace: precedente ? precedente.id : null };
    c.referencePiste = { projetId: projetId, pisteId: pisteId,
      decisionId: decision.id, contenu: decision.contenuPiste };
    /* ajoute() publie et sauvegarde immédiatement. Poser la référence avant
     * cet appel empêche de publier un reçu sans son choix commun. */
    DEPOT.ajoute("decisions", decision);
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
      lu.candidates.length ? el("button.b.nu", { type: "button", onclick: function () {
        choisirReference(campagneId, apres);
      } }, lu.etat === "choisie" ? "Revoir la référence commune" : "Choisir la référence commune") : null);
  }

  return { liste: liste, de: de, deMarque: deMarque, cycleDe: cycleDe,
    projets: projets, occasion: occasion, etat: etat,
    composition: composition, ecarter: ecarter, reprendre: reprendre,
    creer: creer, pisteDeReference: pisteDeReference, reference: reference,
    designerReference: designerReference, choisirReference: choisirReference, blocReference: blocReference,
    rattacher: rattacher, candidates: candidates, choisir: choisir, accueillir: accueillir };
})();
