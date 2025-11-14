import { NangoClient } from './nangoClient.js'
import { WhatsAppService } from './whatsapp.js'
import { PanoraClient } from './panoraClient.js'
import { TwilioService } from './twilio.js'
import { GoogleCalendarService } from './googleCalendar.js'
import { EmailService } from './email.js'

// Input payload contract for unifiedAction
// provider: which aggregator to use ('nango' | 'panora')
// resource: high-level domain (e.g. 'crm.contact', 'hr.employee')
// operation: list|get|create|update|delete (only list/get/create implemented now)
// id: optional identifier for get
// data: payload for create/update
export interface UnifiedActionInput {
  provider: 'nango' | 'panora'
  resource: string
  operation: 'list' | 'get' | 'create' | 'update' | 'delete'
  id?: string
  data?: any
  params?: any
}

export async function unifiedAction(input: UnifiedActionInput) {
  const { provider, resource, operation, id, data, params } = input
  if (!provider) throw Object.assign(new Error('provider required'), { status: 400 })
  if (!resource) throw Object.assign(new Error('resource required'), { status: 400 })
  if (!operation) throw Object.assign(new Error('operation required'), { status: 400 })

  // Map resource string to domain + entity
  // Pattern: domain.entity -> domain: crm|hr, entity: contact|employee etc.
  const [domain, entity] = resource.split('.')
  if (!domain || !entity) throw Object.assign(new Error('resource must be domain.entity'), { status: 400 })

  switch (provider) {
    case 'nango':
      return handleNango(domain, entity, operation, { id, data, params })
    case 'panora':
      return handlePanora(domain, entity, operation, { id, data, params })
    default:
      throw Object.assign(new Error('unsupported provider'), { status: 400 })
  }
}

