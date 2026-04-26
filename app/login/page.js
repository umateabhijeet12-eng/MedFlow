'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8faf8',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #e5e7eb', padding: '40px',
        width: '100%', maxWidth: '380px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '44px', height: '44px', background: '#16a34a',
            borderRadius: '12px', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>M</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>Welcome to MedFlow</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Sign in to your clinic account</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="doctor@clinic.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', color: '#111827', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', color: '#111827', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: '#16a34a', color: '#fff', padding: '11px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: '500', marginTop: '4px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
          New clinic?{' '}
          <Link href="/signup" style={{ color: '#16a34a', fontWeight: '500' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}