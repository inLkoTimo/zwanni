"use client";

import { useState } from "react";

import { CATEGORIES } from "@/lib/game/categories";
import { teamAvatarSeed } from "@/lib/game/display";
import type { DrafterSlot, RoomRow } from "@/lib/game/types";
import { BidderAvatar } from "../BidderAvatar";

const TEAM_HEX: Record<DrafterSlot, string> = { A: "#ff5d5d", B: "#4da6ff" };

export function LobbyScreen({
  room,
  myRole,
  onStartRound,
  loading,
  error,
}: {
  room: RoomRow;
  myRole: DrafterSlot | "spectator" | null;
  onStartRound: (categoryId: string) => void;
  loading: boolean;
  error: string;
}) {
  const [copied, setCopied] = useState(false);
  const { participants, drafterAId, drafterBId } = room.game_state;

  const nameFor = (role: "A" | "B") => {
    const id = role === "A" ? drafterAId : drafterBId;
    return participants.find((p) => p.id === id)?.name ?? null;
  };

  const bothPresent = Boolean(drafterAId && drafterBId);
  const canStart = (myRole === "A" || myRole === "B") && bothPresent;

  const shareLink =
    typeof window !== "undefined" ? `${window.location.origin}?code=${room.code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard nicht verfügbar - Nutzer kopiert den Code manuell.
    }
  };

  return (
    <main className="min-h-dvh p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground/60">Raum-Code</p>
          <p className="text-4xl font-black tracking-widest text-gold">{room.code}</p>
          <button
            onClick={copyLink}
            className="text-sm underline text-foreground/70 hover:text-gold"
          >
            {copied ? "Link kopiert!" : "Einladungslink kopieren"}
          </button>
        </div>

        <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-foreground/50">Drafter</p>
          <div className="flex items-center gap-3">
            <BidderAvatar seed={teamAvatarSeed(room.game_state, "A")} paddleColor={TEAM_HEX.A} size={44} />
            <p className="text-team-a font-bold text-lg">{nameFor("A") ?? "…"}</p>
          </div>
          <div className="flex items-center gap-3">
            <BidderAvatar seed={teamAvatarSeed(room.game_state, "B")} paddleColor={TEAM_HEX.B} size={44} />
            <p className="text-team-b font-bold text-lg">
              {nameFor("B") ?? (
                <span className="font-normal text-foreground/50 text-sm">wartet auf zweite Person…</span>
              )}
            </p>
          </div>
          {participants.some((p) => p.role === "spectator") && (
            <p className="text-sm text-foreground/60 pt-2">
              Zuschauer: {participants.filter((p) => p.role === "spectator").map((p) => p.name).join(", ")}
            </p>
          )}
        </div>

        {canStart ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground/70 text-center">
              Kategorie für diese Runde wählen:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  disabled={loading}
                  onClick={() => onStartRound(category.id)}
                  className="rounded-lg border border-foreground/20 py-3 px-2 text-sm hover:border-gold hover:bg-gold/10 transition disabled:opacity-50"
                >
                  {category.emoji} {category.label}
                </button>
              ))}
            </div>
            <button
              disabled={loading}
              onClick={() => onStartRound("random")}
              className="w-full rounded-xl bg-gold text-black font-bold py-3 disabled:opacity-50"
            >
              🎲 Zufällige Kategorie
            </button>
          </div>
        ) : bothPresent ? (
          <p className="text-center text-foreground/60 text-sm">
            {nameFor("A")} oder {nameFor("B")} wählt gleich die Kategorie…
          </p>
        ) : (
          <p className="text-center text-foreground/60 text-sm">
            Schick den Einladungslink an eine zweite Person, damit ihr starten könnt.
          </p>
        )}

        {error && <p className="text-team-a text-sm text-center">{error}</p>}
      </div>
    </main>
  );
}
