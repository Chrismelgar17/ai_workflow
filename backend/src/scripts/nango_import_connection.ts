import 'dotenv/config'
import { NangoClient } from '../integrations/nangoClient.js'

/*
  Usage (API Key style for WhatsApp Cloud long-lived token):
  npm run nango:import -- --providerConfigKey=whatsapp-business --connectionId=whatsapp-prod-1 --apiKey=<WHATSAPP_TOKEN>

  Flags:
    --providerConfigKey  (required)
    --connectionId       (required)
    --apiKey             (required) long-lived access token
    --base               (optional) overrides NANGO_API_BASE env
    --key                (optional) overrides NANGO_SECRET_KEY env
*/

function getFlag(name: string): string | undefined {
  const pref = `--${name}`
  const idx = process.argv.findIndex(a => a === pref || a.startsWith(pref + '='))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  const eq = val.indexOf('=')
  if (eq > -1) return val.slice(eq + 1)
  return process.argv[idx + 1]
}

async function main() {
  const providerConfigKey = getFlag('providerConfigKey')
  const connectionId = getFlag('connectionId')
  const apiKey = getFlag('apiKey')
  const base = getFlag('base') || process.env.NANGO_API_BASE || process.env.NANGO_API_BASE_DEV || process.env.NANGO_HOST
  const secret = getFlag('key') || process.env.NANGO_SECRET_KEY || process.env.NANGO_SECRET_KEY_DEV

  if (!providerConfigKey || !connectionId || !apiKey) {
    console.error('Missing required flags: --providerConfigKey --connectionId --apiKey')
    process.exit(1)
  }
  if (!base || !secret) {
    console.error('Missing Nango base/secret. Provide via env or flags --base --key')
    process.exit(1)
  }

  const client = new NangoClient({ baseUrl: base, secretKey: secret })
  try {
    const body = {
      provider_config_key: providerConfigKey,
      connection_id: connectionId,
      credentials: {
        type: 'API_KEY',
        api_key: apiKey,
      },
      metadata: {},
    }
    const resp = await client.importConnection(body)
    console.log('Imported connection:', JSON.stringify(resp, null, 2))
  } catch (e: any) {
    console.error('Import failed:', e?.response?.status, e?.response?.data || e.message)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
