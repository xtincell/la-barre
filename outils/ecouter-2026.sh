#!/bin/zsh
# ecouter.sh <modèle> : transcrit chaque son de w16/ avec whisper.cpp ; une transcription par fichier dans txt-<modèle>/
M=${1:-base}
W=~/.nommage/whisper/whisper.cpp-master/build/bin/whisper-cli
cd ~/.nommage/audio && mkdir -p "txt-$M"
while IFS=$'\t' read -r i f; do
  [ -s "txt-$M/$i.txt" ] && continue
  "$W" -m ~/.nommage/whisper/ggml-$M.bin -f "w16/$i.wav" -l auto -t 8 -np -nt -otxt -of "txt-$M/$i" > "txt-$M/$i.log" 2>&1
  echo "$i fait"
done < index.tsv
