"use client";

import type { User } from "next-auth";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiSettings } from "./api-settings";
import { DefaultsSettings } from "./defaults-settings";
import { PreferencesSettings } from "./preferences-settings";
import { ProfileSettings } from "./profile-settings";

interface SettingsTabsProps {
    user: User;
}

export function SettingsTabs({ user }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState("profile");

    return (
        <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
        >
            <TabsList className="md:inline-grid grid grid-cols-4 md:grid-cols-4 w-full md:w-auto h-auto md:h-10">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="defaults">Defaults</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-6">
                <ProfileSettings user={user} />
            </TabsContent>
            <TabsContent value="preferences" className="space-y-6">
                <PreferencesSettings />
            </TabsContent>
            <TabsContent value="defaults" className="space-y-6">
                <DefaultsSettings />
            </TabsContent>
            <TabsContent value="api" className="space-y-6">
                <ApiSettings />
            </TabsContent>
        </Tabs>
    );
}
