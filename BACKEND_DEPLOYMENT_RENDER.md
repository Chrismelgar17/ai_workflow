# Backend Deployment (Render)

Use this guide to deploy the Express backend in `backend/` to a stable public URL on Render Free.

## Why
- Removes the need for temporary tunnels.
- Gives Vercel a permanent API base URL.

## Prerequisites
- Repo pushed to GitHub.
- Render account.

## One-time setup
1. Ensure this repo contains `render.yaml` at the root (it does). It defines a single web service for `backend/` on port 5000 with a health check at `/api/health`.
2. Commit and push any local changes.

## Deploy (Blueprint)
1. In the Render dashboard: New → Blueprint → pick this repository.
2. Review the plan (Free) and service name (workflow-backend). Click Apply.
3. Wait for the first deploy to complete. You’ll get a stable URL like:
   - https://workflow-backend.onrender.com

## Configure Vercel UI
1. In your Vercel project, set:
   - `NEXT_PUBLIC_API_URL` → the Render URL above (no trailing slash)
2. Redeploy the UI. All `/api/*` calls will proxy to `${NEXT_PUBLIC_API_URL}/api/*`.

## Optional: Supabase-backed data
- Add these env vars to the Render service if you want to use Supabase instead of in-memory mocks:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- You can also set `CORS_ORIGIN` to your Vercel domain (defaults to `*`).

## Verify
- API health: `GET <Render URL>/api/health`
- Swagger: `GET <Render URL>/api/docs`
- From Vercel UI: `GET https://<your-vercel-app>/api/docs` (proxied)

## Notes
- The backend was adjusted to remove a local `file:..` dependency and to compile cleanly for CI/CD.
- To automate deployments, connect Render to your main branch and enable auto-deploy on commit.
