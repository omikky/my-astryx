// Replyly API server. No dependencies beyond Node 22 (node:sqlite).
// Secrets and the database stay on the server.
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {openDb} from './db.mjs';
import {createApp} from './app.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);

const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-5-5',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};

const db = openDb(process.env.DATABASE_PATH ?? join(here, '..', 'data', 'replyly.db'));
const handler = createApp({db, config, staticDir: join(here, '..', 'dist')});

createServer(handler).listen(PORT, () => {
  console.log(
    `Replyly on :${PORT} (AI: ${config.anthropicApiKey ? 'Claude' : 'rules fallback'}, payments: ${config.paystackSecretKey ? 'Paystack' : 'demo'}, secure cookies: ${config.cookieSecure})`,
  );
});
