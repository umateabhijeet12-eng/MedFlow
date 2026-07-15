'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const NavBar = () => (
  <nav style={{
    background: '#fff', borderBottom: '1px solid #e5e7eb',
    padding: '0 24px', height: '56px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '30px', height: '30px', background: '#16a34a',
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>M</span>
      </div>
      <span style={{ fontWeight: '600', fontSize: '16px' }}>MedFlow</span>
    </div>
    <div style={{ display: 'flex', gap: '24px' }}>
      {[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: 'Appointments', href: '/appointments' },
        { label: 'Follow-ups', href: '/followups' },
        { label: 'Reviews', href: '/reviews' },
        { label: 'Settings', href: '/settings' },
      ].map(link => (
        <Link key={link.href} href={link.href} style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
          {link.label}
        </Link>
      ))}
    </div>
  </nav>
)

export default function PrescriptionPage({ params }) {
  const router = useRouter()
  const [appointment, setAppointment] = useState(null)
  const [patient, setPatient] = useState(null)
  const [prescription, setPrescription] = useState(null)
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    symptoms: '',
    diagnosis: '',
    prescription: '',
    notes: '',
    follow_up_date: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (clinicData) setClinic(clinicData)

      // Fetch appointment
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', params.id)
        .single()

      if (apptData) {
        setAppointment(apptData)

        // Fetch patient by phone
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', apptData.clinic_id)
          .eq('phone', apptData.patient_phone)
          .single()

        if (patientData) setPatient(patientData)

        // Fetch existing prescription
        const { data: prescData } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('appointment_id', params.id)
          .single()

        if (prescData) {
          setPrescription(prescData)
          setForm({
            symptoms: prescData.symptoms || '',
            diagnosis: prescData.diagnosis || '',
            prescription: prescData.prescription || '',
            notes: prescData.notes || '',
            follow_up_date: prescData.follow_up_date || '',
          })
        }
      }
      setLoading(false)
    }
    init()
  }, [params.id])

  const handleSave = async () => {
    if (!appointment) return
    setSaving(true)

    if (prescription) {
      // Update existing
      await supabase
        .from('prescriptions')
        .update({
          symptoms: form.symptoms,
          diagnosis: form.diagnosis,
          prescription: form.prescription,
          notes: form.notes,
          follow_up_date: form.follow_up_date || null,
        })
        .eq('id', prescription.id)
    } else {
      // Create new
      await supabase.from('prescriptions').insert([{
        clinic_id: appointment.clinic_id,
        patient_id: patient?.id,
        appointment_id: appointment.id,
        doctor_name: appointment.doctor,
        symptoms: form.symptoms,
        diagnosis: form.diagnosis,
        prescription: form.prescription,
        notes: form.notes,
        follow_up_date: form.follow_up_date || null,
      }])
    }

    setSaving(false)
    alert('Saved successfully!')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>

        <Link href="/appointments" style={{
          fontSize: '13px', color: '#6b7280', display: 'inline-flex',
          alignItems: 'center', gap: '4px', marginBottom: '24px',
          textDecoration: 'none'
        }}>
          ← Back to Appointments
        </Link>

        {/* Patient & appointment info */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              {appointment?.patient_name}
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              {appointment?.patient_phone} · {appointment?.appointment_date} at {appointment?.appointment_time?.slice(0, 5)}
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
              Dr. {appointment?.doctor} · {appointment?.reason || 'No reason specified'}
            </p>
          </div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '8px', padding: '8px 16px',
            fontSize: '13px', fontWeight: '500', color: '#16a34a'
          }}>
            {prescription ? 'Prescription saved ✓' : 'New prescription'}
          </div>
        </div>

        {/* Prescription form */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
            Patient Notes & Prescription
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Symptoms
              </label>
              <textarea
                placeholder="Describe patient symptoms..."
                value={form.symptoms}
                onChange={e => setForm({ ...form, symptoms: e.target.value })}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Diagnosis
              </label>
              <textarea
                placeholder="Enter diagnosis..."
                value={form.diagnosis}
                onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Prescription / Medicines
              </label>
              <textarea
                placeholder="e.g. Paracetamol 500mg - 1 tablet twice daily for 5 days..."
                value={form.prescription}
                onChange={e => setForm({ ...form, prescription: e.target.value })}
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Additional Notes
              </label>
              <textarea
                placeholder="Any additional notes for the patient..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                Follow-up Date (optional)
              </label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={e => setForm({ ...form, follow_up_date: e.target.value })}
                style={{
                  padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '14px',
                  outline: 'none', color: '#111827'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <button onClick={handleSave} disabled={saving} style={{
                background: '#16a34a', color: '#fff', padding: '10px 28px',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Saving...' : prescription ? 'Update' : 'Save Prescription'}
              </button>
              <Link href="/appointments" style={{
                background: '#fff', color: '#6b7280', padding: '10px 24px',
                borderRadius: '8px', border: '1px solid #e5e7eb',
                fontSize: '14px', textDecoration: 'none'
              }}>
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}