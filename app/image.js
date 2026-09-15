/* image.js — les vignettes.
 *
 * Dans ce métier l'objet est l'image : un livrable sans visuel ne se juge pas.
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

  /* ————————————————————— Un livrable qui dure ————————————————————— */

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

  /* Le fichier qu'on regarde : le rendu de REVUE d'abord.
   *
   * C'est la règle du titulaire : le dépôt local porte les fichiers de
   * production, pour son usage privé ; les rendus compressés sont les
   * fichiers de revue. Servi ailleurs, le master n'est pas là — et c'est
   * voulu. On regarde donc la revue, et la production reste un lien vers le
   * master pour celui qui l'a sous la main. */
  function source(objet) {
    if (!objet) return null;
    if (estVideo(objet.review)) return objet.review;
    if (estVideo(objet.production)) return objet.production;
    return objet.review || objet.vignette || null;
  }

  /* Le médium d'un livrable, rendu comme il doit l'être. Rend aussi le nœud
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
  function vignette(objet, taille, attente) {
    var classe = "vignette v-" + (taille || "ligne");
    if (objet && objet.vignette) {
      return O.el("div." + classe.replace(/ /g, "."), {},
        O.el("img", { src: objet.vignette, alt: objet.nom || objet.titre || "" }));
    }

    /* Le vide n'est pas rien : c'est une attente, et une attente se nomme.
     * TRACE sait dire sous quel nom le fichier arrivera et ce qui manque pour
     * qu'il arrive ; passer `attente` à null impose le vide muet, pour les
     * écrans où l'image n'est qu'un ornement. */
    var a = attente === undefined
      ? (window.TRACE ? TRACE.attendu(objet) : null)
      : attente;

    if (!a) {
      return O.el("div." + classe.replace(/ /g, ".") + ".vide", {},
        O.el("span.absente", {}, "aucun visuel"));
    }
    return O.el("div." + classe.replace(/ /g, ".") + ".vide.attente", {},
      O.el("span.va-f" + (a.nomme ? "" : ".sans"), { title: a.fichier || "" },
        a.fichier || "nom de fichier non arrêté"),
      a.quoi ? O.el("span.va-q", { title: a.quoi }, a.quoi) : null);
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

  /* ————————————————————— Importer ce qui a été rendu ————————————————————— */

  /* Le geste le plus fréquent du poste, et le plus mal servi.
   *
   * Un fichier arrive — par mail, par WeTransfer, sur le Drive — et il faut
   * qu'il rejoigne son livrable. Jusqu'ici il fallait ouvrir le livrable,
   * ouvrir un panneau, choisir un type, TAPER le nom du fichier et TAPER son
   * chemin. Six champs pour dire « c'est arrivé ». Personne ne le fait, et
   * c'est ainsi qu'on lit « 0 fichier posé sur 225 livrables » — puis qu'on
   * relance quelqu'un qui avait livré.
   *
   * Ici on choisit le fichier, ou on le lâche sur la carte. Le reste se
   * déduit : le type depuis l'extension, le nom depuis le fichier, l'écart
   * depuis le tableau qui l'annonçait.
   *
   * Et la règle du produit tient : ce qui se REGARDE monte sur le disque et
   * devient le visuel de revue ; ce qui ne se regarde pas — un .ai, un .indd
   * de quatre cents mégaoctets — reste où il est, et seul son nom entre au
   * dossier. La base porte des liens, jamais les octets d'un master. */

  var REGARDABLES = { jpg: 1, jpeg: 1, png: 1, webp: 1, mp4: 1, webm: 1 };
  var PLAFOND_MO = 16;

  /* L'étage où ranger, déduit de l'extension. Ce n'est qu'une proposition :
   * elle est modifiable au dossier, et se tromper ne coûte rien. */
  var ETAGES = {
    psd: "ouvert", ai: "ouvert", indd: "ouvert", aep: "ouvert", prproj: "ouvert",
    idml: "ouvert", sketch: "ouvert", fig: "ouvert",
    pdf: "bat", eps: "bat",
    mp4: "asset", mov: "asset", webm: "asset", m4v: "asset",
  };

  function extension(nom) {
    var bouts = String(nom || "").split(".");
    return bouts.length > 1 ? bouts.pop().toLowerCase() : "";
  }

  function etageDe(ext) { return ETAGES[ext] || "asset"; }

  /* Deux noms qui désignent la même chose sans s'écrire pareil. Le tableau dit
   * « GOLD Spaghetti 500 gram », le fichier s'appelle
   * « gold-spaghetti-500g_V2.ai ». On ne compare donc pas les chaînes : on
   * compare les mots qui portent du sens, et on tolère qu'il en manque. */
  function proche(a, b) {
    if (!a || !b) return true;
    function mots(x) {
      return String(x).toLowerCase()
        .replace(/\.[a-z0-9]+$/, "")
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter(function (m) { return m.length > 2; });
    }
    var ma = mots(a), mb = mots(b);
    if (!ma.length || !mb.length) return true;
    var communs = ma.filter(function (m) { return mb.indexOf(m) !== -1; }).length;
    return communs * 2 >= Math.min(ma.length, mb.length);
  }

  /* Le geste, quel que soit son point d'entrée : le sélecteur, ou un fichier
   * lâché sur une carte. `apres(fichier)` reçoit l'entrée posée au dossier. */
  function accueillir(l, f, apres, muet) {
    if (!f) { if (apres) apres(false); return; }
    var ext = extension(f.name);
    var annonce = (l.releve || {}).fichier || null;
    var ecart = annonce && !proche(f.name, annonce)
      ? "  Le tableau annonçait « " + annonce + " » : les deux noms ne se ressemblent pas — "
        + "vérifie que c'est bien le même livrable."
      : "";

    function inscrire(chemin, visuel) {
      var fich = PRODUCTION.poser(l, etageDe(ext), f.name, chemin || "", "");
      if (visuel) {
        if (estVideo(chemin)) l.review = chemin; else l.vignette = chemin;
      }
      if (!muet) {
        DEPOT.enregistrer();
        AVIS.fait("« " + f.name + " » est au dossier de " + l.nom + "."
          + (visuel ? "  Il se regarde depuis la carte."
            : "  Le fichier reste où il est : seul son nom et son chemin entrent à la base.")
          + ecart);
      }
      if (apres) apres(fich || true);
    }

    /* Ce qui ne se regarde pas n'a rien à faire sur ce disque. */
    if (!REGARDABLES[ext]) { inscrire("", false); return; }

    if (f.size > PLAFOND_MO * 1024 * 1024) {
      AVIS.refus("« " + f.name + " » pèse " + Math.round(f.size / 1048576) + " Mo. "
        + "Au-delà de " + PLAFOND_MO + " Mo on ne monte pas le fichier : dépose un rendu "
        + "de revue plus léger, le master reste sur le Drive.");
      if (apres) apres(false);
      return;
    }

    var lecteur = new FileReader();
    lecteur.onerror = function () { AVIS.refus("Fichier illisible."); if (apres) apres(false); };
    lecteur.onload = function () {
      var donnee = String(lecteur.result);
      var chemin = "assets/review/livrables/" + l.id + "-" + O.id("f") + "." + ext;

      /* Une image de revue n'a pas à peser dix mégaoctets : on la réduit avant
       * de la poser, comme une vignette. Un film part tel quel — le réduire
       * serait juger le montage sur autre chose que ce qui a été monté. */
      if (ext === "mp4" || ext === "webm") { monter(chemin, donnee, inscrire, apres); return; }
      reduire(donnee, function (reduite) {
        if (!reduite) { AVIS.refus("Image illisible."); if (apres) apres(false); return; }
        monter(chemin.replace(/\.[a-z0-9]+$/, ".jpg"), reduite, inscrire, apres);
      });
    };
    lecteur.readAsDataURL(f);
  }

  function monter(chemin, donnee, apres, siRefus) {
    if (location.protocol === "file:" || !window.fetch) {
      AVIS.refus("L'application est ouverte par double-clic : elle ne peut rien écrire "
        + "sur le disque. Sers-la par « node servir.mjs » pour importer un fichier.");
      if (siRefus) siRefus(false);
      return;
    }
    fetch(chemin, { method: "PUT", headers: { "Content-Type": "text/plain" }, body: donnee })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("refus");
        apres(chemin, true);
      })
      .catch(function () {
        AVIS.refus("Le serveur n'a pas accepté le fichier. Vérifie que "
          + "« node servir.mjs » tourne — sans lui, rien ne s'écrit sur le disque.");
        if (siRefus) siRefus(false);
      });
  }

  /* Le sélecteur de fichier, pour un livrable. */
  function importer(l, apres) {
    var entree = document.createElement("input");
    entree.type = "file";
    entree.addEventListener("change", function () {
      accueillir(l, entree.files[0], apres);
    });
    entree.click();
  }

  /* Rendre un nœud capable de recevoir un fichier lâché dessus.
   *
   * C'est le raccourci qui rend l'import tenable : on n'ouvre rien, on tire le
   * fichier du Finder sur la carte du livrable. Le nœud le dit en le montrant
   * — sans retour visuel, personne ne devine qu'un dépôt est possible. */
  function accepterDepot(noeud, l, apres) {
    if (!noeud || !l) return noeud;
    noeud.setAttribute("data-depot", "1");
    noeud.addEventListener("dragover", function (e) {
      e.preventDefault(); e.stopPropagation();
      noeud.classList.add("survol-depot");
    });
    noeud.addEventListener("dragleave", function () { noeud.classList.remove("survol-depot"); });
    noeud.addEventListener("drop", function (e) {
      e.preventDefault(); e.stopPropagation();
      noeud.classList.remove("survol-depot");
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) accueillir(l, f, apres);
    });
    return noeud;
  }

  /* Le bouton, pour les écrans qui en veulent un. */
  function boutonImport(l, apres, libelle) {
    return O.el("button.b.or", { type: "button",
      onclick: function () { importer(l, apres); } },
      libelle || "Importer un fichier");
  }

  /* ————————————————————— Apparier un lot de fichiers ————————————————————— */

  /* Le geste qui remplace réellement le tableur.
   *
   * Un dossier de rendus arrive : soixante-et-onze fichiers pour cinquante-neuf
   * livrables. Les poser un par un, c'est cinquante-neuf allers-retours, donc
   * c'est ne pas les poser. Mais les poser tout seuls serait pire : deux noms
   * qui se ressemblent ne désignent pas le même produit, et un artwork rangé
   * sous le mauvais SKU s'imprime.
   *
   * On apparie donc, et on MONTRE l'appariement avant de l'exécuter. Trois
   * verdicts, jamais deux : sûr, hésite, aucun. Ce qui hésite se tranche à la
   * main, ce qui ne correspond à rien reste dehors et se voit.
   *
   * Le score n'est pas un pourcentage de lettres communes : « Gold Spaghetti
   * 500 » et « Gold Penne 500 » partagent deux mots sur trois et ne sont pas le
   * même produit. Ce qui distingue, c'est le mot RARE — « penne », « delys »,
   * « 250 ». Chaque mot pèse donc l'inverse de sa fréquence dans le lot : les
   * mots que tout le monde porte ne départagent personne. */

  /* Réglés par la maison, avec leur repli : ce sont des choix de calibration,
   * pas une propriété du métier. */
  var CAL = ((window.MAISON && MAISON.doctrine) || {}).appariement || {};
  var SEUIL = CAL.seuil === undefined ? 0.45 : CAL.seuil;  /* en dessous, on ne propose rien */
  var MARGE = CAL.marge === undefined ? 0.12 : CAL.marge;  /* deux candidats plus proches : on hésite */

  function mots(x) {
    return String(x || "").toLowerCase()
      .replace(/\.[a-z0-9]{2,5}$/, "")
      .replace(/[^a-z0-9àâäéèêëïîôöùûüçñ]+/g, " ")
      .split(" ")
      .filter(function (m) { return m.length > 1; });
  }

  /* Ce sous quoi un livrable se reconnaît : le nom que le tableau annonce
   * d'abord, le nom du livrable ensuite. Les deux comptent — le fichier peut
   * porter l'un ou l'autre. */
  function motsDe(l) {
    var a = mots((l.releve || {}).fichier);
    var b = mots(l.nom);
    var vus = {};
    return a.concat(b).filter(function (m) {
      if (vus[m]) return false; vus[m] = 1; return true;
    });
  }

  function apparier(livrables, fichiers) {
    var cand = (livrables || []).filter(function (l) { return !l.annule; })
      .map(function (l) { return { l: l, mots: motsDe(l) }; });
    if (!cand.length) {
      return (fichiers || []).map(function (f) {
        return { f: f, l: null, score: 0, etat: "aucun", autres: [] };
      });
    }

    /* La fréquence de chaque mot dans le lot des candidats. */
    var df = {};
    cand.forEach(function (c) {
      var vus = {};
      c.mots.forEach(function (m) { if (!vus[m]) { vus[m] = 1; df[m] = (df[m] || 0) + 1; } });
    });
    var N = cand.length;
    function poids(m) { return Math.log(N / (1 + (df[m] || 0))) + 1; }

    cand.forEach(function (c) {
      c.total = c.mots.reduce(function (t, m) { return t + poids(m); }, 0) || 1;
    });

    /* Le score se mesure dans les DEUX sens, et c'est ce qui l'a sauvé.
     *
     * Mesuré dans un seul — « quelle part du candidat le fichier contient-il »
     * — un candidat court devient un joker : trois livrables nommés « DELYS »
     * sans autre mot obtenaient 100 % sur n'importe quel fichier Delys, et
     * passaient devant le bon. Un mot contenu ne suffit donc pas : il faut
     * aussi que le fichier soit couvert par le candidat.
     *
     * On prend la moyenne harmonique des deux — sévère par construction, elle
     * ne pardonne pas qu'une des deux moitiés soit faible. Les mots du fichier
     * qu'aucun candidat ne porte (« v3 », « exe », « final ») sont du bruit de
     * nommage : ils ne comptent pas contre lui. */
    var vocabulaire = {};
    cand.forEach(function (c) { c.mots.forEach(function (m) { vocabulaire[m] = 1; }); });

    var resultats = (fichiers || []).map(function (f) {
      var mf = mots(f.name);
      var connus = mf.filter(function (m) { return vocabulaire[m]; });
      var totalF = connus.reduce(function (t, m) { return t + poids(m); }, 0) || 1;

      var scores = cand.map(function (c) {
        var gagne = 0;
        c.mots.forEach(function (m) { if (mf.indexOf(m) !== -1) gagne += poids(m); });
        var rappel = gagne / c.total;        /* le candidat est-il couvert */
        var precision = gagne / totalF;      /* le fichier est-il expliqué */
        var s = (rappel + precision) ? (2 * rappel * precision) / (rappel + precision) : 0;
        return { c: c, s: s };
      }).sort(function (a, b) { return b.s - a.s; });

      var premier = scores[0];
      var second = scores[1] || { s: 0 };
      var etat = premier.s < SEUIL ? "aucun"
        : (premier.s - second.s) < MARGE ? "hesite" : "sur";

      return { f: f, l: etat === "aucun" ? null : premier.c.l,
        score: premier.s, etat: etat,
        autres: scores.filter(function (x) { return x.s >= SEUIL * 0.6; })
          .slice(0, 5).map(function (x) { return { l: x.c.l, s: x.s }; }) };
    });

    /* Un livrable ne reçoit qu'un fichier par lot. Le mieux placé le garde ;
     * les suivants repassent en hésitation plutôt que d'écraser en silence. */
    var pris = {};
    resultats.slice().sort(function (a, b) { return b.score - a.score; })
      .forEach(function (r) {
        if (!r.l) return;
        if (pris[r.l.id]) { r.etat = "hesite"; return; }
        pris[r.l.id] = 1;
      });

    return resultats;
  }

  /* Poser un lot déjà tranché. `couples` = [{f, l}]. Les poses sont
   * séquentielles : le serveur écrit un fichier à la fois, et un compte-rendu
   * faux serait pire que pas de compte-rendu. */
  function poserLot(couples, apres) {
    var faits = 0, refuses = 0;
    var reste = (couples || []).filter(function (c) { return c.f && c.l; });

    function suivant() {
      if (!reste.length) {
        DEPOT.enregistrer();
        AVIS.fait(faits + (faits > 1 ? " fichiers sont" : " fichier est") + " au dossier"
          + (refuses ? ", " + refuses + " ont été refusés — ils restent à poser" : "") + ".");
        if (apres) apres({ faits: faits, refuses: refuses });
        return;
      }
      var c = reste.shift();
      accueillir(c.l, c.f, function (ok) {
        if (ok) faits++; else refuses++;
        suivant();
      }, true);
    }
    suivant();
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
   * livrables, mockups, pistes, packs, éléments de marque, moodboard. Les compter
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
    vignette: vignette, bouton: bouton, poids: poids, parcourir: parcourir,
    importer: importer, accueillir: accueillir, accepterDepot: accepterDepot,
    boutonImport: boutonImport, proche: proche, extension: extension,
    apparier: apparier, poserLot: poserLot, mots: mots };
})();
