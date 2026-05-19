/**
 * Galería (04) — handoff §4.4.
 * Dos columnas: orgánico (#fff) vs ads (sa-soft, borde sangría), agrupadas por
 * competidor con grid 3-col de MediaThumbs. Click thumb → lightbox con ← →.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Btn } from "@/components/ui";
import { MediaThumb, PlatformBadge, PLATFORM_NAMES } from "@/components/domain";
import { ORGANIC_GROUPS, AD_GROUPS, type GalleryGroup, type GalleryItem } from "@/lib/fixtures/gallery";

const IcFilter = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 5h18M6 12h12M10 19h4" />
  </svg>
);
const IcEye = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function GalleryPage() {
  const flat = useMemo(
    () => [...ORGANIC_GROUPS, ...AD_GROUPS].flatMap((g) => g.items),
    [],
  );
  const [lightbox, setLightbox] = useState<number | null>(null);

  const open = useCallback((id: string) => {
    setLightbox(flat.findIndex((it) => it.id === id));
  }, [flat]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-baseline gap-4">
        <div>
          <div className="t-micro text-sa-base">GALERÍA · ORGÁNICO VS PAGO</div>
          <h1 className="t-h1 mt-1.5">Lo que la competencia muestra y lo que paga por mostrar</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn kind="ghost" size="sm" icon={IcFilter}>
            Filtros
          </Btn>
          <Btn kind="secondary" size="sm" iconRight={IcEye}>
            Modo presentación
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GalleryColumn kind="organic" groups={ORGANIC_GROUPS} onOpen={open} />
        <GalleryColumn kind="ad" groups={AD_GROUPS} onOpen={open} />
      </div>

      <Lightbox items={flat} index={lightbox} onClose={() => setLightbox(null)} onNav={setLightbox} />
    </div>
  );
}

function GalleryColumn({
  kind,
  groups,
  onOpen,
}: {
  kind: "organic" | "ad";
  groups: GalleryGroup[];
  onOpen: (id: string) => void;
}) {
  const isAd = kind === "ad";
  return (
    <div className={isAd ? "rounded-md p-4 bg-sa-soft border border-sa-base" : "rounded-md p-4 bg-white border border-n-200"}>
      <div className="flex justify-between items-start mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-[2px]" style={{ background: isAd ? "var(--color-ad)" : "var(--color-organic)" }} />
            <h2 className={isAd ? "t-h2 text-sa-strong" : "t-h2"}>
              {isAd ? "Anuncios pagos · Meta Ad Library" : "Contenido orgánico"}
            </h2>
          </div>
          <div className={isAd ? "t-small text-sa-strong mt-1" : "t-small text-n-500 mt-1"}>
            {isAd ? "84 creativos activos · USD 18–28k spend estimado" : "218 piezas en últimos 60 días"}
          </div>
        </div>
        <div className={`flex rounded-sm overflow-hidden bg-white border ${isAd ? "border-sa-base" : "border-n-300"}`}>
          {["Engagement", "Reciente", "Plataforma"].map((t, i) => (
            <span
              key={t}
              className={`px-2.5 py-1 t-mono text-[11px] ${i ? "border-l border-n-200" : ""} ${
                i === 0 ? (isAd ? "bg-sa-base text-white" : "bg-n-900 text-white") : "text-n-700"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.name} className="mb-4 last:mb-0">
          <div className="flex justify-between items-baseline mb-2">
            <div className={isAd ? "text-[12px] font-medium text-sa-strong" : "text-[12px] font-medium text-n-800"}>{g.name}</div>
            <span className={isAd ? "t-mono text-[10px] text-sa-strong" : "t-mono text-[10px] text-n-500"}>{g.count} piezas</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {g.items.map((it) => (
              <MediaThumb
                key={it.id}
                kind={it.kind}
                platform={it.platform}
                label={it.label}
                metrics={it.metrics}
                isAd={it.isAd}
                onClick={() => onOpen(it.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onNav,
}: {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNav: (i: number) => void;
}) {
  const prev = useCallback(() => {
    if (index === null) return;
    onNav((index - 1 + items.length) % items.length);
  }, [index, items.length, onNav]);
  const next = useCallback(() => {
    if (index === null) return;
    onNav((index + 1) % items.length);
  }, [index, items.length, onNav]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onClose, prev, next]);

  const item = index === null ? null : items[index];

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-n-900/80 backdrop-blur-[8px]" onClick={onClose} />
          <button
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <motion.div
            className="relative w-full max-w-[440px]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[4/5] w-full">
              <MediaThumb kind={item.kind} platform={item.platform} isAd={item.isAd} />
            </div>
            <div className="mt-3 flex items-center gap-2.5 text-white">
              <PlatformBadge platform={item.platform} size="md" />
              <div className="flex-1">
                <div className="text-[14px] font-medium">{item.label}</div>
                <div className="t-mono text-[11px] text-white/60">{PLATFORM_NAMES[item.platform]}</div>
              </div>
              <div className="flex gap-3">
                {item.metrics.map((m, i) => (
                  <span key={i} className="t-mono text-[12px] text-white/80">{m}</span>
                ))}
              </div>
            </div>
            <div className="mt-1 t-mono text-[11px] text-white/40 text-right">{index! + 1} / {items.length}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
