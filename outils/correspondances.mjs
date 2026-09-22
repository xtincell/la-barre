/* correspondances.mjs — ce que les libellés du corpus désignent dans le dépôt.
 *
 * Les registres d'où vient le corpus sont des registres de TRAVAIL : on y
 * écrit « Bonnet Rouge / Peak » parce que le brief portait sur les deux,
 * « Centrafrique (RCA) » parce qu'on avait les deux noms en tête, « Cadyst/
 * Panzani » parce que le compte s'appelle comme ça dans la boîte mail. Rien
 * de tout cela n'est une erreur. C'est simplement une autre langue que celle
 * du modèle.
 *
 * La traduction est écrite ici, à la main et en clair, pour trois raisons :
 *
 *   — Déduite à l'exécution, elle produirait quarante-huit marques dont une
 *     dizaine de doublons, et personne ne saurait lesquels.
 *   — Écrite, elle se relit. Une ligne fausse se voit et se corrige en un
 *     endroit, puis la passe se rejoue.
 *   — Ce qu'elle ne sait pas, elle le dit : `douteux` marque les rattachements
 *     que je propose sans pouvoir les prouver. Ils sortent au rapport et
 *     attendent un œil, au lieu d'entrer en silence.
 *
 * Rien ici n'est du métier : c'est de la maison, et d'une maison précise.
 */

/* ————— Les marchés ————— */

/* Le dépôt en porte dix-sept. Un seul manque au corpus — le Tchad. */
export const MARCHES_NEUFS = [
  { id: "M-TD", code: "TD", nom: "Tchad", langues: ["fr"], zone: "CEMAC",
    monnaie: "XAF", sku: [], mentions: [], decideurLocal: null, delaiRetour: null,
    joursFeries: [], source: "Radar AIR-001" },
];

/* Un libellé de pays, tel qu'il est écrit dans les registres, vers les marchés
 * qu'il désigne. Un libellé peut en désigner plusieurs : « Cameroun / Gabon »
 * est un brief à deux marchés, pas un marché nommé « Cameroun / Gabon ». */
export const MARCHES = {
  "Cameroun": ["M-CM"], "CM": ["M-CM"],
  "Côte d'Ivoire": ["M-CI"], "CIV": ["M-CI"],
  "Gabon": ["M-GA"],
  "Congo": ["M-CG"],
  "RDC": ["M-CD"],
  "Bénin": ["M-BJ"],
  "Togo": ["M-TG"],
  "Mali": ["M-ML"],
  "Burkina": ["M-BF"], "Burkina Faso": ["M-BF"],
  "Sénégal": ["M-SN"],
  "Ghana": ["M-GH"],
  "Afrique du Sud": ["M-ZA"],
  "Tchad": ["M-TD"],

  /* Trois orthographes, un pays. */
  "Centrafrique": ["M-CF"], "RCA": ["M-CF"], "Centrafrique (RCA)": ["M-CF"],

  /* Les libellés composés : plusieurs marchés, pas un marché de plus. */
  "Cameroun / Gabon": ["M-CM", "M-GA"],
  "Bénin / Togo": ["M-BJ", "M-TG"],
  "CIV, Burkina, Bénin, Togo, Mali": ["M-CI", "M-BF", "M-BJ", "M-TG", "M-ML"],
  "CM, Congo, RDC, Gabon, Sénégal, CIV, Burkina": ["M-CM", "M-CG", "M-CD", "M-GA", "M-SN", "M-CI", "M-BF"],
  "CM, Gabon, CIV": ["M-CM", "M-GA", "M-CI"],
  "CM, CIV": ["M-CM", "M-CI"],
  "CM, Gabon, CIV, Congo": ["M-CM", "M-GA", "M-CI", "M-CG"],
  "Congo, RDC": ["M-CG", "M-CD"],
  "Afrique Ouest & Centrale": ["M-CI", "M-GH", "M-CM", "M-CG", "M-GA", "M-SN"],

  /* Des zones, pas des pays. On ne fabrique pas un marché pour les porter :
   * ils restent sans rattachement et le rapport les nomme. */
  "Régional": [], "Export": [], "": [],

  /* Le Somaliland n'est pas un État reconnu et le dépôt porte « Somalie ».
   * Les rattacher serait un choix politique autant que documentaire, et ce
   * n'est pas au script de le faire. */
  "Somaliland": [],
};

/* ————— Les clients ————— */

