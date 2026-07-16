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

export default function Patients() {
  const router = useRouter()
  const [patients, setPatients] = useState([])
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [matchedPatient, setMatchedPatient] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
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
    if (!updatedForm.phone || !clinic) {
      setMatchedPatient(null)
      setCandidates([])
      return
    }
    const cleanPhone = updatedForm.phone.replace(/\D/g, '').slice(-10)
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

    if (updatedForm.name) {
      const nameMatch = phoneMatches.find(p => namesLikelyMatch(p.name, updatedForm.name))
      if (nameMatch) {
        setMatchedPatient(nameMatch)
        setCandidates(phoneMatches)
        return
      }
    }

    setMatchedPatient(null)
    setCandidates(phoneMatches)
  }

  const handleFormChange = (key, value) => {
    const updated = { ...form, [key]: value }
    setForm(updated)
    if (key === 'name' || key === 'phone') {
      checkReturningPatient(updated)
    }
  }

  const selectCandidate = (patient) => {
    setMatchedPatient(patient)
    setForm(f => ({ ...f, name: patient.name, phone: patient.phone, address: patient.address || '' }))
  }

  const dismissCandidates = () => {
    setMatchedPatient(null)
    setCandidates([])
  }

  const handleAdd = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)

    const digitsOnly = (form.age || '').toString().replace(/[^0-9]/g, '')
    const cleanAge = digitsOnly.length > 0 ? parseInt(digitsOnly, 10) : null

    if (matchedPatient) {
      const hasPrescription = prescription.symptoms || prescription.diagnosis || prescription.prescription || prescription.notes
      if (hasPrescription) {
        const { error: rxError } = await supabase.from('prescriptions').insert([{
          clinic_id: clinic.id,
          patient_id: matchedPatient.id,
          doctor_name: clinic.doctor_name,
          symptoms: prescription.symptoms,
          diagnosis: prescription.diagnosis,
          prescription: prescription.prescription,
          notes: prescription.notes,
          follow_up_date: prescription.follow_up_date || null,
        }])
        if (rxError) {
          alert('Error saving prescription: ' + rxError.message)
          setSaving(false)
          return
        }
      }
      router.push(`/patients/${matchedPatient.id}`)
      return
    }

    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert([{
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        address: form.address,
        medical_history: form.medical_history,
        clinic_id: clinic.id,
        age: cleanAge,
      }])
      .select()
      .single()

    if (patientError) {
      alert('Error saving patient: ' + patientError.message)
      setSaving(false)
      return
    }

    if (newPatient) {
      const hasPrescription = prescription.symptoms || prescription.diagnosis || prescription.prescription || prescription.notes
      if (hasPrescription) {
        const { error: rxError } = await supabase.from('prescriptions').insert([{
          clinic_id: clinic.id,
          patient_id: newPatient.id,
          doctor_name: clinic.doctor_name,
          symptoms: prescription.symptoms,
          diagnosis: prescription.diagnosis,
          prescription: prescription.prescription,
          notes: prescription.notes,
          follow_up_date: prescription.follow_up_date || null,
        }])
        if (rxError) {
          alert('Patient saved, but error saving prescription: ' + rxError.message)
        }
      }
    }

    setForm({ name: '', phone: '', age: '', gender: '', address: '', medical_history: '' })
    setPrescription({ symptoms: '', diagnosis: '', prescription: '', notes: '', follow_up_date: '' })
    setMatchedPatient(null)
    setCandidates([])
    setShowForm(false)
    await fetchPatients(clinic.id)
    setSaving(false)
  }

  const confirmDelete = async () => {
    await supabase.from('patients').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
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
          <button onClick={() => { setShowForm(true); setMatchedPatient(null); setCandidates([]) }} style={{
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
                  <p style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                    Fill prescription below and click Save to add this visit to their history
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
              </div>
            )}

            {!matchedPatient && (
              <>
                <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Patient Details
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter patient name"
                      value={form.name}
                      onChange={e => handleFormChange('name', e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: `1px solid ${candidates.length > 0 ? '#bfdbfe' : '#e5e7eb'}`,
                        fontSize: '14px', outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter phone number"
                      value={form.phone}
                      onChange={e => handleFormChange('phone', e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: `1px solid ${candidates.length > 0 ? '#bfdbfe' : '#e5e7eb'}`,
                        fontSize: '14px', outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Age
                    </label>
                    <input
                      type="number"
                      placeholder="Enter age"
                      value={form.age}
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter address"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid #e5e7eb', fontSize: '14px',
                        outline: 'none', color: '#111827', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                      Gender
                    </label>
                    <select
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
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
                      onChange={e => setForm(f => ({ ...f, medical_history: e.target.value }))}
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
              <button onClick={() => { setShowForm(false); setMatchedPatient(null); setCandidates([]) }} style={{
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
                      <button onClick={() => setDeleteTarget(p)} style={{
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

      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '360px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Delete {deleteTarget.name}?
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={confirmDelete} style={{
                background: '#ef4444', color: '#fff', padding: '9px 18px',
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}>
                Delete
              </button>
              <button onClick={() => setDeleteTarget(null)} style={{
                background: '#fff', color: '#6b7280', padding: '9px 18px',
                borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '14px'
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}