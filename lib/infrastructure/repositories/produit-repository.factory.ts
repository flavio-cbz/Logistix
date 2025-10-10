import { ProduitRepository } from "@/lib/application/ports/produit-repository.port";
import { SQLiteProduitRepository } from "@/lib/infrastructure/repositories/sqlite-produit.repository";

// Future: basculer selon variable d'env (ex: POSTGRES_URL pour impl Postgres)
export function getProduitRepository(): ProduitRepository {
  return new SQLiteProduitRepository();
}
