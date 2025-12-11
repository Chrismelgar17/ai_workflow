import axios, { AxiosRequestConfig } from 'axios'

export type ProviderCredentialType = 'API_KEY' | 'BASIC' | 'OAUTH' | 'CUSTOM'

export interface ProviderCatalogEntry {
  key: string
  provider: string
  title: string
  categories: string[]
  description?: string
  docsUrl?: string
  authMode?: string
  recommendedCredentialType?: ProviderCredentialType
  tags?: string[]
}

export type NangoClientOptions = {
  baseUrl?: string // e.g., https://api.nango.dev or your self-hosted Nango URL
  secretKey?: string // Nango Secret Key (server-side)
}

export type ConnectSessionEndUser = {
  id: string
  email?: string
  display_name?: string
  tags?: Record<string, string>
}

export type ConnectSessionIntegrationDefaults = {
  user_scopes?: string
  authorization_params?: Record<string, string>
  connection_config?: Record<string, unknown> & { oauth_scopes_override?: string }
}

export type ConnectSessionOverrides = {
  docs_connect?: string
}

export type CreateConnectSessionPayload = {
  end_user: ConnectSessionEndUser
  allowed_integrations?: string[]
  integrations_config_defaults?: Record<string, ConnectSessionIntegrationDefaults>
  overrides?: Record<string, ConnectSessionOverrides>
  organization?: { id: string; display_name?: string }
}

const envBase =
  process.env.NANGO_API_BASE ||
  process.env.NANGO_API_BASE_DEV ||
  process.env.NANGO_API_BASE_PROD ||
  process.env.NANGO_HOST ||
  process.env.NANGO_HOST_DEV ||
  process.env.NANGO_HOST_PROD ||
  ''
const envKey =
  process.env.NANGO_SECRET_KEY ||
  process.env.NANGO_SECRET_KEY_DEV ||
  process.env.NANGO_SECRET_KEY_PROD ||
  ''

export class NangoClient {
  private baseUrl: string
  private secretKey: string

  constructor(opts: NangoClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || envBase || '').replace(/\/$/, '')
    this.secretKey = opts.secretKey || envKey
  }

  private authHeaders() {
    if (!this.secretKey) throw Object.assign(new Error('Missing NANGO_SECRET_KEY'), { status: 400 })
    return { Authorization: `Bearer ${this.secretKey}` }
  }

  // Generic helper to call Nango Unified API endpoints, e.g., /crm/contacts, /hris/employees
  async unified<T = any>(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', path: string, cfg?: AxiosRequestConfig) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    const resp = await axios.request<T>({ url, method, headers: { ...this.authHeaders(), ...(cfg?.headers || {}) }, params: cfg?.params, data: cfg?.data, timeout: cfg?.timeout || 30000 })
    return resp.data
  }

  // Nango Requests Proxy: forwards authenticated requests to external APIs
  // Docs: https://nango.dev/docs/reference/api/proxy/post
  async proxy<T = any>(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', endpoint: string, cfg: AxiosRequestConfig & {
    providerConfigKey: string
    connectionId: string
    baseUrlOverride?: string
  }) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/proxy/${endpoint.replace(/^\//, '')}`
    const headers: Record<string, string> = {
      ...this.authHeaders(),
      'Provider-Config-Key': cfg.providerConfigKey,
      'Connection-Id': cfg.connectionId,
      ...(cfg.baseUrlOverride ? { 'Base-Url-Override': cfg.baseUrlOverride } : {}),
    }
    const resp = await axios.request<T>({
      url,
      method,
      headers: { ...headers, ...(cfg.headers || {}) },
      params: cfg.params,
      data: cfg.data,
      timeout: cfg.timeout || 30000,
    })
    return resp.data
  }

  // Admin APIs
  // GET /connections -> list connections (no credentials)
  async listConnections<T = any>() {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/connections`
    const resp = await axios.get<T>(url, { headers: this.authHeaders(), timeout: 30000 })
    return resp.data
  }

  async listProviderConfigs<T = any>() {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/provider-configs`
    const resp = await axios.get<T>(url, { headers: this.authHeaders(), timeout: 30000 })
    return resp.data
  }

  async createConnectSession<T = any>(body: CreateConnectSessionPayload) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/connect/sessions`
    const resp = await axios.post<T>(url, body, { headers: { ...this.authHeaders(), 'Content-Type': 'application/json' }, timeout: 30000 })
    return resp.data
  }

  // GET /connections/{connectionId}
  async getConnection<T = any>(connectionId: string) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/connections/${encodeURIComponent(connectionId)}`
    const resp = await axios.get<T>(url, { headers: this.authHeaders(), timeout: 30000 })
    return resp.data
  }

  // POST /connections -> import a connection with existing credentials
  async importConnection<T = any>(body: any) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/connections`
    const resp = await axios.post<T>(url, body, { headers: { ...this.authHeaders(), 'Content-Type': 'application/json' }, timeout: 30000 })
    return resp.data
  }

  // DELETE /connections/{connectionId} (optional cleanup helper)
  async deleteConnection<T = any>(connectionId: string) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing NANGO_API_BASE or NANGO_HOST'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}/connections/${encodeURIComponent(connectionId)}`
    const resp = await axios.delete<T>(url, { headers: this.authHeaders(), timeout: 30000 })
    return resp.data
  }

  // Convenience methods for common resources (adjust paths to your Nango Unified API deployment)
  listCRMContacts(params?: any) { return this.unified('GET', '/crm/contacts', { params }) }
  getCRMContact(id: string) { return this.unified('GET', `/crm/contacts/${id}`) }
  createCRMContact(data: any) { return this.unified('POST', '/crm/contacts', { data }) }

  listHRISEmployees(params?: any) { return this.unified('GET', '/hris/employees', { params }) }
  getHRISEmployee(id: string) { return this.unified('GET', `/hris/employees/${id}`) }
}

