# Orquestación del pipeline (Phema)

> Arquitectura de orquestación, punto a punto. **Regla de oro:** todo es
> **mock-first / costo cero**. Un modelo/proveedor real sólo se llama si
> `PIPELINE_MODE=live` **y** el flag del proveedor está on en `system_flags`
> **y** la API key está presente. Si falta cualquiera → fixture/heurística
> determinista. **Política de etiquetado:** la UI nunca nombra el motor ni dice
> "IA"; sólo "Análisis + Insights".

## Flujo recomendado (y estado)

| Paso | Función | Modelo | Estado |
|---|---|---|---|
| 1. **Wizard Assistant** | Guía al usuario al tocar "Siguiente": detecta respuestas vagas, sugiere industrias a descartar, ayuda a completar el brief. | **Haiku** (económico) | ✅ Implementado (`/api/wizard/assist`) — mock = heurística, live = Haiku |
| 2. **Planner / Interpreter** | Interpreta el caso de estudio (+ perfil) y genera **queries acotadas por fuente** (no el prompt crudo). | **Claude** | ✅ Implementado (`lib/discovery/planner.ts`) — heurística por defecto, Claude refina en live (salida tipada Zod `QuerySpec`) |
| 3. **Data Collection** | Apify (queries acotadas) para IG/TT/YT/FB + ad-libraries; **Grok** para X y **web/portales** (búsqueda web+prensa independiente). | Apify + Grok | ✅ Implementado (`lib/sources/grok-live.ts`, `index.ts`). Actor de Apify elegido **automáticamente por caso** (`select-actor.ts`) |
| 4. **Multimodal Analysis** | Video nativo + voiceover de calidad. | **Gemini** (video) + **AssemblyAI** (voiceover) | ⛳ **MUST (futuro)** — hoy: frames (ffmpeg) + Claude vision + Whisper. Ver abajo |
| 5. **Synthesis** | Sentimiento + insights + reporte final. | **Claude** (Grok opcional) | ✅ Implementado (`lib/ai/`); `AI_PROVIDER=claude|grok`. Ensemble Claude+Grok = futuro |

## Detalle de lo implementado

- **Wizard Assistant** — al tocar "Siguiente" se llama `POST /api/wizard/assist`
  con `{step, state}` y **salta un popup** con la revisión (`msg`) + `recommendations[]`
  y botones **Ajustar** (quedarse) / **Continuar** (avanzar). En mock usa
  `assistFor` + `recommendationsFor` (heurística determinista, costo cero); en live
  el modelo (`ANTHROPIC_WIZARD_MODEL`, default `claude-haiku-4-5-20251001`) devuelve
  `{ok, msg, recommendations[]}`. Además hay una línea de guía inline instantánea.
- **Planner** — `planQueries(plan, {profile, intent})` → `QuerySpec` (Zod):
  por cada `(plataforma × scope)` arma `keywords/phrases/handles` enfocados a
  partir de marca + competidores + categoría (tailored por plataforma), **no**
  el prompt crudo. El runner usa esas keywords (`keywordsForJob`) en cada job.
  Modelo: `ANTHROPIC_PLANNER_MODEL` (default opus).
- **Data Collection** — `sources/index.ts`: X y `web` (Portales/Web del wizard)
  → `grokLiveSource` (Grok Live Search con `sources:[{x}]` o `[{web},{news}]`);
  IG/TT/YT/FB y ad-libraries → Apify. El provider de X/web se fuerza a `grok`
  en `planToJobs` para que el guard de costos y la estimación usen tarifas Grok.

## Multimodal — MUST para producción (pendiente)

Hoy el análisis de video es **muestreo de frames (ffmpeg) + Claude vision** y el
voiceover es **OpenAI Whisper**. Es un v1 servible, pero para producción el
estándar objetivo es:

- **Gemini** para **análisis nativo de video** (entiende movimiento, escena y
  texto en pantalla a lo largo del clip, no 3 frames sueltos). `GOOGLE_AI_API_KEY`.
- **AssemblyAI** para **voiceover/transcripción de calidad** (diarización,
  timestamps, capítulos, sentimiento). `ASSEMBLYAI_API_KEY`.

Las costuras ya están listas para el swap: `lib/media/analyze.ts` (visión) y
`lib/media/transcribe.ts` (transcripción) están abstraídas y `consolidate()`
mergea lo que devuelvan. Encender cuando haya volumen real de video; **gatear el
costo fuerte** (es la operación más cara).

## Perfiles de cliente — futuro (Beta = cargar todo cada vez)

En Beta el usuario completa todos los datos de su marca en cada wizard. A futuro:
tabla `client_profiles` (marca, qué hace, handles, sitio, inversión, descartes
por defecto) por workspace; el wizard la pre-carga y el usuario sólo completa lo
específico de esa consulta. El **Planner ya acepta `profile`** (`ClientProfile`):
hoy se arma desde los campos de marca del plan, mañana desde el perfil guardado —
sin reescribir el Planner. El run guarda el plan (snapshot) como hoy.

## Costo / seguridad

Todo lo anterior pasa por el gate `pipelineMode()` (mock por defecto) + flag +
key. En mock no se hace ninguna llamada con costo: el Planner y el Wizard
Assistant devuelven heurística, y los conectores (Grok/Apify) devuelven fixtures
vía `guardedCall`. Spend real = US$0 hasta poner `PIPELINE_MODE=live` + flags + keys.
