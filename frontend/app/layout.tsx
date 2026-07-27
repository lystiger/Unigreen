import type { ReactNode } from "react";
import "./globals.css";

/**
 * Deliberately markup-free. `<html>` carries the document language, and the
 * language is only known one segment deeper, so `app/[locale]/layout.tsx`
 * renders the document element instead.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
