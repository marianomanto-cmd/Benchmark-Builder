/**
 * Root error boundary — reemplaza el root layout, así que no hay tokens/Tailwind:
 * estilos inline mínimos. Sólo se dispara ante errores en el layout raíz.
 */

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f4ef",
          color: "#181410",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b1a36", fontWeight: 600 }}>
            ERROR
          </div>
          <h1 style={{ fontSize: 28, margin: "12px 0 8px", fontWeight: 600 }}>La aplicación se cayó</h1>
          <p style={{ color: "#5c5346", margin: "0 0 20px", lineHeight: 1.5 }}>
            Ocurrió un error inesperado. Recargá la página; si vuelve a pasar, avisá.
          </p>
          {error.digest && <div style={{ fontFamily: "monospace", fontSize: 11, color: "#857a68", marginBottom: 16 }}>ref: {error.digest}</div>}
          <button
            onClick={reset}
            style={{ height: 36, padding: "0 16px", borderRadius: 4, background: "#181410", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
