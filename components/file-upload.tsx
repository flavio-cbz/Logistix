"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, X, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FileUploadProps {
  onFileUpload: (file: File, fileName: string, fileType: string) => void
  onClearFile: () => void
  initialFileName?: string
  disabled?: boolean
  accept?: string
}

export default function FileUpload({
  onFileUpload,
  onClearFile,
  initialFileName,
  disabled = false,
  accept = "*",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState<string | undefined>(initialFileName)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const file = e.target.files[0]
    const fileName = file.name
    const fileType = file.type

    setUploading(true)

    try {
      // Simuler un délai de téléchargement
      await new Promise((resolve) => setTimeout(resolve, 500))

      onFileUpload(file, fileName, fileType)
      setFileName(fileName)

      toast({
        title: "Fichier téléchargé",
        description: "Le fichier a été téléchargé avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier:", error)
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: "Une erreur s'est produite lors du téléchargement du fichier.",
      })
    } finally {
      setUploading(false)
      // Réinitialiser la valeur de l'input pour permettre de télécharger à nouveau le même fichier
      e.target.value = ""
    }
  }

  const handleClearFile = () => {
    setFileName(undefined)
    onClearFile()
  }

  return (
    <div className="space-y-2">
      {fileName ? (
        <div className="flex items-center gap-2 text-sm">
          <Paperclip className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClearFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <label
            htmlFor="file-upload"
            className={`flex items-center gap-1 text-sm cursor-pointer ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:text-primary"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Téléchargement en cours...</span>
              </>
            ) : (
              <>
                <Paperclip className="h-4 w-4" />
                <span>Joindre un fichier</span>
              </>
            )}
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
            accept={accept}
          />
        </div>
      )}
    </div>
  )
}

