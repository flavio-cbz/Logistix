import { BaseService } from "./base-service";
import { SuperbuyAutomationService } from "@/lib/services/superbuy/automation";
import { ParcelleService } from "./parcelle-service";
import { OrderService } from "./order-service";
import { IntegrationRepository } from "@/lib/repositories/integration-repository";

export class SuperbuySyncService extends BaseService {
  private automationService: SuperbuyAutomationService;

  constructor(
    // Services injected by container but handled internally by automation service
    _parcelleService: ParcelleService,
    _orderService: OrderService,
    _integrationRepository: IntegrationRepository
  ) {
    super("SuperbuySyncService");
    this.automationService = SuperbuyAutomationService.getInstance();
  }

  async syncUserData(
    userId: string, 
    credentials: { username: string; password: string },
    headless: boolean = false
  ): Promise<{ parcelsCount: number; ordersCount: number }> {
    return this.executeOperation("syncUserData", async () => {
      this.logger.info("Starting Superbuy synchronization", { userId, headless });
      
      try {
        // 1. Connect (Login & Save Credentials)
        // Note: automation service handles login and credential storage
        // We use the email as username for login usually
        const connectResult = await this.automationService.connect(userId, credentials.username, credentials.password);
        
        if (!connectResult.success) {
             throw this.createBusinessError(connectResult.message || "Failed to connect to Superbuy.");
        }

        // 2. Sync (Scrape & Save)
        const syncResult = await this.automationService.sync(userId);
        
        if (!syncResult.success) {
            throw this.createBusinessError(syncResult.message || "Failed to sync Superbuy data.");
        }

        const parcelsCount = syncResult.data?.parcelsCount || 0;
        const ordersCount = syncResult.data?.ordersCount || 0;

        this.logger.info("Superbuy sync completed successfully", { parcelsCount, ordersCount });
        return { parcelsCount, ordersCount };

      } catch (error) {
        this.logger.error("Superbuy sync failed", { error });
        throw error;
      }
    }, { userId });
  }
}
