import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { UserEntity } from '../entities/intranet';
import { DatabaseConnection } from 'src/config/database/constants';
import { LoggerService } from 'src/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationMeta } from 'src/common/schemas/response.schema';
import { UserPaginationDto } from '../dto/user-pagination.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { PermissionsService } from './permissions.service';
import { UsersLogsEntity } from '../entities/shop/user-logs.entity';
import { UserLogPaginationDto } from '../dto/user-log.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity, DatabaseConnection.INTRANET)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UsersLogsEntity, DatabaseConnection.SHOP)
    private readonly userLogsRepository: Repository<UsersLogsEntity>,
    private readonly permissionsService: PermissionsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all users with pagination
   * @param paginationDto The pagination parameters
   * @returns Paginated list of users with their permissions
   */
  async getAllUsers(
    paginationDto: UserPaginationDto,
  ): Promise<{ items: UserResponseDto[]; meta: PaginationMeta }> {
    try {
      const { page = 1, limit = 10, search, sortBy, sortOrder } = paginationDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      let whereConditions:
        | FindOptionsWhere<UserEntity>
        | FindOptionsWhere<UserEntity>[] = {};

      // Add search conditions if provided
      if (search) {
        whereConditions = [
          { usuario: Like(`%${search}%`) },
          { email: Like(`%${search}%`) },
          { codigo: Like(`%${search}%`) as any },
        ];
      }

      // Get total count of users matching the search criteria
      const totalItems = await this.userRepository.count({
        where: whereConditions,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Prepare the order options for sorting
      const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
      if (sortBy) {
        orderOptions[sortBy] = sortOrder;
      }
      // Find users matching the search criteria with pagination
      const users = await this.userRepository.find({
        where: whereConditions,
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
      });

      // Get permissions for all users
      const userResponsePromises = users.map(async (user) => {
        let permissions = { allowedPages: [] };
        try {
          if (user.usuario) {
            permissions = await this.permissionsService.getUserPermissions(
              user.usuario,
            );
          }
        } catch {}

        return {
          userId: user.id?.toString(),
          username: user.usuario || null,
          codigo: user.codigo || null,
          email: user.email || null,
          allowedPages: permissions.allowedPages || [],
        };
      });

      const userResponses = await Promise.all(userResponsePromises);

      // Create pagination metadata
      const meta: PaginationMeta = {
        totalItems,
        currentPage: validPage,
        itemsPerPage: validLimit,
        totalPages,
      };

      return { items: userResponses, meta };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve users',
          error: error.message,
          meta: { details: error.stack },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserLogs(paginationDto: UserLogPaginationDto) {
    try {
      const { page = 1, limit = 10, search, sortBy, sortOrder } = paginationDto;

      // Ensure valid pagination parameters
      const validPage = page > 0 ? page : 1;
      const validLimit = limit > 0 ? limit : 10;

      // Calculate offset
      const offset = (validPage - 1) * validLimit;

      // Build where conditions for search
      let whereConditions:
        | FindOptionsWhere<UsersLogsEntity>
        | FindOptionsWhere<UsersLogsEntity>[] = {};

      if (search) {
        whereConditions = [
          { user: Like(`%${search}%`) },
          { type_log: Like(`%${search}%`) },
          { field: Like(`%${search}%`) },
        ];
      }

      // Get total count of logs matching the search criteria
      const totalItems = await this.userLogsRepository.count({
        where: whereConditions,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / validLimit);

      // Prepare the order options for sorting
      const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
      if (sortBy) {
        orderOptions[sortBy] = sortOrder;
      }

      // Find logs matching the search criteria with pagination
      const logs = await this.userLogsRepository.find({
        where: whereConditions,
        skip: offset,
        take: validLimit,
        order: Object.keys(orderOptions).length > 0 ? orderOptions : undefined,
      });

      const meta: PaginationMeta = {
        totalItems,
        currentPage: validPage,
        itemsPerPage: validLimit,
        totalPages,
      };

      return { items: logs, meta };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
