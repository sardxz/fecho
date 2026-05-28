import { NextResponse, type NextRequest } from "next/server";

// TODO (Fase 4 — Auth.js): checar sessão aqui e redirecionar pra /login
// quando faltar sessão em rotas privadas. Por ora, deixa passar tudo.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
