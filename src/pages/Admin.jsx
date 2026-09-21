import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const UNIDADES = [
  { id: 'costadron', nombre: 'COSTADRON', activa: true },
  { id: 'coastalogistics', nombre: 'CostaLogistics', activa: true },
  { id: 'costaice', nombre: 'Producción', activa: true },
  { id: 'costatech', nombre: 'CostaTech', activa: false },
  { id: 'costamarket', nombre: 'CostaMarket', activa: false },
  { id: 'costabac', nombre: 'CostaBac', activa: false },
]

// Roles disponibles por módulo, según lo que cada app reconoce.
//   CostaDron -> usuarios.rol   CostaLogistics -> usuario_unidades.rol
//   Producción -> usuario_finca.rol (se elige por finca, no acá).
const ROLES_POR_UNIDAD = {
  costadron: [['piloto', 'Piloto'], ['jefe', 'Jefe'], ['contador', 'Contadora']],
  coastalogistics: [['jefe', 'Jefe'], ['jefe_visor', 'Jefe visor'], ['supervisor', 'Supervisor'], ['materiales', 'Materiales (solo materiales/devoluciones)']],
  costaice: [['bodeguero', 'Bodeguero'], ['contador', 'Contadora'], ['jefe', 'Jefe']],
}
const ROLES_DEFAULT = [['piloto', 'Piloto'], ['jefe', 'Jefe'], ['viewer', 'Viewer'], ['admin', 'Admin']]
const rolesDeUnidad = id => ROLES_POR_UNIDAD[id] || ROLES_DEFAULT

