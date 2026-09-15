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

export type RoundState = {
  categoryId: string;
  categoryLabel: string;
  /** Die 8 gezogenen Karten dieser Runde, in Auktions-Reihenfolge. */
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
};

export type GamePhase = "lobby" | "drafting" | "finished";

export type GameState = {
  version: number;
  phase: GamePhase;
  participants: Participant[];
  drafterAId: string | null;
  drafterBId: string | null;
  round: RoundState | null;
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
