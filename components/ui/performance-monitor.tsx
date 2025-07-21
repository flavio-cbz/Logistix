"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Clock, Zap, Eye } from "lucide-react"

interface PerformanceMetrics {
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  fcp: number | null // First Contentful Paint
  loadTime: number | null
}

interface ResourceTiming {
  name: string
  size: number
  duration: number
  type: string
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fcp: null,
    loadTime: null,
  })
  const [resources, setResources] = useState<ResourceTiming[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const measurePerformance = () => {
      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const loadTime = navigation.loadEventEnd - navigation.fetchStart

      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || null

      // Get TTFB
      const ttfb = navigation.responseStart - navigation.fetchStart

      setMetrics(prev => ({
        ...prev,
        loadTime,
        fcp,
        ttfb,
      }))

      // Get resource timing
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const processedResources = resourceEntries
        .filter(entry => entry.transferSize > 0)
        .map(entry => ({
          name: entry.name.split('/').pop() || entry.name,
          size: entry.transferSize,
          duration: entry.responseEnd - entry.requestStart,
          type: getResourceType(entry.name),
        }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)

      setResources(processedResources)
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
    }

    // Observe Core Web Vitals
    if ('web-vitals' in window) {
      // This would need the web-vitals library to be properly implemented
      console.log('Web Vitals measurement would be implemented here')
    }

    return () => {
      window.removeEventListener('load', measurePerformance)
    }
  }, [])

  const getResourceType = (url: string): string => {
    if (url.includes('.js')) return 'JavaScript'
    if (url.includes('.css')) return 'CSS'
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'Image'
    if (url.includes('.woff') || url.includes('.ttf')) return 'Font'
    return 'Other'
  }

  const getScoreColor = (value: number, thresholds: [number, number]): string => {
    if (value <= thresholds[0]) return "bg-green-500"
    if (value <= thresholds[1]) return "bg-yellow-500"
    return "bg-red-500"
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Performance Monitor</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-xs">
            Core Web Vitals and resource timing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Core Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {metrics.loadTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Load: {Math.round(metrics.loadTime)}ms</span>
                <div
                  className={`w-2 h-2 rounded-full ${getScoreColor(
                    metrics.loadTime,
                    [2000, 4000]
                  )}`}
                />
              </div>
            )}
            {metrics.fcp && (
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <span>FCP: {Math.round(metrics.fcp)}ms</span>
                <div
                  className={`w-2 h-2 rounded-full ${getScoreColor(
                    metrics.fcp,
                    [1800, 3000]
                  )}`}
                />
              </div>
            )}
            {metrics.ttfb && (
              <div className="flex items-center gap-2">
                <Eye className="h-3 w-3" />
                <span>TTFB: {Math.round(metrics.ttfb)}ms</span>
                <div
                  className={`w-2 h-2 rounded-full ${getScoreColor(
                    metrics.ttfb,
                    [800, 1800]
                  )}`}
                />
              </div>
            )}
          </div>

          {/* Resource breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Largest Resources</h4>
            <div className="space-y-1">
              {resources.slice(0, 5).map((resource, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {resource.type}
                    </Badge>
                    <span className="truncate">{resource.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(resource.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}