/* renvoi.js — « ceci n'est pas à moi ».
 *
 * L'outil n'envoie rien : il rédige. Tu portes le message par ton canal, et
 * l'attente reste ici avec sa date jusqu'à ce que ça revienne.
 */

window.RENVOI = (function () {
  var el = O.el;

  /* La table des souverainetés : à qui revient quoi. Source : processus §6. */
  var SOUVERAINETES = {
    "brief-incomplet": { poste: "clientele", critere: "§8 — l'un des onze champs critiques est vide" },
    "brief-concept": { poste: "clientele", critere: "§8 — le brief contient un concept, une accroche ou une piste visuelle" },
    "territoire": { poste: "planning", critere: "§6 — le territoire et l'axe sont décidés par le Planning" },
    "prix": { poste: "clientele", critere: "§6 — la Création ne s'engage sur aucun prix" },
    "modification-seance": { poste: "clientele", critere: "Face à une demande en séance, la réponse est un délai, jamais un accord immédiat" },
    "entree": { poste: null, critere: "L'élément d'entrée porte son fournisseur et sa date" },
    "perimetre": { poste: "clientele", critere: "Toute remise en cause d'un élément validé constitue un nouveau brief" },
    "etage": { poste: "da", critere: "§8 — la proposition sort de l'étage autorisé" },
    "sacrifice": { poste: "da", critere: "§8 — une piste ne porte pas son sacrifice et son argument" },
    "egalite": { poste: "da", critere: "§8 — plusieurs pistes sont recommandées à égalité" },
    "accroche": { poste: "da", critere: "§8 — une accroche dépasse cinq mots" },
    "porteurs": { poste: "da", critere: "§8 — le livrable perd deux de ses trois porteurs de reconnaissance" },
    "conformite": { poste: "graphic", critere: "Conformité technique des fichiers livrés" },
    "droits": { poste: "motion", critere: "Respect des droits : musiques, images, licences" },
    "sources": { poste: "graphic", critere: "Sources rangées et nommées selon la convention" },
    "maitre": { poste: "da", critere: "Adaptation produite sur une version dépassée du master" },
    "autre": { poste: null, critere: null },
  };

  function motifs() {
    return Object.keys(SOUVERAINETES).map(function (k) {
      return { cle: k, critere: SOUVERAINETES[k].critere, poste: SOUVERAINETES[k].poste };
    });
  }

  /* ————— L'écran de renvoi ————— */

  function ouvrir(contexte) {
    /* contexte : { objet, quoi, projet, cible } */
    var choix = "brief-incomplet";
    var destinataire = "";
    var attendu = "";
    var echeance = "";
    var apercu = el("div.attente-ligne");

    var selMotif = el("select", {});
    motifs().forEach(function (m) {
      selMotif.appendChild(el("option", { value: m.cle }, m.critere || "Autre motif, à écrire"));
    });

    var selQui = el("select", {});
    function remplirQui(postePropose) {
      O.vider(selQui);
      selQui.appendChild(el("option", { value: "" }, "— destinataire —"));
      DEPOT.liste("personnes").forEach(function (p) {
        var o = el("option", { value: p.id }, p.nom + " · " + O.poste(p.poste).court);
        if (postePropose && p.poste === postePropose && !destinataire) { o.selected = true; destinataire = p.id; }
        selQui.appendChild(o);
      });
    }
    remplirQui(SOUVERAINETES[choix].poste);

    var champAttendu = el("textarea", { rows: 2, placeholder: "Ce que j'attends en retour" });
    var champEcheance = el("input", { type: "date" });
    var champLibre = el("textarea", { rows: 2, placeholder: "Motif, si « autre »" });

    function rafraichir() {
      var s = SOUVERAINETES[choix];
      var p = destinataire ? DEPOT.trouve("personnes", destinataire) : null;
      O.vider(apercu);
      apercu.appendChild(el("div.tete", {},
        el("b", {}, p ? p.nom : "— destinataire —"),
        O.jeton(p ? p.poste : "creation"),
        el("span.age", {}, echeance ? "pour le " + O.joli(echeance) : "sans échéance")
      ));
      apercu.appendChild(el("div.critere", {}, s.critere || champLibre.value || "Motif à écrire"));
      apercu.appendChild(el("div.message", {}, message()));
    }

    function ponctuer(t) {
      var x = String(t).trim();
      return /[.!?]$/.test(x) ? x : x + ".";
    }

    function message() {
      var s = SOUVERAINETES[choix];
      var p = destinataire ? DEPOT.trouve("personnes", destinataire) : null;
      var l = [];
      l.push((p ? p.nom : "") + ",");
      l.push("");
      l.push("Objet : " + (contexte.quoi || "élément renvoyé") + (contexte.projet ? " — " + contexte.projet : ""));
      l.push("");
      l.push("Je te renvoie ce point : il relève de ton périmètre.");
      if (s.critere) l.push("Critère opposé : " + s.critere + ".");
      if (choix === "autre" && champLibre.value) l.push("Motif : " + ponctuer(champLibre.value));
      if (champAttendu.value) l.push("Ce que j'attends : " + ponctuer(champAttendu.value));
      if (echeance) l.push("Pour le " + O.joli(echeance) + ".");
      l.push("");
      l.push("Tant que ce n'est pas revenu, l'avancement de ce point est suspendu de mon côté.");
      return l.join("\n");
    }

    selMotif.addEventListener("change", function () {
      choix = selMotif.value;
      destinataire = "";
      remplirQui(SOUVERAINETES[choix].poste);
      rafraichir();
    });
    selQui.addEventListener("change", function () { destinataire = selQui.value; rafraichir(); });
    champAttendu.addEventListener("input", rafraichir);
    champLibre.addEventListener("input", rafraichir);
    champEcheance.addEventListener("change", function () { echeance = champEcheance.value; rafraichir(); });

    rafraichir();

    var corps = el("div", {},
      el("div.form", {},
        el("div.champ", {}, el("label", {}, "Sur quel critère"), selMotif),
        el("div.champ", {}, el("label", {}, "À qui"), el("div.indice", {}, "Proposé par la table des souverainetés. Une personne, jamais une direction."), selQui),
        el("div.champ", {}, el("label", {}, "Ce que j'attends"), champAttendu),
        el("div.champ", {}, el("label", {}, "Pour quand"), champEcheance),
        el("div.champ", {}, el("label", {}, "Si « autre motif »"), champLibre)
      ),
      PANNEAU.sousbloc("Le message, prêt à porter", apercu),
      el("div.form-actions", {},
        el("button.bouton", {
          type: "button",
          onclick: function () {
            if (!destinataire) { AVIS.refus("Nomme une personne : un renvoi ne s'adresse pas à une direction."); return; }
            var s = SOUVERAINETES[choix];
            DEPOT.ajoute("attentes", {
              quoi: contexte.quoi || "",
              projet: contexte.projet || null,
              projetId: contexte.projetId || null,
              objet: contexte.objet || null,
              destinataire: destinataire,
              motif: choix,
              critere: s.critere || champLibre.value,
              attendu: champAttendu.value,
              echeance: echeance || null,
              message: message(),
              envoye_le: new Date().toISOString(),
              resolu_le: null,
            });
            PANNEAU.fermer();
            if (window.APP) APP.rendre();
          },
        }, "Créer l'attente"),
        el("button.bouton.creux", {
          type: "button",
          onclick: function () {
            navigator.clipboard && navigator.clipboard.writeText(message());
          },
        }, "Copier le message"),
        el("button.bouton.creux", { type: "button", onclick: PANNEAU.fermer }, "Annuler")
      )
    );

    PANNEAU.ouvrir("Renvoyer — ceci n'est pas à moi", contexte.quoi || "", corps, "var(--attente)");
  }

  function resoudre(id) {
    DEPOT.modifie("attentes", id, { resolu_le: new Date().toISOString() }, "attente résolue");
    if (window.APP) APP.rendre();
  }

  function ouvertes() {
    return DEPOT.liste("attentes").filter(function (a) { return !a.resolu_le; })
      .sort(function (a, b) { return new Date(a.envoye_le) - new Date(b.envoye_le); });
  }

  return { ouvrir: ouvrir, resoudre: resoudre, ouvertes: ouvertes, motifs: motifs };
})();
