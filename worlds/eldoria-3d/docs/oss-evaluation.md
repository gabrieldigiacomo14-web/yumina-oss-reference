# Open-source resources: evaluation for Eldoria 3D

> Superseded in detail by the source-level audit in [research/](research/REFERENCE_REPOSITORIES.md) (October 2026),
> which corrected two points below (marked *corrected*). This first-pass evaluation is kept for its decisions.

Evaluated against the engine as it stands: three.js **r149** loaded from a CDN as a UMD build, everything else inside the world
JSON (the Yumina sandbox strips npm imports, cannot fetch files, may block WebAssembly, and players import one JSON file),
deterministic procedural world from canonical coordinates, phones in landscape as a first-class target.
Forks examined (shallow clones, October 2026): `gabrieldigiacomo14-web/<repo>`.

## Verdict at a glance

| Resource | Licence | Works with r149? | Works in Yumina? | Benefit | Decision |
|---|---|---|---|---|---|
| meshoptimizer (`gltfpack`, decoder) | MIT | yes (format, not three) | yes; JS decoder fallback when WASM is blocked (already vendored) | **high**: compression, and now the crowd LOD | **used** (character build + new crowd LOD) |
| three-mesh-bvh | MIT | **0.5.24 only** (0.6 needs r151, current 0.9.15 needs r159) | yes, pure JS, vendored as `src/bvh.tsx` | **high**: fast ray queries on 300k-triangle towns | **integrated**: camera collision against buildings |
| MakeHuman (assets) | CC0 1.0 (assets); program code AGPL | n/a (build input) | n/a | **high**: anatomy, morphs, skeleton weights | **already used** (assets only, no AGPL code ships) |
| glTF-Blender-IO | Apache 2.0 | n/a (build tool) | n/a | high: our exporter (runs inside `bpy`) | **already used** at build time; nothing ships |
| Poly Haven (textures, models, HDRIs) | CC0 | yes (plain images) | only if embedded in the JSON; live CDN loading would depend on Yumina's CSP and Poly Haven's bandwidth, and break offline | **high** for ground, walls, wood, roofs | **blocked here**: this environment cannot reach `api.polyhaven.com` / `dl.polyhaven.org` (see below) |
| glTF-Transform | MIT | n/a (node tool) | n/a | medium: texture resize/KTX2, pruning | **optional build tool**; gltfpack + `shrink_textures.py` cover today's needs. KTX2 would need the Basis transcoder (WASM) at runtime: risky in Yumina |
| FastNoiseLite (JS port) | MIT | yes (no three dependency) | yes, ~120 KB TS source | low to medium | **not now**. Swapping the world noise would move every hill (canonical terrain must stay identical); for surface textures our periodic value/Worley noise already tiles. Good candidate for future build-time texture baking (cellular, domain warp) |
| THREE.Terrain 3.1.1 | MIT | **no** (peer three >= 0.160, ES modules) | n/a | low | **reference only**. Its heightmap generators would replace the canonical terrain; its slope/height texture blending is what `surfaces.tsx` already does per pixel. Ideas worth borrowing later: scatter-by-slope for vegetation and grass LOD (*corrected*: it contains no erosion code, only pseudo-code in its roadmap) |
| recast-navigation-js | MIT (Recast/Detour zlib) | three helpers target current three | **poor**: core is WebAssembly (Yumina's CSP probably allows inline WASM via `'unsafe-eval'`, but there is no JS fallback; *corrected*: the ~1 MB size was an estimate, unverified), navmesh baking per streamed chunk is expensive on phones | medium (true navmesh pathing) | **not integrated**. Movement and combat AI use direct steering with the circle/box colliders (`Game.collide`); a navmesh would need either WASM or a pure-JS port. Revisit if Yumina allows WASM reliably |
| glTF-Sample-Assets | per model: CC0, CC-BY 4.0, some restricted | yes | yes (if embedded) | low for art; useful for **loader tests** | **test fixtures only** (e.g. skinning/morph samples); not game art |
| three.js (fork at r186) | MIT | — | — | large *if* we upgrade | **stay on r149 for this milestone**. Upgrading crosses r152 (colour management), r155 (physically-correct light units: every light intensity must be re-tuned), r163 (WebGL1 removed). Worth a dedicated milestone; it would unlock current three-mesh-bvh, BatchedMesh and newer loaders |

## What was integrated in this pass

1. **Crowd LOD (meshoptimizer).** `tools/character/build.sh` now also writes `assets/models/eldoria-human-lod.glb`: textures
   downscaled to 256 px and facial morphs dropped (`shrink_textures.py`), then `gltfpack -si 0.2 -se 0.04 -sp -slb` (borders
   locked so seams stay closed). 122k → 43k triangles across all variants (≈35 %), 0.8 MB. Anonymous townsfolk use it; named
   NPCs, companions and the player keep the full model. It loads after the main model and never delays the start; townsfolk
   created before it arrives are re-dressed one per frame.
2. **Camera collision (three-mesh-bvh 0.5.24).** Vendored by `tools/gen_bvh.mjs` from the npm package (same project as the fork,
   the last release compatible with r149). Each nearby settlement's merged building shell gets a BVH (built lazily, one per
   frame), and the third-person camera is pulled in front of any wall between it and the player (snaps in, eases out).
   Browser scenario `camera` checks twelve camera angles in an Aurelia street.

