# Integration candidates

Ranked work items derived from the reference audit. Each states its source, the Eldoria files it would touch, effort
(XS < 2 h, S < 1 day, M 1–3 days, L > 3 days; estimates), risk, licence position and how to verify it. Nothing here has
been implemented by the research pass unless marked **done**. Preserve: the seven realms, canonical geography and
settlement layouts, player and NPC state, the 3d6 system, creation and progression, real-time exploration with
turn-based combat, mobile landscape controls and save compatibility.

## P0 — production correctness inside Yumina (found by reading the Yumina source)

These are not graphics features. The audit found that the headless harness hides them because it has no Yumina shims
or CSP. They should come before new visual work.

| # | Item | Evidence | Eldoria change | Effort | Risk |
|---|---|---|---|---|---|
| 0.1 | **GLB textures fail on non-Safari browsers inside Yumina.** The vendored GLTFLoader uses `ImageBitmapLoader`, which calls `fetch(blob:…)`, and Yumina's fetch shim rejects every non-`/api/` URL | `packages/app/sandbox/compat-shims.ts` L138-144 [V]; `src/gltf-loader.tsx` L2315-2336 [V]; `_pinned/three-r149/src/loaders/ImageBitmapLoader.js` [V] | Force `TextureLoader` in `src/gltf-loader.tsx` (iOS already uses it) | XS | Very low |
| 0.2 | **HUD fold state is lost in Yumina.** `api.storage.set` stores strings only (`localStorage.setItem`), so an object becomes `"[object Object]"` | `world-renderer.tsx` L1577-1609, `world-storage.ts` [V]; `src/hud.tsx` L46-47 [V] | `JSON.stringify`/`JSON.parse` for the HUD object (the quality and model settings already store plain strings) | XS | Very low |
| 0.3 | **World over the 10 MiB save limit.** `dist/eldoria-3d.json` is 10.9 MB. Above 10 MiB, Yumina drops `rootComponent.compiled`, and a literal `data:image/webp` in `src/gltf-loader.tsx` L1348 blocks re-stamping anyway, so every play recompiles about 5 MB of TSX in the browser | `limits.ts` L102, `world-save-payload.ts` L67-88, `editor.ts` L4202-4229 [V] | Split the `data:` literal. Move the built-in GLBs to uploaded assets loaded with `api.fetchAsset("@asset:<uuid>")`, keeping the base64 path as fallback, or shrink them. Add a size budget check to `tools/build.mjs` (target ≤ 9 MiB) | S–M | Medium: assets must be uploaded per Yumina instance (export does not carry them) |
| 0.4 | **No flush when the app is backgrounded.** iOS kills background tabs, so writes since the last 5 s flush are lost | STGAAB rootComponent `index.tsx` pagehide pattern [V]; Eldoria has no listener [V] | `visibilitychange`/`pagehide` → `Game.flush()` | XS | Very low |
| 0.5 | **No WebGL context-loss handling** | grep in Yumina and Eldoria [V] | `webglcontextlost` → pause and drop quality; `webglcontextrestored` → rebuild materials and textures | S | Low |
| 0.6 | **Harness differs from production** | audit A §10 | Run the Yumina fetch/storage shims and `SANDBOX_CSP` in `tools/build-harness-page.mjs`, inside an opaque-origin iframe | S | None (tests only) |
| 0.7 | **Export validator** | `yumina-game-foundry/tools/yumina/validate-export.ts` (pinned to an older Yumina commit) [V] | Eldoria-local validation against the current `worldDefinitionSchema` plus the size budget, in `tools/build.mjs` | S | None |

## P1 — graphics and characters (the milestone's priorities)

