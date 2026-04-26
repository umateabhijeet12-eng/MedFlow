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

export default function Settings() {
  const router = useRouter()
  const [clinic, setClinic] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingServices, setSavingServices] = useState(false)
  const [tab, setTab] = useState('clinic')
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [clinicForm, setClinicForm] = useState({
    clinic_name: '',
    doctor_name: '',
    clinic_phone: '',
    clinic_city: '',
    working_hours_start: '',
    working_hours_end: '',
    appointment_duration: '30',
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
        setClinicForm({
          clinic_name: clinicData.clinic_name || '',
          doctor_name: clinicData.doctor_name || '',
          clinic_phone: clinicData.clinic_phone || '',
          clinic_city: clinicData.clinic_city || '',
          working_hours_start: clinicData.working_hours_start || '09:00',
          working_hours_end: clinicData.working_hours_end || '18:00',
          appointment_duration: String(clinicData.appointment_duration || '30'),
        })
        await fetchServices(clinicData.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchServices = async (clinicId) => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })
    setServices(data || [])
  }

  const saveClinic = async () => {
    setSaving(true)
    await supabase
      .from('clinics')
      .update({
        clinic_name: clinicForm.clinic_name,
        doctor_name: clinicForm.doctor_name,
        clinic_phone: clinicForm.clinic_phone,
        clinic_city: clinicForm.clinic_city,
        working_hours_start: clinicForm.working_hours_start,
        working_hours_end: clinicForm.working_hours_end,
        appointment_duration: parseInt(clinicForm.appointment_duration),
      })
      .eq('id', clinic.id)
    setSaving(false)
    alert('Clinic details saved!')
  }

  const updateServicePrice = (id, price) => {
    setServices(services.map(s => s.id === id ? { ...s, price: parseInt(price) || 0 } : s))
  }

  const updateServiceName = (id, name) => {
    setServices(services.map(s => s.id === id ? { ...s, name } : s))
  }

  const toggleService = async (id, current) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    await fetchServices(clinic.id)
  }

  const saveServices = async () => {
    setSavingServices(true)
    for (const service of services) {
      await supabase
        .from('services')
        .update({ name: service.name, price: service.price })
        .eq('id', service.id)
    }
    setSavingServices(false)
    alert('Services saved!')
  }

  const addService = async () => {
    if (!newService.name) return
    await supabase.from('services').insert([{
      clinic_id: clinic.id,
      name: newService.name,
      price: parseInt(newService.price) || 0,
    }])
    setNewService({ name: '', price: '' })
    await fetchServices(clinic.id)
  }

  const deleteService = async (id) => {
    await supabase.from('services').delete().eq('id', id)
    await fetchServices(clinic.id)
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

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Settings</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Manage your clinic details and services
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '12px 16px',
          marginBottom: '24px', display: 'flex', gap: '8px'
        }}>
          {[
            { key: 'clinic', label: 'Clinic Details' },
            { key: 'services', label: 'Services & Rates' },
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

        {/* Clinic Details Tab */}
        {tab === 'clinic' && (
          <div style={{
            background: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', padding: '24px'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
              Clinic Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'clinic_name', label: 'Clinic Name', placeholder: 'Enter clinic name' },
                { key: 'doctor_name', label: 'Doctor Name', placeholder: 'Enter doctor name' },
                { key: 'clinic_phone', label: 'Phone', placeholder: '+91 98765 43210' },
                { key: 'clinic_city', label: 'City', placeholder: 'Enter city' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={clinicForm[field.key]}
                    onChange={e => setClinicForm({ ...clinicForm, [field.key]: e.target.value })}
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
                  Opening Time
                </label>
                <input
                  type="time"
                  value={clinicForm.working_hours_start}
                  onChange={e => setClinicForm({ ...clinicForm, working_hours_start: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Closing Time
                </label>
                <input
                  type="time"
                  value={clinicForm.working_hours_end}
                  onChange={e => setClinicForm({ ...clinicForm, working_hours_end: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                  Appointment Duration
                </label>
                <select
                  value={clinicForm.appointment_duration}
                  onChange={e => setClinicForm({ ...clinicForm, appointment_duration: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827', background: '#fff', boxSizing: 'border-box'
                  }}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>
            <button onClick={saveClinic} disabled={saving} style={{
              background: '#16a34a', color: '#fff', padding: '10px 24px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500', marginTop: '20px',
              opacity: saving ? 0.7 : 1
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Services Tab */}
        {tab === 'services' && (
          <div>
            {/* Add new service */}
            <div style={{
              background: '#fff', borderRadius: '12px',
              border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px'
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                Add New Service
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Service name (e.g. Teeth Whitening)"
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  style={{
                    flex: 2, padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827'
                  }}
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', fontSize: '14px',
                    outline: 'none', color: '#111827'
                  }}
                />
                <button onClick={addService} style={{
                  background: '#16a34a', color: '#fff', padding: '10px 20px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap'
                }}>
                  + Add
                </button>
              </div>
            </div>

            {/* Services list */}
            <div style={{
              background: '#fff', borderRadius: '12px',
              border: '1px solid #e5e7eb', overflow: 'hidden'
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                  Your Services ({services.length})
                </h2>
                <button onClick={saveServices} disabled={savingServices} style={{
                  background: '#16a34a', color: '#fff', padding: '7px 16px',
                  borderRadius: '7px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '500', opacity: savingServices ? 0.7 : 1
                }}>
                  {savingServices ? 'Saving...' : 'Save All'}
                </button>
              </div>

              {services.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
                  No services yet — add your first service above
                </div>
              ) : (
                <div>
                  {services.map((service, i) => (
                    <div key={service.id} style={{
                      padding: '14px 20px',
                      borderBottom: i < services.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      opacity: service.is_active ? 1 : 0.5
                    }}>
                      <input
                        type="text"
                        value={service.name}
                        onChange={e => updateServiceName(service.id, e.target.value)}
                        style={{
                          flex: 2, padding: '8px 12px', borderRadius: '7px',
                          border: '1px solid #e5e7eb', fontSize: '14px',
                          outline: 'none', color: '#111827'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>₹</span>
                        <input
                          type="number"
                          value={service.price}
                          onChange={e => updateServicePrice(service.id, e.target.value)}
                          style={{
                            width: '100px', padding: '8px 12px', borderRadius: '7px',
                            border: '1px solid #e5e7eb', fontSize: '14px',
                            outline: 'none', color: '#111827'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => toggleService(service.id, service.is_active)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: 'none',
                          cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                          background: service.is_active ? '#f0fdf4' : '#f9fafb',
                          color: service.is_active ? '#16a34a' : '#9ca3af',
                        }}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          border: '1px solid #fecaca', background: '#fff5f5',
                          cursor: 'pointer', fontSize: '12px', color: '#ef4444'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
