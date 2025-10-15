"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Activity, RefreshCw } from "lucide-react";

export default function AnalyseMarchePage() {
	const [period, setPeriod] = useState("30d");
	const [groupBy, setGroupBy] = useState("month");

	return (
		<div className="min-h-screen bg-background">
			<div className="space-y-6 p-6 max-w-screen-xl mx-auto">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold">Analyse de Marché</h1>
						<p className="text-muted-foreground mt-2">Analyse des tendances • Comparaisons multi-plateformes • Signaux de prix</p>
					</div>

					<div className="flex items-center gap-3">
						<Badge variant="secondary" className="animate-pulse">
							<Activity className="w-3 h-3 mr-1" />
							Mise à jour auto
						</Badge>
						<Button variant="outline" size="sm">
							<RefreshCw className="w-4 h-4 mr-2" />
							Actualiser
						</Button>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex flex-wrap items-center gap-4">
						<Select value={period} onValueChange={(v) => setPeriod(v)}>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="7d">7 Jours</SelectItem>
								<SelectItem value="30d">30 Jours</SelectItem>
								<SelectItem value="90d">3 Mois</SelectItem>
								<SelectItem value="1y">1 An</SelectItem>
							</SelectContent>
						</Select>

						<Select value={groupBy} onValueChange={(v) => setGroupBy(v)}>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="day">Par Jour</SelectItem>
								<SelectItem value="week">Par Semaine</SelectItem>
								<SelectItem value="month">Par Mois</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Badge variant="secondary" className="bg-blue-100 text-blue-700">
						<BarChart3 className="w-3 h-3 mr-1" />
						Période : {period} • Groupé par : {groupBy}
					</Badge>
				</div>

				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="overview">Vue d'Ensemble</TabsTrigger>
						<TabsTrigger value="price">Prix & Tendances</TabsTrigger>
						<TabsTrigger value="compare">Comparaison</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-6">
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							<Card>
								<CardHeader>
									<CardTitle>Signal de Prix</CardTitle>
									<CardDescription>Immersion sur les mouvements récents</CardDescription>
								</CardHeader>
								<CardContent className="p-6">
									<p className="text-sm text-muted-foreground">Tendance actuelle : Stable</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Volume des Annonces</CardTitle>
									<CardDescription>Activité par plateforme</CardDescription>
								</CardHeader>
								<CardContent className="p-6">
									<p className="text-sm text-muted-foreground">Aucune anomalie détectée</p>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Opportunités</CardTitle>
									<CardDescription>Produits sous-évalués</CardDescription>
								</CardHeader>
								<CardContent className="p-6">
									<p className="text-sm text-muted-foreground">Aucune opportunité immédiate</p>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="price" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Evolution des Prix</CardTitle>
								<CardDescription>Graphiques et distribution des prix</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">Graphiques à venir</p>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="compare" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Comparaison Multi-Plateformes</CardTitle>
								<CardDescription>Comparer prix, volume et marge</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">Sélectionnez des plateformes pour comparer</p>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
