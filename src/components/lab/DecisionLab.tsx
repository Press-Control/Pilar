"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useToast } from "@/components/shell/preferences";
import { ideas } from "@/lib/fixtures";
import {
  INDEPENDENT,
  analyze,
  letter,
  projectContext,
  projectIdea,
  seedRecords,
  sentences,
  suggestAlternatives,
  type LabAnalysis,
  type LabRecord,
} from "./analysis";
import { DecisionGraph } from "./DecisionGraph";
import { Inspector } from "./Inspector";
import "./lab.css";

type Draft = {
  question: string;
  alternatives: string[];
  project: string;
  selected: number | null;
  analyzed: boolean;
  compact: boolean;
  zoom: number;
};

type DialogState = { kind: "compare" } | { kind: "confirm"; record: LabRecord; analysis: LabAnalysis } | null;

// Module-level memory: survives client-side navigation (lab → chat → lab), resets on reload.
let memDraft: Draft | null = null;
let memRecords: LabRecord[] | null = null;

const emptyDraft = (project: string): Draft => ({
  question: "",
  alternatives: ["", ""],
  project,
  selected: null,
  analyzed: false,
  compact: false,
  zoom: 1,
});

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chatHrefFor = (project: string) => (projectIdea(project) ? `/chat?idea=${encodeURIComponent(project)}` : undefined);

