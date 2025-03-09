"use client";

import { useState } from "react";
import { User } from "next-auth";
import { 
  UserCircle, 
  Settings as SettingsIcon, 
  Terminal
} from "lucide-react";

import { ProfileSettings } from "./profile-settings";
import { PreferencesSettings } from "./preferences-settings";
import { ApiSettings } from "./api-settings";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SettingsSidebarProps {
  user: User;
}

export function SettingsSidebar({ user }: SettingsSidebarProps) {
  const [activeSection, setActiveSection] = useState("profile");

  // Handle section selection
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="flex md:flex-row flex-col gap-8">
      <div className="flex-shrink-0 w-full md:w-64">
        <div className="bg-background border rounded-lg overflow-hidden">
          <div className="p-4">
            <h3 className="font-medium text-lg">Settings</h3>
          </div>
          <Separator />
          <div className="p-2">
            <nav className="space-y-1">
              <Button
                variant={activeSection === "profile" ? "secondary" : "ghost"}
                className="justify-start w-full"
                onClick={() => handleSectionChange("profile")}
              >
                <UserCircle className="mr-2 w-4 h-4" />
                Profile
              </Button>
              <Button
                variant={activeSection === "preferences" ? "secondary" : "ghost"}
                className="justify-start w-full"
                onClick={() => handleSectionChange("preferences")}
              >
                <SettingsIcon className="mr-2 w-4 h-4" />
                Preferences
              </Button>
              <Button
                variant={activeSection === "api" ? "secondary" : "ghost"}
                className="justify-start w-full"
                onClick={() => handleSectionChange("api")}
              >
                <Terminal className="mr-2 w-4 h-4" />
                API
              </Button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-6">
        {activeSection === "profile" && <ProfileSettings user={user} />}
        {activeSection === "preferences" && <PreferencesSettings />}
        {activeSection === "api" && <ApiSettings />}
      </div>
    </div>
  );
} 