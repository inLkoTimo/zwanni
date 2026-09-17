// Die eigentlichen Spielregeln von Zwanni - reine Funktionen ohne
// Browser- oder Datenbankzugriff. Jede Funktion nimmt den aktuellen
// Zustand und gibt entweder einen neuen Zustand zurück, oder wirft
// einen Fehler mit einer Meldung, die man 1:1 anzeigen kann.
//
// Ablauf einer Runde:
// 1. Eine Kategorie wird gewählt (fest oder zufällig), 8 Karten
//    daraus werden zufällig gezogen.
// 2. Die Karten werden nacheinander versteigert. Wer dran ist zu
//    eröffnen ("opener"), bietet mindestens 1. Der andere erhöht
//    oder nimmt das Gebot an ("zuschlagen") - dann geht die Karte
//    für diesen Preis an den Höchstbietenden.
// 3. Sobald EIN Drafter 4 Karten hat, kann diese Seite nicht mehr
//    mitbieten - für die restlichen Karten ist es dann eine
//    "Solo-Auktion" (current.solo = true): nur noch der andere
//    Drafter ist dran, muss selbst einen Betrag setzen (mindestens
//    1, wenn Budget da ist), und bekommt die Karte direkt dafür -
//    es gibt ja niemanden mehr, der noch mitbieten könnte. Die
//    Runde endet erst, wenn WIRKLICH alle Karten vergeben sind -
//    also wenn am Ende beide Drafter 4 Karten haben.
// 4. Danach schätzt der Computer (kein echtes KI-Urteil, siehe
//    auctioneerVerdict weiter unten), wer bei einem gedachten
//    Kopf-an-Kopf-Duell der beiden Teams gewinnen würde. Dafür hat
//    jede Karte eine versteckte Stärke-Einstufung, die die Spieler
//    nie zu sehen bekommen.
//
// WICHTIG für "alle sehen dasselbe": Alles, was angezeigt oder
// ausgerechnet wird, steckt im gespeicherten Spielstand - die
// versteckte Stärke und das Emoji werden beim Ziehen fest an die
// Karte geschrieben, und die Prozent-Einschätzung wird einmal am
// Rundenende berechnet und gespeichert. Kein Gerät rechnet also
// selbst etwas aus, das bei ihm anders herauskommen könnte, nur
// weil dort gerade eine ältere Version der Kategorien-Liste
// geladen ist.

import { CATEGORIES, categoryById, type CategoryItem } from "./categories";
import { ITEMS_PER_ROUND, SLOTS_PER_DRAFTER, STARTING_BUDGET } from "./constants";
import type {
  ChatMessage,
  CurrentAuction,
  DraftedCard,
  DrafterSlot,
  GameState,
  Participant,
  RoundState,
  Verdict,
} from "./types";

/** So viele Chat-Nachrichten werden pro Raum aufgehoben - ältere
 *  fallen hinten raus, damit der Spielstand nicht endlos wächst. */
export const MAX_CHAT_MESSAGES = 60;

/** Längenbegrenzung für eine einzelne Chat-Nachricht. */
export const MAX_CHAT_LENGTH = 300;

export class GameError extends Error {}

function fail(message: string): never {
  throw new GameError(message);
}

