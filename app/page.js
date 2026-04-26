import Link from 'next/link'

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '52px', height: '52px', background: '#16a34a',
          borderRadius: '14px', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ color: '#fff', fontSize: '22px' }}>M</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#111827' }}>MedFlow</h1>
        <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '15px' }}>
          Patient follow-up platform for clinics
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <Link href="/dashboard" style={{
          background: '#16a34a', color: '#fff', padding: '13px 24px',
          borderRadius: '10px', textAlign: 'center', fontWeight: '500',
          fontSize: '15px', border: 'none', cursor: 'pointer'
        }}>
          Go to Dashboard
        </Link>
        <Link href="/patients" style={{
          background: '#f0fdf4', color: '#16a34a', padding: '13px 24px',
          borderRadius: '10px', textAlign: 'center', fontWeight: '500',
          fontSize: '15px', border: '1px solid #bbf7d0', cursor: 'pointer'
        }}>
          Manage Patients
        </Link>
      </div>
    </main>
  )
}