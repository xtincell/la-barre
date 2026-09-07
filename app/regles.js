/* regles.js — les mécanismes.
 *
 * Rien ne bloque. Tout se voit. Chaque raccourci affiche son prix.
 *
 * Un blocage n'est pas saisi : il est calculé depuis l'état. Le registre ne
 * garde que sa date de naissance, sa résolution, et le cas échéant la raison
 * pour laquelle tu as dit « ce n'en est pas un ».
 */

window.REGLES = (function () {
  /* ————— Le prix de chaque raccourci ————— */

  var PRIX = {
    "decideur-absent": "Aucune validation client ne prendra effet.",
    "tueur-absent": "La signature de l'étage 1 n'immunise rien : la remise en cause restera possible sans être imputable.",
    "fenetre-absente": "La charge de production ne peut être ni placée ni tenue.",
    "socle-absent": "La campagne pourra être refusée en revue sans recours.",
    "criteres-absents": "Ce travail ne pourra être refusé que par goût.",
    "da-absent": "Direction de la Création qui produit : la porte A se ferme pour l'équipe.",
    "auteur-absent": "L'idée ne pourra être attribuée à personne, et l'indicateur juniors reste à zéro.",
    "arbitrage-absent": "L'équipe travaille sans savoir quel concept fait autorité.",
    "axe-absent": "La piste ne se distingue des autres que par son titre : la comparer n'oppose rien, et le client tranchera sur le visuel qu'on lui montre.",
    "axe-jumeau": "Deux pistes au même ton ne font pas un choix : on demande au client de trancher sur rien, et il reviendra dessus.",
    "entree-sans-fournisseur": "Tout le monde attend un fichier que personne ne doit fournir.",
    "copy-non-verrouille": "Une correction tardive traversera toutes les déclinaisons et toutes les langues.",
    "droits-insuffisants": "Usage hors du territoire ou de la durée couverts par la licence.",
    "maitre-perime": "Des adaptations sont produites sur une version qui n'a plus cours.",
    "sans-proprietaire": "Personne n'est en défaut le jour où ça n'avance pas.",
    "casquette-sans-part": "La charge de cette personne est fausse.",
    "bilan-absent": "Le projet suivant sur cette marque partira sans son diagnostic.",
    "infere-non-contresigne": "Utilisable pour travailler, pas opposable au client : le jour où il conteste, rien ne tient.",
    "brief-sans-porteur": "Personne ne répond de ce qui a été compris : au premier écart entre le dit et l'écrit, il n'y a pas d'arbitre.",
    "adaptation-hors-da": "Une correction demandée par le marché arrivera chez quelqu'un qui n'a pas fait la piste.",
    "livrable-sans-piste": "Elle se fabrique sans concept opposable : refusable par le goût seul, jamais sur un critère écrit.",
    "sku-hors-zone": "Un produit montré là où il n'est pas vendu se rappelle, et le rappel est pour l'agence.",
    "orthographe-diffusee": "La faute part sur toute la descendance, et se lit sur chaque support imprimé.",
    "packshot-cmyk": "Bon pour l'impression, faux à l'écran : les couleurs ne seront pas celles validées.",
    "logo-ombrelle-absent": "L'ombrelle doit être considérée et n'apparaît nulle part : le client le verra avant nous.",
    "langue-marche-douteuse": "Une langue de marché que rien ne corrobore : on adapte dans une langue qu'on n'y parle pas.",
    "charge-hors-fenetre": "La charge dépasse la fenêtre : la date ne peut pas être tenue, et personne ne l'a encore dit.",
  };

  function prix(cle) { return PRIX[cle] || ""; }

  /* ————— Calcul des blocages ————— */

  function blocages(projetId) {
    var trouves = [];
    var projets = DEPOT.liste("projets").filter(function (p) {
      return !projetId || p.id === projetId;
    });

    projets.forEach(function (p) {
      var s = p.sections || {};

      /* Identité. Une valeur inférée remplit le champ mais ne le clôt pas :
       * elle fait travailler l'équipe, elle ne s'oppose à personne. Le blocage
       * ne disparaît pas — il change de nature. */
      critique(trouves, p, "identite", "decideur", "decideur-absent", "Décideur final non nommé", "clientele");
      critique(trouves, p, "identite", "tueur", "tueur-absent", "Qui peut annuler une idée validée : non nommé", "clientele");
      critique(trouves, p, "identite", "fenetre", "fenetre-absente", "Fenêtre et dates non fixées", "clientele");

      /* Socle avant big idea */
      if (aSection(p, "bigidea") && s.bigidea && s.bigidea.idee && !(s.socle && s.socle.idee_directrice)) {
        pousser(trouves, p, "socle-absent", "Big idea ouverte sans plateforme de marque active", "creation", "socle");
      }

      /* Auteur de l'idée */
      if (s.bigidea && s.bigidea.idee && !s.bigidea.auteur) {
        pousser(trouves, p, "auteur-absent", "L'auteur de la big idea n'est pas nommé", "creation", "bigidea");
      }

      /* Critères d'acceptation */
      if (s.bigidea && s.bigidea.idee && !(s.bigidea.criteres && s.bigidea.criteres.length)) {
        pousser(trouves, p, "criteres-absents", "Aucun critère d'acceptation écrit", "creation", "bigidea");
      }

      /* Le porteur du brief. Un brief est le travail de quelqu'un : c'est lui
       * qui a écouté, mis en forme, et qui répond de l'écart entre ce qui a
       * été dit et ce qui est écrit. Sans lui, le brief n'est de personne. */
      if (aSection(p, "brief") && !(s.brief && s.brief.porteur)) {
        pousser(trouves, p, "brief-sans-porteur", "Le brief n'a pas de porteur nommé", "clientele", "brief");
      }

      /* Un produit montré là où il n'est pas vendu. Le contrôle ne peut se
       * faire que sur les livrables qui déclarent leurs packs — les autres sont
       * muettes, et c'est une information aussi. */
      if (window.VAULT) {
        var horsZone = (p.livrables || []).filter(function (l) {
          return !l.annule && VAULT.packsHorsZone(l).hors.length; });
        if (horsZone.length) {
          pousser(trouves, p, "sku-hors-zone",
            horsZone.length + (horsZone.length > 1 ? " livrables montrent un produit" : " livrable montre un produit")
              + " non distribué sur son marché", "creation", "livrables");
        }

        /* Un packshot CMYK sur un support d'écran. Le fichier est bon, il n'est
         * pas au bon endroit. */
        var ecrans = { social: true, kv: true };
        var cmyk = (p.livrables || []).filter(function (l) {
          if (l.annule) return false;
          var sp = DEPOT.trouve("supports", l.support);
          if (!sp || !ecrans[sp.type]) return false;
          return VAULT.packsDe(l).some(function (s) { return s.espace === "CMYK"; });
        });
        if (cmyk.length) {
          pousser(trouves, p, "packshot-cmyk",
            cmyk.length + (cmyk.length > 1 ? " livrables digitales montrent un packshot CMYK"
                                           : " livrable digitale montre un packshot CMYK"),
            "creation", "livrables");
        }
      }

      /* Une faute déjà commise, encore présente. Elle est notée au vault de la
       * marque ; l'outil la traque sur tout ce qui se lit. */
      if (window.VAULT) {
        var fautives = (p.livrables || []).filter(function (l) {
          return !l.annule && VAULT.fautesSur(l).length; });
        if (fautives.length) {
          var f0 = VAULT.fautesSur(fautives[0])[0];
          pousser(trouves, p, "orthographe-diffusee",
            fautives.length + (fautives.length > 1 ? " livrables portent « " : " livrable porte « ")
              + f0.mauvais + " »" + (f0.bon ? " au lieu de « " + f0.bon + " »" : ""),
            "creation", "livrables");
        }
      }

      /* Une langue de marché que la source elle-même contredit. La note du
       * référentiel garde la contradiction ; le blocage la ramène au dossier. */
      var douteux = {};
      (p.livrables || []).forEach(function (l) {
        if (l.annule || !l.marche) return;
        var mk = DEPOT.trouve("marches", l.marche);
        if (mk && mk.note) douteux[mk.code] = mk;
      });
      var codes = Object.keys(douteux);
      if (codes.length) {
        pousser(trouves, p, "langue-marche-douteuse",
          codes.length + (codes.length > 1 ? " marchés ont une langue contestée : "
                                           : " marché a une langue contestée : ")
            + codes.join(", "), "clientele", "livrables");
      }

      /* L'ombrelle doit être considérée : si la campagne la déclare et
       * qu'aucun maître ne porte son logo, on le dit avant le client. */
      if (p.campagne && p.campagne.ombrelle && !p.campagne.ombrelle.logo) {
        var maitres = (p.livrables || []).filter(function (l) {
          return !l.annule && l.niveau === "maitre"; }).length;
        if (maitres) {
          pousser(trouves, p, "logo-ombrelle-absent",
            "Logo " + p.campagne.ombrelle.nom + " absent des " + maitres
              + " KV masters", "creation", "livrables");
        }
      }

      /* La charge dépasse la fenêtre. Les deux nombres existent déjà ; ce qui
       * manquait, c'est qu'ils se regardent. */
      if (window.OBJECTIFS) {
        var eng = OBJECTIFS.engagements().filter(function (x) { return x.projet.id === p.id; })[0];
        if (eng && eng.tenable === false && eng.joursRestants !== null && eng.charge) {
          pousser(trouves, p, "charge-hors-fenetre",
            Math.round(eng.charge) + " j de travail pour "
              + Math.max(0, eng.joursRestants) + " j restants", "creation", "livrables");
        }
      }

      /* Les adaptations reviennent au DA de leur piste. */
      if (window.KV) {
        var mal = KV.adaptationsMalPortees(p);
        if (mal.length) {
          pousser(trouves, p, "adaptation-hors-da",
            mal.length + (mal.length > 1 ? " adaptations ne sont pas au DA de leur piste"
                                         : " adaptation n'est pas au DA de sa piste"),
            "creation", "livrables");
        }
      }

      /* DA affecté */
      var aDA = (p.equipe || []).some(function (m) { return m.poste === "da"; });
      if (aSection(p, "pistes") && !aDA) {
        pousser(trouves, p, "da-absent", "Aucun Directeur Artistique affecté au dossier", "creation", "equipe");
      }

      /* Arbitrage : plus d'une piste en lice, aucune retenue */
      var pistes = (s.pistes || []);
      var retenue = pistes.filter(function (x) { return x.statut === "retenue"; }).length;
      if (pistes.length > 1 && retenue === 0) {
        pousser(trouves, p, "arbitrage-absent", pistes.length + " pistes en lice, aucune retenue", "creation", "pistes");
      }
      /* L'axe créatif : ce qui sépare une piste d'une autre. Le contrôle ne
       * mord que sur les pistes vives — écarter une piste sans axe n'est pas
       * une faute, c'est une décision déjà prise. */
      /* Le même prix, répété une fois par piste, cesse d'être lu à la seconde.
       * Deux pistes sans axe se disent en un blocage qui porte le nombre —
       * c'est le mécanisme du lot, déjà écrit pour les livrables. */
      var jumeauxDits = {};
      var sansAxe = [];
      pistes.forEach(function (pi) {
        if (!pi.auteurDA) pousser(trouves, p, "auteur-absent", "Piste « " + (pi.titre || "sans titre") + " » sans auteur", "creation", "pistes");
        if (pi.statut === "ecartee" || !window.AXE) return;

        var a = AXE.de(pi);
        if (!a.complet) sansAxe.push({ l: { id: pi.id }, pi: pi, a: a });

        var j = AXE.jumelles(p, pi);
        if (j.length && !jumeauxDits[O.normalise(pi.axe_ton)]) {
          jumeauxDits[O.normalise(pi.axe_ton)] = true;
          pousser(trouves, p, "axe-jumeau",
            "« " + (pi.titre || "sans titre") + " » et « " + (j[0].titre || "sans titre")
              + " » portent le même ton", "da", "pistes");
        }
      });

      if (sansAxe.length === 1) {
        var x = sansAxe[0];
        pousser(trouves, p, "axe-absent",
          "Piste « " + (x.pi.titre || "sans titre") + " » — "
            + (x.a.vide ? "aucun axe créatif écrit"
              : x.a.manque.map(function (c) { return c.court.toLowerCase(); }).join(", ") + " à écrire"),
          "da", "pistes", x.pi.id);
      } else if (sansAxe.length > 1) {
        var tous = sansAxe.every(function (x) { return x.a.vide; });
        var b = pousser(trouves, p, "axe-absent",
          sansAxe.length + " pistes sur " + pistes.length
            + (tous ? " n'ont aucun axe créatif écrit" : " ont un axe incomplet"),
          "da", "pistes");
        b.pieces = sansAxe.map(function (x) { return x.pi.id; });
      }

      /* Livrables. Une campagne multi-marchés porte quatorze livrables : quatorze
       * lignes identiques dans le rail ne dirigent rien. Au-delà de deux, le
       * blocage se dit une fois, avec son nombre. */
      var lots = { "sans-proprietaire": [], "maitre-perime": [], "droits-insuffisants": [], "entree-sans-fournisseur": [], "livrable-sans-piste": [] };
      (p.livrables || []).forEach(function (l) {
        if (l.annule) return;
        (l.entrees || []).forEach(function (e) {
          if (!e.fournisseur) lots["entree-sans-fournisseur"].push({ l: l, quoi: "« " + e.quoi + " » attendu sans fournisseur nommé" });
        });
        if (!l.responsable) lots["sans-proprietaire"].push({ l: l, quoi: "Livrable « " + l.nom + " » sans responsable" });
        /* Un livrable que nulle piste ne gouverne ne se refuse que par le goût.
         * Vaut pour une campagne comme pour un cycle : un cycle ne met pas
         * deux pistes en concurrence, mais il en tient une. */
        if (!l.pisteId) lots["livrable-sans-piste"].push({ l: l, quoi: "« " + l.nom + " » ne relève d'aucune piste" });
        if (maitrePerime(p, l)) lots["maitre-perime"].push({ l: l, quoi: "« " + l.nom + " » adapté sur une version dépassée du master" });
        var d = droitsInsuffisants(l);
        if (d) lots["droits-insuffisants"].push({ l: l, quoi: d });
      });

      /* Les inférences hors champs critiques : un seul blocage, avec le nombre. */
      if (window.INFERENCE) {
        var deja = {};
        trouves.forEach(function (b) { if (b.infere) deja[b.infere.section + "." + b.infere.champ] = true; });
        var infs = INFERENCE.liste(p).filter(function (x) { return !deja[x.cle]; });
        if (infs.length) {
          var bi = pousser(trouves, p, "infere-non-contresigne",
            infs.length + (infs.length > 1 ? " champs tiennent" : " champ tient") + " sur une inférence",
            "creation", "identite", "lot-inferences");
          bi.inferences = infs.map(function (x) { return x.cle; });
        }
      }

      poserLot(trouves, p, lots["sans-proprietaire"], "sans-proprietaire", "creation", "livrables",
        function (n) { return n + " livrables sans responsable"; });
      poserLot(trouves, p, lots["maitre-perime"], "maitre-perime", "da", "livrables",
        function (n) { return n + " adaptations faites sur une version dépassée du master"; });
      poserLot(trouves, p, lots["droits-insuffisants"], "droits-insuffisants", "motion", "livrables",
        function (n) { return n + " visuels hors zone ou hors durée de cession"; });
      poserLot(trouves, p, lots["entree-sans-fournisseur"], "entree-sans-fournisseur", "creation", "livrables",
        function (n) { return n + " éléments d'entrée attendus sans fournisseur nommé"; });
      poserLot(trouves, p, lots["livrable-sans-piste"], "livrable-sans-piste", "creation", "pistes",
        function (n) { return n + " livrables ne relèvent d'aucune piste"; });
    });

    return reconcilier(trouves);
  }

  /* Un champ critique a trois états, pas deux : reçu, inféré, absent. */
  function critique(liste, p, section, champ, type, quoi, poste) {
    var v = (p.sections[section] || {})[champ];
    var rempli = Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== "");
    if (!rempli) { pousser(liste, p, type, quoi, poste, section); return; }
    if (window.INFERENCE && INFERENCE.est(p, section, champ)) {
      var b = pousser(liste, p, "infere-non-contresigne",
        quoi.replace(/ non nommé$| : non nommé$| non fixées$/, "") + " — inféré, non contresigné",
        poste, section, section + "." + champ);
      b.infere = { section: section, champ: champ, valeur: v };
    }
  }

  function aSection(p, cle) {
    var g = null;
    MAISON.gabarits.forEach(function (x) { if (x.cle === p.gabarit) g = x; });
    return !g || g.sections.indexOf(cle) !== -1;
  }

  /* Un lot : en dessous de trois on nomme chaque livrable, au-delà on nomme le
   * nombre — et on garde la liste, pour pouvoir l'ouvrir. */
  var SEUIL_LOT = 3;

  function poserLot(liste, projet, lot, type, poste, section, phrase) {
    if (!lot.length) return;
    if (lot.length < SEUIL_LOT) {
      lot.forEach(function (x) { pousser(liste, projet, type, x.quoi, poste, section, x.l.id); });
      return;
    }
    var b = pousser(liste, projet, type, phrase(lot.length), poste, section);
    b.pieces = lot.map(function (x) { return x.l.id; });
  }

  function pousser(liste, projet, type, quoi, poste, section, cible) {
    var b = {
      cle: projet.id + "|" + type + "|" + (cible || section),
      projet: projet.id,
      projetNom: projet.nom,
      type: type,
      quoi: quoi,
      poste: poste,
      section: section,
      cible: cible || null,
      prix: prix(type),
    };
    liste.push(b);
    return b;
  }

  /* Rapproche les blocages calculés du registre : date de naissance, résolution,
   * et les « ce n'en est pas un ». */
  function reconcilier(calcules) {
    var registre = DEPOT.liste("blocages");
    var parCle = {};
    registre.forEach(function (r) { parCle[r.cle] = r; });
    var maintenant = new Date().toISOString();
    var sortie = [];

    calcules.forEach(function (b) {
      var r = parCle[b.cle];
      if (!r) {
        r = { id: O.id("BLQ"), cle: b.cle, ne_le: maintenant, resolu_le: null, ecarte: null };
        DEPOT.liste("blocages").push(r);
      }
      if (r.resolu_le) { r.resolu_le = null; } /* il est revenu */
      if (r.ecarte) return; /* tu as dit que ce n'en était pas un */
      b.id = r.id;
      b.depuis = r.ne_le;
      b.jours = O.depuis(r.ne_le);
      sortie.push(b);
    });

    /* Ceux du registre qui ne sont plus calculés sont résolus. */
    var clesVives = {};
    calcules.forEach(function (b) { clesVives[b.cle] = true; });
    registre.forEach(function (r) {
      if (!clesVives[r.cle] && !r.resolu_le) r.resolu_le = maintenant;
    });

    return sortie.sort(function (a, b) { return b.jours - a.jours; });
  }

  function ecarter(id, motif) {
    var r = DEPOT.trouve("blocages", id);
    if (!r) return;
    r.ecarte = { motif: motif, quand: new Date().toISOString() };
    DEPOT.tracer("écarté", "blocages", id, motif);
    DEPOT.enregistrer();
  }

  /* ————— Maître et adaptations ————— */

  function maitrePerime(projet, livrable) {
    if (!livrable.maitre) return false;
    var m = (projet.livrables || []).filter(function (x) { return x.id === livrable.maitre; })[0];
    if (!m) return false;
    return (m.version || 1) > (livrable.versionMaitre || 0);
  }

  function adaptations(projet, maitreId) {
    return (projet.livrables || []).filter(function (l) { return l.maitre === maitreId; });
  }

  function adaptationsPerimees(projet, maitreId) {
    return adaptations(projet, maitreId).filter(function (l) { return maitrePerime(projet, l); });
  }

  /* ————— Droits ————— */

  function droitsInsuffisants(livrable) {
    var msg = null;
    (livrable.assets || []).forEach(function (aid) {
      var a = DEPOT.trouve("assets", aid);
      if (!a) return;
      if (a.zones && a.zones.length && livrable.marche && a.zones.indexOf(livrable.marche) === -1) {
        msg = "« " + a.nom + " » utilisé sur " + livrable.marche + ", hors des zones couvertes";
      }
      if (a.expire_le && livrable.publication && new Date(a.expire_le) < new Date(livrable.publication)) {
        msg = "Les droits de « " + a.nom + " » expirent avant la diffusion";
      }
    });
    return msg;
  }

  /* ————— Recevabilité sur dix points ————— */

  function completude(livrable) {
    var points = {};
    /* Repli sur l'ancienne clé : un dépôt écrit avant le renommage doit
     * continuer de s'ouvrir. Rien n'est réécrit tant qu'on ne touche pas au
     * livrable — la migration se fait au premier clic. */
    var porte = livrable.points || livrable.axes;
    MAISON.points.forEach(function (a) {
      points[a.cle] = (porte && porte[a.cle]) || "attente";
    });
    return points;
  }

  function pretSur(livrable) {
    var c = completude(livrable);
    var n = 0, total = 0;
    MAISON.points.forEach(function (a) {
      if (c[a.cle] === "sansobjet") return;
      total++;
      if (c[a.cle] === "pret") n++;
    });
    return { pret: n, total: total, part: total ? Math.round((n / total) * 100) : 0 };
  }

  /* L'axe qui coince, et chez qui. */
  function coince(livrable) {
    var c = completude(livrable);
    var liste = [];
    MAISON.points.forEach(function (a) {
      if (c[a.cle] === "attente") liste.push({ point: a.nom, poste: a.poste, cle: a.cle });
    });
    return liste;
  }

  /* ————— Grille d'évaluation, par cases cochées ————— */

  function grille(type, objet) {
    var criteres = MAISON.criteres[type] || [];
    var coches = (objet && objet.grille) || {};
    return criteres.map(function (c, i) {
      return { texte: c, cle: type + "-" + i, tenu: coches[type + "-" + i] === true };
    });
  }

  /* ————— Contrôle de vocabulaire — règles R10 et R12 ————— */

  function vocabulaire(texte) {
    var t = O.normalise(texte);
    var trouves = [];
    MAISON.motsInterdits.forEach(function (m) {
      if (t.indexOf(O.normalise(m)) !== -1) trouves.push({ mot: m, type: "interdit" });
    });
    MAISON.nomsRetires.forEach(function (m) {
      if (t.indexOf(O.normalise(m)) !== -1) trouves.push({ mot: m, type: "retire" });
    });
    return trouves;
  }

  return {
    prix: prix, blocages: blocages, ecarter: ecarter,
    adaptations: adaptations, adaptationsPerimees: adaptationsPerimees, maitrePerime: maitrePerime,
    droitsInsuffisants: droitsInsuffisants,
    completude: completude, pretSur: pretSur, coince: coince,
    grille: grille, vocabulaire: vocabulaire,
  };
})();
