// Edge Function: admin-usuarios
// Crea cuentas (correo + contraseña) y asigna módulos y fincas, en un solo
// paso, SOLO para super_admins. Usa la llave service role que Supabase
// inyecta automáticamente (SUPABASE_SERVICE_ROLE_KEY): nunca va al navegador.
//
// Acciones (POST con body JSON):
//   { action: "fincas" }  -> lista de fincas de producción para el selector
//   { action: "crear", nombre, email, password,
//     unidades: [{ unidad_id, rol }],
//     fincas:   [{ finca_id, rol }] }  -> crea la cuenta y asigna todo
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    // 1) Verificar que quien llama es super_admin
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'No autenticado' }, 401)
    const { data: u, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !u?.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: perfil } = await admin
      .from('usuarios').select('super_admin').eq('id', u.user.id).maybeSingle()
    if (!perfil?.super_admin) return json({ error: 'Solo un super admin puede hacer esto.' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = body.action

    // 2) Lista de fincas para el selector
    if (action === 'fincas') {
      const { data, error } = await admin.schema('produccion')
        .from('finca').select('id, nombre, codigo, activa')
        .eq('activa', true).order('nombre')
      if (error) return json({ error: error.message }, 400)
      return json({ fincas: data || [] })
    }

    // 3) Crear usuario completo
    if (action === 'crear') {
      const nombre = String(body.nombre || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const unidades = Array.isArray(body.unidades) ? body.unidades : []
      const fincas = Array.isArray(body.fincas) ? body.fincas : []
      if (!nombre || !email || !password) return json({ error: 'Faltan nombre, correo o contraseña.' }, 400)
      if (password.length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)

      // Crear la cuenta ya confirmada (no necesita verificar correo)
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (cErr) return json({ error: cErr.message }, 400)
      const uid = created.user.id

      // Perfil visible en el Hub. 'rol' es un campo técnico que la app no usa
      // para permisos; se deja en 'materiales' (básico).
      const { error: pErr } = await admin.from('usuarios').upsert({
        id: uid, nombre, email, rol: 'materiales', activo: true, super_admin: false,
      }, { onConflict: 'id' })
      if (pErr) return json({ error: 'Cuenta creada, pero falló el perfil: ' + pErr.message }, 400)

      // Módulos del Hub
      if (unidades.length) {
        const rows = unidades
          .filter((x: any) => x && x.unidad_id)
          .map((x: any) => ({ usuario_id: uid, unidad_id: x.unidad_id, rol: x.rol || 'bodeguero', activo: true }))
        if (rows.length) {
          const { error } = await admin.from('usuario_unidades').insert(rows)
          if (error) return json({ error: 'Cuenta creada, pero falló asignar módulos: ' + error.message }, 400)
        }
      }

      // Fincas de producción (rol por finca)
      if (fincas.length) {
        const rows = fincas
          .filter((x: any) => x && x.finca_id)
          .map((x: any) => ({ usuario_id: uid, finca_id: x.finca_id, rol: x.rol || 'bodeguero' }))
        if (rows.length) {
          const { error } = await admin.schema('produccion').from('usuario_finca').insert(rows)
          if (error) return json({ error: 'Cuenta creada, pero falló asignar fincas: ' + error.message }, 400)
        }
      }

      return json({ ok: true, id: uid })
    }

    return json({ error: 'Acción desconocida.' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
