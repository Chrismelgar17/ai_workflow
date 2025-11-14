import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
}

export const apiClient = new ApiClient();
export default apiClient;