## Poly Haven

**Status: blocked by this environment's network policy.** `api.polyhaven.com` and `dl.polyhaven.org` are refused by the
session's egress proxy, so nothing could be listed or downloaded. Two ways forward:

- **Preferred:** add `api.polyhaven.com`, `dl.polyhaven.org` and `cdn.polyhaven.com` to the environment's allowed domains. I would
  then query the API with a project User-Agent, pick a small Aurelia set and bake it into the JSON.
- **Manual:** download the files below from polyhaven.com (each asset page → *Download* → 1K, JPG) and upload them. Slugs are
  from memory: if one does not exist, pick the closest match in the same category.

| Use in Aurelia | Suggested asset (verify on the site) | Files (1K JPG) |
|---|---|---|
| Plaza and street setts | a cobblestone / sett floor, e.g. `cobblestone_floor_08` | `_diff_1k.jpg`, `_nor_gl_1k.jpg`, `_rough_1k.jpg` |
| Ashlar walls, towers | `castle_brick_07` or `medieval_blocks_02` | same three |
| Lime plaster | a plaster wall, e.g. `plastered_wall` | same three |
| Timber beams, stall wood | `brown_planks_03` or `wood_planks` | same three |
| Roof tiles | `red_slate_roof_tiles_01` (Velkar) and a grey slate set (Aurelia) | same three |
| Grass | `forest_ground_04` or an aerial grass set | same three |
| Earth paths | `rocky_trail` or `brown_mud_leaves_01` | same three |
| Rock and cliffs | `aerial_rocks_02` or `rock_wall_08` | same three |

How they would be used: resized to 512 px, normal + roughness packed into one image, embedded as base64 (about 60–90 KB per
material per map) and fed through the existing triplanar shader in place of the generated channels, with the generated
textures kept as the Low-tier and fallback path. Budget: ~1–1.5 MB of JSON for eight materials (the JSON stores the source and
the compiled bundle, so embedded data counts twice). Poly Haven assets are CC0; credit "Textures: Poly Haven (CC0)" in the
README is courtesy, not required. The game would **not** call the live API at runtime, so the API's User-Agent rule only
applies to the build-time download script, which will send a descriptive User-Agent.

HDRIs: our sky and lighting are time-of-day driven, so a fixed HDRI would fight the day/night cycle. One neutral overcast HDRI at
low resolution could serve as the image-based reflection source for metal and wet stone; optional.
