import type { ChatMessage, ChatUpdates } from "@/lib/chat-types";

/**
 * Offline, deterministic guide. Replies are keyed to DEMO_SCRIPT (src/lib/fixtures.ts) and to the
 * fixture ideas, so the live demo tells the "cocina del barrio" story even without network.
 */
type Scripted = { match: RegExp; text: string; updates: ChatUpdates };

const SCRIPT: Scripted[] = [
  {
    match: /barrio|vende comida|crecer/i,
    text:
      "Lo que describes todavía es una intención: que a quienes venden comida en tu barrio les vaya mejor. Es un buen punto de partida, pero «crecer» puede significar vender más, ganar más por plato o dejar de depender de alguien. Antes de pensar en soluciones, conviene nombrar a una persona concreta. ¿En quién estás pensando cuando dices «la gente de mi barrio que vende comida»?",
    updates: {
      questions: [{ text: "¿Quién es, con nombre y situación, la primera persona a la que esto ayudaría?", critical: true }],
      stage: "intuicion",
      highlight: "Antes de la solución, una persona concreta",
    },
  },
  {
    match: /permiso|cocinar|cocina/i,
    text:
      "Ahí aparece algo más concreto: un cuello de botella. Pero fíjate que lo estás afirmando como si fuera un hecho, y por ahora es una **hipótesis**: que la falta de una cocina con permisos es lo que más los frena. Podría ser eso, o podría ser el capital, el tiempo o quién les compra. ¿Qué observación te haría abandonar esta explicación?",
    updates: {
      hypotheses: [
        {
          text: "La falta de una cocina con permisos es lo que más frena a quien vende comida desde casa.",
          test: "Pedir a 8 vendedoras que ordenen sus tres mayores obstáculos.",
        },
      ],
      questions: [{ text: "¿Qué observación te haría abandonar la idea de la cocina?", critical: true }],
      stage: "forma",
      highlight: "Lo que crees es una hipótesis, no un hecho",
    },
  },
  {
    match: /no he hablado|t[ií]a|tamales|nadie/i,
    text:
      "Gracias por decirlo así; es justo lo que hay que tener a la vista. Una sola persona cercana es una pista valiosa, no una evidencia. Te propongo una decisión: tu primer usuario es quien vende comida preparada desde su casa, no los restaurantes. Y una condición escrita de antemano: si menos de 3 de 8 vendedoras ponen la cocina entre sus dos primeros obstáculos, la hipótesis cae. ¿Te parece una prueba justa, o la harías más exigente?",
    updates: {
      decisions: [
        {
          text: "El primer usuario es quien vende comida preparada desde su casa, no restaurantes.",
          reason: "Es a quien conoces y quien más depende de una cocina ajena para crecer.",
        },
      ],
      hypotheses: [
        {
          text: "La falta de una cocina con permisos es lo que más frena a quien vende comida desde casa.",
          test: "Entrevistar a 8 vendedoras; se refuta si menos de 3 ponen la cocina entre sus dos primeros obstáculos.",
        },
      ],
      stage: "prueba",
      highlight: "Una persona cercana es una pista, no una evidencia",
    },
  },
  {
    match: /esta semana|qu[eé] (debo|debería|hago)|siguiente paso/i,
    text:
      "Esta semana no hace falta construir nada. El paso más pequeño que te da información real es conversar con 8 personas que venden comida en el barrio y pedirles que ordenen sus tres mayores obstáculos, sin mencionar tu idea de la cocina. Sabrás que terminaste cuando tengas las 8 listas escritas, con sus palabras. ¿A quién le escribirías primero, además de tu tía?",
    updates: {
      nextStep: "Entrevistar a 8 vendedoras del barrio y pedirles que ordenen sus tres mayores obstáculos, sin mencionar la cocina.",
      decisions: [
        { text: "Empezar con conversaciones antes de construir cualquier app.", reason: "Lo que falta saber es el obstáculo real, no cómo resolverlo." },
      ],
      stage: "siguiente",
      highlight: "Esta semana no se construye: se pregunta",
    },
  },
];

