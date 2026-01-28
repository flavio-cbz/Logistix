"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/lib/contexts/query-provider";
import { PreferencesProvider } from "@/lib/contexts/preferences-context";
import { HorizontalNav } from "@/components/layout/horizontal-nav";
import { JobsProvider } from "@/components/features/jobs/jobs-context";
import { NotificationCenter } from "@/components/features/jobs/notification-center";
import { BreadcrumbsBar } from "@/components/layout/breadcrumbs-bar";
import { PageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/shared/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <PreferencesProvider>
          <JobsProvider>
            <div className={cn(
              "flex h-screen bg-background flex-col",
              "transition-all duration-300"
            )}>
              <HorizontalNav />
              <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <BreadcrumbsBar />
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
              <NotificationCenter />
            </div>
          </JobsProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryProvider>
  );
}