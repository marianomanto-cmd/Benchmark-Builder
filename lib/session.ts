// Simulated auth/session (Google login / signup come later). For now a single
// fake user, persisted via cookie + localStorage so SSR and client agree.

export type User = { name: string; email: string; role: string; initials: string; avatar: string };

export const SESSION_COOKIE = "phema_session";

export const FAKE_USER: User = {
  name: "Mariano Manto",
  email: "marianomanto@gmail.com",
  role: "Marketing Lead · Phatia Studio",
  initials: "MM",
  avatar: "https://i.pravatar.cc/120?img=68",
};
