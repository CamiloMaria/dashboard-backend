import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseConnection } from 'src/config';
import { LogType } from '../constants/log-types.enum';
import { UsersLogsEntity } from 'src/modules/auth/entities/shop/user-logs.entity';
import { LogEntry } from '../interfaces';

/**
 * Service for logging user actions in the system
 */
@Injectable()
export class UserLogsService {
  private readonly logger = new Logger(UserLogsService.name);

  constructor(
    @InjectRepository(UsersLogsEntity, DatabaseConnection.SHOP)
    private readonly userLogsRepository: Repository<UsersLogsEntity>,
  ) {}

  /**
   * Log a create operation
   * @param username User who performed the action
   * @param entity Entity that was created
   * @param log Log about the creation
   * @param details Additional details about the creation
   * @returns Promise with the created log entry
   */
  async logCreate(
    username: string,
    entity: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.CREATE,
      field: entity,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log an update operation
   * @param username User who performed the action
   * @param entity Entity that was updated
   * @param log Log about the update
   * @param details Additional details about the update
   * @returns Promise with the created log entry
   */
  async logUpdate(
    username: string,
    entity: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.UPDATE,
      field: entity,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log a delete operation
   * @param username User who performed the action
   * @param entity Entity that was deleted
   * @param log Log about the deletion
   * @param details Additional details about the deletion
   * @returns Promise with the created log entry
   */
  async logDelete(
    username: string,
    entity: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.DELETE,
      field: entity,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log a login event
   * @param username User who logged in
   * @param log Log about the login
   * @param details Additional details about the login
   * @returns Promise with the created log entry
   */
  async logLogin(
    username: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.LOGIN,
      field: 'authentication',
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log a logout event
   * @param username User who logged out
   * @param log Log about the logout
   * @param details Additional details about the logout
   * @returns Promise with the created log entry
   */
  async logLogout(
    username: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.LOGOUT,
      field: 'authentication',
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log a permission change
   * @param username User who performed the permission change
   * @param targetUser User whose permissions were changed
   * @param log Log about the permission change
   * @param details Details about the permission changes
   * @returns Promise with the created log entry
   */
  async logPermission(
    username: string,
    targetUser: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.PERMISSION,
      field: `user:${targetUser}`,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Log a view event
   * @param username User who viewed the resource
   * @param resource Resource that was viewed
   * @param log Log about the view
   * @param details Additional details about the view
   * @returns Promise with the created log entry
   */
  async logView(
    username: string,
    resource: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: LogType.VIEW,
      field: resource,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Generic method to log any user action
   * @param username User who performed the action
   * @param type Log type
   * @param field Field or entity affected
   * @param log Log about the action
   * @param details Additional details about the action
   * @returns Promise with the created log entry
   */
  async logGeneric(
    username: string,
    type: LogType,
    field: string,
    log: string,
    details?: any,
  ): Promise<UsersLogsEntity> {
    return this.createLog({
      user: username,
      type_log: type,
      field,
      log,
      details: JSON.stringify(details),
    });
  }

  /**
   * Internal method to create a log entry with error handling
   * @param logEntry Data for the log entry
   * @returns Promise with the created log entity
   */
  private async createLog(logEntry: LogEntry): Promise<UsersLogsEntity> {
    try {
      const logEntity = this.userLogsRepository.create(logEntry);
      return await this.userLogsRepository.save(logEntity);
    } catch (error) {
      this.logger.error(
        `Failed to create log entry: ${error.message}`,
        error.stack,
      );

      // Return a partially constructed entity without throwing
      // This ensures the main application flow isn't disrupted by logging errors
      const partialEntity = new UsersLogsEntity();
      Object.assign(partialEntity, logEntry);
      return partialEntity;
    }
  }
}
