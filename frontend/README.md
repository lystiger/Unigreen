# Uni-Green — public web

Next.js App Router · TypeScript · Tailwind. Vietnamese default at `/vi`,
English at `/en`. `/` redirects to `/vi` in [middleware.ts](middleware.ts).

## Develop

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

| Script                            | Does                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                     | Development server                                                |
| `npm run build` / `start`         | Production build and serve                                        |
| `npm run lint`                    | ESLint                                                            |
| `npm run typecheck`               | `tsc --noEmit`                                                    |
| `npm run format` / `format:check` | Prettier                                                          |
| `npm test`                        | Vitest component and unit tests                                   |
| `npm run test:e2e`                | Playwright (`npx playwright install` once)                        |
| `npm run api:types`               | Regenerate `lib/api/schema.d.ts` from `../contracts/openapi.json` |

The whole stack runs with `docker compose up --build` from the repository root;
this app is the `web` service on port 3000.

## Structure

| Path                                     | Reused by                                                 |
| ---------------------------------------- | --------------------------------------------------------- |
| `components/ui/Button.tsx`               | every page                                                |
| `components/ui/SectionHeader.tsx`        | every page                                                |
| `components/ui/SpecStrip.tsx`            | landing hero, product detail hero                         |
| `components/product/ProductCard.tsx`     | landing, catalogue, related products, inquiry basket line |
| `components/product/ProductGrid.tsx`     | landing, catalogue, search results                        |
| `components/layout/SiteHeader.tsx`       | every page                                                |
| `components/layout/SiteFooter.tsx`       | every page                                                |
| `components/sections/InquiryBand.tsx`    | every page except the inquiry form itself                 |
| `components/sections/Hero.tsx`           | landing only                                              |
| `components/sections/OemProcess.tsx`     | landing, OEM page                                         |
| `components/sections/RollDiagram.tsx`    | landing, product detail                                   |
| `components/sections/Certifications.tsx` | landing, capability page                                  |

`app/layout.tsx` renders no markup on purpose — `<html>` needs the document
language, which is only known one segment deeper, so `app/[locale]/layout.tsx`
owns the document element.

## Design tokens

[tailwind.config.ts](tailwind.config.ts) is the single source of truth. Every
colour there is sampled from a real Uni-Green asset. Tailwind v4 reads it
through the `@config` directive in [app/globals.css](app/globals.css) rather
than duplicating the values in an `@theme` block.

Green is spent on brand and primary action, so it is **not** available to mean
"success". Quotation and order states use the `status` ramp and are always
paired with an icon and a text label, never colour alone.

## API contract

`lib/api/schema.d.ts` is generated from the committed
[`contracts/openapi.json`](../contracts/openapi.json) and must never be edited
by hand — CI regenerates it and fails on a diff. The contract currently
publishes health endpoints only, so the catalogue in `lib/catalogue.ts` is
local data until the products endpoints land.

## Not yet wired

The blueprint's frontend baseline also names TanStack Query, React Hook Form
and Zod. They are deliberately not installed yet: there is no API endpoint to
query and no form to validate. Add them with the inquiry-form story.

## Outstanding assets

`Product.imageSrc` is `null` for every SKU. `ProductCard` renders a labelled
placeholder until pack shots exist. To populate:

1. Get the print dielines (`.ai` / `.pdf`) from Hoàng Hạc Phương Bắc.
2. Export the front panel of each at 800×600, transparent PNG or SVG.
3. Save to `public/products/<id>.png` and set `imageSrc` in `lib/catalogue.ts`.

No layout change is needed — the card already reserves a 4:3 box, so adding
images causes no cumulative layout shift.

## Figures to verify before launch

`packsPerCarton` and `cartonsPer40hc` are estimates and are marked here rather
than in the UI. Confirm with the mill before these values are quoted to a buyer.

Company identity in `lib/i18n.ts` (legal name, address, hotline) is still an
open Sprint 0 decision — see [`docs/sprint-0-decisions.md`](../docs/sprint-0-decisions.md).
