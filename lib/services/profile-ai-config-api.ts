// Service pour récupérer la configuration IA de l'utilisateur
import { fetchWithRetry } from "@/lib/utils/network";

export async function fetchProfileAiConfig() {
  const res = await fetchWithRetry("/api/v1/profile/ai-config", {
    method: "GET",
    timeoutMs: 15000,
    retries: 3,
  });
  if (!res.ok)
    throw new Error("Erreur lors de la récupération de la configuration IA");
  return await res.json();
}
