"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink, Card, CardHeader, Chip, Eyebrow, JourneyStepper, Progress, Stat, cx } from "@/components/ui";
import { JOURNEY_STAGES, STATUS_LABEL, formatDate, getStage, ideas, readiness } from "@/lib/fixtures";
import type { Idea, Risk, Source } from "@/lib/types";
import { IdeaMap } from "./IdeaMap";
import "./dashboard.css";

const RISK_BARS: Record<Risk["level"], string> = { alto: "▮▮▮", medio: "▮▮▯", bajo: "▮▯▯" };
const SOURCE_GLYPH: Record<Source["kind"], string> = { web: "↗", entrevista: "❝", documento: "▤", observación: "◉" };

function journey(idea: Idea) {
  const s = getStage(idea.stage);
  return { stage: s, value: (s.index + 1) / JOURNEY_STAGES.length };
}

export function Dashboard({ initialId }: { initialId?: string }) {
  const [selectedId, setSelectedId] = useState<string>(ideas.find((i) => i.id === initialId)?.id ?? ideas[0]!.id);
  const idea = ideas.find((i) => i.id === selectedId) ?? ideas[0]!;

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("idea", selectedId);
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  }, [selectedId]);

  return (
    <section className="page-region db" aria-label="Tus ideas">
      <div className="page-heading db-enter">
        <div>
          <Eyebrow>EL PILAR / TUS IDEAS</Eyebrow>
          <h2>Tus ideas<span>.</span></h2>
          <p>Dónde está cada una, qué ya decidiste y qué le falta.</p>
        </div>
        <ButtonLink href="/" variant="outline">＋&nbsp;Nueva idea</ButtonLink>
      </div>

      <div className="db-ideas db-enter" role="tablist" aria-label="Ideas guardadas" style={{ animationDelay: "80ms" }}>
        {ideas.map((it) => {
          const j = journey(it);
          const open = it.questions.filter((q) => q.status === "open").length;
          const active = it.decisions.filter((d) => d.status === "active").length;
          const sel = it.id === idea.id;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={sel}
              className={cx("db-idea", sel && "is-selected")}
              onClick={() => setSelectedId(it.id)}
            >
              <span className="db-idea-top">
                <span className="db-mono">{formatDate(it.updatedAt)}</span>
                <Chip tone={sel ? "ink" : "solid"}>{STATUS_LABEL[it.status]}</Chip>
              </span>
              <strong>{it.title}</strong>
              <em>«{it.initialPrompt}»</em>
              <span className="db-idea-stage">
                <span className="db-mono">{j.stage.number} / 04</span> {j.stage.title}
              </span>
              <Progress value={j.value} label={`Recorrido: ${j.stage.title}`} />
              <span className="db-idea-counts db-mono">
                {active} {active === 1 ? "decisión" : "decisiones"} · {open} {open === 1 ? "pregunta abierta" : "preguntas abiertas"}
              </span>
            </button>
          );
        })}
        <Link href="/" className="db-idea db-idea--new">
          <span className="db-new-plus" aria-hidden="true">＋</span>
          <strong>Empezar otra idea</strong>
          <em>Todo empieza con una idea, aunque todavía no sepas explicarla.</em>
        </Link>
      </div>

      <IdeaDetail key={idea.id} idea={idea} />
    </section>
  );
}

