/**
 * Turn a display hotline into a dialable `tel:` URI. The dictionary stores the
 * number the way each locale prints it (`0966 986 558` / `+84 966 986 558`);
 * a dialer needs it without separators.
 */
export function telHref(displayNumber: string): string {
  const digits = displayNumber.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}
