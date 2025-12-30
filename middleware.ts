import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/home/:path*",
    "/pointOfSale/:path*",
    "/api/protected/:path*",
  ],
};
