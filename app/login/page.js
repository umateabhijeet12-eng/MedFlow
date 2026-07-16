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
  const [showPassword, setShowPassword] = useState(false)
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                Password
              </label>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9ca3af'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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