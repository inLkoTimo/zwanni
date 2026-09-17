"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIdentity } from "./useIdentity";
import { useRoom } from "./useRoom";
import { createRoom, fetchRoomByCode, withLatestState } from "@/lib/supabase/rooms";
import { createInitialState } from "@/lib/game/state";
import {
  acceptBid,
  addParticipant,
  forfeitOpening,
  placeOpeningBid,
  playAgain as playAgainState,
  postChatMessage,
  raiseBid,
  startRound as startRoundState,
} from "@/lib/game/engine";
import type { DrafterSlot } from "@/lib/game/types";

/** Wie lange eine gerade vergebene Karte noch sichtbar bleibt, bevor
 *  zur nächsten Karte (oder zum Ergebnis-Bildschirm) gewechselt wird -
 *  in Millisekunden. */
const CARD_REVEAL_DELAY_MS = 1400;

export type Screen = "home" | "create" | "join" | "room";

export function useZwanniRoom() {
  const identity = useIdentity();
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prefillCode, setPrefillCode] = useState("");

  const { room, error: roomError } = useRoom(roomId);

  // Wenn eine Karte vergeben wird (Position rückt vor) oder die
  // Runde dadurch zu Ende geht, zeigen wir noch kurz den alten Stand
  // weiter, statt sofort umzuschalten - so sieht man in Ruhe, wer
  // die Karte bekommen hat, bevor es zur nächsten Karte (oder zum
  // Ergebnis) springt. Alle anderen Wechsel (Raum betreten, neue
  // Runde gestartet, ...) übernehmen wir sofort.
  const [displayRoom, setDisplayRoom] = useState<typeof room>(room);
  const prevRoomRef = useRef<typeof room>(null);

  useEffect(() => {
    const prev = prevRoomRef.current;
    prevRoomRef.current = room;

    if (!room) {
      setDisplayRoom(null);
      return;
    }

    const prevRound = prev?.game_state.round;
    const nextRound = room.game_state.round;

    const sameRoom = Boolean(prev && prev.id === room.id);
    const cardJustAwarded = Boolean(
      sameRoom &&
        prev!.game_state.phase === "drafting" &&
        prevRound &&
        nextRound &&
        prevRound.categoryId === nextRound.categoryId &&
        nextRound.position > prevRound.position,
    );
    const roundJustFinished = Boolean(
      sameRoom && prev!.game_state.phase === "drafting" && room.game_state.phase !== "drafting",
    );

    // Schaut gerade niemand hin (Tab im Hintergrund, Handy-Bildschirm
    // aus), wird nicht verzögert: Browser bremsen dort die Timer aus,
    // und dieses Gerät würde sonst minutenlang einen alten Stand
    // anzeigen, während das andere schon weiter ist.
    const hidden = typeof document !== "undefined" && document.hidden;

    if ((cardJustAwarded || roundJustFinished) && !hidden) {
      const timer = setTimeout(() => setDisplayRoom(room), CARD_REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }

    setDisplayRoom(room);
  }, [room]);

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        setPrefillCode(code.toUpperCase());
        setScreen("join");
      }
    } catch {
      // kein Browser-Zugriff (z. B. beim Bauen) - einfach überspringen.
    }
  }, []);

  useEffect(() => {
    if (room) setScreen("room");
  }, [room]);

  const me = useMemo(() => {
    if (!room) return null;
    return room.game_state.participants.find((p) => p.id === identity) ?? null;
  }, [room, identity]);

  const myRole: DrafterSlot | "spectator" | null = me?.role ?? null;

  const createRoomAction = useCallback(
    async (name: string) => {
      if (!identity) return;
      if (!name.trim()) {
        setError("Gib zuerst deinen Namen ein.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const state = createInitialState(identity, name.trim());
        const row = await createRoom(state);
        setRoomId(row.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Raum konnte nicht erstellt werden.");
      } finally {
        setLoading(false);
      }
    },
    [identity],
  );

  const joinRoomAction = useCallback(
    async (name: string, code: string) => {
      if (!identity) return;
      if (!name.trim()) {
        setError("Gib zuerst deinen Namen ein.");
        return;
      }
      if (!code.trim()) {
        setError("Gib den Code des Raums ein.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const found = await fetchRoomByCode(code.trim().toUpperCase());
        if (!found) {
          setError("Kein Raum mit diesem Code gefunden.");
          return;
        }
        await withLatestState(found.id, (state) =>
          addParticipant(state, { id: identity, name: name.trim() }),
        );
        setRoomId(found.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Beitreten hat nicht funktioniert.");
      } finally {
        setLoading(false);
      }
    },
    [identity],
  );

  const withRoom = useCallback(
    (mutate: Parameters<typeof withLatestState>[1], status?: "waiting" | "playing" | "finished") => {
      if (!roomId) return;
      setError("");
      return withLatestState(roomId, mutate, status).catch((err) => {
        setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      });
    },
    [roomId],
  );

  const actions = {
    startRound: (categoryId: string) =>
      withRoom((state) => startRoundState(state, categoryId), "playing"),
    placeOpeningBid: (drafter: DrafterSlot, amount: number) =>
      withRoom((state) => placeOpeningBid(state, drafter, amount)),
    forfeitOpening: (drafter: DrafterSlot) =>
      withRoom((state) => forfeitOpening(state, drafter)),
    raiseBid: (drafter: DrafterSlot, amount: number) =>
      withRoom((state) => raiseBid(state, drafter, amount)),
    acceptBid: (drafter: DrafterSlot) => withRoom((state) => acceptBid(state, drafter)),
    playAgain: () => withRoom((state) => playAgainState(state), "waiting"),
    sendChatMessage: (text: string) =>
      withRoom((state) => postChatMessage(state, me?.name ?? "Jemand", text)),
  };

  // Der Chat soll sofort ankommen und nicht durch die kurze
  // Karten-Anzeige-Verzögerung gebremst werden - er liest deshalb
  // direkt vom aktuellen Stand, nicht vom verzögerten.
  const chat = room?.game_state.chat ?? [];

  return {
    screen,
    setScreen,
    room: displayRoom,
    chat,
    roomError,
    me,
    myRole,
    identity,
    loading,
    error,
    setError,
    prefillCode,
    actions: {
      createRoom: createRoomAction,
      joinRoom: joinRoomAction,
      ...actions,
    },
  };
}
