"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Book, MessageCircle, ExternalLink, HelpCircle } from "lucide-react";
import { ContactDialog } from "@/components/features/help/contact-dialog";
import { GuideDialog } from "@/components/features/help/guide-dialog";

const FAQ_ITEMS = [
    {
        id: "item-1",
        question: "Comment importer mes commandes Superbuy ?",
        answer: "Pour importer vos commandes, allez dans l'onglet 'Produits', cliquez sur 'Importer' et sélectionnez 'Superbuy'. Vous devrez connecter votre compte Superbuy si ce n'est pas déjà fait."
    },
    {
        id: "item-2",
        question: "Comment sont calculés les bénéfices ?",
        answer: "Les bénéfices sont calculés en soustrayant le prix d'achat, les frais de livraison (estimés ou réels) et les éventuels frais de plateforme du prix de vente final."
    },
    {
        id: "item-3",
        question: "Puis-je exporter mes données ?",
        answer: "Oui, vous pouvez exporter vos données de produits et de ventes au format CSV depuis la page 'Settings' dans la section 'Export de données'."
    },
    {
        id: "item-4",
        question: "Comment fonctionne l'analyse de marché ?",
        answer: "L'analyse de marché utilise des données agrégées pour vous donner une estimation du prix de vente idéal. Allez dans 'Analyse Marché', entrez le nom de votre produit et suivez les étapes."
    },
    {
        id: "item-5",
        question: "Comment définir mes objectifs financiers ?",
        answer: "Allez dans 'Settings' > 'Préférences' pour définir vos cibles de revenus, de produits vendus et de marge. Ces objectifs seront visibles sur votre Dashboard."
    },
    {
        id: "item-6",
        question: "Mes données sont-elles sécurisées ?",
        answer: "Absolument. Vos données sont stockées localement ou sur votre base de données privée. Aucune donnée n'est partagée avec des tiers sans votre consentement."
    }
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredFaq = FAQ_ITEMS.filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 p-6 max-w-screen-xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Centre d'Aide</h1>
                    <p className="text-muted-foreground">
                        Trouvez des réponses à vos questions et apprenez à utiliser Logistix.
                    </p>
                </div>

                {/* Search */}
                <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher dans l'aide..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Quick Links */}
                <div className="grid gap-6 md:grid-cols-3">
                    <GuideDialog>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Book className="h-5 w-5 text-primary" />
                                    Guide de Démarrage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Apprenez les bases de Logistix : création de parcelles, ajout de produits et suivi des ventes.
                                </p>
                            </CardContent>
                        </Card>
                    </GuideDialog>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full" onClick={() => document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <HelpCircle className="h-5 w-5 text-primary" />
                                FAQ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Réponses aux questions fréquentes sur l'import Superbuy, les statistiques et la gestion de compte.
                            </p>
                        </CardContent>
                    </Card>

                    <ContactDialog>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MessageCircle className="h-5 w-5 text-primary" />
                                    Support
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Besoin d'aide supplémentaire ? Contactez notre équipe de support technique.
                                </p>
                            </CardContent>
                        </Card>
                    </ContactDialog>
                </div>

                {/* FAQ Section */}
                <Card id="faq-section">
                    <CardHeader>
                        <CardTitle>Questions Fréquentes</CardTitle>
                        <CardDescription>
                            {filteredFaq.length} résultat(s) trouvé(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredFaq.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                                {filteredFaq.map((item) => (
                                    <AccordionItem key={item.id} value={item.id}>
                                        <AccordionTrigger>{item.question}</AccordionTrigger>
                                        <AccordionContent>
                                            {item.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Aucune réponse trouvée pour "{searchQuery}"
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contact / Footer */}
                <div className="flex justify-center pt-6">
                    <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Documentation Complète
                    </Button>
                </div>
            </div>
        </div>
    );
}
