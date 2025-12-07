import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "@/lib/services/order-service";
import { OrderRepository } from "@/lib/repositories";
import { Order } from "@/lib/types/entities";

// Mock dependencies
const mockOrderRepository = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    orderNumberExists: vi.fn(),
    findByOrderNumbers: vi.fn(),
    createMany: vi.fn(),
} as unknown as OrderRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_ORDER_ID = "123e4567-e89b-12d3-a456-426614174001";

describe("OrderService", () => {
    let orderService: OrderService;

    beforeEach(() => {
        vi.clearAllMocks();
        orderService = new OrderService(mockOrderRepository);
    });

    describe("getAllOrders", () => {
        it("should return orders for a user", async () => {
            const orders = [{ id: VALID_ORDER_ID, userId: VALID_USER_ID }] as Order[];
            vi.mocked(mockOrderRepository.findByUserId).mockResolvedValue(orders);

            const result = await orderService.getAllOrders(VALID_USER_ID);

            expect(mockOrderRepository.findByUserId).toHaveBeenCalledWith(VALID_USER_ID);
            expect(result).toEqual(orders);
        });
    });

    describe("getOrderById", () => {
        it("should return order if owned by user", async () => {
            const order = { id: VALID_ORDER_ID, userId: VALID_USER_ID } as Order;
            vi.mocked(mockOrderRepository.findById).mockResolvedValue(order);

            const result = await orderService.getOrderById(VALID_ORDER_ID, VALID_USER_ID);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(VALID_ORDER_ID);
            expect(result).toEqual(order);
        });

        it("should throw authorization error if not owned by user", async () => {
            const order = { id: VALID_ORDER_ID, userId: "other-user-id" } as Order;
            vi.mocked(mockOrderRepository.findById).mockResolvedValue(order);

            await expect(orderService.getOrderById(VALID_ORDER_ID, VALID_USER_ID))
                .rejects.toThrow("Unauthorized access to this order");
        });
    });

    describe("createOrder", () => {
        it("should create order successfully", async () => {
            const input = {
                orderNumber: "ORD-123",
                status: "pending",
                totalAmount: 100,
                currency: "EUR",
            };
            const expectedOrder = { id: VALID_ORDER_ID, ...input, userId: VALID_USER_ID } as Order;

            vi.mocked(mockOrderRepository.orderNumberExists).mockResolvedValue(false);
            vi.mocked(mockOrderRepository.create).mockResolvedValue(expectedOrder);

            const result = await orderService.createOrder(VALID_USER_ID, input as any);

            expect(mockOrderRepository.create).toHaveBeenCalled();
            expect(result).toEqual(expectedOrder);
        });

        it("should throw error if order number exists", async () => {
            const input = {
                orderNumber: "ORD-123",
                status: "pending",
                totalAmount: 100,
                currency: "EUR",
            };
            vi.mocked(mockOrderRepository.orderNumberExists).mockResolvedValue(true);

            await expect(orderService.createOrder(VALID_USER_ID, input as any))
                .rejects.toThrow('An order with number "ORD-123" already exists');
        });
    });

    describe("updateOrder", () => {
        it("should update order successfully", async () => {
            const existingOrder = { id: VALID_ORDER_ID, userId: VALID_USER_ID } as Order;
            const updateData = { status: "shipped" };
            const updatedOrder = { ...existingOrder, ...updateData } as Order;

            vi.mocked(mockOrderRepository.findById).mockResolvedValue(existingOrder);
            vi.mocked(mockOrderRepository.update).mockResolvedValue(updatedOrder);

            const result = await orderService.updateOrder(VALID_ORDER_ID, VALID_USER_ID, updateData as any);

            expect(mockOrderRepository.update).toHaveBeenCalledWith(VALID_ORDER_ID, updateData);
            expect(result).toEqual(updatedOrder);
        });
    });

    describe("deleteOrder", () => {
        it("should delete order successfully", async () => {
            const existingOrder = { id: VALID_ORDER_ID, userId: VALID_USER_ID } as Order;
            vi.mocked(mockOrderRepository.findById).mockResolvedValue(existingOrder);
            vi.mocked(mockOrderRepository.delete).mockResolvedValue(true);

            const result = await orderService.deleteOrder(VALID_ORDER_ID, VALID_USER_ID);

            expect(mockOrderRepository.delete).toHaveBeenCalledWith(VALID_ORDER_ID);
            expect(result).toBe(true);
        });
    });
});
