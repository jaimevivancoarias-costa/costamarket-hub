import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/hub')
    } catch (err) {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #022847 0%, #064979 60%, #0D6CB0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            background: 'white',
            borderRadius: '14px',
            padding: '12px 20px',
            display: 'inline-block',
            marginBottom: '1rem',
          }}>
            <img
              src="/logo.png"
              alt="CostaMarket"
              style={{ height: '50px', width: 'auto', display: 'block' }}
            />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
            Panel de control · El Oro, Ecuador
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '17px', fontWeight: '500', color: '#022847' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#5a7a94', marginBottom: '6px' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@costamarket.ec"
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '14px',
                  border: '1px solid #d4e0eb', borderRadius: '8px',
                  outline: 'none', boxSizing: 'border-box',
                  color: '#022847', background: '#ffffff',
                  colorScheme: 'light',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#5a7a94', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '14px',
                  border: '1px solid #d4e0eb', borderRadius: '8px',
                  outline: 'none', boxSizing: 'border-box',
                  color: '#022847', background: '#ffffff',
                  colorScheme: 'light',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '10px 12px',
                fontSize: '13px', color: '#dc2626', marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#7a9ab5' : '#022847',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '1.5rem' }}>
          CostaMarket © 2026 · El Oro, Ecuador
        </p>
      </div>
    </div>
  )
}
