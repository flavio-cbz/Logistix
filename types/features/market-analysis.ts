export interface MarketAnalysis {
  id: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  reportUrl?: string;
}