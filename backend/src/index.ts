import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { v4 as uuid } from 'uuid'
import swaggerUi from 'swagger-ui-express'
import { getSupabase, USE_SUPABASE } from './db/supabase.js'
import { requireAuth } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 5000
const ORIGIN = process.env.CORS_ORIGIN || '*'

app.use(cors({ origin: ORIGIN }))
app.use(express.json())
app.use(morgan('dev'))

// Minimal OpenAPI spec for our routes (expand as needed)
const openapi: any = {
  openapi: '3.0.0',
  info: { title: 'Workflow Backend', version: '0.1.0' },
  servers: [{ url: `http://localhost:${PORT}` }],
  paths: {
    '/api/health': { get: { summary: 'Health', responses: { '200': { description: 'ok' } } } },
    '/api/auth/register': { post: { summary: 'Register', responses: { '200': { description: 'ok' } } } },
    '/api/auth/login': { post: { summary: 'Login', responses: { '200': { description: 'ok' } } } },
    '/api/users': {
      get: { summary: 'List users', responses: { '200': { description: 'ok' } } },
      post: { summary: 'Create user', responses: { '200': { description: 'ok' } } }
    },
    '/api/users/{id}': {
      get: { summary: 'Get user', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } },
      put: { summary: 'Update user', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } },
      delete: { summary: 'Delete user', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } }
    },
    '/api/templates': {
      get: { summary: 'List templates', responses: { '200': { description: 'ok' } } },
      post: { summary: 'Create template', responses: { '200': { description: 'ok' } } }
    },
    '/api/templates/{id}': { get: { summary: 'Get template', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/flows': {
      get: { summary: 'List flows', responses: { '200': { description: 'ok' } } },
      post: { summary: 'Create flow', responses: { '200': { description: 'ok' } } }
    },
    '/api/flows/{id}': {
      get: { summary: 'Get flow', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } },
      put: { summary: 'Update flow', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } },
      delete: { summary: 'Delete flow', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } }
    },
    '/api/flows/{id}/deploy': { post: { summary: 'Deploy flow', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/executions': { get: { summary: 'List executions', responses: { '200': { description: 'ok' } } } },
    '/api/flows/{flowId}/executions': { get: { summary: 'List executions by flow', parameters: [{ name: 'flowId', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/executions/{id}': { get: { summary: 'Get execution', parameters: [{ name: 'id', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/secrets': { get: { summary: 'List secrets', responses: { '200': { description: 'ok' } } }, post: { summary: 'Create secret', responses: { '200': { description: 'ok' } } } },
    '/api/secrets/{name}': { delete: { summary: 'Delete secret', parameters: [{ name: 'name', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/analytics/overview': { get: { summary: 'Analytics overview', responses: { '200': { description: 'ok' } } } },
  '/api/integrations/connections': { get: { summary: 'List connections', responses: { '200': { description: 'ok' } } } },
  '/api/integrations/connect': { post: { summary: 'Create connection', responses: { '200': { description: 'ok' } } } },
    '/api/integrations/connections/{provider}': { get: { summary: 'Get connection', parameters: [{ name: 'provider', in: 'path' }], responses: { '200': { description: 'ok' } } } },
  '/api/integrations/connections/{connectionId}': { delete: { summary: 'Delete connection', parameters: [{ name: 'connectionId', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/integrations/providers/{category}': { get: { summary: 'Providers by category', parameters: [{ name: 'category', in: 'path' }], responses: { '200': { description: 'ok' } } } },
    '/api/oauth2/authorize': { get: { summary: 'OAuth2 authorize (mock)', responses: { '302': { description: 'redirect' } } } },
    '/api/oauth2/token': { post: { summary: 'OAuth2 token (mock)', responses: { '200': { description: 'ok' } } } },
    '/api/audit': { get: { summary: 'Audit log', responses: { '200': { description: 'ok' } } } },
    '/api/integrations/unified': { post: { summary: 'Unified integration action (Nango/Panora)', responses: { '200': { description: 'ok' } } } }
  }
}

app.get('/api/openapi.json', (_req, res) => res.json(openapi))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

// In-memory stores
type Flow = { id: string; name: string; status: 'draft' | 'active' }
const db = {
  users: [] as Array<{ id: string; email: string; password: string; name: string; tenant_name?: string }>,
  templates: [
    { id: 'tpl_welcome', name: 'Welcome Email', description: 'Send a welcome email' },
    { id: 'tpl_invoice', name: 'Invoice Generator', description: 'Generate invoices' }
  ],
  flows: [
    { id: 'flow_cust_onboarding', name: 'Customer Onboarding', status: 'active' as const },
    { id: 'flow_invoice_processing', name: 'Invoice Processing', status: 'draft' as const },
    { id: 'flow_lead_qualification', name: 'Lead Qualification', status: 'active' as const }
  ],
  connections: [
    { id: 'conn_gmail', provider: 'Gmail', category: 'email', account: 'demo@company.com', status: 'connected' },
    { id: 'conn_slack', provider: 'Slack', category: 'chat', account: 'workspace/demo', status: 'connected' },
    { id: 'conn_salesforce', provider: 'Salesforce', category: 'crm', account: 'sandbox', status: 'connected' },
  ],
  secrets: [] as Array<{ name: string; value: string; expires_at?: string }>,
  executions: [] as Array<{ id: string; flowId: string; status: 'success' | 'failed'; started_at: string }>,
  audit: [] as Array<{ id: string; actor: string; action: string; at: string }>,
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'workflow-backend', time: new Date().toISOString() })
})

// Auth (simple mock, no real hashing)
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, tenant_name } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'user exists' })
  const user = { id: uuid(), email, password, name, tenant_name }
  db.users.push(user)
  res.json({ user: { id: user.id, email, name }, token: 'mock-jwt-token' })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const user = db.users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'invalid credentials' })
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token: 'mock-jwt-token' })
})

