/**
 * Interface Repository pour les Parcelles
 * 
 * Contrat pur indépendant de toute implémentation DB (SQLite, Postgres, etc.)
 * Toutes les implémentations concrètes doivent respecter cette interface.
 */

import { Parcelle } from '@/lib/domain/entities/parcelle';

/**
 * DTO pour la création d'une parcelle
 */
export interface CreateParcelleDto {
  id?: string;
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  prixAchat?: number;
  poids?: number;
  prixTotal?: number;
  prixParGramme?: number;
}

/**
 * DTO pour la mise à jour d'une parcelle
 */
export interface UpdateParcelleDto {
  numero?: string;
  transporteur?: string;
  nom?: string;
  statut?: string;
  actif?: boolean;
  prixAchat?: number;
  poids?: number;
  prixTotal?: number;
  prixParGramme?: number;
}

/**
 * Interface principale du repository Parcelle
 * 
 * @interface IParcelleRepository
 * @description Définit toutes les opérations CRUD et queries pour les parcelles
 */
export interface IParcelleRepository {
  /**
   * Crée une nouvelle parcelle
   * @param data - Données de création de la parcelle
   * @returns La parcelle créée
   * @throws {ValidationError} Si les données sont invalides
   * @throws {ConflictError} Si le numéro existe déjà pour cet utilisateur
   * @throws {DatabaseError} Si l'opération échoue
   */
  create(data: CreateParcelleDto): Promise<Parcelle>;

  /**
   * Récupère une parcelle par son ID
   * @param id - ID de la parcelle
   * @returns La parcelle trouvée ou null
   * @throws {DatabaseError} Si l'opération échoue
   */
  findById(id: string): Promise<Parcelle | null>;

  /**
   * Récupère toutes les parcelles d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des parcelles de l'utilisateur
   * @throws {DatabaseError} Si l'opération échoue
   */
  findByUserId(userId: string): Promise<Parcelle[]>;

  /**
   * Récupère une parcelle par son numéro de tracking et l'ID utilisateur
   * @param userId - ID de l'utilisateur
   * @param numero - Numéro de tracking
   * @returns La parcelle trouvée ou null
   * @throws {DatabaseError} Si l'opération échoue
   */
  findByUserIdAndNumero(userId: string, numero: string): Promise<Parcelle | null>;

  /**
   * Récupère toutes les parcelles d'un transporteur spécifique pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @param transporteur - Nom du transporteur
   * @returns Liste des parcelles du transporteur
   * @throws {DatabaseError} Si l'opération échoue
   */
  findByTransporteur(userId: string, transporteur: string): Promise<Parcelle[]>;

  /**
   * Met à jour une parcelle
   * @param id - ID de la parcelle à mettre à jour
   * @param userId - ID de l'utilisateur propriétaire
   * @param data - Données de mise à jour
   * @returns La parcelle mise à jour
   * @throws {NotFoundError} Si la parcelle n'existe pas
   * @throws {ValidationError} Si les données sont invalides
   * @throws {ConflictError} Si le nouveau numéro existe déjà
   * @throws {DatabaseError} Si l'opération échoue
   */
  update(id: string, userId: string, data: UpdateParcelleDto): Promise<Parcelle>;

  /**
   * Supprime une parcelle
   * @param id - ID de la parcelle à supprimer
   * @throws {NotFoundError} Si la parcelle n'existe pas
   * @throws {DatabaseError} Si l'opération échoue
   */
  delete(id: string): Promise<void>;

  /**
   * Compte le nombre total de parcelles pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Nombre de parcelles
   * @throws {DatabaseError} Si l'opération échoue
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Recherche des parcelles par numéro de tracking (recherche partielle case-insensitive)
   * @param userId - ID de l'utilisateur
   * @param searchTerm - Terme de recherche
   * @returns Liste des parcelles correspondantes
   * @throws {DatabaseError} Si l'opération échoue
   */
  searchByNumero(userId: string, searchTerm: string): Promise<Parcelle[]>;
}
