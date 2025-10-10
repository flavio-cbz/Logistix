"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LiveRegionProps {
  message: string;
  priority?: "polite" | "assertive" | "off";
  atomic?: boolean;
  relevant?: "additions" | "removals" | "text" | "all";
  className?: string;
}

/**
 * Live region component for announcing dynamic content changes to screen readers
 */
export function LiveRegion({
  message,
  priority = "polite",
  atomic = true,
  relevant = "all",
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(
        "sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className,
      )}
    >
      {message}
    </div>
  );
}

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = React.useState("");
  const [priority, setPriority] = React.useState<"polite" | "assertive">(
    "polite",
  );

  const announce = React.useCallback(
    (newMessage: string, newPriority: "polite" | "assertive" = "polite") => {
      setMessage("");
      setPriority(newPriority);

      // Small delay to ensure screen readers pick up the change
      setTimeout(() => {
        setMessage(newMessage);
      }, 100);

      // Clear message after announcement
      setTimeout(() => {
        setMessage("");
      }, 3000);
    },
    [],
  );

  return {
    message,
    priority,
    announce,
    LiveRegionComponent: () => (
      <LiveRegion message={message} priority={priority} />
    ),
  };
}

/**
 * Global live region provider for the entire application
 */
interface LiveRegionContextType {
  announce: (_message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = React.createContext<LiveRegionContextType | null>(
  null,
);

export function LiveRegionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { announce, LiveRegionComponent } = useLiveRegion();

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <LiveRegionComponent />
    </LiveRegionContext.Provider>
  );
}

export function useLiveRegionContext() {
  const context = React.useContext(LiveRegionContext);
  if (!context) {
    throw new Error(
      "useLiveRegionContext must be used within a LiveRegionProvider",
    );
  }
  return context;
}
