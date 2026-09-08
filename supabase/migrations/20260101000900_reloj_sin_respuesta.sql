-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 10 · El reloj de «días sin respuesta»
--
-- BUG QUE ARREGLA
--
-- `enviado → pendiente` es automático a los 7 días. Pero `estado_desde`
-- se reseteaba en CADA cambio de estado, así que el pase automático
-- ponía el contador en cero: la tarjeta que llevaba 7 días sin
-- respuesta volvía a mostrar «0 días» justo cuando había que ir a
-- buscarla, y el tinte warm del kanban (`estaFrio`, 7 días) recién
-- aparecía a los 14. El KPI «pendientes que superan 7 días» quedaba
-- prácticamente inalcanzable.
--
-- `enviado → pendiente` no es una respuesta del paciente: es el sistema
-- reconociendo que sigue sin haberla. El reloj tiene que seguir
-- corriendo desde que se envió.
-- ════════════════════════════════════════════════════════════════════

create or replace function touch_estado_desde() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado is distinct from old.estado
     -- Única excepción: pasar de enviado a pendiente es la continuación
     -- de la misma espera, no un estado nuevo. Vale tanto para el cron
     -- como para el cambio a mano desde el detalle.
     and not (old.estado = 'enviado' and new.estado = 'pendiente')
  then
    new.estado_desde := now();
  end if;
  return new;
end $$;
