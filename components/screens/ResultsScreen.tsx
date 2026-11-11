"use client";

import { teamAvatarSeed, teamName } from "@/lib/game/display";
import type { DrafterSlot, RoomRow } from "@/lib/game/types";
import { auctioneerVerdict } from "@/lib/game/engine";
import { useI18n } from "@/lib/i18n";
import { BidderAvatar } from "../BidderAvatar";

const TEAM_CLASS: Record<DrafterSlot, string> = { A: "text-team-a", B: "text-team-b" };
const TEAM_HEX: Record<DrafterSlot, string> = { A: "#ff5d5d", B: "#4da6ff" };
const CONFETTI_COLORS = ["#f2b705", "#ff5d5d", "#4da6ff", "#34d399", "#f4ead9"];

function Confetti() {
  const pieces = Array.from({ length: 18 });
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
      {pieces.map((_, i) => (
        <div
          key={i}
          className="confetti-piece absolute w-2 h-3 rounded-sm"
          style={{
            left: `${(i * 53) % 100}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${1.6 + (i % 5) * 0.3}s`,
            animationDelay: `${(i % 7) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ResultsScreen({
  room,
  canPlayAgain,
  onPlayAgain,
  loading,
}: {
  room: RoomRow;
  canPlayAgain: boolean;
  onPlayAgain: () => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const nameA = teamName(room.game_state, "A");
  const nameB = teamName(room.game_state, "B");
  const verdict = auctioneerVerdict(room.game_state);
  const winner: DrafterSlot | null =
    verdict.a === verdict.b ? null : verdict.a > verdict.b ? "A" : "B";

  return (
    <main className="relative w-full py-10 flex flex-col items-center justify-center overflow-hidden">
      {winner && <Confetti />}
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-xs uppercase tracking-wide text-foreground/50">{t.result}</p>

        {winner ? (
          <>
            <p className="text-5xl animate-bounce">🏆</p>
            <div className="flex justify-center">
              <BidderAvatar seed={teamAvatarSeed(room.game_state, winner)} paddleColor={TEAM_HEX[winner]} size={96} raised />
            </div>
            <p className="text-4xl font-black">
              <span className={TEAM_CLASS[winner]}>{winner === "A" ? nameA : nameB}</span> {t.wins}
            </p>
          </>
        ) : (
          <p className="text-4xl font-black text-gold">{t.tie}</p>
        )}

        <div className="rounded-xl border border-gold/30 bg-black/20 p-4 space-y-2 text-left">
          <p className="text-xs uppercase tracking-wide text-gold text-center">
            {t.ifTheyPlayed}
          </p>
          <div className="flex h-3 rounded-full overflow-hidden bg-foreground/10">
            <div className="bg-team-a transition-all" style={{ width: `${verdict.a}%` }} />
            <div className="bg-team-b transition-all" style={{ width: `${verdict.b}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-team-a font-bold">
              {nameA} {verdict.a}%
            </span>
            <span className="text-team-b font-bold">
              {nameB} {verdict.b}%
            </span>
          </div>
          <p className="text-xs text-foreground/40 text-center pt-1">
            {t.verdictNote}
          </p>
        </div>

        {canPlayAgain && (
          <button
            disabled={loading}
            onClick={onPlayAgain}
            className="w-full rounded-xl bg-gold text-black font-bold py-3 disabled:opacity-50"
          >
            {t.playAgain}
          </button>
        )}
      </div>
    </main>
  );
}