// Users CRUD (admin-style; password returned only when explicitly set on create/update)
app.get('/api/users', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('users').select('id,email,name,tenant_name').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  const users = db.users.map(({ password, ...u }) => u)
  res.json(users)
})

app.get('/api/users/:id', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('users')
      .select('id,email,name,tenant_name')
      .eq('id', req.params.id)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json(data)
  }
  const u = db.users.find(x => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'not found' })
  const { password, ...safe } = u
  res.json(safe)
})

app.post('/api/users', requireAuth, async (req, res) => {
  const { email, password, name, tenant_name } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    // Create Supabase Auth user first (so they can actually log in)
    let createdAuthId: string | undefined
    try {
      const { data: created, error: authErr } = await (supabase as any).auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, tenant_name }
      })
      if (authErr && !String(authErr.message || '').toLowerCase().includes('already registered')) {
        return res.status(409).json({ error: authErr.message || 'auth user exists' })
      }
      createdAuthId = created?.user?.id
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (!msg.toLowerCase().includes('already registered')) return res.status(500).json({ error: msg })
    }

    // Insert into app users table (fallback if auth_user_id column doesn't exist)
    let createdRow: any | null = null
    let insertErr: any | null = null
    {
      const { data, error } = await supabase
        .from('users')
        .insert({ email, password, name, tenant_name, auth_user_id: createdAuthId } as any)
        .select('id,email,name,tenant_name')
        .maybeSingle()
      createdRow = data
      insertErr = error
    }
    if (insertErr && String(insertErr.message || '').toLowerCase().includes('auth_user_id')) {
      const { data, error } = await supabase
        .from('users')
        .insert({ email, password, name, tenant_name } as any)
        .select('id,email,name,tenant_name')
        .maybeSingle()
      createdRow = data
      insertErr = error
    }
    if (insertErr) {
      if ((insertErr as any).code === '23505') return res.status(409).json({ error: 'user exists' })
      return res.status(500).json({ error: insertErr.message })
    }
    return res.json(createdRow)
  }
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'user exists' })
  const user = { id: uuid(), email, password, name, tenant_name }
  db.users.push(user)
  const { password: _pw, ...safe } = user
  res.json(safe)
})

