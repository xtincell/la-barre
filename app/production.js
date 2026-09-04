/* production.js — la porte de production.
 *
 * Une route retenue n'ouvre pas la production. Ce qui l'ouvre, c'est le
 * fichier : le BAT signé et les sources ouvertes, rattachés à la pièce et à sa
 * version. Sans eux, on produit sur une image d'écran — et la mise en situation
 * montre quelque chose qui n'ira jamais chez l'imprimeur.
 *
 * Rien n'est empêché. Le prix est écrit.
 */

window.PRODUCTION = (function () {
  var el = O.el;

  /* Une production a quatre étages, et chacun sert à quelqu'un d'autre.
   * Les confondre, c'est envoyer un JPG à l'imprimeur ou faire valider un
   * mockup au lieu du fichier. */
  var TYPES = {
    asset: { rang: 0, nom: "L'asset", ext: "jpg · png · mp4",
      quoi: "le fichier plat, celui qu'on regarde et qu'on fait valider",
      pour: "le client, la revue",
      cout: "rien à montrer : la pièce n'existe qu'en tête" },
    bat: { rang: 1, nom: "Le BAT", ext: "psd · ai · indd · aep", signable: true,
      quoi: "le montage source, bon à tirer, signé et daté",
      pour: "l'imprimeur, le prestataire",
      cout: "aucune correction possible sans tout refaire, et l'erreur d'impression est pour l'agence" },
    simulation: { rang: 2, nom: "La simulation", ext: "jpg · png", f: true,
      quoi: "le rendu sur fond blanc, à l'échelle, avec ses repères",
      pour: "le contrôle technique avant remise",
      cout: "personne n'a vu la pièce à sa taille réelle" },
    storyboard: { rang: 0, nom: "Le storyboard", ext: "pdf · jpg",
      quoi: "le film raconté en planches — et une ébauche d'animation si le temps le permet",
      pour: "la présentation client, avant toute production",
      cout: "on présente un film que personne ne peut se représenter" },
    situation: { rang: 3, nom: "La mise en situation", ext: "jpg · png", f: true,
      quoi: "la pièce dans son support — un 4×3 en rue, une gondole en rayon",
      pour: "la présentation client",
      cout: "on fait valider un visuel que personne n'a vu à trois mètres" },
  };

  /* Un support ne demande pas les quatre étages. Un carré digital n'a pas de
   * BAT ; une tête de gondole en a un et se voit en rayon. */
  /* Ce qu'un support demande — et à quel stade. Un film au stade proposition
   * ne demande pas de master : il demande un storyboard. Confondre les deux,
   * c'est faire tourner une équipe sur une piste que personne n'a payée. */
  function exiges(l, rang) {
    var s = DEPOT.trouve("supports", l.support);
    var t = s ? s.type : "autre";
    var lourd = t === "film" || t === "motion3d" || t === "event";

    if (rang === undefined && window.PRIORITE) {
      var p = DEPOT.liste("projets").filter(function (x) {
        return (x.livrables || []).some(function (y) { return y.id === l.id; }); })[0];
      rang = p ? PRIORITE.rangPiece(p, l) : 3;
    }
    var avantSignature = rang >= 2;

    if (lourd) return avantSignature ? ["storyboard"] : ["storyboard", "asset", "bat"];
    if (t === "social" || t === "kv") return ["asset"];
    if (t === "goodies") return avantSignature ? ["asset"] : ["asset", "bat", "situation"];
    return avantSignature ? ["asset"] : ["asset", "bat", "simulation", "situation"];
  }

  function fichiers(l) { return (l.fichiers || []).slice(); }

  function de(l, type) {
    return fichiers(l).filter(function (f) { return f.type === type; });
  }

  /* Un fichier posé sur une version antérieure ne vaut plus pour celle-ci. */
  function perimes(l) {
    return fichiers(l).filter(function (f) { return (f.version || 1) < (l.version || 1); });
  }

  function poser(l, type, nom, emplacement, signataire) {
    if (!l.fichiers) l.fichiers = [];
    var f = { id: O.id("F"), type: type, nom: nom, emplacement: emplacement,
      signataire: signataire || null, quand: new Date().toISOString(),
      version: l.version || 1 };
    l.fichiers.push(f);
    return f;
  }

  function retirer(l, id) {
    l.fichiers = fichiers(l).filter(function (f) { return f.id !== id; });
  }

  /* ————————————————————— La porte ————————————————————— */

  /* Peut-on produire cette pièce ? Quatre conditions, et chacune dit son prix. */
  function porte(p, l) {
    var piste = (p.sections.pistes || []).filter(function (x) { return x.id === l.pisteId; })[0];
    var retenue = piste && piste.statut === "retenue";
    var besoin = exiges(l);
    var v = l.version || 1;
    var mks = (l.mockups || []).length;
    var mksLies = (l.mockups || []).filter(function (m) { return m.fichier; }).length;

    var out = [
      { quoi: "Route retenue", ok: !!retenue, poids: 5,
        cout: !piste ? "cette pièce n'est rattachée à aucune route : elle ne vient de nulle part"
          : "« " + (piste.titre || "la route") + " » n'a pas été arbitrée — produire ici, c'est parier" },
    ];

    besoin.forEach(function (t) {
      var def = TYPES[t];
      /* La mise en situation peut venir d'un mockup posé, pas seulement d'un fichier. */
      var faits = t === "situation"
        ? de(l, t).filter(function (f) { return (f.version || 1) === v; }).length + mks
        : de(l, t).filter(function (f) { return (f.version || 1) === v; }).length;
      out.push({ quoi: def.nom, ok: faits > 0, poids: def.signable ? 5 : 3, cout: def.cout });
    });

    if (mks) {
      out.push({ quoi: "Situations liées au fichier", ok: mksLies === mks, poids: 3,
        cout: (mks - mksLies) + (mks - mksLies > 1 ? " mockups ne pointent" : " mockup ne pointe")
          + " vers aucun fichier : ils montrent une image d'écran, pas ce qui part à l'impression" });
    }

    out.push({ quoi: "Rien de périmé", ok: perimes(l).length === 0, poids: 4,
      cout: perimes(l).length + " fichiers posés sur une version antérieure" });

    return out;
  }

  /* Où en est cette pièce sur les quatre étages. */
  function etages(l) {
    var v = l.version || 1;
    var besoin = exiges(l);
    return Object.keys(TYPES).map(function (t) {
      var fs = de(l, t).filter(function (f) { return (f.version || 1) === v; });
      var n = t === "situation" ? fs.length + (l.mockups || []).length : fs.length;
      return { cle: t, def: TYPES[t], exige: besoin.indexOf(t) !== -1, n: n,
        fichiers: fs, ok: n > 0 };
    });
  }

  function ouverte(p, l) {
    return porte(p, l).every(function (c) { return c.ok; });
  }

  /* Combien de pièces peuvent réellement partir. */
  function pretes(p) {
    return (p.livrables || []).filter(function (l) { return !l.annule && ouverte(p, l); }).length;
  }

  /* ————————————————————— Le bloc, sur la pièce ————————————————————— */

  function bloc(p, l, rafraichir) {
    var fs = fichiers(l);
    var vieux = perimes(l);

    return el("div", {},
      UI.recevabilite("Cette pièce peut-elle partir en production ?",
        porte(p, l), null,
        [{ nom: "Poser un fichier", fort: !fs.length, quand: function () { ajouter(p, l, rafraichir); } }]),

      vieux.length
        ? UI.banniere("rouge", vieux.length + (vieux.length > 1 ? " fichiers datent" : " fichier date")
            + " d'une version antérieure. Les envoyer, c'est imprimer ce qui a été corrigé.")
        : null,

      el("div.sousbloc", {},
        el("h3", {}, "LES FICHIERS", el("span.droite", {}, fs.length ? String(fs.length) : "aucun")),
        fs.length
          ? el("div", {}, fs.map(function (f) {
              var t = TYPES[f.type] || { nom: f.type };
              var mort = (f.version || 1) < (l.version || 1);
              return UI.fileItem(null, t.nom + " — " + f.nom,
                (f.emplacement || "emplacement non dit")
                + (f.signataire ? "  ·  signé par " + f.signataire : "")
                + "  ·  V" + (f.version || 1) + "  ·  " + O.joli(f.quand),
                mort ? UI.eti("périmé", "alerte") : null,
                function () {
                  if (!window.confirm("Retirer « " + f.nom + " » ?")) return;
                  retirer(l, f.id); DEPOT.enregistrer(); if (rafraichir) rafraichir();
                });
            }))
          : el("p.rien", {}, "Aucun fichier. La pièce existe à l'écran, pas en production.")
      )
    );
  }

  function ajouter(p, l, rafraichir) {
    var selT = el("select", {});
    Object.keys(TYPES).forEach(function (k) {
      selT.appendChild(el("option", { value: k }, TYPES[k].nom));
    });
    var aide = el("div.indice", {}, TYPES.ouvert.quoi);
    selT.addEventListener("change", function () { aide.textContent = TYPES[selT.value].quoi; });

    var champNom = el("input", { type: "text", placeholder: "Nom du fichier, conventionné" });
    var champLieu = el("input", { type: "text", placeholder: "Chemin sur le Drive, ou lien" });
    var champSig = el("input", { type: "text", placeholder: "Qui a signé — pour un BAT" });
    var selMk = el("select", {});
    selMk.appendChild(el("option", { value: "" }, "— ne lier à aucune mise en situation —"));
    (l.mockups || []).forEach(function (m) {
      selMk.appendChild(el("option", { value: m.id }, m.contexte || "mockup sans contexte"));
    });

    PANNEAU.sur("Poser un fichier", l.nom + " · V" + (l.version || 1), el("div", {},
      UI.banniere("", "Le fichier est rattaché à la version en cours. Le jour où la pièce repart en V" + ((l.version || 1) + 1) + ", il apparaîtra comme périmé — c'est ce qui évite d'envoyer à l'imprimeur ce qui a été corrigé."),
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Type"), selT, aide),
        el("div.champ", {}, el("label", {}, "Nom"), champNom),
        el("div.champ", {}, el("label", {}, "Où il est"),
          el("div.indice", {}, "Le dépôt local ne porte jamais un fichier de production : on garde le chemin."), champLieu),
        el("div.champ", {}, el("label", {}, "Signataire"), champSig),
        (l.mockups || []).length
          ? el("div.champ", {}, el("label", {}, "Lier à une mise en situation"),
              el("div.indice", {}, "Un mockup lié à son fichier montre ce qui partira réellement."), selMk)
          : null),
      el("div.form-actions", {},
        el("button.b.or", { type: "button", onclick: function () {
          if (!champNom.value.trim()) { AVIS.refus("Un fichier sans nom ne se retrouve pas."); return; }
          var f = poser(l, selT.value, champNom.value.trim(), champLieu.value.trim(), champSig.value.trim());
          if (selMk.value) {
            (l.mockups || []).forEach(function (m) { if (m.id === selMk.value) m.fichier = f.id; });
          }
          DEPOT.tracer("fichier", "production", p.id, l.nom + " — " + TYPES[selT.value].nom);
          DEPOT.enregistrer(); PANNEAU.fermerSur(); if (rafraichir) rafraichir();
        } }, "Poser"),
        el("button.b.nu", { type: "button", onclick: PANNEAU.fermerSur }, "Annuler"))
    ));
  }

  /* Toutes les pièces à produire, tous projets confondus. C'est le dénominateur
   * de la question « sur combien d'assets on travaille ». */
  function toutesLesPieces(projetId) {
    var out = [];
    DEPOT.liste("projets").forEach(function (p) {
      if (projetId && p.id !== projetId) return;
      (p.livrables || []).forEach(function (l) {
        if (!l.annule) out.push({ projet: p, l: l });
      });
    });
    return out;
  }

  return { TYPES: TYPES, exiges: exiges, etages: etages,
    fichiers: fichiers, de: de, perimes: perimes,
    poser: poser, retirer: retirer, porte: porte, ouverte: ouverte, pretes: pretes,
    toutesLesPieces: toutesLesPieces, bloc: bloc, ajouter: ajouter };
})();