| # | Item | Source | Eldoria files | Effort | Benefit | Licence |
|---|---|---|---|---|---|---|
| 1.1 | Composite face-variety morphs (6–8 recipes), seeded per NPC | `makehuman/makehuman/data/targets/{nose,mouth,eyes,chin,cheek,forehead,head,asym}` | `tools/character/build_character.py`, `mh.py`, `src/rig.tsx` | M | Very high: ends the single-face crowd | CC0 [V] |
| 1.2 | Eye fix: emissive lift, envMap boost, no cavity AO on eyes | MakeHuman `brown.mhmat` (litsphere `AdditiveShading 0.5`) [V] | `tools/character/tex.py`, `src/rig.tsx` `dressMaterials` | S | High | CC0 |
| 1.3 | Aged and ethnicity morphs with matching expression units | `data/targets/macrodetails`, `data/targets/expression/units/*` [V] | character build, `src/rig.tsx` | S–M | High | CC0 |
| 1.4 | Decoration aligned with the terrain shader (no trees or grass on rock-painted slopes; scree) | THREE.Terrain `grass.js` `grassMeshWeight` (idea) | `src/terrain.tsx` `decorate()` | S | Medium–high | MIT, idea only |
| 1.5 | Baked vertex AO for towns (hemisphere rays via BVH, sliced over frames) | three-mesh-bvh 0.5.24 `raycastFirst` [V] | `src/settlements.tsx`, `src/game.tsx` | M | High: grounds buildings | MIT (already vendored) |
| 1.6 | Analytic sky (`Sky.js`) also rendered into the PMREM environment | `_pinned/three-r149/examples/jsm/objects/Sky.js` [V] | `src/terrain.tsx`, `src/three.tsx` | S–M | Medium | MIT |
| 1.7 | Height fog per realm (valley mist, Umbral haze) | r149 `fog_fragment` chunk [V] | `src/terrain.tsx`, materials | S | Medium | — |
| 1.8 | Grass distance compaction + clustering + wind bend | THREE.Terrain `updateGrassLOD`, `grassClusterWeight` (ideas) | `src/terrain.tsx` | S | Medium (perf + look) | MIT, idea only |
| 1.9 | Eyelash cards from hm08 helper strips; hair weighted to head+neck | hm08 base mesh helpers [V] | character build | S | Medium | CC0 |
| 1.10 | Species parts: horns and tails on sockets; species face recipes | targets + image refs (direction) | character build, `src/rig.tsx` | M | High for fantasy read | CC0; images direction-only |
| 1.11 | Wrap-lighting skin patch (R > G > B scatter tint) | MakeHuman SSS scale idea [V]; own shader code | `src/rig.tsx` | M | Medium–high | Own code; do not copy MakeHuman GLSL (AGPL) |
| 1.12 | CSM on the High tier (chain `onBeforeCompile` with `surfaces.tsx`) | `_pinned/three-r149/examples/jsm/csm/CSM.js` [V] | `src/terrain.tsx`, `src/surfaces.tsx` | M | Medium (sharper town shadows on desktop) | MIT |
| 1.13 | Real PBR texture sets (Poly Haven, CC0) through the triplanar shader | blocked: `api.polyhaven.com`/`dl.polyhaven.org` refused by the build environment | `src/surfaces.tsx`, build step | M | High | CC0 once available |

## P2 — traversal, navigation and animation

| # | Item | Source | Eldoria files | Effort | Benefit | Risk |
|---|---|---|---|---|---|---|
| 2.1 | Welded per-settlement collision mesh (replaces the BVH on the render shell; about 3.6 MB less memory [I]) | three-mesh-bvh 0.5.24 | `src/settlements.tsx`, `src/game.tsx` | S | Memory; prerequisite for 2.2 | Low |
| 2.2 | Capsule character controller for stairs, plinths and bridge rails (on top of `groundAt`) | `three-mesh-bvh/example/characterMovement.js` [V] | `src/game.tsx` movement | M | High: reliable traversal | Medium: must keep `world` scenario guarantees |
| 2.3 | Settlement collider-grid A* for townsfolk (binary heap, octile cost, no corner cutting, smoothing) | `rot.js/src/path/astar.ts` (pattern; its unit diagonal cost and corner cutting need fixing) [V] | `src/game.tsx` `updateNPCs` | M | High: NPCs stop grinding into walls | None to geography |
| 2.4 | Dijkstra flow field for combat approach and flee | `rot.js/src/path/dijkstra.ts` [V] | `src/ai.tsx` | M | Medium | Low |
| 2.5 | Deterministic NPC routines (schedules) instead of random wander goals | UGDL OpenMW package records; Foundry guide §15 | `src/game.tsx` | M | Medium | GM-owned `npc-state` stays authoritative |
| 2.6 | Two-bone foot IK on slopes | `_pinned/three-r149/examples/jsm/animation/CCDIKSolver.js` [V] or own two-bone solver | `src/rig.tsx`, `src/anim.tsx` | M | Medium | Low |
| 2.7 | CC0 mocap clips retargeted with the existing retargeter | not in these repos (MakeHuman BVHs are AGPL3) | `tools/character` | L | High | Source must be CC0/compatible |

