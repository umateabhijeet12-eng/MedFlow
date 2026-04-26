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

export default function Patients() {
  const router = useRouter()
  const [patients, setPatients] = useState([])
  const [clinic, setClinic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    address: '',
    medical_history: '',
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

  const handleAdd = async () => {
    if (!form.name || !form.phone) return
    setSaving(true)
    await supabase.from('patients').insert([{
      clinic_id: clinic.id,
      ...form,
    }])
    setForm({ name: '', phone: '', age: '', gender: '', address: '', medical_history: '' })
    setShowForm(false)
    await fetchPatients(clinic.id)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('patients').delete().eq('id', id)
    await fetchPatients(clinic.id)
  }

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      <NavBar />
      <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Patients</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {clinic?.clinic_name || 'Your clinic'} · {patients.length} patients
            </p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            background: '#16a34a', color: '#fff', padding: '10px 20px',
            borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: '500'
          }}>
            + Add Patient
          </button>
        </div>

        {/* Add patient form */}
        {showForm && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
              New Patient
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'name', label: 'Full Name', placeholder: 'Enter patient name' },
                { key: 'phone', label: 'Phone / WhatsApp', placeholder: 'Enter phone number' },
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
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
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
                  onChange={e => setForm({ ...form, medical_history: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={handleAdd} disabled={saving} style={{
                background: '#16a34a', color: '#fff', padding: '10px 24px',
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Saving...' : 'Add Patient'}
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

        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by name or phone..."
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

        {/* Patients list */}
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
                  {['Name', 'Phone', 'Age', 'Gender', 'Medical History', 'Actions'].map(h => (
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
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
  <Link href={`/patients/${p.id}`} style={{ color: '#16a34a', textDecoration: 'none' }}>
    {p.name}
  </Link>
</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.phone}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.age || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.gender || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6b7280' }}>{p.medical_history || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
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