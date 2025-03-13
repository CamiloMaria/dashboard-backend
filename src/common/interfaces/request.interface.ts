import { Request as ExpressRequest } from 'express';

/**
 * Interface extending Express Request with user information from JWT
 */
export interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    email: string;
    allowedPages: string[];
  };
}
