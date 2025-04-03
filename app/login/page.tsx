import LoginForm from "@/components/auth/login-form"
import { LogoAnimated } from "@/components/logo-animated"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <LogoAnimated />
      <LoginForm />
    </div>
  )
}

