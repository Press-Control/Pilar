import type { ReactNode } from "react";
import { cx } from "./cx";
import { JOURNEY_STAGES } from "@/lib/fixtures";
import type { JourneyStageId } from "@/lib/types";

/** Empty state: symbol + text + small explanation (reference .insight-content). */
export function EmptyState({ symbol = "◌", title, hint, className }: { symbol?: ReactNode; title: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx("ui-empty", className)}>
      <span className="ui-empty__symbol" aria-hidden="true">{symbol}</span>
      <p>
        {title}
        {hint ? <small>{hint}</small> : null}
      </p>
    </div>
  );
}

/** 2px journey progress line. value 0..1. Expresses recorrido, never probability of success. */
export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="ui-progress" role="img" aria-label={label ?? "Recorrido de la idea"}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Horizontal 4-stage journey (La intuición → El siguiente paso). Vertical under 850px. */
export function JourneyStepper({ current, className }: { current: JourneyStageId; className?: string }) {
  const idx = JOURNEY_STAGES.findIndex((s) => s.id === current);
  return (
    <ol className={cx("ui-stepper", className)} aria-label="El recorrido de tu idea">
      {JOURNEY_STAGES.map((s, i) => (
        <li key={s.id} className={cx(i < idx && "is-done", i === idx && "is-current")} aria-current={i === idx ? "step" : undefined}>
          <span>{i < idx ? "✓" : s.number}</span>
          <div>
            {s.title}
            <small>{s.subtitle}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Three discrete dots + optional status text. Show while streaming, not as decoration. */
export function ThinkingIndicator({ label = "Pensando" }: { label?: string }) {
  return (
    <span className="ui-thinking" role="status" aria-live="polite">
      <i /><i /><i />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/** Large number + small caps label. Use counts only (no fake percentages / scores). */
export function Stat({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat__value">{value}</span>
      <span className="ui-stat__label">{label}</span>
    </div>
  );
}
