/**
 * Ajustes — secciones de configuración del workspace single-operator.
 * Cubre el destino del item Ajustes del sidebar. La persistencia real (Supabase)
 * llega en Fase 2; acá viven los valores y el control de cap de costo.
 */

import { Btn, BBBadge } from "@/components/ui";
import { CostMeter } from "@/components/domain";

const ALLOWED_EMAIL = process.env.AUTH_ALLOWED_EMAIL ?? "mantovanimariano@transfil.com.ar";

function Section({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 py-6 border-b border-n-200 last:border-0">
      <div>
        <div className="t-micro text-sa-base">{eyebrow}</div>
        <h2 className="t-h3 mt-1">{title}</h2>
        {desc && <p className="t-small text-n-500 mt-1">{desc}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ k, v, badge }: { k: string; v: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3 bg-white border border-n-200 rounded-sm">
      <span className="text-[13px] text-n-600">{k}</span>
      <span className="flex items-center gap-2 t-mono text-[12px] text-n-900">
        {v}
        {badge}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <header className="mb-2">
        <div className="t-micro text-sa-base">WORKSPACE</div>
        <h1 className="t-h1 mt-1.5">Ajustes</h1>
      </header>

      <Section eyebrow="ACCESO" title="Allowlist" desc="Single-operator: un único email autorizado.">
        <div className="flex flex-col gap-2">
          <Row k="Email autorizado" v={ALLOWED_EMAIL} badge={<BBBadge tone="success" size="sm">activo</BBBadge>} />
          <Row k="Proveedores" v="Google · email/password" />
          <p className="t-small text-n-500 mt-1">
            Se valida en el middleware y en el callback de OAuth. Cambiarlo requiere actualizar la env
            <span className="t-mono"> AUTH_ALLOWED_EMAIL</span> en Vercel.
          </p>
        </div>
      </Section>

      <Section eyebrow="COSTO" title="Cap mensual" desc="Tope de gasto en scraping + LLM por ciclo.">
        <div className="flex flex-col gap-3">
          <CostMeter used={1.84} soft={3.5} hard={5} period="ciclo actual · mayo" />
          <div className="flex gap-2">
            <Btn kind="secondary" size="sm">Editar soft cap</Btn>
            <Btn kind="secondary" size="sm">Editar hard cap</Btn>
          </div>
        </div>
      </Section>

      <Section eyebrow="INTEGRACIONES" title="Fuentes de datos" desc="Tokens de APIs y scrapers. Se configuran en Fase 2.">
        <div className="flex flex-col gap-2">
          <Row k="Grok / xAI" v="sin configurar" badge={<BBBadge tone="neutral" size="sm">Fase 2</BBBadge>} />
          <Row k="Apify" v="sin configurar" badge={<BBBadge tone="neutral" size="sm">Fase 3</BBBadge>} />
          <Row k="Reddit · Bluesky · Mastodon" v="fuentes gratis" badge={<BBBadge tone="neutral" size="sm">Fase 2</BBBadge>} />
        </div>
      </Section>

      <Section eyebrow="DATOS" title="Retención" desc="Las menciones crudas se purgan automáticamente.">
        <div className="flex flex-col gap-2">
          <Row k="Ventana de retención" v="30 días" />
          <Row k="Purga automática" v="Vercel Cron · diaria" />
        </div>
      </Section>
    </div>
  );
}
