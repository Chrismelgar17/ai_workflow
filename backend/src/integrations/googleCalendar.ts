import { NangoClient } from './nangoClient.js'

function shouldRetry(status?: number) {
  if (!status) return false
  return status >= 500 || status === 429
}

export interface GCalBaseParams {
  providerConfigKey: string
  connectionId: string
  baseUrlOverride?: string // default https://www.googleapis.com/calendar/v3
}

export class GoogleCalendarService {
  constructor(private nango: NangoClient = new NangoClient()) {}

  private async doProxy(method: 'GET'|'POST', endpoint: string, cfg: any, retries = 3): Promise<any> {
    try {
      return await this.nango.proxy(method, endpoint, cfg)
    } catch (e: any) {
      const status = e?.response?.status
      if (retries > 0 && shouldRetry(status)) {
        const delay = (4 - retries) * 500
        await new Promise(r => setTimeout(r, delay))
        return this.doProxy(method, endpoint, cfg, retries - 1)
      }
      throw e
    }
  }

  // GET https://www.googleapis.com/calendar/v3/users/me/calendarList
  async listCalendars(params: GCalBaseParams) {
    const baseUrl = params.baseUrlOverride || 'https://www.googleapis.com/calendar/v3'
    const endpoint = 'users/me/calendarList'
    return this.doProxy('GET', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
    })
  }

  // GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
  async listEvents(params: GCalBaseParams & { calendarId?: string; timeMin?: string; timeMax?: string; maxResults?: number; singleEvents?: boolean; orderBy?: string }) {
    const baseUrl = params.baseUrlOverride || 'https://www.googleapis.com/calendar/v3'
    const calendarId = encodeURIComponent(params.calendarId || 'primary')
    const endpoint = `calendars/${calendarId}/events`
    return this.doProxy('GET', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      params: {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults: params.maxResults,
        singleEvents: params.singleEvents,
        orderBy: params.orderBy,
      }
    })
  }

  // GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}
  async getEvent(params: GCalBaseParams & { calendarId?: string; eventId: string }) {
    const baseUrl = params.baseUrlOverride || 'https://www.googleapis.com/calendar/v3'
    const calendarId = encodeURIComponent(params.calendarId || 'primary')
    const eventId = encodeURIComponent(params.eventId)
    const endpoint = `calendars/${calendarId}/events/${eventId}`
    return this.doProxy('GET', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
    })
  }

  // POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
  async createEvent(params: GCalBaseParams & { calendarId?: string; event: any }) {
    const baseUrl = params.baseUrlOverride || 'https://www.googleapis.com/calendar/v3'
    const calendarId = encodeURIComponent(params.calendarId || 'primary')
    const endpoint = `calendars/${calendarId}/events`
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      headers: { 'Content-Type': 'application/json' },
      data: params.event,
    })
  }
}
