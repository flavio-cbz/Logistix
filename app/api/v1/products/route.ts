import { POST as createProduct } from "@/lib/application/handlers/create-product.handler";
import { GET as listProducts } from "@/lib/application/handlers/list-products.handler";

export const GET = listProducts;
export const POST = createProduct;