function IdeaDetail({ idea }: { idea: Idea }) {
  const { stage } = journey(idea);
  const ready = readiness(idea);
  const activeDecisions = idea.decisions.filter((d) => d.status !== "reverted");
  const openQuestions = idea.questions.filter((q) => q.status === "open");
  const critical = idea.hypotheses.filter((h) => h.critical);
  const criticalWithTest = critical.filter((h) => h.test).length;
  const chatHref = `/chat?idea=${idea.id}`;

  return (
    <div className="db-detail">
      {/* De lo abstracto a lo claro */}
      <section className="db-arc ui-card db-enter" style={{ animationDelay: "140ms" }} aria-label="De lo abstracto a lo claro">
        <div className="db-arc-from">
          <Eyebrow>EMPEZÓ COMO</Eyebrow>
          <p>«{idea.initialPrompt}»</p>
        </div>
        <div className="db-arc-arrow" aria-hidden="true">
          <span />→
        </div>
        <div className="db-arc-to">
          <Eyebrow>HOY ES · {stage.number} / 04 {stage.title.toUpperCase()}</Eyebrow>
          <p>{idea.thesis}</p>
        </div>
        <div className="db-arc-steps">
          <JourneyStepper current={idea.stage} />
        </div>
      </section>

      <div className="db-stats db-enter" style={{ animationDelay: "200ms" }}>
        <Stat value={activeDecisions.filter((d) => d.status === "active").length} label="Decisiones tomadas" />
        <Stat value={<>{criticalWithTest}<small> / {critical.length}</small></>} label="Hipótesis críticas con prueba" />
        <Stat value={openQuestions.length} label="Preguntas abiertas" />
        <Stat value={idea.sources.length} label="Fuentes" />
      </div>

      <div className="db-enter" style={{ animationDelay: "260ms" }}>
        <IdeaMap idea={idea} />
      </div>

      <div className="db-grid db-grid--path db-enter" style={{ animationDelay: "320ms" }}>
        <Card className="db-next">
          <CardHeader glyph="↗" title="Tu siguiente paso" meta={idea.nextStep.effort} />
          <div className="db-next-body">
            <p className="db-next-text">{idea.nextStep.text}</p>
            <dl>
              <div>
                <dt>Por qué</dt>
                <dd>{idea.nextStep.why}</dd>
              </div>
              <div>
                <dt>Sabrás que terminaste cuando</dt>
                <dd>{idea.nextStep.doneWhen}</dd>
              </div>
            </dl>
            <div className="db-next-actions">
              <ButtonLink href={chatHref} variant="primary" size="lg">Continuar en el cuaderno ↗</ButtonLink>
              {idea.exploration ? <ButtonLink href={`/lab?idea=${idea.id}`} size="lg">Abrir Decision Lab</ButtonLink> : null}
            </div>
          </div>
        </Card>

        <Card className="db-ready">
          <CardHeader glyph="◇" title="Qué le falta" meta={ready.ready ? "nada crítico" : `${ready.blockers.length} por responder`} />
          {ready.ready ? (
            <p className="db-ready-ok">Tiene una tesis, decisiones con motivo y una prueba para cada hipótesis crítica. Lo que sigue es salir a ponerla a prueba.</p>
          ) : (
            <ul className="ui-list">
              {ready.blockers.map((b, i) => (
                <li key={i}>
                  <span className="ui-list__glyph">?</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="db-foot">No es una calificación: es lo que todavía no sabes.</p>
        </Card>
      </div>

      <div className="db-grid db-grid--three db-enter" style={{ animationDelay: "380ms" }}>
        <Card>
          <CardHeader glyph="✓" title="Decisiones clave" meta={String(activeDecisions.length).padStart(2, "0")} />
          <ul className="ui-list">
            {activeDecisions.map((d) => (
              <li key={d.id} className={cx(d.status === "proposed" && "db-tentative")}>
                <span className="ui-list__glyph">{d.code}</span>
                <span>
                  {d.text}
                  <small>{d.status === "proposed" ? "Propuesta · " : ""}{d.reason}</small>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader glyph="?" title="Preguntas abiertas" meta={String(openQuestions.length).padStart(2, "0")} />
          {openQuestions.length ? (
            <ul className="ui-list">
              {openQuestions.map((q) => (
                <li key={q.id}>
                  <span className="ui-list__glyph">{q.code}</span>
                  <span>
                    {q.text}
                    {q.critical ? <small>Crítica: bloquea el siguiente paso.</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="db-ready-ok">No quedan preguntas abiertas.</p>
          )}
        </Card>

        <Card>
          <CardHeader glyph="△" title="Riesgos" meta={String(idea.risks.length).padStart(2, "0")} />
          <ul className="ui-list">
            {idea.risks.map((r) => (
              <li key={r.id}>
                <span className="ui-list__glyph db-bars" title={`Riesgo ${r.level}`}>{RISK_BARS[r.level]}</span>
                <span>
                  {r.text}
                  {r.mitigation ? <small>Cómo reducirlo: {r.mitigation}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="db-grid db-grid--two db-enter" style={{ animationDelay: "440ms" }}>
        <Card>
          <CardHeader glyph="❝" title="Fuentes" meta={String(idea.sources.length).padStart(2, "0")} />
          <ul className="ui-list">
            {idea.sources.map((s) => (
              <li key={s.id}>
                <span className="ui-list__glyph">{SOURCE_GLYPH[s.kind]}</span>
                <span>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="db-link">{s.title} ↗</a>
                  ) : (
                    s.title
                  )}
                  <small>
                    <span className="db-mono">{s.kind.toUpperCase()}</span> · {s.note}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader glyph="✕" title="Lo que dejaste atrás" meta={String(idea.discarded.length).padStart(2, "0")} />
          <ul className="ui-list">
            {idea.discarded.map((x) => (
              <li key={x.id} className="db-discarded">
                <span className="ui-list__glyph">{x.code}</span>
                <span>
                  <s>{x.text}</s>
                  <small>{x.reason}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="db-foot">Descartar también es avanzar: queda el motivo.</p>
        </Card>
      </div>

      <p className="db-caption">
        <span className="ui-dot" /> Ideas de demostración · El recorrido muestra en qué etapa está la idea, no una probabilidad de éxito.
      </p>
    </div>
  );
}
