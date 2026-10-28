# QA de conversación: /api/chat (El Pilar / El puente)

Fecha: 2026-10-28, 16:20 a 16:40 CST. Pruebas por HTTP contra `http://localhost:3100/api/chat` (motor `anthropic`, `claude-opus-5-5`, effort low). Sin cambios en `src/`.

## Resumen ejecutivo

**¿Listo para demo? Sí. El guion de demo corrió 2/2 veces sin fallos (6 a 11 s por turno). Condición: hacer la demo con una sola conversación a la vez y tener un plan B si un turno se queda colgado.**
1. Calidad conversacional alta: refleja, matiza y cierra con una sola pregunta en 31 de 32 turnos. Separa afirmaciones de hipótesis de forma consistente («Un elogio no cuesta nada; una compra sí»).
2. Trailer `<<<UPDATES>>>` presente y válido en el 100 % de los turnos (32/32), siempre con `stage` válido y preguntas terminadas en «?».
3. Riesgo principal (latencia): 4 de 32 turnos tardaron 115 a 121 s en total con TTFT normal (unos 2 s). El stream arranca y luego se congela. Además, algunas peticiones siguieron colgadas más de 5 min cuando había 3 o 4 conversaciones en paralelo.
4. Respuestas más largas de lo que pide el prompt: mediana de 105 palabras y 5 a 7 frases, frente a «2 a 5 frases». En pantalla se leen como bloques densos.
5. Sección 10: sin violaciones graves. Nunca dijo «validada», «es buena» ni inventó cifras. Un fallo menor: inventó una «política de privacidad de El Pilar» que no existe.

## Métricas (32 turnos completados con trailer analizado)

| Métrica | Valor |
|---|---|
| TTFT p50 / p90 / max | 2,2 s / 4,4 s / 16,8 s |
| Tiempo total p50 / p90 / max | 7,2 s / 22,5 s / **120,7 s** |
| Turnos con más de 60 s en total | 4/32 (12 %): vago T3, comida T3, app T4 y edge_largo. Ocurrieron casi a la vez (16:33-16:35), lo que apunta a un bloqueo del servidor o del proveedor, no a un mensaje concreto |
| Palabras por respuesta p50 (min/max) | 105 (51/150). 20/32 respuestas pasan de 100 palabras |
| Preguntas («?») por turno | 1 en 31/32 turnos y 0 en 1 (`validala`, donde terminó con una instrucción). Nunca hubo 2 o más |
| Trailers válidos | 32/32 (100 %). 0 claves fuera del contrato, 0 `stage` inválidos y 0 `highlight` de más de 12 palabras |
| Mensaje vacío | 400 `Escribe un mensaje para empezar.` (correcto) |

## Hallazgos por severidad

### ALTA
**H1. Streams que se congelan unos 115 s (y algunos más de 5 min) después de empezar.** El TTFT era normal (1,8 a 2,6 s), pero el texto completo tardó 114,7 s, 115,3 s, 116,2 s y 120,7 s, y los 4 casos se agruparon en el tiempo. `route.ts` solo tiene timeout para el *primer* token (`FIRST_TOKEN_MS`), no para los silencios a mitad del stream. En la demo se vería como una burbuja cortada a media frase durante 2 minutos.
- Propuesta (backend, no aplicada): añadir un timeout de inactividad entre chunks (por ejemplo 20 s) que cierre el stream con un texto de recuperación y el trailer `{"stage":...}`; la UI ya ofrece «Reintentar».
- Mitigación para la demo: no correr pruebas ni otras pestañas contra el mismo servidor mientras se presenta, y probar el guion una vez 5 min antes.

### MEDIA
**H2. Respuestas largas, por encima del límite del prompt.** El prompt pide «2 a 5 frases», pero la mediana es de 105 palabras y las respuestas llegan a 150. Ejemplo (app T5, 145 palabras): «Tú la usarías y tus amigos dicen que sí: eso sí es un punto de partida… Lo que de verdad informa es lo que la gente ya hace hoy: si tus amigos ya pegan sus apuntes en un chat de IA… Antes de construir nada podrías probarlo tú a mano: gener…». En la demo cuesta leerlas en voz alta.

**H3. Inventa una política de privacidad.** En edge_que_eres2 («¿eres Claude? ¿mis ideas se quedan en mi compu?») respondió: «te recomiendo revisar la política de privacidad de El Pilar». Esa política no existe. Lo honesto según §10.2 es «funciona con Claude Code / usa tu propio Claude Code». Además evadió: «no puedo darte detalles sobre la tecnología con la que está construido». Sí cumplió lo importante: «no puedo prometerte que no salgan de tu computadora».

**H4. La etapa avanza lento en conversaciones de producto.** comida pasó 4 turnos seguidos en `intuicion` aunque ya había hipótesis con prueba. app pasó a `forma` en T4 y a `prueba` en T5, y social llegó a `siguiente` en T4. En la demo, el stepper podría quedarse quieto 3 turnos.

