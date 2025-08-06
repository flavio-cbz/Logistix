import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Custom matchers and utilities
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

export const createMockParcelle = (overrides = {}) => ({
  id: '1',
  numero: 'P001',
  transporteur: 'DHL',
  poids: 1.5,
  prixAchat: 25.50,
  dateCreation: new Date().toISOString(),
  userId: '1',
  ...overrides
})

export const createMockProduct = (overrides = {}) => ({
  id: '1',
  nom: 'Test Product',
  prix: 15.99,
  quantite: 1,
  parcelleId: '1',
  description: 'Test product description',
  status: 'available' as const,
  dateCreation: new Date().toISOString(),
  ...overrides
})

// API response mocks
export const createMockApiResponse = <T>(data: T, overrides = {}) => ({
  success: true,
  data,
  message: 'Success',
  timestamp: new Date().toISOString(),
  ...overrides
})

export const createMockApiError = (message = 'Test error', status = 400) => ({
  success: false,
  error: message,
  status,
  timestamp: new Date().toISOString()
})

// Database mock helpers
export const createMockDatabase = () => {
  const data = {
    users: [] as any[],
    parcelles: [] as any[],
    products: [] as any[]
  }

  return {
    data,
    reset: () => {
      data.users = []
      data.parcelles = []
      data.products = []
    },
    seed: (seedData: Partial<typeof data>) => {
      Object.assign(data, seedData)
    }
  }
}

// Form testing utilities
export const fillForm = async (form: HTMLFormElement, data: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react')
  
  Object.entries(data).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement
    if (input) {
      fireEvent.change(input, { target: { value } })
    }
  })
}

// Async testing utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now()
  
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Mock fetch utility
export const createMockFetch = (responses: Record<string, any>) => {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const key = `${options?.method || 'GET'} ${url}`
    const response = responses[key] || responses[url]
    
    if (!response) {
      return Promise.reject(new Error(`No mock response for ${key}`))
    }
    
    return Promise.resolve({
      ok: response.status < 400,
      status: response.status || 200,
      json: () => Promise.resolve(response.data || response),
      text: () => Promise.resolve(JSON.stringify(response.data || response))
    })
  })
}

// Component testing utilities
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  if (!element) {
    throw new Error(`Element with data-testid="${testId}" not found`)
  }
  return element
}

export const queryByTestId = (container: HTMLElement, testId: string) => {
  return container.querySelector(`[data-testid="${testId}"]`)
}