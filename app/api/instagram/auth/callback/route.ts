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

    // Step 2: Exchange short-lived token for long-lived token
    const { accessToken: longLivedToken, expiresIn } =
      await InstagramAPIService.exchangeForLongLivedToken(
        shortLivedToken,
        FACEBOOK_APP_ID,
        FACEBOOK_APP_SECRET
      );

    // Calculate token expiration date
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Step 3: Get Facebook Pages for the user
    const pages = await InstagramAPIService.getUserPages(longLivedToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram_error=No+Facebook+Pages+found.+Please+create+a+Facebook+Page+first.`
      );
    }

    // Step 4: Find Instagram Business Account connected to any of the pages
    let instagramAccount: { id: string; username: string } | null = null;
    let connectedPage: { id: string; name: string; accessToken: string } | null = null;

    for (const page of pages) {
      const igAccount = await InstagramAPIService.getInstagramAccountForPage(
        page.id,
        page.accessToken
      );

      if (igAccount) {
        instagramAccount = igAccount;
        connectedPage = page;
        break;
      }
    }

    if (!instagramAccount || !connectedPage) {
      return NextResponse.redirect(
        `${settingsUrl}?instagram_error=No+Instagram+Business+account+found.+Please+connect+an+Instagram+Business+or+Creator+account+to+your+Facebook+Page.`
      );
    }

    // Step 5: Get additional profile information
    const instagramService = new InstagramAPIService(
      connectedPage.accessToken,
      instagramAccount.id
    );

    let profile;
    try {
      profile = await instagramService.getUserProfile();
    } catch (err) {
      console.error("Error fetching Instagram profile:", err);
      // Continue with basic info if profile fetch fails
      profile = {
        id: instagramAccount.id,
        username: instagramAccount.username,
        profilePictureUrl: undefined,
        followersCount: undefined,
        accountType: "business",
      };
    }

    // Step 6: Save or update Instagram account in database
    await prisma.instagramAccount.upsert({
      where: { userId },
      create: {
        userId,
        instagramUserId: instagramAccount.id,
        instagramUsername: profile.username,
        facebookPageId: connectedPage.id,
        facebookPageName: connectedPage.name,
        accessToken: connectedPage.accessToken,
        tokenExpiresAt,
        profilePictureUrl: profile.profilePictureUrl,
        accountType: profile.accountType || "business",
        followersCount: profile.followersCount,
        postsPublishedToday: 0,
        rateLimitResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        connectedAt: new Date(),
        lastSyncAt: new Date(),
      },
      update: {
        instagramUserId: instagramAccount.id,
        instagramUsername: profile.username,
        facebookPageId: connectedPage.id,
        facebookPageName: connectedPage.name,
        accessToken: connectedPage.accessToken,
        tokenExpiresAt,
        profilePictureUrl: profile.profilePictureUrl,
        accountType: profile.accountType || "business",
        followersCount: profile.followersCount,
        lastSyncAt: new Date(),
      },
    });

    // Success! Redirect to settings with success message
    return NextResponse.redirect(
      `${settingsUrl}?instagram_success=Connected+as+@${encodeURIComponent(profile.username)}`
    );
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