const BASE_PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    key: 'whatsapp-business',
    provider: 'Meta',
    title: 'WhatsApp Business Cloud',
    categories: ['messaging', 'support'],
    description: 'Send conversational messages over the WhatsApp Cloud API.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    authMode: 'api_key',
    recommendedCredentialType: 'API_KEY',
    tags: ['twilio-alternative', 'meta']
  },
  {
    key: 'twilio',
    provider: 'Twilio',
    title: 'Twilio Programmable Messaging',
    categories: ['messaging'],
    description: 'SMS, MMS, and voice messaging via Twilio.',
    docsUrl: 'https://www.twilio.com/docs/messaging',
    authMode: 'basic',
    recommendedCredentialType: 'BASIC',
    tags: ['sms', 'voice']
  },
  {
    key: 'sendgrid',
    provider: 'SendGrid',
    title: 'SendGrid Email',
    categories: ['email'],
    description: 'Deliver transactional and marketing email with SendGrid.',
    docsUrl: 'https://docs.sendgrid.com',
    authMode: 'api_key',
    recommendedCredentialType: 'API_KEY',
    tags: ['email']
  },
  {
    key: 'slack',
    provider: 'Slack',
    title: 'Slack Workspace',
    categories: ['collaboration'],
    description: 'Post messages and manage channels within Slack.',
    docsUrl: 'https://api.slack.com',
    authMode: 'oauth',
    recommendedCredentialType: 'OAUTH',
    tags: ['chatops']
  },
  {
    key: 'google-calendar',
    provider: 'Google',
    title: 'Google Calendar',
    categories: ['calendar'],
    description: 'Create and manage calendar events.',
    docsUrl: 'https://developers.google.com/calendar',
    authMode: 'oauth',
    recommendedCredentialType: 'OAUTH',
    tags: ['google-workspace']
  },
  {
    key: 'hubspot',
    provider: 'HubSpot',
    title: 'HubSpot CRM',
    categories: ['crm'],
    description: 'Sync contacts, companies, and deals from HubSpot.',
    docsUrl: 'https://developers.hubspot.com',
    authMode: 'oauth',
    recommendedCredentialType: 'OAUTH',
    tags: ['sales']
  },
  {
    key: 'salesforce',
    provider: 'Salesforce',
    title: 'Salesforce CRM',
    categories: ['crm'],
    description: 'Integrate with Salesforce objects and workflows.',
    docsUrl: 'https://developer.salesforce.com',
    authMode: 'oauth',
    recommendedCredentialType: 'OAUTH',
    tags: ['enterprise']
  },
  {
    key: 'stripe',
    provider: 'Stripe',
    title: 'Stripe Payments',
    categories: ['payments'],
    description: 'Manage customers, invoices, and subscriptions with Stripe.',
    docsUrl: 'https://stripe.com/docs/api',
    authMode: 'api_key',
    recommendedCredentialType: 'API_KEY',
    tags: ['billing']
  },
  {
    key: 'retell',
    provider: 'Retell',
    title: 'Retell Voice Agents',
    categories: ['voice', 'ai'],
    description: 'Trigger AI voice calls powered by Retell.',
    docsUrl: 'https://docs.retellai.com',
    authMode: 'api_key',
    recommendedCredentialType: 'API_KEY',
    tags: ['voice', 'ai']
  }
]

