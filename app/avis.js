/* avis.js — dire quelque chose sans arrêter la main.
 *
 * `alert()` bloque la page, se fait bloquer par certains contextes, et casse
 * le geste en cours. Or ce qu'on a à dire est presque toujours un refus poli —
 * « ce champ est vide », « cette image est trop lourde ». Ça se lit, ça ne
 * s'interrompt pas.
 *
 * Un seul cas garde une interruption : la perte de données. Là, on veut être
 * arrêté.
 */

window.AVIS = (function () {
  var el = O.el;
  var pile = null;

  function zone() {
    if (pile && pile.parentNode) return pile;
    pile = el("div.avis-pile");
    document.body.appendChild(pile);
    return pile;
  }

  function poser(texte, ton, duree) {
    var n = el("div.avis." + (ton || "neutre"), {},
      el("span.avis-t", {}, texte),
      el("button.avis-x", { type: "button", onclick: function () { retirer(n); } }, "✕"));
    zone().appendChild(n);
    /* Une pile qui s'allonge indéfiniment devient un mur : trois au plus. */
    while (zone().children.length > 3) zone().removeChild(zone().firstChild);
    if (duree !== 0) setTimeout(function () { retirer(n); }, duree || 5200);
    return n;
  }

  function retirer(n) {
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  function refus(texte) { return poser(texte, "refus"); }
  function fait(texte) { return poser(texte, "fait"); }
  function grave(texte) { return poser(texte, "grave", 0); }

  return { poser: poser, refus: refus, fait: fait, grave: grave, retirer: retirer };
})();
