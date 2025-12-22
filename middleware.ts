import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Si el usuario está intentando acceder a rutas protegidas
    // y no tiene token válido, withAuth lo redirigirá automáticamente a /
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Permitir acceso solo si hay token (usuario autenticado)
        return !!token;
      },
    },
    pages: {
      signIn: "/", // Redirigir a login si no está autenticado
    },
  }
);

// Especificar qué rutas están protegidas
export const config = {
  matcher: [
    "/home/:path*",
    "/api/protected/:path*",
  ],
};
