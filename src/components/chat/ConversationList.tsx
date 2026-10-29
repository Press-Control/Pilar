"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { JOURNEY_STAGES, formatDate, ideas } from "@/lib/fixtures";
import { STORAGE_PREFIX, type ChatSnapshot } from "./model";

export type ConversationItem = {
  id: string;
  href: string;
  title: string;
  stage: string;
  snippet: string;
  date: string | null;
  turns: number;
};

function snippetOf(text: string, max = 120): string {
  const clean = text.replace(/\*\*?/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s\S*$/, "")}…` : clean;
}

function readSnap(id: string): ChatSnapshot | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    const snap = raw ? (JSON.parse(raw) as ChatSnapshot) : null;
    return snap && Array.isArray(snap.messages) && snap.state ? snap : null;
  } catch {
    return null;
  }
}

const stageTitle = (id: string) => JOURNEY_STAGES.find((s) => s.id === id)?.title ?? JOURNEY_STAGES[0]!.title;

/** Fixture ideas (seeded history) merged with whatever this browser saved for each one, plus the unsaved "nueva". */
export function useConversations(): ConversationItem[] {
  const fromFixtures = (): ConversationItem[] =>
    ideas.map((i) => {
      const last = [...i.messages].reverse().find((m) => m.role === "assistant") ?? i.messages[i.messages.length - 1];
      return {
        id: i.id,
        href: `/chat?idea=${i.id}`,
        title: i.title,
        stage: stageTitle(i.stage),
        snippet: last ? snippetOf(last.content) : i.initialPrompt,
        date: i.updatedAt,
        turns: i.messages.filter((m) => m.role === "user").length,
      };
    });
  const [items, setItems] = useState<ConversationItem[]>(fromFixtures);

  useEffect(() => {
    const merged = fromFixtures().map((it) => {
      const snap = readSnap(it.id);
      if (!snap || !snap.messages.length) return it;
      const last = [...snap.messages].reverse().find((m) => (m.role === "assistant" || m.role === "user") && m.content.trim());
      return {
        ...it,
        stage: stageTitle(snap.state.stage),
        snippet: last ? snippetOf(last.content) : it.snippet,
        turns: snap.messages.filter((m) => m.role === "user").length,
      };
    });
    const fresh = readSnap("nueva");
    const firstUser = fresh?.messages.find((m) => m.role === "user");
    if (fresh && firstUser) {
      const last = [...fresh.messages].reverse().find((m) => (m.role === "assistant" || m.role === "user") && m.content.trim());
      merged.unshift({
        id: "nueva",
        href: "/chat",
        title: fresh.state.title ?? snippetOf(firstUser.content, 48),
        stage: stageTitle(fresh.state.stage),
        snippet: last ? snippetOf(last.content) : "",
        date: null,
        turns: fresh.messages.filter((m) => m.role === "user").length,
      });
    }
    setItems(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return items;
}

export function ConversationCards({ items, currentId, onNavigate }: { items: ConversationItem[]; currentId?: string; onNavigate?: () => void }) {
  return (
    <ul className="convo-list">
      {items.map((it) => {
        const current = it.id === currentId;
        return (
          <li key={it.id}>
            <Link href={it.href} className={`convo-card${current ? " is-current" : ""}`} aria-current={current ? "page" : undefined} onClick={onNavigate}>
              <span className="convo-card__meta">
                <span>{it.stage}</span>
                <span>
                  {it.turns} {it.turns === 1 ? "turno" : "turnos"}
                  {it.date ? ` · ${formatDate(it.date)}` : " · sin guardar"}
                </span>
              </span>
              <strong>{it.title}</strong>
              {it.snippet ? <p>{it.snippet}</p> : null}
              <span className="convo-card__go">{current ? "Abierta ahora" : "Continuar ↗"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** "Tu cuaderno" drawer (design guide 13-cuaderno-conversaciones). Escape, scrim or ✕ close it. */
export function ConversationsDrawer({ open, onClose, onNew, currentId }: { open: boolean; onClose: () => void; onNew: () => void; currentId?: string }) {
  const items = useConversations();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="panel convo-panel" aria-label="Conversaciones" role="dialog" aria-modal="true">
        <div className="panel-header">
          <div>
            <div className="eyebrow">TU CUADERNO</div>
            <h2>Conversaciones.</h2>
          </div>
          <button ref={closeBtn} className="close" onClick={onClose} aria-label="Cerrar conversaciones">
            ✕
          </button>
        </div>
        <p className="panel-description">Ideas que ya empezaron, con su historia completa. Abre una para continuarla donde se quedó.</p>
        <button
          type="button"
          className="full-button convo-new"
          onClick={() => {
            onClose();
            onNew();
          }}
        >
          ＋ Nueva conversación
        </button>
        <div className="section-label eyebrow">{items.length} CONVERSACIONES</div>
        <ConversationCards items={items} currentId={currentId} onNavigate={onClose} />
      </aside>
    </>
  );
}
