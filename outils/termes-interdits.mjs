/* termes-interdits.mjs — les mots qu'aucun écran de La Barre ne doit afficher.
 *
 * Ce sont les mots de tribunal et de doctrine relevés par l'audit d'adoption
 * (docs/audits/2026-11-26-adoption.md, constats fond-langage-1 à -4) : ils
 * font de chaque geste une procédure. La recette des captures les relève dans
 * le texte visible (outils/recette-captures.mjs). La liste s'enrichira du
 * glossaire validé par l'agence (chantier de microcopie) ; elle ne s'invente
 * pas ici.
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
  { terme: 'porte A/B/C', pourquoi: 'jargon de doctrine interne', expression: mot('[Pp]ortes?\\s+[ABC]', 'gu') },
  { terme: 'étage', pourquoi: 'jargon de doctrine interne (« étage 1 »)', expression: mot('étages?\\s*\\d+') },
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
