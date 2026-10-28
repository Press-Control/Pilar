"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { IdeaMap } from "./IdeaMap";
import { conceptFrom, mapNodes, type IdeaState, type UIMessage } from "./model";

const pad = (n: number) => String(n).padStart(2, "0");

function Card({ cls, glyph, title, meta, flash, children }: { cls: string; glyph: string; title: string; meta?: ReactNode; flash?: boolean; children: ReactNode }) {
  return (
    <section className={`insight-card ${cls}${flash ? " is-updated" : ""}`}>
      <div className="block-heading">
        <span>
          {glyph} &nbsp; {title}
        </span>
        {meta !== undefined ? <span>{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ symbol, title, hint }: { symbol: string; title: string; hint: string }) {
  return (
    <div className="insight-content">
      <span className="empty-symbol" aria-hidden="true">{symbol}</span>
      <p>
        {title}
        <small>{hint}</small>
      </p>
    </div>
  );
}

export function InsightPanel({
  state,
  messages,
  touched,
  onAccept,
  onDiscard,
  onAddSource,
}: {
  state: IdeaState;
  messages: UIMessage[];
  touched: Set<string>;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onAddSource: (url: string) => Promise<string | null>;
}) {
  const nodes = mapNodes(state, messages);
  const concept = conceptFrom(state, messages);
  const active = state.decisions.filter((d) => d.status === "active");
  const proposed = state.decisions.filter((d) => d.status === "proposed");

  return (
    <aside className="insight-column" aria-label="Lo que toma forma">
      <Card cls="map-card" glyph="⌘" title="Mapa de tu idea" meta={`${nodes.length + 1} concepto${nodes.length ? "s" : ""}`} flash={touched.has("map")}>
        <IdeaMap nodes={nodes} />
        <div className="concept-summary">
          <div>
            <strong>{concept.title}</strong>
            <span className="open-tag">Abierto</span>
          </div>
          <p>{concept.text}</p>
        </div>
      </Card>

      <Card cls="decision-card" glyph="◇" title="Decisiones" meta={pad(active.length)} flash={touched.has("decisions")}>
        {active.length === 0 && proposed.length === 0 ? (
          <Empty symbol="◌" title="Aún es momento de explorar." hint="Las decisiones llegarán cuando tengan sentido." />
        ) : (
          <ul className="chat-list">
            {active.map((d) => (
              <li key={d.id} className="chat-list__item">
                <span className="chat-list__glyph" aria-hidden="true">✓</span>
                <div>
                  <p>{d.text}</p>
                  <small>
                    {d.code} · {d.source === "decision-lab" ? "Elegida en Decision Lab" : "Confirmada por ti"}
                    {d.reason ? ` · ${d.reason}` : ""}
                  </small>
                </div>
              </li>
            ))}
            {proposed.map((d) => (
              <li key={d.id} className="chat-list__item chat-list__item--proposed">
                <span className="chat-list__glyph" aria-hidden="true">◇</span>
                <div>
                  <p>{d.text}</p>
                  <small>Propuesta de la conversación · pendiente de tu confirmación{d.reason ? ` · ${d.reason}` : ""}</small>
                  <div className="chat-list__actions">
                    <button type="button" className="chat-mini chat-mini--ink" onClick={() => onAccept(d.id)}>
                      Incorporar
                    </button>
                    <button type="button" className="chat-mini" onClick={() => onDiscard(d.id)}>
                      Seguir explorando
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card cls="questions-card" glyph="?" title="Lo que falta" meta={pad(state.questions.length)} flash={touched.has("questions")}>
        {state.questions.length === 0 ? (
          <Empty symbol="◌" title="Todavía no hay preguntas abiertas." hint="Las dudas importantes aparecerán aquí, como preguntas." />
        ) : (
          <ul className="chat-list">
            {state.questions.map((q) => (
              <li key={q.id} className="chat-list__item">
                <span className="chat-list__glyph" aria-hidden="true">{q.critical ? "◆" : "◇"}</span>
                <div>
                  <p>{q.text}</p>
                  {q.critical ? <small>Crítica · conviene resolverla antes de avanzar</small> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {state.hypotheses.length ? (
        <Card cls="hypotheses-card" glyph="○" title="Supuestos" meta={pad(state.hypotheses.length)} flash={touched.has("hypotheses")}>
          <ul className="chat-list">
            {state.hypotheses.map((h) => (
              <li key={h.id} className="chat-list__item">
                <span className="chat-list__glyph chat-list__glyph--mono" aria-hidden="true">{h.code}</span>
                <div>
                  <p>{h.text}</p>
                  <small>{h.test ? `Prueba: ${h.test}` : "Sin prueba todavía · ¿qué lo pondría a prueba?"}</small>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card cls="next-card" glyph="→" title="Siguiente paso" flash={touched.has("next")}>
        {state.nextStep ? (
          <div className="insight-content">
            <span className="empty-symbol" aria-hidden="true">↗</span>
            <p className="next-step">
              {state.nextStep}
              <small>Algo concreto que puedes hacer fuera de aquí.</small>
            </p>
          </div>
        ) : (
          <Empty symbol="◌" title="Aparecerá cuando la idea tenga forma." hint="Un paso pequeño, concreto y comprobable." />
        )}
      </Card>

      <Card cls="highlight-card" glyph="✧" title="Para llevarte" flash={touched.has("highlight")}>
        <div className="insight-content">
          <span className="empty-symbol" aria-hidden="true">↗</span>
          <p>
            {state.highlight ?? "Una buena idea empieza con una buena pregunta."}
            <small>{state.highlight ? "Una pregunta para seguir explorando." : "Lo esencial de la conversación quedará aquí."}</small>
          </p>
        </div>
      </Card>

      <SourcesCard sources={state.sources} onAdd={onAddSource} flash={touched.has("sources")} />
    </aside>
  );
}

function SourcesCard({ sources, onAdd, flash }: { sources: IdeaState["sources"]; onAdd: (url: string) => Promise<string | null>; flash: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || busy) return;
    let normalized = value;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    try {
      new URL(normalized);
    } catch {
      setError("Esa dirección no parece válida.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onAdd(normalized);
    setBusy(false);
    if (err) setError(err);
    else setUrl("");
  }

  return (
    <Card cls="sources-card" glyph="⌕" title="Fuentes" meta={pad(sources.length)} flash={flash}>
      <div className="sources-body">
        {sources.length ? (
          <div className="source-chips">
            {sources.map((s) => (
              <div key={s.id} className="source-item">
                <button type="button" className="source-chip" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span aria-hidden="true">{s.kind === "web" ? "↗" : "·"}</span>
                  {s.title}
                </button>
                {open === s.id ? (
                  <p className="source-excerpt">
                    {s.excerpt || "Sin extracto."}
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        Abrir fuente ↗
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="sources-hint">Una fuente externa ayuda a contrastar lo que asumes.</p>
        )}
        <form className="source-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="source-url">Agregar fuente</label>
          <input id="source-url" type="text" inputMode="url" placeholder="Pega un enlace…" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} />
          <button type="submit" className="chat-mini" disabled={busy || !url.trim()}>
            {busy ? "Leyendo…" : "Agregar"}
          </button>
        </form>
        {error ? (
          <p className="source-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
