# Graphics techniques for Eldoria

Synthesis of the reference audit ([REFERENCE_REPOSITORY_AUDIT.md](REFERENCE_REPOSITORY_AUDIT.md)) for Eldoria's art
direction: semi-realistic grounded dark fantasy with Baldur's Gate 3 as the quality benchmark, running in Yumina on
three.js **r149** and on iPhones in landscape. Paths are relative to `/workspace/eldoria-references/` unless they start
with `src/` or `tools/` (Eldoria). **[V]** verified in source, **[I]** inference. "Now" describes Eldoria today.

## Hard constraints every technique must pass

1. **three r149 only** (UMD `window.THREE` from jsDelivr/unpkg). No incidental upgrade. Later releases are ESM-only, and
   Yumina's bundler deletes every `import` (`yumina-oss-reference/packages/app/src/lib/tsx/tsx-bundler.ts` `compileFile`) [V].
   Vendor add-ons as TSX modules that read the global (pattern: `src/gltf-loader.tsx`, `src/bvh.tsx`).
2. **No network, no Workers.** `connect-src 'none'` and a `fetch` shim reject everything except `/api/*`, including
   `blob:` and `data:` (`packages/app/sandbox/compat-shims.ts` `shimFetch`) [V]. three's `FileLoader` and
   `ImageBitmapLoader` use `fetch` and fail; `GLTFLoader.parse()` plus `TextureLoader` (an `<img>`) work. KTX2Loader and
   DRACOLoader need Workers (and KTX2 needs WASM): not usable [V].
