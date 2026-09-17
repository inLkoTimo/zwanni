import assert from "node:assert/strict";
import test from "node:test";

import { createInitialState } from "../lib/game/state";
import {
  acceptBid,
  addParticipant,
  auctioneerVerdict,
  forfeitOpening,
  placeOpeningBid,
  playAgain,
  raiseBid,
  startRound,
} from "../lib/game/engine";
import { SLOTS_PER_DRAFTER, STARTING_BUDGET } from "../lib/game/constants";

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

test("addParticipant fills drafter B, then spectators", () => {
  let state = createInitialState("host", "Timo");
  state = addParticipant(state, { id: "guest", name: "Alex" });
  assert.equal(state.drafterBId, "guest");

  state = addParticipant(state, { id: "watcher", name: "Sam" });
  const watcher = state.participants.find((p) => p.id === "watcher");
  assert.equal(watcher?.role, "spectator");
});

test("a full round: bidding, autofill, computer verdict", () => {
  let state = createInitialState("host", "Timo");
  state = addParticipant(state, { id: "guest", name: "Alex" });
  state = startRound(state, "fussballvereine", seededRng(42));

  assert.equal(state.phase, "drafting");
  assert.equal(state.round?.items.length, 8);
  assert.equal(state.round?.budgetA, STARTING_BUDGET);

  // Item 1: A eröffnet mit 5, B erhöht auf 8, A nimmt an -> B gewinnt für 8.
  state = placeOpeningBid(state, "A", 5);
  state = raiseBid(state, "B", 8);
  state = acceptBid(state, "A");

  assert.equal(state.round?.rosterB.length, 1);
  assert.equal(state.round?.rosterB[0].price, 8);
  assert.equal(state.round?.budgetB, STARTING_BUDGET - 8);

  // Restliche Karten reihum einfach ans jeweils höchste Gebot vergeben,
  // bis eine Seite ihre 4 Slots voll hat. Danach ist es eine
  // Solo-Auktion (current.solo) - nur noch die andere Seite bietet,
  // und ihr Gebot gewinnt direkt, ohne dass jemand annehmen muss.
  let guard = 0;
  let sawSoloBid = false;
  while (state.phase === "drafting" && guard < 20) {
    guard += 1;
    const current = state.round!.current!;
    if (current.solo) {
      sawSoloBid = true;
      state = placeOpeningBid(state, current.opener, 1);
      continue;
    }
    state = placeOpeningBid(state, current.opener, 1);
    const other = current.opener === "A" ? "B" : "A";
    state = acceptBid(state, other);
  }

  assert.equal(state.phase, "finished");
  const a: number = state.round!.rosterA.length;
  const b: number = state.round!.rosterB.length;
  // Die Runde endet erst, wenn BEIDE Seiten ihre 4 Slots voll haben -
  // nicht schon, sobald eine Seite so weit ist.
  assert.equal(a, SLOTS_PER_DRAFTER);
  assert.equal(b, SLOTS_PER_DRAFTER);
  assert.equal(a + b, 8);
  assert.ok(sawSoloBid, "Runde sollte eine Solo-Bietphase durchlaufen haben");

  const verdict = auctioneerVerdict(state);
  assert.ok(verdict.a >= 10 && verdict.a <= 90);
  assert.equal(verdict.a + verdict.b, 100);

  state = playAgain(state);
  assert.equal(state.phase, "lobby");
  assert.equal(state.round, null);
});

test("forfeiting an opening gives the card away for free", () => {
  let state = createInitialState("host", "Timo");
  state = addParticipant(state, { id: "guest", name: "Alex" });
  state = startRound(state, "automarken", seededRng(3));

  // A ist zuerst dran zu eröffnen, hat aber (Testfall) kein Geld mehr.
  assert.equal(state.round?.current?.opener, "A");
  state = forfeitOpening(state, "A");

  assert.equal(state.round?.rosterB.length, 1);
  assert.equal(state.round?.rosterB[0].price, 0);
  assert.equal(state.round?.budgetB, STARTING_BUDGET);
  assert.equal(state.round?.position, 1);
  assert.equal(state.round?.current?.opener, "B");
});

test("cannot bid below minimum or above budget", () => {
  let state = createInitialState("host", "Timo");
  state = addParticipant(state, { id: "guest", name: "Alex" });
  state = startRound(state, "automarken", seededRng(7));

  assert.throws(() => placeOpeningBid(state, "A", 0));
  assert.throws(() => placeOpeningBid(state, "A", 21));
  assert.throws(() => placeOpeningBid(state, "B", 3)); // B ist nicht dran
});
