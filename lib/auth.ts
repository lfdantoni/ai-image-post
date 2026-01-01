import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

// Check if Google Drive is enabled
const isDriveEnabled = () => {
  const enabled = process.env.GOOGLE_DRIVE_ENABLED;
  if (enabled === "false" || enabled === "0") return false;
  if (enabled === "true" || enabled === "1") return true;
  return enabled === undefined || enabled === null || enabled === "";
};

// Google OAuth scopes - only include Drive if enabled
const getGoogleScopes = () => {
  const baseScopes = ["openid", "email", "profile"];
  if (isDriveEnabled()) {
    baseScopes.push("https://www.googleapis.com/auth/drive.file"); // Access only to files created by this app
  }
  return baseScopes.join(" ");
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: getGoogleScopes(),
        },
      },
    }),
  ],
  events: {
    async signIn({ user, account, isNewUser }) {
      // When user signs in, update the account scope if it has changed
      if (account && account.provider === "google" && account.scope) {
        try {
          await prisma.account.updateMany({
            where: {
              userId: user.id,
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
            data: {
              scope: account.scope,
              access_token: account.access_token || undefined,
              refresh_token: account.refresh_token || undefined,
              expires_at: account.expires_at || undefined,
            },
          });
          console.log(`[signIn] Updated account scope for user ${user.id}: ${account.scope}`);
        } catch (error) {
          console.error(`[signIn] Error updating account scope:`, error);
        }
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      // Indicate if Drive is connected (has tokens)
      if (token.hasDriveAccess) {
        session.user.hasDriveAccess = true;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      // On initial sign-in, check if we have Drive scopes
      if (account) {
        const hasDriverScope = account.scope?.includes("drive.file");
        token.hasDriveAccess = hasDriverScope;
        
        // Also update the account in DB to ensure scope is saved
        if (account.provider === "google" && account.scope) {
          try {
            await prisma.account.updateMany({
              where: {
                userId: user.id,
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
              data: {
                scope: account.scope,
              },
            });
          } catch (error) {
            console.error(`[jwt] Error updating account scope:`, error);
          }
        }
      }
      return token;
    },
  },
});

/**
 * Get Google OAuth tokens for Drive API access
 * @param userId - The user ID to get tokens for
 * @returns Access token and refresh token if available
 */
export async function getGoogleTokens(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });

  if (!account) {
    console.log(`[getGoogleTokens] No account found for userId: ${userId}`);
    return null;
  }

  // Check if scope includes Drive access
  // The scope can be stored as a space-separated string or include the full URL
  const scopeString = account.scope || "";
  const hasDriveScope = 
    scopeString.includes("drive.file") || 
    scopeString.includes("https://www.googleapis.com/auth/drive.file");

  if (!hasDriveScope) {
    console.log(`[getGoogleTokens] Account found but missing Drive scope. Scope: ${scopeString}`);
    return null;
  }

  if (!account.access_token) {
    console.log(`[getGoogleTokens] Account found but no access token`);
    return null;
  }

  return {
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at,
  };
}

/**
 * Update stored tokens after refresh
 * @param userId - The user ID to update tokens for
 * @param tokens - New tokens from refresh
 */
export async function updateGoogleTokens(
  userId: string,
  tokens: { accessToken: string; expiresAt: number }
) {
  await prisma.account.updateMany({
    where: {
      userId,
      provider: "google",
    },
    data: {
      access_token: tokens.accessToken,
      expires_at: tokens.expiresAt,
    },
  });
}
