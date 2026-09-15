"use client";

import { useEffect, useMemo, useState } from "react";

import { itemEmoji, categoryById } from "@/lib/game/categories";
import { budgetPercent, teamAvatarSeed, teamName } from "@/lib/game/display";
import type { DrafterSlot, RoomRow } from "@/lib/game/types";
import { BidderAvatar } from "../BidderAvatar";
import { ItemVisual } from "../ItemVisual";

const TEAM_CLASS: Record<DrafterSlot, string> = { A: "text-team-a", B: "text-team-b" };
const TEAM_BORDER: Record<DrafterSlot, string> = { A: "border-team-a", B: "border-team-b" };
const TEAM_BG: Record<DrafterSlot, string> = { A: "bg-team-a", B: "bg-team-b" };
const TEAM_HEX: Record<DrafterSlot, string> = { A: "#ff5d5d", B: "#4da6ff" };

function BudgetBar({ budget }: { budget: number }) {
  const pct = budgetPercent(budget);
  const color = pct <= 20 ? "bg-team-a" : pct <= 50 ? "bg-gold" : "bg-emerald-400";
  return (
    <div className="space-y-1">
      <p className="text-3xl font-black leading-none">
        {budget}
        <span className="text-base font-normal text-foreground/50">$ übrig</span>
      </p>
      <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TeamColumn({
  side,
  room,
  isMe,
  onOpen,
  onForfeit,
  onRaise,
  onAccept,
  loading,
}: {
  side: DrafterSlot;
  room: RoomRow;
  isMe: boolean;
  onOpen: (drafter: DrafterSlot, amount: number) => void;
  onForfeit: (drafter: DrafterSlot) => void;
  onRaise: (drafter: DrafterSlot, amount: number) => void;
  onAccept: (drafter: DrafterSlot) => void;
  loading: boolean;
}) {
  const round = room.game_state.round!;
  const current = round.current;
  const budget = side === "A" ? round.budgetA : round.budgetB;
  const roster = side === "A" ? round.rosterA : round.rosterB;
  const name = teamName(room.game_state, side);
  const opponentName = teamName(room.game_state, side === "A" ? "B" : "A");
  const seed = teamAvatarSeed(room.game_state, side);
  const [amount, setAmount] = useState(1);

  const isMyTurn = Boolean(current && current.turnToAct === side);
  const isLeading = Boolean(current && current.highBidder === side);
  const isOpener = Boolean(current && current.awaitingOpen && current.opener === side);
  const minRaise = current ? current.highBid + 1 : 1;
  const canOpen = budget >= 1;
  const canRaise = budget >= minRaise;

  // Immer mit einem sinnvollen Betrag starten, statt den Wert vom
  // letzten Gebot (auf der vorigen Karte) stehen zu lassen.
  useEffect(() => {
    setAmount(Math.min(minRaise, budget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.position, current?.awaitingOpen, current?.highBid]);

  return (
    <div
      className={`rounded-2xl border-2 p-4 space-y-3 flex-1 transition-colors ${
        isMyTurn ? `${TEAM_BORDER[side]} bg-black/20` : "border-foreground/10 bg-black/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <BidderAvatar seed={seed} paddleColor={TEAM_HEX[side]} raised={isMyTurn} size={56} />
        <div className="min-w-0">
          <p className={`font-black text-lg truncate ${TEAM_CLASS[side]}`}>{name}</p>
          {isMe && <span className="text-[10px] uppercase tracking-wide text-foreground/40">Du</span>}
        </div>
      </div>

      <BudgetBar budget={budget} />

      {current && (
        <div className="text-sm min-h-[1.25rem]">
          {isLeading && (
            <p key={current.highBid} className={`bid-pulse font-bold ${TEAM_CLASS[side]}`}>
              Gebot: {current.highBid}$
            </p>
          )}
          {isOpener && <p className="text-foreground/50">eröffnet gleich…</p>}
        </div>
      )}

      {isMe && isMyTurn && current && (
        <div className="space-y-2 pt-1">
          {current.awaitingOpen ? (
            canOpen ? (
              <>
                <BidInput amount={amount} setAmount={setAmount} min={1} max={budget} />
                <button
                  disabled={loading}
                  onClick={() => onOpen(side, amount)}
                  className={`w-full rounded-xl ${TEAM_BG[side]} text-black font-bold py-2.5 disabled:opacity-50`}
                >
                  Eröffnen
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground/60">
                  Kein Gebot mehr abgeben – du hast kein Geld mehr übrig.
                </p>
                <button
                  disabled={loading}
                  onClick={() => onForfeit(side)}
                  className="w-full rounded-xl border border-foreground/30 py-2.5"
                >
                  Karte kostenlos abgeben
                </button>
              </>
            )
          ) : (
            <>
              {canRaise ? (
                <>
                  <BidInput amount={amount} setAmount={setAmount} min={minRaise} max={budget} />
                  <button
                    disabled={loading}
                    onClick={() => onRaise(side, amount)}
                    className={`w-full rounded-xl ${TEAM_BG[side]} text-black font-bold py-2.5 disabled:opacity-50`}
                  >
                    Erhöhen
                  </button>
                </>
              ) : (
                <p className="text-sm text-foreground/60">
                  Kein Gebot mehr abgeben – nicht genug Geld, um zu erhöhen.
                </p>
              )}
              <button
                disabled={loading}
                onClick={() => onAccept(side)}
                className="w-full rounded-xl border border-foreground/30 py-2.5"
              >
                Kein Gebot mehr abgeben – {opponentName} bekommt die Karte für {current.highBid}$
              </button>
            </>
          )}
        </div>
      )}

      {roster.length > 0 && (
        <ul className="space-y-1 text-xs text-foreground/60 pt-1 border-t border-foreground/10">
          {roster.map((card, i) => (
            <li key={i} className="flex items-center justify-between gap-2 pt-1">
              <span className="flex items-center gap-1.5 truncate">
                {card.image ? (
                  <ItemVisual categoryId={round.categoryId} item={card} size={20} emojiClassName="text-base" />
                ) : (
                  <span>{itemEmoji(round.categoryId, card)}</span>
                )}
                <span className="truncate">{card.name}</span>
              </span>
              <span className="text-gold shrink-0 pl-2">{card.price}$</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BidInput({
  amount,
  setAmount,
  min,
  max,
}: {
  amount: number;
  setAmount: (fn: (a: number) => number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setAmount((a) => Math.max(min, a - 1))}
        className="w-9 h-9 rounded-lg border border-foreground/30 text-lg shrink-0"
      >
        −
      </button>
      <input
        type="number"
        value={Math.min(Math.max(amount, min), max)}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = Number(e.target.value);
          const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, min), max) : min;
          setAmount(() => clamped);
        }}
        className="flex-1 text-center rounded-lg bg-foreground/5 border border-foreground/20 py-2 text-lg outline-none focus:border-gold w-0"
      />
      <button
        onClick={() => setAmount((a) => Math.min(max, a + 1))}
        className="w-9 h-9 rounded-lg border border-foreground/30 text-lg shrink-0"
      >
        +
      </button>
    </div>
  );
}

export function DraftScreen({
  room,
  myRole,
  onOpen,
  onForfeit,
  onRaise,
  onAccept,
  loading,
  error,
}: {
  room: RoomRow;
  myRole: DrafterSlot | "spectator" | null;
  onOpen: (drafter: DrafterSlot, amount: number) => void;
  onForfeit: (drafter: DrafterSlot) => void;
  onRaise: (drafter: DrafterSlot, amount: number) => void;
  onAccept: (drafter: DrafterSlot) => void;
  loading: boolean;
  error: string;
}) {
  const round = room.game_state.round;
  const category = useMemo(
    () => (round ? categoryById(round.categoryId) : undefined),
    [round],
  );

  if (!round) return null;

  const current = round.current;
  const item = round.position < round.items.length ? round.items[round.position] : null;

  // Wenn current null ist, obwohl die Runde noch läuft, heißt das:
  // eine Seite hat schon 4 Karten und kann nicht mehr mitbieten -
  // die aktuelle Karte wird gerade automatisch vergeben.
  const awaitingAutoAward = !current && item;
  const fullSide: DrafterSlot | null = !awaitingAutoAward
    ? null
    : round.rosterA.length >= 4
      ? "A"
      : round.rosterB.length >= 4
        ? "B"
        : null;
  const autoReceiver: DrafterSlot | null = fullSide ? (fullSide === "A" ? "B" : "A") : null;

  return (
    <main className="min-h-dvh p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-5">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-foreground/60">
            {category?.label ?? round.categoryLabel} · Los {round.position + 1} / {round.items.length}
          </p>
          {item && (
            <div
              key={round.position}
              className="card-in inline-block rounded-2xl border border-gold/30 bg-black/25 px-8 py-5 space-y-1"
            >
              <div className="drop-shadow-[0_0_18px_rgba(242,183,5,0.35)]">
                <ItemVisual
                  categoryId={round.categoryId}
                  item={item}
                  size={128}
                  emojiClassName="text-6xl leading-none"
                />
              </div>
              <p className="text-2xl font-black">{item.name}</p>
            </div>
          )}
        </div>

        {awaitingAutoAward && fullSide && autoReceiver && (
          <p className="text-center text-sm text-gold animate-pulse">
            Team {fullSide === "A" ? teamName(room.game_state, "A") : teamName(room.game_state, "B")}{" "}
            hat schon 4 Karten – diese Karte geht automatisch an{" "}
            {autoReceiver === "A" ? teamName(room.game_state, "A") : teamName(room.game_state, "B")}…
          </p>
        )}

        {myRole === "spectator" && (
          <p className="text-center text-foreground/50 text-sm">Du schaust zu.</p>
        )}

        {error && <p className="text-team-a text-sm text-center">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <TeamColumn
            side="A"
            room={room}
            isMe={myRole === "A"}
            onOpen={onOpen}
            onForfeit={onForfeit}
            onRaise={onRaise}
            onAccept={onAccept}
            loading={loading}
          />
          <TeamColumn
            side="B"
            room={room}
            isMe={myRole === "B"}
            onOpen={onOpen}
            onForfeit={onForfeit}
            onRaise={onRaise}
            onAccept={onAccept}
            loading={loading}
          />
        </div>

        {round.log.length > 0 && (
          <div className="text-xs text-foreground/40 space-y-1 pt-1">
            {round.log.slice(0, 3).map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
