import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full grid place-items-center bg-paper px-6">
      <div className="w-full max-w-[380px]">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