const OPENERS: ScriptedFallback[] = [
  {
    text:
      "Te leo. Para que esto deje de ser una intuición y empiece a tener forma, me ayuda separar dos cosas: lo que quieres que cambie y la solución que ya imaginas. A veces vienen pegadas y conviene despegarlas. ¿Qué te gustaría que fuera distinto en el mundo si esta idea funcionara?",
    updates: { questions: [{ text: "¿Qué cambiaría si esta idea funcionara, y para quién?", critical: true }], stage: "intuicion", highlight: "Separar el cambio que buscas de la solución" },
  },
  {
    text:
      "Eso ya dice mucho de para quién es. Ahora noto un supuesto debajo: que esas personas sienten el problema con la misma fuerza que tú. Puede ser cierto, pero todavía no lo sabemos. ¿Qué estás dando por hecho para que esto pueda ocurrir?",
    updates: { questions: [{ text: "¿Qué estás dando por hecho sin haberlo comprobado?", critical: true }], stage: "forma", highlight: "Debajo de cada idea hay un supuesto" },
  },
  {
    text:
      "Eso suena a una hipótesis, y es buena noticia: una hipótesis se puede poner a prueba. Lo importante es escribir antes qué resultado te haría soltarla, para no acomodar la evidencia después. ¿Qué observación concreta te haría abandonarla?",
    updates: { hypotheses: [{ text: "El supuesto central que acabas de nombrar.", test: "Definir una observación que lo refute antes de salir a probarlo." }], stage: "prueba", highlight: "Escribe antes qué te haría soltar la idea" },
  },
  {
    text:
      "Bien, con eso ya hay un camino. No hace falta construir nada todavía: lo mínimo es una conversación o una prueba pequeña que te dé información real esta semana, con un criterio claro de cuándo terminaste. ¿Cuál sería la acción más pequeña que podrías hacer en los próximos tres días?",
    updates: { nextStep: "Diseñar una prueba de una tarde que pueda refutar el supuesto central.", stage: "siguiente", highlight: "Lo mínimo que te da información real" },
  },
];
type ScriptedFallback = { text: string; updates: ChatUpdates };

const IDEA_REPLY: Record<string, ScriptedFallback> = {
  "cocina-barrio": {
    text:
      "Retomemos donde lo dejaste. Tienes una hipótesis crítica con prueba (H1) y otra sin prueba (H2: que pagarían por horas de cocina). Lo que hoy bloquea que la idea esté lista para validar es saber cuánto pierde una vendedora por no producir más. ¿Cómo podrías averiguarlo sin adivinar?",
    updates: { questions: [{ text: "¿Cuánto pierde hoy una vendedora por no poder producir más?", critical: true }], stage: "prueba", highlight: "Lo que bloquea es una pregunta, no un porcentaje" },
  },
  "hilo-builders": {
    text:
      "Retomemos. Tu intuición es que lo que se pierde no son las ideas sino las decisiones. Eso todavía descansa solo en tu experiencia. ¿Quién más, además de ti, vive esto, y cómo lo sabrías sin preguntarle directamente si le gustaría tu solución?",
    updates: { questions: [{ text: "¿Quién más, además de ti, pierde el hilo de sus ideas?", critical: true }], stage: "forma", highlight: "Lo que se pierde son las decisiones" },
  },
};

export function mockReply(messages: ChatMessage[], ideaId?: string): ScriptedFallback {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const turn = messages.filter((m) => m.role === "user").length;
  // Story beats are matched in reverse so the more specific later beats win ("cocina" also says "barrio").
  for (const s of [...SCRIPT].reverse()) if (s.match.test(last)) return s;
  if (ideaId && IDEA_REPLY[ideaId] && turn === 1) return IDEA_REPLY[ideaId]!;
  return OPENERS[Math.min(turn - 1, OPENERS.length - 1)]!;
}

/** Streams the scripted reply in small word groups with a short "thinking" pause first. */
export async function* mockStream(messages: ChatMessage[], ideaId: string | undefined, signal: AbortSignal): AsyncGenerator<string> {
  const { text, updates } = mockReply(messages, ideaId);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await sleep(450);
  const words = text.split(/(?<= )/);
  for (let i = 0; i < words.length; i += 2) {
    if (signal.aborted) return;
    yield words.slice(i, i + 2).join("");
    await sleep(38);
  }
  yield `\n<<<UPDATES>>>${JSON.stringify(updates)}`;
}
