import axios, { AxiosRequestConfig } from 'axios'

export type NangoClientOptions = {
  baseUrl?: string // e.g., https://api.nango.dev or your self-hosted Nango URL
  secretKey?: string // Nango Secret Key (server-side)
}

const envBase = process.env.NANGO_API_BASE || process.env.NANGO_HOST || ''
const envKey = process.env.NANGO_SECRET_KEY || ''

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

  // Convenience methods for common resources (adjust paths to your Nango Unified API deployment)
  listCRMContacts(params?: any) { return this.unified('GET', '/crm/contacts', { params }) }
  getCRMContact(id: string) { return this.unified('GET', `/crm/contacts/${id}`) }
  createCRMContact(data: any) { return this.unified('POST', '/crm/contacts', { data }) }

  listHRISEmployees(params?: any) { return this.unified('GET', '/hris/employees', { params }) }
  getHRISEmployee(id: string) { return this.unified('GET', `/hris/employees/${id}`) }
}
