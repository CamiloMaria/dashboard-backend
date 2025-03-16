export interface CloudflareResponse {
  result: {
    filename: string;
    id: string;
    meta: {
      [key: string]: string;
    };
    requireSignedURLs: boolean;
    uploaded: string;
    variants: string[];
  };
  success: boolean;
  errors: any[];
  messages: any[];
}
