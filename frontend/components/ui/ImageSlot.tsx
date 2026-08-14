interface ImageSlotProps {
  /** Empty-state caption describing the pack/photo that belongs here. */
  readonly placeholder: string;
  /** Rounded corners; the design uses square (rect) slots throughout. */
  readonly shape?: "rect" | "rounded";
  /** Dark tiles (factory grid) invert the placeholder chrome. */
  readonly tone?: "light" | "dark";
}

/**
 * Static stand-in for the design's `<image-slot>` web component. The imported
 * `Uni-Green Landing.dc.html` fills these by drag-and-drop inside the Claude
 * Design canvas; on the real site there are no pack shots yet, so we render the
 * same dashed-ring empty state the component shows before an image is dropped.
 *
 * Swap the inner markup for `next/image` once real photography is available —
 * the sized wrapper each caller provides is the image frame.
 */
export function ImageSlot({ placeholder, shape = "rect", tone = "light" }: ImageSlotProps) {
  const ring = tone === "dark" ? "border-white/25 text-white/55" : "border-line-strong text-ink-faint";

  return (
    <div
      role="img"
      aria-label={placeholder}
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center ${
        shape === "rounded" ? "rounded-card" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 border-[1.5px] border-dashed ${ring} ${
          shape === "rounded" ? "rounded-card" : ""
        } opacity-45`}
      />
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={tone === "dark" ? "text-white/55" : "text-ink-faint"}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span
        className={`max-w-[90%] font-medium ${
          tone === "dark" ? "text-white/70" : "text-ink-faint"
        } text-[13px] leading-tight`}
      >
        {placeholder}
      </span>
    </div>
  );
}
