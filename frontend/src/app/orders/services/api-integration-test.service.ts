import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { OrderService } from './order.service';
import { 
  ApiResponse, 
  Order, 
  OrderKPI, 
  OrderClient, 
  OrderArticle,
  PaginatedResponse,
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderStatus
} from '../types/order.types';

export interface ApiTestResult {
  endpoint: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  statusCode?: number;
}

export interface ApiTestSuite {
  results: ApiTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  overallSuccess: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiIntegrationTestService {

  constructor(private orderService: OrderService) {}

  /**
   * Exécute une suite complète de tests d'intégration API
   */
  async runFullTestSuite(): Promise<ApiTestSuite> {
    const results: ApiTestResult[] = [];

    // Tests de lecture
    results.push(await this.testGetOrders());
    results.push(await this.testGetKPIs());
    results.push(await this.testSearchClients());
    results.push(await this.testSearchArticles());

    // Tests avec données de test (si disponibles)
    const testOrderId = await this.getTestOrderId();
    if (testOrderId) {
      results.push(await this.testGetOrderById(testOrderId));
    }

    // Calculer les statistiques
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;

    return {
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      overallSuccess: failedTests === 0
    };
  }

  /**
   * Test de l'endpoint GET /orders
   */
  private async testGetOrders(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.orderService.getOrders(0, 10).toPromise();
      const responseTime = Date.now() - startTime;

      // Valider la structure de la réponse
      const isValid = this.validateApiResponse(response) && 
                     this.validatePaginatedResponse(response?.data);

      return {
        endpoint: 'GET /orders',
        success: isValid,
        responseTime,
        statusCode: response?.statusCode,
        error: isValid ? undefined : 'Invalid response structure'
      };
    } catch (error: any) {
      return {
        endpoint: 'GET /orders',
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Test de l'endpoint GET /orders/kpis
   */
  private async testGetKPIs(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.orderService.getKPIs().toPromise();
      const responseTime = Date.now() - startTime;

      // Valider la structure de la réponse
      const isValid = this.validateApiResponse(response) && 
                     this.validateKPIResponse(response?.data);

      return {
        endpoint: 'GET /orders/kpis',
        success: isValid,
        responseTime,
        statusCode: response?.statusCode,
        error: isValid ? undefined : 'Invalid KPI response structure'
      };
    } catch (error: any) {
      return {
        endpoint: 'GET /orders/kpis',
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Test de l'endpoint GET /clients
   */
  private async testSearchClients(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.orderService.searchClients('').toPromise();
      const responseTime = Date.now() - startTime;

      // Valider la structure de la réponse
      const isValid = this.validateApiResponse(response) && 
                     Array.isArray(response?.data);

      return {
        endpoint: 'GET /clients',
        success: isValid,
        responseTime,
        statusCode: response?.statusCode,
        error: isValid ? undefined : 'Invalid clients response structure'
      };
    } catch (error: any) {
      return {
        endpoint: 'GET /clients',
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Test de l'endpoint GET /articles
   */
  private async testSearchArticles(): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.orderService.searchArticles('').toPromise();
      const responseTime = Date.now() - startTime;

      // Valider la structure de la réponse
      const isValid = this.validateApiResponse(response) && 
                     Array.isArray(response?.data);

      return {
        endpoint: 'GET /articles',
        success: isValid,
        responseTime,
        statusCode: response?.statusCode,
        error: isValid ? undefined : 'Invalid articles response structure'
      };
    } catch (error: any) {
      return {
        endpoint: 'GET /articles',
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Test de l'endpoint GET /orders/{id}
   */
  private async testGetOrderById(orderId: number): Promise<ApiTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.orderService.getOrderById(orderId).toPromise();
      const responseTime = Date.now() - startTime;

      // Valider la structure de la réponse
      const isValid = this.validateApiResponse(response) && 
                     this.validateOrderResponse(response?.data);

      return {
        endpoint: `GET /orders/${orderId}`,
        success: isValid,
        responseTime,
        statusCode: response?.statusCode,
        error: isValid ? undefined : 'Invalid order response structure'
      };
    } catch (error: any) {
      return {
        endpoint: `GET /orders/${orderId}`,
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Valide la structure de base d'une ApiResponse
   */
  private validateApiResponse<T>(response: ApiResponse<T> | undefined): boolean {
    if (!response) return false;
    
    return typeof response.status === 'string' &&
           typeof response.statusCode === 'number' &&
           typeof response.message === 'string' &&
           typeof response.service === 'string' &&
           response.hasOwnProperty('data');
  }

  /**
   * Valide la structure d'une réponse paginée
   */
  private validatePaginatedResponse(data: PaginatedResponse<Order> | null | undefined): boolean {
    if (!data) return false;
    
    return Array.isArray(data.content) &&
           typeof data.totalElements === 'number' &&
           typeof data.totalPages === 'number' &&
           typeof data.size === 'number' &&
           typeof data.number === 'number' &&
           typeof data.first === 'boolean' &&
           typeof data.last === 'boolean';
  }

  /**
   * Valide la structure d'une réponse KPI
   */
  private validateKPIResponse(data: OrderKPI | null | undefined): boolean {
    if (!data) return false;
    
    return typeof data.pendingOrders === 'number' &&
           typeof data.potentialValue === 'number' &&
           typeof data.acceptanceRate === 'number' &&
           typeof data.acceptedPipelineValue === 'number' &&
           typeof data.totalOrders === 'number' &&
           typeof data.monthlyGrowth === 'number';
  }

  /**
   * Valide la structure d'une commande
   */
  private validateOrderResponse(data: Order | null | undefined): boolean {
    if (!data) return false;
    
    return typeof data.id === 'number' &&
           data.client && typeof data.client.id === 'number' &&
           typeof data.totalAmount === 'number' &&
           Object.values(OrderStatus).includes(data.status) &&
           Array.isArray(data.items || []);
  }

  /**
   * Obtient un ID de commande de test (première commande disponible)
   */
  private async getTestOrderId(): Promise<number | null> {
    try {
      const response = await this.orderService.getOrders(0, 1).toPromise();
      if (response?.data?.content && response.data.content.length > 0) {
        return response.data.content[0].id;
      }
    } catch (error) {
      console.warn('Could not get test order ID:', error);
    }
    return null;
  }

  /**
   * Génère un rapport de test formaté
   */
  generateTestReport(testSuite: ApiTestSuite): string {
    let report = '=== RAPPORT DE TEST D\'INTÉGRATION API ===\n\n';
    
    report += `Tests exécutés: ${testSuite.totalTests}\n`;
    report += `Tests réussis: ${testSuite.passedTests}\n`;
    report += `Tests échoués: ${testSuite.failedTests}\n`;
    report += `Statut global: ${testSuite.overallSuccess ? 'SUCCÈS' : 'ÉCHEC'}\n\n`;
    
    report += '=== DÉTAILS DES TESTS ===\n\n';
    
    testSuite.results.forEach(result => {
      report += `${result.success ? '✅' : '❌'} ${result.endpoint}\n`;
      if (result.responseTime) {
        report += `   Temps de réponse: ${result.responseTime}ms\n`;
      }
      if (result.statusCode) {
        report += `   Code de statut: ${result.statusCode}\n`;
      }
      if (result.error) {
        report += `   Erreur: ${result.error}\n`;
      }
      report += '\n';
    });
    
    return report;
  }

  /**
   * Test de performance basique
   */
  async runPerformanceTest(): Promise<{ averageResponseTime: number; maxResponseTime: number }> {
    const iterations = 5;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await this.orderService.getOrders(0, 10).toPromise();
        responseTimes.push(Date.now() - startTime);
      } catch (error) {
        // Ignorer les erreurs pour le test de performance
        responseTimes.push(Date.now() - startTime);
      }
    }
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    return { averageResponseTime, maxResponseTime };
  }
}