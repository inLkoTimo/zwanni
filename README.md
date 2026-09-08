# Zwanni

Das 20$-Auktionsspiel, wie es gerade auf TikTok viral geht: zwei
Leute haben je 20$ Budget und bieten nacheinander auf 8 Karten aus
einer Kategorie (Fußball, Superhelden, Snacks, Autos, …). Wer 4
Karten zuerst hat, bekommt den Rest automatisch. Danach stimmt die
Runde ab, wer das bessere Team gedraftet hat.

Next.js im Frontend, Supabase für Räume und Live-Updates – genau wie
bei Two Wizards. Es ist bewusst dieselbe Technik, damit möglichst
vieles wiederverwendet werden kann.

## Loslegen (Schritt für Schritt)

**1. Im Terminal in diesen Ordner wechseln und Pakete installieren**

```bash
cd zwanni
npm install
```

**2. Mit der Datenbank verbinden**

Zwanni kann dasselbe Supabase-Projekt benutzen wie Two Wizards – du
musst also kein neues Konto oder Projekt anlegen. Einfach die Werte
aus `two-wizards/.env.local` übernehmen:

```bash
cp .env.example .env.local
```

Dann `.env.local` öffnen und die zwei Zeilen mit den Werten aus
`two-wizards/.env.local` füllen (dieselbe URL, derselbe Key).

**3. Die neue Tabelle in Supabase anlegen**

- Im Supabase-Dashboard (im Browser) dein Projekt öffnen
- Links auf **SQL Editor** klicken
- Auf **New query** klicken
- Den kompletten Inhalt von `supabase/schema.sql` reinkopieren
- Auf **Run** klicken (unten rechts, oder Cmd+Enter)

Das legt eine neue Tabelle `rooms` an – die bestehende `games`-Tabelle
von Two Wizards bleibt komplett unangetastet.

**4. Starten**

```bash
npm run dev
```

Dann [http://localhost:3000](http://localhost:3000) öffnen. Zum
Testen zu zweit: einmal normal, einmal im privaten Fenster – Raum
erstellen, Link kopieren, im anderen Fenster öffnen.

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build |
| `npm run test` | Tests der Spielregeln |
| `npm run typecheck` | TypeScript prüfen |
| `npm run lint` | ESLint |

## Aufbau

```
app/
  page.tsx              Startseite
components/
  ZwanniApp.tsx          verteilt auf die Bildschirme
  screens/                Start, Erstellen, Beitreten, Lobby, Auktion, Abstimmung, Ergebnis
lib/
  game/                   Regeln, Kategorien und Spielzustand – reine Funktionen, ohne React
  supabase/               Datenbankzugriff an einer Stelle gebündelt
  hooks/                  Live-Verbindung, eigene Spieler-Identität
tests/                    Tests der Spielregeln
supabase/schema.sql       Tabelle, Live-Updates und Rechte
```

Genau wie bei Two Wizards kennt `lib/game` weder Browser noch
Datenbank – die Regeln lassen sich testen, ohne etwas zu starten.

## Kategorien anpassen oder erweitern

Alle Kategorien und ihre 20 Karten stehen in `lib/game/categories.ts`
in einer einzigen Liste – einfach neue Einträge ergänzen oder
bestehende ändern, ganz ohne Datenbank-Zugriff. Pro Runde werden
automatisch 8 der 20 Karten zufällig gezogen.

## Veröffentlichen

Genau wie bei Two Wizards:

1. Projekt zu GitHub pushen (eigenes Repo, z. B. `zwanni`).
2. Auf [vercel.com](https://vercel.com) importieren (Next.js wird erkannt).
3. Unter *Settings → Environment Variables* die beiden Werte aus
   `.env.local` eintragen.
4. Deploy. Änderungen an `main` gehen danach automatisch live.

Die Spieler müssen sich zum Mitspielen nicht anmelden – nur Link
öffnen, Namen eingeben, loslegen.
