# Backend storage overview

This backend currently uses in-memory stores for all data. You can see them in `backend/src/index.ts` under the `db` object (arrays for users, templates, flows, connections, secrets, executions, audit). This is great for demos, but it resets every time the server restarts and is not suitable for production.

## What it uses today

- In-memory arrays only (no SQL/ORM)
- No persistence to disk or external DB
- Swagger is available at `/api/docs` and `/api/openapi.json`

## Recommended: Supabase (managed Postgres + extras)

Supabase gives you a hosted Postgres database with a generous free tier, plus Auth, Storage, and an easy SQL editor. It’s a good fit if you want to keep ops light and move quickly.

### High-level steps

1) Create a Supabase project and get:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, secret)

2) Add environment variables (for example in `.env.local` or an API `.env` if you split services):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Demo credentials

After running the seed script, a demo account is available via Supabase Auth:

- Email: `admin@example.com`
- Password: `admin123`

The same user also exists in the `users` table for the Users CRUD page.

3) Install the client in the backend:

```
npm i @supabase/supabase-js
```

4) Create a small client helper (e.g., `backend/src/db/supabase.ts`):

```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
})
```

5) Replace in-memory operations in routes with Supabase queries. Example for users:

```ts
// list users (passwords omitted)
const { data, error } = await supabase.from('users').select('id,email,name,tenant_name')
if (error) return res.status(500).json({ error: error.message })
return res.json(data)
```

6) Suggested minimal schema (adjust to your needs):

```sql
-- Users (app-level; separate from Supabase Auth if you want custom)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text null, -- for demo only; prefer hashed+salted or external auth
  name text,
  tenant_name text,
  created_at timestamptz default now()
);

-- Templates
create table if not exists templates (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Flows
create table if not exists flows (
  id text primary key,
  name text not null,
  status text not null check (status in ('draft','active')),
  created_at timestamptz default now()
);

-- Executions
create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  flow_id text not null references flows(id) on delete cascade,
  status text not null check (status in ('success','failed')),
  started_at timestamptz not null default now()
);

-- Connections
create table if not exists connections (
  id text primary key,
  provider text not null,
  category text,
  account text,
  status text,
  created_at timestamptz default now()
);

-- Secrets (store values encrypted elsewhere; keep metadata here)
create table if not exists secrets (
  name text primary key,
  value text, -- consider KMS/Vault; storing plaintext is not recommended
  expires_at timestamptz
);

-- Audit
create table if not exists audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  at timestamptz not null default now()
);
```

7) Migrations: you can paste SQL in the Supabase SQL editor for quick starts, or use the Supabase CLI for versioned migrations.

### Pros
- Managed Postgres with generous free tier
- Easy SQL editor and dashboard
- Optional Auth/Storage built-in

### Cons
- External dependency (requires cloud access)
- If you need multi-region or very high scale, you’ll need to plan accordingly

## Alternative: Postgres + Prisma

If you prefer running your own Postgres (locally via Docker or in the cloud), Prisma is a great DX for Node/TypeScript.

- Add dependencies:

```
npm i prisma @prisma/client
npx prisma init
```

- Point `DATABASE_URL` to your Postgres, define your schema in `prisma/schema.prisma`, then:

```
npx prisma migrate dev --name init
```

- Replace in-memory operations with Prisma client calls.

Pros: Type-safe queries, great developer tooling. Cons: You manage the DB yourself.

## Alternative: SQLite (dev-only)

You can point Prisma at SQLite for quick local persistence. It’s fine for prototyping, but not ideal for concurrent writes or production.

## Summary

- Today: data is in-memory (ephemeral).
- Recommended path: Supabase for fast, managed persistence.
- If you want to stay self-hosted: Postgres + Prisma is a solid choice.
- I can wire either option for you and migrate the current routes away from the in-memory `db`.

### Compose usage

Add your Supabase credentials to a `.env` file at the repo root (Compose auto-loads it):

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Then start the stack normally. The `api` service will detect Supabase and use it for the Users CRUD.

## LLM Integration (OpenAI)

The backend exposes two endpoints when `OPENAI_API_KEY` is set:

- `POST /api/llm/complete`: JSON body with `prompt` (required), optional `model`, `temperature`, `maxTokens`, `system`, `provider` (default `openai`), and `useCache` (bool). Returns `{ content, model, created, usage }`.
- `GET /api/llm/stream`: Query params `prompt` (required), optional `model`, `temperature`, `maxTokens`, `system`, `provider`. Streams SSE events with `{ delta }` chunks and a final `{ done, content }`.

Environment variables:
- `OPENAI_API_KEY` (required)
- `OPENAI_DEFAULT_MODEL` (optional, e.g. `gpt-4o-mini`)
- `OPENAI_SYSTEM_PROMPT` (optional)
- `LLM_RATE_LIMIT_PER_MINUTE` (optional, default 60 per IP)
- `LLM_CACHE_ENABLED` (optional, `true|false`) to enable in-memory cache for non-streaming completes
- `LLM_BANNED_TERMS` (optional, comma-separated keywords to block in prompts)

Notes:
- Requests are per-IP rate limited on `/api/llm/*` using an in-memory counter.
- Basic moderation checks prompt for banned keywords and size.
- Logs for both endpoints are appended to `backend/logs/llm.log` (create automatically). The log includes metadata (lengths, not raw secrets).
