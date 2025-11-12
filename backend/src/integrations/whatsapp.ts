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
    return this.nango.proxy('POST', endpoint, {
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
    return this.nango.proxy('POST', endpoint, {
      providerConfigKey: params.providerConfigKey,
      connectionId: params.connectionId,
      baseUrlOverride: baseUrl,
      data,
    })
  }
}