async function handleNango(domain: string, entity: string, op: string, ctx: { id?: string; data?: any; params?: any }) {
  const client = new NangoClient()
  // WhatsApp Business via Nango Proxy
  if (domain === 'whatsapp' && entity === 'message') {
    if (op !== 'create') throw Object.assign(new Error('unsupported op for whatsapp.message'), { status: 400 })
    const svc = new WhatsAppService(client)
    const d = ctx.data || {}
    const required = ['providerConfigKey', 'connectionId', 'phoneNumberId']
    for (const k of required) if (!d[k]) throw Object.assign(new Error(`${k} required`), { status: 400 })
    if (d.type === 'image' && d.imageUrl) {
      if (!d.to) throw Object.assign(new Error('to required for whatsapp image'), { status: 400 })
      return svc.sendImage({
        providerConfigKey: d.providerConfigKey,
        connectionId: d.connectionId,
        phoneNumberId: d.phoneNumberId,
        to: d.to,
        body: d.caption || '',
        imageUrl: d.imageUrl,
        caption: d.caption,
        apiVersion: d.apiVersion,
        baseUrlOverride: d.baseUrlOverride,
      })
    }
    if (d.type === 'template') {
      if (!d.template || !d.template.name || !d.template.language?.code) {
        throw Object.assign(new Error('template with name & language.code required'), { status: 400 })
      }
      return svc.sendTemplate({
        providerConfigKey: d.providerConfigKey,
        connectionId: d.connectionId,
        phoneNumberId: d.phoneNumberId,
        to: d.to,
        template: d.template,
        apiVersion: d.apiVersion,
        baseUrlOverride: d.baseUrlOverride,
      })
    }
    // default to text
    if (!d.to || !d.body) throw Object.assign(new Error('to and body required for whatsapp text'), { status: 400 })
    return svc.sendText({
      providerConfigKey: d.providerConfigKey,
      connectionId: d.connectionId,
      phoneNumberId: d.phoneNumberId,
      to: d.to,
      body: d.body,
      previewUrl: d.previewUrl,
      apiVersion: d.apiVersion,
      baseUrlOverride: d.baseUrlOverride,
    })
  }
  // Twilio SMS via Nango Proxy
  if (domain === 'twilio' && entity === 'sms') {
    if (op !== 'create') throw Object.assign(new Error('unsupported op for twilio.sms'), { status: 400 })
    const d = ctx.data || {}
    const required = ['providerConfigKey', 'connectionId', 'from', 'to', 'body']
    for (const k of required) if (!d[k]) throw Object.assign(new Error(`${k} required`), { status: 400 })
    const twilio = new TwilioService(new NangoClient())
    if (d.mediaUrl) {
      return twilio.sendMedia({
        providerConfigKey: d.providerConfigKey,
        connectionId: d.connectionId,
        from: d.from,
        to: d.to,
        body: d.body,
        accountSid: d.accountSid,
        mediaUrl: d.mediaUrl,
      })
    }
    return twilio.sendSMS({
      providerConfigKey: d.providerConfigKey,
      connectionId: d.connectionId,
      from: d.from,
      to: d.to,
      body: d.body,
      accountSid: d.accountSid,
    })
  }
  // Google Calendar via Nango Proxy
  if (domain === 'gcal' && (entity === 'event' || entity === 'calendar')) {
    const svc = new GoogleCalendarService(new NangoClient())
    const d = ctx.data || {}
    if (entity === 'calendar') {
      if (op !== 'list') throw Object.assign(new Error('unsupported op for gcal.calendar'), { status: 400 })
      const required = ['providerConfigKey', 'connectionId']
      for (const k of required) if (!d[k]) throw Object.assign(new Error(`${k} required`), { status: 400 })
      return svc.listCalendars({ providerConfigKey: d.providerConfigKey, connectionId: d.connectionId, baseUrlOverride: d.baseUrlOverride })
    }
    if (entity === 'event') {
      const requiredBase = ['providerConfigKey', 'connectionId']
      for (const k of requiredBase) if (!d[k]) throw Object.assign(new Error(`${k} required`), { status: 400 })
      switch (op) {
        case 'list':
          return svc.listEvents({
            providerConfigKey: d.providerConfigKey,
            connectionId: d.connectionId,
            calendarId: d.calendarId,
            timeMin: d.timeMin,
            timeMax: d.timeMax,
            maxResults: d.maxResults,
            singleEvents: d.singleEvents,
            orderBy: d.orderBy,
            baseUrlOverride: d.baseUrlOverride,
          })
        case 'get':
          if (!ctx.id) throw Object.assign(new Error('id (eventId) required'), { status: 400 })
          return svc.getEvent({ providerConfigKey: d.providerConfigKey, connectionId: d.connectionId, calendarId: d.calendarId, eventId: ctx.id, baseUrlOverride: d.baseUrlOverride })
        case 'create':
          if (!d.event) throw Object.assign(new Error('event body required'), { status: 400 })
          return svc.createEvent({ providerConfigKey: d.providerConfigKey, connectionId: d.connectionId, calendarId: d.calendarId, event: d.event, baseUrlOverride: d.baseUrlOverride })
      }
    }
  }
  // Email via Nango Proxy (SendGrid or Outlook)
  if (domain === 'email' && entity === 'message') {
    if (op !== 'create') throw Object.assign(new Error('unsupported op for email.message'), { status: 400 })
    const d = ctx.data || {}
    const required = ['providerConfigKey', 'connectionId', 'to', 'body']
    for (const k of required) if (!d[k]) throw Object.assign(new Error(`${k} required`), { status: 400 })
    const svc = new EmailService(new NangoClient())
    // Prefer SendGrid when providerConfigKey hints at it, else Outlook Graph
    const key = String(d.providerConfigKey || '').toLowerCase()
    if (key.includes('sendgrid')) {
      if (!d.from) throw Object.assign(new Error('from required for sendgrid'), { status: 400 })
      return svc.sendSendgrid({
        providerConfigKey: d.providerConfigKey,
        connectionId: d.connectionId,
        from: d.from,
        to: d.to,
        subject: d.subject || '',
        body: d.body,
        contentType: (d.contentType?.toLowerCase?.() === 'text/html') ? 'text/html' : 'text/plain',
      })
    }
    // Default to Outlook Graph
    return svc.sendOutlook({
      providerConfigKey: d.providerConfigKey,
      connectionId: d.connectionId,
      to: d.to,
      subject: d.subject || '',
      body: d.body,
      contentType: d.contentType || 'Text',
    })
  }
  if (domain === 'crm' && entity === 'contact') {
    switch (op) {
      case 'list': return client.listCRMContacts(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getCRMContact(ctx.id)
      case 'create': return client.createCRMContact(ctx.data)
    }
  }
  if (domain === 'hr' && entity === 'employee') {
    switch (op) {
      case 'list': return client.listHRISEmployees(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getHRISEmployee(ctx.id)
    }
  }
  throw Object.assign(new Error('unsupported resource for nango'), { status: 400 })
}

async function handlePanora(domain: string, entity: string, op: string, ctx: { id?: string; data?: any; params?: any }) {
  const client = new PanoraClient()
  if (domain === 'crm' && entity === 'contact') {
    switch (op) {
      case 'list': return client.listCRMContacts(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getCRMContact(ctx.id)
      case 'create': return client.createCRMContact(ctx.data)
    }
  }
  if (domain === 'hr' && entity === 'employee') {
    switch (op) {
      case 'list': return client.listHRISEmployees(ctx.params)
      case 'get': if (!ctx.id) throw Object.assign(new Error('id required'), { status: 400 }); return client.getHRISEmployee(ctx.id)
    }
  }
  throw Object.assign(new Error('unsupported resource for panora'), { status: 400 })
}
