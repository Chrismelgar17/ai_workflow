import { Request, Response, NextFunction } from 'express'
import { getSupabase, USE_SUPABASE } from '../db/supabase.js'

export interface AuthenticatedRequest extends Request {
  authUser?: { id: string; email?: string } | null
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!USE_SUPABASE) return next()
  try {
    const hdr = req.headers['authorization'] || ''
    const token = Array.isArray(hdr) ? hdr[0] : hdr
    const accessToken = token?.startsWith('Bearer ') ? token.substring(7) : ''
    console.log('[requireAuth] Incoming Authorization header:', hdr)
    console.log('[requireAuth] Parsed accessToken:', accessToken)
    if (!accessToken) {
      console.log('[requireAuth] No access token found, unauthorized')
      return res.status(401).json({ error: 'unauthorized' })
    }

    // Optional dev escape hatch: allow mock UI tokens without Supabase
    if (process.env.ALLOW_MOCK_AUTH === 'true') {
      if (accessToken === 'mock-jwt-token') {
        console.log('[requireAuth] ALLOW_MOCK_AUTH enabled, accepting mock token')
        req.authUser = { id: 'mock-user', email: 'mock@local' }
        return next()
      }
    }
    const supabase = getSupabase()!
    const { data, error } = await supabase.auth.getUser(accessToken)
    console.log('[requireAuth] Supabase getUser response:', { data, error })
    if (error || !data?.user) {
      console.log('[requireAuth] Supabase error or missing user:', error, data)
      return res.status(401).json({ error: 'unauthorized' })
    }
    req.authUser = { id: data.user.id, email: data.user.email || undefined }
    console.log('[requireAuth] Authenticated user:', req.authUser)
    return next()
  } catch (e) {
    console.log('[requireAuth] Exception:', e)
    return res.status(401).json({ error: 'unauthorized' })
  }
}
