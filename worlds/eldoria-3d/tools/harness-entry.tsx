// Local test harness: mounts the compiled world exactly the way Yumina's sandbox does
// (the repository's buildComponent + injected scope), with a mock useYumina() that
// stores variables in memory and answers chat messages with canned GM text.
import React from "react";
import { createRoot } from "react-dom/client";
import { buildComponent } from "@/lib/tsx/tsx-component-builder";

declare const window: any;

async function main() {
  const world = await (await fetch("./eldoria-3d.json")).json();
  const vars: Record<string, unknown> = {};
  for (const v of world.variables) vars[v.id] = JSON.parse(JSON.stringify(v.defaultValue));
  Object.assign(vars, window.__presetVars || {});
  const listeners = new Set<() => void>();
  const state: any = { vars, messages: [], isStreaming: false, streamingContent: "", pendingChoices: [], toasts: [], audio: [], sent: [] };
  window.__state = state;
  const emit = () => listeners.forEach((f) => f());
  const store: Record<string, any> = (() => { try { return JSON.parse(localStorage.getItem("harnessStore") || "{}"); } catch { return {}; } })();
  function useYumina() {
    const [, setN] = React.useState(0);
    React.useEffect(() => { const f = () => setN((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
    return {
      variables: state.vars, messages: state.messages, isStreaming: state.isStreaming, streamingContent: state.streamingContent, pendingChoices: state.pendingChoices, error: null, readOnly: false, worldName: world.name,
      setVariable(id: string, value: unknown) { state.vars = { ...state.vars, [id]: value }; emit(); },
      async patchVariables(values: Record<string, unknown>) { await new Promise((r) => setTimeout(r, 60)); state.vars = { ...state.vars, ...values }; emit(); },
      sendMessage(text: string) {
        state.sent.push(text); state.messages = [...state.messages, { id: "u" + state.messages.length, role: "user", content: text, createdAt: new Date().toISOString() }];
        state.isStreaming = true; state.streamingContent = ""; emit();
        const reply = "| Morning | 08:20 AM | Dawnday, Dawnswell 3, 1247 AR | Waxing Crescent | Aurelia City | Early Spring | Overcast |\n\nThe clerk looks up from her ledger. *\"Name and business,\"* she says, pen already moving.\n\n[world-time: set 08:20 AM]";
        let i = 0; const t = setInterval(() => { i += 24; state.streamingContent = reply.slice(0, i); emit(); if (i >= reply.length) { clearInterval(t); state.isStreaming = false; state.streamingContent = ""; state.messages = [...state.messages, { id: "a" + state.messages.length, role: "assistant", content: reply, createdAt: new Date().toISOString() }]; state.pendingChoices = ["Register with the Guild", "Ask about work"]; emit(); } }, 30);
      },
      clearPendingChoices() { state.pendingChoices = []; emit(); }, stopGeneration() { state.isStreaming = false; emit(); },
      showToast(m: string, t: string) { state.toasts.push([t, m]); console.log("TOAST", t, m); },
      playAudio(id: string) { state.audio.push(["play", id]); }, stopAudio(id: string) { state.audio.push(["stop", id]); }, setAudioVolume() {}, getAudioVolume() { return 1; },
      storage: { async get(k: string) { return store[k] ?? null; }, async set(k: string, v: string) { store[k] = v; }, async remove(k: string) { delete store[k]; } },
      renderMarkdown(t: string) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*([^*]+)\*/g, "<em>$1</em>").split(/\n\n+/).map((p) => "<p>" + p + "</p>").join(""); },
    };
  }
  const MessageList = () => { const api = useYumina(); return <div>{api.messages.map((m: any) => <div key={m.id} style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}><b>{m.role}:</b> {m.content}</div>)}</div>; };
  const res = buildComponent(world.rootComponent.compiled.code, useYumina, { MessageList, MessageInput: () => null });
  if (!res.Component) { document.body.textContent = "BUILD ERROR " + res.error; window.__buildError = res.error; return; }
  const App = res.Component;
  class Boundary extends React.Component<any, any> { state = { err: null as any }; static getDerivedStateFromError(e: any) { return { err: e }; } componentDidCatch(e: any) { window.__renderError = String(e && e.stack || e); } render() { return this.state.err ? <pre style={{ color: "red" }}>{String(this.state.err.stack || this.state.err)}</pre> : this.props.children; } }
  createRoot(document.getElementById("root")!).render(<Boundary><App /></Boundary>);
  window.__ready = true;
}
main();
