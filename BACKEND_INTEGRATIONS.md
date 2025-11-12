# Backend Integrations: Nango & Panora

This backend exposes a unified integration endpoint to interact with external services through either Nango or Panora. It standardizes common workflow actions across multiple services.

## Environment variables

Set these (locally in `.env` or in your host environment like Render):

- Nango
  - `NANGO_HOST` or `NANGO_API_BASE`: Base URL for your Nango server (e.g. `https://api.nango.dev` or your self-hosted deployment). `NANGO_API_BASE` takes precedence.
  - `NANGO_SECRET_KEY`: Your Nango server secret (server-side only). If your Nango environment is named (e.g. `dev`, `prod`), you can also use `NANGO_SECRET_KEY_DEV` or `NANGO_SECRET_KEY_PROD`. Similarly, `NANGO_API_BASE_DEV`/`_PROD` are supported.

- Panora
  - `PANORA_API_URL`: Base URL for Panora (e.g. `https://api.panora.dev` or your self-hosted URL).
  - `PANORA_API_KEY`: API key or token for Panora. Sent as `Authorization: Bearer <key>`.

## Unified endpoint

POST `/api/integrations/unified`

Body shape:

```
{
  "provider": "nango" | "panora",
  "resource": "crm.contact" | "hr.employee" | "whatsapp.message",
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

- Send a WhatsApp text message via Nango Proxy
```
POST /api/integrations/unified
{
  "provider": "nango",
  "resource": "whatsapp.message",
  "operation": "create",
  "data": {
    "providerConfigKey": "whatsapp-business",        // Your Nango integration key
    "connectionId": "conn_abc123",                   // An existing Nango connection for WhatsApp Cloud
    "phoneNumberId": "123456789012345",              // WhatsApp Business phone number ID
    "type": "text",
    "to": "+15551234567",
    "body": "Hello from Nango proxy!"
  }
}
```

- Send a WhatsApp template message via Nango Proxy
```
POST /api/integrations/unified
{
  "provider": "nango",
  "resource": "whatsapp.message",
  "operation": "create",
  "data": {
    "providerConfigKey": "whatsapp-business",
    "connectionId": "conn_abc123",
    "phoneNumberId": "123456789012345",
    "type": "template",
    "to": "+15551234567",
    "template": {
      "name": "order_update",
      "language": { "code": "en_US" },
      "components": []
    }
  }
}
```

- Send a Twilio SMS via Nango Proxy
```
POST /api/integrations/unified
{
  "provider": "nango",
  "resource": "twilio.sms",
  "operation": "create",
  "data": {
    "providerConfigKey": "twilio",
    "connectionId": "conn_twilio_1",
    "from": "+15005550006",
    "to": "+15551234567",
    "body": "Hello via Twilio!",
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" // optional; provider config can template this
  }
}
```

Notes for WhatsApp Cloud via Nango:
- You need to create an Integration (Provider Config) in Nango with a unique key (e.g. `whatsapp-business`). Since WhatsApp might not be pre-built yet, configure it as a custom provider and store the required credentials.
- Create a Connection for that provider in Nango using your Meta App credentials and access token. The backend will use Nango's Requests Proxy to call the WhatsApp Cloud API.
- The backend targets `https://graph.facebook.com` and default API version `v20.0`. You can override with `data.apiVersion` or `data.baseUrlOverride`.

### Importing an existing WhatsApp connection (API Key style)

If you already have a long‑lived WhatsApp Cloud access token, you can import it directly into Nango instead of running an OAuth flow.

Script:
```
npm run nango:import -- \
  --providerConfigKey=whatsapp-business \
  --connectionId=whatsapp-prod-1 \
  --apiKey=<WHATSAPP_LONG_LIVED_TOKEN> \
  --base=https://api.nango.dev \
  --key=<NANGO_SECRET_KEY>
```

Flags:
- `--providerConfigKey`: Your Nango integration key (must exist in Nango first).
- `--connectionId`: Arbitrary ID you assign to this connection.
- `--apiKey`: The WhatsApp access token.
- `--base` / `--key`: Override base URL & secret if not set via env.

After import, list to confirm:
```
npm run nango:connections -- --base=https://api.nango.dev --key=<NANGO_SECRET_KEY>
```

Then send a test message:
```
npm run whatsapp:test -- \
  --nangoBase=https://api.nango.dev \
  --nangoKey=<NANGO_SECRET_KEY> \
  --providerConfigKey=whatsapp-business \
  --connectionId=whatsapp-prod-1 \
  --phoneNumberId=<WHATSAPP_PHONE_NUMBER_ID> \
  --to=+15551234567 \
  --body="Hello from Nango WhatsApp!"
```

## Notes

- The unified clients are thin wrappers over REST endpoints and expect your Nango/Panora deployment to expose compatible paths such as `/crm/contacts` and `/hris/employees`.
- For WhatsApp, the backend uses Nango's Requests Proxy at `/proxy/{endpoint}` and passes `Provider-Config-Key` and `Connection-Id` headers as required by Nango.
- For Twilio, the backend uses Nango's Requests Proxy with `Base-Url-Override: https://api.twilio.com` and endpoint `/2010-04-01/Accounts/{AccountSid}/Messages.json`. Configure the provider to inject Basic Auth (AccountSid:AuthToken) or OAuth token as applicable.
- If your deployment uses different paths or headers, tweak `backend/src/integrations/nangoClient.ts` and `panoraClient.ts` accordingly.
- The unified endpoint requires auth (`requireAuth`), aligning with other write operations.

## Extending

To add a new domain/entity or operation:
- Update `backend/src/integrations/unified.ts` switch statements.
- Implement corresponding helpers in `nangoClient.ts` and `panoraClient.ts`.
- Optionally document the new mapping here.
