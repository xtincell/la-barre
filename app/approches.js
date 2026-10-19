/* The existing deterministic tool supplies proposals. La Barre alone stores
 * the project's pistes and decides their status. No model or second writer. */
window.APPROCHES = (function () {
  var el = O.el, contract = APPROCHES_CONTEXT;
  function texte(v) { return typeof v === 'string' ? v : ''; }
  function canonique(value) {
    if (Array.isArray(value)) return value.map(canonique);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(function (key) { return [key, canonique(value[key])]; }));
    return value;
  }
  function identite(data, route) {
    var c = data.context;
    return JSON.stringify(canonique({ context: c && { schema: c.schema, depot: c.depot,
      projectId: c.projectId, sourceVersion: c.sourceVersion },
      methodVersion: data.methodVersion, brief: data.brief, route: route }));
  }
  function brief(p) {
    var s = p.sections || {}, b = s.brief || {}, identite = s.identite || {};
    var noms = (identite.marqueIds || []).map(function (id) { return (DEPOT.trouve('marques', id) || {}).nom || ''; }).filter(Boolean);
    return { brand: noms.join(' / '), product: texte(identite.produit),
      benefit: texte(b.promesse), problem: texte(b.probleme), audience: texte(b.cible), market: texte(b.marche),
      constraints: [texte(b.contraintes), texte(b.ton)].concat(b.mandatories || []).filter(Boolean).join('\n') };
  }
  async function contexte(p) {
    var s = p.sections || {};
    return contract.validate({ schema: contract.schema, projectId: p.id,
      projectRef: p.ref || p.id, projectName: p.nom || p.ref || p.id,
      depot: DEPOT.poids().fichier || DEPOT.tout().reference || 'sans-fichier',
      sourceVersion: await contract.version({ brief: brief(p), identite: s.identite || {},
        strategie: s.strategie || {}, socle: s.socle || {} }) });
  }
  async function lien(p) {
    var payload = { context: await contexte(p), brief: brief(p) };
    // The brief is a local fragment: never an HTTP query or a provider request.
    var hash = '#la-barre=' + encodeURIComponent(JSON.stringify(payload));
    contract.readLaunch(hash); // Same boundary as the standalone receiver.
    return 'app/ateliers/approches/index.html' + hash;
  }
  async function lire(data, p) {
    if (!data || data.methodVersion !== 2 || !data.brief || typeof data.brief.seed !== 'string'
      || !Array.isArray(data.routes) || data.routes.length < 1 || data.routes.length > 8)
      throw Error('Ce fichier n’est pas un tirage de la méthode prise en charge.');
    var context = contract.validate(data.context), current = await contexte(p);
    if (context.depot !== current.depot || context.projectId !== current.projectId)
      throw Error('Ce tirage appartient à un autre dossier ou projet.');
    if (context.sourceVersion !== current.sourceVersion)
      throw Error('Le brief source a changé. Rouvrez le générateur depuis ce projet.');
    var ids = new Set();
    data.routes.forEach(function (r) {
      if (!r || !Number.isInteger(r.i) || ids.has(r.i)
        || ['title', 'one', 'prompt'].some(function (k) { return typeof r[k] !== 'string' || !r[k].trim() || r[k].length > 30000; }))
        throw Error('Une piste du tirage est incomplète.');
      ids.add(r.i);
    });
    return data;
  }
  async function admettre(p, data, routeId) {
    var current = DEPOT.trouve('projets', p.id);
    if (!current || current.fusionne) throw Error('Ce projet n’est plus disponible.');
    var route = data?.routes?.find(function (r) { return r.i === routeId; });
    if (!route) throw Error('Choisissez une piste du tirage.');
    // A JSON export may reorder object keys on reload. Identify the logical
    // proposal while retaining the original file and the sourceVersion contract.
    var signature = identite(data, route), importId = await contract.version(signature);
    function dejaRecue(pi) {
      var recu = pi.provenance_approches, original = recu?.original;
      var oldRoute = original?.routes?.find(function (r) { return r.i === recu.routeId; });
      // Preserve earlier order-sensitive receipts; no data migration or new piste.
      return recu?.id === importId || Boolean(original && oldRoute && identite(original, oldRoute) === signature);
    }
    var pistes = (current.sections || {}).pistes || [];
    var prior = pistes.find(dejaRecue);
    if (prior) return { piste: prior, dejaRecu: true };
    await lire(data, current); // Recheck after the preview, before any mutation.
    prior = ((current.sections || {}).pistes || []).find(dejaRecue);
    if (prior) return { piste: prior, dejaRecu: true };
    var pi = { id: O.id('PI'), titre: route.title, concept: route.one,
      axe_directrice: route.one, statut: 'proposee', version: 1, soumis_le: new Date().toISOString(),
      provenance_approches: { id: importId, recu_le: new Date().toISOString(),
        statut: 'INFERRED', acteur: ACTEUR.trace(), routeId: routeId,
        original: JSON.parse(JSON.stringify(data)) } };
    if (!current.sections) current.sections = {};
    if (!current.sections.pistes) current.sections.pistes = [];
    current.sections.pistes.push(pi);
    DEPOT.tracer('approche reçue', 'pistes', current.id, pi.titre + ' · méthode ' + data.methodVersion);
    DEPOT.enregistrer();
    return { piste: pi, dejaRecu: false };
  }
  function importer(p, apres) {
    var input = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Tirage du générateur d’approches' });
    var choix = el('select', { 'aria-label': 'Piste à proposer' }), detail = el('p'), retour = el('p', { role: 'status' });
    var data = null;
    var bouton = el('button.b.or', { type: 'button', disabled: true, onclick: async function () {
      bouton.disabled = true;
      try {
        var result = await admettre(p, data, Number(choix.value));
        retour.textContent = 'Proposition conservée dans ce navigateur ; écriture du dossier en cours…';
        DEPOT.ecrireSurDisque(function (ok, message) {
          retour.textContent = ok ? (result.dejaRecu ? 'Proposition déjà reçue, sans doublon.' : 'Proposition reçue dans le dossier, à développer et arbitrer.')
            : 'Proposition conservée localement. Le fichier n’a pas confirmé l’écriture : ' + (message || 'consultez la sauvegarde.');
          bouton.disabled = false; if (apres) apres();
        });
      } catch (error) { retour.textContent = error.message; bouton.disabled = false; }
    } }, 'Recevoir comme proposition');
    function montrer() {
      var route = data?.routes.find(function (r) { return r.i === Number(choix.value); });
      detail.textContent = route ? route.one : '';
    }
    choix.onchange = montrer;
    input.onchange = async function () {
      data = null; bouton.disabled = true; O.vider(choix); detail.textContent = '';
      try {
        var file = input.files[0]; if (!file) return;
        if (file.size > 2000000) throw Error('Le fichier dépasse 2 Mo.');
        data = await lire(JSON.parse(await file.text()), DEPOT.trouve('projets', p.id) || p);
        data.routes.forEach(function (r) { choix.appendChild(el('option', { value: String(r.i) }, r.i + ' · ' + r.title)); });
        montrer(); bouton.disabled = false;
        retour.textContent = 'Projet et version du brief reconnus. Choisissez la piste à proposer ; aucun arbitrage ne sera créé.';
      } catch (error) { retour.textContent = error.message; }
    };
    PANNEAU.ouvrir('Recevoir une approche', p.ref, el('div', {},
      el('p', {}, 'Importez le JSON du générateur ouvert depuis ce projet. La matrice propose une structure ; elle ne démontre ni la pertinence créative ni le respect des contraintes libres.'),
      input, choix, detail, bouton, retour), O.poste('da').couleur);
  }
  function bloc(p, apres) {
    var message = el('p', { role: 'status' });
    return el('div.form-actions', {},
      el('button.b.nu', { type: 'button', onclick: async function () {
        try { location.href = await lien(p); } catch (error) { message.textContent = error.message; }
      } }, 'Explorer des approches'),
      el('button.b.nu', { type: 'button', onclick: function () { importer(p, apres); } }, 'Recevoir une approche'), message);
  }
  function source(pi) {
    var recu = pi.provenance_approches;
    if (!recu) return null;
    return el('div.prix', {},
      el('p', {}, 'Proposition issue du générateur d’approches · méthode ' + recu.original.methodVersion
        + ' · seed ' + recu.original.brief.seed + '. À développer et arbitrer ; compatibilité de catégories sans validation créative.'),
      el('button.b.nu', { type: 'button', onclick: function () {
        var url = URL.createObjectURL(new Blob([JSON.stringify(recu.original, null, 2)], { type: 'application/json' }));
        var a = document.createElement('a'); a.href = url; a.download = 'approches-' + pi.id + '.json'; a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } }, 'Retrouver le tirage source'));
  }
  return { brief: brief, contexte: contexte, lien: lien, lire: lire, admettre: admettre, bloc: bloc, source: source };
})();
