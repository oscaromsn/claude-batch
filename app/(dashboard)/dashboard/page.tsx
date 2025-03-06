import { getServerSession } from "next-auth";
import { Bot, History, ListPlus, Settings } from "lucide-react";

import { authOptions } from "@/lib/auth/auth";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name || "User"}
        </p>
      </div>
      
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Batches
            </CardTitle>
            <History className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">0</div>
            <p className="text-muted-foreground text-xs">
              Across all time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Batches
            </CardTitle>
            <Bot className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">0</div>
            <p className="text-muted-foreground text-xs">
              Currently processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              New Batch
            </CardTitle>
            <ListPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Create Batch
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Settings
            </CardTitle>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 