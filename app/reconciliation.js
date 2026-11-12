/* Rapprochement à trois versions. Des champs différents se réunissent ;
 * deux valeurs concurrentes restent à arbitrer. Aucune dépendance. */
window.RECONCILIATION = (function () {
  function copie(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function egal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  /* Servie derrière La Fusée, une entrée reçoit son attestation à
   * l'enregistrement : la même entrée peut donc revenir du serveur attestée et
   * rester nue ici. Ce n'est pas une modification concurrente. L'attestation
   * du serveur fait foi ; La Fusée rétablit d'ailleurs celle qu'un envoi omet. */
  function nu(v) { return JSON.stringify(v, function (k, x) { return k === "attestation" ? undefined : x; }); }
  function egalNu(a, b) { return nu(a) === nu(b); }
  function avecAttestations(i, d) {
    if (Array.isArray(i) && Array.isArray(d)) return d.map(function (x, n) { return avecAttestations(i[n], x); });
    if (objet(i) && objet(d)) {
      var o = {};
      Object.keys(d).forEach(function (k) { o[k] = k === "attestation" ? copie(d[k]) : avecAttestations(i[k], d[k]); });
      if (i.attestation != null && d.attestation == null) o.attestation = copie(i.attestation);
      return o;
    }
    return copie(d);
  }
  function objet(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  /* Le contenu, sans attestation et sans dépendre de l'ordre des clés. */
  function trie(v) {
    if (Array.isArray(v)) return v.map(trie);
    if (!objet(v)) return v;
    var o = Object.create(null);
    Object.keys(v).sort().forEach(function (k) { if (k !== "attestation") o[k] = trie(v[k]); });
    return o;
  }
  function memeContenu(a, b) { return JSON.stringify(trie(a)) === JSON.stringify(trie(b)); }
  function texte(v) { return typeof v === "string" && v.trim() !== ""; }

  /* ————— Un même objet, ou deux —————
   *
   * Une décision ne change plus une fois prise : deux décisions sous un même
   * identifiant sont la même si leur contenu est le même (decision.js). Un
   * projet ou un livrable change à chaque geste : son contenu ne dit pas qui
   * il est. Sa date de naissance, si : `cree_le`, posée à la création et jamais
   * réécrite. Deux copies d'un même projet — une réponse du serveur perdue,
   * puis d'autres gestes — portent la même ; deux projets nés sur deux postes
   * en portent deux.
   *
   *   true   le même objet
   *   false  deux objets
   *   null   on ne peut pas trancher : sans date de naissance des deux côtés,
   *          seul un contenu identique dit que c'est le même */
  function naissance(x) { return objet(x) && texte(x.cree_le) ? x.cree_le : null; }
  function memeObjet(a, b) {
    var na = naissance(a), nb = naissance(b);
    if (na || nb) return na === nb;
    return memeContenu(a, b) ? true : null;
  }

  /* ————— Où un identifiant est cité —————
   *
   * Sous les entrées données ({ conteneur, cle, scelle }), mot pour mot : une
   * valeur égale à l'identifiant. Avec `composees`, aussi un segment d'une clé
   * composée « a|b|c », en valeur comme en clé d'objet : le relevé des écarts
   * écartés (`ecartsEcartes`, « projet|livrable|origine|quoi »), l'objet d'une
   * décision d'écart, la clé d'un blocage (« projet|type|cible »). Un texte
   * libre qui contient l'identifiant ne le cite pas : un chemin de fichier, une
   * ligne de journal, `revisionSource`.
   *
   * Les endroits scellés, où une citation ne se réécrit pas, sont rendus à
   * part : une entrée attestée par La Fusée, dont le sceau couvre le contenu,
   * les versions arrêtées d'un bilan avec leurs accusés, que leur empreinte
   * couvre, et toute entrée que l'appelant déclare scellée. */
  var SCELLES = ["bilanVersions", "bilanRecus"];
  function citations(entrees, cible, composees) {
    var libres = [], scellees = [];
    function segment(x) { return composees && typeof x === "string" && x.indexOf("|") !== -1 && x.split("|").indexOf(cible) !== -1; }
    function noter(c, scelle) { (scelle ? scellees : libres).push(c); }
    function marcher(v, scelle) {
      if (Array.isArray(v)) { v.forEach(function (x, i) { visiter(v, i, scelle); }); return; }
      if (!objet(v)) return;
      Object.keys(v).forEach(function (k) {
        var s = scelle || SCELLES.indexOf(k) !== -1;
        if (composees && (k === cible || segment(k))) noter({ conteneur: v, cle: k, sorte: "cle" }, s);
        visiter(v, k, s);
      });
    }
    function visiter(conteneur, cle, scelle) {
      var x = conteneur[cle];
      if (x === cible) { noter({ conteneur: conteneur, cle: cle, sorte: "valeur" }, scelle); return; }
      if (segment(x)) { noter({ conteneur: conteneur, cle: cle, sorte: "segment" }, scelle); return; }
      if (x && typeof x === "object") marcher(x, scelle || (objet(x) && x.attestation != null));
    }
    entrees.forEach(function (e) { visiter(e.conteneur, e.cle, !!e.scelle || SCELLES.indexOf(e.cle) !== -1); });
    return { libres: libres, scellees: scellees };
  }
  function segments(x, ancien, nouveau) {
    return x.split("|").map(function (s) { return s === ancien ? nouveau : s; }).join("|");
  }
  /* Réécrire une citation. Une clé d'objet renommée garde sa place. */
  function reecrire(c, ancien, nouveau) {
    if (c.sorte === "segment") { c.conteneur[c.cle] = segments(c.conteneur[c.cle], ancien, nouveau); return; }
    if (c.sorte !== "cle") { c.conteneur[c.cle] = nouveau; return; }
    var o = c.conteneur, vers = c.cle === ancien ? nouveau : segments(c.cle, ancien, nouveau);
    if (vers === c.cle || !Object.prototype.hasOwnProperty.call(o, c.cle)) return;
    var paires = Object.keys(o).map(function (k) { return [k === c.cle ? vers : k, o[k]]; });
    Object.keys(o).forEach(function (k) { delete o[k]; });
    paires.forEach(function (p) { o[p[0]] = p[1]; });
  }

  /* ————— Deux projets, ou deux livrables, sous un même identifiant —————
   *
   * Avant de rapprocher, comme pour les décisions (DECISION.departager). `ici`
   * est la base de ce poste, `distant` celle qu'on vient de relire, `base` la
   * dernière que ce poste avait reçue. Un projet ou un livrable d'ici absent de
   * `base`, dont l'identifiant est porté là-bas par un autre objet — né à un
   * autre instant, ou, pour un livrable, dans un autre projet — n'est pas une
   * modification concurrente : ce sont deux objets. Celui de là-bas garde son
   * identifiant : il est déjà dans la base commune, Radar et La Fusée ont pu le
   * lire. Celui d'ici en reçoit un neuf (`tirer`, libre des trois côtés) ; ce
   * qui le cite ici le suit, et il garde la trace de l'ancien (`renommage`).
   * Les livrables passent avant les projets : un livrable se compare dans le
   * projet qui le porte, sous l'identifiant que ce projet avait.
   *
   * Ce qui ne peut pas être renommé reste un conflit à trancher, rendu dans
   * `bloques` : un identifiant pris deux fois ici, une citation scellée, ou une
   * décision déjà dans la base de référence qui le cite — le serveur refuse
   * qu'une décision enregistrée change. Un objet qu'on ne sait pas départager
   * (memeObjet nul : sans date de naissance des deux côtés, dans le même
   * projet) n'est pas renommé, et se rapproche champ par champ, comme avant.
   *
   * `ici` est modifiée sur place : c'est l'état du dépôt, que les écrans
   * ouverts tiennent. Rien n'est tracé ici ; le dépôt écrit le journal. */
  var RAISONS = {
    projets: "identifiant déjà pris dans la base de référence par un autre projet",
    livrables: "identifiant déjà pris dans la base de référence par un autre livrable",
  };
  var SCELLEE = "cité par une version de bilan arrêtée ou par une entrée attestée : la réécrire briserait son empreinte";
  function projetsDe(b) { return b && Array.isArray(b.projets) ? b.projets.filter(objet) : []; }
  function livrablesDe(p) { return Array.isArray(p.livrables) ? p.livrables.filter(objet) : []; }
  function departager(base, ici, distant, tirer) {
    var renommes = [], bloques = [], pris = null, vus = new Set();
    var decisionsLues = new Set();
    [base, distant].forEach(function (b) {
      (b && Array.isArray(b.decisions) ? b.decisions : []).forEach(function (d) { if (objet(d) && texte(d.id)) decisionsLues.add(d.id); });
    });
    /* Une décision déjà dans la base de référence se cite, scellée. */
    function entrees(lues) {
      return Object.keys(ici).reduce(function (out, k) {
        if (k === "decisions" && Array.isArray(ici.decisions)) {
          ici.decisions.forEach(function (d, i) {
            out.push({ conteneur: ici.decisions, cle: i, scelle: lues && objet(d) && decisionsLues.has(d.id) });
          });
        } else out.push({ conteneur: ici, cle: k });
        return out;
      }, []);
    }
    function prisDes3() {
      if (pris) return pris;
      pris = new Set();
      [base, ici, distant].forEach(function (b) {
        projetsDe(b).forEach(function (p) {
          if (texte(p.id)) pris.add(p.id);
          livrablesDe(p).forEach(function (l) { if (texte(l.id)) pris.add(l.id); });
        });
      });
      return pris;
    }
    function renommer(o, type, prefixe, comptesIci) {
      var ancien = o.id;
      if (vus.has(type + "\u0000" + ancien)) return;
      vus.add(type + "\u0000" + ancien);
      if (comptesIci.get(ancien) > 1) {
        bloques.push({ type: type, id: ancien, raison: "l'identifiant est déjà pris deux fois dans ce poste" }); return;
      }
      var cites = citations(entrees(true), ancien, true);
      if (cites.scellees.length) {
        bloques.push({ type: type, id: ancien, raison: citations(entrees(false), ancien, true).scellees.length ? SCELLEE
          : "cité par une décision déjà dans la base de référence, qui ne peut plus changer" });
        return;
      }
      var nouveau = tirer(prefixe, prisDes3());
      prisDes3().add(nouveau);
      /* Les valeurs d'abord, les clés d'objet ensuite : une clé renommée ne
       * doit pas être recréée par la valeur qu'elle portait. */
      cites.libres.filter(function (c) { return c.sorte !== "cle"; })
        .concat(cites.libres.filter(function (c) { return c.sorte === "cle"; }))
        .forEach(function (c) { reecrire(c, ancien, nouveau); });
      o.renommage = { de: ancien, le: new Date().toISOString(), raison: RAISONS[type] };
      renommes.push({ type: type, de: ancien, vers: nouveau, nom: o.nom || o.titre || o.ref || nouveau });
    }
    function compter(liste) {
      var m = new Map();
      liste.forEach(function (o) { if (texte(o.id)) m.set(o.id, (m.get(o.id) || 0) + 1); });
      return m;
    }
    function connus(liste) { return new Set(liste.filter(function (o) { return texte(o.id); }).map(function (o) { return o.id; })); }

    /* Les livrables, d'abord. */
    var livrablesIci = [], livrablesLa = new Map(), livrablesBase = [];
    projetsDe(ici).forEach(function (p) { livrablesDe(p).forEach(function (l) { livrablesIci.push({ l: l, projet: p.id }); }); });
    projetsDe(base).forEach(function (p) { livrablesBase = livrablesBase.concat(livrablesDe(p)); });
    projetsDe(distant).forEach(function (p) {
      livrablesDe(p).forEach(function (l) {
        if (!texte(l.id)) return;
        if (!livrablesLa.has(l.id)) livrablesLa.set(l.id, []);
        livrablesLa.get(l.id).push({ l: l, projet: p.id });
      });
    });
    var lBase = connus(livrablesBase), lIci = compter(livrablesIci.map(function (x) { return x.l; }));
    livrablesIci.forEach(function (x) {
      var l = x.l;
      if (!texte(l.id) || lBase.has(l.id) || !livrablesLa.has(l.id)) return;
      var autres = livrablesLa.get(l.id).every(function (y) { return y.projet !== x.projet || memeObjet(l, y.l) === false; });
      if (autres) renommer(l, "livrables", /^KV-/.test(l.id) ? "KV" : "L", lIci);
    });

    /* Puis les projets. */
    var pBase = connus(projetsDe(base)), pIci = compter(projetsDe(ici)), projetsLa = new Map();
    projetsDe(distant).forEach(function (p) {
      if (!texte(p.id)) return;
      if (!projetsLa.has(p.id)) projetsLa.set(p.id, []);
      projetsLa.get(p.id).push(p);
    });
    projetsDe(ici).forEach(function (p) {
      if (!texte(p.id) || pBase.has(p.id) || !projetsLa.has(p.id)) return;
      if (projetsLa.get(p.id).every(function (y) { return memeObjet(p, y) === false; })) renommer(p, "projets", "PRO", pIci);
    });
    return { renommes: renommes, bloques: bloques };
  }
  /* ————— La référence attribuée pendant une réponse perdue —————
   *
   * Un projet de ce poste attend sa référence (`refDemandee`) ; la base relue
   * porte le même projet — même identifiant, même date de naissance — avec sa
   * référence attribuée : le serveur l'a reçu, la réponse s'est perdue. Ce
   * n'est pas une modification concurrente : on reprend la référence attribuée,
   * qui ne changera plus, et la demande tombe. Rendu : ce qui a été repris. */
  function adopterReferences(ici, distant) {
    var la = new Map();
    projetsDe(distant).forEach(function (p) { if (texte(p.id) && !p.refDemandee && texte(p.ref)) la.set(p.id, p); });
    var repris = [];
    projetsDe(ici).forEach(function (p) {
      var d = p.refDemandee && la.get(p.id);
      if (!d || memeObjet(p, d) !== true) return;
      p.ref = d.ref; delete p.refDemandee;
      repris.push({ projet: p.id, ref: d.ref, nom: p.nom || p.id });
    });
    return repris;
  }
  function identifies(a) {
    if (!Array.isArray(a)) return false;
    var ids = new Set();
    return a.every(function (v) {
      if (!objet(v) || typeof v.id !== "string" || ids.has(v.id)) return false;
      ids.add(v.id); return true;
    });
  }
  // Les formulaires ouverts tiennent des références aux objets du dépôt.
  // Mettre leurs valeurs à jour préserve les gestes faits pendant le réseau.
  function actualiser(courant, neuf) {
    if (Array.isArray(courant) && Array.isArray(neuf)) {
      var parId = identifies(courant) && identifies(neuf)
        ? new Map(courant.map(function (v) { return [v.id, v]; })) : null;
      var valeurs = neuf.map(function (v, n) {
        return actualiser(parId ? parId.get(v.id) : courant[n], v);
      });
      courant.length = 0; valeurs.forEach(function (v) { courant.push(v); });
      return courant;
    }
    if (objet(courant) && objet(neuf)) {
      Object.keys(courant).forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(neuf, k)) delete courant[k];
      });
      Object.keys(neuf).forEach(function (k) {
        var avant = Object.prototype.hasOwnProperty.call(courant, k) ? courant[k] : undefined;
        Object.defineProperty(courant, k, { value: actualiser(avant, neuf[k]),
          writable: true, configurable: true, enumerable: true });
      });
      return courant;
    }
    return copie(neuf);
  }
  function reconcilier(base, ici, distant, choix) {
    var conflits = [];
    /* Deux décisions nées chacune de son côté sous le même identifiant ne sont
     * pas deux versions d'une même décision : elles ne se fondent pas champ
     * par champ, ce qui en ferait une troisième que personne n'a prise.
     * decision.js renomme celle d'ici avant le rapprochement ; celle qui ne
     * peut pas l'être reste à choisir, entière. De même pour deux projets ou
     * deux livrables d'un projet nés à deux instants (memeObjet faux) :
     * `departager` renomme ce qui peut l'être, le reste se choisit entier. Un
     * objet sans date de naissance des deux côtés (memeObjet nul) se rapproche
     * champ par champ, comme avant : c'est le cas d'un cache ancien repris sans
     * base, où tout objet est « absent de la base » et reste le même. */
    function entiere(i, d, chemin) {
      var cle = JSON.stringify(chemin), decision = choix && choix[cle];
      if (decision === "ici") return copie(i);
      if (decision === "distant") return copie(d);
      conflits.push({ cle: cle, chemin: chemin, base: undefined, ici: copie(i), distant: copie(d),
        iciPresent: true, distantPresent: true });
      return copie(i);
    }
    function marcher(b, i, d, chemin) {
      if (egal(i, d)) return copie(i);
      if (i !== undefined && d !== undefined && egalNu(i, d)) return avecAttestations(i, d);
      if (egal(i, b)) return copie(d);
      if (egal(d, b)) return copie(i);
      if (chemin.length === 1 && (chemin[0] === "enregistre_le" || chemin[0] === "machine")) return copie(i);
      if (objet(i) && objet(d) && (objet(b) || b === undefined)) {
        var valeur = Object.create(null);
        var cles = new Set(Object.keys(b || {}).concat(Object.keys(i), Object.keys(d)));
        cles.forEach(function (k) {
          var lire = function (o) { return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; };
          var v = marcher(lire(b), lire(i), lire(d), chemin.concat(k));
          if (v !== undefined) valeur[k] = v;
        });
        return valeur;
      }
      if ((Array.isArray(b) || b === undefined) && Array.isArray(i) && Array.isArray(d)) {
        b = b || [];
        // Dans une trace, « id » désigne l'objet concerné, pas l'événement.
        var traces = chemin.length === 1 && (chemin[0] === "journal" || chemin[0] === "lectures");
        if (!traces && identifies(b) && identifies(i) && identifies(d)) {
          var bm = new Map(b.map(function (v) { return [v.id, v]; }));
          var im = new Map(i.map(function (v) { return [v.id, v]; }));
          var dm = new Map(d.map(function (v) { return [v.id, v]; }));
          var ids = new Set(d.concat(i, b).map(function (v) { return v.id; }));
          var registre = chemin.length === 1 && chemin[0] === "decisions";
          var nes = (chemin.length === 1 && chemin[0] === "projets")
            || (chemin.length === 3 && chemin[0] === "projets" && chemin[2] === "livrables");
          var rows = [];
          ids.forEach(function (id) {
            var deux = !bm.has(id) && im.has(id) && dm.has(id);
            var distincts = deux && (registre ? !memeContenu(im.get(id), dm.get(id))
              : nes ? memeObjet(im.get(id), dm.get(id)) === false : false);
            var v = distincts
              ? entiere(im.get(id), dm.get(id), chemin.concat(id))
              : marcher(bm.get(id), im.get(id), dm.get(id), chemin.concat(id));
            if (v !== undefined) rows.push(v);
          });
          var communs = new Set(b.filter(function (v) { return im.has(v.id) && dm.has(v.id); }).map(function (v) { return v.id; }));
          var ordreDe = function (a) { return a.map(function (v) { return v.id; }).filter(function (id) { return communs.has(id); }); };
          var ob = ordreDe(b), oi = ordreDe(i), od = ordreDe(d);
          var ordre = marcher(ob, oi, od, chemin.concat("$ordre"));
          var localPrioritaire = egal(ordre, oi) && !egal(oi, ob);
          var parId = new Map(rows.map(function (v) { return [v.id, v]; }));
          var priorite = (localPrioritaire ? i : d).map(function (v) { return v.id; }).filter(function (id) { return parId.has(id); });
          var ajout = (localPrioritaire ? d : i).map(function (v) { return v.id; }).filter(function (id) { return parId.has(id); });
          ajout.forEach(function (id, n) {
            if (priorite.indexOf(id) !== -1) return;
            // Un nouvel élément garde sa place par rapport aux voisins connus.
            var suivant = ajout.slice(n + 1).find(function (x) { return priorite.indexOf(x) !== -1; });
            if (suivant) priorite.splice(priorite.indexOf(suivant), 0, id);
            else priorite.push(id);
          });
          return priorite.map(function (id) { return parId.get(id); });
        }
        // Seuls les suffixes append-only des journaux sont réunis sans choix.
        if (traces && egalNu(i.slice(0, b.length), b) && egalNu(d.slice(0, b.length), b)) {
          var vus = new Set(), journal = [];
          d.concat(i.slice(b.length)).forEach(function (v) {
            var cle = nu(v); if (!vus.has(cle)) { vus.add(cle); journal.push(copie(v)); }
          });
          return journal;
        }
      }
      var cle = JSON.stringify(chemin), decision = choix && choix[cle];
      if (decision === "ici") return copie(i);
      if (decision === "distant") return copie(d);
      conflits.push({ cle: cle, chemin: chemin, base: copie(b), ici: copie(i), distant: copie(d),
        iciPresent: i !== undefined, distantPresent: d !== undefined });
      return copie(i); // Proposition seulement : aucun write tant qu'un conflit reste.
    }
    return { valeur: marcher(base, ici, distant, []), conflits: conflits };
  }
  return { reconcilier: reconcilier, copie: copie, actualiser: actualiser,
    memeObjet: memeObjet, citations: citations, reecrire: reecrire, departager: departager,
    adopterReferences: adopterReferences };
})();
