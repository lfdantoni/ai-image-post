import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/gallery/:path*",
    "/upload/:path*",
    "/image/:path*",
    "/create-post/:path*",
  ],
};
