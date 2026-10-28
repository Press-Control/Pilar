"use client";

import { forwardRef, useState, type KeyboardEvent } from "react";
import { cx } from "./cx";

export type PromptComposerProps = {
  /** "home": centered, radius 20, 15px text. "dock": bottom of chat column, radius 12 (wrapped in .chat-composer-dock). */
  variant?: "home" | "dock";
  /** Controlled value (optional). If omitted the composer keeps its own draft. */
  value?: string;
  onChange?: (value: string) => void;
  /** Called with trimmed text. Return false (or a rejected promise) to keep the draft (e.g. network error). */
  onSubmit: (text: string) => void | boolean | Promise<void | boolean>;
  placeholder?: string;
  hint?: string;
  label?: string;
  /** Blocks sending (e.g. while streaming). The textarea stays editable. */
  busy?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
};

/**
 * PromptComposer (02-components.md): Enter sends, Shift+Enter new line, IME-safe, whitespace never sends,
 * no double sends while busy, clears only after a successful submit.
 */
export const PromptComposer = forwardRef<HTMLTextAreaElement, PromptComposerProps>(function PromptComposer(
  {
    variant = "home",
    value,
    onChange,
    onSubmit,
    placeholder = "Todo empieza con una idea…",
    hint = variant === "home" ? "TU PRÓXIMO PASO EMPIEZA AQUÍ" : "UNA PREGUNTA A LA VEZ",
    label = "Escribe tu idea",
    busy,
    disabled,
    autoFocus,
    id = variant === "home" ? "idea" : "chat-input",
    className,
  },
  ref,
) {
  const [inner, setInner] = useState("");
  const [sending, setSending] = useState(false);
  const draft = value ?? inner;
  const setDraft = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  const blocked = busy || sending || disabled;

  async function submit() {
    const text = draft.trim();
    if (!text || blocked) return;
    setSending(true);
    try {
      const result = await onSubmit(text);
      if (result !== false) setDraft("");
    } catch {
      /* keep draft so the person can retry */
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const form = (
    <form
      className={cx("composer", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      aria-busy={blocked || undefined}
    >
      <label className="sr-only" htmlFor={id}>{label}</label>
      <textarea
        ref={ref}
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={2}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <div className="composer-footer">
        <span className="composer-hint">{hint}</span>
        <div>
          <span className="keyboard">↵ para enviar</span>
          <button className="send" type="submit" aria-label="Enviar mensaje" disabled={blocked}>↗</button>
        </div>
      </div>
    </form>
  );

  return variant === "dock" ? <div className="chat-composer-dock">{form}</div> : form;
});
