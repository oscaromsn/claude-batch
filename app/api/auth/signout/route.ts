import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    }

    // Clear the session cookie
    const response = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    
    return response;
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json(
      { message: "Failed to sign out" },
      { status: 500 }
    );
  }
} 