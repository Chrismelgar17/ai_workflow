import { NangoClient } from './nangoClient.js'

function shouldRetry(status?: number) {
  if (!status) return false
  return status >= 500 || status === 429
}

export interface TwilioSMSParams {
  providerConfigKey: string
  connectionId: string
  from: string
  to: string
  body: string
  accountSid?: string // optional; can be encoded in provider config
  baseUrlOverride?: string // default https://api.twilio.com
}

export class TwilioService {
  constructor(private nango: NangoClient = new NangoClient()) {}

  private async doProxy(method: 'POST', endpoint: string, cfg: any, retries = 3): Promise<any> {
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

  async sendSMS(params: TwilioSMSParams) {
    if (!params.accountSid) throw new Error('accountSid required for Twilio sendSMS')
    const baseUrl = params.baseUrlOverride || 'https://api.twilio.com'
    const endpoint = `2010-04-01/Accounts/${params.accountSid}/Messages.json`
    const data = new URLSearchParams({
      From: params.from,
      To: params.to,
      Body: params.body,
    })
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data,
    })
  }

  async sendMedia(params: TwilioSMSParams & { mediaUrl: string }) {
    if (!params.accountSid) throw new Error('accountSid required for Twilio sendMedia')
    const baseUrl = params.baseUrlOverride || 'https://api.twilio.com'
    const endpoint = `2010-04-01/Accounts/${params.accountSid}/Messages.json`
    const data = new URLSearchParams({
      From: params.from,
      To: params.to,
      Body: params.body,
      MediaUrl: params.mediaUrl,
    })
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data,
    })
  }
}
