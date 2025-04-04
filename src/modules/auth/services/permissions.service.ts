import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebUsersPermissions } from '../entities/shop/web-user-permissions.entity';
import { DatabaseConnection } from '../../../config/database/constants';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly permissionsCache = new Map<
    string,
    { permissions: WebUsersPermissions; timestamp: number }
  >();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

  constructor(
    @InjectRepository(WebUsersPermissions, DatabaseConnection.SHOP)
    private readonly userPermissionsRepository: Repository<WebUsersPermissions>,
  ) {}

  /**
   * Retrieves user permissions from database with caching
   * @param username The username to look up permissions for
   * @returns User permissions entity with allowed pages
   * @throws NotFoundException if no permissions are found
   * @throws InternalServerErrorException if database access fails
   */
  async getUserPermissions(username: string): Promise<WebUsersPermissions> {
    try {
      // Check cache first
      const cachedData = this.permissionsCache.get(username);
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < this.CACHE_TTL) {
        return cachedData.permissions;
      }

      const userPermissions = await this.userPermissionsRepository.findOne({
        where: { username, isActive: 1 },
      });

      if (!userPermissions) {
        throw new NotFoundException(
          `No permissions found for user: ${username}`,
        );
      }

      // Update cache
      this.permissionsCache.set(username, {
        permissions: userPermissions,
        timestamp: now,
      });

      return userPermissions;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error retrieving permissions for ${username}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to retrieve user permissions',
        { cause: error },
      );
    }
  }

  /**
   * Invalidates the cache for a specific user
   * @param username The username whose cache to invalidate
   */
  invalidatePermissionsCache(username: string): void {
    this.permissionsCache.delete(username);
    this.logger.debug(`Permissions cache invalidated for user: ${username}`);
  }

  /**
   * Clears the entire permissions cache
   */
  clearPermissionsCache(): void {
    this.permissionsCache.clear();
    this.logger.debug('Permissions cache cleared');
  }
}
