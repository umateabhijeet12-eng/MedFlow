'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SPECIALIZATIONS = [
  'General Physician',
  'Dentist',
  'Cardiologist',
  'Dermatologist',
  'Gynaecologist',
  'Orthopaedic',
  'Paediatrician',
  'Psychiatrist / Mental Health',
  'ENT Specialist',
  'Ophthalmologist',
  'Neurologist',
  'Urologist',
  'Other',
]

export default function Signup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    clinic_name: '',
    doctor_name: '',
    doctor_specialization: '',
    clinic_phone: '',
    clinic_city: '',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    appointment_duration: '30',
  })

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSignup = async () => {
    if (!form.email || !form.password || !form.clinic_name || !form.doctor_name || !form.doctor_specialization) {
      setError('Please fill in all required fields')
      return
    }
    setLoading(true)
    setError('')

    // Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Create clinic record
    const { error: clinicError } = await supabase.from('clinics').insert([{
      user_id: authData.user.id,
      clinic_name: form.clinic_name,
      doctor_name: form.doctor_name,
      doctor_specialization: form.doctor_specialization,
      clinic_phone: form.clinic_phone,
      clinic_city: form.clinic_city,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      appointment_duration: parseInt(form.appointment_duration),
    }])

    if (clinicError) {
      setError('Account created but clinic setup failed. Please contact support.')
      setLoading(false)
      return
    }

    // Sign in immediately
    await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    window.location.href = '/dashboard'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8faf8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px',
        border: '1px solid #e5e7eb', padding: '40px',
        width: '100%', maxWidth: '480px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '44px', height: '44px', background: '#16a34a',
            borderRadius: '12px', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>M</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>Register your clinic</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Set up your MedFlow account in 2 minutes
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: s <= step ? '#16a34a' : '#e5e7eb'
            }} />
          ))}
        </div>

        {/* Step 1 — Account details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Step 1 — Account Details
            </p>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Email *
              </label>
              <input
                type="email"
                placeholder="doctor@clinic.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Password *
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Clinic Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Mehta Dental Clinic"
                value={form.clinic_name}
                onChange={e => update('clinic_name', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Doctor Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Mehta"
                value={form.doctor_name}
                onChange={e => update('doctor_name', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Specialization *
              </label>
              <select
                value={form.doctor_specialization}
                onChange={e => update('doctor_specialization', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', background: '#fff', boxSizing: 'border-box'
                }}
              >
                <option value="">Select specialization</option>
                {SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>}

            <button
              onClick={() => {
                if (!form.email || !form.password || !form.clinic_name || !form.doctor_name || !form.doctor_specialization) {
                  setError('Please fill in all required fields')
                  return
                }
                setError('')
                setStep(2)
              }}
              style={{
                background: '#16a34a', color: '#fff', padding: '11px',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '15px', fontWeight: '500', marginTop: '4px'
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — Clinic details */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
              Step 2 — Clinic Details
            </p>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Clinic Phone
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={form.clinic_phone}
                onChange={e => update('clinic_phone', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Nagpur"
                value={form.clinic_city}
                onChange={e => update('clinic_city', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Opening Time
                </label>
                <input
                  type="time"
                  value={form.working_hours_start}
                  onChange={e => update('working_hours_start', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Closing Time
                </label>
                <input
                  type="time"
                  value={form.working_hours_end}
                  onChange={e => update('working_hours_end', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Appointment Duration
              </label>
              <select
                value={form.appointment_duration}
                onChange={e => update('appointment_duration', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', background: '#fff', boxSizing: 'border-box'
                }}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, background: '#fff', color: '#6b7280', padding: '11px',
                  borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSignup}
                disabled={loading}
                style={{
                  flex: 2, background: '#16a34a', color: '#fff', padding: '11px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '15px', fontWeight: '500', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Setting up...' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '24px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#16a34a', fontWeight: '500' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}