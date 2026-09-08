-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 11 · Paridad de redondeo con el cliente
--
-- `lib/calculo.ts` y `calcular_cobertura()` tienen que dar EXACTAMENTE
-- el mismo número: el wizard muestra el primero y la base congela el
-- segundo. Con un porcentaje de dos decimales divergían en un peso
-- ($ 385.000 al 99,99 % → 384.961 en el cliente, 384.962 en la base),
-- porque el punto flotante de JS pierde precisión al dividir antes de
-- multiplicar.
--
-- Ahora los dos lados multiplican primero y dividen después, que en
-- `numeric` es exacto y en JS se resuelve en centésimas enteras.
-- `npm run test:paridad` lo verifica contra una base real.
-- ════════════════════════════════════════════════════════════════════

create or replace function calcular_cobertura(
  p_monto numeric,
  p_tipo  tipo_cobertura,
  p_valor numeric
) returns numeric
language sql immutable
as $$
  -- El least/greatest acota la cobertura a [0, monto]: un override a
  -- mano puede tipear 150 % o un monto fijo mayor al arancel, y sin el
  -- tope el a-cargo saldría negativo.
  select greatest(0::numeric, least(
    case p_tipo
      when 'porcentaje' then round(p_monto * coalesce(p_valor, 0) / 100)
      when 'monto'      then coalesce(p_valor, 0)
      else 0::numeric
    end,
    p_monto))
$$;
