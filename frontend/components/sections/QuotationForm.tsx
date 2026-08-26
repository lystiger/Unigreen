import { ButtonLink } from "@/components/ui/Button";
import { cataloguePath, inquiryPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

const SPEC_ROWS: readonly { label: string; value: string; accent?: boolean }[] = [
  { label: "ROLL", value: "Parent jumbo roll" },
  { label: "LINE", value: "Converting, Hưng Yên" },
  { label: "SPEC", value: "Yours" },
  { label: "QUOTE", value: "Written, with spec sheet", accent: true },
];

/**
 * Request-quotation section that hands buyers to the basket-backed inquiry flow.
 */
export function QuotationForm({ locale }: { readonly locale: Locale }) {
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
              We reply with a written quotation and a specification sheet. If anything
              in your requirement is still open, say so — we will work it out with you.
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
                  <span
                    className={`text-[15px] ${row.accent ? "text-ink" : "text-ink-muted"}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-line bg-paper-raised p-10">
            <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
              BUILD YOUR REQUEST
            </p>
            <h3 className="mt-4 text-[30px] font-medium leading-[1.15] tracking-[-0.025em]">
              Select the products and pack formats you need.
            </h3>
            <p className="mt-4 max-w-[48ch] text-[16px] leading-[1.65] text-ink-muted">
              Your inquiry basket keeps quantities and specifications together. The
              final request is stored securely and returns a written reference number.
            </p>
            <p className="mt-2 text-[17px] font-light text-ink-faint">
              Chọn sản phẩm, quy cách đóng gói và số lượng trước khi gửi yêu cầu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
              <ButtonLink href={inquiryPath(locale)} size="lg">
                Open quotation request
              </ButtonLink>
              <ButtonLink href={cataloguePath(locale)} variant="secondary" size="lg">
                Browse products
              </ButtonLink>
            </div>
            <p className="mt-5 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
              NO OBLIGATION · REPLY WITH WRITTEN QUOTATION
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
