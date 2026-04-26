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
      ].map(link => (
        <Link key={link.href} href={link.href} style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
          {link.label}
        </Link>
      ))}
    </div>
  </nav>
)

const STATUS_COLORS = {
  scheduled: { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
  confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmed' },
  completed: { bg: '#f9fafb', color: '#6b7280', label: 'Completed' },
  missed: { bg: '#fff5f5', color: '#ef4444', label: 'Missed' },
  cancelled: { bg: '#fff5f5', color: '#ef4444', label: 'Cancelled' },
}

export default function PatientProfile({ params }) {
  const router = useRouter()
  const [patient, setPatient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (patientData) {
        setPatient(patientData)
        const { data: apptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('clinic_id', patientData.clinic_id)
          .eq('patient_phone', patientData.phone)
          .order('appointment_date', { ascending: false })
        setAppointments(apptData || [])
      }
      setLoading(false)
    }
    init()
  }, [params.id])

  const lastVisit = appointments.find(a => a.status === 'completed')
  const totalVisits = appointments.filter(a => a.status === 'completed').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  if (!patient) return (
    <div style={{ minHeight: '100vh', background: '#f8faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9ca3af', fontSize: '14px' }}>Patient not found</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>

        <Link href="/patients" style={{
          fontSize: '13px', color: '#6b7280', display: 'inline-flex',
          alignItems: 'center', gap: '4px', marginBottom: '24px',
          textDecoration: 'none'
        }}>
          ← Back to Patients
        </Link>

        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: '#f0fdf4', border: '2px solid #bbf7d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: '700', color: '#16a34a'
              }}>
                {patient.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>{patient.name}</h1>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>
                  {patient.gender || 'Unknown'} · {patient.age ? patient.age + ' years' : 'Age unknown'}
                </p>
              </div>
            </div>
            <Link
              href={'https://wa.me/' + patient.phone?.replace(/\D/g, '')}
              target="_blank"
              style={{
                background: '#25d366', color: '#fff',
                padding: '8px 16px', borderRadius: '8px',
                fontSize: '13px', fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              📲 WhatsApp
            </Link>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px', marginTop: '24px', paddingTop: '20px',
            borderTop: '1px solid #f3f4f6'
          }}>
            {[
              { label: 'Phone', value: patient.phone },
              { label: 'Address', value: patient.address || '—' },
              { label: 'Medical History', value: patient.medical_history || '—' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginBottom: '4px' }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Visits', value: totalVisits, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Last Visit', value: lastVisit?.appointment_date || '—', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Total Appointments', value: appointments.length, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          ].map(card => (
            <div key={card.label} style={{
              background: card.bg, border: '1px solid ' + card.border,
              borderRadius: '12px', padding: '20px'
            }}>
              <p style={{ fontSize: '13px', color: card.color, fontWeight: '500', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Appointment History</h2>
          </div>

          {appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
              No appointments found for this patient
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Date', 'Time', 'Doctor', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '12px', fontWeight: '600',
                      color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((a, i) => (
                  <tr key={a.id} style={{
                    borderBottom: i < appointments.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {a.appointment_date}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.appointment_time?.slice(0, 5)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.doctor}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.reason || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                        background: STATUS_COLORS[a.status]?.bg,
                        color: STATUS_COLORS[a.status]?.color,
                      }}>
                        {STATUS_COLORS[a.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}