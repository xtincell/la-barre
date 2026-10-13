# Conventions de rangement — UPgraders et coffre personnel

Ces conventions sont celles appliquées sur l'iMac Matanga en octobre 2026, fixées par Alex au fil du rangement.

## Qui est quoi

| Structure | Ce qui y va |
|---|---|
| **Matanga Agency** | Le travail pour les clients de l'agence. Il vit sur l'iMac, dans `MATANGA — EXPORT DU TRAVAIL`. **Il n'est pas à traiter ici.** |
| **UPgraders SARL** | Conseil marketing, design, événementiel (KOF, Cysoul, Musina…), La Fusée (l'OS ADVE), les prospects. |
| **Friends Photography Studio SARL** | La photo, au nom d'Alex, sous couvert du studio. |
| **Xtincell** | L'activité en nom propre : projets personnels, Beignet Paradise, tests de skills, veille. Rangée sous UPgraders. |
| **Le coffre** | Les documents personnels d'Alex. Jamais dans un export, jamais dans LA BARRE. |

**Les factures font foi.** Une facture UPgraders, c'est UPgraders ; une facture Friends, c'est Friends. Un devis seul ne prouve pas qu'une opération a eu lieu.

## L'export UPgraders

```
UPGRADERS — EXPORT DU TRAVAIL/
  <Client>/
    PORTEUR.md
    <AAAA>/                          puis l'opération si le client en a plusieurs
    01 CAMPAGNES/ 02 BRANDING & IDENTITÉ/ 03 DIGITAL & SOCIAL/ 06 BRIEFS & STRATÉGIE/ 07 MASTERS & DÉCLINAISONS/ 08 PRODUIT & APPLICATION/
                                     (la forme d'origine, quand le client était déjà rangé ainsi)
  Friends Photography Studio/
    <Client>/<AAAA>/                 Orange Cameroun, McCann, KossKoss Select, Kempinski…
    Commandes privées/
    _Le studio/
  Xtincell/
    <AAAA>/  Beignet Paradise/  Archives chaîne YouTube/  Travaux motion (freelance)/  Marques fictives & exercices/
  _UPgraders — la structure/         statuts, offres, modèles, La Fusée (et ses recettes), Catalyse
  _Prospects (non gagnés)/
  _À identifier — vidéos/
```

Les clients déjà connus sur l'iMac : AMMCO, Akwa Palace, Anatomy by Roida, Arc en Ciel, BFA — Business Femmes Actives, BanaHealth, Cosmos Bubble Tea, Divine Afro Hair, Fantribe, France Volontaires, Godliner, Goodlocs, Grand Prix de caisse à savon de Yaoundé, IFC Douala, KOF - Kamer Otaku Fest, Kinara, Kwatta Vibes, MLD, MOTION19, Massanda Awe Coffee, Meta Trade, Musina, NYAMA, Paradis des Anges, Shakazz, Shinkiro, Spawt, StreetWhale, Universal Music - artistes, Villa Corso.

Lightbringer en a relevé 121, dont beaucoup de nouveaux : MTN Cameroon, CFAO Mobility, Cysoul, Chococam… Respecte les noms existants. Un client nouveau prend un nom lisible, sans abréviation inventée.

## Le coffre personnel

```
<coffre>/
  Abonnements/ Administratif/ Assurances/ Banque/ Carrière/ Contrats/ Correspondance/ Identité/ Logement/ Voyages/
```

Sur l'iMac, le coffre est `Work 2026/07 PERSONNEL & DIVERS/Privé et partagé/`. Sur Lightbringer, c'était `PERSONNEL — ALEXANDRE\_Privé — documents`. On range par catégorie, sans renommer les pièces d'identité et sans jamais transcrire un contenu.

## Les règles de fichier

- **EXE** : les `.ai`, `.psd`, `.psb` et `.eps` vont dans un sous-dossier `EXE/` du dossier dédié, jamais à plat à côté des visuels.
- **Nommage** : on ne renomme que les fichiers mal nommés (`IMG_1234`, `Copie de…`, `Untitled-3`, `WhatsApp Image…`). Le format est `<Marque> — <Campagne AAAA> — <Type> — <Description>, <précision> (<LANGUE>).<ext>`. Le nom d'origine reste dans le manifeste.
- **Vocabulaire d'Alex** : livrable (jamais « pièce »), piste créative (jamais « route »), KV master, Déclinaison, Exé, BAT, plateforme de marque.
- **Doublons** : un doublon strict (même SHA-1) garde une seule place, les autres copies vont dans `_archive/doublons/`. Un même nom ne veut pas dire une même activité : deux salves de photos à des dates différentes font deux activités, et c'est la date EXIF qui compte.
- **« Pas tracé » ne veut pas dire « pas fait »** : un dossier sans brief ni facture reste du travail réel.

## Les pièges déjà rencontrés

- **Les noms en Unicode décomposé (NFD)** : un « é » peut s'écrire de deux façons. Sans normalisation en NFC, « Le long de l'année » se dédouble. Les deux outils normalisent.
- **L'apostrophe courbe (’)** contre l'apostrophe droite (') : même effet. Les outils la ramènent à la droite.
- **Une clé ou un disque retiré sans être éjecté** : le système liste des fichiers qui n'existent plus. Les outils ne gardent que les vrais fichiers.
- **Les chemins de plus de 260 caractères sous Windows** : `rangement.py` utilise le préfixe `\\?\`.
- **Les campagnes en double dans LA BARRE** : un même client peut y figurer sous plusieurs noms (« Universal Music » pour le dossier « Universal Music - artistes »). `barre.py` cherche d'abord un porteur existant, puis signale les cas ambigus au lieu de créer.
- **Les fiches générées** : on ne remplace jamais un `PORTEUR.md`, `MARQUE.md` ou `CAMPAGNE.md` existant. Celui de la source est gardé à côté, sous le nom « — relevé de la source.md ».

## LA BARRE

- En ligne : https://labarre.powerupgraders.com. La base est un seul fichier, `depots/beignet-paradise.json`.
- Écriture : PUT du fichier entier avec `If-Match: <ETag lu>`. Si elle est refusée, quelqu'un a écrit entre-temps : on relit, on refait l'écart, on réapplique.
- Une campagne UPgraders s'appelle `<Porteur> — <titre> <AAAA> · UPgraders` (ou `· Friends Studio`). Le fil de l'année : `<Porteur> — le fil de l'année <AAAA> · UPgraders`.
- Tout objet créé porte `infere: {pourquoi, quand, par: "creation"}`. Alex contresigne ou corrige dans l'application.
- LA BARRE en local, avec lecture des vidéos et ouverture des EXE : `node servir.mjs`, en indiquant où sont les exports avec `LA_BARRE_EXPORT_UPGRADERS` (et `LA_BARRE_EXPORT_MATANGA`). L'indexation des vidéos (`outils/disque-2026.py`) a besoin de macOS pour les aperçus : sous Windows, on s'en passe.
