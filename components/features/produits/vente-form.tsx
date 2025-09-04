import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Produit } from "@/types/database";

const VenteFormSchema = z.object({
  prixVente: z.coerce.number().min(0.01, "Le prix de vente doit être supérieur à 0."),
  dateVente: z.date({
    required_error: "La date de vente est requise.",
  }),
  plateforme: z.string().min(1, "La plateforme est requise."),
  dateAchat: z.date({ // Changed from dateMiseEnVente to dateAchat
    required_error: "La date d'achat est requise.",
  }),
  tempsEnLigne: z.string().optional(),
});

type VenteFormValues = z.infer<typeof VenteFormSchema>;

interface VenteFormProps {
  produit: Produit;
  onSave: (produitData: Partial<Produit>) => void;
  onCancel: () => void;
}

export function VenteForm({ produit, onSave, onCancel }: VenteFormProps) {
  const form = useForm<VenteFormValues>({
    resolver: zodResolver(VenteFormSchema),
    defaultValues: {
      prixVente: produit.prixVente || 0, // Changed from produit.prix to produit.prixVente
      dateVente: produit.dateVente ? new Date(produit.dateVente) : new Date(),
      plateforme: produit.plateforme || "Vinted",
      dateAchat: produit.dateAchat ? new Date(produit.dateAchat) : new Date(), // Changed from dateMiseEnVente to dateAchat
      tempsEnLigne: produit.tempsEnLigne || undefined,
    },
  });

  const onSubmit = (values: VenteFormValues) => {
    let calculatedTempsEnLigne: string | undefined = undefined;
    if (values.dateAchat && values.dateVente) { // Changed from dateMiseEnVente to dateAchat
      const diffTime = Math.abs(values.dateVente.getTime() - values.dateAchat.getTime()); // Changed from dateMiseEnVente to dateAchat
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      calculatedTempsEnLigne = `${diffDays} jours`;
    }

    const produitData: Partial<Produit> = {
      prixVente: values.prixVente,
      vendu: true,
      dateVente: values.dateVente.toISOString(),
      plateforme: values.plateforme,
      dateAchat: values.dateAchat.toISOString(), // Changed from dateMiseEnVente to dateAchat
      ...(calculatedTempsEnLigne !== undefined && { tempsEnLigne: calculatedTempsEnLigne }),
    };
    onSave(produitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="prixVente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prix de vente</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateVente"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date de vente</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: fr })
                      ) : (
                        <span>Choisir une date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plateforme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plateforme</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateAchat" // Changed from dateMiseEnVente to dateAchat
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date d'achat</FormLabel> {/* Changed label */}
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP", { locale: fr })
                      ) : (
                        <span>Choisir une date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Enregistrer la vente</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      </form>
    </Form>
  );
}