import { Injectable } from '@nestjs/common';
import { WebOrder } from '../entities/oracle';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseConnection } from 'src/config';
import { PaginationMeta } from 'src/common/schemas/response.schema';
import { OrderFilterDto, SortField, SortOrder } from '../dto';
import { IOrderResponse } from '../interfaces/order-response.interface';

@Injectable()
export class OrderService {
  private readonly orderColumns = [
    'ORDER.ID',
    'ORDER.ORDEN',
    'ORDER.RNC',
    'ORDER.NOMBRE',
    'ORDER.APELLIDOS',
    'ORDER.DIRECCION',
    'ORDER.CIUDAD',
    'ORDER.COMENTARIO',
    'ORDER.TELEFONO',
    'ORDER.EMAIL',
    'ORDER.PAIS',
    'ORDER.ESTATUS',
    'ORDER.TOTAL',
    'ORDER.ITBIS',
    'ORDER.FECHA_REGISTRO',
    'ORDER.HORA_REGISTRO',
    'ORDER.TARJETA',
    'ORDER.PTLOG',
    'ORDER.CLUB',
    'ORDER.WEB',
    'ORDER.TIENDA',
    'ORDER.NCF',
    'ORDER.TIPO_NCF',
    'ORDER.ESTATUS_DELIV',
    'ORDER.RNC_NAME',
    'ORDER.OTRO_NOMBRE',
    'ORDER.OTRO_NOMBRE_DOC',
    'ORDER.ORDEN_REFERENCIA',
    'ORDER.ORDEN_DESDE',
    'ORDER.TOTAL_DESCUENTO',
    'ORDER.PRINT',
  ];

  constructor(
    @InjectRepository(WebOrder, DatabaseConnection.ORACLE)
    private readonly webOrderRepository: Repository<WebOrder>,
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
    queryBuilder.select(`DISTINCT ${this.orderColumns.join(', ')}`);

    if (search) {
      queryBuilder.andWhere(`LOWER(ORDER.ORDEN) like LOWER('%${search}%')`);
    }

    const totalItems = await queryBuilder.getCount();

    queryBuilder.orderBy(`ORDER.${sortBy.toUpperCase()}`, sortOrder);

    const sql = queryBuilder.getSql();

    const rows = await this.webOrderRepository.query(
      `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (${sql}) a WHERE ROWNUM <= ${validLimit + offset}) WHERE rnum > ${offset}`,
    );

    const meta: PaginationMeta = {
      totalItems,
      currentPage: page,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / validLimit),
    };

    return { items: rows, meta };
  }
}
