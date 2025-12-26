import { 
  ApiResponse, 
  Order, 
  OrderKPI, 
  OrderClient, 
  OrderArticle,
  PaginatedResponse,
  OrderStatus,
  OrderItem
} from '../types/order.types';

/**
 * Utilitaires de validation pour les réponses API
 */
export class ApiValidationUtils {

  /**
   * Valide qu'une réponse respecte le format ApiResponse<T>
   */
  static validateApiResponse<T>(response: any): response is ApiResponse<T> {
    if (!response || typeof response !== 'object') {
      return false;
    }

    return (
      typeof response.status === 'string' &&
      typeof response.statusCode === 'number' &&
      typeof response.message === 'string' &&
      typeof response.service === 'string' &&
      response.hasOwnProperty('data')
    );
  }

  /**
   * Valide qu'une réponse respecte le format PaginatedResponse<T>
   */
  static validatePaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
    if (!response || typeof response !== 'object') {
      return false;
    }

    return (
      Array.isArray(response.content) &&
      typeof response.totalElements === 'number' &&
      typeof response.totalPages === 'number' &&
      typeof response.size === 'number' &&
      typeof response.number === 'number' &&
      typeof response.first === 'boolean' &&
      typeof response.last === 'boolean'
    );
  }

  /**
   * Valide qu'un objet respecte le format Order
   */
  static validateOrder(order: any): order is Order {
    if (!order || typeof order !== 'object') {
      return false;
    }

    return (
      typeof order.id === 'number' &&
      typeof order.clientId === 'number' &&
      typeof order.clientName === 'string' &&
      typeof order.commercial === 'string' &&
      typeof order.commercialId === 'number' &&
      typeof order.orderDate === 'string' &&
      typeof order.totalAmount === 'number' &&
      Object.values(OrderStatus).includes(order.status) &&
      Array.isArray(order.items) &&
      order.items.every((item: any) => this.validateOrderItem(item)) &&
      typeof order.createdAt === 'string' &&
      typeof order.isActive === 'boolean'
    );
  }

  /**
   * Valide qu'un objet respecte le format OrderItem
   */
  static validateOrderItem(item: any): item is OrderItem {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return (
      typeof item.id === 'number' &&
      typeof item.orderId === 'number' &&
      typeof item.articleId === 'number' &&
      typeof item.articleName === 'string' &&
      typeof item.quantity === 'number' &&
      typeof item.unitPrice === 'number' &&
      typeof item.totalPrice === 'number' &&
      item.quantity > 0 &&
      item.unitPrice >= 0 &&
      item.totalPrice >= 0
    );
  }

  /**
   * Valide qu'un objet respecte le format OrderKPI
   */
  static validateOrderKPI(kpi: any): kpi is OrderKPI {
    if (!kpi || typeof kpi !== 'object') {
      return false;
    }

    return (
      typeof kpi.pendingOrders === 'number' &&
      typeof kpi.potentialValue === 'number' &&
      typeof kpi.acceptanceRate === 'number' &&
      typeof kpi.acceptedPipelineValue === 'number' &&
      typeof kpi.totalOrders === 'number' &&
      typeof kpi.monthlyGrowth === 'number' &&
      kpi.pendingOrders >= 0 &&
      kpi.potentialValue >= 0 &&
      kpi.acceptanceRate >= 0 && kpi.acceptanceRate <= 100 &&
      kpi.acceptedPipelineValue >= 0 &&
      kpi.totalOrders >= 0
    );
  }

  /**
   * Valide qu'un objet respecte le format OrderClient
   */
  static validateOrderClient(client: any): client is OrderClient {
    if (!client || typeof client !== 'object') {
      return false;
    }

    return (
      typeof client.id === 'number' &&
      typeof client.code === 'string' &&
      typeof client.firstname === 'string' &&
      typeof client.lastname === 'string' &&
      typeof client.isActive === 'boolean' &&
      client.code.length > 0 &&
      client.firstname.length > 0 &&
      client.lastname.length > 0
    );
  }

  /**
   * Valide qu'un objet respecte le format OrderArticle
   */
  static validateOrderArticle(article: any): article is OrderArticle {
    if (!article || typeof article !== 'object') {
      return false;
    }

    return (
      typeof article.id === 'number' &&
      typeof article.code === 'string' &&
      typeof article.name === 'string' &&
      typeof article.unitPrice === 'number' &&
      typeof article.isActive === 'boolean' &&
      article.code.length > 0 &&
      article.name.length > 0 &&
      article.unitPrice >= 0
    );
  }

  /**
   * Valide qu'un statut de commande est valide
   */
  static validateOrderStatus(status: any): status is OrderStatus {
    return Object.values(OrderStatus).includes(status);
  }

  /**
   * Valide qu'une date est au format ISO valide
   */
  static validateISODate(dateString: any): boolean {
    if (typeof dateString !== 'string') {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes('T');
  }

  /**
   * Valide qu'un montant est dans les limites acceptables
   */
  static validateAmount(amount: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): boolean {
    return (
      typeof amount === 'number' &&
      !isNaN(amount) &&
      amount >= min &&
      amount <= max
    );
  }

  /**
   * Valide qu'une quantité est valide
   */
  static validateQuantity(quantity: any): boolean {
    return (
      typeof quantity === 'number' &&
      Number.isInteger(quantity) &&
      quantity > 0
    );
  }

  /**
   * Valide la cohérence d'un calcul de total d'article
   */
  static validateItemTotalCalculation(item: OrderItem): boolean {
    const expectedTotal = item.quantity * item.unitPrice;
    // Tolérance pour les erreurs d'arrondi
    const tolerance = 0.01;
    return Math.abs(item.totalPrice - expectedTotal) <= tolerance;
  }

  /**
   * Valide la cohérence d'un calcul de total de commande
   */
  static validateOrderTotalCalculation(order: Order): boolean {
    const calculatedTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    // Tolérance pour les erreurs d'arrondi
    const tolerance = 0.01;
    return Math.abs(order.totalAmount - calculatedTotal) <= tolerance;
  }

  /**
   * Valide qu'une liste d'objets respecte un format donné
   */
  static validateArray<T>(
    array: any, 
    validator: (item: any) => item is T
  ): array is T[] {
    return Array.isArray(array) && array.every(validator);
  }

  /**
   * Génère un rapport de validation détaillé
   */
  static generateValidationReport(data: any, expectedType: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (expectedType) {
      case 'Order':
        if (!this.validateOrder(data)) {
          errors.push('Structure de commande invalide');
          if (typeof data?.id !== 'number') errors.push('ID de commande manquant ou invalide');
          if (typeof data?.clientName !== 'string') errors.push('Nom de client manquant ou invalide');
          if (!this.validateOrderStatus(data?.status)) errors.push('Statut de commande invalide');
          if (!Array.isArray(data?.items)) errors.push('Liste d\'articles manquante ou invalide');
        } else {
          // Vérifications supplémentaires
          if (!this.validateOrderTotalCalculation(data)) {
            warnings.push('Le total de la commande ne correspond pas à la somme des articles');
          }
          data.items.forEach((item: OrderItem, index: number) => {
            if (!this.validateItemTotalCalculation(item)) {
              warnings.push(`Le total de l'article ${index + 1} est incorrect`);
            }
          });
        }
        break;

      case 'OrderKPI':
        if (!this.validateOrderKPI(data)) {
          errors.push('Structure de KPI invalide');
          if (typeof data?.pendingOrders !== 'number') errors.push('Nombre de commandes en attente invalide');
          if (typeof data?.acceptanceRate !== 'number') errors.push('Taux d\'acceptation invalide');
        }
        break;

      default:
        errors.push(`Type de validation non supporté: ${expectedType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}