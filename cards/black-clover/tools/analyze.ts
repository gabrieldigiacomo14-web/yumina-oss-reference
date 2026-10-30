import { PromptBuilder, LorebookMatcher, estimateTokens, validateWorld } from "/home/user/yumina-oss-reference/packages/engine/src/index.ts";
import { worldDefinitionSchema } from "/home/user/yumina-oss-reference/packages/engine/src/world/schema.ts";
import fs from "fs";
const [,, file, label] = process.argv;
const raw = JSON.parse(fs.readFileSync(file, "utf8"), (k, v) => (v === null && (k === "depth" || k === "folderId" || k === "maxFireCount" || k === "cooldownTurns")) ? undefined : v);
const parsed = worldDefinitionSchema.safeParse(raw);
if (!parsed.success) { console.log("SCHEMA ERRORS", JSON.stringify(parsed.error.issues.slice(0, 8), null, 1)); }
const world: any = parsed.success ? parsed.data : raw;
const warns = validateWorld(world);
console.log("NONREF", warns.filter((w: any) => !/not referenced/.test(w.message)).map((w: any) => w.message)); console.log(label, "validator warnings:", warns.length, warns.slice(0, 6).map((w: any) => w.message || JSON.stringify(w)).join(" | "));
(globalThis as any).window = {}; eval(fs.readFileSync(process.env.STATE_JS, "utf8"));
const mock = (globalThis as any).window.__MOCK_VARS;
const defaults: any = {}; for (const v of world.variables) defaults[v.id] = v.defaultValue;
function mkState(vars: any) { return { worldId: "w", variables: { ...defaults, ...vars }, turnCount: 40, metadata: {}, ruleState: { disabledRules: [], activeDirectives: [], cooldowns: {}, fireCounts: {}, toggledEntries: {} } } as any; }
// late-game inflation: ledgers, chronicle, relationships, inventory
const late: any = JSON.parse(JSON.stringify(mock));
late.chronicle = Array.from({ length: 30 }, (_, i) => ({ date: `${i + 1} May, CY 1`, title: `Milestone ${i}`, category: "life", summary: "A milestone of moderate length describing what happened and why it mattered to the character." }));
late.known_events = Array.from({ length: 20 }, (_, i) => ({ id: `ev-${i}`, title: `Event ${i} somewhere`, when: "last month", where: "Royal Capital", kind: "news", status: i < 14 ? "done" : "known" }));
late.inventory = Array.from({ length: 25 }, (_, i) => ({ ...mock.inventory[i % mock.inventory.length], id: `it-${i}` }));
for (let i = 0; i < 10; i++) late.relationships[`npc-${i}`] = { ...mock.relationships["npc-mira-tolven"], name: `Person ${i}` };
late.bank_account = { open: true, txSeq: 30, balance: 2400000, version: 1, accountType: "Magic Knight treasury payroll", lastTransaction: "mk-1", ledger: Array.from({ length: 30 }, (_, i) => ({ id: `mk-salary-${i}`, kind: "salary", amount: 200000, at: `28 ${i} CY 1`, location: "Squad treasury", balanceAfter: 200000 * i })) };
late.mk_payroll = { ...mock.mk_payroll, cyclesPaid: 24, ledger: Array.from({ length: 24 }, (_, i) => ({ id: `salary-x-${i}`, kind: "salary", date: `28 March, CY ${i}`, base: 200000, merit: 0, amount: 200000, reason: "Monthly Magic Knight salary", squad: "Black Bulls" })), rateHistory: [{ date: "1 Oct, CY 0", rank: "Junior Magic Knight, 5th Class", personalStars: 0 }] };
const pb = new PromptBuilder();
const T = (s: string) => estimateTokens(s);
const convo = [
  "I ask the baker if she needs an extra pair of hands this morning.",
  "Mira doesn't stop kneading. Flour dusts her forearms. The oven ticks. Outside, the Hage square fills with farmers and the smell of rain. @Mira Tolven \"Hands, I've got. What I need is someone who can carry sacks from the mill before the market opens. Two hundred yul a sack.\" She looks at your boots and your shoulders. Across the street the church bell rings; Asta's voice carries from the yard, shouting about training. Your grimoire hangs heavy at your hip, the mana in it humming faintly. A noble's carriage rattles past toward the Royal Capital road. [world_time: set \"06:40\"]",
  "I take the job and carry the first sack, then head home to rest and train my wind magic in the evening.",
];
for (const [name, vars] of [["early", mock], ["late", late]] as const) {
  const st = mkState(vars);
  const sys = pb.buildSystemMessages(world, st, undefined, [], [], {});
  const sysText = sys.map((m: any) => m.content).join("\n");
  const fmt = pb.buildStaticFormatBlock(world, { state: st });
  const dyn = pb.buildFormatBlock(world, st);
  const scan = world.settings?.lorebookScanDepth ?? 2;
  const m = new LorebookMatcher().matchWithBudget(world.entries, convo.slice(-scan), st, Infinity, world.settings);
  const trig = m.triggered;
  const post = pb.buildPostHistoryEntries(world, st, [...m.alwaysSend, ...trig]).map((x: any) => x.content).join("\n");
  const ex = world.entries.filter((e: any) => e.enabled && e.section === "examples").map((e: any) => e.content).join("\n");
  const trigTok = trig.reduce((a: number, e: any) => a + T(e.content), 0);
  const tot = T(sysText) + T(fmt) + T(dyn) + trigTok + T(post) + T(ex);
  console.log(`${label} [${name}] system=${T(sysText)} formatStatic=${T(fmt)} gameState=${T(dyn)} triggered=${trigTok} (${trig.length}: ${trig.map((e: any) => e.id).join(",")}) post=${T(post)} examples=${T(ex)} TOTAL(excl. history)=${tot}`);
}
