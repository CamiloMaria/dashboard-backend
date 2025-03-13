/**
 * Interface for Shopilama API product price response
 */
export interface ShopilamaProductResponse {
  error: boolean;
  ean: string;
  title: string;
  price: number;
  compare_price?: number;
  pminimo: number;
  depto: string;
  grupo: string;
  unmanejo: string;
  tpean: string;
  tipo_itbis: string;
  material: string;
}
