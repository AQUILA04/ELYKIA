import { StockOutput } from '../../models/stock-output.model';
import { StockOutputItem } from '../../models/stock-ouput-item';

export class StockOutputMapper {
  public static toLocal(backendData: any): StockOutput {
    console.log('StockOutputs From backend: ', backendData);
    return {
              id: backendData.id?.toString() || '',
              reference: backendData.reference || '',
              status: backendData.status,
              updatable: backendData.updatable ?? false,
              totalAmount: backendData.totalAmount || 0,
              createdAt: backendData.createdAt || new Date().toISOString(),
              commercialId: backendData.commercialUsername || '',
              isSync: true,
              syncDate: new Date().toISOString(),
              items: this.mapItems(backendData)
            };
  }

  private static mapItems(backendData: any): StockOutputItem[] {
    return backendData.items?.map((article: any) => ({
      id: article.id?.toString() || '',
      stockOutputId: article.stockOutputId?.toString() || '',
      articleId: article.articleId?.toString() || article.articles?.id?.toString() || '',
      quantity: article.quantity || 0,
      unitPrice: article.unitPrice,
      totalPrice: (article.quantity || 0) * article.unitPrice
    })) || [];
  }

  private static mapStatus(backendStatus: string): string {
    const statusMap: Record<string, string> = {
      'INPROGRESS': 'in_progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'ND': 'pending'
    };
    return statusMap[backendStatus] || backendStatus.toLowerCase();
  }

  private static getUnitPrice(article: any): number {
    return article.articles?.creditSalePrice || 0;
  }
}
