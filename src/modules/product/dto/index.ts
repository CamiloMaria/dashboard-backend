export * from './create-product.dto';
export * from './create-product-set.dto';
export * from './pagination-query.dto';
export * from './generate-description.dto';
export * from './product-set-item.dto';
export * from './product-response.dto';
export * from './promotion-response.dto';
export * from './product-set-response.dto';
export * from './generate-keywords.dto';

// Export with namespace to avoid ambiguity
export * as ProductFilter from './product-filter.dto';
export * as ProductSetFilter from './product-set-filter.dto';
export * as PromotionFilter from './promotion-filter.dto';

export * from './product-update.dto';
export * from './product-delete.dto';
export * from './product-set-delete.dto';
export * from './image-update.dto';
export * from './image-delete-batch.dto';
