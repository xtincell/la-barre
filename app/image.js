/* image.js — les vignettes.
 *
 * Dans ce métier l'objet est l'image : une pièce sans visuel ne se juge pas.
 * On stocke une vignette compressée, et le lien vers le master à côté — le
 * dépôt local ne doit jamais porter un fichier de production.
 *
 * Et la vignette elle-même ne vit plus dans le dépôt. Elle y a vécu, et le
 * fichier a fini à 5,15 Mo dont 4,78 d'images : 93 % du dépôt pour 0,31 Mo de
 * données métier. Un dépôt de cette taille sature le cache du navigateur, se
 * relit lentement, et se réécrit entièrement à chaque frappe.
 *
 * Une vignette est un fichier. Elle se range comme un fichier, dans
 * assets/review/vignettes/, à côté des packshots — et le dépôt n'en garde que
 * le chemin. C'est la même règle que pour les fichiers de production : le
 * dépôt porte des liens, pas des octets.
 */

window.IMAGE = (function () {
  var LARGEUR = 900;
  var QUALITE = 0.72;
  var DOSSIER = "assets/review/vignettes/";

  /* Ouvre le sélecteur, redimensionne, rend une donnée compacte. Cette donnée
   * sert à l'aperçu immédiat ; c'est « ranger » qui la pose sur le disque. */
  function choisir(apres) {
    var entree = document.createElement("input");
    entree.type = "file";
    entree.accept = "image/*";
    entree.addEventListener("change", function () {
      var f = entree.files[0];
      if (!f) return;
      var lecteur = new FileReader();
      lecteur.onload = function () { reduire(String(lecteur.result), apres); };
      lecteur.readAsDataURL(f);
    });
    entree.click();
  }

  function reduire(source, apres) {
    var img = new Image();
    img.onload = function () {
      var ratio = Math.min(1, LARGEUR / img.width);
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      var reduite = c.toDataURL("image/jpeg", QUALITE);
      apres(reduite, Math.round(reduite.length / 1024));
    };
    img.onerror = function () { apres(null, 0); };
    img.src = source;
  }

  /* ————————————————————— Le rangement sur disque ————————————————————— */

  /* Une valeur de vignette est soit un chemin de fichier, soit une donnée
   * base64 restée du temps où tout vivait dans le dépôt. Les deux s'affichent ;
   * une seule des deux est légère. */
  function estFichier(v) {
    return !!v && String(v).slice(0, 5) !== "data:";
  }

  /* Écrit la donnée dans assets/review/vignettes/ et rend son chemin.
   *
   * L'échec ne se rattrape pas en remettant l'image dans le dépôt : ce serait
   * refaire silencieusement ce qu'on vient de défaire. Il se dit. */
  function ranger(donnee, apres) {
    if (!donnee) { apres(null, "aucune image"); return; }
    if (estFichier(donnee)) { apres(donnee, null); return; }

    if (location.protocol === "file:" || !window.fetch) {
      apres(null, "l'application est ouverte par double-clic : elle ne peut rien "
        + "écrire sur le disque. Sers-la par « node servir.mjs » pour poser un visuel.");
      return;
    }

    var chemin = DOSSIER + O.id("vig") + ".jpg";
    fetch(chemin, { method: "PUT", headers: { "Content-Type": "text/plain" }, body: donnee })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("refus");
        apres(chemin, null);
      })
      .catch(function () {
        apres(null, "le serveur n'a pas accepté l'image. Vérifie que « node servir.mjs » "
          + "tourne — sans lui, rien ne s'écrit sur le disque.");
      });
  }

  /* Le geste complet : choisir, ranger, rendre le chemin. Les refus sont dits
   * ici, une fois, pour que chaque écran n'ait pas à les redire. */
  function poser(apres) {
    choisir(function (donnee, ko) {
      if (!donnee) { AVIS.refus("Image illisible."); return; }
      if (ko > 900) {
        AVIS.refus("Vignette trop lourde (" + ko + " Ko). Réduis l'image avant de la poser.");
        return;
      }
      ranger(donnee, function (chemin, refus) {
        if (!chemin) { AVIS.refus(refus); return; }
        apres(chemin);
      });
    });
  }

  /* ————————————————————— L'affichage ————————————————————— */

  /* ————————————————————— Une pièce qui dure ————————————————————— */

  /* Un film n'est pas une image.
   *
   * Le produit ne connaissait qu'un médium : la vignette, donc une balise
   * img. Une vidéo livrée s'affichait par son arrêt sur image, et rien ne
   * permettait de la regarder — on jugeait un film sur une photo.
   *
   * Deux choses en découlent, et la seconde compte plus que la première :
   * il faut un lecteur, et il faut pouvoir annoter À UN INSTANT. Un point
   * posé à 50 % / 50 % sur un film ne veut rien dire ; « à 0:12, la marque
   * arrive trop tard » veut dire quelque chose. */
  var VIDEOS = ["mp4", "mov", "webm", "m4v"];

  function estVideo(chemin) {
    if (!chemin) return false;
    var x = String(chemin).split("?")[0].split(".").pop().toLowerCase();
    return VIDEOS.indexOf(x) !== -1;
  }

  /* Le fichier qu'on regarde : la production quand elle est lisible par un
   * navigateur, la revue sinon, la vignette en dernier. */
  function source(objet) {
    if (!objet) return null;
    if (estVideo(objet.production)) return objet.production;
    if (estVideo(objet.review)) return objet.review;
    return objet.review || objet.vignette || null;
  }

  /* Le médium d'une pièce, rendu comme il doit l'être. Rend aussi le nœud
   * vidéo, pour que celui qui annote puisse lire son instant. */
  function media(objet, taille) {
    var classe = "vignette v-" + (taille || "ligne");
    var src = source(objet);
    if (src && estVideo(src)) {
      var v = O.el("video", { src: src, controls: "controls", preload: "metadata",
        playsinline: "playsinline" });
      if (objet.vignette && !estVideo(objet.vignette)) v.poster = objet.vignette;
      var boite = O.el("div." + classe.replace(/ /g, ".") + ".v-film", {}, v);
      boite.video = v;
      return boite;
    }
    return vignette(objet, taille);
  }

  /* La vignette d'un objet, ou son absence dite franchement.
   * Tailles : mini · case · ligne · carte · grande · toile. */
  function vignette(objet, taille) {
    var classe = "vignette v-" + (taille || "ligne");
    if (objet && objet.vignette) {
      return O.el("div." + classe.replace(/ /g, "."), {},
        O.el("img", { src: objet.vignette, alt: objet.nom || objet.titre || "" }));
    }
    return O.el("div." + classe.replace(/ /g, "."), {},
      O.el("span.absente", {}, "aucun visuel"));
  }

  /* Le bouton qui pose ou remplace une vignette. */
  function bouton(objet, apres) {
    return O.el("button.b", {
      type: "button",
      onclick: function () {
        poser(function (chemin) {
          objet.vignette = chemin;
          DEPOT.enregistrer();
          if (apres) apres();
        });
      },
    }, objet && objet.vignette ? "Remplacer le visuel" : "Poser un visuel");
  }

  /* ————————————————————— Ce qui pèse encore ————————————————————— */

  /* Ce que les vignettes coûtent au dépôt — c'est-à-dire ce qu'il en reste en
   * base64. Une vignette rangée en fichier ne pèse plus que son chemin, et
   * n'a plus à être comptée. Le nombre qui compte est donc celui du reliquat. */
  function poids() {
    var n = 0;
    var restantes = 0;
    parcourir(DEPOT.tout(), function (v) {
      if (estFichier(v)) return;
      restantes++;
      n += v.length;
    });
    return { ko: Math.round(n / 1024), restantes: restantes };
  }

  /* Toutes les valeurs de vignette du dépôt, où qu'elles soient rangées —
   * pièces, mockups, pistes, packs, éléments de marque, moodboard. Les compter
   * à la main par collection, c'est en oublier une à chaque nouvel objet. */
  function parcourir(racine, quand) {
    var vus = [];
    (function marche(o) {
      if (!o || typeof o !== "object" || vus.indexOf(o) !== -1) return;
      vus.push(o);
      if (Array.isArray(o)) { o.forEach(marche); return; }
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (k === "vignette" && typeof v === "string" && v) quand(v, o);
        else marche(v);
      });
    })(racine);
  }

  return { choisir: choisir, ranger: ranger, poser: poser, estFichier: estFichier,
    estVideo: estVideo, source: source, media: media,
    vignette: vignette, bouton: bouton, poids: poids, parcourir: parcourir };
})();
