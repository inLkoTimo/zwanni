"use client";

import { useI18n } from "@/lib/i18n";
import { BidderAvatar } from "../BidderAvatar";

type BaseProps = {
  name: string;
  onNameChange: (value: string) => void;
  onBack?: () => void;
  loading: boolean;
  error: string;
  identity?: string;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </main>
  );
}

function Title() {
  const { t } = useI18n();
  return (
    <div className="text-center space-y-1">
      <h1 className="text-5xl font-black text-gold tracking-tight">🔨 Zwanni</h1>
      <p className="text-sm text-foreground/60">
        {t.tagline}
      </p>
    </div>
  );
}

function MyAvatarPreview({ identity }: { identity?: string }) {
  const { t } = useI18n();
  if (!identity) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <BidderAvatar seed={identity} paddleColor="#f2b705" size={64} />
      <p className="text-[10px] uppercase tracking-wide text-foreground/40">{t.yourAvatar}</p>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  const { error: translate } = useI18n();
  if (!error) return null;
  return (
    <p className="rounded-lg bg-team-a/10 border border-team-a/40 text-team-a text-sm px-3 py-2">
      {translate(error)}
    </p>
  );
}

export function HomeScreen({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  const { t } = useI18n();
  return (
    <Shell>
      <Title />
      <div className="space-y-3">
        <button
          onClick={onCreate}
          className="w-full rounded-xl bg-gold text-black font-bold py-3 text-lg hover:brightness-110 transition"
        >
          {t.createRoom}
        </button>
        <button
          onClick={onJoin}
          className="w-full rounded-xl border border-foreground/30 py-3 text-lg hover:bg-foreground/5 transition"
        >
          {t.joinRoom}
        </button>
      </div>
    </Shell>
  );
}

export function CreateScreen({
  name,
  onNameChange,
  onBack,
  onSubmit,
  loading,
  error,
  identity,
}: BaseProps & { onSubmit: () => void }) {
  const { t } = useI18n();
  return (
    <Shell>
      <Title />
      <MyAvatarPreview identity={identity} />
      <div className="space-y-3">
        <label className="block text-sm text-foreground/70">{t.yourName}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.namePlaceholderHost}
          className="w-full rounded-lg bg-foreground/5 border border-foreground/20 px-3 py-3 text-lg outline-none focus:border-gold"
        />
        <ErrorBox error={error} />
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-gold text-black font-bold py-3 text-lg disabled:opacity-50"
        >
          {loading ? t.creating : t.createRoom}
        </button>
        <button onClick={onBack} className="w-full text-sm text-foreground/50 py-2">
          {t.back}
        </button>
      </div>
    </Shell>
  );
}

export function JoinScreen({
  name,
  onNameChange,
  code,
  onCodeChange,
  onBack,
  onSubmit,
  loading,
  error,
  identity,
}: BaseProps & { code: string; onCodeChange: (value: string) => void; onSubmit: () => void }) {
  const { t } = useI18n();
  return (
    <Shell>
      <Title />
      <MyAvatarPreview identity={identity} />
      <div className="space-y-3">
        <label className="block text-sm text-foreground/70">{t.yourName}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.namePlaceholderGuest}
          className="w-full rounded-lg bg-foreground/5 border border-foreground/20 px-3 py-3 text-lg outline-none focus:border-gold"
        />
        <label className="block text-sm text-foreground/70">{t.roomCodeLabel}</label>
        <input
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder={t.codePlaceholder}
          className="w-full rounded-lg bg-foreground/5 border border-foreground/20 px-3 py-3 text-lg uppercase tracking-widest outline-none focus:border-gold"
        />
        <ErrorBox error={error} />
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-gold text-black font-bold py-3 text-lg disabled:opacity-50"
        >
          {loading ? t.searching : t.join}
        </button>
        <button onClick={onBack} className="w-full text-sm text-foreground/50 py-2">
          {t.back}
        </button>
      </div>
    </Shell>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <Shell>
      <p className="text-center text-foreground/60">{label}</p>
    </Shell>
  );
}
