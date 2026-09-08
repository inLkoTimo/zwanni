// Ein kleiner, komplett selbst gezeichneter Bieter-Charakter (kein
// echtes Foto, keine bekannte Figur - reines SVG). Farbe wird aus
// dem Namen/der ID der Person berechnet, damit jede Person immer
// dieselbe Figur bekommt. `raised` lässt die Figur die Bieterkarte
// heben und leicht wackeln, wenn sie gerade an der Reihe ist.

const SKIN_TONES = ["#f2c396", "#e3a873", "#c68a52", "#9c6b3e", "#7a4a28"];
const OUTFIT_COLORS = ["#3b3f92", "#1f7a5c", "#a3305a", "#b3591f", "#4a5568", "#7c3aed"];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function BidderAvatar({
  seed,
  paddleColor,
  size = 72,
  raised = false,
}: {
  seed: string;
  paddleColor: string;
  size?: number;
  raised?: boolean;
}) {
  const skin = SKIN_TONES[hash(seed) % SKIN_TONES.length];
  const outfit = OUTFIT_COLORS[hash(`${seed}-o`) % OUTFIT_COLORS.length];
  const smile = hash(`${seed}-s`) % 2 === 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={raised ? "paddle-raise" : ""}
      aria-hidden="true"
    >
      {/* Körper */}
      <path d="M 20 95 Q 20 62 50 62 Q 80 62 80 95 Z" fill={outfit} />
      {/* Kopf */}
      <circle cx="50" cy="42" r="24" fill={skin} />
      {/* Augen */}
      <circle cx="41" cy="40" r="2.6" fill="#1a1a1a" />
      <circle cx="59" cy="40" r="2.6" fill="#1a1a1a" />
      {/* Mund */}
      {smile ? (
        <path d="M 40 50 Q 50 58 60 50" stroke="#1a1a1a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 42 51 Q 50 47 58 51" stroke="#1a1a1a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {/* Bieterkarte / Paddel, angehoben in der rechten Hand */}
      <g>
        <rect x="66" y="20" width="4" height="26" rx="2" fill="#6b4a2f" />
        <rect x="55" y="4" width="26" height="20" rx="3" fill={paddleColor} stroke="#00000022" />
        <text x="68" y="18" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a1a1a">
          $
        </text>
      </g>
    </svg>
  );
}
