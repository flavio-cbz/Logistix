/**
 * Utilitaires pour la gestion des statuts de parcelles
 * Centralise la logique d'affichage et de validation
 */

import { ParcelleStatut } from '@/lib/shared/types/entities';

/**
 * Liste des statuts valides pour les parcelles
 */
export const PARCELLE_STATUTS = [
  ParcelleStatut.EN_ATTENTE,
  ParcelleStatut.EN_TRANSIT,
  ParcelleStatut.LIVRE,
  ParcelleStatut.RETOURNE,
  ParcelleStatut.PERDU,
] as const;

/**
 * Type des statuts de parcelle
 */
export type ParcelleStatutValue = typeof PARCELLE_STATUTS[number];

/**
 * Vérifie si une valeur est un statut valide
 */
export function isValidParcelleStatut(value: string): value is ParcelleStatutValue {
  return PARCELLE_STATUTS.includes(value as ParcelleStatutValue);
}

/**
 * Normalise un statut (pour gérer les variations de casse/format)
 */
export function normalizeParcelleStatut(value: string): ParcelleStatutValue {
  const normalized = value.trim();
  
  // Mapping des anciennes valeurs vers les nouvelles
  const mapping: Record<string, ParcelleStatutValue> = {
    // Variantes "expédié" → En transit
    'Expédié': ParcelleStatut.EN_TRANSIT,
    'expédié': ParcelleStatut.EN_TRANSIT,
    'Expedie': ParcelleStatut.EN_TRANSIT,
    'expedie': ParcelleStatut.EN_TRANSIT,
    'shipped': ParcelleStatut.EN_TRANSIT,
    'Shipped': ParcelleStatut.EN_TRANSIT,

    // Variantes "en traitement"/"processing" → En attente
    'En traitement': ParcelleStatut.EN_ATTENTE,
    'en traitement': ParcelleStatut.EN_ATTENTE,
    'processing': ParcelleStatut.EN_ATTENTE,
    'Processing': ParcelleStatut.EN_ATTENTE,

    // Variantes "annulé"/"cancelled" → Retourné (plus proche sémantiquement)
    'Annulé': ParcelleStatut.RETOURNE,
    'annulé': ParcelleStatut.RETOURNE,
    'annule': ParcelleStatut.RETOURNE,
    'Annule': ParcelleStatut.RETOURNE,
    'cancelled': ParcelleStatut.RETOURNE,
    'Cancelled': ParcelleStatut.RETOURNE,

    // Inconnu/Unknown → En attente (fallback neutre)
    'Inconnu': ParcelleStatut.EN_ATTENTE,
    'inconnu': ParcelleStatut.EN_ATTENTE,
    'unknown': ParcelleStatut.EN_ATTENTE,
    'Unknown': ParcelleStatut.EN_ATTENTE,
    'en_transit': ParcelleStatut.EN_TRANSIT,
    'En_transit': ParcelleStatut.EN_TRANSIT,
    'en transit': ParcelleStatut.EN_TRANSIT,
    'EN TRANSIT': ParcelleStatut.EN_TRANSIT,
    'livré': ParcelleStatut.LIVRE,
    'Livré': ParcelleStatut.LIVRE,
    'LIVRÉ': ParcelleStatut.LIVRE,
    'delivered': ParcelleStatut.LIVRE,
    'Delivered': ParcelleStatut.LIVRE,
    'en_attente': ParcelleStatut.EN_ATTENTE,
    'En_attente': ParcelleStatut.EN_ATTENTE,
    'en attente': ParcelleStatut.EN_ATTENTE,
    'EN ATTENTE': ParcelleStatut.EN_ATTENTE,
    'retourné': ParcelleStatut.RETOURNE,
    'Retourné': ParcelleStatut.RETOURNE,
    'returned': ParcelleStatut.RETOURNE,
    'perdu': ParcelleStatut.PERDU,
    'Perdu': ParcelleStatut.PERDU,
    'lost': ParcelleStatut.PERDU,
  };

  return mapping[normalized] || (isValidParcelleStatut(normalized) ? normalized : ParcelleStatut.EN_ATTENTE);
}

/**
 * Configuration pour l'affichage des badges de statut
 */
export const STATUT_BADGE_CONFIG = {
  [ParcelleStatut.EN_ATTENTE]: {
    variant: 'secondary' as const,
    label: 'En attente',
    color: 'amber',
  },
  [ParcelleStatut.EN_TRANSIT]: {
    variant: 'default' as const,
    label: 'En transit',
    color: 'blue',
  },
  [ParcelleStatut.LIVRE]: {
    variant: 'outline' as const,
    label: 'Livré',
    color: 'green',
  },
  [ParcelleStatut.RETOURNE]: {
    variant: 'destructive' as const,
    label: 'Retourné',
    color: 'orange',
  },
  [ParcelleStatut.PERDU]: {
    variant: 'destructive' as const,
    label: 'Perdu',
    color: 'red',
  },
} as const;

/**
 * Obtient la configuration d'affichage pour un statut
 */
export function getStatutBadgeConfig(statut: string) {
  const normalized = normalizeParcelleStatut(statut);
  return STATUT_BADGE_CONFIG[normalized] || STATUT_BADGE_CONFIG[ParcelleStatut.EN_ATTENTE];
}
