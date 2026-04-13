import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const UNIDADES = [
  { id: 'costadron', nombre: 'COSTADRON' },
  { id: 'coastalogistics', nombre: 'CostaLogistics' },
  { id: 'costaice', nombre: 'CostaICE' },
  { id: 'costatech', nombre: 'CostaTech' },
  { id: 'costamarket', nombre: 'CostaMarket' },
  { id: 'costabac', nombre: 'CostaBac' },
]

export default function Admin() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [permisos, setPermisos] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajePermiso, setMensajePermiso] = useState('')
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', rol: 'piloto', password: '' })
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (perfil && !perfil.super_admin) navigate('/hub')
  }, [perfil])

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const { data: usrs } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    const { data: perms } = await supabase
      .from('usuario_unidades')
      .select('*')
      .eq('activo', true)

    const mapa = {}
    perms?.forEach(p => {
      if (!mapa[p.usuario_id]) mapa[p.usuario_id] = {}
      mapa[p.usuario_id][p.unidad_id] = p.rol
    })

    setUsuarios(usrs || [])
    setPermisos(mapa)
    setLoading(false)
  }

 async function togglePermiso(usuarioId, unidadId, rolActual) {
    if (rolActual) {
      await supabase
        .from('usuario_unidades')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('unidad_id', unidadId)
      setPermisos(prev => {
        const copia = { ...prev }
        if (copia[usuarioId]) delete copia[usuarioId][unidadId]
        return copia
      })
    } else {
      const rolPorDefecto = unidadId === 'costadron' ? 'piloto' : 'viewer'
      await supabase
        .from('usuario_unidades')
        .insert({ usuario_id: usuarioId, unidad_id: unidadId, rol: rolPorDefecto, activo: true })
      setPermisos(prev => ({
        ...prev,
        [usuarioId]: { ...(prev[usuarioId] || {}), [unidadId]: rolPorDefecto }
      }))
    }
    setMensajePermiso('Cambio guardado')
    setTimeout(() => setMensajePermiso(''), 2000)
  }

  async function cambiarRol(usuarioId, unidadId, nuevoRol) {
    await supabase
      .from('usuario_unidades')
      .update({ rol: nuevoRol })
      .eq('usuario_id', usuarioId)
      .eq('unidad_id', unidadId)
    setPermisos(prev => ({
      ...prev,
      [usuarioId]: { ...(prev[usuarioId] || {}), [unidadId]: nuevoRol }
    }))
  }

  async function crearUsuario() {
    if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) return
    setCreando(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
        email_confirm: true,
      })
      if (authError) throw authError

      await supabase.from('usuarios').insert({
        id: authData.user.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        activo: true,
        super_admin: false,
      })

      setMensaje(`Usuario ${nuevoUsuario.nombre} creado correctamente.`)
      setNuevoUsuario({ nombre: '', email: '', rol: 'piloto', password: '' })
      cargarDatos()
    } catch (err) {
      setMensaje(`Error: ${err.message}`)
    } finally {
      setCreando(false)
      setTimeout(() => setMensaje(''), 4000)
    }
  }

  const estiloInput = {
    padding: '8px 10px', fontSize: '13px',
    border: '1px solid #d4e0eb', borderRadius: '7px',
    outline: 'none', color: '#022847', background: 'white',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#5a7a94' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Topbar */}
      <div style={{ background: '#022847', height: '56px', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/hub" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>← Hub</a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>Administración de usuarios</span>
        </div>
      </div>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem' }}>

        {/* Crear usuario */}
        <div style={{ background: 'white', border: '0.5px solid #d4e0eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#022847', margin: '0 0 1rem' }}>Nuevo usuario</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#7a9ab5', display: 'block', marginBottom: '4px' }}>Nombre</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                value={nuevoUsuario.nombre}
                onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Italo Alcivar" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#7a9ab5', display: 'block', marginBottom: '4px' }}>Email</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                type="email"
                value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))}
                placeholder="italo@costamarket.ec" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#7a9ab5', display: 'block', marginBottom: '4px' }}>Contraseña inicial</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                type="password"
                value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#7a9ab5', display: 'block', marginBottom: '4px' }}>Rol base</label>
              <select style={{ ...estiloInput, boxSizing: 'border-box' }}
                value={nuevoUsuario.rol}
                onChange={e => setNuevoUsuario(p => ({ ...p, rol: e.target.value }))}>
                <option value="piloto">Piloto</option>
                <option value="jefe">Jefe</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={crearUsuario}
              disabled={creando}
              style={{
                padding: '8px 16px', background: '#022847', color: 'white',
                border: 'none', borderRadius: '7px', fontSize: '13px',
                fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {creando ? '...' : 'Crear'}
            </button>
          </div>
          {mensaje && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: mensaje.startsWith('Error') ? '#dc2626' : '#1a7a4a' }}>
              {mensaje}
            </div>
          )}
        </div>

        {/* Tabla de permisos */}
        <div style={{ background: 'white', border: '0.5px solid #d4e0eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid #eef2f6' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#022847', margin: 0 }}>Accesos por unidad</h2>
            {mensajePermiso && (
  <span style={{ fontSize: '12px', color: '#1a7a4a', marginLeft: '12px' }}>
    {mensajePermiso}
  </span>
)}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#7a9ab5', fontWeight: '500', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    Usuario
                  </th>
                  {UNIDADES.map(u => (
                    <th key={u.id} style={{ padding: '10px 12px', textAlign: 'center', color: '#7a9ab5', fontWeight: '500', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {u.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario, i) => (
                  <tr key={usuario.id} style={{ borderTop: '0.5px solid #eef2f6', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#022847' }}>{usuario.nombre}</div>
                      <div style={{ fontSize: '11px', color: '#7a9ab5' }}>{usuario.email || usuario.rol}</div>
                    </td>
                    {UNIDADES.map(unidad => {
                      const rolActual = permisos[usuario.id]?.[unidad.id]
                      return (
                        <td key={unidad.id} style={{ padding: '12px', textAlign: 'center' }}>
                          {rolActual ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <select
                                value={rolActual}
                                onChange={e => cambiarRol(usuario.id, unidad.id, e.target.value)}
                                style={{ fontSize: '11px', padding: '3px 6px', border: '1px solid #0D6CB0', borderRadius: '5px', color: '#0D6CB0', background: '#e6f1fb' }}
                              >
                                <option value="piloto">Piloto</option>
                                <option value="jefe">Jefe</option>
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => togglePermiso(usuario.id, unidad.id, rolActual)}
                                style={{ fontSize: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                quitar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => togglePermiso(usuario.id, unidad.id, null)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                border: '1.5px dashed #d4e0eb', background: 'none',
                                cursor: 'pointer', color: '#a0b8cc', fontSize: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto',
                              }}
                            >
                              +
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
