import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren autenticación
  const protectedRoutes = ['/admin'];

  // Verificar si la ruta actual requiere autenticación
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Verificar si existe la cookie de sesión
    const sessionCookie = request.cookies.get('flow_session');

    if (!sessionCookie?.value) {
      // No hay sesión, redirigir al login
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que la sesión sea válida (puedes agregar más validaciones aquí)
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      if (!sessionData.id || !sessionData.userName) {
        // Sesión inválida, redirigir al login
        const loginUrl = new URL('/', request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      // Error al parsear la sesión, redirigir al login
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
