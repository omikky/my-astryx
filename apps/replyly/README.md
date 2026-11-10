# Replyly

A WhatsApp and Instagram sales assistant for small businesses, built on the Astryx design system.

## Run it

```bash
pnpm install            # from the repo root
cd apps/replyly
pnpm dev:all            # API on :8787 and the app on :5173
```

Open the app, go to Sign in (any email and password works in demo mode), then try the Inbox: type as the customer and the AI replies.

## Real AI replies and real payment links

The API works without keys (rule-based replies, demo payment references). Set these environment variables before starting the server to switch on the real services. See `.env.example`.

- `ANTHROPIC_API_KEY`: the Inbox then uses Claude (`ANTHROPIC_MODEL` overrides the model, default `claude-haiku-5-5`).
- `PAYSTACK_SECRET_KEY`: the Payments screen then creates real Paystack payment links.

Keys stay on the server and are never sent to the browser.

## Not built yet

- Real WhatsApp Business API and Instagram messaging webhooks (the Inbox uses sample conversations).
- Real accounts and a database (login is a demo session, orders and catalogue are sample data).
- Paystack webhook to mark orders as paid automatically.
