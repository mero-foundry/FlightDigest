# FlightDigest

FlightDigest turns pasted TestFlight beta feedback into clustered themes, release blockers, and GitHub/Jira-ready issue drafts.

The MVP is intentionally narrow: paste feedback, generate a digest, review blocker themes, copy issue Markdown, and send users through a Stripe Payment Link when export monetization is enabled.

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The Vite app proxies `/api/*` to the local Express API on port `8788`.

## Runtime Configuration

Copy `.env.example` to `.env` or pass variables in your shell. `.env` is loaded by the server through `dotenv`.

```bash
cp .env.example .env
npm run dev
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8788` | Express API/static server port. |
| `STRIPE_PAYMENT_LINK` | unset | Optional HTTPS Stripe Payment Link for the create-issues/export handoff. |
| `OPENAI_API_KEY` | unset | Optional key for model-assisted executive summaries. |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Model used when enrichment is enabled. |
| `OPENAI_ENRICHMENT_ENABLED` | `false` | Must be `true` before beta feedback is sent to OpenAI. |
| `DIGEST_RATE_LIMIT_PER_MINUTE` | `20` | Per-IP `/api/digest` rate limit. |
| `MAX_FEEDBACK_CHARS` | `120000` | Server-side pasted feedback cap. |

## Privacy Boundary

By default, feedback is processed locally in the Node API using heuristic clustering. Setting `OPENAI_API_KEY` alone does not send feedback to OpenAI. You must also set:

```bash
OPENAI_ENRICHMENT_ENABLED=true
```

That is deliberate because TestFlight feedback can include user content, device details, and private beta context.

## Production Run

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

Production behavior:

- Serves the built Vite app from `dist`.
- Adds basic security headers and production CSP.
- Caches hashed assets under `/assets` for one year.
- Disables `x-powered-by`.
- Provides `GET /api/health`.
- Validates digest payloads and export target values.
- Rate-limits `/api/digest`.

## Checks

```bash
npm run ci
```

Individual checks:

```bash
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

GitHub Actions runs the same CI gate on pushes and pull requests to `main`.

## MVP Boundary

Built now:

- Paste/import feedback from `.txt`, `.json`, or `.csv`.
- Heuristic clustering for stability, alerts, battery, location, widgets, UI, performance, requests, and positive feedback.
- Release blocker summary.
- GitHub/Jira issue Markdown preview.
- Clipboard copy with browser-permission fallback.
- Stripe Payment Link handoff.
- Optional OpenAI summary enrichment with explicit privacy opt-in.
- CI, unit tests, e2e smoke test, production security headers, rate limiting, and deploy docs.

Deferred on purpose:

- App Store Connect API import.
- Real GitHub/Jira issue creation.
- User accounts and persisted workspaces.
- Scheduled email delivery backend.
- Multi-tenant storage, auth, billing state, and audit logs.

## License

FlightDigest is licensed under the [MIT License](LICENSE).