3. **WebAssembly is probably allowed when the bytes are inline** (`'unsafe-eval'` in `default-src`) [I], but always keep a
   JavaScript fallback (Eldoria's meshopt decoder already does).
4. **Size.** A world save is capped at 10 MiB including the precompiled bundle; above it the bundle is dropped and every
   play recompiles in the browser (`packages/shared/src/constants/limits.ts`, `packages/app/src/lib/world-save-payload.ts`)
   [V]. Base64 data counts twice (source + compiled). Prefer runtime-generated textures, or uploaded assets via
   `api.fetchAsset("@asset:<uuid>")` (32 MiB per asset, not carried by export) [V].
5. **Determinism.** Canonical heights, roads, rivers and settlement layouts must not move: decoration may use its own
   seeded streams (`rng(hashStr(id + ":purpose"))`), never extra draws from a layout stream (the stall bug of October
   2026; guarded by the `layout` browser scenario).
6. **WebGL1-safe GLSL** in shared paths (`texture2D`, `extensions.derivatives`); WebGL2-only features
   (`sampler2DArray`, integer ops) need a fallback.

## Terrain and ground materials

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Triplanar packed-height detail (4 materials per RGBA tile) + derivative bump | `src/surfaces.tsx` (buildings: stone/plaster/timber/roof; terrain: grass/earth/rock/sand) | `_pinned/three-r149/src/renderers/shaders/ShaderChunk/bumpmap_pars_fragment.glsl.js` (`perturbNormalArb`) [V] | yes | 3 fetches + derivatives; Low tier 1 fetch | Keep. The chunk names patched by `surfaces.tsx` all still exist in r187dev [V], so an eventual upgrade is safe |
| Real PBR sets (albedo/normal/roughness) | none (Poly Haven blocked by the build network) | — | yes | 2–3 fetches per layer | When textures exist: 512 px, normal+roughness packed in one image, embedded or as assets; feed through the existing triplanar path |
| Texture arrays for splatting | n/a | `_pinned/three-r149/src/textures/DataArrayTexture.js` [V] | yes, **WebGL2 only** | one array fetch per layer | Only with real texture sets; keep the current path as WebGL1 fallback |
| Decoration aligned with shading | `decorate()` uses its own slope test | `THREE.Terrain/src/grass.js` `grassMeshWeight` [V] | n/a | none | **Do**: gate trees/grass with the same `smoothstep(0.86, 0.68, n.y)` rock weight as `surfaces.tsx`; scree where rock is strong |
| Cellular / domain-warp texture channels | value + Worley noise, periodic | `FastNoiseLite/JavaScript/src/FastNoiseLite.ts` `_SingleCellularR2`, `_SingleDomainWarp*` [V] | n/a (CPU) | bake time only | Port with index wrap (FNL has no tileable mode [V]); not faster than Eldoria's `noise2` (benchmarked) |
| Height filters, erosion, new terrain noise | — | THREE.Terrain filters/influences (no erosion code exists [V]) | — | — | **Rejected**: would move canonical geography and fail `tools/world-test.mjs` |

## Lighting, shadows and atmosphere

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Sun + hemisphere + PMREM IBL | `src/terrain.tsx` `Environment`, `REALM_LIGHT`; `src/three.tsx` `makeEnvironment` refreshed every 20 s | `PMREMGenerator.fromScene` [V] | yes | cube render + blur per refresh | Keep; render the real sky mesh into the PMREM scene for consistency |
| Analytic sky | custom gradient shader | `_pinned/three-r149/examples/jsm/objects/Sky.js` (Preetham) [V] | yes | one sky shader | Good fit; drive from the existing sun direction and time of day |
| Cascaded shadow maps | one 60–80 m shadow box | `_pinned/three-r149/examples/jsm/csm/CSM.js`, `CSMShader.js` [V] | yes | one shadow pass per cascade | High tier only (maybe 2 cascades on Medium every 2nd frame). CSM sets `material.onBeforeCompile` and replaces global chunks: **chain** it with the `surfaces.tsx` patch |
| Shadow filtering | PCFSoft | `shadowmap_pars_fragment.glsl.js` [V] | PCF/PCFSoft/VSM | 17 taps for PCF and PCFSoft in r149 [V] | Keep; note dev deprecates PCFSoft (r186) [V] |
| Height fog / valley mist | linear `THREE.Fog` | `fog_fragment.glsl.js` [V] | yes (patch) | one exp per fragment | Good: realm-specific height falloff (Umbral mist, river valleys) |
| Baked vertex ambient occlusion | none | implement with three-mesh-bvh `raycastFirst` (0.5.24) [I] | yes | zero at runtime | **Strong fit**: darken `GeoBuilder` vertex colours by hemisphere occlusion at settlement build, sliced over frames |
| SSAO / SAO / GTAO | none | `examples/jsm/postprocessing/SSAOPass.js` (32-sample kernel + normal pass) [V]; GTAO dev-only | SSAO/SAO yes | full extra pass | Not on phones; prefer baked AO |
| Water reflections | flat transparent planes | `examples/jsm/objects/Water.js` (re-renders the scene) [V] | yes | doubles scene cost | Not on phones; a cheap env-mapped normal-scrolled surface instead |
| Light probes | none | `examples/jsm/lights/LightProbeGenerator.js` [V] (grid dev-only) | single probe | GPU readback | Low priority |
| Anti-aliasing | MSAA off on Low | `shaders/FXAAShader.js`, `postprocessing/SMAAPass.js` [V] | yes | one full-screen pass | FXAA for Low tier if aliasing on iPhone is objectionable |

## Architecture and towns

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Merged per-settlement geometry with material classes | `GeoBuilder` + `mclass` attribute | — | yes | few draw calls | Keep |
| Town HLOD | full shell at all distances | `_pinned/three-r149/src/objects/LOD.js` [V]; gltfpack `-si -slb` [V] | yes | fewer vertices far away | Near = current shell; far = coarse block mesh generated from the same lots (runtime, deterministic) |
| BatchedMesh | — | `three.js/src/objects/BatchedMesh.js` [V] | **no** (r158+) | — | Only after a deliberate upgrade |
| Props from concept art (stalls, lanterns, wells, crates) | stalls, lanterns done | Yumina-Image-references (direction only) | yes | small | Continue with own geometry; images are not licensed for production |

## Vegetation

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Instanced trees/grass | `addInst`, `frustumCulled = false` | `InstancedMesh` [V] | yes | cheap | Group per chunk and cull by chunk bounds |
| Grass distance compaction | density tier only | `THREE.Terrain/src/grass.js` `updateGrassLOD` [V] | n/a | saves vertices | **Do** (small) |
| Grass clustering + wind bend | uniform scatter | `grassClusterWeight`, `createGrassMaterial` [V] | yes | trivial | Do, using Eldoria's `noise2`/`hash2` (not THREE.Terrain's `Math.random`-seeded noise [V]) |
| Far-forest impostors | none | none in any repo [V] | yes (sprites/instanced quads) | very cheap | Write in-house: render each tree variant to an atlas once |

