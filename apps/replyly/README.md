# Replyly

A WhatsApp and Instagram sales assistant for small businesses, built on the Astryx design system.

Real accounts, a real database, AI replies, and Paystack payment links.

## Run it locally

Requires Node 22.5 or newer (the database is Node's built-in SQLite).

```bash
pnpm install            # from the repo root
cd apps/replyly
pnpm dev:all            # API on :8787 and the app on :5173
```

Open the app and create an account. A new account starts empty; use **Load sample data** on the Dashboard to explore. Then try the Inbox: type as the customer and the AI replies.

## Run it as one production process

```bash
pnpm build
node server/index.mjs   # serves the built app and the API on :8787
```

Set `COOKIE_SECURE=true` whenever the site is served over HTTPS.

## Configuration (environment variables)

| Variable | Purpose |
| --- | --- |
| `DATABASE_PATH` | SQLite file. Default `apps/replyly/data/replyly.db`. Put it on a persistent disk when you deploy. |
| `COOKIE_SECURE` | `true` behind HTTPS so the session cookie is marked Secure. |
| `ANTHROPIC_API_KEY` | Inbox replies come from Claude instead of simple rules. `ANTHROPIC_MODEL` overrides the model (default `claude-haiku-5-5`). |
| `PAYSTACK_SECRET_KEY` | Payments creates real Paystack links and the webhook is enabled. |
| `PORT` | Default `8787`. |

Keys and the database stay on the server and are never sent to the browser. See `.env.example`.

## Paystack: marking orders paid automatically

In the Paystack dashboard, set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`. When a customer pays, Paystack calls it; the server checks the signature, the exact amount and the currency, then marks the order Paid.

## Security notes

- Passwords are hashed with scrypt and per-user salts. Sessions are random tokens stored hashed, sent in an HttpOnly, SameSite=Lax cookie, and expire after 30 days.
- Failed logins are rate limited per IP and email.
- Every query is scoped to the signed-in business, so one account can never read or change another's data.
- Payment amounts always come from the stored order, never from the browser.
- Writes require `Content-Type: application/json`, which blocks cross-site form posts.

## Tests

```bash
pnpm test:server
```

Covers signup and login, password hashing, rate limiting, tenant isolation, input validation, AI replies, the payment amount rules, and the webhook signature.

## Not built yet

- Real WhatsApp Business API and Instagram messaging. The Inbox runs on your stored conversations, and you can test the AI by typing as the customer. Connecting live channels needs a Meta developer account and webhook setup.
- Email verification and password reset (these need an email provider).
- Node's SQLite is marked experimental and prints a notice at start. It is fine for one server; move to Postgres if you outgrow a single machine.
