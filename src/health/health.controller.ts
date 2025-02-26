import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

/**
 * Controller for health check endpoints
 */
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @InjectConnection('shop') private shopConnection: Connection,
    @InjectConnection('intranet36') private intranet36Connection: Connection,
    @InjectConnection('oracle') private oracleConnection: Connection,
  ) {}

  /**
   * Basic health check endpoint
   * @returns Health check result indicating the application is running
   */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Here you can add more specific health checks if needed
      // For example, database connections, external services, etc.
      async (): Promise<HealthIndicatorResult> => {
        const healthCheck: HealthIndicatorResult = {
          application: {
            status: 'up',
            message: 'Application is running',
          },
        };
        return healthCheck;
      },
    ]);
  }

  /**
   * Health check endpoint for the databases
   * @returns Health check result for the databases
   */
  @Get('databases')
  @HealthCheck()
  checkDatabases() {
    return this.health.check([
      () => this.db.pingCheck('shop', { connection: this.shopConnection }),
      () =>
        this.db.pingCheck('intranet36', {
          connection: this.intranet36Connection,
        }),
      () =>
        this.db.pingCheck('oracle', {
          connection: this.oracleConnection,
        }),
    ]);
  }
}
