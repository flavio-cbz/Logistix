export interface ProfileData {
    id: string;
    username: string;
    email: string | null;
    avatar: string | null;
    role: string;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    stats?: {
        totalProducts: number;
        totalParcels: number;
        daysActive: number;
    };
}

export interface SettingsData {
    theme: string;
    language: string;
    animations: boolean;
    preferences: {
        currency: string;
        weightUnit: string;
        dateFormat: string;
        autoExchangeRate: boolean;
        manualExchangeRate?: number;
    };
}

export interface Session {
    id: string;
    deviceName: string | null;
    deviceType: string;
    ipAddress: string;
    lastActivityAt: string;
    isCurrent: boolean;
}
