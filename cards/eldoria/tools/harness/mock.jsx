import React from 'react';
let listeners = [];
let state = { variables: window.__MOCK_VARS || {}, messages: window.__MOCK_MSGS || [] };
const store = {};
function emit() { listeners.forEach(f => f()); }
window.__setVars = p => { state = { ...state, variables: { ...state.variables, ...p } }; emit(); };
window.__getVars = () => state.variables;
window.__setMsgs = m => { state = { ...state, messages: m }; emit(); };
export function useYumina() {
  const [, force] = React.useState(0);
  React.useEffect(() => { const f = () => force(x => x + 1); listeners.push(f); return () => { listeners = listeners.filter(g => g !== f); }; }, []);
  return {
    variables: state.variables, messages: state.messages, isStreaming: false,
    setVariable: (k, v) => window.__setVars({ [k]: v }), patchVariables: p => { window.__setVars(p); return Promise.resolve(); },
    sendMessage: t => { window.__sent = (window.__sent || []).concat([t]); },
    showToast: t => { window.__toasts = (window.__toasts || []).concat([t]); },
    storage: { get: k => Promise.resolve(store[k] || null), set: (k, v) => { store[k] = v; return Promise.resolve(); }, remove: k => { delete store[k]; return Promise.resolve(); } },
    playAudio: () => {}, stopAudio: () => {}, setAudioVolume: () => {},
  };
}
/* Stand-ins with the same structure and intrinsic widths as Yumina's real components */
export function MessageList() {
  return <div className="mock-list">{state.messages.map((m, i) => <div key={i} className={'mock-msg ' + m.role}>{m.content.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
    {m.role === 'assistant' ? <div className="mock-tools">{'◁ 1/1 ▷  🔊 ⧉ ⑂ ✎ 🖼 ↻ 🗑'}</div> : null}</div>)}</div>;
}
export function MessageInput() {
  return (
    <div className="play-composer-shell shrink-0"><div className="play-composer-inner">
      <div className="play-composer-card">
        <div className="play-composer-grow"><textarea className="play-composer-textarea" rows={2} placeholder="Type whatever you want to do in this world!" /></div>
        <div className="play-composer-toolbar">
          <div className="play-composer-actions"><button className="play-composer-icon-button">+</button>
            <button className="play-composer-model">● Gemini 3.8 Flash | 48,090 🍄 ›</button><button className="play-effort">💡 High</button></div>
          <div className="play-composer-actions"><button className="play-composer-icon-button">🔊</button><button className="play-composer-send">🎙</button></div>
        </div>
      </div></div></div>
  );
}
