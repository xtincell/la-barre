/* termes-interdits.mjs — les mots qu'aucun écran de La Barre ne doit afficher.
 *
 * Ce sont les mots de tribunal et de doctrine relevés par l'audit d'adoption
 * (docs/audits/2026-11-26-adoption.md, constats fond-langage-1 à -4) : ils
 * font de chaque geste une procédure. La recette des captures les relève dans
 * le texte visible et dans les blocs repliés (outils/recette-captures.mjs).
 * La liste s'enrichira du glossaire validé par l'agence (chantier de
 * microcopie) ; elle ne s'invente pas ici.
 *
 * Les clés de données (`verdict`, `approuve`, `reserve`, `retour`, `hors`)
 * restent : Radar les lit. Seul le texte affiché est en cause. */

/* Une frontière de mot qui connaît les accents : \b ne voit pas « étage ». */
function mot(source, drapeaux = 'giu') {
  return new RegExp('(?<![\\p{L}\\p{N}_])(?:' + source + ')(?![\\p{L}\\p{N}_])', drapeaux);
}

export const TERMES_INTERDITS = [
  { terme: 'verdict', pourquoi: 'on valide une pièce, on ne rend pas un verdict', expression: mot('verdicts?') },
  { terme: 'opposable', pourquoi: 'vocabulaire de contentieux', expression: mot('opposables?') },
  { terme: 'imputable', pourquoi: 'vocabulaire de contentieux', expression: mot('imputables?') },
  { terme: 'sans recours', pourquoi: 'vocabulaire de contentieux', expression: mot('sans\\s+recours') },
  { terme: 'indéfendable', pourquoi: 'vocabulaire de contentieux', expression: mot('indéfendables?') },
  { terme: 'paragraphe', pourquoi: 'renvoi à une procédure que personne n’a lue', expression: mot('paragraphes?') },
  { terme: '§', pourquoi: 'renvoi à une procédure que personne n’a lue', expression: /§\s*\d+(?:\s*bis)?/gu },
  /* « porte A », « la porte B n'est pas arbitrée », et le compteur « La porte
   * 0 sur 1 ». Sensible à la casse : « la porte a claqué » passe. Le compteur
   * se lit même collé au mot suivant (« 0 sur 1un étage reste… »). */
  { terme: 'porte A/B/C', pourquoi: 'jargon de doctrine interne (« porte A », « la porte 0 sur 1 »)',
    expression: /(?<![\p{L}\p{N}_])[Pp]ortes?\s+(?:[ABC](?![\p{L}\p{N}_])|\d+\s+sur\s+\d+(?!\d))/gu },
  /* Dans La Barre, « étage » n'a qu'un sens : celui de la doctrine (« étage 1 »,
   * « l'étage qui commence », « un étage reste à franchir », « une école par
   * étage »). Il est relevé partout, sauf dans les tournures d'immeuble
   * (« un étage de bureaux », « les étages du siège »). Une étagère passe. */
  { terme: 'étage', pourquoi: 'jargon de doctrine interne (« étage 1 », « l’étage qui commence »)',
    expression: mot('étages?(?!\\s+(?:de\\s+bureaux|du\\s+siège|du\\s+bâtiment|de\\s+l[\'’]immeuble|d[\'’]un\\s+immeuble))') },
  { terme: 'hors écart déclaré', pourquoi: 'dire en clair ce que le marché a changé', expression: mot('hors\\s+écart\\s+déclaré') },
];

/* Relève les termes interdits d'un texte : combien de fois, et où (trois
 * extraits au plus, pour retrouver la phrase sans relire tout l'écran). */
export function relever(texte, termes = TERMES_INTERDITS) {
  const t = String(texte || '').replace(/\s+/g, ' ');
  const out = [];
  for (const { terme, expression } of termes) {
    const re = new RegExp(expression.source, expression.flags.includes('g') ? expression.flags : expression.flags + 'g');
    const trouves = [...t.matchAll(re)];
    if (!trouves.length) continue;
    out.push({ terme, nombre: trouves.length, extraits: trouves.slice(0, 3).map(m => {
      const debut = Math.max(0, m.index - 30), fin = Math.min(t.length, m.index + m[0].length + 30);
      return (debut > 0 ? '…' : '') + t.slice(debut, fin).trim() + (fin < t.length ? '…' : '');
    }) });
  }
  return out;
}

/* Ce qu'un écran ne doit jamais montrer non plus : une valeur de programme
 * restée brute (« Fermée par : undefined », « NaN j »). Relevées avec
 * `relever(texte, VALEURS_TECHNIQUES)`. Sensibles à la casse : « nulle part »
 * ou le prénom « Nan » ne comptent pas. */
export const VALEURS_TECHNIQUES = [
  { terme: 'undefined', expression: mot('undefined', 'gu') },
  { terme: 'null', expression: mot('null', 'gu') },
  { terme: 'NaN', expression: mot('NaN', 'gu') },
  { terme: '[object Object]', expression: /\[object [A-Z][A-Za-z]*\]/gu },
  { terme: 'Invalid Date', expression: /Invalid Date/gu },
];
