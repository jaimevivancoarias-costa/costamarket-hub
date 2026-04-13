import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        cargarPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        cargarPerfil(session.user.id)
      } else {
        setUser(null)
        setPerfil(null)
        setUnidades([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(authId) {
    try {
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authId)
        .single()

      if (!usuarioData) {
        setLoading(false)
        return
      }

      setPerfil(usuarioData)

      if (usuarioData.super_admin) {
        const { data: todasUnidades } = await supabase
          .from('unidades_negocio')
          .select('*')
          .order('orden')
        setUnidades(todasUnidades || [])
      } else {
        const { data: misUnidades } = await supabase
  .from('unidades_negocio')
  .select('*, usuario_unidades!inner(rol)')
  .eq('usuario_unidades.usuario_id', authId)
  .eq('usuario_unidades.activo', true)
  .order('orden')
setUnidades((misUnidades || []).map(u => ({ ...u, unidad_id: u.id, rol: u.usuario_unidades[0]?.rol })))
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, perfil, unidades, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
