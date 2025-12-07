import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion | Logistix",
  description:
    "Connectez-vous à votre compte Logistix pour accéder à votre tableau de bord",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Background pattern subtle */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(203_213_225_/_0.1)_1px,transparent_0)] [background-size:16px_16px] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(71_85_105_/_0.1)_1px,transparent_0)]" />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
