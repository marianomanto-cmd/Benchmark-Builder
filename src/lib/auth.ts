/**
 * Auth — NextAuth v5 (Auth.js).
 * Single-user con allowlist: ambos providers (Google + Credentials) validan
 * que el email sea AUTH_ALLOWED_EMAIL o fallan.
 * En Fase 4 esto se reemplaza por multi-tenant sin tocar las pantallas.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ALLOWED_EMAIL = process.env.AUTH_ALLOWED_EMAIL?.toLowerCase().trim();

if (!ALLOWED_EMAIL) {
  // En build esto no rompe (env vars opcionales), pero en runtime el login fallará explícitamente.
  console.warn("[auth] AUTH_ALLOWED_EMAIL no configurado.");
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (email.toLowerCase().trim() !== ALLOWED_EMAIL) return null;
        const hash = process.env.AUTH_DUMMY_PASSWORD_HASH;
        if (!hash) return null;
        const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;
        return { id: "operator", email, name: "Operador" };
      },
    }),
  ],
  callbacks: {
    /** Allowlist global: ningún provider deja pasar otro email. */
    signIn: async ({ user }) => {
      const email = user.email?.toLowerCase().trim();
      if (!email || email !== ALLOWED_EMAIL) return false;
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) token.email = user.email ?? token.email;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.email) session.user.email = token.email as string;
      return session;
    },
  },
});
