-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 13 · El aumento masivo escribe lo que promete
--
-- La pantalla 10 muestra un preview de las filas afectadas con el monto
-- nuevo de cada una ANTES de confirmar: es lo que hace que un aumento
-- masivo se pueda mirar antes de aplicarlo. Para que ese preview sirva,
-- tiene que dar exactamente lo mismo que después escribe la RPC.
--
-- La cuenta pasa a multiplicar antes de dividir, igual que
-- `montoConAumento()` en `lib/calculo.ts`. Con `monto * (1 + pct/100)`
-- los dos lados se separaban un peso en los casos que caen justo en
-- medio (por ejemplo $ 385.000 con +99,99 %).
-- ════════════════════════════════════════════════════════════════════

create or replace function aumento_masivo(
  p_rubro        text,
  p_obra_social  uuid,
  p_solo_particular boolean,
  p_pct          numeric,
  p_desde        date
) returns int
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  for r in
    select a.prestacion_id, a.obra_social_id, a.monto, a.cobertura_tipo, a.cobertura_valor
      from aranceles a
      join prestaciones p on p.id = a.prestacion_id
     where a.vigente_hasta is null
       and a.vigente_desde < p_desde
       and (p_rubro is null or p.rubro = p_rubro)
       and (
         case
           when p_solo_particular then a.obra_social_id is null
           when p_obra_social is not null then a.obra_social_id = p_obra_social
           else true
         end
       )
  loop
    perform nueva_vigencia(
      r.prestacion_id,
      r.obra_social_id,
      round(r.monto * (100 + p_pct) / 100),
      r.cobertura_tipo,
      r.cobertura_valor,
      p_desde
    );
    n := n + 1;
  end loop;

  return n;
end $$;

revoke execute on function aumento_masivo(text, uuid, boolean, numeric, date) from public, anon;
grant execute on function aumento_masivo(text, uuid, boolean, numeric, date) to authenticated;