app.put('/api/users/:id', requireAuth, async (req, res) => {
  const incoming = req.body || {}
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    // Fetch current to get auth_user_id
    let current: any = null
    {
      const { data, error } = await supabase
        .from('users')
        .select('id,email,auth_user_id')
        .eq('id', req.params.id)
        .maybeSingle()
      if (error && String(error.message || '').toLowerCase().includes('auth_user_id')) {
        const fallback = await supabase
          .from('users')
          .select('id,email')
          .eq('id', req.params.id)
          .maybeSingle()
        if (fallback.error) return res.status(500).json({ error: fallback.error.message })
        current = fallback.data
      } else if (error) {
        return res.status(500).json({ error: error.message })
      } else {
        current = data
      }
    }
    if (!current) return res.status(404).json({ error: 'not found' })

    // Sync Supabase Auth if needed
    try {
      const admin = (supabase as any).auth.admin
      const updates: any = {}
      if (incoming.password) updates.password = incoming.password
      if (incoming.email && incoming.email !== current.email) {
        updates.email = incoming.email
        updates.email_confirm = true
      }
      if (current.auth_user_id && Object.keys(updates).length > 0) {
        const { error: updErr } = await admin.updateUserById(current.auth_user_id, updates)
        if (updErr) {
          const msg = String(updErr.message || 'auth update failed')
          if (msg.toLowerCase().includes('already')) return res.status(409).json({ error: msg })
          return res.status(400).json({ error: msg })
        }
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      return res.status(400).json({ error: msg })
    }

    const { data, error } = await supabase
      .from('users')
      .update(incoming)
      .eq('id', req.params.id)
      .select('id,email,name,tenant_name')
      .maybeSingle()
    if (error) {
      if ((error as any).code === '23505') return res.status(409).json({ error: 'email already in use' })
      return res.status(400).json({ error: error.message })
    }
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json(data)
  }
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  if (incoming.email) {
    const conflict = db.users.find(u => u.email === incoming.email && u.id !== req.params.id)
    if (conflict) return res.status(409).json({ error: 'email already in use' })
  }
  db.users[idx] = { ...db.users[idx], ...incoming }
  const { password, ...safe } = db.users[idx]
  res.json(safe)
})

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    // fetch auth_user_id
    let current: any = null
    {
      const { data, error } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', req.params.id)
        .maybeSingle()
      if (error && String(error.message || '').toLowerCase().includes('auth_user_id')) {
        const fallback = await supabase
          .from('users')
          .select('id')
          .eq('id', req.params.id)
          .maybeSingle()
        if (fallback.error) return res.status(500).json({ error: fallback.error.message })
        current = fallback.data
      } else if (error) {
        return res.status(500).json({ error: error.message })
      } else {
        current = data
      }
    }
    if (!current) return res.status(404).json({ error: 'not found' })
    try {
      if (current.auth_user_id) {
        const { error: delErr } = await (supabase as any).auth.admin.deleteUser(current.auth_user_id)
        if (delErr) return res.status(500).json({ error: delErr.message })
      }
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) })
    }
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  db.users.splice(idx, 1)
  res.json({ ok: true })
})

// Templates
app.get('/api/templates', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('templates').select('id,name,description').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  res.json(db.templates)
})
app.get('/api/templates/:id', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('templates').select('id,name,description').eq('id', req.params.id).maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json(data)
  }
  const t = db.templates.find(x => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'not found' })
  res.json(t)
})
app.post('/api/templates', requireAuth, async (req, res) => {
  const body = req.body || {}
  const tpl = { id: body.id || `tpl_${uuid()}`, name: body.name || 'New Template', description: body.description }
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('templates').insert(tpl).select('id,name,description').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  db.templates.push(tpl as any)
  res.json(tpl)
})

