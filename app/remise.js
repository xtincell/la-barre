/* remise.js — le paquet qui part chez le client, et son manifeste.
 *
 * Le produit savait juger un livrable et le déclarer fini. Il ne savait pas
 * LE REMETTRE — et c'est le dernier mètre, celui où tout se perd.
 *
 * Un lancement international finit dans le DAM du client. Un fichier qui y
 * entre sans ses métadonnées y reste faux pendant des années : deux ans plus
 * tard, personne ne sait sur quel marché il a le droit de servir, jusqu'à
 * quand la cession court, ni quelle version fait autorité. On le réemploie,
 * et c'est l'incident.
 *
 * Ce module n'invente rien et ne demande aucune ressaisie : le livrable porte
 * son marché et son support, l'asset porte ses droits, le gabarit porte son
 * profil, la marque porte ses interdits. Le manifeste les rassemble, et
 * VÉRIFIE avant départ.
 *
 * Il ne bloque pas — comme les cinquante-cinq autres contrôles. Il dit ce que
 * le lot coûtera si on l'envoie tel quel.
 */

window.REMISE = (function () {
  var el = O.el;

  function texte(v) { return typeof v === "string" ? v.trim() : ""; }

  /* Un lien reste dans son système d'origine, avec les mêmes droits. */
  function urlPreuve(v) {
    var s = texte(v);
    if (!s || /[\u0000-\u001f\u007f]/.test(s)) return null;
    try {
      var u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password ? u.href : null;
    } catch (e) { return null; }
  }

  /* Un fichier déposé ici : la photo d'un BAT signé, la capture d'un accord
   * reçu par message, le PDF d'un bon de livraison (IMAGE.deposerPreuve). */
  function cheminPreuve(v) {
    var s = texte(v);
    return /^assets\/review\/preuves\/[A-Za-z0-9_-]+\.(jpe?g|png|webp|pdf)$/i.test(s) ? s : null;
  }

  /* Une date lue : jour valide du calendrier. L'écriture, elle, refuse aussi
   * l'avenir (dater). */
  function jourValide(s) {
    s = texte(s);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var d = new Date(s + "T00:00:00Z");
    return !isNaN(d) && d.toISOString().slice(0, 10) === s ? s : null;
  }

  /* Ce qui vaut preuve, d'un BAT comme d'une remise. Dans la vraie vie, un BAT
   * est souvent un « OK » sur WhatsApp ou la photo d'un bon signé, et le
   * fichier part par WeTransfer ou sur une clé : exiger un lien HTTPS, c'était
   * laisser la remise « à joindre » pour toujours. Trois formes, chacune
   * datée et attribuée par celui qui l'écrit :
   *   { type: "lien", url }                       un lien https ;
   *   { type: "fichier", chemin }                  une photo, une capture ou un PDF déposés ;
   *   { type: "declaration", texte, contact, date } « BAT reçu de X le D ».
   * Une preuve sans type est un lien : c'est la forme des reçus déjà écrits.
   * Rend la preuve normalisée, ou null. */
  function preuveValide(preuve) {
    if (!preuve || typeof preuve !== "object") return null;
    var type = preuve.type || "lien";
    if (type === "lien") {
      var url = urlPreuve(preuve.url);
      return url ? { type: "lien", url: url } : null;
    }
    if (type === "fichier") {
      var chemin = cheminPreuve(preuve.chemin);
      return chemin ? { type: "fichier", chemin: chemin } : null;
    }
    if (type === "declaration") {
      var contact = texte(preuve.contact), date = jourValide(preuve.date);
      return contact && date ? { type: "declaration", texte: texte(preuve.texte), contact: contact, date: date } : null;
    }
    return null;
  }

  function versionCourante(l) {
    var vs = l.versions || [];
    var v = vs[vs.length - 1];
    var n = Number(v && (v.n || v.numero));
    return Number.isSafeInteger(n) && n > 0 && !v.close_le && Number(l.version || n) === n
      ? { numero: n, objet: v } : null;
  }

  function batRequis(l) {
    return PRODUCTION.exiges(l, 1).indexOf("bat") !== -1;
  }

  function fichierDeVersion(f, n) { return Number(f.version || 1) === n; }

  /* Un BAT vaut signé quand on sait qui l'a accordé et ce qui le prouve : son
   * emplacement (les BAT déjà rattachés), une preuve valide, ou à défaut la
   * date de l'accord — le BAT déclaré, reçu oralement ou par message. */
  function batSigne(l, n) {
    return (l.fichiers || []).slice().reverse().find(function (f) {
      return f.type === "bat" && fichierDeVersion(f, n) && texte(f.nom) && texte(f.signataire)
        && (texte(f.emplacement) || preuveValide(f.preuve) || jourValide(f.signe_le));
    }) || null;
  }

  /* Le BAT posé à son étage (« Poser le BAT ») et que personne n'a encore dit
   * accordé : c'est lui que « Marquer comme livré » complète, au lieu d'en
   * écrire un second à côté. */
  function batEnAttente(l, n) {
    return (l.fichiers || []).slice().reverse().find(function (f) {
      return f.type === "bat" && fichierDeVersion(f, n) && texte(f.nom) && !texte(f.signataire);
    }) || null;
  }

  /* Un fichier que La Barre sert elle-même : un chemin relatif sous
   * assets/review/ (un BAT photographié et posé à son étage, par exemple). */
  function fichierServi(v) {
    var s = texte(v);
    return /^assets\/review\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.(jpe?g|png|webp|pdf)$/i.test(s) && s.indexOf("..") === -1 ? s : null;
  }

  /* Le fichier qui part : rattaché par son emplacement, ou déclaré par le
   * canal qui l'a porté (WeTransfer, Drive, clé…), lien facultatif. Un visuel
   * de revue compressé n'en est jamais un. */
  function fichiersSortie(l, n) {
    return (l.fichiers || []).filter(function (f) {
      var lieu = texte(f.emplacement);
      if (f.type !== "asset" || !fichierDeVersion(f, n) || !texte(f.nom)) return false;
      if (f.role === "sortie" && texte(f.canal)) return true;
      return !!lieu && (f.role === "sortie" || !/(^|\/)assets\/review\//i.test(lieu));
    });
  }

  function etatPiece(l) {
    var version = versionCourante(l);
    if (!version || version.objet.verdict !== "approuve")
      return { cle: "validation", nom: "Approbation attendue", version: version && version.numero };
    var bat = batSigne(l, version.numero);
    if (batRequis(l) && !bat)
      return { cle: "bat", nom: "BAT attendu", version: version.numero };
    var fichiers = fichiersSortie(l, version.numero);
    if (!fichiers.length)
      return { cle: "sortie", nom: "Fichiers à remettre", version: version.numero, bat: bat };
    return { cle: "preuve", nom: "Livraison à enregistrer", version: version.numero, bat: bat, fichiers: fichiers };
  }

  /* Une preuve décrit un instantané. Une autre version, un autre marché, un
   * autre signataire ou des fichiers remplacés ne réutilisent pas le reçu. */
  function empreintePiece(l, etat) {
    var v = versionCourante(l).objet;
    var fichiers = etat.fichiers.map(function (f) { return { id: f.id, nom: f.nom }; });
    /* Le canal et la preuve ne s'ajoutent qu'aux pièces qui les portent : les
     * reçus écrits avant eux gardent leur empreinte. */
    var identiteFichiers = etat.fichiers.map(function (f) {
      return JSON.stringify([f.id, f.nom, f.emplacement].concat(f.canal ? [f.canal] : []));
    }).sort();
    var bat = etat.bat ? [etat.bat.id, etat.bat.nom, etat.bat.signataire, etat.bat.emplacement, etat.bat.signe_le]
      .concat(etat.bat.preuve ? [preuveValide(etat.bat.preuve)] : []) : null;
    return {
      id: l.id, version: etat.version, marche: l.marche || null, support: l.support || null,
      empreinte: JSON.stringify([v.soumis_le, v.juge_le, bat, identiteFichiers]),
      nom: l.nom, fichiers: fichiers,
    };
  }

  function identique(a, b) {
    return !!a && !!b && a.id === b.id && a.version === b.version && a.marche === b.marche
      && a.support === b.support && a.empreinte === b.empreinte;
  }

  function preuves(p) { return Array.isArray(p.preuvesRemise) ? p.preuvesRemise : []; }

  function preuveCourante(p, l) {
    if (!p || !l || l.annule) return null;
    var e = etatPiece(l);
    if (e.cle !== "preuve") return null;
    var cible = empreintePiece(l, e);
    return preuves(p).slice().reverse().find(function (r) {
      return r && preuveValide(r.preuve) && Array.isArray(r.pieces)
        && r.pieces.some(function (x) { return identique(x, cible); });
    }) || null;
  }

  function enregistrementPermis() {
    return !(window.DEPOT.estDemonstration && DEPOT.estDemonstration());
  }

  function dater(s) {
    var j = jourValide(s);
    return j && j <= O.jour() ? j : null;
  }

  function relirePieces(projetId, cibles) {
    var p = DEPOT.trouve("projets", projetId);
    if (!p || p.fusionne || (window.CLOTURE && CLOTURE.est(p))) return null;
    var ls = cibles.map(function (cible) {
      var l = (p.livrables || []).find(function (x) { return x.id === cible.id && !x.annule; });
      if (!l) return null;
      var etat = etatPiece(l);
      return etat.cle === "preuve" && identique(empreintePiece(l, etat), cible) ? l : null;
    });
    return ls.every(Boolean) ? p : null;
  }

  function consigner(projetId, cibles, saisie) {
    if (!enregistrementPermis()) return { erreur: "La vitrine ne consigne pas de remise." };
    if (!Array.isArray(cibles) || !cibles.length
        || new Set(cibles.filter(Boolean).map(function (x) { return x.id; })).size !== cibles.length)
      return { erreur: "Choisissez au moins une version à remettre, une seule fois par livrable." };
    var p = relirePieces(projetId, cibles);
    if (!p) return { erreur: "La sélection a changé. Relisez les versions et leurs BAT avant de continuer." };
    if (p.refDemandee) return { erreur: "La référence du projet est encore provisoire." };
    var personne = texte(saisie.destinataire);
    var quand = dater(texte(saisie.quand));
    if (!personne || !quand)
      return { erreur: "Indiquez à qui la livraison a été remise, et une date passée ou du jour." };
    /* La preuve : un lien, un fichier déposé, ou la déclaration de la remise
     * elle-même (« remis à X le D »). L'ancienne saisie (`url`) reste un lien. */
    var brute = saisie.preuve || (saisie.url !== undefined ? { type: "lien", url: saisie.url } : null);
    if (brute && brute.type === "declaration")
      brute = Object.assign({}, brute, { contact: brute.contact || personne, date: brute.date || quand });
    var preuve = preuveValide(brute);
    if (!preuve)
      return { erreur: "Le justificatif doit être un lien HTTPS, une photo ou un PDF déposés, ou la remise déclarée." };
    var nom = texte(saisie.nom) || (preuve.type === "declaration" ? "Remise déclarée" : "Justificatif de remise");
    var cle = JSON.stringify(preuve);
    var doublon = preuves(p).find(function (r) {
      return r && JSON.stringify(preuveValide(r.preuve)) === cle && r.destinataire === personne && r.remis_le === quand
        && Array.isArray(r.pieces) && r.pieces.length === cibles.length
        && cibles.every(function (x) { return r.pieces.some(function (y) { return identique(x, y); }); });
    });
    if (doublon) return { recu: doublon, deja: true };

    var id = O.identifiantUnique("REM", function (x) {
      return preuves(p).some(function (r) { return r.id === x; });
    });
    if (!id) return { erreur: "Impossible d’attribuer une référence à la remise. Réessayez." };
    var recu = { id: id, remis_le: quand, destinataire: personne, preuve: Object.assign({ nom: nom }, preuve),
      pieces: cibles.map(function (x) { return Object.assign({}, x); }),
      quand: new Date().toISOString(), acteur: window.ACTEUR ? ACTEUR.trace() : null };
    p.preuvesRemise = preuves(p).concat(recu);
    DEPOT.tracer("preuve de remise", "projets", p.id, recu.id + " · " + cibles.length + " version(s)");
    DEPOT.enregistrer();
    return { recu: recu, deja: false };
  }

  /* La convention de nommage vit chez le client : chaque DAM a la sienne, et
   * la deviner est la meilleure façon de faire rejeter un lot entier. */
  function convention(clientId) {
    var c = clientId ? DEPOT.trouve("clients", clientId) : null;
    return (c && c.nommage) || null;
  }

  /* Le nom qu'un fichier devrait porter, selon la convention du client.
   * Les jetons sont ceux qu'un DAM demande toujours : la marque, la campagne,
   * le marché, le support, la langue, la version. */
  function nomAttendu(p, l, conv) {
    if (!conv) return null;
    var ident = (p.sections || {}).identite || {};
    var mq = DEPOT.trouve("marques", l.marqueId || (ident.marqueIds || [])[0]);
    var ma = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var su = l.support ? DEPOT.trouve("supports", l.support) : null;
    var cmp = window.CAMPAGNE && p.campagneId ? CAMPAGNE.de(p.campagneId) : null;
    var jetons = {
      marque: mq ? O.normalise(mq.nom).replace(/[^a-z0-9]+/g, "-") : "marque",
      campagne: O.normalise((cmp && cmp.nom) || p.nom).replace(/[^a-z0-9]+/g, "-").slice(0, 32),
      marche: ma ? ma.code : "xx",
      support: su ? (su.code || O.normalise(su.nom).replace(/[^a-z0-9]+/g, "-")) : "support",
      langue: (l.kv && l.kv.langue) || (ma && (ma.langues || [])[0]) || "fr",
      version: "v" + (l.version || 1),
    };
    return String(conv).replace(/\{(\w+)\}/g, function (_, k) {
      return jetons[k] !== undefined ? jetons[k] : "{" + k + "}";
    });
  }

  /* ————————————————————— Ce qui se vérifie avant départ ————————————————————— */

  /* Les droits, au lot. `REGLES.droitsInsuffisants` fait déjà la pièce : on
   * l'appelle plutôt que de le réécrire, et on ajoute la seule chose qu'il ne
   * regarde pas — la cession qui expire APRÈS la publication mais avant la fin
   * de la fenêtre de diffusion du projet. */
  function droits(p, l) {
    var out = [];
    var msg = window.REGLES ? REGLES.droitsInsuffisants(l) : null;
    if (msg) out.push(msg);
    var fin = ((p.sections || {}).identite || {}).echeance;
    (l.assets || []).forEach(function (aid) {
      var a = DEPOT.trouve("assets", aid);
      var d = a && a.droits;
      if (!d) return;
      if (d.expire && fin && new Date(d.expire) < new Date(fin)) {
        out.push("« " + a.nom + " » : la cession expire le " + O.jourCourt(d.expire)
          + ", avant la fin de la fenêtre du projet");
      }
      if (!d.zones || !d.zones.length) {
        out.push("« " + a.nom + " » ne déclare aucune zone de droits");
      }
    });
    return out;
  }

  /* Les mentions obligatoires. Elles vivent sur le marché, et — c'est l'axe qui
   * manquait — sur le couple SECTEUR × marché. L'abus d'alcool, l'âge légal,
   * l'interdiction d'associer à la conduite ne sont pas les mêmes d'un pays à
   * l'autre, et c'est exactement ce qui se découvre à l'impression. */
  function mentions(p, l) {
    if (!l.marche) return [];
    var ma = DEPOT.trouve("marches", l.marche);
    if (!ma) return [];
    var ident = (p.sections || {}).identite || {};
    var mq = DEPOT.trouve("marques", l.marqueId || (ident.marqueIds || [])[0]);
    var secteur = mq && mq.secteur ? mq.secteur : null;

    var dues = (ma.mentions || []).slice();
    var parSecteur = (ma.mentionsSecteur || {});
    if (secteur) {
      Object.keys(parSecteur).forEach(function (k) {
        if (O.contient(secteur, k)) dues = dues.concat(parSecteur[k] || []);
      });
    }
    var portees = (l.kv && l.kv.mentions) || [];
    return dues.filter(function (m) { return portees.indexOf(m) === -1; });
  }

  /* Le manifeste d'une pièce : ce que le DAM doit recevoir avec le fichier. */
  function piece(p, l) {
    var ident = (p.sections || {}).identite || {};
    var conv = convention(ident.clientId);
    var ma = l.marche ? DEPOT.trouve("marches", l.marche) : null;
    var su = l.support ? DEPOT.trouve("supports", l.support) : null;
    var cmp = window.CAMPAGNE && p.campagneId ? CAMPAGNE.de(p.campagneId) : null;
    var mq = DEPOT.trouve("marques", l.marqueId || (ident.marqueIds || [])[0]);

    var manques = [];
    if (conv && !nomAttendu(p, l, conv)) manques.push("nommage");
    if (!l.marche) manques.push("marché non déclaré");
    if (!l.support) manques.push("support non déclaré");
    var dr = droits(p, l);
    var me = mentions(p, l);
    var suivi = etatPiece(l);
    var physique = suivi.cle === "preuve";
    var conformite = !manques.length && !dr.length && !me.length;

    return {
      livrable: l,
      nom: nomAttendu(p, l, conv),
      marque: mq ? mq.nom : null,
      campagne: cmp ? cmp.nom : null,
      marche: ma ? ma.nom : null,
      support: su ? su.nom : null,
      langue: (l.kv && l.kv.langue) || (ma && (ma.langues || [])[0]) || null,
      version: suivi.version || l.version || 1,
      droits: (l.assets || []).map(function (aid) {
        var a = DEPOT.trouve("assets", aid);
        if (!a) return null;
        var d = a.droits || {};
        return { asset: a.nom, zones: d.zones || [], expire: d.expire || null,
          cession: d.cession || null };
      }).filter(Boolean),
      manques: manques, alertesDroits: dr, mentionsManquantes: me,
      physique: physique, conformite: conformite, suivi: suivi.nom,
      pret: physique && conformite,
    };
  }

  /* Le lot : ce qui est prêt à partir, et ce qui ne l'est pas. On ne remet que
   * ce qui a passé son verdict — remettre un livrable non validé, c'est
   * envoyer au client ce qu'on n'a pas encore accepté soi-même. */
  function lot(p) {
    var livrables = (p.livrables || []).filter(function (l) {
      return !l.annule && etatPiece(l).cle !== "validation";
    });
    var pieces = livrables.map(function (l) { return piece(p, l); });
    return {
      pieces: pieces,
      prets: pieces.filter(function (x) { return x.pret; }).length,
      physiques: pieces.filter(function (x) { return x.physique; }).length,
      conformes: pieces.filter(function (x) { return x.conformite; }).length,
      total: pieces.length,
      convention: convention(((p.sections || {}).identite || {}).clientId),
    };
  }

  function etat(p) {
    var L = lot(p);
    if (!L.total) {
      return { cle: "rien", nom: "rien à remettre", ton: "terne",
        quoi: "Aucun livrable approuvé. La remise vient après le verdict, pas avant." };
    }
    if (L.physiques !== L.total) return { cle: "incomplet", nom: L.physiques + " / " + L.total + " fichiers prêts",
      ton: "attente", quoi: "Vérifiez le BAT et le fichier final de chaque version avant la remise." };
    if (!L.convention) {
      return { cle: "sansconv", nom: L.total + " prêts à nommer", ton: "attente",
        quoi: "Le client n'a pas de convention de nommage au référentiel. Chaque DAM a "
          + "la sienne, et la deviner est la meilleure façon de faire rejeter un lot." };
    }
    var reste = L.total - L.prets;
    if (reste) {
      return { cle: "incomplet", nom: L.prets + " / " + L.total, ton: "alerte",
        quoi: reste > 1
          ? reste + " pièces partiraient sans leurs droits, leurs mentions ou leur nommage : "
            + "au réemploi dans deux ans, personne ne saura ce qu'on a le droit d'en faire."
          : "Une pièce partirait sans ses droits, ses mentions ou son nommage : "
            + "au réemploi dans deux ans, personne ne saura ce qu'on a le droit d'en faire." };
    }
    return { cle: "pret", nom: L.total + " pièces", ton: "vert",
      quoi: "Le lot porte ses droits, ses mentions et son nommage." };
  }

  function lienExterne(url, libelle) {
    var href = urlPreuve(url);
    return href ? el("a.b", { href: href, target: "_blank", rel: "noopener noreferrer" }, libelle) : null;
  }

  /* Ce qu'une preuve montre : un lien qui s'ouvre, un fichier déposé qui
   * s'ouvre, ou les mots de la déclaration (qui et quand sont dits à côté). */
  function lienPreuve(preuve, libelle) {
    var x = preuveValide(preuve);
    if (!x) return null;
    if (x.type === "lien") return lienExterne(x.url, libelle);
    if (x.type === "fichier") return lienFichier(x.chemin, libelle);
    return el("span", {}, x.texte ? "Déclaré : « " + x.texte + " »" : "Déclaré, sans pièce jointe");
  }

  function lienFichier(chemin, libelle) {
    return el("a.b", { href: chemin, target: "_blank", rel: "noopener" }, libelle);
  }

  function champ(form, cle, titre, type, valeur, options) {
    options = options || {};
    var id = form + "-" + cle;
    if (type === "file") return fichierJoint(id, cle, titre, options);
    var entree = type === "choix"
      ? el("select", { id: id, name: cle, required: !options.facultatif },
          [el("option", { value: "" }, "Choisir…")].concat(options.choix.map(function (c) { return el("option", { value: c }, c); })))
      : el("input", { id: id, name: cle, type: type || "text", required: !options.facultatif,
          value: valeur || "", max: type === "date" ? O.jour() : null,
          placeholder: options.exemple || null });
    return el("div.champ", {}, el("label", { for: id }, titre,
      options.facultatif ? el("span.remise-facultatif", {}, " (facultatif)") : null), entree);
  }

  /* Le sélecteur natif disait « Choisir un fichier · Aucun fichier choisi »,
   * coupé sur téléphone. Le champ reste un vrai champ fichier, hors de la vue
   * mais au clavier ; son étiquette est le bouton qu'on touche, et le nom du
   * fichier choisi s'écrit à côté. */
  function fichierJoint(id, cle, titre, options) {
    var nom = el("span.remise-joint-nom", { "aria-live": "polite" }, "");
    var entree = el("input.remise-joint-entree", { id: id, name: cle, type: "file", accept: options.accept || null,
      onchange: function () {
        var f = entree.files && entree.files[0];
        nom.textContent = f ? f.name : "";
      } });
    return el("div.champ.remise-joint", {}, entree, el("label.b", { for: id }, titre), nom);
  }

  /* Ce qui est facultatif se replie : le panneau ne montre d'abord que ce qui
   * est demandé, et le bouton d'envoi reste à portée de pouce. */
  function repli(titre, enfants) {
    return el("details.remise-joindre", {}, el("summary", {}, titre), el("div.remise-joindre-corps", {}, enfants));
  }

  /* Un formulaire de remise. `valider` rend un résultat, ou une promesse
   * quand une pièce jointe doit d'abord monter sur le disque. */
  function formulaire(titre, sous, enfants, valider, apres, libelles) {
    libelles = libelles || {};
    var avecPanneau = !!document.querySelector(".panneau[role='dialog']");
    var fermer = avecPanneau ? PANNEAU.fermerSur : PANNEAU.fermer;
    var statut = el("p.remise-erreur", { role: "alert" }, "");
    var envoi = el("button.b.or", { type: "submit" }, libelles.action || "Enregistrer");
    var form = el("form.form.remise-form", { onsubmit: function (e) {
      e.preventDefault();
      if (envoi.disabled) return;
      statut.textContent = "";
      envoi.disabled = true;
      Promise.resolve(valider(new FormData(form), form)).then(function (res) {
        envoi.disabled = false;
        if (res.erreur) { statut.textContent = res.erreur; return; }
        fermer();
        if (apres) apres();
        suiviSauvegarde(res.deja ? "Cette livraison est déjà enregistrée." : libelles.fait || "Livraison enregistrée.");
      }, function () {
        envoi.disabled = false;
        statut.textContent = "Rien n’a été enregistré. Réessayez ; si cela persiste, prévenez la personne qui gère La Barre.";
      });
    } }, enfants, statut,
      el("div.form-actions", {}, envoi,
        el("button.b.nu", { type: "button", onclick: fermer }, "Annuler")));
    (avecPanneau ? PANNEAU.sur : PANNEAU.ouvrir)(titre, sous, form);
  }

  function suiviSauvegarde(message) {
    if (DEPOT.peutEcrire()) {
      AVIS.fait(message + " Dans ce navigateur.");
      return;
    }
    DEPOT.ecrireSurDisque(function (ok) {
      if (ok) {
        document.querySelectorAll(".remise-ecriture").forEach(function (ligne) { ligne.remove(); });
        AVIS.fait(message + " Sauvegarde reçue.");
      }
      else AVIS.refus("La livraison reste dans le brouillon. Réessayez depuis l’état de la sauvegarde.");
    });
  }

  /* ————————————————————— Le geste : marquer comme livré —————————————————————
   *
   * Trois formulaires successifs (joindre le BAT, rattacher le fichier final,
   * consigner la remise), dix champs obligatoires et trois liens HTTPS : c'était
   * incompatible avec un BAT accordé sur WhatsApp ou des fichiers partis par
   * WeTransfer. Un seul geste, qui ne demande que ce qui manque à la pièce :
   * qui a accordé le BAT et quand, par où les fichiers sont partis, à qui ils
   * ont été remis et quand. Chaque pièce jointe est facultative — une photo, une
   * capture, un PDF ou un lien ; sans elle, la déclaration fait foi, datée et
   * signée de celui qui l'écrit. */

  var CANAUX = ["WeTransfer", "Drive", "Clé USB", "Courriel", "WhatsApp", "Autre"];
  var PAR = { "WeTransfer": "par WeTransfer", "Drive": "par le Drive", "Clé USB": "sur clé USB",
    "Courriel": "par courriel", "WhatsApp": "par WhatsApp" };
  function envoi(canal) { return PAR[canal] ? "Fichiers envoyés " + PAR[canal] : ""; }

  /* Une pièce jointe facultative : un fichier déposé, ou un lien. Les noms
   * diffèrent d'un bloc à l'autre : un lecteur d'écran qui parcourt les
   * champs n'entend pas deux fois la même chose. */
  function pieceJointe(form, prefixe, quoi) {
    return [
      champ(form, prefixe + "-fichier", "Photo ou PDF " + quoi, "file", null, { facultatif: true, accept: "image/*,application/pdf" }),
      champ(form, prefixe + "-lien", "Lien " + quoi, "url", null, { facultatif: true, exemple: "https://…" }),
    ];
  }

  /* Monte la pièce jointe si elle existe et rend la preuve : fichier, lien,
   * ou la déclaration donnée. Rend { erreur } si le lien est invalide ou si
   * le dépôt échoue. */
  function preuveSaisie(data, prefixe, declaration) {
    var fichier = data.get(prefixe + "-fichier");
    var lien = texte(data.get(prefixe + "-lien"));
    if (fichier && fichier.size) {
      return new Promise(function (resoudre) {
        IMAGE.deposerPreuve(fichier, function (chemin) {
          resoudre(chemin ? { preuve: { type: "fichier", chemin: chemin }, nom: fichier.name }
            : { erreur: "La pièce jointe n’a pas été déposée : rien n’a été enregistré." });
        });
      });
    }
    if (lien) {
      return Promise.resolve(urlPreuve(lien) ? { preuve: { type: "lien", url: urlPreuve(lien) } }
        : { erreur: "Le lien doit commencer par https://, ou laissez-le vide." });
    }
    return Promise.resolve({ preuve: declaration });
  }

  /* La pièce telle qu'elle est maintenant au dossier, si elle n'a pas changé
   * de version depuis l'ouverture du formulaire. */
  function relire(p, l, v) {
    var projet = DEPOT.trouve("projets", p.id);
    var courant = projet && !projet.fusionne && !(window.CLOTURE && CLOTURE.est(projet))
      ? (projet.livrables || []).find(function (x) { return x.id === l.id && !x.annule; }) : null;
    var vc = courant && versionCourante(courant);
    return enregistrementPermis() && vc && vc.numero === v.numero && vc.objet === v.objet
      ? { projet: projet, l: courant, v: vc } : null;
  }

  /* Les champs de la remise, les mêmes pour une pièce et pour un lot. */
  function blocRemise(f) {
    return el("fieldset.remise-bloc", {}, el("legend", {}, "La remise"),
      champ(f, "destinataire", "Remis à", "text", null, { exemple: "Qui a reçu" }),
      champ(f, "remis-le", "Date de remise", "date", O.jour()),
      repli("Joindre un justificatif : photo, PDF ou lien", pieceJointe(f, "remise", "du justificatif")));
  }

  function marquerLivre(p, l, apres, options) {
    options = options || {};
    if (!enregistrementPermis()) return;
    var v = versionCourante(l);
    var depart = etatPiece(l);
    if (!v || ["bat", "sortie", "preuve"].indexOf(depart.cle) === -1) return;
    var batSeul = !!options.batSeul && depart.cle === "bat";
    if (!batSeul && !DEPOT.exigerReference(p, "La livraison")) return;
    var demandeBat = depart.cle === "bat";
    var demandeSortie = !batSeul && !fichiersSortie(l, v.numero).length;
    var pose = demandeBat ? batEnAttente(l, v.numero) : null;
    var f = "livre";
    var enfants = [
      demandeBat ? el("fieldset.remise-bloc", {}, el("legend", {}, "Le BAT de la V" + v.numero),
        pose ? el("p.remise-note", {}, "« " + pose.nom + " » est déjà posé : il devient le BAT accordé.") : null,
        champ(f, "bat-par", "BAT accordé par", "text", null, { exemple: "Nom ou imprimeur" }),
        champ(f, "bat-le", "Date du BAT", "date", O.jour()),
        repli(pose ? "Ajouter une photo, un PDF, un lien ou un mot" : "Joindre une photo, un PDF, un lien ou un mot", [
          champ(f, "bat-comment", "Comment", "text", null, { facultatif: true, exemple: "OK WhatsApp, bon signé…" }),
          pieceJointe(f, "bat", "du BAT")])) : null,
      demandeSortie ? el("fieldset.remise-bloc", {}, el("legend", {}, "Les fichiers remis"),
        champ(f, "canal", "Moyen d’envoi", "choix", null, { choix: CANAUX }),
        repli("Ajouter le lien de téléchargement",
          champ(f, "sortie-lien", "Lien de téléchargement", "url", null, { facultatif: true, exemple: "https://…" }))) : null,
      batSeul ? null : blocRemise(f),
    ];
    formulaire(batSeul ? "Enregistrer le BAT" : "Marquer comme livré", (window.KV && KV.titre ? KV.titre(l) : l.nom) + " · V" + v.numero,
      enfants, function (data) {
        var ici = relire(p, l, v);
        if (!ici || etatPiece(ici.l).cle !== depart.cle)
          return { erreur: "La version ou ses fichiers ont changé. Rouvrez la pièce." };
        var par = texte(data.get("bat-par")), batLe = dater(texte(data.get("bat-le")));
        var canal = texte(data.get("canal")), lienSortie = texte(data.get("sortie-lien"));
        var destinataire = texte(data.get("destinataire")), remisLe = dater(texte(data.get("remis-le")));
        if (demandeBat && (!par || !batLe)) return { erreur: "Dites qui a accordé le BAT, et une date passée ou du jour." };
        if (demandeSortie && CANAUX.indexOf(canal) === -1) return { erreur: "Dites par où les fichiers sont partis." };
        if (demandeSortie && lienSortie && !urlPreuve(lienSortie))
          return { erreur: "Le lien de téléchargement doit commencer par https://, ou laissez-le vide." };
        if (!batSeul && (!destinataire || !remisLe))
          return { erreur: "Dites à qui la livraison a été remise, et une date passée ou du jour." };
        var comment = texte(data.get("bat-comment"));
        var batDeclare = { type: "declaration", texte: comment, contact: par, date: batLe };
        return (demandeBat ? preuveSaisie(data, "bat", batDeclare) : Promise.resolve({}))
          .then(function (bat) {
            if (bat.erreur) return bat;
            return (batSeul ? Promise.resolve({}) : preuveSaisie(data, "remise",
              { type: "declaration", texte: envoi(canal), contact: destinataire, date: remisLe }))
              .then(function (remise) {
                if (remise.erreur) return remise;
                /* Après le dépôt, la pièce a pu bouger : on relit avant d'écrire. */
                var la = relire(p, l, v);
                if (!la || etatPiece(la.l).cle !== depart.cle)
                  return { erreur: "La version ou ses fichiers ont changé pendant l’envoi. Rouvrez la pièce." };
                var trace = window.ACTEUR ? ACTEUR.trace() : null;
                if (demandeBat) {
                  var preuveBat = preuveValide(bat.preuve);
                  /* Le BAT déjà posé à son étage est complété ; sinon on l'écrit. */
                  var fb = batEnAttente(la.l, v.numero);
                  if (fb) fb.signataire = par;
                  else fb = PRODUCTION.poser(la.l, "bat", bat.nom || (preuveBat.type === "declaration"
                    ? "BAT déclaré" : "BAT signé · V" + v.numero),
                    preuveBat.type === "lien" ? preuveBat.url : preuveBat.type === "fichier" ? preuveBat.chemin : "", par);
                  fb.version = v.numero; fb.signe_le = batLe; fb.preuve = preuveBat; fb.acteur = trace;
                  DEPOT.tracer("BAT signé", "livrables", la.l.id, la.projet.id + " · V" + v.numero + " · " + fb.id);
                }
                if (demandeSortie) {
                  var fs = PRODUCTION.poser(la.l, "asset", "Fichiers finaux · V" + v.numero, urlPreuve(lienSortie) || "");
                  fs.version = v.numero; fs.role = "sortie"; fs.canal = canal; fs.acteur = trace;
                  DEPOT.tracer("fichier à remettre", "livrables", la.l.id, la.projet.id + " · V" + v.numero + " · " + fs.id);
                }
                if (batSeul) { DEPOT.enregistrer(); return { ok: true }; }
                var e = etatPiece(la.l);
                if (e.cle !== "preuve") { DEPOT.enregistrer(); return { erreur: "La pièce n’est pas prête à être remise : " + e.nom + "." }; }
                var recu = consigner(la.projet.id, [empreintePiece(la.l, e)], { nom: remise.nom, destinataire: destinataire,
                  quand: remisLe, preuve: remise.preuve });
                /* Le BAT et les fichiers posés restent vrais même si la remise est refusée. */
                if (recu.erreur) DEPOT.enregistrer();
                return recu;
              });
          });
      }, apres, { action: batSeul ? "Enregistrer le BAT" : "Marquer comme livré",
        fait: batSeul ? "BAT enregistré." : "Livraison enregistrée." });
  }

  /* Le même geste pour un lot : les pièces prêtes à partir, une seule remise. */
  function ouvrirPreuve(p, livrables, apres) {
    if (!enregistrementPermis()) return;
    if (!DEPOT.exigerReference(p, "La livraison")) return;
    var cibles = [];
    livrables.forEach(function (l) {
      var e = etatPiece(l);
      if (!l.annule && e.cle === "preuve") cibles.push(empreintePiece(l, e));
    });
    if (!cibles.length) return;
    var choix = cibles.map(function (x, i) {
      var m = x.marche && DEPOT.trouve("marches", x.marche);
      return el("label.remise-choix", {},
        el("input", { name: "pieces", type: "checkbox", value: i,
          checked: cibles.length === 1 ? true : null }),
        el("span", {}, x.nom + " · V" + x.version + (m ? " · " + m.nom : ""),
          el("small", {}, x.fichiers.map(function (f) { return f.nom; }).join(", "))));
    });
    var f = "lot";
    formulaire("Marquer le lot comme livré", p.ref || p.nom, [
      el("fieldset.remise-bloc", {}, el("legend", {}, "Pièces remises"), choix),
      blocRemise(f),
    ], function (data) {
      var selection = data.getAll("pieces").map(function (i) { return cibles[Number(i)]; }).filter(Boolean);
      var destinataire = texte(data.get("destinataire")), quand = texte(data.get("remis-le"));
      if (!selection.length) return { erreur: "Choisissez au moins une pièce." };
      if (!destinataire || !dater(quand)) return { erreur: "Dites à qui le lot a été remis, et une date passée ou du jour." };
      return preuveSaisie(data, "remise", { type: "declaration", texte: "", contact: destinataire, date: quand })
        .then(function (r) {
          if (r.erreur) return r;
          return consigner(p.id, selection, { nom: r.nom, destinataire: destinataire, quand: quand, preuve: r.preuve });
        });
    }, apres, { action: "Marquer comme livré", fait: "Livraison enregistrée." });
  }

  function cartePreuve(r) {
    var x = preuveValide(r.preuve);
    return el("div.remise-preuve", {},
      el("strong", {}, r.preuve.nom || "Justificatif de remise"),
      el("span", {}, [r.id, O.joli(r.remis_le), r.destinataire,
        r.acteur && r.acteur.nom ? "noté par " + r.acteur.nom : null].filter(Boolean).join(" · ")),
      x && x.type !== "declaration" ? lienPreuve(x, "Ouvrir le justificatif") : x ? lienPreuve(x) : null);
  }

  function sauvegarde() {
    var pds = DEPOT.poids();
    return pds.fichier && !pds.surDisque ? el("div.remise-ecriture", {},
      el("p", { role: "status" }, "Sauvegarde du dépôt en attente"),
      el("button.b.nu", { type: "button", onclick: function () { suiviSauvegarde("Sauvegarde du dépôt."); } }, "Réessayer"))
      : null;
  }

  function suiviPiece(p, l, apres) {
    var etat = etatPiece(l);
    var recu = preuveCourante(p, l);
    var anciens = preuves(p).filter(function (r) {
      return r && r !== recu && r.preuve && Array.isArray(r.pieces)
        && r.pieces.some(function (x) { return x.id === l.id; });
    });
    var ouvert = enregistrementPermis() && !l.annule && !p.fusionne && !(window.CLOTURE && CLOTURE.est(p));
    var bat = etat.bat;
    var preuveBat = bat ? preuveValide(bat.preuve) || preuveValide({ type: "lien", url: bat.emplacement }) : null;
    /* Ce qui s'ouvre : la pièce jointe, sinon le fichier posé à l'étage. Le
     * mot de la déclaration se dit à côté. */
    var ouvrirBat = !bat ? null : preuveBat && preuveBat.type !== "declaration" ? lienPreuve(preuveBat, "Ouvrir le BAT")
      : fichierServi(bat.emplacement) ? lienFichier(fichierServi(bat.emplacement), "Ouvrir le BAT") : null;
    /* « Signé » quand une pièce le montre ; un accord oral ou par message est
     * un BAT accordé. */
    var batPiece = !!ouvrirBat || !!texte(bat && bat.emplacement);
    return el("section.remise-suivi", { "aria-label": "BAT et remise" },
      el("header.remise-tete", {}, el("h3", {}, "BAT et remise"),
        UI.eti(recu ? "Remise justifiée" : etat.nom, recu ? "vert" : "attente")),
      bat ? el("div.remise-preuve", {},
        el("strong", {}, (batPiece ? "BAT signé" : "BAT accordé") + " · V" + etat.version),
        el("span", {}, bat.nom + " · " + bat.signataire
          + (bat.signe_le ? " · " + O.joli(bat.signe_le) : "")),
        ouvrirBat,
        preuveBat && preuveBat.type === "declaration" && (preuveBat.texte || !ouvrirBat) ? lienPreuve(preuveBat) : null) : null,
      recu ? cartePreuve(recu) : null,
      recu ? sauvegarde() : null,
      etat.fichiers ? el("details", {}, el("summary", {}, recu ? "Fichiers remis" : "Fichiers à remettre"),
        etat.fichiers.map(function (f) {
          return el("div.remise-preuve", {}, el("strong", {}, f.nom),
            lienExterne(f.emplacement, "Ouvrir le fichier")
              || el("span", {}, f.canal ? envoi(f.canal) || f.canal : f.emplacement));
        })) : null,
      ouvert && !recu && ["bat", "sortie", "preuve"].indexOf(etat.cle) !== -1
        ? el("div.remise-gestes", {},
            el("button.b.or", { type: "button", onclick: function () { marquerLivre(p, l, apres); } }, "Marquer comme livré"),
            etat.cle === "bat" ? el("button.b.nu", { type: "button",
              onclick: function () { marquerLivre(p, l, apres, { batSeul: true }); } }, "Enregistrer seulement le BAT") : null)
        : null,
      anciens.length ? el("details", {},
        el("summary", {}, "Preuves des versions ou périmètres précédents"),
        anciens.map(cartePreuve)) : null);
  }

  function suiviLot(p, ls, apres) {
    var candidats = ls.filter(function (l) { return etatPiece(l).cle === "preuve" && !preuveCourante(p, l); });
    var livres = ls.filter(function (l) { return preuveCourante(p, l); }).length;
    var permis = enregistrementPermis() && !p.fusionne && !(window.CLOTURE && CLOTURE.est(p));
    return el("section.remise-suivi", { "aria-label": "Suivi de la remise" },
      el("header.remise-tete", {}, el("h3", {}, "Suivi de la remise"),
        UI.eti(livres + " / " + ls.length + " livrées", livres && livres === ls.length ? "vert" : "terne")),
      permis && candidats.length ? el("button.b.or", { type: "button",
        onclick: function () { ouvrirPreuve(p, candidats, apres); } }, "Marquer le lot comme livré") : null,
      livres ? sauvegarde() : null,
      preuves(p).length ? el("details", {}, el("summary", {}, "Livraisons enregistrées"),
        preuves(p).slice().reverse().filter(function (r) { return r && r.preuve && Array.isArray(r.pieces); }).map(function (r) {
          return el("div", {}, cartePreuve(r), el("ul", {}, r.pieces.map(function (x) {
            var l = ls.find(function (y) { return y.id === x.id; });
            var m = x.marche && DEPOT.trouve("marches", x.marche);
            return el("li", {}, x.nom + " · V" + x.version + (m ? " · " + m.nom : "")
              + (l && preuveCourante(p, l) === r ? "" : " · preuve historique"),
              x.fichiers && x.fichiers.length ? el("small", {}, x.fichiers.map(function (f) { return f.nom; }).join(", ")) : null);
          })));
        })) : null);
  }

  /* ————————————————————— Le manifeste, à l'écran ————————————————————— */

  function ouvrir(p) {
    /* Le manifeste part chez le client : il attend la référence attribuée. */
    if (!DEPOT.exigerReference(p, "Le paquet de remise")) return;
    var L = lot(p);
    if (!L.total) { AVIS.refus("Aucun livrable approuvé : la remise vient après le verdict."); return; }

    PANNEAU.ouvrir("Le paquet de remise", p.ref || p.nom, el("div", {},
      UI.banniere(L.prets === L.total ? "vert" : "",
        L.physiques + " / " + L.total + " versions avec BAT requis et fichier final. "
        + L.conformes + " / " + L.total + " sans écart relevé sur les métadonnées."),

      L.convention
        ? null
        : PANNEAU.sousbloc("Aucune convention de nommage",
            el("p.lire", {}, "Ce client n'en déclare pas au référentiel. Sans elle, les "
              + "fichiers partent au nom qu'ils ont, et le DAM les range comme il peut.")),

      el("div.rms", {}, L.pieces.map(function (x) {
        return el("div.rms-p" + (x.pret ? ".ok" : ""), {},
          el("div.rmsp-n", {}, x.nom || x.livrable.nom,
            el("span.rmsp-v", {}, "v" + x.version)),
          el("div.rmsp-m", {}, [x.marque, x.campagne, x.marche, x.support, x.langue]
            .filter(Boolean).join("  ·  ")),
          x.droits.length
            ? el("div.rmsp-d", {}, x.droits.map(function (d) {
                return el("div", {}, d.asset + " — "
                  + (d.zones.length ? d.zones.join(", ") : "aucune zone")
                  + (d.expire ? "  ·  expire le " + O.jourCourt(d.expire) : "")
                  + (d.cession ? "  ·  " + d.cession : ""));
              }))
            : null,
          x.manques.length ? el("div.rmsp-x", {}, "manque : " + x.manques.join(", ")) : null,
          !x.physique ? el("div.rmsp-x", {}, x.suivi) : null,
          x.alertesDroits.length ? el("div.rmsp-x", {}, x.alertesDroits.join("  ·  ")) : null,
          x.mentionsManquantes.length
            ? el("div.rmsp-x", {}, "mentions absentes : " + x.mentionsManquantes.join(", ")) : null);
      })),

      el("div.form-actions", {},
        el("button.bouton", { type: "button", onclick: function () {
          copier(p, L); } }, "Copier le manifeste"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Fermer"))
    ), "var(--accent)");
  }

  /* Le manifeste part par le presse-papier : le produit n'envoie rien, il
   * écrit. C'est la même règle que le renvoi depuis le premier jour. */
  function copier(p, L) {
    if (!DEPOT.exigerReference(p, "Le manifeste de remise")) return;
    var lignes = ["MANIFESTE DE REMISE", p.ref + " · " + p.nom,
      "composé le " + O.joli(new Date().toISOString()), ""];
    L.pieces.forEach(function (x) {
      lignes.push((x.nom || x.livrable.nom));
      lignes.push("  " + [x.marque, x.campagne, x.marche, x.support, x.langue, "v" + x.version]
        .filter(Boolean).join(" · "));
      x.droits.forEach(function (d) {
        lignes.push("  droits : " + d.asset + " — "
          + (d.zones.length ? d.zones.join(", ") : "aucune zone")
          + (d.expire ? " · expire le " + O.jourCourt(d.expire) : "")
          + (d.cession ? " · " + d.cession : ""));
      });
      if (!x.physique) lignes.push("  ⚠ " + x.suivi);
      if (!x.conformite) lignes.push("  ⚠ " + x.manques.concat(x.alertesDroits)
        .concat(x.mentionsManquantes.length ? ["mentions absentes : " + x.mentionsManquantes.join(", ")] : [])
        .join(" · "));
      lignes.push("");
    });
    var t = lignes.join("\n");
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    DEPOT.tracer("manifeste", "projets", p.id, L.total + " pièces");
    AVIS.fait("Le manifeste est dans le presse-papier — " + L.total
      + (L.total > 1 ? " pièces" : " pièce") + ".");
  }

  return { convention: convention, nomAttendu: nomAttendu, piece: piece, lot: lot,
    etat: etat, ouvrir: ouvrir, droits: droits, mentions: mentions, etatPiece: etatPiece,
    empreintePiece: empreintePiece, preuveCourante: preuveCourante, consigner: consigner,
    suiviPiece: suiviPiece, suiviLot: suiviLot, versionCourante: versionCourante,
    preuveValide: preuveValide, fichierServi: fichierServi, marquerLivre: marquerLivre };
})();
