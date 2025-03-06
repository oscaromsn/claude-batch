# Authentication Patterns

## Purpose
Authentication in this application uses NextAuth.js with Prisma adapter for secure user authentication and session management.

## Schema
- `User`: Core user model with email, password (hashed), and role
- `Account`: OAuth provider accounts linked to users
- `Session`: Active user sessions
- `VerificationToken`: Email verification tokens

## Implementation Patterns

### JWT Authentication
```typescript
// In auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    }
  },
  // ...
};
```

### Credentials Provider
```typescript
// In auth.ts within authOptions
providers: [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: credentials.email }
      });
      
      if (!user || !user.password) {
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password
      );
      
      if (!isPasswordValid) {
        return null;
      }
      
      return user;
    }
  })
]
```

### Protected Routes
```typescript
// In middleware.ts
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/batches/:path*"
  ]
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get("next-auth.session-token");
  
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  return NextResponse.next();
}
```

## Error Handling
- Invalid credentials: Return null from authorize function
- Session expiration: Redirect to login
- Unauthorized access: Use middleware to protect routes

## Interface Points
- Login: /api/auth/signin
- Logout: /api/auth/signout
- Registration: /api/auth/register
- Session validation: middleware.ts

## Memory Anchors
- `AUTH_MIDDLEWARE_CONFIG`: Configuration for protected routes
- `AUTH_SESSION_CALLBACK`: Session transformation logic
- `AUTH_CREDENTIALS_PROVIDER`: Email/password authentication logic