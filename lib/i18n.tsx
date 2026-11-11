"use client";

// Sprache der Oberfläche (Deutsch / Englisch). Jedes Gerät wählt
// seine eigene Sprache - im selben Raum kann also einer auf Deutsch
// und der andere auf Englisch spielen. Gespeichert wird nur im
// Browser (localStorage), nicht im Spielstand.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { categoryById, type CategoryItem } from "@/lib/game/categories";

export type Lang = "de" | "en";

const STORAGE_KEY = "zwanni:lang";

const de = {
  tagline: "20$ Budget. 8 Karten. Wer holt das bessere Team?",
  createRoom: "Raum erstellen",
  joinRoom: "Raum beitreten",
  yourAvatar: "Deine Figur",
  yourName: "Dein Name",
  namePlaceholderHost: "z. B. Timo",
  namePlaceholderGuest: "z. B. Alex",
  roomCodeLabel: "Code des Raums",
  codePlaceholder: "z. B. AB12CD",
  creating: "Wird erstellt…",
  searching: "Wird gesucht…",
  join: "Beitreten",
  back: "Zurück",
  loadingRoom: "Raum wird geladen…",

  roomCode: "Raum-Code",
  copyInvite: "Einladungslink kopieren",
  linkCopied: "Link kopiert!",
  drafters: "Drafter",
  waitingForSecond: "wartet auf zweite Person…",
  spectators: "Zuschauer",
  chooseCategory: "Kategorie für diese Runde wählen:",
  randomCategory: "🎲 Zufällige Kategorie",
  willChooseCategory: (a: string, b: string) => `${a} oder ${b} wählt gleich die Kategorie…`,
  sendInvite: "Schick den Einladungslink an eine zweite Person, damit ihr starten könnt.",

  card: "Los",
  left: "$ übrig",
  you: "Du",
  bid: "Gebot",
  opensSoon: "eröffnet gleich…",
  soloHint: (opp: string) => `${opp} hat schon 4 Karten – dein Gebot gewinnt sofort.`,
  choiceHint: (opp: string, who: string) => `${opp} hat kein Geld mehr – ${who}, wer die Karte bekommt.`,
  youDecide: "du entscheidest",
  decides: (name: string) => `${name} entscheidet`,
  takeCard: "Karte nehmen",
  giveCardTo: (name: string) => `${name} geben`,
  grabCard: "Karte holen",
  open: "Eröffnen",
  noMoneySolo: "Du hast kein Geld mehr übrig – die Karte gehört trotzdem dir.",
  noMoneyOpen: "Kein Gebot mehr abgeben – du hast kein Geld mehr übrig.",
  takeFree: "Karte kostenlos nehmen",
  giveFree: "Karte kostenlos abgeben",
  raise: "Erhöhen",
  cantRaise: "Kein Gebot mehr abgeben – nicht genug Geld, um zu erhöhen.",
  passTo: (name: string, price: number) => `Kein Gebot mehr abgeben – ${name} bekommt die Karte für ${price}$`,
  spectating: "Du schaust zu.",

  result: "Ergebnis",
  wins: "gewinnt!",
  tie: "Kopf an Kopf – 50 : 50!",
  ifTheyPlayed: "🖥️ Wenn beide Teams gegeneinander antreten würden…",
  verdictNote:
    "Einschätzung des Computers – jede Karte hat eine versteckte Stärke-Wertung, die niemand sieht; das Ergebnis ist reine Mathematik daraus (Gebote zählen nicht mit, keine echte KI-Einschätzung).",
  playAgain: "Nochmal spielen",

  chat: "Chat",
  noMessages: "Noch keine Nachrichten – schreib die erste.",
  writeMessage: "Nachricht schreiben…",
  send: "Senden",

  logCategory: (label: string) => `Kategorie: ${label}`,
  logGot: (team: string, item: string, price: number) => `${team} bekommt "${item}" für ${price}$`,
};

type Dict = typeof de;

