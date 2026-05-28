"use server";

import { redirect } from "next/navigation";

// TODO (Fase 4 — Auth.js): trocar por `signOut()` do NextAuth.
export async function signOutAction() {
  redirect("/login");
}
