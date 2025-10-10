/**
 * Interface Repository pour les Produits
 * 
 * Contrat pur indépendant de toute implémentation DB (SQLite, Postgres, etc.)
 * Toutes les implémentations concrètes doivent respecter cette interface.
 */

import { Product } from '@/lib/shared/types/entities';

/**
 * DTO pour la création d'un produit
 */
export interface CreateProduitDto {
  userId: string;
  parcelleId?: string;
  commandeId: string;
  nom: string;
  details?: string;
  prixArticle: number;
  prixArticleTTC?: number;
  poids: number;
  prixLivraison: number;
  vendu?: boolean;
  dateVente?: string;
  tempsEnLigne?: string;
  prixVente?: number;
  plateforme?: string;
  benefices?: number;
  pourcentageBenefice?: number;
}

/**
 * DTO pour la mise à jour d'un produit
 */
export interface UpdateProduitDto {
  parcelleId?: string;
  commandeId?: string;
  nom?: string;
  details?: string;
  prixArticle?: number;
  prixArticleTTC?: number;
  poids?: number;
  prixLivraison?: number;
  vendu?: boolean;
  dateVente?: string;
  tempsEnLigne?: string;
  prixVente?: number;
  plateforme?: string;
  benefices?: number;
  pourcentageBenefice?: number;
}

/**
 * Interface principale du repository Produit
 * 
 * @interface IProduitRepository
 * @description Définit toutes les opérations CRUD et queries pour les produits
 */
export interface IProduitRepository {
  /**
   * Crée un nouveau produit
   * @param data - Données de création du produit
   * @returns Le produit créé
   * @throws {ValidationError} Si les données sont invalides
   * @throws {DatabaseError} Si l'opération échoue
   */
  create(data: CreateProduitDto): Promise<Product>;

  /**
   * Récupère un produit par son ID
   * @param id - ID du produit
   * @returns Le produit trouvé ou null
   * @throws {DatabaseError} Si l'opération échoue
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Récupère tous les produits d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des produits de l'utilisateur
   * @throws {DatabaseError} Si l'opération échoue
   */
  findByUserId(userId: string): Promise<Product[]>;

  /**
   * Récupère tous les produits d'une parcelle
   * @param parcelleId - ID de la parcelle
   * @returns Liste des produits de la parcelle
   * @throws {DatabaseError} Si l'opération échoue
   */
  findByParcelleId(parcelleId: string): Promise<Product[]>;

  /**
   * Met à jour un produit
   * @param id - ID du produit à mettre à jour
   * @param data - Données de mise à jour
   * @returns Le produit mis à jour
   * @throws {NotFoundError} Si le produit n'existe pas
   * @throws {ValidationError} Si les données sont invalides
   * @throws {DatabaseError} Si l'opération échoue
   */
  update(id: string, data: UpdateProduitDto): Promise<Product>;

  /**
   * Supprime un produit
   * @param id - ID du produit à supprimer
   * @throws {NotFoundError} Si le produit n'existe pas
   * @throws {DatabaseError} Si l'opération échoue
   */
  delete(id: string): Promise<void>;

  /**
   * Compte le nombre total de produits pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Nombre de produits
   * @throws {DatabaseError} Si l'opération échoue
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Recherche des produits par nom (case-insensitive)
   * @param userId - ID de l'utilisateur
   * @param searchTerm - Terme de recherche
   * @returns Liste des produits correspondants
   * @throws {DatabaseError} Si l'opération échoue
   */
  searchByName(userId: string, searchTerm: string): Promise<Product[]>;
}
