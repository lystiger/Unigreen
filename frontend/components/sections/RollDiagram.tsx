interface RollDiagramProps {
  /** Sheet width in millimetres, annotated on the drawing. */
  readonly sheetWidthMm: number;
  /** Roll length in metres. Null hides the vertical callout entirely. */
  readonly metresPerRoll: number | null;
  readonly isCoreless: boolean;
  readonly title: string;
}

/**
 * Signature element. A dimensioned technical drawing of the roll rather than a
 * lifestyle photograph — the buyer is procurement, and the mill has no usable
 * product photography yet. Purely vector, so it needs no asset pipeline.
 */
export function RollDiagram({
  sheetWidthMm,
  metresPerRoll,
  isCoreless,
  title,
}: RollDiagramProps) {
  return (
    <svg
      viewBox="0 0 360 320"
      role="img"
      aria-label={title}
      className="h-auto w-full max-w-md"
    >
      <g className="stroke-line-strong" strokeWidth="1" fill="none">
        <line x1="40" y1="40" x2="40" y2="280" strokeDasharray="4 4" />
        <line x1="280" y1="40" x2="280" y2="280" strokeDasharray="4 4" />
      </g>

      <g className="fill-paper-raised stroke-ink" strokeWidth="1.5">
        <ellipse cx="160" cy="90" rx="120" ry="34" />
        <path d="M40 90 L40 230 A120 34 0 0 0 280 230 L280 90" />
      </g>

      <g className="stroke-line" strokeWidth="1" fill="none">
        <ellipse cx="160" cy="90" rx="86" ry="24" />
        <ellipse cx="160" cy="90" rx="52" ry="15" />
      </g>

      {isCoreless ? (
        <circle cx="160" cy="90" r="4" className="fill-brand-green" />
      ) : (
        <ellipse
          cx="160"
          cy="90"
          rx="20"
          ry="6"
          className="fill-paper-sunk stroke-ink-faint"
          strokeWidth="1"
        />
      )}

      {metresPerRoll !== null && metresPerRoll > 0 ? (
        <g>
          <g className="stroke-brand-green" strokeWidth="1.5" fill="none">
            <line x1="300" y1="90" x2="300" y2="248" />
            <line x1="294" y1="90" x2="306" y2="90" />
            <line x1="294" y1="248" x2="306" y2="248" />
          </g>
          <text x="314" y="173" className="fill-ink font-mono" fontSize="13">
            {metresPerRoll} m
          </text>
        </g>
      ) : null}

      <g className="stroke-brand-green" strokeWidth="1.5" fill="none">
        <line x1="40" y1="300" x2="280" y2="300" />
        <line x1="40" y1="294" x2="40" y2="306" />
        <line x1="280" y1="294" x2="280" y2="306" />
      </g>
      <text
        x="160"
        y="292"
        textAnchor="middle"
        className="fill-ink font-mono"
        fontSize="13"
      >
        {sheetWidthMm} mm
      </text>
    </svg>
  );
}
