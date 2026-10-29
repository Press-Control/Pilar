"use client";

import "./chat.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GuideMark, PromptComposer } from "@/components/ui";
import { useToast } from "@/components/shell/preferences";
import { streamChat } from "@/lib/chat-types";
import { DEMO_SCRIPT, HOME_PROMPTS, JOURNEY_STAGES } from "@/lib/fixtures";
import { ConversationCards, ConversationsDrawer, useConversations } from "./ConversationList";
import { InsightPanel } from "./InsightPanel";
import { ListenButton } from "./ListenButton";
import { VoicePanel } from "./VoicePanel";
import { CallBar, CallButton, useCall, type CallTurn } from "./CallControl";
import {
  STORAGE_PREFIX,
  applyUpdates,
  fallbackProgress,
  initialSnapshot,
  stageIndex,
  toWire,
  uid,
  type ChatSnapshot,
  type IdeaState,
  type UIMessage,
} from "./model";

const PROGRESS = [10, 35, 65, 90];
const JOURNEY_STATUS = ["Una idea por explorar", "Una intención más clara", "Un supuesto por comprobar", "Un paso para probar"];
const CAPTIONS = [
  "Una primera intuición. Muchas posibilidades.",
  "Una intención empieza a encontrar sus palabras.",
  "Una pregunta abre una nueva conexión.",
  "Un siguiente paso para llevar fuera de aquí.",
];

const isLive = (engine: string | null | undefined) => engine === "anthropic" || engine === "claude-code";

function readStore(key: string): ChatSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const snap = JSON.parse(raw) as ChatSnapshot;
    if (!Array.isArray(snap?.messages) || !snap.state) return null;
    // A reload during streaming leaves a half message: mark it as stopped.
    snap.messages = snap.messages.map((m) => (m.status === "streaming" ? { ...m, status: (m.content ? "stopped" : "error") as UIMessage["status"] } : m)).filter((m) => m.content || m.role === "user");
    return snap;
  } catch {
    return null;
  }
}

