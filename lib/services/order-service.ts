import { BaseService } from "./base-service";
import { OrderRepository } from "@/lib/repositories";
import {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
} from "@/lib/types/entities";
import {
  createOrderSchema,
  updateOrderSchema,
} from "@/lib/schemas/order";

export class OrderService extends BaseService {
  constructor(private readonly orderRepository: OrderRepository) {
    super("OrderService");
  }

  /**
   * Get all orders for a user
   */
  async getAllOrders(userId: string): Promise<Order[]> {
    return this.executeOperation(
      "getAllOrders",
      async () => {
        this.validateUUID(userId, "userId");

        const orders = await this.orderRepository.findByUserId(userId);

        this.logger.debug("Retrieved orders from repository", {
          userId,
          count: orders.length,
        });

        return orders;
      },
      { userId },
    );
  }

  /**
   * Get an order by ID
   */
  async getOrderById(id: string, userId?: string): Promise<Order | null> {
    return this.executeOperation(
      "getOrderById",
      async () => {
        this.validateUUID(id, "id");

        if (userId) {
          this.validateUUID(userId, "userId");
        }

        const order = await this.orderRepository.findById(id);

        // Check user access if userId is provided
        if (order && userId && order.userId !== userId) {
          this.logger.warn("Unauthorized access attempt to order", {
            orderId: id,
            requestingUserId: userId,
            orderOwnerId: order.userId,
          });

          throw this.createAuthorizationError(
            "Unauthorized access to this order",
          );
        }

        this.logger.debug("Retrieved order from repository", {
          orderId: id,
          userId,
          found: !!order,
        });

        return order;
      },
      { orderId: id, ...(userId && { userId }) },
    );
  }

  /**
   * Create a new order
   */
  async createOrder(
    userId: string,
    data: CreateOrderInput,
  ): Promise<Order> {
    return this.executeOperation(
      "createOrder",
      async () => {
        this.validateUUID(userId, "userId");

        // Validate data with Zod
        const validatedData = this.validateWithSchema(
          createOrderSchema,
          data,
        );

        this.logger.debug("Order data validated successfully", {
          userId,
          superbuyId: validatedData.superbuyId,
        });

        // Check uniqueness of Superbuy ID for this user
        await this.validateUniqueSuperbuyId(userId, validatedData.superbuyId);

        const orderData = {
          ...validatedData,
          userId,
        };

        const newOrder = await this.orderRepository.create(
          orderData as CreateOrderInput & { userId: string },
        );

        this.logger.debug("Order created successfully", {
          userId,
          orderId: newOrder.id,
          superbuyId: newOrder.superbuyId,
        });

        return newOrder;
      },
      {
        userId,
        superbuyId: data.superbuyId,
      },
    );
  }

  /**
   * Update an existing order
   */
  async updateOrder(
    id: string,
    userId: string,
    data: UpdateOrderInput,
  ): Promise<Order | null> {
    return this.executeOperation(
      "updateOrder",
      async () => {
        this.validateUUID(id, "id");
        this.validateUUID(userId, "userId");

        // Ensure order exists and belongs to user
        const existingOrder = await this.getOrderById(id, userId);
        if (!existingOrder) {
          throw this.createNotFoundError("Order", id);
        }

        // Validate data with Zod if data is provided
        let validatedData: UpdateOrderInput = {};
        if (Object.keys(data).length > 0) {
          const rawValidatedData = this.validateWithSchema(updateOrderSchema, data);

          // Filter out undefined values
          validatedData = Object.fromEntries(
            Object.entries(rawValidatedData).filter(([_, value]) => value !== undefined)
          ) as UpdateOrderInput;

          this.logger.debug("Update data validated successfully", {
            orderId: id,
            userId,
            updateFields: Object.keys(validatedData),
          });
        }

        const updatedOrder = await this.orderRepository.update(
          id,
          validatedData as UpdateOrderInput,
        );

        this.logger.debug("Order updated successfully", {
          orderId: id,
          userId,
          updated: !!updatedOrder,
        });

        return updatedOrder;
      },
      { orderId: id, userId },
    );
  }

  /**
   * Delete an order
   */
  async deleteOrder(id: string, userId: string): Promise<boolean> {
    return this.executeOperation(
      "deleteOrder",
      async () => {
        this.validateUUID(id, "id");
        this.validateUUID(userId, "userId");

        // Ensure order exists and belongs to user
        const existingOrder = await this.getOrderById(id, userId);
        if (!existingOrder) {
          throw this.createNotFoundError("Order", id);
        }

        const deleted = await this.orderRepository.delete(id);

        this.logger.debug("Order deleted successfully", {
          orderId: id,
          userId,
          deleted,
        });

        return deleted;
      },
      { orderId: id, userId },
    );
  }

  /**
   * Bulk create orders (skips duplicates based on orderNumber)
   */
  async bulkCreateOrders(
    userId: string,
    inputs: CreateOrderInput[],
  ): Promise<{ created: Order[]; skipped: number }> {
    return this.executeOperation(
      "bulkCreateOrders",
      async () => {
        this.validateUUID(userId, "userId");

        if (inputs.length === 0) {
          return { created: [], skipped: 0 };
        }

        // 1. Validate all inputs
        const validInputs = inputs.map((input) => {
          const validated = this.validateWithSchema(createOrderSchema, input);
          return { ...validated, userId };
        });

        // 2. Check for existing orders
        const superbuyIds = validInputs.map((i) => i.superbuyId).filter(Boolean) as string[];
        const existingOrders = await this.orderRepository.findBySuperbuyIds(
          userId,
          superbuyIds,
        );
        const existingNumbers = new Set(existingOrders.map((o) => o.superbuyId));

        // 3. Filter out duplicates
        const newOrdersData = validInputs.filter(
          (o) => !existingNumbers.has(o.superbuyId),
        );

        if (newOrdersData.length === 0) {
          return { created: [], skipped: inputs.length };
        }

        // 4. Bulk create
        const createdOrders = await this.orderRepository.createMany(
          newOrdersData as (CreateOrderInput & { userId: string })[],
        );

        this.logger.info("Bulk created orders", {
          userId,
          requested: inputs.length,
          created: createdOrders.length,
          skipped: inputs.length - createdOrders.length,
        });

        return {
          created: createdOrders,
          skipped: inputs.length - createdOrders.length,
        };
      },
      { userId, count: inputs.length },
    );
  }

  // =============================================================================
  // PRIVATE UTILITY METHODS
  // =============================================================================

  /**
   * Validate uniqueness of Superbuy ID for a user
   */
  private async validateUniqueSuperbuyId(
    userId: string,
    superbuyId: string,
    excludeOrderId?: string,
  ): Promise<void> {
    try {
      this.logger.debug("Validating Superbuy ID uniqueness", {
        userId,
        superbuyId,
        excludeOrderId,
      });

      const exists = await this.orderRepository.superbuyIdExists(
        superbuyId,
        userId,
        excludeOrderId,
      );

      if (exists) {
        throw this.createBusinessError(
          `An order with Superbuy ID "${superbuyId}" already exists`,
        );
      }
    } catch (error: unknown) {
      this.handleError(error, "validateUniqueSuperbuyId", {
        userId,
        superbuyId,
      });
    }
  }
}
