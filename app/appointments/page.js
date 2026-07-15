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

const STATUS_COLORS = {
  scheduled: { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
  confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmed' },
  completed: { bg: '#f9fafb', color: '#6b7280', label: 'Completed' },
  missed: { bg: '#fff5f5', color: '#ef4444', label: 'Missed' },
  cancelled: { bg: '#fff5f5', color: '#ef4444', label: 'Cancelled' },
}

export default function Appointments() {
  const router = useRouter()
  const [appointments, setAppointments] = useState([])
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('today')
  const [slots, setSlots] = useState([])
  const [services, setServices] = useState([])
  const [revenue, setRevenue] = useState(0)
  const [form, setForm] = useState({
    patient_name: '',
    patient_phone: '',
    doctor: '',
    reason: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    service_id: '',
    fee: '',
    payment_status: 'unpaid',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('clinics')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (data) {
        setClinic(data)
        setForm(f => ({ ...f, doctor: data.doctor_name || '' }))
        // Fetch services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('clinic_id', data.id)
        setServices(servicesData || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (clinic) fetchAppointments()
  }, [clinic, filter])

  useEffect(() => {
    if (clinic && form.appointment_date) generateSlots()
  }, [clinic, form.appointment_date])

  const fetchAppointments = async () => {
    let query = supabase
      .from('appointments')
      .select('*, services(name)')
      .eq('clinic_id', clinic.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    const today = new Date().toISOString().split('T')[0]
    if (filter === 'today') query = query.eq('appointment_date', today)
    else if (filter === 'upcoming') query = query.gte('appointment_date', today)
    else if (filter === 'missed') query = query.eq('status', 'missed')

    const { data } = await query
    setAppointments(data || [])

    // Fetch daily revenue
    const { data: revenueData } = await supabase
      .from('appointments')
      .select('fee')
      .eq('clinic_id', clinic.id)
      .eq('appointment_date', today)
      .eq('payment_status', 'paid')
    const total = revenueData?.reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0) || 0
    setRevenue(total)
  }

  const generateSlots = async () => {
    if (!clinic) return
    const start = clinic.working_hours_start || '09:00'
    const end = clinic.working_hours_end || '18:00'
    const duration = parseInt(clinic.appointment_duration || '30')
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM

    const { data: booked } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('clinic_id', clinic.id)
      .eq('appointment_date', form.appointment_date)
      .not('status', 'in', '("cancelled","missed")')

    const bookedTimes = (booked || []).map(a => a.appointment_time.slice(0, 5))
    const generated = []
    for (let m = startMins; m + duration <= endMins; m += duration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0')
      const min = (m % 60).toString().padStart(2, '0')
      generated.push({ time: `${h}:${min}`, booked: bookedTimes.includes(`${h}:${min}`) })
    }
    setSlots(generated)
  }

  const handleAdd = async () => {
    if (!form.patient_name || !form.patient_phone || !form.appointment_time || !form.service_id) return
    setSaving(true)

    // Save appointment
    await supabase.from('appointments').insert([{ clinic_id: clinic.id, ...form }])

    // Auto-add patient if not already in patients table
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('phone', form.patient_phone)
      .single()

    if (!existingPatient) {
      await supabase.from('patients').insert([{
        clinic_id: clinic.id,
        name: form.patient_name,
        phone: form.patient_phone,
      }])
    }

    setForm({
      patient_name: '',
      patient_phone: '',
      doctor: clinic?.doctor_name || '',
      reason: '',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      service_id: '',
      fee: '',
      payment_status: 'unpaid',
    })
    setShowForm(false)
    await fetchAppointments()
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('appointments').update({ status }).eq('id', id)
    await fetchAppointments()
  }

  const togglePayment = async (id, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
    await supabase.from('appointments').update({ payment_status: newStatus }).eq('id', id)
    await fetchAppointments()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Appointments</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {clinic?.clinic_name || 'Your clinic'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#16a34a' }}>₹{revenue.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Today's Revenue</div>
            </div>
            <button onClick={() => setShowForm(true)} style={{
              background: '#16a34a', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500'
            }}>
              + New Appointment
            </button>
          </div>
        </div>

        {/* New appointment form */}
        {showForm && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
              New Appointment
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'patient_name', label: 'Patient Name', placeholder: 'Enter patient name', type: 'text' },
                { key: 'patient_phone', label: 'Phone / WhatsApp', placeholder: '+91 98765 43210', type: 'text' },
                { key: 'doctor', label: 'Doctor', placeholder: 'Dr. Name', type: 'text' },
                { key: 'reason', label: 'Reason', placeholder: 'Checkup, follow-up, etc.', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
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
                  Service
                </label>
                <select
                  value={form.service_id}
                  onChange={e => {
                    const service = services.find(s => s.id === e.target.value)
                    setForm({ ...form, service_id: e.target.value, fee: service ? service.price : '' })
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Fee
                </label>
                <input
                  type="number"
                  placeholder="Fee"
                  value={form.fee}
                  readOnly
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box', background: '#f9fafb'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={form.appointment_date}
                  onChange={e => setForm({ ...form, appointment_date: e.target.value, appointment_time: '' })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Time Slot
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {slots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={slot.booked}
                      onClick={() => setForm({ ...form, appointment_time: slot.time })}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                        cursor: slot.booked ? 'not-allowed' : 'pointer',
                        border: '1px solid',
                        borderColor: form.appointment_time === slot.time ? '#16a34a' : slot.booked ? '#e5e7eb' : '#d1d5db',
                        background: form.appointment_time === slot.time ? '#16a34a' : slot.booked ? '#f9fafb' : '#fff',
                        color: form.appointment_time === slot.time ? '#fff' : slot.booked ? '#9ca3af' : '#374151',
                        fontWeight: form.appointment_time === slot.time ? '600' : '400',
                      }}
                    >
                      {slot.time}
                    </button>
                  ))}
                  {slots.length === 0 && (
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>No slots available</p>
                  )}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="time"
                    value={form.appointment_time}
                    onChange={e => setForm({ ...form, appointment_time: e.target.value })}
                    style={{
                      padding: '8px 12px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', fontSize: '14px',
                      outline: 'none', color: '#111827'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>or pick custom time</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={handleAdd} disabled={saving} style={{
                background: '#16a34a', color: '#fff', padding: '10px 24px',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Booking...' : 'Book Appointment'}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                background: '#fff', color: '#6b7280', padding: '10px 24px',
                borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '14px'
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '12px 16px',
          marginBottom: '16px', display: 'flex', gap: '8px'
        }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all', label: 'All' },
            { key: 'missed', label: 'Missed' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 16px', borderRadius: '7px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: filter === f.key ? '#16a34a' : '#f3f4f6',
              color: filter === f.key ? '#fff' : '#6b7280'
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Appointments table */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>Loading...</div>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              No appointments found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Time', 'Patient', 'Phone', 'Doctor', 'Reason', 'Fee', 'Status', 'Payment', 'Actions'].map(h => (
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
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {a.appointment_time?.slice(0, 5)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {a.patient_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{a.patient_phone}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{a.doctor}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{a.reason || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>₹{a.fee}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                        background: STATUS_COLORS[a.status]?.bg,
                        color: STATUS_COLORS[a.status]?.color,
                      }}>
                        {STATUS_COLORS[a.status]?.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => togglePayment(a.id, a.payment_status)}
                        style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
                          border: '1px solid', cursor: 'pointer',
                          background: a.payment_status === 'paid' ? '#16a34a' : '#fff',
                          color: a.payment_status === 'paid' ? '#fff' : '#16a34a',
                          borderColor: '#16a34a'
                        }}
                      >
                        {a.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={a.status}
                        onChange={e => updateStatus(a.id, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: '6px',
                          border: '1px solid #e5e7eb', fontSize: '12px',
                          outline: 'none', color: '#374151', background: '#fff', cursor: 'pointer'
                        }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
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