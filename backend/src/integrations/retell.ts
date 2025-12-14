export interface RetellConfig {
  apiKey: string
  baseUrl?: string // default https://api.retell.ai
}

export interface CreatePhoneCallParams {
  agentId: string
  toPhoneNumber: string
  fromPhoneNumber?: string
  metadata?: Record<string, any>
}

export interface CreateWebCallParams {
  agentId: string
  metadata?: Record<string, any>
}

export interface RetellAgent {
  id: string
  name?: string
  model?: string
  language?: string
  config?: Record<string, any>
}

export class RetellService {
  private baseUrl: string
  constructor(private cfg: RetellConfig) {
    if (!cfg?.apiKey) throw new Error('Retell apiKey is required')
    this.baseUrl = cfg.baseUrl || 'https://api.retell.ai'
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      ...init,
      headers: {
        'Authorization': `Bearer ${this.cfg.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    } as RequestInit)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Retell API ${res.status}: ${text}`)
    }
    // Some Retell endpoints may return empty bodies
    try {
      return await res.json()
    } catch {
      return undefined as unknown as T
    }
  }

  async listAgents(): Promise<RetellAgent[]> {
    return this.request<RetellAgent[]>(`/v1/agents`, { method: 'GET' })
  }

  async getAgent(agentId: string): Promise<RetellAgent> {
    return this.request<RetellAgent>(`/v1/agents/${agentId}`, { method: 'GET' })
  }

  async createAgent(agent: Partial<RetellAgent>): Promise<RetellAgent> {
    return this.request<RetellAgent>(`/v1/agents`, { method: 'POST', body: JSON.stringify(agent) })
  }

  async updateAgent(agentId: string, patch: Partial<RetellAgent>): Promise<RetellAgent> {
    return this.request<RetellAgent>(`/v1/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }

  async createPhoneCall(params: CreatePhoneCallParams): Promise<any> {
    return this.request<any>(`/v1/calls/phone`, {
      method: 'POST',
      body: JSON.stringify({
        agent_id: params.agentId,
        to: params.toPhoneNumber,
        from: params.fromPhoneNumber,
        metadata: params.metadata,
      })
    })
  }

  async createWebCall(params: CreateWebCallParams): Promise<any> {
    return this.request<any>(`/v1/calls/web`, {
      method: 'POST',
      body: JSON.stringify({
        agent_id: params.agentId,
        metadata: params.metadata,
      })
    })
  }
}
