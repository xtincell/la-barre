/* partage.js — le lien unique de chaque document compilé, et le PDF de la présentation.
 *
 * Demande du titulaire (13/10/2026) : « les trois documents compilés de chaque
 * section n'ont pas de lien de partage unique — avec un bouton de téléchargement
 * du PDF de présentation ». Un document qu'on ne peut pas envoyer reste au
 * dossier : le client, l'imprimeur, celui qui reprend le dossier dans six mois
 * doivent pouvoir l'ouvrir d'un lien, sans LA BARRE autour.
 *
 *   p.partages = { cadrage | conception | production | presentation: { jeton, cree_le } }
 *   p.partagesRevoques = [{ doc, jeton, cree_le, revoque_le }]
 *   p.partagePdf = { chemin, quand, pages }   — posé par le serveur local
 *
 * Le jeton rend l'adresse impossible à deviner et révocable. Ce n'est pas un
 * secret fort : la base du site en ligne est lisible, et l'écran le dit.
 */

window.PARTAGE = (function () {
  var el = O.el;
  var EN_LIGNE = "https://labarre.powerupgraders.com/";
  var DOCS = ["cadrage", "conception", "production"];

  function jeton() {
    var a = new Uint8Array(12);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }

  function de(p, doc) { return ((p.partages || {})[doc]) || null; }

  function creer(p, doc) {
    p.partages = p.partages || {};
    if (!p.partages[doc]) p.partages[doc] = { jeton: jeton(), cree_le: new Date().toISOString() };
    DEPOT.tracer("partage", "projets", p.id, "lien de partage créé — " + doc);
    DEPOT.enregistrer();
    return p.partages[doc];
  }

  /* Révoquer ne supprime rien : l'ancien jeton reste écrit, daté, et ne mène plus nulle part. */
  function revoquer(p, doc) {
    var x = de(p, doc);
    if (!x) return;
    p.partagesRevoques = (p.partagesRevoques || []).concat([{ doc: doc, jeton: x.jeton, cree_le: x.cree_le, revoque_le: new Date().toISOString() }]);
    delete p.partages[doc];
    DEPOT.tracer("partage", "projets", p.id, "lien de partage révoqué — " + doc);
    DEPOT.enregistrer();
  }

  function lien(x) { return EN_LIGNE + "#/partage/" + x.jeton; }

  function trouver(j) {
    var out = null;
    DEPOT.liste("projets").forEach(function (p) {
      Object.keys(p.partages || {}).forEach(function (doc) {
        if (p.partages[doc] && p.partages[doc].jeton === j) out = { p: p, doc: doc };
      });
    });
    return out;
  }

  function nomDoc(doc) {
    return doc === "presentation" ? "Présentation" : COMPILATEUR.DOCS[doc].nom;
  }

  /* ————————————————————— Dans le dossier : le bloc de partage ————————————————————— */

  function bloc(p, rafraichir) {
    var pdf = p.partagePdf;
    var local = window.DISQUE && DISQUE.local;
    return el("section.pt-bloc", {},
      el("div.section-titre", {}, "Partager", el("span.taille", {}, "· un lien par document, et le PDF de la présentation")),
      el("div.pt-liste", {}, DOCS.map(function (doc) {
        var x = de(p, doc);
        return el("div.pt-l", {},
          el("div.pt-n", {}, el("b", {}, COMPILATEUR.DOCS[doc].nom),
            el("span", {}, x ? "lien créé le " + O.joli(String(x.cree_le).slice(0, 10)) : "pas encore de lien")),
          el("div.pt-g", {}, x ? [
            el("button.b", { type: "button", onclick: function () {
              copier(lien(x), "Le lien du " + COMPILATEUR.DOCS[doc].nom.toLowerCase()); } }, "Copier le lien"),
            el("a.b.nu", { href: "#/partage/" + x.jeton, target: "_blank", rel: "noopener" }, "Ouvrir"),
            el("button.b.nu", { type: "button", onclick: function () {
              if (confirm("Révoquer ce lien ? Ceux qui l'ont reçu ne pourront plus l'ouvrir.")) { revoquer(p, doc); rafraichir(); } } }, "Révoquer"),
          ] : el("button.b.or", { type: "button", onclick: function () { creer(p, doc); rafraichir(); } }, "Créer le lien")));
      })),
      el("div.pt-pdf", {},
        el("div.pt-n", {}, el("b", {}, "PDF de la présentation"),
          el("span", {}, pdf ? "généré le " + O.joli(String(pdf.quand).slice(0, 10)) + " à " + String(pdf.quand).slice(11, 16)
            + (pdf.pages ? " · " + pdf.pages + " pages" : "") : "pas encore généré")),
        el("div.pt-g", {},
          pdf ? el("a.b.nu", { href: pdf.chemin, download: nomPdf(p) }, "Télécharger") : null,
          window.EXPORT_PPTX ? EXPORT_PPTX.bouton(p) : null,
          local ? el("button.b" + (pdf ? "" : ".or"), { type: "button", onclick: function (e) { generer(p, e.target, rafraichir); } },
            pdf ? "Regénérer et publier" : "Générer et publier")
            : el("span.pt-q", {}, "Le PDF se génère depuis LA BARRE sur l'iMac."))),
      el("p.pt-q", {}, "Les liens s'ouvrent sans LA BARRE autour et proposent le PDF. Ils sont impossibles à deviner et révocables, "
        + "mais ce ne sont pas des secrets : la base du site en ligne est lisible. Le PDF suit la présentation du jour où il est généré. "
        + "Le PowerPoint sort les mêmes diapositives en objets éditables ; sur l'iMac, avec les images originales du disque, en ligne avec leurs aperçus."));
  }

  function nomPdf(p) {
    var i = p.sections.identite || {};
    return [i.client, p.nom, "Présentation"].filter(Boolean).join(" — ").replace(/[\/\\:]/g, "-") + ".pdf";
  }

  function copier(t, quoi) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
      .then(function () { AVIS.fait(quoi + " est copié."); })
      .catch(function () { prompt("Copier le lien :", t); });
  }

  /* Le PDF se rend par Chrome sur cette machine, puis part en ligne avec les
   * liens : c'est le serveur local qui le fait, la page n'a qu'à demander. */
  function generer(p, bouton, rafraichir) {
    if (!de(p, "presentation")) creer(p, "presentation");
    DOCS.forEach(function (d) { if (!de(p, d)) creer(p, d); });
    bouton.disabled = true; bouton.textContent = "Génération en cours…";
    DEPOT.enregistrer();
    setTimeout(function () {
      fetch("/partage-pdf", { method: "POST", headers: { "Content-Type": "application/json", "X-La-Barre": "1" },
        body: JSON.stringify({ projetId: p.id }) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.quoi || "échec");
          p.partagePdf = r.pdf;
          DEPOT.enregistrer();
          AVIS.fait("PDF généré (" + r.pdf.pages + " pages)" + (r.enLigne ? " et publié en ligne avec les liens." : ". La publication en ligne a échoué : " + r.erreurEnLigne));
          rafraichir();
        })
        .catch(function (e) { AVIS.refus("Le PDF n'a pas pu être généré : " + e.message); bouton.disabled = false; bouton.textContent = "Réessayer"; });
    }, 1500);
  }

  /* Chrome embarque chaque image du PDF à sa taille d'origine, même affichée en
   * vignette : le PDF de l'EOY 2026 pesait 7 Mo et ne passait plus en ligne.
   * Avant l'impression, chaque image est ramenée au double de sa taille affichée,
   * en JPEG. Le serveur attend `__pdfPret` avant d'imprimer. */
  function reduireImages(racine) {
    window.__pdfPret = false;
    setTimeout(function () {
      var imgs = Array.prototype.slice.call(racine.querySelectorAll("img"));
      var reste = imgs.length;
      function fini() { if (--reste <= 0) window.__pdfPret = true; }
      if (!reste) { window.__pdfPret = true; return; }
      imgs.forEach(function (im) {
        im.loading = "eager";
        function reduire() {
          try {
            var r = im.getBoundingClientRect();
            var cible = Math.max(r.width, r.height) * 2, plus = Math.max(im.naturalWidth, im.naturalHeight);
            if (!plus || !cible || plus <= cible * 1.2 || /\.png$/i.test(im.src) && /logo|montagne|vague/i.test(im.src)) return fini();
            var k = cible / plus, c = document.createElement("canvas");
            c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
            var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
            x.drawImage(im, 0, 0, c.width, c.height);
            im.onload = fini; im.onerror = fini;
            im.src = c.toDataURL("image/jpeg", 0.8);
          } catch (e) { fini(); }
        }
        if (im.complete && im.naturalWidth) reduire(); else { im.onload = reduire; im.onerror = fini; }
      });
    }, 300);
  }

  /* ————————————————————— La page partagée ————————————————————— */

  function page(conteneur, j, sous) {
    document.body.dataset.vue = "partage";
    var t = trouver(j);
    if (!t) {
      conteneur.appendChild(el("div.pt-page", {}, el("div.pt-vide", {},
        el("h1", {}, "Ce lien ne mène à rien"),
        el("p", {}, "Il a peut-être été révoqué, ou la page est encore en train de charger."))));
      return;
    }
    var p = t.p, d = VUE_PRESENTATION.pres(p);
    var pdf = p.partagePdf;

    /* La route d'impression : les diapositives seules, pour Chrome. */
    if (sous === "impression") {
      document.body.dataset.impression = "1";
      /* À l'impression, toutes les images se chargent : le chargement différé
       * attendrait un défilement qui n'aura jamais lieu. */
      setTimeout(function () { document.querySelectorAll("img[loading=lazy]").forEach(function (x) { x.loading = "eager"; }); }, 0);
      conteneur.appendChild(el("div.pt-impression", {}, d.pages.map(function (pg) {
        return el("div.pr-diapo", {}, VUE_PRESENTATION.page(p, pg));
      })));
      reduireImages(conteneur);
      return;
    }

    var i = p.sections.identite || {};
    var corps = t.doc === "presentation"
      ? el("div.prd-diapos", {}, d.pages.map(function (pg) { return el("div.pr-diapo", {}, VUE_PRESENTATION.page(p, pg)); }))
      : COMPILATEUR.document(COMPILATEUR.compiler(p, t.doc));

    conteneur.appendChild(el("div.pt-page", {},
      el("header.pt-tete", {},
        el("div.pt-tete-g", {},
          el("div.pt-doc", {}, nomDoc(t.doc)),
          el("h1", {}, p.nom),
          el("div.pt-meta", {}, [i.client, p.ref, "à jour au " + O.joli(new Date().toISOString())].filter(Boolean).join(" · "))),
        el("div.pt-tete-d", {},
          pdf ? el("a.b.or", { href: pdf.chemin, download: nomPdf(p) }, "Télécharger la présentation (PDF)")
            : el("span.pt-q", {}, "Le PDF de la présentation n'est pas encore publié."),
          el("button.b.nu", { type: "button", onclick: function () { window.print(); } }, "Imprimer ce document"))),
      el("main.pt-corps", {}, corps),
      el("footer.pt-pied", {}, "Document compilé par LA BARRE depuis le dossier " + (p.ref || "") + ".")));
  }

  return { DOCS: DOCS, creer: creer, revoquer: revoquer, lien: lien, trouver: trouver, bloc: bloc, page: page, de: de };
})();
