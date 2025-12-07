import LoginForm from "@/components/auth/login-form";
import { Package2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Container principal */}
      <div className="w-full max-w-md space-y-8">
        {/* Logo et titre */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-2xl shadow-lg transition-all duration-500 hover:rotate-[-5deg] hover:scale-105">
              <Package2 className="w-8 h-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bienvenue sur Logistix
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous pour accéder à votre tableau de bord
            </p>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <div className="relative">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
