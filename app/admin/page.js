'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminPanel() {
  const router = useRouter()
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ msg91_api_key: '', whatsapp_number: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Check if admin
      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!adminCheck) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      await fetchClinics()
      setLoading(false)
    }
    init()
  }, [])

  const fetchClinics = async () => {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false })
    setClinics(data || [])
  }

  const handleEdit = (clinic) => {
    setEditingId(clinic.id)
    setEditForm({
      msg91_api_key: clinic.msg91_api_key || '',
      whatsapp_number: clinic.whatsapp_number || '',
    })
  }

  const handleSave = async (id) => {
    setSaving(true)
    await supabase
      .from('clinics')
      .update({
        msg91_api_key: editForm.msg91_api_key,
        whatsapp_number: editForm.whatsapp_number,
        is_active: true,
      })
      .eq('id', id)
    setEditingId(null)
    await fetchClinics()
    setSaving(false)
  }

  const toggleActive = async (id, current) => {
    await supabase
      .from('clinics')
      .update({ is_active: !current })
      .eq('id', id)
    await fetchClinics()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf8' }}>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  if (unauthorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf8' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px' }}>🚫</p>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginTop: '16px' }}>Access Denied</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>You don't have permission to view this page.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf8' }}>
      {/* Admin navbar */}
      <nav style={{
        background: '#111827', padding: '0 24px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '30px', height: '30px', background: '#16a34a',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>M</span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '16px', color: '#fff' }}>MedFlow</span>
          <span style={{
            background: '#16a34a', color: '#fff', fontSize: '11px',
            fontWeight: '600', padding: '2px 8px', borderRadius: '20px'
          }}>ADMIN</span>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{
          padding: '7px 14px', borderRadius: '7px', border: '1px solid #374151',
          background: 'transparent', fontSize: '13px', color: '#9ca3af', cursor: 'pointer'
        }}>
          Sign out
        </button>
      </nav>

      <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#111827' }}>Admin Panel</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {clinics.length} clinic{clinics.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Clinics', value: clinics.length, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Active Clinics', value: clinics.filter(c => c.is_active).length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'MSG91 Connected', value: clinics.filter(c => c.msg91_api_key).length, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
          ].map(card => (
            <div key={card.label} style={{
              background: card.bg, border: `1px solid ${card.border}`,
              borderRadius: '12px', padding: '20px'
            }}>
              <p style={{ fontSize: '13px', color: card.color, fontWeight: '500', marginBottom: '8px' }}>{card.label}</p>
              <p style={{ fontSize: '36px', fontWeight: '700', color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Clinics table */}
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>All Clinics</h2>
          </div>

          {clinics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
              No clinics registered yet
            </div>
          ) : (
            <div>
              {clinics.map((clinic, i) => (
                <div key={clinic.id} style={{
                  padding: '20px', borderBottom: i < clinics.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                          {clinic.clinic_name}
                        </h3>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: clinic.is_active ? '#f0fdf4' : '#f9fafb',
                          color: clinic.is_active ? '#16a34a' : '#9ca3af',
                          border: `1px solid ${clinic.is_active ? '#bbf7d0' : '#e5e7eb'}`
                        }}>
                          {clinic.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: clinic.msg91_api_key ? '#eff6ff' : '#fff5f5',
                          color: clinic.msg91_api_key ? '#2563eb' : '#ef4444',
                          border: `1px solid ${clinic.msg91_api_key ? '#bfdbfe' : '#fecaca'}`
                        }}>
                          {clinic.msg91_api_key ? 'MSG91 ✓' : 'MSG91 ✗'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>
                        {clinic.doctor_name} · {clinic.doctor_specialization} · {clinic.clinic_city}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                        📞 {clinic.clinic_phone} · ⏰ {clinic.working_hours_start} – {clinic.working_hours_end}
                      </p>
                      {clinic.whatsapp_number && (
                        <p style={{ fontSize: '13px', color: '#16a34a', marginTop: '2px' }}>
                          📲 WhatsApp: {clinic.whatsapp_number}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(clinic)} style={{
                        padding: '7px 14px', borderRadius: '7px',
                        border: '1px solid #e5e7eb', background: '#fff',
                        fontSize: '13px', color: '#374151', cursor: 'pointer'
                      }}>
                        Setup MSG91
                      </button>
                      <button onClick={() => toggleActive(clinic.id, clinic.is_active)} style={{
                        padding: '7px 14px', borderRadius: '7px',
                        border: 'none',
                        background: clinic.is_active ? '#fff5f5' : '#f0fdf4',
                        fontSize: '13px',
                        color: clinic.is_active ? '#ef4444' : '#16a34a',
                        cursor: 'pointer'
                      }}>
                        {clinic.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {/* MSG91 edit form */}
                  {editingId === clinic.id && (
                    <div style={{
                      marginTop: '16px', padding: '16px',
                      background: '#f9fafb', borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        MSG91 Configuration
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                            MSG91 API Key
                          </label>
                          <input
                            type="text"
                            placeholder="Enter MSG91 API key"
                            value={editForm.msg91_api_key}
                            onChange={e => setEditForm({ ...editForm, msg91_api_key: e.target.value })}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: '7px',
                              border: '1px solid #e5e7eb', fontSize: '13px',
                              outline: 'none', color: '#111827', boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                            WhatsApp Number
                          </label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={editForm.whatsapp_number}
                            onChange={e => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                            style={{
                              width: '100%', padding: '8px 12px', borderRadius: '7px',
                              border: '1px solid #e5e7eb', fontSize: '13px',
                              outline: 'none', color: '#111827', boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => handleSave(clinic.id)} disabled={saving} style={{
                          background: '#16a34a', color: '#fff', padding: '8px 16px',
                          borderRadius: '7px', border: 'none', cursor: 'pointer',
                          fontSize: '13px', fontWeight: '500', opacity: saving ? 0.7 : 1
                        }}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} style={{
                          background: '#fff', color: '#6b7280', padding: '8px 16px',
                          borderRadius: '7px', border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '13px'
                        }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}