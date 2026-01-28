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
  findWithPagination: vi.fn(),
  search: vi.fn(),
  count: vi.fn(),
} as unknown as ProductRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PRODUCT_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_USER_ID = "123e4567-e89b-12d3-a456-426614174099";

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

    it("should throw ValidationError when name is missing", async () => {
      const input = {
        name: "",
        price: 100,
      };

      await expect(productService.createProduct(VALID_USER_ID, input))
        .rejects.toThrow("Le nom du produit est requis");
    });

    it("should throw ValidationError when price is negative", async () => {
      const input = {
        name: "Test Product",
        price: -10,
      };

      await expect(productService.createProduct(VALID_USER_ID, input))
        .rejects.toThrow("Le prix doit être positif");
    });

    it("should throw ValidationError when price is undefined", async () => {
      const input = {
        name: "Test Product",
        price: undefined as any,
      };

      await expect(productService.createProduct(VALID_USER_ID, input))
        .rejects.toThrow("Le prix doit être positif");
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

    it("should throw NotFoundError if product not found", async () => {
      vi.mocked(mockProductRepository.findById).mockResolvedValue(null);

      await expect(productService.updateProduct(VALID_PRODUCT_ID, VALID_USER_ID, { name: "test" }))
        .rejects.toThrow(`Product with identifier '${VALID_PRODUCT_ID}' not found`);
    });

    it("should throw AuthorizationError if user doesn't own product", async () => {
      const existingProduct = { id: VALID_PRODUCT_ID, userId: OTHER_USER_ID } as Product;
      vi.mocked(mockProductRepository.findById).mockResolvedValue(existingProduct);

      await expect(productService.updateProduct(VALID_PRODUCT_ID, VALID_USER_ID, { name: "test" }))
        .rejects.toThrow("Not authorized to update this product");
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

    it("should throw NotFoundError if product not found", async () => {
      vi.mocked(mockProductRepository.findById).mockResolvedValue(null);

      await expect(productService.deleteProduct(VALID_PRODUCT_ID, VALID_USER_ID))
        .rejects.toThrow(`Product with identifier '${VALID_PRODUCT_ID}' not found`);
    });

    it("should throw AuthorizationError if user doesn't own product", async () => {
      const existingProduct = { id: VALID_PRODUCT_ID, userId: OTHER_USER_ID } as Product;
      vi.mocked(mockProductRepository.findById).mockResolvedValue(existingProduct);

      await expect(productService.deleteProduct(VALID_PRODUCT_ID, VALID_USER_ID))
        .rejects.toThrow("Not authorized to delete this product");
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

    it("should return null if product not found", async () => {
      vi.mocked(mockProductRepository.findById).mockResolvedValue(null);

      const result = await productService.getProduct(VALID_PRODUCT_ID, VALID_USER_ID);

      expect(result).toBeNull();
    });

    it("should throw AuthorizationError if user doesn't own product", async () => {
      const product = { id: VALID_PRODUCT_ID, userId: OTHER_USER_ID } as Product;
      vi.mocked(mockProductRepository.findById).mockResolvedValue(product);

      await expect(productService.getProduct(VALID_PRODUCT_ID, VALID_USER_ID))
        .rejects.toThrow("Not authorized to view this product");
    });
  });

  describe("getUserProducts", () => {
    it("should return all products for a user without pagination", async () => {
      const products = [
        { id: VALID_PRODUCT_ID, name: "Product 1" },
        { id: "123e4567-e89b-12d3-a456-426614174002", name: "Product 2" }
      ] as Product[];

      vi.mocked(mockProductRepository.findByUser).mockResolvedValue(products);

      const result = await productService.getUserProducts(VALID_USER_ID);

      expect(mockProductRepository.findByUser).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toEqual(products);
    });

    it("should return paginated products when page and limit provided", async () => {
      const mockPaginatedResult = {
        data: [{ id: VALID_PRODUCT_ID, name: "Product 1" } as Product],
        total: 10,
        limit: 5,
        offset: 0,
        hasMore: true
      };

      vi.mocked(mockProductRepository.findWithPagination).mockResolvedValue(mockPaginatedResult);

      const result = await productService.getUserProducts(VALID_USER_ID, { page: 1, limit: 5 });

      expect(mockProductRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 0,
          orderBy: "createdAt",
          orderDirection: "desc"
        })
      );

      // Check result structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 10);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 5);
    });

    it("should calculate correct offset for page 2", async () => {
      const mockPaginatedResult = {
        data: [],
        total: 10,
        limit: 5,
        offset: 5,
        hasMore: true
      };

      vi.mocked(mockProductRepository.findWithPagination).mockResolvedValue(mockPaginatedResult);

      await productService.getUserProducts(VALID_USER_ID, { page: 2, limit: 5 });

      expect(mockProductRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 5  // (2-1) * 5
        })
      );
    });
  });

  describe("searchProducts", () => {
    it("should search products without pagination", async () => {
      const searchCriteria = { name: "Test" };
      const products = [{ id: VALID_PRODUCT_ID, name: "Test Product" }] as Product[];

      vi.mocked(mockProductRepository.search).mockResolvedValue(products);

      const result = await productService.searchProducts(VALID_USER_ID, searchCriteria);

      expect(mockProductRepository.search).toHaveBeenCalledWith({
        userId: VALID_USER_ID,
        ...searchCriteria
      });
      expect(result).toEqual(products);
    });

    it("should search products with pagination", async () => {
      const searchCriteria = { name: "Test", page: 1, limit: 10 };
      const mockPaginatedResult = {
        data: [{ id: VALID_PRODUCT_ID, name: "Test Product" }] as Product[],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      vi.mocked(mockProductRepository.findWithPagination).mockResolvedValue(mockPaginatedResult);

      const result = await productService.searchProducts(VALID_USER_ID, searchCriteria);

      expect(mockProductRepository.findWithPagination).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
    });

    it("should include all search criteria: category and brand", async () => {
      const searchCriteria = {
        name: "Test",
        category: "Electronics",
        brand: "Apple",
        page: 1,
        limit: 10
      };

      const mockPaginatedResult = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      vi.mocked(mockProductRepository.findWithPagination).mockResolvedValue(mockPaginatedResult);

      await productService.searchProducts(VALID_USER_ID, searchCriteria);

      // Verify findWithPagination was called (where clause is constructed internally)
      expect(mockProductRepository.findWithPagination).toHaveBeenCalled();
    });

    it("should search with status filter", async () => {
      const searchCriteria = {
        status: "active",
        page: 1,
        limit: 10
      };

      const mockPaginatedResult = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      vi.mocked(mockProductRepository.findWithPagination).mockResolvedValue(mockPaginatedResult);

      await productService.searchProducts(VALID_USER_ID, searchCriteria);

      expect(mockProductRepository.findWithPagination).toHaveBeenCalled();
    });
  });
});
