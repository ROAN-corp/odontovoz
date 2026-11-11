#!/bin/sh
# OdontoVoz - copia de las copias de seguridad a un disco externo (Mac o Linux).
# Uso: sh respaldo-disco.sh /Volumes/MiDisco
# Necesita rclone con un remoto "drive" (Google Drive de somosroan). Ver docs/RESPALDOS.md.
set -e
DISCO="${1:-/Volumes/RESPALDO}"
[ -d "$DISCO" ] || { echo "No encuentro el disco $DISCO"; exit 1; }
DEST="$DISCO/OdontoVoz-respaldos"; mkdir -p "$DEST"
rclone copy drive:OdontoVoz-respaldos "$DEST" --progress --log-file "$DEST/registro.txt" --log-level INFO
rclone check drive:OdontoVoz-respaldos "$DEST" --one-way --log-file "$DEST/registro.txt" --log-level NOTICE
rclone delete --min-age 90d "$DEST/base/diario" 2>/dev/null || true
rclone delete --min-age 730d "$DEST/base/mensual" 2>/dev/null || true
rclone delete --min-age 730d "$DEST/fotos/borradas" 2>/dev/null || true
du -sh "$DEST"; df -h "$DISCO" | tail -1
date > "$DEST/ultima-copia-en-disco.txt"
echo "Listo. Copia en el disco al día."
