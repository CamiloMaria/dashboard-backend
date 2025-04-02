import { Injectable } from '@nestjs/common';
import { IOrderResponse } from '../interfaces/order-response.interface';
import { LoggerService } from 'src/config';
import { WebArticles, WebTransactions, WebFactures } from '../entities/oracle';

@Injectable()
export class OrderMapper {
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

  private readonly articlesColumns = [
    'ARTICLES.ID as ARTICLE_ID',
    'ARTICLES.ORDEN as ARTICLE_ORDEN',
    'ARTICLES.FACTURA as ARTICLE_FACTURA',
    'ARTICLES.CANT as ARTICLE_CANT',
    'ARTICLES.EAN as ARTICLE_EAN',
    'ARTICLES.DESCRIPCION as ARTICLE_DESCRIPCION',
    'ARTICLES.PRECIO as ARTICLE_PRECIO',
    'ARTICLES.TOTAL as ARTICLE_TOTAL',
    'ARTICLES.ESTATUS as ARTICLE_ESTATUS',
    'ARTICLES.FECHA as ARTICLE_FECHA',
    'ARTICLES.WEB as ARTICLE_WEB',
    'ARTICLES.UNMANEJO as ARTICLE_UNMANEJO',
    'ARTICLES.TOTAL_DISCOUNT as ARTICLE_TOTAL_DISCOUNT',
  ];

  private readonly transactionsColumns = [
    'TRANSACTIONS.ID as TRANSACTION_ID',
    'TRANSACTIONS.ORDEN as TRANSACTION_ORDEN',
    'TRANSACTIONS.TOTAL as TRANSACTION_TOTAL',
    'TRANSACTIONS.TARJETA as TRANSACTION_TARJETA',
    'TRANSACTIONS.APROBACION as TRANSACTION_APROBACION',
    'TRANSACTIONS.REFERENCIA as TRANSACTION_REFERENCIA',
    'TRANSACTIONS.ESTATUS as TRANSACTION_ESTATUS',
    'TRANSACTIONS.MENSAJE as TRANSACTION_MENSAJE',
    'TRANSACTIONS.FECHA_APROBACION as TRANSACTION_FECHA_APROBACION',
    'TRANSACTIONS.HORA_APROBACION as TRANSACTION_HORA_APROBACION',
    'TRANSACTIONS.WEB as TRANSACTION_WEB',
    'TRANSACTIONS.TRANS_ID as TRANSACTION_TRANS_ID',
    'TRANSACTIONS.TOTAL_AUT as TRANSACTION_TOTAL_AUT',
    'TRANSACTIONS.KIND as TRANSACTION_KIND',
    'TRANSACTIONS.TIPO_PAGO as TRANSACTION_TIPO_PAGO',
    'TRANSACTIONS.GATEWAY as TRANSACTION_GATEWAY',
  ];

  private readonly facturesColumns = [
    'FACTURES.ID as FACTURE_ID',
    'FACTURES.ORDEN as FACTURE_ORDEN',
    'FACTURES.FACTURAS as FACTURE_FACTURAS',
    'FACTURES.DEPTO as FACTURE_DEPTO',
    'FACTURES.ESTATUS as FACTURE_ESTATUS',
    'FACTURES.WEB as FACTURE_WEB',
    'FACTURES.TIENDA as FACTURE_TIENDA',
    'FACTURES.DELIVERY as FACTURE_DELIVERY',
    'FACTURES.ITBIS as FACTURE_ITBIS',
    'FACTURES.NCF as FACTURE_NCF',
    'FACTURES.TIPO_NCF as FACTURE_TIPO_NCF',
    'FACTURES.TOTAL as FACTURE_TOTAL',
  ];

  constructor(private readonly logger: LoggerService) {}

  /**
   * Maps raw database rows to structured order responses with related entities
   * @param rawRows - Raw database rows from the query
   * @returns Array of order responses with nested related entities
   */
  public mapRawRowsToOrderResponses(rawRows: any[]): IOrderResponse[] {
    this.logger.debug(
      `Mapping ${rawRows.length} raw database rows to order responses`,
      OrderMapper.name,
    );

    try {
      // Process the raw data to group related entities
      const ordersMap = new Map();

      for (const row of rawRows) {
        const orderKey = row.ORDEN;

        if (!ordersMap.has(orderKey)) {
          // Create new order entry without related entities
          const orderData = {};
          this.orderColumns.forEach((column) => {
            const columnName = column.replace('ORDER.', '');
            orderData[columnName] = row[columnName];
          });

          ordersMap.set(orderKey, {
            ...orderData,
            articles: [],
            transactions: [],
            factures: [],
          });
        }

        const orderEntry = ordersMap.get(orderKey);

        // Add article if exists
        if (row.ARTICLE_ID) {
          const articleExists = orderEntry.articles.some(
            (a: WebArticles) => a.ID === row.ARTICLE_ID,
          );
          if (!articleExists) {
            const article = {};
            this.articlesColumns.forEach((column) => {
              const [, fieldName] = column.split(' as ');
              const originalName = fieldName.replace('ARTICLE_', '');
              article[originalName] = row[fieldName];
            });
            orderEntry.articles.push(article);
          }
        }

        // Add transaction if exists
        if (row.TRANSACTION_ID) {
          const transactionExists = orderEntry.transactions.some(
            (t: WebTransactions) => t.ID === row.TRANSACTION_ID,
          );
          if (!transactionExists) {
            const transaction = {};
            this.transactionsColumns.forEach((column) => {
              const [, fieldName] = column.split(' as ');
              const originalName = fieldName.replace('TRANSACTION_', '');
              transaction[originalName] = row[fieldName];
            });
            orderEntry.transactions.push(transaction);
          }
        }

        // Add facture if exists
        if (row.FACTURE_ID) {
          const factureExists = orderEntry.factures.some(
            (f: WebFactures) => f.ID === row.FACTURE_ID,
          );
          if (!factureExists) {
            const facture = {};
            this.facturesColumns.forEach((column) => {
              const [, fieldName] = column.split(' as ');
              const originalName = fieldName.replace('FACTURE_', '');
              facture[originalName] = row[fieldName];
            });
            orderEntry.factures.push(facture);
          }
        }
      }

      const items = Array.from(ordersMap.values()) as IOrderResponse[];
      this.logger.debug(
        `Successfully mapped data into ${items.length} order responses`,
        OrderMapper.name,
      );

      return items;
    } catch (error) {
      this.logger.error(
        `Error mapping raw rows to order responses: ${error.message}`,
        error.stack,
        OrderMapper.name,
      );
      throw error;
    }
  }

  /**
   * Get all columns for order query
   * @returns Array of column names for query
   */
  public getAllColumns(): string[] {
    return [
      ...this.orderColumns,
      ...this.articlesColumns,
      ...this.transactionsColumns,
      ...this.facturesColumns,
    ];
  }

  /**
   * Get order columns
   */
  public getOrderColumns(): string[] {
    return this.orderColumns;
  }

  /**
   * Get article columns
   */
  public getArticlesColumns(): string[] {
    return this.articlesColumns;
  }

  /**
   * Get transaction columns
   */
  public getTransactionsColumns(): string[] {
    return this.transactionsColumns;
  }

  /**
   * Get facture columns
   */
  public getFacturesColumns(): string[] {
    return this.facturesColumns;
  }
}
