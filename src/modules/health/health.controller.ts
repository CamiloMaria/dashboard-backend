import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EnvService } from '../../config/env/env.service';
import { Public } from '../../common/decorators';
import { DatabaseConnection } from '../../config/database/constants';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Controller for health check endpoints
 */
@Controller('health')
@Public()
@ApiTags('Health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    private envService: EnvService,
    @InjectDataSource(DatabaseConnection.SHOP)
    private shopConnection: DataSource,
    @InjectDataSource(DatabaseConnection.INTRANET)
    private intranetConnection: DataSource,
    @InjectDataSource(DatabaseConnection.ORACLE)
    private oracleConnection: DataSource,
  ) {}

  /**
   * Basic health check endpoint
   * @returns Health check result indicating the application is running
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Check system health',
    description:
      'Performs health checks on all services and database connections',
  })
  check(): Promise<HealthCheckResult> {
    const host = 'localhost';
    const port = this.envService.port;
    const prefix = this.envService.globalPrefix;
    const baseUrl = `http://${host}:${port}/${prefix}`;

    return this.health.check([
      () =>
        this.http.responseCheck(
          'auth',
          `${baseUrl}/auth/health`,
          (res) => res.status === 204,
        ),
      () =>
        this.http.responseCheck(
          'products',
          `${baseUrl}/products/health`,
          (res) => res.status === 204,
        ),
      () =>
        this.http.responseCheck(
          'product-sets',
          `${baseUrl}/product-sets/health`,
          (res) => res.status === 204,
        ),
      () =>
        this.http.responseCheck(
          'product-promotions',
          `${baseUrl}/product-promotions/health`,
          (res) => res.status === 204,
        ),
      () =>
        this.http.responseCheck(
          'product-images',
          `${baseUrl}/product-images/health`,
          (res) => res.status === 204,
        ),

      () =>
        this.db.pingCheck('shop-database', { connection: this.shopConnection }),
      () =>
        this.db.pingCheck('intranet-database', {
          connection: this.intranetConnection,
        }),
      () =>
        this.db.pingCheck('oracle-database', {
          connection: this.oracleConnection,
        }),
    ]);
  }
}
