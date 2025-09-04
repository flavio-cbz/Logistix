"use client"

import React, { useState } from 'react'
import { ModernChart } from './modern-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Sample data for demonstration
const sampleLineData = [
  { month: 'Jan', sales: 4000, profit: 2400 },
  { month: 'Feb', sales: 3000, profit: 1398 },
  { month: 'Mar', sales: 2000, profit: 9800 },
  { month: 'Apr', sales: 2780, profit: 3908 },
  { month: 'May', sales: 1890, profit: 4800 },
  { month: 'Jun', sales: 2390, profit: 3800 },
  { month: 'Jul', sales: 3490, profit: 4300 },
]

const sampleBarData = [
  { category: 'Électronique', value: 4000 },
  { category: 'Vêtements', value: 3000 },
  { category: 'Maison', value: 2000 },
  { category: 'Sport', value: 2780 },
  { category: 'Livres', value: 1890 },
]

const samplePieData = [
  { name: 'Desktop', value: 400 },
  { name: 'Mobile', value: 300 },
  { name: 'Tablet', value: 200 },
  { name: 'Other', value: 100 },
]

export const ModernChartDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('line')
  const [animationsEnabled, setAnimationsEnabled] = useState(true)

  return (
    <div
      className="space-y-8 p-6"
    >
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Graphiques Modernisés - Démonstration
            </CardTitle>
            <CardDescription>
              Découvrez les améliorations apportées aux visualisations de données avec des couleurs harmonieuses, 
              des animations fluides et des tooltips modernes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant={animationsEnabled ? "default" : "outline"}
                onClick={() => setAnimationsEnabled(!animationsEnabled)}
                size="sm"
              >
                {animationsEnabled ? 'Désactiver' : 'Activer'} les animations
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab!}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="line">Ligne</TabsTrigger>
                <TabsTrigger value="area">Zone</TabsTrigger>
                <TabsTrigger value="bar">Barres</TabsTrigger>
                <TabsTrigger value="pie">Secteurs</TabsTrigger>
              </TabsList>

              <TabsContent value="line" className="mt-6">
                <div>
                  <ModernChart
                    data={sampleLineData}
                    type="line"
                    title="Évolution des Ventes et Profits"
                    description="Comparaison mensuelle des performances commerciales"
                    xAxisKey="month"
                    yAxisKey={['sales', 'profit']}
                    enableAnimations={animationsEnabled}
                    height={400}
                    formatValue={(value) => `${value.toLocaleString('fr-FR')}€`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="area" className="mt-6">
                <div>
                  <ModernChart
                    data={sampleLineData}
                    type="area"
                    title="Zone de Performance"
                    description="Visualisation en aires des tendances de vente"
                    xAxisKey="month"
                    yAxisKey={['sales']}
                    enableAnimations={animationsEnabled}
                    height={400}
                    formatValue={(value) => `${value.toLocaleString('fr-FR')}€`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="bar" className="mt-6">
                <div>
                  <ModernChart
                    data={sampleBarData}
                    type="bar"
                    title="Ventes par Catégorie"
                    description="Répartition des ventes selon les catégories de produits"
                    xAxisKey="category"
                    yAxisKey="value"
                    enableAnimations={animationsEnabled}
                    height={400}
                    formatValue={(value) => `${value.toLocaleString('fr-FR')}€`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pie" className="mt-6">
                <div>
                  <ModernChart
                    data={samplePieData}
                    type="pie"
                    title="Répartition du Trafic"
                    description="Sources de trafic par type d'appareil"
                    xAxisKey="name"
                    yAxisKey="value"
                    enableAnimations={animationsEnabled}
                    height={400}
                    showGrid={false}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Améliorations Apportées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-chart-1">🎨 Design System</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Palette de couleurs cohérente avec le thème</li>
                  <li>• Adaptation automatique mode sombre/clair</li>
                  <li>• Typographie améliorée et hiérarchie visuelle</li>
                  <li>• Ombres et bordures modernes</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-chart-2">✨ Animations</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Animations d'entrée fluides et naturelles</li>
                  <li>• Transitions au survol élégantes</li>
                  <li>• Respect des préférences d'accessibilité</li>
                  <li>• Animations échelonnées pour les éléments multiples</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-chart-3">💬 Tooltips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Design moderne avec effet de flou</li>
                  <li>• Formatage intelligent des valeurs</li>
                  <li>• Animations d'apparition/disparition</li>
                  <li>• Meilleure lisibilité et contraste</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-chart-4">📱 Responsive</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Adaptation automatique aux écrans mobiles</li>
                  <li>• Marges et espacements optimisés</li>
                  <li>• Taille de police responsive</li>
                  <li>• Interactions tactiles améliorées</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ModernChartDemo