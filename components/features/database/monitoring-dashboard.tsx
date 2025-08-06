'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MonitoringData {
  timestamp: string;
  pool: {
    status: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      waitingRequests: number;
    };
    activeConnections: {
      count: number;
      connections: Array<{
        id: string;
        createdAt: string;
        lastUsed: string;
        ageMs: number;
        idleMs: number;
        isInTransaction: boolean;
      }>;
      transactionCount: number;
    };
  };
  logging: {
    totalLogs: {
      connections: number;
      locks: number;
      errors: number;
      monitoring: number;
    };
    recentActivity: {
      errors: number;
      locks: number;
      connections: number;
      errorRate: string;
    };
    activeOperations: number;
  };
  recentLogs: {
    connections: any[];
    locks: any[];
    errors: any[];
    monitoring: any[];
  };
  health: {
    isHealthy: boolean;
    alerts: Array<{
      type: 'warning' | 'error';
      message: string;
      metric: string;
      value: any;
      threshold?: any;
    }>;
  };
}

export function DatabaseMonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/database/monitoring');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch monitoring data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string) => {
    try {
      const response = await fetch('/api/v1/database/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchMonitoringData(); // Refresh data
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const utilizationPercent = data.pool.status.totalConnections > 0 ? 
    (data.pool.status.activeConnections / data.pool.status.totalConnections) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Database Monitoring</h2>
          {data.health.isHealthy ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Alerts */}
      {data.health.alerts.length > 0 && (
        <div className="space-y-2">
          {data.health.alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.type === 'error' ? 'Error' : 'Warning'}</AlertTitle>
              <AlertDescription>
                {alert.message} - {alert.metric}: {alert.value}
                {alert.threshold && ` (threshold: ${alert.threshold})`}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Utilization</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationPercent.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.pool.status.activeConnections} / {data.pool.status.totalConnections} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting Requests</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pool.status.waitingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Requests in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.logging.recentActivity.errorRate}</div>
            <p className="text-xs text-muted-foreground">
              {data.logging.recentActivity.errors} errors in last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.logging.activeOperations}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">
            Connections ({data.logging.totalLogs.connections})
          </TabsTrigger>
          <TabsTrigger value="locks">
            Locks ({data.logging.totalLogs.locks})
          </TabsTrigger>
          <TabsTrigger value="errors">
            Errors ({data.logging.totalLogs.errors})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Connections ({data.pool.activeConnections.count})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Connection Events</CardTitle>
              <CardDescription>
                Latest connection lifecycle events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentLogs.connections.slice(0, 10).map((log: any, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Badge variant={log.event === 'error' ? 'destructive' : 'secondary'}>
                        {log.event}
                      </Badge>
                      <span className="text-sm font-mono">{log.connectionId?.substring(0, 8)}</span>
                      <span className="text-sm text-muted-foreground">{log.context}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                      {log.duration && ` (${log.duration}ms)`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Database Locks</CardTitle>
              <CardDescription>
                Database lock events and resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentLogs.locks.slice(0, 10).map((log: any, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <Badge variant={log.resolved ? 'secondary' : 'destructive'}>
                        {log.lockType}
                      </Badge>
                      <span className="text-sm">{log.operation}</span>
                      <span className="text-sm text-muted-foreground">{log.context}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.duration}ms (attempt {log.retryAttempt})
                      {log.resolved ? ' ✓' : ' ✗'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Database operation errors and retry attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentLogs.errors.slice(0, 10).map((log: any, index) => (
                  <div key={index} className="p-2 border rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">{log.errorType}</Badge>
                        <span className="text-sm">{log.operation}</span>
                        <span className="text-sm text-muted-foreground">{log.context}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.errorMessage}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>
                Currently active database connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.pool.activeConnections.connections.map((conn, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{conn.id}</span>
                      {conn.isInTransaction && (
                        <Badge variant="outline">Transaction</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Age: {Math.round(conn.ageMs / 1000)}s, 
                      Idle: {Math.round(conn.idleMs / 1000)}s
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Monitoring and maintenance actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => executeAction('update-monitoring')}
            >
              Update Stats
            </Button>
            <Button
              variant="outline"
              onClick={() => executeAction('health-check')}
            >
              Health Check
            </Button>
            <Button
              variant="destructive"
              onClick={() => executeAction('clear-logs')}
            >
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}