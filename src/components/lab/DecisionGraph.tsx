"use client";

import { forwardRef } from "react";
import { letter } from "./analysis";

type Props = {
  analyzed: boolean;
  question: string;
  alternatives: string[];
  selected: number | null;
  zoom: number;
  activeChoice?: string;
  onSelect: (index: number | null) => void;
  onZoom: (delta: number) => void;
  onFit: () => void;
};

/** Graph: only the decision and its direct alternatives (no Inicio/Mitad/Final nodes). */
export const DecisionGraph = forwardRef<HTMLDivElement, Props>(function DecisionGraph(
  { analyzed, question, alternatives, selected, zoom, activeChoice, onSelect, onZoom, onFit },
  canvasRef,
) {
  const n = alternatives.length;
  const height = Math.max(390, n * 94);
  const positions = alternatives.map((_, i) => ((i + 0.5) / n) * 100);

  return (
    <section className="dl-graph-column" aria-label="Grafo de alternativas">
      <div className="dl-bar">
        <span>⌘ &nbsp; Tu decisión, en perspectiva</span>
        <div className="dl-tools">
          <button type="button" aria-label="Alejar grafo" onClick={() => onZoom(-0.15)} disabled={!analyzed}>−</button>
          <button type="button" aria-label="Acercar grafo" onClick={() => onZoom(0.15)} disabled={!analyzed}>＋</button>
          <button type="button" onClick={onFit}>Ajustar vista</button>
        </div>
      </div>
      <div className="dl-canvas" ref={canvasRef}>
        {!analyzed ? (
          <div className="dl-empty">
            <span aria-hidden="true">⌘</span>
            <p>
              Una decisión.
              <br />
              Varias formas de avanzar.
            </p>
            <p style={{ fontSize: 11 }}>Escribe tus alternativas y analízalas para ver sus conexiones.</p>
          </div>
        ) : (
          <div
            className="dl-graph"
            style={{ width: `${100 * zoom}%`, minWidth: `${570 * zoom}px`, height: `${height * zoom}px` }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {positions.map((y, i) => (
                <path
                  key={i}
                  d={`M35 50 C46 50 46 ${y} 58 ${y}`}
                  className={selected === i ? "dl-path-selected" : undefined}
                />
              ))}
            </svg>
            <button
              type="button"
              className={`dl-node${selected === null ? " selected" : ""}`}
              aria-label="Ver resumen de la decisión"
              aria-pressed={selected === null}
              onClick={() => onSelect(null)}
            >
              <small>LA DECISIÓN</small>
              {question}
            </button>
            {alternatives.map((name, i) => (
              <button
                type="button"
                key={i}
                className={`dl-node option-node${selected === i ? " selected" : ""}`}
                style={{ top: `${positions[i]}%` }}
                aria-pressed={selected === i}
                onClick={() => onSelect(i)}
              >
                <span>
                  ALTERNATIVA {letter(i)}
                  {activeChoice && activeChoice.toLowerCase() === name.toLowerCase() ? " · ✓ INCORPORADA" : ""}
                </span>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
