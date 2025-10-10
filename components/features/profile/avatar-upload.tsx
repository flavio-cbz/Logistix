/**
 * Composant d'upload d'avatar avec drag & drop, preview et crop
 * Design pattern: Composant isolé et réutilisable
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAvatar } from "@/lib/hooks/useAvatar";
import {
  Upload,
  Camera,
  Trash2,
  RefreshCw,
  Check,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";

interface AvatarUploadProps {
  username: string;
  currentAvatar?: string;
  onAvatarChange?: (avatarUrl: string | null) => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
};

export function AvatarUpload({
  username,
  currentAvatar,
  onAvatarChange,
  className,
  size = "lg",
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    avatar,
    uploadAvatar,
    removeAvatar,
    isUploading,
    uploadProgress,
    error,
  } = useAvatar(username, currentAvatar);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez sélectionner une image (PNG, JPG, GIF, WebP)",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileProcess = useCallback((file: File) => {
    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  }, []);

  const handleUpload = async (file: File) => {
    const success = await uploadAvatar(file);
    if (success && onAvatarChange) {
      onAvatarChange(avatar.url || null);
    }
  };

  const handleRemove = async () => {
    const success = await removeAvatar();
    if (success && onAvatarChange) {
      onAvatarChange(null);
      setPreview(null);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file) {
      handleFileProcess(file);
    }
  };

  const displayAvatar = preview || avatar.url;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Avatar display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar
            className={cn(
              sizeClasses[size],
              "border-4 border-background shadow-lg transition-all duration-300",
              isDragging && "scale-105 border-primary/50",
            )}
          >
            <AvatarImage
              src={displayAvatar}
              alt={username}
              className="object-cover"
            />
            <AvatarFallback
              className="text-2xl font-bold text-white"
              style={{
                backgroundColor: avatar.backgroundColor,
                color: avatar.textColor,
              }}
            >
              {avatar.initials}
            </AvatarFallback>
          </Avatar>

          {/* Upload progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="text-white text-center space-y-1">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                <div className="text-xs">{uploadProgress}%</div>
              </div>
            </div>
          )}

          {/* Status indicator */}
          {avatar.hasCustomAvatar && !isUploading && (
            <div className="absolute -top-1 -right-1">
              <Badge className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600">
                <Check className="h-3 w-3" />
              </Badge>
            </div>
          )}
        </div>

        {/* Upload progress bar */}
        {isUploading && (
          <div className="w-full max-w-xs space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Téléchargement en cours...
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center space-x-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Upload dropzone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer hover:border-primary/50",
          isDragging && "border-primary bg-primary/10",
        )}
      >
        <CardContent
          className="p-6 text-center space-y-4"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="flex justify-center">
              {isDragging ? (
                <Upload className="h-12 w-12 text-primary animate-bounce" />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging
                  ? "Déposez votre image ici..."
                  : "Glissez-déposez une image ou cliquez pour sélectionner"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP jusqu'à 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={isUploading}
          className="flex items-center space-x-2"
        >
          <Camera className="h-4 w-4" />
          <span>Choisir une image</span>
        </Button>

        {avatar.hasCustomAvatar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isUploading}
            className="flex items-center space-x-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Supprimer</span>
          </Button>
        )}
      </div>

      {/* Help text */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Recommandé: Image carrée de 400x400px minimum
        </p>
        {!avatar.hasCustomAvatar && (
          <p className="text-xs text-muted-foreground">
            Un avatar coloré par défaut est généré à partir de votre nom
          </p>
        )}
      </div>
    </div>
  );
}
