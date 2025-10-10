"use client";

import { Package2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProductHeaderProps {
  onCreateProduct?: () => void;
  totalProducts?: number;
  className?: string;
}

export function ProductHeader({
  onCreateProduct,
  totalProducts = 0,
  className,
}: ProductHeaderProps) {
  return (
    <div className={className}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Package2 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Produits</CardTitle>
              <CardDescription>
                Gérez votre catalogue de produits
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onCreateProduct}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau produit</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Total : <span className="text-primary font-bold">{totalProducts}</span> produit{totalProducts > 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductHeader;
