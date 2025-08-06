"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Settings2, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { DashboardConfig as DashboardConfigType, DashboardCard } from "@/types/features/dashboard"
import { useStore } from "@/store/store"
import { useToast } from "@/components/ui/use-toast"

interface DashboardConfigProps {
  config: DashboardConfigType
}

export default function DashboardConfig({ config }: DashboardConfigProps) {
  const [open, setOpen] = useState(false)
  const [cards, setCards] = useState<DashboardConfigType["cards"]>([])
  const [availableCards, setAvailableCards] = useState<DashboardCard[]>([])
  const { updateDashboardConfig } = useStore()
  const { toast } = useToast()
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [newCardType, setNewCardType] = useState("")

  // Initialiser les cartes lorsque le dialogue s'ouvre
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && config) {
      setCards([...config.cards])
      // Cartes disponibles mais non visibles
      const visibleCardIds = new Set(config.cards.map((card) => card.id))
      const defaultCards: DashboardCard[] = [
        {
          id: "stats",
          title: "Statistiques principales",
          type: "stats",
          component: "MainStats",
          enabled: true,
          order: 0,
        },
        {
          id: "performance",
          title: "Performance des ventes",
          type: "chart",
          component: "PerformanceChart",
          enabled: true,
          order: 1,
        },
        {
          id: "plateformes",
          title: "Répartition par plateforme",
          type: "chart",
          component: "VentesPlateformes",
          enabled: true,
          order: 2,
        },
        { id: "top-produits", title: "Top produits", type: "table", component: "TopProduits", enabled: true, order: 3 },
        { id: "temps-vente", title: "Temps de vente", type: "chart", component: "TempsVente", enabled: true, order: 4 },
        {
          id: "marge-mensuelle",
          title: "Marge mensuelle",
          type: "chart",
          component: "MargeMensuelle",
          enabled: true,
          order: 5,
        },
        {
          id: "top-parcelles",
          title: "Top parcelles",
          type: "table",
          component: "TopParcelles",
          enabled: true,
          order: 6,
        },
        { id: "cout-poids", title: "Coût par poids", type: "chart", component: "CoutPoids", enabled: true, order: 7 },
        {
          id: "tendances",
          title: "Tendances de vente",
          type: "chart",
          component: "TendancesVente",
          enabled: true,
          order: 8,
        },
      ]
      setAvailableCards(defaultCards.filter((card) => !visibleCardIds.has(card.id)))
    }
    setOpen(isOpen)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination || !cards) return

    const items = Array.from(cards)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Mettre à jour l'ordre
    const updatedCards = items.map((card, index) => ({
      ...card,
      order: index,
    }))

    setCards(updatedCards)
  }

  const handleToggle = (cardId: string, enabled: boolean) => {
    const updatedCards = cards.map((card) => (card.id === cardId ? { ...card, enabled } : card))
    setCards(updatedCards)
  }

  const handleAddCard = (cardId: string) => {
    const cardToAdd = availableCards.find((c) => c.id === cardId)
    if (!cardToAdd) return

    const newCard = {
      ...cardToAdd,
      order: cards.length,
      enabled: true,
    }

    setCards([...cards, newCard])
    setAvailableCards(availableCards.filter((c) => c.id !== cardId))
    setNewCardType("")
  }

  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = cards.find((c) => c.id === cardId)
    if (!cardToRemove) return

    setAvailableCards([...availableCards, cardToRemove])
    setCards(cards.filter((c) => c.id !== cardId))
  }

  const handleUpdateCard = (cardId: string, data: Partial<DashboardCard>) => {
    setCards(cards.map((card) => (card.id === cardId ? { ...card, ...data } : card)))
  }

  const handleSave = async () => {
    try {
      const newConfig: DashboardConfigType = {
        cards,
        layout: cards.filter((card) => card.enabled).map((card) => card.id),
        gridLayout: {
          lg: config.gridLayout?.lg ?? 2,
          md: config.gridLayout?.md ?? 1,
        },
      }
      updateDashboardConfig(newConfig)
      toast({
        title: "Configuration mise à jour",
        description: "La disposition du tableau de bord a été enregistrée.",
      })
      setOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
      })
    }
  }

  const moveCard = (cardId: string, direction: "up" | "down") => {
    const index = cards.findIndex((c) => c.id === cardId)
    if (index === -1) return
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === cards.length - 1) return

    const newCards = [...cards]
    const card = newCards[index]

    if (direction === "up") {
      newCards[index] = newCards[index - 1]
      newCards[index - 1] = card
    } else {
      newCards[index] = newCards[index + 1]
      newCards[index + 1] = card
    }

    const updatedCards = newCards.map((card, idx) => ({
      ...card,
      order: idx,
    }))

    setCards(updatedCards)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configuration du tableau de bord</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto">
          <div className="mb-4 pb-2 border-b">
            <Label className="mb-1 block">Mise en page</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Colonnes (grand écran)</span>
                <Select
                  value={String(config.gridLayout?.lg ?? 2)}
                  onValueChange={(val) =>
                    updateDashboardConfig({
                      ...config,
                      gridLayout: { ...config.gridLayout, lg: Number(val) },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Colonnes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Colonnes (tablette)</span>
                <Select
                  value={String(config.gridLayout?.md ?? 1)}
                  onValueChange={(val) =>
                    updateDashboardConfig({
                      ...config,
                      gridLayout: { ...config.gridLayout, md: Number(val) },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Colonnes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Widgets actifs</Label>
              {availableCards.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Select value={newCardType} onValueChange={setNewCardType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ajouter un widget" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCard(newCardType)}
                    disabled={!newCardType}
                  >
                    Ajouter
                  </Button>
                </div>
              )}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="dashboard-cards">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <Collapsible
                            open={expandedCard === card.id}
                            onOpenChange={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                          >
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="flex items-center justify-between p-3 border rounded-lg bg-card"
                            >
                              <div className="flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                                <div className="flex flex-col">
                                  <span className="font-medium flex items-center gap-1">
                                    {card.title}
                                    <Badge variant="outline" className="ml-2 text-xs py-0">
                                      {card.type === "stats" && "Stats"}
                                      {card.type === "chart" && "Graphique"}
                                      {card.type === "table" && "Tableau"}
                                    </Badge>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={card.enabled}
                                  onCheckedChange={(checked) => handleToggle(card.id, checked)}
                                />
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    {expandedCard === card.id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                            </div>
                            <CollapsibleContent className="mt-1 p-3 border rounded-lg bg-muted/30">
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor={`title-${card.id}`}>Titre</Label>
                                  <Input
                                    id={`title-${card.id}`}
                                    value={card.title}
                                    onChange={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => moveCard(card.id, "up")}
                                      disabled={index === 0}
                                    >
                                      Monter
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => moveCard(card.id, "down")}
                                      disabled={index === cards.length - 1}
                                    >
                                      Descendre
                                    </Button>
                                  </div>
                                  <Button variant="destructive" size="sm" onClick={() => handleRemoveCard(card.id)}>
                                    Supprimer
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
          <Button onClick={handleSave} className="w-full mt-4">
            Enregistrer les modifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
