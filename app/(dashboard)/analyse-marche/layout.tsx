import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Analyse de Marché",
  description: "Analysez les prix du marché, la concurrence et obtenez des recommandations de prix optimaux.",
}
 
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}