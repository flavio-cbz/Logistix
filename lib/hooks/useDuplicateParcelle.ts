"use client";

import { useState } from "react";
import { useStore } from "@/lib/services/admin/store";
import type { Parcelle } from "@/types/database";

type DuplicateResult = { ok: true } | { ok: false; error: string };

export function useDuplicateParcelle() {
  const [duplicating, setDuplicating] = useState(false);
  const { addParcelle } = useStore();

  const duplicateParcelle = async (
    parcelle: Parcelle,
  ): Promise<DuplicateResult> => {
    setDuplicating(true);
    try {
      // 1. Filtrer les champs pour correspondre à la signature de addParcelle
      const {
        // Champs à exclure
        id,
        createdAt,
        updatedAt,
        prixParGramme,
        // Champs à conserver
        ...rest
      } = parcelle;

      // 2. Générer un nouveau numéro unique
      const newParcelleData = {
        ...rest,
        numero: `${parcelle.numero}-copie-${Date.now()}`,
        actif: rest.actif ? 1 : 0,
        prixAchat: rest.prixAchat ?? null,
        poids: rest.poids ?? null,
        prixTotal: rest.prixTotal ?? null,
      } as any;

      // 3. Appeler la fonction du store.
      // La fonction addParcelle est de type `void`, nous ne pouvons pas vérifier sa valeur de retour.
      // Nous encapsulons dans un try/catch pour intercepter les erreurs potentielles.
      await addParcelle(newParcelleData);

      return { ok: true };
    } catch (error) {
      console.error("Erreur de duplication de la parcelle:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";
      return { ok: false, error: errorMessage };
    } finally {
      setDuplicating(false);
    }
  };

  return { duplicating, duplicateParcelle };
}