export const CLIENTS_NEUFS = [
  { id: "C-cadyst", nom: "Cadyst Group", note: "Groupe camerounais : meunerie (Cadyst Grain), pâtes (La Pasta / Panzani), agriculture (Cadyst Farming)." },
  { id: "C-nsia", nom: "NSIA Assurances", note: "Groupe à marques filles : Tontines, Voyages, Auto, NSIA-BGFI." },
  { id: "C-tradex", nom: "TRADEX SA", note: "Distribution de carburants et lubrifiants." },
  { id: "C-danone", nom: "Danone / IDA X Brands", note: "Phosphatine, par l'intermédiaire d'IDA X Brands." },
  { id: "C-presynat", nom: "PRESYNAT" },
  { id: "C-maci", nom: "MACI" },
  { id: "C-lmt", nom: "LMT Group" },
  { id: "C-sofavin", nom: "Sofavin / Cap Esterias" },
  { id: "C-fokou", nom: "Fokou Gabon" },
  { id: "C-itie", nom: "ITIE RCA" },
  { id: "C-ucb", nom: "UCB" },
  { id: "C-upgraders", nom: "UPgraders", interne: true, note: "Venture du titulaire. Ses clients sont sous son compte." },
  { id: "C-friends", nom: "Friends Photography Studio SARL", interne: true, note: "Studio du titulaire." },
  { id: "C-propre", nom: "À son nom propre", interne: true, note: "Prospection et travaux signés en nom propre." },
  { id: "C-matanga", nom: "Interne Matanga", interne: true },
  { id: "C-divers", nom: "Comptes ponctuels", note: "Les comptes à un ou deux briefs, regroupés : Airtel, Arno, Florida, Olea, PAK, Payboard, Shoome, Le Drouot, Institut Français, Care CIV, Trade View, Delifood." },
];

/* Le libellé du registre → l'identifiant client. `null` : le libellé ne suffit
 * pas, c'est la campagne qui décidera. */
export const CLIENTS = {
  "FrieslandCampina": "C-fc",
  "Ecobank": "C-eco",
  "Bel Group": "C-bel",
  "La Vache qui rit (Bel)": "C-bel",
  "NSIA": "C-nsia", "NSIA Assurances": "C-nsia",
  "TRADEX SA": "C-tradex", "Tradex": "C-tradex",
  "Danone": "C-danone", "Phosphatine (Danone / IDA X Brands)": "C-danone",
  "Presynats": "C-presynat",
  "Sofavin/Cap Esterias": "C-sofavin",
  "Fokou Gabon": "C-fokou",
  "ITIE RCA": "C-itie",
  "UCB": "C-ucb",
  "Interne Matanga": "C-matanga", "xtincell": "C-matanga",
  "UPgraders — clients": "C-upgraders",
  "Friends Studio": "C-friends",
  "À ton nom propre": "C-propre",
  "Marques propres & ventures": "C-upgraders",

  /* Les ponctuels. */
  "Airtel Tchad": "C-divers", "Groupe Arno": "C-divers", "Florida": "C-divers",
  "Olea": "C-divers", "PAK": "C-divers", "Payboard": "C-divers",
  "Shoome": "C-divers", "Le Drouot": "C-divers", "Institut Français": "C-divers",
  "Care CIV": "C-divers", "Trade View": "C-divers", "Delifood": "C-divers",
  "Dr Pierre Somsé": "C-divers",
  "Autres comptes Matanga": "C-divers",

  /* Les intitulés de section du document, qui ne sont pas ceux du Radar. */
  "Cadyst Group": "C-cadyst",
  "La Vache qui rit (Groupe Bel)": "C-bel",
  "UPgraders": "C-upgraders",
  "Friends Studio (Friends Photography Studio SARL)": "C-friends",
  "Mama Makala": "C-mm",
};

/* Les rattachements que je propose sans pouvoir les prouver. Ils sont
 * appliqués — sinon la passe ne produit rien — mais sortent au rapport, et
 * c'est là qu'un œil tranche. */
export const CLIENTS_DOUTEUX = {
  "Cadyst/Panzani": {
    vers: "C-cadyst",
    pourquoi: "Le dépôt porte « C-panzani · Panzani Cameroun » avec ses dix-sept "
      + "marques de pâtes ; le Radar écrit « Cadyst/Panzani » et y range aussi la "
      + "meunerie et l'agriculture. Le groupe et la filiale ne sont pas la même "
      + "entité : je range sous le groupe et je laisse C-panzani en place, mais "
      + "c'est un arbitrage de structure, pas une lecture.",
  },
  "Mama Makala": {
    vers: "C-mm",
    pourquoi: "Le dépôt écrit « Mamy Makala », le Radar « Mama Makala ». Très "
      + "probablement la même marque mal orthographiée d'un côté — reste à savoir "
      + "lequel. Aucun document du corpus ne tranche.",
  },
};

