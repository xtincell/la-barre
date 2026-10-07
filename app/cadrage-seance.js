/* cadrage-seance.js — le document de cadrage, lu comme on prépare une séance.
 *
 * Le cadrage compilé était juste et illisible : cinquante rubriques les unes
 * sous les autres, dans un panneau latéral, trois plateformes de marque de
 * vingt et un champs chacune au milieu — dix-sept mille pixels pour l'EOY.
 * Personne ne prépare une séance de conception avec ça. On y cherche la
 * question qu'on écrira au mur, et on la trouve à la page douze.
 *
 * Le même contenu, rangé dans l'ordre où la séance s'en sert :
 *
 *   1  La séance     ce qu'on écrit au mur : la question, ce qu'elle doit
 *                    produire, ce qui est déjà tranché, ce qu'on ne proposera
 *                    pas. Une page, qui se lit en cinq minutes avant d'entrer.
 *   2  La matière    ce qu'on apporte : les insights, les territoires, les
 *                    amorces, les big ideas par école, le moodboard.
 *   3  La marque     l'essentiel de chaque plateforme — ce qu'une piste doit
 *                    respecter pour être de la marque. Pas les vingt et un champs.
 *   4  Le dossier    tout le reste, intégral : le brief, les plateformes
 *                    complètes, le cadre de décision, les pièces reçues.
 *                    Replié à l'écran, déplié à l'impression.
 *
 * Rien n'est retiré du document : la quatrième partie reprend le cadrage
 * complet, rubrique par rubrique. Ce qui change, c'est ce qu'on voit d'abord.
 */

