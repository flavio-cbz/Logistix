import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/services/auth"
import { db } from "@/lib/services/database/drizzle-client"
import { marketAnalyses } from "@/lib/services/database/drizzle-schema"
import { eq, and } from "drizzle-orm"
import { 
  validateTaskId, 
  ValidationError, 
  ApiError, 
  createApiErrorResponse 
} from "@/lib/utils/validation"

// GET /api/v1/market-analysis/{task_id} : Statut et résultat d'une analyse
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication check with detailed error handling
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      )
    }
    
    // Parameter validation
    const { id } = params
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("ID de tâche manquant ou invalide", 400, "MISSING_TASK_ID")),
        { status: 400 }
      )
    }

    // Validate task ID format with enhanced error handling
    try {
      validateTaskId(id.trim())
    } catch (e) {
      const errorResponse = createApiErrorResponse(e)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Database query with error handling
    let task
    try {
      task = await db.query.marketAnalyses.findFirst({
        where: and(eq(marketAnalyses.id, id.trim()), eq(marketAnalyses.userId, user.id)),
      })
    } catch (dbError) {
      console.error("Database query error in GET /api/v1/market-analysis/[id]:", dbError)
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur lors de l'accès aux données", 500, "DATABASE_ERROR")),
        { status: 500 }
      )
    }

    if (!task) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Tâche introuvable ou non autorisée", 404, "TASK_NOT_FOUND")),
        { status: 404 }
      )
    }

    // Validate task data structure
    if (!task.id || !task.status || !task.createdAt) {
      console.error("Invalid task data structure:", task)
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Données de tâche corrompues", 500, "CORRUPTED_DATA")),
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      ...task,
      message: "Tâche récupérée avec succès"
    })

  } catch (error: any) {
    console.error("Unexpected error in GET /api/v1/market-analysis/[id]:", error)
    
    // Handle known error types
    if (error instanceof ApiError) {
      const errorResponse = createApiErrorResponse(error)
      return NextResponse.json(errorResponse, { status: error.statusCode })
    }
    
    if (error instanceof ValidationError) {
      const errorResponse = createApiErrorResponse(error)
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    // Handle authentication errors
    if (error?.message?.includes("authentif")) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur d'authentification", 401, "AUTH_ERROR")),
        { status: 401 }
      )
    }
    
    // Generic error fallback
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/market-analysis/{task_id} : Supprimer une analyse
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication check with detailed error handling
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      )
    }
    
    // Parameter validation
    const { id } = params
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("ID de tâche manquant ou invalide", 400, "MISSING_TASK_ID")),
        { status: 400 }
      )
    }

    // Validate task ID format with enhanced error handling
    try {
      validateTaskId(id.trim())
    } catch (e) {
      const errorResponse = createApiErrorResponse(e)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Check if task exists and belongs to user
    let task
    try {
      task = await db.query.marketAnalyses.findFirst({
        where: and(eq(marketAnalyses.id, id.trim()), eq(marketAnalyses.userId, user.id)),
      })
    } catch (dbError) {
      console.error("Database query error in DELETE /api/v1/market-analysis/[id]:", dbError)
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur lors de l'accès aux données", 500, "DATABASE_ERROR")),
        { status: 500 }
      )
    }

    if (!task) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Tâche introuvable ou non autorisée", 404, "TASK_NOT_FOUND")),
        { status: 404 }
      )
    }

    // Check if task can be deleted (business rule: don't delete running tasks)
    if (task.status === "pending") {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Impossible de supprimer une analyse en cours", 409, "TASK_RUNNING")),
        { status: 409 }
      )
    }

    // Perform deletion with error handling
    try {
      const deleteResult = await db.delete(marketAnalyses).where(eq(marketAnalyses.id, id.trim()))
      
      // Verify deletion was successful
      if (!deleteResult) {
        throw new Error("Deletion failed - no rows affected")
      }
    } catch (dbError) {
      console.error("Database deletion error:", dbError)
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur lors de la suppression", 500, "DELETE_ERROR")),
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: "Analyse supprimée avec succès",
      deletedTaskId: id.trim()
    }, { status: 200 })

  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/v1/market-analysis/[id]:", error)
    
    // Handle known error types
    if (error instanceof ApiError) {
      const errorResponse = createApiErrorResponse(error)
      return NextResponse.json(errorResponse, { status: error.statusCode })
    }
    
    if (error instanceof ValidationError) {
      const errorResponse = createApiErrorResponse(error)
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    // Handle authentication errors
    if (error?.message?.includes("authentif")) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur d'authentification", 401, "AUTH_ERROR")),
        { status: 401 }
      )
    }
    
    // Generic error fallback
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    )
  }
}