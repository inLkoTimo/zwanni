"use client";

import { useEffect, useRef, useState } from "react";

import { MAX_CHAT_LENGTH } from "@/lib/game/engine";
import type { ChatMessage } from "@/lib/game/types";

/** Der Raum-Chat unter dem Spiel. Läuft über denselben Spielstand wie
 *  das Spiel selbst, also sehen ihn alle im Raum - auch Zuschauer. */
export function ChatPanel({
  messages,
  canWrite,
  onSend,
}: {
  messages: ChatMessage[];
  /** false = nur mitlesen (z. B. weil der Name noch nicht feststeht). */
  canWrite: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Immer zur neuesten Nachricht runterscrollen.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    onSend(clean);
    setText("");
  };

  return (
    <section className="w-full max-w-2xl mt-6 rounded-2xl border border-foreground/10 bg-black/20">
      <p className="px-4 pt-3 text-xs uppercase tracking-wide text-foreground/50">Chat</p>

      <div ref={listRef} className="max-h-48 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.length === 0 ? (
          <p className="text-sm text-foreground/40 py-2">
            Noch keine Nachrichten – schreib die erste.
          </p>
        ) : (
          messages.map((message) => (
            <p key={message.id} className="text-sm break-words">
              <span className="font-bold text-gold">{message.name}:</span>{" "}
              <span className="text-foreground/80">{message.text}</span>
            </p>
          ))
        )}
      </div>

      {canWrite && (
        <div className="flex gap-2 p-3 border-t border-foreground/10">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            maxLength={MAX_CHAT_LENGTH}
            placeholder="Nachricht schreiben…"
            className="flex-1 min-w-0 rounded-lg bg-foreground/5 border border-foreground/20 px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="rounded-lg bg-gold text-black font-bold px-4 py-2 text-sm disabled:opacity-40"
          >
            Senden
          </button>
        </div>
      )}
    </section>
  );
}
