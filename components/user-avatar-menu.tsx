"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/services/actions";
import { generateAvatarInfo } from "@/lib/hooks/useAvatar";
import {
  User,
  Settings,
  LogOut,
  Shield,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
  user: {
    username: string;
    email?: string;
    avatar?: string;
    isAdmin?: boolean;
  };
}

export function UserAvatarMenu({ user }: UserAvatarMenuProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Generate avatar info with fallback colors
  const avatarInfo = generateAvatarInfo(user.username, user.avatar);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Get first letter of username for avatar
  const getInitials = () => {
    return user.username.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-8 w-8 rounded-full transition-all duration-200",
            "hover:shadow-md hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-600",
            "focus:shadow-md focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600",
            isOpen && "shadow-md ring-2 ring-gray-200 dark:ring-gray-600",
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.avatar}
              alt={user.username}
              className="object-cover"
            />
            <AvatarFallback
              className="text-sm font-medium text-white"
              style={{
                backgroundColor: avatarInfo.backgroundColor,
              }}
            >
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={user.avatar}
                alt={user.username}
                className="object-cover"
              />
              <AvatarFallback
                className="text-lg font-medium text-white"
                style={{
                  backgroundColor: avatarInfo.backgroundColor,
                }}
              >
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.username}
              </p>
              {user.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              )}
              {user.isAdmin && (
                <div className="flex items-center mt-1">
                  <Shield className="h-3 w-3 text-blue-600 mr-1" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Administrateur
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="flex items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <User className="mr-3 h-4 w-4 text-gray-500" />
            <span>Mon profil</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="flex items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Settings className="mr-3 h-4 w-4 text-gray-500" />
            <span>Paramètres</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/help")}
            className="flex items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <HelpCircle className="mr-3 h-4 w-4 text-gray-500" />
            <span>Aide</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-500" />
            <span>{isSigningOut ? "Déconnexion..." : "Se déconnecter"}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}