"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/services/actions";
import { useProfile } from "@/lib/hooks/useProfile";
import { generateAvatarInfo } from "@/lib/hooks/useAvatar";
import {
  Calendar,
  User,
  Settings,
  LogOut,
  Palette,
  Activity,
  Package,
  MapPin,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserNavProps {
  user: {
    username: string;
    email?: string;
    avatar?: string;
    role?: "user" | "admin" | "moderator";
    isAdmin?: boolean;
  };
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { getProfileCompleteness } = useProfile();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [joinDate, setJoinDate] = useState<string>("");
  const [userStats, setUserStats] = useState({
    totalProducts: 0,
    totalParcels: 0,
    daysActive: 0,
  });

  // Generate avatar info with fallback colors
  const avatarInfo = generateAvatarInfo(user.username, user.avatar);
  const profileCompleteness = getProfileCompleteness();

  useEffect(() => {
    // Fetch real user data from API
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/v1/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();

          if (userData.createdAt) {
            const joinDate = new Date(userData.createdAt);
            setJoinDate(
              joinDate.toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            );
          }

          if (userData.stats) {
            setUserStats({
              totalProducts: userData.stats.totalProducts || 0,
              totalParcels: userData.stats.totalParcels || 0,
              daysActive: userData.stats.daysActive || 0,
            });
          }
        } else {
          // Fallback to mock data if API fails
          const now = new Date();
          const mockJoinDate = new Date(
            now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          );
          setJoinDate(
            mockJoinDate.toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          );

          setUserStats({
            totalProducts: Math.floor(Math.random() * 50) + 5,
            totalParcels: Math.floor(Math.random() * 20) + 2,
            daysActive: Math.floor(
              (now.getTime() - mockJoinDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to current date if fetch fails
        setJoinDate(
          new Date().toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        );

        setUserStats({
          totalProducts: 0,
          totalParcels: 0,
          daysActive: 0,
        });
      }
    };

    fetchUserData();
  }, []);

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

  const getUserStatusColor = () => {
    if (user.isAdmin) return "bg-gradient-to-r from-purple-500 to-pink-500";
    return "bg-gradient-to-r from-green-400 to-blue-500";
  };

  const getUserRoleLabel = () => {
    if (user.isAdmin) return "Administrateur";
    if (user.role === "moderator") return "Modérateur";
    return "Utilisateur";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-10 w-10 rounded-full transition-all duration-300",
            "hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-primary/20",
            "focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-primary/20",
            isOpen && "scale-105 shadow-lg ring-2 ring-primary/20",
          )}
        >
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage
                src={user.avatar}
                alt={user.username}
                className="object-cover"
              />
              <AvatarFallback
                className="font-semibold text-white"
                style={{
                  backgroundColor: avatarInfo.backgroundColor,
                  color: avatarInfo.textColor,
                }}
              >
                {avatarInfo.initials}
              </AvatarFallback>
            </Avatar>

            {/* Status indicator */}
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                getUserStatusColor(),
              )}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 p-0"
        align="end"
        forceMount
        sideOffset={8}
      >
        {/* Header with user info */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4 border-b">
          <div className="flex items-start space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-md">
                <AvatarImage
                  src={user.avatar}
                  alt={user.username}
                  className="object-cover"
                />
                <AvatarFallback
                  className="font-semibold text-white text-lg"
                  style={{
                    backgroundColor: avatarInfo.backgroundColor,
                    color: avatarInfo.textColor,
                  }}
                >
                  {avatarInfo.initials}
                </AvatarFallback>
              </Avatar>

              {user.isAdmin && (
                <div className="absolute -top-1 -right-1">
                  <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-sm truncate">
                  {user.username}
                </p>
                <Badge
                  variant={user.isAdmin ? "default" : "secondary"}
                  className={cn(
                    "text-xs px-2 py-0.5",
                    user.isAdmin &&
                      "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
                  )}
                >
                  {getUserRoleLabel()}
                </Badge>
              </div>

              {user.email && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              )}

              <div className="flex items-center space-x-1 mt-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Membre depuis {joinDate}
                </span>
              </div>
            </div>
          </div>

          {/* Profile completeness */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Profil complété
              </span>
              <span className="text-xs font-semibold">
                {profileCompleteness}%
              </span>
            </div>
            <Progress value={profileCompleteness} className="h-1.5" />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-0 border-b">
          <div className="p-3 text-center border-r">
            <div className="flex flex-col items-center space-y-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold">
                {userStats.totalProducts}
              </span>
              <span className="text-xs text-muted-foreground">Produits</span>
            </div>
          </div>
          <div className="p-3 text-center border-r">
            <div className="flex flex-col items-center space-y-1">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="text-lg font-bold">
                {userStats.totalParcels}
              </span>
              <span className="text-xs text-muted-foreground">Parcelles</span>
            </div>
          </div>
          <div className="p-3 text-center">
            <div className="flex flex-col items-center space-y-1">
              <Activity className="h-4 w-4 text-orange-500" />
              <span className="text-lg font-bold">{userStats.daysActive}</span>
              <span className="text-xs text-muted-foreground">
                Jours actifs
              </span>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-2">
          <div>
            <DropdownMenuItem
              onClick={() => router.push("/profile")}
              className="flex items-center py-2.5 cursor-pointer rounded-md transition-colors"
            >
              <User className="mr-3 h-4 w-4" />
              Mon Profil
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/theme")}
              className="flex items-center py-2.5 cursor-pointer rounded-md transition-colors"
            >
              <Palette className="mr-3 h-4 w-4" />
              Thème
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="flex items-center py-2.5 cursor-pointer rounded-md transition-colors"
            >
              <Settings className="mr-3 h-4 w-4" />
              Paramètres
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center py-2.5 cursor-pointer rounded-md transition-colors text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <LogOut className="mr-3 h-4 w-4" />
              {isSigningOut ? "Déconnexion..." : "Se déconnecter"}
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
