"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ButtonLink, cx } from "@/components/ui";
import { STATUS_LABEL, getStage } from "@/lib/fixtures";
import type { Decision, Hypothesis, Idea, OpenQuestion } from "@/lib/types";

/**
 * Mapa de la idea: La idea → Preguntas → Hipótesis → Decisiones → Siguiente paso.
 * Visual language from Decision Lab (screenshots 16–18): dotted canvas, bordered nodes, curved
 * monochrome edges and an inspector whose content belongs to the selected node only.
 */

type Kind = "idea" | "question" | "hypothesis" | "decision" | "next";
type MapNode = {
  id: string;
  kind: Kind;
  col: number;
  eyebrow: string;
  text: string;
  tentative?: boolean; // open question / proposed decision / untested hypothesis → dashed
  mark?: string;
};
type MapEdge = { from: string; to: string; tentative?: boolean };

const COLS = [
  { x: 1.5, label: "La idea" },
  { x: 21.5, label: "Preguntas" },
  { x: 41.5, label: "Hipótesis" },
  { x: 61.5, label: "Decisiones" },
  { x: 81.5, label: "Camino" },
];
const NODE_W = 17; // % of graph width
const NODE_H = 70; // px
const ROW_H = 90; // px
const TOP = 46; // px reserved for column labels

const H_MARK: Record<Hypothesis["status"], string> = { "sin-prueba": "○", "con-prueba": "◐", probada: "●", refutada: "✕" };
const H_LABEL: Record<Hypothesis["status"], string> = {
  "sin-prueba": "Sin prueba todavía",
  "con-prueba": "Con prueba definida",
  probada: "Puesta a prueba",
  refutada: "Refutada",
};

function nextStepAnchor(idea: Idea): string {
  const byTest = idea.hypotheses.find((h) => h.test && h.test === idea.nextStep.text);
  if (byTest) return byTest.id;
  const untested = idea.hypotheses.find((h) => h.critical && !h.test);
  if (untested) return untested.id;
  const lastDecision = [...idea.decisions].reverse().find((d) => d.status === "active");
  return lastDecision ? lastDecision.id : "root";
}

function buildGraph(idea: Idea) {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const decisions = idea.decisions.filter((d) => d.status !== "reverted");
  const hypIds = new Set(idea.hypotheses.map((h) => h.id));
  const decIds = new Set(decisions.map((d) => d.id));

  nodes.push({ id: "root", kind: "idea", col: 0, eyebrow: "TU IDEA", text: idea.title });

  for (const q of idea.questions) {
    nodes.push({ id: q.id, kind: "question", col: 1, eyebrow: `${q.code}${q.critical ? " · CRÍTICA" : ""}`, text: q.text, tentative: q.status === "open", mark: q.status === "open" ? "?" : "✓" });
    edges.push({ from: "root", to: q.id, tentative: q.status === "open" });
  }
  const resolvedTargets = new Set<string>();
  for (const q of idea.questions) {
    if (q.resolvedBy && (hypIds.has(q.resolvedBy) || decIds.has(q.resolvedBy))) {
      edges.push({ from: q.id, to: q.resolvedBy });
      resolvedTargets.add(q.resolvedBy);
    }
  }
  for (const h of idea.hypotheses) {
    nodes.push({ id: h.id, kind: "hypothesis", col: 2, eyebrow: `${h.code}${h.critical ? " · CRÍTICA" : ""}`, text: h.text, tentative: h.status === "sin-prueba", mark: H_MARK[h.status] });
    if (!resolvedTargets.has(h.id)) edges.push({ from: "root", to: h.id, tentative: h.status === "sin-prueba" });
  }
  for (const d of decisions) {
    nodes.push({ id: d.id, kind: "decision", col: 3, eyebrow: `${d.code}${d.status === "proposed" ? " · PROPUESTA" : ""}`, text: d.text, tentative: d.status === "proposed", mark: d.status === "active" ? "✓" : "◇" });
    const deps = (d.dependsOn ?? []).filter((id) => hypIds.has(id));
    if (deps.length) for (const h of deps) edges.push({ from: h, to: d.id, tentative: d.status === "proposed" });
    else if (!resolvedTargets.has(d.id)) edges.push({ from: "root", to: d.id, tentative: d.status === "proposed" });
  }
  nodes.push({ id: "next", kind: "next", col: 4, eyebrow: "SIGUIENTE PASO", text: idea.nextStep.text, mark: "↗" });
  edges.push({ from: nextStepAnchor(idea), to: "next" });

  // vertical layout: center each column
  const counts = COLS.map((_, c) => nodes.filter((n) => n.col === c).length);
  const rows = Math.max(3, ...counts);
  const height = TOP + rows * ROW_H + 18;
  const mid = TOP + (rows * ROW_H) / 2;
  const pos = new Map<string, { x: number; y: number }>();
  COLS.forEach((col, c) => {
    const inCol = nodes.filter((n) => n.col === c);
    inCol.forEach((n, i) => pos.set(n.id, { x: col.x, y: mid + (i - (inCol.length - 1) / 2) * ROW_H }));
  });
  return { nodes, edges, pos, height };
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x1 = a.x + NODE_W;
  const x2 = b.x;
  const k = (x2 - x1) * 0.5;
  return `M ${x1} ${a.y} C ${x1 + k} ${a.y}, ${x2 - k} ${b.y}, ${x2} ${b.y}`;
}

