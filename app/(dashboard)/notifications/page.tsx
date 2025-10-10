import { getSessionUser } from "@/lib/services/auth/auth";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2 } from "lucide-react";

export default async function NotificationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Mock notifications - dans une vraie app, ces données viendraient de la DB
  const mockNotifications = [
    {
      id: "1",
      type: "success" as const,
      title: "Nouveau produit ajouté",
      message: "Le produit 'iPhone 13' a été ajouté avec succès",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      read: false
    },
    {
      id: "2", 
      type: "warning" as const,
      title: "Stock faible",
      message: "Le produit 'Samsung Galaxy S21' a un stock inférieur à 5 unités",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2h ago
      read: true
    },
    {
      id: "3",
      type: "info" as const,
      title: "Mise à jour système",
      message: "Une nouvelle version de LogistiX est disponible",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true
    }
  ];

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Gérez et consultez vos notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {unreadCount} non lues
          </Badge>
          <Button variant="outline" size="sm">
            <Check className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications récentes
          </CardTitle>
          <CardDescription>
            Voici vos dernières notifications importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockNotifications.length > 0 ? (
            mockNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:bg-muted/50 ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'warning' ? 'bg-orange-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleString('fr-FR')}
                      </span>
                      {!notification.read && (
                        <Badge variant="secondary" className="text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
              <p className="text-muted-foreground">
                Vous n'avez aucune notification pour le moment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}