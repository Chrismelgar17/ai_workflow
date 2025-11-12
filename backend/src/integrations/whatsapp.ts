import { NangoClient } from './nangoClient.js'

export type WhatsAppTextParams = {
  providerConfigKey: string
  connectionId: string
  phoneNumberId: string // WhatsApp Business phone number ID
  to: string // E.164 format, e.g., +15551234567
  body: string
  previewUrl?: boolean
  apiVersion?: string // default v20.0
  baseUrlOverride?: string // default https://graph.facebook.com
}

export type WhatsAppTemplateParams = {
  providerConfigKey: string
  connectionId: string
  phoneNumberId: string
  to: string
  template: {
    name: string
    language: { code: string }
    components?: Array<any>
  }
  apiVersion?: string
  baseUrlOverride?: string
}

export class WhatsAppService {
  private nango: NangoClient
  constructor(nango?: NangoClient) {
    this.nango = nango || new NangoClient()
  }

  private async doProxy(method: 'POST', endpoint: string, cfg: any, retries = 3): Promise<any> {
    try {
      return await this.nango.proxy(method, endpoint, cfg)
    } catch (e: any) {
      const status = e?.response?.status
      if (retries > 0 && (status === 429 || (status >= 500 && status < 600))) {
        const delay = (4 - retries) * 500
        await new Promise(r => setTimeout(r, delay))
        return this.doProxy(method, endpoint, cfg, retries - 1)
      }
      throw e
    }
  }

  async sendText(params: WhatsAppTextParams) {
    const version = params.apiVersion || 'v20.0'
    const baseUrl = params.baseUrlOverride || 'https://graph.facebook.com'
    const endpoint = `${version}/${params.phoneNumberId}/messages`
    const data = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: {
        body: params.body,
        preview_url: params.previewUrl ?? false,
      },
    }
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      data,
    })
  }

  async sendTemplate(params: WhatsAppTemplateParams) {
    const version = params.apiVersion || 'v20.0'
    const baseUrl = params.baseUrlOverride || 'https://graph.facebook.com'
    const endpoint = `${version}/${params.phoneNumberId}/messages`
    const data = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: params.template,
    }
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      data,
    })
  }

  async sendImage(params: WhatsAppTextParams & { imageUrl: string; caption?: string }) {
    const version = params.apiVersion || 'v20.0'
    const baseUrl = params.baseUrlOverride || 'https://graph.facebook.com'
    const endpoint = `${version}/${params.phoneNumberId}/messages`
    const data = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'image',
      image: { link: params.imageUrl, caption: params.caption },
    }
    return this.doProxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      data,
    })
  }
}
