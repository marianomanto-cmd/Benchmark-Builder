-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 22 · La baja da de baja, y la ficha no se borra
--
-- La migración 18 cerró la escalada por UPDATE: un miembro del equipo
-- ya no puede reapuntar `user_id` ni tocar `activo` para hacerse
-- administrador o dejar al consultorio sin ninguno. Quedaron dos
-- caminos abiertos que llegan al mismo lugar por afuera.
--
-- 1) EL BORRADO. La policy de `profesionales` es `for all`, o sea que
--    incluye DELETE, y `guard_es_admin()` colgaba sólo de INSERT y
--    UPDATE: no había ningún trigger de DELETE. Verificado — un miembro
--    común del equipo, con su sesión normal:
--
--        select es_admin();            -> f
--        delete from profesionales where nombre = 'Admin de prueba';
--        DELETE 1
--
--    El único freno que existía era accidental: la FK
--    `presupuestos_profesional_id_fkey` es `on delete restrict`, así que
--    protegía a quien ya había firmado un presupuesto y a nadie más.
--    La ficha de un administrador recién creado se borraba sin nada
--    que la detuviera.
--
-- 2) LA BAJA QUE NO DABA DE BAJA. Ni `es_admin()` ni `getPerfil()`
--    miraban `activo`. Verificado:
--
--        -- ficha con activo = false, es_admin = true
--        select es_admin();                                -> t
--        update profesionales set activo = true where …;    -> UPDATE 1
--
--    O sea que una ficha dada de baja seguía pasando por `exigirAdmin()`
--    y podía deshacerse su propia baja, porque la guarda de la 18 pide
--    ser admin y ella «era» admin.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) `es_admin()` mira si la ficha está de alta
--
-- Es la definición de la que cuelgan `guard_es_admin()` y, del lado de
-- la app, `exigirAdmin()`. Cambiarla acá las arregla todas.
-- ─────────────────────────────────────────────────────────────

create or replace function es_admin() returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select p.es_admin and p.activo
       from profesionales p
      where p.user_id = auth.uid()
      limit 1),
    false)
$$;

-- ─────────────────────────────────────────────────────────────
-- 2) Las fichas no se borran desde una sesión del equipo
--
-- Una ficha borrada se lleva puesto el vínculo con quien entra, y el
-- consultorio no tiene forma de recuperarla desde la app. Dar de baja
-- es la operación que existe para esto: conserva el nombre, que es lo
-- que los presupuestos emitidos ya copiaron.
--
-- El rol de servicio y el editor SQL del dashboard sí pueden: es la
-- salida de emergencia, igual que en la 18 y la 21.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_profesional_no_delete() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return old;
  end if;

  raise exception
    'Las fichas del equipo no se borran: dale de baja el acceso en su lugar';
end $$;

drop trigger if exists trg_profesional_no_delete on profesionales;

create trigger trg_profesional_no_delete
  before delete on profesionales
  for each row execute function guard_profesional_no_delete();

-- ─────────────────────────────────────────────────────────────
-- 3) El consultorio nunca se queda sin nadie que administre
--
-- Con `es_admin()` mirando `activo`, quedarse sin ningún admin activo
-- ya no es «un problema para después»: es quedarse sin forma de dar de
-- alta a nadie, sin forma de cambiar una contraseña y sin pantalla de
-- Equipo. Desde la app no habría manera de salir.
--
-- La guarda mira el estado DESPUÉS del cambio, así que cubre las tres
-- formas de llegar: sacarle el `es_admin`, darle de baja, y —aunque el
-- trigger de arriba ya lo impide para el equipo— borrarla.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_ultimo_admin() returns trigger
language plpgsql
set search_path = public
as $$
declare v_quedan int;
begin
  select count(*) into v_quedan
    from profesionales p
   where p.es_admin
     and p.activo
     and p.user_id is not null
     and p.id <> coalesce(new.id, old.id);

  -- La fila que se está tocando cuenta sólo si queda administrando.
  if tg_op <> 'DELETE'
     and new.es_admin and new.activo and new.user_id is not null then
    v_quedan := v_quedan + 1;
  end if;

  if v_quedan = 0 then
    raise exception
      'El consultorio se quedaría sin ningún administrador con acceso: nombrá otro antes';
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists trg_ultimo_admin on profesionales;

create trigger trg_ultimo_admin
  after update or delete on profesionales
  for each row execute function guard_ultimo_admin();

comment on function guard_ultimo_admin() is
  'Impide dejar al consultorio sin ningún administrador activo con acceso. '
  'Va AFTER para ver el estado final de la fila, y cuenta las otras fichas '
  'por separado para no depender del orden de los triggers.';
