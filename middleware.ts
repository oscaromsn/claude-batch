import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const publicPaths = ["/login", "/register", "/api/auth"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is public
    const isPublicPath = publicPaths.some(
        (path) => pathname.startsWith(path) || pathname === "/",
    );

    // Get the token
    const token = await getToken({ req: request });

    // Redirect logic
    if (!token && !isPublicPath) {
        // Redirect to login if not authenticated and trying to access protected route
        const url = new URL("/login", request.url);
        url.searchParams.set("callbackUrl", encodeURI(request.url));
        return NextResponse.redirect(url);
    }

    if (token && (pathname === "/login" || pathname === "/register")) {
        // Redirect to dashboard if already authenticated and trying to access login/register
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Apply security headers to all responses
    const response = NextResponse.next();

    // Define Content Security Policy
    const csp = `
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.anthropic.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    manifest-src 'self';
  `
        .replace(/\s{2,}/g, " ")
        .trim();

    // Apply security headers
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    );
    response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
    );
    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set("X-Download-Options", "noopen");
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

    return response;
}

export const config = {
    matcher: [
        // Apply to all routes except static files and API routes that don't need auth
        "/((?!_next/static|_next/image|favicon.ico|api/webhook).*)",
    ],
};
