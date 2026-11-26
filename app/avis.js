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
      el("button.avis-x", { type: "button", "aria-label": "Fermer", onclick: function () { retirer(n); } }, "✕"));
    return empiler(n, duree || 5200);
  }

  function empiler(n, duree) {
    zone().appendChild(n);
    /* Une pile qui s'allonge indéfiniment devient un mur : trois au plus. */
    while (zone().children.length > 3) zone().removeChild(zone().firstChild);
    if (duree !== 0) setTimeout(function () { retirer(n); }, duree);
    return n;
  }

  /* Un geste qu'on peut encore reprendre : le texte, et un bouton (« Annuler »)
   * qui appelle `quand`. L'avis reste le temps donné, celui pendant lequel le
   * geste peut se reprendre ; le fermer ne reprend rien. */
  function action(texte, libelle, quand, duree) {
    var n = el("div.avis.action", { role: "status" },
      el("span.avis-t", {}, texte),
      el("button.avis-a", { type: "button", onclick: function () { retirer(n); if (quand) quand(); } }, libelle || "Annuler"),
      el("button.avis-x", { type: "button", "aria-label": "Fermer", onclick: function () { retirer(n); } }, "✕"));
    return empiler(n, duree === 0 ? 0 : duree || 8000);
  }

  function retirer(n) {
    if (n && n.parentNode) n.parentNode.removeChild(n);
  }

  /* Un refus corrigé ne reste pas à l'écran : un nouveau refus, ou ce qui a
   * réussi, remplace les refus précédents au lieu de s'empiler sur eux. */
  function oublierRefus() {
    if (!pile) return;
    [].slice.call(pile.children).forEach(function (n) {
      if (n.classList && n.classList.contains("refus")) retirer(n);
    });
  }

  function refus(texte) { oublierRefus(); return poser(texte, "refus"); }
  function fait(texte) { oublierRefus(); return poser(texte, "fait"); }
  function grave(texte) { return poser(texte, "grave", 0); }

  return { poser: poser, action: action, refus: refus, fait: fait, grave: grave, retirer: retirer };
})();
