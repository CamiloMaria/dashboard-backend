import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EnvService } from '../../config/env/env.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

/**
 * Controller for health check endpoints
 */
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    private envService: EnvService,
    @InjectDataSource('shop') private shopConnection: DataSource,
    @InjectDataSource('intranet36') private intranet36Connection: DataSource,
    @InjectDataSource('oracle') private oracleConnection: DataSource,
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

  /**
   * Health check endpoint for the auth service
   * @returns Health check result for the auth service
   */
  @Get('auth')
  @HealthCheck()
  checkAuth() {
    // Build URL from environment variables or use defaults
    const host = 'localhost';
    const port = this.envService.port;
    const prefix = this.envService.globalPrefix;
    const baseUrl = `http://${host}:${port}/${prefix}`;

    return this.health.check([
      () => this.http.pingCheck('auth', `${baseUrl}/auth/health`),
    ]);
  }
}
