# Reference repository audit

Read-only audit of the reference library cloned for Eldoria 3D (October 2026). Each repository was inspected at the commit
listed in [REFERENCE_REPOSITORIES.md](REFERENCE_REPOSITORIES.md) (local paths, branches, full SHAs and how to recreate the
library with `tools/setup-references.sh`). Nothing from these repositories is copied into Eldoria by this audit.

How it was done: the repositories were split into five groups, each audited by reading actual source (file paths and
line numbers are cited), with a small number of benchmarks run on the desktop build host (no iPhone measurements).
The critical Yumina facts (fetch shim, CSP, 10 MiB save limit) were re-checked by hand against the source before being
recorded. Every section follows the same ten headings: purpose; files worth studying; techniques for Eldoria;
dependencies and three.js compatibility; Yumina sandbox compatibility; iPhone/mobile performance; licence obligations;
recommended approach; what was actually inspected; remaining gaps.

Legend: **[V]** verified in source during this audit (path cited); **[I]** inference, recollection or browser-spec reasoning.
"Eldoria" refers to `worlds/eldoria-3d` on branch `claude/3d-rpg-conversion-u2xj49`.

Corrections to the earlier `docs/oss-evaluation.md` found by this audit:
- THREE.Terrain contains **no erosion code** (only pseudo-code in `roadmap.md`); there is nothing to borrow there.
- The recast-navigation-js "about 1 MB" size was an estimate; no built artefact is in the checkout, so it is unverified.
- The `glTF-Transform-iphone-version` fork is plain upstream glTF-Transform 4.5.1 (one upstream commit, nothing iPhone-specific).

