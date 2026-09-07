/* outils.js — construction d'éléments, dates, formatage.
 * Aucun cadriciel. Le texte passe toujours par textContent.
 */

window.O = (function () {
  function el(selecteur, attributs) {
    var parties = String(selecteur).split(".");
    var balise = parties.shift() || "div";
    var noeud = document.createElement(balise);
    if (parties.length) noeud.className = parties.join(" ");

    var debut = 1;
    if (attributs && typeof attributs === "object" && !(attributs instanceof Node) && !Array.isArray(attributs)) {
      debut = 2;
      Object.keys(attributs).forEach(function (cle) {
        var v = attributs[cle];
        if (v === null || v === undefined || v === false) return;
        if (cle === "style" && typeof v === "object") {
          Object.keys(v).forEach(function (p) { noeud.style.setProperty(p, v[p]); });
        } else if (cle.slice(0, 2) === "on" && typeof v === "function") {
          noeud.addEventListener(cle.slice(2), v);
        } else {
          noeud.setAttribute(cle, v === true ? "" : v);
        }
      });
    }
    for (var i = debut; i < arguments.length; i++) ajouter(noeud, arguments[i]);
    return noeud;
  }

  function ajouter(parent, enfant) {
    if (enfant === null || enfant === undefined || enfant === false) return;
    if (Array.isArray(enfant)) { enfant.forEach(function (e) { ajouter(parent, e); }); return; }
    if (enfant instanceof Node) { parent.appendChild(enfant); return; }
    parent.appendChild(document.createTextNode(String(enfant)));
  }

  function vider(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  /* ————————————————————— Le mouvement, et rien de plus —————————————————————
   *
   * Trois moments seulement, tous liés à une décision : le verdict rendu, le
   * blocage résolu, le renvoi parti. Rien au survol, rien à l'arrivée d'un
   * écran. Le mouvement dit « c'est enregistré » — il ne décore pas.
   *
   * Le plafond du produit est de vingt secondes par geste. Une animation s'y
   * prend : aucune ne dépasse 220 ms, et le bloc prefers-reduced-motion de
   * base.css les ramène toutes à 1 ms si le système le demande. */

  var BOUGE = !window.matchMedia
    || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Faire sortir un nœud, puis rendre la suite. Si l'animation n'a pas lieu —
   * réglage système, nœud détaché, navigateur sans animationend — on appelle
   * quand même : un geste ne doit jamais dépendre d'une décoration. */
  function sortir(noeud, apres) {
    if (!noeud || !BOUGE || !noeud.parentNode) { if (apres) apres(); return; }
    var fait = false;
    function fini() { if (fait) return; fait = true; if (apres) apres(); }
    /* La classe d'arrivée peut encore être là — animationend ne se déclenche
     * pas si le nœud a été remplacé entre-temps. Les deux animations
     * cohabitaient alors, et c'est l'arrivée qui gagnait : la carte ne
     * sortait jamais. */
    noeud.classList.remove("s-arrive");
    noeud.addEventListener("animationend", fini, { once: true });
    setTimeout(fini, 260);
    noeud.classList.add("s-sort");
  }

  /* Poser la classe d'arrivée sur le remplaçant. Elle se retire seule : sans
   * ça, un nœud réanimerait à chaque re-rendu. */
  function arrive(noeud, retard) {
    if (!noeud || !BOUGE) return noeud;
    if (retard) noeud.style.animationDelay = retard + "ms";
    noeud.classList.add("s-arrive");
    function net() { noeud.classList.remove("s-arrive"); noeud.style.animationDelay = ""; }
    noeud.addEventListener("animationend", net, { once: true });
    /* Filet : un nœud jamais peint — onglet en arrière-plan, rendu annulé —
     * ne recevra pas animationend et garderait sa classe pour toujours. */
    setTimeout(net, 400);
    return noeud;
  }

  /* Un blocage vit à quatre endroits à la fois — le rail, la carte du dossier,
   * la charge, la file. Quand il tombe, il tombe partout en même temps :
   * c'est ce qui rend la résolution croyable. */
  function resoudrePartout(cle, apres) {
    var noeuds = document.querySelectorAll('[data-blocage="' + cle + '"]');
    if (!noeuds.length || !BOUGE) { if (apres) apres(); return; }
    for (var i = 0; i < noeuds.length; i++) noeuds[i].classList.add("s-resolu");
    setTimeout(function () { if (apres) apres(); }, 220);
  }

  /* ————— Dates ————— */

  function auj() { return new Date(); }

  /* Sans argument, c'est aujourd'hui — appelé à vide, `new Date(undefined)`
   * rendait une date invalide qui se propageait en NaN. */
  function jour(d) {
    var x = d === undefined || d === null ? auj() : (d instanceof Date ? d : new Date(d));
    return x.getFullYear() + "-" + p2(x.getMonth() + 1) + "-" + p2(x.getDate());
  }

  function p2(n) { return n < 10 ? "0" + n : String(n); }

  var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function joli(d) {
    if (!d) return "—";
    var x = d instanceof Date ? d : new Date(d);
    if (isNaN(x)) return String(d);
    return x.getDate() + " " + MOIS[x.getMonth()];
  }

  function jolieHeure(d) {
    if (!d) return "";
    var x = d instanceof Date ? d : new Date(d);
    return p2(x.getHours()) + ":" + p2(x.getMinutes());
  }

  /* Nombre de jours entiers depuis une date. */
  function depuis(d) {
    if (!d) return 0;
    var x = d instanceof Date ? d : new Date(d);
    return Math.max(0, Math.floor((auj() - x) / 86400000));
  }

  function ancien(d) {
    var n = depuis(d);
    if (n === 0) return "aujourd'hui";
    if (n === 1) return "1 jour";
    return n + " jours";
  }

  /* Numéro de semaine ISO, pour la frise. */
  /* Une date de calendrier se lit d'un coup d'œil : le jour et le mois, sans
   * l'année qu'on connaît déjà. « jeu 10 sept » se repère dans une colonne ;
   * « 10 septembre 2026 » se lit. */
  var JOURS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  var MOIS_COURT = ["janv", "févr", "mars", "avr", "mai", "juin",
    "juil", "août", "sept", "oct", "nov", "déc"];

  function jourCourt(d) {
    if (!d) return "";
    var x = new Date(d);
    if (isNaN(x)) return String(d);
    return JOURS[x.getDay()] + " " + x.getDate() + " " + MOIS_COURT[x.getMonth()];
  }

  function semaine(d) {
    var x = new Date(d instanceof Date ? d.getTime() : new Date(d).getTime());
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
    var premier = new Date(x.getFullYear(), 0, 4);
    return 1 + Math.round(((x - premier) / 86400000 - 3 + ((premier.getDay() + 6) % 7)) / 7);
  }

  /* ————— Divers ————— */

  function id(prefixe) {
    return prefixe + "-" + Math.random().toString(36).slice(2, 8);
  }

  function poste(cle) {
    var t = null;
    MAISON.postes.forEach(function (p) { if (p.cle === cle) t = p; });
    return t || { cle: cle, nom: cle, court: cle, couleur: "var(--clair-terne)" };
  }

  function jeton(cleP, texte) {
    var p = poste(cleP);
    return el("span.jeton", { style: { background: p.couleur } }, texte || p.court);
  }

  /* Recherche insensible aux accents et à la casse. */
  function normalise(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  /* Un montant se lit par tranches. « 4350000 » ne se lit pas, « 4 350 000 » si. */
  function milliers(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  }

  /* Un jour et demi s'écrit « 1,5 » en français, et « 2 » quand c'est deux. */
  function decimal(n) {
    var v = Math.round((Number(n) || 0) * 10) / 10;
    return (v % 1 ? v.toFixed(1).replace(".", ",") : String(v));
  }

  function contient(paille, aiguille) {
    return normalise(paille).indexOf(normalise(aiguille)) !== -1;
  }

  /* Une langue se stocke en code et se lit en toutes lettres. */
  function langue(code) {
    if (!code) return "";
    return (MAISON.langues || {})[code] || code;
  }

  return {
    el: el, vider: vider, sortir: sortir, arrive: arrive,
    resoudrePartout: resoudrePartout, jour: jour, joli: joli, jolieHeure: jolieHeure,
    depuis: depuis, ancien: ancien, semaine: semaine, auj: auj, jourCourt: jourCourt,
    id: id, poste: poste, jeton: jeton, normalise: normalise, contient: contient,
    milliers: milliers, decimal: decimal,
    langue: langue,
  };
})();
