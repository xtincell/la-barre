/* La démonstration publique de La Barre.
 *
 * Ce fichier est chargé avant tout module : le dépôt (app/depot.js) lit
 * `LA_BARRE_DEMO` à son chargement. La page tourne alors sur la base fictive
 * posée à côté d'elle, en mémoire : elle ne lit ni le cache de ce navigateur,
 * ni un dépôt servi, ni le contexte de La Fusée, et n'écrit nulle part.
 *
 *   base      la base fictive, un fichier JSON à côté de cette page
 *   acteur    la personne fictive qui agit dans la démonstration
 *   vitrine   la page qui raconte la démonstration
 */
window.LA_BARRE_DEMO = { base: "base-fictive.json", acteur: "PE-clemence", vitrine: "../" };
