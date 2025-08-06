/** @vitest-environment jsdom */
import { renderHook, waitFor, act } from "@testing-library/react"
import { vi } from "vitest"
import { useMarketAnalysis } from "../use-market-analysis"
import type { MarketAnalysisTask } from "../use-market-analysis"

// Mock de la fonction toast
vi.mock("../use-toast", () => ({
  toast: vi.fn(),
}))

// Import the mocked toast function
import { toast } from "../use-toast"
const mockToast = vi.mocked(toast)

describe("useMarketAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should fetch tasks on mount", async () => {
    const mockTasks: MarketAnalysisTask[] = [{
      id: "1",
      status: "completed",
      productName: "Test Product",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: "user1"
    }]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockTasks),
    })

    const { result } = renderHook(() => useMarketAnalysis())

    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.tasks).toEqual(mockTasks)
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/market-analysis")
  })

  it.skip("should handle fetch errors", async () => {
    const errorMessage = "Une erreur inconnue s'est produite"
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: errorMessage })
    })

    const { result } = renderHook(() => useMarketAnalysis())

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage)
    })
    
    expect(result.current.loading).toBe(false)
  })

  it("should create new analysis", async () => {
    const productName = "New Product"
    const newTask: MarketAnalysisTask = {
      id: "new-task-id",
      userId: "user1",
      status: "pending",
      productName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Mock initial fetch and create analysis calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(newTask),
      })

    const { result } = renderHook(() => useMarketAnalysis())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.createAnalysis(productName)
    })

    await waitFor(() => {
      expect(result.current.tasks[0]).toEqual(newTask)
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: "Analyse lancée",
      description: `L'analyse pour "${productName}" a commencé.`,
    })
  })

  it("should delete analysis", async () => {
    const taskIdToDelete = "task-to-delete"
    const mockTasks: MarketAnalysisTask[] = [{
      id: taskIdToDelete,
      status: "completed",
      productName: "Test Product",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: "user1"
    }]

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTasks),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

    const { result } = renderHook(() => useMarketAnalysis())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.tasks).toEqual(mockTasks)

    await act(async () => {
      await result.current.deleteAnalysis(taskIdToDelete)
    })

    expect(global.fetch).toHaveBeenCalledWith(`/api/v1/market-analysis/${taskIdToDelete}`, { method: "DELETE" })
    expect(mockToast).toHaveBeenCalledWith({
      title: "Analyse supprimée",
      description: "La tâche a été supprimée avec succès.",
    })
    expect(result.current.tasks).toEqual([])
  })
})