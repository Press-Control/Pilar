# El Pilar: submission text (copy into the MLH form)

**Tagline:** Think out loud until the idea exists. Pilar listens with ElevenLabs, questions you instead of applauding, and checks your idea against the world with Firecrawl.

**Challenges:** Best Use of ElevenLabs · Best Use of Firecrawl

## Inspiration
People with an idea (architects, researchers, students, founders) talk to chatbots to make it clearer and end up with an endless scroll that agrees with everything. We wanted an interlocutor, not a ghostwriter: someone who asks one good question at a time and turns assumptions into testable hypotheses.

## What it does
You talk with Pilar, by text, by voice, or on a phone call. As you talk, a live model of your idea builds itself next to the conversation: decisions, hypotheses with refutation conditions, open questions and a concrete next step. The journey goes from "La intuición" to "El siguiente paso". The app ships with real cases from industry (software architecture, product MVP, AI strategy) and academia (studying, research plans, thesis scoping).

## How we use ElevenLabs
ElevenLabs is the full voice loop. Speech to Text (scribe) turns your voice into turns after voice-activity detection. Streaming Text to Speech (Flash v2.5, Mexican Spanish voice) speaks Pilar's reply sentence by sentence while the LLM is still generating, at ~0.2 s per sentence. The same voice speaks inside a Twilio phone call ("Llamarme") while the web page updates live. Voice mode keeps everything else identical: same brain, same live idea map.

## How we use Firecrawl
Firecrawl gives Pilar eyes outside the conversation. Paste a URL in "Agregar fuente". Firecrawl /v2/scrape returns clean main-content markdown, which becomes a source of the idea and part of Pilar's context, so she can confirm or contradict your assumptions with evidence. Our goal: every critical hypothesis linked to the sources that support or refute it, with PDFs and DOCX (papers, RFCs, vendor docs), and a panel showing which assumptions still have no evidence.

## How we built it
Next.js 16 + React 19 + TypeScript. Claude (Anthropic API, streaming) as the brain, with a structured side channel that updates the idea model on every turn. ElevenLabs STT and TTS, Firecrawl scrape and Twilio voice all run server-side; keys never reach the browser.

## Challenges
Saturated venue wifi: we added fallbacks (API → local Claude Code → offline script), stall detection, and a tuned voice activity detector for noisy rooms.

## What's next
Link sources to hypotheses, import PDFs/DOCX through Firecrawl, persist ideas as local files, and validate with real users whether a structured idea model beats a well-prompted chat.
