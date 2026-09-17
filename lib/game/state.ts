import { STATE_VERSION } from "./constants";
import type { GameState } from "./types";

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<GameState>;

  return (
    state.version === STATE_VERSION &&
    typeof state.phase === "string" &&
    Array.isArray(state.participants)
  );
}

export function createInitialState(hostId: string, hostName: string): GameState {
  return {
    version: STATE_VERSION,
    phase: "lobby",
    participants: [
      {
        id: hostId,
        name: hostName,
        role: "A",
        joinedAt: new Date().toISOString(),
      },
    ],
    drafterAId: hostId,
    drafterBId: null,
    round: null,
    chat: [],
  };
}
