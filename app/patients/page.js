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

export default function Patients() {
  const router = useRouter()
  const [patients, setPatients] = useState([])
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [matchedPatient, setMatchedPatient] = useState(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    medical_history: '',
  })
  const [prescription, setPrescription] = useState({
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

      if (clinicData) {
        setClinic(clinicData)
        await fetchPatients(clinicData.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchPatients = async (clinicId) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
    setPatients(data || [])
  }

  const checkReturningPatient = async (updatedForm) => {
    if (!updatedForm.name || !updatedForm.phone || !clinic) return
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic.id)
      .ilike('name', updatedForm.name.trim())
      .eq('phone', updatedForm.phone.trim())

    if (data && data.length > 0) {
      if (updatedForm.address) {
        const addressMatch = data.find(p =>
          p.address?.toLowerCase().trim() === updatedForm.address.toLowerCase().trim()
        )
        setMatchedPatient(addressMatch || data[0])
      } else {
        setMatchedPatient(data[0])
      }
    } else {
      setMatchedPatient(null)
    }
  }

  const handleFormChange = (key, value) => {
    const updated = { ...form, [key]: value }
    setForm(updated)
    if (key === 'name' || key === 'phone' || key === 'address') {
      checkReturningPatient(updated)
    }
  }

  const handleAdd = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)

    if (matchedPatient) {
      // Returning patient — save prescription and go to their profile
      const hasPrescription = prescription.symptoms || prescription.diagnosis || prescription.prescription || prescription.notes
      if (hasPrescription) {
        await supabase.from('prescriptions').insert([{
          clinic_id: clinic.id,
          patient_id: matchedPatient.id,
          doctor_name: clinic.doctor_name,
          symptoms: prescription.symptoms,
          diagnosis: prescription.diagnosis,
          prescription: prescription.prescription,
          notes: prescription.notes,
          follow_up_date: prescription.follow_up_date || null,
        }])
      }
      router.push(`/patients/${matchedPatient.id}`)
      return
    }

    // New patient — create record
    const { data: newPatient } = await supabase
      .from('patients')
      .insert([{ clinic_id: clinic.id, ...form }])
      .select()
      .single()

    // Save prescription if filled
    if (newPatient) {
      const hasPrescription = prescription.symptoms || prescription.diagnosis || prescription.prescription || prescription.notes
      if (hasPrescription) {
        await supabase.from('prescriptions').insert([{
          clinic_id: clinic.id,
          patient_id: newPatient.id,
          doctor_name: clinic.doctor_name,
          symptoms: prescription.symptoms,
          diagnosis: prescription.diagnosis,
          prescription: prescription.prescription,
          notes: prescription.notes,
          follow_up_date: prescription.follow_up_date || null,
        }])
      }
    }

    setForm({ name: '', phone: '', age: '', gender: '', address: '', medical_history: '' })
    setPrescription({ symptoms: '', diagnosis: '', prescription: '', notes: '', follow_up_date: '' })
    setMatchedPatient(null)
    setShowForm(false)
    await fetchPatients(clinic.id)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('patients').delete().eq('id', id)
    await fetchPatients(clinic.id)
  }

  const filtered = patients.filter(p =>
    fuzzyMatch(p.name, search) ||
    p.phone?.includes(search) ||
    p.medflow_id?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Patients</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {clinic?.clinic_name || 'Your clinic'} · {patients.length} patients
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setMatchedPatient(null) }} style={{
            background: '#16a34a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: '500'
          }}>
            + Add Patient
          </button>
        </div>

        {showForm && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
          }}>

            {/* Returning patient alert */}
            {matchedPatient && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '10px', padding: '14px 16px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>
                    🔄 Returning Patient Detected!
                  </p>
                  <p style={{ fontSize: '13px', color: '#92400e', marginTop: '2px' }}>
                    {matchedPatient.name} · {matchedPatient.medflow_id} · {matchedPatient.phone}
                  </p>
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                    Fill prescription below and click Save to add this visit to their history
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/patients/${matchedPatient.id}`)}
                  style={{
                    background: '#d97706', color: '#fff', padding: '8px 16px',
                    borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '500'
                  }}
                >
                  View Profile →
                </button>
              </div>
            )}

            {/* Patient details — only show for new patients */}
            {!matchedPatient && (
              <>
                <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Patient Details
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { key: 'name', label: 'Full Name *', placeholder: 'Enter patient name' },
                    { key: 'phone', label: 'Phone / WhatsApp *', placeholder: 'Enter phone number' },
                    { key: 'age', label: 'Age', placeholder: 'Enter age' },
                    { key: 'address', label: 'Address', placeholder: 'Enter address' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={form[field.key]}
                        onChange={e => handleFormChange(field.key, e.target.value)}
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
                      Gender
                    </label>
                    <select
                      value={form.gender}
                      onChange={e => handleFormChange('gender', e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827', background: '#fff'
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Medical History
                    </label>
                    <input
                      type="text"
                      placeholder="Diabetes, BP, etc."
                      value={form.medical_history}
                      onChange={e => handleFormChange('medical_history', e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Name + phone fields for returning patient */}
            {matchedPatient && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {[
                  { key: 'name', label: 'Full Name *', placeholder: 'Enter patient name' },
                  { key: 'phone', label: 'Phone / WhatsApp *', placeholder: 'Enter phone number' },
                  { key: 'address', label: 'Address', placeholder: 'Enter address' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      {field.label}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={e => handleFormChange(field.key, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #fde68a', fontSize: '14px',
                        outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Prescription section */}
            <div style={{
              borderTop: '1px solid #f3f4f6', paddingTop: '20px', marginTop: '4px'
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Today's Visit Notes & Prescription
                <span style={{ fontSize: '12px', fontWeight: '400', color: '#9ca3af', marginLeft: '8px' }}>
                  (optional)
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'symptoms', label: 'Symptoms', placeholder: 'Describe patient symptoms...' },
                  { key: 'diagnosis', label: 'Diagnosis', placeholder: 'Enter diagnosis...' },
                  { key: 'prescription', label: 'Prescription / Medicines', placeholder: 'e.g. Paracetamol 500mg - twice daily for 5 days...' },
                  { key: 'notes', label: 'Additional Notes', placeholder: 'Any additional notes...' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      {field.label}
                    </label>
                    <textarea
                      placeholder={field.placeholder}
                      value={prescription[field.key]}
                      onChange={e => setPrescription({ ...prescription, [field.key]: e.target.value })}
                      rows={field.key === 'prescription' ? 3 : 2}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827', resize: 'vertical',
                        boxSizing: 'border-box', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={prescription.follow_up_date}
                    onChange={e => setPrescription({ ...prescription, follow_up_date: e.target.value })}
                    style={{
                      padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', fontSize: '14px',
                      outline: 'none', color: '#111827'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={handleAdd} disabled={saving} style={{
                background: '#16a34a', color: '#fff', padding: '10px 24px',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Saving...' : matchedPatient ? 'Save Visit & Go to Profile' : 'Add Patient'}
              </button>
              <button onClick={() => { setShowForm(false); setMatchedPatient(null) }} style={{
                background: '#fff', color: '#6b7280', padding: '10px 24px',
                borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '14px'
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by name, phone or MedFlow ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: '8px',
              border: '1px solid #e5e7eb', fontSize: '14px',
              outline: 'none', color: '#111827', boxSizing: 'border-box',
              background: '#fff'
            }}
          />
        </div>

        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              {search ? 'No patients found' : 'No patients yet — click "+ Add Patient" to add one'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['MedFlow ID', 'Name', 'Phone', 'Age', 'Gender', 'Actions'].map(h => (
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
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                      {p.medflow_id || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      <Link href={`/patients/${p.id}`} style={{ color: '#16a34a', textDecoration: 'none' }}>
                        {p.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.phone}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.age || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.gender || '—'}</td>
                    <td style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                      <Link href={`/patients/${p.id}`} style={{
                        background: '#f0fdf4', color: '#16a34a', padding: '6px 12px',
                        borderRadius: '6px', border: '1px solid #bbf7d0',
                        fontSize: '12px', fontWeight: '500', textDecoration: 'none'
                      }}>
                        View History
                      </Link>
                      <button onClick={() => handleDelete(p.id)} style={{
                        background: '#fff5f5', color: '#ef4444', padding: '6px 12px',
                        borderRadius: '6px', border: '1px solid #fecaca',
                        fontSize: '12px', cursor: 'pointer', fontWeight: '500'
                      }}>
                        Delete
                      </button>
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