function detectAuthMode(cfg: any): string | undefined {
  const raw = (cfg?.auth_mode || cfg?.authMode || cfg?.type || '').toString().toLowerCase()
  if (raw.includes('oauth')) return 'oauth'
  if (raw.includes('basic')) return 'basic'
  if (raw.includes('key')) return 'api_key'
  if (cfg?.oauth_client_id || cfg?.oauth_client_secret || cfg?.oauth_scopes) return 'oauth'
  if (cfg?.username_field || cfg?.password_field || cfg?.basic_auth) return 'basic'
  return raw || undefined
}

function detectCredentialType(cfg: any): ProviderCredentialType | undefined {
  const raw = (cfg?.credentials_type || cfg?.credential_type || cfg?.auth_mode || '').toString().toLowerCase()
  if (raw.includes('oauth')) return 'OAUTH'
  if (raw.includes('basic')) return 'BASIC'
  if (raw.includes('key') || raw.includes('token')) return 'API_KEY'
  if (cfg?.oauth_client_id || cfg?.oauth_scopes) return 'OAUTH'
  if (cfg?.username_field || cfg?.password_field) return 'BASIC'
  return undefined
}

export function composeProviderCatalog(remote: any[] = []): ProviderCatalogEntry[] {
  const map = new Map<string, ProviderCatalogEntry>()
  for (const entry of BASE_PROVIDER_CATALOG) {
    map.set(entry.key, { ...entry, categories: [...entry.categories] })
  }
  for (const item of remote || []) {
    if (!item) continue
    const key = String(item.unique_key || item.provider_config_key || item.providerConfigKey || item.key || item.provider || item.name || '').trim()
    if (!key) continue
    const existing = map.get(key)
    const authMode = detectAuthMode(item) || existing?.authMode
    const recommended = detectCredentialType(item) || existing?.recommendedCredentialType
    const categories = new Set<string>(existing?.categories || [])
    const itemCategories = Array.isArray(item.categories) ? item.categories : (item.category ? [item.category] : [])
    for (const cat of itemCategories) {
      if (cat) categories.add(String(cat))
    }
    const tags = new Set<string>(existing?.tags || [])
    if (Array.isArray(item.tags)) {
      for (const t of item.tags) { if (t) tags.add(String(t)) }
    }
    const provider = item.provider || existing?.provider || key
    const title = item.display_name || item.name || existing?.title || provider
    const description = existing?.description || item.description || ''
    const docsUrl = existing?.docsUrl || item.docs_url || item.documentation_url || item.docsUrl
    map.set(key, {
      key,
      provider,
      title,
      categories: Array.from(categories).filter(Boolean),
      description,
      docsUrl,
      authMode,
      recommendedCredentialType: recommended,
      tags: Array.from(tags)
    })
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
}

export const DEFAULT_PROVIDER_CATALOG = [...BASE_PROVIDER_CATALOG]