Contents
1. [Yumina runtime (yumina-oss-reference)](#yumina-oss-reference)
2. [Rendering and optimisation: three.js, three-mesh-bvh, meshoptimizer, glTF-Transform](#audit-b-rendering-geometry-and-asset-pipeline-references-for-eldoria-3d)
3. [Terrain, noise and navigation: THREE.Terrain, FastNoiseLite, recast-navigation-js, rot.js](#terrain-noise-and-navigation)
4. [Characters and assets: MakeHuman, glTF-Blender-IO, glTF-Sample-Assets, Yumina-Image-references](#characters-and-assets)
5. [Architecture and RPG systems: UGDL, Yumina-Game-Foundry, STGAAB-Visual-RPG, RPGAtlas, RPG-JS](#architecture-and-rpg-systems)

---

## yumina-oss-reference

Audited: `/workspace/eldoria-references/yumina-oss-reference` @ `e91bf634d32c156479c745c0ee3ea399035b670e` ("Yumina v0.0.73.0"),
sparse checkout (packages/, docs/, top-level *.md/*.json). `LICENSE` is tracked but not checked out; read with `git show HEAD:LICENSE`.
The fork's copies of the key files (`/home/user/yumina-oss-reference/packages/...`: tsx-bundler.ts, tsx-component-builder.ts,
compat-shims.ts, server/src/index.ts, world-renderer.tsx, shared limits.ts, engine schema.ts) are byte-identical to the reference
(checked with `cmp`), so the facts below apply to the code Eldoria builds against.
Paths below are relative to `packages/` unless stated. "Verified" = read in code. "Inference" = my reasoning about browser behaviour or intent.

### 1 Purpose and relevant functionality

Yumina is an AI interactive-fiction platform (React app + Hono server + engine). A world is a JSON `WorldDefinition`. Its visual
layer is `rootComponent`: a virtual file system of TSX files that is compiled with Sucrase and run inside an iframe sandbox. The
component talks to the host only through `useYumina()`. The host does postMessage RPC, keeps variables in the session state on the
server, and serves assets from `/cdn/<uuid>`. For Eldoria this decides which browser features work, how binary assets get in,
how state persists, and the size ceilings for the whole world.

### 2 Exact source files worth studying

- `app/src/lib/tsx/tsx-bundler.ts`: `bundleTSX`/`assembleBundle`/`compileFile`/`bundleAndCompile`, the multi-file bundler (relative imports only).
- `app/src/lib/tsx/tsx-component-builder.ts`: `buildComponent`, the `new Function` wrapper and the injected scope (no Sucrase).
- `app/src/lib/tsx/tsx-compiler.ts`: `compileTSX`/`transformTSX` (single file), plus the SECURITY MODEL comment (L38-47).
- `app/src/features/studio/lib/compiled-format.ts`: `hashRootFiles`, `isCompiledValid`, `COMPILED_FORMAT_VERSION = 1`.
- `app/sandbox/component-host.tsx`: sandbox runtime; `install-root` handler (L1066-1150) and `installCompatShims()` call (L1277).
- `app/sandbox/sandbox-context.tsx`: `SandboxedYuminaAPI` type (L71-600), `buildAPI` (L1249+), `callParent` (L1169).
- `app/sandbox/compat-shims.ts`: replaces `window.fetch`, `localStorage`, `sessionStorage`, `location` and `navigator.clipboard`.
- `app/sandbox/index.html`, `app/sandbox/main.tsx`: the sandbox document (viewport-fit=cover, overflow rules).
- `app/src/lib/sandbox-media.ts`: `installSandboxMedia`, which proxies `Audio`/`AudioContext` so the host can suspend them.
- `app/src/features/chat/world-renderer.tsx`: the iframe element (L2397-2416), the parent RPC handlers (fetchAsset L809, storage L1577, patchVariables L535) and the install effect (L2114-2162).
- `server/src/index.ts`: `SANDBOX_CSP` (L380-395), sandbox and `/cdn` headers (L310-314, L405-460).
- `shared/src/constants/limits.ts`: asset and request-body limits (L93-102).
- `server/src/middleware/request-body-limit.ts`: 10 MiB world save vs 5 MB for all other `/api/*` requests.
- `app/src/lib/world-save-payload.ts`: `serializeWorldSavePayload` drops `rootComponent.compiled` when over the limit.
- `app/src/stores/editor.ts` L4193-4235: save-time precompile stamping.
- `server/src/lib/asset-validation.ts` and `server/src/routes/worlds.ts` L2036-2066: the inline data-URI rejection.
- `engine/src/world/schema.ts`: `variableSchema` (L44-84), `rootComponentSchema` (L601-621), `worldDefinitionSchema` (L631-720).
- `engine/src/state/game-state-manager.ts` `normalizeState` (L727-766): drops undeclared variables.
- `app/src/stores/chat.ts` `setVariableDirectly` (L2456-2520); `server/src/routes/sessions.ts` PATCH `/:id/state` (L620+).
- `server/src/lib/player-state.ts`: cross-playthrough `persist: "player"` storage.
- `server/src/routes/assets.ts`: `ALLOWED_MIME_TYPES` (L31-63); `server/src/routes/cdn.ts` (`serveAssetById`).
- `app/src/lib/import-world.ts` (`parseImportedFile`, `parseImportedJson`); `app/src/features/library/library-my-projects.tsx` (`handleExportProject` L132-148).
- `docs/world-spec/custom-ui.md`: the creator-facing API doc. It is partly stale vs code (see §10).

### 3 Techniques/constraints applicable to Eldoria

**Compilation (verified).**
- Play path (`world-renderer.tsx` L2114-2162): if `isCompiledValid(precompiled, entryFile, files)` holds, the stored `compiled.code` is posted as-is. Otherwise the parent compiles: `transformTSX` for one file, `bundleTSX` for several.
- The sandbox only runs `buildComponent(compiledCode, useYumina, scope)` (`component-host.tsx` L1097).
- `isCompiledValid` (`compiled-format.ts` L39-49) requires `compilerVersion === 1` and `filesHash === hashRootFiles(entryFile, files)`. The hash is djb2 over canonical JSON of the sorted files, plus a length suffix.
- `compileFile` (`tsx-bundler.ts` L253-362) runs Sucrase with `transforms:["typescript","jsx"]`, `jsxRuntime:"classic"` and `production:true`.
- It then deletes every `import … from '…'` and bare `import '…'` with regexes (L293-295). `buildComponent` runs the same regexes again (L50-51).
  - npm and package imports therefore vanish silently. Only relative `./x` and `../x` specifiers are resolved (`parseImports` L139, `resolveFile` L191).
  - The strip regex uses `.*?`, which does not match newlines. A multi-line `import {\n a,\n b\n} from "./x"` keeps its text and becomes a syntax error.
  - The regexes also act inside string literals. This is verified from the regex; whether it bites depends on the content.
- Exports are rewritten by regex (L297-359). The bundle ends with `return exports.default ?? module.exports.default ?? <default name>` (L531-533).
- Each non-entry file becomes `var __mod_<name> = (function(){…})()` in topological order. Circular imports are a hard error (L413).
- Globals injected as `new Function` parameters (`tsx-component-builder.ts` L103-123, `tsx-bundler.ts` L576-596): `React`, `useYumina`, `useAssetFont`, `Icons` (all lucide-react, `lucide-scope.ts`), `ChatCanvas`, `Chat`, `MessageList`, `MessageInput`, `ModelPickerModal`, `ModelTrigger`, `SessionMemoryModal`, `LoreSlot`, `LoreButton`, `LorePanel`, `LoreGroup`, `LoreSwitch`, `exports`, `module`. ReactDOM is not injected and there is no three.js.
- `tsx-compiler.ts` L38-47 states plainly that the compiler sandboxes nothing. Containment comes from the iframe.

**Save-time stamping (verified).**
- `editor.ts` L4202-4229 stamps `compiled` only when `!/data:[a-z]+\//i.test(JSON.stringify(rcFiles))`. Any `data:xxx/` text anywhere in the sources disables stamping.
- `serializeWorldSavePayload` (`world-save-payload.ts` L67-88) removes `compiled` when the JSON body exceeds `MAX_WORLD_SAVE_BODY_BYTES` = 10 MiB. It throws `WorldSavePayloadTooLargeError` if the body is still too big after that.
- Server limits (`request-body-limit.ts` L4-8): POST `/api/worlds` and PATCH `/api/worlds/:id` allow 10 MiB. Every other `/api/*` request allows 5 MB (`limits.ts` L100-102).

**Eldoria today (measured on `worlds/eldoria-3d/dist/eldoria-3d.json`).**

| Part | Bytes |
|---|---|
| Whole JSON | 10,931,726 |
| rootComponent.files | 5,164,187 |
| compiled | 5,220,296 |
| World without compiled | 5,711,416 |

- 10 MiB is 10,485,760 bytes, so the whole world is about 446 KB over the save limit.
- `src/gltf-loader.tsx` L1348 contains a literal `'data:image/webp;base64,…'` (three's WebP feature probe). It trips the client-side `data:` check.
- Effect (inference from the verified code path): after Library import and save, `compiled` is either stripped (over 10 MiB) or never re-stamped (data: check). Every play load would then recompile about 5 MB of TSX, including the 3.8 MB base64 GLB in `builtin-models.tsx`, with Sucrase in the parent tab. On an iPhone that is a heavy cold start.
- The server-side check (`asset-validation.ts` L18) matches only `data:(image|audio|video|font)/…;base64,` followed by at least 200 characters. Eldoria's bare base64 strings and the short WebP probe pass it.

**Network and storage inside the sandbox (verified).**
- `compat-shims.ts` `shimFetch` (L87-145) replaces `window.fetch`:
  - `/api/*` is proxied to the parent;
  - `/cdn/*` passes to the real fetch, which CSP `connect-src 'none'` then blocks;
  - everything else rejects with "Network requests to '…' are not available in the sandbox" (L138-144). That includes `blob:`, `data:` and `https:`.
- three's `FileLoader` and `ImageBitmapLoader` call global `fetch`. Verified in `_pinned/three-r149/src/loaders/FileLoader.js` L88 and `ImageBitmapLoader.js` L68. So `GLTFLoader.load(url)`, `AudioLoader` and `FileLoader` all fail. Only `GLTFLoader.parse(arrayBuffer)` works.
- `shimStorage` (L219-290) replaces `localStorage`/`sessionStorage` with an in-memory cache. `getItem` only reads that cache. `populateStorageCache` (L296) is never called anywhere (grep), so values do not survive a reload through `localStorage`. Use `api.storage`.

### 4 Dependency and Three.js compatibility

- The platform's own React is used (`react`/`react-dom`, with a `vendor-react` chunk in `app/vite.config.ts`). Version: inference, not checked in package.json.
- Yumina does not ship three.js and nothing in app/server references WebGL (grep for `webgl`/`OffscreenCanvas` finds no hits in app src/sandbox). three.js must come from outside:
  - **CDN `<script>`**: `default-src https: 'unsafe-inline' 'unsafe-eval'` covers scripts, so `https://cdn.jsdelivr.net/...three.min.js` loads. This is what Eldoria does (`src/three.tsx` L6-18, r149 UMD with an unpkg fallback, `crossOrigin="anonymous"`). It depends on the player reaching jsDelivr/unpkg.
  - **Inline into the bundle**: the bundler cannot resolve npm imports, so this means vendoring source as TSX files. The bundle then counts toward the 10 MiB world limit.
- r149 is the last release with `build/three.min.js` (UMD global). Later releases are ESM-only, and the bundler would delete ESM imports (§3). Staying on a UMD global, or vendoring, is the practical path. This is inference about three's packaging and is consistent with Eldoria's choice.
- **GLTFLoader inside the sandbox:** use `parse()` on bytes from `api.fetchAsset` or inline base64.
  - Embedded GLB images become `blob:` URLs (`gltf-loader.tsx` L2999). The vendored loader picks `ImageBitmapLoader` unless the browser is Safari, Firefox before 98, or lacks `createImageBitmap` (`gltf-loader.tsx` L2315-2336). `ImageBitmapLoader` calls `fetch(blob:)`, which the shim rejects.
  - So on desktop Chrome, Edge and Android Chrome, GLB textures should fail inside real Yumina (inference from verified code). iOS takes `TextureLoader` (`<img>`, and `img-src blob:` is allowed) and should work.
  - The harness does not reproduce this (§10). Fix: force `TextureLoader`, or install a `fetch` that handles `blob:` and `data:` locally (e.g. via `createImageBitmap(blob)`).
- **WebAssembly** (meshopt decoder, `src/meshopt-decoder.tsx` L46-56): `'unsafe-eval'` sits in the script-src fallback. By CSP3 it also permits `WebAssembly.instantiate(bytes)`. This is inference about browser CSP semantics; there is no `wasm-unsafe-eval` token. The bytes must be inline, because `instantiateStreaming(fetch())` is blocked. Eldoria already falls back to JS (L701-704).
- **Workers:** no `worker-src` or `child-src` directive, so the fallback is `default-src https:`. `blob:` and `data:` workers are blocked. `https:` cross-origin workers are not allowed by the Worker constructor from an opaque origin (inference). Eldoria does not call `useWorkers` (grep). Keep it that way.

### 5 Yumina sandbox compatibility (facts)

1. **iframe** (`world-renderer.tsx` L2397-2405): `sandbox="allow-scripts allow-pointer-lock"`, `allow="autoplay; fullscreen; pointer-lock"`, `referrerPolicy="no-referrer"`. The origin is opaque (no `allow-same-origin`).
   - Real `localStorage`, `sessionStorage`, IndexedDB and cookies are unusable (`composer-draft.ts` L6-7 notes sessionStorage throws).
   - Without `allow-modals`, `alert`/`confirm`/`prompt` are blocked. There is no `allow-popups`, `allow-forms` or `allow-downloads` (browser semantics; inference).
2. **CSP** (`server/src/index.ts` L380-395), sent on `/sandbox/*` and `/assets/sandbox-doc-*.html` (L405-411, L452-460):
   `default-src https: 'unsafe-inline' 'unsafe-eval'; img-src https: data: blob:; font-src https: data:; media-src https: data: blob:;
   connect-src 'none'; frame-src https://*.pages.dev https://*.vercel.app https://*.netlify.app https://*.github.io; frame-ancestors 'self'`.
   - Scripts and styles can load from any `https:` host (Google Fonts link works). There is no `blob:` or `data:` for scripts or workers.
   - Images, audio and video can come from `https:`, `data:` and `blob:`. That allows `<img src=blob:>` and `new Audio(blob:)`.
   - Vite dev sets no CSP (only CORS `*`, `vite.config.ts` L78-81). Local dev is more permissive than production.
3. **Network:** `connect-src 'none'` plus the fetch shim (§3) means no fetch, XHR, WebSocket or EventSource from the card.
   - `/cdn/*` sets `Access-Control-Allow-Origin: *` (`index.ts` L310-314), so `<img crossOrigin="anonymous" src="/cdn/<uuid>">` can be used as a WebGL texture.
   - The sandbox's `api.resolveAssetUrl` returns a root-relative `/cdn/<uuid>` (`sandbox-context.tsx` L1240-1245). That only resolves when the sandbox document is served from the app origin, which is the default. Inference: a `VITE_SANDBOX_URL` on another host would break it.
4. **RPC:** `callParent(method,args,timeoutMs=10_000)` (`sandbox-context.tsx` L1169-1187) uses postMessage with `{type:"api-call"}`. The parent allowlist is the `switch` in `world-renderer.tsx`; unknown methods are rejected (L1620-1624). `safePostMessage` falls back to JSON when an iOS structured-clone fails (`protocol.ts` L653-668).
5. **`useYumina()` surface** (`SandboxedYuminaAPI`, `sandbox-context.tsx` L71-600; implemented in `buildAPI` L1249+). Main members:
   - **Reads (sync):** `variables`, `globalVariables` (same object as `variables`, see `chat-view.tsx` L659-660), `worldName`, `worldId`, `sessionId`, `messages`, `isStreaming`, `streamingContent`, `mode`, `capabilities`, `readOnly`, `pendingChoices`, `entries`, `getEntry(name)`, `user`, `currentUser`, `worldCover`, `background`, `canvasMode`, `language`.
   - **State writes:**
     - `setVariable(id, value, opts?)` is fire-and-forget (`postToParent`, L1317). The parent calls `setVariableDirectly(resolveVariableKey(id), value)` (`chat-view.tsx` L653).
     - `patchVariables(values)` returns a Promise with a 20 s timeout (L1321). It PATCHes `/api/sessions/:id/state` with header `X-Yumina-State-Acknowledgement: required` and rejects when read-only or not in `session` mode (`world-renderer.tsx` L535-566).
     - Also: `executeAction(id)` and `executeActionAndWait(id, params)`.
   - **Chat:** `sendMessage(text, attachments?)` (fire-and-forget), `setScene(scene, {events})`, `onStoryEvent(cb)`, `callAi(name,input)` (130 s), `ai.complete`, `stopGeneration`, `regenerateMessage`, `continueLastMessage`, `clearPendingChoices`, `editMessage`, `deleteMessage`, `swipeMessage`, checkpoints, `switchGreeting(i)`, `showToast(msg,type)`, `copyToClipboard`, `toggleImmersive`, `navigate`.
   - **Audio:** `playAudio(trackId,{volume,fadeDuration(s),chainTo,maxDuration,duckBgm,loop})`, `stopAudio`, `pauseAudio`, `resumeAudio`, `onAudioEnded`, `setAudioVolume`, `getAudioVolume`. These play world `audioTracks` in the parent window.
   - **Assets:** `fetchAsset(ref)` returns `{ok, bytes?: ArrayBuffer, contentType?, error?}` with a 30 s RPC timeout (L1392-1397).
     - The parent accepts only `@asset:<uuid>` or a bare uuid. It fetches `${VITE_API_URL}/cdn/<uuid>` with `credentials:"omit"` (`world-renderer.tsx` L809-841).
     - Errors: `bad-ref`, `http-<status>`, `too-large` (`MAX_FETCH_ASSET_BYTES = 32 MiB`, L103), `unavailable`, or a timeout message.
     - It is not gated on session (works in Studio preview). The code does not limit it to the world's own assets: any public asset uuid works.
     - Bytes come back through structured clone, a copy rather than a transfer (inference from `safePostMessage`).
   - `resolveAssetUrl(ref)` is a sync string transform (L1240).
   - **Storage, three distinct things:**
     - `storage.get/set/remove(key)`: the PARENT's `localStorage` under the key `yumina:local:<worldId>:<key>` (`world-storage.ts` L2-8, `world-renderer.tsx` L1577-1609). It is per browser and device and does not sync, although `custom-ui.md` calls it "Persistent".
       - `set` calls `localStorage.setItem(key, args[1] as string)` (L1603, `world-storage.ts` L15), so a non-string becomes `"[object Object]"`. `get` returns `string|null`.
       - 10 s timeout. Quota errors reject.
     - `sessionStorage.get/set/remove(key, value, {version…})`: server-side JSON tied to the save, with versioning and a 60 s timeout. Read-only views throw (`world-renderer.tsx` L498-508; `src/lib/session-storage.ts`).
     - `media.list/upload/pick/remove`: private per-save images.
6. **Variables and persistence:**
   - `setVariableDirectly` (`chat.ts` L2456-2520) updates the store and then queues a coalesced PATCH. The PATCH carries the entire `variables` object (`state: { variables: get().gameState }`) and retries a 409 up to 5 times every 1.5 s.
   - The server merges with `mergeGameStatePatch` (`server/src/lib/game-state.ts` L18-55), which normalizes through `GameStateManager.normalizeState`.
   - `normalizeState` (`game-state-manager.ts` L727-766) keeps only variable ids declared in `world.variables`, plus keys starting with `__lore_`. **Undeclared keys are silently dropped.**
   - The body limit for that PATCH is 5 MB (non-world `/api` route). `variableSchema` has no per-variable size cap.
   - `aiAccess: "none"` (`schema.ts` L72) keeps a variable out of the prompt.
   - `persist: "player"` (L74) copies the value across playthroughs of the same world. The client POSTs to `/api/sessions/:id/player-state` after an 800 ms debounce (`chat-view.tsx` L258-276). The server stores it in `player_world_state` and **silently skips saving when the JSON exceeds 64,000 chars** (`player-state.ts` L36-41).
   - Variables travel to the sandbox as a whole channel after `JSON.stringify`, re-sent on each change (`pushIfChanged`, `world-renderer.tsx` L2168-2175).
7. **Media lifecycle:** `installSandboxMedia` proxies `Audio`, `AudioContext` and `webkitAudioContext`. When the world is not the visible session the host suspends them (`setMediaSuspended(!isActive)`). `media-src` allows `data:`/`blob:` for the iOS unlock (`index.ts` L384-388).
8. **Asset uploads:**
   - `POST /api/worlds/:worldId/assets/upload-url` (`assets.ts` L82-127) checks the MIME type per type. `other` has an empty allowlist, so any type is accepted. `image` allows only jpeg/png/gif/webp. `.glb` has no extension mapping in `asset-mime.ts` and falls back to `application/octet-stream`.
   - `MAX_ASSET_SIZE_{IMAGE 10MB, AUDIO 25MB, FONT 5MB, OTHER 10MB}` (`limits.ts` L94-97) are exported but used nowhere outside `shared/src` (grep). The presigned PUT has no `ContentLength` for world assets (`s3.ts` L107-123). The client only warns about large files (`asset-upload.ts` L465-470).
   - The practical read ceiling is `fetchAsset`'s 32 MiB and 30 s.
   - The asset picker's file `accept` list omits `.glb` (`asset-picker.tsx` L240-247). Drag-and-drop bypasses it (L99-110).
9. **World JSON (`worldDefinitionSchema`, `schema.ts` L631-720):**
   - Asset-related fields: `audioTracks[].url`, `sceneImages[].url`, `backgrounds`, `bgmPlaylist`, `conditionalBGM`, `avatar` (deprecated), `landscapeCover`.
   - `rootComponent = {id, name, assetLoading?: "automatic"|"on-demand", entryFile="index.tsx", files: Record<string,string>, updatedAt, compiled?: {code, filesHash, compilerVersion}, generatedFrom?: "uiDoc"}` (L601-621).
   - `assetLoading:"on-demand"` disables all host preload hints for the world (`custom-ui.md` L22-24).
   - There is no binary/asset field. Binaries live in the asset table/S3 and are referenced as `@asset:<uuid>`.
10. **Import/export:**
    - Export (`library-my-projects.tsx` L132-148) is just `JSON.stringify(data.schema)` from `GET /api/worlds/:id`. **Uploaded asset bytes are not included.** `@asset:<uuid>` refs keep working only on the same Yumina instance while the asset row and object exist (the `/cdn/:assetId` lookup is public).
    - Import (`import-world.ts` L318-344, L206-233) accepts JSON or PNG (tEXt `yumina`/`ccv3`/`chara`). It detects the format and runs `migrateWorldDefinition`. There is **no `worldDefinitionSchema.safeParse`** at import.
    - The server validates `schema` only as `z.record(z.unknown())` (`shared/src/validation/world.ts` L12-26). It adds the inline-data-URI scan, which rejects saves that add new matches (`worlds.ts` L2036-2066), and the 10 MiB body cap.

### 6 iPhone/mobile considerations

- Verified in code:
  - The sandbox doc uses `viewport-fit=cover` and `--mobile-safe-bottom: env(safe-area-inset-bottom)`. `html, body` are `overflow:hidden; overscroll-behavior:none`; `#sandbox-root` is the single scroller with `touch-action: manipulation` (`sandbox/index.html` L5, L30-43).
  - A scroll-clamp watchdog runs a heartbeat every 2.5 s and listens to touchstart/touchend/resize (`component-host.tsx` L624-660). It patches `window.scrollTo`, `Element.prototype.scrollIntoView` and `scrollTop`/`scrollLeft` (L370-445). A fullscreen WebGL canvas should keep `#sandbox-root` from scrolling (e.g. `position:fixed; inset:0`) so the clamp never fights it.
  - The iframe is kept paintable under the loading overlay because "an invisible frame can have its animation callbacks throttled by WebKit" (`world-renderer.tsx` L2414-2415).
  - iOS Safari structured-clone failures fall back to JSON (`protocol.ts` L650-668). Large `ArrayBuffer`s from `fetchAsset` clone fine, but every variables push stringifies the whole variable map.
  - Audio: `autoplay` is allowed by the iframe; the host retries autoplay on the first touch/click/keydown (`component-host.tsx` L1281-1286). `AudioContext` is wrapped (`sandbox-media.ts`).
- Inference:
  - Pointer lock is allowed but meaningless on iPhone. iPhone Safari has no element fullscreen for non-video, so `allow="fullscreen"` will not give a fullscreen canvas there.
  - Neither `gyroscope` nor `accelerometer` is in `allow`, so device-motion controls are unavailable.
  - Real iOS memory pressure (WebGL context loss) is not handled anywhere in Yumina. The card must handle `webglcontextlost`; Eldoria does not register it (grep found no hits).
  - A 5 MB parent-side Sucrase compile plus a 3.8 MB base64 decode on every cold start is the biggest mobile cost Eldoria can control.

### 7 License obligations

- Code is **AGPL-3.0-only**: root `package.json` `"license"`, all four `packages/*/package.json`, and the standard 661-line `LICENSE` (no extra §7 terms seen). Docs under `docs/` are **CC BY 4.0** (`LICENSE-DOCS.md`). "Yumina", its logo and yumina.io are trademarks of Yumina Inc. and covered by neither license (`TRADEMARK.md`). `CLA.md` applies only to contributions sent upstream. No SPDX/copyright headers in sources (grep).
- **For Eldoria (inference, not legal advice):**
  - The fork itself (`packages/`) is AGPL. Anyone who runs a modified copy as a network service must offer its source (AGPL §13). Keep `LICENSE` and the notices.
  - The world's own TSX and data only call `useYumina()` and run as content inside the sandbox. They plausibly do not have to be AGPL, but this is not settled. Placing Eldoria in the same repository without its own LICENSE file means it inherits nothing explicit. **Add a license file for `worlds/eldoria-3d/`.**
  - Build tooling and the harness link AGPL code: `tools/build.mjs` loads `packages/app/src/lib/tsx/tsx-bundler.ts`, and `harness-entry.tsx` bundles `buildComponent`. A distributed `harness.js` is AGPL-covered.
  - Text copied from `docs/` needs CC BY attribution, e.g. "Based on the Yumina docs, https://github.com/lovetimo0421/yumina-oss, CC BY 4.0".
  - Saying "a world built on Yumina" or "compatible with the Yumina world spec" is fine. Do not name or brand Eldoria or a hosted fork "Yumina…" or use the logo.
  - Third-party code Eldoria vendors carries its own notices: three.js, GLTFLoader, three-mesh-bvh and meshoptimizer are MIT (keep their copyright headers); MakeHuman assets are CC0. This audit did not verify those headers.

### 8 Recommended approach for Eldoria

1. **Get under 10 MiB with `compiled` included, and make stamping possible.**
   - Move the 2.0 MB + 0.8 MB GLBs out of `builtin-models.tsx` into uploaded world assets (type `other`) and load them with `api.fetchAsset("@asset:<uuid>")` then `GLTFLoader.parse`. Keep base64 only as a fallback for tests or offline.
   - Remove the literal `data:image/webp` text, e.g. build it by concatenation, so `editor.ts` will stamp `compiled`.
   - Without the GLB the world is about 5.7 − 3.8 + compiled ≈ 3.6 MB, so play loads use the precompiled fast path.
   - Caveat: assets must then be re-uploaded per instance, because export does not carry them.
2. **Fix GLB textures on non-Safari browsers.** Force `TextureLoader` in the vendored GLTFLoader, or give the loader a manager whose `fetch` resolves `blob:`/`data:` locally. Without this, desktop and Android Chrome fall back to procedural bodies (§4).
3. **Fix `api.storage` usage.**
   - `hud.tsx` L46-47 stores an object and expects an object back. In real Yumina, `set` stores `"[object Object]"` and `get` returns a string, so HUD fold state is silently lost. `JSON.stringify` on set and `JSON.parse` on get.
   - Treat `api.storage` as device-local. Persist anything that must follow the player in declared variables (`persist:"player"` if it should outlive a playthrough, staying under 64,000 chars) or in `api.sessionStorage`.
4. **Declare every variable the client writes** in `world.variables`. Undeclared ids are dropped server-side. Keep `aiAccess:"none"` on big JSON blobs (`world3d-state`, `world3d-models`).
5. **Write variables sparingly.** Each write causes a full-variables PATCH and a full-channel stringify. Batch movement and clock writes into `patchVariables` at a low cadence, and keep `world3d-state` compact (it must stay well under the 5 MB body limit).
6. **Keep the three r149 UMD from CDN or vendor it as TSX**, keep WASM inline with the JS fallback, and use no Workers or `blob:` scripts.
7. **Make the harness match production:** run `installCompatShims()`-equivalent fetch/storage shims, serve the page with `SANDBOX_CSP`, use an opaque-origin iframe (`sandbox="allow-scripts allow-pointer-lock"`), and give the mock `storage` real localStorage semantics (string coercion).
8. **Handle `webglcontextlost`/`webglcontextrestored`**, and lower quality when a cold start is slow on iOS.

### 9 What was actually inspected

- **Reference repo, read:**
  - `LICENSE` (via git show), `LICENSE-DOCS.md`, `TRADEMARK.md`, `CLA.md` (first 60 lines), root `package.json`, `README.md` (license section)
  - `app/src/lib/tsx/{tsx-bundler,tsx-component-builder,tsx-compiler,lucide-scope,viewport-units}.ts`, `app/src/features/studio/lib/compiled-format.ts`
  - `app/sandbox/{index.html,main.tsx,compat-shims.ts}`, `app/sandbox/component-host.tsx` (L1-72, L1060-1300), `app/sandbox/sandbox-context.tsx` (L71-335, L1144-1450), `app/sandbox/protocol.ts` (L630-669), `app/src/lib/sandbox-media.ts` (L1-80)
  - `app/src/features/chat/world-renderer.tsx` (L490-600, L790-880, L1530-1625, L2090-2200, L2370-2430), `app/src/features/chat/chat-view.tsx` (L255-290, L600-670), `app/src/features/chat/world-storage.ts`, `app/src/stores/chat.ts` (L2440-2530), `app/src/stores/editor.ts` (L225-250, L4180-4240)
  - `app/src/lib/{world-save-payload,asset-url,import-world}.ts` (relevant parts), `app/src/features/editor/sections/overview.tsx` (import), `app/src/features/library/library-my-projects.tsx` (export), `app/src/features/editor/asset-picker.tsx` (L95-120, L225-250), `app/vite.config.ts` (L50-100)
  - `server/src/index.ts` (L300-480), `server/src/middleware/request-body-limit.ts`, `server/src/lib/{asset-validation,player-state,game-state,asset-mime}.ts`, `server/src/lib/s3.ts` (generateUploadUrl), `server/src/routes/assets.ts` (L1-135), `server/src/routes/cdn.ts` (grep), `server/src/routes/worlds.ts` (L2025-2070), `server/src/routes/sessions.ts` (L620-700, L975-1000), `server/src/db/schema.ts` (player_world_state)
  - `shared/src/constants/limits.ts`, `shared/src/validation/world.ts` (grep)
  - `engine/src/world/schema.ts` (L36-130, L596-740), `engine/src/state/game-state-manager.ts` (constructor, set, normalizeState)
  - `docs/world-spec/custom-ui.md` (L1-60, L230-330)
- **three r149 (pinned):** `src/loaders/ImageBitmapLoader.js`, `src/loaders/FileLoader.js` (fetch calls only).
- **Eldoria (read-only):**
  - `worlds/eldoria-3d/README.md` (full), `tools/build.mjs`, `tools/build-harness-page.mjs`, `tools/harness-entry.tsx` (full)
  - `src/index.tsx` (L1-66), `src/hud.tsx` (L44-52, L98-102, L300-310), `src/rig.tsx` (grep L4, L88, L102, L114), `src/three.tsx` (L6-18), `src/meshopt-decoder.tsx` (grep), `src/gltf-loader.tsx` (L2315-2336, L1348, L2999)
  - `lore/3d-variables.json`; sizes of `dist/` and `src/`.

### 10 Remaining gaps and uncertainties

- Not executed: I did not run Yumina, so CSP, `blob:` texture failure on Chrome and the WASM-under-`unsafe-eval` behaviour are inferred from code plus browser specs, not observed. The `GLTFLoader` texture failure mode (whole parse rejects vs. a missing texture) was not traced.
- I did not trace whether the editor's `loadWorldDefinition` keeps an imported `compiled` blob, or whether the Library "Import" path uses the same save. Either way, a body over 10 MiB drops `compiled`.
- Asset deletion and orphaning on world delete, and whether `/cdn/:assetId` serves assets of unpublished or deleted worlds, were not fully read (`cdn.ts` only grepped). Whether the `inferAssetTypeFromFile` output for `.glb` is "other" was not checked.
- `docs/world-spec/custom-ui.md` calls `storage` "World-Scoped, Persistent"; the code makes it browser-local. The doc lists `switchGreeting` returning `void`; the code returns `Promise<void>`. Trust the code.
- The Studio board preview rewrites `\dv[wh]…` viewport units in sources (`viewport-units.ts`, used in `live-frontend-preview.tsx` L406 when `fitToFrame`). This could alter base64 or minified code in that preview only. Not tested.
- React version, the hosted edition's proprietary modules (`edition.*`), and Cloudflare-side headers are outside this OSS checkout.
- Legal conclusions in §7 are interpretation, not counsel.

### Key facts for AGENTS.md

- Root component = TSX virtual FS compiled by Sucrase (`tsx-bundler.ts`/`tsx-component-builder.ts`). Every `import` is regex-stripped and only relative imports resolve. Globals: `React, useYumina, useAssetFont, Icons, Chat, MessageList, MessageInput, ChatCanvas, Model*, SessionMemoryModal, Lore*`. No npm and no three.js.
- Keep imports single-line: the strip regex does not span newlines.
- The sandbox iframe is `allow-scripts allow-pointer-lock` with an opaque origin. Real localStorage, IndexedDB, cookies, modals and popups are unavailable.
- CSP: scripts and styles from any `https:` host; `'unsafe-eval'` (wasm OK inline); img/media from `https:`, `data:` and `blob:`; `connect-src 'none'`; no blob or data workers.
- `window.fetch` is shimmed: anything except `/api/*` rejects, including `blob:` and `data:`. three's FileLoader and ImageBitmapLoader therefore fail. Use `GLTFLoader.parse(bytes)` and force `TextureLoader`.
- Binary assets come in only through `api.fetchAsset("@asset:<uuid>")`, which returns an ArrayBuffer (32 MiB cap, 30 s timeout, `{ok:false,error}` on failure).
- The world save body limit is 10 MiB including `rootComponent.compiled`. Above it, `compiled` is dropped and every play recompiles in the browser. The current Eldoria JSON is 10.93 MB.
- Any `data:xxx/` text in the sources stops save-time precompile stamping. The server rejects new `data:(image|audio|video|font)/…;base64` strings of 200+ characters.
- `api.storage` is the parent's localStorage (`yumina:local:<worldId>:<key>`), stores strings only, and is device-local. Always `JSON.stringify` before `set`.
- Variables persist per session on the server. Only ids declared in `world.variables` survive (`normalizeState`). Each write PATCHes the full variable map (5 MB request cap).
- Use `aiAccess:"none"` for client-only blobs. `persist:"player"` carries values across playthroughs but silently skips saves over 64,000 chars.
- Export is schema JSON only; uploaded asset bytes are not exported. Import does no `worldDefinitionSchema` validation. Licenses: code AGPL-3.0-only, docs CC BY 4.0, and the "Yumina" name and logo are trademarked.


---

# Audit B: rendering, geometry and asset-pipeline references for Eldoria 3D

Scope: three.js (r149 pinned vs dev r187dev), three-mesh-bvh (0.5.24 vendored vs 0.9.15), meshoptimizer (master),
glTF-Transform ("iphone-version" fork). Read-only audit, October 2026.

Legend used throughout: **[V]** = verified in source in this audit (path cited); **[I]** = inference or recollection, not
verified from a file in these checkouts.

Eldoria facts this audit relies on (all [V], read from `/home/user/yumina-oss-reference/worlds/eldoria-3d`):
- `src/three.tsx`: loads `three@0.149.0/build/three.min.js` (jsDelivr, unpkg fallback); `colorManage()` sets
  `ColorManagement.legacyMode = false` on r149 (or `.enabled = true` on newer); `canvasTex` sets `t.encoding = sRGBEncoding`;
  `makeEnvironment()` builds a vertex-coloured sky sphere + "sun" ball and runs `PMREMGenerator.fromScene(_envScene, 0.035)`.
- `src/game.tsx` ~l.72-76: `WebGLRenderer({antialias, powerPreference:"high-performance"})`, `outputEncoding = sRGBEncoding`,
  `ACESFilmicToneMapping`, exposure 1.05, `shadowMap.type = PCFSoftShadowMap`. Frame loop l.94 (fps cap), `pace()` l.304
  (adaptive pixel ratio), `charLod()` l.294 (frustum/range hide, 1/2/1/4-rate animation, shadow-cast toggle by distance),
  `camCollide()` l.316 (one lazy `MeshBVH(s.solid, {maxLeafTris:12})` per settlement per frame, `raycastFirst(ray, DoubleSide)`),
  env PMREM refresh every 20 s (l.952), shadow map re-render every Nth frame via `shadowMap.autoUpdate=false` (l.960).
- `src/terrain.tsx` `Environment` (l.247+): custom sky `ShaderMaterial`, `HemisphereLight`, one `DirectionalLight` sun with an
  ortho shadow box of ±`shadowSize` (60/80 m), `THREE.Fog` (linear), `MeshStandardMaterial` sea with bump map, `InstancedMesh`
  vegetation via `addInst` (l.173, `frustumCulled=false`).
- `src/surfaces.tsx`: `onBeforeCompile` patches replacing `#include <worldpos_vertex>`, `<normal_pars_fragment>`,
  `<color_fragment>`, `<roughnessmap_fragment>`, `<normal_fragment_maps>`; uses `objectNormal`, `transformed`, `vViewPosition`,
  `faceDirection`, `roughnessFactor`, `USE_INSTANCING`/`instanceMatrix`, `texture2D`, `dFdx/dFdy` with
  `mat.extensions.derivatives = true`, `customProgramCacheKey`.
- `src/hud.tsx` l.16-18 quality tiers (Low: no shadows, 30 fps cap, lite surfaces; Medium: 1024 shadow map every 2nd frame;
  High: 2048 map). `src/rig.tsx` l.87 `loader.setMeshoptDecoder(getMeshoptDecoder())`; skin/cloth upgraded to
  `MeshPhysicalMaterial` (sheen) on high tiers; all character meshes `frustumCulled = false`.
- `tools/character/build.sh`: `gltfpack -cc -ce ext -kn -km -ke` (main) and `... -si 0.2 -se 0.04 -sp -slb` (crowd LOD).

---

## three.js (r149 pinned vs dev)

Checkouts: `/workspace/eldoria-references/_pinned/three-r149` (npm 0.149.0: `build/`, `src/`, `examples/jsm`, `examples/fonts`)
and `/workspace/eldoria-references/three.js` (dev, `e416bdcc`, `package.json` version 0.186.0, `src/constants.js`
`REVISION = '187dev'`; sparse: `src/`, `examples/jsm`; **`manual/en` is not present in the checkout**).

### 1 Purpose and relevant functionality
The engine itself. What matters for Eldoria is (a) whether the chunks `surfaces.tsx` patches survive an upgrade, (b) which
r149 add-ons (`examples/jsm`) are worth vendoring now, and (c) what an eventual upgrade breaks.

Key verified facts:
- **Patched chunks still exist in dev [V]**: `worldpos_vertex`, `normal_pars_fragment`, `color_fragment`, `roughnessmap_fragment`,
  `normal_fragment_maps`, `normal_fragment_begin`, `lights_physical_pars_fragment`, `envmap_physical_pars_fragment`,
  `shadowmap_pars_fragment`, `bumpmap_pars_fragment`, `fog_fragment`, `fog_pars_fragment`, `lights_fragment_maps`, `aomap_fragment`
  all present in both `src/renderers/shaders/ShaderChunk/`. `faceDirection` and `vViewPosition` are still defined in
  `normal_fragment_begin` (dev). `roughnessFactor` still declared in `roughnessmap_fragment` (dev now samples `vRoughnessMapUv`
  instead of `vUv`, irrelevant to Eldoria's replace).
- **Chunk-set diff r149 -> dev [V]**: removed `encodings_fragment`, `encodings_pars_fragment`, `output_fragment` (now
  `opaque_fragment`), `cube_uv_reflection_fragment`, `lightmap_fragment`, `uv2_*`; added `colorspace_fragment`,
  `colorspace_pars_fragment`, `batching_pars_vertex`, `batching_vertex`, `alphahash_*`, `lightprobes_pars_fragment`,
  `morphinstance_vertex`. None of the removed ones are patched by Eldoria.
- **`worldpos_vertex` in dev adds `#ifdef USE_BATCHING worldPosition = batchingMatrix * ...` [V]**. Eldoria's `VS_BODY` handles
  only `USE_INSTANCING`; if buildings ever move to `BatchedMesh`, `VS_BODY` must also apply `batchingMatrix`.
- **Shadow types [V]**: r149 `constants.js` has Basic/PCF/PCFSoft/VSM. r149 `shadowmap_pars_fragment` PCF = 17
  `texture2DCompare` taps; PCF_SOFT = 17 taps with manual bilinear weighting (l.151+). **Dev: `PCFSoftShadowMap` is
  `@deprecated since r186`** (`src/constants.js` l.73) and `WebGLShadowMap.js` l.99-101 warns
  "PCFSoftShadowMap has been removed. Using PCFShadowMap instead." Dev PCF uses `sampler2DShadow` + 5-tap Vogel disk.
  VSM doc in dev: "When using VSMShadowMap all shadow receivers will also cast shadows."
- **CSM [V]**: `examples/jsm/csm/{CSM,CSMFrustum,CSMHelper,CSMShader}.js` exist in r149. `CSM.js` creates one
  `DirectionalLight` per cascade (default `cascades: 3`, `mode: 'practical'`, `lightMargin: 200`), overwrites the global
  `ShaderChunk.lights_fragment_begin` / `lights_pars_begin` (l.250-251) and in `setupMaterial()` **assigns
  `material.onBeforeCompile`** (l.271) - this would clobber Eldoria's `surfaces.tsx` hook unless chained.
  Dev additionally has a *new* `examples/jsm/lights/SunLight.js` + `SunLightShadow.js` (2 cascades, atlas, built-in support in
  `WebGLLights.js` `isSunLight` and `NUM_SUN_LIGHT_SHADOWS` in the shadow chunk) - dev-only, not backportable to r149.
- **BatchedMesh [V/I]**: absent from r149 `src/objects/`; present in dev `src/objects/BatchedMesh.js` (`addGeometry`,
  `addInstance`, `setMatrixAt`, `setVisibleAt`, `optimize`, multi-draw arrays). Version of introduction not provable from these
  checkouts: three-mesh-bvh CHANGELOG 0.8.0 says "three.js r158 where BatchedMesh is supported"; my recollection [I] is addon in
  r156, core in r159.
- **LOD [V]**: `LOD.addLevel(object, distance, hysteresis)` already in r149 (`src/objects/LOD.js` l.51, hysteresis l.99).
- **InstancedMesh [V]**: r149 has `setColorAt` but no per-instance bounding sphere (dev adds `computeBoundingSphere`,
  `morphTexture`/`setMorphAt`). **SkinnedMesh [V]**: r149 has no `computeBoundingSphere` (dev l.109/138), which is why Eldoria's
  `frustumCulled = false` on characters is needed under r149.
- **GLTFLoader [V]**: r149 `EXTENSIONS` already include `KHR_mesh_quantization`, `EXT_meshopt_compression`,
  `KHR_texture_transform`, `KHR_texture_basisu`, `EXT_texture_webp`, `EXT_mesh_gpu_instancing`, `KHR_materials_*`
  (clearcoat, ior, sheen, specular, transmission, iridescence, volume, emissive_strength, unlit). Dev adds
  `KHR_materials_anisotropy`, `KHR_materials_dispersion`, `KHR_materials_diffuse_roughness`, `EXT_materials_bump`,
  `EXT_texture_avif`, **`KHR_meshopt_compression`**, and KHR_animation_pointer is referenced in docs.
- **KTX2Loader r149 [V]**: imports `WorkerPool`, `new Worker(this.workerSourceURL)` (l.175) and the Basis WASM transcoder
  (`examples/jsm/libs/basis/basis_transcoder.{js,wasm}`). DRACOLoader r149 also spawns a Worker. Both are unusable if Yumina
  blocks Workers/WASM.
- **Colour management / light units [V for code, I for exact versions]**: r149 `ColorManagement.legacyMode: true` default
  (`src/math/ColorManagement.js` l.24), `renderer.outputEncoding = LinearEncoding`, `physicallyCorrectLights = false`;
  `WebGLLights.setup()` multiplies every light by `scaleFactor = Math.PI` when not physically correct (l.227-243). Dev:
  `ColorManagement.enabled: true`, `_outputColorSpace = SRGBColorSpace`, no `physicallyCorrectLights`/`useLegacyLights` anywhere
  in `src/`. Exact transition revisions (outputColorSpace/colorSpace r152, useLegacyLights default-false r155, removed r165)
  are [I]; only "WebGL 1 is not supported since r163" is printed in-repo (`src/renderers/WebGLRenderer.js` l.62/103).
- **GLSL in dev [V]**: `WebGLProgram.js` still `#define texture2D texture` (l.773-781), so Eldoria's GLSL1-style patches compile.
- **BufferGeometryUtils rename [V]**: r149 `mergeBufferGeometries`/`mergeBufferAttributes`; dev `mergeGeometries`/`mergeAttributes`.
- r149 `examples/jsm/math/Octree.js` (`capsuleIntersect`, `rayIntersect`, `fromGraphNode`) + `math/Capsule.js` exist [V]: the
  `games_fps` style character collider, a JS-only alternative to three-mesh-bvh for capsule movement.

### 2 Exact source files worth studying
- `_pinned/three-r149/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js` - PCF vs PCF_SOFT tap patterns (cost).
- `_pinned/three-r149/src/renderers/webgl/WebGLLights.js` l.205-243 - legacy pi scale; needed to re-tune lights on upgrade.
- `_pinned/three-r149/src/math/ColorManagement.js` - what `colorManage()` toggles.
- `_pinned/three-r149/examples/jsm/csm/CSM.js`, `CSMShader.js` - cascaded shadows usable today.
- `_pinned/three-r149/examples/jsm/objects/Sky.js` (219 lines) - Preetham analytic sky (turbidity/rayleigh/mie uniforms).
- `_pinned/three-r149/examples/jsm/objects/Water.js` (329 lines) - planar-reflection water (re-renders scene, `textureWidth` 512).
- `_pinned/three-r149/examples/jsm/environments/RoomEnvironment.js` (144 lines) - procedural PMREM source.
- `_pinned/three-r149/examples/jsm/lights/LightProbeGenerator.js` - `fromCubeRenderTarget` (SH light probe from a cube RT).
- `_pinned/three-r149/examples/jsm/math/{Octree,Capsule,MeshSurfaceSampler,SimplexNoise}.js` - collision, scatter, noise.
- `_pinned/three-r149/examples/jsm/utils/BufferGeometryUtils.js` - `mergeBufferGeometries`, `mergeVertices` (index for BVH).
- `_pinned/three-r149/examples/jsm/postprocessing/{SSAOPass,SAOPass,SMAAPass,UnrealBloomPass}.js`, `shaders/FXAAShader.js`.
- `three.js/src/objects/BatchedMesh.js` - multi-draw batching (dev only).
- `three.js/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment.glsl.js` - Vogel-disk PCF + SunLight cascades (dev).
- `three.js/examples/jsm/lights/SunLight.js`, `SunLightShadow.js` - dev built-in 2-cascade CSM.
- `three.js/examples/jsm/postprocessing/GTAOPass.js`, `shaders/GTAOShader.js`, `objects/SkyMesh.js`, `objects/GroundedSkybox.js`,
  `lighting/LightProbeGrid*.js` - dev-only.

### 3 Techniques applicable to Eldoria
- Switch sun shadows to CSM (r149 `CSM.js`) on High only: near cascade crisp around the player, far cascades cover the town.
- Replace the hand-written sky with r149 `Sky.js` (Preetham) driven by Eldoria's existing sun direction; feed the same sky into
  the existing 20 s PMREM refresh so IBL matches the sky.
- Height fog: patch `fog_fragment` (exists in both versions) with a height term using `vTpPos`-like world position.
- `LOD` with hysteresis for settlement shells (full shell near, simplified shell/impostor far).
- `InstancedMesh` already used for vegetation; per-chunk instanced meshes with manual bounding spheres would allow culling
  (r149 lacks `InstancedMesh.computeBoundingSphere`, so compute a sphere per chunk group and keep `frustumCulled` on the group).

### 4 Dependency and Three.js compatibility
- r149 has no `examples/js` (only `examples/jsm`, [V] directory listing) so every add-on must be converted from ES-module
  `import {...} from 'three'` to the global `THREE` (the same treatment `tools/gen_gltf_loader.py` / `gen_bvh.mjs` apply).
- Vendoring dev add-ons into r149 is not safe in general (they use renamed APIs, e.g. `mergeGeometries`, `colorSpace`,
  `SRGBColorSpace`, `batchingMatrix`). Vendor from `_pinned/three-r149/examples/jsm` only.

### 5 Yumina sandbox compatibility
- OK (pure JS, main thread): CSM, Sky, Water/Water2, Reflector, RoomEnvironment, LightProbeGenerator, SSAO/SAO/FXAA/SMAA passes,
  Octree/Capsule, MeshSurfaceSampler, BufferGeometryUtils, SkeletonUtils, LOD, InstancedMesh.
- Not OK without Workers + WASM: KTX2Loader (Worker + basis WASM), DRACOLoader (Worker; WASM or the asm.js `draco_decoder.js`).
- Upgrading past r163 drops WebGL1 entirely (`throw new Error('... WebGL 1 is not supported since r163.')` [V]).

### 6 iPhone/mobile performance considerations
- PCF_SOFT and PCF both cost 17 shadow fetches per shadowed light per fragment in r149 [V]. CSM multiplies shadow *render*
  passes by cascade count (one DirectionalLight per cascade) [V]; fragment cost stays one cascade lookup per fragment after
  `CSMShader`'s selection loop [I].
- SSAOPass defaults `kernelSize = 32` and renders an extra `MeshNormalMaterial` pass [V] - too expensive for phones; at most a
  half-resolution SAO on High desktop.
- `Water.js` re-renders the whole scene into a 512 px mirror each frame [V] - avoid on phones; keep the current bump-mapped sea.
- `Sky.js` is a single full-screen-ish sphere shader - cheap [I].

### 7 License obligations
MIT (`LICENSE` in both checkouts). Keep the copyright notice in each vendored file (as `bvh.tsx` already does).

### 8 Recommended implementation approach
Stay on r149 for now (as `docs/oss-evaluation.md` decided). Vendor from the pinned package: `csm/*` (High tier only; chain
`onBeforeCompile` so CSM's hook calls Eldoria's surface patch), `objects/Sky.js`, optionally `postprocessing/SMAAPass.js` or
`shaders/FXAAShader.js` as a cheap AA when `antialias:false` (Low). On a future upgrade milestone: switch `PCFSoftShadowMap` to
`PCFShadowMap` (dev removes soft), multiply light intensities by pi as a starting point, set `outputColorSpace`/`colorSpace`
instead of `outputEncoding`/`encoding`, require WebGL2, add `batchingMatrix` to `VS_BODY` if BatchedMesh is adopted.

### 9 What was actually inspected
`src/constants.js` (both), `ShaderChunk/` directory diff, the five patched chunks + `normal_fragment_begin` side by side,
`shadowmap_pars_fragment` (both), `WebGLShadowMap.js` (dev), `WebGLLights.js` (r149), `ColorManagement.js` (both),
`WebGLRenderer.js` grep (both), `WebGLProgram.js` (dev), `objects/` listings, `LOD.js`, `InstancedMesh.js`, `SkinnedMesh.js`,
`BatchedMesh.js` method list, GLTFLoader `EXTENSIONS` diff, `KTX2Loader.js`, `DRACOLoader.js` grep, `csm/CSM.js`,
`SunLight.js`/`SunLightShadow.js`, `SSAOPass.js`, `Water.js`, `Sky.js`, `PMREMGenerator.js`, `LightProbeGenerator.js`,
`Octree.js`/`Capsule.js`/`MeshSurfaceSampler.js` method lists, `examples/jsm` module existence matrix (40 modules).

### 10 Remaining gaps and uncertainties
- No migration guide/CHANGELOG in the checkout (`manual/en` absent), so r152/r155/r165 transition points are recollection.
- CSM + Eldoria's day/night sun moving every frame was not prototyped; CSM's `lightMargin`/`maxFar` tuning untested.
- No performance measured on an iPhone; all costs are tap counts and pass counts, not timings.

---

## three-mesh-bvh (0.5.24 vendored vs 0.9.15)

Checkouts: `/workspace/eldoria-references/_pinned/three-mesh-bvh-0.5.24` (npm, `peerDependencies.three ">= 0.123.0"`) and
`/workspace/eldoria-references/three-mesh-bvh` (`b0935a7e`, `package.json` 0.9.15, `peerDependencies.three ">= 0.159.0"`;
CHANGELOG already lists an unreleased-looking 0.9.16 entry).

### 1 Purpose and relevant functionality
Triangle BVH for fast raycasts and shape queries. Eldoria uses `MeshBVH` + `raycastFirst` for camera collision. The same
library's `shapecast` + `ExtendedTriangle.closestPointToSegment` is the standard capsule character-controller.

API differences [V, CHANGELOG + source]:
- 0.6.0: "Bumped minimum required three.js version to v0.151.0"; removed deprecated `MeshBVH` signatures for `raycast`,
  `raycastFirst`, `shapecast`, ... (0.5.24 still accepts the old function-argument `shapecast` with a console warning, l.476-505).
- 0.7.0: `MeshBVHVisualizer` renamed `MeshBVHHelper`; 0.7.7/0.8.0: `range` option, BatchedMesh support (`computeBatchedBoundsTree`);
  0.8.0: requires r158.
- 0.9.0: `bvhClosestPointToPoint` signature gains `maxDistance`. 0.9.4: serialized format child indices changed (old data
  "fixup" with warning). 0.9.5: `PointsBVH`/`LineBVH`. 0.9.7: `maxLeafTris` deprecated -> `maxLeafSize`; `MeshBVHHelper` ->
  `BVHHelper`. 0.9.9: `ObjectBVH` (scene-level BVH over objects/instances) and `SkinnedMeshBVH` moved to core. 0.9.11:
  `maxLeafSize` -> `targetLeafSize`; WebGPU `BVHComputeData`.
- 0.9 options [V `src/core/GeometryBVH.js`]: `strategy`, `maxDepth`, `targetLeafSize` (default 10), `indirect` ("leaving the
  original index unmodified"), `range`, `onProgress`, `useSharedArrayBuffer`. 0.5.24 options [V `core/MeshBVH.js` l.140-146]:
  `strategy CENTER`, `maxDepth 40`, `maxLeafTris 10`, `verbose`, `useSharedArrayBuffer`, `setBoundingBox`, `onProgress` - **no
  `indirect`**.
- **Concrete r149 blocker for 0.9 [V]**: 0.9 calls `Triangle.getInterpolation` (`src/utils/ThreeRayIntersectUtilities.js` l.66/82/104,
  `TriangleUtilities.js` l.111, `SkinnedMeshBVH.js`), which r149 does not have (r149 `src/math/Triangle.js` only has `getUV`, l.84).

### 2 Exact source files worth studying
- `three-mesh-bvh/example/characterMovement.js` (479 lines) - capsule controller: `player.capsuleInfo = {radius, segment: Line3}`
  (l.96-98), `StaticGeometryGenerator(environment)` merges the level (l.274), `new MeshBVH(mergedGeometry)` (l.278),
  `updatePlayer()` (l.352-416): capsule AABB -> `boundsTree.shapecast({intersectsBounds, intersectsTriangle})`,
  `tri.closestPointToSegment(segment, triPoint, capsulePoint)`, push out by `radius - distance`; grounded test
  `deltaVector.y > |delta * velocity.y * 0.25|` (l.405); `physicsSteps: 5` sub-steps (l.19, l.462-466).
- `three-mesh-bvh/example/objectbvh_characterMovement.js` (506 lines) - same controller over an `ObjectBVH` of many objects (0.9).
- `_pinned/three-mesh-bvh-0.5.24/src/core/MeshBVH.js` - `raycastFirst` l.418, `shapecast` l.476, `serialize/deserialize` l.35/79,
  `closestPointToPoint` l.921, `refit` l.180.
- `_pinned/three-mesh-bvh-0.5.24/src/math/ExtendedTriangle.js` - `closestPointToSegment` l.72, `intersectsTriangle` l.132.
- `_pinned/three-mesh-bvh-0.5.24/src/core/buildFunctions.js` `ensureIndex` l.9-30 - adds an index to non-indexed geometry.
- `_pinned/three-mesh-bvh-0.5.24/src/utils/StaticGeometryGenerator.js` - bakes skinned/morphed meshes to a static geometry.
- `three-mesh-bvh/src/core/ObjectBVH.js` - BVH over Object3Ds/instances (0.9, `BatchedMesh` path requires r169, l.493).

### 3 Techniques applicable to Eldoria
- **Capsule-vs-BVH walking on bridges, stairs and building lots.** Everything needed exists in the already-vendored 0.5.24:
  `MeshBVH.shapecast` with `intersectsBounds`/`intersectsTriangle`, `ExtendedTriangle.closestPointToSegment`, `StaticGeometryGenerator`
  (all exported by `src/bvh.tsx`, [V] l.6369-6395). Pattern for Eldoria: keep `Terrain.groundAt` (canonical heightfield) as the
  floor; build a per-settlement "walk BVH" from bridge decks, stairs, plinths and building shells; per frame run 2-5 sub-steps of
  capsule push-out; accept a hit as ground when the push-out normal has `y > cos(45 deg)`; add a step-up of ~0.35 m by casting a
  short downward `raycastFirst` from `pos + (0, stepHeight, 0)` ahead of the feet. Snap down to `max(groundAt, bvhGround)`. [I]
- **Downward ray ground sampling** (cheaper than capsule): `raycastFirst` straight down onto deck/stair meshes, used only where
  `deckAt` or a settlement lot says a non-terrain surface exists. [I]
- `serialize()` at build time would avoid main-thread BVH builds, but adds JSON weight (see section 6); building lazily, one per
  frame, as `camCollide` already does, is the better trade for a 10.9 MB JSON.

### 4 Dependency and Three.js compatibility
0.5.24 is the right version for r149 (peer `>= 0.123.0`). 0.6+ needs r151, 0.8+ r158, current package.json r159, and 0.9 code
uses `Triangle.getInterpolation` [V]. No upgrade path without upgrading three.

### 5 Yumina sandbox compatibility
Core is pure JS, no WASM [V grep]. Workers: 0.5.24 `GenerateMeshBVHWorker` uses `new Worker(new URL(..., import.meta.url),
{type:'module'})` [V] - cannot work from a bundled world anyway (no separate file URL); 0.9 adds `ParallelMeshBVHWorker`
(+`SharedArrayBuffer`, needs cross-origin isolation). Use synchronous builds only.

### 6 iPhone/mobile performance considerations
- Node size `BYTES_PER_NODE = 32` [V `core/Constants.js`]. Rough budget [I]: ~2*tris/leafSize nodes -> a 300k-triangle shell at
  leaf 12 is ~50k nodes, ~1.6 MB, plus an index buffer.
- **Hidden cost found [V + I]**: `GeoBuilder.build()` (`src/three.tsx`) produces *non-indexed* geometry, and settlements pass the
  rendered `m1.geometry` as `s.solid`. 0.5.24 `ensureIndex` then attaches a fresh Uint32 index (vertexCount > 65535) to the
  *rendered* geometry and the BVH build reorders it. That costs 4 bytes per vertex (~3.6 MB for 300k tris) and a one-off upload.
  Cheaper: build the BVH from a separate position-only, `mergeVertices`-welded collision geometry (or a simplified shell).
- Build time is synchronous and O(n log n); keep the "one BVH per frame" throttle and prefer CENTER split (default) over SAH.

### 7 License obligations
MIT, Copyright (c) 2018 Garrett Johnson (both versions). Already reproduced in `src/bvh.tsx`.

### 8 Recommended implementation approach
Keep 0.5.24. Add a `walk BVH` per settlement/bridge built from collision-only geometry (decks, stairs, walls, plinths), reuse
`tools/gen_bvh.mjs` output as-is (it already exports `ExtendedTriangle` and `StaticGeometryGenerator`), port the 40 lines of
`updatePlayer()` from `characterMovement.js` to Eldoria's `Game` movement with sub-steps, and keep `Game.collide` box colliders
as a fallback while the BVH is not yet built. Write a browser scenario that walks stairs and both bridge ends.

### 9 What was actually inspected
Both `package.json`; `CHANGELOG.md` (0.5.24 -> 0.9.16); 0.5.24 `src/` tree, `core/MeshBVH.js` (options, method list, shapecast
body), `core/buildFunctions.js` (`ensureIndex`), `core/Constants.js`, `math/ExtendedTriangle.js`, worker grep; 0.9 `src/` tree,
`core/GeometryBVH.js` option docs, `core/MeshBVH.js`, `core/ObjectBVH.js` header, Triangle API grep;
`example/characterMovement.js` (controller code) and `objectbvh_characterMovement.js` imports; Eldoria `src/bvh.tsx` exports.

### 10 Remaining gaps and uncertainties
- Memory and build-time numbers are estimates, not measured on Eldoria's real shells.
- Whether `ensureIndex` mutating the rendered geometry has any visual side effect in Eldoria (it should not) was not tested.
- `SkinnedMeshBVH` (0.9) for hit tests on animated characters is not available in 0.5.24 (only `StaticGeometryGenerator` baking).

---

## meshoptimizer (master)

Checkout: `/workspace/eldoria-references/meshoptimizer` (`f0a684f1`, 2026-10-14; `js/package.json` and `gltf/package.json`
version 1.3.0).

### 1 Purpose and relevant functionality
C++ mesh optimisation library + `gltfpack` CLI + JS/WASM bindings. Eldoria uses gltfpack offline and the JS decoder at runtime.

- **Simplifier API [V `src/meshoptimizer.h`]**: `meshopt_simplify`, `meshopt_simplifyWithAttributes`, `meshopt_simplifyWithUpdate`,
  `meshopt_simplifySloppy`, `meshopt_simplifyPrune`, `meshopt_simplifyPoints`, `meshopt_simplifyScale`; flags `LockBorder`,
  `Sparse`, `ErrorAbsolute`, `Prune`, `Regularize`, `Permissive`, `RegularizeLight`, `PreserveFolds`, `ErrorClamped` (l.469-485).
  Also `meshopt_generateShadowIndexBuffer` (position-only index for shadow/depth passes), `optimizeVertexCache`,
  `optimizeOverdraw`, `optimizeVertexFetch`, `spatialSortTriangles`, meshlet builders.
- **gltfpack simplification [V `gltf/mesh.cpp` `simplifyMesh` l.1064+]**: `-slb` -> `meshopt_SimplifyLockBorder`, otherwise
  `meshopt_SimplifyPrune`; `-sp` -> `Permissive`; meshes with morph targets or skin weights automatically get `Regularize`;
  uses `simplifyWithAttributes` (or `simplifyWithUpdate` with `-sv`); with `-sa` falls back to `simplifySloppy` when stuck.
- **gltfpack flags [V `gltf/gltfpack.cpp` l.1391-1660 and usage text]**: `-si R`, `-se E` (default 0.01), `-sa`, `-slb`, `-sv`,
  `-sp`; `-tc`/`-tu` (KTX2 ETC1S/UASTC), `-tw` (WebP), texture classes `color|normal|attrib` via `textureMask` (l.1334), `-tq`,
  `-ts`, `-tl`, `-tp`; `-vp/-vt/-vn/-vc` quantisation bits; `-kn -km -ke`; `-mm`, `-mi` (EXT_mesh_gpu_instancing);
  `-c`, `-cc`, `-cz`, `-cf`, `-ce ext|khr`.
- **Texture encoding needs a native build [V l.1130-1150]**: without `WITH_BASISU` / `WITH_LIBWEBP`, `-tc`/`-tu`/`-tw` exit with
  "Note: node.js builds do not support BasisU/WebP ... download a native build". The npm `gltfpack` (WASI) cannot encode textures.
- **Compression extension [V]**: `-cz` sets `compresskhr = true` -> writes `KHR_meshopt_compression` (l.1180), which **r149's
  GLTFLoader does not know** (dev only). `-ce ext` forces `EXT_meshopt_compression`. Eldoria's `-cc -ce ext` is correct.
  The KHR-only `COLOR` filter is used only when `compresskhr && compressmore` (`gltf/stream.cpp` l.635); gltfpack pins
  `meshopt_encodeVertexVersion(0)` (l.1373), so EXT output stays decodable by older decoders.
- **JS bindings [V `js/`]**: `meshopt_simplifier.js` is WASM-only (returns `{supported:false}` when `typeof WebAssembly !==
  'object'`, l.14); same for encoder/clusterizer. `meshopt_decoder_reference.js` is a pure-JS decoder ("not performance-optimized")
  handling vertex codec v0/v1 and filters `OCTAHEDRAL`, `QUATERNION`, `EXPONENTIAL`, `COLOR` (l.187-260). Eldoria's
  `src/meshopt-decoder.tsx` vendors both and races WASM against a 4 s timeout.

### 2 Exact source files worth studying
- `src/meshoptimizer.h` l.469-615 - simplifier flags and functions with docs.
- `src/simplifier.cpp` - implementation (attribute weights, border locking).
- `gltf/gltfpack.cpp` l.1373-1660 (flags) and usage block - exact CLI semantics.
- `gltf/mesh.cpp` `simplifyMesh` l.1064-1130 - which flags gltfpack actually passes.
- `gltf/stream.cpp` l.470-840 - per-attribute filters (exp/oct/quat/colour) chosen by `-cc`.
- `js/meshopt_decoder_reference.js` - the WASM-free decoder Eldoria ships.
- `js/meshopt_simplifier.js` - `simplify`, `simplifyWithAttributes`, `simplifySloppy`, `simplifyPrune`, `Flags` (l.338-344).
- `demo/simplify.html` - interactive comparison of simplifier modes (reference only).

### 3 Techniques applicable to Eldoria
- Offline LODs for any authored GLB (creatures, props) with `-si/-se/-slb` - already done for the crowd humanoid.
- Offline LOD of the procedural town shells: export a settlement shell once (`tools/export-glb.mjs`-style), simplify with
  `-si 0.25 -se 0.02 -slb`, embed as the far `LOD` level. Feasible only for canonical, deterministic towns. [I]
- `meshopt_generateShadowIndexBuffer` equivalent (position-only weld) for a cheaper shadow-caster geometry. [I]
- `-mi` + r149 `EXT_mesh_gpu_instancing` support for repeated props inside one GLB.

### 4 Dependency and Three.js compatibility
Format-level, not three-level. r149 GLTFLoader + `setMeshoptDecoder` handles EXT output. Never use `-cz` or `-ce khr` while on
r149. WebP (`-tw`) maps to `EXT_texture_webp`, which r149 GLTFLoader supports [V]; KTX2 (`-tc`) needs KTX2Loader (Worker+WASM).

### 5 Yumina sandbox compatibility
Runtime: only the decoder ships; the pure-JS reference decoder works without WASM/Workers. Runtime simplification is impossible
without WASM (simplifier is WASM-only). Everything else is build-time.

### 6 iPhone/mobile performance considerations
- The reference decoder is slower than WASM ("not performance-optimized"); with ~2.8 MB of character GLBs it runs once at load. [I]
- Simplified crowd meshes cut skinning cost proportional to vertex count; `Regularize` is applied automatically for skinned meshes.
- WebP textures decode via the browser (iOS 14+ Safari supports WebP [I]) and do not reduce VRAM; KTX2 would, but is blocked.

### 7 License obligations
MIT, Copyright (c) 2016-2026 Arseny Kapoulkine (`LICENSE.md`). Already reproduced in `src/meshopt-decoder.tsx`. Bundled
`extern/` headers (cgltf, fast_obj, micro_ply, sdefl) are only in the gltfpack binary, not shipped.

### 8 Recommended implementation approach
Keep the current pipeline (`-cc -ce ext`, reference-decoder fallback). Add an explicit check in `build.sh` that rejects output
containing `KHR_meshopt_compression`. If texture size becomes the JSON bottleneck, use a native gltfpack release with
`-tw -tq 8` for colour textures and keep normal/attrib textures PNG (`-tw color`), or resize with `-tl 512`.

### 9 What was actually inspected
`src/meshoptimizer.h` (function list, flags), `gltf/gltfpack.cpp` (flag parser, usage, BasisU/WebP guards, KHR override),
`gltf/mesh.cpp` (`simplifyMesh`, `processMesh`), `gltf/stream.cpp` (filter selection grep), `src/vertexcodec.cpp` (version
grep), `js/meshopt_simplifier.js` (WASM guard, API), `js/meshopt_decoder_reference.js` (filters, versions), `js/package.json`,
`gltf/package.json`, `LICENSE.md`, `extern/` listing; Eldoria `tools/gen_meshopt_decoder.py`, `src/meshopt-decoder.tsx`.

### 10 Remaining gaps and uncertainties
- Decode time of the reference decoder on an iPhone not measured.
- Whether gltfpack's simplifier behaves well on Eldoria's flat-shaded, non-indexed procedural geometry (many split vertices) is
  untested; `-sp` (permissive) may be needed.

---

## glTF-Transform ("glTF-Transform-iphone-version" fork)

Checkout: `/workspace/eldoria-references/glTF-Transform-iphone-version` (`3797aad5`, packages `@gltf-transform/*` 4.5.1).

### 1 Purpose and relevant functionality
TypeScript glTF SDK + CLI for offline asset processing.

**Is the fork iPhone-specific? No [V].** The clone has one commit, `3797aad fix(core): Fix Webpack 5 / NodeIO import
compatibility (#1865)` by Don McCurdy; a fetch of upstream `donmccurdy/glTF-Transform` main (into a scratch bare repo, not the
reference checkout) shows that exact commit as upstream history, two commits behind upstream `8e2a94a`. `git status` is clean, no
file in the tree mentions "iphone", package names are the upstream `@gltf-transform/*`, README/CHANGELOG are upstream. The
"iphone" exists only in the fork's repository name.

Functions [V `packages/functions/src/`]: `dedup`, `prune` (`keepAttributes`, `keepLeaves`, ...), `weld`, `simplify`
(`simplifier`, `ratio`, `error`, `lockBorder` -> meshoptimizer `LockBorder`), `resample` (`keyframe-resample`), `instance`
(EXT_mesh_gpu_instancing, `min`), `flatten`, `join` (`keepMeshes`, `keepNamed`, `filter`), `palette` (`blockSize`, `min`,
`keepAttributes`: merges materials into palette textures), `textureCompress` (`encoder` = sharp, `targetFormat`, `resize`,
`quality`, `effort`, `lossless`...; without sharp "a platform-specific fallback ... most quality options are ignored"),
`meshopt` (always `EXTMeshoptCompression`, `level: 'medium'|'high'`), `draco`, `quantize`, `sparse`, `unwrap` (`watlas`),
`partition`, `tangents`, `normals`, `metalRough`, `unlit`, `center`, `uninstance`, `vertexColorSpace`.

CLI commands [V `packages/cli/src/cli.ts`]: inspect validate copy optimize merge partition dedup prune gzip xmp center instance
flatten join draco meshopt quantize dequantize weld unweld tangents unwrap reorder simplify metalrough palette unlit resize etc1s
uastc ktxdecompress ktxfix avif webp png jpeg resample sequence sparse. `optimize` pipeline [V l.376-469]: dedup -> instance ->
palette -> flatten -> join -> weld -> simplify -> resample -> prune -> sparse -> texture compression -> draco|meshopt|quantize.

### 2 Exact source files worth studying
- `packages/functions/src/simplify.ts` - wrapper over `MeshoptSimplifier.simplify` with `LockBorder` (l.174-182).
- `packages/functions/src/texture-compress.ts` - sharp-based resize/WebP/AVIF/JPEG/PNG (options l.35-103).
- `packages/functions/src/palette.ts`, `join.ts`, `flatten.ts`, `instance.ts` - draw-call reduction for static props.
- `packages/functions/src/prune.ts`, `dedup.ts`, `weld.ts`, `resample.ts` - clean-up before compression.
- `packages/functions/src/meshopt.ts` - EXT_meshopt_compression writer (l.96-102).
- `packages/cli/src/cli.ts` l.237-470 - `optimize` options and order; `packages/cli/src/transforms/toktx.ts` - spawns KTX-Software.

### 3 Techniques applicable to Eldoria
- A Node build script that reads a GLB, runs `prune/dedup/weld/resample/textureCompress(resize 256-512, webp)`, then
  `meshopt({level:'high'})` - a programmable alternative to `shrink_textures.py` + gltfpack, easier to add custom steps
  (e.g. stripping facial morphs for LODs, renaming materials to Eldoria's `@main/@cloth` tags).
- `resample` to shrink the 23 retargeted clips (removes redundant keyframes). [I: savings unmeasured]
- `palette` + `join` for future authored prop kits (one material, one draw call per kit).

### 4 Dependency and Three.js compatibility
Node >= 18-era toolchain (not verified per package). Output compatibility with r149: `meshopt()` writes EXT (OK), `instance()`
writes EXT_mesh_gpu_instancing (OK), `sparse()` accessors (GLTFLoader supports sparse [I]), `quantize()` KHR_mesh_quantization
(OK), `textureCompress` webp (EXT_texture_webp OK) / **avif (EXT_texture_avif not in r149 GLTFLoader)** / ktx2 (needs
KTX2Loader). Native/WASM deps [V package.json]: CLI depends on `sharp ~0.35.3` (native libvips), `draco3dgltf`, `meshoptimizer
~1.2.0` (WASM), `keyframe-resample` (WASM), `watlas` (WASM), `mikktspace` (WASM), `gltf-validator`; KTX2 needs the external
`ktx` (KTX-Software) binary spawned by `toktx.ts`/`ktxdecompress.ts`. `@gltf-transform/functions` itself depends only on core,
extensions, ktx-parse and ndarray packages (pure JS).

### 5 Yumina sandbox compatibility
Build-time only; nothing ships. Draco output would need DRACOLoader (Worker) at runtime - avoid; use meshopt.

### 6 iPhone/mobile performance considerations
Same as meshoptimizer: texture resolution is the main VRAM lever available without KTX2; `join`/`palette` reduce draw calls,
the main CPU cost on phones. [I]

### 7 License obligations
MIT, Copyright (c) 2024 Don McCurdy (`LICENSE.md`). Build-tool only; no attribution ships with assets. sharp/libvips are
Apache-2.0/LGPL [I] but are not distributed.

### 8 Recommended implementation approach
Optional. Adopt only when a step is needed that gltfpack cannot do (custom per-node edits, resampling, palette atlases).
Use `@gltf-transform/functions` from a Node script with `MeshoptEncoder`/`MeshoptSimplifier` from npm `meshoptimizer`; avoid
`--texture-compress avif|ktx2` and `draco` while on r149 without Workers.

### 9 What was actually inspected
Git log/status/remote of the fork; upstream ancestry (scratch fetch); README/CHANGELOG heads; all `packages/*/package.json`
names/versions/deps; `packages/functions/src/` listing and option interfaces of 14 functions; `simplify.ts` docs/flags;
`texture-compress.ts` options; `meshopt.ts`; `packages/extensions/src/` listing; `cli.ts` command list and `optimize` body.

### 10 Remaining gaps and uncertainties
- Not executed; no measured size savings on Eldoria GLBs.
- Why the fork is named "iphone-version" is unknown; nothing in the content differs from upstream.

---

## Graphics technique notes

| Technique | Implementation found (repo, file) | r149 availability | Mobile cost | Fit for Eldoria |
|---|---|---|---|---|
| Cascaded shadow maps | three r149 `examples/jsm/csm/CSM.js` + `CSMShader.js` [V]; dev also `examples/jsm/lights/SunLight.js` [V] | **yes** (CSM.js); SunLight dev-only | N shadow passes per refresh (one DirectionalLight per cascade); fragment cost ~ one cascade | Good on High/desktop (towns at 60-80 m box are blurry now). Phones: keep single map; Medium could use 2 cascades with `shadowEvery` 2-3. Must chain `onBeforeCompile` with `surfaces.tsx` |
| PCF vs PCFSoft vs VSM | three `shadowmap_pars_fragment.glsl.js` [V] | all four types | PCF and PCFSoft both 17 taps in r149; VSM needs blur passes and float RT | Keep PCF(Soft) in r149; note dev deprecates PCFSoft (r186) |
| Terrain splat with texture arrays | none in these repos; r149 has `DataArrayTexture` [V] | yes, **WebGL2-only** (`sampler2DArray`) | one array fetch per layer, cheaper than atlas bleeding fixes | Eldoria's 4-channel packed height texture already does a cheap splat; arrays only when real albedo/normal sets (Poly Haven) arrive; needs WebGL2 path + current path as fallback [I] |
| Triplanar + derivative bump | Eldoria `src/surfaces.tsx` [V]; r149 `bumpmap_pars_fragment` `perturbNormalArb` [V] | yes | 3 fetches + dFdx/dFdy; "lite" path 1 fetch | Already used; survives upgrade (chunks unchanged) |
| Parallax / POM | none found in r149 or dev `examples/jsm/shaders` [V listing] | no module | high (loop of fetches per pixel) | Poor for phones; skip, or a 1-step offset parallax on High only [I] |
| SSAO / SAO / GTAO | r149 `postprocessing/SSAOPass.js` (kernel 32 + normal pass) and `SAOPass.js` [V]; dev `GTAOPass.js` [V] | SSAO/SAO yes, GTAO no | full extra scene pass + 32-sample kernel: too costly on phones | Prefer baked vertex AO; SAO half-res on High desktop at most |
| Vertex AO baking | none in repos; implementable with three-mesh-bvh `raycastFirst` (0.5.24) [I] | yes (custom code) | zero runtime cost; bake per settlement at build or lazily | **Strong fit**: `GeoBuilder` already writes vertex colours, so darken per-vertex by hemisphere ray occlusion at generation time (budget: few rays per vertex, spread over frames) [I] |
| Fog / height fog | three `fog_fragment`/`fog_pars_fragment` chunks in both [V]; Eldoria uses linear `THREE.Fog` [V] | yes (patch chunk) | one exp per fragment | Good: add height falloff in a `fog_fragment` patch for valleys/Umbral mist |
| Analytic sky | three r149 `objects/Sky.js` (Preetham) [V]; dev `SkyMesh.js` (node) | Sky.js yes | one sky-sphere shader | Good; drive with existing sun direction and time-of-day |
| IBL from PMREM | three `PMREMGenerator.fromScene` [V]; Eldoria `makeEnvironment` every 20 s [V] | yes | one cube render + blur passes per refresh (spike) | Already used; could render the real `Sky` mesh into the PMREM scene for consistency |
| Light probes | r149 `LightProbe` + `examples/jsm/lights/LightProbeGenerator.js` [V]; dev `examples/jsm/lighting/LightProbeGrid*.js` [V] | single probe yes; grid no | `fromCubeRenderTarget` reads pixels back (GPU sync) [I] | Low priority; hemisphere + PMREM already cover ambient |
| Impostors / billboards for vegetation | none found in any of the four repos [V grep] | Sprite/InstancedMesh yes | very cheap | Good for far forests; must be written in-house (render tree to atlas once, instanced quads) [I] |
| HLOD for towns | three `LOD` with hysteresis (r149 `src/objects/LOD.js`) [V]; meshoptimizer/gltfpack `-si -slb` [V] | yes | reduces vertices/draws far away | Good: near = current merged shell, far = simplified shell (offline for canonical towns, or a coarse runtime "block" mesh) [I] |
| BatchedMesh | dev `src/objects/BatchedMesh.js` [V] | **no** | fewer draw calls with per-object culling | Only after an upgrade; Eldoria's merged builders already minimise draws |
| Instanced vegetation | three `InstancedMesh` [V]; Eldoria `addInst` [V] | yes (no per-instance bounds) | cheap; culling disabled today | Group per chunk and cull by chunk bounds |
| Capsule character collision | three-mesh-bvh `example/characterMovement.js` [V]; r149 `math/Octree.js`+`Capsule.js` [V] | yes (0.5.24 APIs present) | a few shapecasts per frame | **Strong fit** for bridges, stairs, plinths |
| Mesh compression | meshoptimizer gltfpack `-cc -ce ext` [V]; glTF-Transform `meshopt()` [V] | EXT yes, KHR no | decode once at load | Already used; never emit KHR on r149 |
| GPU texture compression (KTX2/Basis) | gltfpack `-tc` (native build only) [V]; three `KTX2Loader` (Worker+WASM) [V] | loader yes, runtime blocked | big VRAM saving | Not viable in Yumina without Workers/WASM |
| Anti-aliasing post | r149 `shaders/FXAAShader.js`, `postprocessing/SMAAPass.js` [V] | yes | one full-screen pass (FXAA cheapest) | FXAA for Low tier where MSAA is off [I] |


---

# Terrain, noise and navigation

# Audit C: terrain and navigation references for Eldoria 3D

Scope: read-only audit of four reference repositories against Eldoria 3D
(`/home/user/yumina-oss-reference/worlds/eldoria-3d`). No repository was modified.
Legend: **[V]** = verified by reading source or running code; **[I]** = inference or prior knowledge, not
verified here.

Eldoria baseline, from reading its source:
- `src/worldgen.tsx` already has its own deterministic primitives: `mulberry`/`rng(seed)`, `hash2(x,y,s)`
  (Math.imul integer hash), `hashStr`, `noise2` (2D simplex with a fixed `rng(1247)` permutation), `fbm`, `ridged`,
  `warp()` (an fbm domain warp, used only for biome bands), `heightAt`, `biomeAt`, `groundColor`, `vegetation`,
  and `meshHeight` (same triangulation as the LOD0 mesh). [V]
- `src/terrain.tsx` `Terrain.prototype.decorate` places trees, rocks and grass on a jittered 11 m (LOD0) or
  16 m (LOD1) cell grid. It uses only `hash2` values per cell, so the result does not depend on processing
  order (good for chunk streaming). The slope proxy is `|dh(+2m,x)| + |dh(+2m,z)|`, with trees allowed when
  it is under 3.2 and rocks when it is over 4. Instances use one `InstancedMesh` per style with `frustumCulled=false`. [V]
- `src/surfaces.tsx` `patchTerrain` blends textures per pixel in the shader with
  `rock = smoothstep(0.86, 0.68, n.y)`, grass from vertex-color greenness, and "pale" from luminance. Its
  textures are periodic, procedurally baked `DataTexture`s (`Fbm`/`vnoise` over periodic lattices), and it
  is WebGL1-safe (`extensions.derivatives`). [V]
- `src/game.tsx`: `collide(x,z,rad,only)` pushes out of circle colliders, oriented boxes (`c.box`) and
  wall segments (`s.segs`). `updateNPCs` sends wanderers in a straight line to a `Math.random` goal (a
  settlement's `spots`/`plazas`). If `collide` pushes an NPC for more than 1.5 s, the goal is abandoned.
  `safeSpot` → `WG.safeSpawn`. [V]
- `src/ai.tsx`: combat `walkTo` steps straight toward the target, then applies `stepFree` (land/water),
  `g.collide`, and `separate()` (circle push-apart). There is no path search. [V]
- Dungeons are narrated, not built in 3D. `settlements.tsx` `ruinSite` builds a mound with a door, and
  `hud.tsx` `onDoor` sends "I approach the entrance of …" to the GM. [V]
- `docs/oss-evaluation.md` already lists THREE.Terrain, FastNoiseLite and recast as "reference only / not now".
  This audit refines those entries. One correction: THREE.Terrain contains **no erosion code** (see below). [V]

---

## THREE.Terrain

### 1 Purpose and relevant functionality
- ES-module heightmap terrain library: `Terrain(options)` builds a `PlaneGeometry` in the XY plane, Z-up,
  then rotates it into the scene (`src/core.js`). It provides 17 generators (`src/generators.js`: Perlin,
  Simplex, DiamondSquare, Fault, Hill/HillIsland, Particles, Value, Weierstrass, Worley, Brownian, Curve,
  MultiPass), filters (`src/filters.js`), local "influences" (`src/influences.js`), a height/slope
  texture-blend material (`src/materials.js`), face-based mesh scatter (`src/scatter.js`), procedural wind
  grass with instance LOD (`src/grass.js`), and analysis statistics (`src/analysis.js`). [V]
- **Erosion is not implemented.** `roadmap.md` §4.0 contains only pseudo-code for a thermal erosion pass
  ("for each face with slope above the angle of repose, reduce elevation differences… repeat until no
  changes"), plus flooding, rain and river ideas. `grep -i erosion src/` returns nothing.
  `filters.js` offers only `Clamp`, `Edges`, `RadialEdges`, `Smooth` (3×3 mean), `SmoothMedian`,
  `SmoothConservative`, `Step` (terraces) and `Turbulence`, plus `Gaussian` and `GaussianBoxBlur` in
  separate files. [V]

### 2 Exact source files worth studying
- `src/scatter.js` – `ScatterMeshes` (`maxSlope` default 0.628 rad = 36°, `maxTilt`, `spread` predicate,
  `filter`, `instancesPerFace`, `sizeRange`, `tintRange` → `InstancedMesh.setColorAt`);
  `createRandomScatterGeometry` (random face plus barycentric sample, then minimum distance through a
  cell-keyed hash); `isNearScatterGroup`; `ScatterHelper` (noise heightmap used as placement probability). [V]
- `src/grass.js` – `grassMeshWeight` (grass meshes only inside the fully-opaque grass material band, with an
  `edgeInset` margin and slope rejection), `grassSlopeWeight` (27°–45° smooth fade), `grassClusterWeight`
  (patch noise → 0.15..1 density), `createGrassMaterial` (Lambert `onBeforeCompile` wind bend using
  `instanceMatrix[3]` phase and a `minimumLight` floor), `updateGrassLOD` (copies visible instances into the
  front of the instance buffer and sets `InstancedMesh.count`; refreshes when the camera moves more than 2 m
  or every 250 ms). [V]
- `src/materials.js` – `generateBlendedMaterial`: patches a Phong material through `onBeforeCompile`; layers
  are either 4-level height bands (`smoothstep` in/out) or a GLSL expression using `vPosition`/`slope`, where
  `slope = acos(dot(normalize(myNormal), +Z))`. [V]
- `src/core.js` – `getTerrainHeight` (samples the same two triangles per grid cell as the mesh; equivalent
  to Eldoria's `meshHeight`/`groundAtChunk`), `heightmapArray`, and the easing set. [V]
- `src/random.js` – `createSeededRandom` (xorshift32) and `getRandom(options)`. [V]
- `src/noise.js` – Gustavson simplex/Perlin from josephg/noisejs (public domain). It uses a **module-global**
  permutation and calls `noise.seed(Math.random())` at import. `Perlin`/`Simplex` generators reseed it from
  `options.random()`. [V]
- `src/worley.js` – Worley generator, `PoissonDisks`. It **mutates `THREE.Vector2.prototype`** by adding
  `distanceToManhattan`, `distanceToChebyshev` and `distanceToQuadratic`. [V]
- `src/influences.js` – `Influence()` with Mesa, Hole, Hill, Valley, Dome, Flat and Volcano. Bug: the custom
  blend branch passes `g[k].z` on a numeric array. [V]
- `roadmap.md` – thermal erosion, flooding and river pseudo-code. [V]

### 3 Techniques applicable to Eldoria (without changing canonical geography)
- **Material-matched decoration masks (best idea in the repo).** `grassMeshWeight`/`grassMaterialWeight`
  check, on the CPU, the same altitude and slope thresholds the shader uses, so meshes never stand on
  texels the shader paints as rock. In Eldoria, `surfaces.tsx` paints rock where
  `n.y < 0.86 → fully at 0.68`, but `decorate()` uses a different proxy (`slope < 3.2`, the sum of two 2 m
  differences). A port would compute `n.y = 1/sqrt(1+gx²+gz²)` from the chunk height grid (`groundAtChunk`,
  i.e. canonical heights), reject trees and grass where the shader's rock weight is above ~0.2, and allow
  scree/rocks only where it is high. Deterministic: canonical heights plus `hash2`. [V source, I numbers]
- **Clustered density.** `grassClusterWeight` (smoothstep of broad plus detail patch noise, with a floor of
  0.15). Eldoria's `vegetation()` already returns fbm-based density `n` for trees. Grass could get the same
  multiplier from `noise2`. Do not copy grass.js's `Math.sin(...)*43758.5453` hash: it depends on
  `Math.sin` precision, which ECMAScript does not pin down across engines. [V code, I engine variance]
- **Instance LOD by distance compaction** (`updateGrassLOD`): grass `InstancedMesh`es in LOD0 chunks could
  shrink `count` as the player moves away. The GPU then skips culled blades. This is a cheap win on iPhone
  because Eldoria sets `frustumCulled=false`. [V source, I benefit]
- **Wind vertex bend** for grass/foliage through `onBeforeCompile` on `begin_vertex`. It is a pure shader
  effect, so determinism is unaffected. [V]
- **Do not adopt** `minimumDistance`/`minimumDistanceGroup`. They are order-dependent (they consume a
  sequential random stream and accumulate occupied cells in insertion order), so they would make
  decoration depend on chunk load order. Eldoria's jittered grid plus per-cell hash is the better design.
  [V code, I consequence]
- **Erosion only on decoration:** the roadmap's angle-of-repose idea can drive *where scree, boulders or
  dead grass go* (faces whose slope exceeds the repose angle, using canonical heights). Height filters
  (Smooth, Gaussian, Step, influences) would alter `heightAt` and are forbidden. They are also incompatible
  with `meshHeight`/`world-test.mjs`, which assume heights come only from worldgen. [I]

### 4 Dependency and Three.js compatibility
- `package.json`: peer `three >=0.160.0`, `"type": "module"`. Sources start with `import * as THREE from 'three'`. [V]
- The UMD dist (`dist/three.terrain.umd.cjs`, 50.7 KB) binds to the global `THREE` and **writes
  `THREE.Terrain`** into the namespace. The THREE symbols it uses (counted in the dist) are Vector2/3,
  Float32BufferAttribute, Color, Object3D, BufferGeometry, Triangle, PlaneGeometry, InstancedMesh,
  Phong/Lambert/Basic materials, CanvasTexture, blending constants, and **`SRGBColorSpace`**. All except
  `SRGBColorSpace` exist in r149. `SRGBColorSpace`/`texture.colorSpace` arrived in r152, so under r149 the
  assignment writes `undefined` and the texture stays linear unless `encoding` is set. [V usage, I r149 API]
- Coordinate convention: Z-up construction (`up` rotated in `ScatterMeshes`), whereas Eldoria is Y-up with
  `PlaneGeometry.rotateX(-π/2)`. Any copied scatter or material code needs its axes rewritten. [V]

### 5 Yumina sandbox compatibility
- No WASM, no Workers, no fetch [V grep]. ES-module imports would have to be bundled by Eldoria's esbuild
  build into the single script. Module-level side effects (global noise seed from `Math.random`, prototype
  patching of `Vector2`, `window.THREE.Terrain` assignment) make whole-library vendoring undesirable.
  Copying individual functions as source is fine. [V]

### 6 iPhone/mobile performance
- `ScatterMeshes` calls `geometry.toNonIndexed()` and walks every face, allocating `Vector3` clones per
  placement. That is acceptable once per chunk but not per frame. `updateGrassLOD` copies matrices on the
  CPU every 250 ms or after 2 m of camera movement, which is O(instances). `generateBlendedMaterial` adds one
  texture fetch per layer and forces Phong. Eldoria's packed RGBA triplanar (3 fetches, or 1 in "lite")
  is already cheaper. [V code, I cost]

### 7 License obligations
- `LICENSE.txt`: **MIT**, "Copyright (C) 2010-2014 Isaac Sukin"; `package.json` `"license": "MIT"`. Copied
  code must keep the copyright and permission notice. `src/noise.js` is derived from public-domain code
  (josephg/noisejs, Gustavson). [V]

### 8 Recommended implementation approach
- Reference only. Re-implement 3 ideas in Eldoria style (~60–100 lines total, no vendoring):
  (a) a `slopeNY()` helper in `terrain.tsx` that matches the `surfaces.tsx` rock smoothstep and gates
  `decorate()`; (b) a grass cluster multiplier from `noise2`; (c) an `InstancedMesh.count` distance
  compaction for LOD0 grass. Add an MIT attribution comment if any expression is copied verbatim.

### 9 What was actually inspected
- Read in full: `SKILL.md`, `AGENTS.md`, `llms.txt`, `roadmap.md`, `LICENSE.txt`, `package.json`,
  `src/index.js`, `random.js`, `materials.js`, `noise.js`, `filters.js`, `influences.js`, `scatter.js`.
- Read in part: `grass.js` (weights, material, LOD, scatter), `generators.js` (Perlin/Simplex/MultiPass),
  `worley.js`, `core.js` (getTerrainHeight, easing), and the dist UMD header and its THREE symbol usage.

### 10 Remaining gaps and uncertainties
- No r149 runtime test of `generateBlendedMaterial` (chunk names `uv_vertex`, `map_fragment`,
  `worldpos_vertex` are expected to exist in r149 [I]). `analysis.js`, `brownian.js`, `gaussian.js`,
  `images.js` and `tint.js` were not read in detail. The tests (`test/*.test.js`) were not run.

---

## FastNoiseLite

### 1 Purpose and relevant functionality
- Portable noise library (v1.1.1). `JavaScript/src/FastNoiseLite.ts` (2738 lines) exports the
  `NoiseType` enum (OpenSimplex2, OpenSimplex2S, Cellular, Perlin, ValueCubic, Value), `FractalType` (None,
  FBm, Ridged, PingPong, DomainWarpProgressive, DomainWarpIndependent), `CellularDistanceFunction`
  (Euclidean, EuclideanSq, Manhattan, Hybrid), `CellularReturnType` (CellValue, Distance, Distance2,
  Distance2Add/Sub/Mul/Div), `DomainWarpType` (OpenSimplex2, OpenSimplex2Reduced, BasicGrid) and
  `RotationType3D`. Defaults: seed 1337, frequency 0.01, octaves 3, lacunarity 2, gain 0.5. [V]
- API: `new FastNoiseLite(seed)`, `Set*` setters, `GetNoise(x,y[,z])` (range about −1..1), and
  `DomainWarp(coord)`, which mutates `{x,y[,z]}` in place. [V]

### 2 Exact source files worth studying
- `JavaScript/src/FastNoiseLite.ts` – `GetNoise` (l.326), `DomainWarp` (l.413), `_HashR2`/`_GradCoordR2`
  (l.592–630), `_GenFractalFBmR2`/`_GenFractalRidgedR2`/`_GenFractalPingPongR2` (l.725–830),
  `_SingleOpenSimplex2R2` (l.834), `_SingleCellularR2` (l.1430), `_DomainWarpSingle` (l.2120),
  `_DomainWarpFractalProgressive`/`Independent` (l.2195/2283), `_SingleDomainWarpOpenSimplex2Gradient` (l.2465). [V]
- `JavaScript/dist/FastNoiseLite.js` – ES module, `export default class`, compiled from tsconfig
  `target ES2023`, 114,289 bytes. [V]
- `JavaScript/test/FastNoiseLite.test.ts` – reference values (e.g. OpenSimplex2 at (0..3, 0..3)). [V]
- `GLSL/FastNoiseLite.glsl` (2257 lines) – `fnl_state` struct, `fnlCreateState`, `fnlGetNoise2D/3D`,
  `fnlDomainWarp2D/3D`. [V]

### 3 Techniques applicable to Eldoria
- **Not for heights.** Replacing `noise2`/`fbm` in `worldgen.tsx` would move every hill, road bench and
  river bank. Adding *geometric* detail on top of `heightAt` is also off-limits: walkable height
  (`surfaceAt`/`meshHeight`), bridges and `world-test.mjs` all derive from `heightAt`. A zero-mean, bounded
  detail layer may only be **shading-only**: normal perturbation, albedo variation, or decoration density.
  [V constraints from source, I policy]
- **Texture baking in `surfaces.tsx`:** Cellular `Distance2Sub`/`Distance2Div` gives cracked-mud, flagstone
  and rock-plate masks. Domain warp (`DomainWarpProgressive`, amp ~10–30 px) on strata coordinates gives
  folded rock bands. Caveat: Eldoria's baked tiles must be **periodic** (`vnoise` wraps lattice indices),
  and FNL has **no periodic or tileable mode** (no period parameter anywhere in the API). Seamless 2D tiles
  would need 4D torus sampling, which FNL lacks. So the useful approach is to copy the *algorithms*
  (jittered 3×3 cell search, F2−F1, gradient domain warp) and wrap the lattice indices modulo the period,
  as `vnoise` does. [V API, I approach]
- **Decoration and biome detail:** cellular `CellValue` gives stable per-cell IDs for patchy groundcover
  (heather or bracken patches) and rock-field clustering in `decorate()`. Deterministic for a fixed
  seed. [V]
- **Domain-warped biome borders** already exist in Eldoria (`warp()` → `biomeAt`). Changing them changes
  the canonical biome map, so do not change them. [V]

### 4 Dependency and Three.js compatibility
- Zero dependencies. No THREE usage, so it is independent of the r149 version. TypeScript source with
  enums and `private` members; the dist is an ES2023 module. Eldoria's esbuild build can inline either
  (`.ts` loader). [V]
- **GLSL port in an r149 shader:**
  - It uses integer bitwise operators (`^`, `<<`, `>>`, `&`) in `_fnlHash2D`, `_fnlGradCoord2D` and others,
    `round()`, `f`-suffixed float literals, a `struct` state, loops bounded by `state.octaves`, and an
    unbounded `for (int l = 0; ; l++)` (l.697). **WebGL1 (GLSL ES 1.00) cannot compile it** (no bitwise
    ops, loop-index restrictions). [V constructs, I spec]
  - It declares tables with C-style brace initializer lists (`const float GRADIENTS_2D[] = { … }`, also
    `RAND_VECS_2D`, `GRADIENTS_3D`, `RAND_VECS_3D`). GLSL ES 3.00 (WebGL2) has array constructors
    (`float[N](…)`) but, as far as I know, not brace initializer lists, so a conversion pass is likely
    required even on WebGL2. It also depends on 32-bit wrapping integer multiply in hashes. [V code, I spec]
    No GLSL compiler was available to confirm.
  - Eldoria advertises WebGL1 safety (README l.211) and `surfaces.tsx` targets WebGL1, so a shader that
    only works on WebGL2 would need a fallback anyway. **Conclusion: do not use the GLSL port at runtime.**
    [V Eldoria docs, I conclusion]

### 5 Yumina sandbox compatibility
- Pure JS math. No WASM, Workers or fetch [V]. It must be bundled as source (npm imports are stripped).
  It uses `Math.imul`, `Math.floor`, `Math.round`, `Math.sqrt` and `Number.MAX_VALUE`, which are all
  ES5/ES2015 baseline. [V]

### 6 iPhone/mobile performance
- Measured in Node 22 on the sandbox host (desktop-class CPU; iPhone Safari is expected to be slower) [V numbers]:
  OpenSimplex2 single 1e6 samples = 50.7 ms; FBm 4 octaves = 183 ms; Cellular Distance2Sub = 107 ms;
  OpenSimplex2 domain warp = 91 ms. A copy of Eldoria's `noise2` took 46.5 ms per 1e6, so FNL is not faster
  than what Eldoria has.
- `GetNoise` creates two arrow closures (`R2`, `R3`) on **every call** (l.327/350). That adds avoidable
  GC pressure in tight loops; a vendored copy should hoist them. [V code, I GC impact]
- Baking a 512² texture with 4 FBm channels costs ~4×262k×0.18 µs ≈ 0.2 s desktop (est. 0.5–1 s on
  iPhone), so it should be sliced across frames or limited to the "lite" tier. [I]
- Determinism: two instances with the same seed gave bit-identical output over 1000 samples [V]. Lattice
  hashing uses `Math.imul` in OpenSimplex2, Perlin and Value [V]. `_SingleCellularR2` builds
  `xPrimed = (xr-1)*PrimeX` with float multiplication and relies on `^` ToInt32 truncation. That is exact
  while |cell index| < ~1.8e7, which holds for any Eldoria coordinate at sane frequencies, but it is not
  guaranteed bit-identical to the C/C++ ports. [V code, I range]

### 7 License obligations
- `LICENSE`: **MIT**, "Copyright(c) 2020 Jordan Peck … 2020 Contributors". The TS file header says 2023
  and credits the JS porters (snowfoxsh/Patrick U, Simon Paris). Keep the header in any vendored copy. [V]

### 8 Recommended implementation approach
- Do not vendor the whole file (114 KB). If cellular or warp textures are wanted, port ~150–250 lines
  (`_SingleCellularR2` with periodic wrap, `_SingleDomainWarpOpenSimplex2Gradient` or a simpler BasicGrid
  warp) into `surfaces.tsx` texture baking, with the MIT header, and bake through the existing
  `dataTex()` cache. Keep `worldgen.tsx` noise untouched.

### 9 What was actually inspected
- `LICENSE`, `JavaScript/package.json`, `tsconfig.json`, `README.md` (head), enums, constructor, setters,
  `GetNoise`, `DomainWarp`, hash helpers, fractal FBm/Ridged, OpenSimplex2 2D, Cellular 2D, domain warp single,
  test header, and the dist header/size. `GLSL/README.md`, the GLSL header, tables and the function index.
  Ran a Node benchmark and determinism check (script at
  `/tmp/claude-0/-home-user-yumina-oss-reference/e87faf5b-8091-59c1-932e-05de8d767a35/scratchpad/bench/fnl.mjs`).

### 10 Remaining gaps and uncertainties
- GLSL ES 3.00 compilation was not tested (no glslang available). iPhone timings are estimated.
  OpenSimplex2S, PingPong and 3D paths were not read line by line.

---

## recast-navigation-js

### 1 Purpose and relevant functionality
- An Emscripten/WebIDL port of Recast (navmesh build), Detour (query), DetourCrowd and DetourTileCache, with
  TS wrappers. Packages: `recast-navigation-wasm` (C++ glue plus build), `recast-navigation-core`
  (`NavMesh`, `NavMeshQuery`, `Crowd`, `TileCache`, the raw Recast API), `recast-navigation-generators`
  (`generateSoloNavMesh`, `generateTiledNavMesh`, `generateTileNavMeshData`, `generateTileCache`),
  `recast-navigation-three` (helpers and `threeTo*` generators), and a playcanvas package. Version 0.43.1. [V]

### 2 Exact source files worth studying
- `packages/recast-navigation-wasm/CMakeLists.txt` – emcc flags (see §5). `build.sh` – clones
  `isaac-mason/recastnavigation` at `599fd0f…` at build time. `front-matter.js` – Recast/Detour zlib notice
  (`--extern-pre-js`, so it ships in the bundle). `src/*.cpp/.h` – Crowd, NavMesh, NavMeshQuery,
  TileCache glue. `recast-navigation.idl`. [V]
- `packages/recast-navigation-core/src/raw.ts` – `init(impl?)` (l.173). It accepts a custom module
  factory, otherwise it calls `await import('@recast-navigation/wasm')`. [V]
- `core/src/crowd.ts` – `CrowdAgentParams` (radius, height, maxAcceleration, maxSpeed, collisionQueryRange,
  pathOptimizationRange, separationWeight, updateFlags…), `Crowd.update(dt, timeSinceLastCalled,
  maxSubSteps)` (fixed-step accumulator plus interpolation), `addAgent`, `requestMoveTarget`, `teleport`,
  and `corners()`. [V]
- `core/src/tile-cache.ts` – `addCylinderObstacle`, `addBoxObstacle(pos, halfExtents, angle)`,
  `removeObstacle`, `update(navMesh)` (dynamic obstacles, rebuilt incrementally per tile). [V]
- `core/src/nav-mesh-query.ts` – `findNearestPoly`, `findPath`, `findStraightPath`, `computePath`,
  `findClosestPoint`, `moveAlongSurface`, `raycast`, `findRandomPointAroundCircle`. [V]
- `generators/src/generators/generate-tiled-nav-mesh.ts` – `generateTileNavMeshData(positions, indices,
  rcConfig, chunkyTriMesh, {x,y,bmin,bmax})` builds one tile, which is the hook for streamed chunks.
  `core/src/recast.ts` `recastConfigDefaults` (cs 0.2, ch 0.2, walkableSlopeAngle 60, walkableClimb 2,
  walkableRadius 0.5…). [V]
- `three/src/utils/get-positions-and-indices.ts`, `three/src/helpers/*` (NavMeshHelper, CrowdHelper,
  TileCacheHelper), `three/src/debug/debug-drawer.ts`. [V]

### 3 Techniques applicable to Eldoria
- A true navmesh would only make sense **per settlement** (solo navmesh from building footprints plus
  terrain patch) or per LOD0 chunk (tiled, `generateTileNavMeshData`). Continent-wide coverage is out of
  scope: the world is ~100k × 72k units. [I]
- Detour concepts are worth re-implementing in plain JS without the library:
  (a) string-pulling/funnel (`findStraightPath`) to smooth grid A* paths into straight segments;
  (b) DetourCrowd-style **separation plus velocity-obstacle sampling** (`separationWeight`,
  `collisionQueryRange`) to improve `ai.tsx` `separate()`, which currently only pushes overlapping circles;
  (c) TileCache-style **dynamic obstacles** = re-rasterizing only the affected grid cells when a cart or
  door changes. [V API, I mapping]

### 4 Dependency and Three.js compatibility
- `@recast-navigation/three` peer `three: "0.x.x"`. Helpers use basic APIs (Mesh, BufferGeometry,
  InstancedMesh, `setColorAt`, MeshBasicMaterial). `DebugDrawer` imports
  `three/addons/lines/LineSegments2.js`, an ES module addon path that Eldoria's UMD THREE r149 does not
  provide as a global, so it would need vendoring. [V imports, I r149 addon availability]
- Core depends on `@recast-navigation/wasm@0.43.1`. Babel and rollup build to ESM. [V]

### 5 Yumina sandbox compatibility (precise)
- `CMakeLists.txt` builds **two** outputs, both with `-s WASM=1` [V]:
  - `recast-navigation.wasm.js` plus a separate `.wasm` file (EMCC_WASM_ESM_ARGS);
  - `recast-navigation.wasm-compat.js` with `-s SINGLE_FILE=1 -s WASM=1`, i.e. the **wasm binary is
    base64-embedded in the JS** but still instantiated through `WebAssembly`. This is the package's default
    export (`package.json` `"main"`/`"."` → wasm-compat). [V]
- Common flags: `MODULARIZE=1`, `EXPORT_ES6=1`, `EXPORT_NAME="Recast"`, `ENVIRONMENT='web'`,
  `INITIAL_MEMORY=67108864` (64 MB), `ALLOW_MEMORY_GROWTH=1`, `ALLOW_TABLE_GROWTH=1`, `FILESYSTEM=0`,
  `NO_DYNAMIC_EXECUTION=1` (unless closure), `-O3 -flto`. [V]
- A repo-wide search for `asm.js`, `WASM=0` and `wasm2js` returns **no matches** (only CHANGELOG/yarn noise). There is **no JS
  fallback**. In a sandbox that blocks `WebAssembly`, **every published build fails at init**. [V]
- Theoretical workaround: rebuild with emsdk `-s WASM=0` (wasm2js) and pass the factory to
  `init(impl)`. The API allows this [V `raw.ts`], but it is untested. The 64 MB initial heap,
  `addFunction` with table growth, and output size (probably several MB of JS) are risks, and the build
  needs emsdk plus the external recastnavigation fork, which is not in this checkout. [I]
- No dist artifacts are in the checkout (built by `build.sh`), so bundle size was **not** measured here.
  The "~1 MB" in `docs/oss-evaluation.md` is unverified. [V absence]

### 6 iPhone/mobile performance
- Detour queries and crowd updates in WASM are fast [I]. The costs are the 64 MB initial memory
  reservation (an iOS memory-pressure risk), navmesh baking per settlement (Recast rasterization at
  cs 0.2 over a 300 m town would be large; cs 0.5–1.0 is more realistic), and main-thread-only baking if
  Workers are blocked. [I]

### 7 License obligations
- Wrapper: `LICENSE` **MIT**, "Copyright © 2025 Isaac Mason" (root and per-package). [V]
- Recast & Detour: **zlib** license text, "Copyright (c) 2009 Mikko Mononen", embedded in `front-matter.js`.
  Altered versions must be marked, and the notice must not be removed. [V]
- `fastlz.c` (RecastDemo/Contrib) is compiled in through CMake. Its license file is not in this checkout
  (FastLZ is MIT [I]). [V inclusion]

### 8 Recommended implementation approach
- **Do not integrate** while Yumina may block WebAssembly. Use it as a design reference (crowd parameters,
  corridor/funnel, tile-cache obstacle semantics) for a pure-JS grid navigator (see rot.js and the
  candidates below). Revisit only if Yumina guarantees WASM, and then use the `wasm-compat` build through
  `init(factory)`, one solo navmesh per loaded settlement, and `Crowd` for townsfolk.

### 9 What was actually inspected
- Root `LICENSE`, the package list, `recast-navigation-wasm/{package.json, build.sh, CMakeLists.txt,
  front-matter.js, README.md, src listing}`, `core/src/{raw-module.ts, raw.ts (init), crowd.ts,
  tile-cache.ts, nav-mesh.ts index, nav-mesh-query.ts index, recast.ts defaults, random.ts}`,
  `generators/src/generators/generate-tiled-nav-mesh.ts` (signatures/config), and `three/src` (exports,
  imports, get-positions-and-indices). A repo-wide grep for zlib, asm.js, WASM=0, wasm2js and WebAssembly.

### 10 Remaining gaps and uncertainties
- No build was run (no emsdk). The wasm2js feasibility, size and runtime are unknown. C++ glue
  (`src/*.cpp`) was not read in detail. The playcanvas package and apps/examples were not inspected.

---

## rot.js

### 1 Purpose and relevant functionality
- Roguelike toolkit v2.2.1 (TypeScript in `src/`, ES modules in `lib/`, UMD `dist/rot.js` global
  `ROT`). Relevant parts: grid pathfinding (`path/`), field of view (`fov/`), dungeon/map generators
  (`map/`), seeded RNG (`rng.ts`), Simplex noise (`noise/`), turn scheduler and engine. [V]

### 2 Exact source files worth studying
- `src/path/path.ts` – base `Path` (8/6/4 topology, `_getNeighbors` with orthogonals ordered first). [V]
- `src/path/astar.ts` (109 lines) – `AStar.compute(fromX, fromY, cb)`. It searches **from target to
  source**, uses **unit edge cost** (diagonal = 1, Chebyshev heuristic for topology 8), a **sorted array
  open list with `splice` insert** (O(n) per insert), and string keys `"x,y"`. The callback yields the path
  from→to. [V]
- `src/path/dijkstra.ts` (71 lines) – BFS from the target with a cache (`_computed`), so repeated
  `compute()` calls toward the same target are cheap. This is a ready-made flow-field pattern. [V]
- `src/fov/precise-shadowcasting.ts`, `recursive-shadowcasting.ts` (`compute180`/`compute90` for vision
  cones), `discrete-shadowcasting.ts`. All use the `lightPasses(x,y)` callback. [V]
- `src/map/digger.ts` (Tyrant-style rooms plus corridors), `uniform.ts` (rooms then corridors), `rogue.ts`
  (3×3 room grid), `cellular.ts` (cave CA with `randomize`, `create`, `connect`), `features.ts` (`Room`
  with doors, `Corridor`), and `dividedmaze.ts`/`ellermaze.ts`/`iceymaze.ts`. [V]
- `src/rng.ts` – Alea PRNG (`setSeed`, `getUniform`, `getUniformInt`, `getNormal`, `getWeightedValue`,
  `shuffle`, `getState`/`setState`, `clone`). The **default export is a singleton seeded with `Date.now()`**. [V]
- `src/noise/simplex.ts` – 2D simplex whose permutation comes from the singleton `RNG.shuffle`. [V]
- `src/scheduler/{simple,speed,action}.ts`, `src/engine.ts` (lock/unlock with thenables),
  `src/MinHeap.ts` (used only by `eventqueue.ts`, **not** by A*). [V]

### 3 Techniques applicable to Eldoria
- **NPC town pathing over a collider grid.** Rasterize each settlement's `colliders` (circle and oriented
  box) and `segs` (walls), the same shapes `Game.collide` uses, into a walkability grid (e.g. 1 m cells,
  inflated by the NPC radius 0.4) when the settlement is built. Then path from the NPC to its wander
  `goal`. This replaces the current "walk straight, abandon after 1.5 s stuck" logic in `updateNPCs`.
  Canonical geography is untouched (runtime-only, derived from deterministic settlement layout). [V Eldoria
  code, I design]
- **Combat steering:** `ai.tsx` `walkTo` stops at walls (`stepFree`/`collide`). A Dijkstra flow field
  toward the player (one BFS per turn, reused by every monster) gives wall-aware approach and flanking. [I]
- **Line of sight / aggro / stealth:** precise shadowcasting on the same grid, for "can the guard see
  you" or to light only visible tiles in dungeons. [I]
- **Dungeon interiors:** Eldoria has dungeon *doors* only. `Digger`/`Uniform`/`Cellular` seeded per place
  (`RNG.setSeed(hashStr(place.id))`) could generate 3D interiors in a separate scene. This does not alter
  overworld geography. **Determinism hazard [V code]:** `Digger.create` and `Uniform.create` stop on
  wall-clock `timeLimit` (default 1000 ms, `Date.now()` in `digger.ts` l.71–77 and `uniform.ts` l.57–60;
  Uniform even returns `null`). On a slow iPhone the map could differ from desktop. Pass
  `timeLimit: Infinity` and seed the singleton immediately before `create()`. On desktop, same seed gave
  the same map for both Digger and Uniform [V run].
- **Town layouts:** `settlements.tsx` layouts are canonical. Do not replace them. rot.js map generators
  could at most lay out *interiors* (inn, keep, cellar floor plans). [V/I]
- **RNG:** Eldoria already has `mulberry`/`rng(seed)` and `hash2`. Alea adds `getNormal`,
  `getWeightedValue` and `getState`/`setState`, which are small and easy to replicate. Not a reason to vendor. [V]

### 4 Dependency and Three.js compatibility
- No dependencies, no THREE usage. `lib/*.js` are per-file ES modules; `dist/rot.js` is UMD (`global.ROT`,
  184 KB; 68.7 KB min), Babel-transpiled ES5. No built-in prototype mutation found (`grep prototype.`
  in src: none). [V]

### 5 Yumina sandbox compatibility
- Pure JS, no WASM, Workers or fetch in path/map/fov/rng [V]. Individual files can be vendored as source
  modules (`path.ts`, `astar.ts`, `dijkstra.ts`, `constants.ts` DIRS ≈ 260 lines). Display modules
  (canvas, WebGL tile backend) are not needed. [V]

### 6 iPhone/mobile performance
- Measured in Node 22 on the host, with 8-topology and 20% random blockers [V]: 64² → 5.2 ms; 128² → 13.3 ms;
  200² → 29.9 ms. An **unreachable goal** on 128² (full wall) explores the whole region: 62 ms. Expect
  2–4× slower on iPhone [I]. The O(n) sorted insert and string-key objects are the bottleneck. A binary
  heap with typed-array `g`/`parent` arrays is roughly an order of magnitude faster [I]. For per-frame use,
  cap the expansions, cache per goal, and spread work across frames.
- Pathing quality: unit cost makes diagonals as cheap as orthogonals (zig-zag paths), and `_getNeighbors`
  **allows diagonal corner-cutting** between two blocked orthogonals [V code]. Both need fixing for 3D
  characters (octile cost √2, no-corner-cut rule).

### 7 License obligations
- `license.txt`: **BSD-3-Clause**, "Copyright (c) 2012-now(), Ondrej Zara" (`package.json` "BSD-3-Clause").
  Keep the copyright, conditions and disclaimer in source, and reproduce them in documentation for binary
  distributions. The "Neither the name…" clause forbids endorsement. `src/rng.ts` notes the Alea algorithm
  "(C) 2010 Johannes Baagøe", MIT. [V]

### 8 Recommended implementation approach
- For NPC/combat pathing, write an Eldoria-native `nav.tsx` (~150–200 lines) modeled on rot.js `Path`/
  `AStar`/`Dijkstra` with a binary heap, octile costs, no corner cutting, typed-array grids built from
  settlement colliders, and funnel smoothing. If code is copied, include the BSD-3 notice.
- For dungeons (a later, larger feature), vendor `map/digger.ts` + `features.ts` + `dungeon.ts` +
  `map.ts` + `rng.ts` (~700 lines, BSD-3). Patch them to use an injected RNG instead of the global
  singleton and remove the wall-clock `timeLimit`.

### 9 What was actually inspected
- `license.txt`, `package.json`, `src/` tree and line counts, full `path/path.ts`, `astar.ts`,
  `dijkstra.ts`, `rng.ts`, `engine.ts`. Parts of `map/digger.ts` (options, create loop), `uniform.ts`
  (timeLimit), `cellular.ts` (options), the `rogue.ts`/`features.ts` index, `noise/simplex.ts`, `fov/fov.ts`
  plus the compute signatures, `util.ts`, and the `dist/rot.js` UMD wrapper. Ran an A* benchmark and a
  Digger/Uniform determinism check (script at
  `/tmp/claude-0/-home-user-yumina-oss-reference/e87faf5b-8091-59c1-932e-05de8d767a35/scratchpad/bench/rot.mjs`).

### 10 Remaining gaps and uncertainties
- `rogue.ts`, `cellular.connect`, the mazes and `lighting.ts` were not read fully. FOV algorithms were not
  benchmarked. iPhone timings are estimated. Cross-engine determinism of `getNormal` (uses `Math.log`) was
  not tested.

---

## Terrain & navigation integration candidates

Ranked by benefit/effort for Eldoria. "Determinism risk" means risk to canonical geography or to
reproducible world generation. All candidates keep `heightAt`, roads, rivers and settlement layouts unchanged.

| # | Candidate | Source | Effort | Determinism risk | Expected benefit |
|---|-----------|--------|--------|------------------|------------------|
| 1 | Settlement **collider-grid A\*** for townsfolk wandering (`updateNPCs`), with binary heap, octile cost, no corner cut, funnel smoothing; grid rasterized once per settlement from `colliders`/`segs` | rot.js `path/astar.ts`, `path.ts` (pattern); recast `findStraightPath` (concept) | M (1–2 d, ~200 lines plus a `world-test`-style unit test) | None to geography. Paths are runtime-only (wander goals already use `Math.random`) | High: removes NPCs grinding into walls and abandoning goals, and enables "walk to the inn" behaviour |
| 2 | **Slope rule aligned with the shader** in `decorate()`: compute `n.y` from chunk heights and gate trees/grass with the same `smoothstep(0.86,0.68,n.y)` rock weight as `surfaces.tsx`. Rocks/scree go where the rock weight is high | THREE.Terrain `grassMeshWeight`/`grassSlopeWeight`, `ScatterMeshes.maxSlope` | S (~40 lines) | Changes *decoration* placement (deterministic from canonical heights + `hash2`). No geography change. Decoration snapshots, if any exist, would need re-baselining | Medium-high visual: no trees or grass on rock-painted cliffs; scree reads as erosion |
| 3 | **Grass instance distance compaction** (`InstancedMesh.count` per LOD0 chunk, refreshed on ≥2 m camera movement) | THREE.Terrain `updateGrassLOD` | S (~40 lines) | None | Medium iPhone perf: fewer grass vertices, since `frustumCulled=false` today |
| 4 | **Dijkstra flow field** for combat approach and flee in `ai.tsx` `walkTo`, one BFS per turn over the settlement grid (outdoors: a grid from the `stepFree` water test) | rot.js `path/dijkstra.ts` | M | None (runtime only) | Medium: monsters route around walls and water instead of stopping |
| 5 | Grass **cluster weight** from `noise2` (broad plus detail, floor 0.15) and a wind bend in the grass material `onBeforeCompile` | THREE.Terrain `grassClusterWeight`, `createGrassMaterial` | S | Decoration-only. Avoid sin-hash noise and reuse `noise2`/`hash2` | Medium visual realism |
| 6 | **Periodic cellular + domain-warp texture channels** for `surfaces.tsx` (cracked mud, flagstone, folded strata), baked into the existing RGBA tiles | FastNoiseLite `_SingleCellularR2`, `_SingleDomainWarp*` (ported with modulo wrap) | M (~200 lines) | None (textures only), but bake time on iPhone must be sliced | Low-medium: texture variety; tileability must be preserved |
| 7 | Line-of-sight grid (precise shadowcasting) for guard awareness or dungeon lighting | rot.js `fov/precise-shadowcasting.ts` | S-M | None | Low-medium (gameplay feature, optional) |
| 8 | **3D dungeon interiors** from `Digger`/`Uniform` with per-place seed, `timeLimit: Infinity`, and an injected RNG | rot.js `map/*`, `rng.ts` | L (generator + 3D builder + gameplay) | Low for the overworld (interiors are off-map). High if the wall-clock limit is left on | High, but a large new feature |
| 9 | Recast navmesh + DetourCrowd per settlement | recast-navigation-js | L | None to geography; **fails entirely if WASM is blocked** | High quality, but not viable in Yumina today |
| 10 | Height filters, erosion, influences, or FNL noise on terrain heights | THREE.Terrain filters/influences; FNL | n/a | **Breaks canonical geography** and `world-test.mjs` | Rejected |

Verified facts behind the ranking: rot.js A* costs 13 ms (128²) and 62 ms (unreachable 128²) in Node; FNL
is no faster than Eldoria's own `noise2` (51 ms vs 46.5 ms per 1e6); recast ships only `WASM=1` builds
(`SINGLE_FILE` = base64 wasm, still needs WebAssembly); THREE.Terrain has no erosion code and requires
three ≥0.160 (uses r152+ `SRGBColorSpace`); rot.js Digger/Uniform depend on wall-clock time.
Inferences: iPhone slowdown factors, the GLSL ES 3.00 brace-initializer incompatibility, and wasm2js
feasibility.


---

# Characters and assets

# Audit D: character realism references for Eldoria 3D

Scope: read-only audit of four reference repositories against Eldoria's character pipeline
(`worlds/eldoria-3d/tools/character/*`, `src/rig.tsx`, `src/anim.tsx`). Nothing was modified.
Date of audit: 2026-10-20.

Markers used throughout: **[V]** = verified by reading files or running commands at the commits below;
**[I]** = inference or recollection that was not verified in this audit.

| Repo | Path | Commit (verified with `git log -1`) |
|---|---|---|
| makehuman | /workspace/eldoria-references/makehuman | a8bc2d54ff0ac92e78ff71431b1023eda42bf482 |
| glTF-Blender-IO | /workspace/eldoria-references/glTF-Blender-IO | a35fd9fbc53280116ea50565fd16889a14ae91b1 |
| glTF-Sample-Assets | /workspace/eldoria-references/glTF-Sample-Assets | edc7c9e67c639d230715049ee31f9a96a6babbbe |
| yumina-image-references | /home/user/yumina-image-references | 0c23a011b39ffbefea513b9a65a113695755f9d6 |

Eldoria baseline facts used for comparison [V]:
- `build_character.py` shapes hm08 with `mh.macro()` (caucasian, young, gender/muscle/weight/proportions/height),
  adds morphs `female`, `build_*`, `eyeBlinkLeft/Right`, `jawOpen`, `browDownLeft/Right`, `mouthSmileLeft`, `wince`,
  `ears_pointed`, using only `expression/units/caucasian/*` and `ears/*` targets (lines 32-47).
- Skeleton: the 163-bone `default.mhskel` is collapsed onto 15 game joints + feet via `skel.merged_weights(rule)`.
- Eyes: `eyes/low-poly/low-poly.mhclo` fitted with `mh.proxy_fit`, material `tex.eye()` = Principled, roughness 0.08,
  `brown_eye.png`; runtime `dressMaterials` upgrades role "eye" to MeshPhysical clearcoat 1 / roughness 0.15,
  skin to sheen 0.35 (`rig.tsx` line 147).
- Export call (`build_character.py` lines 318-320): `export_animation_mode="NLA_TRACKS"`, `export_morph_normal=False`,
  `export_image_format="WEBP"`, `export_image_quality=82`, `export_def_bones=False`, `export_force_sampling=True`,
  `export_optimize_animation_size=True`, `export_tangents=False`; then gltfpack `-cc -ce ext -kn -km -ke`
  and a crowd LOD with `-si 0.2 -se 0.04 -sp -slb` (`build.sh`).
- Runtime species handling: `speciesLook` only adjusts skin/build/beard for Orc-Blooded and Dwarf; `addTusks`
  attaches procedural tusks to the head socket (`rig.tsx` 184-192). No horns/tails.
- Three.js pinned at r149 (`/workspace/eldoria-references/_pinned/three-r149`).

---

## makehuman

### 1 Purpose and relevant functionality
- [V] MakeHuman 1.x application (Python/Qt) plus its bundled asset set: hm08 base mesh, morph targets,
  default skeleton + weights, proxies (eyes), materials, pose units, a few BVH animations, exporters.
- [V] Sparse checkout here contains `makehuman/{apps,core,lib,shared,plugins,licenses}`, `data/rigs`,
  `data/skins`, `data/targets/macrodetails`, `data/targets/expression`. Folders `data/eyebrows`, `data/hair`,
  `data/proxymeshes` exist in the tree but contain only `clear.thumb`; there is no `data/eyelashes` and no
  `data/clothes` in the git tree. All other data (3dobjs, eyes, targets/*, litspheres, poseunits, animations)
  is readable through `git show HEAD:<path>`, which is how it was inspected.
- [V] Eyebrow, eyelash, hair, clothing and skin-texture *assets* are NOT in this repo. `download_assets_git.py`
  line 60 pulls them from `https://github.com/makehumancommunity/makehuman-assets.git` (requires git LFS).
- [V] Only one rig ships here: `data/rigs/default.mhskel` (163 bones, 326 joint helpers, license "CC0", tags
  "facial bones, detailed hands, detailed feet") and `default_weights.mhw` (139 weighted bones, "Symmetric weights",
  license "CC0"). The "game engine" rig is NOT present: `apps/compat.py` lines 181-186 map legacy names to
  `cmu_mb.mhskel`, `motionbuilder_rig.mhskel`, `opensim.mhskel`, which also live in makehuman-assets [V];
  `game_engine.mhskel` is not referenced anywhere in this checkout [V by grep].

### 2 Exact source files worth studying
- `makehuman/LICENSE.md` - the code vs asset split and the "output is yours" statement (section D).
- `makehuman/apps/humanmodifier.py` - `UniversalModifier.getFactors` (l/c/r slider -> target weights, lines 536-545),
  `MacroModifier`, `EthnicModifier` (three ethnic sliders summing to 1), `getTargetWeights` (product of factors).
- `makehuman/apps/human.py` - `_setAgeVals` (lines 574-599: baby 1y / child ~10y / young 25y / old 90y piecewise
  weights), `_setEthnicVals` (847+, normalisation), weight/muscle tri-weights.
- `makehuman/shared/skeleton.py` - `getVertexWeights` (193-262: remap reference weights to another skeleton via
  `weight_reference_bones`), `autoBuildWeightReferences` (267), `get_roll_to`/`getMatrix` (bone roll from
  `planes` in `.mhskel`), `skinMesh` (605).
- `makehuman/shared/animation.py` - `PoseUnit` (311: named unit poses blended by weight), `blendPoses` (432),
  `VertexBoneWeights` (494, compile to 4 influences), `skinMesh` (1121, linear blend skinning).
- `makehuman/shared/bvh.py` - BVH loader with Z-up auto-detect (`load`, 778) and `createFromSkeleton` (793).
- `makehuman/shared/proxy.py` - `Proxy.getCoords` (204-221: 3-vertex barycentric ref + offset transformed by
  `TMatrix`), weight transfer to proxies (`_addProxyVertWeight`, 752), `delete_verts` (hide body under clothes).
- `makehuman/plugins/2_posing_expression.py`, `7_expression_mixer.py` - face expressions as bone poses over
  the face bones (face pose units), not morph targets.
- `makehuman/plugins/9_export_fbx/fbx_deformer.py` - shape keys exported as FBX blend shapes (`writeShapeGeometry`,
  text FBX only: "TODO support binary FBX shapekey export", line 129).
- `makehuman/plugins/9_export_collada/__init__.py` - options: helper geometry, facial pose-units, orientation
  (Y-up/Z-up), local bone axis (lines 112-126).
- `makehuman/plugins/9_export_obj/mh2obj.py` - plain OBJ export (static mesh).
- `makehuman/data/skins/default.mhmat` - `autoBlendSkin true`, `sssEnabled true`, `sssRScale 4 / G 2 / B 1`,
  litsphere shader.
- `makehuman/data/eyes/materials/brown.mhmat` - eye uses litsphere `skinmat_eye.png` with `AdditiveShading 0.5`.
- `makehuman/data/poseunits/face-poseunits.json` + `.bvh` - 59 named face unit poses (CC0).
- `makehuman/data/modifiers/modeling_modifiers.json` - canonical slider -> target grouping (useful as a recipe table).

### 3 Techniques applicable to Eldoria
**Face variety from targets (highest value).** [V] target folders and counts (including `images/*.png` thumbs in
the count): armslegs 210, asym 62, bodyshapes 45, breast 236, buttocks 3, cheek 24, chin 22, ears 66, eyebrows 9,
eyes 102, forehead 12, head 44, hip 21, measure 40, mouth 67, neck 24, nose 63, pelvis 6, stomach 12, torso 27,
macrodetails 98 entries, expression 102 `.target` files (34 units x 3 ethnicities). Face-relevant names [V]:
- head: `head-age-decr|incr`, `head-angle-in|out`, `head-fat-decr|incr`, shape presets `head-oval|round|square|
  rectangular|triangular|invertedtriangular|diamond`, `head-scale-{depth,horiz,vert}-*`, `head-back-scale-depth-*`.
- nose (42 targets): `nose-hump-*`, `nose-greek-*`, `nose-curve-concave|convex`, `nose-point-up|down`,
  `nose-point-width-*`, `nose-flaring-*`, `nose-nostrils-width-*`, `nose-septumangle-*`, `nose-width1|2|3-*`,
  `nose-scale-*`, `nose-trans-*`, `nose-volume-*`, `nose-compression-*`, `nose-base-up|down`.
- mouth (44): `mouth-angles-up|down`, `mouth-cupidsbow-*`, `mouth-dimples-in|out`, `mouth-laugh-lines-in|out`,
  `mouth-{upper,lower}lip-{height,volume,width,middle,ext}-*`, `mouth-philtrum-volume-*`, `mouth-scale-*`.
- eyes (per side, 34 l-* shown): `eye-bag-*`, `eye-epicanthus-in|out`, `eye-eyefold-*`, `eye-corner1|2-up|down`,
  `eye-height1|2|3-*`, `eye-push1|2-in|out`, `eye-scale-*`, `eye-trans-*`.
- chin: `chin-prominent-*`, `chin-width-*`, `chin-height-*`, `chin-cleft-*`, `chin-jaw-drop-*`,
  `chin-prognathism-*`, `chin-bones-*`, `chin-triangle`.
- cheek: `l|r-cheek-bones|inner|volume-*`, `cheek-trans-up|down`. forehead: `forehead-nubian-*`, `-temple-*`,
  `-scale-vert-*`, `-trans-*`. eyebrows: `eyebrows-angle-up|down`, `eyebrows-trans-*` (brow ridge shape).
- ears (22 per side): `ear-shape-pointed|round|square|triangle`, `ear-lobe-*`, `ear-flap-*`, `ear-wing-*`,
  `ear-rot-*`, `ear-scale-*` (Eldoria uses only pointed + scale-vert).
- asym: `asym-{brown,cheek,ear,eye,jaw,mouth,nose,temple,top}-N-l|r` - subtle asymmetry breaks the "clone" look.
- neck: `neck-double-*`, `neck-scale-*`; torso `torso-vshape-*`, `torso-muscle-dorsi|pectoral-*`.
- bodyshapes: `bodyshapes-elvs-fem-*|man-*` (22 body silhouettes: apple, hourglass, inverted-triangle...).
- Targets are sparse [V]: `nose-hump-incr` 414 verts, `chin-prominent-incr` 115, `l-eye-epicanthus-in` 71,
  `head-age-incr` 3195 (of 13380 body verts). Cheap as glTF sparse morphs.

**Age / ethnicity [V].** `macrodetails/{african,asian,caucasian}-{male,female}-{baby,child,young,old}.target`
plus `universal-*`, `proportions/*`, `height/*` combos. Eldoria's `mh.macro()` already handles race and age
strings but `build_character.py` only passes the defaults (caucasian, young). An `old` blend (age 0.5..1 maps
`oldVal = 2*age-1`, `youngVal = 1-oldVal`, human.py 592-599) gives elders; ethnic blend weights should sum to 1
(EthnicModifier). Expression units exist per ethnicity (`expression/units/{african,asian,caucasian}`) - when a
face uses another ethnic macro, take blink/jaw units from the matching folder [V folders exist; I: mismatch error
is small but visible around lids].

**Skin shading.** [V] MakeHuman's own skin is a litsphere (matcap) shader with an `sssEnabled` flag and per-channel
scatter scales R4/G2/B1, and auto-blended litspheres per ethnicity (`litspheres/skinmat_{african,asian,caucasian}.png`).
[I] For three r149 the transferable idea is the R>G>B scatter falloff: implement as wrap lighting with a red-shifted
terminator via `onBeforeCompile` on MeshStandard/MeshPhysical (replace `RE_Direct` diffuse `dotNL` with
`saturate((dotNL + w)/(1+w))` and tint the wrapped band by `vec3(1.0,0.45,0.3)`); r149 has
`examples/jsm/shaders/SubsurfaceScatteringShader.js` [V present] but it is a full ShaderMaterial (no skinning/morph
chunks wired), so a patched standard material is cheaper and keeps skinning + morph textures.

**Eye shading (why Eldoria eyes look dark).** [V] `brown.mhmat` relies on `AdditiveShading 0.5` with
`skinmat_eye.png` - the MakeHuman look adds a bright matcap on top of the diffuse texture; Eldoria's PBR
re-materialisation drops that additive term, and the eye ball sits in a socket that receives baked cavity AO.
[V] two eye proxies exist: low-poly (96 v / 86 f) and high-poly (1064 v / 1020 f). [I] Fixes: (a) small emissive
lift on the sclera/iris (emissiveMap = baseColor at ~0.15-0.25), (b) keep clearcoat for a catchlight and give the
eye material an envMap/`envMapIntensity` boost, (c) exclude eye verts from cavity AO, (d) optional high-poly eye only
for the hero/dialogue LOD.

**Hair cards vs strands; brows/lashes.** [V] the base mesh has helper groups `helper-hair` (428 v),
`helper-l|r-eyelashes-1|2` (60-65 v each), `helper-l|r-eye` (72 v), teeth, tongue, `helper-skirt` (720),
`helper-tights` (2674). Eyelash and eyebrow proxies are NOT in this repo, but the eyelash helper strips themselves
are CC0 geometry that already follows every target - they can be kept as alpha-tested lash cards (tex generated by
`hair.py`). [I] Strand hair is not viable on iPhone in this sandbox; stay with cards, but skin them to `head` +
`neck` (and chest for long hair) with 2-3 bone weights so long hair bends with the neck instead of being rigid.

**LOD.** [V] `proxymeshes` (MakeHuman's low-poly body proxies) are not in this checkout. Eldoria's gltfpack
simplification path remains the right LOD approach.

**Animation and retargeting.** [V] `skeleton.getVertexWeights` remaps weights to any skeleton by listing
`weight_reference_bones` per bone - equivalent to Eldoria's `merged_weights(rule)`. [V] `face-poseunits` (59 units:
brows, lids, eye look, cheeks, jaw, lips, tongue) are bone poses for the 163-bone rig; Eldoria collapses face bones,
so morph-based expression units remain the correct path. [V] Bundled BVH clips: `animations/walks/walk1.bvh`,
`dance1.bvh`, `zombie/zombieWalk1.bvh` (14 frames at 24 fps for walk1), `poses/tpose.bvh`, `benchmark.bvh`;
these `.mhanim` files are labelled `license AGPL3` (see 7) and are tiny in-place cycles - not a mocap source.
No IK or root-motion code exists in the checkout [V by inspection of shared/animation.py and skeleton.py:
`stretchTo` and `poleTargetCorrect` exist at lines 1089-1126 but are bone utilities, not a solver].

**Equipment attachment / clothing fitting.** [V] `proxy.getCoords` = barycentric over 3 body verts + offset scaled
by `TMatrix` (x/y/z scale from vertex pairs, or shear). Eldoria's `mh.proxy_fit` implements the scale variant only
[V lines 77-101 of mh.py]; it ignores `delete_verts`, shear/TMatrix variants and per-proxy custom weights. Adding
`delete_verts` would let outfits hide skin per-vertex rather than per 12 primitives.

### 4 Dependency and Three.js compatibility
- [V] Application code depends on PyQt5/Qt5 (GPLv3), numpy, PyOpenGL (`licenses/README.txt`). Eldoria does not run
  it; `mh.py` re-reads the plain-text assets with numpy. Keep it that way.
- [V] Data formats are text (`.obj`, `.target` "index dx dy dz", `.mhskel` JSON, `.mhw` JSON, `.mhclo`, `.mhmat`).
- [I] Nothing from MakeHuman reaches three.js directly; targets become glTF morph targets via Blender export.
  r149 GLTFLoader reads morph POSITION/NORMAL (lines 2042-2077 [V]); morph targets are uploaded as a data texture in
  WebGL2 [I r149 WebGLMorphtargets], so the count of morphs is not capped at 8 but costs GPU memory.

### 5 Yumina sandbox compatibility
- [V/I] Pure build-time data; the output GLB is base64-embedded as today. No runtime dependency is introduced.

### 6 iPhone/mobile performance
- [I] Each extra morph target costs about verts x 16 B (position, float RGBA texel) plus the same for normals if
  morph normals are exported. For one ~16k-vertex skinned body with outfits, 10 extra face morphs ~= 2.6-5 MB of GPU
  texture per *geometry* (shared across instances that share the geometry). Prefer few composite "face axes"
  (e.g. 6-8 recipes mixing 10-30 targets each) over shipping 100+ raw targets.
- [I] Alternatively bake N complete faces offline into N head-primitive variants (no runtime morph cost, more bytes).
  glTF requires every primitive of a mesh to carry the same morph target list, so head-only morphs still add (zero)
  targets to the other 11 body primitives; sparse accessors make them almost free in the Blender export, but
  gltfpack's handling of sparse accessors was not verified.

### 7 License obligations (precise)
- [V] `LICENSE.md` section B: "source code ... python files, bat scripts, shell scripts and glsl shaders" plus UI
  images are **AGPL-3.0** (`LICENSE.CODE.md`). This includes `data/shaders/glsl/*` (litsphere, skin shaders) and all
  of `apps/`, `core/`, `lib/`, `shared/`, `plugins/` - do not copy code from these into Eldoria; read for algorithms only.
- [V] Section C: "The base mesh and proxies, Targets and modifiers, Textures, Clothes (any MHCLO-based asset),
  Poses and expressions" are **CC0 1.0** (`LICENSE.ASSETS.md`). Individual files repeat it: `.target` headers
  ("explicitly released as CC0 in september 2020 ... Original copyright (C) 2014 Manuel Bastioni"), `base.obj`,
  `eyes/*.mhclo`, `eyes/materials/brown.mhmat`, `skins/default.mhmat`; `default.mhskel` / `default_weights.mhw`
  have `"license": "CC0"`; `face-poseunits.json` `"license": "CC0"`; `poses/benchmark.meta` `license CC0`.
- [V] Section D: exports and script-generated output contain no program logic per the project; no claim on output.
- [V] **Conflict to respect:** `data/animations/walks/walks.mhanim` and `zombie/zombie.mhanim` declare
  `# license AGPL3` (author Jonas Hauquier). Treat `walk1.bvh`, `dance1.bvh`, `zombieWalk1.bvh` as AGPL / unclear;
  do not ship them.
- [V] `licenses/README.txt`: third-party libs (PyQt5 GPLv3, Qt5 GPLv3, pyFBX GPLv2, numpy/pyOpenGL/transformations
  BSD) - irrelevant unless code is copied.
- [I] makehuman-assets (brows, lashes, hair, clothes, skins) are mostly CC0 but per-asset; check each file header
  before use. CC0 needs no attribution; Eldoria's README credit line is good practice and already present.

### 8 Recommended implementation approach
1. Add a `faces.py` recipe table (CC0 targets only) producing 6-8 composite face morphs, e.g. `face_gaunt`,
   `face_heavy`, `face_aquiline` (nose hump/greek/point-down), `face_flat` (nose base/compression, epicanthus),
   `face_square` (chin width/jaw drop/head-square), `face_soft` (cheek volume, head-round), `face_aged`
   (`head-age-incr`, eye-bag, laugh-lines, neck-double), `face_asym` (asym-*). Runtime picks 2-3 weights from a seeded
   hash per NPC -> hundreds of distinguishable faces with ~8 morphs.
2. Build two extra macro variants as morphs: `age_old` (macro age 0.85 minus young) and per-ethnicity deltas
   (`asian`, `african` minus caucasian at 0.5) instead of separate GLBs; combine with skin tint already in `look`.
3. Species: elves use `ears_pointed` + `ear-rot-backward`, `ear-scale-vert-incr`, `eyes/*-trans-up`, `head-oval`;
   dwarves `head-square`, `nose-volume-incr`, `neck-scale-horiz-incr`; orc-blooded `chin-prognathism-incr`,
   `forehead-nubian-incr`, `eyebrows-trans-forward` (brow ridge) plus tusks. Horns/tails need new meshes (not in
   MakeHuman); attach horns to the `head` socket and a tail as a 3-bone chain parented to `hips`.
4. Eyes: emissive lift + exclude eyes from cavity AO + envMap boost; keep low-poly eyes for crowd, high-poly for hero.
5. Keep eyelash helper strips as alpha-tested cards (they inherit all morphs for free).
6. Implement `delete_verts` in `mh.proxy_fit` only if per-vertex hiding is needed; otherwise keep primitive hiding.

### 9 What was actually inspected
`LICENSE.md`, `LICENSE.ASSETS.md` (head), `LICENSE.CODE.md` (head), `licenses/README.txt`, `git ls-tree` of
`makehuman/data/**`, all target folder listings, headers of 7 data files, `default.mhskel`/`default_weights.mhw`
metadata (parsed), `skins/default.mhmat`, `eyes/materials/brown.mhmat`, eye proxy vertex counts,
`base.obj` group sizes (parsed), `face-poseunits.json` head, `.mhanim` files, `humanmodifier.py` 441-660,
`human.py` 574-599 and 847-880, `skeleton.py` 193-262 and function index, `animation.py` / `bvh.py` / `proxy.py`
function index and `proxy.py` 204-247, plugin directory listing, exporter option code (fbx/collada), `compat.py` rig
map, `download_assets_git.py` repo URL.

### 10 Remaining gaps and uncertainties
- Image files (`brown_eye.png`, litspheres, target thumbnails) are excluded from checkout; not viewed.
- makehuman-assets repo (brows, lashes, hair, clothes, skins, `game_engine`/`cmu_mb` rigs, proxymeshes) not available;
  its per-asset licences are unverified here.
- Visual quality of each target at partial weights was not rendered; recipe weights above need tuning in Blender.
- Morph-texture GPU cost numbers are estimates from r149 internals as remembered, not profiled on an iPhone.

---

## glTF-Blender-IO

### 1 Purpose and relevant functionality
- [V] Khronos/Blender glTF 2.0 importer and exporter add-on. `bl_info` version **(5, 4, 5)**, `'blender': (5, 3, 0)`
  (`addons/io_scene_gltf2/__init__.py` lines 15-29). README notes "main branch ... will become Blender 5.2" and lists
  5.0/5.1 release branches (README lines 9-21) - the README is stale relative to `bl_info`.
- [V] Eldoria uses `bpy` 5.2 from PyPI (tools/character/README.md). `bpy` wheels bundle their own copy of this add-on
  [I: the 5.2 wheel ships the 5.2-era add-on, not this main 5.4.5]; options cited below exist in this main branch and
  most are older [I], but `export_meshopt_compression_enable` / `KHR_meshopt_compression` may not exist in 5.2.
  Check with `bpy.ops.export_scene.gltf.get_rna_type().properties.keys()` in the build env before relying on them.

### 2 Exact source files worth studying
- `addons/io_scene_gltf2/__init__.py` - every export property and default (lines 206-1086).
- `blender/exp/accessors.py` - sparse morph accessor decision (`sparse_type == "SK"` -> `gltf_try_sparse_sk`,
  lines 127-146), optional meshopt encoding of buffer views (148-170).
- `blender/exp/primitive_extract.py` - morph normals/tangents (`use_morph_normals` line 140, `MORPH_NORMAL_n` 329),
  shape key extraction, vertex colour, KHR_materials_* gating (848-870).
- `blender/exp/primitives.py` - morph target accessors built with `sparse_type='SK'` (310-337), variants.
- `blender/exp/animation/sampled/armature/keyframes.py` - `gltf_optimize_animation` removes constant channels
  (lines 70-80); `keep_armature` keeps at least one keyframe per bone.
- `blender/exp/animation/tracks.py`, `animations.py`, `action.py` - NLA-track / action export modes.
- `blender/exp/tree.py` - `gltf_def_bones` (641, 768, 914) and `gltf_leaf_bone` (346, 878) pruning.
- `blender/exp/material/search_node_tree.py` `gather_alpha_info` (558-631) - alpha mode is derived from the node
  graph: constant 1 -> OPAQUE; a detected clip (Math Round / Greater Than) -> MASK with cutoff; else BLEND.
- `blender/exp/material/materials.py` `__gather_alpha_mode` (484), `__gather_double_sided` (backface culling flag).
- `blender/exp/material/extensions/{sheen,clearcoat,transmission,specular,ior,volume,emission,anisotropy,
  iridescence,dispersion,variants}.py` - Principled BSDF socket -> KHR_materials_* mapping (e.g. sheen reads
  "Sheen Weight", "Sheen Tint", "Sheen Roughness"; skipped when weight is 0 and unlinked).

### 3 Techniques applicable to Eldoria
- **Author skin/cloth/eye extensions in Blender rather than at runtime** [V mapping exists]: setting Principled
  "Sheen Weight/Tint/Roughness", "Coat Weight/Roughness", "Specular IOR Level", "Emission" on the generated materials
  exports `KHR_materials_sheen`, `_clearcoat`, `_specular`, `_emissive_strength`, which r149 GLTFLoader reads [V list
  below]. That would let `dressMaterials` stop special-casing roles and lets per-material values be tuned in the build.
- **Alpha mode for hair/lash cards** [V]: wire alpha through a Math "Round" (or Greater Than) node to get
  `alphaMode: MASK` + `alphaCutoff`; anything fractional becomes BLEND (sorting problems on hair). Keep MASK for cards
  and, if desired, enable alpha-to-coverage at runtime [I].
- **Sparse morph targets** [V]: `export_try_sparse_sk` default True, `export_try_omit_sparse_sk` default False.
  Face-variety morphs touching 100-3000 vertices benefit most.
- **Morph normals** [V]: Eldoria passes `export_morph_normal=False`. Fine for blink/jaw, but large face/build morphs
  then shade with base normals [I: visible on nose/chin changes under a key light]. Option: keep morph normals and
  let gltfpack quantise them, or recompute normals after applying static face recipes (bake faces into variants).
- **Animation size** [V]: `export_optimize_animation_size` (on), `export_optimize_animation_keep_anim_armature`
  default True; `export_force_sampling` True; `export_frame_step` can halve keys; `export_sampling_interpolation_fallback`
  LINEAR. `export_anim_slide_to_zero`, `export_negative_frame` matter only if clips are offset.
- **Bones** [V]: `export_def_bones` (deform-only) default False. Eldoria's armature is already the 15+2 game joints,
  so this matters only if helper/IK/control bones are added later (e.g. foot IK targets or a tail chain) - then
  set True. `export_leaf_bone` False is correct for three. `export_hierarchy_flatten_bones` only for non-decomposable
  matrices.
- **Shared accessors** [V]: `export_shared_accessors` (default False) makes primitives of one mesh share attribute
  accessors. Eldoria's `body_skin` has 12 primitives (one per hide region) [V README]; [I] shared accessors avoid
  duplicating seam vertices and morph data between primitives, but gltfpack re-lays out buffers anyway, so measure.
- **Built-in compression** [V]: `export_meshopt_compression_enable` + `export_meshopt_extension`
  (`EXT_meshopt_compression` default / `KHR_meshopt_compression`), `export_use_gltfpack` + `export_gltfpack_*`
  options, Draco options. Eldoria's external gltfpack step is already equivalent and version-independent - keep it.
- **Root motion** [I]: exporter writes whatever the root bone/object does; for root motion keep the hips translation
  in clips and extract it at runtime, or bake it onto an armature-object track and use `export_anim_single_armature`.
- **Equipment** [V]: sockets as empties parented to bones export as glTF nodes (Eldoria already does `socket_*`).

### 4 Dependency and Three.js compatibility
- [V] r149 GLTFLoader extensions: EXT_mesh_gpu_instancing, EXT_meshopt_compression, EXT_texture_webp,
  KHR_draco_mesh_compression, KHR_lights_punctual, KHR_materials_{clearcoat, emissive_strength, ior, iridescence,
  sheen, specular, transmission, unlit, volume}, KHR_mesh_quantization, KHR_texture_basisu, KHR_texture_transform.
- [V] NOT in r149 (present only in the newer three.js checkout r187dev): KHR_materials_anisotropy, _dispersion,
  _diffuse_roughness, KHR_meshopt_compression, EXT_texture_avif, EXT_materials_bump. KHR_materials_variants is not a
  core r149 extension. => never select `KHR_meshopt_compression`; do not rely on anisotropy for hair/metal in r149.
- [V] `KHR_animation_pointer` export (`export_pointer_animation`, experimental) is not read by r149.

### 5 Yumina sandbox compatibility
- [V/I] Build-time only (Blender headless). Output GLB already passes through gltfpack and base64 embedding.
  WEBP images (`export_image_format="WEBP"`) rely on EXT_texture_webp which r149 supports [V]; Safari iOS 14+ decodes
  WebP [I].

### 6 iPhone/mobile performance
- [I] Biggest wins in order: sparse/skip morph normals (already off), fewer morph targets per geometry,
  `export_frame_step` 2 for locomotion clips (gltfpack `-at`/`-ar` can also quantise), 4 influences
  (`export_influence_nb` default 4 [V]) which is three's limit anyway.
- [I] Avoid BLEND materials on hair (overdraw + sorting); MASK is cheaper on tile GPUs only without heavy discard
  coverage, so keep card count low.

### 7 License obligations (precise)
- [V] `LICENSE.txt` is Apache License 2.0. Used as a build tool only (bundled inside `bpy`); nothing ships.
  If any code were copied into Eldoria tools, keep the Apache notice; not needed for current use.
- [I] Blender itself (bpy) is GPL; output files are not covered (already noted in Eldoria README).

### 8 Recommended implementation approach
1. In the build env, print the available export properties of the bundled 5.2 add-on and compare with this list.
2. Move material extension authoring into Blender: set sheen on skin/cloth, coat on eyes, emission on eye iris,
   then trim `dressMaterials` to only tint.
3. Hair/lash/brow materials: Round-node alpha clip -> MASK.
4. Keep `export_morph_normal=False` for expression morphs; for any big face-shape morphs either bake variants or
   test `export_morph_normal=True` and compare size after gltfpack.
5. If helper bones are added (foot IK targets, weapon IK, tail chain), set `export_def_bones=True` and mark
   non-deform bones accordingly.
6. Try `export_shared_accessors=True` + `export_frame_step=2` and measure GLB size after gltfpack.

### 9 What was actually inspected
`__init__.py` (bl_info; all export property names; defaults and descriptions for ~25 options; animation mode enum;
meshopt options), `README.md` version table, `LICENSE.txt` header, `blender/exp/accessors.py` 120-175,
`material/search_node_tree.py` 555-632, `material/materials.py` 484-500, `material/extensions/sheen.py` head,
greps over `blender/exp/**` for sparse, KHR_*, morph normal, optimize animation, def/leaf bones;
r149 and r187dev GLTFLoader extension lists.

### 10 Remaining gaps and uncertainties
- Exact add-on version inside the PyPI `bpy` 5.2 wheel not verified (no bpy installed in this environment).
- gltfpack's treatment of sparse morph accessors and shared accessors not tested.
- Whether NLA_TRACKS mode preserves Eldoria's per-clip extras was not traced (current pipeline works, so low risk).

---

## glTF-Sample-Assets

### 1 Purpose and relevant functionality
- [V] Khronos sample model collection. Only metadata/README/LICENSE files are checked out (no `.glb`/textures).
  160 entries under `Models/` (150 model folders with `metadata.json` + `LICENSE.md`, plus 10 index `.md` files).
- [V] License distribution over the 150 models (SPDX sets from `metadata.json` `legal[]`): CC0-1.0 only 62;
  CC0 + Khronos/UX3D/Stanford marks 20; CC-BY-4.0 only 45; CC-BY + Cesium/Khronos/DGG marks 12; CC-BY + CC0 4;
  CC-BY + CC-BY-NC 1 (DamagedHelmet); CC-BY-NC-SA 1 (PlaysetLightTest); proprietary/other 5
  (BrainStem Poser EULA, Duck SCEA, EnvironmentTest Adobe Stock, Sponza CRYENGINE agreement, VirtualCity 3DRT testing).
- [V] Each `LICENSE.md` says metadata files themselves are CC-BY-4.0 and "This license excludes logos and associated
  trademarks" (LegalMark entries = non-copyrightable logos that must not be reused as branding).

### 2 Exact source files worth studying
- `Models/<Name>/metadata.json` - machine-readable `legal[]` (artist, what, spdx), `tags`, `summary`.
- `Models/<Name>/LICENSE.md` - auto-generated per-model licence statement.
- `Models/Models-testing.md`, `Models-extension.md`, `Models-pbrtest.md` - curated lists.
- `README.md` - collection rules (removed assets without suitable licences; external sources list).

### 3 Techniques applicable to Eldoria (test table)
| Model | Tests | Licence [V metadata] | Ship? |
|---|---|---|---|
| SimpleSkin | minimal skinning | CC0-1.0 | test fixture (could ship, no value) |
| RiggedSimple | skinning start point | CC-BY-4.0 (Cesium) | test only |
| RiggedFigure | skinned figure + anim | CC-BY-4.0 (Cesium) | test only |
| CesiumMan | textured skinned walker | CC-BY-4.0 + Cesium mark | test only (logo) |
| RecursiveSkeletons | reused meshes, recursive skeletons | CC-BY-4.0 (Cesium) | test only |
| BrainStem | many-bone skin + anim | Poser EULA | test only, never ship |
| Fox | 3 clips (Survey/Walk/Run), skinning | CC0 model + CC-BY-4.0 rig/anim (tomkranis) + CC-BY-4.0 conversion | could ship with attribution (critter) |
| SimpleMorph / AnimatedMorphCube | morph basics, morph anim | CC0-1.0 | test |
| MorphStressTest | up to 8 morph targets | CC-BY-4.0 (Ed Mackey) | test |
| MorphPrimitivesTest | morph across multiple primitives (Draco) | CC-BY-4.0 | test (Eldoria's 12-primitive body case; Draco not loaded by Eldoria) |
| SimpleSparseAccessor | sparse accessors | CC-BY-4.0 | test |
| InterpolationTest | STEP/LINEAR/CUBICSPLINE | CC0-1.0 | test |
| MeshoptCubeTest | KHR_meshopt_compression + quantization | CC0-1.0 | test; r149 lacks KHR_meshopt -> expected failure |
| SheenCloth | sheen + texture transform | CC0-1.0 (Microsoft) | could ship (cloth reference) |
| SheenChair | sheen + variants | CC0-1.0 | test / prop |
| SheenWoodLeatherSofa | sheen leather | CC-BY-4.0 + CC0 | prop with attribution |
| SheenTestGrid / CompareSheen | sheen sweep | CC0 (Compare* carries Khronos mark) | test |
| ClearCoatTest / CompareClearcoat | clearcoat | CC-BY-4.0 / CC0+mark | test |
| TransmissionTest / CompareTransmission | transmission | CC0 | test |
| ScatteringSkull | volume_scatter + diffuse_transmission (SSS) | CC0-1.0 | test only; r149 ignores both extensions |
| DiffuseTransmissionPlant/Teacup | diffuse transmission | CC-BY+CC0 / CC0 | not supported by r149 |
| TextureTransformTest / TextureTransformMultiTest | KHR_texture_transform | CC0 / CC-BY-4.0 | test |
| AlphaBlendModeTest / CompareAlphaCoverage | OPAQUE/MASK/BLEND | CC-BY-4.0 / CC0+mark | test (hair cards) |
| NormalTangentTest / NormalTangentMirrorTest | normal maps, mirrored UVs | CC0 / CC-BY-4.0 | test (MakeHuman UVs are mirrored) |
| VertexColorTest | vertex colours | CC-BY-4.0 | test |
| NodePerformanceTest | node/mesh/texture counts | CC0-1.0 | perf test on iPhone |
| Corset | fabric PBR on mannequin | CC0-1.0 | reference |
| FlightHelmet | leather/fabric/glass PBR (README mentions transmission, basisu) | CC0-1.0 | reference/prop |
| SciFiHelmet, Lantern, WaterBottle, BoomBox, Avocado | PBR showcase | CC0-1.0 | could ship (Lantern fits fantasy) |
| DamagedHelmet | PBR | CC-BY-4.0 + CC-BY-NC-4.0 | test only (NC) |
| Sponza, Duck, EnvironmentTest, VirtualCity, PlaysetLightTest | misc | proprietary / NC | never ship |
- [V] No sample model is a realistic human with a face rig; none helps face realism directly. Their value is
  loader regression testing (skin, morph, sparse, alpha, sheen) on the r149 + meshopt path.

### 4 Dependency and Three.js compatibility
- [V] r149 supports sheen/clearcoat/transmission/ior/specular/volume/iridescence/emissive_strength/texture_transform/
  mesh_quantization/EXT_meshopt; it does not support anisotropy, dispersion, diffuse_transmission, volume_scatter,
  KHR_meshopt_compression (list in glTF-Blender-IO section 4).

### 5 Yumina sandbox compatibility
- [I] Test GLBs would be base64-embedded like Eldoria models; keep them out of the shipping world JSON (debug world
  or local harness only) to avoid size and licence obligations.

### 6 iPhone/mobile performance
- [I] Use NodePerformanceTest and MorphStressTest on device to measure draw-call and morph-texture limits; transmission
  samples are expensive (extra transmission render pass in r149) - avoid transmission on characters.

### 7 License obligations (precise)
- [V] CC0-1.0 models: no attribution required. CC-BY-4.0: credit each `legal[].artist` with title, licence link
  and change note (e.g. "Fox: model PixelMannen (CC0), rigging & animation tomkranis (CC-BY 4.0), glTF conversion
  @AsoboStudio and @scurest (CC-BY 4.0)"). LegalMark-* entries: do not reuse logos. CC-BY-NC / NC-SA, Poser EULA,
  SCEA, Adobe Stock, CRYENGINE, 3DRT: do not ship in a game.

### 8 Recommended implementation approach
- Download only the needed `.glb` files by name at the same commit into a test folder; add a loader smoke test that
  loads SimpleSkin, RiggedFigure, MorphPrimitivesTest (non-Draco variant if present [I]), SimpleSparseAccessor,
  AlphaBlendModeTest, SheenCloth, InterpolationTest through Eldoria's `rig.register` path with the meshopt decoder.
- Only Fox/Lantern-type CC0 or CC-BY props are candidates for shipping, each with a credit line.

### 9 What was actually inspected
All 150 `metadata.json` parsed (licence SPDX, artists, tags); `LICENSE.md` of BrainStem and Duck; README excerpts
on licensing; README extension mentions for 20 key models; summaries via metadata.

### 10 Remaining gaps and uncertainties
- Model binaries absent: vertex/bone/morph counts and which variants (glTF-Binary, Draco, meshopt) exist were not
  verified. FlightHelmet README mentions transmission/basisu but variant contents unverified.

---

## yumina-image-references

### 1 Purpose and relevant functionality
- [V] Visual reference library "currently centered on STGAAB visual development" (README.md). Only `.md` files are
  checked out; 145 tracked paths, image binaries not downloaded.
- [V] Folders (README.md, REFERENCE_INDEX.md, folder READMEs):
  - `01_2D_Pixel_Art/` - sprite scale, directional frames, modular character art, item readability, terrain tiles,
    prop-state sheets, animation structure. Animation 1 (mp4), Characters 2, Terrain_Props 3, Weapons_Items 4.
  - `02_2_5D_Scene_References/` - elevated top-down scenes: composition, depth, lighting, occlusion, density, combat
    readability. Combat_VFX 2, Dungeons 2, Settlements 2, Wilderness_Biomes 3.
  - `03_3D_Concept_References/` - "design language for races, monsters, weapons, buildings, and props. Translate
    these concepts into original game-scale art; do not simply shrink or pixel-filter them."
    Animals_Fauna 11, Architecture_Buildings 17, Environment_Props 15, Monsters_Enemies 29, Races_Humanoids 35,
    Weapons_Armor 11.
  - `99_Incoming_Unsorted/` - staging (README only).
- [V] Character-relevant file names: `Races_Humanoids/` aasimar, angel, avian, beastkin, celestial, centaur,
  demonkin, devilkin, dhampir, dragonborn, dryad, dwarf, elemental_blooded, elf, fairy, fallen, gnome, half_elf,
  half_orc, halfling, human, insectoid, kemonomimi, lamia, lizardman, merfolk, orc, pixie, plantfolk, race_lamia,
  reptilian, satyr, spiritfolk, tiefling, voidborn (`.webp`). `Weapons_Armor/` arcgun, armor_medium, crossbow, dagger,
  flask_belt, greatsword, knuckles, mace, rod, spear, staff. `Monsters_Enemies/` includes bandit, cultist, lich,
  wight, zombie, troll, minotaur, kobold, imp, demon (humanoid enemies). 2D: `directional_humanoid_sheet_01.jpeg`,
  `modular_body_clothing_sheet_01.jpeg`, `character_animation_reference_01.mp4`.

### 2 Exact source files worth studying
- `README.md` - purpose + rights statement. `REFERENCE_INDEX.md` - counts per folder.
- `docs/UPLOAD_REFERENCES.md` - provenance/import workflow and "Rights note".
- `03_3D_Concept_References/README.md` - translation rule. `.github/workflows/import-reference-bundle.yml` - import job.

### 3 Techniques applicable to Eldoria
- [I] Art direction only: silhouette and proportion targets per race (elf ears/face length, dwarf mass, half-orc jaw
  and tusks, tiefling horns/tail, dragonborn/lizardman head) -> translate into MakeHuman target recipes and new
  horn/tail meshes; `armor_medium`, weapon sheets -> outfit layer and socket proportions; `modular_body_clothing_sheet`
  -> layering scheme (skin / underlayer / armour) that matches Eldoria's outfit_* variants.

### 4 Dependency and Three.js compatibility
- [V] None; images are not code.

### 5 Yumina sandbox compatibility
- [V] Must not be embedded in the world JSON (rights statement). Nothing to run.

### 6 iPhone/mobile performance
- Not applicable.

### 7 License obligations (precise)
- [V] README: "These are reference materials. Do not assume redistribution or production-use rights for third-party
  images. Do not trace/copy them into shipping game assets; use them to extract general visual principles and create
  original production art." `docs/UPLOAD_REFERENCES.md`: "Reference status does not imply production-use rights."
- [V] No per-image source, author or licence is recorded anywhere in the repo. The only commit is
  `0c23a01 github-actions[bot] 2026-10-05 "Import organized Yumina visual references"`, imported from a release ZIP
  (`Yumina-Image-References-Organized.zip`, tag `reference-import-v1`) via the workflow.
- [I] Several names (e.g. `academy`, `cityhall`, numbered sheets) look like generated or collected concept art of
  unknown origin; treat all as unlicensed.

### 8 Recommended implementation approach
- Use for a written per-race "look sheet" (proportions, palette, signature features) feeding target recipes and
  procedural props; never sample pixels, trace, or use as textures/LUTs. Record in Eldoria docs that these images
  informed direction only.

### 9 What was actually inspected
README.md, REFERENCE_INDEX.md, all four folder READMEs, docs/UPLOAD_REFERENCES.md, the workflow file (head),
`git ls-tree -r --name-only HEAD` (full listing), `git log`.

### 10 Remaining gaps and uncertainties
- Images not viewed; quality, style consistency and provenance unknown. No licence metadata exists to resolve.

---

## Character pipeline integration candidates

Ranked by benefit/effort with licence risk. Effort: S < 1 day, M 1-3 days, L > 3 days (estimates [I]).

| # | Candidate | Source | Effort | Benefit | Licence risk |
|---|---|---|---|---|---|
| 1 | Composite face-variety morphs (6-8 recipes from nose/mouth/eyes/chin/cheek/head/asym targets, seeded per NPC) | makehuman targets | M | Very high: fixes "one base face" | None (CC0 [V]) |
| 2 | Eye fix: emissive lift, envMap boost, exclude eyes from cavity AO; optional high-poly eye for hero | makehuman `brown.mhmat` insight, high-poly eye proxy | S | High: dark-eye complaint | None (CC0) |
| 3 | `face_aged` + ethnicity delta morphs (macrodetails old/asian/african) with matching expression units | makehuman macrodetails, expression/units/* | S-M | High: elders, ethnic variety | None (CC0) |
| 4 | Species face recipes (elf, dwarf, orc-blooded brow/jaw) + horn/tail meshes on head/hips sockets | makehuman ears/forehead/chin targets; image refs for direction | M | High for fantasy read | Low (CC0 targets; images direction-only) |
| 5 | Author sheen/coat/emission/alpha-clip in Blender materials, simplify `dressMaterials` | glTF-Blender-IO material export | S | Medium: consistent shading, MASK hair | None (tool only) |
| 6 | Eyelash cards from `helper-*-eyelashes-*` strips | hm08 base mesh | S | Medium at dialogue distance | None (CC0) |
| 7 | Wrap-lighting skin patch (onBeforeCompile, R>G>B scatter tint) | MakeHuman SSS scale idea; r149 | M | Medium-high on skin realism | None (own code; do not copy AGPL GLSL) |
| 8 | Hair cards weighted to head+neck(+chest) instead of rigid | Eldoria hair.py + weights | S-M | Medium | None |
| 9 | Export option audit: `export_shared_accessors`, `export_frame_step`, `export_def_bones` when helper bones appear | glTF-Blender-IO | S | Low-medium (size) | None |
| 10 | Loader regression harness with CC0/CC-BY sample GLBs | glTF-Sample-Assets | S | Medium (safety) | Low; test-only, keep out of world JSON |
| 11 | Per-vertex `delete_verts` in `mh.proxy_fit` | makehuman proxy format | M | Low-medium | None (reimplement from format; do not copy AGPL code) |
| 12 | Mocap/IK foot placement | not provided by these repos (MakeHuman BVHs are AGPL and tiny) | L | High | Must source elsewhere (e.g. CC0 mocap); do not use bundled BVHs |

Do not use: MakeHuman GLSL shaders and Python code (AGPL-3.0), `data/animations/*` BVH (labelled AGPL3),
glTF samples with NC/EULA/proprietary licences, any yumina-image-references pixels.


---

# Architecture and RPG systems

# E — Architecture audit of reference repositories for Eldoria 3D

Audit date 2026-10-20. Read-only. Nothing in any repository was modified, built, committed or pushed.
STGAAB rootComponent sources were extracted (with `python3 -I`) into the scratchpad only so they could be read.

Notation: **[V]** = verified by reading the file or running a read-only command; **[I]** = my inference or recommendation.

Eldoria baseline these recommendations must not change [V]:
- `src/rules.tsx`: 3d6 resolution, `xpForLevel = 50·L·(L−1)`, `skillNeed`, bounded `skillBonus`. Dice use `Math.random`.
- `src/game.tsx`:
  - `adoptState` reads Yumina variables.
  - `setVars` tells GM writes apart from the client's own echoes (`lastSynced`, `echo`, `pendingAt`).
  - `write` marks a variable dirty, `flush` sends it with `api.patchVariables`, and `setVariable` is the fallback.
  - `write3d` stores `world3d-state = {v:1, fog, slain, battle: C.serialize(g)}`.
- `lore/3d-client-contract.json`: the GM must never re-apply what the client already wrote.
- `src/three.tsx` injects three@0.149.0 UMD from jsdelivr, with unpkg as the fallback.

---

## /home/user/ugdl (main faf167a3)

### 1 Purpose and relevant functionality
- [V] "Universal Game Development Library" v0.26.0 (`AGENTS.md`, `README.md`, `PROJECT_STATE.json`). It is a knowledge and specification library, not a game engine.
  - Layer 1 (Knowledge/Design) and Layer 2 (Implementation Specification) are active.
  - Layer 3 (Reusable Implementation) is **DORMANT**.
- [V] Parts relevant to Eldoria:
  - a capability registry of 58 capabilities;
  - 82 engine "pattern" records from Godot, Phaser, libGDX, Defold, Bevy, Cocos and OpenMW, all classified SOURCE-DOCUMENTED and backed by official docs;
  - an evidence-bounded **Yumina target-runtime profile**, with gap reports and runtime-fit dry runs.
- [V] `records/content` and `records/mechanics` hold about 708 records, mostly STGAAB canon. They are not relevant to Eldoria content.

### 2 Exact source files worth studying
- `AGENTS.md`: the operating contract. Its restrictions are listed in the last section.
- `target_runtimes/yumina.runtime.json`: 20 Yumina capability claims, each with an evidence status.
  - Relevant claims: `yumina.rendering.webgl_threejs`, `yumina.state.variable_bridge`, `yumina.persistence.platform_storage`, `yumina.assets.bridge_fetch`, `yumina.ai.direct_completion_optional`, `yumina.input.mobile_twin_stick_action` and `yumina.architecture.ui_authoritative_gameplay`.
  - It also lists constraints (sandbox networking, storage limits, mobile performance) and unknowns.
- `reports/yumina_runtime_gap_report_v0.24.json`: the highest-priority unknowns are asset size/count limits, the iPhone performance envelope, and variable size/rate limits.
- `reports/runtime_fit_dryrun_hybrid_3d_ai_dialogue_v0.24.json`: fit-checks the "3D + bounded AI dialogue + saves" model, with verdict PASS. That model matches Eldoria's.
- `engine/capabilities/capability_registry.json`: capability names such as `persistence.version_migration`, `ai.package_stack`, `ai.agent_scheduling`, `world.streaming_preload` and `ui.resolution_adaptation`.
- Pattern records in `engine/implementations/`:
  - `godot.pattern.versioned_upgrade_compatibility.json`: treat data upgrades as explicit migrations.
  - `godot.pattern.persistent_object_save.json` and `openmw.pattern.per_object_save_state.json`: decide explicitly which objects are persisted, plus reset/restore semantics.
  - `openmw.pattern.ai_package_stack.json` and `openmw.pattern.timed_repeat_actor_routines.json`: a stack of NPC behaviour packages (Wander/Travel/Escort/Combat) with duration and repeat.
  - `openmw.pattern.rpg_mechanic_interfaces.json`: overridable combat, skill-progression and spellcasting interfaces.
  - `libgdx.pattern.game_state_serialization.json`: keep runtime resources out of saves.
  - `defold.pattern.bounded_table_save.json`: size limits as a save-design input.
  - `phaser.pattern.data_manager_json_state.json`.
- `ARCHITECTURE_GUARDRAILS.md`: "normalize capabilities, not paradigms", and the escape ladder data → parameterized rules → state graph → script → custom.
- `IMPLEMENTATION_LAYER_PROTOCOL.md`: the three-layer model and the Layer 3 activation gate.
- `AI_PROJECT_INSTRUCTIONS.md` §"Code reuse and licenses".

### 3 Techniques applicable to Eldoria
- [V→I] **Authoritative state.** The runtime profile's `ui_authoritative_gameplay` and AI-optional execution models are what Eldoria already does: the client resolves movement and combat, and the GM narrates.
- [V→I] **Save compatibility.** The Godot migration pattern argues for an explicit `v` field plus migration functions. Eldoria already writes `world3d-state.v = 1`. The pattern says to keep that field and add a migrator table when the shape changes.
- [V→I] **Persistent object identity.** OpenMW/Godot per-object save state maps onto Eldoria's `slain` map and the battle snapshot. Persist only what has diverged from what can be generated, which Eldoria already does with fog run-length encoding and pruned `slain` entries.
- [V→I] **NPC autonomy.** OpenMW package stacks with duration and repeat are a cheap deterministic model for ambient NPCs. It could replace the random goal wandering in `game.tsx` `updateNPCs` without involving the GM.
- [V] **Data-driven escape ladder.** This fits Eldoria's bestiary-driven `ai.tsx`, which reads the tactics text from data.

### 4 Dependency and Three.js compatibility
- [V] There is no runtime code and no three.js dependency. It is a Python 3.12 tooling and JSON library.
- [V] Yumina 3D evidence in the profile cites projects that "bundled Three.js". No three.js version is pinned.

### 5 Yumina sandbox compatibility
- [V] The profile marks sandbox networking as `partially_observed` and storage/variable limits as `unknown`.
- [V] Separately verified at yumina-oss-reference HEAD d1789a86 (v0.0.73.0), `packages/server/src/index.ts` SANDBOX_CSP:
  - `default-src https: 'unsafe-inline' 'unsafe-eval'` allows https `<script>` injection, which is how Eldoria loads three.js from the CDN;
  - `connect-src 'none'` blocks fetch, XHR and WebSocket.

### 6 iPhone/mobile considerations
- [V] UGDL lists "sustained mobile 2D/3D performance envelope" as a high-priority unknown, to be tested on real iPhones.
- [V] `yumina.input.mobile_twin_stick_action` is only "user_reported…code_evidenced".

### 7 License obligations
- [V] There is no LICENSE file at the root. The repository is private and owned by the user, according to the task.
- [V] `AI_PROJECT_INSTRUCTIONS.md` says to verify the license of the exact file and version before copying code, and that "private use" does not remove license obligations.
- [V] The runtime profile's `codeReusePolicy` says "runtimeEvidenceDoesNotGrantReuseRights". Blockfall is GPL-2.0-or-later. The licenses of the other evidence sources are not established.

### 8 Recommended approach for Eldoria
- [I] Use UGDL as a **read-only checklist**:
  1. Map Eldoria's systems to the capability IDs.
  2. Cite the pattern records in design notes.
  3. Run Eldoria's own iPhone and variable-size tests to answer the profile's unknowns.
- [I] Never write to UGDL from Eldoria work. Reusable lessons go through a Foundry `ugdl_handoffs/` entry, if the Foundry is used at all.

### 9 What was actually inspected
- AGENTS.md, README.md, ARCHITECTURE_GUARDRAILS.md, IMPLEMENTATION_LAYER_PROTOCOL.md.
- docs/RESEARCH_INTELLIGENCE_ARCHITECTURE.md (the first 60 lines).
- PROJECT_STATE.json (head), target_runtimes/README.md and yumina.runtime.json in full via a parser.
- capability_registry.json (all capability names), and the description fields of 9 implementation records.
- Two reports, the domain map head, and directory listings.
- `tools/validate_all.py` was not run (doing so would be "work" on the repository, and it is not needed for this audit).

### 10 Remaining gaps and uncertainties
- [V] The pattern records cite external docs and contain no code, so `sourceFiles` is empty.
- [I] The profile's Yumina evidence dates from v0.24 (2026-10-03). It predates Yumina 0.0.73.0.
- Not read: ROADMAP.md, the CHANGELOG, KNOWLEDGE_SATURATION_AND_TRANSITION_GATES.md and the full v0.27 plan.

---

## /home/user/yumina-game-foundry (main dda6c6ce)

### 1 Purpose and relevant functionality
- [V] The Foundry is a writable multi-game workspace for isolated Yumina games. It currently has no games: `GAME_REGISTRY.json` shows `games: []`.
- [V] It provides:
  - a creator interview → Design Lock workflow;
  - a per-game template;
  - an **export compiler and validator** for Yumina `WorldDefinition`;
  - state and asset storage guidance;
  - two long reference guides: the Visual Game Implementation Guide v1.1 and the AI Gameplay & Engine State Architecture Guide v1.0.

### 2 Exact source files worth studying
- `AGENTS.md`: isolation, engineering rules, the export gate, and storage rules.
- `docs/YUMINA_STATE_AND_ASSET_STORAGE.md`, checked against yumina-oss a24c1292 (v0.0.66.0):
  - prompt sanitisation replaces one string field above 20,000 chars and one rendered variable above 50,000 chars, and strips base64 data URIs;
  - `aiAccess` is write/read/none;
  - `api.sessionStorage` allows 32 KiB per value, 256 KiB per session and 128 keys, with `expectedVersion`;
  - `api.storage` is device-local.
- `yumina/CURRENT_RUNTIME_PROFILE.json`: the 10 MiB world-save ceiling, the 9 MiB Foundry target, world schema 21.0.0, and the authority files.
- `yumina/EXPORT_CONTRACT.json`: 11 release gates. `yumina/EXPORT_MAPPING.md` maps design data to WorldDefinition and lists what must not be exported.
- `tools/yumina/validate-export.ts`, which:
  1. copies `schema.ts` and `world-validator.ts` from the mounted yumina-oss into a cache;
  2. runs `worldDefinitionSchema.safeParse` and `validateWorld`;
  3. checks rootComponent entry existence, size and identity placeholders;
  4. writes a SHA-256 receipt.

  It fails closed on a stale profile commit. `tools/yumina/build-world.ts` is the assembler.
- `docs/reference/Yumina_AI_Gameplay_Engine_State_Architecture_Guide_v1.0.json`, sections 1–26:
  - authority matrix (AI, engine, renderer, persistence);
  - NPC intelligence tiers 0–3;
  - structured-intent contract with `decisionId` and `basedOn{worldTick, actorRevision}`;
  - stale-decision rejection (§16) and failure fallback (§17);
  - off-screen simulation LOD (§15);
  - state mapping (§19) and 3D renderer integration (§20).
- `docs/reference/Yumina_Universal_Visual_Game_Implementation_Guide_v1.1.json`, `document_markdown`:
  - §6 state tiers A–D;
  - §17 persistent entity state;
  - §18 scene streaming over `api.fetchAsset`;
  - §19 a canonical `SaveGame` with `schemaVersion`;
  - §20 one bounded AI gateway;
  - §24 mobile defaults;
  - §26 a file architecture that includes `state/migrations.ts`.
- `templates/new-game/GAME_MANIFEST.template.json`: the isolation fields.
- `docs/VISUAL_ASSET_ARCHITECTURE.md`: separates reference art, shared art and game art.

### 3 Techniques applicable to Eldoria
- [V→I] **Yumina export validation.** This is the single most transferable tool.
  - Run Eldoria's `dist/eldoria-3d.json` through an equivalent of `validate-export.ts`: the authoritative Zod schema and semantic validator from the mounted yumina-oss, plus the size check and a receipt.
  - The Foundry validator itself would currently **fail closed**. Its profile commit a24c1292 (0.0.66.0) is not yumina-oss-reference HEAD d1789a86 (0.0.73.0). I verified that a24c1292 exists in this history.
  - Eldoria's export declares `version: "22.0.0-3d"`, but the Foundry targets schema 21.0.0, so that gate needs a refreshed profile too.
- [V] **Size gate finding** (measured):
  - `dist/eldoria-3d.json` is 10,917,504 bytes (10.41 MiB). That exceeds `MAX_WORLD_SAVE_BODY_BYTES` = 10 MiB (`packages/shared/src/constants/limits.ts:102`).
  - About 4.98 MiB of it is `rootComponent.compiled`. Yumina's `packages/app/src/lib/world-save-payload.ts:62-79` strips that disposable cache to fit, so the actual save body is around 5.4 MiB [I].
  - `src/builtin-models.tsx` is 3.82 MB of embedded GLB. Both Foundry guides recommend Yumina Assets with `api.fetchAsset` over embedded blobs.
- [V→I] **Persistent state design.** Eldoria already follows these Foundry rules: `aiAccess:"none"` ledgers (`world3d-state`, `player-avatar`, `world3d-models`), compact AI-visible facts, no per-frame writes, and stable `@asset:` refs for models.
  - What the Foundry adds: (a) keep a migration module beside the `v` field; (b) bounded histories; (c) consider `api.sessionStorage` (versioned, `expectedVersion`) for detailed engine-only records that the GM never needs. Mind the 32 KiB per-value limit, because the battle snapshot can grow.
- [V→I] **AI boundary.** Guide §16 says to tag each GM/AI request with a decision ID and world revision, and to reject stale results.
  - Eldoria's echo/`pendingAt` logic in `setVars` is a timing-based approximation of this.
  - Adding a revision counter (for example a monotonically increasing `world3d-state.rev`) would make "GM write vs client echo" exact instead of time-windowed. That is optional and does not change the state model.
- [V] **Project isolation.** Use it if Eldoria ever moves into the Foundry: `games/eldoria-3d/`, a `transfers/` record for any idea borrowed from another game, and no shared runtime code.
- [V] **Asset organisation.** Generated or third-party art needs provenance metadata before integration. Reference images are not production-licensed. Eldoria's README already says the concept images do not ship.

### 4 Dependency and Three.js compatibility
- [V] devDependencies are `tsx@4.20.6` and `zod@3.24.4`. There is no three.js.
- [V] Guide §20 says "There is no normal npm/CDN runtime import inside a published card; required library code must be bundled into the card."
  - Eldoria loads three@0.149.0 from a CDN `<script>`. The current CSP (`default-src https:`) permits this [V], so the guide's statement is about module imports.
  - [I] Bundling three.js would still remove a runtime dependency on jsdelivr and unpkg being reachable on mobile networks.

### 5 Yumina sandbox compatibility
- [V] Authority paths: `packages/engine/src/world/schema.ts#worldDefinitionSchema` and `validation/world-validator.ts#validateWorld`. The validator also copies `component-schemas.ts`, `ui-blueprint-schema.ts` and `spatial/schemas.ts`.
- [V] `api.patchVariables` exists at HEAD (`packages/app/sandbox/sandbox-context.tsx:173, 1321`, 20 s timeout). Eldoria uses it.

### 6 iPhone/mobile considerations
- [V] Guide §24 mobile defaults: capped DPR, limited shadows, pooling, atlases, LOD, culling and adaptive quality tiers. Eldoria already implements most of them (README "Mobile performance").
- [V] Guide §19 says device-local `api.storage` is not a canonical save.

### 7 License obligations
- [V] There is no LICENSE file. `package.json` has `"private": true`. The repository is owned by the user.
- [V] Restrictions come from AGENTS.md, summarised below. PixelLab use requires the `Pixellab_Token` secret, must never be printed, and charged generations need creator authorisation.

### 8 Recommended approach for Eldoria
- [I] **Do not move Eldoria into the Foundry** as part of this work. Copy the *validation method* instead:
  1. Write an Eldoria-local `tools/validate-world.mjs` that imports the current yumina-oss `worldDefinitionSchema` and `validateWorld`.
  2. Check the compiled-stripped size against 10 MiB and record a receipt with the export SHA-256 and the Yumina commit.
  3. Add a per-file size budget, starting with `builtin-models.tsx`.
- [I] Optionally move the built-in GLB to a Yumina Asset (`@asset:`) and load it with `api.fetchAsset`, keeping the embedded one as the fallback. Eldoria's `world3d-models` manifest already supports this.

### 9 What was actually inspected
- AGENTS.md, README.md, PROJECT_INSTRUCTIONS.md and docs/FOUNDRY_ARCHITECTURE.md (head).
- docs/YUMINA_STATE_AND_ASSET_STORAGE.md (full), CURRENT_RUNTIME_PROFILE.json, EXPORT_CONTRACT.json, EXPORT_MAPPING.md (head), validate-export.ts (full) and package.json.
- From the AI guide: the section list and §§15, 16, 19 and 20.
- From the visual guide: the heading list and §§6, 17, 18, 19 and 24.
- The manifest template.
- Cross-checks in yumina-oss-reference: the CSP, `limits.ts`, `world-save-payload.ts` and `patchVariables`.

### 10 Remaining gaps and uncertainties
- Not read: `build-world.ts`, `CREATOR_WORKFLOW.md`, `VISUAL_ASSET_ARCHITECTURE.md`, `PIXELLAB_INTEGRATION.md` and the remaining guide sections (combat authority §14, UI §21).
- [I] I have not verified whether Yumina's **import** path (as opposed to save) applies the same 10 MiB body limit before stripping `compiled`.
- [I] The sessionStorage limits are from 0.0.66.0. Re-check them at 0.0.73.0.

---

## /home/user/stgaab-visual-rpg (main d943745a)

> Generic architecture only. No STGAAB lore, characters or mechanics are proposed for transfer.

### 1 Purpose and relevant functionality
- [V] This is the development repository for a private visual RPG on Yumina. The "authoritative gameplay baseline" is the single file `game/Labyrinth_Survival_Living_World_RPG_11_35_0.json` (3.6 MB): a 67-file rootComponent and 128 variables.
- [V] The README "Architecture Law": Engine = authority, Renderer = presentation, UI = player controls, AI = optional reasoning.
- [V] The rest of the repository is a 924-line roadmap and a PixelLab tool. There is no AGENTS.md; I checked with `find`.

### 2 Exact source files worth studying (paths inside `rootComponent.files`)
- `engine.js`: "THE authority". A pure `dispatch(state, action) → {state, events, tu?}` with no DOM, React, network or AI. Every mutation goes through it.
- `state.js`:
  - an authoritative state shape and `SAVE_VERSION = 17`, with a per-version changelog comment for v1 to v17;
  - `serialize()`;
  - `restore(raw)`, which sanitises every subsystem, starts the id allocator past every saved uid, backfills content added in later versions by version threshold, and returns `{state, restored, migratedFrom}`.
- `save.js`:
  - debounced saver to one `aiAccess:none` variable: 700 ms debounce, but a forced flush every ≥4 s while time ticks;
  - three slots in a second variable, with a local `slotMirror` because the host may not reflect writes immediately;
  - portable "save code" export and import (`LS1.` + base64 JSON) that runs through the same `restore()`.
- `rng.js`: seeded mulberry-style PRNG whose seed lives in the save, so "a fight replays the same way from the same state".
- `ai-bridge.js`: "the ONLY door between the game and the AI". It counts `completions` and `gmMessages` so the HUD can show that walking costs 0 AI calls.
- `actions.js`: a single verb set for all actors. The body decides what is *possible* (`capsOf`) and the "brain" decides what is *wanted*. This is a data-driven capability gate.
- `input.js` and `controls.tsx`:
  - keyboard and touch feed one "held direction" channel;
  - `FloatStick` is a floating thumb-stick with a 9 px drag threshold and tap-vs-drag below 280 ms;
  - `ActionPad` is the right-thumb cluster;
  - pointerId capture.
- `index.tsx:951-956`: flushes the save on `visibilitychange` and `pagehide`. `index.tsx:1102-1114` handles DPR-capped resize and `orientationchange`.
- `renderer.js:54-61`: `dpr = min(2, …)`. `ui.tsx:344-357`: landscape header with `env(safe-area-inset-*)`. `manifest.js:24` describes the auto frame rate (60 while moving, 30 when idle) and per-map rosters.

### 3 Techniques applicable to Eldoria (generic)
- [V→I] **Pure reducer + event list.** Eldoria's combat mutates `g.battle` in place through generator scripts.
  - A pure reducer is a direction for *new* subsystems, not a rewrite.
  - Highest value: make `C.serialize`/`C.restore` and future quest and inventory transitions pure functions with unit tests (Eldoria already has `tools/unit.mjs`).
- [V→I] **Sanitise-on-restore migration.** `world3d-state.v` exists today. On a bump to 2:
  - add a `restore3d(raw)` that sanitises fog, slain and battle;
  - drop battle snapshots it cannot read instead of crashing;
  - return `migratedFrom`, as STGAAB's `restore()` does.
- [V→I] **Save robustness.**
  1. Flush on `visibilitychange`/`pagehide`. Eldoria has no such listener in `src/` (verified by grep). This is a cheap iOS win, because Safari kills background tabs.
  2. A "max interval" flush while the clock runs.
  3. Optional export/import save codes. Eldoria's state lives in shared Yumina variables, so this would only cover `world3d-state` [I].
- [V→I] **AI gateway counters.** Wrap Eldoria's GM-bound calls (`sendMessage` and the report block) in one module that counts calls. That makes "ordinary play costs 0 GM calls" testable.
- [V→I] **Seeded RNG in the save.** Eldoria rolls with `Math.random`.
  - Swapping the random source to a seeded PRNG stored in `world3d-state.battle` leaves the 3d6 *rules* and distribution unchanged.
  - It makes a restored encounter replay identically and makes tests deterministic. It is optional.
- [V] **Mobile HUD.** Floating stick, touch-down action buttons, safe-area insets, landscape single-row bars, adaptive frame rate. Eldoria already has equivalents. Compare it against STGAAB's tap-vs-drag thresholds and idle 30 fps mode.

### 4 Dependency and Three.js compatibility
- [V] The renderer is 2D canvas (`renderer.js`). It has no three.js. The README's renderer investigation order puts PixiJS first and three.js only "where genuine 2.5D/3D geometry justifies it".

### 5 Yumina sandbox compatibility
- [V] It uses `api.variables`, `api.setVariable`, `api.ai.complete` and `api.sendMessage` behind the bridge. The save variable is `aiAccess: none`.
- [I] It does not use `patchVariables`. Eldoria's batched patch is the more current API.

### 6 iPhone/mobile considerations
- [V] Covered in item 2: safe areas, no long-press menus or rubber-band scrolling (`overscrollBehavior:"none"`, `index.tsx:1850`), DPR ≤ 2, an auto 60/30 fps mode, and per-map rosters for crowd performance.

### 7 License obligations
- [V] There is no LICENSE file. The repository is private and owned by the user.
- [V] STGAAB is fan work on a third-party IP ("Surviving the Game as a Barbarian / Dungeon & Stone"). Its content must not enter Eldoria.
- [V] The generic code patterns are the user's own. [I] Re-implement them from scratch rather than copying.

### 8 Recommended approach for Eldoria
- [I] Adopt the patterns in this order: lifecycle flush → restore/migrate module for `world3d-state` → AI-gateway counter → (optional) seeded combat RNG.
- [I] Copy no files. Eldoria's GM-shared variable model stays authoritative.

### 9 What was actually inspected
- README.md, the repository tree, the roadmap headings and `.codex/config.toml`.
- In full: rng.js, save.js, ai-bridge.js and actions.js (head).
- Parts: state.js (lines 1–40 and `restore`), engine.js (lines 1–40 and dispatch returns), input.js (head), controls.tsx (head), and grep hits for mobile and lifecycle code.

### 10 Remaining gaps and uncertainties
- I did not read renderer.js, ui.tsx or tactics.js in full. I did not run the game or its tests.
- [V] The repository has no AGENTS.md, so the only "agent rules" are the README's Development Rules.

---

## /workspace/eldoria-references/RPGAtlas (main 632d0b9d)

### 1 Purpose and relevant functionality
- [V] RPGAtlas 2.1.0 is a GPL-3.0 "RPG making engine in the spirit of classic 2D RPG makers" with an **HD-2D three.js renderer**: tilted perspective, dynamic lights and shadows, day/night, weather and post-processing.
- [V] It also has:
  - procedural assets and generators;
  - an RPG Maker MV/MZ importer;
  - a Tauri desktop wrapper;
  - opt-in online multiplayer through the "Beacon" server;
  - quests, CTB battles, an event interpreter and a node-graph event editor.

### 2 Exact source files worth studying
- `src/renderer/three-renderer.ts` (2,161 lines): HD-2D on three.
  - Raw shaders and `ColorManagement` disabled.
  - Up to 16 lights; point-light shadows packed into one 2D atlas (MAX_PLS 4).
  - Cliff ambient occlusion through vertex tint; chunked prerenders ≤ 4096 px.
- `src/shared/formula.ts`: a **sandboxed damage-formula evaluator**. It parses into a whitelisted AST, never `eval`.
  - It supports `2d6` and `4d6kh3` dice and an injected `randomInt`.
  - It enforces 512-char and 32-nesting guards.
- `src/shared/rng.ts`: a single seedable mulberry32 used for both gameplay and procedural generation.
- `src/engine/scenes/battle-logic.ts`: pure battle logic (rows, condition-weighted enemy action choice, CTB scheduler). RNG is injected and the module is tested under node.
- `js/quests.js` (440 lines): a data-defined quest runtime. A quest has a status lifecycle (inactive, unlocked, started, completed, failed), per-objective counters, and idempotent reward flags (`rewardsApplied`, `failEffectsApplied`).
- `src/shared/event-graph.ts`: a deterministic graph ↔ command-list compiler with a round-trip identity, cycle rejection and a size guard.
- `src/engine/state/save.ts`: slots plus an autosave slot 0. Autosave is silent ("must never interrupt play"), and `applySave` sanitises equipment against the current database.
- `src/shared/folder-migration.ts`: a pure, idempotent, "self-extinguishing" migration decision.
- `src/shared/sim/world.ts`: `createWorld()` isolates simulation state and its RNG stream from presentation.
- `src/engine/ui-stack.ts`, `src/engine/input.ts`, `js/runtime/input.js`: a UI layer stack and device-slot input abstraction.
- `wiki/Migration-Guide.md`, `wiki/Battles-and-States.md`, `wiki/Generators.md`.

### 3 Techniques applicable to Eldoria
- [V→I] **Quest state shape.** Eldoria's quests are GM-owned variables. A client-side read model in this shape (status, per-objective counts, idempotent `rewardsApplied`) would let the client *display* and *validate* quest progress without the client becoming the authority.
  - The idempotency flags are the same idea as Eldoria's "never re-apply" GM contract.
- [V→I] **Pure, injected-RNG battle logic** as a test harness pattern for `ai.tsx`/`cbase.tsx` decisions.
- [V→I] **Sanitise-against-current-database on load.** When data tables change, drop or repair unknown item and spell IDs on restore. This applies to a restored `battle` snapshot that references spells or items.
- [I] **Lighting reference.** The multi-light shadow atlas and vertex-tint AO are ideas only. Eldoria's `REALM_LIGHT` already covers per-realm mood.
- [V] **Formula sandbox.** Relevant only if GM- or data-authored formulas were ever evaluated client-side. Eldoria's rules are hand-coded, so this is low priority.

### 4 Dependency and Three.js compatibility
- [V] `package.json`: `three ^0.185.1`, `@types/three ^0.185.0`, Vite 6, TypeScript 5.9.
- [I] **r185 is not compatible with r149.** Color management defaults changed in r152 (`outputEncoding` → `outputColorSpace`) and later releases moved APIs to ES modules only. Treat the renderer as a reading reference only. Any idea must be re-written against r149 and WebGL1-safe GLSL.

### 5 Yumina sandbox compatibility
- [V] It relies on localStorage, IndexedDB, the Tauri filesystem and WebSockets (`src/platform/*`, `src/engine/net/*`).
- [V] Yumina's sandbox has `connect-src 'none'`, so the networking is not usable. [I] The storage drivers do not map to Yumina either.

### 6 iPhone/mobile considerations
- [V] `src/shared/a11y.ts` and `src/engine/perf-hud.ts` exist, and the chunked textures respect a 4096 px GPU limit. I did not find a phone-specific HUD in my sampling.

### 7 License obligations
- [V] `LICENSE` is GPL v3 (674 lines). `package.json` says `GPL-3.0-or-later`, and file headers say "Copyright (C) 2026 RPGAtlas contributors — GPL-3.0-or-later".
- [I] **Copying any code would make the Eldoria rootComponent a GPL derivative**, with source-disclosure and license-propagation obligations. Restrict use to clean-room ideas.
- [V] AGENTS.md only requires a `js/patch-notes.js` entry for contributions to RPGAtlas itself. That does not apply here because nothing was modified.

### 8 Recommended approach for Eldoria
- [I] Ideas only: the quest-state shape with idempotent reward flags, the injected-RNG pure-logic testing, and sanitise-on-load. No code.

### 9 What was actually inspected
- AGENTS.md, README.md (head), package.json, LICENSE (head and length) and the src/js/wiki trees.
- Headers of three-renderer.ts, save.ts (lines 1–80), folder-migration.ts, event-graph.ts, formula.ts, battle-logic.ts, rng.ts, game-state.ts and sim/world.ts.
- quests.js (lines 1–40). A grep of schema.ts for migrations.

### 10 Remaining gaps and uncertainties
- Not read: the procedural generators (`src/editor/tools/generator-hub.ts`), weather and day/night code, the map runtime, or `docs/` and `docs-site`.
- [I] I have not established whether day/night and weather are shader-driven or uniform-driven.

---

## /workspace/eldoria-references/RPG-JS (v5, 2560a72f)

### 1 Purpose and relevant functionality
- [V] RPGJS v5 (`5.0.0-beta.7` root; packages at 5.0.x) is a TypeScript framework for standalone RPGs and MMORPGs. CONTRIBUTING says: "Gameplay state belongs on the server when multiplayer correctness matters; the client should render, predict, and react."
- [V] Packages: account, action-battle, chat, client, common, physic, render-map2d, server, studio, testing, tiledmap, ui-css, vite and vue.
- [V] Rendering is 2D through CanvasEngine/Pixi (`client` depends on `pixi-filters`). Sync uses `@signe/sync`, `@signe/room` and `@signe/reactive` signals with `@sync()`/`persist`.

### 2 Exact source files worth studying
- `packages/server/src/Player/ParameterManager.ts`:
  - the parameter curve (`start`→`end` interpolated across `initialLevel..finalLevel`, line 518), with rate/value modifiers from states and equipment;
  - the exp curve `_expForLevel` (line 962): `basis·(L−1)^(0.9+accA/250)·L·(L+1)/(6+L²/50/accB)+(L−1)·extra`, with defaults basis 30, extra 20, accA 30.
- `packages/server/src/Player/BattleManager.ts`: `applyDamage` with **pluggable formula functions** (`damagePhysic`, `damageSkill`, `damageCritical`, `damageGuard`, `coefficientElements`) and a `DamageResult` record (`critical`, `guard`, `elementVulnerable`).
- `packages/server/src/Player/ItemManager.ts` (943 lines), `SkillManager.ts` (674), `StateManager.ts` (statuses with `addStates`/`removeStates` rates), `EffectManager.ts`, `ElementManager.ts`, `ClassManager.ts`, `HotbarManager.ts` and `GoldManager.ts`: a mixin-per-capability player model.
- `packages/common/src/database/Item.ts` and `Skill.ts`: data classes with `@sync()` fields.
- `packages/server/src/services/save.ts`: the `SaveStorageStrategy` interface (`list`, `get`, `save`, `delete`) plus an `AutoSaveStrategy` (`canSave`, `canLoad`, `shouldAutoSave`, `getDefaultSlot`). Slot listings strip the snapshot and return meta only.
- `packages/server/src/Player/snapshot.ts`: **snapshot field aliases**. Signal field and public field are mapped both ways so old and new snapshots load. It also normalises legacy shapes (`{w,h}` vs `{width,height}`).
- `packages/server/src/decorators/event.ts`: `EventMode.Shared` vs `Scenario` (per-player event instances). The event hooks `onInit`, `onChanges`, `onDetectInShape`/`OutShape` are in `Player.ts:1313-1456`.
- `packages/server/src/Player/VariableManager.ts`: persisted switches and variables.
- `packages/common/src/lighting.ts` (ambient darkness, fog, light spots), `weather.ts`, `packages/action-battle/src/ai.server.ts` and `targeting.ts`.

### 3 Techniques applicable to Eldoria
- [V→I] **Pluggable damage pipeline with a result record.** Eldoria already returns structured results from `R.playerAttack`/`monsterAttack`. The RPG-JS split (hit → base → critical → guard → element) is a useful *checklist* for the battle log and replay. It does not replace Eldoria's 3d6 rules.
- [V→I] **Snapshot aliasing for save compatibility.** When a field is renamed in `world3d-state` or `battle`, read both names and write only the new one, as in `addSignalSnapshotAliases`. This is a light alternative to versioned migrators for small renames.
- [V→I] **Save strategy interface.** Separate *where* a save goes (Yumina variables, sessionStorage or a save code) from *when* (autosave policy with `canSave` during combat or dialogue). Eldoria's `flushSoon` and `write3d` could sit behind a small strategy interface.
- [V→I] **Shared vs per-player events.** This maps to Eldoria's GM-recorded `npc-state` people versus generated townsfolk: the former are persistent identities and the latter deterministic and reconstructible.
- [I] **Exp curve.** Eldoria's `xpForLevel` is lore-fixed (`50·L·(L−1)`) and must not change. The RPG-JS curve is a reference only.

### 4 Dependency and Three.js compatibility
- [V] No three.js. Client rendering is Pixi/CanvasEngine 2D. The physic package is custom (5.0.3). The server uses zod 4 and rxjs 7.

### 5 Yumina sandbox compatibility
- [V] The server-authoritative design assumes WebSocket rooms (`@signe/room`) or Cloudflare (`packages/server/src/cloudflare`), which conflicts with `connect-src 'none'`.
- [I] The "standalone" mode runs server code in the browser in theory. Bundling the framework into a Yumina rootComponent was not tested and would be heavy. Use it for ideas only.

### 6 iPhone/mobile considerations
- [V] `packages/ui-css` and `action-battle/attack-input.ts` exist. I did not inspect the mobile specifics.

### 7 License obligations
- [V] `LICENSE` is MIT: "Copyright (C) 2026 by Samuel Ronce". Every package's `package.json` says `"license": "MIT"`.
- [V] Copying code requires keeping the copyright and permission notice. Any copied snippet needs an attribution header in the Eldoria file and a notice in the README.
- [V] AGENTS.md (3 lines) concerns the maintainers' release and changeset process only.

### 8 Recommended approach for Eldoria
- [I] Ideas, and at most small MIT snippets with attribution: snapshot aliasing, the save-strategy interface and the damage-result checklist. No framework adoption.

### 9 What was actually inspected
- AGENTS.md, CONTRIBUTING.md (head), DESIGN.md (head; it is an image-generation contract, unrelated), LICENSE and the root package.json.
- `package.json` of client, server, common, action-battle and physic, plus licenses of all packages.
- The `server/src` and `common/src` trees.
- Parts of ParameterManager.ts (curves), BattleManager.ts (head and formula hooks), snapshot.ts (full), services/save.ts (lines 1–80), Item.ts, StateManager.ts (head), event.ts (head), lighting.ts (head) and VariableManager.ts (grep).

### 10 Remaining gaps and uncertainties
- Not read: ItemManager.ts and SkillManager.ts bodies, action-battle AI, map-events/gameplay rooms, the `docs/` guides or the migration docs.
- [I] I have not confirmed whether v5 has a formal snapshot *version* field beyond aliasing.

---

## Architecture integration candidates (ranked)

| # | Candidate (source pattern) | Benefit | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 1 | Flush pending variables on `visibilitychange`/`pagehide` (STGAAB `index.tsx:951`) | High: iOS kills background tabs; protects HP, XP and loot written since the last flush | XS | Very low | Calls the existing `Game.flush()`. No state change. [V] Eldoria `src/` has no such listener. |
| 2 | Eldoria-local export validator plus size budget (Foundry `validate-export.ts`, `EXPORT_CONTRACT.json`) | High: catches schema drift. Measured dist = 10.41 MiB with `compiled` (stripped by Yumina to ~5.4 MiB [I]) | S | Low | Validate against current yumina-oss HEAD d1789a86, not the Foundry's stale a24c1292. |
| 3 | `restore3d()` sanitise/migrate for `world3d-state` keyed on existing `v` (STGAAB `state.js restore`, Godot migration pattern, RPG-JS snapshot aliases) | High for save compatibility on future changes | S | Low | Additive. Never throw on unknown battle shapes; fall back to `battle:null`. |
| 4 | Single GM/AI gateway with counters (STGAAB `ai-bridge.js`, Foundry guide §20) | Medium: makes "0 GM calls during ordinary play" testable | S | Low | Wraps existing calls only. |
| 5 | Revision counter for GM-vs-client echo detection (Foundry AI guide §16 `basedOn{worldTick, actorRevision}`) | Medium: replaces the 4–9 s time windows in `setVars` with exact ordering | M | Medium | Must stay backward-compatible with GM writes that carry no revision. GM contract text may need a line. |
| 6 | Seeded combat RNG stored in `world3d-state.battle` (STGAAB `rng.js`, RPGAtlas `rng.ts`) | Medium: identical replays after reload; deterministic tests | S–M | Low-medium | Same 3d6 distribution and rules; only the random source changes. Old snapshots get a fresh seed. |
| 7 | Move the built-in GLB (3.8 MB) to a Yumina Asset with embedded fallback (Foundry storage doc, guide §20) | Medium: export size, edit/save speed | M | Medium | `world3d-models` already supports `@asset:`. Needs the asset uploaded per world. |
| 8 | Deterministic NPC routine packages (UGDL OpenMW package-stack and timed-repeat records; Foundry guide §15 tiers) | Medium: livelier towns, no GM cost | M | Low | Replaces random goals in `updateNPCs` with schedule data; GM-owned `npc-state` stays authoritative. |
| 9 | Client-side quest read model with idempotent reward flags (RPGAtlas `js/quests.js`) | Low-medium | M | Medium | Quests stay GM-owned; display and validation only. Clean-room only (GPL). |
| 10 | Save strategy interface plus autosave policy (RPG-JS `services/save.ts`) | Low-medium | S | Low | Organisational; MIT allows snippets with attribution. |
| 11 | Bundle three r149 instead of the CDN `<script>` (Foundry guide §20) | Low-medium: removes the CDN dependency on mobile | M | Medium | CDN load is allowed by the current CSP [V]. Adds about 600 KB to the export. |

Not recommended: adopting RPGAtlas's three r185 renderer (version-incompatible, GPL), adopting the RPG-JS framework (network-dependent, 2D), or any STGAAB content or mechanics.

## Restrictions recorded from AGENTS.md files

**UGDL** (`/home/user/ugdl/AGENTS.md`)
- It is a source-aware knowledge and specification library. The Git working repository is the source of truth; ZIPs are immutable release artifacts.
- Layer 3 (reusable implementation) is DORMANT. Activating it requires eligibility *and* explicit human authorisation recorded in state. Reference code does not activate it.
- Preserve facts, inferences, unknowns and provenance. Never fabricate or silently upgrade evidence, and never hand-edit generated statuses.
- Yumina is an evidence-bounded runtime: inspecting code is not verified execution.
- Released stable IDs are permanent. Search before minting, stop before an ID migration, and never silently merge conflicting claims.
- Major work needs an approved ExecPlan under `.agent/plans/`.
- Run `python tools/validate_all.py` before and after changes. It runs in a disposable copy, and BLOCKED is expected. Never weaken validators.
- Preserve the tag `pristine-v0.26.0-import`, historical reports and release artifacts. Version bumps need an approved milestone.
- Packaging needs a detached external approval bound to HEAD, fingerprint and version, and only `tools/build_release.py build()` may package.
- Current scope: the v0.27 research-intelligence foundation, proposal-first. There is no live apply, human review is mandatory, and the 790 inherited records are preserved.
- (Via the Foundry AGENTS.md) Foundry tasks must never modify UGDL; corrections go to `ugdl_handoffs/`.
- (`AI_PROJECT_INSTRUCTIONS.md`) Verify the exact file's license before copying code.

**Yumina Game Foundry** (`/home/user/yumina-game-foundry/AGENTS.md`)
- The Foundry is the writable target. yumina-oss and UGDL are read-only; never modify them from a Foundry task.
- Every game lives under `games/<game-id>/`. There are no cross-game imports, shared assets/data/saves/lore or shared mutable state without explicit creator authorisation. Transfers are recorded under `transfers/`, and shared code needs explicit approval.
- Use the Creator Discovery Interview (one question at a time) and reach a Design Lock before large implementation.
- Engineering rules: ENGINE = mechanical authority, RENDERER = presentation, UI = controls, AI = bounded, PERSISTENCE = explicit.
  - No GM round trip for deterministic play.
  - Frame state stays local.
  - Content is data-driven.
  - Build a vertical slice first.
  - Completion requires observable tests.
- Verify against current yumina-oss; current source wins over the guides. Do not invent APIs.
- Storage: no base64 in variables, prefer `@asset:<uuid>`, use `aiAccess:"none"` for large ledgers, and keep AI-visible variables compact.
- Export gate:
  - the export must compile to a `WorldDefinition` and pass the authoritative schema at the profile's exact commit (fail-closed if stale);
  - `rootComponent` is required;
  - export is limited to 10 MiB with a 9 MiB target;
  - no placeholders;
  - a validation receipt is required.
- Reference images are not production-licensed or canon. PixelLab is a development-time tool. Never print or commit `Pixellab_Token`, and charged generation needs creator authorisation.
- Do not delete, rewrite or couple other games. Ask when a change crosses game boundaries ambiguously.

**STGAAB Visual RPG** (no AGENTS.md; rules from `README.md`)
- Preserve the authoritative baseline JSON and never overwrite the last stable build. Experimental renderer work belongs on a separate branch or build.
- Engine = authority and Renderer = presentation. Deterministic mechanics must not need AI or GM. Keep state renderer-agnostic and high-frequency state local.
- Test major milestones inside Yumina. Treat yumina-oss as a read-only reference and do not copy the Yumina engine.
- (Task restriction) Transfer no STGAAB lore, characters or mechanics; generic architecture only.

**RPGAtlas** (`AGENTS.md`)
- AI-assisted changes *to RPGAtlas* must prepend an entry to `js/patch-notes.js`, never remove or reorder earlier notes, and include a date, title, summary and changes. It does not apply here because nothing was modified.
- License: GPL-3.0-or-later. Any copied code propagates GPL.

**RPG-JS** (`AGENTS.md`, 3 lines)
- Refers to CONTRIBUTING.md. Maintainer release process: switch to the next RC version (except physic), publish through the remote/CI, and always update the changeset. It does not apply to read-only use.
- License: MIT (© 2026 Samuel Ronce). Keep the notice if any snippet is copied.
