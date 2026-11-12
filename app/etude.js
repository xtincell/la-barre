/* etude.js — le dossier qui part seul.
 *
 * Un dossier se remet. Jusqu'ici il ne pouvait ni se remettre ni se publier :
 * il vivait dans l'application, derrière une adresse et un serveur. Imprimer
 * donnait du papier ; rien ne donnait un fichier.
 *
 * Or c'est exactement ce qu'on demande à un directeur de la création : le cas
 * client pour un appel d'offres, l'extrait pour le showreel, le dossier qu'on
 * envoie à un prestataire qui n'a pas de compte. « À la clôture, la campagne
 * devient une entrée réutilisable. » Encore faut-il pouvoir la sortir.
 *
 * Ce module prend le dossier tel qu'il est composé à l'écran et en fait un
 * fichier autonome : les styles dedans, les visuels dedans, aucun script,
 * aucun serveur. Il s'ouvre par double-clic dans dix ans.
 *
 * Il ne réécrit rien. Ce qu'on exporte est ce qu'on lit — sinon l'export
 * devient un second document à tenir à jour, et il divergera.
 */

window.ETUDE = (function () {
  var el = O.el;

  /* Le chrome de l'application n'a rien à faire dans un cas client : les
   * gestes, les dettes de recevabilité, les renvois vers la doctrine sont des
   * outils de travail, pas du propos. */
  var A_RETIRER = [".prd-dette", ".prd-manque", "button", ".doc-lien",
    ".prp-gestes", ".recev", ".salle"];

  /* ————————————————————— Les visuels ————————————————————— */

  /* Un fichier autonome porte ses octets. On convertit chaque image en place ;
   * celle qu'on ne peut pas lire garde son chemin et se verra manquante — mieux
   * qu'un fichier qui prétend être complet. */
  function enData(src) {
    return fetch(src)
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (b) {
        if (!b) return null;
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onload = function () { res(String(fr.result)); };
          fr.onerror = function () { res(null); };
          fr.readAsDataURL(b);
        });
      })
      .catch(function () { return null; });
  }

  function inlinerImages(racine) {
    var imgs = [].slice.call(racine.querySelectorAll("img[src]"))
      .filter(function (x) { return !/^data:/.test(x.getAttribute("src")); });
    var faits = 0;
    return Promise.all(imgs.map(function (img) {
      return enData(img.getAttribute("src")).then(function (d) {
        if (d) { img.setAttribute("src", d); faits++; }
        else img.setAttribute("alt", (img.getAttribute("alt") || "") + " — visuel introuvable");
      });
    })).then(function () { return { total: imgs.length, faits: faits }; });
  }

  /* ————————————————————— Les styles ————————————————————— */

  /* On embarque les feuilles du produit telles quelles : le cas client doit
   * ressembler au produit, c'est une partie de ce qu'il démontre. Les polices
   * viennent du CDN — sans réseau le fichier s'ouvre quand même, sur la pile
   * de repli que les jetons déclarent déjà. */
  function styles() {
    var liens = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(function (l) { return l.getAttribute("href"); })
      .filter(function (h) { return h && !/^https?:/.test(h) && !/polices\.css$/.test(h); });
    return Promise.all(liens.map(function (h) {
      return fetch(h).then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; });
    })).then(function (bouts) { return bouts.join("\n"); });
  }

  /* ————————————————————— Le fichier ————————————————————— */

  function nomFichier(p) {
    var base = (p.ref ? p.ref + "-" : "") + (p.nom || "dossier");
    return O.normalise(base).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      + "-" + O.jour() + ".html";
  }

  /* `noeud` est le dossier déjà composé à l'écran : on le clone, on le nettoie,
   * on l'emballe. Rien n'est recomposé — ce qu'on lit est ce qui part. */
  function exporter(p, noeud) {
    if (!noeud) { AVIS.refus("Rien à exporter : le dossier n'est pas composé."); return; }

    AVIS.fait("Composition du dossier… les visuels sont intégrés au fichier, ça prend quelques secondes.");

    var clone = noeud.cloneNode(true);
    A_RETIRER.forEach(function (sel) {
      [].slice.call(clone.querySelectorAll(sel)).forEach(function (x) {
        if (x.parentNode) x.parentNode.removeChild(x);
      });
    });

    var ident = p.sections.identite || {};
    var titre = (p.ref ? p.ref + " · " : "") + p.nom;

    Promise.all([styles(), inlinerImages(clone)]).then(function (r) {
      var css = r[0];
      var im = r[1];

      var html = [
        "<!doctype html>",
        '<html lang="fr"><head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>" + echapper(titre) + "</title>",
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
          + "family=Asap:ital,wght@0,400..700;1,400..700&"
          + "family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap\">",
        "<style>",
        ':root { --affichage: "Asap", system-ui, sans-serif;',
        '        --lecture: "Source Serif 4", Georgia, serif; }',
        css,
        /* Le fichier n'est pas l'application : pas de rail, pas de grille à
         * deux colonnes, une marge de lecture et rien d'autre. */
        "html, body { margin: 0; display: block; }",
        "body { background: var(--surface-4); color: var(--clair);",
        "  font-family: var(--affichage); padding: 2.2rem 1.4rem 4rem; }",
        ".etude { max-width: 62rem; margin: 0 auto; }",
        ".etude-pied { margin-top: 3rem; padding-top: .8rem;",
        "  border-top: 1px solid var(--trait); font-size: var(--t-micro);",
        "  line-height: var(--lh-micro); letter-spacing: var(--ls-micro);",
        "  color: var(--clair-terne); }",
        "@media print { body { padding: 0; } .etude { max-width: none; } }",
        "</style></head><body>",
        '<div class="etude">',
        clone.outerHTML,
        '<div class="etude-pied">',
        echapper(titre),
        ident.client ? "  ·  " + echapper(ident.client) : "",
        "  ·  dossier composé le " + O.joli(new Date().toISOString()),
        "  ·  " + MAISON.nom,
        "<br>Fichier autonome : styles et visuels intégrés, aucun script. ",
        "Il porte l'état du dossier au jour de sa composition et ne se met pas à jour.",
        "</div></div></body></html>",
      ].join("\n");

      var nom = nomFichier(p);
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = nom;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

      DEPOT.tracer("export", "presentation", p.id, nom);
      AVIS.fait("« " + nom + " » est descendu."
        + (im.total ? "  " + im.faits + " visuels sur " + im.total + " sont dans le fichier." : "")
        + (im.faits < im.total ? "  Les autres n'ont pas pu être lus : ils se verront manquants."
          : "  Il s'ouvre par double-clic, sans serveur et sans compte."));
    }).catch(function (e) {
      AVIS.refus("L'export a échoué : " + (e && e.message ? e.message : "cause inconnue")
        + ". Le dossier reste lisible et imprimable à l'écran.");
    });
  }

  function echapper(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { exporter: exporter, nomFichier: nomFichier };
})();
