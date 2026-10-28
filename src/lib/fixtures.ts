/**
 * Hardcoded demo data for the POC. Ideas go from an abstract intuition to a clear idea and a clear path.
 * Copy rules (CONTEXTO §10): never say an idea "is validated" or "is good"; no market figures; numbers
 * inside ideas are written as SUPUESTO by the person, not as facts. Brand visible name: "El Pilar".
 * Shared file: owned by the scaffold; other agents may APPEND data/helpers, not rewrite existing ones.
 */
import type { Idea, IdeaStatus, JourneyStage, JourneyStageId } from "./types";

export const BRAND = {
  name: "El Pilar",
  descriptor: "UN ESPACIO PARA PENSAR",
  tagline: "De la intuición a la decisión",
};

export const JOURNEY_STAGES: JourneyStage[] = [
  { id: "intuicion", index: 0, number: "01", title: "La intuición", subtitle: "Un punto de partida", type: "Exploración" },
  { id: "forma", index: 1, number: "02", title: "Darle forma", subtitle: "Encontrar lo esencial", type: "Definición" },
  { id: "prueba", index: 2, number: "03", title: "Poner a prueba", subtitle: "Cuestionar lo que asumes", type: "Contraste" },
  { id: "siguiente", index: 3, number: "04", title: "El siguiente paso", subtitle: "Pasar a la acción", type: "Acción" },
];

export const STATUS_LABEL: Record<IdeaStatus, string> = {
  explorando: "Explorando",
  convergiendo: "Convergiendo",
  validando: "Validando",
  lista: "Lista para validar",
  aterrizada: "Aterrizada",
};

export const HOME_PROMPTS = [
  { label: "Explorar una idea", glyph: "＋", prefix: "Quiero explorar una idea nueva: " },
  { label: "Tomar una decisión", glyph: "↗", prefix: "Necesito tomar una decisión sobre " },
  { label: "Cuestionar un supuesto", glyph: "◇", prefix: "Quiero cuestionar este supuesto: " },
];

/** Suggested messages to type during a live demo (chat agent may show them as chips). */
export const DEMO_SCRIPT = [
  "Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué.",
  "Creo que el problema es que no tienen dónde cocinar con permisos.",
  "No he hablado con ninguno todavía, lo vi con mi tía que vende tamales.",
  "¿Qué debería hacer esta semana?",
];

