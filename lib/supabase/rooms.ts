"use client";

import { createClient } from "./client";
import { isGameState } from "@/lib/game/state";
import type { GameState, RoomRow, RoomStatus } from "@/lib/game/types";

// Alle Datenbankzugriffe an einer Stelle - die Oberfläche kennt
// keine Tabellen und keine Queries.

let cached: ReturnType<typeof createClient> | null = null;

function db() {
  if (!cached) {
    cached = createClient();
  }
  return cached;
}

function fail(message: string, cause?: { message: string }): never {
  throw new Error(cause?.message ? `${message} (${cause.message})` : message);
}

function createRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function fetchRoom(id: string): Promise<RoomRow | null> {
  const { data, error } = await db().from("rooms").select("*").eq("id", id).single();
  if (error) return null;
  return (data as RoomRow) ?? null;
}

export async function fetchRoomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await db()
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  return data as RoomRow;
}

export async function createRoom(initialState: GameState): Promise<RoomRow> {
  const { data, error } = await db()
    .from("rooms")
    .insert({
      code: createRoomCode(),
      status: "waiting" satisfies RoomStatus,
      game_state: initialState,
    })
    .select("*")
    .single();

  if (error || !data) {
    fail("Raum konnte nicht erstellt werden.", error ?? undefined);
  }

  return data as RoomRow;
}

export async function saveState(
  id: string,
  state: GameState,
  status?: RoomStatus,
): Promise<RoomRow> {
  const { data, error } = await db()
    .from("rooms")
    .update({
      game_state: state,
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    fail("Spielstand konnte nicht gespeichert werden.", error ?? undefined);
  }

  return data as RoomRow;
}

/** Liest den aktuellen Stand, wendet die Änderung an und schreibt
 *  zurück. `update` darf `null` liefern, um nichts zu tun - so bleiben
 *  doppelt ausgelöste Aktionen (zwei Klicks, zwei Tabs) folgenlos. */
export async function withLatestState(
  id: string,
  update: (state: GameState) => GameState | null,
  status?: RoomStatus,
): Promise<RoomRow | null> {
  const row = await fetchRoom(id);
  if (!row || !isGameState(row.game_state)) return null;

  const next = update(row.game_state);
  if (!next) return null;

  return saveState(id, next, status);
}

export function subscribeToRoom(id: string, onChange: (row: RoomRow) => void): () => void {
  const channel = db()
    .channel(`zwanni-${id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${id}` },
      (payload) => {
        if (payload.new) {
          onChange(payload.new as RoomRow);
        }
      },
    )
    .subscribe();

  return () => {
    void db().removeChannel(channel);
  };
}
