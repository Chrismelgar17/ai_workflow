import 'dotenv/config'
import { NangoClient } from '../integrations/nangoClient.js'

async function main() {
  const base =
    process.argv.find(a => a.startsWith('--base='))?.split('=')[1] ||
    process.env.NANGO_API_BASE ||
    process.env.NANGO_API_BASE_DEV ||
    process.env.NANGO_API_BASE_PROD ||
    process.env.NANGO_HOST ||
    process.env.NANGO_HOST_DEV ||
    process.env.NANGO_HOST_PROD
  const key =
    process.argv.find(a => a.startsWith('--key='))?.split('=')[1] ||
    process.env.NANGO_SECRET_KEY ||
    process.env.NANGO_SECRET_KEY_DEV ||
    process.env.NANGO_SECRET_KEY_PROD
  if (!base || !key) {
    console.error('Provide Nango base & secret via env (NANGO_API_BASE/NANGO_SECRET_KEY) or flags --base= --key=')
    process.exit(1)
  }
  const client = new NangoClient({ baseUrl: base, secretKey: key })
  try {
    const list: any = await client.listConnections()
    console.log('Connections:')
    for (const c of list.connections || []) {
      console.log(`- connection_id=${c.connection_id} provider=${c.provider} provider_config_key=${c.provider_config_key}`)
    }
    if (!list.connections || list.connections.length === 0) {
      console.log('No connections found.')
    }
  } catch (e: any) {
    console.error('Failed to list connections:', e?.response?.status, e?.response?.data || e.message)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
