// Types for profile and avatar management

export interface AvatarInfo {
  username: string;
  initials: string;
  url?: string;
  backgroundColor?: string;
  textColor?: string;
  hasCustomAvatar?: boolean;
}

export interface UseAvatarState {
  avatar: AvatarInfo;
  loading: boolean;
  error: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
}

// Profile form data
export interface ProfileFormData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: File;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  createdAt?: string;
}

// Profile state
export interface UseProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  hasChanges: boolean;
}

// API response types
export interface ProfileApiResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}

export interface ProfileUpdateApiResponse {
  success: boolean;
  data?: UserProfile;
  error?: string;
}