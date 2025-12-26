import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

interface HealthResponse {
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthCheckService {

  constructor(private http: HttpClient, private log: LoggerService) { }

  // Méthode de test pour vérifier la configuration réseau
  testNetworkConfig(): void {
    this.log.log('=== NETWORK CONFIG TEST ===');

    // Test avec différentes URLs
    const testUrls = [
      `${environment.apiUrl}/actuator/health`,
      `http://192.168.1.75:8080/actuator/health`,
      `http://localhost:8080/actuator/health`,
      `https://httpbin.org/get` // Test externe
    ];

    testUrls.forEach((url, index) => {
      setTimeout(() => {
        this.log.log(`Testing URL ${index + 1}: ${url}`);
        this.http.get(url, { observe: 'response' }).subscribe({
          next: (response) => {
            this.log.log(`✅ URL ${index + 1} SUCCESS: ${response.status}`);
          },
          error: (error) => {
            this.log.log(`❌ URL ${index + 1} FAILED: Status ${error.status} - ${error.message}`);
          }
        });
      }, index * 1000);
    });
  }

  pingBackend(): Observable<boolean> {
    const url = `${environment.apiUrl}/actuator/health`;
    const startTime = Date.now();

    // Log détaillé de la requête
    //this.logRequestDetails(url, 'GET');

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    });

    return this.http.get<HealthResponse>(url, {
      headers,
      observe: 'response',
      reportProgress: true
    }).pipe(
      tap(response => {
        const duration = Date.now() - startTime;
        //this.logSuccessResponse(url, response, duration);
      }),
      map(response => {
        const isHealthy = response.body?.status === 'UP';
        //this.log.log(`HEALTH CHECK RESULT: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        return isHealthy;
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        this.log.log('=== HEALTH CHECK FAILED ===');
        this.logDetailedHttpError(error, url, duration);
        //this.logNetworkDiagnostics();
        return of(false);
      })
    );
  }

  private logRequestDetails(url: string, method: string): void {
    const requestInfo = {
      timestamp: new Date().toISOString(),
      method,
      url,
      environment: environment.production ? 'PRODUCTION' : 'DEVELOPMENT',
      apiUrl: environment.apiUrl,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      connection: this.getConnectionInfo()
    };

    this.log.log('=== REQUEST DETAILS ===');
    this.log.log(JSON.stringify(requestInfo, null, 2));
  }

  private logSuccessResponse(url: string, response: any, duration: number): void {
    const responseInfo = {
      timestamp: new Date().toISOString(),
      url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: this.serializeHeaders(response.headers),
      body: response.body,
      bodySize: JSON.stringify(response.body).length
    };

    this.log.log('=== SUCCESS RESPONSE ===');
    this.log.log(JSON.stringify(responseInfo, null, 2));
  }

  private logDetailedHttpError(error: any, url: string, duration: number): void {
    let errorDetails: any = {
      timestamp: new Date().toISOString(),
      url,
      duration: `${duration}ms`,
      errorType: error.constructor.name,
      message: error.message,
      name: error.name
    };

    // Capture de la stack trace
    if (error.stack) {
      errorDetails.stackTrace = error.stack.split('\n').slice(0, 10); // Limiter à 10 lignes
    }

    // Détails HTTP spécifiques
    if (error instanceof HttpErrorResponse) {
      errorDetails = {
        ...errorDetails,
        httpError: true,
        status: error.status,
        statusText: error.statusText,
        ok: error.ok,
        type: error.type,
        headers: this.serializeHeaders(error.headers),
        responseBody: this.safeStringify(error.error),
        responseType: typeof error.error,
        errorCode: this.getHttpErrorCode(error.status)
      };

      // Analyse spécifique par code d'erreur
      this.analyzeHttpError(error.status);
    }

    // Détails de l'événement d'erreur réseau
    if (error instanceof ErrorEvent) {
      errorDetails = {
        ...errorDetails,
        networkError: true,
        target: error.target?.toString(),
        filename: error.filename,
        lineNumber: error.lineno,
        columnNumber: error.colno,
        timeStamp: error.timeStamp
      };
    }

    // Informations sur l'environnement lors de l'erreur
    errorDetails.environment = {
      onLine: navigator.onLine,
      connection: this.getConnectionInfo(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      javaEnabled: navigator.javaEnabled?.() || false
    };

    // Log complet
    this.log.log('=== HTTP ERROR DETAILS ===');
    this.log.log(JSON.stringify(errorDetails, null, 2));

    // Log également dans la console pour le débogage
    console.error('Complete error details:', errorDetails);
    console.error('Original error object:', error);
  }

  private analyzeHttpError(status: number): void {
    const errorAnalysis: { [key: number]: string } = {
      0: 'Network error - No response from server (CORS, network, or server down)',
      400: 'Bad Request - Invalid request format',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Access denied',
      404: 'Not Found - Endpoint does not exist',
      405: 'Method Not Allowed - HTTP method not supported',
      408: 'Request Timeout - Server took too long to respond',
      500: 'Internal Server Error - Server-side error',
      502: 'Bad Gateway - Invalid response from upstream server',
      503: 'Service Unavailable - Server temporarily unavailable',
      504: 'Gateway Timeout - Upstream server timeout'
    };

    const analysis = errorAnalysis[status] || `HTTP ${status} - Unknown error`;
    this.log.log(`ERROR ANALYSIS: ${analysis}`);
  }

  private getHttpErrorCode(status: number): string {
    if (status === 0) return 'NETWORK_ERROR';
    if (status >= 400 && status < 500) return 'CLIENT_ERROR';
    if (status >= 500) return 'SERVER_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private logNetworkDiagnostics(): void {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      navigator: {
        onLine: navigator.onLine,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        javaEnabled: navigator.javaEnabled?.() || false
      },
      connection: this.getConnectionInfo(),
      environment: {
        apiUrl: environment.apiUrl,
        production: environment.production
      },
      window: {
        location: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host,
        port: window.location.port
      }
    };

    this.log.log('=== NETWORK DIAGNOSTICS ===');
    this.log.log(JSON.stringify(diagnostics, null, 2));
  }

  private getConnectionInfo(): any {
    // @ts-ignore - Connection API n'est pas toujours disponible
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        type: connection.type,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }

    return { available: false, message: 'Connection API not supported' };
  }

  private safeStringify(obj: any): string {
    try {
      if (obj === null || obj === undefined) return 'null';
      if (typeof obj === 'string') return obj;
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return `[Stringify Error: ${e}]`;
    }
  }

  private serializeHeaders(headers: HttpHeaders | null): any {
    if (!headers) return {};

    const result: any = {};
    headers.keys().forEach(key => {
      result[key] = headers.get(key);
    });
    return result;
  }
}