## Characters

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Face variety | one base face + female/build/ear morphs | `makehuman/makehuman/data/targets/{nose,mouth,eyes,chin,cheek,forehead,head,ears,asym}` (CC0) [V] | morph targets yes | a few morphs | **Top**: 6–8 composite face morphs baked in `tools/character`, chosen per NPC by seed |
| Age and ethnicity | young macro only | `data/targets/macrodetails` old/asian/african + matching expression units [V] | yes | morphs | Add `face_aged` and ethnicity deltas |
| Eye shading | dark eyes | MakeHuman eye material adds a highlight layer (`AdditiveShading 0.5`) that Eldoria's PBR rebuild drops [V] | yes | none | Small emissive lift, stronger envMap, exclude eyes from cavity AO |
| Skin | MeshPhysical sheen on High | MakeHuman skin SSS scales R4/G2/B1 [V]; r149 `SubsurfaceScatteringShader` is a ShaderMaterial without skinning [V] | yes | small | Wrap-lighting patch on the standard material (own code; MakeHuman GLSL is AGPL) |
| Eyelashes | none | hm08 `helper-l/r-eyelashes-1/2` strips follow every morph [V] | yes | tiny | Lash cards from the helper strips |
| Hair | rigid card styles | — | yes | alpha-test overdraw | Weight cards to head+neck; author MASK alpha in Blender (Round node → MASK) [V] |
| Species parts | tusks (runtime), species proportions | Yumina-Image-references (direction) | yes | small | Horns and tail meshes on sockets; species face recipes from targets |
| LOD | crowd LOD via gltfpack `-si 0.2 -se 0.04 -sp -slb` (+ 256 px textures, facial morphs dropped) | `meshoptimizer/gltf/gltfpack.cpp` [V] | yes | ~35 % triangles | Keep; never emit `KHR_meshopt_compression` (`-cz`/`-ce khr`), r149 cannot load it [V] |
| Exporter | bpy 5.2 add-on | `glTF-Blender-IO` main is 5.4.5 for Blender 5.3 [V] | — | — | Keep `export_morph_normal=False` only while morphs stay small; revisit when face morphs are large [V] |

## Animation and traversal

| Technique | Now | Reference | r149 | Mobile cost | Recommendation |
|---|---|---|---|---|---|
| Capsule character controller | analytic ground + 2D colliders + bridge decks | `three-mesh-bvh/example/characterMovement.js` (shapecast, `closestPointToSegment`, sub-steps); all APIs present in 0.5.24 [V] | yes | a few shapecasts per frame | **Strong fit** for stairs, plinths and bridge rails; use a welded collision mesh, not the render mesh |
| Camera collision | BVH over the render shell (exploration only) | three-mesh-bvh 0.5.24 | yes | ~3.6 MB index added to the shell [I] | Move to a separate welded collision mesh (also serves the capsule controller) |
| Mocap and foot IK | procedural clips retargeted | none in these repos (MakeHuman BVHs are AGPL3 and tiny [V]) | `CCDIKSolver` in examples [I] | IK small | Source CC0 mocap elsewhere; add two-bone foot IK on slopes |
| NPC navigation | straight-line wandering with colliders | `rot.js/src/path/astar.ts`, `dijkstra.ts` [V]; recast is WASM-only [V] | n/a | 13 ms per 128² A* in Node [V] | Own grid A* (binary heap, octile, no corner cutting, smoothing) over a per-settlement collider raster |

## Performance on iPhone

- Already in place: tiered fps cap, adaptive render scale, shadow cadence, frustum and distance culling with animation
  LOD, lite shaders, crowd LOD, BVH camera collision.
- Biggest controllable costs found by the audit [V/I]:
  - the cold-start compile when `compiled` is dropped (world over 10 MiB, or a `data:` literal in the sources);
  - base64 decoding of the embedded GLBs;
  - full-variable PATCHes on every `setVariable`.
- Neither Yumina nor Eldoria handles `webglcontextlost`; iOS can drop the context under memory pressure [V/I].
- Not measured on a device: everything above is desktop-host evidence or reasoning. Device testing inside Yumina remains open.
