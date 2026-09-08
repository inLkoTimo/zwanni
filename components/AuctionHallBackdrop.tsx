/** Der Bühnenhintergrund für das ganze Spiel: rote Vorhänge links
 *  und rechts, ein Scheinwerferkegel von oben, ein Holzboden unten.
 *  Alles reines CSS/SVG, nichts Externes - läuft offline und ist
 *  komplett selbst gezeichnet. Liegt fix hinter dem Inhalt, reagiert
 *  auf keine Klicks. */
export function AuctionHallBackdrop() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Scheinwerfer-Kegel */}
      <div
        className="spotlight-glow absolute left-1/2 top-0 -translate-x-1/2 w-[140vw] h-[70vh]"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(242,183,5,0.22) 0%, rgba(242,183,5,0.06) 45%, transparent 75%)",
        }}
      />

      {/* Vorhang links */}
      <svg
        className="absolute left-0 top-0 h-full w-[22vw] min-w-[110px] max-w-[220px]"
        viewBox="0 0 100 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="curtainL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--curtain-dark)" />
            <stop offset="45%" stopColor="var(--curtain)" />
            <stop offset="100%" stopColor="var(--curtain-dark)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="400" fill="url(#curtainL)" />
        {Array.from({ length: 7 }).map((_, i) => (
          <path
            key={i}
            d={`M ${i * 14 + 4} 0 Q ${i * 14 + 12} 200 ${i * 14 + 4} 400`}
            stroke="rgba(0,0,0,0.22)"
            strokeWidth="3"
            fill="none"
          />
        ))}
        <path d="M 0 0 L 100 0 L 100 34 Q 50 60 0 34 Z" fill="var(--gold)" opacity="0.85" />
      </svg>

      {/* Vorhang rechts (gespiegelt) */}
      <svg
        className="absolute right-0 top-0 h-full w-[22vw] min-w-[110px] max-w-[220px] scale-x-[-1]"
        viewBox="0 0 100 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="curtainR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--curtain-dark)" />
            <stop offset="45%" stopColor="var(--curtain)" />
            <stop offset="100%" stopColor="var(--curtain-dark)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="400" fill="url(#curtainR)" />
        {Array.from({ length: 7 }).map((_, i) => (
          <path
            key={i}
            d={`M ${i * 14 + 4} 0 Q ${i * 14 + 12} 200 ${i * 14 + 4} 400`}
            stroke="rgba(0,0,0,0.22)"
            strokeWidth="3"
            fill="none"
          />
        ))}
        <path d="M 0 0 L 100 0 L 100 34 Q 50 60 0 34 Z" fill="var(--gold)" opacity="0.85" />
      </svg>

      {/* Bühnenboden unten */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: "linear-gradient(to top, var(--wood) 0%, transparent 100%)",
          opacity: 0.7,
        }}
      />
    </div>
  );
}
