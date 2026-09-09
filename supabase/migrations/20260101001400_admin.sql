-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 15 · Administración del equipo
--
-- El acceso pasa a ser usuario + contraseña, sin magic link. Alguien
-- del consultorio tiene que poder dar de alta al resto sin entrar al
-- dashboard de Supabase, así que hace falta saber quién es admin.
--
-- La marca vive en `profesionales` y no en el metadata del usuario
-- porque es un dato del consultorio, no de la sesión: se ve y se cambia
-- desde la misma pantalla donde se administra el equipo.
-- ════════════════════════════════════════════════════════════════════

alter table profesionales
  add column if not exists es_admin boolean not null default false;

comment on column profesionales.es_admin is
  'Puede crear usuarios, cambiar contraseñas y dar de baja al equipo.';

/**
 * ¿El usuario de esta sesión es admin?
 *
 * `security definer` para que pueda leer `profesionales` sin depender
 * de la policy del que consulta, y `stable` para que Postgres la
 * evalúe una vez por consulta.
 */
create or replace function es_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select p.es_admin from profesionales p where p.user_id = auth.uid() limit 1),
    false
  )
$$;

revoke execute on function es_admin() from public, anon;
grant execute on function es_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Sólo un admin cambia la marca de admin.
--
-- Sin esto, cualquiera del equipo podría hacerse admin con un UPDATE
-- directo: la policy de `profesionales` deja escribir a todo el mundo
-- porque el consultorio comparte los datos.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_es_admin() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.es_admin is distinct from old.es_admin and not es_admin() then
    raise exception 'Sólo un administrador puede cambiar los permisos del equipo';
  end if;
  return new;
end $$;

create trigger trg_es_admin
  before update on profesionales
  for each row execute function guard_es_admin();
