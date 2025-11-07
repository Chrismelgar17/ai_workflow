import { getSupabase } from '../db/supabase.js'

async function main() {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('[create-user] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }

  const [,, emailArg, passwordArg, nameArg, tenantNameArg] = process.argv
  const email = (emailArg || process.env.CREATE_USER_EMAIL || '').trim().toLowerCase()
  const password = (passwordArg || process.env.CREATE_USER_PASSWORD || '').trim()
  const name = nameArg || process.env.CREATE_USER_NAME || 'Test User'
  const tenant_name = tenantNameArg || process.env.CREATE_USER_TENANT || 'DemoTenant'

  if (!email || !password) {
    console.error('Usage: npm run user:create -- <email> <password> [name] [tenant_name]')
    process.exit(1)
  }

  console.log(`[create-user] ensuring user exists: ${email}`)

  // Try to create Auth user
  let authId: string | undefined
  try {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, tenant_name, role: 'admin' },
    })
    if (error && !String(error.message || '').toLowerCase().includes('already registered')) {
      console.error('[create-user] auth create error:', error.message)
    } else if (error) {
      console.log('[create-user] user already registered in Auth')
    }
    authId = created?.user?.id
  } catch (e: any) {
    const msg = e?.message || String(e)
    if (!msg.toLowerCase().includes('already registered')) {
      console.error('[create-user] auth create fatal:', msg)
    } else {
      console.log('[create-user] user already registered in Auth')
    }
  }

  // If no id returned (already existed), try to find by email via admin.listUsers
  if (!authId) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) {
        console.warn('[create-user] listUsers error:', error.message)
      } else if ((data as any)?.users?.length) {
        const match = ((data as any).users as any[]).find((u: any) => (u.email || '').toLowerCase() === email)
        if (match) authId = match.id
      }
    } catch (e: any) {
      console.warn('[create-user] listUsers fatal:', e?.message || String(e))
    }
  }

  // Ensure password and confirmation for existing users as well
  if (authId) {
    try {
      const { error: updErr } = await supabase.auth.admin.updateUserById(authId, {
        password,
        email_confirm: true,
        user_metadata: { name, tenant_name, role: 'admin' },
      })
      if (updErr) {
        console.warn('[create-user] auth update warning:', updErr.message)
      }
    } catch (e: any) {
      console.warn('[create-user] auth update fatal:', e?.message || String(e))
    }
  }

  // Upsert into app users table
  const row: any = { email, password: null, name, tenant_name }
  if (authId) row.auth_user_id = authId
  let { error: upErr } = await supabase.from('users').upsert(row, { onConflict: 'email' })
  if (upErr && /auth_user_id/i.test(upErr.message || '')) {
    // Fallback when the column isn't present yet
    const fallbackRow: any = { email, password: null, name, tenant_name }
    const retry = await supabase.from('users').upsert(fallbackRow, { onConflict: 'email' })
    upErr = retry.error
  }
  if (upErr) {
    console.error('[create-user] users upsert error:', upErr.message)
    process.exit(1)
  }

  console.log('[create-user] done', { email, auth_user_id: authId || '(not linked)' })
}

main().catch((e) => {
  console.error('[create-user] fatal', e)
  process.exit(1)
})
