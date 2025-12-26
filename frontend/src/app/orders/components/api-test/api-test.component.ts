import { Component } from '@angular/core';
import { ApiIntegrationTestService, ApiTestSuite } from '../../services/api-integration-test.service';

@Component({
  selector: 'app-api-test',
  templateUrl: './api-test.component.html',
  styleUrls: ['./api-test.component.scss']
})
export class ApiTestComponent {
  testSuite: ApiTestSuite | null = null;
  isRunning = false;
  testReport = '';

  constructor(private apiTestService: ApiIntegrationTestService) {}

  async runTests(): Promise<void> {
    this.isRunning = true;
    this.testSuite = null;
    this.testReport = '';

    try {
      this.testSuite = await this.apiTestService.runFullTestSuite();
      this.testReport = this.apiTestService.generateTestReport(this.testSuite);
    } catch (error) {
      console.error('Error running API tests:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runPerformanceTest(): Promise<void> {
    this.isRunning = true;
    
    try {
      const perfResults = await this.apiTestService.runPerformanceTest();
      console.log('Performance Test Results:', perfResults);
      
      this.testReport += '\n=== TEST DE PERFORMANCE ===\n\n';
      this.testReport += `Temps de réponse moyen: ${perfResults.averageResponseTime.toFixed(2)}ms\n`;
      this.testReport += `Temps de réponse maximum: ${perfResults.maxResponseTime}ms\n`;
    } catch (error) {
      console.error('Error running performance test:', error);
    } finally {
      this.isRunning = false;
    }
  }

  downloadReport(): void {
    if (!this.testReport) return;

    const blob = new Blob([this.testReport], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-test-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}