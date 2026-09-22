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

    return {
      livrable: l,
      nom: nomAttendu(p, l, conv),
      marque: mq ? mq.nom : null,
      campagne: cmp ? cmp.nom : null,
      marche: ma ? ma.nom : null,
      support: su ? su.nom : null,
      langue: (l.kv && l.kv.langue) || (ma && (ma.langues || [])[0]) || null,
      version: l.version || 1,
      droits: (l.assets || []).map(function (aid) {
        var a = DEPOT.trouve("assets", aid);
        if (!a) return null;
        var d = a.droits || {};
        return { asset: a.nom, zones: d.zones || [], expire: d.expire || null,
          cession: d.cession || null };
      }).filter(Boolean),
      manques: manques, alertesDroits: dr, mentionsManquantes: me,
      pret: !manques.length && !dr.length && !me.length,
    };
  }

  /* Le lot : ce qui est prêt à partir, et ce qui ne l'est pas. On ne remet que
   * ce qui a passé son verdict — remettre un livrable non validé, c'est
   * envoyer au client ce qu'on n'a pas encore accepté soi-même. */
  function lot(p) {
    var livrables = (p.livrables || []).filter(function (l) {
      if (l.annule) return false;
      var v = (l.versions || [])[(l.versions || []).length - 1];
      return v ? v.verdict === "approuve" : !!l.remise;
    });
    var pieces = livrables.map(function (l) { return piece(p, l); });
    return {
      pieces: pieces,
      prets: pieces.filter(function (x) { return x.pret; }).length,
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

  /* ————————————————————— Le manifeste, à l'écran ————————————————————— */

  function ouvrir(p) {
    var L = lot(p);
    if (!L.total) { AVIS.refus("Aucun livrable approuvé : la remise vient après le verdict."); return; }

    PANNEAU.ouvrir("Le paquet de remise", p.ref || p.nom, el("div", {},
      UI.banniere(L.prets === L.total ? "vert" : "",
        L.prets === L.total
          ? "Les " + L.total + " pièces portent leurs droits, leurs mentions et leur nommage."
          : (L.total - L.prets) + " pièces sur " + L.total + " partiraient incomplètes. "
            + "Le produit n'empêche rien : il dit ce que ça coûtera."),

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
      if (!x.pret) {
        lignes.push("  ⚠ " + x.manques.concat(x.alertesDroits)
          .concat(x.mentionsManquantes.length ? ["mentions absentes : " + x.mentionsManquantes.join(", ")] : [])
          .join(" · "));
      }
      lignes.push("");
    });
    var t = lignes.join("\n");
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    DEPOT.tracer("manifeste", "projets", p.id, L.total + " pièces");
    AVIS.fait("Le manifeste est dans le presse-papier — " + L.total
      + (L.total > 1 ? " pièces" : " pièce") + ".");
  }

  return { convention: convention, nomAttendu: nomAttendu, piece: piece, lot: lot,
    etat: etat, ouvrir: ouvrir, droits: droits, mentions: mentions };
})();
