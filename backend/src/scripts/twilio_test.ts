import 'dotenv/config'
import { TwilioService } from '../integrations/twilio.js'
import { NangoClient } from '../integrations/nangoClient.js'

function getArg(name: string): string | undefined {
  const key = `--${name}`
  const idx = process.argv.findIndex(a => a === key || a.startsWith(key + '='))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  const eq = val.indexOf('=')
  if (eq > -1) return val.slice(eq + 1)
  return process.argv[idx + 1]
}

async function main() {
  const nangoBase = getArg('nangoBase') || process.env.NANGO_API_BASE || process.env.NANGO_HOST
  const nangoKey = getArg('nangoKey') || process.env.NANGO_SECRET_KEY
  const providerConfigKey = getArg('providerConfigKey') || process.env.TWILIO_PROVIDER_CONFIG_KEY || 'twilio'
  const connectionId = getArg('connectionId') || process.env.TWILIO_CONNECTION_ID
  const from = getArg('from') || process.env.TWILIO_FROM
  const to = getArg('to') || process.env.TWILIO_TO
  const body = getArg('body') || process.env.TWILIO_BODY || 'Hello from Twilio via Nango Proxy!'
  const accountSid = getArg('accountSid') || process.env.TWILIO_ACCOUNT_SID
  const mediaUrl = getArg('mediaUrl') || process.env.TWILIO_MEDIA_URL

  if (!nangoBase || !nangoKey || !providerConfigKey || !connectionId || !from || !to) {
    console.error('Missing inputs. Required: --nangoBase, --nangoKey, --providerConfigKey, --connectionId, --from, --to. Optional: --body, --accountSid')
    process.exit(1)
  }

  const svc = new TwilioService(new NangoClient({ baseUrl: nangoBase, secretKey: nangoKey }))
  try {
    let resp: any
    if (mediaUrl) {
      resp = await svc.sendMedia({ providerConfigKey, connectionId, from, to, body, accountSid, mediaUrl })
    } else {
      resp = await svc.sendSMS({ providerConfigKey, connectionId, from, to, body, accountSid })
    }
    console.log('Twilio send response:', JSON.stringify(resp, null, 2))
  } catch (e: any) {
    console.error('Twilio send failed:', e?.response?.status || e.code, e?.response?.data || e.message)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
