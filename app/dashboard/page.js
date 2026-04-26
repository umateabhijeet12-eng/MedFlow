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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{
        padding: '7px 14px', borderRadius: '7px', border: '1px solid #e5e7eb',
        background: '#fff', fontSize: '13px', color: '#6b7280', cursor: 'pointer'
      }}>
        Sign out
      </button>
    </div>
  </nav>
)

export default function Dashboard() {
  const router = useRouter()
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayCompleted: 0,
    todayMissed: 0,
    todayUpcoming: 0,
    totalPatients: 0,
    missedTotal: 0,
    followupsDue: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState([])

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
        await fetchStats(clinicData.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchStats = async (clinicId) => {
    const today = new Date().toISOString().split('T')[0]

    const { data: todayData } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })

    const todayList = todayData || []
    setTodayAppointments(todayList)

    const { data: missedData } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('status', 'missed')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]

    const { data: followupData } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .lte('appointment_date', cutoff)

    const { data: patientsData } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)

    setStats({
      todayTotal: todayList.length,
      todayCompleted: todayList.filter(a => a.status === 'completed').length,
      todayMissed: todayList.filter(a => a.status === 'missed').length,
      todayUpcoming: todayList.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
      totalPatients: patientsData?.length || 0,
      missedTotal: missedData?.length || 0,
      followupsDue: followupData?.length || 0,
    })
  }

  const STATUS_COLORS = {
    scheduled: { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
    confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmed' },
    completed: { bg: '#f9fafb', color: '#6b7280', label: 'Completed' },
    missed: { bg: '#fff5f5', color: '#ef4444', label: 'Missed' },
    cancelled: { bg: '#fff5f5', color: '#ef4444', label: 'Cancelled' },
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const getDoctorName = () => {
    if (!clinic?.doctor_name) return 'Doctor'
    const name = clinic.doctor_name.trim()
    if (name.toLowerCase().startsWith('dr')) return name
    return `Dr. ${name}`
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>
            {getGreeting()}, {getDoctorName()} 👋
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{today}</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: "Today's Appointments", value: stats.todayTotal, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', href: '/appointments' },
            { label: 'Completed Today', value: stats.todayCompleted, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', href: '/appointments' },
            { label: 'Missed Appointments', value: stats.missedTotal, color: '#ef4444', bg: '#fff5f5', border: '#fecaca', href: '/followups' },
            { label: 'Follow-ups Due', value: stats.followupsDue, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', href: '/followups' },
          ].map(card => (
            <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: card.bg, border: `1px solid ${card.border}`,
                borderRadius: '12px', padding: '20px', cursor: 'pointer'
              }}>
                <p style={{ fontSize: '13px', color: card.color, fontWeight: '500', marginBottom: '8px' }}>{card.label}</p>
                <p style={{ fontSize: '36px', fontWeight: '700', color: card.color }}>{card.value}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's schedule */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Today's Schedule</h2>
            <Link href="/appointments" style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>Loading...</div>
          ) : todayAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
              No appointments scheduled for today
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Time', 'Patient', 'Phone', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left',
                      fontSize: '12px', fontWeight: '600',
                      color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((a, i) => (
                  <tr key={a.id} style={{
                    borderBottom: i < todayAppointments.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {a.appointment_time?.slice(0, 5)}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {a.patient_name}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#6b7280' }}>
                      {a.patient_phone}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#6b7280' }}>
                      {a.reason || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
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

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: '+ New Appointment', href: '/appointments', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: '👥 View Patients', href: '/patients', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: '📲 Follow-ups', href: '/followups', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          ].map(action => (
            <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: action.bg, border: `1px solid ${action.border}`,
                borderRadius: '12px', padding: '16px 20px',
                textAlign: 'center', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', color: action.color
              }}>
                {action.label}
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}