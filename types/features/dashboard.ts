export interface DashboardCard {
  id: string
  title: string
  type: "stats" | "chart" | "table"
  component: string
  enabled: boolean
  order: number
}

export interface DashboardConfig {
  cards: DashboardCard[]
  layout: string[]
  gridLayout?: {
    lg: number
    md: number
  }
}