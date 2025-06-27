// Modifiez la redirection pour utiliser une redirection côté serveur
// au lieu d'une redirection côté client

import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dashboard")
}

