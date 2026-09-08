-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 06 · Coherencia del ítem congelado
--
-- `aranceles` ya limita el porcentaje a 100, pero un override a mano en
-- el wizard escribe directo en `presupuesto_items`. Sin estos checks,
-- un 150 % tipeado dejaría un `a_cargo` negativo en el documento —
-- el paciente vería que el consultorio le debe plata.
--
-- `calcular_cobertura()` ya acota a [0, monto]; esto es defensa en
-- profundidad para cualquier INSERT que no pase por la RPC.
-- ════════════════════════════════════════════════════════════════════

alter table presupuesto_items
  add constraint presupuesto_items_monto_no_negativo
    check (monto >= 0),
  add constraint presupuesto_items_cobertura_en_rango
    check (cobertura_monto >= 0 and cobertura_monto <= monto),
  add constraint presupuesto_items_a_cargo_cierra
    check (a_cargo = monto - cobertura_monto),
  add constraint presupuesto_items_porcentaje_valido
    check (cobertura_tipo <> 'porcentaje' or cobertura_valor between 0 and 100);

-- Las cuotas tampoco pueden ser negativas.
alter table presupuesto_cuotas
  add constraint presupuesto_cuotas_monto_no_negativo
    check (monto >= 0);
