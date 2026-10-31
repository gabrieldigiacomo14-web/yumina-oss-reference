import React from 'react';
let listeners = [];
let state = { variables: window.__MOCK_VARS || {}, messages: window.__MOCK_MSGS || [] };
const store = window.__PRESET_STORE || {};
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
export function MessageList(props) {
  const R = props && props.rendererComponent;
  const md = t => String(t || '').split('\n\n').map(p => '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/\n/g, '<br>') + '</p>').join('');
  return <div className="mock-list">{state.messages.map((m, i) => <div key={i} className={'mock-msg ' + m.role}>
    {R ? <R content={m.content} rawContent={m.content} role={m.role} renderMarkdown={md} isStreaming={false} variables={state.variables} messageId={'m' + i} isLastMessage={i === state.messages.length - 1} isGreeting={i === 0} />
       : m.content.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
    {m.role === 'assistant' ? <div className="mock-tools">{'◁ 1/1 ▷  🔊 ⧉ ⑂ ✎ 🖼 ↻ 🗑'}</div> : null}</div>)}</div>;
}
export function MessageInput() {
  // same structure as Yumina's real composer (sandbox/chat/message-input.tsx)
  return (
    <div className="play-composer-shell shrink-0"><div className="play-composer-inner">
      <div className="play-composer-card">
        <div className="play-composer-grow"><textarea className="play-composer-textarea" rows={1} placeholder="Type whatever you want to do in this world!" /></div>
        <div className="play-composer-toolbar">
          <div className="play-composer-actions"><div className="relative"><button className="play-composer-icon-button">+</button></div>
            <button className="play-composer-model"><span className="dot">●</span><span className="truncate">Gemini 3.8 Flash</span><span className="bal">48,102 🍄</span>›</button>
            <span className="slot"><button className="play-effort">💡 High</button></span></div>
          <div className="play-composer-send-row"><button className="play-composer-icon-button">🔊</button><button className="play-composer-send">🎙</button></div>
        </div>
      </div></div></div>
  );
}
