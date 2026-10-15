#!/usr/bin/env bash
# Rebuild assets/models/eldoria-human.glb.  Usage: tools/character/build.sh <makehuman/data> <python with bpy+numpy+scipy+pillow> <dir with node_modules/gltfpack>
set -eo pipefail; cd "$(dirname "$0")/../.."; W=${WORK:-/tmp/eldoria-char}; mkdir -p "$W"
"$2" tools/character/build_character.py --mh "$1" --template assets/models/eldoria-humanoid.glb --out "$W/human.glb" --work "$W" ${BLEND:+--blend "$W/human.blend"}
( cd "$3" && npx gltfpack -i "$W/human.glb" -o "$W/human-pk.glb" -cc -ce ext -kn -km -ke )
cp "$W/human-pk.glb" assets/models/eldoria-human.glb; ls -la assets/models/eldoria-human.glb
