"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  getStats,
  getAllUsers,
  resetPassword,
  removeUser,
  cleanupSessions,
  changeAdminPassword,
  getCurrentAdminPassword,
} from "../api/admin/actions"
import { Database, Users, Key, Trash2, RefreshCw, Shield, HardDrive, UserCog } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataExplorer } from "./components/data-explorer"

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, usersData, currentAdminPwd] = await Promise.all([
          getStats(),
          getAllUsers(),
          getCurrentAdminPassword(),
        ])

        setStats(statsData)
        setUsers(usersData)
        setAdminPassword(currentAdminPwd)
        setLoading(false)
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Vous n'avez pas les droits d'accès à cette page.",
        })
        router.push("/dashboard")
      }
    }

    loadData()
  }, [router, toast])

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return

    try {
      const result = await resetPassword(selectedUser.id, newPassword)

      if (result.success) {
        toast({
          title: "Succès",
          description: result.message,
        })
        setSelectedUser(null)
        setNewPassword("")
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message,
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const result = await removeUser(userId)

      if (result.success) {
        toast({
          title: "Succès",
          description: result.message,
        })
        setUsers(users.filter((user) => user.id !== userId))
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message,
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      })
    }
  }

  const handleCleanupSessions = async () => {
    try {
      const result = await cleanupSessions()

      if (result.success) {
        toast({
          title: "Succès",
          description: result.message,
        })

        // Rafraîchir les statistiques
        const statsData = await getStats()
        setStats(statsData)
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message,
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      })
    }
  }

  const handleChangeAdminPassword = async () => {
    if (newAdminPassword !== confirmAdminPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
      })
      return
    }

    try {
      const result = await changeAdminPassword(newAdminPassword)

      if (result.success) {
        toast({
          title: "Succès",
          description: result.message,
        })
        setAdminPassword(newAdminPassword)
        setNewAdminPassword("")
        setConfirmAdminPassword("")
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message,
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Administration</h1>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">
            <Database className="mr-2 h-4 w-4" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Shield className="mr-2 h-4 w-4" />
            Compte administrateur
          </TabsTrigger>
          <TabsTrigger value="explorer">
            <Database className="mr-2 h-4 w-4" />
            Explorateur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.users || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Parcelles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.parcelles || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.produits || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.sessions || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance de la base de données</CardTitle>
                <CardDescription>Effectuez des opérations de maintenance sur la base de données</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Taille de la base de données</h3>
                      <p className="text-sm text-muted-foreground">{stats?.dbSize || "0 MB"}</p>
                    </div>
                    <HardDrive className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Sessions actives</h3>
                      <p className="text-sm text-muted-foreground">{stats?.sessions || 0} sessions</p>
                    </div>
                    <Button variant="outline" onClick={handleCleanupSessions}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Nettoyer les sessions expirées
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations système</CardTitle>
                <CardDescription>Informations sur le système et l'environnement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Version de l'application</h3>
                    <p className="text-sm text-muted-foreground">Logistix v1.0.0</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Environnement</h3>
                    <p className="text-sm text-muted-foreground">{process.env.NODE_ENV || "development"}</p>
                  </div>

                  <div>
                    <h3 className="font-medium">Date et heure du serveur</h3>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>Liste des utilisateurs enregistrés dans l'application</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom d'utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                        {user.username === "admin" && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/10 dark:text-blue-400 dark:ring-blue-400/30">
                            Admin
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mr-2" onClick={() => setSelectedUser(user)}>
                              <Key className="mr-2 h-4 w-4" />
                              Réinitialiser MDP
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                              <DialogDescription>
                                Définir un nouveau mot de passe pour {selectedUser?.username}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <label htmlFor="new-password">Nouveau mot de passe</label>
                                <Input
                                  id="new-password"
                                  type="password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(null)
                                  setNewPassword("")
                                }}
                              >
                                Annuler
                              </Button>
                              <Button onClick={handleResetPassword}>Réinitialiser</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {user.username !== "admin" && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Compte administrateur</CardTitle>
              <CardDescription>Gérer les paramètres du compte administrateur</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <UserCog className="h-4 w-4" />
                  <AlertTitle>Informations importantes</AlertTitle>
                  <AlertDescription>
                    Le compte administrateur (nom d'utilisateur: <strong>admin</strong>) a un accès complet à
                    l'application. Assurez-vous de définir un mot de passe fort et de le conserver en lieu sûr.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Mot de passe actuel</h3>
                  <div className="flex items-center space-x-2">
                    <Input type="text" value={adminPassword} readOnly className="max-w-md font-mono" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(adminPassword)
                        toast({
                          title: "Copié",
                          description: "Mot de passe copié dans le presse-papiers",
                        })
                      }}
                    >
                      Copier
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ce mot de passe est stocké dans un fichier texte dans le dossier data de l'application.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Changer le mot de passe administrateur</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label htmlFor="new-admin-password">Nouveau mot de passe</label>
                      <Input
                        id="new-admin-password"
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-admin-password">Confirmer le mot de passe</label>
                      <Input
                        id="confirm-admin-password"
                        type="password"
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleChangeAdminPassword}>Changer le mot de passe</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="explorer">
          <DataExplorer
            tables={["users", "parcelles", "produits", "sessions"]}
            onFetchData={async (table) => {
              try {
                // Simuler un délai pour montrer le chargement
                await new Promise((resolve) => setTimeout(resolve, 500))

                // Récupérer les données de la table
                let data = []
                if (table === "users") {
                  data = await getAllUsers()
                } else if (table === "parcelles") {
                  // Ici vous devriez implémenter une fonction pour récupérer les parcelles
                  data = []
                } else if (table === "produits") {
                  // Ici vous devriez implémenter une fonction pour récupérer les produits
                  data = []
                } else if (table === "sessions") {
                  // Ici vous devriez implémenter une fonction pour récupérer les sessions
                  data = []
                }

                return data
              } catch (error) {
                console.error(`Erreur lors de la récupération des données de ${table}:`, error)
                return []
              }
            }}
            onUpdateRecord={async (table, id, data) => {
              try {
                // Ici vous devriez implémenter une fonction pour mettre à jour un enregistrement
                console.log(`Mise à jour de l'enregistrement ${id} dans la table ${table}:`, data)
                return true
              } catch (error) {
                console.error(`Erreur lors de la mise à jour de l'enregistrement ${id}:`, error)
                return false
              }
            }}
            onDeleteRecord={async (table, id) => {
              try {
                if (table === "users") {
                  await removeUser(id)
                  return true
                }
                // Implémenter pour les autres tables
                return false
              } catch (error) {
                console.error(`Erreur lors de la suppression de l'enregistrement ${id}:`, error)
                return false
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

