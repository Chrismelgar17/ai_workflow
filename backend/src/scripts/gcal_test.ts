import 'dotenv/config'
import { NangoClient } from '../integrations/nangoClient.js'
import { GoogleCalendarService } from '../integrations/googleCalendar.js'

function parseArgs() {
  const args = process.argv.slice(2)
  const out: Record<string, string> = {}
  for (const a of args) {
    const [k, v] = a.split('=')
    if (k && v !== undefined) out[k.replace(/^--/, '')] = v
  }
  return out
}

async function main() {
  const a = parseArgs()
  const baseUrl = a.nangoBase || process.env.NANGO_API_BASE || process.env.NANGO_HOST
  const key = a.nangoKey || process.env.NANGO_SECRET_KEY
  const providerConfigKey = a.providerConfigKey || 'google-calendar'
  const connectionId = a.connectionId
  const calendarId = a.calendarId || 'primary'
  const op = a.op || 'listEvents' // listCalendars | listEvents | createEvent

  if (!baseUrl || !key) throw new Error('Nango base/key required (use --nangoBase and --nangoKey)')
  if (!connectionId) throw new Error('--connectionId required')

  const nango = new NangoClient({ baseUrl, secretKey: key })
  const svc = new GoogleCalendarService(nango)

  if (op === 'listCalendars') {
    const resp = await svc.listCalendars({ providerConfigKey, connectionId })
    console.log(JSON.stringify(resp, null, 2))
    return
  }
  if (op === 'listEvents') {
    const resp = await svc.listEvents({ providerConfigKey, connectionId, calendarId, maxResults: 10, singleEvents: true, orderBy: 'startTime' })
    console.log(JSON.stringify(resp, null, 2))
    return
  }
  if (op === 'createEvent') {
    const summary = a.summary || 'Test Event'
    const start = a.start || new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const end = a.end || new Date(Date.now() + 70 * 60 * 1000).toISOString()
    const timezone = a.timezone || 'UTC'
    const event = {
      summary,
      start: { dateTime: start, timeZone: timezone },
      end: { dateTime: end, timeZone: timezone },
    }
    const resp = await svc.createEvent({ providerConfigKey, connectionId, calendarId, event })
    console.log(JSON.stringify(resp, null, 2))
    return
  }
  throw new Error(`unknown op: ${op}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
