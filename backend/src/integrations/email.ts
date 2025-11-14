import { NangoClient } from './nangoClient.js'

export class EmailService {
  private client: NangoClient
  constructor(client: NangoClient) {
    this.client = client
  }

  // Send email via Microsoft Graph using Nango proxy
  // Requires providerConfigKey, connectionId
  async sendOutlook(params: {
    providerConfigKey: string
    connectionId: string
    to: string
    subject: string
    body: string
    contentType?: 'Text' | 'HTML'
  }) {
    const { providerConfigKey, connectionId, to, subject, body, contentType } = params
    const payload = {
      message: {
        subject: subject || '',
        body: {
          contentType: contentType || 'Text',
          content: body || ''
        },
        toRecipients: [
          { emailAddress: { address: to } }
        ],
      },
      saveToSentItems: true,
    }
    return this.client.proxy('POST', 'https://graph.microsoft.com/v1.0/me/sendMail', {
      providerConfigKey,
      connectionId,
      data: payload,
    })
  }

  // Send email via Twilio SendGrid using Nango proxy
  // Requires providerConfigKey, connectionId
  async sendSendgrid(params: {
    providerConfigKey: string
    connectionId: string
    from: string
    to: string
    subject: string
    body: string
    contentType?: 'text/plain' | 'text/html'
  }) {
    const { providerConfigKey, connectionId, from, to, subject, body, contentType } = params
    const payload = {
      personalizations: [
        { to: [{ email: to }] }
      ],
      from: { email: from },
      subject: subject || '',
      content: [
        { type: contentType || 'text/plain', value: body || '' }
      ]
    }
    return this.client.proxy('POST', 'https://api.sendgrid.com/v3/mail/send', {
      providerConfigKey,
      connectionId,
      data: payload,
    })
  }
}
