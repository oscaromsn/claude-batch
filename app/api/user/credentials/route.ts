import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth/auth";

/**
 * @name GET_USER_CREDENTIALS
 * @description Get the user's Anthropic API credentials
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get user credentials
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        anthropicApiKey: true,
        anthropicWebhookSecret: true,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Mask API keys for security (return only that they exist)
    return NextResponse.json({
      anthropicApiKey: user.anthropicApiKey ? maskApiKey(user.anthropicApiKey) : "",
      anthropicWebhookSecret: user.anthropicWebhookSecret ? maskApiKey(user.anthropicWebhookSecret) : "",
      hasApiKey: !!user.anthropicApiKey,
      hasWebhookSecret: !!user.anthropicWebhookSecret,
    });
  } catch (error) {
    console.error("[USER_CREDENTIALS_GET] Error details:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * Mask an API key for display, showing only the first and last 4 characters
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return key;
  }
  
  const firstFour = key.substring(0, 7);
  const lastFour = key.substring(key.length - 4);
  const maskedLength = key.length - 11;
  const maskedPart = "*".repeat(maskedLength);
  
  return `${firstFour}${maskedPart}${lastFour}`;
} 