export const ideas: Idea[] = [
  {
    id: "cocina-barrio",
    title: "Cocina compartida del barrio",
    initialPrompt:
      "Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué.",
    thesis:
      "Quienes venden comida desde casa en el barrio no crecen porque no tienen una cocina con permisos; una cocina compartida por horas podría destrabarlo.",
    summary:
      "La intuición empezó como «ayudar a que crezcan». Hoy es una hipótesis concreta sobre un cuello de botella (cocina con permisos) que todavía no se ha contrastado con nadie además de una persona cercana.",
    status: "convergiendo",
    stage: "prueba",
    createdAt: "2026-10-26T18:10:00-06:00",
    updatedAt: "2026-10-28T12:40:00-06:00",
    decisions: [
      {
        id: "d1",
        code: "D1",
        text: "El primer usuario es quien vende comida preparada desde su casa, no restaurantes.",
        reason: "Es a quien conoces y quien más depende de una cocina ajena para crecer.",
        status: "active",
        source: "chat",
      },
      {
        id: "d2",
        code: "D2",
        text: "Empezar con una prueba piloto manual antes de construir cualquier app.",
        reason: "Lo que falta saber es si alguien pagaría por horas de cocina, no cómo reservarlas.",
        status: "active",
        source: "decision-lab",
        question: "¿Qué deberíamos construir primero?",
        dependsOn: ["h1"],
      },
      {
        id: "d3",
        code: "D3",
        text: "Cobrar por bloque de 4 horas, no por membresía mensual.",
        reason: "Quien empieza vende por temporadas; una cuota fija lo frena.",
        status: "proposed",
        source: "chat",
        dependsOn: ["h2"],
      },
    ],
    hypotheses: [
      {
        id: "h1",
        code: "H1",
        text: "La falta de una cocina con permisos es lo que más frena a quien vende comida desde casa.",
        critical: true,
        test: "Entrevistar a 8 personas que venden comida en el barrio y pedirles que ordenen sus tres mayores obstáculos.",
        refutedIf: "Menos de 3 de 8 ponen la cocina entre sus dos primeros obstáculos.",
        status: "con-prueba",
      },
      {
        id: "h2",
        code: "H2",
        text: "Pagarían por horas de cocina si el precio es menor a lo que hoy pierden por no poder producir más.",
        critical: true,
        status: "sin-prueba",
      },
      {
        id: "h3",
        code: "H3",
        text: "Hay al menos una cocina en el barrio (fonda, salón parroquial) subutilizada en las mañanas.",
        critical: false,
        test: "Recorrer el barrio y preguntar en 5 locales si rentarían su cocina de 7 a 11 am.",
        refutedIf: "Ninguno acepta ni siquiera conversar el precio.",
        status: "con-prueba",
      },
    ],
    questions: [
      {
        id: "q1",
        code: "Q1",
        text: "¿Qué observación te haría abandonar la idea de la cocina?",
        critical: true,
        status: "resolved",
        resolvedBy: "h1",
      },
      {
        id: "q2",
        code: "Q2",
        text: "¿Cuánto pierde hoy una vendedora por no poder producir más? ¿Cómo lo sabrías sin adivinar?",
        critical: true,
        status: "open",
      },
      {
        id: "q3",
        code: "Q3",
        text: "¿Qué permiso sanitario aplica a una cocina compartida en tu municipio?",
        critical: false,
        status: "open",
      },
    ],
    discarded: [
      {
        id: "x1",
        code: "X1",
        text: "Una app de pedidos para vendedores del barrio.",
        reason: "Ya existen y no atacan el cuello de botella: producir más.",
      },
      {
        id: "x2",
        code: "X2",
        text: "Cursos de emprendimiento.",
        reason: "Tu tía dijo que sabe vender; lo que no tiene es dónde cocinar.",
      },
    ],
    risks: [
      { id: "r1", text: "Basar todo en una sola conversación (tu tía).", level: "alto", mitigation: "Las 8 entrevistas de H1 antes de decidir algo más." },
      { id: "r2", text: "Los permisos sanitarios pueden hacer inviable compartir cocina.", level: "medio", mitigation: "Resolver Q3 con el municipio antes del piloto." },
      { id: "r3", text: "Confundir interés («qué buena idea») con disposición a pagar.", level: "medio", mitigation: "Pedir un anticipo simbólico en el piloto." },
    ],
    sources: [
      { id: "s1", title: "Conversación con tu tía (vende tamales)", kind: "entrevista", note: "Una sola fuente. Dijo que rechaza pedidos grandes porque su cocina no da." },
      { id: "s2", title: "DENUE · INEGI", url: "https://www.inegi.org.mx/app/mapa/denue/", kind: "web", note: "Directorio de negocios: sirve para ubicar fondas y cocinas cercanas. No mide demanda." },
      { id: "s3", title: "Recorrido por el mercado del barrio", kind: "observación", note: "Pendiente. Sería la segunda fuente independiente." },
    ],
    highlights: [
      { id: "hl1", text: "rechaza pedidos grandes porque su cocina no da", mark: "si", integratedIn: ["h1"] },
      { id: "hl2", text: "una app para que pidan comida", mark: "no", integratedIn: ["x1"] },
      { id: "hl3", text: "¿cobrar por mes?", mark: "duda", integratedIn: ["d3"] },
    ],
    proposals: [
      {
        id: "p1",
        kind: "hypothesis",
        text: "Quien vende comida desde casa no conoce los requisitos sanitarios y eso también lo frena.",
        from: "cartografo",
        rationale: "Lo mencionaste dos veces al hablar de permisos.",
        status: "pending",
      },
      {
        id: "p2",
        kind: "question",
        text: "¿H2 depende de que exista H3? Si no hay cocina disponible, el precio no importa.",
        from: "critico",
        rationale: "D3 depende de H2, y H2 asume que hay oferta de cocinas.",
        status: "pending",
      },
    ],
    nextStep: {
      text: "Entrevistar a 8 personas que venden comida en el barrio y pedirles que ordenen sus tres mayores obstáculos.",
      why: "Es la prueba de H1, la hipótesis crítica de la que dependen D2 y D3.",
      doneWhen: "Tienes 8 respuestas escritas y sabes si la cocina queda en el top 2 de al menos 3.",
      effort: "Dos tardes",
    },
    messages: [
      { id: "m1", role: "user", at: "2026-10-26T18:10:00-06:00", content: "Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué." },
      { id: "m2", role: "assistant", at: "2026-10-26T18:10:20-06:00", content: "Empecemos por lo esencial. Cuando dices «crecer», ¿qué verías distinto en seis meses si esto funcionara?" },
      { id: "m3", role: "user", at: "2026-10-26T18:12:00-06:00", content: "Que pudieran aceptar pedidos más grandes. Mi tía vende tamales y rechaza pedidos grandes porque su cocina no da." },
      { id: "m4", role: "assistant", at: "2026-10-26T18:12:30-06:00", content: "Eso ya es una pista concreta: el límite parece ser la capacidad de cocina, no las ventas. Pero viene de una sola persona. ¿Qué tendrías que escuchar de otras para descartar esta idea?" },
      { id: "m5", role: "user", at: "2026-10-27T10:05:00-06:00", content: "Si la mayoría dice que su problema es otro, como conseguir clientes." },
      { id: "m6", role: "assistant", at: "2026-10-27T10:05:40-06:00", content: "Bien: ya tienes una condición que refutaría la hipótesis. La dejé como H1 con su prueba. Antes de pensar en una app, ¿qué es lo mínimo que podrías hacer para ver si alguien pagaría por horas de cocina?" },
    ],
    exploration: {
      id: "e1",
      ideaId: "cocina-barrio",
      question: "¿Qué deberíamos construir primero?",
      alternatives: [
        { id: "a", letter: "A", name: "Aplicación web de reservas", description: "Calendario para reservar horas de cocina." },
        { id: "b", letter: "B", name: "Grupo de WhatsApp + hoja de cálculo", description: "Coordinación manual con 3 o 4 vendedoras." },
        { id: "c", letter: "C", name: "Prueba piloto manual", description: "Rentar una cocina una mañana y ofrecerla a 3 vendedoras." },
      ],
      analyses: {
        a: {
          alternativeId: "a",
          impact: "Resuelve cómo reservar, pero no si alguien quiere reservar.",
          benefits: ["Se ve profesional para mostrar a otros.", "Escala si la demanda existe."],
          risks: ["Construir antes de saber si H1 se sostiene.", "Semanas de trabajo sin una sola conversación nueva."],
          requirements: ["Tiempo de desarrollo", "Una cocina ya acordada"],
          expectedOutcome: "Una herramienta lista, con incertidumbre alta sobre si se usará.",
          reasoning: "Depende de H1 y H2, que hoy no tienen evidencia más allá de una persona.",
          assumptions: ["Hay demanda suficiente", "Las vendedoras usan apps web"],
          unknowns: ["Disposición a pagar", "Permisos"],
        },
        b: {
          alternativeId: "b",
          impact: "Prueba la coordinación con costo casi nulo.",
          benefits: ["Arranca esta semana.", "Usa herramientas que ya conocen."],
          risks: ["No prueba disposición a pagar si no se cobra.", "Depende de tu tiempo para coordinar."],
          requirements: ["3–4 vendedoras interesadas", "Una cocina disponible"],
          expectedOutcome: "Aprendes cómo se organizan, con evidencia parcial sobre el pago.",
          reasoning: "Reduce costo, pero sin cocina real sigue siendo una conversación sobre una intención.",
          assumptions: ["Hay una cocina disponible (H3)"],
          unknowns: ["Si la coordinación manual aguanta más de dos semanas"],
        },
        c: {
          alternativeId: "c",
          impact: "Pone a prueba H1 y H2 con dinero y cocina reales.",
          benefits: ["Evidencia directa de pago.", "Descubres problemas de permisos y logística temprano."],
          risks: ["Costo de una mañana de renta.", "Una sola mañana puede ser poco representativa."],
          requirements: ["Una cocina dispuesta a rentar (H3)", "Anticipo simbólico de cada vendedora"],
          expectedOutcome: "Sabes si al menos alguien paga, y qué falla en la práctica.",
          reasoning: "Es la opción que más reduce la incertidumbre crítica por el menor costo.",
          assumptions: ["Las vendedoras pueden dejar su casa una mañana"],
          unknowns: ["Requisitos sanitarios (Q3)"],
        },
      },
    },
  },
  {
    id: "hilo-builders",
    title: "No perder el hilo de una idea",
    initialPrompt: "Tengo muchas ideas y las platico con un chat, pero al final no sé qué decidí ni qué sigue.",
    thesis: "Quien construye pierde decisiones y razones dentro del scroll de un chat; necesita ver el estado de su idea, no el historial.",
    summary:
      "Una intuición personal: el problema no es tener ideas sino perder el hilo. Aún no está claro para quién es además de ti ni qué observación lo pondría a prueba.",
    status: "explorando",
    stage: "forma",
    createdAt: "2026-10-28T09:00:00-06:00",
    updatedAt: "2026-10-28T09:25:00-06:00",
    decisions: [
      {
        id: "d1",
        code: "D1",
        text: "Lo que importa es el estado de la idea, no el historial de la conversación.",
        reason: "Es lo que dijiste que pierdes: qué decidiste y por qué.",
        status: "active",
        source: "chat",
      },
    ],
    hypotheses: [
      {
        id: "h1",
        code: "H1",
        text: "Otras personas que construyen también pierden decisiones dentro de sus chats.",
        critical: true,
        status: "sin-prueba",
      },
    ],
    questions: [
      { id: "q1", code: "Q1", text: "¿Quién, además de ti, tiene este problema hoy?", critical: true, status: "open" },
      { id: "q2", code: "Q2", text: "¿Cómo sabrías que ya terminaste de pensar una idea, y no que solo te cansaste?", critical: true, status: "open" },
    ],
    discarded: [{ id: "x1", code: "X1", text: "Un traductor de ideas.", reason: "Asume que la idea ya existe completa." }],
    risks: [{ id: "r1", text: "Diseñar solo para ti.", level: "alto", mitigation: "Hablar con 5 personas que construyen antes de decidir el formato." }],
    sources: [{ id: "s1", title: "Tu propia experiencia", kind: "observación", note: "Una sola fuente; útil para empezar, insuficiente para decidir." }],
    highlights: [{ id: "hl1", text: "no sé qué decidí ni qué sigue", mark: "si", integratedIn: ["d1"] }],
    proposals: [],
    nextStep: {
      text: "Escribir en una frase qué observación te haría abandonar esta idea.",
      why: "Sin eso, H1 no se puede poner a prueba.",
      doneWhen: "La frase está escrita y la compartes con alguien.",
      effort: "15 minutos",
    },
    messages: [
      { id: "m1", role: "user", at: "2026-10-28T09:00:00-06:00", content: "Tengo muchas ideas y las platico con un chat, pero al final no sé qué decidí ni qué sigue." },
      { id: "m2", role: "assistant", at: "2026-10-28T09:00:30-06:00", content: "Entonces lo que se pierde no son las ideas, sino las decisiones. ¿Qué fue lo último que decidiste en uno de esos chats y no pudiste encontrar después?" },
    ],
  },
];

export function getIdea(id: string | undefined | null): Idea | undefined {
  return ideas.find((i) => i.id === id);
}

export function getStage(id: JourneyStageId): JourneyStage {
  return JOURNEY_STAGES.find((s) => s.id === id) ?? JOURNEY_STAGES[0]!;
}

/**
 * Readiness check (criterio de parada, CONTEXTO §4.1): no critical open questions AND every critical
 * hypothesis has a concrete test. Returned blockers are phrased as questions, never as a percentage.
 */
export function readiness(idea: Idea): { ready: boolean; blockers: string[] } {
  const blockers: string[] = [];
  for (const q of idea.questions) if (q.critical && q.status === "open") blockers.push(q.text);
  for (const h of idea.hypotheses)
    if (h.critical && !h.test) blockers.push(`¿Qué observación refutaría ${h.code}: «${h.text}»?`);
  return { ready: blockers.length === 0, blockers };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
