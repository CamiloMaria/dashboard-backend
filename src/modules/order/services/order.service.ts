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

  /**
   * Find all orders with pagination
   * @param filterDto - The filter DTO containing pagination and search parameters
   * @returns An object containing the paginated orders and metadata
   * @throws HttpException if an error occurs during the operation
   */

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

    // Add unified search condition if provided
    if (search) {
      // Escape single quotes in the search pattern to prevent SQL injection
      const escapedSearch = search.replace(/'/g, "''");
      const searchPattern = `%${escapedSearch}%`;
      queryBuilder.andWhere(
        `(LOWER(NVL(ORDER.ORDEN, '')) like LOWER('%${searchPattern}%') OR 
          LOWER(NVL(ORDER.RNC, '')) like LOWER('%${searchPattern}%') OR 
          LOWER(NVL(ORDER.EMAIL, '')) like LOWER('%${searchPattern}%'))`,
      );
    }

    // Add store filter if provided
    if (store) {
      // Escape single quotes in store to prevent SQL injection
      const escapedStore = store.replace(/'/g, "''");
      queryBuilder.andWhere(`ORDER.TIENDA = '${escapedStore}'`);
    }

    // Get total count for orders (for pagination)
    const countQueryBuilder =
      this.webOrderRepository.createQueryBuilder('ORDER');

    // Add same search conditions to count query
    if (search) {
      // Escape single quotes in the search pattern to prevent SQL injection
      const escapedSearch = search.replace(/'/g, "''");
      const searchPattern = `%${escapedSearch}%`;
      countQueryBuilder.andWhere(
        `(LOWER(NVL(ORDER.ORDEN, '')) like LOWER('%${searchPattern}%') OR 
          LOWER(NVL(ORDER.RNC, '')) like LOWER('%${searchPattern}%') OR 
          LOWER(NVL(ORDER.EMAIL, '')) like LOWER('%${searchPattern}%'))`,
      );
    }

    // Add the same store filter to count query
    if (store) {
      // Escape single quotes in store to prevent SQL injection
      const escapedStore = store.replace(/'/g, "''");
      countQueryBuilder.andWhere(`ORDER.TIENDA = '${escapedStore}'`);
    }

    const totalItems = await countQueryBuilder.getCount();

    // Add sorting
    queryBuilder.orderBy(`ORDER.${sortBy.toUpperCase()}`, sortOrder);

    // Execute the paginated query
    const sql = queryBuilder.getSql();

    // Create the pagination query with direct value insertion
    const maxRowNum = limit + offset;
    const minRowNum = offset;
    const paginationSql = `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (${sql}) a WHERE ROWNUM <= ${maxRowNum}) WHERE rnum > ${minRowNum}`;

    // Execute the raw query without bind parameters
    const rawRows = await this.webOrderRepository.query(paginationSql);

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
      .leftJoin(WebFactures, 'FACTURES', 'FACTURES.ORDEN = ORDER.ORDEN');

    // Format order keys for SQL IN clause with proper escaping
    const formattedOrderKeys = orderKeys
      .map((key) => `'${key.replace(/'/g, "''")}'`)
      .join(',');
    queryBuilder.where(`ORDER.ORDEN IN (${formattedOrderKeys})`);

    // Add store filter if provided
    if (store) {
      // Escape single quotes in store to prevent SQL injection
      const escapedStore = store.replace(/'/g, "''");
      queryBuilder.andWhere(`ORDER.TIENDA = '${escapedStore}'`);
    }

    // Execute query without bind parameters
    return this.webOrderRepository.query(queryBuilder.getSql());
  }
}
