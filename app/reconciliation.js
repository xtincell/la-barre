/* Rapprochement à trois versions. Des champs différents se réunissent ;
 * deux valeurs concurrentes restent à arbitrer. Aucune dépendance. */
window.RECONCILIATION = (function () {
  function copie(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function egal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function objet(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
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
    function marcher(b, i, d, chemin) {
      if (egal(i, d)) return copie(i);
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
          var rows = [];
          ids.forEach(function (id) {
            var v = marcher(bm.get(id), im.get(id), dm.get(id), chemin.concat(id));
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
        if (traces && egal(i.slice(0, b.length), b) && egal(d.slice(0, b.length), b)) {
          var vus = new Set(), journal = [];
          d.concat(i.slice(b.length)).forEach(function (v) {
            var cle = JSON.stringify(v); if (!vus.has(cle)) { vus.add(cle); journal.push(copie(v)); }
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
  return { reconcilier: reconcilier, copie: copie, actualiser: actualiser };
})();