function plainExcerpt(md: string, max = 280): string {
  const text = md
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s\S*$/, "")}…` : text;
}

export function ChatView({ ideaId, firstPrompt, initialMode = "texto", openList = false }: { ideaId?: string; firstPrompt?: string; initialMode?: "texto" | "voz"; openList?: boolean }) {
  const router = useRouter();
  const notify = useToast();
  const storeKey = `${STORAGE_PREFIX}${ideaId ?? "nueva"}`;

  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [state, setState] = useState<IdeaState>(() => initialSnapshot(ideaId).state);
  const [engine, setEngine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState<string | null>(null);
  const [entering, setEntering] = useState(!!firstPrompt);
  const [mode, setModeState] = useState<"texto" | "voz">(initialMode);
  const [convoOpen, setConvoOpen] = useState(openList);
  const closeConvos = useCallback(() => setConvoOpen(false), []);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const messagesRef = useRef<UIMessage[]>([]);
  const stateRef = useRef<IdeaState>(state);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const booted = useRef(false);

  const commitMessages = useCallback((next: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => {
    const value = typeof next === "function" ? next(messagesRef.current) : next;
    messagesRef.current = value;
    setMessages(value);
  }, []);
  const commitState = useCallback((next: IdeaState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const flash = useCallback((keys: string[]) => {
    if (!keys.length) return;
    setTouched(new Set(keys));
    window.setTimeout(() => setTouched(new Set()), 1600);
  }, []);

  /* ------------------------------------------------------------------ streaming turn */
  const runTurn = useCallback(
    async (history: UIMessage[]) => {
      const asstId = uid("a");
      commitMessages([...history, { id: asstId, role: "assistant", content: "", status: "streaming" }]);
      setBusy(true);
      setElapsed(0);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const patch = (fn: (m: UIMessage) => UIMessage) => commitMessages((prev) => prev.map((m) => (m.id === asstId ? fn(m) : m)));
      let received = "";
      try {
        const res = await streamChat(
          { messages: toWire(history), ideaId, ...(modeRef.current === "voz" ? { mode: "voice" as const } : {}) },
          (t) => {
            received = t;
            patch((m) => ({ ...m, content: t }));
          },
          ctrl.signal,
        );
        if (!res.text.trim()) throw new Error("La respuesta llegó vacía. Intenta de nuevo.");
        setEngine(res.engine);
        patch((m) => ({ ...m, content: res.text, status: "done", engine: res.engine }));
        const base = stateRef.current;
        if (res.updates) {
          const { state: merged, touched: keys } = applyUpdates(base, res.updates);
          const progressed = fallbackProgress(merged, messagesRef.current);
          // Engine stage wins when present, but the journey never moves backwards on its own.
          const stage = res.updates.stage && stageIndex(merged.stage) >= stageIndex(base.stage) ? merged.stage : base.stage;
          commitState(res.updates.stage ? { ...progressed, stage } : progressed);
          flash(progressed.stage !== base.stage ? [...keys, "stage", "map"] : keys);
        } else {
          const prevStage = base.stage;
          const next = fallbackProgress(base, messagesRef.current);
          commitState(next);
          flash(next.stage !== prevStage ? ["map", "highlight"] : ["map"]);
        }
        setCaption(null);
      } catch (e) {
        const aborted = ctrl.signal.aborted;
        const message = e instanceof Error && e.message ? e.message : "No pudimos obtener una respuesta. Intenta de nuevo.";
        if (received.trim()) {
          patch((m) => ({ ...m, content: received, status: aborted ? "stopped" : "error", error: aborted ? undefined : "La respuesta se interrumpió." }));
        } else {
          // Nothing arrived: drop the empty bubble and mark the user's message so it can be retried (no duplicate).
          commitMessages((prev) => {
            const rest = prev.filter((m) => m.id !== asstId);
            const lastUser = [...rest].reverse().find((m) => m.role === "user");
            return rest.map((m) => (m === lastUser ? { ...m, failed: aborted ? "Detuviste la respuesta." : message } : m));
          });
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setBusy(false);
      }
    },
    [commitMessages, commitState, flash, ideaId],
  );

  const send = useCallback(
    async (text: string) => {
      if (abortRef.current) return false;
      const clean = messagesRef.current.map((m) => (m.failed ? { ...m, failed: undefined } : m));
      const history: UIMessage[] = [...clean, { id: uid("u"), role: "user", content: text }];
      void runTurn(history);
      return true;
    },
    [runTurn],
  );

  const retry = useCallback(() => {
    if (abortRef.current) return;
    const list = messagesRef.current;
    let lastUser = -1;
    for (let i = list.length - 1; i >= 0; i--) if (list[i]!.role === "user") { lastUser = i; break; }
    if (lastUser === -1) return;
    const history = list.slice(0, lastUser + 1).map((m) => (m.failed ? { ...m, failed: undefined } : m));
    void runTurn(history);
  }, [runTurn]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Texto / Voz. Same messages, state and persistence; only the conversation column changes. */
  const setMode = useCallback((next: "texto" | "voz") => {
    setModeState(next);
    try {
      const url = new URL(window.location.href);
      if (next === "voz") url.searchParams.set("modo", "voz");
      else url.searchParams.delete("modo");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } catch {}
  }, []);

  /* ------------------------------------------------------------------ phone call ("Llamarme") */
  const onCallTurn = useCallback(
    (t: CallTurn, eng: string | null) => {
      commitMessages((prev) => [
        ...prev.map((m) => (m.failed ? { ...m, failed: undefined } : m)),
        { id: uid(t.role === "user" ? "u" : "a"), role: t.role, content: t.content, status: "done", via: "call", engine: t.role === "assistant" ? eng : undefined },
      ]);
      // Live mirror: always follow the newest turn.
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
      if (t.role !== "assistant") return;
      if (eng) setEngine(eng);
      const base = stateRef.current;
      if (t.updates) {
        const { state: merged, touched: keys } = applyUpdates(base, t.updates);
        const progressed = fallbackProgress(merged, messagesRef.current);
        const stage = t.updates.stage && stageIndex(merged.stage) >= stageIndex(base.stage) ? merged.stage : base.stage;
        commitState(t.updates.stage ? { ...progressed, stage } : progressed);
        flash(progressed.stage !== base.stage ? [...keys, "stage", "map"] : keys);
      } else if (messagesRef.current.some((m) => m.role === "user")) {
        commitState(fallbackProgress(base, messagesRef.current));
      }
    },
    [commitMessages, commitState, flash],
  );
  const getCallContext = useCallback(() => ({ messages: toWire(messagesRef.current), ideaId }), [ideaId]);
  const call = useCall({ getContext: getCallContext, onTurn: onCallTurn });

  /* ------------------------------------------------------------------ boot: ?q=, storage or fixture */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (firstPrompt?.trim()) {
      const fresh = initialSnapshot(ideaId);
      commitState(fresh.state);
      commitMessages(fresh.messages);
      setReady(true);
      try {
        sessionStorage.removeItem("pilar-first-prompt");
      } catch {}
      // Strip ?q= so a reload restores the saved conversation instead of sending again.
      const qs = new URLSearchParams();
      if (ideaId) qs.set("idea", ideaId);
      if (initialMode === "voz") qs.set("modo", "voz");
      window.history.replaceState(null, "", qs.size ? `/chat?${qs}` : "/chat");
      void send(firstPrompt.trim());
      return;
    }
    const saved = readStore(storeKey);
    const snap = saved ?? initialSnapshot(ideaId);
    commitState(snap.state);
    commitMessages(snap.messages);
    setEngine(snap.engine ?? null);
    setReady(true);
  }, [commitMessages, commitState, firstPrompt, ideaId, initialMode, send, storeKey]);

  useEffect(() => {
    if (!entering) return;
    const t = window.setTimeout(() => setEntering(false), 1500);
    return () => window.clearTimeout(t);
  }, [entering]);

  /* ------------------------------------------------------------------ persistence (this browser) */
  useEffect(() => {
    if (!ready || busy) return;
    try {
      localStorage.setItem(storeKey, JSON.stringify({ messages, state, engine } satisfies ChatSnapshot));
    } catch {}
  }, [busy, engine, messages, ready, state, storeKey]);

  /* ------------------------------------------------------------------ slow backend feedback */
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  /* ------------------------------------------------------------------ autoscroll */
  useEffect(() => {
    if (!ready || messagesRef.current.length === 0) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ready]);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (messagesRef.current.length === 0) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (near || busy) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  /* ------------------------------------------------------------------ decisions & sources */
  function acceptDecision(id: string) {
    const d = stateRef.current.decisions.find((x) => x.id === id);
    if (!d) return;
    commitState({ ...stateRef.current, decisions: stateRef.current.decisions.map((x) => (x.id === id ? { ...x, status: "active" } : x)) });
    commitMessages((prev) => [...prev, { id: uid("e"), role: "event", eventKind: "decision", content: `Decisión incorporada: ${d.text}`, status: "done" }]);
    setCaption(`Decisión en curso: ${d.text}`);
    flash(["decisions", "map"]);
    notify("Decisión incorporada. Continúa en tu proyecto.");
  }

  function discardDecision(id: string) {
    commitState({ ...stateRef.current, decisions: stateRef.current.decisions.filter((x) => x.id !== id) });
    flash(["decisions", "map"]);
    notify("La dejamos abierta. Puedes retomarla cuando quieras.");
  }

  async function addSource(url: string): Promise<string | null> {
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = (await res.json().catch(() => ({}))) as { title?: string; markdown?: string; excerpt?: string; url?: string; error?: string };
      if (!res.ok) return data.error || "No pudimos leer esa fuente. Intenta con otro enlace.";
      const host = (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return url;
        }
      })();
      const title = (data.title || host).trim();
      const excerpt = plainExcerpt(data.excerpt || data.markdown || "");
      commitState({ ...stateRef.current, sources: [...stateRef.current.sources, { id: uid("s"), title, url: data.url || url, excerpt, kind: "web" }] });
      commitMessages((prev) => [
        ...prev,
        { id: uid("e"), role: "event", eventKind: "source", content: `Fuente agregada: ${title}${excerpt ? ` — ${excerpt}` : ""}`, status: "done" },
      ]);
      flash(["sources"]);
      notify("Fuente agregada. La tendremos en cuenta al conversar.");
      return null;
    } catch {
      return "No pudimos leer esa fuente. Revisa tu conexión e intenta de nuevo.";
    }
  }

  function newIdea() {
    abortRef.current?.abort();
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}nueva`);
    } catch {}
    if (ideaId) {
      router.push("/chat");
      return;
    }
    commitMessages([]);
    commitState(initialSnapshot(null).state);
    setEngine(null);
    setCaption(null);
    setDraft("");
    inputRef.current?.focus();
  }

  function pickStarter(text: string, sendNow: boolean) {
    if (sendNow) {
      void send(text);
      return;
    }
    setDraft(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  }

  /* ------------------------------------------------------------------ render */
  const idx = stageIndex(state.stage);
  const stage = JOURNEY_STAGES[idx]!;
  const live = isLive(engine);
  const users = messages.filter((m) => m.role === "user").length;
  const thinkingLabel = elapsed >= 18 ? "Está tardando más de lo normal" : elapsed >= 6 ? "Sigue pensando…" : "Preparando una pregunta";
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <section className={`conversation${entering ? " entering" : ""}`} id="conversation" aria-label="Espacio de conversación">
      <nav className="journey" aria-label="El recorrido de tu idea">
        <button type="button" className="new-conversation" onClick={newIdea}>
          ＋ <span>Nueva conversación</span>
        </button>
        <button type="button" className="convo-open" onClick={() => setConvoOpen(true)}>
          <span aria-hidden="true">☰</span> Conversaciones
        </button>
        <div className="eyebrow journey-label">TU RECORRIDO</div>
        <ol className="journey-steps">
          {JOURNEY_STAGES.map((s, i) => (
            <li key={s.id} className={i === idx ? "current" : undefined} aria-current={i === idx ? "step" : undefined}>
              <span>{i < idx ? "✓" : s.number}</span>
              <div>
                {s.title}
                <small>{s.subtitle}</small>
              </div>
            </li>
          ))}
        </ol>
        <div className="journey-note">
          <span className="journey-orbit" aria-hidden="true">◎</span>
          <p>
            No necesitas tenerlo claro.
            <br />
            Para eso estamos aquí.
          </p>
          <div className="journey-progress" role="img" aria-label={`Recorrido: etapa ${idx + 1} de 4`}>
            <span style={{ width: `${PROGRESS[idx]}%` }} />
          </div>
          <small>{JOURNEY_STATUS[idx]}</small>
        </div>
      </nav>

      <div className="conversation-main">
        <div className="conversation-heading">
          <div>
            <div className="eyebrow">{state.title ? state.title.toUpperCase() : "DE LA INTUICIÓN A LA DECISIÓN"}</div>
            <h2>
              Una idea en movimiento<span>.</span>
            </h2>
            <p>La conversación avanza. Tu idea toma forma.</p>
          </div>
          <div className="heading-actions">
            <button type="button" className="convo-toggle" onClick={() => setConvoOpen(true)} aria-label="Ver conversaciones">
              <span aria-hidden="true">☰</span> <span>Conversaciones</span>
            </button>
            <div className="mode-toggle" role="group" aria-label="Modo de conversación">
              <button type="button" aria-pressed={mode === "texto"} onClick={() => setMode("texto")}>
                Texto
              </button>
              <button type="button" aria-pressed={mode === "voz"} onClick={() => setMode("voz")}>
                Voz
              </button>
            </div>
            <span className={`session-badge${busy ? " is-busy" : ""}`} title={live ? "Responde un interlocutor en vivo" : "Responde la guía local de la demo"}>
              <span className="live-dot" /> {live ? "Interlocutor en vivo" : "Guía local"}
            </span>
          </div>
        </div>

        <div className="thinking-space">
          <div className="stage-heading">
            <div>
              <span className="stage-spark" aria-hidden="true">✳</span>
              <strong id="stageTitle">{stage.title}</strong>
              <span id="stageNumber">{stage.number} / 04</span>
            </div>
            <div className="stage-actions">
              {ideaId ? (
                <Link className="stage-type stage-link" href={`/lab?idea=${encodeURIComponent(ideaId)}`}>
                  Decision Lab ↗
                </Link>
              ) : null}
              <CallButton call={call} />
              <span className="stage-type" id="stageType">{stage.type}</span>
            </div>
          </div>

          <div className="thinking-grid">
            <section className="chat-column" aria-label="Conversación">
              <div className="block-heading">
                <span>↳ &nbsp; {mode === "voz" ? "Conversación en voz" : "Tu conversación"}</span>
                <span className="chat-status">{call.active ? "Conversando por teléfono" : busy ? "La idea toma forma…" : "A tu ritmo"}</span>
              </div>

              {mode === "voz" ? (
                <VoicePanel messages={messages} busy={busy} onSend={(t) => void send(t)} onStop={stop} onExit={() => setMode("texto")} />
              ) : (
              <>

              <div className="messages" id="messages" ref={listRef} role="log" aria-label="Mensajes de la conversación" aria-live="polite">
                {ready && messages.length === 0 ? <EmptyChat onPick={pickStarter} /> : null}
                {messages.map((m) => {
                  if (m.role === "user")
                    return (
                      <article key={m.id} className={`message message-user arriving${m.failed ? " is-failed" : ""}`}>
                        {m.content}
                        {m.via === "call" ? <span className="message-via">☏ POR TELÉFONO</span> : null}
                        {m.failed ? (
                          <span className="message-failed" role="alert">
                            {m.failed}
                            {m.id === [...messages].reverse().find((x) => x.role === "user")?.id ? (
                              <button type="button" onClick={retry} disabled={busy}>
                                Reintentar ↻
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                      </article>
                    );
                  if (m.role === "event")
                    return (
                      <article key={m.id} className="message message-event arriving">
                        <span className="message-event__glyph" aria-hidden="true">{m.eventKind === "source" ? "⌕" : "✓"}</span>
                        <p>{m.content}</p>
                      </article>
                    );
                  const streaming = m.status === "streaming";
                  return (
                    <article key={m.id} className={`message message-guide arriving${m.status === "error" ? " is-failed" : ""}`} aria-busy={streaming || undefined}>
                      <GuideMark />
                      <div className="guide-copy">
                        <div className="message-label">
                          EL PILAR <span>{isLive(m.engine ?? (streaming ? engine : null)) ? "EN VIVO" : "GUÍA LOCAL"}</span>
                          {m.via === "call" ? <span>☏ POR TELÉFONO</span> : null}
                        </div>
                        {streaming && !m.content ? (
                          <div className="guide-thinking-wrap" role="status">
                            <div className="guide-thinking" aria-hidden="true">
                              <i />
                              <i />
                              <i />
                            </div>
                            <span className="guide-thinking-label">{thinkingLabel}</span>
                          </div>
                        ) : (
                          <p className={streaming ? "is-streaming" : undefined}>{renderInline(m.content)}</p>
                        )}
                        {m.status === "error" || m.status === "stopped" ? (
                          <span className="message-failed">
                            {m.status === "stopped" ? "Respuesta detenida." : m.error}
                            {m === lastAssistant ? (
                              <button type="button" onClick={retry} disabled={busy}>
                                Reintentar ↻
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                        {m.status === "done" && m.content ? (
                          <div className="message-actions">
                            <ListenButton text={m.content} />
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <CallBar call={call} />
              <div className={`chat-dock-wrap${busy ? " is-busy" : ""}`}>
                <PromptComposer
                  ref={inputRef}
                  variant="dock"
                  value={draft}
                  onChange={setDraft}
                  onSubmit={send}
                  busy={busy || call.active}
                  label="Escribe tu mensaje"
                  placeholder={users === 0 ? "Cuéntame tu idea, aunque sea a medias…" : "Sigamos dándole forma…"}
                  hint={call.active ? "EN LLAMADA · HABLA POR TELÉFONO" : busy ? "LA IDEA TOMA FORMA…" : "UNA PREGUNTA A LA VEZ"}
                  autoFocus={!firstPrompt}
                />
                {busy ? (
                  <button type="button" className="chat-stop" onClick={stop}>
                    ■ Detener
                  </button>
                ) : null}
              </div>
              <div className="local-note">
                Guardado en este navegador <span>·</span> Un espacio para pensar a tu ritmo
              </div>
              </>
              )}
            </section>

            <InsightPanel state={state} messages={messages} touched={touched} onAccept={acceptDecision} onDiscard={discardDecision} onAddSource={addSource} />
          </div>
        </div>

        <div className="conversation-caption">
          <span className="live-dot" />
          <span>{caption ?? CAPTIONS[idx]}</span>
          <span className="caption-index">{String(users).padStart(2, "0")}</span>
        </div>
      </div>
      <ConversationsDrawer open={convoOpen} onClose={closeConvos} onNew={newIdea} currentId={ideaId ?? "nueva"} />
    </section>
  );
}

/** Minimal inline formatting for model output: **bold** and *italic*. Everything else stays plain text. */
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let k = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? <strong key={k++}>{m[1]}</strong> : <em key={k++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function EmptyChat({ onPick }: { onPick: (text: string, sendNow: boolean) => void }) {
  const convos = useConversations();
  return (
    <div className="chat-empty">
      <div className="message message-guide arriving">
        <GuideMark />
        <div className="guide-copy">
          <div className="message-label">
            EL PILAR <span>CUADERNO</span>
          </div>
          <p>No necesitas tenerlo claro. Escribe eso que te está dando vueltas, aunque sea a medias. Vamos pregunta por pregunta.</p>
        </div>
      </div>
      <div className="chat-empty__group">
        <div className="eyebrow">CONTINÚA UNA CONVERSACIÓN</div>
        <ConversationCards items={convos.filter((c) => c.id !== "nueva")} />
      </div>
      <div className="chat-empty__group">
        <div className="eyebrow">O EMPIEZA UNA NUEVA</div>
        <div className="prompts chat-starters">
          {HOME_PROMPTS.map((p) => (
            <button key={p.label} type="button" onClick={() => onPick(p.prefix, false)}>
              {p.glyph} {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="chat-example" onClick={() => onPick(DEMO_SCRIPT[0]!, true)}>
          <span aria-hidden="true">↳</span> «{DEMO_SCRIPT[0]}»
        </button>
      </div>
    </div>
  );
}