## P3 — save robustness and architecture

| # | Item | Source | Effort | Notes |
|---|---|---|---|---|
| 3.1 | `world3d-state` sanitise/migrate step keyed on its existing `v` | STGAAB `state.js restore`, RPG-JS field aliases | S | Never throw on unknown shapes; fall back to `battle:null` |
| 3.2 | Seeded combat RNG stored with the battle snapshot | STGAAB `rng.js` | S–M | Same 3d6 distribution; reproducible after reload and in tests |
| 3.3 | Single GM gateway with counters | STGAAB `ai-bridge.js` | S | Makes "no GM calls in ordinary play" testable |
| 3.4 | Revision counter for GM/client echo detection | Foundry AI guide §16 | M | Backward compatible with GM writes without a revision |

## Rejected or blocked (with reason)

- **recast-navigation-js:** both builds are WebAssembly (the single-file build embeds wasm as base64 but still calls
  `WebAssembly`). There is no JS build, the module reserves 64 MB at start, and per-chunk navmesh baking is heavy on
  phones. Revisit only if Yumina guarantees inline WASM and a wasm2js build is proven.
- **THREE.Terrain as a dependency:**
  - it needs three ≥ 0.160 (it uses `SRGBColorSpace`) [V];
  - it is Z-up;
  - it seeds global noise with `Math.random`, patches `THREE.Vector2.prototype` and writes `THREE.Terrain` globally [V].
  - Ideas only.
- **Any change to terrain heights** (filters, erosion, new noise): breaks canonical geography.
- **FastNoiseLite GLSL:** needs integer bit operations and open-ended loops, which WebGL1 cannot compile [V].
  The JS port is fine but has no tileable mode and no speed advantage.
- **rot.js dungeon generators as-is:** they seed one shared RNG from `Date.now()` and stop on a wall-clock time limit,
  so results are not deterministic on slow devices [V]. Usable only with `timeLimit: Infinity` and per-place seeding.
- **three.js upgrade as an incidental change:** it crosses r152 (colour management), r155 (light units, all intensities
  re-tuned) and r163 (WebGL1 removed) [V/I]. If ever done, it is a dedicated milestone.
- **Formats r149 cannot load or the sandbox cannot use:** KTX2/Basis, Draco, AVIF and `KHR_meshopt_compression`.
- **SSAO, planar water reflections and POM on phones:** each costs a full extra pass or a fetch loop.
- **Copying code from AGPL or GPL sources:**
  - MakeHuman code and shaders, and the MakeHuman BVH `.mhanim` clips (AGPL);
  - RPGAtlas (GPL-3.0);
  - the Yumina platform code (AGPL; Eldoria only targets its API).
- **Shipping Yumina-Image-references pixels, or glTF samples with non-commercial, EULA or proprietary terms:**
  DamagedHelmet, PlaysetLightTest, BrainStem, Duck, EnvironmentTest, Sponza and VirtualCity.
- **STGAAB lore, characters or mechanics:** generic architecture patterns only.

## Done before this research pass (for context)

- **Done:** meshoptimizer crowd LOD.
- **Done:** three-mesh-bvh 0.5.24 camera collision.
- **Done:** runtime-generated triplanar surfaces.
- **Done:** per-realm lighting.
- **Done:** quality tiers with adaptive resolution.
- **Done:** canonical layout guard (`layout` scenario).
