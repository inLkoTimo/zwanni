import type { CategoryItem } from "./categories";

export type DrafterSlot = "A" | "B";

export type ParticipantRole = DrafterSlot | "spectator";

export type Participant = {
  id: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
};

export type DraftedCard = CategoryItem & {
  price: number;
};

/** Der Stand der aktuellen Auktion für genau eine Karte. */
export type CurrentAuction = {
  opener: DrafterSlot;
  /** true = der Opener hat sein Eröffnungsgebot noch nicht abgegeben. */
  awaitingOpen: boolean;
  highBid: number;
  highBidder: DrafterSlot | null;
  /** Wer als nächstes an der Reihe ist (erhöhen oder zuschlagen). */
  turnToAct: DrafterSlot;
  /** true = die andere Seite hat schon 4 Karten und kann nicht mehr
   *  mitbieten - der Opener bietet allein, und sein Gebot gewinnt
   *  sofort (kein Erhöhen/Zuschlagen mehr nötig). */
  solo: boolean;
};

/** Das Ergebnis der Computer-Einschätzung in Prozent (a + b = 100). */
export type Verdict = {
  a: number;
  b: number;
};

export type RoundState = {
  categoryId: string;
  categoryLabel: string;
  /** Die 8 gezogenen Karten dieser Runde, in Auktions-Reihenfolge.
   *  Jede Karte bekommt beim Ziehen ihre versteckte Stärke (`rank`)
   *  und ihr Emoji fest mitgegeben - dadurch sehen und rechnen ALLE
   *  Geräte mit exakt denselben Werten, egal welche Version der
   *  Kategorien-Liste bei ihnen gerade geladen ist. */
  items: CategoryItem[];
  /** Index der Karte, die gerade dran ist (oder als nächstes drankommt). */
  position: number;
  current: CurrentAuction | null;
  budgetA: number;
  budgetB: number;
  rosterA: DraftedCard[];
  rosterB: DraftedCard[];
  /** Kurze Verlaufsmeldungen, neueste zuerst. */
  log: string[];
  /** Wird EINMAL am Rundenende berechnet und hier gespeichert, damit
   *  alle Geräte dieselbe Prozentzahl anzeigen. */
  verdict?: Verdict | null;
};

export type GamePhase = "lobby" | "drafting" | "finished";

/** Eine Chat-Nachricht im Raum. */
export type ChatMessage = {
  id: string;
  /** Name der Person, die geschrieben hat (Stand: Zeitpunkt der Nachricht). */
  name: string;
  text: string;
  /** Zeitpunkt als ISO-String. */
  at: string;
};

export type GameState = {
  version: number;
  phase: GamePhase;
  participants: Participant[];
  drafterAId: string | null;
  drafterBId: string | null;
  round: RoundState | null;
  /** Chat-Verlauf des Raums, älteste zuerst. Bleibt über Runden
   *  hinweg bestehen. Bei alten Räumen kann das Feld fehlen - immer
   *  mit `?? []` lesen. */
  chat?: ChatMessage[];
};

export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomRow = {
  id: string;
  code: string;
  status: RoomStatus;
  game_state: GameState;
  created_at: string;
  updated_at: string;
};
