"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  raiseBid,
  resolveAutoAward,
  startRound as startRoundState,
} from "@/lib/game/engine";
import type { DrafterSlot } from "@/lib/game/types";

export type Screen = "home" | "create" | "join" | "room";

export function useZwanniRoom() {
  const identity = useIdentity();
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prefillCode, setPrefillCode] = useState("");

  const { room, error: roomError } = useRoom(roomId);

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
    continueAutoAward: () => withRoom((state) => resolveAutoAward(state)),
    playAgain: () => withRoom((state) => playAgainState(state), "waiting"),
  };

  // Wenn eine Seite schon 4 Karten hat, vergibt die Engine die
  // restlichen Karten der Runde automatisch - aber eine nach der
  // anderen (current wird dazwischen kurz `null`), damit man live
  // mitverfolgen kann, wie die Runde zu Ende geht, statt dass sie
  // abrupt abbricht. Dieser Effekt stößt jeden Schritt selbst an.
  const round = room?.game_state.round;
  const awaitingAutoAward =
    room?.game_state.phase === "drafting" && Boolean(round) && round?.current === null;

  useEffect(() => {
    if (!awaitingAutoAward) return;
    const timer = setTimeout(() => {
      void actions.continueAutoAward();
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingAutoAward, round?.position]);

  return {
    screen,
    setScreen,
    room,
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
