import type { ReactNode } from "react";
import "../globals.css";

/**
 * Standalone test harness for the procedural 3D jumbo roll. Like the admin
 * segment, it renders its own document element because the root layout is
 * deliberately markup-free. Kept isolated so the model can be judged without
 * touching the real marketing site.
 */
export const metadata = {
  title: "3D Roll Test — Unigreen",
  robots: { index: false, follow: false },
};

export default function ThreeTestLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
