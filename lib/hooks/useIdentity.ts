"use client";

import { useEffect, useState } from "react";

/** Eine zufällige, dauerhafte ID pro Browser - damit man nach einem
 *  Neuladen der Seite dieselbe Person im Raum bleibt (und nicht als
 *  neuer Zuschauer erneut beitritt). */
export function useIdentity(): string {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    try {
      const key = "zwanni:identity";
      const existing = window.localStorage.getItem(key);
      if (existing) {
        setId(existing);
        return;
      }
      const fresh = crypto.randomUUID();
      window.localStorage.setItem(key, fresh);
      setId(fresh);
    } catch {
      setId(crypto.randomUUID());
    }
  }, []);

  return id;
}
