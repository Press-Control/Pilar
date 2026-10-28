"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PromptComposer } from "@/components/ui";
import { HOME_PROMPTS } from "@/lib/fixtures";

/**
 * Inicio (screenshots 01, 05, 06, 08, 26). Centered intro + composer + 3 prompt chips.
 * Submitting navigates to /chat?q=<texto>; the chat page owns the first message from there.
 */
export default function HomePage() {
  const router = useRouter();
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [departing, setDeparting] = useState(false);

  function start(text: string) {
    if (departing) return false;
    setDeparting(true);
    try { sessionStorage.setItem("pilar-first-prompt", text); } catch {}
    const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => router.push(`/chat?q=${encodeURIComponent(text)}`), reduced ? 0 : 280);
    return false; // keep the draft visible while the page transitions
  }

  return (
    <section className={`workspace${departing ? " departing" : ""}`} id="workspace">
      <div className="intro">
        <div className="eyebrow">DE LA INTUICIÓN A LA DECISIÓN</div>
        <h1>
          ¿Qué tienes en mente<span>?</span>
        </h1>
        <p>Una idea, una pregunta o algo que todavía no sabes explicar.</p>
      </div>
      <PromptComposer ref={input} value={draft} onChange={setDraft} onSubmit={start} busy={departing} />
      <div className="prompts">
        {HOME_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setDraft(p.prefix);
              requestAnimationFrame(() => {
                const el = input.current;
                if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
              });
            }}
          >
            {p.glyph} {p.label}
          </button>
        ))}
      </div>
      <div id="savedFeedback" role="status" />
    </section>
  );
}
