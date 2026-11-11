"use client";

import { useState } from "react";

import { CATEGORIES } from "@/lib/game/categories";
import { teamAvatarSeed } from "@/lib/game/display";
import type { DrafterSlot, RoomRow } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n";
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
  const { t, categoryLabel, error: translateError } = useI18n();
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
    <main className="w-full py-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground/60">{t.roomCode}</p>
          <p className="text-4xl font-black tracking-widest text-gold">{room.code}</p>
          <button
            onClick={copyLink}
            className="text-sm underline text-foreground/70 hover:text-gold"
          >
            {copied ? t.linkCopied : t.copyInvite}
          </button>
        </div>

        <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-foreground/50">{t.drafters}</p>
          <div className="flex items-center gap-3">
            <BidderAvatar seed={teamAvatarSeed(room.game_state, "A")} paddleColor={TEAM_HEX.A} size={44} />
            <p className="text-team-a font-bold text-lg">{nameFor("A") ?? "…"}</p>
          </div>
          <div className="flex items-center gap-3">
            <BidderAvatar seed={teamAvatarSeed(room.game_state, "B")} paddleColor={TEAM_HEX.B} size={44} />
            <p className="text-team-b font-bold text-lg">
              {nameFor("B") ?? (
                <span className="font-normal text-foreground/50 text-sm">{t.waitingForSecond}</span>
              )}
            </p>
          </div>
          {participants.some((p) => p.role === "spectator") && (
            <p className="text-sm text-foreground/60 pt-2">
              {t.spectators}: {participants.filter((p) => p.role === "spectator").map((p) => p.name).join(", ")}
            </p>
          )}
        </div>

        {canStart ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground/70 text-center">
              {t.chooseCategory}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  disabled={loading}
                  onClick={() => onStartRound(category.id)}
                  className="rounded-lg border border-foreground/20 py-3 px-2 text-sm hover:border-gold hover:bg-gold/10 transition disabled:opacity-50"
                >
                  {category.emoji} {categoryLabel(category.id)}
                </button>
              ))}
            </div>
            <button
              disabled={loading}
              onClick={() => onStartRound("random")}
              className="w-full rounded-xl bg-gold text-black font-bold py-3 disabled:opacity-50"
            >
              {t.randomCategory}
            </button>
          </div>
        ) : bothPresent ? (
          <p className="text-center text-foreground/60 text-sm">
            {t.willChooseCategory(nameFor("A") ?? "", nameFor("B") ?? "")}
          </p>
        ) : (
          <p className="text-center text-foreground/60 text-sm">
            {t.sendInvite}
          </p>
        )}

        {error && <p className="text-team-a text-sm text-center">{translateError(error)}</p>}
      </div>
    </main>
  );
}
