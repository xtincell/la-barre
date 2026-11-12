/* Contract shared by the standalone tool and its La Barre consumer.
 * No network, storage, model or business writer in this boundary. */
window.APPROCHES_CONTEXT = (function () {
  var SCHEMA = 'la-barre-approches-v1';
  function validate(value) {
    if (!value || value.schema !== SCHEMA) throw Error('Le contexte La Barre n’est pas reconnu.');
    var out = { schema: SCHEMA };
    ['projectId', 'projectRef', 'projectName', 'depot', 'sourceVersion'].forEach(function (key) {
      if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 300)
        throw Error('Le contexte du projet est incomplet.');
      out[key] = value[key];
    });
    if (!/^[a-f0-9]{64}$/.test(out.sourceVersion)) throw Error('La version du brief est absente.');
    return out;
  }
  function readLaunch(hash) {
    if (!hash.startsWith('#la-barre=')) return null;
    if (hash.length > 200000) throw Error('Le brief transmis est trop volumineux.');
    var value = JSON.parse(decodeURIComponent(hash.slice('#la-barre='.length)));
    var brief = {};
    ['brand', 'product', 'benefit', 'problem', 'audience', 'market', 'constraints'].forEach(function (key) {
      if (typeof value.brief?.[key] !== 'string' || value.brief[key].length > 10000)
        throw Error('Le brief transmis est incomplet.');
      brief[key] = value.brief[key];
    });
    return { context: validate(value.context), brief: brief };
  }
  function storageKey(context) {
    return 'approches-work-v1' + (context ? ':' + encodeURIComponent(context.depot) + ':' + encodeURIComponent(context.projectId) : '');
  }
  async function version(value) {
    var bytes = new TextEncoder().encode(JSON.stringify(value));
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  return { schema: SCHEMA, validate: validate, readLaunch: readLaunch, storageKey: storageKey, version: version };
})();
