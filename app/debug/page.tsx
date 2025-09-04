'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/utils/logging/logger';

export default function DebugPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [databaseData, setDatabaseData] = useState<any>(null);
  const [cookiesData, setCookiesData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessionData();
    fetchDatabaseData();
    fetchCookiesData();
  }, []);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/session');
      const data = await response.json();
      setSessionData(data);
      toast({ title: "Données de session chargées" });
    } catch (error) {
      logger.error("Erreur chargement session data:", error);
      toast({ title: "Erreur chargement session data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/database');
      const data = await response.json();
      setDatabaseData(data);
      toast({ title: "Données de base de données chargées" });
    } catch (error) {
      logger.error("Erreur chargement database data:", error);
      toast({ title: "Erreur chargement database data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCookiesData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/cookies');
      const data = await response.json();
      setCookiesData(data);
      toast({ title: "Données de cookies chargées" });
    } catch (error) {
      logger.error("Erreur chargement cookies data:", error);
      toast({ title: "Erreur chargement cookies data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Page de Débogage</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Button onClick={fetchSessionData} disabled={loading}>
          {loading ? 'Chargement...' : 'Recharger Session Data'}
        </Button>
        <Button onClick={fetchDatabaseData} disabled={loading}>
          {loading ? 'Chargement...' : 'Recharger Database Data'}
        </Button>
        <Button onClick={fetchCookiesData} disabled={loading}>
          {loading ? 'Chargement...' : 'Recharger Cookies Data'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Données de Session</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-md">
              {sessionData ? JSON.stringify(sessionData, null, 2) : 'Aucune donnée de session'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Données de Base de Données</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-md">
              {databaseData ? JSON.stringify(databaseData, null, 2) : 'Aucune donnée de base de données'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Données de Cookies</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-md">
              {cookiesData ? JSON.stringify(cookiesData, null, 2) : 'Aucune donnée de cookies'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}