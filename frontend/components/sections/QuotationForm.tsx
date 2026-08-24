"use client";

import { useState } from "react";

const SPEC_ROWS: readonly { label: string; value: string; accent?: boolean }[] = [
  { label: "ROLL", value: "Parent jumbo roll" },
  { label: "LINE", value: "Converting, Hưng Yên" },
  { label: "SPEC", value: "Yours" },
  { label: "QUOTE", value: "Written, with spec sheet", accent: true },
];

const FAMILY_OPTIONS = [
  "Jumbo rolls",
  "Napkins",
  "Toilet paper & holders",
  "Coreless paper",
  "OEM / private label",
];

const FIELD =
  "rounded-[2px] border border-line-strong bg-paper px-3.5 py-3 text-[15px] text-ink";
const FIELD_LABEL =
  "font-mono text-[10px] tracking-[0.14em] text-ink-faint";

/**
 * Request-quotation section, ported from `Uni-Green Landing.dc.html`. Submitting
 * flips to the design's inline "REQUEST RECEIVED" acknowledgement (client state
 * only — wire to the inquiry backend when that endpoint is available).
 */
export function QuotationForm() {
  const [sent, setSent] = useState(false);

  return (
    <section id="quotation" className="border-b border-line bg-paper">
      <div className="shell py-24 lg:py-30">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="lg:sticky lg:top-30">
            <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
              07 / REQUEST QUOTATION
            </p>
            <h2 className="mt-5 text-[clamp(32px,4vw,54px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Tell us the specification.
            </h2>
            <p className="mt-2.5 text-[20px] font-light tracking-[-0.015em] text-ink-faint">
              Gửi quy cách của bạn.
            </p>
            <p className="mt-7 max-w-[38ch] text-[16px] leading-[1.65] text-ink-muted">
              We reply with a written quotation and a specification sheet. If
              anything in your requirement is still open, say so — we will work it
              out with you.
            </p>
            <div className="mt-10 flex flex-col gap-3.5 border-t border-line pt-6">
              {SPEC_ROWS.map((row) => (
                <div key={row.label} className="flex gap-4">
                  <span
                    className={`w-[76px] font-mono text-[11px] tracking-[0.12em] ${
                      row.accent ? "text-brand-green" : "text-ink-faint"
                    }`}
                  >
                    {row.label}
                  </span>
                  <span className={`text-[15px] ${row.accent ? "text-ink" : "text-ink-muted"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-line bg-paper-raised p-10">
            {sent ? (
              <div className="py-12 text-left">
                <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
                  REQUEST RECEIVED
                </p>
                <p className="mt-4 text-[26px] font-medium leading-[1.2] tracking-[-0.02em]">
                  Thank you. We will come back with a written quotation.
                </p>
                <p className="mt-2.5 text-[17px] font-light text-ink-faint">
                  Cảm ơn bạn. Chúng tôi sẽ gửi báo giá bằng văn bản.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setSent(true);
                }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
              >
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Company *</span>
                  <input required type="text" name="company" className={FIELD} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Contact name *</span>
                  <input required type="text" name="name" className={FIELD} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Email *</span>
                  <input required type="email" name="email" className={FIELD} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Phone</span>
                  <input type="tel" name="phone" className={FIELD} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Product family *</span>
                  <select required name="family" defaultValue="" className={FIELD}>
                    <option value="" disabled>
                      Select…
                    </option>
                    {FAMILY_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className={FIELD_LABEL}>Estimated quantity</span>
                  <input
                    type="text"
                    name="quantity"
                    placeholder="e.g. 500 cartons / month"
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className={FIELD_LABEL}>
                    Specification — width, gsm, ply, length, core, packaging
                  </span>
                  <textarea
                    name="spec"
                    rows={5}
                    placeholder="Tell us what the product needs to be. Anything still open, we will work out with you."
                    className={`${FIELD} resize-y`}
                  />
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="oem"
                    className="mt-[3px] h-4 w-4 accent-brand-green"
                  />
                  <span className="text-[15px] text-ink-muted">
                    This is an OEM / private-label enquiry — we will want our own
                    branding on the product.
                  </span>
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-5 border-t border-line pt-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-[2px] bg-brand-green px-8 py-4 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark"
                  >
                    Send request
                  </button>
                  <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint">
                    NO OBLIGATION · REPLY WITH WRITTEN QUOTATION
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
