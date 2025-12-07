import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "@/lib/services/product-service";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { Product } from "@/lib/database/schema";

// Mock dependencies
const mockProductRepository = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findByUser: vi.fn(),
  search: vi.fn(),
  count: vi.fn(),
} as unknown as ProductRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PRODUCT_ID = "123e4567-e89b-12d3-a456-426614174001";

describe("ProductService", () => {
  let productService: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    productService = new ProductService(mockProductRepository);
  });

  describe("createProduct", () => {
    it("should create a product successfully", async () => {
      const userId = VALID_USER_ID;
      const input = {
        name: "Test Product",
        price: 100,
      };

      const expectedProduct = {
        id: VALID_PRODUCT_ID,
        ...input,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Product;

      vi.mocked(mockProductRepository.create).mockResolvedValue(expectedProduct);

      const result = await productService.createProduct(userId, input);

      expect(mockProductRepository.create).toHaveBeenCalledWith({ ...input, userId });
      expect(result).toEqual(expectedProduct);
    });
  });

  describe("updateProduct", () => {
    it("should update a product successfully", async () => {
      const productId = VALID_PRODUCT_ID;
      const userId = VALID_USER_ID;
      const updateData = { name: "Updated Name" };
      const existingProduct = { id: productId, userId } as Product;
      const updatedProduct = {
        id: productId,
        userId,
        name: "Updated Name",
        price: 100,
      } as Product;

      vi.mocked(mockProductRepository.findById).mockResolvedValue(existingProduct);
      vi.mocked(mockProductRepository.update).mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(productId, userId, updateData);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.update).toHaveBeenCalledWith(productId, updateData);
      expect(result).toEqual(updatedProduct);
    });

    it("should throw if product not found", async () => {
      vi.mocked(mockProductRepository.findById).mockResolvedValue(null);

      await expect(productService.updateProduct(VALID_PRODUCT_ID, VALID_USER_ID, { name: "test" }))
        .rejects.toThrow(`Product with identifier '${VALID_PRODUCT_ID}' not found`);
    });
  });

  describe("deleteProduct", () => {
    it("should delete a product successfully", async () => {
      const productId = VALID_PRODUCT_ID;
      const userId = VALID_USER_ID;
      const existingProduct = { id: productId, userId } as Product;

      vi.mocked(mockProductRepository.findById).mockResolvedValue(existingProduct);
      vi.mocked(mockProductRepository.delete).mockResolvedValue(true);

      const result = await productService.deleteProduct(productId, userId);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(productId);
      expect(result).toBe(true);
    });
  });

  describe("getProduct", () => {
    it("should return a product by id", async () => {
      const userId = VALID_USER_ID;
      const product = { id: VALID_PRODUCT_ID, name: "Test", userId } as Product;
      vi.mocked(mockProductRepository.findById).mockResolvedValue(product);

      const result = await productService.getProduct(VALID_PRODUCT_ID, userId);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(VALID_PRODUCT_ID);
      expect(result).toEqual(product);
    });
  });

  describe("getUserProducts", () => {
    it("should return products for a user", async () => {
      const products = [{ id: VALID_PRODUCT_ID }, { id: "123e4567-e89b-12d3-a456-426614174002" }] as Product[];
      vi.mocked(mockProductRepository.findByUser).mockResolvedValue(products);

      const result = await productService.getUserProducts(VALID_USER_ID);

      expect(mockProductRepository.findByUser).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toEqual(products);
    });
  });
});

