-- ════════════════════════════════════════════════════════════════════
--  SMILE LAB · PRESUPUESTOS — INSTALACIÓN  ·  PARTE 2 de 3
--  Storage: bucket privado `presupuestos` para los PDF.
--
--  Va aparte porque las policies de `storage.objects` dependen de
--  permisos que algunos proyectos no dan desde el SQL Editor. Si esta
--  parte falla, la 1 ya quedó aplicada y el bucket se puede crear a
--  mano: Storage → New bucket → nombre `presupuestos`, PRIVADO.
-- ════════════════════════════════════════════════════════════════════


-- ─── storage ───────────────────────────────────────


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presupuestos', 'presupuestos', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

drop policy if exists "equipo lee pdfs" on storage.objects;
create policy "equipo lee pdfs" on storage.objects for select
  using (bucket_id = 'presupuestos' and auth.uid() is not null);

drop policy if exists "equipo sube pdfs" on storage.objects;
create policy "equipo sube pdfs" on storage.objects for insert
  with check (bucket_id = 'presupuestos' and auth.uid() is not null);

-- El PDF se regenera cuando cambia el documento (sólo puede pasar en
-- borrador), así que el update tiene que estar permitido.
drop policy if exists "equipo reemplaza pdfs" on storage.objects;
create policy "equipo reemplaza pdfs" on storage.objects for update
  using (bucket_id = 'presupuestos' and auth.uid() is not null)
  with check (bucket_id = 'presupuestos' and auth.uid() is not null);