export default function Admin() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState([])
  const [permisos, setPermisos] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajePermiso, setMensajePermiso] = useState('')
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '', modulos: {}, fincas: [] })
  const [creando, setCreando] = useState(false)
  const [fincas, setFincas] = useState([])       // fincas de producción para el selector
  const [fincaSel, setFincaSel] = useState('')   // finca elegida en el selector
  const [rolFincaSel, setRolFincaSel] = useState('bodeguero')
  const [fincasMsg, setFincasMsg] = useState('') // aviso si no cargan las fincas
  const [dronZona, setDronZona] = useState('Jambelí')  // zona del piloto/contador de CostaDron
  const [editUser, setEditUser] = useState(null)  // { id, nombre, password } al editar

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
      .order('activo', { ascending: false })
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

    // Fincas de producción para el selector (vía la función segura).
    try {
      const { data: fr, error: fe } = await supabase.functions.invoke('admin-usuarios', { body: { action: 'fincas' } })
      if (fe) setFincasMsg('No se pudieron cargar las fincas: ' + fe.message + ' (¿la función admin-usuarios está desplegada?)')
      else if (fr?.error) setFincasMsg('No se pudieron cargar las fincas: ' + fr.error)
      else if (fr?.fincas?.length) { setFincas(fr.fincas); setFincasMsg('') }
      else setFincasMsg('No llegaron fincas. Revisa que la función admin-usuarios esté desplegada y actualizada.')
    } catch (e) {
      setFincasMsg('No se pudieron cargar las fincas: ' + e.message)
    }
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
      const rolPorDefecto = unidadId === 'costadron' ? 'piloto' : unidadId === 'costaice' ? 'bodeguero' : 'viewer'
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

  async function guardarEdicion() {
    if (!editUser) return
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'editar', id: editUser.id, nombre: editUser.nombre, password: editUser.password || null },
    })
    if (error || data?.error) { setMensajePermiso('Error: ' + (data?.error || error.message)) }
    else { setMensajePermiso('Usuario actualizado'); setEditUser(null); cargarDatos() }
    setTimeout(() => setMensajePermiso(''), 3000)
  }

  async function toggleActivo(u) {
    const activar = !u.activo
    if (!activar && !window.confirm(`¿Desactivar a ${u.nombre}? No podrá entrar a ningún módulo. Se puede reactivar después.`)) return
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'desactivar', id: u.id, activar },
    })
    if (error || data?.error) { setMensajePermiso('Error: ' + (data?.error || error.message)) }
    else { setMensajePermiso(activar ? 'Usuario reactivado' : 'Usuario desactivado'); cargarDatos() }
    setTimeout(() => setMensajePermiso(''), 3000)
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
      // Cada módulo marcado con su rol. Producción (costaice) toma el rol del
      // primer acceso de finca. CostaDron define además el rol del perfil.
      const rolProd = nuevoUsuario.fincas[0]?.rol || 'bodeguero'
      const unidades = Object.keys(nuevoUsuario.modulos)
        .map(id => ({ unidad_id: id, rol: id === 'costaice' ? rolProd : nuevoUsuario.modulos[id] }))
      const perfilRol = nuevoUsuario.modulos.costadron || 'materiales'
      const perfilZona = nuevoUsuario.modulos.costadron ? dronZona : null

      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: {
          action: 'crear',
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          password: nuevoUsuario.password,
          perfilRol,
          perfilZona,
          unidades,
          fincas: nuevoUsuario.fincas,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setMensaje(`Usuario ${nuevoUsuario.nombre} creado correctamente.`)
      setNuevoUsuario({ nombre: '', email: '', password: '', modulos: {}, fincas: [] })
      setFincaSel(''); setRolFincaSel('bodeguero')
      cargarDatos()
    } catch (err) {
      setMensaje(`Error: ${err.message}`)
    } finally {
      setCreando(false)
      setTimeout(() => setMensaje(''), 5000)
    }
  }

  const estiloInput = {
    padding: '8px 10px', fontSize: '13px',
    border: '1px solid #d4e0eb', borderRadius: '7px',
    outline: 'none', color: '#022847', background: 'white',
  }
  const labelSt = { fontSize: '11px', color: '#7a9ab5', display: 'block', marginBottom: '4px' }

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelSt}>Nombre</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                value={nuevoUsuario.nombre}
                onChange={e => setNuevoUsuario(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre y apellido" />
            </div>
            <div>
              <label style={labelSt}>Correo</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                type="email" value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario(p => ({ ...p, email: e.target.value }))}
                placeholder="correo@costamarket.ec" />
            </div>
            <div>
              <label style={labelSt}>Contraseña (la pones tú)</label>
              <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }}
                type="text" value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario(p => ({ ...p, password: e.target.value }))}
                placeholder="mínimo 6 caracteres" />
            </div>
          </div>

          <label style={labelSt}>Módulos y rol</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '8px', marginBottom: '12px' }}>
            {UNIDADES.filter(u => u.activa).map(u => {
              const on = nuevoUsuario.modulos[u.id] != null
              const etq = u.id === 'costaice' ? 'Producción' : u.nombre
              return (
                <div key={u.id} style={{ border: '0.5px solid ' + (on ? '#0D6CB0' : '#d4e0eb'), background: on ? '#f2f8fd' : 'white', borderRadius: '9px', padding: '9px 11px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={on}
                      onChange={() => setNuevoUsuario(p => {
                        const m = { ...p.modulos }
                        if (on) delete m[u.id]
                        else m[u.id] = u.id === 'costaice' ? 'si' : rolesDeUnidad(u.id)[0][0]
                        return { ...p, modulos: m }
                      })} />
                    {etq}
                  </label>
                  {on && u.id !== 'costaice' && (
                    <select style={{ ...estiloInput, width: '100%', boxSizing: 'border-box', marginTop: '8px', fontSize: '12px' }}
                      value={nuevoUsuario.modulos[u.id]}
                      onChange={e => setNuevoUsuario(p => ({ ...p, modulos: { ...p.modulos, [u.id]: e.target.value } }))}>
                      {rolesDeUnidad(u.id).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  {on && u.id === 'costadron' && (
                    <select style={{ ...estiloInput, width: '100%', boxSizing: 'border-box', marginTop: '6px', fontSize: '12px' }}
                      value={dronZona} onChange={e => setDronZona(e.target.value)}>
                      <option value="Jambelí">Zona Jambelí</option>
                      <option value="Puná">Zona Puná</option>
                      <option value="Ambas">Ambas zonas</option>
                    </select>
                  )}
                </div>
              )
            })}
          </div>

          {nuevoUsuario.modulos.costaice && (
            <div style={{ border: '0.5px dashed #0D6CB0', background: '#f2f8fd', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#0D6CB0', fontWeight: 600, marginBottom: '8px' }}>Producción · finca y rol (puedes agregar varias)</div>
              {fincasMsg && (
                <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', borderRadius: '7px', padding: '8px 10px', marginBottom: '10px' }}>
                  {fincasMsg}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={labelSt}>Finca</label>
                  <select style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }} value={fincaSel} onChange={e => setFincaSel(e.target.value)}>
                    <option value="">Elegir finca</option>
                    {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Rol en la finca</label>
                  <select style={{ ...estiloInput, width: '100%', boxSizing: 'border-box' }} value={rolFincaSel} onChange={e => setRolFincaSel(e.target.value)}>
                    <option value="bodeguero">Bodeguero</option>
                    <option value="contador">Contadora</option>
                    <option value="jefe">Jefe</option>
                  </select>
                </div>
                <button onClick={() => {
                  if (!fincaSel) return
                  const f = fincas.find(x => x.id === fincaSel)
                  setNuevoUsuario(p => ({ ...p, fincas: [...p.fincas.filter(x => x.finca_id !== fincaSel), { finca_id: fincaSel, nombre: f?.nombre, rol: rolFincaSel }] }))
                  setFincaSel('')
                }} style={{ padding: '8px 14px', background: 'white', color: '#022847', border: '0.5px solid #0D6CB0', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
              </div>
              {nuevoUsuario.fincas.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {nuevoUsuario.fincas.map(f => (
                    <span key={f.finca_id} style={{ fontSize: '12px', background: 'white', border: '0.5px solid #d4e0eb', borderRadius: '20px', padding: '4px 10px' }}>
                      {f.nombre} · {f.rol}
                      <span onClick={() => setNuevoUsuario(p => ({ ...p, fincas: p.fincas.filter(x => x.finca_id !== f.finca_id) }))}
                            style={{ marginLeft: '7px', color: '#a33', cursor: 'pointer' }}>✕</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={crearUsuario}
            disabled={creando}
            style={{
              padding: '10px 18px', background: '#022847', color: 'white',
              border: 'none', borderRadius: '7px', fontSize: '13px',
              fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {creando ? 'Creando...' : 'Crear usuario'}
          </button>
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
                  <tr key={usuario.id} style={{ borderTop: '0.5px solid #eef2f6', background: i % 2 === 0 ? 'white' : '#fafbfc', opacity: usuario.activo ? 1 : 0.5 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500', color: '#022847' }}>
                        {usuario.nombre}{!usuario.activo && <span style={{ fontSize: '10px', color: '#b45309', marginLeft: '6px' }}>(inactivo)</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#7a9ab5' }}>{usuario.email || usuario.rol}</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button onClick={() => setEditUser({ id: usuario.id, nombre: usuario.nombre, password: '' })}
                          style={{ fontSize: '11px', color: '#0D6CB0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Editar</button>
                        <button onClick={() => toggleActivo(usuario)}
                          style={{ fontSize: '11px', color: usuario.activo ? '#dc2626' : '#1a7a4a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {usuario.activo ? 'Desactivar' : 'Reactivar'}</button>
                      </div>
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
                                {rolesDeUnidad(unidad.id).map(([v, l]) => (
                                  <option key={v} value={v}>{l}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => togglePermiso(usuario.id, unidad.id, rolActual)}
                                style={{ fontSize: '10px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                Quitar
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

      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,40,71,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
             onClick={() => setEditUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#022847', margin: '0 0 1rem' }}>Editar usuario</h2>
            <label style={labelSt}>Nombre</label>
            <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box', marginBottom: '12px' }}
              value={editUser.nombre} onChange={e => setEditUser(p => ({ ...p, nombre: e.target.value }))} />
            <label style={labelSt}>Nueva contraseña (dejar en blanco para no cambiarla)</label>
            <input style={{ ...estiloInput, width: '100%', boxSizing: 'border-box', marginBottom: '16px' }}
              type="text" value={editUser.password} placeholder="mínimo 6 caracteres"
              onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditUser(null)} style={{ padding: '9px 16px', background: 'white', color: '#022847', border: '0.5px solid #d4e0eb', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarEdicion} style={{ padding: '9px 16px', background: '#022847', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
