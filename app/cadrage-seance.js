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

  /* ————————————————————— Les pièces du document ————————————————————— */

  /* Une rubrique de la page de séance : un titre qui dit à quoi elle sert, et
   * rien si elle est vide — sauf quand son absence coûte en séance. */
  function carte(titre, corps, o) {
    o = o || {};
    if (!corps || (Array.isArray(corps) && !corps.length)) {
      return o.manque ? el("div.cds-carte.cds-manque", {},
        el("p.cds-e", {}, titre), el("p.cds-vide", {}, o.manque)) : null;
    }
    return el("div.cds-carte" + (o.large ? ".cds-large" : "") + (o.fort ? ".cds-fort" : ""), {},
      el("p.cds-e", {}, titre, o.infere ? el("span.cds-inf", {}, "inféré") : null),
      corps);
  }
  function prose(t, ecrit) { return plein(t) ? el("p.cds-p" + (ecrit ? ".cds-ecrit" : ""), {}, String(t)) : null; }
  function puces(v, cls) {
    var l = liste(v);
    return l.length ? el("ul.cds-l" + (cls ? "." + cls : ""), {}, l.map(function (x) { return el("li", {}, x); })) : null;
  }
  function partie(n, id, titre, quoi, enfants) {
    enfants = enfants.filter(Boolean);
    if (!enfants.length) return null;
    return el("section.cds-partie", { id: id },
      el("header.cds-ph", {},
        el("span.cds-pn", {}, String(n)),
        el("div", {}, el("h2", {}, titre), el("p.cds-pq", {}, quoi))),
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
      /* La phrase au mur. Sans elle, la séance commence par la chercher. */
      el("div.cds-mur" + (question ? "" : ".cds-manque"), {},
        el("p.cds-e", {}, "La question de la séance"),
        question ? el("p.cds-q", {}, question)
          : el("p.cds-vide", {}, "Pas écrite. La séance dépensera sa première demi-heure à la chercher — "
              + "écrivez-la dans « Préparer la séance », une seule, commençant par « comment »."),
        pr.infere ? el("p.cds-src", {}, "Préparation inférée — à relire avant d'entrer.") : null),

      el("div.cds-grille", {},
        carte("Ce que la séance doit produire", prose(pr.objectif), { fort: true,
          manque: "Le livrable de la séance n'est pas dit : trois angles ? une idée retenue ? On saura quand s'arrêter." }),
        carte("Le problème réel", prose(st.probleme_reel), { manque: "Pas écrit : l'atelier résoudra la demande, pas ce qu'elle cache." }),
        carte("L'insight" + (couche ? " · couche " + couche.nom.toLowerCase() : ""),
          insightTxt ? el("div", {}, prose(insightTxt, true),
            couche ? el("p.cds-src", {}, "Il commande " + couche.commande + ".") : null) : null,
          { fort: true, manque: "Aucun insight : les idées n'auront pas de racine commune." }),
        carte("Le message clé", prose(b.message_cle, true)),
        carte("Le job to be done", prose(b.jtbd)),
        carte("À qui on parle", prose(court(b.cible, 420)))),

      el("div.cds-grille.cds-2", {},
        carte("Déjà tranché — ne se rediscute pas", puces(pr.a_trancher, "cds-ok")),
        carte("On ne proposera pas", puces(interdits, "cds-non"))),

      el("div.cds-grille.cds-2", {},
        carte("Ce qu'il faut produire", puces(b.livrables_attendus)),
        carte("Les mandatories", puces(b.mandatories))),

      (plein(pr.deroule) || plein(pr.materiel)) ? el("div.cds-grille.cds-2", {},
        carte("Le déroulé", puces(pr.deroule, "cds-tl")),
        carte("À apporter en séance", puces(pr.materiel))) : null,

      cadreBande(p, i),
    ];
  }

  /* Qui tranche, pour quand : une ligne, pas un tableau. */
  function cadreBande(p, i) {
    var d = [
      i.decideur ? ["Décideur", i.decideur] : null,
      i.echeance ? ["Échéance", O.joli(i.echeance)] : null,
      i.fenetre ? ["Diffusion", court(i.fenetre, 90)] : null,
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
      el("div.cds-cmp-t", {},
        el("p.cds-e", {}, "La campagne"),
        el("p.cds-cmp-n", {}, el("a", { href: "#/projets/" + c.id }, c.nom)),
        f.debut ? el("p.cds-src", {}, O.joli(f.debut) + (f.fin ? " → " + O.joli(f.fin) : "")) : null),
      ref ? el("p.cds-cmp-piste", {}, "La piste qui gouverne : ", el("b", {}, ref.piste.titre || "piste retenue"),
        " — arbitrée sur « " + ref.projet.nom + " ».") : null,
      freres.length ? el("div.cds-freres", {},
        el("p.cds-e", {}, freres.length + (freres.length > 1 ? " autres projets dans cette campagne" : " autre projet dans cette campagne")),
        el("ul", {}, freres.map(function (x) {
          var clos = window.CLOTURE && CLOTURE.est(x);
          return el("li" + (clos ? ".cds-clos" : ""), {},
            el("a", { href: "#/projets/" + x.id, onclick: fermer }, x.ref || x.id),
            " ", x.nom, clos ? el("span.cds-src", {}, " · clos") : null);
        }))) : el("p.cds-src", {}, "Seul projet de la campagne à ce jour."));
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
      is.length ? bloc("Les insights", is.length + (is.length > 1 ? " racines possibles — une idée remonte à une seule" : " racine"),
        el("div.cds-cartes", {}, is.map(function (x) {
          INSIGHT.normaliser(x);
          var c = x.couche ? INSIGHT.couche(x.couche) : null;
          var t = x.passes.temps || {};
          var v = INSIGHT.verdict(x);
          return el("article.cds-obj", {},
            el("p.cds-e", {}, c ? c.nom : "Couche non nommée", x.infere ? el("span.cds-inf", {}, "inféré") : null),
            el("p.cds-p.cds-ecrit", {}, INSIGHT.texte(x)),
            (t.situation || t.tension || t.empeche) ? el("dl.cds-temps", {},
              t.situation ? [el("dt", {}, "Situation"), el("dd", {}, t.situation)] : null,
              t.tension ? [el("dt", {}, "Tension"), el("dd", {}, t.tension)] : null,
              t.empeche ? [el("dt", {}, "Ce que ça empêche"), el("dd", {}, t.empeche)] : null) : null,
            el("p.cds-src", {}, v.nom + (x.sources && x.sources.length ? " · " + x.sources.length + " sources" : "")));
        }))) : null,

      ts.length ? bloc("Les territoires", "l'espace où plusieurs concepts vivent",
        el("div.cds-cartes", {}, ts.map(function (t) {
          var n = TERRITOIRE.pistes(p, t).length;
          var r = t.insightId ? INSIGHT.de(p, t.insightId) : null;
          return el("article.cds-obj", {},
            el("p.cds-e", {}, t.nom || "Territoire sans nom", t.infere ? el("span.cds-inf", {}, "inféré") : null),
            prose(t.quoi),
            r ? el("p.cds-src", {}, "Racine : « " + court(INSIGHT.texte(r), 90) + " »") : null,
            el("p.cds-src", {}, n + (n > 1 ? " concepts posés" : " concept posé")));
        }))) : (st.territoire ? bloc("Le territoire", null, prose(st.territoire)) : null),

      (plein(pr.amorces) || plein(pr.directions)) ? el("div.cds-grille.cds-2", {},
        carte("Les amorces — elles se jettent, elles ne se défendent pas", puces(pr.amorces)),
        carte("Les directions à explorer", puces(pr.directions))) : null,

      plein(bi.idee) ? bloc(bi.propositionId ? "La big idea retenue" : "L'idée déjà sur la table",
        bi.propositionId ? null : "ni arbitrée, ni attribuée — une proposition parmi d'autres",
        el("div.cds-carte.cds-fort", {}, prose(bi.idee, true),
          plein(bi.mecanique) ? el("p.cds-src", {}, "Mécanique : " + bi.mecanique) : null)) : null,

      bis.length ? bloc("Les big ideas par école", (function () {
          var r = BI_ECOLES.racines(p);
          return bis.length + " propositions · " + r.n + (r.n > 1 ? " racines : l'arbitrage choisit d'abord l'insight" : " racine commune");
        })(),
        el("div.cds-cartes", {}, bis.map(function (c) {
          var e = window.ECOLES && c.ecole ? ECOLES.de(c.ecole) : null;
          var r = BI_ECOLES.racine(p, c);
          return el("article.cds-obj" + (c.statut === "retenue" ? ".cds-ret" : ""), {},
            el("p.cds-e", {}, e ? e.nom : "École non déclarée", c.statut === "retenue" ? el("span.cds-inf.cds-ok", {}, "retenue") : null),
            c.titre ? el("p.cds-obj-t", {}, c.titre) : null,
            prose(c.phrase, true),
            c.mecanique ? el("p.cds-src", {}, court(c.mecanique, 200)) : null,
            el("p.cds-src", {}, r ? "Racine : insight " + (r.couche ? INSIGHT.couche(r.couche).nom.toLowerCase() : "") : "Sans racine"));
        }))) : null,

      (st.a_garder || st.a_adapter || st.a_ecarter) ? bloc("L'adaptation", "trois décisions, pas une traduction",
        el("div.cds-grille.cds-3", {},
          carte("On garde", puces(st.a_garder, "cds-ok")),
          carte("On adapte", puces(st.a_adapter)),
          carte("On ne reprend pas", puces(st.a_ecarter, "cds-non")))) : null,

      mood.length ? bloc("Le moodboard", "chaque image dit pourquoi elle est là",
        el("div.cds-mood", {}, mood.map(function (m) {
          var noms = { reference: "Référence", passe: "Campagne passée", interdit: "À ne pas refaire" };
          return el("figure.cds-img" + (m.role === "interdit" ? ".cds-non" : ""), {},
            m.vignette ? el("img", { src: m.vignette, alt: m.legende || "", loading: "lazy" }) : null,
            el("figcaption", {}, el("b", {}, noms[m.role] || "Image"), m.legende ? " — " + m.legende : ""));
        }))) : null,
    ];
  }

  function bloc(titre, sous, corps) {
    return el("div.cds-bloc", {},
      el("div.cds-bt", {}, el("h3", {}, titre), sous ? el("span", {}, sous) : null),
      corps);
  }

  /* ————————————————————— 3 · La marque, l'essentiel ————————————————————— */

  /* Ce qu'une piste doit respecter pour être de la marque. Le reste de la
   * plateforme est au dossier, intégral. */
  var ESSENTIEL = ["idee_directrice", "promesse", "positionnement", "valeurs", "ton", "symboles", "jamais"];

  function marques(p) {
    var mqs = window.MARQUE ? MARQUE.toutes(p) : [];
    if (!mqs.length) return [];
    var g = window.VAULT ? VAULT.gammeDuDossier(p) : null;
    return [el("div.cds-marques", {}, mqs.map(function (m) {
      var a = MARQUE.logo(m.id);
      var src = a ? a.vignette || null : null;
      var champs = ESSENTIEL.map(function (cle) {
        var c = (VAULT.CHAMPS || []).filter(function (x) { return x.cle === cle; })[0];
        var h = VAULT.pourDossier(p, m.id, cle);
        if (!h || !plein(h.valeur)) return null;
        var inf = VAULT.inference(g ? "gamme" : "marque", g ? m.id + "|" + g : m.id, cle)
          || VAULT.inference("marque", m.id, cle);
        var v = h.valeur;
        return el("div.cds-mc", {},
          el("dt", {}, c ? c.nom : cle, inf ? el("span.cds-inf", {}, "inféré") : null),
          el("dd", {}, Array.isArray(v)
            ? (cle === "valeurs" ? el("span.cds-chips", {}, v.map(function (x) { return el("span", {}, x); }))
              : el("ul.cds-l", {}, v.slice(0, 5).map(function (x) { return el("li", {}, x); })))
            : el("span" + (cle === "idee_directrice" || cle === "promesse" ? ".cds-ecrit" : ""), {},
                cle === "positionnement" ? court(v, 320) : String(v))));
      }).filter(Boolean);
      return el("article.cds-marque", {},
        el("header", {},
          src ? el("img.cds-logo", { src: src, alt: m.nom }) : null,
          el("div", {}, el("h3", {}, m.nom + (g ? " · " + g : "")),
            el("p.cds-src", {}, champs.length + " repères sur " + ESSENTIEL.length
              + (g ? " — plateforme de la gamme " + g + " quand elle existe" : "")))),
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
        el("span.cds-barre-t", {}, "Cadrage · séance de conception"),
        el("nav.cds-som", { "aria-label": "Parties" }, parts.map(function (s) {
          var h = s.querySelector("h2");
          return el("a", { href: "#" + s.id, onclick: function (e) {
            e.preventDefault(); s.scrollIntoView({ behavior: "smooth", block: "start" }); } }, h ? h.textContent : "");
        })),
        el("span.cds-barre-g", {},
          el("button.b.nu", { type: "button", onclick: function () {
            ecran.querySelectorAll("details.cds-d").forEach(function (x) { x.open = true; });
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
