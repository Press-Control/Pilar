/**
 * Decision Lab · local analysis (port of reference/decision-lab.js `dlAnalysis`).
 * Local hypotheses only: no AI verification, no recommendation. When the selected project carries a
 * fixture exploration whose alternative names match, its richer analysis is used instead.
 */
import { ideas } from "@/lib/fixtures";
import type { Idea } from "@/lib/types";

export const INDEPENDENT = "independent";

export type LabAnalysis = {
  index: number;
  name: string;
  impact: string;
  benefits: string[];
  risks: string[];
  requirements: string[];
  outcome: string;
  reason: string;
  assumptions: string[];
  unknowns: string[];
};

export type LabRecord = {
  id: string;
  date: string;
  project: string; // idea id or INDEPENDENT
  projectText: string;
  question: string;
  alternatives: string[];
  choice: string;
  requirements: string;
  active: boolean;
};

export const letter = (i: number) => String.fromCharCode(65 + i);

export function projectIdea(project: string): Idea | undefined {
  return ideas.find((i) => i.id === project);
}

export function projectContext(project: string): string {
  const idea = projectIdea(project);
  return idea ? idea.thesis : "Exploración independiente; aún no hay un proyecto asociado.";
}

type Profile = [RegExp, [string, string, string, string, string]];

const PROFILES: Profile[] = [
  [/remoto|teleoper/i, ["Mantener a una persona a cargo del control y revisar la conexión y los mandos.", "La persona operadora puede intervenir directamente ante situaciones nuevas.", "La latencia, la pérdida de conexión y la disponibilidad de la persona operadora limitan el uso.", "Definir canal de comunicación, interfaz de control y comportamiento seguro sin conexión.", "Un flujo operado a distancia, cuya capacidad dependerá de la conexión y de la persona operadora."]],
  [/aut[oó]nom|automat/i, ["Trasladar la ejecución al sistema y definir cuándo requiere intervención humana.", "Puede reducir la intervención manual en tareas repetitivas.", "Los errores de percepción o las excepciones pueden provocar acciones incorrectas.", "Definir entradas, reglas de control, supervisión y condiciones de parada.", "Un flujo que ejecuta tareas por sí mismo dentro de límites previamente comprobados."]],
  [/h[ií]br|combin/i, ["Dividir las responsabilidades entre los enfoques y definir cómo se transfiere el control.", "Permite conservar intervención humana sin renunciar a automatizar partes del flujo.", "La coordinación y los cambios de modo añaden estados que habrá que probar.", "Asignar responsabilidades, interfaces y reglas explícitas para cambiar de modo.", "Un flujo mixto con fronteras claras entre cada forma de trabajar."]],
  [/prueba|acotad|m[ií]nim|piloto|prototip/i, ["Acotar el alcance inicial a una hipótesis y una prueba observable.", "Permite obtener evidencia con un alcance inicial reducido.", "Una muestra limitada puede ocultar problemas que aparecen al ampliar el uso.", "Elegir participantes, hipótesis, duración y una señal de éxito o abandono.", "Evidencia para decidir si ampliar, ajustar o descartar el enfoque."]],
  [/complet|integral/i, ["Incluir el alcance completo y ordenar sus entregables y dependencias.", "Permite probar las interacciones entre las partes del proyecto desde una misma solución.", "El esfuerzo y las dependencias pueden retrasar el aprendizaje inicial.", "Definir entregables, responsables, recursos y criterios de aceptación por componente.", "Una solución integral, pendiente de comprobar su ejecución y mantenimiento."]],
  [/proveedor|extern|contrat|agencia/i, ["Delegar parte de la ejecución y definir entregables y límites contractuales.", "Permite acceder a capacidad especializada fuera del equipo.", "Puede generar dependencia del proveedor y costes de coordinación o cambio.", "Acordar propiedad, acceso, entregables, soporte y un plan de salida.", "Una entrega externa que debe integrarse y aceptarse con criterios propios."]],
  [/intern|propio|equipo/i, ["Asignar la ejecución al equipo propio y revisar su capacidad disponible.", "Conserva el conocimiento y el control de los cambios dentro del equipo.", "Puede desplazar otras tareas y exigir formación o mantenimiento adicional.", "Asignar personas responsables, tiempo, capacidades y soporte continuo.", "Una capacidad interna que necesitará recursos sostenidos."]],
  [/gratis|gratuit/i, ["Eliminar el pago de acceso y definir cómo financiar la operación.", "Reduce la barrera económica inicial de acceso.", "El uso puede crecer sin ingresos que cubran soporte e infraestructura.", "Estimar costes, límites de uso y fuente de financiación.", "Una oferta sin pago de acceso cuya sostenibilidad deberá comprobarse."]],
  [/suscrip|mensual|pago/i, ["Introducir cobro, acceso y seguimiento del valor entregado.", "Permite probar si existe disposición a pagar de forma recurrente.", "Puede añadir fricción de acceso y obligaciones de soporte.", "Definir precio, facturación, cancelación y una prueba de disposición a pagar.", "Una oferta de pago que deberá demostrar valor suficiente para retener usuarios."]],
  [/web|navegador/i, ["Priorizar el acceso desde navegador y revisar los flujos y dispositivos compatibles.", "Permite acceder mediante un enlace sin una instalación específica.", "El uso sin conexión y algunas funciones del dispositivo pueden estar limitados.", "Definir navegadores, adaptación móvil, despliegue y comportamiento sin conexión.", "Una experiencia accesible desde navegador, pendiente de validar con los usuarios."]],
  [/m[oó]vil|nativ|android|ios|whatsapp/i, ["Priorizar los flujos del teléfono y definir plataformas y distribución.", "Permite diseñar alrededor de las capacidades y hábitos de uso del móvil.", "Añade dependencias de plataforma, permisos y mantenimiento de versiones.", "Elegir sistemas compatibles, permisos, distribución y pruebas en dispositivos.", "Una experiencia móvil cuya utilidad deberá validarse en condiciones reales."]],
];

