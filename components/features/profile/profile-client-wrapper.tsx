"use client"

import { SessionProvider } from "next-auth/react"
import { ProfileForm } from "@/components/auth/profile-form"
import { AiConfigForm } from "@/components/features/profile/ai-config-form"
import { AIMonitoringDashboard } from "@/components/features/profile/ai-monitoring-dashboard"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProfileClientWrapperProps {
  initialData: {
    username: string;
    language?: string;
    theme?: string;
    avatar?: string;
  };
}

export function ProfileClientWrapper({ initialData }: ProfileClientWrapperProps) {
  return (
    <SessionProvider basePath="/api/v1/auth">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profil</h3>
          <p className="text-sm text-muted-foreground">Gérez vos informations personnelles et vos préférences.</p>
        </div>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="ai-config">Configuration IA</TabsTrigger>
            <TabsTrigger value="ai-monitoring">Monitoring IA</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <ProfileForm initialData={initialData} />
          </TabsContent>
          
          <TabsContent value="ai-config" className="space-y-6">
            <AiConfigForm />
          </TabsContent>
          
          <TabsContent value="ai-monitoring" className="space-y-6">
            <AIMonitoringDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </SessionProvider>
  )
}