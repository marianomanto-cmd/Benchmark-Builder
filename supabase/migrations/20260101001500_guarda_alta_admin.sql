-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 16 · La guarda de admin también en el alta
--
-- `guard_es_admin()` cubría el UPDATE y dejaba el INSERT abierto. La
-- policy de `profesionales` deja escribir a cualquiera con sesión
-- —el consultorio comparte los datos—, así que un usuario de auth SIN
-- ficha podía crearse la suya con `es_admin = true` desde el navegador,
-- con la anon key, sin pasar por la app. Quedaba admin.
--
-- Que hiciera falta una cuenta huérfana no lo volvía teórico: hasta el
-- arreglo de `asegurarAdminInicial()` el acceso `admin` del consultorio
-- nacía justamente así, sin ficha.
--
-- El código de servidor queda exento a propósito: llega con la service
-- role key y ya verificó quién pide (`crearUsuario` y `cambiarPermiso`
-- exigen admin antes de escribir, y `asegurarAdminInicial` corre
-- justamente cuando todavía no hay ninguno, así que no tiene contra
-- quién verificar). La guarda es contra el navegador.
-- ════════════════════════════════════════════════════════════════════

create or replace function guard_es_admin() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- PostgREST entra con el rol del token: `authenticated` con la anon
  -- key, `service_role` con la de servicio. `postgres` es el editor SQL
  -- del dashboard, que es la salida de emergencia del consultorio.
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.es_admin and not es_admin() then
      raise exception 'Sólo un administrador puede dar de alta a otro administrador';
    end if;
    return new;
  end if;

  if new.es_admin is distinct from old.es_admin and not es_admin() then
    raise exception 'Sólo un administrador puede cambiar los permisos del equipo';
  end if;

  return new;
end $$;

drop trigger if exists trg_es_admin_alta on profesionales;

create trigger trg_es_admin_alta
  before insert on profesionales
  for each row execute function guard_es_admin();
