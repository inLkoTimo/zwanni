"use client";

import { useState } from "react";

import { useZwanniRoom } from "@/lib/hooks/useZwanniRoom";
import {
  CreateScreen,
  HomeScreen,
  JoinScreen,
  LoadingScreen,
} from "./screens/MenuScreens";
import { LobbyScreen } from "./screens/LobbyScreen";
import { DraftScreen } from "./screens/DraftScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { ChatPanel } from "./ChatPanel";
import { LanguageProvider, LanguageToggle, useI18n } from "@/lib/i18n";

/** Verteilt nur auf die einzelnen Bildschirme - die Logik steckt in
 *  `useZwanniRoom`, die Spielregeln in `lib/game`. */
export function ZwanniApp() {
  return (
    <LanguageProvider>
      <LanguageToggle />
      <ZwanniScreens />
    </LanguageProvider>
  );
}

function ZwanniScreens() {
  const { t, error: translateError } = useI18n();
  const { screen, setScreen, room, chat, roomError, me, myRole, identity, loading, error, setError, prefillCode, actions } =
    useZwanniRoom();

  const [name, setName] = useState("");
  const [code, setCode] = useState(prefillCode);

  if (code === "" && prefillCode) setCode(prefillCode);

  if (screen === "home") {
    return (
      <HomeScreen
        onCreate={() => {
          setError("");
          setScreen("create");
        }}
        onJoin={() => {
          setError("");
          setScreen("join");
        }}
      />
    );
  }

  if (screen === "create") {
    return (
      <CreateScreen
        name={name}
        onNameChange={setName}
        onBack={() => setScreen("home")}
        onSubmit={() => void actions.createRoom(name)}
        loading={loading}
        error={error}
        identity={identity}
      />
    );
  }

  if (screen === "join") {
    return (
      <JoinScreen
        name={name}
        code={code}
        onNameChange={setName}
        onCodeChange={setCode}
        onBack={() => setScreen("home")}
        onSubmit={() => void actions.joinRoom(name, code)}
        loading={loading}
        error={error}
        identity={identity}
      />
    );
  }

  if (!room) {
    return <LoadingScreen label={roomError ? translateError(roomError) : t.loadingRoom} />;
  }

  const phase = room.game_state.phase;

  const gameScreen =
    phase === "lobby" ? (
      <LobbyScreen
        room={room}
        myRole={myRole}
        onStartRound={(categoryId) => void actions.startRound(categoryId)}
        loading={loading}
        error={error}
      />
    ) : phase === "drafting" ? (
      <DraftScreen
        room={room}
        myRole={myRole}
        onOpen={(drafter, amount) => void actions.placeOpeningBid(drafter, amount)}
        onForfeit={(drafter) => void actions.forfeitOpening(drafter)}
        onRaise={(drafter, amount) => void actions.raiseBid(drafter, amount)}
        onAccept={(drafter) => void actions.acceptBid(drafter)}
        onChoose={(drafter, take) => void actions.chooseCard(drafter, take)}
        loading={loading}
        error={error}
      />
    ) : (
      <ResultsScreen
        room={room}
        canPlayAgain={myRole === "A" || myRole === "B"}
        onPlayAgain={() => void actions.playAgain()}
        loading={loading}
      />
    );

  // Der Chat läuft unter dem Spiel durch - in jeder Phase (Lobby,
  // Auktion, Ergebnis) und für alle im Raum, auch für Zuschauer.
  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pb-8">
      {gameScreen}
      <ChatPanel
        messages={chat}
        canWrite={Boolean(me)}
        onSend={(text) => void actions.sendChatMessage(text)}
      />
    </div>
  );
}