/* ————— Les marques ————— */

export const MARQUES_NEUVES = [
  /* FrieslandCampina */
  { id: "MQ-fc", clientId: "C-fc", nom: "FrieslandCampina", note: "L'ombrelle." },
  { id: "MQ-nunu", clientId: "C-fc", nom: "Nunu" },
  { id: "MQ-bfromagerie", clientId: "C-fc", nom: "Belle Fromagerie" },
  { id: "MQ-btomate", clientId: "C-fc", nom: "Belle Tomate" },
  /* Cadyst */
  { id: "MQ-lapasta", clientId: "C-cadyst", nom: "La Pasta" },
  { id: "MQ-cgrain", clientId: "C-cadyst", nom: "Cadyst Grain" },
  { id: "MQ-cfarming", clientId: "C-cadyst", nom: "Cadyst Farming" },
  { id: "MQ-cgroup", clientId: "C-cadyst", nom: "Cadyst Group" },
  { id: "MQ-amigo", clientId: "C-cadyst", nom: "Amigo" },
  { id: "MQ-dailymarket", clientId: "C-cadyst", nom: "Daily Market" },
  /* NSIA */
  { id: "MQ-nsia", clientId: "C-nsia", nom: "NSIA" },
  { id: "MQ-nsia-tontines", clientId: "C-nsia", nom: "NSIA Tontines" },
  { id: "MQ-nsia-voyages", clientId: "C-nsia", nom: "NSIA Voyages" },
  { id: "MQ-nsia-auto", clientId: "C-nsia", nom: "NSIA Auto" },
  /* Autres */
  { id: "MQ-tradex", clientId: "C-tradex", nom: "Tradex" },
  { id: "MQ-phosphatine", clientId: "C-danone", nom: "Phosphatine" },
  { id: "MQ-apericube", clientId: "C-bel", nom: "Apéricube" },
  { id: "MQ-presynat", clientId: "C-presynat", nom: "PRESYNAT" },
  { id: "MQ-maci", clientId: "C-maci", nom: "MACI" },
  { id: "MQ-pearl", clientId: "C-divers", nom: "Pearl" },
  { id: "MQ-frutas", clientId: "C-fokou", nom: "Frutas" },
  { id: "MQ-kitoko", clientId: "C-fokou", nom: "Kitoko" },
  { id: "MQ-capesterias", clientId: "C-sofavin", nom: "Cap Esterias" },
  { id: "MQ-ava", clientId: "C-sofavin", nom: "AVA" },
  /* Ventures et studio */
  { id: "MQ-spawt", clientId: "C-upgraders", nom: "Spawt" },
  { id: "MQ-kof", clientId: "C-upgraders", nom: "KOF — Kamer Otaku Festival" },
  { id: "MQ-motion19", clientId: "C-upgraders", nom: "MOTION19" },
  { id: "MQ-musina", clientId: "C-upgraders", nom: "Musina" },
  { id: "MQ-dotbites", clientId: "C-upgraders", nom: "Dot Bites" },
  { id: "MQ-upgraders", clientId: "C-upgraders", nom: "UPgraders" },
  { id: "MQ-universal", clientId: "C-upgraders", nom: "Universal Music" },
  { id: "MQ-orange", clientId: "C-friends", nom: "Orange Cameroun" },
  { id: "MQ-doualart", clientId: "C-propre", nom: "Doual'art" },
  { id: "MQ-matanga", clientId: "C-matanga", nom: "Matanga Agency" },
  { id: "MQ-panzani", clientId: "C-panzani", nom: "Panzani" },
  /* Comptes de Friends Studio et d'UPgraders que les pièces nomment et que le
   * document raconte. Ceux que les pièces nomment SANS qu'aucune campagne les
   * raconte ne sont pas créés : une marque sans dossier ne sert personne, et
   * leurs pièces restent au fonds — le rapport les compte. */
  { id: "MQ-akwapalace", clientId: "C-upgraders", nom: "Akwa Palace" },
  { id: "MQ-banahealth", clientId: "C-upgraders", nom: "BanaHealth" },
  { id: "MQ-villacorso", clientId: "C-upgraders", nom: "Villa Corso" },
  { id: "MQ-goodlocs", clientId: "C-upgraders", nom: "Goodlocs" },
  { id: "MQ-spawt-app", clientId: "C-upgraders", nom: "Spawt — application" },
  { id: "MQ-forthecall", clientId: "C-friends", nom: "For The Call" },
  { id: "MQ-penetgrace", clientId: "C-friends", nom: "PEN&GRACE" },
  { id: "MQ-arcenciel", clientId: "C-propre", nom: "Arc en Ciel" },
  { id: "MQ-nyama", clientId: "C-propre", nom: "NYAMA" },
];

