import { Injectable } from '@nestjs/common';
import { WebOrder } from '../entities/oracle';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseConnection, LoggerService } from 'src/config';
import { PaginationMeta } from 'src/common/schemas/response.schema';
import { OrderFilterDto, SortField, SortOrder } from '../dto';
import { IOrderResponse } from '../interfaces/order-response.interface';
import { WebArticles } from '../entities/oracle/web-articles.entity';
import { WebTransactions } from '../entities/oracle/web-transactions.entity';
import { WebFactures } from '../entities/oracle/web-factures.entity';
import { OrderMapper } from '../mappers/order.mapper';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(WebOrder, DatabaseConnection.ORACLE)
    private readonly webOrderRepository: Repository<WebOrder>,
    private readonly orderMapper: OrderMapper,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filterDto: OrderFilterDto,
  ): Promise<{ items: IOrderResponse[]; meta: PaginationMeta }> {
    const {
      page,
      limit,
      search,
      sortBy = SortField.REGISTERED_AT,
      sortOrder = SortOrder.DESC,
    } = filterDto;

    // Ensure valid pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 ? limit : 10;

    // Calculate offset
    const offset = (validPage - 1) * validLimit;

    const queryBuilder = this.webOrderRepository.createQueryBuilder('ORDER');

    // Select order columns and add left joins for related entities
    queryBuilder
      .select(this.orderMapper.getAllColumns().join(', '))
      .leftJoin(WebArticles, 'ARTICLES', 'ARTICLES.ORDEN = ORDER.ORDEN')
      .leftJoin(
        WebTransactions,
        'TRANSACTIONS',
        'TRANSACTIONS.ORDEN = ORDER.ORDEN',
      )
      .leftJoin(WebFactures, 'FACTURES', 'FACTURES.ORDEN = ORDER.ORDEN');

    if (search) {
      queryBuilder.andWhere(`LOWER(ORDER.ORDEN) like LOWER('%${search}%')`);
    }

    // Get total count for orders only (not including relations)
    const countQueryBuilder =
      this.webOrderRepository.createQueryBuilder('ORDER');
    if (search) {
      countQueryBuilder.andWhere(
        `LOWER(ORDER.ORDEN) like LOWER('%${search}%')`,
      );
    }
    const totalItems = await countQueryBuilder.getCount();

    queryBuilder.orderBy(`ORDER.${sortBy.toUpperCase()}`, sortOrder);

    const sql = queryBuilder.getSql();

    try {
      const rawRows = await this.webOrderRepository.query(
        `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (${sql}) a WHERE ROWNUM <= ${validLimit + offset}) WHERE rnum > ${offset}`,
      );

      // Use the OrderMapper to process the raw data
      const items = this.orderMapper.mapRawRowsToOrderResponses(rawRows);

      const meta: PaginationMeta = {
        totalItems,
        currentPage: validPage,
        itemsPerPage: validLimit,
        totalPages: Math.ceil(totalItems / validLimit),
      };

      return { items, meta };
    } catch (error) {
      this.logger.error(
        `Error retrieving orders: ${error.message}`,
        error.stack,
        OrderService.name,
      );
      throw error;
    }
  }
}
