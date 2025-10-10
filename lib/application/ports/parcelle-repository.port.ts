import { Parcelle } from '@/lib/domain/entities/parcelle';

export interface CreateParcelleDTO {
  id?: string;
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  prixAchat?: number | null;
  poids?: number | null;
  prixTotal?: number | null;
  prixParGramme?: number | null;
  actif?: boolean;
}

export interface UpdateParcelleDTO {
  numero?: string;
  transporteur?: string;
  nom?: string;
  statut?: string;
  prixAchat?: number | null;
  poids?: number | null;
  prixTotal?: number | null;
  prixParGramme?: number | null;
  actif?: boolean;
}

export interface ParcelleRepository {
  create(data: CreateParcelleDTO): Promise<Parcelle>;
  findAllByUser(userId: string): Promise<Parcelle[]>;
  findByNumero(numero: string, userId: string): Promise<Parcelle | null>;
  findById(id: string, userId: string): Promise<Parcelle | null>;
  update(id: string, userId: string, patch: UpdateParcelleDTO): Promise<Parcelle>;
  delete(id: string, userId: string): Promise<void>;
}
