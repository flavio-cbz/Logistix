import { z } from 'zod';

export const ProductStatusSchema = z.enum([
  'draft',
  'available',
  'reserved',
  'sold',
  'removed',
  'archived'
]);

export const ProductPlatformSchema = z.enum([
  'leboncoin',
  'autre'
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type ProductPlatform = z.infer<typeof ProductPlatformSchema>;

export interface ProductProps {
  id: string;
  userId: string;
  parcelleId?: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  poids: number;
  price: number;
  currency: string;
  coutLivraison?: number;
  sellingPrice?: number;
  prixVente?: number;
  plateforme?: ProductPlatform;
  externalId?: string;
  url?: string;
  photoUrl?: string;
  status: ProductStatus;
  vendu: '0' | '1';
  createdAt: string;
  updatedAt: string;
  dateMiseEnLigne?: string;
  listedAt?: string;
  dateVente?: string;
  soldAt?: string;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(data: {
    name: string;
    userId: string;
    parcelleId?: string;
    poids?: number;
    price: number;
    currency?: string;
  }): Product {
    const now = new Date().toISOString();

    const props: ProductProps = {
      id: crypto.randomUUID(),
      userId: data.userId,
      name: data.name,
      poids: data.poids || 0,
      price: data.price,
      currency: data.currency || 'EUR',
      status: 'draft',
      vendu: '0',
      createdAt: now,
      updatedAt: now,
    };

    // Add optional properties only if they exist
    if (data.parcelleId) props.parcelleId = data.parcelleId;

    return new Product(props);
  }

  static fromDatabase(data: any): Product {
    return new Product({
      id: data.id,
      userId: data.userId,
      parcelleId: data.parcelleId,
      name: data.name,
      brand: data.brand,
      category: data.category,
      subcategory: data.subcategory,
      size: data.size,
      color: data.color,
      poids: data.poids,
      price: data.price,
      currency: data.currency,
      coutLivraison: data.coutLivraison,
      sellingPrice: data.sellingPrice,
      prixVente: data.prixVente,
      plateforme: data.plateforme,
      externalId: data.externalId,
      url: data.url,
      photoUrl: data.photoUrl,
      status: data.status,
      vendu: data.vendu,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      dateMiseEnLigne: data.dateMiseEnLigne,
      listedAt: data.listedAt,
      dateVente: data.dateVente,
      soldAt: data.soldAt,
    });
  }

  update(data: Partial<{
    name: string;
    brand: string;
    category: string;
    price: number;
    poids: number;
    status: ProductStatus;
  }>): Product {
    return new Product({
      ...this.props,
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  markAsSold(sellingPrice?: number): Product {
    const props: ProductProps = {
      ...this.props,
      status: 'sold',
      vendu: '1',
      dateVente: new Date().toISOString(),
      soldAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add optional properties only if they exist
    if (sellingPrice !== undefined) {
      props.sellingPrice = sellingPrice;
      props.prixVente = sellingPrice;
    }

    return new Product(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get parcelleId(): string | undefined { return this.props.parcelleId; }
  get name(): string { return this.props.name; }
  get brand(): string | undefined { return this.props.brand; }
  get category(): string | undefined { return this.props.category; }
  get price(): number { return this.props.price; }
  get poids(): number { return this.props.poids; }
  get status(): ProductStatus { return this.props.status; }
  get createdAt(): string { return this.props.createdAt; }
  get updatedAt(): string { return this.props.updatedAt; }

  // Computed properties
  get isSold(): boolean { return this.props.vendu === '1' || this.props.status === 'sold'; }
  get profit(): number | undefined {
    if (!this.props.sellingPrice) return undefined;
    return this.props.sellingPrice - this.props.price;
  }

  // Business logic
  canBeEdited(): boolean {
    return this.props.status === 'draft' || this.props.status === 'available';
  }

  canBeDeleted(): boolean {
    return this.props.status !== 'sold';
  }

  toJSON() {
    return { ...this.props };
  }
}