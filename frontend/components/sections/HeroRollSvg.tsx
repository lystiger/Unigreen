/**
 * Static SVG jumbo roll — the original hero illustration, kept as a graceful
 * fallback behind the interactive 3D roll (reduced-motion, mobile, or no WebGL).
 * Imported verbatim from `Uni-Green Landing.dc.html`.
 */
export function HeroRollSvg() {
  return (
    <svg
      viewBox="0 0 760 520"
      className="h-auto w-[112%] max-w-none overflow-visible"
      role="img"
      aria-label="Parent jumbo roll, cut to a specified face width"
    >
      <defs>
        <linearGradient id="ugBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFEDE6" />
          <stop offset="0.28" stopColor="#FFFFFF" />
          <stop offset="0.62" stopColor="#FAF9F5" />
          <stop offset="1" stopColor="#E6E3DA" />
        </linearGradient>
        <linearGradient id="ugFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EDEAE2" />
        </linearGradient>
        <linearGradient id="ugSheet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F4F2EC" />
        </linearGradient>
      </defs>

      <path
        d="M160 470 C 300 470, 330 500, 470 500 C 610 500, 660 476, 700 470 L 700 486 C 640 494, 600 516, 470 516 C 340 516, 300 486, 160 486 Z"
        fill="url(#ugSheet)"
        stroke="#CBC8BE"
        strokeWidth="1"
      />

      <ellipse
        cx="590"
        cy="250"
        rx="86"
        ry="200"
        fill="#E6E3DA"
        stroke="#CBC8BE"
        strokeWidth="1"
      />
      <rect x="180" y="50" width="410" height="400" fill="url(#ugBody)" />
      <line x1="180" y1="50" x2="590" y2="50" stroke="#CBC8BE" strokeWidth="1" />
      <line x1="180" y1="450" x2="590" y2="450" stroke="#CBC8BE" strokeWidth="1" />

      <g style={{ transformOrigin: "180px 250px" }}>
        <ellipse
          cx="180"
          cy="250"
          rx="86"
          ry="200"
          fill="url(#ugFace)"
          stroke="#0C1B14"
          strokeWidth="1.4"
        />
        <ellipse
          cx="180"
          cy="250"
          rx="70"
          ry="163"
          fill="none"
          stroke="#E2E0D9"
          strokeWidth="1"
        />
        <ellipse
          cx="180"
          cy="250"
          rx="55"
          ry="128"
          fill="none"
          stroke="#E2E0D9"
          strokeWidth="1"
        />
        <ellipse
          cx="180"
          cy="250"
          rx="41"
          ry="95"
          fill="none"
          stroke="#E2E0D9"
          strokeWidth="1"
        />
        <ellipse
          cx="180"
          cy="250"
          rx="27"
          ry="63"
          fill="none"
          stroke="#E2E0D9"
          strokeWidth="1"
        />
        <ellipse
          cx="180"
          cy="250"
          rx="15"
          ry="35"
          fill="#F4F2EC"
          stroke="#CBC8BE"
          strokeWidth="1"
        />
        <line x1="180" y1="215" x2="180" y2="50" stroke="#1E9445" strokeWidth="1.6" />
      </g>

      <g stroke="#CBC8BE" strokeWidth="1" fill="none">
        <line x1="180" y1="20" x2="180" y2="38" strokeDasharray="3 3" />
        <line x1="590" y1="20" x2="590" y2="38" strokeDasharray="3 3" />
        <line x1="180" y1="29" x2="590" y2="29" />
      </g>
      <text
        x="385"
        y="20"
        textAnchor="middle"
        fill="#8A968F"
        fontFamily="var(--font-plex-mono), monospace"
        fontSize="12"
        letterSpacing="1"
      >
        FACE WIDTH — TO SPEC
      </text>
    </svg>
  );
}