// Flows
app.get('/api/flows', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('flows').select('id,name,status').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  res.json(db.flows)
})
app.get('/api/flows/:id', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('flows').select('id,name,status').eq('id', req.params.id).maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json(data)
  }
  const f = db.flows.find(x => x.id === req.params.id)
  if (!f) return res.status(404).json({ error: 'not found' })
  res.json(f)
})
app.post('/api/flows', requireAuth, async (req, res) => {
  const body = req.body || {}
  const f: Flow = { id: body.id || `flow_${uuid()}`, name: body.name || 'New Flow', status: body.status || 'draft' }
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('flows').insert(f).select('id,name,status').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  db.flows.push(f)
  res.json(f)
})
app.put('/api/flows/:id', requireAuth, async (req, res) => {
  const incoming = req.body || {}
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('flows').update(incoming).eq('id', req.params.id).select('id,name,status').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json(data)
  }
  const idx = db.flows.findIndex(x => x.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  db.flows[idx] = { ...db.flows[idx], ...(incoming) }
  res.json(db.flows[idx])
})
app.delete('/api/flows/:id', requireAuth, async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { error } = await supabase.from('flows').delete().eq('id', req.params.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
  const idx = db.flows.findIndex(x => x.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  db.flows.splice(idx, 1)
  res.json({ ok: true })
})
app.post('/api/flows/:id/deploy', requireAuth, async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('flows').update({ status: 'active' }).eq('id', req.params.id).select('id,name,status').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    return res.json({ ok: true, id: data.id, status: data.status })
  }
  const f = db.flows.find(x => x.id === req.params.id)
  if (!f) return res.status(404).json({ error: 'not found' })
  f.status = 'active'
  res.json({ ok: true, id: f.id, status: f.status })
})

// Executions
app.get('/api/executions', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('executions')
      .select('id,flow_id,status,started_at')
      .order('started_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    const mapped = (data || []).map((r: any) => ({ id: r.id, flowId: r.flow_id, status: r.status, started_at: r.started_at }))
    return res.json(mapped)
  }
  res.json(db.executions)
})
app.get('/api/flows/:flowId/executions', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('executions')
      .select('id,flow_id,status,started_at')
      .eq('flow_id', req.params.flowId)
      .order('started_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    const mapped = (data || []).map((r: any) => ({ id: r.id, flowId: r.flow_id, status: r.status, started_at: r.started_at }))
    return res.json(mapped)
  }
  res.json(db.executions.filter(e => e.flowId === req.params.flowId))
})
app.get('/api/executions/:id', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('executions')
      .select('id,flow_id,status,started_at')
      .eq('id', req.params.id)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'not found' })
    const mapped = { id: data.id, flowId: data.flow_id, status: data.status, started_at: data.started_at }
    return res.json(mapped)
  }
  const e = db.executions.find(x => x.id === req.params.id)
  if (!e) return res.status(404).json({ error: 'not found' })
  res.json(e)
})

// Secrets
app.get('/api/secrets', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('secrets')
      .select('name,expires_at')
      .order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  res.json(db.secrets.map(s => ({ name: s.name, expires_at: s.expires_at })))
})
app.post('/api/secrets', requireAuth, async (req, res) => {
  const { name, value, expires_at } = req.body || {}
  if (!name || !value) return res.status(400).json({ error: 'name and value required' })
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase
      .from('secrets')
      .insert({ name, value, expires_at })
      .select('name,expires_at')
      .maybeSingle()
    if (error) {
      if ((error as any).code === '23505') return res.status(409).json({ error: 'secret exists' })
      return res.status(500).json({ error: error.message })
    }
    return res.json(data)
  }
  const existing = db.secrets.find(s => s.name === name)
  if (existing) return res.status(409).json({ error: 'secret exists' })
  db.secrets.push({ name, value, expires_at })
  res.json({ name, expires_at })
})
app.delete('/api/secrets/:name', requireAuth, async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { error } = await supabase
      .from('secrets')
      .delete()
      .eq('name', req.params.name)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
  const idx = db.secrets.findIndex(s => s.name === req.params.name)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  db.secrets.splice(idx, 1)
  res.json({ ok: true })
})

