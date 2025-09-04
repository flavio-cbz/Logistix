import { useCallback } from "react";
import { toast } from "@/components/ui/use-toast";

interface DuplicateEntityOptions<T> {
  entity: T;
  transform: (entity: T) => T;
  addFunction: (entity: T) => void;
  entityName: string;
}

export function useDuplicateEntity<T>() {
  const duplicateEntity = useCallback(
    ({ entity, transform, addFunction, entityName }: DuplicateEntityOptions<T>) => {
      try {
        const duplicated = transform(entity);
        addFunction(duplicated);
        toast({
          title: `Duplication réussie`,
          description: `${entityName} "${
            (duplicated as any).nom || (duplicated as any).name || "nouvelle entité"
          }" a été dupliqué(e).`,
        });
      } catch (error) {
        toast({
          title: `Erreur de duplication`,
          description: `Échec de la duplication de ${entityName}.`,
          variant: "destructive",
        });
        console.error(`Error duplicating ${entityName}:`, error);
      }
    },
    []
  );

  return { duplicateEntity };
}