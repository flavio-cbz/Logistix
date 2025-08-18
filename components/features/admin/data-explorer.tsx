"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"
import { Database, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DataExplorerProps {
  tables: string[]
  onFetchData: (table: string) => Promise<any[]>
  onUpdateRecord: (table: string, id: string, data: any) => Promise<boolean>
  onDeleteRecord: (table: string, id: string) => Promise<boolean>
}

export function DataExplorer({ tables, onFetchData, onUpdateRecord, onDeleteRecord }: DataExplorerProps) {
  const [activeTable, setActiveTable] = useState<string>(tables[0] || "")
  const [tableData, setTableData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editRecord, setEditRecord] = useState<any | null>(null)
  const [filters, setFilters] = useState<{ field: string; value: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Charger les données de la table active
  useEffect(() => {
    if (activeTable) {
      loadTableData()
    }
  }, [activeTable])

  const loadTableData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await onFetchData(activeTable)
      setTableData(Array.isArray(data) ? data : [])
      // Réinitialiser les filtres et la sélection
      setFilters([])
      setSelectedRecords(new Set())
      setSortConfig(null)
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error)
      setError(error.message || "Erreur lors du chargement des données")
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: error.message || "Impossible de charger les données",
      })
    } finally {
      setLoading(false)
    }
  }

  // Obtenir les colonnes de la table
  const getColumns = () => {
    if (tableData.length === 0) return []
    return Object.keys(tableData[0]).filter((col) => col !== "password_hash")
  }

  // Filtrer les données
  const filteredData = tableData.filter((record) => {
    // Filtre de recherche
    const matchesSearch =
      searchTerm === "" ||
      Object.values(record).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))

    // Filtres avancés
    const matchesFilters =
      filters.length === 0 ||
      filters.every((filter) => String(record[filter.field]).toLowerCase().includes(filter.value.toLowerCase()))

    return matchesSearch && matchesFilters
  })

  // Trier les données
  const sortedData = sortConfig
    ? [...filteredData].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1
        }
        return 0
      })
    : filteredData

  // Gérer le changement de table
  const handleTableChange = (table: string) => {
    setActiveTable(table)
  }

  // Gérer le tri
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Gérer l'ajout d'un filtre
  const addFilter = () => {
    if (getColumns().length > 0) {
      setFilters([...filters, { field: getColumns()[0], value: "" }])
    }
  }

  // Gérer la suppression d'un filtre
  const removeFilter = (index: number) => {
    const newFilters = [...filters]
    newFilters.splice(index, 1)
    setFilters(newFilters)
  }

  // Gérer la mise à jour d'un filtre
  const updateFilter = (index: number, field: string, value: string) => {
    const newFilters = [...filters]
    newFilters[index] = { field, value }
    setFilters(newFilters)
  }

  // Gérer la sélection d'un enregistrement
  const toggleRecordSelection = (id: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRecords(newSelected)
  }

  // Gérer la sélection de tous les enregistrements
  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredData.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(filteredData.map((record) => record.id)))
    }
  }

  // Gérer la mise à jour d'un enregistrement
  const handleUpdateRecord = async () => {
    if (!editRecord) return

    try {
      const success = await onUpdateRecord(activeTable, editRecord.id, editRecord)
      if (success) {
        toast({
          title: "Mise à jour réussie",
          description: "L'enregistrement a été mis à jour avec succès",
        })
        // Recharger les données
        await loadTableData()
        setEditRecord(null)
      }
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour:", error)
      toast({
        variant: "destructive",
        title: "Erreur de mise à jour",
        description: error.message || "Impossible de mettre à jour l'enregistrement",
      })
    }
  }

  // Gérer la suppression d'un enregistrement
  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet enregistrement ?")) {
      return
    }

    try {
      const success = await onDeleteRecord(activeTable, id)
      if (success) {
        toast({
          title: "Suppression réussie",
          description: "L'enregistrement a été supprimé avec succès",
        })
        // Recharger les données
        await loadTableData()
      }
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error)
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer l'enregistrement",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Explorateur de données
        </CardTitle>
        <CardDescription>Explorez et modifiez les données de votre application</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTable} onValueChange={handleTableChange}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              {tables.map((table) => (
                <TabsTrigger key={table} value={table} className="capitalize">
                  {table}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtres
                {filters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadTableData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 border rounded-md"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Filtres avancés</h3>
                <Button variant="ghost" size="sm" onClick={addFilter}>
                  Ajouter un filtre
                </Button>
              </div>

              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun filtre défini</p>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select value={filter.field} onValueChange={(value) => updateFilter(index, value, filter.value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Champ" />
                        </SelectTrigger>
                        <SelectContent>
                          {getColumns().map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Valeur"
                        value={filter.value}
                        onChange={(e) => updateFilter(index, filter.field, e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeFilter(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Rechercher dans ${activeTable}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="ml-4 text-sm text-muted-foreground">
              {filteredData.length} sur {tableData.length} enregistrements
            </p>
          </div>

          <TabsContent value={activeTable} className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">{error}</div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucune donnée disponible</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedRecords.size === filteredData.length && filteredData.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        {getColumns().map((column) => (
                          <TableHead key={column} className="cursor-pointer" onClick={() => requestSort(column)}>
                            <div className="flex items-center">
                              {column}
                              {sortConfig?.key === column && (
                                <span className="ml-1">{sortConfig.direction === "ascending" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={() => toggleRecordSelection(record.id)}
                            />
                          </TableCell>
                          {getColumns().map((column) => (
                            <TableCell key={column}>
                              {typeof record[column] === "boolean"
                                ? record[column]
                                  ? "Oui"
                                  : "Non"
                                : String(record[column] || "-").substring(0, 100)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setEditRecord({ ...record })}>
                                  Éditer
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modifier l'enregistrement</DialogTitle>
                                  <DialogDescription>
                                    Modifiez les valeurs et cliquez sur Enregistrer pour sauvegarder les modifications.
                                  </DialogDescription>
                                </DialogHeader>
                                {editRecord && (
                                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                                    {getColumns().map((column) => (
                                      <div key={column} className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor={column} className="text-right">
                                          {column}
                                        </Label>
                                        {typeof editRecord[column] === "boolean" ? (
                                          <div className="col-span-3">
                                            <Checkbox
                                              id={column}
                                              checked={editRecord[column]}
                                              onCheckedChange={(checked) =>
                                                setEditRecord({ ...editRecord, [column]: checked })
                                              }
                                            />
                                          </div>
                                        ) : (
                                          <div className="col-span-3">
                                            {String(editRecord[column] || "").length > 100 ? (
                                              <Textarea
                                                id={column}
                                                value={editRecord[column] || ""}
                                                onChange={(e) =>
                                                  setEditRecord({ ...editRecord, [column]: e.target.value })
                                                }
                                                className="col-span-3"
                                              />
                                            ) : (
                                              <Input
                                                id={column}
                                                value={editRecord[column] || ""}
                                                onChange={(e) =>
                                                  setEditRecord({ ...editRecord, [column]: e.target.value })
                                                }
                                                className="col-span-3"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditRecord(null)}>
                                    Annuler
                                  </Button>
                                  <Button onClick={handleUpdateRecord}>Enregistrer</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              Supprimer
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

