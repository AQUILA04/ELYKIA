import { Distribution } from '../../models/distribution.model';
import { DistributionItem } from '../../models/distribution-item.model';
import { Client } from '../../models/client.model';

export class DistributionMapper {
  public static toLocal(backendData: any): Distribution {
    return {
      id: backendData.id?.toString() || backendData.id || '',
      reference: backendData.reference || backendData.reference || '',
      creditId: backendData.parent?.id?.toString() || backendData.creditId || '',
      totalAmount: backendData.totalAmount ?? backendData.totalAmount ?? 0,
      paidAmount: backendData.totalAmountPaid ?? backendData.paidAmount ?? 0,
      remainingAmount: backendData.totalAmountRemaining ?? backendData.remainingAmount ?? backendData.totalAmount ?? 0,
      dailyPayment: backendData.dailyStake ?? backendData.dailyPayment ?? 0,
      startDate: backendData.beginDate || backendData.startDate || '',
      endDate: backendData.expectedEndDate || backendData.endDate || '',
      status: backendData.status || 'pending',
      clientId: backendData.client?.id?.toString() || backendData.clientId || '',
      commercialId: backendData.collector || backendData.commercialId || '',
      isLocal: backendData.isLocal ?? false,
      isSync: backendData.isSync ?? true,
      advance: backendData.advance ?? 0,
      syncDate: backendData.syncDate || new Date().toISOString(),
      createdAt: backendData.beginDate || backendData.createdAt || new Date().toISOString(),
      client: this.mapClient(backendData.client) || backendData.client,
      syncHash: backendData.syncHash,
      articleCount: backendData.articles?.length ?? backendData.articleCount ?? 0,
      articles: [],
      items: this.mapItems(backendData)
    };
  }

  private static mapItems(backendData: any): DistributionItem[] {
    // Priorité 1 : items locaux déjà mappés (format Distribution local, création/mise à jour locale).
    // Ces items sont stockés dans distribution.items et contiennent déjà toutes les données nécessaires.
    if (backendData.items && Array.isArray(backendData.items) && backendData.items.length > 0) {
      return backendData.items.map((item: any) => ({
        id: item.id?.toString() || '',
        distributionId: item.distributionId?.toString() || backendData.id?.toString() || '',
        articleId: item.articleId?.toString() || '',
        quantity: item.quantity ?? 0,
        unitPrice: item.unitPrice ?? 0,
        totalPrice: item.totalPrice ?? 0
      }));
    }
    // Priorité 2 : articles au format API backend (backendData.articles, sync depuis le serveur).
    return (backendData.articles || []).map((article: any) => ({
      id: article.id?.toString() || article.id || '',
      distributionId: backendData.id?.toString() || backendData.id || '',
      articleId: article.articles?.id?.toString() || article.articleId || '',
      quantity: article.quantity ?? 0,
      unitPrice: this.getUnitPrice(article) ?? article.unitPrice ?? 0,
      totalPrice: (article.quantity ?? 0) * (this.getUnitPrice(article) ?? article.totalPrice ?? 0)
    }));
  }

  // Conversion local → backend
  public static localToBackend(localData: Distribution, items: DistributionItem[] = []): any {
    return {
      id: Number(localData.id) || 0,
      reference: localData.reference || '',
      client: localData.client ? this.mapClientToBackend(localData.client) : null,
      clientId: Number(localData.clientId) || 0,
      articles: items.map(item => this.mapItemToBackend(item)),
      beginDate: localData.startDate || '',
      expectedEndDate: localData.endDate || '',
      totalAmount: localData.totalAmount || 0,
      totalAmountPaid: localData.paidAmount || 0,
      totalAmountRemaining: localData.remainingAmount || localData.totalAmount || 0,
      dailyStake: localData.dailyPayment || 0,
      status: localData.status,
      collector: localData.commercialId || '',
      type: "CREDIT",
      dailyPaid: false,
      clientType: 'PROMOTER',
      promoterCredit: false,
      updatable: false,
      advance: localData.advance || 0
    };
  }

  private static mapItemToBackend(item: DistributionItem): any {
    return {
      articlesId: Number(item.articleId) || 0,
      quantity: item.quantity || 0,
    };
  }

  private static mapClientToBackend(client: Client): any {
    return {
      id: Number(client.id) || 0
    };
  }

  private static mapStatusToBackend(localStatus: string): string {
    const statusMap: Record<string, string> = {
      'in_progress': 'INPROGRESS',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'pending': 'ND'
    };
    return statusMap[localStatus] || 'INPROGRESS';
  }



  private static mapStatus(status?: string): string {
    if (!status) return 'pending';

    const statusMap: Record<string, string> = {
      'INPROGRESS': 'in_progress',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'ND': 'pending'
    };
    return statusMap[status] || status.toLowerCase();
  }

  private static mapClient(client?: any): Partial<Client> | undefined {
    if (!client) return undefined;

    return {
      id: client.id?.toString() || client.id || ''
    };
  }

  private static getUnitPrice(article: any): number {
    return article.articles?.creditSalePrice ||
      0;
  }

  private static generateSyncHash(data: any): string {
    return `${data.id || ''}-${new Date().getTime()}`;
  }
}
