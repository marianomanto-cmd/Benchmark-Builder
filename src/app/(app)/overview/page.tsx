/**
 * Overview placeholder.
 * El layout real (ScreenShell + KPIs + chart + insights + competitors) entra
 * en el próximo commit. Esto sólo valida que el middleware redirige bien.
 */

export default function OverviewPage() {
  return (
    <main className="p-12 max-w-5xl mx-auto">
      <div className="t-micro text-sa-base mb-3">BENCHMARK BUILDER · v0.1</div>
      <h1 className="t-display mb-4">
        Foundation lista. <span className="t-serif italic font-medium text-n-700">A construir.</span>
      </h1>
      <p className="t-body text-n-600 max-w-prose">
        Tokens, fuentes (Geist · JetBrains Mono · Newsreader), auth con allowlist, i18n y motion
        helpers están enchufados. Las 7 pantallas del paquete de diseño se montan en los siguientes
        commits sobre esta base.
      </p>
    </main>
  );
}
