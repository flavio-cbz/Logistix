import { useMutation } from "@tanstack/react-query";
import { postJson } from "@/lib/utils/api-fetch";
import { toast } from "sonner";

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

export function useChangePassword() {
  return useMutation<ChangePasswordResponse, Error, ChangePasswordData>({
    mutationFn: async (data) => {
      return await postJson<ChangePasswordData, ChangePasswordResponse>("/api/v1/profile/change-password", data);
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("✓ Mot de passe modifié", {
          description: response.message || "Votre mot de passe a été modifié avec succès.",
        });
      }
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible de modifier le mot de passe.",
      });
    },
  });
}
