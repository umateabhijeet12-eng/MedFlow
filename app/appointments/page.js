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

const fuzzyMatch = (str, query) => {
  if (!str || !query) return false
  str = str.toLowerCase()
  query = query.toLowerCase()
  if (str.includes(query)) return true
  let si = 0
  for (let qi = 0; qi < query.length; qi++) {
    while (si < str.length && str[si] !== query[qi]) si++
    if (si >= str.length) return false
    si++
  }
  return true
}

const namesLikelyMatch = (nameA, nameB) => {
  if (!nameA || !nameB) return false
  const a = nameA.trim().toLowerCase()
  const b = nameB.trim().toLowerCase()
  if (a === b) return true
  if (fuzzyMatch(a, b) || fuzzyMatch(b, a)) return true
  const firstA = a.split(' ')[0]
  const firstB = b.split(' ')[0]
  return firstA === firstB && firstA.length > 2
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
  const [matchedPatient, setMatchedPatient] = useState(null)
  const [candidates, setCandidates] = useState([])
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

    const { data: revenueData } = await supabase
      .from('appointments')
      .select('fee')
      .eq('clinic_id', clinic.id)
      .eq('appointment_date', today)
      .eq('payment_status', 'paid')
    const total = revenueData?.reduce((sum, a) => sum + (parseFloat(a.fee) || 0), 0) || 0
    setRevenue(total)
  }

  // Phone number finds all patients using that number (could be a shared family phone).
  // Name then confirms who it is, or we show a picker when it's ambiguous.
  const checkReturningPatient = async (updatedForm) => {
    if (!updatedForm.patient_phone || !clinic) {
      setMatchedPatient(null)
      setCandidates([])
      return
    }
    const cleanPhone = updatedForm.patient_phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length < 10) {
      setMatchedPatient(null)
      setCandidates([])
      return
    }

    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic.id)

    const phoneMatches = (data || []).filter(p => {
      const existingPhone = (p.phone || '').replace(/\D/g, '').slice(-10)
      return existingPhone === cleanPhone
    })

    if (phoneMatches.length === 0) {
      setMatchedPatient(null)
      setCandidates([])
      return
    }

    if (updatedForm.patient_name) {
      const nameMatch = phoneMatches.find(p => namesLikelyMatch(p.name, updatedForm.patient_name))
      if (nameMatch) {
        setMatchedPatient(nameMatch)
        setCandidates(phoneMatches)
        return
      }
    }

    setMatchedPatient(null)
    setCandidates(phoneMatches)
  }

  const handleFieldChange = (key, value) => {
    const updated = { ...form, [key]: value }
    setForm(updated)
    if (key === 'patient_name' || key === 'patient_phone') {
      checkReturningPatient(updated)
    }
  }

  const selectCandidate = (patient) => {
    setMatchedPatient(patient)
    setForm(f => ({ ...f, patient_name: patient.name, patient_phone: patient.phone }))
  }

  const dismissCandidates = () => {
    setMatchedPatient(null)
    setCandidates([])
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

    const { error: apptError } = await supabase.from('appointments').insert([{ clinic_id: clinic.id, ...form }])
    if (apptError) {
      alert('Error saving appointment: ' + apptError.message)
      setSaving(false)
      return
    }

    // Use matched patient if detected, otherwise auto-create (MedFlow ID generated automatically by DB trigger)
    if (!matchedPatient) {
      const cleanPhone = form.patient_phone.replace(/\D/g, '').slice(-10)
      const { data: allPatients } = await supabase
        .from('patients')
        .select('id, phone')
        .eq('clinic_id', clinic.id)

      const alreadyExists = (allPatients || []).some(p =>
        (p.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone
      )

      if (!alreadyExists) {
        const { error: patientError } = await supabase.from('patients').insert([{
          clinic_id: clinic.id,
          name: form.patient_name,
          phone: form.patient_phone,
        }])
        if (patientError) {
          alert('Appointment saved, but error creating patient record: ' + patientError.message)
        }
      }
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
    setMatchedPatient(null)
    setCandidates([])
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

        {showForm && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
              New Appointment
            </h2>

            {/* Ambiguous match — multiple people share this phone, or name isn't clear yet */}
            {candidates.length > 0 && !matchedPatient && (
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: '10px', padding: '14px 16px', marginBottom: '20px'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2563eb', marginBottom: '4px' }}>
                  📞 This phone number is linked to {candidates.length} existing patient{candidates.length > 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#1e40af', marginBottom: '12px' }}>
                  Is this one of them, or a new person using the same number (e.g. a family member)?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {candidates.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCandidate(c)}
                      style={{
                        textAlign: 'left', background: '#fff', border: '1px solid #bfdbfe',
                        borderRadius: '8px', padding: '10px 12px', cursor: 'pointer',
                        fontSize: '13px', color: '#111827'
                      }}
                    >
                      <strong>{c.name}</strong> · {c.medflow_id} · {c.address || 'No address on file'}
                    </button>
                  ))}
                  <button
                    onClick={dismissCandidates}
                    style={{
                      textAlign: 'left', background: '#f9fafb', border: '1px dashed #d1d5db',
                      borderRadius: '8px', padding: '10px 12px', cursor: 'pointer',
                      fontSize: '13px', color: '#6b7280'
                    }}
                  >
                    None of these — this is a new patient
                  </button>
                </div>
              </div>
            )}

            {/* Confirmed returning patient */}
            {matchedPatient && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>
                    🔄 Returning Patient Confirmed
                  </p>
                  <p style={{ fontSize: '13px', color: '#92400e', marginTop: '2px' }}>
                    {matchedPatient.name} · {matchedPatient.medflow_id} · {matchedPatient.phone}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setMatchedPatient(null)}
                    style={{
                      background: '#fff', color: '#92400e', padding: '8px 12px',
                      borderRadius: '7px', border: '1px solid #fde68a', cursor: 'pointer',
                      fontSize: '12px', fontWeight: '500'
                    }}
                  >
                    Not them
                  </button>
                  <Link href={`/patients/${matchedPatient.id}`} style={{
                    background: '#d97706', color: '#fff', padding: '8px 16px',
                    borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '500', textDecoration: 'none'
                  }}>
                    View Profile →
                  </Link>
                </div>
              </div>
            )}

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
                    onChange={e => {
                      if (field.key === 'patient_name' || field.key === 'patient_phone') {
                        handleFieldChange(field.key, e.target.value)
                      } else {
                        setForm(f => ({ ...f, [field.key]: e.target.value }))
                      }
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: `1px solid ${candidates.length > 0 && (field.key === 'patient_name' || field.key === 'patient_phone') ? '#bfdbfe' : '#e5e7eb'}`,
                      fontSize: '14px',
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
              <button onClick={() => { setShowForm(false); setMatchedPatient(null); setCandidates([]) }} style={{
                background: '#fff', color: '#6b7280', padding: '10px 24px',
                borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '14px'
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

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