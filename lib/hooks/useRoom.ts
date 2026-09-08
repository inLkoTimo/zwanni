"use client";

import { useEffect, useState } from "react";

import { fetchRoom, subscribeToRoom } from "@/lib/supabase/rooms";
import type { RoomRow } from "@/lib/game/types";

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    fetchRoom(roomId)
      .then((row) => {
        if (!cancelled) setRoom(row);
      })
      .catch(() => {
        if (!cancelled) setError("Raum konnte nicht geladen werden.");
      });

    const unsubscribe = subscribeToRoom(roomId, (row) => {
      if (!cancelled) setRoom(row);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [roomId]);

  return { room, error };
}
