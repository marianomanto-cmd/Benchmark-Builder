-- ════════════════════════════════════════════════════════════════════
-- Smile Lab · Presupuestos — 05 · Storage
--
-- Bucket privado `presupuestos`. El PDF se cachea acá y el mismo
-- archivo se adjunta al WhatsApp y se sirve en "Ver PDF": el documento
-- del paciente y el del consultorio son el mismo byte.
-- Acceso por signed URL de 7 días.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presupuestos', 'presupuestos', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

create policy "equipo lee pdfs"
  on storage.objects for select
  using (bucket_id = 'presupuestos' and auth.uid() is not null);

create policy "equipo sube pdfs"
  on storage.objects for insert
  with check (bucket_id = 'presupuestos' and auth.uid() is not null);

-- El PDF se regenera cuando cambia el documento (sólo puede pasar en
-- borrador), así que el update tiene que estar permitido.
create policy "equipo reemplaza pdfs"
  on storage.objects for update
  using (bucket_id = 'presupuestos' and auth.uid() is not null)
  with check (bucket_id = 'presupuestos' and auth.uid() is not null);
