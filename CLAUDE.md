# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ASCEND webadmin — admin dashboard (Next.js 16 App Router, React 19, Turbopack, Tailwind v4, shadcn `base-nova`, `next-themes`) for a coffee business: inventory, recipes, production + HPP costing, finished-product batches, barista stock, orders, users. UI copy is Indonesian.

## Commands

```bash
npm run dev      # dev server (Turbopack), http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

No lint or test scripts exist — there is no ESLint config and no test runner. `tsc --noEmit` (via `tsconfig.json`) is the closest static check.

```bash
npx prisma db push          # sync schema to DB (also runs on postinstall)
npx prisma generate         # regenerate client into prisma/generated
npx tsx scripts/seed-admin.ts            # idempotent admin/customer/barista seed
npx tsx scripts/seed-orders.ts
npx tsx scripts/seed-payment-methods.ts
```

Env: copy `.env.example` to `.env`. Requires `DATABASE_URL` (PostgreSQL ≥ 15), `AUTH_SECRET`/`NEXTAUTH_URL`, Firebase client (`NEXT_PUBLIC_FIREBASE_*`) + Firebase Admin vars, and R2 vars for uploads.

## Architecture

- **Path aliases**: `@/*` → `src/*`, `@/prisma/*` → `prisma/*`. Use absolute imports (see recent refactor commit).
- **Prisma 7**: schema in `prisma/schema.prisma`; generated client lives in `prisma/generated/` — import from `@/prisma/generated/client` and `@/prisma/generated/enums`. DB access via `prisma` from `@/lib/db` (uses `@prisma/adapter-pg`, `server-only` pattern implied — never import `db.ts` into client components).
- **API routes** (`src/app/api/`): wrap every handler in `handle` / `handleAuth` from `@/lib/api-response`, respond with `ok()` / `created()` / `fail()`. `handleAuth` defaults to ADMIN-only; pass `{ roles }` to widen. Errors: throw `ApiError` (`@/lib/api-error`) or let Zod errors bubble — `mapError` converts Zod → 422, P2002 → 409.
- **Business logic** lives in `src/modules/<domain>/`: `<name>.service.ts` + `<name>.validator.ts` (Zod). Route handlers stay thin: validate → call service → `ok()`. Domains: `inventory-item`, `restock`, `inventory-batch`, `product`, `recipe`, `production`, `finished-products`, `cost-history`, `stock`, `barista-stock`, `order`, `user`, `setting`, `report`, `dashboard`.
- **Auth**: Firebase Auth (email/password) on the client → ID token → NextAuth v4 Credentials provider verifies via `firebase-admin` (`@/lib/firebases/firebase-admin`) and loads the `User` row. WebAdmin is ADMIN-only, enforced in two places: `src/proxy.ts` (Next.js 16 proxy, replaces `middleware.ts`) redirects non-admin pages to `/login`; API routes enforce via `handleAuth`. Session user shape: `SessionUser` in `@/lib/auth`.
- **Pages** (`src/app/(auth)`, `src/app/(dashboard)`): route groups; dashboard layout has sidebar (`components/app-sidebar.tsx`, `nav-*.tsx`, `team-switcher.tsx`). Feature components colocated per domain under `src/components/<domain>/`; shared UI in `src/components/ui/` (shadcn).
- **Uploads**: Cloudflare R2 via `@/lib/r2` (S3-compatible, `sharp` for image processing). Firebase RTDB helpers exist in `@/lib/firebases/` for realtime/tracking features.

## Domain flow (source of truth: `docs/`)

```
InventoryItem → Restock → InventoryBatch (qty + unit cost)
Product (master, NOT an inventory source) + Recipe → Production
  → consumes InventoryBatch via ProductionComponent
  → writes FinishedProductBatch (sellable stock) + ProductCostHistory (HPP)
```

Product stays one master row with many finished-product batches; never model a Product as an `InventoryBatch`. HPP must stay traceable item → batch → recipe → production → component.

## AGENTS.md

`@AGENTS.md` — graphify usage (`graphify query/path/explain`, `graphify update .` after edits). Follow it for codebase questions when `graphify-out/` exists.
