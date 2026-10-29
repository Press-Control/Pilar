/**
 * Casos reales, cortados a mitad del proceso para la demo: conversaciones grabadas contra el backend en vivo (28 oct 2026; motor anthropic) y convertidas en ideas.
 * Los mensajes son el texto real de cada turno (sin el canal <<<UPDATES>>>). Decisiones, hipótesis, preguntas,
 * frases y siguiente paso se derivan acumulando esos UPDATES con la misma lógica que el chat (model.ts applyUpdates):
 * dedupe por texto y por similitud (gana la versión más reciente), máximo 6 preguntas (las más recientes), decisiones como «propuestas» (nadie las confirmó).
 * Generado por scratchpad/casos/gen.py; título, tesis y resumen están escritos a partir de la conversación.
 */
import type { Idea } from "./types";

export const CASO_IDS = new Set<string>(["arquitectura-pagos", "spec-nomina", "ia-soporte", "estudio-bayes", "plan-investigacion", "tesis-maestria", "mole-casero"]);

export const casos: Idea[] = [
  {
    "id": "arquitectura-pagos",
    "title": "Del monolito de pagos a servicios",
    "initialPrompt": "Soy arquitecto de software en una fintech de pagos en México. Tenemos un monolito en Rails de 8 años y la dirección quiere «pasar a microservicios». No tengo claro por dónde empezar ni si es lo correcto.",
    "thesis": "La dirección quiere pasar nuestro monolito de pagos en Rails a microservicios; el dolor real son deploys de dos horas, conciliación acoplada a cobros y 4 equipos que se pisan en el mismo repo.",
    "summary": "Empezó como «Soy arquitecto de software en una fintech de pagos en México. Tenemos un monolito en Rails de 8 años y la dire». En curso: Publicar el evento también ocurre dentro del cobro.",
    "status": "explorando",
    "stage": "prueba",
    "createdAt": "2026-10-27T10:20:00-06:00",
    "updatedAt": "2026-10-27T10:32:40-06:00",
    "decisions": [],
    "hypotheses": [
      {
        "id": "h1",
        "code": "H1",
        "text": "Pasar a microservicios resolverá el problema principal que hoy tiene el monolito",
        "critical": false,
        "test": "Nombrar el dolor concreto y verificar si su causa es la arquitectura monolítica",
        "status": "con-prueba"
      },
      {
        "id": "h2",
        "code": "H2",
        "text": "Los dolores vienen del acoplamiento interno y del pipeline, no del monolito en sí",
        "critical": false,
        "test": "Rastrear los últimos incidentes donde conciliación rompió cobros e identificar qué compartían",
        "status": "con-prueba"
      },
      {
        "id": "h3",
        "code": "H3",
        "text": "Separar conciliación dentro del monolito reduciría las roturas en cobros sin necesidad de extraerla",
        "critical": false,
        "test": "Trazar las dependencias entre conciliación y cobros y medir cuántos incidentes recientes vienen de ese acoplamiento",
        "status": "con-prueba"
      },
      {
        "id": "h4",
        "code": "H4",
        "text": "Pasar conciliación a eventos no cambia la latencia del cobro porque está fuera del camino crítico",
        "critical": false,
        "test": "Medir la latencia p99 del cobro en hora pico (unos 300 pagos/s según sus métricas) antes y después de publicar eventos en un entorno de prueba con carga equivalente",
        "status": "con-prueba"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Qué aumento de latencia del cobro en hora pico haría descartar la opción de eventos?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿La conciliación tiene reglas propias diferenciadoras o es una función genérica que se puede comprar?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿Conciliación y cobros comparten tablas, modelos de Rails o lógica de negocio?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿Qué comparten conciliación y cobros que hace que un cambio en uno rompa el otro?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q5",
        "code": "Q5",
        "text": "¿Qué problema concreto quiere resolver la dirección al pasar a microservicios?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Microservicios es una respuesta; falta nombrar la pregunta",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "Partir sin desacoplar solo da un monolito distribuido",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Lo fácil enseña la mecánica; lo que duele justifica el esfuerzo",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "Comprar o construir se decide antes que REST o Kafka",
        "mark": "si"
      },
      {
        "id": "hl5",
        "text": "Publicar el evento también ocurre dentro del cobro",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Publicar el evento también ocurre dentro del cobro",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Industria",
      "Arquitectura de software"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-27T10:20:00-06:00",
        "content": "Soy arquitecto de software en una fintech de pagos en México. Tenemos un monolito en Rails de 8 años y la dirección quiere «pasar a microservicios». No tengo claro por dónde empezar ni si es lo correcto."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-27T10:20:40-06:00",
        "content": "Te piden un destino, «microservicios», sin que esté claro cuál es el problema que lo justifica. Ahí hay algo que no me cuadra: **microservicios es una solución**, y un monolito de ocho años puede doler por razones muy distintas, como despliegues lentos, equipos que se pisan o partes que no aguantan la carga. Cada dolor pide un camino diferente. Si mañana la migración terminara con éxito, ¿qué notaría la dirección que hoy no pasa?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-27T10:23:00-06:00",
        "content": "El dolor real: cada deploy tarda dos horas y un cambio en conciliación rompe cobros. Somos 25 ingenieros en 4 equipos que se pisan en el mismo repo."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-27T10:23:40-06:00",
        "content": "Hay tres dolores: despliegues de dos horas, conciliación acoplada a cobros y equipos que se pisan. Ninguno exige microservicios: son problemas de **acoplamiento** y de pipeline, y partir el sistema sin resolver el acoplamiento solo te deja un monolito distribuido, con la red como ingrediente extra. Lo de conciliación es la pista más reveladora. ¿Por qué un cambio ahí rompe cobros: comparten tablas, modelos de Rails o lógica de negocio?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-27T10:26:00-06:00",
        "content": "Pensaba extraer primero notificaciones porque es lo más fácil, pero quizá debería ser conciliación, que es lo que más duele."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-27T10:26:40-06:00",
        "content": "Dudas entre empezar por lo fácil, que enseña la mecánica, o por lo que duele, que justifica el esfuerzo. Notificaciones no toca ninguno de tus tres dolores, y conciliación, en una fintech, es la pieza más delicada para estrenar la operación distribuida. Hay una tercera vía: **desacoplar conciliación dentro del monolito** antes de sacarla, y ver si eso ya alivia lo que duele. ¿Qué comparten hoy conciliación y cobros, tablas, modelos o lógica?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-27T10:29:00-06:00",
        "content": "Para conciliación dudo entre comunicación síncrona por REST o asíncrona con eventos en Kafka. También está la opción de comprar una solución SaaS de conciliación en vez de construirla."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-27T10:29:40-06:00",
        "content": "Tienes tres caminos, pero no están al mismo nivel: **comprar o construir va primero**, porque si compras SaaS, la duda entre REST y Kafka casi desaparece o la decide el proveedor. Esas tres opciones caben bien en el Decision Lab para compararlas por riesgo, requisitos e impacto en tus dolores. Antes conviene aclarar algo: ¿tu conciliación tiene reglas propias que te distinguen, o es lo mismo que resuelve cualquier fintech de pagos?"
      },
      {
        "id": "m9",
        "role": "user",
        "at": "2026-10-27T10:32:00-06:00",
        "content": "Supongo que con eventos la latencia del cobro no cambia, porque conciliación no está en el camino crítico del pago. En hora pico procesamos unos 300 pagos por segundo, según nuestras métricas."
      },
      {
        "id": "m10",
        "role": "assistant",
        "at": "2026-10-27T10:32:40-06:00",
        "content": "Tu supuesto es que conciliación queda fuera del camino crítico y por eso los eventos no tocarían la latencia del cobro. Es una **hipótesis**, y tiene una grieta: publicar el evento sigue ocurriendo dentro del cobro, y si se hace en la misma transacción para no perder ninguno, añade trabajo justo a 300 pagos por segundo. Además, que hoy un cambio en conciliación rompa cobros sugiere que no están tan separados. ¿Qué aumento de latencia en hora pico te haría descartar los eventos?"
      }
    ]
  },
  {
    "id": "spec-nomina",
    "title": "MVP de exportación de nómina",
    "initialPrompt": "Soy product manager en un SaaS de nómina para pymes. Ventas pide «reportes personalizados» porque dicen que perdemos clientes por eso. Tengo que escribir el spec del MVP.",
    "thesis": "Ventas pide «reportes personalizados»; lo que piden las cuentas es exportar la nómina por centro de costos a su ERP.",
    "summary": "Empezó como «Soy product manager en un SaaS de nómina para pymes. Ventas pide «reportes personalizados» porque dicen que pe». En curso: Lo que dejas fuera también es parte del spec.",
    "status": "explorando",
    "stage": "prueba",
    "createdAt": "2026-10-27T16:05:00-06:00",
    "updatedAt": "2026-10-27T16:14:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "MVP: exportación de nómina por centro de costos a CSV y a los dos ERPs más usados",
        "reason": "Las cuentas entrevistadas piden integración con su ERP, no un constructor de reportes",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d2",
        "code": "D2",
        "text": "Fuera de alcance: constructor visual, gráficas y envíos programados",
        "reason": "No aparecieron como necesidad real en las conversaciones",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [
      {
        "id": "h1",
        "code": "H1",
        "text": "La demanda de reportes viene sobre todo de prospectos de más de 200 empleados, no de clientes actuales",
        "critical": false,
        "test": "Contar en soporte y CRM cuántas solicitudes de reportes vienen de clientes activos de menos de 100 empleados",
        "status": "con-prueba"
      },
      {
        "id": "h2",
        "code": "H2",
        "text": "La necesidad real detrás de 'reportes personalizados' es exportar la nómina por centro de costos al ERP",
        "critical": false,
        "test": "Revisar o contactar las otras 7 oportunidades perdidas y ver cuántas piden lo mismo y con qué ERP; se refuta si menos de la mitad lo confirma",
        "status": "con-prueba"
      },
      {
        "id": "h3",
        "code": "H3",
        "text": "La exportación por centro de costos a su ERP basta para recuperar las oportunidades perdidas por reportes",
        "critical": false,
        "test": "Volver a contactar a las 9 oportunidades con el alcance propuesto y ver cuántas reabren conversación",
        "status": "con-prueba"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Los dos ERPs más usados por los prospectos grandes son también los de tus clientes de 40 empleados?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿El MVP es para empresas de 200+ empleados o para el cliente típico de 40?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿Qué tarea concreta intentan resolver los clientes cuando piden un reporte personalizado?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Pedir una solución no es lo mismo que nombrar el problema",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "Perder prospectos grandes no es lo mismo que perder clientes",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Pedían un reporte; necesitaban un puente hacia su ERP",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "Lo que dejas fuera también es parte del spec",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Lo que dejas fuera también es parte del spec",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Industria",
      "Producto · MVP"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-27T16:05:00-06:00",
        "content": "Soy product manager en un SaaS de nómina para pymes. Ventas pide «reportes personalizados» porque dicen que perdemos clientes por eso. Tengo que escribir el spec del MVP."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-27T16:05:40-06:00",
        "content": "Ventas te trae una solución ya empaquetada, «reportes personalizados», junto con una causa: que por eso se van clientes. Aquí hay algo que no me cuadra: eso último es una **hipótesis de ventas**, no un hecho, y \"personalizado\" suele esconder tres o cuatro necesidades distintas con el mismo nombre. Antes del spec, conviene saber qué hueco tapa ese reporte. ¿Qué intentaba averiguar o entregar el último cliente que lo pidió?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-27T16:08:00-06:00",
        "content": "Revisé el CRM: en los últimos 6 meses, 9 oportunidades perdidas mencionan reportes, pero casi todas son empresas de más de 200 empleados, y nuestro cliente típico tiene 40."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-27T16:08:40-06:00",
        "content": "Lo que encontraste cambia la pregunta: no se van clientes, se pierden prospectos, y casi todos son de otro tamaño que tu cliente típico. Aquí hay algo que no me cuadra: si construyes reportes para empresas de 200, quizá estés haciendo un producto para alguien que hoy no es tu cliente. Eso no es una función, es una **decisión de mercado**. ¿Tu empresa quiere crecer hacia empresas grandes, o el MVP es para la de 40?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-27T16:11:00-06:00",
        "content": "Hablé con dos de esas cuentas. Lo que piden de verdad es exportar la nómina por centro de costos a su ERP, no un constructor de reportes."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-27T16:11:40-06:00",
        "content": "Detrás de «reportes personalizados» había algo mucho más acotado: llevar la nómina por centro de costos a su ERP. Eso es mejor noticia que un constructor de reportes, pero dos cuentas son una pista, no un patrón, y \"a su ERP\" puede significar un formato distinto por cliente. Sigue pendiente si el MVP es para la empresa de 40 o la de 200. ¿Qué ERP usan esas dos cuentas, y coincide con el de las otras siete?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-27T16:14:00-06:00",
        "content": "Entonces el MVP sería una exportación por centro de costos a CSV y a los dos ERPs más usados. Fuera de alcance: constructor visual, gráficas y envíos programados."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-27T16:14:40-06:00",
        "content": "Ya tienes un MVP propuesto: exportación por centro de costos a CSV y a los dos ERPs más usados, dejando fuera el constructor visual, las gráficas y los envíos programados. Lo descartado también cuenta, porque ahí queda lo que pedía ventas al principio. El punto flojo es que esos \"dos más usados\" salen de prospectos de 200, no de tus clientes de 40. ¿Qué tendría que pasar con esas nueve oportunidades para que concluyas que la exportación no bastaba?"
      }
    ]
  },
  {
    "id": "ia-soporte",
    "title": "IA en soporte: piloto con criterio de salida",
    "initialPrompt": "Soy CTO de una startup de logística de última milla, 40 personas. El CEO quiere «meter IA en soporte» porque todos lo están haciendo. A mí me preocupa que un bot invente cosas a los clientes.",
    "thesis": "El CEO quiere meter IA en soporte; empezar por un asistente interno que redacta y un agente revisa, porque si se equivoca lo atrapa una persona.",
    "summary": "Empezó como «Soy CTO de una startup de logística de última milla, 40 personas. El CEO quiere «meter IA en soporte» porque t». En curso: Más rápido puede significar mejor o que nadie está leyendo.",
    "status": "explorando",
    "stage": "prueba",
    "createdAt": "2026-10-28T09:40:00-06:00",
    "updatedAt": "2026-10-28T09:52:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "Empezar con un asistente interno que redacta y el agente revisa y envía",
        "reason": "Si se equivoca, una persona lo atrapa antes de llegar al cliente",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [
      {
        "id": "h1",
        "code": "H1",
        "text": "Alrededor del 60% de los tickets son '¿dónde está mi paquete?' y se resuelven con datos del rastreo",
        "critical": false,
        "test": "Etiquetar a mano una muestra de 50 a 100 tickets del último mes",
        "status": "con-prueba"
      },
      {
        "id": "h2",
        "code": "H2",
        "text": "El asistente reduce a la mitad el tiempo de primera respuesta en tickets de rastreo",
        "critical": false,
        "test": "Comparar el tiempo de primera respuesta antes y después en tickets de rastreo, junto con la tasa de respuestas corregidas o con errores",
        "status": "con-prueba"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Cuál es hoy el tiempo de primera respuesta en tickets de rastreo?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿Qué señal en los datos indicaría que los agentes aprueban borradores sin leerlos?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿Qué condición haría aceptable que un bot responda directo al cliente?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿Por qué los clientes escriben si el rastreo ya tiene la respuesta?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q5",
        "code": "Q5",
        "text": "¿Qué problema concreto de soporte resolvería la IA?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Primero el problema de soporte, después la IA",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "Si el rastreo responde, ¿por qué siguen escribiendo?",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Antes del envase, entiende qué piden los tickets",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "Un filtro que aprueba sin leer no filtra, solo firma",
        "mark": "si"
      },
      {
        "id": "hl5",
        "text": "Más rápido puede significar mejor o que nadie está leyendo",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Más rápido puede significar mejor o que nadie está leyendo",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Industria",
      "Estrategia técnica · IA"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-28T09:40:00-06:00",
        "content": "Soy CTO de una startup de logística de última milla, 40 personas. El CEO quiere «meter IA en soporte» porque todos lo están haciendo. A mí me preocupa que un bot invente cosas a los clientes."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-28T09:40:40-06:00",
        "content": "Tu CEO llegó con una solución («meter IA») y tú con un riesgo (que invente cosas), pero a ninguno de los dos le veo todavía el problema. Y aquí está la tensión: cuánto riesgo es aceptable depende de qué tareas haga el bot. No es lo mismo decir «¿dónde está mi paquete?» que prometer un reembolso. **Hoy, ¿qué es lo que más le duele a tu equipo de soporte?**"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-28T09:43:00-06:00",
        "content": "Recibimos unos 1,200 tickets al mes. Calculo que el 60% son «¿dónde está mi paquete?», que se responde con datos del rastreo. El resto son reclamos, cambios de dirección y facturas."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-28T09:43:40-06:00",
        "content": "Si ese 60% se responde solo con datos del rastreo, tu miedo se achica: un bot que **solo lee el rastreo y no improvisa** tiene poco margen para inventar. Pero ese 60% es tu cálculo, no un dato, y hay algo que no me cuadra: si el rastreo ya responde, ¿por qué escriben? Quizá el problema es un rastreo confuso o desactualizado. ¿Qué encontrarías si leyeras 50 de esos tickets?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-28T09:46:00-06:00",
        "content": "Veo dos opciones: un chatbot que responda directo al cliente, o un asistente interno que redacte respuestas que el agente revisa y envía."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-28T09:46:40-06:00",
        "content": "Tienes dos caminos: el chatbot directo ahorra más, pero expone al cliente a lo que invente; el asistente interno pone a un agente como filtro y ahorra menos. Elegir antes de leer esos tickets es escoger el envase sin saber qué vas a meter. Puedes compararlos en el Decision Lab. ¿Qué tendría que ser cierto de ese 60% para que el chatbot directo valga el riesgo?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-28T09:49:00-06:00",
        "content": "Me inclino por el asistente interno primero, porque si se equivoca lo atrapa una persona. El riesgo es que los agentes lo ignoren o lo aprueben sin leer."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-28T09:49:40-06:00",
        "content": "Propones empezar por el asistente interno porque una persona atrapa los errores, y tú mismo viste su punto débil: un filtro que aprueba sin leer no filtra, solo firma. Ese riesgo crece justo cuando el asistente acierta mucho, porque la gente deja de desconfiar. **¿Qué señal en los datos te diría que tus agentes están aprobando sin leer?**"
      },
      {
        "id": "m9",
        "role": "user",
        "at": "2026-10-28T09:52:00-06:00",
        "content": "Supongo que el asistente reduciría a la mitad el tiempo de primera respuesta en los tickets de rastreo."
      },
      {
        "id": "m10",
        "role": "assistant",
        "at": "2026-10-28T09:52:40-06:00",
        "content": "Eso es una hipótesis, no un hecho: que el asistente reduzca a la mitad el tiempo de primera respuesta en tickets de rastreo. Ojo con la trampa: un tiempo que baja mucho también puede ser la señal de que aprueban sin leer, así que conviene medirlo junto con los errores que llegan al cliente. Para que se pueda refutar necesitas un punto de partida. **¿Cuánto tarda hoy tu equipo en dar la primera respuesta a esos tickets?**"
      }
    ]
  },
  {
    "id": "estudio-bayes",
    "title": "Entender Bayes para el proyecto final",
    "initialPrompt": "Estoy en sexto semestre de actuaría y no entiendo la estadística bayesiana. Mi profesor dice que es clave para mi proyecto final y siento que todo son fórmulas sin sentido.",
    "thesis": "No entiendo la estadística bayesiana y la necesito para estimar la frecuencia de siniestros en una cartera pequeña de seguros de auto.",
    "summary": "Empezó como «Estoy en sexto semestre de actuaría y no entiendo la estadística bayesiana. Mi profesor dice que es clave para». En curso: Tu cartera es el mejor ejemplo: Poisson con priori Gamma.",
    "status": "explorando",
    "stage": "forma",
    "createdAt": "2026-10-26T20:10:00-06:00",
    "updatedAt": "2026-10-26T20:19:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "Proyecto: estimar la frecuencia de siniestros en una cartera pequeña de auto con pocos datos",
        "reason": "Es el proyecto final que pide el profesor",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d2",
        "code": "D2",
        "text": "Aprender Bayes con un ejemplo Poisson-Gamma usando su propia cartera",
        "reason": "Los ejemplos de monedas no se parecen a su problema",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Ya tiene acceso a los datos de su cartera?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿De qué fuente externa saldría la información para la priori?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿En qué momento elegir una priori sí sería hacer trampa?",
        "critical": false,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿De qué trata el proyecto final donde el profesor dice que Bayes es clave?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Bayes es actualizar lo que crees cuando llega evidencia",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "La priori no esconde supuestos: los vuelve discutibles",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Con pocos datos, la priori se justifica, no se esconde",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "Tu cartera es el mejor ejemplo: Poisson con priori Gamma",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Tu cartera es el mejor ejemplo: Poisson con priori Gamma",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Académico",
      "Estudiante · aprender un tema"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-26T20:10:00-06:00",
        "content": "Estoy en sexto semestre de actuaría y no entiendo la estadística bayesiana. Mi profesor dice que es clave para mi proyecto final y siento que todo son fórmulas sin sentido."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-26T20:10:40-06:00",
        "content": "Lo que te pesa no es la estadística, es que las fórmulas te llegan sin la historia que las explica. Y la historia es corta: **Bayes es actualizar lo que crees cuando llega evidencia**, como ajustar la prima de un conductor tras ver su primer año de siniestros. De hecho, la teoría de credibilidad que ya ves en actuaría es Bayes con otro nombre. ¿De qué trata tu proyecto final, para anclarlo ahí?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-26T20:13:00-06:00",
        "content": "Puedo aplicar el teorema de Bayes y hacer los ejercicios del libro, pero no entiendo qué es una distribución a priori ni por qué elegirla no es hacer trampa."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-26T20:13:40-06:00",
        "content": "Ya dominas la mecánica; lo que no te cuadra es que la priori parece una opinión colada en la matemática. Pero hacer trampa sería esconder supuestos, y la priori hace lo contrario: los pone sobre la mesa, donde cualquiera puede discutirlos. Además, con muchos datos su peso se diluye, igual que en credibilidad la experiencia propia va desplazando a la tarifa de grupo. ¿En qué momento crees que elegirla sí sería trampa?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-26T20:16:00-06:00",
        "content": "Mi proyecto final es estimar la frecuencia de siniestros en una cartera pequeña de seguros de auto, con pocos datos."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-26T20:16:40-06:00",
        "content": "Una cartera pequeña con pocos datos es justo donde tu duda pesa más: ahí la priori no se diluye, carga buena parte de la estimación. Por eso no basta con elegirla, hay que **justificarla con evidencia externa**, como la frecuencia de una cartera más grande o del mercado, y mostrar cuánto cambia el resultado si la mueves. Eso convierte la sospecha de trampa en un análisis de sensibilidad. ¿De dónde podrías sacar información para tu priori?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-26T20:19:00-06:00",
        "content": "Creo que me ayudaría ver un ejemplo con datos de verdad, pero todos los tutoriales usan monedas o dados."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-26T20:19:40-06:00",
        "content": "Las monedas no te sirven porque no se parecen a tu problema, y tu problema ya trae su propio ejemplo. La frecuencia de siniestros suele modelarse como **Poisson con priori Gamma**, y ahí la posteriori sale casi a mano: es credibilidad pura. Podemos armarlo con los números de tu cartera, y si encuentras una fuente pública de frecuencias, pégala con \"Agregar fuente\" para construir la priori. ¿Ya tienes acceso a los datos de tu cartera?"
      }
    ]
  },
  {
    "id": "plan-investigacion",
    "title": "Delivery y ultraprocesados en universitarios",
    "initialPrompt": "Soy investigadora en salud pública. Quiero estudiar «el impacto de las apps de delivery en la alimentación de los jóvenes», pero mi comité dice que la pregunta es demasiado amplia.",
    "thesis": "Quienes usan delivery más de tres veces por semana consumen más ultraprocesados que quienes no.",
    "summary": "Empezó como «Soy investigadora en salud pública. Quiero estudiar «el impacto de las apps de delivery en la alimentación de ». En curso: Si el delivery ya cuenta como ultraprocesado, mides lo mismo dos veces.",
    "status": "explorando",
    "stage": "prueba",
    "createdAt": "2026-10-25T12:30:00-06:00",
    "updatedAt": "2026-10-25T12:39:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "Población: universitarios de dos universidades en Guadalajara",
        "reason": "Acceso directo de la investigadora",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d2",
        "code": "D2",
        "text": "Desenlace: frecuencia de consumo de ultraprocesados",
        "reason": "Es lo que más le interesa de la alimentación",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d3",
        "code": "D3",
        "text": "Diseño transversal con cuestionario de frecuencia de consumo en universitarios de dos universidades de Guadalajara",
        "reason": "Se ajusta a una pregunta de asociación y al financiamiento de un año",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [
      {
        "id": "h1",
        "code": "H1",
        "text": "Quienes usan delivery más de tres veces por semana consumen más ultraprocesados que quienes no lo usan",
        "critical": false,
        "test": "Encuesta transversal con cuestionario de frecuencia, comparando ambos grupos y ajustando por confusores",
        "status": "con-prueba"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Cómo se separa el consumo de ultraprocesados que llega por delivery del que proviene de otras vías?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿Qué variables confusoras (ingreso, vivir solo, horarios) hay que medir para que la asociación sea interpretable?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿El estudio busca demostrar causalidad o describir una asociación?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿Qué cambio concreto sospechas que las apps de delivery provocan en la alimentación de los jóvenes?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Cada palabra de tu pregunta es un estudio distinto",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "«Cambia» promete causalidad; el diseño tiene que poder sostenerla",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Comparar grupos muestra asociación; la causalidad exige otro diseño",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "Si el delivery ya cuenta como ultraprocesado, mides lo mismo dos veces",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Si el delivery ya cuenta como ultraprocesado, mides lo mismo dos veces",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Académico",
      "Investigación"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-25T12:30:00-06:00",
        "content": "Soy investigadora en salud pública. Quiero estudiar «el impacto de las apps de delivery en la alimentación de los jóvenes», pero mi comité dice que la pregunta es demasiado amplia."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-25T12:30:40-06:00",
        "content": "Tu comité tiene algo de razón: en esa frase caben al menos cuatro estudios, porque **«impacto», «apps», «alimentación» y «jóvenes»** son, cada uno, una caja enorme. Antes de recortar por método, conviene saber qué te hizo sospechar algo en primer lugar. Si tuvieras que apostar, ¿qué cambio concreto crees que las apps están provocando en cómo comen esos jóvenes?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-25T12:33:00-06:00",
        "content": "Me interesa sobre todo qué comen: si tener delivery cambia la frecuencia de comida ultraprocesada en universitarios. Trabajo en Guadalajara y tengo acceso a estudiantes de dos universidades."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-25T12:33:40-06:00",
        "content": "Ya recortaste mucho: universitarios de Guadalajara y frecuencia de ultraprocesados es una pregunta que cabe en un estudio. Aquí hay algo que no me cuadra: «cambia» es una palabra **causal**, y si solo comparas a quienes usan delivery con quienes no, quizá midas ingreso o vivir solo, no la app. ¿Buscas demostrar que el delivery provoca ese consumo o te basta con describir la asociación?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-25T12:36:00-06:00",
        "content": "Mi hipótesis es que quienes usan delivery más de tres veces por semana consumen más ultraprocesados que quienes no. Pero no sé si eso sería causalidad o solo correlación."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-25T12:36:40-06:00",
        "content": "Tal como la planteas, es **una asociación**: comparar dos grupos en un mismo momento te dice si van juntos, no si la app provoca el consumo. Y está bien, una asociación bien medida es un estudio defendible ante un comité, siempre que midas lo que podría explicar ambas cosas a la vez. ¿Qué factor, aparte del delivery, sospechas que haría que un estudiante coma más ultraprocesados?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-25T12:39:00-06:00",
        "content": "Pensaba hacer una encuesta transversal con un cuestionario de frecuencia de consumo. Tengo financiamiento para un año y una asistente."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-25T12:39:40-06:00",
        "content": "Una encuesta transversal con cuestionario de frecuencia encaja con tu pregunta de asociación, y un año con asistente da para hacerla bien. Aquí hay algo que no me cuadra: si lo que piden por delivery ya cuenta como ultraprocesado, la asociación sale **casi por definición**, porque estarías midiendo lo mismo dos veces. ¿Tu cuestionario separa lo que llega por app de lo que comen por otras vías?"
      }
    ]
  },
  {
    "id": "tesis-maestria",
    "title": "Tema de tesis: LLMs y retroalimentación",
    "initialPrompt": "Estudio una maestría en ciencias de la computación y tengo que definir tema de tesis. Me interesa «IA para la educación», pero mi asesor dice que eso no es un tema, es un área.",
    "thesis": "Retroalimentación con modelos de lenguaje para estudiantes de bachillerato técnico que aprenden a programar en español.",
    "summary": "Empezó como «Estudio una maestría en ciencias de la computación y tengo que definir tema de tesis. Me interesa «IA para la ». En curso: El acceso dice dónde; falta decir por qué importaría.",
    "status": "explorando",
    "stage": "forma",
    "createdAt": "2026-10-24T18:00:00-06:00",
    "updatedAt": "2026-10-24T18:09:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "Acotar el tema a retroalimentación con LLMs para estudiantes que aprenden a programar",
        "reason": "Pasar de un área a algo más cercano a una pregunta",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d2",
        "code": "D2",
        "text": "Enfocar la tesis en retroalimentación con modelos de lenguaje para estudiantes de bachillerato técnico que programan en español",
        "reason": "En los ~15 papers revisados casi no hay estudios en español ni en bachilleratos técnicos",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d3",
        "code": "D3",
        "text": "Contexto candidato: alumnos de programación de un CBTIS en Puebla (unos 60)",
        "reason": "Acceso viable a través de un amigo que da clases ahí",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Qué diferencia de estos estudiantes haría esperar resultados distintos a los de los papers en inglés?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿Por qué esperarías que los resultados sean distintos en bachilleratos técnicos en español?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿Qué miden los trabajos existentes y qué dejan sin medir?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿Qué situación concreta de aprendizaje está mal resuelta y quieres atacar?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Un área es un territorio; una tesis necesita una pregunta",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "El aporte suele estar en lo que nadie está midiendo",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Un hueco vale cuando explicas por qué el contexto cambiaría el resultado",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "El acceso dice dónde; falta decir por qué importaría",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "El acceso dice dónde; falta decir por qué importaría",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Académico",
      "Tesis de maestría"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-24T18:00:00-06:00",
        "content": "Estudio una maestría en ciencias de la computación y tengo que definir tema de tesis. Me interesa «IA para la educación», pero mi asesor dice que eso no es un tema, es un área."
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-24T18:00:40-06:00",
        "content": "Tu asesor tiene un punto: «IA para la educación» es como decir «quiero escribir sobre el mar»; ahí cabe todo, así que todavía no hay una pregunta que se pueda responder en una tesis. Un tema suele nacer de algo más pequeño y más incómodo: un momento concreto donde aprender falla. **Lo que buscas es una pregunta, no un territorio.** ¿Qué situación de aprendizaje has visto o vivido que te parezca que está mal resuelta?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-24T18:03:00-06:00",
        "content": "Me gustaría algo con modelos de lenguaje que den retroalimentación a estudiantes que aprenden a programar. Ya hay muchos papers y no sé dónde podría aportar algo."
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-24T18:03:40-06:00",
        "content": "Ya bajaste del mar a una bahía: retroalimentación con modelos de lenguaje para quien empieza a programar. Que haya muchos papers no significa que el hueco no exista; a veces todos miden lo mismo y dejan la pregunta incómoda sin tocar. **El aporte suele estar en lo que nadie está midiendo.** En los papers que has leído, ¿qué evalúan: si la retroalimentación es correcta, o si el estudiante aprende algo que le sirva sin ella?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-24T18:06:00-06:00",
        "content": "Leí unos 15 papers. Casi todos evalúan en inglés y con estudiantes de universidades grandes. Casi nada en español ni en bachilleratos técnicos."
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-24T18:06:40-06:00",
        "content": "Ya tienes un hueco concreto: retroalimentación con modelos de lenguaje para estudiantes de bachillerato técnico que programan en español. Pero aquí hay algo que no me cuadra: «nadie lo ha hecho en español» puede leerse como una réplica, no como un aporte, salvo que tengas una razón para esperar que los resultados cambien. **Lo que da valor al hueco es por qué el contexto importaría.** ¿Qué crees que cambiaría en esos estudiantes respecto a los de los papers?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-24T18:09:00-06:00",
        "content": "Podría trabajar con un CBTIS en Puebla donde da clases un amigo: unos 60 alumnos de programación."
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-24T18:09:40-06:00",
        "content": "Tener acceso a 60 alumnos de un CBTIS en Puebla resuelve el **dónde**, y eso no es poca cosa en una tesis. Pero el acceso responde a si puedes hacerlo, no a por qué importaría: sigues necesitando una razón para esperar resultados distintos. Si conoces el grupo por tu amigo, tal vez ya intuyes algo. ¿Qué tienen esos alumnos que podría hacer que la retroalimentación funcione distinto con ellos?"
      }
    ]
  },
  {
    "id": "mole-casero",
    "title": "Mole casero en frascos",
    "initialPrompt": "hago un mole muy bueno y quiero venderlo de alguna manera",
    "thesis": "Hago un mole muy bueno y quiero venderlo. Me inclino por frascos porque dura más y no tengo que estar en un puesto.",
    "summary": "Empezó como «hago un mole muy bueno y quiero venderlo de alguna manera». En curso: Elige el formato pensando en quien compra, no solo en ti.",
    "status": "explorando",
    "stage": "prueba",
    "createdAt": "2026-10-28T16:05:00-06:00",
    "updatedAt": "2026-10-28T16:17:40-06:00",
    "decisions": [
      {
        "id": "d1",
        "code": "D1",
        "text": "Propuesta: no invertir los 30 mil hasta tener evidencia de demanda",
        "reason": "El canal depende de quién compra, y eso aún no se sabe",
        "status": "proposed",
        "source": "chat"
      },
      {
        "id": "d2",
        "code": "D2",
        "text": "Vender el mole en frascos",
        "reason": "Dura más y no requiere atender un puesto",
        "status": "proposed",
        "source": "chat"
      }
    ],
    "hypotheses": [
      {
        "id": "h1",
        "code": "H1",
        "text": "El mole es lo bastante bueno como para que desconocidos paguen por él",
        "critical": false,
        "test": "Ofrecerlo a personas fuera del círculo cercano y ver si lo compran o lo vuelven a pedir",
        "status": "con-prueba"
      },
      {
        "id": "h2",
        "code": "H2",
        "text": "Personas que no conocen a la cocinera pagarían por su mole y volverían a pedir",
        "critical": false,
        "test": "Vender unas pocas porciones a desconocidos y registrar cuántos repiten",
        "status": "con-prueba"
      },
      {
        "id": "h3",
        "code": "H3",
        "text": "Personas fuera de familia y vecinos pagarán por un frasco de mole sin haberlo probado antes",
        "critical": false,
        "test": "Ofrecer 10 frascos a desconocidos y contar cuántos se venden",
        "status": "con-prueba"
      },
      {
        "id": "h4",
        "code": "H4",
        "text": "El mole en frasco se conserva de forma segura el tiempo necesario para venderse",
        "critical": false,
        "test": "Informarse sobre conservación y requisitos antes de producir en cantidad",
        "status": "con-prueba"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "code": "Q1",
        "text": "¿Algún vecino o conocido ha pagado alguna vez por tu mole?",
        "critical": false,
        "status": "open"
      },
      {
        "id": "q2",
        "code": "Q2",
        "text": "¿Cuántos frascos vendidos a desconocidos, y en qué plazo, te harían seguir o abandonar esta forma de vender?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q3",
        "code": "Q3",
        "text": "¿Alguien fuera de familia y vecinos ha pagado o pedido mole por iniciativa propia?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q4",
        "code": "Q4",
        "text": "¿Alguien fuera de familia y amigos ha probado el mole y ha querido pagar por él?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q5",
        "code": "Q5",
        "text": "¿Quién es el primer comprador concreto del mole y para qué ocasión lo quiere?",
        "critical": true,
        "status": "open"
      },
      {
        "id": "q6",
        "code": "Q6",
        "text": "¿Para quién sería este mole y qué cambiaría para esa persona?",
        "critical": true,
        "status": "open"
      }
    ],
    "discarded": [],
    "risks": [],
    "sources": [],
    "highlights": [
      {
        "id": "hl1",
        "text": "Que sea bueno es hipótesis hasta que alguien pague",
        "mark": "si"
      },
      {
        "id": "hl2",
        "text": "Primero quién compra; el canal viene después",
        "mark": "si"
      },
      {
        "id": "hl3",
        "text": "Un elogio no cuesta nada; una compra sí",
        "mark": "si"
      },
      {
        "id": "hl4",
        "text": "El cariño elogia gratis; el mercado paga",
        "mark": "si"
      },
      {
        "id": "hl5",
        "text": "Elige el formato pensando en quien compra, no solo en ti",
        "mark": "si"
      }
    ],
    "proposals": [],
    "nextStep": {
      "text": "Por definir: primero hay que cerrar la pregunta crítica abierta.",
      "why": "Elige el formato pensando en quien compra, no solo en ti",
      "doneWhen": "Cuando Pilar y tú acuerden una acción concreta para esta semana.",
      "effort": "Por definir"
    },
    "tags": [
      "Cotidiano",
      "Emprendimiento"
    ],
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "at": "2026-10-28T16:05:00-06:00",
        "content": "hago un mole muy bueno y quiero venderlo de alguna manera"
      },
      {
        "id": "m2",
        "role": "assistant",
        "at": "2026-10-28T16:05:40-06:00",
        "content": "Tienes algo que sabes hacer bien, un mole, y ganas de convertirlo en algo que se venda, aunque todavía no sabes cómo. Que tu mole sea **muy bueno** es por ahora una hipótesis: puede ser cierto, pero lo que importa es si alguien que no te quiere estaría dispuesto a pagarlo, y eso aún no lo sabemos. Antes de pensar en el \"de alguna manera\", conviene ver qué evidencia ya tienes. ¿Quién, fuera de tu familia y amigos cercanos, ha probado tu mole y qué hizo después de probarlo?"
      },
      {
        "id": "m3",
        "role": "user",
        "at": "2026-10-28T16:08:00-06:00",
        "content": "no se si en frascos, un puesto o por internet, tengo como 30 mil ahorrados"
      },
      {
        "id": "m4",
        "role": "assistant",
        "at": "2026-10-28T16:08:40-06:00",
        "content": "Estás eligiendo entre tres formas de vender, frascos, puesto o internet, y tienes unos 30 mil ahorrados como colchón. La tensión es que el canal depende de **quién te va a comprar y en qué momento**, y eso todavía no lo sabemos; elegir formato antes de conocer al comprador es arriesgar esos ahorros sobre un supuesto. Te propondría no comprometer ese dinero todavía y usar una mínima parte para probar antes, por ejemplo vendiendo unas cuantas porciones a gente que no te conoce y viendo si vuelve a pedir. Pensando en esas tres opciones, ¿te imaginas a alguien concreto comprándote el mole: quién es y para qué ocasión lo quiere?"
      },
      {
        "id": "m5",
        "role": "user",
        "at": "2026-10-28T16:11:00-06:00",
        "content": "todos los que lo prueban dicen que está buenísimo"
      },
      {
        "id": "m6",
        "role": "assistant",
        "at": "2026-10-28T16:11:40-06:00",
        "content": "Lo que tienes hasta ahora es que a la gente que lo prueba le gusta mucho, y eso es una buena señal de que el mole sabe bien. Pero \"está buenísimo\" es lo que se dice por cortesía, sobre todo cuando quien cocina está enfrente; no cuesta nada decirlo. La señal que de verdad pesa es la que cuesta algo: que alguien te pague, que vuelva a pedir o que te recomiende sin que se lo pidas. ¿Alguna vez alguien te ha pedido mole por su cuenta, para llevar o para una fiesta, o solo lo han probado cuando tú lo ofreces?"
      },
      {
        "id": "m7",
        "role": "user",
        "at": "2026-10-28T16:14:00-06:00",
        "content": "pues la familia y los vecinos"
      },
      {
        "id": "m8",
        "role": "assistant",
        "at": "2026-10-28T16:14:40-06:00",
        "content": "Entonces tu evidencia viene de familia y vecinos, gente que te quiere o que te ve todos los días. Los vecinos valen un poco más que la familia, pero tampoco les cuesta nada decirte que está rico; lo que separa el cariño del negocio es el dinero. Por eso tu primera prueba podría ser muy barata: ofrecer mole a la venta a gente fuera de ese círculo, por ejemplo en un grupo de tu colonia o en el trabajo de alguien, sin gastar casi nada de tus ahorros. ¿Alguna vez algún vecino te ha pagado por tu mole, o siempre ha sido regalado?"
      },
      {
        "id": "m9",
        "role": "user",
        "at": "2026-10-28T16:17:00-06:00",
        "content": "creo que en frascos porque dura más y no tengo que estar en un puesto"
      },
      {
        "id": "m10",
        "role": "assistant",
        "at": "2026-10-28T16:17:40-06:00",
        "content": "Elegiste frascos porque duran más y no te atan a un puesto; lo anoto como **decisión propuesta**, y es razonable que tu tiempo cuente. Pero son razones de comodidad tuya, no de quien compra, y el frasco trae sus propios supuestos: que quien no te conoce pague por un mole envasado sin probarlo antes y que puedas conservarlo de forma segura el tiempo que crees, algo que conviene confirmar antes de invertir en envases o permisos. Una prueba pequeña sería preparar unos 10 frascos con tu receta actual y ofrecerlos solo a personas fuera de familia y vecinos, gastando una parte mínima de tus 30 mil. Antes de hacerlo, ¿cuántos de esos 10 frascos tendrían que venderse a desconocidos, y en cuánto tiempo, para que sigas adelante con esta forma de vender?"
      }
    ]
  }
];
