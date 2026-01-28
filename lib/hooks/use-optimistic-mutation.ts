import { useQueryClient, useMutation } from "@tanstack/react-query"

interface UseOptimisticMutationOptions<TData, TVariables, TContext> {
    mutationFn: (variables: TVariables) => Promise<TData>
    onMutate?: (variables: TVariables) => TContext | Promise<TContext>
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void
    onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void
    queryKey: string[]
    optimisticUpdate: (currentData: TData | undefined, variables: TVariables) => TData
}

interface MutationContext<TData, TContext> {
    previousData: TData | undefined;
    customContext: TContext | undefined;
}

/**
 * Hook pour les mutations avec mise à jour optimiste de l'UI
 * L'UI est mise à jour immédiatement avant la confirmation serveur
 */
export function useOptimisticMutation<TData, TVariables, TContext = unknown>({
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    queryKey,
    optimisticUpdate,
}: UseOptimisticMutationOptions<TData, TVariables, TContext>) {
    const queryClient = useQueryClient()

    return useMutation<TData, Error, TVariables, MutationContext<TData, TContext>>({
        mutationFn,
        onMutate: async (variables) => {
            // Annuler les requêtes en cours pour éviter les conflits
            await queryClient.cancelQueries({ queryKey })

            // Sauvegarder l'état actuel
            const previousData = queryClient.getQueryData<TData>(queryKey)

            // Mise à jour optimiste
            queryClient.setQueryData<TData>(queryKey, (old) =>
                optimisticUpdate(old, variables)
            )

            // Appeler onMutate custom si fourni
            const context = onMutate ? await onMutate(variables) : undefined

            // Retourner le contexte avec les données précédentes
            return { previousData, customContext: context }
        },
        onError: (error, variables, context) => {
            // Rollback en cas d'erreur
            if (context?.previousData !== undefined) {
                queryClient.setQueryData(queryKey, context.previousData)
            }
            onError?.(error, variables, context?.customContext)
        },
        onSuccess: (data, variables, context) => {
            // Re-fetch pour s'assurer de la cohérence
            queryClient.invalidateQueries({ queryKey })
            onSuccess?.(data, variables, context?.customContext)
        },
    })
}
