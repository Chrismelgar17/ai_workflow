import { getSupabase } from '../db/supabase.js'

async function main() {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('[seed] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }

  // Users (demo)
  const users = [
    { email: 'admin@example.com', password: 'admin123', name: 'Admin', tenant_name: 'DemoCorp' },
  ]

  // Ensure Supabase Auth user exists (for frontend login)
  for (const u of users) {
    let authId: string | undefined
    try {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name, tenant_name: u.tenant_name, role: 'admin' },
      })
      if (error && !String(error.message || '').toLowerCase().includes('already registered')) {
        console.error('[seed] auth user', u.email, error.message)
      }
      authId = created?.user?.id
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (!msg.toLowerCase().includes('already registered')) {
        console.error('[seed] auth user', u.email, msg)
      }
    }
    const row = { ...u, auth_user_id: authId }
    const { error: upErr } = await supabase.from('users').upsert(row as any, { onConflict: 'email' })
    if (upErr) console.error('[seed] users', u.email, upErr.message)
  }

  // Templates
  const templates = [
    { id: 'tpl_welcome', name: 'Welcome Email', description: 'Send a welcome email' },
    { id: 'tpl_invoice', name: 'Invoice Generator', description: 'Generate invoices' },
  ]
  for (const t of templates) {
    const { error } = await supabase.from('templates').upsert(t, { onConflict: 'id' })
    if (error) console.error('[seed] templates', t.id, error.message)
  }

  // Flows
  const flows = [
    { id: 'flow_cust_onboarding', name: 'Customer Onboarding', status: 'active' },
    { id: 'flow_invoice_processing', name: 'Invoice Processing', status: 'draft' },
    { id: 'flow_lead_qualification', name: 'Lead Qualification', status: 'active' },
  ] as const
  for (const f of flows) {
    const { error } = await supabase.from('flows').upsert(f as any, { onConflict: 'id' })
    if (error) console.error('[seed] flows', f.id, error.message)
  }

  // Connections
  const connections = [
    { id: 'conn_gmail', provider: 'Gmail', category: 'email', account: 'demo@company.com', status: 'connected' },
    { id: 'conn_slack', provider: 'Slack', category: 'chat', account: 'workspace/demo', status: 'connected' },
    { id: 'conn_salesforce', provider: 'Salesforce', category: 'crm', account: 'sandbox', status: 'connected' },
  ]
  for (const c of connections) {
    const { error } = await supabase.from('connections').upsert(c, { onConflict: 'id' })
    if (error) console.error('[seed] connections', c.id, error.message)
  }

  // Executions (a few demo rows)
  const { data: existingExecs, error: execsErr } = await supabase
    .from('executions')
    .select('id')
    .limit(1)
  if (!execsErr && (!existingExecs || existingExecs.length === 0)) {
    const now = new Date()
    const rows = [
      { flow_id: 'flow_cust_onboarding', status: 'success', started_at: now.toISOString() },
      { flow_id: 'flow_cust_onboarding', status: 'failed', started_at: new Date(now.getTime() - 3600_000).toISOString() },
      { flow_id: 'flow_invoice_processing', status: 'success', started_at: new Date(now.getTime() - 7200_000).toISOString() },
    ]
    const { error } = await supabase.from('executions').insert(rows)
    if (error) console.error('[seed] executions', error.message)
  }

  // Audit (a couple demo entries)
  const { data: existingAudit, error: auditErr } = await supabase
    .from('audit')
    .select('id')
    .limit(1)
  if (!auditErr && (!existingAudit || existingAudit.length === 0)) {
    const rows = [
      { actor: 'system', action: 'seed:run' },
      { actor: 'admin@example.com', action: 'login' },
    ]
    const { error } = await supabase.from('audit').insert(rows)
    if (error) console.error('[seed] audit', error.message)
  }

  console.log('[seed] done')
}

main().catch((e) => {
  console.error('[seed] fatal', e)
  process.exit(1)
})
