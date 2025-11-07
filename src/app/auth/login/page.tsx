'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import supabase from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (supabase) {
        // Normalize inputs to avoid subtle mistakes (e.g., trailing spaces)
        const normalizedEmail = email.trim().toLowerCase()
        const normalizedPassword = password.trim()
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword })
        if (error) {
          setError(error.message || 'Invalid credentials')
        } else if (data.user && data.session) {
          const user = {
            id: data.user.id,
            name: (data.user.user_metadata?.name as string) || normalizedEmail,
            email: data.user.email || normalizedEmail,
            role: (data.user.user_metadata?.role as string) || 'user',
            tenant_id: (data.user.user_metadata?.tenant_id as string) || data.user.id,
            tenant_name: (data.user.user_metadata?.tenant_name as string) || undefined,
          }
          const token = data.session.access_token
          setAuth(user, token)
          router.push('/dashboard')
        } else {
          setError('Login failed. Please try again.')
        }
      } else {
        // Fallback mock if Supabase isn't configured
        if (email && password) {
          const mockUser = {
            id: '1',
            name: 'Demo User',
            email: email,
          }
          const mockToken = 'demo_jwt_token'
          setAuth(mockUser as any, mockToken)
          router.push('/dashboard')
        } else {
          setError('Please enter both email and password')
        }
      }
    } catch (err) {
      setError('Invalid credentials')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your AI Workflow Portal account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}