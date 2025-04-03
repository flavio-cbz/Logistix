import SignUpForm from "@/components/auth/signup-form"
import { LogoAnimated } from "@/components/logo-animated"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20">
      <LogoAnimated />
      <SignUpForm />
    </div>
  )
}