const norm = (s: string) => s.trim().toLowerCase();

export function analyze(index: number, question: string, alternatives: string[], project: string): LabAnalysis {
  const name = alternatives[index] ?? "";
  const context = projectContext(project);
  const other = alternatives.filter((_, j) => j !== index).join(" / ");

  // Fixture exploration for this project (same alternativeId feeds every field).
  const exploration = projectIdea(project)?.exploration;
  const alt = exploration?.alternatives.find((a) => norm(a.name) === norm(name));
  const fixture = alt ? exploration?.analyses[alt.id] : undefined;
  if (alt && fixture) {
    return {
      index,
      name,
      impact: `${fixture.impact} La decisión que se está resolviendo es: «${question}».`,
      benefits: fixture.benefits,
      risks: fixture.risks,
      requirements: fixture.requirements,
      outcome: fixture.expectedOutcome,
      reason: `${fixture.reasoning} Son hipótesis escritas a partir de lo que llevas en este proyecto, no conclusiones verificadas. Contrasta esta opción con ${other}.`,
      assumptions: fixture.assumptions,
      unknowns: fixture.unknowns,
    };
  }

  const match = PROFILES.find(([pattern]) => pattern.test(name));
  const v = match
    ? match[1]
    : [
        `Adoptar «${name}» cambiaría el enfoque de esta decisión; falta describir qué tareas o componentes sustituye.`,
        `No hay datos suficientes para atribuir una ventaja a «${name}» frente a ${other}. Define qué mejora concreta esperas.`,
        `Todavía no se conocen las limitaciones propias de «${name}». Verifica coste, dependencias y reversibilidad antes de elegir.`,
        `Documentar recursos, responsable y una prueba específica de «${name}».`,
        `Resultado por definir para «${name}»: indica qué debería observarse si funcionara.`,
      ];
  return {
    index,
    name,
    impact: `${v[0]} La decisión que se está resolviendo es: «${question}».`,
    benefits: [v[1]!],
    risks: [v[2]!],
    requirements: [v[3]!],
    outcome: v[4]!,
    reason: `${
      match
        ? "Se ha reconocido un tipo de enfoque y se muestran sus implicaciones habituales; no son conclusiones verificadas sobre tu proyecto."
        : "La alternativa no coincide con un enfoque conocido. Se muestran preguntas pendientes, sin inventar ventajas."
    } Contexto del proyecto: «${context}». Contrasta esta opción con ${other}. La guía local no sustituye un análisis contextual ni evidencia real.`,
    assumptions: [],
    unknowns: [],
  };
}

/** Local example suggestions (editable, not a recommendation). */
export function suggestAlternatives(question: string): string[] {
  if (/naveg|robot/i.test(question)) return ["Navegación autónoma", "Control remoto", "Sistema híbrido"];
  if (/contrat|equipo|desarroll/i.test(question)) return ["Desarrollar internamente", "Trabajar con un proveedor", "Combinar equipo y apoyo externo"];
  return ["Empezar con una prueba acotada", "Implementar la solución completa", "Combinar ambos enfoques"];
}

/** History seeded from fixture decisions that came from the Decision Lab. */
export function seedRecords(): LabRecord[] {
  const out: LabRecord[] = [];
  for (const idea of ideas) {
    for (const d of idea.decisions) {
      if (d.source !== "decision-lab" || !d.question) continue;
      const exp = idea.exploration && idea.exploration.question === d.question ? idea.exploration : undefined;
      const names = exp ? exp.alternatives.map((a) => a.name) : [];
      const choiceAlt = exp?.alternatives.find((a) => d.text.toLowerCase().includes(a.name.toLowerCase()));
      const choice = choiceAlt?.name ?? d.text;
      const reqs = choiceAlt && exp ? exp.analyses[choiceAlt.id]?.requirements : undefined;
      const req = reqs ? sentences(reqs) : undefined;
      out.push({
        id: `${idea.id}-${d.id}`,
        date: idea.updatedAt,
        project: idea.id,
        projectText: idea.title,
        question: d.question,
        alternatives: names.length >= 2 ? names : [choice],
        choice,
        requirements: req ?? d.reason,
        active: d.status === "active",
      });
    }
  }
  return out;
}

/** Join short statements into prose with exactly one trailing period. */
export function sentences(items: string[]): string {
  const parts = items.map((s) => s.trim().replace(/\.+$/, "")).filter(Boolean);
  return parts.length ? `${parts.join(". ")}.` : "";
}
