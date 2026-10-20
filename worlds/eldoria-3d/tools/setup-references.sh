#!/usr/bin/env bash
# Recreates the read-only reference library at /workspace/eldoria-references (or $REF_DIR) at the commits recorded in
# docs/research/REFERENCE_REPOSITORIES.md. Shallow, blob-filtered and sparse where the repository is large; no Git LFS
# objects. Nothing here is copied into Eldoria: these are references to read. Usage: tools/setup-references.sh [--latest]
# Private repositories (ugdl, yumina-game-foundry, stgaab-visual-rpg, yumina-image-references) need the session's
# GitHub access (in Claude Code: attach them with add_repo first); they are skipped with a message if not readable.
set -uo pipefail
REF=${REF_DIR:-/workspace/eldoria-references}; OWNER=gabrieldigiacomo14-web; LATEST=${1:-}
mkdir -p "$REF"
# name | branch | commit | sparse patterns (space separated, empty = whole tree)
LIST=$(cat <<'EOF'
yumina-oss-reference|main|e91bf634d32c156479c745c0ee3ea399035b670e|/*.md /*.json /packages/ /docs/ !/worlds/ !*.png !*.jpg !*.webp !*.mp3 !*.mp4 !*.glb
three.js|dev|e416bdcc362deed1f592c3cdc940e5f7c2922fec|/LICENSE /package.json /README.md /src/ /examples/jsm/ !/examples/jsm/libs/ /manual/en/
three-mesh-bvh|master|b0935a7ec5904d2c009880be8da843b2637f185d|
glTF-Transform-iphone-version|main|3797aad585021e68cf5fbf3f2fba37783596ffac|
meshoptimizer|master|f0a684f11ead064e176775c9b796f82a55910e92|
THREE.Terrain|gh-pages|6f05b60947971e53024f4fe6bc3b344181656379|
FastNoiseLite|master|785f37a9ad76e283586a379675085f2063ae03f7|
recast-navigation-js|main|8769e8b9995f127033af9f6e6eeac3fad7d66201|
makehuman|master|a8bc2d54ff0ac92e78ff71431b1023eda42bf482|/*.md /*.txt /makehuman/*.md /makehuman/*.txt /makehuman/*.py /makehuman/apps/ /makehuman/core/ /makehuman/lib/ /makehuman/shared/ /makehuman/plugins/ /makehuman/licenses/ /makehuman/data/rigs/ /makehuman/data/skins/ /makehuman/data/targets/macrodetails/ /makehuman/data/targets/expression/ !*.png !*.jpg !*.thumb !*.npz
glTF-Blender-IO|main|a35fd9fbc53280116ea50565fd16889a14ae91b1|
glTF-Sample-Assets|main|edc7c9e67c639d230715049ee31f9a96a6babbbe|/*.md /Models/*.md /Models/*/LICENSE.md /Models/*/README.md /Models/*/metadata.json
yumina-image-references|main|0c23a011b39ffbefea513b9a65a113695755f9d6|/*.md /**/*.md /.github/
ugdl|main|faf167a3ea8093f83473cb7603a8c49e8e7beffc|
yumina-game-foundry|main|dda6c6ce3b089d3931ca6dd56bb80c2a5fd2541d|
stgaab-visual-rpg|main|d943745a4bab2c21ee4a16f2b39e52b5d24f3080|
RPGAtlas|main|632d0b9d5856f42d31de5db383daa5ca2e4c3274|
RPG-JS|v5|2560a72fa9ca8b33ef9b61e69003e58872e4f344|
rot.js|master|46782e248c2db9d379a5e4f13bb8323f18dff04b|
EOF
)
echo "$LIST" | while IFS='|' read -r name branch sha sparse; do
  dir="$REF/$name"
  if [ -d "$dir/.git" ] || [ -L "$dir" ]; then echo "= $name already present ($(git -C "$dir" rev-parse --short HEAD 2>/dev/null))"; continue; fi
  url="https://github.com/$OWNER/$name"
  if ! GIT_LFS_SKIP_SMUDGE=1 git clone -q --depth 1 --filter=blob:none --no-checkout --branch "$branch" "$url" "$dir" 2>/dev/null; then echo "! $name: clone failed (private without access, renamed, or network)"; continue; fi
  if [ -n "$sparse" ]; then git -C "$dir" sparse-checkout set --no-cone $sparse; fi
  if [ "$LATEST" != "--latest" ] && [ "$(git -C "$dir" rev-parse HEAD)" != "$sha" ]; then
    git -C "$dir" fetch -q --depth 1 origin "$sha" 2>/dev/null && git -C "$dir" checkout -q "$sha" 2>/dev/null || { echo "~ $name: recorded commit $sha not fetchable, using $branch head"; git -C "$dir" checkout -q "$branch"; }
  else git -C "$dir" checkout -q "$branch"; fi
  echo "+ $name $(git -C "$dir" rev-parse --short HEAD) ($branch)"
done
# the exact library versions Eldoria runs against (npm), for side-by-side reading
mkdir -p "$REF/_pinned"; cd "$REF/_pinned"
for pkg in three@0.149.0 three-mesh-bvh@0.5.24; do d=${pkg%@*}; [ "$d" = three ] && d=three-r149 || d=three-mesh-bvh-0.5.24
  [ -d "$d" ] || { npm pack -s "$pkg" >/dev/null 2>&1 && tar xzf ./*.tgz && mv package "$d" && rm -f ./*.tgz && echo "+ _pinned/$d"; }; done