window.CADRAGE_SEANCE = (function () {
  var el = O.el;
  var ouvert = null;

  function plein(v) {
    return Array.isArray(v) ? v.filter(function (x) { return x && String(x).trim(); }).length > 0
      : v !== undefined && v !== null && String(v).trim() !== "";
  }
  function liste(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(function (x) { return x && String(x).trim(); });
    return String(v).split(/\n+/).map(function (x) { return x.replace(/^[-•·]\s*/, "").trim(); }).filter(Boolean);
  }
  function court(t, n) {
    t = String(t || "").trim();
    return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
  }

  /* ————————————————————— Les pièces du document —————————————————————
   *
   * Refonte du 07/10/2026 (« trop archaïque, difficile à lire, décourageant ») :
   * plus de grille de cartes égales coiffées d'étiquettes en capitales. Une
   * rubrique est une ligne — son nom à gauche, son contenu à droite — et son
   * contenu s'ouvre sur sa première phrase, en grand : on lit l'essentiel en
   * descendant la colonne, on déplie le reste quand on en a besoin. */

  /* La première phrase porte l'idée ; le reste se déplie. */
  function decouper(t) {
    t = String(t || "").trim();
    var m = t.match(/^([\s\S]{20,260}?[.!?…][»)]?)(\s+(?=[A-ZÀ-ÖØ-Þ«"(0-9])[\s\S]+)$/);
    if (m) return [m[1].trim(), m[2].trim()];
    if (t.length > 300) { var c = t.slice(0, 240).replace(/\s+\S*$/, ""); return [c + "…", t.slice(c.length).trim()]; }
    return [t, ""];
  }
  function lede(t, o) {
    if (!plein(t)) return null;
    o = o || {};
    var d = o.ouvert && String(t).length <= 360 ? [String(t).trim(), ""] : decouper(t);
    return el("div.cds-lede" + (o.ecrit ? ".cds-ecrit" : ""), {},
      el("p.cds-lead", {}, d[0]),
      d[1] ? (o.ouvert || d[1].length < 160
        ? el("p.cds-p", {}, d[1])
        : el("details.cds-suite", {}, el("summary", {}, "Lire la suite"), el("p.cds-p", {}, d[1]))) : null);
  }
  function prose(t, ecrit) { return lede(t, { ecrit: ecrit }); }
  function puces(v, cls) {
    var l = liste(v);
    return l.length ? el("ul.cds-l" + (cls ? "." + cls : ""), {}, l.map(function (x) { return el("li", {}, x); })) : null;
  }
  function etiquetteInferee(o) { return o && o.infere ? el("span.cds-inf", {}, "inféré") : null; }

  /* Une rubrique : son nom à gauche, son contenu à droite. Vide, elle ne
   * s'affiche que si son absence coûte en séance — et elle dit ce coût. */
  function rubrique(titre, corps, o) {
    o = o || {};
    var vide = !corps || (Array.isArray(corps) && !corps.filter(Boolean).length);
    if (vide && !o.manque) return null;
    return el("section.cds-r" + (vide ? ".cds-r-manque" : "") + (o.fort ? ".cds-r-fort" : ""), {},
      el("h3.cds-rt", {}, titre, etiquetteInferee(o), o.sous ? el("span.cds-rs", {}, o.sous) : null),
      el("div.cds-rc", {}, vide ? el("p.cds-vide", {}, o.manque) : corps));
  }
  /* Deux listes qui se répondent, côte à côte. */
  function paire(a, b) {
    var x = [a, b].filter(Boolean);
    return x.length ? el("div.cds-paire", {}, x) : null;
  }
  function colonne(titre, corps, cls) {
    return corps ? el("div.cds-col" + (cls ? "." + cls : ""), {}, el("h3.cds-ct", {}, titre), corps) : null;
  }
  /* Rétrocompatibilité : quelques appels gardent l'ancienne forme. */
  function carte(titre, corps, o) { return rubrique(titre, corps, o); }
  function partie(n, id, titre, quoi, enfants) {
    enfants = enfants.filter(Boolean);
    if (!enfants.length) return null;
    return el("section.cds-partie", { id: id },
      el("header.cds-ph", {}, el("h2", {}, titre), el("p.cds-pq", {}, quoi)),
      enfants);
  }

  /* ————————————————————— 1 · La séance ————————————————————— */

  function seance(p) {
    var b = p.sections.brief || {}, st = p.sections.strategie || {}, i = p.sections.identite || {};
    var pr = window.PREPARATION ? PREPARATION.de(p) : {};
    var is = window.INSIGHT ? INSIGHT.liste(p) : [];
    var retenu = is.filter(function (x) { return x.retenu; })[0] || is[0] || null;
    var insightTxt = retenu ? INSIGHT.texte(retenu) : (b.insight || st.insight);
    var couche = retenu && retenu.couche ? INSIGHT.couche(retenu.couche) : null;
    var question = pr.question || null;
    var interdits = liste(pr.interdits).concat(liste(st.gardefous));

    return [
      /* La phrase au mur, la seule chose soulevée de la page. */
      el("div.cds-mur" + (question ? "" : ".cds-manque"), {},
        question ? el("p.cds-q", {}, question)
          : el("p.cds-vide", {}, "La question n'est pas écrite. La séance dépensera sa première demi-heure à la chercher — "
              + "écrivez-la dans « Préparer la séance », une seule, commençant par « comment »."),
        el("p.cds-mur-l", {}, "La question de la séance, à écrire au mur"
          + (pr.infere ? " · préparation inférée, à relire avant d'entrer" : ""))),

      plein(pr.objectif) ? el("p.cds-but", {}, el("b", {}, "La séance doit produire : "), pr.objectif)
        : el("p.cds-but.cds-manque", {}, "Ce que la séance doit produire n'est pas dit : trois angles ? une idée retenue ? On saura quand s'arrêter."),

      el("div.cds-rubriques", {},
        rubrique("L'insight", insightTxt ? el("div", {}, lede(insightTxt, { ecrit: true, ouvert: true }),
            couche ? el("p.cds-src", {}, "Couche " + couche.nom.toLowerCase() + " — elle commande " + couche.commande + ".") : null) : null,
          { fort: true, manque: "Aucun insight : les idées n'auront pas de racine commune." }),
        rubrique("Le message clé", lede(b.message_cle, { ecrit: true, ouvert: true })),
        rubrique("Le problème réel", lede(st.probleme_reel), { manque: "Pas écrit : l'atelier résoudra la demande, pas ce qu'elle cache." }),
        rubrique("À qui on parle", lede(b.cible)),
        rubrique("Le job to be done", lede(b.jtbd))),

      paire(colonne("Déjà tranché", puces(pr.a_trancher, "cds-ok"), "cds-oui"),
            colonne("On ne proposera pas", puces(interdits, "cds-non"), "cds-non")),

      paire(colonne("Ce qu'il faut produire", puces(b.livrables_attendus)),
            colonne("Les mandatories", puces(b.mandatories))),

      (plein(pr.deroule) || plein(pr.materiel)) ? paire(colonne("Le déroulé", puces(pr.deroule, "cds-tl")),
            colonne("À apporter en séance", puces(pr.materiel))) : null,

      cadreBande(p, i),
    ];
  }

  /* Qui tranche, pour quand : une ligne, pas un tableau. */
  function cadreBande(p, i) {
    var d = [
      i.decideur ? ["Décideur", i.decideur] : null,
      i.echeance ? ["Échéance", O.joli(i.echeance)] : null,
      i.fenetre ? ["Diffusion", court(i.fenetre, 110)] : null,
    ].filter(Boolean);
    if (!d.length) return null;
    return el("dl.cds-bande", {}, d.map(function (x) {
      return el("div", {}, el("dt", {}, x[0]), el("dd", {}, x[1])); }));
  }

  /* ————————————————————— La campagne : les frères du projet ————————————————————— */

  function campagne(p) {
    var c = window.CAMPAGNE && p.campagneId ? CAMPAGNE.de(p.campagneId) : null;
    if (!c) return null;
    var freres = CAMPAGNE.projets(c.id).filter(function (x) { return x.id !== p.id; });
    var ref = CAMPAGNE.pisteDeReference(c.id);
    var f = c.fenetre || {};
    return el("div.cds-cmp", {},
      el("p.cds-cmp-n", {}, "Campagne ", el("a", { href: "#/projets/" + c.id, onclick: fermer }, c.nom),
        f.debut ? el("span.cds-src", {}, "  ·  " + O.joli(f.debut) + (f.fin ? " → " + O.joli(f.fin) : "")) : null),
      ref ? el("p.cds-src", {}, "La piste qui gouverne : ", el("b", {}, ref.piste.titre || "piste retenue"),
        " — arbitrée sur « " + ref.projet.nom + " ».") : null,
      freres.length ? el("p.cds-src", {}, (freres.length > 1 ? freres.length + " autres projets : " : "Autre projet : "),
        freres.map(function (x, k) {
          return [k ? ", " : "", el("a", { href: "#/projets/" + x.id, onclick: fermer }, x.ref || x.id), " " + x.nom];
        })) : el("p.cds-src", {}, "Seul projet de la campagne à ce jour."));
  }

  /* ————————————————————— 2 · La matière ————————————————————— */

  function matiere(p) {
    var st = p.sections.strategie || {}, bi = p.sections.bigidea || {};
    var pr = window.PREPARATION ? PREPARATION.de(p) : {};
    var is = window.INSIGHT ? INSIGHT.liste(p) : [];
    var ts = window.TERRITOIRE ? TERRITOIRE.liste(p) : [];
    var bis = window.BI_ECOLES ? BI_ECOLES.vivantes(p) : [];
    var mood = (p.sections.socle || {}).moodboard || [];

    return [
      plein(bi.idee) ? el("div.cds-idee", {},
        el("p.cds-q.cds-q-m", {}, bi.idee),
        el("p.cds-mur-l", {}, bi.propositionId ? "La big idea retenue" : "L'idée déjà sur la table — ni arbitrée, ni attribuée : une proposition parmi d'autres"),
        plein(bi.mecanique) ? lede(bi.mecanique) : null) : null,

      is.length ? rubrique("Les insights", el("div.cds-items", {}, is.map(function (x) {
          INSIGHT.normaliser(x);
          var c = x.couche ? INSIGHT.couche(x.couche) : null;
          var t = x.passes.temps || {};
          var v = INSIGHT.verdict(x);
          return el("article.cds-item", {},
            el("p.cds-lead.cds-ecrit-l", {}, INSIGHT.texte(x)),
            (t.situation || t.tension || t.empeche) ? el("dl.cds-temps", {},
              t.situation ? [el("dt", {}, "Situation"), el("dd", {}, t.situation)] : null,
              t.tension ? [el("dt", {}, "Tension"), el("dd", {}, t.tension)] : null,
              t.empeche ? [el("dt", {}, "Ce que ça empêche"), el("dd", {}, t.empeche)] : null) : null,
            el("p.cds-src", {}, [c ? "Couche " + c.nom.toLowerCase() : "Couche non nommée", v.nom,
              x.sources && x.sources.length ? x.sources.length + " sources" : null, x.infere ? "inféré" : null].filter(Boolean).join(" · ")));
        })), { sous: is.length > 1 ? is.length + " racines possibles — une idée remonte à une seule" : null }) : null,

      ts.length ? rubrique("Les territoires", el("div.cds-items", {}, ts.map(function (t) {
          var n = TERRITOIRE.pistes(p, t).length;
          return el("article.cds-item", {},
            el("p.cds-item-t", {}, t.nom || "Territoire sans nom"),
            lede(t.quoi),
            el("p.cds-src", {}, n + (n > 1 ? " concepts posés" : " concept posé") + (t.infere ? " · inféré" : "")));
        }))) : (st.territoire ? rubrique("Le territoire", lede(st.territoire)) : null),

      (plein(pr.amorces) || plein(pr.directions)) ? paire(
        colonne("Les amorces — elles se jettent, elles ne se défendent pas", puces(pr.amorces)),
        colonne("Les directions à explorer", puces(pr.directions))) : null,

      bis.length ? rubrique("Les big ideas par école", el("div.cds-items", {}, bis.map(function (c) {
          var e = window.ECOLES && c.ecole ? ECOLES.de(c.ecole) : null;
          return el("article.cds-item" + (c.statut === "retenue" ? ".cds-ret" : ""), {},
            el("p.cds-item-t", {}, (c.titre || "Sans titre") + (c.statut === "retenue" ? " — retenue" : "")),
            lede(c.phrase, { ecrit: true }),
            el("p.cds-src", {}, (e ? e.nom : "École non déclarée") + (c.mecanique ? " · " + court(c.mecanique, 160) : "")));
        })), { sous: (function () { var r = BI_ECOLES.racines(p);
          return bis.length + " propositions · " + r.n + (r.n > 1 ? " racines" : " racine commune"); })() }) : null,

      (st.a_garder || st.a_adapter || st.a_ecarter) ? rubrique("L'adaptation", el("div.cds-paire.cds-trois", {},
          colonne("On garde", puces(st.a_garder, "cds-ok"), "cds-oui"),
          colonne("On adapte", puces(st.a_adapter)),
          colonne("On ne reprend pas", puces(st.a_ecarter, "cds-non"), "cds-non"))) : null,

      mood.length ? rubrique("Le moodboard", el("div.cds-mood", {}, mood.map(function (m) {
          var noms = { reference: "Référence", passe: "Campagne passée", interdit: "À ne pas refaire" };
          return el("figure.cds-img" + (m.role === "interdit" ? ".cds-non" : ""), {},
            m.vignette ? el("img", { src: m.vignette, alt: m.legende || "", loading: "lazy" }) : null,
            el("figcaption", {}, el("b", {}, noms[m.role] || "Image"), m.legende ? " — " + m.legende : ""));
        }))) : null,
    ];
  }

  function bloc(titre, sous, corps) { return rubrique(titre, corps, { sous: sous }); }

  /* ————————————————————— 3 · La marque, l'essentiel ————————————————————— */

  /* Ce qu'une piste doit respecter pour être de la marque : les marques côte à
   * côte, leur idée directrice en tête — c'est elle qu'on confronte à la piste. */
  var ESSENTIEL = ["idee_directrice", "promesse", "positionnement", "valeurs", "ton", "symboles", "jamais"];

  function marques(p) {
    var mqs = window.MARQUE ? MARQUE.toutes(p) : [];
    if (!mqs.length) return [];
    var g = window.VAULT ? VAULT.gammeDuDossier(p) : null;
    return [el("div.cds-marques", {}, mqs.map(function (m) {
      var a = MARQUE.logo(m.id);
      var src = a ? a.vignette || null : null;
      var val = function (cle) { var h = VAULT.pourDossier(p, m.id, cle); return h && plein(h.valeur) ? h.valeur : null; };
      var tete = val("idee_directrice") || val("promesse");
      var champs = ESSENTIEL.filter(function (cle) { return cle !== (val("idee_directrice") ? "idee_directrice" : "promesse"); }).map(function (cle) {
        var c = (VAULT.CHAMPS || []).filter(function (x) { return x.cle === cle; })[0];
        var v = val(cle);
        if (!v) return null;
        return el("div.cds-mc", {},
          el("dt", {}, c ? c.nom : cle),
          el("dd", {}, Array.isArray(v)
            ? (cle === "valeurs" ? el("span.cds-chips", {}, v.map(function (x) { return el("span", {}, x); }))
              : el("ul.cds-l", {}, v.slice(0, 5).map(function (x) { return el("li", {}, x); })))
            : (cle === "positionnement" ? lede(v) : String(v))));
      }).filter(Boolean);
      return el("article.cds-marque", {},
        el("header", {}, src ? el("img.cds-logo", { src: src, alt: m.nom }) : null,
          el("h3", {}, m.nom + (g ? " · " + g : ""))),
        tete ? el("p.cds-marque-i", {}, tete) : null,
        champs.length ? el("dl", {}, champs)
          : el("p.cds-vide", {}, "Aucune plateforme écrite pour " + m.nom + " : une piste ne pourra être jugée "
              + "« de la marque », seulement jolie ou pas."));
    }))];
  }

  /* ————————————————————— 4 · Le dossier, intégral ————————————————————— */

  /* Le cadrage complet, rubrique par rubrique, rendu par le compilateur : rien
   * de ce que le document portait ne disparaît. Replié par rubrique. */
  function dossier(p) {
    var d = COMPILATEUR.compiler(p, "cadrage");
    return [el("div.cds-dossier", {}, d.blocs.map(function (b) {
      var n = COMPILATEUR.bloc(p, b);
      if (!n) return null;
      return el("details.cds-d", {}, el("summary", {}, b.t), n);
    }).filter(Boolean))];
  }

  /* ————————————————————— L'écran ————————————————————— */

  function fermer() {
    if (!ouvert) return;
    ouvert.remove(); ouvert = null;
    document.body.classList.remove("cds-actif");
    document.removeEventListener("keydown", touche);
  }
  function touche(e) { if (e.key === "Escape") fermer(); }

  function ouvrir(p) {
    fermer();
    var i = p.sections.identite || {};
    var cs = COMPILATEUR.controles(p, "cadrage");
    var manques = cs.filter(function (c) { return !c.ok; });
    var infs = window.INFERENCE ? INFERENCE.liste(p).filter(function (x) {
      return COMPILATEUR.DOCS.cadrage.sections.indexOf(x.section) !== -1; }).length : 0;
    var mqs = window.MARQUE ? MARQUE.toutes(p) : [];

    var parts = [
      partie(1, "cds-1", "La séance", "Ce qu'on écrit au mur. Cinq minutes avant d'entrer.", seance(p)),
      partie(2, "cds-2", "La matière", "Ce qu'on apporte : racines, espaces, amorces, idées déjà posées.", matiere(p)),
      partie(3, "cds-3", "La marque", "Ce qu'une piste doit respecter pour être de la marque.", marques(p)),
      partie(4, "cds-4", "Le dossier", "Le cadrage intégral — brief, plateformes complètes, cadre de décision.", dossier(p)),
    ].filter(Boolean);

    var ecran = el("div.cds", { role: "dialog", "aria-modal": "true", "aria-label": "Cadrage — " + p.nom },
      el("div.cds-barre", {},
        el("span.cds-barre-t", {}, "Cadrage de la séance"),
        el("nav.cds-som", { "aria-label": "Parties" }, parts.map(function (s) {
          var h = s.querySelector("h2");
          return el("a", { href: "#" + s.id, onclick: function (e) {
            e.preventDefault(); s.scrollIntoView({ behavior: "smooth", block: "start" }); } }, h ? h.textContent : "");
        })),
        el("span.cds-barre-g", {},
          el("button.b.nu", { type: "button", onclick: function () {
            ecran.querySelectorAll("details.cds-d, details.cds-suite").forEach(function (x) { x.open = true; });
            window.print(); } }, "Imprimer"),
          el("button.b.nu", { type: "button", onclick: function () {
            COMPILATEUR.copier(COMPILATEUR.compiler(p, "cadrage"), COMPILATEUR.DOCS.cadrage); } }, "Copier le texte"),
          el("button.b.or", { type: "button", onclick: fermer, "aria-label": "Fermer le cadrage" }, "Fermer"))),

      el("div.cds-page", {},
        el("header.cds-tete", {},
          el("div.cds-logos", {}, mqs.map(function (m) {
            var a = MARQUE.logo(m.id);
            return a && a.vignette ? el("img", { src: a.vignette, alt: m.nom }) : null; }).filter(Boolean)),
          el("p.cds-ref", {}, [p.ref, i.client || (DEPOT.trouve("clients", i.clientId) || {}).nom].filter(Boolean).join("  ·  ")),
          el("h1", {}, p.nom),
          el("p.cds-etat" + (manques.length ? ".cds-att" : ".cds-ok"), {},
            manques.length
              ? manques.length + (manques.length > 1 ? " manques" : " manque") + " avant d'ouvrir la conception : "
                + manques.slice(0, 4).map(function (c) { return c.quoi.toLowerCase(); }).join(", ")
                + (manques.length > 4 ? "…" : "")
              : "Complet — la conception peut s'ouvrir.",
            infs ? "  ·  " + infs + (infs > 1 ? " champs tiennent" : " champ tient") + " sur une inférence : utilisables, pas opposables au client." : "")),
        campagne(p),
        parts));

    document.body.appendChild(ecran);
    document.body.classList.add("cds-actif");
    document.addEventListener("keydown", touche);
    ouvert = ecran;
    ecran.scrollTop = 0;
    var b = ecran.querySelector(".cds-barre .b.or"); if (b) b.focus();
  }

  return { ouvrir: ouvrir, fermer: fermer };
})();
