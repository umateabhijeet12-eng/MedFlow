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

export default function Followups() {
  const router = useRouter()
  const [clinic, setClinic] = useState(null)
  const [missed, setMissed] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('missed')

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
        await fetchData(clinicData.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchData = async (clinicId) => {
    // Missed appointments
    const { data: missedData } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'missed')
      .order('appointment_date', { ascending: false })

    setMissed(missedData || [])

    // Follow-ups — completed appointments older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]

    const { data: followupData } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .lte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })

    setFollowups(followupData || [])
  }

  const sendWhatsApp = (phone, name, type) => {
    const cleanPhone = phone.replace(/\D/g, '')
    let message = ''
    if (type === 'missed') {
      message = `Hi ${name}, we noticed you missed your appointment at ${clinic?.clinic_name}. We'd love to help you reschedule. Please reply to book a new slot.`
    } else {
      message = `Hi ${name}, this is a follow-up from ${clinic?.clinic_name}. How are you feeling after your visit? Please let us know if you need any further assistance.`
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const currentList = tab === 'missed' ? missed : followups

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Follow-ups</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {clinic?.clinic_name || 'Your clinic'}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Missed Appointments', count: missed.length, color: '#ef4444', bg: '#fff5f5', border: '#fecaca' },
            { label: 'Pending Follow-ups', count: followups.length, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          ].map(card => (
            <div key={card.label} style={{
              background: card.bg, border: `1px solid ${card.border}`,
              borderRadius: '12px', padding: '20px'
            }}>
              <p style={{ fontSize: '13px', color: card.color, fontWeight: '500', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '32px', fontWeight: '700', color: card.color }}>{card.count}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '12px 16px',
          marginBottom: '16px', display: 'flex', gap: '8px'
        }}>
          {[
            { key: 'missed', label: `Missed Appointments (${missed.length})` },
            { key: 'followups', label: `Follow-ups Due (${followups.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 16px', borderRadius: '7px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: tab === t.key ? '#16a34a' : '#f3f4f6',
              color: tab === t.key ? '#fff' : '#6b7280'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              Loading...
            </div>
          ) : currentList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              {tab === 'missed' ? 'No missed appointments 🎉' : 'No follow-ups due right now 🎉'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Patient', 'Phone', 'Doctor', 'Date', 'Reason', 'Action'].map(h => (
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
                {currentList.map((a, i) => (
                  <tr key={a.id} style={{
                    borderBottom: i < currentList.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {a.patient_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.patient_phone}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.doctor}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.appointment_date}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {a.reason || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => sendWhatsApp(a.patient_phone, a.patient_name, tab === 'missed' ? 'missed' : 'followup')}
                        style={{
                          background: '#25d366', color: '#fff',
                          padding: '7px 14px', borderRadius: '7px',
                          border: 'none', cursor: 'pointer',
                          fontSize: '13px', fontWeight: '500',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        📲 WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Note */}
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px', textAlign: 'center' }}>
          WhatsApp button opens a pre-filled message. Full automation activates when MSG91 is connected.
        </p>
      </div>
    </div>
  )
}