import { WebArticles } from '../entities/oracle/web-articles.entity';
import { WebTransactions } from '../entities/oracle/web-transactions.entity';
import { WebFactures } from '../entities/oracle/web-factures.entity';

export interface IOrderResponse {
  ID: string;
  ORDEN: string;
  EMAIL: string;
  NOMBRE: string;
  OTRO_NOMBRE: string | null;
  OTRO_NOMBRE_DOC: string | null;
  ORDEN_REFERENCIA: string;
  WEB: string;
  CLUB: string;
  PTLOG: string;
  PRINT: number;
  APELLIDOS: string;
  COMENTARIO: string;
  RNC: string | null;
  RNC_NAME: string;
  TOTAL: number;
  DIRECCION: string;
  CIUDAD: string;
  TOTAL_DESCUENTO: number;
  ITBIS: number;
  NCF: string;
  TIPO_NCF: string;
  TELEFONO: string;
  PAIS: string | null;
  ESTATUS: number;
  ORDEN_DESDE: string;
  TIENDA: string;
  FECHA_REGISTRO: string;
  HORA_REGISTRO: string;
  ARTICULOS: Partial<WebArticles>[];
  TRANSACCIONES: Partial<WebTransactions>[];
  FACTURAS: Partial<WebFactures>[];
}
