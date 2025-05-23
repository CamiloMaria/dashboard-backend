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
import { UpdateUserPermissionsDto } from '../dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly permissionsCache = new Map<
    string,
    { permissions: WebUsersPermissions; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
   * Updates a user's allowed pages by user ID
   * @param username The username of the user to update
   * @param allowedPages Array of page identifiers to set as allowed pages
   * @returns Updated user permissions entity
   * @throws NotFoundException if no permissions are found
   * @throws InternalServerErrorException if database access fails
   */
  async updateUserAllowedPages(
    updateUserPermissionsDto: UpdateUserPermissionsDto,
  ): Promise<WebUsersPermissions> {
    try {
      let userPermissions = await this.userPermissionsRepository.findOne({
        where: { username: updateUserPermissionsDto.username },
      });

      if (!userPermissions) {
        // Create new permissions record if user doesn't exist in the table
        userPermissions = this.userPermissionsRepository.create({
          username: updateUserPermissionsDto.username,
          allowedPages: [],
          isActive: 1,
        });
      }

      userPermissions.allowedPages = updateUserPermissionsDto.allowedPages;

      const updatedPermissions =
        await this.userPermissionsRepository.save(userPermissions);

      // Invalidate cache for this user
      this.invalidatePermissionsCache(updateUserPermissionsDto.username);

      return updatedPermissions;
    } catch (error) {
      this.logger.error(
        `Error updating allowed pages for user: ${updateUserPermissionsDto.username}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Failed to update user allowed pages',
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
  }

  /**
   * Clears the entire permissions cache
   */
  clearPermissionsCache(): void {
    this.permissionsCache.clear();
  }
}
