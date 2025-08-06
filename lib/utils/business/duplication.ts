
import { useToast } from "@/components/ui/use-toast";
import type { Parcelle, Produit } from "@/types/database";

type DuplicableEntity = Parcelle | Produit;

interface DuplicateOptions<T extends DuplicableEntity> {
  entity: T;
  transform: (entity: T) => Omit<T, "id" | "createdAt" | "updatedAt">;
  addFunction: (newEntity: Omit<T, "id" | "createdAt" | "updatedAt">) => void;
  entityName: string;
}

export function useDuplicateEntity<T extends DuplicableEntity>() {
  const { toast } = useToast();

  const duplicateEntity = ({ entity, transform, addFunction, entityName }: DuplicateOptions<T>) => {
    try {
      const newEntityData = transform(entity);
      addFunction(newEntityData);

      toast({
        title: `${entityName} dupliqué(e)`,
        description: `Le/La ${entityName.toLowerCase()} a été dupliqué(e) avec succès.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Une erreur est survenue lors de la duplication du/de la ${entityName.toLowerCase()}.`,
      });
    }
  };

  return duplicateEntity;
}