// Analytics
app.get('/api/analytics/overview', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    // total runs
    const total = await supabase.from('executions').select('id', { count: 'exact', head: true })
    const total_runs = total.count || 0
    // monthly runs (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const monthly = await supabase.from('executions').select('id', { count: 'exact', head: true }).gte('started_at', since)
    const monthly_runs = monthly.count || 0
    // success rate overall
    let success_rate = 100
    if (total_runs > 0) {
      const success = await supabase.from('executions').select('id', { count: 'exact', head: true }).eq('status', 'success')
      const success_count = success.count || 0
      success_rate = Math.round((success_count / total_runs) * 100)
    }
    const monthly_cost = Number((monthly_runs * 0.05).toFixed(2))
    return res.json({ total_runs, monthly_runs, success_rate, monthly_cost })
  }
  res.json({ total_runs: 1280, monthly_runs: 320, success_rate: 97, monthly_cost: 42.73 })
})

// Integrations & OAuth2
// Unified integration action endpoint: routes actions to Nango or Panora based on request body
import { unifiedAction } from './integrations/unified.js'
import { NangoClient } from './integrations/nangoClient.js'
import fs from 'fs'
import path from 'path'
app.post('/api/integrations/unified', requireAuth, async (req, res) => {
  try {
    const result = await unifiedAction(req.body)
    // Log success
    try {
      const logDir = path.join(process.cwd(), 'backend', 'logs')
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
      const line = JSON.stringify({ ts: new Date().toISOString(), type: 'unifiedAction', status: 'success', input: req.body, result }) + '\n'
      fs.appendFileSync(path.join(logDir, 'integration_actions.log'), line)
    } catch {}
    res.json(result)
  } catch (e: any) {
    const status = e?.status || 500
    const message = e?.message || 'integration error'
    // Log failure
    try {
      const logDir = path.join(process.cwd(), 'backend', 'logs')
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
      const line = JSON.stringify({ ts: new Date().toISOString(), type: 'unifiedAction', status: 'error', input: req.body, error: { status, message } }) + '\n'
      fs.appendFileSync(path.join(logDir, 'integration_actions.log'), line)
    } catch {}
    res.status(status).json({ error: message })
  }
})

// Twilio status webhook (message status callbacks)
app.post('/api/webhooks/twilio', express.urlencoded({ extended: false }), (req, res) => {
  // Twilio sends x-www-form-urlencoded with fields like MessageSid, MessageStatus, From, To
  const payload = req.body || {}
  const logDir = path.join(process.cwd(), 'backend', 'logs')
  try { if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }) } catch {}
  const line = JSON.stringify({ ts: new Date().toISOString(), provider: 'twilio', event: 'status', data: payload }) + '\n'
  try { fs.appendFileSync(path.join(logDir, 'twilio_status.log'), line) } catch {}
  res.json({ ok: true })
})

// Basic WhatsApp logging middleware for sends (optional expansion)
// Could be enhanced to handle WhatsApp webhooks when configured.

// Nango connections management API (server-side only; requires NANGO_SECRET_KEY)
app.get('/api/nango/connections', requireAuth, async (_req, res) => {
  try {
    const client = new NangoClient()
    const data = await client.listConnections()
    res.json(data)
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: e?.message || 'failed to list connections' })
  }
})

app.get('/api/nango/connections/:connectionId', requireAuth, async (req, res) => {
  try {
    const client = new NangoClient()
    const data = await client.getConnection(req.params.connectionId)
    res.json(data)
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: e?.message || 'failed to get connection' })
  }
})

app.post('/api/nango/connections/import', requireAuth, async (req, res) => {
  try {
    const body = req.body || {}
    if (!body.provider_config_key || !body.connection_id || !body.credentials) {
      return res.status(400).json({ error: 'provider_config_key, connection_id & credentials required' })
    }
    const client = new NangoClient()
    const data = await client.importConnection(body)
    res.json(data)
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: e?.message || 'failed to import connection' })
  }
})