function other(drafter: DrafterSlot): DrafterSlot {
  return drafter === "A" ? "B" : "A";
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Lobby ---------------------------------------------------------

export function addParticipant(
  state: GameState,
  participant: { id: string; name: string },
): GameState {
  const existing = state.participants.find((p) => p.id === participant.id);
  if (existing) {
    // Schon dabei (z. B. Seite neu geladen) - Name ggf. aktualisieren.
    return {
      ...state,
      participants: state.participants.map((p) =>
        p.id === participant.id ? { ...p, name: participant.name } : p,
      ),
    };
  }

  const needsDrafterB = state.phase === "lobby" && !state.drafterBId;
  const role = needsDrafterB ? "B" : "spectator";

  const next: Participant = {
    id: participant.id,
    name: participant.name,
    role,
    joinedAt: new Date().toISOString(),
  };

  return {
    ...state,
    participants: [...state.participants, next],
    drafterBId: needsDrafterB ? participant.id : state.drafterBId,
  };
}

export function participantName(state: GameState, id: string | null): string {
  if (!id) return "";
  return state.participants.find((p) => p.id === id)?.name ?? "";
}

// --- Runde starten ---------------------------------------------------

export function startRound(
  state: GameState,
  categoryId: string,
  rng: () => number = Math.random,
): GameState {
  if (!state.drafterAId || !state.drafterBId) {
    fail("Es müssen erst zwei Drafter im Raum sein.");
  }

  const category =
    categoryId === "random"
      ? CATEGORIES[Math.floor(rng() * CATEGORIES.length)]
      : categoryById(categoryId);

  if (!category) {
    fail("Unbekannte Kategorie.");
  }

  // Die gezogenen Karten bekommen ihre versteckte Stärke und ihr
  // Emoji hier fest mitgegeben und werden so im Spielstand
  // gespeichert. Dadurch sehen und rechnen später alle Geräte mit
  // exakt denselben Werten - auch wenn auf einem Gerät noch eine
  // ältere Version der Kategorien-Liste im Browser steckt.
  const items: CategoryItem[] = shuffled(category.items, rng)
    .slice(0, ITEMS_PER_ROUND)
    .map((item) => ({
      ...item,
      rank: item.rank ?? rankFromListPosition(category.items, item.name, item.weak),
      emoji: item.emoji ?? category.emoji,
    }));

  const round: RoundState = {
    categoryId: category.id,
    categoryLabel: category.label,
    items,
    position: 0,
    current: openAuction(0, items, { rosterA: [], rosterB: [] }),
    budgetA: STARTING_BUDGET,
    budgetB: STARTING_BUDGET,
    rosterA: [],
    rosterB: [],
    log: [`Kategorie: ${category.label}`],
  };

  return {
    ...state,
    phase: "drafting",
    round,
  };
}

/** Startet die Auktion für die Karte an `position`. Ist eine Seite
 *  schon voll (4 Karten), kann sie nicht mehr mitbieten - dann ist
 *  es eine Solo-Auktion (`solo: true`): Opener ist automatisch die
 *  andere Seite, und ihr Gebot gewinnt sofort (siehe
 *  placeOpeningBid). */
function openAuction(
  position: number,
  items: CategoryItem[],
  rosters: { rosterA: DraftedCard[]; rosterB: DraftedCard[] },
): CurrentAuction | null {
  if (position >= items.length) return null;

  const aFull = rosters.rosterA.length >= SLOTS_PER_DRAFTER;
  const bFull = rosters.rosterB.length >= SLOTS_PER_DRAFTER;
  const solo = aFull || bFull;
  const opener: DrafterSlot = solo ? (aFull ? "B" : "A") : position % 2 === 0 ? "A" : "B";

  return {
    opener,
    awaitingOpen: true,
    highBid: 0,
    highBidder: null,
    turnToAct: opener,
    solo,
  };
}

// --- Bieten ---------------------------------------------------------

function requireRound(state: GameState): RoundState {
  if (state.phase !== "drafting" || !state.round || !state.round.current) {
    fail("Gerade läuft keine Auktion.");
  }
  return state.round;
}

function budgetOf(round: RoundState, drafter: DrafterSlot): number {
  return drafter === "A" ? round.budgetA : round.budgetB;
}

export function placeOpeningBid(
  state: GameState,
  drafter: DrafterSlot,
  amount: number,
): GameState {
  const round = requireRound(state);
  const current = round.current as CurrentAuction;

  if (!current.awaitingOpen) fail("Die Eröffnung ist schon erfolgt.");
  if (current.turnToAct !== drafter) fail("Du bist gerade nicht dran.");
  if (!Number.isInteger(amount) || amount < 1) fail("Mindestgebot ist 1.");
  if (amount > budgetOf(round, drafter)) fail("Dafür reicht dein Budget nicht.");

  if (current.solo) {
    // Die andere Seite ist schon voll und kann nicht mitbieten - das
    // Gebot gewinnt direkt, niemand muss (oder kann) es annehmen.
    return awardCurrentItem(state, round, drafter, amount);
  }

  const nextCurrent: CurrentAuction = {
    ...current,
    awaitingOpen: false,
    highBid: amount,
    highBidder: drafter,
    turnToAct: other(drafter),
  };

  return {
    ...state,
    round: { ...round, current: nextCurrent },
  };
}

/** Der Opener hat kein Geld mehr, um überhaupt zu eröffnen (Budget
 *  0). Normalfall: die Karte geht kostenlos an die andere Seite, die
 *  Runde läuft normal weiter. In einer Solo-Auktion (die andere
 *  Seite ist schon voll und kann gar nichts mehr bekommen) geht die
 *  Karte stattdessen kostenlos an den Opener selbst. */
export function forfeitOpening(state: GameState, drafter: DrafterSlot): GameState {
  const round = requireRound(state);
  const current = round.current as CurrentAuction;

  if (!current.awaitingOpen) fail("Die Eröffnung ist schon erfolgt.");
  if (current.turnToAct !== drafter) fail("Du bist gerade nicht dran.");

  return awardCurrentItem(state, round, current.solo ? drafter : other(drafter), 0);
}

export function raiseBid(
  state: GameState,
  drafter: DrafterSlot,
  amount: number,
): GameState {
  const round = requireRound(state);
  const current = round.current as CurrentAuction;

  if (current.awaitingOpen) fail("Es wurde noch nicht eröffnet.");
  if (current.turnToAct !== drafter) fail("Du bist gerade nicht dran.");
  if (!Number.isInteger(amount) || amount <= current.highBid) {
    fail("Dein Gebot muss höher sein als das aktuelle.");
  }
  if (amount > budgetOf(round, drafter)) fail("Dafür reicht dein Budget nicht.");

  const nextCurrent: CurrentAuction = {
    ...current,
    highBid: amount,
    highBidder: drafter,
    turnToAct: other(drafter),
  };

  return {
    ...state,
    round: { ...round, current: nextCurrent },
  };
}

/** Der aktuell am Zug ist, nimmt das Höchstgebot an - die Karte
 *  geht an den Höchstbietenden. */
export function acceptBid(state: GameState, drafter: DrafterSlot): GameState {
  const round = requireRound(state);
  const current = round.current as CurrentAuction;

  if (current.awaitingOpen) fail("Es wurde noch nicht eröffnet.");
  if (current.turnToAct !== drafter) fail("Du bist gerade nicht dran.");
  if (!current.highBidder) fail("Es gibt noch kein Gebot.");

  return awardCurrentItem(state, round, current.highBidder, current.highBid);
}

function awardCurrentItem(
  state: GameState,
  round: RoundState,
  winner: DrafterSlot,
  price: number,
): GameState {
  const item = round.items[round.position];
  const card = { ...item, price };

  let rosterA = round.rosterA;
  let rosterB = round.rosterB;
  let budgetA = round.budgetA;
  let budgetB = round.budgetB;

  if (winner === "A") {
    rosterA = [...rosterA, card];
    budgetA -= price;
  } else {
    rosterB = [...rosterB, card];
    budgetB -= price;
  }

  const log = [
    `${winner === "A" ? "Team A" : "Team B"} bekommt "${item.name}" für ${price}$`,
    ...round.log,
  ];

  return finishItemAndAdvance(state, {
    ...round,
    rosterA,
    rosterB,
    budgetA,
    budgetB,
    log,
  });
}

function finishItemAndAdvance(state: GameState, round: RoundState): GameState {
  const nextPosition = round.position + 1;

  if (nextPosition >= round.items.length) {
    // Wirklich alle Karten vergeben (beide Seiten haben ihre 4
    // Slots voll) - jetzt erst endet die Runde. Die Einschätzung
    // wird genau hier EINMAL berechnet und mitgespeichert, damit
    // alle Geräte dieselbe Prozentzahl anzeigen.
    const finished: RoundState = { ...round, position: nextPosition, current: null };
    return {
      ...state,
      phase: "finished",
      round: { ...finished, verdict: computeVerdict(finished) },
    };
  }

  return {
    ...state,
    round: {
      ...round,
      position: nextPosition,
      current: openAuction(nextPosition, round.items, round),
    },
  };
}

// --- Computer-Einschätzung ---------------------------------------------

/** Leitet die versteckte Stärke-Punktzahl (0 = schwächste, 100 =
 *  stärkste) aus der Position einer Karte in ihrer Kategorien-Liste
 *  ab. Die Listen in categories.ts sind von Anfang an nach
 *  Bekanntheit/Stärke sortiert (die stärksten Einträge zuerst, die
 *  "weak"-Karten ganz am Ende) - der erste Eintrag bekommt also die
 *  höchste Punktzahl, der letzte die niedrigste. Eine echte, von Hand
 *  gemachte Rangliste, kein Zufall.
 *
 *  Wird nur EINMAL beim Ziehen der Karten aufgerufen (siehe
 *  startRound) - danach steht der Wert fest in der Karte. */
function rankFromListPosition(
  list: CategoryItem[],
  name: string,
  weak: boolean | undefined,
): number {
  const index = list.findIndex((i) => i.name === name);
  if (index < 0 || list.length <= 1) {
    // Sollte eigentlich nicht vorkommen - nur als Absicherung.
    return weak ? 20 : 65;
  }
  const positionInList = index / (list.length - 1); // 0 = erster Eintrag, 1 = letzter
  return Math.round(95 - positionInList * 75); // 95 (stärkste) bis 20 (schwächste)
}

/** Die versteckte Stärke einer bereits gedrafteten Karte. Normalfall:
 *  der Wert steht seit dem Ziehen in der Karte drin. Die Rückfallebene
 *  greift nur bei Runden, die vor dieser Änderung gestartet wurden. */
function hiddenRank(categoryId: string, card: DraftedCard): number {
  if (typeof card.rank === "number") return card.rank;

  const category = categoryById(categoryId);
  if (!category) return card.weak ? 20 : 65;
  return rankFromListPosition(category.items, card.name, card.weak);
}

/** Rechnet die Einschätzung aus einer fertigen Runde aus. Jede Karte
 *  hat im Hintergrund eine versteckte Stärke-Punktzahl (0-100), die
 *  kein Spieler zu sehen bekommt - weder während der Auktion noch
 *  danach. Der Computer bildet pro Team den Durchschnitt dieser
 *  Punktzahlen über die 4 Karten und rechnet die Differenz in ein
 *  Prozent-Ergebnis um (reine Mathematik, kein echtes KI-Urteil, kein
 *  Netzwerkzugriff nötig) - so, als würden beide Teams in einem
 *  gedachten Kopf-an-Kopf-Duell gegeneinander antreten. Der gezahlte
 *  Preis spielt bewusst KEINE Rolle. Ergebnis liegt immer zwischen 10
 *  und 90, damit es nie komplett eindeutig (0:100) wirkt. */
function computeVerdict(round: RoundState): Verdict {
  if (round.rosterA.length === 0 || round.rosterB.length === 0) {
    return { a: 50, b: 50 };
  }

  const average = (cards: DraftedCard[]) =>
    cards.reduce((sum, card) => sum + hiddenRank(round.categoryId, card), 0) / cards.length;

  const avgA = average(round.rosterA);
  const avgB = average(round.rosterB);

  const rawA = Math.round(50 + (avgA - avgB) * 0.6);
  const a = Math.min(90, Math.max(10, rawA));
  return { a, b: 100 - a };
}

/** Das gespeicherte Ergebnis der Computer-Einschätzung. Es wird am
 *  Rundenende einmal berechnet und im Spielstand abgelegt - hier wird
 *  es nur noch ausgelesen, damit auf allen Geräten garantiert
 *  dieselbe Prozentzahl steht. Nur bei alten Runden (noch ohne
 *  gespeichertes Ergebnis) wird notfalls nachgerechnet. Das Ergebnis
 *  entscheidet direkt, wer als Sieger gilt (siehe ResultsScreen). */
export function auctioneerVerdict(state: GameState): Verdict {
  const round = state.round;
  if (!round) return { a: 50, b: 50 };
  if (round.verdict) return round.verdict;
  return computeVerdict(round);
}

// --- Chat ---------------------------------------------------------

/** Hängt eine Chat-Nachricht an den Raum-Verlauf an. Gibt `null`
 *  zurück, wenn nichts zu senden ist (leerer Text) - dann passiert
 *  einfach nichts. */
export function postChatMessage(
  state: GameState,
  name: string,
  text: string,
  now: Date = new Date(),
): GameState | null {
  const clean = text.trim().slice(0, MAX_CHAT_LENGTH);
  if (!clean) return null;

  const message: ChatMessage = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Jemand",
    text: clean,
    at: now.toISOString(),
  };

  const chat = [...(state.chat ?? []), message].slice(-MAX_CHAT_MESSAGES);
  return { ...state, chat };
}

// --- Neue Runde ---------------------------------------------------

export function playAgain(state: GameState): GameState {
  return {
    ...state,
    phase: "lobby",
    round: null,
  };
}
