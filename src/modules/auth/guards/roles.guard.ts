import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

export const REQUIRED_PAGES_KEY = 'requiredPages';

export const RequirePages = (...pages: string[]) => {
  return (target: object, key?: any, descriptor?: any) => {
    Reflect.defineMetadata(REQUIRED_PAGES_KEY, pages, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredPages = this.reflector.get<string[]>(
      REQUIRED_PAGES_KEY,
      context.getHandler(),
    );

    if (!requiredPages || requiredPages.length === 0) {
      return true; // No specific page access required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.allowedPages) {
      return false;
    }

    return requiredPages.some((page) => user.allowedPages.includes(page));
  }
}