const en: Dict = {
  tagline: "$20 budget. 8 cards. Who builds the better team?",
  createRoom: "Create room",
  joinRoom: "Join room",
  yourAvatar: "Your character",
  yourName: "Your name",
  namePlaceholderHost: "e.g. Timo",
  namePlaceholderGuest: "e.g. Alex",
  roomCodeLabel: "Room code",
  codePlaceholder: "e.g. AB12CD",
  creating: "Creating…",
  searching: "Searching…",
  join: "Join",
  back: "Back",
  loadingRoom: "Loading room…",

  roomCode: "Room code",
  copyInvite: "Copy invite link",
  linkCopied: "Link copied!",
  drafters: "Drafters",
  waitingForSecond: "waiting for a second player…",
  spectators: "Spectators",
  chooseCategory: "Pick a category for this round:",
  randomCategory: "🎲 Random category",
  willChooseCategory: (a: string, b: string) => `${a} or ${b} is about to pick the category…`,
  sendInvite: "Send the invite link to a second player so you can start.",

  card: "Card",
  left: "$ left",
  you: "You",
  bid: "Bid",
  opensSoon: "opening soon…",
  soloHint: (opp: string) => `${opp} already has 4 cards – your bid wins right away.`,
  choiceHint: (opp: string, who: string) => `${opp} is out of money – ${who} who gets the card.`,
  youDecide: "you decide",
  decides: (name: string) => `${name} decides`,
  takeCard: "Take card",
  giveCardTo: (name: string) => `Give to ${name}`,
  grabCard: "Get card",
  open: "Open",
  noMoneySolo: "You're out of money – the card is still yours.",
  noMoneyOpen: "You can't bid – you're out of money.",
  takeFree: "Take card for free",
  giveFree: "Give card away for free",
  raise: "Raise",
  cantRaise: "You can't bid – not enough money to raise.",
  passTo: (name: string, price: number) => `Stop bidding – ${name} gets the card for $${price}`,
  spectating: "You're watching.",

  result: "Result",
  wins: "wins!",
  tie: "Neck and neck – 50 : 50!",
  ifTheyPlayed: "🖥️ If both teams went head to head…",
  verdictNote:
    "Computer's estimate – every card has a hidden strength rating nobody sees; the result is pure math based on it (bids don't count, no real AI judgment).",
  playAgain: "Play again",

  chat: "Chat",
  noMessages: "No messages yet – write the first one.",
  writeMessage: "Write a message…",
  send: "Send",

  logCategory: (label: string) => `Category: ${label}`,
  logGot: (team: string, item: string, price: number) => `${team} gets "${item}" for $${price}`,
};

const DICTS: Record<Lang, Dict> = { de, en };

/** Fehlermeldungen kommen aus der Spiel-Logik auf Deutsch - hier
 *  stehen ihre englischen Gegenstücke. Unbekannte Meldungen (z. B.
 *  technische Fehler) werden unverändert angezeigt. */
const ERRORS_EN: Record<string, string> = {
  "Gib zuerst deinen Namen ein.": "Enter your name first.",
  "Gib den Code des Raums ein.": "Enter the room code.",
  "Kein Raum mit diesem Code gefunden.": "No room found with this code.",
  "Raum konnte nicht erstellt werden.": "The room could not be created.",
  "Beitreten hat nicht funktioniert.": "Joining didn't work.",
  "Aktion fehlgeschlagen.": "Action failed.",
  "Raum konnte nicht geladen werden.": "The room could not be loaded.",
  "Es müssen erst zwei Drafter im Raum sein.": "There need to be two drafters in the room first.",
  "Unbekannte Kategorie.": "Unknown category.",
  "Gerade läuft keine Auktion.": "No auction is running right now.",
  "Die Eröffnung ist schon erfolgt.": "The opening bid has already been placed.",
  "Du bist gerade nicht dran.": "It's not your turn.",
  "Mindestgebot ist 1.": "The minimum bid is 1.",
  "Dafür reicht dein Budget nicht.": "You don't have enough money for that.",
  "Es wurde noch nicht eröffnet.": "Nobody has opened yet.",
  "Dein Gebot muss höher sein als das aktuelle.": "Your bid has to be higher than the current one.",
  "Es gibt noch kein Gebot.": "There's no bid yet.",
  "Entscheide, ob du die Karte nimmst oder abgibst.": "Decide whether to take the card or give it away.",
  "Gerade gibt es nichts zu entscheiden.": "There's nothing to decide right now.",
};

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
  /** Name einer Karte in der gewählten Sprache. */
  itemName: (item: CategoryItem) => string;
  /** Name einer Kategorie in der gewählten Sprache. */
  categoryLabel: (categoryId: string, fallback?: string) => string;
  /** Übersetzt eine (deutsche) Fehlermeldung, falls bekannt. */
  error: (message: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  // Gespeicherte Wahl laden - sonst nach Browser-Sprache raten.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "de" || saved === "en") {
        setLangState(saved);
        return;
      }
      if (!navigator.language.toLowerCase().startsWith("de")) setLangState("en");
    } catch {
      // kein Zugriff auf den Speicher - einfach Deutsch lassen.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // egal - gilt dann nur bis zum Neuladen.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: DICTS[lang],
      itemName: (item) => (lang === "en" ? (item.en ?? item.name) : item.name),
      categoryLabel: (categoryId, fallback) => {
        const category = categoryById(categoryId);
        if (!category) return fallback ?? categoryId;
        return lang === "en" ? category.labelEn : category.label;
      },
      error: (message) => (lang === "en" ? (ERRORS_EN[message] ?? message) : message),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n muss innerhalb von <LanguageProvider> benutzt werden.");
  return value;
}

/** Kleiner Umschalter DE / EN oben rechts. */
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div
      className="fixed right-3 z-50 flex rounded-full border border-foreground/20 bg-black/40 backdrop-blur text-xs font-bold overflow-hidden"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      {(["de", "en"] as const).map((option) => (
        <button
          key={option}
          onClick={() => setLang(option)}
          aria-pressed={lang === option}
          className={`px-3 py-1.5 transition ${
            lang === option ? "bg-gold text-black" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
