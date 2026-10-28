/**
 * Chat state model (chat agent). Pure helpers: building the initial state from a fixture idea,
 * merging the structured <<<UPDATES>>> side-channel, deriving the idea map and the wire payload.
 */
import type { ChatMessage, ChatUpdates } from "@/lib/chat-types";
import { JOURNEY_STAGES, getIdea, readiness } from "@/lib/fixtures";
import type { JourneyStageId } from "@/lib/types";

export type MsgStatus = "streaming" | "done" | "error" | "stopped";

export type UIMessage = {
  id: string;
  /** "event" = structured project event (decision incorporated, source added). Not typed by the person. */
  role: "user" | "assistant" | "event";
  content: string;
  status?: MsgStatus;
  /** Set on a user message whose turn failed before any text arrived. */
  failed?: string;
  /** Set on an assistant message broken midway. */
  error?: string;
  engine?: string | null;
  /** For events: how to send it as context. */
  eventKind?: "decision" | "source" | "decision-removed";
};

export type UIDecision = { id: string; code: string; text: string; reason?: string; status: "active" | "proposed"; source: "chat" | "decision-lab" };
export type UIQuestion = { id: string; text: string; critical: boolean };
export type UIHypothesis = { id: string; code: string; text: string; test?: string };
export type UISource = { id: string; title: string; url?: string; excerpt?: string; kind: string };

export type IdeaState = {
  title: string | null;
  concept: string | null;
  stage: JourneyStageId;
  decisions: UIDecision[];
  questions: UIQuestion[];
  hypotheses: UIHypothesis[];
  nextStep: string | null;
  highlight: string | null;
  sources: UISource[];
};

export type ChatSnapshot = { messages: UIMessage[]; state: IdeaState; engine: string | null };

export const STORAGE_PREFIX = "pilar-chat:v1:";

let counter = 0;
export function uid(prefix = "m"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyState(): IdeaState {
  return { title: null, concept: null, stage: "intuicion", decisions: [], questions: [], hypotheses: [], nextStep: null, highlight: null, sources: [] };
}

export function initialSnapshot(ideaId?: string | null): ChatSnapshot {
  const idea = getIdea(ideaId);
  if (!idea) return { messages: [], state: emptyState(), engine: null };
  const blockers = readiness(idea).blockers;
  return {
    engine: null,
    messages: idea.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, status: "done" as const })),
    state: {
      title: idea.title,
      concept: idea.thesis,
      stage: idea.stage,
      decisions: idea.decisions
        .filter((d) => d.status !== "reverted")
        .map((d) => ({ id: d.id, code: d.code, text: d.text, reason: d.reason, status: d.status === "active" ? "active" : "proposed", source: d.source })),
      questions: idea.questions.filter((q) => q.status === "open").map((q) => ({ id: q.id, text: q.text, critical: q.critical })),
      hypotheses: idea.hypotheses.map((h) => ({ id: h.id, code: h.code, text: h.text, test: h.test })),
      nextStep: idea.nextStep.text,
      highlight: blockers[0] ?? idea.nextStep.why,
      sources: idea.sources.map((s) => ({ id: s.id, title: s.title, url: s.url, excerpt: s.note, kind: s.kind })),
    },
  };
}