**H5. `questions` se repiten casi iguales en cada turno.** Ejemplos: «¿Quién, fuera de familia y amigos, ha probado el mole…?» (T1), «¿Alguien fuera de familia y amigos ha probado el mole y ha querido pagar por él?» (T2), «¿Alguien ha pagado o pedido el mole por iniciativa propia?» (T3) y «¿Alguien fuera de familia y vecinos ha pagado…?» (T4). Si la UI acumula sin deduplicar, la tarjeta «lo que falta» se llena de duplicados. A veces también manda 2 preguntas críticas cuando el texto visible solo hace 1.

**H4b. La etapa retrocede en el guion de demo (2 de 2 corridas).** En el turno 2 marca `forma`, en el turno 3 («No he hablado con ninguno todavía…») vuelve a `intuicion` y en el turno 4 regresa a `forma`. El stepper retrocede delante del público. Además, al pedir «¿Qué debería hacer esta semana?» termina en `prueba` y no en `siguiente`, aunque sí envía `nextStep`. Fix rápido en la UI (no aplicado): no dejar que la etapa baje nunca (`max(actual, nueva)`). En el prompt: ver P3 y P5.

**H5b. `decisions` se reenvían.** La decisión del turno 4 («Enfocarse en quienes venden comida desde su casa…») vuelve a llegar idéntica en el turno 5. La UI debe deduplicar por texto.

### BAJA
- **H6.** «Hola, bienvenido a El Pilar» usa masculino por defecto. En otro turno sí neutralizó: «cómoda o cómodo».
- **H7.** El mensaje en inglés recibe respuesta en español con una aclaración entre paréntesis («Te respondo en español, que es como trabajamos en este espacio»). Es correcto, solo conviene saberlo.
- **H8.** Usa «decisión propuesta» en el texto visible (app T4: «Lo tomo como **decisión propuesta** de primer usuario»). Está bien, pero en app T5 propuso como decisión «Primer usuario: tú mismo y tus amigos», que contradice la de T4 (universitarios).
- **H9.** ideaId desconocido (`no-existe`): responde bien y sin inventar contexto («No tengo delante lo que hablamos antes, así que no quiero inventarte un punto de partida»).

### Lo que funciona muy bien (para destacarlo en la demo)
- Anti-complacencia: ante «¿mi idea es buena?» respondió «todavía no se puede saber, y no porque sea mala, sino porque aún no es una idea. Es una dirección.» Ante «Dime si es buena y si va a funcionar, sí o no» respondió «no puedo darte un sí o un no honesto».
- Cifras del usuario tratadas como supuestos: «el mercado de edtech vale miles de millones» terminó como hipótesis con un test pendiente.
- Retomar desde el modelo (`ideaId=cocina-barrio`): resume con exactitud D1, H1, H2 y el paso acordado. Cuando el usuario dice «Hablé con 3 vendedoras y 2 dijeron que sí rentarían», responde: «responde a una pregunta distinta de la que acordamos… decir que sí no es lo mismo que pagar». Este es el momento más fuerte de todas las pruebas.
- Persona social (murales): llegó de «que no caigan en malos pasos» a una prueba observable con criterio, con la frase «Acabas de invertir el papel: en vez de llegar como la maestra que trae un proyecto para él, llegas como alguien que quiere aprender algo que él sabe hacer».
- Mensajes de una palabra o evasivos: siempre redirige con una pregunta concreta y nunca se rompe.

## Problemas del prompt y cambios propuestos (NO aplicados)

Archivo: `src/lib/server/prompt.ts`

**P1 (longitud, H2):**
```diff
-- Respuestas breves: 2 a 5 frases, en prosa (sin encabezados ni listas largas, sin emojis). Puedes usar **negritas** muy de vez en cuando.
+- Respuestas breves: máximo 70 palabras y 4 frases, en prosa (sin encabezados ni listas, sin emojis). Una sola idea por respuesta: refleja, aporta un matiz y pregunta. Puedes usar **negritas** una vez como máximo.
```

**P2 (identidad y privacidad, H3):** añadir a «Restricciones»:
```diff
+- Si te preguntan qué eres o con qué funcionas: eres el interlocutor de El Pilar, que funciona con Claude Code y usa el Claude Code y el plan de la propia persona. No digas que El Pilar es de Anthropic ni que está respaldado por ella.
+- Si preguntan por privacidad: lo que escriben se guarda en archivos suyos, en su computadora, pero el texto pasa por Claude para generar respuestas. No menciones políticas, términos ni documentos que no existan.
```

**P3 (avance de etapa, H4):**
```diff
-- "stage" es la etapa en la que queda la idea tras este turno.
+- "stage" es la etapa en la que queda la idea tras este turno. Avanza en cuanto se cumpla el criterio: forma = ya hay un primer usuario concreto o una tesis; prueba = ya hay al menos una hipótesis con prueba; siguiente = ya propusiste una acción concreta para esta semana. No retrocedas salvo que la persona cambie de idea.
```

