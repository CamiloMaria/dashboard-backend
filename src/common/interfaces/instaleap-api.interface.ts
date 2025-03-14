interface PickingMultiplier {
  from: number;
  multiplier: number;
}

interface SpecificationValue {
  label: string;
  value: string;
}

interface Specification {
  title?: string;
  values: SpecificationValue[];
}

interface NutritionalTable {
  nutrientName?: string;
  quantity?: number;
  unit?: string;
  quantityPerPortion?: number;
  dailyValue?: string;
}

interface NutritionalDetailsInformation {
  servingName?: string;
  servingSize?: number;
  servingUnit?: string;
  servingsPerPortion?: number;
  nutritionalTable?: NutritionalTable[];
  bottomInfo?: string;
}

export interface CreateProductInstaleap {
  name: string;
  photosUrl: string[];
  sku: string;
  unit: string;
  clickMultiplier?: number;
  subUnit?: string;
  ean?: string[];
  boost?: number;
  description?: string;
  brand?: string;
  searchKeywords?: string;
  subQty?: number;
  nutritionalDetails?: string;
  pickingMultiplier?: PickingMultiplier[];
  relatedProducts?: string[];
  ingredients?: string[];
  specifications?: Specification[] | [];
  nutritionalDetailsInformation?: NutritionalDetailsInformation;
  bigItems?: number;
  suggestedReplacementClient?: string[];
}
export interface CreateCatalogInstaleap {
  product: {
    sku: string;
  };
  store: {
    storeReference: string;
  };
  categoriesAggregated?: CategoryAggregated[];
  price?: number;
  priceBeforeTaxes?: number;
  taxTotal?: number;
  taxes?: Tax[];
  stock?: number;
  maxQty?: number;
  minQty?: number;
  isActive?: boolean;
  location?: string;
  securityStock?: number;
  tags?: Tag[];
  lowStockThreshold?: number;
  relatedStores?: string[];
  claimInformation?: {
    maxClaimTimeHrs?: number;
    availableClaimActions?: string[];
  };
}

export interface UpdateCatalogInstaleap {
  price?: number;
  priceBeforeTaxes?: number;
  taxTotal?: number;
  taxes?: Tax[];
  stock?: number;
  maxQty?: number;
  minQty?: number;
  isActive?: boolean;
  location?: string;
  securityStock?: number;
  categoriesAggregated?: CategoryAggregated[];
  tags?: Tag[];
  lowStockThreshold?: number;
  relatedStores?: string[];
  claimInformation?: {
    maxClaimTimeHrs?: number;
    availableClaimActions?: string[];
  };
}

interface Tax {
  taxId: string;
  taxName: string;
  taxType: string;
  taxValue: number;
  taxSubTotal: number;
}

interface CategoryAggregated {
  categoryReference: string;
}

interface Tag {
  tagReference: string;
}
