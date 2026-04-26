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

export default function Reviews() {
  const router = useRouter()
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleLink, setGoogleLink] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [completedPatients, setCompletedPatients] = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (clinicData) {
        setClinic(clinicData)
        setGoogleLink(clinicData.google_review_link || '')
        await fetchCompleted(clinicData.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchCompleted = async (clinicId) => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .limit(50)
    setCompletedPatients(data || [])
  }

  const saveGoogleLink = async () => {
    setSavingLink(true)
    await supabase
      .from('clinics')
      .update({ google_review_link: googleLink })
      .eq('id', clinic.id)
    setSavingLink(false)
    alert('Google Review link saved!')
  }

  const sendReviewRequest = (phone, name) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const message = `Hi ${name}, thank you for visiting ${clinic?.clinic_name}! We hope you're feeling better. We'd love to hear your feedback — please leave us a Google Review here: ${googleLink || '[Add your Google Review link in settings]'} 🙏`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Reviews</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Request Google Reviews from completed appointments
          </p>
        </div>

        {/* Google Review Link setup */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
            Your Google Review Link
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Paste your clinic's Google Review link here. It will be included in all review request messages.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="https://g.page/r/your-clinic/review"
              value={googleLink}
              onChange={e => setGoogleLink(e.target.value)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', color: '#111827'
              }}
            />
            <button onClick={saveGoogleLink} disabled={savingLink} style={{
              background: '#16a34a', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500', opacity: savingLink ? 0.7 : 1
            }}>
              {savingLink ? 'Saving...' : 'Save Link'}
            </button>
          </div>
          {!googleLink && (
            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>
              ⚠️ Add your Google Review link to start sending review requests
            </p>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Completed Appointments', value: completedPatients.length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Review Requests Sent', value: '—', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          ].map(card => (
            <div key={card.label} style={{
              background: card.bg, border: `1px solid ${card.border}`,
              borderRadius: '12px', padding: '20px'
            }}>
              <p style={{ fontSize: '13px', color: card.color, fontWeight: '500', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Completed patients list */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
              Completed Appointments — Send Review Request
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>Loading...</div>
          ) : completedPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              No completed appointments yet — mark appointments as Completed to request reviews
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Patient', 'Phone', 'Date', 'Reason', 'Action'].map(h => (
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
                {completedPatients.map((a, i) => (
                  <tr key={a.id} style={{
                    borderBottom: i < completedPatients.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {a.patient_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.patient_phone}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.appointment_date}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.reason || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => sendReviewRequest(a.patient_phone, a.patient_name)}
                        style={{
                          background: '#25d366', color: '#fff',
                          padding: '7px 14px', borderRadius: '7px',
                          border: 'none', cursor: 'pointer',
                          fontSize: '13px', fontWeight: '500'
                        }}
                      >
                        📲 Request Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px', textAlign: 'center' }}>
          Review requests open WhatsApp with a pre-filled message. Full automation activates when MSG91 is connected.
        </p>
      </div>
    </div>
  )
}