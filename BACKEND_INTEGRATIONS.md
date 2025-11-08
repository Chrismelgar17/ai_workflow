# Backend Integrations: Nango & Panora

This backend exposes a unified integration endpoint to interact with external services through either Nango or Panora. It standardizes common workflow actions across multiple services.

## Environment variables

Set these (locally in `.env` or in your host environment like Render):

- Nango
  - `NANGO_HOST` or `NANGO_API_BASE`: Base URL for your Nango server (e.g. `https://api.nango.dev` or your self-hosted deployment). `NANGO_API_BASE` takes precedence.
  - `NANGO_SECRET_KEY`: Your Nango server secret (server-side only).

- Panora
  - `PANORA_API_URL`: Base URL for Panora (e.g. `https://api.panora.dev` or your self-hosted URL).
  - `PANORA_API_KEY`: API key or token for Panora. Sent as `Authorization: Bearer <key>`.

## Unified endpoint

POST `/api/integrations/unified`

Body shape:

```
{
  "provider": "nango" | "panora",
  "resource": "crm.contact" | "hr.employee",
  "operation": "list" | "get" | "create",
  "id": "...",          // required for get
  "params": { ... },     // optional query params for list
  "data": { ... }        // create payload
}
```

Examples:

- List CRM contacts via Panora
```
POST /api/integrations/unified
{
  "provider": "panora",
  "resource": "crm.contact",
  "operation": "list",
  "params": { "page": 1, "page_size": 50 }
}
```

- Get HR employee via Nango
```
POST /api/integrations/unified
{
  "provider": "nango",
  "resource": "hr.employee",
  "operation": "get",
  "id": "emp_123"
}
```

- Create CRM contact via Nango
```
POST /api/integrations/unified
{
  "provider": "nango",
  "resource": "crm.contact",
  "operation": "create",
  "data": { "email": "test@example.com", "first_name": "Test" }
}
```

## Notes

- The unified clients are thin wrappers over REST endpoints and expect your Nango/Panora deployment to expose compatible paths such as `/crm/contacts` and `/hris/employees`.
- If your deployment uses different paths or headers, tweak `backend/src/integrations/nangoClient.ts` and `panoraClient.ts` accordingly.
- The unified endpoint requires auth (`requireAuth`), aligning with other write operations.

## Extending

To add a new domain/entity or operation:
- Update `backend/src/integrations/unified.ts` switch statements.
- Implement corresponding helpers in `nangoClient.ts` and `panoraClient.ts`.
- Optionally document the new mapping here.