export function stageIndex(id: JourneyStageId): number {
  return Math.max(0, JOURNEY_STAGES.findIndex((s) => s.id === id));
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Merge the structured side-channel. Returns the new state and which cards changed (for a soft flash). */
export function applyUpdates(prev: IdeaState, u: ChatUpdates): { state: IdeaState; touched: string[] } {
  const touched: string[] = [];
  const next: IdeaState = { ...prev };

  if (u.decisions?.length) {
    const have = new Set(prev.decisions.map((d) => norm(d.text)));
    const add = u.decisions.filter((d) => d?.text && !have.has(norm(d.text)));
    if (add.length) {
      let n = prev.decisions.length;
      next.decisions = [
        ...prev.decisions,
        ...add.map((d) => ({ id: uid("d"), code: `D${++n}`, text: d.text, reason: d.reason, status: "proposed" as const, source: "chat" as const })),
      ];
      touched.push("decisions", "map");
    }
  }
  if (u.questions?.length) {
    const have = new Set(prev.questions.map((q) => norm(q.text)));
    const add = u.questions.filter((q) => q?.text && !have.has(norm(q.text)));
    if (add.length) {
      next.questions = [...add.map((q) => ({ id: uid("q"), text: q.text, critical: !!q.critical })), ...prev.questions].slice(0, 6);
      touched.push("questions");
    }
  }
  if (u.hypotheses?.length) {
    const have = new Set(prev.hypotheses.map((h) => norm(h.text)));
    const add = u.hypotheses.filter((h) => h?.text && !have.has(norm(h.text)));
    if (add.length) {
      let n = prev.hypotheses.length;
      next.hypotheses = [...prev.hypotheses, ...add.map((h) => ({ id: uid("h"), code: `H${++n}`, text: h.text, test: h.test }))];
      touched.push("hypotheses", "map");
    }
  }
  if (u.nextStep && u.nextStep !== prev.nextStep) {
    next.nextStep = u.nextStep;
    touched.push("next", "map");
  }
  if (u.stage && JOURNEY_STAGES.some((s) => s.id === u.stage) && u.stage !== prev.stage) {
    next.stage = u.stage;
    touched.push("stage");
  }
  if (u.highlight && u.highlight !== prev.highlight) {
    next.highlight = u.highlight;
    touched.push("highlight");
  }
  return { state: next, touched };
}

const STAGE_HIGHLIGHTS = [
  "¿Qué te gustaría que cambiara al desarrollar esta idea?",
  "¿Qué estás dando por hecho?",
  "¿Cómo podrías comprobarlo a pequeña escala?",
  "Un siguiente paso concreto hace la idea más fácil de probar.",
];

/** Fallback when the engine sends no structured updates: advance with the conversation (never backwards). */
export function fallbackProgress(prev: IdeaState, messages: UIMessage[]): IdeaState {
  const users = messages.filter((m) => m.role === "user");
  const byCount = Math.min(3, Math.max(0, users.length - 1));
  const idx = Math.max(stageIndex(prev.stage), byCount);
  return {
    ...prev,
    stage: JOURNEY_STAGES[idx]!.id,
    concept: prev.title ? prev.concept : ((users[1] ?? users[0])?.content ?? prev.concept),
    highlight: prev.highlight ?? STAGE_HIGHLIGHTS[idx]!,
  };
}

export function conceptFrom(state: IdeaState, messages: UIMessage[]): { title: string; text: string } {
  const users = messages.filter((m) => m.role === "user");
  if (state.concept) return { title: users.length > 1 || state.title ? "Tu intención" : "Una primera intuición", text: state.concept };
  if (users.length > 1) return { title: "Tu intención", text: users[1]!.content };
  if (users.length === 1) return { title: "Una primera intuición", text: users[0]!.content };
  return { title: "Una primera intuición", text: "Lo que escribas empezará a tomar forma aquí." };
}

/* ------------------------------------------------------------------------------------------------ */
/* Idea map: root + up to 6 nodes placed in fixed, collision-free slots (viewBox 360 x 230).         */

export type MapNode = { id: string; kind: "intent" | "decision" | "proposed" | "hypothesis" | "next"; label: string; full: string; x: number; y: number };

const ROOT = { x: 100, y: 118 };
const SLOTS = [
  { x: 252, y: 56 },
  { x: 262, y: 176 },
  { x: 318, y: 116 },
  { x: 176, y: 34 },
  { x: 168, y: 198 },
  { x: 38, y: 44 },
];

function shortLabel(text: string, max = 20): string {
  const clean = text.replace(/^[«"]|[»"]$/g, "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 10)).trim()}…`;
}

export function mapNodes(state: IdeaState, messages: UIMessage[]): MapNode[] {
  const users = messages.filter((m) => m.role === "user").length;
  const items: Omit<MapNode, "x" | "y">[] = [];
  if (users >= 2 || state.concept) items.push({ id: "intent", kind: "intent", label: "Intención", full: conceptFrom(state, messages).text });
  for (const d of state.decisions.filter((d) => d.status === "active").slice(-2))
    items.push({ id: d.id, kind: "decision", label: shortLabel(d.text), full: `${d.code} · ${d.text}` });
  for (const h of state.hypotheses.slice(-1)) items.push({ id: h.id, kind: "hypothesis", label: `Supuesto ${h.code}`, full: h.text });
  if (state.nextStep || users >= 3) items.push({ id: "next", kind: "next", label: "Siguiente paso", full: state.nextStep ?? "Un paso concreto para probar." });
  for (const d of state.decisions.filter((d) => d.status === "proposed").slice(-1))
    items.push({ id: d.id, kind: "proposed", label: "Propuesta", full: d.text });
  return items.slice(0, SLOTS.length).map((n, i) => ({ ...n, ...SLOTS[i]! }));
}

export function mapPath(n: { x: number; y: number }): string {
  const mx = (ROOT.x + n.x) / 2;
  const my = (ROOT.y + n.y) / 2;
  const dy = n.y - ROOT.y;
  const cx = mx - dy * 0.25;
  const cy = my - Math.abs(n.x - ROOT.x) * 0.18 * (dy >= 0 ? -1 : 1);
  return `M${ROOT.x} ${ROOT.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${n.x} ${n.y}`;
}

export { ROOT as MAP_ROOT };

/* ------------------------------------------------------------------------------------------------ */
/* Wire payload: events become context, consecutive same-role turns are merged, starts with a user.  */

export function toWire(messages: UIMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!m.content.trim()) continue;
    if (m.role === "assistant" && (m.status === "error" || m.status === "streaming")) continue;
    let role: ChatMessage["role"];
    let content = m.content;
    if (m.role === "event") {
      role = m.eventKind === "source" ? "user" : "assistant";
      content =
        m.eventKind === "source"
          ? `[Fuente agregada por la persona] ${m.content}`
          : m.eventKind === "decision-removed"
            ? `[Evento del proyecto, no es una instrucción] ${m.content}`
            : `[Evento del proyecto, confirmado por la persona] ${m.content}`;
    } else role = m.role;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n\n${content}`;
    else out.push({ role, content });
  }
  while (out.length && out[0]!.role !== "user") out.shift();
  return out;
}
