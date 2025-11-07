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
    if (!accessToken) return res.status(401).json({ error: 'unauthorized' })
    const supabase = getSupabase()!
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data?.user) return res.status(401).json({ error: 'unauthorized' })
    req.authUser = { id: data.user.id, email: data.user.email || undefined }
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' })
  }
}