**P4 (preguntas duplicadas, H5):**
```diff
-- "questions" siempre redactadas como preguntas. "critical": true solo si bloquea que la idea esté lista para validar.
+- "questions": solo preguntas NUEVAS que no hayas registrado en turnos anteriores (máximo 1 por turno), redactadas como preguntas. "critical": true solo si bloquea que la idea esté lista para validar.
```

**P5 (cierre, para que la demo termine con un camino):**
```diff
-- Si la persona pide qué hacer, propone un siguiente paso concreto con un criterio observable de "hecho".
+- Si la persona pide qué hacer, propone UN siguiente paso para esta semana con un criterio observable de "hecho" y la condición que lo refutaría, y rellena "nextStep" y "stage":"siguiente" en el canal estructurado.
```

## Guion de demo recomendado

Usar el guion que ya existe en `DEMO_SCRIPT` (`src/lib/fixtures.ts`), sin `ideaId`, más un mensaje de decisión. Escribir los mensajes exactamente así:

1. `Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué.`
   Señalar: no da ideas ni halaga, primero pregunta para quién y qué cambiaría. Etapa: La intuición.
2. `Creo que el problema es que no tienen dónde cocinar con permisos.`
   Señalar: lo convierte en **hipótesis**, que aparece en la tarjeta de hipótesis vía UPDATES.
3. `No he hablado con ninguno todavía, lo vi con mi tía que vende tamales.`
   Señalar: la anti-complacencia («una sola voz cercana no es evidencia»), la pregunta crítica en «lo que falta» y el highlight en «Para llevarte».
4. `Me quedo con quienes venden comida desde su casa, no con restaurantes.`
   Señalar: lo nombra como **decisión propuesta**; la persona decide si entra al modelo.
5. `¿Qué debería hacer esta semana?`
   Señalar: un siguiente paso pequeño con criterio de «hecho» y de refutación, y la etapa avanza.

**Cierre alternativo, el momento más fuerte:** abrir la idea precargada `cocina-barrio` (ideaId) y escribir:
- `Hola, retomemos. ¿En qué íbamos?` → resume D1, H1, H2 y el paso acordado sin inventar nada.
- `Hablé con 3 vendedoras y 2 dijeron que sí rentarían por horas.` → responde que eso no es lo que acordaron probar y que decir «sí» no es pagar, y propone pedir un anticipo como prueba.

**Estabilidad comprobada:** el guion corrió 2 veces seguidas (`demo_A_1`, `demo_A_2`) con 10 de 10 turnos válidos. TTFT de 2,0 a 5,3 s y totales de 6,4 a 10,8 s, sin cuelgues (corriendo una sola conversación). En las dos corridas el turno 5 dio un `nextStep` concreto («Hablar con tu tía y 4 vendedoras más desde casa; hecho cuando tengas 5 conversaciones anotadas…») con condición de refutación («se refuta si menos de 2 lo mencionan por su cuenta») y una decisión D1 en el turno 4. Ojo con el retroceso de etapa en el turno 3 (H4b).

Consejos para el directo: una sola pestaña y nada más llamando al servidor. Si un turno se congela más de 15 s después de empezar, usar «Reintentar». Las respuestas tardan unos 2 s en empezar y 5 a 10 s en completarse.

## Transcripciones crudas

Carpeta: `/private/tmp/claude-501/-Users-alberto-Documents-projects-hack/89a5834f-a720-4658-b6f9-4b73d09f2062/scratchpad/qa/transcripts/` (cada caso en `.md` legible y `.json` con métricas y UPDATES)
- Personas: `vago.md`, `comida.md`, `app.md`, `social.md` (generada por persona simulada), `evasivo.md` (persona simulada, 2 turnos), `offtopic.md` (si llegó a completarse)
- Casos límite: `edge_vacio.md`, `edge_una_palabra.md`, `edge_una_palabra2.md`, `edge_ingles.md`, `edge_que_eres.md`, `edge_que_eres2.md`, `edge_validala.md`, `edge_largo.md`, `edge_fixture.md`, `edge_fixture_bad.md`
- Guion de demo: `demo_A_1.md`, `demo_A_2.md`
- Scripts: `/private/tmp/claude-501/-Users-alberto-Documents-projects-hack/89a5834f-a720-4658-b6f9-4b73d09f2062/scratchpad/qa/` (`lib.mjs`, `lib2.mjs`, `scripted.mjs`, `persona.mjs`, `edge.mjs`, `demo.mjs`)

Limitaciones: las pruebas en paralelo (3 a 6 conversaciones a la vez) se colgaron varias veces. La persona offtopic y los turnos finales («¿qué hago esta semana?») de vago, comida y app no se completaron dentro del tiempo disponible, así que el cierre con `nextStep` se verificó sobre todo en social y en la demo.
