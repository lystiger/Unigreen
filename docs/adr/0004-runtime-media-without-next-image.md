# 4. Runtime media is rendered with `<img>`, not `next/image`

Date: 2026-07-27

Status: Accepted

## Context

Product media is uploaded by staff, processed by the backend `media` module and
served from a URL the API returns at runtime. Three call sites render it:

- `components/product/ProductCard.tsx` — catalogue grid thumbnail
- `components/product/ProductDetailPage.tsx` — product hero, above the fold
- `components/admin/ProductEditor.tsx` — media manager thumbnail

All three currently use a raw `<img>` with `@next/next/no-img-element`
disabled. That disable was undocumented, which is what this ADR corrects.

`next/image` optimises at request time through the Next server. Using it here
would mean either:

1. Enumerating every media host in `next.config.ts` `images.remotePatterns`.
   The host is environment-dependent — a mounted volume served by the API
   today, an S3-compatible endpoint later (Sprint 0 decision, still open). A
   config change would be required to ship a storage change that the contract
   otherwise absorbs, and a missed pattern is a runtime 400, not a build error.
2. Proxying staff media through the Next server. Staff media is behind a
   cookie session with CSRF; routing it through a second origin means
   forwarding credentials the Next server has no reason to hold.

The backend already emits sized variants (`MediaVariantResponse` carries
`width`, `height`, `url`), so the resizing `next/image` would perform is
work the pipeline has done.

## Decision

Render runtime media with `<img>` and keep the ESLint disable, scoped per call
site with a comment pointing here.

Because we forgo `next/image`, every such `<img>` must set by hand what it
would otherwise have provided:

- `width` and `height` from the variant, so the box is reserved and the image
  contributes no cumulative layout shift
- `decoding="async"`, so decode never blocks the main thread
- `loading="lazy"` by default
- `loading="eager"` with `fetchPriority="high"` for the product detail hero
  only, because it is the LCP element and lazy-loading it defers the largest
  paint by a round trip

`tests/design-rules.test.ts` enforces the first three across the repository.

## Consequences

Positive:

- Storage backend can change without a frontend config change.
- No credential forwarding for staff media.
- Sized variants are used as produced; no double resizing.

Negative:

- No automatic AVIF/WebP negotiation. The backend variant pipeline owns format
  choice, so this must be solved there if it is wanted.
- The loading hints are a manual discipline. They are covered by a test rather
  than by the framework, and that test is the thing that must not be deleted.

Revisit if media moves to a single stable CDN host and staff media stops being
credentialed — at that point `next/image` costs one `remotePatterns` entry and
this trade reverses.
