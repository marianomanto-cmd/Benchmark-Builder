"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const from = params.get("from") ?? "/overview";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError(t("errorInvalidCredentials"));
      return;
    }
    window.location.href = from;
  };

  return (
    <>
      <div className="t-micro text-sa-base mb-3">BENCHMARK BUILDER</div>
      <h1 className="t-h1 mb-2">{t("loginTitle")}</h1>
      <p className="t-body text-n-600 mb-8">{t("loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="t-micro">{t("email")}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 px-3 rounded-sm border border-n-300 bg-white text-[14px] focus:border-n-900 focus:ring-3 focus:ring-[rgba(24,20,16,0.08)] outline-none transition"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="t-micro">{t("password")}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9 px-3 rounded-sm border border-n-300 bg-white text-[14px] focus:border-n-900 focus:ring-3 focus:ring-[rgba(24,20,16,0.08)] outline-none transition"
          />
        </label>

        {error && (
          <div className="t-mono text-[12px] text-danger" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-sm bg-n-900 text-white text-[13px] font-medium hover:opacity-90 active:translate-y-px transition disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {pending ? "…" : t("signInWithCredentials")}
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-n-200" />
          <span className="t-micro">o</span>
          <div className="flex-1 h-px bg-n-200" />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: from })}
          className="h-9 px-4 rounded-sm bg-white border border-n-300 text-[13px] font-medium hover:bg-n-50 transition"
        >
          {t("signInWithGoogle")}
        </button>
      </form>
    </>
  );
}
