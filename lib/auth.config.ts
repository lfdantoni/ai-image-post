import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnGallery = nextUrl.pathname.startsWith("/gallery");
      const isOnUpload = nextUrl.pathname.startsWith("/upload");
      const isOnImage = nextUrl.pathname.startsWith("/image");
      const isCreatePost = nextUrl.pathname.startsWith("/create-post");

      const protectedRoutes = isOnDashboard || isOnGallery || isOnUpload || isOnImage || isCreatePost;

      if (protectedRoutes) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [],
};
