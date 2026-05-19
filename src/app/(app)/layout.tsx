/**
 * Layout del área autenticada.
 * Por ahora un wrapper liviano — ScreenShell se enchufa en el siguiente commit.
 */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper">{children}</div>;
}
