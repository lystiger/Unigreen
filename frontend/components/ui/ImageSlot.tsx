import Image from "next/image";

interface ImageSlotProps {
  /** Image source path (e.g. /images/products/napkins.webp). */
  readonly src?: string;
  /** Accessible alt text for the image. */
  readonly alt?: string;
  /** Empty-state caption describing the pack/photo when no src is given. */
  readonly placeholder?: string;
  /** Rounded corners; the design uses square (rect) slots throughout. */
  readonly shape?: "rect" | "rounded";
  /** Dark tiles (factory grid) invert the placeholder chrome. */
  readonly tone?: "light" | "dark";
  /** Image fitting mode: contain for isolated pack shots, cover for scenes. */
  readonly objectFit?: "contain" | "cover";
  /** High priority loading for above-the-fold or key items. */
  readonly priority?: boolean;
}

/**
 * Image container component that renders high-resolution product cutouts
 * with subtle elevation, or gracefully falls back to the design's placeholder frame.
 */
export function ImageSlot({
  src,
  alt,
  placeholder = "Product image",
  shape = "rect",
  tone = "light",
  objectFit = "contain",
  priority = false,
}: ImageSlotProps) {
  if (src) {
    return (
      <div
        className={`group relative h-full w-full overflow-hidden flex items-center justify-center p-6 transition-all duration-300 ${
          shape === "rounded" ? "rounded-card" : ""
        }`}
      >
        <Image
          src={src}
          alt={alt || placeholder}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`transition-transform duration-500 ease-out group-hover:scale-105 ${
            objectFit === "contain"
              ? "object-contain p-4 drop-shadow-[0_10px_20px_rgba(39,48,40,0.10)]"
              : "object-cover"
          }`}
        />
      </div>
    );
  }

  const ring =
    tone === "dark"
      ? "border-white/25 text-white/55"
      : "border-line-strong text-ink-faint";

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