/* Le libellé → une ou plusieurs marques. Plusieurs : le brief portait sur
 * plusieurs marques, et c'est un fait du brief, pas une marque nouvelle. */
export const MARQUES = {
  "Bonnet Rouge": ["MQ-br"],
  "Peak": ["MQ-peak"],
  "Belle Hollandaise": ["MQ-bh"],
  "Rainbow": ["MQ-rainbow"],
  "Omela": ["MQ-omela"],
  "Nunu": ["MQ-nunu"],
  "Belle Fromagerie": ["MQ-bfromagerie"],
  "Belle Tomate": ["MQ-btomate"], "Belles Tomates": ["MQ-btomate"],
  "FrieslandCampina": ["MQ-fc"], "FrieslandCampina (ombrelle)": ["MQ-fc"],
  "La Vache qui rit": ["MQ-lvqr"], "La Vache Qui Rit": ["MQ-lvqr"],
  "La Vache qui rit (Bel)": ["MQ-lvqr"],
  "Apéricube": ["MQ-apericube"],
  "Ecobank": ["MQ-eco"],
  "La Pasta": ["MQ-lapasta"], "La Pasta First": ["MQ-pz-pasta-first"],
  "Cadyst Grain": ["MQ-cgrain"], "Cadyst Farming": ["MQ-cfarming"],
  "Cadyst Group": ["MQ-cgroup"], "Daily Market": ["MQ-dailymarket"],
  "Amigo": ["MQ-amigo"],
  "NSIA": ["MQ-nsia"], "NSIA Tontines": ["MQ-nsia-tontines"],
  "NSIA Voyages": ["MQ-nsia-voyages"], "NSIA Auto": ["MQ-nsia-auto"],
  "TRADEX": ["MQ-tradex"], "Tradex": ["MQ-tradex"], "Stations Tradex": ["MQ-tradex"],
  "Phosphatine": ["MQ-phosphatine"],
  "PRESYNAT": ["MQ-presynat"], "Presynats": ["MQ-presynat"],
  "MACI": ["MQ-maci"],
  "Pearl": ["MQ-pearl"],
  "Frutas": ["MQ-frutas"], "Kitoko": ["MQ-kitoko"],
  "Cap Esterias": ["MQ-capesterias"], "AVA": ["MQ-ava"],
  "Spawt": ["MQ-spawt"], "MOTION19": ["MQ-motion19"], "Musina": ["MQ-musina"],
  "Dot Bites": ["MQ-dotbites"], "UPgraders": ["MQ-upgraders"],
  "Universal Music": ["MQ-universal"], "Orange Cameroun": ["MQ-orange"],
  "Doual'art": ["MQ-doualart"],
  "Matanga Agency": ["MQ-matanga"],
  "Mamy Makala": ["MQ-mm"], "Mama Makala": ["MQ-mm"],

  /* Les briefs multi-marques : deux ou trois rattachements, zéro marque neuve. */
  "Bonnet Rouge / Peak": ["MQ-br", "MQ-peak"],
  "Peak / Bonnet Rouge": ["MQ-br", "MQ-peak"],
  "Bonnet Rouge / Peak / Belle Hollandaise": ["MQ-br", "MQ-peak", "MQ-bh"],
  "Delys&Barka": ["MQ-pz-delys", "MQ-pz-barka"],
  "Delys & Barka": ["MQ-pz-delys", "MQ-pz-barka"],
  "LaPasta/Panzani": ["MQ-lapasta"],

  /* Une gamme prise pour une marque : la marque, plus sa catégorie. */
  "Bonnet Rouge (EVAP)": ["MQ-br"],

  /* Les intitulés de section du document. */
  "NSIA Assurances": ["MQ-nsia"],
  "La Vache qui rit (Groupe Bel)": ["MQ-lvqr"],
  "Phosphatine (Danone / IDA X Brands)": ["MQ-phosphatine"],
  "Groupe Cadyst": ["MQ-cgroup"],
  "Panzani": ["MQ-panzani"],
  "Cadyst — Delys & Barka": ["MQ-pz-delys", "MQ-pz-barka"],
  "Rainbow · Nunu · Omela · Belle Fromagerie · Belle Tomate": ["MQ-rainbow", "MQ-nunu", "MQ-omela", "MQ-bfromagerie", "MQ-btomate"],
  "Panzani · Delys & Barka · Amigo · Cadyst Farming": ["MQ-panzani", "MQ-pz-delys", "MQ-pz-barka", "MQ-amigo", "MQ-cfarming"],

  /* Les marques que les pièces nomment et que le document raconte. */
  "Akwa Palace": ["MQ-akwapalace"],
  "BanaHealth": ["MQ-banahealth"],
  "Villa Corso": ["MQ-villacorso"],
  "Goodlocs": ["MQ-goodlocs"],
  "Kamer Otaku Festival": ["MQ-kof"],
  "Universal Music - artistes": ["MQ-universal"],
  "Universal Music & labels": ["MQ-universal"],
  "For The Call": ["MQ-forthecall"],
  "PEN&GRACE": ["MQ-penetgrace"],
  "Arc en Ciel": ["MQ-arcenciel"],
  "NYAMA": ["MQ-nyama"],

  /* Des intitulés de SECTION, pas des marques. Déclarés vides pour que le
   * rapport cesse de les signaler : ce ne sont pas des libellés inconnus,
   * ce sont des titres de chapitre. */
  "Autres comptes Matanga": [], "À ton nom propre": [],
  "Friends Studio (Friends Photography Studio SARL)": [],
  "UPgraders — clients": [], "UPgraders": [],
  "Marques propres & ventures": [], "Expérience Bimstr — avant Matanga": [],
  "Groupe": [], "groupe": [], "Clients": [], "clients": [],

  /* Ce qui n'est pas une marque : un service, une campagne, une personne. */
  "Direction des ventes": [], "NHPC": [], "Campagne législative": [],
  "Airtel Tchad": [], "Arno": [], "Florida": [], "ITIE RCA": [],
  "Institut Français": [], "Care CIV": [], "Le Drouot": [], "Olea": [],
  "PAK": [], "Payboard": [], "Shoome": [], "Trade View": [],
  "": [],
};

