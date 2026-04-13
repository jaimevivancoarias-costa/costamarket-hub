import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const COSTADRON_URL = import.meta.env.VITE_COSTADRON_URL || 'https://costadron.vercel.app'

export default function Hub() {
  const { perfil, unidades, logout } = useAuth()
  const [abriendo, setAbriendo] = useState(null)
  const [cols, setCols] = useState(
    window.innerWidth < 600 ? '1fr' : window.innerWidth < 900 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
  )

  useEffect(() => {
    const handle = () => setCols(
      window.innerWidth < 600 ? '1fr' : window.innerWidth < 900 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'
    )
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  async function abrirUnidad(unidad) {
    if (!unidad.activa || !unidad.url) return
    setAbriendo(unidad.unidad_id)
    try {
      if (unidad.unidad_id === 'costadron') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          window.open(`${COSTADRON_URL}?hub_token=${session.access_token}`, '_blank')
        } else {
          window.open(COSTADRON_URL, '_blank')
        }
      } else {
        window.open(unidad.url, '_blank')
      }
    } catch (err) {
      window.open(unidad.url, '_blank')
    } finally {
      setAbriendo(null)
    }
  }

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CM'

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Topbar */}
      <div style={{
        background: '#022847',
        height: '56px',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="CostaMarket"
            style={{ height: '34px', width: 'auto' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {perfil?.super_admin && (
            <a href="/admin" style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none', padding: '4px 8px',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
            }}>
              Admin
            </a>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: '20px', padding: '4px 10px 4px 5px',
          }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#0D6CB0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: '500', color: 'white',
            }}>{iniciales}</div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
              {perfil?.nombre?.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: '11px', padding: '4px',
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1rem 1.25rem' }}>
        <div style={{
          fontSize: '10px', fontWeight: '500', letterSpacing: '0.1em',
          color: '#0D6CB0', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          Panel de control · CostaMarket
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#022847', margin: '0 0 4px' }}>
          Bienvenido{perfil?.nombre ? `, ${perfil.nombre.split(' ')[0]}.` : '.'}
        </h1>
      </div>

      {/* Grid de tarjetas */}
      <div style={{
        maxWidth: '980px', margin: '0 auto',
        padding: '0 1rem 3rem',
        display: 'grid',
        gridTemplateColumns: cols,
        gap: '12px',
      }}>
        {unidades.map(unidad => {
          const bloqueada = !unidad.activa
          const cargando = abriendo === unidad.unidad_id

          return (
            <div
              key={unidad.unidad_id}
              onClick={() => !bloqueada && abrirUnidad(unidad)}
              style={{
                background: 'white',
                border: '0.5px solid #d4e0eb',
                borderRadius: '14px',
                overflow: 'hidden',
                cursor: bloqueada ? 'default' : 'pointer',
                opacity: bloqueada ? 0.6 : 1,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => {
                if (!bloqueada) e.currentTarget.style.borderColor = '#0D6CB0'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#d4e0eb'
              }}
            >
              {/* Banner */}
              <div style={{
                height: '140px',
                backgroundImage: 'url(/' + unidad.unidad_id + '-card.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}>
                {bloqueada && (
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '10px', fontWeight: '500', letterSpacing: '0.05em',
                    padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase',
                  }}>
                    Próximamente
                  </div>
                )}
              </div>

              {/* Cuerpo */}
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#022847', marginBottom: '4px' }}>
                  {unidad.nombre}
                {!bloqueada && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#0D6CB0' }}>
                      {cargando ? 'Abriendo...' : 'Abrir →'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
