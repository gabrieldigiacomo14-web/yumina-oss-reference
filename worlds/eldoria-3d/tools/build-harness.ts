// Node harness: runs the repository's real bundler, hash and schema on the 3D world.
import { bundleTSX } from "@/lib/tsx/tsx-bundler";
import { hashRootFiles, COMPILED_FORMAT_VERSION } from "@/features/studio/lib/compiled-format";
import { worldDefinitionSchema } from "../../../packages/engine/src/world/schema";
import { validateWorld } from "../../../packages/engine/src/validation/world-validator";
(globalThis as any).EldoriaBuild = { bundleTSX, hashRootFiles, COMPILED_FORMAT_VERSION, worldDefinitionSchema, validateWorld };
