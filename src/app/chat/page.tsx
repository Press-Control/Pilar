import type { Metadata } from "next";
import { ChatView } from "@/components/chat/ChatView";
import { getIdea } from "@/lib/fixtures";

export const metadata: Metadata = { title: "Cuaderno · El Pilar" };

// Entry points: /chat?q=<primer mensaje> (from Inicio), /chat?idea=<fixture id> (from Tus ideas), ?modo=voz (voice mode).
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ q?: string; idea?: string; modo?: string }> }) {
  const { q, idea, modo } = await searchParams;
  const ideaId = getIdea(idea) ? idea : undefined;
  return <ChatView key={ideaId ?? "nueva"} ideaId={ideaId} firstPrompt={typeof q === "string" ? q : undefined} initialMode={modo === "voz" ? "voz" : "texto"} />;
}
