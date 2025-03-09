import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth/auth";
import { SettingsSidebar } from "./components/settings-sidebar";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Convert session user to the expected User type with proper role typing
  const user = {
    ...session.user,
    role: session.user.role as UserRole,
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      <SettingsSidebar user={user} />
    </div>
  );
} 