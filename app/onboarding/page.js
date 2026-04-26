'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const steps = ['Clinic Info', 'Doctor Info', 'Confirm']

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    clinic_name: '',
    clinic_address: '',
    clinic_city: '',
    clinic_phone: '',
    doctor_name: '',
    doctor_specialization: '',
    doctor_phone: '',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    appointment_duration: '30',
  })

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('clinics').insert([{
      user_id: user.id,
      ...form,
    }])
    if (!error) router.push('/dashboard')
    setSaving(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8faf8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '44px', height: '44px', background: '#16a34a',
            borderRadius: '12px', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>M</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>Set up your clinic</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Takes less than 2 minutes
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: '8px' }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: i <= step ? '#16a34a' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '600',
                  color: i <= step ? '#fff' : '#9ca3af',
                  flexShrink: 0
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: '500',
                  color: i === step ? '#111827' : '#9ca3af',
                  whiteSpace: 'nowrap'
                }}>
                  {s}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: '1px', background: i < step ? '#16a34a' : '#e5e7eb',
                  margin: '0 8px'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #e5e7eb', padding: '28px'
        }}>

          {/* Step 0 - Clinic Info */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Clinic Information
              </h2>
              {[
                { key: 'clinic_name', label: 'Clinic Name', placeholder: 'City Dental Clinic' },
                { key: 'clinic_address', label: 'Address', placeholder: 'Shop 4, MG Road' },
                { key: 'clinic_city', label: 'City', placeholder: 'Nagpur' },
                { key: 'clinic_phone', label: 'Clinic Phone', placeholder: '+91 98765 43210' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', fontSize: '14px',
                      outline: 'none', color: '#111827', boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 1 - Doctor Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Doctor Information
              </h2>
              {[
                { key: 'doctor_name', label: 'Doctor Name', placeholder: 'Dr. Rahul Mehta' },
                { key: 'doctor_specialization', label: 'Specialization', placeholder: 'Dentist, General Physician...' },
                { key: 'doctor_phone', label: "Doctor's WhatsApp Number", placeholder: '+91 98765 43210' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    {f.label}
                  </label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', fontSize: '14px',
                      outline: 'none', color: '#111827', boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Appointment Duration (minutes)
                </label>
                <select
                  value={form.appointment_duration}
                  onChange={e => update('appointment_duration', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', background: '#fff'
                  }}
                >
                  {['15', '20', '30', '45', '60'].map(d => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'working_hours_start', label: 'Opens at' },
                  { key: 'working_hours_end', label: 'Closes at' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      {f.label}
                    </label>
                    <input
                      type="time"
                      value={form[f.key]}
                      onChange={e => update(f.key, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 - Confirm */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Confirm Details
              </h2>
              {[
                { label: 'Clinic', value: form.clinic_name },
                { label: 'Address', value: `${form.clinic_address}, ${form.clinic_city}` },
                { label: 'Clinic Phone', value: form.clinic_phone },
                { label: 'Doctor', value: form.doctor_name },
                { label: 'Specialization', value: form.doctor_specialization },
                { label: 'Doctor WhatsApp', value: form.doctor_phone },
                { label: 'Working Hours', value: `${form.working_hours_start} – ${form.working_hours_end}` },
                { label: 'Appointment Duration', value: `${form.appointment_duration} mins` },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid #f3f4f6'
                }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{row.value || '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: '1px solid #e5e7eb', background: '#fff',
                fontSize: '14px', fontWeight: '500', color: '#6b7280', cursor: 'pointer'
              }}>
                Back
              </button>
            )}
            {step < 2 ? (
              <button onClick={() => setStep(s => s + 1)} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: 'none', background: '#16a34a',
                fontSize: '14px', fontWeight: '500', color: '#fff', cursor: 'pointer'
              }}>
                Continue
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving} style={{
                flex: 1, padding: '11px', borderRadius: '8px',
                border: 'none', background: '#16a34a',
                fontSize: '14px', fontWeight: '500', color: '#fff',
                cursor: 'pointer', opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Setting up...' : 'Launch MedFlow 🩺'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}