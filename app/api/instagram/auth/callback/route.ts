import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  InstagramAPIService,
  InstagramAPIError,
} from "@/lib/instagram-api";

export const dynamic = "force-dynamic";

// Facebook OAuth configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI!;
const API_VERSION = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";

// Base URL for redirects
const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
};

/**
 * GET /api/instagram/auth/callback
 * Handles the OAuth callback from Facebook after user authorization
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = getBaseUrl();
  const settingsUrl = `${baseUrl}/settings`;

  // Handle OAuth errors
  if (error) {
    console.error("Instagram OAuth error:", { error, errorReason, errorDescription });
    const errorMessage = encodeURIComponent(errorDescription || "Authentication failed");
    return NextResponse.redirect(`${settingsUrl}?instagram_error=${errorMessage}`);
  }

  // Verify required parameters
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?instagram_error=Missing+authorization+code`);
  }

  try {
    // Decode and verify state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(`${settingsUrl}?instagram_error=Invalid+state+parameter`);
    }

    const { userId, timestamp } = stateData;

    // Check if state is expired (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(`${settingsUrl}?instagram_error=Authorization+expired`);
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.redirect(`${settingsUrl}?instagram_error=User+not+found`);
    }

    // Step 1: Exchange code for short-lived access token
    const tokenUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", INSTAGRAM_REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Error exchanging code for token:", tokenData.error);
      return NextResponse.redirect(
        `${settingsUrl}?instagram_error=${encodeURIComponent(tokenData.error.message)}`
      );
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Get Facebook Pages FIRST with short-lived token
    // This ensures we get all pages that were granted permissions
    const pages = await InstagramAPIService.getUserPages(shortLivedToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram_error=No+Facebook+Pages+found.+Please+create+a+Facebook+Page+first.`
      );
    }

    // Step 3: Exchange short-lived token for long-lived token
    // Use the long-lived token for future operations
    const { accessToken: longLivedToken, expiresIn } =
      await InstagramAPIService.exchangeForLongLivedToken(
        shortLivedToken,
        FACEBOOK_APP_ID,
        FACEBOOK_APP_SECRET
      );

    // Calculate token expiration date
    // Default to 60 days if expiresIn is missing or invalid
    const expiresInSeconds = typeof expiresIn === "number" ? expiresIn : 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);


    // Step 4: Find ALL Instagram Business Accounts connected to pages
    interface ConnectedAccount {
      igAccount: { id: string; username: string };
      page: { id: string; name: string; accessToken: string };
      profile: {
        id: string;
        username: string;
        profilePictureUrl?: string;
        followersCount?: number;
        accountType: string;
      };
    }

    const connectedAccounts: ConnectedAccount[] = [];

    for (const page of pages) {
      const igAccount = await InstagramAPIService.getInstagramAccountForPage(
        page.id,
        page.accessToken
      );

      if (igAccount) {
        // Step 5: Get profile information for each account
        const instagramService = new InstagramAPIService(
          page.accessToken,
          igAccount.id
        );

        let profile;
        try {
          profile = await instagramService.getUserProfile();
        } catch (err) {
          console.error(`Error fetching Instagram profile for ${igAccount.username}:`, err);
          profile = {
            id: igAccount.id,
            username: igAccount.username,
            profilePictureUrl: undefined,
            followersCount: undefined,
            accountType: "business",
          };
        }

        connectedAccounts.push({
          igAccount,
          page,
          profile: {
            ...profile,
            accountType: profile.accountType ?? "business",
          },
        });
      }
    }

    if (connectedAccounts.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram_error=No+Instagram+Business+account+found.+Please+connect+an+Instagram+Business+or+Creator+account+to+your+Facebook+Page.`
      );
    }

    // Step 6: Check if user has any existing default account
    const existingDefault = await prisma.instagramAccount.findFirst({
      where: { userId, isDefault: true },
    });

    // Step 7: Save or update ALL Instagram accounts in database
    for (let i = 0; i < connectedAccounts.length; i++) {
      const { igAccount, page, profile } = connectedAccounts[i];
      // Set first account as default only if no default exists
      const isDefault = !existingDefault && i === 0;

      await prisma.instagramAccount.upsert({
        where: {
          userId_instagramUserId: {
            userId,
            instagramUserId: igAccount.id,
          },
        },
        create: {
          userId,
          instagramUserId: igAccount.id,
          instagramUsername: profile.username,
          facebookPageId: page.id,
          facebookPageName: page.name,
          accessToken: page.accessToken,
          tokenExpiresAt,
          profilePictureUrl: profile.profilePictureUrl,
          accountType: profile.accountType || "business",
          followersCount: profile.followersCount,
          isDefault,
          postsPublishedToday: 0,
          rateLimitResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          connectedAt: new Date(),
          lastSyncAt: new Date(),
        },
        update: {
          instagramUsername: profile.username,
          facebookPageName: page.name,
          accessToken: page.accessToken,
          tokenExpiresAt,
          profilePictureUrl: profile.profilePictureUrl,
          accountType: profile.accountType || "business",
          followersCount: profile.followersCount,
          lastSyncAt: new Date(),
        },
      });
    }

    // Success! Redirect to settings with success message
    const usernames = connectedAccounts.map(a => `@${a.profile.username}`).join(", ");
    const message = connectedAccounts.length === 1
      ? `Connected+as+${encodeURIComponent(usernames)}`
      : `Connected+${connectedAccounts.length}+accounts:+${encodeURIComponent(usernames)}`;
    return NextResponse.redirect(`${settingsUrl}?instagram_success=${message}`);
  } catch (err) {
    console.error("Error in Instagram OAuth callback:", err);

    let errorMessage = "An+unexpected+error+occurred";
    if (err instanceof InstagramAPIError) {
      errorMessage = encodeURIComponent(err.message);
    } else if (err instanceof Error) {
      errorMessage = encodeURIComponent(err.message);
    }

    return NextResponse.redirect(`${settingsUrl}?instagram_error=${errorMessage}`);
  }
}
