# Reference repositories

A read-only library of the user's forks and private repositories, cloned outside Eldoria so future sessions can study
real implementations instead of rediscovering them. **Eldoria (`worlds/eldoria-3d`, branch
`claude/3d-rpg-conversion-u2xj49`) stays the implementation authority**; nothing here is a dependency, and cloning
something is not permission to copy it (see the licence column and [AGENTS.md](../../AGENTS.md)).

- Library root: `/workspace/eldoria-references/` (outside the repository; never commit it).
- The four private repositories are cloned at `/home/user/<name>` (where the session's GitHub access attaches them) and
  symlinked into the library root.
- `/workspace/eldoria-references/_pinned/` holds the exact npm builds Eldoria runs against: `three-r149` (three@0.149.0)
  and `three-mesh-bvh-0.5.24`.
- Recreate everything in a fresh container with `tools/setup-references.sh` (shallow, blob-filtered, sparse where large,
  no Git LFS; it checks out the commits below, or the branch heads with `--latest`). Private repositories must first be
  attached to the session (Claude Code: `add_repo`); the script reports anything it cannot read.
- Findings per repository: [REFERENCE_REPOSITORY_AUDIT.md](REFERENCE_REPOSITORY_AUDIT.md). What to build next:
  [INTEGRATION_CANDIDATES.md](INTEGRATION_CANDIDATES.md). Rendering techniques: [GRAPHICS_TECHNIQUES.md](GRAPHICS_TECHNIQUES.md).

## Index

Inspection: **deep** = source read across the relevant modules, with file and line citations; **targeted** = the relevant
subsystems read, rest listed; **metadata** = docs/licences/metadata only (content not checked out).

| # | Repository | Local path | Branch | Commit examined | Checkout | Licence | Inspection | Use for Eldoria |
|---|---|---|---|---|---|---|---|---|
| 1 | gabrieldigiacomo14-web/yumina-oss-reference (upstream Yumina) | `/workspace/eldoria-references/yumina-oss-reference` | main | `e91bf634d32c156479c745c0ee3ea399035b670e` | sparse: `packages/`, `docs/`, top-level files | AGPL-3.0-only code, CC BY 4.0 docs, "Yumina" trademark | deep | Runtime truth: compiler, sandbox CSP, `useYumina` API, variables, assets, size limits |
| 2 | gabrieldigiacomo14-web/three.js | `/workspace/eldoria-references/three.js` (+ `_pinned/three-r149`) | dev | `e416bdcc362deed1f592c3cdc940e5f7c2922fec` (r187dev) | sparse: `src/`, `examples/jsm/` (no libs), `manual/en` | MIT | targeted (shader chunks, shadows, loaders, CSM, LOD, objects) | Rendering reference; r149 is the compatibility constraint |
| 3 | gabrieldigiacomo14-web/three-mesh-bvh | `/workspace/eldoria-references/three-mesh-bvh` (+ `_pinned/three-mesh-bvh-0.5.24`) | master | `b0935a7ec5904d2c009880be8da843b2637f185d` (0.9.15) | full, shallow | MIT | deep (API diff 0.5.24 → 0.9.15, character-controller example) | Camera collision (integrated, 0.5.24), capsule walking |
| 4 | gabrieldigiacomo14-web/glTF-Transform-iphone-version | `/workspace/eldoria-references/glTF-Transform-iphone-version` | main | `3797aad585021e68cf5fbf3f2fba37783596ffac` | full, shallow | MIT | targeted (functions, CLI, native deps) | Optional offline GLB pipeline; fork is plain upstream 4.5.1 |
| 5 | gabrieldigiacomo14-web/meshoptimizer | `/workspace/eldoria-references/meshoptimizer` | master | `f0a684f11ead064e176775c9b796f82a55910e92` | full, shallow | MIT | targeted (simplifier, gltfpack flags, JS decoder) | Compression + crowd LOD (integrated) |
| 6 | gabrieldigiacomo14-web/THREE.Terrain | `/workspace/eldoria-references/THREE.Terrain` | gh-pages | `6f05b60947971e53024f4fe6bc3b344181656379` (3.1.1) | full, shallow | MIT | deep (SKILL.md, AGENTS.md, llms.txt, roadmap, all `src/`) | Ideas only: scatter-by-slope, grass LOD, wind; needs three ≥ 0.160 |
| 7 | gabrieldigiacomo14-web/FastNoiseLite | `/workspace/eldoria-references/FastNoiseLite` | master | `785f37a9ad76e283586a379675085f2063ae03f7` | full, shallow | MIT | deep (JS/TS and GLSL ports, benchmarked) | Texture-generation algorithms (cellular, warp) if ported periodic |
| 8 | gabrieldigiacomo14-web/recast-navigation-js | `/workspace/eldoria-references/recast-navigation-js` | main | `8769e8b9995f127033af9f6e6eeac3fad7d66201` | full, shallow | MIT (+ zlib Recast/Detour, fastlz) | targeted (wasm build, core API, three helpers) | Research only: WebAssembly-only |
| 9 | gabrieldigiacomo14-web/makehuman | `/workspace/eldoria-references/makehuman` | master | `a8bc2d54ff0ac92e78ff71431b1023eda42bf482` | sparse: code (`apps`, `core`, `lib`, `shared`, `plugins`), `licenses`, `data/rigs`, `data/skins`, `data/targets/{macrodetails,expression,nose,mouth,eyes,eyebrows,chin,cheek,forehead,head,ears,asym}`; no images | code AGPL-3.0; assets CC0 1.0 (BVH `.mhanim` files say AGPL3) | targeted (licensing, modifiers, skeleton, proxies, targets, eye/skin materials) | CC0 data for the character build (already used) |
| 10 | gabrieldigiacomo14-web/glTF-Blender-IO | `/workspace/eldoria-references/glTF-Blender-IO` | main | `a35fd9fbc53280116ea50565fd16889a14ae91b1` (add-on 5.4.5) | full, shallow | Apache-2.0 | targeted (exporter: animation, shape keys, materials, options) | Build tool behind `tools/character` |
| 11 | gabrieldigiacomo14-web/glTF-Sample-Assets | `/workspace/eldoria-references/glTF-Sample-Assets` | main | `edc7c9e67c639d230715049ee31f9a96a6babbbe` | sparse: README/LICENSE/metadata only | per model (CC0, CC-BY 4.0, some restricted) | metadata (all 150 metadata files parsed) | Loader regression tests; a few CC0/CC-BY props |
| 12 | gabrieldigiacomo14-web/Yumina-Image-references (private) | `/home/user/yumina-image-references` → library symlink | main | `0c23a011b39ffbefea513b9a65a113695755f9d6` | blobless; only `*.md` checked out (145 image files, 56 MB, fetched on demand) | no production rights stated | metadata (docs + file list) | Art direction only |
| 13 | gabrieldigiacomo14-web/UGDL (private) | `/home/user/ugdl` → library symlink | main | `faf167a3ea8093f83473cb7603a8c49e8e7beffc` | full, shallow | private (owner's); see AGENTS.md restrictions | targeted (AGENTS.md, runtime profiles, pattern records) | Read-only knowledge library |
| 14 | gabrieldigiacomo14-web/Yumina-Game-Foundry (private) | `/home/user/yumina-game-foundry` → library symlink | main | `dda6c6ce3b089d3931ca6dd56bb80c2a5fd2541d` | full, shallow | private (owner's) | targeted (AGENTS.md, export validator, storage doc, guides) | Export validation, storage patterns |
| 15 | gabrieldigiacomo14-web/STGAAB-Visual-RPG (private) | `/home/user/stgaab-visual-rpg` → library symlink | main | `d943745a4bab2c21ee4a16f2b39e52b5d24f3080` | full, shallow | private (owner's) | targeted (engine/state/save/AI bridge) | Generic architecture patterns only, no STGAAB content |
| 16 | gabrieldigiacomo14-web/RPGAtlas | `/workspace/eldoria-references/RPGAtlas` | main | `632d0b9d5856f42d31de5db383daa5ca2e4c3274` | full, shallow | **GPL-3.0-or-later** | targeted (architecture, quests, persistence) | Ideas only (clean-room); three r185 |
| 17 | gabrieldigiacomo14-web/RPG-JS | `/workspace/eldoria-references/RPG-JS` | v5 | `2560a72fa9ca8b33ef9b61e69003e58872e4f344` | full, shallow | MIT (© 2026 Samuel Ronce) | targeted (packages, save strategy, progression) | Patterns: save strategies, field aliases, formulas |
| 18 | gabrieldigiacomo14-web/rot.js | `/workspace/eldoria-references/rot.js` | master | `46782e248c2db9d379a5e4f13bb8323f18dff04b` | full, shallow | BSD-3-Clause (Alea RNG: MIT) | deep (path, fov, map generators, rng; benchmarked) | A*/Dijkstra patterns, dungeon generators (with fixes) |

All 18 requested repositories were cloned; none failed. Not cloned on purpose: MakeHuman's separate `makehuman-assets`
repository (eyebrows, eyelashes, hair, clothes, skins are not in the main repository; it was not requested), the images
and binary models of Yumina-Image-references and glTF-Sample-Assets (fetch individual files on demand:
`git -C <repo> sparse-checkout add <path>`), and Git LFS objects.

## Where to look first (by task)

| Task | Start here |
|---|---|
| Will this browser feature work inside Yumina? | `yumina-oss-reference/packages/server/src/index.ts` (`SANDBOX_CSP`), `packages/app/sandbox/compat-shims.ts` (`shimFetch`, `shimStorage`), `packages/app/sandbox/sandbox-context.tsx` (`SandboxedYuminaAPI`, `buildAPI`) |
| How the world is compiled / why an import vanished | `packages/app/src/lib/tsx/tsx-bundler.ts` (`compileFile`, `assembleBundle`), `tsx-component-builder.ts` (`buildComponent`) |
| Size and save limits | `packages/shared/src/constants/limits.ts`, `packages/server/src/middleware/request-body-limit.ts`, `packages/app/src/lib/world-save-payload.ts`, `packages/app/src/stores/editor.ts` L4193-4235 |
| Variables and persistence | `packages/engine/src/state/game-state-manager.ts` `normalizeState`, `packages/app/src/stores/chat.ts` `setVariableDirectly`, `packages/server/src/lib/player-state.ts` |
| A three.js r149 API or shader chunk | `_pinned/three-r149/src/renderers/shaders/ShaderChunk/*.glsl.js`, `_pinned/three-r149/examples/jsm/*` |
| What changed after r149 | `three.js/src/constants.js` (`REVISION`), `three.js/src/renderers/shaders/ShaderChunk/*`, deprecation warnings in `src/` |
| Capsule walking on bridges and stairs | `three-mesh-bvh/example/characterMovement.js` (APIs present in 0.5.24) |
| Mesh simplification / LOD flags | `meshoptimizer/gltf/gltfpack.cpp` (`-si -se -sp -slb -sa`), `meshoptimizer/src/simplifier.cpp` |
| Grid pathfinding | `rot.js/src/path/astar.ts`, `rot.js/src/path/dijkstra.ts` (patterns; see audit for the needed fixes) |
| Vegetation scatter rules | `THREE.Terrain/src/scatter.js`, `THREE.Terrain/src/grass.js` (`grassMeshWeight`, `updateGrassLOD`) |
| Face variety for the humanoid | `makehuman/makehuman/data/targets/` (nose, mouth, eyes, chin, cheek, head, asym, ears; see audit D) |
| glTF exporter options | `glTF-Blender-IO/addons/io_scene_gltf2/blender/exp/` and the operator options in `addons/io_scene_gltf2/__init__.py` |
| Export validation against the Yumina schema | `yumina-game-foundry/tools/yumina/validate-export.ts` (pinned to an older Yumina commit; re-pin before use) |
| Save migration / flush patterns | STGAAB `game/Labyrinth_Survival_Living_World_RPG_11_35_0.json` → `rootComponent.files` `index.tsx` (pagehide flush), `state.js` (`restore`, `SAVE_VERSION`), `ai-bridge.js`; RPG-JS `packages/common/src/services/save.ts`, `packages/server/src/services/save.ts` |
