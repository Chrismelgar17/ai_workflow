import 'dotenv/config'
import { NangoClient } from '../integrations/nangoClient.js'

/*
  Usage:
  - API Key style (e.g., WhatsApp Cloud long-lived token):
    npm run nango:import -- --providerConfigKey=whatsapp-business --connectionId=whatsapp-prod-1 --apiKey=<TOKEN>

  - BASIC auth (e.g., Twilio Account SID + Auth Token):
    npm run nango:import -- --providerConfigKey=twilio --connectionId=twilio-conn-1 --basicUser=<ACCOUNT_SID> --basicPass=<AUTH_TOKEN>

  Flags:
    --providerConfigKey  (required)
    --connectionId       (required)
    --apiKey             (optional) long-lived access token (type API_KEY)
    --basicUser          (optional) BASIC auth username (e.g., Account SID)
    --basicPass          (optional) BASIC auth password (e.g., Auth Token)
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
  const basicUser = getFlag('basicUser')
  const basicPass = getFlag('basicPass')
  const base = getFlag('base') || process.env.NANGO_API_BASE || process.env.NANGO_API_BASE_DEV || process.env.NANGO_HOST
  const secret = getFlag('key') || process.env.NANGO_SECRET_KEY || process.env.NANGO_SECRET_KEY_DEV

  if (!providerConfigKey || !connectionId || (!apiKey && !(basicUser && basicPass))) {
    console.error('Missing required flags: --providerConfigKey --connectionId and one of (--apiKey | --basicUser + --basicPass)')
    process.exit(1)
  }
  if (!base || !secret) {
    console.error('Missing Nango base/secret. Provide via env or flags --base --key')
    process.exit(1)
  }

  const client = new NangoClient({ baseUrl: base, secretKey: secret })
  try {
    const body: any = {
      provider_config_key: providerConfigKey,
      connection_id: connectionId,
      credentials: undefined,
      metadata: {},
    }
    if (apiKey) {
      body.credentials = { type: 'API_KEY', api_key: apiKey }
    } else {
      body.credentials = { type: 'BASIC', username: basicUser, password: basicPass }
    }
    const resp = await client.importConnection(body)
    console.log('Imported connection:', JSON.stringify(resp, null, 2))
  } catch (e: any) {
    console.error('Import failed:', e?.response?.status, e?.response?.data || e.message)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
