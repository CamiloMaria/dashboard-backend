export interface SpoolerResponse {
  spooler: string;
  model: string | null;
}

export interface PrintOrderRequest {
  orderNumber: string;
  email: string;
  spooler: string;
}
