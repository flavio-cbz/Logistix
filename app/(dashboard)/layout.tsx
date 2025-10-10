"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/lib/contexts/query-provider";
import { HorizontalNav } from "@/components/layout/horizontal-nav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <div className={cn(
          "flex h-screen bg-background flex-col",
          "transition-all duration-300"
        )}>
          <HorizontalNav />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}