/* Le profil de la démonstration : une agence fictive, sur le profil neutre.
 * Aucun nom, aucune structure ni aucun document de l'installation historique. */
window.MAISON = MAISON_BASE.creer({
  nom: "Agence fictive",
  exempleDescription: "Démonstration — données fictives : une marque inventée, du brief au BAT.",
  titulaire: "creation",
  structures: [{ id: "agence-fictive", nom: "Agence fictive", court: "Agence fictive" }],
  structurePrincipale: "agence-fictive",
  registres: { people: "Registre des projets", radar: "Registre des briefs" },
});
