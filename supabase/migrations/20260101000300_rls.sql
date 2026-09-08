-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 04 · RLS
--
-- Consultorio único: todo el equipo ve todo. Autenticado = acceso,
-- anónimo = nada. Las excepciones son las que sostienen la regla del
-- snapshot:
--   · aranceles           → sin DELETE (append-only)
--   · presupuesto_eventos → sólo INSERT y SELECT
-- ════════════════════════════════════════════════════════════════════

alter table profesionales       enable row level security;
alter table obras_sociales      enable row level security;
alter table pacientes           enable row level security;
alter table prestaciones        enable row level security;
alter table prestacion_cuotas   enable row level security;
alter table aranceles           enable row level security;
alter table presupuestos        enable row level security;
alter table presupuesto_items   enable row level security;
alter table presupuesto_cuotas  enable row level security;
alter table presupuesto_eventos enable row level security;

-- ── Tablas con acceso completo para el equipo ────────────────

create policy "equipo lee"     on profesionales for select using (auth.uid() is not null);
create policy "equipo escribe" on profesionales for all    using (auth.uid() is not null)
                                                           with check (auth.uid() is not null);

create policy "equipo lee"     on obras_sociales for select using (auth.uid() is not null);
create policy "equipo escribe" on obras_sociales for all    using (auth.uid() is not null)
                                                            with check (auth.uid() is not null);

create policy "equipo lee"     on pacientes for select using (auth.uid() is not null);
create policy "equipo escribe" on pacientes for all    using (auth.uid() is not null)
                                                       with check (auth.uid() is not null);

create policy "equipo lee"     on prestaciones for select using (auth.uid() is not null);
create policy "equipo escribe" on prestaciones for all    using (auth.uid() is not null)
                                                          with check (auth.uid() is not null);

create policy "equipo lee"     on prestacion_cuotas for select using (auth.uid() is not null);
create policy "equipo escribe" on prestacion_cuotas for all    using (auth.uid() is not null)
                                                               with check (auth.uid() is not null);

create policy "equipo lee"     on presupuestos for select using (auth.uid() is not null);
create policy "equipo escribe" on presupuestos for all    using (auth.uid() is not null)
                                                          with check (auth.uid() is not null);

create policy "equipo lee"     on presupuesto_items for select using (auth.uid() is not null);
create policy "equipo escribe" on presupuesto_items for all    using (auth.uid() is not null)
                                                               with check (auth.uid() is not null);

create policy "equipo lee"     on presupuesto_cuotas for select using (auth.uid() is not null);
create policy "equipo escribe" on presupuesto_cuotas for all    using (auth.uid() is not null)
                                                                with check (auth.uid() is not null);

-- ── Excepción: aranceles es append-only ──────────────────────
-- Sin policy de DELETE. Se puede leer, insertar y cerrar la vigencia
-- (UPDATE de vigente_hasta), pero guard_arancel_inmutable bloquea
-- cualquier cambio de monto o cobertura si el arancel ya fue usado.

create policy "equipo lee"       on aranceles for select using (auth.uid() is not null);
create policy "equipo inserta"   on aranceles for insert with check (auth.uid() is not null);
create policy "equipo cierra"    on aranceles for update using (auth.uid() is not null)
                                                         with check (auth.uid() is not null);

-- ── Excepción: el historial no se borra ni se edita ──────────

create policy "equipo lee"     on presupuesto_eventos for select using (auth.uid() is not null);
create policy "equipo inserta" on presupuesto_eventos for insert with check (auth.uid() is not null);

-- ── Ejecución de las RPC ─────────────────────────────────────
-- Son security definer: hay que restringir quién puede llamarlas.

revoke execute on function nueva_vigencia(uuid, uuid, numeric, tipo_cobertura, numeric, date) from public, anon;
revoke execute on function aumento_masivo(text, uuid, boolean, numeric, date) from public, anon;
revoke execute on function crear_presupuesto(jsonb) from public, anon;
revoke execute on function duplicar_presupuesto(uuid) from public, anon;
revoke execute on function cambiar_estado(uuid, estado_presupuesto, motivo_perdida, text) from public, anon;
revoke execute on function registrar_evento(uuid, text, text) from public, anon;
revoke execute on function marcar_pendientes() from public, anon, authenticated;

grant execute on function nueva_vigencia(uuid, uuid, numeric, tipo_cobertura, numeric, date) to authenticated;
grant execute on function aumento_masivo(text, uuid, boolean, numeric, date) to authenticated;
grant execute on function crear_presupuesto(jsonb) to authenticated;
grant execute on function duplicar_presupuesto(uuid) to authenticated;
grant execute on function cambiar_estado(uuid, estado_presupuesto, motivo_perdida, text) to authenticated;
grant execute on function registrar_evento(uuid, text, text) to authenticated;
-- marcar_pendientes la corre sólo el cron con la service role key.
grant execute on function marcar_pendientes() to service_role;