app.delete('/api/nango/connections/:connectionId', requireAuth, async (req, res) => {
  try {
    const client = new NangoClient()
    const data = await client.deleteConnection(req.params.connectionId)
    res.json(data || { ok: true })
  } catch (e: any) {
    res.status(e?.status || 500).json({ error: e?.message || 'failed to delete connection' })
  }
})

app.get('/api/integrations/connections', async (_req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('connections').select('id,provider,category,account,status').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  res.json(db.connections)
})
app.get('/api/integrations/connections/:provider', async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('connections').select('id,provider,category,account,status').ilike('provider', req.params.provider)
    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) return res.status(404).json({ error: 'not found' })
    return res.json(data[0])
  }
  const c = db.connections.find(x => x.provider.toLowerCase() === req.params.provider.toLowerCase())
  if (!c) return res.status(404).json({ error: 'not found' })
  res.json(c)
})
app.post('/api/integrations/connect', requireAuth, async (req, res) => {
  const { provider, category } = req.body || {}
  if (!provider) return res.status(400).json({ error: 'provider required' })
  const id = `conn_${uuid()}`
  const created = { id, provider, category, status: 'connected' } as any
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { data, error } = await supabase.from('connections').insert(created).select('id,provider,category,account,status').maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }
  db.connections.push(created)
  res.json(created)
})
app.delete('/api/integrations/connections/:connectionId', requireAuth, async (req, res) => {
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const { error } = await supabase.from('connections').delete().eq('id', req.params.connectionId)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }
  const idx = db.connections.findIndex(c => c.id === req.params.connectionId)
  if (idx < 0) return res.status(404).json({ error: 'not found' })
  db.connections.splice(idx, 1)
  res.json({ ok: true })
})
app.get('/api/integrations/providers/:category', (req, res) => {
  const { category } = req.params
  const map: Record<string, Array<{ provider: string; name: string }>> = {
    email: [{ provider: 'Gmail', name: 'Gmail' }, { provider: 'Outlook', name: 'Outlook' }],
    chat: [{ provider: 'Slack', name: 'Slack' }, { provider: 'Teams', name: 'Microsoft Teams' }],
    crm: [{ provider: 'Salesforce', name: 'Salesforce' }, { provider: 'HubSpot', name: 'HubSpot' }],
  }
  res.json(map[category] || [])
})

// Generic OAuth2 mock endpoints
app.get('/api/oauth2/authorize', (req, res) => {
  const redirectUri = (req.query.redirect_uri as string) || '/'
  const state = (req.query.state as string) || ''
  const code = 'mock_code_' + uuid()
  const url = new URL(redirectUri, 'http://localhost:3000')
  url.searchParams.set('code', code)
  if (state) url.searchParams.set('state', state)
  return res.redirect(url.toString())
})
app.post('/api/oauth2/token', (_req, res) => {
  res.json({ access_token: 'mock_access_' + uuid(), refresh_token: 'mock_refresh_' + uuid(), token_type: 'Bearer', expires_in: 3600 })
})

// Audit log
app.get('/api/audit', async (req, res) => {
  const limit = Number(req.query.limit || 20)
  const offset = Number(req.query.offset || 0)
  if (USE_SUPABASE) {
    const supabase = getSupabase()!
    const to = offset + limit - 1
    const { data, error, count } = await supabase
      .from('audit')
      .select('id,actor,action,at', { count: 'exact' })
      .order('at', { ascending: false })
      .range(offset, to)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ items: data || [], total: count || 0, limit, offset })
  }
  const items = db.audit.slice(offset, offset + limit)
  res.json({ items, total: db.audit.length, limit, offset })
})

app.listen(PORT, () => {
  console.log(`[backend] listening on http://0.0.0.0:${PORT}`)
})
