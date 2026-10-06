/* Brouillons de reprise locaux. Le fichier servi reste l'autorité ; ces
 * copies protègent les gestes non reçus, y compris après un rechargement.
 * Une clé par onglet évite qu'un navigateur efface le brouillon d'un autre. */
window.REPRISES = (function () {
  var onglet;
  try {
    onglet = window.sessionStorage.getItem("la-barre-onglet");
    if (!onglet) {
      onglet = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      window.sessionStorage.setItem("la-barre-onglet", onglet);
    }
  } catch (e) { onglet = "session-" + Math.random().toString(36).slice(2); }
  var ouverture = null;
  function ouvrir() {
    if (!ouverture) ouverture = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("Stockage de reprise indisponible")); return; }
      var req = window.indexedDB.open("la-barre-reprises", 1);
      req.onupgradeneeded = function () { req.result.createObjectStore("brouillons", { keyPath: "cle" }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error("Stockage de reprise occupé")); };
    });
    return ouverture;
  }
  function transaction(mode, action) {
    return ouvrir().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction("brouillons", mode), result;
        var req = action(tx.objectStore("brouillons"));
        if (req) req.onsuccess = function () { result = req.result; };
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error("Reprise non conservée")); };
      });
    });
  }
  function garder(fichier, valeur) {
    var copie = JSON.parse(JSON.stringify(valeur));
    copie.cle = fichier + ":" + onglet; copie.fichier = fichier;
    copie.onglet = onglet; copie.quand = new Date().toISOString();
    return transaction("readwrite", function (s) { return s.put(copie); });
  }
  function archiverAncien(fichier, etat) {
    var texte = JSON.stringify(etat);
    return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)).then(function (hash) {
      var id = Array.from(new Uint8Array(hash)).map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
      return transaction("readwrite", function (s) {
        var cle = fichier + ":ancien-" + id, req = s.get(cle);
        req.addEventListener("success", function () {
          if (!req.result) s.put({ cle: cle, fichier: fichier, onglet: "ancien-" + id,
            quand: new Date().toISOString(), ancien: true, base: {}, etat: JSON.parse(texte) });
        });
        return req;
      });
    });
  }
  function lire(fichier) {
    return transaction("readonly", function (s) { return s.get(fichier + ":" + onglet); })
      .then(function (r) { return r && !r.recue_le ? r : null; });
  }
  function retirer(fichier) {
    return transaction("readwrite", function (s) { return s.delete(fichier + ":" + onglet); });
  }
  function lister(fichier) {
    return transaction("readonly", function (s) { return s.getAll(); }).then(function (rows) {
      return rows.filter(function (r) { return r.fichier === fichier && r.onglet !== onglet && !r.recue_le; });
    });
  }
  function accuser(reprise) {
    return transaction("readwrite", function (s) {
      var req = s.get(reprise.cle);
      req.addEventListener("success", function () {
        var r = req.result;
        // Un autre onglet peut avoir repris son propre travail entre-temps.
        if (r && r.quand === reprise.quand) {
          r.recue_le = new Date().toISOString(); s.put(r);
        }
      });
      return req;
    });
  }
  return { garder: garder, lire: lire, retirer: retirer, lister: lister, accuser: accuser, archiverAncien: archiverAncien };
})();
