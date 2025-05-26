"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "../../../components/ui/button";

export function SignOutButton() {
    const handleSignOut = async () => {
        try {
            await signOut({
                redirect: false,
            });
            window.location.href = "/";
        } catch (error) {
            console.error("Signout error:", error);
        }
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 w-4 h-4" />
            Logout
        </Button>
    );
}
