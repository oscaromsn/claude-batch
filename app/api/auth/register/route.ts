import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db/prisma";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        ),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = registerSchema.parse(body);

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: {
                email: validatedData.email,
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 400 },
            );
        }

        // Hash password
        const hashedPassword = await hash(validatedData.password, 12);

        // Create user
        const user = await db.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(
            { message: "User created successfully", user },
            { status: 201 },
        );
    } catch (error) {
        console.error("Registration error:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: "Invalid input data", errors: error.errors },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}
