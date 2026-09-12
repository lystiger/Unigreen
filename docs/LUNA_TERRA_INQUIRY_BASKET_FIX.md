# Inquiry and basket UI repair

This is a bounded frontend repair. Review the current uncommitted work before
editing because another agent has already started the implementation.

Recommended model: `gpt-5.6-terra` with `reasoning.effort: low` initially. Raise
to `medium` only if the responsive layout or tests require diagnosis. Luna may
be used at `medium` when cost is the main constraint, but it must follow every
acceptance check below and must not declare success from screenshots created
before its changes.

## Goal

Repair the inquiry basket line layout, basket drawer, and narrow mobile header
without changing basket behavior or expanding into backend, publication, or
deployment work.

## Existing visual evidence

Inspect these images before editing:

- `output/playwright/inquiry-flow/03-inquiry-filled.png`: product identity,
  quantity, unit, note, and remove controls overlap on the inquiry page.
- `output/playwright/responsive-failures/01-drawer-open.png`: the drawer item is
  cramped and the remove label wraps vertically.
- `output/playwright/responsive-failures/viewport-mobile-catalogue.png`: at
  390px the logo and inquiry-basket control wrap awkwardly.
- `output/playwright/responsive-failures/02-drawer-closed-escape.png`: preserve
  focus return to the basket trigger after closing with Escape.

The existing images and traces predate the current uncommitted fixes. They are
inputs, not proof that the repair passes.

## Scope

Primary files already being changed:

- `frontend/components/basket/BasketLineRow.tsx`
- `frontend/components/layout/SiteHeader.tsx`
- `frontend/lib/basket/identity.ts`
- `frontend/lib/product-images.ts`

Update tests only when needed to prove the repaired behavior. Do not modify the
backend, API contracts, deployment configuration, catalogue publication flow,
or business content. Do not commit or push unless separately instructed.

Preserve unrelated user and agent changes. In particular, do not delete or
rewrite `backend/tests/test_live_backend_e2e.py`.

## Required behavior

### Inquiry page

- At 1440px, keep the basket summary and contact form as two readable columns.
- Each basket line must have distinct, non-overlapping regions for thumbnail,
  SKU/name/pack option, note, quantity, unit, and remove action.
- At 768px and 390px, stack controls naturally without horizontal scrolling.
- Long English and Vietnamese names must wrap inside the card, not over inputs.
- Quantity and unit controls retain their current values and dispatch behavior.
- Maintain a minimum 44px interactive target.

### Basket drawer

- The drawer must fit within a 390px viewport and retain usable padding.
- Keep the product thumbnail and identity readable.
- Quantity and unit may wrap as a group, but labels must not collide.
- The remove action must remain horizontal and readable; do not allow one word
  per line.
- Preserve the line count, quotation CTA, view-basket CTA, overlay dismissal,
  Escape dismissal, scroll locking, and focus return.

### Mobile header

- At 390px, keep the brand legible without splitting `Uni-Green` across lines.
- Keep the basket trigger and menu trigger visible without overflow.
- Preserve accessible names, badge count, keyboard operation, and locale/menu
  behavior.

### Product thumbnails

- Prefer the runtime product image when present and use the existing fallback
  mapping only when it is missing or fails.
- The basket thumbnail is adjacent to the same product name, so use `alt=""` to
  avoid announcing the name twice.
- Avoid a stale image if the basket line's `imageUrl` changes after render.
- Do not add image files to `frontend/public`.

## Code-quality requirements

- Remove unused imports.
- Format every edited TypeScript file with the repository's Prettier config.
- Do not add broad ignore rules such as `*.zip`; `/output/` is sufficient for
  these Playwright artifacts.
- Do not replace the layout with fixed pixel positioning or JavaScript viewport
  detection. Use the existing Tailwind breakpoints and design tokens.
- Preserve the current basket reducer, persistence, reconciliation, and
  idempotency behavior.

## Verification

Run from `frontend/`:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

Then start the existing local application and use a real Playwright browser.
Create fresh evidence under `output/playwright/inquiry-basket-fix/` at:

- 390x844
- 768x1024
- 1440x900

For every viewport:

1. Add one product twice and confirm there is one basket line.
2. Open the drawer and capture it with quantity, unit, and remove visible.
3. Close with Escape and confirm focus returns to the basket trigger.
4. Open the inquiry form, enter marked E2E contact data without submitting, and
   capture the complete basket line beside/above the form.
5. Confirm there is no horizontal document overflow, clipped text, overlapping
   control, broken image, unexpected console error, or failed asset request.
6. Repeat the visual check with a long Vietnamese product name if fixture data
   permits it.

Network interception is acceptable for this visual repair only. If routes are
mocked, report the run as UI verification and do not claim backend integration,
database persistence, authentication, or mail delivery passed.

## Completion report

Return only:

- files changed and one-line reasons;
- the four validation command results;
- screenshots captured per viewport;
- console/network findings;
- remaining failures or risks.

Stop when the requirements above pass. Do not refactor adjacent components or
continue into the broader release-blocker checklist.
