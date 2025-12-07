"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  isAdmin?: boolean;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setUser(null);
  };

  useEffect(() => {
    // Vérifier l'authentification côté client
    const checkAuth = async () => {
      try {
        // Inclure les cookies pour l'auth côté serveur (session cookie)
        const response = await fetch("/api/v1/auth/validate-session", {
          credentials: "include",
        });

        // DEBUG: loguer le status pour diagnostiquer les cas 401/500

        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.includes("application/json")) {
          // console.error(
          //   "Réponse inattendue : le serveur n'a pas retourné du JSON. content-type:",
          //   contentType,
          // );
          setUser(null);
          return;
        }

        // Lire le corps pour debug puis parser
        const raw = await response.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch (_parseErr) {
          // console.error(
          //   "Impossible de parser le JSON de la réponse session :",
          //   parseErr,
          //   "raw:",
          //   raw,
          // );
          setUser(null);
          return;
        }

        // L'API validate-session renvoie { success: true, data: { valid: true, user: { id, username } } }
        // Gérer les deux formats possibles (legacy et nouveau)
        const isSuccess = data?.success === true || data?.ok === true;
        const sessionData = data?.data || data; // Support both wrapper and direct format

        if (response.ok && isSuccess && sessionData?.valid === true && sessionData?.user) {
          const user = {
            id: sessionData.user.id,
            username: sessionData.user.username,
            email: sessionData.user.email || `${sessionData.user.username}@logistix.com`,
            isAdmin: sessionData.user.isAdmin || false
          };
          setUser(user);
        } else {
          setUser(null);
        }
      } catch (_error) {
        // console.error(
        //   "Erreur lors de la vérification de l'authentification:",
        //   error,
        // );
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
