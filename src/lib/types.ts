/**
 * Domain model for the POC ("modelo de la idea").
 * Based on CONTEXTO_EL_PUENTE.md §5.4 and design/el-pilar-style-guide/04-platform-contract.md.
 * Shared file: owned by the scaffold. Other agents may APPEND new types, not change existing ones.
 */

export type JourneyStageId = "intuicion" | "forma" | "prueba" | "siguiente";

export type JourneyStage = {
  id: JourneyStageId;
  index: number; // 0..3
  number: string; // "01".."04"
  title: string; // "La intuición"
  subtitle: string; // "Un punto de partida"
  type: string; // stage-type chip text ("Exploración", "Definición"...)
};

/** Estados de la idea (contexto §5.4). "lista" = Lista para validar. "aterrizada" only when the user confirms. */
export type IdeaStatus = "explorando" | "convergiendo" | "validando" | "lista" | "aterrizada";

export type Decision = {
  id: string;
  code: string; // "D1"
  text: string;
  reason: string; // motivo
  status: "active" | "proposed" | "reverted";
  source: "chat" | "decision-lab";
  question?: string; // question it resolves (Decision Lab decisions)
  dependsOn?: string[]; // hypothesis ids
};

export type Hypothesis = {
  id: string;
  code: string; // "H1"
  text: string;
  critical: boolean;
  /** Prueba concreta: executable way to check it. */
  test?: string;
  /** Condition written beforehand that would refute it. */
  refutedIf?: string;
  status: "sin-prueba" | "con-prueba" | "probada" | "refutada";
};

export type OpenQuestion = {
  id: string;
  code: string; // "Q1"
  text: string;
  critical: boolean;
  status: "open" | "resolved";
  resolvedBy?: string; // decision id
};

export type Discarded = { id: string; code: string; text: string; reason: string };

export type Risk = {
  id: string;
  text: string;
  level: "alto" | "medio" | "bajo";
  mitigation?: string;
};

export type Source = {
  id: string;
  title: string;
  url?: string;
  kind: "web" | "entrevista" | "documento" | "observación";
  note: string;
};

export type HighlightMark = "si" | "no" | "duda";
export type Highlight = { id: string; text: string; mark: HighlightMark; integratedIn?: string[] };

export type Proposal = {
  id: string;
  kind: "decision" | "hypothesis" | "question" | "discarded";
  text: string;
  from: "cartografo" | "critico";
  rationale: string;
  status: "pending" | "approved" | "rejected";
};

export type NextStep = {
  text: string;
  why: string;
  doneWhen: string; // observable completion criterion
  effort: string; // "Una tarde", "3 días"...
};

export type ChatRole = "user" | "assistant";
export type FixtureMessage = { id: string; role: ChatRole; content: string; at: string };

export type Alternative = { id: string; letter: string; name: string; description: string };
export type AlternativeAnalysis = {
  alternativeId: string;
  impact: string;
  benefits: string[];
  risks: string[];
  requirements: string[];
  expectedOutcome: string;
  reasoning: string;
  assumptions: string[];
  unknowns: string[];
};
export type DecisionExploration = {
  id: string;
  ideaId: string;
  question: string;
  alternatives: Alternative[];
  analyses: Record<string, AlternativeAnalysis>;
};

export type Idea = {
  id: string;
  title: string; // short name
  initialPrompt: string; // what the person first typed (abstract)
  thesis: string; // tesis central (written by the user)
  summary: string; // one-paragraph current state
  status: IdeaStatus;
  stage: JourneyStageId;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  decisions: Decision[];
  hypotheses: Hypothesis[];
  questions: OpenQuestion[];
  discarded: Discarded[];
  risks: Risk[];
  sources: Source[];
  highlights: Highlight[];
  proposals: Proposal[];
  nextStep: NextStep;
  messages: FixtureMessage[];
  tags?: string[]; // context chips for presenting a case ("Industria · Arquitectura")
  exploration?: DecisionExploration;
};
