export interface PickingMultiplier {
  from: number;
  multiplier: number;
}

export interface SpecificationValue {
  label: string;
  value: string;
}

export interface Specification {
  title?: string;
  values: SpecificationValue[];
}

export interface NutritionalTable {
  nutrientName?: string;
  quantity?: number;
  unit?: string;
  quantityPerPortion?: number;
  dailyValue?: string;
}

export interface NutritionalDetailsInformation {
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
