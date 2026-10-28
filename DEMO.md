# Guion de demo

Antes de subir: `curl -s localhost:3100/api/health` y un calentamiento (un mensaje, un "Escuchar", una fuente). Una sola pestaña de chat abierta y nada más pegándole al servidor.

## 1. Inicio (`/`) · 20 s
"Esto es El Pilar: un espacio para pensar." Muestra el modo oscuro en Personalizar (el fondo ASCII cambia en cada carga).

## 2. Conversación en vivo con Pilar · 90 s
Escribe exactamente, uno por uno:

1. «Quiero hacer algo para que la gente de mi barrio que vende comida pueda crecer, pero no sé bien qué.» → hace una sola pregunta; el panel lateral empieza a llenarse.
2. «Creo que el problema es que no tienen dónde cocinar con permisos.» → lo convierte en hipótesis.
3. «No he hablado con ninguno todavía, lo vi con mi tía que vende tamales.» → no es complaciente: un caso cercano no es un patrón.
4. «Me quedo con quienes venden comida desde su casa, no con restaurantes.» → lo nombra como decisión propuesta; pulsa **Incorporar**.
5. «¿Qué debería hacer esta semana?» → siguiente paso concreto con criterio de "hecho" y de refutación.

Opcional: "Escuchar" en una respuesta (voz) o "Agregar fuente" con una URL ya probada.

## 3. Dashboard (`/dashboard`) · 45 s
"Así se ve una idea que ya avanzó": *Cocina compartida del barrio* → "Empezó como → Hoy es", mapa de la idea, clic en una hipótesis → inspector con la prueba y cuándo se refutaría.

## 4. Decision Lab (`/lab`) · 30 s
"¿Qué deberíamos construir primero?" → Analizar opciones → clic en una alternativa → comparar → confirmar.

## 5. Cierre fuerte (opcional) · 30 s
`/chat?idea=cocina-barrio`: «Hola Pilar, retomemos. ¿En qué íbamos?» y luego «Hablé con 3 vendedoras y 2 dijeron que sí rentarían por horas.» → "decir que sí no es lo mismo que pagar".

## Plan B
- LLM lento o caído: el fallback es automático. Para forzar: `LLM_PROVIDER=claude-cli` o `mock` en `.env.local` y reiniciar `pnpm dev`.
- Respuesta cortada: reenviar el mensaje.
- Voz o fuente fallan: seguir solo con texto.
- Evitar preguntarle "¿qué eres?" en vivo si no hace falta.
