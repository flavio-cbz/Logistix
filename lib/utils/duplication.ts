import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface DuplicateEntityOptions<T> {
  entity: T;
  transform?: (entity: T) => Partial<T>;
  addFunction: (newEntity: T) => void;
  entityName?: string;
}

export function useDuplicateEntity<T extends { id: string }>() {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicateEntity = useCallback(
    ({ entity, transform, addFunction, entityName = 'entity' }: DuplicateEntityOptions<T>) => {
      setIsDuplicating(true);
      setError(null);
      try {
        const newId = uuidv4();
        const duplicatedEntity: T = {
          ...entity,
          id: newId,
          ...(transform ? transform(entity) : {}),
        };
        addFunction(duplicatedEntity);
        // console.log(`Duplication de ${entityName} réussie avec le nouvel ID: ${newId}`);
      } catch (err) {
        // console.error(`Erreur lors de la duplication de ${entityName}:`, err);
        setError(`Échec de la duplication de ${entityName}.`);
      } finally {
        setIsDuplicating(false);
      }
    },
    []
  );

  return { duplicateEntity, isDuplicating, error };
}
