#!/usr/bin/env bash
# Rebuild assets/models/eldoria-human.glb.  Usage: tools/character/build.sh <makehuman/data> <python with bpy+numpy+scipy+pillow> <dir with node_modules/gltfpack>
set -eo pipefail; cd "$(dirname "$0")/../.."; W=${WORK:-/tmp/eldoria-char}; mkdir -p "$W"
"$2" tools/character/build_character.py --mh "$1" --template assets/models/eldoria-humanoid.glb --out "$W/human.glb" --work "$W" ${BLEND:+--blend "$W/human.blend"}
( cd "$3" && npx gltfpack -i "$W/human.glb" -o "$W/human-pk.glb" -cc -ce ext -kn -km -ke )
cp "$W/human-pk.glb" assets/models/eldoria-human.glb; ls -la assets/models/eldoria-human.glb
# crowd LOD: 256 px textures, meshoptimizer simplification to about a third of the triangles (borders locked so seams stay closed)
"$2" -I tools/character/shrink_textures.py "$W/human.glb" "$W/human-small.glb" 256
( cd "$3" && npx gltfpack -i "$W/human-small.glb" -o "$W/human-lod.glb" -cc -ce ext -kn -km -ke -si 0.2 -se 0.04 -sp -slb )
cp "$W/human-lod.glb" assets/models/eldoria-human-lod.glb; ls -la assets/models/eldoria-human-lod.glb
