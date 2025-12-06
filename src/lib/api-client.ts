import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Prefer explicit API base when provided so local dev can reach the backend without Next.js rewrites.
// Falls back to same-origin relative requests if NEXT_PUBLIC_API_URL is unset.
const envApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
const API_URL = envApiUrl ? envApiUrl.replace(/\/$/, '') : '';
const DEMO_MODE = (process.env.NEXT_PUBLIC_DEMO_MODE || 'false').toLowerCase() === 'true';
// Allow runtime override without rebuild: set localStorage.DEMO_MODE = 'true'
// Prefer env var NEXT_PUBLIC_DEMO_MODE; runtime localStorage overrides if set
const RUNTIME_DEMO_MODE = (() => {
  try {
    if (typeof window !== 'undefined') {
      const ls = localStorage.getItem('DEMO_MODE');
      if (ls === 'true' || ls === 'false') return ls === 'true';
    }
  } catch {}
  return DEMO_MODE;
})();

// Simple in-memory demo dataset for the UI
const demoData = {
  flows: [
    { id: 'flow_cust_onboarding', name: 'Customer Onboarding', status: 'active' },
    { id: 'flow_invoice_processing', name: 'Invoice Processing', status: 'draft' },
    { id: 'flow_lead_qualification', name: 'Lead Qualification', status: 'active' },
  ],
  connections: [
    { id: 'conn_gmail', provider: 'Gmail', category: 'email', account: 'demo@company.com', status: 'connected' },
    { id: 'conn_slack', provider: 'Slack', category: 'chat', account: 'workspace/demo', status: 'connected' },
    { id: 'conn_salesforce', provider: 'Salesforce', category: 'crm', account: 'sandbox', status: 'connected' },
  ],
  analytics: {
    total_runs: 1280,
    monthly_runs: 320,
    success_rate: 97,
    monthly_cost: 42.73,
  },
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async register(data: { email: string; password: string; name: string; tenant_name: string }) {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    return response.data;
  }

  // Templates
  async getTemplates() {
    const response = await this.client.get('/api/templates');
    return response.data;
  }

  async getTemplate(id: string) {
    const response = await this.client.get(`/api/templates/${id}`);
    return response.data;
  }

  async createTemplate(data: any) {
    const response = await this.client.post('/api/templates', data);
    return response.data;
  }

  // Flows
  async getFlows() {
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoData.flows);
    try {
      const response = await this.client.get('/api/flows');
      return response.data;
    } catch (e) {
      // Fallback to demo if backend is down
      return demoData.flows;
    }
  }

  async getFlow(id: string) {
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoData.flows.find((f) => f.id === id));
    const response = await this.client.get(`/api/flows/${id}`);
    return response.data;
  }

  async createFlow(data: any) {
    if (RUNTIME_DEMO_MODE) {
      const created = { id: `flow_${Date.now()}`, status: 'draft', ...data };
      demoData.flows.push(created);
      return Promise.resolve(created);
    }
    const response = await this.client.post('/api/flows', data);
    return response.data;
  }

  async updateFlow(id: string, data: any) {
    if (RUNTIME_DEMO_MODE) {
      const idx = demoData.flows.findIndex((f) => f.id === id);
      if (idx >= 0) demoData.flows[idx] = { ...demoData.flows[idx], ...data };
      return Promise.resolve(demoData.flows[idx]);
    }
    const response = await this.client.put(`/api/flows/${id}`, data);
    return response.data;
  }

  async deleteFlow(id: string) {
    if (RUNTIME_DEMO_MODE) {
      const idx = demoData.flows.findIndex((f) => f.id === id);
      if (idx >= 0) demoData.flows.splice(idx, 1);
      return Promise.resolve({ ok: true });
    }
    const response = await this.client.delete(`/api/flows/${id}`);
    return response.data;
  }

  async deployFlow(id: string) {
    if (RUNTIME_DEMO_MODE) {
      const f = demoData.flows.find((x) => x.id === id);
      if (f) f.status = 'active';
      return Promise.resolve({ ok: true, id, status: 'active' });
    }
    const response = await this.client.post(`/api/flows/${id}/deploy`);
    return response.data;
  }

  async runFlow(id: string, body: { steps: any[]; connections: any[] }) {
    const response = await this.client.post(`/api/flows/${id}/run`, body);
    return response.data as { ok: boolean; flowId: string; registered: { triggers: any[]; schedules: any[] }; counts: { triggers: number; schedules: number } };
  }

  // Executions
  async getExecutions(flowId?: string) {
    const url = flowId ? `/api/flows/${flowId}/executions` : '/api/executions';
    const response = await this.client.get(url);
    return response.data;
  }

  async getExecution(id: string) {
    const response = await this.client.get(`/api/executions/${id}`);
    return response.data;
  }

  // Secrets
  async getSecrets() {
    const response = await this.client.get('/api/secrets');
    return response.data;
  }

  async createSecret(name: string, value: string, expiresAt?: string) {
    const response = await this.client.post('/api/secrets', { name, value, expires_at: expiresAt });
    return response.data;
  }

  async deleteSecret(name: string) {
    const response = await this.client.delete(`/api/secrets/${name}`);
    return response.data;
  }

  // Analytics
  async getAnalytics() {
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoData.analytics);
    try {
      const response = await this.client.get('/api/analytics/overview');
      return response.data;
    } catch (e) {
      return demoData.analytics;
    }
  }

  // Integrations
  async getConnections() {
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoData.connections);
    try {
      const response = await this.client.get('/api/integrations/connections');
      return response.data;
    } catch (e) {
      return demoData.connections;
    }
  }

  async getDefaultSenders() {
    const response = await this.client.get('/api/integrations/default-senders');
    return response.data as { messagingSender: string; smsSender: string; emailSender: string };
  }

  async getConnection(provider: string) {
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoData.connections.find((c) => c.provider === provider));
    const response = await this.client.get(`/api/integrations/connections/${provider}`);
    return response.data;
  }

  async initiateConnection(provider: string, category: string) {
    if (RUNTIME_DEMO_MODE) {
      const created = { id: `conn_${Date.now()}`, provider, category, status: 'connected' } as any;
      demoData.connections.push(created);
      return Promise.resolve(created);
    }
    const response = await this.client.post('/api/integrations/connect', { provider, category });
    return response.data;
  }

  async deleteConnection(connectionId: string) {
    if (RUNTIME_DEMO_MODE) {
      const idx = demoData.connections.findIndex((c) => c.id === connectionId);
      if (idx >= 0) demoData.connections.splice(idx, 1);
      return Promise.resolve({ ok: true });
    }
    const response = await this.client.delete(`/api/integrations/connections/${connectionId}`);
    return response.data;
  }

  async getProviders(category: string) {
    const response = await this.client.get(`/api/integrations/providers/${category}`);
    return response.data;
  }

  // Nango Connections (server-side proxy endpoints)
  async getNangoConnections() {
    const response = await this.client.get('/api/nango/connections');
    return response.data;
  }
  async getNangoConnection(connectionId: string) {
    const response = await this.client.get(`/api/nango/connections/${connectionId}`);
    return response.data;
  }
  async importNangoConnection(body: { provider_config_key: string; connection_id: string; credentials: any }) {
    const response = await this.client.post('/api/nango/connections/import', body);
    return response.data;
  }
  async deleteNangoConnection(connectionId: string) {
    const response = await this.client.delete(`/api/nango/connections/${connectionId}`);
    return response.data;
  }

  // Unified integration actions
  async unifiedAction(payload: { provider: 'nango' | 'panora'; resource: string; operation: string; data?: any; id?: string; params?: any }) {
    const response = await this.client.post('/api/integrations/unified', payload);
    return response.data;
  }

  // Audit Log
  async getAuditLog(params?: { limit?: number; offset?: number }) {
    const response = await this.client.get('/api/audit', { params });
    return response.data;
  }

  // LLM Completion (non-streaming)
  async llmComplete(body: { prompt: string; model?: string; temperature?: number; maxTokens?: number; system?: string; provider?: string; useCache?: boolean }) {
    const response = await this.client.post('/api/llm/complete', body);
    return response.data as { content: string; model: string; created: number; usage?: any };
  }

  // LLM Stream: returns full content after stream ends; accepts onDelta callback for incremental updates.
  async llmStream(params: { prompt: string; model?: string; temperature?: number; maxTokens?: number; system?: string; provider?: string }, onDelta: (delta: string) => void, signal?: AbortSignal): Promise<{ content: string }> {
    const q = new URLSearchParams();
    q.set('prompt', params.prompt);
    if (params.model) q.set('model', params.model);
    if (params.temperature !== undefined) q.set('temperature', String(params.temperature));
    if (params.maxTokens !== undefined) q.set('maxTokens', String(params.maxTokens));
    if (params.system) q.set('system', params.system);
    if (params.provider) q.set('provider', params.provider);
    const token = (typeof window !== 'undefined') ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`/api/llm/stream?${q.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Stream request failed: ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      // Keep last partial piece in buffer
      buffer = parts.pop() || '';
      for (const chunk of parts) {
        const line = chunk.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.substring(5).trim();
        if (!jsonStr) continue;
        try {
          const payload = JSON.parse(jsonStr);
          if (payload.delta) {
            onDelta(payload.delta);
            full += payload.delta;
          }
          if (payload.done && payload.content) {
            full = payload.content;
          }
          if (payload.error) {
            throw new Error(payload.error);
          }
        } catch (e) {
          // swallow parse errors
        }
      }
    }
    return { content: full };
  }

  // Users (always call backend regardless of demo mode)
  async getUsers() {
    const response = await this.client.get('/api/users');
    return response.data as Array<{ id: string; email: string; name?: string; tenant_name?: string }>;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/api/users/${id}`);
    return response.data as { id: string; email: string; name?: string; tenant_name?: string };
  }

  async createUser(data: { email: string; password: string; name?: string; tenant_name?: string }) {
    const response = await this.client.post('/api/users', data);
    return response.data as { id: string; email: string; name?: string; tenant_name?: string };
  }

  async updateUser(id: string, data: Partial<{ email: string; password: string; name: string; tenant_name: string }>) {
    const response = await this.client.put(`/api/users/${id}`, data);
    return response.data as { id: string; email: string; name?: string; tenant_name?: string };
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/api/users/${id}`);
    return response.data as { ok: boolean };
  }

  // Agent configuration (UI-facing): get/save agent settings
  async getAgents() {
    const demoAgents = [
      { id: 'agent_demo', name: 'GPT5 Demo Agent', owner: 'Amy', status: 'paused', totalActivity: 2, successRate: '50%', avgDuration: '2:26' },
      { id: 'agent_olivia_inbound', name: 'Lead Manager - Olivia (Active)', owner: 'Olivia', status: 'active', totalActivity: 56, successRate: '18%', avgDuration: '0:20' },
      { id: 'agent_outbound_warm', name: 'OUTBOUND WARM AGENT', owner: 'Jane', status: 'paused', totalActivity: 22, successRate: '9%', avgDuration: '0:30' },
    ];
    if (RUNTIME_DEMO_MODE) return Promise.resolve(demoAgents);
    try {
      const response = await this.client.get('/api/agents');
      return response.data;
    } catch (e) {
      // Fallback to demo list when backend is unavailable
      return demoAgents;
    }
  }

  async getAgentConfig(agentId: string) {
    if (RUNTIME_DEMO_MODE) {
      return Promise.resolve({
        id: agentId,
        model: 'gpt-4o-mini',
        language: 'en-US',
        voice: 'alloy',
        prompt: 'Explain the difference between caching and rate limiting in one paragraph.',
      })
    }
    try {
      const response = await this.client.get(`/api/agents/${agentId}`)
      return response.data
    } catch (e) {
      // Fallback to demo config if backend is unavailable or returns an error
      return { id: agentId, model: 'gpt-4o-mini', language: 'en-US', voice: 'alloy', prompt: 'Explain the difference between caching and rate limiting in one paragraph.' }
    }
  }

  async saveAgentConfig(agentId: string, config: any) {
    if (RUNTIME_DEMO_MODE) {
      return Promise.resolve({ ok: true, id: agentId, ...config })
    }
    try {
      const response = await this.client.put(`/api/agents/${agentId}`, config)
      return response.data
    } catch (e) {
      // On failure, return a demo-like response so the UI remains usable
      return { ok: false, id: agentId, ...config }
    }
  }

  async previewAgent(body: { channel: 'sms' | 'whatsapp' | 'email'; flowId?: string; nodeId?: string; step: any }) {
    const demoSample = body.channel === 'email'
      ? {
          subject: 'Demo Preview Subject',
          body: 'Hello there! This is a demo preview message generated in offline mode. Customize your agent prompt to see tailored content here.',
          agentLanguage: body.step?.config?.agentLanguage || 'en-US',
          agentModel: body.step?.config?.agentModel || 'gpt-4o-mini',
          agentProvider: body.step?.config?.agentProvider || 'openai',
        }
      : {
          body: 'Hi! This is a demo preview response. Connect a real agent or backend to generate live content.',
          agentLanguage: body.step?.config?.agentLanguage || 'en-US',
          agentModel: body.step?.config?.agentModel || 'gpt-4o-mini',
          agentProvider: body.step?.config?.agentProvider || 'openai',
        }

    try {
      const response = await this.client.post('/api/agents/preview', body)
      return response.data as { body: string; subject?: string; agentLanguage?: string; agentModel?: string; agentProvider?: string }
    } catch (error) {
      if (RUNTIME_DEMO_MODE) {
        return demoSample
      }
      throw error
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
