"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { letter, type LabAnalysis } from "./analysis";

type Props = {
  analyzed: boolean;
  context: string;
  chatHref?: string;
  analysis: LabAnalysis | null;
  onCompare: () => void;
  onChoose: (index: number) => void;
};

function Items({ items }: { items: string[] }) {
  if (items.length === 1) return <p>{items[0]}</p>;
  return (
    <ul>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/** Inspector: side panel on web; stacked below the graph on mobile (CSS). */
export const Inspector = forwardRef<HTMLElement, Props>(function Inspector(
  { analyzed, context, chatHref, analysis, onCompare, onChoose },
  ref,
) {
  if (!analysis) {
    return (
      <aside className="dl-inspector" ref={ref} aria-label="Inspector de alternativa" aria-live="polite">
        <div className="eyebrow">EL CONTEXTO IMPORTA</div>
        <h3>{analyzed ? "Explora cada posibilidad." : "Antes de decidir."}</h3>
        <p>Selecciona una alternativa para explorar cómo podría afectar tu proyecto.</p>
        <div className="dl-context">{context}</div>
        {analyzed && (
          <button type="button" className="dl-button" onClick={onCompare}>
            Comparar alternativas
          </button>
        )}
        {chatHref && (
          <Link className="dl-button" href={chatHref}>
            Volver al chat del proyecto ↗
          </Link>
        )}
        <p style={{ fontSize: 10, marginTop: "auto" }}>
          El grafo contiene solo la decisión y sus alternativas. Tú eliges qué incorporar.
        </p>
      </aside>
    );
  }

  const a = analysis;
  return (
    <aside className="dl-inspector" ref={ref} aria-label="Inspector de alternativa" aria-live="polite">
      <div>
        <div className="eyebrow">ALTERNATIVA {letter(a.index)}</div>
        <h3 style={{ marginTop: 10 }}>{a.name}</h3>
        <p>Un enfoque posible, pendiente de validar.</p>
      </div>
      <section>
        <h4>Impacto en el proyecto</h4>
        <p>{a.impact}</p>
        <div className="dl-context" style={{ marginTop: 10 }}>
          Contexto real: {context}
        </div>
      </section>
      <section>
        <h4>Beneficios potenciales</h4>
        <Items items={a.benefits} />
      </section>
      <section>
        <h4>Desafíos y riesgos</h4>
        <Items items={a.risks} />
      </section>
      <section>
        <h4>Requisitos</h4>
        <Items items={a.requirements} />
      </section>
      <section>
        <h4>Resultado esperado</h4>
        <p>{a.outcome}</p>
      </section>
      <details>
        <summary>Razonamiento, supuestos e incertidumbre</summary>
        <p>{a.reason}</p>
        {a.assumptions.length > 0 && (
          <>
            <p><strong>Supuestos</strong></p>
            <Items items={a.assumptions} />
          </>
        )}
        {a.unknowns.length > 0 && (
          <>
            <p><strong>Lo que aún no sabes</strong></p>
            <Items items={a.unknowns} />
          </>
        )}
      </details>
      <div className="dl-inspector-actions">
        <button type="button" className="dl-button" onClick={onCompare}>
          Comparar alternativas
        </button>
        <button type="button" className="dl-button dl-primary" onClick={() => onChoose(a.index)}>
          Elegir esta alternativa ↗
        </button>
      </div>
    </aside>
  );
});