/* Les marques ombrelles. Un brief émis au nom de l'ombrelle couvre ses filles :
 * « Q2 2026 Goodness of Dairy » est écrit sous FrieslandCampina et s'exécute sur
 * Bonnet Rouge. Il ne CONTREDIT donc pas une campagne Bonnet Rouge, alors qu'un
 * brief Peak, lui, la contredit. Sans cette liste, le garde-fou de marque
 * refusait les briefs de groupe — les plus structurants du portefeuille. */
export const OMBRELLES = new Set([
  "MQ-fc", "MQ-cgroup", "MQ-nsia", "MQ-panzani", "MQ-lapasta", "MQ-matanga",
]);

/* La gamme que certains libellés portent en plus de la marque. */
export const CATEGORIES = { "Bonnet Rouge (EVAP)": "EVAP" };

/* ————— Les rôles tenus ————— */

export const ROLES = {
  BI:   "Big idea / plateforme — conception du récit",
  SUP:  "Supervision de département — pilotage DA + designers",
  DA:   "Direction artistique assurée directement",
  KV:   "Conception du master key visual",
  BR:   "Branding / identité",
  PKG:  "Packaging",
  DEV:  "Développement d'outil",
  PH:   "Photographie / production image",
  STR:  "Stratégie, prospection, recommandation",
  PART: "Participation — pas de responsabilité principale",
};

/* Le gabarit que les rôles suggèrent. Une suggestion : le rapport la nomme,
 * elle ne se substitue pas à une lecture. */
export function gabaritSuggere(roles) {
  const r = new Set(roles);
  const creatifs = ["BI", "KV", "DA", "SUP"].filter((x) => r.has(x));
  if (!creatifs.length && r.has("STR")) return "pitch";
  if (!creatifs.length && (r.has("BR") || r.has("DEV") || r.has("PKG") || r.has("PH"))) return "demande";
  return "campagne";
}

/* Les statuts du Radar qui prouvent qu'un brief est fini. Les autres ne
 * prouvent rien : « Frozen » n'est pas « terminé », c'est « arrêté ». */
export const STATUTS_CLOS = { "Bouclé": 1, "Archivé": 1, "Livré": 1 };