export function IdeaMap({ idea }: { idea: Idea }) {
  const { nodes, edges, pos, height } = useMemo(() => buildGraph(idea), [idea]);
  const [selected, setSelected] = useState<string>("root");
  const [zoom, setZoom] = useState(1);

  const lit = useMemo(() => {
    const set = new Set<string>([selected]);
    for (const e of edges) {
      if (e.from === selected) set.add(e.to);
      if (e.to === selected) set.add(e.from);
    }
    return set;
  }, [edges, selected]);

  const order = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);

  return (
    <div className="dl-workspace db-map">
      <div className="dl-graph-column">
        <div className="dl-bar">
          <span>⌘&nbsp;&nbsp;Mapa de tu idea <small>&nbsp;· de lo abstracto a lo claro</small></span>
          <div className="dl-tools" aria-label="Zoom del mapa">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))} aria-label="Alejar">−</button>
            <button type="button" onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))} aria-label="Acercar">+</button>
            <button type="button" onClick={() => { setZoom(1); setSelected("root"); }}>Ajustar vista</button>
          </div>
        </div>
        <div className="dl-canvas db-canvas">
          <div className="db-graph" style={{ height: height * zoom, width: `${Math.max(100, zoom * 100)}%`, minWidth: 760 * zoom }}>
            <div className="db-graph-inner" style={{ height, transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
              <ol className="db-cols" aria-hidden="true">
                {COLS.map((c, i) => (
                  <li key={c.label} style={{ left: `${c.x}%`, width: `${NODE_W}%` }}>
                    <span>{String(i + 1).padStart(2, "0")}</span> {c.label}
                  </li>
                ))}
              </ol>
              <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
                {edges.map((e, i) => {
                  const a = pos.get(e.from);
                  const b = pos.get(e.to);
                  if (!a || !b) return null;
                  const on = lit.has(e.from) && lit.has(e.to) && (e.from === selected || e.to === selected);
                  return (
                    <path
                      key={`${e.from}-${e.to}`}
                      d={edgePath(a, b)}
                      pathLength={1}
                      className={cx("db-edge", e.tentative && "is-tentative", on && "is-lit", selected !== "root" && !on && "is-dim")}
                      style={{ animationDelay: `${220 + i * 70}ms` }}
                    />
                  );
                })}
              </svg>
              {nodes.map((n) => {
                const p = pos.get(n.id)!;
                const isSel = n.id === selected;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={cx("db-node", `db-node--${n.kind}`, n.tentative && "is-tentative", isSel && "selected", !lit.has(n.id) && selected !== "root" && "is-dim")}
                    style={{ left: `${p.x}%`, top: p.y - NODE_H / 2, width: `${NODE_W}%`, height: NODE_H, animationDelay: `${n.col * 120 + (order.get(n.id) ?? 0) * 25}ms` }}
                    onClick={() => setSelected(n.id)}
                    aria-pressed={isSel}
                    title={n.text}
                  >
                    <small>
                      {n.mark ? <i aria-hidden="true">{n.mark}</i> : null}
                      {n.eyebrow}
                    </small>
                    <span>{n.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="db-legend" aria-hidden="true">
          <span><b className="db-legend-line" /> Conectado</span>
          <span><b className="db-legend-line is-tentative" /> Abierto o sin prueba</span>
          <span>○ sin prueba · ◐ con prueba · ● puesta a prueba</span>
        </div>
      </div>
      <Inspector key={selected} idea={idea} selected={selected} onSelect={setSelected} />
    </div>
  );
}

function Ref({ id, idea, onSelect }: { id: string; idea: Idea; onSelect: (id: string) => void }) {
  const item: { code: string; text: string } | undefined =
    idea.hypotheses.find((h) => h.id === id) ?? idea.decisions.find((d) => d.id === id) ?? idea.questions.find((q) => q.id === id);
  if (!item) return null;
  return (
    <button type="button" className="db-ref" onClick={() => onSelect(id)}>
      <b>{item.code}</b> {item.text}
    </button>
  );
}

function Inspector({ idea, selected, onSelect }: { idea: Idea; selected: string; onSelect: (id: string) => void }) {
  const chatHref = `/chat?idea=${idea.id}`;
  let body: React.ReactNode;
  let eyebrow = "";
  let title = "";
  let sub = "";
  let lab = false;

  if (selected === "root") {
    const stage = getStage(idea.stage);
    eyebrow = `TU IDEA · ${stage.number} / 04`;
    title = idea.title;
    sub = `${STATUS_LABEL[idea.status]} · ${stage.title}`;
    body = (
      <>
        <div>
          <h4>Empezó como</h4>
          <p className="db-quote">«{idea.initialPrompt}»</p>
        </div>
        <div>
          <h4>Tu tesis, hoy</h4>
          <p>{idea.thesis}</p>
        </div>
        <div>
          <h4>Dónde está</h4>
          <p>{idea.summary}</p>
        </div>
      </>
    );
  } else if (selected === "next") {
    const s = idea.nextStep;
    eyebrow = "SIGUIENTE PASO";
    title = s.text;
    sub = `Esfuerzo estimado: ${s.effort}`;
    body = (
      <>
        <div>
          <h4>Por qué este y no otro</h4>
          <p>{s.why}</p>
        </div>
        <div>
          <h4>Sabrás que terminaste cuando</h4>
          <p>{s.doneWhen}</p>
        </div>
      </>
    );
  } else {
    const q = idea.questions.find((x) => x.id === selected) as OpenQuestion | undefined;
    const h = idea.hypotheses.find((x) => x.id === selected) as Hypothesis | undefined;
    const d = idea.decisions.find((x) => x.id === selected) as Decision | undefined;
    if (q) {
      eyebrow = `PREGUNTA ${q.code}${q.critical ? " · CRÍTICA" : ""}`;
      title = q.text;
      sub = q.status === "open" ? "Abierta. Todavía no tiene respuesta." : "Respondida.";
      body = (
        <>
          {q.resolvedBy ? (
            <div>
              <h4>La respondió</h4>
              <Ref id={q.resolvedBy} idea={idea} onSelect={onSelect} />
            </div>
          ) : (
            <div>
              <h4>Por qué importa</h4>
              <p>{q.critical ? "Mientras siga abierta, la idea no puede pasar al siguiente paso con claridad." : "No bloquea el recorrido, pero conviene responderla antes de comprometer tiempo o dinero."}</p>
            </div>
          )}
        </>
      );
    } else if (h) {
      eyebrow = `HIPÓTESIS ${h.code}${h.critical ? " · CRÍTICA" : ""}`;
      title = h.text;
      sub = `${H_MARK[h.status]} ${H_LABEL[h.status]}`;
      const dependents = idea.decisions.filter((x) => x.dependsOn?.includes(h.id));
      body = (
        <>
          <div>
            <h4>Prueba concreta</h4>
            <p>{h.test ?? "Aún no hay una forma de ponerla a prueba. ¿Qué tendrías que observar para saber que te equivocas?"}</p>
          </div>
          {h.refutedIf ? (
            <div className="dl-context">
              <strong>La descartarías si:</strong> {h.refutedIf}
            </div>
          ) : null}
          {dependents.length ? (
            <div>
              <h4>Decisiones que dependen de ella</h4>
              <div className="db-refs">{dependents.map((x) => <Ref key={x.id} id={x.id} idea={idea} onSelect={onSelect} />)}</div>
            </div>
          ) : null}
        </>
      );
    } else if (d) {
      lab = d.source === "decision-lab";
      eyebrow = `DECISIÓN ${d.code}${d.status === "proposed" ? " · PROPUESTA" : ""}`;
      title = d.text;
      sub = d.source === "decision-lab" ? "Tomada en Decision Lab" : "Surgió en la conversación";
      body = (
        <>
          <div>
            <h4>Motivo</h4>
            <p>{d.reason}</p>
          </div>
          {d.question ? (
            <div className="dl-context">Resolvía: «{d.question}»</div>
          ) : null}
          {d.dependsOn?.length ? (
            <div>
              <h4>Se sostiene sobre</h4>
              <div className="db-refs">{d.dependsOn.map((id) => <Ref key={id} id={id} idea={idea} onSelect={onSelect} />)}</div>
            </div>
          ) : null}
          {d.status === "proposed" ? <p className="db-note">Propuesta: no cuenta como decidida hasta que la confirmes.</p> : null}
        </>
      );
    }
  }

  return (
    <aside className="dl-inspector db-inspector" aria-live="polite">
      <div className="db-inspector-head">
        <small className="db-eyebrow">{eyebrow}</small>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
      {body}
      <div className="dl-inspector-actions">
        {lab ? (
          <Link href={`/lab?idea=${idea.id}`} className="ui-button ui-button--block">Revisar en Decision Lab ↗</Link>
        ) : null}
        <ButtonLink href={chatHref} variant="primary" block>
          Continuar en el cuaderno ↗
        </ButtonLink>
      </div>
    </aside>
  );
}
