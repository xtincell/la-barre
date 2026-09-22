#!/bin/bash
# vignettes-corpus.sh — les illustrations de campagne, à la taille d'une carte.
#
# Le corpus porte une illustration par campagne, en ~1300 px et ~270 Ko. Les
# servir telles quelles, c'est 37 Mo pour un écran de liste. On en fait des
# vignettes de 600 px — la taille à laquelle elles s'affichent réellement.
#
# Les originaux ne bougent pas : tout ici est une copie réduite, et le dépôt
# ne porte que le chemin. C'est la règle posée quand les vignettes base64 ont
# été sorties du dépôt.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$ICI/../../DOSSIER PROJETS — XTINCELL/01 CAMPAGNES"
SORTIE="$ICI/../assets/review/corpus"
mkdir -p "$SORTIE"
n=0; saute=0
while IFS= read -r -d '' f; do
  nom="$(basename "$f")"
  cible="$SORTIE/$nom"
  if [ -f "$cible" ] && [ "$cible" -nt "$f" ]; then saute=$((saute+1)); continue; fi
  sips -Z 600 "$f" --out "$cible" >/dev/null 2>&1 && n=$((n+1))
done < <(find "$SOURCE" -maxdepth 1 -name '*.jpg' -print0)
echo "vignettes : $n générées, $saute déjà à jour"
du -sh "$SORTIE" | awk '{print "  poids : "$1}'
