import { LogType } from '../constants/log-types.enum';

/**
 * Interface for log entry data
 */
export interface LogEntry {
  /**
   * The username of the user who performed the action
   */
  user: string;

  /**
   * The type of log entry
   */
  type_log: LogType;

  /**
   * The field or entity affected by the action (optional)
   */
  field?: string;

  /**
   * Detailed information about the action
   */
  log: string;

  /**
   * Additional details about the action (optional)
   */
  details?: any;
}
