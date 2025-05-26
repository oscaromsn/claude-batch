import { PrismaClient } from "@prisma/client";

declare global {
    // eslint-disable-next-line no-var
    var cachedPrisma: PrismaClient;
}

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === "production") {
    prismaInstance = new PrismaClient();
} else {
    if (!global.cachedPrisma) {
        global.cachedPrisma = new PrismaClient({
            log: ["query", "error", "warn"],
        });
    }
    prismaInstance = global.cachedPrisma;
}

// Export both db and prisma for compatibility
export const db = prismaInstance;
export const prisma = prismaInstance;
