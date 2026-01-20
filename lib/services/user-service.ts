import { BaseService } from "./base-service";
import { serviceContainer } from "./container";
import { User } from "@/lib/database/schema";
import { products, parcels } from "@/lib/database/schema";
import { eq } from "drizzle-orm";

export class UserService extends BaseService {
    constructor() {
        super("UserService");
    }

    /**
     * Get full user profile with statistics
     */
    async getProfile(userId: string) {
        return this.executeOperation("getProfile", async () => {
            const userRepository = serviceContainer.getUserRepository();
            const productRepository = serviceContainer.getProductRepository();
            const parcelleRepository = serviceContainer.getParcelRepository();

            const user = await userRepository.findById(userId);
            if (!user) {
                throw new Error("User not found");
            }

            // Get statistics
            const totalProducts = await productRepository.count({ where: eq(products.userId, userId) });
            const totalParcelles = await parcelleRepository.count({ where: eq(parcels.userId, userId) });

            // Calculate active days
            const createdDate = new Date(user.createdAt);
            const today = new Date();
            const daysActive = Math.floor(
                (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                avatar: user.avatar,
                language: user["language"],
                theme: user["theme"],
                role: user.role,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                stats: {
                    totalProducts,
                    totalParcels: totalParcelles,
                    daysActive,
                    totalAnalyses: 0, // Feature removed
                },
            };
        });
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, data: Partial<Pick<User, "username" | "email" | "bio" | "avatar" | "language" | "theme">>) {
        return this.executeOperation("updateProfile", async () => {
            const userRepository = serviceContainer.getUserRepository();

            const updatedUser = await userRepository.updateProfile(userId, data);
            if (!updatedUser) {
                throw new Error("Failed to update profile");
            }

            return {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                bio: updatedUser.bio,
                avatar: updatedUser.avatar,
                language: updatedUser.language,
                theme: updatedUser.theme,
            };
        });
    }

    /**
     * Get user settings
     */
    async getSettings(userId: string) {
        return this.executeOperation("getSettings", async () => {
            const userRepository = serviceContainer.getUserRepository();
            const user = await userRepository.findById(userId);

            if (!user) {
                throw new Error("User not found");
            }

            // Parse preferences
            const preferences = typeof user.preferences === "string"
                ? JSON.parse(user.preferences || "{}")
                : user.preferences || {};

            return {
                theme: user.theme || "system",
                language: user.language || "fr",
                animations: preferences.animations ?? true,
                preferences: {
                    currency: preferences.currency || "EUR",
                    weightUnit: preferences.weightUnit || "g",
                    dateFormat: preferences.dateFormat || "DD/MM/YYYY",
                    autoExchangeRate: preferences.autoExchangeRate ?? true,
                },
            };
        });
    }

    /**
     * Update user settings
     */
    async updateSettings(userId: string, data: {
        theme?: string;
        language?: string;
        animations?: boolean;
        preferences?: Record<string, unknown>
    }) {
        return this.executeOperation("updateSettings", async () => {
            const userRepository = serviceContainer.getUserRepository();
            const user = await userRepository.findById(userId);

            if (!user) {
                throw new Error("User not found");
            }

            const currentPreferences = typeof user.preferences === "string"
                ? JSON.parse(user.preferences || "{}")
                : user.preferences || {};

            // Merge preferences
            const updatedPreferences = {
                ...currentPreferences,
                ...(data.preferences || {}),
            };

            if (data.animations !== undefined) {
                updatedPreferences.animations = data.animations;
            }

            // Prepare update data
            const updateData: Record<string, unknown> = {};
            if (data.theme) updateData["theme"] = data.theme;
            if (data.language) updateData["language"] = data.language;

            // Update user
            // We need to update preferences field manually as updateProfile only handles specific fields
            // So we use the base repository update method via a custom query or expose a method in UserRepository
            // But UserRepository.updateProfile is limited.
            // Let's use UserRepository.update which is inherited from BaseRepository

            await userRepository.update(userId, {
                ...updateData,
                preferences: updatedPreferences,
            });

            return { message: "Settings updated successfully" };
        });
    }
}
