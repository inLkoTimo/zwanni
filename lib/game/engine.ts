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

import { CATEGORIES, categoryById, type CategoryItem } from "./categories";
import { ITEMS_PER_ROUND, SLOTS_PER_DRAFTER, STARTING_BUDGET } from "./constants";
import type {
  CurrentAuction,
  DraftedCard,
  DrafterSlot,
  GameState,
  Participant,
  RoundState,
} from "./types";

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

  const items: CategoryItem[] = shuffled(category.items, rng).slice(
    0,
    ITEMS_PER_ROUND,
  );

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
    // Slots voll) - jetzt erst endet die Runde.
    return {
      ...state,
      phase: "finished",
      round: { ...round, position: nextPosition, current: null },
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

/** Die versteckte Stärke-Punktzahl einer Karte (0 = schwächste, 100 =
 *  stärkste). Die Spieler sehen diesen Wert nie - weder während der
 *  Auktion noch danach - er wird nur für `auctioneerVerdict`
 *  gebraucht.
 *
 *  Ist bei einer Karte ein eigener `rank` hinterlegt, wird der
 *  verwendet. Ohne eigenen Wert nutzen wir etwas, das schon längst
 *  da ist: die Reihenfolge der Karte in ihrer Kategorien-Liste
 *  (categories.ts) - die ist von Anfang an nach Bekanntheit/Stärke
 *  sortiert (die bekanntesten/stärksten Einträge zuerst, die
 *  "weak"-Karten ganz am Ende). Der erste Eintrag einer Kategorie
 *  bekommt also die höchste Punktzahl, der letzte die niedrigste -
 *  eine echte, von Hand gemachte Rangliste, kein Zufall. */
function hiddenRank(categoryId: string, card: DraftedCard): number {
  if (typeof card.rank === "number") return card.rank;

  const category = categoryById(categoryId);
  const index = category?.items.findIndex((i) => i.name === card.name) ?? -1;

  if (!category || index < 0 || category.items.length <= 1) {
    // Sollte eigentlich nicht vorkommen - nur als Absicherung.
    return card.weak ? 20 : 65;
  }

  const positionInList = index / (category.items.length - 1); // 0 = erster Eintrag, 1 = letzter
  return Math.round(95 - positionInList * 75); // 95 (stärkste) bis 20 (schwächste)
}

/** Der "Computer-Verdikt": jede gedraftete Karte hat im Hintergrund
 *  eine versteckte Stärke-Punktzahl (0-100), die kein Spieler zu
 *  sehen bekommt - weder während der Auktion noch danach. Am Ende
 *  der Runde bildet der Computer pro Team den Durchschnitt dieser
 *  Punktzahlen (aufsummiert über die 4 Karten, bis jede Seite ihre 4
 *  Karten hat) und rechnet die Differenz in ein Prozent-Ergebnis um
 *  (reine Mathematik, kein echtes KI-Urteil, kein Netzwerkzugriff
 *  nötig) - so, als würden beide Teams in einem gedachten
 *  Kopf-an-Kopf-Duell gegeneinander antreten. Der gezahlte Preis
 *  spielt bewusst KEINE Rolle. Ergebnis liegt immer zwischen 10 und
 *  90, damit es nie komplett eindeutig (0:100) wirkt. Das Ergebnis
 *  dieser Funktion entscheidet direkt, wer als Sieger gilt (siehe
 *  ResultsScreen). */
export function auctioneerVerdict(state: GameState): { a: number; b: number } {
  const round = state.round;
  if (!round || round.rosterA.length === 0 || round.rosterB.length === 0) {
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

// --- Neue Runde ---------------------------------------------------

export function playAgain(state: GameState): GameState {
  return {
    ...state,
    phase: "lobby",
    round: null,
  };
}
