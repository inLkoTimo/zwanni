import { STARTING_BUDGET } from "./constants";
import type { DrafterSlot, GameState } from "./types";

/** Der Anzeigename einer Seite - der echte Spielername, sobald
 *  jemand diese Rolle hat, sonst ein Platzhalter. */
export function teamName(state: GameState, side: DrafterSlot): string {
  const id = side === "A" ? state.drafterAId : state.drafterBId;
  const name = state.participants.find((p) => p.id === id)?.name;
  return name ?? (side === "A" ? "Team A" : "Team B");
}

/** Ein stabiler Seed für den Bieter-Charakter dieser Seite - so
 *  bleibt die Figur einer Person immer gleich, auch nach einem
 *  Neuladen der Seite. */
export function teamAvatarSeed(state: GameState, side: DrafterSlot): string {
  const id = side === "A" ? state.drafterAId : state.drafterBId;
  return id ?? `empty-${side}`;
}

/** 0-100, wie viel Budget noch übrig ist - fürs Budget-Balken. */
export function budgetPercent(budget: number): number {
  return Math.max(0, Math.min(100, Math.round((budget / STARTING_BUDGET) * 100)));
}
