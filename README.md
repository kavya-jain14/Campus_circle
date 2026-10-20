# Campus Circle

A responsive college club event management website built for the Code Kitchen development recruitment task.

[Live website](https://campus-circle-kavya.kavyajain1407dtydhtb.chatgpt.site)

## Features
- Home page with club introduction, featured event and upcoming events.
- Search events by name and filter by Workshop, Competition, Community or Design.
- Student registration: name, email, college, year and phone.
- Password-protected admin dashboard with event creation, editing and deletion.
- Search registrations by name, email, college or phone; filter by event.
- Shared SQLite/D1 persistence, input validation and duplicate email protection per event.

## Stack
React 19, TypeScript, Vinext (Next.js-compatible framework), Cloudflare Workers, D1 SQLite, Drizzle migrations and Zod.

## Setup
Requires Node.js 22.13+.

```sh
npm ci
npm run db:generate
npx wrangler d1 migrations apply DB --local
npm run dev
```

Configure a D1 binding named `DB` in your local Cloudflare configuration. Set `ADMIN_PASSWORD` as a runtime secret; never commit it. For local development, use a `.dev.vars` file (ignored by Git). Apply SQL files from `drizzle/` to your local D1 database; the `wrangler d1 migrations` command requires setting `migrations_dir` to `drizzle` in your local configuration. The managed deployment applies generated migrations automatically.

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Production uses a secure, HTTP-only, same-site admin cookie. Its signed expiry is enforced by the server after eight hours, and changing `ADMIN_PASSWORD` invalidates existing sessions. Older permanent password-hash cookies are rejected; admins must sign in again after this update. Logout clears the browser cookie; a copied signed token remains valid until expiry or a password change. Use HTTPS for admin login. Admin authentication is intentionally a simple shared-password scheme for this recruitment project; use an identity provider and rate limiting before operating a large public club service.

Run `npm test` for the admin-session expiry, tampering and password-change regressions. These tests do not replace a live D1/admin deployment smoke test.

## Demo data
Four clearly fictional sample events are added once on first database access. Admins may edit or delete them. New registrations are real database records. Event deletion also deletes that event's registrations after confirmation.

Dates use the browser's local timezone. Sample college branding is ABES Engineering College. Replace sample information with your club's details before real use.

## Assets
No stock images or icon assets are used. Fonts are DM Sans and Manrope, served by Google Fonts under the SIL Open Font License. The interface is built with CSS.
