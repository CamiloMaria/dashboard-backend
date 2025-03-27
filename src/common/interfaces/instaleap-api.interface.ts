/**
 * Interface for creating a product in Instaleap
 */
export interface CreateProductInstaleap {
  sku: string;
  ean?: string[];
  name: string;
  unit: string;
  photosUrl: string[];
  clickMultiplier?: number;
  subUnit?: string;
  boost?: number;
  description?: string;
  brand?: string;
  searchKeywords?: string;
  subQty?: number;
  nutritionalDetails?: string;
  suggestedReplacementClient?: string[][];
  pickingMultiplier?: {
    from: number;
    multiplier: number;
  }[];
  bigItems?: number;
  relatedProducts?: string[];
  ingredients?: string[];
  specifications?: {
    title: string;
    values: {
      label: string;
      value: string;
    }[];
  }[];
  nutritionalDetailsInformation?: {
    servingName: string;
    servingSize: number;
    servingUnit: string;
    servingsPerPortion: number;
    nutritionalTable: {
      nutrientName: string;
      quantity: number;
      unit: string;
      quantityPerPortion: number;
      dailyValue: string;
    }[];
    bottomInfo: string;
  };
  lots?: {
    availableLots: string[];
    isActive: boolean;
  };
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
  weight?: number;
  volume?: number;
}

/**
 * Interface for creating a product in Instaleap response
 */
export interface CreateProductInstaleapResponse extends CreateProductInstaleap {
  id: string;
  self: string;
}

/**
 * Interface for creating a batch of products in Instaleap
 */
export interface CreateBatchProductInstaleap {
  products: CreateProductInstaleap[];
}

/**
 * Type for updating a product in Instaleap
 * All properties are optional except sku which is omitted
 */
export type UpdateProductInstaleap = Omit<
  Partial<CreateProductInstaleap>,
  'sku'
>;

/**
 * Type for updating a batch of products in Instaleap
 */
export type UpdateBatchProductInstaleap = {
  products: (UpdateProductInstaleap & { sku: string })[];
};

/**
 * Interface for product catalogs in Instaleap catalog
 */
export interface CreateCatalogInstaleap {
  product: {
    sku: string;
  };
  store: {
    storeReference: string;
  };
  categoriesAggregated: {
    categoryReference: string;
  }[];
  price: number;
  priceBeforeTaxes?: number;
  taxTotal?: number;
  taxes?: {
    taxId: string;
    taxName: string;
    taxType: string;
    taxValue: number;
    taxSubTotal: number;
  }[];
  stock: number;
  maxQty?: number;
  minQty?: number;
  isActive?: boolean;
  location?: string;
  securityStock?: number;
  tags?: {
    tagReference: string;
  }[];
  lowStockThreshold?: number;
  relatedStores?: string[];
  claimInformation?: {
    maxClaimTimeHrs: number;
    availableClaimActions: string[];
  };
}

/**
 * Interface for creating a batch of catalog entries in Instaleap
 * Reuses CreateCatalogInstaleap but overrides product, store, categoriesAggregated
 */
export type BatchCatalogItem = Omit<
  CreateCatalogInstaleap,
  'product' | 'store' | 'categoriesAggregated'
> & {
  sku: string;
  storeReference: string;
  categories: string[];
};

/**
 * Interface for creating a batch of catalog entries in Instaleap
 */
export interface CreateBatchCatalogInstaleap {
  catalogs: BatchCatalogItem[];
}

/**
 * Utility function to convert CreateCatalogInstaleap to BatchCatalogItem
 */
export function transformToCatalogItem(
  input: CreateCatalogInstaleap,
): BatchCatalogItem {
  return {
    sku: input.product.sku,
    storeReference: input.store.storeReference,
    categories: input.categoriesAggregated.map((c) => c.categoryReference),
    price: input.price,
    priceBeforeTaxes: input.priceBeforeTaxes,
    taxTotal: input.taxTotal,
    taxes: input.taxes,
    stock: input.stock,
    maxQty: input.maxQty,
    minQty: input.minQty,
    isActive: input.isActive,
    location: input.location,
    securityStock: input.securityStock,
    tags: input.tags,
    lowStockThreshold: input.lowStockThreshold,
    relatedStores: input.relatedStores,
    claimInformation: input.claimInformation,
  };
}

/**
 * Type for updating a catalog entry in Instaleap by SKU and store reference
 */
export type UpdateCatalogInstaleap = Partial<
  Omit<CreateCatalogInstaleap, 'product' | 'store'>
>;

/**
 * Partial interface for updating a batch of catalog entries in Instaleap
 */
export interface UpdateBatchCatalogInstaleap {
  catalogs: (Partial<BatchCatalogItem> & {
    sku: string;
    storeReference: string;
  })[];
}

/**
 * Interface for a batch response in Instaleap
 */
export interface BatchInstaleapResponse {
  jobReportId: string;
}
