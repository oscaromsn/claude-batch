import { z } from "zod";

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Base URLs
  NEXT_PUBLIC_BASE_URL: z.string().url().optional().default("http://localhost:3000"),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Anthropic API
  ANTHROPIC_API_KEY: z.string().min(1),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // OAuth providers - optional for local dev with credentials
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  GOOGLE_ID: z.string().optional(),
  GOOGLE_SECRET: z.string().optional(),
});

// Function to validate and get environment variables
export function getEnv(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join("."));
      throw new Error(`Missing or invalid environment variables: ${missingVars.join(", ")}`);
    }
    throw error;
  }
}

// Function to get client-side environment variables
export function getClientEnv(): Pick<z.infer<typeof envSchema>, "NEXT_PUBLIC_BASE_URL"> {
  return {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  };
}