export function DecisionLab() {
  const params = useSearchParams();
  const ideaParam = params.get("idea");
  const notify = useToast();

  const [draft, setDraftState] = useState<Draft>(() => {
    const fromParam = ideaParam && projectIdea(ideaParam) ? ideaParam : null;
    if (memDraft && (!fromParam || memDraft.project === fromParam)) return memDraft;
    const d = emptyDraft(fromParam ?? ideas[0]?.id ?? INDEPENDENT);
    // Arriving from a project: preload its saved exploration so the editor is ready to analyze.
    const exp = fromParam ? projectIdea(fromParam)?.exploration : undefined;
    if (exp) {
      d.question = exp.question;
      d.alternatives = exp.alternatives.map((a) => a.name);
    }
    return d;
  });
  const [records, setRecordsState] = useState<LabRecord[]>(() => memRecords ?? seedRecords());
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; href?: string } | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const setDraft = (fn: (d: Draft) => Draft) =>
    setDraftState((d) => {
      const next = fn(d);
      memDraft = next;
      return next;
    });
  const setRecords = (fn: (r: LabRecord[]) => LabRecord[]) =>
    setRecordsState((r) => {
      const next = fn(r);
      memRecords = next;
      return next;
    });

  const questionRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLDetailsElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusLastOption = useRef(false);

  useEffect(() => {
    if (!draft.compact) questionRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (focusLastOption.current) {
      focusLastOption.current = false;
      const inputs = optionsRef.current?.querySelectorAll("input");
      inputs?.[inputs.length - 1]?.focus();
    }
  }, [draft.alternatives.length]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (dialog && !el.open) el.showModal();
    if (!dialog && el.open) el.close();
  }, [dialog]);

  const idea = projectIdea(draft.project);
  const context = projectContext(draft.project);
  const chatHref = chatHrefFor(draft.project);
  const projectRecords = records.filter((r) => r.project === draft.project);
  const activeRecord = projectRecords.find(
    (r) => r.active && r.question.trim().toLowerCase() === draft.question.trim().toLowerCase(),
  );

  const analysis = useMemo(
    () =>
      draft.analyzed && draft.selected !== null
        ? analyze(draft.selected, draft.question, draft.alternatives, draft.project)
        : null,
    [draft.analyzed, draft.selected, draft.question, draft.alternatives, draft.project],
  );

  /** Any edit invalidates the analysis (reference `invalidateDl`). */
  const edit = (fn: (d: Draft) => Draft) =>
    setDraft((d) => ({ ...fn(d), analyzed: false, selected: null, compact: false }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const values = draft.alternatives.map((v) => v.trim());
    if (!draft.question.trim() || values.some((v) => !v)) {
      setError("Escribe una decisión y completa entre 2 y 5 alternativas.");
      return;
    }
    if (new Set(values.map((v) => v.toLowerCase())).size !== values.length) {
      setError("Las alternativas deben ser distintas.");
      return;
    }
    setError(null);
    setDraft((d) => ({ ...d, alternatives: values, analyzed: true, selected: null, zoom: 1, compact: true }));
    setStatus({ text: "Comparación preparada. Selecciona un nodo para revisar sus hipótesis." });
  };

  const onSuggest = () => {
    const q = draft.question.trim();
    if (!q) {
      setError("Describe primero la decisión para poder sugerir enfoques.");
      return;
    }
    setError(null);
    edit((d) => ({ ...d, alternatives: suggestAlternatives(q) }));
    setStatus({ text: "Enfoques de ejemplo sugeridos por reglas locales. Renómbralos según tu proyecto." });
  };

  const onLoadSaved = () => {
    const exp = idea?.exploration;
    if (!exp) return;
    setError(null);
    edit((d) => ({ ...d, question: exp.question, alternatives: exp.alternatives.map((a) => a.name) }));
    setStatus({ text: "Exploración guardada del proyecto cargada. Revísala y analiza cuando quieras." });
  };

  const onSelect = (index: number | null) => {
    setDraft((d) => ({ ...d, selected: index }));
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches) {
      requestAnimationFrame(() =>
        inspectorRef.current?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }),
      );
    }
  };

  const setZoom = (value: number) => setDraft((d) => ({ ...d, zoom: Math.min(1.6, Math.max(0.65, value)) }));
  const onFit = () => {
    setZoom(1);
    canvasRef.current?.scrollTo({ top: 0, left: 0, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  const onChoose = (index: number) => {
    const a = analyze(index, draft.question, draft.alternatives, draft.project);
    const record: LabRecord = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: new Date().toISOString(),
      project: draft.project,
      projectText: idea?.title ?? "Exploración independiente",
      question: draft.question,
      alternatives: [...draft.alternatives],
      choice: a.name,
      requirements: sentences(a.requirements),
      active: true,
    };
    setDialog({ kind: "confirm", record, analysis: a });
  };

  const onConfirm = () => {
    if (dialog?.kind !== "confirm") return;
    const record = dialog.record;
    // A new confirmed choice for the same question replaces the previous active effect (audit kept).
    setRecords((rs) => [
      record,
      ...rs.map((r) =>
        r.active && r.project === record.project && r.question.trim().toLowerCase() === record.question.trim().toLowerCase()
          ? { ...r, active: false }
          : r,
      ),
    ]);
    setDialog(null);
    if (projectIdea(record.project)) {
      notify("Decisión incorporada. Continúa en tu proyecto.");
      setStatus({ text: `Decisión incorporada: ${record.question} → ${record.choice}.`, href: chatHrefFor(record.project) });
    } else {
      notify("Elección guardada. Selecciona un proyecto para conectarla.");
      setStatus({ text: "Elección guardada en el historial independiente." });
    }
  };

  const onUndo = (id: string) => {
    setRecords((rs) => rs.map((r) => (r.id === id ? { ...r, active: false } : r)));
    notify("Cambio deshecho. El historial se conserva.");
    setStatus({ text: "Cambio deshecho. La elección ya no está activa en el proyecto; el registro se conserva." });
  };

  const onReview = (r: LabRecord) => {
    const alts = r.alternatives.length >= 2 ? r.alternatives : [r.choice, ""];
    const idx = alts.findIndex((a) => a.toLowerCase() === r.choice.toLowerCase());
    const ready = alts.every((a) => a.trim());
    setDraft((d) => ({
      ...d,
      project: r.project,
      question: r.question,
      alternatives: [...alts],
      selected: ready && idx >= 0 ? idx : null,
      analyzed: ready,
      compact: ready,
      zoom: 1,
    }));
    setStatus({ text: "Revisando una elección anterior. Puedes volver a explorar; nada se reaplica sin tu confirmación." });
    window.scrollTo?.({ top: 0 });
    document.querySelector(".decision-lab")?.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  const showHistory = () => {
    const h = historyRef.current;
    if (!h) return;
    h.open = true;
    h.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" });
  };

  return (
    <section className="decision-lab dl-enter" aria-label="Decision Lab">
      <div className="dl-heading">
        <div>
          <div className="eyebrow">EL PILAR / UN ESPACIO PARA EXPLORAR</div>
          <h2>
            Decision Lab<span className="dl-dot">.</span>
          </h2>
          <p>Explora alternativas antes de decidir.</p>
        </div>
        <div className="dl-heading-actions">
          <label className="dl-project">
            PROYECTO ACTUAL
            <select
              value={draft.project}
              onChange={(e) => {
                const project = e.target.value;
                edit((d) => ({ ...d, project }));
                setStatus(null);
              }}
            >
              <option value={INDEPENDENT}>Exploración independiente</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title.slice(0, 65)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="dl-button" onClick={showHistory}>
            ◷ Historial
          </button>
        </div>
      </div>

      <form
        className={`dl-editor${draft.compact ? " dl-compact" : ""}`}
        data-question={draft.question}
        onSubmit={onSubmit}
        noValidate
      >
        <button
          className="dl-button"
          type="button"
          id="dlEdit"
          hidden={!draft.compact}
          onClick={() => {
            setDraft((d) => ({ ...d, compact: false }));
            requestAnimationFrame(() => questionRef.current?.focus());
          }}
        >
          Editar alternativas
        </button>
        <label className="dl-field" htmlFor="dlQuestion">
          ¿Qué decisión necesitas tomar?
        </label>
        <input
          ref={questionRef}
          className="dl-question"
          id="dlQuestion"
          maxLength={220}
          required
          placeholder="Por ejemplo: ¿cómo debería probar mi proyecto?"
          value={draft.question}
          onChange={(e) => {
            const question = e.target.value;
            edit((d) => ({ ...d, question }));
          }}
        />
        <div className="dl-options" ref={optionsRef}>
          {draft.alternatives.map((v, i) => (
            <div className="dl-option" key={i}>
              <span>{letter(i)}</span>
              <input
                aria-label={`Alternativa ${i + 1}`}
                maxLength={100}
                value={v}
                placeholder="Nombre de la alternativa"
                onChange={(e) => {
                  const value = e.target.value;
                  edit((d) => ({ ...d, alternatives: d.alternatives.map((x, j) => (j === i ? value : x)) }));
                }}
              />
              <button
                type="button"
                aria-label={`Quitar alternativa ${i + 1}`}
                disabled={draft.alternatives.length <= 2}
                onClick={() => edit((d) => ({ ...d, alternatives: d.alternatives.filter((_, j) => j !== i) }))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="dl-editor-actions">
          <div>
            <button
              className="dl-button"
              type="button"
              disabled={draft.alternatives.length >= 5}
              onClick={() => {
                focusLastOption.current = true;
                edit((d) => ({ ...d, alternatives: [...d.alternatives, ""] }));
              }}
            >
              ＋ Agregar alternativa
            </button>
            <button className="dl-button" type="button" onClick={onSuggest}>
              ✧ Sugerir alternativas · local
            </button>
            {idea?.exploration && (
              <button className="dl-button" type="button" onClick={onLoadSaved}>
                ↺ Retomar exploración del proyecto
              </button>
            )}
          </div>
          <button className="dl-button dl-primary" type="submit">
            Analizar opciones ↗
          </button>
        </div>
        <p className="dl-disclosure">
          Guía local: estructura hipótesis para comparar. No verifica viabilidad ni recomienda automáticamente.
          Ningún cambio se aplica sin tu confirmación.
        </p>
        {error && (
          <p className="dl-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <div className="dl-workspace">
        <DecisionGraph
          ref={canvasRef}
          analyzed={draft.analyzed}
          question={draft.question}
          alternatives={draft.alternatives}
          selected={draft.selected}
          zoom={draft.zoom}
          activeChoice={activeRecord?.choice}
          onSelect={onSelect}
          onZoom={(delta) => setZoom(draft.zoom + delta)}
          onFit={onFit}
        />
        <Inspector
          ref={inspectorRef}
          analyzed={draft.analyzed}
          context={context}
          chatHref={chatHref}
          analysis={analysis}
          onCompare={() => setDialog({ kind: "compare" })}
          onChoose={onChoose}
        />
      </div>

      <details className="dl-history" ref={historyRef}>
        <summary>
          Historial de exploraciones <span>· {projectRecords.length}</span>
        </summary>
        <div>
          {projectRecords.length ? (
            projectRecords.map((r) => (
              <div className="dl-history-item" key={r.id}>
                <div>
                  <strong>{r.choice}</strong>
                  <small>
                    {r.question}
                    <br />
                    {new Date(r.date).toLocaleDateString("es-MX")} ·{" "}
                    {r.active ? "Incorporada al proyecto" : "Cambio deshecho"}
                  </small>
                </div>
                <div className="dl-history-actions">
                  <button type="button" className="dl-button" onClick={() => onReview(r)}>
                    Revisar
                  </button>
                  {r.active && (
                    <button type="button" className="dl-button" onClick={() => onUndo(r.id)}>
                      Deshacer
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="dl-history-empty">Las elecciones que confirmes aparecerán aquí.</p>
          )}
        </div>
      </details>
      <p className="dl-status" role="status">
        {status?.text}
        {status?.href && (
          <>
            {" "}
            <Link href={status.href} className="dl-status-link">
              Continuar en el chat del proyecto ↗
            </Link>
          </>
        )}
      </p>

      <dialog
        ref={dialogRef}
        className="dl-dialog"
        aria-label="Revisión de Decision Lab"
        onClose={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      >
        {dialog?.kind === "compare" && (
          <>
            <h3>Comparar alternativas</h3>
            <p>Hipótesis locales para orientar tu revisión. No son hechos verificados.</p>
            <div style={{ overflow: "auto" }} tabIndex={0} role="region" aria-label="Tabla de comparación">
              <table className="dl-compare">
                <thead>
                  <tr>
                    <th>Alternativa</th>
                    <th>Beneficio posible</th>
                    <th>Riesgo / requisito</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.alternatives.map((v, i) => {
                    const a = analyze(i, draft.question, draft.alternatives, draft.project);
                    return (
                      <tr key={i}>
                        <th>{v}</th>
                        <td>{a.benefits.join(" ")}</td>
                        <td>
                          {a.risks.join(" ")}
                          <br />
                          {sentences(a.requirements)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="dl-dialog-actions">
              <button type="button" className="dl-button" autoFocus onClick={() => setDialog(null)}>
                Volver al grafo
              </button>
            </div>
          </>
        )}
        {dialog?.kind === "confirm" && (
          <>
            <div className="eyebrow">REVISAR ANTES DE APLICAR</div>
            <h3 style={{ marginTop: 12 }}>Así cambiaría tu proyecto.</h3>
            <p>Proyecto: {projectIdea(dialog.record.project)?.thesis ?? "Exploración independiente"}</p>
            <div className="dl-change">
              <strong>＋ Decisión en el historial</strong>
              <p>
                {dialog.record.question} → {dialog.record.choice}
              </p>
            </div>
            <div className="dl-change">
              <strong>{projectIdea(dialog.record.project) ? "＋ Conexión en el mapa principal" : "Exploración sin proyecto"}</strong>
              <p>
                {projectIdea(dialog.record.project)
                  ? `Tu idea → ${dialog.record.choice}. Quedará vinculada a esta exploración.`
                  : "La elección se guardará en el historial independiente. Para conectarla al mapa, selecciona un proyecto antes de confirmar."}
              </p>
            </div>
            <div className="dl-change">
              <strong>Revisar al ejecutar</strong>
              <p>
                {sentences(dialog.analysis.requirements)} La confirmación registra tu elección; no ejecuta tareas ni
                modifica el texto de tu idea.
              </p>
            </div>
            <div className="dl-dialog-actions">
              <button type="button" className="dl-button" autoFocus onClick={() => setDialog(null)}>
                Seguir explorando
              </button>
              <button type="button" className="dl-button dl-primary" onClick={onConfirm}>
                Confirmar e incorporar
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
