import { ScreenShell } from "@/components/shells";
import { Btn, BBBadge } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScreenShell
      crumbs={
        <>
          <span className="text-n-500">Copa Airlines</span>
          <span className="text-n-300">/</span>
          <span className="text-n-900 font-medium">Cartagena Q3</span>
          <BBBadge tone="accent" size="sm">
            run #042
          </BBBadge>
        </>
      }
      actions={
        <>
          <Btn kind="ghost" size="sm">
            Presentación
          </Btn>
          <Btn kind="primary" size="sm">
            Nuevo run
          </Btn>
        </>
      }
    >
      {children}
    </ScreenShell>
  );
}
