import { WebOrder } from '../entities/oracle';
import { WebArticles } from '../entities/oracle/web-articles.entity';
import { WebTransactions } from '../entities/oracle/web-transactions.entity';
import { WebFactures } from '../entities/oracle/web-factures.entity';

export interface IOrderResponse extends WebOrder {
  articles: Partial<WebArticles>[];
  transactions: Partial<WebTransactions>[];
  factures: Partial<WebFactures>[];
}
