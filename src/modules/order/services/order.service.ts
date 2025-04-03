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
      store,
      sortBy = SortField.REGISTERED_AT,
      sortOrder = SortOrder.DESC,
    } = filterDto;

    // Ensure valid pagination parameters
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 ? limit : 10;

    // Calculate offset
    const offset = (validPage - 1) * validLimit;

    try {
      // Step 1: Fetch distinct orders with pagination
      const { orders, totalItems } = await this.findOrdersWithPagination(
        validPage,
        validLimit,
        offset,
        search,
        store,
        sortBy,
        sortOrder,
      );

      if (orders.length === 0) {
        return {
          items: [],
          meta: {
            totalItems: 0,
            currentPage: validPage,
            itemsPerPage: validLimit,
            totalPages: 0,
          },
        };
      }

      // Step 2: Fetch related entities for these orders
      const orderKeys = orders.map((order) => order.ORDEN);
      const relatedEntitiesRows = await this.findRelatedEntitiesForOrders(
        orderKeys,
        store,
      );

      // Step 3: Associate related entities with their parent orders
      const items = this.orderMapper.associateRelatedEntitiesWithOrders(
        orders,
        relatedEntitiesRows,
      );

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

  /**
   * Step 1: Find distinct orders with pagination
   */
  private async findOrdersWithPagination(
    page: number,
    limit: number,
    offset: number,
    search: string,
    store: string,
    sortBy: SortField,
    sortOrder: SortOrder,
  ): Promise<{ orders: IOrderResponse[]; totalItems: number }> {
    // Create query builder for basic order information
    const queryBuilder = this.webOrderRepository.createQueryBuilder('ORDER');
    queryBuilder.select(this.orderMapper.getOrderColumns().join(', '));

    // Add search condition if provided
    if (search) {
      queryBuilder.andWhere(`LOWER(ORDER.ORDEN) like LOWER('%${search}%')`);
    }

    // Add store filter if provided
    if (store) {
      queryBuilder.andWhere(`ORDER.TIENDA = '${store}'`);
    }

    // Get total count for orders (for pagination)
    const countQueryBuilder =
      this.webOrderRepository.createQueryBuilder('ORDER');
    if (search) {
      countQueryBuilder.andWhere(
        `LOWER(ORDER.ORDEN) like LOWER('%${search}%')`,
      );
    }

    // Add the same store filter to count query
    if (store) {
      countQueryBuilder.andWhere(`ORDER.TIENDA = '${store}'`);
    }

    const totalItems = await countQueryBuilder.getCount();

    // Add sorting
    queryBuilder.orderBy(`ORDER.${sortBy.toUpperCase()}`, sortOrder);

    // Execute the paginated query
    const sql = queryBuilder.getSql();
    const rawRows = await this.webOrderRepository.query(
      `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (${sql}) a WHERE ROWNUM <= ${limit + offset}) WHERE rnum > ${offset}`,
    );

    // Map rows to order objects (without related entities)
    const orders = this.orderMapper.mapBasicOrdersFromRows(rawRows);

    return { orders, totalItems };
  }

  /**
   * Step 2: Find all related entities for the given order keys
   */
  private async findRelatedEntitiesForOrders(
    orderKeys: string[],
    store?: string,
  ): Promise<any[]> {
    if (!orderKeys.length) {
      return [];
    }

    // Format order keys for SQL IN clause
    const formattedOrderKeys = orderKeys.map((key) => `'${key}'`).join(',');

    // Create query builder to fetch all related entities for these orders
    const queryBuilder = this.webOrderRepository.createQueryBuilder('ORDER');

    // Select relevant columns and add joins
    queryBuilder
      .select(
        [
          ...this.orderMapper.getOrderColumns(),
          ...this.orderMapper.getArticlesColumns(),
          ...this.orderMapper.getTransactionsColumns(),
          ...this.orderMapper.getFacturesColumns(),
        ].join(', '),
      )
      .leftJoin(WebArticles, 'ARTICLES', 'ARTICLES.ORDEN = ORDER.ORDEN')
      .leftJoin(
        WebTransactions,
        'TRANSACTIONS',
        'TRANSACTIONS.ORDEN = ORDER.ORDEN',
      )
      .leftJoin(WebFactures, 'FACTURES', 'FACTURES.ORDEN = ORDER.ORDEN')
      .where(`ORDER.ORDEN IN (${formattedOrderKeys})`);

    // Add store filter if provided
    if (store) {
      queryBuilder.andWhere(`ORDER.TIENDA = '${store}'`);
    }

    // Execute query to get all related entities
    return this.webOrderRepository.query(queryBuilder.getSql());
  }
}
