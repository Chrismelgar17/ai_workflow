import axios, { AxiosRequestConfig } from 'axios'

export type NangoClientOptions = {
  baseUrl?: string // e.g., https://api.nango.dev or your self-hosted Nango URL
  secretKey?: string // Nango Secret Key (server-side)
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
