-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 18 · Tres agujeros que la cacería encontró
--
-- Los tres se alcanzan igual: PostgREST expone un UPDATE y un INSERT por
-- tabla, y la policy del equipo deja escribir a cualquiera con sesión
-- porque el consultorio comparte los datos. Las guardas estaban puestas
-- sobre la operación obvia y no sobre la que rodea.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) Un ítem no se muda de presupuesto
--
-- `guard_item_emitido()` resolvía contra qué presupuesto validar con
-- `coalesce(new.presupuesto_id, old.presupuesto_id)`. En un UPDATE
-- `new.presupuesto_id` nunca es null, así que miraba SÓLO el destino.
-- Con eso, un PATCH que cambia `presupuesto_id` de un ítem emitido a un
-- borrador pasaba: el destino es borrador. El emitido se quedaba sin
-- líneas, conservando el total congelado en la cabecera.
--
-- Verificado antes del arreglo sobre 2026-0002: pasó de 2 ítems a 0
-- ítems sin dejar de cobrar $ 54.600. Un documento que cobra sin
-- prestaciones es exactamente lo que la regla del snapshot existe para
-- impedir.
--
-- La guarda nueva prohíbe la mudanza de plano. Es más simple que mirar
-- los dos presupuestos y más fiel a la regla: un ítem no es un dato
-- suelto que se reasigna, es parte de UN documento.
-- ─────────────────────────────────────────────────────────────

create or replace function guard_item_emitido() returns trigger
language plpgsql
set search_path = public
as $$
declare est estado_presupuesto;
begin
  if tg_op = 'UPDATE' and new.presupuesto_id is distinct from old.presupuesto_id then
    raise exception 'Un ítem no cambia de presupuesto: es parte de ese documento';
  end if;

  -- En UPDATE los dos son iguales (lo acabamos de exigir); en INSERT
  -- vale `new` y en DELETE vale `old`.
  select estado into est from presupuestos
   where id = coalesce(new.presupuesto_id, old.presupuesto_id);

  -- Si el presupuesto ya no existe (cascade de delete) dejamos pasar.
  if est is null then
    return coalesce(new, old);
  end if;

  if est <> 'borrador' then
    raise exception 'Presupuesto ya emitido: duplicalo en lugar de editarlo';
  end if;
  return coalesce(new, old);
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2) El vínculo de identidad también es un permiso
--
-- La migración 16 custodiaba la columna `es_admin` y se olvidó de
-- `user_id`, que es por donde `es_admin()` y `getPerfil()` resuelven
-- quién es quién. Alcanzaban dos PATCH desde el navegador:
--
--     update profesionales set user_id = null where user_id = <el mío>;
--     update profesionales set user_id = <el mío> where es_admin;
--
-- y el trigger no saltaba porque `es_admin` no cambiaba en ninguno.
-- Verificado: un miembro del equipo sin permisos quedó administrador.
--
-- La misma maniobra en su versión destructiva —`set user_id = null` o
-- `set activo = false` sobre la ficha admin— dejaba al consultorio con
-- CERO administradores que pudieran entrar, sin forma de recuperarse
-- desde la app.
--
-- Nota sobre el alcance: esto NO cierra que cualquiera del equipo
-- pueda editar el nombre o la matrícula de otra ficha. Eso es
-- deliberado —el consultorio comparte el catálogo— y además no toca los
-- presupuestos ya emitidos, que llevan el nombre copiado.
-- ─────────────────────────────────────────────────────────────

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

  -- El acceso: a quién pertenece la ficha y si esa persona puede entrar.
  -- Cambiarlo es administrar, aunque `es_admin` no se mueva.
  if not es_admin() and (
       new.user_id is distinct from old.user_id
    or new.activo is distinct from old.activo
  ) then
    raise exception 'Sólo un administrador puede cambiar el acceso del equipo';
  end if;

  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3) El historial se firma en el servidor
--
-- `trg_evento_inmutable` impedía editar y borrar, que era la mitad del
-- problema. La otra mitad: el INSERT aceptaba `autor_id`, `autor_nombre`
-- y `created_at` tal como vinieran en el body. Cualquiera con sesión
-- podía APPENDear al timeline de cualquier presupuesto una línea
-- firmada por otra persona y fechada cuando quisiera — y por diseño,
-- después nadie la puede corregir ni borrar.
--
-- Un historial append-only donde el autor lo pone el cliente no es un
-- historial: es un lugar donde cualquiera escribe lo que le conviene y
-- queda para siempre.
--
-- Las RPC (`crear_presupuesto`, `cambiar_estado`, `registrar_evento`)
-- ya resolvían el autor con `actor_nombre()` y `auth.uid()`, así que
-- para ellas este trigger no cambia nada: escribe el mismo valor.
-- ─────────────────────────────────────────────────────────────

create or replace function firmar_evento() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- El rol de servicio sí puede fechar y firmar: es la migración de
  -- datos y el cron, que no tienen sesión de nadie.
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;

  new.autor_id := auth.uid();
  new.autor_nombre := actor_nombre();
  new.created_at := now();
  return new;
end $$;

drop trigger if exists trg_evento_firmado on presupuesto_eventos;

create trigger trg_evento_firmado
  before insert on presupuesto_eventos
  for each row execute function firmar_evento();
