import axios, { AxiosRequestConfig } from 'axios'

export type PanoraClientOptions = {
  baseUrl?: string // e.g., https://api.panora.dev or your self-hosted Panora URL
  apiKey?: string
}

const envBase = process.env.PANORA_API_URL || ''
const envKey = process.env.PANORA_API_KEY || ''

export class PanoraClient {
  private baseUrl: string
  private apiKey: string
  constructor(opts: PanoraClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || envBase || '').replace(/\/$/, '')
    this.apiKey = opts.apiKey || envKey
  }

  private authHeaders() {
    if (!this.apiKey) throw Object.assign(new Error('Missing PANORA_API_KEY'), { status: 400 })
    // Panora commonly uses Bearer or X-API-KEY; prefer Bearer and allow overrides via headers if needed
    return { Authorization: `Bearer ${this.apiKey}` }
  }

  async unified<T = any>(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', path: string, cfg?: AxiosRequestConfig) {
    if (!this.baseUrl) throw Object.assign(new Error('Missing PANORA_API_URL'), { status: 400 })
    const url = `${this.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    const resp = await axios.request<T>({ url, method, headers: { ...this.authHeaders(), ...(cfg?.headers || {}) }, params: cfg?.params, data: cfg?.data, timeout: cfg?.timeout || 30000 })
    return resp.data
  }

  // Convenience
  listCRMContacts(params?: any) { return this.unified('GET', '/crm/contacts', { params }) }
  getCRMContact(id: string) { return this.unified('GET', `/crm/contacts/${id}`) }
  createCRMContact(data: any) { return this.unified('POST', '/crm/contacts', { data }) }

  listHRISEmployees(params?: any) { return this.unified('GET', '/hris/employees', { params }) }
  getHRISEmployee(id: string) { return this.unified('GET', `/hris/employees/${id}`) }
}
