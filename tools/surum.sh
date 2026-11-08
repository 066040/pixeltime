#!/bin/sh
# Yeni sürüm yayınlamadan önce çalıştır: index.html'deki ?v= ve sw.js önbellek adını birlikte artırır.
cd "$(dirname "$0")/.." || exit 1
n=$(grep -o "pixeltime-v[0-9]*" sw.js | grep -o "[0-9]*$"); n=$((n + 1))
sed -i "s/pixeltime-v[0-9]*/pixeltime-v$n/" sw.js
sed -i -E "s/\?v=[0-9]+\"/?v=$n\"/g" index.html
echo "Sürüm v$n"
