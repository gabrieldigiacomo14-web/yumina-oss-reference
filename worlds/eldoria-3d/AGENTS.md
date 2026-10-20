# AGENTS.md — Eldoria 3D

Instructions for agents (Claude Code and others) working on `worlds/eldoria-3d` in this repository. There was no earlier
AGENTS.md for Eldoria. The user's instructions in a session take precedence over this file.

## Authority and scope

- **This folder is the implementation authority** for Eldoria 3D. Develop on the branch the session names (currently
  `claude/3d-rpg-conversion-u2xj49`). Do not replace the engine, reset progress or overwrite working systems.
- **Preserve:**
  - the seven realms;
  - canonical geography, settlements, rivers and roads;
  - player and NPC state, and save compatibility;
  - the 3d6 resolution system;
  - character creation and progression;
  - real-time exploration with turn-based combat;
  - mobile landscape controls;
  - every working feature.
- **Determinism.** World generation must stay a pure function of canonical coordinates (`src/worldgen.tsx`).
  - Decoration must use its own seeded streams (`rng(hashStr(id + ":purpose"))`), never extra draws from a layout stream.
  - The `layout` browser scenario pins Aurelia City's 187 building footprints, and `tools/world-test.mjs` guards roads, bridges and spawns.
- **three.js is pinned to r149** (UMD from jsDelivr/unpkg, `src/three.tsx`). Do not upgrade it as an incidental change;
  an upgrade is its own milestone (see `docs/research/INTEGRATION_CANDIDATES.md`).
- Do not add an external engine as a dependency. Vendor small, compatible, permissively licensed modules as TSX files
  that read the global `THREE` (patterns: `src/gltf-loader.tsx`, `src/bvh.tsx`, `src/meshopt-decoder.tsx`), each with its
  licence header and a generator script in `tools/`.

## Yumina runtime facts (verified in source; details in docs/research)

- **Compilation:**
  - `rootComponent` files are compiled by Sucrase, and every `import` is deleted by regex. Only relative imports resolve.
  - Keep each import on **one line**: the strip regex does not span newlines.
  - Injected globals: React, useYumina, Icons and a few chat components. There is no ReactDOM and no three.
- **Sandbox:**
  - The iframe is `sandbox="allow-scripts allow-pointer-lock"` (opaque origin).
  - CSP: scripts from any `https:` host; `'unsafe-eval'`; img and media from `https:`, `data:` and `blob:`; `connect-src 'none'`.
  - There are no Workers.
  - `window.fetch` is shimmed: anything except `/api/*` rejects, including `blob:` and `data:`. Use
    `GLTFLoader.parse(bytes)` and `TextureLoader`, never `ImageBitmapLoader`, `FileLoader` or `fetch`.
- **Assets:** binary data arrives only base64-embedded, or through `api.fetchAsset("@asset:<uuid>")` (ArrayBuffer, 32 MiB,
  30 s). World export does not carry uploaded assets.
- **Size:**
  - World saves are capped at **10 MiB** including `rootComponent.compiled`. Above it, `compiled` is dropped and every play recompiles in the browser.
  - Any `data:xxx/` text in the sources also stops precompile stamping.
  - Base64 counts twice (source and compiled). Keep a budget (≤ 9 MiB).
- **Storage:**
  - `api.storage` is the parent tab's localStorage, strings only and device-local. Always `JSON.stringify` objects.
  - Variables persist on the server per session. Only ids declared in `world.variables` survive.
  - Each write PATCHes the whole variable map. Batch writes and keep blobs compact with `aiAccess: "none"`.
- **Testing:** the headless harness (`tools/build-harness-page.mjs`) does not reproduce the Yumina shims or CSP. Passing
  there is not passing inside Yumina, and nothing has been verified on an iPhone inside Yumina yet. Say so in reports.

## Reference library

- 18 reference repositories (the user's forks and private repositories) live outside this repository at
  `/workspace/eldoria-references/`, with the exact versions Eldoria runs in `_pinned/` (three r149, three-mesh-bvh 0.5.24).
- Recreate them in a new container with `tools/setup-references.sh`. Private repositories must be attached to the session
  first.
- Read before relying on them:
  - [docs/research/REFERENCE_REPOSITORIES.md](docs/research/REFERENCE_REPOSITORIES.md): index, paths, commits and where to look first.
  - [docs/research/REFERENCE_REPOSITORY_AUDIT.md](docs/research/REFERENCE_REPOSITORY_AUDIT.md): per-repository findings with file and line citations.
  - [docs/research/GRAPHICS_TECHNIQUES.md](docs/research/GRAPHICS_TECHNIQUES.md): techniques against r149, Yumina and iPhone constraints.
  - [docs/research/INTEGRATION_CANDIDATES.md](docs/research/INTEGRATION_CANDIDATES.md): ranked next steps (P0 production fixes first) and rejected options.
- **Cloning is not permission to copy.**
  - No GPL or AGPL code enters Eldoria without a deliberate licence review and the user's approval. That covers MakeHuman
    code, shaders and `.mhanim` clips, RPGAtlas, and the Yumina platform code (Eldoria only targets its API).
  - MIT, BSD and Apache code may be adapted with its notice kept.
  - MakeHuman assets are CC0.
- **Reference images** (Yumina-Image-references) are art direction only. They are not licensed for production; do not ship their pixels.
- **Respect the other repositories' rules.** Treat all of them as read-only: never commit or push to them.
  - UGDL is a read-only knowledge library; its implementation layer is dormant without explicit authorisation.
  - Yumina-Game-Foundry keeps games isolated under `games/<id>`.
  - Do not move STGAAB lore, characters or mechanics into Eldoria.
- Never commit the clones, large asset collections or generated binaries into this repository (the built GLBs in
  `assets/models/` and `dist/eldoria-3d.json` are the existing, deliberate exceptions).

## Working conventions

- **Build and tests:**
  - Build: `node tools/check.mjs && node tools/build.mjs` (writes `dist/eldoria-3d.json`).
  - Tests: `node tools/unit.mjs`, `node tools/world-test.mjs`, `node tools/lint.mjs <harness>` and `PW_CORE=… node tools/browser-test.mjs <harness> [scenario…]`.
  - Do not run heavy CPU jobs (Blender builds, screenshot renders) during the full browser suite: timing-sensitive scenarios fail under contention.
- **Character assets:**
  - Rebuild with `tools/character/build.sh` (Blender `bpy`, gltfpack), then `node tools/gen_builtin_models.mjs`.
  - Keep `gltfpack -ce ext`: r149 cannot load `KHR_meshopt_compression`.
- **Reporting:** distinguish implemented, tested in headless Chromium, tested inside Yumina, and needing external assets. Do not
  present procedural placeholders as finished realistic art.
